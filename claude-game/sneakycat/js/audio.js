// 효과음·배경음 (Web Audio 합성). 주소에 ?mute 를 붙이면 출력만 0 (저장된 설정은 그대로)
const MUTE = new URLSearchParams(location.search).has('mute');

let ac = null, master, sfx, mus, noiseBuf;
let musicOn = true, soundOn = true;
let seqTimer = null, step = 0, nextT = 0, tension = 0;

function init() {
  if (ac) return true;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
  } catch { return false; }
  master = ac.createGain(); master.gain.value = MUTE ? 0 : 0.9; master.connect(ac.destination);
  sfx = ac.createGain(); sfx.gain.value = soundOn ? 1 : 0; sfx.connect(master);
  mus = ac.createGain(); mus.gain.value = musicOn ? 0.32 : 0; mus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

function osc(type, f0, f1, dur, vol, at = 0, dest = sfx, filt) {
  const t = ac.currentTime + at;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n = o;
  if (filt) { const f = ac.createBiquadFilter(); f.type = filt[0]; f.frequency.value = filt[1]; f.Q.value = filt[2] || 1; o.connect(f); n = f; }
  n.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function noise(dur, vol, type, freq, at = 0, q = 1, dest = sfx) {
  const t = ac.currentTime + at;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

const SFX = {
  step() { noise(0.05, 0.12, 'highpass', 2500); },
  hide() { noise(0.12, 0.12, 'bandpass', 900, 0, 2); osc('sine', 300, 180, 0.12, 0.05); },
  meow() {
    const t = ac.currentTime;
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'triangle';
    for (const x of [o, o2]) {
      x.frequency.setValueAtTime(520, t);
      x.frequency.exponentialRampToValueAtTime(900, t + 0.12);
      x.frequency.exponentialRampToValueAtTime(620, t + 0.42);
    }
    o2.detune.value = 1200;
    f.type = 'bandpass'; f.Q.value = 2.5;
    f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1800, t + 0.12); f.frequency.linearRampToValueAtTime(1000, t + 0.42);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(sfx);
    o.start(t); o2.start(t); o.stop(t + 0.5); o2.stop(t + 0.5);
  },
  coin() { osc('triangle', 988, 988, 0.08, 0.18); osc('triangle', 1319, 1319, 0.12, 0.18, 0.07); osc('triangle', 1760, 1760, 0.18, 0.14, 0.14); },
  fish() { [523, 659, 784, 1047, 1319].forEach((f, i) => osc('square', f, f, 0.12, 0.08, i * 0.06, sfx, ['lowpass', 2500])); },
  sus() { osc('triangle', 500, 760, 0.16, 0.12); },
  alert() { osc('square', 660, 660, 0.09, 0.12, 0, sfx, ['lowpass', 2200]); osc('square', 990, 990, 0.16, 0.12, 0.09, sfx, ['lowpass', 2200]); },
  caught() { osc('sawtooth', 420, 110, 0.7, 0.16, 0, sfx, ['lowpass', 1400]); noise(0.3, 0.2, 'lowpass', 600, 0.05); },
  crash() { noise(0.45, 0.35, 'bandpass', 3200, 0, 0.8); for (let i = 0; i < 5; i++) osc('triangle', 2000 + Math.random() * 2500, null, 0.15, 0.06, 0.03 + i * 0.05); },
  bark() { for (const at of [0, 0.16]) { noise(0.09, 0.3, 'bandpass', 700, at, 1.5); osc('square', 230, 150, 0.09, 0.1, at, sfx, ['lowpass', 900]); } },
  siren() { for (let i = 0; i < 4; i++) osc('square', i % 2 ? 720 : 960, null, 0.2, 0.07, i * 0.2, sfx, ['lowpass', 2400]); },
  zap() { osc('sawtooth', 1500, 250, 0.18, 0.12); },
  power() { osc('square', 120, 60, 0.5, 0.12, 0, sfx, ['lowpass', 500]); noise(0.06, 0.25, 'highpass', 3000); },
  creak() { osc('sawtooth', 140, 95, 0.32, 0.1, 0, sfx, ['bandpass', 600, 4]); osc('sawtooth', 210, 150, 0.2, 0.05, 0.08, sfx, ['bandpass', 900, 5]); },
  vent() { noise(0.25, 0.22, 'bandpass', 1800, 0, 3); osc('square', 330, 220, 0.12, 0.05, 0.05, sfx, ['lowpass', 1200]); osc('square', 260, 180, 0.12, 0.05, 0.22, sfx, ['lowpass', 1200]); },
  ride() { osc('sine', 1200, 1200, 0.07, 0.1); osc('sine', 1600, 1600, 0.09, 0.1, 0.08); },
  win() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => osc('triangle', f, f, 0.22, 0.16, i * 0.11)); },
  splash() { noise(0.22, 0.28, 'bandpass', 1300, 0, 1.4); osc('sine', 900, 280, 0.16, 0.06); noise(0.12, 0.12, 'highpass', 3500, 0.06); },
  peek() { osc('sine', 520, 1040, 0.22, 0.07); osc('triangle', 1560, 2350, 0.16, 0.035, 0.09); osc('sine', 2093, 2093, 0.2, 0.025, 0.18); },
  click() { osc('triangle', 880, 660, 0.05, 0.08); },
  star() { osc('triangle', 1175, 1568, 0.25, 0.16); },
};

// 살금살금 피치카토 배경음 (A 단조)
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const BASS = [45, 0, 52, 0, 45, 0, 48, 47, 41, 0, 48, 0, 40, 0, 44, 47];
const MEL = [76, 0, 0, 0, 72, 0, 74, 0, 0, 0, 0, 0, 71, 0, 0, 0, 69, 0, 0, 0, 72, 0, 76, 0, 0, 0, 74, 0, 0, 0, 0, 0];
function pluck(f, at, vol, dur = 0.22) {
  osc('triangle', f, f, dur, vol, at, mus);
}
function schedule() {
  if (!ac) return;
  const bpm = 96 + tension * 50;
  const st = 60 / bpm / 2;
  while (nextT < ac.currentTime + 0.12) {
    const at = nextT - ac.currentTime;
    const b = BASS[step % 16];
    if (b) pluck(N(b), at, 0.22, 0.28);
    const m = MEL[step % 32];
    if (m && tension < 0.5) pluck(N(m), at, 0.09, 0.35);
    if (tension > 0.5 && step % 2 === 0) noise(0.04, 0.08, 'highpass', 6000, at, 1, mus);
    if (tension > 0.5 && step % 4 === 2) pluck(N(b ? b + 12 : 57), at, 0.1, 0.12);
    step++;
    nextT += st;
  }
}

export const Sound = {
  get musicOn() { return musicOn; },
  get soundOn() { return soundOn; },
  unlock() {
    if (!init()) return;
    if (ac.state === 'suspended') ac.resume();
    if (!seqTimer) { nextT = ac.currentTime + 0.1; seqTimer = setInterval(schedule, 40); }
  },
  play(name) {
    if (!ac || !soundOn) return;
    try { SFX[name] && SFX[name](); } catch { /* 소리 실패는 무시 */ }
  },
  setSound(on) { soundOn = on; if (sfx) sfx.gain.value = on ? 1 : 0; },
  setMusic(on) { musicOn = on; if (mus) mus.gain.setTargetAtTime(on ? 0.32 : 0, ac.currentTime, 0.1); },
  setTension(v) { tension = v; },
  suspend() { if (ac && ac.state === 'running') ac.suspend(); },
  resume() { if (ac && ac.state === 'suspended') ac.resume(); },
};
