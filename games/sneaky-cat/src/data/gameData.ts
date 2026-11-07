export const W = 450, H = 800;
export type ChapterId = 'home'|'mansion'|'smart'|'hotel'|'museum';
export type EnemyKind = 'owner'|'dog'|'guard';
export type EnemyState = 'IDLE'|'PATROL'|'SUSPICIOUS'|'INVESTIGATE'|'CHASE'|'SEARCH'|'RETURN';
export type TreasureKind = 'fish'|'toy'|'tuna'|'goldCan'|'necklace'|'legendFish';
export type InteractionKind = 'box'|'cup'|'roomba'|'door'|'toy'|'curtain'|'sofa'|'bed'|'closet'|'switch'|'highSpot';
export type UpgradeKey = 'quiet'|'speed'|'jump'|'stealth'|'sense';
export type SkinId = 'gray'|'cheese'|'black'|'white'|'tuxedo'|'calico'|'pirate'|'ninja';
export type Language = 'ko'|'en'|'ja'|'zh-CN'|'zh-TW'|'vi'|'th'|'es';
export type Vec = {x:number;y:number};
export type Rect = {x:number;y:number;w:number;h:number;kind?:string};
export type TreasureSpec = Vec & {kind:TreasureKind;required:boolean};
export type EnemySpec = Vec & {kind:EnemyKind;patrol:Vec[]};
export type InteractionSpec = Vec & {kind:InteractionKind;path?:Vec[]};
export type StageSpec = {id:number;chapter:number;chapterId:ChapterId;name:string;subtitle:string;time:number;goal:number;player:Vec;exit:Vec;obstacles:Rect[];treasures:TreasureSpec[];enemies:EnemySpec[];interactions:InteractionSpec[];camera?:Vec[];lasers?:Rect[]};

export const CHAPTERS = [
  {id:'home' as ChapterId,name:'작은 집',en:'Little House',color:0xf4b56a,accent:0x78c9ad,feature:'상자·컵·집주인'},
  {id:'mansion' as ChapterId,name:'부잣집',en:'Grand Mansion',color:0xdca4d7,accent:0x8a73c7,feature:'경비견·열쇠·고가 보물'},
  {id:'smart' as ChapterId,name:'스마트홈',en:'Smart Home',color:0x74d7e8,accent:0x477fb7,feature:'로봇청소기·카메라·전원'},
  {id:'hotel' as ChapterId,name:'고급 호텔',en:'Luxury Hotel',color:0xf2cb71,accent:0xa46f54,feature:'복수 경비·객실·타이밍'},
  {id:'museum' as ChapterId,name:'박물관',en:'Midnight Museum',color:0x73d6bd,accent:0x293e62,feature:'레이저·카메라·최종 보물'},
];
export const TREASURE_RULES:Record<TreasureKind,{name:string;score:number;color:number}>={fish:{name:'생선',score:100,color:0x63dbe5},toy:{name:'고양이 장난감',score:150,color:0xf78ab4},tuna:{name:'참치캔',score:200,color:0x79a9ed},goldCan:{name:'황금 캔',score:500,color:0xffcb52},necklace:{name:'보석 목걸이',score:800,color:0xdc7cff},legendFish:{name:'전설의 생선',score:1500,color:0x72f2c0}};
export const UPGRADE_DATA:Record<UpgradeKey,{name:string;desc:string}>={quiet:{name:'조용한 발걸음',desc:'이동 소음 감소'},speed:{name:'빠른 발',desc:'이동·달리기 속도 증가'},jump:{name:'민첩한 점프',desc:'높은 가구 활용'},stealth:{name:'은신 전문가',desc:'탐지 게이지 증가 감소'},sense:{name:'보물 감각',desc:'희귀 보물 위치 표시'}};
export const SKINS:{id:SkinId;name:string;color:number;cost:number}[]=[{id:'gray',name:'회색 줄무늬',color:0x85808b,cost:0},{id:'cheese',name:'치즈 고양이',color:0xf0ae48,cost:300},{id:'black',name:'검은 고양이',color:0x272534,cost:450},{id:'white',name:'흰 고양이',color:0xf2eee6,cost:550},{id:'tuxedo',name:'턱시도',color:0x383642,cost:700},{id:'calico',name:'삼색 고양이',color:0xd98d56,cost:900},{id:'pirate',name:'해적 고양이',color:0x6b5b52,cost:1200},{id:'ninja',name:'닌자 고양이',color:0x353550,cost:1500}];

const baseObstacles=(chapter:number,variant:number):Rect[]=>{
  const walls:Rect[]=[{x:225,y:64,w:410,h:18,kind:'wall'},{x:225,y:616,w:410,h:18,kind:'wall'},{x:22,y:340,w:18,h:570,kind:'wall'},{x:428,y:340,w:18,h:570,kind:'wall'}];
  const patterns:Rect[][]=[
    [{x:135,y:235,w:120,h:45,kind:'sofa'},{x:330,y:195,w:95,h:60,kind:'table'},{x:235,y:420,w:32,h:165,kind:'wall'},{x:92,y:500,w:92,h:48,kind:'bed'}],
    [{x:120,y:180,w:125,h:52,kind:'sofa'},{x:327,y:170,w:110,h:48,kind:'table'},{x:150,y:405,w:32,h:190,kind:'wall'},{x:330,y:430,w:120,h:55,kind:'bed'}],
    [{x:115,y:270,w:115,h:48,kind:'sofa'},{x:332,y:285,w:100,h:58,kind:'table'},{x:225,y:460,w:190,h:30,kind:'wall'},{x:92,y:525,w:90,h:46,kind:'bed'}],
  ];
  const chosen=patterns[variant%3].map(x=>({...x})); if(chapter>=3) chosen.push({x:325,y:510,w:90,h:36,kind:'desk'}); if(chapter===4) chosen.push({x:80,y:360,w:60,h:110,kind:'display'}); return walls.concat(chosen);
};
const path=(variant:number,side=0):Vec[]=>side===0?[{x:75,y:125},{x:365,y:125},{x:365,y:350+variant*18},{x:245,y:350+variant*18},{x:75,y:540}]:[{x:370,y:560},{x:285,y:400},{x:95,y:400},{x:95,y:170}];

export function createStage(id:number):StageSpec{
  const index=id-1, chapter=Math.floor(index/6), variant=index%6, meta=CHAPTERS[chapter];
  const required=1+Math.min(2,Math.floor(variant/2)), optional=1+Math.min(2,chapter), kinds:TreasureKind[][]=[['fish','toy','tuna'],['tuna','goldCan','necklace'],['tuna','goldCan','necklace'],['goldCan','necklace','tuna'],['goldCan','necklace','legendFish']];
  const positions=[{x:350,y:115},{x:330,y:360},{x:90,y:550},{x:360,y:550},{x:90,y:315}];
  const treasures:TreasureSpec[]=[]; for(let i=0;i<required+optional;i++) treasures.push({...positions[(i+variant)%positions.length],kind:kinds[chapter][i%3],required:i<required});
  const enemies:EnemySpec[]=[{kind:chapter>=3?'guard':'owner',x:80,y:125,patrol:path(variant)}]; if(chapter>=1) enemies.push({kind:'dog',x:365,y:540,patrol:path(variant,1)}); if(chapter>=3&&variant>=2) enemies.push({kind:'guard',x:225,y:340,patrol:[{x:225,y:145},{x:225,y:555}]});
  const interactions:InteractionSpec[]=[{kind:'box',x:65,y:275},{kind:'cup',x:330,y:220+variant*8},{kind:'curtain',x:395,y:95}]; if(chapter>=1) interactions.push({kind:'toy',x:120,y:560},{kind:'door',x:235,y:420}); if(chapter>=2) interactions.push({kind:'roomba',x:110,y:360,path:[{x:110,y:360},{x:350,y:360},{x:350,y:520},{x:110,y:520}]},{kind:'switch',x:390,y:300}); if(chapter>=3) interactions.push({kind:'closet',x:380,y:470},{kind:'highSpot',x:120,y:190});
  const cameras=chapter>=2?[{x:410,y:110},{x:40,y:540},...(chapter===4?[{x:410,y:400}]:[])]:undefined;
  const lasers=chapter===4?[{x:225,y:325,w:280,h:8},{x:225,y:475,w:260,h:8}]:undefined;
  return{id,chapter,chapterId:meta.id,name:`Stage ${id}`,subtitle:`${meta.name} · ${variant+1}`,time:95-Math.min(25,chapter*4+variant*2),goal:required,player:{x:65,y:570},exit:{x:385,y:575},obstacles:baseObstacles(chapter,variant),treasures,enemies,interactions,camera:cameras,lasers};
}
export const STAGES=Array.from({length:30},(_,i)=>createStage(i+1));
