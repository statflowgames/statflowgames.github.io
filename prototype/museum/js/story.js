// 이야기: 서장(튜토리얼) · 회상 · 등급 축하
'use strict';

const Story = (() => {
  const waiters = {};
  let chain = Promise.resolve(), depth = 0;
  const S = {};
  S.emit = (name, data) => { const w = waiters[name]; if (w) { delete waiters[name]; w(data); } };
  S.waitFor = name => new Promise(r => { waiters[name] = r; });
  S.run = fn => { depth++; chain = chain.then(async () => { try { await fn(); } catch (e) { console.error(e); } finally { depth--; Talk.end(); } }); return chain; };
  Object.defineProperty(S, 'busy', { get: () => depth > 0 });
  Object.defineProperty(S, 'tutorial', { get: () => !!G && G.story < 1 });

  // ---------- 서장 ----------
  const STEPS = [
    async function intro() {
      Talk.bg('bg/cg_open_dive', true);
      await Talk.n('1998년, 동남아의 바다 밑.');
      await Talk.n('잠수부의 불빛 아래, 그릇 수만 점이 천 년 넘게 잠들어 있었다.');
      Talk.bg('bg/cg_open_bowl', true);
      await Talk.n('그중 한 그릇 바닥에는 날짜가 적혀 있었다. 보력 2년 — 서기 826년.');
      await Talk.title('그리고 지금', '몬순 해양 박물관');
      Talk.bg('bg/ext_museum_1', true);
      await Talk.n('항구 끝, 칠이 벗겨진 작은 건물. 할머니가 평생 지킨 박물관이다.');
      Talk.bg('room/room_lobby');
      Talk.stand([['aisha', 'c']]);
      await Talk.say('aisha', 'smile', '어서 오세요. 새 관장님이시죠? 저는 수석 큐레이터 아이샤예요.');
      await Talk.say('aisha', null, '어떤 분이 오실지 몰라서요. 관장님은…');
      G.dir = (await Talk.choice(['🙋‍♂️ 남자 관장이에요', '🙋‍♀️ 여자 관장이에요'])) ? 'f' : 'm';
      Talk.stand([['me', 'l'], ['aisha', 'r']]);
      G.name = await Talk.input('관장님 이름을 알려 주세요', '관장');
      await Talk.say('aisha', 'worried', '{name} 관장님. 솔직히 말할게요. 이번 달 안에 관람객이 오지 않으면, 이 박물관은 문을 닫아요.');
      await Talk.say('me', 'worried', '…할머니가 평생 지키신 곳인데.');
      await Talk.say('aisha', null, '그래서 보여 드릴 게 있어요. 지하 수장고에 1998년 바다에서 건진 상자가 있어요. 돈이 없어 한 번도 제대로 열지 못했죠.');
      Talk.end();
      G.crate = true;
    },
    async function crate() {
      Museum.scrollTo('base');
      await wait(700);
      pointAt('.room.storage', '수장고를 눌러 보세요');
      await S.waitFor('crateDone');
      UI.unpoint();
      Talk.bg('bg/cg_m_storage', true);
      await Talk.say('aisha', 'surprised', '새 그림 장사요 그릇이에요! 당나라 후난에서 구워 바다 건너로 팔던 그릇이죠.');
      await Talk.say('aisha', 'thinking', '그런데 관장님, 바닥을 보세요. …작은 표식이 새겨져 있어요. 다른 그릇엔 없는 거예요.');
      await Talk.say('me', 'thinking', '누가, 왜 이걸 새겼을까?');
      Talk.bg('room/room_conservation');
      Talk.stand([['kenji', 'c']]);
      await Talk.say('kenji', 'smile', '안녕하세요, 보존과학자 켄지예요. 소금기는 1998년에 이미 뺐어요. 깨진 조각만 맞추면 돼요.');
      Talk.end();
    },
    async function restore() {
      Museum.scrollTo('base');
      await wait(600);
      pointAt('.room.lab', '보존처리실에서 그릇을 고쳐요');
      await S.waitFor('restored');
      UI.unpoint();
    },
    async function placeIt() {
      if (G.relics.changsha_bird_bowl && G.relics.changsha_bird_bowl.st === 'ready' && !Store.placing) Store.startPlace('changsha_bird_bowl');
      Museum.scrollTo('lobby');
      await wait(700);
      pointAt('[data-slot="L0"]', '로비 한가운데 「오늘의 보물」 자리에!');
      await S.waitFor('placed');
      UI.unpoint();
      await wait(400);
      await S.flash('prologue');
    },
    async function firstVisitors() {
      Talk.bg('room/room_lobby');
      Talk.stand([['aisha', 'c']]);
      await Talk.say('aisha', 'moved', '…이 그릇이 그 배에 실려 있었다니. 관장님, 문을 열어요. 오늘부터 다시!');
      Talk.end();
      Museum.scrollTo('lobby');
      for (let i = 0; i < 3; i++) setTimeout(() => Visitors.spawn({ group: 'seasia', type: [0, 1, 3][i] }), i * 900);
      await S.waitFor('heart');
      await wait(1200);
      Talk.bg('room/room_lobby');
      Talk.stand([['aisha', 'c']]);
      await Talk.say('aisha', 'smile', '봤어요? 하트! 첫 관람객이에요. 관람객이 감동하면 명성이 오르고, 가끔 후원 동전을 떨어뜨려요. 동전은 눌러서 주워요!');
      Talk.stand([['aisha', 'l'], ['maya', 'r']]);
      await Talk.say('maya', 'smile', '안녕하세요, 잠수 팀장 마야예요. 남해 바다라면 제가 제일 잘 알아요.');
      Talk.stand([]);
      Talk.bg('bg/cg_m_photo', true);
      await Talk.say('maya', 'moved', '이 사진 보세요. 저희 할아버지예요. 1998년에 그 배를 처음 본 어부였거든요.');
      Talk.bg('room/room_lobby');
      Talk.stand([['maya', 'c']]);
      await Talk.say('maya', 'proud', '유물이 그릇 하나뿐이면 심심하잖아요. 원정대를 꾸려서 다른 유적도 조사해 봐요!');
      Talk.end();
    },
    async function firstExp() {
      pointAt('.tabs .tab:nth-child(1)', '원정을 눌러 보세요');
      await S.waitFor('expSent');
      UI.unpoint();
      UI.closePanel();
    },
    async function opening() {
      Talk.bg('bg/cg_m_opening', true);
      await Talk.say('aisha', 'smile', '원정대가 돌아오는 동안 개관식을 해요. 관장님, 한 말씀!');
      await Talk.say('me', 'proud', '할머니, 보고 계세요? 몬순 해양 박물관, 오늘 다시 문을 엽니다!');
      await Talk.title('★ 1성', '몬순 해양 박물관, 다시 문을 엽니다');
      Talk.end();
      G.story = 1; G.rank = 1;
      SFX.play('fanfare'); UI.confetti(90);
      Museum.render(); HUD.update(true);
      UI.banner('★ 1성 · 남해관 개관!', '진열장 6칸이 열렸어요');
      await wait(1500);
      Museum.scrollTo('nanhaiA');
      await wait(900);
      Talk.bg('room/hall_nanhai');
      Talk.stand([['aisha', 'c']]);
      await Talk.say('aisha', 'proud', '이제부터가 진짜예요. 원정으로 유물을 찾고, 보존처리하고, 남해관을 채워요. 같은 유적 유물을 나란히 놓으면 「이야기 잇기」 보너스!');
      await Talk.say('aisha', null, '머리 위에 「!」가 뜬 관람객은 소원이 있어요. 들어주면 큰 보상이 있고요. 오른쪽 위 🎯에는 오늘의 목표가 있어요.');
      await Talk.say('aisha', null, '목표는 ★★ 2성 — 「동네의 자랑」! 명성 150, 유물 10점 전시, 유적 세트 2개예요.');
      Talk.end();
    },
  ];

  function pointAt(sel, text) {
    const d = document.querySelector(sel);
    if (!d) return;
    const r = d.getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect();
    UI.point((r.left - s.left) / UI.scale + r.width / UI.scale / 2 - 20, (r.top - s.top) / UI.scale + r.height / UI.scale / 2 - 10, text);
  }

  S.prologue = () => S.run(async () => {
    G.tut = G.tut || 0;
    while (G.tut < STEPS.length) {
      await STEPS[G.tut]();
      G.tut++; State.save();
    }
  });

  S.openCrate = async () => {
    G.crate = false;
    await Expedition.reveal('changsha_bird_bowl', { skin: 'straw', title: '1998년 상자', note: '1998년 바다에서 건진 뒤 처음 열어 보는 상자예요.' });
    State.save();
    S.emit('crateDone');
  };

  // 전시 뒤: 회상 조건
  S.afterPlace = (r, sets) => {
    if (S.tutorial) return;
    for (const id in FLASHBACKS) {
      if (G.flash[id]) continue;
      const w = FLASHBACKS[id].when;
      if ((w.first && w.first.split('|').includes(r)) || (w.set && sets.includes(w.set))) S.run(() => S.flash(id));
    }
  };

  // ---------- 회상 ----------
  const FB = {
    async prologue() {
      Talk.bg('bg/cg_p_departure', true);
      await Talk.n('826년, 광저우. 당나라 그릇 6만 점을 실은 배 샤브디즈호가 바람을 기다리고 있었다.');
      Talk.stand([['marzuban', 'c']]);
      await Talk.say('marzuban', 'smile', '바람은 거스르는 게 아니라 기다리는 거다. 기억해 두거라, 꼬마 선원.');
      Talk.stand([]);
      Talk.bg('bg/cg_p_stars', true);
      await Talk.n('밤마다 선장은 견습 선원에게 별 읽는 법을 가르쳤다. 그리고 그것을 「바람의 책」에 적었다.');
      Talk.bg('bg/cg_p_wreck', true);
      SFX.play('storm');
      await Talk.n('그러나 해협 어귀에서 폭풍이 배를 삼켰다. 책장이 바람에 흩어졌다.');
      Talk.bg('bg/cg_p_rescue', true);
      Talk.stand([['dayang', 'c']]);
      await Talk.say('dayang', 'surprised', '살아 있어! 이봐, 정신 차려!');
      Talk.stand([]);
      await Talk.n('바다 유목민 소녀 다양이 표류하던 견습 선원을 건져 올렸다. 배와 함께 가라앉은 그릇들은 천 년을 기다렸다.');
      await Talk.n('— 오늘 로비 한가운데의 그릇은, 그 배에 실려 있던 6만 점 가운데 하나입니다.');
    },
    async palembang() {
      Talk.bg('bg/cg_1_palembang', true);
      await Talk.n('살아남은 견습 선원은 스리위자야의 수도 팔렘방에 닿았다. 강 위로 수상 가옥과 배가 끝없이 이어졌다.');
      Talk.stand([['weishao', 'c', 'panic']]);
      await Talk.say('weishao', 'surprised', '자, 잠깐! 그 그릇 조각… 내 가마에서 구운 거야! 바다에 빠진 그 배에 실렸던!');
      Talk.setPose('weishao', 'proud');
      await Talk.say('weishao', 'smile', '나는 위소. 장사요 도공이었지. 내 그릇이 어디까지 가는지 보고 싶어서 배를 탔다네.');
      Talk.stand([]);
      await Talk.n('— 남해관의 유물들은, 그 시절 팔렘방 사람들이 보던 풍경에서 왔습니다.');
    },
    async dive() {
      Talk.bg('bg/cg_1_dive', true);
      Talk.stand([['dayang', 'c']]);
      await Talk.say('dayang', 'determined', '숨 크게 쉬고, 나만 따라와!');
      Talk.stand([]);
      await Talk.n('두 사람은 스승의 배가 가라앉은 암초 아래로 내려갔다. 모래 속에서 금빛이 반짝였다.');
      Talk.bg('bg/ruin_shabdiz_wreck_in', true);
      await Talk.n('선장의 아스트롤라베는 끝내 찾지 못했다. 대신 젖은 책장 한 장이 상자 틈에 끼어 있었다 — 「바람의 책」 첫 장.');
      await Talk.n('— 샤브디즈호의 세 유물이 한자리에 모였습니다. 1,200년 만입니다.');
    },
    async borobudur() {
      Talk.bg('bg/cg_1_borobudur', true);
      await Talk.n('자바의 들판, 아직 짓고 있는 거대한 돌 만다라. 순례자들이 회랑을 따라 천천히 돌았다.');
      Talk.stand([['dayang', 'c']]);
      await Talk.say('dayang', 'laugh', '저기 봐! 돌에 배가 새겨져 있어. 옆에 날개 같은 게 달렸어!');
      Talk.stand([]);
      await Talk.n('견습 선원은 그 배를 종이에 옮겨 그렸다. 그 그림이 천 년 뒤 박물관 벽에 걸릴 줄은 몰랐다.');
      Talk.bg('bg/ruin_borobudur', true);
      await Talk.n('— 2003년, 이 부조를 보고 실제로 배를 만들어 아프리카까지 항해한 사람들이 있었어요. 배 이름은 「사무드라 락사」.');
    },
  };
  S.flash = async (id, replay) => {
    SFX.music('sea');
    await Talk.title('회상', FLASHBACKS[id].title);
    await FB[id]();
    Talk.end();
    SFX.music('port');
    if (!replay && !G.flash[id]) {
      G.flash[id] = true; State.save();
      UI.banner('🎞 회상 해금', `「${FLASHBACKS[id].title}」 · 도감에서 다시 볼 수 있어요 · 명성 +3`);
      State.addFame(3);
    }
  };

  // ---------- 등급 ----------
  S.checkRank = () => {
    if (!G || G.rank !== 1 || G.rankPending) return;
    const n = RANKS[2].need;
    if (G.fame >= n.fame && State.shownCount() >= n.shown && State.setCount() >= n.sets) {
      G.rankPending = true;
      S.run(async () => {
        G.rank = 2; G.story = 2;
        SFX.play('fanfare'); UI.confetti(120);
        await Talk.title('명성 등급 상승', '★★ 동네의 자랑');
        Talk.bg('bg/ext_museum_2', true);
        Talk.stand([['aisha', 'l'], ['maya', 'r']]);
        await Talk.say('aisha', 'proud', '관장님, 해냈어요! 이제 문 닫을 걱정은 없어요. 입장료도 올렸어요.');
        await Talk.say('maya', 'moved', '할아버지가 보셨으면 좋아하셨을 거예요. 다음엔 더 먼 바다로 가요!');
        await Talk.say('aisha', 'smile', '다음은 실론·벵골만관이에요. — 체험판(M0)은 여기까지예요. 계속 놀면서 도감 16점을 다 채워 보세요!');
        Talk.end();
        Museum.render(); HUD.update(true); State.save();
      });
    }
  };
  return S;
})();
