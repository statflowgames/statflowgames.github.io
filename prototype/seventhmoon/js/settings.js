// 설정 (음량·진동·절전 모드)과 앱 저장소(Capacitor Preferences) 연결
const Settings = {
  KEY: 'seventhmoon.settings',
  d: { music: 0.8, sfx: 1, voice:.8, vib: true, low: false, btnAlpha: 1, autoFade: true, cine: true },
  load() { try { Object.assign(this.d, JSON.parse(localStorage.getItem(this.KEY) || '{}')); } catch (e) { /* 기본값 */ } return this; },
  save() { try { const t = JSON.stringify(this.d); localStorage.setItem(this.KEY, t); NativeStore.mirror(this.KEY, t); } catch (e) { /* 무시 */ } this.apply(); },
  apply() {
    SFX.setVolume(this.d.music, this.d.sfx,this.d.voice);
    if (window.game && game.loop) game.loop.fpsLimit = this.d.low ? 30 : 0;
  },
};
Settings.load();

// 진동 (앱에서는 Capacitor Haptics, 웹에서는 navigator.vibrate)
function vibrate(ms = 30) {
  if (!Settings.d.vib) return;
  try {
    const H = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Haptics;
    if (H) H.impact({ style: ms > 60 ? 'HEAVY' : 'LIGHT' });
    else if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) { /* 진동 없음 */ }
}

// 앱 저장소: localStorage를 쓰면서 Preferences에도 같은 값을 적어 둔다.
// 앱을 지웠다 깔거나 웹뷰 저장소가 비워져도 Preferences에서 되살린다.
const NativeStore = {
  get P() { return window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Preferences; },
  keys: ['seventhmoon.save.v1', 'seventhmoon.unlock', 'seventhmoon.settings', 'seventhmoon.owner'],   // ✏️ 2026-11-28 owner: 처음 산 사람 표시
  async restore() {
    const P = this.P; if (!P) return;
    for (const key of this.keys) {
      try {
        const { value } = await P.get({ key });
        if (value && !localStorage.getItem(key)) localStorage.setItem(key, value);
      } catch (e) { /* 무시 */ }
    }
    Settings.load();
  },
  mirror(key, value) { const P = this.P; if (P) P.set({ key, value }).catch(() => {}); },
};

// 🆕 2026-11-26 언어 고르기 — 다 된 언어(I18N.READY)만 누를 수 있고, 고르면 저장하고 새로 시작한다
function langPickOpen() { return typeof I18N !== 'undefined' && (I18N.READY.length > 1 || /[?&]lang=/.test(location.search)); }
function openLangPicker(scene) {
  const c = scene.add.container(0, 0).setDepth(9900).setScrollFactor(0);
  c.add(UI.blocker(scene, 0.8).setScrollFactor(0));
  c.add(UI.panel(scene, 60, 40, W - 120, H - 80, { alpha: 0.97 }));
  c.add(UI.text(scene, W / 2, 86, 'Language · 언어', 32, '#ffe7a8', { serif: true, bold: true, st: 6 }).setOrigin(0.5));
  const L = I18N.LANGS, cols = 4, bw = 250, bh = 50, gx = 14, gy = 12, x0 = W / 2 - (cols * bw + (cols - 1) * gx) / 2 + bw / 2;
  L.forEach((l, i) => {
    const ready = I18N.READY.includes(l), cur = l === I18N.lang;
    const b = UI.button(scene, x0 + (i % cols) * (bw + gx), 150 + Math.floor(i / cols) * (bh + gy), (cur ? '✔ ' : '') + I18N.NAMES[l], () => { if (!cur) I18N.set(l); }, { w: bw, h: bh, size: 19, col: cur ? 0x8a2a10 : ready ? 0x3a2a1a : 0x2a2622, disabled: !ready && !cur });
    // 표에 원래 이름 그대로 (번역하지 않는다)
    if (b.label) b.label.setText((cur ? '✔ ' : '') + I18N.NAMES[l]);
    c.add(b);
  });
  c.add(UI.button(scene, W / 2, H - 92, '닫기', () => c.destroy(), { w: 200, h: 52, size: 22 }));
  c.each(o => o.setScrollFactor && o.setScrollFactor(0));
}

// 설정 창 (어느 장면에서든 띄울 수 있다)
function openSettings(scene, onClose) {
  const c = scene.add.container(0, 0).setDepth(9800).setScrollFactor(0);
  const draw = () => {
    c.removeAll(true);
    c.add(UI.blocker(scene, 0.75).setScrollFactor(0));
    c.add(UI.panel(scene, W / 2 - 320, 30, 640, 680));
    c.add(UI.text(scene, W / 2, 82, '설정', 38, '#ffe7a8', { serif: true }).setOrigin(0.5));
    // 🆕 2026-11-26 언어 (두 번째 언어가 다 되면 보인다 · ?lang= 시험 중에도)
    if (langPickOpen()) c.add(UI.button(scene, W / 2 + 205, 82, '🌐 ' + (I18N.NAMES[I18N.lang] || I18N.lang), () => openLangPicker(scene), { w: 170, h: 42, size: 17, col: 0x2a3a5a }));
    const d = Settings.d;
    const row = (y, label, val, minus, plus) => {
      c.add(UI.fit(UI.text(scene, W / 2 - 260, y, label, 26, '#f4e4c0').setOrigin(0, 0.5), 300));
      c.add(UI.button(scene, W / 2 + 60, y, '－', minus, { w: 64, h: 52, size: 28, col: 0x3a2a1a }));
      c.add(UI.text(scene, W / 2 + 150, y, val, 26, '#fff', { bold: true }).setOrigin(0.5));
      c.add(UI.button(scene, W / 2 + 240, y, '＋', plus, { w: 64, h: 52, size: 28, col: 0x3a2a1a }));
    };
    const step = (k, v) => { d[k] = Math.round(Phaser.Math.Clamp(d[k] + v, 0, 1) * 10) / 10; Settings.save(); draw(); if (k === 'sfx') SFX.go(); };
    row(132, '음악', Math.round(d.music * 100) + '%', () => step('music', -0.1), () => step('music', 0.1));
    row(192, '효과음', Math.round(d.sfx * 100) + '%', () => step('sfx', -0.1), () => step('sfx', 0.1));
    row(252, '기합·괴성', Math.round(d.voice * 100) + '%', () => step('voice', -0.1), () => step('voice', 0.1));
    const tog = (y, label, k, desc) => {
      c.add(UI.fit(UI.text(scene, W / 2 - 260, y, label, 26, '#f4e4c0').setOrigin(0, 0.5), 300));
      c.add(UI.button(scene, W / 2 + 150, y, d[k] ? '켜짐' : '꺼짐', () => { d[k] = !d[k]; Settings.save(); if (k === 'vib' && d.vib) vibrate(40); draw(); }, { w: 190, h: 52, size: 22, col: d[k] ? 0x2a5a3a : 0x3a2a1a }));
      if (desc) c.add(UI.text(scene, W / 2 - 260, y + 30, desc, 15, '#b8a890'));
    };
    // ✏️ 2026-11-26 줄 간격 정리: 설명 줄이 다음 줄 이름과 겹치던 것
    tog(312, '진동', 'vib');
    tog(372, '절전 모드', 'low', '30프레임, 파편과 이펙트를 줄여 배터리와 발열을 아껴요');
    // 전투 버튼
    const cyc = (y, label, k, names) => row(y, label, names[d[k] ?? 1],
      () => { d[k] = Math.max(0, (d[k] ?? 1) - 1); Settings.save(); draw(); },
      () => { d[k] = Math.min(names.length - 1, (d[k] ?? 1) + 1); Settings.save(); draw(); });
    cyc(452, '버튼 진하기', 'btnAlpha', ['옅게', '보통', '진하게']);
    tog(512, '자동 투명', 'autoFade', '버튼 뒤에 캐릭터나 몬스터가 오면 버튼이 투명해져요');
    tog(596, '필살기·보스 연출', 'cine');   // 🆕 2026-11-24 각성기 컷인·보스 등장 연출
    c.add(UI.button(scene, W / 2, 670, '닫기', () => { c.destroy(); if (onClose) onClose(); }, { w: 200, h: 52, size: 22 }));
    c.each(o => o.setScrollFactor && o.setScrollFactor(0));
  };
  draw();
  if (typeof AppLife !== 'undefined') AppLife.modal(scene, c, () => { c.destroy(); if (onClose) onClose(); });   // 🆕 안드로이드 뒤로가기로 닫기
  return c;
}
