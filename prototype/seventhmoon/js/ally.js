// AI 동료: 주인공이 아닌 직업 한 명이 함께 싸운다. 명령은 돌격 / 엄호 / 회복 우선.
// 레벨은 따로 없고 주인공 능력치를 따라간다(공격 70%, 체력 80%). 쓰러지면 잠시 뒤 일어난다.
const ALLY_CMDS = ['cover', 'charge', 'heal'];
const ALLY_CMD_KO = { cover: '엄호', charge: '돌격', heal: '회복 우선' };
// 동료 조합 보너스 (기획서 3-5): 두 직업이 맞으면 주는 피해 +15%
const ALLY_COMBOS = [
  [['warrior', 'mage'], '방패와 불꽃'], [['paladin', 'rogue'], '빛과 그림자'], [['ranger', 'mage'], '별과 원소'],
  [['warrior', 'paladin'], '두 개의 방패'], [['rogue', 'ranger'], '숲의 사냥꾼'], [['hexblade', 'paladin'], '흑월과 백월'],
  [['hexblade', 'warrior'], '피의 맹세'], [['mage', 'paladin'], '은총의 마법'], [['rogue', 'hexblade'], '그림자 계약'],
];
function allyCombo(a, b) { const f = ALLY_COMBOS.find(([p]) => p.includes(a) && p.includes(b) && a !== b); return f ? f[1] : null; }

class Ally extends Actor {
  constructor(scene, key, x, y) {
    super(scene, key, x, y, { hero: true });
    this.key = key; this.side = 'ally';
    this.cls = classOf(key); this.atkSet = this.cls.atk;
    const st = scene.stats;
    this.maxHp = Math.round(st.hp * 0.8 * (this.cls.hp || 1) / (classOf(scene.save.hero).hp || 1)); this.hp = this.maxHp;
    this.awk = 0; this.cool = 600; this.step = 0; this.healT = 4000; this.tgt = null; this.retarget = 0;
    this.state = 'idle'; this.play('idle');
    if (typeof CuteHeroes !== 'undefined' && CuteHeroes.apply(this)) { this.state = 'idle'; this.play('idle'); }
    this.tag = scene.add.text(x, y, DB.heroes[key].name, { fontFamily: 'sans-serif', fontSize: 15, color: '#9ae0ff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1);
  }
  setHead(img) { this.rig.setImg('head', img); }
  get cmd() { return this.scene.allyCmd; }
  toIdle() { this.state = 'idle'; this.st = 0; this.play('idle', 120); this.setHead(null); }
  pickTarget() {
    const sc = this.scene, h = sc.hero;
    let best = null, bd = 1e9;
    for (const m of sc.monsters) {
      if (m.dead || m.state === 'enter' || m.state === 'dying') continue;
      const from = this.cmd === 'charge' ? this : h;
      let d = Math.abs(m.x - from.x) + Math.abs(m.y - from.y) * 2;
      const limit = this.cmd === 'charge' ? 2000 : this.cmd === 'cover' ? 420 : 200;
      // 나를 노리거나 바로 옆에 있는 적은 명령과 상관없이 상대한다
      const self = Math.abs(m.x - this.x) + Math.abs(m.y - this.y) * 2;
      if (m.tgt === this || self < 260) d = Math.min(d, self * 0.8);
      else if (d >= limit) continue;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  update(dt) {
    const sc = this.scene, h = sc.hero, s = dt / 1000;
    this.st += dt; this.cool -= dt; this.retarget -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    const st = this.state;
    if (st === 'down') {
      if (this.st > 6000 && !sc.lost) { this.hp = Math.round(this.maxHp * 0.5); this.state = 'getup'; this.st = 0; this.play('w_getup', 60); this.setHead(null); this.invuln = 1500; }
      return;
    }
    if (st === 'getup') { if (this.st > 420) this.toIdle(); return; }
    if (st === 'hurt') { this.vx *= Math.pow(0.002, s); this.physics(dt); if (this.st > 320) this.toIdle(); return; }
    if (st === 'win') return;
    if (sc.won) { this.vx = this.vy = 0; if (st !== 'win') { this.state = 'win'; this.play('w_win', 120); this.setHead('head_victory'); } return; }
    // 회복 우선: 주인공 체력이 줄면 치유한다
    this.healT -= dt;
    if (this.cmd === 'heal' && this.healT <= 0 && h.hp < h.maxHp * 0.75 && h.hp > 0) {
      this.healT = this.key === 'paladin' || this.key === 'mage' ? 6000 : 8000;
      const v = Math.round(h.maxHp * (this.key === 'paladin' ? 0.1 : 0.07));
      h.hp = Math.min(h.maxHp, h.hp + v);
      sc.floatText(h.x, h.y - 250, '+' + v, '#8f8', 28);
      sc.fx('holy_ring', h.x, h.y - 10, { s: 0.4, dur: 500, depth: h.y - 1, flat: true });
      this.showEmote('heart', 700); SFX.heal();
    }
    if (st === 'atk') {
      const a = this.atk;
      this.vx *= Math.pow(0.0008, s); this.vy = 0;
      if (this.st >= a.hit[0] && this.st <= a.hit[1]) {
        if (a.proj && !this.fired) { this.fired = true; sc.heroShoot(this, { ...a.proj, dmg: a.proj.dmg * 0.7 }); }
        if (a.dmg) sc.meleeHit(this, a);
      }
      if (this.st >= a.dur) { this.toIdle(); }
      this.physics(dt);
      return;
    }
    // 대기·이동: 목표를 고르고 다가가 때린다
    if (this.retarget <= 0 || !this.tgt || this.tgt.dead) { this.tgt = this.pickTarget(); this.retarget = 500; }
    const t = this.tgt, ranged = this.cls.ranged;
    let gx, gy;
    if (t) {
      const want = ranged ? 280 : (t.kind === 'barkhaul' ? 180 : 105);
      const side = Math.sign(this.x - t.x) || -h.face;
      gx = t.x + side * want; gy = t.y + (ranged ? 0 : (this.y > t.y ? 6 : -6));
      const dx = t.x - this.x, inRange = Math.abs(Math.abs(dx) - want) < 50 && Math.abs(t.y - this.y) < 28;
      if (inRange && this.cool <= 0 && t.state !== 'down') {
        this.face = Math.sign(dx) || this.face;
        const k = ['a1', 'a2', 'a3', 'a4'][this.step % 4];
        this.step++;
        const a = this.atkSet[k];
        this.state = 'atk'; this.st = 0; this.atk = a; this.atkName = k; this.hitSet.clear(); this.fired = false;
        this.replay(a.clip, 40);
        this.cool = this.step % 4 === 0 ? 900 : a.dur + 120;
        if (a.lunge && !ranged) sc.time.delayedCall(Math.max(0, a.hit[0] - 30), () => { if (this.state === 'atk' && this.atk === a) this.vx = this.face * a.lunge * 0.8; });
        if (!a.proj && a.swing) sc.time.delayedCall(Math.max(0, a.hit[0] - 30), () => { if (this.state === 'atk' && this.atk === a) { SFX.swing(a.fin, this.px, 'blade'); sc.swingFx(this, a); } });
        this.physics(dt);
        return;
      }
    } else {
      // 따라가기: 주인공 뒤쪽 비스듬히
      const back = this.cmd === 'heal' ? 170 : 120;
      gx = h.x - h.face * back; gy = Phaser.Math.Clamp(h.y + 46, FLOOR_TOP, FLOOR_BOT);
    }
    const dx = gx - this.x, dy = gy - this.y, d = Math.hypot(dx, dy * 1.5);
    if (d > 26) {
      const run = d > 320;
      const sp = run ? 340 : 210;
      this.vx = dx / d * sp; this.vy = Phaser.Math.Clamp(dy / Math.max(1, d) * sp, -150, 150);
      this.face = t ? (Math.sign(t.x - this.x) || this.face) : (Math.sign(dx) || this.face);
      this.state = 'move'; this.play(run ? 'run' : 'walk', 120);
    } else {
      this.vx = this.vy = 0;
      if (t) this.face = Math.sign(t.x - this.x) || this.face; else this.face = h.face;
      if (this.state !== 'idle') this.toIdle();
    }
    this.physics(dt);
  }
  takeHit(src, dmg, type, kbDir) {
    if (this.invuln > 0 || this.state === 'down' || this.state === 'getup' || this.state === 'win' || this.scene.won) return 'miss';
    dmg = Math.max(1, Math.round(dmg * (1 - this.scene.stats.red * 0.8)));
    this.hp = Math.max(0, this.hp - dmg);
    this.flash(0xffffff, 80); this.kick(-7, 6, -0.08);
    this.scene.floatText(this.x, this.y - 230, String(dmg), '#ff9a9a', 24);
    this.face = kbDir ? -kbDir : this.face;
    if (this.hp <= 0) {
      this.state = 'down'; this.st = 0; this.vx = this.vy = 0; this.play('w_down', 60); this.setHead('head_ko');
      this.scene.floatText(this.x, this.y - 260, '쓰러짐! 6초 뒤 일어나요', '#ff9a8a', 22);
      SFX.heroHurt(this.px);
    } else {
      this.state = 'hurt'; this.st = 0; this.vx = kbDir * 150; this.replay('w_hurt', 30); this.setHead('head_hurt');
    }
    return 'hit';
  }
  draw(dt, frozen) {
    super.draw(dt, frozen);
    this.tag.setPosition(this.x, this.y - this.z - this.height - 8).setDepth(4000).setAlpha(this.state === 'down' ? 0.5 : 0.9);
  }
  destroy() { super.destroy(); this.tag.destroy(); }
}
