// 은하 방역대 - 화면 전환 / UI / 메인 루프
const $ = id => document.getElementById(id);

const UI = {
  screens: ['title', 'dex', 'sel', 'rank', 'lv', 'pause', 'over'],
  show(id) { this.screens.forEach(s => { $(s).hidden = s !== id; }); },
  hud(on) { $('pauseBtn').hidden = !on; $('bombBtn').hidden = !on; },
  showLevelUp(choices) {
    const box = $('cards'); box.innerHTML = '';
    $('lvNum').textContent = `LEVEL ${G.p.level - G.pendingLv + 1}`;
    const opened = performance.now();
    choices.forEach(u => {
      const lv = G.p.lv[u.id] || 0, b = document.createElement('button');
      b.className = 'card';
      b.innerHTML = `<div class="ic">${u.icon}</div><div class="nm">${u.name}${u.max < 99 ? `<small>Lv ${lv} → ${lv + 1}</small>` : ''}</div><div class="ds">${u.desc}</div>`;
      b.onclick = () => {
        if (performance.now() - opened < 300 || G.state !== 'levelup') return;
        applyUpgrade(u); $('lv').hidden = true;
      };
      box.appendChild(b);
    });
    $('lv').hidden = false;
  },
  togglePause() {
    if (G.state === 'play') { G.state = 'paused'; Sound.suspend(); $('pause').hidden = false; }
    else if (G.state === 'paused') { G.state = 'play'; Sound.resume(); $('pause').hidden = true; }
  },
  showOver(isBest) {
    $('ovScore').textContent = G.score.toLocaleString();
    $('ovBest').hidden = !isBest;
    $('ovStage').textContent = `${G.loop ? G.loop + 1 + '회차 ' : ''}${G.stage + 1}. ${STAGES[G.stage].title}`;
    $('ovKills').textContent = G.kills.toLocaleString();
    $('ovCombo').textContent = G.maxCombo;
    $('ovLv').textContent = G.p.level;
    $('retryBtn').textContent = G.stage > 0 && !G.loop ? `STAGE ${G.stage + 1}부터 다시` : '다시 출동';
    $('restartBtn').hidden = G.stage === 0 && !G.loop;
    $('ovRankBtn').hidden = !RANKING_ENABLED;
    this.hud(false); this.show('over');
  },
  syncMute() { const t = Sound.muted ? '소리 꺼짐' : '소리 켜짐'; $('muteBtn').textContent = t; $('muteBtn2').textContent = t; },
};

function startGame(stage = 0) {
  Sound.init(); Sound.resume(); Sound.play('start');
  G.parts = []; G.items = []; G.texts = []; G.pb = [];
  newGame(stage);
  UI.show(null); UI.hud(true);
}
function toTitle() {
  G.state = 'title'; G.p = null; G.boss = null; G.phase = 'waves';
  Sound.resume(); Render.makeSky(STAGES[0]); Sound.music('title');
  $('bestT').textContent = BEST.toLocaleString();
  $('progT').textContent = Save.unlocked;
  $('rankBtn').hidden = !RANKING_ENABLED;
  UI.hud(false); UI.show('title');
}

// ---- 타이틀 일러스트 ----
function drawHero(t) {
  const cv = $('heroArt'), c = cv.getContext('2d');
  c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 300, 190);
  const bob = (k, a = 4) => Math.sin(t * 2 + k) * a;
  const put = (fn, x, y, s, rot = 0) => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); fn(c, t, { dashing: false }); c.restore(); };
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const y = 150 - ((t * 260 + i * 30) % 170);
    Art.ell(c, 150, y, 2.5, 7, 0, 'rgba(45,226,166,0.8)');
  }
  c.globalCompositeOperation = 'source-over';
  put(Art.spider, 52, 46 + bob(0), 1.6); c.strokeStyle = 'rgba(230,220,255,0.3)'; c.beginPath(); c.moveTo(52, 0); c.lineTo(52, 32 + bob(0)); c.stroke();
  put(Art.butterfly, 248, 46 + bob(1), 1.3);
  put(Art.mosquito, 108, 28 + bob(2), 1.4);
  put(Art.firefly, 196, 26 + bob(3), 1.5);
  put(Art.roach, 30, 120 + bob(4), 1.3, -0.6);
  put(Art.stag, 272, 128 + bob(5), 1.2);
  put(Art.ladybug, 214, 98 + bob(6), 1.2);
  put(Art.player, 150, 160 + bob(1, 3), 2.2);
}

// ---- 스테이지 선택 ----
function openSelect() {
  const box = $('worlds'); box.innerHTML = '';
  WORLDS.forEach((w, wi) => {
    const row = document.createElement('div'); row.className = 'world';
    row.innerHTML = `<div><small>WORLD ${wi + 1}</small><b>${w.title}</b></div>`;
    for (let k = 0; k < 3; k++) {
      const i = wi * 3 + k, b = document.createElement('button');
      b.className = 'stg' + (STAGES[i].boss ? ' boss' : '');
      b.disabled = i + 1 > Save.unlocked;
      b.textContent = b.disabled ? '🔒' : STAGES[i].boss ? `👑${i + 1}` : i + 1;
      b.setAttribute('aria-label', `STAGE ${i + 1}${STAGES[i].boss ? ' 보스' : ''}${b.disabled ? ' 잠김' : ''}`);
      b.onclick = () => { $('sel').hidden = true; startGame(i); };
      row.appendChild(b);
    }
    box.appendChild(row);
  });
  $('sel').hidden = false;
}

// ---- 도감 (만나지 않은 해충은 실루엣) ----
function openDex() {
  const g = $('dexGrid'); g.innerHTML = '';
  [...BUG_ORDER, ...BOSS_ORDER].forEach(key => {
    const [nm, kind, desc] = INFO[key], boss = !!BOSSES[key], seen = Save.seen(key), d = document.createElement('div');
    d.className = 'dexcard' + (boss ? ' boss' : '') + (seen ? '' : ' unknown');
    d.innerHTML = `${boss ? '<div class="tag">BOSS</div>' : ''}<canvas data-k="${key}" data-seen="${seen ? 1 : 0}"></canvas>` +
      `<b>${seen ? nm : '???'}</b><em>${seen ? kind : `STAGE ${firstStage(key)}`}</em><p>${seen ? desc : `STAGE ${firstStage(key)}에서 만날 수 있어요.`}</p>`;
    g.appendChild(d);
  });
  $('dexCount').textContent = Save.count();
  $('dex').hidden = false;
  g.querySelectorAll('canvas').forEach(cv => { cv.width = cv.clientWidth * 2; cv.height = cv.clientHeight * 2; });
}
function drawDex(t) {
  $('dexGrid').querySelectorAll('canvas').forEach(cv => {
    const r = cv.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const c = cv.getContext('2d'), k = cv.dataset.k, boss = !!BOSSES[k], seen = cv.dataset.seen === '1';
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, cv.width, cv.height);
    const s = boss ? cv.height / (k === 'lunamoth' || k === 'mother' ? 190 : 150) : cv.height / 50;
    c.translate(cv.width / 2, cv.height / 2); c.scale(s, s);
    const fake = { dashing: false, phase: 0, hue: 300, trail: null };
    Art[k](c, seen ? t : 0, fake);
    if (!seen) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = '#1c1430'; c.fillRect(0, 0, cv.width, cv.height); }
  });
}

// ---- 랭킹 ----
function openRank(period) { Ranking.open(period); }

// ---- 이벤트 ----
$('startBtn').onclick = () => startGame(0);
$('retryBtn').onclick = () => startGame(G.loop ? 0 : G.stage);
$('restartBtn').onclick = () => startGame(0);
$('homeBtn').onclick = toTitle;
$('quitBtn').onclick = () => { $('pause').hidden = true; toTitle(); };
$('resumeBtn').onclick = () => UI.togglePause();
$('pauseBtn').onclick = () => UI.togglePause();
$('bombBtn').addEventListener('pointerdown', e => { e.preventDefault(); useBomb(); });
$('selBtn').onclick = () => { Sound.init(); Sound.play('select'); openSelect(); };
$('selClose').onclick = () => { $('sel').hidden = true; };
$('dexBtn').onclick = () => { Sound.init(); Sound.play('select'); openDex(); };
$('dexClose').onclick = () => { $('dex').hidden = true; };
$('rankBtn').onclick = () => { Sound.init(); Sound.play('select'); openRank('daily'); };
$('ovRankBtn').onclick = () => openRank('daily');
$('rankClose').onclick = () => { $('rank').hidden = true; };
document.querySelectorAll('#rankTabs button').forEach(b => { b.onclick = () => openRank(b.dataset.p); });
$('bragBtn').onclick = () => Share.brag();
$('inviteBtn').onclick = () => Share.invite();
$('muteBtn').onclick = $('muteBtn2').onclick = () => { Sound.init(); Sound.toggleMute(); UI.syncMute(); };
addEventListener('pointerdown', () => { Sound.init(); if (G.state === 'title') Sound.music('title'); }, { once: true });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') UI.togglePause(); });

// ---- 메인 루프 ----
let lastT = performance.now(), bombShown = -1;
function frame(now) {
  const dt = Math.min(0.033, (now - lastT) / 1000); lastT = now;
  if (G.state === 'play' || G.state === 'over' || G.state === 'title') update(dt);
  Render.draw();
  if (!$('title').hidden) drawHero(now / 1000);
  if (!$('dex').hidden) drawDex(now / 1000);
  if (G.p && G.p.bombs !== bombShown) { bombShown = G.p.bombs; $('bombN').textContent = bombShown; $('bombBtn').classList.toggle('empty', bombShown <= 0); }
  requestAnimationFrame(frame);
}

Render.init();
setupInput($('game'));
toTitle();
if (document.fonts) document.fonts.load("20px 'Black Han Sans'").then(() => document.fonts.load("20px 'Jua'"));
requestAnimationFrame(frame);
