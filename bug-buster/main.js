// 은하 방역대 - 화면 전환 / UI / 메인 루프
const $ = id => document.getElementById(id);

const DEX = [
  ['mosquito', '삐용이', '모기', '지그재그로 날아다니며 가끔 침을 쏜다. 가장 흔한 해충.'],
  ['fly', '윙윙', '똥파리', '편대를 짜고 몰려온다. 줄지어 오면 한 번에 쓸어버리자.'],
  ['ladybug', '점박이 탱크', '무당벌레', '단단한 등껍질. 멈춰 서서 부채꼴로 탄을 뿌린다.'],
  ['firefly', '번쩍이', '반딧불', '꽁무니가 밝아지면 곧 나를 향해 돌진한다!'],
  ['spider', '실타래', '독거미', '실에 매달려 내려와 원형 탄막을 펼친다.'],
  ['roach', '쌩쌩이', '바퀴벌레', '떼로 몰려와 엄청 빠르게 달린다. 벽에 튕긴다.'],
  ['beetle', '뿔돌이', '장수풍뎅이', '엄청 단단한 정예. 정확한 3연발 조준탄.'],
  ['queen', '비비 퀸', 'STAGE 1 보스', '벌집 성운의 여왕. 나선 탄막과 독침 부채, 모기 호위대를 부른다.', true],
  ['tarantula', '타란툴라 마담', 'STAGE 2 보스', '소행성대에 거미줄을 친 장본인. 회전 탄막과 끈끈한 거미줄 탄.', true],
  ['emperor', '로치 엠퍼러', 'STAGE 3 보스', '바퀴 행성의 황제. 빨간 경고선이 보이면 돌진이 온다. 피해라!', true],
];

const UI = {
  screens: ['title', 'dex', 'lv', 'pause', 'over'],
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
    $('ovStage').textContent = `${G.loop ? G.loop + 1 + '회차 ' : ''}${STAGES[G.stage].title}`;
    $('ovKills').textContent = G.kills.toLocaleString();
    $('ovCombo').textContent = G.maxCombo;
    $('ovLv').textContent = G.p.level;
    this.hud(false); this.show('over');
  },
  syncMute() { const t = Sound.muted ? '소리 꺼짐' : '소리 켜짐'; $('muteBtn').textContent = t; $('muteBtn2').textContent = t; },
};

function startGame() {
  Sound.init(); Sound.resume(); Sound.play('start');
  G.parts = []; G.items = []; G.texts = []; G.pb = [];
  newGame();
  UI.show(null); UI.hud(true);
}
function toTitle() {
  G.state = 'title'; G.p = null; G.boss = null; G.phase = 'waves';
  Sound.resume(); Render.makeSky(STAGES[0]); Sound.music('title');
  $('bestT').textContent = BEST.toLocaleString();
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
  put(Art.ladybug, 248, 52 + bob(1), 1.7);
  put(Art.mosquito, 108, 28 + bob(2), 1.4);
  put(Art.firefly, 196, 26 + bob(3), 1.5);
  put(Art.roach, 30, 120 + bob(4), 1.3, -0.6);
  put(Art.beetle, 272, 128 + bob(5), 1.3);
  put(Art.fly, 210, 92 + bob(6), 1.2);
  put(Art.player, 150, 160 + bob(1, 3), 2.2);
}

// ---- 도감 ----
function openDex() {
  const g = $('dexGrid'); g.innerHTML = '';
  DEX.forEach(([key, nm, kind, desc, boss]) => {
    const d = document.createElement('div');
    d.className = 'dexcard' + (boss ? ' boss' : '');
    d.innerHTML = `${boss ? '<div class="tag">BOSS</div>' : ''}<canvas data-k="${key}"></canvas><b>${nm}</b><em>${kind}</em><p>${desc}</p>`;
    g.appendChild(d);
  });
  $('dex').hidden = false;
  g.querySelectorAll('canvas').forEach(cv => { cv.width = cv.clientWidth * 2; cv.height = cv.clientHeight * 2; });
}
function drawDex(t) {
  $('dexGrid').querySelectorAll('canvas').forEach(cv => {
    const c = cv.getContext('2d'), k = cv.dataset.k, boss = !!BOSSES[k];
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    const s = boss ? cv.height / 150 : cv.height / 46;
    c.translate(cv.width / 2, cv.height / 2 + (boss ? 0 : -2)); c.scale(s, s);
    Art[k](c, t, { dashing: false });
  });
}

// ---- 이벤트 ----
$('startBtn').onclick = startGame;
$('retryBtn').onclick = startGame;
$('homeBtn').onclick = toTitle;
$('quitBtn').onclick = () => { $('pause').hidden = true; toTitle(); };
$('resumeBtn').onclick = () => UI.togglePause();
$('pauseBtn').onclick = () => UI.togglePause();
$('bombBtn').addEventListener('pointerdown', e => { e.preventDefault(); useBomb(); });
$('dexBtn').onclick = () => { Sound.init(); Sound.play('select'); openDex(); };
$('dexClose').onclick = () => { $('dex').hidden = true; };
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
