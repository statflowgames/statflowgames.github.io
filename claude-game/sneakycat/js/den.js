// 비밀 아지트: 훔친 물건을 모아 둔 고양이의 방. 쓰다듬기·간식·놀아 주기 — 벌칙 없이 반응만 좋아진다.
// 배경 그림(img/den-bg.webp)이 있으면 그걸, 없으면 코드로 방을 그린다.
import { IMG, sprite } from './assets.js?v=1117102242';
import { Sound } from './audio.js?v=1117102242';
import { FONT } from './render.js?v=1117102242';

const OUT = '#2a1f2e';
const rnd = (a, b) => a + Math.random() * (b - a);

// opts: { skin, wear, shelf: [{ img, n }], golden, onPet }
export function startDen(cv, opts) {
  const c = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, alive = true, last = performance.now(), t = 0;
  const resize = () => {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(cv);

  const floorY = () => H * 0.93;
  const cat = { x: 0.45, face: 1, state: 'idle', timer: 1.5, tx: 0.45, walkT: 0, pose: 'sprite-cat', bounce: 0, sq: 0 };
  const fx = [];
  let treat = null, ball = null, plays = 0;

  const go = (x, run = false) => { cat.tx = Math.max(0.12, Math.min(0.88, x)); cat.state = run ? 'run' : 'walk'; cat.face = cat.tx > cat.x ? 1 : -1; };
  const word = (txt, x, y, col, size = 16, life = 1.3, vy = -28) => fx.push({ txt, x, y, col, size, life, t: 0, vy });

  function pet() {
    if (cat.state === 'eat') return;
    cat.state = 'pet'; cat.timer = 1.6; cat.pose = 'sprite-cat-happy-pet'; cat.sq = 0.25;
    for (let i = 0; i < 4; i++) setTimeout(() => alive && word('♥', cat.x * W + rnd(-30, 30), floorY() - H * 0.34, i % 2 ? '#ff8fc0' : '#ff5fa2', rnd(14, 22)), i * 160);
    word('골골~', cat.x * W + cat.face * 40, floorY() - H * 0.42, '#fffbe8', 15);
    Sound.play('purr');
    opts.onPet && opts.onPet();
  }
  function snack() {
    if (treat || cat.state === 'eat') return false;
    treat = { x: rnd(0.18, 0.82), y: -0.1, vy: 0, land: false };
    return true;
  }
  function play() {
    if (ball || cat.state === 'eat') return false;
    ball = { x: cat.x < 0.5 ? 0.92 : 0.08, vx: 0, tx: rnd(0.2, 0.8), spin: 0 };
    plays = 3;
    return true;
  }

  function update(dt) {
    t += dt;
    cat.sq = Math.max(0, cat.sq - dt * 1.5);
    // 간식이 떨어지면 달려간다
    if (treat) {
      if (!treat.land) { treat.vy += 2.4 * dt; treat.y += treat.vy * dt; if (treat.y >= 0.9) { treat.y = 0.9; treat.land = true; Sound.play('coin'); Sound.play('chirp'); go(treat.x, true); } }
    }
    if (ball) {
      const d = ball.tx - ball.x;
      ball.x += Math.sign(d) * Math.min(Math.abs(d), 0.55 * dt); ball.spin += d * dt * 30;
      if (Math.abs(d) < 0.01 && cat.state !== 'run' && cat.state !== 'pounce') go(ball.x, true);
    }
    switch (cat.state) {
      case 'idle':
        cat.pose = 'sprite-cat';
        if ((cat.timer -= dt) <= 0) {
          const r = Math.random();
          if (r < 0.45) go(rnd(0.15, 0.85));
          else if (r < 0.62) { cat.state = 'pose'; cat.pose = 'sprite-cat-yawn'; cat.timer = 1.6; word('하암~', cat.x * W + cat.face * 40, floorY() - H * 0.4, '#fffbe8', 14); }
          else if (r < 0.8) { cat.state = 'pose'; cat.pose = 'sprite-cat-groom'; cat.timer = 2.2; }
          else { go(0.17); cat.loaf = true; }
        }
        break;
      case 'walk': case 'run': {
        const sp = (cat.state === 'run' ? 0.42 : 0.13) * dt, d = cat.tx - cat.x;
        cat.pose = cat.state === 'run' && IMG['sprite-cat-run'] ? 'sprite-cat-run' : 'sprite-cat';
        cat.walkT += dt * (cat.state === 'run' ? 2.6 : 1.6);
        if (Math.abs(d) <= sp) {
          cat.x = cat.tx; cat.sq = 0.15;
          if (treat && treat.land && Math.abs(treat.x - cat.x) < 0.05) { treat = null; cat.state = 'eat'; cat.timer = 1.6; cat.pose = 'sprite-cat-fish'; Sound.play('yum'); word('♪', cat.x * W - 20, floorY() - H * 0.38, '#ff9fd0'); word('냠냠', cat.x * W + cat.face * 40, floorY() - H * 0.4, '#ffd27a', 15); }
          else if (ball && Math.abs(ball.x - cat.x) < 0.06) { cat.state = 'pounce'; cat.timer = 0.55; cat.pose = 'sprite-cat-crouch'; Sound.play('chirp'); }
          else if (cat.loaf) { cat.loaf = false; cat.state = 'pose'; cat.pose = 'sprite-cat-loaf'; cat.timer = rnd(5, 8); }
          else { cat.state = 'idle'; cat.timer = rnd(1.5, 3.5); }
        } else { cat.x += Math.sign(d) * sp; cat.face = Math.sign(d); }
        break;
      }
      case 'pounce':
        if ((cat.timer -= dt) <= 0) {
          cat.state = 'hop'; cat.timer = 0.45; cat.pose = 'sprite-cat-run'; Sound.play('hide'); if (plays > 1) { Sound.play('trill'); word('♪', cat.x * W - cat.face * 30, floorY() - H * 0.4, '#ff9fd0', 18); }
          if (ball) { plays--; if (plays > 0) ball.tx = Math.max(0.1, Math.min(0.9, ball.x + (Math.random() < 0.5 ? -1 : 1) * rnd(0.25, 0.45))); else { ball.tx = ball.x < 0.5 ? -0.2 : 1.2; word('재밌다!', cat.x * W, floorY() - H * 0.42, '#9dffb0', 15); Sound.play('happy'); for (let i = 0; i < 3; i++) setTimeout(() => alive && word('♥', cat.x * W + rnd(-30, 30), floorY() - H * 0.34, '#ff8fc0', rnd(14, 20)), 200 + i * 150); } }
        }
        break;
      case 'hop':
        cat.bounce = Math.sin(((0.45 - cat.timer) / 0.45) * Math.PI) * H * 0.12;
        if ((cat.timer -= dt) <= 0) {
          cat.bounce = 0; cat.sq = 0.2;
          if (ball && (ball.tx < 0 || ball.tx > 1)) { cat.state = 'idle'; cat.timer = 2; setTimeout(() => { ball = null; }, 1500); }
          else { cat.state = 'idle'; cat.timer = 0.2; }
        }
        break;
      case 'pose': case 'eat': case 'pet':
        if ((cat.timer -= dt) <= 0) {
          // 다 먹으면 "르릅—냐앙♪" 하고 하트
          if (cat.state === 'eat') { Sound.play('happy'); word('맛있다!', cat.x * W, floorY() - H * 0.42, '#ffd27a', 15); for (let i = 0; i < 3; i++) setTimeout(() => alive && word('♥', cat.x * W + rnd(-30, 30), floorY() - H * 0.34, '#ff8fc0', rnd(14, 20)), 200 + i * 150); }
          cat.state = 'idle'; cat.timer = rnd(1.5, 3);
        }
        break;
    }
    if (ball && (ball.x < -0.15 || ball.x > 1.15)) ball = null;
    for (const f of fx) { f.t += dt; f.y += f.vy * dt; }
    for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > fx[i].life) fx.splice(i, 1);
  }

  // ───── 그리기 ─────
  function room() {
    const fy = H * 0.68;
    if (IMG['den-bg']) {
      const im = IMG['den-bg'], k = Math.max(W / im.width, H / im.height);
      c.drawImage(im, (W - im.width * k) / 2, (H - im.height * k) / 2, im.width * k, im.height * k);
    } else {
      // 벽: 짙은 보라 줄무늬 벽지
      c.fillStyle = '#2f2650'; c.fillRect(0, 0, W, fy);
      c.fillStyle = 'rgba(255,255,255,0.035)';
      for (let x = 0; x < W; x += 28) c.fillRect(x, 0, 12, fy);
      c.fillStyle = '#241d3b'; c.fillRect(0, fy - 8, W, 10);
      // 바닥: 나무 마루
      c.fillStyle = '#6b4a3a'; c.fillRect(0, fy, W, H - fy);
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2;
      for (let y = fy + 16; y < H; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      // 동그란 창문 + 달
      const wx = W * 0.8, wy = H * 0.25, wr = Math.min(W, H) * 0.15;
      c.beginPath(); c.arc(wx, wy, wr, 0, 7); c.fillStyle = '#1b2350'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#8a5a3c'; c.stroke();
      c.save(); c.beginPath(); c.arc(wx, wy, wr - 3, 0, 7); c.clip();
      c.fillStyle = '#fff2b0'; c.beginPath(); c.arc(wx + wr * 0.3, wy - wr * 0.25, wr * 0.32, 0, 7); c.fill();
      c.fillStyle = '#1b2350'; c.beginPath(); c.arc(wx + wr * 0.42, wy - wr * 0.33, wr * 0.28, 0, 7); c.fill();
      c.fillStyle = '#fffbe8';
      for (let i = 0; i < 6; i++) { const a = (i * 2.4) % 6.28, rr = wr * (0.3 + (i % 3) * 0.2), tw = 0.5 + 0.5 * Math.sin(t * 2 + i); c.globalAlpha = tw; c.fillRect(wx + Math.cos(a) * rr - wr * 0.3, wy + Math.sin(a) * rr * 0.6 + wr * 0.2, 2.5, 2.5); }
      c.globalAlpha = 1; c.restore();
      c.beginPath(); c.moveTo(wx - wr, wy); c.lineTo(wx + wr, wy); c.moveTo(wx, wy - wr); c.lineTo(wx, wy + wr); c.lineWidth = 4; c.strokeStyle = '#8a5a3c'; c.stroke();
      // 둥근 러그
      c.beginPath(); c.ellipse(W * 0.5, H * 0.86, W * 0.3, H * 0.08, 0, 0, 7); c.fillStyle = '#4b3f72'; c.fill();
      c.beginPath(); c.ellipse(W * 0.5, H * 0.86, W * 0.24, H * 0.055, 0, 0, 7); c.strokeStyle = '#ff8fc0'; c.lineWidth = 3; c.stroke();
      // 방석 (식빵 자리)
      c.beginPath(); c.ellipse(W * 0.17, H * 0.92, W * 0.12, H * 0.05, 0, 0, 7); c.fillStyle = '#ff8fc0'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
      // 종이 상자
      const bx = W * 0.88, by = H * 0.74, bw = W * 0.13, bh = H * 0.15;
      c.fillStyle = '#c98a4b'; c.fillRect(bx - bw / 2, by, bw, bh); c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(bx - bw / 2, by, bw, bh);
      c.beginPath(); c.moveTo(bx - bw / 2, by); c.lineTo(bx - bw * 0.7, by - bh * 0.25); c.lineTo(bx - bw * 0.1, by - bh * 0.2); c.closePath(); c.fillStyle = '#b4773c'; c.fill(); c.stroke();
    }
    // 선반 + 훔친 물건
    const sx0 = W * 0.05, sx1 = W * 0.6, sy = H * 0.4;
    c.fillStyle = '#8a5a3c'; c.fillRect(sx0, sy, sx1 - sx0, 8); c.strokeStyle = OUT; c.lineWidth = 2.5; c.strokeRect(sx0, sy, sx1 - sx0, 8);
    c.fillRect(sx0 + 10, sy + 8, 6, 12); c.fillRect(sx1 - 16, sy + 8, 6, 12);
    const n = opts.shelf.length, gap = (sx1 - sx0) / n, sz = Math.min(gap * 0.9, H * 0.13);
    opts.shelf.forEach((s, i) => {
      const x = sx0 + gap * (i + 0.5), bob = Math.sin(t * 1.5 + i) * 1.2;
      if (s.n > 0 && s.img) c.drawImage(s.img, x - sz / 2, sy - sz + bob, sz, sz);
      else { c.globalAlpha = 0.35; c.beginPath(); c.arc(x, sy - sz * 0.4, sz * 0.28, 0, 7); c.strokeStyle = '#b8acd6'; c.setLineDash([3, 3]); c.lineWidth = 1.5; c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
    });
    // 엔딩을 봤으면 진짜 황금 생선을 받침대 위에
    if (opts.golden && IMG['item-fish-gold']) {
      const px = W * 0.66, py = H * 0.62;
      c.fillStyle = '#ffd34d'; c.fillRect(px - 22, py, 44, H * 0.06); c.strokeStyle = OUT; c.lineWidth = 2.5; c.strokeRect(px - 22, py, 44, H * 0.06);
      c.save(); c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3); c.fillStyle = '#fff2a8'; c.beginPath(); c.arc(px, py - 18, 26, 0, 7); c.fill(); c.restore();
      c.drawImage(IMG['item-fish-gold'], px - 26, py - 44 + Math.sin(t * 2) * 2, 52, 52);
    }
  }

  function drawCat() {
    let name = cat.pose === 'sprite-cat-happy-pet' ? 'sprite-cat' : cat.pose;
    if (!IMG[name]) name = 'sprite-cat';
    const s = sprite(name, opts.skin, false, opts.wear);
    if (!s) return;
    const width = W * (name === 'sprite-cat-loaf' || name === 'sprite-cat-crouch' || name === 'sprite-cat-run' ? 0.26 : 0.21);
    const k = width / s.bw, moving = cat.state === 'walk' || cat.state === 'run';
    const bob = moving ? -Math.abs(Math.sin(cat.walkT * Math.PI)) * H * 0.02 : 0;
    const breathe = moving ? 1 : 1 + Math.sin(t * 2.4) * 0.02;
    const x = cat.x * W, y = (cat.loafSpot ? floorY() : floorY()) - cat.bounce + bob;
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, floorY(), width * 0.36, H * 0.02, 0, 0, 7); c.fill();
    c.save();
    c.translate(x, y);
    if (moving) c.rotate(Math.sin(cat.walkT * Math.PI) * 0.05);
    if (cat.state === 'pet') c.rotate(Math.sin(t * 10) * 0.04);
    const sq = cat.sq;
    c.scale(cat.face * k * (1 + sq * 0.4), k * breathe * (1 - sq * 0.3));
    c.imageSmoothingQuality = 'high';
    c.drawImage(s.cv, s.ox, s.oy, s.ow, s.oh, -s.bw / 2 + (s.ox - s.bx), -s.bh + (s.oy - s.by), s.ow, s.oh);
    c.restore();
  }

  function draw() {
    if (W < 40 || H < 40) return; // 화면이 아직 자리를 못 잡았으면 그리지 않는다 (반지름이 음수가 되어 멈추는 것 방지)
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    room();
    if (treat) {
      const x = treat.x * W, y = treat.y * H;
      if (IMG['item-fish']) c.drawImage(IMG['item-fish'], x - 18, y - 30, 36, 36);
      else { c.fillStyle = '#7fc8ff'; c.beginPath(); c.ellipse(x, y - 10, 14, 7, 0, 0, 7); c.fill(); }
    }
    if (ball) {
      const x = ball.x * W, y = floorY() - 12, r = 12;
      if (IMG['item-yarn']) { c.save(); c.translate(x, y); c.rotate(ball.spin); c.drawImage(IMG['item-yarn'], -r * 1.5, -r * 1.5, r * 3, r * 3); c.restore(); }
      else { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#ff8fc0'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); }
    }
    drawCat();
    c.textAlign = 'center'; c.lineJoin = 'round';
    for (const f of fx) {
      c.globalAlpha = Math.max(0, 1 - f.t / f.life);
      c.font = `${f.size}px ${FONT}`; c.lineWidth = 3; c.strokeStyle = '#1a1428'; c.strokeText(f.txt, f.x, f.y); c.fillStyle = f.col; c.fillText(f.txt, f.x, f.y);
    }
    c.globalAlpha = 1;
  }

  function frame(now) {
    if (!alive) return;
    if (!cv.isConnected) { stop(); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (W > 0) { update(dt); draw(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    if (Math.abs(px - cat.x) < 0.13 && py > 0.55) pet();
    else if (py > 0.66 && cat.state !== 'eat' && cat.state !== 'pounce' && cat.state !== 'hop') go(px);
  });
  function stop() { alive = false; ro.disconnect(); }
  // step: 테스트용으로 시간을 직접 넘긴다
  return { stop, snack, play, pet, step: (dt) => { update(dt); draw(); }, cat };
}
