(function(root,factory){if(typeof module==='object')module.exports=factory();else root.Forest=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ACTIVITIES={
    garden:{name:'씨앗 돌보기',place:'작은 텃밭',verb:'새싹에게 물을 주는 중',icon:'☘',trait:'식물 친구',gifts:['flower','berry'],stories:['매일 인사해 줬더니 꽃이 피었어. 네가 제일 잘 보이는 곳에 놓아 줄래?','물을 너무 많이 줬나 봐. 그래도 작은 열매가 열렸어! 첫 열매는 네 거야.']},
    craft:{name:'꼬물꼬물 만들기',place:'햇살 작업대',verb:'무언가 뚝딱 만드는 중',icon:'♧',trait:'꼬마 발명가',gifts:['chair','shelf'],stories:['너 앉으라고 의자를 만들었어. 조금 기울었지만… 내가 꼭 잡아 줄게.','우리 이야기를 꽂아 둘 책장이야. 아직 빈칸이 많으니까, 오래 같이 살자.']},
    explore:{name:'숲길 산책하기',place:'바람 부는 숲길',verb:'숲에서 보물을 찾는 중',icon:'✧',trait:'숲속 모험가',gifts:['lantern','moon'],stories:['돌아오는 길에 작은 빛을 만났어. 밤에도 우리 집이 따뜻했으면 좋겠어.','숲속 할머니가 달 조각을 주셨어. 안고 자면 좋은 꿈을 꾼대.']}
  };
  const GIFTS={
    flower:{name:'첫 인사 화분',index:0,from:'garden',use:'꽃한테도 네 얘기를 해 줬어.',pose:'happy'},
    chair:{name:'조금 삐뚤한 의자',index:1,from:'craft',use:'흔들려도 괜찮아. 여기 앉아 너를 기다릴래.',pose:'sleep'},
    lantern:{name:'숲빛 유리병',index:2,from:'explore',use:'반짝, 반짝. 오늘 찾은 빛을 같이 보자.',pose:'happy'},
    berry:{name:'첫 열매 나무',index:3,from:'garden',use:'하나, 둘… 너랑 나눠 먹으려고 세는 중이야.',pose:'happy'},
    shelf:{name:'우리 이야기 책장',index:4,from:'craft',use:'오늘도 좋은 이야기가 한 장 늘었네.',pose:'sleep'},
    moon:{name:'꿈꾸는 달 쿠션',index:5,from:'explore',use:'네가 옆에 있으니까 잠이 솔솔 와…',pose:'sleep'}
  };
  function fresh(now=Date.now()){return {version:1,name:'모리',created:now,xp:0,counts:{garden:0,craft:0,explore:0},inventory:[],slots:[null,null,null],journal:[],active:null,pending:null,petAt:0,checkins:{},settings:{demo:true,sound:false}};}
  function restore(raw,now=Date.now()){
    try{const s=typeof raw==='string'?JSON.parse(raw):raw;if(!s||s.version!==1) return fresh(now);
      const base=fresh(now);const out={...base,...s,counts:{...base.counts,...s.counts},settings:{...base.settings,...s.settings}};
      out.name=typeof s.name==='string'?s.name.slice(0,12):'모리';out.inventory=Array.isArray(s.inventory)?[...new Set(s.inventory.filter(k=>GIFTS[k]))]:[];
      out.slots=Array.from({length:3},(_,i)=>out.inventory.includes(s.slots?.[i])?s.slots[i]:null);
      out.journal=Array.isArray(s.journal)?s.journal.slice(0,100):[];out.xp=Number.isFinite(s.xp)?Math.max(0,s.xp):0;
      if(out.active&&(!ACTIVITIES[out.active.type]||!Number.isFinite(out.active.ends)))out.active=null;
      if(out.pending&&(!GIFTS[out.pending.gift]||!ACTIVITIES[out.pending.type]))out.pending=null;
      return out;
    }catch{return fresh(now);}
  }
  class Life{
    constructor(state,now=Date.now()){this.s=state?restore(state,now):fresh(now);}
    get level(){return Math.floor(this.s.xp/100)+1;}
    get trait(){const list=Object.entries(this.s.counts).sort((a,b)=>b[1]-a[1]);return list[0][1]===0?'아직 알아가는 사이':list[0][1]===list[1][1]?'호기심 많은 친구':ACTIVITIES[list[0][0]].trait;}
    start(type,now=Date.now()){
      if(!ACTIVITIES[type]||this.s.active||this.s.pending)return false;
      this.s.active={type,started:now,ends:now+(this.s.settings.demo?20000:1800000)};return true;
    }
    tick(now=Date.now()){
      const a=this.s.active;if(!a||now<a.ends)return false;
      const count=this.s.counts[a.type],activity=ACTIVITIES[a.type],index=count%2;
      this.s.pending={type:a.type,gift:activity.gifts[index],story:activity.stories[index],at:a.ends};this.s.active=null;return true;
    }
    previewFinish(now=Date.now()){if(!this.s.settings.demo||!this.s.active)return false;this.s.active.ends=now;return this.tick(now);}
    claim(now=Date.now()){
      const p=this.s.pending;if(!p)return null;const isNew=!this.s.inventory.includes(p.gift);
      if(isNew)this.s.inventory.push(p.gift);this.s.counts[p.type]++;this.s.xp+=40;
      this.s.journal.unshift({kind:'gift',at:now,...p,isNew});this.s.journal=this.s.journal.slice(0,100);this.s.pending=null;
      return {...p,isNew};
    }
    place(gift,slot){if(!this.s.inventory.includes(gift)||!Number.isInteger(slot)||slot<0||slot>2)return false;
      this.s.slots=this.s.slots.map(x=>x===gift?null:x);this.s.slots[slot]=gift;return true;}
    remove(slot){if(!Number.isInteger(slot)||slot<0||slot>2)return false;this.s.slots[slot]=null;return true;}
    pet(now=Date.now()){if(this.s.petAt&&now-this.s.petAt<45000)return false;this.s.petAt=now;this.s.xp+=5;return true;}
    checkin(day,mood,now=Date.now()){
      if(!['calm','busy','tired'].includes(mood))return false;
      const first=!this.s.checkins[day];this.s.checkins[day]=mood;if(first){this.s.xp+=10;this.s.journal.unshift({kind:'checkin',at:now,mood});this.s.journal=this.s.journal.slice(0,100);}return true;
    }
  }
  return {Life,ACTIVITIES,GIFTS,fresh,restore};
});
