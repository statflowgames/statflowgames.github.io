// 임시 효과음: 음원 납품 전까지 WebAudio로 합성한다. ?mute 로 끈다.
const SFX = (() => {
  const muted = new URLSearchParams(location.search).has('mute');
  let ctx = null, master = null, noiseBuf = null;
  function init() {
    if (ctx || muted) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function noise(dur, f0, f1, q, peak, type = 'bandpass', delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, peak, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.05);
  }
  function tone(type, f0, f1, dur, peak, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); env(g, t, 0.004, peak, dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  const v = () => 0.9 + Math.random() * 0.2;
  return {
    resume,
    swing: (big) => noise(big ? 0.22 : 0.14, 600 * v(), big ? 2600 : 3400, 1.2, big ? 0.5 : 0.35),
    hit: (heavy) => { noise(0.12, 1800 * v(), 300, 0.8, 0.9); tone('sine', heavy ? 140 : 190 * v(), 45, heavy ? 0.28 : 0.16, heavy ? 0.9 : 0.7); if (heavy) noise(0.3, 400, 80, 0.7, 0.6, 'lowpass'); },
    crit: () => { tone('square', 900, 1800, 0.08, 0.15); noise(0.2, 3000, 800, 1, 0.5); },
    guard: () => { tone('triangle', 820 * v(), 760, 0.25, 0.35); tone('square', 1240 * v(), 1100, 0.12, 0.12); noise(0.06, 4000, 2000, 2, 0.4); },
    parry: () => { tone('sine', 1320, 1320, 0.5, 0.35); tone('sine', 1980, 1980, 0.4, 0.2, 0.02); noise(0.08, 5000, 3000, 3, 0.4); },
    jump: () => noise(0.12, 500, 1400, 1, 0.25),
    land: () => noise(0.12, 500, 120, 0.8, 0.45, 'lowpass'),
    roll: () => noise(0.3, 300, 900, 0.7, 0.35),
    step: () => noise(0.05, 900 * v(), 300, 1, 0.08),
    brk: () => { noise(0.25, 1200, 200, 0.6, 0.8); tone('square', 160, 60, 0.12, 0.15); },
    coin: () => { tone('square', 1400, 1400, 0.06, 0.12); tone('square', 2100, 2100, 0.12, 0.12, 0.06); },
    heal: () => { tone('sine', 660, 990, 0.25, 0.3); tone('sine', 990, 1320, 0.3, 0.2, 0.1); },
    die: () => { noise(0.5, 900, 120, 0.6, 0.5); tone('sawtooth', 240, 60, 0.4, 0.12); },
    yelp: () => tone('sawtooth', 700 * v(), 380, 0.12, 0.12),
    shout: () => { tone('sawtooth', 220 * v(), 160, 0.18, 0.18); noise(0.15, 900, 500, 2, 0.2); },
    throwS: () => noise(0.18, 900, 2500, 2, 0.3),
    roar: () => { tone('sawtooth', 110, 70, 1.0, 0.4); tone('sawtooth', 165, 90, 0.9, 0.25); noise(1.0, 500, 150, 0.5, 0.5, 'lowpass'); },
    smash: () => { tone('sine', 90, 30, 0.6, 1.0); noise(0.6, 600, 60, 0.5, 1.0, 'lowpass'); },
    magic: () => { tone('sine', 400, 900, 0.3, 0.2); tone('triangle', 600, 1200, 0.3, 0.12, 0.05); },
    awaken: () => { tone('sawtooth', 220, 880, 0.5, 0.25); tone('square', 330, 1320, 0.5, 0.12, 0.05); noise(0.6, 300, 4000, 0.6, 0.4); },
    wall: () => { tone('sine', 70, 40, 0.8, 1.0); noise(0.8, 2000, 100, 0.4, 0.8); tone('triangle', 1320, 880, 0.6, 0.2); },
    go: () => { tone('square', 880, 880, 0.08, 0.15); tone('square', 1320, 1320, 0.12, 0.15, 0.1); },
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, 0.18, 0.15, i * 0.12)),
    lose: () => [392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.98, 0.35, 0.25, i * 0.25)),
  };
})();
