// Harvan prototype cutouts. Original PNGs remain intact; atlas frames select painted pieces.
var HarvanCuteParts=(()=>{
  // 텍스처 이름: 게임은 atlas.tex(직업별), 비교 도구는 기본값 cute/heads·cute/body4
  const TEX=atlas=>({heads:'cute/heads',body4:'cute/body4',body35:'cute/body35',...(atlas.tex||{})});
  function register(scene,atlas){
    for(const name of ['heads','body4','body35']){
      if(!atlas[name])continue;
      const texture=scene.textures.get(TEX(atlas)[name]);
      for(const [frame,b]of Object.entries(atlas[name].frames))if(!texture.has(frame))texture.add(frame,0,b.x,b.y,b.w,b.h);
    }
  }
  function install(hero,ratio,atlas){
    if(atlas.version===5)return CuteHeroParts.install(hero,atlas);
    const group=atlas.rigProfile?.bodyGroup||(ratio===4?'body4':'body35'),texture=TEX(atlas)[group],headTex=TEX(atlas).heads,frames=atlas[group].frames;
    const profile=atlas.rigProfile||{},armScale=profile.armScale??1;
    const torso=frames.torso,pelvis=frames.pelvis,ua=frames.upper_arm,fa=frames.forearm,thigh=frames.thigh,shin=frames.shin;
    const def=humanoid(texture,{
      scale:1,footY:400,height:800,
      pelvisA:[.5,.25],waist:[0,-pelvis.h*.05],torsoA:[.5,.88],neck:[torso.w*.05,-torso.h*.74],headA:[.46,.97],
      shoulderB:[torso.w*.13,-torso.h*.48],shoulderF:[-torso.w*.25,-torso.h*.46],
      uaA:[.5,.15],uaLen:ua.h*.70*armScale,faA:[.5,.13],faLen:fa.h*.72*armScale,handA:[.5,.12],handIr:0,
      hipB:[pelvis.w*.11,pelvis.h*.20],hipF:[-pelvis.w*.14,pelvis.h*.20],
      thA:[.5,.15],thLen:thigh.h*.70,shA:[.5,.13],shLen:shin.h*.70,ftA:[.27,.12],
      gripImg:'hand_grip',frontHand:'hand_grip',
      cape:{at:[-torso.w*.15,-torso.h*.74],a:[.5,.06],sc:2},
      weapon:{img:'weapon_0',at:[0,0],a:[.5,.86],sc:1,ir:90},shield:{img:'shield_0',at:[0,0],sc:1},
    });
    for(const b of def.bones){
      b.partFrame=b.img;b.raw=true;
      b.img=b.n==='head'?headTex:['wpn','shd'].includes(b.n)?'warrior/'+b.img:texture;
      if(['uab','uaf','fab','faf'].includes(b.n))b.sc=armScale;
      if(['hf','hb'].includes(b.n))b.sc=profile.handScale??.65;
      if(['ftf','ftb'].includes(b.n))b.sc=profile.footScale??1;
      if(b.n==='cape'){b.sc=profile.capeScale??2;if(profile.capeAnchor)[b.ax,b.ay]=profile.capeAnchor;}
      if(b.n==='uaf')b.z=58;
    }
    const rig=new Rig(hero.scene,def);
    for(const b of rig.bones){
      if(b.n==='head')b.spr.setTexture(headTex,'neutral');
      else if(!['wpn','shd'].includes(b.n))b.spr.setTexture(texture,b.partFrame);
    }
    hero.rig.destroy();hero.rig=rig;
    const head=rig.map.head,headWorldScale=atlas.headWorldHeight/atlas.headMetric.height;
    function measure(scale){
      rig.def.scale=scale;head.sc=headWorldScale/scale;head.spr.setScale(head.sc);rig.apply(HARVAN_STAND);
      const s=head.spr,cos=Math.cos(s.rotation),sin=Math.sin(s.rotation);
      let top=Infinity;
      for(const x of [0,s.width]){
        const lx=(x-s.originX*s.width)*head.sc,ly=(atlas.headMetric.top-s.originY*s.height)*head.sc;
        top=Math.min(top,s.y+lx*sin+ly*cos);
      }
      return(rig.lowest(['ftf','ftb'])-top)*scale;
    }
    let lower=.03,upper=2;
    const target=ratio*atlas.headWorldHeight;
    for(let i=0;i<35;i++){
      const mid=(lower+upper)/2;
      if(measure(mid)<target)lower=mid;else upper=mid;
    }
    const scale=(lower+upper)/2,height=measure(scale);
    rig.def.height=height/(scale*.92);
    for(const [name,worldScale]of [['wpn',profile.weaponWorldScale??.65],['shd',profile.shieldWorldScale??.78]]){
      const b=rig.map[name];b.sc=worldScale/scale;b.spr.setScale(b.sc);
    }
    harvanGripRig(rig);
    for(const [item,handName]of [['wpn','hb'],['shd','hf']]){
      const hand=rig.map[handName],s=hand.spr,b=rig.map[item];
      b.p=handName;b.x=(.68-s.originX)*s.width*hand.sc;b.y=(.74-s.originY)*s.height*hand.sc;
    }
    const plant=rig.preparePose,motionScale=(thigh.h*.7+shin.h*.7)/(82+92);
    rig.preparePose=pose=>{
      const p={...pose};
      for(const key of ['hipX','hipY','stepF','stepB','liftF','liftB','bodyX','bodyY'])if(p[key])p[key]*=motionScale;
      // This cape is painted hanging left/down; a full run rotation lifts it above the head.
      if(profile.capeSwing)p.cape=(p.cape||0)*profile.capeSwing-(p.torso||0)*(1-profile.capeSwing);
      // Optional resting tilt so the cape hangs down like the first-round art instead of flaring back.
      if(profile.capeTilt)p.cape=(p.cape||0)+profile.capeTilt;
      const gait=['walk','run','harvan_brake'].includes(hero.anim);
      // 다리 흔들림 배율: 달리기는 runSwing(보폭을 크게), 걷기는 gaitSwing
      const swing=/run/.test(hero.anim||'')?(profile.runSwing??profile.gaitSwing):profile.gaitSwing;
      if(gait&&swing){
        for(const key of ['thf','thb','shf','shb'])p[key]=HARVAN_STAND[key]+((p[key]??HARVAN_STAND[key])-HARVAN_STAND[key])*swing;
      }
      // The new wrist-up hand sits lower than the old grip. Carry the blade clear of the floor.
      if(profile.alignCarry){
        const bodyAngle=(p.rr||0)+(p.root||0)+(p.torso||0)+(p.uab||0)+(p.fab||0)+(p.wpn||0)+90;
        const current=bodyAngle+(p.hb||0),carrying=['idle','move','guard','land'].includes(hero.state);
        if(carrying){
          const goal=gait?-90:90;
          if(hero.carryBladeAngle===undefined)hero.carryBladeAngle=goal;
          if(hero.carryBladeClock!==hero.scene.now){
            const delta=((goal-hero.carryBladeAngle+540)%360)-180;
            hero.carryBladeAngle+=delta*Math.min(1,(hero.scene.dtv||16.67)/100);
            hero.carryBladeClock=hero.scene.now;
          }
          p.hb=(p.hb||0)+(((hero.carryBladeAngle-current+540)%360)-180);
          if(hero.lastPose)hero.lastPose.hb=p.hb;
        }else{hero.carryBladeAngle=current;hero.carryBladeClock=hero.scene.now;}
      }else if(['idle','move','guard','land'].includes(hero.state))p.hb=(p.hb||0)-55;
      return plant(p);
    };
    rig.measure(HARVAN_STAND);
    const expressions={head_attack:'attack',head_shout:'shout',head_hurt:'hurt',head_ko:'ko',head_blink:'blink',head_win:'victory',head_victory:'victory',head_surprise:'surprise'};
    hero.setHead=image=>{
      const frame=expressions[image]||'neutral';
      if(hero.cuteHeadFrame!==frame){head.spr.setTexture(headTex,frame).setOrigin(.46,.97);hero.cuteHeadFrame=frame;}
    };
    hero.cuteHeadFrame='neutral';hero.blink=2400;hero.habitT=Infinity;
    if(profile.gaitSwing){
      const rate=hero.animRate.bind(hero);
      hero.animRate=()=>{
        const clip=CLIPS[hero.anim],base=rate();
        const swing=/run/.test(hero.anim||'')?(profile.runSwing??profile.gaitSwing):profile.gaitSwing;
        return clip?.amp?Math.min(2.6,base*Math.sin(clip.amp*D2R)/Math.sin(clip.amp*swing*D2R)):base;
      };
    }
    hero.anim=null;hero.blendFrom=null;hero.play('idle',0);
    return{targetRatio:ratio,ratio:height/atlas.headWorldHeight,height,headHeight:atlas.headWorldHeight,headWorldScale,motionScale,source:group};
  }
  return{register,install};
})();
