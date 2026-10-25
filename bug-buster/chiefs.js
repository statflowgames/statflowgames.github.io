// 은하 방역대 - 중간 보스 '대장': 각 월드 1·2스테이지 끝에 그 스테이지 해충의 거대 버전이 나옴
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 대장 공격 패턴. (b, dt, lt: 패턴 안에서 지난 시간, r: 분노) → true면 이동도 패턴이 직접 다룸
const CHIEF_MOVES = {
  stream(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 0.09 : 0.13; eShoot(b.x, b.y + b.r * 0.5, aim(b), 210, { c: b.col }); } },
  fan(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 0.6 : 0.85; fanShot(b.x, b.y + b.r * 0.5, aim(b), r ? 7 : 5, 0.2, 160, { c: b.col }); } },
  ring(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 0.75 : 1.05; ringShot(b.x, b.y, r ? 20 : 14, 105, { c: b.col }, b.t); } },
  spiral(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 0.07 : 0.09; for (let k = 0; k < 2; k++) eShoot(b.x, b.y, b.t * 2.4 + k * Math.PI, 115, { c: b.col }); } },
  rain(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 0.07 : 0.1; eShoot(rand(10, G.W - 10), -10, Math.PI / 2, rand(170, 230), { c: b.col }); } },
  web(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 0.55 : 0.75; fanShot(b.x, b.y + 20, aim(b), 3, 0.35, 85, { c: '#e0d4ff', r: 10, shape: 'web' }); } },
  lob(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 0.7 : 1.0; lob(b.x, b.y + 20, G.p.x, G.p.y, 0.9, { c: b.col, r: 7, shape: 'egg', burst: 10, bspd: 115, bc: b.col }); } },
  gas(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 0.8 : 1.1; ringShot(b.x, b.y, 8, 40, { ...GAS, life: 3 }, b.t); eShoot(b.x, b.y, aim(b), 60, { ...GAS, life: 4 }); } },
  dust(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 0.03 : 0.04; eShoot(b.x + rand(-40, 40), b.y, Math.PI / 2 + rand(-1.2, 1.2), rand(40, 70), { c: '#e0c8f0', r: 3, shape: 'dust', ay: 18, life: 6 }); } },
  gapring(b, dt, lt, r) {
    if ((b.cd -= dt) > 0) return;
    b.cd = r ? 1.2 : 1.6;
    const n = 32, k0 = Math.round((((aim(b) + rand(-0.6, 0.6)) % TAU + TAU) % TAU) / (TAU / n));
    for (let i = 0; i < n; i++) { const d = Math.min(Math.abs(i - k0), n - Math.abs(i - k0)); if (d > 2) eShoot(b.x, b.y, i * TAU / n, 100, { c: b.col, r: 3.5 }); }
  },
  blade(b, dt, lt, r) { b.slash = (b.cd -= dt) < 0.25; if (b.cd <= 0) { b.cd = r ? 0.5 : 0.7; fanShot(b.x, b.y + 20, aim(b), r ? 11 : 9, 0.14, 200, { c: '#b6ff6a', shape: 'blade' }); } },
  summon(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 1.3 : 1.8; if (G.enemies.length < 18) for (const s of [-1, 1]) spawnEnemy(b.key, b.x + s * 40, b.y + 10, {}); } },
  swarm(b, dt, lt, r) { if (!b.sub) { b.sub = 1; ENEMIES[b.key].waves[0](); } CHIEF_MOVES.stream(b, dt, lt, r); },
  termites(b, dt, lt, r) { if ((b.cd -= dt) <= 0) { b.cd = r ? 0.3 : 0.45; spawnEnemy('termite', b.x + rand(-20, 20), b.y + 20, {}); } },
  // 조준선을 보여 준 뒤 그 방향으로 돌진, 멈춘 자리에서 원형 탄
  dash(b, dt, lt, r) {
    const cyc = Math.floor(lt / 2.5), ph = lt % 2.5;
    if (b.cyc !== cyc) { b.cyc = cyc; b.da = aim(b); b.hx = b.x; b.burst = false; }
    if (ph < 0.8) b.aimLines = [b.da];
    else if (ph < 1.4) {
      b.aimLines = null; b.dashing = b.charging = true;
      b.x = clamp(b.x + Math.cos(b.da) * 560 * dt, 20, G.W - 20); b.y = clamp(b.y + Math.sin(b.da) * 560 * dt, 60, G.H - 60);
    } else {
      b.dashing = b.charging = false;
      if (!b.burst) { b.burst = true; ringShot(b.x, b.y, r ? 16 : 12, 110, { c: b.col }); G.shake = Math.max(G.shake, 6); Sound.play('boom'); }
      toward(b, b.hx, 150, Math.min(1, dt * 3));
    }
    return true;
  },
  // 몸을 말고 무적 상태로 튕겨 다님 → 펴서 공격
  roll(b, dt, lt, r) {
    if (lt < 0.05) { b.rvx = (Math.random() < 0.5 ? 1 : -1) * 220; b.rvy = 200; }
    if (lt < 3.2) {
      b.rolled = b.invul = true; b.x += b.rvx * dt; b.y += b.rvy * dt;
      if ((b.x < b.r && b.rvx < 0) || (b.x > G.W - b.r && b.rvx > 0)) b.rvx *= -1;
      if ((b.y < 90 && b.rvy < 0) || (b.y > G.H * 0.6 && b.rvy > 0)) b.rvy *= -1;
    } else { b.rolled = b.invul = false; toward(b, G.W / 2, 150, Math.min(1, dt * 3)); CHIEF_MOVES.fan(b, dt, lt, r); }
    return true;
  },
  // 사라졌다가 다른 자리에 나타나며 부채꼴
  blink(b, dt, lt, r) {
    const cyc = Math.floor(lt / 1.4);
    if (lt % 1.4 < 0.4) {
      b.ghost = true;
      if (b.cyc !== cyc) { b.cyc = cyc; b.warnAt = { x: rand(50, G.W - 50), y: rand(100, 220) }; b.fired = false; }
      return true;
    }
    if (b.warnAt) { b.x = b.warnAt.x; b.y = b.warnAt.y; b.warnAt = null; }
    b.ghost = false;
    if (!b.fired) { b.fired = true; fanShot(b.x, b.y + 20, aim(b), r ? 9 : 7, 0.18, 180, { c: b.col }); }
    return true;
  },
  // 물속으로 숨어 이동 → 솟구치며 원형 탄
  dive(b, dt, lt, r) {
    if (lt > 0.3 && lt < 2.8) { b.ghost = true; if (!b.sub) { b.sub = 1; b.tx = rand(50, G.W - 50); } b.x += (b.tx - b.x) * dt * 2; return true; }
    if (lt >= 2.8 && b.sub === 1) { b.sub = 2; b.ghost = false; ringShot(b.x, b.y, r ? 24 : 18, 120, { c: b.col }); G.shake = 8; Sound.play('boom'); }
    if (lt >= 2.8) CHIEF_MOVES.fan(b, dt, lt, r);
  },
};

// 대장마다 3가지 패턴 (5초마다 바뀜)
const CHIEF_SET = {
  mosquito: ['stream', 'fan', 'summon'], fly: ['fan', 'spiral', 'summon'], firefly: ['dash', 'ring', 'summon'], spider: ['ring', 'web', 'summon'],
  roach: ['rain', 'dash', 'summon'], aphid: ['spiral', 'lob', 'summon'], dragonfly: ['dash', 'stream', 'fan'], gnat: ['swarm', 'spiral', 'ring'],
  pillbug: ['roll', 'fan', 'ring'], moth: ['dust', 'ring', 'summon'], stinkbug: ['gas', 'fan', 'spiral'], cicada: ['gapring', 'stream', 'spiral'],
  dungbeetle: ['lob', 'fan', 'ring'], mantis: ['blade', 'dash', 'fan'], nest: ['termites', 'ring', 'spiral'], flea: ['blink', 'fan', 'ring'],
  scorpion: ['lob', 'fan', 'stream'], stag: ['dash', 'ring', 'fan'], ant: ['swarm', 'stream', 'fan'], diver: ['dive', 'ring', 'fan'],
};

function makeChief(key, si) {
  const d = ENEMIES[key], sc = d.r <= 12 ? 2.6 : 2.1, moves = CHIEF_SET[key] || ['fan', 'ring', 'spiral'];
  return {
    get name() { return t('chiefName', { name: INFO[key][0] }); }, chief: true, key, hp: 180 + si * 110, r: d.r * sc * 0.85, score: 3000 + si * 1500, draw: d.draw, scale: sc,
    update(b, dt) {
      const { mode, lt, rage } = bossMode(b, moves.length), m = moves[mode];
      if (m !== 'roll') b.rolled = b.invul = false;
      if (m !== 'dive' && m !== 'blink') { b.ghost = false; b.warnAt = null; }
      if (m !== 'dash') { b.aimLines = null; b.dashing = b.charging = false; }
      if (m !== 'blade') b.slash = false;
      if (!CHIEF_MOVES[m](b, dt, lt, rage)) { drift(b, dt, 0.55); b.y += (150 - b.y) * Math.min(1, dt * 3); }
    },
  };
}
