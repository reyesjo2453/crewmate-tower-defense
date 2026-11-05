# Crewmate Command: The Hollow Signal

A story-driven, Arknights-style tower defense starring bean-shaped astronaut crewmates — an unofficial **fan spin-off** of that famous space-mystery party game. All art, music and story are original, drawn and synthesized in code. No assets are copied and nothing is affiliated with the original studio.

Built as an offline-capable **PWA**: no build step, no dependencies, no accounts, no ads.

## The story

The cargo ship **HALCYON** wakes two crew from cryo-sleep to find something crawling out of the vents. It isn't an Impostor. It's a *Signal* — a lonely thing that learned to wear faces — and it keeps whispering one word: **"stay."** Across the first ten missions (three chapters) the crew follow it from the HALCYON through Polus Station, MIRA HQ and the glowing Fungle to the wreck of the long-lost **Meridian**, where Rook's missing sister waits. The finale asks whether you can win a war by finally saying hello.

**Chapter 4: The Long Way Home** (Missions 11–14) picks up the epilogue's second "hello?". It came from the **Ferrous Deep**, an asteroid mining rig where leftover pieces of the Signal have taken over the machines. The now-friendly Hollow helps the crew gather its lost pieces, three new crewmates join, and the chapter ends with a boss fight against **The Foreman**, the rig's giant drill.

**Chapter 5: The Choir** (Missions 15–18) brings the crew home to **Haven Station**, where the last leftover signals have found each other and formed a choir. They watched the crew work together on the long way home and copied it, but they think teamwork means winning. Menders heal their friends, Wardens shield them and Cheer Drones speed them up. The chapter ends at the top of the broadcast tower against **The Conductor**.

## How it plays (the Arknights part)

- **Deploy** crewmates from the bar using **DP** (Deployment Points), which refill over time. Cost, timing and placement are the whole game.
- **Floor path tiles** hold melee *guards* that **block** walking foes. **High decks** hold ranged crew.
- A guard can only block so many foes at once (`block`); extra foes walk past. Flying foes can't be blocked at all.
- Tap a crewmate to **Promote** (stronger, up to 2 ranks), **Retreat** (refund half your DP) or fire their **Skill** (a charge bar fills over time — tap when the star lights up).
- Two damage types: physical shots are reduced by **armor**; Sparky's electricity ignores it.
- Stealthy **Shapeshifters** can't be targeted until they get close — or until **Echo** scans them.
- Four difficulty levels in Settings: **Story** (the ship can't be destroyed), **Crew** (relaxed, for ~7-year-old commanders), **Captain** (intended) and **Impostor** (tougher, harder-hitting foes and two fewer hearts — very hard but beatable). Stars (1–3) are earned by ship health left.
- A **side route** that joins another one carries on along it to the reactor, so foes from every vent have to get past your main line.

| Crew | Role | Notes |
| --- | --- | --- |
| Brick (red) | Guard | blocks 1, hits hard, skill: Body Slam |
| Tank (purple) | Defender | blocks 3, very tough, skill: Hold the Line |
| Rook (blue) | Shooter | long range, weak against armor |
| Lumi (green) | Medic | heals allies, skill: Group Hug |
| Sparky (yellow) | Zapper | area electric damage, ignores armor |
| Echo (cyan) | Scanner | slows foes, reveals sneakers |
| Wrench (orange) | Engineer | builds and repairs a barricade on the nearest floor tile that blocks 2 foes; skill: Reinforce |
| Marshal (brown) | Sheriff | huge range, slow shots that pierce half of any armor, always aims at the toughest foe |
| Bubbles (pink) | Guardian | gives a friend a bubble that soaks one whole hit; skill: Bubble Party shields everyone nearby |

### Combos

Two crewmates standing within two tiles of each other team up. A glowing dashed link with the combo's icon joins them, and both get a bonus while they stay together:

| Combo | Pair | Bonus |
| --- | --- | --- |
| 🤝 Best Buds | Brick + Tank | both get 30% more armor and hit 15% harder |
| 🎯 Spotter | Echo + Rook | Rook hits 30% harder |
| 💗 Care Team | Lumi + Bubbles | Lumi heals 30% more, Bubbles shields 30% faster |
| ✖ Crossfire | Rook + Marshal | both shoot 15% faster |
| ⚡ Lightning Rod | Sparky + Tank | Sparky's zaps spread 35% wider and hit 10% harder |
| ⛑ Hard Hats | Wrench + Brick | the barricade gets 40% more health, Brick hits 15% harder |
| 📡 Static Ping | Sparky + Echo | both skills charge 25% faster |

While you're placing a crewmate, tiles where they would form a combo show its icon (hover with a mouse to preview the link). The first time each combo forms, one of the pair explains it on the radio. The squad screen lists the combos your squad can make, and the Logbook lists each crewmate's partners.

Foes include Vent Crawlers, Mimics, Wisp Ghosts (flying), Sabotage Drones (flying, shoot back), Shapeshifters (stealth), Plated Mimics (armor), Spore Walkers (split when popped) and three bosses. Chapter 4 adds Rock Mites (burrow under guards), Power Leeches (drain DP), Ore Golems (heavy armor, can't be slowed), Blast Beetles (explode on guards) and the boss **The Foreman** (drills underground and calls Rock Mites). Chapter 5's foes help each other: **Mender Moths** heal foes around them, **Wardens** throw a shield over nearby foes so they take about half damage, **Cheer Drones** (flying) make nearby foes run faster, and the boss **The Conductor** switches song every 8 seconds (red: fast, green: healing, blue: shielded) and calls for backup at two-thirds and one-third health. A helped foe shows it: a blue shield outline, red speed lines or green sparkles. A boss's first appearance gets a short intro card. The **Logbook** (title/map screen) lists everyone and what to do about them.

### Doors and sabotage (from Mission 2)

- **Doors:** striped blast doors sit on some floor-path tiles. Tap one to **slam it shut** for 6 seconds; walking foes pile up behind it (great for Sparky). It then recharges for 18 seconds. Flyers ignore doors and **bosses smash through** them.
- **Sabotage:** the Signal fights back mid-wave. A banner appears and repair panels flash on the floor; tap each panel a few times to fix it.
  - **Lights Out:** darkness falls and shooters' range drops by 30%.
  - **Oxygen Leak:** DP stops refilling and slowly drains.
  - **Reactor Meltdown:** two panels and a countdown. If time runs out you lose 2 hearts.
- Captain Juno and the crew explain each one on the radio the first time it happens. On **Crew** difficulty doors stay shut longer, panels need fewer taps, timers are longer and a meltdown costs only 1 heart.

### Squads (from Mission 4)

When a mission has more crew than seats, a **squad screen** comes first: 4 seats in Chapter 2, 5 in Chapter 3 (+1 on Crew difficulty). Mission intel lists every foe (flies, sneaky, armored…), the doors and the sabotages, so you can bring the right answers. The newest crewmate always comes along, and your last squad for each mission is remembered.

### Wardrobe

Stars unlock **hats** (10), **visor colours** (5) and **pets** (5) — e.g. Party Hat at 4★, Fix-It Bot at 9★, Crown at 26★. Each crewmate has their own look, shown in battle, on cards and in story scenes. Open it from the mission map or the squad screen; new unlocks get a red dot and a line on the victory screen. Chapter 5 adds the Music Note hat (30★), the Choirling pet (38★) and the Aurora visor (44★). Looks are cosmetic only.

### Challenges

Replay a mission you've won and the briefing offers optional **challenges**: Speedy Foes, Thick Hides, Low Power, Glass Hull, No Medics and Jammed Doors (only the ones that fit the mission). Win with challenges on and you earn one ⚡ **bolt** per challenge per mission. Bolts unlock special wardrobe items, such as the Chrome visor at ⚡3.

### Endless

Endless unlocks after Chapter 1. Pick any map you've cleared and survive remixed waves that get tougher every wave. A boss arrives every 5 waves and a sabotage every 4. Your best wave is saved per map.

### Crew training

Crewmates earn **XP** from every mission: 20 for a win plus 10 per star, 8 for a loss, and 4 per wave in Endless. Each level (up to 9) gives one point to spend in the **Crew** screen on **Tough** (+10% HP), **Power** (+8% attack, healing and repairs) or **Focus** (skills charge 10% faster), three ranks each. You can reset points for free at any time.

### Medals

The Logbook's **Medals** tab tracks 27 goals, such as winning without losing a heart, popping 100 Sporelets, fixing a meltdown with under 5 seconds left, reaching wave 25 in Endless, or training a crewmate to level 5.

### Feel and accessibility

- **Hits that land:** a split-second hit-pause on big blows, knockback, crewmates that drop in and squash on landing, lunge when they attack and bounce when promoted, and foes that squash, flash, then burst into tumbling debris.
- **Particles:** sparks off every bullet and blade, muzzle flashes, dust when crew land or doors slam, healing twinkles, and fireball blasts.
- **Damage numbers** pop over foes (hits in quick succession merge into one number; yellow for electric, orange for armour-piercing).
- **Lighting:** every place has its own darkness between the lights, from bright Medbay to the deep Hollow. The reactor, vents, crewmates, bullets, muzzle flashes, lightning, explosions, skills, glowing foes and glowing decor (consoles, lava, mushrooms, crystals, lamps) light it up in colour. The Meridian's lights flicker. Lights Out uses the same system, so shooters still carry a pool of light the size of their reach.
- **Living scenery:** drifting dust, snow on Polus, petals on MIRA, glowing spores in the Fungle, static in the Hollow, embers in the Ferrous Deep, fireflies at Haven Station and spark showers from the Meridian's wreckage. Consoles blink, scanners sweep, lava bubbles, fountains splash, Haven's windows shimmer with aurora, and the Hollow's eyes blink and watch the nearest foe.
- **Transitions:** screens fade and settle in with their contents arriving one after another, mission cards float in, and battles fade up from black.
- **Camera:** smooth screen shake, a zoom punch when a boss goes down, a slow-motion zoom on the last foe and a burst of confetti on victory, and a red edge flash when the reactor takes a hit.
- **Voices:** crewmates babble in their own pitch on the radio and shout a battle cry when their skill fires; story characters talk in little voice blips; phones vibrate on big moments.
- **Options in Settings:** colour-blind friendly highlights (orange stripes for floor tiles, blue dots for decks, blue/orange health bars), bigger buttons, a vibration switch, **Calmer screen** (no hit-pause or zoom, gentle flashes, no shaking) and a damage-numbers switch.

All of this is cosmetic (`js/juice.js` and `js/scene.js`): it never touches the battle's random numbers, and only exists when there is a screen, so automated runs and battle outcomes are exactly the same with or without it.
- **In battle:** a **½×** speed and a **💡 Hint** button that suggests who to place and where (or who to promote).

Mission 1 is a hand-held **tutorial** with Captain Juno (replayable in Settings). After that, the first time each new crewmate joins, they say on the radio where they like to stand, their card glows, and a good tile glows on the map until you place them.

## Soundtrack

An original, adaptive score synthesized live in `js/audio.js` (no audio files): a tense D-minor theme in the spirit of the "hide and seek" style of space-thriller music.

- **Title / map:** slow pads, a bell melody, a low drone.
- **Story scenes:** quiet pads and distant bells.
- **Battle** is layered and follows the fight: a ticking clock before the wave, then a pulsing bass, then four-on-the-floor drums and 16th-note arpeggios, then the full lead melody when the field is crowded or on the final wave.
- **Heartbeat:** fades in and speeds up as foes get close to the reactor or the ship's health runs low.
- **Bosses** switch to a faster, darker groove with brass stabs and risers.
- **Victory and defeat** each get a short sting.
- **Sound effects** are layered (a noise transient, a pitched body and often a low thump), panned left or right by where they happen on the board, given a little room echo, and nudged in pitch each time so rapid fire doesn't sound robotic. The music dips under big moments (boss knockouts, explosions, skills), small sounds drop out first when the fight gets busy, and the music goes muffled while paused. A drum roll leads into every wave.

`Sound.preview(mood, intensity, danger, seconds)` renders any mood offline, and `Sound.previewSfx(name)` renders one sound effect, which is handy for tuning the mix.

## Controls

Touch / mouse: tap a card → tap a glowing tile; tap a crewmate for its menu. Tap a striped door to slam it; tap flashing panels to fix sabotage. Speed cycles 1× → 2× → ½×; 💡 gives a hint. Keyboard: `1`–`9` pick crew, `Space` start/next wave, `H` hint, `P` pause, `Esc` cancel. The game plays best in **landscape**; it works in portrait with smaller tiles.

## Run it

```sh
python3 -m http.server 8000      # then open http://localhost:8000/
```

Service workers need HTTPS or localhost. Open once online, wait a moment, and it plays offline. On iPhone: Safari → Share → **Add to Home Screen**. On Android/desktop Chrome: menu → **Install app**.

Progress (stars, bolts, XP and upgrades, medals, Endless bests, unlocks, settings) is saved in `localStorage` under `crewmate-command-v1`. **Settings → Progress → Copy my save code** turns the whole save into one `CREW1-…` code; paste it into **Load a save code** on another device (or keep it as a backup). The code has a checksum, so a partly-copied code is rejected instead of loading a broken save.

## GitHub Pages

`.github/workflows/pages.yml` publishes the static files on pushes to `main` (the site must already have Pages enabled; the workflow never changes Pages settings). After changing any cached file, bump `VERSION` in `sw.js`.

## Project layout

- `index.html`, `style.css` — shell and styling
- `js/data.js` — **all content**: crew, foes, themes, maps, waves, story, tutorial script, difficulty, doors & sabotage, squads, wardrobe items, challenges, training, medals, Endless wave generator
- `js/art.js` — Canvas drawing for crewmates, foes and environments
- `js/engine.js` — simulation + rendering (DOM-free, can run headless)
- `js/juice.js` — cosmetic game feel: hit-pause, squash & stretch, particles, damage numbers, camera
- `js/scene.js` — cosmetic lighting, ambient particles and animated decor
- `js/ui.js` — screens, dialogue, mission briefing (squad and challenges), Endless, crew training and wardrobe, medals, HUD, hints, tutorial, save data
- `js/audio.js` — synthesized sound & music
- `sw.js`, `manifest.json`, `icons/` — PWA
- `tests/` — dev only: `verify.cjs` (data validation, a click-through of the first-play journey, mechanics for every crewmate and foe, challenges, Endless, training, medals, settings, save codes, new-crewmate coaching, game feel & sound, combos, helping foes, the Conductor, lighting, Chapter 5, offline), `sim.cjs` + `bot.js` (an automatic player used to tune difficulty)

## Testing

```sh
python3 -m http.server 8000 &
NODE_PATH=$(npm root -g) node tests/verify.cjs     # needs Playwright
NODE_PATH=$(npm root -g) node tests/sim.cjs captain,crew
```

The `?test` URL flag exposes `window.__t` for the tests; the normal game exposes nothing.

## Adding a mission

Add an entry to `LEVELS` in `js/data.js`: grid size, `routes` (ground paths on tile corners; `air` routes for flyers), `high` deck tiles, `walls`, `waves` via `W(secondsUntilNext, [foe, count, gap, route, delay])`, and `pre`/`post` story lines. Doors and sabotage go in `LEVEL_EXTRAS` (`doors: [[x, y]]` on floor-path tiles, `sabo: { waveNumber: 'lights' | 'o2' | 'reactor' }`); `squad` overrides the seat count. `node tests/verify.cjs` checks it for overlapping tiles and bad references.
