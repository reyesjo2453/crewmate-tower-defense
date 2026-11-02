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
    }
    return out;
  });
  assert.deepEqual(problems, [], problems.join('\n'));
  console.log('data ok: 10 levels validated');

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

  // ---- offline PWA
  const pwa = await browser.newContext({ viewport: { width: 900, height: 430 } }); const pp = await pwa.newPage();
  await pp.goto(base); await pp.evaluate(() => navigator.serviceWorker.ready); await pp.waitForTimeout(800); await pp.reload(); await pp.waitForTimeout(500);
  await pwa.setOffline(true); await pp.reload(); await pp.waitForSelector('#btnPlay', { timeout: 8000 });
  assert.ok(await pp.isVisible('#btnPlay'), 'loads offline');
  console.log('offline ok');

  assert.deepEqual(external, [], 'no external requests'); assert.deepEqual(errors, [], 'no console errors:\n' + errors.join('\n'));
  console.log('ALL CHECKS PASSED'); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
