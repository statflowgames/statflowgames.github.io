// 주인공과 몬스터. 좌표: x(가로), y(바닥 깊이), z(공중 높이). 화면 y = y - z
const GRAV = 2300;
const FLOOR_TOP = 478, FLOOR_BOT = 690;

class Actor {
  constructor(scene, rigName, x, y, o = {}) {
    this.scene = scene;
    const def = RIGS[rigName]();
    if (o.sc) { def.scale *= o.sc; }
    this.rig = new Rig(scene, def);
    this.kind = rigName;
    this.x = x; this.y = y; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.face = 1;
    this.state = 'idle'; this.st = 0;
    this.anim = null; this.animT = 0; this.blendFrom = null; this.blendT = 0; this.blendDur = 0;
    this.lastPose = {};
    this.flashT = 0; this.invuln = 0; this.dead = false; this.hitSet = new Set();
    this.shadow = scene.add.image(x, y, 'shadow');
    const cm = this.rig.def.clips;
    this.baseStand = rigName === 'warrior' || o.hero ? P.stand : cm && cm.m_idle && CLIPS[cm.m_idle] ? CLIPS[cm.m_idle].at(0) : P.standMon;
    this.rig.measure(this.baseStand);
    this.shake = 0;
    this.emote = null;
  }
  get sc() { return this.rig.def.scale; }
  get px() { return this.x - this.scene.cameras.main.scrollX; }
  play(name, blend = 70) {
    const cm = this.rig.def.clips;
    if (cm && cm[name]) name = cm[name];
    if (this.anim === name) return;
    this.blendFrom = this.lastPose; this.blendDur = blend; this.blendT = 0;
    this.anim = name; this.animT = 0;
  }
  replay(name, blend = 50) { this.anim = null; this.play(name, blend); }
  animDone() { const c = CLIPS[this.anim]; return c && !c.loop && this.animT >= c.dur; }
  // 걷기·달리기 클립은 실제 이동 속도에 맞춰 재생 속도를 바꾼다 (발 미끄러짐 방지)
  animRate() {
    const c = CLIPS[this.anim];
    if (!c || !c.amp) return 1;
    const m = this.rig.map;
    const leg = ((m.shf ? m.shf.y : 90) + (m.ftf ? m.ftf.y : 90)) * this.sc;
    const stride = 2 * leg * Math.sin(c.amp * D2R);              // 반 주기 동안 발이 움직이는 거리
    const nominal = stride / (c.dur / 2000);
    const sp = Math.hypot(this.vx, this.vy * 1.3);
    return Phaser.Math.Clamp(sp / nominal, 0.35, 1.8);
  }
  spring(o, target, k, damp, f) {
    o.v += (target - o.x) * k * f;
    o.v *= Math.pow(damp, f);
    o.x += o.v * f;
  }
  // 외부에서 출렁임을 준다 (맞음, 착지 등)
  kick(head = 0, cape = 0, sq = 0) {
    const s = this.sec || (this.sec = { head: { x: 0, v: 0 }, cape: { x: 0, v: 0 }, sq: { x: 0, v: 0 } });
    s.head.v += head; s.cape.v += cape; s.sq.x += sq;
  }
  draw(dt, frozen) {
    if (!frozen) this.animT += dt * this.animRate();
    const clip = CLIPS[this.anim];
    if (clip && clip.amp && !frozen && this.z <= 0) {
      const ph = Math.floor((this.animT + clip.dur * 0.25) / (clip.dur / 2));
      if (this.stepPh !== undefined && ph !== this.stepPh && this.onStep) this.onStep();
      this.stepPh = ph;
    }
    let pose = clip ? clip.at(this.animT) : this.baseStand;
    if (this.blendFrom && this.blendT < this.blendDur) {
      if (!frozen) this.blendT += dt;
      pose = mix(this.blendFrom, pose, Math.min(1, this.blendT / this.blendDur));
    }
    this.lastPose = pose;
    // 2차 움직임: 망토는 이동·낙하 반대로 날리고, 머리와 몸은 스프링으로 출렁인다
    const sec = this.sec || (this.sec = { head: { x: 0, v: 0 }, cape: { x: 0, v: 0 }, sq: { x: 0, v: 0 } });
    const f = frozen ? 0 : dt / 16.67;
    if (f > 0) {
      const fwd = this.vx * this.face;
      const capeT = Phaser.Math.Clamp(fwd * 0.08, -15, 45) + Phaser.Math.Clamp(this.vz * 0.04, -35, 35);
      this.spring(sec.cape, capeT, 0.06, 0.86, f);
      this.spring(sec.head, 0, 0.18, 0.78, f);
      this.spring(sec.sq, 0, 0.22, 0.7, f);
    }
    const p2 = { ...pose, rx: 0, ry: 0 };
    // 저절로 움직이는 부위 (날개·꼬리·공전하는 구슬)
    const procs = this.rig.def.procs;
    if (procs) {
      this.procT = (this.procT || 0) + (frozen ? 0 : dt);
      for (const q of procs) {
        if (!this.rig.map[q.n]) continue;
        let v = (q.base || 0) + Math.sin(this.procT * (q.spd || 0.005) + (q.ph || 0) * D2R) * (q.amp || 0);
        if (q.spin) v += (this.procT * q.spin + (q.ph || 0)) % 360;
        p2[q.n] = (p2[q.n] || 0) + v;
      }
    }
    p2.cape = (p2.cape || 0) + sec.cape.x;
    p2.head = (p2.head || 0) + sec.head.x;
    this.rig.apply(p2);
    // 땅 붙이기: 자세마다 몸의 가장 낮은 점을 바닥(또는 공중 높이)에 맞춘다
    if (!frozen || this.groundOff === undefined) this.groundOff = this.rig.lowest();
    const sq = Phaser.Math.Clamp((pose.sq || 0) + sec.sq.x, -0.18, 0.18);
    const sy = this.sc * (1 + sq), sxs = this.sc * (1 - sq * 0.6);
    const sx = this.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
    const hov = this.rig.def.hover ? (this.rig.def.hover + Math.sin((this.procT || 0) * 0.004) * 8) * (this.state === 'down' || this.dead ? 0.2 : 1) : 0;
    this.rig.c.setPosition(this.x + sx, this.y - this.z - hov - this.groundOff * sy);
    this.rig.c.setScale(sxs * this.face, sy);
    this.rig.c.setDepth(1000 + this.y);
    const h = Math.max(0.35, 1 - this.z / 500);
    this.shadow.setPosition(this.x, this.y + 2).setDepth(999 + this.y * 0.001).setScale(this.shadowW * h, this.shadowW * h * 0.9).setAlpha(this.dead ? 0 : 0.55 * h);
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.rig.setFlash(false); }
    if (this.emote) {
      const e = this.emote; e.t -= dt;
      const top = this.y - this.z - this.height - 30 + Math.sin(e.t / 90) * 3;
      e.img.setPosition(this.x, top).setDepth(4000);
      if (e.t <= 0) { e.img.destroy(); this.emote = null; }
    }
  }
  get height() { return this.rig.def.height * this.sc * 0.92; }
  get shadowW() { return this.rig.def.shadow || (this.kind === 'barkhaul' ? 2.2 : this.side === 'hero' ? 1.2 : 1.0); }
  flash(color = 0xffffff, ms = 70) { this.rig.setFlash(true, color); this.flashT = ms; }
  showEmote(key, ms = 1200) {
    if (this.emote) this.emote.img.destroy();
    const img = this.scene.add.image(this.x, this.y, 'emote/' + key).setScale(0.0);
    SFX.emote(this.px);
    this.scene.tweens.add({ targets: img, scale: 0.42, duration: 220, ease: 'Back.out' });
    this.emote = { img, t: ms };
  }
  physics(dt) {
    const s = dt / 1000;
    this.x += this.vx * s; this.y += this.vy * s;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= GRAV * s * (this.gravMul || 1);
      this.z += this.vz * s;
      if (this.z <= 0) { this.z = 0; const v = this.vz; this.vz = 0; this.onLand(v); }
    }
    this.y = Phaser.Math.Clamp(this.y, FLOOR_TOP, FLOOR_BOT);
    const cam = this.scene.bounds;
    this.x = Phaser.Math.Clamp(this.x, cam.l + 30, cam.r - 30);
  }
  onLand() {}
  destroy() { this.rig.destroy(); this.shadow.destroy(); if (this.emote) this.emote.img.destroy(); }
}

// ---------------------------------------------------------------------------
// 하르반 (방패전사)
// ---------------------------------------------------------------------------
const HERO_ATK = {
  a1: { clip: 'w_atk1', dur: 320, hit: [105, 190], dmg: 14, reach: [10, 175], dz: 34, kb: 120, type: 'light', stop: 55, next: 160, swing: 'h', lunge: 230 },
  a2: { clip: 'w_atk2', dur: 320, hit: [105, 190], dmg: 14, reach: [10, 175], dz: 34, kb: 120, type: 'light', stop: 55, next: 160, swing: 'u', lunge: 210 },
  a3: { clip: 'w_atk3', dur: 340, hit: [115, 200], dmg: 16, reach: [10, 150], dz: 34, kb: 200, type: 'light', stop: 75, next: 180, swing: 's', stun: 520, lunge: 320 },
  a4: { clip: 'w_atk4', dur: 490, hit: [215, 290], dmg: 30, reach: [10, 200], dz: 40, kb: 420, type: 'knock', stop: 110, shake: 6, swing: 'v', fin: true, lunge: 380 },
  dash: { clip: 'w_dash', dur: 420, hit: [40, 380], dmg: 22, reach: [0, 120], dz: 36, kb: 460, type: 'knock', stop: 80, shake: 4, multi: true },
  up: { clip: 'w_up', dur: 400, hit: [130, 220], dmg: 18, reach: [0, 140], dz: 36, kb: 60, type: 'launch', stop: 80, swing: 's', lunge: 150 },
  down: { clip: 'w_slam', dur: 540, hit: [225, 300], dmg: 26, reach: [-40, 190], dz: 44, kb: 160, type: 'slam', stop: 110, shake: 8, otg: true, lunge: 200 },
  jump: { clip: 'w_jumpatk', dur: 400, hit: [130, 250], dmg: 20, reach: [0, 165], dz: 38, kb: 280, type: 'knock', stop: 80, swing: 'v', zr: 200 },
};

class Hero extends Actor {
  constructor(scene, x, y) {
    const key = (scene.save && scene.save.hero) || 'warrior';
    super(scene, key, x, y, { hero: true });
    this.key = key;
    this.cls = classOf(key);
    this.atkSet = this.cls.atk;
    this.st8 = scene.stats || { hp: 360, parryWin: 0, staRegen: 0, spd: 0 };
    this.maxHp = this.st8.hp; this.hp = this.maxHp;
    this.sta = 100; this.awk = 0;
    this.combo = 0; this.buffer = 0; this.holdDir = 0; this.holdT = 0;
    this.guardStart = -9999; this.blink = 2500;
    this.play('idle');
    this.side = 'hero';
  }
  setHead(img) { this.rig.setImg('head', img); }
  get rollCost() { return 22 * (1 - (this.st8.rollCost || 0) / 100); }
  update(dt, inp) {
    const s = dt / 1000;
    this.st += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.state !== 'guard') this.sta = Math.min(100, this.sta + 38 * (1 + this.st8.staRegen / 100) * s);
    if (this.buffer > 0) this.buffer -= dt;
    if (inp.atkP) this.buffer = 260;
    // 방향 유지 시간 (달리기 판정)
    const dir = inp.x;
    if (dir !== 0 && dir === this.holdDir) this.holdT += dt; else { this.holdDir = dir; this.holdT = 0; }
    // 눈 깜빡임
    this.blink -= dt;
    if (this.blink < 0 && ['idle', 'move'].includes(this.state)) { this.setHead('head_blink'); if (this.blink < -120) { this.setHead(null); this.blink = 2500 + Math.random() * 2500; } }

    const st = this.state;
    if (st === 'dead') { this.physics(dt); return; }
    if (st === 'idle' || st === 'move') {
      if (this.scene.won) { this.vx = this.vy = 0; return; }
      if (inp.awkP && this.awk >= 100) return this.startAwaken();
      if ((inp.sk1P || inp.sk2P) && this.scene.useSkill(inp.sk1P ? 0 : 1)) return;
      if (inp.itemN) this.scene.useItem(inp.itemN - 1);
      if (inp.jumpP) return this.startJump(inp);
      if (inp.rollP && this.sta >= this.rollCost) return this.startRoll(inp);
      if (inp.guard) return this.startGuard();
      if (this.buffer > 0) { this.buffer = 0; return this.startAttack(this.pickCommand(inp)); }
      const run = this.holdT > 320 && inp.x !== 0;
      const sp = (run ? 330 : 200) * (1 + (this.st8.spd || 0) / 100);
      this.vx = inp.x * sp; this.vy = inp.y * 150;
      if (inp.x) this.face = inp.x;
      if (inp.x || inp.y) {
        this.state = 'move'; this.play(run ? 'run' : 'walk', 120);
        this.running = run;
      } else { this.state = 'idle'; this.play(this.hp < this.maxHp * 0.25 ? 'idle' : 'idle', 150); }
      this.physics(dt);
      return;
    }
    if (st === 'atk') {
      const a = this.atk;
      this.vx *= Math.pow(0.0008, s); this.vy = 0;
      if (this.atkName === 'dash' && !a.special) this.vx = this.face * (this.st < 330 ? 560 : 120);
      this.checkHits(a);
      if (a.next && this.st >= a.next && this.buffer > 0 && this.chain) {
        this.buffer = 0;
        return this.startAttack(this.chain);
      }
      if (this.st >= a.dur) { this.combo = 0; this.toIdle(); }
      this.physics(dt);
      return;
    }
    if (st === 'jump' || st === 'jatk') {
      this.vx = inp.x * 220 || this.vx * 0.98; if (inp.x && st === 'jump') this.face = inp.x;
      this.vy = inp.y * 90;
      if (st === 'jump' && inp.atkP && !this.jumpAtkUsed) { this.jumpAtkUsed = true; this.state = 'jatk'; this.st = 0; this.atk = this.atkSet.jump; this.atkName = 'jump'; this.fired = false; this.hitSet.clear(); this.replay(this.atk.clip, 40); this.setHead('head_shout'); }
      if (inp.jumpP && this.st8.doubleJump && !this.dj && this.z > 20) { this.dj = true; this.vz = 820; this.replay('w_jump', 40); SFX.jump(this.px); }
      if (st === 'jatk') this.checkHits(this.atk);
      this.physics(dt);
      return;
    }
    if (st === 'roll') {
      this.physics(dt);
      if (this.st > 380) { this.vx = 0; this.vy = 0; this.toIdle(); }
      return;
    }
    if (st === 'guard') {
      this.vx = 0; this.vy = 0;
      if (!inp.guard || this.sta <= 0) return this.toIdle();
      if (inp.x) this.face = inp.x;
      if (inp.rollP && this.sta >= this.rollCost) return this.startRoll(inp);
      this.physics(dt);
      return;
    }
    if (st === 'parry') {
      this.checkHits(this.atk);
      if (this.st > 320) this.toIdle();
      return;
    }
    if (st === 'hurt') { this.vx *= Math.pow(0.002, s); this.physics(dt); if (this.st > 300) this.toIdle(); return; }
    if (st === 'air') { this.physics(dt); return; }
    if (st === 'down') { if (this.st > 650) { this.state = 'getup'; this.st = 0; this.play('w_getup', 60); this.setHead(null); } return; }
    if (st === 'getup') { if (this.st > 420) { this.invuln = 600; this.toIdle(); } return; }
    if (st === 'awaken') { this.updateAwaken(dt); return; }
    if (st === 'win') { return; }
  }
  onStep() {
    SFX.step('armor', this.px);
    if (this.running) this.scene.fx('dust_run', this.x - this.face * 30, this.y, { s: 0.25, flip: this.face < 0, dur: 350, depth: this.y - 1 });
  }
  pickCommand(inp) {
    if (inp.y < 0) return 'up';
    if (inp.y > 0 && inp.x === 0) return 'down';
    if (this.holdT > 320 && inp.x === this.face) return 'dash';
    return 'a1';
  }
  startAttack(k) {
    const a = this.atkSet[k];
    this.state = 'atk'; this.st = 0; this.atk = a; this.atkName = k; this.hitSet.clear(); this.fired = false;
    this.chain = { a1: 'a2', a2: 'a3', a3: 'a4' }[k] || null;
    this.replay(a.clip, 40);
    const power = { a3: 1, up: 1, dash: 1, a4: 2, down: 2 }[k] || 0;
    if (power || Math.random() < 0.35) this.scene.time.delayedCall(Math.max(0, a.hit[0] - 60), () => this.state === 'atk' && SFX.heroAtk(power, this.px));
    this.vx = k === 'dash' && !a.special ? this.face * 560 : 0;
    this.setHead(a.fin || k === 'down' || k === 'dash' ? 'head_shout' : 'head_attack');
    this.scene.time.delayedCall(a.hit[0] - 30, () => {
      if (this.state !== 'atk' || this.atk !== a) return;
      if (a.lunge) this.vx = this.face * a.lunge;
      if (!a.proj && !(a.special && !a.dmg)) { SFX.swing(a.fin || k === 'down', this.px, a.swing === 's' ? 'shield' : 'blade'); this.scene.swingFx(this, a); }
    });
    if (k === 'dash' && !a.special) { SFX.roll(this.px); this.scene.fx('speed_lines', this.x - this.face * 80, this.y - 110, { s: 0.45, flip: this.face < 0, dur: 300, depth: this.y - 1 }); }
  }
  checkHits(a) {
    if (this.st < a.hit[0] || this.st > a.hit[1]) return;
    // 투사체·특수 동작은 맞는 순간에 한 번만 낸다
    if ((a.proj || a.special) && !this.fired) {
      this.fired = true;
      if (a.proj) this.scene.heroShoot(this, a.proj);
      if (a.special) this.scene.heroSpecial(this, a);
    }
    if (a.dmg) this.scene.meleeHit(this, a);
  }
  toIdle() { this.state = 'idle'; this.st = 0; this.play('idle', 120); this.setHead(null); this.gravMul = 1; }
  startJump(inp) {
    this.state = 'jump'; this.st = 0; this.vz = 860; this.z = 0.01; this.jumpAtkUsed = false; this.dj = false;
    this.play('w_jump', 60); SFX.jump(this.px); this.kick(0, 0, 0.12);
    this.scene.fx('dust_land', this.x, this.y, { s: 0.22, dur: 300, depth: this.y - 1 });
  }
  startRoll(inp) {
    this.sta -= this.rollCost;
    const d = inp.x || this.face; this.face = d;
    this.state = 'roll'; this.st = 0; this.vx = d * 560; this.vy = inp.y * 120; this.invuln = 380;
    this.replay('w_roll', 30); SFX.roll(this.px);
    this.scene.fx('dash_trail', this.x - d * 40, this.y - 60, { s: 0.35, flip: d < 0, dur: 320, depth: this.y - 1 });
  }
  startGuard() { this.state = 'guard'; this.st = 0; this.guardStart = this.scene.now; this.play('w_guard', 40); }
  onLand(v) {
    if (this.state === 'jump' || this.state === 'jatk') {
      SFX.land(this.px); this.scene.fx('dust_land', this.x, this.y, { s: 0.3, dur: 380, depth: this.y - 1 });
      this.kick(4, 0, -0.14);
      this.toIdle();
    } else if (this.state === 'air') {
      SFX.land(this.px, true); this.scene.fx('dust_land', this.x, this.y, { s: 0.38, dur: 420, depth: this.y - 1 });
      this.scene.cameras.main.shake(90, 0.004);
      this.kick(6, 0, -0.12);
      this.state = this.hp <= 0 ? 'dead' : 'down'; this.st = 0; this.play('w_down', 60); this.vx = 0; this.vy = 0;
      if (this.hp <= 0) this.scene.heroDied();
    }
  }
  // 적의 공격을 받았을 때. 반환: 'hit' | 'guard' | 'parry' | 'miss'
  takeHit(src, dmg, type, kbDir) {
    if (this.invuln > 0 || this.state === 'roll' || this.state === 'awaken' || this.state === 'dead' || this.state === 'down' || this.state === 'getup' || this.scene.won) return 'miss';
    const fromFront = Math.sign(src.x - this.x) === this.face || src.x === this.x;
    if ((this.state === 'guard' || this.state === 'parry') && fromFront) {
      if (this.scene.now - this.guardStart < 170 * (1 + (this.st8.parryWin || 0) / 100) && this.state === 'guard') {
        this.state = 'parry'; this.st = 0; this.replay('w_parry', 30);
        this.atk = { hit: [40, 160], dmg: 24, reach: [0, 170], dz: 40, kb: 300, type: 'knock', stop: 90, shake: 3 };
        this.hitSet.clear(); this.awk = Math.min(100, this.awk + 12);
        return 'parry';
      }
      this.sta -= (type === 'heavy' ? 40 : 14) * (1 - (this.st8.guardCost || 0) / 100);
      this.x -= this.face * (type === 'heavy' ? 40 : 14);
      this.awk = Math.min(100, this.awk + 2);
      if (this.sta <= 0) { this.sta = 0; this.state = 'hurt'; this.st = -300; this.play('w_hurt', 40); this.showEmote('dizzy', 900); }
      return 'guard';
    }
    if (this.scene.god) dmg = 0;
    this.hp = Math.max(0, this.hp - dmg);
    this.awk = Math.min(100, this.awk + 6);
    this.face = kbDir === 0 ? this.face : -kbDir;
    this.flash(0xffffff, 80);
    this.kick(-7, 6, -0.08);
    if (this.hp <= 0) SFX.heroKO(this.px); else SFX.heroHurt(this.px);
    this.setHead('head_hurt');
    if (type === 'heavy' || this.hp <= 0) {
      this.state = 'air'; this.st = 0; this.vz = 520; this.z = 1; this.vx = kbDir * 260; this.vy = 0;
      this.play('w_air', 40);
      this.setHead('head_ko');
    } else {
      this.state = 'hurt'; this.st = 0; this.vx = kbDir * 160; this.replay('w_hurt', 30);
    }
    return 'hit';
  }
  startAwaken() {
    this.awk = 0; this.state = 'awaken'; this.st = 0; this.vx = this.vy = 0; this.invuln = 1200;
    this.replay('w_awaken', 40); this.setHead('head_shout');
    this.scene.awakenCutIn(this);
    SFX.awaken();
    this.awkFired = false;
  }
  updateAwaken(dt) {
    if (this.st > 440 && !this.awkFired) { this.awkFired = true; this.scene.awakenFire(this); }
    if (this.st > 1000) this.toIdle();
  }
}

// ---------------------------------------------------------------------------
// 몬스터
// ---------------------------------------------------------------------------
// 몬스터 수치는 js/data/campaign.js 의 MONDEF
// 원거리 몬스터가 던지는 것
const MON_PROJ = {
  spear: { img: 'spear/javelin', rot: 90, sc: 0.32 },
  ratkin_xbow: { img: 'fx/arrow_trail', rot: 0, sc: 0.28, vx: 900 },
  skeleton_archer: { img: 'fx/arrow_trail', rot: 0, sc: 0.28, vx: 900 },
  dwarf_miner: { img: 'dwarf_miner/barrel', rot: 0, sc: 0.5, vx: 520, spin: true },
  construct: { img: 'orb', rot: 0, sc: 0.8, vx: 600 },
  harpy: { img: 'harpy/wing_feather', rot: 90, sc: 0.35, vx: 760 },
};

class Monster extends Actor {
  constructor(scene, id, x, y) {
    const base = MONDEF[id] || MONDEF.grunt;
    const real = !!RIGS[id] && id !== base.rig;
    super(scene, real ? id : base.rig, x, y, real ? {} : { sc: base.sc });
    this.kind = base.rig;   // AI 종류 (barkhaul = 보스 AI)
    const k = scene.monScale || { hp: 1, dmg: 1 };
    this.id = id;
    this.def = { ...base, dmg: Math.round(base.dmg * k.dmg) };
    this.dmgK = this.def.dmg / MONDEF[base.rig].dmg;
    this.maxHp = Math.round(base.hp * (base.boss ? Math.sqrt(k.hp) : k.hp)); this.hp = this.maxHp;
    if (real && MAN['faces/' + id + '_hurt']) this.def.face = 'faces/' + id;
    else if (real) this.def.face = null;
    if (base.tint && !real) { for (const b of this.rig.bones) b.baseTint = mulTint(b.baseTint, base.tint); this.rig.setTintAll(null); }
    const kind = base.rig;
    this.side = 'mon';
    this.cool = 600 + Math.random() * 900;
    this.think = 0;
    this.slotOff = (Math.random() - 0.5) * 60;
    this.poise = 100;
    this.play('m_idle');
    this.state = 'enter'; this.st = 0;
    this.face = x > scene.hero.x ? -1 : 1;
    if (kind === 'barkhaul') { this.summon60 = false; this.summon30 = false; }
    this.pitch = kind === 'shaman' ? 0.85 : kind === 'spear' ? 1.08 : 0.95 + Math.random() * 0.15;
  }
  setHead(img) { this.rig.setImg('head', img); }
  hurtFace() { if (this.def.face) this.setHead(this.def.face + '_hurt'); else this.setHead('head_shout'); }
  update(dt) {
    const s = dt / 1000, h = this.scene.hero;
    this.st += dt; this.cool -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.shake > 0) this.shake -= dt;
    const st = this.state;
    const dx = h.x - this.x, dy = h.y - this.y, adx = Math.abs(dx);
    if (st === 'dying') { this.physics(dt); return; }
    if (st === 'air') { this.physics(dt); return; }
    if (st === 'down') {
      if (this.st > (this.downTime || 800)) {
        if (this.hp <= 0) return this.die();
        this.state = 'getup'; this.st = 0; this.play('m_getup', 60); this.setHead(null);
      }
      return;
    }
    if (st === 'getup') { if (this.st > 420) { this.invuln = 300; this.toIdle(); } return; }
    if (st === 'hurt') { this.vx *= Math.pow(0.003, s); this.physics(dt); if (this.st > (this.stun || 280)) this.toIdle(); return; }
    if (st === 'enter') {
      // 화면 밖에서 걸어 들어온다
      const tx = Phaser.Math.Clamp(this.x, this.scene.bounds.l + 80, this.scene.bounds.r - 80);
      this.face = Math.sign(tx - this.x) || this.face;
      this.vx = Math.sign(tx - this.x) * this.def.speed * 1.4; this.vy = 0;
      this.play('m_run');
      this.x += this.vx * s;
      if (Math.abs(tx - this.x) < 10) {
        this.toIdle(); this.face = Math.sign(dx) || 1;
        if (Math.random() < 0.5 || this.kind === 'barkhaul') { this.showEmote('bang', 900); if (this.kind !== 'barkhaul') SFX.gob('alert', this.px, this.pitch); }
      }
      return;
    }
    if (this.kind === 'barkhaul') return this.bossAI(dt, dx, dy, adx);
    if (st === 'idle' || st === 'move') {
      if (h.state === 'dead') { this.vx = this.vy = 0; this.play('m_taunt'); this.setHead(this.def.face + '_taunt'); return; }
      this.face = Math.sign(dx) || this.face;
      let tx, ty = h.y + this.slotOff * 0.3;
      const role = this.def.role;
      if (role === 'melee') {
        const hasTok = this.scene.tokens.has(this);
        if (!hasTok && this.cool <= 0 && this.scene.tokens.size < (this.scene.boss ? 1 : 2)) this.scene.tokens.add(this);
        const want = this.scene.tokens.has(this) ? 95 : 230 + this.slotOff;
        tx = h.x - Math.sign(dx || 1) * want;
        if (this.scene.tokens.has(this) && adx < 135 && Math.abs(dy) < 20) return this.startWindup();
        if (!this.scene.tokens.has(this) && Math.random() < 0.002) return this.startTaunt();
      } else if (role === 'ranged') {
        tx = h.x - Math.sign(dx || 1) * (420 + this.slotOff);
        ty = h.y;
        if (this.cool <= 0 && Math.abs(dy) < 16 && adx > 250 && adx < 700) return this.startThrow();
      } else {
        tx = h.x - Math.sign(dx || 1) * (500 + this.slotOff);
        if (this.cool <= 0) {
          const hurt = this.scene.monsters.find(m => m !== this && !m.dead && m.hp < m.maxHp * 0.6 && m.kind !== 'barkhaul');
          return this.startCast(hurt && Math.random() < 0.6 ? hurt : null);
        }
      }
      tx = Phaser.Math.Clamp(tx, this.scene.bounds.l + 40, this.scene.bounds.r - 40);
      const mx = tx - this.x, my = ty - this.y;
      const sp = this.def.speed;
      this.vx = Math.abs(mx) > 12 ? Math.sign(mx) * sp : 0;
      this.vy = Math.abs(my) > 6 ? Math.sign(my) * sp * 0.6 : 0;
      // 겁먹고 도망
      if (this.hp < this.maxHp * 0.25 && !this.fled && Math.random() < 0.01) { this.fled = true; this.showEmote('sweat', 1500); SFX.gob('scared', this.px, this.pitch); this.state = 'flee'; this.st = 0; return; }
      if (this.vx || this.vy) { this.state = 'move'; this.play('m_walk', 100); } else { this.state = 'idle'; this.play('m_idle', 140); }
      this.separate();
      this.physics(dt);
      return;
    }
    if (st === 'flee') {
      this.face = -Math.sign(dx) || 1; this.vx = this.face * this.def.speed * 1.3; this.vy = 0;
      this.play('m_run'); this.physics(dt);
      if (this.st > 1300) this.toIdle();
      return;
    }
    if (st === 'taunt') { if (this.st > 900) { this.setHead(null); this.toIdle(); } return; }
    if (st === 'windup') {
      if (this.st > 420) {
        this.state = 'stab'; this.st = 0; this.replay('m_stab', 30); this.hitSet.clear(); SFX.swing(false, this.px, 'blade'); this.setHead('head_shout');
        this.scene.time.delayedCall(30, () => { if (this.state === 'stab') this.vx = this.face * 240; });
      }
      return;
    }
    if (st === 'stab') {
      this.vx *= Math.pow(0.001, s); this.physics(dt);
      if (this.st > 50 && this.st < 160) this.scene.enemyMelee(this, { dmg: this.def.dmg, reach: [0, 130], dz: 22, type: 'light' });
      if (this.st > 520) { this.setHead(null); this.releaseTok(); this.cool = 1100 + Math.random() * 1400; this.toIdle(); }
      return;
    }
    if (st === 'throwup') {
      if (this.st > 520) {
        this.state = 'throw'; this.st = 0; this.replay('m_throw', 30); SFX.throwS(this.px); SFX.gob('atk', this.px, this.pitch); this.setHead('head_shout');
        const pj = MON_PROJ[this.id] || MON_PROJ.spear;
        this.scene.projectile(this, this.scene.textures.exists(pj.img) ? pj.img : 'spear/javelin', { vx: this.face * (pj.vx || 720), z: this.height * 0.55, dmg: this.def.dmg, rot: pj.rot ?? 90, sc: pj.sc || 0.32, life: 1500, spin: pj.spin });
        this.rig.setVisible('wpn', false);
      }
      return;
    }
    if (st === 'throw') {
      if (this.st > 600) { this.rig.setVisible('wpn', true); this.setHead(null); this.cool = 2200 + Math.random() * 1500; this.toIdle(); }
      return;
    }
    if (st === 'cast') {
      if (this.st > 750 && !this.castDone) {
        this.castDone = true; SFX.magic(this.px);
        if (this.castTarget && !this.castTarget.dead) {
          const t = this.castTarget; t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.35);
          this.scene.fx('crit_flash', t.x, t.y - t.height * 0.5, { s: 0.25, dur: 500, tint: 0x88ff88, depth: 4000 });
          t.showEmote('sparkle', 900); this.scene.floatText(t.x, t.y - t.height, '+' + Math.round(t.maxHp * 0.35), '#8f8');
        } else {
          this.scene.projectile(this, 'orb', { vx: this.face * 330, z: 90, dmg: this.def.dmg, home: true, life: 2600 });
        }
      }
      if (this.st > 1100) { this.cool = 3000 + Math.random() * 1500; this.toIdle(); }
      return;
    }
  }
  onStep() {
    if (this.kind === 'barkhaul') { SFX.step('giant', this.px); this.scene.cameras.main.shake(80, 0.002); }
    else SFX.step('light', this.px);
  }
  separate() {
    for (const o of this.scene.monsters) {
      if (o === this || o.dead) continue;
      const ddx = this.x - o.x, ddy = this.y - o.y;
      if (Math.abs(ddx) < 60 && Math.abs(ddy) < 20) { this.x += (ddx >= 0 ? 1 : -1) * 1.5; this.y += (ddy >= 0 ? 1 : -1) * 0.8; }
    }
  }
  releaseTok() { this.scene.tokens.delete(this); }
  toIdle() { this.state = 'idle'; this.st = 0; this.play('m_idle', 120); this.setHead(null); this.rig.setTintAll(null); }
  startWindup() {
    this.state = 'windup'; this.st = 0; this.vx = this.vy = 0; this.play('m_windup', 60);
    this.rig.setTintAll(0xff9a8a);
    if (Math.random() < 0.7) SFX.gob('atk', this.px, this.pitch);
    this.scene.time.delayedCall(260, () => { if (this.state === 'windup') this.rig.setTintAll(null); });
  }
  startTaunt() { this.state = 'taunt'; this.st = 0; this.vx = this.vy = 0; this.play('m_taunt', 80); this.setHead(this.def.face + '_taunt'); this.showEmote('laugh', 900); SFX.gob('laugh', this.px, this.pitch); }
  startThrow() { this.state = 'throwup'; this.st = 0; this.vx = this.vy = 0; this.play('m_throwup', 80); this.rig.setTintAll(0xff9a8a); this.scene.time.delayedCall(260, () => this.state === 'throwup' && this.rig.setTintAll(null)); }
  startCast(t) { this.state = 'cast'; this.st = 0; this.vx = this.vy = 0; this.castTarget = t; this.castDone = false; this.play('m_cast', 80); SFX.gob('chant', this.px, this.pitch); this.setHead('head_shout'); this.scene.fx('crit_flash', this.x + this.face * 30, this.y - this.height * 0.95, { s: 0.18, dur: 700, tint: t ? 0x88ff88 : 0xcc66ff, depth: this.y + 1001 }); }

  // 플레이어 공격을 맞음
  takeHit(src, a, dmg) {
    if (this.dead || this.invuln > 0 || this.state === 'enter' || this.state === 'getup') return false;
    const isDown = this.state === 'down';
    if (isDown && !a.otg) return false;
    if (this.state === 'dying') return false;
    this.hp -= dmg;
    this.flash(0xffffff, 70);
    this.kick(-8, 0, -0.1);
    this.shake = a.stop || 60;
    this.releaseTok();
    this.rig.setTintAll(null);
    this.rig.setVisible('wpn', true);
    const dir = Math.sign(this.x - src.x) || src.face;
    this.face = -dir;
    const boss = this.kind === 'barkhaul';
    if (boss) return this.bossHit(a, dir, dmg);
    this.hurtFace();
    if (Math.random() < 0.6) SFX.gob('hurt', this.px, this.pitch);
    if (isDown) { this.vz = 260; this.z = 1; this.state = 'air'; this.st = 0; this.play('m_air', 30); return true; }
    if (this.state === 'air' || this.z > 0) {
      this.vz = Math.max(this.vz, a.type === 'launch' ? 700 : 380); this.vx = dir * 70; this.gravMul = 0.8;
      if (a.type === 'knock' || a.type === 'slam') { this.vx = dir * a.kb; this.vz = 300; }
      return true;
    }
    if (this.hp <= 0 || a.type === 'knock' || a.type === 'slam') {
      this.state = 'air'; this.st = 0; this.vz = a.type === 'slam' ? 380 : 440; this.z = 1; this.vx = dir * (a.kb || 300); this.vy = 0;
      this.play('m_air', 30);
      return true;
    }
    if (a.type === 'launch') {
      this.state = 'air'; this.st = 0; this.vz = 900; this.z = 1; this.vx = dir * 40; this.gravMul = 0.85;
      this.play('m_air', 30); return true;
    }
    this.state = 'hurt'; this.st = 0; this.stun = a.stun || 300; this.vx = dir * (a.kb || 120); this.vy = 0;
    this.replay('m_flinch', 20);
    if (a.stun) this.showEmote('dizzy', a.stun);
    return true;
  }
  onLand(v) {
    if (this.state !== 'air') return;
    if (v < -500 && !this.bounced) {
      this.bounced = true; this.vz = 260; this.z = 1; this.vx *= 0.4; this.kick(8, 0, -0.15);
      this.scene.fx('dust_land', this.x, this.y, { s: 0.3, dur: 380, depth: this.y - 1 }); SFX.land(this.px); return;
    }
    this.bounced = false; this.gravMul = 1;
    this.kick(6, 0, -0.12);
    this.state = 'down'; this.st = 0; this.vx = 0; this.vy = 0; this.downTime = 750;
    this.play('m_down', 40);
    this.scene.fx('dust_land', this.x, this.y, { s: 0.3, dur: 380, depth: this.y - 1 }); SFX.land(this.px, this.kind === 'barkhaul');
    if (this.hp <= 0) this.downTime = 350;
  }
  die() {
    if (this.dead) return;
    this.dead = true; this.state = 'dying'; this.releaseTok();
    SFX.die(this.px); if (this.kind !== 'barkhaul') SFX.gob('die', this.px, this.pitch);
    this.scene.fx('death_dissolve', this.x, this.y - this.height * 0.3, { s: this.kind === 'barkhaul' ? 0.8 : 0.32, dur: 900, depth: this.y + 1001, grow: 1.3 });
    this.scene.tweens.add({ targets: this.rig.c, alpha: 0, duration: 450, onComplete: () => this.destroy() });
    this.scene.onMonsterDead(this);
  }
  // ---------------- 바크하울 ----------------
  bossAI(dt, dx, dy, adx) {
    const s = dt / 1000, h = this.scene.hero, st = this.state;
    const rage = this.hp < this.maxHp * 0.5;
    if (rage && !this.raged) { this.raged = true; this.startRoar(true); return; }
    if (!this.summon60 && this.hp < this.maxHp * 0.65) { this.summon60 = true; return this.startRoar(false, 2); }
    if (!this.summon30 && this.hp < this.maxHp * 0.3) { this.summon30 = true; return this.startRoar(false, 3); }
    if (st === 'idle' || st === 'move') {
      this.face = Math.sign(dx) || this.face;
      if (this.cool <= 0) {
        const r = Math.random();
        if (adx < 260 && Math.abs(dy) < 60) return this.startSmash();
        if (r < 0.45) return this.startRock();
        if (r < 0.75) return this.startRoots();
        this.cool = 400;
      }
      const tx = h.x - Math.sign(dx || 1) * 190, ty = h.y;
      const mx = tx - this.x, my = ty - this.y;
      const sp = this.def.speed * (rage ? 1.35 : 1);
      this.vx = Math.abs(mx) > 20 ? Math.sign(mx) * sp : 0;
      this.vy = Math.abs(my) > 10 ? Math.sign(my) * sp * 0.6 : 0;
      if (this.vx || this.vy) { this.state = 'move'; this.play('m_walk', 140); } else { this.state = 'idle'; this.play('m_idle', 160); }
      if (adx < 260 && Math.abs(dy) < 40 && this.cool < 600) return this.startSmash();
      this.physics(dt);
      return;
    }
    if (st === 'smashup') {
      if (this.st > (rage ? 650 : 900)) {
        this.state = 'smash'; this.st = 0; this.replay('b_smash', 30); this.hitDone = false;
      }
      return;
    }
    if (st === 'smash') {
      if (this.st > 110 && !this.hitDone) {
        this.hitDone = true; SFX.smash(this.px);
        this.scene.cameras.main.shake(260, 0.012);
        const px = this.x + this.face * 210;
        this.scene.fx('impact_ring', px, this.y, { s: 0.55, dur: 450, depth: this.y - 1, flat: true });
        this.scene.fx('dust_land', px, this.y, { s: 0.6, dur: 500, depth: this.y + 1 });
        this.scene.areaHit(this, px, this.y, 150, 50, this.def.dmg, 'heavy');
        this.scene.spawnDebrisAt(px, this.y, 4, 'rock');
      }
      if (this.st > 1100) { this.cool = rage ? 900 : 1600; this.toIdle(); }
      return;
    }
    if (st === 'rock') {
      if (this.st > 650 && !this.hitDone) {
        this.hitDone = true; SFX.throwS(this.px); SFX.bossGrunt(this.px);
        this.scene.lobRock(this, this.rockTarget);
      }
      if (this.st > 1100) { this.cool = rage ? 800 : 1400; this.toIdle(); }
      return;
    }
    if (st === 'roots') {
      if (this.st > 1300) { this.cool = rage ? 900 : 1500; this.toIdle(); }
      return;
    }
    if (st === 'roar') {
      if (this.st > 1300) { this.toIdle(); this.cool = 600; }
      return;
    }
    if (st === 'stagger') {
      if (this.st > 2400) { this.poise = 100; this.setHead(null); this.toIdle(); this.cool = 300; }
      return;
    }
    this.toIdle();
  }
  startSmash() {
    this.state = 'smashup'; this.st = 0; this.vx = this.vy = 0; this.play('b_smashup', 80); this.setHead('head_shout'); SFX.bossGrunt(this.px);
    const px = this.x + this.face * 210;
    this.scene.telegraph(px, this.y, 1.0, this.raged ? 650 : 900);
    this.rig.setTintAll(0xffb0a0);
  }
  startRock() {
    this.state = 'rock'; this.st = 0; this.vx = this.vy = 0; this.hitDone = false; this.play('m_throwup', 120);
    const h = this.scene.hero;
    this.rockTarget = { x: h.x + h.vx * 0.5, y: h.y };
    this.scene.telegraph(this.rockTarget.x, this.rockTarget.y, 0.7, 1400);
    this.scene.time.delayedCall(500, () => { if (this.state === 'rock') this.replay('m_throw', 40); });
  }
  startRoots() {
    this.state = 'roots'; this.st = 0; this.vx = this.vy = 0; this.replay('b_stomp', 60); this.setHead('head_shout');
    const h = this.scene.hero;
    const pts = [[h.x, h.y], [h.x - 160, h.y + (Math.random() - 0.5) * 120], [h.x + 160, h.y + (Math.random() - 0.5) * 120]];
    if (this.raged) pts.push([h.x + (Math.random() - 0.5) * 300, h.y + (Math.random() - 0.5) * 160]);
    pts.forEach(([x, y], i) => {
      y = Phaser.Math.Clamp(y, FLOOR_TOP, FLOOR_BOT);
      this.scene.telegraph(x, y, 0.55, 1000 + i * 120);
      this.scene.time.delayedCall(1000 + i * 120, () => this.scene.rootBurst(this, x, y));
    });
    this.scene.time.delayedCall(520, () => { SFX.step('giant', this.px); this.scene.cameras.main.shake(140, 0.006); });
  }
  startRoar(rage, n = 0) {
    this.state = 'roar'; this.st = 0; this.vx = this.vy = 0; this.play('b_roar', 80); this.setHead('head_shout');
    SFX.roar(this.px); this.scene.cameras.main.shake(700, 0.008);
    this.showEmote('anger', 1300);
    if (rage) { this.rig.setTintAll(null); this.scene.bossRage(this); }
    if (n) this.scene.time.delayedCall(500, () => this.scene.summonGrunts(n));
  }
  bossHit(a, dir, dmg) {
    this.poise -= a.type === 'light' ? 6 : 16;
    if (this.hp <= 0) {
      this.state = 'air'; this.st = 0; this.vz = 350; this.z = 1; this.vx = dir * 120; this.play('m_air', 40); this.setHead('head_shout');
      this.scene.bossDefeated(this);
      return true;
    }
    if (this.poise <= 0 && this.state !== 'stagger') {
      this.state = 'stagger'; this.st = 0; this.vx = 0; this.play('m_down', 120); this.setHead('head_shout');
      this.showEmote('dizzy', 2300); this.scene.floatText(this.x, this.y - this.height, '그로기!', '#ffd34d', 34);
      SFX.bossWeak(this.px);
      this.scene.cameras.main.shake(200, 0.008);
      this.rig.setTintAll(null);
      return true;
    }
    if (this.state === 'stagger') return true;
    // 슈퍼아머: 경직 없이 흔들리기만 한다
    return true;
  }
  physics(dt) {
    super.physics(dt);
    if (this.kind === 'barkhaul' && this.state === 'stagger') this.rig.c.rotation = 0;
  }
}
