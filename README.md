# Crewmate Craft · Base Defense

A bright, friendly tower defense game about a little space base and the crew who protect it. Orange bots follow the path; your towers do the rest. Made for portrait phones, with responsive desktop controls too.

**Play:** pick a mission, choose a tower, tap an empty build square, then **Start wave**. Tap an existing tower to buy an upgrade or recycle it. Survive every wave to unlock the next mission. A loss offers an immediate retry.

## Three missions, one engine

| Mission | Waves | Starting coins | Starting lives | What changes |
| --- | ---: | ---: | ---: | --- |
| First Stand | 10 | 140 | 20 | Lunar route; Basic bots, Scouts from wave 4, Bulky bots from wave 7 |
| Winding Way | 15 | 160 | 20 | Green valley; Runners, tight Zipper packs, Plated bots from wave 8 |
| Bot Flood | 20 | 180 | 20 | Amber dusk; Armored bots, Runners, Splitters, Swarmers, and exactly one final boss |

Every bot that reaches the base costs **one life**, including the boss. Stopping bots earns coins; clearing a nonfinal wave adds 15 teamwork coins. Waves start only when you choose, so there is always time to think and build.

| Tower | Build cost | Role | Upgrade costs |
| --- | ---: | --- | --- |
| Blaster | 45 | Fast, inexpensive single-target shots | 40, then 65 |
| Cannon | 80 | Slower shots with splash damage | 65, then 95 |
| Frost | 65 | Chilly shots slow bots for nearby teammates | 55, then 85 |

Each tower retains **two paid linear upgrades** (three total power levels). After both upgrades, two labeled buttons offer a **final specialization**. Buy one or keep the original tower; choosing either branch permanently closes the other branch for that tower. Recycling returns 65% of the full investment **including specialization cost**, rounded down. Towers target the furthest-progressed bot in range; Blizzard instead pulses across its whole range.

| Tower | Specialization | Cost | What changes |
| --- | --- | ---: | --- |
| Blaster | Gatling | 110 | Twin barrels: 18 damage every 0.20 seconds, versus 22 every 0.38 seconds before specializing |
| Blaster | Longshot | 125 | A long sighted barrel: 55 damage every 0.80 seconds, with 235-pixel range |
| Cannon | Big Splash | 135 | A wide bell barrel: splash radius grows from 82 to 125 pixels |
| Cannon | Cluster | 145 | Three pods: each primary impact schedules exactly three smaller damaging blasts around it |
| Frost | Blizzard | 125 | A snow halo: pulses slow every bot in range; overlapping slow duration keeps nearby bots chilled |
| Frost | Deep Freeze | 130 | An ice crystal: every third successful hit freezes its target completely for 0.65 seconds |

Every specialization changes the tower's Canvas geometry and adds an emblem. A mix of towers near bends is still a good starting plan. All three missions remain winnable with the original linear towers alone.

## Bot variety and planet themes

`ENEMY_KINDS` in `game.js` is the single enemy registry. Each entry declares its ID, name, HP, speed, coin reward, hint, silhouette shape, geometric accessory, and renderer. Optional properties declare pack size, armor, or a death split. Mission cards show the same silhouettes with names and short hints, including locked missions. Shapes distinguish enemies without depending on color:

- **First Stand:** rounded Basic bots, triangular radar-dish Scouts, and wide, shoulder-plated Bulky bots.
- **Winding Way:** tall long-legged Runners, tiny dart-shaped Zippers in trios, and hexagonal Plated bots with shields. Light armor subtracts 3 damage from each hit, with a minimum of 1 damage.
- **Bot Flood:** square riveted Armored bots, Runners, twin-shell Splitters, round feeler-equipped Swarmers in packs of four, and one giant crowned boss. Armored bots subtract 5 damage per hit, also with a minimum of 1. Frost control still works against armor.

A stopped Splitter spawns exactly **two diamond-shaped Minis at its current path progress**. Minis never split; a leaked Splitter never spawns children. Children inherit their wave's HP scale and have bounded individual rewards. Every leaked bot, including a Mini or the boss, still costs one life. The final boss keeps its original **3,200 HP, 28 pixels/second speed, and 80-coin reward**.

Every wave declares explicit `{ kind, count, spacing }` groups and an HP scale. Counts mean individual bots, not multiplied packs. Pack members arrive 0.12 seconds apart, with the declared spacing between packs. Enemy identity is never chosen by every-Nth-spawn rules. Add a registry entry and explicit wave groups to extend the roster.

Each level owns a `theme` object (`bgTint`, `pathColor`, `pathBorder`, tile colors, and `decorSet`). A single renderer draws both the board and mission previews:

- **First Stand:** cool lunar ground, craters, angular rocks, and star glints.
- **Winding Way:** green grass, a dirt-and-stone route, trees, bushes, flowers, and one small pond.
- **Bot Flood:** amber dusk, a dark scorched route, glowing rocks, embers, and twisted trees.

Decoration positions come only from a seeded integer hash of level ID and grid coordinates. They render below towers, never use `Math.random()`, and do not affect placement, paths, range, or collision. Even the pond is a buildable square. Original path coordinates and starting coins/lives are unchanged.

## Controls and accessibility

- **Touch / mouse:** select a tower, then select a square. Tap a built tower to inspect, upgrade, or recycle it.
- **Keyboard:** `1`, `2`, `3` select Blaster, Cannon, Frost. `Space` starts a wave when the focus is not on another button or form control. `P` pauses or resumes.
- **Grid keyboard:** focus the map, use arrow keys to choose a square, and press `Enter` to build or inspect. The current square is announced.
- **DOM alternative:** expand **Keyboard & accessible build controls**, choose a labeled row/column, and press **Select**.
- Sound and pause controls are available during play. Switching away from the page pauses the mission. Reduced-motion preferences disable decorative movement and particle bursts.

The gameplay picture uses Canvas; menus, tower controls, upgrades, wave actions, status announcements, and result screens are ordinary accessible HTML. There is no time pressure between waves.

## Local development

There is no build step or runtime package install. Serve the repository over HTTP:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Service workers need HTTPS or a localhost URL; opening `index.html` with `file://` does not provide offline installation.

All art is original local SVG/Canvas drawing. PNG app icons were rendered locally from `icons/icon.svg`. Audio is synthesized with Web Audio after a user gesture. There are **zero runtime dependencies, external assets, accounts, ads, or analytics**.

## GitHub Pages

The existing repository and GitHub Pages are already configured. `.github/workflows/pages.yml` uploads only the static game and icons and deploys automatically on pushes to `main`. Do not create another repository or modify Pages settings.

Site: `https://reyesjo2453.github.io/crewmate-tower-defense/`.

The workflow requests `contents: read`, `pages: write`, and `id-token: write`. Its configuration action explicitly sets `enablement: false`: it reads existing Pages settings and **does not enable Pages automatically**. If an operation returns a permission error, stop that operation and ask Merlin to handle the affected deployment or setup step. Never rerun a failed workflow more than once. All app, manifest, icon, and service-worker URLs are relative, so project subpaths work.

## Offline and iPhone installation

Open the HTTPS site once while connected. Wait for **Ready offline** in mission control; the service worker has then cached the complete game. The app can reload and play offline. Progress and sound preferences save in localStorage on that browser/device; unlocked missions and best results survive closing and reopening. The existing version-1 save key and schema are retained: prior unlocks, best results, and sound preferences load unchanged, and missing preferences use their existing defaults. New towers start with no specialization. Active waves and tower layouts are not saved, so a full reload returns to mission control. Clearing site data clears progress. If storage is blocked, the game remains playable and keeps progress for the current session.

On iPhone, open the site in **Safari**, tap **Share → Add to Home Screen**, then launch the new icon. The manifest and Apple touch icon support a standalone portrait app, and layout padding respects safe areas. iOS may treat Safari and the installed app as separate storage contexts or evict offline data; first open the installed app online too.

After changing any cached file, bump the version in `sw.js`. The worker precaches a complete version before activating and only removes older caches belonging to this app's scope. Reopen or reload the app after a new worker activates to use the updated files.

## Verification

`tests/verify.cjs` is a development-only Playwright test. Run the local server above, then in another terminal:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/verify.cjs
```

To use an existing Chromium installation or a different server:

```sh
CHROMIUM_PATH=/usr/bin/chromium BASE_URL=http://127.0.0.1:8000/ node tests/verify.cjs
```

The test runs all **45 waves twice using only starting and earned coins**: once with original linear towers, and once allowing specializations. Both reproducible mixed-tower strategies clear every mission with 20 lives. Expected totals are **86, 225, and 700 bots stopped**, including Splitter children; exactly one boss appears, at the end of the last mission.

It also validates every registry entry and wave queue, finite pack sizes and split children, introductions, original routes/resources, armor, all six branch payments and finality, exact recycle refunds, actual freeze/pulse/cluster behavior, deterministic theme pixels on reused and fresh Canvas contexts, decorative-only placement, legacy version-1 hydration, syntax/manifest/cache version, progression, saved bests, friendly loss/retry, viewport overflow, no external requests, and service-worker offline reload/play. Isolated mechanic fixtures fund a particular tower to test its behavior; the full balance runs inject no resources.

The engine exposes a deterministic harness only when the URL includes `?test`; the normal game has no test interface. Useful test hooks include `enemyKinds`, `makeWaveQueue`, `getTowerStats`, `chooseBranch`, `getSellRefund`, `spawnEnemy`, `hitEnemy`, `decorationPlan`, and `renderTheme`.

Also verified during development in Chromium: a version-1-to-version-2 service-worker update with old-cache cleanup, offline reload, and preserved legacy progress; touchscreen placement/upgrade, insufficient funds, two-upgrade cap, Cannon multi-target splash, Frost slowing, sound preference persistence, malformed/blocked localStorage recovery, and offline reload/play at a project subpath.

**Still needs a real iPhone check:** Safari touch and Web Audio behavior, Add to Home Screen installation, notch/safe-area layout, background/resume, and an installed-app airplane-mode relaunch. Chromium emulation is not a substitute for those device checks. Check the hosted update after the automatic deployment succeeds.

## Files

- `index.html` — mission selection, accessible controls, result dialog, original inline hero art.
- `game.js` — shared simulation/rendering, enemy registry, explicit wave compositions, six specializations, seeded planet themes, audio, saved progress, interactions.
- `style.css` — responsive portrait/desktop layout and visual system.
- `sw.js`, `manifest.json` — scoped offline cache and install metadata.
- `icons/` — local SVG source and 192/512/180-pixel app icons.
- `.github/workflows/pages.yml` — static GitHub Pages deployment.
- `tests/verify.cjs` — reproducible browser verification, separate from the shipped game.
