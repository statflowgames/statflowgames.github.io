// 도안 검증기 — 브라우저(앱·검수 페이지)와 node(tools/validate.mjs) 양쪽에서 쓴다. DOM 을 쓰지 않는다.
// analyze(pattern) → { ok, errors, warnings, steps, stats }
//   steps: 실제로 뜨는 단 하나하나 (times 로 묶인 단도 풀어서)
//   errors 가 하나라도 있으면 앱에 올릴 수 없다. warnings 는 확인만 하면 된다.
import { STITCH, FLAT_INC } from './stitches.js?v=1123121541';

const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NO_RING = new Set(['inc', 'dec', 'hdcinc', 'dcinc', 'dcdec', 'sk', 'sl']);
const isInt = (n) => Number.isInteger(n) && n > 0;

// 한 단의 순서(seq)를 세어 본다
function walk(seq, ring, where, errs) {
  const r = { useSt: 0, useSp: 0, st: 0, sp: 0, ch: 0, byH: {} };
  if (!Array.isArray(seq) || !seq.length) { errs.push(`${where}: 뜨는 순서(seq)가 비어 있어요`); return r; }
  for (const el of seq) {
    if (Array.isArray(el)) {
      const [code, n = 1] = el;
      const d = STITCH[code];
      if (!d) { errs.push(`${where}: 모르는 기법 "${code}" — 의뢰서의 기법 목록에 있는 코드만 쓸 수 있어요`); continue; }
      if (!isInt(n)) { errs.push(`${where}: "${code}" 의 횟수 ${JSON.stringify(n)} 가 1 이상의 정수가 아니에요`); continue; }
      if (code === 'ch') { r.ch += n; r.sp += 1; continue; }
      if (ring && NO_RING.has(code)) errs.push(`${where}: 고리(매직링)에는 ${d.short}를 할 수 없어요`);
      r.useSt += d.use * n;
      r.st += d.make * n;
      if (d.h) r.byH[d.h] = (r.byH[d.h] || 0) + d.make * n;
    } else if (el && typeof el === 'object' && 'rep' in el) {
      if (!isInt(el.rep)) { errs.push(`${where}: 반복 횟수 rep 가 1 이상의 정수가 아니에요`); continue; }
      const s = walk(el.seq, ring, where, errs);
      for (const k of ['useSt', 'useSp', 'st', 'sp', 'ch']) r[k] += s[k] * el.rep;
      for (const h in s.byH) r.byH[h] = (r.byH[h] || 0) + s.byH[h] * el.rep;
    } else if (el && typeof el === 'object' && 'in' in el) {
      if (!['st', 'sp', 'ring'].includes(el.in)) { errs.push(`${where}: 묶음의 in 은 st / sp / ring 중 하나여야 해요`); continue; }
      const s = walk(el.do, true, where + ' (한 곳에 뜨는 묶음)', errs); // 묶음 안에서는 늘리기·모아뜨기 금지 (한 자리에 뜨니까)
      if (el.in === 'st') r.useSt += 1;
      if (el.in === 'sp') r.useSp += 1;
      r.st += s.st; r.sp += s.sp; r.ch += s.ch;
      for (const h in s.byH) r.byH[h] = (r.byH[h] || 0) + s.byH[h];
    } else errs.push(`${where}: 알 수 없는 항목 ${JSON.stringify(el)}`);
  }
  return r;
}

const dominantH = (byH) => { let best = 1, n = -1; for (const h in byH) if (byH[h] > n) { n = byH[h]; best = +h; } return best; };

// 단 목록을 풀어서 검사 (round / rows 공통)
function checkSteps(p, list, kind, errs, warns) {
  const name = kind === 'round' ? '단' : '단';
  const steps = [];
  if (!Array.isArray(list) || !list.length) { errs.push(`${kind === 'round' ? 'rounds' : 'rows'} 가 비어 있어요`); return steps; }
  let prev = kind === 'rows' ? { st: p.foundation, sp: 0 } : null;
  let n = 0;
  list.forEach((s, idx) => {
    const times = s.times ?? 1;
    if (!isInt(times)) { errs.push(`${idx + 1}번째 항목: times 가 1 이상의 정수가 아니에요`); return; }
    const first = n + 1, last = n + times;
    const label = times > 1 ? `${first}~${last}${name}` : `${first}${name}`;
    const into = s.into ?? (kind === 'round' && n === 0 ? 'ring' : 'st');
    if (!['ring', 'st', 'sp', 'both'].includes(into)) { errs.push(`${label}: into 는 ring / st / sp / both 중 하나여야 해요`); return; }
    if (into === 'ring' && (kind !== 'round' || n > 0)) errs.push(`${label}: 고리(ring)에 뜨는 건 원형 뜨기의 1단만 가능해요`);
    if (into === 'ring' && times > 1) errs.push(`${label}: 고리에 뜨는 1단은 times 를 쓸 수 없어요`);
    const rep = s.repeat ?? 1;
    if (!isInt(rep)) { errs.push(`${label}: repeat 가 1 이상의 정수가 아니에요`); return; }
    const e0 = errs.length;
    const one = walk(s.seq, into === 'ring', label, errs);
    const c = { useSt: one.useSt * rep, useSp: one.useSp * rep, st: one.st * rep, sp: one.sp * rep, ch: one.ch * rep, byH: {} };
    for (const h in one.byH) c.byH[h] = one.byH[h] * rep;
    if (errs.length > e0) { n = last; prev = { st: c.st, sp: c.sp }; return; }
    if (s.color != null && !(isInt(s.color + 1) && p.yarn && s.color < p.yarn.length)) errs.push(`${label}: color ${s.color} 에 해당하는 실이 yarn 목록에 없어요`);

    for (let t = 0; t < times; t++) {
      const k = n + t + 1;
      const lab = `${k}${name}`;
      if (prev) {
        if ((into === 'st' || into === 'both') && c.useSt !== prev.st) {
          const d = c.useSt - prev.st;
          errs.push(`${lab}: 앞 단은 ${prev.st}코인데 이 단에서 쓰는 코는 ${c.useSt}코예요 (${Math.abs(d)}코 ${d > 0 ? '많음' : '모자람'})`);
        }
        if ((into === 'sp' || into === 'both') && c.useSp !== prev.sp) {
          errs.push(`${lab}: 앞 단의 공간(사슬 고리)은 ${prev.sp}개인데 이 단에서 쓰는 공간은 ${c.useSp}개예요`);
        }
        if (into === 'st' && c.useSp > 0) errs.push(`${lab}: 코에 뜨는 단(into:"st")인데 공간 묶음이 있어요 — 둘 다 쓰면 into:"both"`);
        if (into === 'sp' && c.useSt > 0) errs.push(`${lab}: 공간에 뜨는 단(into:"sp")에는 {"in":"sp"} 묶음과 사슬만 쓸 수 있어요`);
      }
      if (s.total == null) errs.push(`${lab}: total(이 단을 다 뜬 뒤의 코 수)을 적어 주세요 — 검증의 기준이에요`);
      else if (s.total !== c.st) errs.push(`${lab}: total 은 ${s.total}코라고 적혀 있는데 실제로 계산하면 ${c.st}코예요`);
      if (s.spaces != null && s.spaces !== c.sp) errs.push(`${lab}: spaces 는 ${s.spaces}개라고 적혀 있는데 실제로는 ${c.sp}개예요`);
      if (c.st === 0 && c.sp === 0) errs.push(`${lab}: 이 단을 뜨고 나면 남는 코가 없어요`);
      steps.push({
        n: k, label: lab, src: idx, into, repeat: rep, color: s.color ?? null,
        prev: prev ? prev.st : 0, prevSp: prev ? prev.sp : 0, total: c.st, spaces: c.sp, chains: c.ch,
        h: dominantH(c.byH), edge: !!s.edge,
      });
      prev = { st: c.st, sp: c.sp };
    }
    n = last;
  });
  return steps;
}

function shapeWarnings(p, steps, warns) {
  const shape = p.shape || 'free';
  if (p.type === 'round' && shape === 'flat') {
    for (const s of steps) {
      if (s.n === 1 || s.edge) continue;
      const want = FLAT_INC[s.h] || 6, got = s.total - s.prev;
      if (got < want * 0.75 || got > want * 1.3)
        warns.push(`${s.label}: 평평한 원이 되려면 이 단에서 약 ${want}코 늘어야 해요 (지금 ${got >= 0 ? '+' : ''}${got}) — ${got < want ? '가장자리가 오므라들' : '가장자리가 물결칠'} 수 있어요. 일부러라면 "edge": true`);
    }
  }
  if (p.type === 'round' && shape === 'square') {
    const incs = steps.filter((s) => s.n > 1 && !s.edge).map((s) => s.total - s.prev);
    if (incs.length && incs.some((v) => v !== incs[0])) warns.push(`네모 모티브인데 단마다 늘어나는 코 수가 달라요 (${incs.join(', ')}) — 모서리가 비뚤어질 수 있어요`);
    p.rounds.forEach((r, i) => { if ((r.repeat ?? 1) !== 4 && !r.edge) warns.push(`${i + 1}번째 단 항목: 네모는 보통 모서리 4번 반복(repeat: 4)이에요`); });
  }
  if (p.type === 'round' && shape === 'sphere') {
    let shrinking = false;
    for (const s of steps) {
      const d = s.total - s.prev;
      if (s.n > 1 && d < 0) shrinking = true;
      if (shrinking && d > 0) warns.push(`${s.label}: 줄이기 시작한 뒤에 다시 늘리고 있어요 — 공 모양이 아닐 수 있어요`);
      if (s.n > 1 && Math.abs(d) > 9 && s.h === 1) warns.push(`${s.label}: 한 단에 ${Math.abs(d)}코나 ${d > 0 ? '늘려서' : '줄여서'} 모양이 울 수 있어요 (짧은뜨기는 6코 권장)`);
    }
    const last = steps[steps.length - 1];
    if (last && last.total > 8) warns.push(`마지막 단이 ${last.total}코라 조였을 때 구멍이 커요 (6코 이하 권장)`);
  }
  if (p.type === 'rows' && shape === 'rect') {
    for (const s of steps) if (s.total !== s.prev && !s.edge) warns.push(`${s.label}: 네모인데 코 수가 ${s.prev}→${s.total} 로 바뀌어 가장자리가 기울어요`);
  }
}

function checkGrid(p, errs, warns) {
  const g = p.grid;
  if (!g || !Array.isArray(g.rows) || g.rows.length < 2) { errs.push('grid.rows 에 2줄 이상의 그림이 필요해요'); return null; }
  if (!g.palette || typeof g.palette !== 'object') { errs.push('grid.palette (글자 → 실 번호) 가 없어요'); return null; }
  const w = g.rows[0].length;
  const counts = {};
  g.rows.forEach((row, i) => {
    if (typeof row !== 'string') { errs.push(`그림 ${i + 1}번째 줄이 글자가 아니에요`); return; }
    if (row.length !== w) errs.push(`그림 위에서 ${i + 1}번째 줄 길이가 ${row.length}칸이에요 (첫 줄은 ${w}칸)`);
    for (const ch of row) {
      if (!(ch in g.palette)) { errs.push(`그림 위에서 ${i + 1}번째 줄에 팔레트에 없는 글자 "${ch}" 가 있어요`); return; }
      counts[ch] = (counts[ch] || 0) + 1;
    }
  });
  for (const [ch, yi] of Object.entries(g.palette)) {
    if (!(Number.isInteger(yi) && p.yarn && yi >= 0 && yi < p.yarn.length)) errs.push(`팔레트 "${ch}" → 실 ${yi} 가 yarn 목록에 없어요`);
  }
  if (errs.length) return null;
  // 뜨는 순서: 맨 아래 줄이 1단
  const rows = [...g.rows].reverse();
  let islands = 0, maxChanges = 0, maxRow = 0;
  rows.forEach((row, i) => {
    let changes = 0;
    for (let x = 0; x < row.length; x++) {
      if (x > 0 && row[x] !== row[x - 1]) changes++;
      if (x > 0 && x < row.length - 1 && row[x] !== row[x - 1] && row[x] !== row[x + 1]) islands++;
    }
    if (changes > maxChanges) { maxChanges = changes; maxRow = i + 1; }
  });
  const nColors = Object.keys(counts).length;
  if (nColors > 4) warns.push(`색이 ${nColors}가지예요 — 태피스트리 뜨기는 3~4색까지가 편해요`);
  if (islands) warns.push(`1코짜리 색 바꿈이 ${islands}곳 있어요 — 실수는 아니지만 초보에게는 까다로워요`);
  if (maxChanges > 10) warns.push(`${maxRow}단에서 색을 ${maxChanges}번 바꿔요 — 손이 많이 가는 줄이에요`);
  if (!['sc', 'hdc'].includes(p.stitch || 'sc')) warns.push(`배색 차트는 짧은뜨기(sc)나 긴뜨기(hdc)가 무늬가 잘 보여요`);
  const steps = rows.map((row, i) => ({ n: i + 1, label: `${i + 1}단`, src: i, into: 'st', prev: w, total: w, spaces: 0, chains: 0, h: 1, row }));
  return { steps, w, h: rows.length, counts };
}

export function analyze(p) {
  const errs = [], warns = [];
  if (!p || typeof p !== 'object') return { ok: false, errors: ['도안 데이터가 비어 있어요'], warnings: [], steps: [], stats: {} };
  // 공통 정보
  if (!p.id || !ID.test(p.id)) errs.push('id 는 영어 소문자·숫자·하이픈만 (예: "spring-coaster-01")');
  for (const k of ['title', 'summary', 'category', 'size', 'hook']) if (!p[k] || typeof p[k] !== 'string') errs.push(`${k} 를 적어 주세요`);
  if (![1, 2, 3].includes(p.level)) errs.push('level 은 1(입문) / 2(초급) / 3(중급)');
  if (!Array.isArray(p.yarn) || !p.yarn.length) errs.push('yarn(실) 목록이 비어 있어요');
  else p.yarn.forEach((y, i) => {
    if (!y.name) errs.push(`실 ${i}: name 이 없어요`);
    if (!y.color) errs.push(`실 ${i}: color(색 이름)가 없어요`);
    if (!HEX.test(y.hex || '')) errs.push(`실 ${i}: hex 색이 "#a1b2c3" 형식이 아니에요`);
    if (!y.amount) warns.push(`실 ${i}: amount(필요한 양)를 적으면 좋아요`);
  });
  if (!p.time) warns.push('time(걸리는 시간)을 적으면 좋아요');
  if (p.craft && p.craft !== 'crochet') errs.push('지금은 코바늘(crochet) 도안만 받아요');

  let steps = [], extra = {};
  if (p.type === 'round') {
    if (p.shape && !['flat', 'square', 'sphere', 'free'].includes(p.shape)) errs.push('shape 는 flat / square / sphere / free');
    steps = checkSteps(p, p.rounds, 'round', errs, warns);
  } else if (p.type === 'rows') {
    if (!isInt(p.foundation)) errs.push('foundation(기초 사슬 코 수, 기둥코 빼고)을 적어 주세요');
    else steps = checkSteps(p, p.rows, 'rows', errs, warns);
  } else if (p.type === 'grid') {
    const g = checkGrid(p, errs, warns);
    if (g) { steps = g.steps; extra = { width: g.w, height: g.h, colorCounts: g.counts }; }
  } else errs.push('type 은 round / rows / grid 중 하나');

  if (!errs.length) shapeWarnings(p, steps, warns);
  const stats = {
    steps: steps.length,
    final: steps.length ? steps[steps.length - 1].total : 0,
    max: steps.reduce((m, s) => Math.max(m, s.total), 0),
    stitches: steps.reduce((m, s) => m + s.total + s.chains, 0) + (p.type === 'rows' ? p.foundation : 0) + (p.type === 'grid' ? extra.width || 0 : 0),
    ...extra,
  };
  return { ok: errs.length === 0, errors: errs, warnings: warns, steps, stats };
}
