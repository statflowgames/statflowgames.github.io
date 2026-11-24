// 종별 연기. AI의 이동 속도/판정/예고 시간은 actors.js가 소유하고, 이 파일은 자세만 정한다.
const EH = (d, blade = -35) => heroCanonical(WA({ ...P.standMon, ...d }, blade));
const ES = (label, stance, ready, hit, follow, gait = {}) => ({
  label, body:'human', stance, ready, hit, follow,
  gait:{ dur:700, amp:22, arms:5, lift:1, sway:2, ...gait },
});
const ENEMY_SIGNATURES = {
  grunt: ES('겁 많은 단검 싸움꾼',
    EH({torso:24,head:-18,uab:8,fab:-64,uaf:-26,faf:-65,thf:-28,shf:44,thb:22,shb:28},-55),
    EH({torso:2,head:-12,uab:65,fab:-90,uaf:-38,faf:-65,thf:-32,shf:52},-155),
    EH({torso:32,head:-20,uab:-105,fab:-18,uaf:12,faf:-60,thf:-40,shf:48,thb:28},-65),
    EH({torso:35,uab:-28,fab:-28,uaf:20,faf:-45,thf:-36,shf:48,rx:8},10),
    {dur:540,amp:25,arms:13,lift:1.25,sway:4}),
  spear: ES('뒤로 물러서며 어깨 위 투창',
    EH({torso:18,head:-14,uab:-18,fab:-95,uaf:-22,faf:-28},-165),
    EH({torso:-8,uab:-155,fab:-75,uaf:-64,faf:-20,head:-8},-210),
    EH({torso:22,uab:-88,fab:-12,uaf:12,faf:-40,thf:-30,shf:32},-90),
    EH({torso:28,uab:-24,fab:-18,uaf:20,faf:-32,rx:10},-30),
    {dur:620,amp:21,arms:3,sway:2}),
  shaman: ES('굽은 등과 지팡이 주술',
    EH({torso:28,head:-24,uab:-18,fab:-65,uaf:-58,faf:-72,thf:-18,shf:32},10),
    EH({torso:8,head:-18,uab:-120,fab:-42,uaf:-145,faf:-32},-5),
    EH({torso:30,uab:-82,fab:-18,uaf:-98,faf:-12,head:-18},-80),
    EH({torso:34,uab:-60,fab:-32,uaf:-68,faf:-44},-70),
    {dur:880,amp:14,arms:2,lift:.45,sway:2,drag:.7}),
  ratkin_blade: ES('낮게 파고드는 쥐족 발도',
    EH({torso:36,head:-25,uab:24,fab:-80,uaf:-72,faf:-44,thf:-42,shf:66,thb:30,shb:42},-100),
    EH({torso:22,head:-24,uab:48,fab:-112,uaf:-96,faf:-25,thf:-46,shf:72},-160),
    EH({torso:42,head:-30,uab:-115,fab:-15,uaf:18,faf:-55,thf:-50,shf:58,thb:40,shb:24,rx:10},-80),
    EH({torso:46,head:-28,uab:-12,fab:-32,uaf:38,faf:-60,thf:-45,shf:60,rx:8},20),
    {dur:440,amp:26,arms:10,lift:1.15,sway:3}),
  ratkin_xbow: ES('낮은 자세의 석궁 사냥꾼',
    EH({torso:28,head:-22,uab:-45,fab:-62,uaf:-58,faf:-65,thf:-34,shf:50,thb:24,shb:32},-90),
    EH({torso:20,uab:-65,fab:-35,uaf:-62,faf:-48},-90),
    EH({torso:24,uab:-86,fab:-12,uaf:-78,faf:-28},-90),
    EH({torso:14,uab:-66,fab:-42,uaf:-46,faf:-66,rx:-5},-90),
    {dur:570,amp:18,arms:0,lift:.7,sway:1}),
  pirate: ES('술병을 늘어뜨린 비틀거리는 해적',
    EH({torso:-6,head:9,uab:18,fab:-20,uaf:-18,faf:-62,thf:-20,shf:22,thb:30,shb:18,rr:-3},35),
    EH({torso:-24,head:10,uab:65,fab:-75,uaf:-54,faf:-50,rr:-5},-155),
    EH({torso:30,head:2,uab:-96,fab:-10,uaf:32,faf:-30,rr:4,thf:-36,shf:40},-65),
    EH({torso:38,head:12,uab:-5,fab:-20,uaf:52,faf:-42,rr:7,rx:12},35),
    {dur:860,amp:25,arms:17,lift:.8,sway:7,stagger:.3}),
  mummy: ES('굳은 무릎을 끌고 오는 미라',
    EH({torso:18,head:8,uab:-58,fab:-12,uaf:-72,faf:-12,thf:-8,shf:12,thb:10,shb:6},-35),
    EH({torso:6,head:10,uab:-145,fab:-15,uaf:-85,faf:-8},-165),
    EH({torso:30,head:8,uab:-96,fab:-8,uaf:-98,faf:-5,thf:-20,shf:24},-70),
    EH({torso:36,head:14,uab:-40,fab:-10,uaf:-80,faf:-8,rx:8},-5),
    {dur:1120,amp:12,arms:1,lift:.18,sway:1,drag:.9}),
  skeleton_archer: ES('곧게 선 해골의 절제된 활시위',
    EH({torso:0,head:-3,uab:12,fab:-60,uaf:-36,faf:-15,thf:-12,shf:14,thb:14,shb:8},40),
    EH({torso:0,uab:-74,fab:-80,uaf:-90,faf:-6},-90),
    EH({torso:5,uab:-84,fab:-15,uaf:-95,faf:-4},-90),
    EH({torso:-4,uab:-40,fab:-40,uaf:-90,faf:-6},-90),
    {dur:900,amp:17,arms:0,lift:.65,sway:.5,rigid:true}),
  snakeman: ES('몸을 감아 긴 창을 찌르는 뱀인',
    EH({torso:-4,head:-8,uab:-35,fab:-85,uaf:-68,faf:-36,thf:-28,shf:26,thb:32,shb:12},-92),
    EH({torso:-22,head:-2,uab:18,fab:-95,uaf:-48,faf:-48,thf:-32,shf:42},-105),
    EH({torso:24,head:-16,uab:-110,fab:-5,uaf:-90,faf:-12,thf:-48,shf:48,thb:38,shb:8,rx:12},-90),
    EH({torso:26,uab:-100,fab:-10,uaf:-82,faf:-18,rx:10},-88),
    {dur:760,amp:23,arms:2,lift:.45,sway:4}),
  snow_brute: ES('어깨를 흔들며 주먹을 내리치는 거한',
    EH({torso:18,head:-8,uab:-22,fab:-48,uaf:-28,faf:-58,thf:-28,shf:40,thb:28,shb:26},10),
    EH({torso:-18,head:-12,uab:-168,fab:-32,uaf:-135,faf:-45,thf:-36,shf:54},-165),
    EH({torso:38,head:8,uab:-68,fab:-12,uaf:-85,faf:-10,thf:-44,shf:52,rr:4},-35),
    EH({torso:44,head:12,uab:-25,fab:-20,uaf:-38,faf:-28,rx:10},10),
    {dur:1020,amp:24,arms:10,lift:1,sway:5}),
  dwarf_miner: ES('폭약을 감싸 쥐고 짧게 디디는 광부',
    EH({torso:16,head:-8,uab:-20,fab:-115,uaf:-48,faf:-85,thf:-24,shf:32,thb:25,shb:18},135),
    EH({torso:-16,uab:-168,fab:-48,uaf:-60,faf:-65,thf:-30,shf:42},-170),
    EH({torso:30,uab:-90,fab:-10,uaf:18,faf:-52,thf:-38,shf:42},-70),
    EH({torso:36,uab:-15,fab:-28,uaf:28,faf:-65,rx:9},5),
    {dur:610,amp:19,arms:3,lift:.8,sway:3}),
  gargoyle: ES('석상처럼 멈췄다가 할퀴는 가고일',
    EH({torso:30,head:-20,uab:-44,fab:-85,uaf:-65,faf:-80,thf:-38,shf:60,thb:30,shb:40},-80),
    EH({torso:6,head:-12,uab:40,fab:-100,uaf:-145,faf:-25,thf:-46,shf:72},-150),
    EH({torso:42,head:-25,uab:-110,fab:-12,uaf:-102,faf:-8,thf:-55,shf:62},-60),
    EH({torso:48,head:-28,uab:-10,fab:-28,uaf:-15,faf:-42,rx:10},10),
    {dur:900,amp:28,arms:2,lift:1.3,sway:1,rigid:true}),
  construct: ES('방패를 고정한 기계 병정',
    EH({torso:0,head:0,uab:-48,fab:-64,uaf:-46,faf:-75,thf:-18,shf:20,thb:22,shb:12},-90),
    EH({torso:-4,uab:-62,fab:-45,uaf:-65,faf:-42},-90),
    EH({torso:8,uab:-95,fab:-5,uaf:-76,faf:-24,thf:-28,shf:28},-90),
    EH({torso:2,uab:-72,fab:-25,uaf:-50,faf:-62,rx:-4},-90),
    {dur:960,amp:20,arms:0,lift:.85,sway:0,rigid:true}),
  harpy: ES('무릎을 접고 날개로 던지는 하피',
    EH({torso:18,head:-12,uab:24,fab:-45,uaf:18,faf:-55,thf:-40,shf:90,thb:12,shb:66},-80),
    EH({torso:-20,head:-8,uab:-160,fab:-32,uaf:-142,faf:-20,thf:-52,shf:105},-165),
    EH({torso:38,head:-20,uab:-95,fab:-8,uaf:-102,faf:-8,thf:-20,shf:65},-80),
    EH({torso:28,uab:24,fab:-28,uaf:32,faf:-40,thf:-40,shf:90},10),
    {dur:580,amp:0,arms:3,sway:4,fly:true}),
  cultist: ES('구슬을 감싼 정적인 교단 의식',
    EH({torso:0,head:12,uab:-42,fab:-82,uaf:-68,faf:-86,thf:-10,shf:12,thb:12,shb:8},-30),
    EH({torso:-12,head:-18,uab:-135,fab:-40,uaf:-150,faf:-28},-120),
    EH({torso:16,head:-6,uab:-85,fab:-15,uaf:-100,faf:-8},-80),
    EH({torso:10,uab:-64,fab:-44,uaf:-82,faf:-30},-60),
    {dur:1100,amp:13,arms:0,lift:.35,sway:1}),
  shadow_knight: ES('방패 뒤에서 어깨를 실어 베는 기사',
    EH({torso:8,head:-6,uab:-25,fab:-90,uaf:-48,faf:-72,thf:-30,shf:34,thb:30,shb:16},-140),
    EH({torso:-14,head:-8,uab:-165,fab:-40,uaf:-55,faf:-70,thf:-36,shf:50,bodyTwist:-1},-190),
    EH({torso:28,head:-10,uab:-110,fab:-12,uaf:-35,faf:-88,thf:-44,shf:48,thb:36,rx:10,bodyTwist:1},-60),
    EH({torso:34,uab:0,fab:-28,uaf:-45,faf:-78,thf:-40,shf:46,bodyTwist:2},20),
    {dur:970,amp:22,arms:2,lift:.75,sway:1}),
  imp: ES('팔다리를 접었다 펼치는 짓궂은 임프',
    EH({torso:28,head:-18,uab:-68,fab:-110,uaf:-75,faf:-100,thf:-65,shf:122,thb:26,shb:92},-80),
    EH({torso:-12,uab:-158,fab:-45,uaf:-150,faf:-40,thf:-80,shf:132},-130),
    EH({torso:42,uab:-110,fab:-5,uaf:-108,faf:-5,thf:-30,shf:96},-70),
    EH({torso:32,uab:35,fab:-62,uaf:28,faf:-60},20),
    {dur:420,amp:0,arms:9,sway:7,fly:true}),
  shade_hero: ES('영웅의 검술을 흉내 내는 그림자',
    EH({torso:10,head:-5,uab:-28,fab:-85,uaf:-55,faf:-65,thf:-32,shf:36,thb:30,shb:18},-130),
    EH({torso:-12,uab:-180,fab:-30,uaf:-35,faf:-85,bodyTwist:-2},-200),
    EH({torso:30,uab:-112,fab:-15,uaf:20,faf:-70,thf:-44,shf:46,rx:10,bodyTwist:2},-55),
    EH({torso:34,uab:12,fab:-32,uaf:30,faf:-60,bodyTwist:3},35),
    {dur:620,amp:28,arms:3,lift:1,sway:2}),
  toothcrusher_rider: ES('멧돼지에서 내린 대장의 도끼질',
    EH({torso:22,head:-12,uab:-20,fab:-118,uaf:-36,faf:-50,thf:-32,shf:44,thb:30,shb:24},125),
    EH({torso:-20,uab:-192,fab:-30,uaf:-60,faf:-44,thf:-38,shf:56},-200),
    EH({torso:38,uab:-105,fab:-8,uaf:35,faf:-50,thf:-48,shf:56,rx:10},-60),
    EH({torso:44,uab:-5,fab:-20,uaf:50,faf:-44,rr:5},20),
    {dur:540,amp:28,arms:10,lift:1.1,sway:4}),
  barkhaul: ES('뿌리 박은 거인의 몽둥이 강타',
    EH({torso:18,head:-8,uab:-12,fab:-80,uaf:-24,faf:-52,thf:-26,shf:36,thb:28,shb:22},100),
    EH({torso:-20,head:-16,uab:-195,fab:-35,uaf:-145,faf:-40,thf:-36,shf:58,rr:-3},-200),
    EH({torso:42,head:10,uab:-85,fab:-10,uaf:-65,faf:-15,thf:-48,shf:60,thb:34,rx:12,sq:-.05},-40),
    EH({torso:48,head:14,uab:-30,fab:-18,uaf:-35,faf:-28,thf:-42,shf:54,rx:12},10),
    {dur:1240,amp:21,arms:7,lift:1,sway:4}),
  captain_mog: ES('갈고리로 균형 잡고 넓게 베는 선장',
    EH({torso:-3,head:4,uab:5,fab:-88,uaf:-48,faf:-95,thf:-24,shf:24,thb:34,shb:14},-135),
    EH({torso:-24,uab:-160,fab:-55,uaf:-92,faf:-35,rr:-4,thf:-34,shf:44},-205),
    EH({torso:30,uab:-118,fab:-10,uaf:16,faf:-75,thf:-44,shf:48,thb:38,rx:12,bodyTwist:2},-70),
    EH({torso:40,uab:8,fab:-30,uaf:42,faf:-62,rr:5,bodyTwist:3},30),
    {dur:940,amp:28,arms:7,lift:.8,sway:5}),
  sehera: ES('왕홀을 세운 여왕의 지휘',
    EH({torso:-3,head:-4,uab:-24,fab:-62,uaf:-52,faf:-68,thf:-12,shf:12,thb:14,shb:6},5),
    EH({torso:-16,head:-16,uab:-150,fab:-24,uaf:-130,faf:-35},-10),
    EH({torso:18,head:-6,uab:-88,fab:-12,uaf:-105,faf:-6,thf:-24,shf:24,rx:8},-70),
    EH({torso:12,uab:-66,fab:-25,uaf:-85,faf:-20},-65),
    {dur:1250,amp:12,arms:0,lift:.25,sway:1}),
  golem7: ES('코어를 고정한 중장갑 골렘',
    EH({torso:4,head:0,uab:-40,fab:-65,uaf:-40,faf:-65,thf:-24,shf:28,thb:26,shb:16},-90),
    EH({torso:-8,head:0,uab:-160,fab:-35,uaf:-160,faf:-35,thf:-34,shf:46},-160),
    EH({torso:28,head:0,uab:-90,fab:-5,uaf:-90,faf:-5,thf:-40,shf:48,sq:-.025},-70),
    EH({torso:32,head:2,uab:-40,fab:-20,uaf:-40,faf:-20,thf:-38,shf:46},-30),
    {dur:1380,amp:22,arms:0,lift:1,sway:0,rigid:true}),
  orvex: ES('지팡이와 여섯 달을 지휘하는 현자',
    EH({torso:4,head:-5,uab:-28,fab:-56,uaf:-62,faf:-75,thf:-12,shf:14,thb:14,shb:8},5),
    EH({torso:-12,head:-18,uab:-164,fab:-20,uaf:-135,faf:-30},-10),
    EH({torso:20,head:-6,uab:-96,fab:-12,uaf:-108,faf:-5,thf:-24,shf:28,rx:8},-75),
    EH({torso:12,uab:-76,fab:-28,uaf:-90,faf:-20},-65),
    {dur:1060,amp:14,arms:0,lift:.3,sway:1}),
  orvex_eclipse: ES('몸을 비틀어 흑월을 움켜쥐는 현자',
    EH({torso:22,head:-16,uab:-30,fab:-92,uaf:-85,faf:-84,thf:-28,shf:36,thb:22,shb:20},-10),
    EH({torso:-22,head:-28,uab:-186,fab:-28,uaf:-165,faf:-24,bodyTwist:-2},-165),
    EH({torso:38,head:-18,uab:-108,fab:-8,uaf:-115,faf:-5,thf:-44,shf:50,rx:12,bodyTwist:2},-65),
    EH({torso:42,head:-14,uab:8,fab:-45,uaf:20,faf:-72,bodyTwist:3},25),
    {dur:780,amp:24,arms:3,lift:.65,sway:3}),
  void_shadow: ES('웅크림과 열린 손을 오가는 공허',
    EH({torso:24,head:-20,uab:-50,fab:-100,uaf:-82,faf:-70,thf:-38,shf:58,thb:26,shb:38},-125),
    EH({torso:-18,head:-24,uab:-180,fab:-28,uaf:-170,faf:-24,bodyTwist:-2},-195),
    EH({torso:40,head:-26,uab:-115,fab:-6,uaf:-112,faf:-6,thf:-48,shf:56,rx:12,bodyTwist:2},-65),
    EH({torso:46,uab:20,fab:-38,uaf:30,faf:-52,bodyTwist:3},35),
    {dur:560,amp:31,arms:4,lift:1.2,sway:2}),
  wolf:{label:'머리를 낮춘 사냥 늑대',body:'quad',dur:620,amp:24,bias:{head:10,torso:3},ready:QD({head:22,torso:6,thf:30,shf:-38,thb:-30,shb:48,sq:-.07}),hit:QD({head:-15,torso:-5,thf:-72,uaf:-65,thb:50,uab:45,rr:-10,sq:.05}),follow:QD({head:4,thf:-18,thb:20})},
  frostwolf:{label:'등을 세우고 숨결을 모으는 서리늑대',body:'quad',dur:760,amp:20,bias:{head:-8,torso:-3},ready:QD({head:-25,torso:-8,thf:18,uaf:14,thb:-26,shb:42,rr:-4}),hit:QD({head:8,torso:8,thf:-48,uaf:-42,thb:38,uab:34,rr:5,sq:.03}),follow:QD({head:12,torso:5,thf:-18,thb:16})},
  hound:{label:'길게 웅크렸다 튀는 심연 사냥개',body:'quad',dur:470,amp:33,bias:{head:18,torso:6},ready:QD({head:28,torso:10,thf:42,shf:-48,thb:-42,shb:58,rr:5,sq:-.1}),hit:QD({head:-20,torso:-10,thf:-86,uaf:-80,thb:68,uab:62,rr:-15,sq:.08}),follow:QD({head:-8,torso:-2,thf:-30,thb:28})},
  toothcrusher:{label:'멧돼지와 기수가 함께 싣는 돌진',body:'quad',dur:820,amp:25,bias:{head:8,torso:2,r_torso:4,r_arm:-10,r_fore:0},ready:QD({head:22,thf:30,shf:-40,thb:-30,shb:48,r_torso:-18,r_arm:-110,r_fore:20,r_wpn:-40}),hit:QD({head:-12,thf:-65,uaf:-60,thb:50,uab:45,rr:-6,r_torso:20,r_arm:-25,r_fore:30,r_wpn:30}),follow:QD({head:8,thf:-15,thb:22,r_torso:25,r_arm:10,r_fore:20})},
  slime:{label:'납작하게 모였다 튀는 독점액',body:'blob',dur:470,bias:{},ready:{sq:-.17,rr:-10,head:8},hit:{sq:.17,rr:16,head:-8},follow:{sq:-.08,rr:5,head:3}},
  ice_spirit:{label:'흔들림 없이 응축하는 얼음 핵',body:'crystal',dur:1100,bias:{},ready:{rr:-12,sq:-.015},hit:{rr:14,sq:.025},follow:{rr:4,sq:0}},
  leech:{label:'마디를 수축해 달라붙는 거머리',body:'leech',dur:760,bias:{},ready:{torso:22,tail:32,head:18,rr:8,sq:-.04},hit:{torso:-18,tail:-24,head:-12,rr:-12,sq:.06},follow:{torso:-8,tail:15,head:8,rr:2}},
  gloob:{label:'왕관과 잔해가 늦게 출렁이는 점액 군주',body:'blob',dur:1300,bias:{in0:-4},ready:{sq:-.18,rr:-12,head:8,in0:-18,in1:15,in2:-12},hit:{sq:.16,rr:18,head:-12,in0:24,in1:-22,in2:18},follow:{sq:-.13,rr:8,head:5,in0:-16,in1:12,in2:-8}},
  scorpion:{label:'꼬리를 말아 한 점을 찌르는 전갈',body:'scorp',dur:480,amp:19,bias:{},ready:SC({t0:28,t1:22,t2:10,st:35,uaf:-35,faf:25,hf:-25}),hit:SC({t0:90,t1:4,t2:-10,st:-40,uaf:-50,faf:-12,hf:12,rr:-4}),follow:SC({t0:40,t1:30,t2:15,st:-35,uaf:-20})},
  twinsting:{label:'집게로 버티며 두 침을 교차하는 쌍침',body:'scorp',dur:740,amp:23,bias:{t0:8,st:-12,st1:12},ready:SC({t0:34,t1:24,t2:18,st:48,st1:-20,uaf:-42,faf:32,hf:-32}),hit:SC({t0:91,t1:4,t2:-10,t3:-30,st:-40,st1:5,uaf:-64,faf:-18,hf:18,rr:-5}),follow:SC({t0:40,t1:30,t2:15,st:15,st1:-55,uaf:-46,faf:-12,hf:12})},
  frost_wyvern:{label:'날개로 균형을 잡는 가벼운 와이번',body:'wyrm',dur:700,amp:13,bias:{neck:-8,head:-8},ready:WY({neck:-38,neck1:-22,head:-24,jaw:10,wf:-24,wb:-20,thb:-18,shb:30}),hit:WY({neck:30,neck1:18,head:6,jaw:35,wf:18,wb:12,rr:5}),follow:WY({neck:20,head:10,jaw:26,wf:8,wb:4})},
  azmal:{label:'발톱을 박고 목 전체로 미는 고대룡',body:'wyrm',dur:1450,amp:23,bias:{neck:8,neck1:-4,neck2:6,head:-5,wf:18,wb:14},ready:WY({neck:-32,neck1:-24,neck2:-16,head:-22,jaw:12,thf:28,shf:20,thb:-24,shb:40,wf:28,wb:24,tl0:15,tl1:10}),hit:WY({neck:30,neck1:26,neck2:18,head:10,jaw:35,thf:-38,shf:8,thb:32,rr:7,wf:12,wb:8,tl0:-12,tl1:-8}),follow:WY({neck:26,neck1:20,neck2:12,head:8,jaw:28,thf:-24,thb:26,wf:16,wb:12})},
  hrimgar:{label:'얼음 바닥에 버티는 거인의 양주먹',body:'giant',dur:1800,bias:{},ready:GI({torso:-20,head:-14,uab:-178,fab:-24,uaf:-168,faf:-32}),hit:GI({torso:38,head:14,uab:-55,fab:-10,uaf:-46,faf:-8,sq:-.05}),follow:GI({torso:44,head:18,uab:-35,fab:-18,uaf:-32,faf:-20,sq:-.025})},
};
// 칼은 칼끝 각도, 지팡이/왕홀은 머리 장식 각도로 잡는다. 원본 리그의 ir 차이도 포함한다.
for(const [id,offset]of Object.entries({shaman:-90,sehera:-180,orvex:-180,orvex_eclipse:-180})) {
  const p=ENEMY_SIGNATURES[id];p.staffOffset=offset;
  for(const key of ['stance','ready','hit','follow'])p[key]={...p[key],hb:p[key].hb+offset};
}

function enemySignatureBase(p) {
  if(p.body==='human')return p.stance;
  const base={quad:QS,scorp:SCS,wyrm:WYS,giant:GS}[p.body]||{};
  return {...base,...p.bias};
}
function enemySignatureGait(p, run) {
  const base=enemySignatureBase(p),g=p.gait, dur=(g?.dur||p.dur)*(run ? .76 : 1);
  const amp=(g?.amp??p.amp??0)*(run?1.22:1);
  return {loop:true,dur, ...(amp?{amp}:{}), at(t){
    const ph=t/dur*Math.PI*2,s=Math.sin(ph),c=Math.cos(ph),sw=v=>Math.max(0,v);
    if(p.body==='human') {
      if(g.fly)return add(base,{torso:s*g.sway,head:-s*2,uab:c*g.arms,uaf:-c*g.arms,thf:s*5,shf:-s*8,thb:-s*4,shb:s*6});
      // 장갑병은 각진 디딤, 미라는 한 다리를 끌며 팔은 뻣뻣하게 유지한다.
      const wave=g.rigid?Math.tanh(s*2)/Math.tanh(2):s,back=Math.sin(ph+(g.drag||0));
      return add(base,{thf:-wave*amp,thb:back*amp,
        shf:sw(c)*amp*g.lift,shb:sw(-Math.cos(ph+(g.drag||0)))*amp*g.lift,
        uab:s*g.arms,uaf:-s*g.arms,torso:c*g.sway,head:-c*g.sway*.6,
        rr:Math.sin(ph+(g.stagger||0))*g.sway*.35,bodyTwist:s*(g.sway*.2),sq:-Math.abs(c)*(g.rigid?.012:.018)});
    }
    if(p.body==='quad')return add(CLIPS[run?'q_run':'q_walk'].at(t*(run?460:640)/dur),{...p.bias,head:(p.bias.head||0)+c*(p===ENEMY_SIGNATURES.hound?5:2)});
    if(p.body==='scorp')return {...base,...scLegs(ph,amp),t0:(base.t0||0)+s*3,uaf:-8+c*5,st:(base.st||0)+c*4,st1:(base.st1||0)-c*4};
    if(p.body==='wyrm')return add(CLIPS.wy_walk.at(t*900/dur),{...p.bias,neck:(p.bias.neck||0)+c*3,head:(p.bias.head||0)-c*3});
    if(p.body==='giant')return add(base,{torso:s*4,head:-s*3,uab:s*7,uaf:-s*5,sq:Math.abs(c)*.015});
    if(p.body==='leech')return {torso:s*18,tail:Math.sin(ph-1)*26,head:Math.sin(ph+.8)*8,rr:c*4,sq:0};
    if(p.body==='crystal')return {rr:s*3,head:0,sq:0};
    const heavy=p===ENEMY_SIGNATURES.gloob;
    return {...base,sq:s*(heavy?.14:.11),rr:s*(heavy?5:8),head:-s*4,in0:Math.sin(ph-.8)*9,in1:Math.sin(ph-1.2)*12,in2:Math.sin(ph-1.6)*10};
  }};
}
function enemySignatureIdle(p) {
  const base=enemySignatureBase(p),dur=p.body==='human'?Math.max(1100,p.gait.dur*2):p.dur*2;
  return {loop:true,dur,at(t){const s=Math.sin(t/dur*Math.PI*2);
    if(p.body==='human')return add(base,{torso:s*(p.gait.rigid?.35:1.2),head:-s, uaf:s*(p.gait.fly?3:1),sq:s*.006});
    if(p.body==='blob')return add(base,{sq:s*(p===ENEMY_SIGNATURES.gloob?.055:.04),rr:s*2,in0:-s*3,in1:s*4});
    if(p.body==='leech')return {torso:s*10,tail:Math.sin(t/dur*Math.PI*2-1)*18,head:-s*4};
    if(p.body==='crystal')return {rr:s*1.5,sq:0};
    return add(base,{head:s*2,torso:s,sq:s*.006});
  }};
}
function enemySignatureKeys(keys) {
  // 손목의 같은 방향에 대한 ±360 표기를 맞춘다. 어깨의 큰 회전은 보존한다.
  let prior=null;
  return keyClip(keys.map(([t,p,e])=>{p={...p};if(prior)for(const n of ['hb','hf'])if(n in p&&n in prior)p[n]=prior[n]+((p[n]-prior[n]+540)%360+360)%360-180;prior=p;return [t,p,e];}),false,false);
}
function installEnemySignature(actor) {
  const p=ENEMY_SIGNATURES[actor.id];if(!p)return;
  const d=actor.rig.def;
  // 해당 파츠가 없는 대역 리그에는 맞지 않는 관절을 적용하지 않는다.
  const fits=p.body==='human'?actor.enemyHumanoid:p.body==='quad'?d.kindQuad:p.body==='wyrm'?d.kindWyrm:p.body==='scorp'?d.kindScorp:p.body==='giant'?!!actor.rig.map.hb&&!actor.enemyHumanoid:p.body==='leech'?!!actor.rig.map.tail:d.kindBlob;
  if(!fits)return;
  actor.enemySignature=p;actor.baseStand=enemySignatureBase(p);actor.rig.measure(actor.baseStand);
  const prefix='signature_'+actor.id+'_',base=actor.baseStand;
  const register=(action,clip)=>{CLIPS[prefix+action]=clip;actor.enemyActions[action]=prefix+action;};
  register('m_idle',enemySignatureIdle(p));
  register('m_walk',enemySignatureGait(p,false));register('m_run',enemySignatureGait(p,true));
  register('m_windup',enemySignatureKeys([[0,base],[320,p.ready,'out'],[420,p.ready]]));
  register('m_stab',enemySignatureKeys([[0,p.ready],[50,p.hit,'in'],[155,p.follow,'out'],[290,p.follow],[520,base,'io']]));
  if(actor.def.boss) {
    const wind=enemySignatureKeys([[0,base],[680,p.ready,'out'],[900,p.ready]]);
    register('b_smashup',wind);
    register('b_smash',enemySignatureKeys([[0,p.ready],[110,p.hit,'in'],[320,p.follow,'out'],[720,p.follow],[1100,base,'io']]));
  }
  if(p.body==='human') {
    if(!actor.enemyLauncher) {
      register('m_throwup',enemySignatureKeys([[0,base],[380,p.ready,'out'],[520,p.ready]]));
      register('m_throw',enemySignatureKeys([[0,p.ready],[90,p.hit,'in'],[200,p.follow,'out'],[370,p.follow],[600,base,'io']]));
    } else {
      // 같은 조준도 쥐족은 낮게, 해골은 곧게 선다. 활 시위 IK는 enemy-motion.js가 수행한다.
      const bow=!!actor.rig.map.fitem, aim={...enemyAimPose(bow),...Object.fromEntries(LEGS.map(n=>[n,base[n]||0])),torso:base.torso,head:base.head};
      aim.hf=-(aim.torso+aim.uaf+aim.faf);if(!bow)aim.hb=-90-aim.torso-aim.uab-aim.fab;
      const recoil={...aim,torso:aim.torso-6,rx:-5,uab:aim.uab+10,bowRelease:1};
      register('m_throwup',enemySignatureKeys([[0,base],[240,aim,'out'],[520,aim]]));
      register('m_throw',enemySignatureKeys([[0,aim],[90,aim],[125,recoil,'out'],[300,recoil],[600,base,'io']]));
    }
  }
  // 공격 중 꼬리/날개의 자동 흔들림이 명확한 키 자세를 덮지 않도록 억제한다.
  if(actor.id==='gargoyle')for(const q of d.procs||[])if(q.n==='wing'){q.amp=5;q.spd=.004;}
  if(actor.id==='azmal')for(const q of d.procs||[])if(['wf','wb'].includes(q.n)){q.amp=6;q.spd=.003;}
}

function enemyCastSignature(actor) {
  const p=actor.enemySignature,base=enemySignatureBase(p),id=actor.id;
  const magic=(d,a)=>{const out=EH(d,a);out.hb+=p.staffOffset||0;return out;};
  if(p.body!=='human')return p.ready;
  if(id==='construct'||id==='golem7')return magic({torso:-4,head:0,uab:-72,fab:-42,uaf:-72,faf:-42,thf:-30,shf:38,thb:30,shb:18},-90);
  if(id==='sehera')return magic({...base,torso:-8,head:-12,uab:-118,fab:-20,uaf:-150,faf:-20},-12);
  if(id==='orvex')return magic({...base,torso:-10,head:-16,uab:-160,fab:-18,uaf:-75,faf:-60},-6);
  if(id==='cultist')return magic({...base,torso:-8,head:12,uab:-120,fab:-60,uaf:-118,faf:-62},-130);
  if(id==='shaman')return magic({...base,torso:16,head:-18,uab:-120,fab:-35,uaf:-160,faf:-22},-10);
  return p.ready;
}
function enemySpecialPose(actor,p) {
  const profile=actor.enemySignature;if(!profile)return p;
  const id=actor.id,base=enemySignatureBase(profile),st=actor.st;
  const cache=actor.enemySignatureClips||(actor.enemySignatureClips={});
  const pose=(keys,t=st)=>{
    const key=actor.state+'_'+(actor.sp?.type||'')+'_'+!!actor.raged+'_'+keys.map(k=>k[0]).join('_');
    return (cache[key]||(cache[key]=enemySignatureKeys(keys))).at(t);
  };
  if(actor.state==='smashup')return pose([[0,base],[680,profile.ready,'out'],[900,profile.ready]],st*900/(actor.raged?650:900));
  if(actor.state==='cast') {
    const gather=enemyCastSignature(actor), release=profile.hit;
    return pose([[0,base],[400,gather,'out'],[660,gather],[750,release,'in'],[900,profile.follow],[1100,base,'io']]);
  }
  if(actor.state==='rock')return pose([[0,base],[430,profile.ready,'out'],[580,profile.ready],[650,profile.hit,'in'],[800,profile.follow],[1100,base,'io']]);
  if(actor.state==='roots') {
    const planted={...profile.follow,thf:-12,shf:18,thb:24,shb:16};
    return pose([[0,base],[400,profile.ready,'out'],[520,planted,'in'],[850,planted],[1000,profile.hit,'in'],[1150,profile.follow],[1300,base,'io']]);
  }
  if(actor.state==='roar') {
    const up=profile.body==='human'?{...profile.ready,head:-24,uaf:-135,faf:-40}:profile.ready;
    return add(mix(base,up,Math.min(1,st/260)),{head:Math.sin(st/100)*2});
  }
  if(actor.state!=='sp')return p;
  const sp=actor.sp,type=sp.type,rage=actor.raged;
  if(type==='charge') {
    const wind=rage?600:850;
    if(st<wind)return pose([[0,base],[wind*.7,profile.ready,'out'],[wind,profile.ready]]);
    if(id==='toothcrusher'||(typeof MONDEF!=='undefined'&&MONDEF[id]&&MONDEF[id].like==='toothcrusher'))return {...p,head:12,torso:4,r_torso:30,r_head:-14,r_arm:-65,r_fore:30,r_wpn:-30};
    if(profile.body==='wyrm')return {...p,neck:24,neck1:12,neck2:8,head:4,jaw:22,wf:22,wb:18,rr:3};
    return {...p,torso:profile.body==='human'?30:p.torso,head:-12,uab:profile.body==='human'?-35:p.uab,uaf:profile.body==='human'?-75:p.uaf};
  }
  if(type==='breath') {
    const wind=rage?650:900;
    const breath=profile.body==='wyrm'?{...profile.hit,neck:id==='azmal'?30:20,neck1:id==='azmal'?20:10,neck2:id==='azmal'?14:0,head:6,jaw:35,wf:id==='azmal'?22:-8,wb:id==='azmal'?18:-5}:profile.hit;
    if(st<wind)return pose([[0,base],[wind*.55,profile.ready,'out'],[wind-100,profile.ready],[wind,breath,'in']]);
    const pulse=Math.max(0,1-((st-wind)%180)/180);
    return add(pose([[0,breath],[1000,breath],[1300,base,'io']],st-wind),{torso:-pulse*2,head:-pulse*2});
  }
  if(type==='beam'||type==='orbs'||type==='meteor') {
    const gather=enemyCastSignature(actor),fire=type==='beam'?(rage?700:1000):type==='orbs'?500:900;
    let out={...profile.hit};
    if(id==='golem7')out={...profile.hit,torso:8,head:0,uab:-88,fab:-5,uaf:-88,faf:-5};
    if(type==='meteor')out={...gather,torso:18,head:-4,uaf:-100,faf:-10};
    const hasFired=actor.castPulseAt!==undefined;
    let k=hasFired?Math.max(0,1-(st-actor.castPulseAt)/260):0;
    if(type==='orbs'&&sp.n<(rage?3:2))k=Math.max(k,Math.max(0,Math.min(1,(st-(500+sp.n*450-90))/90)));
    return st<=fire?pose([[0,base],[fire*.55,gather,'out'],[fire-90,gather],[fire,out,'in']]):mix(gather,out,k);
  }
  if(type==='hook') {
    const pull={...base,torso:-18,uaf:-45,faf:-120,thf:-36,shf:48,rx:-10};
    const reach={...base,torso:26,uaf:-115,faf:-5,uab:18,fab:-85,thf:-44,shf:48,rx:10};
    return pose([[0,base],[480,pull,'out'],[680,pull],[710,reach,'in'],[810,reach],[1000,pull,'in'],[1100,base,'io']]);
  }
  if(type==='cannon') {
    const brace={...base,torso:10,uaf:-100,faf:-15,uab:-35,fab:-85,thf:-40,shf:45,thb:38,shb:18};
    const shot=sp.n?400+(sp.n-1)*280:0,k=shot?Math.max(0,1-(st-shot)/170):0;
    return add(mix(base,brace,Math.min(1,st/300)),{torso:-k*12,rr:-k*3,rx:-k*12,cannon:-k*8,coat_tail:k*10});
  }
  if(type==='burrow') {
    const dig={...profile.ready,...scLegs(1,35),uaf:-55,t0:38,t1:30,st:40,st1:-20,sq:-.08};
    if(st<1300)return pose([[0,base],[400,dig,'in'],[1300,dig]]);
    return pose([[0,profile.hit],[200,profile.follow,'out'],[650,profile.follow],[900,base,'io']],st-1300);
  }
  if(type==='teleport') {
    const fold={...base,torso:28,head:20,uab:-75,fab:-125,uaf:-80,faf:-118,thf:-40,shf:60};
    const open={...profile.ready,uaf:-150,faf:-18,head:-18};
    return pose([[0,base],[300,fold,'in'],[350,fold],[440,open,'out'],[600,profile.ready]]);
  }
  return p;
}
function enemyProceduralWeight(actor,name) {
  if(!actor.enemySignature)return 1;
  if(['down','dying','stagger'].includes(actor.state)||actor.dead)return 0;
  if(['windup','stab','smashup','smash','rock','roots','sp'].includes(actor.state)) {
    if(name==='r_arm'||/^t[0-3]$|^st\d?$/.test(name))return 0;
    if(['wf','wb','wing','wingi'].includes(name))return .35;
    if(name==='tail'||name==='tail_0')return .35;
  }
  return 1;
}
