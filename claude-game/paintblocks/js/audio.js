// 작은 합성 효과음. 주소에 ?mute 를 붙이면 출력만 0 (저장된 소리 설정은 그대로).
const MUTE = new URLSearchParams(location.search).has('mute');
let ac = null, master = null, on = true;

function tone(f0, f1, dur, type = 'sine', vol = 0.3, delay = 0) {
  if (!ac || !on) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.03);
}

const SFX = {
  pick: () => tone(620, 860, 0.07, 'triangle', 0.12),
  drop: () => { tone(430, 250, 0.16, 'sine', 0.35); tone(900, 540, 0.08, 'triangle', 0.06); },
  back: () => tone(520, 330, 0.12, 'triangle', 0.12),
  rot: () => tone(950, 1200, 0.05, 'square', 0.04),
  bad: () => tone(190, 130, 0.18, 'sawtooth', 0.07),
  undo: () => tone(560, 400, 0.09, 'triangle', 0.12),
  hint: () => { tone(700, 1400, 0.25, 'sine', 0.14); tone(1050, 2100, 0.2, 'sine', 0.06, 0.08); },
  click: () => tone(640, 0, 0.05, 'triangle', 0.1),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0, 0.32, 'triangle', 0.16, i * 0.085)),
};

export const Sound = {
  get on() { return on; },
  set(v) { on = !!v; },
  unlock() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain();
        master.gain.value = MUTE ? 0 : 0.6;
        master.connect(ac.destination);
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
  },
  play(name) { try { SFX[name]?.(); } catch (e) { /* 소리는 실패해도 게임은 계속 */ } },
};
