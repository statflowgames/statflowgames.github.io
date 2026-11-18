// 시작: 화면 맞추기 · 그림 불러오기 · 타이틀 · 주인공 고르기 · 장면 전환
'use strict';

// Phaser 가 쓰는 그림만 미리 불러옴 (나머지 인물·배경은 DOM 이 필요할 때 불러옴)
const PHASER_KEYS = ['bg/sky_day', 'bg/title_keyart', 'map/paper', 'map/sea', 'mapicon/nanhai', 'sea/sea_far_nanhai', 'sea/sea_near_calm',
  ...['perahu', 'dhow_s', 'kunlun', 'pirate_s'].flatMap(k => ['ship/' + k, 'ship/' + k + '_damaged']),
  ...['perahu', 'dhow_s', 'kunlun'].map(k => 'shipicon/' + k),
  ...['compass', 'serpent', 'whale', 'turtle', 'birds', 'fish', 'coral', 'waves'].map(k => 'mapdeco/' + k),
  ...['arrows', 'fire_arrow', 'naphtha', 'splash', 'splinters', 'hook', 'smoke', 'sail_fire', 'whirlpool'].map(k => 'fx/' + k)];

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    for (const k in MAN) {
      if (PHASER_KEYS.includes(k)) this.load.image(k, MAN[k].url);
    }
    this.load.on('progress', v => { document.getElementById('boot').textContent = `바람을 기다리는 중… ${Math.round(v * 100)}%`; });
  }
  create() {
    // 안개 지우개 (부드러운 원), 물보라 점
    const c = this.textures.createCanvas('fogbrush', 480, 480), x = c.getContext();
    const g = x.createRadialGradient(240, 240, 60, 240, 240, 240);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 480, 480); c.refresh();
    const d = this.textures.createCanvas('dot', 16, 16), y = d.getContext();
    y.fillStyle = '#ffffff'; y.beginPath(); y.arc(8, 8, 6, 0, Math.PI * 2); y.fill(); d.refresh();
    const b = document.getElementById('boot'); b.style.opacity = 0; setTimeout(() => b.remove(), 700);
    Game.toTitle();
  }
}

class BlankScene extends Phaser.Scene { constructor() { super('Blank'); } }

class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    const img = this.add.image(640, 360, 'bg/title_keyart').setDisplaySize(1280, 720);
    this.tweens.add({ targets: img, scale: img.scale * 1.06, duration: 22000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x0b1620, 0x0b1620, 0x0b1620, 0x0b1620, 0.75, 0.0, 0.75, 0.0);
    shade.fillRect(0, 0, 900, 720);
    this.add.particles(0, 0, 'dot', { x: { min: 0, max: 1280 }, y: 730, speedY: { min: -30, max: -60 }, speedX: { min: -10, max: 25 }, lifespan: 9000, scale: { min: 0.15, max: 0.4 }, alpha: { start: 0.5, end: 0 }, frequency: 260, tint: 0xffe2a0 });
  }
}

const Game = {
  game: null,
  scene(key, data) {
    const m = this.game.scene;
    for (const s of ['Title', 'Sea', 'Battle', 'Blank']) if (s !== key && m.isActive(s)) m.stop(s);
    if (key) { if (m.isActive(key)) m.getScene(key).scene.restart(data); else m.start(key, data); }
  },
  toTitle() {
    Talk.close();
    UI.clear('scene', 'hud', 'panel', 'story');
    this.scene('Title');
    SFX.music('title');
    const L = UI.L.scene; L.style.pointerEvents = 'auto';
    const t = el('div', 'title-ui', null, L);
    el('div', 'logo', `<img class="em" src="${A('ui/title_emblem')}"><div class="t1">몬순</div><div class="t2">바다의 비단길</div><div class="t3">MONSOON · THE SEA SILK ROAD · 826 AD</div>`, t);
    const m = el('div', 'menu', null, t);
    if (State.hasSave()) btn('이어서 항해', '', () => { State.load(); Game.resume(); }, m, 'icon/sail');
    btn('새 항해', State.hasSave() ? 'paper' : '', () => Game.select(), m, 'icon/map');
    el('div', 'ver', '프로토타입 M0 · 1장 「해협의 주인」 · 그림 GPT 납품본 · 소리는 임시 합성음', t);
  },
  resume() {
    if (!G.flags.prologue) return Story.prologue().then(() => Game.toPort('palembang'));
    if (PORTS[G.port]) Game.toPort(G.port); else Game.toSea();
  },
  select() {
    UI.clear('scene');
    const L = UI.L.scene;
    const s = el('div', 'select fadein', '<h2>누구의 이야기로 시작할까요?</h2>', L);
    const list = el('div', 'origins', null, s);
    let cur = { origin: 'malay', gender: 'f' };
    const prev = el('div', 'preview', '<img>', s);
    const info = el('div', 'pinfo', null, s);
    const draw = () => {
      list.querySelectorAll('.origin').forEach(o => { o.classList.toggle('sel', o.dataset.o === cur.origin); o.querySelector('img').src = A(`face/pc_${o.dataset.o}_${cur.gender}_smile`); });
      const O = ORIGINS[cur.origin], key = `pc_${cur.origin}_${cur.gender}`;
      prev.firstChild.src = A('ch/' + key);
      info.innerHTML = `<div class="nm">${O[cur.gender]}</div><div>${O.name} 출신 · 고향 ${O.place} · 17세</div>`;
      const gb = el('div', 'gender', null, info);
      for (const [g, lbl] of [['m', '남'], ['f', '여']]) {
        const b = btn(lbl, cur.gender === g ? '' : 'paper', () => { cur.gender = g; draw(); }, gb);
        b.classList.add('small');
      }
      el('div', 'bonus', `${O.story}<br><b style="color:#ffd27a">시작 보너스</b> ${O.bonus}`, info);
      el('div', null, '<small style="color:#bfae8a">이야기의 큰 줄기는 같고, 첫 장면과 대사, 보너스가 달라요.</small>', info);
      const st = btn('이 사람으로 시작', 'start', async () => {
        State.newGame(cur.origin, cur.gender, O[cur.gender]);
        UI.clear('scene');
        await Story.prologue();
        Game.toPort('palembang');
      }, info, 'icon/sail');
    };
    for (const o in ORIGINS) {
      const O = ORIGINS[o];
      const it = el('div', 'origin', `<img src="${A(`face/pc_${o}_${cur.gender}_smile`)}"><div><b>${O.name}</b><span>${O.place} · ${O.m} / ${O.f}</span></div>`, list);
      it.dataset.o = o;
      it.onclick = () => { SFX.play('click'); cur.origin = o; draw(); };
    }
    const back = btn('← 타이틀', 'paper small', () => Game.toTitle(), s);
    back.style.cssText += ';position:absolute;left:24px;bottom:20px';
    draw();
  },
  toPort(id) {
    UI.clear('scene', 'panel');
    Port.enter(id);
  },
  toSea(resume) {
    UI.clear('scene', 'panel');
    Talk.close();
    State.save();
    this.scene('Sea', { resume });
  },
  toBattle(foe, onEnd) {
    Talk.close();
    UI.clear('scene', 'panel');
    this.scene('Battle', { foe, onEnd });
  },
};

// ---------- 화면 맞추기 ----------
function fitStage() {
  const st = document.getElementById('stage');
  const W = window.innerWidth, H = window.innerHeight;
  const s = Math.min(W / 1280, H / 720);
  st.style.transform = `translate(${(W - 1280 * s) / 2}px, ${(H - 720 * s) / 2}px) scale(${s})`;
  if (Game.game) Game.game.scale.refresh();
}

(async function start() {
  try { MAN = await (await fetch('assets/manifest.json')).json(); } catch (e) { document.getElementById('boot').textContent = '그림 목록을 못 읽었어요.'; return; }
  UI.init();
  fitStage();
  window.addEventListener('resize', fitStage);
  Game.game = new Phaser.Game({
    type: Phaser.WEBGL, width: 1280, height: 720, parent: 'game', backgroundColor: '#0d1a26',
    scale: { mode: Phaser.Scale.NONE },
    scene: [BootScene, TitleScene, SeaScene, BattleScene, BlankScene],
  });
  setTimeout(fitStage, 50);
  window.G_ = () => G;   // 디버그용
  // 숨은 미리보기 창에서 rAF가 멈출 때 프레임을 직접 돌리는 디버그 도구
  window.step = async (n = 1, dt = 16.6) => { window._t = Math.max(window._t || 0, performance.now()); for (let i = 0; i < n; i++) { window._t += dt; Game.game.step(window._t, dt); if (i % 20 === 19) await new Promise(r => setTimeout(r, 0)); } };
})();
