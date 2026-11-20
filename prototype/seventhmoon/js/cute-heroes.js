// 주인공 새 그림(1차 4등신 느낌) — 전투 캐릭터·동료·전투 HUD 얼굴·각성 컷인에 쓴다.
// 대화 초상화·캠프·타이틀은 기존 그림 그대로. 주소에 ?oldhero 를 붙이면 예전 전투 그림으로 볼 수 있다.
// 부품 좌표: js/data/cute-atlas.js (tools/build_cute_assets.py), 연결: js/harvan-cute-parts.js · js/cute-hero-parts.js
const CuteHeroes = {
  on() { return typeof CUTE_ATLAS !== 'undefined' && !(typeof Q !== 'undefined' && Q.has('oldhero')); },
  atlas(key) { return this.on() ? CUTE_ATLAS[key] || null : null; },
  // 장면이 불러올 그림 이름
  keys(heroKeys) { return this.on() ? heroKeys.flatMap(k => CUTE_ATLAS[k] ? Object.values(CUTE_ATLAS[k].tex) : []) : []; },
  ready(scene, key) {
    const a = this.atlas(key);
    if (!a || !Object.values(a.tex).every(t => scene.textures.exists(t))) return null;
    HarvanCuteParts.register(scene, a);
    return a;
  },
  // 주인공·동료의 리그를 새 부품으로 바꾼다. 그림이 없으면 아무것도 하지 않는다.
  apply(actor) {
    const a = this.ready(actor.scene, actor.key);
    if (!a) return false;
    try {
      HarvanCuteParts.install(actor, (a.rigProfile && a.rigProfile.targetRatio) || 4, a);
      actor.cute = true;
      return true;
    } catch (e) {
      if (window.SFX_DEBUG) throw e;
      console.warn('cute hero install failed', actor.key, e);
      return false;
    }
  },
  // 전투 HUD·각성 컷인용 얼굴 [텍스처, 프레임]
  face(scene, key, expr = 'neutral') {
    const a = this.ready(scene, key);
    return a && a.heads.frames[expr] ? [a.tex.heads, expr] : null;
  },
};
