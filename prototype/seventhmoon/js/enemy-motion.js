// 적 리그의 체형은 유지하고 접촉 시점·무기 부착·접지를 맞춘다.
const ENEMY_BODY_BONES = ['root','torso','head','uab','fab','uaf','faf','thb','shb','thf','shf','ftb','ftf'];
function enemyActionClip(actor, name) {
  if (name === 'm_down' && actor.def.boss && actor.state === 'stagger' && actor.enemyHumanoid) return 'enemy_braced_stagger';
  return actor.enemyActions[name] || actor.rig.def.clips?.[name] || name;
}
CLIPS.enemy_braced_stagger = { loop:true, dur:700, at(t) {
  return { ...P.standMon, ...CROUCH, torso:34, head:24+Math.sin(t/180)*2, uab:-25, fab:-45, uaf:-35, faf:-45, rr:2 };
} };
function enemyAimPose(bow, release=0) {
  const p={...P.standMon,torso:14,head:-6,uab:-82,fab:-20,uaf:-100,faf:-5,thf:-24,shf:28,thb:18,shb:14,rr:0};
  if (bow) return {...p,hf:-(p.torso+p.uaf+p.faf),bowDraw:1,bowRelease:release};
  return {...p,hb:-90-p.torso-p.uab-p.fab,uaf:-85,faf:-40,rx:-release*3};
}
function configureEnemyMotion(actor) {
  const r=actor.rig, d=r.def;
  actor.enemyMotionReady=true; actor.enemyActions={};
  actor.enemyHumanoid=!!(r.map.ftf && r.map.ftb && !d.kindQuad && !d.kindWyrm && !d.kindBlob && !d.kindScorp);
  const sourceOf=name=>d.clips?.[name]||name;
  for(const [action,hit]of [['m_stab',50],['m_throw',90],['b_smash',110]]) {
    const source=sourceOf(action), c=CLIPS[source];if(!c)continue;
    const contact=({g_smash:140,b_smash:130,wy_stab:120,bl_stab:80,sc_stab:80})[source]||90;
    const name='enemy_'+actor.id+'_'+action;
    CLIPS[name]=heroRetimedClip(c,c.dur,hit,Math.min(contact,c.dur-20));
    actor.enemyActions[action]=name;
  }
  if(actor.def.boss) {
    const source=CLIPS[sourceOf('b_smashup')],name='enemy_'+actor.id+'_smashup';
    if(source){CLIPS[name]={loop:false,dur:900,at(t){return unlagHeroPose(source,Math.min(1,t/(actor.raged?650:900))*source.dur);}};actor.enemyActions.b_smashup=name;}
  }
  if (actor.enemyHumanoid) {
    // 검/망토/치마/수염/공전 장식이 지면 기준을 밀어 몸을 띄우지 않게 한다.
    d.ground=ENEMY_BODY_BONES.filter(n=>r.map[n]);
    if(sourceOf('m_down')==='m_down') {
      actor.enemyActions.m_down='gob_down'; actor.enemyActions.m_getup='gob_getup';
    }
    heroAttachPalm(r,'wpn','hb');heroAttachPalm(r,'fitem','hf');heroAttachPalm(r,'shd','hf');
    if(r.map.shd||r.map.fitem)r.setImg('hf','hand_grip');
  }
  const bow=r.map.fitem?.img==='bow', crossbow=r.map.wpn?.img==='crossbow';
  actor.enemyLauncher=bow||crossbow;
  if(actor.enemyLauncher) {
    const prefix='enemy_'+actor.id+'_';
    const aim=enemyAimPose(bow),release=enemyAimPose(bow,1);
    CLIPS[prefix+'aim']=keyClip([[0,P.standMon],[140,aim,'out'],[520,aim]],false,false);
    CLIPS[prefix+'shoot']=keyClip([[0,aim],[90,aim,'lin'],[125,release,'out'],[360,release],[600,P.standMon,'io']],false,false);
    actor.enemyActions.m_throwup=prefix+'aim';actor.enemyActions.m_throw=prefix+'shoot';
    if(bow)r.preparePose=p=>heroBowHand(r,p);
  }
  if(typeof installEnemySignature==='function')installEnemySignature(actor);
}
function enemyPose(actor,p) {
  if(typeof enemySpecialPose==='function')p=enemySpecialPose(actor,p);
  if(actor.enemySignature&&actor.rig.map.shd&&!actor.dead&&!['air','down','getup','dying','stagger'].includes(actor.state)) {
    p={...p,hf:-((p.rr||0)+(p.torso||0)+(p.uaf||0)+(p.faf||0))};
  }
  if(p.prone>0 && actor.enemyHumanoid) {
    p={...p};
    for(const name of ['tail','tail_0'])if(actor.rig.map[name])p[name]=110*p.prone;
  }
  if(actor.rig.def.kindWyrm && actor.state==='sp' && actor.sp?.type==='breath' && actor.sp.step>0) {
    const wind=actor.raged?650:900;
    const release=1-Math.max(0,Math.min(1,(actor.st-wind-1000)/300));
    p={...p,jaw:Math.max(p.jaw||0,35*release)};
  }
  if(actor.enemySignature||!actor.enemyHumanoid||actor.state!=='sp'||actor.castPulseAt===undefined)return p;
  const t=actor.st-actor.castPulseAt,k=Math.max(0,1-t/240);
  if(!k)return p;
  const hands=actor.id==='golem7'?{uab:lerp(p.uab||0,-90,k),fab:lerp(p.fab||0,-15,k)}:{};
  return {...p,...hands,torso:(p.torso||0)+10*k,head:(p.head||0)+4*k,
    uaf:lerp(p.uaf||0,-98,k),faf:lerp(p.faf||0,-15,k),rx:(p.rx||0)-3*k};
}
function enemyProjectileMuzzle(actor, rock=false) {
  const r=actor.rig;
  if(rock&&actor.state==='sp'&&actor.sp?.type==='cannon'&&r.map.cannon)return r.imagePoint('cannon',.9,.5);
  if(rock&&r.map.r_hand)return r.imagePoint('r_hand',.62,.5);
  if(actor.state==='cast'||actor.state==='sp'&&['orbs','beam'].includes(actor.sp?.type)) {
    if(actor.id==='golem7'&&r.map.core)return r.imagePoint('core',.5,.5);
    if(r.map.hf)return r.imagePoint('hf',.62,.5);
  }
  if(actor.enemyLauncher&&r.map.fitem)return r.imagePoint('fitem',.5,.5);
  if(actor.enemyLauncher&&r.map.wpn)return r.imagePoint('wpn',.9,.5);
  if(r.map.hb)return r.imagePoint('hb',.62,.5);
  if(r.map.head)return r.imagePoint('head',.75,.55);
  return {x:actor.x+actor.face*60,y:actor.y-actor.height*.55};
}
