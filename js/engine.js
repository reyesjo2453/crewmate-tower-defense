'use strict';
/* ============================================================
   Game engine: simulation + rendering. DOM-free except the canvas
   (pass canvas = null to run headless for tests).
   ============================================================ */

const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const keyOf = (x, y) => x + ',' + y;

function prepRoute(r) {
  const pts = r.pts.map(p => [p[0] + 0.5, p[1] + 0.5]), segs = []; let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy);
    segs.push({ x: pts[i][0], y: pts[i][1], dx: dx / l, dy: dy / l, l, start: len }); len += l;
  }
  return { air: r.air, pts, segs, len };
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
    this.cols = level.cols; this.rows = level.rows;
    this.routes = level.routes.map(prepRoute);
    this.pathSet = new Set(); dirsOf(level.routes).forEach((_, k) => this.pathSet.add(k));
    this.highSet = new Set(level.high.map(p => keyOf(p[0], p[1])));
    this.dp = level.startDP + this.diff.startDP; this.dpMax = 99; this.dpRate = this.diff.dp;
    this.maxLives = Math.max(3, level.lives + this.diff.lives); this.lives = this.maxLives;
    this.t = 0; this.crew = []; this.foes = []; this.shots = []; this.fx = []; this.queue = [];
    this.waveIdx = -1; this.waveStart = 0; this.autoWaves = opts.autoWaves !== false;
    this.state = 'prep'; this.kills = 0; this.uid = 1; this.shake = 0; this.placing = null; this.selected = null;
    this.hint = null; this.lock = null; this.paused = false; this.speed = 1; this.acc = 0;
    this.avail = (opts.squad && opts.squad.length ? opts.squad.filter(k => level.crew.includes(k)) : level.crew).slice(); this.deployed = 0; this.rng = mulberry32(level.id * 31 + 7);
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
        this.acc += dt * this.speed;
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
    const level = this.level, dirs = dirsOf(level.routes), easy = this.diff === DIFFICULTY.crew;
    this.doorTime = DOOR.closed * (easy ? 1.35 : 1); this.doorCd = DOOR.cooldown;
    this.doors = (level.doors || []).map(([x, y]) => ({ x, y, dir: dirs.get(keyOf(x, y)) || [1, 0], t: 0, cd: 0, anim: 0 }));
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
    const def = SABOTAGE[kind], easy = this.diff === DIFFICULTY.crew, pool = this.panelPool;
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
      const loss = this.diff === DIFFICULTY.crew ? 1 : s.def.fail;
      this.lives = Math.max(0, this.lives - loss); this.shake = 0.6;
      const ex = this.reactorPos(); this.fx.push({ k: 'text', x: ex[0], y: ex[1] - 30, txt: '-' + loss + ' ♥', color: '#ff5a6a', life: 1.4, age: 0 });
      this.ring(ex[0], ex[1], 10, 200, '#ff4d6a', 0.8); this.emit('sfx', 'leak'); this.emit('leak', null);
    }
    this.emit('sabotage-end', { kind: s.kind, fixed });
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
  stat(c) {
    const b = c.b, lv = c.lv, skill = c.skillT > 0;
    return {
      maxHp: Math.round(b.hp * (1 + 0.3 * lv)),
      atk: b.atk * (1 + 0.28 * lv) * (c.type === 'brick' && skill ? 1.8 : 1),
      def: b.def * (c.type === 'tank' && skill ? 2 : 1),
      interval: b.interval * (c.type === 'rook' && skill ? 0.5 : 1),
      heal: (b.heal || 0) * (1 + 0.3 * lv)
    };
  }
  promoteCost(c) { return c.lv >= PROMOTE_MAX ? null : Math.ceil(c.b.cost * (c.lv === 0 ? 0.8 : 1.2)); }
  refund(c) { return Math.floor(c.spent * 0.5); }
  progress() { return { wave: Math.max(0, this.waveIdx + 1), total: this.level.waves.length }; }
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
    const c = { id: this.uid++, type, b, x, y, cx: (x + 0.5) * TILE, cy: (y + 0.5) * TILE, lv: 0, hp: b.hp, sp: 0, spMax: b.skill.sp, skillT: 0, blocking: [], atkT: 0.35, facing: 1, flash: 0, spent: b.cost, born: this.t, ready: false };
    this.crew.push(c); this.deployed++;
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
    if (died) { this.fx.push({ k: 'soul', x: c.cx, y: c.cy, color: c.b.color, life: 1.2, age: 0 }); this.emit('sfx', 'hit'); }
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
    const w = this.level.waves[this.waveIdx];
    for (const s of w.spawns) for (let i = 0; i < s.n; i++) this.queue.push({ time: this.t + s.delay + i * s.gap + 0.4, type: s.type, route: s.route });
    this.queue.sort((a, b) => a.time - b.time);
    const sk = this.level.sabo && this.level.sabo[this.waveIdx + 1];
    if (sk) { this.saboQ.push({ time: this.t + 6, kind: sk }); this.saboQ.sort((a, b) => a.time - b.time); }
    const radio = this.level.radio && this.level.radio[this.waveIdx + 1];
    this.emit('wave', { n: this.waveIdx + 1, total: this.level.waves.length, radio, last: this.waveIdx === this.level.waves.length - 1 });
    this.emit('sfx', 'wave');
  }
  spawnFoe(type, routeIdx, d0, jitter) {
    const def = FOES[type], r = this.routes[routeIdx] || this.routes[0];
    const hp = def.hp * this.diff.hp;
    const f = {
      id: this.uid++, type, def, route: routeIdx, r, d: d0 || 0, hp, maxHp: hp, atk: def.atk * this.diff.atk, spd: def.spd,
      slowT: 0, slowMul: 1, blockedBy: null, atkT: 0.3, revealed: !def.stealth, seenT: 0, flash: 0, facing: 1, seed: this.uid % 4,
      air: !!(def.flying || r.air), phase: 0, summonT: def.summon ? def.summon.every : 0, x: 0, y: 0, born: this.t
    };
    const p = posAt(r, f.d); f.x = p.x * TILE; f.y = p.y * TILE; this.foes.push(f);
    if (def.boss) { this.emit('boss', def); this.emit('sfx', 'boss'); }
    return f;
  }

  /* ---------- damage ---------- */
  hitFoe(f, amount, elec) {
    if (f.dead) return;
    const dmg = elec ? amount : Math.max(amount - f.def.def, amount * 0.25);
    f.hp -= dmg; f.flash = 0.12;
    const def = f.def;
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
    f.dead = true; this.kills++;
    if (f.blockedBy) f.blockedBy.blocking = f.blockedBy.blocking.filter(x => x !== f);
    this.foes = this.foes.filter(x => x !== f);
    const def = f.def; this.puff(f.x, f.y - 14, def.boss ? '#c06bff' : '#9a7ac0', def.boss ? 22 : 8); this.emit('sfx', 'pop');
    if (def.splits) for (let i = 0; i < def.splitN; i++) { const s = this.spawnFoe(def.splits, f.route, Math.max(0, f.d - 0.25 * i), 0); s.d += 0; }
    if (def.boss) { this.shake = 0.5; this.ring(f.x, f.y - 30, 20, 260, '#fff', 0.9); }
  }
  hitCrew(c, amount) {
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
    this.dp = Math.max(0, Math.min(this.dpMax, this.dp + (this.sabo && this.sabo.kind === 'o2' ? -0.4 : this.dpRate) * dt));
    this.updateHazards(dt);
    // wave timers
    while (this.queue.length && this.queue[0].time <= this.t) { const q = this.queue.shift(); this.spawnFoe(q.type, q.route, q.d || 0); }
    if (this.autoWaves && this.waveIdx >= 0 && this.waveIdx < this.level.waves.length - 1 && this.t - this.waveStart >= this.level.waves[this.waveIdx].dur) this.startWave();
    for (const c of this.crew.slice()) this.updateCrew(c, dt);
    for (const f of this.foes.slice()) { if (!f.dead) this.updateFoe(f, dt); }
    this.updateShots(dt);
    for (let i = this.fx.length - 1; i >= 0; i--) { const e = this.fx[i]; e.age += dt; if (e.k === 'puff') { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 120 * dt; } if (e.age >= e.life) this.fx.splice(i, 1); }
    this.shake = Math.max(0, this.shake - dt);
    if (this.state === 'playing' && this.lives <= 0) { this.state = 'lost'; this.emit('sfx', 'lose'); this.emit('end', { won: false }); return; }
    if (this.state === 'playing' && this.waveIdx === this.level.waves.length - 1 && !this.queue.length && !this.foes.length) {
      this.state = 'won'; this.sabo = null; this.saboQ = [];
      const ratio = this.lives / this.maxLives, stars = ratio >= 0.7 ? 3 : ratio >= 0.35 ? 2 : 1;
      this.emit('sfx', 'win'); this.emit('end', { won: true, stars, lives: this.lives });
    }
  }
  visible(f) { return !f.def.stealth || f.revealed || f.seenT > 0; }

  updateFoe(f, dt) {
    f.flash = Math.max(0, f.flash - dt); f.seenT = Math.max(0, f.seenT - dt); f.slowT = Math.max(0, f.slowT - dt); if (f.slowT <= 0) f.slowMul = 1;
    const def = f.def;
    if (def.summon) { f.summonT -= dt; if (f.summonT <= 0) { f.summonT = def.summon.every; for (let i = 0; i < def.summon.n; i++) this.spawnFoe(def.summon.type, f.route, Math.max(0, f.d - 0.2 * i)); this.ring(f.x, f.y - 20, 10, 90, '#c06bff', 0.5); } }
    if (!f.revealed) for (const c of this.crew) if (dist2(c.cx, c.cy, f.x, f.y) < (TILE * 1.3) * (TILE * 1.3)) { f.revealed = true; this.ring(f.x, f.y - 20, 8, 60, '#d6f', 0.4); break; }
    // blocked: fight the blocker
    if (f.blockedBy) {
      const c = f.blockedBy; f.atkT -= dt;
      if (f.atkT <= 0) { f.atkT = def.interval; this.hitCrew(c, f.atk); this.fx.push({ k: 'slash', x: c.cx, y: c.cy - 20, life: 0.2, age: 0 }); }
      return;
    }
    // ranged attackers stop to shoot
    if (def.ranged) {
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
    let nd = f.d + def.spd * f.slowMul * dt;
    if (!f.air && f.r.doorStops) for (const st of f.r.doorStops) {
      if (st.door.t <= 0 || f.d > st.d + 0.01 || nd <= st.d) continue;
      if (def.boss) { st.door.t = 0; this.shake = 0.4; this.puff((st.door.x + 0.5) * TILE, (st.door.y + 0.5) * TILE, '#ffd84a', 12); this.emit('sfx', 'boss'); this.emit('door-smash', st.door); continue; }
      nd = Math.max(f.d, st.d); f.atDoor = 0.3;
    }
    f.d = nd;
    if (f.d >= f.r.len) { this.leak(f); return; }
    const p = posAt(f.r, f.d); f.x = p.x * TILE; f.y = p.y * TILE; if (Math.abs(p.dx) > 0.2) f.facing = p.dx > 0 ? 1 : -1;
    // try to be blocked
    if (!f.air) {
      const tx = Math.floor(p.x), ty = Math.floor(p.y), c = this.crewAt(tx, ty);
      if (c && c.b.block > 0 && Math.hypot(p.x - (tx + 0.5), p.y - (ty + 0.5)) < 0.42) {
        const used = c.blocking.reduce((s, e) => s + e.def.weight, 0);
        if (used + def.weight <= c.b.block) { f.blockedBy = c; c.blocking.push(f); f.revealed = true; f.atkT = 0.3; }
      }
    }
  }
  leak(f) {
    this.foes = this.foes.filter(x => x !== f); f.dead = true;
    this.lives = Math.max(0, this.lives - f.def.leak); this.shake = 0.35;
    this.fx.push({ k: 'text', x: f.x, y: f.y - 20, txt: '-' + Math.min(f.def.leak, 9) + ' ♥', color: '#ff5a6a', life: 1.1, age: 0 });
    this.emit('sfx', 'leak'); this.emit('leak', f);
  }

  updateCrew(c, dt) {
    const b = c.b, st = this.stat(c); c.flash = Math.max(0, c.flash - dt); c.atkT -= dt;
    if (c.hp > st.maxHp) c.hp = st.maxHp;
    if (c.skillT > 0) {
      c.skillT -= dt; if (c.skillT <= 0) c.skillT = 0;
      if (c.type === 'tank') c.hp = Math.min(st.maxHp, c.hp + 40 * dt);
      if (c.type === 'echo') { const r = this.rangeOf(c) * TILE; for (const f of this.foes) if (dist2(f.x, f.y, c.cx, c.cy) <= r * r) { f.slowT = 0.3; f.slowMul = Math.min(f.slowMul, 0.25); f.seenT = 0.4; } }
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
    if (c.type === 'lumi') {
      let w = null, wr = 0.999;
      for (const a of this.crew) { if (dist2(a.cx, a.cy, c.cx, c.cy) > r2) continue; const q = a.hp / this.stat(a).maxHp; if (q < wr) { wr = q; w = a; } }
      if (w) { c.atkT = st.interval; w.hp = Math.min(this.stat(w).maxHp, w.hp + st.heal); this.pluses(w); this.fx.push({ k: 'line', x1: c.cx, y1: c.cy - 30, x2: w.cx, y2: w.cy - 30, color: '#7dff9c', life: 0.2, age: 0 }); this.emit('sfx', 'heal'); }
      return;
    }
    // pick the foe closest to the reactor within range
    let t = null, rem = 1e9;
    for (const f of this.foes) { if (!this.visible(f)) continue; if (dist2(f.x, f.y - 20, c.cx, c.cy) > r2) continue; const left = f.r.len - f.d; if (left < rem) { rem = left; t = f; } }
    if (!t) return;
    c.facing = t.x >= c.cx ? 1 : -1; c.atkT = st.interval; c.fireT = 0.12;
    if (c.type === 'rook') { this.shots.push({ x: c.cx + c.facing * 18, y: c.cy - 28, f: t, dmg: st.atk, speed: 900, color: '#ffe27a' }); this.emit('sfx', 'shoot'); }
    else if (c.type === 'sparky') {
      const ar = b.aoe * TILE, hit = new Set();
      for (const f of this.foes) if (this.visible(f) && dist2(f.x, f.y, t.x, t.y) <= ar * ar) hit.add(f);
      if (c.skillT > 0) { const near = this.foes.filter(f => !hit.has(f) && this.visible(f) && dist2(f.x, f.y, t.x, t.y) < (TILE * 2.4) ** 2).sort((a, b2) => dist2(a.x, a.y, t.x, t.y) - dist2(b2.x, b2.y, t.x, t.y)).slice(0, 4); let prev = t; near.forEach(f => { this.bolt(prev.x, prev.y - 24, f.x, f.y - 24, '#9ff', 0.28); hit.add(f); prev = f; }); }
      this.bolt(c.cx, c.cy - 40, t.x, t.y - 24); this.ring(t.x, t.y - 10, 6, ar, '#fff48a', 0.3);
      hit.forEach(f => this.hitFoe(f, st.atk, true)); this.emit('sfx', 'zap');
    } else if (c.type === 'echo') {
      this.hitFoe(t, st.atk); t.slowT = b.slowT; t.slowMul = Math.min(t.slowMul, b.slow);
      this.ring(t.x, t.y - 16, 4, 38, '#7df', 0.35); this.fx.push({ k: 'line', x1: c.cx, y1: c.cy - 40, x2: t.x, y2: t.y - 24, color: '#7df', life: 0.12, age: 0 }); this.emit('sfx', 'ping');
    }
  }
  updateShots(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      if (s.f.dead) { this.shots.splice(i, 1); continue; }
      const tx = s.f.x, ty = s.f.y - 24, d = Math.hypot(tx - s.x, ty - s.y), st = s.speed * dt;
      if (d <= st + 4) { this.hitFoe(s.f, s.dmg, false); this.emit('sfx', 'hit'); this.puff(tx, ty, '#ffe27a', 3); this.shots.splice(i, 1); }
      else { s.x += (tx - s.x) / d * st; s.y += (ty - s.y) / d * st; s.a = Math.atan2(ty - s.y, tx - s.x); }
    }
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
    const c = this.crewAt(tx, ty);
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
    for (const s of this.shots) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a || 0); ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 8; ctx.fillRect(-9, -2.5, 16, 5); ctx.restore(); }
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
    const b = c.b, spawnK = Math.min(1, (this.t - c.born) / 0.25), s = 62 * (0.6 + 0.4 * spawnK) * (b.block >= 3 ? 1.1 : 1);
    if (c.skillT > 0) { const g = ctx.createRadialGradient(c.cx, c.cy, 4, c.cx, c.cy, 44); g.addColorStop(0, 'rgba(255,240,140,.55)'); g.addColorStop(1, 'rgba(255,240,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.cx, c.cy, 44, 0, 6.3); ctx.fill(); }
    const lk = lookFor(c.type);
    drawCrewmate(ctx, c.cx, c.cy + 26, s, { color: b.color, hat: lk.hat, visor: lk.visor, pet: lk.pet, facing: c.facing, t: T_ + c.id, flash: c.flash * 6, wide: b.block >= 3 ? 1.15 : 1, idle: true });
  }
  drawCrewBar(ctx, c, T_) {
    const st = this.stat(c), x = c.cx - 22, y = c.cy + 31, w = 44;
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 1, y - 1, w + 2, 7);
    ctx.fillStyle = c.hp / st.maxHp > 0.4 ? '#5af07a' : '#ff6a5a'; ctx.fillRect(x, y, w * Math.max(0, c.hp / st.maxHp), 5);
    if (c.skillT > 0) { ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 1, y + 6, w + 2, 5); ctx.fillStyle = '#ffe66a'; ctx.fillRect(x, y + 7, w * (c.skillT / c.b.skill.dur || 1), 3); }
    else { ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 1, y + 6, w + 2, 5); ctx.fillStyle = c.sp >= c.spMax ? '#ffe66a' : '#4db8ff'; ctx.fillRect(x, y + 7, w * (c.sp / c.spMax), 3); }
    if (c.lv > 0) drawStars(ctx, c.cx, c.cy - 42, c.lv, 6.5);
    if (c.sp >= c.spMax && c.skillT <= 0) { const p = Math.sin(T_ * 8) * 0.5 + 0.5; ctx.fillStyle = `rgba(255,236,90,${0.7 + 0.3 * p})`; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.cx + 22, c.cy - 30 - p * 2, 9, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.fillStyle = OUTLINE; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', c.cx + 22, c.cy - 25.5 - p * 2); }
    if (this.selected === c) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.ellipse(c.cx, c.cy + 28, 28, 9, 0, 0, 6.3); ctx.stroke(); ctx.setLineDash([]); }
  }
  drawFoeE(ctx, f, T_) {
    const s = 62 * f.def.size, fx = f.slowT > 0 ? '#9ff' : null;
    drawFoe(ctx, f.type, f.x, f.y + (f.air ? 6 : 24), s, { t: T_ + f.id, facing: f.facing, revealed: f.revealed || f.seenT > 0, seed: f.seed, flash: f.flash > 0 ? 1 : 0 });
    if (fx) { ctx.strokeStyle = 'rgba(150,240,255,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(f.x, f.y + 26, 20 * f.def.size + 4, 7, 0, 0, 6.3); ctx.stroke(); }
    if (f.def.stealth && !f.revealed && f.seenT <= 0) return;
  }
  drawFoeBar(ctx, f) {
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
