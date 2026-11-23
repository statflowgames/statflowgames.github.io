// 움직이는 뜨는 법 (모션 그래픽) — 도안 데이터로 바로 만든다. 영상 파일 없음.
//   큰 화면: 코스터가 한 코씩 생겨나고, 바늘이 지금 뜨는 자리를 따라간다. 늘리기는 +1, 코 수 카운터.
//   작은 화면: 지금 하는 기법(매직링·짧은뜨기·늘리기·모아뜨기·빼뜨기)을 바늘과 고리로 천천히 반복.
// 지금은 평평한 원형(짧은뜨기·늘리기·모아뜨기·뒷고리 짧은뜨기)만. motionSupported 로 확인.
import { shade } from './chart.js?v=1123122847';

const OPS = new Set(['sc', 'inc', 'dec', 'sc_blo']);
const NAME = { sc: '짧은뜨기', sc_blo: '뒷고리 짧은뜨기', inc: '늘리기', dec: '모아뜨기' };
const ROSE = '#d9667b', INK = '#3b3340', HOOK = '#e3b04b';

export function motionSupported(p) {
  if (p.type !== 'round' || p.shape !== 'flat') return false;
  const ok = (seq) => seq.every((el) => Array.isArray(el) ? OPS.has(el[0]) : ('rep' in el ? ok(el.seq) : false));
  return p.rounds.every((r) => ok(r.seq));
}

function expandOps(src) {
  const out = [];
  const walk = (seq) => { for (const el of seq) { if (Array.isArray(el)) { for (let i = 0; i < (el[1] ?? 1); i++) out.push(el[0]); } else for (let i = 0; i < el.rep; i++) walk(el.seq); } };
  for (let i = 0; i < (src.repeat ?? 1); i++) walk(src.seq);
  let slot = 0;
  return out.map((t) => { const w = t === 'inc' ? 2 : 1; const o = { t, slot, w }; slot += w; return o; });
}

const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;

// ── 기법 작은 화면: 동작 목록을 순서대로 ─────────────
// move: 바늘 끝 이동 · yo: 실 걸기 · pull: 실을 빼며 고리 +1 · thru: 고리를 n개로 · pop: 새 코 머리 생김 · cinch: 매직링 조이기
const SC = (x, cap0 = 0) => [
  { a: 'move', x, y: 98, cap: cap0 }, { a: 'yo', cap: cap0 + 1 }, { a: 'pull', y: 64, cap: cap0 + 2 },
  { a: 'yo', cap: cap0 + 3 }, { a: 'thru', n: 1, cap: cap0 + 4 }, { a: 'pop', x, cap: cap0 + 4 }, { a: 'move', x, y: 44, cap: cap0 + 4 },
];
const TECH = {
  ring: { title: '매직링', caps: ['실을 손가락에 두 번 감아 고리를 만들어요', '고리 안에 바늘을 넣고 실을 걸어 빼요', '사슬 1코로 기둥코를 세워요', '고리 안에 짧은뜨기를 떠요', '꼬리 실을 당겨 고리를 조여요'],
    acts: [{ a: 'ring', cap: 0 }, { a: 'move', x: 70, y: 84, cap: 1 }, { a: 'yo', cap: 1 }, { a: 'pull', y: 58, cap: 1 }, { a: 'yo', cap: 2 }, { a: 'thru', n: 1, cap: 2 },
      { a: 'move', x: 70, y: 84, cap: 3 }, { a: 'yo', cap: 3 }, { a: 'pull', y: 58, cap: 3 }, { a: 'yo', cap: 3 }, { a: 'thru', n: 1, cap: 3 }, { a: 'cinch', cap: 4 }, { a: 'move', x: 70, y: 40, cap: 4 }] },
  sc: { title: '짧은뜨기', caps: ['앞 단 코에 바늘을 넣어요', '실을 걸어요', '실을 빼내요 → 고리 2개', '다시 실을 걸어요', '고리 2개를 한 번에 빼요'], acts: [{ a: 'move', x: 70, y: 44, cap: 0 }, ...SC(70)] },
  sc_blo: { title: '뒷고리 짧은뜨기', caps: ['앞 단 코의 뒷고리에만 바늘을 넣어요', '실을 걸어요', '실을 빼내요 → 고리 2개', '다시 실을 걸어요', '고리 2개를 한 번에 빼요'], acts: [{ a: 'move', x: 70, y: 44, cap: 0 }, ...SC(70)] },
  inc: { title: '늘리기 (한 코에 짧은뜨기 2번)', caps: ['코에 바늘을 넣고 실을 걸어 빼요 → 고리 2개', '실을 걸어 고리 2개를 빼요 → 1코', '같은 코에 다시 넣고 실을 빼요 → 고리 2개', '실을 걸어 고리 2개를 빼요 → 2코', '한 자리에서 2코가 됐어요 (+1)'],
    acts: [{ a: 'move', x: 70, y: 44, cap: 0 },
      ...SC(70).map((x, i) => ({ ...x, cap: i < 3 ? 0 : 1, ...(x.a === 'pop' ? { x: 60 } : {}) })),
      ...SC(70).map((x, i) => ({ ...x, cap: i < 3 ? 2 : i < 6 ? 3 : 4, ...(x.a === 'pop' ? { x: 82 } : {}) }))] },
  dec: { title: '모아뜨기 (두 코를 1코로)', caps: ['첫째 코에 바늘을 넣고 실을 빼요 → 고리 2개', '둘째 코에도 넣고 실을 빼요 → 고리 3개', '실을 걸어 고리 3개를 한 번에 빼요'],
    acts: [{ a: 'move', x: 70, y: 44, cap: 0 }, { a: 'move', x: 70, y: 98, cap: 0 }, { a: 'yo', cap: 0 }, { a: 'pull', y: 64, cap: 0 }, { a: 'move', x: 110, y: 98, cap: 1 }, { a: 'yo', cap: 1 }, { a: 'pull', y: 64, cap: 1 },
      { a: 'yo', cap: 2 }, { a: 'thru', n: 1, cap: 2 }, { a: 'pop', x: 90, cap: 2 }, { a: 'move', x: 90, y: 44, cap: 2 }] },
  join: { title: '단 끝 잇기 (빼뜨기)', caps: ['이 단 첫 코의 머리에 바늘을 넣어요', '실을 걸어 코와 고리를 한 번에 빼요 (빼뜨기)', '사슬 1코로 다음 단 기둥코를 세워요'],
    acts: [{ a: 'move', x: 30, y: 44, cap: 0 }, { a: 'move', x: 30, y: 98, cap: 0 }, { a: 'yo', cap: 1 }, { a: 'thru', n: 1, cap: 1, up: 60 }, { a: 'yo', cap: 2 }, { a: 'thru', n: 1, cap: 2 }, { a: 'move', x: 30, y: 44, cap: 2 }] },
};

function techState(def, u) {
  const st = { x: 70, y: 44, loops: 1, yo: 0, pops: [], ring: def === TECH.ring ? 1 : 0, ringR: 26, cap: 0 };
  const n = def.acts.length;
  const idx = Math.min(n - 1, Math.floor(u));
  for (let i = 0; i <= idx; i++) {
    const A = def.acts[i], f = i < idx ? 1 : ease((u - i) * 1.25);
    if (i === idx) st.cap = A.cap;
    if (A.a === 'move') { st.x = lerp(st.x, A.x, f); st.y = lerp(st.y, A.y, f); }
    else if (A.a === 'yo') st.yo = f;
    else if (A.a === 'pull') { st.y = lerp(st.y, A.y, f); if (f >= 0.5) { st.loops = Math.min(3, st.loops + (i < idx || f >= 0.5 ? 1 : 0)); st.yo = 0; } }
    else if (A.a === 'thru') { if (A.up) st.y = lerp(st.y, A.up, f); if (f >= 0.5) { st.loops = A.n; st.yo = 0; } st.flash = i === idx ? Math.sin(f * Math.PI) : 0; }
    else if (A.a === 'pop') { st.pops.push({ x: A.x, k: f }); }
    else if (A.a === 'ring') st.ring = f;
    else if (A.a === 'cinch') st.ringR = lerp(26, 10, f);
  }
  return st;
}

function drawTech(ctx, w, h, def, u, hex) {
  ctx.clearRect(0, 0, w, h);
  const s = techState(def, u);
  const dark = shade(hex, -0.35);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // 앞 단 코 머리 (사슬 모양 고리들) 또는 매직링
  if (def === TECH.ring) {
    ctx.strokeStyle = dark; ctx.lineWidth = 3.2;
    const R = s.ringR, cx = 70, cy = 92;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.ring); ctx.stroke();
    if (s.ring > 0.6) { ctx.beginPath(); ctx.arc(cx + 3, cy + 2, R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, (s.ring - 0.6) / 0.4)); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R, cy + 6); ctx.quadraticCurveTo(cx - R - 18, cy + 22, cx - R - 30, cy + 26); ctx.stroke(); // 꼬리 실
  } else {
    for (const x of [30, 70, 110, 150]) {
      ctx.strokeStyle = dark; ctx.lineWidth = 2.6; ctx.fillStyle = hex;
      ctx.beginPath(); ctx.ellipse(x, 100, 17, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, 100, 9, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // 새로 생긴 코 머리
  for (const p of s.pops) {
    const k = ease(p.k);
    ctx.globalAlpha = k; ctx.fillStyle = hex; ctx.strokeStyle = dark; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(p.x, 80 - 4 * k, 11 * k + 0.1, 5.5 * k + 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // 실타래에서 오는 실 (실 걸기)
  const tipX = s.x, tipY = s.y;
  if (s.yo > 0) {
    const bx = 166, by = 18, t = s.yo;
    ctx.strokeStyle = dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(lerp(bx, tipX + 18, 0.6), lerp(by, tipY - 30, 0.4), lerp(bx, tipX - 2, t), lerp(by, tipY + 2, t)); ctx.stroke();
  }
  ctx.fillStyle = hex; ctx.strokeStyle = dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(166, 18, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 코바늘
  const hx = tipX + 52, hy = tipY - 70;
  ctx.strokeStyle = shade(HOOK, -0.2); ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(tipX + 4, tipY - 4); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = HOOK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(tipX + 4, tipY - 4); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tipX + 5, tipY - 3); ctx.quadraticCurveTo(tipX - 3, tipY + 1, tipX - 4, tipY - 6); ctx.stroke();
  // 바늘에 걸린 고리
  const dx = 52 / Math.hypot(52, 70), dy = -70 / Math.hypot(52, 70);
  for (let i = 0; i < s.loops; i++) {
    const d = 16 + i * 10, lx = tipX + 4 + dx * d, ly = tipY - 4 + dy * d;
    ctx.strokeStyle = dark; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(lx, ly, 9, 4, Math.atan2(dy, dx) + Math.PI / 2, 0, Math.PI * 2); ctx.stroke();
  }
  if (s.flash) { ctx.globalAlpha = s.flash * 0.6; ctx.fillStyle = ROSE; ctx.beginPath(); ctx.arc(tipX + 10, tipY - 14, 18, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  return s.cap;
}

// ── 플레이어 ─────────────────────────────────────
export function openMotion(p, a, ins, opt = {}) {
  const steps = a.steps;
  const colors = []; { let c = 0; steps.forEach((s) => { if (s.color != null) c = s.color; colors.push(c); }); }
  const hexOf = (i) => (p.yarn[colors[i]] || p.yarn[0]).hex;
  const maxStep = opt.maxStep || steps.length;

  // 장면 목록
  const scenes = [{ k: 'intro', d: 3.4 }, { k: 'ring', d: 4.2 }];
  steps.forEach((s, i) => {
    if (s.n > maxStep) return;
    const ops = expandOps(p.rounds[s.src]);
    const per = s.n <= 2 ? 1.0 : Math.max(0.14, 6.5 / ops.length);
    const intro = s.n <= 2 ? 2.8 : 2.0;
    scenes.push({ k: 'round', i, s, ops, per, intro, d: intro + ops.length * per + 1.6 });
  });
  scenes.push({ k: maxStep < steps.length ? 'locked' : 'finish', d: 4.5 });
  let acc = 0; for (const sc of scenes) { sc.t0 = acc; acc += sc.d; }
  const TOTAL = acc;

  const el = document.createElement('div');
  el.className = 'mo';
  el.innerHTML = `
    <div class="mo-top"><button class="mo-x" aria-label="닫기">✕</button><div><b>${p.title}</b><span class="mo-where"></span></div></div>
    <div class="mo-stage"><canvas class="mo-cv"></canvas><div class="mo-cap"><b></b><span></span></div><div class="mo-count"></div></div>
    <div class="mo-tech off"><canvas class="mo-tc" width="180" height="125"></canvas><div class="mo-tt"><b></b><ol></ol></div></div>
    <div class="mo-bar"><i></i></div>
    <div class="mo-ctl"><button data-c="prev">⏮<small>이전 단</small></button><button data-c="play" class="pl">⏸<small>멈춤</small></button><button data-c="next">⏭<small>다음 단</small></button><button data-c="speed">1×<small>속도</small></button></div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  const cv = el.querySelector('.mo-cv'), ctx = cv.getContext('2d');
  const tc = el.querySelector('.mo-tc'), tctx = tc.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  tc.width = 180 * dpr; tc.height = 125 * dpr; tctx.scale(dpr, dpr);
  let W = 0;
  const fit = () => {
    const box = el.querySelector('.mo-stage').getBoundingClientRect();
    W = Math.floor(Math.min(box.width, box.height));
    cv.style.width = cv.style.height = W + 'px';
    cv.width = cv.height = W * dpr;
  };
  fit(); window.addEventListener('resize', fit);

  let T = 0, playing = true, speed = 1, last = performance.now(), raf = 0;
  let techKey = null, techU = 0;
  const startAt = opt.startStep ? scenes.find((s) => s.k === 'round' && s.s.n === opt.startStep) : null;
  if (startAt) T = startAt.t0;

  const capB = el.querySelector('.mo-cap b'), capS = el.querySelector('.mo-cap span');
  const countEl = el.querySelector('.mo-count'), whereEl = el.querySelector('.mo-where');
  const ttB = el.querySelector('.mo-tt b'), ttOl = el.querySelector('.mo-tt ol'), techBox = el.querySelector('.mo-tech');
  let lastCap = '';
  const setCap = (b, s) => { const k = b + '|' + s; if (k === lastCap) return; lastCap = k; capB.textContent = b; capS.textContent = s; el.querySelector('.mo-cap').classList.remove('in'); void capB.offsetWidth; el.querySelector('.mo-cap').classList.add('in'); };
  const setTech = (key) => {
    if (key === techKey) return;
    techKey = key; techU = 0;
    techBox.classList.toggle('off', !key);
    if (!key) return;
    const d = TECH[key];
    ttB.textContent = d.title;
    ttOl.innerHTML = d.caps.map((c) => `<li>${c}</li>`).join('');
  };

  const n = steps.length;
  const view = () => {
    const R = (W / 2 - 14) / (n + 0.6);
    return { R, cx: W / 2, cy: W / 2 };
  };
  const radius = (i, R) => (i === 0 ? 1.0 : i + 1) * R;
  const band = (i, R) => [i === 0 ? 0 : (i + 0.5) * R, (i + 1.5) * R];

  function drawV(R, cx, cy, rc, ang, wAng, hex, k = 1, hl = false) {
    const pt = (r, t) => [cx + r * Math.cos(t), cy + r * Math.sin(t)];
    const half = Math.min(wAng * 0.36, 0.5);
    const tip = pt(rc - 0.3 * R * k, ang), l = pt(rc + 0.3 * R * k, ang - half * k), r = pt(rc + 0.3 * R * k, ang + half * k);
    ctx.strokeStyle = hl ? ROSE : shade(hex, -0.3); ctx.lineWidth = Math.max(1.4, R * 0.13);
    ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(r[0], r[1]); ctx.stroke();
  }
  function drawRound(i, upto, R, cx, cy, highlightFrom) { // upto: 지금까지 만든 코(슬롯) 수
    const s = steps[i], N = s.total, hex = hexOf(i);
    const [ri, ro] = band(i, R), a0 = -Math.PI / 2, a1 = a0 + (Math.PI * 2 * upto) / N;
    if (upto > 0) {
      ctx.fillStyle = hex; ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(cx, cy, ro, a0, a1); if (ri > 0) ctx.arc(cx, cy, ri, a1, a0, true); else ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const rc = radius(i, R), wA = (Math.PI * 2) / N;
    for (let k = 0; k < Math.floor(upto); k++) drawV(R, cx, cy, rc, a0 + wA * (k + 0.5), wA, hex, 1, highlightFrom != null && k >= highlightFrom);
    const frac = upto - Math.floor(upto);
    if (frac > 0) drawV(R, cx, cy, rc, a0 + wA * (Math.floor(upto) + 0.5), wA, hex, ease(frac), true);
  }
  function drawHook(x, y, ang, R) {
    const L = R * 2.2, ux = Math.cos(ang - 0.9), uy = Math.sin(ang - 0.9);
    ctx.lineCap = 'round';
    ctx.strokeStyle = shade(HOOK, -0.25); ctx.lineWidth = R * 0.32;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * L, y + uy * L); ctx.stroke();
    ctx.strokeStyle = HOOK; ctx.lineWidth = R * 0.22;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * L, y + uy * L); ctx.stroke();
  }
  function drawRing(R, cx, cy, prog, rr) {
    ctx.strokeStyle = shade(hexOf(0), -0.35); ctx.lineWidth = Math.max(2, R * 0.12); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, prog * 1.6)); ctx.stroke();
    if (prog > 0.6) { ctx.beginPath(); ctx.arc(cx + 2, cy + 1, rr * 0.86, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, (prog - 0.6) * 2.5)); ctx.stroke(); }
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) { T += dt * speed; if (T >= TOTAL) { T = TOTAL - 0.001; playing = false; syncPlay(); } }
    techU += dt * 2.0;
    render();
    raf = requestAnimationFrame(frame);
  }

  // 화면 확대: 처음 몇 단은 크게 보여 주고 단이 늘수록 넓게 (시간만으로 정해져서 되감기·건너뛰기에도 같은 화면)
  const Z = (i) => Math.max(1, Math.min(2.6, (n + 0.6) / (i + 2.2)));
  function zoomAt(sc, lt) {
    if (sc.k === 'intro') return 1;
    if (sc.k === 'ring') return lerp(1, Z(0), ease(lt / 1.2));
    if (sc.k === 'round') return lerp(Z(Math.max(0, sc.i - 1)), Z(sc.i), ease(lt / 1.0));
    return lerp(Z((sc.k === 'locked' ? maxStep : n) - 1), 1, ease(lt / 1.5));
  }

  function render() {
    const { R: R0, cx, cy } = view();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, W);
    const si = scenes.findIndex((s) => T >= s.t0 && T < s.t0 + s.d);
    const sc = scenes[si < 0 ? scenes.length - 1 : si], lt = T - sc.t0;
    const R = R0 * zoomAt(sc, lt);
    el.querySelector('.mo-bar i').style.width = (T / TOTAL) * 100 + '%';
    let curRound = -1, upto = 0, hookAt = null, ringProg = 1, ringR = 0.2 * R, tech = null;
    if (sc.k === 'round') {
      curRound = sc.i;
      const ls = lt - sc.intro;
      const nOps = sc.ops.length;
      const opF = Math.max(0, Math.min(nOps, ls / sc.per));
      const oi = Math.min(nOps - 1, Math.floor(opF));
      const op = sc.ops[oi];
      upto = ls < 0 ? 0 : oi >= nOps ? sc.s.total : op.slot + op.w * ease(opF - oi);
      if (opF >= nOps) upto = sc.s.total;
      const joinT = ls - nOps * sc.per;
      if (sc.i === 0) { ringProg = 1; ringR = joinT > 0 ? lerp(0.55 * R, 0.2 * R, ease(joinT / 1.2)) : 0.55 * R; }
      const N = sc.s.total, ang = -Math.PI / 2 + (Math.PI * 2 * Math.min(upto, N - 0.01)) / N;
      if (joinT < 0 && ls >= 0) hookAt = ang;
      if (ls < 0) tech = sc.i === 0 ? 'ring' : sc.ops[0].t;
      else if (joinT < 0) tech = sc.i === 0 ? 'ring' : op.t;
      else tech = p.spiral ? null : 'join';
      // 자막
      const line = ins.lines.find((l) => sc.s.n >= l.from && sc.s.n <= l.to);
      whereEl.textContent = `${sc.s.n} / ${n}단`;
      const prevColor = sc.i > 0 && colors[sc.i] !== colors[sc.i - 1] ? `${p.yarn[colors[sc.i]].color} 실로 바꿔요 · ` : '';
      if (ls < 0) setCap(`${sc.s.n}단`, prevColor + (line ? line.text.replace(/^〔[^〕]*〕\s*/, '') : ''));
      else if (joinT < 0) {
        const t = op.t;
        setCap(`${sc.s.n}단 · ${NAME[t]}${t === 'inc' ? ' — 한 코에 2번' : t === 'dec' ? ' — 두 코를 1코로' : ''}`, line ? line.text.replace(/^〔[^〕]*〕\s*/, '') : '');
      } else {
        const nextColor = sc.i + 1 < n && colors[sc.i + 1] !== colors[sc.i] ? ` 다음 단은 ${p.yarn[colors[sc.i + 1]].color} 실로 떠요.` : '';
        setCap(`${sc.s.n}단 끝 · ${sc.s.total}코 완성`, (p.spiral ? '나선형이라 잇지 않고 바로 다음 단으로 넘어가요.' : '첫 코에 빼뜨기로 잇고 기둥코를 세워요.') + nextColor);
      }
      const shown = Math.floor(upto + 1e-6);
      countEl.innerHTML = `<b>${Math.min(shown, sc.s.total)}</b> / ${sc.s.total}코`;
      countEl.classList.toggle('done', shown >= sc.s.total);
    } else if (sc.k === 'ring') {
      ringProg = Math.min(1, lt / 2.6); ringR = 0.55 * R; tech = 'ring';
      whereEl.textContent = '시작';
      setCap('매직링으로 시작해요', '실 끝을 손가락에 두 번 감아 고리를 만들고, 고리 안에 1단을 떠요.');
      countEl.innerHTML = ''; countEl.classList.remove('done');
    } else if (sc.k === 'intro') {
      whereEl.textContent = '';
      setCap(p.title, `${steps.length}단 · ${p.size} · ${p.hook}. 짧은뜨기와 늘리기만 알면 떠요.`);
      countEl.innerHTML = ''; tech = null;
    } else if (sc.k === 'finish') {
      whereEl.textContent = '완성';
      setCap('완성! 🎉', (ins.finish[0] || '실 끝을 정리해요.'));
      countEl.innerHTML = ''; tech = null;
    } else { // locked
      whereEl.textContent = '';
      setCap(`${maxStep}단까지 봤어요`, '광고 한 번 보고 도안을 열면 끝까지 볼 수 있어요.');
      countEl.innerHTML = ''; tech = null;
    }
    setTech(tech);

    // 그리기
    const intro = sc.k === 'intro', fin = sc.k === 'finish';
    ctx.save();
    if (intro || fin) {
      ctx.translate(cx, cy); ctx.rotate((intro ? lt : lt) * 0.12); ctx.translate(-cx, -cy);
      ctx.globalAlpha = intro ? Math.min(1, 0.25 + lt * 0.2) : 1;
    }
    const doneRounds = intro || fin || sc.k === 'locked' ? (sc.k === 'locked' ? maxStep : n) : Math.max(0, curRound);
    for (let i = 0; i < doneRounds; i++) drawRound(i, steps[i].total, R, cx, cy);
    if (curRound >= 0) drawRound(curRound, upto, R, cx, cy);
    ctx.restore(); ctx.globalAlpha = 1;
    if (sc.k === 'ring' || curRound === 0) drawRing(R, cx, cy, ringProg, ringR);
    if (hookAt != null) {
      const rc = radius(curRound, R);
      drawHook(cx + rc * Math.cos(hookAt), cy + rc * Math.sin(hookAt), hookAt, Math.min(R, R0 * 1.4));
      // 늘리기 +1
      const opF = (lt - sc.intro) / sc.per, oi = Math.floor(opF), op = sc.ops[Math.min(sc.ops.length - 1, oi)];
      if (op && op.t === 'inc' && opF - oi > 0.45) {
        const k = (opF - oi - 0.45) / 0.55, r = rc + R * (0.7 + k * 0.5);
        ctx.globalAlpha = 1 - k * 0.6; ctx.fillStyle = ROSE; ctx.font = `bold ${Math.max(11, R * 0.55)}px Jua, sans-serif`; ctx.textAlign = 'center';
        ctx.fillText('+1', cx + r * Math.cos(hookAt), cy + r * Math.sin(hookAt)); ctx.globalAlpha = 1;
      }
    }
    if (fin) { // 반짝이
      for (let k = 0; k < 10; k++) {
        const t = (lt * 0.6 + k / 10) % 1, ang = k * 2.4, r = (n + 0.2) * R * (0.6 + 0.5 * t);
        ctx.globalAlpha = 1 - t; ctx.fillStyle = k % 2 ? ROSE : HOOK;
        ctx.beginPath(); ctx.arc(cx + r * Math.cos(ang), cy + r * Math.sin(ang), 3 + 3 * (1 - t), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 작은 화면
    if (techKey) {
      const d = TECH[techKey];
      const u = techU % (d.acts.length + 1.2);
      const cap = drawTech(tctx, 180, 125, d, Math.min(u, d.acts.length - 0.001), curRound >= 0 ? hexOf(curRound) : hexOf(0));
      ttOl.querySelectorAll('li').forEach((li, k) => li.classList.toggle('on', k === cap));
    }
  }

  const syncPlay = () => { const b = el.querySelector('[data-c="play"]'); b.innerHTML = playing ? '⏸<small>멈춤</small>' : '▶<small>재생</small>'; };
  const roundStarts = scenes.filter((s) => s.k === 'round');
  el.querySelector('.mo-ctl').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const c = b.dataset.c;
    if (c === 'play') { if (!playing && T >= TOTAL - 0.01) T = 0; playing = !playing; syncPlay(); }
    if (c === 'speed') { speed = speed === 1 ? 2 : speed === 2 ? 0.5 : 1; b.innerHTML = `${speed === 0.5 ? '½' : speed}×<small>속도</small>`; }
    if (c === 'next') { const s = roundStarts.find((x) => x.t0 > T + 0.05); T = s ? s.t0 : scenes[scenes.length - 1].t0; }
    if (c === 'prev') { const cur = [...roundStarts].reverse().find((x) => x.t0 <= T - 1.0); T = cur ? cur.t0 : 0; }
  };
  el.querySelector('.mo-bar').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); T = Math.max(0, Math.min(TOTAL - 0.01, ((e.clientX - r.left) / r.width) * TOTAL)); };
  const close = () => { cancelAnimationFrame(raf); window.removeEventListener('resize', fit); document.body.style.overflow = ''; el.remove(); opt.onClose && opt.onClose(); };
  el.querySelector('.mo-x').onclick = close;
  raf = requestAnimationFrame((t) => { last = t; frame(t); });
  // 테스트·검수용
  el._seek = (t) => { T = t; playing = false; syncPlay(); render(); };
  el._scenes = scenes;
  return { close, el };
}
