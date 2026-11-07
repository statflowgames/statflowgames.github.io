'use strict';
const Save = {
  key: 'luckydice.v1',
  data: { best: { ante: 0, hit: 0, runs: 0, clears: 0 }, sound: true, seenHelp: false, run: null },
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(this.key));
      if (s) { Object.assign(this.data, s); this.data.best = Object.assign({ ante: 0, hit: 0, runs: 0, clears: 0 }, s.best); }
    } catch (e) {}
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} },
};

// 주소에 ?mute 를 붙이면 저장값은 그대로 두고 출력만 끈다 (테스트용)
const MUTE = /[?&]mute\b/.test(location.search);

const Sound = {
  ctx: null, out: null, nb: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = MUTE ? 0 : 0.55;
      this.out.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.3);
      this.nb = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.nb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  ok() { return this.ctx && Save.data.sound; },
  tone(f, dur, type, vol, delay = 0, f2 = 0) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, vol, freq, delay = 0) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.nb;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.5;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.out);
    s.start(t); s.stop(t + dur + 0.02);
  },
  roll(n) {
    for (let k = 0; k < 5 + n * 2; k++) this.noise(0.035, 0.35, 1500 + Math.random() * 2600, k * 0.05 + Math.random() * 0.025);
    for (let k = 0; k < n; k++) this.tone(170 + Math.random() * 70, 0.07, 'triangle', 0.18, 0.38 + k * 0.07);
  },
  click() { this.tone(700, 0.045, 'triangle', 0.14); },
  sel(on) { this.tone(on ? 560 : 400, 0.06, 'triangle', 0.16); this.noise(0.02, 0.15, 3000); },
  chip(i) { this.tone(523 * Math.pow(2, Math.min(i, 24) / 12), 0.1, 'triangle', 0.2); },
  mult(i) { this.tone(330 * Math.pow(2, Math.min(i, 24) / 12), 0.13, 'square', 0.07); this.tone(660 * Math.pow(2, Math.min(i, 24) / 12), 0.08, 'sine', 0.08); },
  xmult() { this.tone(200, 0.28, 'sawtooth', 0.11, 0, 900); this.tone(600, 0.25, 'square', 0.06, 0.08, 1200); },
  dud() { this.tone(140, 0.18, 'sawtooth', 0.09, 0, 90); },
  note() { this.tone(988, 0.08, 'sine', 0.14); this.tone(1319, 0.1, 'sine', 0.12, 0.06); },
  total(big) {
    [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.14, i * 0.04));
    if (big) { this.tone(110, 0.6, 'sawtooth', 0.12, 0, 55); this.noise(0.5, 0.25, 400); }
  },
  tick() { this.tone(1200 + Math.random() * 300, 0.03, 'square', 0.03); },
  coin(delay = 0) { this.tone(1320, 0.07, 'square', 0.06, delay); this.tone(1760, 0.16, 'square', 0.06, delay + 0.06); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.18, i * 0.09)); },
  lose() { [392, 349, 311, 262, 196].forEach((f, i) => this.tone(f, 0.4, 'sawtooth', 0.08, i * 0.16)); },
  buy() { this.coin(); this.tone(880, 0.12, 'triangle', 0.12, 0.1); },
};

function fmt(n) {
  n = Math.floor(n);
  if (n < 100000) return n.toLocaleString('ko-KR');
  if (n >= 1e24) return n.toExponential(2);
  for (const [u, s] of [[1e20, '해'], [1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']]) {
    if (n >= u) {
      const v = n / u;
      const t = v >= 1000 ? Math.floor(v).toLocaleString('ko-KR') : v >= 100 ? String(Math.floor(v)) : v.toFixed(v >= 10 ? 1 : 2).replace(/\.?0+$/, '');
      return t + s;
    }
  }
  return String(n);
}

function fmtMult(m) { return m >= 100000 ? fmt(m) : (Math.round(m * 10) / 10).toLocaleString('ko-KR'); }

function buzz(ms) { try { if (Save.data.sound && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
