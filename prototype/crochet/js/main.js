// 코바늘 도안함 — 화면 (#/ 목록, #/p/아이디 상세, #/k/아이디 뜨기, #/mine 내 도안, #/tools 도구)
import { analyze } from './validate.js?v=1123134540';
import { instructions } from './text.js?v=1123134540';
import { chartSVG, lookSVG, legendItems, symbolSVG, esc } from './chart.js?v=1123134540';
import { LEVELS, CATEGORIES } from './stitches.js?v=1123134540';
import { makePatternPdf, savePdf } from './pdf.js?v=1123134540';
import { Ads } from './ads.js?v=1123134540';
import { Store } from './store.js?v=1123134540';
import { motionSupported, openMotion } from './motion.js?v=1123134540';

const $ = (s) => document.querySelector(s);
const view = $('#view');
let PATTERNS = [];           // [{ p, a, ins }]
const byId = (id) => PATTERNS.find((x) => x.p.id === id);
let filter = '전체';
let calcMode = 'rect';

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200);
}

async function load() {
  const idx = await (await fetch('patterns/index.json', { cache: 'no-cache' })).json();
  const list = await Promise.all(idx.patterns.map(async (f) => {
    try {
      const p = await (await fetch('patterns/' + f, { cache: 'no-cache' })).json();
      const a = analyze(p);
      if (!a.ok) { console.warn('검증 실패로 숨김:', f, a.errors); return null; }
      return { p, a, ins: instructions(p, a) };
    } catch (e) { console.warn('불러오기 실패:', f, e); return null; }
  }));
  PATTERNS = list.filter(Boolean);
}

const meta = (p) => `${LEVELS[p.level]} · ${esc(p.size)}`;
const stepsWord = (p) => (p.type === 'round' ? '단' : '단');

// ── 목록 ──
function home() {
  const cats = ['전체', ...CATEGORIES.filter((c) => PATTERNS.some((x) => x.p.category === c))];
  const list = PATTERNS.filter((x) => filter === '전체' || x.p.category === filter);
  view.innerHTML = `
    <div class="hero"><h1>코바늘 도안함</h1><p>한 단 한 단 코 수를 검증한 도안만 올려요.<br>광고 한 번이면 무료로 받아 PDF 로 저장할 수 있어요.</p><span class="yarn">🧶</span></div>
    <div class="chips">${cats.map((c) => `<button class="chip ${c === filter ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
    <div class="grid">${list.map(({ p, a }) => `
      <a class="pc" href="#/p/${p.id}">
        <div class="ph">${lookSVG(p, a)}</div>
        <span class="lk ${Store.isUnlocked(p.id) ? 'open' : ''}">${Store.isUnlocked(p.id) ? '열림' : '🔒 무료'}</span>
        <div class="bd"><h3>${esc(p.title)}</h3><div class="mt">${p.category} · ${meta(p)}</div></div>
      </a>`).join('')}</div>`;
  view.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { filter = b.dataset.cat; home(); });
}

// ── 상세 ──
function detail(id) {
  const it = byId(id);
  if (!it) return notFound();
  const { p, a, ins } = it;
  const open = Store.isUnlocked(id);
  const pr = Store.progress(id);
  const lines = ins.lines.map((l) => `<div class="ln"><span class="lb">${l.label}</span><span class="tt">${esc(l.text)}</span><span class="tot">${l.total}</span></div>`).join('');
  const preview = ins.lines.slice(0, 2).map((l) => `<div class="ln"><span class="lb">${l.label}</span><span class="tt">${esc(l.text)}</span><span class="tot">${l.total}</span></div>`).join('');
  const chartName = p.type === 'grid' ? '배색 차트' : p.shape === 'sphere' ? '단별 코 수' : '기호도';
  view.innerHTML = `
    <div class="top"><a class="back" href="#/">‹</a><span class="sub">${p.category}</span></div>
    <div class="big">${lookSVG(p, a)}</div>
    <h1 class="title">${esc(p.title)}</h1>
    <p class="lead">${esc(p.summary)}</p>
    <div class="badges">
      <span class="badge">✓ 코 수 자동 검증</span>
      ${p.tested ? `<span class="badge rose">✓ 실제로 떠 봤어요</span>` : ''}
      <span class="badge gray">${LEVELS[p.level]}</span>
      <span class="badge gray">${a.stats.steps}${stepsWord(p)}</span>
    </div>
    ${motionSupported(p) ? `<button class="motion-btn" id="bMotion"><span class="pi">▶</span><span><b>움직이는 뜨는 법</b><span>${open ? `${a.stats.steps}단을 한 코씩 움직임으로 보여 줘요` : '1~2단을 먼저 움직임으로 볼 수 있어요'}</span></span></button>` : ''}
    <div class="box"><h2>재료와 크기</h2><dl class="kv">
      <dt>완성 크기</dt><dd>${esc(p.size)}</dd>
      <dt>걸리는 시간</dt><dd>${esc(p.time || '-')}</dd>
      <dt>코바늘</dt><dd>${esc(p.hook)}</dd>
      ${p.gauge ? `<dt>게이지</dt><dd>${esc(p.gauge)}</dd>` : ''}
      <dt>실</dt><dd>${p.yarn.map((y) => `<div><span class="sw" style="background:${y.hex}"></span>${esc(y.color)} · ${esc(y.name)}${y.amount ? ` · ${esc(y.amount)}` : ''}</div>`).join('')}</dd>
    </dl></div>
    <div class="box"><h2>쓰는 기법</h2><div class="legend">${legendItems(p).map((l) => `<div>${symbolSVG(l.code, 28)}<span>${esc(l.name)}</span></div>`).join('')}</div></div>
    <div class="verify"><span style="font-size:22px">🔍</span><div><b>${a.stats.steps}${stepsWord(p)} 모두 코 수를 확인했어요</b>앞 단에서 쓰는 코와 새로 생기는 코를 단마다 계산해서, 적힌 코 수와 맞는 도안만 올려요. 뜨는 법 글도 같은 데이터에서 자동으로 만들어 숫자가 어긋나지 않아요.</div></div>
    ${open ? `
      <div class="box"><h2>${chartName}</h2><div class="chart">${chartSVG(p, a)}</div></div>
      <div class="box lines"><h2>뜨는 법</h2>${ins.intro.map((t) => `<div class="note">· ${esc(t)}</div>`).join('')}${lines}${ins.finish.map((t) => `<div class="note">· ${esc(t)}</div>`).join('')}</div>
    ` : `
      <div class="box lines"><h2>뜨는 법 미리보기</h2>${preview}
        <div class="locked"><div class="blur">${ins.lines.slice(2, 6).map((l) => `<div class="ln"><span class="lb">${l.label}</span><span class="tt">${esc(l.text)}</span><span class="tot">${l.total}</span></div>`).join('')}<div class="chart">${chartSVG(p, a)}</div></div>
          <div class="over"><div><p>나머지 ${Math.max(0, ins.lines.length - 2)}줄과 ${chartName}, PDF 는<br>광고 한 번 보고 무료로 열 수 있어요</p></div></div></div>
      </div>`}
    <div style="height:70px"></div>
    <div class="bar">${open
      ? `<button class="btn ghost" id="bPdf">📄 PDF 저장</button><a class="btn" href="#/k/${id}">${pr.done ? '다시 뜨기' : pr.step > 1 || pr.st ? `이어 뜨기 · ${pr.step}단` : '뜨기 시작'}</a>`
      : `<button class="btn wide" id="bOpen">${Ads.native ? '▶ 광고 보고 무료로 열기' : '무료로 열기'}</button>`}</div>`;
  const bOpen = $('#bOpen');
  if (bOpen) bOpen.onclick = async () => {
    bOpen.disabled = true;
    const r = await Ads.rewarded();
    bOpen.disabled = false;
    if (r === null) return toast('광고를 불러오는 중이에요. 잠깐 뒤에 다시 눌러 주세요');
    if (!r) return toast('광고를 끝까지 보면 열려요');
    Store.unlock(id);
    toast(Ads.native ? '도안이 열렸어요! 🎉' : '웹 체험판은 광고 없이 바로 열어 드려요 🎉');
    detail(id);
  };
  const bPdf = $('#bPdf');
  if (bPdf) bPdf.onclick = () => exportPdf(it);
  const bMotion = $('#bMotion');
  if (bMotion) bMotion.onclick = () => openMotion(p, a, ins, open ? {} : { maxStep: Math.min(2, a.stats.steps) });
}

async function exportPdf({ p, a }) {
  $('#busy').classList.remove('off');
  try {
    const bytes = await makePatternPdf(p, a);
    const how = await savePdf(bytes, `${p.title.replace(/[\\/:*?"<>|]/g, '')}.pdf`);
    toast(how === 'shared' ? 'PDF 를 저장할 곳을 골라 주세요' : 'PDF 를 내려받았어요');
  } catch (e) { console.error(e); toast('PDF 를 만들지 못했어요'); }
  finally { $('#busy').classList.add('off'); }
}

// ── 뜨기 (단수 카운터) ──
function knit(id) {
  const it = byId(id);
  if (!it || !Store.isUnlocked(id)) { location.hash = '#/p/' + id; return; }
  const { p, a, ins } = it;
  const N = a.steps.length;
  let pr = Store.progress(id);
  if (pr.done) pr = { step: 1, st: 0, done: false };
  const render = () => {
    const s = a.steps[pr.step - 1];
    const line = ins.lines.find((l) => pr.step >= l.from && pr.step <= l.to);
    const full = pr.st >= s.total && s.total > 0;
    view.innerHTML = `
      <div class="top"><a class="back" href="#/p/${id}">‹</a><div><h1 style="font-size:20px">${esc(p.title)}</h1><div class="sub">${pr.done ? '완성!' : `${pr.step} / ${N}단`}</div></div></div>
      <div class="prog"><i style="width:${pr.done ? 100 : ((pr.step - 1) / N) * 100}%"></i></div>
      ${pr.done ? `<div class="done"><div class="em">🎉</div><h2>완성했어요!</h2><p class="small">마무리: ${ins.finish.map(esc).join(' ')}</p><div class="nav2"><a class="btn ghost" href="#/p/${id}">도안 보기</a><button class="btn" id="again">처음부터 다시</button></div></div>` : `
      <div class="box chart" style="margin-top:0">${chartSVG(p, a, { highlight: pr.step })}</div>
      <div class="stepcard">
        <div class="n">${pr.step}단<small>${line && line.from !== line.to ? `(${line.label} 중)` : ''}</small></div>
        <div class="tx">${esc(line ? line.text : '')}</div>
        <div class="goal">다 뜨면 <b>${s.total}코</b>${s.spaces && s.into !== 'st' ? ` · 공간 ${s.spaces}개` : ''}${pr.step > 1 ? ` (앞 단 ${s.prev}코)` : ''}</div>
        ${motionSupported(p) ? `<button class="mini-motion" id="bMo">▶ 이 단을 움직임으로 보기</button>` : ''}
      </div>
      <div class="tally">
        <button class="mini" id="stMinus" aria-label="한 코 빼기">−</button>
        <button class="tap ${full ? 'full' : ''}" id="stPlus">${full ? '✓ ' : ''}${pr.st}<small>/ ${s.total}코</small></button>
        <button class="mini" id="stReset" aria-label="코 세기 처음으로">↺</button>
      </div>
      <p class="small" style="text-align:center;margin:6px 0 0">코를 하나 뜰 때마다 눌러서 세어 보세요 (선택)</p>
      <div class="nav2">
        <button class="btn ghost" id="prev" ${pr.step === 1 ? 'disabled style="opacity:.4"' : ''}>‹ 이전 단</button>
        <button class="btn ${pr.step === N ? 'sage' : ''}" id="next">${pr.step === N ? '완성 ✓' : '다음 단 ›'}</button>
      </div>`}`;
    const save = () => Store.setProgress(id, pr);
    const on = (sel, fn) => { const el = $(sel); if (el) el.onclick = () => { fn(); save(); render(); }; };
    on('#stPlus', () => { pr.st++; if (pr.st === s.total) navigator.vibrate && navigator.vibrate(40); });
    on('#stMinus', () => { pr.st = Math.max(0, pr.st - 1); });
    on('#stReset', () => { pr.st = 0; });
    on('#prev', () => { if (pr.step > 1) { pr.step--; pr.st = 0; } });
    on('#next', () => { if (pr.step < N) { pr.step++; pr.st = 0; } else pr.done = true; });
    on('#again', () => { pr = { step: 1, st: 0, done: false }; });
    const bMo = $('#bMo');
    if (bMo) bMo.onclick = () => openMotion(p, a, ins, { startStep: pr.step });
    // 지금 단이 보이게 (원형 기호도는 가운데부터라 그대로 둔다)
  };
  render();
}

// ── 내 도안 ──
function mine() {
  const ids = Store.unlockedIds().filter(byId);
  view.innerHTML = `<div class="top"><h1>내 도안</h1></div>` + (ids.length ? ids.map((id) => {
    const { p, a } = byId(id), pr = Store.progress(id), N = a.steps.length;
    const pct = pr.done ? 100 : ((pr.step - 1) / N) * 100;
    return `<a class="mine" href="#/p/${id}"><div class="ph">${lookSVG(p, a)}</div><div class="bd"><h3>${esc(p.title)}</h3>
      <div class="mt">${pr.done ? '완성 🎉' : pr.touched ? `${pr.step} / ${N}단 뜨는 중` : '아직 시작 전'}</div><div class="prog"><i style="width:${pct}%"></i></div></div></a>`;
  }).join('') : `<div class="empty"><div class="em">📒</div><p>아직 연 도안이 없어요.<br>마음에 드는 도안을 무료로 열어 보세요!</p><a class="btn" href="#/">도안 보러 가기</a></div>`);
}

// ── 도구 ──
function tools() {
  const c = Store.counter();
  const calc = { gs: 20, gr: 22, w: 15, h: 15, d: 10, ...Store.calc() };
  view.innerHTML = `
    <div class="top"><h1>도구</h1></div>
    <div class="box" style="margin-top:0"><h2>단수 카운터</h2>
      <div class="counter">
        <div class="cbox"><div class="lab">단</div><div class="num" id="cRow">${c.row}</div><div class="row"><button data-c="row" data-d="-1">−</button><button class="plus" data-c="row" data-d="1">+</button></div></div>
        <div class="cbox"><div class="lab">코</div><div class="num" id="cSt">${c.st}</div><div class="row"><button data-c="st" data-d="-1">−</button><button class="plus" data-c="st" data-d="1">+</button></div></div>
      </div>
      <button class="btn ghost wide" id="cReset" style="margin-top:12px">처음으로</button>
    </div>
    <div class="box"><h2>크기 계산기</h2>
      <div class="seg"><button data-m="rect" class="${calcMode === 'rect' ? 'on' : ''}">네모 (평뜨기)</button><button data-m="circle" class="${calcMode === 'circle' ? 'on' : ''}">동그라미 (원형)</button></div>
      <p class="small" style="margin:0 0 10px">먼저 짧은뜨기로 10cm 정도 떠 보고, 10cm 안에 든 코 수와 단 수를 재어 넣어 주세요.</p>
      <div class="form">
        <label>10cm 안의 코 수<input type="number" inputmode="decimal" id="gs" value="${calc.gs}"></label>
        <label>10cm 안의 단 수<input type="number" inputmode="decimal" id="gr" value="${calc.gr}"></label>
        ${calcMode === 'rect'
          ? `<label>원하는 가로 (cm)<input type="number" inputmode="decimal" id="w" value="${calc.w}"></label><label>원하는 세로 (cm)<input type="number" inputmode="decimal" id="h" value="${calc.h}"></label>`
          : `<label>원하는 지름 (cm)<input type="number" inputmode="decimal" id="d" value="${calc.d}"></label>`}
      </div>
      <div class="result" id="calcOut"></div>
    </div>`;
  view.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => {
    const k = b.dataset.c; c[k] = Math.max(0, c[k] + +b.dataset.d); Store.setCounter(c);
    $(k === 'row' ? '#cRow' : '#cSt').textContent = c[k];
  });
  $('#cReset').onclick = () => { c.row = 0; c.st = 0; Store.setCounter(c); tools(); };
  view.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { calcMode = b.dataset.m; tools(); });
  const out = () => {
    for (const k of ['gs', 'gr', 'w', 'h', 'd']) { const el = $('#' + k); if (el) calc[k] = parseFloat(el.value) || 0; }
    Store.setCalc(calc);
    const o = $('#calcOut');
    if (!(calc.gs > 0 && calc.gr > 0)) { o.innerHTML = '게이지를 넣어 주세요'; return; }
    if (calcMode === 'rect') {
      const st = Math.max(1, Math.round(calc.w / 10 * calc.gs)), rows = Math.max(1, Math.round(calc.h / 10 * calc.gr));
      o.innerHTML = `<div class="big2">사슬 ${st + 1}코로 시작 → ${rows}단</div><div class="small">기초 ${st}코 + 기둥코 1코. 짧은뜨기 ${st}코씩 ${rows}단을 뜨면 약 ${(st / calc.gs * 10).toFixed(1)} × ${(rows / calc.gr * 10).toFixed(1)}cm 예요.</div>`;
    } else {
      const n = Math.max(1, Math.round((calc.d / 2) * calc.gr / 10));
      const lines = [];
      for (let r = 1; r <= Math.min(n, 40); r++) {
        let t;
        if (r === 1) t = '고리에 짧은뜨기 6코';
        else if (r === 2) t = '[늘리기 1번] ×6';
        else if (r % 2 === 1) t = `[짧은뜨기 ${r - 2}코, 늘리기 1번] ×6`;
        else { const h = (r - 2) / 2; t = `[짧은뜨기 ${h}코, 늘리기 1번, 짧은뜨기 ${h}코] ×6`; }
        lines.push(`<li><b>${r}단</b> ${t} → ${6 * r}코</li>`);
      }
      o.innerHTML = `<div class="big2">${n}단 · 마지막 ${6 * n}코</div><div class="small">짧은뜨기 평면 원 기준. 단마다 6코씩 늘리고, 짝수 단은 늘리는 자리를 엇갈려 둥글게 만들어요.</div><ol>${lines.join('')}</ol>`;
    }
  };
  view.querySelectorAll('.form input').forEach((i) => i.oninput = out);
  out();
}

function notFound() { view.innerHTML = `<div class="empty"><div class="em">🧶</div><p>도안을 찾지 못했어요</p><a class="btn" href="#/">목록으로</a></div>`; }

function route() {
  const h = location.hash.slice(1) || '/';
  const [, a, b] = h.split('/');
  const tab = a === 'mine' ? 'mine' : a === 'tools' ? 'tools' : 'home';
  document.querySelectorAll('#tabs a').forEach((x) => x.classList.toggle('on', x.dataset.tab === tab));
  $('#tabs').classList.toggle('off', a === 'k');
  if (a === 'p') detail(b);
  else if (a === 'k') knit(b);
  else if (a === 'mine') mine();
  else if (a === 'tools') tools();
  else home();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
load().then(() => { route(); Ads.init(); }).catch((e) => { console.error(e); view.innerHTML = '<div class="empty">도안 목록을 불러오지 못했어요</div>'; });
