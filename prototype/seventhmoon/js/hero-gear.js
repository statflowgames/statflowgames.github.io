// 🆕 2026-11-22 장착한 장비를 전투 화면 주인공 겉모습에 반영
//   무기·방패(보조): 직업 폴더에 이미 있는 weapon_0~5 · shield_0~5 · offhand_0~5 (0~3 = 장비 단계, 4 = 전설, 5 = 세트)
//   머리: (시험) 가방 아이콘을 머리 위에 겹친다. 주소에 ?nohelm 을 붙이면 끈다.
const HeroGear = {
  // 장비 → 그림 번호
  idx(it) { return !it ? 0 : it.rar === 4 ? 4 : it.rar === 5 ? 5 : Math.min(3, it.tier || 0); },
  // 직업별: 리그 뼈 이름 → 장비 칸, 그림 이름 앞부분
  MAP: {
    warrior: [['wpn', 'weapon', 'weapon'], ['shd', 'offhand', 'shield']],
    paladin: [['wpn', 'weapon', 'weapon'], ['shd', 'offhand', 'offhand']],
    rogue: [['wpn', 'weapon', 'weapon'], ['fitem', 'offhand', 'offhand']],
    ranger: [['fitem', 'weapon', 'weapon']],
    mage: [['wpn', 'weapon', 'weapon']],
    hexblade: [['wpn', 'weapon', 'weapon']],
  },
  apply(hero) {
    const sc = hero.scene, s = sc.save || (typeof Save !== 'undefined' && Save.data);
    if (!s || !s.eq || hero.key !== s.hero || hero.isAlly) return;
    const rig = hero.rig; if (!rig || !rig.map) return;
    for (const [bone, slot, pre] of this.MAP[hero.key] || []) {
      const b = rig.map[bone]; if (!b) continue;
      const it = s.eq[slot] && itemById(s, s.eq[slot]);
      // 이야기 고유 장비는 전용 그림 (<직업>/<부품>_story_<키>), 없으면 단계 그림
      const sk = it && it.story && `${hero.key}/${pre}_story_${it.story}`;
      const key = sk && sc.textures.exists(sk) ? sk : `${hero.key}/${pre}_${this.idx(it)}`;
      if (!sc.textures.exists(key) || b.spr.texture.key === key) continue;
      b.img = key; b.cur = undefined; b.spr.setTexture(key);   // 같은 배율 그대로 → 그림마다 원래 크기 비율 유지
    }
    // 🆕 2026-11-25 몸 갑옷: 몸 부품 시트를 장착한 갑옷 시트로 통째로 바꾼다. 주소에 ?noarmor 를 붙이면 끈다.
    if (typeof Q === 'undefined' || !Q.has('noarmor')) this.armor(hero, s);
    // 🆕 2026-11-25 등급 빛: 무기는 늘 은은하게, 방패·보조는 가드할 때만. 주소에 ?noglow 를 붙이면 끈다.
    if (typeof Q === 'undefined' || !Q.has('noglow')) this.glow(hero, s);
    // ✏️ 2026-11-22 머리 장비 착용 그림(54장) 적용. 주소에 ?nohelm 을 붙이면 끈다.
    if (typeof Q === 'undefined' || !Q.has('nohelm')) this.helm(hero, s);
  },
  // ---------------- 🆕 2026-11-25 몸 갑옷 (art_raw/body_armor → tools/import_body_armor.py) ----------------
  //   그림 번호: 단계 1~4 = t1~t4, 전설 = legend, 세트 = set. 등급(일반~영웅)으로는 안 바뀐다 (무기·머리와 같은 규칙).
  //   몸 장비가 없으면 직업 기본 옷.
  bodyKey(cls, s) {
    const it = s && s.eq && s.eq.body && itemById(s, s.eq.body); if (!it) return null;
    const n = it.rar === 4 ? 'legend' : it.rar === 5 ? 'set' : 't' + (Math.min(3, it.tier || 0) + 1);
    return `cute/${cls}_body_${n}`;
  },
  armor(hero, s) {
    const sc = hero.scene, key = this.bodyKey(hero.key, s);
    const atlas = typeof CuteHeroes !== 'undefined' && CuteHeroes.atlas(hero.key);
    if (!key || !atlas || !sc.textures.exists(key) || !hero.rig) return;
    const base = atlas.tex.body4, tex = sc.textures.get(key);
    for (const [frame, b] of Object.entries(atlas.body4.frames)) if (!tex.has(frame)) tex.add(frame, 0, b.x, b.y, b.w, b.h);
    for (const b of hero.rig.bones) {
      const spr = b.spr;
      if (spr.texture.key !== base || !tex.has(spr.frame.name)) continue;
      spr.setTexture(key, spr.frame.name);
      if (b.img === base) b.img = key;
    }
    hero.armorKey = key;
  },
  // ---------------- 🆕 2026-11-25 등급 빛 ----------------
  //   일반(0)은 빛 없음. 고급 초록 · 희귀 파랑 · 영웅 보라 · 전설 주황 · 세트 청록 (가방 테두리 색과 같다)
  //   무기: 칼(활·지팡이)이 늘 은은하게 숨 쉬듯 빛나고, 휘두를 때 궤적도 같은 색.
  //   방패·보조: 평소엔 꺼져 있다가 가드하면 약하게 켜지고, 막는 순간·패링 순간 반짝.
  GLOW: [0, 2.4, 3.2, 4.0, 4.8, 4.4],   // 등급별 무기 빛 세기
  rarOf(s, slot) { const it = s.eq[slot] && itemById(s, s.eq[slot]); return it ? (it.rar || 0) : 0; },
  colOf(rar) { return RARITY[rar] ? RARITY[rar].hex : 0xffffff; },
  // 휘두를 때 궤적 색 (일반이면 직업 기본색)
  trailTint(h, bone) {
    const G = h.gearGlow; if (!G) return null;
    const r = bone === 'fitem' && G.offBone === 'fitem' ? G.offRar : G.wpnRar;
    return r > 0 ? this.colOf(r) : null;
  },
  glow(hero, s) {
    const sc = hero.scene, rig = hero.rig;
    if (!sc.renderer || sc.renderer.type !== Phaser.WEBGL) return;
    const M = this.MAP[hero.key] || [];
    const wb = M.find(m => m[1] === 'weapon'), ob = M.find(m => m[1] === 'offhand');
    const G = hero.gearGlow = { wpnRar: this.rarOf(s, 'weapon'), offRar: this.rarOf(s, 'offhand'), offBone: ob && ob[0], k: { w: 0, o: 0 }, kick: 0 };
    const add = (bone, rar) => {
      const b = rig.map[bone]; if (!b || !b.spr.preFX || rar <= 0) return null;
      b.spr.preFX.setPadding(14);
      return b.spr.preFX.addGlow(this.colOf(rar), 0, 0, false, 0.1, 16);
    };
    G.wfx = wb && add(wb[0], G.wpnRar);
    G.ofx = ob && add(ob[0], G.offRar);
    if (!G.wfx && !G.ofx) return;
    const base = this.GLOW[G.wpnRar] || 0;
    let t = Math.random() * 3000;
    const tick = (time, delta) => {
      if (!hero.rig || !hero.rig.c || !hero.rig.c.scene) return off();
      const dt = Math.min(50, delta || 16); t += dt;
      if (G.wfx) G.wfx.outerStrength = base * (0.75 + 0.25 * Math.sin(t / 420)) * (hero.state === 'dead' ? 0 : 1);
      if (G.ofx) {
        const st = hero.state;
        if (st === 'parry' && G.last !== 'parry') G.kick = 1;               // 패링 순간 크게
        if (st === 'guard' && hero.sta < (G.sta ?? hero.sta) - 1) G.kick = Math.max(G.kick, 0.6);   // 막아서 기력이 줄었다 = 막은 순간
        G.last = st; G.sta = hero.sta;
        const want = st === 'guard' || st === 'parry' ? 0.8 : 0;
        G.k.o += (want - G.k.o) * Math.min(1, dt / 90);
        G.kick = Math.max(0, G.kick - dt / 260);
        G.ofx.outerStrength = (this.GLOW[G.offRar] || 0) * (G.k.o + G.kick * 1.8);
      }
    };
    const off = () => sc.events.off('postupdate', tick);
    sc.events.on('postupdate', tick);
    sc.events.once('shutdown', off);
  },
  // 머리 장비 그림 이름: head_gear/<직업>_<t1~t4|legend|set|story_<키>>
  helmKey(hero, it) {
    const n = it.story ? 'story_' + it.story : it.rar === 4 ? 'legend' : it.rar === 5 ? 'set' : 't' + (Math.min(3, it.tier || 0) + 1);
    return `head_gear/${hero}_${n}`;
  },
  // 그림은 '기본 얼굴 프레임 + 사방 여백'과 같은 캔버스에 그려져 있다 → 머리 그림과 같은 자리·같은 배율로 겹친다
  helm(hero, s) {
    const it = s.eq.head && itemById(s, s.eq.head); if (!it) return;
    const sc = hero.scene, key = this.helmKey(hero.key, it);
    const atlas = typeof CuteHeroes !== 'undefined' && CuteHeroes.atlas(hero.key);
    const rig = hero.rig, head = rig && rig.map && rig.map.head;
    if (!sc.textures.exists(key) || !atlas || !head) return;
    const nf = atlas.heads.frames.neutral, hs = head.spr;
    const img = sc.add.image(0, 0, key);
    const padX = (img.width - nf.w) / 2, padY = (img.height - nf.h) / 2;
    const ox = hs.originX, oy = hs.originY;
    img.setOrigin((padX + ox * nf.w) / img.width, (padY + oy * nf.h) / img.height);
    rig.c.addAt(img, rig.c.getIndex(hs) + 1);
    hero.helmImg = img;
    const orig = rig.apply.bind(rig);
    rig.apply = p => {
      orig(p);
      img.setPosition(hs.x, hs.y).setRotation(hs.rotation).setScale(hs.scaleX, hs.scaleY).setVisible(hs.visible);
      // ✏️ 2026-11-22 하르반은 칼을 앞뒤로 옮길 때 몸 부품 순서를 다시 쌓는다 → 투구가 맨 아래로 밀려 머리 뒤에 숨던 문제. 늘 머리 바로 위로
      const c = rig.c, hi = c.getIndex(hs);
      if (c.getIndex(img) !== hi + 1) { c.remove(img); c.addAt(img, c.getIndex(hs) + 1); }
    };
  },
};
