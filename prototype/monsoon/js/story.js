// 서장 · 1장 이야기 (scenario.md 6-0 ~ 6-2 를 프로토타입 길이로 줄임)
'use strict';

const DEADLINE = 419;   // 827년 9월 30일

const Story = {
  async prologue() {
    SFX.music('sea');
    Talk.bg('bg/cg_open_bowl', true);
    await Talk.n('1998년, 인도네시아 벨리퉁섬 앞바다.');
    await Talk.n('해삼을 캐던 잠수부의 손전등이 산호에 덮인 그릇 더미를 비춘다.');
    await Talk.n('그릇 하나를 돌려 보자 바깥 면에 새겨진 날짜가 보인다.\n「보력 2년 7월 16일」');
    Talk.bg('bg/cg_open_dive', true);
    await Talk.n('이 배의 마지막 선원 이야기는 어디에도 기록되지 않았다.\n지금부터 쓰기로 하자.');
    await Talk.title('826년 · 당나라 보력 2년', '서장 — 보력 2년의 바다');

    Talk.bg('bg/cg_p_departure', true);
    await Talk.n(ORIGINS[G.origin].intro);
    Talk.stand([['pc', 'cl'], ['marzuban', 'cr']]);
    await Talk.say('marzuban', 'smile', '샤브디즈호에 온 걸 환영한다, {name}. 이 배엔 장사요 그릇이 오만 점 넘게 실려 있지.');
    await Talk.say('marzuban', 'neutral', '바스라까지 가는 긴 길이다. 바람을 읽을 줄 알면 바다가 길을 열어 준다.');
    await Talk.say('pc', 'smile', '네, 선장님! 뭐든 배우겠습니다.', 'greet');

    Talk.bg('bg/cg_p_stars', true); Talk.stand([]);
    await Talk.say('marzuban', 'thinking', '저 별이 보이느냐. 별은 자리를 알려 주고, 바람은 계절을 알려 준다.');
    await Talk.say('marzuban', 'smile', '바람은 거스르는 게 아니라 기다리는 것이다.\n여름엔 남서풍이 북쪽으로, 겨울엔 북동풍이 남쪽으로 배를 민다.');
    await Talk.n('그날 밤, 화물칸에서 누군가 배 밑바닥을 긁는 소리가 들렸다.');
    Talk.bgFilter('brightness(.45) saturate(.6)');
    await Talk.n('달려가 보니 그림자는 사라지고, 검은 천 조각 하나만 남아 있었다.\n천에는 은색 닻 무늬가 수놓아져 있었다.');

    Talk.bg('bg/cg_p_wreck', true); SFX.play('storm');
    await Talk.n('며칠 뒤, 벨리퉁 앞바다. 폭풍 속에서 배가 검은 암초에 부딪혔다.');
    await Talk.say('marzuban', 'determined', '{name}! 이 책을 받아라! 「바람의 책」이다. 이것만은…!');
    await Talk.n('큰 파도가 갑판을 덮쳤다. 가죽 꾸러미가 풀리며 책장이 바람에 흩어졌다.');
    SFX.play('page');
    await Talk.n('손에 남은 것은 첫 장, 단 한 장뿐이었다.');
    UI.toast('「바람의 책」 1 / 32장', 'icon/codex');

    Talk.bg('bg/cg_p_rescue', true);
    await Talk.n('…얼마나 떠다녔을까. 햇볕에 그을린 손이 너를 물에서 끌어올렸다.');
    Talk.stand([['dayang', 'cr', 'wave']]);
    await Talk.say('dayang', 'smile', '살았네! 난 다양이야. 바다에서 태어나 바다에서 사는 오랑 라우트.');
    await Talk.say('dayang', 'sad', '큰 배가 가라앉는 걸 봤어. 살아남은 건… 너 하나뿐인 것 같아.', 'sad');
    await Talk.say('pc', 'sad', '선장님은…');
    await Talk.say('dayang', 'determined', '…일단 팔렘방으로 가자. 거긴 이 바다에서 제일 큰 항구니까.', 'look');

    Talk.bg('bg/cg_1_palembang', true); Talk.stand([]);
    await Talk.title('제1장', '해협의 주인');
    await Talk.n('스리위자야의 수도 팔렘방. 무시강을 따라 수상 가옥이 끝없이 늘어서 있다.');
    Talk.bg('bg/bg_office_nanhai'); Talk.stand([['pc', 'cl'], ['datusri', 'cr']]);
    await Talk.say('datusri', 'angry', '네가 샤브디즈호의 생존자로구나. 그 배에 돈을 댄 팔렘방 상인들이 몹시 화가 났다.');
    await Talk.say('datusri', 'neutral', '배와 화물을 잃었으니 맡긴 돈을 물어내야지. 금 300디나르다.');
    await Talk.say('pc', 'surprised', '300디나르요?! 저는 견습 선원일 뿐인데…', 'shock');
    await Talk.say('datusri', 'thinking', '법은 법이다. 대신 기한은 넉넉히 주마. 내년 여름이 끝나기 전, 827년 9월 말까지다.');
    Talk.stand([['pc', 'cl'], ['dayang', 'cr', 'look']]);
    await Talk.say('dayang', 'determined', '걱정 마. 내 프라후로 장사하면 돼. 해협엔 사고팔 게 넘쳐나거든!');
    await Talk.say('dayang', 'smile', '여기 시장에서 싸게 사서, 바람을 타고 다른 항구에 비싸게 파는 거야.\n칼라 사람들은 당나라 그릇을 좋아해. 처음엔 그릇이 좋겠다!');
    Talk.close();
    G.flags.prologue = true;
    State.save();
  },

  async weishao() {
    Talk.bg('bg/bg_market_nanhai');
    Talk.stand([['pc', 'cl'], ['weishao', 'cr', 'inspect']]);
    await Talk.say('weishao', 'surprised', '이, 이 그릇은…! 내 가마에서 구운 거야! 이 새 그림, 이 붓질… 틀림없어.');
    await Talk.say('pc', 'neutral', '그건 샤브디즈호에 실렸던 그릇이에요. 배는 벨리퉁 앞바다에서 가라앉았는데…');
    await Talk.say('weishao', 'thinking', '가라앉은 배의 그릇이 벌써 시장에 나왔다고? 이상한데.\n바닷물에서 건져서 소금기를 빼려면 한참 걸릴 텐데…');
    await Talk.say('weishao', 'smile', '난 위소. 장사요 도공이었지. 내 그릇이 어디까지 가는지 보려고 배를 탔다가 여기서 발이 묶였어.', 'salute');
    await Talk.say('weishao', 'proud', '셈은 내가 빨라. 그릇 감정도 하고. 날 태워 주면 값을 제대로 받아 주지!', 'proud');
    const v = await Talk.choice([['함께 가요, 위소 아저씨!', true], ['생각해 볼게요', false]]);
    if (v) {
      G.mates.push('weishao'); G.flags.weishao = true;
      await Talk.say('weishao', 'laugh', '좋아! 그런데… 배가 흔들려도 그릇은 안 깨지겠지? 응?', 'hooray');
      UI.toast('위소가 동료가 되었다 — 파는 값 +8%, 시세 감정', 'icon/crew');
      SFX.play('win');
    } else {
      await Talk.say('weishao', 'sad', '그래… 생각이 바뀌면 이 시장에 있을게.', 'hide');
    }
    Talk.close();
    State.save();
  },

  async rumorWreck() {
    Talk.bg('bg/bg_inn_nanhai');
    Talk.stand([['weishao', 'cl', 'inspect'], ['dayang', 'cr', 'look']]);
    await Talk.n('객잔 구석에서 술에 취한 잠수부가 큰 소리로 떠들고 있다.');
    await Talk.n('"벨리퉁 서쪽 검은 바위에 큰 배가 가라앉았잖아. 그 짐을 몰래 건져 판 놈들이 있다고!\n밤에 와서 검은 천으로 그물을 덮고 갔다니까!"');
    await Talk.say('weishao', 'angry', '거봐! 내 그릇을 건져서 판 자들이 있는 거야.');
    await Talk.say('dayang', 'determined', '벨리퉁 검은 바위라면 내가 알아. 잠수해 보자. 선장님 배에 뭔가 남아 있을지도 몰라.');
    Talk.close();
    G.flags.rumor_wreck = true;
    UI.toast('지도에 「샤브디즈호 침몰 지점」이 표시되었다', 'icon/map');
    SFX.play('discover');
    State.save();
  },

  async wreck() {
    SFX.music('sea');
    Talk.bg('bg/ruin_shabdiz_wreck', true);
    await Talk.n('벨리퉁 서쪽, 검은 바위 암초. 맑은 물 아래로 부서진 배가 보인다.');
    Talk.stand([['dayang', 'cr', 'look'], ['pc', 'cl']]);
    await Talk.say('dayang', 'smile', '숨 크게 쉬고, 내 손을 놓지 마!', 'jump');
    Talk.stand([]);
    Talk.bg('bg/cg_1_dive', true); SFX.play('splash');
    await Talk.n('물속은 조용했다. 갑판 위에 그릇 상자가 아직 줄지어 있었다.');
    await Talk.n('그런데 화물칸 한쪽이 텅 비어 있다. 누군가 이미 건져 간 자리다.');
    Talk.bg('bg/ruin_shabdiz_wreck_in', true);
    await Talk.n('배 밑바닥에 동그랗게 뚫린 구멍. 암초에 부딪혀 생긴 게 아니다. 안쪽에서 일부러 판 자국이다.');
    await Talk.n('구멍 옆, 기둥에 걸린 방수 가죽 꾸러미 하나. 스승의 글씨가 적힌 책장이었다.');
    SFX.play('page');
    G.pages = Math.max(G.pages, 2);
    UI.toast('「바람의 책」 2 / 32장', 'icon/codex');
    const got = [];
    for (const r of RUINS.shabdiz_wreck.relics) if (State.addRelic(r)) got.push(RELICS[r].name);
    if (got.length) { SFX.play('discover'); UI.toast('유물 기록: ' + got.join(', '), 'icon/codex'); }
    Talk.bg('bg/ruin_shabdiz_wreck', true);
    Talk.stand([['pc', 'cl'], ['dayang', 'cr', 'sad']]);
    await Talk.say('pc', 'angry', '배가 그냥 가라앉은 게 아니었어. 누군가 구멍을 냈어… 그날 밤 그 그림자가!');
    await Talk.say('dayang', 'thinking', '검은 천에 은색 닻… 해협 사람들이 쉬쉬하는 이름이 있어. 흑닻 상회.');
    await Talk.n('「바람의 책」 둘째 장: "해협의 주인을 만나거든, 빚보다 먼저 진실을 물어라."');
    Talk.close();
    G.flags.wreck_done = true;
    G.fame.explore += 40;
    State.save();
  },

  async seriIntro() {
    Talk.bg('bg/sky_day');
    Talk.stand([['seri', 'cr'], ['pc', 'cl']]);
    await Talk.n('칼라 앞바다. 붉은 돛을 단 날렵한 배가 앞을 가로막는다.');
    await Talk.say('seri', 'smile', '거기 프라후! 샤브디즈호 생존자가 타고 있다던데. 너구나?');
    await Talk.say('pc', 'determined', '누구죠? 무슨 볼일이에요?');
    await Talk.say('seri', 'proud', '난 세리. 누가 너를 데려오라고 돈을 꽤 냈거든. 얌전히 따라오면 안 다쳐.');
    await Talk.say('dayang', 'angry', '해적 주제에! {name}, 붙자. 화살이랑 바람만 잘 쓰면 돼!');
    Talk.close();
  },
  async seriAfter(won) {
    Talk.bg('bg/sky_day');
    Talk.stand([['seri', 'cr'], ['pc', 'cl']]);
    if (won) await Talk.say('seri', 'surprised', '…제법인데? 바람 타는 법을 누구한테 배웠어?');
    else await Talk.say('seri', 'smile', '흥, 오늘은 이 정도만 하지. 짐 조금 받아 간다.');
    await Talk.say('seri', 'neutral', '난 흑닻 상회에 고용된 것뿐이야. 그 사람들이 왜 너를 찾는지는 나도 몰라.');
    await Talk.say('seri', 'determined', '다음엔 안 봐줘. 해협에서 오래 살고 싶으면 조용히 장사나 해!');
    await Talk.n('붉은 돛은 북쪽 수평선 너머로 사라졌다.');
    Talk.close();
    G.flags.seri = true;
    State.save();
  },

  async jacob() {
    Talk.bg('bg/bg_market_nanhai');
    Talk.stand([['pc', 'cl'], ['jacob', 'cr']]);
    await Talk.say('jacob', 'smile', '처음 보는 얼굴이군. 난 야곱. 바그다드에서 광저우까지 안 가 본 시장이 없지.');
    await Talk.say('jacob', 'thinking', '조언 하나 공짜로 주지. 칼라 주석은 여기서 사서 자바나 팔렘방에 팔아.\n돌아오는 길에 빈 배로 오는 건 바보짓이야.');
    await Talk.say('jacob', 'laugh', '다음 항구에서 또 보자고. 누가 더 벌었나 내기야!');
    Talk.close();
    G.flags.jacob = true;
  },

  async boroQuest() {
    Talk.bg('bg/bg_office_nanhai');
    Talk.stand([['pc', 'cl'], ['dayang', 'cr', 'look']]);
    await Talk.n('관청 관리: "보로부두르로 가는 순례자들이 있소. 내륙 길에 도적이 나오니 호위할 사람을 찾고 있지."');
    await Talk.n('"무사히 데려다주면 금 40디나르를 드리리다. 나흘 길이오."');
    const v = await Talk.choice([['맡겠습니다', true], ['다음에요', false]]);
    if (v) {
      G.flags.boro_quest = true;
      await Talk.say('dayang', 'smile', '보로부두르! 돌로 만든 산이라던데. 꼭 보고 싶었어!', 'jump');
      UI.toast('「주변 탐사」에서 보로부두르로 갈 수 있다', 'icon/map');
    }
    Talk.close();
    State.save();
  },
  async borobudur() {
    Talk.bg('bg/cg_1_borobudur', true);
    await Talk.n('화산 사이 들판을 나흘 걸어, 순례자들과 함께 거대한 돌 만다라 앞에 섰다.');
    await Talk.n('아래층 회랑부터 위로, 부조가 이야기를 이어 간다. 일꾼들은 지금도 돌을 쌓고 있다.');
    Talk.bg('bg/ruin_borobudur_in', true);
    Talk.stand([['dayang', 'cr', 'look'], ['pc', 'cl']]);
    await Talk.say('dayang', 'surprised', '{name}, 이것 봐! 돌에 배가 새겨져 있어. 옆에 지지대가 달린… 우리 배랑 똑같아!');
    await Talk.say('pc', 'smile', '이 바다를 오가던 배들이구나. 그려 두자.', 'map');
    Talk.close();
  },

  async debtClear() {
    Talk.bg('bg/bg_office_nanhai');
    Talk.stand([['pc', 'cl'], ['datusri', 'cr']]);
    await Talk.say('datusri', 'surprised', '정말로 300디나르를 다 갚았구나. 해협 상인들도 너를 다시 보겠어.');
    if (!G.flags.wreck_done) {
      await Talk.say('datusri', 'thinking', '그런데 이상한 소문이 있다. 가라앉은 배의 그릇이 벌써 시장에 돈다더군.\n객잔에서 귀를 기울여 보거라.');
      Talk.close();
      return;
    }
    await Story.ch1End();
  },
  async ch1End() {
    Talk.bg('bg/bg_office_nanhai');
    Talk.stand([['pc', 'cl'], ['datusri', 'cr']]);
    await Talk.say('pc', 'determined', '다투 스리님. 샤브디즈호는 사고가 아니었어요. 누군가 배 밑에 구멍을 냈어요.');
    await Talk.say('datusri', 'sad', '…그랬구나. 너를 빚쟁이로 몰았던 것을 사과하마.');
    await Talk.say('datusri', 'determined', '사실 그 배의 그릇을 시장에 처음 푼 자들은 「흑닻 상회」였다. 서쪽 바다까지 손이 닿는 자들이지.');
    await Talk.say('datusri', 'neutral', '이것을 받아라. 가라앉은 배에서 흘러온 책장이라며 한 어부가 바친 것이다.');
    SFX.play('page');
    G.pages = Math.max(G.pages, 3);
    UI.toast('「바람의 책」 3 / 32장', 'icon/codex');
    Talk.bg('bg/bg_marzuban_house', true); Talk.stand([]);
    await Talk.n('스승의 글씨가 또렷했다.');
    await Talk.say('marzuban', 'smile', '"바람의 문을 지나 후추의 나라로. 거기서 너를 기다리는 사람이 있을 것이다."');
    Talk.bg('bg/cg_1_palembang', true);
    Talk.stand([['pc', 'cl', 'point'], ['dayang', 'cr', 'wave']]);
    await Talk.say('dayang', 'laugh', '후추의 나라면 인도야! 니코바르를 지나 서쪽으로… 큰 바다를 건너야 해.');
    if (G.mates.includes('weishao')) await Talk.say('weishao', 'scared', '크, 큰 바다…? 그릇이 깨지지 않게 큰 배부터 사자, 응?');
    await Talk.title('제1장 끝', '바람의 문을 지나 후추의 나라로');
    G.flags.ch1_done = true;
    G.fame.explore += 30;
    State.save();
    await Story.protoEnd();
  },
  async protoEnd() {
    const f = G.fame;
    await Talk.n(`프로토타입은 여기까지예요. 함께해 주셔서 고마워요!\n\n걸린 날: ${G.day - G.stats.days0}일 · 항해 ${G.voyages}번 · 해전 승리 ${G.wins}번 · 유물 기록 ${Object.keys(G.relics).length}/${RELIC_ORDER.length}\n명성 — 교역 ${f.trade} · 탐험 ${f.explore} · 학문 ${f.scholar} · 해상 ${f.sea}`);
    await Talk.n('2장 「몬순의 문」에서는 니코바르를 지나 실론과 인도로 건너가요.\n계속 해협을 돌며 장사하고 유물을 모을 수 있어요.');
    Talk.close();
  },

  async deadline() {
    Talk.bg('bg/bg_office_nanhai');
    Talk.stand([['pc', 'cl'], ['datusri', 'cr']]);
    await Talk.say('datusri', 'angry', `기한이 지났다. 아직 ${G.debt}디나르가 남았구나.`);
    await Talk.say('datusri', 'thinking', '…좋다. 열심히 장사하는 건 다들 봤다. 이자 30디나르를 얹고 석 달을 더 주마.');
    G.debt += 30;
    G.flags.deadline = (G.flags.deadline || DEADLINE) + 90;
    Talk.close();
    State.save();
  },
};

function goalText() {
  if (!G.flags.prologue) return '';
  const left = (G.flags.deadline || DEADLINE) - G.day;
  if (G.flags.ch1_done) return '<b>자유 항해</b> — 해협을 돌며 장사하고 남은 유물을 찾아보세요.';
  const lines = [];
  if (G.debt > 0) lines.push(`<b>빚</b> ${G.debt} 디나르 남음 · 기한까지 ${Math.max(0, left)}일 (팔렘방 관청에서 갚기)`);
  if (G.voyages === 0) lines.push('<b>목표</b> 시장에서 물건을 사서 다른 항구에 팔아 보세요. 예) 팔렘방 그릇 → 칼라');
  else if (!G.flags.weishao && G.port === 'palembang') lines.push('<b>목표</b> 팔렘방 시장에 가 보세요. 누군가 그릇을 보고 있어요.');
  else if (!G.flags.weishao) lines.push('<b>목표</b> 팔렘방 시장으로 돌아가 보세요.');
  else if (!G.flags.rumor_wreck) lines.push('<b>목표</b> 팔렘방 객잔에서 소문을 들어 보세요.');
  else if (!G.flags.wreck_done) lines.push('<b>목표</b> 지도에서 벨리퉁 서쪽 「샤브디즈호 침몰 지점」으로 가세요.');
  else if (G.debt > 0) lines.push('<b>목표</b> 빚을 모두 갚고 다투 스리에게 진실을 말하세요.');
  else lines.push('<b>목표</b> 팔렘방 관청의 다투 스리를 찾아가세요.');
  return lines.join('<br>');
}
