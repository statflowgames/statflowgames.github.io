// 몬순 — 바다의 비단길 : M0 프로토타입 데이터 (scenario.md · 의뢰서 기준)
'use strict';

const ORIGINS = {
  arab:   { name: '아랍',     place: '바스라',   m: '야지드', f: '라일라', bonus: '흥정 + (파는 값 +5%)',
            story: '대추야자 상인 집안의 막내. 바다를 보고 싶어 집을 나왔다.',
            intro: '바스라에서 대추야자 상자를 나르던 너는, 동쪽 끝 바다 이야기를 듣고 광저우까지 왔다.' },
  persia: { name: '페르시아', place: '시라프',   m: '바흐만', f: '시린', bonus: '항해 + (배 속도 +5%)',
            story: '시라프 선원 집안. 스승 마르주반과 고향이 같다.',
            intro: '시라프에서 온 너를 마르주반 선장은 고향 사람이라며 반겼다.' },
  tamil:  { name: '남인도',   place: '콜람',     m: '아루란', f: '발리', bonus: '감정 + (시세 표시가 더 정확)',
            story: '후추 농장 주인의 자식. 상인 조합 견습생.',
            intro: '콜람 상인 조합의 심부름으로 광저우에 왔다가, 선장의 큰 배에 마음을 빼앗겼다.' },
  malay:  { name: '말레이',   place: '팔렘방',   m: '사가라', f: '멜루르', bonus: '잠수 + · 해협 통행세 감면',
            story: '스리위자야 해안 마을 출신. 헤엄을 잘 친다.',
            intro: '팔렘방에서 자란 너는 광저우까지 짐배를 타고 왔다. 이제 집으로 돌아가는 큰 배다.' },
  tang:   { name: '당',       place: '광저우',   m: '진원', f: '소옥', bonus: '도자기 시세 정보 · 그릇 사는 값 -5%',
            story: '장사요 그릇을 파는 상점 점원. 그릇을 따라 배에 올랐다.',
            intro: '광저우 그릇 가게에서 짐을 나르던 너를, 선장이 "그릇 다루는 손이 좋다"며 데려갔다.' },
  silla:  { name: '신라',     place: '청해진',   m: '해명', f: '연화', bonus: '전투 + (활 피해 +20%)',
            story: '청해진 교관선 선원의 자식. 서쪽 바다 끝을 보고 싶어 한다.',
            intro: '양저우에서 아버지의 소개로 선장의 배에 올랐다. 서쪽 바다 끝을 보는 게 꿈이었다.' },
};

// 대화에 나오는 인물 (face: assets/face/<key>_<표정>.webp)
const PEOPLE = {
  marzuban: { name: '마르주반 선장', face: 'marzuban', stand: 'marzuban' },
  dayang:   { name: '다양', face: 'dayang', stand: 'dayang' },
  weishao:  { name: '위소', face: 'weishao', stand: 'weishao' },
  datusri:  { name: '다투 스리', face: 'datusri', stand: 'datusri' },
  seri:     { name: '세리', face: 'seri', stand: 'seri' },
  barzakh:  { name: '???', face: 'barzakh', stand: 'barzakh' },
  jacob:    { name: '야곱', face: 'jacob', stand: 'jacob' },
};

// 교역품 (items_trade_01) — 값은 금 디나르, 1단위 = 짐 한 묶음
const GOODS = {
  changsha_bowl: { name: '장사요 그릇',   base: 10, kind: '도자기', desc: '당나라 후난의 갈색·초록 그림 그릇. 바다 건너 팔려고 수만 점씩 구웠다.' },
  yue_celadon:   { name: '월주요 청자',   base: 16, kind: '도자기', desc: '올리브빛 유약의 저장성 청자. 귀한 손님상에 오른다.' },
  tang_silk:     { name: '당나라 비단',   base: 24, kind: '직물',   desc: '비췻빛·붉은빛 비단 필. 어디서나 값이 좋다.' },
  cotton_cloth:  { name: '인도 무명',     base: 9,  kind: '직물',   desc: '남인도에서 짠 흰 무명. 해협 사람들의 옷감.' },
  black_pepper:  { name: '후추',         base: 12, kind: '향신료', desc: '인도 서해안의 검은 금. 해협을 지나 동쪽으로 간다.' },
  cinnamon:      { name: '계피',         base: 8,  kind: '향신료', desc: '남중국의 육계 껍질 묶음.' },
  clove:         { name: '정향',         base: 20, kind: '향신료', desc: '동쪽 섬에서 자바를 거쳐 오는 말린 꽃봉오리.' },
  nutmeg:        { name: '육두구',       base: 22, kind: '향신료', desc: '반다 섬의 열매. 붉은 그물 껍질(메이스)까지 귀하다.' },
  star_anise:    { name: '팔각',         base: 9,  kind: '향신료', desc: '별 모양 향신료. 당나라 남쪽에서 온다.' },
  camphor:       { name: '장뇌',         base: 26, kind: '향료',   desc: '수마트라 바루스의 하얀 결정. 약과 향으로 비싸게 팔린다.' },
  agarwood:      { name: '침향',         base: 30, kind: '향료',   desc: '진이 밴 나무 조각. 태우면 깊은 향이 난다.' },
  sandalwood:    { name: '백단',         base: 18, kind: '향료',   desc: '동쪽 섬에서 오는 금빛 향나무 토막.' },
  sumatra_gold:  { name: '수마트라 사금', base: 40, kind: '금속',   desc: '"금의 섬" 수마트라 강에서 건진 사금과 금덩이.' },
  tin:           { name: '주석',         base: 7,  kind: '금속',   desc: '칼라의 주석 덩이. 아랍 기록은 칼라를 주석의 항구로 적었다.' },
  tortoiseshell: { name: '대모 껍질',     base: 22, kind: '공예',   desc: '바다거북 등껍질 판. 빗과 상자를 꾸민다.' },
  coconut:       { name: '코코넛',       base: 3,  kind: '식료',   desc: '물과 기름과 밧줄이 모두 나오는 열매.' },
};

// 항구 (M0: 남해 4곳). buy: 여기서 살 수 있는 물건과 값 배율, want: 비싸게 사 주는 물건
const PORTS = {
  palembang: {
    name: '팔렘방', sub: '스리위자야의 수도 · 해협의 주인', lon: 104.75, lat: -2.98, icon: 'nanhai',
    bg: 'bg/bg_port_palembang', style: 'nanhai',
    buy:  { changsha_bowl: .72, yue_celadon: .78, tang_silk: .82, star_anise: .7, cinnamon: .7, coconut: .8, camphor: .9 },
    want: { tin: 1.35, cotton_cloth: 1.35, black_pepper: 1.25, clove: 1.3, nutmeg: 1.3, sandalwood: 1.35 },
    ruins: ['bukit_seguntang', 'kedukan_bukit'],
  },
  kalah: {
    name: '칼라', sub: '말레이반도 서해안 · 주석의 항구', lon: 100.36, lat: 5.66, icon: 'nanhai',
    bg: 'bg/bg_port_kalah', style: 'nanhai',
    buy:  { tin: .55, black_pepper: .7, cotton_cloth: .7, coconut: .7 },
    want: { changsha_bowl: 1.5, yue_celadon: 1.45, tang_silk: 1.4, camphor: 1.4, sumatra_gold: 1.3, clove: 1.4, nutmeg: 1.4 },
    ruins: ['bujang_valley'],
  },
  jambi: {
    name: '잠비', sub: '말라유 · 무아라 잠비 사원 단지', lon: 103.62, lat: -1.6, icon: 'nanhai',
    bg: 'bg/bg_port_jambi', style: 'nanhai',
    buy:  { sumatra_gold: .66, agarwood: .68, camphor: .62, tortoiseshell: .72, coconut: .6 },
    want: { tang_silk: 1.45, changsha_bowl: 1.35, cotton_cloth: 1.35, tin: 1.3, black_pepper: 1.2 },
    ruins: ['muara_jambi'],
  },
  java: {
    name: '자바 북안', sub: '사일렌드라 왕국 · 보로부두르로 가는 길', lon: 110.42, lat: -6.92, icon: 'nanhai',
    bg: 'bg/bg_port_java', style: 'nanhai',
    buy:  { clove: .6, nutmeg: .62, sandalwood: .6, coconut: .6 },
    want: { tang_silk: 1.5, yue_celadon: 1.45, tin: 1.45, black_pepper: 1.35, camphor: 1.35, agarwood: 1.3, changsha_bowl: 1.25 },
    ruins: ['borobudur'],
  },
};

// 배 (9세기 실제 배 계통). speed: 순풍 때 하루 경도/위도 '도' 단위
const SHIPS = {
  perahu: { name: '다양의 프라후', kind: '아웃리거 돛배', hold: 20, crewMax: 8, crewMin: 3, hull: 60, speed: 1.15, upwind: .35, price: 0, supply: 40 },
  dhow_s: { name: '작은 다우', kind: '봉합선 다우', hold: 48, crewMax: 18, crewMin: 6, hull: 120, speed: 1.3, upwind: .45, price: 240, supply: 80 },
  kunlun: { name: '곤륜선', kind: '남해 큰 배', hold: 140, crewMax: 60, crewMin: 20, hull: 260, speed: 1.2, upwind: .3, price: 1400, supply: 160 },
};

// 유적 (art-brief-gpt-ruins.md · relics.md)
const RUINS = {
  bukit_seguntang: { name: '부킷 세군탕', port: 'palembang', days: 1, bg: 'bg/ruin_bukit_seguntang', relics: ['seguntang_buddha_sketch', 'indo_pacific_beads'],
    text: '팔렘방 서쪽의 낮은 언덕. 커다란 화강암 불상이 숲 사이에 서 있다. 순례자들이 조용히 꽃을 올린다.',
    act: '스님께 허락을 받고 불상을 그린다' },
  kedukan_bukit: { name: '케두칸 부킷 비석', port: 'palembang', days: 1, bg: 'bg/ruin_kedukan_bukit', relics: ['kedukan_bukit_rubbing', 'talang_tuwo_rubbing'],
    text: '무시강 가의 둥근 바위에 옛 말레이 글자가 새겨져 있다. 스리위자야라는 이름이 나오는 오래된 비석이다.',
    act: '종이를 대고 탁본을 뜬다' },
  shabdiz_wreck: { name: '샤브디즈호 침몰 지점', sea: true, lon: 107.35, lat: -2.75, bg: 'bg/ruin_shabdiz_wreck', relics: ['changsha_bird_bowl', 'octagonal_gold_cup', 'tang_blue_white_dish'],
    text: '벨리퉁섬 앞 검은 바위 암초. 스승의 배가 가라앉은 곳이다.', act: '다양과 함께 잠수한다' },
  muara_jambi: { name: '무아라 잠비 사원 단지', port: 'jambi', days: 2, bg: 'bg/ruin_muara_jambi', relics: ['palm_leaf_sutra_copy', 'yue_celadon_shard'],
    text: '바탕하리 강가에 붉은 벽돌 사원들이 늘어서 있다. 바다 건너에서 온 학승들이 경전을 공부한다.',
    act: '승원에 머물며 경전 사본을 받는다' },
  bujang_valley: { name: '부장 계곡', port: 'kalah', days: 2, bg: 'bg/ruin_bujang_valley', relics: ['bujang_votive_tablet', 'kalah_tin_ingot', 'buddhagupta_rubbing'],
    text: '메르복 강을 따라 들어가면 돌 기단의 사원(찬디)과 쇠를 녹이던 터가 나온다. 뱃사람들이 무사 항해를 빌던 곳.',
    act: '사원과 옛 비석을 기록한다' },
  borobudur: { name: '보로부두르', port: 'java', days: 4, bg: 'bg/ruin_borobudur', relics: ['borobudur_ship_relief_sketch', 'java_gold_mas'],
    text: '화산 사이 들판에 거대한 돌 만다라가 솟아 있다. 아직 짓고 있는 회랑마다 부조가 끝없이 이어진다.',
    act: '회랑의 배 부조를 그린다', quest: true },
};

// 유물 (relics_01, 희귀도: 일반/귀중/보물)
const RELICS = {
  seguntang_buddha_sketch: { name: '세군탕 불상 모사도', rar: '보물', desc: '팔렘방 언덕에 선 큰 화강암 불상을 승려의 허락을 받아 그린 그림. 몸에 붙는 얇은 옷 주름은 남인도 아마라바티 양식의 영향으로 본다.' },
  indo_pacific_beads: { name: '인도·태평양 유리구슬 꿰미', rar: '일반', desc: '작고 한 가지 색인 유리구슬. 인도와 동남아에서 천 년 넘게 만들어 바닷길 곳곳에서 팔렸다.' },
  kedukan_bukit_rubbing: { name: '케두칸 부킷 비문 탁본', rar: '보물', desc: '683년 스리위자야 왕의 원정을 옛 말레이어로 새긴 돌의 탁본. 스리위자야라는 이름이 나오는 가장 이른 기록 중 하나.' },
  talang_tuwo_rubbing: { name: '탈랑 투오 비문 탁본', rar: '귀중', desc: '684년 왕이 모든 생명을 위해 정원을 만들었다고 적은 비문의 탁본.' },
  changsha_bird_bowl: { name: '새 그림 장사요 그릇', rar: '귀중', desc: '유약 위에 갈색·초록 붓으로 새를 그린 당나라 장사요 그릇. 벨리퉁 난파선에서 이런 그릇이 약 5만 7천 점 나왔다.' },
  octagonal_gold_cup: { name: '팔각 금잔', rar: '보물', desc: '여덟 면마다 악사를 새긴 금잔. 벨리퉁 난파선 금잔 계통의 가상 유물 「각색」.' },
  tang_blue_white_dish: { name: '당나라 청화 접시', rar: '보물', desc: '흰 바탕에 코발트 파랑으로 꽃과 잎을 그린 접시. 청화 자기의 아주 이른 예.' },
  bujang_votive_tablet: { name: '흙 봉헌판 (같은 틀 사본)', rar: '일반', desc: '순례자가 공덕을 빌며 틀에 찍어 만드는 흙판. 사원지기가 같은 틀로 새로 찍어 기록용으로 건넸다.' },
  kalah_tin_ingot: { name: '칼라 주석 덩이', rar: '일반', desc: '말레이반도에서 캔 주석을 녹여 굳힌 덩이. 9~10세기 아랍 기록은 칼라를 주석의 항구로 적었다.' },
  buddhagupta_rubbing: { name: '선장 붓다굽타 비석 탁본', rar: '보물', desc: '"큰 선장" 붓다굽타가 무사한 항해를 빌며 세운 돌의 탁본. 칼라 근처 배치는 「각색」.' },
  palm_leaf_sutra_copy: { name: '야자잎 경전 사본', rar: '귀중', desc: '길쭉한 야자잎에 글을 새기고 끈으로 묶은 경전 사본. 스님이 "바다 건너 전해 달라"며 맡겼다. 「각색」' },
  yue_celadon_shard: { name: '월주요 청자 조각', rar: '일반', desc: '올리브빛 당나라 월주요 청자 조각. 바닷길로 널리 수출되었다.' },
  borobudur_ship_relief_sketch: { name: '보로부두르 배 부조 모사도', rar: '보물', desc: '회랑 부조의 아웃리거 큰 돛배를 그린 것. 9세기 동남아 배 모습을 알려 주는 귀한 그림.' },
  java_gold_mas: { name: '자바 금화 「마」', rar: '귀중', desc: '콩알만 한 작은 금화에 꽃 모양 도장이 찍혀 있다. 순례자 시장에서 쓰이던 돈.' },
};
const RELIC_ORDER = Object.keys(RELICS);

// 항구 숙소에서 듣는 소문 (일반)
const RUMORS = {
  palembang: [
    '칼라 사람들은 당나라 그릇이라면 값을 두 배로 쳐 준대. 그릇이 깨지지 않게만 가져가.',
    '자바 북안에서는 정향과 육두구가 싸. 동쪽 섬 배들이 거기로 들어오거든.',
    '해협 북쪽, 칼라 가는 길목에 붉은 돛 해적선이 자주 나온다더군.',
    '여름(5~9월)엔 남서풍이라 북쪽 칼라로 가기 쉽고, 겨울엔 북동풍이라 내려오기가 쉬워.',
    '4월과 10월은 바람이 바뀌는 달이야. 잔잔하다가 갑자기 폭풍이 와.',
  ],
  kalah: [
    '여기 주석은 싸지만 팔렘방이나 자바에선 귀한 대접을 받지.',
    '잠비 상류에서 사금이 나와. 금을 사려면 잠비로 가 봐.',
    '아랍 배들은 겨울 북동풍을 타고 서쪽으로 돌아간대.',
    '흑닻 상회? 쉿… 그 이름은 크게 말하지 마.',
  ],
  jambi: [
    '무아라 잠비 승원에는 날란다에서 공부한 스님들도 와 있어.',
    '당나라 비단을 가져오면 여기 귀족들이 금으로 바꿔 준다네.',
    '침향은 여기서 사서 자바에 팔면 남는 장사지.',
  ],
  java: [
    '보로부두르는 아직 다 짓지 못했대. 돌을 나르는 사람이 수천 명이라더라.',
    '자바 사람들은 주석으로 청동을 만들어. 주석이 늘 모자라지.',
    '동쪽 섬에서 정향 배가 들어왔어. 지금이 싸게 살 때야.',
  ],
};

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DEBT_TOTAL = 300;
