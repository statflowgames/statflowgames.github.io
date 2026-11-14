(function(root){
'use strict';
const COLS=7, ROWS=9, CORE={x:3,y:7};
const key=(x,y)=>y*COLS+x;
const inside=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS;
const neighbors=(x,y)=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>inside(a,b));
const WAVES=[{count:8,hp:20,gap:1.5,speed:.57},{count:12,hp:27,gap:1.15,speed:.62},{count:16,hp:33,gap:.95,speed:.66},{count:20,hp:40,gap:.82,speed:.71},{count:24,hp:47,gap:.72,speed:.74}];
class BunkerGame {
 constructor(seed=73){this.seed=seed;this.reset()}
 reset(){this.rng=this.seed;this.phase='build';this.wave=1;this.health=100;this.reserve=26;this.damage=28;this.wallHP=42;this.blocks=new Map();this.enemies=[];this.events=[];this.history=[];this.score=0;this.totalKills=0;this.shots=0;this.time=0;this.cooldown=0;this.spawned=0;this.killed=0;this.spawnClock=0;this.angle=0;this.preset();this.history=[]}
 random(){this.rng=(Math.imul(1664525,this.rng)+1013904223)>>>0;return this.rng/4294967296}
 get config(){return WAVES[this.wave-1]}
 snapshot(){return {reserve:this.reserve,blocks:[...this.blocks].map(([k,b])=>[k,{...b}])}}
 remember(){this.history.push(this.snapshot());if(this.history.length>100)this.history.shift()}
 undo(){if(this.phase!=='build'||!this.history.length)return false;const s=this.history.pop();this.reserve=s.reserve;this.blocks=new Map(s.blocks);return true}
 place(x,y){if(this.phase!=='build'||!inside(x,y)||y===0||(x===CORE.x&&y===CORE.y)||this.blocks.has(key(x,y))||this.reserve<1)return false;this.remember();this.blocks.set(key(x,y),{x,y,hp:this.wallHP,maxHP:this.wallHP});this.reserve--;return true}
 remove(x,y){if(this.phase!=='build'||!this.blocks.has(key(x,y)))return false;this.remember();this.blocks.delete(key(x,y));this.reserve++;return true}
 preset(){if(this.phase!=='build')return false;this.remember();this.reserve+=this.blocks.size;this.blocks.clear();const coords=[[2,7],[4,7],[2,8],[3,8],[4,8],[1,8],[5,8],[1,7],[5,7],[1,6],[5,6],[1,5],[5,5],[1,4],[5,4]];for(const [x,y]of coords){if(this.reserve<=0)break;this.blocks.set(key(x,y),{x,y,hp:this.wallHP,maxHP:this.wallHP});this.reserve--}return true}
 connected(){const reached=new Map(),q=[[CORE.x,CORE.y,0]],visited=new Set([key(CORE.x,CORE.y)]);for(let i=0;i<q.length;i++){const [x,y,d]=q[i];for(const [a,b]of neighbors(x,y)){const k=key(a,b);if(!visited.has(k)&&this.blocks.has(k)){visited.add(k);reached.set(k,d+1);q.push([a,b,d+1])}}}return reached}
 nextAmmo(){const conn=this.connected();let chosen=null,max=-1;for(const [k,d]of conn){if(d>max){chosen=this.blocks.get(k);max=d}}return chosen}
 start(){if(this.phase!=='build'||!this.connected().size)return false;this.phase='combat';this.history=[];this.enemies=[];this.spawned=0;this.killed=0;this.cooldown=.5;this.spawnClock=.7;this.events.push({type:'start'});return true}
 spawn(){const cfg=this.config;const boss=this.wave===5&&this.spawned===cfg.count-1;const heavy=!boss&&this.wave>=3&&this.spawned%5===4;const hp=boss?150:cfg.hp*(heavy?1.65:1);this.enemies.push({id:this.spawned,x:Math.floor(this.random()*7),y:-.55,hp,maxHP:hp,speed:cfg.speed*(boss?.64:heavy?.8:1),damage:boss?22:heavy?14:9,kind:boss?'boss':heavy?'heavy':'normal',attack:0,hit:0,pathClock:0,target:null,walk:this.random()*6.28});this.spawned++}
 // Dijkstra weights walls by their remaining breaking time. Even a sealed base is reachable.
 nextStep(x,y){const sx=Math.max(0,Math.min(6,Math.round(x))),sy=Math.max(0,Math.min(8,Math.round(y))),start=key(sx,sy),goal=key(CORE.x,CORE.y);if(start===goal)return {...CORE};const dist=new Map([[start,0]]),prev=new Map(),pending=new Set([start]);while(pending.size){let u=null,best=Infinity;for(const k of pending){if(dist.get(k)<best){best=dist.get(k);u=k}}pending.delete(u);if(u===goal)break;for(const [nx,ny]of neighbors(u%7,Math.floor(u/7))){const v=key(nx,ny),wall=this.blocks.get(v),cost=1+(wall?wall.hp/9:0),nd=best+cost;if(nd<(dist.get(v)??Infinity)){dist.set(v,nd);prev.set(v,u);pending.add(v)}}}let step=goal;if(!prev.has(step))return {...CORE};while(prev.get(step)!==start){step=prev.get(step);if(step===undefined)return {...CORE}}return {x:step%7,y:Math.floor(step/7)}}
 tick(dt){if(this.phase!=='combat')return;dt=Math.min(.1,Math.max(0,dt));this.time+=dt;this.spawnClock-=dt;if(this.spawned<this.config.count&&this.spawnClock<=0){this.spawn();this.spawnClock+=this.config.gap}this.cooldown-=dt;
  const live=this.enemies.filter(e=>e.hp>0);const target=live.filter(e=>Math.hypot(e.x-CORE.x,e.y-CORE.y)<4.9).sort((a,b)=>Math.hypot(a.x-CORE.x,a.y-CORE.y)-Math.hypot(b.x-CORE.x,b.y-CORE.y))[0];
  if(target){this.angle=Math.atan2(target.x-CORE.x,CORE.y-target.y);if(this.cooldown<=0){const ammo=this.nextAmmo();if(ammo){this.blocks.delete(key(ammo.x,ammo.y));target.hp-=this.damage;target.hit=.18;this.shots++;this.cooldown=.75;this.events.push({type:'shot',x:ammo.x,y:ammo.y,tx:target.x,ty:target.y});if(target.hp<=0){this.killed++;this.totalKills++;this.score+=target.kind==='boss'?500:target.kind==='heavy'?150:100;this.events.push({type:'kill',x:target.x,y:target.y,kind:target.kind})}}}}
  for(const e of this.enemies){if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);e.walk+=dt*e.speed*7;e.attack-=dt;if(e.y<0){e.y+=e.speed*dt;continue}const coreDist=Math.hypot(e.x-CORE.x,e.y-CORE.y);if(coreDist<.62){if(e.attack<=0){this.health=Math.max(0,this.health-e.damage);e.attack=1.1;this.events.push({type:'hurt',x:e.x,y:e.y});if(this.health<=0){this.phase='lost';this.events.push({type:'lost'});break}}continue}
   if(!e.target)e.target=this.nextStep(e.x,e.y);const t=e.target,dist=Math.hypot(t.x-e.x,t.y-e.y),wall=this.blocks.get(key(t.x,t.y));if(wall&&dist<1.05){if(e.attack<=0){wall.hp-=e.damage;e.attack=.8;this.events.push({type:'wallhit',x:wall.x,y:wall.y});if(wall.hp<=0){this.blocks.delete(key(wall.x,wall.y));this.events.push({type:'break',x:wall.x,y:wall.y})}}e.pathClock-=dt;if(e.pathClock<=0){e.target=null;e.pathClock=.5}continue}
   if(dist<.035){e.x=t.x;e.y=t.y;e.target=null}else{const move=Math.min(dist,e.speed*dt);e.x+=(t.x-e.x)/dist*move;e.y+=(t.y-e.y)/dist*move}
  }
  this.enemies=this.enemies.filter(e=>e.hp>0);if(this.phase==='combat'&&this.spawned>=this.config.count&&!this.enemies.length){this.score+=Math.round(this.health*2);this.phase=this.wave===5?'won':'reward';this.events.push({type:this.phase})}
 }
 chooseReward(choice){if(this.phase!=='reward'||!['supply','power','fortify'].includes(choice))return false;if(choice==='power')this.damage*=1.2;if(choice==='fortify'){this.wallHP*=1.3;this.health=Math.min(100,this.health+30)}this.wave++;const supply=20+this.wave*3+(choice==='supply'?8:0);this.reserve+=supply;for(const b of this.blocks.values()){b.hp=this.wallHP;b.maxHP=this.wallHP}this.phase='build';this.history=[];this.events.push({type:'resupply',amount:supply});return true}
}
const api={BunkerGame,COLS,ROWS,CORE,WAVES,key};if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(typeof window==='undefined'?globalThis:window);
