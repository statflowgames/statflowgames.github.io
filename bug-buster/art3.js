// 은하 방역대 - 추가 보스 7종 디자인
(() => {
  const { ell, line, wings, legs, eyes } = Art;
  const TAU = Math.PI * 2;
  const glow = (c, x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const crown = (c, x, y, w, col = '#ffd23f') => {
    c.fillStyle = col; c.beginPath();
    c.moveTo(x - w, y + 6); c.lineTo(x - w, y - 4); c.lineTo(x - w / 2, y + 1); c.lineTo(x, y - 7); c.lineTo(x + w / 2, y + 1); c.lineTo(x + w, y - 4); c.lineTo(x + w, y + 6); c.closePath(); c.fill();
    ell(c, x, y + 2, 1.8, 1.8, 0, '#ff3d5a');
  };

  Object.assign(Art, {
    // STAGE 12: 물장군 '아쿠아 자이언트'
    waterbug(c, t, b) {
      if (b && b.ghost) c.globalAlpha = 0.3;
      for (let i = 0; i < 3; i++) { const k = ((t * 0.8 + i / 3) % 1); c.strokeStyle = `rgba(120,210,255,${0.35 * (1 - k)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 40 + k * 30, 22 + k * 16, 0, 0, TAU); c.stroke(); }
      legs(c, t, 2, 16, -14, 0, 22, '#3a2a14', 3, 3);
      for (const s of [-1, 1]) {
        const o = Math.sin(t * 2) * 0.15;
        line(c, [s * 12, 10, s * 30, 20 + o * 20, s * 22, 44], '#5a4020', 6);
        line(c, [s * 22, 44, s * 10, 50], '#7a5a30', 4);
      }
      const g = c.createRadialGradient(-10, -14, 4, 0, -6, 40); g.addColorStop(0, '#9a7a4a'); g.addColorStop(1, '#3a2a14');
      ell(c, 0, -6, 26, 36, 0, g);
      line(c, [0, -40, 0, 20], '#2a1a08', 2);
      c.globalAlpha *= 0.5; ell(c, -12, -16, 6, 16, -0.2, '#c0a070'); c.globalAlpha = b && b.ghost ? 0.3 : 1;
      ell(c, 0, 30, 12, 9, 0, '#4a3418');
      eyes(c, 7, 32, 4, '#7fe0ff');
      line(c, [0, 36, 0, 46], '#2a1a08', 2.5);
      c.globalAlpha = 1;
    },
    // STAGE 15: 나방 여제 '루나'
    lunamoth(c, t) {
      const f = 0.85 + 0.15 * Math.sin(t * 3);
      glow(c, 0, 0, 80, 'rgba(190,255,220,0.25)');
      for (const s of [-1, 1]) {
        c.save(); c.scale(s * f, 1);
        c.fillStyle = '#b6f0c8'; c.beginPath(); c.moveTo(4, -8); c.bezierCurveTo(40, -50, 70, -30, 62, -2); c.bezierCurveTo(56, 14, 24, 10, 4, 4); c.fill();
        c.fillStyle = '#8fdcae'; c.beginPath(); c.moveTo(4, 6); c.bezierCurveTo(30, 12, 44, 30, 36, 46); c.quadraticCurveTo(30, 70, 26, 86); c.quadraticCurveTo(18, 60, 14, 44); c.quadraticCurveTo(6, 30, 4, 12); c.fill();
        c.strokeStyle = '#6a3a7a'; c.lineWidth = 2; c.beginPath(); c.moveTo(4, -8); c.bezierCurveTo(40, -50, 70, -30, 62, -2); c.stroke();
        ell(c, 34, -12, 9, 9, 0, '#f5e07a'); ell(c, 34, -12, 5, 5, 0, '#6a3a7a'); ell(c, 32, -14, 1.8, 1.8, 0, '#fff');
        ell(c, 24, 26, 5, 5, 0, '#f5e07a'); ell(c, 24, 26, 2.5, 2.5, 0, '#6a3a7a');
        c.restore();
      }
      ell(c, 0, 0, 8, 26, 0, '#f4f0ff'); for (let i = 0; i < 5; i++) ell(c, 0, -16 + i * 7, 8, 1.2, 0, '#d8d0f0');
      ell(c, 0, 26, 7, 6, 0, '#e8e0ff'); eyes(c, 3.5, 28, 2.4, '#3a1a5a');
      for (const s of [-1, 1]) { c.strokeStyle = '#c8a8e8'; c.lineWidth = 2; c.beginPath(); c.moveTo(s * 2, 30); c.quadraticCurveTo(s * 14, 40, s * 16, 52); c.stroke(); for (let k = 0; k < 5; k++) line(c, [s * (6 + k * 2), 36 + k * 3, s * (10 + k * 2), 34 + k * 3], '#c8a8e8', 1); }
      crown(c, 0, 18, 7, '#e8ffef');
    },
    // STAGE 18: 왕지네 '킹 센티피드' (몸마디는 b.trail을 따라 그림)
    kingcentipede(c, t, b) {
      if (b && b.trail) {
        for (let i = b.segs; i >= 1; i--) {
          const p = b.trail[Math.min(b.trail.length - 1, i * b.gap)];
          if (!p) continue;
          c.save(); c.translate(p.x - b.x, p.y - b.y);
          legs(c, t + i, 1, 11, 0, 0, 10, '#ffb347', 2, 14);
          ell(c, 0, 0, 13, 10, 0, i % 2 ? '#8e2a1f' : '#a8321f'); ell(c, 0, -2, 9, 5, 0, '#c0392b');
          if (i === b.segs) { line(c, [-4, -8, -10, -18], '#ffd23f', 2); line(c, [4, -8, 10, -18], '#ffd23f', 2); }
          c.restore();
        }
      }
      glow(c, 0, 0, 40, 'rgba(255,90,60,0.3)');
      legs(c, t, 1, 14, 0, 0, 12, '#ffb347', 2.5, 14);
      ell(c, 0, 0, 20, 16, 0, '#c0392b'); ell(c, 0, -3, 15, 9, 0, '#e74c3c');
      eyes(c, 7, 6, 3.4, '#ffd23f');
      for (const s of [-1, 1]) { line(c, [s * 6, 12, s * 14, 22, s * 6, 30], '#ffd23f', 3.5); line(c, [s * 4, 12, s * 16, 34], '#e74c3c', 1.4); }
      crown(c, 0, -14, 9);
    },
    // STAGE 21: 사마귀 검객 '만티스 블레이드'
    mantisboss(c, t, b) {
      if (b && b.ghost) c.globalAlpha = 0.25;
      const sl = b && b.slash;
      glow(c, 0, 0, 70, 'rgba(160,255,120,0.18)');
      legs(c, t, 2, 8, -24, -6, 22, '#4a8a24', 3, 4);
      ell(c, 0, -28, 11, 26, 0, '#6abf3a'); for (let i = 0; i < 5; i++) ell(c, 0, -46 + i * 8, 11, 1.4, 0, '#4a9a24');
      ell(c, 0, 0, 6, 18, 0, '#5aa02c');
      for (const s of [-1, 1]) {
        const a = sl ? 1.4 : 0.35 + Math.sin(t * 2.5) * 0.12;
        c.save(); c.translate(s * 4, 8); c.rotate(-s * a);
        line(c, [0, 0, s * 10, 22], '#7ccf4a', 6);
        c.fillStyle = '#e8fff0'; c.beginPath(); c.moveTo(s * 10, 22); c.quadraticCurveTo(s * 26, 34, s * 6, 52); c.quadraticCurveTo(s * 14, 34, s * 8, 26); c.fill();
        glow(c, s * 12, 38, 14, 'rgba(200,255,220,0.5)');
        c.restore();
      }
      c.fillStyle = '#8fe05a'; c.beginPath(); c.moveTo(-14, 18); c.lineTo(14, 18); c.lineTo(0, 34); c.fill();
      ell(c, -10, 20, 5, 5, 0, '#ffe066'); ell(c, 10, 20, 5, 5, 0, '#ffe066'); ell(c, -10, 20, 2, 2, 0, '#c0392b'); ell(c, 10, 20, 2, 2, 0, '#c0392b');
      c.fillStyle = '#ff3d5a'; c.fillRect(-14, 13, 28, 3);
      line(c, [14, 14, 24, 8 + Math.sin(t * 6) * 3], '#ff3d5a', 2.5);
      c.globalAlpha = 1;
    },
    // STAGE 24: 흰개미 여왕 '테르미나'
    termitequeen(c, t) {
      const p = 1 + Math.sin(t * 3) * 0.05;
      c.save(); c.scale(p, p);
      const g = c.createRadialGradient(-10, -30, 6, 0, -20, 50); g.addColorStop(0, '#fff8e8'); g.addColorStop(1, '#d8b888');
      ell(c, 0, -20, 34, 46, 0, g);
      for (let i = 0; i < 7; i++) ell(c, 0, -56 + i * 12, 33 - Math.abs(i - 3) * 3, 1.6, 0, '#c8a070');
      c.restore();
      ell(c, 0, 26, 12, 10, 0, '#c8743a');
      legs(c, t, 3, 10, 22, 32, 12, '#a0582a', 2, 6);
      ell(c, 0, 40, 10, 8, 0, '#a0582a');
      eyes(c, 4, 42, 2, '#1a0a00');
      line(c, [-3, 46, -6, 53], '#5a2a0a', 2); line(c, [3, 46, 6, 53], '#5a2a0a', 2);
      crown(c, 0, 30, 8);
      for (let i = 0; i < 3; i++) { const a = t * 1.4 + i * TAU / 3; ell(c, Math.cos(a) * 44, -20 + Math.sin(a) * 50, 3, 3, 0, 'rgba(255,248,232,0.8)'); }
    },
    // STAGE 27: 전갈 군주 '스콜피오'
    scorpionking(c, t, b) {
      glow(c, 0, 0, 80, 'rgba(255,90,30,0.22)');
      legs(c, t, 4, 16, -18, 6, 18, '#3a0a04', 3.5, 6);
      let x = 0, y = -30, a = -Math.PI / 2 + Math.sin(t * 1.5) * 0.25;
      for (let i = 0; i < 6; i++) { const r = 9 - i * 0.7; ell(c, x, y, r, r, 0, i % 2 ? '#7a1a0a' : '#9a2410'); ell(c, x - 2, y - 2, r * 0.3, r * 0.3, 0, '#ffb347'); x += Math.cos(a) * 11; y += Math.sin(a) * 11; a += 0.45; }
      glow(c, x, y, 16, 'rgba(255,200,80,0.7)'); ell(c, x, y, 6, 6, 0, '#ffd23f');
      if (b) { b.tailX = x; b.tailY = y; }
      ell(c, 0, -6, 20, 28, 0, '#6a1408');
      for (let i = 0; i < 5; i++) { ell(c, 0, -28 + i * 10, 20, 1.5, 0, '#3a0804'); ell(c, -8, -24 + i * 10, 2, 1, 0, '#ff6a2a'); ell(c, 8, -24 + i * 10, 2, 1, 0, '#ff6a2a'); }
      for (const s of [-1, 1]) {
        const o = Math.sin(t * 2 + s) * 0.12;
        line(c, [s * 10, 18, s * 26, 30, s * 20, 44], '#8a1c0a', 7);
        c.save(); c.translate(s * 20, 50); c.rotate(s * (0.3 + o));
        ell(c, 0, 0, 10, 13, 0, '#a8321a'); c.fillStyle = '#3a0804'; c.fillRect(-1.5, 0, 3, 16);
        c.restore();
      }
      ell(c, 0, 24, 11, 8, 0, '#4a0a04'); eyes(c, 5, 25, 2.4, '#ffd23f');
      crown(c, 0, 14, 10);
    },
    // STAGE 30: 최종 보스 '마더 버그'
    mother(c, t, b) {
      const ph = b ? b.phase || 0 : 0;
      const col = ['#c77dff', '#ff8c42', '#ff2d55'][ph], core = ['#f0d8ff', '#ffe0b0', '#ffd0d8'][ph];
      glow(c, 0, 0, 100, ph === 2 ? 'rgba(255,45,85,0.3)' : 'rgba(199,125,255,0.25)');
      for (let i = 0; i < 6; i++) {
        const s = i < 3 ? -1 : 1, k = i % 3, a = (k - 1) * 0.6 + Math.sin(t * 2 + i) * 0.12;
        const x1 = s * (30 + Math.cos(a) * 30), y1 = Math.sin(a) * 30 + 4;
        line(c, [s * 20, (k - 1) * 12, x1, y1 - 10, x1 + s * 20, y1 + 30], '#1a0a24', 7);
        line(c, [s * 20, (k - 1) * 12, x1, y1 - 10, x1 + s * 20, y1 + 30], col, 2);
      }
      for (const s of [-1, 1]) { c.save(); c.globalAlpha = 0.5; c.fillStyle = col; c.beginPath(); c.moveTo(s * 10, -20); c.quadraticCurveTo(s * 70, -70 - Math.sin(t * 8) * 6, s * 50, -10); c.closePath(); c.fill(); c.restore(); }
      const g = c.createRadialGradient(-10, -20, 6, 0, -6, 50); g.addColorStop(0, '#4a2a5a'); g.addColorStop(1, '#0e0616');
      ell(c, 0, -6, 34, 44, 0, g);
      c.strokeStyle = col; c.lineWidth = 2;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(0, -6, 34 - i * 7, 44 - i * 9, 0, 0.2, Math.PI - 0.2); c.stroke(); }
      const beat = 1 + Math.max(0, Math.sin(t * (4 + ph * 2))) * 0.25;
      glow(c, 0, -8, 26 * beat, core); ell(c, 0, -8, 9 * beat, 9 * beat, 0, core); ell(c, 0, -8, 4, 4, 0, '#fff');
      ell(c, 0, 36, 18, 13, 0, '#1a0a24');
      [[-9, 36, 4], [9, 36, 4], [-4, 31, 2.5], [4, 31, 2.5], [-13, 30, 2], [13, 30, 2], [0, 42, 3]].forEach(([x, y, r]) => { ell(c, x, y, r, r, 0, col); ell(c, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.3, 0, '#fff'); });
      for (const s of [-1, 1]) line(c, [s * 8, 46, s * 14, 58, s * 6, 64], '#e8e0ff', 3.5);
      crown(c, 0, -52, 14, col);
    },
  });
})();
