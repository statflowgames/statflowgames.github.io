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
      const key = `${hero.key}/${pre}_${this.idx(it)}`;
      if (!sc.textures.exists(key) || b.spr.texture.key === key) continue;
      b.img = key; b.cur = undefined; b.spr.setTexture(key);   // 같은 배율 그대로 → 그림마다 원래 크기 비율 유지
    }
    // ✏️ 2026-11-22 머리 장비 겉모습은 나중에 (착용용 그림을 받은 뒤). 지금은 주소에 ?helm 을 붙일 때만 시험으로 보인다.
    if (typeof Q !== 'undefined' && Q.has('helm')) this.helm(hero, s);
  },
  // (시험) 머리 장비 아이콘을 머리 위에
  HELM: { warrior: [0.5, 0.18, 1.0], paladin: [0.5, 0.2, 0.95], mage: [0.5, 0.22, 1.0], rogue: [0.5, 0.25, 1.0], ranger: [0.5, 0.2, 0.95], hexblade: [0.5, 0.2, 1.0] },
  // 머리 위에 얹어도 자연스러운 것만 (모자·머리띠·얼굴이 트인 투구). 얼굴을 덮는 투구·두건은 표정이 가려서 그리지 않는다.
  //   번호: 0~3 = 단계, 4 = 전설, 5 = 세트
  HELM_OK: { warrior: [0, 1], paladin: [0, 1, 4], mage: [1, 2, 3, 4, 5], rogue: [], ranger: [1, 2, 3, 4], hexblade: [0] },
  STORY_HELM_OK: ['c3_hood', 'c4_keeper', 'c8_diver'],
  helm(hero, s) {
    const it = s.eq.head && itemById(s, s.eq.head); if (!it) return;
    if (it.story ? !this.STORY_HELM_OK.includes(it.story) : !(this.HELM_OK[hero.key] || []).includes(this.idx(it))) return;
    const key = UI.itemIcon(it), sc = hero.scene;
    if (!sc.textures.exists(key)) return;
    const rig = hero.rig, head = rig.map.head; if (!head) return;
    const [u, v, w] = this.HELM[hero.key] || [0.5, 0.2, 1];
    const img = sc.add.image(0, 0, key).setOrigin(0.5, 0.6);
    rig.c.addAt(img, rig.c.getIndex(head.spr) + 1);
    hero.helmImg = img;
    const orig = rig.apply.bind(rig);
    rig.apply = p => {
      orig(p);
      const hs = head.spr;
      const hw = hs.width * Math.abs(hs.scaleX), hh = hs.height * Math.abs(hs.scaleY);
      const lx = (u - hs.originX) * hw, ly = (v - hs.originY) * hh;
      const cos = Math.cos(hs.rotation), sin = Math.sin(hs.rotation);
      img.setPosition(hs.x + lx * cos - ly * sin, hs.y + lx * sin + ly * cos).setRotation(hs.rotation);
      img.setScale((hw * w) / img.width);
      img.setVisible(hs.visible);
    };
  },
};
