// 게임 데이터 — 원작(몬순) 의뢰서 3·4의 유적·유물 id를 그대로 씀. M0: 남해관(유적 7곳 · 유물 16점)
'use strict';

const RAR = {
  '일반': { base: 10, color: '#cfc2a4', glow: 'rgba(240,230,200,.0)', cls: 'r1' },
  '귀중': { base: 20, color: '#3fb6b0', glow: 'rgba(80,210,200,.55)', cls: 'r2' },
  '보물': { base: 34, color: '#e8b53d', glow: 'rgba(255,205,80,.65)', cls: 'r3' },
  '전설': { base: 60, color: '#a77be0', glow: 'rgba(180,130,255,.7)', cls: 'r4' },
};

// 원정지 = 유적. kind: record(기록 조사) / dig(공동 발굴) / dive(수중 조사)
const RUINS = {
  bukit_seguntang: { name: '부킷 세군탕 언덕', kind: 'record', lon: 104.72, lat: -2.95, mo: [-26, -22], sec: 40, cost: 20, fame: 0,
    relics: ['seguntang_buddha_sketch', 'indo_pacific_beads'],
    text: '팔렘방 서쪽의 낮은 언덕. 지금은 고고학 공원이지만 꽃을 올리는 사람이 아직 있어요.',
    note: '관리소의 허락을 받아 불상을 그리고, 흙 속 유리구슬은 현지 조사단과 함께 기록했어요.' },
  kedukan_bukit: { name: '케두칸 부킷 비석 터', kind: 'record', lon: 104.86, lat: -3.1, mo: [30, 34], sec: 45, cost: 25, fame: 0,
    relics: ['kedukan_bukit_rubbing', 'talang_tuwo_rubbing'],
    text: '무시강 가, 683년 스리위자야의 이름을 새긴 비석이 나온 곳이에요. 진품은 국립 박물관에 있어요.',
    note: '현지 박물관과 함께 정식 탁본을 떴어요. 돌은 그대로, 종이만 가져왔어요.' },
  shabdiz_wreck: { name: '샤브디즈호 난파 지점', kind: 'dive', lon: 107.35, lat: -2.75, sec: 90, cost: 60, fame: 10,
    relics: ['changsha_bird_bowl', 'octagonal_gold_cup', 'tang_blue_white_dish'],
    text: '벨리퉁섬 앞 검은 암초. 1998년 그릇 더미가 발견된 바로 그 자리예요.',
    note: '현장은 그대로 두고, 측량 줄을 깔아 기록한 뒤 허가받은 유물만 건졌어요.' },
  muara_jambi: { name: '무아라 잠비 사원 단지', kind: 'dig', lon: 103.67, lat: -1.48, sec: 70, cost: 40, fame: 25,
    relics: ['palm_leaf_sutra_copy', 'yue_celadon_shard'],
    text: '바탕하리 강가 숲속에 붉은 벽돌 사원 터가 80곳 넘게 흩어져 있어요. 지금도 발굴 중이에요.',
    note: '현지 발굴단과 공동 발굴했어요. 나온 것의 절반은 현지 박물관에 남겼어요.' },
  bujang_valley: { name: '부장 계곡', kind: 'dig', lon: 100.45, lat: 5.7, sec: 80, cost: 45, fame: 25,
    relics: ['bujang_votive_tablet', 'kalah_tin_ingot', 'buddhagupta_rubbing'],
    text: '말레이반도 서쪽, 돌 기단의 사원 터와 쇠를 녹이던 옛 제련 터가 나오는 계곡이에요.',
    note: '대학 발굴단과 함께 팠어요. 출토품은 빌려서 전시하고, 기록은 함께 출판해요.' },
  dieng: { name: '디엥 고원 사원들', kind: 'record', lon: 109.9, lat: -7.2, mo: [-40, -26], sec: 100, cost: 55, fame: 60,
    relics: ['dieng_arjuna_sketch', 'kawi_copperplate_copy'],
    text: '자바 중부, 안개 낀 고원 분지에 작은 돌 사원들이 모여 있어요. 자바에서 가장 오래된 힌두 석조 사원이에요.',
    note: '사원은 그대로 두고 그림과 문서 필사본으로만 기록했어요.' },
  borobudur: { name: '보로부두르', kind: 'record', lon: 110.2, lat: -7.6, sec: 120, cost: 80, fame: 60,
    relics: ['borobudur_ship_relief_sketch', 'java_gold_mas'],
    text: '화산 사이 들판의 거대한 돌 만다라. 지금도 순례자가 찾는 성지라 물건은 가져오지 않아요.',
    note: '회랑의 배 부조는 허가를 받아 그렸고, 금화는 현지 박물관이 빌려줬어요.' },
};
const RUIN_ORDER = Object.keys(RUINS);
const KIND = {
  record: { name: '기록 조사', icon: '📜', team: '연구원 · 모사 화가', skin: 'paper' },
  dig: { name: '공동 발굴', icon: '⛏', team: '조사원 · 현지 학자', skin: 'dirt' },
  dive: { name: '수중 조사', icon: '🤿', team: '잠수 팀 · 보존과학자', skin: 'sand' },
};

// 유물 16 (원작 relics_01). slot: case(진열장) / wall(벽 액자). mg: 보존처리 미니게임
// made: 만든 곳 (관람객 취향에 씀)
const RELICS = {
  seguntang_buddha_sketch: { name: '세군탕 불상 모사도', rar: '보물', ruin: 'bukit_seguntang', cat: '모사도', slot: 'wall', mg: 'sketch', made: 'local',
    desc: '팔렘방 언덕에 선 큰 화강암 불상을 허락을 받아 그린 그림이에요. 몸에 붙는 얇은 옷 주름은 남인도 아마라바티 양식의 영향으로 봐요.',
    src: '부킷 세군탕 출토 화강암 불상 (높이 약 2.8m). 연대 7~9세기 설 ⚠' },
  indo_pacific_beads: { name: '인도·태평양 유리구슬 꿰미', rar: '일반', ruin: 'bukit_seguntang', cat: '장신구', slot: 'case', mg: 'clean', made: 'local',
    desc: '작고 한 가지 색인 유리구슬을 실에 꿴 것이에요. 인도와 동남아에서 천 년 넘게 만들어 바닷길 곳곳에서 팔렸어요.',
    src: '인도양 교역 유리구슬 (기원전 수세기~12세기경)' },
  kedukan_bukit_rubbing: { name: '케두칸 부킷 비문 탁본', rar: '보물', ruin: 'kedukan_bukit', cat: '탁본', slot: 'wall', mg: 'rub', made: 'local',
    desc: '683년 스리위자야 왕이 원정을 마쳤다고 옛 말레이어로 새긴 돌의 탁본이에요. 스리위자야라는 이름이 나오는 가장 이른 기록 중 하나예요.',
    src: '케두칸 부킷 비문 (682~683년)' },
  talang_tuwo_rubbing: { name: '탈랑 투오 비문 탁본', rar: '귀중', ruin: 'kedukan_bukit', cat: '탁본', slot: 'wall', mg: 'rub', made: 'local',
    desc: '684년 왕이 모든 생명을 위해 정원을 만들었다고 적은 비문의 탁본이에요.',
    src: '탈랑 투오 비문 (684년, 옛 말레이어)' },
  changsha_bird_bowl: { name: '새 그림 장사요 그릇', rar: '귀중', ruin: 'shabdiz_wreck', cat: '도자기', slot: 'case', mg: 'puzzle', made: 'tang',
    desc: '유약 위에 갈색·초록 붓으로 새를 그린 당나라 장사요 그릇이에요. 바다 건너 팔려고 수만 점씩 만들었어요. 바닥에 작은 표식이 있어요.',
    src: '벨리퉁 난파선 출토 장사요 그릇 (약 5만 7천 점) 계통. 826년 날짜를 적은 그릇도 있음' },
  octagonal_gold_cup: { name: '팔각 금잔', rar: '보물', ruin: 'shabdiz_wreck', cat: '금속 공예', slot: 'case', mg: 'desalt', made: 'tang',
    desc: '여덟 면마다 악사를 새기고 고리 손잡이를 단 금잔이에요. 소그드풍 디자인을 당나라 장인이 만들었어요.',
    src: '벨리퉁 난파선 출토 팔각 금잔 계통의 가상 유물 「각색」' },
  tang_blue_white_dish: { name: '당나라 청화 접시', rar: '보물', ruin: 'shabdiz_wreck', cat: '도자기', slot: 'case', mg: 'desalt', made: 'tang',
    desc: '흰 바탕에 코발트 파랑으로 꽃과 잎을 그린 접시예요. 청화 자기의 아주 이른 예예요.',
    src: '벨리퉁 난파선 출토 당 청화 접시 3점 (허난 공현요) 계통' },
  bujang_votive_tablet: { name: '흙 봉헌판 (같은 틀 사본)', rar: '일반', ruin: 'bujang_valley', cat: '모사도', slot: 'case', mg: 'clean', made: 'local',
    desc: '순례자가 공덕을 빌며 틀에 찍어 만드는 작은 흙판이에요. 같은 틀로 새로 찍은 기록용 사본이에요.',
    src: '동남아 각지 출토 불교 봉헌판 종류 ⚠' },
  kalah_tin_ingot: { name: '칼라 주석 덩이', rar: '일반', ruin: 'bujang_valley', cat: '교역품', slot: 'case', mg: 'clean', made: 'local',
    desc: '말레이반도에서 캔 주석을 녹여 굳힌 덩이예요. 9~10세기 아랍 기록은 칼라를 주석의 항구로 적었어요.',
    src: '아랍 지리서의 「칼라 주석」 기록 ⚠' },
  buddhagupta_rubbing: { name: '선장 붓다굽타 비석 탁본', rar: '보물', ruin: 'bujang_valley', cat: '탁본', slot: 'wall', mg: 'rub', made: 'local',
    desc: '「큰 선장」 붓다굽타가 무사한 항해를 빌며 세운 돌의 탁본이에요. 탑 그림 아래 산스크리트 기도문이 있어요.',
    src: '붓다굽타 비석 (5세기경). 칼라 근처 배치는 「각색」' },
  palm_leaf_sutra_copy: { name: '야자잎 경전 사본', rar: '귀중', ruin: 'muara_jambi', cat: '문서·사본', slot: 'wall', mg: 'sketch', made: 'local',
    desc: '길쭉한 야자잎에 글을 새기고 끈으로 묶은 경전 사본이에요.',
    src: '남·동남아 패엽경 제작 방식 「각색」' },
  yue_celadon_shard: { name: '월주요 청자 조각', rar: '일반', ruin: 'muara_jambi', cat: '도자기', slot: 'case', mg: 'puzzle', made: 'tang',
    desc: '올리브빛이 도는 당나라 저장성 월주요 청자 조각이에요. 바닷길로 널리 수출됐어요.',
    src: '월주요 청자 (9세기 수출 도자)' },
  borobudur_ship_relief_sketch: { name: '보로부두르 배 부조 모사도', rar: '보물', ruin: 'borobudur', cat: '모사도', slot: 'wall', mg: 'sketch', made: 'local',
    desc: '회랑 부조에 새겨진, 옆에 지지대(아웃리거)를 단 큰 돛배를 그린 것이에요. 9세기 동남아 배 모습을 알려 주는 귀한 그림이에요.',
    src: '보로부두르 부조의 배. 2003년 이 부조로 복원한 배 「사무드라 락사」' },
  java_gold_mas: { name: '자바 금화 「마」', rar: '귀중', ruin: 'borobudur', cat: '화폐', slot: 'case', mg: 'clean', made: 'local',
    desc: '콩알만 한 작은 금화에 꽃 모양 도장이 찍혀 있어요. 순례자 시장에서 쓰이던 돈이에요.',
    src: '중부 자바 금·은화 ⚠ 연대 범위 확인 필요' },
  dieng_arjuna_sketch: { name: '디엥 아르주나 사원 모사도', rar: '귀중', ruin: 'dieng', cat: '모사도', slot: 'wall', mg: 'sketch', made: 'local',
    desc: '고원에 선 작은 돌 사원을 그린 것이에요. 자바에 남은 가장 오래된 힌두 석조 사원 무리예요.',
    src: '디엥 고원 아르주나 사원군 (7~8세기)' },
  kawi_copperplate_copy: { name: '자바 동판 문서 필사본', rar: '귀중', ruin: 'dieng', cat: '문서·사본', slot: 'wall', mg: 'sketch', made: 'local',
    desc: '땅을 사원에 바친다는 내용을 새긴 동판을 종이에 옮겨 적은 것이에요. 옛 자바어(카위) 문자로 쓰였어요.',
    src: '9~10세기 자바의 땅 하사 동판 종류 ⚠' },
};
const RELIC_ORDER = Object.keys(RELICS);
const MG = {
  puzzle: { name: '조각 맞추기', who: '켄지', wait: 30 },
  clean: { name: '흙·녹 닦기', who: '켄지', wait: 25 },
  rub: { name: '탁본 정리', who: '하윤 대신 아이샤', wait: 35 },
  sketch: { name: '모사도 선 살리기', who: '아이샤', wait: 35 },
  desalt: { name: '소금기 빼기', who: '켄지', wait: 50 },
};

// 사람 (대화). me = 관장 (남/여는 G.dir)
const PEOPLE = {
  aisha: { name: '아이샤', role: '수석 큐레이터', face: 'aisha', stand: 'aisha' },
  kenji: { name: '켄지', role: '보존과학자', face: 'kenji', stand: 'kenji' },
  maya: { name: '마야', role: '잠수 팀장', face: 'maya', stand: 'maya' },
  director_m: { name: '관장', face: 'director_m', stand: 'director_m' },
  director_f: { name: '관장', face: 'director_f', stand: 'director_f' },
  dayang: { name: '다양', face: 'dayang', stand: 'dayang' },
  marzuban: { name: '마르주반 선장', face: 'marzuban', stand: 'marzuban' },
  weishao: { name: '위소', face: 'weishao', stand: 'weishao' },
};

// 관람객 그룹 (M0: 3지역 + 특별)
const VISITORS = {
  seasia: { name: '동남아 여행객', likes: r => RUINS[RELICS[r].ruin] ? 1 : 0, says: ['우리 바다 이야기네!', '할머니 고향 근처야!', '스리위자야다!'] },
  china: { name: '중국 여행객', likes: r => RELICS[r].made === 'tang' ? 1 : 0, says: ['당나라 그릇이다!', '장사요잖아!', '이게 바다를 건넜구나'] },
  world: { name: '세계 여행객', likes: r => RELICS[r].rar === '보물' ? 1 : 0, says: ['Wow!', '대단해…', '사진 찍어야지'] },
};

// 박물관 층 (아래 → 위). slot: case/wall
const HALLS = {
  lobby: { name: '로비', slots: [{ id: 'L1', x: 238, t: 'case' }, { id: 'L0', x: 400, t: 'spot' }, { id: 'L2', x: 548, t: 'case' }] },
  nanhaiA: { name: '남해관', slots: ['case', 'wall', 'case', 'case', 'wall', 'case'].map((t, i) => ({ id: 'A' + i, x: 112 + i * 100, t })) },
  nanhaiB: { name: '남해관 2', cost: 300, slots: ['wall', 'case', 'case', 'wall', 'case', 'case'].map((t, i) => ({ id: 'B' + i, x: 112 + i * 100, t })) },
};
const TIER = [
  { name: '나무 진열장', mult: 1, cost: 0 },
  { name: '유리 진열장', mult: 1.4, cost: 60 },
  { name: '고급 진열장', mult: 1.9, cost: 180 },
];

// 명성 등급
const RANKS = [
  { star: 0, name: '문 닫기 직전' },
  { star: 1, name: '1성 · 다시 문을 연 박물관' },
  { star: 2, name: '2성 · 동네의 자랑', need: { fame: 150, shown: 10, sets: 2 } },
];

// 오늘의 목표 후보
const GOAL_POOL = [
  { id: 'visitors', text: '관람객 {n}명 맞이하기', n: [20, 30, 40], reward: 60 },
  { id: 'hearts', text: '관람객 하트 {n}개 받기', n: [10, 15, 20], reward: 50 },
  { id: 'coins', text: '떨어진 동전 {n}번 줍기', n: [8, 12], reward: 40 },
  { id: 'restore', text: '유물 {n}점 보존처리하기', n: [1, 2], reward: 70 },
  { id: 'exps', text: '원정 {n}번 보내기', n: [2, 3], reward: 60 },
  { id: 'wishes', text: '관람객 소원 {n}개 들어주기', n: [1, 2], reward: 80 },
  { id: 'photos', text: '관람객 사진 {n}장 찍히기', n: [5, 8], reward: 45 },
];

// 깜짝 사건
const EVENTS = {
  bus: { name: '단체 관람 버스 도착!', text: '학생 단체가 몰려와요. 1분 동안 관람객이 세 배!', sec: 60 },
  rain: { name: '소나기', text: '비를 피해 들어온 사람들로 북적여요. 90초 동안 관람객 +50%', sec: 90 },
  reporter: { name: '기자 취재', text: '지역 신문 기자가 왔어요. 가장 멋진 유물 앞에서 사진을 찍을 거예요!' },
  lostkid: { name: '길 잃은 아이', text: '꼬마가 엄마를 잃어버렸어요. 우는 아이를 찾아 눌러 주세요!' },
  scholar: { name: '학자의 퀴즈', text: '이름난 학자가 관장님께 퀴즈를 내요. 맞히면 후원금!' },
};

// 회상 (원작 그림 재활용) — 조건: first(그 유물 첫 전시) / set(유적 세트 완성)
const FLASHBACKS = {
  prologue: { title: '보력 2년의 바다', when: { first: 'changsha_bird_bowl' } },
  palembang: { title: '팔렘방의 도공', when: { first: 'seguntang_buddha_sketch|kedukan_bukit_rubbing|indo_pacific_beads|talang_tuwo_rubbing' } },
  dive: { title: '가라앉은 배', when: { set: 'shabdiz_wreck' } },
  borobudur: { title: '돌의 배', when: { first: 'borobudur_ship_relief_sketch|java_gold_mas' } },
};
