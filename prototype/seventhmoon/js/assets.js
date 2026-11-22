// 필요한 그림만 불러오고, 안 쓰는 큰 그림은 비운다 (휴대폰 메모리 절약).
// 공통 그룹은 처음에 한 번 불러 두고, 나머지는 장면마다 preload()에서 필요한 것만.
const Assets = {
  CORE: new Set(['ui', 'uiset', 'emote', 'fx', 'debris', 'debris2', 'chest', 'faces', 'trap', 'props']),   // ✏️ 2026-11-22 captive·npc·icon은 필요한 장면에서만 (휴대폰 메모리)
  ext: '.png',
  group(g) { return Object.keys(MAN).filter(k => k.startsWith(g + '/')); },
  groups(list) { const out = []; for (const g of list) if (g) out.push(...this.group(g)); return out; },
  coreKeys() { return Object.keys(MAN).filter(k => k !== '__ext' && this.CORE.has(k.split('/')[0])); },
  // 리그가 쓰는 그림 그룹 (진짜 리그가 없으면 대역 리그의 그룹)
  rigGroup(id) {
    if (id === 'toothcrusher_rider') return 'toothcrusher';
    const base = MONDEF[id];
    if (base && base.like && !RIGS[id]) return this.rigGroup(base.like);   // 🆕 2부: 그림이 없을 때만 대역
    if (RIGS[id] && (!base || id !== base.rig)) return id;
    return base ? base.rig : id;
  },
  queue(scene, keys) {
    let n = 0;
    for (const k of keys) if (MAN[k] && !scene.textures.exists(k)) { scene.load.image(k, 'assets/' + k + this.ext); n++; }
    return n;
  },
  // 공통 그룹과 keep에 없는 그림을 비운다
  evict(scene, keep) {
    const K = new Set(keep);
    let n = 0;
    for (const k of Object.keys(MAN)) {
      if (k === '__ext' || K.has(k) || this.CORE.has(k.split('/')[0])) continue;
      if (scene.textures.exists(k)) { scene.textures.remove(k); n++; }
    }
    return n;
  },
  // 장면 preload()에서 부른다: 비우고, 모자란 것을 큐에 넣고, 진행 표시
  preloadFor(scene, keys) {
    if (!MAN || !Object.keys(MAN).length) return;
    this.evict(scene, keys);
    const n = this.queue(scene, keys);
    if (!n) return;
    const t = scene.add.text(W / 2, H / 2, '불러오는 중…', { fontFamily: 'sans-serif', fontSize: 26, color: '#f4e4c0', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(99999).setScrollFactor(0);
    const prog = p => { if (t.active) t.setText('불러오는 중… ' + Math.round(p * 100) + '%'); };
    scene.load.on('progress', prog);
    scene.load.once('complete', () => { scene.load.off('progress', prog); t.destroy(); });
  },
  // 이미 돌아가는 장면에서 더 불러올 때 (대화 그림 등)
  ensure(scene, keys, done) {
    const n = this.queue(scene, keys);
    if (!n) { done(); return; }
    scene.load.once('complete', () => done());
    scene.load.start();
  },
  // ---- 장면별로 필요한 그림 ----
  heroKeys(s) {
    const g = [s ? s.hero : 'warrior', 'warrior'];
    if (s && s.ally && s.ally !== s.hero) g.push(s.ally);
    // 🆕 주인공 머리 장비 착용 그림 (지금 직업 것만)
    const helms = s ? this.group('head_gear').filter(k => k.startsWith('head_gear/' + s.hero + '_')) : [];
    // 🆕 2026-11-22 소환체 그림 (그 직업일 때만)
    const sum = !s ? [] : s.hero === 'ranger' ? this.group('spirit_wolf').filter(k => !k.endsWith('/ref')) : s.hero === 'mage' ? ['summon/thundercloud_0', 'summon/thundercloud_1'] : s.hero === 'warrior' ? ['summon/war_banner'] : [];
    return [...this.groups(g), ...(typeof CuteHeroes !== 'undefined' ? CuteHeroes.keys(g) : []), ...helms, ...sum];
  },
  portraits(list) { return list.flatMap(k => ['portrait/' + k, ...['joy', 'angry', 'sad', 'surprise'].map(f => `portrait/${k}_${f}`)]); },
  // ✏️ 2026-11-22 아이콘(400여 장)은 메뉴가 열리는 지도·캠프·탑 입구에서만. 전투는 battleIcons만, 떨어진 장비 아이콘은 그때 불러온다
  icons() { return this.group('icon'); },
  battleIcons(s) {
    const h = s ? s.hero : 'warrior';
    const belt = typeof BELT !== 'undefined' ? Object.values(BELT).map(b => 'icon/' + b.icon) : [];
    return [...belt, ...this.group('icon').filter(k => k.startsWith(`icon/skill_${h}_`)), 'icon/hammer'];
  },
  forTitle(s) { return [...this.heroKeys(s), 'story/opening', 'bg/far', ...HERO_KEYS.map(k => 'portrait/' + k)]; },
  forMap(s, ch) { const C = typeof CHAPTERS !== 'undefined' && CHAPTERS[ch - 1]; return [...this.icons(), C ? C.map : `map/c${ch}`, 'map/c1', 'portrait/' + (s ? s.hero : 'warrior')]; },
  forCamp(s) { return [...this.heroKeys(s), ...this.icons(), 'bg/camp_far', 'bg/far', ...this.group('npc'), ...HERO_KEYS.map(k => 'portrait/' + k), ...this.portraits(['lise', 'tabel']), 'portrait/merchant', 'portrait/fortune']; },
  forStage(def, s) {
    const th = THEMES[def.theme] || THEMES.forest;
    const g = new Set([th.props || 'props', 'barkhaul', 'spear', 'grunt']);
    for (const wave of def.waves) for (const grp of wave) for (const tok of grp.split(',')) {
      const id = tok.trim().split('*')[0];
      g.add(this.rigGroup(id));
      if (MONDEF[id] && MONDEF[id].like) g.add(this.rigGroup(MONDEF[id].like));   // 빌려 쓰는 투사체 그림
      const d = MONDEF[id];
      if (d && d.summon) g.add(this.rigGroup(d.summon));
      if (id === 'toothcrusher') g.add('toothcrusher');
    }
    return [...this.heroKeys(s), ...this.battleIcons(s), ...this.groups([...g]), th.far, th.ground, 'bg/far', 'bg/ground'];
  },
  // 대화 장면에 나오는 그림
  forTalk(key, s) {
    const out = new Set();
    const lines = [...(STORY[key] || [])];
    // 선택지로 이어지는 장면도 미리
    for (const L of STORY[key] || []) if (L.choice) for (const [, k] of L.choice) if (STORY[k]) lines.push(...STORY[k]);
    for (const L of lines) {
      if (L.bg) out.add(L.bg);
      if (L.alt) out.add(L.alt);   // 🆕 새 컷 그림이 아직 없을 때 쓸 그림
      if (!L.w || L.w === 'narr') continue;
      const who = L.w === 'hero' ? (s ? s.hero : 'warrior') : null;
      const c = who ? { portrait: 'portrait/' + who, faces: 'portrait/' + who + '_' } : CAST[L.w];
      if (c && c.portrait) out.add(c.portrait);
      if (c && c.faces && L.f) out.add(c.faces + L.f);
    }
    return [...out];
  },
};
