// 🆕 스킬·각성 동작 크게 (rigProfile.skillScale): 서 있는 자세에서 벗어난 만큼을 배율로 키운다.
// 머리가 큰 새 그림은 팔다리가 짧아 같은 각도로 움직여도 작아 보인다. 시작·끝은 서 있는 자세라 툭 끊기지 않는다.
function cuteSkillScale(hero,p,base,scale){
  if(!scale||scale===1||!['skill','awaken'].includes(hero.state))return;
  for(const k of ['torso','head','uaf','faf','uab','fab','thf','shf','thb','shb'])if(p[k]!==undefined)p[k]=(base[k]||0)+(p[k]-(base[k]||0))*scale;
  for(const k of ['rx','bodyX','bodyY','hipX','hipY','stepF','stepB','liftF','liftB'])if(p[k])p[k]*=scale;
}
// Section-eight adapters for the existing humanoid/hero motion system.
// PNGs stay intact; all cutouts use atlas frames and class-specific attachment metadata.
var CuteHeroParts=(()=>{
  const EXPRESSIONS={head_attack:'attack',head_shout:'shout',head_hurt:'hurt',head_ko:'ko',head_blink:'blink',head_win:'victory',head_victory:'victory',head_surprise:'surprise'};
  const GEAR_HEIGHT={paladin:{wpn:105,shd:42},mage:{wpn:166},rogue:{wpn:62,fitem:55},ranger:{fitem:132},hexblade:{wpn:148}};
  function install(hero,atlas){
    const T={heads:'cute/heads',body4:'cute/body4',...(atlas.tex||{})};
    const key=hero.key,frames=atlas.body4.frames,profile=atlas.rigProfile||{};
    const old=hero.rig,base=hero.baseStand,torso=frames.torso_rig||frames.torso,pelvis=frames.pelvis;
    const arm=profile.armScale??.85,hand=profile.handScale??.72,foot=profile.footScale??.72;
    const fa=frames.forearm,ua=frames.upper_arm,th=frames.thigh,sh=frames.shin;
    const config={scale:1,height:800,footY:400,backTint:0xc6bdba,
      pelvisA:[.5,.23],waist:[0,-pelvis.h*.03],torsoA:[.5,.91],neck:[torso.w*.08,-torso.h*.76],headA:[.48,.94],
      shoulderB:[torso.w*.16,-torso.h*.58],shoulderF:[-torso.w*.24,-torso.h*.55],
      uaA:[.5,.15],uaLen:ua.h*.70*arm,faA:[.5,.13],faLen:fa.h*.72*arm,handA:[.5,.12],handIr:0,
      hipB:[pelvis.w*.13,pelvis.h*.12],hipF:[-pelvis.w*.14,pelvis.h*.12],
      thA:[.5,.15],thLen:th.h*.70,shA:[.5,.13],shLen:sh.h*.70,ftA:[.27,.12],
      gripImg:'hand_grip',frontHand:key==='mage'?'hand_open':'hand_grip'};
    if(key==='mage'){config.faA=[.18,.20];config.faLen=fa.w*.72*arm;config.handA=[.15,.5];config.handIr=90;}
    if(key==='paladin'){config.faA=[.66,.12];config.handA=[.16,.22];config.handIr=45;}
    if(key==='ranger'){config.faA=[.30,.13];config.handA=[.16,.32];config.handIr=70;}
    const def=humanoid(T.body4,config);
    def.clips=old.def.clips;def.procs=[];
    for(const b of def.bones){
      b.partFrame=b.n==='head'?'neutral':b.n==='torso'&&frames.torso_rig?'torso_rig':b.img;
      b.raw=true;b.img=b.n==='head'?T.heads:T.body4;
      if(/^(ua|fa)/.test(b.n))b.sc=arm;
      if(/^h[fb]$/.test(b.n))b.sc=hand;
      if(/^ft/.test(b.n))b.sc=foot;
      if(/^fa/.test(b.n))b.ir=key==='mage'?53:key==='paladin'?-15:key==='ranger'?23:0;
      if(key==='ranger'&&b.n==='hb')b.partFrame='hand_special';
    }
    for(const name of ['wpn','fitem','shd'])if(old.map[name]){
      const original=old.map[name];
      def.bones.push({...original,spr:undefined,img:original.img.includes('/')?original.img:key+'/'+original.img,raw:true});
    }
    const add=(name,part,parent,x,y,ax,ay,z,worldHeight,rest=0)=>{
      if(!frames[part])return;
      // rigProfile.partHeights lets each hero tune flowing pieces (cape, robe, tabard) to the reference art.
      worldHeight=profile.partHeights?.[name]??worldHeight;
      def.bones.push({n:name,p:parent,x,y,img:T.body4,partFrame:part,raw:true,ax,ay,z,worldHeight,r:rest});
    };
    if(key==='paladin'){
      add('tabard','tabard','root',pelvis.w*.07,pelvis.h*.02,.5,.05,56,85);
      add('braid','braid','head',0,0,.5,.04,6,100);
    }
    if(key==='mage'){
      add('skirt','robe','root',pelvis.w*.08,pelvis.h*.04,.5,.04,55,101);
      add('cape','cape','torso',-torso.w*.10,-torso.h*.73,.5,.06,2,119,-8);
      for(let i=0;i<3;i++){
        def.bones.push({n:'cr'+i,p:'torso',x:0,y:-torso.h*.90,img:T.body4,partFrame:'crystal_fire',raw:true,hide:true,z:1});
        add('crb'+i,['crystal_fire','crystal_ice','crystal_bolt'][i],'cr'+i,0,0,.5,.5,i===1?90:3,19);
        def.procs.push({n:'cr'+i,spin:.035,ph:i*120});
      }
    }
    if(key==='rogue'){
      add('cape','cape','torso',-torso.w*.13,-torso.h*.70,.62,.05,2,101,-12);
      add('scarf','scarf_tail','torso',-torso.w*.02,-torso.h*.72,.90,.30,4,25);
    }
    if(key==='ranger'){
      add('hair','hair','head',0,0,.66,.07,5,112);
      add('quiver','quiver','torso',-torso.w*.25,-torso.h*.50,.5,.35,7,73,-20);
    }
    if(key==='hexblade')add('cape','cape','torso',-torso.w*.14,-torso.h*.73,.65,.05,2,119,-16);
    const rig=new Rig(hero.scene,def);
    for(const b of rig.bones)if(b.partFrame)b.spr.setTexture(b.img,b.partFrame);
    old.destroy();hero.rig=rig;
    const head=rig.map.head,headWorldScale=atlas.headWorldHeight/atlas.headMetric.height;
    function measure(scale){
      def.scale=scale;head.sc=headWorldScale/scale;head.spr.setScale(head.sc);rig.apply(base);
      const s=head.spr,sn=Math.sin(s.rotation),cs=Math.cos(s.rotation);
      const top=Math.min(...[0,s.width].map(x=>s.y+(x-s.originX*s.width)*head.sc*sn+(atlas.headMetric.top-s.originY*s.height)*head.sc*cs));
      return(rig.lowest(['ftf','ftb'])-top)*scale;
    }
    let lo=.03,hi=2;
    for(let i=0;i<36;i++){const mid=(lo+hi)/2;if(measure(mid)<atlas.targetHeight)lo=mid;else hi=mid;}
    const scale=(lo+hi)/2,height=measure(scale);
    def.height=height/(scale*.92);
    for(const b of rig.bones){
      const target=GEAR_HEIGHT[key][b.n]||b.worldHeight;
      if(target){b.sc=target/(b.spr.height*scale);b.spr.setScale(b.sc);}
    }
    for(const name of ['braid','hair'])if(rig.map[name]){
      const b=rig.map[name],s=head.spr;
      b.x=((name==='braid'?.21:.23)-s.originX)*s.width*head.sc;
      b.y=((name==='braid'?.35:.12)-s.originY)*s.height*head.sc;
      def.procs.push({n:name,amp:name==='braid'?5:7,spd:.004,ph:25});
    }
    if(key==='mage')for(let i=0;i<3;i++)rig.map['crb'+i].x=47/scale;
    if(rig.map.scarf)def.procs.push({n:'scarf',amp:5,spd:.005,ph:90});
    if(rig.map.tabard)def.procs.push({n:'tabard',amp:3,spd:.005});
    if(rig.map.skirt)def.procs.push({n:'skirt',amp:3,spd:.005});
    configureHeroMotion(hero);
    const solve=rig.preparePose;
    const originalLeg=old.map.shf.y+old.map.ftf.y,motionScale=(config.thLen+config.shLen)/originalLeg;
    rig.preparePose=pose=>{
      if(rig.solvingSupport)return pose;
      let p={...pose};
      for(const name of ['bodyX','bodyY','hipX','hipY'])if(p[name])p[name]*=motionScale;
      if(rig.map.cape)p.cape=(p.cape||0)*(profile.capeSwing??.25)-(p.torso||0)*.75;
      const clip=CLIPS[hero.anim];
      // 다리 흔들림 배율: 달리기는 runSwing(보폭을 크게), 걷기는 gaitSwing
      const swing=/run/.test(hero.anim||'')?(profile.runSwing??profile.gaitSwing??.7):(profile.gaitSwing??.7);
      // ✏️ 두 다리의 가운데를 기준으로 늘린다 (서 있는 자세 기준이면 앞·뒷다리가 서로 다른 쪽으로 치우쳐 다리를 저는 것처럼 보임)
      if(clip?.amp)for(const [a,b]of [['thf','thb'],['shf','shb']]){const fa=p[a]??base[a],fb=p[b]??base[b],c=(fa+fb)/2;p[a]=c+(fa-c)*swing;p[b]=c+(fb-c)*swing;}
      if(key==='hexblade'&&clip?.amp){
        // Keep the heavy forward lean while letting the larger face look along the path.
        const parent=(p.rr||0)+(p.root||0)+(p.torso||0);
        p.head=Phaser.Math.Clamp(parent+(p.head||0),-12,14)-parent;
      }
      cuteSkillScale(hero,p,base,profile.skillScale);
      // 🆕 가드 자세 (rigProfile.guardPose): 새 그림에 맞춘 막는 자세의 관절 각도. 가드에 들어갈 때 90ms에 걸쳐 바뀐다.
      const gp=profile.guardPose;
      if(gp&&hero.state==='guard'){
        const w=Math.min(1,(hero.st||0)/90);
        for(const [k,v]of Object.entries(gp))p[k]=(p[k]||0)+(v-(p[k]||0))*w;
      }
      // 🆕 자세 바로 세우기 (rigProfile.upright): 머리가 큰 새 그림은 같은 각도로 숙여도 훨씬 쏠려 보인다.
      // 서 있기·걷기·달리기에서 몸통 숙임을 줄이고 머리를 세운다. 공격으로 넘어갈 때 툭 바뀌지 않게 서서히.
      const up=profile.upright;
      if(up){
        const want=['idle','move'].includes(hero.state)?1:0,now=hero.scene.now||0;
        if(hero.uprightClock!==now){hero.uprightK=(hero.uprightK??want)+(want-(hero.uprightK??want))*Math.min(1,(hero.scene.dtv||16.67)/120);hero.uprightClock=now;}
        const k=hero.uprightK||0;
        if(k>0){
          const lean=p.torso||0;p.torso=lean+(lean*(up.torso??1)-lean)*k;
          const parent=(p.rr||0)+(p.root||0)+(p.torso||0),world=parent+(p.head||0);
          const fixed=Phaser.Math.Clamp(world,up.headMin??-90,up.headMax??90);
          p.head=(p.head||0)+(fixed-world)*k;
        }
      }
      if(key==='mage')for(let i=0;i<3;i++)p['crb'+i]=-(p['cr'+i]||0)-(p.torso||0);
      if(solve)p=solve(p);
      return p;
    };
    rig.measure(base);
    hero.setHead=img=>{
      const frame=EXPRESSIONS[img]||'neutral';
      if(hero.cuteHeadFrame!==frame){head.spr.setTexture(T.heads,frame);hero.cuteHeadFrame=frame;}
    };
    hero.cuteHeadFrame='neutral';hero.blink=2400;hero.habitT=Infinity;
    const rate=hero.animRate.bind(hero);
    hero.animRate=()=>{
      const clip=CLIPS[hero.anim],baseRate=rate(),swing=/run/.test(hero.anim||'')?(profile.runSwing??profile.gaitSwing??.7):(profile.gaitSwing??.7);
      return clip?.amp?Math.min(2.6,baseRate*Math.sin(clip.amp*D2R)/Math.sin(clip.amp*swing*D2R)):baseRate;
    };
    hero.anim=null;hero.blendFrom=null;hero.play('idle',0);
    return{height,headHeight:atlas.headWorldHeight,headWorldScale,ratio:height/atlas.headWorldHeight,motionScale,hero:key};
  }
  return{install};
})();
