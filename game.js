/* Crewmate Craft — one small engine, three data-defined adventures. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const COLS = 9, ROWS = 10, CELL = 60, WIDTH = COLS * CELL, HEIGHT = ROWS * CELL;
  const SAVE_KEY = 'crewmate-craft-defense-v1';
  const COLORS = { blaster: '#bef264', cannon: '#ffae59', frost: '#a4efff' };
  const TOWERS = {
    blaster: { name: 'Blaster', cost: 45, tagline: 'Fast & trusty', description: 'Quick shots. Big team spirit. Great beside bends and long stretches.', upgrades: [40, 65], stats: [
      { damage: 8, cooldown: .5, range: 135 }, { damage: 14, cooldown: .44, range: 148 }, { damage: 22, cooldown: .38, range: 162 }
    ] },
    cannon: { name: 'Cannon', cost: 80, tagline: 'A big splash', description: 'Slow, powerful shots splash every bot nearby. Best for bunches of bots.', upgrades: [65, 95], stats: [
      { damage: 22, cooldown: 1.5, range: 145, splash: 65 }, { damage: 36, cooldown: 1.35, range: 158, splash: 73 }, { damage: 58, cooldown: 1.2, range: 172, splash: 82 }
    ] },
    frost: { name: 'Frost', cost: 65, tagline: 'Chill them out', description: 'Chilly shots slow bots so your other towers have more time to help.', upgrades: [55, 85], stats: [
      { damage: 3, cooldown: .85, range: 130, slow: .52, duration: 1.7 }, { damage: 6, cooldown: .75, range: 144, slow: .43, duration: 1.9 }, { damage: 10, cooldown: .65, range: 158, slow: .34, duration: 2.1 }
    ] }
  };
  // Each wave is [bot count, base HP, speed in px/s, spawn spacing, coins per bot].
  // A boss is explicitly appended only to the last wave of Bot Flood.
  const LEVELS = [
    { id: 0, name: 'First Stand', subtitle: 'A quiet moon. Your first brave stand.', difficulty: 'NICE & GENTLE', coins: 140, lives: 20,
      corners: [[0,1],[6,1],[6,4],[2,4],[2,7],[8,7]],
      tip: 'A Blaster beside a bend is a great first teammate.',
      waves: [[4,26,46,1.2,8],[5,30,47,1.1,8],[6,35,48,1.05,8],[7,40,49,1,8],[8,46,50,.95,8],[9,53,51,.9,8],[10,60,52,.85,8],[11,68,53,.8,8],[12,76,54,.75,8],[14,86,55,.7,9]] },
    { id: 1, name: 'Winding Way', subtitle: 'More twists. Quicker little troublemakers.', difficulty: 'PICKING UP PACE', coins: 160, lives: 20,
      corners: [[0,1],[7,1],[7,3],[1,3],[1,6],[7,6],[7,8],[8,8]], runners: 3,
      tip: 'Frost slows the speedy bots. A Cannon loves a crowded corner.',
      waves: [[5,33,56,1,8],[6,39,57,.95,8],[7,46,58,.9,8],[8,54,59,.85,8],[9,62,60,.8,8],[10,71,61,.78,8],[11,80,62,.75,8],[12,90,63,.72,8],[13,100,64,.7,8],[14,111,65,.68,9],[15,123,66,.65,9],[16,136,67,.62,9],[17,150,68,.6,9],[18,165,69,.57,9],[20,182,70,.55,10]] },
    { id: 2, name: 'Bot Flood', subtitle: 'One busy base. One very big final visitor.', difficulty: 'THE BIG CHALLENGE', coins: 180, lives: 20,
      corners: [[0,0],[6,0],[6,2],[2,2],[2,4],[7,4],[7,6],[1,6],[1,8],[8,8]], runners: 4, armored: 5,
      tip: 'Cover several bends, upgrade your crew, and save a warm welcome for the boss.',
      boss: { hp: 3200, speed: 28, reward: 80 },
      waves: [[6,44,60,.95,9],[7,52,61,.9,9],[8,61,62,.85,9],[9,71,63,.8,9],[10,82,64,.75,9],[11,94,65,.72,9],[12,107,66,.69,9],[13,121,67,.66,9],[14,136,68,.63,9],[15,152,69,.6,9],[16,169,70,.57,10],[17,187,71,.55,10],[18,206,72,.53,10],[19,226,73,.51,10],[20,247,74,.49,10],[21,269,75,.47,10],[22,292,76,.45,10],[23,316,77,.43,10],[24,341,78,.41,10],[25,367,79,.4,11]] }
  ];

  const expandPath = corners => {
    const path = [{ c: corners[0][0], r: corners[0][1] }];
    for (let i = 1; i < corners.length; i++) {
      let { c, r } = path[path.length - 1];
      const [endC, endR] = corners[i];
      while (c !== endC || r !== endR) {
        c += Math.sign(endC - c); r += Math.sign(endR - r); path.push({ c, r });
      }
    }
    return path;
  };
  LEVELS.forEach(level => {
    level.path = expandPath(level.corners);
    level.pathSet = new Set(level.path.map(p => `${p.c},${p.r}`));
    level.length = (level.path.length - 1) * CELL;
  });

  let storageAvailable = true;
  const freshSave = () => ({ version: 1, unlocked: 1, best: {}, sound: true });
  let save = freshSave();
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (data && data.version === 1) {
      save.unlocked = Math.max(1, Math.min(3, Number(data.unlocked) || 1));
      save.sound = data.sound !== false;
      for (let i = 0; i < LEVELS.length; i++) {
        const best = data.best && data.best[i];
        if (best && typeof best === 'object') save.best[i] = {
          cleared: best.cleared === true,
          wave: Math.max(0, Math.min(LEVELS[i].waves.length, Number(best.wave) || 0)),
          lives: Math.max(0, Math.min(20, Number(best.lives) || 0)),
          kills: Math.max(0, Number(best.kills) || 0)
        };
      }
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch { storageAvailable = false; }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
    catch { storageAvailable = false; }
    if (!storageAvailable) $('save-note').textContent = 'Storage is unavailable; progress lasts for this session.';
  }
  persist();

  let audioContext;
  function wakeAudio() {
    if (!save.sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audioContext) audioContext = new Audio();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch { /* Sound is optional, including in restricted browsers. */ }
  }
  function bleep(kind) {
    if (!save.sound || !audioContext || audioContext.state !== 'running') return;
    const tones = { build: [440,880,.12,.065], shot: [580,330,.055,.018], cannon: [140,55,.14,.035], frost: [900,650,.09,.022], coin: [950,1300,.07,.025], leak: [170,110,.18,.06], wave: [330,660,.24,.055], win: [523,1046,.55,.07], lose: [330,220,.4,.06], upgrade: [660,1320,.22,.065] };
    const [from,to,duration,volume] = tones[kind] || tones.build;
    try {
      const osc = audioContext.createOscillator(), gain = audioContext.createGain(), now = audioContext.currentTime;
      osc.type = kind === 'cannon' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(to, now + duration);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      osc.connect(gain); gain.connect(audioContext.destination); osc.start(now); osc.stop(now + duration + .02);
    } catch { /* A blocked audio device must never interrupt a mission. */ }
  }

  const canvas = $('game-canvas'), ctx = canvas.getContext('2d');
  let state = null, selectedType = 'blaster', selectedTower = null, hover = null;
  let keyboardTile = { c: 4, r: 5 }, keyboardFocus = false, nextId = 1, lastFrame = 0, uiDirty = true;
  let announcementTimer, resizeObserver;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointAt = (level, distance) => {
    const position = Math.max(0, Math.min(level.path.length - 1, distance / CELL));
    const index = Math.min(level.path.length - 2, Math.floor(position));
    const progress = position - index, a = level.path[index], b = level.path[index + 1];
    return { x: (a.c + (b.c-a.c)*progress + .5)*CELL, y: (a.r + (b.r-a.r)*progress + .5)*CELL };
  };
  const distanceSq = (a,b) => (a.x-b.x)**2 + (a.y-b.y)**2;
  const towerAt = (c,r) => state && state.towers.find(t => t.c === c && t.r === r);
  const towerStats = tower => TOWERS[tower.type].stats[tower.level];
  const isPlaying = () => state && !['won','lost','abandoned'].includes(state.phase);
  function announce(text) {
    $('announcement').textContent = text;
    clearTimeout(announcementTimer);
    announcementTimer = setTimeout(() => { $('announcement').textContent = ''; }, 3800);
  }
  function icon(type) {
    const color = COLORS[type];
    const barrel = type === 'cannon' ? '<path d="M27 24 42 10" stroke="#0f172a" stroke-width="17" stroke-linecap="round"/><path d="M27 24 42 10" stroke="#ffcf89" stroke-width="10" stroke-linecap="round"/>' : type === 'frost' ? '<path d="M28 9v28M14 16l27 15M14 31l27-15" stroke="#e6fcff" stroke-width="4" stroke-linecap="round"/><circle cx="28" cy="23" r="5" fill="#429cc2"/>' : '<path d="M26 25 39 12" stroke="#0f172a" stroke-width="12" stroke-linecap="round"/><path d="M26 25 39 12" stroke="#e0ffb0" stroke-width="7" stroke-linecap="round"/>';
    return `<svg class="tower-icon" viewBox="0 0 56 56" aria-hidden="true"><path d="M10 42h36l-4-18H14Z" fill="#56748b" stroke="#0f172a" stroke-width="3"/><rect x="7" y="42" width="42" height="7" rx="3" fill="#0a1323"/><circle cx="28" cy="24" r="17" fill="${color}" stroke="#0f172a" stroke-width="3"/>${barrel}</svg>`;
  }
  function missionMap(level) {
    const points = level.path.map(p => `${34+p.c*27},${24+p.r*12}`).join(' ');
    const first = level.path[0], end = level.path[level.path.length-1];
    const towers = level.id === 0 ? [[3,2],[5,5],[3,6]] : level.id === 1 ? [[3,2],[6,4],[2,5]] : [[4,1],[5,3],[4,7]];
    return `<svg class="mission-preview" viewBox="0 0 285 147" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="grid${level.id}" width="27" height="12" patternUnits="userSpaceOnUse"><circle cx="7" cy="6" r=".7" fill="#456079" opacity=".5"/></pattern></defs><rect width="285" height="147" fill="url(#grid${level.id})"/><polyline points="${points}" fill="none" stroke="#365069" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${points}" fill="none" stroke="#91a9a3" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>${towers.map((t,i)=>`<circle cx="${34+t[0]*27}" cy="${24+t[1]*12}" r="8" fill="${Object.values(COLORS)[i]}" stroke="#0f172a" stroke-width="3"/>`).join('')}<circle cx="${34+first.c*27}" cy="${24+first.r*12}" r="7" fill="#ffae59" stroke="#0f172a" stroke-width="3"/><rect x="${27+end.c*27}" y="${16+end.r*12}" width="16" height="16" rx="4" fill="#a4efff" stroke="#0f172a" stroke-width="3"/></svg>`;
  }
  function renderMissions() {
    $('mission-progress').textContent = `${Object.values(save.best).filter(b => b.cleared).length} / 3 cleared`;
    $('mission-list').innerHTML = LEVELS.map(level => {
      const locked = level.id >= save.unlocked, best = save.best[level.id];
      const record = best ? (best.cleared ? `Cleared · best base ${best.lives} / 20 ♥` : `Best attempt · wave ${best.wave} / ${level.waves.length}`) : '';
      return `<button class="mission-card ${!locked ? 'active' : ''}" data-level="${level.id}" ${locked ? 'disabled' : ''} aria-label="${level.name}, ${level.waves.length} waves. ${locked ? `Locked. Clear ${LEVELS[level.id-1].name} first.` : `${record || 'Ready to play'}.`}">${missionMap(level)}<div class="mission-body"><div class="mission-meta"><span>MISSION 0${level.id+1}</span><span class="difficulty">${level.difficulty}</span></div><h3>${level.name}</h3><p>${level.subtitle}</p><div class="mission-bottom"><span>${locked ? `Clear ${LEVELS[level.id-1].name} first` : `${level.waves.length} waves · 20 lives`}</span><span class="mission-arrow">${locked ? '⌑' : '→'}</span></div>${record ? `<span class="mission-best">${record}</span>` : ''}</div></button>`;
    }).join('');
  }
  function renderShop() {
    $('tower-shop').innerHTML = Object.entries(TOWERS).map(([type,tower],i) => `<button class="tower-button" data-tower="${type}" style="--tower-color:${COLORS[type]}" aria-pressed="${type === selectedType && !selectedTower}" aria-label="${tower.name}, ${tower.cost} coins. ${tower.tagline}."><span class="tower-key">${i+1}</span>${icon(type)}<span class="tower-info"><strong>${tower.name}</strong><small>${tower.tagline}</small></span><span class="tower-cost">${tower.cost}<small>COINS</small></span></button>`).join('');
  }
  function startLevel(id) {
    if (!LEVELS[id] || id >= save.unlocked) return;
    wakeAudio();
    const level = LEVELS[id];
    state = { level, phase: 'build', paused: false, coins: level.coins, lives: level.lives, wave: 0, kills: 0, leaked: 0,
      towers: [], enemies: [], projectiles: [], particles: [], labels: [], spawnQueue: [], spawnTimer: 0, clock: 0, bossSpawned: 0, nextWaveDelay: 0 };
    selectedType = 'blaster'; selectedTower = null; hover = null; keyboardFocus = false;
    $('mission-screen').hidden = true; $('game-screen').hidden = false; document.body.classList.add('is-playing');
    $('level-title').textContent = level.name; $('level-number').textContent = `MISSION 0${id+1}`;
    $('mission-tip').textContent = level.tip; $('result-dialog').close();
    $('pause-cover').hidden = true; $('pause-button').textContent = 'Ⅱ'; $('pause-button').setAttribute('aria-label','Pause game');
    renderShop(); rebuildTileSelect(); updateUI(); resizeCanvas();
    window.scrollTo(0,0); $('start-wave-button').focus({ preventScroll: true });
    announce(`${level.name}. ${level.coins} coins. Build your crew, then start wave 1.`);
  }
  function showMissions() {
    if (state && isPlaying()) {
      recordProgress(false); state.phase = 'abandoned';
    }
    state = null; selectedTower = null; $('result-dialog').close();
    $('mission-screen').hidden = false; $('game-screen').hidden = true; document.body.classList.remove('is-playing');
    renderMissions(); window.scrollTo(0,0);
    $('mission-list').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  function selectType(type) {
    if (!TOWERS[type]) return;
    selectedType = type; selectedTower = null; renderShop(); updateSelection();
    if (state) announce(`${TOWERS[type].name} selected. ${TOWERS[type].cost} coins. Choose an empty square.`);
  }
  function activateTile(c,r) {
    if (!isPlaying()) return;
    if (state.paused) { announce('Resume the mission to build.'); return; }
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    const existing = towerAt(c,r);
    if (existing) {
      selectedTower = existing; renderShop(); updateSelection();
      announce(`${TOWERS[existing.type].name}, level ${existing.level+1}. ${existing.level === 2 ? 'Fully upgraded.' : `Upgrade costs ${TOWERS[existing.type].upgrades[existing.level]} coins.`}`);
      return;
    }
    if (state.level.pathSet.has(`${c},${r}`)) { announce('Keep the path clear! Choose a blue square.'); return; }
    const def = TOWERS[selectedType];
    if (state.coins < def.cost) { announce(`You need ${def.cost-state.coins} more coins for a ${def.name}. Towers earn coins by stopping bots.`); return; }
    wakeAudio(); state.coins -= def.cost;
    const tower = { id: nextId++, type: selectedType, c, r, x: (c+.5)*CELL, y: (r+.5)*CELL, level: 0, cooldown: .1, angle: -.8, recoil: 0, invested: def.cost };
    state.towers.push(tower); selectedTower = tower;
    burst(tower.x,tower.y,COLORS[tower.type],9); bleep('build');
    rebuildTileSelect(); renderShop(); updateUI();
    announce(`${def.name} built at row ${r+1}, column ${c+1}. ${state.coins} coins left.`);
  }
  function upgradeTower() {
    if (!isPlaying() || state.paused || !selectedTower || selectedTower.level >= 2) return;
    const def = TOWERS[selectedTower.type], cost = def.upgrades[selectedTower.level];
    if (state.coins < cost) { announce(`You need ${cost-state.coins} more coins to upgrade.`); return; }
    state.coins -= cost; selectedTower.invested += cost; selectedTower.level++;
    burst(selectedTower.x,selectedTower.y,COLORS[selectedTower.type],15); bleep('upgrade'); updateUI(); rebuildTileSelect();
    announce(`${def.name} upgraded to level ${selectedTower.level+1}${selectedTower.level === 2 ? '. Maximum power!' : '.'}`);
  }
  function sellTower() {
    if (!isPlaying() || state.paused || !selectedTower) return;
    const refund = Math.floor(selectedTower.invested * .65), name = TOWERS[selectedTower.type].name;
    state.coins += refund; state.towers = state.towers.filter(t => t !== selectedTower); selectedTower = null;
    bleep('coin'); renderShop(); rebuildTileSelect(); updateUI(); announce(`${name} recycled. ${refund} coins returned.`);
  }
  function startWave() {
    if (!state || state.phase !== 'build' || state.paused) return;
    wakeAudio();
    const level = state.level, row = level.waves[state.wave];
    if (!row) return;
    state.wave++; state.phase = 'wave'; state.spawnTimer = .35;
    state.spawnQueue = Array.from({ length: row[0] }, (_, i) => {
      const kind = level.armored && (i+1)%level.armored === 0 ? 'armored' : level.runners && (i+1)%level.runners === 0 ? 'runner' : 'bot';
      return { kind, hp: Math.round(row[1] * (kind === 'armored' ? 1.5 : kind === 'runner' ? .75 : 1)), speed: row[2] * (kind === 'runner' ? 1.4 : kind === 'armored' ? .8 : 1), reward: row[4], spacing: row[3] };
    });
    if (level.boss && state.wave === level.waves.length) state.spawnQueue.push({ kind: 'boss', ...level.boss, spacing: 1.8 });
    updateUI(); bleep('wave'); announce(`Wave ${state.wave}! ${row[0]} bots${level.boss && state.wave === level.waves.length ? ' and one big boss' : ''} incoming.`);
  }
  function spawnEnemy(spec) {
    const start = pointAt(state.level,0);
    state.enemies.push({ id: nextId++, kind: spec.kind, hp: spec.hp, maxHp: spec.hp, speed: spec.speed, reward: spec.reward, distance: 0, ...start, slow: 1, slowTime: 0, flash: 0, wobble: nextId*.7 });
    if (spec.kind === 'boss') { state.bossSpawned++; announce('The big boss is here! Your crew has got this.'); bleep('cannon'); }
  }
  function togglePause(force) {
    if (!isPlaying()) return;
    state.paused = typeof force === 'boolean' ? force : !state.paused;
    $('pause-cover').hidden = !state.paused; $('pause-button').textContent = state.paused ? '▶' : 'Ⅱ';
    $('pause-button').setAttribute('aria-label', state.paused ? 'Resume game' : 'Pause game');
    $('pause-button').title = state.paused ? 'Resume game' : 'Pause game'; updateUI();
    if (state.paused) $('resume-button').focus({ preventScroll: true });
    else { wakeAudio(); $('pause-button').focus({ preventScroll: true }); }
  }
  function recordProgress(won) {
    const id = state.level.id, previous = save.best[id] || { cleared: false, wave: 0, lives: 0, kills: 0 };
    save.best[id] = { cleared: previous.cleared || won, wave: Math.max(previous.wave,state.wave), lives: Math.max(previous.lives,won ? state.lives : 0), kills: Math.max(previous.kills,state.kills) };
    if (won) save.unlocked = Math.max(save.unlocked,Math.min(3,id+2));
    persist(); renderMissions();
  }
  function finish(won) {
    if (!isPlaying()) return;
    state.phase = won ? 'won' : 'lost'; state.paused = false;
    recordProgress(won); bleep(won ? 'win' : 'lose'); updateUI();
    const finalMission = state.level.id === LEVELS.length-1;
    $('result-art').textContent = won ? '✦' : '♡';
    $('result-eyebrow').textContent = won ? 'MISSION COMPLETE' : 'THE CREW IS READY TO TRY AGAIN';
    $('result-title').textContent = won ? (finalMission ? 'Space heroes, all of you!' : 'Base safe. Crew happy!') : 'A little practice. A big comeback.';
    $('result-description').textContent = won ? (finalMission ? 'All three missions cleared! Your little crew made a very big difference.' : `${state.level.name} is safe. ${LEVELS[state.level.id+1].name} is now ready to explore.`) : 'The bots slipped through this time. Try towers near the bends, and team up Frost with a Blaster. You can jump right back in.';
    $('result-stats').innerHTML = `<span><strong>${won ? state.lives : state.wave}</strong>${won ? 'base lives left' : 'wave reached'}</span><span><strong>${state.kills}</strong>bots stopped</span>`;
    $('result-next').hidden = !won || finalMission;
    $('result-retry').textContent = won ? 'Play this mission again' : 'Try again →';
    $('result-retry').className = won && !finalMission ? 'secondary-button' : 'primary-button';
    $('result-dialog').showModal();
    (won && !finalMission ? $('result-next') : $('result-retry')).focus();
  }
  function burst(x,y,color,count) {
    if (!state || reducedMotion) return;
    for (let i=0;i<count;i++) {
      const angle = (Math.PI*2*i/count) + state.clock;
      state.particles.push({ x,y,vx:Math.cos(angle)*(35+(i%3)*22),vy:Math.sin(angle)*(35+(i%3)*22),life:.35+(i%3)*.08,maxLife:.5,color,size:2+(i%2) });
    }
  }
  function hitEnemy(enemy,damage,stats) {
    if (enemy.hp <= 0) return;
    enemy.hp -= damage; enemy.flash = .08;
    if (stats.slow) {
      enemy.slow = Math.min(enemy.slow,stats.slow); enemy.slowTime = Math.max(enemy.slowTime,stats.duration);
    }
    if (enemy.hp <= 0) {
      state.coins += enemy.reward; state.kills++; uiDirty = true;
      burst(enemy.x,enemy.y,enemy.kind === 'boss' ? '#ffe69b' : '#ffae59',enemy.kind === 'boss' ? 24 : 7);
      state.labels.push({ x:enemy.x,y:enemy.y-15,text:`+${enemy.reward}`,life:.8,color:'#ffd46b' }); bleep('coin');
    }
  }
  function update(dt) {
    if (!isPlaying() || state.paused) return;
    state.clock += dt;
    for (const p of state.particles) { p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; }
    state.particles = state.particles.filter(p=>p.life>0);
    for (const label of state.labels) { label.y-=22*dt; label.life-=dt; }
    state.labels = state.labels.filter(label=>label.life>0);
    state.towers.forEach(t=>{ t.recoil=Math.max(0,t.recoil-dt*6); });
    if (state.phase !== 'wave') return;
    state.spawnTimer -= dt;
    if (state.spawnQueue.length && state.spawnTimer <= 0) {
      const spec = state.spawnQueue.shift(); spawnEnemy(spec);
      state.spawnTimer += state.spawnQueue[0]?.kind === 'boss' ? 2 : spec.spacing;
    }
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.flash = Math.max(0,enemy.flash-dt);
      enemy.slowTime = Math.max(0,enemy.slowTime-dt);
      if (!enemy.slowTime) enemy.slow=1;
      enemy.distance += enemy.speed*enemy.slow*dt;
      Object.assign(enemy,pointAt(state.level,enemy.distance));
      if (enemy.distance >= state.level.length) {
        enemy.hp = 0; enemy.leaked = true; state.lives--; state.leaked++; uiDirty = true;
        burst(enemy.x,enemy.y,'#ef535d',8); bleep('leak');
        if (state.lives <= 0) { state.enemies = state.enemies.filter(e=>e.hp>0); finish(false); return; }
      }
    }
    for (const tower of state.towers) {
      tower.cooldown -= dt;
      const stats = towerStats(tower);
      let target = null;
      for (const enemy of state.enemies) {
        if (enemy.hp>0 && distanceSq(tower,enemy)<=stats.range**2 && (!target || enemy.distance>target.distance)) target=enemy;
      }
      if (target) {
        tower.angle = Math.atan2(target.y-tower.y,target.x-tower.x);
        if (tower.cooldown<=0) {
          tower.cooldown = stats.cooldown; tower.recoil=1;
          state.projectiles.push({ x:tower.x+Math.cos(tower.angle)*18,y:tower.y+Math.sin(tower.angle)*18,target,targetX:target.x,targetY:target.y,type:tower.type,stats,speed:tower.type==='cannon'?310:480 });
          bleep(tower.type==='blaster'?'shot':tower.type);
        }
      } else tower.cooldown=Math.max(0,tower.cooldown);
    }
    for (const shot of state.projectiles) {
      if (shot.target.hp>0) { shot.targetX=shot.target.x; shot.targetY=shot.target.y; }
      const dx=shot.targetX-shot.x,dy=shot.targetY-shot.y,dist=Math.hypot(dx,dy);
      if (dist<=shot.speed*dt+5) {
        shot.done=true;
        if (shot.stats.splash) {
          burst(shot.targetX,shot.targetY,'#ffcc7b',12);
          for (const enemy of state.enemies) if (enemy.hp>0 && (enemy.x-shot.targetX)**2+(enemy.y-shot.targetY)**2<=shot.stats.splash**2) hitEnemy(enemy,shot.stats.damage,shot.stats);
        } else if (shot.target.hp>0) hitEnemy(shot.target,shot.stats.damage,shot.stats);
      } else { shot.x+=dx/dist*shot.speed*dt; shot.y+=dy/dist*shot.speed*dt; }
    }
    state.projectiles=state.projectiles.filter(p=>!p.done);
    state.enemies=state.enemies.filter(e=>e.hp>0);
    if (!state.spawnQueue.length && !state.enemies.length) {
      state.projectiles=[];
      if (state.wave===state.level.waves.length) finish(true);
      else {
        state.phase='build'; state.coins+=15; recordProgress(false); uiDirty=true;
        announce(`Wave ${state.wave} cleared! +15 teamwork coins. Build or upgrade, then start the next wave.`); bleep('upgrade');
      }
    }
  }

  function rebuildTileSelect() {
    if (!state) return;
    const previous = $('tile-select').value;
    $('tile-select').innerHTML = Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=> {
      if (state.level.pathSet.has(`${c},${r}`)) return '';
      const tower=towerAt(c,r);
      return `<option value="${c},${r}">Row ${r+1}, column ${c+1}${tower?` · ${TOWERS[tower.type].name} L${tower.level+1}`:' · empty'}</option>`;
    }).join('')).join('');
    if ([...$('tile-select').options].some(o=>o.value===previous)) $('tile-select').value=previous;
  }
  function updateSelection() {
    const panel = $('selection-panel');
    panel.classList.toggle('has-tower',!!selectedTower);
    $('upgrade-controls').hidden = !selectedTower;
    if (selectedTower) {
      const def=TOWERS[selectedTower.type],stats=towerStats(selectedTower),max=selectedTower.level===2;
      $('selection-name').textContent=def.name; $('selection-badge').textContent=`LEVEL ${selectedTower.level+1} / 3`;
      $('selection-description').textContent=max?'Maximum power. A very proud member of your crew.':`Upgrade for stronger ${selectedTower.type==='frost'?'slowing and longer range':'shots and longer range'}.`;
      $('tower-stats').textContent=`${stats.damage} damage · ${(1/stats.cooldown).toFixed(1)} shots/sec${stats.splash?' · splash':stats.slow?` · ${Math.round((1-stats.slow)*100)}% slow`:''}`;
      const cost=def.upgrades[selectedTower.level];
      $('upgrade-button').textContent=max?'Fully upgraded':`Upgrade · ${cost} coins`;
      $('upgrade-button').disabled=max || state.coins<cost || state.paused || !isPlaying();
      $('sell-button').textContent=`Recycle +${Math.floor(selectedTower.invested*.65)}`;
      $('sell-button').disabled=state.paused || !isPlaying();
    } else {
      $('selection-name').textContent=`${TOWERS[selectedType].name} selected`; $('selection-badge').textContent='BUILD';
      $('selection-description').textContent=TOWERS[selectedType].description;
    }
  }
  function updateUI() {
    if (!state) return;
    $('lives-value').innerHTML=`${state.lives} <em>/ 20</em>`; $('coins-value').textContent=state.coins;
    $('wave-value').innerHTML=`${state.wave} <em>/ ${state.level.waves.length}</em>`;
    $('start-wave-button').disabled=state.phase!=='build'||state.paused;
    const next=state.level.waves[state.wave];
    $('start-wave-label').textContent=state.paused?'Mission paused':state.phase==='wave'?`Wave ${state.wave} in progress`:state.phase==='won'?'Base protected!':state.phase==='lost'?'Ready for a fresh start':`Start wave ${state.wave+1}`;
    $('next-wave-label').textContent=state.paused?'Resume whenever you’re ready':state.phase==='wave'?`${state.enemies.length+state.spawnQueue.length} bots remaining`:next?`${next[0]} bots incoming${state.level.boss&&state.wave===19?' + big boss':''}`:'Great teamwork, commander';
    $('board-status').textContent=state.paused?'PAUSED · TAKE YOUR TIME':state.phase==='wave'?`WAVE ${state.wave} · PROTECT YOUR BASE`:state.phase==='build'?'BUILD PHASE · MAKE YOUR PLAN':state.phase==='won'?'MISSION COMPLETE · NICE TEAMWORK':'THE CREW BELIEVES IN YOU';
    updateSelection(); uiDirty=false;
  }

  function roundRect(x,y,w,h,r,fill,stroke,line=1) {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r); if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
  }
  function circle(x,y,r,fill,stroke,line=1) {
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
  }
  function drawBase(x,y) {
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#07132166';ctx.beginPath();ctx.ellipse(0,19,30,12,0,0,Math.PI*2);ctx.fill();
    roundRect(-25,-22,50,45,9,'#557e91','#0b1b2a',3);
    roundRect(-27,-24,54,14,5,'#91b3bf','#0b1b2a',3);
    roundRect(-16,-4,32,20,6,'#a4efff','#0b1b2a',3);
    ctx.strokeStyle='#4c9ca8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,12);ctx.moveTo(-6,6);ctx.lineTo(6,6);ctx.stroke();
    ctx.strokeStyle='#9cb8ca';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-23);ctx.lineTo(0,-34);ctx.stroke();circle(0,-36,4,'#bef264');
    roundRect(-25,17,8,9,2,'#bef264');roundRect(17,17,8,9,2,'#bef264');ctx.restore();
  }
  function drawTower(tower) {
    const color=COLORS[tower.type], recoil=tower.recoil*3;
    ctx.save();ctx.translate(tower.x,tower.y);
    ctx.fillStyle='#07132166';ctx.beginPath();ctx.ellipse(0,16,25,10,0,0,Math.PI*2);ctx.fill();
    roundRect(-22,-12,44,35,9,'#45667d','#0b1b2a',3);roundRect(-24,17,48,8,4,'#0b1b2a');
    circle(0,-2,19,color,'#0b1b2a',3);circle(-5,-8,7,'#ffffff20');
    if(tower.type==='frost'){
      ctx.strokeStyle='#e6fcff';ctx.lineWidth=3;ctx.lineCap='round';
      for(let i=0;i<3;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*13,Math.sin(a)*13-2);ctx.lineTo(-Math.cos(a)*13,-Math.sin(a)*13-2);ctx.stroke();}
      circle(0,-2,5,'#4b9fbc');
    }else{
      ctx.save();ctx.rotate(tower.angle);roundRect(1-recoil,-(tower.type==='cannon'?8:6),29,tower.type==='cannon'?16:12,4,'#0b1b2a');roundRect(4-recoil,-(tower.type==='cannon'?5:3),24,tower.type==='cannon'?10:6,2,tower.type==='cannon'?'#ffcf89':'#ddffa5');ctx.restore();
    }
    for(let i=0;i<=tower.level;i++)circle((i-tower.level/2)*8,19,2.3,color);
    if(selectedTower===tower){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.strokeRect(-27,-28,54,56);ctx.setLineDash([]);}
    ctx.restore();
  }
  function drawEnemy(enemy) {
    const big=enemy.kind==='boss', scale=big?1.6:enemy.kind==='armored'?1.1:.85;
    const bob=reducedMotion?0:Math.sin(state.clock*11+enemy.wobble)*1.5;
    ctx.save();ctx.translate(enemy.x,enemy.y+bob);ctx.scale(scale,scale);
    ctx.fillStyle='#09142444';ctx.beginPath();ctx.ellipse(0,18,18,6,0,0,Math.PI*2);ctx.fill();
    const color=enemy.flash?'#fff7cc':enemy.slowTime?'#a6dcef':big?'#f69464':enemy.kind==='armored'?'#b7a1a0':enemy.kind==='runner'?'#ffd179':'#ffae59';
    const legMove=reducedMotion?0:Math.sin(state.clock*13+enemy.wobble)*3;
    roundRect(-12,9+legMove,8,12,3,'#172638');roundRect(4,9-legMove,8,12,3,'#172638');
    roundRect(-19,-14,38,32,9,color,'#132537',3);
    if(enemy.kind==='armored')roundRect(-21,-17,42,8,3,'#637788','#132537',2);
    roundRect(-14,-6,28,12,5,'#173040','#132537',2);
    roundRect(-9,-3,4,6,1,'#baf7ff');roundRect(5,-3,4,6,1,'#baf7ff');
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(0,-22);ctx.stroke();circle(0,-23,3,big?'#bef264':'#ef535d');
    if(big){ctx.fillStyle='#ffe697';ctx.beginPath();ctx.moveTo(-12,-18);ctx.lineTo(-15,-30);ctx.lineTo(-4,-25);ctx.lineTo(0,-34);ctx.lineTo(5,-25);ctx.lineTo(15,-30);ctx.lineTo(12,-18);ctx.fill();}
    if(enemy.kind==='runner'){ctx.strokeStyle='#f5eac4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-23,-1);ctx.lineTo(-28,-1);ctx.moveTo(-22,6);ctx.lineTo(-26,6);ctx.stroke();}
    if(enemy.hp<enemy.maxHp || big){roundRect(-20,-37,40,5,2,'#0c1929');roundRect(-19,-36,38*Math.max(0,enemy.hp/enemy.maxHp),3,1,enemy.slowTime?'#a4efff':'#bef264');}
    ctx.restore();
  }
  function draw() {
    if(!state)return;
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    ctx.fillStyle='#142a3e';ctx.fillRect(0,0,WIDTH,HEIGHT);
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const path=state.level.pathSet.has(`${c},${r}`);
      if(!path){roundRect(c*CELL+3,r*CELL+3,CELL-6,CELL-6,7,(c+r)%2?'#1b3449':'#193146');
        circle(c*CELL+9,r*CELL+9,1.1,'#496074');
        if((c*7+r*11)%19===0&&!towerAt(c,r)){roundRect(c*CELL+32,r*CELL+33,12,7,3,'#263f52');roundRect(c*CELL+25,r*CELL+40,8,5,2,'#29485b');}
      }
    }
    // One continuous route, shared by drawing and movement.
    ctx.beginPath();state.level.path.forEach((p,i)=>{const x=(p.c+.5)*CELL,y=(p.r+.5)*CELL;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#607d80';ctx.lineWidth=49;ctx.stroke();ctx.strokeStyle='#b9c8ac';ctx.lineWidth=42;ctx.stroke();
    ctx.strokeStyle='#9ba98f';ctx.lineWidth=2;ctx.setLineDash([3,12]);ctx.stroke();ctx.setLineDash([]);
    const first=state.level.path[0];
    circle((first.c+.5)*CELL,(first.r+.5)*CELL,21,'#263747','#ffae59',3);circle((first.c+.5)*CELL,(first.r+.5)*CELL,12,'#e88d4450');
    ctx.fillStyle='#ffd4a2';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText('›',(first.c+.5)*CELL,(first.r+.5)*CELL+6);
    const end=state.level.path[state.level.path.length-1];drawBase((end.c+.5)*CELL,(end.r+.5)*CELL);
    if(selectedTower){const stats=towerStats(selectedTower);circle(selectedTower.x,selectedTower.y,stats.range,`${COLORS[selectedTower.type]}0c`,`${COLORS[selectedTower.type]}4d`,1.5);}
    const tile=keyboardFocus?keyboardTile:hover;
    if(tile && isPlaying() && !state.paused){
      const valid=!state.level.pathSet.has(`${tile.c},${tile.r}`),existing=towerAt(tile.c,tile.r);
      roundRect(tile.c*CELL+4,tile.r*CELL+4,52,52,7,valid?'#bef26416':'#ef535d20',valid?'#bef264':'#ef535d',2);
      if(valid&&!existing&&!selectedTower)circle((tile.c+.5)*CELL,(tile.r+.5)*CELL,TOWERS[selectedType].stats[0].range,'#bef26408','#bef26433',1);
    }
    state.towers.forEach(drawTower);
    [...state.enemies].sort((a,b)=>a.y-b.y).forEach(drawEnemy);
    for(const p of state.projectiles){circle(p.x,p.y,p.type==='cannon'?5:p.type==='frost'?4:3,COLORS[p.type]);circle(p.x,p.y,p.type==='cannon'?2:1.5,'#fffbe8');}
    for(const p of state.particles){ctx.globalAlpha=Math.min(1,p.life/p.maxLife);roundRect(p.x,p.y,p.size,p.size,1,p.color);}
    ctx.globalAlpha=1;ctx.font='bold 14px system-ui';ctx.textAlign='center';
    for(const label of state.labels){ctx.globalAlpha=Math.min(1,label.life*2);ctx.fillStyle=label.color;ctx.fillText(label.text,label.x,label.y);}
    ctx.globalAlpha=1;
    // Tiny friendly crew on a safe corner of every map.
    drawCrew(31,HEIGHT-42);
  }
  function drawCrew(x,y){
    ctx.save();ctx.translate(x,y);const bob=reducedMotion?0:Math.sin(state.clock*2)*1.2;ctx.translate(0,bob);
    roundRect(-15,-4,8,18,3,'#c73955','#102338',2);roundRect(-10,-15,25,33,10,'#ef535d','#102338',2);roundRect(-10,11,9,13,3,'#ef535d','#102338',2);roundRect(6,11,9,13,3,'#ef535d','#102338',2);roundRect(-1,-9,21,13,6,'#a4efff','#102338',2);roundRect(3,-6,10,3,1,'#fff');ctx.restore();
  }
  function resizeCanvas(){
    const ratio=Math.min(window.devicePixelRatio||1,3);
    const targetWidth=Math.round(WIDTH*ratio),targetHeight=Math.round(HEIGHT*ratio);
    if(canvas.width!==targetWidth||canvas.height!==targetHeight){canvas.width=targetWidth;canvas.height=targetHeight;}
    ctx.setTransform(ratio,0,0,ratio,0,0);draw();
  }
  let lastUIRefresh=0;
  function frame(time){
    const dt=lastFrame?Math.min((time-lastFrame)/1000,.05):0;lastFrame=time;
    if(state){update(dt);draw();if(uiDirty||time-lastUIRefresh>250){updateUI();lastUIRefresh=time;}}
    requestAnimationFrame(frame);
  }

  $('mission-list').addEventListener('click',event=>{const button=event.target.closest('[data-level]');if(button&&!button.disabled)startLevel(Number(button.dataset.level));});
  $('tower-shop').addEventListener('click',event=>{const button=event.target.closest('[data-tower]');if(button){wakeAudio();selectType(button.dataset.tower);}});
  const pointerTile=event=>{const rect=canvas.getBoundingClientRect();return{c:Math.floor((event.clientX-rect.left)/rect.width*COLS),r:Math.floor((event.clientY-rect.top)/rect.height*ROWS)};};
  canvas.addEventListener('click',event=>{const{c,r}=pointerTile(event);keyboardTile={c,r};keyboardFocus=false;activateTile(c,r);});
  canvas.addEventListener('pointermove',event=>{if(event.pointerType==='mouse')hover=pointerTile(event);});
  canvas.addEventListener('pointerleave',()=>hover=null);
  canvas.addEventListener('focus',()=>{keyboardFocus=true;});canvas.addEventListener('blur',()=>{keyboardFocus=false;});
  canvas.addEventListener('keydown',event=>{
    const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(moves[event.key]){event.preventDefault();keyboardFocus=true;keyboardTile.c=Math.max(0,Math.min(COLS-1,keyboardTile.c+moves[event.key][0]));keyboardTile.r=Math.max(0,Math.min(ROWS-1,keyboardTile.r+moves[event.key][1]));const t=towerAt(keyboardTile.c,keyboardTile.r);announce(`Row ${keyboardTile.r+1}, column ${keyboardTile.c+1}: ${t?TOWERS[t.type].name:state.level.pathSet.has(`${keyboardTile.c},${keyboardTile.r}`)?'bot path':'empty build square'}.`);}
    if(event.key==='Enter'){event.preventDefault();activateTile(keyboardTile.c,keyboardTile.r);}
  });
  document.addEventListener('keydown',event=>{
    if(!isPlaying()||event.altKey||event.ctrlKey||event.metaKey||event.repeat||$('result-dialog').open)return;
    const tag=event.target.tagName;
    if(['INPUT','SELECT','TEXTAREA'].includes(tag))return;
    if(['1','2','3'].includes(event.key)){event.preventDefault();selectType(Object.keys(TOWERS)[Number(event.key)-1]);}
    if(event.code==='Space'&&!['BUTTON','SUMMARY'].includes(tag)){event.preventDefault();startWave();}
    if(event.key.toLowerCase()==='p'){event.preventDefault();togglePause();}
    if(event.key==='Escape'&&!state.paused){selectedTower=null;renderShop();updateSelection();}
  });
  $('tile-action').addEventListener('click',()=>{const[c,r]=$('tile-select').value.split(',').map(Number);activateTile(c,r);});
  $('tile-select').addEventListener('change',()=>{const[c,r]=$('tile-select').value.split(',').map(Number);keyboardTile={c,r};keyboardFocus=true;$('tile-description').textContent=`Row ${r+1}, column ${c+1}. ${towerAt(c,r)?'Select to inspect this tower.':`Select to build a ${TOWERS[selectedType].name}.`}`;});
  $('upgrade-button').addEventListener('click',upgradeTower);$('sell-button').addEventListener('click',sellTower);
  $('start-wave-button').addEventListener('click',startWave);$('pause-button').addEventListener('click',()=>togglePause());$('resume-button').addEventListener('click',()=>togglePause(false));
  $('missions-button').addEventListener('click',showMissions);$('result-missions').addEventListener('click',showMissions);
  $('result-retry').addEventListener('click',()=>startLevel(state.level.id));$('result-next').addEventListener('click',()=>startLevel(state.level.id+1));
  $('result-dialog').addEventListener('cancel',event=>{event.preventDefault();showMissions();});
  function updateSoundButton(){
    for(const id of ['sound-button','game-sound-button']){
      $(id).textContent=save.sound?'♫':'♪';$(id).setAttribute('aria-pressed',String(save.sound));$(id).setAttribute('aria-label',save.sound?'Turn sound off':'Turn sound on');$(id).title=save.sound?'Sound on':'Sound off';
    }
  }
  for(const id of ['sound-button','game-sound-button'])$(id).addEventListener('click',()=>{save.sound=!save.sound;persist();updateSoundButton();if(save.sound){wakeAudio();bleep('build');}announce(save.sound?'Sound on.':'Sound off.');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&isPlaying())togglePause(true);lastFrame=0;});
  window.addEventListener('resize',resizeCanvas);
  if('ResizeObserver'in window){resizeObserver=new ResizeObserver(resizeCanvas);resizeObserver.observe(canvas);}
  function updateOfflineStatus(ready=false){const pill=$('offline-status');pill.lastChild.textContent=!navigator.onLine?' Offline crew':ready?' Ready offline':' On your device';}
  let offlineReady=false;
  window.addEventListener('online',()=>updateOfflineStatus(offlineReady));window.addEventListener('offline',()=>updateOfflineStatus(offlineReady));
  if('serviceWorker'in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{offlineReady=true;updateOfflineStatus(true);}).catch(()=>{updateOfflineStatus(false);}));
  }
  renderMissions();renderShop();updateSoundButton();updateOfflineStatus();resizeCanvas();requestAnimationFrame(frame);

  // Opt-in deterministic test harness. Absent on normal game URLs; never shown in the UI.
  if(new URLSearchParams(location.search).has('test')){
    window.__crewmateTest={
      levels:LEVELS,towers:TOWERS,
      snapshot:()=>state?{level:state.level.id,phase:state.phase,paused:state.paused,coins:state.coins,lives:state.lives,wave:state.wave,kills:state.kills,leaked:state.leaked,bossSpawned:state.bossSpawned,enemies:state.enemies.map(e=>({...e})),towers:state.towers.map(t=>({...t})),queue:state.spawnQueue.length,save:JSON.parse(JSON.stringify(save))}:{save:JSON.parse(JSON.stringify(save))},
      step:seconds=>{for(let t=0;t<seconds;t+=.02)update(Math.min(.02,seconds-t));updateUI();draw();},
      startLevel,startWave,selectType,activateTile,upgradeTower,sellTower,togglePause,
      inspect:()=>state
    };
  }
})();
