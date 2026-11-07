(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const els = {
    start: $('startLayer'), upgrade: $('upgradeLayer'), result: $('resultLayer'), pause: $('pauseLayer'),
    loop: $('loopLabel'), dots: $('echoDots'), timer: $('timerLabel'), progress: $('timeProgress'), score: $('scoreLabel'),
    hpBar: $('hpBar'), hp: $('hpLabel'), combo: $('comboLabel'), toast: $('toast'), damage: $('damageFlash'),
    pulse: $('pulseButton'), pulseFill: $('pulseCooldown'), pulseHint: $('pulseHint'), joy: $('joystick'), joyKnob: $('joystick').querySelector('i'),
    best: $('bestLabel'), upgradeList: $('upgradeList'), echoCount: $('newEchoCount'),
    resultScore: $('resultScore'), resultLoop: $('resultLoop'), resultKills: $('resultKills'), resultTitle: $('resultTitle'), resultCopy: $('resultCopy'), resultEyebrow: $('resultEyebrow'), rank: $('rankLabel'),
    sound: $('soundButton')
  };

  const LOOP_SECONDS = 30;
  const MAX_LOOPS = 5;
  const TAU = Math.PI * 2;
  const DPR_LIMIT = 2;
  let W = 0, H = 0, dpr = 1;
  let raf = 0, last = 0, state = 'title';
  let audio = null, soundOn = true;
  let input = { active: false, pointerId: null, sx: 0, sy: 0, dx: 0, dy: 0 };
  let game = null;

  const UPGRADES = [
    { id:'damage', icon:'◆', title:'기억의 칼날', copy:'모든 공격력이 30% 증가합니다.', apply:g=>g.damage*=1.3 },
    { id:'rapid', icon:'ϟ', title:'빠른 결심', copy:'공격 속도가 20% 빨라집니다.', apply:g=>g.fireRate*=.8 },
    { id:'echo', icon:'◎', title:'잔상의 맹세', copy:'과거의 나 공격력이 35% 증가합니다.', apply:g=>g.echoPower*=1.35 },
    { id:'health', icon:'＋', title:'고정된 생명', copy:'최대 코어 +30, 모두 회복합니다.', apply:g=>{g.maxHp+=30;g.hp=g.maxHp} },
    { id:'speed', icon:'»', title:'시간 가속', copy:'이동 속도가 18% 증가합니다.', apply:g=>g.speed*=1.18 },
    { id:'pulse', icon:'✦', title:'파동 증폭', copy:'시간 파동 재사용이 25% 감소합니다.', apply:g=>g.pulseMax*=.75 },
  ];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (game?.player) {
      game.player.x = clamp(game.player.x, 24, W - 24);
      game.player.y = clamp(game.player.y, 50, H - 24);
    }
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist2(a, b) { const x=a.x-b.x, y=a.y-b.y; return x*x+y*y; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pad(n) { return String(Math.max(0, Math.ceil(n))).padStart(2, '0'); }

  function ensureAudio() {
    if (!soundOn) return null;
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  function tone(freq, duration=.05, type='sine', gain=.025, endFreq=null) {
    const a = ensureAudio(); if (!a) return;
    const o=a.createOscillator(), g=a.createGain(), t=a.currentTime;
    o.type=type; o.frequency.setValueAtTime(freq,t); if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+duration);
    g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+duration);
  }

  function vibrate(pattern) { if (navigator.vibrate) navigator.vibrate(pattern); }
  function showLayer(el, visible) { el.classList.toggle('active', visible); el.setAttribute('aria-hidden', visible ? 'false' : 'true'); }
  function toast(text) { els.toast.textContent=text; els.toast.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>els.toast.classList.remove('show'),1100); }

  function freshGame() {
    const best = Number(localStorage.getItem('loop-legion-best') || 0);
    els.best.textContent = best.toLocaleString('ko-KR');
    return {
      loop:1, elapsed:0, score:0, kills:0, combo:0, comboTimer:0,
      hp:100, maxHp:100, damage:11, echoPower:.72, fireRate:.52, speed:180,
      pulse:0, pulseMax:8, spawnClock:0, shotClock:0, recordClock:0,
      player:{x:W/2,y:H*.63,r:12,flash:0},
      recordings:[], currentRecord:[], echoes:[], enemies:[], bullets:[], particles:[], rings:[], pickups:[],
      shake:0, bossSpawned:false, bossKilled:false
    };
  }

  function startGame() {
    ensureAudio();
    game=freshGame(); state='play'; last=performance.now();
    showLayer(els.start,false); showLayer(els.result,false); showLayer(els.upgrade,false); showLayer(els.pause,false);
    resetLoopPosition(); updateHud(); tone(380,.08,'triangle',.04,760); vibrate(18);
    cancelAnimationFrame(raf); raf=requestAnimationFrame(frame);
  }

  function resetLoopPosition() {
    game.elapsed=0; game.player.x=W/2; game.player.y=H*.67; game.currentRecord=[]; game.recordClock=0;
    game.enemies=[]; game.bullets=[]; game.pickups=[]; game.echoes=game.recordings.map((rec,i)=>({record:rec,x:W/2,y:H*.67,shot:rand(0,.2),index:i}));
    game.bossSpawned=false; game.pulse=0; input.dx=0; input.dy=0; els.joyKnob.style.transform='translate(0,0)';
    toast(game.loop===1?'30초를 버티세요':`${game.echoes.length}명의 과거와 협공`);
  }

  function endLoop() {
    if (state!=='play') return;
    game.recordings.push(game.currentRecord.slice());
    if (game.loop >= MAX_LOOPS) { finish(true); return; }
    state='upgrade'; tone(720,.38,'sine',.055,120); vibrate([30,40,60]);
    els.echoCount.textContent=String(game.recordings.length);
    renderUpgradeChoices(); showLayer(els.upgrade,true);
  }

  function renderUpgradeChoices() {
    const choices=[...UPGRADES].sort(()=>Math.random()-.5).slice(0,3);
    els.upgradeList.innerHTML='';
    choices.forEach(up=>{
      const button=document.createElement('button'); button.className='upgrade-card';
      button.innerHTML=`<i>${up.icon}</i><span><b>${up.title}</b><small>${up.copy}</small></span><b>›</b>`;
      button.addEventListener('click',()=>{
        up.apply(game); game.loop++; showLayer(els.upgrade,false); state='play'; resetLoopPosition(); updateHud();
        tone(520,.1,'triangle',.04,900); last=performance.now(); raf=requestAnimationFrame(frame);
      },{once:true});
      els.upgradeList.appendChild(button);
    });
  }

  function finish(won=false) {
    state='result';
    const best=Math.max(game.score,Number(localStorage.getItem('loop-legion-best')||0));
    localStorage.setItem('loop-legion-best',String(best)); els.best.textContent=best.toLocaleString('ko-KR');
    const rank=won?'S':game.score>8500?'A':game.score>4500?'B':'C';
    els.rank.textContent=rank; els.resultScore.textContent=game.score.toLocaleString('ko-KR'); els.resultLoop.textContent=game.loop; els.resultKills.textContent=game.kills;
    els.resultEyebrow.textContent=won?'TIMELINE SECURED':'TIMELINE COLLAPSED';
    els.resultTitle.textContent=won?'완벽한 시간선을 만들었습니다':'시간선이 무너졌습니다';
    els.resultCopy.textContent=won?'다섯 명의 내가 하나의 군단이 되었습니다.':'과거의 나들과 더 좋은 동선을 만들어 보세요.';
    showLayer(els.result,true); tone(won?880:180,.45,won?'sine':'sawtooth',.045,won?1320:70); vibrate(won?[50,35,50,35,100]:[90,50,120]);
  }

  function spawnEnemy() {
    const side=Math.floor(Math.random()*4); let x,y;
    if(side===0){x=rand(10,W-10);y=-18}else if(side===1){x=W+18;y=rand(25,H-10)}else if(side===2){x=rand(10,W-10);y=H+18}else{x=-18;y=rand(25,H-10)}
    const hard=1+(game.loop-1)*.18+game.elapsed/150;
    const brute=Math.random()<Math.min(.08+game.loop*.035,.24);
    game.enemies.push({x,y,r:brute?15:9,hp:(brute?50:22)*hard,maxHp:(brute?50:22)*hard,speed:(brute?32:48)*rand(.86,1.14),hit:0,type:brute?'brute':'drone',phase:rand(0,TAU)});
  }

  function spawnBoss() {
    game.bossSpawned=true; const hp=420+game.loop*65;
    game.enemies.push({x:W/2,y:-34,r:27,hp,maxHp:hp,speed:23,hit:0,type:'boss',phase:0}); toast('⚠ 시간 포식자 출현'); tone(100,.35,'sawtooth',.05,55); vibrate([40,30,70]);
  }

  function shoot(actor, power, echo=false) {
    let target=null,best=Infinity;
    for(const e of game.enemies){const d=dist2(actor,e);if(d<best){best=d;target=e}}
    if(!target||best>260*260)return false;
    const ang=Math.atan2(target.y-actor.y,target.x-actor.x);
    game.bullets.push({x:actor.x+Math.cos(ang)*13,y:actor.y+Math.sin(ang)*13,vx:Math.cos(ang)*440,vy:Math.sin(ang)*440,r:echo?3:4,damage:power,echo,life:1.1});
    burst(actor.x+Math.cos(ang)*13,actor.y+Math.sin(ang)*13,echo?'#66ecff':'#c7ff6b',2,45);
    if(!echo) tone(240,.025,'square',.009,360);
    return true;
  }

  function usePulse(fromReplay=false, actor=game.player) {
    if(!fromReplay && (state!=='play'||game.pulse>0))return;
    if(!fromReplay)game.pulse=game.pulseMax;
    game.rings.push({x:actor.x,y:actor.y,r:8,max:105,life:.42,color:fromReplay?'#66ecff':'#c7ff6b'});
    for(const e of game.enemies){const d=Math.sqrt(dist2(actor,e));if(d<105){e.hp-=game.damage*(fromReplay?.9:2.2);const a=Math.atan2(e.y-actor.y,e.x-actor.x);e.x+=Math.cos(a)*22;e.y+=Math.sin(a)*22;e.hit=.12}}
    burst(actor.x,actor.y,fromReplay?'#66ecff':'#c7ff6b',14,150); game.shake=Math.max(game.shake,5);
    if(!fromReplay){game.currentRecord.push({t:game.elapsed,x:actor.x/W,y:actor.y/H,pulse:true});tone(160,.22,'sine',.055,680);vibrate(30)}
  }

  function update(dt) {
    game.elapsed+=dt; game.pulse=Math.max(0,game.pulse-dt); game.player.flash=Math.max(0,game.player.flash-dt); game.shake=Math.max(0,game.shake-dt*18);
    const len=Math.hypot(input.dx,input.dy); const nx=len?input.dx/len:0,ny=len?input.dy/len:0;
    game.player.x=clamp(game.player.x+nx*game.speed*dt,18,W-18); game.player.y=clamp(game.player.y+ny*game.speed*dt,45,H-18);
    game.recordClock-=dt; if(game.recordClock<=0){game.recordClock=.05;game.currentRecord.push({t:game.elapsed,x:game.player.x/W,y:game.player.y/H,pulse:false})}

    game.shotClock-=dt; if(game.shotClock<=0&&shoot(game.player,game.damage,false))game.shotClock=game.fireRate;
    for(const ghost of game.echoes){
      const idx=Math.min(ghost.record.length-1,Math.max(0,Math.floor(game.elapsed/.05)));
      const p=ghost.record[idx]; if(p){ghost.x=lerp(ghost.x,p.x*W,.36);ghost.y=lerp(ghost.y,p.y*H,.36)}
      ghost.shot-=dt;if(ghost.shot<=0&&shoot(ghost,game.damage*game.echoPower,true))ghost.shot=game.fireRate*1.08;
      if(p?.pulse&&!ghost.lastPulse){usePulse(true,ghost)}ghost.lastPulse=!!p?.pulse;
    }

    game.spawnClock-=dt;
    const spawnGap=Math.max(.34,1.0-game.loop*.09-game.elapsed*.004);
    if(game.spawnClock<=0){spawnEnemy();game.spawnClock=spawnGap}
    if(game.loop>=3&&!game.bossSpawned&&game.elapsed>18)spawnBoss();

    for(const e of game.enemies){
      e.hit=Math.max(0,e.hit-dt);e.phase+=dt*3;
      const a=Math.atan2(game.player.y-e.y,game.player.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;
      const rr=e.r+game.player.r;
      if(dist2(e,game.player)<rr*rr){game.hp-=dt*(e.type==='boss'?38:e.type==='brute'?24:15);game.player.flash=.08;game.shake=Math.max(game.shake,2.5);if(Math.random()<dt*5)hitFeedback()}
    }

    for(const b of game.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of game.enemies){const rr=b.r+e.r;if(b.life>0&&dist2(b,e)<rr*rr){e.hp-=b.damage;e.hit=.08;b.life=0;burst(b.x,b.y,b.echo?'#66ecff':'#c7ff6b',3,80);break}}}
    game.bullets=game.bullets.filter(b=>b.life>0&&b.x>-20&&b.x<W+20&&b.y>-20&&b.y<H+20);

    const dead=[];
    for(const e of game.enemies)if(e.hp<=0){dead.push(e);game.kills++;game.combo++;game.comboTimer=1.65;const pts=Math.round((e.type==='boss'?1500:e.type==='brute'?110:40)*(1+Math.min(game.combo,30)*.035));game.score+=pts;burst(e.x,e.y,e.type==='boss'?'#ff65b3':'#8a6bff',e.type==='boss'?38:10,e.type==='boss'?250:125);if(e.type==='boss'){game.bossKilled=true;toast('시간 포식자 격파 +1500');tone(520,.25,'triangle',.045,1050);vibrate([30,25,80])}}
    if(dead.length)game.enemies=game.enemies.filter(e=>!dead.includes(e));
    game.comboTimer-=dt;if(game.comboTimer<=0)game.combo=0;

    for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.975;p.vy*=.975;p.life-=dt}
    game.particles=game.particles.filter(p=>p.life>0);
    for(const r of game.rings){r.life-=dt;r.r=lerp(r.r,r.max,.18)}game.rings=game.rings.filter(r=>r.life>0);

    if(game.hp<=0){game.hp=0;finish(false);return}
    if(game.elapsed>=LOOP_SECONDS){endLoop();return}
    updateHud();
  }

  function hitFeedback(){els.damage.classList.add('active');clearTimeout(hitFeedback.t);hitFeedback.t=setTimeout(()=>els.damage.classList.remove('active'),90)}
  function burst(x,y,color,count=8,speed=100){for(let i=0;i<count;i++){const a=rand(0,TAU),s=rand(speed*.25,speed);game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.18,.55),max:.55,r:rand(1.2,3.4),color})}}

  function updateHud(){
    if(!game)return;const remain=Math.max(0,LOOP_SECONDS-game.elapsed);
    els.loop.textContent=pad(game.loop);els.timer.textContent=`00:${pad(remain)}`;els.progress.style.transform=`scaleX(${remain/LOOP_SECONDS})`;
    els.score.textContent=game.score.toLocaleString('ko-KR');els.hp.textContent=Math.ceil(game.hp);els.hpBar.style.width=`${game.hp/game.maxHp*100}%`;
    els.dots.innerHTML='<i></i>'.repeat(game.echoes.length);
    els.combo.textContent=game.combo>=3?`${game.combo} COMBO`:'';els.combo.classList.toggle('show',game.combo>=3);
    const cd=game.pulse/game.pulseMax;els.pulseFill.style.height=`${cd*100}%`;els.pulse.classList.toggle('ready',game.pulse<=0);els.pulseHint.textContent=game.pulse<=0?'READY':game.pulse.toFixed(1)+'s';
  }

  function drawGrid(t){
    const grad=ctx.createRadialGradient(W*.5,H*.48,20,W*.5,H*.48,Math.max(W,H)*.72);grad.addColorStop(0,'#17143c');grad.addColorStop(.58,'#0d0b27');grad.addColorStop(1,'#070619');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle='#7564d9';ctx.lineWidth=1;
    const step=34,ox=(t*8)%step,oy=(t*5)%step;
    for(let x=-step+ox;x<W+step;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
    for(let y=-step+oy;y<H+step;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    ctx.globalAlpha=.18;ctx.strokeStyle='#66ecff';ctx.strokeRect(10,10,W-20,H-20);ctx.restore();
    for(let i=0;i<18;i++){const x=(i*83.7+t*(i%3+1)*2)%W,y=(i*47.3+t*(i%4+1))%H;ctx.fillStyle=i%3?'rgba(255,255,255,.13)':'rgba(102,236,255,.22)';ctx.fillRect(x,y,1.2,1.2)}
  }

  function drawActor(a,ghost=false,index=0){
    ctx.save();ctx.translate(a.x,a.y);const bob=Math.sin(performance.now()/180+index)*1.5;ctx.translate(0,bob);
    const color=ghost?'#66ecff':'#c7ff6b';ctx.shadowColor=color;ctx.shadowBlur=ghost?13:18;ctx.globalAlpha=ghost?.48:1;
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,-4,8,0,TAU);ctx.fill();ctx.fillStyle=ghost?'rgba(102,236,255,.3)':'#7961f2';ctx.beginPath();ctx.roundRect(-10,3,20,18,7);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#09081b';ctx.fillRect(-4,-6,2,2);ctx.fillRect(3,-6,2,2);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,20);ctx.lineTo(-7,26);ctx.moveTo(6,20);ctx.lineTo(7,26);ctx.stroke();
    if(!ghost){ctx.globalAlpha=.65;ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,5,16,0,TAU);ctx.stroke()}
    ctx.restore();
  }

  function drawEnemy(e){
    ctx.save();ctx.translate(e.x,e.y);const hit=e.hit>0;const color=e.type==='boss'?'#ff65b3':e.type==='brute'?'#ff9f6b':'#8a6bff';ctx.shadowColor=color;ctx.shadowBlur=hit?24:10;ctx.fillStyle=hit?'#fff':color;
    if(e.type==='boss'){ctx.rotate(e.phase*.2);ctx.beginPath();for(let i=0;i<12;i++){const a=i/12*TAU,r=i%2?20:29;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fill();ctx.rotate(-e.phase*.6);ctx.fillStyle='#170b27';ctx.beginPath();ctx.arc(0,0,13,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(0,0,7,3,0,0,TAU);ctx.fill();ctx.fillStyle='#ff3f8d';ctx.beginPath();ctx.arc(0,0,2.5,0,TAU);ctx.fill()}
    else {ctx.rotate(Math.sin(e.phase)*.15);ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU-Math.PI/2,x=Math.cos(a)*e.r,y=Math.sin(a)*e.r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fill();ctx.fillStyle='#13102c';ctx.beginPath();ctx.arc(0,0,e.r*.42,0,TAU);ctx.fill();ctx.fillStyle='#ffeff8';ctx.fillRect(-3,-1,6,2)}
    ctx.shadowBlur=0;if(e.type!=='drone'&&e.hp<e.maxHp){ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(-e.r,e.r+7,e.r*2,3);ctx.fillStyle=color;ctx.fillRect(-e.r,e.r+7,e.r*2*(e.hp/e.maxHp),3)}ctx.restore();
  }

  function draw(){
    if(!game)return;ctx.save();const sx=game.shake?rand(-game.shake,game.shake):0,sy=game.shake?rand(-game.shake,game.shake):0;ctx.translate(sx,sy);drawGrid(game.elapsed);
    for(const r of game.rings){ctx.save();ctx.globalAlpha=clamp(r.life/.42,0,1);ctx.strokeStyle=r.color;ctx.lineWidth=3;ctx.shadowColor=r.color;ctx.shadowBlur=16;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,TAU);ctx.stroke();ctx.restore()}
    for(const e of game.enemies)drawEnemy(e);
    for(let i=0;i<game.echoes.length;i++)drawActor(game.echoes[i],true,i);
    drawActor(game.player,false,game.loop);
    for(const b of game.bullets){ctx.save();ctx.fillStyle=b.echo?'#66ecff':'#c7ff6b';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();ctx.restore()}
    for(const p of game.particles){ctx.save();ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill();ctx.restore()}
    ctx.restore();
  }

  function frame(now){
    if(state!=='play')return;const dt=Math.min(.034,(now-last)/1000||0);last=now;update(dt);draw();if(state==='play')raf=requestAnimationFrame(frame);
  }

  function setInput(clientX,clientY){
    const r=canvas.getBoundingClientRect();const x=clientX-r.left,y=clientY-r.top;
    input.dx=x-input.sx;input.dy=y-input.sy;const len=Math.hypot(input.dx,input.dy),max=42;if(len>max){input.dx=input.dx/len*max;input.dy=input.dy/len*max}
    els.joyKnob.style.transform=`translate(${input.dx*.46}px,${input.dy*.46}px)`;
  }

  canvas.addEventListener('pointerdown',e=>{if(state!=='play')return;input.active=true;input.pointerId=e.pointerId;const r=canvas.getBoundingClientRect();input.sx=e.clientX-r.left;input.sy=e.clientY-r.top;canvas.setPointerCapture(e.pointerId);setInput(e.clientX,e.clientY)});
  canvas.addEventListener('pointermove',e=>{if(input.active&&e.pointerId===input.pointerId)setInput(e.clientX,e.clientY)});
  function release(e){if(!input.active||e.pointerId!==input.pointerId)return;input.active=false;input.pointerId=null;input.dx=0;input.dy=0;els.joyKnob.style.transform='translate(0,0)'}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);

  $('startButton').addEventListener('click',startGame);
  $('retryButton').addEventListener('click',startGame);
  $('homeButton').addEventListener('click',()=>{showLayer(els.result,false);showLayer(els.start,true);state='title'});
  els.pulse.addEventListener('pointerdown',e=>{e.preventDefault();usePulse(false)});
  $('pauseButton').addEventListener('click',()=>{if(state!=='play')return;state='pause';showLayer(els.pause,true)});
  $('resumeButton').addEventListener('click',()=>{if(state!=='pause')return;showLayer(els.pause,false);state='play';last=performance.now();raf=requestAnimationFrame(frame)});
  els.sound.addEventListener('click',()=>{soundOn=!soundOn;els.sound.classList.toggle('muted',!soundOn);els.sound.textContent=soundOn?'♪':'×';if(soundOn)tone(520,.08,'sine',.025,700)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play'){state='pause';showLayer(els.pause,true)}});
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('keydown',e=>{if(!game||state!=='play')return;const k=e.key.toLowerCase();if(k===' '){e.preventDefault();usePulse(false)};const map={arrowleft:[-42,0],a:[-42,0],arrowright:[42,0],d:[42,0],arrowup:[0,-42],w:[0,-42],arrowdown:[0,42],s:[0,42]};if(map[k]){input.dx=map[k][0];input.dy=map[k][1]}});
  window.addEventListener('keyup',e=>{if(['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(e.key.toLowerCase())){input.dx=0;input.dy=0}});

  resize();els.best.textContent=Number(localStorage.getItem('loop-legion-best')||0).toLocaleString('ko-KR');
})();
