/* Development-only browser verification. No test dependencies are shipped to players. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseURL = (process.env.BASE_URL || 'http://127.0.0.1:8000/').replace(/\/?$/, '/');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox']
  });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [], externalRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (new URL(request.url()).origin !== new URL(baseURL).origin) externalRequests.push(request.url());
    });
    await page.goto(`${baseURL}?test`);
    await page.waitForFunction(() => window.__crewmateTest);
    assert.equal(await page.locator('.mission-card:disabled').count(), 2, 'Later missions start locked');

    const contracts = await page.evaluate(() => {
      const h = window.__crewmateTest;
      const pathsValid = h.levels.every(level =>
        level.lives === 20 && level.path.length === level.pathSet.size &&
        level.path.every((p,i,path) => p.c >= 0 && p.c < 9 && p.r >= 0 && p.r < 10 &&
          (!i || Math.abs(p.c-path[i-1].c)+Math.abs(p.r-path[i-1].r) === 1)));
      h.startLevel(0); h.startLevel(1);
      const lockedLevel = h.snapshot().level;
      const start = h.snapshot();
      h.activateTile(0,1); // The bot path cannot hold towers.
      const pathCoins = h.snapshot().coins;
      h.activateTile(4,2);
      const buildCoins = h.snapshot().coins;
      h.upgradeTower();
      const upgraded = h.snapshot();
      h.upgradeTower(); // Insufficient funds: upgrade must not happen.
      const unaffordableLevel = h.snapshot().towers[0].level;
      h.startWave(); h.togglePause(true);
      const pausedClock = h.inspect().clock;
      h.step(5);
      const pauseWorked = h.inspect().clock === pausedClock;
      h.startLevel(0); h.startWave(); h.step(140);
      const leaks = h.snapshot();
      return { pathsValid, lockedLevel, start, pathCoins, buildCoins, upgraded, unaffordableLevel, pauseWorked, leaks };
    });
    assert(contracts.pathsValid, 'All paths are contiguous, on-grid, and non-overlapping');
    assert.equal(contracts.lockedLevel, 0);
    assert.equal(contracts.start.lives, 20);
    assert.equal(contracts.pathCoins, contracts.start.coins);
    assert.equal(contracts.buildCoins, contracts.start.coins - 45);
    assert.equal(contracts.upgraded.coins, contracts.start.coins - 45 - 40);
    assert.equal(contracts.upgraded.towers[0].level, 1);
    assert.equal(contracts.unaffordableLevel, 1);
    assert(contracts.pauseWorked);
    assert.equal(contracts.leaks.lives, 16, 'Every leaked bot costs exactly one life');
    assert.equal(contracts.leaks.leaked, 4);
    assert.equal(contracts.leaks.kills, 0);
    assert.equal(contracts.leaks.coins, 155, 'Leaking bots earn no kill coins; clearing a wave earns 15');

    // A fixed, reproducible strategy: choose squares covering several path cells,
    // buy a mixed crew, then upgrade before expanding. No resources or saves are injected.
    const results = await page.evaluate(() => {
      const h = window.__crewmateTest, results = [];
      for (let level = 0; level < 3; level++) {
        h.startLevel(level);
        const state = h.inspect();
        if (state.level.id !== level) throw new Error(`Mission ${level+1} did not unlock`);
        const spots = [];
        for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) {
          if (state.level.pathSet.has(`${c},${r}`)) continue;
          const coverage = state.level.path.filter(p => Math.hypot((p.c-c)*60,(p.r-r)*60) < 135).length;
          spots.push({ c, r, coverage });
        }
        const roster = ['blaster','cannon','blaster','frost','cannon','blaster','cannon','frost'];
        for (let wave = 0; wave < state.level.waves.length; wave++) {
          for (let attempt = 0; attempt < 30; attempt++) {
            const snap = h.snapshot(), tower = snap.towers.find(t => t.level < 2);
            if (snap.towers.length >= 4 && tower && snap.coins >= h.towers[tower.type].upgrades[tower.level]) {
              h.activateTile(tower.c,tower.r); h.upgradeTower(); continue;
            }
            const type = roster[snap.towers.length % roster.length];
            if (snap.coins < h.towers[type].cost) break;
            const candidate = spots.filter(p => !snap.towers.some(t => t.c === p.c && t.r === p.r))
              .map(p => ({ ...p, score: p.coverage - snap.towers.reduce((sum,t) =>
                sum + Math.max(0,2.5-Math.hypot(p.c-t.c,p.r-t.r))*.4,0) }))
              .sort((a,b) => b.score-a.score)[0];
            if (!candidate) break;
            h.selectType(type); h.activateTile(candidate.c,candidate.r);
          }
          h.startWave(); h.step(140);
          if (h.snapshot().phase === 'lost') break;
        }
        const snap = h.snapshot();
        const maxTower = snap.towers.find(t => t.level === 2);
        if (maxTower) { h.activateTile(maxTower.c,maxTower.r); h.upgradeTower(); }
        results.push({ level, phase: snap.phase, lives: snap.lives, wave: snap.wave, kills: snap.kills,
          boss: snap.bossSpawned, towerCount: snap.towers.length, coins: snap.coins,
          upgradesValid: h.snapshot().towers.every(t => t.level <= 2), unlocked: snap.save.unlocked });
      }
      return results;
    });
    for (const [i,result] of results.entries()) {
      assert.equal(result.phase, 'won', `Mission ${i+1} is winnable with earned coins`);
      assert.equal(result.lives, 20);
      assert.equal(result.wave, [10,15,20][i]);
      assert.equal(result.kills, [86,181,311][i]);
      assert.equal(result.boss, i === 2 ? 1 : 0, 'Exactly one boss, at the end of mission 3');
      assert(result.upgradesValid);
      assert.equal(result.unlocked, Math.min(3,i+2));
    }
    await page.reload();
    const saved = await page.evaluate(() => window.__crewmateTest.snapshot().save);
    assert.equal(saved.unlocked, 3);
    assert.equal(Object.values(saved.best).filter(best => best.cleared).length, 3);
    assert.equal(await page.locator('.mission-card:disabled').count(), 0);
    const loss = await page.evaluate(() => {
      const h = window.__crewmateTest; h.startLevel(0);
      for (let wave = 0; wave < 10 && h.snapshot().phase !== 'lost'; wave++) { h.startWave(); h.step(140); }
      return h.snapshot();
    });
    assert.equal(loss.phase, 'lost');
    assert.equal(loss.lives, 0);
    assert.equal(loss.leaked, 20);
    assert.equal(loss.save.best[0].lives, 20, 'A later loss preserves the best victory');
    await page.locator('#result-retry').click();
    const retry = await page.evaluate(() => window.__crewmateTest.snapshot());
    assert.equal(retry.lives, 20);
    assert.equal(retry.wave, 0);
    assert.equal(retry.phase, 'build');

    await page.goto(baseURL);
    assert.equal(await page.evaluate(() => typeof window.__crewmateTest), 'undefined', 'No harness on normal URLs');
    for (const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390],[1280,900]]) {
      await page.setViewportSize({ width,height });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}px`);
    }
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    assert.deepEqual(externalRequests, [], 'No external runtime requests');
    await context.close();

    // Real browser cache and network-off verification; works at / and project subpaths.
    const offlineContext = await browser.newContext();
    const offlinePage = await offlineContext.newPage();
    await offlinePage.goto(baseURL);
    await offlinePage.waitForFunction(() => !!navigator.serviceWorker.controller);
    await offlineContext.setOffline(true);
    await offlinePage.reload();
    await offlinePage.locator('[data-level="0"]').click();
    assert(await offlinePage.locator('#game-screen').isVisible(), 'Cached app starts a mission while offline');
    await offlinePage.locator('#start-wave-button').click();
    await offlinePage.waitForFunction(() => document.getElementById('start-wave-label').textContent.includes('in progress'));
    await offlineContext.close();
    console.table(results);
    console.log('PASS: mechanics, actual-coins balance (45 waves), progression, saved bests, retry, responsive layout, no external requests, offline reload/play.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
