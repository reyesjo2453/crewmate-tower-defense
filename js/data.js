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
  },
  /* ---- Chapter 4 crew ---- */
  wrench: {
    name: 'Wrench', role: 'Engineer', color: '#f07a1a', hat: 'welder', ground: 'high',
    cost: 11, hp: 330, atk: 0, repair: 60, interval: 1.2, def: 6, block: 0, range: 1.6, builds: true,
    skill: { name: 'Reinforce', desc: 'Fully repairs the barricade and lets it hold 3 foes for 12 seconds.', sp: 20, dur: 12 },
    blurb: 'Builds a barricade on the nearest floor path that holds back two foes, and keeps it patched up.',
    tip: 'Place on a high deck right next to the floor path.'
  },
  marshal: {
    name: 'Marshal', role: 'Sheriff', color: '#8a5a2b', hat: 'cowboy', ground: 'high',
    cost: 13, hp: 280, atk: 150, interval: 2.4, def: 4, block: 0, range: 4.6, pierce: true, strongest: true,
    skill: { name: 'Dead Eye', desc: 'Fires three times as fast for 6 seconds.', sp: 22, dur: 6 },
    blurb: 'Huge range. Slow, powerful shots that punch through half of any armor — and always at the toughest foe.',
    tip: 'Place on any high deck — she can reach almost anywhere.'
  },
  bubbles: {
    name: 'Bubbles', role: 'Guardian', color: '#ff6fb5', hat: 'bubble', ground: 'high',
    cost: 10, hp: 360, atk: 0, interval: 4.5, def: 6, block: 0, range: 2.6, shields: true,
    skill: { name: 'Bubble Party', desc: 'Every crewmate nearby gets a bubble shield.', sp: 24, dur: 0 },
    blurb: 'Wraps a friend in a bubble that soaks up the next hit completely. Loves big guards.',
    tip: 'Place on a high deck near your guards.'
  }
};
// "show me" coaching: the first time a new crewmate joins, they explain where to stand
const SHOWME = {
  tank: { say: 'Hi! I’m Tank! Put me on the FLOOR where foes walk — I can hold back THREE at once!', after: 'Comfy! I’ll hold them still — let Brick and Rook do the hitting.' },
  lumi: { say: 'Put me on a high deck right next to a guard, and I’ll keep them healed up!', after: 'Green sparkles mean I’m healing. Keep me close to the fighting!' },
  sparky: { say: 'Plated foes laugh at bullets! Put me on a deck where they bunch up — my zaps ignore armor!', after: 'ZZZT! Later, tap me and press SKILL to chain the lightning!' },
  echo: { say: 'Shimmery foes are Shapeshifters. Put me near the front — my ping reveals them AND slows everything!', after: 'Listening... Anything I ping gets slower. Shooters love me.' },
  wrench: { say: 'Put me on a deck right NEXT to the floor path. I’ll build a barricade on the path that holds back two foes!', after: null },
  marshal: { say: 'Put me on any high deck, partner. Longest range on the ship — and I always aim for the toughest foe.', after: 'Slow and steady. Each shot punches through half their armor.' },
  bubbles: { say: 'Put me on a deck next to your guards! I wrap them in bubbles that block a whole hit!', after: 'Pop! A bubble soaks the next hit — even a beetle’s boom!' }
};
const CREW_ORDER = ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo', 'wrench', 'marshal', 'bubbles'];
/* ---------- Combos ----------
   Two crewmates standing within COMBO_RANGE tiles of each other team up for a bonus.
   fx multiplies stats per crew type (atk, def, interval, heal, aoe, sp = skill charge speed, hp);
   'barricade' applies to Wrench's barricade while Wrench is in the combo. */
const COMBO_RANGE = 2.25;
const COMBOS = [
  { id: 'buds', pair: ['brick', 'tank'], name: 'Best Buds', icon: '🤝', color: '#ff8a6a', desc: 'Brick and Tank side by side: both get 30% more armor and hit 15% harder.', fx: { brick: { def: 1.3, atk: 1.15 }, tank: { def: 1.3, atk: 1.15 } } },
  { id: 'spotter', pair: ['echo', 'rook'], name: 'Spotter', icon: '🎯', color: '#7ddcff', desc: 'Echo spots targets for Rook: Rook hits 30% harder.', fx: { rook: { atk: 1.3 } } },
  { id: 'care', pair: ['lumi', 'bubbles'], name: 'Care Team', icon: '💗', color: '#ff9ad6', desc: 'Lumi heals 30% more and Bubbles blows bubbles 30% faster.', fx: { lumi: { heal: 1.3 }, bubbles: { interval: 0.77 } } },
  { id: 'crossfire', pair: ['rook', 'marshal'], name: 'Crossfire', icon: '✖', color: '#ffb35a', desc: 'Rook and Marshal both shoot 15% faster.', fx: { rook: { interval: 0.87 }, marshal: { interval: 0.87 } } },
  { id: 'rod', pair: ['sparky', 'tank'], name: 'Lightning Rod', icon: '⚡', color: '#fff27a', desc: 'Tank holds foes still for Sparky: zaps spread 35% wider and hit 10% harder.', fx: { sparky: { aoe: 1.35, atk: 1.1 } } },
  { id: 'hardhats', pair: ['wrench', 'brick'], name: 'Hard Hats', icon: '⛑', color: '#ffcc1f', desc: 'Wrench’s barricade gets 40% more health and Brick hits 15% harder.', fx: { brick: { atk: 1.15 }, barricade: { hp: 1.4 } } },
  { id: 'static', pair: ['sparky', 'echo'], name: 'Static Ping', icon: '📡', color: '#9ffcff', desc: 'Sparky and Echo charge each other up: both skills charge 25% faster.', fx: { sparky: { sp: 1.25 }, echo: { sp: 1.25 } } }
];
const combosFor = type => COMBOS.filter(c => c.pair.includes(type));

// Wrench's barricade: a crew-like blocker that lives on a floor tile
const BARRICADE = { name: 'Barricade', hp: 650, def: 25, block: 2, buildT: 2.5, rebuildT: 7 };
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
  },
  /* ---- Chapter 4 foes ---- */
  mite: {
    name: 'Rock Mite', hp: 240, spd: 0.95, atk: 30, interval: 1.0, def: 20, weight: 1, leak: 1, size: 0.62, burrow: { up: 2.6, down: 1.8 },
    lore: 'Chews through asteroid rock like it’s cookie dough. Pops up, pops down, pops up again.',
    tip: 'Burrows UNDER guards. Hit it while it’s up!'
  },
  leech: {
    name: 'Power Leech', hp: 300, spd: 0.6, atk: 0, interval: 1, def: 5, weight: 1, leak: 1, size: 0.8, flying: true, drain: 0.3,
    lore: 'Floats toward anything that hums, then drinks the power right out of it.',
    tip: 'Flies, and drains your DP while it’s alive. Shoot it fast!'
  },
  golem: {
    name: 'Ore Golem', hp: 1050, spd: 0.38, atk: 100, interval: 1.8, def: 60, weight: 2, leak: 2, size: 1.2, steady: true,
    lore: 'A pile of ore that decided to get up and walk. It does not stop for pings.',
    tip: 'Very armored and can’t be slowed. Marshal and Sparky crack it.'
  },
  bomber: {
    name: 'Blast Beetle', hp: 200, spd: 1.05, atk: 240, interval: 1, def: 0, weight: 1, leak: 1, size: 0.7, explodes: 1.25,
    lore: 'Carries a little blasting charge on its back and is VERY excited about it.',
    tip: 'Explodes when it reaches a guard. Bubble shields soak the blast!'
  },
  foreman: {
    name: 'The Foreman', hp: 9000, spd: 0.26, atk: 180, interval: 2.0, def: 40, weight: 3, leak: 8, size: 1.7, boss: true,
    drill: { every: 9, dur: 2.4, spd: 1.3 }, summon: { type: 'mite', n: 2, every: 8 },
    lore: 'The rig’s giant drill, wearing the last loud piece of the Signal like a crown.',
    tip: 'BOSS. Drills underground to dodge and calls Rock Mites.'
  },
  /* ---- Chapter 5 foes: they help each other ---- */
  mender: {
    name: 'Mender Moth', hp: 360, spd: 0.62, atk: 28, interval: 1.2, def: 8, weight: 1, leak: 1, size: 0.8, mend: { r: 1.6, hps: 30 },
    lore: 'A fuzzy moth that sprinkles glittery dust on its friends. The dust patches them right up.',
    tip: 'Heals foes around it. Knock it out FIRST!'
  },
  warden: {
    name: 'Warden', hp: 950, spd: 0.4, atk: 70, interval: 1.6, def: 30, weight: 2, leak: 2, size: 1.15, ward: { r: 1.7, cut: 0.45 },
    lore: 'Carries a lantern that throws a blue shield over everyone nearby. Never over itself, though.',
    tip: 'Foes near it take about half damage. Take the Warden down, then the rest.'
  },
  rally: {
    name: 'Cheer Drone', hp: 270, spd: 0.8, atk: 0, interval: 1, def: 5, weight: 1, leak: 1, size: 0.75, flying: true, rally: { r: 1.8, boost: 1.4 },
    lore: 'A party drone blasting music. Everything that hears it starts running to the beat.',
    tip: 'Flies, and makes nearby foes run faster. Shoot it down; Echo slows them back.'
  },
  conductor: {
    name: 'The Conductor', hp: 10500, spd: 0.25, atk: 170, interval: 2.0, def: 30, weight: 3, leak: 10, size: 1.4, boss: true, barY: 200,
    songs: { every: 8, r: 3.2, list: ['haste', 'mend', 'ward'], boost: 1.45, hps: 45, cut: 0.45 },
    phases: [{ at: 0.66, spawn: ['rally', 3, 0.8] }, { at: 0.33, spawn: ['warden', 2, 1.6] }],
    lore: 'The leftover signals’ choir leader. It waves its baton and every foe nearby plays along.',
    tip: 'BOSS. Changes song every few seconds: RED = fast, GREEN = healing, BLUE = shielded.'
  }
};
// the Conductor's songs: colour + what it does to every foe around it
const SONGS = {
  haste: { name: 'Fast Song', color: '#ff5a6a', rgb: '255,90,106', tip: 'RED song — foes run faster! Slow them with Echo, slam a door!' },
  mend: { name: 'Healing Song', color: '#5af07a', rgb: '90,240,122', tip: 'GREEN song — foes are healing! Hit hard now!' },
  ward: { name: 'Shield Song', color: '#5ab8ff', rgb: '90,184,255', tip: 'BLUE song — foes are shielded. Save your skills for the next song!' }
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
  },
  rig: {
    name: 'Ferrous Deep Mining Rig', bg: '#120c08', wall: '#4a3426', wallTop: '#6e4e38', floorA: '#6f6762', floorB: '#675f5a', seam: '#4a423f',
    path: '#3b302a', pathEdge: '#1e1713', high: '#b3a493', highEdge: '#5a4c40', arrow: 'rgba(255,170,60,.6)', glow: '#ffa63d',
    decor: ['ore', 'drill', 'cart', 'rock'], wallKind: 'rock', sky: ['#1b1210', '#3a2216']
  },
  haven: {
    name: 'Haven Station', bg: '#0b1222', wall: '#34405e', wallTop: '#4d5d86', floorA: '#9cc4b4', floorB: '#93baab', seam: '#729c8c',
    path: '#56637d', pathEdge: '#323b50', high: '#ece5cc', highEdge: '#a59a74', arrow: 'rgba(255,232,150,.6)', glow: '#ffd66b',
    decor: ['lamp', 'speaker', 'planter', 'bench'], wallKind: 'glass', sky: ['#101a36', '#2a1d4a']
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
  ship: { name: 'HALCYON', color: '#6b7a90', hat: 'none', ai: true },
  wrench: { name: 'Wrench', color: '#f07a1a', hat: 'welder' },
  marshal: { name: 'Marshal', color: '#8a5a2b', hat: 'cowboy' },
  bubbles: { name: 'Bubbles', color: '#ff6fb5', hat: 'bubble' },
  friend: { name: 'Hollow', color: '#9a7ae0', hat: 'none', ghost: true },
  static: { name: 'The Static', color: '#3a2a20', hat: 'none', dark: true },
  maestro: { name: 'The Conductor', color: '#2c3c66', hat: 'none', dark: true }
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
const EPILOGUE2 = [
  'The Ferrous Deep lit up from top to bottom,\nevery window full of miners waving.',
  'The Hollow was whole again —\nnot loud, not lonely.\nJust listening.',
  'And when the HALCYON finally docked,\nthe whole crew stepped off together.\n\nThe Signal said: “Thank you.”'
];

const EPILOGUE3 = [
  'The broadcast tower still sings every night —\nsoftly now, a lullaby\nfor the whole station.',
  'The leftover signals found new jobs:\nnight-lights, door chimes,\nand one very proud lighthouse.',
  'And the crew of the HALCYON\nnever heard “stay” again.\n\nJust: “See you tomorrow.”'
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
    cols: 11, rows: 7, startDP: 22, lives: 6, scale: 0.9, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo'],
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
  },

  /* ================= CHAPTER 4: THE LONG WAY HOME ================= */
  {
    id: 11, chapter: 4, name: 'Hello, Ferrous Deep', place: 'Cargo Dock · Ferrous Deep', theme: 'rig',
    cols: 11, rows: 6, startDP: 22, lives: 7, scale: 0.9, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo', 'wrench'], newCrew: 'wrench',
    routes: [R([[0, 1], [3, 1], [3, 4], [7, 4], [7, 1], [10, 1]]), R([[0, 5], [10, 1]], true)],
    high: [[1, 2], [2, 2], [4, 2], [5, 2], [5, 3], [6, 2], [4, 5], [6, 5], [8, 2], [8, 3], [9, 2], [2, 0], [5, 0]],
    walls: [[0, 0], [10, 5], [0, 4]],
    doors: [[5, 4]], sabo: { 3: 'lights' },
    waves: [
      W(22, ['crawler', 8, 1.0], ['mite', 2, 3, 0, 4]),
      W(24, ['mite', 5, 1.8], ['mimic', 3, 2.4, 0, 4]),
      W(26, ['mite', 6, 1.4], ['drone', 3, 2, 1, 3], ['plated', 1, 1, 0, 10]),
      W(28, ['shifter', 5, 1.4], ['mite', 8, 1.0, 0, 4], ['ghost', 4, 1.4, 1, 6]),
      W(30, ['plated', 3, 3.5], ['mite', 10, 0.9, 0, 6], ['drone', 5, 1.4, 1, 4]),
      W(0, ['mite', 12, 0.8], ['plated', 3, 3, 0, 6], ['spore', 3, 3, 0, 12], ['ghost', 6, 1.0, 1, 8])
    ],
    pre: [
      ['ship', 'Incoming transmission. Origin: the Ferrous Deep mining rig. Content: “...hello? Is anybody out there? Please?”'],
      ['juno', 'That’s the second signal. It isn’t the Hollow this time — it’s a person. Set a course.'],
      ['friend', '(softly) I know the static around that voice. When I went quiet, little pieces of me scattered. Some of them are still shouting “stay”.'],
      ['wrench', 'Oh, thank goodness — a real ship! I’m Wrench, rig engineer. The machines went haywire and the miners are hiding down below. And these Rock Mites keep digging UNDER my barricades!'],
      ['juno', 'Wrench, you build — we’ll hold. Commander, Rock Mites burrow under guards. Hit them when they pop up.']
    ],
    post: [
      ['wrench', 'First time this dock has been quiet all week. Count me in — my barricades don’t mind getting chewed on.'],
      ['friend', 'The loudest piece of me is deeper down. In the big drill. It thinks it’s keeping the miners safe by keeping them in.'],
      ['marshal', '(over the radio) Whoever’s up there making that racket — a Magnet Storm’s rolling in. Get to the ore lift and I’ll cover you.'],
      ['juno', 'Who was THAT?'],
      ['wrench', 'Marshal. The rig’s sheriff. Best shot in the belt. Terrible at hellos.']
    ],
    radio: { 2: ['wrench', 'See the dirt mounds? Mites underground! Wait for them to pop up.'], 5: ['brick', 'I keep blocking them and they keep going UNDER me! Rude!'] }
  },
  {
    id: 12, chapter: 4, name: 'Magnet Storm', place: 'Ore Lift · Ferrous Deep', theme: 'rig',
    cols: 12, rows: 7, startDP: 26, lives: 7, scale: 0.85, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo', 'wrench', 'marshal'], newCrew: 'marshal',
    routes: [R([[0, 2], [5, 2], [5, 5], [11, 5]]), R([[11, 0], [8, 0], [8, 5]]), R([[0, 0], [11, 5]], true)],
    high: [[2, 1], [3, 3], [4, 1], [4, 3], [6, 3], [6, 4], [7, 1], [7, 3], [9, 2], [9, 4], [10, 4], [6, 6], [9, 6], [1, 3]],
    walls: [[11, 6], [0, 6], [11, 1]],
    doors: [[3, 2], [8, 2]], sabo: { 2: 'o2', 5: 'reactor' },
    waves: [
      W(22, ['mimic', 5, 1.6], ['leech', 2, 3, 2, 4]),
      W(24, ['golem', 1, 1, 0], ['crawler', 10, 0.8, 1, 3], ['leech', 3, 2.4, 2, 6]),
      W(26, ['mite', 6, 1.4, 1], ['golem', 2, 5, 0, 2], ['drone', 3, 2, 2, 6]),
      W(28, ['shifter', 6, 1.2, 0], ['leech', 5, 1.6, 2, 3], ['plated', 2, 4, 1, 6]),
      W(30, ['golem', 3, 4, 0], ['mite', 8, 1.0, 1, 2], ['leech', 6, 1.3, 2, 8]),
      W(32, ['plated', 4, 3, 1], ['golem', 2, 5, 0, 4], ['shifter', 6, 1.1, 0, 10], ['ghost', 8, 1, 2, 6]),
      W(0, ['golem', 4, 3.5, 0], ['leech', 8, 1.0, 2, 2], ['mite', 12, 0.7, 1, 6], ['brute', 1, 1, 0, 20])
    ],
    pre: [
      ['marshal', 'Name’s Marshal. Keep your heads down — the storm pulls every loose bolt in the belt toward this lift. Including the walking ones.'],
      ['sparky', 'Is that a MAGNET STORM?! My hair is standing up! I don’t even HAVE hair!'],
      ['marshal', 'Power Leeches ride the storm. They float in and drink your power dry, so knock ’em out quick. And the Ore Golems? Armor like a bank vault.'],
      ['marshal', 'Lucky for you, I don’t miss.']
    ],
    post: [
      ['marshal', '...Fine. You’re good. Real good.'],
      ['bubbles', '(from a vent) Is it safe? Marshal? Are the big rock guys gone? I made everybody bubble shields but they keep POPPING!'],
      ['wrench', 'Bubbles! She’s the miners’ kid — been keeping everybody safe down in the lower decks.'],
      ['juno', 'Then let’s go and get them. Bubbles, stay put. We’re coming down.']
    ],
    radio: { 1: ['marshal', 'Leeches! Pop them before they drain your power.'], 2: ['sparky', 'Golems shrug off pings. Zap ’em, or let Marshal handle it!'], 7: ['juno', 'The Face Thief again?! Just a leftover echo. Same trick, same answer.'] }
  },
  {
    id: 13, chapter: 4, name: 'Pressure Point', place: 'Lower Decks · Ferrous Deep', theme: 'rig',
    cols: 12, rows: 7, startDP: 30, lives: 7, scale: 0.72, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo', 'wrench', 'marshal', 'bubbles'], newCrew: 'bubbles',
    routes: [R([[0, 1], [6, 1], [6, 3], [2, 3], [2, 5], [11, 5]]), R([[11, 0], [9, 0], [9, 5]]), R([[0, 6], [11, 5]], true)],
    high: [[1, 2], [3, 2], [5, 2], [7, 2], [3, 4], [4, 4], [6, 4], [8, 4], [10, 4], [8, 1], [10, 1], [1, 4], [7, 6], [4, 6]],
    walls: [[0, 0], [11, 6], [0, 4]],
    doors: [[4, 1], [9, 3]], sabo: { 3: 'lights', 6: 'reactor' },
    waves: [
      W(22, ['bomber', 3, 2.5], ['crawler', 8, 1.0, 1, 3]),
      W(24, ['bomber', 4, 1.8, 1], ['mimic', 4, 2, 0, 3], ['leech', 2, 3, 2, 6]),
      W(26, ['mite', 6, 1.2, 0], ['bomber', 5, 1.5, 1, 4], ['golem', 1, 1, 0, 8]),
      W(28, ['plated', 3, 3, 0], ['bomber', 6, 1.2, 1, 2], ['ghost', 6, 1.2, 2, 4], ['shifter', 4, 1.4, 0, 10]),
      W(30, ['golem', 2, 5, 1], ['bomber', 8, 1.0, 0, 4], ['leech', 6, 1.2, 2, 2], ['spore', 3, 3, 0, 12]),
      W(32, ['mite', 10, 0.8, 0], ['bomber', 8, 0.9, 1, 4], ['plated', 4, 3, 0, 8], ['drone', 6, 1.2, 2, 6]),
      W(0, ['golem', 3, 4, 0], ['bomber', 10, 0.8, 1], ['sporemother', 1, 1, 0, 16], ['leech', 8, 1, 2, 6], ['mite', 10, 0.8, 1, 10])
    ],
    pre: [
      ['bubbles', 'Hi! I’m Bubbles! I’m eight and three-quarters! The beetles have little bombs on their backs and they go BOOM when they touch you!'],
      ['tank', '...I would like to not be touched by those.'],
      ['bubbles', 'That’s what my bubbles are for! A bubble eats one boom. Or one bonk. Or one anything!'],
      ['juno', 'Shield the guards, Bubbles. Commander — the miners are right behind us. Nothing gets past this deck.']
    ],
    post: [
      ['bubbles', 'We did it! Everybody’s safe! Marshal, did you see? I bubbled TANK!'],
      ['marshal', 'I saw, kid.'],
      ['friend', 'There it is. The last loud piece of me — inside the big drill. It’s scared. It thinks if everyone stays down here, nobody can ever leave it.'],
      ['wrench', 'The Foreman. Biggest drill on the rig. If that thing wakes up, it’ll dig straight through the lower decks.'],
      ['juno', 'Then we stop it at the core. Last stop, everyone. Then we go home.']
    ],
    radio: { 1: ['bubbles', 'BEETLES! Bubble your guards so the booms bounce off!'], 7: ['lumi', 'The Spore Mother? Down HERE? The static must have carried a spore. Stay focused!'] }
  },
  {
    id: 14, chapter: 4, name: 'The Foreman', place: 'Core Shaft · Ferrous Deep', theme: 'rig', finale2: true,
    cols: 12, rows: 7, startDP: 40, lives: 8, scale: 0.62, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo', 'wrench', 'marshal', 'bubbles'],
    routes: [R([[0, 0], [3, 0], [3, 3], [0, 3], [0, 6], [6, 6], [6, 3], [9, 3], [9, 6], [11, 6]]), R([[11, 0], [8, 0], [8, 3]]), R([[0, 1], [11, 6]], true)],
    high: [[1, 1], [2, 1], [1, 2], [4, 2], [4, 4], [1, 4], [1, 5], [2, 5], [5, 4], [5, 5], [7, 4], [7, 5], [8, 5], [7, 2], [10, 4], [10, 5], [9, 1]],
    walls: [[11, 3], [5, 1]],
    doors: [[3, 2], [6, 4], [10, 0]], sabo: { 2: 'lights', 4: 'o2', 6: 'reactor' },
    waves: [
      W(22, ['mite', 8, 1.0, 0], ['bomber', 4, 1.6, 1, 4]),
      W(24, ['golem', 2, 4, 0], ['leech', 4, 1.8, 2, 3], ['crawler', 12, 0.6, 1, 4]),
      W(26, ['bomber', 8, 1.0, 1], ['plated', 3, 3, 0, 4], ['ghost', 6, 1.2, 2, 6]),
      W(28, ['mite', 12, 0.8, 0], ['golem', 2, 4, 1, 6], ['leech', 6, 1.2, 2, 4]),
      W(30, ['shifter', 8, 1.0, 0], ['bomber', 10, 0.8, 1, 4], ['drone', 6, 1.2, 2, 8], ['golem', 2, 5, 0, 14]),
      W(0, ['foreman', 1, 1, 0], ['mite', 12, 0.9, 1, 10], ['bomber', 10, 1.0, 0, 22], ['leech', 8, 1.2, 2, 14], ['golem', 3, 5, 1, 26])
    ],
    pre: [
      ['static', 'STAY DOWN. STAY SAFE. STAY. STAY. STAY.'],
      ['friend', 'That’s me. The part of me that never learned anything. I’m sorry.'],
      ['echo', 'Don’t be. You learned. It can too — it just needs to be heard first.'],
      ['marshal', 'It drills underground to dodge my shots. When it surfaces, everybody let it have it.'],
      ['juno', 'All hands. Wren — bring them home.']
    ],
    post: [
      ['static', '...stay?'],
      ['friend', 'Come here. It’s okay. We don’t have to keep anyone anymore. We get to visit.'],
      ['wrench', 'The drill’s powering down. Miners are coming up the lift. Captain — they’re CHEERING.'],
      ['bubbles', 'Can Hollow come to my class? For show and tell?'],
      ['friend', '...I would like that very much.'],
      ['juno', 'HALCYON, set a course. Home — the long way round, with everybody aboard.']
    ],
    radio: { 6: ['wrench', 'The Foreman! It drills under everything — wait for it to surface, then hit it hard!'] }
  },

  /* ================= CHAPTER 5: THE CHOIR ================= */
  {
    id: 15, chapter: 5, name: 'Welcome Home?', place: 'Docking Ring · Haven Station', theme: 'haven',
    cols: 11, rows: 6, startDP: 22, lives: 7, scale: 1.1, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo', 'wrench', 'marshal', 'bubbles'],
    routes: [R([[0, 2], [4, 2], [4, 4], [8, 4], [8, 1], [10, 1]]), R([[0, 5], [10, 1]], true)],
    high: [[1, 1], [3, 1], [2, 3], [3, 3], [5, 3], [6, 3], [7, 2], [6, 1], [5, 5], [7, 5], [3, 5], [9, 2], [9, 3]],
    walls: [[0, 0], [10, 5], [10, 4]],
    doors: [[6, 4]], sabo: { 3: 'lights' },
    waves: [
      W(22, ['crawler', 8, 1.0], ['mender', 1, 1, 0, 6]),
      W(24, ['mimic', 4, 2.0], ['mender', 2, 3, 0, 3], ['ghost', 3, 1.6, 1, 4]),
      W(26, ['mite', 6, 1.2], ['mimic', 3, 2, 0, 4], ['mender', 2, 3, 0, 8]),
      W(28, ['plated', 2, 4], ['mender', 3, 2.4, 0, 2], ['crawler', 10, 0.7, 0, 6], ['drone', 3, 2, 1, 6]),
      W(30, ['spore', 3, 3], ['mender', 3, 2, 0, 4], ['shifter', 5, 1.3, 0, 8], ['ghost', 6, 1, 1, 4]),
      W(0, ['golem', 2, 5], ['mender', 4, 1.8, 0, 3], ['mimic', 8, 1.2, 0, 6], ['drone', 5, 1.4, 1, 10])
    ],
    pre: [
      ['ship', 'Docking at Haven Station. Welcome home, crew.'],
      ['juno', 'Home! Hot showers, real food, and nobody whispering “stay”.'],
      ['friend', '...Do you hear that? A song. Lots of little voices, singing together.'],
      ['echo', 'It’s coming from the broadcast tower. The other leftover signals — they found each other.'],
      ['friend', 'They watched you on the long way home. They saw how you help each other. Now they’re trying it too — but they think teamwork means winning.'],
      ['juno', 'Then we show them how it’s really done. Commander: crewmates who stand close together make COMBOS. Try Brick right next to Tank!']
    ],
    post: [
      ['brick', 'Did you SEE that? Me and Tank — BEST BUDS!'],
      ['tank', '...the very best.'],
      ['rook', 'Those moths kept patching the others up. Menders. Knock them out first.'],
      ['friend', 'The song is louder in the market. Something there is making shields.']
    ],
    radio: { 1: ['juno', 'Crewmates close together team up — look for the glowing link! Brick and Tank, Echo and Rook…'], 2: ['lumi', 'That moth is HEALING them! Hit the Mender first!'], 5: ['echo', 'Rook — stand near me. I’ll call out the weak spots.'] }
  },
  {
    id: 16, chapter: 5, name: 'Shield Wall', place: 'Market Deck · Haven Station', theme: 'haven',
    cols: 12, rows: 7, startDP: 30, lives: 7, scale: 0.9, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo', 'wrench', 'marshal', 'bubbles'],
    routes: [R([[0, 1], [5, 1], [5, 5], [11, 5]]), R([[11, 0], [8, 0], [8, 5]]), R([[0, 6], [11, 5]], true)],
    high: [[1, 2], [2, 2], [3, 2], [4, 3], [3, 4], [6, 2], [6, 3], [7, 2], [7, 4], [9, 1], [9, 2], [9, 3], [10, 4], [4, 6], [7, 6], [10, 6]],
    walls: [[0, 0], [11, 6], [2, 6]],
    doors: [[3, 1], [8, 2]], sabo: { 2: 'o2', 5: 'reactor' },
    waves: [
      W(22, ['mimic', 5, 1.6], ['warden', 1, 1, 0, 6]),
      W(24, ['warden', 1, 1, 0], ['crawler', 10, 0.8, 0, 2], ['mender', 2, 3, 1, 4], ['ghost', 3, 1.5, 2, 6]),
      W(26, ['plated', 2, 4, 1], ['warden', 2, 5, 0, 2], ['mimic', 5, 1.4, 0, 4], ['drone', 3, 2, 2, 6]),
      W(28, ['golem', 2, 4, 0], ['warden', 1, 1, 1, 2], ['mender', 3, 2, 1, 4], ['shifter', 5, 1.2, 0, 8]),
      W(30, ['warden', 3, 4, 0], ['spore', 3, 3, 1, 2], ['mender', 3, 2, 0, 6], ['leech', 4, 1.5, 2, 4]),
      W(32, ['plated', 4, 3, 0], ['warden', 2, 5, 1, 2], ['mite', 10, 0.8, 0, 6], ['drone', 6, 1.2, 2, 6]),
      W(0, ['warden', 4, 3, 0], ['golem', 3, 4, 1, 2], ['mender', 4, 2, 0, 6], ['mimic', 10, 0.9, 1, 8], ['ghost', 8, 1, 2, 6])
    ],
    pre: [
      ['lumi', 'See the blue glow? That’s a Warden. Anything standing near it takes about half damage.'],
      ['marshal', 'Big, slow, and important. My favourite kind of target.'],
      ['bubbles', 'It’s copying MY shields! Rude!'],
      ['juno', 'Take the Wardens down first and the rest crumble. Rook and Marshal side by side make a Crossfire, too.']
    ],
    post: [
      ['bubbles', 'Their shields were okay. Mine are better. Mine have SPARKLES.'],
      ['echo', 'The next song is coming from the concert hall. It’s... very upbeat.'],
      ['sparky', 'Is it a PARTY? Please say it’s a party.']
    ],
    radio: { 1: ['marshal', 'Warden on the floor. I’ll handle the big one — you mop up.'], 3: ['wrench', 'Brick, stand by my barricade — Hard Hats! We’ll make it twice as tough.'], 7: ['juno', 'Four Wardens! Focus them one at a time!'] }
  },
  {
    id: 17, chapter: 5, name: 'Pep Rally', place: 'Concert Hall · Haven Station', theme: 'haven',
    cols: 12, rows: 7, startDP: 28, lives: 7, scale: 1.2, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo', 'wrench', 'marshal', 'bubbles'],
    routes: [R([[0, 3], [3, 3], [3, 1], [7, 1], [7, 5], [11, 5]]), R([[11, 0], [9, 0], [9, 5]]), R([[0, 0], [11, 5]], true)],
    high: [[1, 2], [2, 2], [1, 4], [2, 4], [4, 2], [5, 2], [6, 2], [4, 4], [5, 4], [6, 4], [8, 2], [8, 3], [10, 2], [10, 3], [6, 6], [8, 6], [10, 6], [4, 0]],
    walls: [[11, 6], [0, 6], [5, 0]],
    doors: [[5, 1], [9, 3]], sabo: { 3: 'lights', 6: 'o2' },
    waves: [
      W(22, ['crawler', 10, 0.8], ['rally', 1, 1, 2, 6]),
      W(24, ['rally', 2, 3, 2], ['mimic', 5, 1.4, 0, 2], ['crawler', 8, 0.7, 1, 6]),
      W(26, ['bomber', 6, 1.2, 0], ['rally', 2, 3, 2, 2], ['mender', 2, 3, 1, 4], ['warden', 1, 1, 0, 10]),
      W(28, ['shifter', 6, 1.2, 0], ['rally', 3, 2, 2, 3], ['mite', 8, 1, 1, 4], ['leech', 3, 2, 2, 8]),
      W(30, ['warden', 2, 4, 0], ['bomber', 8, 1, 1, 2], ['rally', 4, 1.8, 2, 4], ['mimic', 8, 1, 0, 8]),
      W(32, ['golem', 2, 5, 1], ['rally', 4, 1.6, 2, 2], ['mender', 3, 2, 0, 6], ['crawler', 14, 0.5, 0, 10], ['drone', 4, 1.5, 2, 8]),
      W(0, ['rally', 6, 1.2, 2], ['warden', 3, 3, 0, 2], ['bomber', 10, 0.8, 1, 4], ['plated', 4, 3, 0, 8], ['brute', 1, 1, 0, 20])
    ],
    pre: [
      ['sparky', 'It IS a party! Those drones are cheering so loud the foes are running to the beat!'],
      ['juno', 'Cheer Drones fly, so guards can’t catch them. Shooters on the drones — and Echo to slow everyone back down.'],
      ['echo', 'Sparky, stand with me. Static Ping — we charge each other up.'],
      ['sparky', 'BEST. PARTY. EVER.']
    ],
    post: [
      ['friend', 'Only one voice left. The Conductor. It holds the whole choir together.'],
      ['kestrel', 'Then we go to the top of the tower. Together.'],
      ['rook', 'Together. Yeah. I like how that sounds.']
    ],
    radio: { 1: ['rook', 'Drone overhead — it’s making them faster! Shooters, up!'], 3: ['bubbles', 'Beetles! Lumi, stand by me — Care Team!'], 7: ['juno', 'The Face Thief again, dancing to the music. Same answer as always!'] }
  },
  {
    id: 18, chapter: 5, name: 'The Conductor', place: 'Broadcast Tower · Haven Station', theme: 'haven', finale3: true,
    cols: 12, rows: 7, startDP: 40, lives: 8, scale: 0.85, crew: ['brick', 'tank', 'rook', 'lumi', 'sparky', 'echo', 'wrench', 'marshal', 'bubbles'],
    routes: [R([[0, 1], [4, 1], [4, 4], [1, 4], [1, 6], [7, 6], [7, 2], [11, 2]]), R([[11, 6], [9, 6], [9, 2]]), R([[0, 6], [11, 2]], true)],
    high: [[1, 2], [2, 2], [3, 2], [2, 3], [3, 3], [5, 2], [5, 3], [5, 5], [6, 4], [2, 5], [3, 5], [8, 3], [8, 4], [8, 5], [10, 3], [10, 4], [6, 1], [8, 1], [10, 1], [0, 3]],
    walls: [[0, 0], [11, 0], [5, 0]],
    doors: [[2, 1], [4, 6], [9, 4]], sabo: { 2: 'lights', 4: 'reactor', 6: 'o2' },
    waves: [
      W(22, ['mender', 3, 2, 0], ['crawler', 12, 0.6, 1, 2], ['rally', 2, 3, 2, 6]),
      W(24, ['warden', 2, 4, 0], ['mimic', 6, 1.2, 1, 2], ['mender', 2, 3, 0, 6], ['ghost', 4, 1.4, 2, 4]),
      W(26, ['bomber', 8, 1, 1], ['rally', 3, 2, 2, 2], ['plated', 3, 3, 0, 4], ['mender', 3, 2, 0, 10]),
      W(28, ['golem', 2, 4, 0], ['warden', 2, 4, 1, 4], ['mite', 10, 0.8, 0, 6], ['leech', 4, 1.6, 2, 4]),
      W(30, ['shifter', 8, 1, 0], ['rally', 4, 1.6, 2, 2], ['warden', 2, 4, 1, 4], ['spore', 3, 3, 0, 10], ['mender', 3, 2, 1, 12]),
      W(0, ['conductor', 1, 1, 0], ['mender', 4, 2, 1, 8], ['warden', 3, 4, 0, 16], ['rally', 6, 1.4, 2, 10], ['bomber', 10, 1, 1, 24], ['golem', 2, 5, 0, 28])
    ],
    pre: [
      ['maestro', 'LISTEN. TOGETHER WE ARE LOUD. TOGETHER WE ARE STRONG. TOGETHER WE WIN.'],
      ['echo', 'Together isn’t about winning. It’s about nobody being alone.'],
      ['juno', 'It changes its song every few seconds. RED is fast, GREEN heals, BLUE shields. Watch the colour and answer it.'],
      ['friend', 'Be gentle with it. It only learned the loud half of the song.'],
      ['juno', 'All hands — one last time. Together.']
    ],
    post: [
      ['maestro', '...You didn’t win alone either.'],
      ['friend', 'No one does. Come sing with us instead. A quieter song.'],
      ['bubbles', 'Can it be a song about bubbles?'],
      ['maestro', '...Yes. A song about bubbles.'],
      ['juno', 'Haven Station, this is the HALCYON. The crew is home. All of us.']
    ],
    radio: { 6: ['juno', 'The Conductor! Watch its colour — RED fast, GREEN healing, BLUE shields!'] }
  }
];


const CHAPTERS = [
  { id: 1, name: 'Wake Up', sub: 'The HALCYON stirs', color: '#42e8ff' },
  { id: 2, name: 'The Cold Signal', sub: 'Something wearing faces', color: '#c6a0ff' },
  { id: 3, name: 'The Hollow', sub: 'Who is knocking?', color: '#ff8a6b' },
  { id: 4, name: 'The Long Way Home', sub: 'Somebody said hello', color: '#ffa63d' },
  { id: 5, name: 'The Choir', sub: 'Everybody, together', color: '#7affd6' }
];

const DIFFICULTY = {
  story: { name: 'Story', desc: 'Just enjoy the adventure — the ship can’t be destroyed. Lost hearts still cost stars.', hp: 0.55, atk: 0.5, dp: 1.6, startDP: 10, lives: 3, easy: true, safe: true },
  crew: { name: 'Crew', desc: 'Relaxed and friendly. Perfect for little commanders.', hp: 0.7, atk: 0.7, dp: 1.4, startDP: 6, lives: 3, easy: true },
  captain: { name: 'Captain', desc: 'The intended experience.', hp: 1, atk: 1, dp: 1, startDP: 0, lives: 0 },
  impostor: { name: 'Impostor', desc: 'Tougher, harder-hitting foes and fewer hearts. For grown-up commanders.', hp: 1.2, atk: 1.15, dp: 1, startDP: 8, lives: -2 }
};

/* ---------- Doors & sabotage ----------
   Doors sit on floor-path tiles: tap one to slam it and hold walking foes back for a few seconds.
   Sabotages are the Signal fighting back; tap the flashing panels to fix them. */
const DOOR = { closed: 6, cooldown: 18, coach: ['juno', 'See the striped door on the path? Tap it to SLAM it shut! Walking foes have to wait while it’s closed. Bosses smash right through, though.'] };
const SABOTAGE = {
  lights: {
    name: 'Lights Out', icon: '💡', color: '#ffd84a', dur: 22, panels: 1, taps: 3,
    desc: 'Shooters can’t see as far!',
    coach: ['sparky', 'Somebody cut the lights! Our shooters can barely see. Tap the flashing panel a few times and I’ll flip them back on!']
  },
  reactor: {
    name: 'Reactor Meltdown', icon: '☢', color: '#ff4d6a', dur: 30, panels: 2, taps: 3, fail: 2,
    desc: 'Fix BOTH panels before the timer hits zero!',
    coach: ['juno', 'The reactor is melting down! Tap BOTH flashing panels before the timer runs out, or we lose two hearts!']
  },
  o2: {
    name: 'Oxygen Leak', icon: 'O₂', color: '#77ddff', dur: 24, panels: 1, taps: 4,
    desc: 'DP is draining away!',
    coach: ['echo', 'Oxygen leak — our DP is draining away. Tap the flashing panel to patch it up!']
  }
};
const LEVEL_EXTRAS = { // doors: floor-path tiles · sabo: { waveNumber: kind } (starts a few seconds into that wave)
  2: { doors: [[2, 1], [2, 5]] },
  3: { doors: [[7, 2]], sabo: { 4: 'lights' } },
  4: { doors: [[5, 1]], sabo: { 3: 'reactor' } },
  5: { doors: [[2, 1], [2, 5]], sabo: { 4: 'lights' } },
  6: { doors: [[5, 3]], sabo: { 3: 'o2', 6: 'lights' } },
  7: { doors: [[4, 1], [5, 5]], sabo: { 2: 'o2', 5: 'lights' } },
  8: { doors: [[4, 3], [7, 3]], sabo: { 3: 'reactor' } },
  9: { doors: [[2, 1], [6, 5], [10, 0]], sabo: { 2: 'lights', 5: 'reactor' } },
  10: { doors: [[5, 0], [11, 3], [6, 2]], sabo: { 2: 'o2', 3: 'lights', 5: 'reactor' } }
};
LEVELS.forEach(l => Object.assign(l, LEVEL_EXTRAS[l.id] || {}));

/* ---------- Squad ----------
   Before a mission with more crew than seats, the player picks a squad. The newest crewmate always comes along. */
const SQUAD_SIZE = 4;
const SQUAD_PREF = ['brick', 'rook', 'sparky', 'lumi', 'marshal', 'tank', 'bubbles', 'echo', 'wrench']; // the suggested squad, in order
const squadSize = (level, diffKey) => Math.min(level.crew.length, (level.squad || (level.chapter >= 3 ? 5 : SQUAD_SIZE)) + (DIFFICULTY[diffKey] && DIFFICULTY[diffKey].easy ? 1 : 0));

/* ---------- Wardrobe (unlocked with stars) ---------- */
const LOOKS = {
  hat: [
    { id: 'signature', name: 'Signature', stars: 0 },
    { id: 'sprout', name: 'Sprout', stars: 2 },
    { id: 'party', name: 'Party Hat', stars: 4 },
    { id: 'headphones', name: 'Headphones', stars: 6 },
    { id: 'flower', name: 'Flower', stars: 8 },
    { id: 'chef', name: 'Chef', stars: 10 },
    { id: 'tophat', name: 'Top Hat', stars: 13 },
    { id: 'horns', name: 'Space Horns', stars: 16 },
    { id: 'mushroom', name: 'Fungle Cap', stars: 19 },
    { id: 'halo', name: 'Halo', stars: 22 },
    { id: 'crown', name: 'Crown', stars: 26 },
    { id: 'laurel', name: 'Champion Laurel', stars: 0, bolts: 6 },
    { id: 'note', name: 'Music Note', stars: 30 },
    { id: 'hardcore', name: 'Impostor Hunter', stars: 0, bolts: 15 }
  ],
  visor: [
    { id: 'sky', name: 'Sky', stars: 0, c: ['#d7fbff', '#6bc9e6'] },
    { id: 'gold', name: 'Gold', stars: 3, c: ['#fff4b8', '#e0a91c'] },
    { id: 'rose', name: 'Rose', stars: 7, c: ['#ffe0ef', '#ff6fae'] },
    { id: 'mint', name: 'Mint', stars: 11, c: ['#e2ffe9', '#3fd47a'] },
    { id: 'sunset', name: 'Sunset', stars: 15, c: ['#ffd36b', '#ff5a6a'] },
    { id: 'nebula', name: 'Nebula', stars: 20, c: ['#c9a6ff', '#3a1a7a'] },
    { id: 'chrome', name: 'Chrome', stars: 0, bolts: 3, c: ['#ffffff', '#7b8598'] },
    { id: 'ember', name: 'Ember', stars: 34, c: ['#ffe2a8', '#ff6a1a'] },
    { id: 'aurora', name: 'Aurora', stars: 44, c: ['#b8fff0', '#7a4cff'] }
  ],
  pet: [
    { id: 'none', name: 'No pet', stars: 0 },
    { id: 'minibean', name: 'Mini Bean', stars: 5 },
    { id: 'bot', name: 'Fix-It Bot', stars: 9 },
    { id: 'sporeling', name: 'Sporeling', stars: 12 },
    { id: 'wisp', name: 'Friendly Wisp', stars: 17 },
    { id: 'starling', name: 'Starling', stars: 24 },
    { id: 'drillbit', name: 'Drill Bit', stars: 30 },
    { id: 'choirling', name: 'Choirling', stars: 38 },
    { id: 'hollowpup', name: 'Little Hollow', stars: 0, bolts: 10 }
  ]
};
// a wardrobe item is unlocked by stars, or by ⚡ challenge bolts
const lookOpen = (it, stars, bolts) => it.bolts ? bolts >= it.bolts : stars >= it.stars;

/* ---------- Challenges (optional handicaps on missions you've already won) ----------
   Each challenge you win a mission with earns one ⚡ bolt for that mission. */
const MODIFIERS = {
  fast: { name: 'Speedy Foes', icon: '💨', desc: 'Foes move 20% faster.' },
  tough: { name: 'Thick Hides', icon: '🛡', desc: 'Foes have 30% more health.' },
  poor: { name: 'Low Power', icon: '🔋', desc: 'DP refills 30% slower and you start with less.' },
  glass: { name: 'Glass Hull', icon: '💔', desc: 'The ship has half as many hearts.' },
  nomed: { name: 'No Medics', icon: '🚫', desc: 'Lumi and Bubbles stay home.', needs: l => l.crew.some(k => CREW[k].heal || CREW[k].shields) },
  nodoors: { name: 'Jammed Doors', icon: '🔒', desc: 'Doors won’t close.', needs: l => !!(l.doors && l.doors.length) }
};
const modsFor = level => Object.keys(MODIFIERS).filter(k => !MODIFIERS[k].needs || MODIFIERS[k].needs(level));

/* ---------- Crewmate training ----------
   Crew earn XP from missions. Each level gives one point to spend on a small upgrade tree. */
const UPGRADES = [
  { id: 'tough', name: 'Tough', icon: '❤', desc: '+10% health', max: 3 },
  { id: 'power', name: 'Power', icon: '⚔', desc: '+8% attack, healing and repairs', max: 3 },
  { id: 'focus', name: 'Focus', icon: '★', desc: 'Skill charges 10% faster', max: 3 }
];
const XP_LEVELS = [0, 30, 90, 180, 300, 450, 630, 840, 1080, 1350];
const XP_MAX_LEVEL = XP_LEVELS.length - 1;
const xpLevel = xp => { let n = 0; while (n < XP_MAX_LEVEL && xp >= XP_LEVELS[n + 1]) n++; return n; };
const XP_GAIN = { win: 20, star: 10, loss: 8, endlessWave: 4 };

/* ---------- Medals ----------
   test(m) gets { st: lifetime counters, flags, stars, bolts, best (endless), lvl (top crew level), looks (styles unlocked) } */
const MEDALS = [
  { id: 'first', icon: '🚀', name: 'Wide Awake', desc: 'Finish Mission 1.', test: m => m.stars >= 1 },
  { id: 'flawless', icon: '💎', name: 'Not a Scratch', desc: 'Win a mission without losing a single heart.', test: m => m.flags.flawless },
  { id: 'pest', icon: '🧹', name: 'Pest Control', desc: 'Stop 500 foes.', test: m => m.st.kills >= 500 },
  { id: 'spores', icon: '🍄', name: 'Spore Sweeper', desc: 'Pop 100 Sporelets.', test: m => m.st.sporelet >= 100 },
  { id: 'ghosts', icon: '👻', name: 'Ghost Buster', desc: 'Stop 100 Wisp Ghosts.', test: m => m.st.ghost >= 100 },
  { id: 'doors', icon: '🚪', name: 'Door Slammer', desc: 'Slam doors 50 times.', test: m => m.st.doors >= 50 },
  { id: 'fixer', icon: '🔧', name: 'Handy', desc: 'Fix 25 sabotages.', test: m => m.st.fixes >= 25 },
  { id: 'cool', icon: '🧊', name: 'Cool Under Pressure', desc: 'Fix a Reactor Meltdown with under 5 seconds left.', test: m => m.flags.cool },
  { id: 'skills', icon: '✨', name: 'Show-Off', desc: 'Use 100 skills.', test: m => m.st.skills >= 100 },
  { id: 'brass', icon: '🎖', name: 'Top Brass', desc: 'Promote crewmates 50 times.', test: m => m.st.promotes >= 50 },
  { id: 'minimal', icon: '🤏', name: 'Skeleton Crew', desc: 'Win Mission 4 or later with 4 or fewer crew deployed.', test: m => m.flags.minimal },
  { id: 'thief', icon: '🎭', name: 'Face Off', desc: 'Defeat the Face Thief.', test: m => m.st.brute >= 1 },
  { id: 'heart', icon: '💜', name: 'Heard', desc: 'Finish Chapter 3.', test: m => m.flags.ch3 },
  { id: 'home', icon: '🏠', name: 'Home Again', desc: 'Finish Chapter 4.', test: m => m.flags.ch4 },
  { id: 'choir', icon: '🎶', name: 'Encore', desc: 'Finish Chapter 5.', test: m => m.flags.ch5 },
  { id: 'team', icon: '🤝', name: 'Teamwork', desc: 'Have 3 different combos going at the same time.', test: m => m.flags.team },
  { id: 'combos', icon: '🔗', name: 'Better Together', desc: 'Make 100 combos.', test: m => m.st.combos >= 100 },
  { id: 'menders', icon: '🦋', name: 'No Patch-Ups', desc: 'Stop 50 Mender Moths.', test: m => m.st.mender >= 50 },
  { id: 'stars30', icon: '⭐', name: 'Star Student', desc: 'Earn 30 stars.', test: m => m.stars >= 30 },
  { id: 'stars42', icon: '🌟', name: 'Perfectionist', desc: 'Earn 3 stars on every mission.', test: m => m.stars >= LEVELS.length * 3 },
  { id: 'bolts10', icon: '⚡', name: 'Challenger', desc: 'Earn 10 challenge bolts.', test: m => m.bolts >= 10 },
  { id: 'dare', icon: '🔥', name: 'Daredevil', desc: 'Win a mission with 3 or more challenges on.', test: m => m.flags.dare },
  { id: 'imp', icon: '😈', name: 'Impostor Slayer', desc: 'Win a Chapter 3 or 4 mission on Impostor.', test: m => m.flags.imp },
  { id: 'endless10', icon: '♾', name: 'Survivor', desc: 'Reach wave 10 in Endless.', test: m => m.best >= 10 },
  { id: 'endless25', icon: '🏆', name: 'Legend', desc: 'Reach wave 25 in Endless.', test: m => m.best >= 25 },
  { id: 'vet', icon: '🎓', name: 'Veteran', desc: 'Train a crewmate to level 5.', test: m => m.lvl >= 5 },
  { id: 'fashion', icon: '🎩', name: 'Fashionista', desc: 'Unlock 10 styles.', test: m => m.looks >= 10 }
];

/* ---------- Endless mode ----------
   Remixed waves on any map you've cleared. Unlocks after Chapter 1. */
const ENDLESS = { unlockAfter: 3, squad: 6, waveDur: 30, bossEvery: 5, saboEvery: 4 };
const ENDLESS_POOL = [ // [foe, cost, first wave it can appear]
  ['crawler', 1, 1], ['mimic', 2.2, 1], ['ghost', 1.6, 2], ['drone', 2, 4], ['shifter', 2.4, 4], ['plated', 4.5, 5],
  ['spore', 3.5, 7], ['mite', 1.8, 7], ['leech', 2.5, 8], ['bomber', 1.8, 10], ['golem', 6, 11],
  ['mender', 2.6, 9], ['rally', 2.4, 10], ['warden', 5, 12]
];
const ENDLESS_BOSSES = ['brute', 'sporemother', 'foreman', 'conductor', 'heart'];
/** Wave n (1-based) of an endless run: a few foe groups whose total cost grows every wave. */
function endlessWave(level, n, rnd) {
  const air = level.routes.findIndex(r => r.air), ground = level.routes.map((r, i) => r.air ? -1 : i).filter(i => i >= 0);
  const pool = ENDLESS_POOL.filter(p => p[2] <= n), spawns = [];
  let budget = 7 + n * 3 + Math.pow(n, 1.4), delay = 0;
  const groups = Math.min(4, 2 + Math.floor(n / 6));
  for (let g = 0; g < groups && budget > 0; g++) {
    const [type, cost] = pool[Math.floor(rnd() * pool.length)], share = g === groups - 1 ? budget : budget * (0.3 + rnd() * 0.3);
    const cnt = Math.max(1, Math.min(16, Math.round(share / cost))), route = FOES[type].flying && air >= 0 ? air : ground[Math.floor(rnd() * ground.length)];
    spawns.push({ type, n: cnt, gap: Math.max(0.6, 2.4 - n * 0.06), route, delay }); budget -= cnt * cost; delay += 3 + rnd() * 4;
  }
  if (n % ENDLESS.bossEvery === 0) spawns.push({ type: ENDLESS_BOSSES[(n / ENDLESS.bossEvery - 1) % ENDLESS_BOSSES.length], n: 1, gap: 1, route: ground[0], delay: 8 });
  return { dur: ENDLESS.waveDur, spawns, mul: 1 + 0.07 * (n - 1) };
}

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
