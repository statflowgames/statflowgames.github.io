// 스킬의 준비 → 효과 발생 → 여운. 전투 효과의 값은 classes.js/game.js에 둔다.
const HERO_SKILL_STYLE = {
  warrior: {
    '도발의 외침': ['shout', 140], '전투 함성': ['shout', 180], '방패 반사': ['shield', 120],
    '회전 방패': ['throw', 180], '대지 가르기': ['cleave', 225], '산 가르기': ['cleave', 300], '군기 꽂기': ['banner', 240],
  },
  mage: {
    '화염구': ['fire', 180], '불꽃 회오리': ['fire', 220], '태양핵': ['ritual', 320],
    '서리 창': ['ice', 160], '얼음 방벽': ['ward', 180], '절대영도': ['ward', 300],
    '번개 화살': ['bolt', 120], '뇌운': ['ritual', 240], '천둥창': ['bolt', 260],
  },
  paladin: {
    '성광 일격': ['hammer', 240], '심판의 망치': ['hammer', 300], '백월의 선고': ['hammer', 260],
    '성스러운 방패': ['aegis', 180], '보호의 원': ['aegis', 220],
    '치유의 손': ['prayer', 220], '정화의 물결': ['prayer', 200], '기적': ['prayer', 360],
  },
  rogue: {
    '급소 찌르기': ['thrust', 90], '표식': ['sign', 100], '일격필살': ['ambush', 100],
    '독 바르기': ['coat', 180], '독안개 폭탄': ['toss', 140], '독사의 송곳니': ['flurry', 120],
    '칼날 회오리': ['flurry', 140], '그림자 분신': ['sign', 220],
  },
  ranger: {
    '관통 화살': ['draw', 200], '삼연사': ['draw', 160], '저격': ['draw', 380],
    '덩굴 덫': ['nature', 200], '늑대 정령': ['call', 260], '대지의 분노': ['nature', 300],
    '달빛 화살': ['draw', 220], '월광 장막': ['veil', 200], '초승달 사격': ['draw', 300],
  },
  hexblade: {
    '저주의 낙인': ['curse', 180], '고통의 사슬': ['curse', 220], '파멸의 선고': ['curse', 340],
    '피의 대가': ['cleave', 260], '핏빛 회오리': ['cleave', 240], '혈월': ['blood', 280],
    '공허 베기': ['cleave', 280], '일식 폭발': ['blood', 300], '월식': ['curse', 320],
  },
};
const HERO_SIGNATURE = {
  warrior: { color: 0xffbb60, css: '#ffe27a', edge: '#6a2a06' },
  mage: { color: 0x80d8ff, css: '#b8ecff', edge: '#174e78' },
  paladin: { color: 0xfff0b0, css: '#fff5cc', edge: '#806026' },
  rogue: { color: 0xbb98ff, css: '#dfceff', edge: '#4d266d' },
  ranger: { color: 0x90e8c0, css: '#ceffe2', edge: '#27684c' },
  hexblade: { color: 0xb070ff, css: '#dec0ff', edge: '#501a70' },
};
function skillBase(key, base) {
  const p = heroCanonical(base || (key === 'warrior' ? HARVAN_STAND : STANCE[key]));
  return key === 'rogue' ? { ...p, thb: 18, shb: 24 } : p;
}
// 각 family는 서로 다른 무기 운용과 체중 이동을 가진다. 배열: 준비 / 접촉 / 통과.
function skillGesture(key, family, base) {
  const p = d => ({ ...skillBase(key, base), ...d });
  const sword = (d, angle) => heroCanonical(WA(p(d), angle));
  const staff = (d, angle) => heroCanonical(MWA(p(d), angle));
  const dual = (d, a, b) => heroCanonical(RW(p(d), a, b));
  const bow = (d, angle = -180) => heroCanonical(WF(p(d), angle));
  if (key === 'warrior') {
    if (family === 'shout') return [p({ torso:-10, head:-12, uaf:-12, faf:-100, uab:20, fab:-55 }),
      p({ torso:-15, head:-22, uaf:-38, faf:-75, uab:30, fab:-70, rx:-3 }), p({ torso:8, head:-4, uaf:-35, faf:-85 })];
    if (family === 'shield' || family === 'throw') return [p({ ...CROUCH, torso:-10, uaf:30, faf:-110 }),
      p({ ...LUNGE_S, torso:18, uaf:-88, faf:-12, hf:0, rx:8 }), p({ torso:20, uaf:family==='throw'?-120:-65, faf:family==='throw'?-25:-60, rx:5 })];
    if (family === 'banner') return [sword({ ...CROUCH, torso:-8, uab:-175, fab:-35 },-170),
      sword({ ...CROUCH, torso:24, uab:-30, fab:-18, rx:6 },-5), sword({ torso:16, uab:-18, fab:-35 },-12)];
    return [sword({ ...CROUCH, torso:-14, uab:-190, fab:-25 },-170),
      sword({ ...LUNGE, torso:26, uab:-84, fab:-15, uaf:-25, faf:-95, rx:10 },-55), sword({ ...LUNGE_S, torso:30, uab:-18, fab:-30, rx:8 },20)];
  }
  if (key === 'mage') {
    if (family === 'ward') return [staff({ torso:-8, uaf:-45, faf:-115, uab:-40, fab:-75 },-175),
      staff({ torso:-4, uaf:-122, faf:-20, uab:-115, fab:-25, head:-12 },-178), staff({ torso:2, uaf:-92, faf:-35, uab:-90, fab:-30 },-170)];
    if (family === 'ritual') return [staff({ torso:-8, head:-14, uab:-155, fab:-30, uaf:-65, faf:-105 },-178),
      staff({ torso:-10, head:-20, uab:-170, fab:-12, uaf:-135, faf:-15, cape:-10 },-175), staff({ torso:8, uab:-105, fab:-25, uaf:-95, faf:-25, rx:4 },-105)];
    if (family === 'ice') return [staff({ torso:-10, uab:-45, fab:-85, uaf:-35, faf:-100 },-175),
      staff({ torso:9, uab:-88, fab:-12, uaf:-95, faf:-10, rx:5 },-92), staff({ torso:2, uab:-95, fab:-25, uaf:-110, faf:-20, rx:-2 },-110)];
    if (family === 'bolt') return [staff({ torso:-8, uab:-135, fab:-28, uaf:-65, faf:-115, head:-12 },-160),
      staff({ torso:12, uab:-65, fab:-18, uaf:-105, faf:-8, rx:7 },-90), staff({ torso:0, uab:-80, fab:-30, uaf:-115, faf:-20, rx:-3 },-105)];
    return [staff({ torso:-12, uab:-55, fab:-80, uaf:-60, faf:-110, rx:-4 },-145),
      staff({ torso:16, uab:-86, fab:-12, uaf:-80, faf:-18, rx:9 },-88), staff({ torso:4, uab:-65, fab:-32, uaf:-95, faf:-30, rx:-4 },-108)];
  }
  if (key === 'paladin') {
    if (family === 'prayer') return [sword({ ...CROUCH, torso:-3, head:20, uab:-35, fab:-120, uaf:-35, faf:-115 },140),
      sword({ torso:-7, head:-16, uab:-160, fab:-18, uaf:-42, faf:-90, cape:-4 },-175), sword({ torso:2, head:-8, uab:-145, fab:-30, uaf:-48, faf:-80 },-165)];
    if (family === 'aegis') return [sword({ ...CROUCH, torso:-5, uaf:8, faf:-110 },135),
      sword({ ...CROUCH, torso:8, uaf:-68, faf:-35, uab:-35, fab:-120 },130), sword({ torso:6, uaf:-55, faf:-55 },135)];
    return [sword({ ...CROUCH, torso:-16, head:-12, uab:-190, fab:-28, uaf:-35, faf:-95 },-175),
      sword({ ...LUNGE, torso:24, uab:-94, fab:-18, uaf:-26, faf:-90, rx:8 },-65), sword({ ...LUNGE_S, torso:30, uab:-10, fab:-32, uaf:-22, faf:-90, rx:10 },15)];
  }
  if (key === 'rogue') {
    if (family === 'coat') return [dual({ ...CROUCH, torso:25, head:12, uab:-68, fab:-95, uaf:-55, faf:-110 },-100,-140),
      dual({ torso:25, head:8, uab:-78, fab:-30, uaf:-72, faf:-48 },-82,-98), dual({ torso:24, uab:-58, fab:-55, uaf:-94, faf:-40 },-105,-130)];
    if (family === 'toss' || family === 'sign') return [dual({ ...CROUCH, torso:10, uaf:24, faf:-130, uab:-48, fab:-90 },-120,-180),
      dual({ ...LUNGE_S, torso:28, uaf:-105, faf:-12, uab:-60, fab:-70, rx:6 },-115,-85), dual({ torso:24, uaf:-60, faf:-48, uab:-48, fab:-68 },-120,-135)];
    return [dual({ ...CROUCH, torso:8, uab:30, fab:-110, uaf:-150, faf:-28 },30,-170),
      dual({ ...LUNGE_S, torso:30, uab:-108, fab:-8, uaf:-88, faf:-16, rx:10, rr:3 },family==='thrust'?-90:-65,-125),
      dual({ ...LUNGE_S, torso:32, uab:-20, fab:-35, uaf:-55, faf:-35, rx:6 },20,-30)];
  }
  if (key === 'ranger') {
    if (family === 'nature') return [bow({ ...CROUCH, torso:28, head:18, uab:-30, fab:-80, uaf:-20, faf:-40 },-165),
      bow({ ...CROUCH, torso:34, head:15, uab:-38, fab:-15, uaf:-22, faf:-30, rx:5 },-165), bow({ torso:15, uab:-65, fab:-35, uaf:-30, faf:-40 },-165)];
    if (family === 'call' || family === 'veil') return [bow({ torso:-5, uab:-55, fab:-95, uaf:-40, faf:-65 },-170),
      bow({ torso:-8, head:-12, uab:-145, fab:-15, uaf:-58, faf:-55 },-160), bow({ torso:5, uab:-110, fab:-30, uaf:-50, faf:-55 },-165)];
    return [bow({ torso:2, head:-5, uaf:-96, faf:-14, uab:-100, fab:-100, bowDraw:1, bowRelease:0 },-180),
      bow({ torso:8, head:-6, uaf:-100, faf:-4, uab:-105, fab:-100, bowDraw:1, bowRelease:0, rx:2 },-180),
      bow({ torso:4, head:-5, uaf:-96, faf:-6, uab:-112, fab:-105, bowDraw:1, bowRelease:1, rx:-3 },-180)];
  }
  if (family === 'curse') return [sword({ ...CROUCH, torso:24, head:22, uab:-30, fab:-110 },100),
    sword({ torso:8, head:-10, uab:-125, fab:-18, rx:4 },-125), sword({ torso:15, head:2, uab:-110, fab:-30 },-110)];
  if (family === 'blood') return [sword({ ...CROUCH, torso:30, head:24, uab:-55, fab:-115 },-10),
    sword({ torso:-5, head:-18, uab:-158, fab:-28, cape:20 },-175), sword({ torso:12, uab:-120, fab:-35 },-145)];
  return [sword({ ...CROUCH, torso:-15, head:-8, uab:-195, fab:-28 },-170),
    sword({ ...LUNGE, torso:24, uab:-100, fab:-22, rx:10 },-70), sword({ ...LUNGE_S, torso:32, uab:10, fab:-40, rx:12 },30)];
}
function heroSkillMotion(key, name, fx = {}, base) {
  const choice = HERO_SKILL_STYLE[key]?.[name];
  if (!choice) throw new Error('Missing skill motion: ' + key + '/' + name);
  const [family, fire] = choice, beats = fx.burst || fx.pulses || 1;
  const gap = fx.burst ? 110 : 160, contact = fire + (fx.t === 'blink' ? 120 : 0);
  const last = contact + (fx.t === 'line' ? (fx.n - 1) * 70 : (beats - 1) * gap);
  const recovery = ['paladin','hexblade'].includes(key) ? 320 : key === 'rogue' ? 180 : 240;
  const duration = last + recovery, clip = 'skill_' + key + '_' + name;
  const gesture = skillGesture(key, family, base), idle = skillBase(key, base);
  const keys = [[0, idle], [Math.max(25, contact * .55), gesture[0], 'out']];
  for (let i=0;i<beats;i++) {
    const t=contact+i*gap;
    if (i) keys.push([t-45, gesture[0], 'out']);
    keys.push([t, gesture[1], 'in'], [t+Math.min(42,gap*.35), gesture[2], 'out']);
  }
  if (fx.t === 'line') keys.push([last+45, gesture[2], 'lin']);
  keys.push([duration, idle, 'io']);
  CLIPS[clip] = keyClip(keys, false, false);
  return { clip, family, fire, last, duration, freeAt:last+80, name, rangedHand:key==='mage'&&['ice','bolt'].includes(family)?'hf':'wpn' };
}

// 각성의 최초 발동은 기존 440ms. 자세와 방출 방향은 직업별로 따로 구성한다.
function heroAwakenClip(key, base) {
  const clip='signature_'+key+'_awaken', p=d=>({...skillBase(key,base),...d});
  const sw=(d,a)=>heroCanonical(WA(p(d),a)), mg=(d,a)=>heroCanonical(MWA(p(d),a));
  let keys;
  if(key==='warrior') keys=[[0,p({})],[180,p({...CROUCH,torso:-14,uaf:28,faf:-115}), 'out'],
    [400,p({...CROUCH,torso:-8,uaf:12,faf:-100}), 'in'],[440,p({...LUNGE,torso:25,uaf:-88,faf:-8,rx:10}), 'lin'],
    [720,p({...LUNGE_S,torso:20,uaf:-78,faf:-24,rx:8}), 'out'],[1000,p({uaf:-48,faf:-70}), 'io']];
  if(key==='mage') keys=[[0,p({})],[200,mg({torso:-12,head:-18,uab:-65,fab:-75,uaf:-65,faf:-110},-155),'out'],
    [400,mg({torso:-12,head:-22,uab:-175,fab:-12,uaf:-125,faf:-25,cape:-20},-178),'in'],
    [440,mg({torso:-10,head:-20,uab:-170,fab:-15,uaf:-150,faf:-8},-175),'lin'],
    [680,mg({torso:8,uab:-120,fab:-25,uaf:-110,faf:-10,rx:4},-120),'out'],
    [820,mg({torso:12,uab:-100,fab:-20,uaf:-85,faf:-12,rx:6},-95),'out'],[1000,p({}),'io']];
  if(key==='paladin') keys=[[0,p({})],[200,sw({...CROUCH,head:25,torso:-4,uab:-35,fab:-130,uaf:-30,faf:-110},140),'out'],
    [400,sw({torso:-8,head:-20,uab:-175,fab:-12,uaf:-42,faf:-92},-178),'in'],
    [440,sw({torso:-10,head:-20,uab:-170,fab:-10,uaf:-65,faf:-55,cape:-10},-175),'lin'],
    [760,sw({torso:0,head:-10,uab:-150,fab:-25,uaf:-55,faf:-70},-165),'out'],[1000,p({uaf:-40,faf:-85}),'io']];
  if(key==='rogue') keys=[[0,p({})],[200,heroCanonical(RW(p({...CROUCH,torso:28,head:-18,uab:-85,fab:-95,uaf:-90,faf:-100}),-135,-160)),'out'],
    [400,heroCanonical(RW(p({...CROUCH,torso:10,uab:35,fab:-105,uaf:-160,faf:-20}),25,-175)),'in'],
    [440,skillGesture(key,'flurry',base)[1],'lin'],[560,skillGesture(key,'flurry',base)[2],'out'],
    [720,skillGesture(key,'flurry',base)[0],'out'],[850,skillGesture(key,'flurry',base)[1],'in'],[1000,p({}),'io']];
  if(key==='ranger') {
    const aim=heroCanonical(WF(p({torso:-8,head:-20,uaf:-143,faf:-5,uab:-110,fab:-100,bowDraw:1,bowRelease:0}),-220));
    keys=[[0,p({})],[180,skillGesture(key,'draw',base)[0],'out'],[400,aim,'in'],[440,aim,'lin'],
      [490,{...aim,bowRelease:1,torso:-12,rx:-3},'out'],[720,{...aim,bowRelease:1,torso:-4},'out'],[1000,p({}),'io']];
  }
  if(key==='hexblade') keys=[[0,p({})],[200,sw({...CROUCH,torso:30,head:25,uab:-40,fab:-110},25),'out'],
    [400,sw({...CROUCH,torso:-12,head:-20,uab:-185,fab:-25},-175),'in'],
    [440,sw({torso:-12,head:-25,uab:-178,fab:-20,cape:24},-178),'lin'],
    [840,sw({...CROUCH,torso:-16,uab:-195,fab:-22},-170),'in'],
    [975,sw({...LUNGE,torso:26,uab:-98,fab:-20,rx:12},-72),'in'],
    [1000,sw({...LUNGE_S,torso:32,uab:-20,fab:-35,rx:10},15),'lin']];
  CLIPS[clip]=keyClip(keys,false,false); return clip;
}
for(const key of Object.keys(HERO_SIGNATURE)) {
  heroAwakenClip(key);
  if(key==='rogue') {
    const g=skillGesture(key,'flurry');
    for(let i=0;i<2;i++) CLIPS['signature_rogue_cut'+i]=keyClip([[0,g[i?2:0]],[45,g[1],'in'],[105,g[i?0:2],'out'],[140,skillBase(key),'io']],false,false);
    CLIPS.signature_rogue_recover=keyClip([[0,g[2]],[140,skillBase(key),'io']],false,false);
  }
}
