// 은하 방역대 - 추가 해충 23종 디자인 (머리는 아래(+y)를 향함)
(() => {
  const { ell, line, wings, legs, eyes } = Art;
  const TAU = Math.PI * 2;
  const shine = (c, x, y, rx, ry, rot = 0, a = 0.35) => { c.globalAlpha = a; ell(c, x, y, rx, ry, rot, '#fff'); c.globalAlpha = 1; };
  const rg = (c, x, y, r, a, b) => { const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };

  Object.assign(Art, {
    // 진딧물 '말랑이': 터지면 새끼 3마리로 분열
    aphid(c, t, e) {
      if (e && e.small) c.scale(0.6, 0.6);
      legs(c, t, 3, 6, -4, 5, 6, '#4f7a1c', 1.2, 14);
      line(c, [-4, -9, -6, -15], '#4f7a1c', 1.6); line(c, [4, -9, 6, -15], '#4f7a1c', 1.6);
      ell(c, 0, -1, 10, 11, 0, rg(c, 0, -1, 12, '#efffa8', '#6fae1f'));
      ell(c, 0, 9, 5, 4, 0, '#5c8f19');
      eyes(c, 2.5, 10, 1.5, '#1d2b0a');
      shine(c, -4, -5, 3, 4, -0.5);
    },
    // 메뚜기 '폴짝이': 크게 뛰어올라 착지하며 원형 탄
    grasshopper(c, t, e) {
      const j = e && e.air ? 1 : 0;
      for (const s of [-1, 1]) {
        line(c, [s * 4, -2, s * 12, -10 - j * 4, s * 6, -18 + j * 6], '#3d7a2a', 3);
        line(c, [s * 6, -18 + j * 6, s * 8, -24 + j * 10], '#2a5a1c', 1.5);
      }
      legs(c, t, 2, 4, 2, 7, 6, '#3d7a2a', 1.3, 8);
      ell(c, 0, -4, 5, 13, 0, '#7ccf4a');
      for (let i = 0; i < 4; i++) ell(c, 0, -12 + i * 4, 5, 0.8, 0, '#4f9a30');
      ell(c, 0, 10, 5, 5, 0, '#8fe05a');
      eyes(c, 3, 11, 1.8, '#3a2a10');
      line(c, [-2, 14, -7, 25], '#3d7a2a', 1); line(c, [2, 14, 7, 25], '#3d7a2a', 1);
    },
    // 잠자리 '휙휙이': 직선으로 순간 돌진, 멈춰서 조준
    dragonfly(c, t) {
      wings(c, t, 2, -1, 4, 16, '#d0f4ff', 70, 0.45);
      wings(c, t + 0.4, 2, 5, 3.5, 13, '#d0f4ff', 70, 0.4);
      ell(c, 0, -12, 2.2, 12, 0, '#2a8fd6');
      for (let i = 0; i < 5; i++) ell(c, 0, -21 + i * 4, 2.4, 0.7, 0, '#0e4f80');
      ell(c, 0, 2, 4, 4.5, 0, '#1f6fb0');
      ell(c, -3, 8, 3.6, 3.6, 0, '#47e0ff'); ell(c, 3, 8, 3.6, 3.6, 0, '#47e0ff');
      ell(c, -3.8, 7, 1, 1, 0, '#fff'); ell(c, 2.2, 7, 1, 1, 0, '#fff');
    },
    // 날파리 '바글이': 떼로 몰려다니는 작은 해충
    gnat(c, t) {
      wings(c, t, 1.5, -1, 3, 5, '#e8f0ff', 80, 0.5);
      ell(c, 0, 0, 3, 4, 0, '#3a3a46'); ell(c, 0, 4, 2, 2, 0, '#22222a');
      ell(c, -1, 4.5, 0.8, 0.8, 0, '#ff6a6a'); ell(c, 1, 4.5, 0.8, 0.8, 0, '#ff6a6a');
    },
    // 소금쟁이 '미끄럼이': 옆에서 미끄러지며 저격
    strider(c, t) {
      c.strokeStyle = 'rgba(150,220,255,0.35)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(0, 0, 18 + Math.sin(t * 4) * 2, 8, 0, 0, TAU); c.stroke();
      for (const s of [-1, 1]) {
        line(c, [s * 2, 4, s * 14, 8, s * 20, 18], '#3b4a5a', 1.2);
        line(c, [s * 2, -2, s * 16, -6, s * 24, -20], '#3b4a5a', 1.2);
        line(c, [s * 2, 6, s * 6, 12], '#3b4a5a', 1.2);
      }
      ell(c, 0, -2, 3, 10, 0, '#5a6b7d'); ell(c, 0, 9, 2.5, 3, 0, '#43525f');
      eyes(c, 1.6, 10, 1.2, '#ffd23f');
    },
    // 공벌레 '데굴이': 몸을 말면 무적, 펴면 공격
    pillbug(c, t, e) {
      if (e && e.rolled) {
        ell(c, 0, 0, 13, 13, 0, rg(c, 0, 0, 14, '#c0cad8', '#4a5568'));
        c.save(); c.rotate(e.t * 8); c.strokeStyle = '#2d3748'; c.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 5, -12); c.quadraticCurveTo(i * 6.5, 0, i * 5, 12); c.stroke(); }
        c.restore(); shine(c, -4, -5, 3, 4, -0.5); return;
      }
      legs(c, t, 4, 8, -6, 8, 5, '#2d3748', 1.3, 12);
      ell(c, 0, 0, 10, 15, 0, '#7a8699');
      c.fillStyle = '#4a5568';
      for (let i = 0; i < 6; i++) { const k = Math.abs(i - 2.5); c.fillRect(-9 + k * 0.6, -12 + i * 4.5, 18 - k * 1.2, 1.4); }
      ell(c, 0, 14, 6, 3.5, 0, '#4a5568');
      line(c, [-2, 16, -6, 22], '#2d3748', 1.2); line(c, [2, 16, 6, 22], '#2d3748', 1.2);
    },
    // 나방 '펄럭이': 큰 날개로 인분 가루를 뿌림
    moth(c, t) {
      const f = 0.75 + 0.25 * Math.sin(t * 6);
      for (const s of [-1, 1]) {
        c.save(); c.scale(s * f, 1);
        c.fillStyle = '#8b6f9e'; c.beginPath(); c.moveTo(2, -4); c.quadraticCurveTo(22, -22, 24, -2); c.quadraticCurveTo(20, 10, 2, 4); c.fill();
        c.fillStyle = '#6b4f7e'; c.beginPath(); c.moveTo(2, 4); c.quadraticCurveTo(18, 8, 14, 18); c.quadraticCurveTo(6, 16, 2, 8); c.fill();
        ell(c, 14, -6, 4, 4, 0, '#f0d080'); ell(c, 14, -6, 2, 2, 0, '#3a2440');
        c.restore();
      }
      ell(c, 0, 0, 3.5, 11, 0, '#5a4060'); ell(c, 0, 9, 3, 3, 0, '#c0a0c8');
      line(c, [-1, 11, -6, 19], '#c0a0c8', 1.6); line(c, [1, 11, 6, 19], '#c0a0c8', 1.6);
    },
    // 말벌 '쏘옥이': 곡선을 그리며 급강하
    wasp(c, t) {
      wings(c, t, 3, -2, 4, 12, '#ffcf9a', 55, 0.5);
      legs(c, t, 3, 4, 0, 7, 7, '#2b1d0e', 1.2, 10);
      c.save(); c.beginPath(); c.ellipse(0, -10, 5.5, 10, 0, 0, TAU); c.clip();
      c.fillStyle = '#ffb000'; c.fillRect(-6, -21, 12, 22);
      c.fillStyle = '#1a1208'; for (let i = 0; i < 3; i++) c.fillRect(-6, -16 + i * 5, 12, 2.2);
      c.restore();
      c.fillStyle = '#1a1208'; c.beginPath(); c.moveTo(-1.5, -20); c.lineTo(0, -26); c.lineTo(1.5, -20); c.fill();
      ell(c, 0, 2, 4, 4.5, 0, '#3a2a12');
      ell(c, 0, 9, 4.5, 3.5, 0, '#ffb000'); eyes(c, 2.6, 9.5, 1.6, '#1a1208');
      line(c, [-1.5, 12, -3, 15], '#1a1208', 1.2); line(c, [1.5, 12, 3, 15], '#1a1208', 1.2);
    },
    // 노린재 '뿡뿡이': 독가스 구름을 남김, 터질 때도 가스
    stinkbug(c, t) {
      legs(c, t, 3, 8, -4, 6, 6, '#3a3020', 1.4, 6);
      c.fillStyle = '#6b8f3a'; c.beginPath();
      c.moveTo(0, 14); c.lineTo(12, 4); c.lineTo(10, -10); c.lineTo(0, -14); c.lineTo(-10, -10); c.lineTo(-12, 4); c.closePath(); c.fill();
      c.fillStyle = '#4a6a24'; c.beginPath(); c.moveTo(-7, -2); c.lineTo(7, -2); c.lineTo(0, 10); c.fill();
      [[-6, -7], [6, -7], [0, -10]].forEach(([x, y]) => ell(c, x, y, 1.2, 1.2, 0, '#b6e06a'));
      ell(c, 0, 14, 4, 3, 0, '#4a6a24'); eyes(c, 2.4, 15, 1.2, '#ff8c42');
      c.globalAlpha = 0.35 + 0.2 * Math.sin(t * 5);
      ell(c, -6, -17 - Math.sin(t * 3) * 2, 4, 3, 0, '#b6ff6a'); ell(c, 5, -19 - Math.cos(t * 3) * 2, 3, 2.5, 0, '#b6ff6a');
      c.globalAlpha = 1;
    },
    // 매미 '맴맴이': 음파 고리 탄막 (빈틈을 찾아라)
    cicada(c, t) {
      const k = (t * 2) % 1;
      c.strokeStyle = `rgba(255,240,180,${0.5 * (1 - k)})`; c.lineWidth = 1.5;
      c.beginPath(); c.arc(0, 4, 10 + k * 14, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
      for (const s of [-1, 1]) {
        c.save(); c.globalAlpha = 0.55; c.fillStyle = '#d8f0e8';
        c.beginPath(); c.moveTo(s * 3, 2); c.quadraticCurveTo(s * 15, -6, s * 6, -24); c.quadraticCurveTo(s * 2, -12, s * 3, 2); c.fill();
        c.globalAlpha = 1; c.strokeStyle = '#3a5a48'; c.lineWidth = 0.7; c.stroke(); c.restore();
      }
      ell(c, 0, -4, 6, 11, 0, '#3a4a2a'); ell(c, 0, 7, 9, 5, 0, '#4a6a3a');
      ell(c, -7, 8, 2.6, 2.6, 0, '#c0392b'); ell(c, 7, 8, 2.6, 2.6, 0, '#c0392b');
      ell(c, 0, 8, 2, 1.2, 0, '#a3e635');
    },
    // 지네 '줄줄이': 머리를 따라 몸마디가 줄지어 옴
    centipede(c, t, e) {
      const head = !e || !e.seg;
      legs(c, t + (e ? e.idx || 0 : 0), 1, 6, 0, 0, 7, '#ffb347', 1.4, 18);
      ell(c, 0, 0, 8, 6, 0, head ? '#c0392b' : '#8e2a1f');
      ell(c, 0, -1, 6, 3.5, 0, head ? '#e74c3c' : '#b03a2e');
      if (head) {
        eyes(c, 3, 3, 1.6, '#ffd23f');
        line(c, [-3, 5, -6, 11], '#ffd23f', 1.6); line(c, [3, 5, 6, 11], '#ffd23f', 1.6);
        line(c, [-2, 5, -8, 16], '#e74c3c', 0.9); line(c, [2, 5, 8, 16], '#e74c3c', 0.9);
      }
    },
    // 쇠똥구리 '굴림이': 똥 경단을 굴려 보냄 (경단이 터지면 탄막)
    dungbeetle(c, t, e) {
      if (!e || e.hasBall !== false) {
        const r = t * 5;
        ell(c, 0, 21, 10, 10, 0, '#7a5a3a');
        c.strokeStyle = '#5a3f25'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 21, 6, r, r + 2); c.stroke();
        ell(c, -3, 18, 2, 2, 0, '#9a7a5a');
      }
      legs(c, t, 3, 8, -6, 6, 7, '#111', 1.8, 9);
      const g = c.createLinearGradient(-10, 0, 10, 0); g.addColorStop(0, '#0a0a0a'); g.addColorStop(0.4, '#4a4a52'); g.addColorStop(1, '#0a0a0a');
      ell(c, 0, -2, 10, 11, 0, g); line(c, [0, -12, 0, 6], '#000', 1);
      ell(c, 0, 9, 7, 4, 0, '#222');
      c.fillStyle = '#3a3a3a'; for (let i = -3; i <= 3; i++) c.fillRect(i * 1.8 - 0.5, 12, 1, 2.4);
      shine(c, -4, -5, 2.5, 5);
    },
    // 사마귀 '칼날이': 낫으로 부채꼴 칼바람
    mantis(c, t, e) {
      const sl = e && e.slash ? 1 : 0;
      legs(c, t, 2, 4, -10, -2, 10, '#5aa02c', 1.4, 5);
      ell(c, 0, -14, 5, 12, 0, '#7ccf4a');
      ell(c, 0, 0, 2.6, 8, 0, '#6abf3a');
      for (const s of [-1, 1]) {
        const a = sl ? 1.2 : 0.3 + Math.sin(t * 3) * 0.1;
        c.save(); c.translate(s * 2, 4); c.rotate(-s * a);
        line(c, [0, 0, s * 4, 10, s * 1, 16], '#8fe05a', 3);
        for (let k = 0; k < 3; k++) line(c, [s * 3, 9 + k * 2, s * 5.5, 9 + k * 2], '#e8ffd0', 0.8);
        c.restore();
      }
      c.fillStyle = '#8fe05a'; c.beginPath(); c.moveTo(-7, 9); c.lineTo(7, 9); c.lineTo(0, 17); c.fill();
      ell(c, -5, 10, 2.4, 2.4, 0, '#ffe066'); ell(c, 5, 10, 2.4, 2.4, 0, '#ffe066');
      ell(c, -5, 10, 1, 1, 0, '#222'); ell(c, 5, 10, 1, 1, 0, '#222');
    },
    // 폭탄먼지벌레 '펑펑이': 뜨거운 분사를 부채꼴로 발사
    bombardier(c, t, e) {
      if (e && e.spray > 0) { c.globalAlpha = 0.6; ell(c, 0, 22, 5 + Math.random() * 3, 7, 0, '#fff3b0'); c.globalAlpha = 1; }
      legs(c, t, 3, 7, -4, 6, 7, '#3a1f0a', 1.4, 12);
      ell(c, 0, -3, 9, 11, 0, '#1d2b5a');
      [[-4, -6, 3, 4], [4, -6, 3, 4], [-4, 2, 2.5, 3], [4, 2, 2.5, 3]].forEach(([x, y, a, b]) => ell(c, x, y, a, b, 0, '#ffcc33'));
      line(c, [0, -14, 0, 8], '#0d1530', 1);
      ell(c, 0, 9, 6, 4, 0, '#ff7a1a'); ell(c, 0, 14, 4, 3, 0, '#ff7a1a');
      eyes(c, 2.4, 14.5, 1.2, '#111');
    },
    // 흰개미 둥지 '우글집': 흰개미를 계속 쏟아냄
    nest(c, t) {
      c.fillStyle = '#8a6a48'; c.beginPath();
      c.moveTo(-18, 10); c.quadraticCurveTo(-16, -14, -6, -20); c.quadraticCurveTo(0, -26, 6, -20);
      c.quadraticCurveTo(16, -14, 18, 10); c.quadraticCurveTo(0, 18, -18, 10); c.fill();
      c.fillStyle = '#a5845e'; c.beginPath(); c.ellipse(-6, -8, 5, 9, -0.3, 0, TAU); c.fill();
      [[-8, -2], [6, -8], [1, 5], [-2, -14], [10, 2]].forEach(([x, y], i) => {
        ell(c, x, y, 2.8, 2.2, 0, '#3a2814');
        const g = 0.5 + 0.5 * Math.sin(t * 6 + i * 2);
        ell(c, x, y, 1.1, 1.1, 0, `rgba(255,236,190,${g})`);
      });
    },
    termite(c, t) {
      legs(c, t, 3, 3, -3, 3, 5, '#c8a878', 1, 20);
      ell(c, 0, -2, 3.5, 6, 0, '#f5e6c8'); ell(c, 0, 5, 3, 3, 0, '#c8743a');
      line(c, [-1, 7, -2.5, 10], '#5a2a0a', 1); line(c, [1, 7, 2.5, 10], '#5a2a0a', 1);
    },
    // 벼룩 '순간이': 사라졌다가 다른 곳에 나타남
    flea(c, t) {
      legs(c, t, 2, 4, -2, 4, 7, '#4a1c10', 1.4, 15);
      for (const s of [-1, 1]) line(c, [s * 3, -4, s * 11, -12, s * 6, -18], '#5a2414', 2.5);
      ell(c, 0, -2, 7, 10, 0, rg(c, 0, -2, 10, '#d0684a', '#4a1c10'));
      ell(c, 0, 8, 4, 4, 0, '#5a2414'); eyes(c, 1.8, 9, 1.2, '#ffd23f');
      for (let i = 0; i < 4; i++) line(c, [-6 + i * 4, -9 + (i % 2) * 2, -7 + i * 4, -13 + (i % 2) * 2], '#2a0c06', 0.7);
    },
    // 나비 '팔랑이': 꽃잎 모양 탄막
    butterfly(c, t, e) {
      const f = 0.6 + 0.4 * Math.abs(Math.sin(t * 5)), h = (e && e.hue) || 300;
      for (const s of [-1, 1]) {
        c.save(); c.scale(s * f, 1);
        c.fillStyle = `hsl(${h},90%,62%)`; c.beginPath(); c.moveTo(1, -2); c.bezierCurveTo(10, -24, 26, -16, 20, -2); c.bezierCurveTo(16, 4, 6, 2, 1, 2); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1; c.stroke();
        c.fillStyle = `hsl(${h + 40},90%,55%)`; c.beginPath(); c.moveTo(1, 2); c.bezierCurveTo(14, 4, 18, 16, 8, 18); c.bezierCurveTo(4, 16, 2, 10, 1, 4); c.fill();
        ell(c, 13, -9, 3, 3, 0, '#fff'); ell(c, 13, -9, 1.5, 1.5, 0, '#222');
        c.restore();
      }
      ell(c, 0, 0, 2, 10, 0, '#2a1a3a');
      line(c, [-1, 9, -5, 17], '#2a1a3a', 1); line(c, [1, 9, 5, 17], '#2a1a3a', 1);
      ell(c, -5, 17, 1.2, 1.2, 0, '#2a1a3a'); ell(c, 5, 17, 1.2, 1.2, 0, '#2a1a3a');
    },
    // 전갈 '독침이': 꼬리로 포물선 폭탄
    scorpion(c, t) {
      legs(c, t, 4, 7, -6, 4, 8, '#5a3a14', 1.6, 8);
      let x = 0, y = -12, a = -Math.PI / 2 + Math.sin(t * 2) * 0.2;
      for (let i = 0; i < 5; i++) { ell(c, x, y, 3.6 - i * 0.3, 3.6 - i * 0.3, 0, '#a8741e'); x += Math.cos(a) * 5; y += Math.sin(a) * 5; a += 0.5; }
      ell(c, x, y, 3, 3, 0, '#d4a03a'); ell(c, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 1.6, 1.6, 0, '#ff3d5a');
      ell(c, 0, -2, 8, 12, 0, '#c08a2a');
      for (let i = 0; i < 4; i++) ell(c, 0, -10 + i * 5, 8, 0.8, 0, '#7a5214');
      for (const s of [-1, 1]) {
        line(c, [s * 4, 8, s * 9, 14, s * 7, 20], '#c08a2a', 3);
        ell(c, s * 7, 22, 4, 5, s * 0.3, '#d4a03a');
        c.fillStyle = '#5a3a14'; c.fillRect(s * 7 - 0.5, 20, 1, 6);
      }
      eyes(c, 2, 10, 1.1, '#111');
    },
    // 사슴벌레 '집게돌이': 일렬로 맞춰 세로 돌진
    stag(c, t, e) {
      legs(c, t, 3, 10, -6, 6, 8, '#1a0f08', 2, 5);
      const g = c.createLinearGradient(-12, 0, 12, 0); g.addColorStop(0, '#2a140a'); g.addColorStop(0.4, '#7a4420'); g.addColorStop(1, '#2a140a');
      ell(c, 0, -4, 12, 14, 0, g); line(c, [0, -18, 0, 8], '#120804', 1.4);
      ell(c, 0, 11, 9, 5, 0, '#3a1e0c');
      const o = e && e.charging ? 0.08 : 0.35 + Math.sin(t * 3) * 0.08;
      for (const s of [-1, 1]) {
        c.save(); c.translate(s * 5, 13); c.rotate(s * o);
        c.fillStyle = '#5a2e12'; c.beginPath(); c.moveTo(-2 * s, 0); c.quadraticCurveTo(s * 9, 8, s * 2, 22); c.lineTo(0, 20); c.quadraticCurveTo(s * 3, 10, -s, 2); c.fill();
        ell(c, s * 4, 10, 1.4, 1.4, 0, '#8a4a22'); c.restore();
      }
      shine(c, -5, -9, 3, 6, -0.3); eyes(c, 6, 11, 1.4, '#ff8c42');
    },
    // 장수말벌 '대왕침': 좌우로 훑으며 연사
    hornet(c, t) {
      c.scale(1.3, 1.3);
      wings(c, t, 3, -2, 5, 13, '#ffd0a0', 50, 0.5);
      legs(c, t, 3, 5, 0, 7, 7, '#2a1400', 1.4, 10);
      c.save(); c.beginPath(); c.ellipse(0, -10, 6.5, 10.5, 0, 0, TAU); c.clip();
      c.fillStyle = '#ffa000'; c.fillRect(-7, -22, 14, 24);
      c.fillStyle = '#3a1a00'; for (let i = 0; i < 3; i++) c.fillRect(-7, -17 + i * 5.5, 14, 2.8);
      c.restore();
      ell(c, 0, 2, 5, 5, 0, '#3a1a00');
      ell(c, 0, 9.5, 5.5, 4.5, 0, '#ff8c1a'); eyes(c, 3, 10, 2, '#1a0a00');
      line(c, [-2, 13, -3.5, 16], '#1a0a00', 1.5); line(c, [2, 13, 3.5, 16], '#1a0a00', 1.5);
    },
    // 병정개미 '줄맞춤': 지그재그 행군
    ant(c, t) {
      legs(c, t, 3, 3, -2, 4, 9, '#2a0a0a', 1.3, 16);
      ell(c, 0, -10, 5, 7, 0, '#3a0d0d'); ell(c, 0, -1, 3, 4, 0, '#5a1414'); ell(c, 0, 7, 5.5, 5, 0, '#8a1c1c');
      eyes(c, 3, 7, 1.2, '#111');
      line(c, [-2, 11, -4, 15, -1.5, 16], '#ffcc66', 1.4); line(c, [2, 11, 4, 15, 1.5, 16], '#ffcc66', 1.4);
      line(c, [-2, 10, -6, 14, -9, 12], '#5a1414', 0.9); line(c, [2, 10, 6, 14, 9, 12], '#5a1414', 0.9);
      shine(c, -2, -12, 1.5, 3);
    },
    // 물방개 '잠수함': 물속에 숨었다가 떠오르며 공격
    diver(c, t) {
      for (const s of [-1, 1]) {
        line(c, [s * 7, 2, s * 16, 6 + Math.sin(t * 8) * 3], '#3a3a10', 2.5);
        ell(c, s * 16, 7 + Math.sin(t * 8) * 3, 4, 1.5, 0, '#3a3a10');
      }
      ell(c, 0, 0, 10, 13, 0, '#ffd23f'); ell(c, 0, 0, 8.6, 11.6, 0, '#1a3a24');
      line(c, [0, -11, 0, 9], '#0a1a10', 1);
      ell(c, 0, 12, 5, 3, 0, '#1a3a24'); eyes(c, 2.5, 12.5, 1.2, '#ffd23f');
      shine(c, -4, -5, 2.5, 5);
    },
    // 비단벌레 '반짝이': 무지개 탄막, 맞으면 반사탄
    jewel(c, t) {
      legs(c, t, 3, 8, -6, 6, 6, '#1a1a2a', 1.4, 7);
      const h = (t * 60) % 360, g = c.createLinearGradient(-12, -14, 12, 14);
      g.addColorStop(0, `hsl(${h},90%,60%)`); g.addColorStop(0.5, `hsl(${h + 60},90%,45%)`); g.addColorStop(1, `hsl(${h + 140},90%,55%)`);
      c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(13, -10, 10, 6); c.quadraticCurveTo(6, 14, 0, 14);
      c.quadraticCurveTo(-6, 14, -10, 6); c.quadraticCurveTo(-13, -10, 0, -16); c.fillStyle = g; c.fill();
      line(c, [0, -16, 0, 12], 'rgba(0,0,0,0.4)', 1);
      line(c, [-6, -10, -5, 8], 'rgba(255,255,255,0.3)', 1); line(c, [6, -10, 5, 8], 'rgba(255,255,255,0.3)', 1);
      ell(c, 0, 15, 5, 3, 0, `hsl(${h + 200},80%,40%)`); eyes(c, 2.5, 15.5, 1.2, '#fff');
      shine(c, -4, -6, 2, 5, -0.3, 0.3 + 0.3 * Math.sin(t * 7));
    },
  });
})();
