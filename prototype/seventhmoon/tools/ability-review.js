// 실제 Game/Hero를 쓰는 로컬 검토 화면. 버튼으로 선택한 능력을 실행한다.
class AbilityReview extends Game {
  constructor() { super(); this.sys.settings.key = 'abilityReview'; }
  init() { super.init({stage:'c1_s1',ch:1,node:'s1'}); }
  preload() {
    const key=Q.get('reviewHero')||'warrior';
    Save.data=newSave(key); Save.data.lv=30; Save.data.sp=0; Save.data.seen.tutorial=true;
    DB.skills[key].list.forEach((s,i)=>{Save.data.skills[i]=1;});
    Save.data.active=DB.skills[key].list.flatMap((s,i)=>s.kind==='액티브'?[i]:[]).slice(0,2);
    super.preload();
    Assets.queue(this,Assets.group(Assets.rigGroup(Q.get('enemy')||'ratkin_blade')));
  }
  makeWaves() { return []; }
  banner() {}
  create() {
    super.create(); this.god=true; this.hero.awk=100;
    document.getElementById('review-sound').onclick=async()=>{await SFX.resume();document.getElementById('review-sound').textContent='소리 준비 완료';};
    const hero=document.getElementById('review-hero'), skill=document.getElementById('review-skill');
    for(const [key,d]of Object.entries(DB.heroes)){const o=document.createElement('option');o.value=key;o.textContent=d.ko;hero.append(o);}
    hero.value=this.hero.key;
    hero.onchange=()=>{const query=new URLSearchParams(location.search);query.set('reviewHero',hero.value);location.search=query.toString();};
    DB.skills[this.hero.key].list.forEach((s,i)=>{if(s.kind==='액티브'){const o=document.createElement('option');o.value=i;o.textContent=s.name;skill.append(o);}});
    const foldReview=()=>{if(innerWidth<=900)setReviewPanel(false);};
    document.getElementById('review-cast').onclick=()=>{this.save.active[0]=+skill.value;this.cds[0]=0;this.healOnce={};this.useSkill(0);foldReview();};
    document.getElementById('review-awaken').onclick=()=>{this.hero.awk=100;this.hero.startAwaken();foldReview();};
    document.getElementById('review-target').onclick=()=>{
      for(let i=0;i<4;i++){const m=new Monster(this,'grunt',this.hero.x+180+i*60,560+i*25);m.invuln=0;this.monsters.push(m);}
    };
    document.getElementById('review-target').disabled=false;
    const enemy=document.getElementById('review-enemy');
    for(const [id,d]of Object.entries(MONDEF)){const o=document.createElement('option');o.value=id;o.textContent=d.ko;enemy.append(o);}
    enemy.value=Q.get('enemy')||'ratkin_blade';
    enemy.onchange=()=>{const query=new URLSearchParams(location.search);query.set('enemy',enemy.value);location.search=query.toString();};
    const spawnPreview=()=>{
      if(this.reviewEnemy&&!this.reviewEnemy.dead)this.reviewEnemy.destroy();
      this.monsters=this.monsters.filter(m=>m!==this.reviewEnemy);
      const m=this.reviewEnemy=new Monster(this,enemy.value,this.hero.x+400,600,{noElite:true});
      m.toIdle();m.cool=100000;this.monsters.push(m);return m;
    };
    document.getElementById('review-enemy-action').disabled=false;
    document.getElementById('review-enemy-action').onclick=()=>{
      const m=spawnPreview(),action=document.getElementById('review-action').value;
      foldReview();
      if(action==='auto'){m.cool=0;return;}
      if(action==='idle'){m.update=dt=>{m.st+=dt;};return;}
      if(action==='walk') {
        m.update=dt=>{
          m.st+=dt;m.state='move';
          const left=this.hero.x+200,right=this.hero.x+620;
          if(m.x<=left)m.face=1;if(m.x>=right)m.face=-1;
          m.vx=m.face*m.def.speed;m.vy=0;m.play('m_walk',100);m.physics(dt);
        };return;
      }
      if(action==='attack')return m.kind==='barkhaul'?m.startSmash():m.startWindup();
      if(action==='throw')return m.startThrow();
      if(action==='cast')return m.startCast(null);
      if(action==='rock')return m.startRock();
      if(action==='roots')return m.startRoots();
      if(['charge','hook','cannon','burrow','meteor','teleport','beam','orbs','breath'].includes(action))return m.startSpecial(action);
      if(action==='down'){m.state='down';m.st=0;m.downTime=1600;m.play('m_down',0);return;}
      m.takeHit(this.hero,{type:'knock',kb:200,stop:0},1);
    };
  }
  update(time,dt) {
    const speed=+(document.getElementById('review-speed').value||1);
    this.time.timeScale=speed;this.tweens.timeScale=speed;
    super.update(time,dt*speed); if(!this.hero)return;
    const ready=['idle','move','land'].includes(this.hero.state);
    document.getElementById('review-cast').disabled=!ready;
    document.getElementById('review-awaken').disabled=!ready;
    document.getElementById('review-status').textContent=this.hero.state+' · '+this.hero.anim+(this.reviewEnemy?' / '+(this.reviewEnemy.enemySignature?.label||this.reviewEnemy.def.ko)+' · '+this.reviewEnemy.state:'');
  }
}
game.scene.add('abilityReview',AbilityReview,false);
