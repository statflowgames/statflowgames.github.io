// 게임 데이터 (docs/systems.md · items.md · art-brief-gpt-wardrobe.md 기준, M0 = 1년차)
(function (root) {
  'use strict';

  const STATS = {
    grace: { name: '품위', icon: '🫖', color: '#c2577a' },
    int:   { name: '지성', icon: '📖', color: '#3d6fb0' },
    magic: { name: '마력', icon: '🔮', color: '#7b4fb8' },
    might: { name: '무력', icon: '⚔️', color: '#a2462f' },
    charm: { name: '매력', icon: '🌹', color: '#d0466b' },
    vit:   { name: '체력', icon: '🍀', color: '#4b8c4f' },
  };
  const STAT_KEYS = Object.keys(STATS);

  const PERSONALITY = {
    ice:   { name: '얼음 장미', icon: '❄️', desc: '완벽하고 차가운 공녀' },
    thorn: { name: '가시 장미', icon: '🌵', desc: '반항적이지만 정의로운' },
    green: { name: '온실 장미', icon: '🌷', desc: '상냥하고 여린' },
    wild:  { name: '들장미',   icon: '🌹', desc: '밝고 씩씩한 말괄량이' },
  };

  // cat: lesson | rest | job | special
  const ACTIVITIES = {
    etiquette: { name: '예법', cat: 'lesson', icon: '🫖', cost: 30, gain: { grace: 8, charm: 2 }, stress: 6, axis: { self: -2 },
      line: { doing: '책을 머리에 얹고 인사 연습 중…', great: '흔들림 없는 완벽한 인사!', fail: '책이 머리 위로 툭…' } },
    dance:     { name: '무용', cat: 'lesson', icon: '🩰', cost: 40, gain: { grace: 5, charm: 5, vit: 2 }, stress: 7,
      line: { doing: '보이지 않는 상대와 왈츠 스텝', great: '치마가 꽃처럼 활짝!', fail: '제 발에 걸려 털썩' } },
    history:   { name: '역사', cat: 'lesson', icon: '📜', cost: 30, gain: { int: 8, grace: 2 }, stress: 6, axis: { self: -1 },
      line: { doing: '두꺼운 역사책과 씨름 중', great: '머리 위에 반짝 전구!', fail: '책 위에서 꾸벅꾸벅…' } },
    econ:      { name: '경제', cat: 'lesson', icon: '🧮', cost: 40, gain: { int: 7 }, stress: 6,
      line: { doing: '주판알 튕기는 소리', great: '눈이 금화처럼 반짝!', fail: '주판알이 데굴데굴, 눈이 빙글빙글' } },
    magic:     { name: '마법학', cat: 'lesson', icon: '🔮', cost: 60, gain: { magic: 8, int: 3 }, lose: { vit: -2 }, stress: 8,
      line: { doing: '깃털을 띄우려 지팡이를 휘두르는 중', great: '빛의 꽃이 터졌다!', fail: '펑! 얼굴에 그을음…' } },
    fencing:   { name: '검술', cat: 'lesson', icon: '🤺', cost: 50, gain: { might: 8, vit: 3 }, lose: { grace: -2 }, stress: 8, axis: { self: 2 },
      line: { doing: '목검으로 찌르기 연습', great: '허수아비 머리가 날아갔다!', fail: '목검이 나무에 박혀 안 빠진다' } },
    riding:    { name: '승마', cat: 'lesson', icon: '🐴', cost: 40, gain: { vit: 7, might: 3 }, stress: 5, axis: { self: 1 },
      line: { doing: '조랑말과 함께 총총', great: '머리칼을 휘날리며 질주!', fail: '조랑말이 꿈쩍도 안 한다' } },
    music:     { name: '음악', cat: 'lesson', icon: '🎵', cost: 40, gain: { charm: 8, grace: 2 }, stress: 5, axis: { temp: 1 },
      line: { doing: '눈을 감고 하프 연주', great: '새들이 모여들었다!', fail: '팅! 줄이 끊어졌다' } },
    rest:      { name: '휴식', cat: 'rest', icon: '🛋️', cost: 0, gain: { vit: 2 }, stress: -25,
      line: { doing: '고양이 인형을 안고 낮잠', great: '개운하게 기지개!', fail: '소파에서 데굴' } },
    walk:      { name: '정원 산책', cat: 'rest', icon: '🌷', cost: 0, gain: {}, stress: -15, axis: { temp: 1 }, trust: 1,
      line: { doing: '장미 향기를 맡는 중', great: '코끝에 나비가 앉았다', fail: '가시에 찔려 글썽' } },
    talk:      { name: '가정교사와 대화', cat: 'rest', icon: '☕', cost: 0, gain: {}, stress: -10, axis: { temp: 1 }, trust: 4, perMonth: 1,
      line: { doing: '마리와 함께 차 한 잔', great: '둘이 함께 웃음이 터졌다', fail: '어색한 침묵… 홀짝' } },
    // 2년차부터
    flower:    { name: '꽃집', cat: 'job', icon: '💐', locked: '2년차 외출 허가 후', income: 60, gain: { charm: 4 }, stress: 8, axis: { temp: 2 } },
    library:   { name: '도서관 보조', cat: 'job', icon: '📚', locked: '2년차 외출 허가 후', income: 50, gain: { int: 4 }, stress: 6 },
    knight:    { name: '기사단 잡일', cat: 'job', icon: '🪣', locked: '2년차 외출 허가 후', income: 70, gain: { might: 4, vit: 3 }, stress: 10, axis: { self: 2 } },
    market:    { name: '시장 장사', cat: 'job', icon: '🍎', locked: '2년차 외출 허가 후', income: 80, gain: { charm: 3, int: 3 }, stress: 9, axis: { self: 3 } },
    sneak:     { name: '몰래 외출', cat: 'rest', icon: '🪢', locked: '2년차부터', gain: {}, stress: -35, axis: { self: 3 } },
    antidote:  { name: '해독학', cat: 'lesson', icon: '🧪', locked: '3년차 10월 이벤트', cost: 50, gain: { int: 5, magic: 4 }, stress: 7 },
  };
  const LESSONS = Object.keys(ACTIVITIES).filter(k => ACTIVITIES[k].cat === 'lesson');

  // 특수 칸 (강제)
  const FORCED = {
    sulk: { name: '삐짐', icon: '😤', stress: -15, trust: -5, line: '방문을 걸어 잠그고 나오지 않는다…' },
    sick: { name: '요양', icon: '🤒', stress: -10, line: '이불 속에서 콜록콜록' },
    refuse: { name: '수업 거부', icon: '🙅', stress: -5, trust: -1, line: '"오늘은 안 해!"' },
  };

  // 의상 (소녀 단계, 프로토타입 세트). eff: 수업 효율, judge: 판정 보너스, stressMul: 스트레스 증가 배율
  const OUTFITS = {
    velvet:    { name: '검붉은 벨벳 원피스', series: '기본', price: 0, owned: true, art: 'ev_s1_base', stressMul: 0.95, note: '스트레스 증가 -5%' },
    home_blue: { name: '하늘색 실내 원피스', series: '기본 · 일상', price: 250, art: 'ev_s1_dress_home_blue', stressMul: 0.9, note: '스트레스 증가 -10%' },
    cardigan:  { name: '니트 카디건 원피스', series: '기본 · 일상', price: 250, art: 'ev_s1_dress_cardigan', eff: { history: 0.1 }, stressMul: 0.95, note: '역사 +10%, 스트레스 -5%' },
    riding:    { name: '승마복', series: '수업복', price: 300, art: 'ev_s1_dress_riding', eff: { riding: 0.15 }, note: '승마 +15%' },
    fencing:   { name: '검술 연습복', series: '수업복', price: 300, art: 'ev_s1_dress_fencing', eff: { fencing: 0.15 }, note: '검술 +15%' },
    robe:      { name: '견습 마법사 로브', series: '수업복', price: 350, art: 'ev_s1_dress_robe', eff: { magic: 0.15 }, note: '마법학 +15%' },
    ballet:    { name: '무용 연습복', series: '수업복', price: 300, art: 'ev_s1_dress_ballet', eff: { dance: 0.15 }, note: '무용 +15%' },
    teaparty:  { name: '분홍 다과회 드레스', series: '사교', price: 400, art: 'ev_s1_dress_teaparty', eff: { etiquette: 0.1 }, judge: { grace: 12 }, note: '예법 +10%, 품위 판정 +12' },
    lavender:  { name: '라벤더 다과회 드레스', series: '사교', price: 450, art: 'ev_s1_dress_lavender', eff: { music: 0.1 }, judge: { grace: 8, charm: 8 }, note: '음악 +10%, 품위·매력 판정 +8' },
    winter:    { name: '진홍 겨울 코트', series: '계절', price: 300, art: 'ev_s1_dress_winter', stressMul: 0.95, winter: true, note: '겨울(12~2월) 스트레스 -10%' },
  };
  const OUTFIT_SERIES_SET = { '수업복': { need: 3, note: '수업 스트레스 -10%' } };

  // 상점 아이템 (items.md)
  const ITEMS = {
    // 선물
    gift_rose_candy:     { name: '장미 사탕', cat: 'gift', icon: '🍬', price: 30, eff: { stress: -8 } },
    gift_knit_ribbon:    { name: '손수 짠 리본', cat: 'gift', icon: '🎀', price: 50, eff: { trust: 2 } },
    gift_picture_book:   { name: '그림 동화책', cat: 'gift', icon: '📕', price: 60, eff: { int: 3, trust: 1 } },
    gift_pressed_flower: { name: '압화 책갈피', cat: 'gift', icon: '🌸', price: 40, eff: { temp: 2 } },
    gift_plush_cat:      { name: '고양이 인형', cat: 'gift', icon: '🐱', price: 80, eff: { stress: -15, temp: 2 } },
    gift_macaron:        { name: '마카롱 상자', cat: 'gift', icon: '🧁', price: 90, eff: { stress: -12 } },
    gift_diary:          { name: '자물쇠 달린 일기장', cat: 'gift', icon: '📔', price: 100, eff: { trust: 4 }, once: true },
    gift_music_box:      { name: '어머니의 오르골', cat: 'gift', icon: '🎶', ink: 30, eff: { trust: 15 }, once: true },
    // 소모품
    cons_herb_tea:       { name: '캐모마일 허브티', cat: 'cons', icon: '🍵', price: 40, eff: { stress: -20 } },
    cons_honey_lemon:    { name: '꿀 레몬차', cat: 'cons', icon: '🍋', price: 30, eff: { stress: -10, vit: 3 } },
    cons_tonic:          { name: '영양제', cat: 'cons', icon: '🧴', price: 60, eff: { vit: 10 } },
    cons_chocolate:      { name: '고급 초콜릿', cat: 'cons', icon: '🍫', price: 100, eff: { stress: -15 }, buff: { great: 0.05 } },
    cons_aroma_candle:   { name: '라벤더 향초', cat: 'cons', icon: '🕯️', price: 80, buff: { stressMul: 0.7 } },
    cons_study_lamp:     { name: '밤샘 등불', cat: 'cons', icon: '🪔', price: 90, eff: { stress: 15 }, buff: { lesson: 0.2 } },
    cons_cold_medicine:  { name: '감기약', cat: 'cons', icon: '💊', price: 120, cure: true },
    cons_lucky_clover:   { name: '네잎클로버 부적', cat: 'cons', icon: '🍀', ink: 15, buff: { great: 0.1 } },
    // 수업 도구 (회차 동안 유지)
    tool_etiquette_1: { name: '예법 교본', cat: 'tool', icon: '📗', price: 150, tool: 'etiquette' },
    tool_dance_1:     { name: '은 메트로놈', cat: 'tool', icon: '⏱️', price: 150, tool: 'dance' },
    tool_history_1:   { name: '역사서 전집', cat: 'tool', icon: '📚', price: 150, tool: 'history' },
    tool_econ_1:      { name: '흑단 주판', cat: 'tool', icon: '🧮', price: 180, tool: 'econ' },
    tool_magic_1:     { name: '견습 마법서', cat: 'tool', icon: '📘', price: 200, tool: 'magic' },
    tool_sword_1:     { name: '연습용 목검', cat: 'tool', icon: '🗡️', price: 180, tool: 'fencing' },
    tool_riding_1:    { name: '가죽 안장', cat: 'tool', icon: '🏇', price: 200, tool: 'riding' },
    tool_music_1:     { name: '악보집', cat: 'tool', icon: '🎼', price: 150, tool: 'music' },
    // 특수
    spec_margin_note:    { name: '원작의 여백', cat: 'spec', icon: '📝', ink: 3, desc: '다음 예고 사건에 필요한 조건을 보여 줘요' },
    spec_rumor_notebook: { name: '도티의 소문 수첩', cat: 'spec', icon: '📒', price: 100, desc: '이번 회차 동안 신뢰·관계를 숫자로 보여 줘요', once: true },
  };

  // 원작 예고 (1년차)
  const PROPHECY = {
    P1: { month: 3, warn: 2, title: '해고된 가정교사',
      text: '공녀의 어린 시절, 공작가에 새 가정교사가 왔다. 그러나 그녀는 석 달을 버티지 못하고 쫓겨났다. 그 뒤로 공녀에게 무언가를 가르치려는 사람은 아무도 없었다.',
      hint: '3월 말까지 신뢰 30 이상 (♥ 하트 1칸 반). 매달 「가정교사와 대화」를 빼먹지 마세요' },
    P2: { month: 7, warn: 6, title: '황궁 다과회의 케이크',
      text: '열세 살 여름, 황궁 다과회. 공녀는 황태자가 다른 영애에게 웃어 주는 것을 보고, 그 영애의 케이크를 테이블 아래로 엎어 버렸다.',
      hint: '7월 말 품위 판정 80 (사교 드레스가 도움이 돼요)' },
    P3: { month: 10, warn: 9, title: '아무도 기억하지 않은 생일',
      text: '열세 살 가을, 공녀는 자신의 생일을 아무도 기억하지 못했다는 사실에 하녀의 손등을 부채로 내리쳤다. 그날 이후 하인들은 그녀를 \'붉은 마녀\'라 불렀다.',
      hint: '9월에 생일 준비(100G) + 아버지 관계 15 이상 또는 지성 70 이상' },
  };

  root.DATA = { STATS, STAT_KEYS, PERSONALITY, ACTIVITIES, LESSONS, FORCED, OUTFITS, OUTFIT_SERIES_SET, ITEMS, PROPHECY };
})(typeof window !== 'undefined' ? window : globalThis);
