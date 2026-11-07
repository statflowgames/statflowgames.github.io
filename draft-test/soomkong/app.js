(() => {
  'use strict';
  const KEY='statflow-soomkong-v1',SOUND_KEY='statflow:soomkong:sound';
  const methods={calm:{label:'안정 호흡',hint:'편안하게 4초 들이쉬고 6초 내쉬어요',phases:[['들이쉬어요',4,'숨콩이 빗물을 모으고 있어요','inhale'],['내쉬어요',6,'안개가 천천히 걷혀요','exhale']]},box:{label:'집중 호흡',hint:'4초씩 들숨·머묾·날숨·머묾을 반복해요',phases:[['들이쉬어요',4,'숨콩이 동그랗게 자라요','inhale'],['머물러요',4,'그대로 편안하게 기다려요','hold'],['내쉬어요',4,'창 위의 안개를 밀어내요','exhale'],['머물러요',4,'다음 숨을 조용히 기다려요','hold']]},sleep:{label:'잠들기 호흡',hint:'4초 들이쉬고 7초 머문 뒤 8초 내쉬어요',phases:[['들이쉬어요',4,'부드럽게 숨을 모아요','inhale'],['머물러요',7,'힘주지 않고 가만히 있어요','hold'],['내쉬어요',8,'길고 가볍게 비워요','exhale']]}};
  const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
  let state=load(),method='calm',minutes=1,timer=null,startedAt=0,elapsed=0,phaseIndex=0,phaseElapsed=0,paused=false,audio=null,sound=localStorage.getItem(SOUND_KEY)==='on';
  function load(){try{return {...{dates:[],total:0},...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {dates:[],total:0}}}
  function save(){localStorage.setItem(KEY,JSON.stringify(state));renderStats()}
  function dateKey(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
  function streak(){const unique=new Set(state.dates);let n=0,d=new Date();while(unique.has(dateKey(d))){n++;d.setDate(d.getDate()-1)}return n}
  function renderStats(){const today=dateKey();$('#todayCount').textContent=state.dates.filter(d=>d===today).length;$('#streakCount').textContent=streak();$('#totalCount').textContent=state.total||0}
  function select(group,button,attr){group.forEach(b=>{const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-checked',String(on))});return button.dataset[attr]}
  $$('.choice').forEach(b=>b.addEventListener('click',()=>{method=select($$('.choice'),b,'method');$('#methodHint').textContent=methods[method].hint;tickSound(360)}));
  $$('.pill').forEach(b=>b.addEventListener('click',()=>{minutes=Number(select($$('.pill'),b,'minutes'));tickSound(420)}));
  function initAudio(){if(!sound)return null;const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;audio ||= new Ctx();if(audio.state==='suspended')audio.resume();return audio}
  function tone(freq=300,duration=.12,volume=.025){const ctx=initAudio();if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(volume,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration)}
  function tickSound(f){tone(f,.08,.018)}
  function syncSoundButton(){const b=$('#soundButton');b.textContent=sound?'🔊':'🔇';b.setAttribute('aria-pressed',String(sound));b.setAttribute('aria-label',sound?'소리 끄기':'소리 켜기')}$('#soundButton').addEventListener('click',()=>{sound=!sound;localStorage.setItem(SOUND_KEY,sound?'on':'off');syncSoundButton();if(sound)tone(330,.18,.025)});syncSoundButton();
  function format(sec){const s=Math.max(0,Math.ceil(sec));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
  function start(){startedAt=performance.now();elapsed=0;phaseIndex=0;phaseElapsed=0;paused=false;$('#homeView').hidden=true;$('#sessionView').hidden=false;$('#sessionMethod').textContent=methods[method].label;$('#remainingTime').textContent=format(minutes*60);$('#pauseButton').textContent='Ⅱ';$('#pauseButton').setAttribute('aria-pressed','false');setPhase();clearInterval(timer);timer=setInterval(step,100);step()}
  function setPhase(){const p=methods[method].phases[phaseIndex];$('#phaseTitle').textContent=p[0];$('#phaseGuide').textContent=p[2];$('#phaseKicker').textContent=p[3]==='hold'?'고요하게':'천천히';const orb=$('#breathOrb');orb.className=`breath-orb ${p[3]}`;orb.style.transitionDuration=`${p[1]}s`;tone(p[3]==='inhale'?440:p[3]==='exhale'?280:360,.22,.018)}
  function step(){if(paused)return;const now=performance.now(),dt=Math.min(.25,(now-startedAt)/1000-elapsed);elapsed+=Math.max(0,dt);phaseElapsed+=Math.max(0,dt);const total=minutes*60,left=total-elapsed;$('#remainingTime').textContent=format(left);$('#progressBar').style.width=`${Math.min(100,elapsed/total*100)}%`;$('#fog').style.opacity=String(Math.max(.12,1-elapsed/total*.88));const p=methods[method].phases[phaseIndex];$('#phaseCount').textContent=Math.max(1,Math.ceil(p[1]-phaseElapsed));if(phaseElapsed>=p[1]){phaseElapsed-=p[1];phaseIndex=(phaseIndex+1)%methods[method].phases.length;setPhase()}if(left<=0)complete()}
  function stop(toHome=true){clearInterval(timer);timer=null;if(toHome){$('#sessionView').hidden=true;$('#homeView').hidden=false}}
  function complete(){stop(false);state.total=(state.total||0)+1;state.dates.push(dateKey());save();tone(520,.35,.035);$('#completeDialog').showModal()}
  $('#startButton').addEventListener('click',start);
  $('#pauseButton').addEventListener('click',e=>{paused=!paused;e.currentTarget.textContent=paused?'▶':'Ⅱ';e.currentTarget.setAttribute('aria-pressed',String(paused));e.currentTarget.setAttribute('aria-label',paused?'계속하기':'일시정지');if(!paused){startedAt=performance.now()-elapsed*1000}tickSound(paused?260:400)});
  $('#closeSession').addEventListener('click',()=>{if(confirm('호흡 세션을 종료할까요?'))stop(true)});
  $('#finishButton').addEventListener('click',()=>{$('#completeDialog').close();stop(true)});
  $('#resetButton').addEventListener('click',()=>$('#resetDialog').showModal());
  $('[data-close-reset]').addEventListener('click',()=>$('#resetDialog').close());
  $('#confirmReset').addEventListener('click',()=>{localStorage.removeItem(KEY);state={dates:[],total:0};renderStats();$('#resetDialog').close()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(timer&&!paused){paused=true;$('#pauseButton').textContent='▶';$('#pauseButton').setAttribute('aria-pressed','true');$('#pauseButton').setAttribute('aria-label','계속하기')}if(audio?.state==='running')audio.suspend()}});
  renderStats();
})();
