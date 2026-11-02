'use strict';
/* ============================================================
   Original vector art, drawn with Canvas.
   Everything is homage-style crewmate bean characters and
   invented foes — no copied game assets.
   ============================================================ */

const OUTLINE = '#0d1018';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (f - r) * p); g = Math.round(g + (f - g) * p); b = Math.round(b + (f - b) * p);
  return `rgb(${r},${g},${b})`;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

/* ---------- The crewmate bean ---------- */
// Local space: feet at (0,0), body ~40 wide, ~56 tall (in 64-unit tile space), facing right.
function beanPath(ctx, wide) {
  const w = 20 * (wide || 1);
  ctx.beginPath();
  ctx.moveTo(-w, -6);
  ctx.lineTo(-w, -34);
  ctx.bezierCurveTo(-w, -62, w, -62, w, -34);
  ctx.lineTo(w, -6);
  ctx.quadraticCurveTo(w, 0, w - 6, 0);
  ctx.lineTo(5, 0);
  ctx.quadraticCurveTo(2, 0, 2, -5);
  ctx.lineTo(2, -9);
  ctx.quadraticCurveTo(0, -12, -2, -9);
  ctx.lineTo(-2, -5);
  ctx.quadraticCurveTo(-2, 0, -5, 0);
  ctx.lineTo(-w + 6, 0);
  ctx.quadraticCurveTo(-w, 0, -w, -6);
  ctx.closePath();
}

function drawHat(ctx, hat, color) {
  ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  switch (hat) {
    case 'hardhat': // Brick — safety helmet with lamp
      ctx.fillStyle = '#ffcc1f';
      ctx.beginPath(); ctx.moveTo(-17, -47); ctx.bezierCurveTo(-16, -66, 16, -66, 17, -47); ctx.lineTo(23, -47); ctx.lineTo(23, -43); ctx.lineTo(-23, -43); ctx.lineTo(-23, -47); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6b0'; ctx.beginPath(); ctx.arc(6, -57, 4, 0, 6.3); ctx.fill(); ctx.stroke();
      break;
    case 'dome': // Tank — big glass bubble
      ctx.fillStyle = 'rgba(190,235,255,.28)';
      ctx.beginPath(); ctx.arc(0, -42, 31, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(25, -34); ctx.lineTo(-25, -34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#cfefff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, -42, 31, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(0, -42, 26, Math.PI * 1.15, Math.PI * 1.4); ctx.stroke();
      break;
    case 'goggles': // Rook — headband with pilot goggles
      ctx.fillStyle = '#2a2f45'; rr(ctx, -21, -50, 42, 7, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(-6, -57, 6.5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#aef'; ctx.beginPath(); ctx.arc(-6, -57, 3.2, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(7, -58, 6.5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#aef'; ctx.beginPath(); ctx.arc(7, -58, 3.2, 0, 6.3); ctx.fill();
      break;
    case 'nurse': // Lumi — nurse cap
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-16, -48); ctx.lineTo(-13, -62); ctx.lineTo(13, -62); ctx.lineTo(16, -48); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff3b4d'; ctx.fillRect(-2.5, -60, 5, 10); ctx.fillRect(-6.5, -57, 13, 4.5);
      break;
    case 'bolt': // Sparky — antenna with a bolt
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -57); ctx.bezierCurveTo(-8, -62, 8, -66, 0, -71); ctx.stroke();
      ctx.fillStyle = '#7ef9ff'; ctx.beginPath(); ctx.moveTo(3, -86); ctx.lineTo(-6, -72); ctx.lineTo(0, -72); ctx.lineTo(-3, -62); ctx.lineTo(7, -77); ctx.lineTo(1, -77); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'dish': // Echo — headphones & little radar dish
      ctx.strokeStyle = '#243247'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, -40, 24, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.fillStyle = '#2b3b52'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      rr(ctx, -26, -42, 8, 16, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#cfe'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(10, -60); ctx.lineTo(10, -70); ctx.stroke();
      ctx.fillStyle = '#e8fffb'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(10, -72, 10, 5, -0.4, Math.PI, 0, true); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'captain': // Juno — peaked captain cap
      ctx.fillStyle = '#16213a'; ctx.beginPath(); ctx.moveTo(-19, -47); ctx.bezierCurveTo(-18, -66, 18, -66, 19, -47); ctx.lineTo(-19, -47); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0d1530'; rr(ctx, -2, -50, 28, 6, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(0, -55, 4.5, 0, 6.3); ctx.fill(); ctx.stroke();
      break;
    case 'cap': // Kestrel — pilot cap
      ctx.fillStyle = '#6b3a14'; ctx.beginPath(); ctx.moveTo(-17, -47); ctx.bezierCurveTo(-16, -64, 16, -64, 17, -47); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4b2608'; rr(ctx, 4, -50, 22, 6, 3); ctx.fill(); ctx.stroke();
      break;
  }
}

/** o: {color, hat, facing(1|-1), t (anim secs), alpha, ghost, dark, wide, flash(0..1), pose} */
function drawCrewmate(ctx, x, y, s, o) {
  const u = s / 64, f = o.facing || 1, bob = Math.sin((o.t || 0) * 5) * (o.idle === false ? 0 : 1.2);
  ctx.save();
  ctx.translate(x, y); ctx.scale(u * f, u); ctx.translate(0, -bob + (o.dy || 0));
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const col = o.color || '#d8232a';
  const wide = o.wide || 1;
  // shadow
  if (!o.noShadow) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 2 + bob, 22 * wide, 6, 0, 0, 6.3); ctx.fill(); }
  ctx.lineJoin = 'round'; ctx.lineWidth = 3.4; ctx.strokeStyle = OUTLINE;
  // backpack
  ctx.fillStyle = shade(col, -0.22); rr(ctx, -28 * wide, -40, 12, 28, 5); ctx.fill(); ctx.stroke();
  // body
  beanPath(ctx, wide);
  ctx.fillStyle = col; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,.20)'; ctx.fillRect(-30, -20, 60, 24);
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(-10 * wide, -42, 5, 10, 0.25, 0, 6.3); ctx.fill();
  if (o.flash) { ctx.fillStyle = `rgba(255,255,255,${o.flash * 0.7})`; ctx.fillRect(-30, -70, 60, 80); }
  ctx.restore();
  beanPath(ctx, wide); ctx.stroke();
  // visor
  const vx = 1, vw = 25 * wide;
  rr(ctx, vx, -50, vw, 17, 8.5);
  const g = ctx.createLinearGradient(0, -50, 0, -33);
  if (o.dark) { g.addColorStop(0, '#2a0e12'); g.addColorStop(1, '#0e0407'); } else { g.addColorStop(0, '#d7fbff'); g.addColorStop(1, '#6bc9e6'); }
  ctx.fillStyle = g; ctx.fill(); ctx.stroke();
  if (o.dark) { ctx.fillStyle = '#ff2b3a'; ctx.beginPath(); ctx.ellipse(vx + vw * 0.55, -41.5, vw * 0.3, 2.4, 0, 0, 6.3); ctx.fill(); }
  else { ctx.fillStyle = 'rgba(255,255,255,.9)'; rr(ctx, vx + 5, -47.5, 10 * wide, 4, 2); ctx.fill(); }
  if (o.hat) drawHat(ctx, o.hat, col);
  ctx.restore();
}

function drawStars(ctx, x, y, n, size) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6;
  for (let i = 0; i < n; i++) {
    const cx = (i - (n - 1) / 2) * size * 1.5;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? size * 0.45 : size, a = -Math.PI / 2 + k * Math.PI / 5;
      ctx.lineTo(cx + Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Foes ---------- */
function ghostBody(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.55);
  ctx.bezierCurveTo(-w, -h * 1.15, w, -h * 1.15, w, -h * 0.55);
  ctx.lineTo(w, 0);
  const n = 4, sw = (2 * w) / n;
  for (let i = 0; i < n; i++) { const x0 = w - i * sw; ctx.quadraticCurveTo(x0 - sw * 0.25, h * 0.2, x0 - sw * 0.5, 0); ctx.quadraticCurveTo(x0 - sw * 0.75, -h * 0.2, x0 - sw, 0); }
  ctx.closePath();
}

/** Draws a foe at (x,y)=feet position. o: {t, facing, hp01, revealed, seed, flash, scale} */
function drawFoe(ctx, id, x, y, s, o) {
  const T = o.t || 0, u = s / 64, f = o.facing || 1, seed = o.seed || 0;
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const shadow = (w, h, a) => { ctx.fillStyle = `rgba(0,0,0,${a || 0.3})`; ctx.beginPath(); ctx.ellipse(0, 2, w * u, h * u, 0, 0, 6.3); ctx.fill(); };
  const flash = o.flash ? o.flash : 0;
  switch (id) {
    case 'crawler': {
      shadow(22, 6); ctx.scale(u * f, u);
      const wig = Math.sin(T * 14 + seed) * 3;
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) { // legs
        const lx = i * 9; ctx.beginPath(); ctx.moveTo(lx, -8); ctx.lineTo(lx + 5 + (i % 2 ? wig : -wig), 2); ctx.stroke();
      }
      ctx.fillStyle = flash ? '#fff' : '#53306e';
      ctx.beginPath(); ctx.ellipse(0, -16, 27, 17, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = flash ? '#fff' : '#7a4a9c'; ctx.beginPath(); ctx.ellipse(-4, -22, 16, 6, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#ff375f'; // eyes
      ctx.beginPath(); ctx.arc(11, -21, 5.5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(21, -17, 4, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(12, -22.5, 1.8, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(21.5, -18, 1.4, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#53306e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, -30); ctx.quadraticCurveTo(22, -42, 30, -36); ctx.stroke();
      break;
    }
    case 'mimic': case 'plated': {
      shadow(24, 6);
      const plated = id === 'plated';
      drawCrewmate(ctx, 0, 0, 64 * (plated ? 1.0 : 0.9) * (s / 64), { color: flash ? '#fff' : (plated ? '#2b2431' : '#27222f'), dark: true, facing: f, t: T + seed, noShadow: true, wide: plated ? 1.15 : 1 });
      ctx.scale(u * f, u);
      if (plated) {
        ctx.fillStyle = '#9aa8ba'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
        rr(ctx, -26, -34, 52, 20, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c3cedd'; rr(ctx, -22, -31, 22, 5, 2); ctx.fill();
        ctx.fillStyle = '#6b7a8e'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * 16, -24, 2.3, 0, 6.3); ctx.fill(); }
        ctx.fillStyle = '#9aa8ba'; rr(ctx, -18, -62, 14, 10, 4); ctx.fill(); ctx.stroke();
      } else { // creepy stitched grin
        ctx.strokeStyle = '#ff6a78'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -28); ctx.lineTo(10, -26); ctx.lineTo(14, -29); ctx.lineTo(18, -26); ctx.lineTo(22, -28); ctx.stroke();
      }
      break;
    }
    case 'ghost': {
      const hov = Math.sin(T * 3 + seed) * 4;
      shadow(20, 5, 0.18); ctx.scale(u * f, u); ctx.translate(0, -26 + hov);
      ctx.globalAlpha = 0.82; ctx.fillStyle = flash ? '#fff' : '#bfe8ff'; ctx.strokeStyle = '#eafaff'; ctx.lineWidth = 3;
      ghostBody(ctx, 20, 52); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(40,70,120,.85)'; rr(ctx, 1, -45, 21, 14, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -38, 2.6, 0, 6.3); ctx.arc(16, -38, 2.6, 0, 6.3); ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'drone': {
      const hov = Math.sin(T * 4 + seed) * 3;
      shadow(18, 4, 0.2); ctx.scale(u, u); ctx.translate(0, -34 + hov);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      ctx.fillStyle = '#7b8798'; ctx.beginPath(); ctx.ellipse(0, 0, 25, 10, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = flash ? '#fff' : '#a6b4c8'; ctx.beginPath(); ctx.ellipse(0, -9, 15, 12, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      const pulse = 0.6 + 0.4 * Math.sin(T * 8 + seed);
      ctx.fillStyle = `rgba(255,50,70,${pulse})`; ctx.beginPath(); ctx.arc(f * 4, -10, 5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3d4658'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -16); ctx.lineTo(-14, -24); ctx.moveTo(14, -16); ctx.lineTo(14, -24); ctx.stroke();
      const rot = Math.sin(T * 40 + seed) * 12; ctx.beginPath(); ctx.moveTo(-14 - rot, -25); ctx.lineTo(-14 + rot, -25); ctx.moveTo(14 - rot, -25); ctx.lineTo(14 + rot, -25); ctx.stroke();
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(-12, 4, 2.5, 0, 6.3); ctx.arc(12, 4, 2.5, 0, 6.3); ctx.fill();
      break;
    }
    case 'shifter': {
      shadow(22, 6, o.revealed ? 0.3 : 0.1);
      if (!o.revealed) { // disguised, shimmering
        const cols = ['#e8a0c8', '#9ad8a0', '#f0c860', '#80b0ff'];
        drawCrewmate(ctx, 0, 0, s * 0.95, { color: cols[seed % 4], hat: null, facing: f, t: T + seed, alpha: 0.38 + 0.1 * Math.sin(T * 6 + seed), noShadow: true });
        ctx.scale(u, u); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', 0, -62);
      } else {
        ctx.scale(u * f, u);
        const m = Math.sin(T * 9 + seed) * 2.5;
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.4; ctx.fillStyle = flash ? '#fff' : '#8a35c8';
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.bezierCurveTo(-30, -20 - m, -18, -50, 0, -52); ctx.bezierCurveTo(22, -50, 30, -22 + m, 24, 0);
        ctx.quadraticCurveTo(14, -8, 6, 0); ctx.quadraticCurveTo(-4, -8, -12, 0); ctx.quadraticCurveTo(-18, -5, -22, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#220033'; ctx.beginPath(); ctx.ellipse(6, -26, 14, 9 + m / 2, 0, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-4 + i * 5, -33 + m / 2); ctx.lineTo(-1.5 + i * 5, -26); ctx.lineTo(-6.5 + i * 5, -26); ctx.fill(); }
        ctx.fillStyle = '#ffee33'; ctx.beginPath(); ctx.arc(-6, -44, 4, 0, 6.3); ctx.arc(8, -45, 4, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.fillRect(-7, -46, 2, 4); ctx.fillRect(7, -47, 2, 4);
      }
      break;
    }
    case 'spore': case 'sporelet': {
      shadow(id === 'spore' ? 24 : 15, 6); ctx.scale(u * f, u);
      const sw = Math.sin(T * 6 + seed) * 2.5;
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.2;
      ctx.fillStyle = flash ? '#fff' : '#efe0c6';
      rr(ctx, -10, -28, 20, 28, 8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-6 + sw, 6); ctx.moveTo(6, 0); ctx.lineTo(6 - sw, 6); ctx.stroke();
      ctx.fillStyle = flash ? '#fff' : '#b042e8';
      ctx.beginPath(); ctx.moveTo(-30, -28); ctx.bezierCurveTo(-30, -66, 30, -66, 30, -28); ctx.quadraticCurveTo(0, -20, -30, -28); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f6c8ff'; for (const [dx, dy, r] of [[-14, -46, 5], [8, -52, 4], [16, -38, 3.5], [-4, -36, 3]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = '#220a33'; ctx.beginPath(); ctx.arc(-3, -20, 2.6, 0, 6.3); ctx.arc(5, -20, 2.6, 0, 6.3); ctx.fill();
      ctx.fillStyle = `rgba(210,150,255,${0.5 + 0.4 * Math.sin(T * 3 + seed)})`; ctx.beginPath(); ctx.arc(24, -60, 2.4, 0, 6.3); ctx.arc(-20, -68 + sw, 2, 0, 6.3); ctx.fill();
      break;
    }
    case 'brute': {
      shadow(40, 10, 0.35);
      drawCrewmate(ctx, 0, 0, s * 1.15, { color: flash ? '#fff' : '#201a28', dark: true, facing: f, t: T * 0.6, noShadow: true, wide: 1.25 });
      ctx.scale(u * f, u); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.4;
      ctx.fillStyle = '#d8d0e0'; // horns
      ctx.beginPath(); ctx.moveTo(-18, -68); ctx.lineTo(-30, -92); ctx.lineTo(-8, -72); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, -70); ctx.lineTo(24, -96); ctx.lineTo(24, -66); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ff6a78'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(2, -30); ctx.lineTo(8, -26); ctx.lineTo(14, -30); ctx.lineTo(20, -26); ctx.lineTo(26, -30); ctx.stroke();
      ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; // stolen captain badge
      ctx.beginPath(); ctx.arc(-12, -22, 6, 0, 6.3); ctx.fill(); ctx.stroke();
      break;
    }
    case 'sporemother': {
      shadow(46, 11, 0.35); ctx.scale(u * f, u);
      const sw = Math.sin(T * 2.4) * 3;
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.6;
      ctx.fillStyle = flash ? '#fff' : '#e5d3b8'; rr(ctx, -16, -40, 32, 40, 12); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7fe0a4'; ctx.lineWidth = 4; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 14, -10); ctx.quadraticCurveTo(d * 34, -8 + sw, d * 38, 4); ctx.stroke(); }
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.6;
      ctx.fillStyle = flash ? '#fff' : '#7a2bb8';
      ctx.beginPath(); ctx.moveTo(-48, -38); ctx.bezierCurveTo(-52, -102, 52, -102, 48, -38); ctx.quadraticCurveTo(0, -26, -48, -38); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#cf86ff'; for (const [dx, dy, r] of [[-26, -68, 8], [4, -80, 7], [28, -62, 6], [-6, -56, 5], [18, -48, 4]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = '#ffe57a'; ctx.beginPath(); ctx.arc(-6, -24, 4, 0, 6.3); ctx.arc(8, -24, 4, 0, 6.3); ctx.fill();
      ctx.fillStyle = `rgba(230,170,255,${0.45 + 0.4 * Math.sin(T * 2)})`; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-30 + i * 20, -108 - ((T * 18 + i * 9) % 22), 3, 0, 6.3); ctx.fill(); }
      break;
    }
    case 'heart': {
      const pulse = 1 + Math.sin(T * 3) * 0.05;
      ctx.scale(u * pulse, u * pulse); ctx.translate(0, -52);
      const gl = ctx.createRadialGradient(0, 0, 8, 0, 0, 78);
      gl.addColorStop(0, 'rgba(200,120,255,.55)'); gl.addColorStop(1, 'rgba(200,120,255,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 78, 0, 6.3); ctx.fill();
      for (let i = 0; i < 6; i++) { // tendrils
        const a = i * 1.047 + T * 0.5; ctx.strokeStyle = '#4a2a72'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
        ctx.quadraticCurveTo(Math.cos(a + 0.5) * 52, Math.sin(a + 0.5) * 52, Math.cos(a + 0.2) * 64, Math.sin(a + 0.2) * 64); ctx.stroke();
      }
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4; ctx.fillStyle = flash ? '#fff' : '#2a1448';
      ctx.beginPath(); ctx.arc(0, 0, 38, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(214,139,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 47, T, T + 3.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 54, -T * 0.8, -T * 0.8 + 2.4); ctx.stroke();
      rr(ctx, -24, -13, 48, 26, 13); ctx.fillStyle = '#0a0414'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#ff5fd2'; ctx.beginPath(); ctx.arc(Math.sin(T * 0.8) * 8, 0, 8 + Math.sin(T * 3) * 1.5, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Math.sin(T * 0.8) * 8 - 2, -3, 2.5, 0, 6.3); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/* ---------- Environments ---------- */
function themeDecor(ctx, kind, T, rnd, th) {
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  const c = 32;
  switch (kind) {
    case 'console':
      ctx.fillStyle = '#39445a'; rr(ctx, 10, 20, 44, 28, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = th.glow; ctx.globalAlpha = .85; rr(ctx, 15, 24, 34, 12, 3); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(16, 40, 5, 4); ctx.fillStyle = '#ff5a5a'; ctx.fillRect(24, 40, 5, 4); break;
    case 'crate':
      ctx.fillStyle = '#8a6b3f'; rr(ctx, 14, 18, 38, 34, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#5b4426'; ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(52, 52); ctx.moveTo(52, 18); ctx.lineTo(14, 52); ctx.stroke(); break;
    case 'pipes':
      ctx.fillStyle = '#6a7690'; rr(ctx, 6, 20, 52, 8, 4); ctx.fill(); ctx.stroke(); rr(ctx, 6, 36, 52, 8, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(20, 20, 6, 8); ctx.fillRect(40, 36, 6, 8); break;
    case 'table':
      ctx.fillStyle = '#c9d2e0'; ctx.beginPath(); ctx.ellipse(c, c, 22, 18, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e9eef6'; ctx.beginPath(); ctx.ellipse(c - 4, c - 4, 12, 8, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#d8232a'; ctx.beginPath(); ctx.arc(c + 8, c + 2, 4, 0, 6.3); ctx.fill(); break;
    case 'bed':
      ctx.fillStyle = '#e8f6fa'; rr(ctx, 8, 18, 48, 30, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9fe1d9'; rr(ctx, 12, 22, 14, 22, 5); ctx.fill(); ctx.fillStyle = '#6cb7c8'; rr(ctx, 30, 22, 22, 22, 4); ctx.fill(); break;
    case 'scanner':
      ctx.fillStyle = '#d0e6ea'; ctx.beginPath(); ctx.arc(c, c, 22, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a7f86'; ctx.beginPath(); ctx.arc(c, c, 13, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = th.glow; ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(c, c, 8, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; break;
    case 'drift':
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(c, c + 4, 24, 12, 0, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#a8bddb'; ctx.stroke();
      ctx.fillStyle = '#eaf3ff'; ctx.beginPath(); ctx.ellipse(c - 6, c, 12, 6, 0, 0, 6.3); ctx.fill(); break;
    case 'lava':
      ctx.fillStyle = '#4b1d12'; ctx.beginPath(); ctx.ellipse(c, c + 2, 24, 15, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.ellipse(c, c + 2, 18, 10, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.ellipse(c - 3, c, 8, 4, 0, 0, 6.3); ctx.fill(); break;
    case 'rock':
      ctx.fillStyle = '#7d8da6'; ctx.beginPath(); ctx.moveTo(12, 48); ctx.lineTo(18, 24); ctx.lineTo(34, 16); ctx.lineTo(50, 28); ctx.lineTo(54, 48); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a7b6cc'; ctx.beginPath(); ctx.moveTo(18, 24); ctx.lineTo(34, 16); ctx.lineTo(40, 30); ctx.lineTo(22, 34); ctx.closePath(); ctx.fill(); break;
    case 'plant':
      ctx.fillStyle = '#a0522d'; rr(ctx, 22, 38, 20, 14, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2f9a4a'; for (const a of [-0.9, -0.3, 0.3, 0.9]) { ctx.save(); ctx.translate(c, 40); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -14, 6, 15, 0, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.restore(); } break;
    case 'bench':
      ctx.fillStyle = '#b07a46'; rr(ctx, 8, 28, 48, 10, 3); ctx.fill(); ctx.stroke(); rr(ctx, 8, 20, 48, 7, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a4026'; ctx.fillRect(12, 38, 4, 10); ctx.fillRect(48, 38, 4, 10); break;
    case 'bush':
      ctx.fillStyle = '#2f8d46'; for (const [dx, dy, r] of [[-10, 4, 12], [10, 4, 12], [0, -4, 14]]) { ctx.beginPath(); ctx.arc(c + dx, c + dy + 4, r, 0, 6.3); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#ff7aa8'; ctx.beginPath(); ctx.arc(c - 8, c, 3, 0, 6.3); ctx.arc(c + 8, c + 4, 3, 0, 6.3); ctx.fill(); break;
    case 'fountain':
      ctx.fillStyle = '#9aa6b8'; ctx.beginPath(); ctx.ellipse(c, c + 6, 24, 14, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5ec4f0'; ctx.beginPath(); ctx.ellipse(c, c + 5, 19, 10, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#c9ecff'; ctx.beginPath(); ctx.arc(c, c - 6, 5, 0, 6.3); ctx.fill(); break;
    case 'shroom': case 'glowshroom': {
      const glow = kind === 'glowshroom';
      if (glow) { const g = ctx.createRadialGradient(c, c, 2, c, c, 28); g.addColorStop(0, 'rgba(190,110,255,.5)'); g.addColorStop(1, 'rgba(190,110,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); }
      ctx.fillStyle = '#e8dcc2'; rr(ctx, 28, 30, 9, 20, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = glow ? '#b86bff' : '#d8453f'; ctx.beginPath(); ctx.moveTo(14, 34); ctx.bezierCurveTo(14, 8, 52, 8, 52, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(26, 24, 3, 0, 6.3); ctx.arc(38, 20, 2.5, 0, 6.3); ctx.fill(); break;
    }
    case 'fern':
      ctx.strokeStyle = '#1e7a3a'; ctx.lineWidth = 4;
      for (const a of [-1.1, -0.55, 0, 0.55, 1.1]) { ctx.beginPath(); ctx.moveTo(c, 50); ctx.quadraticCurveTo(c + a * 18, 28, c + a * 26, 22); ctx.stroke(); }
      break;
    case 'log':
      ctx.fillStyle = '#6a4a2b'; rr(ctx, 8, 28, 48, 16, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c79a62'; ctx.beginPath(); ctx.ellipse(52, 36, 4, 7, 0, 0, 6.3); ctx.fill(); ctx.stroke(); break;
    case 'wreck':
      ctx.fillStyle = '#4b4044'; ctx.beginPath(); ctx.moveTo(10, 50); ctx.lineTo(14, 22); ctx.lineTo(30, 28); ctx.lineTo(36, 16); ctx.lineTo(54, 40); ctx.lineTo(50, 52); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(28, 34); ctx.lineTo(34, 30); ctx.lineTo(32, 38); ctx.lineTo(40, 34); ctx.stroke(); break;
    case 'eye':
      ctx.fillStyle = '#1a0f2d'; ctx.beginPath(); ctx.ellipse(c, c, 22, 13, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = th.glow; ctx.beginPath(); ctx.arc(c, c, 8, 0, 6.3); ctx.fill(); ctx.fillStyle = '#10051f'; ctx.beginPath(); ctx.ellipse(c, c, 3, 7, 0, 0, 6.3); ctx.fill(); break;
    case 'crystal':
      ctx.fillStyle = '#8a5ad0'; ctx.beginPath(); ctx.moveTo(26, 52); ctx.lineTo(22, 26); ctx.lineTo(30, 12); ctx.lineTo(40, 28); ctx.lineTo(40, 52); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9a0ff'; ctx.beginPath(); ctx.moveTo(30, 12); ctx.lineTo(40, 28); ctx.lineTo(32, 30); ctx.closePath(); ctx.fill(); break;
    case 'static':
      ctx.strokeStyle = th.glow; ctx.lineWidth = 2; ctx.globalAlpha = .7;
      for (let i = 0; i < 5; i++) { const y = 14 + i * 9; ctx.beginPath(); ctx.moveTo(10 + rnd() * 8, y); ctx.lineTo(54 - rnd() * 10, y); ctx.stroke(); } break;
  }
  ctx.restore();
}

function dirsOf(routes) { // direction arrows per path tile
  const map = new Map();
  routes.forEach(r => {
    if (r.air) return;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [x0, y0] = r.pts[i], [x1, y1] = r.pts[i + 1];
      const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) { const key = (x0 + dx * k) + ',' + (y0 + dy * k); if (!map.has(key)) map.set(key, [dx, dy]); }
    }
    const last = r.pts[r.pts.length - 1]; map.set(last[0] + ',' + last[1], map.get(last[0] + ',' + last[1]) || [1, 0]);
  });
  return map;
}

/** Static board art for a level at `ppt` pixels per tile. */
function renderBoard(level, ppt) {
  const th = THEMES[level.theme], cv = document.createElement('canvas');
  cv.width = Math.round(level.cols * ppt); cv.height = Math.round(level.rows * ppt);
  const ctx = cv.getContext('2d'), k = ppt / TILE;
  ctx.scale(k, k);
  const rnd = mulberry32(level.id * 7919 + 13);
  const path = dirsOf(level.routes), key = (x, y) => x + ',' + y;
  const high = new Set(level.high.map(p => key(p[0], p[1]))), walls = new Set((level.walls || []).map(p => key(p[0], p[1])));
  const W_ = level.cols * TILE, H_ = level.rows * TILE;
  // sky/space backdrop behind everything
  if (th.sky) { const g = ctx.createLinearGradient(0, 0, 0, H_); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); ctx.fillStyle = g; } else ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, W_, H_);
  for (let y = 0; y < level.rows; y++) for (let x = 0; x < level.cols; x++) {
    const px = x * TILE, py = y * TILE, kk = key(x, y), isPath = path.has(kk), isHigh = high.has(kk), isWall = walls.has(kk);
    ctx.save(); ctx.translate(px, py);
    if (isWall) {
      ctx.fillStyle = th.wall; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = th.wallTop; ctx.fillRect(0, 0, TILE, TILE - 14);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, TILE - 3, TILE - 3);
      if (th.star) { // porthole showing space
        ctx.fillStyle = '#05070f'; ctx.beginPath(); ctx.arc(32, 28, 15, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#9aa6bc'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.fillRect(22 + rnd() * 20, 18 + rnd() * 20, 1.8, 1.8); }
      } else { // dense jungle trunk
        ctx.fillStyle = '#12301f'; ctx.beginPath(); ctx.arc(32, 26, 24, 0, 6.3); ctx.fill(); ctx.fillStyle = '#1f5a38'; ctx.beginPath(); ctx.arc(24, 22, 14, 0, 6.3); ctx.arc(42, 28, 12, 0, 6.3); ctx.fill();
      }
    } else if (isPath) {
      ctx.fillStyle = th.path; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(0, 0, TILE, 5);
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (!path.has(key(x + dx, y + dy))) {
        ctx.fillStyle = th.pathEdge;
        if (dy === -1) ctx.fillRect(0, 0, TILE, 5); if (dy === 1) ctx.fillRect(0, TILE - 5, TILE, 5);
        if (dx === -1) ctx.fillRect(0, 0, 5, TILE); if (dx === 1) ctx.fillRect(TILE - 5, 0, 5, TILE);
      }
      const d = path.get(kk); // chevron
      ctx.translate(32, 32); ctx.rotate(Math.atan2(d[1], d[0]));
      ctx.strokeStyle = th.arrow; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(4, 0); ctx.lineTo(-6, 9); ctx.stroke();
    } else if (isHigh) {
      ctx.fillStyle = th.floorA; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = th.highEdge; rr(ctx, 4, 8, TILE - 8, TILE - 6, 9); ctx.fill();
      ctx.fillStyle = th.high; rr(ctx, 4, 4, TILE - 8, TILE - 12, 9); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; rr(ctx, 4, 4, TILE - 8, TILE - 12, 9); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; for (const [dx, dy] of [[11, 11], [53, 11], [11, 43], [53, 43]]) { ctx.beginPath(); ctx.arc(dx, dy, 2.2, 0, 6.3); ctx.fill(); }
    } else {
      ctx.fillStyle = (x + y) % 2 ? th.floorA : th.floorB; ctx.fillRect(0, 0, TILE, TILE);
      ctx.strokeStyle = th.seam; ctx.lineWidth = 1.6; ctx.strokeRect(0.8, 0.8, TILE - 1.6, TILE - 1.6);
      if (rnd() < 0.34) themeDecor(ctx, th.decor[Math.floor(rnd() * th.decor.length)], TILE, rnd, th);
    }
    ctx.restore();
  }
  // rim shadow
  const g = ctx.createRadialGradient(W_ / 2, H_ / 2, Math.min(W_, H_) * 0.45, W_ / 2, H_ / 2, Math.max(W_, H_) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W_, H_);
  return cv;
}

/* Spawn vent & reactor drawn live (animated) */
function drawVent(ctx, x, y, T, air) {
  ctx.save(); ctx.translate(x, y);
  const p = 0.5 + 0.5 * Math.sin(T * 3);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40); g.addColorStop(0, `rgba(255,50,70,${0.45 + 0.25 * p})`); g.addColorStop(1, 'rgba(255,50,70,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 40, 0, 6.3); ctx.fill();
  if (!air) {
    ctx.fillStyle = '#2d3342'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; rr(ctx, -24, -20, 48, 40, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#05060a'; for (let i = 0; i < 4; i++) { rr(ctx, -18, -14 + i * 9, 36, 5, 2); ctx.fill(); }
    ctx.fillStyle = `rgba(255,70,90,${0.5 + 0.4 * p})`; ctx.fillRect(-18, -5, 36, 2);
  } else { ctx.strokeStyle = `rgba(255,120,140,${0.5 + 0.4 * p})`; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(0, 0, 16 + p * 3, 0, 6.3); ctx.stroke(); }
  ctx.restore();
}
function drawReactor(ctx, x, y, T, th) {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46); g.addColorStop(0, th.glow + 'cc'); g.addColorStop(1, th.glow + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 46, 0, 6.3); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.5; ctx.fillStyle = '#26324a';
  ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; ctx.lineTo(Math.cos(a) * 25, Math.sin(a) * 25); } ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.rotate(T * 1.2); ctx.strokeStyle = th.glow; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 14, i * 2.1, i * 2.1 + 1.2); ctx.stroke(); } ctx.restore();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 5 + Math.sin(T * 4), 0, 6.3); ctx.fill();
  ctx.restore();
}

/** Draw a crew portrait into a small canvas (cards, dialogue, logbook). */
function paintPortrait(cv, who, big) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = cv.clientWidth || cv.width, ch = cv.clientHeight || cv.height;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cw, ch);
  const s = Math.min(cw, ch) * (big ? 1.0 : 0.9);
  if (typeof who === 'string' && FOES[who]) drawFoe(ctx, who, cw / 2, ch * 0.9, s * 0.95, { t: 0, revealed: true, facing: 1 });
  else {
    const c = typeof who === 'string' ? (CAST[who] || CREW[who]) : who;
    drawCrewmate(ctx, cw / 2 - 2, ch * 0.92, s * 0.95, { color: c.color, hat: c.hat === 'none' ? null : c.hat, facing: 1, t: 0, idle: false, noShadow: true, dark: c.dark, alpha: c.ghost ? 0.7 : 1 });
  }
}
