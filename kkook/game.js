'use strict';
const $ = id => document.getElementById(id);
const game = new HugGame(), canvas = $('scene'), ctx = canvas.getContext('2d');
const art = {}, particles = [], flyFriends = [];
let assetsReady = false, paused = false, modalMode = '', frameTime = 0, hudTime = 0;
let sound = true, audio = null, toastTimer, highScore = 0, pointerId = null, wobble = 0, uiScale = 1;
try { highScore = Number(localStorage.getItem('kkook-best') || 0); } catch {}
$('best').textContent = highScore.toLocaleString();

function loadImage(name, path) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => { art[name] = img; resolve(); };
    img.onerror = () => { console.warn('Image unavailable:', path); resolve(); };
    img.src = path;
  });
}
Promise.all([loadImage('friends','assets/friends.png'),loadImage('forest','assets/forest.png')]).then(() => {
  assetsReady = true; $('loading').hidden = true; updateHUD();
});

function chime(kind) {
  if (!sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const tones = kind === 'bank' ? [523,659,784,1046] : kind === 'catch' ? [620,830] : kind === 'snap' ? [310,230] : [440];
    tones.forEach((freq,i) => {
      const osc = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime + i * .075;
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq,t);
      gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(.045,t+.012);
      gain.gain.exponentialRampToValueAtTime(.001,t+.22);
      osc.connect(gain); gain.connect(audio.destination); osc.start(t); osc.stop(t+.23);
    });
  } catch {}
}
function toast(message, duration=1800) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'),duration);
}
function position(event) {
  const rect = canvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)/rect.width*WIDTH,y:(event.clientY-rect.top)/rect.height*HEIGHT};
}
const stage = document.querySelector('.game');
stage.addEventListener('pointerdown', e => {
  if (!assetsReady || paused || modalMode || e.button > 0 || e.target.closest('button:not(#hand-handle)')) return;
  if (pointerId !== null) return;
  const p = position(e);
  const grabbedHandle = !!e.target.closest('#hand-handle');
  if (game.begin(grabbedHandle ? game.last.x : p.x, grabbedHandle ? game.last.y : p.y)) {
    e.preventDefault(); pointerId = e.pointerId; stage.setPointerCapture(e.pointerId);
    game.move(p.x,p.y); chime('touch'); $('hand-handle').blur(); updateHUD();
  } else if (game.phase !== 'ended') toast('노랗게 빛나는 친구를 끌어주세요',1200);
});
stage.addEventListener('pointermove', e => {
  if (pointerId !== e.pointerId || !game.drag) return;
  const p = position(e); game.move(p.x,p.y); e.preventDefault();
});
stage.addEventListener('pointerup', e => {
  if (pointerId !== e.pointerId) return;
  game.release(); pointerId = null;
  if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
  updateHUD();
});
for (const event of ['pointercancel','lostpointercapture']) stage.addEventListener(event, e => {
  if (pointerId !== e.pointerId) return;
  game.release(true); pointerId = null;
});
// Keyboard alternative to the same drag-and-release mechanic.
$('hand-handle').addEventListener('keydown', e => {
  if (!assetsReady || paused || modalMode) return;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
    e.preventDefault(); if (!game.drag) game.begin(game.last.x,game.last.y);
    if (!game.drag) return;
    game.move(game.drag.wantedX+(e.key==='ArrowRight'?20:e.key==='ArrowLeft'?-20:0),game.drag.wantedY+(e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0));
  } else if (e.code==='Space'||e.key==='Enter') {e.preventDefault();game.release();}
});
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♪':'♫';$('sound').setAttribute('aria-label',sound?'효과음 끄기':'효과음 켜기');if(sound)chime('touch');};

function showModal(type,title,desc,button) {
  game.release(true); pointerId=null; paused=true; modalMode=type;
  $('modal-title').textContent=title; $('modal-desc').textContent=desc;
  $('modal-action').textContent=button; $('modal-content').replaceChildren();
  $('overlay').hidden=false; $('modal-action').focus();
}
function closeModal() {modalMode='';paused=false;$('overlay').hidden=true;frameTime=0;}
function newGame() {
  game.reset();particles.length=0;flyFriends.length=0;wobble=0;pointerId=null;
  clearTimeout(toastTimer);$('toast').classList.remove('show');closeModal();updateHUD();
}
$('pause').onclick=()=>{
  if(modalMode)return;
  showModal('pause','잠깐 쉬어가요','친구들이 꼬옥 붙잡고 기다리고 있어요.','이어서 꼬옥! →');
};
$('help').onclick=()=>{
  showModal('help','이렇게 꼬옥!','손가락 하나면 충분해요.','알겠어요, 해볼게요 →');
  $('modal-content').innerHTML='<div class="help-copy"><p><b>① 끌어요</b> 노랗게 빛나는 마지막 친구를 손가락으로 쭈욱 끌어요.</p><p><b>② 놓아요</b> 다른 친구 가까이에서 손을 놓으면 연결돼요. 민트색 원이 뜨면 잡을 수 있어요.</p><p><b>③ 둥지로!</b> 왼쪽 둥지 위에서 손을 놓아 점수를 저장해요. 많이 데려올수록 보너스가 커져요.</p><p><b>④ 살살 당겨요</b> 너무 세게 늘려 빨간 게이지가 차면 손을 놓쳐요. 누비는 가벼워서 무게를 덜어줘요.</p><p>30초가 끝나면 둥지에 데려온 친구만 점수로 남아요. 기회는 세 번!</p></div>';
};
$('restart').onclick=()=>{
  if(game.phase==='ready'){newGame();return;}
  showModal('restart','처음부터 다시?','이번 모험을 마치고 새로 시작해요.','새로 시작할게요 →');
  $('modal-content').innerHTML='<button id="cancel-restart" class="secondary">이어서 할래요</button>';
  $('cancel-restart').onclick=closeModal;
};
$('modal-action').onclick=()=>['end','restart'].includes(modalMode)?newGame():closeModal();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&['help','pause','restart'].includes(modalMode))closeModal();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.phase==='playing'&&!paused)$('pause').click();frameTime=0;});
$('overlay').addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;const items=[...$('overlay').querySelectorAll('button')],first=items[0],last=items.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
function finish(event) {
  if(game.score>highScore){highScore=game.score;try{localStorage.setItem('kkook-best',highScore);}catch{}}
  showModal('end',game.saved?'꼬옥, 잘 데려왔어요!':'한 번 더 잡아볼까요?',event.reason==='lives'?'친구들이 푹신한 풀숲에 떨어졌어요. 다음에는 조금 살살!':event.unbanked?'시간 끝! 다음에는 조금 일찍 둥지로 돌아와 보세요.':'짧지만 따뜻했던 별숲의 모험.','한 번 더 꼬옥! →');
  $('modal-content').innerHTML=`<div class="result-stats"><span>둥지 점수<b>${game.score.toLocaleString()}</b></span><span>데려온 친구<b>${game.saved}명</b></span></div><p class="results-best">최고 기록 ${highScore.toLocaleString()} · 가장 길게 ${game.maxChain}명 연결</p>`;
  $('best').textContent=highScore.toLocaleString();
}
function puff(x,y,count=14) {
  for(let i=0;i<count;i++){const a=Math.PI*2*i/count;particles.push({kind:'spark',x,y,vx:Math.cos(a)*(30+Math.random()*60),vy:Math.sin(a)*60-35,life:.8,max:.8,color:['#f3c567','#a2c8a2','#f1baa2','#fff8cf'][i%4],size:3+Math.random()*3});}
}
function processEvents() {
  for(const e of game.events.splice(0)) {
    if(e.type==='catch') {puff(e.x,e.y);chime('catch');toast(e.count===1?'꼬옥! 둥지로 데려가 볼까요?':e.count===5?'다섯 명! 이제 둥지로 가요':e.friend==='cloud'?'누비 덕분에 조금 가벼워졌어요':'한 명만 더…?',1500);}
    else if(e.type==='bank') {
      chime('bank');puff(NEST.x,NEST.y,24);
      particles.push({kind:'text',x:NEST.x,y:NEST.y-35,text:'+'+e.amount,life:1.25,max:1.25,vy:-35});
      for(const n of e.friends)flyFriends.push({...n,fromX:n.x,fromY:n.y,kind:'home',life:.65,max:.65});
      toast(`${e.count}명 무사 도착! +${e.amount}`,1600);
    } else if(e.type==='snap') {
      chime('snap');wobble=5;
      for(const n of e.friends)flyFriends.push({...n,fromX:n.x,fromY:n.y,kind:'fall',life:.8,max:.8});
      toast('앗, 미끄러졌다! 조금 살살 당겨요',1900);
    } else if(e.type==='miss') {chime('touch');if(game.phase==='playing')toast('조금 더 가까이서 놓아주세요',1000);}
    else if(e.type==='end')finish(e);
  }
}
function updateHUD() {
  $('hand-handle').style.left=game.last.x/WIDTH*100+'%';
  $('hand-handle').style.top=game.last.y/HEIGHT*100+'%';
  $('time').textContent=Math.ceil(game.time);document.querySelector('.clock').classList.toggle('urgent',game.time<8);
  $('score').textContent=game.score.toLocaleString();$('lives').textContent='♥ '.repeat(game.lives)+'♡ '.repeat(3-game.lives);$('lives').setAttribute('aria-label',`기회 ${game.lives}번`);
  $('catch-badge').hidden=game.pending===0;$('friends-count').textContent=game.pending;$('pending').textContent='+'+game.reward;
  $('tension-bar').style.width=Math.min(100,game.tension*100)+'%';
  $('tension-label').textContent=game.tension>.95?'놓칠 것 같아!':game.tension>.65?'아슬아슬':'말랑말랑';
  $('tension-label').style.color=game.tension>.95?'#ca755c':'#829773';$('tension-face').textContent=game.tension>.95?'!':game.tension>.65?'﹏':'◡';
  const text=game.phase==='ready'?['별코를 쭉 끌어 친구 위에 놓으세요','손을 놓으면 꼬옥! · 둥지에 데려오면 점수 저장']:game.pending===0?['친구 가까이에서 손을 놓으세요','민트색 원이 뜨면 잡을 수 있어요']:game.nodes.length>=6?['다섯 명을 데리고 둥지로 돌아가요','왼쪽 둥지 위에서 손을 놓으면 점수 저장']:['둥지로 돌아갈까, 한 명만 더?','많이 데려오면 보너스! · 빨간 게이지는 조심'];
  $('instruction').firstElementChild.textContent=text[0];$('instruction').lastElementChild.textContent=text[1];
}
function roundRect(x,y,w,h,r,fill,stroke) {ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function ellipse(x,y,rx,ry,fill,stroke) {ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function sprite(type,x,y,size=86,rotation=0,bounce=0,alpha=1) {
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=alpha;
  const squeeze=1+Math.sin(bounce*Math.PI)*.13;ctx.scale(squeeze,(1-(squeeze-1)*.5)*uiScale);
  if(art.friends){const sw=art.friends.width/3,sh=art.friends.height,index={star:0,sprout:1,cloud:2}[type];ctx.drawImage(art.friends,index*sw,0,sw,sh,-size/2,-size*sh/sw/2,size,size*sh/sw);}
  else{ellipse(0,0,size*.4,size*.36,TYPES[type].color,'#9b7755');ellipse(-10,-2,3,4,'#795638');ellipse(10,-2,3,4,'#795638');}
  ctx.restore();
}
function leaf(x,y,width=80) {
  ctx.save();ctx.translate(x,y);ctx.rotate(-.08);
  ellipse(0,7,width*.48,12,'#64896826');
  const g=ctx.createLinearGradient(0,-15,0,15);g.addColorStop(0,'#d7e2a0');g.addColorStop(.5,'#a9c879');g.addColorStop(1,'#82aa64');
  ctx.beginPath();ctx.moveTo(-width/2,0);ctx.quadraticCurveTo(-width*.18,-29,width/2,-3);ctx.quadraticCurveTo(width*.15,24,-width/2,0);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#8aa76c';ctx.lineWidth=1.5;ctx.stroke();
  ctx.beginPath();ctx.moveTo(-width*.42,0);ctx.quadraticCurveTo(0,-4,width*.4,-3);ctx.strokeStyle='#e8edb4';ctx.lineWidth=2;ctx.stroke();
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*12,0);ctx.lineTo(i*12+9,-11);ctx.strokeStyle='#c2d994';ctx.lineWidth=1;ctx.stroke();}
  ctx.restore();
}
function nest(t) {
  const {x,y}=NEST,active=game.pending>0,near=game.drag&&distance(game.last,NEST)<NEST.radius+13;
  ctx.save();ctx.translate(x,y);
  if(active){ctx.shadowColor=near?'#b2f1cc':'#ffedb2';ctx.shadowBlur=near?28:16;ellipse(0,7,64+(near?4:Math.sin(t*3)*2),31,'#fff6cf66');ctx.shadowBlur=0;}
  ctx.beginPath();ctx.moveTo(-90,35);ctx.bezierCurveTo(-33,33,5,20,64,13);ctx.lineTo(62,27);ctx.bezierCurveTo(-9,47,-50,50,-90,49);ctx.closePath();ctx.fillStyle='#ac8453';ctx.fill();
  ellipse(0,15,57,28,'#9e7e4c');ellipse(0,7,60,27,'#d9c691');
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2;ellipse(Math.cos(a)*50,Math.sin(a)*20+8,10,6,i%3===0?'#e1d496':i%2?'#b7b56e':'#afbf76');}
  ellipse(0,3,40,15,'#92764a');ellipse(0,6,34,11,'#d6bd80');
  for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(0,11+i*2,46-i*1.2,12,0,0,Math.PI);ctx.strokeStyle=i%2?'#bc9c66':'#e8d8a0';ctx.lineWidth=2;ctx.stroke();}
  for(const [dx,dy] of [[-47,-7],[44,4]]){for(let i=0;i<5;i++){const a=i/5*Math.PI*2;ellipse(dx+Math.cos(a)*5,dy+Math.sin(a)*5,4,4,'#fff7dc');}ellipse(dx,dy,3,3,'#ebc46d');}
  roundRect(-28,28,56,25,9,'#f9edcf','#c8ac7a');ctx.font='15px Jua, sans-serif';ctx.fillStyle='#9b7749';ctx.textAlign='center';ctx.fillText('둥지',0,46);
  if(active){ctx.font='14px Jua, sans-serif';ctx.fillStyle=near?'#598f70':'#8f8860';ctx.fillText(near?'여기서 놓아요!':'돌아와요!',0,-31);ctx.beginPath();ctx.moveTo(-4,-24);ctx.lineTo(0,-19);ctx.lineTo(4,-24);ctx.strokeStyle='#9fb17e';ctx.lineWidth=2;ctx.stroke();}
  ctx.restore();
}
function arm(a,b,colorA,colorB,t,first=false) {
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,curve=Math.sin(t*2+a.y*.01)*Math.min(10,distance(a,b)*.04);
  const drawHalf=(x1,y1,x2,y2,c)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo((x1+x2)/2+curve,(y1+y2)/2,x2,y2);ctx.lineCap='round';ctx.lineWidth=18;ctx.strokeStyle='#96734e';ctx.stroke();ctx.lineWidth=13;ctx.strokeStyle=c;ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#fff6d655';ctx.stroke();};
  drawHalf(a.x,a.y,mx,my,colorA);drawHalf(mx,my,b.x,b.y,colorB);
  ctx.lineWidth=2;ellipse(mx,my,9,8,'#fff0cf','#a98256');
  for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(mx+i*3,my-5);ctx.lineTo(mx+i*3,my-1);ctx.strokeStyle='#c9ab7f';ctx.lineWidth=1;ctx.stroke();}
  if(first)ellipse(a.x,a.y,10,8,'#f6daa0','#aa8050');
}
function speech(x,y,text) {
  ctx.font='13px Jua, sans-serif';const width=ctx.measureText(text).width+22;
  roundRect(x-width/2,y-15,width,27,13,'#fffae9ed','#e6d6b6');ctx.fillStyle='#97764c';ctx.textAlign='center';ctx.fillText(text,x,y+3);
}
function draw(t) {
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
  const sx=rect.width/WIDTH,sy=rect.height/HEIGHT;uiScale=sx/sy;
  ctx.setTransform(dpr*sx,0,0,dpr*sy,0,0);ctx.clearRect(0,0,WIDTH,HEIGHT);
  if(art.forest)ctx.drawImage(art.forest,0,0,WIDTH,HEIGHT);else{ctx.fillStyle='#d9eaca';ctx.fillRect(0,0,WIDTH,HEIGHT);}
  // A soft wash preserves sky depth while making the interactive silhouettes read clearly.
  const wash=ctx.createRadialGradient(235,400,50,235,400,360);wash.addColorStop(0,'#fffbea20');wash.addColorStop(1,'#fffbea00');ctx.fillStyle=wash;ctx.fillRect(0,0,WIDTH,HEIGHT);
  for(let i=0;i<14;i++){const x=(i*67+Math.sin(t*.2+i)*23)%430,y=(i*59+t*5)%660;ellipse(x,y,1.4,1.4,'#fffbe3aa');}
  ctx.save();if(wobble)ctx.translate(Math.sin(t*80)*wobble,0);
  // A foreground twig gives the animated gripping hand a concrete anchor.
  ctx.save();ctx.lineCap='round';
  for(const [width,color,offset] of [[20,'#785b3e',3],[15,'#b58b53',0],[4,'#d7b575',-4]]) {
    ctx.beginPath();ctx.moveTo(-10,180+offset);ctx.bezierCurveTo(29,171+offset,67,146+offset,121,140+offset);
    ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
  }
  ellipse(82,137,9,4,'#a1bc78');ellipse(94,132,9,4,'#bbce8c');ctx.restore();
  nest(t);
  const near=game.nearTarget();
  for(const target of game.targets){
    const bob=Math.sin(t*2+target.phase)*3;
    leaf(target.x,target.y+32,76);
    if(near===target){ctx.save();ctx.shadowColor='#a9e5ba';ctx.shadowBlur=18;ellipse(target.x,target.y,51,47*uiScale,'#e0ffe633');ctx.lineWidth=3;ellipse(target.x,target.y,49,45*uiScale,null,'#c0f5cc');ctx.restore();speech(target.x,target.y-64,'놓으면 꼬옥!');}
    sprite(target.type,target.x,target.y+bob,86,Math.sin(t+target.phase)*.045);
    if(target.type==='cloud'&&near!==target){ctx.font='15px Jua,sans-serif';ctx.fillStyle='#b19a8f';ctx.fillText('z',target.x+31,target.y-25);}
  }
  for(let i=0;i<game.nodes.length;i++){
    const n=game.nodes[i],parent=i?game.nodes[i-1]:ANCHOR;
    arm(parent,n,i?TYPES[parent.type].color:'#f5d17e',TYPES[n.type].color,t,i===0);
  }
  const active=game.last;
  if(game.phase!=='ended'){
    ctx.save();ctx.shadowColor='#fff1ad';ctx.shadowBlur=game.drag?22:13;
    ellipse(active.x,active.y,53+Math.sin(t*4)*2,(48+Math.sin(t*4)*2)*uiScale,'#ffecaa18');
    ctx.setLineDash([5,6]);ctx.lineDashOffset=-t*13;ctx.lineWidth=2.5;ellipse(active.x,active.y,51,46*uiScale,null,game.tension>.95?'#ed987c':'#ffe29b');ctx.restore();
  }
  for(let i=0;i<game.nodes.length;i++){
    const n=game.nodes[i],parent=i?game.nodes[i-1]:ANCHOR;
    const angle=clamp((n.x-parent.x)/200,-.28,.28)+Math.sin(t*3+i)*.025;
    sprite(n.type,n.x,n.y,i===0?96:88,angle,n.bounce);
    if(game.tension>.75&&i===0){ctx.save();ctx.translate(n.x+32,n.y-13);ctx.rotate(-.3);ellipse(0,0,4,7,'#addce4','#72adb8');ctx.restore();}
  }
  if(game.phase==='ready'){
    const target=game.targets[0],a=game.last;
    ctx.save();ctx.setLineDash([3,7]);ctx.lineDashOffset=-t*20;ctx.beginPath();ctx.moveTo(a.x+47,a.y+12);ctx.quadraticCurveTo(225,250,target.x-50,target.y);ctx.strokeStyle='#fffbdf';ctx.lineWidth=3;ctx.stroke();ctx.restore();
    speech(a.x,a.y-76,'나를 쭈욱 끌어요!');
  }else if(game.strain>.25)speech(clamp(active.x,90,340),active.y-66,'으앗, 살살!');
  for(const n of flyFriends){const p=1-n.life/n.max,ease=1-(1-p)*(1-p),x=n.kind==='home'?n.fromX+(NEST.x-n.fromX)*ease:n.fromX+Math.sin(p*7)*20,y=n.kind==='home'?n.fromY+(NEST.y-n.fromY)*ease:n.fromY+p*p*250;sprite(n.type,x,y,85*(1-p*.6),p*(n.kind==='home'?.5:2),0,Math.min(1,n.life*3));}
  for(const p of particles){ctx.globalAlpha=Math.min(1,p.life/p.max*2);if(p.kind==='text'){ctx.font='26px Jua,sans-serif';ctx.strokeStyle='#fff7dd';ctx.lineWidth=5;ctx.textAlign='center';ctx.strokeText(p.text,p.x,p.y);ctx.fillStyle='#849e61';ctx.fillText(p.text,p.x,p.y);}else{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.life*3);roundRect(-p.size/2,-p.size/2,p.size,p.size,2,p.color);ctx.restore();}ctx.globalAlpha=1;}
  ctx.restore();
  const shade=ctx.createLinearGradient(0,670,0,800);shade.addColorStop(0,'#f1f4da00');shade.addColorStop(1,'#edf0d5bb');ctx.fillStyle=shade;ctx.fillRect(0,670,430,130);
  $('hand-handle').style.left=active.x/WIDTH*100+'%';$('hand-handle').style.top=active.y/HEIGHT*100+'%';$('hand-handle').disabled=game.phase==='ended'||paused;
}
function frame(ms) {
  const dt=frameTime?Math.min((ms-frameTime)/1000,.1):0;frameTime=ms;
  if(assetsReady&&!paused){
    for(let remaining=dt;remaining>0;){const step=Math.min(remaining,1/60);game.tick(step);remaining-=step;}
    processEvents();wobble=Math.max(0,wobble-dt*15);
    for(const p of particles){p.life-=dt;p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;if(p.kind==='spark')p.vy+=80*dt;}
    for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
    for(let i=flyFriends.length-1;i>=0;i--)if((flyFriends[i].life-=dt)<=0)flyFriends.splice(i,1);
  }
  hudTime+=dt;if(hudTime>.08){updateHUD();hudTime=0;}
  draw(game.elapsed);requestAnimationFrame(frame);
}
updateHUD();requestAnimationFrame(frame);
