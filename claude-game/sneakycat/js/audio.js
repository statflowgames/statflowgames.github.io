// 효과음·배경음 (Web Audio 합성). 주소에 ?mute 를 붙이면 출력만 0 (저장된 설정은 그대로)
const MUTE = new URLSearchParams(location.search).has('mute');

let ac = null, master, sfx, mus, noiseBuf;
let musicOn = true, soundOn = true;
let seqTimer = null, step = 0, nextT = 0;
let bus, muffle; // 곡 소리 → 먹먹함 필터 → 음악 볼륨

function init() {
  if (ac) return true;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
  } catch { return false; }
  master = ac.createGain(); master.gain.value = MUTE ? 0 : 0.9; master.connect(ac.destination);
  sfx = ac.createGain(); sfx.gain.value = soundOn ? 1 : 0; sfx.connect(master);
  mus = ac.createGain(); mus.gain.value = musicOn ? 0.32 : 0; mus.connect(master);
  muffle = ac.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 16000; muffle.Q.value = 0.7; muffle.connect(mus);
  bus = ac.createGain(); bus.gain.value = 1; bus.connect(muffle);
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
  chop() { noise(0.04, 0.1, 'highpass', 3200); osc('triangle', 1400, 900, 0.04, 0.03); },
  door() { noise(0.35, 0.08, 'lowpass', 900, 0, 0.7); osc('sine', 420, 300, 0.25, 0.025); },
  beep() { osc('square', 1250, 1250, 0.05, 0.04, 0, sfx, ['lowpass', 3000]); },
  boom() { noise(0.6, 0.22, 'lowpass', 500, 0, 0.8); osc('sine', 120, 50, 0.5, 0.12); for (let i = 0; i < 4; i++) noise(0.08, 0.06, 'highpass', 4000, 0.15 + i * 0.07); },
  clank() { osc('square', 900, 700, 0.05, 0.03, 0, sfx, ['bandpass', 1800, 3]); osc('square', 1300, 1100, 0.04, 0.02, 0.05, sfx, ['bandpass', 2400, 3]); },
  peek() { osc('sine', 520, 1040, 0.22, 0.07); osc('triangle', 1560, 2350, 0.16, 0.035, 0.09); osc('sine', 2093, 2093, 0.2, 0.025, 0.18); },
  click() { osc('triangle', 880, 660, 0.05, 0.08); },
  // 골골: 들숨·날숨 두 번. 휴대폰 스피커에서도 들리게 소리 높이를 120~600Hz 쪽에 두고, 1초에 25번 떨리게 한다
  purr() {
    const t0 = ac.currentTime;
    for (const [at, dur, f, v] of [[0, 0.62, 118, 1], [0.7, 0.8, 100, 0.9]]) {
      const t = t0 + at;
      const out = ac.createGain(), trem = ac.createGain(), lfo = ac.createOscillator(), depth = ac.createGain();
      // 떨림: 소리 크기를 0~1 사이로 빠르게 오르내린다
      trem.gain.value = 0.5; lfo.type = 'sine'; lfo.frequency.value = 25; depth.gain.value = 0.5;
      lfo.connect(depth); depth.connect(trem.gain);
      // 숨 모양: 천천히 커졌다 잦아든다
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.55 * v, t + dur * 0.3);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      trem.connect(out); out.connect(sfx);
      // 몸통 울림: 톱니파를 둥글게 깎아 낮게 웅웅
      const o = ac.createOscillator(), lp = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.92, t + dur);
      lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 0.9;
      o.connect(lp); lp.connect(trem);
      // 숨결: 거친 바람 소리
      const n = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
      n.buffer = noiseBuf; bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.8; ng.gain.value = 0.9;
      n.connect(bp); bp.connect(ng); ng.connect(trem);
      for (const x of [lfo, o]) { x.start(t); x.stop(t + dur + 0.05); }
      n.start(t, Math.random() * 0.3); n.stop(t + dur + 0.05);
    }
  },
  star() { osc('triangle', 1175, 1568, 0.25, 0.16); },
};

// ───────── 배경음악 ─────────
// 곡마다 악기·박자가 다르지만, 모두 같은 "살금살금" 테마(미-도-레 … 시 … 라-도-미 … 레)를 품고 있다.
// 악보 글자: 'A2' 음 · 'A3+C4+E4' 화음 · '-' 앞 음을 늘림 · '.' 쉼. 한 칸 = 8분음표.
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (t) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(t); return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
function score(str) {
  const tk = str.trim().split(/\s+/).filter((x) => x !== '|'), out = [];
  for (let i = 0; i < tk.length; i++) {
    if (tk[i] === '.' || tk[i] === '-') { out.push(null); continue; }
    let len = 1; while (tk[i + len] === '-') len++;
    out.push({ notes: tk[i].split('+').map(midi), len });
  }
  return out;
}
// 화음 진행 + 리듬: 마디마다 화음 하나, 리듬의 X 자리에 친다
function comp(chords, rhythm, bar = 8) {
  const r = rhythm.trim().split(/\s+/).filter((x) => x !== '|');
  return chords.map((c, ci) => Array.from({ length: bar }, (_, k) => { const x = r[(ci * bar + k) % r.length]; return x === 'X' ? c : x === '-' ? '-' : '.'; }).join(' ')).join(' ');
}
const beat = (str) => str.trim().split(/\s+/).filter((x) => x !== '|').map((x) => (x === 'X' ? 1.6 : x === 'x' ? 1 : 0));

// 테마 (4마디)
const THEME = 'E5 . . . C5 . D5 . | . . . . B4 . . . | A4 . . . C5 . E5 . | . . D5 . . . . .';
const REST4 = Array(32).fill('.').join(' ');
const AM7 = 'A3+C4+E4+G4', DM7 = 'C4+D4+F4+A4', E7 = 'B3+D4+E4+G#4', FM7 = 'A3+C4+E4+F4', AM6 = 'A3+C4+E4+F#4';

const SONGS = {
  // 1·2장 집: 피치카토 + 클라리넷 대답, 손가락 딱
  house: { bpm: 96, sw: 0.12, parts: [
    { i: 'pbass', v: 0.2, n: 'A2 . E3 . A2 . C3 B2 | F2 . C3 . E2 . G#2 B2' },
    { i: 'pizz', v: 0.11, n: THEME + ' ' + REST4 },
    { i: 'clar', v: 0.06, n: REST4 + ' A4 - C5 . B4 - G#4 . | . . . . E4 - - . | A4 - B4 . C5 - E5 . | . . D5 - - - . .' },
    { d: 'snap', v: 0.05, p: '. . x . . . x .' },
    { d: 'hat', v: 0.018, p: '. x . . . x . x' },
  ] },
  // 타이틀·메뉴: 느긋한 보사노바
  title: { bpm: 88, sw: 0, parts: [
    { i: 'pbass', v: 0.17, n: 'A2 . . E3 A2 . . E3 | D3 . . A2 D3 . . A2 | E2 . . B2 E2 . . B2 | A2 . . E3 A2 . . G2 | F2 . . C3 F2 . . C3 | D3 . . A2 D3 . . A2 | E2 . . B2 E2 . . G#2 | A2 . . E3 A2 . . E2' },
    { i: 'ep', v: 0.035, n: comp([AM7, DM7, E7, AM7, FM7, DM7, E7, AM6], 'X . . X . . X . | . . X . X . . .') },
    { i: 'flute', v: 0.06, n: REST4 + ' E5 - - - C5 - D5 - | - - - - B4 - - - | A4 - - - C5 - E5 - | - - D5 - - - - .' },
    { d: 'rim', v: 0.035, p: 'x . . x . . x . | . . x . x . . .' },
    { d: 'shaker', v: 0.014, p: 'X x x x X x x x' },
    { d: 'kick', v: 0.07, p: 'x . . x x . . .' },
  ] },
  // 3·6장 박물관·백화점: 낮은 현 + 비브라폰, 째깍째깍
  museum: { bpm: 104, sw: 0, parts: [
    { i: 'pad', v: 0.045, n: 'A2+E3 ' + '- '.repeat(15) + 'F2+C3 ' + '- '.repeat(7) + 'E2+B2 ' + '- '.repeat(7) },
    { i: 'pbass', v: 0.15, n: 'A2 . . . . . . . | E2 . . . . . . . | F2 . . . . . . . | E2 . . . G#2 . . .' },
    { i: 'vibe', v: 0.09, n: THEME + ' ' + REST4 },
    { i: 'vibe', v: 0.045, n: REST4 + ' . . A5 . . . E5 . | . . . . . . . . | . . F5 . . . C5 . | . . B4 . . . G#4 .' },
    { d: 'tick', v: 0.03, p: 'x . . . x . . .' },
    { d: 'tock', v: 0.03, p: '. . x . . . x .' },
  ] },
  // 4·5장 수산시장·호텔 주방: 경쾌한 스윙, 마림바
  market: { bpm: 120, sw: 0.22, parts: [
    { i: 'pbass', v: 0.17, n: 'A2 . C3 . E3 . G3 . | D3 . F3 . A3 . C3 . | E2 . G#2 . B2 . D3 . | A2 . E2 . G2 . G#2 .' },
    { i: 'mar', v: 0.1, n: 'E5 . C5 D5 . B4 . . | A4 . C5 E5 . D5 . . | E5 . C5 D5 . B4 . G#4 | A4 . . . . . . .' },
    { i: 'ep', v: 0.03, n: comp([AM7, DM7, E7, AM7], '. . X . . . X .') },
    { d: 'hat', v: 0.026, p: 'X . x x X . x x' },
    { d: 'brush', v: 0.05, p: '. . x . . . x .' },
    { d: 'kick', v: 0.06, p: 'x . . . x . . .' },
  ] },
  // 7장 놀이공원: 3박자 왈츠, 오르골과 아코디언
  park: { bpm: 150, sw: 0, bar: 6, parts: [
    { i: 'pbass', v: 0.17, n: 'A2 . . . . . | E2 . . . . . | A2 . . . . . | E2 . . . . . | F2 . . . . . | C3 . . . . . | E2 . . . . . | A2 . . . . .' },
    { i: 'acc', v: 0.03, n: comp(['A3+C4+E4', 'G#3+B3+E4', 'A3+C4+E4', 'G#3+B3+E4', 'A3+C4+F4', 'G3+C4+E4', 'G#3+B3+E4', 'A3+C4+E4'], '. . X . X .', 6) },
    { i: 'mbox', v: 0.08, n: 'E5 . C5 . D5 . | B4 . . . . . | A4 . C5 . E5 . | D5 . . . . . | C5 . A4 . F5 . | E5 . . . . . | B4 . G#4 . B4 . | A4 . . . . .' },
    { d: 'bell', v: 0.02, p: 'x . . . . .' },
  ] },
  // 8장 연구소: 귀여운 전자음
  lab: { bpm: 108, sw: 0, parts: [
    { i: 'sbass', v: 0.182, n: 'A2 A2 . A2 C3 . A2 . | F2 F2 . F2 G2 . E2 .' },
    { i: 'chip', v: 0.031, n: 'A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 E4 G#4 B4 E5' },
    { i: 'chip', v: 0.07, n: REST4 + ' ' + THEME },
    { d: 'kick', v: 0.14, p: 'x . . . x . . .' },
    { d: 'hat', v: 0.028, p: '. x . x . x . x' },
    { d: 'snap', v: 0.049, p: '. . x . . . x .' },
    { d: 'blip', v: 0.028, p: '. . . . . . . x | . . . . . x . .' },
  ] },
  // 9장 생선왕의 성: 하프시코드와 호른, 팀파니
  castle: { bpm: 100, sw: 0, parts: [
    { i: 'pbass', v: 0.16, n: 'A2 . A2 . E2 . E2 . | F2 . F2 . E2 . G#2 .' },
    { i: 'harp', v: 0.035, n: 'A3 C4 E4 A4 E4 C4 A3 C4 | F3 A3 C4 F4 E3 G#3 B3 E4' },
    { i: 'horn', v: 0.07, n: 'E4 - - - C4 - D4 - | - - - - B3 - - - | A3 - - - C4 - E4 - | - - D4 - - - - - | A4 - - - G#4 - A4 - | B4 - - - E4 - - - | C5 - - - B4 - A4 - | G#4 - - - A4 - - -' },
    { d: 'timp', v: 0.12, p: 'x . . . . . . . | . . . . x . x .' },
  ] },
  // 비밀 아지트: 느린 로파이, 테마를 장조로
  den: { bpm: 72, sw: 0.15, parts: [
    { i: 'ep', v: 0.04, n: 'F3+A3+C4+E4 - - - - - - - | E3+G3+B3+D4 - - - - - - - | D3+F3+A3+C4 - - - - - - - | C3+E3+G3+B3 - - - - - - -' },
    { i: 'soft', v: 0.149, n: 'F2 . . . . . C3 . | E2 . . . . . B2 . | D2 . . . . . A2 . | C2 . . . . . G2 .' },
    { i: 'mbox', v: 0.057, n: 'A5 . . . F5 . G5 . | . . . . E5 . . . | D5 . . . F5 . A5 . | . . G5 . . . . . ' + REST4 },
    { d: 'kick', v: 0.057, p: 'x . . . . . . .' },
    { d: 'brush', v: 0.029, p: '. . . . x . . .' },
    { d: 'vinyl', v: 0.014, p: 'x x x x x x x x' },
  ] },
  // 쫓길 때: 빠른 재즈 추격
  chase: { bpm: 148, sw: 0, parts: [
    { i: 'pbass', v: 0.18, n: 'A2 A2 C3 A2 D3 A2 E3 G#2' },
    { i: 'brass', v: 0.05, n: 'A4+C5+E5 . . A4+C5+E5 . . G#4+B4+E5 . | . . A4+C5+E5 . . . . .' },
    { i: 'chip', v: 0.045, n: 'E5 C5 D5 . B4 . A4 . | C5 E5 D5 . . . . .' },
    { d: 'kick', v: 0.11, p: 'x . . . x . . .' },
    { d: 'snap', v: 0.06, p: '. . x . . . x .' },
    { d: 'hat', v: 0.024, p: 'x x X x x x X x' },
  ] },
};
// 수상할 때 장 곡 위에 얹는 긴장 층 (빠른 하이햇 + 아주 낮은 웅—)
const SUS = [
  { d: 'hat', v: 0.022, p: 'x x x x x x x x' },
  { i: 'pad', v: 0.035, n: 'A1+A2 ' + '- '.repeat(15) },
];
for (const k in SONGS) for (const pt of [...SONGS[k].parts, ...(k === 'house' ? SUS : [])]) { if (pt.n) pt.seq = score(pt.n); if (pt.p) pt.seq = beat(pt.p); }
const CALM = new Set(['title', 'den', 'chase']);

// 악기
function tone(type, f, at, dur, vol, o = {}) {
  const t = ac.currentTime + at, a = o.a || 0.006;
  const os = ac.createOscillator(), g = ac.createGain();
  os.type = type; os.frequency.setValueAtTime(f, t);
  if (o.det) os.detune.value = o.det;
  if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  if (o.hold) g.gain.setValueAtTime(vol, t + Math.max(a, dur - (o.rel || 0.08)));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n = os;
  for (const [ty, fq, q] of [o.lp && ['lowpass', o.lp, o.q || 0.7], o.hp && ['highpass', o.hp, 0.7]].filter(Boolean)) {
    const fl = ac.createBiquadFilter(); fl.type = ty; fl.frequency.value = fq; fl.Q.value = q; n.connect(fl); n = fl;
  }
  n.connect(g); g.connect(o.dest || bus);
  os.start(t); os.stop(t + dur + 0.05);
}
function hit(dur, vol, type, freq, at, q = 1) { noise(dur, vol, type, freq, at, q, bus); }
const INST = {
  // 휴대폰 스피커에서도 음이 들리게 배음 있는 베이스
  pbass: (f, at, d, v) => { tone('triangle', f, at, 0.32, v); tone('sawtooth', f, at, 0.22, v * 0.35, { lp: 900 }); },
  sbass: (f, at, d, v) => { tone('sawtooth', f, at, 0.2, v * 0.7, { lp: 700, q: 4 }); tone('square', f / 2, at, 0.16, v * 0.25, { lp: 300 }); },
  soft: (f, at, d, v) => { tone('sine', f, at, 0.9, v); tone('triangle', f * 2, at, 0.4, v * 0.25); },
  pizz: (f, at, d, v) => { tone('triangle', f, at, 0.3, v); tone('sawtooth', f, at, 0.12, v * 0.3, { lp: 2400 }); },
  clar: (f, at, d, v) => tone('square', f, at, d * 0.95 + 0.06, v, { a: 0.035, hold: 1, lp: 1500, q: 1 }),
  flute: (f, at, d, v) => { tone('sine', f, at, d + 0.1, v, { a: 0.07, hold: 1 }); tone('triangle', f * 2, at, d + 0.1, v * 0.12, { a: 0.07, hold: 1 }); },
  ep: (f, at, d, v) => { tone('sine', f, at, Math.max(0.5, d + 0.3), v); tone('triangle', f * 2, at, 0.25, v * 0.35); },
  vibe: (f, at, d, v) => { tone('sine', f, at, 1.1, v); tone('sine', f * 4, at, 0.25, v * 0.3); },
  mar: (f, at, d, v) => { tone('sine', f, at, 0.35, v); tone('sine', f * 4, at, 0.06, v * 0.5); },
  mbox: (f, at, d, v) => { tone('sine', f, at, 0.9, v); tone('sine', f * 3, at, 0.3, v * 0.25); },
  acc: (f, at, d, v) => { tone('square', f, at, 0.2, v, { a: 0.02, lp: 1600 }); tone('sawtooth', f, at, 0.2, v * 0.6, { a: 0.02, lp: 1600, det: 9 }); },
  chip: (f, at, d, v) => tone('square', f, at, Math.min(0.2, d), v, { lp: 3200 }),
  harp: (f, at, d, v) => { tone('sawtooth', f, at, 0.3, v, { hp: 350, lp: 4500 }); tone('square', f * 2, at, 0.12, v * 0.3, { hp: 600, lp: 4000 }); },
  horn: (f, at, d, v) => tone('sawtooth', f, at, d * 0.95 + 0.1, v, { a: 0.07, hold: 1, lp: 850, q: 1 }),
  brass: (f, at, d, v) => tone('sawtooth', f, at, 0.17, v, { a: 0.01, lp: 1800, q: 1.5 }),
  pad: (f, at, d, v) => { tone('sawtooth', f, at, d + 0.3, v, { a: 0.4, hold: 1, rel: 0.3, lp: 600 }); tone('sawtooth', f, at, d + 0.3, v, { a: 0.4, hold: 1, rel: 0.3, lp: 600, det: 12 }); },
};
const DRUM = {
  kick: (at, v) => tone('sine', 130, at, 0.2, v * 1.6, { f1: 45 }),
  snap: (at, v) => hit(0.08, v * 1.5, 'bandpass', 2200, at, 1.2),
  brush: (at, v) => hit(0.16, v, 'bandpass', 3200, at, 0.6),
  hat: (at, v) => hit(0.035, v * 1.4, 'highpass', 7000, at),
  shaker: (at, v) => hit(0.06, v, 'highpass', 5200, at),
  rim: (at, v) => { tone('triangle', 1650, at, 0.04, v); hit(0.025, v * 0.8, 'bandpass', 3000, at, 2); },
  tick: (at, v) => tone('sine', 2100, at, 0.035, v),
  tock: (at, v) => tone('sine', 1500, at, 0.035, v),
  bell: (at, v) => { tone('sine', 2600, at, 0.5, v); tone('sine', 3900, at, 0.3, v * 0.4); },
  blip: (at, v) => tone('square', 1800, at, 0.06, v, { f1: 2600, lp: 4000 }),
  timp: (at, v) => { tone('sine', 98, at, 0.7, v, { f1: 86 }); tone('triangle', 196, at, 0.25, v * 0.4); hit(0.1, v * 0.5, 'lowpass', 400, at); },
  vinyl: (at, v) => { if (Math.random() < 0.3) hit(0.01, v * (0.5 + Math.random()), 'highpass', 3000 + Math.random() * 4000, at + Math.random() * 0.1); },
};

let cur = null, want = 'title', fadeAt = 0;
const mood = { chase: false, sus: 0, hidden: false };
function schedule() {
  if (!ac) return;
  const goal = mood.chase && !CALM.has(want) ? 'chase' : want;
  const now = ac.currentTime;
  // 곡 바꾸기: 잠깐 줄였다가 새 곡을 처음부터 (쫓김으로는 빠르게, 돌아올 때는 천천히)
  if (goal !== cur && !fadeAt) {
    const fast = goal === 'chase' || !cur;
    fadeAt = now + (fast ? 0.06 : 0.35);
    bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0.0001, fadeAt);
    pending = goal;
  }
  if (fadeAt && now >= fadeAt) {
    cur = pending; fadeAt = 0; step = 0; nextT = now + 0.05;
    bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(0.0001, now);
    bus.gain.linearRampToValueAtTime(1, now + (cur === 'chase' ? 0.05 : 0.6));
  }
  if (!cur || fadeAt) { if (nextT < now) nextT = now + 0.05; return; }
  const S = SONGS[cur], st = 60 / S.bpm / 2;
  const parts = mood.sus > 0.35 && !CALM.has(cur) ? S.parts.concat(SUS) : S.parts;
  while (nextT < now + 0.15) {
    const at = Math.max(0, nextT - now + (step % 2 ? S.sw * st : 0));
    for (const pt of parts) {
      const x = pt.seq[step % pt.seq.length];
      if (!x) continue;
      if (pt.d) DRUM[pt.d](at, pt.v * x);
      else for (const n of x.notes) INST[pt.i](N(n), at, x.len * st, pt.v / Math.sqrt(x.notes.length));
    }
    step++;
    nextT += st;
  }
}
let pending = null;

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
  // 지금 화면에 맞는 곡 (같은 곡이면 그대로 이어서)
  setSong(name) { if (SONGS[name]) want = name; },
  // 게임 분위기: chase 쫓기는 중, sus 0~1 수상함, hidden 숨는 중(음악이 벽 너머처럼 먹먹해진다)
  setMood(chase, sus = 0, hidden = false) {
    mood.chase = !!chase; mood.sus = sus;
    if (muffle && hidden !== mood.hidden) muffle.frequency.setTargetAtTime(hidden ? 700 : 16000, ac.currentTime, 0.12);
    mood.hidden = hidden;
  },
  suspend() { if (ac && ac.state === 'running') ac.suspend(); },
  resume() { if (ac && ac.state === 'suspended') ac.resume(); },
};
