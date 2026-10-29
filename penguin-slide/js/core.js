'use strict';
/* 펭귄 썰매 활강 — 공통: 상수, 도구 함수, 문구, 저장, 소리, 입력 */
const VH = 360;
let VW = 640;
const M = 20; // 1 m = 20 px
let ctx = null;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const approach = (v, to, d) => (v < to ? Math.min(v + d, to) : Math.max(v - d, to));
const smooth01 = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
function wrapA(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let q = Math.imul(a ^ (a >>> 15), 1 | a);
    q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
}
function hash1(i) {
  let h = Math.imul(i | 0, 374761393) ^ 0x2545f491;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise1(x, seed) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), s = (seed || 0) * 7919;
  return lerp(hash1(i + s), hash1(i + 1 + s), u);
}
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixRGB(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
function rgb(c, al) { return al == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`; }

// ===== 문구 =====
const STR = {
  ko: {
    title: '펭귄 썰매 활강', tagline: '꾹 누르고, 휙 떼고, 훨훨 날아라!', tapStart: '화면을 눌러 시작',
    best: '최고', bestDist: '최고 기록', distance: '거리', fish: '생선', score: '점수', newBest: '신기록!',
    perfect: '완벽 착지!', good: '착지', hard: '쿵!', crash: '꽈당!', fever: '피버!', combo: '연속',
    air: '체공', bigAir: '대점프!', warn: '눈사태가 온다! 속도를 내요!', caught: '눈사태에 휩쓸렸다!',
    retry: '다시 하기', home: '타이틀', resume: '계속하기', paused: '일시정지', perfects: '완벽 착지',
    maxSpeed: '최고 속도', rotate: '가로 화면으로 돌려주세요', golden: '황금 생선!',
    tut1: '화면을 꾹 누르면 무거워져요 — 내리막에서 쭉 가속!',
    tut2: '오르막 꼭대기에서 손을 떼면 훨훨 날아올라요!',
    tut3: '공중에서 누르면 빨리 내려와요. 내리막에 맞춰 착지하면 완벽!',
    tutDone: '좋아요! 이제 눈사태보다 빨리 달려요!',
    tipUp: '오르막에서는 손을 떼야 덜 느려져요!',
    ph0: '한낮의 설산', ph1: '노을 지는 언덕', ph2: '별이 빛나는 밤', ph3: '오로라 설원',
    langBtn: 'EN', avalanche: '눈사태',
  },
  en: {
    title: 'Penguin Slide', tagline: 'Hold, let go, and soar!', tapStart: 'Tap to start',
    best: 'Best', bestDist: 'Best', distance: 'Distance', fish: 'Fish', score: 'Score', newBest: 'New Record!',
    perfect: 'Perfect Landing!', good: 'Landed', hard: 'Thud!', crash: 'Wipeout!', fever: 'Fever!', combo: 'Combo',
    air: 'Air', bigAir: 'Big Air!', warn: 'Avalanche! Speed up!', caught: 'Swept away by the avalanche!',
    retry: 'Retry', home: 'Title', resume: 'Resume', paused: 'Paused', perfects: 'Perfects',
    maxSpeed: 'Top Speed', rotate: 'Please rotate to landscape', golden: 'Golden Fish!',
    tut1: 'Hold the screen to get heavy — speed up downhill!',
    tut2: 'Let go at the top of a hill to fly!',
    tut3: 'Hold in the air to drop faster. Land along a downhill for a Perfect!',
    tutDone: 'Nice! Now outrun the avalanche!',
    tipUp: 'Let go on uphills to keep your speed!',
    ph0: 'Noon Peaks', ph1: 'Sunset Slopes', ph2: 'Starry Night', ph3: 'Aurora Fields',
    langBtn: '한', avalanche: 'Avalanche',
  },
};
let LANG = (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
const t = k => (STR[LANG] && STR[LANG][k] != null ? STR[LANG][k] : STR.en[k] != null ? STR.en[k] : k);

// ===== 저장 =====
const Save = {
  key: 'penguinslide.v1',
  data: null,
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.key)); } catch (e) { d = null; }
    this.data = Object.assign({ bestDist: 0, bestScore: 0, fishTotal: 0, plays: 0, music: false, sfx: false, lang: null, tut: false }, d || {});
    // 2026-10-29: 소리 기본값을 끔. 이미 켜진 채 저장된 기록도 한 번 끈다.
    if (!this.data.quiet) { this.data.music = false; this.data.sfx = false; this.data.quiet = true; this.save(); }
    if (this.data.lang && STR[this.data.lang]) LANG = this.data.lang;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* 저장할 수 없는 환경 */ } },
};

// ===== 소리 (WebAudio 합성) =====
const Sound = {
  ctx: null, out: null, sfxBus: null, mus: null, nb: null, timer: null, song: null, step: 0, next: 0,
  slide: null, wind: null, rumble: null, lastFish: 0,
  init() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.out = this.ctx.createGain(); this.out.gain.value = 0.75; this.out.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.out);
        this.mus = this.ctx.createGain(); this.mus.connect(this.out);
        this.apply();
        this.startLoops();
      } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  apply() {
    if (!this.ctx) return;
    this.sfxBus.gain.value = Save.data.sfx ? 1 : 0;
    this.mus.gain.value = Save.data.music ? 0.26 : 0;
  },
  noiseBuf() {
    if (!this.nb) {
      const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), a = b.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
      this.nb = b;
    }
    return this.nb;
  },
  // 계속 울리는 소리: 썰매 미끄러짐, 바람, 눈사태 우르릉
  loop(type, freq, q) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf(); s.loop = true;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start();
    return { f, g };
  },
  startLoops() {
    this.slide = this.loop('bandpass', 900, 0.8);
    this.wind = this.loop('bandpass', 1600, 0.4);
    this.rumble = this.loop('lowpass', 160, 0.7);
  },
  setLoops(slide, slideF, wind, rumble) {
    if (!this.ctx || !this.slide) return;
    const now = this.ctx.currentTime;
    this.slide.g.gain.setTargetAtTime(slide, now, 0.06);
    this.slide.f.frequency.setTargetAtTime(slideF, now, 0.1);
    this.wind.g.gain.setTargetAtTime(wind, now, 0.12);
    this.rumble.g.gain.setTargetAtTime(rumble, now, 0.15);
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
  noise(d, vol, freq, when, bus, type) {
    if (!this.ctx) return;
    const c = this.ctx;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime + (when || 0);
    s.buffer = this.noiseBuf(); f.type = type || 'lowpass'; f.frequency.value = freq || 2000;
    this.env(g, t0, 0.004, d, vol || 0.2);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    s.start(t0, Math.random()); s.stop(t0 + d + 0.05);
  },
  sfx(name, n) {
    if (!this.ctx) return;
    const seq = (notes, dur, type, vol, gap) => notes.forEach((f, i) => f && this.tone(f, dur, type, vol, 0, i * gap));
    switch (name) {
      case 'fish': {
        const now = this.ctx.currentTime;
        if (now - this.lastFish < 0.035) return;
        this.lastFish = now;
        const p = Math.min(n || 0, 12);
        this.tone(880 * Math.pow(2, p / 12), 0.07, 'triangle', 0.12);
        this.tone(1320 * Math.pow(2, p / 12), 0.1, 'sine', 0.08, 0, 0.04);
        break;
      }
      case 'golden': seq([988, 1319, 1568, 1976, 2637], 0.12, 'triangle', 0.13, 0.05); break;
      case 'takeoff': this.noise(0.35, 0.12, 1800, 0, null, 'bandpass'); this.tone(300, 0.25, 'sine', 0.06, 620); break;
      case 'land': this.noise(0.16, 0.22, 700); this.tone(150, 0.1, 'sine', 0.14, 70); break;
      case 'perfect': {
        const k = Math.min(n || 1, 6), b = 523 * Math.pow(2, (k - 1) * 2 / 12);
        seq([b, b * 1.26, b * 1.5, b * 2], 0.12, 'triangle', 0.13, 0.05);
        this.noise(0.25, 0.08, 6000, 0, null, 'highpass');
        break;
      }
      case 'hard': this.noise(0.22, 0.28, 500); this.tone(110, 0.16, 'square', 0.08, 60); break;
      case 'crash': this.noise(0.5, 0.3, 900); seq([440, 330, 247, 185], 0.12, 'square', 0.07, 0.08); break;
      case 'fever': seq([659, 784, 988, 1319, 1568], 0.1, 'square', 0.07, 0.05); break;
      case 'warn': this.tone(220, 0.25, 'sawtooth', 0.06, 180); this.tone(208, 0.25, 'sawtooth', 0.06, 170, 0.28); break;
      case 'caught': this.noise(1.3, 0.45, 400); seq([392, 330, 262, 196, 131], 0.2, 'triangle', 0.12, 0.14); break;
      case 'record': seq([523, 659, 784, 1047, 0, 1319], 0.16, 'triangle', 0.13, 0.1); break;
      case 'phase': seq([784, 988, 1175, 1568], 0.25, 'sine', 0.09, 0.12); break;
      case 'click': this.tone(760, 0.05, 'triangle', 0.1); break;
      case 'start': seq([523, 784, 1047], 0.1, 'triangle', 0.12, 0.07); break;
    }
  },
  // ----- 배경음악: 부드러운 오음 음계 선율을 자동으로 만든다 -----
  makeSong(seed) {
    const r = mulberry(seed);
    const mel = [];
    let deg = 5;
    for (let i = 0; i < 64; i++) {
      if (i % 2 === 1 && r() < 0.7) { mel.push(null); continue; }
      if (r() < 0.25) { mel.push(null); continue; }
      deg = clamp(deg + Math.floor(r() * 5) - 2, 2, 10);
      mel.push(deg);
    }
    return { bpm: 104, root: 62, scale: [0, 2, 4, 7, 9], prog: [0, 9, 5, 7], mel };
  },
  playMusic() {
    if (this.timer || !this.ctx) return;
    this.song = this.makeSong(1207);
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
    const S = this.song, st = s % 16, bar = Math.floor(s / 16) % 4, root = S.root + S.prog[bar];
    const mf = m => 440 * Math.pow(2, (m - 69) / 12);
    const minor = bar === 1;
    const ch = [0, minor ? 3 : 4, 7];
    if (st % 8 === 0) this.tone(mf(root - 24), 0.45, 'triangle', 0.3, 0, when, this.mus);
    if (st % 8 === 4) this.tone(mf(root - 17), 0.25, 'triangle', 0.2, 0, when, this.mus);
    if (st % 4 === 2) this.tone(mf(root + ch[(st >> 2) % 3]), 0.18, 'sine', 0.07, 0, when, this.mus);
    const m = S.mel[s % 64];
    if (m != null) {
      const sc = S.scale, nn = S.root + sc[m % 5] + 12 * Math.floor(m / 5);
      this.tone(mf(nn), 0.28, 'triangle', 0.08, 0, when, this.mus);
      this.tone(mf(nn + 12), 0.12, 'sine', 0.025, 0, when, this.mus);
    }
    if (st % 4 === 0) this.noise(0.03, 0.04, 9000, when, this.mus, 'highpass');
    if (st === 8) this.noise(0.08, 0.05, 1800, when, this.mus);
  },
};

// ===== 입력: 원터치 (누르고 있는 동안 held) =====
const Input = {
  keys: new Set(),
  ptrs: new Set(),
  get held() {
    if (this.ptrs.size) return true;
    const k = this.keys;
    return k.has('Space') || k.has('ArrowDown') || k.has('KeyS') || k.has('ArrowUp') || k.has('KeyW') || k.has('KeyZ');
  },
  clearAll() { this.ptrs.clear(); this.keys.clear(); },
};
