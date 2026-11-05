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
    case 'welder': // Wrench — flip-up welding mask
      ctx.fillStyle = '#3c4250'; ctx.beginPath(); ctx.moveTo(-18, -50); ctx.bezierCurveTo(-17, -66, 17, -66, 18, -50); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a6272'; rr(ctx, -4, -70, 30, 15, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1c2a1a'; rr(ctx, 4, -67, 17, 7, 3); ctx.fill(); ctx.fillStyle = 'rgba(140,255,120,.5)'; ctx.fillRect(6, -66, 6, 2);
      break;
    case 'cowboy': // Marshal — wide-brim hat with a star band
      ctx.fillStyle = '#6b3f1a'; ctx.beginPath(); ctx.ellipse(0, -52, 29, 6.5, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-15, -53); ctx.bezierCurveTo(-16, -76, -4, -70, 0, -74); ctx.bezierCurveTo(4, -70, 16, -76, 15, -53); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a1f08'; ctx.fillRect(-14, -59, 28, 5);
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 2 : 4.6, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, -57 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.4; ctx.stroke();
      break;
    case 'bubble': // Bubbles — bubble wand antenna
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -57); ctx.quadraticCurveTo(10, -68, 6, -76); ctx.stroke();
      ctx.fillStyle = 'rgba(190,240,255,.35)'; ctx.strokeStyle = '#bff6ff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(6, -84, 8, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-8, -74, 5, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(18, -72, 3.5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(3, -87, 2, 0, 6.3); ctx.fill();
      break;
    /* ---- wardrobe hats ---- */
    case 'laurel':
      ctx.strokeStyle = '#3f8a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -46, 21, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.fillStyle = '#ffd24a';
      for (let i = 0; i < 7; i++) { const a = Math.PI * (1.12 + i * 0.127); ctx.beginPath(); ctx.ellipse(Math.cos(a) * 21, -46 + Math.sin(a) * 21, 5.5, 3, a + 1.2, 0, 6.3); ctx.fill(); ctx.stroke(); }
      break;
    case 'hardcore': // detective deerstalker for impostor hunters
      ctx.fillStyle = '#8a6a3e'; ctx.beginPath(); ctx.moveTo(-19, -49); ctx.bezierCurveTo(-18, -70, 18, -70, 19, -49); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, -51); ctx.lineTo(28, -47); ctx.lineTo(17, -46); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, -51); ctx.lineTo(-27, -47); ctx.lineTo(-17, -46); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 1.6; for (let i = -12; i <= 12; i += 6) { ctx.beginPath(); ctx.moveTo(i, -66); ctx.lineTo(i * 1.3, -51); ctx.stroke(); }
      ctx.fillStyle = '#ff4d6a'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -68, 3.5, 0, 6.3); ctx.fill(); ctx.stroke();
      break;
    case 'sprout':
      ctx.strokeStyle = '#2f7a2f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -55); ctx.quadraticCurveTo(-2, -64, 1, -70); ctx.stroke();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.fillStyle = '#5ee05e';
      ctx.beginPath(); ctx.ellipse(-8, -71, 9, 5, -0.5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(9, -73, 9, 5, 0.5, 0, 6.3); ctx.fill(); ctx.stroke();
      break;
    case 'party':
      ctx.fillStyle = '#ff5fa2'; ctx.beginPath(); ctx.moveTo(-12, -53); ctx.lineTo(2, -84); ctx.lineTo(14, -53); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe14a'; [[-4, -62], [6, -66], [1, -74]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 2.6, 0, 6.3); ctx.fill(); });
      ctx.fillStyle = '#7df'; ctx.beginPath(); ctx.arc(2, -86, 4.5, 0, 6.3); ctx.fill(); ctx.stroke();
      break;
    case 'headphones':
      ctx.strokeStyle = '#ff4d6a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -42, 23, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.fillStyle = '#ff4d6a';
      rr(ctx, -27, -46, 10, 18, 4); ctx.fill(); ctx.stroke(); rr(ctx, 17, -46, 10, 18, 4); ctx.fill(); ctx.stroke();
      break;
    case 'flower':
      ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.ellipse(-6 + Math.cos(a) * 7, -60 + Math.sin(a) * 7, 5, 3.5, a, 0, 6.3); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#ffcf33'; ctx.beginPath(); ctx.arc(-6, -60, 4.5, 0, 6.3); ctx.fill(); ctx.stroke();
      break;
    case 'chef':
      ctx.fillStyle = '#fff'; rr(ctx, -14, -60, 28, 10, 3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-9, -66, 8, 0, 6.3); ctx.arc(0, -71, 9, 0, 6.3); ctx.arc(9, -66, 8, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(-12, -64, 24, 7);
      break;
    case 'tophat':
      ctx.fillStyle = '#1b1b26'; rr(ctx, -21, -56, 42, 6, 3); ctx.fill(); ctx.stroke();
      rr(ctx, -13, -82, 26, 27, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8233f'; ctx.fillRect(-12, -63, 24, 5);
      break;
    case 'horns':
      ctx.fillStyle = '#f2e6c9';
      ctx.beginPath(); ctx.moveTo(-14, -54); ctx.quadraticCurveTo(-28, -64, -22, -80); ctx.quadraticCurveTo(-18, -66, -6, -58); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, -54); ctx.quadraticCurveTo(28, -64, 22, -80); ctx.quadraticCurveTo(18, -66, 6, -58); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'mushroom':
      ctx.fillStyle = '#e8483b'; ctx.beginPath(); ctx.moveTo(-24, -52); ctx.bezierCurveTo(-22, -80, 22, -80, 24, -52); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; [[-11, -62, 4], [5, -68, 3.5], [13, -58, 3]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 6.3); ctx.fill(); });
      break;
    case 'halo':
      ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 5; ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.ellipse(0, -72, 17, 5, 0, 0, 6.3); ctx.stroke(); ctx.shadowBlur = 0;
      break;
    case 'note': // a bouncy music note on a spring
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -54); ctx.quadraticCurveTo(6, -60, 0, -64); ctx.quadraticCurveTo(-6, -68, 0, -72); ctx.stroke();
      ctx.fillStyle = '#7affd6'; ctx.beginPath(); ctx.ellipse(-2, -76, 7, 5, -0.4, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -77); ctx.lineTo(4, -96); ctx.quadraticCurveTo(12, -92, 14, -84); ctx.stroke();
      break;
    case 'crown':
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(-17, -52); ctx.lineTo(-19, -72); ctx.lineTo(-9, -62); ctx.lineTo(0, -76); ctx.lineTo(9, -62); ctx.lineTo(19, -72); ctx.lineTo(17, -52); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff4d6a'; ctx.beginPath(); ctx.arc(0, -58, 3.4, 0, 6.3); ctx.fill(); ctx.fillStyle = '#42e8ff'; ctx.beginPath(); ctx.arc(-10, -57, 2.6, 0, 6.3); ctx.arc(10, -57, 2.6, 0, 6.3); ctx.fill();
      break;
  }
}

/* ---------- Wardrobe ---------- */
// Chosen looks per crewmate ({hat, visor, pet}); the UI fills this from the save file.
const STYLE = { looks: {} };
function lookFor(key) {
  const l = STYLE.looks[key] || {}, base = CREW[key] || CAST[key] || {};
  const v = LOOKS.visor.find(x => x.id === l.visor);
  return { hat: !l.hat || l.hat === 'signature' ? base.hat : l.hat, visor: v ? v.c : null, pet: l.pet || 'none' };
}
/** A little companion that floats beside its crewmate. Feet/centre at (x, y); s ~ size in px. */
function drawPet(ctx, pet, x, y, s, t, color, facing) {
  const u = s / 30, bob = Math.sin(t * 3.2) * 2.4;
  ctx.save(); ctx.translate(x, y); ctx.scale(u * (facing || 1), u);
  ctx.lineWidth = 2.4; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round';
  switch (pet) {
    case 'minibean':
      ctx.restore(); drawCrewmate(ctx, x, y, s * 0.95, { color: shade(color || '#d8232a', 0.25), facing, t: t * 1.3, idle: true, noShadow: true }); return;
    case 'bot':
      ctx.translate(0, -16 + bob);
      ctx.fillStyle = '#c9d3e6'; rr(ctx, -10, -9, 20, 16, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#18233a'; rr(ctx, -6, -5, 12, 7, 3); ctx.fill();
      ctx.fillStyle = '#7df'; ctx.fillRect(-4, -3, 3, 3); ctx.fillRect(1, -3, 3, 3);
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -15); ctx.stroke();
      ctx.fillStyle = (Math.sin(t * 6) > 0) ? '#ff4d6a' : '#ffd84a'; ctx.beginPath(); ctx.arc(0, -16, 2.6, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(125,221,255,.5)'; ctx.beginPath(); ctx.ellipse(0, 11, 6, 2, 0, 0, 6.3); ctx.fill();
      break;
    case 'sporeling':
      ctx.translate(0, Math.abs(bob) * -0.8);
      ctx.fillStyle = '#f3e8d2'; rr(ctx, -5, -10, 10, 10, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c06bff'; ctx.beginPath(); ctx.moveTo(-12, -9); ctx.bezierCurveTo(-11, -24, 11, -24, 12, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe9ff'; ctx.beginPath(); ctx.arc(-4, -15, 2, 0, 6.3); ctx.arc(5, -17, 1.6, 0, 6.3); ctx.fill();
      ctx.fillStyle = OUTLINE; ctx.fillRect(-3, -7, 1.8, 2.5); ctx.fillRect(1.5, -7, 1.8, 2.5);
      break;
    case 'wisp':
      ctx.translate(0, -16 + bob); ctx.globalAlpha *= 0.85;
      ctx.fillStyle = '#e8f4ff'; ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(-9, -3); ctx.bezierCurveTo(-9, -15, 9, -15, 9, -3); ctx.lineTo(9, 8);
      ctx.lineTo(5, 4); ctx.lineTo(2, 8); ctx.lineTo(-2, 4); ctx.lineTo(-5, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(-3, -3, 1.8, 0, 6.3); ctx.arc(3.5, -3, 1.8, 0, 6.3); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 1, 2.5, 0.2, 2.9); ctx.stroke();
      break;
    case 'drillbit':
      ctx.translate(0, Math.abs(bob) * -0.6);
      ctx.fillStyle = '#ffb347'; rr(ctx, -9, -14, 18, 13, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9d3e6'; ctx.beginPath(); ctx.moveTo(9, -12); ctx.lineTo(20, -7.5); ctx.lineTo(9, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7b8598'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(12 + (t * 30 % 4), -11); ctx.lineTo(14 + (t * 30 % 4), -4); ctx.stroke();
      ctx.fillStyle = OUTLINE; ctx.fillRect(-4, -10, 2.4, 3); ctx.fillRect(1.5, -10, 2.4, 3);
      ctx.fillStyle = '#2b2f3a'; ctx.beginPath(); ctx.arc(-5, 0, 3, 0, 6.3); ctx.arc(5, 0, 3, 0, 6.3); ctx.fill();
      break;
    case 'hollowpup':
      ctx.translate(0, -17 + bob);
      { const gl = ctx.createRadialGradient(0, 0, 2, 0, 0, 16); gl.addColorStop(0, 'rgba(200,140,255,.6)'); gl.addColorStop(1, 'rgba(200,140,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = '#3a1f66'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff7ae0'; ctx.beginPath(); ctx.arc(Math.sin(t * 1.5) * 2.5, 0, 3.6, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Math.sin(t * 1.5) * 2.5 - 1, -1.2, 1.2, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(214,139,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 12, t * 2, t * 2 + 2.4); ctx.stroke();
      break;
    case 'choirling': // a little singing light with a note above it
      ctx.translate(0, -17 + bob);
      { const gl = ctx.createRadialGradient(0, 0, 2, 0, 0, 15); gl.addColorStop(0, 'rgba(122,255,214,.6)'); gl.addColorStop(1, 'rgba(122,255,214,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = '#d8fff2'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(-3, -1.5, 1.4, 0, 6.3); ctx.arc(3, -1.5, 1.4, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 3, 2, 1.5 + Math.abs(Math.sin(t * 4)) * 1.5, 0, 0, 6.3); ctx.fill();
      ctx.globalAlpha *= 0.5 + 0.5 * Math.sin(t * 2.5); ctx.fillStyle = '#7affd6'; ctx.beginPath(); ctx.arc(8, -13 - (t * 6 % 6), 2.4, 0, 6.3); ctx.fill(); ctx.fillRect(9.4, -21 - (t * 6 % 6), 1.4, 8);
      break;
    case 'starling':
      ctx.translate(0, -17 + bob); ctx.rotate(Math.sin(t * 2) * 0.2);
      ctx.fillStyle = '#ffd84a'; ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = 8; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 5 : 11, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
      ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(-2.5, -1, 1.5, 0, 6.3); ctx.arc(2.5, -1, 1.5, 0, 6.3); ctx.fill();
      break;
  }
  ctx.restore();
}

/* ---------- Doors & sabotage panels ---------- */
/** A sliding blast door across a path tile. dir = [dx,dy] of travel; shut 0..1; ready = can be tapped. */
function drawDoor(ctx, x, y, dir, shut, ready, cdFrac, T) {
  ctx.save(); ctx.translate(x + TILE / 2, y + TILE / 2);
  if (dir[1] !== 0) ctx.rotate(Math.PI / 2); // the door always spans across the corridor
  const h = TILE / 2, gap = (1 - shut) * (h - 6);
  // frame jambs (hazard stripes) on the corridor edges
  for (const sgn of [-1, 1]) {
    ctx.save(); ctx.translate(0, sgn * (h - 4));
    ctx.fillStyle = '#1a1d26'; ctx.fillRect(-9, -4, 18, 8);
    ctx.fillStyle = '#ffcc1f'; for (let i = -9; i < 9; i += 6) { ctx.beginPath(); ctx.moveTo(i, -4); ctx.lineTo(i + 3, -4); ctx.lineTo(i + 6, 4); ctx.lineTo(i + 3, 4); ctx.fill(); }
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.strokeRect(-9, -4, 18, 8);
    ctx.restore();
  }
  // the two sliding leaves
  if (shut > 0.02) for (const sgn of [-1, 1]) {
    const y0 = sgn < 0 ? -(h - 8) : gap, y1 = sgn < 0 ? -gap : h - 8;
    ctx.fillStyle = '#a3abbd'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.fillRect(-10, Math.min(y0, y1), 20, Math.abs(y1 - y0)); ctx.strokeRect(-10, Math.min(y0, y1), 20, Math.abs(y1 - y0));
    ctx.fillStyle = '#ffcc1f'; for (let yy = Math.min(y0, y1) + 4; yy < Math.max(y0, y1) - 6; yy += 9) ctx.fillRect(-6, yy, 12, 4);
  }
  if (shut > 0.9) { ctx.fillStyle = `rgba(255,60,80,${0.5 + 0.4 * Math.sin(T * 10)})`; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.3); ctx.fill(); }
  // status light
  ctx.rotate(dir[1] !== 0 ? -Math.PI / 2 : 0);
  if (ready) {
    const p = 0.5 + 0.5 * Math.sin(T * 5);
    ctx.strokeStyle = `rgba(255,214,64,${0.45 + 0.5 * p})`; ctx.lineWidth = 3; ctx.setLineDash([5, 4]);
    ctx.strokeRect(-h + 3, -h + 3, TILE - 6, TILE - 6); ctx.setLineDash([]);
  } else if (cdFrac > 0 && shut <= 0.02) {
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(h - 11, -h + 11, 7, 0, 6.3); ctx.stroke();
    ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h - 11, -h + 11, 7, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - cdFrac)); ctx.stroke();
  }
  ctx.restore();
}
/** A sabotage repair panel on a floor tile; prog 0..1. */
function drawPanel(ctx, x, y, color, icon, prog, done, T) {
  ctx.save(); ctx.translate(x + TILE / 2, y + TILE / 2);
  const p = 0.5 + 0.5 * Math.sin(T * 8);
  if (!done) { const g = ctx.createRadialGradient(0, 0, 6, 0, 0, 44); g.addColorStop(0, color + 'aa'); g.addColorStop(1, color + '00'); ctx.fillStyle = g; ctx.globalAlpha = 0.5 + 0.5 * p; ctx.beginPath(); ctx.arc(0, 0, 44, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.fillStyle = '#273049'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; rr(ctx, -22, -20, 44, 40, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = done ? '#2c6b3f' : '#101727'; rr(ctx, -16, -14, 32, 22, 4); ctx.fill();
  ctx.fillStyle = done ? '#7dff9c' : color; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(done ? '✓' : icon, 0, -3);
  ctx.fillStyle = '#0c1020'; ctx.fillRect(-16, 11, 32, 5); ctx.fillStyle = done ? '#7dff9c' : '#ffd84a'; ctx.fillRect(-16, 11, 32 * prog, 5);
  if (!done) { ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.6 * p})`; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); rr(ctx, -27, -25, 54, 50, 10); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
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
  if (o.dark) { g.addColorStop(0, '#2a0e12'); g.addColorStop(1, '#0e0407'); } else { const vc = o.visor || ['#d7fbff', '#6bc9e6']; g.addColorStop(0, vc[0]); g.addColorStop(1, vc[1]); }
  ctx.fillStyle = g; ctx.fill(); ctx.stroke();
  if (o.dark) { ctx.fillStyle = '#ff2b3a'; ctx.beginPath(); ctx.ellipse(vx + vw * 0.55, -41.5, vw * 0.3, 2.4, 0, 0, 6.3); ctx.fill(); }
  else { ctx.fillStyle = 'rgba(255,255,255,.9)'; rr(ctx, vx + 5, -47.5, 10 * wide, 4, 2); ctx.fill(); }
  if (o.hat) drawHat(ctx, o.hat, col);
  ctx.restore();
  if (o.pet && o.pet !== 'none') drawPet(ctx, o.pet, x - 30 * u * f, y - 4 * u, s * 0.42, o.t || 0, col, f);
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
    case 'mite': {
      shadow(18, 5); ctx.scale(u * f, u); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      const wig = Math.sin(T * 16 + seed) * 2.5;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 9, -8); ctx.lineTo(i * 9 + 6 + (i ? wig : -wig), 2); ctx.stroke(); }
      ctx.fillStyle = flash ? '#fff' : '#8a6a52'; ctx.beginPath(); ctx.moveTo(-22, -6); ctx.bezierCurveTo(-22, -32, 18, -34, 22, -10); ctx.lineTo(22, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#b08a6a'; for (const [dx, dy] of [[-12, -18], [-2, -24], [8, -18]]) { ctx.beginPath(); ctx.arc(dx, dy, 3.4, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = '#c9d3e6'; ctx.beginPath(); ctx.moveTo(20, -14); ctx.lineTo(32, -10); ctx.lineTo(20, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(12, -15, 3, 0, 6.3); ctx.fill();
      break;
    }
    case 'leech': {
      const hov = Math.sin(T * 3 + seed) * 4; shadow(16, 4, 0.2); ctx.scale(u * f, u); ctx.translate(0, -40 + hov);
      const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, 30); gl.addColorStop(0, 'rgba(120,255,200,.45)'); gl.addColorStop(1, 'rgba(120,255,200,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 30, 0, 6.3); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.fillStyle = flash ? '#fff' : '#2f8f6a';
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 14, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 3; i++) { const a = 1.2 + i * 0.35; ctx.strokeStyle = '#2f8f6a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 10); ctx.quadraticCurveTo(Math.cos(a) * 20 + Math.sin(T * 5 + i) * 4, 22, Math.cos(a) * 16, 30); ctx.stroke(); }
      ctx.fillStyle = '#b6ffe0'; ctx.beginPath(); ctx.arc(-6, -2, 3, 0, 6.3); ctx.arc(6, -2, 3, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#ffe94a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-4, -16); ctx.lineTo(0, -24); ctx.lineTo(-2, -24); ctx.lineTo(3, -32); ctx.stroke();
      break;
    }
    case 'golem': {
      shadow(32, 9, 0.35); ctx.scale(u * f, u); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.6;
      const st = Math.sin(T * 4 + seed) * 2;
      ctx.fillStyle = flash ? '#fff' : '#5d5048';
      rr(ctx, -26, -18, 16, 18 + st, 5); ctx.fill(); ctx.stroke(); rr(ctx, 10, -18, 16, 18 - st, 5); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-30, -16); ctx.lineTo(-34, -50); ctx.lineTo(-16, -70); ctx.lineTo(14, -72); ctx.lineTo(32, -52); ctx.lineTo(30, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = flash ? '#fff' : '#ffa63d'; for (const [dx, dy, r] of [[-18, -40, 5], [14, -30, 4], [-4, -58, 3.5], [20, -56, 3]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = '#ffe14a'; rr(ctx, -2, -50, 22, 7, 3); ctx.fill(); ctx.stroke();
      break;
    }
    case 'bomber': {
      shadow(18, 5); ctx.scale(u * f, u); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      const wig = Math.sin(T * 18 + seed) * 3;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 8, -6); ctx.lineTo(i * 8 + 5 + (i % 2 ? wig : -wig), 2); ctx.stroke(); }
      ctx.fillStyle = flash ? '#fff' : '#2d6a3a'; ctx.beginPath(); ctx.ellipse(0, -14, 20, 13, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8233f'; rr(ctx, -10, -36, 18, 14, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3a2a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -36); ctx.quadraticCurveTo(10, -44, 6, -48); ctx.stroke();
      const fl = 0.5 + 0.5 * Math.sin(T * 20 + seed); ctx.fillStyle = `rgba(255,${180 + 60 * fl},60,1)`; ctx.beginPath(); ctx.arc(6, -49, 3 + fl * 1.5, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(12, -16, 3, 0, 6.3); ctx.fill(); ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(13, -16, 1.5, 0, 6.3); ctx.fill();
      break;
    }
    case 'foreman': {
      shadow(50, 12, 0.38); ctx.scale(u * f, u); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
      ctx.fillStyle = '#2b2f3a'; rr(ctx, -46, -22, 92, 22, 10); ctx.fill(); ctx.stroke(); // treads
      ctx.fillStyle = '#545c6c'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-36 + i * 14.4, -11, 5, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = flash ? '#fff' : '#d98a1f'; rr(ctx, -38, -74, 62, 54, 10); ctx.fill(); ctx.stroke(); // body
      ctx.fillStyle = '#1b1210'; for (let i = -30; i < 20; i += 12) { ctx.beginPath(); ctx.moveTo(i, -24); ctx.lineTo(i + 6, -24); ctx.lineTo(i + 12, -32); ctx.lineTo(i + 6, -32); ctx.fill(); }
      ctx.fillStyle = '#0d0a14'; rr(ctx, -26, -66, 40, 20, 9); ctx.fill(); ctx.stroke(); // visor
      ctx.fillStyle = '#ff4d6a'; ctx.beginPath(); ctx.ellipse(-6, -56, 13, 3.4, 0, 0, 6.3); ctx.fill();
      ctx.save(); ctx.translate(24, -46); ctx.rotate(Math.sin(T * 0.7) * 0.08); // the drill
      ctx.fillStyle = '#9aa6bc'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(46, 0); ctx.lineTo(0, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#4a5268'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { const x0 = ((T * 40 + i * 11) % 44); ctx.beginPath(); ctx.moveTo(x0, -18 + x0 * 0.4); ctx.lineTo(x0 + 6, 18 - (x0 + 6) * 0.4); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; // the crown of static
      ctx.beginPath(); ctx.moveTo(-28, -74); ctx.lineTo(-30, -92); ctx.lineTo(-18, -82); ctx.lineTo(-8, -98); ctx.lineTo(2, -82); ctx.lineTo(14, -92); ctx.lineTo(12, -74); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = `rgba(214,139,255,${0.5 + 0.4 * Math.sin(T * 6)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-36, -100); ctx.lineTo(-30, -108); ctx.lineTo(-24, -100); ctx.lineTo(-18, -110); ctx.stroke();
      break;
    }
    case 'mender': { // fuzzy moth with glitter dust
      const hov = Math.sin(T * 3 + seed) * 2, flap = Math.sin(T * 14 + seed);
      shadow(18, 5); ctx.scale(u * f, u); ctx.translate(0, hov); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      ctx.fillStyle = flash ? '#fff' : '#e8f7d8';
      for (const sd of [-1, 1]) { ctx.save(); ctx.translate(-4, -30); ctx.scale(1, 0.55 + 0.45 * Math.abs(flap)); ctx.beginPath(); ctx.ellipse(-4, sd * 14, 20, 12, sd * 0.5, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7dff9c'; ctx.beginPath(); ctx.arc(-8, sd * 15, 4.5, 0, 6.3); ctx.fill(); ctx.fillStyle = flash ? '#fff' : '#e8f7d8'; ctx.restore(); }
      ctx.fillStyle = flash ? '#fff' : '#b6a48a'; ctx.beginPath(); ctx.ellipse(2, -28, 14, 11, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a4a3a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 6, -38); ctx.lineTo(-4 + i * 6, -18); ctx.lineWidth = 2; ctx.stroke(); } ctx.lineWidth = 3;
      ctx.fillStyle = '#1a2a1a'; ctx.beginPath(); ctx.arc(12, -31, 3.2, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(13, -32, 1.2, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(10, -38); ctx.quadraticCurveTo(14, -50, 20, -50); ctx.moveTo(14, -37); ctx.quadraticCurveTo(22, -46, 26, -44); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = `rgba(160,255,180,${0.6 + 0.4 * Math.sin(T * 5)})`; for (let i = 0; i < 4; i++) { const a = T * 1.5 + i * 1.57; ctx.beginPath(); ctx.arc(Math.cos(a) * 22, -26 + Math.sin(a) * 12 + ((T * 20 + i * 7) % 16), 1.8, 0, 6.3); ctx.fill(); }
      break;
    }
    case 'warden': { // armored lantern-bearer
      shadow(30, 8, 0.32); ctx.scale(u * f, u); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.4;
      const st = Math.sin(T * 4 + seed) * 2;
      ctx.fillStyle = flash ? '#fff' : '#2c3550'; rr(ctx, -20, -16, 14, 16 + st, 5); ctx.fill(); ctx.stroke(); rr(ctx, 6, -16, 14, 16 - st, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = flash ? '#fff' : '#46557e'; ctx.beginPath(); ctx.moveTo(-26, -14); ctx.lineTo(-28, -56); ctx.quadraticCurveTo(0, -84, 26, -56); ctx.lineTo(24, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8fa4d6'; ctx.beginPath(); ctx.moveTo(-28, -56); ctx.quadraticCurveTo(0, -84, 26, -56); ctx.quadraticCurveTo(0, -66, -28, -56); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0d0a1e'; rr(ctx, -8, -54, 28, 14, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#5ab8ff'; ctx.beginPath(); ctx.ellipse(8, -47, 9, 2.6, 0, 0, 6.3); ctx.fill();
      // lantern on a pole
      ctx.strokeStyle = '#2a2f40'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(28, -14); ctx.lineTo(30, -80); ctx.stroke(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      const lp = 0.6 + 0.4 * Math.sin(T * 3 + seed);
      const lg = ctx.createRadialGradient(30, -86, 2, 30, -86, 26); lg.addColorStop(0, `rgba(120,200,255,${0.7 * lp})`); lg.addColorStop(1, 'rgba(120,200,255,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(30, -86, 26, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#c9e8ff'; rr(ctx, 22, -96, 16, 18, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#5ab8ff'; ctx.beginPath(); ctx.arc(30, -87, 4 + lp, 0, 6.3); ctx.fill();
      break;
    }
    case 'rally': { // a party drone with a speaker and flashing lights
      const hov = Math.sin(T * 5 + seed) * 3, beat = Math.pow(Math.max(0, Math.sin(T * 9 + seed)), 6);
      shadow(18, 4, 0.2); ctx.scale(u, u); ctx.translate(0, -36 + hov); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(255,110,130,${0.7 * beat})`; ctx.lineWidth = 3; for (const r of [26, 34]) { ctx.beginPath(); ctx.arc(0, 0, r + beat * 4, -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r + beat * 4, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke(); }
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      ctx.fillStyle = flash ? '#fff' : '#ff6fb5'; rr(ctx, -18, -14, 36, 26, 9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a1a30'; ctx.beginPath(); ctx.arc(0, -1, 9 + beat * 1.5, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff9ad6'; ctx.beginPath(); ctx.arc(0, -1, 3.5, 0, 6.3); ctx.fill();
      const cols = ['#ffd84a', '#7affd6', '#5ab8ff']; for (let i = 0; i < 3; i++) { ctx.fillStyle = (Math.floor(T * 6) + i) % 3 === 0 ? cols[i] : '#5a3a50'; ctx.beginPath(); ctx.arc(-10 + i * 10, 10, 2.6, 0, 6.3); ctx.fill(); }
      ctx.strokeStyle = '#3d4658'; ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-12, -22); ctx.moveTo(12, -14); ctx.lineTo(12, -22); ctx.stroke();
      const rot = Math.sin(T * 40 + seed) * 10; ctx.beginPath(); ctx.moveTo(-12 - rot, -23); ctx.lineTo(-12 + rot, -23); ctx.moveTo(12 - rot, -23); ctx.lineTo(12 + rot, -23); ctx.stroke();
      break;
    }
    case 'conductor': { // a tall crystal maestro with a glowing baton; colour = current song
      const song = (typeof SONGS !== 'undefined' && SONGS[o.song]) || { color: '#ffd66b', rgb: '255,214,107' }, sw = Math.sin(T * 2.2);
      shadow(44, 11, 0.36); ctx.scale(u * f, u); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
      const gl = ctx.createRadialGradient(0, -70, 10, 0, -70, 90); gl.addColorStop(0, `rgba(${song.rgb},.45)`); gl.addColorStop(1, `rgba(${song.rgb},0)`); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -70, 90, 0, 6.3); ctx.fill();
      ctx.fillStyle = flash ? '#fff' : '#1c2440'; ctx.beginPath(); ctx.moveTo(-38, 0); ctx.quadraticCurveTo(-30, -60, -18, -92); ctx.lineTo(18, -92); ctx.quadraticCurveTo(30, -60, 38, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); // coat
      ctx.fillStyle = '#2c3c66'; ctx.beginPath(); ctx.moveTo(-6, -92); ctx.lineTo(0, -20); ctx.lineTo(6, -92); ctx.fill();
      ctx.fillStyle = '#e8eef8'; ctx.beginPath(); ctx.moveTo(-10, -90); ctx.lineTo(0, -78); ctx.lineTo(10, -90); ctx.closePath(); ctx.fill(); ctx.stroke(); // bow tie collar
      ctx.fillStyle = song.color; ctx.beginPath(); ctx.moveTo(-9, -84); ctx.lineTo(0, -80); ctx.lineTo(-9, -76); ctx.closePath(); ctx.moveTo(9, -84); ctx.lineTo(0, -80); ctx.lineTo(9, -76); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = flash ? '#fff' : '#9ab8ff'; ctx.beginPath(); ctx.moveTo(-20, -94); ctx.lineTo(-14, -128); ctx.lineTo(0, -140); ctx.lineTo(14, -128); ctx.lineTo(20, -94); ctx.closePath(); ctx.fill(); ctx.stroke(); // crystal head
      ctx.fillStyle = '#d8e6ff'; ctx.beginPath(); ctx.moveTo(-14, -128); ctx.lineTo(0, -140); ctx.lineTo(-2, -110); ctx.closePath(); ctx.fill();
      ctx.fillStyle = song.color; ctx.beginPath(); ctx.ellipse(2, -112, 11, 3.6, 0, 0, 6.3); ctx.fill();
      // baton arm
      ctx.save(); ctx.translate(26, -70); ctx.rotate(-0.9 + sw * 0.6); ctx.strokeStyle = '#1c2440'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26, 0); ctx.stroke();
      ctx.strokeStyle = '#f4f0e0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(58, 0); ctx.stroke();
      ctx.fillStyle = song.color; ctx.shadowColor = song.color; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(60, 0, 5, 0, 6.3); ctx.fill(); ctx.restore();
      ctx.fillStyle = song.color; ctx.globalAlpha = 0.85; for (let i = 0; i < 3; i++) { const k = (T * 0.6 + i / 3) % 1; ctx.save(); ctx.translate(-40 - k * 20 + i * 30, -120 - k * 40); ctx.globalAlpha = 0.85 * (1 - k); ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.6, -0.4, 0, 6.3); ctx.fill(); ctx.fillRect(3.5, -16, 2, 16); ctx.restore(); }
      ctx.globalAlpha = 1;
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

/** A burrowed foe: a little dirt mound that shuffles along. */
function drawMound(ctx, x, y, s, T) {
  const u = s / 64; ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
  ctx.fillStyle = '#4a3a2c'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, -2, 26, 10 + Math.sin(T * 9) * 1.5, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7a644c'; for (let i = 0; i < 4; i++) { const a = T * 6 + i * 1.6; ctx.beginPath(); ctx.arc(Math.cos(a) * 18, -10 - Math.abs(Math.sin(a)) * 8, 2.6, 0, 6.3); ctx.fill(); }
  ctx.restore();
}
/** A foe's helping aura on the floor: a soft ring that breathes. rgb 'r,g,b'. */
function drawAura(ctx, x, y, r, rgb, T, big) {
  const p = 0.5 + 0.5 * Math.sin(T * 3);
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.42);
  const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.85, `rgba(${rgb},${0.1 + 0.08 * p})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill();
  ctx.strokeStyle = `rgba(${rgb},${0.35 + 0.25 * p})`; ctx.lineWidth = big ? 4 : 2.5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = T * 20; ctx.beginPath(); ctx.arc(0, 0, r * (0.96 + 0.04 * p), 0, 6.3); ctx.stroke();
  ctx.restore();
}
/** Little markers on a foe that another foe is helping: blue shield, red speed lines, green sparkles. */
function drawBuffs(ctx, x, y, s, ward, haste, mend, T) {
  if (!ward && !haste && !mend) return;
  ctx.save(); const h = s * 0.9;
  if (ward) { ctx.strokeStyle = `rgba(110,190,255,${0.55 + 0.25 * Math.sin(T * 5)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y - h * 0.5, s * 0.42, h * 0.58, 0, 0, 6.3); ctx.stroke();
    ctx.fillStyle = 'rgba(110,190,255,.12)'; ctx.fill(); }
  if (haste) { ctx.strokeStyle = 'rgba(255,120,140,.8)'; ctx.lineWidth = 2.2; for (let i = 0; i < 3; i++) { const yy = y - h * (0.25 + i * 0.22), k = (T * 3 + i * 0.3) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.moveTo(x - s * 0.45 - k * 10, yy); ctx.lineTo(x - s * 0.7 - k * 10, yy); ctx.stroke(); } ctx.globalAlpha = 1; }
  if (mend) { ctx.fillStyle = '#7dff9c'; for (let i = 0; i < 2; i++) { const k = (T * 1.6 + i * 0.5) % 1, px = x + (i ? 10 : -12), py = y - h * 0.7 - k * 16; ctx.globalAlpha = 1 - k; ctx.fillRect(px - 1.5, py - 5, 3, 10); ctx.fillRect(px - 5, py - 1.5, 10, 3); } }
  ctx.restore();
}
/** Wrench's barricade on a floor tile; hp01 0..1, reinforced when Wrench's skill is on. */
function drawBarricade(ctx, x, y, hp01, steel, T, building) {
  ctx.save(); ctx.translate(x, y); const k = building != null ? Math.max(0.1, building) : 1;
  ctx.scale(1, k); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 2, 28, 7, 0, 0, 6.3); ctx.fill();
  for (const sx of [-18, 14]) { ctx.fillStyle = '#5a4630'; ctx.fillRect(sx, -34, 6, 34); ctx.strokeRect(sx, -34, 6, 34); }
  const plank = steel ? '#9aa6bc' : '#c89858';
  for (let i = 0; i < 3; i++) { ctx.fillStyle = plank; ctx.save(); ctx.translate(0, -8 - i * 10); ctx.rotate((i % 2 ? -1 : 1) * 0.06); rr(ctx, -26, -4, 52, 9, 3); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = steel ? '#ffd84a' : '#ffcc1f'; ctx.fillRect(-24, -30, 6, 4); ctx.fillRect(18, -10, 6, 4);
  if (hp01 < 0.5) { ctx.strokeStyle = 'rgba(20,10,0,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -26); ctx.lineTo(-2, -16); ctx.lineTo(-8, -8); ctx.stroke(); }
  ctx.restore();
}
/** A shimmering bubble shield around a crewmate (feet at x,y). */
function drawShield(ctx, x, y, s, T, n) {
  ctx.save(); const r = s * 0.55, cy = y - s * 0.45;
  const g = ctx.createRadialGradient(x - r * 0.3, cy - r * 0.3, r * 0.1, x, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,.25)'); g.addColorStop(0.7, 'rgba(160,230,255,.12)'); g.addColorStop(1, 'rgba(255,140,220,.45)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, r, 0, 6.3); ctx.fill();
  ctx.strokeStyle = `rgba(255,190,240,${0.6 + 0.3 * Math.sin(T * 4)})`; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(x - r * 0.4, cy - r * 0.45, r * 0.16, r * 0.08, -0.6, 0, 6.3); ctx.fill();
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
    case 'ore':
      ctx.fillStyle = '#4e4440'; ctx.beginPath(); ctx.moveTo(14, 48); ctx.lineTo(10, 30); ctx.lineTo(24, 16); ctx.lineTo(44, 20); ctx.lineTo(52, 40); ctx.lineTo(46, 50); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = th.glow; for (const [a, b] of [[22, 30], [38, 26], [34, 42]]) { ctx.beginPath(); ctx.moveTo(a, b - 5); ctx.lineTo(a + 4, b); ctx.lineTo(a, b + 5); ctx.lineTo(a - 4, b); ctx.closePath(); ctx.fill(); } break;
    case 'drill':
      ctx.fillStyle = '#d98a1f'; rr(ctx, 12, 30, 24, 18, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9aa6bc'; ctx.beginPath(); ctx.moveTo(36, 32); ctx.lineTo(54, 39); ctx.lineTo(36, 46); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'cart':
      ctx.fillStyle = '#6b7385'; ctx.beginPath(); ctx.moveTo(10, 24); ctx.lineTo(54, 24); ctx.lineTo(48, 44); ctx.lineTo(16, 44); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffa63d'; ctx.beginPath(); ctx.arc(24, 23, 6, Math.PI, 0); ctx.arc(38, 23, 7, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#2b2f3a'; ctx.beginPath(); ctx.arc(22, 47, 5, 0, 6.3); ctx.arc(42, 47, 5, 0, 6.3); ctx.fill(); break;
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
    case 'lamp':
      ctx.fillStyle = '#2a3048'; ctx.fillRect(29, 18, 6, 32); ctx.strokeRect(29, 18, 6, 32);
      ctx.fillStyle = '#3a4260'; rr(ctx, 22, 46, 20, 7, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(32, 16, 8, 0, 6.3); ctx.fill(); ctx.stroke(); break;
    case 'speaker':
      ctx.fillStyle = '#2b2f44'; rr(ctx, 16, 12, 32, 40, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#12141f'; ctx.beginPath(); ctx.arc(32, 38, 9, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(32, 21, 5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = th.glow; ctx.beginPath(); ctx.arc(32, 38, 3, 0, 6.3); ctx.fill(); break;
    case 'planter':
      ctx.fillStyle = '#6a5a8a'; rr(ctx, 12, 34, 40, 16, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3f9a6a'; for (const [dx, r] of [[20, 9], [32, 11], [44, 9]]) { ctx.beginPath(); ctx.arc(dx, 30, r, 0, 6.3); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#ffd66b'; ctx.beginPath(); ctx.arc(22, 26, 3, 0, 6.3); ctx.arc(40, 24, 3, 0, 6.3); ctx.fill(); ctx.fillStyle = '#ff9ad6'; ctx.beginPath(); ctx.arc(31, 21, 3, 0, 6.3); ctx.fill(); break;
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
  const W_ = level.cols * TILE, H_ = level.rows * TILE, spots = [];
  // sky/space backdrop behind everything
  if (th.sky) { const g = ctx.createLinearGradient(0, 0, 0, H_); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); ctx.fillStyle = g; } else ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, W_, H_);
  for (let y = 0; y < level.rows; y++) for (let x = 0; x < level.cols; x++) {
    const px = x * TILE, py = y * TILE, kk = key(x, y), isPath = path.has(kk), isHigh = high.has(kk), isWall = walls.has(kk);
    ctx.save(); ctx.translate(px, py);
    if (isWall) {
      spots.push({ kind: 'wall', x, y });
      ctx.fillStyle = th.wall; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = th.wallTop; ctx.fillRect(0, 0, TILE, TILE - 14);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, TILE - 3, TILE - 3);
      if (th.star) { // porthole showing space
        ctx.fillStyle = '#05070f'; ctx.beginPath(); ctx.arc(32, 28, 15, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#9aa6bc'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.fillRect(22 + rnd() * 20, 18 + rnd() * 20, 1.8, 1.8); }
      } else if (th.wallKind === 'glass') { // a big window onto the aurora
        const wg = ctx.createLinearGradient(0, 6, 0, 46); wg.addColorStop(0, '#0d1430'); wg.addColorStop(1, '#2a1d4a'); ctx.fillStyle = wg; rr(ctx, 7, 7, 50, 38, 6); ctx.fill();
        ctx.save(); rr(ctx, 7, 7, 50, 38, 6); ctx.clip(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#7affd6'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(4, 30 + rnd() * 6); ctx.bezierCurveTo(20, 10, 40, 34, 60, 16 + rnd() * 8); ctx.stroke();
        ctx.strokeStyle = '#b48aff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(4, 22); ctx.bezierCurveTo(24, 36, 40, 10, 60, 28); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) ctx.fillRect(10 + rnd() * 44, 10 + rnd() * 30, 1.6, 1.6); ctx.restore();
        ctx.strokeStyle = '#9aa6bc'; ctx.lineWidth = 3; rr(ctx, 7, 7, 50, 38, 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(32, 7); ctx.lineTo(32, 45); ctx.stroke();
      } else if (th.wallKind === 'rock') { // raw asteroid rock with ore veins
        ctx.fillStyle = shade(th.wall, -0.25); ctx.beginPath(); ctx.moveTo(4, 44); ctx.lineTo(10, 14); ctx.lineTo(30, 6); ctx.lineTo(54, 14); ctx.lineTo(60, 40); ctx.closePath(); ctx.fill();
        ctx.fillStyle = th.glow; ctx.globalAlpha = 0.8; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(16 + rnd() * 32, 14 + rnd() * 24, 2 + rnd() * 2, 0, 6.3); ctx.fill(); } ctx.globalAlpha = 1;
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
      if (rnd() < 0.34) { const kind = th.decor[Math.floor(rnd() * th.decor.length)]; spots.push({ kind, x, y }); themeDecor(ctx, kind, TILE, rnd, th); }
    }
    ctx.restore();
  }
  // rim shadow
  const g = ctx.createRadialGradient(W_ / 2, H_ / 2, Math.min(W_, H_) * 0.45, W_ / 2, H_ / 2, Math.max(W_, H_) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W_, H_);
  cv.spots = spots; // decor & walls, so the scene layer can light and animate them
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
    const lk = typeof who === 'string' && CREW[who] ? lookFor(who) : { hat: c.hat, visor: null };
    drawCrewmate(ctx, cw / 2 - 2, ch * 0.92, s * 0.95, { color: c.color, hat: lk.hat === 'none' ? null : lk.hat, visor: lk.visor, facing: 1, t: 0, idle: false, noShadow: true, dark: c.dark, alpha: c.ghost ? 0.7 : 1 });
  }
}
