// 임시 소리: WebAudio 합성 (실제 음원이 오면 교체). ?mute 면 엔진을 아예 켜지 않음
'use strict';

const SFX = (() => {
  const muted = /[?&]mute\b/.test(location.search);
  let ctx = null, master = null, musicBus = null, noiseBuf = null;
  let musicTimer = null, mood = null, want = null, beat = 0, nextT = 0;

  function init() {
    if (muted || ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.7;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  function unlock() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); if (ctx && want && !mood) music(want); }
  window.addEventListener('pointerdown', unlock);

  function tone(f, t, dur, type = 'triangle', vol = 0.3, bus = master, f2 = null) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol = 0.3, ftype = 'lowpass', freq = 1200, bus = master, q = 1) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // 줄을 뜯는 소리 (우드 비슷하게)
  function pluck(f, t, vol = 0.22, dur = 1.1, bus = musicBus) {
    tone(f, t, dur, 'triangle', vol, bus);
    tone(f * 2, t, dur * 0.4, 'sine', vol * 0.35, bus);
    noise(t, 0.04, vol * 0.4, 'bandpass', f * 3, bus, 4);
  }

  const S = {
    click(t) { tone(880, t, 0.06, 'square', 0.06); tone(1320, t + 0.02, 0.05, 'sine', 0.05); },
    open(t) { noise(t, 0.25, 0.12, 'bandpass', 900, master, 0.7); tone(520, t, 0.18, 'sine', 0.06, master, 760); },
    coin(t) { [1568, 2093, 2637].forEach((f, i) => tone(f, t + i * 0.06, 0.25, 'sine', 0.12)); },
    buy(t) { tone(660, t, 0.08, 'triangle', 0.1); tone(990, t + 0.06, 0.12, 'triangle', 0.08); },
    page(t) { noise(t, 0.35, 0.18, 'highpass', 2500); noise(t + 0.12, 0.2, 0.1, 'bandpass', 1800, master, 2); },
    sail(t) { noise(t, 1.2, 0.18, 'bandpass', 500, master, 0.6); tone(220, t, 0.6, 'sine', 0.05, master, 330); },
    wave(t) { noise(t, 1.6, 0.14, 'lowpass', 700); },
    arrow(t) { noise(t, 0.35, 0.22, 'bandpass', 2600, master, 3); noise(t + 0.08, 0.3, 0.15, 'bandpass', 1800, master, 3); },
    hit(t) { noise(t, 0.25, 0.5, 'lowpass', 500); tone(120, t, 0.22, 'sine', 0.35, master, 50); },
    boom(t) { noise(t, 0.9, 0.6, 'lowpass', 380); tone(80, t, 0.6, 'sine', 0.4, master, 35); noise(t + 0.05, 0.6, 0.25, 'bandpass', 1600, master, 0.8); },
    splash(t) { noise(t, 0.7, 0.35, 'bandpass', 1100, master, 0.5); },
    clash(t) { for (let i = 0; i < 4; i++) { tone(1900 + Math.random() * 900, t + i * 0.09, 0.18, 'square', 0.05); noise(t + i * 0.09, 0.08, 0.2, 'highpass', 3000); } },
    drum(t) { tone(110, t, 0.3, 'sine', 0.4, master, 60); noise(t, 0.12, 0.2, 'lowpass', 800); },
    win(t) { [587, 659, 784, 880, 1175].forEach((f, i) => pluck(f, t + i * 0.13, 0.3, 1.4, master)); },
    lose(t) { [440, 392, 349, 294].forEach((f, i) => pluck(f, t + i * 0.22, 0.25, 1.4, master)); },
    discover(t) { [880, 1175, 1319, 1760].forEach((f, i) => tone(f, t + i * 0.09, 0.6, 'sine', 0.1)); noise(t, 0.6, 0.05, 'highpass', 5000); },
    storm(t) { noise(t, 2.2, 0.35, 'lowpass', 300); noise(t + 0.4, 1.4, 0.4, 'lowpass', 160); },
    bad(t) { tone(220, t, 0.3, 'sawtooth', 0.08, master, 150); },
    // 박물관 전용
    pop(t) { tone(600, t, 0.08, 'sine', 0.12, master, 1100); },
    heart(t) { tone(1046, t, 0.12, 'sine', 0.08); tone(1318, t + 0.07, 0.16, 'sine', 0.07); },
    scratch(t) { noise(t, 0.09, 0.07, 'bandpass', 2200 + Math.random() * 1500, master, 1.5); },
    snap(t) { tone(1400, t, 0.05, 'square', 0.06); noise(t, 0.06, 0.18, 'highpass', 3000); tone(700, t + 0.03, 0.12, 'triangle', 0.08); },
    stamp(t) { noise(t, 0.12, 0.45, 'lowpass', 400); tone(140, t, 0.18, 'sine', 0.3, master, 70); },
    camera(t) { noise(t, 0.05, 0.3, 'highpass', 4000); noise(t + 0.07, 0.04, 0.2, 'highpass', 3000); tone(2400, t, 0.08, 'sine', 0.05); },
    cheer(t) { for (let i = 0; i < 10; i++) noise(t + i * 0.05, 0.4, 0.05, 'bandpass', 900 + Math.random() * 900, master, 1.2); [784, 988, 1175].forEach((f, i) => tone(f, t + i * 0.08, 0.3, 'triangle', 0.07)); },
    fanfare(t) { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => { tone(f, t + i * 0.12, 0.35, 'triangle', 0.13); tone(f / 2, t + i * 0.12, 0.35, 'sine', 0.08); }); noise(t + 0.6, 0.8, 0.08, 'highpass', 5000); },
    rare(t) { [523, 784, 1046, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.07, 0.9, 'sine', 0.09)); noise(t, 1.2, 0.05, 'highpass', 6000); },
    water(t) { noise(t, 0.9, 0.2, 'lowpass', 900); for (let i = 0; i < 5; i++) tone(500 + Math.random() * 600, t + 0.1 + i * 0.12, 0.08, 'sine', 0.05, master, 900); },
    tick(t) { tone(1800, t, 0.03, 'square', 0.03); },
  };
  function play(name) {
    if (!ctx || !S[name]) return;
    try { S[name](ctx.currentTime + 0.01); } catch (e) { /* */ }
  }

  // ---------- 음악: 「바람의 책」 동기 (D E G A C, 84 BPM) ----------
  const SCALE = [146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
  const MOTIF = [5, 7, 8, 7, 5, 4, 3, 5];          // 바람의 책 첫 마디
  function scheduleBeat(t) {
    const spb = 60 / (mood === 'battle' ? 120 : 84);
    const bar = beat % 16;
    if (mood === 'battle') {
      if (bar % 2 === 0) S.drum(t);
      if (bar % 4 === 3) noise(t, 0.08, 0.15, 'bandpass', 2400, musicBus, 2);
      if (bar % 2 === 0) pluck(SCALE[[0, 0, 2, 3, 0, 0, 4, 3][(bar / 2) | 0] ], t, 0.18, 0.5);
      if (Math.random() < 0.45) pluck(SCALE[5 + irand(0, 4)], t + spb / 2, 0.12, 0.4);
    } else {
      if (bar === 0) { tone(73.4, t, spb * 16, 'sine', 0.09, musicBus); tone(110, t, spb * 16, 'sine', 0.05, musicBus); }
      const phrase = Math.floor(beat / 16) % 4;
      if (phrase === 0 && bar < 8) pluck(SCALE[MOTIF[bar]], t, 0.2);
      else if (Math.random() < (mood === 'port' ? 0.55 : 0.38)) pluck(SCALE[irand(2, 9)], t, 0.14 + Math.random() * 0.06);
      if (mood === 'port' && bar % 4 === 0) noise(t, 0.09, 0.12, 'bandpass', 300, musicBus, 1.5);
      if (mood === 'sea' && bar === 8) noise(t, 3.0, 0.07, 'lowpass', 600, musicBus);
    }
    beat++;
    return spb;
  }
  function music(m) {
    want = m;
    if (!ctx || m === mood) return;
    mood = m;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (!m) return;
    beat = 0; nextT = ctx.currentTime + 0.1;
    musicTimer = setInterval(() => {
      while (nextT < ctx.currentTime + 0.25) nextT += scheduleBeat(nextT);
    }, 60);
  }
  return { play, music, unlock, get muted() { return muted; } };
})();
