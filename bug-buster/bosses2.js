// 은하 방역대 - 추가 보스 7종 패턴
const drift = (b, dt, speed = 0.5, k = 2) => { b.x += (G.W / 2 + Math.sin(b.t * speed) * (G.W / 2 - 75) - b.x) * Math.min(1, dt * k); };
const lob = (x, y, tx, ty, f, o) => { const d = Math.hypot(tx - x, ty - y); eShoot(x, y, Math.atan2(ty - y, tx - x), d / f / G.bspd, { fuse: f, ...o }); };

Object.assign(BOSSES, {
  waterbug: { name: '물장군 아쿠아 자이언트', hp: 4500, r: 40, score: 120000, draw: Art.waterbug, scale: 1,
    update(b, dt) {
      const { mode, lt, rage } = bossMode(b, 4);
      if (mode !== 2) { b.ghost = false; drift(b, dt); }
      if (mode === 0) {
        if ((b.cd -= dt) <= 0) { b.cd = rage ? 0.6 : 0.85; fanShot(b.x, b.y + 40, aim(b), 5, 0.3, 85, { c: '#7fe0ff', r: 8, shape: 'bubble', fuse: 1.5, burst: 6, bspd: 120, bc: '#bff0ff' }); }
      } else if (mode === 1) {
        if ((b.cd -= dt) <= 0) { b.cd = rage ? 0.07 : 0.1; for (let k = 0; k < 4; k++) eShoot(b.x, b.y, b.t * 1.7 + k * Math.PI / 2, 115, { c: '#7fe0ff', r: 5, shape: 'bubble' }); }
      } else if (mode === 2) {
        if (lt > 0.3 && lt < 3.2) { b.ghost = true; if (!b.sub) { b.sub = 1; b.tx = rand(70, G.W - 70); } b.x += (b.tx - b.x) * dt * 2; }
        else if (lt >= 3.2 && b.sub === 1) {
          b.sub = 2; b.ghost = false; G.shake = 10; Sound.play('boom');
          ringShot(b.x, b.y, rage ? 30 : 22, 130, { c: '#7fe0ff' }); ringShot(b.x, b.y, rage ? 30 : 22, 90, { c: '#bff0ff', r: 5 }, 0.1);
        }
      } else {
        const cyc = Math.floor(lt / 1.6);
        if (lt % 1.6 < 0.8) { if (b.cyc !== cyc) { b.cyc = cyc; const a = aim(b); b.al = [a - 0.3, a + 0.3]; } b.aimLines = b.al; }
        else { b.aimLines = null; if ((b.cd -= dt) <= 0) { b.cd = 0.045; for (const a of b.al || []) eShoot(b.x, b.y + 30, a, 330, { c: '#ffd23f' }); } }
      }
    } },

  lunamoth: { name: '나방 여제 루나', hp: 6500, r: 40, score: 160000, draw: Art.lunamoth, scale: 1,
    update(b, dt) {
      const { mode, lt, rage } = bossMode(b, 4);
      b.x = G.W / 2 + Math.sin(b.t * 0.4) * (G.W / 2 - 80); b.y = 150 + Math.sin(b.t * 0.8) * 12;
      if ((b.cd -= dt) > 0) return;
      if (mode === 0) {
        eShoot(b.x + rand(-90, 90), b.y + rand(-10, 20), Math.PI / 2 + rand(-0.25, 0.25), rand(70, 120), { c: '#d8f5e0', r: 3, shape: 'dust', ay: 10 });
        b.cd = rage ? 0.022 : 0.032;
      } else if (mode === 1) {
        for (const s of [-1, 1]) { const ex = b.x + s * 34, ey = b.y - 12; eShoot(ex, ey, Math.atan2(G.p.y - ey, G.p.x - ex), 220, { c: '#f5e07a' }); }
        b.cd = rage ? 0.075 : 0.1;
      } else if (mode === 2) {
        ringShot(b.x, b.y, 28, 95, { c: '#b6f0c8' }, b.t);
        if (b.sub < 2 && lt > 1) { b.sub++; spawnEnemy('moth', rand(60, G.W - 60), -20, {}); }
        b.cd = rage ? 0.55 : 0.75;
      } else {
        fanShot(b.x, b.y + 20, aim(b), rage ? 17 : 13, 0.13, 150, { c: '#e8ffef' });
        b.cd = 0.9;
      }
    } },

  kingcentipede: { name: '왕지네 킹 센티피드', hp: 9000, r: 22, score: 200000, draw: Art.kingcentipede, scale: 1,
    init(b) { b.trail = []; b.segs = 16; b.gap = 7; },
    absorb(b, bul) {
      for (let i = 1; i <= b.segs; i++) { const p = b.trail[i * b.gap]; if (p && (p.x - bul.x) ** 2 + (p.y - bul.y) ** 2 < 13 * 13) return true; }
      return false;
    },
    update(b, dt) {
      b.x = G.W / 2 + Math.sin(b.t * 0.8) * (G.W / 2 - 40); b.y = 170 + Math.sin(b.t * 1.5) * 90;
      const last = b.trail[0];
      if (!last || Math.hypot(last.x - b.x, last.y - b.y) >= 2) { b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > b.segs * b.gap + 5) b.trail.pop(); }
      for (let i = 1; i <= b.segs; i++) { const p = b.trail[i * b.gap]; if (p && (p.x - G.p.x) ** 2 + (p.y - G.p.y) ** 2 < 14 * 14) { hurtPlayer(); break; } }
      const { mode, rage } = bossMode(b, 4);
      if ((b.cd -= dt) > 0) return;
      if (mode === 0) {
        b.sub = (b.sub + 1) % b.segs; const p = b.trail[(b.sub + 1) * b.gap];
        if (p) eShoot(p.x, p.y, Math.atan2(G.p.y - p.y, G.p.x - p.x), 150, { c: '#ffb347' });
        b.cd = rage ? 0.05 : 0.08;
      } else if (mode === 1) { fanShot(b.x, b.y + 14, aim(b), rage ? 5 : 3, 0.15, 230, { c: '#ffd23f' }); b.cd = 0.28; }
      else if (mode === 2) { for (let k = 0; k < 3; k++) eShoot(b.x, b.y, b.t * 2.2 + k * TAU / 3, 120, { c: '#b6ff6a' }); b.cd = rage ? 0.06 : 0.085; }
      else { for (let i = 3; i <= b.segs; i += 4) { const p = b.trail[i * b.gap]; if (p) ringShot(p.x, p.y, 6, 95, { c: '#ff8c42' }, b.t); } b.cd = rage ? 0.9 : 1.2; }
    } },

  mantisboss: { name: '사마귀 검객 만티스 블레이드', hp: 12000, r: 36, score: 260000, draw: Art.mantisboss, scale: 1,
    update(b, dt) {
      const { mode, lt, rage } = bossMode(b, 4);
      if (mode !== 1) { b.ghost = false; drift(b, dt, 0.6); }
      if (mode === 0) {
        const ph = lt % 1.2;
        b.slash = ph < 0.8;
        if (ph >= 0.4 && ph < 0.8 && (b.cd -= dt) <= 0) {
          b.cd = rage ? 0.015 : 0.02; const p = (ph - 0.4) / 0.4;
          eShoot(b.x, b.y + 30, Math.PI / 2 - 0.9 + p * 1.8, 220, { c: '#b6ff6a', shape: 'blade' });
          eShoot(b.x, b.y + 30, Math.PI / 2 + 0.9 - p * 1.8, 220, { c: '#e8fff0', shape: 'blade' });
        }
      } else if (mode === 1) {
        const cyc = Math.floor(lt / 1.4);
        if (lt % 1.4 < 0.35) { b.ghost = true; if (b.cyc !== cyc) { b.cyc = cyc; b.tx = rand(60, G.W - 60); b.fired = false; } b.x += (b.tx - b.x) * Math.min(1, dt * 10); }
        else { b.ghost = false; if (!b.fired) { b.fired = true; fanShot(b.x, b.y + 30, aim(b), rage ? 13 : 11, 0.14, 200, { c: '#e8fff0', shape: 'blade' }); Sound.play('missile'); } }
      } else if (mode === 2) {
        if ((b.cd -= dt) <= 0) { b.cd = rage ? 0.07 : 0.1; eShoot(rand(10, G.W - 10), -10, Math.PI / 2, rand(200, 260), { c: '#b6ff6a', shape: 'blade' }); }
      } else {
        const cyc = Math.floor(lt / 2.5), ph = lt % 2.5;
        if (b.cyc !== cyc) { b.cyc = cyc; b.al = aim(b); }
        if (ph < 0.9) b.aimLines = [b.al, b.al - 0.25, b.al + 0.25];
        else { b.aimLines = null; if (ph < 1.3 && (b.cd -= dt) <= 0) { b.cd = 0.03; eShoot(b.x, b.y + 30, b.al, 420, { c: '#fff', shape: 'blade' }); eShoot(b.x, b.y + 30, b.al - 0.25, 300, { c: '#b6ff6a', shape: 'blade' }); eShoot(b.x, b.y + 30, b.al + 0.25, 300, { c: '#b6ff6a', shape: 'blade' }); } }
      }
    } },

  termitequeen: { name: '흰개미 여왕 테르미나', hp: 15000, r: 40, score: 320000, draw: Art.termitequeen, scale: 1,
    update(b, dt) {
      const { mode, rage } = bossMode(b, 4);
      b.x = G.W / 2 + Math.sin(b.t * 0.35) * (G.W / 2 - 90); b.y = 145;
      if (mode === 3 && !b.sub) { b.sub = 1; ENEMIES.ant.waves[0](); }
      if ((b.cd -= dt) > 0) return;
      if (mode === 0) { lob(b.x, b.y + 30, rand(30, G.W - 30), rand(G.H * 0.45, G.H - 60), 1.1, { c: '#fff8e8', r: 7, shape: 'egg', burst: 10, bspd: 110, bc: '#ffe0a0' }); b.cd = rage ? 0.5 : 0.7; }
      else if (mode === 1) { for (let i = 0; i < 2; i++) spawnEnemy('termite', b.x + rand(-30, 30), b.y + 40, {}); b.cd = rage ? 0.25 : 0.35; }
      else if (mode === 2) { b.sub ^= 1; ringShot(b.x, b.y - 20, rage ? 26 : 20, 105, { c: '#ffe0a0' }, b.sub * 0.15); eShoot(b.x, b.y + 30, aim(b), 180, { c: '#c8743a', r: 6 }); b.cd = 0.6; }
      else { eShoot(b.x, b.y, b.t * 2.5, 115, { c: '#c8743a' }); eShoot(b.x, b.y, b.t * 2.5 + Math.PI, 115, { c: '#c8743a' }); b.cd = rage ? 0.06 : 0.09; }
    } },

  scorpionking: { name: '전갈 군주 스콜피오', hp: 19000, r: 40, score: 400000, draw: Art.scorpionking, scale: 1,
    update(b, dt) {
      const { mode, lt, rage } = bossMode(b, 4);
      drift(b, dt, 0.5); b.y = 150;
      const tx = b.x + (b.tailX ?? 0), ty = b.y + (b.tailY ?? -60);
      if (mode === 0) {
        if (!b.sub) { b.sub = 1; b.dir = -(b.dir || 1); }
        const a0 = b.dir > 0 ? Math.PI * 0.12 : Math.PI * 0.88, a1 = Math.PI - a0;
        if (lt < 0.7) b.aimLines = [Math.atan2(Math.sin(a0) * 400 + b.y - ty, Math.cos(a0) * 400 + b.x - tx)];
        else if (lt < 3.2) { b.aimLines = null; if ((b.cd -= dt) <= 0) { b.cd = rage ? 0.016 : 0.022; eShoot(tx, ty, a0 + (a1 - a0) * (lt - 0.7) / 2.5, 320, { c: '#ffd23f' }); } }
        return;
      }
      b.aimLines = null;
      if ((b.cd -= dt) > 0) return;
      if (mode === 1) { lob(tx, ty, G.p.x, G.p.y, 0.9, { c: '#ff6a2a', r: 7, shape: 'egg', burst: 12, bspd: 120, bc: '#ffb347' }); b.cd = rage ? 0.55 : 0.8; }
      else if (mode === 2) {
        const y = rand(G.H * 0.35, G.H - 60);
        for (let k = 0; k < 3; k++) { eShoot(-5, y + k * 10, 0, 140 + k * 10, { c: '#ff8c42' }); eShoot(G.W + 5, y + k * 10 + 40, Math.PI, 140 + k * 10, { c: '#ff8c42' }); }
        b.cd = rage ? 0.4 : 0.55;
      } else {
        eShoot(rand(0, G.W), -10, Math.PI / 2 + rand(-0.2, 0.2), rand(180, 240), { c: '#ff6a2a', r: 5 });
        if ((b.ring = (b.ring || 0) - 1) <= 0) { b.ring = 12; ringShot(b.x, b.y, 14, 100, { c: '#ffb347' }, b.t); }
        b.cd = rage ? 0.06 : 0.08;
      }
    } },

  mother: { name: '마더 버그', hp: 26000, r: 42, score: 1000000, draw: Art.mother, scale: 1.1,
    seq: [['queen', 'waterbug', 'lunamoth'], ['tarantula', 'termitequeen', 'lunamoth'], ['emperor', 'mantisboss', 'scorpionking']],
    update(b, dt) {
      const k = b.hp / b.maxHp, ph = k > 0.66 ? 0 : k > 0.33 ? 1 : 2;
      if (ph !== b.phase) {
        if (b.phase !== undefined) {
          G.flash = 0.5; G.shake = 20; clearBullets(b.x, b.y, 2000); Sound.play('warn');
          text(G.W / 2, G.H * 0.35, `PHASE ${ph + 1}`, '#ff2d55', 30);
        }
        b.phase = ph; b.t = 0; b.seqI = -1;
      }
      const idx = Math.floor(b.t / 7) % 3;
      if (idx !== b.seqI) { b.seqI = idx; b.ghost = b.warn = b.slash = false; b.aimLines = null; b.mode = undefined; b.cyc = undefined; b.y = 150; }
      BOSSES[this.seq[ph][idx]].update(b, dt);
      if (ph === 2 && (b.extra = (b.extra || 0) - dt) <= 0) { b.extra = 1.6; ringShot(b.x, b.y, 16, 80, { c: '#ff2d55', r: 5 }, b.t); }
    } },
});
