// 도감과 업적 60개
const BOSS_IDS = ['toothcrusher', 'barkhaul', 'captain_mog', 'gloob', 'twinsting', 'sehera', 'frost_wyvern', 'hrimgar', 'golem7', 'orvex', 'orvex_eclipse', 'azmal', 'void_shadow'];
const MON_IDS = ['grunt', 'spear', 'shaman', 'wolf', 'ratkin_blade', 'ratkin_xbow', 'pirate', 'slime', 'mummy', 'scorpion', 'skeleton_archer', 'snakeman',
  'frostwolf', 'snow_brute', 'ice_spirit', 'dwarf_miner', 'gargoyle', 'construct', 'harpy', 'cultist', 'shadow_knight', 'imp', 'hound', 'leech', 'shade_hero'];

const Codex = {
  init(s) {
    s.codex = s.codex || { mon: {}, items: {} };
    s.stats = s.stats || {};
    const st = s.stats;
    for (const k of ['kills', 'S', 'noDmg', 'legend', 'set', 'enh10', 'allyClear', 'comboBonus', 'heroBoss', 'legendBoss', 'maxCombo', 'goldTotal']) st[k] = st[k] || 0;
    st.bossKills = st.bossKills || {}; st.classClear = st.classClear || {};
    s.ach = s.ach || {};
  },
  kill(s, m) {
    this.init(s);
    s.codex.mon[m.id] = (s.codex.mon[m.id] || 0) + 1;
    s.stats.kills++;
    if (m.def.boss) s.stats.bossKills[m.id] = (s.stats.bossKills[m.id] || 0) + 1;
  },
  items(s, list) {
    this.init(s);
    for (const it of list) {
      const prev = s.codex.items[it.name];
      if (prev === undefined || it.rar > prev) s.codex.items[it.name] = it.rar;
      if (prev === undefined && it.rar === 4) s.stats.legend++;
      if (prev === undefined && it.rar === 5) s.stats.set++;
    }
  },
  // 스테이지가 끝날 때: 기록을 남기고 새 업적을 돌려준다
  stage(s, g, info) {
    this.init(s);
    const st = s.stats;
    st.maxCombo = Math.max(st.maxCombo, info.combo || 0);
    st.goldTotal += info.gold || 0;
    if (info.win) {
      st.classClear[s.hero] = (st.classClear[s.hero] || 0) + 1;
      if (info.grade === 'S') st.S++;
      if (info.noDmg) st.noDmg++;
      if (info.ally) st.allyClear++;
      if (info.comboBonus) st.comboBonus++;
      if (info.chBoss && (s.diff ?? 1) >= 2) st.heroBoss++;
      if (info.chBoss && (s.diff ?? 1) >= 3) st.legendBoss++;
    }
    return this.check(s);
  },
  check(s) {
    this.init(s);
    const out = [];
    for (const a of ACHIEVEMENTS) {
      if (s.ach[a.id]) continue;
      let ok = false;
      try { ok = a.check(s); } catch (e) { ok = false; }
      if (ok) { s.ach[a.id] = Date.now(); s.gold += a.gold; out.push(a); }
    }
    return out;
  },
  progress(s) { return Object.keys(s.ach || {}).length; },
};

const ACHIEVEMENTS = (() => {
  const A = [];
  const add = (id, ko, desc, check, gold = 100) => A.push({ id, ko, desc, check, gold });
  const st = s => s.stats;
  [[100, '첫 사냥'], [500, '몬스터 사냥꾼'], [1000, '천 번의 승리']].forEach(([n, ko], i) => add('kill' + n, ko, `몬스터 ${n}마리 처치`, s => st(s).kills >= n, 100 * (i + 1)));
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + ((c - 0xac00) % 28 && c >= 0xac00 ? a : b); };
  BOSS_IDS.forEach(id => add('boss_' + id, MONDEF[id].ko + ' 격파', `${josa(MONDEF[id].ko, '을', '를')} 쓰러뜨렸다`, s => (st(s).bossKills[id] || 0) > 0, id === 'void_shadow' || id === 'azmal' ? 500 : 200));
  CHAPTERS.forEach(c => add('ch' + c.n, `${c.n}장 돌파`, `「${c.name}」의 보스를 쓰러뜨렸다`, s => s.ch > c.n || (s.cleared['c' + c.n] || []).includes('boss'), 150));
  [['end_seal', '봉인 엔딩'], ['end_true', '진 엔딩'], ['end_dark', '다크 엔딩'], ['end_sacrifice', '희생 엔딩']].forEach(([k, ko]) => add(k, ko, `${ko}을 보았다`, s => !!s.endings[k], 300));
  add('moon1', '첫 월석', '월석을 처음 모았다', s => Object.keys(s.moons).length >= 1, 100);
  add('moon6', '여섯 달의 빛', '월석 6개를 모두 모았다', s => Object.keys(s.moons).length >= 6, 500);
  [10, 20, 30].forEach(n => add('lv' + n, `Lv.${n}`, `레벨 ${n} 달성`, s => s.lv >= n, n * 15));
  HERO_KEYS.forEach(k => add('cls_' + k, `${DB.heroes[k].name}의 길`, `${DB.heroes[k].name}${(() => { const n = DB.heroes[k].name, c = n.charCodeAt(n.length - 1), j = (c - 0xac00) % 28; return j && j !== 8 ? '으로' : '로'; })()} 스테이지를 깼다`, s => (st(s).classClear[k] || 0) > 0, 150));
  [10, 20, 30].forEach(n => add('tower' + n, `탑 ${n}층`, `심연의 탑 ${n}층 돌파`, s => (s.tower && s.tower.best || 0) >= n, n * 20));
  [[1, '오늘도 모험'], [7, '일주일 개근']].forEach(([n, ko]) => add('daily' + n, ko, `오늘의 도전 ${n}번 성공`, s => (st(s).daily || 0) >= n, n === 1 ? 100 : 400));
  add('rush1', '보스 러시 완주', '주간 보스 러시를 끝까지 깼다', s => (st(s).rush || 0) >= 1, 300);
  add('rush5m', '번개 같은 손', '보스 러시를 5분 안에 깼다', s => st(s).rushBest && st(s).rushBest < 300000, 500);
  [30, 60].forEach(n => add('combo' + n, `${n} 콤보`, `한 번에 ${n}콤보 달성`, s => st(s).maxCombo >= n, n * 5));
  [[1, 'S 등급'], [10, 'S 등급 열 번']].forEach(([n, ko]) => add('S' + n, ko, `스테이지 S 등급 ${n}번`, s => st(s).S >= n, n === 1 ? 100 : 400));
  add('nodmg', '스치지도 못했다', '피해를 받지 않고 스테이지를 깼다', s => st(s).noDmg >= 1, 300);
  add('legend1', '전설의 시작', '전설 장비를 처음 얻었다', s => st(s).legend >= 1, 200);
  add('set1', '맞춤 장비', '세트 장비를 처음 얻었다', s => st(s).set >= 1, 200);
  add('enh10', '타벨의 걸작', '장비를 +10까지 강화했다', s => st(s).enh10 >= 1, 400);
  add('codexmon', '몬스터 박사', '일반 몬스터를 모두 만났다', s => MON_IDS.every(id => s.codex.mon[id]), 500);
  add('ally', '함께라면', 'AI 동료와 스테이지를 깼다', s => st(s).allyClear >= 1, 100);
  add('allycombo', '환상의 조합', '조합 보너스가 있는 동료와 스테이지를 깼다', s => st(s).comboBonus >= 1, 200);
  add('hero', '영웅의 자격', '영웅 난이도에서 챕터 보스를 쓰러뜨렸다', s => st(s).heroBoss >= 1, 400);
  add('legendary', '전설이 되다', '전설 난이도에서 챕터 보스를 쓰러뜨렸다', s => st(s).legendBoss >= 1, 800);
  add('skill', '기술의 달인', '한 갈래의 스킬 5개를 모두 배웠다', s => [0, 5, 10].some(b => [0, 1, 2, 3, 4].every(i => s.skills[b + i])), 200);
  add('awaken', '각성', '각성기를 처음 썼다', s => !!st(s).awaken, 50);
  add('classes6', '여섯 개의 길', '여섯 직업으로 모두 스테이지를 깼다', s => HERO_KEYS.every(k => (st(s).classClear[k] || 0) > 0), 800);
  return A;
})();

// ---------------- 도감 창 ----------------
class CodexMenu extends MenuBase {
  constructor() { super('codex'); }
  create() {
    this.tab = this.tab || 'mon';
    Codex.init(Save.data);
    const refs = [...MON_IDS, ...BOSS_IDS].map(id => `${Assets.rigGroup(id)}/ref`);
    Assets.ensure(this, refs, () => this.draw());
  }
  draw() {
    const s = Save.data;
    this.frame('도감 · 업적');
    const tabs = [['mon', '몬스터'], ['item', '장비'], ['ach', `업적 ${Codex.progress(s)}/${ACHIEVEMENTS.length}`]];
    tabs.forEach(([k, ko], i) => UI.button(this, 460 + i * 190, 66, ko, () => { this.tab = k; this.page = 0; this.draw(); }, { w: 180, h: 46, size: 19, col: this.tab === k ? 0x7a3a10 : 0x3a2a1a }));
    if (this.tab === 'mon') this.drawMon(s);
    else if (this.tab === 'item') this.drawItems(s);
    else this.drawAch(s);
  }
  drawMon(s) {
    const list = [...MON_IDS, ...BOSS_IDS];
    const seen = list.filter(id => s.codex.mon[id]).length;
    UI.text(this, 70, 100, `만난 몬스터 ${seen}/${list.length}`, 20, '#d8c8ff');
    list.forEach((id, i) => {
      const x = 105 + (i % 10) * 116, y = 190 + Math.floor(i / 10) * 132;
      const n = s.codex.mon[id] || 0, boss = BOSS_IDS.includes(id);
      const g = this.add.graphics();
      g.fillStyle(0x0e0805, 0.9).fillRoundedRect(x - 52, y - 52, 104, 104, 10).lineStyle(2, boss ? 0xc070ff : 0x7a5a30).strokeRoundedRect(x - 52, y - 52, 104, 104, 10);
      const im = UI.img(this, x, y, `${Assets.rigGroup(id)}/ref`);
      if (im) { im.setScale(Math.min(92 / im.width, 92 / im.height)); if (!n) im.setTint(0x000000).setAlpha(0.7); if (MONDEF[id].standin && MONDEF[id].tint && n) im.setTint(MONDEF[id].tint); }
      UI.text(this, x, y + 56, n ? MONDEF[id].ko : '???', 13, n ? '#f4e4c0' : '#6a5a48', { align: 'center', wrap: 112 }).setOrigin(0.5, 0);
      if (n) UI.text(this, x + 48, y - 50, String(n), 13, '#ffd34d', { bold: true }).setOrigin(1, 0);
    });
  }
  drawItems(s) {
    const names = [];
    for (const cls of HERO_KEYS) {
      const g = DB.gear[cls];
      for (const slot of ['weapon', 'offhand', 'head', 'body']) {
        g.tiers[slot].forEach((n, t) => names.push({ name: n, rar: 0, icon: { cls, slot, tier: t, rar: 0, name: n } }));
        names.push({ name: g.legend[slot].name, rar: 4, icon: { cls, slot, tier: 0, rar: 4, name: g.legend[slot].name } });
        names.push({ name: g.set.pieces[slot], rar: 5, icon: { cls, slot, tier: 0, rar: 5, name: g.set.pieces[slot], set: g.set.name } });
      }
    }
    DB.accessory.legend.forEach(l => names.push({ name: l.name, rar: 4, icon: { cls: 'acc', kind: l.kind, rar: 4, name: l.name, tier: 0 } }));
    const found = names.filter(n => s.codex.items[n.name] !== undefined).length;
    UI.text(this, 70, 100, `찾은 장비 ${found}/${names.length} · 전설 ${names.filter(n => n.rar === 4 && s.codex.items[n.name] !== undefined).length}/${names.filter(n => n.rar === 4).length}`, 20, '#d8c8ff');
    const per = 40, pages = Math.ceil(names.length / per);
    this.page = Math.min(this.page, pages - 1);
    names.slice(this.page * per, this.page * per + per).forEach((n, i) => {
      const x = 90 + (i % 10) * 116, y = 180 + Math.floor(i / 10) * 116;
      const got = s.codex.items[n.name] !== undefined;
      const c = UI.itemSlot(this, x, y, n.icon, 80);
      if (!got) c.each(o => o.setTint && o.setTint(0x101010));
      UI.text(this, x, y + 44, got ? n.name.slice(0, 7) : '???', 12, got ? RARITY[n.rar].col : '#5a4a38').setOrigin(0.5, 0);
    });
    UI.button(this, 540, 660, '◀', () => { this.page = (this.page + pages - 1) % pages; this.draw(); }, { w: 70, h: 44, size: 22, col: 0x3a2a1a });
    UI.text(this, 640, 660, `${this.page + 1}/${pages}`, 20, '#fff').setOrigin(0.5);
    UI.button(this, 740, 660, '▶', () => { this.page = (this.page + 1) % pages; this.draw(); }, { w: 70, h: 44, size: 22, col: 0x3a2a1a });
  }
  drawAch(s) {
    const per = 12, pages = Math.ceil(ACHIEVEMENTS.length / per);
    this.page = Math.min(this.page, pages - 1);
    ACHIEVEMENTS.slice(this.page * per, this.page * per + per).forEach((a, i) => {
      const x = 70 + (i % 2) * 575, y = 120 + Math.floor(i / 2) * 84;
      const got = !!s.ach[a.id];
      UI.panel(this, x, y, 560, 72, { alpha: 0.7, line: got ? 0xffd34d : 0x5a4a38, inner: false, r: 10 });
      UI.text(this, x + 16, y + 10, (got ? '★ ' : '☆ ') + a.ko, 21, got ? '#ffe27a' : '#a89a88', { bold: true });
      UI.text(this, x + 16, y + 40, a.desc, 16, got ? '#f4e4c0' : '#8a7a68');
      UI.text(this, x + 544, y + 14, `금화 ${a.gold}`, 15, got ? '#9ae07a' : '#c8a060').setOrigin(1, 0);
    });
    UI.button(this, 540, 660, '◀', () => { this.page = (this.page + pages - 1) % pages; this.draw(); }, { w: 70, h: 44, size: 22, col: 0x3a2a1a });
    UI.text(this, 640, 660, `${this.page + 1}/${pages}`, 20, '#fff').setOrigin(0.5);
    UI.button(this, 740, 660, '▶', () => { this.page = (this.page + 1) % pages; this.draw(); }, { w: 70, h: 44, size: 22, col: 0x3a2a1a });
  }
}
