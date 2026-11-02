'use strict';
/* ============================================================
   CREWMATE COMMAND: THE HOLLOW SIGNAL — game data
   Crew, foes, maps, waves and the whole story live here.
   A fan-made homage; original drawings only.
   ============================================================ */

const TILE = 64;

/* ---------- Crew (the "towers") ---------- */
const CREW = {
  brick: {
    name: 'Brick', role: 'Guard', color: '#d8232a', hat: 'hardhat', ground: 'path',
    cost: 8, hp: 560, atk: 46, interval: 1.0, def: 14, block: 1, range: 0,
    skill: { name: 'Body Slam', desc: 'Hits 80% harder for 10 seconds.', sp: 18, dur: 10 },
    blurb: 'Stands on the floor and blocks one foe at a time. Hits hard up close.',
    tip: 'Place on the floor path.'
  },
  tank: {
    name: 'Tank', role: 'Defender', color: '#6a36c8', hat: 'dome', ground: 'path',
    cost: 12, hp: 1250, atk: 20, interval: 1.3, def: 50, block: 3, range: 0,
    skill: { name: 'Hold the Line', desc: 'Doubles armor and heals for 10 seconds.', sp: 22, dur: 10 },
    blurb: 'A gentle giant. Blocks THREE foes and shrugs off hits, but barely hits back.',
    tip: 'Place on the floor path.'
  },
  rook: {
    name: 'Rook', role: 'Shooter', color: '#1f3fe0', hat: 'goggles', ground: 'high',
    cost: 9, hp: 300, atk: 40, interval: 0.85, def: 4, block: 0, range: 3.2,
    skill: { name: 'Eagle Eye', desc: 'Shoots twice as fast for 10 seconds.', sp: 18, dur: 10 },
    blurb: 'Shoots from the high decks. Great against anything — but armor shrugs off bullets.',
    tip: 'Place on high decks.'
  },
  lumi: {
    name: 'Lumi', role: 'Medic', color: '#1c9a4a', hat: 'nurse', ground: 'high',
    cost: 10, hp: 340, atk: 0, heal: 46, interval: 1.5, def: 4, block: 0, range: 2.7,
    skill: { name: 'Group Hug', desc: 'Instantly heals everybody nearby by half.', sp: 25, dur: 0 },
    blurb: 'Heals the hurt crewmate nearby. Keeps your guards standing.',
    tip: 'Place on high decks.'
  },
  sparky: {
    name: 'Sparky', role: 'Zapper', color: '#f2d92a', hat: 'bolt', ground: 'high',
    cost: 14, hp: 290, atk: 58, interval: 1.7, def: 4, block: 0, range: 2.6, aoe: 0.9, elec: true,
    skill: { name: 'Chain Zap', desc: 'Lightning leaps to 4 extra foes for 10 seconds.', sp: 24, dur: 10 },
    blurb: 'Electric blasts hurt groups and IGNORE armor. The answer to plated foes.',
    tip: 'Place on high decks.'
  },
  echo: {
    name: 'Echo', role: 'Scanner', color: '#34e7d4', hat: 'dish', ground: 'high',
    cost: 9, hp: 320, atk: 16, interval: 1.1, def: 4, block: 0, range: 2.9, slow: 0.5, slowT: 1.6, reveals: true,
    skill: { name: 'Freeze Ping', desc: 'Nearby foes crawl at quarter speed for 5 seconds.', sp: 20, dur: 5 },
    blurb: 'Slows foes with her pings and REVEALS sneaky shapeshifters.',
    tip: 'Place on high decks.'
  }
};
const CREW_ORDER = ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo'];
const PROMOTE_MAX = 2;

/* ---------- Foes (the "mobs") ---------- */
const FOES = {
  crawler: {
    name: 'Vent Crawler', hp: 150, spd: 0.95, atk: 26, interval: 1.1, def: 0, weight: 1, leak: 1, size: 0.62,
    lore: 'Scuttles out of the vents in packs. Each one is small. Together? Very annoying.',
    tip: 'Weak alone. Block them early.'
  },
  mimic: {
    name: 'Mimic', hp: 380, spd: 0.7, atk: 55, interval: 1.4, def: 10, weight: 1, leak: 1, size: 0.85,
    lore: 'Wears a crewmate suit like a Halloween costume. The visor is always a little too dark.',
    tip: 'Sturdy and hits harder. A guard is a must.'
  },
  ghost: {
    name: 'Wisp Ghost', hp: 210, spd: 0.85, atk: 0, interval: 1, def: 0, weight: 1, leak: 1, size: 0.8, flying: true,
    lore: 'An echo of a crewmate who never woke up. It floats right over your guards.',
    tip: 'Flies! Guards can’t block it — use shooters.'
  },
  drone: {
    name: 'Sabotage Drone', hp: 260, spd: 0.75, atk: 45, interval: 1.7, def: 5, weight: 1, leak: 1, size: 0.75, flying: true, ranged: 2.3,
    lore: 'A repair bot the Signal rewired. It stops to zap your crew from the air.',
    tip: 'Flies and shoots back. Shooters outrange it.'
  },
  shifter: {
    name: 'Shapeshifter', hp: 360, spd: 0.9, atk: 75, interval: 1.3, def: 5, weight: 1, leak: 1, size: 0.85, stealth: true,
    lore: 'Looks like a friend right up until it isn’t. Nobody can aim at what they can’t see.',
    tip: 'Invisible until close. Echo reveals it from afar.'
  },
  plated: {
    name: 'Plated Mimic', hp: 780, spd: 0.5, atk: 80, interval: 1.6, def: 55, weight: 1, leak: 2, size: 1.0,
    lore: 'A Mimic that bolted hull plates onto itself. Bullets go “ping”.',
    tip: 'Bullets bounce off! Zap it with Sparky.'
  },
  spore: {
    name: 'Spore Walker', hp: 650, spd: 0.45, atk: 45, interval: 1.5, def: 8, weight: 1, leak: 1, size: 1.0, splits: 'sporelet', splitN: 2,
    lore: 'A mushroom that learned to walk. When it pops, two more little ones tumble out.',
    tip: 'Pops into 2 Sporelets. Keep damage ready.'
  },
  sporelet: {
    name: 'Sporelet', hp: 110, spd: 1.0, atk: 18, interval: 1.0, def: 0, weight: 1, leak: 1, size: 0.5,
    lore: 'Tiny, giggling, and fast. Mostly harmless. Mostly.',
    tip: 'Fast but fragile.'
  },
  brute: {
    name: 'Brute Mimic', hp: 3800, spd: 0.34, atk: 150, interval: 2.0, def: 35, weight: 3, leak: 4, size: 1.5, boss: true,
    lore: 'The Face Thief. It borrowed Captain Juno’s voice, and still wasn’t good at it.',
    tip: 'BOSS. Takes up 3 block slots. Bring Sparky!'
  },
  sporemother: {
    name: 'Spore Mother', hp: 5200, spd: 0.3, atk: 100, interval: 2.0, def: 20, weight: 3, leak: 5, size: 1.5, boss: true,
    summon: { type: 'sporelet', n: 3, every: 6 },
    lore: 'The heart of the Fungle. Wherever she steps, little ones bloom.',
    tip: 'BOSS. Keeps spawning Sporelets.'
  },
  heart: {
    name: 'The Hollow Heart', hp: 8000, spd: 0.24, atk: 200, interval: 2.2, def: 20, weight: 3, leak: 99, size: 1.8, boss: true,
    phases: [
      { at: 0.75, spawn: ['mimic', 4, 0.8] },
      { at: 0.5, spawn: ['ghost', 5, 0.6] },
      { at: 0.25, spawn: ['plated', 3, 1.2] }
    ],
    lore: 'The Signal’s lonely center. It isn’t angry. It just doesn’t know how to say hello.',
    tip: 'FINAL BOSS. Summons help at 75%, 50% and 25%.'
  }
};

/* ---------- Colour themes for each place ---------- */
const THEMES = {
  skeld: {
    name: 'Skeld-class Hull', bg: '#0b1020', wall: '#3a4558', wallTop: '#566177', floorA: '#8693a6', floorB: '#7d8a9d', seam: '#5b6779',
    path: '#4d5766', pathEdge: '#2e3642', high: '#b7c4d6', highEdge: '#6c7b92', arrow: 'rgba(255,214,64,.55)', glow: '#42e8ff',
    decor: ['console', 'crate', 'pipes', 'table'], star: true
  },
  medbay: {
    name: 'Medbay', bg: '#0a1218', wall: '#3d5a62', wallTop: '#5e8790', floorA: '#b9dbe0', floorB: '#aed1d7', seam: '#86aeb5',
    path: '#6e9aa3', pathEdge: '#41666e', high: '#e8f6f8', highEdge: '#8fb9c0', arrow: 'rgba(255,255,255,.6)', glow: '#7dffd0',
    decor: ['bed', 'scanner', 'crate', 'pipes'], star: true
  },
  polus: {
    name: 'Polus Station', bg: '#1a1535', wall: '#53597a', wallTop: '#7b83aa', floorA: '#e6eef8', floorB: '#d6e2f2', seam: '#a7bad4',
    path: '#8da4c4', pathEdge: '#5c7399', high: '#f7fbff', highEdge: '#9db2d1', arrow: 'rgba(255,255,255,.7)', glow: '#ff9a4d',
    decor: ['drift', 'lava', 'rock', 'crate'], sky: ['#2b1d5c', '#6b3a8a']
  },
  mira: {
    name: 'MIRA HQ Rooftop', bg: '#13112c', wall: '#4a3b66', wallTop: '#6d5a93', floorA: '#8fcf8a', floorB: '#83c37e', seam: '#6aa766',
    path: '#c9b894', pathEdge: '#8d7d58', high: '#b8e8c0', highEdge: '#5f9c70', arrow: 'rgba(255,255,255,.55)', glow: '#ffd36b',
    decor: ['plant', 'bench', 'bush', 'fountain'], sky: ['#1a1a4a', '#c26a8a']
  },
  fungle: {
    name: 'The Fungle', bg: '#06150f', wall: '#1d3b2d', wallTop: '#2f5e46', floorA: '#2f6b4a', floorB: '#2a6244', seam: '#1e4a33',
    path: '#4a3a2c', pathEdge: '#2a2118', high: '#6fa57a', highEdge: '#305a3b', arrow: 'rgba(255,220,150,.5)', glow: '#c06bff',
    decor: ['shroom', 'fern', 'log', 'glowshroom'], star: false
  },
  meridian: {
    name: 'Wreck of the Meridian', bg: '#14070a', wall: '#42262b', wallTop: '#6a3c44', floorA: '#5e5658', floorB: '#554e50', seam: '#3c3638',
    path: '#33292b', pathEdge: '#1b1315', high: '#8c7b7e', highEdge: '#4a3a3d', arrow: 'rgba(255,80,80,.55)', glow: '#ff4a4a',
    decor: ['console', 'wreck', 'pipes', 'crate'], star: true
  },
  hollow: {
    name: 'The Hollow', bg: '#0a0414', wall: '#2a1740', wallTop: '#4a2a72', floorA: '#3a2b5a', floorB: '#33264f', seam: '#241a3b',
    path: '#1b1030', pathEdge: '#0d0719', high: '#6a58a0', highEdge: '#2f2552', arrow: 'rgba(200,140,255,.55)', glow: '#d58bff',
    decor: ['eye', 'crystal', 'static', 'crystal'], star: true
  }
};

/* ---------- Story cast ---------- */
const CAST = {
  juno: { name: 'Captain Juno', color: '#e8eef8', hat: 'captain' },
  brick: { name: 'Brick', color: CREW.brick.color, hat: 'hardhat' },
  tank: { name: 'Tank', color: CREW.tank.color, hat: 'dome' },
  rook: { name: 'Rook', color: CREW.rook.color, hat: 'goggles' },
  lumi: { name: 'Lumi', color: CREW.lumi.color, hat: 'nurse' },
  sparky: { name: 'Sparky', color: CREW.sparky.color, hat: 'bolt' },
  echo: { name: 'Echo', color: CREW.echo.color, hat: 'dish' },
  hollow: { name: '???', color: '#2a1a46', hat: 'none', ghost: true },
  kestrel: { name: 'Kestrel', color: '#ff8a2a', hat: 'cap' },
  mimic: { name: 'Fake Juno', color: '#e8eef8', hat: 'captain', dark: true },
  ship: { name: 'HALCYON', color: '#6b7a90', hat: 'none', ai: true }
};

/* ---------- The Prologue ---------- */
const PROLOGUE = [
  'Between the stars there is a place so quiet\nthat ships learn to listen.',
  'The cargo ship HALCYON drifts through it,\nher crew asleep in glass beds,\ndreaming of home.',
  'Something has been listening back.\n\nIt has no face yet. So it’s been\nborrowing yours.'
];

/* ---------- Epilogue ---------- */
const EPILOGUE = [
  'The Signal went quiet — not silent,\nbut the quiet of someone finally heard.',
  'The HALCYON turned for home,\ncarrying two crews\nand one very new friend.',
  'And somewhere out past the last star,\na second signal blinked on.\n\nIt said: “Hello?”'
];

/* ---------- Tutorial script (Level 1) ---------- */
const TUTORIAL = [
  { text: 'Welcome aboard, Commander! I’m Captain Juno. Let me show you how to keep the HALCYON safe.', mode: 'info' },
  { text: 'This is your DP — Deployment Points. They fill up all by themselves. Crewmates cost DP to place.', mode: 'info', focus: 'dp' },
  { text: 'Tap Brick, our red guard, in the bottom bar.', mode: 'action', focus: 'card-brick', wait: 'select:brick' },
  { text: 'Now tap the glowing floor tile to place him. Guards stand ON the floor path.', mode: 'action', tile: [2, 2], allow: { type: 'brick', tile: [2, 2] }, wait: 'deploy:brick' },
  { text: 'Here come the Vent Crawlers! Brick will block them so they can’t sneak by. Each crawler that reaches the reactor costs a heart.', mode: 'info', startWave: true },
  { text: 'Nice! Now Rook. He shoots from the HIGH decks — the bright raised tiles. Tap Rook.', mode: 'action', focus: 'card-rook', wait: 'select:rook' },
  { text: 'Tap the glowing deck tile next to Brick to place him.', mode: 'action', tile: [4, 2], allow: { type: 'rook', tile: [4, 2] }, wait: 'deploy:rook' },
  { text: 'Watch them work together! Brick holds the line while Rook shoots.', mode: 'wait', wait: 'waveclear' },
  { text: 'Crawlers stopped! Now tap Brick on the field to see his options.', mode: 'action', tile: [2, 2], allow: { select: [2, 2] }, wait: 'select:field' },
  { text: 'PROMOTE makes him stronger. RETREAT gives DP back. And SKILL is a super move — the bar fills over time. Brick’s is ready, so tap SKILL!', mode: 'action', focus: 'skill', allow: { skill: true }, wait: 'skill', fillSP: true },
  { text: 'You’ve got it, Commander! The rest of the crawlers are coming. Deploy more crew, promote them, and watch your hearts. Good luck!', mode: 'info', release: true }
];

/* ---------- Level helpers ---------- */
const R = (pts, air) => ({ pts, air: !!air });
// wave builder: W(secondsUntilNextWave, ...[type, count, interval, routeIndex, startDelay])
const W = (dur, ...spawns) => ({ dur, spawns: spawns.map(s => ({ type: s[0], n: s[1], gap: s[2], route: s[3] || 0, delay: s[4] || 0 })) });

/* ---------- The Levels ---------- */
const LEVELS = [
  /* ================= CHAPTER 1: WAKE UP ================= */
  {
    id: 1, chapter: 1, name: 'Wake Up, Crewmate', place: 'Cafeteria · HALCYON', theme: 'skeld',
    cols: 10, rows: 6, startDP: 20, lives: 8, crew: ['brick', 'rook'], tutorial: true,
    routes: [R([[0, 2], [3, 2], [3, 4], [6, 4], [6, 1], [9, 1]])],
    high: [[2, 1], [1, 3], [4, 2], [5, 3], [7, 2], [8, 2], [8, 3], [4, 5], [7, 5]],
    walls: [[0, 0], [9, 0], [0, 5], [9, 5], [1, 0], [8, 0]],
    waves: [
      W(24, ['crawler', 3, 2.6]),
      W(24, ['crawler', 5, 2.0]),
      W(26, ['crawler', 4, 1.8], ['crawler', 3, 1.2, 0, 9]),
      W(28, ['crawler', 8, 1.4]),
      W(0, ['crawler', 9, 1.2], ['mimic', 1, 1, 0, 13], ['crawler', 4, 1.0, 0, 16])
    ],
    pre: [
      ['ship', 'ALERT. Cryo-sleep interrupted. Crew members awake: 2. Intruders detected: unknown.'],
      ['juno', 'Ugh. My head. Wren? Is that you at the console? Good. Don’t panic.'],
      ['brick', 'Captain! Something just crawled out of the cafeteria vent! It looked at me! It had EYES!'],
      ['juno', 'Then it’s a good thing we have you, Wren. You give the orders — we’ll stand where you say. Let’s show these crawlers the way out.']
    ],
    post: [
      ['brick', 'Ha! They ran off crying! ...Also, are we sure they weren’t just really big bugs?'],
      ['rook', 'They came from the vents. Every one. Somebody — or something — opened them from the inside.'],
      ['juno', 'Nobody on this ship did that. The rest of the crew is still asleep. So who invited them?'],
      ['ship', 'Signal detected. Origin: ahead. Content: “...hello?”']
    ],
    radio: { 2: ['juno', 'Hearts are the ship’s health. Keep an eye on them!'], 4: ['brick', 'They keep coming! I love it! I hate it!'] }
  },
  {
    id: 2, chapter: 1, name: 'Vent Season', place: 'Electrical · HALCYON', theme: 'skeld',
    cols: 10, rows: 6, startDP: 14, lives: 8, crew: ['brick', 'tank', 'rook'], newCrew: 'tank',
    routes: [R([[0, 1], [4, 1], [4, 3], [9, 3]]), R([[0, 5], [4, 5], [4, 3]])],
    high: [[2, 2], [2, 4], [3, 3], [5, 2], [5, 4], [7, 2], [7, 4], [8, 2], [8, 4]],
    walls: [[9, 0], [9, 5], [0, 0], [0, 3], [9, 1]],
    waves: [
      W(22, ['crawler', 5, 1.6, 0], ['crawler', 5, 1.6, 1]),
      W(24, ['crawler', 6, 1.2, 0], ['crawler', 6, 1.2, 1], ['mimic', 1, 1, 0, 8]),
      W(26, ['mimic', 2, 3.5, 1], ['crawler', 8, 1.0, 0, 3]),
      W(28, ['mimic', 3, 3.0, 0], ['mimic', 2, 3.0, 1, 5], ['crawler', 10, 0.9, 1, 8]),
      W(0, ['mimic', 3, 2.6, 0], ['mimic', 3, 2.6, 1], ['crawler', 14, 0.8, 0, 6], ['crawler', 8, 0.8, 1, 10])
    ],
    pre: [
      ['juno', 'The lights in Electrical are dead — and the crawlers are using both vents now. Two doors, one reactor.'],
      ['tank', '...Is it dark in here? I don’t like the dark. I’m not scared. I’m just, uh, large and cautious.'],
      ['juno', 'Tank! Thank goodness. You’re exactly what we need — a defender. Stand in a doorway and nothing gets through.'],
      ['tank', 'I can block three things at once. ...Please make them small things.']
    ],
    post: [
      ['tank', 'We did it! ...Can we keep the lights on now? Forever?'],
      ['sparky', '(over the intercom) HEY! Is anyone getting this?! The cables are SINGING! It’s talking through the wires!'],
      ['juno', 'The Signal again. It isn’t just sending monsters — it’s sending words. Let’s get to Medbay. Lumi’s there.']
    ],
    radio: { 3: ['tank', 'Two big ones coming through the right door! I’m okay! I’m fine!'] }
  },
  {
    id: 3, chapter: 1, name: 'Ghost Light', place: 'Medbay · HALCYON', theme: 'medbay',
    cols: 10, rows: 6, startDP: 14, lives: 8, crew: ['brick', 'tank', 'rook', 'lumi'], newCrew: 'lumi',
    routes: [R([[0, 1], [7, 1], [7, 3], [2, 3], [2, 5], [9, 5]]), R([[0, 0], [9, 5]], true)],
    high: [[3, 2], [5, 2], [8, 2], [4, 4], [6, 4], [8, 4], [1, 2], [1, 4]],
    walls: [[9, 0], [0, 5], [9, 1]],
    waves: [
      W(24, ['crawler', 6, 1.4, 0]),
      W(24, ['ghost', 3, 2.5, 1], ['crawler', 4, 1.4, 0, 4]),
      W(26, ['mimic', 2, 3.0, 0], ['ghost', 4, 2.0, 1, 4]),
      W(28, ['crawler', 8, 1.0, 0], ['ghost', 5, 1.8, 1, 3], ['mimic', 1, 1, 0, 14]),
      W(28, ['ghost', 6, 1.5, 1], ['mimic', 3, 2.8, 0, 3], ['crawler', 8, 0.9, 0, 12]),
      W(0, ['ghost', 8, 1.3, 1], ['mimic', 4, 2.4, 0], ['crawler', 12, 0.8, 0, 9], ['ghost', 4, 1.0, 1, 16])
    ],
    pre: [
      ['lumi', 'Wren! Thank the stars. I’ve been hiding under a gurney for twenty minutes. Don’t tell Brick.'],
      ['lumi', 'Something floated through the wall. It looked like Doctor Imani from B-deck... but Imani is still in cryo. I checked. Twice.'],
      ['juno', 'Ghosts. They fly right over our guards — we can’t block what doesn’t walk. Shooters, Wren. And keep Lumi close to patch up the crew.']
    ],
    post: [
      ['lumi', 'They just... faded. Smiling. Why were they smiling?'],
      ['echo', '(over the radio) Because it’s not hunting you. Captain, I’ve been listening in the Comms room. The Signal isn’t shouting. It’s... knocking.'],
      ['juno', 'Knocking to be let in? Then why bring an army? ...Echo, hold tight. We’re heading to Polus Station — it has the only antenna big enough to answer.']
    ],
    radio: { 2: ['lumi', 'Flying ones! Guards can’t hit those — put Rook up on a high deck!'] }
  },

  /* ================= CHAPTER 2: THE COLD SIGNAL ================= */
  {
    id: 4, chapter: 2, name: 'Cold Reactor', place: 'Polus Station', theme: 'polus',
    cols: 11, rows: 6, startDP: 16, lives: 7, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky'], newCrew: 'sparky',
    routes: [R([[0, 4], [3, 4], [3, 1], [7, 1], [7, 4], [10, 4]]), R([[0, 0], [10, 4]], true)],
    high: [[1, 3], [2, 2], [4, 2], [6, 2], [5, 3], [8, 3], [9, 2], [4, 4], [6, 4]],
    walls: [[0, 5], [10, 5], [10, 0], [1, 0], [9, 0], [0, 1]],
    waves: [
      W(24, ['crawler', 6, 1.2, 0], ['mimic', 1, 1, 0, 6]),
      W(24, ['plated', 1, 1, 0], ['crawler', 6, 1.2, 0, 3]),
      W(26, ['drone', 3, 2.2, 1], ['mimic', 3, 2.8, 0, 2]),
      W(28, ['plated', 2, 5, 0], ['drone', 3, 2.0, 1, 4], ['crawler', 8, 0.9, 0, 8]),
      W(28, ['mimic', 4, 2.4, 0], ['drone', 5, 1.6, 1, 3], ['plated', 1, 1, 0, 14]),
      W(0, ['plated', 3, 4.5, 0], ['drone', 6, 1.5, 1, 2], ['mimic', 4, 2.0, 0, 6], ['crawler', 12, 0.7, 0, 14])
    ],
    pre: [
      ['sparky', 'CAPTAIN! WREN! Hi! I rewired the whole reactor to run on pure vibes and it WORKED! Mostly! There’s a small fire!'],
      ['juno', 'Sparky, step away from the fire. We need the antenna online to answer the Signal.'],
      ['sparky', 'Okay okay okay — but heads up: these new guys are wearing armor plates. Bullets go “ping”. Electricity does NOT go “ping”. Electricity goes “ZZZZT”.'],
      ['juno', 'Sparky’s zaps ignore armor. Use them on anything plated. Drones fly and shoot back — keep your shooters spaced out.']
    ],
    post: [
      ['echo', 'The antenna is up. I’m hearing it clearly now. It’s not a voice. It’s... a lot of voices. All saying the same word.'],
      ['juno', 'Which word?'],
      ['echo', '“Stay.”'],
      ['sparky', 'That is the second creepiest thing I’ve ever heard. First was Brick singing.'],
      ['juno', 'Whatever it is, it’s close. And it can wear faces. Everyone — stay sharp. Anything that looks like family might not be.']
    ],
    radio: { 3: ['sparky', 'ZZZT! Right! Plated ones! Let me cook!'] }
  },
  {
    id: 5, chapter: 2, name: 'The Face Thief', place: 'Admin Deck · Polus Station', theme: 'polus',
    cols: 11, rows: 6, startDP: 18, lives: 7, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo'], newCrew: 'echo',
    routes: [R([[0, 1], [5, 1], [5, 3], [10, 3]]), R([[0, 5], [5, 5], [5, 3]]), R([[0, 0], [10, 3]], true)],
    high: [[3, 2], [3, 4], [4, 2], [4, 4], [6, 2], [6, 4], [8, 2], [8, 4], [2, 3]],
    walls: [[10, 0], [10, 5], [0, 3], [1, 3]],
    waves: [
      W(22, ['crawler', 6, 1.2, 0], ['shifter', 2, 3, 1, 3]),
      W(24, ['shifter', 3, 2.5, 0], ['mimic', 2, 3.0, 1, 3]),
      W(26, ['shifter', 3, 2.2, 1], ['drone', 3, 2.0, 2, 2], ['plated', 1, 1, 0, 5]),
      W(28, ['shifter', 4, 1.8, 0], ['shifter', 3, 2.0, 1, 4], ['mimic', 3, 2.5, 0, 8]),
      W(30, ['plated', 2, 4, 1], ['shifter', 4, 1.6, 0, 4], ['drone', 4, 1.8, 2, 6]),
      W(0, ['shifter', 5, 1.5, 0], ['shifter', 4, 1.5, 1, 3], ['plated', 2, 5, 0, 8], ['brute', 1, 1, 0, 20])
    ],
    pre: [
      ['echo', 'Captain? I’m in Admin. I picked up a second signal — the “stay” voices are coming from the Signal itself, but THIS one is coming from inside the station.'],
      ['mimic', 'Wren! It’s Captain Juno. Disregard the other Juno. Deploy EVERYONE onto the floor. Leave the high decks empty. Immediately.'],
      ['juno', '...I’m standing right behind you, Wren. That is NOT me.'],
      ['echo', 'Shapeshifters. They vanish until they’re close. My scan can reveal them — put me near the front and I’ll light them up for the shooters.']
    ],
    post: [
      ['mimic', 'You are very brave, little crew. Why won’t you stay?'],
      ['juno', 'Because a family that isn’t asked isn’t a family. Goodbye, Face Thief.'],
      ['rook', 'It said “stay” too. Over and over. Captain... the signal on our map. It’s coming from the Meridian, isn’t it?'],
      ['juno', 'The Meridian vanished twenty years ago, Rook. Same route we’re on. You’ve been quiet since we crossed the beacon. Want to tell me why?'],
      ['rook', '...My sister was her pilot. Kestrel.']
    ],
    radio: { 1: ['echo', 'Anything shimmering near the front is a Shapeshifter. I’ll reveal them — you take the shots.'], 6: ['juno', 'That big one is wearing MY voice. Rude.'] }
  },
  {
    id: 6, chapter: 2, name: 'Rooftop Garden', place: 'MIRA HQ · Launch Pad', theme: 'mira',
    cols: 11, rows: 7, startDP: 18, lives: 7, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo'],
    routes: [R([[0, 3], [2, 3], [2, 1], [5, 1], [5, 5], [8, 5], [8, 2], [10, 2]]), R([[0, 6], [10, 2]], true)],
    high: [[1, 2], [3, 2], [4, 3], [6, 3], [7, 4], [9, 3], [6, 6], [3, 5], [4, 5], [9, 1], [1, 4]],
    walls: [[0, 0], [10, 0], [10, 6], [0, 5]],
    waves: [
      W(22, ['mimic', 3, 2.2], ['crawler', 8, 1.0, 0, 4]),
      W(24, ['shifter', 4, 1.6], ['drone', 3, 2.0, 1, 3]),
      W(26, ['plated', 2, 4], ['mimic', 3, 2.0, 0, 3], ['ghost', 4, 1.5, 1, 6]),
      W(28, ['shifter', 5, 1.4], ['drone', 5, 1.5, 1, 2], ['plated', 2, 4, 0, 10]),
      W(30, ['mimic', 6, 1.6], ['plated', 3, 4.0, 0, 5], ['ghost', 6, 1.2, 1, 4], ['shifter', 4, 1.4, 0, 14]),
      W(32, ['plated', 3, 3.0], ['drone', 6, 1.2, 1], ['shifter', 6, 1.2, 0, 8], ['crawler', 14, 0.6, 0, 18]),
      W(0, ['plated', 4, 3.0], ['mimic', 6, 1.4, 0, 4], ['shifter', 6, 1.2, 0, 12], ['drone', 8, 1.0, 1], ['ghost', 8, 1.0, 1, 10])
    ],
    pre: [
      ['rook', 'Sorry. I should have said something sooner. Kestrel taught me to shoot. She’d sneak me onto the roof of MIRA HQ to watch the ships launch.'],
      ['lumi', 'Rook... we’ll find her. I promise. Doctor’s honor.'],
      ['juno', 'We’re at that same rooftop right now. MIRA’s launch pad has the last clean line to the Signal. We hold this garden, then we jump.'],
      ['brick', 'Is it weird that I’m worried about the plants?']
    ],
    post: [
      ['echo', 'Got a lock. The Signal is coming from a derelict hanging in the Fungle belt. Transponder says... MERIDIAN.'],
      ['rook', '...She’s alive in there. I can feel it.'],
      ['juno', 'Then let’s go and get her. Crew — next stop, the Fungle.'],
      ['ship', 'Course set. Warning: the Fungle is “damp, glowy, and extremely opinionated.”']
    ],
    radio: { 3: ['brick', 'If a ghost eats the daisies I’m filing a complaint.'] }
  },

  /* ================= CHAPTER 3: THE HOLLOW ================= */
  {
    id: 7, chapter: 3, name: 'Spore Season', place: 'The Fungle', theme: 'fungle',
    cols: 11, rows: 7, startDP: 20, lives: 6, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo'],
    routes: [R([[0, 1], [8, 1], [8, 3], [2, 3], [2, 5], [10, 5]]), R([[0, 6], [10, 5]], true)],
    high: [[1, 2], [4, 2], [6, 2], [9, 2], [4, 4], [6, 4], [8, 4], [1, 4], [10, 3], [5, 6], [8, 6]],
    walls: [[0, 0], [10, 0], [0, 3], [10, 1]],
    waves: [
      W(22, ['spore', 2, 4], ['crawler', 8, 1.0, 0, 3]),
      W(24, ['spore', 3, 3.5], ['mimic', 3, 2.5, 0, 6]),
      W(26, ['sporelet', 14, 0.6], ['spore', 2, 5, 0, 6], ['drone', 3, 2, 1, 6]),
      W(28, ['spore', 4, 3.0], ['shifter', 4, 1.6, 0, 6], ['plated', 2, 5, 0, 12]),
      W(30, ['sporelet', 18, 0.5], ['spore', 4, 2.8, 0, 4], ['ghost', 6, 1.2, 1, 8]),
      W(0, ['spore', 5, 2.6], ['plated', 3, 4, 0, 6], ['drone', 6, 1.3, 1, 5], ['sporemother', 1, 1, 0, 24])
    ],
    pre: [
      ['lumi', 'Everything here glows. Pretty! ...Unless it’s the kind that glows right before it bites.'],
      ['sparky', 'I like the mushrooms. They hum. We should name one.'],
      ['echo', 'They’re infected — not by hate. By the Signal. I can hear the spores repeating the same word.'],
      ['juno', 'Spore Walkers pop into smaller ones when they fall. Don’t let the little ones slip past while you’re celebrating.']
    ],
    post: [
      ['lumi', 'The Spore Mother’s gone quiet. Wren, look — she’s not wounded, she’s... relieved?'],
      ['echo', 'The Signal let go of her. The moment she fell, the mushrooms stopped humming. It isn’t controlling them to hurt us.'],
      ['echo', 'It’s controlling them because it can’t tell the difference between company and captives.'],
      ['juno', 'Then it needs a better teacher. The Meridian is ahead. Eyes up.']
    ],
    radio: { 3: ['sparky', 'Little ones are FAST. Zap them in clumps!'] }
  },
  {
    id: 8, chapter: 3, name: 'The Long Quiet', place: 'Wreck of the Meridian', theme: 'meridian',
    cols: 11, rows: 7, startDP: 20, lives: 6, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo'],
    routes: [R([[0, 1], [4, 1], [4, 5], [10, 5]]), R([[10, 1], [7, 1], [7, 5]]), R([[0, 0], [10, 5]], true)],
    high: [[2, 2], [3, 4], [5, 3], [6, 3], [8, 3], [9, 3], [5, 2], [6, 4], [2, 5], [9, 6]],
    walls: [[0, 6], [10, 0], [1, 6], [10, 6], [0, 3]],
    waves: [
      W(22, ['mimic', 4, 2.0, 0], ['shifter', 3, 2.4, 1, 3]),
      W(24, ['plated', 2, 4, 0], ['drone', 4, 1.8, 2, 2], ['crawler', 10, 0.8, 1, 4]),
      W(26, ['shifter', 5, 1.4, 0], ['shifter', 4, 1.4, 1, 2], ['ghost', 5, 1.4, 2, 5]),
      W(28, ['spore', 3, 3.0, 0], ['plated', 3, 3.5, 1, 4], ['drone', 5, 1.4, 2, 6]),
      W(30, ['mimic', 8, 1.2, 0], ['mimic', 6, 1.2, 1, 3], ['ghost', 8, 1.0, 2, 8]),
      W(32, ['plated', 4, 3.0, 0], ['plated', 3, 3.0, 1, 4], ['shifter', 6, 1.2, 0, 12], ['drone', 6, 1.2, 2, 6]),
      W(0, ['brute', 1, 1, 0], ['shifter', 8, 1.0, 1, 4], ['plated', 4, 3.0, 0, 10], ['drone', 8, 1.0, 2, 8], ['ghost', 8, 0.9, 2, 14])
    ],
    pre: [
      ['juno', 'The Meridian. Twenty years adrift. Nothing out here should still have its lights on.'],
      ['ship', 'Hull integrity: remarkable. Life signs aboard: 9. ...Captain, I do not understand my own sensors.'],
      ['rook', 'Nine? Captain, her crew was NINE.'],
      ['echo', 'They’re alive. All of them. Asleep. The Signal has been keeping them warm for twenty years.'],
      ['juno', 'Then the monsters aren’t its army. They’re its... attempts. It keeps making company because it doesn’t know how to wake them.'],
      ['hollow', 'S T A Y .']
    ],
    post: [
      ['kestrel', 'Hello...? Is somebody there? Rook?! Is that you?'],
      ['rook', 'KESTREL!'],
      ['kestrel', 'You got tall. You’re — you came all this way?'],
      ['juno', 'Reunion later, please — the Signal doesn’t want us waking them. Every ghost in the wreck is gathering at the Hollow Gate.'],
      ['hollow', 'D O N ’ T . L E A V E . M E .']
    ],
    radio: { 7: ['juno', 'That big one carries the Face Thief’s grudge. Hit it with everything.'] }
  },
  {
    id: 9, chapter: 3, name: 'The Hollow Gate', place: 'Meridian · Core Corridor', theme: 'hollow',
    cols: 12, rows: 7, startDP: 32, lives: 7, scale: 0.8, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo'],
    routes: [R([[0, 1], [4, 1], [4, 5], [8, 5], [8, 2], [11, 2]]), R([[11, 0], [8, 0], [8, 2]]), R([[0, 6], [11, 2]], true)],
    high: [[2, 2], [3, 3], [5, 3], [6, 3], [6, 4], [7, 3], [9, 3], [10, 3], [9, 1], [10, 1], [2, 4], [5, 6]],
    walls: [[0, 0], [0, 3], [11, 6], [11, 5], [11, 4]],
    waves: [
      W(22, ['mimic', 6, 1.4, 0], ['shifter', 4, 1.6, 0, 4], ['ghost', 4, 1.4, 2, 6]),
      W(24, ['plated', 3, 3.0, 0], ['drone', 5, 1.5, 2, 2], ['crawler', 14, 0.6, 1, 4]),
      W(26, ['spore', 4, 2.6, 0], ['shifter', 6, 1.2, 1, 3], ['plated', 2, 4, 0, 10]),
      W(28, ['mimic', 8, 1.0, 0], ['ghost', 10, 0.9, 2, 2], ['plated', 3, 3.0, 1, 8]),
      W(30, ['shifter', 8, 1.0, 0], ['drone', 8, 1.0, 2, 3], ['spore', 4, 2.5, 1, 6], ['plated', 3, 3.0, 0, 14]),
      W(32, ['plated', 5, 2.6, 0], ['plated', 3, 2.6, 1, 4], ['mimic', 8, 1.0, 0, 8], ['ghost', 10, 0.8, 2, 8]),
      W(0, ['brute', 1, 1, 0], ['sporemother', 1, 1, 1, 8], ['shifter', 8, 0.9, 0, 12], ['drone', 10, 0.8, 2, 6], ['plated', 4, 2.4, 0, 16])
    ],
    pre: [
      ['kestrel', '(over the radio) Rook, listen. It isn’t evil. When we crashed, the engines died, the crew was dying, and the Signal — it found us. It put us to sleep to save us.'],
      ['rook', 'And you’ve been asleep since.'],
      ['kestrel', 'It’s been alone here for a very long time. It doesn’t know how to let go.'],
      ['juno', 'Then we’ll teach it. But first we have to get through the Gate. Everything it has left is behind that door.']
    ],
    post: [
      ['echo', 'The Gate is open. The Signal’s heart is in the next chamber. Captain... it’s afraid.'],
      ['juno', 'So are we. That’s what makes it brave. Everyone, one last time.'],
      ['brick', 'Cap’n? ...I’m proud to be your guard.'],
      ['tank', 'Me too. And I’m not scared of the dark anymore. Mostly.']
    ],
    radio: { 7: ['juno', 'Two bosses at once. Wren, trust your crew.'] }
  },
  {
    id: 10, chapter: 3, name: 'Heart of the Hollow', place: 'The Hollow', theme: 'hollow',
    cols: 12, rows: 7, startDP: 36, lives: 6, scale: 0.7, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo'], finale: true,
    routes: [R([[0, 6], [0, 0], [11, 0], [11, 6], [2, 6], [2, 2], [9, 2], [9, 4], [5, 4]]), R([[0, 3], [5, 4]], true)],
    high: [[1, 2], [1, 4], [3, 1], [6, 1], [9, 1], [10, 3], [10, 5], [7, 5], [4, 5], [3, 3], [5, 3], [7, 3], [4, 4]],
    walls: [[1, 6], [10, 1]],
    waves: [
      W(22, ['mimic', 8, 1.2, 0], ['ghost', 6, 1.2, 1, 3]),
      W(24, ['shifter', 8, 1.0, 0], ['drone', 6, 1.4, 1, 3]),
      W(26, ['plated', 4, 3.0, 0], ['spore', 4, 2.6, 0, 6], ['ghost', 8, 1.0, 1, 4]),
      W(28, ['mimic', 10, 0.9, 0], ['plated', 4, 2.8, 0, 8], ['drone', 8, 1.0, 1, 4]),
      W(30, ['shifter', 10, 0.9, 0], ['spore', 5, 2.4, 0, 6], ['ghost', 10, 0.8, 1, 4], ['plated', 4, 3.0, 0, 18]),
      W(0, ['heart', 1, 1, 0], ['plated', 4, 2.6, 0, 22], ['drone', 8, 1.2, 1, 14], ['shifter', 8, 1.0, 0, 30])
    ],
    pre: [
      ['hollow', 'You came. Everyone leaves. I made them stay. I made them stay and stay and stay.'],
      ['echo', 'Wren, it’s not talking to us. It’s talking to itself.'],
      ['juno', 'We can’t reason with a signal this loud, so we’ll quiet it down — gently. Break its defenses, reach the Heart. Then Echo answers.'],
      ['echo', 'I’ll be ready. I just need to hear it stop shouting.'],
      ['juno', 'HALCYON, all hands. Wren — this one’s yours.']
    ],
    post: [
      ['echo', 'Hello. Hello, Signal. We’re here. You can stop making company. You have it.'],
      ['hollow', '...hello?'],
      ['kestrel', 'We were never leaving because we hated you. We just wanted to go home. You can come too.'],
      ['hollow', 'Home... is it warm?'],
      ['juno', 'It’s noisy. It’s messy. There’s a lot of Brick. You’ll love it.'],
      ['brick', 'HEY.']
    ],
    radio: { 6: ['juno', 'That’s the Heart. It will call for help three times. Armor-breakers ready!'] }
  }
];

const CHAPTERS = [
  { id: 1, name: 'Wake Up', sub: 'The HALCYON stirs', color: '#42e8ff' },
  { id: 2, name: 'The Cold Signal', sub: 'Something wearing faces', color: '#c6a0ff' },
  { id: 3, name: 'The Hollow', sub: 'Who is knocking?', color: '#ff8a6b' }
];

const DIFFICULTY = {
  crew: { name: 'Crew', desc: 'Relaxed and friendly. Perfect for little commanders.', hp: 0.7, atk: 0.7, dp: 1.4, startDP: 6, lives: 3 },
  captain: { name: 'Captain', desc: 'The intended experience.', hp: 1, atk: 1, dp: 1, startDP: 0, lives: 0 },
  impostor: { name: 'Impostor', desc: 'Tough foes. Slow DP. For grown-up commanders.', hp: 1.4, atk: 1.25, dp: 0.9, startDP: 0, lives: -2 }
};

/* ---------- Difficulty ramp ----------
   Each mission's waves are authored at full strength, then the opening waves are eased
   so the player always has time to build up before the heavy hitters arrive. */
(function ramp() {
  LEVELS.forEach(l => {
    const start = l.id <= 1 ? 1 : l.id <= 3 ? 0.8 : 0.5, steps = l.waves.length;
    l.waves.forEach((w, i) => {
      const f = Math.min(1, start + (1 - start) * (i / Math.max(1, steps - 3)));
      w.spawns.forEach(sp => { if (!FOES[sp.type].boss) sp.n = Math.max(1, Math.round(sp.n * f * (l.scale || 1))); });
      if (w.dur && l.id >= 4) w.dur += 3;
    });
  });
})();
