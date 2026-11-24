// 🆕 2026-11-24 공격 손맛 (✏️ 같은 날 2차·3차: 사용자 요청 '더 크게' 두 번 — 단계는 LV, 주소 ?feelLv=2 로 2차 보기) — 여섯 영웅 기본 공격을 더 크고 시원하게 (판정·수치·타이밍은 그대로, 보이는 것만)
//   1) 칼 궤적: 칼끝 몇 점짜리 가는 선 → 칼날 안쪽부터 끝까지 채운 굵은 초승달, 더 오래 남고 빛이 더해진다
//   2) 예비동작: 맞기 전 구간의 시간을 비틀어 '뒤로 당긴 자세'에 더 오래 머물다 확 휘두른다 + 몸을 웅크린다
//   3) 큰 각도: 어깨·몸통·손목의 움직임 폭을 키우고, 맞는 순간 앞으로 늘어났다가 넘쳐 지나간다
//   🆕 5차(같은 날, '더 화려하게'): 내딛기·도약 크게, 잔상 더 많이, 맞는 순간 몸 기운·칼끝 빛 터짐·막타 땅 충격파
//   🆕 4차(같은 날, '주인공 동작 더 화려하게·자연스럽게'): 몸 전체 내딛기·막타 도약·잔상·칼끝 반짝·머리/망토 출렁임 (아래 '4차 몸 전체')
//   끄기: 주소에 ?oldfeel  · 배우 하나만 끄기: actor.feelOff = true (비교 화면 왼쪽)
const AttackFeel = {
  get enabled() { return !(typeof Q !== 'undefined' && Q.has('oldfeel')); },
  // 움직임 폭을 키울 관절과 배율 (팔꿈치는 키우면 꺾여 보여서 뺀다)
  // ✏️ 단계별 크기 (1차 .38/.3/.22 → 2차 → 3차). 기본은 가장 큰 3차
  LVS: {
    2: { AMP: { uab: .62, uaf: .62, torso: .5, rr: .5, hb: .36, hf: .36 }, cap: 34, capF: 38, big: 1.2, overK: 1.45, torsoO: 11, rxO: 20, sqO: .085, ext: .25, extF: .4, life: 165, lifeF: 215, a: .55, line: 8, lineF: 11 },
    3: { AMP: { uab: .85, uaf: .85, torso: .7, rr: .7, hb: .5, hf: .5 }, cap: 46, capF: 52, big: 1.25, overK: 1.8, torsoO: 16, rxO: 30, sqO: .11, ext: .4, extF: .6, life: 200, lifeF: 260, a: .65, line: 10, lineF: 14 },
  },
  get L() { const v = typeof Q !== 'undefined' && Q.get('feelLv'); return this.LVS[v] || this.LVS[3]; },
  on(actor) { return this.enabled && !actor.feelOff && actor.side === 'hero' && actor.motionSync; },
  active(actor) { return this.on(actor) && (actor.state === 'atk' || actor.state === 'jatk') && actor.atk && actor.atk.hit; },   // ✏️ 원거리(쏘는 공격)도 포함

  // 2) 맞기 전 구간 시간 비틀기: 빠르게 젖히고 → 가운데(가장 젖힌 자세)에 머물고 → 맞기 직전에 몰아서 휘두른다
  warp(actor, t) {
    if (!this.active(actor)) return t;
    const hit = actor.atk.hit[0];
    if (t >= hit || hit <= 0) return t;
    const x = 2 * t / hit - 1;
    return hit * (.5 + .5 * Math.sign(x) * Math.pow(Math.abs(x), 1.7));
  },

  // 공격마다 시작 자세를 기억해 두고, 그 자세에서 벗어난 만큼을 키운다
  pose(actor, p) {
    if (!this.active(actor)) { actor.feelRef = null; return p; }
    const a = actor.atk;
    if (!actor.feelRef || actor.feelRef.atk !== a || actor.st < actor.feelRef.st) actor.feelRef = { atk: a, st: actor.st, pose: { ...p } };
    const ref = actor.feelRef.pose, st = actor.st, hit = a.hit[0], end = a.hit[1];
    const fin = a.fin || actor.atkName === 'down';
    const L = this.L;
    const big = fin ? L.big : 1;
    // 젖히기(맞기 전 50~95%에서 가장 큼) · 넘치기(맞는 순간부터 짧게) 두 개의 혹
    const u = st / Math.max(1, hit);
    const wind = st < hit ? Math.sin(Math.PI * Math.min(1, Math.max(0, (u - .15) / .85))) ** 1.4 : 0;
    const over = st >= hit ? Math.exp(-(st - hit) / (fin ? 150 : 110))   // ✏️ 2차 넘치기 더 길게
                          * Math.min(1, (st - hit + 16) / 30) : 0;
    const k = (wind * .8 + over * L.overK) * big;   // ✏️ 2차: 젖히기보다 휘둘러 넘치는 쪽을 더 키운다
    const out = { ...p };
    for (const [name, amt] of Object.entries(L.AMP)) {
      if (!(name in p)) continue;
      let d = (p[name] || 0) - (ref[name] || 0);
      if (name === 'hb' || name === 'hf') d = ((d + 180) % 360 + 360) % 360 - 180;
      const cap = fin ? L.capF : L.cap;                                  // 너무 돌아가 칼이 등 뒤·땅으로 가지 않게
      out[name] = (p[name] || 0) + Math.max(-cap, Math.min(cap, d * amt * k));
    }
    // 🆕 쏘는 공격: 세릴은 활을 당기며 뒤로 버티다 쏘는 순간 반동으로 밀리고, 미라엘은 모았다가 앞으로 내지른다
    if (a.proj) {
      const bow = actor.key === 'ranger', fb = a.fin ? 1.3 : 1;
      out.torso = (out.torso || 0) - 7 * wind * fb + (bow ? -8 : 12) * over * fb;
      out.rx = (out.rx || 0) - 9 * wind * fb + (bow ? -16 : 16) * over * fb;
      out.sq = (out.sq || 0) - .07 * wind * fb + (bow ? .04 : .09) * over * fb;
      return out;
    }
    // 몸: 젖힐 때 뒤로 기울며 웅크리고, 맞을 때 앞으로 쏠리며 늘어난다
    out.torso = (out.torso || 0) - 5 * wind * big + L.torsoO * over * big;
    out.rx = (out.rx || 0) - 7 * wind + L.rxO * over * big;
    out.sq = (out.sq || 0) - .06 * wind * big + L.sqO * over * big;
    return out;
  },

  // 1) 굵은 초승달 궤적
  trailStart(tr, actor) {
    const fin = tr.attack.fin || actor.atkName === 'down';
    tr.feel = true; tr.fin = fin;
    tr.duration = tr.attack.hit[1] - tr.attack.hit[0] + (fin ? 300 : 230);   // ✏️ 2차
    tr.life = fin ? this.L.lifeF : this.L.life;               // 한 점이 남아 있는 시간 (예전 85ms, ✏️ 2차 125/165 → 165/215)
    tr.g.setBlendMode(Phaser.BlendModes.ADD);
  },
  trailUpdate(scene, h, tr, dt, frozen) {
    if (!frozen) {
      tr.age += dt;
      if (tr.age >= tr.duration) { tr.g.destroy(); h.swingTrail = null; return; }
      // 판정이 끝난 뒤 50ms까지 따라가 넘쳐 지나가는 칼도 그린다
      if (h.st <= tr.attack.hit[1] + 80) {   // ✏️ 2차 50 → 80
        const w = tr.weapon || 'wpn';
        const tip = h.rig.imagePoint(w, 0.5, 0.0), inner = h.rig.imagePoint(w, 0.5, 0.92);
        // ✏️ 2차: 칼끝보다 25% 더 바깥까지 뻗은 궤적 (칼보다 큰 초승달)
        const ext = tr.fin ? this.L.extF : this.L.ext;
        tr.points.push({ tip: { x: tip.x + (tip.x - inner.x) * ext, y: tip.y + (tip.y - inner.y) * ext }, inner, age: tr.age });
      }
      tr.points = tr.points.filter(p => tr.age - p.age < tr.life).slice(-24);
    }
    const g = tr.g.clear().setDepth(h.y + 1002);
    const pts = tr.points;
    if (pts.length < 2) return;
    // 프레임 사이가 벌어져 각지지 않게 칼끝·안쪽 경로를 곡선으로 잘게 나눈다
    const cr = (a, b, c, d, t) => {
      const t2 = t * t, t3 = t2 * t;
      return { x: .5 * (2 * b.x + (-a.x + c.x) * t + (2 * a.x - 5 * b.x + 4 * c.x - d.x) * t2 + (-a.x + 3 * b.x - 3 * c.x + d.x) * t3),
               y: .5 * (2 * b.y + (-a.y + c.y) * t + (2 * a.y - 5 * b.y + 4 * c.y - d.y) * t2 + (-a.y + 3 * b.y - 3 * c.y + d.y) * t3) };
    };
    const tips = [], inners = [], ages = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < 4; s++) {
        const t = s / 4;
        tips.push(cr(a.tip, b.tip, c.tip, d.tip, t)); inners.push(cr(a.inner, b.inner, c.inner, d.inner, t));
        ages.push(b.age + (c.age - b.age) * t);
      }
    }
    const last = pts[pts.length - 1];
    tips.push(last.tip); inners.push(last.inner); ages.push(last.age);
    const fade = Math.min(1, (tr.duration - tr.age) / 70);
    const tint = tr.tint || 0xffdb83;
    const n = tips.length;
    for (let i = 1; i < n; i++) {
      const life = 1 - (tr.age - ages[i]) / tr.life;              // 새 점일수록 1
      const head = Math.max(0, life) ** 1.3 * fade;
      // 바깥(칼끝) 쪽은 진하고, 안쪽으로 갈수록 옅게 — 두 겹으로 나눠 그린다
      const mid0 = { x: (tips[i - 1].x + inners[i - 1].x) / 2, y: (tips[i - 1].y + inners[i - 1].y) / 2 };
      const mid1 = { x: (tips[i].x + inners[i].x) / 2, y: (tips[i].y + inners[i].y) / 2 };
      g.fillStyle(tint, .22 * head).fillPoints([inners[i - 1], mid0, mid1, inners[i]], true);
      g.fillStyle(tint, this.L.a * head).fillPoints([mid0, tips[i - 1], tips[i], mid1], true);
      // 칼끝 테두리: 새 쪽일수록 굵고 하얗게
      g.lineStyle((tr.fin ? this.L.lineF : this.L.line) * head + 1.5, 0xfff6dc, .95 * head).lineBetween(tips[i - 1].x, tips[i - 1].y, tips[i].x, tips[i].y);
    }
    // 막타: 바깥으로 한 겹 더 큰 잔상
    if (tr.fin) {
      for (let i = 1; i < n; i++) {
        const life = Math.max(0, 1 - (tr.age - ages[i]) / tr.life) * fade;
        const o0 = { x: tips[i - 1].x + (tips[i - 1].x - inners[i - 1].x) * .35, y: tips[i - 1].y + (tips[i - 1].y - inners[i - 1].y) * .35 };
        const o1 = { x: tips[i].x + (tips[i].x - inners[i].x) * .35, y: tips[i].y + (tips[i].y - inners[i].y) * .35 };
        g.fillStyle(tint, .28 * life * life).fillPoints([tips[i - 1], o0, o1, tips[i]], true);
      }
    }
  },

  // ===================== 🆕 원거리 손맛 (미라엘·세릴) =====================
  // 모으기: 쏘기 전 지팡이 끝/활에 빛이 모인다 · 발사: 총구에서 빛 고리와 빛살이 터진다
  // 투사체: 굵은 빛 꼬리 + 머리 빛무리 + 흩날리는 불티 · 맞으면 고리가 터진다
  // ✏️ 2차(같은 날): 실제 게임 화면에선 작아서 티가 안 난다는 말에 크기 약 1.5배·색 진하게
  COL: { fire: 0xff7a2e, ice: 0x8fdcff, bolt: 0xfff07a, moon: 0xcfe6ff },
  colOf(h, elem) { return this.COL[elem] || (h.key === 'ranger' ? this.COL.moon : 0xd8b0ff); },
  muzzleOf(h) {
    if (!h.rig) return null;
    if (h.key === 'ranger') return h.rig.imagePoint('fitem', 0.5, 0.5);
    if (h.key === 'mage') return h.atkName === 'a2' ? h.rig.imagePoint('hf', 0.62, 0.5) : h.rig.imagePoint('wpn', 0.5, 0.06);
    return null;
  },
  gfx(scene) {
    if (!scene.feelG || !scene.feelG.scene) scene.feelG = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    return scene.feelG;
  },
  dots(scene, x, y, col, n, spd, life, r) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = spd * (.4 + Math.random() * .6);
      scene.feelDots.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: life * (.6 + Math.random() * .4), col, r: r * (.6 + Math.random() * .6) });
    }
  },
  shootFx(scene, h, o, muzzle) {
    const m = muzzle || { x: h.x + h.face * 70, y: h.y - 115 };
    const fin = !!h.atk?.fin, bow = h.key === 'ranger', col = this.colOf(h, o.elem);
    scene.feelFx.push({ kind: bow ? 'bow' : 'cast', x: m.x, y: m.y, face: h.face, col, age: 0, dur: fin ? 320 : 240, big: fin ? 1.4 : 1 });
    this.dots(scene, m.x, m.y, col, fin ? 22 : 14, bow ? 340 : 420, 380, bow ? 4.5 : 6);
    scene.cameras.main.shake(fin ? 130 : 80, fin ? .005 : (bow ? .002 : .003));
  },
  projStart(scene, h, p) {
    const bow = h.key === 'ranger';
    p.feel = { col: this.colOf(h, p.elem), bow, pts: [], fin: !!h.atk?.fin };
    if (!bow) p.img.setScale(p.img.scaleX * 1.5, p.img.scaleY * 1.5);   // 원소탄 50% 크게 (✏️ 1.3 → 1.5)
  },
  projHit(scene, p) {
    const x = p.x, y = p.y - p.z;
    scene.feelFx.push({ kind: 'hit', x, y, face: Math.sign(p.vx) || 1, col: p.feel.col, age: 0, dur: 300, big: p.feel.bow ? 1.15 : 1.5 });
    this.dots(scene, x, y, p.feel.col, p.feel.bow ? 10 : 16, 460, 360, p.feel.bow ? 4.5 : 6);
  },
  projEnd(scene, p) {
    // 사라질 때 남은 꼬리를 잠깐 흩날리는 불티로
    const pts = p.feel.pts;
    for (let i = 0; i < pts.length; i += 2) this.dots(scene, pts[i].x, pts[i].y, p.feel.col, 1, 60, 220, 3);
    p.feel = null;
  },
  tick(scene, dt) {
    if (!scene.feelFx) return;
    const h = scene.hero;
    const g = this.gfx(scene).clear().setDepth(1000 + (h ? h.y : 0) + 3);
    // 1) 모으기
    if (h && scene.cls?.ranged && this.active(h) && h.atk.proj && h.st < h.atk.hit[0]) {
      const m = this.muzzleOf(h);
      if (m) {
        const u = Math.min(1, h.st / h.atk.hit[0]), col = this.colOf(h, h.atk.proj.elem), fin = h.atk.fin ? 1.3 : 1;
        g.fillStyle(col, .25 + .35 * u).fillCircle(m.x, m.y, (14 + 34 * u) * fin);
        g.fillStyle(0xffffff, .3 + .4 * u).fillCircle(m.x, m.y, (4 + 10 * u) * fin);
        const rot = scene.now / 140 * h.face;
        if (h.key === 'mage') {
          // 돌아가는 마법진 고리
          const R = (24 + 40 * u) * fin;
          g.lineStyle(4, col, .45 + .5 * u).strokeCircle(m.x, m.y, R);
          g.lineStyle(2.5, col, .35 + .4 * u).strokeCircle(m.x, m.y, R * .72);
          for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4; g.lineStyle(4, col, .45 + .5 * u).lineBetween(m.x + Math.cos(a) * R, m.y + Math.sin(a) * R, m.x + Math.cos(a) * (R + 12), m.y + Math.sin(a) * (R + 12)); }
        }
        // 빛줄기가 안쪽으로 모인다
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3 + rot * .5, d0 = (105 - 70 * u) * fin, d1 = d0 * .5;
          g.lineStyle(3.5, col, .35 + .5 * u).lineBetween(m.x + Math.cos(a) * d0, m.y + Math.sin(a) * d0, m.x + Math.cos(a) * d1, m.y + Math.sin(a) * d1);
        }
      }
    }
    // 2) 투사체 꼬리·머리 빛
    for (const p of scene.projs) {
      if (!p.feel || p.dead) continue;
      const f = p.feel, hx = p.x, hy = p.y - p.z;
      f.pts.push({ x: hx, y: hy }); if (f.pts.length > (f.bow ? 12 : 14)) f.pts.shift();
      const n = f.pts.length, W = f.bow ? (f.fin ? 15 : 12) : 40;
      for (let i = 1; i < n; i++) {
        const k = i / (n - 1), a = f.pts[i - 1], b = f.pts[i];
        g.lineStyle(W * 1.8 * k + 2, f.col, .22 * k).lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(W * k + 1, f.col, .6 * k).lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(W * .3 * k + 1, 0xffffff, .6 * k).lineBetween(a.x, a.y, b.x, b.y);
      }
      const R = f.bow ? 24 : 50, pulse = 1 + Math.sin(scene.now / 45) * .12;
      g.fillStyle(f.col, .25).fillCircle(hx, hy, R * pulse);
      g.fillStyle(f.col, .45).fillCircle(hx, hy, R * .55 * pulse);
      if (Math.random() < (f.bow ? 1 : 2) * dt / 16.7) this.dots(scene, hx - Math.sign(p.vx) * 8, hy + (Math.random() - .5) * 14, f.col, f.bow ? 1 : 2, 90, 380, f.bow ? 3.5 : 5.5);
    }
    // 3) 발사·맞음 터짐
    for (const e of scene.feelFx) {
      e.age += dt;
      const t = Math.min(1, e.age / e.dur), out = 1 - (1 - t) ** 3, a = 1 - t, B = e.big;
      if (e.kind === 'bow') {
        // 활: 앞쪽으로 납작한 충격파 고리 + 앞으로 뻗는 빛줄
        g.lineStyle(8 * a + 1, e.col, .95 * a).strokeEllipse(e.x + e.face * 45 * out * B, e.y, (20 + 34 * out) * B, (60 + 110 * out) * B);
        g.fillStyle(e.col, .3 * a).fillEllipse(e.x + e.face * 45 * out * B, e.y, (20 + 34 * out) * B, (60 + 110 * out) * B);
        g.lineStyle(4.5 * a + 1, e.col, .9 * a);
        for (const dy of [-26, 0, 26]) g.lineBetween(e.x + e.face * (30 + 60 * out) * B, e.y + dy * B, e.x + e.face * (90 + 190 * out) * B, e.y + dy * B * 1.3);
      } else if (e.kind === 'burst') {
        // 🆕 5차 칼끝 빛 터짐: 고리 + 앞쪽으로 뻗는 빛살 + 하얀 심
        const R = (24 + 90 * out) * B;
        g.lineStyle(9 * a + 1, e.col, .9 * a).strokeCircle(e.x, e.y, R);
        g.fillStyle(e.col, .3 * a).fillCircle(e.x, e.y, R * .75);
        g.fillStyle(0xffffff, .85 * a).fillCircle(e.x, e.y, (18 * a + 4) * B);
        for (let i = 0; i < 9; i++) {
          const ang = (e.face > 0 ? 0 : Math.PI) + (i - 4) * .38, r0 = R * .4, r1 = R * (1.3 + .6 * ((i + 1) % 2));
          g.lineStyle(5 * a + 1, i % 2 ? e.col : 0xffffff, .95 * a).lineBetween(e.x + Math.cos(ang) * r0, e.y + Math.sin(ang) * r0, e.x + Math.cos(ang) * r1, e.y + Math.sin(ang) * r1);
        }
      } else if (e.kind === 'quake') {
        // 🆕 5차 막타 착지 땅 충격파: 납작한 고리 두 겹 + 튀는 돌빛
        for (const [d, w] of [[0, 1], [.25, .7]]) {
          const tt = Math.max(0, Math.min(1, (e.age / e.dur - d) / (1 - d))), oo = 1 - (1 - tt) ** 3, aa = 1 - tt;
          if (tt <= 0) continue;
          g.lineStyle(10 * aa * w + 1, e.col, .85 * aa).strokeEllipse(e.x, e.y, (60 + 300 * oo) * w, (16 + 70 * oo) * w);
          g.fillStyle(e.col, .18 * aa).fillEllipse(e.x, e.y, (60 + 300 * oo) * w, (16 + 70 * oo) * w);
        }
      } else if (e.kind === 'glint') {
        // 🆕 칼끝 반짝: 네 갈래 별이 커졌다 작아진다
        if (e.actor && e.actor.rig && e.actor.rig.c.scene) { const p = e.actor.rig.imagePoint(e.w, 0.5, 0.0); e.x = p.x; e.y = p.y; }   // 칼끝을 따라간다
        const k = Math.sin(Math.PI * t), R = 46 * k * B, w = R * .14;   // ✏️ 5차 30 → 46
        g.fillStyle(e.col, .45 * k).fillCircle(e.x, e.y, R * .42);
        g.fillStyle(0xffffff, .95 * k)
          .fillPoints([{ x: e.x, y: e.y - R }, { x: e.x + w, y: e.y }, { x: e.x, y: e.y + R }, { x: e.x - w, y: e.y }], true)
          .fillPoints([{ x: e.x - R * .8, y: e.y }, { x: e.x, y: e.y - w }, { x: e.x + R * .8, y: e.y }, { x: e.x, y: e.y + w }], true);
      } else {
        // 마법: 둥근 고리 + 빛살 (맞음은 사방, 발사는 앞쪽 부채꼴)
        const R = (e.kind === 'hit' ? 26 + 110 * out : 20 + 96 * out) * B;
        g.lineStyle(10 * a + 1, e.col, .95 * a).strokeCircle(e.x, e.y, R);
        g.fillStyle(e.col, .4 * a).fillCircle(e.x, e.y, R * .8);
        g.fillStyle(0xffffff, .6 * a).fillCircle(e.x, e.y, (22 * a + 4) * B);
        const rays = e.kind === 'hit' ? 8 : 7;
        for (let i = 0; i < rays; i++) {
          const ang = e.kind === 'hit' ? i * Math.PI * 2 / rays + .3 : (e.face > 0 ? 0 : Math.PI) + (i - 3) * .32;
          const r0 = R * .45, r1 = R * (1.15 + .5 * (i % 2));
          g.lineStyle(6 * a + 1, e.col, .95 * a).lineBetween(e.x + Math.cos(ang) * r0, e.y + Math.sin(ang) * r0, e.x + Math.cos(ang) * r1, e.y + Math.sin(ang) * r1);
        }
      }
    }
    scene.feelFx = scene.feelFx.filter(e => e.age < e.dur);
    // 4) 불티
    const s = dt / 1000;
    for (const d of scene.feelDots) {
      d.age += dt; d.x += d.vx * s; d.y += d.vy * s; d.vx *= .9; d.vy = d.vy * .9 - 20 * s;
      const a = Math.max(0, 1 - d.age / d.life);
      g.fillStyle(d.col, .9 * a).fillCircle(d.x, d.y, d.r * (.5 + .5 * a));
    }
    scene.feelDots = scene.feelDots.filter(d => d.age < d.life);
    // 5) 🆕 몸 잔상이 흐려지며 사라진다 (다 쓴 것은 다시 쓴다)
    if (scene.feelGhosts) {
      for (const q of scene.feelGhosts) { q.age += dt; const u = Math.min(1, q.age / q.life); q.rt.setAlpha(q.a0 * (1 - u) ** 1.6); if (q.grow) q.rt.setScale(1 + q.grow * (1 - (1 - u) ** 3)); }
      for (const q of scene.feelGhosts) if (q.age >= q.life) { q.rt.setVisible(false); scene.feelGhostPool.push(q.rt); }
      scene.feelGhosts = scene.feelGhosts.filter(q => q.age < q.life);
    }
  },

  // ===================== 🆕 4차 몸 전체 (2026-11-24: '주인공 동작 더 화려하게, 자연스럽게') =====================
  //  a) 내딛기: 휘두르는 순간 몸 전체가 앞으로 쏠렸다가 천천히 제자리로 (그림자도 같이). 쏘는 공격은 반동으로 뒤로
  //  b) 막타 도약: 젖히며 살짝 떠올랐다가 맞는 순간 내리꽂는다 + 착지 먼지
  //  c) 잔상: 가장 빠르게 휘두르는 구간에 몸 실루엣이 직업색으로 남았다 사라진다
  //  d) 칼끝 반짝: 가장 젖힌 순간 · e) 맞는 순간 머리·망토가 한 박자 늦게 따라온다 (2차 움직임)
  //  판정·위치(actor.x)는 그대로, 그림만 옮긴다
  hop(actor) { return actor.state === 'atk' && !actor.atk.proj && (actor.atk.fin || actor.atkName === 'down'); },
  offset(actor) {
    if (!this.active(actor) || !actor.rig) return null;
    const a = actor.atk, st = actor.st, hit = a.hit[0], f = actor.face;
    const fin = a.fin || actor.atkName === 'down', big = fin ? 1.4 : 1;
    const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    if (a.proj) {
      const r = st >= hit ? Math.exp(-(st - hit) / 150) * sm((st - hit + 16) / 30) : 0;
      return { x: -f * (actor.key === 'ranger' ? 12 : 7) * r * big, y: 0 };
    }
    // 젖힐 때 살짝 뒤로 → 맞기 직전 확 앞으로 → 맞은 뒤 천천히 돌아온다
    const back = st < hit ? Math.sin(Math.PI * sm(st / hit)) * .9 : 0;
    const push = sm((st - (hit - 55)) / 75) * (st > hit + 20 ? Math.exp(-(st - hit - 20) / 280) : 1);
    let y = 0;
    if (this.hop(actor) && st < hit) y = -40 * Math.sin(Math.PI * sm(st / hit)) ** .8;   // ✏️ 5차 24 → 40
    return { x: f * (-10 * back + 34 * push) * big, y };   // ✏️ 5차 7/24 → 10/34
  },
  after(actor, dt, frozen) {
    const R = actor.feelRef;
    if (!R || !this.active(actor) || R.atk !== actor.atk) return;
    const a = actor.atk, st = actor.st, hit = a.hit[0], sc = actor.scene;
    const fin = a.fin || actor.atkName === 'down', big = fin ? 1.4 : 1;
    const col = actor.cls?.smearTint || this.COL[a.proj?.elem] || 0xffe6b0;
    // d) 가장 젖힌 순간 칼끝 반짝
    if (!R.glint && !a.proj && st >= hit * .55 && st < hit && sc.feelFx && actor.rig.map.wpn) {
      R.glint = true;
      const w = actor.swingTrail?.weapon || 'wpn', p = actor.rig.imagePoint(w, 0.5, 0.0);
      sc.feelFx.push({ kind: 'glint', actor, w, x: p.x, y: p.y, face: actor.face, col, age: 0, dur: fin ? 220 : 160, big: fin ? 1.3 : 1 });
    }
    // e) 맞는 순간: 머리·망토가 뒤따라 출렁이고, 디딤발에 먼지
    if (!R.hitFx && st >= hit) {
      R.hitFx = true;
      actor.kick(-6 * big, 26 * big, this.hop(actor) ? -.07 : -.03);
      // 🆕 5차: 몸에서 직업색 기운이 확 퍼지고, 칼끝 닿는 곳에 빛 터짐, 막타 착지는 땅 충격파
      if (!a.proj && !frozen) {
        const low2 = typeof Settings !== 'undefined' && Settings.d && Settings.d.low;
        if (!low2) this.ghost(actor, col, fin, true);
        // ✏️ 빛 터짐은 칼끝이 아니라 실제로 맞는 적의 몸(없으면 공격 사거리 끝)에서 — 칼끝은 발밑·머리 위로 갈 때가 있었다
        if (sc.feelFx) {
          const f = actor.face, rch = a.reach || [0, 160];
          const tgt = (sc.monsters || []).filter(m => !m.dead && (m.x - actor.x) * f > rch[0] - 20 && (m.x - actor.x) * f < rch[1] + 40 && Math.abs(m.y - actor.y) < (a.dz || 40) + 20)
            .sort((m1, m2) => Math.abs(m1.x - actor.x) - Math.abs(m2.x - actor.x))[0];
          const bx = tgt ? tgt.x - f * 18 : actor.x + f * rch[1] * .7, by = tgt ? tgt.y - tgt.z - tgt.height * .5 : actor.y - actor.z - 95;
          sc.feelFx.push({ kind: 'burst', x: bx, y: by, face: f, col, age: 0, dur: fin ? 340 : 260, big: fin ? 1.4 : .9 });
        }
        if (this.hop(actor) && sc.feelFx) {
          const o = this.offset(actor) || { x: 0 };
          sc.feelFx.push({ kind: 'quake', x: actor.x + o.x, y: actor.y, face: actor.face, col, age: 0, dur: 420, big: 1 });
          sc.cameras.main.shake(140, .006);
        }
      }
      if (!a.proj && sc.fx) {
        const o = this.offset(actor) || { x: 0 };
        sc.fx('dust_run', actor.x + o.x - actor.face * 26, actor.y, { s: .28 * big, flip: actor.face < 0, dur: 380, depth: actor.y - 1 });
        if (this.hop(actor)) sc.fx('dust_land', actor.x + o.x, actor.y, { s: .42, dur: 420, depth: actor.y - 1 });
      }
    }
    // c) 잔상
    const low = typeof Settings !== 'undefined' && Settings.d && Settings.d.low;
    // ✏️ 가장 빠른 구간에만 2~3장 (많으면 겹쳐서 불덩어리처럼 보였다)
    if (!a.proj && !frozen && !low && st >= hit - (fin ? 130 : 90) && st <= hit + 30 && (!R.ghostAt || st - R.ghostAt >= 30)) {   // ✏️ 5차 더 많이
      R.ghostAt = st;
      this.ghost(actor, col, fin);
    }
  },
  ghost(actor, col, fin, aura) {
    const sc = actor.scene, c = actor.rig.c;
    sc.feelGhosts = sc.feelGhosts || []; sc.feelGhostPool = sc.feelGhostPool || [];
    let rt = sc.feelGhostPool.pop();
    while (rt && !rt.scene) rt = sc.feelGhostPool.pop();
    if (!rt) rt = sc.add.renderTexture(0, 0, 512, 512).setOrigin(.5, 400 / 512);
    rt.clear();
    rt.draw(c, 256, 400);
    // ✏️ 색으로 꽉 채우지 않고 직업색을 살짝 입힌 반투명 모습 (움직임 흔적처럼)
    rt.setPosition(c.x, c.y).setDepth(c.depth - 1).setScale(1).setVisible(true);
    // 🆕 5차 aura: 맞는 순간의 몸을 직업색 빛으로 채워 부풀리며 사라지게 (기운이 터지는 느낌)
    if (aura) rt.setTintFill(col).setBlendMode(Phaser.BlendModes.ADD).setDepth(c.depth - 2);   // ✏️ 몸 뒤에서 (앞에 두면 몸이 하얗게 덮였다)
    else rt.clearTint().setTint(col).setBlendMode(Phaser.BlendModes.NORMAL);
    const q = aura ? { rt, age: 0, life: fin ? 320 : 240, a0: fin ? .7 : .55, grow: fin ? .26 : .16 }
                   : { rt, age: 0, life: fin ? 320 : 260, a0: fin ? .7 : .6 };   // ✏️ 5차 더 오래·진하게
    rt.setAlpha(q.a0);
    sc.feelGhosts.push(q);
  },
};
