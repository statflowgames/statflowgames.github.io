// 은하 방역대 - 렌더링 (배경, 몹, 탄막, 이펙트, HUD)
const Render = (() => {
  const R = { scale: 1 };
  let cv, c, wrap, stage, dpr = 1, sky = null, skyS = null;
  const blobs = [];
  const FD = "'Black Han Sans', 'Jua', sans-serif", FB = "'Jua', sans-serif";

  R.init = function () {
    cv = document.getElementById('game'); c = cv.getContext('2d');
    wrap = document.getElementById('wrap'); stage = document.getElementById('stage');
    for (let i = 0; i < 110; i++) G.stars.push({ x: rand(0, 360), y: rand(0, 800), z: rand(0.2, 1) });
    for (let i = 0; i < 4; i++) blobs.push({ x: rand(0, 360), y: rand(-200, 800), r: rand(90, 170), v: rand(6, 14) });
    addEventListener('resize', R.resize); R.resize();
  };
  R.resize = function () {
    const w = wrap.clientWidth || 360, h = wrap.clientHeight || 640;
    G.H = Math.round(Math.max(560, Math.min(800, G.W * h / w)));
    R.scale = Math.min(w / G.W, h / G.H);
    const cw = Math.round(G.W * R.scale), ch = Math.round(G.H * R.scale);
    stage.style.width = cw + 'px'; stage.style.height = ch + 'px';
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    if (skyS) R.makeSky(skyS);
  };
  R.makeSky = function (S) {
    skyS = S; sky = document.createElement('canvas');
    sky.width = G.W; sky.height = G.H;
    const k = sky.getContext('2d'), g = k.createLinearGradient(0, 0, 0, G.H);
    g.addColorStop(0, S.sky[0]); g.addColorStop(1, S.sky[1]);
    k.fillStyle = g; k.fillRect(0, 0, G.W, G.H);
    // 멀리 보이는 행성
    const px = G.W * 0.78, py = G.H * 0.22, pr = 46;
    const pg = k.createRadialGradient(px - 14, py - 14, 4, px, py, pr);
    pg.addColorStop(0, S.sky[2]); pg.addColorStop(1, S.sky[0]);
    k.globalAlpha = 0.45; k.fillStyle = pg; k.beginPath(); k.arc(px, py, pr, 0, Math.PI * 2); k.fill();
    k.globalAlpha = 0.25; k.strokeStyle = S.sky[2]; k.lineWidth = 2;
    k.beginPath(); k.ellipse(px, py, pr * 1.6, pr * 0.35, -0.3, 0, Math.PI * 2); k.stroke();
    k.globalAlpha = 1;
  };
  R.updateStars = function (dt) {
    const sp = G.state === 'play' && G.phase === 'warn' ? 3 : 1;
    for (const s of G.stars) { s.y += (20 + s.z * 140) * dt * sp; if (s.y > G.H) { s.y = -2; s.x = rand(0, G.W); } }
    for (const b of blobs) { b.y += b.v * dt; if (b.y - b.r > G.H) { b.y = -b.r; b.x = rand(0, G.W); } }
  };

  function txt(s, x, y, size, color, align = 'left', font = FD) {
    c.font = `${size}px ${font}`; c.textAlign = align; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillText(s, x + 1.5, y + 2);
    c.fillStyle = color; c.fillText(s, x, y);
  }

  function drawBg() {
    if (sky) c.drawImage(sky, 0, 0, G.W, G.H); else { c.fillStyle = '#0b0618'; c.fillRect(0, 0, G.W, G.H); }
    const tint = skyS ? skyS.sky[2] : '#ffffff';
    c.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, tint + '22'); g.addColorStop(1, tint + '00');
      c.fillStyle = g; c.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    for (const s of G.stars) {
      c.globalAlpha = 0.3 + s.z * 0.7; c.fillStyle = s.z > 0.8 ? '#fff' : '#bcd6ff';
      const len = G.phase === 'warn' && G.state === 'play' ? 10 * s.z : 1.4 * s.z + 0.6;
      c.fillRect(s.x, s.y, 1.4 * s.z + 0.4, len);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  // 공격 예고: 조준선, 다시 나타날 자리
  function drawTells(e) {
    const lines = e.aimLines || (e.aimLine != null ? [e.aimLine] : null);
    if (lines) {
      c.strokeStyle = `rgba(255,60,90,${0.35 + 0.3 * Math.sin(G.time * 30)})`; c.lineWidth = 2; c.setLineDash([8, 6]);
      for (const a of lines) { c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + Math.cos(a) * 900, e.y + Math.sin(a) * 900); c.stroke(); }
      c.setLineDash([]);
    }
    if (e.warnAt) {
      const k = 0.5 + 0.5 * Math.sin(G.time * 20);
      c.strokeStyle = `rgba(255,140,66,${0.5 + 0.4 * k})`; c.lineWidth = 2;
      c.beginPath(); c.arc(e.warnAt.x, e.warnAt.y, 10 + k * 4, 0, Math.PI * 2); c.stroke();
    }
  }
  function drawEnemy(e) {
    if (e.def.thread) { c.strokeStyle = 'rgba(230,220,255,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(e.x, -10); c.lineTo(e.x, e.y - 8); c.stroke(); }
    drawTells(e);
    c.save(); c.translate(e.x, e.y);
    if (e.ghost) c.globalAlpha = 0.25;
    if (e.rotate && (e.vx || e.vy)) c.rotate(Math.atan2(e.vy, e.vx) - Math.PI / 2);
    if (e.flash > 0) c.scale(1.15, 1.15);
    e.def.draw(c, G.time + e.x * 0.01, e);
    if (e.flash > 0) { c.globalAlpha = 0.6; Art.ell(c, 0, 0, e.r, e.r, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
    if (e.def.elite && e.hp < e.maxHp) {
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(e.x - 14, e.y + e.r + 6, 28, 3);
      c.fillStyle = '#ffd23f'; c.fillRect(e.x - 14, e.y + e.r + 6, 28 * Math.max(0, e.hp / e.maxHp), 3);
    }
  }
  function drawBoss(b) {
    if (b.warn) {
      c.globalAlpha = 0.18 + 0.12 * Math.sin(G.time * 30); c.fillStyle = '#ff2d55';
      c.fillRect(b.x - b.r, b.y, b.r * 2, G.H); c.globalAlpha = 1;
    }
    drawTells(b);
    c.save(); c.translate(b.x, b.y); c.scale(b.def.scale, b.def.scale);
    if (b.flash > 0) c.scale(1.04, 1.04);
    if (b.ghost) c.globalAlpha = 0.3;
    b.def.draw(c, G.time, b);
    c.globalAlpha = 1;
    if (b.flash > 0) { c.globalAlpha = 0.35; Art.ell(c, 0, 0, b.r, b.r * 1.1, 0, '#fff'); c.globalAlpha = 1; }
    c.restore();
  }
  function drawBullets() {
    c.globalCompositeOperation = 'lighter';
    for (const b of G.pb) {
      if (b.homing) {
        c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx));
        c.fillStyle = '#ff8c42'; c.fillRect(-6, -2, 12, 4); c.fillStyle = '#fff'; c.fillRect(2, -1, 5, 2); c.restore();
      } else if (b.drone) { Art.ell(c, b.x, b.y, 2.5, 5, 0, '#ffd23f'); }
      else { Art.ell(c, b.x, b.y, 4, 9, 0, 'rgba(45,226,166,0.55)'); Art.ell(c, b.x, b.y, 2, 6, 0, '#e6fff7'); }
    }
    c.globalCompositeOperation = 'source-over';
    for (const b of G.eb) {
      if (b.shape === 'sting') {
        c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx));
        c.fillStyle = b.c; c.beginPath(); c.moveTo(9, 0); c.lineTo(-6, -4); c.lineTo(-6, 4); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(6, 0); c.lineTo(-3, -1.6); c.lineTo(-3, 1.6); c.fill(); c.restore();
      } else if (b.shape === 'web') {
        Art.ell(c, b.x, b.y, b.r, b.r, 0, 'rgba(224,212,255,0.25)');
        c.strokeStyle = '#f2ecff'; c.lineWidth = 1; c.beginPath();
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + G.time; c.moveTo(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r); c.lineTo(b.x - Math.cos(a) * b.r, b.y - Math.sin(a) * b.r); }
        c.stroke(); c.beginPath(); c.arc(b.x, b.y, b.r * 0.55, 0, Math.PI * 2); c.stroke();
      } else if (b.shape === 'gas') {
        const k = b.life !== undefined ? Math.min(1, b.life) : 1;
        c.globalAlpha = 0.7 * k; Art.ell(c, b.x, b.y, b.r + 3, b.r + 1, 0, b.c); Art.ell(c, b.x - 3, b.y - 2, b.r * 0.6, b.r * 0.5, 0, 'rgba(220,255,180,0.6)'); c.globalAlpha = 1;
      } else if (b.shape === 'dust') {
        Art.ell(c, b.x, b.y, b.r + 1.5, b.r + 1.5, 0, 'rgba(224,200,240,0.35)'); Art.ell(c, b.x, b.y, b.r * 0.7, b.r * 0.7, 0, b.c);
      } else if (b.shape === 'blade') {
        c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx));
        c.fillStyle = b.c; c.beginPath(); c.moveTo(8, 0); c.quadraticCurveTo(0, -6, -7, -2); c.quadraticCurveTo(-2, 0, -7, 2); c.quadraticCurveTo(0, 6, 8, 0); c.fill();
        c.fillStyle = '#fff'; c.fillRect(-2, -0.8, 7, 1.6); c.restore();
      } else if (b.shape === 'dung' || b.shape === 'egg' || b.shape === 'bubble') {
        const blink = b.fuse !== undefined && b.fuse < 0.4 && Math.sin(G.time * 40) > 0;
        if (b.shape === 'bubble') { c.strokeStyle = b.c; c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.stroke(); Art.ell(c, b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.3, b.r * 0.3, 0, '#fff'); }
        else { Art.ell(c, b.x, b.y, b.r + 1.5, b.r + 1.5, 0, blink ? '#ffffff' : '#2a1a0a'); Art.ell(c, b.x, b.y, b.r, b.r, 0, b.c); Art.ell(c, b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, b.r * 0.3, 0, 'rgba(255,255,255,0.5)'); }
      } else {
        Art.ell(c, b.x, b.y, b.r + 2, b.r + 2, 0, b.c);
        Art.ell(c, b.x, b.y, b.r * 0.55, b.r * 0.55, 0, '#fff');
      }
    }
  }
  function drawPlayer() {
    const p = G.p;
    if (G.state === 'over') return;
    for (const d of dronePos()) { c.save(); c.translate(d.x, d.y); Art.drone(c, G.time); c.restore(); }
    if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) return;
    c.save(); c.translate(p.x, p.y); Art.player(c, G.time); c.restore();
    if (p.shield > 0) {
      c.strokeStyle = `rgba(94,242,255,${0.5 + 0.2 * Math.sin(G.time * 6)})`; c.lineWidth = 2;
      c.beginPath(); c.arc(p.x, p.y, 22, 0, Math.PI * 2); c.stroke();
      if (p.shield > 1) { c.beginPath(); c.arc(p.x, p.y, 26, 0, Math.PI * 2); c.stroke(); }
    }
    Art.ell(c, p.x, p.y, 3.5, 3.5, 0, '#ff2d75'); Art.ell(c, p.x, p.y, 1.8, 1.8, 0, '#fff');
  }
  function drawItems() {
    for (const it of G.items) {
      c.save(); c.translate(it.x, it.y);
      if (it.kind === 'heart') { Art.ell(c, 0, 0, 12, 12, 0, 'rgba(255,77,109,0.2)'); Art.heart(c, G.time, 1.2 + Math.sin(G.time * 8) * 0.1); }
      else if (it.kind === 'bomb') Art.bombItem(c, G.time);
      else Art.pollen(c, G.time + it.x, it.kind === 'xpBig');
      c.restore();
    }
  }
  function drawParts() {
    c.globalCompositeOperation = 'lighter';
    for (const q of G.parts) {
      const k = q.life / q.max;
      c.globalAlpha = Math.max(0, k);
      if (q.ring) { c.strokeStyle = q.c; c.lineWidth = 3 * k; c.beginPath(); c.arc(q.x, q.y, q.s * (1 - k) + 2, 0, Math.PI * 2); c.stroke(); }
      else { c.fillStyle = q.c; c.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    for (const t of G.texts) { c.globalAlpha = Math.min(1, t.life * 2); txt(String(t.txt), t.x, t.y, t.size, t.c, 'center'); }
    c.globalAlpha = 1;
  }

  function drawHud() {
    const p = G.p, W = G.W;
    // 경험치 바
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 0, W, 5);
    c.fillStyle = '#c6ff4d'; c.fillRect(0, 0, W * (p.xp / p.xpNext), 5);
    txt(G.score.toLocaleString(), 12, 22, 20, '#fff');
    txt(`LV ${p.level}   STAGE ${G.stage + 1}${G.loop ? '-' + (G.loop + 1) : ''}`, 12, 42, 11, '#c6ff4d', 'left', FB);
    for (let i = 0; i < p.hpMax; i++) {
      c.save(); c.translate(W - 20 - i * 16, 21);
      c.globalAlpha = i < p.hp ? 1 : 0.22; Art.heart(c, G.time, 1); c.restore();
    }
    for (let i = 0; i < p.shieldMax; i++) {
      c.strokeStyle = i < p.shield ? '#5ef2ff' : 'rgba(94,242,255,0.25)'; c.lineWidth = 2;
      c.beginPath(); c.arc(W - 20 - (p.hpMax + i) * 16, 21, 6, 0, Math.PI * 2); c.stroke();
    }
    if (G.combo >= 5) {
      const s = 14 + Math.min(10, G.combo / 10);
      txt(`${G.combo} COMBO`, W - 12, 46, s, G.combo >= 50 ? '#ff8c42' : '#ffd23f', 'right');
      txt(`점수 x${mult().toFixed(2)}`, W - 12, 46 + s * 0.9, 10, 'rgba(255,255,255,0.7)', 'right', FB);
    }
    const B = G.boss;
    if (B) {
      const y = 70;
      txt(B.def.name, W / 2, y, 13, '#fff', 'center', FB);
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(20, y + 10, W - 40, 7);
      const k = Math.max(0, B.hp / B.maxHp);
      c.fillStyle = k < 0.5 ? '#ff2d55' : '#ffd23f'; c.fillRect(20, y + 10, (W - 40) * k, 7);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(W / 2, y + 9, 1, 9);
    }
  }
  function drawOverlays() {
    const W = G.W, H = G.H;
    if (G.phase === 'warn') {
      const a = 0.5 + 0.5 * Math.sin(G.time * 10);
      c.fillStyle = `rgba(255,45,85,${0.12 * a})`; c.fillRect(0, 0, W, H);
      c.fillStyle = `rgba(255,45,85,${0.7 * a})`; c.fillRect(0, H * 0.4 - 26, W, 3); c.fillRect(0, H * 0.4 + 26, W, 3);
      txt('WARNING', W / 2, H * 0.4 - 4, 40, `rgba(255,80,110,${0.6 + 0.4 * a})`, 'center');
      txt(`거대 해충 ${BOSSES[STAGES[G.stage].boss].name} 접근 중`, W / 2, H * 0.4 + 46, 13, '#fff', 'center', FB);
    }
    if (G.banner) {
      const t = G.banner.t, a = t < 0.4 ? t / 0.4 : t > 2.4 ? Math.max(0, (3 - t) / 0.6) : 1;
      c.globalAlpha = a;
      const y = H * 0.36, slide = (1 - Math.min(1, t / 0.4)) * 40;
      c.fillStyle = 'rgba(5,3,15,0.55)'; c.fillRect(0, y - 46, W, 96);
      txt(G.banner.label, W / 2 - slide, y - 24, 13, '#c6ff4d', 'center', FB);
      txt(G.banner.title, W / 2 + slide, y + 6, 34, '#fff', 'center');
      txt(G.banner.sub, W / 2, y + 34, G.banner.newBug ? 13 : 11, G.banner.newBug ? '#ffd23f' : 'rgba(255,255,255,0.6)', 'center', FB);
      c.globalAlpha = 1;
    }
    if (G.phase === 'cleared' && G.clearT < 3.8) {
      const a = Math.min(1, (3.8 - G.clearT) * 2);
      c.globalAlpha = a;
      const last = G.stage === STAGES.length - 1;
      txt(last ? '은하 방역 완료!' : 'STAGE CLEAR!', W / 2, H * 0.4, 36, '#ffd23f', 'center');
      txt(last ? '해충들이 더 강해져서 돌아온다…' : STAGES[G.stage].boss ? '체력 +1 회복' : `다음: STAGE ${G.stage + 2}`, W / 2, H * 0.4 + 34, 13, '#fff', 'center', FB);
      c.globalAlpha = 1;
    }
    if (G.tutorial > 0 && G.state === 'play') {
      c.globalAlpha = Math.min(1, G.tutorial);
      txt('화면 어디든 드래그해서 이동 · 사격은 자동', W / 2, H - 70, 13, '#fff', 'center', FB);
      txt('적 탄을 아슬아슬하게 스치면 보너스 점수!', W / 2, H - 50, 11, '#c6ff4d', 'center', FB);
      c.globalAlpha = 1;
    }
    if (G.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(0.7, G.flash)})`; c.fillRect(0, 0, W, H); }
  }

  R.draw = function () {
    const s = R.scale * dpr;
    c.setTransform(s, 0, 0, s, 0, 0);
    if (G.shake > 0) c.translate(rand(-1, 1) * G.shake * 0.5, rand(-1, 1) * G.shake * 0.5);
    drawBg();
    if (!G.p || G.state === 'title') return;
    drawItems();
    for (const e of G.enemies) drawEnemy(e);
    if (G.boss) drawBoss(G.boss);
    drawBullets();
    drawPlayer();
    drawParts();
    drawHud();
    drawOverlays();
  };
  return R;
})();
