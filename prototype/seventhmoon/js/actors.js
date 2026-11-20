// 주인공과 몬스터. 좌표: x(가로), y(바닥 깊이), z(공중 높이). 화면 y = y - z
const GRAV = 2300;
const FLOOR_TOP = 478, FLOOR_BOT = 690;

class Actor {
  constructor(scene, rigName, x, y, o = {}) {
    this.scene = scene;
    const def = RIGS[rigName]();
    if (o.sc) { def.scale *= o.sc; }
    this.rig = new Rig(scene, def);
    this.kind = rigName;
    this.x = x; this.y = y; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.face = 1;
    this.state = 'idle'; this.st = 0;
    this.anim = null; this.animT = 0; this.blendFrom = null; this.blendT = 0; this.blendDur = 0;
    this.lastPose = {};
    this.flashT = 0; this.invuln = 0; this.dead = false; this.hitSet = new Set();
    this.shadow = scene.add.image(x, y, 'shadow');
    const cm = this.rig.def.clips;
    this.baseStand = rigName === 'warrior' || o.hero ? P.stand : cm && cm.m_idle && CLIPS[cm.m_idle] ? CLIPS[cm.m_idle].at(0) : P.standMon;
    this.rig.measure(this.baseStand);
    this.shake = 0;
    this.emote = null;
  }
  get sc() { return this.rig.def.scale; }
  get motionPolish() { return this.key === 'warrior' && this.side === 'hero'; }
  get motionSync() { return this.motionPolish || (this.side === 'hero' && typeof HERO_MOTION_PROFILES !== 'undefined' && !!HERO_MOTION_PROFILES[this.key]); }
  get enemyMotion() { return this.side === 'mon' && !!this.enemyMotionReady; }
  get px() { return this.x - this.scene.cameras.main.scrollX; }
  play(name, blend = 70) {
    const cm = this.rig.def.clips;
    if (this.enemyMotion) name = enemyActionClip(this, name);
    else if (cm && cm[name]) name = cm[name];
    if (this.enemyMotion && this.state === 'air' && !this.wasEnemyAir) {
      this.airGroundOff = this.groundOff ?? this.rig.foot;
      // 부유하던 높이도 실제 낙하 높이로 넘긴다. 착지 때 hover가 갑자기 사라지지 않는다.
      this.z += this.groundHover || 0;
    }
    this.wasEnemyAir = this.enemyMotion && this.state === 'air';
    if (this.motionPolish) name = HARVAN_ACTION_CLIPS[name] || name;
    else if (this.motionSync) name = heroMotionAction(this, name);
    if (this.skillMotion && name !== this.skillMotion.clip) { this.skillMotion = null; this.skillCues = []; }
    if (this.motionPolish && !HARVAN_RELAXED_ANIMS.has(name)) this.shieldRecoveryT = undefined;
    else if (!this.motionPolish && this.motionSync && ![this.key + '_idle', this.key + '_walk', this.key + '_run', this.motionClip('brake')].includes(name)) this.shieldRecoveryT = undefined;
    const basicAttack = this.motionPolish && Object.values(HARVAN_ATTACK_CLIPS).includes(name);
    const leaveSwitch = this.motionPolish && name !== 'idle' && !basicAttack && this.baseStand === HARVAN_SWITCH_STAND;
    if (leaveSwitch) this.baseStand = HARVAN_STAND;
    if (this.anim === name) return;
    const oldClip = CLIPS[this.anim], nextClip = CLIPS[name];
    const gaitPhase = (this.motionSync || this.enemyMotion) && oldClip && oldClip.amp && nextClip && nextClip.amp
      ? (this.animT % oldClip.dur) / oldClip.dur : 0;
    this.blendFrom = this.lastPose; this.blendDur = blend; this.blendT = 0;
    if (leaveSwitch) {
      // IK로 발을 바꿔 세운 실제 다리 각도에서 다음 동작으로 보간한다.
      // 보정 전 원본 각도로 시작하면 첫 프레임에 다리가 원래 배치로 튄다.
      this.blendFrom = { ...this.lastPose, power: 0 };
      for (const name of LEGS) {
        const bone = this.rig.map[name], parent = this.rig.map[bone.abs ? 'root' : bone.p];
        this.blendFrom[name] = (bone.wr - parent.wr) / D2R - (bone.r || 0);
      }
    }
    this.anim = name; this.animT = gaitPhase * (nextClip ? nextClip.dur : 0);
    if (this.motionSync || this.enemyMotion) this.stepPh = undefined;
  }
  replay(name, blend = 50) { this.anim = null; this.play(name, blend); }
  animDone() { const c = CLIPS[this.anim]; return c && !c.loop && this.animT >= c.dur; }
  // 걷기·달리기 클립은 실제 이동 속도에 맞춰 재생 속도를 바꾼다 (발 미끄러짐 방지)
  animRate() {
    const c = CLIPS[this.anim];
    if (!c || !c.amp) return 1;
    const m = this.rig.map;
    const leg = ((m.shf ? m.shf.y : 90) + (m.ftf ? m.ftf.y : 90)) * this.sc;
    const stride = 2 * leg * Math.sin(c.amp * D2R);              // 반 주기 동안 발이 움직이는 거리
    const nominal = stride / (c.dur / 2000);
    const sp = Math.hypot(this.vx, this.vy * 1.3);
    return Phaser.Math.Clamp(sp / nominal, 0.35, 1.8);
  }
  spring(o, target, k, damp, f) {
    o.v += (target - o.x) * k * f;
    o.v *= Math.pow(damp, f);
    o.x += o.v * f;
  }
  // 외부에서 출렁임을 준다 (맞음, 착지 등)
  kick(head = 0, cape = 0, sq = 0) {
    const s = this.sec || (this.sec = { head: { x: 0, v: 0 }, cape: { x: 0, v: 0 }, sq: { x: 0, v: 0 } });
    s.head.v += head; s.cape.v += cape; s.sq.x += sq;
  }
  draw(dt, frozen) {
    if (!frozen) this.animT += dt * this.animRate();
    const clip = CLIPS[this.anim];
    if (clip && clip.amp && !frozen && this.z <= 0) {
      const ph = Math.floor((this.animT + clip.dur * 0.25) / (clip.dur / 2));
      if (this.stepPh !== undefined && ph !== this.stepPh && this.onStep) this.onStep();
      this.stepPh = ph;
    }
    let pose = clip ? (this.motionPolish ? clip.at(this.animT, this.baseStand) : clip.at(this.animT)) : this.baseStand;
    if (this.motionPolish) {
      if (this.shieldRecoveryT !== undefined && !frozen) this.shieldRecoveryT += dt;
      pose = harvanShieldPose(pose, this.anim, this.animT, this.shieldRecoveryT);
      if (this.shieldRecoveryT >= HARVAN_SHIELD_RECOVERY.hold + HARVAN_SHIELD_RECOVERY.lower) this.shieldRecoveryT = undefined;
    }
    else if (this.motionSync) {
      if (this.shieldRecoveryT !== undefined && !frozen) this.shieldRecoveryT += dt;
      pose = heroMotionPose(this, pose);
      if (this.shieldRecoveryT >= HARVAN_SHIELD_RECOVERY.hold + HARVAN_SHIELD_RECOVERY.lower) this.shieldRecoveryT = undefined;
    }
    if (this.blendFrom && this.blendT < this.blendDur) {
      if (!frozen) this.blendT += dt;
      const blendPose = this.motionPolish ? motionMix : this.motionSync || this.enemySignature ? heroMotionMix : mix;
      pose = blendPose(this.blendFrom, pose, Math.min(1, this.blendT / this.blendDur));
    }
    if (this.enemyMotion) pose = enemyPose(this, pose);
    this.lastPose = pose;
    // 2차 움직임: 망토는 이동·낙하 반대로 날리고, 머리와 몸은 스프링으로 출렁인다
    const sec = this.sec || (this.sec = { head: { x: 0, v: 0 }, cape: { x: 0, v: 0 }, sq: { x: 0, v: 0 } });
    const f = frozen ? 0 : dt / 16.67;
    if (f > 0) {
      const fwd = this.vx * this.face;
      const capeT = Phaser.Math.Clamp(fwd * 0.08, -15, 45) + Phaser.Math.Clamp(this.vz * 0.04, -35, 35);
      this.spring(sec.cape, capeT, 0.06, 0.86, f);
      this.spring(sec.head, 0, 0.18, 0.78, f);
      this.spring(sec.sq, 0, 0.22, 0.7, f);
    }
    const p2 = { ...pose, rx: 0, ry: 0 };
    if (this.motionSync || (this.enemyMotion && this.enemyHumanoid)) {
      // 기존 rx/ry는 작은 상체 이동. 기본 공격의 골반 이동·디딤발은 별도로 계산한다.
      p2.bodyX = Phaser.Math.Clamp((pose.rx || 0) - (this.turnT || 0) * 0.08, -14, 14);
      p2.bodyY = Phaser.Math.Clamp(pose.ry || 0, -8, 8);
      if (this.motionPolish) harvanTrackFeet(this, p2);
    }
    // 저절로 움직이는 부위 (날개·꼬리·공전하는 구슬)
    const procs = this.rig.def.procs;
    if (procs) {
      const restingEnemy = this.enemyMotion && (['down','dying'].includes(this.state) || this.dead);
      this.procT = (this.procT || 0) + (frozen || restingEnemy ? 0 : dt);
      for (const q of procs) {
        if (!this.rig.map[q.n]) continue;
        let v = (q.base || 0) + Math.sin(this.procT * (q.spd || 0.005) + (q.ph || 0) * D2R) * (q.amp || 0);
        if (q.spin) v += (this.procT * q.spin + (q.ph || 0)) % 360;
        p2[q.n] = (p2[q.n] || 0) + v * (this.enemyMotion && typeof enemyProceduralWeight==='function' ? enemyProceduralWeight(this,q.n) : 1);
      }
    }
    p2.cape = (p2.cape || 0) + sec.cape.x;
    p2.head = (p2.head || 0) + sec.head.x;
    this.rig.apply(p2);
    // 땅 붙이기: 자세마다 몸의 가장 낮은 점을 바닥(또는 공중 높이)에 맞춘다
    if (!frozen || this.groundOff === undefined) {
      const airborne = (this.motionSync && (this.state === 'jump' || this.state === 'jatk')) || (this.enemyMotion && this.state === 'air');
      const feet = (this.motionSync || (this.enemyMotion && this.enemyHumanoid)) && !['roll', 'air', 'down', 'getup', 'dead', 'dying'].includes(this.state);
      this.groundOff = airborne ? (this.airGroundOff ?? this.rig.foot) : this.rig.lowest(feet ? ['ftf', 'ftb'] : undefined);
    }
    const sq = Phaser.Math.Clamp((pose.sq || 0) + sec.sq.x, -0.18, 0.18);
    const sy = this.sc * (1 + sq), sxs = this.sc * (1 - sq * 0.6);
    const sx = this.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
    const physicalEnemy = this.enemyMotion && (['air','down','getup','dying'].includes(this.state) || this.dead);
    const hov = !physicalEnemy && this.rig.def.hover ? (this.rig.def.hover + Math.sin((this.procT || 0) * 0.004) * 8) * (this.state === 'down' || this.dead ? 0.2 : 1) : 0;
    this.groundHover = hov;
    this.rig.c.setPosition(this.x + sx, this.y - this.z - hov - this.groundOff * sy);
    this.rig.c.setScale(sxs * this.face, sy);
    this.rig.c.setDepth(1000 + this.y);
    // 손/무기 좌표를 현재 프레임으로 갱신한 뒤 발사한다. 히트스톱 중에는 큐도 정지.
    if (!frozen && this.state === 'skill') this.fireSkillCues();
    if (!frozen && this.state === 'awaken') this.fireAwakenCue();
    if (this.swingTrail) this.scene.updateSwingTrail(this, dt, frozen);
    const h = Math.max(0.35, 1 - this.z / 500);
    const prone = this.z <= 0 ? Phaser.Math.Clamp(pose.prone || 0, 0, 1) : 0;
    let shadowX = this.x, shadowSX = this.shadowW * h, shadowSY = shadowSX * 0.9;
    if (prone > 0) {
      const bounds = this.rig.bodyBounds();
      const center = this.rig.c.x + (bounds.left + bounds.right) * 0.5 * this.rig.c.scaleX;
      const width = (bounds.right - bounds.left) * Math.abs(this.rig.c.scaleX) * 0.92;
      shadowX = lerp(shadowX, center, prone);
      shadowSX = lerp(shadowSX, width / this.shadow.width, prone);
      shadowSY = lerp(shadowSY, 10 / this.shadow.height, prone);
    }
    const shadowAlpha = this.dead ? (this.enemyMotion ? lerp(.45,.34,prone) : prone * .34) * this.rig.c.alpha : lerp(0.55 * h, 0.34, prone);
    this.shadow.setPosition(shadowX, this.y + 2).setDepth(999 + this.y * 0.001)
      .setScale(shadowSX, shadowSY).setAlpha(shadowAlpha);
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.rig.setFlash(false); }
    if (this.emote) {
      const e = this.emote; e.t -= dt;
      const top = this.y - this.z - this.height - 30 + Math.sin(e.t / 90) * 3;
      e.img.setPosition(this.x, top).setDepth(4000);
      if (e.t <= 0) { e.img.destroy(); this.emote = null; }
    }
  }
  get height() { return this.rig.def.height * this.sc * 0.92; }
  get shadowW() { return this.rig.def.shadow || (this.kind === 'barkhaul' ? 2.2 : this.side === 'hero' ? 1.2 : 1.0); }
  flash(color = 0xffffff, ms = 70) { this.rig.setFlash(true, color); this.flashT = ms; }
  showEmote(key, ms = 1200) {
    if (this.emote) this.emote.img.destroy();
    const img = this.scene.add.image(this.x, this.y, 'emote/' + key).setScale(0.0);
    SFX.emote(this.px);
    this.scene.tweens.add({ targets: img, scale: 0.42, duration: 220, ease: 'Back.out' });
    this.emote = { img, t: ms };
  }
  physics(dt) {
    const s = dt / 1000;
    this.x += this.vx * s; this.y += this.vy * s;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= GRAV * s * (this.gravMul || 1);
      this.z += this.vz * s;
      if (this.z <= 0) { this.z = 0; const v = this.vz; this.vz = 0; this.onLand(v); }
    }
    this.y = Phaser.Math.Clamp(this.y, FLOOR_TOP, FLOOR_BOT);
    const cam = this.scene.bounds;
    this.x = Phaser.Math.Clamp(this.x, cam.l + 30, cam.r - 30);
  }
  onLand() {}
  destroy() { this.rig.destroy(); this.shadow.destroy(); if (this.emote) this.emote.img.destroy(); if (this.swingTrail) this.swingTrail.g.destroy(); }
}

// ---------------------------------------------------------------------------
// 하르반 (방패전사)
// ---------------------------------------------------------------------------
const HERO_ATK = {
  a1: { clip: 'w_atk1', dur: 320, hit: [105, 190], dmg: 14, reach: [10, 175], dz: 34, kb: 120, type: 'light', stop: 55, next: 160, swing: 'h', lunge: 230 },
  a2: { clip: 'w_atk2', dur: 320, hit: [105, 190], dmg: 14, reach: [10, 175], dz: 34, kb: 120, type: 'light', stop: 55, next: 160, swing: 'u', lunge: 210 },
  a3: { clip: 'w_atk3', dur: 340, hit: [115, 200], dmg: 16, reach: [10, 150], dz: 34, kb: 200, type: 'light', stop: 75, next: 180, swing: 's', stun: 520, lunge: 320 },
  a4: { clip: 'w_atk4', dur: 490, hit: [215, 290], dmg: 30, reach: [10, 200], dz: 40, kb: 420, type: 'knock', stop: 110, shake: 6, swing: 'v', fin: true, lunge: 380 },
  dash: { clip: 'w_dash', dur: 420, hit: [40, 380], dmg: 22, reach: [0, 120], dz: 36, kb: 460, type: 'knock', stop: 80, shake: 4, multi: true },
  up: { clip: 'w_up', dur: 400, hit: [130, 220], dmg: 18, reach: [0, 140], dz: 36, kb: 60, type: 'launch', stop: 80, swing: 's', lunge: 150 },
  down: { clip: 'w_slam', dur: 540, hit: [225, 300], dmg: 26, reach: [-40, 190], dz: 44, kb: 160, type: 'slam', stop: 110, shake: 8, otg: true, lunge: 200 },
  jump: { clip: 'w_jumpatk', dur: 400, hit: [130, 250], dmg: 20, reach: [0, 165], dz: 38, kb: 280, type: 'knock', stop: 80, swing: 'v', zr: 200 },
};

class Hero extends Actor {
  constructor(scene, x, y) {
    const key = (scene.save && scene.save.hero) || 'warrior';
    super(scene, key, x, y, { hero: true });
    this.key = key;
    this.cls = classOf(key);
    this.atkSet = this.cls.atk;
    if (key === 'warrior') {
      harvanGripRig(this.rig);
      this.atkSet = { ...this.atkSet };
      for (const k in HARVAN_ATTACK_CLIPS) this.atkSet[k] = { ...this.atkSet[k], clip: HARVAN_ATTACK_CLIPS[k] };
    }
    this.baseStand = key === 'warrior' ? HARVAN_STAND : STANCE[key] || P.stand; this.rig.measure(this.baseStand);
    if (key !== 'warrior' && typeof configureHeroMotion === 'function') configureHeroMotion(this);
    this.mv = HERO_MOVE[key] || HERO_MOVE.warrior; this.idleT = 0; this.habitT = 4000 + Math.random() * 3000;
    this.st8 = scene.stats || { hp: 360, parryWin: 0, staRegen: 0, spd: 0 };
    this.maxHp = this.st8.hp; this.hp = this.maxHp;
    this.sta = 100; this.awk = 0;
    this.combo = 0; this.buffer = 0; this.holdDir = 0; this.holdT = 0;
    this.guardStart = -9999; this.blink = 2500;
    this.play('idle');
    this.side = 'hero';
    // 새 그림(1차 4등신 느낌)으로 리그 교체. setHead도 새 표정 시트로 바뀐다.
    if (typeof CuteHeroes !== 'undefined') CuteHeroes.apply(this);
  }
  setHead(img) { this.rig.setImg('head', img); }
  motionClip(phase) { return this.motionPolish ? 'harvan_' + phase : heroMotionClip(this, phase); }
  get rollCost() { return 22 * (1 - (this.st8.rollCost || 0) / 100); }
  update(dt, inp) {
    const s = dt / 1000;
    this.st += dt;
    if (this.motionSync) this.turnT = Math.max(0, (this.turnT || 0) - dt);
    if (this.invuln > 0) this.invuln -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.state !== 'guard') this.sta = Math.min(100, this.sta + 38 * (1 + this.st8.staRegen / 100) * s);
    if (this.buffer > 0) this.buffer -= dt;
    if (inp.atkP) this.buffer = 260;
    // 방향 유지 시간 (달리기 판정)
    const dir = inp.x;
    if (dir !== 0 && dir === this.holdDir) this.holdT += dt; else { this.holdDir = dir; this.holdT = 0; }
    // 눈 깜빡임
    this.blink -= dt;
    if (this.blink < 0 && ['idle', 'move'].includes(this.state)) { this.setHead('head_blink'); if (this.blink < -120) { this.setHead(null); this.blink = 2500 + Math.random() * 2500; } }

    const st = this.state;
    if (st === 'dead') { this.physics(dt); return; }
    if (st === 'idle' || st === 'move' || st === 'land') {
      if (this.scene.won && !this.scene.looting) { this.vx = this.vy = 0; return; }   // 승리 후 줍는 시간에는 움직일 수 있다
      if (inp.awkP && this.awk >= 100) return this.startAwaken();
      if ((inp.sk1P || inp.sk2P) && this.scene.useSkill(inp.sk1P ? 0 : 1)) return;
      if (inp.itemN) this.scene.useItem(inp.itemN - 1);
      if (inp.jumpP) return this.startJump(inp);
      if (inp.rollP && this.sta >= this.rollCost) return this.startRoll(inp);
      if (inp.guard) return this.startGuard();
      if (this.buffer > 0) { this.buffer = 0; return this.startAttack(this.pickCommand(inp)); }
      // 착지/급정지 연출은 입력을 잠그지 않는다. 공격·점프·가드·구르기 우선.
      if (st === 'land' && this.st < 140 && !inp.x && !inp.y) {
        this.vx = motionApproach(this.vx, 0, 4200 * s);
        this.vy = motionApproach(this.vy, 0, 3000 * s);
        this.physics(dt); return;
      }
      const run = this.holdT > 320 && inp.x !== 0;
      const sp = (run ? this.mv[1] : this.mv[0]) * (1 + (this.st8.spd || 0) / 100);
      if (this.motionSync) {
        if (inp.x && inp.x !== this.face) { this.vx *= 0.25; this.turnT = 100; }
        this.vx = motionApproach(this.vx, inp.x * sp, (inp.x ? 3600 : 4200) * s);
        this.vy = motionApproach(this.vy, inp.y * 150, 3000 * s);
      } else { this.vx = inp.x * sp; this.vy = inp.y * 150; }
      if (inp.x) this.face = inp.x;
      if (inp.x || inp.y) {
        this.state = 'move'; this.play(run ? 'run' : 'walk', 120);
        this.running = run;
      } else if (this.motionSync && (Math.hypot(this.vx, this.vy) > 1 || (this.anim === this.motionClip('brake') && !this.animDone()))) {
        this.state = 'move'; this.running = false; this.play(this.motionClip('brake'), 40);
      } else {
        this.running = false;
        // 가만히 있으면 가끔 직업별 버릇
        if (this.state !== 'idle') { this.idleT = 0; this.habit = null; }
        this.state = 'idle'; this.idleT += dt;
        if (this.habit) { if (this.animDone()) { this.habit = null; this.play('idle', 200); } }
        else if (this.idleT > this.habitT && !this.scene.won && this.scene.monsters.every(m => m.dead || Math.abs(m.x - this.x) > 500)) {
          const hs = HABITS[this.key]; this.habit = hs[Math.floor(Math.random() * hs.length)]; this.replay(this.habit, 200);
          this.idleT = 0; this.habitT = 5000 + Math.random() * 4000;
        } else this.play('idle', 150);
      }
      this.physics(dt);
      return;
    }
    if (st === 'skill') { this.updateSkill(dt, inp); return; }
    if (st === 'atk') {
      const a = this.atk;
      this.vx *= Math.pow(0.0008, s); this.vy = 0;
      if (this.atkName === 'dash' && !a.special) this.vx = this.face * (this.st < 330 ? 560 : 120);
      this.checkHits(a, dt);
      // 사격은 투사체를 낸 뒤 최소 한 프레임의 놓는 동작을 보여 주고 다음 타로 연결한다.
      const nextAt = this.motionSync && a.proj ? Math.max(a.next || 0, a.hit[0] + 20) : a.next;
      if (a.next && this.st >= nextAt && this.buffer > 0 && this.chain) {
        this.buffer = 0;
        return this.startAttack(this.chain);
      }
      if (this.st >= a.dur) {
        if (this.motionPolish && this.atkName === 'a4') {
          this.baseStand = this.baseStand === HARVAN_SWITCH_STAND ? HARVAN_STAND : HARVAN_SWITCH_STAND;
          this.vx = 0;
        }
        if (this.motionPolish && HARVAN_PLANTED_ATTACKS.has(this.atkName)) this.vx = 0;
        this.combo = 0; this.toIdle();
      }
      this.physics(dt);
      return;
    }
    if (st === 'jump' || st === 'jatk') {
      this.vx = this.motionSync ? (inp.x ? motionApproach(this.vx, inp.x * 220, 1800 * s) : this.vx * Math.pow(0.98, dt / 16.67)) : inp.x * 220 || this.vx * 0.98;
      if (inp.x && st === 'jump') this.face = inp.x;
      this.vy = inp.y * 90;
      if (st === 'jump' && inp.atkP && !this.jumpAtkUsed) { this.jumpAtkUsed = true; this.state = 'jatk'; this.st = 0; this.atk = this.atkSet.jump; this.atkName = 'jump'; this.fired = false; this.swingFired = false; this.voicePower = null; this.hitSet.clear(); this.replay(this.atk.clip, 40); this.setHead('head_shout'); }
      if (inp.jumpP && this.st8.doubleJump && !this.dj && this.z > 20) {
        this.dj = true; this.vz = 820;
        if (this.motionSync) { this.state = 'jump'; this.st = 0; this.voicePower = null; this.setHead(null); }
        this.replay(this.motionSync ? this.motionClip('rise') : 'w_jump', 40); SFX.jump(this.px);
      }
      if (this.state === 'jatk') this.checkHits(this.atk, dt);
      this.physics(dt);
      if (this.motionSync) {
        if (this.state === 'jatk' && this.st >= this.atk.dur) { this.state = 'jump'; this.setHead(null); }
        if (this.state === 'jump') this.play(this.motionClip(this.vz > 180 ? 'rise' : this.vz < -180 ? 'fall' : 'apex'), 65);
      }
      return;
    }
    if (st === 'roll') {
      const activeDt = this.motionSync ? Math.max(0, Math.min(dt, 380 - (this.st - dt))) : dt;
      if (this.motionSync) this.vx = activeDt > 0
        ? this.face * (harvanRollTravel(this.st) - harvanRollTravel(this.st - dt)) * 1000 / activeDt : 0;
      this.physics(activeDt);
      if (this.st > 380) { this.vx = 0; this.vy = 0; this.toIdle(); }
      return;
    }
    if (st === 'guard') {
      this.vx = 0; this.vy = 0;
      if (!inp.guard || this.sta <= 0) return this.toIdle();
      if (inp.x) this.face = inp.x;
      if (inp.rollP && this.sta >= this.rollCost) return this.startRoll(inp);
      this.physics(dt);
      return;
    }
    if (st === 'parry') {
      this.checkHits(this.atk, dt);
      if (this.st > 320) this.toIdle();
      return;
    }
    if (st === 'hurt') { this.vx *= Math.pow(0.002, s); this.physics(dt); if (this.st > 300) this.toIdle(); return; }
    if (st === 'air') { this.physics(dt); return; }
    if (st === 'down') { if (this.st > 650) { this.state = 'getup'; this.st = 0; this.play('w_getup', 60); this.setHead(null); } return; }
    if (st === 'getup') { if (this.st > 420) { this.invuln = 600 + (this.st8.getupInv || 0) * 1000; this.toIdle(); } return; }
    if (st === 'awaken') { this.updateAwaken(dt); return; }
    if (st === 'win') { return; }
  }
  onStep() {
    SFX.step(this.key==='mage'?'robe':['rogue','ranger'].includes(this.key)?'leather':'armor', this.px);
    if (this.running) this.scene.fx('dust_run', this.x - this.face * 30, this.y, { s: 0.25, flip: this.face < 0, dur: 350, depth: this.y - 1 });
  }
  pickCommand(inp) {
    if (inp.y < 0) return 'up';
    if (inp.y > 0 && inp.x === 0) return 'down';
    // ✏️ 달리며 공격(돌진·순간이동·공중제비)은 0.6초 넘게 달렸을 때만. 걷다 누른 공격이 실수로 나가지 않게 (달리기 시작은 0.32초 그대로)
    if (this.holdT > 600 && inp.x === this.face) return 'dash';
    return 'a1';
  }
  startAttack(k) {
    const a = this.atkSet[k];
    this.state = 'atk'; this.st = 0; this.atk = a; this.atkName = k; this.hitSet.clear(); this.fired = false;
    this.swingFired = false; this.voicePower = null;
    this.chain = { a1: 'a2', a2: 'a3', a3: 'a4' }[k] || null;
    this.replay(a.clip, 40);
    const power = { a3: 1, up: 1, dash: 1, a4: 2, down: 2 }[k] || 0;
    if (power || Math.random() < 0.35) {
      if (this.motionSync) this.voicePower = power;
      else this.scene.time.delayedCall(Math.max(0, a.hit[0] - 60), () => this.state === 'atk' && SFX.heroAtk(power, this.px, this.key));
    }
    this.vx = k === 'dash' && !a.special ? this.face * 560 : 0;
    this.setHead(a.fin || k === 'down' || k === 'dash' ? 'head_shout' : 'head_attack');
    if (!this.motionSync) this.scene.time.delayedCall(a.hit[0] - 30, () => {
      if (this.state !== 'atk' || this.atk !== a) return;
      if (a.lunge) this.vx = this.face * a.lunge;
      if (!a.proj && !(a.special && !a.dmg)) { SFX.swing(a.fin || k === 'down', this.px, a.swing === 's' ? 'shield' : 'blade'); this.scene.swingFx(this, a); }
    });
    if (k === 'dash' && !a.special) { SFX.roll(this.px); this.scene.fx('speed_lines', this.x - this.face * 80, this.y - 110, { s: 0.45, flip: this.face < 0, dur: 300, depth: this.y - 1 }); }
  }
  checkHits(a, dt = 0) {
    if (this.motionSync) {
      if (this.voicePower !== null && this.voicePower !== undefined && this.st >= a.hit[0] - 60) {
        SFX.heroAtk(this.voicePower, this.px, this.key); this.voicePower = null;
      }
      if (!this.swingFired && this.st >= a.hit[0] - 30) {
        this.swingFired = true;
        // 1~3타는 발끝을 축으로 힘을 전달한다. 자동 전진을 줄여 보폭이 끌려가지 않게 한다.
        if (a.lunge) this.vx = this.face * a.lunge * (this.motionPolish && HARVAN_PLANTED_ATTACKS.has(this.atkName) ? 0.06 : 1);
        if (!a.proj && !(a.special && !a.dmg)) {
          SFX.swing(a.fin || this.atkName === 'down', this.px, a.swing === 's' ? 'shield' : 'blade');
          this.scene.swingFx(this, a);
        }
      }
    }
    const inWindow = this.st >= a.hit[0] && this.st <= a.hit[1];
    // 짧은 발사 구간을 한 프레임이 통과해도 사격/주문은 한 번 발생한다.
    const crossed = this.motionSync && this.st >= a.hit[0] && this.st - dt < a.hit[0];
    if (!inWindow && !crossed) return;
    // 투사체·특수 동작은 맞는 순간에 한 번만 낸다
    if ((a.proj || a.special) && !this.fired) {
      this.fired = true;
      if (a.proj) this.scene.heroShoot(this, a.proj);
      if (a.special) this.scene.heroSpecial(this, a);
    }
    if (inWindow && a.dmg) this.scene.meleeHit(this, a);
  }
  toIdle() {
    if (this.motionSync && (this.motionPolish || this.key === 'paladin') && this.state === 'atk' && this.atk && this.st >= this.atk.dur) this.shieldRecoveryT = 0;
    if ((this.motionPolish || this.key === 'paladin') && this.state === 'skill' && this.skillMotion && this.st >= this.skillMotion.freeAt) this.shieldRecoveryT = 0;
    this.state = 'idle'; this.st = 0; this.play('idle', 120); this.setHead(null); this.gravMul = 1;
  }
  startJump(inp) {
    if (this.motionSync) this.airGroundOff = this.groundOff ?? this.rig.foot;
    this.state = 'jump'; this.st = 0; this.vz = this.mv ? this.mv[2] : 860; this.z = 0.01; this.jumpAtkUsed = false; this.dj = false;
    this.play(this.motionSync ? this.motionClip('rise') : 'w_jump', 45); SFX.jump(this.px); this.kick(0, 0, this.motionSync ? 0.035 : 0.12);
    this.scene.fx('dust_land', this.x, this.y, { s: 0.22, dur: 300, depth: this.y - 1 });
  }
  startRoll(inp) {
    this.sta -= this.rollCost;
    const d = inp.x || this.face; this.face = d;
    this.state = 'roll'; this.st = 0; this.vx = d * 560; this.vy = inp.y * 120; this.invuln = 380;
    this.replay(this.motionSync ? this.motionClip('roll') : 'w_roll', 30); SFX.roll(this.px);
    this.scene.fx('dash_trail', this.x - d * 40, this.y - 60, { s: 0.35, flip: d < 0, dur: 320, depth: this.y - 1 });
    if (typeof GearFx !== 'undefined' && this.scene.gfx) GearFx.onRoll(this.scene, this);
  }
  startGuard() { this.state = 'guard'; this.st = 0; this.guardStart = this.scene.now; this.play('w_guard', 40); }
  onLand(v) {
    if (this.state === 'jump' || this.state === 'jatk') {
      SFX.land(this.px); this.scene.fx('dust_land', this.x, this.y, { s: 0.3, dur: 380, depth: this.y - 1 });
      this.kick(4, 0, this.motionSync ? -0.025 : -0.14);
      if (this.motionSync) {
        this.state = 'land'; this.st = 0; this.vx *= 0.35; this.vy *= 0.35;
        this.gravMul = 1; this.setHead(null); this.play(this.motionClip('land'), 25);
      } else this.toIdle();
    } else if (this.state === 'air') {
      SFX.land(this.px, true); this.scene.fx('dust_land', this.x, this.y, { s: 0.38, dur: 420, depth: this.y - 1 });
      this.scene.cameras.main.shake(90, 0.004);
      this.kick(6, 0, -0.12);
      this.state = this.hp <= 0 ? 'dead' : 'down'; this.st = 0; this.play('w_down', 60); this.vx = 0; this.vy = 0;
      if (this.hp <= 0) this.scene.heroDied();
    }
  }
  // 적의 공격을 받았을 때. 반환: 'hit' | 'guard' | 'parry' | 'miss'
  takeHit(src, dmg, type, kbDir) {
    if (this.invuln > 0 || this.state === 'roll' || this.state === 'awaken' || this.state === 'dead' || this.state === 'down' || this.state === 'getup' || this.scene.won) return 'miss';
    const fromFront = Math.sign(src.x - this.x) === this.face || src.x === this.x;
    if ((this.state === 'guard' || this.state === 'parry') && fromFront) {
      if (this.scene.now - this.guardStart < 170 * (1 + (this.st8.parryWin || 0) / 100) && this.state === 'guard') {
        this.state = 'parry'; this.st = 0; this.replay('w_parry', 30);
        this.atk = { hit: [40, 160], dmg: 24, reach: [0, 170], dz: 40, kb: 300, type: 'knock', stop: 90, shake: 3 };
        this.hitSet.clear(); this.awk = Math.min(100, this.awk + 12);
        return 'parry';
      }
      this.sta -= (type === 'heavy' ? 40 : 14) * (1 - (this.st8.guardCost || 0) / 100);
      this.x -= this.face * (type === 'heavy' ? 40 : 14);
      this.awk = Math.min(100, this.awk + 2);
      if (this.sta <= 0) { this.sta = 0; this.state = 'hurt'; this.st = -300; this.play('w_hurt', 40); this.showEmote('dizzy', 900); }
      return 'guard';
    }
    if (this.scene.god) dmg = 0;
    this.hp = Math.max(0, this.hp - dmg);
    this.awk = Math.min(100, this.awk + 6);
    this.face = kbDir === 0 ? this.face : -kbDir;
    this.flash(0xffffff, 80);
    this.kick(-7, 6, -0.08);
    if (this.hp <= 0) SFX.heroKO(this.px, this.key); else SFX.heroHurt(this.px, this.key);
    this.setHead('head_hurt');
    if (type === 'heavy' || this.hp <= 0) {
      this.state = 'air'; this.st = 0; this.vz = 520; this.z = 1; this.vx = kbDir * 260; this.vy = 0;
      this.play('w_air', 40);
      this.setHead('head_ko');
    } else {
      this.state = 'hurt'; this.st = 0; this.vx = kbDir * 160; this.replay('w_hurt', 30);
    }
    return 'hit';
  }
  startSkill(name, fx) {
    const motion = heroSkillMotion(this.key, name, fx, this.baseStand);
    this.state = 'skill'; this.st = 0; this.vx = this.vy = 0;
    this.skillMotion = motion; this.skillCues = []; this.atk = null; this.atkName = 'skill:' + name;
    this.combo = 0; this.buffer = 0; this.hitSet.clear(); this.voicePower = null;
    this.replay(motion.clip, 45); this.setHead('head_attack');
    return motion;
  }
  queueSkillCue(at, fn) { this.skillCues.push({ at, fn }); this.skillCues.sort((a,b) => a.at-b.at); }
  fireSkillCues() {
    const motion = this.skillMotion;
    while (this.state === 'skill' && this.skillMotion === motion && this.skillCues?.length && this.skillCues[0].at <= this.st) {
      const cue = this.skillCues.shift(); cue.fn();
    }
  }
  updateSkill(dt, inp) {
    const motion = this.skillMotion;
    if (!motion) return this.toIdle();
    // 준비/방출은 끝까지 보이고, 회수 구간에서는 다음 행동을 즉시 받는다.
    if (this.st >= motion.freeAt && (inp.x || inp.y || inp.atkP || this.buffer > 0 || inp.jumpP || inp.rollP || inp.guard || inp.sk1P || inp.sk2P || inp.awkP)) {
      this.toIdle(); return this.update(0, inp);
    }
    this.vx *= Math.pow(.0008, dt/1000); this.vy = 0; this.physics(dt);
    if (this.st >= motion.duration) this.toIdle();
  }
  startAwaken() {
    this.awk = 0; this.state = 'awaken'; this.st = 0; this.vx = this.vy = 0; this.invuln = 1200;
    this.awakenEnd = 1000;
    this.awakenSequence = (this.awakenSequence || 0) + 1;
    this.replay(typeof heroAwakenClip === 'function' ? heroAwakenClip(this.key, this.baseStand) : 'w_awaken', 40); this.setHead('head_shout');
    this.scene.awakenCutIn(this);
    if (this.scene.save) { Codex.init(this.scene.save); this.scene.save.stats.awaken = (this.scene.save.stats.awaken || 0) + 1; }
    SFX.awaken(this.key, this.px);
    this.awkFired = false;
  }
  updateAwaken(dt) {
    if (this.st > (this.awakenEnd || 1000)) this.toIdle();
  }
  fireAwakenCue() {
    if (this.st >= 440 && !this.awkFired) { this.awkFired = true; this.scene.awakenFire(this); }
  }
}

// ---------------------------------------------------------------------------
// 몬스터
// ---------------------------------------------------------------------------
// 몬스터 수치는 js/data/campaign.js 의 MONDEF
// 보스마다 쓰는 기술: far = [기술, 확률], near = 가까울 때
const BOSS_MOVES = {
  barkhaul: { far: [['rock', 0.45], ['roots', 0.3]], near: 'smash' },
  toothcrusher: { far: [['charge', 0.55], ['rock', 0.2]], near: 'smash' },
  captain_mog: { far: [['hook', 0.35], ['cannon', 0.35], ['charge', 0.1]], near: 'smash' },
  gloob: { far: [['rock', 0.4], ['roots', 0.35]], near: 'smash' },
  twinsting: { far: [['burrow', 0.45], ['roots', 0.25]], near: 'smash' },
  sehera: { far: [['beam', 0.35], ['orbs', 0.3], ['meteor', 0.2]], near: 'smash' },
  frost_wyvern: { far: [['breath', 0.45], ['meteor', 0.3]], near: 'smash' },
  hrimgar: { far: [['meteor', 0.4], ['rock', 0.3]], near: 'smash' },
  golem7: { far: [['beam', 0.45], ['charge', 0.2], ['orbs', 0.15]], near: 'smash' },
  orvex: { far: [['orbs', 0.35], ['meteor', 0.3], ['teleport', 0.2]], near: 'teleport' },
  orvex_eclipse: { far: [['orbs', 0.3], ['teleport', 0.3], ['breath', 0.2]], near: 'smash' },
  azmal: { far: [['breath', 0.4], ['meteor', 0.3], ['charge', 0.15]], near: 'smash' },
  void_shadow: { far: [['teleport', 0.3], ['orbs', 0.25], ['charge', 0.2], ['beam', 0.2]], near: 'smash' },
};
// 원거리 몬스터가 던지는 것
const MON_PROJ = {
  spear: { img: 'spear/javelin', rot: 90, sc: 0.32 },
  ratkin_xbow: { img: 'fx/arrow_trail', rot: 0, sc: 0.28, vx: 900 },
  skeleton_archer: { img: 'fx/arrow_trail', rot: 0, sc: 0.28, vx: 900 },
  dwarf_miner: { img: 'dwarf_miner/barrel', rot: 0, sc: 0.5, vx: 520, spin: true },
  construct: { img: 'orb', rot: 0, sc: 0.8, vx: 600 },
  harpy: { img: 'harpy/wing_feather', rot: 90, sc: 0.35, vx: 760 },
};

class Monster extends Actor {
  constructor(scene, id, x, y, o = {}) {
    const base = MONDEF[id] || MONDEF.grunt;
    const real = !!RIGS[id] && id !== base.rig;
    super(scene, real ? id : base.rig, x, y, real ? {} : { sc: base.sc });
    this.kind = base.rig;   // AI 종류 (barkhaul = 보스 AI)
    const k = scene.monScale || { hp: 1, dmg: 1 };
    this.id = id;
    this.def = { ...base, dmg: Math.round(base.dmg * k.dmg) };
    this.dmgK = this.def.dmg / MONDEF[base.rig].dmg;
    if (scene.speedMul && scene.speedMul !== 1) this.def.speed = base.speed * scene.speedMul;
    if (scene.tower && base.boss) { this.def.ko = '강화 ' + base.ko; }
    this.maxHp = Math.round(base.hp * (base.boss ? Math.sqrt(k.hp) : k.hp)); this.hp = this.maxHp;
    // 🆕 일반 몬스터 강화 (장별 MOB_TUNE): 체력·공격력
    if (!base.boss && typeof MOB_TUNE !== 'undefined' && !scene.tower && !(typeof Q !== 'undefined' && Q.has('oldmob'))) {
      const t = MOB_TUNE[Math.max(1, Math.min(6, Math.round(scene.ch || 1)))];
      this.maxHp = this.hp = Math.round(this.maxHp * t.hp);
      this.def.dmg = Math.round(this.def.dmg * t.dmg); this.dmgK = this.def.dmg / MONDEF[base.rig].dmg;
    }
    // 정예: 접두사 하나, 체력 1.8배, 조금 크다. ✏️ 보통 난이도에서도 2장부터 가끔 나온다 (전에는 체력 배율이 아래에서 덮어써져 적용되지 않았음)
    const ec = scene.diff >= 3 ? 0.25 : scene.diff >= 2 ? 0.14 : (typeof MOB_TUNE !== 'undefined' && !scene.tower ? (MOB_TUNE[Math.max(1, Math.min(6, Math.round(scene.ch || 1)))].elite || 0) : 0);
    if (!o.noElite && !base.boss && ec && Math.random() < ec) {
      const keys = Object.keys(ELITES);
      this.elite = keys[Math.floor(Math.random() * keys.length)];
      this.maxHp = this.hp = Math.round(this.maxHp * 1.8);
      this.rig.def.scale *= 1.12;
      this.eliteTag = scene.add.text(x, y, ELITES[this.elite].ko, { fontFamily: 'sans-serif', fontSize: 16, color: ELITES[this.elite].col, stroke: '#000', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5, 1);
      this.eliteGlow = scene.add.ellipse(x, y, 120, 36, Phaser.Display.Color.HexStringToColor(ELITES[this.elite].col).color, 0.35).setBlendMode(Phaser.BlendModes.ADD);
    }
    // 🆕 보스 강화 (앞쪽 장일수록 더): 체력·공격력·공격 간격·그로기 내성. 주소에 ?oldboss 면 끈다
    if (base.boss && typeof BOSS_TUNE !== 'undefined' && !(typeof Q !== 'undefined' && Q.has('oldboss'))) {
      const t = BOSS_TUNE[Math.max(1, Math.min(6, Math.round(scene.ch || 1)))] || BOSS_TUNE[6];
      this.maxHp = this.hp = Math.round(this.maxHp * t.hp);
      this.def.dmg = Math.round(this.def.dmg * t.dmg); this.dmgK = this.def.dmg / MONDEF[base.rig].dmg;
      this.bossTune = t;
    }
    if (base.boss && typeof BossGimmicks !== 'undefined') BossGimmicks.attach(this);
    if (real && MAN['faces/' + id + '_hurt']) this.def.face = 'faces/' + id;
    else if (real) this.def.face = null;
    if (base.tint && !real) { for (const b of this.rig.bones) b.baseTint = mulTint(b.baseTint, base.tint); this.rig.setTintAll(null); }
    const kind = base.rig;
    this.side = 'mon';
    if (typeof configureEnemyMotion === 'function') configureEnemyMotion(this);
    this.cool = 600 + Math.random() * 900;
    this.think = 0;
    this.slotOff = (Math.random() - 0.5) * 60;
    this.poise = 100;
    this.play('m_idle');
    this.state = 'enter'; this.st = 0;
    this.face = x > scene.hero.x ? -1 : 1;
    if (kind === 'barkhaul') { this.summon60 = false; this.summon30 = false; }
    this.pitch = kind === 'shaman' ? 0.85 : kind === 'spear' ? 1.08 : 0.95 + Math.random() * 0.15;
  }
  draw(dt, frozen) {
    super.draw(dt, frozen);
    if(!frozen&&this.pendingEnemyProjectiles?.length) {
      for(const shot of this.pendingEnemyProjectiles.splice(0))this.emitEnemyProjectile(shot.img,shot.opts,shot.vy,shot.tint,true);
    }
    if(!frozen&&this.pendingEnemyBeam) {
      this.pendingEnemyBeam=false;
      const muzzle=enemyProjectileMuzzle(this),end=this.x+this.face*1200;
      for(let d=100;d<=1200;d+=110)this.scene.fx('lightning_bolt',lerp(muzzle.x,end,(d-100)/1100),muzzle.y,{s:.4,dur:350,depth:this.y+1002,rot:90});
    }
    if (!frozen && this.enemyMotion && this.state === 'throw' && this.st >= 90 && !this.throwFired) {
      this.throwFired = true; SFX.throwS(this.px); SFX.gob('atk', this.px, this.pitch, this.id);
      const pj = MON_PROJ[this.id] || MON_PROJ.spear;
      this.scene.projectile(this, this.scene.textures.exists(pj.img) ? pj.img : 'spear/javelin', { vx:this.face*(pj.vx||720), z:this.height*.55, dmg:this.def.dmg, rot:pj.rot??90, sc:pj.sc||.32, life:1500, spin:pj.spin, muzzle:enemyProjectileMuzzle(this) });
      if (!this.enemyLauncher) this.rig.setVisible('wpn', false);
    }
    if (!frozen && this.pendingRock) { const target=this.pendingRock; this.pendingRock=null; this.scene.lobRock(this,target); }
    if (this.eliteTag) {
      const hide = this.dead;
      this.eliteTag.setPosition(this.x, this.y - this.z - this.height - 12).setDepth(4000).setVisible(!hide);
      this.eliteGlow.setPosition(this.x, this.y + 2).setDepth(999 + this.y * 0.001).setVisible(!hide).setAlpha(0.25 + Math.sin((this.procT || this.st) * 0.008) * 0.1);
    }
  }
  emitEnemyProjectile(img,opts,vy=0,tint=null,drawn=false) {
    if(this.enemyMotion&&!drawn){(this.pendingEnemyProjectiles||(this.pendingEnemyProjectiles=[])).push({img,opts,vy,tint});return;}
    this.scene.projectile(this,img,{...opts,...(this.enemyMotion?{muzzle:enemyProjectileMuzzle(this)}:{})});
    const p=this.scene.projs[this.scene.projs.length-1];
    if(p){p.vy=vy;if(tint!==null)p.img.setTint(tint);}
  }
  destroy() { super.destroy(); if (this.eliteTag) { this.eliteTag.destroy(); this.eliteGlow.destroy(); } }
  setHead(img) { this.rig.setImg('head', img); }
  hurtFace() { if (this.def.face) this.setHead(this.def.face + '_hurt'); else this.setHead('head_shout'); }
  update(dt) {
    const s = dt / 1000, h = this.scene.targetOf ? this.scene.targetOf(this) : this.scene.hero;
    this.st += dt; this.cool -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.shake > 0) this.shake -= dt;
    const st = this.state;
    const dx = h.x - this.x, dy = h.y - this.y, adx = Math.abs(dx);
    if (st === 'dying') { this.physics(dt); return; }
    if (st === 'air') { this.physics(dt); return; }
    // 안전장치: 체력이 0인데 다른 상태(빙결 등)로 바뀌었거나, 공중에 뜬 채 다른 상태가 된 몬스터는
    // 다시 떨어뜨려 쓰러지게 한다 (안 그러면 떠 있거나 죽지 않은 채 남는다). 보스는 bossHit가 따로 처리.
    if (this.kind !== 'barkhaul' && !this.def.boss && st !== 'down' && st !== 'getup' && st !== 'enter' &&
        (this.hp <= 0 || (this.z > 0 && st !== 'hurt'))) {
      this.state = 'air'; this.st = 0; this.z = Math.max(this.z, 1); this.freezeT = 0;
      if (this.hp <= 0) this.vz = Math.max(this.vz, 200);
      this.play('m_air', 30); this.physics(dt); return;
    }
    if (st === 'down') {
      if (this.st > (this.downTime || 800)) {
        if (this.hp <= 0) return this.die();
        this.state = 'getup'; this.st = 0; this.play('m_getup', 60); this.setHead(null);
      }
      return;
    }
    if (st === 'getup') { if (this.st >= (CLIPS[this.anim]?.dur || 420)) { this.invuln = 300; this.toIdle(); } return; }
    if (st === 'hurt') { this.vx *= Math.pow(0.003, s); this.physics(dt); if (this.st > (this.stun || 280)) this.toIdle(); return; }
    if (st === 'enter') {
      // 화면 밖에서 걸어 들어온다
      const tx = Phaser.Math.Clamp(this.x, this.scene.bounds.l + 80, this.scene.bounds.r - 80);
      this.face = Math.sign(tx - this.x) || this.face;
      this.vx = Math.sign(tx - this.x) * this.def.speed * 1.4; this.vy = 0;
      this.play('m_run');
      this.x += this.vx * s;
      if (Math.abs(tx - this.x) < 10) {
        this.toIdle(); this.face = Math.sign(dx) || 1;
        if (Math.random() < 0.5 || this.kind === 'barkhaul') { this.showEmote('bang', 900); if (this.kind !== 'barkhaul') SFX.gob('alert', this.px, this.pitch, this.id); }
      }
      return;
    }
    if (this.kind === 'barkhaul') return this.bossAI(dt, dx, dy, adx);
    if (st === 'idle' || st === 'move') {
      if (h.state === 'dead') { this.vx = this.vy = 0; this.play('m_taunt'); this.setHead(this.def.face + '_taunt'); return; }
      this.face = Math.sign(dx) || this.face;
      let tx, ty = h.y + this.slotOff * 0.3;
      const role = this.def.role;
      if (role === 'melee') {
        const hasTok = this.scene.tokens.has(this);
        if (!hasTok && this.cool <= 0 && this.scene.tokens.size < (this.scene.boss ? 1 : (this.scene.ch >= 3 ? 3 : 2))) this.scene.tokens.add(this);
        const want = this.scene.tokens.has(this) ? 95 : 230 + this.slotOff;
        tx = h.x - Math.sign(dx || 1) * want;
        if (this.scene.tokens.has(this) && adx < 135 && Math.abs(dy) < 20) return this.startWindup();
        if (!this.scene.tokens.has(this) && Math.random() < 0.002) return this.startTaunt();
      } else if (role === 'ranged') {
        tx = h.x - Math.sign(dx || 1) * (420 + this.slotOff);
        ty = h.y;
        if (this.cool <= 0 && Math.abs(dy) < 16 && adx > 250 && adx < 700) return this.startThrow();
      } else {
        tx = h.x - Math.sign(dx || 1) * (500 + this.slotOff);
        if (this.cool <= 0) {
          const hurt = this.scene.monsters.find(m => m !== this && !m.dead && m.hp < m.maxHp * 0.6 && m.kind !== 'barkhaul');
          return this.startCast(hurt && Math.random() < 0.6 ? hurt : null);
        }
      }
      tx = Phaser.Math.Clamp(tx, this.scene.bounds.l + 40, this.scene.bounds.r - 40);
      const mx = tx - this.x, my = ty - this.y;
      const sp = this.def.speed;
      this.vx = Math.abs(mx) > 12 ? Math.sign(mx) * sp : 0;
      this.vy = Math.abs(my) > 6 ? Math.sign(my) * sp * 0.6 : 0;
      // 겁먹고 도망
      if (this.hp < this.maxHp * 0.25 && !this.fled && Math.random() < 0.01) { this.fled = true; this.showEmote('sweat', 1500); SFX.gob('scared', this.px, this.pitch, this.id); this.state = 'flee'; this.st = 0; return; }
      if (this.vx || this.vy) { this.state = 'move'; this.play('m_walk', 100); } else { this.state = 'idle'; this.play('m_idle', 140); }
      this.separate();
      this.physics(dt);
      return;
    }
    if (st === 'flee') {
      this.face = -Math.sign(dx) || 1; this.vx = this.face * this.def.speed * 1.3; this.vy = 0;
      this.play('m_run'); this.physics(dt);
      if (this.st > 1300) this.toIdle();
      return;
    }
    if (st === 'taunt') { if (this.st > 900) { this.setHead(null); this.toIdle(); } return; }
    if (st === 'windup') {
      if (this.st > 420) {
        this.state = 'stab'; this.st = 0; this.replay('m_stab', 30); this.hitSet.clear(); SFX.swing(false, this.px, 'blade'); this.setHead('head_shout');
        this.stabLunged = false;
      }
      return;
    }
    if (st === 'stab') {
      if (!this.stabLunged && this.st >= 30) { this.stabLunged=true; this.vx=this.face*240; }
      this.vx *= Math.pow(0.001, s); this.physics(dt);
      if (this.st > 50 && this.st < 160) this.scene.enemyMelee(this, { dmg: this.def.dmg, reach: [0, 130], dz: 22, type: 'light' });
      if (this.st > 520) { this.setHead(null); this.releaseTok(); this.cool = 1100 + Math.random() * 1400; this.toIdle(); }
      return;
    }
    if (st === 'throwup') {
      if (this.st > 520) {
        this.state = 'throw'; this.st = 0; this.throwFired=false; this.replay('m_throw', 30); this.setHead('head_shout');
        if (!this.enemyMotion) {
          SFX.throwS(this.px); SFX.gob('atk', this.px, this.pitch, this.id);
          const pj = MON_PROJ[this.id] || MON_PROJ.spear;
          this.scene.projectile(this, this.scene.textures.exists(pj.img) ? pj.img : 'spear/javelin', { vx: this.face * (pj.vx || 720), z: this.height * 0.55, dmg: this.def.dmg, rot: pj.rot ?? 90, sc: pj.sc || 0.32, life: 1500, spin: pj.spin });
          this.rig.setVisible('wpn', false);
        }
      }
      return;
    }
    if (st === 'throw') {
      if (this.st > 600) { this.rig.setVisible('wpn', true); this.setHead(null); this.cool = 2200 + Math.random() * 1500; this.toIdle(); }
      return;
    }
    if (st === 'cast') {
      if (this.st > 750 && !this.castDone) {
        this.castDone = true; SFX.magic(this.px);
        if (this.castTarget && !this.castTarget.dead) {
          const t = this.castTarget; t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.35);
          this.scene.fx('crit_flash', t.x, t.y - t.height * 0.5, { s: 0.25, dur: 500, tint: 0x88ff88, depth: 4000 });
          t.showEmote('sparkle', 900); this.scene.floatText(t.x, t.y - t.height, '+' + Math.round(t.maxHp * 0.35), '#8f8');
        } else {
          this.emitEnemyProjectile('orb', { vx: this.face * 330, z: 90, dmg: this.def.dmg, home: true, life: 2600 });
        }
      }
      if (this.st > 1100) { this.cool = 3000 + Math.random() * 1500; this.toIdle(); }
      return;
    }
  }
  onStep() {
    if (this.kind === 'barkhaul') { SFX.step('giant', this.px); this.scene.cameras.main.shake(80, 0.002); }
    else SFX.step('light', this.px);
  }
  separate() {
    for (const o of this.scene.monsters) {
      if (o === this || o.dead) continue;
      const ddx = this.x - o.x, ddy = this.y - o.y;
      if (Math.abs(ddx) < 60 && Math.abs(ddy) < 20) { this.x += (ddx >= 0 ? 1 : -1) * 1.5; this.y += (ddy >= 0 ? 1 : -1) * 0.8; }
    }
  }
  releaseTok() { this.scene.tokens.delete(this); }
  toIdle() { this.state = 'idle'; this.st = 0; this.play('m_idle', 120); this.setHead(null); this.rig.setTintAll(null); }
  startWindup() {
    this.state = 'windup'; this.st = 0; this.vx = this.vy = 0; this.play('m_windup', 60);
    this.rig.setTintAll(0xff9a8a);
    if (Math.random() < 0.7) SFX.gob('atk', this.px, this.pitch, this.id);
    this.scene.time.delayedCall(260, () => { if (this.state === 'windup') this.rig.setTintAll(null); });
  }
  startTaunt() { this.state = 'taunt'; this.st = 0; this.vx = this.vy = 0; this.play('m_taunt', 80); this.setHead(this.def.face + '_taunt'); this.showEmote('laugh', 900); SFX.gob('laugh', this.px, this.pitch, this.id); }
  startThrow() { this.state = 'throwup'; this.st = 0; this.vx = this.vy = 0; this.play('m_throwup', 80); this.rig.setTintAll(0xff9a8a); this.scene.time.delayedCall(260, () => this.state === 'throwup' && this.rig.setTintAll(null)); }
  startCast(t) { this.state = 'cast'; this.st = 0; this.vx = this.vy = 0; this.castTarget = t; this.castDone = false; this.play('m_cast', 80); SFX.gob('chant', this.px, this.pitch, this.id); this.setHead('head_shout'); this.scene.fx('crit_flash', this.x + this.face * 30, this.y - this.height * 0.95, { s: 0.18, dur: 700, tint: t ? 0x88ff88 : 0xcc66ff, depth: this.y + 1001 }); }

  // 플레이어 공격을 맞음
  takeHit(src, a, dmg) {
    if (this.dead || this.invuln > 0 || this.state === 'enter' || this.state === 'getup') return false;
    const isDown = this.state === 'down';
    if (isDown && !a.otg) return false;
    if (this.state === 'dying') return false;
    if (this.gimmick) dmg = BossGimmicks.damage(this, src, a, dmg);
    this.hp -= dmg;
    this.flash(0xffffff, 70);
    this.kick(-8, 0, -0.1);
    this.shake = a.stop || 60;
    this.releaseTok();
    this.rig.setTintAll(null);
    this.rig.setVisible('wpn', true);
    const dir = Math.sign(this.x - src.x) || src.face;
    this.face = -dir;
    const boss = this.kind === 'barkhaul';
    if (boss) return this.bossHit(a, dir, dmg);
    this.hurtFace();
    if (this.hp>0) SFX.gob('hurt', this.px, this.pitch, this.id);
    if (isDown) { this.vz = 260; this.z = 1; this.state = 'air'; this.st = 0; this.play('m_air', 30); return true; }
    if (this.state === 'air' || this.z > 0) {
      // 이미 체력이 0인 적은 공중에서 더 띄우지 않고 바로 떨어뜨린다 (계속 맞으면 영영 안 내려온다)
      if (this.hp <= 0) { if (this.state !== 'air') { this.state = 'air'; this.st = 0; this.play('m_air', 30); } this.vz = Math.min(this.vz, 120); this.gravMul = 1.3; return true; }
      this.vz = Math.max(this.vz, a.type === 'launch' ? 700 : 380); this.vx = dir * 70; this.gravMul = 0.8;
      if (a.type === 'knock' || a.type === 'slam') { this.vx = dir * a.kb; this.vz = 300; }
      return true;
    }
    if (this.hp <= 0 || a.type === 'knock' || a.type === 'slam') {
      this.state = 'air'; this.st = 0; this.vz = a.type === 'slam' ? 380 : 440; this.z = 1; this.vx = dir * (a.kb || 300); this.vy = 0;
      this.play('m_air', 30);
      return true;
    }
    if (a.type === 'launch') {
      this.state = 'air'; this.st = 0; this.vz = 900; this.z = 1; this.vx = dir * 40; this.gravMul = 0.85;
      this.play('m_air', 30); return true;
    }
    this.state = 'hurt'; this.st = 0; this.stun = a.stun || 300; this.vx = dir * (a.kb || 120); this.vy = 0;
    this.replay('m_flinch', 20);
    if (a.stun) this.showEmote('dizzy', a.stun);
    return true;
  }
  onLand(v) {
    if (this.state !== 'air') return;
    if (v < -500 && !this.bounced) {
      this.bounced = true; this.vz = 260; this.z = 1; this.vx *= 0.4; this.kick(8, 0, -0.15);
      this.scene.fx('dust_land', this.x, this.y, { s: 0.3, dur: 380, depth: this.y - 1 }); SFX.land(this.px); return;
    }
    this.bounced = false; this.gravMul = 1;
    this.kick(6, 0, -0.12);
    this.state = 'down'; this.st = 0; this.vx = 0; this.vy = 0; this.downTime = 750;
    this.play('m_down', 40);
    this.scene.fx('dust_land', this.x, this.y, { s: 0.3, dur: 380, depth: this.y - 1 }); SFX.land(this.px, this.kind === 'barkhaul');
    if (this.hp <= 0) this.downTime = 350;
  }
  die() {
    if (this.gimmick) BossGimmicks.cleanup(this);
    if (this.dead) return;
    this.dead = true; this.state = 'dying'; this.releaseTok();
    if(!this.deathAudioPlayed)SFX.gob('die', this.px, this.pitch, this.id);
    this.scene.fx('death_dissolve', this.x, this.y - this.height * 0.3, { s: this.kind === 'barkhaul' ? 0.8 : 0.32, dur: 900, depth: this.y + 1001, grow: 1.3 });
    const targets = this.enemyMotion || (this.rig.def.clips && this.rig.def.clips.m_down === 'gob_down') ? [this.rig.c, this.shadow] : this.rig.c;
    this.scene.tweens.add({ targets, alpha: 0, duration: 450, onComplete: () => this.destroy() });
    this.scene.onMonsterDead(this);
  }
  // ---------------- 바크하울 ----------------
  bossAI(dt, dx, dy, adx) {
    const s = dt / 1000, h = this.scene.hero, st = this.state;
    if (this.bossTune) {
      // 공격 사이 쉬는 시간이 짧아진다
      if (this.cool > 0 && (st === 'idle' || st === 'move')) this.cool -= dt * (1 / this.bossTune.cool - 1);
      // 1.5초 동안 안 맞으면 그로기 게이지가 차오른다
      this.poiseHitT = (this.poiseHitT || 0) + dt;
      if (this.poiseHitT > 1500 && st !== 'stagger') this.poise = Math.min(100, this.poise + 25 * s);
    }
    const rage = this.hp < this.maxHp * 0.5;
    if (this.gimmick && BossGimmicks.update(this, dt, rage)) return;
    if (rage && !this.raged) { this.raged = true; this.startRoar(true); return; }
    if (!this.summon60 && this.hp < this.maxHp * 0.65) { this.summon60 = true; return this.startRoar(false, 2); }
    if (!this.summon30 && this.hp < this.maxHp * 0.3) { this.summon30 = true; return this.startRoar(false, 3); }
    // 🆕 몸에 붙어서 계속 때리면 발구르기 충격파로 밀어낸다 (보스 강화 켜졌을 때)
    if (this.bossTune) {
      const hug = adx < 200 && Math.abs(dy) < 70 && h.state !== 'dead';
      this.hugT = hug ? (this.hugT || 0) + dt : Math.max(0, (this.hugT || 0) - dt * 2);
      this.stompCd = Math.max(0, (this.stompCd || 0) - dt);
      if (this.hugT > (rage ? 1100 : 1700) && this.stompCd <= 0 && ['idle', 'move', 'windup'].includes(st)) { this.hugT = 0; this.stompCd = rage ? 4500 : 6000; return this.startStomp(rage); }
    }
    if (st === 'stomp') {
      if (this.st > this.stompAt && !this.hitDone) {
        this.hitDone = true; SFX.smash(this.px);
        this.scene.cameras.main.shake(300, 0.014);
        this.scene.fx('impact_ring', this.x, this.y, { s: 0.85, dur: 520, depth: this.y - 1, flat: true });
        this.scene.fx('dust_land', this.x, this.y, { s: 0.8, dur: 520, depth: this.y + 1 });
        this.scene.areaHit(this, this.x, this.y, 260, 70, Math.round(this.def.dmg * 0.8), 'heavy');
      }
      if (this.st > this.stompAt + 520) { this.rig.setTintAll(null); this.cool = rage ? 300 : 600; this.toIdle(); }
      return;
    }
    if (st === 'idle' || st === 'move') {
      this.face = Math.sign(dx) || this.face;
      if (this.cool <= 0) {
        const mv = BOSS_MOVES[this.id] || BOSS_MOVES.barkhaul;
        if (adx < 260 && Math.abs(dy) < 60 && Math.random() < 0.5) return mv.near === 'smash' ? this.startSmash() : this.startSpecial(mv.near);
        let r = Math.random(), pick = null;
        for (const [m, w] of mv.far) { r -= w; if (r < 0) { pick = m; break; } }
        if (pick === 'rock') return this.startRock();
        if (pick === 'roots') return this.startRoots();
        if (pick) return this.startSpecial(pick);
        this.cool = 400;
      }
      const tx = h.x - Math.sign(dx || 1) * 190, ty = h.y;
      const mx = tx - this.x, my = ty - this.y;
      const sp = this.def.speed * (rage ? 1.35 : 1);
      this.vx = Math.abs(mx) > 20 ? Math.sign(mx) * sp : 0;
      this.vy = Math.abs(my) > 10 ? Math.sign(my) * sp * 0.6 : 0;
      if (this.vx || this.vy) { this.state = 'move'; this.play('m_walk', 140); } else { this.state = 'idle'; this.play('m_idle', 160); }
      this.physics(dt);
      return;
    }
    if (st === 'smashup') {
      if (this.st > (rage ? 650 : 900)) {
        this.state = 'smash'; this.st = 0; this.replay('b_smash', 30); this.hitDone = false;
      }
      return;
    }
    if (st === 'smash') {
      if (this.st > 110 && !this.hitDone) {
        this.hitDone = true; SFX.smash(this.px);
        this.scene.cameras.main.shake(260, 0.012);
        const px = this.x + this.face * 210;
        this.scene.fx('impact_ring', px, this.y, { s: 0.55, dur: 450, depth: this.y - 1, flat: true });
        this.scene.fx('dust_land', px, this.y, { s: 0.6, dur: 500, depth: this.y + 1 });
        this.scene.areaHit(this, px, this.y, 150, 50, this.def.dmg, 'heavy');
        this.scene.spawnDebrisAt(px, this.y, 4, 'rock');
      }
      if (this.st > 1100) { this.cool = rage ? 900 : 1600; this.toIdle(); }
      return;
    }
    if (st === 'rock') {
      if (this.st >= 500 && !this.rockPoseReleased) { this.rockPoseReleased=true; this.replay('m_throw',40); }
      if (this.st > 650 && !this.hitDone) {
        this.hitDone = true; SFX.throwS(this.px); SFX.bossGrunt(this.px, this.id);
        if (this.enemyMotion) this.pendingRock=this.rockTarget;
        else this.scene.lobRock(this, this.rockTarget);
      }
      if (this.st > 1100) { this.cool = rage ? 800 : 1400; this.toIdle(); }
      return;
    }
    if (st === 'roots') {
      if (this.st > 1300) { this.cool = rage ? 900 : 1500; this.toIdle(); }
      return;
    }
    if (st === 'roar') {
      if (this.st > 1300) { this.toIdle(); this.cool = 600; }
      return;
    }
    if (st === 'stagger') {
      if (this.st > (this.bossTune ? this.bossTune.stagger : 2400)) { this.poise = 100; this.setHead(null); this.toIdle(); this.cool = this.bossTune ? 0 : 300; }
      return;
    }
    if (st === 'sp') return this.updateSpecial(dt);
    this.toIdle();
  }
  // ---------------- 보스 고유 기술 ----------------
  startSpecial(type) {
    const sc = this.scene, h = sc.hero;
    this.state = 'sp'; this.st = 0; this.vx = this.vy = 0; this.sp = { type, step: 0, n: 0 };
    const sp = this.sp, rage = this.raged;
    this.castPulseAt=undefined;
    this.setHead('head_shout');
    if (type === 'charge') {
      // 가로로 돌진: 선을 그어 예고한 뒤 화면 끝까지
      sp.dir = Math.sign(h.x - this.x) || this.face; this.face = sp.dir; sp.y = h.y;
      sc.telegraphLine(this.x, this.y, this.x + sp.dir * 1100, rage ? 600 : 850, 60);
      this.play('m_windup', 80); SFX.bossGrunt(this.px, this.id);
    } else if (type === 'breath') {
      this.face = Math.sign(h.x - this.x) || this.face;
      sc.telegraphLine(this.x + this.face * 80, this.y, this.x + this.face * 620, rage ? 650 : 900, 50);
      this.play('b_smashup', 80); SFX.roar(this.px, this.id);
    } else if (type === 'beam') {
      this.face = Math.sign(h.x - this.x) || this.face;
      sc.telegraphLine(this.x + this.face * 60, this.y, this.x + this.face * 1200, rage ? 700 : 1000, 40);
      this.play('m_cast', 80); SFX.telegraph(this.px);
    } else if (type === 'orbs') {
      this.face = Math.sign(h.x - this.x) || this.face;
      this.play('m_cast', 80); SFX.gob('chant', this.px, 0.6, this.id);
      sc.fx('holy_ring', this.x, this.y - this.height * 0.6, { s: 0.5, dur: 600, depth: this.y + 1002, tint: (BOSS_ROCK[this.id] || {}).tint || 0xc080ff });
    } else if (type === 'meteor') {
      this.play('b_roar', 80); SFX.roar(this.px, this.id);
      sp.pts = [];
      const n = rage ? 6 : 4;
      for (let i = 0; i < n; i++) sp.pts.push({ x: h.x + (i === 0 ? 0 : (Math.random() - 0.5) * 520), y: Phaser.Math.Clamp(h.y + (Math.random() - 0.5) * 180, FLOOR_TOP, FLOOR_BOT), t: 900 + i * 160 });
      sp.pts.forEach(p => sc.telegraph(p.x, p.y, 0.7, p.t));
    } else if (type === 'teleport') {
      this.play('m_cast', 60);
      sc.fx('shadow_smoke', this.x, this.y - this.height * 0.5, { s: 0.7, dur: 500, depth: this.y + 1002 });
    } else if (type === 'burrow') {
      this.play('m_down', 80); SFX.step('giant', this.px);
      sc.fx('dust_land', this.x, this.y, { s: 0.7, dur: 600, depth: this.y + 2 });
    } else if (type === 'hook') {
      this.face = Math.sign(h.x - this.x) || this.face;
      sc.telegraphLine(this.x + this.face * 60, this.y, this.x + this.face * 700, 700, 40);
      this.play('m_throwup', 80); SFX.bossGrunt(this.px, this.id);
    } else if (type === 'cannon') {
      this.play('m_throwup', 80); sp.n = 0;
    }
  }
  updateSpecial(dt) {
    const sc = this.scene, h = sc.hero, sp = this.sp, s = dt / 1000, rage = this.raged;
    const end = (cool) => { this.cool = rage ? cool * 0.6 : cool; this.rig.c.setAlpha(1); this.invuln = 0; this.toIdle(); if (this.gimmick) BossGimmicks.afterSpecial(this, sp.type); };
    const t = sp.type;
    if (t === 'charge') {
      const wind = rage ? 600 : 850;
      if (this.st < wind) return;
      if (sp.step === 0) { sp.step = 1; this.play('m_run', 40); SFX.roll(this.px); this.hitSet.clear(); }
      this.vx = sp.dir * (this.def.speed * 6 + 300); this.vy = 0;
      this.x += this.vx * s;
      if (!this.hitSet.has(h) && Math.abs(h.x - this.x) < 90 && Math.abs(h.y - this.y) < 50 && h.z < 100) { this.hitSet.add(h); sc.resolveHeroHit(this, Math.round(this.def.dmg * 0.9), 'heavy', this.x, this.y); }
      if (sc.ally && !this.hitSet.has(sc.ally) && Math.abs(sc.ally.x - this.x) < 90 && Math.abs(sc.ally.y - this.y) < 50) { this.hitSet.add(sc.ally); sc.ally.takeHit(this, this.def.dmg, 'heavy', sp.dir); }
      if (Math.random() < 0.3) sc.fx('dust_run', this.x - sp.dir * 60, this.y, { s: 0.35, dur: 300, depth: this.y - 1 });
      const b = sc.bounds;
      if (this.x < b.l + 60 || this.x > b.r - 60 || this.st > wind + 1600) { this.x = Phaser.Math.Clamp(this.x, b.l + 60, b.r - 60); sc.cameras.main.shake(200, 0.01); SFX.smash(this.px); end(1400); }
      return;
    }
    if (t === 'breath') {
      const wind = rage ? 650 : 900;
      if (this.st < wind) return;
      if (sp.step === 0) { sp.step = 1; this.replay('b_smash', 40); sp.k = 0; }
      sp.k -= dt;
      if (sp.k <= 0 && this.st < wind + 1000) {
        sp.k = 180; sp.n++;
        const fxk = { frost_wyvern: 'ice_shards', azmal: 'void_crack', orvex_eclipse: 'void_crack' }[this.id] || 'fire_burst';
        for (let d = 120; d <= 620; d += 125) sc.fx(fxk, this.x + this.face * d, this.y - 50, { s: 0.35 + d / 2400, dur: 300, depth: this.y + 1002 });
        const mid = this.x + this.face * 370;
        sc.areaHit(this, mid, this.y, 260, 50, Math.round(this.def.dmg * 0.25), 'light');
      }
      if (this.st > wind + 1300) end(1600);
      return;
    }
    if (t === 'beam') {
      const wind = rage ? 700 : 1000;
      if (this.st >= wind && sp.step === 0) {
        sp.step = 1; SFX.ui('fire_explode', this.px); sc.cameras.main.flash(120, 200, 200, 255); sc.cameras.main.shake(200, 0.01);
        this.castPulseAt=this.st;
        if(this.enemyMotion)this.pendingEnemyBeam=true;
        else for (let d = 100; d <= 1200; d += 110) sc.fx('lightning_bolt', this.x + this.face * d, this.y - 60, { s: 0.4, dur: 350, depth: this.y + 1002, rot: 90 });
        sc.areaHit(this, this.x + this.face * 650, this.y, 560, 40, Math.round(this.def.dmg * 0.8), 'heavy');
      }
      if (this.st > wind + 700) end(1700);
      return;
    }
    if (t === 'orbs') {
      if (this.st > 500 && sp.n < (rage ? 3 : 2) && this.st > 500 + sp.n * 450) {
        sp.n++;
        this.castPulseAt=this.st;
        const tint = (BOSS_ROCK[this.id] || {}).tint || 0xc080ff;
        for (let i = -2; i <= 2; i++) {
          this.emitEnemyProjectile('orb', { vx: this.face * 420, z: this.height * 0.55, dmg: Math.round(this.def.dmg * 0.35), life: 2600 },i*70,tint);
        }
      }
      if (this.st > 1700) end(1500);
      return;
    }
    if (t === 'meteor') {
      for (const p of sp.pts) if (!p.done && this.st >= p.t) {
        p.done = true;
        this.castPulseAt=this.st;
        const fxk = { hrimgar: 'ice_pillar', frost_wyvern: 'ice_pillar', orvex: 'holy_pillar', sehera: 'dust_land' }[this.id] || 'fire_burst';
        sc.fx(fxk, p.x, p.y - 70, { s: 0.5, dur: 500, depth: p.y + 1002 });
        sc.fx('impact_ring', p.x, p.y, { s: 0.4, dur: 400, depth: p.y - 1, flat: true });
        sc.areaHit(this, p.x, p.y, 90, 36, Math.round(this.def.dmg * 0.6), 'heavy');
        SFX.smash(p.x - sc.cameras.main.scrollX); sc.cameras.main.shake(120, 0.006);
      }
      if (sp.pts.every(p => p.done) && this.st > 1800) end(1500);
      return;
    }
    if (t === 'teleport') {
      if (this.st > 350 && sp.step === 0) {
        sp.step = 1;
        const side = h.x > (sc.bounds.l + sc.bounds.r) / 2 ? -1 : 1;
        this.x = Phaser.Math.Clamp(h.x + side * 200, sc.bounds.l + 80, sc.bounds.r - 80); this.y = h.y;
        this.face = Math.sign(h.x - this.x) || 1;
        sc.fx('shadow_smoke', this.x, this.y - this.height * 0.5, { s: 0.7, dur: 500, depth: this.y + 1002 });
        SFX.roll(this.px);
      }
      if (this.st > 600) { this.startSmash(); }
      return;
    }
    if (t === 'burrow') {
      if (this.st > 400 && sp.step === 0) { sp.step = 1; this.rig.c.setAlpha(0.15); this.invuln = 1400; sp.tx = h.x; sp.ty = h.y; sc.telegraph(sp.tx, sp.ty, 1.0, 900); }
      if (sp.step === 1) { sp.tx += (h.x - sp.tx) * 0.02; }
      if (this.st > 1300 && sp.step === 1) {
        sp.step = 2; this.x = sp.tx; this.y = sp.ty; this.rig.c.setAlpha(1); this.invuln = 0;
        this.replay('b_smash', 30); sc.fx('dust_land', this.x, this.y, { s: 0.8, dur: 600, depth: this.y + 2 }); sc.spawnDebrisAt(this.x, this.y, 5, 'rock');
        sc.areaHit(this, this.x, this.y, 140, 50, this.def.dmg, 'heavy'); sc.cameras.main.shake(260, 0.012); SFX.smash(this.px);
      }
      if (this.st > 2200) end(1400);
      return;
    }
    if (t === 'hook') {
      if (this.st > 700 && sp.step === 0) {
        sp.step = 1; this.replay('m_throw', 30); SFX.throwS(this.px);
        const rel = (h.x - this.x) * this.face;
        if (rel > 0 && rel < 720 && Math.abs(h.y - this.y) < 50 && h.state !== 'roll') {
          sc.floatText(h.x, h.y - 230, '끌려간다!', '#ffb080', 26);
          sc.tweens.add({ targets: h, x: this.x + this.face * 130, duration: 300, ease: 'Cubic.in' });
          sc.time.delayedCall(320, () => sc.resolveHeroHit(this, Math.round(this.def.dmg * 0.5), 'light', this.x, this.y));
        }
      }
      if (this.st > 1100) end(1300);
      return;
    }
    if (t === 'cannon') {
      if (this.st > 400 + sp.n * 280 && sp.n < 3) {
        sp.n++; this.replay('m_throw', 30);
        const target={x:h.x+(Math.random()-.5)*240,y:Phaser.Math.Clamp(h.y+(Math.random()-.5)*120,FLOOR_TOP,FLOOR_BOT)};
        if(this.enemyMotion)this.pendingRock=target;else this.scene.lobRock(this,target);
      }
      if (this.st > 1600) end(1500);
      return;
    }
    end(1000);
  }
  startSmash() {
    this.state = 'smashup'; this.st = 0; this.vx = this.vy = 0; this.play('b_smashup', 80); this.setHead('head_shout'); SFX.bossGrunt(this.px, this.id);
    const px = this.x + this.face * 210;
    this.scene.telegraph(px, this.y, 1.0, this.raged ? 650 : 900);
    this.rig.setTintAll(0xffb0a0);
  }
  startStomp(rage) {
    this.state = 'stomp'; this.st = 0; this.vx = this.vy = 0; this.hitDone = false; this.stompAt = rage ? 520 : 700;
    this.replay('b_stomp', 60); this.setHead('head_shout'); SFX.bossGrunt(this.px, this.id);
    this.scene.telegraph(this.x, this.y, 1.6, this.stompAt);
    this.rig.setTintAll(0xffd0a0);
    this.showEmote('anger', 700);
  }
  startRock() {
    this.state = 'rock'; this.st = 0; this.vx = this.vy = 0; this.hitDone = false; this.play('m_throwup', 120);
    const h = this.scene.hero;
    this.rockTarget = { x: h.x + h.vx * 0.5, y: h.y };
    this.scene.telegraph(this.rockTarget.x, this.rockTarget.y, 0.7, 1400);
    this.rockPoseReleased=false;
  }
  startRoots() {
    this.state = 'roots'; this.st = 0; this.vx = this.vy = 0; this.replay('b_stomp', 60); this.setHead('head_shout');
    const h = this.scene.hero;
    const pts = [[h.x, h.y], [h.x - 160, h.y + (Math.random() - 0.5) * 120], [h.x + 160, h.y + (Math.random() - 0.5) * 120]];
    if (this.raged) pts.push([h.x + (Math.random() - 0.5) * 300, h.y + (Math.random() - 0.5) * 160]);
    pts.forEach(([x, y], i) => {
      y = Phaser.Math.Clamp(y, FLOOR_TOP, FLOOR_BOT);
      this.scene.telegraph(x, y, 0.55, 1000 + i * 120);
      this.scene.time.delayedCall(1000 + i * 120, () => this.scene.rootBurst(this, x, y));
    });
    this.scene.time.delayedCall(520, () => { SFX.step('giant', this.px); this.scene.cameras.main.shake(140, 0.006); });
  }
  startRoar(rage, n = 0) {
    this.state = 'roar'; this.st = 0; this.vx = this.vy = 0; this.play('b_roar', 80); this.setHead('head_shout');
    SFX.roar(this.px, this.id); this.scene.cameras.main.shake(700, 0.008);
    this.showEmote('anger', 1300);
    if (rage) { this.rig.setTintAll(null); this.scene.bossRage(this); }
    if (n) this.scene.time.delayedCall(500, () => this.scene.summonGrunts(n));
  }
  bossHit(a, dir, dmg) {
    // ✏️ 그로기 게이지는 받은 피해에 비례해서 깎인다 (빠르게 여러 번 치는 직업이 계속 기절시키지 못하게)
    const pt = this.bossTune;
    if (pt) { this.poiseHitT = 0; this.poise -= Phaser.Math.Clamp(dmg / this.maxHp * 100 * pt.poiseK, 1, a.type === 'light' ? 6 : 16); }
    else this.poise -= a.type === 'light' ? 6 : 16;
    if (this.hp <= 0 && this.gimmick && BossGimmicks.lethal(this)) return true;
    if (this.hp <= 0) {
      if (this.gimmick) { BossGimmicks.cleanup(this); this.gimmick.flying = false; }
      this.state = 'air'; this.st = 0; this.vz = 350; this.z = Math.max(1, this.z); this.vx = dir * 120; this.play('m_air', 40); this.setHead('head_shout');
      this.scene.bossDefeated(this);
      return true;
    }
    SFX.gob('hurt',this.px,this.pitch,this.id);
    if (this.poise <= 0 && this.state !== 'stagger') {
      this.state = 'stagger'; this.st = 0; this.vx = 0; this.play('m_down', 120); this.setHead('head_shout');
      this.showEmote('dizzy', 2300); this.scene.floatText(this.x, this.y - this.height, '그로기!', '#ffd34d', 34);
      SFX.bossWeak(this.px);
      this.scene.cameras.main.shake(200, 0.008);
      this.rig.setTintAll(null);
      return true;
    }
    if (this.state === 'stagger') return true;
    // 슈퍼아머: 경직 없이 흔들리기만 한다
    return true;
  }
  physics(dt) {
    super.physics(dt);
    if (this.kind === 'barkhaul' && this.state === 'stagger') this.rig.c.rotation = 0;
  }
}
