// 은하 방역대 - 화면 전환 / UI / 메인 루프
const $ = id => document.getElementById(id);

const UI = {
  screens: ['title', 'dex', 'sel', 'rank', 'langSel', 'lv', 'pause', 'over', 'ending'],
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
    $('ovScore').textContent = fmt(G.score);
    $('ovBest').hidden = !isBest;
    $('ovStage').textContent = `${G.endless ? '∞ ' : ''}${G.stage + 1}. ${STAGES[G.stage].title}`;
    $('ovKills').textContent = fmt(G.kills);
    $('ovCombo').textContent = G.maxCombo;
    $('ovLv').textContent = G.p.level;
    $('retryBtn').textContent = G.endless ? t('retryEndless') : G.stage > 0 ? t('retryFrom', { n: G.stage + 1 }) : t('retry');
    $('restartBtn').hidden = G.stage === 0;
    // 부활은 게임당 1번, 보상형 광고가 준비됐을 때만
    $('reviveBtn').hidden = G.revived || !Ads.canRevive();
    $('reviveBtn').disabled = false; $('reviveBtn').textContent = t('revive');
    $('ovRankBtn').hidden = !RANKING_ENABLED;
    $('ovDiff').textContent = t('diff_' + G.diff); $('ovDiff').className = 'difftag ' + G.diff;
    this.hud(false); this.show('over');
  },
  showEnding(isBest) {
    $('endScore').textContent = fmt(G.score);
    $('endBest').hidden = !isBest;
    $('endDiff').textContent = t('diff_' + G.diff); $('endDiff').className = 'difftag ' + G.diff;
    $('endKills').textContent = fmt(G.kills);
    $('endCombo').textContent = G.maxCombo;
    $('endLv').textContent = G.p.level;
    $('endDex').textContent = Save.count() + ' / 40';
    this.hud(false); this.show('ending');
  },
  syncMute() { const label = Sound.muted ? t('soundOff') : t('soundOn'); $('muteBtn').textContent = label; $('muteBtn2').textContent = label; },
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
  syncDiff();
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
      b.setAttribute('aria-label', t('stageAria', { n: i + 1, boss: STAGES[i].boss ? t('bossTag') : '', locked: b.disabled ? t('locked') : '' }));
      b.onclick = () => { $('sel').hidden = true; startGame(i); };
      row.appendChild(b);
    }
    box.appendChild(row);
  });
  // 엔딩을 본 적이 있으면 무한 모드로 바로 시작 (31스테이지, 업그레이드 자동 보급)
  if (Save.anyCleared()) {
    const b = document.createElement('button');
    b.className = 'stg endless'; b.textContent = t('selEndless');
    b.onclick = () => { $('sel').hidden = true; startGame(STORY); };
    const row = document.createElement('div'); row.className = 'world'; row.appendChild(b); box.appendChild(row);
  }
  $('sel').hidden = false;
}

// ---- 도감 (만나지 않은 해충은 실루엣) ----
function openDex() {
  const g = $('dexGrid'); g.innerHTML = '';
  [...BUG_ORDER, ...BOSS_ORDER].forEach(key => {
    const [nm, kind, desc] = INFO[key], boss = !!BOSSES[key], seen = Save.seen(key), d = document.createElement('div');
    d.className = 'dexcard' + (boss ? ' boss' : '') + (seen ? '' : ' unknown');
    d.innerHTML = `${boss ? '<div class="tag">BOSS</div>' : ''}<canvas data-k="${key}" data-seen="${seen ? 1 : 0}"></canvas>` +
      `<b>${seen ? nm : '???'}</b><em>${seen ? kind : `STAGE ${firstStage(key)}`}</em><p>${seen ? desc : t('unknownWhere', { n: firstStage(key) })}</p>`;
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

// ---- 언어 ----
function syncLang() { $('langBtn').textContent = '🌐 ' + LANGS[I18n.lang]; UI.syncMute(); syncDiff(); }

// ---- 난이도 ----
function syncDiff() {
  // 엔딩까지 깬 난이도에는 👑
  document.querySelectorAll('#diffSel button').forEach(b => { b.setAttribute('aria-checked', b.dataset.d === DIFF); b.textContent = t('diff_' + b.dataset.d) + (Save.isCleared(b.dataset.d) ? ' 👑' : ''); });
  $('diffDesc').textContent = t('diffDesc_' + DIFF);
  $('bestT').textContent = fmt(Best.get());
}
function openLang() {
  const box = $('langs'); box.innerHTML = '';
  for (const [code, label] of Object.entries(LANGS)) {
    const b = document.createElement('button');
    b.textContent = label; b.lang = code; b.setAttribute('aria-pressed', code === I18n.lang);
    b.onclick = () => { I18n.set(code, true); loadFonts(); syncLang(); $('langSel').hidden = true; Sound.play('select'); };
    box.appendChild(b);
  }
  $('langSel').hidden = false;
}
function loadFonts() {
  if (!document.fonts) return;
  const f = I18n.font();
  document.fonts.load('20px ' + f.display).then(() => document.fonts.load('20px ' + f.body)).catch(() => {});
}

// ---- 랭킹 ----
function openRank(period, diff) { Ranking.open(period, diff); }

// ---- 이벤트 ----
$('startBtn').onclick = () => startGame(0);
// 게임 오버 뒤 다시 시작은 쉬는 지점이라 전면 광고 차례인지 확인한다 (ads.js AdPolicy)
$('retryBtn').onclick = () => Ads.atBreak(() => startGame(G.endless ? STORY : G.stage));
$('restartBtn').onclick = () => Ads.atBreak(() => startGame(0));
// 광고 보고 부활: 끝까지 보면 그 자리에서 이어서
$('reviveBtn').onclick = async () => {
  const btn = $('reviveBtn');
  btn.disabled = true;
  if (await Ads.rewarded()) {
    UI.show(null); UI.hud(true);
    revive();
  } else {
    btn.textContent = t('reviveFail');
  }
};
$('homeBtn').onclick = toTitle;
$('endlessBtn').onclick = () => { Sound.play('select'); continueEndless(); };
$('endBragBtn').onclick = () => Share.brag();
$('endHomeBtn').onclick = toTitle;
$('quitBtn').onclick = () => { $('pause').hidden = true; toTitle(); };
$('resumeBtn').onclick = () => UI.togglePause();
$('pauseBtn').onclick = () => UI.togglePause();
$('bombBtn').addEventListener('pointerdown', e => { e.preventDefault(); useBomb(); });
$('selBtn').onclick = () => { Sound.init(); Sound.play('select'); openSelect(); };
$('selClose').onclick = () => { $('sel').hidden = true; };
$('dexBtn').onclick = () => { Sound.init(); Sound.play('select'); openDex(); };
$('dexClose').onclick = () => { $('dex').hidden = true; };
$('rankBtn').onclick = () => { Sound.init(); Sound.play('select'); openRank('daily', DIFF); };
$('ovRankBtn').onclick = () => openRank('daily', G.diff);
document.querySelectorAll('#rankDiff button').forEach(b => { b.onclick = () => openRank(null, b.dataset.d); });
document.querySelectorAll('#diffSel button').forEach(b => { b.onclick = () => { setDiff(b.dataset.d); syncDiff(); Sound.init(); Sound.play('select'); }; });
$('rankClose').onclick = () => { $('rank').hidden = true; };
document.querySelectorAll('#rankTabs button').forEach(b => { b.onclick = () => openRank(b.dataset.p); });
$('bragBtn').onclick = () => Share.brag();
$('inviteBtn').onclick = () => Share.invite();
$('langBtn').onclick = () => { Sound.init(); Sound.play('select'); openLang(); };
$('langClose').onclick = () => { $('langSel').hidden = true; };
$('muteBtn').onclick = $('muteBtn2').onclick = () => { Sound.init(); Sound.toggleMute(); UI.syncMute(); };
addEventListener('pointerdown', () => { Sound.init(); if (G.state === 'title') Sound.music('title'); }, { once: true });
// 다른 앱으로 나가면 게임은 일시정지, 소리는 멈춤 (광고 화면이 떠 있을 때는 ads.js 가 소리를 다시 켬)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (G.state === 'play') UI.togglePause(); else Sound.suspend(); }
  else if (G.state !== 'paused' && G.state !== 'ad') Sound.resume();
});
// 안드로이드 뒤로 가기 (앱에서만): 열린 창 닫기 → 게임 중이면 일시정지/계속 → 결과 화면이면 타이틀 → 타이틀이면 앱 종료
const NativeApp = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
if (NativeApp) NativeApp.addListener('backButton', () => {
  const open = ['dex', 'sel', 'rank', 'langSel'].find(id => !$(id).hidden);
  if (open) $(open).hidden = true;
  else if (G.state === 'play' || G.state === 'paused') UI.togglePause();
  else if (G.state === 'over' || G.state === 'ending') toTitle();
  else if (G.state === 'title') NativeApp.exitApp();
});

// ---- 메인 루프 ----
let lastT = performance.now(), bombShown = -1;
function frame(now) {
  const dt = Math.min(0.033, (now - lastT) / 1000); lastT = now;
  // 오류가 하나 나도 게임 루프가 멈추지 않게 (멈추면 화면이 얼어붙음)
  try {
    if (G.state === 'play' || G.state === 'over' || G.state === 'title') update(dt);
    Render.draw();
    if (!$('title').hidden) drawHero(now / 1000);
    if (!$('dex').hidden) drawDex(now / 1000);
    if (G.p && G.p.bombs !== bombShown) { bombShown = G.p.bombs; $('bombN').textContent = bombShown; $('bombBtn').classList.toggle('empty', bombShown <= 0); }
  } catch (e) { console.error('frame error', e); }
  requestAnimationFrame(frame);
}

I18n.bind();
Render.init();
I18n.set(I18n.detect());
setupInput($('game'));
toTitle();
syncLang();
Ads.init();
loadFonts();
requestAnimationFrame(frame);
