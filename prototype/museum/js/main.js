// 시작 · 타이틀 · 게임 루프 · 방치 수입
'use strict';

const Game = (() => {
  let last = 0, spawnT = 0, slowT = 0, saveT = 0, running = false;

  function title() {
    const sc = document.getElementById('scene'); sc.innerHTML = '';
    UI.L.hud.innerHTML = '';
    const t = el('div', 'titlescr', `
      <div class="tbg" style="background-image:url(${A('bg/title_museum')})"></div>
      <div class="tshade"></div>
      <div class="tlogo"><img src="${A('ui/title_emblem')}"><div class="t1">몬순 박물관</div><div class="t2">바다의 비단길 보물전</div><div class="t3">MONSOON Museum · Treasures of the Sea Silk Road</div></div>
      <div class="tbtns"></div>
      <div class="tnote">체험판 M0 · 서장 + 남해관</div>`, sc);
    const b = t.querySelector('.tbtns');
    if (State.hasSave()) btn('이어하기', '', () => { SFX.unlock(); State.load(); start(); }, b);
    btn(State.hasSave() ? '처음부터' : '시작하기', State.hasSave() ? 'paper' : '', () => { SFX.unlock(); State.wipe(); State.newGame(); start(); }, b);
  }

  function start() {
    document.getElementById('scene').innerHTML = '';
    Museum.build(); HUD.build();
    SFX.music('port');
    running = true; last = performance.now();
    if (G.story < 1) Story.prologue();
    else offline();
    requestAnimationFrame(frame);
  }

  // 앱을 꺼 둔 동안
  function offline() {
    const gone = Math.min(8 * 3600, (Date.now() - (G.lastSeen || Date.now())) / 1000);
    if (gone < 60) return;
    const vis = Math.floor(gone / State.spawnEvery() * 0.35);
    const coins = vis * State.ticket();
    if (vis < 1) return;
    G.coins += coins; G.st.visitors += vis;
    const h = Math.floor(gone / 3600), m = Math.floor(gone % 3600 / 60);
    const p = UI.panel('relic-panel', '🌙 자리를 비운 동안');
    el('p', 'center big', `${h ? h + '시간 ' : ''}${m}분 동안<br>관람객 <b>${fmt(vis)}명</b>이 다녀갔어요`, p);
    el('p', 'center coinbig', `💰 +${fmt(coins)}`, p);
    btn('모으기', '', () => { SFX.play('coin'); p.close(); HUD.update(true); }, el('div', 'row', null, p));
    State.save();
  }

  function tick(dt) {
    if (!running || !G) return;
    Visitors.update(dt);
    const canSpawn = State.shownCount() > 0 && (G.story >= 1 || (G.tut || 0) > 4);
    if (canSpawn) { spawnT += dt; if (spawnT >= State.spawnEvery()) { spawnT = 0; Visitors.spawn(); } }
    Events.update(dt);
    slowT += dt; saveT += dt;
    if (slowT > 0.5) {
      slowT = 0;
      Expedition.check();
      // 맡긴 보존처리
      for (const r of RELIC_ORDER) {
        const s = G.relics[r];
        if (s && s.st === 'raw' && s.t && State.now() >= s.t) {
          s.st = 'ready'; delete s.t; State.stat('restore'); State.addFame(1);
          UI.toast(`🔬 「${RELICS[r].name}」 보존처리 끝! 전시할 수 있어요`, 'good'); SFX.play('stamp'); Museum.badges();
        }
      }
      HUD.update(); HUD.tabs();
    }
    if (saveT > 10) { saveT = 0; State.save(); }
  }
  function frame(t) {
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    tick(dt);
    requestAnimationFrame(frame);
  }
  return { title, start, tick };
})();

(async function boot() {
  try { MAN = window.MANIFEST || await (await fetch('assets/manifest.json')).json(); } catch (e) { document.getElementById('boot').textContent = '그림 목록을 못 읽었어요.'; return; }
  UI.init(); fitStage();
  window.addEventListener('resize', fitStage);
  window.addEventListener('beforeunload', () => State.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) State.save(); });
  document.getElementById('boot').style.opacity = 0;
  setTimeout(() => document.getElementById('boot').remove(), 600);
  Game.title();
  // 디버그: 숨은 창 테스트용 (rAF 가 멈출 때 직접 돌림), 시간 건너뛰기
  window.step = (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) Game.tick(dt); };
  window.skip = sec => { G.tOff += sec * 1000; };
  window.G_ = () => G;
})();
