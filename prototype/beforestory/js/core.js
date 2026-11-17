// 공용: 저장, 소리(합성음), 작은 도구들
(function (root) {
  'use strict';
  const params = new URLSearchParams(location.search);
  const MUTE = params.has('mute');

  // ───── 저장 ─────
  const KEY = 'villainess.v1';
  const Save = {
    load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 저장 불가 환경 */ } },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { } },
    settings() { try { return JSON.parse(localStorage.getItem(KEY + '.set') || '{}'); } catch (e) { return {}; } },
    setSettings(v) { try { localStorage.setItem(KEY + '.set', JSON.stringify(v)); } catch (e) { } },
  };

  // ───── 소리 ─────
  const N = (name) => { // 'A4' → Hz
    const m = /^([A-G])(#|b)?(\d)$/.exec(name);
    const base = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (base + (parseInt(m[3], 10) - 4) * 12) / 12);
  };

  // '원작의 테마' 동기 (docs/music-brief-gpt.md 1절) — [음, 박]
  const MOTIF = [['A4', 1], ['D5', 1], ['F5', 1], ['E5', 2], ['D5', 1], ['Bb4', 1], ['D5', 1], ['G5', 1], ['F5', 3]];
  const PROPHECY_SONG = { bpm: 72, wave: 'box', vol: 0.18, mel: MOTIF.concat([['F5', 1], ['E5', 1], ['D5', 1], ['C#5', 2], ['A4', 1], ['Bb4', 1], ['G4', 1], ['E5', 1], ['D5', 2], ['A4', 1]]),
    bass: [['D3', 3], ['A2', 3], ['G2', 3], ['D3', 3], ['D3', 3], ['A2', 3], ['G2', 3], ['A2', 3]] };
  const MANOR_SONG = { bpm: 138, wave: 'flute', vol: 0.10,
    mel: [['A4', 1], ['D5', 1], ['F#5', 1], ['E5', 2], ['D5', 1], ['B4', 1], ['D5', 1], ['G5', 1], ['F#5', 3],
      ['F#5', 1], ['G5', 1], ['A5', 1], ['B5', 2], ['A5', 1], ['G5', 1], ['F#5', 1], ['E5', 1], ['D5', 2], ['R', 1],
      ['B4', 1], ['C#5', 1], ['D5', 1], ['E5', 2], ['F#5', 1], ['G5', 1], ['F#5', 1], ['E5', 1], ['A4', 3],
      ['A4', 1], ['D5', 1], ['F#5', 1], ['E5', 2], ['C#5', 1], ['D5', 3], ['R', 3]],
    bass: [['D3', 1], ['F#3', 1], ['A3', 1], ['G2', 1], ['B3', 1], ['D4', 1], ['A2', 1], ['C#4', 1], ['E4', 1], ['D3', 1], ['F#3', 1], ['A3', 1],
      ['D3', 1], ['F#3', 1], ['A3', 1], ['G2', 1], ['B3', 1], ['D4', 1], ['A2', 1], ['C#4', 1], ['E4', 1], ['D3', 1], ['F#3', 1], ['A3', 1],
      ['G2', 1], ['B3', 1], ['D4', 1], ['D3', 1], ['F#3', 1], ['A3', 1], ['E3', 1], ['G3', 1], ['B3', 1], ['A2', 1], ['C#4', 1], ['E4', 1],
      ['D3', 1], ['F#3', 1], ['A3', 1], ['A2', 1], ['C#4', 1], ['E4', 1], ['D3', 1], ['F#3', 1], ['A3', 1], ['D3', 1], ['A3', 1], ['D4', 1]] };
  const SONGS = { prophecy: PROPHECY_SONG, manor: MANOR_SONG };

  const Sound = {
    ctx: null, master: null, music: null, on: true, musicOn: true, cur: null, timer: null,
    init() {
      if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = MUTE ? 0 : 0.8; this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain(); this.music.gain.value = 0.9; this.music.connect(this.master);
      const st = Save.settings();
      if (st.sound === false) this.on = false;
      if (st.music === false) this.musicOn = false;
      if (this.cur) { const c = this.cur; this.cur = null; this.bgm(c); }
    },
    tone(freq, t, dur, wave, vol, dest) {
      const c = this.ctx; if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      let w = wave;
      if (wave === 'box') {
        w = 'sine';
        const o2 = c.createOscillator(), g2 = c.createGain();
        o2.type = 'sine'; o2.frequency.value = freq * 4.01;
        g2.gain.setValueAtTime(vol * 0.25, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o2.connect(g2); g2.connect(dest); o2.start(t); o2.stop(t + 0.3);
      }
      if (wave === 'flute') w = 'triangle';
      o.type = w; o.frequency.value = freq;
      const atk = wave === 'flute' ? 0.04 : 0.005;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.05);
    },
    sfx(name) {
      if (!this.ctx || !this.on) return;
      const t = this.ctx.currentTime, M = this.master;
      const T = (f, d, dur, w, v) => this.tone(f, t + d, dur, w || 'sine', v || 0.2, M);
      switch (name) {
        case 'tap': T(880, 0, 0.08, 'triangle', 0.08); break;
        case 'great': [N('D5'), N('F#5'), N('A5'), N('D6')].forEach((f, i) => T(f, i * 0.06, 0.4, 'box', 0.18)); break;
        case 'good': T(N('A5'), 0, 0.25, 'box', 0.14); T(N('D6'), 0.08, 0.3, 'box', 0.12); break;
        case 'fail': T(N('E4'), 0, 0.3, 'triangle', 0.14); T(N('C4'), 0.15, 0.4, 'triangle', 0.12); break;
        case 'pass': [N('D5'), N('A5'), N('F#5'), N('D6')].forEach((f, i) => T(f, i * 0.09, 0.6, 'box', 0.2)); break;
        case 'nope': T(N('A3'), 0, 0.5, 'triangle', 0.18); T(N('F3'), 0.2, 0.6, 'triangle', 0.16); break;
        case 'page': T(N('A4'), 0, 0.6, 'box', 0.16); T(N('D5'), 0.2, 0.6, 'box', 0.16); T(N('F5'), 0.4, 0.9, 'box', 0.16); break;
        case 'strike': {
          const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 0.35, c.sampleRate), d = b.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.5;
          const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
          f.type = 'bandpass'; f.frequency.value = 2200; g.gain.value = 0.5;
          s.buffer = b; s.connect(f); f.connect(g); g.connect(M); s.start(t);
          break;
        }
        case 'coin': T(N('E6'), 0, 0.12, 'square', 0.05); T(N('B6'), 0.07, 0.25, 'square', 0.05); break;
        case 'heart': T(N('F#5'), 0, 0.2, 'sine', 0.15); T(N('A5'), 0.1, 0.3, 'sine', 0.15); break;
        case 'month': T(N('D5'), 0, 0.2, 'triangle', 0.1); T(N('A5'), 0.12, 0.35, 'triangle', 0.1); break;
      }
    },
    bgm(name) {
      if (this.cur === name) return;
      this.cur = name;
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (!this.ctx || !name || !this.musicOn) return;
      const song = SONGS[name]; if (!song) return;
      const beat = 60 / song.bpm;
      const play = () => {
        if (this.cur !== name || !this.musicOn) return;
        const t0 = this.ctx.currentTime + 0.05;
        let t = t0;
        for (const [n, b] of song.mel) { if (n !== 'R') this.tone(N(n), t, b * beat * 0.95 + 0.2, song.wave, song.vol, this.music); t += b * beat; }
        let tb = t0;
        for (const [n, b] of song.bass) { this.tone(N(n), tb, b * beat * 0.9 + 0.1, 'sine', song.vol * 0.6, this.music); tb += b * beat; }
        const len = Math.max(t, tb) - t0;
        this.timer = setTimeout(play, len * 1000 - 30);
      };
      play();
    },
    setSound(v) { this.on = v; const st = Save.settings(); st.sound = v; Save.setSettings(st); },
    setMusic(v) {
      this.musicOn = v; const st = Save.settings(); st.music = v; Save.setSettings(st);
      const c = this.cur; this.cur = null; if (v) this.bgm(c); else if (this.timer) clearTimeout(this.timer);
      if (!v) this.cur = c;
    },
  };

  const U = {
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; },
    esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    sign: v => (v > 0 ? '+' : '') + v,
  };

  root.CORE = { Save, Sound, U, MUTE };
})(window);
