// 도안 그림 (SVG 문자열). DOM 없이 문자열만 만들어서 앱·검수 페이지·PDF 가 같이 쓴다.
//   chartSVG(p, a, opt)  기호도 (원형·평뜨기) 또는 배색 차트
//   lookSVG(p, a)        완성 모습 미리보기 (목록 카드·표지)
//   legendItems(p)       이 도안에 쓰인 기호 목록 → symbolSVG(code)
import { STITCH } from './stitches.js?v=1123121541';

const INK = ['#3b3340', '#c0573e']; // 단마다 번갈아 (일본·한국식 기호도처럼 읽기 쉽게)
const f1 = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function shade(hex, k) { // k<0 어둡게, k>0 밝게
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = k < 0 ? 0 : 255, m = Math.abs(k);
  r = Math.round(r + (t - r) * m); g = Math.round(g + (t - g) * m); b = Math.round(b + (t - b) * m);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ── 한 단을 '자리' 목록으로 펼치기 ─────────────────────
// 자리 하나 = 기호 하나. w 는 차지하는 칸 수 (늘리기 2칸, 사슬 0.7칸 …)
function expand(seq, out = []) {
  for (const el of seq) {
    if (Array.isArray(el)) {
      const [c, n = 1] = el;
      for (let i = 0; i < n; i++) {
        if (c === 'ch') out.push({ t: 'ch', w: 0.75 });
        else if (c === 'sk') out.push({ t: 'sk', w: 0.5 });
        else out.push({ t: c, w: Math.max(1, STITCH[c].make) });
      }
    } else if ('rep' in el) for (let i = 0; i < el.rep; i++) expand(el.seq, out);
    else {
      const items = expand(el.do, []);
      out.push({ t: 'group', items, w: items.reduce((s, x) => s + x.w, 0) });
    }
  }
  return out;
}
function stepMarks(src) {
  const one = expand(src.seq);
  const out = [];
  for (let i = 0; i < (src.repeat ?? 1); i++) out.push(...one);
  return out;
}

// ── 기호 그리기 (frame(u, v) → 점) ─────────────────────
// u: 칸 좌표, v: 단 안에서의 높이 (-0.5 아래 ~ +0.5 위)
function drawMark(m, u0, frame, s, ink) {
  const u1 = u0 + m.w, um = (u0 + u1) / 2;
  const P = (u, v) => frame(u, v);
  const L = (a, b, wd = 1.6) => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${ink}" stroke-width="${wd}" stroke-linecap="round"/>`;
  const dirAt = (u, v) => { const a = P(u, v), b = P(u, v + 0.05); const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
  const X = (c, up, z = s) => {
    const [ux, uy] = up, tx = -uy, ty = ux, k = z * 0.3;
    const d1 = [ux + tx, uy + ty], d2 = [ux - tx, uy - ty];
    return L([c[0] + d1[0] * k, c[1] + d1[1] * k], [c[0] - d1[0] * k, c[1] - d1[1] * k]) +
           L([c[0] + d2[0] * k, c[1] + d2[1] * k], [c[0] - d2[0] * k, c[1] - d2[1] * k]);
  };
  const tall = (base, top, slashes, up) => { // 긴뜨기 계열: 세로선 + 위 가로 막대 + 빗금
    const [ux, uy] = up, tx = -uy, ty = ux, k = s * 0.32;
    let o = L(base, top) + L([top[0] + tx * k, top[1] + ty * k], [top[0] - tx * k, top[1] - ty * k]);
    for (let i = 0; i < slashes; i++) {
      const t = 0.5 + (i - (slashes - 1) / 2) * 0.22;
      const c = [base[0] + (top[0] - base[0]) * t, base[1] + (top[1] - base[1]) * t];
      o += L([c[0] + (tx * 0.6 - ux * 0.35) * k * 1.1, c[1] + (ty * 0.6 - uy * 0.35) * k * 1.1], [c[0] - (tx * 0.6 - ux * 0.35) * k * 1.1, c[1] - (ty * 0.6 - uy * 0.35) * k * 1.1]);
    }
    return o;
  };
  const H = { hdc: 0, dc: 1, tr: 2 };
  const one = (t, u, base, topV = 0.42) => {
    const up = dirAt(u, 0);
    if (t === 'sc' || t === 'sc_blo') {
      let o = X(P(u, 0), up);
      if (t === 'sc_blo') { const a = P(u - 0.3, -0.32), b = P(u + 0.3, -0.32); o += `<path d="M${f1(a[0])} ${f1(a[1])} Q${f1(P(u, -0.45)[0])} ${f1(P(u, -0.45)[1])} ${f1(b[0])} ${f1(b[1])}" fill="none" stroke="${ink}" stroke-width="1.4"/>`; }
      return o;
    }
    if (t in H) return tall(base || P(u, -0.42), P(u, topV), H[t], up);
    if (t === 'ch') { const c = P(u, 0.05), tx = -up[1], ty = up[0]; const ang = Math.atan2(ty, tx) * 180 / Math.PI; return `<ellipse cx="${f1(c[0])}" cy="${f1(c[1])}" rx="${f1(s * 0.34)}" ry="${f1(s * 0.2)}" transform="rotate(${f1(ang)} ${f1(c[0])} ${f1(c[1])})" fill="none" stroke="${ink}" stroke-width="1.4"/>`; }
    if (t === 'sl') { const c = P(u, 0); return `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(s * 0.14)}" fill="${ink}"/>`; }
    return '';
  };
  const t = m.t;
  if (t === 'inc' || t === 'hdcinc' || t === 'dcinc' || t === 'dec' || t === 'dcdec') {
    // 늘리기·모아뜨기는 칸 폭과 상관없이 기호 크기만큼만 벌린다
    const up = dirAt(um, 0), tg = [-up[1], up[0]];
    const a0 = P(u0, 0), a1 = P(u1, 0);
    const sp = Math.min(s * 0.4, Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) * 0.3);
    const off = (pt, k, z = 0) => [pt[0] + tg[0] * sp * k + up[0] * z, pt[1] + tg[1] * sp * k + up[1] * z];
    if (t === 'inc') { const base = P(um, -0.42), m1 = P(um, 0.1); const A = off(m1, 1), B = off(m1, -1); return L(base, A) + L(base, B) + X(off(m1, 1.15, s * 0.2), up, s * 0.55) + X(off(m1, -1.15, s * 0.2), up, s * 0.55); }
    if (t === 'dec') { const top = P(um, 0.42), m1 = P(um, -0.1); const A = off(m1, 1), B = off(m1, -1); return L(A, top) + L(B, top) + X(off(m1, 1.15, -s * 0.2), up, s * 0.55) + X(off(m1, -1.15, -s * 0.2), up, s * 0.55); }
    const hk = t === 'hdcinc' ? 0 : 1;
    if (t === 'dcdec') { const top = P(um, 0.42), b = P(um, -0.42); return tall(off(b, 1), top, 1, up) + L(off(b, -1), top); }
    const base = P(um, -0.42), tp = P(um, 0.42);
    return tall(base, off(tp, 1.2), hk, up) + tall(base, off(tp, -1.2), hk, up);
  }
  if (t === 'group') { // 한 자리에 뜨는 묶음: 아래 한 점에서 부채꼴로
    const base = P(um, -0.45);
    let u = u0, o = '';
    for (const it of m.items) {
      const c = u + it.w / 2;
      o += it.t in H ? one(it.t, c, base) : one(it.t, c, null);
      u += it.w;
    }
    return o;
  }
  return one(t, um, null);
}

// ── 원형 기호도 ─────────────────────────────────────
function roundChart(p, a, opt) {
  const R = 34, square = p.shape === 'square';
  const steps = a.steps;
  const n = steps.length;
  const ext = (n + 0.75) * R;
  const hi = opt.highlight;
  let bands = '', marks = '', labels = '';
  const ring = (r) => square ? `M${-r} ${-r}H${r}V${r}H${-r}Z` : `M${-r} 0A${r} ${r} 0 1 0 ${r} 0A${r} ${r} 0 1 0 ${-r} 0Z`;
  let color = 0;
  steps.forEach((s, i) => {
    const src = p.rounds[s.src];
    if (s.color != null) color = s.color;
    const r = (i + 1) * R;
    const ms = stepMarks(src);
    const W = ms.reduce((t, m) => t + m.w, 0);
    // 네모: 둘레를 따라 고르게 놓고, 첫 모서리(사슬 2코 이상이 든 자리)가 오른쪽 위 모서리에 오게 돌린다
    let shift = 0;
    if (square) {
      let u = 0;
      for (const m of ms) {
        const corner = m.t === 'group' ? m.items.some((x) => x.t === 'ch') : false;
        const chRun = m.t === 'ch' && ms[ms.indexOf(m) + 1] && ms[ms.indexOf(m) + 1].t === 'ch';
        if (corner || chRun) { shift = (corner ? u + m.w / 2 : u + 0.75) / W - 1 / 8; break; }
        u += m.w;
      }
    }
    const frame = (u, v) => {
      const rr = r + v * R;
      if (!square) { const ang = -Math.PI / 2 + (u / W) * Math.PI * 2; return [rr * Math.cos(ang), rr * Math.sin(ang)]; }
      let t = (((u / W - shift) % 1) + 1) % 1 * 8; // 둘레 8칸 (위 가운데부터 시계 방향)
      if (t < 1) return [rr * t, -rr];
      if (t < 3) return [rr, -rr + rr * (t - 1)];
      if (t < 5) return [rr - rr * (t - 3), rr];
      if (t < 7) return [-rr, rr - rr * (t - 5)];
      return [-rr + rr * (t - 7), -rr];
    };
    const yarn = p.yarn[color] || p.yarn[0];
    const dim = hi != null && hi !== s.n;
    bands += `<path d="${ring(r + R / 2)}${ring(r - R / 2)}" fill="${yarn.hex}" fill-opacity="${dim ? 0.12 : 0.38}" fill-rule="evenodd"${hi === s.n ? ` stroke="#d9667b" stroke-width="3"` : ''}/>`;
    const spacing = (2 * Math.PI * r) / W;
    const sz = Math.min(R * 0.62, spacing * 0.95);
    const ink = INK[i % 2];
    let u = 0, g = '';
    for (const m of ms) { g += drawMark(m, u, frame, sz, ink); u += m.w; }
    marks += `<g opacity="${dim ? 0.22 : 1}">${g}</g>`;
    const lp = frame(0, 0);
    labels += `<g opacity="${dim ? 0.35 : 1}"><circle cx="${f1(lp[0])}" cy="${f1(lp[1])}" r="9" fill="#fff" stroke="${ink}" stroke-width="1.2"/><text x="${f1(lp[0])}" y="${f1(lp[1] + 3.6)}" font-size="10.5" font-weight="700" text-anchor="middle" fill="${ink}">${s.n}</text></g>`;
  });
  const center = steps[0] && steps[0].into === 'ring' ? `<circle r="${R * 0.32}" fill="none" stroke="#9a8f86" stroke-width="1.4" stroke-dasharray="3 2"/>` : '';
  return svgWrap(-ext, -ext, ext * 2, ext * 2, bands + center + marks + labels, opt);
}

// ── 평뜨기 기호도 ───────────────────────────────────
function rowsChart(p, a, opt) {
  const Wc = 26, Hc = 30;
  const steps = a.steps;
  const maxW = Math.max(p.foundation, ...steps.map((s) => stepMarks(p.rows[s.src]).reduce((t, m) => t + m.w, 0)));
  const width = maxW * Wc + 70, height = (steps.length + 1) * Hc + 20;
  const hi = opt.highlight;
  let out = '', color = 0;
  // 기초 사슬
  for (let i = 0; i < p.foundation; i++) {
    const cx = 35 + (maxW - p.foundation) * Wc / 2 + (i + 0.5) * Wc, cy = height - 14 - Hc / 2;
    out += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="8" ry="4.5" fill="none" stroke="#3b3340" stroke-width="1.4"/>`;
  }
  steps.forEach((s, i) => {
    const src = p.rows[s.src];
    if (s.color != null) color = s.color;
    const ms = stepMarks(src);
    const W = ms.reduce((t, m) => t + m.w, 0);
    const y = height - 14 - Hc * (i + 1.5);
    const x0 = 35 + (maxW - W) * Wc / 2;
    const rtl = s.n % 2 === 1;
    const frame = (u, v) => [rtl ? x0 + (W - u) * Wc : x0 + u * Wc, y - v * Hc];
    const yarn = p.yarn[color] || p.yarn[0];
    const dim = hi != null && hi !== s.n;
    out += `<rect x="${f1(x0)}" y="${f1(y - Hc / 2)}" width="${f1(W * Wc)}" height="${Hc}" fill="${yarn.hex}" fill-opacity="${dim ? 0.12 : 0.38}"${hi === s.n ? ' stroke="#d9667b" stroke-width="3"' : ''}/>`;
    const ink = INK[i % 2];
    let u = 0, g = '';
    for (const m of ms) { g += drawMark(m, u, frame, 22, ink); u += m.w; }
    const lx = rtl ? x0 + W * Wc + 16 : x0 - 16;
    out += `<g opacity="${dim ? 0.22 : 1}">${g}<text x="${f1(lx)}" y="${f1(y + 4)}" font-size="11" font-weight="700" text-anchor="middle" fill="${ink}">${s.n}</text>` +
      `<text x="${f1(rtl ? lx - 1 : lx + 1)}" y="${f1(y + 15)}" font-size="9" text-anchor="middle" fill="${ink}">${rtl ? '←' : '→'}</text></g>`;
  });
  return svgWrap(0, 0, width, height, out, opt);
}

// ── 배색 차트 ───────────────────────────────────────
function gridChart(p, a, opt) {
  const g = p.grid, rows = g.rows, H = rows.length, W = rows[0].length;
  const c = 20, m = 28;
  const hi = opt.highlight;
  let out = '';
  rows.forEach((row, yi) => {
    const n = H - yi; // 아래가 1단
    const dim = hi != null && hi !== n;
    for (let x = 0; x < W; x++) {
      const y = p.yarn[g.palette[row[x]]];
      out += `<rect x="${m + x * c}" y="${m + yi * c}" width="${c}" height="${c}" fill="${y.hex}"${dim ? ' fill-opacity="0.35"' : ''}/>`;
    }
  });
  for (let x = 0; x <= W; x++) out += `<line x1="${m + x * c}" y1="${m}" x2="${m + x * c}" y2="${m + H * c}" stroke="#3b3340" stroke-opacity="${(W - x) % 5 === 0 ? 0.75 : 0.22}" stroke-width="${(W - x) % 5 === 0 ? 1.4 : 0.8}"/>`;
  for (let y = 0; y <= H; y++) out += `<line x1="${m}" y1="${m + y * c}" x2="${m + W * c}" y2="${m + y * c}" stroke="#3b3340" stroke-opacity="${(H - y) % 5 === 0 ? 0.75 : 0.22}" stroke-width="${(H - y) % 5 === 0 ? 1.4 : 0.8}"/>`;
  for (let yi = 0; yi < H; yi++) {
    const n = H - yi, odd = n % 2 === 1;
    const tx = odd ? m + W * c + 14 : m - 14;
    out += `<text x="${tx}" y="${m + yi * c + 14}" font-size="10" font-weight="${hi === n ? 800 : 600}" text-anchor="middle" fill="${hi === n ? '#d9667b' : '#3b3340'}">${n}</text>`;
  }
  for (let x = 0; x < W; x++) { const k = W - x; if (k % 5 === 0 || k === 1) out += `<text x="${m + x * c + c / 2}" y="${m + H * c + 16}" font-size="9" text-anchor="middle" fill="#6d6470">${k}</text>`; }
  if (hi != null) { const yi = H - hi; out += `<rect x="${m - 2}" y="${m + yi * c - 2}" width="${W * c + 4}" height="${c + 4}" fill="none" stroke="#d9667b" stroke-width="3" rx="3"/>`; }
  return svgWrap(0, 0, W * c + m * 2, H * c + m * 2, out, opt);
}

function svgWrap(x, y, w, h, body, opt) {
  const size = opt.width ? ` width="${opt.width}" height="${f1(opt.width * h / w)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f1(x)} ${f1(y)} ${f1(w)} ${f1(h)}"${size} font-family="'Gowun Dodum','Malgun Gothic','Apple SD Gothic Neo',sans-serif">${opt.bg ? `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${opt.bg}"/>` : ''}${body}</svg>`;
}

// ── 입체(공·인형 몸통): 단면 그래프 ─────────────────
// 늘렸다 줄이는 입체는 동심원 기호도가 오히려 헷갈려서, 단마다 코 수를 막대로 쌓아 모양을 보여 준다
function profileChart(p, a, opt) {
  const steps = a.steps, rh = 30, bar = 420, top = 46;
  const width = 90 + bar + 170, height = top + steps.length * rh + 20;
  const cx = 90 + bar / 2, hi = opt.highlight;
  let out = `<text x="${cx}" y="22" font-size="13" text-anchor="middle" fill="#7a6f78">막대 길이 = 그 단의 코 수 (위가 1단)</text>`;
  let color = 0;
  steps.forEach((s, i) => {
    if (s.color != null) color = s.color;
    const y = top + i * rh, w = Math.max(14, (s.total / a.stats.max) * bar);
    const dim = hi != null && hi !== s.n, d = s.total - s.prev;
    const hex = p.yarn[color].hex;
    out += `<g opacity="${dim ? 0.3 : 1}"><rect x="${f1(cx - w / 2)}" y="${y + 3}" width="${f1(w)}" height="${rh - 6}" rx="${(rh - 6) / 2}" fill="${hex}" fill-opacity="0.55" stroke="${shade(hex, -0.3)}" stroke-width="${hi === s.n ? 3 : 1.2}"/>` +
      `<text x="62" y="${y + rh / 2 + 5}" font-size="14" font-weight="700" text-anchor="end" fill="${INK[i % 2]}">${s.n}단</text>` +
      `<text x="${90 + bar + 14}" y="${y + rh / 2 + 5}" font-size="14" fill="#3b3340">${s.total}코 <tspan fill="${d > 0 ? '#4f8a5b' : d < 0 ? '#c0573e' : '#9a8f86'}" font-size="12">${s.n === 1 ? '' : d > 0 ? `+${d}` : d < 0 ? `${d}` : '그대로'}</tspan></text></g>`;
  });
  return svgWrap(0, 0, width, height, out, opt);
}

export function chartSVG(p, a, opt = {}) {
  if (p.type === 'grid') return gridChart(p, a, opt);
  if (p.type === 'rows') return rowsChart(p, a, opt);
  if (p.shape === 'sphere') return profileChart(p, a, opt);
  return roundChart(p, a, opt);
}

// ── 완성 모습 ───────────────────────────────────────
function vstitch(cx, cy, w, h, col) { // 코 하나의 V 모양
  return `<path d="M${f1(cx - w * 0.32)} ${f1(cy - h * 0.3)}L${f1(cx)} ${f1(cy + h * 0.3)}L${f1(cx + w * 0.32)} ${f1(cy - h * 0.3)}" fill="none" stroke="${col}" stroke-width="${f1(Math.max(0.8, w * 0.16))}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
export function lookSVG(p, a, opt = {}) {
  const S = 200;
  let body = '';
  if (p.type === 'grid') {
    const rows = p.grid.rows, H = rows.length, W = rows[0].length;
    const c = Math.min(170 / W, 170 / (H * 0.9));
    const ox = (S - W * c) / 2, oy = (S - H * c * 0.9) / 2;
    body += `<rect x="${f1(ox + 3)}" y="${f1(oy + 5)}" width="${f1(W * c)}" height="${f1(H * c * 0.9)}" rx="6" fill="#000" opacity="0.12"/>`;
    rows.forEach((row, yi) => { for (let x = 0; x < W; x++) {
      const hex = p.yarn[p.grid.palette[row[x]]].hex;
      body += `<rect x="${f1(ox + x * c)}" y="${f1(oy + yi * c * 0.9)}" width="${f1(c + 0.4)}" height="${f1(c * 0.9 + 0.4)}" fill="${hex}"/>` + vstitch(ox + x * c + c / 2, oy + yi * c * 0.9 + c * 0.45, c, c * 0.9, shade(hex, -0.22));
    } });
  } else if (p.type === 'rows') {
    const steps = a.steps, H = steps.length, W = p.foundation;
    const c = Math.min(170 / W, 170 / (H * 0.85));
    const ox = (S - W * c) / 2, oy = (S - H * c * 0.85) / 2;
    body += `<rect x="${f1(ox + 3)}" y="${f1(oy + 5)}" width="${f1(W * c)}" height="${f1(H * c * 0.85)}" rx="5" fill="#000" opacity="0.12"/>`;
    let color = 0;
    steps.forEach((s, i) => {
      if (s.color != null) color = s.color;
      const hex = p.yarn[color].hex, y = oy + (H - 1 - i) * c * 0.85;
      body += `<rect x="${f1(ox)}" y="${f1(y)}" width="${f1(W * c)}" height="${f1(c * 0.85 + 0.4)}" fill="${hex}"/>`;
      for (let x = 0; x < s.total; x++) body += vstitch(ox + (x + 0.5) * W * c / s.total, y + c * 0.42, c, c * 0.85, shade(hex, -0.2));
    });
  } else {
    const steps = a.steps, n = steps.length, square = p.shape === 'square', sphere = p.shape === 'sphere';
    if (sphere) {
      // 공: 위에서 아래로 단 색을 띠처럼, 코 무늬를 가로줄로
      const r = 78;
      body += `<defs><clipPath id="ball"><circle cx="100" cy="100" r="${r}"/></clipPath><radialGradient id="shine" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></radialGradient></defs>`;
      body += `<ellipse cx="104" cy="186" rx="60" ry="8" fill="#000" opacity="0.12"/>`;
      let color = 0, g = '';
      steps.forEach((s, i) => {
        if (s.color != null) color = s.color;
        const hex = p.yarn[color].hex, y0 = 100 - r + (i * 2 * r) / n, hh = (2 * r) / n;
        g += `<rect x="0" y="${f1(y0)}" width="200" height="${f1(hh + 0.5)}" fill="${hex}"/>`;
        const yc = y0 + hh / 2, half = Math.sqrt(Math.max(0, r * r - (yc - 100) ** 2));
        const cnt = Math.max(4, Math.round(s.total / 2));
        for (let k = 0; k < cnt; k++) { const t = (k + 0.5) / cnt; const x = 100 - half + 2 * half * t; g += vstitch(x, yc, Math.min(hh * 1.1, (2 * half) / cnt * 1.2), hh, shade(hex, -0.2)); }
      });
      body += `<g clip-path="url(#ball)">${g}<circle cx="100" cy="100" r="${r}" fill="url(#shine)"/></g>`;
    } else {
      const R = 88 / (n + 0.5);
      const pt = (r, ang) => { const k = square ? 1 / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang))) : 1; return [100 + r * k * Math.cos(ang), 100 + r * k * Math.sin(ang)]; };
      const shape = (r) => square ? `M${f1(100 - r)} ${f1(100 - r)}H${f1(100 + r)}V${f1(100 + r)}H${f1(100 - r)}Z` : `M${f1(100 - r)} 100A${f1(r)} ${f1(r)} 0 1 0 ${f1(100 + r)} 100A${f1(r)} ${f1(r)} 0 1 0 ${f1(100 - r)} 100Z`;
      const outer = (n + 0.5) * R;
      body += `<path d="${shape(outer)}" transform="translate(3 5)" fill="#000" opacity="0.12"/>`;
      const colors = []; let color = 0;
      steps.forEach((s) => { if (s.color != null) color = s.color; colors.push(color); });
      for (let i = n - 1; i >= 0; i--) body += `<path d="${shape((i + 1.5) * R)}" fill="${p.yarn[colors[i]].hex}"/>`;
      steps.forEach((s, i) => {
        const hex = p.yarn[colors[i]].hex, r = (i + 1) * R;
        const cnt = s.total + (s.chains || 0) * 0.6;
        const ms = Math.round(cnt);
        for (let k = 0; k < ms; k++) {
          const ang = -Math.PI / 2 + ((k + 0.5) / ms) * Math.PI * 2;
          const [x, y] = pt(r, ang);
          const w = Math.min(R * 0.95, (2 * Math.PI * r) / ms * 1.05);
          body += `<g transform="rotate(${f1(ang * 180 / Math.PI - 90)} ${f1(x)} ${f1(y)})">${vstitch(x, y, w, R * 0.9, shade(hex, -0.2))}</g>`;
        }
      });
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}"${opt.width ? ` width="${opt.width}" height="${opt.width}"` : ''}>${body}</svg>`;
}

// ── 기호 설명 ───────────────────────────────────────
export function legendItems(p) {
  const used = new Set();
  const walk = (seq) => seq.forEach((el) => { if (Array.isArray(el)) used.add(el[0]); else if ('rep' in el) walk(el.seq); else walk(el.do); });
  if (p.type === 'grid') { used.add('ch'); used.add(p.stitch || 'sc'); }
  else { if (p.type === 'rows') used.add('ch'); (p.type === 'round' ? p.rounds : p.rows).forEach((s) => walk(s.seq)); }
  const order = Object.keys(STITCH);
  return [...used].filter((c) => c !== 'sk').sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((code) => ({ code, name: STITCH[code].ko }));
}
export function symbolSVG(code, size = 34) {
  const w = STITCH[code] && STITCH[code].make === 2 || code === 'dec' || code === 'dcdec' ? 2 : 1;
  const frame = (u, v) => [8 + u * 18, 17 - v * 28];
  const m = { t: code, w };
  const body = drawMark(m, 0, frame, 20, '#3b3340');
  const vw = 16 + w * 18;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} 34" width="${f1(size * vw / 34)}" height="${size}">${body}</svg>`;
}
export { esc };
