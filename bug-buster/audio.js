// 은하 방역대 - 사운드 엔진 (Web Audio로 직접 합성: 음원 파일 없음)
const Sound = (() => {
  let ctx = null, master, musicGain, sfxGain, noiseBuf;
  let muted = false, song = null, songName = '', step = 0, nextTime = 0, timer = null;
  const last = {};
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(master); master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(comp);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    timer = setInterval(schedule, 25);
  }

  function tone(dest, type, f0, t, dur, vol, f1, attack = 0.004) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dest, t, dur, vol, ftype, f0, f1) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = ftype; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
  }

  // ---- 작곡: 화음 진행 + 베이스 리듬 + 멜로디 + 드럼 ----
  // 멜로디 문자열: 16분음표 64칸, '.'은 쉼표
  function arpMelody(chords, rhythm, order) {
    const out = [];
    chords.forEach((ch, bar) => {
      let k = bar;
      for (let i = 0; i < 16; i++) {
        if (rhythm[i] === 'x') { out.push(ch[order[k % order.length] % 3] + 12 * (1 + Math.floor(order[k % order.length] / 3))); k++; }
        else out.push(null);
      }
    });
    return out;
  }
  const parseMel = s => s.trim().split(/\s+/).map(v => v === '.' ? null : +v);

  const C = (r, q) => q === 'm' ? [r, r + 3, r + 7] : [r, r + 4, r + 7];
  const SONGS = {
    title: { bpm: 96, chords: [C(57, 'm'), C(53), C(48), C(52)], bassPat: 'o.......o.......',
      kick: '................', snare: '................', hat: '....x.......x...', lead: 0.06,
      mel: null, arp: 'x.x.x.x.x.x.x.x.', order: [0, 1, 2, 3, 2, 1] },
    s1: { bpm: 132, chords: [C(45, 'm'), C(41), C(48), C(43)], bassPat: 'o.O.o.oO.o.O.oO.',
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...xx', lead: 0.1,
      mel: parseMel(`76 . 74 76 . 72 . 69 . 72 74 . 76 . . .
        77 . 76 77 . 72 . 69 . 72 77 . 76 . 74 .
        76 . 72 . 79 . 76 . 72 . 74 76 . 72 . .
        74 . 71 . 74 76 74 . 71 . 67 . 71 . 74 .`) },
    s2: { bpm: 140, chords: [C(50, 'm'), C(46), C(43, 'm'), C(45)], bassPat: 'oo.Oo.oOoo.Oo.oO',
      kick: 'x..x..x.x..x..x.', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', lead: 0.09,
      arp: 'x.xx.x.xx.x.xx.x', order: [3, 2, 4, 1, 3, 5, 2, 0] },
    s3: { bpm: 150, chords: [C(40, 'm'), C(48), C(50), C(47)], bassPat: 'oOoOoOoOoOoOoOoO',
      kick: 'x...x...x...x.x.', snare: '....x..x....x...', hat: '.x.x.x.x.x.x.x.x', lead: 0.09,
      arp: 'xx.xx.x.xx.xx.x.', order: [3, 4, 5, 4, 3, 1, 2, 4] },
    boss: { bpm: 164, chords: [C(48, 'm'), C(48, 'm'), C(44), C(43)], bassPat: 'oooOoooOoooOoOoO',
      kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x.xx', hat: 'xxxxxxxxxxxxxxxx', lead: 0.1,
      arp: 'x..x..x.x..x..x.', order: [3, 5, 4, 6, 3, 2, 4, 1] },
    s4: { bpm: 126, chords: [C(52), C(47), C(49, 'm'), C(45)], bassPat: 'o..o..O.o..o..O.',
      kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xx', lead: 0.09,
      arp: 'x.x.xx.x.x.xx.x.', order: [3, 4, 5, 4, 2, 4, 3, 1] },
    s5: { bpm: 112, chords: [C(50, 'm'), C(46), C(48), C(45, 'm')], bassPat: 'o.......O...o...',
      kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', lead: 0.08,
      arp: 'x..x..x.x..x..x.', order: [5, 4, 3, 2, 3, 4] },
    s6: { bpm: 144, chords: [C(41, 'm'), C(44), C(39), C(46)], bassPat: 'o.oOo.oOo.oOo.oO',
      kick: 'x..x....x..x....', snare: '....x.......x.x.', hat: 'xx.xx.xx.xx.xx.x', lead: 0.09,
      arp: 'x.xx.x.xx.xx.x.x', order: [3, 5, 4, 3, 2, 3, 5, 6] },
    s7: { bpm: 138, chords: [C(50, 'm'), C(51), C(50, 'm'), C(49)], bassPat: 'oo.o.oo.oo.o.oO.',
      kick: 'x...x..xx...x...', snare: '....x.......x...', hat: '.xx.xx.x.xx.xx.x', lead: 0.1,
      arp: 'x.x.x..xx.x.x..x', order: [3, 4, 3, 5, 4, 3, 2, 1] },
    s8: { bpm: 128, chords: [C(53), C(50, 'm'), C(46), C(48)], bassPat: 'o.O.o.O.o.O.o.O.',
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', lead: 0.09,
      arp: 'xx.x.xx.xx.x.xx.', order: [3, 4, 5, 6, 5, 4] },
    s9: { bpm: 156, chords: [C(40, 'm'), C(41), C(40, 'm'), C(47)], bassPat: 'oOoOoOoOoOoOoOoO',
      kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', lead: 0.1,
      arp: 'x.xx.xx.x.xx.xx.', order: [3, 4, 3, 5, 3, 6, 5, 4] },
    s10: { bpm: 150, chords: [C(45, 'm'), C(41), C(43), C(44)], bassPat: 'oo.Ooo.Ooo.OoOoO',
      kick: 'x..x..x.x..x..x.', snare: '....x.......x.xx', hat: 'x.xxx.xxx.xxx.xx', lead: 0.1,
      arp: 'x.x.xx.xx.x.xx.x', order: [3, 5, 6, 5, 4, 3, 2, 4] },
    final: { bpm: 172, chords: [C(45, 'm'), C(44), C(43), C(44)], bassPat: 'oOoOoOoOoOoOoOoO',
      kick: 'x.x.x.x.x.x.x.xx', snare: '....x..x....x.xx', hat: 'xxxxxxxxxxxxxxxx', lead: 0.11,
      arp: 'xx.xx.xx.xx.x.xx', order: [3, 6, 5, 4, 6, 3, 5, 2] },
    over: { bpm: 80, chords: [C(45, 'm'), C(41), C(40), C(40)], bassPat: 'o...............',
      kick: '................', snare: '................', hat: '................', lead: 0.07,
      arp: 'x...x...x...x...', order: [2, 1, 0, 1] },
  };
  for (const k in SONGS) {
    const s = SONGS[k];
    if (!s.mel) s.mel = arpMelody(s.chords, s.arp, s.order);
  }

  function playStep(i, t) {
    const s = song, sd = 60 / s.bpm / 4, bar = Math.floor(i / 16) % 4, st = i % 16;
    const root = s.chords[bar][0];
    if (s.kick[st] === 'x') tone(musicGain, 'sine', 160, t, 0.16, 0.9, 38);
    if (s.snare[st] === 'x') { noise(musicGain, t, 0.14, 0.35, 'highpass', 1500); tone(musicGain, 'triangle', 220, t, 0.08, 0.25, 120); }
    if (s.hat[st] === 'x') noise(musicGain, t, 0.03, 0.12, 'highpass', 8000);
    const b = s.bassPat[st];
    if (b !== '.') {
      const f = mtof(root - 12 + (b === 'O' ? 12 : 0));
      const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(1400, t); fl.frequency.exponentialRampToValueAtTime(200, t + sd);
      g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + sd * 0.95);
      o.connect(fl); fl.connect(g); g.connect(musicGain); o.start(t); o.stop(t + sd);
    }
    const m = s.mel[i % s.mel.length];
    if (m) { tone(musicGain, 'square', mtof(m), t, sd * 1.6, s.lead); tone(musicGain, 'triangle', mtof(m + 12), t, sd * 1.2, s.lead * 0.4); }
    if (st % 4 === 0 && songName === 'title') s.chords[bar].forEach(n => tone(musicGain, 'triangle', mtof(n + 12), t, sd * 4, 0.05, null, 0.05));
  }

  function schedule() {
    if (!ctx || !song) return;
    while (nextTime < ctx.currentTime + 0.12) {
      playStep(step, nextTime);
      nextTime += 60 / song.bpm / 4; step = (step + 1) % 64;
    }
  }

  function music(name) {
    if (!ctx || songName === name) return;
    songName = name; song = SONGS[name] || null; step = 0;
    nextTime = ctx.currentTime + 0.05;
  }

  // ---- 효과음 ----
  function ok(name, gap) {
    const now = ctx.currentTime;
    if (last[name] && now - last[name] < gap) return false;
    last[name] = now; return true;
  }
  const SFX = {
    shoot() { if (ok('shoot', 0.07)) tone(sfxGain, 'square', 1200, ctx.currentTime, 0.05, 0.035, 500); },
    missile() { if (ok('missile', 0.15)) noise(sfxGain, ctx.currentTime, 0.12, 0.08, 'bandpass', 3000, 800); },
    hit() { if (ok('hit', 0.04)) tone(sfxGain, 'square', 260, ctx.currentTime, 0.05, 0.05, 90); },
    pop() { if (!ok('pop', 0.03)) return; const t = ctx.currentTime;
      noise(sfxGain, t, 0.18, 0.3, 'lowpass', 3000, 200); tone(sfxGain, 'sine', 300, t, 0.12, 0.25, 60); },
    boom() { const t = ctx.currentTime;
      noise(sfxGain, t, 0.6, 0.6, 'lowpass', 2500, 60); tone(sfxGain, 'sine', 120, t, 0.5, 0.6, 25); },
    pickup() { if (ok('pickup', 0.045)) tone(sfxGain, 'sine', 900 + Math.random() * 300, ctx.currentTime, 0.07, 0.07, 1800); },
    heart() { const t = ctx.currentTime; [72, 76, 79].forEach((n, i) => tone(sfxGain, 'sine', mtof(n), t + i * 0.07, 0.15, 0.15)); },
    levelup() { const t = ctx.currentTime; [72, 76, 79, 84, 88].forEach((n, i) => tone(sfxGain, 'square', mtof(n), t + i * 0.06, 0.18, 0.09)); },
    select() { const t = ctx.currentTime; tone(sfxGain, 'triangle', 660, t, 0.08, 0.2); tone(sfxGain, 'triangle', 990, t + 0.06, 0.12, 0.2); },
    hurt() { const t = ctx.currentTime; tone(sfxGain, 'sawtooth', 500, t, 0.35, 0.3, 60); noise(sfxGain, t, 0.25, 0.3, 'lowpass', 1500, 100); },
    shield() { tone(sfxGain, 'sine', 1500, ctx.currentTime, 0.25, 0.2, 400); },
    bomb() { const t = ctx.currentTime;
      noise(sfxGain, t, 1.4, 0.8, 'lowpass', 6000, 40); tone(sfxGain, 'sine', 90, t, 1.2, 0.8, 18); tone(sfxGain, 'sawtooth', 400, t, 0.6, 0.15, 50); },
    warn() { const t = ctx.currentTime; for (let i = 0; i < 6; i++) tone(sfxGain, 'square', i % 2 ? 440 : 660, t + i * 0.25, 0.24, 0.12); },
    clear() { const t = ctx.currentTime; [60, 64, 67, 72, 67, 72, 76, 79].forEach((n, i) => tone(sfxGain, 'square', mtof(n + 12), t + i * 0.1, 0.25, 0.1)); },
    start() { const t = ctx.currentTime; tone(sfxGain, 'sawtooth', 200, t, 0.5, 0.15, 1600); },
  };

  return {
    init, music,
    play(name) { if (ctx && !muted && SFX[name]) SFX[name](); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.9; return muted; },
    get muted() { return muted; },
    suspend() { if (ctx) ctx.suspend(); },
    resume() { if (ctx) ctx.resume(); },
  };
})();
