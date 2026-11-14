(() => {
  'use strict';
  const {Life,ACTIVITIES,GIFTS}=Forest, KEY='pocket-forest-v1', $=id=>document.getElementById(id);
  let raw=null;try{raw=localStorage.getItem(KEY);}catch{}
  const life=new Life(raw), s=life.s, sheet=$('sheet');
  const slots=[{x:24,y:77,name:'창가 쪽'},{x:76,y:65,name:'침대 옆'},{x:77,y:89,name:'러그 옆'}];
  let mode='',toastTimer,poseTimer,speechTimer,storageWarning=false,lastPetSound=0,audioCtx,selectedGift=null,petPose='',lastFocus=null;
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dayKey=()=>{const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};
  const giftStyle=id=>{const i=GIFTS[id].index;return `--gx:${(i%3)*50}%;--gy:${Math.floor(i/3)*100}%`;};
  const art=id=>`<span class="gift-art" style="${giftStyle(id)}" aria-hidden="true"></span>`;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{if(!storageWarning){storageWarning=true;toast('이 브라우저에서는 저장할 수 없어요.');}}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('show');if(sheet.open){$('sheet-notice').textContent=text;$('sheet-notice').hidden=false;}clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').classList.remove('show');$('sheet-notice').hidden=true;},2600);}
  function say(text,ms=6500){clearTimeout(speechTimer);$('speech').textContent=text;if(ms)speechTimer=setTimeout(idleSpeech,ms);}
  function idleSpeech(){
    if(s.pending)return say('너 생각하면서 준비했어. 열어 볼래?',0);
    if(s.active)return say({garden:'조금만 기다려 줘. 싹이 고개를 내밀었어!',craft:'삐뚤빼뚤해도… 마음은 가득 담을게.',explore:'숲 냄새가 좋아. 너한테 뭘 가져갈까?'}[s.active.type],0);
    const msg={calm:'오늘은 천천히, 나랑 쉬어 가자.',busy:'바빴구나. 여기서는 잠깐 쉬어도 돼.',tired:'아무것도 안 해도 돼. 옆에 있어 줄게.'}[s.checkins[dayKey()]];
    const habit={'식물 친구':'새싹이 조금 자랐어. 너한테 먼저 보여 주고 싶었어.','꼬마 발명가':'다음에는 뭘 만들까? 너한테 필요한 거면 좋겠어.','숲속 모험가':'창밖에서 바람 냄새가 나. 새로운 길이 있을까?'}[life.trait];
    say(msg||habit||(s.inventory.length?'네가 오면 이 집이 더 따뜻해져.':'안녕! 오늘부터 여기 같이 살자.'),0);
  }
  function sound(notes=[523,659,784]){
    if(!s.settings.sound)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const now=audioCtx.currentTime;notes.forEach((freq,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,now+i*.09);g.gain.linearRampToValueAtTime(.06,now+i*.09+.015);g.gain.exponentialRampToValueAtTime(.001,now+i*.09+.28);o.connect(g);g.connect(audioCtx.destination);o.start(now+i*.09);o.stop(now+i*.09+.3);});}catch{}
  }
  function hearts(count=4){for(let i=0;i<count;i++){const e=document.createElement('span');e.className='heart';e.textContent=i%2?'✦':'♥';e.style.cssText=`--x:${42+Math.random()*16}%;--y:${53+Math.random()*8}%;animation-delay:${i*.1}s`;e.addEventListener('animationend',()=>e.remove());$('hearts').append(e);setTimeout(()=>e.remove(),2200);}}
  function setPose(pose,ms=3500){clearTimeout(poseTimer);petPose=pose;updatePet();if(ms)poseTimer=setTimeout(()=>{petPose='';updatePet();$('pet').style.removeProperty('--pet-x');$('pet').style.removeProperty('--pet-y');},ms);}
  function updatePet(){
    $('pet').className='pet '+(petPose||(s.active?'working':''));$('pet').setAttribute('aria-label',s.name+' 쓰다듬기');
    $('pet-accessory').textContent=petPose==='sleep'?'ᶻ ᶻ':s.active?ACTIVITIES[s.active.type].icon:'';
  }
  function renderFurniture(){
    $('furniture-layer').innerHTML=s.slots.map((id,i)=>{const slot=slots[i];return id?`<button class="furniture ${i===2?'front':''} ${id==='lantern'?'lit':''}" style="--x:${slot.x}%;--y:${slot.y}%" data-use="${id}" data-slot="${i}" aria-label="${esc(GIFTS[id].name)} 사용하기">${art(id)}</button>`:'';}).join('');
    document.querySelectorAll('[data-use]').forEach(el=>el.onclick=()=>useGift(el.dataset.use,Number(el.dataset.slot)));
    $('interact').hidden=!s.inventory.length;
  }
  function render(){
    const days=Math.max(1,Math.floor((Date.now()-s.created)/86400000)+1);
    $('bond-label').textContent=`${s.name}와 ${days===1?'첫날':days+'일째'}`;$('trait-label').textContent=life.trait;
    $('level').textContent='Lv. '+life.level;$('growth-fill').style.width=(s.xp%100)+'%';$('growth-value').textContent=`${s.xp%100} / 100`;
    $('day-kicker').textContent=s.name+'의 작은 하루';$('parcel').hidden=!s.pending;
    $('touch-hint').textContent=s.pending?'선물을 톡 눌러 열어 주세요':s.slots.some(Boolean)?'선물을 누르면 모리가 사용해요':s.name+'를 톡, 쓰다듬어 주세요';
    $('day-icon').textContent=s.active?ACTIVITIES[s.active.type].icon:s.pending?'✿':'☘';
    $('activity-progress').hidden=!s.active;
    if(s.pending){$('day-title').textContent='너에게 줄 선물이 있어!';$('day-desc').textContent='오늘의 이야기를 들어 주세요.';$('day-action').textContent='♡';$('day-action').setAttribute('aria-label','오늘의 선물 열기');}
    else if(s.active){$('day-title').textContent=ACTIVITIES[s.active.type].verb;updateClock();$('day-action').textContent='…';$('day-action').setAttribute('aria-label','활동 진행 상황');}
    else{$('day-title').textContent=s.inventory.length?'다음엔 뭘 해볼까?':'오늘은 뭘 해볼까?';$('day-desc').textContent='작은 모험이 우리 집의 추억이 돼요.';$('day-action').textContent='↗';$('day-action').setAttribute('aria-label','모리의 하루 골라주기');}
    updatePet();renderFurniture();
  }
  function updateClock(){if(!s.active)return;const sec=Math.max(0,Math.ceil((s.active.ends-Date.now())/1000));const time=sec<60?`${sec}초`:`${Math.ceil(sec/60)}분`;
    $('day-desc').textContent=`${time} 뒤에 돌아와요 · ${s.settings.demo?'빠른 체험 중':'앱을 닫아도 괜찮아요'}`;
    $('activity-progress').firstElementChild.style.width=Math.min(100,100*(Date.now()-s.active.started)/(s.active.ends-s.active.started||1))+'%';
    const el=$('busy-timer');if(el)el.textContent=time;
  }
  function open(title,kicker,html,newMode){lastFocus=sheet.open?lastFocus:document.activeElement;mode=newMode;$('sheet-title').textContent=title;$('sheet-kicker').textContent=kicker;$('sheet-content').innerHTML=html;if(!sheet.open)sheet.showModal();sheet.scrollTop=0;}
  function close(){if(mode==='mini')$('sheet-content').innerHTML='';sheet.close();$('sheet-notice').hidden=true;mode='';document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.id==='home-nav'));if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
  function activeNav(id){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.id===id));}
  $('close-sheet').onclick=close;sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  sheet.addEventListener('cancel',e=>{e.preventDefault();close();});sheet.addEventListener('close',()=>{if(mode==='mini')$('sheet-content').innerHTML='';});
  function activities(){
    if(s.pending)return showGift();if(s.active)return busy();
    activeNav('activities-nav');
    open('오늘은 어떤 하루를 보낼까?','A DAY OF MY OWN',`<p class="subtle">${esc(s.name)}도 자기만의 하루를 보내요.<br>돌아오면 작은 선물과 이야기를 들려줄 거예요.</p><div class="activity-options">${Object.entries(ACTIVITIES).map(([id,a])=>`<button class="activity-option" data-start="${id}"><span class="activity-symbol">${a.icon}</span><div><b>${a.name}</b><small>${a.place} · ${s.settings.demo?'20초 체험':'30분'}<br>${a.trait}의 취향이 자라요</small></div><span>→</span></button>`).join('')}</div><button class="secondary" id="play-mini">♡ 잠깐, 손잡고 놀까? · 꼬옥 놀이</button><p class="subtle">자주 오지 않아도 괜찮아요. 모리는 아프거나 떠나지 않아요.</p>`,'activities');
    document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{if(life.start(b.dataset.start)){save();close();render();idleSpeech();sound();toast(s.name+'의 작은 하루가 시작됐어요.');}});
    $('play-mini').onclick=mini;
  }
  function busy(){const a=s.active;if(!a)return activities();
    open(ACTIVITIES[a.type].name,'A LITTLE TIME TOGETHER',`<div class="busy-art pet-art"></div><div id="busy-timer" class="timer"></div><p class="busy-copy">${esc(s.name)}가 ${ACTIVITIES[a.type].place}에서<br>당신을 생각하고 있어요.</p><button class="primary" id="busy-close">알겠어, 다녀와!</button>${s.settings.demo?'<button class="secondary" id="preview-finish">지금 돌아오기 · 체험용</button>':''}<p class="subtle">브라우저를 닫아도 시간이 흘러요. 돌아오면 선물이 기다려요.</p>`,'busy');updateClock();$('busy-close').onclick=close;
    if($('preview-finish'))$('preview-finish').onclick=()=>{if(life.previewFinish()){save();render();idleSpeech();showGift();sound();}};
  }
  function showGift(){const p=s.pending;if(!p)return activities();const g=GIFTS[p.gift],isNew=!s.inventory.includes(p.gift);
    open('너 주려고 준비했어','A LITTLE GIFT FOR YOU',`<div class="gift-reveal"><span class="pill">${isNew?'처음 만나는 선물':'또 하나의 작은 추억'} · ${ACTIVITIES[p.type].name}</span>${art(p.gift)}<h3>${g.name}</h3><blockquote>“${esc(p.story)}”</blockquote><button id="receive-gift" class="primary">고마워, 소중히 간직할게 ♡</button><p class="subtle">함께한 마음 +40 · ${ACTIVITIES[p.type].trait} 취향 +1</p></div>`,'gift');
    $('receive-gift').onclick=()=>{const oldLevel=life.level,p=life.claim();if(!p)return;save();render();sound([523,659,784,1047]);if(life.level>oldLevel)toast(`조금 더 가까워졌어요 · Lv. ${life.level}`);placeSheet(p.gift);};
  }
  function decorate(){activeNav('decorate-nav');
    open('차곡차곡, 우리의 집','MADE OF LITTLE MEMORIES',`<p class="subtle">함께 보낸 하루가 물건으로 남아요.<br>선물을 골라 방에 놓아 주세요. ${s.inventory.length} / 6 발견</p><div class="collection-grid">${Object.entries(GIFTS).map(([id,g])=>{const own=s.inventory.includes(id);return `<button class="collection-item ${own?'':'locked'}" data-gift="${id}" aria-label="${own?g.name:g.name+' 아직 발견하지 못함'}">${art(id)}<b>${own?g.name:'아직 만나지 못한 선물'}</b><small>${own?'방에 놓아 보기':ACTIVITIES[g.from].name}</small>${s.slots.includes(id)?'<span class="placed">방 안에</span>':''}</button>`;}).join('')}</div><p class="subtle">방에는 3개까지 놓을 수 있어요. 바꿔 놓아도 선물은 사라지지 않아요.</p>`,'decorate');
    document.querySelectorAll('[data-gift]').forEach(b=>b.onclick=()=>{const id=b.dataset.gift;if(!s.inventory.includes(id)){toast(ACTIVITIES[GIFTS[id].from].name+'를 함께 해보세요.');return;}placeSheet(id);});
  }
  function placeSheet(id){selectedGift=id;const g=GIFTS[id];
    open('어디에 놓아 줄까?','A PLACE IN OUR HOME',`<div class="gift-reveal">${art(id)}<h3>${g.name}</h3></div><div class="slot-options">${slots.map((slot,i)=>`<button data-place="${i}"><span>${s.slots[i]?'↻':'+'}</span>${slot.name}<small>${s.slots[i]?GIFTS[s.slots[i]].name+' 대신':'비어 있어요'}</small></button>`).join('')}</div>${s.slots.includes(id)?'<button class="secondary" id="put-away">잠깐 보관하기</button>':''}<button class="secondary" id="place-later">나중에 놓을게</button>`,'place');
    document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{const index=Number(b.dataset.place);if(life.place(selectedGift,index)){save();render();close();useGift(selectedGift,index);toast('우리 집에 새로운 추억이 생겼어요.');}});
    $('place-later').onclick=()=>{close();say('어디에 놓아도 좋아. 네가 골라 줘.');};
    if($('put-away'))$('put-away').onclick=()=>{life.remove(s.slots.indexOf(id));save();render();decorate();};
  }
  function useGift(id,index){if(s.active||s.pending){say(s.pending?'선물부터 열어 보자!':'돌아오면 같이 써 보자!');return;}
    const slot=slots[index];$('pet').style.setProperty('--pet-x',(slot.x<50?slot.x+15:slot.x-18)+'%');$('pet').style.setProperty('--pet-y',(slot.y-2)+'%');setPose('walk',0);say(GIFTS[id].use,9500);
    poseTimer=setTimeout(()=>{setPose(GIFTS[id].pose,8000);sound([440,554]);},1600);
  }
  function diary(){activeNav('diary-nav');const max=Math.max(3,...Object.values(s.counts));
    open('우리의 작은 기록','EVERY DAY, A LITTLE CLOSER',`<div class="traits"><b>${esc(s.name)}는 ${life.trait==='아직 알아가는 사이'?'어떤 친구가 될까?':life.trait}</b>${Object.entries(ACTIVITIES).map(([id,a])=>`<div class="trait-row"><span>${a.trait}</span><i><b style="width:${s.counts[id]/max*100}%"></b></i><small>${s.counts[id]}번</small></div>`).join('')}<p class="subtle">함께 보낸 활동에 따라 취향이 자라요.</p></div><div class="journal">${s.journal.length?s.journal.map(e=>e.kind==='gift'?`<article class="entry"><div class="entry-art">${art(e.gift)}</div><span class="date">${formatDate(e.at)}</span><h3>${GIFTS[e.gift].name}</h3><p>“${esc(e.story)}”</p></article>`:`<article class="entry"><span class="date">${formatDate(e.at)}</span><h3>${{calm:'느긋한 하루를 함께',busy:'바쁜 하루 끝에서',tired:'잠깐 쉬어 가는 날'}[e.mood]}</h3><p>${esc(s.name)}에게 오늘의 마음을 들려줬어요.</p></article>`).join(''):'<div class="empty"><span>❧</span>아직 빈 페이지예요.<br>첫 번째 하루를 함께 보내 볼까요?</div>'}</div><p class="subtle">기록은 이 기기의 브라우저에 저장돼요.</p>`,'diary');
  }
  function formatDate(at){return new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(at));}
  function checkin(){
    open('오늘, 너의 하루는 어땠어?','I AM HERE WITH YOU',`<p class="subtle">말하고 싶을 때만 들려줘.<br>어떤 하루였어도 나는 네 편이야.</p><div class="mood-options"><button data-mood="calm"><span>☀</span>조금 느긋한 하루야</button><button data-mood="busy"><span>☁</span>정신없이 바빴어</button><button data-mood="tired"><span>☾</span>그냥 쉬고 싶은 날이야</button></div>`,'checkin');
    document.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>{life.checkin(dayKey(),b.dataset.mood);save();close();render();idleSpeech();hearts(3);setPose('happy');});
  }
  function settings(){
    open('우리만의 속도로','MAKE YOURSELF AT HOME',`<label class="form-label" for="pet-name">친구의 이름</label><input id="pet-name" type="text" maxlength="12" value="${esc(s.name)}" autocomplete="off"><button class="secondary" id="save-name">이 이름으로 부르기</button><div class="setting-row"><div><b>빠른 체험</b><small>켬: 활동 20초 · 끔: 일상 모드 30분</small></div><button id="demo-toggle" class="toggle ${s.settings.demo?'on':''}" aria-pressed="${s.settings.demo}">${s.settings.demo?'켜짐':'꺼짐'}</button></div><div class="setting-row"><div><b>작은 효과음</b><small>쓰다듬고, 선물을 받을 때</small></div><button id="sound-toggle" class="toggle ${s.settings.sound?'on':''}" aria-pressed="${s.settings.sound}">${s.settings.sound?'켜짐':'꺼짐'}</button></div><p class="subtle">접속하지 않아도 아프거나 떠나지 않아요.<br>시간대에 따라 방의 빛이 달라져요.<br>데이터는 현재 기기·브라우저에만 저장돼요.<br>앱 삭제나 사이트 데이터 삭제 시 기록도 지워져요.</p><p class="subtle">주머니숲 · 플레이 프로토타입 0.1<br>캐릭터와 방: AI 생성 원화 · 이름 변경은 언제든 가능해요.</p>`,'settings');
    $('save-name').onclick=()=>{s.name=$('pet-name').value.trim().slice(0,12)||'모리';save();render();toast(s.name+'! 내 이름이 마음에 들어.');};
    $('demo-toggle').onclick=()=>{if(s.active){toast('진행 중인 활동이 끝난 뒤 바꿔 주세요.');return;}s.settings.demo=!s.settings.demo;save();settings();};
    $('sound-toggle').onclick=()=>{s.settings.sound=!s.settings.sound;save();settings();sound();};
  }
  function mini(){open('잠깐, 꼬옥 놀자','A LITTLE GAME TOGETHER','<iframe class="mini-frame" title="꼬옥 손잡기 미니게임" src="https://statflowgames.github.io/kkook/"></iframe><p class="subtle">성장에 꼭 필요한 놀이는 아니에요. 즐겁게 놀고 돌아오세요.</p>','mini');}
  $('pet').onclick=()=>{const gained=life.pet();if(gained){save();render();toast('함께한 마음 +5');}hearts();setPose('happy');say(['헤헤, 네 손은 따뜻해.','나도 네가 좋아. 이만큼!','오늘도 와 줬구나. 반가워!','조금만 더… 쓰다듬어 줄래?'][Math.floor(Math.random()*4)]);if(Date.now()-lastPetSound>700){sound([659,784]);lastPetSound=Date.now();}};
  $('interact').onclick=()=>{if(s.active||s.pending){say(s.pending?'먼저 선물을 열어 보자!':'조금만 기다려 줘. 곧 끝날 거야!');return;}setPose('sleep',12000);say('아무것도 안 해도 좋은 시간. 너랑 같이.',12000);};
  $('activities-nav').onclick=activities;$('day-action').onclick=activities;$('parcel').onclick=showGift;$('decorate-nav').onclick=decorate;$('diary-nav').onclick=diary;$('settings').onclick=settings;$('checkin').onclick=checkin;$('home-nav').onclick=()=>{close();idleSpeech();};
  function reconcile(){if(life.tick()){save();render();idleSpeech();sound();if(mode==='busy'&&sheet.open)showGift();}updateClock();}
  function timeOfDay(){const h=new Date().getHours();$('room').classList.toggle('night',h<6||h>=21);$('room').classList.toggle('evening',h>=17&&h<21);$('weather').textContent=h<6||h>=21?'☾ 조용한 밤':h<12?'☀ 햇살 가득 아침':h<17?'☀ 포근한 오후':'☼ 노을이 머무는 저녁';}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){reconcile();timeOfDay();idleSpeech();}});
  window.addEventListener('pagehide',save);
  if(life.tick())save();render();timeOfDay();idleSpeech();setInterval(reconcile,250);
  setInterval(()=>{if(document.hidden||sheet.open||s.active||s.pending||petPose)return;const occupied=s.slots.map((id,index)=>({id,index})).filter(x=>x.id);if(occupied.length){const chosen=occupied[Math.floor(Math.random()*occupied.length)];useGift(chosen.id,chosen.index);}else{setPose('sleep',7000);say('햇살 아래서 졸다가… 네 생각 했어.',7000);}},28000);
  Promise.all(['room','mori','gifts'].map(name=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src='assets/'+name+'.png';}))).then(results=>{$('loading').hidden=true;if(results.some(x=>!x))toast('그림을 불러오지 못했어요. 새로고침해 주세요.');});
})();
