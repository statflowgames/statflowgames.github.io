'use strict';
// 문구, 저장, 소리, 입력

const LANG = /^ko/i.test(navigator.language || '') ? 'ko' : 'en';
const TXT = {
  ko: {
    title: '꿈길 배달부', sub: 'DREAM COURIER', tap: '화면을 눌러 출발',
    how: '탭하면 중력이 뒤집혀요', how2: '꿈 조각 30개를 모으면 배달 완료 + 꿈 방패',
    best: '최고 점수', score: '점수', dist: '거리', frag: '꿈 조각', deliv: '배달',
    over: '꿈에서 깼어요…', retry: '다시 배달하기', home: '처음으로', newBest: '새 기록!',
    paused: '일시정지', resume: '계속하기', delivered: '배달 완료!', shieldOn: '꿈 방패 장착',
    rotate: '화면을 가로로 돌려주세요', night: '{n}번째 밤',
    phases: ['저녁', '밤', '한밤', '새벽', '아침'], sound: '효과음', music: '음악'
  },
  en: {
    title: 'Dream Courier', sub: 'DELIVER DREAMS ALL NIGHT', tap: 'Tap to start',
    how: 'Tap to flip gravity', how2: 'Collect 30 dream shards to deliver + get a shield',
    best: 'Best', score: 'Score', dist: 'Distance', frag: 'Shards', deliv: 'Deliveries',
    over: 'You woke up…', retry: 'Deliver again', home: 'Title', newBest: 'New best!',
    paused: 'Paused', resume: 'Resume', delivered: 'Delivered!', shieldOn: 'Dream shield ready',
    rotate: 'Please rotate to landscape', night: 'Night {n}',
    phases: ['Dusk', 'Night', 'Midnight', 'Dawn', 'Morning'], sound: 'Sound', music: 'Music'
  }
};
function t(k, o) {
  let s = TXT[LANG][k] !== undefined ? TXT[LANG][k] : TXT.en[k];
  if (o) for (const n in o) s = String(s).replace('{' + n + '}', o[n]);
  return s;
}
const FONT = '"Jua","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';

const Save = {
  key: 'dreamcourier.v1',
  data: { best: 0, bestDist: 0, frags: 0, deliv: 0, plays: 0, sfx: 0, music: 0 },
  load() { try { const s = JSON.parse(localStorage.getItem(this.key) || 'null'); if (s) Object.assign(this.data, s); } catch (e) {} },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} }
};
Save.load();
// 2026-10-29: 소리 기본값을 끔. 이미 켜진 채 저장된 기록도 한 번 끈다.
if (!Save.data.quiet) { Save.data.sfx = 0; Save.data.music = 0; Save.data.quiet = 1; Save.save(); }

const midi = n => 440 * Math.pow(2, (n - 69) / 12);

const Sound = {
  ctx: null, out: null, sfxBus: null, mus: null, nb: null, timer: null, step: 0, next: 0, lastGem: 0,
  init() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.out = this.ctx.createGain(); this.out.gain.value = 0.7; this.out.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.out);
        this.mus = this.ctx.createGain(); this.mus.connect(this.out);
        this.apply();
      } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  apply() {
    if (!this.ctx) return;
    this.sfxBus.gain.value = Save.data.sfx ? 1 : 0;
    this.mus.gain.value = Save.data.music ? 0.5 : 0;
  },
  env(g, t0, a, d, vol) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  },
  tone(f, d, type, vol, f2, when, bus, att) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + Math.max(0, when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    this.env(g, t0, att || 0.005, d, vol || 0.15);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t0); o.stop(t0 + (att || 0.005) + d + 0.05);
  },
  noise(d, vol, freq, when) {
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
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    s.start(t0); s.stop(t0 + d + 0.05);
  },
  sfx(name, n) {
    if (!this.ctx) return;
    switch (name) {
      case 'flip': this.tone(440, 0.13, 'sine', 0.08, 990); this.noise(0.1, 0.035, 4000); break;
      case 'land': this.noise(0.06, 0.04, 700); break;
      case 'gem': {
        const now = this.ctx.currentTime;
        if (now - this.lastGem < 0.025) return;
        this.lastGem = now;
        const sc = [0, 2, 4, 7, 9], i = Math.min(n || 0, 14);
        const f = midi(76 + sc[i % 5] + 12 * Math.floor(i / 5));
        this.tone(f, 0.12, 'sine', 0.08); this.tone(f * 2, 0.08, 'triangle', 0.025, 0, 0.015);
        break;
      }
      case 'big': [79, 83, 86, 91].forEach((m, i) => this.tone(midi(m), 0.14, 'triangle', 0.06, 0, i * 0.04)); break;
      case 'deliver': [72, 76, 79, 84, 88].forEach((m, i) => { this.tone(midi(m), 0.25, 'triangle', 0.07, 0, i * 0.08); this.tone(midi(m + 12), 0.2, 'sine', 0.03, 0, i * 0.08 + 0.02); }); break;
      case 'pop': this.noise(0.25, 0.12, 2500); this.tone(900, 0.3, 'sine', 0.1, 220); break;
      case 'die': this.tone(660, 0.7, 'triangle', 0.11, 90); this.noise(0.45, 0.12, 1000); break;
      case 'click': this.tone(880, 0.05, 'sine', 0.06); break;
      case 'phase': this.tone(midi(88), 0.6, 'sine', 0.05, 0, 0, null, 0.02); this.tone(midi(95), 0.8, 'sine', 0.04, 0, 0.18, null, 0.02); break;
    }
  },
  // 자장가 같은 3/4박 아르페지오
  CHORDS: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62], [60, 64, 67], [52, 55, 59], [53, 57, 60], [55, 59, 65]],
  ARP: [0, 1, 2, 3, 2, 1],
  MEL: [76, 0, 74, 72, 0, 0, 72, 0, 69, 67, 0, 0, 69, 0, 72, 74, 0, 0, 71, 0, 74, 79, 0, 0,
        76, 0, 79, 76, 0, 0, 71, 0, 74, 72, 0, 0, 72, 0, 69, 72, 0, 0, 74, 0, 0, 0, 0, 0],
  startMusic() {
    if (!this.ctx || this.timer) return;
    this.next = this.ctx.currentTime + 0.15; this.step = 0;
    this.timer = setInterval(() => this.tick(), 60);
  },
  stopMusic() { clearInterval(this.timer); this.timer = null; },
  tick() {
    const c = this.ctx, beat = 0.27;
    while (this.next < c.currentTime + 0.3) {
      const w = this.next - c.currentTime, s = this.step % 6, bar = Math.floor(this.step / 6) % 8;
      const ch = this.CHORDS[bar], a = this.ARP[s];
      const note = a === 3 ? ch[0] + 12 : ch[a];
      this.tone(midi(note + 12), 0.5, 'triangle', 0.035, 0, w, this.mus, 0.01);
      if (s === 0) this.tone(midi(ch[0] - 12), 1.4, 'sine', 0.07, 0, w, this.mus, 0.02);
      const m = this.MEL[this.step % 48];
      if (m && Math.floor(this.step / 48) % 2 === 1) this.tone(midi(m + 12), 0.45, 'sine', 0.03, 0, w, this.mus, 0.02);
      this.next += beat; this.step++;
    }
  }
};

const Input = {
  onDown: null, onKey: null,
  init(cv) {
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      Sound.init();
      const r = cv.getBoundingClientRect();
      if (this.onDown) this.onDown(e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      Sound.init();
      if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
      if (this.onKey) this.onKey(e.code);
    });
  }
};
