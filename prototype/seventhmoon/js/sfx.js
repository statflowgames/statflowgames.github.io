// 임시 효과음: 음원 납품 전까지 WebAudio로 합성한다. ?mute 로 끈다.
// 구성: 소리마다 여러 겹(타격 순간 딸깍 + 몸통 쿵 + 바스락 + 잔향)을 쌓고, 화면 위치로 좌우를 나누고, 매번 음높이를 조금씩 바꾼다.
const SFX = (() => {
  const muted = new URLSearchParams(location.search).has('mute');
  // ?silent: 엔진은 돌리되 스피커로는 내보내지 않는다 (개발 검사용)
  const silent = new URLSearchParams(location.search).has('silent');
  let final = null;
  // 음량 설정 (0~1). 설정 화면에서 바꾼다
  const VOL = (() => { try { const v = JSON.parse(localStorage.getItem('seventhmoon.settings') || '{}'); return { music: v.music ?? 0.8, sfx: v.sfx ?? 1, voice:v.voice??.8 }; } catch (e) { return { music: 0.8, sfx: 1, voice:.8 }; } })();
  let ctx = null, master = null, dry = null, verb = null, noiseBuf = null, distCurve = null,bankTask=null;
  const last = {};
  let G = 1;   // 소리별 음량 보정 (on(f, k)에서 잠깐 바꾼다)
  const rnd = (a, b) => a + Math.random() * (b - a);
  const vr = (k = 0.08) => 1 + rnd(-k, k);

  function init() {
    if (ctx || muted) return;
    try { setup(new (window.AudioContext || window.webkitAudioContext)()); } catch (e) { ctx = null; }
  }
  function setup(c) {
    {
      ctx = c;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.8 * VOL.sfx;
      final = ctx.createGain(); final.gain.value = silent ? 0 : 1; final.connect(ctx.destination);
      master.connect(comp); comp.connect(final);
      dry = ctx.createGain(); dry.connect(master);
      // 잔향: 지수 감쇠 노이즈로 만든 1.4초짜리 공간
      const len = ctx.sampleRate * 1.4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      verb = ctx.createConvolver(); verb.buffer = ir;
      const vg = ctx.createGain(); vg.gain.value = 0.32; verb.connect(vg); vg.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      distCurve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; distCurve[i] = Math.tanh(x * 3.5); }
    }
  }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); if(ctx&&!bankStarted)bankTask=loadBank(); if (ctx && wantAmb && (!amb || amb.mode !== wantAmb)) ambience(wantAmb); return bankTask; }
  // 같은 소리가 너무 촘촘히 겹치지 않게
  function gate(key, ms) { if (!ctx) return false; const n = performance.now(); if (last[key] && n - last[key] < ms) return false; last[key] = n; return true; }
  // 출력 노드: 좌우(화면 x) + 잔향 비율
  function out(x, wet = 0.15) {
    const g = ctx.createGain();
    let node = g;
    if (ctx.createStereoPanner && x !== undefined) {
      const p = ctx.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, (x / 640 - 1) * 0.7));
      g.connect(p); node = p;
    }
    node.connect(dry);
    if (wet > 0) { const w = ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(verb); }
    return g;
  }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * G), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  // 노이즈 한 겹
  function noise(o) {
    const t = ctx.currentTime + (o.delay || 0), dur = o.dur || 0.1;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.f0 || 1000, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1 || o.f0 || 1000), t + dur);
    const g = ctx.createGain(); env(g, t, o.a || 0.003, o.g || 0.3, dur);
    let n = f;
    if (o.dist) { const ws = ctx.createWaveShaper(); ws.curve = distCurve; f.connect(ws); n = ws; }
    s.connect(f); n.connect(g); g.connect(o.to || out(o.x, o.wet ?? 0.12));
    s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.1);
  }
  // 음 한 겹
  function tone(o) {
    const t = ctx.currentTime + (o.delay || 0), dur = o.dur || 0.1;
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1 || o.f0), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain(); env(g, t, o.a || 0.004, o.g || 0.3, dur);
    let n = osc;
    if (o.dist) { const ws = ctx.createWaveShaper(); ws.curve = distCurve; osc.connect(ws); n = ws; }
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; n.connect(f); n = f; }
    n.connect(g); g.connect(o.to || out(o.x, o.wet ?? 0.1));
    osc.start(t); osc.stop(t + dur + 0.1);
  }
  // 쇠 울림: 배음이 어긋난 사인파 묶음 (방패 테, 갑옷, 칼날)
  function metal(o) {
    const ratios = o.ratios || [1, 2.76, 5.4, 8.93, 13.34];
    const base = o.f * vr(0.04), to = out(o.x, o.wet ?? 0.3);
    ratios.forEach((r, i) => tone({ f0: base * r, f1: base * r * (o.bend || 0.995), dur: (o.dur || 0.4) / (1 + i * 0.5), g: (o.g || 0.15) / (1 + i * 0.7), to, delay: o.delay }));
  }
  // 목소리: 톱니파 + 모음 공명(포먼트)
  const VOW = { a: [800, 1150, 2900], o: [450, 800, 2830], e: [400, 1700, 2600], u: [350, 700, 2500], i: [300, 2200, 3000] };
  function voice(o) {
    const t = ctx.currentTime + (o.delay || 0), dur = o.dur || 0.2;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.fm) osc.frequency.linearRampToValueAtTime(o.fm, t + dur * 0.3);
    osc.frequency.exponentialRampToValueAtTime(o.f1 || o.f0 * 0.8, t + dur);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = o.vib || 7; lg.gain.value = o.f0 * 0.03; lfo.connect(lg); lg.connect(osc.frequency);
    const g = ctx.createGain(); env(g, t, o.a || 0.02, (o.g || 0.25) * 6, dur);
    const to = out(o.x, o.wet ?? 0.18);
    const pre = ctx.createGain(); pre.gain.value = 1;
    let src = osc;
    if (o.dist) { const ws = ctx.createWaveShaper(); ws.curve = distCurve; osc.connect(ws); src = ws; }
    src.connect(pre);
    const shift = o.shift || 1;
    (VOW[o.v || 'a']).forEach((fq, i) => {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq * shift; bp.Q.value = 6 + i * 2;
      const bg = ctx.createGain(); bg.gain.value = [1, 0.6, 0.25][i];
      pre.connect(bp); bp.connect(bg); bg.connect(g);
    });
    g.connect(to);
    osc.start(t); osc.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
    // 숨소리 (ㅎ)
    if (o.breath) noise({ type: 'bandpass', f0: 1800 * shift, f1: 1200, q: 0.8, dur: Math.min(0.12, dur), g: o.breath, delay: o.delay, x: o.x, wet: 0.1 });
  }
  const on = (f, k = 1) => (...a) => { if (!ctx) return; const g0 = G; G = g0 * k; try { f(...a); } catch (e) { if (window.SFX_DEBUG) throw e; } finally { G = g0; } };
  // 개발용: 소리를 파일로 렌더링해 크기·길이를 잰다 (SFX._render(() => SFX.hit(true), 1.5))
  async function render(fn, secs = 1.5) {
    const saved = [ctx, master, dry, verb, noiseBuf, distCurve, final];
    for (const k in last) delete last[k];
    setup(new OfflineAudioContext(2, Math.ceil(44100 * secs), 44100));
    let err = null;
    try { fn(); } catch (e) { err = String(e); }
    const buf = await ctx.startRendering();
    [ctx, master, dry, verb, noiseBuf, distCurve, final] = saved;
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0, sum = 0, lastLoud = 0, firstLoud = -1;
    for (let i = 0; i < L.length; i++) {
      const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); sum += L[i] * L[i];
      if (v > peak) peak = v;
      if (v > 0.01) { lastLoud = i; if (firstLoud < 0) firstLoud = i; }
    }
    return { err, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / L.length).toFixed(4), start: +(firstLoud / 44100).toFixed(3), len: +((lastLoud - firstLoud) / 44100).toFixed(2), buf };
  }

  // ---------------- 숲 환경음 ----------------
  let amb = null, wantAmb = null;

  // ---------------- 납품 음원 (assets/audio) ----------------
  const BASE = 'assets/audio/';
  const bank = {};
  let musicList = [], musicFiles={}, musicSettings={}, musicVersion='legacy', bankStarted = false, bankReady=false, musicBus = null;
  let heroVoices={};
  const enemyVoices=[];
  const lastVoiceIndex={};
  const HERO_KEYS=new Set(['warrior','mage','paladin','rogue','ranger','hexblade']);
  const candidate=()=> 'global'; // Global release uses nonverbal takes only, never the old Korean candidates.
  const chan = {};            // 'bgm', 'amb', 'jgl' → { name, el, g }
  let wantMusic = undefined;
  async function loadBank() {
    if (bankStarted || !ctx || ctx instanceof OfflineAudioContext) return;
    bankStarted = true;
    try {
      const man = await (await fetch(BASE + 'manifest.json?rev=audio-v2',{cache:'no-cache'})).json();
      const audioVersion=encodeURIComponent(man.audioVersion||'legacy');
      musicList = man.music || [];
      musicFiles=man.musicFiles||{};
      musicSettings=man.musicSettings||{};
      musicVersion=man.musicVersion||man.audioVersion||'legacy';
      if (wantMusic !== undefined) music(wantMusic.name, wantMusic.o);
      if (wantAmb) ambience(wantAmb);
      // Avoid the old formant voices. Decode only the selected voice candidate; cap mobile fetch/decode concurrency.
      const jobs=Object.entries(man.sfx||{}).filter(([key])=>{
        if(key.startsWith('vo_')||key.startsWith('awaken_'))return false;
        if(man.effectsAudio?.retired?.includes(key))return false;
        return !key.startsWith('hv2_vo_')||key.includes('_global_');
      });
      jobs.sort(([a],[b])=>Number(b.startsWith('hv2_vo_warrior_'))-Number(a.startsWith('hv2_vo_warrior_')));
      let cursor=0;
      await Promise.all(Array.from({length:6},async()=>{while(cursor<jobs.length){
        const [k,files]=jobs[cursor++];
        const list = [];
        for (const f of files) {
          try {
            const ab = await (await fetch(BASE + f + '.m4a?v='+audioVersion)).arrayBuffer();
            list.push(await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)));
          } catch (e) { /* 이 파일은 합성음으로 대신 */ }
        }
        if (list.length) bank[k] = list;
      }}));
    } catch (e) { /* 일반 효과음만 합성으로 대체. 목소리는 파형 합성으로 돌아가지 않는다. */ }
    finally {bankReady=true;}
  }
  // 음원 재생. 없으면 false → 합성음으로 대신한다.
  function sample(key, o = {}) {
    const b = bank[key];
    if (!b || !ctx) return false;
    const s = ctx.createBufferSource();
    s.buffer = b[o.index??Math.floor(Math.random() * b.length)];
    s.playbackRate.value = (o.rate || 1) * vr(o.vary ?? 0.05);
    if (o.loop) s.loop = true;
    const g = ctx.createGain(); g.gain.value = o.vol ?? 1;
    s.connect(g); g.connect(out(o.x, o.wet ?? 0.06));
    const at=ctx.currentTime+(o.delay||0),duration=Math.min(o.duration??s.buffer.duration,s.buffer.duration);
    s.start(at);
    if(o.duration){g.gain.setValueAtTime(o.vol??1,at);g.gain.setValueAtTime(o.vol??1,at+Math.max(0,duration-(o.fade??.025)));g.gain.linearRampToValueAtTime(0,at+duration);s.stop(at+duration);}
    return { s, g, endsAt:o.loop?Infinity:at+duration };
  }
  function has(key) { return !!bank[key]; }
  function fadeVoice(v,seconds=.025){
    if(!v||v.endsAt<=ctx.currentTime)return;
    const t=ctx.currentTime;v.g.gain.cancelScheduledValues(t);v.g.gain.setValueAtTime(v.g.gain.value,t);v.g.gain.linearRampToValueAtTime(0,t+seconds);
    try{v.s.stop(t+seconds+.005);}catch(e){/* already ended */}
    v.endsAt=t+seconds;
  }
  function heroVoice(hero,kind,x,power=0){
    if(!ctx||VOL.voice<=0)return;
    hero=HERO_KEYS.has(hero)?hero:'warrior';
    const key=`hv2_vo_${hero}_${candidate(hero)}_${kind}`,pool=bank[key];
    if(!pool?.length)return; // Loading/missing human voice stays silent; never use the old oscillator voice.
    const priority={atk:1,atk_big:2,hurt:3,victory:4,awaken:5,ko:6}[kind]||1;
    const old=heroVoices[hero],t=ctx.currentTime;
    if(old&&old.endsAt>t&&old.priority>priority)return;
    if(!gate('heroVoice:'+hero,kind==='atk'?170:kind==='hurt'?160:100))return;
    if(old)fadeVoice(old);
    const index=((lastVoiceIndex[key]??-1)+1)%pool.length;lastVoiceIndex[key]=index;
    const volume={atk:.56,atk_big:.65,hurt:.52,ko:.58,victory:.56,awaken:.72}[kind]*VOL.voice*(kind==='atk'&&power===1?1.08:1);
    const v=sample(key,{x,index,vol:volume,vary:0,wet:0});
    if(v)heroVoices[hero]={...v,priority,kind};
  }
  function enemyFamily(id='grunt'){
    if(/skeleton/.test(id))return 'bone';
    if(/mummy|sehera/.test(id))return 'mummy';
    if(/azmal|wyvern/.test(id))return 'dragon';
    if(/wolf|hound/.test(id))return 'wolf';
    if(/ratkin/.test(id))return 'rat';
    if(/slime|gloob|leech/.test(id))return 'slime';
    if(/scorpion|twinsting|snakeman/.test(id))return 'insect';
    if(/golem|construct|ice_spirit/.test(id))return 'construct';
    if(/harpy|gargoyle|imp/.test(id))return 'winged';
    if(/barkhaul|toothcrusher|hrimgar|brute/.test(id))return 'brute';
    if(/shadow|shade|orvex|void|cultist/.test(id))return 'shadow';
    if(/pirate|captain_mog|dwarf/.test(id))return 'human';
    return 'grolin';
  }
  function enemyVoice(kind,x,pitch=1,id='grunt'){
    if(!ctx||VOL.voice<=0)return;
    const family=enemyFamily(id),key=`ev2_${family}_${kind}`;
    if(!has(key))return;
    const priority=kind==='roar'?3:kind==='die'?2:1;
    if(!gate('enemy:'+family+':'+kind,kind==='hurt'?170:kind==='die'?100:240))return;
    for(let i=enemyVoices.length-1;i>=0;i--)if(enemyVoices[i].endsAt<=ctx.currentTime)enemyVoices.splice(i,1);
    if(enemyVoices.length>=3){
      const quietest=enemyVoices.findIndex(v=>v.priority<=priority);
      if(quietest<0)return;
      fadeVoice(enemyVoices[quietest]);enemyVoices.splice(quietest,1);
    }
    const index=((lastVoiceIndex[key]??-1)+1)%bank[key].length;lastVoiceIndex[key]=index;
    const duck=Object.values(heroVoices).some(v=>v.endsAt>ctx.currentTime)?.58:1;
    const vol=({atk:.40,hurt:.24,die:.39,roar:.55,chant:.32,alert:.28,laugh:.28,scared:.28}[kind]??.3)*VOL.voice*duck;
    const v=sample(key,{x,index,vol,vary:.015,rate:Math.max(.94,Math.min(1.06,pitch)),wet:.025});
    if(v)enemyVoices.push({...v,priority});
  }
  // 배경음악·환경음·징글: 긴 곡은 <audio>로 흘려보낸다 (메모리 절약)
  function playChan(ch, name, o = {}) {
    if (!ctx) return;
    if (!musicBus) { musicBus = ctx.createGain(); musicBus.gain.value = VOL.music; musicBus.connect(final); }
    const cur = chan[ch], t = ctx.currentTime, fade = o.fade ?? 0.8;
    if (cur && cur.name === name) { cur.g.gain.setTargetAtTime(o.vol ?? cur.vol, t, 0.3); cur.vol = o.vol ?? cur.vol; return; }
    if (cur) { cur.g.gain.setTargetAtTime(0.0001, t, fade / 3); const el = cur.el; setTimeout(() => el.pause(), fade * 1000 + 300); chan[ch] = null; }
    if (!name || !musicList.includes(name)) return;
    const file=musicFiles[name]||name;
    const el = new Audio(BASE + file + '.m4a?v='+encodeURIComponent(musicVersion));
    el.loop = o.loop ?? true; el.preload = 'auto';
    const src = ctx.createMediaElementSource(el), g = ctx.createGain();
    g.gain.value = 0.0001; src.connect(g); g.connect(musicBus);
    g.gain.setTargetAtTime(o.vol ?? 0.6, t, (o.fadeIn ?? 0.4) / 3);
    el.play().catch(() => {});
    chan[ch] = { name, el, g, vol: o.vol ?? 0.6 };
  }
  // 배경음악(징글은 loop:false). null이면 끈다.
  function music(name, o = {}) {
    wantMusic = { name, o };
    if (!ctx || !bankStarted) return;
    if (o.jingle) { playChan('jgl', name, { loop: false, vol: o.vol ?? 0.8, fade: 0.2, fadeIn: 0.05 }); return; }
    playChan('bgm', name, { vol: o.vol ?? 0.55, fade: o.fade ?? 1.0, loop: o.loop??musicSettings[name]?.loop??true });
  }
  function ambience(mode) {
    if (!ctx) return;
    if (musicList.includes('amb_forest')) {
      // mode: 'forest' 같은 환경음 이름, 'boss'(지금 소리를 줄임), 'off'
      if (mode === 'boss') { if (chan.amb) playChan('amb', chan.amb.name, { vol: 0.3 }); return; }
      const name = mode === 'off' ? null : musicList.includes('amb_' + mode) ? 'amb_' + mode : 'amb_forest';
      playChan('amb', name, { vol: 0.85, fade: 1.2, fadeIn: 1.5 });
      return;
    }
    if (!amb) {
      amb = { g: ctx.createGain(), birdT: null, drumT: null };
      amb.g.gain.value = 0.0001; amb.g.connect(master);
      // 바람: 낮게 걸러 낸 노이즈를 천천히 흔든다
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.4;
      const wg = ctx.createGain(); wg.gain.value = 0.16;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.09; lfo.connect(lg); lg.connect(wg.gain);
      const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = 0.13; lg2.gain.value = 180; lfo2.connect(lg2); lg2.connect(f.frequency);
      s.connect(f); f.connect(wg); wg.connect(amb.g); s.start(); lfo.start(); lfo2.start();
      const bird = () => {
        if (amb.mode !== 'boss') {
          const x = rnd(0, 1280), n = 2 + Math.floor(Math.random() * 3), b = rnd(2400, 3800);
          for (let i = 0; i < n; i++) tone({ f0: b * vr(0.05), f1: b * rnd(1.2, 1.5), dur: 0.07, g: 0.035, delay: i * rnd(0.09, 0.14), x, wet: 0.5 });
          if (Math.random() < 0.3) noise({ type: 'highpass', f0: 3000, f1: 5000, q: 0.5, dur: 0.6, g: 0.02, x: rnd(0, 1280), wet: 0.3 });
        }
        amb.birdT = setTimeout(bird, rnd(1500, 4500));
      };
      bird();
    }
    amb.mode = mode;
    const t = ctx.currentTime;
    amb.g.gain.cancelScheduledValues(t);
    amb.g.gain.setTargetAtTime(mode === 'off' ? 0.0001 : mode === 'boss' ? 0.5 : 1, t, 0.8);
    if (mode === 'boss' && !amb.drumT) {
      // 보스전: 낮은 북 (쿵… 쿵쿵)
      let k = 0;
      const drum = () => {
        if (amb.mode !== 'boss') { amb.drumT = null; return; }
        const pat = [1, 0, 0, 0, 1, 0, 1, 0];
        if (pat[k % 8]) { tone({ f0: 95, f1: 42, dur: 0.35, g: 0.22, wet: 0.25 }); noise({ type: 'lowpass', f0: 300, f1: 80, dur: 0.12, g: 0.06 }); }
        if (k % 16 === 12) tone({ type: 'sawtooth', f0: 55, f1: 52, dur: 1.4, g: 0.04, lp: 200, wet: 0.4 });
        k++;
        amb.drumT = setTimeout(drum, 230);
      };
      drum();
    }
  }

  function setVolume(music, sfx, voice=VOL.voice) {
    VOL.music = music; VOL.sfx = sfx;
    VOL.voice=Math.max(0,Math.min(1,voice));
    if(ctx&&VOL.voice===0){for(const v of Object.values(heroVoices))fadeVoice(v);for(const v of enemyVoices)fadeVoice(v);}
    if (master) master.gain.value = 0.8 * sfx;
    if (musicBus) musicBus.gain.value = music;
  }
  const api = {
    setVolume,
    resume,
    _render: render,
    ambience: mode => { wantAmb = mode; if (ctx) { try { ambience(mode); } catch (e) { /* 무시 */ } } },
    // ---------- 휘두르기 ----------
    swing: on((big, x, kind) => {
      const k = vr(0.1);
      noise({ type: 'bandpass', f0: 500 * k, f1: (big ? 2600 : 3600) * k, q: 1.6, dur: big ? 0.24 : 0.15, g: big ? 0.5 : 0.36, a: 0.04, x, wet: 0.05 });
      noise({ type: 'lowpass', f0: 900, f1: 300, q: 0.5, dur: big ? 0.22 : 0.12, g: big ? 0.25 : 0.12, a: 0.03, x, wet: 0 });
      // 갑옷이 짤랑
      metal({ f: rnd(2200, 2800), dur: 0.08, g: 0.03, x, wet: 0.05, delay: 0.02 });
      if (kind === 'blade') tone({ type: 'triangle', f0: 3200 * k, f1: 2600, dur: 0.12, g: 0.03, x, delay: 0.04 });
    }, 2.6),
    // ---------- 맞음 ----------
    hit: on((heavy, x, kind) => {
      if (!gate('hit', 25)) return;
      const k = vr(0.1);
      noise({ type: 'highpass', f0: 2500, f1: 4000, q: 0.7, dur: 0.02, g: 0.5, x, wet: 0 });                 // 딱
      tone({ f0: (heavy ? 120 : 170) * k, f1: 45, dur: heavy ? 0.24 : 0.14, g: heavy ? 0.85 : 0.6, x, wet: 0.05 }); // 쿵
      noise({ type: 'bandpass', f0: 1400 * k, f1: 500, q: 1.2, dur: heavy ? 0.14 : 0.09, g: 0.55, dist: true, x }); // 퍽
      if (kind === 'blade') { noise({ type: 'highpass', f0: 4500, f1: 7000, q: 1, dur: 0.12, g: 0.18, x, delay: 0.005 }); metal({ f: rnd(1600, 2000), dur: 0.18, g: 0.04, x }); }
      if (heavy) {
        tone({ f0: 70, f1: 30, dur: 0.45, g: 0.6, x, wet: 0.3 });
        noise({ type: 'lowpass', f0: 500, f1: 80, q: 0.6, dur: 0.35, g: 0.35, x, wet: 0.3 });
      }
    }),
    crit: on(x => { metal({ f: 1500, dur: 0.6, g: 0.1, x, wet: 0.5 }); noise({ type: 'highpass', f0: 3000, f1: 8000, dur: 0.25, g: 0.2, x, wet: 0.4 }); tone({ type: 'square', f0: 900, f1: 1800, dur: 0.08, g: 0.06, x }); }, 1.6),
    bash: on(x => {
      noise({ type: 'bandpass', f0: 420, f1: 300, q: 4, dur: 0.1, g: 0.6, x });                 // 나무 방패 쿵
      tone({ type: 'triangle', f0: 230, f1: 170, dur: 0.12, g: 0.4, x });
      metal({ f: 620, dur: 0.35, g: 0.08, x, wet: 0.3 });                                      // 쇠 테
    }, 1.6),
    guard: on(x => {
      if (!gate('guard', 40)) return;
      metal({ f: rnd(480, 560), dur: 0.45, g: 0.14, x, wet: 0.35 });
      noise({ type: 'bandpass', f0: 380, f1: 260, q: 3, dur: 0.09, g: 0.5, x });
      noise({ type: 'highpass', f0: 3500, f1: 5000, dur: 0.05, g: 0.25, x });
    }, 1.8),
    parry: on(x => {
      metal({ f: 880, dur: 1.4, g: 0.16, x, wet: 0.7, bend: 1 });
      metal({ f: 1320, dur: 1.1, g: 0.1, x, wet: 0.7, bend: 1, delay: 0.03 });
      noise({ type: 'bandpass', f0: 1500, f1: 6000, q: 1, dur: 0.25, g: 0.3, x, wet: 0.4 });
      tone({ f0: 1760, f1: 1760, dur: 0.9, g: 0.05, x, wet: 0.8, delay: 0.06 });
    }),
    // ---------- 몸 움직임 ----------
    step: on((kind = 'armor', x) => {
      const k = vr(0.15);
      if (kind === 'giant') {
        tone({ f0: 60 * k, f1: 32, dur: 0.4, g: 0.7, x, wet: 0.3 });
        noise({ type: 'lowpass', f0: 600, f1: 90, q: 0.6, dur: 0.3, g: 0.4, x, wet: 0.2 });
        noise({ type: 'bandpass', f0: 2500, f1: 1500, q: 1, dur: 0.15, g: 0.08, x, delay: 0.05 });  // 나뭇잎 바스락
        return;
      }
      if (kind === 'light') { noise({ type: 'lowpass', f0: 900 * k, f1: 300, q: 0.7, dur: 0.06, g: 0.35, x, wet: 0 }); return; }
      noise({ type: 'lowpass', f0: 1100 * k, f1: 250, q: 0.8, dur: 0.07, g: 0.22, x, wet: 0 });       // 흙
      noise({ type: 'bandpass', f0: 2600 * k, f1: 1800, q: 2, dur: 0.05, g: 0.05, x, delay: 0.01 });
      // Loading fallback stays dry too; no pitched metal on every stride.
      noise({ type:'bandpass',f0:1500,f1:800,q:.5,dur:.045,g:.025,x,wet:0,delay:.02 });
    }, 2.2),
    jump: on(x => { noise({ type: 'bandpass', f0: 500, f1: 1600, q: 1, dur: 0.15, g: 0.25, x,wet:0 }); }, 2.5),
    land: on((x, heavy) => {
      if (!gate('land', 30)) return;
      tone({ f0: heavy ? 90 : 110, f1: 40, dur: heavy ? 0.3 : 0.16, g: heavy ? 0.6 : 0.4, x });
      noise({ type: 'lowpass', f0: 700, f1: 120, q: 0.6, dur: heavy ? 0.3 : 0.15, g: 0.35, x, wet: 0.15 });
      noise({type:'bandpass',f0:1800,f1:600,q:.5,dur:.055,g:.035,x,wet:0,delay:.015});
    }, 1.6),
    roll: on(x => {
      noise({ type: 'lowpass', f0: 300, f1: 900, q: 0.7, dur: 0.32, g: 0.3, x });
      for (let i = 0; i < 4; i++) noise({type:'bandpass',f0:1400,f1:700,q:.5,dur:.045,g:.025,x,wet:0,delay:i*.07});
    }, 2.2),
    // ---------- 목소리 ----------
    heroAtk: on((power = 1, x) => {
      if (!gate('heroV', 120)) return;
      const f = rnd(120, 145);
      voice({ f0: f * (1 + power * 0.15), fm: f * (1.1 + power * 0.2), f1: f * 0.8, v: power > 1 ? 'a' : 'o', dur: 0.12 + power * 0.08, g: 0.14 + power * 0.05, breath: 0.12, x, dist: power > 1 });
    }, 1.4),
    heroHurt: on(x => { if (!gate('heroV', 150)) return; voice({ f0: rnd(150, 170), fm: 190, f1: 100, v: 'u', dur: 0.22, g: 0.18, breath: 0.1, x, dist: true }); }, 1.4),
    heroKO: on(x => voice({ f0: 160, fm: 180, f1: 70, v: 'o', dur: 0.6, g: 0.2, breath: 0.12, x, dist: true }), 1.3),
    heroWin: on(() => { voice({ f0: 130, fm: 170, f1: 150, v: 'a', dur: 0.55, g: 0.2, breath: 0.12, dist: true }); }),
    gob: on((kind, x, pitch = 1) => {
      if (!gate('gob' + kind, 60)) return;
      const f = rnd(380, 520) * pitch;
      if (kind === 'atk') voice({ f0: f, fm: f * 1.3, f1: f * 0.9, v: 'a', dur: 0.15, g: 0.2, shift: 1.25, x, breath: 0.05 });
      else if (kind === 'hurt') voice({ f0: f * 1.2, fm: f * 1.5, f1: f * 0.7, v: 'e', dur: 0.14, g: 0.13, shift: 1.3, x, dist: true });
      else if (kind === 'die') voice({ f0: f * 1.3, fm: f * 1.6, f1: f * 0.4, v: 'i', dur: 0.45, g: 0.14, shift: 1.3, x, dist: true });
      else if (kind === 'alert') voice({ f0: f, fm: f * 1.6, f1: f * 1.4, v: 'a', dur: 0.16, g: 0.12, shift: 1.25, x });
      else if (kind === 'laugh') for (let i = 0; i < 4; i++) voice({ f0: f * (1.1 - i * 0.05), f1: f, v: 'e', dur: 0.07, g: 0.1, shift: 1.3, delay: i * 0.1, x, breath: 0.04 });
      else if (kind === 'scared') voice({ f0: f * 1.3, f1: f * 1.6, v: 'i', dur: 0.25, g: 0.3, shift: 1.3, vib: 14, x });
      else if (kind === 'chant') for (let i = 0; i < 3; i++) voice({ f0: f * 0.6, f1: f * 0.62, v: ['o', 'u', 'a'][i], dur: 0.18, g: 0.08, shift: 1.15, delay: i * 0.17, x, vib: 5 });
    }, 1.3),
    // ---------- 부서짐·줍기 ----------
    brk: on((x, kind = 'wood') => {
      if (kind === 'wood') {
        for (let i = 0; i < 5; i++) noise({ type: 'bandpass', f0: rnd(1500, 3200), f1: rnd(800, 1500), q: 3, dur: 0.04, g: 0.35, delay: i * rnd(0.015, 0.04), x });
        tone({ type: 'triangle', f0: 160, f1: 70, dur: 0.15, g: 0.35, x });
        noise({ type: 'highpass', f0: 2000, f1: 5000, q: 0.5, dur: 0.3, g: 0.08, delay: 0.08, x, wet: 0.2 });
      } else {
        noise({ type: 'bandpass', f0: 900, f1: 300, q: 1, dur: 0.25, g: 0.5, dist: true, x });
        for (let i = 0; i < 4; i++) noise({ type: 'bandpass', f0: rnd(2000, 4000), q: 4, dur: 0.03, g: 0.15, delay: 0.05 + i * 0.05, x });
      }
    }, 2.2),
    coin: on((x) => {
      if (!gate('coin', 60)) return;
      noise({type:'highpass',f0:2300,f1:5000,q:.5,dur:.035,g:.065,x,wet:0});
      noise({type:'bandpass',f0:4000,f1:2300,q:.7,dur:.025,g:.025,x,wet:0,delay:.025});
    }, 1.4),
    heal: on(() => { [660, 830, 990, 1320].forEach((f, i) => tone({ f0: f, f1: f * 1.01, dur: 0.35, g: 0.08, delay: i * 0.06, wet: 0.6 })); noise({ type: 'highpass', f0: 4000, f1: 8000, dur: 0.5, g: 0.04, wet: 0.5 }); }),
    // ---------- 몬스터 ----------
    die: on(x => {
      noise({ type: 'bandpass', f0: 1200, f1: 150, q: 0.8, dur: 0.55, g: 0.4, x, wet: 0.35 });
      tone({ type: 'sawtooth', f0: 300, f1: 60, dur: 0.45, g: 0.08, lp: 900, x });
      [1200, 900, 700].forEach((f, i) => tone({ f0: f, f1: f * 0.7, dur: 0.2, g: 0.04, delay: 0.1 + i * 0.07, x, wet: 0.6 }));
    }, 1.8),
    yelp: on(x => SFX.gob('hurt', x)),
    shout: on(x => SFX.heroAtk(1, x)),
    throwS: on(x => { noise({ type: 'bandpass', f0: 700, f1: 3000, q: 2.5, dur: 0.22, g: 0.35, x }); noise({ type: 'bandpass', f0: 2500, f1: 1200, q: 6, dur: 0.4, g: 0.06, delay: 0.1, x }); }, 4),
    magic: on(x => {
      [0, 4, 7, 12].forEach((s, i) => tone({ type: 'triangle', f0: 440 * Math.pow(2, s / 12), f1: 440 * Math.pow(2, (s + 5) / 12), dur: 0.35, g: 0.06, delay: i * 0.05, x, wet: 0.6 }));
      noise({ type: 'bandpass', f0: 800, f1: 4000, q: 2, dur: 0.5, g: 0.08, x, wet: 0.5 });
    }, 1.6),
    orbHit: on(x => { tone({ type: 'sine', f0: 600, f1: 150, dur: 0.3, g: 0.2, x, wet: 0.4 }); noise({ type: 'bandpass', f0: 1500, f1: 400, dur: 0.25, g: 0.2, x }); }, 2),
    // ---------- 바크하울 ----------
    roar: on(x => {
      voice({ f0: 80, fm: 95, f1: 55, v: 'o', dur: 1.3, g: 0.5, shift: 0.7, dist: true, vib: 9, x, wet: 0.45, a: 0.08 });
      voice({ f0: 122, fm: 140, f1: 80, v: 'a', dur: 1.1, g: 0.25, shift: 0.7, dist: true, vib: 11, x, wet: 0.45, a: 0.1 });
      noise({ type: 'lowpass', f0: 700, f1: 150, q: 0.5, dur: 1.2, g: 0.4, x, wet: 0.4, a: 0.1 });
    }),
    bossGrunt: on(x => voice({ f0: 70, fm: 85, f1: 55, v: 'u', dur: 0.35, g: 0.35, shift: 0.7, dist: true, x, wet: 0.3 })),
    smash: on(x => {
      tone({ f0: 80, f1: 25, dur: 0.8, g: 1.0, x, wet: 0.4 });
      noise({ type: 'lowpass', f0: 900, f1: 60, q: 0.5, dur: 0.7, g: 0.8, x, wet: 0.4 });
      for (let i = 0; i < 6; i++) noise({ type: 'bandpass', f0: rnd(1200, 3000), q: 3, dur: 0.05, g: 0.2, delay: 0.05 + i * rnd(0.03, 0.08), x });  // 돌 부스러기
    }),
    roots: on(x => {
      for (let i = 0; i < 6; i++) noise({ type: 'bandpass', f0: rnd(300, 900), f1: rnd(200, 500), q: 6, dur: 0.06, g: 0.3, delay: i * 0.03, x });  // 나무 삐걱
      tone({ type: 'sawtooth', f0: 90, f1: 140, dur: 0.25, g: 0.1, lp: 500, x });
      noise({ type: 'lowpass', f0: 600, f1: 100, dur: 0.3, g: 0.4, x, wet: 0.3 });
    }, 4),
    // ---------- 각성 ----------
    awaken: on(() => {
      [220, 277, 330, 440].forEach((f, i) => {
        tone({ type: 'sawtooth', f0: f, f1: f, dur: 0.9, g: 0.06, detune: -8, lp: 1800, a: 0.25, wet: 0.6 });
        tone({ type: 'sawtooth', f0: f, f1: f, dur: 0.9, g: 0.06, detune: 8, lp: 1800, a: 0.25, wet: 0.6 });
        voice({ f0: f, f1: f, v: 'a', dur: 0.9, g: 0.05, a: 0.3, vib: 5, wet: 0.7, delay: i * 0.02 });
      });
      noise({ type: 'bandpass', f0: 300, f1: 5000, q: 0.7, dur: 0.8, g: 0.3, a: 0.5, wet: 0.4 });
      SFX.heroAtk(2);
    }),
    wall: on(x => {
      tone({ f0: 70, f1: 28, dur: 1.0, g: 1.0, wet: 0.5 });
      noise({ type: 'lowpass', f0: 2000, f1: 80, q: 0.5, dur: 1.0, g: 0.7, wet: 0.5 });
      metal({ f: 440, dur: 1.6, g: 0.18, wet: 0.8, bend: 1 }); metal({ f: 660, dur: 1.3, g: 0.12, wet: 0.8, bend: 1, delay: 0.05 });
    }),
    combo: on(n => { const f = 660 * Math.pow(2, Math.min(n, 50) / 60); tone({ type: 'square', f0: f, dur: 0.06, g: 0.05, lp: 3000 }); tone({ type: 'square', f0: f * 1.5, dur: 0.12, g: 0.05, lp: 3000, delay: 0.06, wet: 0.4 }); }),
    // ---------- 화면 ----------
    go: on(() => { tone({ type: 'square', f0: 880, dur: 0.08, g: 0.12, lp: 3000 }); tone({ type: 'square', f0: 1320, dur: 0.16, g: 0.12, lp: 3000, delay: 0.1, wet: 0.3 }); }),
    win: on(() => {
      const mel = [[523, 0], [659, 0.14], [784, 0.28], [1046, 0.42], [988, 0.62], [1046, 0.76]];
      mel.forEach(([f, d], i) => { tone({ type: 'sawtooth', f0: f, dur: i === 5 ? 0.9 : 0.16, g: 0.08, lp: 2200, delay: d, wet: 0.4 }); tone({ type: 'square', f0: f / 2, dur: i === 5 ? 0.9 : 0.16, g: 0.05, lp: 1200, delay: d }); });
      tone({ f0: 65, f1: 40, dur: 0.4, g: 0.6, delay: 0.76 });
    }),
    lose: on(() => [392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f * 0.97, dur: 0.45, g: 0.18, delay: i * 0.28, wet: 0.5 }))),
  };
  // 음원이 있으면 음원을, 없으면 위의 합성음을 낸다
  function prefer(name, fn) {
    const synth = api[name];
    api[name] = (...a) => { if (!ctx) return; let done = false; try { done = fn(...a); } catch (e) { if (window.SFX_DEBUG) throw e; } if (!done) synth(...a); };
  }
  prefer('swing', (big, x,kind) => sample(kind==='shield'?'swing_shield':big ? 'swing_heavy' : 'swing_light', { x, vol: 0.8 }));
  // 음원이 있으면 간격 제한에 걸려도 합성음으로 넘어가지 않게 true를 돌려준다
  const gated = (key, k, ms, fn) => { if (!has(key)) return false; if (gate(k, ms)) fn(); return true; };
  prefer('hit', (heavy, x) => gated('hit_light', 'hitS', 25, () => sample(heavy ? 'hit_heavy' : 'hit_light', { x, vol: 1 })));
  prefer('crit', x => sample('hit_crit', { x, vol: 0.9 }));
  prefer('bash', x => sample('shield_bash', { x }));
  prefer('guard', x => gated('block', 'guardS', 40, () => sample('block', { x })));
  prefer('parry', x => sample('parry', { x }));
  prefer('step', (kind = 'armor', x) => {
    if (!has('step_dirt')) return false;
    if (kind === 'giant') { sample('step_dirt', { x, rate: 0.5, vol: 1 }); tone({ f0: 60, f1: 32, dur: 0.4, g: 0.6, x, wet: 0.3 }); return true; }
    if(!gate('step:'+kind,70))return true;
    if (kind === 'light') return sample('step_dirt', { x, rate:1,vol: 0.30,vary:.025,wet:0 });
    sample('step_dirt', { x, vol: 0.44,vary:.025,wet:0 });
    if(kind==='robe'||kind==='leather')sample('move_'+kind,{x,vol:.20,vary:.02,wet:0});
    else if (Math.random() < 0.4) sample('move_plate', { x, vol: 0.16, delay: 0.02,wet:0 });
    return true;
  });
  prefer('jump', x => sample('jump', { x }));
  prefer('land', (x, heavy) => gated('land', 'landS', 30, () => sample(heavy && has('knockdown') ? 'knockdown' : 'land', { x })));
  prefer('roll', x => sample('roll', { x }));
  api.heroAtk=(power=0,x,hero='warrior')=>heroVoice(hero,power>=2?'atk_big':'atk',x,power);
  api.heroHurt=(x,hero='warrior')=>heroVoice(hero,'hurt',x);
  api.heroKO=(x,hero='warrior')=>heroVoice(hero,'ko',x);
  api.heroWin=(hero='warrior')=>heroVoice(hero,'victory');
  api.gob=enemyVoice;
  api.roar=(x,id='barkhaul')=>enemyVoice('roar',x,1,id);
  api.bossGrunt=(x,id='barkhaul')=>enemyVoice('atk',x,1,id);
  prefer('brk', (x, kind = 'wood') => sample(kind === 'wood' ? 'break_crate' : 'break_pot', { x }));
  prefer('coin', x => {
    if (!has('coin')) return false;
    if (!gate('coinS', 60)) return true;
    const index=((lastVoiceIndex.coin??-1)+1)%bank.coin.length;lastVoiceIndex.coin=index;
    return sample('coin', { x,index,rate:1,vary:0,vol:.48,wet:0 });
  });
  prefer('heal', () => sample('heal'));
  prefer('die', x => sample('mon_dissolve', { x }));
  prefer('throwS', x => sample('dagger_throw', { x, rate: 0.85 }));
  prefer('smash', x => { if (!has('ground_slam')) return false; sample('ground_slam', { x }); sample('wall_crumble', { x, vol: 0.6, delay: 0.05 }); return true; });
  prefer('roots', x => sample('trap_spike', { x, rate: 0.8 }));
  api.awaken=(hero='warrior',x)=>{if(!ctx)return;sample('cutin',{x,vol:.24,vary:0,wet:0});heroVoice(hero,'awaken',x);};
  api.awakenImpact=(hero='warrior',x,phase='impact')=>{
    if(!ctx)return;
    const key='hv2_awaken_'+hero+(phase==='impact'?'':'_'+phase);
    sample(key,{x,vol:phase==='arrow'?.24:phase==='pulse'?.30:phase==='impact'?.70:.48,vary:0,wet:.025});
  };
  prefer('wall', x => sample('shield_wall', { x }));
  prefer('combo', () => sample('combo_milestone'));
  prefer('go', () => sample('ui_tap'));
  prefer('win', () => { if (!musicList.includes('jgl_stage_clear')) return false; music(null, { fade: 0.3 }); music('jgl_stage_clear', { jingle: true }); return true; });
  prefer('lose', () => { if (!musicList.includes('jgl_game_over')) return false; music(null, { fade: 0.3 }); music('jgl_game_over', { jingle: true }); return true; });
  // 메뉴·성장 소리 (음원이 있을 때만)
  api.ui = (k, x) => { if (ctx) sample(k, { x, vol: 0.8, vary: 0.02 }); };
  api.bow = x => {if(ctx)sample('bow_shot',{x,vol:.70,vary:.025,wet:.02});};
  api.spell = (element,x) => {if(ctx)sample(element==='ice'?'ice_cast':element==='bolt'?'lightning':'fire_cast',{x,vol:.65,vary:.025,wet:.03});};
  api.jingle = name => { if (ctx && musicList.includes(name)) music(name, { jingle: true }); };
  // 새 소리 (음원이 있을 때만)
  api.emote = x => { if (ctx && gate('emote', 80)) sample('emote_pop', { x, vol: 0.6 }); };
  api.telegraph = x => { if (ctx && gate('tele', 150)) sample('telegraph', { x, vol: 0.7 }); };
  api.launch = x => { if (ctx) sample('launch', { x }); };
  api.bossPhase = (id='barkhaul',x) => enemyVoice('roar',x,1,id);
  api.bossWeak = x => { if (ctx) sample('boss_weakpoint', { x }); };
  api.bossDown = x => { if (ctx) sample('boss_down', { x }); };
  api.cheer = x => enemyVoice('laugh',x,1,'grunt');
  api.music = music;
  api._debug = () => ({ bank: Object.keys(bank).length, ready:bankReady,voiceKeys:Object.keys(bank).filter(k=>k.startsWith('hv2_vo_')).length,enemyKeys:Object.keys(bank).filter(k=>k.startsWith('ev2_')).length,voiceVolume:VOL.voice,activeHeroVoices:Object.entries(heroVoices).filter(([,v])=>ctx&&v.endsAt>ctx.currentTime).map(([hero,v])=>hero+':'+v.kind),music: musicList.length, chan: Object.fromEntries(Object.entries(chan).filter(([, c]) => c).map(([k, c]) => [k, c.name + (c.el.paused ? ' (멈춤)' : ' (재생)')])), state: ctx && ctx.state });
  api.bossWarning = () => { if (!ctx) return; music(null, { fade: 0.6 }); music('jgl_boss_warning', { jingle: true }); };
  let beat = null;
  api.heartbeat = onoff => {
    if (!ctx) return;
    if (onoff && !beat && has('low_hp_heartbeat')) beat = sample('low_hp_heartbeat', { loop: true, vol: 0.6, vary: 0 });
    if (!onoff && beat) { try { beat.s.stop(); } catch (e) { /* 이미 멈춤 */ } beat = null; }
  };
  return api;
})();
