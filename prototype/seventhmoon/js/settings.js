// 설정 (음량·진동·절전 모드)과 앱 저장소(Capacitor Preferences) 연결
const Settings = {
  KEY: 'seventhmoon.settings',
  d: { music: 0.8, sfx: 1, vib: true, low: false, btnSize: 1, btnAlpha: 1, autoFade: true },
  load() { try { Object.assign(this.d, JSON.parse(localStorage.getItem(this.KEY) || '{}')); } catch (e) { /* 기본값 */ } return this; },
  save() { try { const t = JSON.stringify(this.d); localStorage.setItem(this.KEY, t); NativeStore.mirror(this.KEY, t); } catch (e) { /* 무시 */ } this.apply(); },
  apply() {
    SFX.setVolume(this.d.music, this.d.sfx);
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
  keys: ['seventhmoon.save.v1', 'seventhmoon.unlock', 'seventhmoon.settings'],
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

// 설정 창 (어느 장면에서든 띄울 수 있다)
function openSettings(scene, onClose) {
  const c = scene.add.container(0, 0).setDepth(9800).setScrollFactor(0);
  const draw = () => {
    c.removeAll(true);
    c.add(UI.blocker(scene, 0.75).setScrollFactor(0));
    c.add(UI.panel(scene, W / 2 - 320, 40, 640, 660));
    c.add(UI.text(scene, W / 2, 82, '설정', 38, '#ffe7a8', { serif: true }).setOrigin(0.5));
    const d = Settings.d;
    const row = (y, label, val, minus, plus) => {
      c.add(UI.text(scene, W / 2 - 260, y, label, 26, '#f4e4c0').setOrigin(0, 0.5));
      c.add(UI.button(scene, W / 2 + 60, y, '－', minus, { w: 64, h: 52, size: 28, col: 0x3a2a1a }));
      c.add(UI.text(scene, W / 2 + 150, y, val, 26, '#fff', { bold: true }).setOrigin(0.5));
      c.add(UI.button(scene, W / 2 + 240, y, '＋', plus, { w: 64, h: 52, size: 28, col: 0x3a2a1a }));
    };
    const step = (k, v) => { d[k] = Math.round(Phaser.Math.Clamp(d[k] + v, 0, 1) * 10) / 10; Settings.save(); draw(); if (k === 'sfx') SFX.go(); };
    row(140, '음악', Math.round(d.music * 100) + '%', () => step('music', -0.1), () => step('music', 0.1));
    row(205, '효과음', Math.round(d.sfx * 100) + '%', () => step('sfx', -0.1), () => step('sfx', 0.1));
    const tog = (y, label, k, desc) => {
      c.add(UI.text(scene, W / 2 - 260, y, label, 26, '#f4e4c0').setOrigin(0, 0.5));
      c.add(UI.button(scene, W / 2 + 150, y, d[k] ? '켜짐' : '꺼짐', () => { d[k] = !d[k]; Settings.save(); if (k === 'vib' && d.vib) vibrate(40); draw(); }, { w: 190, h: 52, size: 22, col: d[k] ? 0x2a5a3a : 0x3a2a1a }));
      if (desc) c.add(UI.text(scene, W / 2 - 260, y + 30, desc, 15, '#b8a890'));
    };
    tog(270, '진동', 'vib');
    tog(335, '절전 모드', 'low', '30프레임, 파편과 이펙트를 줄여 배터리와 발열을 아껴요');
    // 전투 버튼
    const relayout = () => { if (scene.layoutTouchControls && scene.btns) scene.layoutTouchControls(); };
    const cyc = (y, label, k, names) => row(y, label, names[d[k] ?? 1],
      () => { d[k] = Math.max(0, (d[k] ?? 1) - 1); Settings.save(); relayout(); draw(); },
      () => { d[k] = Math.min(names.length - 1, (d[k] ?? 1) + 1); Settings.save(); relayout(); draw(); });
    cyc(425, '버튼 크기', 'btnSize', ['작게', '보통', '크게']);
    cyc(490, '버튼 진하기', 'btnAlpha', ['옅게', '보통', '진하게']);
    tog(555, '자동 투명', 'autoFade', '버튼 뒤에 캐릭터나 몬스터가 오면 버튼이 투명해져요');
    c.add(UI.button(scene, W / 2, 652, '닫기', () => { c.destroy(); if (onClose) onClose(); }, { w: 200, h: 52, size: 22 }));
    c.each(o => o.setScrollFactor && o.setScrollFactor(0));
  };
  draw();
  return c;
}
