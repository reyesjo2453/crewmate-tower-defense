'use strict';
/* ============================================================
   Scene: lighting and living scenery.
   Every room has its own darkness between the lights; the reactor,
   vents, crew, bullets, blasts, glowing foes and glowing decor push
   it back with coloured light. Each place also gets drifting ambient
   particles (dust, snow, petals, spores, embers, fireflies…) and
   little animations on its decor (blinking consoles, sweeping
   scanners, an eye that watches the nearest foe).

   Purely cosmetic, like juice.js: Math.random only (never the
   battle rng), and only exists when the game has a canvas.
   ============================================================ */

// per place: amb = darkness between lights (0..1), tint = darkness colour, motes = ambient particles, flick = flickering lights
const LIGHT = {
  skeld: { amb: 0.2, tint: '6,10,26', motes: 'dust' },
  medbay: { amb: 0.12, tint: '6,18,24', motes: 'dust' },
  polus: { amb: 0.18, tint: '20,14,50', motes: 'snow' },
  mira: { amb: 0.22, tint: '30,16,50', motes: 'petal' },
  fungle: { amb: 0.44, tint: '2,14,10', motes: 'spore' },
  meridian: { amb: 0.4, tint: '20,4,8', motes: 'spark', flick: true },
  hollow: { amb: 0.46, tint: '10,2,22', motes: 'static' },
  rig: { amb: 0.36, tint: '16,8,4', motes: 'ember' },
  haven: { amb: 0.4, tint: '10,10,34', motes: 'firefly' }
};
// decor that glows: [colour ('glow' = the place's glow colour), radius in tiles, strength]
const DECOR_LIGHT = {
  console: ['glow', 0.9, 0.7], scanner: ['glow', 0.8, 0.6], lava: ['#ff7a2a', 1.5, 1], glowshroom: ['#c06bff', 1.4, 0.9], crystal: ['#c9a0ff', 1.0, 0.7],
  eye: ['glow', 1.1, 0.8], ore: ['glow', 0.8, 0.6], lamp: ['#ffe2a0', 1.8, 1], speaker: ['glow', 0.7, 0.5], fountain: ['#7fd8ff', 0.9, 0.5],
  static: ['glow', 0.8, 0.6], wreck: ['#ffd24a', 0.6, 0.5], drill: ['#ffa63d', 0.5, 0.4]
};
// foes that glow in the dark
const FOE_GLOW = {
  ghost: ['#bfe8ff', 1.0], leech: ['#78ffc8', 1.1], heart: ['#d58bff', 2.6], bomber: ['#ffb347', 0.7], mender: ['#9dffb4', 1.0], warden: ['#7ac8ff', 1.2],
  rally: ['#ff8ab8', 1.1], drone: ['#ff4d6a', 0.6], sporemother: ['#c06bff', 1.6], foreman: ['#ffa63d', 1.2], conductor: ['song', 2.2], spore: ['#c06bff', 0.6], brute: ['#ff2b3a', 0.7]
};
const GLOWY = { spore: 1, spark: 1, ember: 1, firefly: 1, static: 1 };
const RGB = {};
function rgbOf(hex) {
  if (RGB[hex]) return RGB[hex];
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16); return (RGB[hex] = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255));
}
const sr = (a, b) => a + Math.random() * (b - a);

class Scene {
  constructor(g) { this.g = g; this.p = []; this.statics = []; this.spots = []; this.intro = 0; this.sparkT = 0; this.cfg = LIGHT.skeld; }
  reset() { this.p = []; this.intro = 1; this.sparkT = 1; }
  /** a freshly drawn board: remember where its glowing decor and walls are */
  setBoard(board) {
    const g = this.g, th = g.th; this.cfg = LIGHT[g.level.theme] || LIGHT.skeld; this.spots = board.spots || [];
    this.statics = [];
    for (const sp of this.spots) {
      const cx = (sp.x + 0.5) * TILE, cy = (sp.y + 0.5) * TILE;
      if (sp.kind === 'wall') {
        if (th.star) this.statics.push({ x: cx, y: cy - 4, r: 0.7 * TILE, c: '150,180,255', k: 0.35, ph: Math.random() * 6 });
        else if (th.wallKind === 'rock') this.statics.push({ x: cx, y: cy - 6, r: 0.8 * TILE, c: rgbOf(th.glow), k: 0.45, ph: Math.random() * 6 });
        else if (th.wallKind === 'glass') this.statics.push({ x: cx, y: cy - 6, r: 1.0 * TILE, c: '122,255,214', k: 0.45, ph: Math.random() * 6 });
        continue;
      }
      const d = DECOR_LIGHT[sp.kind]; if (!d) continue;
      this.statics.push({ x: cx, y: cy, r: d[1] * TILE, c: rgbOf(d[0] === 'glow' ? th.glow : d[0]), k: d[2], ph: Math.random() * 6, flk: 0 });
    }
  }

  /* ---------- ambient particles ---------- */
  rate() { const g = this.g; return g.paused || g.frozen ? 0 : g.speed * (g.timeScale || 1); }
  spawn(kind) {
    const g = this.g, W = g.cols * TILE, H = g.rows * TILE, e = { kind, age: 0, x: sr(0, W), y: sr(0, H), vx: 0, vy: 0, s: 1.5, life: sr(4, 7), rot: sr(0, 6), vr: 0, ph: sr(0, 6) };
    switch (kind) {
      case 'dust': e.vx = sr(-6, 6); e.vy = sr(-4, 3); e.s = sr(1, 2); break;
      case 'snow': e.y = -6; e.vx = sr(6, 16); e.vy = sr(16, 30); e.s = sr(1.4, 2.8); e.life = H / e.vy + 1; break;
      case 'petal': e.x = -8; e.vx = sr(18, 32); e.vy = sr(4, 12); e.s = sr(2.5, 4); e.vr = sr(-3, 3); e.life = W / e.vx + 1; e.c = Math.random() < 0.5 ? '255,170,205' : '255,240,245'; break;
      case 'spore': e.y = sr(H * 0.3, H); e.vx = sr(-4, 4); e.vy = sr(-14, -7); e.s = sr(1.6, 3); e.c = Math.random() < 0.7 ? '200,120,255' : '140,255,200'; break;
      case 'ember': e.y = sr(H * 0.4, H); e.vx = sr(-6, 6); e.vy = sr(-22, -10); e.s = sr(1.2, 2.4); e.life = sr(2.5, 4.5); e.c = Math.random() < 0.7 ? '255,166,61' : '255,220,120'; break;
      case 'static': e.s = sr(2, 4.5); e.life = sr(0.25, 0.8); e.c = Math.random() < 0.6 ? '213,139,255' : '255,255,255'; break;
      case 'firefly': e.vx = sr(-8, 8); e.vy = sr(-8, 8); e.s = sr(1.6, 2.6); e.life = sr(5, 9); e.c = Math.random() < 0.6 ? '255,230,140' : '150,255,214'; break;
      case 'spark': e.vx = sr(-50, 50); e.vy = sr(-60, 0); e.s = sr(1.2, 2); e.life = sr(0.5, 1); e.grav = 240; e.c = '255,190,90'; break;
    }
    this.p.push(e); return e;
  }
  step(dt) {
    this.intro = Math.max(0, this.intro - dt * 1.6);
    const r = this.rate(), pdt = dt * r, g = this.g; if (!g.cols) return;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const e = this.p[i]; e.age += pdt; if (e.age >= e.life) { this.p.splice(i, 1); continue; }
      if (e.grav) e.vy += e.grav * pdt;
      if (e.kind === 'firefly' || e.kind === 'spore') e.vx += Math.sin(e.age * 1.7 + e.ph) * 10 * pdt;
      if (e.kind === 'snow') e.vx += Math.sin(e.age * 2 + e.ph) * 6 * pdt;
      e.x += e.vx * pdt; e.y += e.vy * pdt; e.rot += e.vr * pdt;
    }
    if (!r) return;
    const kind = this.cfg.motes, want = Math.round(g.cols * g.rows * (kind === 'static' ? 0.35 : kind === 'snow' ? 0.7 : 0.45));
    const n = this.p.filter(e => e.kind === kind).length;
    if (n < want && Math.random() < pdt * want * 0.6) this.spawn(kind);
    if (kind === 'spark') { // the wreck still sparks: a few dust motes plus a shower now and then
      if (this.p.length < want && Math.random() < pdt * 4) this.spawn('dust');
      this.sparkT -= pdt;
      if (this.sparkT <= 0) { this.sparkT = sr(1.5, 4); const w = this.spots.filter(s => s.kind === 'wall' || s.kind === 'wreck'), at = w.length ? w[Math.floor(Math.random() * w.length)] : null; if (at) for (let i = 0; i < 7; i++) { const e = this.spawn('spark'); e.x = (at.x + 0.5) * TILE + sr(-8, 8); e.y = (at.y + 0.6) * TILE; } }
    }
    if (this.p.length > 160) this.p.splice(0, this.p.length - 160);
  }

  /* ---------- animated decor (drawn on the floor, under everyone) ---------- */
  drawBack(ctx, T) {
    const g = this.g, th = g.th;
    for (const sp of this.spots) {
      ctx.save(); ctx.translate(sp.x * TILE, sp.y * TILE);
      switch (sp.kind) {
        case 'console': {
          const k = Math.floor(T * 3 + sp.x * 3 + sp.y) % 3;
          ctx.fillStyle = k === 0 ? '#fff6a0' : '#5a4a20'; ctx.fillRect(16, 40, 5, 4); ctx.fillStyle = k === 1 ? '#ff9a9a' : '#5a2020'; ctx.fillRect(24, 40, 5, 4);
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(15, 24 + ((T * 9 + sp.x * 5) % 12), 34, 1.5); break;
        }
        case 'scanner': { const a = T * 2.4 + sp.x; ctx.strokeStyle = th.glow; ctx.globalAlpha = 0.8; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(32, 32, 16, a, a + 0.9); ctx.stroke(); break; }
        case 'speaker': { const b = (T * 1.6 + sp.x * 0.3) % 1; ctx.strokeStyle = th.glow; ctx.globalAlpha = 0.6 * (1 - b); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(32, 38, 10 + b * 16, 0, 6.3); ctx.stroke(); break; }
        case 'fountain': { ctx.fillStyle = '#e4f6ff'; for (let i = 0; i < 4; i++) { const k = (T * 1.4 + i / 4) % 1, dx = (i % 2 ? 1 : -1) * k * 12; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(32 + dx, 26 - Math.sin(k * Math.PI) * 10, 1.8, 0, 6.3); ctx.fill(); } break; }
        case 'lava': { const k = (T * 0.8 + sp.x * 0.37) % 1; ctx.strokeStyle = '#ffd24a'; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(26 + (sp.y * 7) % 12, 34, 2 + k * 5, 0, 6.3); ctx.stroke(); break; }
        case 'eye': { // it watches the nearest foe, and blinks
          let tx = 0, ty = 0, bd = 1e9; const ex = (sp.x + 0.5) * TILE, ey = (sp.y + 0.5) * TILE;
          for (const f of g.foes) { const d = (f.x - ex) ** 2 + (f.y - ey) ** 2; if (d < bd) { bd = d; tx = f.x - ex; ty = f.y - ey; } }
          const l = Math.hypot(tx, ty) || 1, ox = bd < 1e9 ? tx / l * 6 : Math.sin(T * 0.7 + sp.x) * 5, oy = bd < 1e9 ? ty / l * 3 : 0;
          ctx.fillStyle = '#1a0f2d'; ctx.beginPath(); ctx.ellipse(32, 32, 20, 11, 0, 0, 6.3); ctx.fill();
          ctx.fillStyle = th.glow; ctx.beginPath(); ctx.arc(32 + ox, 32 + oy, 8, 0, 6.3); ctx.fill(); ctx.fillStyle = '#10051f'; ctx.beginPath(); ctx.ellipse(32 + ox * 1.15, 32 + oy, 3, 7, 0, 0, 6.3); ctx.fill();
          const bl = (T * 0.5 + sp.x * 0.13 + sp.y * 0.29) % 4; if (bl < 0.15) { ctx.fillStyle = '#2a1740'; ctx.beginPath(); ctx.ellipse(32, 32, 21, 12 * Math.sin(bl / 0.15 * Math.PI), 0, 0, 6.3); ctx.fill(); }
          break;
        }
        case 'wall': if (th.wallKind === 'glass') { // the aurora shimmers past the window
          ctx.beginPath(); rr(ctx, 8, 8, 48, 36, 6); ctx.clip(); const k = ((T * 0.08 + sp.x * 0.11) % 1) * 96 - 24;
          const gg = ctx.createLinearGradient(k - 20, 0, k + 20, 0); gg.addColorStop(0, 'rgba(122,255,214,0)'); gg.addColorStop(0.5, 'rgba(122,255,214,.28)'); gg.addColorStop(1, 'rgba(180,138,255,0)');
          ctx.fillStyle = gg; ctx.fillRect(0, 0, 64, 64);
        } break;
      }
      ctx.restore();
    }
  }

  /* ---------- lighting ---------- */
  lights(T) {
    const g = this.g, th = g.th, out = [], dark = g.darkA, calm = JUICE.calm;
    const add = (x, y, r, c, k) => out.push({ x, y, r, c, k });
    for (const l of this.statics) {
      let k = l.k * (0.9 + 0.1 * Math.sin(T * 2 + l.ph));
      if (this.cfg.flick && !calm) { if (l.flk > 0) l.flk -= 0.016; else if (Math.random() < 0.004) l.flk = sr(0.08, 0.3); if (l.flk > 0) k *= 0.25; }
      add(l.x, l.y, l.r, l.c, k);
    }
    const ex = g.reactorPos(); add(ex[0], ex[1], 2.3 * TILE, rgbOf(th.glow), 1 + 0.08 * Math.sin(T * 4));
    g.routes.forEach(r => { const p = r.pts[0]; add(p[0] * TILE, p[1] * TILE, 1.3 * TILE, '255,60,80', 0.75 + 0.2 * Math.sin(T * 3)); });
    for (const c of g.crew) {
      if (c.barricade) continue;
      const lo = dark > 0.3 ? Math.max(1.1, g.rangeOf(c) * 0.8) : 1.3;
      add(c.cx, c.cy, lo * TILE, c.skillT > 0 ? '255,240,150' : '255,244,226', c.skillT > 0 ? 1 : 0.7);
      if (c.fireT > 0) add(c.cx + c.facing * 20, c.cy - 28, 0.9 * TILE, '255,220,140', 0.8);
    }
    for (const s of g.shots) add(s.x, s.y, (s.big ? 0.8 : 0.5) * TILE, rgbOf(s.color), 0.8);
    for (const e of g.fx) {
      const q = e.age / e.life;
      if (e.k === 'bolt') add(e.pts[e.pts.length - 1][0], e.pts[e.pts.length - 1][1], 1.6 * TILE, rgbOf(e.color), 1 - q);
      else if (e.k === 'ring' && !e.dim && e.r1 >= 56 && e.color[0] === '#') add(e.x, e.y, Math.min(4, e.r1 / TILE + 0.6) * TILE, rgbOf(e.color), (1 - q) * 0.9);
    }
    for (const f of g.foes) {
      const gl = FOE_GLOW[f.type]; if (!gl || f.under || !g.visible(f)) continue;
      const c = gl[0] === 'song' ? SONGS[f.song].rgb : rgbOf(gl[0]); add(f.x, f.y - (f.air ? 30 : 24), gl[1] * TILE, c, 0.85);
    }
    if (g.sabo) g.sabo.panels.forEach(p => add((p.x + 0.5) * TILE, (p.y + 0.5) * TILE, 1.3 * TILE, rgbOf(g.sabo.def.color), 0.9 + 0.1 * Math.sin(T * 8)));
    return out;
  }
  canvas(name, w, h) {
    let c = this[name]; if (!c) c = this[name] = document.createElement('canvas');
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return c;
  }
  drawLight(ctx, T) {
    const g = this.g, S = 16, k = S / TILE, w = g.cols * S, h = g.rows * S, W = g.cols * TILE, H = g.rows * TILE;
    const A = Math.max(this.cfg.amb, g.darkA * 0.88), L = this.lights(T);
    if (A > 0.02) { // darkness, with soft holes where the light is
      const dc = this.canvas('dc', w, h), d = dc.getContext('2d');
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, w, h); d.fillStyle = `rgba(${this.cfg.tint},${A})`; d.fillRect(0, 0, w, h);
      d.globalCompositeOperation = 'destination-out';
      for (const l of L) {
        const r = l.r * k, a = Math.min(1, l.k), gr = d.createRadialGradient(l.x * k, l.y * k, 0, l.x * k, l.y * k, r);
        gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.fillRect(l.x * k - r, l.y * k - r, r * 2, r * 2);
      }
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(dc, 0, 0, W, H); ctx.restore();
    }
    // coloured glow, added on top
    const cc = this.canvas('cc', w, h), c2 = cc.getContext('2d'), str = 0.1 + A * 0.4;
    c2.globalCompositeOperation = 'source-over'; c2.clearRect(0, 0, w, h); c2.globalCompositeOperation = 'lighter';
    for (const l of L) {
      const r = l.r * k, gr = c2.createRadialGradient(l.x * k, l.y * k, 0, l.x * k, l.y * k, r);
      gr.addColorStop(0, `rgba(${l.c},${Math.min(1, l.k) * str})`); gr.addColorStop(1, `rgba(${l.c},0)`); c2.fillStyle = gr; c2.fillRect(l.x * k - r, l.y * k - r, r * 2, r * 2);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(cc, 0, 0, W, H); ctx.restore();
    this.drawMotes(ctx, T);
  }
  drawMotes(ctx, T) {
    ctx.save();
    for (const e of this.p) {
      const q = e.age / e.life, fade = Math.min(1, e.age * 3, (e.life - e.age) * 2);
      if (GLOWY[e.kind]) {
        ctx.globalCompositeOperation = 'lighter';
        const a = fade * (e.kind === 'firefly' ? 0.5 + 0.5 * Math.sin(e.age * 3 + e.ph) : e.kind === 'static' ? (Math.random() < 0.3 ? 0.2 : 0.9) : 0.9);
        if (e.kind === 'static') { ctx.fillStyle = `rgba(${e.c},${a * 0.7})`; ctx.fillRect(e.x, e.y, e.s * 2, e.s * 0.6); continue; }
        const r = e.s * 3, gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r); gr.addColorStop(0, `rgba(${e.c},${a})`); gr.addColorStop(0.35, `rgba(${e.c},${a * 0.5})`); gr.addColorStop(1, `rgba(${e.c},0)`);
        ctx.fillStyle = gr; ctx.fillRect(e.x - r, e.y - r, r * 2, r * 2);
      } else {
        ctx.globalCompositeOperation = 'source-over';
        if (e.kind === 'petal') { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot); ctx.fillStyle = `rgba(${e.c},${fade * 0.9})`; ctx.beginPath(); ctx.ellipse(0, 0, e.s, e.s * 0.5, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
        else { ctx.fillStyle = e.kind === 'snow' ? `rgba(255,255,255,${fade * 0.85})` : `rgba(225,232,255,${fade * (0.25 + 0.25 * Math.sin(e.age * 2 + e.ph))})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.s, 0, 6.3); ctx.fill(); }
      }
    }
    ctx.restore();
  }
  /** a quick fade up from black as a battle opens */
  drawTop(ctx) {
    if (this.intro <= 0) return; const g = this.g, a = this.intro * this.intro;
    ctx.save(); ctx.fillStyle = `rgba(4,6,14,${a})`; ctx.fillRect(-20, -20, g.cols * TILE + 40, g.rows * TILE + 40); ctx.restore();
  }
}
