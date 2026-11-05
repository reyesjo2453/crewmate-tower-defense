'use strict';
/* ============================================================
   Game feel ("juice"): hit-pause, squash & stretch, knockback,
   sparks, debris, damage numbers, camera punches and screen flashes.

   Purely cosmetic. Nothing here can change how a battle turns out:
   it only ever uses Math.random (never the battle's seeded rng), it
   only exists when the game has a canvas (headless tests and the bot
   run without it), and hit-pause just delays the next simulation step
   in real time — the fixed 1/60 s steps are identical either way.
   ============================================================ */
// switches the UI sets: calm = less shaking/flashing/zooming, nums = damage numbers
const JUICE = { calm: false, nums: true };

const FOE_TINT = {
  crawler: '#6b4a8a', mimic: '#3a2f48', ghost: '#bfe8ff', drone: '#a6b4c8', shifter: '#8a35c8', plated: '#4a4258',
  spore: '#b042e8', sporelet: '#d07af0', brute: '#3b2f4a', sporemother: '#7a2bb8', heart: '#c06bff', mite: '#8a6a52',
  leech: '#2f8f6a', golem: '#5d5048', bomber: '#ffa63d', foreman: '#d98a1f',
  mender: '#e8f7d8', warden: '#46557e', rally: '#ff6fb5', conductor: '#9ab8ff'
};
const jr = (a, b) => a + Math.random() * (b - a);
const setTimeoutish = (J, t, fn) => J.later.push({ t, fn }); // runs on game time, so it pauses with the game

class Juice {
  constructor(g) { this.g = g; this.reset(); }
  reset() {
    this.p = []; this.later = []; this.nums = []; this.hs = 0; this.hsCool = 0;
    this.zoom = 1; this.zt = 1; this.zx = 0; this.zy = 0; this.zHold = 0;
    this.flash = 0; this.flashC = '255,255,255'; this.vig = 0; this.lastKill = null; this.bossHitCool = 0;
  }

  /* ---------- clock: real seconds; particles follow game speed & pause ---------- */
  step(dt) {
    const g = this.g, rate = g.paused || g.frozen ? 0 : this.hs > 0 ? 0 : g.speed * (g.timeScale || 1);
    if (this.hs > 0) this.hs -= dt;
    this.hsCool -= dt; this.bossHitCool -= dt * rate;
    const pdt = dt * rate;
    for (let i = this.later.length - 1; i >= 0; i--) { const l = this.later[i]; l.t -= pdt; if (l.t <= 0) { this.later.splice(i, 1); l.fn(); } }
    for (let i = this.p.length - 1; i >= 0; i--) {
      const e = this.p[i]; e.age += pdt;
      if (e.age >= e.life) { this.p.splice(i, 1); continue; }
      e.x += (e.vx || 0) * pdt; e.y += (e.vy || 0) * pdt;
      if (e.grav) e.vy += e.grav * pdt;
      if (e.drag) { const k = Math.max(0, 1 - e.drag * pdt); e.vx *= k; e.vy *= k; }
      if (e.vr) e.rot += e.vr * pdt;
      if (e.floor != null && e.y > e.floor && e.vy > 0) { e.y = e.floor; e.vy *= -0.35; e.vx *= 0.6; e.vr *= 0.5; }
    }
    for (let i = this.nums.length - 1; i >= 0; i--) { const n = this.nums[i]; n.age += pdt || (g.paused ? 0 : dt * 0.5); if (n.age >= n.life) this.nums.splice(i, 1); }
    // knockback springs back; pending damage numbers flush after a short gather window
    for (const f of g.foes) {
      if (f.jk) f.jk = Math.max(0, f.jk - pdt * 9);
      if (f.jAcc && g.t - f.jT0 > 0.3) this.flushNum(f);
    }
    // camera: punch in fast, ease back out
    this.zHold -= pdt || dt * 0.25;
    const want = this.zHold > 0 ? this.zt : 1;
    this.zoom += (want - this.zoom) * Math.min(1, dt * (want > this.zoom ? 14 : 5));
    if (Math.abs(this.zoom - 1) < 0.002 && this.zHold <= 0) this.zoom = 1;
    this.flash = Math.max(0, this.flash - dt * 3.2); this.vig = Math.max(0, this.vig - dt * 1.4);
  }

  /* ---------- primitives ---------- */
  freeze(sec, big) {
    if (JUICE.calm) return;
    if (!big && this.hsCool > 0) return;
    this.hs = Math.max(this.hs, sec); this.hsCool = big ? 0.35 : 0.22;
  }
  punch(x, y, z, hold) { if (JUICE.calm) return; this.zx = x; this.zy = y; this.zt = Math.max(this.zt * (this.zHold > 0 ? 1 : 0), z); this.zHold = hold; }
  screen(rgb, a) { this.flashC = rgb; this.flash = Math.max(this.flash, JUICE.calm ? a * 0.3 : a); }
  cap() { if (this.p.length > 420) this.p.splice(0, this.p.length - 420); }
  sparks(x, y, color, n, ang, spread, spd) {
    for (let i = 0; i < n; i++) {
      const a = (ang == null ? jr(0, 6.283) : ang + jr(-spread, spread)), s = jr(0.5, 1) * (spd || 260);
      this.p.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 5, grav: 240, color, life: jr(0.18, 0.34), age: 0, w: jr(2, 3.2) });
    }
    this.cap();
  }
  debris(x, y, color, n, floor, big) {
    for (let i = 0; i < n; i++) {
      const a = jr(-2.6, -0.5), s = jr(90, big ? 340 : 230);
      this.p.push({ k: 'chunk', x: x + jr(-8, 8), y: y + jr(-8, 8), vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 900, drag: 0.6, rot: jr(0, 6.28), vr: jr(-14, 14), s: jr(3, big ? 9 : 6.5), color, floor: floor + jr(-6, 6), life: jr(0.55, 0.9), age: 0, tri: Math.random() < 0.4 });
    }
    this.cap();
  }
  dust(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1;
      this.p.push({ k: 'dust', x: x + jr(-10, 10), y: y + jr(-3, 3), vx: dir * jr(40, 120), vy: jr(-30, -8), drag: 4, r: jr(5, 10), color: color || '220,214,236', life: jr(0.35, 0.6), age: 0 });
    }
  }
  twinkle(x, y, color, n, spread) {
    for (let i = 0; i < n; i++) this.p.push({ k: 'twinkle', x: x + jr(-spread, spread), y: y + jr(-spread * 0.6, spread * 0.4), vx: jr(-12, 12), vy: jr(-70, -30), color, life: jr(0.5, 0.85), age: 0, s: jr(3.5, 6.5), rot: jr(0, 1.6), vr: jr(-4, 4) });
  }
  confetti(n) {
    const g = this.g, W = g.cols * TILE, cols = ['#ff5a6a', '#ffd84a', '#5af07a', '#4db8ff', '#c06bff', '#ff9a3d', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const fromL = i % 2 === 0, x = fromL ? jr(-10, W * 0.15) : jr(W * 0.85, W + 10), a = fromL ? jr(-1.35, -0.7) : jr(-2.45, -1.8), s = jr(420, 820);
      this.p.push({ k: 'confetti', x, y: g.rows * TILE + 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 520, drag: 1.4, rot: jr(0, 6.28), vr: jr(-12, 12), s: jr(5, 9), color: cols[i % cols.length], life: jr(2.2, 3.2), age: 0, ph: jr(0, 6.28) });
    }
  }

  /* ---------- damage numbers: hits on one foe within 0.3 s merge into one pop ---------- */
  addDmg(f, dmg, kind) { if (!JUICE.nums) return; if (!f.jAcc) { f.jAcc = 0; f.jT0 = this.g.t; } f.jAcc += dmg; if (kind !== 'n' || !f.jKind) f.jKind = kind; }
  flushNum(f) {
    const v = Math.round(f.jAcc); f.jAcc = 0; const kind = f.jKind || 'n'; f.jKind = null; if (v < 1) return;
    const big = f.def.boss ? v >= f.maxHp * 0.04 : v >= f.maxHp * 0.3;
    const color = kind === 'e' ? '#fff48a' : kind === 'p' ? '#ffb347' : '#ffffff';
    this.nums.push({ x: f.x + jr(-10, 10), y: f.y - (f.air ? 44 : 6 + 44 * (f.def.size || 1)), v, color, big, life: big ? 0.95 : 0.7, age: 0, dx: jr(-14, 14) });
    if (this.nums.length > 40) this.nums.shift();
  }

  /* ---------- hooks the engine calls ---------- */
  hitFoe(f, dmg, elec, pierce) {
    this.addDmg(f, dmg + Math.min(0, f.hp), elec ? 'e' : pierce ? 'p' : 'n'); // overkill doesn't count
    if (!f.def.boss && !f.blockedBy) { f.jk = Math.min(1, (f.jk || 0) + (pierce ? 1 : 0.55)); f.jkx = -(f.facing || 1); }
    if (f.def.boss && dmg > f.maxHp * 0.012 && this.bossHitCool <= 0) { this.bossHitCool = 0.3; this.freeze(0.035); }
  }
  shotHit(x, y, s) { this.sparks(x, y, s.color, s.big ? 9 : 5, s.a != null ? s.a + Math.PI : null, 0.9, s.big ? 360 : 240); }
  fire(c, big) {
    const x = c.cx + c.facing * (big ? 46 : 34), y = c.cy - 4;
    this.p.push({ k: 'muzzle', x, y, dir: c.facing, big, life: big ? 0.09 : 0.06, age: 0 });
    // spent casing flips out the back
    this.p.push({ k: 'chunk', x: c.cx + c.facing * 14, y: c.cy - 4, vx: -c.facing * jr(60, 120), vy: jr(-220, -160), grav: 900, drag: 0.5, rot: 0, vr: jr(-20, 20), s: big ? 4 : 3, color: '#e8c25a', floor: c.cy + 24, life: 0.6, age: 0 });
    if (big) { this.sparks(x, y, '#ffd24a', 5, c.facing > 0 ? 0 : Math.PI, 0.45, 320); this.smoke(x, y, 4); }
  }
  smoke(x, y, n) { for (let i = 0; i < n; i++) this.p.push({ k: 'dust', x: x + jr(-4, 4), y: y + jr(-4, 4), vx: jr(-20, 20), vy: jr(-50, -20), drag: 2.5, r: jr(4, 8), color: '170,170,185', life: jr(0.5, 0.8), age: 0 }); }
  /** every crewmate's own attack effect (the engine has already done the damage) */
  attack(c, x, y) {
    const f = c.facing;
    switch (c.type) {
      case 'brick': // hammer lands: impact star, ground dust, chips
        this.p.push({ k: 'smash', x, y: y + 8, life: 0.26, age: 0, delay: 0.1, color: '255,204,31' });
        setTimeoutish(this, 0.1, () => { this.dust(x, y + 44, 6, '210,190,160'); this.sparks(x, y + 6, '#ffcc1f', 6, -Math.PI / 2, 1.2, 260); this.freeze(0.03); });
        break;
      case 'tank': // shield bash: a violet shock-arc pushes out
        this.p.push({ k: 'bash', x: c.cx + f * 34, y: c.cy - 8, dir: f, life: 0.28, age: 0 });
        this.sparks(x, y, '#d8c8ff', 4, f > 0 ? 0 : Math.PI, 0.7, 220);
        break;
      case 'sparky': this.twinkle(c.cx + f * 26, c.cy - 30, '#fff48a', 3, 6); break;
      case 'echo': this.p.push({ k: 'sonar', x0: c.cx + f * 38, y0: c.cy - 4, x1: x, y1: y, life: 0.32, age: 0 }); break;
      case 'lumi': this.p.push({ k: 'beam', x0: c.cx + f * 42, y0: c.cy - 6, x1: x, y1: y, life: 0.34, age: 0, color: '125,255,156', cross: true }); break;
      case 'bubbles': this.p.push({ k: 'bubble', x0: c.cx + f * 34, y0: c.cy - 22, x1: x, y1: y, life: 0.38, age: 0 }); break;
      case 'wrench': // welding: bright arc + a shower of sparks at the barricade
        this.p.push({ k: 'beam', x0: c.cx + f * 40, y0: c.cy - 12, x1: x, y1: y, life: 0.16, age: 0, color: '255,214,120' });
        this.sparks(x, y, '#ffb347', 7, -Math.PI / 2, 1.3, 240);
        break;
    }
  }
  zap(x, y) { this.sparks(x, y, '#fff48a', 6, null, 0, 220); }
  slash(f, c) { if (!c || c.type !== 'brick') this.sparks(f.x, f.y - 22, '#ffffff', 3, null, 0, 180); }
  kill(f) {
    if (f.jAcc) this.flushNum(f);
    const g = this.g, size = f.def.size || 1, tint = FOE_TINT[f.type] || '#7a4a9c', floor = f.y + (f.air ? 40 : 26);
    this.lastKill = [f.x, f.y];
    this.p.push({ k: 'die', type: f.type, x: f.x, y: f.y + (f.air ? 6 : 24), s: 62 * size, facing: f.facing, seed: f.seed, life: f.def.boss ? 0.4 : 0.2, age: 0, t: g.clock + f.id });
    this.debris(f.x, f.y - 14 * size, tint, f.def.boss ? 26 : Math.round(5 + 4 * size), floor, f.def.boss);
    this.sparks(f.x, f.y - 16 * size, '#ffffff', f.def.boss ? 18 : 4, null, 0, f.def.boss ? 420 : 200);
    if (f.def.boss) {
      this.freeze(0.16, true); this.punch(f.x, f.y - 20, 1.16, 0.55); this.screen('255,255,255', 0.55);
      this.twinkle(f.x, f.y - 30, '#ffd84a', 16, 50);
    } else if (size >= 1.2) this.freeze(0.05);
  }
  explode(f, r) {
    this.freeze(0.07, true); this.screen('255,170,80', 0.28);
    this.sparks(f.x, f.y - 14, '#ffb347', 16, null, 0, 420); this.debris(f.x, f.y - 10, '#ff7a3a', 10, f.y + 26, true);
    this.p.push({ k: 'boom', x: f.x, y: f.y - 10, r, life: 0.32, age: 0 });
  }
  leak() { this.vig = 1; this.freeze(0.05, true); }
  crewDown(c) { this.freeze(0.09, true); this.debris(c.cx, c.cy - 10, c.b.color, 10, c.cy + 26, false); this.sparks(c.cx, c.cy - 20, '#ffffff', 8, null, 0, 260); }
  shieldPop(c) { this.sparks(c.cx, c.cy - 30, '#ffd6f2', 8, null, 0, 200); }
  deploy(c) { this.dust(c.cx, c.cy + 26, 8); }
  promote(c) { c.jPromo = this.g.t; this.twinkle(c.cx, c.cy - 20, '#ffd84a', 10, 26); }
  heal(c) { this.twinkle(c.cx, c.cy - 26, '#7dff9c', 2, 14); }
  skill(c) { c.jSkill = this.g.t; this.freeze(0.06, true); this.screen('255,240,150', 0.14); this.twinkle(c.cx, c.cy - 20, '#fff7a8', 12, 34); }
  combo(l) { // sparkles run along the new link, and both partners hop
    const n = 8; for (let i = 0; i <= n; i++) this.twinkle(l.a.cx + (l.b.cx - l.a.cx) * i / n, l.a.cy + 10 + (l.b.cy - l.a.cy) * i / n, l.cb.color, 1, 8);
    l.a.jPromo = l.b.jPromo = this.g.t;
  }
    build(w) { this.dust(w.cx, w.cy + 24, 8, '200,152,88'); }
  door(d) { this.dust((d.x + 0.5) * TILE, (d.y + 0.5) * TILE + 20, 10, '255,216,74'); }
  bossIn(f) { this.punch(f.x, f.y, 1.08, 0.7); }
  final() {
    const k = this.lastKill || [this.g.cols * TILE / 2, this.g.rows * TILE / 2];
    this.punch(k[0], k[1], 1.18, 0.9); this.screen('255,255,255', 0.25); this.confetti(JUICE.calm ? 30 : 90);
  }

  /* ---------- shapes for the renderer ---------- */
  shakeOff() {
    if (JUICE.calm) return [0, 0];
    const s = Math.min(1, this.g.shake * 1.6), a = s * s * 13, t = this.g.clock;
    return a < 0.05 ? [0, 0] : [a * (Math.sin(t * 61) + Math.sin(t * 37.3) * 0.6) / 1.6, a * (Math.sin(t * 53.7 + 1) + Math.sin(t * 29.1) * 0.6) / 1.6];
  }
  /** squash & stretch for a crewmate: [sx, sy, ox, oy] around the feet */
  crewPose(c) {
    const g = this.g; let sx = 1, sy = 1, ox = 0, oy = 0;
    const age = g.t - c.born;
    if (age < 0.12 && !JUICE.calm) { const u = 1 - age / 0.12; oy = -48 * u * u; sx = 0.86; sy = 1.18; }
    else if (age < 0.7) { const u = age - 0.12, d = Math.exp(-u * 8) * Math.cos(u * 26); sy *= 1 - 0.26 * d; sx *= 1 + 0.2 * d; }
    if (c.jPromo != null) { const u = g.t - c.jPromo; if (u < 0.6) { const d = Math.exp(-u * 7) * Math.sin(u * 24); sy *= 1 + 0.22 * d; sx *= 1 - 0.14 * d; } }
    if (c.jSkill != null) { const u = g.t - c.jSkill; if (u < 0.34) { oy -= 16 * Math.sin(Math.PI * u / 0.34); sy *= 1 + 0.08 * Math.sin(Math.PI * u / 0.34); } }
    let rot = 0;
    if (!c.barricade && c.atkAt != null && age > 0.4 && !JUICE.calm) {
      const P = g.t - c.atkAt, f = c.facing, bell = (a, b) => P > a && P < b ? Math.sin(Math.PI * (P - a) / (b - a)) : 0;
      switch (c.type) {
        case 'brick': { // rear back, then hop into the slam and squash on landing
          rot -= 0.14 * bell(0, 0.08); rot += 0.2 * bell(0.07, 0.22); ox += 10 * bell(0.06, 0.24);
          oy -= 8 * bell(0.02, 0.11); const land = bell(0.11, 0.3); sy *= 1 - 0.16 * land; sx *= 1 + 0.14 * land; break;
        }
        case 'tank': { const b = bell(0, 0.3); ox += 14 * b; rot += 0.12 * b; sx *= 1 + 0.06 * b; break; } // shoulder charge
        case 'rook': { const b = bell(0, 0.12); ox -= 5 * b; rot -= 0.06 * b; break; }                   // snappy recoil
        case 'marshal': { const b = bell(0, 0.28); ox -= 11 * b; rot -= 0.16 * b; sy *= 1 - 0.08 * b; sx *= 1 + 0.06 * b; break; } // heavy kick
        case 'sparky': { const b = bell(0, 0.24); oy -= 10 * b; sy *= 1 + 0.14 * b; sx *= 1 - 0.08 * b; break; } // jump & stretch, charged
        case 'echo': { const b = bell(0, 0.3); sx *= 1 + 0.08 * b; sy *= 1 + 0.08 * b; rot += 0.05 * Math.sin(P * 30) * b; break; } // hum-pulse
        case 'lumi': { const b = bell(0, 0.4); oy -= 6 * b; rot += 0.08 * b; break; }                      // gentle float forward
        case 'wrench': { const b = bell(0, 0.3); rot += 0.12 * Math.sin(P * 40) * b; ox += 3 * b; break; } // put your back into it
        case 'bubbles': { const p = bell(0, 0.14), r = bell(0.14, 0.32); sx *= 1 + 0.14 * p - 0.06 * r; sy *= 1 - 0.1 * p + 0.08 * r; break; } // big breath, then puff
      }
    }
    if (c.flash > 0) { const p = c.flash / 0.12; sx *= 1 + 0.1 * p; sy *= 1 - 0.1 * p; }
    return [sx, sy, ox, oy, rot];
  }
  foePose(f) {
    const g = this.g; let sx = 1, sy = 1, ox = 0, rot = 0;
    const age = g.t - (f.born || 0);
    if (age < 0.3) { const u = age / 0.3, e = 1 - Math.pow(1 - u, 3); sx *= 0.4 + 0.6 * e + 0.12 * Math.sin(u * Math.PI); sy *= 0.4 + 0.6 * e; }
    if (f.flash > 0) { const p = f.flash / 0.12; sx *= 1 + 0.15 * p; sy *= 1 - 0.13 * p; }
    if (f.jk) ox = (f.jkx || -1) * 7 * f.jk;
    if (!f.air && !f.def.boss && !f.blockedBy && !f.under && !JUICE.calm) rot = Math.sin(g.clock * 10 + f.id) * 0.055;
    return [sx, sy, ox, rot];
  }

  /* ---------- drawing (board space) ---------- */
  draw(ctx) {
    for (const e of this.p) {
      const q = e.age / e.life; ctx.save();
      switch (e.k) {
        case 'spark': {
          const l = Math.min(14, Math.hypot(e.vx, e.vy) * 0.04 + 2); const a = Math.atan2(e.vy, e.vx);
          ctx.globalAlpha = 1 - q; ctx.strokeStyle = e.color; ctx.lineWidth = e.w * (1 - q * 0.5); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - Math.cos(a) * l, e.y - Math.sin(a) * l); ctx.stroke(); break;
        }
        case 'chunk':
          ctx.globalAlpha = q > 0.7 ? (1 - q) / 0.3 : 1; ctx.translate(e.x, e.y); ctx.rotate(e.rot); ctx.fillStyle = e.color; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6;
          ctx.beginPath(); if (e.tri) { ctx.moveTo(-e.s, e.s * 0.7); ctx.lineTo(e.s, e.s * 0.7); ctx.lineTo(0, -e.s); } else ctx.rect(-e.s * 0.7, -e.s * 0.7, e.s * 1.4, e.s * 1.4);
          ctx.closePath(); ctx.fill(); ctx.stroke(); break;
        case 'dust': ctx.globalAlpha = 0.55 * (1 - q); ctx.fillStyle = `rgb(${e.color})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.6 + q), 0, 6.3); ctx.fill(); break;
        case 'twinkle': {
          ctx.globalAlpha = q < 0.2 ? q / 0.2 : 1 - (q - 0.2) / 0.8; ctx.translate(e.x, e.y); ctx.rotate(e.rot); ctx.fillStyle = e.color;
          const s = e.s * (1 - q * 0.4); ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s); ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s); ctx.fill(); break;
        }
        case 'confetti': {
          ctx.globalAlpha = q > 0.8 ? (1 - q) / 0.2 : 1; ctx.translate(e.x + Math.sin(e.age * 6 + e.ph) * 6, e.y); ctx.rotate(e.rot);
          ctx.fillStyle = e.color; ctx.fillRect(-e.s / 2, -e.s * 0.3 * Math.abs(Math.cos(e.age * 9 + e.ph)) - 1, e.s, e.s * 0.6 * Math.abs(Math.cos(e.age * 9 + e.ph)) + 2); break;
        }
        case 'muzzle': {
          ctx.globalAlpha = 1 - q; ctx.translate(e.x, e.y); ctx.fillStyle = e.big ? '#ffd24a' : '#fff4b0'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
          const L = e.big ? 22 : 14, W = e.big ? 9 : 6; ctx.beginPath(); ctx.moveTo(0, -W); ctx.lineTo(e.dir * L, 0); ctx.lineTo(0, W); ctx.lineTo(-e.dir * 4, 0); ctx.closePath(); ctx.fill(); break;
        }
        case 'smash': { // hammer impact: a jagged star + a flat ground ring
          if (e.age < e.delay) break; const k = (e.age - e.delay) / (e.life - e.delay);
          ctx.translate(e.x, e.y); ctx.globalAlpha = 1 - k; ctx.fillStyle = `rgba(${e.color},1)`; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
          const R = 10 + 18 * Math.sqrt(k); ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = i % 2 ? R * 0.45 : R; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = `rgba(255,230,160,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 36, 12 + 30 * k, 4 + 8 * k, 0, 0, 6.3); ctx.stroke(); break;
        }
        case 'bash': {
          ctx.translate(e.x, e.y); ctx.scale(e.dir, 1); ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#cbb8ff'; ctx.shadowColor = '#a58bff'; ctx.shadowBlur = 10;
          for (let i = 0; i < 3; i++) { ctx.lineWidth = 5 - i * 1.3; ctx.beginPath(); ctx.arc(-6 + q * 22 + i * 7, 0, 18 + i * 6, -0.95, 0.95); ctx.stroke(); } break;
        }
        case 'sonar': { // three arcs ride out to the target
          const a = Math.atan2(e.y1 - e.y0, e.x1 - e.x0); ctx.strokeStyle = '#7df0ff'; ctx.shadowColor = '#7df0ff'; ctx.shadowBlur = 8;
          for (let i = 0; i < 3; i++) { const k = q * 1.4 - i * 0.2; if (k < 0 || k > 1) continue; const x = e.x0 + (e.x1 - e.x0) * k, y = e.y0 + (e.y1 - e.y0) * k;
            ctx.globalAlpha = 1 - k * 0.6; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 7 + k * 8, a - 0.9, a + 0.9); ctx.stroke(); } break;
        }
        case 'beam': { // wavy heal / weld beam, with crosses riding along for the medic
          const dx = e.x1 - e.x0, dy = e.y1 - e.y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, grow = Math.min(1, q * 4);
          ctx.globalAlpha = 1 - q; ctx.strokeStyle = `rgb(${e.color})`; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10; ctx.lineWidth = 3.5;
          ctx.beginPath(); for (let i = 0; i <= 16; i++) { const k = i / 16 * grow, w = Math.sin(k * 14 - e.age * 40) * 3 * Math.sin(k * Math.PI); ctx.lineTo(e.x0 + dx * k + nx * w, e.y0 + dy * k + ny * w); } ctx.stroke();
          if (e.cross) { ctx.shadowBlur = 0; ctx.fillStyle = '#eafff0'; for (let i = 0; i < 2; i++) { const k = (q * 1.6 + i * 0.45) % 1, x = e.x0 + dx * k, y = e.y0 + dy * k; ctx.fillRect(x - 1.5, y - 5, 3, 10); ctx.fillRect(x - 5, y - 1.5, 10, 3); } }
          break;
        }
        case 'bubble': { // a bubble floats over in an arc, then pops
          const k = Math.min(1, q / 0.8), x = e.x0 + (e.x1 - e.x0) * k, y = e.y0 + (e.y1 - e.y0) * k - Math.sin(k * Math.PI) * 26;
          if (q < 0.8) { const r = 6 + 4 * k; ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgba(255,190,232,.35)'; ctx.strokeStyle = '#ffd6f2'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y + Math.sin(e.age * 30) * 1.5, r, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, 6.3); ctx.fill(); }
          else { const p = (q - 0.8) / 0.2; ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffd6f2'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * 1.047; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (8 + p * 6), y + Math.sin(a) * (8 + p * 6)); ctx.lineTo(x + Math.cos(a) * (12 + p * 10), y + Math.sin(a) * (12 + p * 10)); ctx.stroke(); } }
          break;
        }
        case 'boom': {
          const r = e.r * (0.35 + 0.65 * Math.sqrt(q)), gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
          gr.addColorStop(0, `rgba(255,250,210,${0.95 * (1 - q)})`); gr.addColorStop(0.4, `rgba(255,170,60,${0.75 * (1 - q)})`); gr.addColorStop(1, 'rgba(255,90,40,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, 6.3); ctx.fill(); break;
        }
        case 'die': { // squash flat, flash white, then gone (debris takes over)
          ctx.globalAlpha = 1 - q * q; ctx.translate(e.x, e.y); ctx.scale(1 + 0.5 * q, Math.max(0.05, 1 - 0.9 * q)); ctx.translate(-e.x, -e.y);
          drawFoe(ctx, e.type, e.x, e.y, e.s, { t: e.t, facing: e.facing, revealed: true, seed: e.seed, flash: 1 }); break;
        }
      }
      ctx.restore();
    }
  }
  drawNums(ctx) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const n of this.nums) {
      const q = n.age / n.life, pop = q < 0.15 ? 1 + (n.big ? 0.8 : 0.45) * (1 - q / 0.15) : 1, size = (n.big ? 30 : 19) * pop;
      ctx.globalAlpha = q > 0.65 ? (1 - q) / 0.35 : 1;
      ctx.font = `900 ${size.toFixed(1)}px system-ui, sans-serif`; ctx.lineWidth = n.big ? 6 : 4.5; ctx.strokeStyle = OUTLINE; ctx.fillStyle = n.color;
      const y = n.y - 34 * (1 - Math.pow(1 - q, 2)), x = n.x + n.dx * q;
      ctx.strokeText(n.v, x, y); ctx.fillText(n.v, x, y);
    }
    ctx.restore();
  }
  /** full-canvas flashes in device pixels, drawn after the board transform is reset */
  drawScreen(ctx, w, h) {
    if (this.flash > 0.01) { ctx.fillStyle = `rgba(${this.flashC},${this.flash * 0.6})`; ctx.fillRect(0, 0, w, h); }
    if (this.vig > 0.01) {
      const a = (JUICE.calm ? 0.35 : 0.7) * this.vig, gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
      gr.addColorStop(0, 'rgba(255,30,60,0)'); gr.addColorStop(1, `rgba(255,30,60,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    }
  }
}
