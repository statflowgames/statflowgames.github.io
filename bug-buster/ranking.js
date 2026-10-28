// 은하 방역대 - 랭킹 (젤리도쿠와 같은 구조)
// 랭킹 기능 켜기. 지금은 가상 데이터라서 출시 빌드에서는 false로 끈다
// (가짜 플레이어를 실제처럼 보여 주면 안 됨). Google Play 게임즈 리더보드를 연결하면 다시 true.
const RANKING_ENABLED = false;

// 랭킹 기간 (Google Play 게임즈 리더보드가 제공하는 세 가지)
const PERIODS = [{ id: 'daily' }, { id: 'weekly' }, { id: 'allTime' }];

// 난이도마다 리더보드가 따로 있다 (Play 게임즈에서도 리더보드 3개: 쉬움 / 보통 / 어려움)
// 화면 확인용 가상 랭킹. 다른 플레이어는 기간마다 고정된 가짜 데이터, 내 점수는 기기에 저장.
// Play 콘솔 설정이 끝나면 같은 모양(isFake, submit, load)의 Play 게임즈 구현으로 바꿔 끼운다.
const FakeLeaderboard = (() => {
  const TOP = 50, KEY = 'bugbuster.rank.';
  const load = diff => { try { return JSON.parse(localStorage.getItem(KEY + diff) || '{}'); } catch (e) { return {}; } };
  const save = (diff, d) => { try { localStorage.setItem(KEY + diff, JSON.stringify(d)); } catch (e) {} };
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
  function others(id, diff) {
    const r = seeded(periodKey(id) + diff), list = [];
    const top = { daily: 420000, weekly: 900000, allTime: 2400000 }[id] * { easy: 0.5, normal: 1, hard: 2 }[diff];
    const NAMES = tl('rankNames');
    for (let i = 0; i < TOP; i++) list.push({ name: NAMES[(r() * NAMES.length) | 0] + (r() < 0.4 ? (r() * 99 | 0) + 1 : ''), score: Math.round(top * Math.pow(0.9, i) * (0.92 + r() * 0.08) / 10) * 10 });
    return list.sort((a, b) => b.score - a.score);
  }
  return {
    isFake: true,
    // 게임이 끝난 점수를 올린다. 기간별 최고 점수만 남는다
    async submit(score, diff) {
      const d = load(diff);
      for (const p of PERIODS) { const k = periodKey(p.id); if (!(d[k] >= score)) d[k] = score; }
      for (const k of Object.keys(d)) if (k !== 'all' && k !== periodKey('daily') && k !== periodKey('weekly')) delete d[k];
      save(diff, d);
    },
    async load(id, diff) {
      const mine = load(diff)[periodKey(id)], list = others(id, diff);
      if (mine) list.push({ name: t('me'), score: mine, isMe: true });
      list.sort((a, b) => b.score - a.score);
      const ranked = list.map((e, i) => ({ ...e, rank: i + 1 }));
      return { top: ranked.slice(0, TOP), me: ranked.find(e => e.isMe) || null };
    },
  };
})();

const Ranking = {
  service: FakeLeaderboard,
  period: 'daily', diff: null,
  submit(score, diff) { if (score > 0) this.service.submit(score, diff); },
  async open(period, diff) {
    this.period = period || this.period; this.diff = diff || this.diff || DIFF;
    const box = $('rankBody');
    $('rankFake').hidden = !this.service.isFake;
    document.querySelectorAll('#rankTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.p === this.period));
    document.querySelectorAll('#rankDiff button').forEach(b => b.setAttribute('aria-selected', b.dataset.d === this.diff));
    box.innerHTML = `<p class="meta">${t('loading')}</p>`;
    $('rank').hidden = false;
    try {
      const page = await this.service.load(this.period, this.diff);
      const row = e => `<li class="${e.isMe ? 'me' : ''}"><b>${e.rank}</b><span>${e.name}</span><em>${fmt(e.score)}</em></li>`;
      const podium = page.top.slice(0, 3), medal = ['🥇', '🥈', '🥉'];
      box.innerHTML =
        `<div class="podium">${[1, 0, 2].map(i => podium[i] ? `<div class="pod p${i + 1}${podium[i].isMe ? ' me' : ''}"><i>${medal[i]}</i><span>${podium[i].name}</span><em>${fmt(podium[i].score)}</em><div class="step">${i + 1}</div></div>` : '').join('')}</div>` +
        `<ol class="ranklist">${page.top.slice(3).map(row).join('')}</ol>`;
      $('rankMe').innerHTML = page.me ? `<ol class="ranklist"><li class="me"><b>${page.me.rank}</b><span>${t('myRank')}</span><em>${fmt(page.me.score)}</em></li></ol>`
        : `<p class="meta">${t('noRecord')}</p>`;
    } catch (e) {
      box.innerHTML = `<p class="meta">${t('rankError')}</p>`;
    }
  },
};
