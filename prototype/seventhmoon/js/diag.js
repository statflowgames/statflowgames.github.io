// 🆕 2026-11-22 휴대폰 '완전히 멈춤' 진단 (빨간 오류 줄 없이 멈추는 경우)
//   - 상자 깨기·아이템 떨구기처럼 드문 동작에 들어가고 나올 때 표시를 남긴다 → 끝나지 않은 채 멈췄으면 다음에 열 때 알려 준다
//   - 그래픽(WebGL)이 꺼지는 경우(휴대폰 그래픽 메모리 부족)도 기록한다
//   - 2초마다 지금 장면·주인공 상태를 남긴다
const SMDiag = {
  KEY: 'seventhmoon.trace',
  stack: [], hb: null, hist: [], clean: 0,
  save(extra) { try { localStorage.setItem(this.KEY, JSON.stringify({ t: Date.now(), stack: this.stack.slice(-8), hb: this.hb, hist: this.hist.slice(-8), clean: this.clean, ...extra })); } catch (e) { /* 무시 */ } },
  note(x) { this.hist.push(x + '@' + Math.round(performance.now() / 100) / 10); if (this.hist.length > 12) this.hist.shift(); },
  // 🆕 2026-11-23 그 자리에서 바로 빨간 상자를 띄운다 (멈춤을 감지한 순간)
  live(what) {
    try { localStorage.setItem('seventhmoon.lastFreeze', what); } catch (e) { /* 무시 */ }
    if (document.getElementById('sm-live')) return;
    const box = document.createElement('div'); box.id = 'sm-live';
    box.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:#7a1010;color:#fff;font:13px/1.45 sans-serif;padding:10px 12px;border-radius:8px;box-shadow:0 2px 10px #0008;word-break:break-all';
    box.textContent = '멈춤 감지 (이 화면을 찍어서 알려 주세요) — ' + what + '  [눌러서 닫기]';
    box.onclick = () => box.remove();
    document.body.appendChild(box);
  },
  state(sc) {
    const h = sc && sc.hero;
    if (!h) return '';
    return `${sc.cfg && sc.cfg.stage} ${h.key} ${h.state}/${h.anim || ''} hp${Math.round(h.hp)} x${Math.round(h.x)} 몹${sc.monsters.filter(m => !m.dead).length} 줍기${sc.pickups.length} 웨이브${sc.waveIdx}${sc.lock ? '잠김' : ''}${sc.cine ? ' 대사중' : ''}${sc.paused ? ' 일시정지' : ''} 멈춤${Math.round(sc.hitstop || 0)} 느림${Math.round(sc.slowmo || 0)} 로딩${sc.load && sc.load.isLoading() ? 'O' : 'X'}`;
  },
  wrap(obj, name, label, skip) {
    const f = obj && obj[name];
    if (typeof f !== 'function' || f.__diag) return;
    const self = this;
    const w = function (...a) {
      if (skip && skip(a)) return f.apply(this, a);
      const lb = typeof label === 'function' ? label(a) : (label || name);
      self.stack.push(lb); self.note(lb);
      self.save();
      try { return f.apply(this, a); } finally { self.stack.pop(); if (!self.stack.length) self.save({ ok: 1 }); }
    };
    w.__diag = true; obj[name] = w;
  },
  // 지난번 기록에 '끝나지 않은 동작'이나 '그래픽 꺼짐'이 있으면 화면 위에 알려 준다
  report() {
    let d = null; try { d = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e) { d = null; }
    // ✏️ 2026-11-23 전투 중에 '정상적으로 나가지 않고' 끝난 경우(먹통이 돼서 닫음·휴대폰이 탭을 강제로 닫음)도 알린다
    const died = d && !d.clean && d.hb && d.hb.stage && d.hb.fight;
    if (!d || (!d.stack.length && !d.lost && !died)) return;
    const hb = d.hb ? ` · ${d.hb.desc || `${d.hb.stage || ''} ${d.hb.hero || ''} ${d.hb.state || ''}/${d.hb.anim || ''}`}` : '';
    const what = d.lost ? '그래픽(WebGL)이 꺼짐 — 휴대폰 그래픽 메모리 부족일 수 있어요'
      : d.stack.length ? `끝나지 않은 동작: ${d.stack.join(' > ')}`
      : `전투 중에 게임이 갑자기 끝남 (먹통 또는 휴대폰이 탭을 닫음)${d.mem ? ' · 메모리 ' + d.mem : ''} · 최근: ${(d.hist || []).join(', ')}`;
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:#7a1010;color:#fff;font:14px/1.5 sans-serif;padding:10px 12px;border-radius:8px;box-shadow:0 2px 10px #0008';
    box.textContent = `지난번에 게임이 멈춘 기록이 있어요 (이 문구를 알려 주세요) — ${what}${hb} · ${new Date(d.t).toLocaleString()}  [눌러서 닫기]`;
    box.onclick = () => box.remove();
    document.body.appendChild(box);
    try { localStorage.setItem('seventhmoon.lastFreeze', box.textContent); localStorage.removeItem(this.KEY); } catch (e) { /* 무시 */ }
  },
  install() {
    if (typeof Game !== 'undefined') {
      const P = Game.prototype;
      this.wrap(P, 'hitProp', a => 'hitProp(' + ((a[0] && (a[0].ev || (a[0].chest ? 'chest' : a[0].secret ? 'secret' : a[0].n))) || '?') + ')');
      this.wrap(P, 'dropPickup', a => 'drop(' + a[2] + ')', a => a[2] === 'coin');
      this.wrap(P, 'spawnDebrisAt', 'debris');
      this.wrap(P, 'secretFound', 'secretFound');
      this.wrap(P, 'result', a => 'result(' + (a[0] ? 'win' : 'lose') + ')');
    }
    if (typeof StageEvents !== 'undefined') this.wrap(StageEvents, 'onProp', 'event.onProp');
    for (const fn of ['rollDrop', 'makeItem', 'makeStoryGear', 'applyGive']) if (typeof window[fn] === 'function') this.wrap(window, fn, fn);
    if (typeof SFX !== 'undefined') { this.wrap(SFX, 'brk', 'sfx.brk'); }
    // 그래픽 꺼짐 + 2초마다 상태
    const g = window.game;
    const hook = () => {
      if (!g || !g.canvas) return setTimeout(hook, 500);
      g.canvas.addEventListener('webglcontextlost', () => { this.save({ lost: 1 }); try { localStorage.setItem('seventhmoon.lastError', JSON.stringify({ t: new Date().toISOString(), msg: 'webglcontextlost' })); } catch (e) { /* 무시 */ } }, false);
    };
    hook();
    // 정상적으로 화면을 떠나면 표시 (다른 앱으로 전환·탭 닫기) → 다음에 열 때 '갑자기 끝남'으로 잘못 알리지 않게
    const mark = c => { this.clean = c; this.save(this.stack.length ? {} : { ok: 1 }); };
    document.addEventListener('visibilitychange', () => mark(document.hidden ? 1 : 0));
    addEventListener('pagehide', () => mark(1));
    let lastFrame = -1, frameSame = 0, lastNow = -1, nowSame = 0, stuckKey = '', stuckT = 0;
    const FREE = ['idle', 'move', 'guard', 'dead', 'win'];
    setInterval(() => {
      try {
        const sc = g && g.scene && g.scene.getScene('game');
        const on = sc && g.scene.isActive('game');
        const fight = !!(on && sc.hero && !sc.won && !sc.lost);
        const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : '';
        this.hb = on ? { stage: sc.cfg && sc.cfg.stage, hero: sc.hero && sc.hero.key, state: sc.hero && sc.hero.state, anim: sc.hero && sc.hero.anim, fight, desc: this.state(sc), at: Date.now() } : { stage: (g.scene.getScenes(true)[0] || {}).sys?.settings.key, at: Date.now() };
        if (!this.stack.length) this.save({ ok: 1, mem });
        if (document.hidden) { frameSame = nowSame = stuckT = 0; return; }
        // ① 화면 그리기가 멈춤 (게임 루프가 돌지 않음)
        const f = g.loop && g.loop.frame;
        frameSame = f === lastFrame ? frameSame + 1 : 0; lastFrame = f;
        if (frameSame === 3) this.live(`화면이 멈춤 (게임 루프 정지) · ${this.state(sc)} · 최근: ${this.hist.join(', ')}`);
        if (!fight) { nowSame = stuckT = 0; return; }
        // ② 화면은 돌지만 전투 시간이 멈춤 (대사·일시정지 아닌데)
        nowSame = !sc.paused && !sc.cine && sc.now === lastNow ? nowSame + 1 : 0; lastNow = sc.now;
        if (nowSame === 3) this.live(`전투 시간이 멈춤 · ${this.state(sc)} · 최근: ${this.hist.join(', ')}`);
        // ③ 주인공이 한 동작에 갇힘 (공격·피격 등이 8초 넘게 안 끝남)
        const h = sc.hero, key = h.state + '/' + h.anim;
        if (sc.paused || sc.cine || FREE.includes(h.state) || key !== stuckKey) { stuckKey = key; stuckT = 0; }
        else if ((stuckT += 1) === 8) this.live(`주인공이 동작에 갇힘: ${key} (st ${Math.round(h.st || 0)}) · ${this.state(sc)} · 최근: ${this.hist.join(', ')}`);
      } catch (e) { /* 무시 */ }
    }, 1000);
    this.report();
  },
};
SMDiag.install();
