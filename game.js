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
    ], branches: {
      gatling: { name: 'Gatling', cost: 110, hint: 'Twin barrels. Faster shots, lighter hits.', emblem: 'Ⅱ', stats: { damage: 18, cooldown: .2, range: 155 } },
      longshot: { name: 'Longshot', cost: 125, hint: 'A long barrel. Heavy hits from far away.', emblem: '⌖', stats: { damage: 55, cooldown: .8, range: 235 } }
    } },
    cannon: { name: 'Cannon', cost: 80, tagline: 'A big splash', description: 'Slow, powerful shots splash every bot nearby. Best for bunches of bots.', upgrades: [65, 95], stats: [
      { damage: 22, cooldown: 1.5, range: 145, splash: 65 }, { damage: 36, cooldown: 1.35, range: 158, splash: 73 }, { damage: 58, cooldown: 1.2, range: 172, splash: 82 }
    ], branches: {
      bigsplash: { name: 'Big Splash', cost: 135, hint: 'A wide bell barrel. Extra-wide splash.', emblem: '◎', stats: { damage: 62, cooldown: 1.25, splash: 125 } },
      cluster: { name: 'Cluster', cost: 145, hint: 'Three pods. Each impact adds 3 mini-blasts.', emblem: '⁙', stats: { damage: 42, cooldown: 1.35, splash: 60, cluster: { count: 3, damage: 22, radius: 48, offset: 44 } } }
    } },
    frost: { name: 'Frost', cost: 65, tagline: 'Chill them out', description: 'Chilly shots slow bots so your other towers have more time to help.', upgrades: [55, 85], stats: [
      { damage: 3, cooldown: .85, range: 130, slow: .52, duration: 1.7 }, { damage: 6, cooldown: .75, range: 144, slow: .43, duration: 1.9 }, { damage: 10, cooldown: .65, range: 158, slow: .34, duration: 2.1 }
    ], branches: {
      blizzard: { name: 'Blizzard', cost: 125, hint: 'A snow halo. Pulses slow every bot in range.', emblem: '◉', stats: { damage: 3, cooldown: 1.1, range: 158, slow: .48, duration: 1.4, aura: true } },
      deepfreeze: { name: 'Deep Freeze', cost: 130, hint: 'An ice crystal. Every 3rd hit freezes briefly.', emblem: '◆', stats: { damage: 12, cooldown: .65, freezeEvery: 3, freezeDuration: .65 } }
    } }
  };
  // Silhouettes and accessories are deliberate: enemy identity never relies on color.
  const ENEMY_KINDS = {
    basic: { id: 'basic', renderScale: 0.85, name: 'Basic', hp: 26, speed: 46, reward: 8, hint: 'Steady little footsteps.', shape: 'capsule', accessory: 'antenna', renderer: drawKindSilhouette },
    scout: { id: 'scout', renderScale: 0.65, name: 'Scout', hp: 22, speed: 72, reward: 8, hint: 'Light and quick, with a radar dish.', shape: 'triangle', accessory: 'dish', renderer: drawKindSilhouette },
    bulky: { id: 'bulky', renderScale: 0.95, name: 'Bulky', hp: 95, speed: 34, reward: 12, hint: 'Slow, wide, and hard to stop.', shape: 'wide', accessory: 'shoulders', renderer: drawKindSilhouette },
    runner: { id: 'runner', renderScale: 0.8, name: 'Runner', hp: 35, speed: 78, reward: 8, hint: 'Long legs carry it quickly.', shape: 'tall', accessory: 'legs', renderer: drawKindSilhouette },
    zipper: { id: 'zipper', renderScale: 0.55, name: 'Zipper', hp: 18, speed: 125, reward: 5, packSize: 3, hint: 'Tiny darts race in tight trios.', shape: 'dart', accessory: 'fins', renderer: drawKindSilhouette },
    plated: { id: 'plated', renderScale: 0.85, name: 'Plated', hp: 82, speed: 48, reward: 11, armor: 3, hint: 'A front shield softens each hit.', shape: 'hexagon', accessory: 'shield', renderer: drawKindSilhouette },
    armored: { id: 'armored', renderScale: 0.9, name: 'Armored', hp: 100, speed: 50, reward: 12, armor: 5, hint: 'Square armor shrugs off small hits.', shape: 'square', accessory: 'rivets', renderer: drawKindSilhouette },
    splitter: { id: 'splitter', renderScale: 0.85, name: 'Splitter', hp: 72, speed: 60, reward: 9, onDeathSplit: { kind: 'mini', count: 2 }, hint: 'Twin shells split into two minis.', shape: 'double', accessory: 'seam', renderer: drawKindSilhouette },
    mini: { id: 'mini', renderScale: 0.6, name: 'Mini', hp: 16, speed: 90, reward: 2, hint: 'A small diamond. Never splits again.', shape: 'diamond', accessory: 'stub', renderer: drawKindSilhouette },
    swarmer: { id: 'swarmer', renderScale: 0.65, name: 'Swarmer', hp: 17, speed: 95, reward: 4, packSize: 4, hint: 'Round bots bustle in dense packs.', shape: 'round', accessory: 'feelers', renderer: drawKindSilhouette },
    boss: { id: 'boss', renderScale: 1.35, name: 'Big Boss', hp: 3200, speed: 28, reward: 80, hint: 'One giant crowned visitor. The finale!', shape: 'giant', accessory: 'crown', renderer: drawKindSilhouette }
  };
  // Explicit groups count individual bots, not packs. packSize controls their spacing.
  // HP scales by wave; boss stats are always taken unchanged from the registry.
  const wave = (hpScale, spacing, groups) => ({ hpScale, groups: groups.map(([kind,count]) => ({ kind, count, spacing })) });
  const LEVELS = [
    { id: 0, name: 'First Stand', subtitle: 'A quiet moon. Your first brave stand.', difficulty: 'NICE & GENTLE', coins: 140, lives: 20,
      theme: { bgTint: '#142a3e', tileA: '#193146', tileB: '#1b3449', pathColor: '#b9c8ac', pathBorder: '#607d80', decorSet: ['crater','rock','stars'] },
      corners: [[0,1],[6,1],[6,4],[2,4],[2,7],[8,7]],
      tip: 'Scouts arrive in wave 4; the big, slow Bulky bots join in wave 7.',
      waves: [
        wave(1,1.2,[['basic',4]]), wave(1.15,1.1,[['basic',5]]), wave(1.35,1.05,[['basic',6]]),
        wave(1.5,1,[['basic',5],['scout',2]]), wave(1.7,.95,[['basic',5],['scout',3]]),
        wave(2,.9,[['basic',5],['scout',4]]), wave(2.2,.85,[['basic',5],['scout',3],['bulky',2]]),
        wave(2.45,.8,[['basic',5],['scout',4],['bulky',2]]), wave(2.75,.75,[['basic',5],['scout',4],['bulky',3]]),
        wave(3,.7,[['basic',5],['scout',5],['bulky',4]])
      ] },
    { id: 1, name: 'Winding Way', subtitle: 'A green world. A quicker kind of trouble.', difficulty: 'PICKING UP PACE', coins: 160, lives: 20,
      theme: { bgTint: '#1d443c', tileA: '#285342', tileB: '#2c5946', pathColor: '#c6b58b', pathBorder: '#746d50', decorSet: ['tree','bush','flower','pond'] },
      corners: [[0,1],[7,1],[7,3],[1,3],[1,6],[7,6],[7,8],[8,8]],
      tip: 'Zippers race in tight trios. Plated bots arrive in wave 8. Splash and Frost make a fine team.',
      waves: [
        wave(1,1,[['runner',5]]), wave(1.15,.95,[['runner',6]]), wave(1.3,.9,[['runner',4],['zipper',3]]),
        wave(1.45,.85,[['runner',5],['zipper',3]]), wave(1.6,.8,[['runner',4],['zipper',6]]),
        wave(1.75,.78,[['runner',5],['zipper',6]]), wave(1.9,.75,[['runner',6],['zipper',6]]),
        wave(2.05,.72,[['runner',5],['zipper',6],['plated',2]]), wave(2.2,.7,[['runner',6],['zipper',6],['plated',3]]),
        wave(2.35,.68,[['runner',6],['zipper',9],['plated',3]]), wave(2.5,.65,[['runner',7],['zipper',9],['plated',4]]),
        wave(2.65,.62,[['runner',8],['zipper',9],['plated',4]]), wave(2.8,.6,[['runner',8],['zipper',12],['plated',5]]),
        wave(3,.57,[['runner',9],['zipper',12],['plated',5]]), wave(3.2,.55,[['runner',10],['zipper',12],['plated',6]])
      ] },
    { id: 2, name: 'Bot Flood', subtitle: 'Dusk falls. A very big visitor is on the way.', difficulty: 'THE BIG CHALLENGE', coins: 180, lives: 20,
      theme: { bgTint: '#403029', tileA: '#4e3b2e', tileB: '#554132', pathColor: '#302e30', pathBorder: '#9c6b49', decorSet: ['glowrock','twistedtree','ember'] },
      corners: [[0,0],[6,0],[6,2],[2,2],[2,4],[7,4],[7,6],[1,6],[1,8],[8,8]],
      tip: 'Splitters leave two minis behind. Pick a tower specialization after its two upgrades.',
      boss: { hp: 3200, speed: 28, reward: 80 },
      waves: [
        wave(.8,.95,[['runner',4],['armored',2]]), wave(.9,.9,[['runner',5],['armored',2]]),
        wave(1,.85,[['runner',4],['armored',2],['splitter',2]]), wave(1.15,.8,[['runner',4],['armored',3],['splitter',2]]),
        wave(1.3,.75,[['runner',4],['armored',2],['swarmer',8]]), wave(1.45,.72,[['runner',4],['armored',3],['splitter',3],['swarmer',4]]),
        wave(1.6,.69,[['runner',5],['armored',3],['splitter',3],['swarmer',8]]), wave(1.75,.66,[['runner',5],['armored',4],['splitter',3],['swarmer',8]]),
        wave(1.9,.63,[['runner',6],['armored',4],['splitter',4],['swarmer',8]]), wave(2.1,.6,[['runner',6],['armored',4],['splitter',4],['swarmer',12]]),
        wave(2.3,.57,[['runner',7],['armored',5],['splitter',4],['swarmer',12]]), wave(2.5,.55,[['runner',7],['armored',5],['splitter',5],['swarmer',12]]),
        wave(2.7,.53,[['runner',8],['armored',6],['splitter',5],['swarmer',12]]), wave(2.9,.51,[['runner',8],['armored',6],['splitter',6],['swarmer',16]]),
        wave(3.1,.49,[['runner',9],['armored',7],['splitter',6],['swarmer',16]]), wave(3.3,.47,[['runner',9],['armored',7],['splitter',7],['swarmer',16]]),
        wave(3.55,.45,[['runner',10],['armored',8],['splitter',7],['swarmer',16]]), wave(3.8,.43,[['runner',10],['armored',8],['splitter',8],['swarmer',20]]),
        wave(4.1,.41,[['runner',11],['armored',9],['splitter',8],['swarmer',20]]),
        wave(4.4,.4,[['runner',11],['armored',9],['splitter',8],['swarmer',20],['boss',1]])
      ] }
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
    level.roster = [...new Set(level.waves.flatMap(wave => wave.groups.map(group => group.kind)))];
    for (const id of [...level.roster]) {
      const split = ENEMY_KINDS[id].onDeathSplit;
      if (split && !level.roster.includes(split.kind)) level.roster.push(split.kind);
    }
    level.decorations = decorationPlan(level);
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
  const towerStats = tower => ({ ...TOWERS[tower.type].stats[tower.level], ...(TOWERS[tower.type].branches[tower.branch]?.stats || {}) });
  const sellRefund = tower => Math.floor(tower.invested * .65);
  const waveCount = wave => wave.groups.reduce((total, group) => total + group.count, 0);
  const waveHasBoss = wave => wave.groups.some(group => group.kind === 'boss');
  function makeWaveQueue(wave) {
    const queue = [];
    for (const group of wave.groups) {
      const kind = ENEMY_KINDS[group.kind], hpScale = kind.id === 'boss' ? 1 : wave.hpScale;
      let remaining = group.count;
      if (kind.id === 'boss' && queue.length) queue[queue.length - 1].spacing = 2;
      while (remaining > 0) {
        const size = Math.min(kind.packSize || 1, remaining);
        for (let member = 0; member < size; member++) queue.push({
          kind: kind.id, hp: Math.round(kind.hp * hpScale), speed: kind.speed, reward: kind.reward,
          hpScale, spacing: member < size - 1 ? .12 : group.spacing
        });
        remaining -= size;
      }
    }
    return queue;
  }
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
    return `<canvas class="mission-preview" data-preview-level="${level.id}" width="540" height="300" aria-hidden="true"></canvas>`;
  }
  function rosterMarkup(level) {
    return `<div class="enemy-roster" aria-label="Mission bots">${level.roster.map(id => {
      const kind = ENEMY_KINDS[id];
      return `<span class="roster-entry"><canvas width="48" height="48" data-enemy-icon="${id}" aria-hidden="true"></canvas><span><strong>${kind.name}</strong><small>${kind.hint}</small></span></span>`;
    }).join('')}</div>`;
  }
  function paintMissionPreviews() {
    for (const preview of document.querySelectorAll('[data-preview-level]')) {
      const level = LEVELS[Number(preview.dataset.previewLevel)], context = preview.getContext('2d');
      context.setTransform(preview.width/WIDTH,0,0,preview.height/HEIGHT,0,0);
      renderTheme(context,level);
      const end = level.path[level.path.length-1], first = level.path[0];
      paintRect(context,(end.c+.5)*CELL-20,(end.r+.5)*CELL-20,40,40,8,'#a4efff','#0f172a',4);
      paintCircle(context,(first.c+.5)*CELL,(first.r+.5)*CELL,18,'#ffae59','#0f172a',4);
    }
    for (const icon of document.querySelectorAll('[data-enemy-icon]')) {
      const kind = ENEMY_KINDS[icon.dataset.enemyIcon], context = icon.getContext('2d');
      context.clearRect(0,0,48,48);context.save();context.translate(24,26);context.scale(.62,.62);
      kind.renderer(context,kind,'#ffb267');context.restore();
    }
  }
  function renderMissions() {
    $('mission-progress').textContent = `${Object.values(save.best).filter(b => b.cleared).length} / 3 cleared`;
    $('mission-list').innerHTML = LEVELS.map(level => {
      const locked = level.id >= save.unlocked, best = save.best[level.id];
      const record = best ? (best.cleared ? `Cleared · best base ${best.lives} / 20 ♥` : `Best attempt · wave ${best.wave} / ${level.waves.length}`) : '';
      return `<button class="mission-card ${!locked ? 'active' : ''}" data-level="${level.id}" ${locked ? 'disabled' : ''} aria-label="${level.name}, ${level.waves.length} waves. ${locked ? `Locked. Clear ${LEVELS[level.id-1].name} first.` : `${record || 'Ready to play'}.`}">${missionMap(level)}<div class="mission-body"><div class="mission-meta"><span>MISSION 0${level.id+1}</span><span class="difficulty">${level.difficulty}</span></div><h3>${level.name}</h3><p>${level.subtitle}</p><div class="mission-bottom"><span>${locked ? `Clear ${LEVELS[level.id-1].name} first` : `${level.waves.length} waves · 20 lives`}</span><span class="mission-arrow">${locked ? '⌑' : '→'}</span></div>${record ? `<span class="mission-best">${record}</span>` : ''}${rosterMarkup(level)}</div></button>`;
    }).join('');
    paintMissionPreviews();
  }
  function renderShop() {
    $('tower-shop').innerHTML = Object.entries(TOWERS).map(([type,tower],i) => `<button class="tower-button" data-tower="${type}" style="--tower-color:${COLORS[type]}" aria-pressed="${type === selectedType && !selectedTower}" aria-label="${tower.name}, ${tower.cost} coins. ${tower.tagline}."><span class="tower-key">${i+1}</span>${icon(type)}<span class="tower-info"><strong>${tower.name}</strong><small>${tower.tagline}</small></span><span class="tower-cost">${tower.cost}<small>COINS</small></span></button>`).join('');
  }
  function startLevel(id) {
    if (!LEVELS[id] || id >= save.unlocked) return;
    wakeAudio();
    const level = LEVELS[id];
    state = { level, phase: 'build', paused: false, coins: level.coins, lives: level.lives, wave: 0, kills: 0, leaked: 0,
      towers: [], enemies: [], projectiles: [], blasts: [], rings: [], particles: [], labels: [], spawnQueue: [], spawnTimer: 0, clock: 0, bossSpawned: 0, nextWaveDelay: 0 };
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
      announce(`${TOWERS[existing.type].name}, level ${existing.level+1}. ${existing.branch ? `${TOWERS[existing.type].branches[existing.branch].name} specialization.` : existing.level === 2 ? 'Two upgrades complete. Choose a specialization.' : `Upgrade costs ${TOWERS[existing.type].upgrades[existing.level]} coins.`}`);
      return;
    }
    if (state.level.pathSet.has(`${c},${r}`)) { announce('Keep the path clear! Choose a square beside the path.'); return; }
    const def = TOWERS[selectedType];
    if (state.coins < def.cost) { announce(`You need ${def.cost-state.coins} more coins for a ${def.name}. Towers earn coins by stopping bots.`); return; }
    wakeAudio(); state.coins -= def.cost;
    const tower = { id: nextId++, type: selectedType, c, r, x: (c+.5)*CELL, y: (r+.5)*CELL, level: 0, cooldown: .1, angle: -.8, recoil: 0, invested: def.cost, branch: null, hits: 0 };
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
    const refund = sellRefund(selectedTower), name = TOWERS[selectedTower.type].name;
    state.coins += refund; state.towers = state.towers.filter(t => t !== selectedTower); selectedTower = null;
    bleep('coin'); renderShop(); rebuildTileSelect(); updateUI(); announce(`${name} recycled. ${refund} coins returned.`);
  }
  function chooseBranch(branchId) {
    if (!isPlaying() || state.paused || !selectedTower || selectedTower.level !== 2 || selectedTower.branch) return;
    const branch = TOWERS[selectedTower.type].branches[branchId];
    if (!branch) return;
    if (state.coins < branch.cost) { announce(`You need ${branch.cost-state.coins} more coins for ${branch.name}.`); return; }
    state.coins -= branch.cost; selectedTower.invested += branch.cost;
    selectedTower.branch = branchId; selectedTower.hits = 0;
    burst(selectedTower.x,selectedTower.y,COLORS[selectedTower.type],18); bleep('upgrade');
    updateUI(); rebuildTileSelect();
    announce(`${branch.name} chosen! This tower's specialization is final.`);
  }
  function startWave() {
    if (!state || state.phase !== 'build' || state.paused) return;
    wakeAudio();
    const level = state.level, next = level.waves[state.wave];
    if (!next) return;
    state.wave++; state.phase = 'wave'; state.spawnTimer = .35;
    state.spawnQueue = makeWaveQueue(next);
    updateUI(); bleep('wave');
    announce(`Wave ${state.wave}! ${waveCount(next)} bots incoming${waveHasBoss(next) ? ', including the big boss' : ''}.`);
  }
  function spawnEnemy(spec, distance = 0) {
    const def = ENEMY_KINDS[spec.kind];
    if (!state || !def || !Number.isFinite(distance)) return null;
    const progress = Math.max(0,Math.min(state.level.length,distance));
    const hpScale = Number.isFinite(spec.hpScale) && spec.hpScale > 0 ? spec.hpScale : 1;
    const hp = Number.isFinite(spec.hp) && spec.hp > 0 ? spec.hp : Math.round(def.hp * hpScale);
    const enemy = { id: nextId++, kind: def.id, hp, maxHp: hp, hpScale,
      speed: spec.speed ?? def.speed, reward: spec.reward ?? def.reward, armor: def.armor || 0,
      distance: progress, ...pointAt(state.level,progress), slow: 1, slowTime: 0,
      freezeTime: 0, flash: 0, wobble: nextId*.7, deathResolved: false, formationOffset: spec.formationOffset || 0 };
    state.enemies.push(enemy);
    if (def.id === 'boss') { state.bossSpawned++; announce('The big boss is here! Your crew has got this.'); bleep('cannon'); }
    return enemy;
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
  function hitEnemy(enemy,damage,stats = {},source = null) {
    if (enemy.hp <= 0 || enemy.deathResolved) return;
    enemy.hp -= Math.max(1,damage - enemy.armor); enemy.flash = .08;
    if (stats.slow) {
      enemy.slow = Math.min(enemy.slow,stats.slow); enemy.slowTime = Math.max(enemy.slowTime,stats.duration);
    }
    if (source && stats.freezeEvery) {
      source.hits++;
      if (source.hits >= stats.freezeEvery) { source.hits = 0; enemy.freezeTime = stats.freezeDuration; }
    }
    if (enemy.hp <= 0) {
      enemy.hp = 0; enemy.deathResolved = true;
      state.coins += enemy.reward; state.kills++; uiDirty = true;
      burst(enemy.x,enemy.y,enemy.kind === 'boss' ? '#ffe69b' : '#ffae59',enemy.kind === 'boss' ? 24 : 7);
      state.labels.push({ x:enemy.x,y:enemy.y-15,text:`+${enemy.reward}`,life:.8,color:'#ffd46b' }); bleep('coin');
      const split = ENEMY_KINDS[enemy.kind].onDeathSplit;
      if (split) for (let child = 0; child < split.count; child++) spawnEnemy({
        kind: split.kind, hpScale: enemy.hpScale, formationOffset: (child-(split.count-1)/2)*12
      },enemy.distance);
    }
  }
  function splashAt(x,y,radius,damage,stats = {},source = null) {
    burst(x,y,'#ffcc7b',12);
    state.rings.push({ x,y,radius,life:.3,maxLife:.3,color:'#ffcc7b' });
    // Snapshot the list: newly split minis survive the impact that created them.
    for (const enemy of [...state.enemies]) if (enemy.hp > 0 && (enemy.x-x)**2+(enemy.y-y)**2 <= radius**2) hitEnemy(enemy,damage,stats,source);
  }
  function update(dt) {
    if (!isPlaying() || state.paused) return;
    state.clock += dt;
    for (const ring of state.rings) ring.life -= dt;
    state.rings = state.rings.filter(ring => ring.life > 0);
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
      const frozen = enemy.freezeTime > 0;
      enemy.freezeTime = Math.max(0,enemy.freezeTime-dt);
      enemy.distance += frozen ? 0 : enemy.speed*enemy.slow*dt;
      Object.assign(enemy,pointAt(state.level,enemy.distance));
      if (enemy.distance >= state.level.length) {
        enemy.hp = 0; enemy.leaked = true; enemy.deathResolved = true; state.lives--; state.leaked++; uiDirty = true;
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
          if (stats.aura) {
            state.rings.push({ x:tower.x,y:tower.y,radius:stats.range,life:.5,maxLife:.5,color:COLORS.frost });
            for (const enemy of [...state.enemies]) if (enemy.hp > 0 && distanceSq(tower,enemy) <= stats.range**2) hitEnemy(enemy,stats.damage,stats,tower);
          } else state.projectiles.push({ x:tower.x+Math.cos(tower.angle)*18,y:tower.y+Math.sin(tower.angle)*18,target,targetX:target.x,targetY:target.y,type:tower.type,stats,source:tower,speed:tower.type==='cannon'?310:480 });
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
          splashAt(shot.targetX,shot.targetY,shot.stats.splash,shot.stats.damage,shot.stats,shot.source);
          if (shot.stats.cluster) {
            const cluster = shot.stats.cluster;
            for (let i = 0; i < cluster.count; i++) {
              const angle = i * Math.PI * 2 / cluster.count;
              state.blasts.push({ x:shot.targetX+Math.cos(angle)*cluster.offset,y:shot.targetY+Math.sin(angle)*cluster.offset,
                radius:cluster.radius,damage:cluster.damage,delay:.12+i*.05 });
            }
          }
        } else if (shot.target.hp>0) hitEnemy(shot.target,shot.stats.damage,shot.stats,shot.source);
      } else { shot.x+=dx/dist*shot.speed*dt; shot.y+=dy/dist*shot.speed*dt; }
    }
    state.projectiles=state.projectiles.filter(p=>!p.done);
    for (const blast of state.blasts) {
      blast.delay -= dt;
      if (blast.delay <= 0 && !blast.done) { splashAt(blast.x,blast.y,blast.radius,blast.damage); blast.done = true; }
    }
    state.blasts = state.blasts.filter(blast => !blast.done);
    state.enemies=state.enemies.filter(e=>e.hp>0);
    if (!state.spawnQueue.length && !state.enemies.length) {
      state.projectiles=[]; state.blasts=[];
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
      const def=TOWERS[selectedTower.type],stats=towerStats(selectedTower),max=selectedTower.level===2,branch=def.branches[selectedTower.branch];
      $('selection-name').textContent=branch?`${def.name} · ${branch.name}`:def.name;
      $('selection-badge').textContent=branch?'SPECIALIZED':`LEVEL ${selectedTower.level+1} / 3`;
      $('selection-description').textContent=branch?branch.hint:max?'Two upgrades complete. Choose one final specialization.':`Upgrade for stronger ${selectedTower.type==='frost'?'slowing and longer range':'shots and longer range'}.`;
      $('tower-stats').textContent=`${stats.damage} damage · ${(1/stats.cooldown).toFixed(1)} ${stats.aura?'pulses':'shots'}/sec${stats.cluster?' · 3 mini-blasts':stats.freezeEvery?' · every 3rd hit freezes':stats.splash?` · ${stats.splash}px splash`:stats.slow?` · ${Math.round((1-stats.slow)*100)}% slow`:''}`;
      const cost=def.upgrades[selectedTower.level];
      $('upgrade-button').hidden=max;
      $('upgrade-button').textContent=`Upgrade · ${cost || 0} coins`;
      $('upgrade-button').disabled=max || state.coins<cost || state.paused || !isPlaying();
      $('branch-controls').hidden=!max||!!branch;
      for(const [index,[id,choice]] of Object.entries(def.branches).entries()){
        const button=$('branch-controls').querySelector(`[data-branch-choice="${index}"]`);
        button.dataset.branch=id;button.querySelector('strong').textContent=choice.name;
        button.querySelector('span').textContent=`${choice.cost} coins`;
        button.querySelector('small').textContent=choice.hint;
        button.setAttribute('aria-label',`${choice.name}, ${choice.cost} coins. ${choice.hint} Final choice for this tower.`);
        button.disabled=!!branch||!max||state.coins<choice.cost||state.paused||!isPlaying();
      }
      $('sell-button').textContent=`Recycle +${sellRefund(selectedTower)}`;
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
    $('next-wave-label').textContent=state.paused?'Resume whenever you’re ready':state.phase==='wave'?`${state.enemies.length+state.spawnQueue.length} bots remaining`:next?`${waveCount(next)} bots incoming${waveHasBoss(next)?' · big boss finale':''}`:'Great teamwork, commander';
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
      if(tower.branch==='deepfreeze'){
        polygon(ctx,[[0,-26],[14,-5],[0,15],[-14,-5]],'#d8faff','#276884',2);
        ctx.strokeStyle='#67bbd2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(0,13);ctx.moveTo(-12,-5);ctx.lineTo(12,-5);ctx.stroke();
      }else{
        ctx.strokeStyle='#e6fcff';ctx.lineWidth=3;ctx.lineCap='round';
        for(let i=0;i<3;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*13,Math.sin(a)*13-2);ctx.lineTo(-Math.cos(a)*13,-Math.sin(a)*13-2);ctx.stroke();}
        circle(0,-2,5,'#4b9fbc');
        if(tower.branch==='blizzard'){circle(0,-2,25,null,'#c4f5ff',2);for(let i=0;i<3;i++)circle(Math.cos(i*Math.PI*2/3)*25,Math.sin(i*Math.PI*2/3)*25-2,4,'#c4f5ff','#276884',1);}
      }
    }else{
      ctx.save();ctx.rotate(tower.angle);
      if(tower.branch==='gatling'){
        for(const y of [-7,7]){roundRect(1-recoil,y-4,29,8,3,'#0b1b2a');roundRect(4-recoil,y-2,26,4,1,'#ddffa5');}
      }else if(tower.branch==='longshot'){
        roundRect(1-recoil,-5,40,10,3,'#0b1b2a');roundRect(4-recoil,-2,35,4,1,'#ddffa5');roundRect(29-recoil,-8,5,16,2,'#ddffa5','#0b1b2a',2);
      }else if(tower.branch==='bigsplash'){
        polygon(ctx,[[3,-7],[30,-14],[30,14],[3,7]],'#ffcf89','#0b1b2a',3);roundRect(26,-15,7,30,2,'#0b1b2a');
      }else if(tower.branch==='cluster'){
        for(const y of [-11,0,11]){roundRect(5-recoil,y-4,24,8,3,'#ffcf89','#0b1b2a',2);circle(26-recoil,y,2,'#0b1b2a');}
      }else{roundRect(1-recoil,-(tower.type==='cannon'?8:6),29,tower.type==='cannon'?16:12,4,'#0b1b2a');roundRect(4-recoil,-(tower.type==='cannon'?5:3),24,tower.type==='cannon'?10:6,2,tower.type==='cannon'?'#ffcf89':'#ddffa5');}
      ctx.restore();
    }
    for(let i=0;i<=tower.level;i++)circle((i-tower.level/2)*8,19,2.3,color);
    if(tower.branch){circle(18,19,8,'#0b1b2a',color,1);ctx.fillStyle=color;ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(TOWERS[tower.type].branches[tower.branch].emblem,18,23);}
    if(selectedTower===tower){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.strokeRect(-27,-28,54,56);ctx.setLineDash([]);}
    ctx.restore();
  }
  function paintRect(context,x,y,w,h,r,fill,stroke,line=1) {
    context.beginPath();context.roundRect(x,y,w,h,r);
    if(fill){context.fillStyle=fill;context.fill();}if(stroke){context.strokeStyle=stroke;context.lineWidth=line;context.stroke();}
  }
  function paintCircle(context,x,y,r,fill,stroke,line=1) {
    context.beginPath();context.arc(x,y,r,0,Math.PI*2);
    if(fill){context.fillStyle=fill;context.fill();}if(stroke){context.strokeStyle=stroke;context.lineWidth=line;context.stroke();}
  }
  function polygon(context,points,fill,stroke='#132537',line=3) {
    context.beginPath();points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.closePath();
    if(fill){context.fillStyle=fill;context.fill();}if(stroke){context.strokeStyle=stroke;context.lineWidth=line;context.stroke();}
  }
  function drawKindSilhouette(context,kind,fill) {
    context.lineJoin='round';context.lineCap='round';
    const outline='#132537';
    switch(kind.shape){
      case 'triangle': polygon(context,[[-20,17],[0,-21],[20,17]],fill);break;
      case 'wide': paintRect(context,-25,-14,50,33,8,fill,outline,3);break;
      case 'tall': paintRect(context,-12,-22,24,40,8,fill,outline,3);break;
      case 'dart': polygon(context,[[-24,13],[0,-20],[24,13],[0,6]],fill);break;
      case 'hexagon': polygon(context,[[-21,-9],[-11,-20],[12,-20],[22,-8],[19,14],[0,21],[-20,14]],fill);break;
      case 'square': paintRect(context,-21,-20,42,40,3,fill,outline,3);break;
      case 'double': paintRect(context,-24,-16,26,35,12,fill,outline,3);paintRect(context,-2,-16,26,35,12,fill,outline,3);break;
      case 'diamond': polygon(context,[[0,-15],[15,0],[0,15],[-15,0]],fill);break;
      case 'round': paintCircle(context,0,0,18,fill,outline,3);break;
      case 'giant': paintRect(context,-26,-20,52,43,10,fill,outline,3);break;
      default: paintRect(context,-18,-14,36,32,9,fill,outline,3);
    }
    context.strokeStyle=outline;context.lineWidth=3;context.lineCap='round';
    switch(kind.accessory){
      case 'antenna': context.beginPath();context.moveTo(0,-15);context.lineTo(0,-24);context.stroke();paintCircle(context,0,-26,3,fill,outline,2);break;
      case 'dish': context.beginPath();context.moveTo(0,-19);context.lineTo(4,-27);context.arc(4,-29,8,0,Math.PI);context.stroke();break;
      case 'shoulders': paintRect(context,-30,-9,9,19,3,fill,outline,3);paintRect(context,21,-9,9,19,3,fill,outline,3);break;
      case 'legs': context.beginPath();context.moveTo(-7,16);context.lineTo(-14,24);context.lineTo(-8,28);context.moveTo(7,16);context.lineTo(14,24);context.lineTo(8,28);context.stroke();break;
      case 'fins': polygon(context,[[-18,9],[-28,17],[-22,0]],fill);polygon(context,[[18,9],[28,17],[22,0]],fill);break;
      case 'shield': polygon(context,[[3,8],[18,5],[18,18],[10,25],[2,17]],'#a4b5be',outline,2);break;
      case 'rivets': for(const x of [-16,16])for(const y of [-15,15])paintRect(context,x-2,y-2,4,4,1,'#e0d1af');break;
      case 'seam': context.beginPath();context.moveTo(0,-16);context.lineTo(-3,-10);context.lineTo(3,10);context.lineTo(0,18);context.stroke();break;
      case 'stub': paintRect(context,-3,-20,6,5,1,fill,outline,2);break;
      case 'feelers': context.beginPath();context.moveTo(-9,-14);context.lineTo(-20,-24);context.moveTo(9,-14);context.lineTo(20,-24);context.stroke();paintCircle(context,-20,-24,3,fill);paintCircle(context,20,-24,3,fill);break;
      case 'crown': polygon(context,[[-16,-20],[-19,-34],[-6,-27],[0,-38],[7,-27],[19,-34],[16,-20]],'#ffe697',outline,2);break;
    }
    const visorWidth=kind.shape==='diamond'?17:kind.shape==='tall'?21:27;
    paintRect(context,-visorWidth/2,-6,visorWidth,11,4,'#173040',outline,2);
    paintRect(context,-8,-3,3,5,1,'#baf7ff');paintRect(context,5,-3,3,5,1,'#baf7ff');
  }
  function drawEnemy(enemy) {
    const kind=ENEMY_KINDS[enemy.kind],big=kind.id==='boss',scale=kind.renderScale;
    const bob=reducedMotion||enemy.freezeTime>0?0:Math.sin(state.clock*11+enemy.wobble)*1.5;
    ctx.save();ctx.translate(enemy.x+enemy.formationOffset,enemy.y+bob);ctx.scale(scale,scale);
    ctx.fillStyle='#09142444';ctx.beginPath();ctx.ellipse(0,21,big?27:20,6,0,0,Math.PI*2);ctx.fill();
    kind.renderer(ctx,kind,enemy.flash?'#fff7cc':enemy.freezeTime>0?'#d6fbff':enemy.slowTime?'#a6dcef':enemy.armor?'#b7a1a0':'#ffae59');
    if(enemy.freezeTime>0)polygon(ctx,[[0,-31],[26,-12],[25,22],[0,31],[-25,22],[-26,-12]],'#a4efff22','#d6fbff',2);
    if(enemy.hp<enemy.maxHp||big){paintRect(ctx,-20,big?-45:-37,40,5,2,'#0c1929');paintRect(ctx,-19,big?-44:-36,38*Math.max(0,enemy.hp/enemy.maxHp),3,1,enemy.slowTime?'#a4efff':'#bef264');}
    ctx.restore();
  }
  function tileHash(levelId,c,r) {
    let hash=Math.imul(levelId+1,0x9e3779b1)^Math.imul(c+11,0x85ebca6b)^Math.imul(r+23,0xc2b2ae35);
    hash=Math.imul(hash^(hash>>>16),0x45d9f3b);return (hash^(hash>>>16))>>>0;
  }
  function decorationPlan(level) {
    const tiles=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(!level.pathSet.has(`${c},${r}`))tiles.push({c,r,seed:tileHash(level.id,c,r)});
    const pond=level.theme.decorSet.includes('pond')?tiles.reduce((best,tile)=>!best||tile.seed<best.seed?tile:best,null):null;
    const kinds=level.theme.decorSet.filter(kind=>kind!=='pond');
    return tiles.filter(tile=>tile===pond||tile.seed%100<48).map(tile=>({...tile,kind:tile===pond?'pond':kinds[tile.seed%kinds.length],
      x:(tile.c+.5)*CELL+(tile.seed%13)-6,y:(tile.r+.5)*CELL+((tile.seed>>>8)%13)-6,scale:.75+((tile.seed>>>16)%25)/100}));
  }
  function drawDecoration(context,decor) {
    context.save();context.translate(decor.x,decor.y);context.scale(decor.scale,decor.scale);
    switch(decor.kind){
      case 'crater': context.beginPath();context.ellipse(0,3,18,11,0,0,Math.PI*2);context.fillStyle='#10283d';context.fill();context.strokeStyle='#3a5263';context.lineWidth=3;context.stroke();context.beginPath();context.ellipse(3,6,10,5,0,0,Math.PI);context.stroke();break;
      case 'rock': polygon(context,[[-17,11],[-13,-7],[1,-14],[17,1],[13,13]],'#3a5264','#263e51',2);polygon(context,[[-13,-7],[1,-14],[2,7]],'#4b6271',null);break;
      case 'stars': for(const [x,y] of [[-12,-5],[9,8]]){context.strokeStyle='#b2d2db66';context.lineWidth=2;context.beginPath();context.moveTo(x-4,y);context.lineTo(x+4,y);context.moveTo(x,y-4);context.lineTo(x,y+4);context.stroke();}break;
      case 'tree': paintRect(context,-3,4,6,16,2,'#826448');polygon(context,[[-17,9],[0,-21],[17,9]],'#42794c','#234b37',2);polygon(context,[[-13,-2],[0,-25],[13,-2]],'#5b8d55',null);break;
      case 'bush': paintCircle(context,-8,4,10,'#426c44');paintCircle(context,5,1,13,'#52814d');paintCircle(context,15,7,8,'#416c44');break;
      case 'flower': for(const [x,y] of [[-10,5],[9,-4],[10,13]]){context.strokeStyle='#5d8c51';context.lineWidth=2;context.beginPath();context.moveTo(x,y+7);context.lineTo(x,y);context.stroke();paintCircle(context,x,y,4,'#e5c77c');paintCircle(context,x,y,1.5,'#ba855b');}break;
      case 'pond': context.beginPath();context.ellipse(0,1,23,16,-.3,0,Math.PI*2);context.fillStyle='#78a287';context.fill();context.beginPath();context.ellipse(0,0,19,12,-.3,0,Math.PI*2);context.fillStyle='#47938f';context.fill();context.strokeStyle='#96c8b6';context.lineWidth=2;context.beginPath();context.moveTo(-9,-3);context.lineTo(2,-3);context.moveTo(3,4);context.lineTo(11,4);context.stroke();break;
      case 'glowrock': paintCircle(context,0,0,22,'#ffb3590d');polygon(context,[[-14,13],[-9,-10],[3,-19],[16,2],[10,14]],'#5d4c48','#ab7953',2);context.strokeStyle='#f2b55b';context.lineWidth=2;context.beginPath();context.moveTo(3,-14);context.lineTo(-3,1);context.lineTo(8,8);context.stroke();break;
      case 'twistedtree': context.strokeStyle='#28292d';context.lineWidth=6;context.lineCap='round';context.beginPath();context.moveTo(2,21);context.lineTo(-4,4);context.lineTo(4,-12);context.lineTo(-3,-24);context.moveTo(-2,0);context.lineTo(-16,-7);context.lineTo(-19,-17);context.moveTo(2,-7);context.lineTo(17,-13);context.lineTo(19,-23);context.stroke();break;
      case 'ember': polygon(context,[[-18,8],[-4,-10],[17,4],[12,13]],'#423936',null);for(const [x,y] of [[-5,3],[8,6]])paintRect(context,x,y,4,2,1,'#d48b50');break;
    }
    context.restore();
  }
  function renderTheme(context,level) {
    context.save();context.globalAlpha=1;context.globalCompositeOperation='source-over';context.lineCap='butt';context.lineJoin='miter';context.setLineDash([]);
    const theme=level.theme;
    context.fillStyle=theme.bgTint;context.fillRect(0,0,WIDTH,HEIGHT);
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(!level.pathSet.has(`${c},${r}`)){
      paintRect(context,c*CELL+3,r*CELL+3,CELL-6,CELL-6,7,(c+r)%2?theme.tileB:theme.tileA);
      paintCircle(context,c*CELL+9,r*CELL+9,1.1,'#c7d8c326');
    }
    // Decorations are a precomputed pure hash plan, never occupancy or collision data.
    for(const decor of level.decorations)drawDecoration(context,decor);
    context.beginPath();level.path.forEach((p,i)=>{const x=(p.c+.5)*CELL,y=(p.r+.5)*CELL;i?context.lineTo(x,y):context.moveTo(x,y);});
    context.lineJoin='round';context.lineCap='round';context.strokeStyle=theme.pathBorder;context.lineWidth=49;context.stroke();
    context.strokeStyle=theme.pathColor;context.lineWidth=42;context.stroke();
    context.strokeStyle=theme.pathBorder;context.lineWidth=2;context.setLineDash([3,12]);context.stroke();context.setLineDash([]);
    context.restore();
  }
  function draw() {
    if(!state)return;
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    renderTheme(ctx,state.level);
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
    for(const ring of state.rings){ctx.globalAlpha=Math.min(.6,ring.life/ring.maxLife);circle(ring.x,ring.y,ring.radius*(1-ring.life/ring.maxLife*.25),null,ring.color,2);}
    ctx.globalAlpha=1;
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
  $('branch-controls').addEventListener('click',event=>{const button=event.target.closest('[data-branch]');if(button&&!button.disabled)chooseBranch(button.dataset.branch);});
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
      levels:LEVELS,towers:TOWERS,enemyKinds:ENEMY_KINDS,
      getTowerStats:towerStats,getSellRefund:sellRefund,makeWaveQueue,waveCount,
      spawnEnemy,hitEnemy,chooseBranch,decorationPlan,tileHash,renderTheme,
      decorForTile:(level,c,r)=>decorationPlan(level).find(decor=>decor.c===c&&decor.r===r)||null,
      snapshot:()=>state?{level:state.level.id,phase:state.phase,paused:state.paused,coins:state.coins,lives:state.lives,wave:state.wave,kills:state.kills,leaked:state.leaked,bossSpawned:state.bossSpawned,blasts:state.blasts.map(b=>({...b})),enemies:state.enemies.map(e=>({...e})),towers:state.towers.map(t=>({...t})),queue:state.spawnQueue.length,save:JSON.parse(JSON.stringify(save))}:{save:JSON.parse(JSON.stringify(save))},
      step:seconds=>{for(let t=0;t<seconds;t+=.02)update(Math.min(.02,seconds-t));updateUI();draw();},
      startLevel,startWave,selectType,activateTile,upgradeTower,sellTower,togglePause,
      inspect:()=>state
    };
  }
})();
