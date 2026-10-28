'use strict';
/* 구르미 대시 — 공통: 상수, 문구, 월드, 스킨, 저장, 소리, 입력 */
const T = 32, ROWS = 15, VH = 360;
let VW = 640;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const sign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
const approach = (v, to, d) => (v < to ? Math.min(v + d, to) : Math.max(v - d, to));
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function fmtTime(s) {
  const tt = Math.floor(s * 10), m = Math.floor(tt / 600), sec = Math.floor(tt / 10) % 60;
  return m + ':' + (sec < 10 ? '0' : '') + sec + '.' + (tt % 10);
}

// ===== 문구 =====
const STR = {
  ko: {
    title: '구르미 대시', tagline: '굴러라, 아르마딜로!', adventure: '모험', endless: '무한 질주', shop: '꾸미기',
    back: '뒤로', resume: '계속하기', retry: '다시 하기', quit: '나가기', next: '다음 스테이지', map: '지도',
    clear: '스테이지 클리어!', time: '시간', acorns: '도토리', best: '최고', newBest: '신기록!', locked: '잠김',
    paused: '일시정지', overStorm: '먹구름에 잡혔다!', overFall: '으악, 떨어졌다!', overHit: '쿵! 질주 끝', distance: '거리',
    score: '점수', bank: '모은 도토리', equip: '착용', equipped: '착용 중', need: '도토리가 부족해요',
    rotate: '가로 화면으로 돌려주세요', music: '음악', sfx: '효과음', check: '체크포인트!', shield: '방패!',
    chili: '불꽃 고추!', magnet: '도토리 자석!', starGet: '별 조각!', combo: '콤보', stormWarn: '먹구름이 쫓아온다! 달려!',
    tut1: '← → 버튼으로 달려요', tut2: '점프! 길게 누르면 더 높이', tut3: '적은 머리를 밟아요',
    tut4: '? 상자를 머리로 툭!', tut5: '구르기 버튼을 꾹 눌렀다 떼면 급발진! 가시밤도 부숴요',
    tut6: '점프 중에 구르기 = 공중 대시', worldLocked: '이전 월드를 깨면 열려요', deaths: '넘어짐',
    bestRun: '최고 기록', earned: '획득', rankS: '완벽해요!', rankA: '멋져요!', rankB: '클리어!', stars: '별 조각',
    tapStart: '화면을 눌러 시작', newWorld: '새 월드 열림!', endlessHint: '먹구름을 피해 최대한 멀리!',
    w0: '도토리 숲', w1: '노을 사막', w2: '얼음 봉우리', w3: '용암 공장', w4: '구름 왕국',
    s_classic: '구르미', s_mint: '민트', s_cherry: '벚꽃', s_night: '밤하늘', s_gold: '황금', s_rainbow: '무지개',
    lang: '한국어',
  },
  en: {
    title: 'Rolly Dash', tagline: 'Roll on, armadillo!', adventure: 'Adventure', endless: 'Endless Run', shop: 'Style',
    back: 'Back', resume: 'Resume', retry: 'Retry', quit: 'Quit', next: 'Next Stage', map: 'Map',
    clear: 'Stage Clear!', time: 'Time', acorns: 'Acorns', best: 'Best', newBest: 'New Record!', locked: 'Locked',
    paused: 'Paused', overStorm: 'The storm got you!', overFall: 'Whoops, you fell!', overHit: 'Bonk! Run over', distance: 'Distance',
    score: 'Score', bank: 'Acorns', equip: 'Equip', equipped: 'Equipped', need: 'Not enough acorns',
    rotate: 'Please rotate to landscape', music: 'Music', sfx: 'Sound', check: 'Checkpoint!', shield: 'Shield!',
    chili: 'Fire Chili!', magnet: 'Acorn Magnet!', starGet: 'Star Piece!', combo: 'Combo', stormWarn: 'The storm is coming! Run!',
    tut1: 'Use ← → to run', tut2: 'Jump! Hold for higher', tut3: 'Stomp enemies on the head',
    tut4: 'Bonk the ? box!', tut5: 'Hold Roll, then release to blast off! Breaks spiky nuts too',
    tut6: 'Roll in midair = Air Dash', worldLocked: 'Clear the previous world', deaths: 'Falls',
    bestRun: 'Best Run', earned: 'Earned', rankS: 'Perfect!', rankA: 'Great!', rankB: 'Cleared!', stars: 'Star Pieces',
    tapStart: 'Tap to start', newWorld: 'New world unlocked!', endlessHint: 'Outrun the storm!',
    w0: 'Acorn Woods', w1: 'Sunset Desert', w2: 'Frost Peaks', w3: 'Lava Works', w4: 'Cloud Kingdom',
    s_classic: 'Rolly', s_mint: 'Mint', s_cherry: 'Blossom', s_night: 'Night Sky', s_gold: 'Golden', s_rainbow: 'Rainbow',
    lang: 'English',
  },
};
let LANG = (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
const t = k => (STR[LANG] && STR[LANG][k] != null ? STR[LANG][k] : STR.en[k] != null ? STR.en[k] : k);

// ===== 월드 색과 성질 =====
const WORLDS = [
  { kind: 'forest', sky: ['#5fc0ff', '#d6f3ff'], far: '#a5d9bb', mid: '#78c28e', near: '#4c9c5e', ground: '#9a6237', groundDark: '#74472a', dots: '#b5794a', top: '#66d653', topDark: '#3f9b35', stone: '#8f93a3', pit: '#3b8fd6', sun: '#fff6b0', bpm: 138, key: 60 },
  { kind: 'desert', sky: ['#ff9a5c', '#ffe1a6'], far: '#f2b47e', mid: '#e0935a', near: '#c47540', ground: '#d49b56', groundDark: '#b07738', dots: '#e8b979', top: '#f7de8e', topDark: '#d8b862', stone: '#b98a5c', pit: '#c49a52', sun: '#fff2c2', bpm: 126, key: 57, minor: true },
  { kind: 'ice', sky: ['#7aa6f5', '#e4eeff'], far: '#c6d6f4', mid: '#a5bde8', near: '#88a3d8', ground: '#6e87c0', groundDark: '#536aa0', dots: '#8aa3d8', top: '#f6fbff', topDark: '#c3d9f0', stone: '#a0b3d8', pit: '#62b6ea', sun: '#ffffff', bpm: 118, key: 62, ice: true },
  { kind: 'lava', sky: ['#28132f', '#7d2f2c'], far: '#4c2441', mid: '#5c2b3a', near: '#3a1c2b', ground: '#4f3c46', groundDark: '#372a32', dots: '#66525d', top: '#a08893', topDark: '#77626d', stone: '#6f5b67', pit: '#ff6a1f', sun: '#ff8a3a', bpm: 152, key: 55, minor: true },
  { kind: 'sky', sky: ['#97cfff', '#fff0fa'], far: '#ffffff', mid: '#ffe8f5', near: '#f4d4ea', ground: '#efe4ff', groundDark: '#d3c2ef', dots: '#ffffff', top: '#ffffff', topDark: '#e3d5fb', stone: '#c6b6ea', pit: null, sun: '#fff7c8', bpm: 130, key: 65 },
];
const STAGES_PER_WORLD = 6, STAGE_COUNT = WORLDS.length * STAGES_PER_WORLD;

const SKINS = [
  { id: 'classic', price: 0, shell: '#c9a27a', band: '#99724c', skin: '#f3cba2' },
  { id: 'mint', price: 150, shell: '#7fd8c0', band: '#48a891', skin: '#ffe0c4' },
  { id: 'cherry', price: 350, shell: '#ffabc9', band: '#e278a1', skin: '#fff0e2' },
  { id: 'night', price: 700, shell: '#4f52a6', band: '#2c2d6c', skin: '#dacbff', sparkle: true },
  { id: 'gold', price: 1400, shell: '#ffd44f', band: '#dca01d', skin: '#fff2cc', sparkle: true },
  { id: 'rainbow', price: 3000, shell: 'rainbow', band: '#ffffff', skin: '#ffe9d6', sparkle: true },
];

// ===== 저장 =====
const Save = {
  key: 'rollydash.v1',
  data: null,
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.key)); } catch (e) { d = null; }
    this.data = Object.assign({ stages: {}, unlocked: 1, bank: 0, skins: ['classic'], skin: 'classic', bestRun: 0, bestScore: 0, music: true, sfx: true, lang: null, seenWorld: 0 }, d || {});
    if (this.data.lang && STR[this.data.lang]) LANG = this.data.lang;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* 저장 불가 환경 */ } },
};

// ===== 소리 (WebAudio 합성) =====
const Sound = {
  ctx: null, out: null, sfxBus: null, mus: null, nb: null, timer: null, song: null, step: 0, next: 0, lastAcorn: 0,
  init() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.out = this.ctx.createGain(); this.out.gain.value = 0.7; this.out.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.out);
        this.mus = this.ctx.createGain(); this.mus.gain.value = 0.32; this.mus.connect(this.out);
        this.apply();
      } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  apply() {
    if (!this.ctx) return;
    this.sfxBus.gain.value = Save.data.sfx ? 1 : 0;
    this.mus.gain.value = Save.data.music ? 0.32 : 0;
  },
  env(g, t0, a, d, vol) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  },
  tone(f, d, type, vol, f2, when, bus) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    this.env(g, t0, 0.005, d, vol || 0.15);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t0); o.stop(t0 + d + 0.05);
  },
  noise(d, vol, freq, when, bus) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (!this.nb) {
      const b = c.createBuffer(1, c.sampleRate, c.sampleRate), a = b.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
      this.nb = b;
    }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime + (when || 0);
    s.buffer = this.nb; f.type = 'lowpass'; f.frequency.value = freq || 2000;
    this.env(g, t0, 0.003, d, vol || 0.2);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    s.start(t0); s.stop(t0 + d + 0.05);
  },
  sfx(name, n) {
    if (!this.ctx) return;
    const seq = (notes, dur, type, vol, gap) => notes.forEach((f, i) => this.tone(f, dur, type, vol, 0, i * gap));
    switch (name) {
      case 'jump': this.tone(280, 0.14, 'square', 0.09, 640); break;
      case 'acorn': {
        const now = this.ctx.currentTime;
        if (now - this.lastAcorn < 0.03) return;
        this.lastAcorn = now;
        this.tone(1046, 0.05, 'square', 0.07); this.tone(1568, 0.1, 'square', 0.07, 0, 0.05); break;
      }
      case 'stomp': this.tone(240, 0.12, 'square', 0.14, 90); this.noise(0.08, 0.14, 900); break;
      case 'kill': this.tone(700, 0.12, 'triangle', 0.16, 180); this.noise(0.1, 0.12, 1800); break;
      case 'combo': this.tone(520 + (n || 1) * 90, 0.12, 'square', 0.08, 0, 0.04); break;
      case 'hurt': this.tone(420, 0.3, 'sawtooth', 0.12, 110); break;
      case 'lose': seq([880, 740, 620, 520], 0.08, 'square', 0.08, 0.05); break;
      case 'die': seq([523, 392, 330, 262, 196], 0.16, 'square', 0.1, 0.12); break;
      case 'spring': this.tone(180, 0.35, 'triangle', 0.22, 950); break;
      case 'boost': this.tone(300, 0.3, 'sawtooth', 0.08, 1300); this.noise(0.3, 0.07, 3500); break;
      case 'rev': this.tone(180 + (n || 0) * 260, 0.08, 'sawtooth', 0.05, 320 + (n || 0) * 400); break;
      case 'roll': this.tone(420, 0.22, 'sawtooth', 0.09, 1500); this.noise(0.2, 0.09, 2600); break;
      case 'box': this.tone(520, 0.07, 'square', 0.11); this.tone(780, 0.1, 'square', 0.11, 0, 0.06); break;
      case 'brick': this.noise(0.22, 0.25, 1400); this.tone(160, 0.1, 'square', 0.08, 70); break;
      case 'bump': this.tone(140, 0.08, 'square', 0.1); break;
      case 'power': seq([523, 659, 784, 1047, 1319], 0.1, 'square', 0.09, 0.06); break;
      case 'star': seq([784, 988, 1175, 1568, 1976], 0.18, 'triangle', 0.18, 0.07); break;
      case 'check': this.tone(660, 0.1, 'square', 0.1); this.tone(990, 0.22, 'square', 0.1, 0, 0.1); break;
      case 'clear': seq([523, 659, 784, 1047, 0, 784, 1047, 1319], 0.18, 'square', 0.1, 0.11); break;
      case 'click': this.tone(760, 0.05, 'square', 0.07); break;
      case 'buy': seq([660, 880, 1320], 0.1, 'triangle', 0.15, 0.07); break;
      case 'world': seq([392, 523, 659, 784, 1047], 0.14, 'triangle', 0.14, 0.09); break;
    }
  },
  // ----- 배경음악: 월드마다 다른 코드 진행과 선율을 자동으로 만든다 -----
  makeSong(w) {
    const W = WORLDS[w], r = mulberry(4242 + w * 77);
    const scale = W.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const prog = W.minor ? [0, 5, 3, 4] : [0, 4, 5, 3];
    const mel = [];
    let deg = 7;
    for (let i = 0; i < 64; i++) {
      if (i % 2 === 1 && r() < 0.6) { mel.push(null); continue; }
      if (r() < 0.22) { mel.push(null); continue; }
      deg = clamp(deg + Math.floor(r() * 5) - 2, 3, 12);
      mel.push(deg);
    }
    return { bpm: W.bpm, root: W.key, scale, prog, mel };
  },
  note(deg, scale) { return scale[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7); },
  playMusic(w) {
    this.stopMusic();
    if (!this.ctx) return;
    this.song = this.makeSong(w);
    this.step = 0;
    this.next = this.ctx.currentTime + 0.12;
    this.timer = setInterval(() => this.tick(), 25);
  },
  stopMusic() { if (this.timer) clearInterval(this.timer); this.timer = null; },
  tick() {
    if (!this.ctx || !this.song) return;
    const spb = 60 / this.song.bpm / 4, now = this.ctx.currentTime;
    if (this.next < now - 0.2) this.next = now + 0.05;
    while (this.next < now + 0.12) {
      this.playStep(this.step, this.next - now);
      this.next += spb; this.step++;
    }
  },
  playStep(s, when) {
    const S = this.song, st = s % 16, bar = Math.floor(s / 16) % 4, root = S.prog[bar];
    const mf = m => 440 * Math.pow(2, (m - 69) / 12);
    const ch = [this.note(root, S.scale), this.note(root + 2, S.scale), this.note(root + 4, S.scale)];
    if (st % 4 === 0) this.tone(mf(S.root - 24 + ch[0] + (st === 8 ? 12 : 0)), 0.2, 'triangle', 0.32, 0, when, this.mus);
    if (st % 4 === 2) this.tone(mf(S.root - 12 + ch[0]), 0.1, 'triangle', 0.18, 0, when, this.mus);
    if (st % 2 === 0) this.tone(mf(S.root + ch[(st / 2) % 3]), 0.07, 'square', 0.035, 0, when, this.mus);
    const m = S.mel[s % 64];
    if (m != null) this.tone(mf(S.root + this.note(m, S.scale)), 0.16, 'square', 0.06, 0, when, this.mus);
    if (st % 8 === 0) this.tone(130, 0.12, 'sine', 0.35, 45, when, this.mus);
    if (st % 4 === 2) this.noise(0.03, 0.06, 8000, when, this.mus);
    if (st === 12) this.noise(0.09, 0.08, 2500, when, this.mus);
  },
};

// ===== 입력 =====
const Input = {
  keys: new Set(),
  ptrs: new Map(),
  latch: { l: 0, r: 0, j: 0, d: 0 },
  prev: { l: 0, r: 0, j: 0, d: 0 },
  cur: { l: 0, r: 0, j: 0, d: 0 },
  jP: 0, dP: 0,
  touchSeen: false,
  poll() {
    const k = this.keys, c = { l: 0, r: 0, j: 0, d: 0 };
    if (k.has('ArrowLeft') || k.has('KeyA')) c.l = 1;
    if (k.has('ArrowRight') || k.has('KeyD')) c.r = 1;
    if (k.has('Space') || k.has('ArrowUp') || k.has('KeyW') || k.has('KeyZ') || k.has('KeyK')) c.j = 1;
    if (k.has('KeyX') || k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyJ') || k.has('ArrowDown') || k.has('KeyS')) c.d = 1;
    for (const p of this.ptrs.values()) if (p.ctl) c[p.ctl] = 1;
    this.jP = (c.j && !this.prev.j) || this.latch.j ? 1 : 0;
    this.dP = (c.d && !this.prev.d) || this.latch.d ? 1 : 0;
    this.latch = { l: 0, r: 0, j: 0, d: 0 };
    this.prev = c; this.cur = c;
  },
  clearAll() { this.ptrs.clear(); this.keys.clear(); },
};
// 터치 조작 버튼 위치 (가상 좌표)
function ctlLayout() {
  return {
    l: { x: 64, y: VH - 64, r: 44 },
    r: { x: 172, y: VH - 64, r: 44 },
    j: { x: VW - 70, y: VH - 70, r: 50 },
    d: { x: VW - 186, y: VH - 58, r: 40 },
  };
}
function controlAt(x, y) {
  if (y < VH * 0.3) return null;
  if (x < Math.min(VW * 0.42, 290)) return x < 118 ? 'l' : 'r';
  if (x > VW * 0.56) return x > VW - 128 ? 'j' : 'd';
  return null;
}
