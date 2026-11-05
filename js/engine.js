'use strict';
/* ============================================================
   Game engine: simulation + rendering. DOM-free except the canvas
   (pass canvas = null to run headless for tests).
   ============================================================ */

const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const keyOf = (x, y) => x + ',' + y;
// accessibility switches the UI sets: cb = colour-blind friendly highlights & bars
const A11Y = { cb: false };

function prepRoute(r) {
  const pts = r.pts.map(p => [p[0] + 0.5, p[1] + 0.5]), segs = []; let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy);
    segs.push({ x: pts[i][0], y: pts[i][1], dx: dx / l, dy: dy / l, l, start: len }); len += l;
  }
  return { air: r.air, pts, segs, len };
}
// a side route that ends where it joins another walking route carries on along that route to the reactor
function joinRoutes(routes) {
  const ground = routes.filter(r => !r.air), main = ground[0]; if (!main) return routes;
  const same = (a, b) => a[0] === b[0] && a[1] === b[1], end = main.pts[main.pts.length - 1];
  const onSeg = (p, a, b) => (p[0] - a[0]) * (b[1] - a[1]) === (p[1] - a[1]) * (b[0] - a[0]) &&
    p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
  const extend = (r, depth) => {
    const e = r.pts[r.pts.length - 1]; if (r.air || same(e, end) || depth > 3) return r;
    for (const o of ground) {
      if (o === r) continue;
      for (let i = 0; i < o.pts.length - 1; i++) if (onSeg(e, o.pts[i], o.pts[i + 1])) {
        const rest = o.pts.slice(i + 1).filter((q, j) => j > 0 || !same(q, e));
        return extend(Object.assign({}, r, { pts: r.pts.concat(rest) }), depth + 1);
      }
    }
    return r;
  };
  return routes.map(r => extend(r, 0));
}
function posAt(route, d) {
  const s = route.segs; if (d <= 0) return { x: s[0].x, y: s[0].y, dx: s[0].dx, dy: s[0].dy };
  for (const g of s) if (d <= g.start + g.l) { const k = d - g.start; return { x: g.x + g.dx * k, y: g.y + g.dy * k, dx: g.dx, dy: g.dy }; }
  const g = s[s.length - 1]; return { x: g.x + g.dx * g.l, y: g.y + g.dy * g.l, dx: g.dx, dy: g.dy };
}

class Game {
  constructor(canvas, hooks) {
    this.cv = canvas; this.ctx = canvas ? canvas.getContext('2d') : null; this.hooks = hooks || {};
    this.scale = 1; this.dpr = 1; this.board = null; this.hover = null; this.hint = null; this.lock = null;
    this.speed = 1; this.paused = false; this.raf = 0; this.last = 0; this.acc = 0; this.clock = 0;
  }
  emit(n, d) { if (this.hooks.emit) this.hooks.emit(n, d); }
  allow(a) { return !this.lock || this.lock(a); }

  /* ---------- setup ---------- */
  start(level, diffKey, opts) {
    opts = opts || {};
    this.level = level; this.diff = DIFFICULTY[diffKey] || DIFFICULTY.captain; this.th = THEMES[level.theme];
    this.mods = new Set(opts.mods || []); this.ups = opts.ups || {}; this.endless = !!level.endless;
    this.hpMul = this.mods.has('tough') ? 1.3 : 1; this.spdMul = this.mods.has('fast') ? 1.2 : 1; this.timeScale = 1; this.endT = 0;
    if (this.endless) { this.erng = mulberry32(level.id * 131 + 17); level.waves = []; for (let i = 1; i <= 2; i++) level.waves.push(endlessWave(level, i, this.erng)); }
    this.cols = level.cols; this.rows = level.rows;
    this.routes = joinRoutes(level.routes).map(prepRoute);
    this.pathSet = new Set(); dirsOf(level.routes).forEach((_, k) => this.pathSet.add(k));
    this.highSet = new Set(level.high.map(p => keyOf(p[0], p[1])));
    this.dp = level.startDP + this.diff.startDP; this.dpMax = 99; this.dpRate = this.diff.dp;
    if (this.mods.has('poor')) { this.dpRate *= 0.7; this.dp = Math.round(this.dp * 0.7); }
    this.maxLives = Math.max(3, level.lives + this.diff.lives); if (this.mods.has('glass')) this.maxLives = Math.max(2, Math.ceil(this.maxLives / 2)); this.lives = this.maxLives;
    this.t = 0; this.crew = []; this.foes = []; this.shots = []; this.fx = []; this.queue = [];
    this.waveIdx = -1; this.waveStart = 0; this.autoWaves = opts.autoWaves !== false;
    this.state = 'prep'; this.kills = 0; this.uid = 1; this.shake = 0; this.placing = null; this.selected = null;
    this.hint = null; this.lock = null; this.paused = false; this.speed = 1; this.acc = 0;
    this.avail = (opts.squad && opts.squad.length ? opts.squad.filter(k => level.crew.includes(k)) : level.crew).slice(); this.deployed = 0; this.rng = mulberry32(level.id * 31 + 7);
    if (this.mods.has('nomed')) this.avail = this.avail.filter(k => !CREW[k].heal && !CREW[k].shields);
    this.setupDoors(); this.sabo = null; this.saboQ = []; this.darkA = 0; this.saboCount = 0; this.doorUses = 0;
    this.board = null; if (this.cv) this.resize(this.cssW || 800, this.cssH || 480);
    this.emit('start', level);
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; this.state = 'stopped'; }
  run() {
    cancelAnimationFrame(this.raf); this.last = performance.now();
    const loop = now => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.clock += dt;
      if (!this.paused && this.state !== 'won' && this.state !== 'lost' && !this.frozen) {
        this.acc += dt * this.speed * this.timeScale;
        while (this.acc >= 1 / 60) { this.update(1 / 60); this.acc -= 1 / 60; }
      } else if (this.paused || this.frozen) this.acc = 0;
      this.render();
      this.emit('frame');
    };
    this.raf = requestAnimationFrame(loop);
  }
  resize(w, h) {
    if (!this.cv || !this.level) return;
    this.cssW = w; this.cssH = h;
    const sc = Math.min(w / (this.cols * TILE), h / (this.rows * TILE));
    this.scale = sc; this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.floor(this.cols * TILE * sc), ch = Math.floor(this.rows * TILE * sc);
    this.cv.style.width = cw + 'px'; this.cv.style.height = ch + 'px';
    this.cv.width = Math.round(cw * this.dpr); this.cv.height = Math.round(ch * this.dpr);
    this.board = renderBoard(this.level, TILE * sc * this.dpr);
    this.emit('resize', { cw, ch });
  }

  /* ---------- doors & sabotage ---------- */
  setupDoors() {
    const level = this.level, dirs = dirsOf(level.routes), easy = !!this.diff.easy;
    this.doorTime = DOOR.closed * (easy ? 1.35 : 1); this.doorCd = DOOR.cooldown;
    this.doors = (this.mods.has('nodoors') ? [] : level.doors || []).map(([x, y]) => ({ x, y, dir: dirs.get(keyOf(x, y)) || [1, 0], t: 0, cd: 0, anim: 0 }));
    // where each walking route enters each door tile: foes stop just short of it while it's shut
    this.routes.forEach(r => {
      r.doorStops = [];
      if (r.air) return;
      for (const door of this.doors) {
        for (let d = 0; d <= r.len; d += 0.02) {
          const q = posAt(r, d);
          if (Math.floor(q.x) === door.x && Math.floor(q.y) === door.y) { if (d > 0.3) r.doorStops.push({ door, d: d - 0.12 }); break; }
        }
      }
    });
    // spare floor tiles where repair panels can pop up during sabotage
    const walls = new Set((level.walls || []).map(p => keyOf(p[0], p[1]))), pool = [];
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) if (this.tileKind(x, y) === 'none' && !walls.has(keyOf(x, y))) pool.push([x, y]);
    const rnd = mulberry32(level.id * 977 + 3);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    this.panelPool = pool;
  }
  doorAt(x, y) { return this.doors.find(d => d.x === x && d.y === y) || null; }
  slamDoor(door) {
    if (door.t > 0) { this.emit('deny', 'Already shut!'); return false; }
    if (door.cd > 0) { this.emit('deny', 'Door recharging… ' + Math.ceil(door.cd) + 's'); return false; }
    if (!this.allow({ kind: 'door' })) return false;
    door.t = this.doorTime; door.cd = this.doorCd; this.doorUses++;
    this.ring((door.x + 0.5) * TILE, (door.y + 0.5) * TILE, 8, 46, '#ffd84a', 0.35);
    this.emit('sfx', 'door'); this.emit('door', door); return true;
  }
  rangeOf(c) { return c.b.range * (this.sabo && this.sabo.kind === 'lights' && !c.b.heal ? 0.7 : 1); }
  startSabotage(kind) {
    const def = SABOTAGE[kind], easy = !!this.diff.easy, pool = this.panelPool;
    if (!def || !pool.length) return;
    const first = pool[this.saboCount % pool.length], panels = [first];
    if (def.panels > 1) { let best = null, bd = -1; for (const p of pool) { const d = dist2(p[0], p[1], first[0], first[1]); if (d > bd) { bd = d; best = p; } } panels.push(best); }
    this.saboCount++;
    const dur = def.dur * (easy ? 1.4 : 1);
    this.sabo = { kind, def, t: dur, dur, need: Math.max(1, def.taps - (easy ? 1 : 0)), panels: panels.map(([x, y]) => ({ x, y, taps: 0 })) };
    this.shake = Math.max(this.shake, 0.25);
    this.emit('sfx', 'alarm'); this.emit('sabotage', this.sabo);
  }
  panelAt(x, y) { return this.sabo && this.sabo.panels.find(p => p.x === x && p.y === y) || null; }
  fixPanel(p) {
    const s = this.sabo; if (!s || p.taps >= s.need) return false;
    if (!this.allow({ kind: 'fix' })) return false;
    p.taps++; this.ring((p.x + 0.5) * TILE, (p.y + 0.5) * TILE, 6, 40, p.taps >= s.need ? '#7dff9c' : '#ffd84a', 0.3);
    this.emit('sfx', p.taps >= s.need ? 'fixed' : 'fix');
    if (s.panels.every(q => q.taps >= s.need)) this.endSabotage(true);
    return true;
  }
  endSabotage(fixed) {
    const s = this.sabo; if (!s) return; this.sabo = null;
    if (!fixed && s.def.fail) {
      const loss = this.diff.easy ? 1 : s.def.fail;
      this.lives = Math.max(this.diff.safe ? 1 : 0, this.lives - loss); this.shake = 0.6;
      const ex = this.reactorPos(); this.fx.push({ k: 'text', x: ex[0], y: ex[1] - 30, txt: '-' + loss + ' ♥', color: '#ff5a6a', life: 1.4, age: 0 });
      this.ring(ex[0], ex[1], 10, 200, '#ff4d6a', 0.8); this.emit('sfx', 'leak'); this.emit('leak', null);
    }
    this.emit('sabotage-end', { kind: s.kind, fixed, left: s.t });
  }
  reactorPos() { const g = this.routes.find(r => !r.air) || this.routes[0], e = g.pts[g.pts.length - 1]; return [e[0] * TILE, e[1] * TILE]; }
  updateHazards(dt) {
    for (const d of this.doors) { d.t = Math.max(0, d.t - dt); d.cd = Math.max(0, d.cd - dt); d.anim += ((d.t > 0 ? 1 : 0) - d.anim) * Math.min(1, dt * 14); }
    if (this.saboQ.length && this.saboQ[0].time <= this.t) {
      if (this.sabo) this.saboQ[0].time = this.t + 2; else this.startSabotage(this.saboQ.shift().kind);
    }
    if (this.sabo) { this.sabo.t -= dt; if (this.sabo.t <= 0) this.endSabotage(false); }
    this.darkA += ((this.sabo && this.sabo.kind === 'lights' ? 1 : 0) - this.darkA) * Math.min(1, dt * 3);
  }

  /* ---------- helpers ---------- */
  crewAt(x, y) { return this.crew.find(c => c.x === x && c.y === y) || null; }
  tileKind(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return 'none';
    const k = keyOf(x, y); return this.pathSet.has(k) ? 'path' : this.highSet.has(k) ? 'high' : 'none';
  }
  up(type) { return this.ups[type] || {}; }
  stat(c) {
    if (c.barricade) { // scales with its Wrench
      const o = c.owner, u = this.up('wrench'), steel = o.skillT > 0;
      return { maxHp: Math.round(BARRICADE.hp * (1 + 0.3 * o.lv) * (1 + 0.1 * (u.tough || 0))), atk: 0, def: BARRICADE.def * (steel ? 2 : 1), interval: 1, heal: 0, block: steel ? 3 : BARRICADE.block };
    }
    const b = c.b, lv = c.lv, skill = c.skillT > 0, u = this.up(c.type), pw = 1 + 0.08 * (u.power || 0);
    return {
      maxHp: Math.round(b.hp * (1 + 0.3 * lv) * (1 + 0.1 * (u.tough || 0))),
      atk: b.atk * (1 + 0.28 * lv) * pw * (c.type === 'brick' && skill ? 1.8 : 1),
      def: b.def * (c.type === 'tank' && skill ? 2 : 1),
      interval: b.interval * (c.type === 'rook' && skill ? 0.5 : 1) * (c.type === 'marshal' && skill ? 1 / 3 : 1),
      heal: (b.heal || 0) * (1 + 0.3 * lv) * pw,
      repair: (b.repair || 0) * (1 + 0.3 * lv) * pw,
      block: b.block
    };
  }
  spMaxOf(type) { return CREW[type].skill.sp * (1 - 0.1 * (this.up(type).focus || 0)); }
  promoteCost(c) { return c.lv >= PROMOTE_MAX ? null : Math.ceil(c.b.cost * (c.lv === 0 ? 0.8 : 1.2)); }
  refund(c) { return Math.floor(c.spent * 0.5); }
  progress() { return { wave: Math.max(0, this.waveIdx + 1), total: this.endless ? Infinity : this.level.waves.length }; }
  nextWaveIn() {
    if (this.waveIdx < 0 || this.waveIdx >= this.level.waves.length - 1) return null;
    return Math.max(0, this.level.waves[this.waveIdx].dur - (this.t - this.waveStart));
  }

  /* ---------- player actions ---------- */
  canPlace(type, x, y) {
    const b = CREW[type]; if (!b || !this.avail.includes(type)) return { ok: false, why: 'Not available' };
    const kind = this.tileKind(x, y);
    if (kind === 'none') return { ok: false, why: 'Can’t build here' };
    if (this.doorAt(x, y)) return { ok: false, why: 'That’s a door — tap it to slam it!' };
    if (this.crewAt(x, y)) return { ok: false, why: 'Occupied' };
    if (kind !== b.ground) return { ok: false, why: b.ground === 'path' ? b.name + ' stands on the floor path' : b.name + ' needs a high deck' };
    if (this.dp < b.cost) return { ok: false, why: 'Need ' + b.cost + ' DP' };
    return { ok: true };
  }
  deploy(type, x, y) {
    const r = this.canPlace(type, x, y);
    if (!r.ok) { this.emit('deny', r.why); return null; }
    if (!this.allow({ kind: 'deploy', type, x, y })) return null;
    const b = CREW[type];
    this.dp -= b.cost;
    const c = { id: this.uid++, type, b, x, y, cx: (x + 0.5) * TILE, cy: (y + 0.5) * TILE, lv: 0, hp: b.hp, sp: 0, spMax: this.spMaxOf(type), skillT: 0, shield: 0, buildT: BARRICADE.buildT, blocking: [], atkT: 0.35, facing: 1, flash: 0, spent: b.cost, born: this.t, ready: false };
    c.hp = this.stat(c).maxHp; this.crew.push(c); this.deployed++;
    this.puff(c.cx, c.cy + 10, b.color, 8); this.ring(c.cx, c.cy, 10, 40, b.color, 0.45);
    this.emit('deploy', c); this.emit('sfx', 'deploy');
    return c;
  }
  promote(c) {
    const cost = this.promoteCost(c); if (cost == null || this.dp < cost) { this.emit('deny', cost == null ? 'Max rank!' : 'Need ' + cost + ' DP'); return false; }
    if (!this.allow({ kind: 'promote' })) return false;
    const old = this.stat(c).maxHp; this.dp -= cost; c.spent += cost; c.lv++;
    c.hp = Math.min(this.stat(c).maxHp, c.hp + (this.stat(c).maxHp - old));
    this.ring(c.cx, c.cy, 12, 56, '#ffd84a', 0.6); this.emit('sfx', 'promote'); this.emit('promote', c); return true;
  }
  retreat(c) {
    if (!this.allow({ kind: 'retreat' })) return;
    this.dp = Math.min(this.dpMax, this.dp + this.refund(c)); this.removeCrew(c, false);
    this.emit('sfx', 'retreat'); if (this.selected === c) this.selected = null; this.emit('select', null);
  }
  removeCrew(c, died) {
    c.blocking.forEach(f => { f.blockedBy = null; }); c.blocking = [];
    this.crew = this.crew.filter(k => k !== c);
    this.puff(c.cx, c.cy, c.b.color, 10);
    if (c.barricade) { c.owner.wall = null; c.owner.buildT = BARRICADE.rebuildT; if (died) { this.puff(c.cx, c.cy - 10, '#c89858', 12); this.emit('sfx', 'boom'); } return; }
    if (c.wall) this.removeCrew(c.wall, false);
    if (died) { this.fx.push({ k: 'soul', x: c.cx, y: c.cy, color: c.b.color, life: 1.2, age: 0 }); this.emit('sfx', 'hit'); }
  }
  /* ---------- Wrench's barricade ---------- */
  buildSpot(c) {
    const ends = new Set(this.routes.flatMap(r => [r.pts[0], r.pts[r.pts.length - 1]].map(p => keyOf(Math.floor(p[0]), Math.floor(p[1])))));
    const reach = this.rangeOf(c) + 0.05; let best = null, bd = 1e9;
    for (const k of this.pathSet) {
      const [x, y] = k.split(',').map(Number), d = Math.hypot(x - c.x, y - c.y);
      if (d > reach || ends.has(k) || this.crewAt(x, y) || this.doorAt(x, y)) continue;
      if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  }
  build(c) {
    const at = this.buildSpot(c); if (!at) return null;
    const b = { name: BARRICADE.name, color: '#c89858', block: BARRICADE.block, hp: BARRICADE.hp, def: BARRICADE.def, atk: 0, interval: 1, range: 0, skill: { sp: 1e9, dur: 0 } };
    const w = { id: this.uid++, type: 'barricade', barricade: true, owner: c, b, x: at[0], y: at[1], cx: (at[0] + 0.5) * TILE, cy: (at[1] + 0.5) * TILE, lv: 0, hp: 0, sp: 0, spMax: 1e9, skillT: 0, shield: 0, blocking: [], atkT: 0, facing: 1, flash: 0, spent: 0, born: this.t };
    w.hp = this.stat(w).maxHp; c.wall = w; this.crew.push(w);
    this.puff(w.cx, w.cy, '#c89858', 10); this.ring(w.cx, w.cy, 8, 40, '#ffcc1f', 0.4); this.emit('sfx', 'build'); this.emit('build', w);
    return w;
  }
  useSkill(c) {
    if (!c || c.skillT > 0 || c.sp < c.spMax) { this.emit('deny', 'Skill charging...'); return false; }
    if (!this.allow({ kind: 'skill' })) return false;
    const sk = c.b.skill; c.sp = 0; c.skillT = sk.dur; c.ready = false;
    this.ring(c.cx, c.cy, 10, 110, '#fff7a8', 0.6); this.emit('sfx', 'skill'); this.emit('skill', c);
    if (c.type === 'lumi') {
      const r = c.b.range * TILE; this.crew.forEach(a => { if (dist2(a.cx, a.cy, c.cx, c.cy) <= r * r) { a.hp = Math.min(this.stat(a).maxHp, a.hp + this.stat(a).maxHp * 0.5); this.pluses(a); } });
      this.ring(c.cx, c.cy, 20, r, '#7dff9c', 0.8);
    }
    if (c.type === 'echo') this.ring(c.cx, c.cy, 20, c.b.range * TILE, '#7df', 0.8);
    if (c.type === 'wrench') { if (!c.wall) this.build(c); if (c.wall) { c.wall.hp = this.stat(c.wall).maxHp; this.ring(c.wall.cx, c.wall.cy, 10, 50, '#9aa6bc', 0.6); } }
    if (c.type === 'bubbles') { const r = this.rangeOf(c) * TILE; this.crew.forEach(a => { if (!a.barricade && dist2(a.cx, a.cy, c.cx, c.cy) <= r * r) this.giveShield(a); }); this.ring(c.cx, c.cy, 20, r, '#ffb6e8', 0.8); }
    return true;
  }
  callNextWave() {
    if (this.state === 'prep') { this.startWave(); return true; }
    if (this.waveIdx >= this.level.waves.length - 1) return false;
    const left = this.nextWaveIn(); this.dp = Math.min(this.dpMax, this.dp + Math.min(6, Math.floor(left / 5)));
    this.startWave(); return true;
  }
  setSpeed(s) { this.speed = s; }

  /* ---------- waves ---------- */
  startWave() {
    if (this.waveIdx >= this.level.waves.length - 1) return;
    this.state = 'playing'; this.waveIdx++; this.waveStart = this.t;
    if (this.endless) while (this.level.waves.length < this.waveIdx + 3) this.level.waves.push(endlessWave(this.level, this.level.waves.length + 1, this.erng));
    const w = this.level.waves[this.waveIdx];
    for (const s of w.spawns) for (let i = 0; i < s.n; i++) this.queue.push({ time: this.t + s.delay + i * s.gap + 0.4, type: s.type, route: s.route, mul: w.mul });
    this.queue.sort((a, b) => a.time - b.time);
    const sk = this.endless ? ((this.waveIdx + 1) % ENDLESS.saboEvery === 0 ? ['lights', 'o2', 'reactor'][((this.waveIdx + 1) / ENDLESS.saboEvery - 1) % 3] : null) : this.level.sabo && this.level.sabo[this.waveIdx + 1];
    if (sk) { this.saboQ.push({ time: this.t + 6, kind: sk }); this.saboQ.sort((a, b) => a.time - b.time); }
    const radio = this.level.radio && this.level.radio[this.waveIdx + 1];
    this.emit('wave', { n: this.waveIdx + 1, total: this.endless ? 0 : this.level.waves.length, radio, last: !this.endless && this.waveIdx === this.level.waves.length - 1, endless: this.endless });
    this.emit('sfx', 'wave');
  }
  spawnFoe(type, routeIdx, d0, mul) {
    const def = FOES[type], r = this.routes[routeIdx] || this.routes[0];
    const hp = def.hp * this.diff.hp * this.hpMul * (mul || 1);
    const f = {
      id: this.uid++, type, def, route: routeIdx, r, d: d0 || 0, hp, maxHp: hp, atk: def.atk * this.diff.atk, spd: def.spd,
      slowT: 0, slowMul: 1, blockedBy: null, atkT: 0.3, revealed: !def.stealth, seenT: 0, flash: 0, facing: 1, seed: this.uid % 4,
      air: !!(def.flying || r.air), phase: 0, summonT: def.summon ? def.summon.every : 0, x: 0, y: 0, born: this.t,
      under: false, burT: def.burrow ? def.burrow.up * (0.6 + 0.4 * ((this.uid % 5) / 5)) : 0, drillT: def.drill ? def.drill.every : 0
    };
    const p = posAt(r, f.d); f.x = p.x * TILE; f.y = p.y * TILE; this.foes.push(f);
    if (def.boss) { this.emit('boss', def); this.emit('sfx', 'boss'); }
    return f;
  }

  /* ---------- damage ---------- */
  hitFoe(f, amount, elec, pierce) {
    if (f.dead) return;
    const dmg = elec ? amount : Math.max(amount - f.def.def * (pierce ? 0.5 : 1), amount * 0.25);
    f.hp -= dmg; f.flash = 0.12;
    const def = f.def;
    if (def.boss && dmg > f.maxHp * 0.012) this.shake = Math.max(this.shake, 0.14);
    if (def.phases) {
      const frac = f.hp / f.maxHp;
      while (f.phase < def.phases.length && frac <= def.phases[f.phase].at) {
        const [type, n, gap] = def.phases[f.phase].spawn; f.phase++;
        for (let i = 0; i < n; i++) this.queue.push({ time: this.t + 0.6 + i * gap, type, route: type === 'ghost' ? Math.max(1, this.routes.findIndex(r => r.air)) : f.route, d: Math.max(0, f.d - 0.3) });
        this.queue.sort((a, b) => a.time - b.time);
        this.ring(f.x, f.y - 40, 20, 220, '#d58bff', 0.9); this.emit('boss-call', def); this.emit('sfx', 'boss');
      }
    }
    if (f.hp <= 0) this.killFoe(f);
  }
  killFoe(f) {
    f.dead = true; this.kills++; this.emit('kill', f);
    if (f.blockedBy) f.blockedBy.blocking = f.blockedBy.blocking.filter(x => x !== f);
    this.foes = this.foes.filter(x => x !== f);
    const def = f.def; this.puff(f.x, f.y - 14, def.boss ? '#c06bff' : '#9a7ac0', def.boss ? 22 : 8); this.emit('sfx', 'pop');
    if (def.splits) for (let i = 0; i < def.splitN; i++) { const s = this.spawnFoe(def.splits, f.route, Math.max(0, f.d - 0.25 * i), 0); s.d += 0; }
    if (def.boss) { this.shake = 0.5; this.ring(f.x, f.y - 30, 20, 260, '#fff', 0.9); }
  }
  giveShield(c) { if (c.shield > 0) return false; c.shield = 1; this.ring(c.cx, c.cy - 28, 8, 36, '#ffb6e8', 0.4); this.emit('sfx', 'shield'); return true; }
  hitCrew(c, amount) {
    if (c.shield > 0) { c.shield = 0; c.flash = 0.06; this.ring(c.cx, c.cy - 28, 20, 48, '#ffd6f2', 0.35); this.puff(c.cx, c.cy - 30, '#ffd6f2', 5); this.emit('sfx', 'bubble'); this.emit('shield-pop', c); return; }
    const dmg = Math.max(amount - this.stat(c).def, amount * 0.2);
    c.hp -= dmg; c.flash = 0.12;
    if (c.hp <= 0) { this.emit('crew-down', c); if (this.selected === c) { this.selected = null; this.emit('select', null); } this.removeCrew(c, true); }
  }

  /* ---------- fx ---------- */
  puff(x, y, color, n) { for (let i = 0; i < n; i++) { const a = this.rng() * 6.283, s = 20 + this.rng() * 60; this.fx.push({ k: 'puff', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, color, r: 3 + this.rng() * 4, life: 0.5 + this.rng() * 0.3, age: 0 }); } }
  ring(x, y, r0, r1, color, life) { this.fx.push({ k: 'ring', x, y, r0, r1, color, life: life || 0.4, age: 0 }); }
  pluses(c) { this.fx.push({ k: 'plus', x: c.cx, y: c.cy - 40, life: 0.8, age: 0 }); }
  bolt(x1, y1, x2, y2, color, life) {
    const pts = [[x1, y1]], n = 5, dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
    for (let i = 1; i < n; i++) { const j = (this.rng() - 0.5) * 18; pts.push([x1 + dx * i / n - dy / l * j, y1 + dy * i / n + dx / l * j]); }
    pts.push([x2, y2]); this.fx.push({ k: 'bolt', pts, color: color || '#fff48a', life: life || 0.18, age: 0 });
  }

  /* ---------- simulation ---------- */
  update(dt) {
    this.t += dt;
    if (this.state === 'prep') return;
    let drain = 0; for (const f of this.foes) if (f.def.drain) drain += f.def.drain;
    this.dp = Math.max(0, Math.min(this.dpMax, this.dp + ((this.sabo && this.sabo.kind === 'o2' ? -0.4 : this.dpRate) - drain) * dt));
    this.updateHazards(dt);
    // wave timers
    while (this.queue.length && this.queue[0].time <= this.t) { const q = this.queue.shift(); this.spawnFoe(q.type, q.route, q.d || 0, q.mul); }
    if (this.autoWaves && this.waveIdx >= 0 && this.waveIdx < this.level.waves.length - 1 && this.t - this.waveStart >= this.level.waves[this.waveIdx].dur) this.startWave();
    for (const c of this.crew.slice()) this.updateCrew(c, dt);
    for (const f of this.foes.slice()) { if (!f.dead) this.updateFoe(f, dt); }
    this.updateShots(dt);
    for (let i = this.fx.length - 1; i >= 0; i--) { const e = this.fx[i]; e.age += dt; if (e.k === 'puff') { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 120 * dt; } if (e.age >= e.life) this.fx.splice(i, 1); }
    this.shake = Math.max(0, this.shake - dt);
    if (this.state === 'playing' && this.lives <= 0) { this.state = 'lost'; this.emit('sfx', 'lose'); this.emit('end', { won: false, waves: this.waveIdx }); return; }
    if (this.state === 'playing' && !this.endless && this.waveIdx === this.level.waves.length - 1 && !this.queue.length && !this.foes.length) {
      // the last foe is down: a moment of slow motion before the victory screen
      if (!this.endT) { this.endT = 0.45; this.timeScale = 0.25; this.sabo = null; this.saboQ = []; this.emit('final-kill'); return; }
      this.endT -= dt; if (this.endT > 0) return; this.timeScale = 1;
      this.state = 'won'; this.sabo = null; this.saboQ = [];
      const ratio = this.lives / this.maxLives, stars = ratio >= 0.7 ? 3 : ratio >= 0.35 ? 2 : 1;
      this.emit('sfx', 'win'); this.emit('end', { won: true, stars, lives: this.lives });
    }
  }
  visible(f) { return !f.under && (!f.def.stealth || f.revealed || f.seenT > 0); }
  release(f) { if (f.blockedBy) { const c = f.blockedBy; c.blocking = c.blocking.filter(x => x !== f); f.blockedBy = null; } }
  explode(f) { // Blast Beetle reaches a guard
    const r = f.def.explodes * TILE; this.foes = this.foes.filter(x => x !== f); f.dead = true; this.kills++; this.emit('kill', f); this.release(f);
    for (const c of this.crew.slice()) if (dist2(c.cx, c.cy, f.x, f.y) <= r * r) this.hitCrew(c, f.atk);
    this.ring(f.x, f.y - 10, 10, r, '#ffb347', 0.45); this.puff(f.x, f.y - 14, '#ff7a3a', 14); this.shake = Math.max(this.shake, 0.3); this.emit('sfx', 'boom');
  }

  updateFoe(f, dt) {
    f.flash = Math.max(0, f.flash - dt); f.seenT = Math.max(0, f.seenT - dt); f.slowT = Math.max(0, f.slowT - dt); if (f.slowT <= 0) f.slowMul = 1;
    const def = f.def;
    if (def.steady) { f.slowMul = 1; f.slowT = 0; }
    // burrowers & the drilling boss duck underground: untargetable and unblockable for a moment
    if (def.burrow) { f.burT -= dt; if (f.burT <= 0) { f.under = !f.under; f.burT = f.under ? def.burrow.down : def.burrow.up; if (f.under) this.release(f); else this.puff(f.x, f.y, '#7a644c', 6); } }
    if (def.drill) {
      f.drillT -= dt;
      if (f.drillT <= 0) {
        f.under = !f.under; f.drillT = f.under ? def.drill.dur : def.drill.every;
        if (f.under) { this.release(f); this.shake = Math.max(this.shake, 0.35); this.emit('sfx', 'drill'); this.emit('drill', f); } else { this.ring(f.x, f.y, 10, 120, '#ffa63d', 0.6); this.puff(f.x, f.y, '#7a644c', 16); this.shake = 0.4; }
      }
    }
    if (def.summon) { f.summonT -= dt; if (f.summonT <= 0) { f.summonT = def.summon.every; for (let i = 0; i < def.summon.n; i++) this.spawnFoe(def.summon.type, f.route, Math.max(0, f.d - 0.2 * i)); this.ring(f.x, f.y - 20, 10, 90, '#c06bff', 0.5); } }
    if (!f.revealed && !f.under) for (const c of this.crew) if (dist2(c.cx, c.cy, f.x, f.y) < (TILE * 1.3) * (TILE * 1.3)) { f.revealed = true; this.ring(f.x, f.y - 20, 8, 60, '#d6f', 0.4); break; }
    // blocked: fight the blocker (Blast Beetles go boom instead)
    if (f.blockedBy && def.explodes) { this.explode(f); return; }
    if (f.blockedBy) {
      const c = f.blockedBy; f.atkT -= dt;
      if (f.atkT <= 0) { f.atkT = def.interval; this.hitCrew(c, f.atk); this.fx.push({ k: 'slash', x: c.cx, y: c.cy - 20, life: 0.2, age: 0 }); }
      return;
    }
    // ranged attackers stop to shoot
    if (def.ranged && !f.under) {
      let best = null, bd = def.ranged * def.ranged * TILE * TILE;
      for (const c of this.crew) { const d2 = dist2(c.cx, c.cy, f.x, f.y); if (d2 <= bd) { bd = d2; best = c; } }
      if (best) { // strafes: keeps creeping forward at 35% speed while shooting, so it can never stall a wave
        f.atkT -= dt; f.facing = best.cx >= f.x ? 1 : -1;
        if (f.atkT <= 0) { f.atkT = def.interval; this.hitCrew(best, f.atk); this.fx.push({ k: 'line', x1: f.x, y1: f.y - 36, x2: best.cx, y2: best.cy - 24, color: '#ff4d6a', life: 0.14, age: 0 }); }
        f.d += def.spd * 0.35 * f.slowMul * dt;
        if (f.d >= f.r.len) { this.leak(f); return; }
        const q = posAt(f.r, f.d); f.x = q.x * TILE; f.y = q.y * TILE;
        return;
      }
    }
    // move (shut doors hold walking foes back; bosses smash them open)
    const spd = f.under && def.drill ? def.drill.spd : def.spd * (f.under ? 1.15 : 1);
    let nd = f.d + spd * this.spdMul * f.slowMul * dt;
    if (!f.air && !f.under && f.r.doorStops) for (const st of f.r.doorStops) {
      if (st.door.t <= 0 || f.d > st.d + 0.01 || nd <= st.d) continue;
      if (def.boss) { st.door.t = 0; this.shake = 0.4; this.puff((st.door.x + 0.5) * TILE, (st.door.y + 0.5) * TILE, '#ffd84a', 12); this.emit('sfx', 'boss'); this.emit('door-smash', st.door); continue; }
      nd = Math.max(f.d, st.d); f.atDoor = 0.3;
    }
    f.d = nd;
    if (f.d >= f.r.len) { this.leak(f); return; }
    const p = posAt(f.r, f.d); f.x = p.x * TILE; f.y = p.y * TILE; if (Math.abs(p.dx) > 0.2) f.facing = p.dx > 0 ? 1 : -1;
    // try to be blocked
    if (!f.air && !f.under) {
      const tx = Math.floor(p.x), ty = Math.floor(p.y), c = this.crewAt(tx, ty);
      if (c && c.b.block > 0 && Math.hypot(p.x - (tx + 0.5), p.y - (ty + 0.5)) < 0.42) {
        const used = c.blocking.reduce((s, e) => s + e.def.weight, 0);
        if (used + def.weight <= this.stat(c).block) { f.blockedBy = c; c.blocking.push(f); f.revealed = true; f.atkT = 0.3; }
      }
    }
  }
  leak(f) {
    this.foes = this.foes.filter(x => x !== f); f.dead = true;
    const loss = this.endless ? Math.min(f.def.leak, 6) : f.def.leak;
    this.lives = Math.max(this.diff.safe ? 1 : 0, this.lives - loss); this.shake = 0.35;
    this.fx.push({ k: 'text', x: f.x, y: f.y - 20, txt: '-' + Math.min(loss, 9) + ' ♥', color: '#ff5a6a', life: 1.1, age: 0 });
    this.emit('sfx', 'leak'); this.emit('leak', f);
  }

  updateCrew(c, dt) {
    const b = c.b, st = this.stat(c); c.flash = Math.max(0, c.flash - dt); c.atkT -= dt;
    if (c.hp > st.maxHp) c.hp = st.maxHp;
    if (c.barricade) { c.blocking = c.blocking.filter(f => !f.dead && f.blockedBy === c); return; }
    if (b.builds && !c.wall) { c.buildT -= dt; if (c.buildT <= 0) { if (!this.build(c)) c.buildT = 1.5; } }
    if (c.skillT > 0) {
      c.skillT -= dt; if (c.skillT <= 0) c.skillT = 0;
      if (c.type === 'tank') c.hp = Math.min(st.maxHp, c.hp + 40 * dt);
      if (c.type === 'echo') { const r = this.rangeOf(c) * TILE; for (const f of this.foes) if (!f.under && dist2(f.x, f.y, c.cx, c.cy) <= r * r) { f.slowT = 0.3; f.slowMul = Math.min(f.slowMul, 0.25); f.seenT = 0.4; } }
    } else if (c.sp < c.spMax) { c.sp = Math.min(c.spMax, c.sp + dt); if (c.sp >= c.spMax) { c.ready = true; this.emit('skill-ready', c); } }
    if (b.reveals) { const r = this.rangeOf(c) * TILE; for (const f of this.foes) if (!f.revealed && dist2(f.x, f.y, c.cx, c.cy) <= r * r) f.seenT = 0.35; }
    if (b.block > 0) { // guards: fight what they block
      c.blocking = c.blocking.filter(f => !f.dead && f.blockedBy === c);
      if (c.blocking.length) {
        const t = c.blocking[0]; c.facing = t.x >= c.cx ? 1 : -1;
        if (c.atkT <= 0) { c.atkT = st.interval; this.hitFoe(t, st.atk); this.fx.push({ k: 'slash', x: t.x, y: t.y - 20, life: 0.2, age: 0 }); this.emit('sfx', 'slash'); }
      }
      return;
    }
    if (c.atkT > 0) return;
    const r2 = (this.rangeOf(c) * TILE) ** 2;
    if (b.builds) { // Wrench: patch up the barricade
      const w = c.wall; if (w && w.hp < this.stat(w).maxHp) { c.atkT = st.interval; w.hp = Math.min(this.stat(w).maxHp, w.hp + st.repair); this.fx.push({ k: 'line', x1: c.cx, y1: c.cy - 30, x2: w.cx, y2: w.cy - 20, color: '#ffcc1f', life: 0.18, age: 0 }); this.puff(w.cx, w.cy - 20, '#ffcc1f', 2); }
      return;
    }
    if (b.shields) { // Bubbles: bubble the friend who needs it most (guards holding foes first)
      let best = null, bs = -1;
      for (const a of this.crew) { if (a.barricade || a === c || a.shield > 0 || dist2(a.cx, a.cy, c.cx, c.cy) > r2) continue; const sc = a.blocking.length * 2 + (a.b.block ? 1 : 0) + (1 - a.hp / this.stat(a).maxHp); if (sc > bs) { bs = sc; best = a; } }
      if (best) { c.atkT = st.interval; this.giveShield(best); this.fx.push({ k: 'line', x1: c.cx, y1: c.cy - 30, x2: best.cx, y2: best.cy - 30, color: '#ffb6e8', life: 0.25, age: 0 }); }
      return;
    }
    if (c.type === 'lumi') {
      let w = null, wr = 0.999;
      for (const a of this.crew) { if (dist2(a.cx, a.cy, c.cx, c.cy) > r2) continue; const q = a.hp / this.stat(a).maxHp; if (q < wr) { wr = q; w = a; } }
      if (w) { c.atkT = st.interval; w.hp = Math.min(this.stat(w).maxHp, w.hp + st.heal); this.pluses(w); this.fx.push({ k: 'line', x1: c.cx, y1: c.cy - 30, x2: w.cx, y2: w.cy - 30, color: '#7dff9c', life: 0.2, age: 0 }); this.emit('sfx', 'heal'); }
      return;
    }
    // pick the foe closest to the reactor within range (Marshal: the toughest one)
    let t = null, rem = 1e9;
    for (const f of this.foes) { if (!this.visible(f)) continue; if (dist2(f.x, f.y - 20, c.cx, c.cy) > r2) continue; const left = b.strongest ? -f.hp : f.r.len - f.d; if (left < rem) { rem = left; t = f; } }
    if (!t) return;
    c.facing = t.x >= c.cx ? 1 : -1; c.atkT = st.interval; c.fireT = 0.12;
    if (c.type === 'rook') { this.shots.push({ x: c.cx + c.facing * 18, y: c.cy - 28, f: t, dmg: st.atk, speed: 900, color: '#ffe27a' }); this.emit('sfx', 'shoot'); }
    else if (c.type === 'marshal') { this.shots.push({ x: c.cx + c.facing * 18, y: c.cy - 30, f: t, dmg: st.atk, speed: 1500, color: '#ff9a3d', pierce: true, big: true }); this.emit('sfx', 'shoot'); this.fx.push({ k: 'ring', x: c.cx + c.facing * 24, y: c.cy - 30, r0: 2, r1: 14, color: '#ffd24a', life: 0.15, age: 0 }); }
    else if (c.type === 'sparky') {
      const ar = b.aoe * TILE, hit = new Set();
      for (const f of this.foes) if (this.visible(f) && dist2(f.x, f.y, t.x, t.y) <= ar * ar) hit.add(f);
      if (c.skillT > 0) { const near = this.foes.filter(f => !hit.has(f) && this.visible(f) && dist2(f.x, f.y, t.x, t.y) < (TILE * 2.4) ** 2).sort((a, b2) => dist2(a.x, a.y, t.x, t.y) - dist2(b2.x, b2.y, t.x, t.y)).slice(0, 4); let prev = t; near.forEach(f => { this.bolt(prev.x, prev.y - 24, f.x, f.y - 24, '#9ff', 0.28); hit.add(f); prev = f; }); }
      this.bolt(c.cx, c.cy - 40, t.x, t.y - 24); this.ring(t.x, t.y - 10, 6, ar, '#fff48a', 0.3);
      hit.forEach(f => this.hitFoe(f, st.atk, true)); this.emit('sfx', 'zap');
    } else if (c.type === 'echo') {
      this.hitFoe(t, st.atk); if (!t.def.steady) { t.slowT = b.slowT; t.slowMul = Math.min(t.slowMul, b.slow); }
      this.ring(t.x, t.y - 16, 4, 38, '#7df', 0.35); this.fx.push({ k: 'line', x1: c.cx, y1: c.cy - 40, x2: t.x, y2: t.y - 24, color: '#7df', life: 0.12, age: 0 }); this.emit('sfx', 'ping');
    }
  }
  updateShots(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      if (s.f.dead) { this.shots.splice(i, 1); continue; }
      const tx = s.f.x, ty = s.f.y - 24, d = Math.hypot(tx - s.x, ty - s.y), st = s.speed * dt;
      if (s.f.under) { this.shots.splice(i, 1); continue; } // ducked underground: the shot whiffs
      if (d <= st + 4) { this.hitFoe(s.f, s.dmg, false, s.pierce); this.emit('sfx', 'hit'); this.puff(tx, ty, '#ffe27a', 3); this.shots.splice(i, 1); }
      else { s.x += (tx - s.x) / d * st; s.y += (ty - s.y) / d * st; s.a = Math.atan2(ty - s.y, tx - s.x); }
    }
  }

  /* ---------- hint: a friendly suggestion of who to place where ---------- */
  suggest(only) {
    const want = ['brick', 'rook', 'sparky', 'lumi', 'tank', 'bubbles', 'echo', 'marshal', 'wrench', 'rook', 'sparky', 'brick', 'marshal'];
    const have = {}; this.crew.forEach(c => { if (!c.barricade) have[c.type] = (have[c.type] || 0) + 1; });
    const need = {}; let type = null;
    if (only) type = this.avail.includes(only) ? only : null;
    else for (const k of want) { need[k] = (need[k] || 0) + 1; if (this.avail.includes(k) && (have[k] || 0) < need[k]) { type = k; break; } }
    if (!type) { if (only) return null; const c = this.crew.filter(c => !c.barricade && this.promoteCost(c) != null).sort((a, b) => a.lv - b.lv)[0]; return c ? { promote: c } : null; }
    const b = CREW[type], ground = this.routes.filter(r => !r.air);
    // how far along the routes each floor tile is: the middle of the route is the sweet spot for a guard
    const along = {}; ground.forEach(r => { for (let d = 0; d <= r.len; d += 0.25) { const q = posAt(r, d), k = keyOf(Math.floor(q.x), Math.floor(q.y)); if (!(k in along)) along[k] = d / r.len; } });
    let best = null, bs = -1e9;
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      if (!this.canPlace(type, x, y).ok && !(this.dp < b.cost && this.tileKind(x, y) === b.ground && !this.crewAt(x, y) && !this.doorAt(x, y))) continue;
      let sc;
      if (b.ground === 'path') { const a = along[keyOf(x, y)]; if (a == null || a < 0.15 || a > 0.9) continue; sc = -Math.abs(a - 0.45) * 10 - this.crew.filter(c => c.b.block && Math.hypot(c.x - x, c.y - y) < 1.5).length * 5; }
      else {
        const r = b.range; let cover = 0; for (const k in along) { const [px, py] = k.split(',').map(Number); if (Math.hypot(px - x, py - y) <= r) cover += 1 + along[k]; }
        sc = cover; if (b.heal || b.shields) sc = this.crew.filter(c => c.b.block && Math.hypot(c.x - x, c.y - y) <= r).length * 10 + cover * 0.1;
        if (b.builds) sc = this.pathSet.has(keyOf(x + 1, y)) || this.pathSet.has(keyOf(x - 1, y)) || this.pathSet.has(keyOf(x, y + 1)) || this.pathSet.has(keyOf(x, y - 1)) ? 10 + cover * 0.1 : -5;
      }
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    return best ? { type, x: best[0], y: best[1], wait: this.dp < b.cost } : null;
  }

  /* ---------- input ---------- */
  tileAt(clientX, clientY) {
    const r = this.cv.getBoundingClientRect();
    const x = Math.floor((clientX - r.left) / r.width * this.cols), y = Math.floor((clientY - r.top) / r.height * this.rows);
    return (x < 0 || y < 0 || x >= this.cols || y >= this.rows) ? null : [x, y];
  }
  tap(tx, ty) {
    const pn = this.panelAt(tx, ty); if (pn) { this.fixPanel(pn); return; }
    const door = this.doorAt(tx, ty); if (door && !this.placing) { this.slamDoor(door); return; }
    let c = this.crewAt(tx, ty); if (c && c.barricade) c = this.placing ? null : c.owner;
    if (this.placing) {
      if (c) { if (!this.allow({ kind: 'select-crew', c })) return; this.placing = null; this.select(c); return; }
      const r = this.canPlace(this.placing, tx, ty);
      if (r.ok) { if (this.deploy(this.placing, tx, ty)) { this.placing = null; this.emit('placing', null); } }
      else { this.emit('deny', r.why); this.fx.push({ k: 'bad', x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, life: 0.4, age: 0 }); }
      return;
    }
    if (c) { if (!this.allow({ kind: 'select-crew', c })) return; this.select(c === this.selected ? null : c); }
    else this.select(null);
  }
  select(c) { this.selected = c; if (c) this.emit('sfx', 'click'); this.emit('select', c); }
  setPlacing(type) {
    if (type && !this.allow({ kind: 'select-card', type })) return;
    this.placing = this.placing === type ? null : type; if (this.placing) this.selected = null;
    this.emit('placing', this.placing); this.emit('select', null);
  }

  /* ---------- rendering ---------- */
  render() {
    const ctx = this.ctx; if (!ctx || !this.board) return;
    const k = this.dpr * this.scale, T_ = this.clock;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    let sx = 0, sy = 0; if (this.shake > 0) { sx = (Math.random() - 0.5) * 8 * this.shake; sy = (Math.random() - 0.5) * 8 * this.shake; }
    ctx.setTransform(k, 0, 0, k, sx * this.dpr, sy * this.dpr);
    ctx.drawImage(this.board, 0, 0, this.cols * TILE, this.rows * TILE);
    // vents & reactor
    this.routes.forEach(r => { const p = r.pts[0]; drawVent(ctx, p[0] * TILE, p[1] * TILE, T_, r.air); });
    const ground = this.routes.find(r => !r.air) || this.routes[0], ex = ground.pts[ground.pts.length - 1];
    drawReactor(ctx, ex[0] * TILE, ex[1] * TILE, T_, this.th);
    for (const d of this.doors) drawDoor(ctx, d.x * TILE, d.y * TILE, d.dir, d.anim, d.cd <= 0 && this.state !== 'won', d.cd / this.doorCd, T_);
    // valid placement tiles
    if (this.placing) {
      const kind = CREW[this.placing].ground, pulse = 0.35 + 0.2 * Math.sin(T_ * 6);
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        if (this.tileKind(x, y) !== kind || this.crewAt(x, y)) continue;
        if (A11Y.cb) { // colour-blind friendly: orange stripes for floor, blue dots for decks
          ctx.fillStyle = kind === 'path' ? `rgba(255,159,28,${pulse})` : `rgba(58,134,255,${pulse + 0.1})`; ctx.fillRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
          ctx.save(); ctx.beginPath(); ctx.rect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8); ctx.clip(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
          if (kind === 'path') for (let i = -TILE; i < TILE; i += 14) { ctx.beginPath(); ctx.moveTo(x * TILE + i, y * TILE + TILE); ctx.lineTo(x * TILE + i + TILE, y * TILE); ctx.stroke(); }
          else for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(x * TILE + 16 + i * 16, y * TILE + 16 + j * 16, 3, 0, 6.3); ctx.fill(); }
          ctx.restore(); ctx.strokeStyle = kind === 'path' ? '#ff9f1c' : '#3a86ff'; ctx.lineWidth = 3.5; ctx.strokeRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
          continue;
        }
        ctx.fillStyle = kind === 'path' ? `rgba(255,214,64,${pulse})` : `rgba(80,230,255,${pulse})`; ctx.fillRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = kind === 'path' ? '#ffd640' : '#50e6ff'; ctx.lineWidth = 2.5; ctx.strokeRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
      }
      if (this.hover && this.tileKind(this.hover[0], this.hover[1]) === kind) this.drawRange(this.hover[0], this.hover[1], this.placing);
    }
    if (this.hint) { const [hx, hy] = this.hint, p = 0.5 + 0.5 * Math.sin(T_ * 7); ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * p})`; ctx.lineWidth = 4; ctx.strokeRect(hx * TILE + 2, hy * TILE + 2, TILE - 4, TILE - 4); ctx.fillStyle = `rgba(255,255,120,${0.15 + 0.2 * p})`; ctx.fillRect(hx * TILE + 2, hy * TILE + 2, TILE - 4, TILE - 4); }
    if (this.selected) this.drawRange(this.selected.x, this.selected.y, this.selected.type, true);
    // entities, painter-sorted
    const list = [];
    this.crew.forEach(c => list.push({ y: c.cy, c })); this.foes.forEach(f => { if (!f.air) list.push({ y: f.y, f }); });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) { if (e.c) this.drawCrew(ctx, e.c, T_); else this.drawFoeE(ctx, e.f, T_); }
    this.foes.forEach(f => { if (f.air) this.drawFoeE(ctx, f, T_); });
    // shots
    for (const s of this.shots) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a || 0); ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 8; if (s.big) ctx.fillRect(-16, -3.5, 26, 7); else ctx.fillRect(-9, -2.5, 16, 5); ctx.restore(); }
    // fx
    for (const e of this.fx) this.drawFx(ctx, e);
    if (this.darkA > 0.02) this.drawDark(ctx);
    if (this.sabo) { const s = this.sabo; s.panels.forEach(p => drawPanel(ctx, p.x * TILE, p.y * TILE, s.def.color, s.def.icon, p.taps / s.need, p.taps >= s.need, T_)); }
    // overhead bars on top
    this.foes.forEach(f => this.drawFoeBar(ctx, f));
    this.crew.forEach(c => this.drawCrewBar(ctx, c, T_));
    if (this.sabo) this.drawAlarm(ctx, T_);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.hooks.overlay) this.hooks.overlay(ctx);
  }
  drawDark(ctx) { // lights-out: darkness with little pools of light around the crew, the reactor and repair panels
    const S = 12, w = this.cols * S, h = this.rows * S;
    if (!this.darkCv) { this.darkCv = document.createElement('canvas'); }
    const dc = this.darkCv; if (dc.width !== w || dc.height !== h) { dc.width = w; dc.height = h; }
    const d = dc.getContext('2d'); d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, w, h);
    d.fillStyle = 'rgba(3,5,14,.86)'; d.fillRect(0, 0, w, h); d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r) => { const g = d.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.beginPath(); d.arc(x, y, r, 0, 6.3); d.fill(); };
    const k = S / TILE;
    for (const c of this.crew) hole(c.cx * k, c.cy * k, Math.max(1.1, this.rangeOf(c) * 0.8) * S);
    const ex = this.reactorPos(); hole(ex[0] * k, ex[1] * k, S * 1.4);
    if (this.sabo) this.sabo.panels.forEach(p => hole((p.x + 0.5) * S, (p.y + 0.5) * S, S * 1.2));
    ctx.save(); ctx.globalAlpha = this.darkA; ctx.imageSmoothingEnabled = true; ctx.drawImage(dc, 0, 0, this.cols * TILE, this.rows * TILE); ctx.restore();
  }
  drawAlarm(ctx, T_) {
    const s = this.sabo, W_ = this.cols * TILE, H_ = this.rows * TILE, p = 0.5 + 0.5 * Math.sin(T_ * (s.kind === 'reactor' ? 9 : 5));
    if (s.kind !== 'lights') {
      const g = ctx.createRadialGradient(W_ / 2, H_ / 2, Math.min(W_, H_) * 0.35, W_ / 2, H_ / 2, Math.max(W_, H_) * 0.7);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, s.kind === 'reactor' ? `rgba(255,40,60,${0.25 + 0.3 * p})` : `rgba(80,190,255,${0.15 + 0.2 * p})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W_, H_);
    }
    const txt = s.def.icon + ' ' + s.def.name.toUpperCase() + (s.kind === 'reactor' ? '  ' + Math.ceil(s.t) : '') + '  ·  tap the panel' + (s.panels.length > 1 ? 's' : '') + '!';
    ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(txt).width + 28, x = W_ / 2, y = 22;
    ctx.fillStyle = 'rgba(8,10,22,.85)'; rr(ctx, x - tw / 2, y - 16, tw, 32, 12); ctx.fill();
    ctx.strokeStyle = s.def.color; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = s.def.color; ctx.fillRect(x - tw / 2 + 10, y + 11, (tw - 20) * Math.max(0, s.t / s.dur), 3);
    ctx.fillStyle = '#fff'; ctx.fillText(txt, x, y - 1);
  }
  drawRange(tx, ty, type, sel) {
    const b = CREW[type], ctx = this.ctx, cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE, dim = this.rangeOf({ b }) / (b.range || 1);
    if (b.block > 0) { ctx.strokeStyle = '#ffd640'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.strokeRect(tx * TILE + 3, ty * TILE + 3, TILE - 6, TILE - 6); ctx.setLineDash([]); return; }
    const r = b.range * dim * TILE; ctx.fillStyle = sel ? 'rgba(255,255,255,.1)' : 'rgba(80,230,255,.12)'; ctx.strokeStyle = sel ? 'rgba(255,255,255,.7)' : 'rgba(80,230,255,.85)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.fill(); ctx.stroke();
  }
  drawCrew(ctx, c, T_) {
    if (c.barricade) { drawBarricade(ctx, c.cx, c.cy + 24, c.hp / this.stat(c).maxHp, c.owner.skillT > 0, T_, Math.min(1, (this.t - c.born) / 0.35)); return; }
    const b = c.b, spawnK = Math.min(1, (this.t - c.born) / 0.25), s = 62 * (0.6 + 0.4 * spawnK) * (b.block >= 3 ? 1.1 : 1);
    if (c.skillT > 0) { const g = ctx.createRadialGradient(c.cx, c.cy, 4, c.cx, c.cy, 44); g.addColorStop(0, 'rgba(255,240,140,.55)'); g.addColorStop(1, 'rgba(255,240,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.cx, c.cy, 44, 0, 6.3); ctx.fill(); }
    const lk = lookFor(c.type);
    drawCrewmate(ctx, c.cx, c.cy + 26, s, { color: b.color, hat: lk.hat, visor: lk.visor, pet: lk.pet, facing: c.facing, t: T_ + c.id, flash: c.flash * 6, wide: b.block >= 3 ? 1.15 : 1, idle: true });
    if (c.shield > 0) drawShield(ctx, c.cx, c.cy + 26, s, T_ + c.id, c.shield);
  }
  drawCrewBar(ctx, c, T_) {
    const st = this.stat(c), x = c.cx - 22, y = c.cy + 31, w = 44, ok = c.hp / st.maxHp > 0.4;
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 1, y - 1, w + 2, 7);
    ctx.fillStyle = A11Y.cb ? (ok ? '#3a86ff' : '#ff9f1c') : ok ? '#5af07a' : '#ff6a5a'; ctx.fillRect(x, y, w * Math.max(0, c.hp / st.maxHp), 5);
    if (c.barricade) return;
    if (c.skillT > 0) { ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 1, y + 6, w + 2, 5); ctx.fillStyle = '#ffe66a'; ctx.fillRect(x, y + 7, w * (c.skillT / c.b.skill.dur || 1), 3); }
    else { ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 1, y + 6, w + 2, 5); ctx.fillStyle = c.sp >= c.spMax ? '#ffe66a' : '#4db8ff'; ctx.fillRect(x, y + 7, w * (c.sp / c.spMax), 3); }
    if (c.lv > 0) drawStars(ctx, c.cx, c.cy - 42, c.lv, 6.5);
    if (c.sp >= c.spMax && c.skillT <= 0) { const p = Math.sin(T_ * 8) * 0.5 + 0.5; ctx.fillStyle = `rgba(255,236,90,${0.7 + 0.3 * p})`; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.cx + 22, c.cy - 30 - p * 2, 9, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.fillStyle = OUTLINE; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', c.cx + 22, c.cy - 25.5 - p * 2); }
    if (this.selected === c) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.ellipse(c.cx, c.cy + 28, 28, 9, 0, 0, 6.3); ctx.stroke(); ctx.setLineDash([]); }
  }
  drawFoeE(ctx, f, T_) {
    if (f.under) { drawMound(ctx, f.x, f.y + 24, 62 * f.def.size * (f.def.boss ? 1.3 : 1), T_ + f.id); return; }
    const s = 62 * f.def.size, fx = f.slowT > 0 ? '#9ff' : null;
    drawFoe(ctx, f.type, f.x, f.y + (f.air ? 6 : 24), s, { t: T_ + f.id, facing: f.facing, revealed: f.revealed || f.seenT > 0, seed: f.seed, flash: f.flash > 0 ? 1 : 0 });
    if (fx) { ctx.strokeStyle = 'rgba(150,240,255,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(f.x, f.y + 26, 20 * f.def.size + 4, 7, 0, 0, 6.3); ctx.stroke(); }
    if (f.def.stealth && !f.revealed && f.seenT <= 0) return;
  }
  drawFoeBar(ctx, f) {
    if (f.under) return;
    if (f.def.stealth && !f.revealed && f.seenT <= 0) return;
    if (f.hp >= f.maxHp && !f.def.boss) return;
    const w = f.def.boss ? 74 : 34, y = f.y + (f.air ? -50 : -46) - (f.def.size > 1 ? 28 * (f.def.size - 1) : 0);
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(f.x - w / 2 - 1, y - 1, w + 2, 7);
    ctx.fillStyle = f.def.boss ? '#c06bff' : '#ff5a6a'; ctx.fillRect(f.x - w / 2, y, w * Math.max(0, f.hp / f.maxHp), 5);
  }
  drawFx(ctx, e) {
    const q = e.age / e.life;
    ctx.save();
    switch (e.k) {
      case 'ring': ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - q; ctx.lineWidth = 4 * (1 - q) + 1; ctx.beginPath(); ctx.arc(e.x, e.y, e.r0 + (e.r1 - e.r0) * q, 0, 6.3); ctx.stroke(); break;
      case 'puff': ctx.globalAlpha = 1 - q; ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1 - q * 0.5), 0, 6.3); ctx.fill(); break;
      case 'bolt': ctx.globalAlpha = 1 - q; ctx.strokeStyle = e.color; ctx.shadowColor = e.color; ctx.shadowBlur = 10; ctx.lineWidth = 4; ctx.beginPath(); e.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); break;
      case 'line': ctx.globalAlpha = 1 - q; ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke(); break;
      case 'slash': ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, 16, -2.2 + q, -0.6 + q); ctx.stroke(); break;
      case 'plus': ctx.globalAlpha = 1 - q; ctx.fillStyle = '#7dff9c'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; { const y = e.y - q * 22; ctx.fillRect(e.x - 3, y - 9, 6, 18); ctx.fillRect(e.x - 9, y - 3, 18, 6); } break;
      case 'text': ctx.globalAlpha = 1 - q * q; ctx.fillStyle = e.color; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.strokeText(e.txt, e.x, e.y - q * 30); ctx.fillText(e.txt, e.x, e.y - q * 30); break;
      case 'bad': ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 5; ctx.strokeRect(e.x - 28, e.y - 28, 56, 56); break;
      case 'soul': ctx.globalAlpha = 1 - q; drawCrewmate(ctx, e.x, e.y + 20 - q * 50, 56, { color: e.color, facing: 1, t: 0, idle: false, noShadow: true, alpha: 0.5 * (1 - q) }); break;
    }
    ctx.restore();
  }
}
