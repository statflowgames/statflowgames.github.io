// 비밀 아지트: 훔친 물건을 모아 둔 고양이의 방. 쓰다듬기·간식·놀아 주기 — 벌칙 없이 반응만 좋아진다.
// 배경 그림(img/den-bg.webp)이 있으면 그걸, 없으면 코드로 방을 그린다.
import { IMG, sprite } from './assets.js?v=1118013716';
import { Sound } from './audio.js?v=1118013716';
import { FONT } from './render.js?v=1118013716';
import { tr, fontStack } from './i18n.js?v=1118013716';

const OUT = '#2a1f2e';
const rnd = (a, b) => a + Math.random() * (b - a);

// opts: { skin, wear, shelf: [{ img, n }], golden, onPet, mood: 'happy'|'ok'|'sad'|'missed', deco: 0~5 }
// mood: 애정도에 따른 기분 — 시무룩하면 구석에서 식빵, 오래 못 보면 '보고 싶었어…'. 벌칙은 없고 표정·행동만 바뀐다.
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
  let treat = null, ball = null, plays = 0, sulkT = 2, lickT = 0;
  let mood = opts.mood || 'ok', deco = opts.deco || 0;
  // 식빵 자리: 배경 그림의 분홍 방석 위
  const SPOT = IMG['den-bg'] ? 0.13 : 0.17;
  const sulkPose = () => (IMG['sprite-cat-sad'] ? 'sprite-cat-sad' : 'sprite-cat-loaf');
  if (mood === 'missed') { cat.x = SPOT; cat.tx = SPOT; cat.face = -1; cat.state = 'pose'; cat.pose = sulkPose(); cat.timer = 6; }

  const go = (x, run = false) => { cat.tx = Math.max(0.12, Math.min(0.88, x)); cat.state = run ? 'run' : 'walk'; cat.face = cat.tx > cat.x ? 1 : -1; };
  const word = (txt, x, y, col, size = 16, life = 1.3, vy = -28) => fx.push({ txt, x, y, col, size, life, t: 0, vy });

  function pet() {
    if (cat.state === 'eat') return;
    cat.state = 'pet'; cat.timer = 1.6; cat.pose = 'sprite-cat-happy-pet'; cat.sq = 0.25;
    for (let i = 0; i < 4; i++) setTimeout(() => alive && word('♥', cat.x * W + rnd(-30, 30), floorY() - H * 0.34, i % 2 ? '#ff8fc0' : '#ff5fa2', rnd(14, 22)), i * 160);
    word(tr('골골~'), cat.x * W + cat.face * 40, floorY() - H * 0.42, '#fffbe8', 15);
    Sound.play('purr');
    opts.onPet && opts.onPet();
  }
  // 오랜만에 돌봐 주면: 반가워!
  function cheer() {
    cat.state = 'pet'; cat.timer = 2.2; cat.pose = 'sprite-cat-happy-pet'; cat.sq = 0.3; cat.loaf = false;
    for (let i = 0; i < 8; i++) setTimeout(() => alive && word('♥', cat.x * W + rnd(-45, 45), floorY() - H * rnd(0.3, 0.45), i % 2 ? '#ff8fc0' : '#ff5fa2', rnd(16, 26)), i * 120);
    word(tr('반가워!'), cat.x * W, floorY() - H * 0.5, '#ffd27a', 18, 1.8);
    Sound.play('happy');
  }
  function gift() {
    if (IMG['item-gift']) fx.push({ img: IMG['item-gift'], x: cat.x * W, y: floorY() - H * 0.3, size: W * 0.12, life: 1.8, t: 0, vy: -30 });
    else word('🎁', cat.x * W, floorY() - H * 0.42, '#fff', 26, 1.6);
    word(tr('선물이야!'), cat.x * W, floorY() - H * 0.52, '#ffd27a', 16, 1.8);
    Sound.play('coin');
  }
  // 📺 특별 간식: 짜 먹는 간식을 츄릅츄릅
  function special() {
    if (treat || ball || cat.state === 'eat' || cat.state === 'lick' || cat.state === 'pounce' || cat.state === 'hop') return false;
    cat.state = 'lick'; cat.timer = 3; cat.pose = IMG['sprite-cat-lick'] ? 'sprite-cat-lick' : 'sprite-cat'; cat.loaf = false; lickT = 0.3; cat.sq = 0.2; // '츄릅' 글자가 뜰 때마다 slurp
    return true;
  }
  function snack() {
    if (treat || cat.state === 'eat') return false;
    treat = { x: rnd(0.18, 0.82), y: -0.1, vy: 0, land: false };
    return true;
  }
  function play() {
    if (ball || cat.state === 'eat') return false;
    ball = { x: cat.x < 0.5 ? 0.92 : 0.08, vx: 0, tx: rnd(0.2, 0.8), spin: 0 };
    plays = 3; Sound.play('roll');
    return true;
  }

  function update(dt) {
    t += dt;
    if ((mood === 'missed' || mood === 'sad') && cat.state !== 'eat' && cat.state !== 'pet' && (sulkT -= dt) <= 0) {
      sulkT = mood === 'missed' ? 3.5 : rnd(7, 10);
      word(tr(mood === 'missed' ? '보고 싶었어…' : '심심해…'), cat.x * W + cat.face * 30, floorY() - H * 0.38, '#b8d4ff', 14, 1.8, -16);
    }
    cat.sq = Math.max(0, cat.sq - dt * 1.5);
    // 간식이 떨어지면 달려간다
    if (treat) {
      if (!treat.land) { treat.vy += 2.4 * dt; treat.y += treat.vy * dt; if (treat.y >= 0.9) { treat.y = 0.9; treat.land = true; Sound.play('plop'); go(treat.x, true); } }
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
          // 시무룩하면 구석 방석에서 식빵 굽기, 오래 못 봤으면 계속 구석에
          if (mood === 'missed' || (mood === 'sad' && r < 0.5)) { go(SPOT); cat.loaf = true; break; }
          if (r < 0.45) go(rnd(0.15, 0.85));
          else if (r < 0.62) { cat.state = 'pose'; cat.pose = 'sprite-cat-yawn'; cat.timer = 1.6; word(tr('하암~'), cat.x * W + cat.face * 40, floorY() - H * 0.4, '#fffbe8', 14); }
          else if (r < 0.8) { cat.state = 'pose'; cat.pose = 'sprite-cat-groom'; cat.timer = 2.2; }
          else { go(SPOT); cat.loaf = true; }
        }
        break;
      case 'walk': case 'run': {
        const sp = (cat.state === 'run' ? 0.42 : 0.13) * dt, d = cat.tx - cat.x;
        cat.pose = cat.state === 'run' && IMG['sprite-cat-run'] ? 'sprite-cat-run' : 'sprite-cat';
        cat.walkT += dt * (cat.state === 'run' ? 2.6 : 1.6);
        if (Math.abs(d) <= sp) {
          cat.x = cat.tx; cat.sq = 0.15;
          if (treat && treat.land && Math.abs(treat.x - cat.x) < 0.05) { treat = null; cat.state = 'eat'; cat.timer = 1.6; cat.pose = 'sprite-cat-fish'; Sound.play('munch'); word('♪', cat.x * W - 20, floorY() - H * 0.38, '#ff9fd0'); word(tr('냠냠'), cat.x * W + cat.face * 40, floorY() - H * 0.4, '#ffd27a', 15); }
          else if (ball && Math.abs(ball.x - cat.x) < 0.06) { cat.state = 'pounce'; cat.timer = 0.55; cat.pose = 'sprite-cat-crouch'; Sound.play('chirp'); }
          else if (cat.loaf) { cat.loaf = false; cat.state = 'pose'; cat.pose = mood === 'missed' || mood === 'sad' ? sulkPose() : 'sprite-cat-loaf'; cat.timer = rnd(5, 8); }
          else { cat.state = 'idle'; cat.timer = rnd(1.5, 3.5); }
        } else { cat.x += Math.sign(d) * sp; cat.face = Math.sign(d); }
        break;
      }
      case 'pounce':
        if ((cat.timer -= dt) <= 0) {
          cat.state = 'hop'; cat.timer = 0.45; cat.pose = 'sprite-cat-run'; Sound.play('hide'); if (plays > 1) { Sound.play('trill'); word('♪', cat.x * W - cat.face * 30, floorY() - H * 0.4, '#ff9fd0', 18); }
          if (ball) { plays--; if (plays > 0) ball.tx = Math.max(0.1, Math.min(0.9, ball.x + (Math.random() < 0.5 ? -1 : 1) * rnd(0.25, 0.45))); else { ball.tx = ball.x < 0.5 ? -0.2 : 1.2; word(tr('재밌다!'), cat.x * W, floorY() - H * 0.42, '#9dffb0', 15); Sound.play('giggle'); for (let i = 0; i < 3; i++) setTimeout(() => alive && word('♥', cat.x * W + rnd(-30, 30), floorY() - H * 0.34, '#ff8fc0', rnd(14, 20)), 200 + i * 150); } }
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
      case 'lick':
        if ((lickT -= dt) <= 0) { lickT = 0.6; cat.sq = 0.12; Sound.play('slurp'); word(tr('츄릅'), cat.x * W + cat.face * 52, floorY() - H * 0.36 - rnd(0, 12), '#ffb3d9', 15, 1, -24); }
        if ((cat.timer -= dt) <= 0) {
          cat.state = 'pet'; cat.timer = 1.6; cat.pose = 'sprite-cat-happy-pet'; cat.sq = 0.3;
          word(tr('최고야!'), cat.x * W, floorY() - H * 0.5, '#ffd27a', 18, 1.8); Sound.play('happy');
          for (let i = 0; i < 8; i++) setTimeout(() => alive && word('♥', cat.x * W + rnd(-45, 45), floorY() - H * rnd(0.3, 0.45), i % 2 ? '#ff8fc0' : '#ff5fa2', rnd(16, 26)), i * 110);
        }
        break;
      case 'pose': case 'eat': case 'pet':
        if ((cat.timer -= dt) <= 0) {
          // 다 먹으면 "냐아~" 하고 하트
          if (cat.state === 'eat') { Sound.play('mmm'); word(tr('맛있다!'), cat.x * W, floorY() - H * 0.42, '#ffd27a', 15); for (let i = 0; i < 3; i++) setTimeout(() => alive && word('♥', cat.x * W + rnd(-30, 30), floorY() - H * 0.34, '#ff8fc0', rnd(14, 20)), 200 + i * 150); }
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
    drawDeco();
    // 엔딩을 봤으면 진짜 황금 생선을 받침대 위에
    if (opts.golden && IMG['item-fish-gold']) {
      const px = W * 0.66, py = H * 0.62;
      c.fillStyle = '#ffd34d'; c.fillRect(px - 22, py, 44, H * 0.06); c.strokeStyle = OUT; c.lineWidth = 2.5; c.strokeRect(px - 22, py, 44, H * 0.06);
      c.save(); c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3); c.fillStyle = '#fff2a8'; c.beginPath(); c.arc(px, py - 18, 26, 0, 7); c.fill(); c.restore();
      c.drawImage(IMG['item-fish-gold'], px - 26, py - 44 + Math.sin(t * 2) * 2, 52, 52);
    }
  }

  // 애정도 하트 단계마다 하나씩 생기는 장식 (한 번 생기면 사라지지 않음)
  function drawDeco() {
    // 그림 장식 (cx, cy 는 가운데, w 는 너비 — 모두 화면 비율)
    const pic = (name, cx, cy, w) => { const im = IMG[name]; if (!im) return false; const h = (w * W * im.naturalHeight) / im.naturalWidth; c.drawImage(im, cx * W - (w * W) / 2, cy * H - h / 2, w * W, h); return true; };
    if (IMG['deco-pot'] || IMG['deco-lights']) {
      if (deco >= 4 && IMG['deco-lights']) {
        const im = IMG['deco-lights'], w = W * 0.62, h = (w * im.naturalHeight) / im.naturalWidth;
        c.save(); c.globalAlpha = 0.85 + 0.15 * Math.sin(t * 3); c.drawImage(im, W * 0.01, H * 0.075, w, h); c.restore();
      }
      if (deco >= 3) pic('deco-frame', 0.3, 0.535, 0.12);
      if (deco >= 1) pic('deco-pot', 0.06, 0.72, 0.11);
      if (deco >= 2) pic('deco-basket', 0.7, 0.72, 0.12);
      if (deco >= 5) pic('deco-cushion', 0.5, 0.84, 0.22);
      return;
    }
    c.lineWidth = 2.5; c.strokeStyle = OUT; c.lineJoin = 'round';
    if (deco >= 4) { // 반짝이 전구 줄 (맨 위)
      c.beginPath(); c.moveTo(0, H * 0.09);
      c.quadraticCurveTo(W * 0.32, H * 0.17, W * 0.64, H * 0.09); c.strokeStyle = '#5a4a3a'; c.lineWidth = 2; c.stroke();
      const cols = ['#ffd34d', '#ff8fc0', '#8fe3ff', '#9dffb0'];
      for (let i = 0; i < 9; i++) {
        const u = (i + 0.5) / 9, x = W * 0.64 * u, y = (1 - u) * (1 - u) * H * 0.09 + 2 * (1 - u) * u * H * 0.17 + u * u * H * 0.09 + 6;
        const on = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7);
        c.globalAlpha = 0.35 * on; c.fillStyle = cols[i % 4]; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill();
        c.globalAlpha = 0.6 + 0.4 * on; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); c.globalAlpha = 1;
      }
      c.strokeStyle = OUT; c.lineWidth = 2.5;
    }
    if (deco >= 3) { // 고양이 액자 (벽)
      const fx0 = W * 0.44, fy0 = H * 0.16, fw = W * 0.14, fh = H * 0.13;
      c.fillStyle = '#c98a4b'; c.fillRect(fx0, fy0, fw, fh); c.strokeRect(fx0, fy0, fw, fh);
      c.fillStyle = '#fff1d6'; c.fillRect(fx0 + 5, fy0 + 5, fw - 10, fh - 10);
      const s = sprite('sprite-cat', opts.skin, false, null);
      if (s) { const k = Math.min((fw - 14) / s.bw, (fh - 12) / s.bh); c.drawImage(s.cv, s.bx, s.by, s.bw, s.bh, fx0 + fw / 2 - (s.bw * k) / 2, fy0 + fh - 6 - s.bh * k, s.bw * k, s.bh * k); }
    }
    if (deco >= 1) { // 고양이 풀 화분
      const px = W * 0.06, py = H * 0.8, pw = W * 0.07;
      c.fillStyle = '#7ad36b';
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(px + i * pw * 0.12, py - pw * 0.5); c.quadraticCurveTo(px + i * pw * 0.3 + Math.sin(t * 1.5 + i) * 2, py - pw * 1.3, px + i * pw * 0.45 + Math.sin(t * 1.5 + i) * 3, py - pw * (1.5 - Math.abs(i) * 0.2)); c.lineTo(px + i * pw * 0.12 + 3, py - pw * 0.5); c.fill(); }
      c.beginPath(); c.moveTo(px - pw / 2, py - pw * 0.55); c.lineTo(px + pw / 2, py - pw * 0.55); c.lineTo(px + pw * 0.36, py); c.lineTo(px - pw * 0.36, py); c.closePath(); c.fillStyle = '#d9774a'; c.fill(); c.stroke();
    }
    if (deco >= 2) { // 털실 바구니
      const bx = W * 0.72, by = H * 0.8, bw = W * 0.11;
      [['#ff8fc0', -0.22], ['#8fe3ff', 0.18], ['#ffd34d', 0]].forEach(([col, dx], i) => { c.beginPath(); c.arc(bx + dx * bw, by - bw * 0.42 - (i === 2 ? bw * 0.12 : 0), bw * 0.2, 0, 7); c.fillStyle = col; c.fill(); c.stroke(); });
      c.beginPath(); c.moveTo(bx - bw / 2, by - bw * 0.4); c.lineTo(bx + bw / 2, by - bw * 0.4); c.lineTo(bx + bw * 0.4, by); c.lineTo(bx - bw * 0.4, by); c.closePath(); c.fillStyle = '#b4773c'; c.fill(); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.5; for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(bx - bw * 0.46 + i * 0.03 * bw, by - bw * 0.4 + i * bw * 0.13); c.lineTo(bx + bw * 0.46 - i * 0.03 * bw, by - bw * 0.4 + i * bw * 0.13); c.stroke(); }
      c.strokeStyle = OUT; c.lineWidth = 2.5;
    }
    if (deco >= 5) { // 생선 쿠션 (러그 위)
      const cx = W * 0.5, cy = H * 0.86, cw = W * 0.2, ch = H * 0.05;
      c.beginPath(); c.ellipse(cx, cy, cw / 2, ch, 0, 0, 7); c.fillStyle = '#7fc8ff'; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(cx + cw / 2 - 4, cy); c.lineTo(cx + cw * 0.72, cy - ch * 0.9); c.lineTo(cx + cw * 0.72, cy + ch * 0.9); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = OUT; c.beginPath(); c.arc(cx - cw * 0.3, cy - ch * 0.15, 2.6, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(cx - cw * 0.05, cy, ch * 0.6, -1, 1); c.stroke(); c.beginPath(); c.arc(cx + cw * 0.12, cy, ch * 0.6, -1, 1); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 2.5;
    }
  }

  function drawCat() {
    let name = cat.pose;
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

  // 짜 먹는 간식 막대 — 입가에 대고, 먹을수록 줄어든다
  function drawTube() {
    const left = Math.max(0, cat.timer / 3), f = cat.face;
    const mx = cat.x * W + f * W * 0.085, my = floorY() - W * 0.12;
    c.save(); c.translate(mx, my); c.rotate(f * -0.55); c.scale(f, 1);
    const len = W * 0.11, wd = W * 0.028;
    c.lineWidth = 2.5; c.strokeStyle = OUT; c.lineJoin = 'round';
    // 막대 (뒤쪽은 손으로 짠 것처럼 납작)
    c.beginPath(); c.moveTo(4, -wd / 2); c.lineTo(len, -wd * 0.25 * (0.4 + left)); c.lineTo(len, wd * 0.25 * (0.4 + left)); c.lineTo(4, wd / 2); c.closePath();
    const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, '#ff9fc8'); g.addColorStop(1, '#ffe0ee');
    c.fillStyle = g; c.fill(); c.stroke();
    c.fillStyle = '#ffffff'; c.globalAlpha = 0.6; c.fillRect(len * 0.35, -wd * 0.3, len * 0.3, wd * 0.18); c.globalAlpha = 1;
    // 입가의 간식 방울
    c.beginPath(); c.arc(2, 0, wd * (0.45 + 0.15 * Math.sin(t * 9)), 0, 7); c.fillStyle = '#ffcf8a'; c.fill(); c.lineWidth = 1.5; c.stroke();
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
    if (cat.state === 'lick' && !IMG['sprite-cat-lick']) drawTube();
    c.textAlign = 'center'; c.lineJoin = 'round';
    for (const f of fx) {
      c.globalAlpha = Math.max(0, 1 - f.t / f.life);
      if (f.img) { c.drawImage(f.img, f.x - f.size / 2, f.y - f.size / 2, f.size, f.size); continue; }
      // 번역이 길면 글자를 줄이고, 고양이가 가장자리에 있어도 화면 안에 들어오게
      c.font = `${f.size}px ${fontStack()}`;
      let tw = c.measureText(f.txt).width;
      if (tw > W - 16) { c.font = `${Math.max(9, Math.floor(f.size * (W - 16) / tw))}px ${fontStack()}`; tw = c.measureText(f.txt).width; }
      const fx0 = Math.min(W - tw / 2 - 6, Math.max(tw / 2 + 6, f.x));
      c.lineWidth = 3; c.strokeStyle = '#1a1428'; c.strokeText(f.txt, fx0, f.y); c.fillStyle = f.col; c.fillText(f.txt, fx0, f.y);
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
  const setMood = (m) => { mood = m; sulkT = 2; };
  const setDeco = (n) => { deco = n; };
  return { stop, snack, play, pet, cheer, gift, special, setMood, setDeco, step: (dt) => { update(dt); draw(); }, cat, get mood() { return mood; } };
}
