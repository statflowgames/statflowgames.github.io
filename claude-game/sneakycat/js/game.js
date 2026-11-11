// 게임 규칙: 고양이, 경비(집사·개·경비원), 카메라, 레이저, 소리
import { parseLevel, DIRS, angDiff } from './world.js?v=1112004344';
import { CHAPTERS } from './levels.js?v=1112004344';

export const TYPES = {
  owner: { walk: 1.25, run: 3.1, range: 4.3, fov: 1.25, nose: 0, turn: 4 },
  butler: { walk: 1.4, run: 3.35, range: 4.6, fov: 1.2, nose: 0, turn: 4.5 },
  guard: { walk: 1.5, run: 3.6, range: 5.2, fov: 1.05, nose: 0, turn: 5 },
  dog: { walk: 1.9, run: 4.45, range: 3.4, fov: 1.6, nose: 1.35, turn: 7 },
  fishmonger: { walk: 1.2, run: 3.1, range: 3.9, fov: 1.3, nose: 0, fishNose: 2.6, turn: 4 },
  chef: { walk: 1.3, run: 3.3, range: 4.4, fov: 1.3, nose: 0, turn: 7, chop: true },
};
// 50번째 스테이지부터: 더 빠르고, 더 멀리 보고, 더 빨리 알아챈다
const hardType = (T) => ({ ...T, walk: T.walk * 1.15, run: T.run * 1.08, range: T.range + 0.5, turn: T.turn * 1.15 });
const CAT_SNEAK = 2.3, CAT_RUN = 4.0, CAT_R = 0.27;

const LINES = {
  give: ['기분 탓인가…', '바람 소리였나?', '아무것도 없네', '졸려서 헛것을…', '흠…'],
  chase: ['고양이다!!', '거기 서!', '도둑 고양이!', '잡았다… 아니?!'],
  noise: ['무슨 소리지?', '거기 누구야?', '응? 저쪽인가', '뭐야?'],
  lost: ['어디 갔지?', '분명 여기였는데…', '놓쳤다!', '어디 숨었어?'],
  dogNoise: ['킁킁?', '으르릉…'], dogChase: ['멍멍!!', '왈왈왈!'], dogGive: ['킁…', '하암~'],
  alarm: ['경보다!', '침입자?!'],
};
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Game {
  constructor(level) {
    this.L = level;
    this.hard = !!level.hard;
    this.chapter = CHAPTERS[level.ch - 1];
    const { grid, ents } = parseLevel(level);
    this.grid = grid;
    this.ents = ents;
    this.t = 0;
    this.elapsed = 0;
    this.state = 'intro';
    this.endT = 0;
    this.spotted = false;
    this.alarmFlash = 0;
    this.fx = () => {};
    const s = ents.cat;
    this.cat = { x: s.x, y: s.y, vx: 0, vy: 0, face: 1, moving: false, run: false, hidden: true, hasFish: false, riding: null, stepT: 0, walkT: 0, meowCD: 0, bubble: null };
    this.fish = { ...ents.fish, taken: false };
    this.bonus = ents.bonus.map((b) => ({ ...b, taken: false }));
    this.vases = ents.vases.map((v) => ({ ...v, broken: false }));
    this.switches = ents.switches.map((v) => ({ ...v, on: true }));
    this.power = true;
    // 환풍구는 읽는 순서대로 두 개씩 이어진다 (1↔2, 3↔4)
    this.vents = ents.vents.map((v) => ({ ...v }));
    this.cams = ents.cams.map((c, i) => ({
      ...c, ox: c.x + c.wall.x * 0.36, oy: c.y + c.wall.y * 0.36,
      ang: c.base, meter: 0, alarmT: 0, phase: i * 2.1, sweep: 0.85, period: this.hard ? 5.2 : 6.5, range: this.hard ? 6 : 5.5, fov: 0.62,
    }));
    this.lasers = ents.lasers.map((l) => ({ ...l, phase: (l.dir === 'h' ? l.ty : l.tx) * 0.95 }));
    this.laserOn = 2.0;
    this.laserOff = 1.5;
    this.laserCD = 0;
    this.guards = level.guards.map((g) => this.makeGuard(g));
    this.roomba = ents.roomba ? this.makeRoomba(level.roomba) : null;
    // 배식 카트: 정해진 지점을 오가는 움직이는 숨는 곳
    this.carts = (level.carts || []).map((r) => this.makeCart(r));
    // 자동문: 시간마다 열리고 닫힘. 사람이 다가오면 열림 (고양이는 너무 작아서 센서가 못 알아챔)
    this.doorOpen = this.hard ? 2.6 : 3.2; this.doorShut = this.hard ? 3.0 : 2.4;
    this.doors = ents.doors.map((d) => ({ ...d, open: true, amt: 1, phase: (d.tx * 1.7 + d.ty * 2.3) % (this.doorOpen + this.doorShut) }));
    this.noises = [];
    this.popups = [];
    this.parts = [];
  }

  makeGuard(spec) {
    const T = this.hard ? hardType(TYPES[spec.t]) : TYPES[spec.t];
    const pts = [...spec.p].map((d) => this.ents.wps[d]);
    const look = (spec.look || ['d']).map((k) => DIRS[k]);
    const g = {
      type: spec.t, T, x: pts[0].x, y: pts[0].y, pts, wi: pts.length > 1 ? 1 : 0,
      look, li: 0, lookT: Math.random(), face: look[0], aim: look[0],
      state: spec.sleep ? 'sleep' : 'patrol', sleeper: !!spec.sleep,
      route: null, meter: 0, last: null, seenT: 9, timer: 0, pause: 0, repath: 0,
      bubble: null, barkT: 0, moving: false, walkT: 0, fast: false, searchBase: 0,
    };
    if (pts.length > 1) g.face = g.aim = Math.atan2(pts[1].y - g.y, pts[1].x - g.x);
    if (T.chop) { g.chopping = true; g.chopT = 1.2 + (this.guardsMade || 0) * 1.3; g.tickT = 0; }
    this.guardsMade = (this.guardsMade || 0) + 1;
    if (g.sleeper) g.bubble = { text: 'Zz', t: 999, kind: 'z' };
    return g;
  }
  makeCart(route) {
    const pts = [...route].map((d) => this.ents.wps[d]);
    return { x: pts[0].x, y: pts[0].y, pts, wi: pts.length > 1 ? 1 : 0, route: null, pause: 1, ang: 0, speed: this.hard ? 1.3 : 1.1, cart: true };
  }
  updateCarts(dt) {
    for (const r of this.carts) {
      if (r.pause > 0) { r.pause -= dt; continue; }
      if (!r.route) r.route = this.grid.path(r.x, r.y, r.pts[r.wi].x, r.pts[r.wi].y) || [];
      if (!r.route.length) { r.route = null; r.wi = (r.wi + 1) % r.pts.length; r.pause = 1.6; continue; }
      const p = r.route[0], dx = p.x - r.x, dy = p.y - r.y, d = Math.hypot(dx, dy), st = r.speed * dt;
      if (d > 0.01) r.ang = Math.atan2(dy, dx);
      if (d <= st) { r.x = p.x; r.y = p.y; r.route.shift(); } else { r.x += (dx / d) * st; r.y += (dy / d) * st; }
    }
  }
  doorTimed(d) { return (this.t + d.phase) % (this.doorOpen + this.doorShut) < this.doorOpen; }
  updateDoors(dt) {
    const c = this.cat;
    for (const d of this.doors) {
      const near = this.guards.some((g) => g.state !== 'sleep' && Math.hypot(g.x - d.x, g.y - d.y) < 1.5) || this.carts.some((r) => Math.hypot(r.x - d.x, r.y - d.y) < 1.3);
      // 고양이는 문을 못 열지만, 이미 문 안에 있으면 끼지 않게 닫히지 않는다
      const catIn = Math.abs(c.x - d.x) < 0.78 && Math.abs(c.y - d.y) < 0.78;
      const open = this.doorTimed(d) || near || (d.open && catIn);
      if (open !== d.open) {
        d.open = open;
        if (open) this.grid.shut.delete(d.tx + ',' + d.ty); else this.grid.shut.add(d.tx + ',' + d.ty);
        if (Math.hypot(c.x - d.x, c.y - d.y) < 5) this.fx('door');
      }
      d.amt += ((open ? 1 : 0) - d.amt) * Math.min(1, dt * 9);
    }
  }
  makeRoomba(route) {
    const pts = [...route].map((d) => this.ents.wps[d]);
    const r = this.ents.roomba;
    return { x: r.x, y: r.y, pts, wi: 0, route: null, ang: 0, speed: 1.45, blink: 0 };
  }

  start() { if (this.state === 'intro') this.state = 'play'; }

  // ───────── 프레임 ─────────
  update(dt, input) {
    this.t += dt;
    this.updateFx(dt);
    if (this.state !== 'play') {
      if (this.state === 'caught' || this.state === 'win') this.endT += dt;
      // 인트로 중에도 화면이 살아 있도록 청소기·카메라는 움직인다
      if (this.state === 'intro') { this.updateRoomba(dt); this.updateCarts(dt); this.updateDoors(dt); this.updateSecurity(dt, true); }
      return;
    }
    this.elapsed += dt;
    this.updateCat(dt, input);
    this.updateRoomba(dt);
    this.updateCarts(dt);
    this.updateDoors(dt);
    this.updateSecurity(dt, false);
    for (const g of this.guards) { this.updateGuard(g, dt); if (this.state !== 'play') return; }
    this.checkPickups();
  }

  // ───────── 고양이 ─────────
  updateCat(dt, inp) {
    const c = this.cat;
    c.meowCD = Math.max(0, c.meowCD - dt);
    if (c.bubble && (c.bubble.t -= dt) <= 0) c.bubble = null;
    if (c.riding) {
      c.x = c.riding.x; c.y = c.riding.y - 0.04; c.moving = false; c.run = false; c.hidden = true;
      return;
    }
    const want = inp.mag > 0.08;
    const speed = want ? (inp.run ? CAT_RUN : CAT_SNEAK * Math.min(1, 0.5 + inp.mag * 0.75)) : 0;
    const tx = want ? inp.dx * speed : 0, ty = want ? inp.dy * speed : 0;
    // 얼음 위에서는 천천히 속도가 붙고, 손을 떼도 한참 미끄러진다
    c.ice = this.grid.c(Math.floor(c.x), Math.floor(c.y)) === '~';
    if (c.ice) { const k = Math.min(1, 1.7 * dt); c.vx += (tx - c.vx) * k; c.vy += (ty - c.vy) * k; } else { c.vx = tx; c.vy = ty; }
    const sp = Math.hypot(c.vx, c.vy);
    if (sp > 0.05) {
      const ox = c.x, oy = c.y;
      this.moveCat(c.vx * dt, c.vy * dt);
      if (Math.abs(c.x - ox) < Math.abs(c.vx * dt) * 0.3) c.vx = 0;
      if (Math.abs(c.y - oy) < Math.abs(c.vy * dt) * 0.3) c.vy = 0;
      c.moving = true;
      c.run = want && inp.run;
      if (Math.abs(c.vx) > 0.3) c.face = Math.sign(c.vx);
      c.walkT += dt * sp * (c.ice && !want ? 0.2 : 1);
      if (c.run && !c.ice) {
        c.stepT -= dt;
        if (c.stepT <= 0) { c.stepT = 0.3; this.noise(c.x, c.y + 0.2, 2.5, 'step'); this.fx('step'); }
      }
    } else { c.vx = c.vy = 0; c.moving = false; c.run = false; c.stepT = 0; }
    const wasHidden = c.hidden;
    c.hidden = this.grid.hideAt(c.x, c.y);
    const tk = Math.floor(c.x) + ',' + Math.floor(c.y);
    if (tk !== c.tileKey) {
      c.tileKey = tk;
      const tile = this.grid.c(Math.floor(c.x), Math.floor(c.y));
      if (tile === '%') {
        this.noise(c.x, c.y, 3.6, 'creak');
        this.popup(c.x, c.y - 0.8, '삐걱!', '#e9b98a');
        this.fx('creak');
      } else if (tile === 'w') {
        this.noise(c.x, c.y, 3.4, 'splash');
        this.popup(c.x, c.y - 0.8, '첨벙!', '#9fdcff');
        for (let i = 0; i < 8; i++) this.part(c.x, c.y, (Math.random() - 0.5) * 3, -Math.random() * 2.5, '#bfe8ff', 0.45);
        this.fx('splash');
      }
    }
    if (c.hidden && !wasHidden && this.grid.c(Math.floor(c.x), Math.floor(c.y)) !== 'C') this.fx('hide');
  }
  catFree(x, y) {
    const r = CAT_R, g = this.grid;
    return g.catOK(Math.floor(x - r), Math.floor(y - r)) && g.catOK(Math.floor(x + r), Math.floor(y - r)) &&
      g.catOK(Math.floor(x - r), Math.floor(y + r)) && g.catOK(Math.floor(x + r), Math.floor(y + r));
  }
  moveCat(dx, dy) {
    const c = this.cat, g = this.grid;
    const sp = Math.hypot(dx, dy);
    if (dx) {
      if (this.catFree(c.x + dx, c.y)) c.x += dx;
      else if (Math.abs(dx) > Math.abs(dy) * 0.6) {
        // 문틈으로 미끄러져 들어가도록 줄 가운데로 살짝 당긴다
        const tx = Math.floor(c.x + Math.sign(dx) * (CAT_R + 0.05)), ty = Math.floor(c.y);
        for (const oy of [0, -1, 1]) {
          if (g.catOK(tx, ty + oy) && g.catOK(Math.floor(c.x), ty + oy)) {
            const cy = ty + oy + 0.5, d = cy - c.y;
            if (Math.abs(d) < 0.75) { const ny = c.y + clamp(d, -sp, sp); if (this.catFree(c.x, ny)) c.y = ny; }
            break;
          }
        }
      }
    }
    if (dy) {
      if (this.catFree(c.x, c.y + dy)) c.y += dy;
      else if (Math.abs(dy) > Math.abs(dx) * 0.6) {
        const ty = Math.floor(c.y + Math.sign(dy) * (CAT_R + 0.05)), tx = Math.floor(c.x);
        for (const ox of [0, -1, 1]) {
          if (g.catOK(tx + ox, ty) && g.catOK(tx + ox, Math.floor(c.y))) {
            const cx = tx + ox + 0.5, d = cx - c.x;
            if (Math.abs(d) < 0.75) { const nx = c.x + clamp(d, -sp, sp); if (this.catFree(nx, c.y)) c.x = nx; }
            break;
          }
        }
      }
    }
  }

  actionTarget() {
    if (this.state !== 'play') return null;
    const c = this.cat;
    if (c.riding) return { kind: 'unride', label: '내리기' };
    for (let i = 0; i < this.vents.length; i++) {
      const v = this.vents[i];
      if (this.vents[i ^ 1] && Math.hypot(v.x - c.x, v.y - c.y) < 0.6) return { kind: 'vent', label: '환풍구', obj: this.vents[i ^ 1], from: v };
    }
    const r = this.roomba;
    if (r && Math.hypot(r.x - c.x, r.y - c.y) < 0.95) return { kind: 'ride', label: '타기', obj: r };
    for (const k of this.carts) if (Math.hypot(k.x - c.x, k.y - c.y) < 1) return { kind: 'ride', label: '카트에 숨기', obj: k };
    for (const v of this.vases) if (!v.broken && Math.hypot(v.x - c.x, v.y - c.y) < 1.2) return { kind: 'vase', label: '넘어뜨리기', obj: v };
    for (const s of this.switches) if (s.on && Math.hypot(s.x - c.x, s.y - c.y) < 1.2) return { kind: 'switch', label: '전원 끄기', obj: s };
    return null;
  }
  doAction() {
    const a = this.actionTarget();
    if (!a) return;
    const c = this.cat;
    if (a.kind === 'vent') {
      const to = a.obj;
      for (const p of [a.from, to]) for (let i = 0; i < 8; i++) this.part(p.x, p.y, (Math.random() - 0.5) * 3, -Math.random() * 2.5, '#9aa3b8', 0.5);
      c.x = to.x; c.y = to.y; c.hidden = true; c.tileKey = Math.floor(c.x) + ',' + Math.floor(c.y);
      this.popup(c.x, c.y - 0.9, '쏙!', '#c9d6f0'); this.fx('vent');
    } else if (a.kind === 'ride') {
      c.riding = a.obj; c.hidden = true;
      this.popup(c.x, c.y - 0.9, a.obj.cart ? '쏙!' : '탑승!', '#9fe7ff'); this.fx(a.obj.cart ? 'hide' : 'ride');
    } else if (a.kind === 'unride') {
      const r = c.riding; c.riding = null;
      c.x = r.x; c.y = r.y;
      if (!this.catFree(c.x, c.y)) { c.x = Math.floor(c.x) + 0.5; c.y = Math.floor(c.y) + 0.5; }
      c.hidden = this.grid.hideAt(c.x, c.y);
      this.fx('ride');
    } else if (a.kind === 'vase') {
      const v = a.obj; v.broken = true;
      this.grid.knocked.add(v.tx + ',' + v.ty);
      this.noise(v.x, v.y, 8.5, 'crash');
      for (let i = 0; i < 14; i++) this.part(v.x, v.y - 0.3, (Math.random() - 0.5) * 4, -Math.random() * 3, i % 2 ? '#7fb6e8' : '#f3f0ff', 0.7);
      this.popup(v.x, v.y - 1, '쨍그랑!', '#ffe08a'); this.fx('crash');
      c.face = v.x > c.x ? 1 : -1;
    } else if (a.kind === 'switch') {
      a.obj.on = false; this.power = false;
      this.popup(a.obj.x, a.obj.y - 1, '보안 전원 OFF', '#9dffb0'); this.fx('power');
    }
  }
  meow() {
    const c = this.cat;
    if (this.state !== 'play' || c.meowCD > 0) return false;
    c.meowCD = 3.5;
    c.bubble = { text: '야옹~', t: 1.2 };
    this.noise(c.x, c.y, 6, 'meow');
    this.fx('meow');
    return true;
  }

  checkPickups() {
    const c = this.cat;
    if (!this.fish.taken && Math.hypot(this.fish.x - c.x, this.fish.y - c.y) < 0.6) {
      this.fish.taken = true; c.hasFish = true;
      this.popup(c.x, c.y - 1, this.L.golden ? '황금 생선!' : '생선 획득!', '#ffe27a');
      for (let i = 0; i < 16; i++) this.part(c.x, c.y - 0.3, (Math.random() - 0.5) * 5, -Math.random() * 4, '#ffe27a', 0.8);
      this.fx('fish');
    }
    for (const b of this.bonus) if (!b.taken && Math.hypot(b.x - c.x, b.y - c.y) < 0.6) {
      b.taken = true;
      this.popup(b.x, b.y - 0.9, this.chapter.bonusName + '!', '#ffc1e3');
      for (let i = 0; i < 10; i++) this.part(b.x, b.y - 0.2, (Math.random() - 0.5) * 4, -Math.random() * 3, '#ffd6f0', 0.6);
      this.fx('coin');
    }
    const s = this.ents.cat;
    if (c.hasFish && !c.riding && Math.floor(c.x) === s.tx && Math.floor(c.y) === s.ty) {
      this.state = 'win'; this.endT = 0; this.fx('win');
    }
  }

  // ───────── 로봇청소기 ─────────
  updateRoomba(dt) {
    const r = this.roomba;
    if (!r) return;
    r.blink += dt;
    if (!r.route) r.route = this.grid.path(r.x, r.y, r.pts[r.wi].x, r.pts[r.wi].y) || [];
    if (!r.route.length) { r.route = null; r.wi = (r.wi + 1) % r.pts.length; return; }
    const p = r.route[0], dx = p.x - r.x, dy = p.y - r.y, d = Math.hypot(dx, dy), st = r.speed * dt;
    const want = Math.atan2(dy, dx);
    r.ang += clamp(angDiff(want, r.ang), -4 * dt, 4 * dt);
    if (d <= st) { r.x = p.x; r.y = p.y; r.route.shift(); } else { r.x += (dx / d) * st; r.y += (dy / d) * st; }
  }

  // ───────── 카메라·레이저 ─────────
  laserActive(l) {
    if (!this.power) return false;
    const per = this.laserOn + this.laserOff;
    return (this.t + l.phase) % per < this.laserOn;
  }
  updateSecurity(dt, idle) {
    const c = this.cat;
    this.laserCD = Math.max(0, this.laserCD - dt);
    for (const cam of this.cams) {
      cam.alarmT = Math.max(0, cam.alarmT - dt);
      if (!this.power) continue;
      if (cam.alarmT > 0) {
        const want = Math.atan2(c.y - cam.oy, c.x - cam.ox);
        cam.ang += clamp(angDiff(want, cam.ang), -3 * dt, 3 * dt);
        continue;
      }
      const want = cam.base + Math.sin(((this.t + cam.phase) * Math.PI * 2) / cam.period) * cam.sweep;
      cam.ang += clamp(angDiff(want, cam.ang), -2 * dt, 2 * dt);
      if (idle) continue;
      const d = Math.hypot(c.x - cam.ox, c.y - cam.oy);
      const sees = !c.hidden && d < cam.range && Math.abs(angDiff(Math.atan2(c.y - cam.oy, c.x - cam.ox), cam.ang)) < cam.fov / 2 && this.grid.los(cam.ox, cam.oy, c.x, c.y);
      if (sees) {
        cam.meter += 1.9 * dt * (1.35 - d / cam.range);
        if (cam.meter >= 1) { cam.meter = 0; cam.alarmT = 2.6; this.alarm(c.x, c.y); }
      } else cam.meter = Math.max(0, cam.meter - 0.7 * dt);
    }
    if (!idle && this.power && this.laserCD <= 0 && !c.riding) {
      for (const l of this.lasers) {
        if (!this.laserActive(l)) continue;
        const hit = l.dir === 'h'
          ? Math.abs(c.y - l.y) < 0.3 && c.x > l.tx - 0.2 && c.x < l.tx + 1.2
          : Math.abs(c.x - l.x) < 0.3 && c.y > l.ty - 0.2 && c.y < l.ty + 1.2;
        if (hit) { this.laserCD = 2.2; this.alarm(c.x, c.y); this.fx('zap'); break; }
      }
    }
  }
  alarm(x, y) {
    this.spotted = true;
    this.alarmFlash = 1;
    this.popup(x, y - 1, '삐뽀삐뽀!', '#ff7a8a');
    this.fx('siren');
    for (const g of this.guards) {
      if (g.state === 'chase') continue;
      if (g.state === 'sleep') { this.wake(g); continue; }
      this.investigate(g, x, y, true);
      g.meter = Math.max(g.meter, 0.6);
      this.say(g, g.type === 'dog' ? pick(LINES.dogChase) : pick(LINES.alarm), '!');
    }
  }

  // ───────── 소리 ─────────
  noise(x, y, r, kind) {
    this.noises.push({ x, y, r, t: 0, kind });
    const dist = this.grid.soundMap(x, y, r);
    for (const g of this.guards) {
      if (g.state === 'chase') continue;
      if (kind === 'bark' && g.type === 'dog') continue;
      if (g.chopping && g.state === 'patrol') continue; // 칼질 소리에 묻혀서 못 들음
      if (dist(g.x, g.y) > r) continue;
      if (g.state === 'sleep') { this.wake(g); continue; }
      const already = g.state === 'investigate' && g.target && Math.hypot(g.target.x - x, g.target.y - y) < 1.5;
      this.investigate(g, x, y, false);
      g.meter = Math.max(g.meter, 0.3);
      if (!already) { this.say(g, g.type === 'dog' ? pick(LINES.dogNoise) : pick(LINES.noise), '?'); this.fx('sus'); }
    }
  }
  wake(g) {
    g.state = 'search'; g.timer = 4.5; g.searchBase = g.face; g.route = null;
    this.say(g, '!?', '?');
    this.fx('sus');
  }

  // ───────── 경비 ─────────
  say(g, text, kind = 'say', t = 1.6) { g.bubble = { text, t, kind }; }
  noseOf(g) { return g.T.nose + (this.cat.hasFish ? g.T.fishNose || 0 : 0); }
  canSee(g, d) {
    const c = this.cat;
    if (c.hidden) return false;
    if (d < 0.6) return true;
    const nose = this.noseOf(g);
    if (nose && d < nose) return true;
    if (d > g.T.range) return false;
    if (Math.abs(angDiff(Math.atan2(c.y - g.y, c.x - g.x), g.face)) > g.T.fov / 2) return false;
    return this.grid.los(g.x, g.y, c.x, c.y);
  }
  updateGuard(g, dt) {
    const c = this.cat, T = g.T;
    if (g.bubble && g.bubble.kind !== 'z' && (g.bubble.t -= dt) <= 0) g.bubble = null;
    if (g.state === 'sleep') {
      g.moving = false;
      if (!c.hidden && Math.hypot(c.x - g.x, c.y - g.y) < 0.75) this.wake(g);
      return;
    }
    const d = Math.hypot(c.x - g.x, c.y - g.y);
    const sees = this.canSee(g, d);
    if (sees) {
      let rate = 1.7 * (1.3 - Math.min(1, d / T.range)) * (c.run ? 1.5 : 1) * (this.hard ? 1.25 : 1);
      if (d < 0.75) rate = 12;
      if (g.state !== 'patrol') rate *= 1.25;
      g.meter = Math.min(1, g.meter + rate * dt);
      g.last = { x: c.x, y: c.y };
      g.seenT = 0;
    } else {
      g.seenT += dt;
      if (g.state !== 'chase') g.meter = Math.max(0, g.meter - (g.state === 'suspicious' ? 0.16 : 0.3) * dt);
    }
    if (g.state !== 'chase' && g.meter >= 1) this.startChase(g);

    switch (g.state) {
      case 'patrol':
        if (sees) { this.suspicious(g); break; }
        this.patrol(g, dt);
        break;
      case 'return':
        if (sees) { this.suspicious(g); break; }
        if (this.follow(g, T.walk, dt)) { g.state = 'patrol'; g.route = null; }
        break;
      case 'suspicious':
        g.moving = false;
        if (g.last) g.aim = Math.atan2(g.last.y - g.y, g.last.x - g.x);
        if (sees) g.timer = 0;
        else if ((g.timer += dt) > 0.6) {
          if (g.meter > 0.22 && g.last) this.investigate(g, g.last.x, g.last.y, false);
          else this.giveUp(g);
        }
        break;
      case 'investigate':
        if (sees) { this.suspicious(g); break; }
        if (this.follow(g, g.fast ? T.run * 0.85 : T.walk * 1.2, dt)) {
          g.state = 'search'; g.timer = 2.8; g.searchBase = g.face;
        }
        break;
      case 'search':
        if (sees) { this.suspicious(g); break; }
        g.moving = false;
        g.timer -= dt;
        g.aim = g.searchBase + Math.sin((3 - g.timer) * 2.1) * 1.5;
        if (g.timer <= 0) this.giveUp(g);
        break;
      case 'chase':
        this.chase(g, dt, sees, d);
        break;
    }
    const turn = (g.state === 'chase' ? 2 : 1) * T.turn * dt;
    g.face += clamp(angDiff(g.aim, g.face), -turn, turn);
  }
  suspicious(g) {
    if (g.state === 'suspicious') return;
    g.state = 'suspicious'; g.timer = 0; g.route = null;
    this.say(g, '?', '?');
    this.fx('sus');
  }
  investigate(g, x, y, fast) {
    g.state = 'investigate'; g.fast = fast; g.target = { x, y };
    g.route = this.grid.path(g.x, g.y, x, y) || [];
  }
  giveUp(g) {
    if (g.meter > 0.05 || g.state === 'search') this.say(g, g.type === 'dog' ? pick(LINES.dogGive) : pick(LINES.give), 'say');
    g.state = 'return';
    g.fast = false;
    const p = g.pts[g.pts.length > 1 ? g.wi : 0];
    g.route = this.grid.path(g.x, g.y, p.x, p.y) || [];
  }
  startChase(g) {
    g.state = 'chase'; g.meter = 1; g.repath = 0; g.barkT = 0;
    this.spotted = true;
    this.say(g, g.type === 'dog' ? pick(LINES.dogChase) : pick(LINES.chase), '!');
    this.fx('alert');
  }
  chase(g, dt, sees, d) {
    const c = this.cat, T = g.T;
    if (!c.hidden && d < 0.58) { this.caught(g); return; }
    const track = !c.hidden && (sees || g.seenT < 0.5);
    if (track) {
      g.last = { x: c.x, y: c.y };
      if (this.grid.clear(g.x, g.y, c.x, c.y, 0.25)) g.route = [{ x: c.x, y: c.y }];
      else if ((g.repath -= dt) <= 0) { g.route = this.grid.path(g.x, g.y, c.x, c.y) || []; g.repath = 0.25; }
    }
    const arrived = this.follow(g, T.run, dt);
    if (g.type === 'dog' && (g.barkT -= dt) <= 0) { g.barkT = 1.3; this.noise(g.x, g.y, 6, 'bark'); this.fx('bark'); }
    if (g.seenT > 1.4 || (!track && arrived)) {
      g.meter = 0.55;
      this.say(g, g.type === 'dog' ? pick(LINES.dogNoise) : pick(LINES.lost), '?');
      const L = g.last || { x: g.x, y: g.y };
      this.investigate(g, L.x, L.y, false);
      if (!g.route.length) { g.state = 'search'; g.timer = 3; g.searchBase = g.face; }
    }
  }
  caught(g) {
    this.state = 'caught'; this.endT = 0; this.catcher = g;
    this.say(g, g.type === 'dog' ? '왈!!' : '잡았다!', '!', 9);
    this.cat.bubble = { text: '냐앙…', t: 9 };
    this.fx('caught');
  }
  follow(g, speed, dt) {
    if (!g.route || !g.route.length) { g.moving = false; return true; }
    const p = g.route[0], dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy), st = speed * dt;
    if (d > 0.02) g.aim = Math.atan2(dy, dx);
    if (d <= st) { g.x = p.x; g.y = p.y; g.route.shift(); } else { g.x += (dx / d) * st; g.y += (dy / d) * st; }
    g.moving = true;
    g.walkT += st;
    return g.route.length === 0;
  }
  patrol(g, dt) {
    if (g.pts.length === 1) {
      const p = g.pts[0];
      if (Math.hypot(p.x - g.x, p.y - g.y) > 0.08) {
        if (!g.route) g.route = this.grid.path(g.x, g.y, p.x, p.y) || [];
        if (this.follow(g, g.T.walk, dt)) g.route = null;
        return;
      }
      g.moving = false;
      if (g.sleeper) { g.state = 'sleep'; g.meter = 0; g.bubble = { text: 'Zz', t: 999, kind: 'z' }; return; }
      if (g.T.chop) { this.chop(g, dt); return; }
      if ((g.lookT += dt) > 2.3) { g.lookT = 0; g.li = (g.li + 1) % g.look.length; }
      g.aim = g.look[g.li];
      return;
    }
    if (g.pause > 0) { g.pause -= dt; g.moving = false; return; }
    const p = g.pts[g.wi];
    if (!g.route) g.route = this.grid.path(g.x, g.y, p.x, p.y) || [];
    if (this.follow(g, g.T.walk, dt)) { g.route = null; g.wi = (g.wi + 1) % g.pts.length; g.pause = 0.7; }
  }

  chop(g, dt) {
    g.chopT -= dt;
    if (g.chopping) {
      g.aim = g.look[0];
      if ((g.tickT -= dt) <= 0) {
        g.tickT = 0.34;
        this.noises.push({ x: g.x + Math.cos(g.look[0]) * 0.7, y: g.y + Math.sin(g.look[0]) * 0.7, r: 1.3, t: 0, kind: 'chop' });
        if (Math.hypot(this.cat.x - g.x, this.cat.y - g.y) < 7) this.fx('chop');
      }
      if (g.chopT <= 0) { g.chopping = false; g.chopT = this.hard ? 2.2 : 1.8; this.say(g, '…흠?', '?', 1); }
    } else {
      g.aim = g.look.length > 1 ? g.look[1] : g.look[0] + Math.PI;
      if (g.chopT <= 0) { g.chopping = true; g.chopT = this.hard ? 2.6 : 3.4; g.tickT = 0; }
    }
  }

  // ───────── 연출 ─────────
  popup(x, y, text, color) { this.popups.push({ x, y, text, color, t: 0 }); }
  part(x, y, vx, vy, color, life) { this.parts.push({ x, y, vx, vy, color, life, t: 0 }); }
  updateFx(dt) {
    this.alarmFlash = Math.max(0, this.alarmFlash - dt * 0.8);
    this.noises = this.noises.filter((n) => (n.t += dt) < 0.9);
    this.popups = this.popups.filter((p) => (p.t += dt) < 1.4);
    this.parts = this.parts.filter((p) => {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 9 * dt;
      return p.t < p.life;
    });
  }

  stars() {
    return [true, this.bonus.every((b) => b.taken), !this.spotted];
  }
  chased() { return this.guards.some((g) => g.state === 'chase'); }
  danger() {
    let m = 0;
    for (const g of this.guards) m = Math.max(m, g.state === 'chase' ? 1 : g.meter);
    for (const c of this.cams) m = Math.max(m, c.meter);
    return m;
  }
}
