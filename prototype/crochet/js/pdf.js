// 도안 PDF 만들기 — 쪽마다 캔버스(A4, 150dpi)에 그린 뒤 JPEG 로 PDF 에 넣는다.
// 한글 글꼴을 PDF 에 넣지 않아도 되고(기기 글꼴로 그림), 외부 라이브러리도 필요 없다.
import { instructions } from './text.js?v=1123134540';
import { chartSVG, lookSVG, legendItems, symbolSVG } from './chart.js?v=1123134540';
import { LEVELS } from './stitches.js?v=1123134540';

export const APP_NAME = '코바늘 도안함';
const PW = 1240, PH = 1754, M = 96;
const INK = '#3b3340', SUB = '#7a6f78', LINE = '#e6dccd', ROSE = '#d9667b', SAGE = '#4f8a5b';
const BODY = "'Gowun Dodum','Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
const HEAD = "Jua,'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif";

function svgImage(svg) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width <= maxW) { line = t; continue; }
      if (line) out.push(line);
      line = '';
      for (const ch of word) { // 한 낱말이 너무 길면 글자 단위로
        if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch;
      }
    }
    out.push(line);
  }
  return out;
}

class Pages {
  constructor() { this.list = []; this.add(); }
  add() {
    const c = document.createElement('canvas');
    c.width = PW; c.height = PH;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH);
    x.textBaseline = 'alphabetic';
    this.list.push(c); this.ctx = x; this.y = M;
    return x;
  }
  need(h) { if (this.y + h > PH - M - 40) this.add(); }
}

function heading(P, text) {
  P.need(90);
  const x = P.ctx;
  x.fillStyle = ROSE; x.font = `40px ${HEAD}`; x.fillText(text, M, P.y + 40);
  x.fillStyle = LINE; x.fillRect(M, P.y + 58, PW - 2 * M, 3);
  P.y += 84;
}

export async function makePatternPdf(p, a) {
  const pages = await renderPages(p, a);
  const imgs = [];
  for (const cv of pages) {
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.86));
    imgs.push({ data: new Uint8Array(await blob.arrayBuffer()), w: cv.width, h: cv.height });
  }
  return buildPdf(imgs);
}

// 쪽마다 캔버스 (검수 페이지에서 미리 보기에도 씀)
export async function renderPages(p, a) {
  const ins = instructions(p, a);
  // 웹 글꼴은 한글을 쓰는 글자 묶음별로 나눠 받으니, 실제로 쓸 글자를 넘겨서 미리 받아 둔다
  const allText = [p.title, p.summary, p.size, p.time, p.hook, p.gauge, APP_NAME, p.category, LEVELS[p.level], '기호 설명알아두기배색 차트기호도뜨는 법마무리단코공간 개 실로 바꿔요 개인적으로 뜨는 용도로만 써 주세요 도안 재배포·판매 금지 완성 크기 걸리는 시간 코바늘 게이지 그 밖에 돗바늘 가위 솜 단코 표시핀 실제로 떠 봤어요 코 수 자동 검증 0123456789/',
    ...p.yarn.map((y) => y.name + y.color + (y.amount || '')), ...ins.intro, ...ins.finish, ...ins.lines.map((l) => l.label + l.text + l.total), ...(p.notes || []),
    ...legendItems(p).map((l) => l.name)].join('');
  try { await Promise.all([document.fonts.load(`40px Jua`, allText), document.fonts.load(`24px 'Gowun Dodum'`, allText)]); } catch (e) { /* 기기 글꼴로 */ }
  const P = new Pages();
  let x = P.ctx;

  // ── 1쪽: 표지 + 재료 + 기호 ──
  x.fillStyle = '#fbf3ea'; x.fillRect(0, 0, PW, 300);
  x.fillStyle = SUB; x.font = `24px ${BODY}`; x.fillText(`🧶 ${APP_NAME}  ·  ${p.category}  ·  ${LEVELS[p.level]}`, M, M + 4);
  x.fillStyle = INK; x.font = `64px ${HEAD}`; x.fillText(p.title, M, M + 88);
  x.font = `27px ${BODY}`; x.fillStyle = INK;
  wrap(x, p.summary, PW - 2 * M).forEach((l, i) => x.fillText(l, M, M + 140 + i * 38));
  // 검증 배지
  const badge = (label, col, bx, by) => { x.font = `24px ${BODY}`; const w = x.measureText(label).width + 36; x.fillStyle = col; x.beginPath(); x.roundRect(bx - w, by, w, 46, 23); x.fill(); x.fillStyle = '#fff'; x.fillText(label, bx - w + 18, by + 31); return w; };
  let bx = PW - M;
  bx -= badge('✓ 코 수 자동 검증', SAGE, bx, M - 30) + 10;
  if (p.tested) badge('✓ 실제로 떠 봤어요', ROSE, bx, M - 30);

  const lookImg = await svgImage(lookSVG(p, a, { width: 460 }));
  x.drawImage(lookImg, M - 10, 330, 460, 460);
  // 재료 표
  const rows = [['완성 크기', p.size], ['걸리는 시간', p.time || '-'], ['코바늘', p.hook]];
  if (p.gauge) rows.push(['게이지', p.gauge]);
  let ty = 360; const tx = M + 500, tw = PW - M - tx;
  for (const [k, v] of rows) {
    x.fillStyle = SUB; x.font = `24px ${BODY}`; x.fillText(k, tx, ty);
    x.fillStyle = INK; x.font = `27px ${BODY}`;
    const ls = wrap(x, v, tw - 150); ls.forEach((l, i) => x.fillText(l, tx + 150, ty + i * 36));
    ty += 36 * ls.length + 18;
  }
  x.fillStyle = SUB; x.font = `24px ${BODY}`; x.fillText('실', tx, ty);
  for (const y of p.yarn) {
    x.fillStyle = y.hex; x.beginPath(); x.arc(tx + 166, ty - 9, 14, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#0003'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = INK; x.font = `25px ${BODY}`;
    const ls = wrap(x, `${y.color} — ${y.name}${y.amount ? ', ' + y.amount : ''}`, tw - 200);
    ls.forEach((l, i) => x.fillText(l, tx + 192, ty + i * 34));
    ty += 34 * ls.length + 14;
  }
  x.font = `22px ${BODY}`; x.fillStyle = SUB; x.fillText('그 밖에: 돗바늘, 가위' + (p.type === 'round' && p.shape === 'sphere' ? ', 솜, 단코 표시핀' : ''), tx, ty + 6);

  P.y = Math.max(830, ty + 50);
  heading(P, '기호 설명');
  x = P.ctx;
  const items = legendItems(p);
  for (let i = 0; i < items.length; i++) {
    const col = i % 2, cx = M + col * 520;
    if (col === 0 && i > 0) P.y += 64;
    const img = await svgImage(symbolSVG(items[i].code, 48));
    x.drawImage(img, cx, P.y, img.width || 48, 48);
    x.fillStyle = INK; x.font = `26px ${BODY}`; x.fillText(items[i].name, cx + 100, P.y + 34);
  }
  P.y += 90;
  if (p.notes && p.notes.length) {
    heading(P, '알아두기'); x = P.ctx;
    x.font = `25px ${BODY}`; x.fillStyle = INK;
    for (const n of p.notes) for (const l of wrap(x, '· ' + n, PW - 2 * M)) { P.need(36); P.ctx.font = `25px ${BODY}`; P.ctx.fillStyle = INK; P.ctx.fillText(l, M, P.y + 26); P.y += 36; }
  }

  // ── 2쪽: 기호도 / 배색 차트 ──
  x = P.add();
  x.fillStyle = ROSE; x.font = `40px ${HEAD}`; x.fillText(p.type === 'grid' ? '배색 차트' : '기호도', M, M + 40);
  x.fillStyle = SUB; x.font = `23px ${BODY}`;
  x.fillText(p.type === 'grid' ? '아래가 1단 · 홀수 단은 오른쪽부터, 짝수 단은 왼쪽부터 읽어요 · 굵은 선은 5칸마다' : p.type === 'rows' ? '아래가 1단 · 숫자 옆 화살표 방향으로 떠요' : '가운데가 1단 · 동그라미 숫자에서 시작해 시계 방향으로 떠요', M, M + 82);
  const chart = await svgImage(chartSVG(p, a, { width: 1200, bg: '#ffffff' }));
  const availW = PW - 2 * M, availH = PH - 2 * M - 160;
  const k = Math.min(availW / chart.width, availH / chart.height);
  const cw = chart.width * k, ch = chart.height * k;
  x.drawImage(chart, (PW - cw) / 2, M + 110 + (availH - ch) / 2, cw, ch);

  // ── 3쪽~: 뜨는 법 ──
  P.add();
  heading(P, '뜨는 법');
  const para = (t, font, color, indent = 0, gap = 8) => {
    P.ctx.font = font;
    for (const l of wrap(P.ctx, t, PW - 2 * M - indent)) { P.need(38); P.ctx.font = font; P.ctx.fillStyle = color; P.ctx.fillText(l, M + indent, P.y + 28); P.y += 38; }
    P.y += gap;
  };
  for (const t of ins.intro) para('· ' + t, `25px ${BODY}`, INK);
  P.y += 14;
  for (const l of ins.lines) {
    P.ctx.font = `25px ${HEAD}`;
    const totW = P.ctx.measureText(l.total).width;
    P.ctx.font = `26px ${BODY}`;
    const ls = wrap(P.ctx, l.text, PW - 2 * M - 170 - totW - 28);
    P.need(ls.length * 38 + 24);
    const c = P.ctx;
    c.strokeStyle = '#b9ada3'; c.lineWidth = 2; c.strokeRect(M, P.y + 6, 26, 26);
    c.fillStyle = INK; c.font = `28px ${HEAD}`; c.fillText(l.label, M + 44, P.y + 30);
    c.font = `26px ${BODY}`;
    ls.forEach((t, i) => c.fillText(t, M + 170, P.y + 30 + i * 38));
    c.fillStyle = ROSE; c.font = `25px ${HEAD}`; c.textAlign = 'right'; c.fillText(l.total, PW - M, P.y + 30); c.textAlign = 'left';
    P.y += ls.length * 38 + 12;
    c.fillStyle = LINE; c.fillRect(M, P.y, PW - 2 * M, 1.5); P.y += 12;
  }
  if (ins.finish.length) { P.y += 20; heading(P, '마무리'); for (const t of ins.finish) para('· ' + t, `25px ${BODY}`, INK); }

  // 바닥글
  const N = P.list.length;
  P.list.forEach((cv, i) => {
    const c = cv.getContext('2d');
    c.fillStyle = LINE; c.fillRect(M, PH - M + 6, PW - 2 * M, 1.5);
    c.font = `20px ${BODY}`; c.fillStyle = SUB;
    c.fillText(`${p.title} · ${APP_NAME}`, M, PH - M + 38);
    c.textAlign = 'right'; c.fillText(`${i + 1} / ${N}`, PW - M, PH - M + 38); c.textAlign = 'left';
    c.font = `18px ${BODY}`; c.fillStyle = '#a89da5';
    c.fillText('개인적으로 뜨는 용도로만 써 주세요 · 도안 재배포·판매 금지', M, PH - M + 66);
  });

  return P.list;
}

// 이미지(JPEG)만 담는 최소 PDF
export function buildPdf(images) {
  const enc = (s) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
  const chunks = []; let len = 0; const offs = [];
  const push = (b) => { chunks.push(b); len += b.length; };
  const obj = (id, fn) => { offs[id] = len; push(enc(`${id} 0 obj\n`)); fn(); push(enc('\nendobj\n')); };
  const W = 595.28, H = 841.89;
  push(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
  const n = images.length;
  obj(1, () => push(enc('<< /Type /Catalog /Pages 2 0 R >>')));
  obj(2, () => push(enc(`<< /Type /Pages /Kids [${images.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${n} >>`)));
  images.forEach((im, i) => {
    const pg = 3 + i * 3, ct = pg + 1, xo = pg + 2;
    obj(pg, () => push(enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${xo} 0 R >> >> /Contents ${ct} 0 R >>`)));
    const cs = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
    obj(ct, () => push(enc(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`)));
    obj(xo, () => { push(enc(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>\nstream\n`)); push(im.data); push(enc('\nendstream')); });
  });
  const total = 3 + n * 3;
  const xref = len;
  let t = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let id = 1; id < total; id++) t += String(offs[id]).padStart(10, '0') + ' 00000 n \n';
  t += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  push(enc(t));
  const out = new Uint8Array(len); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// 저장: 앱이면 파일로 써서 공유 창(드라이브·카톡·인쇄 등), 웹이면 내려받기
export async function savePdf(bytes, name) {
  const C = window.Capacitor;
  const FS = C && C.Plugins && C.Plugins.Filesystem, SH = C && C.Plugins && C.Plugins.Share;
  if (C && C.isNativePlatform && C.isNativePlatform() && FS && SH) {
    const r = await FS.writeFile({ path: name, data: toBase64(bytes), directory: 'CACHE' });
    await SH.share({ title: name, url: r.uri, dialogTitle: '도안 PDF 저장·공유' });
    return 'shared';
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'downloaded';
}
