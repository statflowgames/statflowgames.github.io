// 은하 방역대 - 몹 행동 / 보스 패턴 / 스테이지 / 업그레이드
// game.js의 G, spawnEnemy, eShoot, aim, rand 사용

const ENEMIES = {
  mosquito: { name: '삐용이', hp: 2, r: 11, score: 100, xp: 1, draw: Art.mosquito,
    init(e) { e.vy = e.vy || rand(80, 120); e.ph = rand(0, 6); },
    update(e, dt) {
      e.y += e.vy * dt; e.x += Math.cos(e.t * 3 + e.ph) * 70 * dt;
      if (e.t > 0.6 && Math.random() < dt * 0.3 * G.fire) eShoot(e.x, e.y + 10, aim(e), 150);
    } },
  fly: { name: '윙윙', hp: 3, r: 11, score: 120, xp: 1, draw: Art.fly,
    init(e) { e.x0 = e.x; e.vx = e.vx || 0; e.vy = e.vy || 110; },
    update(e, dt) {
      if (e.sine) { e.x = e.x0 + Math.sin(e.t * 2.2 + e.sine) * 90; e.y += e.vy * dt; }
      else { e.x += e.vx * dt; e.y += e.vy * dt; }
      if (e.t > 0.8 && Math.random() < dt * 0.25 * G.fire) eShoot(e.x, e.y + 10, aim(e), 160);
    } },
  ladybug: { name: '점박이 탱크', hp: 22, r: 15, score: 500, xp: 4, elite: true, draw: Art.ladybug,
    init(e) { e.ty = rand(90, 220); e.cd = 1; e.hover = 0; },
    update(e, dt) {
      if (e.y < e.ty && e.hover === 0) { e.y += 90 * dt; return; }
      e.hover += dt;
      if (e.hover > 6) { e.y += 120 * dt; return; }
      e.x += Math.sin(e.t) * 25 * dt;
      if ((e.cd -= dt) <= 0) {
        e.cd = 1.6 / G.fire;
        const a = aim(e), n = G.loop > 0 ? 7 : 5;
        for (let i = 0; i < n; i++) eShoot(e.x, e.y + 14, a + (i - (n - 1) / 2) * 0.22, 140, { c: '#ff5d73' });
        Sound.play('hit');
      }
    } },
  firefly: { name: '번쩍이', hp: 3, r: 10, score: 150, xp: 1, draw: Art.firefly,
    init(e) { e.ty = rand(70, 260); },
    update(e, dt) {
      if (!e.wait && !e.dashing) { e.y += 120 * dt; if (e.y > e.ty) e.wait = 0.6; return; }
      if (e.wait > 0) { e.wait -= dt; if (e.wait <= 0) { e.dashing = true; const a = aim(e); e.vx = Math.cos(a) * 340; e.vy = Math.sin(a) * 340; e.rotate = true; } return; }
      e.x += e.vx * dt; e.y += e.vy * dt;
    } },
  spider: { name: '실타래', hp: 14, r: 14, score: 400, xp: 3, elite: true, draw: Art.spider, thread: true,
    init(e) { e.ty = rand(80, 210); e.cd = 0.8; e.hover = 0; },
    update(e, dt) {
      if (e.hover === 0 && e.y < e.ty) { e.y += 100 * dt; return; }
      e.hover += dt;
      if (e.hover > 7) { e.y -= 110 * dt; if (e.y < -40) e.dead = true; return; }
      e.y = e.ty + Math.sin(e.hover * 2) * 6;
      if ((e.cd -= dt) <= 0) {
        e.cd = 2.2 / G.fire; e.rot = (e.rot || 0) + 0.3;
        const n = 10 + G.loop * 4;
        for (let i = 0; i < n; i++) eShoot(e.x, e.y, e.rot + i * Math.PI * 2 / n, 105, { c: '#c77dff' });
      }
    } },
  roach: { name: '쌩쌩이', hp: 4, r: 10, score: 150, xp: 1, draw: Art.roach, rotate: true,
    init(e) { e.vx = e.vx || rand(-60, 60); e.vy = e.vy || 220; e.bounces = 2; },
    update(e, dt) {
      e.x += e.vx * dt; e.y += e.vy * dt;
      if ((e.x < 12 && e.vx < 0) || (e.x > G.W - 12 && e.vx > 0)) { if (e.bounces-- > 0) e.vx *= -1; }
    } },
  beetle: { name: '뿔돌이', hp: 40, r: 16, score: 800, xp: 6, elite: true, draw: Art.beetle,
    init(e) { e.cd = 1.2; e.burst = 0; },
    update(e, dt) {
      e.y += 38 * dt; e.x += Math.sin(e.t * 0.8) * 30 * dt;
      if ((e.cd -= dt) <= 0) {
        if (e.burst <= 0) e.burst = 3;
        eShoot(e.x, e.y + 22, aim(e), 210, { c: '#5ef2ff', r: 5 });
        e.burst--; e.cd = e.burst > 0 ? 0.13 : 1.8 / G.fire;
      }
    } },
};

// 보스: 5초마다 패턴 전환, 체력 50% 이하에서 분노(패턴 강화)
function bossMode(b, n, win = 5) {
  const mode = Math.floor(b.t / win) % n;
  if (mode !== b.mode) { b.mode = mode; b.cd = 0.6; b.cx = b.x; b.sub = 0; }
  return { mode, lt: b.t % win, rage: b.hp < b.maxHp * 0.5 };
}

const BOSSES = {
  queen: { name: '여왕벌 비비 퀸', hp: 700, r: 36, score: 20000, draw: Art.queen, scale: 1,
    update(b, dt) {
      const { mode, rage } = bossMode(b, 3);
      b.x = G.W / 2 + Math.sin(b.t * 0.6) * (G.W / 2 - 60);
      if ((b.cd -= dt) > 0) return;
      if (mode === 0) {
        const arms = rage ? 3 : 2;
        for (let k = 0; k < arms; k++) eShoot(b.x, b.y + 20, b.t * 2.6 + k * Math.PI * 2 / arms, 125, { c: '#ffd23f' });
        b.cd = rage ? 0.06 : 0.08;
      } else if (mode === 1) {
        const a = aim(b), n = rage ? 7 : 5;
        for (let i = 0; i < n; i++) eShoot(b.x, b.y + 30, a + (i - (n - 1) / 2) * 0.17, 200, { c: '#ff8c42', shape: 'sting' });
        b.cd = rage ? 0.55 : 0.8; Sound.play('hit');
      } else {
        spawnEnemy('mosquito', b.x - 40, b.y, { vy: 120 }); spawnEnemy('mosquito', b.x + 40, b.y, { vy: 120 });
        eShoot(b.x, b.y + 30, aim(b), 170, { c: '#ffd23f', r: 6 });
        b.cd = rage ? 0.8 : 1.2;
      }
    } },
  tarantula: { name: '왕거미 타란툴라 마담', hp: 1500, r: 40, score: 40000, draw: Art.tarantula, scale: 1.05,
    update(b, dt) {
      const { mode, rage } = bossMode(b, 4);
      b.x = G.W / 2 + Math.sin(b.t * 0.45) * (G.W / 2 - 70);
      b.y = 155 + Math.sin(b.t * 0.9) * 18;
      if ((b.cd -= dt) > 0) return;
      if (mode === 0) {
        const n = rage ? 22 : 16; b.sub ^= 1;
        for (let i = 0; i < n; i++) eShoot(b.x, b.y, (i + b.sub * 0.5) * Math.PI * 2 / n, 110, { c: '#c77dff' });
        b.cd = 0.9;
      } else if (mode === 1) {
        const a = aim(b);
        for (let i = -1; i <= 1; i++) eShoot(b.x, b.y + 30, a + i * 0.35, 85, { c: '#e0d4ff', r: 10, shape: 'web' });
        for (let i = 0; i < (rage ? 6 : 3); i++) eShoot(b.x, b.y + 30, a + rand(-0.5, 0.5), rand(170, 230), { c: '#ff3d68' });
        b.cd = 0.65;
      } else if (mode === 2) {
        for (const d of [1, -1]) for (let k = 0; k < 2; k++) eShoot(b.x, b.y, d * b.t * 1.9 + k * Math.PI, 120, { c: d > 0 ? '#c77dff' : '#ff3d68' });
        b.cd = rage ? 0.055 : 0.075;
      } else {
        spawnEnemy('spider', rand(40, G.W - 40), -30, {});
        const n = 12;
        for (let i = 0; i < n; i++) eShoot(b.x, b.y, i * Math.PI * 2 / n + b.t, 90, { c: '#9b5de5' });
        b.cd = rage ? 1.6 : 2.4;
      }
    } },
  emperor: { name: '바퀴 황제 로치 엠퍼러', hp: 2800, r: 42, score: 80000, draw: Art.emperor, scale: 1.1,
    update(b, dt) {
      const { mode, lt, rage } = bossMode(b, 4);
      if (mode === 3) { // 돌진: 경고선 → 아래로 돌진 → 원형 폭발 → 복귀
        b.x = b.cx;
        if (lt < 1) { b.warn = true; b.x = b.cx + Math.sin(b.t * 60) * 3; }
        else if (lt < 1.6) { b.warn = false; b.y = 150 + (G.H - 330) * ((lt - 1) / 0.6); }
        else if (lt < 1.7) { if (!b.sub) { b.sub = 1; G.shake = 14; Sound.play('boom');
          const n = rage ? 28 : 20; for (let i = 0; i < n; i++) eShoot(b.x, b.y, i * Math.PI * 2 / n, 150, { c: '#ff8c42' }); } }
        else if (lt < 3.2) { b.y = G.H - 180 - (G.H - 330) * ((lt - 1.7) / 1.5); }
        else { b.y = 150; }
        return;
      }
      b.warn = false; b.y = 150;
      b.x += (G.W / 2 + Math.sin(b.t * 0.7) * (G.W / 2 - 70) - b.x) * Math.min(1, dt * 3);
      if ((b.cd -= dt) > 0) return;
      if (mode === 0) {
        for (let i = 0; i < (rage ? 3 : 2); i++) eShoot(b.x + rand(-20, 20), b.y + 30, Math.PI / 2 + rand(-0.9, 0.9), rand(140, 230), { c: '#ffb347' });
        b.cd = 0.04;
      } else if (mode === 1) {
        for (const s of [-1, 1]) spawnEnemy('roach', b.x + s * 30, b.y + 20, { vx: s * rand(80, 160), vy: rand(200, 260) });
        b.cd = rage ? 0.5 : 0.75;
      } else {
        const n = 12; b.sub += 0.25;
        for (let i = 0; i < n; i++) eShoot(b.x, b.y, i * Math.PI * 2 / n + b.sub, 120, { c: '#ff5d73' });
        const a = aim(b);
        for (let i = 0; i < 5; i++) eShoot(b.x, b.y + 30, a, 150 + i * 30, { c: '#ffd23f', r: 5 });
        b.cd = rage ? 0.45 : 0.6;
      }
    } },
};

// ---- 편대(웨이브) ----
const F = {
  mosqLine() { const n = 5; for (let i = 0; i < n; i++) spawnEnemy('mosquito', (i + 0.5) * G.W / n, -20 - i * 25, {}); },
  mosqRain() { for (let i = 0; i < 8; i++) spawnEnemy('mosquito', rand(20, G.W - 20), -20 - i * 40, { vy: rand(110, 150) }); },
  flyV() { const cx = rand(80, G.W - 80); for (let i = 0; i < 7; i++) { const k = i - 3; spawnEnemy('fly', cx + k * 26, -20 - Math.abs(k) * 22, { vy: 120 }); } },
  flySnake() { const x0 = rand(100, G.W - 100); for (let i = 0; i < 7; i++) spawnEnemy('fly', x0, -20 - i * 34, { sine: i * 0.5, vy: 100 }); },
  flyCross() { for (let i = 0; i < 5; i++) { spawnEnemy('fly', -10, 40 + i * 30, { vx: 130, vy: 60 }); spawnEnemy('fly', G.W + 10, 60 + i * 30, { vx: -130, vy: 60 }); } },
  ladybug() { spawnEnemy('ladybug', rand(50, G.W - 50), -30, {}); },
  ladyPair() { spawnEnemy('ladybug', G.W * 0.28, -30, {}); spawnEnemy('ladybug', G.W * 0.72, -60, {}); },
  fireflies() { const n = 3 + Math.floor(G.prog * 3); for (let i = 0; i < n; i++) spawnEnemy('firefly', rand(30, G.W - 30), -20 - i * 30, {}); },
  spiders() { spawnEnemy('spider', rand(40, G.W / 2 - 20), -30, {}); spawnEnemy('spider', rand(G.W / 2 + 20, G.W - 40), -60, {}); },
  beetle() { spawnEnemy('beetle', rand(60, G.W - 60), -30, {}); },
  roachRush() { const s = Math.random() < 0.5 ? 1 : -1, x = s > 0 ? 20 : G.W - 20;
    for (let i = 0; i < 9; i++) spawnEnemy('roach', x + s * rand(0, 40), -20 - i * 22, { vx: s * rand(90, 150), vy: rand(220, 270) }); },
  roachWall() { for (let i = 0; i < 9; i++) spawnEnemy('roach', (i + 0.5) * G.W / 9, -20, { vx: 0, vy: 160 }); },
};

const STAGES = [
  { title: '벌집 성운', sub: 'HIVE NEBULA', song: 's1', boss: 'queen', len: 70,
    sky: ['#1a0b2e', '#4a1d5c', '#ff9f43'],
    pool: [[F.mosqLine, 3, 0], [F.mosqRain, 2, 0.15], [F.flyV, 3, 0], [F.flySnake, 2, 0.2], [F.ladybug, 2, 0.3], [F.fireflies, 2, 0.45], [F.flyCross, 1, 0.6]] },
  { title: '거미줄 소행성대', sub: 'WEB BELT', song: 's2', boss: 'tarantula', len: 75,
    sky: ['#06131f', '#0f3a4a', '#2de2a6'],
    pool: [[F.spiders, 3, 0], [F.flySnake, 2, 0], [F.mosqRain, 2, 0], [F.fireflies, 2, 0.1], [F.beetle, 2, 0.3], [F.ladyPair, 1, 0.45], [F.flyCross, 2, 0.2]] },
  { title: '바퀴 행성', sub: 'ROACH PRIME', song: 's3', boss: 'emperor', len: 80,
    sky: ['#1a0804', '#4a1a0a', '#ff6b35'],
    pool: [[F.roachRush, 3, 0], [F.roachWall, 2, 0.1], [F.beetle, 2, 0.15], [F.fireflies, 2, 0], [F.spiders, 1, 0.3], [F.flyV, 2, 0], [F.ladyPair, 1, 0.4]] },
];

const UPGRADES = [
  { id: 'dmg', icon: '💥', name: '고농축 살충제', desc: '공격력 +25%', max: 10, apply: p => p.dmg *= 1.25 },
  { id: 'rate', icon: '⚡', name: '터보 분사기', desc: '연사 속도 +18%', max: 8, apply: p => p.rate *= 1.18 },
  { id: 'spread', icon: '🔱', name: '확산 노즐', desc: '탄 줄기 +1', max: 4, apply: p => p.spread++ },
  { id: 'pierce', icon: '🗡️', name: '관통 침', desc: '탄이 적 1마리 더 관통', max: 3, apply: p => p.pierce++ },
  { id: 'homing', icon: '🚀', name: '추적 벌침 미사일', desc: '유도 미사일 +1', max: 4, apply: p => p.homing++ },
  { id: 'drone', icon: '🐝', name: '꿀벌 드론', desc: '주위를 돌며 함께 쏘는 드론 +1', max: 3, apply: p => p.drones++ },
  { id: 'magnet', icon: '🧲', name: '꽃가루 자석', desc: '꽃가루 흡수 범위 +50%', max: 4, apply: p => p.magnet *= 1.5 },
  { id: 'shield', icon: '🛡️', name: '방충망 쉴드', desc: '피격 1회 방어, 8초마다 재충전', max: 2, apply: p => { p.shieldMax++; p.shield = p.shieldMax; } },
  { id: 'hpmax', icon: '❤️', name: '강화 장갑', desc: '최대 체력 +1, 체력 +1', max: 3, apply: p => { p.hpMax++; p.hp++; } },
  { id: 'heal', icon: '🩹', name: '응급 수리', desc: '체력을 모두 회복', max: 99, cond: p => p.hp < p.hpMax, apply: p => p.hp = p.hpMax },
  { id: 'bomb', icon: '💣', name: '살충 폭탄 보급', desc: '폭탄 +2', max: 99, cond: p => p.bombs < 6, apply: p => p.bombs = Math.min(9, p.bombs + 2) },
];
