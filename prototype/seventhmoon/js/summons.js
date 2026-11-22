// 🆕 2026-11-22 소환체가 눈에 보이게 (의뢰서 docs/art-brief-summons.md)
//   늑대 정령(세릴): 서리 늑대 리그에 spirit_wolf 부품. 옆을 달리다 적에게 뛰어들어 문다
//   그림자 분신(키르): 키르 몸을 그대로 복사해 보랏빛 반투명. 적 옆으로 순간이동해 벤다
//   뇌운(미라엘): 머리 위 먹구름 (번개 칠 때 그림 바뀜) · 군기 꽂기(하르반): 등 뒤 펄럭이는 군기
// 연결: game.js castSkill(aura) → Summons.start / updateAuras의 strike → Summons.strike / 매 프레임 Summons.update
class Summon extends Actor {
  constructor(scene, rig, x, y, o = {}) {
    super(scene, rig, x, y, o);
    this.side = 'summon'; this.state = 'idle'; this.goal = null; this.st = 0;
  }
}

const Summons = {
  list(sc) { return sc.summons || (sc.summons = []); },
  // 오라(지속 스킬)가 시작될 때
  start(sc, a, name) {
    const h = sc.hero;
    if (name === '늑대 정령' && typeof RIGS !== 'undefined' && RIGS.spirit_wolf) {
      const w = new Summon(sc, 'spirit_wolf', h.x - h.face * 90, Phaser.Math.Clamp(h.y + 36, FLOOR_TOP, FLOOR_BOT));
      w.kindS = 'wolf'; w.face = h.face; w.play('m_idle');
      w.rig.c.setAlpha(0);
      sc.tweens.add({ targets: w.rig.c, alpha: 0.95, duration: 400 });
      sc.fx('levelup_burst', w.x, w.y - 60, { s: 0.4, dur: 600, tint: 0xa0ffe0, depth: w.y + 1001 });
      a.summon = w; this.list(sc).push(w);
    } else if (name === '그림자 분신') {
      const c = new Summon(sc, h.key, h.x - h.face * 70, Phaser.Math.Clamp(h.y - 30, FLOOR_TOP, FLOOR_BOT), { hero: true });
      c.key = h.key; c.kindS = 'clone'; c.face = h.face;
      if (typeof CuteHeroes !== 'undefined') CuteHeroes.apply(c);
      c.state = 'idle'; c.play('idle');
      c.rig.setTintAll(0x9a70f0); c.rig.c.setAlpha(0);
      try { if (c.rig.c.postFX) c.rig.c.postFX.addGlow(0xc090ff, 3, 0, false, 0.1, 10); } catch (e) { /* 글로우를 못 쓰는 기기 */ }
      sc.tweens.add({ targets: c.rig.c, alpha: 0.8, duration: 300 });
      sc.fx('shadow_smoke', c.x, c.y - 90, { s: 0.45, dur: 500, depth: c.y + 1002 });
      a.summon = c; this.list(sc).push(c);
    } else if (name === '뇌운' && sc.textures.exists('summon/thundercloud_0')) {
      const img = sc.add.image(h.x, h.y - 300, 'summon/thundercloud_0').setScale(0.9).setAlpha(0).setDepth(4050);
      sc.tweens.add({ targets: img, alpha: 0.95, duration: 300 });
      a.cloud = img;
    } else if (name === '군기 꽂기' && sc.textures.exists('summon/war_banner')) {
      const img = sc.add.image(h.x, h.y, 'summon/war_banner').setOrigin(0.5, 1).setScale(0.55).setAlpha(0);
      sc.tweens.add({ targets: img, alpha: 1, duration: 300 });
      sc.tweens.add({ targets: img, scaleX: { from: 0.55, to: 0.5 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      a.banner = img;
    }
  },
  // 오라가 적을 칠 차례: 소환체가 있으면 소환체가 움직여서 친다 (true를 돌려주면 game.js는 따로 치지 않는다)
  strike(sc, a, best) {
    const s = a.summon;
    if (s && !s.gone) {
      s.goal = { m: best, dmg: a.strike, elem: a.elem, t: 0 };
      if (s.kindS === 'clone') {
        // 그림자처럼 적 옆으로 순간이동해서 벤다
        sc.fx('shadow_smoke', s.x, s.y - 90, { s: 0.35, dur: 350, depth: s.y + 1002 });
        s.x = best.x - (Math.sign(best.x - sc.hero.x) || 1) * -80; s.y = best.y; s.face = Math.sign(best.x - s.x) || 1;
        const atk = classOf(s.key).atk.a2;
        s.state = 'atk'; s.st = 0; s.replay(atk.clip, 30);
        sc.time.delayedCall(140, () => {
          if (s.gone || best.dead) return;
          sc.fx('slash_arc', best.x, best.y - best.height * 0.5, { s: 0.4, dur: 260, tint: 0xb070ff, depth: best.y + 1003, flip: s.face < 0 });
          sc.heroArea(best.x, best.y, 70, 40, a.strike, { kb: 120, type: 'light', col: '#c8a0ff' });
        });
        sc.time.delayedCall(420, () => { if (!s.gone) { s.state = 'idle'; s.play('idle'); } });
      }
      return true;
    }
    if (a.cloud) {
      a.cloud.setTexture('summon/thundercloud_1');
      sc.time.delayedCall(160, () => a.cloud && a.cloud.active && a.cloud.setTexture('summon/thundercloud_0'));
      // 번개는 구름에서 적으로 떨어진다 (원래 효과 그대로)
    }
    return false;
  },
  // 오라가 끝날 때
  end(sc, a) {
    const s = a.summon;
    if (s && !s.gone) {
      s.gone = true;
      sc.fx(s.kindS === 'wolf' ? 'levelup_burst' : 'shadow_smoke', s.x, s.y - 70, { s: 0.4, dur: 500, tint: s.kindS === 'wolf' ? 0xa0ffe0 : undefined, depth: s.y + 1001 });
      sc.tweens.add({ targets: s.rig.c, alpha: 0, duration: 400, onComplete: () => { s.destroy(); sc.summons = this.list(sc).filter(x => x !== s); } });
      s.shadow.setVisible(false);
    }
    for (const k of ['cloud', 'banner']) if (a[k]) { const img = a[k]; a[k] = null; sc.tweens.add({ targets: img, alpha: 0, duration: 300, onComplete: () => img.destroy() }); }
  },
  // 매 프레임: 따라가기·뛰어들기·물기
  update(sc, dt) {
    const h = sc.hero, s = dt / 1000;
    for (const a of sc.auras || []) {
      if (a.cloud) a.cloud.setPosition(h.x, h.y - h.z - (h.height || 200) - 70).setFlipX(h.face < 0);
      if (a.banner) a.banner.setPosition(h.x - h.face * 34, h.y - h.z + 4).setFlipX(h.face < 0).setDepth(1000 + h.y - 1);
    }
    for (const w of this.list(sc)) {
      if (w.gone) { w.draw(dt, false); continue; }
      w.st += dt;
      if (w.kindS === 'wolf') this.wolf(sc, w, dt, s);
      else this.follow(sc, w, h.x - h.face * 80, h.y - 26, 300);
      w.physics(dt);
      w.draw(dt, false);
    }
  },
  follow(sc, w, gx, gy, sp) {
    if (w.state === 'atk') { w.vx = w.vy = 0; return; }
    const dx = gx - w.x, dy = Phaser.Math.Clamp(gy, FLOOR_TOP, FLOOR_BOT) - w.y, d = Math.hypot(dx, dy * 1.4);
    if (d > 24) {
      w.vx = dx / d * sp; w.vy = Phaser.Math.Clamp(dy / Math.max(1, d) * sp, -160, 160); w.face = Math.sign(dx) || w.face;
      w.play(w.kindS === 'wolf' ? 'm_run' : 'run', 100); w.state = 'move';
    } else {
      w.vx = w.vy = 0; w.face = sc.hero.face;
      if (w.state !== 'idle') { w.state = 'idle'; w.play(w.kindS === 'wolf' ? 'm_idle' : 'idle', 120); }
    }
  },
  wolf(sc, w, dt, s) {
    const g = w.goal, h = sc.hero;
    if (g && g.m && !g.m.dead) {
      g.t += dt;
      const tx = g.m.x - (Math.sign(g.m.x - w.x) || 1) * 70, dx = tx - w.x, dy = g.m.y - w.y, d = Math.hypot(dx, dy);
      if (d > 30 && g.t < 700) {
        w.vx = dx / d * 760; w.vy = Phaser.Math.Clamp(dy / Math.max(1, d) * 760, -300, 300); w.face = Math.sign(g.m.x - w.x) || w.face;
        w.play('m_run', 60); w.state = 'move';
      } else if (!g.bit) {
        // 문다: 입 벌린 머리로 바뀌는 찌르기 동작
        g.bit = true; w.vx = w.vy = 0; w.face = Math.sign(g.m.x - w.x) || w.face;
        w.state = 'atk'; w.replay('m_stab', 30);
        sc.fx('hit_spark', g.m.x, g.m.y - g.m.height * 0.5, { s: 0.35, dur: 220, tint: 0xa0ffe0, depth: g.m.y + 1003 });
        sc.heroArea(g.m.x, g.m.y, 70, 40, g.dmg, { kb: 160, type: 'light', col: '#a0ffe0' });
        sc.time.delayedCall(320, () => { if (!w.gone) { w.goal = null; w.state = 'idle'; w.play('m_idle'); } });
      } else { w.vx = w.vy = 0; }
      return;
    }
    w.goal = null;
    this.follow(sc, w, h.x - h.face * 110, h.y + 40, 380);
  },
  clear(sc) { for (const w of this.list(sc)) w.destroy(); sc.summons = []; },
};
