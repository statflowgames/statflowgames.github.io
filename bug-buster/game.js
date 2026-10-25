// 은하 방역대 - 게임 로직
const G = { W: 360, H: 640, state: 'title', time: 0, shake: 0, flash: 0, enemies: [], pb: [], eb: [], parts: [], items: [], texts: [], stars: [] };
const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const aim = e => Math.atan2(G.p.y - e.y, G.p.x - e.x);
// 난이도: 적 체력, 적 탄 속도, 적 공격 빈도, 시작 체력 보너스, 점수 배율
const DIFFS = {
  easy: { hp: 0.7, bspd: 0.85, fire: 0.7, lives: 2, score: 0.5 },
  normal: { hp: 1, bspd: 1, fire: 1, lives: 0, score: 1 },
  hard: { hp: 1.35, bspd: 1.15, fire: 1.35, lives: 0, score: 2 },
};
let DIFF = 'normal';
try { const d = localStorage.getItem('bugbuster.diff'); if (DIFFS[d]) DIFF = d; } catch (e) {}
function setDiff(d) { DIFF = d; try { localStorage.setItem('bugbuster.diff', d); } catch (e) {} }
const D = () => DIFFS[G.diff || DIFF];
// 최고 기록은 난이도별로 따로 (예전 기록은 보통으로)
const Best = {
  get(d = DIFF) { try { return +localStorage.getItem('bugbuster.best.' + d) || (d === 'normal' ? +localStorage.getItem('bugbuster.best') || 0 : 0); } catch (e) { return 0; } },
  set(d, v) { try { localStorage.setItem('bugbuster.best.' + d, v); } catch (e) {} },
};

function spawnEnemy(type, x, y, opts) {
  const d = ENEMIES[type], mul = 1 + G.loop * 0.7 + G.stage * 0.22;
  const e = Object.assign({ type, def: d, x, y, vx: 0, vy: 0, t: 0, r: d.r, flash: 0, rotate: d.rotate }, opts);
  e.hp = e.maxHp = d.hp * mul * D().hp;
  if (d.init) d.init(e);
  Save.see(type);
  G.enemies.push(e); return e;
}
// o: c 색, r 크기, shape 모양, hr 판정 크기, life 수명, fuse/burst/bspd/bc 시간 지나면 터짐, ay 가속
function eShoot(x, y, a, spd, o = {}) {
  if (G.eb.length > 700) return;
  const s = spd * G.bspd;
  G.eb.push(Object.assign({ r: 4, c: '#ff5d73' }, o, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, a }));
}
function part(x, y, c, n, spd = 120, size = 3, life = 0.5) {
  for (let i = 0; i < n && G.parts.length < 500; i++) {
    const a = rand(0, Math.PI * 2), s = rand(0.2, 1) * spd;
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c, s: rand(size * 0.5, size), life: rand(life * 0.5, life), max: life });
  }
}
function ring(x, y, c, r) { G.parts.push({ x, y, vx: 0, vy: 0, c, s: r, life: 0.35, max: 0.35, ring: true }); }
function text(x, y, txt, c = '#fff', size = 12) { G.texts.push({ x, y, txt, c, size, life: 0.9 }); }

const COLORS = { mosquito: '#ff5d73', fly: '#2de2a6', ladybug: '#e63946', firefly: '#fff27a', spider: '#c77dff', roach: '#c98a4b', beetle: '#5ef2ff',
  aphid: '#c6ff4d', grasshopper: '#8fe05a', dragonfly: '#47e0ff', gnat: '#b0b0c0', strider: '#9ab0c8', pillbug: '#c0cad8', moth: '#d8c0e8',
  wasp: '#ffb000', stinkbug: '#b6ff6a', cicada: '#a3e635', centipede: '#ff6a4a', centseg: '#ff6a4a', dungbeetle: '#c8a070', mantis: '#b6ff6a',
  bombardier: '#ffcc33', nest: '#c8a070', termite: '#f5e6c8', flea: '#d0684a', butterfly: '#ff9ad8', scorpion: '#ffb347', stag: '#ff8c42',
  hornet: '#ffa000', ant: '#ff5a4a', diver: '#7fe0ff', jewel: '#ffffff' };

// start: 0부터 시작하는 스테이지 번호. 중간부터 시작하면 업그레이드 자동 보급
function newGame(start = 0) {
  G.diff = DIFF;
  const lives = 3 + D().lives;
  G.p = { x: G.W / 2, y: G.H - 110, hp: lives, hpMax: lives, dmg: 1, rate: 6, spread: 0, pierce: 0, homing: 0, drones: 0,
    magnet: 70, shield: 0, shieldMax: 0, shieldT: 0, bombs: 2, inv: 0, fireT: 0, missT: 0, droneT: 0,
    lv: {}, level: 1, xp: 0, xpNext: 6 };
  Object.assign(G, { score: 0, combo: 0, comboT: 0, maxCombo: 0, kills: 0, loop: 0, pendingLv: 0, time: 0, startStage: start });
  G.supply = start > 0 ? autoBuild(G.p, Math.round(start * 1.1)) : 0;
  startStage(start);
  G.state = 'play';
  G.tutorial = start === 0 ? 4 : 0;
}

function startStage(i) {
  const S = STAGES[i], k = i + G.loop * STAGES.length;
  Object.assign(G, { stage: i, stageT: 0, waveT: 2.2, phase: 'waves', boss: null, prog: 0, vacuum: false,
    enemies: [], eb: [], fire: (1 + i * 0.035 + G.loop * 0.35) * D().fire, bspd: (1 + i * 0.01 + G.loop * 0.12) * D().bspd, xpMul: 1 + Math.floor(k / 6) });
  const isNew = !Save.seen(S.featured);
  const gim = S.gimmick != null ? GIMMICKS[S.gimmick] : null;
  G.banner = { t: 0, label: `STAGE ${i + 1}  ·  ${S.area}` + (G.loop ? `  ·  ${t('loopN', { n: G.loop + 1 })}` : ''), title: S.title,
    sub: isNew ? t('newBug', { name: INFO[S.featured][0] }) : S.sub, newBug: isNew,
    gim: gim ? t('gimmickBanner', { name: gim.name, desc: gim.desc }) : null };
  if (G.supply) { text(G.W / 2, G.H * 0.55, t('supply', { n: G.supply }), '#c6ff4d', 14); G.supply = 0; }
  Save.see(S.featured); Save.flush();
  Render.makeSky(S);
  Gimmick.start(S);
  Sound.music(S.song, S.k * 2);
}

function pickWave() {
  stageWave(G.stage);
  if (G.stage >= 10 && Math.random() < 0.12 + G.stage * 0.01) stageWave(G.stage);
}

function spawnBoss() {
  const key = STAGES[G.stage].boss, d = BOSSES[key];
  const hp = d.hp * (1 + G.loop * 0.8) * D().hp;
  G.boss = { boss: true, key, def: d, x: G.W / 2, y: -90, t: 0, hp, maxHp: hp, r: d.r, cd: 1, flash: 0, entering: true };
  if (d.init) d.init(G.boss);
  Save.see(key); Save.flush();
  G.phase = 'boss';
  Sound.music(key === 'mother' ? 'final' : 'boss');
}

// 1·2번째 스테이지 끝: 그 스테이지 해충의 대장
function spawnChief() {
  const key = STAGES[G.stage].featured, d = makeChief(key, G.stage), hp = d.hp * (1 + G.loop * 0.8) * D().hp;
  G.boss = { boss: true, key, def: d, x: G.W / 2, y: -90, t: 0, hp, maxHp: hp, r: d.r, cd: 1, flash: 0, entering: true, col: COLORS[key] };
  G.phase = 'boss';
}

function stageCleared() {
  G.phase = 'cleared'; G.clearT = STAGES[G.stage].boss ? 5 : 3.2;
  Gimmick.cur = null;
  Save.unlock(G.stage + 2); Save.flush();
}

// ---------- 입력 ----------
const Input = { keys: {}, ptr: null };
function setupInput(canvas) {
  canvas.addEventListener('pointerdown', e => { Input.ptr = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    const q = Input.ptr; if (!q || q.id !== e.pointerId || G.state !== 'play') { if (q) { q.x = e.clientX; q.y = e.clientY; } return; }
    const k = 1.3 / Render.scale * (G.slowMul || 1);
    G.p.x += (e.clientX - q.x) * k; G.p.y += (e.clientY - q.y) * k;
    q.x = e.clientX; q.y = e.clientY;
  });
  const up = e => { if (Input.ptr && Input.ptr.id === e.pointerId) Input.ptr = null; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  addEventListener('keydown', e => {
    Input.keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'KeyB') { useBomb(); e.preventDefault(); }
    if (e.code === 'KeyP' || e.code === 'Escape') UI.togglePause();
  });
  addEventListener('keyup', e => { Input.keys[e.code] = false; });
}

// ---------- 플레이어 ----------
function updatePlayer(dt) {
  const p = G.p, K = Input.keys, sp = 260 * dt * (G.slowMul || 1);
  if (K.ArrowLeft || K.KeyA) p.x -= sp; if (K.ArrowRight || K.KeyD) p.x += sp;
  if (K.ArrowUp || K.KeyW) p.y -= sp; if (K.ArrowDown || K.KeyS) p.y += sp;
  p.x = Math.max(14, Math.min(G.W - 14, p.x)); p.y = Math.max(60, Math.min(G.H - 30, p.y));
  p.inv -= dt;
  if (p.shield < p.shieldMax && (p.shieldT += dt) >= 8) { p.shield++; p.shieldT = 0; }

  if ((p.fireT -= dt) <= 0) {
    p.fireT = 1 / p.rate;
    const n = 1 + p.spread;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.12;
      G.pb.push({ x: p.x + (i - (n - 1) / 2) * 4, y: p.y - 18, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, dmg: p.dmg, pierce: p.pierce, r: 4, hits: new Set() });
    }
    Sound.play('shoot');
  }
  if (p.homing > 0 && (p.missT -= dt) <= 0) {
    p.missT = 1.1;
    for (let i = 0; i < p.homing; i++) {
      const s = i % 2 ? 1 : -1;
      G.pb.push({ x: p.x + s * 10, y: p.y, vx: s * rand(100, 200), vy: -150, dmg: p.dmg * 2.5, pierce: 0, r: 4, homing: true, hits: new Set() });
    }
    Sound.play('missile');
  }
  if (p.drones > 0 && (p.droneT -= dt) <= 0) {
    p.droneT = 0.3;
    for (const d of dronePos()) G.pb.push({ x: d.x, y: d.y - 6, vx: 0, vy: -560, dmg: p.dmg * 0.6, pierce: 0, r: 3, drone: true, hits: new Set() });
  }
}
function dronePos() {
  const p = G.p, out = [];
  for (let i = 0; i < p.drones; i++) {
    const a = G.time * 2.4 + i * Math.PI * 2 / p.drones;
    out.push({ x: p.x + Math.cos(a) * 34, y: p.y + Math.sin(a) * 22 + 6 });
  }
  return out;
}

function hurtPlayer() {
  const p = G.p;
  if (p.inv > 0 || G.state !== 'play') return;
  clearBullets(p.x, p.y, 90);
  if (p.shield > 0) { p.shield--; p.shieldT = 0; p.inv = 1; Sound.play('shield'); ring(p.x, p.y, '#5ef2ff', 50); return; }
  p.hp--; p.inv = 2; G.shake = 12; G.flash = 0.25; G.combo = 0;
  Sound.play('hurt'); part(p.x, p.y, '#ff5d73', 24, 200, 4);
  try { navigator.vibrate && navigator.vibrate(120); } catch (e) {}
  if (p.hp <= 0) gameOver();
}
function clearBullets(x, y, r) {
  G.eb = G.eb.filter(b => { if ((b.x - x) ** 2 + (b.y - y) ** 2 < r * r) { part(b.x, b.y, b.c, 2, 60, 2, 0.3); return false; } return true; });
}

function useBomb() {
  const p = G.p;
  if (G.state !== 'play' || !p || p.bombs <= 0) return;
  p.bombs--; p.inv = Math.max(p.inv, 1.5);
  for (const b of G.eb) { part(b.x, b.y, b.c, 1, 80, 2, 0.4); G.score += 5; }
  G.eb = [];
  for (const e of G.enemies) damage(e, 25 + p.dmg * 12);
  if (G.boss && !G.boss.entering) damage(G.boss, G.boss.maxHp * 0.04);
  G.flash = 0.6; G.shake = 22; ring(p.x, p.y, '#2de2a6', 400);
  Sound.play('bomb');
}

// ---------- 전투 ----------
function damage(e, dmg) {
  if (e.dead || e.ghost) return;
  if (e.invul) { e.flash = 0.03; return; }
  e.hp -= dmg; e.flash = 0.07;
  if (e.def.onHit) e.def.onHit(e);
  if (e.hp <= 0) e.boss ? killBoss(e) : kill(e);
}
function mult() { return 1 + Math.min(G.combo, 100) * 0.02; }
function kill(e) {
  e.dead = true; G.kills++;
  G.combo++; G.comboT = 2.2; G.maxCombo = Math.max(G.maxCombo, G.combo);
  const pts = Math.round(e.def.score * mult() * (1 + G.loop) * D().score);
  G.score += pts;
  const c = COLORS[e.type];
  part(e.x, e.y, c, e.def.elite ? 26 : 12, e.def.elite ? 200 : 140, e.def.elite ? 4 : 3);
  ring(e.x, e.y, c, e.r * 2.2);
  if (e.def.elite) { G.shake = Math.max(G.shake, 5); text(e.x, e.y - 10, pts, '#ffd23f', 14); }
  Sound.play(e.def.elite ? 'boom' : 'pop');
  for (let i = 0; i < e.def.xp; i++) dropItem(e.x, e.y, 'xp');
  if (e.def.elite) { const r = Math.random(); if (r < 0.12) dropItem(e.x, e.y, 'heart'); else if (r < 0.18) dropItem(e.x, e.y, 'bomb'); }
  if (e.def.onDeath) e.def.onDeath(e);
}
function killBoss(b) {
  b.dead = true; G.boss = null; stageCleared(); G.vacuum = true;
  const pts = Math.round(b.def.score * (1 + G.loop) * D().score); G.score += pts;
  text(b.x, b.y, `+${pts}`, '#ffd23f', 22);
  clearBullets(b.x, b.y, 2000);
  for (const e of G.enemies) if (!e.dead) kill(e);
  G.deathFx = { x: b.x, y: b.y, t: 1.6 };
  G.shake = 26; G.flash = 0.8; Sound.play('boom');
  const chief = b.def.chief;
  for (let i = 0; i < (chief ? 14 : 30); i++) dropItem(b.x + rand(-30, 30), b.y + rand(-30, 30), i < (chief ? 4 : 8) ? 'xpBig' : 'xp');
  if (!chief || Math.random() < 0.5) dropItem(b.x, b.y, 'heart');
  if (!chief || Math.random() < 0.25) dropItem(b.x, b.y, 'bomb');
  setTimeout(() => Sound.play('clear'), 900);
}
function dropItem(x, y, kind) {
  const a = rand(0, Math.PI * 2), s = rand(40, 140);
  G.items.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, kind, t: 0 });
}
function gainXp(v) {
  const p = G.p; p.xp += v;
  while (p.xp >= p.xpNext) { p.xp -= p.xpNext; p.level++; p.xpNext = nextXp(p.xpNext); G.pendingLv++; }
}
function upgradeChoices() {
  const p = G.p;
  const ok = UPGRADES.filter(u => (p.lv[u.id] || 0) < u.max && (!u.cond || u.cond(p)));
  const main = ok.filter(u => u.id !== 'heal' && u.id !== 'bomb'), extra = ok.filter(u => u.id === 'heal' || u.id === 'bomb');
  const picks = [];
  while (picks.length < 3 && main.length) picks.push(main.splice(Math.floor(Math.random() * main.length), 1)[0]);
  while (picks.length < 3 && extra.length) picks.push(extra.splice(Math.floor(Math.random() * extra.length), 1)[0]);
  if (p.hp === 1 && picks.indexOf(UPGRADES.find(u => u.id === 'heal')) < 0) picks[2] = UPGRADES.find(u => u.id === 'heal');
  return picks;
}
function applyUpgrade(u) {
  const p = G.p; u.apply(p); p.lv[u.id] = (p.lv[u.id] || 0) + 1;
  G.pendingLv--; Sound.play('select');
  G.state = 'play';
}

function gameOver() {
  G.state = 'over';
  G.shake = 20; part(G.p.x, G.p.y, '#5ef2ff', 60, 260, 5, 1.2); Sound.play('boom');
  const isBest = G.score > Best.get(G.diff);
  if (isBest) Best.set(G.diff, G.score);
  Save.flush();
  if (RANKING_ENABLED) Ranking.submit(G.score, G.diff);
  Share.prepare(isBest);
  Sound.music('over');
  setTimeout(() => { if (G.state === 'over') UI.showOver(isBest); }, 1100);
}

// ---------- 메인 업데이트 ----------
function update(dt) {
  G.time += dt;
  Render.updateStars(dt);
  if (G.state === 'over') { updateParts(dt); return; }
  if (G.state !== 'play') return;
  const p = G.p, S = STAGES[G.stage];
  G.stageT += dt; G.prog = Math.min(1, G.stageT / S.len);
  if (G.banner) { G.banner.t += dt; if (G.banner.t > 3) G.banner = null; }
  if (G.tutorial > 0) G.tutorial -= dt;
  if ((G.comboT -= dt) <= 0) G.combo = 0;
  G.shake = Math.max(0, G.shake - dt * 40); G.flash = Math.max(0, G.flash - dt);

  if (G.phase === 'waves') {
    if ((G.waveT -= dt) <= 0) { pickWave(); G.waveT = (2.6 - 1.3 * G.prog) / (1 + G.stage * 0.015 + G.loop * 0.25); }
    if (G.stageT >= S.len) {
      G.phase = 'warn'; G.warnChief = !S.boss; G.warnT = S.boss ? 3.2 : 2.2; Sound.play('warn');
    }
  } else if (G.phase === 'warn') {
    if ((G.warnT -= dt) <= 0) G.warnChief ? spawnChief() : spawnBoss();
  } else if (G.phase === 'cleared') {
    if (G.deathFx && (G.deathFx.t -= dt) > 0 && Math.random() < 0.5) {
      const d = G.deathFx; part(d.x + rand(-40, 40), d.y + rand(-40, 40), ['#ffd23f', '#ff8c42', '#fff'][Math.random() * 3 | 0], 10, 180, 4); Sound.play('pop');
    }
    if ((G.clearT -= dt) <= 0) {
      if (S.boss) p.hp = Math.min(p.hpMax, p.hp + 1);
      G.phase = 'next';
      // 스테이지 사이 광고 → 다음 스테이지
      Ads.between(() => { if (G.stage === STAGES.length - 1) { G.loop++; startStage(0); } else startStage(G.stage + 1); });
    }
  }

  updatePlayer(dt);
  Gimmick.update(dt);

  // 플레이어 탄
  for (const b of G.pb) {
    if (b.homing) {
      const tg = nearestTarget(b);
      if (tg) {
        const want = Math.atan2(tg.y - b.y, tg.x - b.x), cur = Math.atan2(b.vy, b.vx);
        let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        const na = cur + Math.max(-6 * dt, Math.min(6 * dt, d)), sp = Math.min(480, Math.hypot(b.vx, b.vy) + 600 * dt);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
      }
      if (Math.random() < 0.5) G.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, c: '#ffd23f', s: 2, life: 0.25, max: 0.25 });
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -20 || b.y > G.H + 20 || b.x < -20 || b.x > G.W + 20) { b.gone = true; continue; }
    const B0 = G.boss && !G.boss.entering && !G.boss.ghost ? G.boss : null;
    if (B0 && B0.def.absorb && B0.def.absorb(B0, b)) { damage(B0, b.dmg * 0.35); part(b.x, b.y, '#ffb347', 2, 80, 2, 0.2); b.gone = true; continue; }
    const targets = B0 ? [B0, ...G.enemies] : G.enemies;
    for (const e of targets) {
      if (e.dead || e.ghost || b.hits.has(e) || e.y < -10) continue;
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + b.r) ** 2) {
        if (e.invul) { b.gone = true; part(b.x, b.y, '#ffffff', 3, 120, 2, 0.2); Sound.play('hit'); break; }
        b.hits.add(e); damage(e, b.dmg); Sound.play('hit');
        part(b.x, b.y, '#c6fff0', 2, 80, 2, 0.2);
        if (b.pierce-- <= 0) { b.gone = true; break; }
      }
    }
  }
  G.pb = G.pb.filter(b => !b.gone);

  // 적
  for (const e of G.enemies) {
    e.t += dt; e.flash -= dt; e.def.update(e, dt);
    if (e.t > 1.5 && (e.y > G.H + 50 || e.y < -150 || e.x < -80 || e.x > G.W + 80)) e.dead = true;
    if (!e.dead && !e.ghost && dist2(e, p) < (e.r * 0.75 + 5) ** 2) { hurtPlayer(); e.def.elite ? damage(e, 10) : kill(e); }
  }
  G.enemies = G.enemies.filter(e => !e.dead);

  // 보스
  const B = G.boss;
  if (B) {
    B.flash -= dt;
    if (B.entering) { B.y += 70 * dt; if (B.y >= 150) { B.y = 150; B.entering = false; B.t = 0; } }
    else { B.t += dt; B.def.update(B, dt); }
    if (G.boss && !B.ghost && dist2(B, p) < (B.r * 0.7) ** 2) hurtPlayer();
  }

  // 적 탄 (+ 스치기 보너스)
  const burst = [];
  for (const b of G.eb) {
    if (b.ay) b.vy += b.ay * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.life !== undefined && (b.life -= dt) <= 0) { b.gone = true; continue; }
    if (b.fuse !== undefined && (b.fuse -= dt) <= 0) { b.gone = true; burst.push(b); continue; }
    if (b.y < -30 || b.y > G.H + 30 || b.x < -30 || b.x > G.W + 30) { b.gone = true; continue; }
    const d = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
    if (d < ((b.hr ?? b.r * 0.8) + 3.5) ** 2) { b.gone = true; hurtPlayer(); }
    else if (!b.grazed && d < 22 * 22 && p.inv <= 0) { b.grazed = true; G.score += 20; G.comboT = 2.2; part(b.x, b.y, '#fff', 2, 60, 1.5, 0.25); }
  }
  G.eb = G.eb.filter(b => !b.gone);
  for (const b of burst) { ringShot(b.x, b.y, b.burst || 8, b.bspd || 110, { c: b.bc || b.c }, rand(0, 1)); part(b.x, b.y, b.bc || b.c, 8, 120, 3); }

  // 아이템
  for (const it of G.items) {
    it.t += dt;
    const dx = p.x - it.x, dy = p.y - it.y, d = Math.hypot(dx, dy);
    if ((G.vacuum || d < p.magnet) && it.t > 0.3) { const s = 480 / Math.max(d, 1); it.vx = dx * s; it.vy = dy * s; }
    else { it.vx *= 0.94; it.vy = it.vy * 0.94 + 50 * dt * 2; }
    it.x += it.vx * dt; it.y += it.vy * dt;
    if (d < 18) {
      it.gone = true;
      if (it.kind === 'xp' || it.kind === 'xpBig') { gainXp((it.kind === 'xp' ? 1 : 4) * G.xpMul); G.score += 10; Sound.play('pickup'); }
      else if (it.kind === 'heart') { if (p.hp < p.hpMax) p.hp++; else G.score += 2000; text(p.x, p.y - 24, p.hp < p.hpMax ? '+1 ❤' : '+2000', '#ff4d6d', 14); Sound.play('heart'); }
      else if (it.kind === 'bomb') { p.bombs = Math.min(9, p.bombs + 1); text(p.x, p.y - 24, t('plusBomb'), '#2de2a6', 14); Sound.play('heart'); }
    }
    if (it.y > G.H + 20) it.gone = true;
  }
  G.items = G.items.filter(i => !i.gone);
  updateParts(dt);

  if (G.pendingLv > 0 && G.state === 'play') { G.state = 'levelup'; Sound.play('levelup'); UI.showLevelUp(upgradeChoices()); }
}
function updateParts(dt) {
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92; q.life -= dt; }
  G.parts = G.parts.filter(q => q.life > 0);
  for (const t of G.texts) { t.y -= 30 * dt; t.life -= dt; }
  G.texts = G.texts.filter(t => t.life > 0);
}
function nearestTarget(b) {
  let best = null, bd = Infinity;
  const list = G.boss && !G.boss.entering ? [G.boss, ...G.enemies] : G.enemies;
  for (const e of list) { if (e.y < 0) continue; const d = dist2(e, b); if (d < bd) { bd = d; best = e; } }
  return best;
}
