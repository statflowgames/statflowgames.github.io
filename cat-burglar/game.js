(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), ctx = canvas.getContext('2d', { alpha:false });
  const els = {
    start:$('startLayer'), result:$('resultLayer'), pause:$('pauseLayer'), alert:$('alert'), toast:$('toast'), combo:$('combo'),
    fish:$('fishCount'), loot:$('lootValue'), best:$('bestFish'), hearts:$('hearts'), bar:$('progressBar'),
    escape:$('escapeButton'), escapeLoot:$('escapeLoot'), controlTitle:$('controlTitle'), controlCopy:$('controlCopy'), sound:$('soundButton'),
    resultCat:$('resultCat'), resultKicker:$('resultKicker'), resultTitle:$('resultTitle'), resultCopy:$('resultCopy'),
    resultFish:$('resultFish'), resultCoins:$('resultCoins'), resultBest:$('resultBest'), bank:$('bankValue')
  };
  const MAX_PROGRESS = 2050, TAU = Math.PI*2;
  let W=0,H=0,dpr=1,state='title',game=null,last=0,raf=0,audio=null,soundOn=true;
  let input={down:false,id:null,targetX:0};

  const FISH = [
    [120,.50,0],[235,.27,0],[355,.72,0],[485,.43,1],[625,.75,0],[755,.23,0],[895,.52,0],
    [1035,.77,1],[1175,.30,0],[1320,.62,0],[1465,.20,0],[1610,.78,1],[1760,.46,0],[1915,.64,1]
  ];
  const WATCHERS = [
    [260,'left',.2],[520,'right',1.9],[790,'left',3.1],[1080,'right',.8],[1360,'left',2.4],[1650,'right',.1],[1880,'left',1.5]
  ];

  function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=Math.max(1,r.width);H=Math.max(1,r.height);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(game)game.x=clamp(game.x,34,W-34)}
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const rand=(a,b)=>a+Math.random()*(b-a);
  const show=(el,on)=>{el.classList.toggle('active',on);el.setAttribute('aria-hidden',on?'false':'true')};
  const lootFor=n=>n<1?0:Math.round(35*Math.pow(n,1.72)/10)*10;

  function ensureAudio(){if(!soundOn)return null;if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();return audio}
  function tone(freq,d=.06,type='sine',gain=.025,end=null){const a=ensureAudio();if(!a)return;const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+d);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d)}
  function vibrate(p){if(navigator.vibrate)navigator.vibrate(p)}
  function toast(text){els.toast.textContent=text;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),900)}

  function fresh(){return{progress:0,x:W*.5,speed:104,fish:0,gold:0,hearts:3,elapsed:0,combo:0,comboTime:0,loot:0,objects:FISH.map((f,i)=>({p:f[0],x:f[1],gold:!!f[2],taken:false,i})),watchers:WATCHERS.map((w,i)=>({p:w[0],side:w[1],offset:w[2],hitKey:-1,i})),particles:[],pawTrails:[],trailClock:0,stars:[],shake:0,face:'sneak',step:0}}
  function start(){ensureAudio();game=fresh();state='play';input.down=false;show(els.start,false);show(els.result,false);show(els.pause,false);updateHud();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);tone(430,.11,'triangle',.04,760);vibrate(15);toast('생선 3마리면 탈출할 수 있어요!')}

  function watcherState(w){const cycle=4.1;const t=(game.elapsed+w.offset)%cycle;return{key:Math.floor((game.elapsed+w.offset)/cycle),warning:t>1.7&&t<=2.45,active:t>2.45&&t<3.55}}
  function screenY(progress){return H*.69-(progress-game.progress)}
  function collectFish(f){f.taken=true;game.fish++;if(f.gold)game.gold++;game.combo++;game.comboTime=1.55;game.loot=Math.round(lootFor(game.fish)*(1+game.gold*.5));burst(f.x*W,screenY(f.p),f.gold?'#ffd15c':'#72bde8',f.gold?22:12);tone(f.gold?780:520,.12,'triangle',.035,f.gold?1200:760);vibrate(f.gold?[20,25,35]:12);toast(f.gold?'황금 참치! 금고 가치 상승!':game.fish===3?'이제 도망갈 수 있어요!':`${game.fish}마리째 냠!`)}
  function caught(w){game.hearts--;w.hitKey=watcherState(w).key;game.shake=7;game.face='caught';input.down=false;burst(game.x,H*.69,'#ff5f79',18);tone(150,.25,'sawtooth',.05,70);vibrate([60,35,80]);els.alert.textContent=game.hearts>0?'들켰다! 얼른 멈춰요!':'으악, 잡혔다!';els.alert.classList.add('show');setTimeout(()=>els.alert.classList.remove('show'),900);if(game.hearts<=0)setTimeout(()=>finish(false),420)}

  function finish(escaped,clear=false){if(state!=='play')return;state='result';input.down=false;const coins=escaped?(clear?Math.round(game.loot*1.5):game.loot):0;const best=Math.max(game.fish,Number(localStorage.getItem('cat-burglar-best')||0));const bank=Number(localStorage.getItem('cat-burglar-bank')||0)+coins;localStorage.setItem('cat-burglar-best',String(best));localStorage.setItem('cat-burglar-bank',String(bank));
    els.resultFish.textContent=game.fish;els.resultCoins.textContent=coins.toLocaleString('ko-KR');els.resultBest.textContent=best;els.bank.textContent=bank.toLocaleString('ko-KR');els.best.textContent=best;
    if(clear){els.resultCat.textContent='😻';els.resultKicker.textContent='LEGENDARY PANTRY!';els.resultTitle.textContent='냉장고를 통째로 털었어요!';els.resultCopy.textContent='이 정도면 도둑이 아니라 생선 전문가입니다.'}
    else if(escaped){els.resultCat.textContent='😽';els.resultKicker.textContent='PERFECT ESCAPE!';els.resultTitle.textContent='오늘도 완벽한 범행!';els.resultCopy.textContent='생선 냄새만 남기고 사라졌습니다.'}
    else{els.resultCat.textContent='🙀';els.resultKicker.textContent='CAUGHT!';els.resultTitle.textContent='집사에게 딱 걸렸어요';els.resultCopy.textContent='욕심은 좋지만 가끔은 도망가야 해요.'}
    show(els.result,true);tone(escaped?720:120,.4,escaped?'sine':'sawtooth',.045,escaped?1080:60);vibrate(escaped?[25,25,50]:[80,40,110])}

  function update(dt){
    game.elapsed+=dt;game.shake=Math.max(0,game.shake-dt*24);game.comboTime-=dt;if(game.comboTime<=0)game.combo=0;
    if(input.down){game.progress=Math.min(MAX_PROGRESS,game.progress+game.speed*dt);game.x=lerp(game.x,input.targetX,.075);game.face='run';game.step+=dt*13;game.trailClock-=dt;if(game.trailClock<=0){game.pawTrails.push({x:game.x+rand(-5,5),y:H*.69+27,life:.75,flip:Math.random()>.5});game.trailClock=.17}}else{game.face='hide';game.step+=dt*3}
    for(const f of game.objects){if(f.taken)continue;const y=screenY(f.p),x=f.x*W;if(Math.abs(y-H*.69)<29&&Math.abs(x-game.x)<62)collectFish(f)}
    let danger=false;
    for(const w of game.watchers){const y=screenY(w.p),s=watcherState(w);if(Math.abs(y-H*.69)<50&&(s.warning||s.active))danger=true;if(Math.abs(y-H*.69)<28&&s.active&&input.down&&w.hitKey!==s.key)caught(w)}
    els.alert.textContent=danger?(input.down?'쉿! 손을 떼고 멈춰요!':'착한 고양이인 척… 성공!'):'쉿! 멈춰요!';els.alert.classList.toggle('show',danger);
    for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=70*dt;p.life-=dt}game.particles=game.particles.filter(p=>p.life>0);
    for(const p of game.pawTrails){p.y+=(input.down?game.speed:28)*dt;p.life-=dt}game.pawTrails=game.pawTrails.filter(p=>p.life>0&&p.y<H+25);
    if(game.progress>=MAX_PROGRESS)finish(true,true);
    updateHud();
  }

  function updateHud(){if(!game)return;els.fish.textContent=game.fish;els.loot.textContent=game.loot.toLocaleString('ko-KR');els.bar.style.height=`${game.progress/MAX_PROGRESS*100}%`;els.best.textContent=Number(localStorage.getItem('cat-burglar-best')||0);[...els.hearts.children].forEach((h,i)=>h.classList.toggle('lost',i>=game.hearts));els.escape.disabled=game.fish<3;els.escapeLoot.textContent=game.fish<3?'생선 3마리부터':`${game.loot.toLocaleString('ko-KR')} 코인 챙기기`;els.controlTitle.textContent=input.down?'슬금슬금 이동 중…':'화면을 꾹 누르면 살금살금!';els.controlCopy.textContent=input.down?'누른 채 좌우로 생선을 노려요':'누른 채 좌우 이동 · 떼면 얌전한 척';els.combo.textContent=game.combo>=2?`${game.combo} 냠냠!`:'';els.combo.classList.toggle('show',game.combo>=2)}
  function burst(x,y,color,count=10){for(let i=0;i<count;i++){const a=rand(0,TAU),s=rand(30,120);game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,life:rand(.3,.7),max:.7,r:rand(2,4),color,shape:i%3})}}

  function rounded(x,y,w,h,r,fill,stroke=null,lw=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
  function cuteFace(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.fillStyle='#5a473d';ctx.beginPath();ctx.arc(-6*scale,-1*scale,1.7*scale,0,TAU);ctx.arc(6*scale,-1*scale,1.7*scale,0,TAU);ctx.fill();ctx.strokeStyle='#5a473d';ctx.lineWidth=1.3*scale;ctx.beginPath();ctx.arc(0,3*scale,4*scale,.15,Math.PI-.15);ctx.stroke();ctx.fillStyle='#f38b99';ctx.globalAlpha=.62;ctx.beginPath();ctx.ellipse(-11*scale,3*scale,3.2*scale,1.8*scale,0,0,TAU);ctx.ellipse(11*scale,3*scale,3.2*scale,1.8*scale,0,0,TAU);ctx.fill();ctx.restore()}
  function drawPaw(x,y,color='#eaa68f',scale=1){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.globalAlpha=.42;ctx.beginPath();ctx.ellipse(0,3*scale,5*scale,6*scale,0,0,TAU);ctx.fill();for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*4.2*scale,-4*scale-Math.abs(i),2.2*scale,0,TAU);ctx.fill()}ctx.restore()}
  function drawCuteProp(type,x,y,flip=false){ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,1);
    if(type===0){
      rounded(-27,-42,54,84,15,'#9edfcf','#6a5549',3);ctx.fillStyle='#e9fff7';ctx.fillRect(-20,-27,40,6);ctx.fillRect(-20,5,40,4);ctx.strokeStyle='#6a5549';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(17,-18);ctx.lineTo(17,-6);ctx.stroke();cuteFace(0,20,.82);ctx.fillStyle='#ff8ea5';ctx.beginPath();ctx.arc(-15,-31,4,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('♥',13,-28);
    }else if(type===1){
      ctx.strokeStyle='#6a5549';ctx.lineWidth=3;ctx.fillStyle='#81cf9d';for(const [dx,dy,r] of [[0,-28,13],[-12,-21,11],[12,-20,10],[-5,-39,9]]){ctx.beginPath();ctx.ellipse(dx,dy,r*.7,r,dx*.02,0,TAU);ctx.fill();ctx.stroke()}rounded(-21,-18,42,42,11,'#f4a7ad','#6a5549',3);ctx.fillStyle='#fff2d9';ctx.fillRect(-17,-11,34,5);cuteFace(0,5,.75);
    }else if(type===2){
      rounded(-24,-39,48,78,11,'#ffd5e0','#6a5549',3);ctx.fillStyle='#fff9ed';ctx.beginPath();ctx.moveTo(-24,-21);ctx.lineTo(24,-31);ctx.lineTo(24,-8);ctx.lineTo(-24,2);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ff7898';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('MILK',0,17);cuteFace(0,27,.62);ctx.fillStyle='#ff6f8f';ctx.beginPath();ctx.moveTo(0,-23);ctx.bezierCurveTo(-12,-34,-17,-17,0,-8);ctx.bezierCurveTo(17,-17,12,-34,0,-23);ctx.fill();
    }else{
      ctx.fillStyle='rgba(255,242,211,.78)';ctx.strokeStyle='#d59d82';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,33,24,0,0,TAU);ctx.fill();ctx.stroke();drawPaw(0,0,'#f18e9d',1.35);ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText('MEOW',0,20);
    }ctx.restore()}
  function drawFloorSticker(type,x,y){ctx.save();ctx.translate(x,y);ctx.globalAlpha=.38;if(type%3===0){drawPaw(0,0,'#d98d83',.72);drawPaw(15,17,'#d98d83',.55)}else if(type%3===1){ctx.fillStyle='#ff8da5';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText('♥',0,4);ctx.fillStyle='#fff4c6';ctx.fillText('✦',16,-8)}else{ctx.strokeStyle='#80bad2';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(-4,0,11,6,0,0,TAU);ctx.moveTo(6,0);ctx.lineTo(16,-8);ctx.lineTo(16,8);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(-11,-7);ctx.lineTo(-16,-12);ctx.moveTo(-11,7);ctx.lineTo(-16,12);ctx.stroke()}ctx.restore()}
  function drawBackground(){
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#ffe8cd');bg.addColorStop(1,'#f8ceb0');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const tile=44,off=game.progress%tile;for(let y=-tile+off;y<H+tile;y+=tile){for(let x=0;x<W+tile;x+=tile){const odd=(Math.floor(x/tile)+Math.floor((y-off)/tile))%2;ctx.fillStyle=odd?'rgba(247,188,172,.34)':'rgba(255,247,221,.72)';ctx.fillRect(x,y,tile,tile);if((Math.floor(x/tile)+Math.floor((y-off)/tile)*3)%7===0){ctx.fillStyle='rgba(255,255,255,.38)';ctx.beginPath();ctx.arc(x+10,y+11,2,0,TAU);ctx.fill()}}}
    ctx.globalAlpha=.18;ctx.strokeStyle='#b67f5a';ctx.lineWidth=1;for(let y=-tile+off;y<H+tile;y+=tile){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.globalAlpha=1;
    for(let i=0;i<11;i++){const p=i*210+65,y=screenY(p);if(y<-105||y>H+105)continue;const right=i%2===0,x=right?W-40:40;drawCuteProp(i%4,x,y,right);}
    for(let i=0;i<15;i++){const p=i*145+35,y=screenY(p);if(y<-30||y>H+30)continue;const x=W*(.34+((i*37)%31)/100);drawFloorSticker(i,x,y)}
    ctx.save();ctx.globalAlpha=.28;ctx.fillStyle='#fff';for(let i=0;i<12;i++){const p=i*173+90,y=screenY(p),x=25+(i*71)%(Math.max(1,W-50));if(y>0&&y<H){ctx.beginPath();ctx.arc(x,y,1.8,0,TAU);ctx.fill()}}ctx.restore();
  }
  function drawFish(f){const x=f.x*W,y=screenY(f.p);if(f.taken||y<-40||y>H+40)return;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(game.elapsed*3+f.i)*.08);const color=f.gold?'#ffd15c':'#72bde8';ctx.shadowColor=color;ctx.shadowBlur=8;ctx.fillStyle=color;ctx.strokeStyle='#5a483e';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,f.gold?18:15,f.gold?11:9,0,0,TAU);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(26,-10);ctx.lineTo(25,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#493c35';ctx.beginPath();ctx.arc(-6,-2,1.8,0,TAU);ctx.fill();ctx.strokeStyle='#493c35';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(-5,3,5,0,Math.PI*.75);ctx.stroke();if(f.gold){ctx.font='9px sans-serif';ctx.fillText('★',-4,3)}ctx.restore()}
  function drawWatcher(w){const y=screenY(w.p);if(y<-80||y>H+80)return;const s=watcherState(w),left=w.side==='left',x=left?0:W,dir=left?1:-1;ctx.save();
    ctx.fillStyle='#8f6d58';ctx.fillRect(left?0:W-20,y-39,20,78);ctx.fillStyle='#ffedd8';ctx.fillRect(left?20:W-34,y-26,14,52);
    if(s.warning||s.active){ctx.globalAlpha=s.active?.24:.12;ctx.fillStyle=s.active?'#ff7088':'#ffd15c';ctx.beginPath();ctx.moveTo(x+dir*24,y);ctx.lineTo(x+dir*W*.82,y-52);ctx.lineTo(x+dir*W*.82,y+52);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
      ctx.translate(x+dir*28,y);ctx.scale(dir,1);ctx.fillStyle='#ffd3b5';ctx.strokeStyle='#5b483d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,20,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#6f513f';ctx.beginPath();ctx.arc(-2,-12,18,Math.PI,TAU);ctx.fill();ctx.fillStyle='#473a34';ctx.beginPath();ctx.arc(7,-3,2.5,0,TAU);ctx.fill();ctx.strokeStyle='#e36b70';ctx.beginPath();ctx.arc(8,5,5,0,Math.PI);ctx.stroke();ctx.font='900 15px sans-serif';ctx.fillStyle=s.active?'#ff4365':'#e29b28';ctx.fillText(s.active?'!':'?',22,-18)}ctx.restore()}
  function drawPawTrails(){for(const p of game.pawTrails){ctx.save();ctx.globalAlpha=Math.max(0,p.life/.75)*.32;ctx.translate(p.x,p.y);ctx.rotate(p.flip?.25:-.25);ctx.fillStyle='#b87f67';ctx.beginPath();ctx.ellipse(0,2,4.5,5.5,0,0,TAU);ctx.fill();for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*4,-4-Math.abs(i),2.1,0,TAU);ctx.fill()}ctx.restore()}}
  function drawLootBag(){if(game.fish<1)return;ctx.save();ctx.translate(25,8);ctx.rotate(.12);ctx.fillStyle='#f58ea5';ctx.strokeStyle='#594940';ctx.lineWidth=2.3;ctx.beginPath();ctx.arc(0,7,13,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#ffd15c';ctx.beginPath();ctx.moveTo(-8,-3);ctx.lineTo(0,2);ctx.lineTo(8,-3);ctx.lineTo(5,-8);ctx.lineTo(-5,-8);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 10px sans-serif';ctx.textAlign='center';ctx.fillText(String(game.fish),0,11);ctx.fillStyle='#72bde8';ctx.beginPath();ctx.moveTo(5,-7);ctx.lineTo(14,-15);ctx.lineTo(16,-4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
  function drawCat(){const x=game.x,y=H*.69+(game.face==='hide'?6:0),run=game.face==='run',caughtFace=game.face==='caught';ctx.save();ctx.translate(x+rand(-game.shake,game.shake),y+rand(-game.shake,game.shake));ctx.scale(1.16,1.16);if(run)ctx.rotate(Math.sin(game.step)*.035);
    const body='#ffbd79',line='#594940',blush='#f58b93';ctx.strokeStyle=line;ctx.lineWidth=2.7;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.save();ctx.translate(-18,9);ctx.rotate(-.48+Math.sin(game.step*.45)*.22);ctx.strokeStyle=line;ctx.lineWidth=12;ctx.beginPath();ctx.arc(-10,0,22,.05,Math.PI*1.38);ctx.stroke();ctx.strokeStyle=body;ctx.lineWidth=7;ctx.stroke();ctx.restore();
    drawLootBag();
    ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,13,19,21,0,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff1d3';ctx.beginPath();ctx.ellipse(0,18,12,13,0,0,TAU);ctx.fill();
    if(run){ctx.strokeStyle=line;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-10,28);ctx.lineTo(-12,34+Math.sin(game.step)*3);ctx.moveTo(10,28);ctx.lineTo(12,34-Math.sin(game.step)*3);ctx.stroke()}else{ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(-11,29,8,5,-.1,0,TAU);ctx.ellipse(11,29,8,5,.1,0,TAU);ctx.fill();ctx.stroke()}
    ctx.fillStyle=body;rounded(-25,-28,50,42,18,body,line,2.7);
    ctx.beginPath();ctx.moveTo(-21,-17);ctx.lineTo(-17,-38);ctx.lineTo(-5,-24);ctx.moveTo(21,-17);ctx.lineTo(17,-38);ctx.lineTo(5,-24);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ef8d7c';ctx.beginPath();ctx.moveTo(-17,-23);ctx.lineTo(-15,-33);ctx.lineTo(-9,-25);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(17,-23);ctx.lineTo(15,-33);ctx.lineTo(9,-25);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#d88955';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-26);ctx.lineTo(-3,-20);ctx.moveTo(0,-27);ctx.lineTo(0,-20);ctx.moveTo(5,-26);ctx.lineTo(3,-20);ctx.stroke();
    ctx.fillStyle=blush;ctx.globalAlpha=.72;ctx.beginPath();ctx.ellipse(-16,-6,5,3,0,0,TAU);ctx.ellipse(16,-6,5,3,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
    if(caughtFace){ctx.fillStyle=line;ctx.font='900 13px sans-serif';ctx.textAlign='center';ctx.fillText('×',-10,-10);ctx.fillText('×',10,-10)}else if(game.face==='hide'){ctx.strokeStyle=line;ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(-10,-10,5,.12,Math.PI-.12);ctx.stroke();ctx.beginPath();ctx.arc(10,-10,5,.12,Math.PI-.12);ctx.stroke()}else{ctx.fillStyle=line;ctx.beginPath();ctx.ellipse(-10,-11,4.2,5.4,0,0,TAU);ctx.ellipse(10,-11,4.2,5.4,0,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-11.3,-13,1.5,0,TAU);ctx.arc(8.7,-13,1.5,0,TAU);ctx.fill()}
    ctx.fillStyle='#f16f7f';ctx.beginPath();ctx.moveTo(-3,-4);ctx.lineTo(3,-4);ctx.lineTo(0,0);ctx.closePath();ctx.fill();ctx.strokeStyle=line;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(-4,0,4,0,.8);ctx.stroke();ctx.beginPath();ctx.arc(4,0,4,Math.PI-.8,Math.PI);ctx.stroke();
    ctx.globalAlpha=.62;ctx.beginPath();ctx.moveTo(-17,-1);ctx.lineTo(-30,-4);ctx.moveTo(-17,3);ctx.lineTo(-30,5);ctx.moveTo(17,-1);ctx.lineTo(30,-4);ctx.moveTo(17,3);ctx.lineTo(30,5);ctx.stroke();ctx.globalAlpha=1;
    ctx.restore()}
  function drawParticles(){for(const p of game.particles){ctx.save();ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.translate(p.x,p.y);ctx.rotate(p.life*8);if(p.shape===0){ctx.font='12px sans-serif';ctx.fillText('♥',-5,4)}else if(p.shape===1){ctx.fillRect(-2,-5,4,10);ctx.fillRect(-5,-2,10,4)}else{ctx.beginPath();ctx.arc(0,0,p.r,0,TAU);ctx.fill()}ctx.restore()}}
  function draw(){if(!game)return;ctx.save();ctx.translate(rand(-game.shake,game.shake),rand(-game.shake,game.shake));drawBackground();for(const w of game.watchers)drawWatcher(w);for(const f of game.objects)drawFish(f);drawPawTrails();drawCat();drawParticles();ctx.restore();if(!input.down&&state==='play'){ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(0,0,W,H)}}

  function frame(now){if(state!=='play')return;const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();if(state==='play')raf=requestAnimationFrame(frame)}
  function setTarget(clientX){const r=canvas.getBoundingClientRect();input.targetX=clamp(clientX-r.left,34,W-34)}
  canvas.addEventListener('pointerdown',e=>{if(state!=='play')return;input.down=true;input.id=e.pointerId;setTarget(e.clientX);canvas.setPointerCapture(e.pointerId);tone(300,.025,'sine',.008,350)});
  canvas.addEventListener('pointermove',e=>{if(input.down&&input.id===e.pointerId)setTarget(e.clientX)});
  function release(e){if(e.pointerId!==input.id)return;input.down=false;input.id=null;game.face='hide'}canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  $('startButton').addEventListener('click',start);$('retryButton').addEventListener('click',start);$('homeButton').addEventListener('click',()=>{state='title';show(els.result,false);show(els.start,true)});els.escape.addEventListener('click',()=>{if(state==='play'&&game.fish>=3)finish(true,false)});
  $('pauseButton').addEventListener('click',()=>{if(state!=='play')return;state='pause';input.down=false;show(els.pause,true)});$('resumeButton').addEventListener('click',()=>{if(state!=='pause')return;show(els.pause,false);state='play';last=performance.now();raf=requestAnimationFrame(frame)});
  els.sound.addEventListener('click',()=>{soundOn=!soundOn;els.sound.classList.toggle('muted',!soundOn);els.sound.textContent=soundOn?'♪':'×';if(soundOn)tone(560,.08,'sine',.025,780)});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play'){state='pause';input.down=false;show(els.pause,true)}});window.addEventListener('resize',resize,{passive:true});
  resize();els.best.textContent=Number(localStorage.getItem('cat-burglar-best')||0);
})();
