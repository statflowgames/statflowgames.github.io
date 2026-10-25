// 은하 방역대 - 랭킹 (젤리도쿠와 같은 구조)
// 랭킹 기능 켜기. 지금은 가상 데이터라서 출시 빌드에서는 false로 끈다
// (가짜 플레이어를 실제처럼 보여 주면 안 됨). Google Play 게임즈 리더보드를 연결하면 다시 true.
const RANKING_ENABLED = true;

// 랭킹 기간 (Google Play 게임즈 리더보드가 제공하는 세 가지)
const PERIODS = [{ id: 'daily', label: '오늘' }, { id: 'weekly', label: '이번 주' }, { id: 'allTime', label: '전체' }];

// 화면 확인용 가상 랭킹. 다른 플레이어는 기간마다 고정된 가짜 데이터, 내 점수는 기기에 저장.
// Play 콘솔 설정이 끝나면 같은 모양(isFake, submit, load)의 Play 게임즈 구현으로 바꿔 끼운다.
const FakeLeaderboard = (() => {
  const NAMES = ['방역왕', '모기사냥꾼', '에프킬라', '살충대장', '벌레잡이', '우주청소부', '바퀴박멸', '무당벌레팬', '스프레이킹', '은하파리채',
    '반딧불이', '꿀벌드론', '거미줄탈출', '해충퇴치단', '칙칙폭폭', '모기향', '방충망', '나비효과', '풍뎅이헌터', '잠자리채',
    '여왕벌격파', '킬러비', '지네킬러', '메뚜기떼', '소금쟁이', '전갈사냥', '사마귀검', '흰개미탐정', '비단벌레', '마더버그격파'];
  const TOP = 50, KEY = 'bugbuster.rank';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  // 기간을 구분하는 키. 주간은 월요일 기준
  function periodKey(id, now = new Date()) {
    const date = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (id === 'daily') return 'd-' + date(now);
    if (id === 'weekly') { const m = new Date(now); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return 'w-' + date(m); }
    return 'all';
  }
  function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }
  function others(id) {
    const r = seeded(periodKey(id)), top = { daily: 420000, weekly: 900000, allTime: 2400000 }[id], list = [];
    for (let i = 0; i < TOP; i++) list.push({ name: NAMES[(r() * NAMES.length) | 0] + (r() < 0.4 ? (r() * 99 | 0) + 1 : ''), score: Math.round(top * Math.pow(0.9, i) * (0.92 + r() * 0.08) / 10) * 10 });
    return list.sort((a, b) => b.score - a.score);
  }
  return {
    isFake: true,
    // 게임이 끝난 점수를 올린다. 기간별 최고 점수만 남는다
    async submit(score) {
      const d = load();
      for (const p of PERIODS) { const k = periodKey(p.id); if (!(d[k] >= score)) d[k] = score; }
      for (const k of Object.keys(d)) if (k !== 'all' && k !== periodKey('daily') && k !== periodKey('weekly')) delete d[k];
      save(d);
    },
    async load(id) {
      const mine = load()[periodKey(id)], list = others(id);
      if (mine) list.push({ name: '나', score: mine, isMe: true });
      list.sort((a, b) => b.score - a.score);
      const ranked = list.map((e, i) => ({ ...e, rank: i + 1 }));
      return { top: ranked.slice(0, TOP), me: ranked.find(e => e.isMe) || null };
    },
  };
})();

const Ranking = {
  service: FakeLeaderboard,
  period: 'daily',
  submit(score) { if (score > 0) this.service.submit(score); },
  async open(period) {
    this.period = period || this.period;
    const box = $('rankBody');
    $('rankFake').hidden = !this.service.isFake;
    document.querySelectorAll('#rankTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.p === this.period));
    box.innerHTML = '<p class="meta">불러오는 중…</p>';
    $('rank').hidden = false;
    try {
      const page = await this.service.load(this.period);
      const row = e => `<li class="${e.isMe ? 'me' : ''}"><b>${e.rank}</b><span>${e.name}</span><em>${e.score.toLocaleString()}</em></li>`;
      const podium = page.top.slice(0, 3), medal = ['🥇', '🥈', '🥉'];
      box.innerHTML =
        `<div class="podium">${[1, 0, 2].map(i => podium[i] ? `<div class="pod p${i + 1}${podium[i].isMe ? ' me' : ''}"><i>${medal[i]}</i><span>${podium[i].name}</span><em>${podium[i].score.toLocaleString()}</em><div class="step">${i + 1}</div></div>` : '').join('')}</div>` +
        `<ol class="ranklist">${page.top.slice(3).map(row).join('')}</ol>`;
      $('rankMe').innerHTML = page.me ? `<ol class="ranklist"><li class="me"><b>${page.me.rank}</b><span>내 순위</span><em>${page.me.score.toLocaleString()}</em></li></ol>`
        : '<p class="meta">아직 기록이 없어요. 한 판 하고 오세요!</p>';
    } catch (e) {
      box.innerHTML = '<p class="meta">랭킹을 불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>';
    }
  },
};
