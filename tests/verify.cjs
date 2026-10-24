/* Development-only browser verification. No test dependencies are shipped to players. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
for (const file of ['game.js','sw.js','tests/verify.cjs']) execFileSync(process.execPath,['--check',path.join(repo,file)]);
JSON.parse(readFileSync(path.join(repo,'manifest.json'),'utf8'));
assert.match(readFileSync(path.join(repo,'sw.js'),'utf8'), /CACHE_PREFIX\}v[2-9]/, 'The offline cache version is newer than v1');

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

    const featureChecks = await page.evaluate(() => {
      const h = window.__crewmateTest;
      const check = (condition,message) => { if (!condition) throw new Error(message); };
      const registry = Object.entries(h.enemyKinds), logs = [];
      for (const [id,kind] of registry) check(kind.id === id && kind.name && kind.hint && kind.shape && kind.accessory &&
        typeof kind.renderer === 'function' && [kind.hp,kind.speed,kind.reward].every(n => Number.isFinite(n) && n > 0), `Complete registry: ${id}`);
      check(new Set(registry.map(([,kind]) => kind.shape+'/'+kind.accessory)).size === registry.length, 'Distinct silhouettes and accessories');
      check(h.levels.map(level => level.waves.length).join() === '10,15,20', 'All 45 explicit waves remain');
      const expectedCorners = [
        [[0,1],[6,1],[6,4],[2,4],[2,7],[8,7]],
        [[0,1],[7,1],[7,3],[1,3],[1,6],[7,6],[7,8],[8,8]],
        [[0,0],[6,0],[6,2],[2,2],[2,4],[7,4],[7,6],[1,6],[1,8],[8,8]]
      ];
      for (const level of h.levels) {
        check(JSON.stringify(level.corners) === JSON.stringify(expectedCorners[level.id]), 'Original route coordinates');
        check(level.coins === [140,160,180][level.id] && level.lives === 20, 'Original starting resources');
        for (const wave of level.waves) {
          check(Number.isFinite(wave.hpScale) && wave.hpScale > 0, 'Finite wave scaling');
          check(wave.groups.every(group => h.enemyKinds[group.kind] && Number.isInteger(group.count) && group.count > 0 &&
            Number.isFinite(group.spacing) && group.spacing > 0), 'Explicit valid groups');
          const queue = h.makeWaveQueue(wave);
          check(queue.length === h.waveCount(wave) && queue.every(bot =>
            [bot.hp,bot.speed,bot.reward,bot.spacing].every(n => Number.isFinite(n) && n > 0)), 'Finite bounded queue');
        }
      }
      const firstWave = (level,kind) => h.levels[level].waves.findIndex(wave => wave.groups.some(group => group.kind === kind));
      check(firstWave(0,'scout') === 3 && firstWave(0,'bulky') === 6, 'Gentle wave 4/7 introductions');
      check(firstWave(1,'plated') === 7, 'Mid-mission Plated introduction');
      const bossWaves = h.levels.flatMap(level => level.waves.flatMap((wave,index) =>
        h.makeWaveQueue(wave).filter(bot => bot.kind === 'boss').map(bot => ({ ...bot, level:level.id, wave:index }))));
      check(bossWaves.length === 1 && bossWaves[0].level === 2 && bossWaves[0].wave === 19 &&
        bossWaves[0].hp === 3200 && bossWaves[0].speed === 28 && bossWaves[0].reward === 80, 'One unchanged final boss');
      const finale = h.makeWaveQueue(h.levels[2].waves[19]);
      check(finale[finale.length-1].kind === 'boss', 'Boss is the final arrival');
      for (const kind of ['zipper','swarmer']) {
        const size = h.enemyKinds[kind].packSize;
        const queue = h.makeWaveQueue({ hpScale:1, groups:[{ kind, count:size*2+1, spacing:.9 }] });
        check(queue.length === size*2+1 && queue[0].spacing === .12 && queue[size-1].spacing === .9 &&
          queue[queue.length-1].spacing === .9, 'Tight finite packs, including partial pack');
      }
      h.startLevel(0);
      let state = h.inspect(), parent = h.spawnEnemy({ kind:'splitter', hpScale:2 },321.25), before = state.coins;
      h.hitEnemy(parent,99999);
      let minis = state.enemies.filter(enemy => enemy.kind === 'mini');
      check(minis.length === 2 && minis.every(enemy => enemy.distance === 321.25 && enemy.maxHp === 32 &&
        [enemy.x,enemy.y,enemy.hp].every(Number.isFinite)), 'Two scaled minis at the current path progress');
      h.hitEnemy(parent,99999);
      check(state.enemies.filter(enemy => enemy.kind === 'mini').length === 2 && state.coins === before+9, 'Death and reward resolve once');
      for (const mini of minis) h.hitEnemy(mini,99999);
      check(state.enemies.filter(enemy => enemy.hp > 0).length === 0 && state.coins === before+13, 'Mini rewards are finite and never split');
      h.startLevel(0);state=h.inspect();state.phase='wave';
      h.spawnEnemy({kind:'splitter'},state.level.length-.01);h.step(.02);
      check(state.lives === 19 && state.kills === 0 && !state.enemies.some(enemy => enemy.kind === 'mini'), 'Leaking splitter costs one life and never splits');
      h.startLevel(0);state=h.inspect();
      const plated=h.spawnEnemy({kind:'plated'},120), armored=h.spawnEnemy({kind:'armored'},120);
      h.hitEnemy(plated,10);h.hitEnemy(armored,1,{slow:.5,duration:1});
      check(plated.hp === plated.maxHp-7 && armored.hp === armored.maxHp-1 && armored.slow === .5, 'Light armor never heals or blocks Frost control');
      logs.push('registry, all explicit waves, intros, finite packs/splits, original routes/resources/boss, armor');

      // Isolated mechanic fixtures fund each branch; the balance runs below inject nothing.
      const setup = (type,branch) => {
        h.startLevel(0);h.inspect().coins=10000;h.selectType(type);h.activateTile(2,2);
        h.chooseBranch(Object.keys(h.towers[type].branches)[0]);
        check(h.inspect().towers[0].branch === null, 'A specialization requires both linear upgrades');
        h.upgradeTower();h.upgradeTower();if(branch)h.chooseBranch(branch);
        return h.inspect().towers[0];
      };
      for (const [type,definition] of Object.entries(h.towers)) for (const [id,branch] of Object.entries(definition.branches)) {
        const tower=setup(type);state=h.inspect();const base=h.getTowerStats(tower);
        state.coins=branch.cost-1;h.chooseBranch(id);
        check(!tower.branch && state.coins === branch.cost-1, 'No credit for specializations');
        state.coins=1000;h.togglePause(true);h.chooseBranch(id);check(!tower.branch,'No purchases while paused');h.togglePause(false);
        h.chooseBranch('not-a-branch');check(!tower.branch,'Unknown branch rejected');h.chooseBranch(id);
        const invested=definition.cost+definition.upgrades[0]+definition.upgrades[1]+branch.cost;
        check(tower.branch === id && tower.invested === invested && state.coins === 1000-branch.cost, 'Exact branch cost and investment');
        const coins=state.coins;
        for (const other of Object.keys(definition.branches)) h.chooseBranch(other);
        h.upgradeTower();
        check(tower.branch === id && tower.level === 2 && state.coins === coins, 'Final branch and exactly two linear upgrades');
        const stats=h.getTowerStats(tower);
        if(id==='gatling')check(stats.cooldown<base.cooldown && stats.damage<base.damage,'Gatling tradeoff');
        if(id==='longshot')check(stats.range>base.range && stats.damage>base.damage && stats.cooldown>base.cooldown,'Longshot tradeoff');
        if(id==='bigsplash')check(stats.splash>base.splash*1.4,'Big Splash radius');
        check(h.getSellRefund(tower) === Math.floor(invested*.65),'Specialization included in recycle refund');
        h.sellTower();check(state.coins === coins+Math.floor(invested*.65) && !state.towers.length,'Exact recycle payment');
      }
      let tower=setup('frost','deepfreeze');state=h.inspect();state.phase='wave';
      let target=h.spawnEnemy({kind:'boss'},120), stats=h.getTowerStats(tower);
      h.hitEnemy(target,stats.damage,stats,tower);h.hitEnemy(target,stats.damage,stats,tower);
      check(target.freezeTime===0,'No premature freeze');h.hitEnemy(target,stats.damage,stats,tower);
      check(target.freezeTime>0,'Deterministic third-hit freeze');state.towers=[];const distance=target.distance;
      h.step(.4);check(target.distance===distance,'Freeze completely stops movement');h.step(.6);check(target.distance>distance,'Freeze expires');
      tower=setup('frost','blizzard');state=h.inspect();state.phase='wave';
      const near=[h.spawnEnemy({kind:'boss'},120),h.spawnEnemy({kind:'boss'},180)],far=h.spawnEnemy({kind:'boss'},420);
      h.step(.12);check(near.every(enemy=>enemy.slowTime>0 && enemy.slow<1) && far.slow===1,'Blizzard slows all nearby bots only');
      tower=setup('cannon','cluster');state=h.inspect();state.phase='wave';target=h.spawnEnemy({kind:'boss'},120);
      let found=false;
      for(let step=0;step<30;step++){h.step(.02);if(state.blasts.length===3){found=true;break;}}
      check(found && new Set(state.blasts.map(blast=>blast.x+','+blast.y)).size===3 &&
        state.blasts.every(blast=>[blast.x,blast.y,blast.delay].every(Number.isFinite)),'Exactly three distinct secondary blast centers');
      const hp=target.hp;state.towers=[];h.step(.6);check(target.hp<hp,'Secondary blasts cause actual damage');
      logs.push('six final paid branches, exact refunds, Deep Freeze timing, Blizzard AoE, Cluster damage');

      const images=[], originalRandom=Math.random;
      Math.random=()=>{throw new Error('Decorations must never use Math.random');};
      try {
        for (const level of h.levels) {
          check(JSON.stringify(h.decorationPlan(level))===JSON.stringify(level.decorations),'Pure deterministic decoration plan');
          check(level.decorations.every(decor=>[decor.x,decor.y,decor.scale].every(Number.isFinite) &&
            !level.pathSet.has(`${decor.c},${decor.r}`)),'Decorations occupy finite off-path positions');
          check(level.theme.decorSet.every(kind=>level.decorations.some(decor=>decor.kind===kind)),'Every theme decoration appears');
          const canvas=document.createElement('canvas');canvas.width=540;canvas.height=600;
          const context=canvas.getContext('2d');h.renderTheme(context,level);const first=canvas.toDataURL();
          context.lineCap='square';context.lineJoin='bevel';context.globalAlpha=.4;context.setLineDash([2,3]);
          h.renderTheme(context,level);check(first===canvas.toDataURL(),'Identical pixels independent of prior context state');
          check(context.globalAlpha===.4 && context.lineCap==='square','Theme renderer restores caller state');
          const fresh=document.createElement('canvas');fresh.width=540;fresh.height=600;h.renderTheme(fresh.getContext('2d'),level);
          check(first===fresh.toDataURL(),'Fresh and reused canvases render the same theme');images.push(first);
        }
      } finally {Math.random=originalRandom;}
      check(new Set(images).size===3,'All three planets are visually different');
      h.startLevel(0); // Decoration tests never change progression or collision rules.
      const decor=h.levels[0].decorations[0];h.activateTile(decor.c,decor.r);
      check(h.snapshot().towers.length===1,'A decoration does not block building');
      logs.push('seeded shared themes, pixel determinism, Canvas state isolation, decorative-only occupancy');
      return logs;
    });
    console.log(featureChecks.join('\n'));

    // A fixed, reproducible strategy: choose squares covering several path cells,
    // buy a mixed crew, then upgrade before expanding. No resources or saves are injected.
    const results = await page.evaluate(() => {
      const h = window.__crewmateTest, results = [];
      for (const useBranches of [false,true]) for (let level = 0; level < 3; level++) {
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
          for (let attempt = 0; attempt < 60; attempt++) {
            const snap = h.snapshot(), tower = snap.towers.find(t => t.level < 2);
            if (snap.towers.length >= 4 && tower && snap.coins >= h.towers[tower.type].upgrades[tower.level]) {
              h.activateTile(tower.c,tower.r); h.upgradeTower(); continue;
            }
            const toBranch=useBranches && snap.towers.find(t=>t.level===2 && !t.branch);
            if(toBranch){
              const index=snap.towers.filter(t=>t.type===toBranch.type).indexOf(toBranch);
              const id=Object.keys(h.towers[toBranch.type].branches)[index%2];
              if(snap.coins>=h.towers[toBranch.type].branches[id].cost){h.activateTile(toBranch.c,toBranch.r);h.chooseBranch(id);continue;}
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
          h.startWave(); h.step(160);
          if ((level<2 || wave<19) && h.snapshot().bossSpawned) throw new Error('Boss arrived early');
          if (h.snapshot().phase === 'lost') break;
        }
        const snap = h.snapshot();
        const maxTower = snap.towers.find(t => t.level === 2);
        if (maxTower) { h.activateTile(maxTower.c,maxTower.r); h.upgradeTower(); }
        results.push({ useBranches, level, phase: snap.phase, lives: snap.lives, wave: snap.wave, kills: snap.kills,
          boss: snap.bossSpawned, towerCount: snap.towers.length, coins: snap.coins,
          upgradesValid: h.snapshot().towers.every(t => t.level <= 2), unlocked: snap.save.unlocked });
      }
      return results;
    });
    for (const result of results) {
      const i=result.level;
      assert.equal(result.phase, 'won', `Mission ${i+1} is winnable with earned coins`);
      assert.equal(result.lives, 20);
      assert.equal(result.wave, [10,15,20][i]);
      assert.equal(result.kills, [86,225,700][i]);
      assert.equal(result.boss, i === 2 ? 1 : 0, 'Exactly one boss, at the end of mission 3');
      assert(result.upgradesValid);
      if(!result.useBranches) assert.equal(result.unlocked, Math.min(3,i+2));
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

    const legacyContext=await browser.newContext({serviceWorkers:'block'}),legacyPage=await legacyContext.newPage();
    await legacyPage.goto(`${baseURL}?test`);
    await legacyPage.evaluate(()=>localStorage.setItem('crewmate-craft-defense-v1',JSON.stringify({
      version:1,unlocked:2,sound:false,best:{0:{cleared:true,wave:10,lives:17,kills:86}}
    })));
    await legacyPage.reload();
    const legacy=await legacyPage.evaluate(()=>{
      const h=window.__crewmateTest,saved=h.snapshot().save;h.startLevel(1);h.activateTile(2,2);
      return {saved,branch:h.snapshot().towers[0].branch};
    });
    assert.equal(legacy.saved.version,1);assert.equal(legacy.saved.unlocked,2);assert.equal(legacy.saved.sound,false);
    assert.equal(legacy.saved.best[0].lives,17);assert.equal(legacy.saved.best[0].cleared,true);assert.equal(legacy.branch,null);
    await legacyPage.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('crewmate-craft-defense-v1'));delete saved.sound;localStorage.setItem('crewmate-craft-defense-v1',JSON.stringify(saved));});
    await legacyPage.reload();
    assert.equal(await legacyPage.evaluate(()=>window.__crewmateTest.snapshot().save.sound),true,'Missing legacy sound preference uses its default');
    await legacyContext.close();

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
    console.log('PASS: registries/waves/themes, split/pack safety, all six branches, actual-coins balance (all 45 waves with and without branches), legacy saves, progression/retry, responsive layout, offline reload/play.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
