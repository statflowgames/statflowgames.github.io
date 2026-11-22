// 🆕 2026-11-22 휴대폰 '완전히 멈춤' 진단 (빨간 오류 줄 없이 멈추는 경우)
//   - 상자 깨기·아이템 떨구기처럼 드문 동작에 들어가고 나올 때 표시를 남긴다 → 끝나지 않은 채 멈췄으면 다음에 열 때 알려 준다
//   - 그래픽(WebGL)이 꺼지는 경우(휴대폰 그래픽 메모리 부족)도 기록한다
//   - 2초마다 지금 장면·주인공 상태를 남긴다
const SMDiag = {
  KEY: 'seventhmoon.trace',
  stack: [], hb: null,
  save(extra) { try { localStorage.setItem(this.KEY, JSON.stringify({ t: Date.now(), stack: this.stack.slice(-8), hb: this.hb, ...extra })); } catch (e) { /* 무시 */ } },
  wrap(obj, name, label, skip) {
    const f = obj && obj[name];
    if (typeof f !== 'function' || f.__diag) return;
    const self = this;
    const w = function (...a) {
      if (skip && skip(a)) return f.apply(this, a);
      self.stack.push(typeof label === 'function' ? label(a) : (label || name));
      self.save();
      try { return f.apply(this, a); } finally { self.stack.pop(); if (!self.stack.length) self.save({ ok: 1 }); }
    };
    w.__diag = true; obj[name] = w;
  },
  // 지난번 기록에 '끝나지 않은 동작'이나 '그래픽 꺼짐'이 있으면 화면 위에 알려 준다
  report() {
    let d = null; try { d = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e) { d = null; }
    if (!d || (!d.stack.length && !d.lost)) return;
    const hb = d.hb ? ` · ${d.hb.stage || ''} ${d.hb.hero || ''} ${d.hb.state || ''}/${d.hb.anim || ''}` : '';
    const what = d.lost ? '그래픽(WebGL)이 꺼짐 — 휴대폰 그래픽 메모리 부족일 수 있어요' : `끝나지 않은 동작: ${d.stack.join(' > ')}`;
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
    setInterval(() => {
      try {
        const sc = g && g.scene && g.scene.getScene('game');
        const on = sc && g.scene.isActive('game');
        this.hb = on ? { stage: sc.cfg && sc.cfg.stage, hero: sc.hero && sc.hero.key, state: sc.hero && sc.hero.state, anim: sc.hero && sc.hero.anim, at: Date.now() } : { stage: (g.scene.getScenes(true)[0] || {}).sys?.settings.key, at: Date.now() };
        if (!this.stack.length) this.save({ ok: 1 });
      } catch (e) { /* 무시 */ }
    }, 2000);
    this.report();
  },
};
SMDiag.install();
