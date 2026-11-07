import Phaser from 'phaser';
import './style.css';

const W=450,H=800,TILE=32,COLS=14,ROWS=76,SAVE_KEY='mini-dungeon-digger-v1';
type TileKind='dirt'|'stone'|'hard'|'iron'|'gold'|'gem'|'explosive'|'crystal'|'unstable'|'trap';
type TileData={kind:TileKind;hp:number;maxHp:number;row:number;col:number;shape:Phaser.GameObjects.Rectangle;body:Phaser.Physics.Arcade.Image};
type Upgrades={drill:number;battery:number;bag:number;detector:number;bomb:number};
type Persist={gold:number;up:Upgrades;best:number;runs:number};
type Cargo={stone:number;iron:number;gold:number;gem:number};

const TILE_INFO:Record<TileKind,{color:number;hp:number;energy:number;reward?:keyof Cargo;label?:string}>={
  dirt:{color:0x765038,hp:1,energy:1},stone:{color:0x5f5c6b,hp:2,energy:2,reward:'stone'},hard:{color:0x3c3b49,hp:4,energy:4},
  iron:{color:0x6d6872,hp:3,energy:2,reward:'iron'},gold:{color:0xd39a32,hp:4,energy:3,reward:'gold'},gem:{color:0x43cfff,hp:5,energy:3,reward:'gem'},
  explosive:{color:0xe34b44,hp:2,energy:2,label:'!'},crystal:{color:0x9b5cff,hp:3,energy:2,reward:'gem'},unstable:{color:0x8a6048,hp:2,energy:2,label:'▼'},trap:{color:0x322c38,hp:1,energy:1,label:'⌃'},
};
const PRICES:Record<keyof Cargo,number>={stone:2,iron:6,gold:14,gem:35};
function style(size=16,color='#fff'):Phaser.Types.GameObjects.Text.TextStyle{return{fontFamily:'Inter, Noto Sans KR, sans-serif',fontSize:`${size}px`,color,fontStyle:'bold'};}
function load():Persist{try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'') as Persist;if(s.up)return s;}catch{/*new*/}return{gold:0,up:{drill:0,battery:0,bag:0,detector:0,bomb:0},best:0,runs:0};}
function store(s:Persist){localStorage.setItem(SAVE_KEY,JSON.stringify(s));}

class DiggerScene extends Phaser.Scene{
  persist:Persist=load(); mode:'base'|'explore'|'result'='base'; content!:Phaser.GameObjects.Container;
  player!:Phaser.Physics.Arcade.Sprite; staticGroup!:Phaser.Physics.Arcade.StaticGroup; tiles=new Map<string,TileData>(); monsters:Phaser.Physics.Arcade.Sprite[]=[];
  energy=100;maxEnergy=100;health=3;bombs=2;cargo:Cargo={stone:0,iron:0,gold:0,gem:0};cargoCount=0;capacity=18;depth=0;runStart=0;
  hud!:Phaser.GameObjects.Container;energyBar!:Phaser.GameObjects.Rectangle;depthText!:Phaser.GameObjects.Text;cargoText!:Phaser.GameObjects.Text;heartText!:Phaser.GameObjects.Text;
  stickPointer=-1;stickOrigin=new Phaser.Math.Vector2(82,690);move=new Phaser.Math.Vector2();aim=new Phaser.Math.Vector2(0,1);stickKnob!:Phaser.GameObjects.Arc;mineButton!:Phaser.GameObjects.Arc;bombButton!:Phaser.GameObjects.Arc;
  mining=false;lastMine=0;keys!:Record<string,Phaser.Input.Keyboard.Key>;over=false;
  audio?:AudioContext;
  constructor(){super('digger');}
  create(){this.makeTextures();this.showBase();}
  makeTextures(){
    const g=this.add.graphics();g.fillStyle(0xf4b45b).fillCircle(24,18,15).fillStyle(0x603d2d).fillRect(11,18,26,20).fillStyle(0xffdd72).fillEllipse(24,12,39,13).fillRect(18,3,22,12).fillStyle(0xffffff).fillCircle(29,19,4).fillStyle(0x22202a).fillCircle(30,19,2).fillStyle(0x8d5b38).fillRect(8,33,32,13).generateTexture('miner',48,50);g.clear();
    g.fillStyle(0x8f55dc).fillEllipse(24,27,38,25).fillTriangle(7,21,0,8,17,18).fillTriangle(31,18,48,8,41,21).fillStyle(0xff5b65).fillCircle(18,25,3).fillCircle(30,25,3).generateTexture('bat',48,44);g.clear();
    g.fillStyle(0x4cc7a7).fillEllipse(24,29,40,27).fillStyle(0xff6b70).fillCircle(18,26,3).fillCircle(30,26,3).generateTexture('mole',48,48);g.destroy();
  }
  clearScreen(){this.children.getChildren().slice().forEach(o=>o.destroy());this.staticGroup?.clear(true,true);this.tiles.clear();this.monsters=[];this.over=false;this.cameras.main.stopFollow();this.cameras.main.scrollY=0;this.physics.world.colliders.destroy();}
  showBase(){
    this.clearScreen();this.mode='base';this.cameras.main.setBackgroundColor('#14101d');
    this.add.circle(360,90,150,0xffa42e,0.12);this.add.text(24,42,'MINI DUNGEON',style(31,'#ffc65c')).setStroke('#4c2730',5);this.add.text(26,79,'DIGGER',style(43,'#ff9458')).setStroke('#4c2730',6);this.add.text(28,132,'미니 던전 디거',style(18,'#ffe7b0'));
    const miner=this.add.image(338,155,'miner').setScale(2.15);this.tweens.add({targets:miner,y:145,yoyo:true,repeat:-1,duration:900,ease:'Sine.inOut'});
    this.add.rectangle(225,255,410,112,0x241a2c).setStrokeStyle(2,0x5c3f65);
    this.add.text(38,216,'지상 기지',style(15,'#ffc65c'));this.add.text(38,246,`보유 골드  ${this.persist.gold} G`,style(23));this.add.text(38,282,`최고 깊이  ${this.persist.best}m  ·  탐험 ${this.persist.runs}회`,style(11,'#a995b3'));
    this.add.text(24,330,'장비 업그레이드',style(16));
    const defs:[keyof Upgrades,string,string][]=[['drill','드릴','채굴 피해'],['battery','배터리','최대 에너지'],['bag','가방','보관량'],['detector','탐지기','희귀 광물 표시'],['bomb','폭탄','시작 폭탄']];
    defs.forEach((d,i)=>{const y=378+i*58,lv=this.persist.up[d[0]],cost=30+lv*35;const card=this.add.rectangle(225,y,410,48,0x211a29).setStrokeStyle(1,0x4d3b55);this.add.text(35,y-13,`${d[1]}  Lv.${lv}`,style(13,'#fff'));this.add.text(35,y+7,d[2],style(9,'#9f8ba9'));const btn=this.add.rectangle(371,y,82,32,this.persist.gold>=cost?0xffb347:0x443745).setInteractive();this.add.text(371,y,`${cost}G`,style(11,this.persist.gold>=cost?'#261722':'#837485')).setOrigin(.5);btn.on('pointerdown',()=>{if(this.persist.gold>=cost&&lv<5){this.persist.gold-=cost;this.persist.up[d[0]]++;store(this.persist);this.showBase();}});card.setInteractive().on('pointerdown',()=>btn.emit('pointerdown'));});
    const start=this.add.rectangle(225,704,360,66,0xff9f43).setStrokeStyle(3,0xffd37f).setInteractive();this.add.text(225,696,'새 탐험 시작',style(19,'#2c1822')).setOrigin(.5);this.add.text(225,722,'더 깊을수록 위험과 보상이 커집니다',style(9,'#5d3540')).setOrigin(.5);start.on('pointerdown',()=>this.startRun());
  }
  startRun(){
    this.clearScreen();this.mode='explore';this.persist.runs++;store(this.persist);this.energy=this.maxEnergy=100+this.persist.up.battery*20;this.capacity=18+this.persist.up.bag*7;this.bombs=2+this.persist.up.bomb;this.health=3;this.cargo={stone:0,iron:0,gold:0,gem:0};this.cargoCount=0;this.depth=0;this.runStart=this.time.now;
    this.cameras.main.setBackgroundColor('#100c17');this.physics.world.gravity.y=520;this.physics.world.setBounds(0,0,COLS*TILE,ROWS*TILE+100);
    this.staticGroup=this.physics.add.staticGroup();this.generateWorld();
    this.player=this.physics.add.sprite(7*TILE+16,100,'miner').setDepth(25).setCollideWorldBounds(true).setSize(28,42).setOffset(10,7);this.physics.add.collider(this.player,this.staticGroup);this.cameras.main.startFollow(this.player,false,0.08,0.1,0,-120);this.cameras.main.setBounds(0,0,W,ROWS*TILE+100);
    this.spawnMonsters();this.addHud();this.setupInput();this.toast('지금 돌아갈까, 조금 더 내려갈까?');
  }
  generateWorld(){
    this.add.rectangle(W/2,55,W,110,0x38243b).setDepth(-1);this.add.rectangle(W/2,90,210,50,0x664137).setStrokeStyle(3,0x2b1b25);this.add.text(W/2,60,'SURFACE BASE',style(13,'#ffd27a')).setOrigin(.5);
    let shaft=7;
    for(let row=4;row<ROWS;row++){
      if(row>4&&row%4===0)shaft=Phaser.Math.Clamp(shaft+Phaser.Math.RND.pick([-2,-1,1,2]),2,COLS-3);
      for(let col=0;col<COLS;col++){
        const cave=col===shaft||(row>20&&Math.random()<0.07)||(row%13===0&&col>2&&col<COLS-2);
        if(cave)continue;
        const depth=row*4;let kind:TileKind='dirt';const r=Math.random();
        if(depth>180&&r<.23)kind='hard';else if(depth>80&&r<.36)kind='stone';else if(r<.18)kind='stone';
        const risk=Math.min(.22,depth/1500);
        if(r>.93-risk)kind=depth>160?'gem':'gold';else if(r>.84-risk)kind='iron';else if(r>.975)kind='explosive';else if(depth>90&&r>.955)kind='crystal';else if(depth>120&&r>.915&&r<.94)kind='unstable';else if(depth>100&&r>.89&&r<.91)kind='trap';
        this.createTile(row,col,kind);
      }
    }
    for(let c=0;c<COLS;c++)if(!this.tiles.has(`4,${c}`)&&Math.abs(c-7)>1)this.createTile(4,c,'dirt');
  }
  createTile(row:number,col:number,kind:TileKind){
    const info=TILE_INFO[kind],x=col*TILE+TILE/2,y=row*TILE+TILE/2;const shape=this.add.rectangle(x,y,TILE-1,TILE-1,info.color).setDepth(3).setStrokeStyle(1,0x17121c,.65);
    if(kind==='iron'){this.add.circle(x-6,y-4,5,0xb7b2bd).setDepth(4);this.add.circle(x+7,y+5,4,0x9c98a3).setDepth(4);}else if(kind==='gold'){this.add.polygon(x,y,[0,-9,9,-3,6,8,-7,7,-10,-2],0xffd85a).setDepth(4);}else if(kind==='gem'||kind==='crystal'){this.add.polygon(x,y,[0,-12,8,-3,5,11,-6,10,-9,-3],kind==='gem'?0x8fffff:0xd28aff).setDepth(4);if(this.persist.up.detector>0)shape.setStrokeStyle(2,0x7ffaff,.7);}else if(info.label)this.add.text(x,y,info.label,style(14,kind==='explosive'?'#ffd27a':'#d0b3d6')).setOrigin(.5).setDepth(4);
    const body=this.staticGroup.create(x,y,undefined).setVisible(false) as Phaser.Physics.Arcade.Image;body.setSize(TILE,TILE).refreshBody();const hp=info.hp+(row>50&&kind==='hard'?1:0);this.tiles.set(`${row},${col}`,{kind,hp,maxHp:hp,row,col,shape,body});
  }
  spawnMonsters(){
    for(let row=25;row<ROWS;row+=14){const candidates=[...Array(COLS).keys()].filter(c=>!this.tiles.has(`${row},${c}`)&&!this.tiles.has(`${row+1},${c}`));if(!candidates.length)continue;const col=Phaser.Math.RND.pick(candidates),kind=row%28?'bat':'mole',m=this.physics.add.sprite(col*TILE+16,row*TILE+16,kind).setDepth(20).setSize(30,28);m.setData('kind',kind);m.setData('hp',kind==='bat'?20:35);m.body!.allowGravity=kind==='mole';this.physics.add.collider(m,this.staticGroup);this.monsters.push(m);}
  }
  addHud(){
    this.hud=this.add.container(0,0).setScrollFactor(0).setDepth(100);this.hud.add(this.add.rectangle(225,35,450,70,0x0b0910,.96));
    this.heartText=this.add.text(16,12,'♥ ♥ ♥',style(15,'#ff6174'));this.depthText=this.add.text(430,10,'↓ 0m',style(17,'#fff')).setOrigin(1,0);this.hud.add([this.heartText,this.depthText,this.add.text(16,40,'⚡',style(15,'#b4ff65')),this.add.rectangle(114,49,168,13,0x262032).setOrigin(.5),]);
    this.energyBar=this.add.rectangle(30,49,168,11,0x75e65c).setOrigin(0,.5);this.cargoText=this.add.text(430,42,`가방 0/${this.capacity}`,style(10,'#b8a7c2')).setOrigin(1,0);this.hud.add([this.energyBar,this.cargoText]);
    const ret=this.add.rectangle(225,85,124,30,0x33263a,.92).setStrokeStyle(1,0x775b81).setInteractive();const rt=this.add.text(225,85,'↑ 지상 귀환',style(10,'#ffe0a2')).setOrigin(.5);this.hud.add([ret,rt]);ret.on('pointerdown',()=>this.confirmReturn(false));
    const base=this.add.circle(82,690,55,0x050408,.55).setStrokeStyle(2,0xffffff,.15);this.stickKnob=this.add.circle(82,690,24,0xffffff,.18).setStrokeStyle(2,0xffffff,.2);this.mineButton=this.add.circle(360,682,52,0xffa640,.9).setStrokeStyle(4,0xffdb8c,.5).setInteractive();this.bombButton=this.add.circle(370,588,34,0xe75353,.9).setStrokeStyle(3,0xff9a8f,.5).setInteractive();this.hud.add([base,this.stickKnob,this.mineButton,this.add.text(360,682,'⛏\n채굴',style(13,'#2b1720')).setOrigin(.5),this.bombButton,this.add.text(370,588,`● ${this.bombs}`,style(12)).setOrigin(.5)]);
  }
  setupInput(){
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(this.over)return;if(p.x<W*.52&&p.y>540){this.stickPointer=p.id;this.stickOrigin.set(p.x,p.y);this.stickKnob.setPosition(p.x,p.y);}});
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(p.id!==this.stickPointer||!p.isDown)return;this.move.set(p.x-this.stickOrigin.x,p.y-this.stickOrigin.y).limit(48).scale(1/48);if(this.move.length()>.25)this.aim.copy(this.move).normalize();this.stickKnob.setPosition(this.stickOrigin.x+this.move.x*35,this.stickOrigin.y+this.move.y*35);});
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(p.id===this.stickPointer){this.stickPointer=-1;this.move.set(0,0);this.stickKnob.setPosition(82,690);}this.mining=false;});
    this.mineButton.on('pointerdown',()=>{this.mining=true;this.mine();});this.mineButton.on('pointerup',()=>this.mining=false);this.bombButton.on('pointerdown',()=>this.useBomb());
    this.keys=this.input.keyboard!.addKeys('A,D,W,S,LEFT,RIGHT,UP,DOWN,SPACE,B,R') as Record<string,Phaser.Input.Keyboard.Key>;this.keys.SPACE.on('down',()=>this.mine());this.keys.B.on('down',()=>this.useBomb());this.keys.R.on('down',()=>this.confirmReturn(false));
  }
  update(time:number,dt:number){
    if(this.mode!=='explore'||this.over)return;const left=this.keys.A.isDown||this.keys.LEFT.isDown,right=this.keys.D.isDown||this.keys.RIGHT.isDown,up=this.keys.W.isDown||this.keys.UP.isDown;const vx=(right?1:0)-(left?1:0)||this.move.x;
    this.player.setVelocityX(vx*145);if((up||this.move.y<-.55)&&this.player.body!.blocked.down)this.player.setVelocityY(-285);if(Math.abs(vx)>.15)this.player.setFlipX(vx<0);
    if(this.mining&&time-this.lastMine>240)this.mine();
    this.depth=Math.max(0,Math.floor((this.player.y-110)/TILE)*4);this.persist.best=Math.max(this.persist.best,this.depth);this.depthText.setText(`↓ ${this.depth}m`);this.energyBar.setScale(Math.max(0,this.energy/this.maxEnergy),1);this.cargoText.setText(`가방 ${this.cargoCount}/${this.capacity}`);this.heartText.setText('♥ '.repeat(this.health).trim());
    this.monsters.forEach(m=>{if(!m.active)return;const d=Phaser.Math.Distance.Between(m.x,m.y,this.player.x,this.player.y);if(d<220){const a=Phaser.Math.Angle.Between(m.x,m.y,this.player.x,this.player.y);m.setVelocityX(Math.cos(a)*(m.getData('kind')==='bat'?70:45));if(m.getData('kind')==='bat')m.setVelocityY(Math.sin(a)*70);if(d<32&&time>(m.getData('lastHit')||0)+900){m.setData('lastHit',time);this.damagePlayer();}}});
    if(this.player.y>ROWS*TILE+20)this.emergency('끝없는 구덩이에 빠졌다!');
  }
  findTarget(){
    const px=this.player.x+this.aim.x*44,py=this.player.y+this.aim.y*44;let best:TileData|undefined,dist=999;
    this.tiles.forEach(t=>{const d=Phaser.Math.Distance.Between(px,py,t.shape.x,t.shape.y);const from=Phaser.Math.Distance.Between(this.player.x,this.player.y,t.shape.x,t.shape.y);if(d<dist&&from<75){best=t;dist=d;}});return best;
  }
  mine(){
    if(this.energy<=0){this.toast('에너지가 바닥났다! 긴급 귀환이 필요합니다.');return;}const t=this.findTarget();if(!t)return;this.lastMine=this.time.now;const info=TILE_INFO[t.kind],cost=Math.max(1,info.energy-(this.persist.up.drill>=4?1:0));this.energy=Math.max(0,this.energy-cost);const damage=1+this.persist.up.drill*.55;t.hp-=damage;this.tone(150+this.persist.up.drill*25,55,.035);this.hitEffect(t.shape.x,t.shape.y,info.color);this.cameras.main.shake(45,.0025);t.shape.setScale(.9);this.tweens.add({targets:t.shape,scale:1,duration:90});
    if(t.hp<=0)this.breakTile(t);else{const crack=this.add.text(t.shape.x,t.shape.y,Math.ceil(t.hp).toString(),style(10,'#fff')).setOrigin(.5).setDepth(8);this.tweens.add({targets:crack,alpha:0,y:crack.y-12,duration:300,onComplete:()=>crack.destroy()});}
    if(this.energy<=0)this.time.delayedCall(500,()=>this.confirmReturn(true));
  }
  breakTile(t:TileData,chain=false){
    if(!this.tiles.has(`${t.row},${t.col}`))return;this.tiles.delete(`${t.row},${t.col}`);t.body.destroy();t.shape.destroy();const info=TILE_INFO[t.kind];if(info.reward&&this.cargoCount<this.capacity){this.cargo[info.reward]++;this.cargoCount++;this.floating(t.col*TILE+16,t.row*TILE+16,`+${info.reward==='stone'?'석재':info.reward==='iron'?'철':info.reward==='gold'?'금':'보석'}`,info.reward==='gem'?'#72efff':'#ffd66b');if(info.reward==='gem')this.rareEffect(t.col*TILE+16,t.row*TILE+16);}
    if(t.kind==='explosive'){this.tone(75,180,.07);this.cameras.main.shake(180,.012);this.burst(t.row,t.col,1.7);}else if(t.kind==='crystal'&&!chain)this.crystalChain(t.row,t.col);else if(t.kind==='trap')this.damagePlayer();
    this.dropUnstable(t.row-1,t.col);this.hitMonsterNear(t.col*TILE+16,t.row*TILE+16,50,8+this.persist.up.drill*3);
  }
  burst(row:number,col:number,damage:number){for(let r=row-1;r<=row+1;r++)for(let c=col-1;c<=col+1;c++){const t=this.tiles.get(`${r},${c}`);if(t){t.hp-=damage;if(t.hp<=0)this.breakTile(t,true);}}this.hitEffect(col*TILE+16,row*TILE+16,0xff7b45,18);this.hitMonsterNear(col*TILE+16,row*TILE+16,100,30);}
  crystalChain(row:number,col:number){const seen=new Set<string>(),queue:[[number,number]]=[[row,col]];while(queue.length){const [r,c]=queue.shift()!,k=`${r},${c}`;if(seen.has(k))continue;seen.add(k);for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const t=this.tiles.get(`${r+dr},${c+dc}`);if(t?.kind==='crystal'){this.breakTile(t,true);queue.push([r+dr,c+dc]);}}}if(seen.size>1)this.toast(`수정 연쇄! ${seen.size}개 공명`);}
  dropUnstable(row:number,col:number){const t=this.tiles.get(`${row},${col}`);if(!t||t.kind!=='unstable')return;this.tiles.delete(`${row},${col}`);t.body.destroy();this.tweens.add({targets:t.shape,y:t.shape.y+TILE,duration:260,onComplete:()=>{const nr=row+1;if(!this.tiles.has(`${nr},${col}`)){t.row=nr;t.shape.y=nr*TILE+16;const body=this.staticGroup.create(t.shape.x,t.shape.y,undefined).setVisible(false) as Phaser.Physics.Arcade.Image;body.setSize(TILE,TILE).refreshBody();t.body=body;this.tiles.set(`${nr},${col}`,t);this.physics.add.collider(this.player,body);}else t.shape.destroy();}});if(Phaser.Math.Distance.Between(t.shape.x,t.shape.y+TILE,this.player.x,this.player.y)<35)this.damagePlayer();}
  useBomb(){if(this.bombs<=0){this.toast('폭탄이 없습니다.');return;}this.bombs--;const row=Math.floor((this.player.y+this.aim.y*50)/TILE),col=Math.floor((this.player.x+this.aim.x*50)/TILE);this.burst(row,col,99);this.cameras.main.flash(120,255,180,70);this.bombButton.removeAllListeners();this.bombButton.on('pointerdown',()=>this.useBomb());const label=this.hud.list.find(o=>o instanceof Phaser.GameObjects.Text&&o.text.startsWith('●')) as Phaser.GameObjects.Text|undefined;label?.setText(`● ${this.bombs}`);}
  hitMonsterNear(x:number,y:number,range:number,damage:number){this.monsters.forEach(m=>{if(m.active&&Phaser.Math.Distance.Between(x,y,m.x,m.y)<range){const hp=(m.getData('hp') as number)-damage;m.setData('hp',hp);this.floating(m.x,m.y-25,`-${damage}`,'#ff7a86');if(hp<=0){m.destroy();this.persist.gold+=5;this.floating(x,y,'+5G','#ffd66b');}}});}
  damagePlayer(){if(this.over)return;this.health--;this.player.setTint(0xff5269);this.cameras.main.shake(180,.012);this.time.delayedCall(250,()=>this.player.clearTint());if(this.health<=0)this.emergency('탐험가가 쓰러졌다!');}
  confirmReturn(forced:boolean){if(this.over)return;if(forced){this.emergency('에너지가 모두 소진됐다!');return;}this.over=true;this.physics.pause();const value=this.cargoValue();const bg=this.add.rectangle(225,400,400,300,0x120e19,.97).setScrollFactor(0).setDepth(200).setStrokeStyle(3,0xffb44f);this.add.text(225,300,'지상으로 돌아갈까요?',style(24,'#ffc65c')).setOrigin(.5).setScrollFactor(0).setDepth(201);this.add.text(225,355,`현재 깊이 ${this.depth}m\n가방 가치 ${value}G`,style(14,'#e7d6e9')).setOrigin(.5).setAlign('center').setScrollFactor(0).setDepth(201);const yes=this.add.rectangle(150,460,125,48,0xffa640).setScrollFactor(0).setDepth(201).setInteractive(),no=this.add.rectangle(300,460,125,48,0x392d42).setScrollFactor(0).setDepth(201).setInteractive();this.add.text(150,460,'귀환',style(14,'#291721')).setOrigin(.5).setScrollFactor(0).setDepth(202);this.add.text(300,460,'더 내려간다',style(13)).setOrigin(.5).setScrollFactor(0).setDepth(202);yes.on('pointerdown',()=>this.returnSurface(false));no.on('pointerdown',()=>{[bg,yes,no].forEach(x=>x.destroy());this.children.list.filter(o=>'depth' in o&&(o as Phaser.GameObjects.Container).depth>=201).forEach(o=>o.destroy());this.over=false;this.physics.resume();});}
  emergency(reason:string){if(this.over)return;this.over=true;this.physics.pause();this.toast(reason);this.time.delayedCall(700,()=>this.returnSurface(true));}
  cargoValue(){return(Object.keys(this.cargo) as (keyof Cargo)[]).reduce((n,k)=>n+this.cargo[k]*PRICES[k],0);}
  returnSurface(emergency:boolean){const gross=this.cargoValue(),earned=Math.floor(gross*(emergency?.7:1));this.persist.gold+=earned;this.persist.best=Math.max(this.persist.best,this.depth);store(this.persist);this.clearScreen();this.mode='result';this.cameras.main.setBackgroundColor('#17101e');this.add.circle(225,170,130,0xffa640,.1);this.add.text(225,90,emergency?'긴급 귀환':'무사 귀환',style(31,emergency?'#ff7280':'#ffc65c')).setOrigin(.5);this.add.image(225,190,'miner').setScale(2);this.add.text(225,300,`도달 깊이  ${this.depth}m`,style(20)).setOrigin(.5);this.add.text(225,345,`석재 ${this.cargo.stone}  ·  철 ${this.cargo.iron}  ·  금 ${this.cargo.gold}  ·  보석 ${this.cargo.gem}`,style(12,'#c8b5cf')).setOrigin(.5);this.add.text(225,405,`+ ${earned} G`,style(42,'#ffd35e')).setOrigin(.5);if(emergency)this.add.text(225,455,'긴급 귀환으로 광물 가치 30% 손실',style(11,'#ff8994')).setOrigin(.5);const base=this.add.rectangle(225,570,300,58,0xffa640).setInteractive();this.add.text(225,570,'판매하고 장비 강화',style(16,'#291721')).setOrigin(.5);base.on('pointerdown',()=>this.showBase());}
  hitEffect(x:number,y:number,color:number,count=7){for(let i=0;i<count;i++){const p=this.add.rectangle(x,y,Phaser.Math.Between(3,7),Phaser.Math.Between(3,7),color).setDepth(40);this.tweens.add({targets:p,x:x+Phaser.Math.Between(-38,38),y:y+Phaser.Math.Between(-35,28),angle:Phaser.Math.Between(-180,180),alpha:0,duration:400,onComplete:()=>p.destroy()});}}
  rareEffect(x:number,y:number){this.tone(620,220,.05);this.cameras.main.flash(180,80,210,255);for(let i=0;i<18;i++)this.hitEffect(x,y,i%2?0x62eaff:0xc67aff,1);this.toast('희귀 광물 발견!');}
  tone(freq:number,duration:number,volume:number){try{this.audio??=new AudioContext();const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.frequency.value=freq;osc.type='triangle';gain.gain.setValueAtTime(volume,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+duration/1000);osc.connect(gain).connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+duration/1000);}catch{/* audio is optional */}}
  floating(x:number,y:number,msg:string,color:string){const t=this.add.text(x,y,msg,style(11,color)).setOrigin(.5).setDepth(60);this.tweens.add({targets:t,y:y-28,alpha:0,duration:700,onComplete:()=>t.destroy()});}
  toast(msg:string){const bg=this.add.rectangle(225,130,Math.min(410,msg.length*15+50),40,0x08060d,.94).setScrollFactor(0).setDepth(180),t=this.add.text(225,130,msg,style(12)).setOrigin(.5).setScrollFactor(0).setDepth(181);this.tweens.add({targets:[bg,t],alpha:0,delay:1200,duration:280,onComplete:()=>{bg.destroy();t.destroy();}});}
}

new Phaser.Game({type:Phaser.AUTO,parent:'app',width:W,height:H,backgroundColor:'#100c17',scene:[DiggerScene],physics:{default:'arcade',arcade:{gravity:{x:0,y:0},debug:false}},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},input:{activePointers:3}});
