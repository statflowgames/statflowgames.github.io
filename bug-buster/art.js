// 은하 방역대 - 캐릭터/몹 디자인 (모두 코드로 그림, 머리는 아래(+y)를 향함)
const Art = (() => {
  const TAU = Math.PI * 2;
  function ell(c, x, y, rx, ry, rot, fill) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); c.fillStyle = fill; c.fill(); }
  function line(c, pts, color, w) {
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }
  function wings(c, t, x, y, w, len, color, speed, alpha = 0.5) {
    const f = Math.sin(t * speed) * 0.5 + 0.5;
    c.save(); c.globalAlpha = alpha;
    for (const s of [-1, 1]) ell(c, s * (x + w * 0.6), y, w, len * (0.7 + 0.3 * f), s * (1.1 - f * 0.5), color);
    c.globalAlpha = alpha + 0.3; c.lineWidth = 0.6; c.strokeStyle = '#ffffff';
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * (x + w * 0.6), y, w, len * (0.7 + 0.3 * f), s * (1.1 - f * 0.5), 0, TAU); c.stroke(); }
    c.restore();
  }
  function legs(c, t, n, spanX, y0, y1, len, color, w, speed = 10) {
    for (let i = 0; i < n; i++) {
      const y = y0 + (y1 - y0) * (i / Math.max(1, n - 1)), sw = Math.sin(t * speed + i * 1.7) * 3;
      for (const s of [-1, 1]) line(c, [s * spanX, y, s * (spanX + len * 0.6), y - 3 + sw * s, s * (spanX + len), y + 4 + sw], color, w);
    }
  }
  function eyes(c, x, y, r, color) { ell(c, -x, y, r, r, 0, color); ell(c, x, y, r, r, 0, color); ell(c, -x + r * 0.3, y - r * 0.3, r * 0.35, r * 0.35, 0, '#fff'); ell(c, x + r * 0.3, y - r * 0.3, r * 0.35, r * 0.35, 0, '#fff'); }

  // 모기 '삐용이': 지그재그로 날아오는 기본 잡몹
  function mosquito(c, t) {
    legs(c, t, 3, 2, -2, 6, 12, '#7d3b45', 0.9, 6);
    wings(c, t, 3, -4, 5, 12, '#d6ecff', 55);
    ell(c, 0, -9, 3.2, 9, 0, '#b8324a');
    for (let i = 0; i < 3; i++) ell(c, 0, -14 + i * 4, 3.3, 0.9, 0, '#6e1a2a');
    ell(c, 0, 2, 4.5, 4.5, 0, '#7a2232');
    ell(c, 0, 8, 3, 3, 0, '#4a1420');
    eyes(c, 1.8, 9, 1.4, '#ff5d73');
    line(c, [0, 10, 0, 21], '#2a0c12', 1.3);
  }
  // 똥파리 '윙윙': 편대 비행
  function fly(c, t) {
    legs(c, t, 3, 5, -3, 5, 7, '#1d2b22', 1.2, 12);
    wings(c, t, 5, -6, 6, 10, '#c9f2ff', 60);
    const g = c.createRadialGradient(-3, -5, 1, 0, -2, 11);
    g.addColorStop(0, '#9dffb0'); g.addColorStop(0.5, '#1f9e5a'); g.addColorStop(1, '#0b3d26');
    ell(c, 0, -2, 8, 9.5, 0, g);
    ell(c, 0, 7, 6.5, 5, 0, '#14231a');
    ell(c, -4, 8, 3.6, 4, -0.3, '#e0283c'); ell(c, 4, 8, 3.6, 4, 0.3, '#e0283c');
    ell(c, -5, 7, 1.2, 1.2, 0, '#ffb3bd'); ell(c, 3, 7, 1.2, 1.2, 0, '#ffb3bd');
  }
  // 무당벌레 '점박이 탱크': 멈춰서 부채꼴 탄을 쏨
  function ladybug(c, t) {
    legs(c, t, 3, 9, -6, 6, 6, '#111', 1.6, 5);
    ell(c, 0, 12, 7, 5, 0, '#151515');
    eyes(c, 3.5, 13, 1.8, '#f5f5f5');
    ell(c, 0, 13.5, 1, 1, 0, '#111');
    const g = c.createRadialGradient(-4, -5, 2, 0, 0, 15);
    g.addColorStop(0, '#ff8a8a'); g.addColorStop(0.45, '#e63946'); g.addColorStop(1, '#8c1420');
    ell(c, 0, 0, 13, 14, 0, g);
    line(c, [0, -14, 0, 9], '#1a0508', 1.5);
    [[-6, -6, 3], [6, -6, 3], [-8, 3, 2.5], [8, 3, 2.5], [-3, 6, 2], [3, 6, 2], [0, -11, 2]].forEach(([x, y, r]) => ell(c, x, y, r, r, 0, '#1a0508'));
    c.globalAlpha = 0.35; ell(c, -5, -8, 4, 2.4, -0.6, '#fff'); c.globalAlpha = 1;
  }
  // 반딧불 '번쩍이': 빛나다가 플레이어에게 돌진
  function firefly(c, t, e) {
    const charge = e && e.dashing ? 1 : 0.5 + 0.5 * Math.sin(t * 8);
    const g = c.createRadialGradient(0, -8, 1, 0, -8, 18);
    g.addColorStop(0, `rgba(255,250,150,${0.8 * charge})`); g.addColorStop(1, 'rgba(255,220,60,0)');
    ell(c, 0, -8, 18, 18, 0, g);
    wings(c, t, 3, -2, 5, 10, '#fff7c2', 45, 0.4);
    ell(c, 0, -8, 5, 7, 0, `rgb(255,${200 + 55 * charge | 0},80)`);
    ell(c, 0, 1, 5, 5, 0, '#2d2340');
    ell(c, 0, 7, 3.5, 3, 0, '#e85d4a');
    eyes(c, 2, 8, 1.3, '#111');
    line(c, [-1.5, 9, -5, 16], '#2d2340', 1); line(c, [1.5, 9, 5, 16], '#2d2340', 1);
  }
  // 독거미 '실타래': 실에 매달려 내려와 원형 탄막
  function spider(c, t) {
    for (let i = 0; i < 4; i++) {
      const a = -0.9 + i * 0.55, sw = Math.sin(t * 7 + i) * 0.12;
      for (const s of [-1, 1]) {
        const ax = Math.cos(a + sw) * 9, ay = Math.sin(a + sw) * 9 + 4;
        line(c, [s * 3, 3, s * ax * 1.4, ay - 6, s * ax * 2, ay + 6], '#3c1f5e', 1.8);
      }
    }
    ell(c, 0, -6, 10, 11, 0, '#7b2cbf');
    c.fillStyle = '#ff3d68'; c.beginPath(); c.moveTo(-3, -11); c.lineTo(3, -11); c.lineTo(-3, -1); c.lineTo(3, -1); c.closePath(); c.fill();
    ell(c, 0, 6, 6.5, 6, 0, '#4a1a7a');
    [[-2.5, 9], [2.5, 9], [-1, 7], [1, 7]].forEach(([x, y], i) => ell(c, x, y, i < 2 ? 1.6 : 1, i < 2 ? 1.6 : 1, 0, '#ff2d55'));
    line(c, [-2, 12, -3, 15], '#ddd', 1.2); line(c, [2, 12, 3, 15], '#ddd', 1.2);
  }
  // 바퀴벌레 '쌩쌩이': 무리 지어 빠르게 돌진, 벽에 튕김
  function roach(c, t) {
    legs(c, t, 3, 5, -6, 6, 9, '#3a210f', 1.3, 22);
    const g = c.createLinearGradient(-7, 0, 7, 0);
    g.addColorStop(0, '#4a2810'); g.addColorStop(0.4, '#9a5a2a'); g.addColorStop(1, '#3a1e0a');
    ell(c, 0, -1, 7, 12, 0, g);
    line(c, [0, -12, 0, 6], '#2a1505', 0.8);
    ell(c, 0, 9, 5, 3.5, 0, '#5a3418');
    ell(c, 0, 12, 3.5, 2.5, 0, '#2a1505');
    const w = Math.sin(t * 9) * 4;
    c.beginPath(); c.moveTo(-1.5, 13); c.quadraticCurveTo(-6 + w, 20, -9 - w, 27); c.moveTo(1.5, 13); c.quadraticCurveTo(6 - w, 20, 9 + w, 27);
    c.strokeStyle = '#2a1505'; c.lineWidth = 0.9; c.stroke();
    c.globalAlpha = 0.3; ell(c, -2.5, -4, 1.6, 6, 0, '#fff'); c.globalAlpha = 1;
  }
  // 장수풍뎅이 '뿔돌이': 단단한 정예, 3연발 조준탄
  function beetle(c, t) {
    legs(c, t, 3, 9, -5, 7, 7, '#0d1a2b', 2, 4);
    const g = c.createLinearGradient(-12, -12, 12, 12);
    g.addColorStop(0, '#5ef2ff'); g.addColorStop(0.5, '#2a6bd6'); g.addColorStop(1, '#5a1fa8');
    ell(c, 0, -2, 12, 14, 0, g);
    line(c, [0, -16, 0, 10], '#0d1a2b', 1.4);
    ell(c, 0, 11, 8, 5, 0, '#132840');
    c.fillStyle = '#c9d6e8'; c.beginPath(); c.moveTo(-3, 13); c.lineTo(0, 26); c.lineTo(3, 13); c.fill();
    eyes(c, 5, 12, 1.5, '#ffd23f');
    c.globalAlpha = 0.4; ell(c, -5, -7, 3, 6, -0.4, '#fff'); c.globalAlpha = 1;
  }

  // ---------- 보스 ----------
  // STAGE 1 보스: 여왕벌 '비비 퀸'
  function queen(c, t) {
    wings(c, t, 14, -14, 16, 30, '#fff6d6', 30, 0.45);
    legs(c, t, 3, 12, 2, 16, 16, '#3b2a14', 2.4, 4);
    c.save(); c.beginPath(); c.ellipse(0, -22, 22, 30, 0, 0, TAU); c.clip();
    c.fillStyle = '#ffc93c'; c.fillRect(-25, -55, 50, 70);
    c.fillStyle = '#2b1d0e'; for (let i = 0; i < 4; i++) c.fillRect(-25, -46 + i * 12, 50, 5.5);
    c.restore();
    c.fillStyle = '#2b1d0e'; c.beginPath(); c.moveTo(-5, -50); c.lineTo(0, -64); c.lineTo(5, -50); c.fill();
    const g = c.createRadialGradient(0, 8, 2, 0, 8, 17);
    g.addColorStop(0, '#ffb347'); g.addColorStop(1, '#a8590e');
    ell(c, 0, 8, 17, 14, 0, g);
    ell(c, 0, 26, 13, 11, 0, '#3b2a14');
    ell(c, -7, 27, 5, 6.5, -0.3, '#ff3d5a'); ell(c, 7, 27, 5, 6.5, 0.3, '#ff3d5a');
    ell(c, -8, 25, 1.8, 1.8, 0, '#fff'); ell(c, 6, 25, 1.8, 1.8, 0, '#fff');
    c.fillStyle = '#ffe066'; c.beginPath();
    c.moveTo(-11, 18); c.lineTo(-11, 9); c.lineTo(-6, 14); c.lineTo(0, 6); c.lineTo(6, 14); c.lineTo(11, 9); c.lineTo(11, 18); c.closePath(); c.fill();
    ell(c, 0, 12, 2, 2, 0, '#ff3d5a');
  }
  // STAGE 2 보스: 왕거미 '타란툴라 마담'
  function tarantula(c, t) {
    for (let i = 0; i < 4; i++) {
      const a = -1.0 + i * 0.6, sw = Math.sin(t * 3 + i * 1.3) * 0.15;
      for (const s of [-1, 1]) {
        const k = Math.cos(a + sw), m = Math.sin(a + sw);
        line(c, [s * 8, 8, s * k * 30, m * 30 - 6, s * k * 52, m * 30 + 22], '#2a1340', 6);
        line(c, [s * 8, 8, s * k * 30, m * 30 - 6, s * k * 52, m * 30 + 22], '#6a3c9a', 2);
      }
    }
    const g = c.createRadialGradient(-6, -24, 4, 0, -18, 30);
    g.addColorStop(0, '#9b5de5'); g.addColorStop(1, '#2a0f45');
    ell(c, 0, -18, 26, 28, 0, g);
    ell(c, -7, -22, 6, 7, 0, '#e0d4ff'); ell(c, 7, -22, 6, 7, 0, '#e0d4ff');
    ell(c, -7, -21, 3, 3.5, 0, '#2a0f45'); ell(c, 7, -21, 3, 3.5, 0, '#2a0f45');
    c.fillStyle = '#e0d4ff'; c.fillRect(-6, -12, 12, 4);
    ell(c, 0, 14, 16, 14, 0, '#3d1a66');
    const glow = 0.6 + 0.4 * Math.sin(t * 5);
    [[-7, 20, 3.5], [7, 20, 3.5], [-3, 15, 2.2], [3, 15, 2.2], [-10, 14, 1.8], [10, 14, 1.8]].forEach(([x, y, r]) => ell(c, x, y, r, r, 0, `rgba(255,${40 + 80 * glow | 0},90,1)`));
    line(c, [-5, 26, -7, 34, -3, 36], '#f1f1f1', 3); line(c, [5, 26, 7, 34, 3, 36], '#f1f1f1', 3);
  }
  // STAGE 3 보스: 바퀴 황제 '로치 엠퍼러'
  function emperor(c, t) {
    const sway = Math.sin(t * 2) * 4;
    c.fillStyle = '#b5172f'; c.beginPath();
    c.moveTo(-20, -6); c.quadraticCurveTo(-38 - sway, -40, -24, -62); c.lineTo(24, -62); c.quadraticCurveTo(38 + sway, -40, 20, -6); c.closePath(); c.fill();
    c.fillStyle = '#ffd23f'; c.fillRect(-24, -64, 48, 4);
    legs(c, t, 3, 14, -10, 14, 22, '#2a1505', 3, 8);
    const g = c.createLinearGradient(-20, 0, 20, 0);
    g.addColorStop(0, '#3a1e0a'); g.addColorStop(0.35, '#b06a30'); g.addColorStop(1, '#2a1505');
    ell(c, 0, -6, 20, 32, 0, g);
    line(c, [0, -36, 0, 18], '#1a0c02', 2);
    c.globalAlpha = 0.3; ell(c, -7, -14, 4, 14, 0, '#fff'); c.globalAlpha = 1;
    ell(c, 0, 24, 15, 10, 0, '#5a3418');
    ell(c, 0, 33, 10, 7, 0, '#2a1505');
    const glow = 0.5 + 0.5 * Math.sin(t * 6);
    ell(c, -5, 34, 3, 2.5, 0, `rgba(255,${60 + 120 * glow | 0},40,1)`); ell(c, 5, 34, 3, 2.5, 0, `rgba(255,${60 + 120 * glow | 0},40,1)`);
    c.fillStyle = '#ffd23f'; c.beginPath();
    c.moveTo(-12, 22); c.lineTo(-13, 10); c.lineTo(-6, 16); c.lineTo(0, 6); c.lineTo(6, 16); c.lineTo(13, 10); c.lineTo(12, 22); c.closePath(); c.fill();
    ell(c, -6, 18, 1.8, 1.8, 0, '#3fd0ff'); ell(c, 0, 14, 2.2, 2.2, 0, '#ff3d5a'); ell(c, 6, 18, 1.8, 1.8, 0, '#3fd0ff');
    const w = Math.sin(t * 4) * 8;
    c.beginPath(); c.moveTo(-4, 38); c.quadraticCurveTo(-16 + w, 52, -26 - w, 66); c.moveTo(4, 38); c.quadraticCurveTo(16 - w, 52, 26 + w, 66);
    c.strokeStyle = '#2a1505'; c.lineWidth = 2; c.stroke();
  }

  // ---------- 플레이어 & 아이템 ----------
  // 방역선 '스프레이호': 위를 향함
  function player(c, t) {
    const fl = 6 + Math.sin(t * 40) * 2 + Math.random() * 2;
    const g = c.createLinearGradient(0, 8, 0, 8 + fl * 2);
    g.addColorStop(0, '#bff6ff'); g.addColorStop(0.4, '#3fb8ff'); g.addColorStop(1, 'rgba(63,184,255,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(-4, 8); c.lineTo(0, 8 + fl * 2.2); c.lineTo(4, 8); c.fill();
    c.fillStyle = '#c8d8e8'; c.beginPath(); c.moveTo(0, -18); c.lineTo(15, 8); c.lineTo(9, 11); c.lineTo(0, 7); c.lineTo(-9, 11); c.lineTo(-15, 8); c.closePath(); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, -18); c.lineTo(6, 4); c.lineTo(0, 7); c.lineTo(-6, 4); c.closePath(); c.fill();
    ell(c, -11, 4, 3, 6, 0, '#2de2a6'); ell(c, 11, 4, 3, 6, 0, '#2de2a6');
    ell(c, -11, 2, 1, 2.5, 0, '#c6fff0'); ell(c, 11, 2, 1, 2.5, 0, '#c6fff0');
    ell(c, 0, -5, 3, 5, 0, '#1b7fd1'); ell(c, -1, -7, 1, 2, 0, '#bfe8ff');
    c.fillStyle = '#ff5d73'; c.fillRect(-1.2, -21, 2.4, 4);
  }
  // 꿀벌 드론
  function drone(c, t) {
    wings(c, t, 2, -3, 3, 5, '#ffffff', 50, 0.6);
    ell(c, 0, 0, 5, 6, 0, '#ffd23f');
    c.fillStyle = '#2b1d0e'; c.fillRect(-5, -1.5, 10, 2); c.fillRect(-4.5, 2, 9, 1.6);
    ell(c, 0, -5, 2.5, 2.5, 0, '#2b1d0e');
  }
  function pollen(c, t, big) {
    const r = big ? 6 : 4, p = 1 + Math.sin(t * 6) * 0.15;
    ell(c, 0, 0, r * 2 * p, r * 2 * p, 0, 'rgba(198,255,77,0.18)');
    ell(c, 0, 0, r, r, 0, big ? '#ffe066' : '#c6ff4d');
    ell(c, -r * 0.3, -r * 0.3, r * 0.35, r * 0.35, 0, '#fff');
  }
  function heart(c, t, s = 1) {
    c.save(); c.scale(s, s);
    c.fillStyle = '#ff4d6d'; c.beginPath();
    c.moveTo(0, 6); c.bezierCurveTo(-10, -1, -6, -9, 0, -4); c.bezierCurveTo(6, -9, 10, -1, 0, 6); c.fill();
    c.restore();
  }
  function bombItem(c, t) {
    ell(c, 0, 1, 7, 7, 0, '#2de2a6'); ell(c, -2, -1, 2, 2, 0, '#c6fff0');
    c.fillStyle = '#e8f7ff'; c.fillRect(-2, -9, 4, 4);
    line(c, [0, -9, 3, -12], '#ffd23f', 1.5);
    if (Math.sin(t * 20) > 0) ell(c, 3.5, -12.5, 1.6, 1.6, 0, '#ff8c42');
  }

  return { mosquito, fly, ladybug, firefly, spider, roach, beetle, queen, tarantula, emperor, player, drone, pollen, heart, bombItem, ell };
})();
