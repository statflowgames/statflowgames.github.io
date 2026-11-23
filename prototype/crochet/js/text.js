// 검증된 데이터에서 '뜨는 법' 글을 만든다. 글을 사람이 따로 쓰지 않으니 숫자가 틀릴 수 없다.
import { STITCH, TURN_CH } from './stitches.js?v=1123134803';

export function opText(el) {
  if (Array.isArray(el)) {
    const [c, n = 1] = el;
    const d = STITCH[c];
    return c === 'ch' ? `사슬 ${n}코` : `${d.short} ${n}${d.unit}`;
  }
  if ('rep' in el) return `[${el.seq.map(opText).join(', ')}] ×${el.rep}`;
  const where = { st: '한 코에', sp: '다음 공간에', ring: '고리에' }[el.in];
  return `${where} (${el.do.map(opText).join(', ')})`;
}

const yarnName = (p, i) => (p.yarn[i] ? p.yarn[i].color : '');

// 뜨는 법: { intro:[], lines:[{ label, text, total, color, from, to }], finish:[] }
export function instructions(p, a) {
  const intro = [], lines = [], finish = [...(p.finish || [])];
  if (p.type === 'grid') return gridInstructions(p, a);
  const list = p.type === 'round' ? p.rounds : p.rows;
  const firstH = a.steps[0] ? a.steps[0].h : 1;
  if (p.type === 'round') {
    intro.push(p.start || '실로 고리를 만들어(매직링) 시작해요.');
    intro.push(p.spiral
      ? '단 끝을 빼뜨기로 잇지 않고 나선형으로 이어 떠요. 단의 첫 코에 단코 표시핀을 꽂아 두세요.'
      : `각 단 끝은 첫 코에 빼뜨기로 잇고, 기둥코(사슬 ${TURN_CH[firstH]}코)를 세워 다음 단을 시작해요.${firstH >= 2 ? ' 기둥코는 첫 코 1코로 셉니다.' : ' 기둥코는 코 수에 넣지 않아요.'}`);
  } else {
    const t = TURN_CH[firstH];
    intro.push(p.start || `사슬 ${p.foundation + t}코(기초 ${p.foundation}코 + 기둥코 ${t}코)를 떠요.`);
    intro.push(`단이 끝나면 뒤집고 기둥코(사슬 ${t}코)를 세워 다음 단을 떠요.${firstH >= 2 ? ' 기둥코는 첫 코 1코로 셉니다.' : ' 기둥코는 코 수에 넣지 않아요.'}`);
  }
  let curColor = null, k = 0;
  list.forEach((s, idx) => {
    const times = s.times ?? 1;
    const from = k + 1, to = k + times;
    k = to;
    const into = s.into ?? (p.type === 'round' && idx === 0 ? 'ring' : 'st');
    let body = s.seq.map(opText).join(', ');
    if ((s.repeat ?? 1) > 1) body = `[${body}] ×${s.repeat}`;
    if (into === 'ring') body = `고리에 ${body}`;
    const st = a.steps.find((x) => x.n === from);
    let tail = `${st.total}코`;
    if (st.spaces && into !== 'st') tail += ` · 공간 ${st.spaces}개`;
    let pre = '';
    if (s.color != null && s.color !== curColor) {
      if (curColor !== null) pre = `〔${yarnName(p, s.color)} 실로 바꿔요〕 `;
      curColor = s.color;
    }
    lines.push({
      label: from === to ? `${from}단` : `${from}~${to}단`, from, to,
      text: pre + body + (s.note ? ` — ${s.note}` : ''), total: tail, color: s.color ?? curColor,
    });
  });
  return { intro, lines, finish };
}

function gridInstructions(p, a) {
  const g = p.grid;
  const stitch = STITCH[p.stitch || 'sc'];
  const intro = [
    `사슬 ${a.stats.width + 1}코(기초 ${a.stats.width}코 + 기둥코 1코)를 떠요.`,
    `모든 단을 ${stitch.short}로 뜨고, 쉬는 실은 뜨는 코 속에 감싸 넣으며 가져가요(태피스트리 뜨기).`,
    '색을 바꿀 때는 바꾸기 바로 앞 코의 마지막 실 걸기를 새 색으로 해요.',
    '홀수 단은 오른쪽 → 왼쪽, 짝수 단은 왼쪽 → 오른쪽으로 차트를 읽어요.',
  ];
  const lines = a.steps.map((s) => {
    const cells = s.n % 2 === 1 ? [...s.row].reverse() : [...s.row];
    const runs = [];
    for (const ch of cells) {
      const last = runs[runs.length - 1];
      if (last && last.ch === ch) last.n++; else runs.push({ ch, n: 1 });
    }
    const text = (s.n % 2 === 1 ? '(→ 오른쪽부터) ' : '(← 왼쪽부터) ') + runs.map((r) => `${yarnName(p, g.palette[r.ch])} ${r.n}`).join(', ');
    return { label: `${s.n}단`, from: s.n, to: s.n, text, total: `${s.total}코`, color: null };
  });
  return { intro, lines, finish: [...(p.finish || ['마지막 단을 뜬 뒤 실을 자르고 돗바늘로 실 끝을 정리해요.'])] };
}

// 카운터용: n단의 설명 한 줄
export function stepLine(p, a, n) {
  const ins = instructions(p, a);
  return ins.lines.find((l) => n >= l.from && n <= l.to) || null;
}
