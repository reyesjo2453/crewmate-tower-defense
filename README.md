# Crewmate Craft · Base Defense

A bright, friendly tower defense game about a little space base and the crew who protect it. Orange bots follow the path; your towers do the rest. Made for portrait phones, with responsive desktop controls too.

**Play:** pick a mission, choose a tower, tap an empty blue square, then **Start wave**. Tap an existing tower to buy an upgrade or recycle it. Survive every wave to unlock the next mission. A loss offers an immediate retry.

## Three missions, one engine

| Mission | Waves | Starting coins | Starting lives | What changes |
| --- | ---: | ---: | ---: | --- |
| First Stand | 10 | 140 | 20 | A short, gentle route and easy bots |
| Winding Way | 15 | 160 | 20 | A longer winding route and fast runners |
| Bot Flood | 20 | 180 | 20 | A twisty route, armored bots, and exactly one big boss at the end |

Every bot that reaches the base costs **one life**, including the boss. Stopping bots earns coins; clearing a nonfinal wave adds 15 teamwork coins. Waves start only when you choose, so there is always time to think and build.

| Tower | Build cost | Role | Upgrade costs |
| --- | ---: | --- | --- |
| Blaster | 45 | Fast, inexpensive single-target shots | 40, then 65 |
| Cannon | 80 | Slower shots with splash damage | 65, then 95 |
| Frost | 65 | Chilly shots slow bots for nearby teammates | 55, then 85 |

Each tower has **two paid upgrades** (three total power levels). Recycling returns 65% of its total investment, rounded down. Towers target the furthest-progressed bot in range. A mix of towers near bends is a good starting plan.

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

The repository includes `.github/workflows/pages.yml`. It uploads only the static game and icons and deploys pushes to `main`, or a manual workflow run.

1. In the repository's **Settings → Pages**, manually select **GitHub Actions** as the publishing source.
2. Push to `main`, or run **Deploy to GitHub Pages** from the Actions tab.
3. Once deployment succeeds, the expected project URL is `https://reyesjo2453.github.io/crewmate-tower-defense/`.

The workflow requests `contents: read`, `pages: write`, and `id-token: write`. Its configuration action explicitly sets `enablement: false`: it reads existing Pages settings and **does not enable Pages automatically**. A first run may fail until Pages is configured manually. All app, manifest, icon, and service-worker URLs are relative, so project subpaths work.

## Offline and iPhone installation

Open the HTTPS site once while connected. Wait for **Ready offline** in mission control; the service worker has then cached the complete game. The app can reload and play offline. Progress and sound preferences save in localStorage on that browser/device; unlocked missions and best results survive closing and reopening. Active waves are not saved, so a full reload returns to mission control. Clearing site data clears progress. If storage is blocked, the game remains playable and keeps progress for the current session.

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

The test runs all **45 waves using only starting and earned coins**, with a reproducible mixed-tower strategy. It checks locked missions, path placement, costs, pause, one-life leaks, sequential unlocks, saved bests, friendly loss/retry, viewport overflow, absence of external requests, and real service-worker offline reload/play. Expected balance results: all three missions can be cleared with 20 lives; 86, 181, and 311 bots are stopped, with exactly one boss in the last mission. The engine exposes a deterministic harness only when the URL includes `?test`; the normal game has no test interface.

Also verified during development in Chromium: touchscreen placement/upgrade, insufficient funds, two-upgrade cap, Cannon multi-target splash, Frost slowing, sound preference persistence, malformed/blocked localStorage recovery, and offline reload/play at a project subpath.

**Still needs a real iPhone check:** Safari touch and Web Audio behavior, Add to Home Screen installation, notch/safe-area layout, background/resume, and an installed-app airplane-mode relaunch. Chromium emulation is not a substitute for those device checks. GitHub-hosted deployment must be checked after Pages is manually configured and a workflow succeeds.

## Files

- `index.html` — mission selection, accessible controls, result dialog, original inline hero art.
- `game.js` — shared simulation/rendering, three level/wave tables, audio, saved progress, interactions.
- `style.css` — responsive portrait/desktop layout and visual system.
- `sw.js`, `manifest.json` — scoped offline cache and install metadata.
- `icons/` — local SVG source and 192/512/180-pixel app icons.
- `.github/workflows/pages.yml` — static GitHub Pages deployment.
- `tests/verify.cjs` — reproducible browser verification, separate from the shipped game.
