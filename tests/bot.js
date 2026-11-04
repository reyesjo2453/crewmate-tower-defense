/* Dev-only: a mediocre automatic player used to sanity-check difficulty (loaded by tests/sim.cjs). */
window.runBot = function (levelId, diff, opts) {
  opts = opts || {};
  const level = opts.level || LEVELS.find(l => l.id === levelId), g = new Game(null, { emit() {} });
  g.start(opts.level || level, diff, { squad: opts.squad, mods: opts.mods, ups: opts.ups }); g.callNextWave();
  const order = opts.order || ['brick', 'rook', 'marshal', 'rook', 'tank', 'lumi', 'bubbles', 'sparky', 'wrench', 'rook', 'echo', 'sparky', 'marshal', 'brick', 'rook', 'sparky', 'tank', 'sparky', 'rook'];
  const avail = order.filter(t => g.avail.includes(t)); let idx = 0, tick = 0;
  const pathTiles = [...g.pathSet].map(k => k.split(',').map(Number));
  const highTiles = level.high.slice();
  const near = (a, b, r) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 <= r * r;
  const shared = {};
  g.routes.forEach(r => { if (r.air) return; const seen = new Set(); for (let d = 0; d <= r.len; d += 0.5) { const q = posAt(r, d), k = Math.floor(q.x) + ',' + Math.floor(q.y); if (!seen.has(k)) { seen.add(k); shared[k] = (shared[k] || 0) + 1; } } });
  function score(type, t) {
    const b = CREW[type];
    if (b.ground === 'path') { // front-ish guard: covered by many high tiles, not adjacent to other guards
      const cover = highTiles.filter(h => near(h, t, 2.8) && g.crewAt(h[0], h[1])).length + highTiles.filter(h => near(h, t, 2.8)).length * 0.3;
      const guards = g.crew.filter(c => c.b.block && near([c.x, c.y], t, 1.5)).length;
      return cover - guards * 5 + (shared[t[0] + ',' + t[1]] || 1) * 6;
    }
    return pathTiles.filter(p => near(p, t, b.range)).length;
  }
  function place(type) {
    const b = CREW[type], pool = b.ground === 'path' ? pathTiles : highTiles; let best = null, bs = -1e9;
    for (const t of pool) { if (g.crewAt(t[0], t[1])) continue; const s = score(type, t); if (s > bs) { bs = s; best = t; } }
    if (best) g.deploy(type, best[0], best[1]);
  }
  while (g.state !== 'won' && g.state !== 'lost' && g.t < (opts.maxT || 1500)) {
    g.update(1 / 60); tick++;
    if (tick % 20) continue;
    // slams a door when a few walkers are about to go through it
    if (opts.doors !== false) for (const d of g.doors) if (d.cd <= 0 && g.foes.filter(f => !f.air && !f.def.boss && Math.hypot(f.x / TILE - d.x - 0.5, f.y / TILE - d.y - 0.5) < 1.6).length >= 2) g.slamDoor(d);
    // a human-ish fixer: gets to sabotage panels a few seconds late
    if (g.sabo && opts.fix !== false && g.sabo.dur - g.sabo.t > (opts.fixDelay || 5)) for (const p of g.sabo.panels) if (p.taps < g.sabo.need) { g.fixPanel(p); break; }
    for (const c of g.crew) if (c.sp >= c.spMax && c.skillT <= 0 && g.foes.some(f => Math.hypot(f.x - c.cx, f.y - c.cy) < 4 * TILE)) g.useSkill(c);
    // deploy
    let tries = 0;
    while (tries++ < 3) {
      const type = avail[idx % avail.length];
      if (g.crew.filter(c => !c.barricade).length >= (opts.max || 14)) break;
      if (g.dp >= CREW[type].cost) { const before = g.deployed; place(type); idx++; if (g.deployed === before) break; } else break;
    }
    if (g.crew.filter(c => !c.barricade).length >= (opts.max || 14) || idx > 6) { // promote weakest
      const c = g.crew.filter(c => !c.barricade && g.promoteCost(c) != null && c.b.block + (c.b.range ? 1 : 0)).sort((a, b) => a.lv - b.lv)[0];
      if (c && g.dp >= g.promoteCost(c) + 4) g.promote(c);
    }
    if (g.waveIdx < level.waves.length - 1 && g.foes.length === 0 && !g.queue.length && opts.rush === true) g.callNextWave();
  }
  return { id: levelId, won: g.state === 'won', lives: g.lives, max: g.maxLives, t: Math.round(g.t), crew: g.crew.length, kills: g.kills, wave: g.waveIdx + 1, foes: g.foes.length, left: g.foes.map(f=>f.type+(f.blockedBy?'B':'')+(f.revealed?'':'h')).join(',') };
};
