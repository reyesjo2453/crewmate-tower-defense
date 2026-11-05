/* Dev-only end-to-end check. Serve the repo (python3 -m http.server 8000) then:
   NODE_PATH=$(npm root -g) node tests/verify.cjs     (BASE_URL / CHROMIUM_PATH optional) */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
const repo = path.resolve(__dirname, '..');
for (const f of fs.readdirSync(path.join(repo, 'js'))) execFileSync(process.execPath, ['--check', path.join(repo, 'js', f)]);
execFileSync(process.execPath, ['--check', path.join(repo, 'sw.js')]);
const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'manifest.json'), 'utf8'));
for (const i of manifest.icons) assert.ok(fs.existsSync(path.join(repo, i.src)), 'icon exists ' + i.src);
const base = (process.env.BASE_URL || 'http://localhost:8000/').replace(/\/?$/, '/');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 430 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('request', r => { if (new URL(r.url()).origin !== new URL(base).origin) external.push(r.url()); });
  await page.goto(base + '?test'); await page.waitForFunction(() => window.__t);

  // ---- data validation
  const problems = await page.evaluate(() => {
    const out = [];
    for (const l of LEVELS) {
      const path = dirsOf(l.routes), hi = new Set(l.high.map(p => p.join(','))), wl = new Set((l.walls || []).map(p => p.join(',')));
      for (const k of path.keys()) { if (hi.has(k)) out.push(`L${l.id}: path tile ${k} is also high ground`); if (wl.has(k)) out.push(`L${l.id}: path tile ${k} is a wall`); }
      for (const h of l.high) if (h[0] < 0 || h[1] < 0 || h[0] >= l.cols || h[1] >= l.rows) out.push(`L${l.id}: high tile off-grid ${h}`);
      for (const r of l.routes) for (const p of r.pts) if (p[0] < 0 || p[1] < 0 || p[0] >= l.cols || p[1] >= l.rows) out.push(`L${l.id}: route point off-grid ${p}`);
      l.routes.forEach(r => { if (!r.air) for (let i = 0; i < r.pts.length - 1; i++) if (r.pts[i][0] !== r.pts[i + 1][0] && r.pts[i][1] !== r.pts[i + 1][1]) out.push(`L${l.id}: diagonal ground segment`); });
      l.waves.forEach((w, wi) => w.spawns.forEach(s => {
        if (!FOES[s.type]) out.push(`L${l.id} w${wi + 1}: unknown foe ${s.type}`);
        else if (!l.routes[s.route]) out.push(`L${l.id} w${wi + 1}: bad route ${s.route}`);
        else if (l.routes[s.route].air && !FOES[s.type].flying) out.push(`L${l.id} w${wi + 1}: ground foe ${s.type} on air route`);
      }));
      l.crew.forEach(c => { if (!CREW[c]) out.push(`L${l.id}: unknown crew ${c}`); });
      if (!l.pre || !l.post) out.push(`L${l.id}: missing story`);
      [...l.pre, ...l.post].forEach(([w]) => { if (!CAST[w]) out.push(`L${l.id}: unknown speaker ${w}`); });
      if (l.newCrew && !l.crew.includes(l.newCrew)) out.push(`L${l.id}: newCrew not in roster`);
      const ends = new Set(l.routes.flatMap(r => [r.pts[0], r.pts[r.pts.length - 1]].map(p => p.join(','))));
      (l.doors || []).forEach(d => { const k = d.join(','); if (!path.has(k)) out.push(`L${l.id}: door ${k} not on a floor path`); if (ends.has(k)) out.push(`L${l.id}: door ${k} on a vent or reactor`); });
      Object.entries(l.sabo || {}).forEach(([w, k]) => { if (!SABOTAGE[k]) out.push(`L${l.id}: unknown sabotage ${k}`); if (w < 1 || w > l.waves.length) out.push(`L${l.id}: sabotage on missing wave ${w}`); });
      if (squadSize(l, 'captain') < 1) out.push(`L${l.id}: empty squad`);
      if (!THEMES[l.theme] || !LIGHT[l.theme]) out.push(`L${l.id}: theme ${l.theme} missing colours or lighting`);
    }
    COMBOS.forEach(cb => cb.pair.concat(Object.keys(cb.fx)).forEach(k => { if (k !== 'barricade' && !CREW[k]) out.push(`combo ${cb.id}: unknown crew ${k}`); }));
    Object.keys(FOES).forEach(k => { if (!FOE_TINT[k]) out.push(`foe ${k} has no debris colour`); });
    return out;
  });
  assert.deepEqual(problems, [], problems.join('\n'));
  const nLevels = await page.evaluate(() => LEVELS.length); assert.equal(nLevels, 18, '18 missions');
  console.log('data ok: ' + nLevels + ' levels validated');

  // ---- fresh player journey with real clicks
  const fresh = await ctx.newPage(); fresh.on('pageerror', e => errors.push(e.message));
  await fresh.goto(base + '?test'); await fresh.waitForFunction(() => window.__t);
  await fresh.click('#btnPlay');
  for (let i = 0; i < 8 && await fresh.isVisible('#s-intro'); i++) { await fresh.click('#s-intro', { position: { x: 300, y: 200 } }); await fresh.waitForTimeout(450); }
  for (let i = 0; i < 20 && await fresh.isVisible('#s-dialog'); i++) { await fresh.click('#s-dialog', { position: { x: 100, y: 100 } }); await fresh.waitForTimeout(120); await fresh.click('#s-dialog', { position: { x: 100, y: 100 } }).catch(() => { }); await fresh.waitForTimeout(120); }
  await fresh.waitForSelector('#s-game:not(.hidden)'); assert.ok(await fresh.isVisible('#tut'), 'tutorial shows on first play');
  const tileXY = async (x, y) => fresh.evaluate(([x, y]) => { const r = document.getElementById('cv').getBoundingClientRect(); return { x: r.left + (x + 0.5) / __t.G.cols * r.width, y: r.top + (y + 0.5) / __t.G.rows * r.height }; }, [x, y]);
  const clickTile = async (x, y) => { const p = await tileXY(x, y); await fresh.mouse.click(p.x, p.y); };
  const step = async () => fresh.evaluate(() => document.getElementById('tutTxt').textContent.slice(0, 30));
  await fresh.click('#tutNext'); await fresh.click('#tutNext');                  // intro, DP
  await clickTile(5, 3); await fresh.waitForTimeout(100); assert.equal(await fresh.evaluate(() => __t.G.crew.length), 0, 'tutorial blocks wrong action');
  await fresh.click('[data-type=brick]'); await clickTile(2, 2);                  // place brick
  assert.equal(await fresh.evaluate(() => __t.G.crew.length), 1, 'brick placed');
  await fresh.click('#tutNext');                                                  // start wave 1
  assert.ok(await fresh.evaluate(() => __t.G.waveIdx === 0), 'wave started by tutorial');
  await fresh.click('[data-type=rook]'); await clickTile(4, 2);
  assert.equal(await fresh.evaluate(() => __t.G.crew.length), 2, 'rook placed');
  await fresh.evaluate(() => { __t.G.setSpeed(2); });
  await fresh.waitForFunction(() => document.getElementById('tutTxt').textContent.startsWith('Crawlers stopped'), null, { timeout: 60000 });
  await clickTile(2, 2); assert.ok(await fresh.isVisible('#unitPanel'), 'unit panel opens');
  await fresh.click('#unitPanel .skill'); assert.ok(await fresh.evaluate(() => __t.G.crew[0].skillT > 0), 'skill used');
  await fresh.click('#tutNext'); assert.ok(!(await fresh.isVisible('#tut')), 'tutorial ends');
  assert.ok(await fresh.evaluate(() => __t.save().tutDone), 'tutorial remembered');
  // finish the level quickly with the sim
  await fresh.evaluate(() => { const g = __t.G; g.dp = 99; const lv = g.level; [[4, 3], [5, 3], [8, 3]].forEach(([x, y]) => g.deploy('rook', x, y)); g.deploy('brick', 3, 3); g.deploy('brick', 6, 3); for (let i = 0; i < 60 * 240 && g.state !== 'won' && g.state !== 'lost'; i++) g.update(1 / 60); });
  await fresh.waitForSelector('#modalCard .bigstars', { timeout: 8000 });
  assert.ok(await fresh.evaluate(() => __t.save().stars[1] >= 1), 'stars saved');
  await fresh.click('#rGo');
  for (let i = 0; i < 20 && await fresh.isVisible('#s-dialog'); i++) { await fresh.click('#s-dialog', { position: { x: 100, y: 100 } }).catch(() => { }); await fresh.waitForTimeout(80); }
  await fresh.waitForSelector('#s-hub:not(.hidden)');
  assert.equal(await fresh.locator('.lvl:not(.locked)').count(), 2, 'mission 2 unlocked after mission 1');
  assert.ok((await fresh.evaluate(() => JSON.parse(localStorage.getItem('crewmate-command-v1')).stars[1])) >= 1, 'progress persisted');
  console.log('journey ok: prologue → story → tutorial → victory → unlock');

  // ---- foes mechanics
  const mech = await page.evaluate(() => {
    const g = new Game(null, { emit() { } }); g.start(LEVELS[3], 'captain', {}); g.callNextWave(); g.queue.length = 0; const r = {};
    const plated = g.spawnFoe('plated', 0, 5); const a = plated.hp; g.hitFoe(plated, 40, false); r.armorChip = a - plated.hp; const b = plated.hp; g.hitFoe(plated, 40, true); r.elecFull = b - plated.hp;
    g.foes = []; g.crew = []; g.deploy('brick', 3, 4); const c = g.crewAt(3, 4); const f1 = g.spawnFoe('crawler', 0, 3.0); for (let i = 0; i < 400; i++) g.update(1 / 60); r.blocked = !!(f1.blockedBy || f1.dead);
    g.foes = []; g.crew = []; const gh = g.spawnFoe('ghost', 0, 2); gh.d = 2.45; g.deploy('brick', 3, 4); r.ghostPasses = !gh.blockedBy;
    const sh = g.spawnFoe('shifter', 0, 1); r.hidden = !g.visible(sh); return r;
  });
  assert.ok(mech.armorChip < 15 && mech.armorChip >= 10, 'armor reduces bullet damage'); assert.equal(mech.elecFull, 40, 'electric ignores armor');
  assert.ok(mech.blocked, 'guard blocks ground foe'); assert.ok(mech.hidden, 'shifter hidden until revealed');
  console.log('mechanics ok');

  // ---- doors & sabotage
  const hz = await page.evaluate(() => {
    const g = new Game(null, { emit() { } }); g.start(LEVELS.find(l => l.id === 2), 'captain', {}); g.callNextWave(); g.queue.length = 0; g.foes = []; const r = {};
    const door = g.doors[0], f = g.spawnFoe('crawler', 0, 0.2); r.deny = !g.canPlace('brick', door.x, door.y).ok;
    g.tap(door.x, door.y); r.shut = door.t > 0; for (let i = 0; i < 60 * 4; i++) g.update(1 / 60);
    r.held = Math.floor(f.x / TILE) < door.x; r.again = g.slamDoor(door) === false;
    for (let i = 0; i < 60 * 6; i++) g.update(1 / 60); r.through = f.dead || Math.floor(f.x / TILE) >= door.x;
    const b = g.spawnFoe('brute', 0, 0.2); door.cd = 0; g.slamDoor(door); for (let i = 0; i < 60 * 8; i++) g.update(1 / 60); r.bossSmash = door.t === 0 && Math.floor(b.x / TILE) >= door.x;
    const h = new Game(null, { emit() { } }); h.start(LEVELS.find(l => l.id === 4), 'captain', {}); h.callNextWave(); h.queue.length = 0; h.foes = [];
    const rook = h.deploy('rook', 2, 2) || (h.dp = 99, h.deploy('rook', 2, 2)); h.startSabotage('lights'); r.dim = h.rangeOf(rook) < CREW.rook.range;
    const p0 = h.sabo.panels[0], need = h.sabo.need; for (let i = 0; i < need; i++) h.tap(p0.x, p0.y); r.fixed = !h.sabo && h.rangeOf(rook) === CREW.rook.range;
    h.startSabotage('o2'); h.dp = 20; for (let i = 0; i < 60 * 3; i++) h.update(1 / 60); r.drain = h.dp < 20; h.endSabotage(true);
    const lives = h.lives; h.startSabotage('reactor'); r.twoPanels = h.sabo.panels.length === 2 && h.sabo.panels[0].x + ',' + h.sabo.panels[0].y !== h.sabo.panels[1].x + ',' + h.sabo.panels[1].y;
    for (let i = 0; i < 60 * 31; i++) h.update(1 / 60); r.meltdown = lives - h.lives === 2;
    const q = new Game(null, { emit() { } }); q.start(LEVELS.find(l => l.id === 6), 'captain', { squad: ['rook', 'sparky'] }); r.squad = q.avail.join();
    return r;
  });
  assert.deepEqual(hz, { deny: true, shut: true, held: true, again: true, through: true, bossSmash: true, dim: true, fixed: true, drain: true, twoPanels: true, meltdown: true, squad: 'rook,sparky' });
  console.log('doors, sabotage & squad mechanics ok');

  // ---- squad screen + wardrobe with real clicks
  const sq = await ctx.newPage(); sq.on('pageerror', e => errors.push(e.message));
  await sq.goto(base + '?test'); await sq.waitForFunction(() => window.__t);
  await sq.evaluate(() => { const s = __t.save(); s.intro = true; s.tutDone = true; for (let i = 1; i <= 4; i++) s.stars[i] = 3; __t.persist(); __t.playLevel(5); });
  for (let i = 0; i < 30 && await sq.isVisible('#s-dialog'); i++) { await sq.click('#dlgSkip'); await sq.waitForTimeout(60); }
  await sq.waitForSelector('#s-squad:not(.hidden)');
  assert.equal(await sq.locator('.pick.on').count(), 4, 'default squad fills 4 seats');
  assert.ok(await sq.locator('.pick[data-k=echo].on').count(), 'new crewmate is in the squad');
  await sq.click('.pick[data-k=echo]'); assert.ok(await sq.locator('.pick[data-k=echo].on').count(), 'new crewmate stays');
  await sq.click('.pick[data-k=tank]'); assert.equal(await sq.locator('.pick.on').count(), 4, 'full squad refuses a 5th');
  await sq.click('.pick[data-k=brick]'); await sq.click('.pick[data-k=tank]');
  await sq.click('#sqWard'); await sq.waitForSelector('#s-ward:not(.hidden)');
  assert.ok(await sq.locator('.item[data-id=crown].lock').count(), 'crown locked at 12 stars');
  await sq.click('.item[data-slot=hat][data-id=party]'); await sq.click('.item[data-slot=pet][data-id=minibean]');
  assert.equal(await sq.evaluate(() => lookFor('echo').hat), 'party', 'hat applied');
  await sq.click('#wBack'); await sq.waitForSelector('#s-squad:not(.hidden)'); await sq.click('#sqGo');
  await sq.waitForSelector('#s-game:not(.hidden)');
  const inGame = await sq.evaluate(() => ({ avail: __t.G.avail.slice().sort().join(), cards: document.querySelectorAll('.card').length, look: JSON.parse(localStorage.getItem('crewmate-command-v1')).looks.echo }));
  assert.equal(inGame.avail, 'echo,rook,sparky,tank', 'squad carried into battle');
  assert.equal(inGame.cards, 4, 'only the squad gets cards'); assert.deepEqual(inGame.look, { hat: 'party', pet: 'minibean' }, 'looks saved');
  await sq.evaluate(() => { const g = __t.G; g.dp = 99; g.deploy('rook', 3, 2); g.callNextWave(); g.slamDoor(g.doors[0]); for (const k of Object.keys(SABOTAGE)) { g.startSabotage(k); for (let i = 0; i < 90; i++) g.update(1 / 60); g.render(); g.endSabotage(true); } });
  console.log('squad & wardrobe ok');


  // ---- chapter 4 crew & foes
  const c4 = await page.evaluate(() => {
    const mk = (id, opts) => { const g = new Game(null, { emit() { } }); g.start(LEVELS.find(l => l.id === id), 'captain', opts || {}); g.callNextWave(); g.queue.length = 0; g.foes = []; g.dp = 99; return g; };
    const run = (g, s) => { for (let i = 0; i < 60 * s; i++) g.update(1 / 60); };
    const r = {};
    // Wrench builds a barricade on the floor next to him, and it blocks
    let g = mk(11); const w = g.deploy('wrench', 2, 2); run(g, 3); r.built = !!w.wall && g.tileKind(w.wall.x, w.wall.y) === 'path';
    const f = g.spawnFoe('crawler', 0, 0); run(g, 6); r.wallBlocks = f.blockedBy === w.wall || f.dead;
    g.useSkill(Object.assign(w, { sp: w.spMax })); r.steel = g.stat(w.wall).block === 3;
    g.retreat(w); r.wallGone = !g.crew.some(c => c.barricade);
    // Marshal pierces half the armor and picks the toughest target
    g = mk(12); const p1 = g.spawnFoe('plated', 0, 4), hp0 = p1.hp; g.hitFoe(p1, 150, false, true); r.pierce = Math.round(hp0 - p1.hp) === Math.round(150 - 55 / 2);
    g.foes = []; const m = g.deploy('marshal', 4, 3), weak = g.spawnFoe('crawler', 0, 7), big = g.spawnFoe('golem', 0, 5); m.atkT = 0; g.updateCrew(m, 1 / 60); r.toughest = g.shots.length && g.shots[0].f === big;
    // Bubbles shields a guard; the shield eats a whole hit
    g = mk(13); const br = g.deploy('brick', 2, 3), bu = g.deploy('bubbles', 3, 2); bu.atkT = 0; g.updateCrew(bu, 1 / 60); r.shielded = br.shield === 1;
    const hpB = br.hp; g.hitCrew(br, 500); r.soaked = br.hp === hpB && br.shield === 0;
    // Blast Beetle explodes on a guard
    g.foes = []; const bomb = g.spawnFoe('bomber', 0, 10); br.shield = 0; const hpC = br.hp; run(g, 5); r.boom = bomb.dead && br.hp < hpC;
    // Rock Mite: untargetable and unblockable while burrowed
    g = mk(11); const mite = g.spawnFoe('mite', 0, 1); mite.burT = 0; g.updateFoe(mite, 1 / 60); r.burrowed = mite.under && !g.visible(mite);
    // Leech drains DP; Golem can't be slowed
    g = mk(12); g.dp = 20; g.spawnFoe('leech', 2, 0); g.spawnFoe('leech', 2, 0); g.dpRate = 0; run(g, 2); r.drain = g.dp < 19;
    const gol = g.spawnFoe('golem', 0, 1); gol.slowMul = 0.2; gol.slowT = 3; g.updateFoe(gol, 1 / 60); r.steady = gol.slowMul === 1;
    // The Foreman drills underground
    g = mk(14); const fm = g.spawnFoe('foreman', 0, 1); fm.drillT = 0; g.updateFoe(fm, 1 / 60); r.drill = fm.under;
    return r;
  });
  assert.deepEqual(c4, { built: true, wallBlocks: true, steel: true, wallGone: true, pierce: true, toughest: true, shielded: true, soaked: true, boom: true, burrowed: true, drain: true, steady: true, drill: true });
  console.log('chapter 4 crew & foes ok');

  // ---- challenges, training, story mode, endless, slow-mo finish
  const meta = await page.evaluate(() => {
    const L = id => LEVELS.find(l => l.id === id), r = {};
    const base = new Game(null, { emit() { } }); base.start(L(6), 'captain', {});
    const g = new Game(null, { emit() { } }); g.start(L(6), 'captain', { mods: ['fast', 'tough', 'poor', 'glass', 'nomed', 'nodoors'] });
    r.mods = g.spdMul === 1.2 && g.hpMul === 1.3 && g.dpRate < base.dpRate && g.maxLives < base.maxLives && !g.avail.includes('lumi') && g.doors.length === 0;
    const u = new Game(null, { emit() { } }); u.start(L(6), 'captain', { ups: { rook: { tough: 2, power: 3, focus: 1 } } }); u.dp = 99; const rk = u.deploy('rook', 1, 2);
    r.ups = u.stat(rk).maxHp === Math.round(CREW.rook.hp * 1.2) && Math.abs(u.stat(rk).atk - CREW.rook.atk * 1.24) < 1e-6 && rk.spMax === CREW.rook.skill.sp * 0.9;
    r.xp = xpLevel(0) === 0 && xpLevel(90) === 2 && xpLevel(99999) === XP_MAX_LEVEL;
    const s = new Game(null, { emit() { } }); s.start(L(1), 'story', {}); s.callNextWave(); for (let i = 0; i < 20; i++) s.leak(s.spawnFoe('crawler', 0, 0)); r.safe = s.lives === 1 && s.state !== 'lost';
    for (let i = 0; i < 60; i++) s.update(1 / 60); r.safe = r.safe && s.state !== 'lost';
    const e = new Game(null, { emit() { } }), lvl = Object.assign({}, L(3), { endless: true, crew: CREW_ORDER.slice(), waves: [] }); e.start(lvl, 'captain', {});
    for (let i = 0; i < 12; i++) e.callNextWave(); r.endless = e.level.waves.length >= 14 && e.level.waves[11].mul > 1.7 && e.level.waves[9].spawns.some(sp => FOES[sp.type].boss);
    r.endlessGround = e.level.waves.every(w => w.spawns.every(sp => !e.level.routes[sp.route].air || FOES[sp.type].flying));
    let ended = null; const w = new Game(null, { emit(n, d) { if (n === 'end') ended = d; } }); w.start(L(1), 'captain', {}); w.callNextWave(); w.waveIdx = w.level.waves.length - 1; w.queue = []; w.foes = [];
    w.update(1 / 60); r.slowmo = w.timeScale < 1 && w.state === 'playing'; for (let i = 0; i < 60; i++) w.update(1 / 60); r.won = w.state === 'won' && ended && ended.won && w.timeScale === 1;
    const sug = new Game(null, { emit() { } }); sug.start(L(2), 'captain', {}); const h = sug.suggest(); r.hint = !!h && h.type === 'brick' && sug.canPlace('brick', h.x, h.y).ok;
    return r;
  });
  assert.deepEqual(meta, { mods: true, ups: true, xp: true, safe: true, endless: true, endlessGround: true, slowmo: true, won: true, hint: true });
  console.log('challenges, training, story mode, endless & hint mechanics ok');

  // ---- the new screens with real clicks
  const ui = await ctx.newPage(); ui.on('pageerror', e => errors.push(e.message));
  await ui.goto(base + '?test'); await ui.waitForFunction(() => window.__t);
  await ui.evaluate(() => { const s = __t.save(); s.intro = true; s.tutDone = true; for (let i = 1; i <= 3; i++) s.stars[i] = 3; __t.persist(); __t.toHub(); });
  assert.ok(await ui.isVisible('#hubEnd'), 'endless unlocked after chapter 1');
  // replay a cleared mission with a challenge on, then win it
  await ui.evaluate(() => __t.playLevel(2)); await ui.waitForSelector('#s-squad:not(.hidden)');
  assert.ok(await ui.isVisible('#sqModsWrap'), 'challenges offered on a cleared mission'); assert.ok(!(await ui.isVisible('#sqCrewWrap')), 'no squad pick when everyone fits');
  await ui.click('.mod[data-mod=fast]'); await ui.click('.mod[data-mod=glass]'); await ui.click('#sqGo'); await ui.waitForSelector('#s-game:not(.hidden)');
  assert.deepEqual(await ui.evaluate(() => [__t.G.spdMul, __t.G.maxLives]), [1.2, 4], 'challenges applied');
  await ui.click('#btnHint'); assert.ok(await ui.evaluate(() => !!__t.G.hint && __t.G.placing === 'brick'), 'hint picks a crewmate and a tile');
  await ui.evaluate(() => { const g = __t.G; g.dp = 99; g.placing = null; [[2, 2], [3, 3], [5, 2], [5, 4], [7, 2], [7, 4], [8, 2], [8, 4], [2, 4]].forEach(([x, y]) => g.deploy('rook', x, y)); g.deploy('tank', 4, 3); g.deploy('brick', 4, 1); for (let i = 0; i < 60 * 300 && g.state !== 'won' && g.state !== 'lost'; i++) { if (g.state === 'prep' || (!g.foes.length && !g.queue.length)) g.callNextWave(); g.update(1 / 60); } });
  await ui.waitForSelector('#modalCard .bigstars', { timeout: 8000 });
  const won = await ui.evaluate(() => ({ mods: __t.save().mods[2], txt: document.getElementById('modalCard').textContent, xp: __t.save().xp.rook }));
  assert.deepEqual(won.mods.sort(), ['fast', 'glass'], 'bolts saved'); assert.ok(/challenge bolts/.test(won.txt) && /XP/.test(won.txt), 'result shows bolts and XP'); assert.ok(won.xp >= 30, 'squad earned XP');
  // spend an upgrade point in the Crew screen
  await ui.click('#rGo'); for (let i = 0; i < 20 && await ui.isVisible('#s-dialog'); i++) { await ui.click('#dlgSkip'); await ui.waitForTimeout(50); }
  await ui.waitForSelector('#s-hub:not(.hidden)'); await ui.click('#hubWard'); await ui.waitForSelector('#s-ward:not(.hidden)');
  await ui.click('#wCrew button[data-k=rook]'); await ui.click('[data-up=power]');
  assert.equal(await ui.evaluate(() => __t.save().ups.rook.power), 1, 'upgrade point spent');
  await ui.click('[data-wtab=style]'); assert.ok(await ui.locator('.item[data-id=chrome].lock').count(), 'Chrome visor still needs 3 bolts (we have 2)');
  await ui.click('#wBack');
  // endless: pick a map, play until the ship falls, best is saved
  await ui.click('#hubEnd'); await ui.waitForSelector('#s-endless:not(.hidden)'); await ui.click('#endList .lvl >> nth=1');
  await ui.waitForSelector('#s-squad:not(.hidden)'); await ui.click('#sqGo'); await ui.waitForSelector('#s-game:not(.hidden)');
  assert.ok(await ui.evaluate(() => __t.G.endless && document.getElementById('waveTxt').textContent.includes('♾')), 'endless HUD');
  await ui.evaluate(() => { const g = __t.G; g.callNextWave(); for (let i = 0; i < 4; i++) g.callNextWave(); for (let i = 0; i < 60 * 400 && g.state !== 'lost'; i++) g.update(1 / 60); });
  await ui.waitForSelector('#modalCard .bigscore', { timeout: 8000 });
  assert.ok(await ui.evaluate(() => __t.save().endless[2] >= 4), 'endless best saved');
  // boss intro card, medals tab, accessibility switches
  await ui.click('#rRe'); await ui.evaluate(() => { const s = __t.save(); delete s.coach.boss_brute; __t.G.callNextWave(); __t.G.spawnFoe('brute', 0, 0); });
  assert.ok(await ui.isVisible('#bossIntro') && await ui.evaluate(() => __t.G.frozen), 'boss intro freezes the action'); await ui.click('#bossIntro');
  assert.ok(!(await ui.evaluate(() => __t.G.frozen)), 'tap dismisses the boss intro');
  await ui.evaluate(() => { __t.G.stop(); __t.checkMedals(true); __t.toLog('hub'); }); await ui.click('[data-tab=medals]');
  assert.ok(await ui.locator('.medal.on').count() >= 2, 'medals earned and shown');
  await ui.evaluate(() => __t.toSettings()); await ui.click('#optCb'); await ui.click('#optBig');
  assert.ok(await ui.evaluate(() => A11Y.cb && document.body.classList.contains('big-ui') && __t.save().a11y.cb), 'accessibility options apply');
  assert.ok(await ui.locator('#segDiff .btn', { hasText: 'Story' }).count(), 'story difficulty offered');
  console.log('challenges, crew training, endless, boss intro, medals & settings screens ok');

  // ---- side routes walk on to the reactor instead of leaking where they join
  const joins = await ui.evaluate(() => LEVELS.map(l => { const rs = joinRoutes(l.routes), e = rs.find(r => !r.air).pts.at(-1); return rs.every(r => r.air || (r.pts.at(-1)[0] === e[0] && r.pts.at(-1)[1] === e[1])); }));
  assert.ok(joins.every(Boolean), 'every walking route ends at the reactor');
  // ---- save transfer code
  await ui.evaluate(() => __t.toSettings()); await ui.click('#btnExport');
  const code = await ui.inputValue('#codeOut'); assert.ok(code.startsWith('CREW1-'), 'save code made');
  const before = await ui.evaluate(() => JSON.stringify(__t.save().stars)); await ui.click('#cClose');
  await ui.evaluate(() => { __t.save().stars = {}; __t.persist(); });
  await ui.click('#btnImport'); await ui.fill('#codeIn', 'CREW1-oops'); await ui.click('#cLoad');
  assert.ok(/missing|changed|read/.test(await ui.textContent('#codeMsg')), 'bad code is rejected kindly');
  await ui.fill('#codeIn', code.slice(0, 40) + '\n  ' + code.slice(40)); await ui.click('#cLoad'); await ui.click('#mYes');
  assert.equal(await ui.evaluate(() => JSON.stringify(__t.save().stars)), before, 'save code restores progress (even with stray spaces)');
  assert.equal(await ui.evaluate(() => JSON.parse(localStorage.getItem('crewmate-command-v1')).stars['1']), JSON.parse(before)['1'], 'loaded save persisted');
  console.log('route joins & save codes ok');
  // ---- show-me coaching the first time a new crewmate joins
  await ui.evaluate(() => { delete __t.save().coach.new_tank; __t.save().coach.door = true; __t.setLevel(LEVELS[1]); __t.beginGame(); });
  await ui.waitForSelector('.card[data-type=tank].tut-focus', { timeout: 3000 });
  assert.ok(await ui.isVisible('#radio') && /THREE/.test(await ui.textContent('#radioTxt')), 'new crewmate explains themselves');
  const hintT = await ui.evaluate(() => __t.G.hint); assert.ok(Array.isArray(hintT), 'a tile glows for them');
  await ui.evaluate(() => { const g = __t.G; g.dp = 99; g.deploy('brick', ...(() => { const h = g.suggest('brick'); return [h.x, h.y]; })()); });
  assert.ok(await ui.evaluate(() => !!__t.G.hint && !__t.save().coach.new_tank), 'placing someone else keeps pointing at the new crewmate');
  await ui.evaluate(() => { const g = __t.G, h = g.hint; g.deploy('tank', h[0], h[1]); });
  assert.ok(await ui.evaluate(() => __t.save().coach.new_tank && !document.querySelector('.card.tut-focus') && __t.G.crew.some(c => c.type === 'tank')), 'coaching ends once they are placed');
  await ui.evaluate(() => __t.G.stop());
  console.log('new crewmate coaching ok');

  // ---- game feel & sound: cosmetic only, never in headless runs, every effect makes a sound
  const feel = await ui.evaluate(async () => {
    const out = {}, g = __t.G; out.headless = new Game(null, {}).J === null; out.live = !!g.J;
    __t.setLevel(LEVELS[2]); __t.beginGame(); g.callNextWave(); g.queue = []; g.foes = [];
    const f = g.spawnFoe('crawler', 0, 3); g.hitFoe(f, 10); out.pending = Math.round(f.jAcc);
    g.hitFoe(f, 1e6); out.num = g.J.nums.length ? g.J.nums[g.J.nums.length - 1].v : null; out.maxHp = Math.round(f.maxHp);
    out.debris = g.J.p.some(e => e.k === 'chunk'); out.dying = g.J.p.some(e => e.k === 'die');
    const b = g.spawnFoe('brute', 0, 3); g.hitFoe(b, 1e6); out.bossFreeze = g.J.hs > 0.1 && g.J.zt > 1.1;
    g.J.reset(); JUICE.calm = true; const b2 = g.spawnFoe('brute', 0, 3); g.hitFoe(b2, 1e6); out.calm = g.J.hs === 0 && g.J.zHold <= 0; JUICE.calm = false;
    JUICE.nums = false; const f2 = g.spawnFoe('crawler', 0, 3); g.hitFoe(f2, 10); out.numsOff = !f2.jAcc; JUICE.nums = true;
    out.tile = JSON.stringify(g.tileAt(g.cv.getBoundingClientRect().left + 5, g.cv.getBoundingClientRect().top + 5)) === '[0,0]';
    g.stop();
    const silent = []; for (const n of Sound.sfxNames().concat('chatter')) { if (n === 'win' || n === 'lose') continue; const pk = await Sound.previewSfx(n, -0.5); if (!(pk > 0.003)) silent.push(n + ':' + pk); }
    out.silent = silent; return out;
  });
  assert.ok(feel.headless && feel.live, 'juice only with a canvas');
  assert.equal(feel.pending, 10, 'hits gather into one damage number');
  assert.equal(feel.num, feel.maxHp, 'the number shows real damage, not overkill');
  assert.ok(feel.debris && feel.dying, 'defeated foes squash and burst');
  assert.ok(feel.bossFreeze, 'boss knockouts hit-pause and zoom');
  assert.ok(feel.calm, 'calmer screen turns off hit-pause and zoom');
  assert.ok(feel.numsOff, 'damage numbers can be turned off');
  assert.ok(feel.tile, 'tapping still maps to the right tile');
  assert.deepEqual(feel.silent, [], 'every sound effect renders and is audible');
  assert.ok(await ui.evaluate(() => !!document.getElementById('optCalm') && !!document.getElementById('optNums')), 'settings switches exist');
  console.log('game feel & sound ok');

  // ---- chapter 5: combos, helping foes, the Conductor, lighting & scenery
  const ch5 = await ui.evaluate(() => {
    const out = {}, g = new Game(null, { emit() {} }); g.start(LEVELS.find(l => l.id === 15), 'captain', {}); g.dp = 99;
    const br = g.deploy('brick', 4, 3), tk = g.deploy('tank', 4, 4); g.update(1 / 60);
    out.buds = g.links.length === 1 && g.links[0].cb.id === 'buds' && g.stat(br).def > CREW.brick.def && g.stat(tk).def > CREW.tank.def;
    out.preview = g.combosAt('rook', 3, 3).length === 0 && g.combosAt('echo', 3, 3).length === 0;
    const ro = g.deploy('rook', 3, 3); g.deploy('echo', 2, 3); g.update(1 / 60); out.spotter = g.links.some(l => l.cb.id === 'spotter') && Math.round(g.stat(ro).atk) === Math.round(CREW.rook.atk * 1.3);
    g.retreat(tk); g.update(1 / 60); out.broken = !g.links.some(l => l.cb.id === 'buds') && g.stat(br).def === CREW.brick.def; out.made = g.combosMade;
    g.callNextWave(); g.queue = []; g.foes = [];
    const m = g.spawnFoe('mimic', 0, 0.6), md = g.spawnFoe('mender', 0, 0.7), w = g.spawnFoe('warden', 0, 0.5), r = g.spawnFoe('rally', 1, 0.2), m2 = g.spawnFoe('crawler', 1, 0.3);
    m.hp -= 100; const h0 = m.hp; for (let i = 0; i < 30; i++) g.updateAuras(1 / 30); out.mend = m.hp > h0 && md.hp === md.maxHp;
    out.ward = m.wardK < 1 && w.wardK === 1; const hp1 = m.hp; g.hitFoe(m, 100, true); out.wardHit = Math.round(hp1 - m.hp) < 100;
    out.rally = m2.hasteK > 1;
    const c = g.spawnFoe('conductor', 0, 0.5), seen = new Set([c.song]); for (let i = 0; i < 60 * 25 && !c.dead; i++) { g.update(1 / 60); seen.add(c.song); } out.songs = seen.size;
    out.headless = g.S === null; out.live = !!__t.G.S;
    return out;
  });
  assert.ok(ch5.buds, 'Brick + Tank side by side make Best Buds'); assert.ok(ch5.preview, 'no combo shown where there is no partner');
  assert.ok(ch5.spotter, 'Echo makes Rook hit harder'); assert.ok(ch5.broken, 'combos end when a partner leaves'); assert.equal(ch5.made, 2, 'two combos made');
  assert.ok(ch5.mend, 'Mender heals others, not itself'); assert.ok(ch5.ward && ch5.wardHit, 'Warden shields others, not itself'); assert.ok(ch5.rally, 'Cheer Drone speeds foes up');
  assert.equal(ch5.songs, 3, 'the Conductor cycles through all three songs');
  assert.ok(ch5.headless && ch5.live, 'lighting only with a canvas');
  const lit = await ui.evaluate(async () => {
    const g = __t.G; __t.setLevel(LEVELS.find(l => l.id === 15)); __t.beginGame(); g.dp = 99; g.deploy('brick', 4, 3); g.deploy('tank', 4, 4);
    await new Promise(r => setTimeout(r, 900));
    const out = { spots: g.board.spots.length > 0, lights: g.S.lights(1).length > 3, motes: g.S.p.length > 0, links: g.links.length };
    g.setPlacing('rook'); g.render(); out.radio = !document.getElementById('radio').classList.contains('hidden'); g.setPlacing(null); g.stop();
    return out;
  });
  assert.ok(lit.spots && lit.lights && lit.motes, 'scenery is lit and alive'); assert.equal(lit.links, 1, 'combo shows on the board'); assert.ok(lit.radio, 'first combo is explained on the radio');
  await ui.evaluate(() => { __t.setLevel(LEVELS.find(l => l.id === 16)); __t.toSquad(); });
  assert.ok(/Combos in this squad/.test(await ui.textContent('#sqCombos')), 'squad screen lists combos');
  assert.ok(await ui.evaluate(() => document.querySelector('#s-squad').classList.contains('enter')), 'screens animate in');
  await ui.evaluate(() => __t.toHub()); assert.ok(/Chapter 5/.test(await ui.textContent('#hubList')), 'chapter 5 on the map');
  console.log('combos, helping foes, the Conductor, lighting & chapter 5 ok');

  // ---- offline PWA
  const pwa = await browser.newContext({ viewport: { width: 900, height: 430 } }); const pp = await pwa.newPage();
  await pp.goto(base); await pp.evaluate(() => navigator.serviceWorker.ready); await pp.waitForTimeout(800); await pp.reload(); await pp.waitForTimeout(500);
  await pwa.setOffline(true); await pp.reload(); await pp.waitForSelector('#btnPlay', { timeout: 8000 });
  assert.ok(await pp.isVisible('#btnPlay'), 'loads offline');
  console.log('offline ok');

  assert.deepEqual(external, [], 'no external requests'); assert.deepEqual(errors, [], 'no console errors:\n' + errors.join('\n'));
  console.log('ALL CHECKS PASSED'); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
