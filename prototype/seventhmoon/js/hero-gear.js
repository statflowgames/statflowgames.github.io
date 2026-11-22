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
    // ✏️ 2026-11-22 머리 장비 착용 그림(54장) 적용. 주소에 ?nohelm 을 붙이면 끈다.
    if (typeof Q === 'undefined' || !Q.has('nohelm')) this.helm(hero, s);
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
    };
  },
};
