(function (root) {
  'use strict';
  const WIDTH = 430, HEIGHT = 800;
  const ANCHOR = { x: 108, y: 145 }, NEST = { x: 88, y: 475, radius: 58 };
  const TYPES = {
    star: { color: '#f5d17e', rest: 80, gravity: 1, weight: 1 },
    sprout: { color: '#f2ddbe', rest: 76, gravity: 1.15, weight: 1.25 },
    cloud: { color: '#fff3df', rest: 86, gravity: .48, weight: .3 }
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  class HugGame {
    constructor(seed = 120) { this.seed = seed; this.reset(); }
    reset() {
      this.rng = this.seed; this.phase = 'ready'; this.time = 30; this.elapsed = 0;
      this.score = 0; this.saved = 0; this.maxChain = 0; this.lives = 3;
      this.tension = 0; this.strain = 0; this.drag = null; this.events = [];
      this.cooldown = 0; this.batch = 0; this.nextId = 1; this.resetChain();
    }
    random() { this.rng = (Math.imul(this.rng, 1664525) + 1013904223) >>> 0; return this.rng / 4294967296; }
    node(type, x, y, rest) { return { type, x, y, px: x, py: y, rest: rest || TYPES[type].rest, bounce: 0 }; }
    resetChain() {
      this.nodes = [this.node('star', 143, 267, 140)];
      this.drag = null; this.tension = 0; this.strain = 0;
      this.targets = [{ id: this.nextId++, type: 'sprout', x: 285, y: 325, phase: 0 }];
    }
    get last() { return this.nodes[this.nodes.length - 1]; }
    get pending() { return this.nodes.length - 1; }
    get reward() { return this.pending * 100 + this.pending * (this.pending - 1) * 25; }
    get totalRest() { return this.nodes.reduce((sum, n) => sum + n.rest, 0); }
    begin(x, y) {
      if (!['ready', 'playing'].includes(this.phase) || this.cooldown > 0 || distance({ x, y }, this.last) > 85) return false;
      if (this.phase === 'ready') { this.phase = 'playing'; this.events.push({ type: 'start' }); }
      this.drag = { x: this.last.x, y: this.last.y, wantedX: x, wantedY: y };
      return true;
    }
    move(x, y) {
      if (!this.drag || this.phase !== 'playing') return;
      this.drag.wantedX = clamp(x, 24, 406); this.drag.wantedY = clamp(y, 160, 665);
      const dx = this.drag.wantedX - ANCHOR.x, dy = this.drag.wantedY - ANCHOR.y;
      const d = Math.hypot(dx, dy), max = this.totalRest * 2.12;
      this.drag.x = ANCHOR.x + dx * Math.min(1, max / d);
      this.drag.y = ANCHOR.y + dy * Math.min(1, max / d);
    }
    nearTarget() {
      if (!this.drag || this.nodes.length >= 6) return null;
      return this.targets.filter(t => distance(this.last, t) < 52).sort((a,b) => distance(this.last,a) - distance(this.last,b))[0] || null;
    }
    release(cancel = false) {
      if (!this.drag) return false;
      const near = this.nearTarget();
      const bank = !cancel && this.pending > 0 && distance(this.last, NEST) < NEST.radius + 13;
      this.drag = null;
      if (cancel || this.phase !== 'playing') return false;
      if (bank) { this.bank(); return true; }
      if (near) { this.capture(near); return true; }
      this.events.push({ type: 'miss', x: this.last.x, y: this.last.y });
      return false;
    }
    capture(target) {
      const prev = this.last;
      const parent = this.nodes.length > 1 ? this.nodes[this.nodes.length - 2] : ANCHOR;
      const dx = target.x - parent.x, dy = target.y - parent.y, d = Math.hypot(dx, dy) || 1;
      prev.x = target.x - dx / d * 58; prev.y = target.y - dy / d * 58;
      prev.px = prev.x; prev.py = prev.y;
      const next = this.node(target.type, target.x, target.y); next.bounce = 1;
      this.nodes.push(next); this.maxChain = Math.max(this.maxChain, this.pending);
      this.strain = Math.max(0, this.strain - .45);
      this.events.push({ type: 'catch', x: target.x, y: target.y, friend: target.type, count: this.pending });
      this.makeTargets();
    }
    makeTargets() {
      if (this.nodes.length >= 6) { this.targets = []; return; }
      const n = this.nodes.length;
      const arrangements = {
        2: [[350, 413], [211, 449]],
        3: [[343, 548], [241, 355]],
        4: [[333, 470], [202, 607]],
        5: [[352, 597], [214, 526]]
      };
      this.targets = arrangements[n].map(([x,y], i) => ({
        id: this.nextId++, type: i === 0 ? (n % 2 ? 'star' : 'sprout') : 'cloud',
        x: x + (this.random() - .5) * 12, y: y + (this.random() - .5) * 12, phase: this.random() * Math.PI * 2
      }));
    }
    bank() {
      const amount = this.reward, count = this.pending;
      if (!count || this.phase !== 'playing') return false;
      this.score += amount; this.saved += count; this.batch++;
      this.events.push({ type: 'bank', amount, count, friends: this.nodes.slice(1).map(n => ({...n})) });
      this.resetChain(); this.cooldown = .45;
      return true;
    }
    snap() {
      this.lives--; this.events.push({ type: 'snap', friends: this.nodes.slice(1).map(n => ({...n})) });
      this.resetChain(); this.cooldown = .7;
      if (this.lives <= 0) this.end('lives');
    }
    end(reason) {
      if (this.phase === 'ended') return;
      this.phase = 'ended'; this.drag = null;
      this.events.push({ type: 'end', reason, unbanked: this.pending });
    }
    tick(dt) {
      if (!['ready','playing'].includes(this.phase)) return;
      dt = clamp(dt, 0, 1 / 30); this.elapsed += dt;
      this.cooldown = Math.max(0, this.cooldown - dt);
      if (this.phase === 'playing') { this.time = Math.max(0, this.time - dt); if (!this.time) { this.end('time'); return; } }
      const step = dt * 60, lastIndex = this.nodes.length - 1;
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i]; n.bounce = Math.max(0, n.bounce - dt * 3);
        if (this.drag && i === lastIndex) {
          n.x += (this.drag.x - n.x) * Math.min(1, step * .62);
          n.y += (this.drag.y - n.y) * Math.min(1, step * .62);
          n.px = n.x; n.py = n.y; continue;
        }
        const vx = (n.x - n.px) * Math.pow(.975, step), vy = (n.y - n.py) * Math.pow(.98, step);
        n.px = n.x; n.py = n.y;
        n.x += vx + Math.sin(this.elapsed * 1.6 + i) * .035 * step;
        n.y += vy + .19 * TYPES[n.type].gravity * step * step;
      }
      // Soft, damped distance constraints. Finger pins only the end friend; the rest respond physically.
      for (let iter = 0; iter < 12; iter++) {
        for (let i = 0; i < this.nodes.length; i++) {
          const a = i ? this.nodes[i-1] : ANCHOR, b = this.nodes[i];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .001;
          const target = this.drag ? b.rest * 1.04 : b.rest;
          const error = d - target;
          const strength = d < 57 ? .65 : this.drag ? .045 : .18;
          const amount = (d < 57 ? d - 57 : error) / d * strength;
          const pinnedA = i === 0, pinnedB = !!this.drag && i === lastIndex;
          if (!pinnedA) { a.x += dx * amount * (pinnedB ? 1 : .5); a.y += dy * amount * (pinnedB ? 1 : .5); }
          if (!pinnedB) { b.x -= dx * amount * (pinnedA ? 1 : .5); b.y -= dy * amount * (pinnedA ? 1 : .5); }
        }
      }
      let ratio = 1;
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i], a = i ? this.nodes[i-1] : ANCHOR;
        ratio = Math.max(ratio, distance(a,n) / n.rest);
        n.x = clamp(n.x, 24, 406); n.y = clamp(n.y, 175, 675);
      }
      const weight = this.nodes.slice(1).reduce((s,n)=>s+TYPES[n.type].weight,0);
      const effort = this.drag ? Math.max(0, (ratio - 1.28) / .9) : .03;
      const wanted = this.drag ? Math.max(0, (distance(ANCHOR,{x:this.drag.wantedX,y:this.drag.wantedY}) / this.totalRest - 1.75) * .9) : 0;
      const desired = clamp(effort + wanted + Math.max(0,weight-1)*.11,0,1.4);
      this.tension += (desired - this.tension) * Math.min(1,dt*9);
      this.strain = clamp(this.strain + dt * (this.tension > .96 ? (this.tension-.9)*3.6 : -.7),0,1.2);
      if (this.strain >= 1.2 && this.phase === 'playing') this.snap();
    }
  }
  const api = { HugGame, WIDTH, HEIGHT, ANCHOR, NEST, TYPES, clamp, distance };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else Object.assign(root, api);
})(typeof window === 'undefined' ? globalThis : window);
