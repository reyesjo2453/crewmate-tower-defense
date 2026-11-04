# Crewmate Command: The Hollow Signal

A story-driven, Arknights-style tower defense starring bean-shaped astronaut crewmates — an unofficial **fan spin-off** of that famous space-mystery party game. All art, music and story are original, drawn and synthesized in code. No assets are copied and nothing is affiliated with the original studio.

Built as an offline-capable **PWA**: no build step, no dependencies, no accounts, no ads.

## The story

The cargo ship **HALCYON** wakes two crew from cryo-sleep to find something crawling out of the vents. It isn't an Impostor. It's a *Signal* — a lonely thing that learned to wear faces — and it keeps whispering one word: **"stay."** Across ten missions (three chapters) the crew follow it from the HALCYON through Polus Station, MIRA HQ and the glowing Fungle to the wreck of the long-lost **Meridian**, where Rook's missing sister waits. The finale asks whether you can win a war by finally saying hello.

## How it plays (the Arknights part)

- **Deploy** crewmates from the bar using **DP** (Deployment Points), which refill over time. Cost, timing and placement are the whole game.
- **Floor path tiles** hold melee *guards* that **block** walking foes. **High decks** hold ranged crew.
- A guard can only block so many foes at once (`block`); extra foes walk past. Flying foes can't be blocked at all.
- Tap a crewmate to **Promote** (stronger, up to 2 ranks), **Retreat** (refund half your DP) or fire their **Skill** (a charge bar fills over time — tap when the star lights up).
- Two damage types: physical shots are reduced by **armor**; Sparky's electricity ignores it.
- Stealthy **Shapeshifters** can't be targeted until they get close — or until **Echo** scans them.
- Three difficulty levels in Settings: **Crew** (relaxed, for ~7-year-old commanders), **Captain** (intended) and **Impostor** (hard). Stars (1–3) are earned by ship health left.

| Crew | Role | Notes |
| --- | --- | --- |
| Brick (red) | Guard | blocks 1, hits hard, skill: Body Slam |
| Tank (purple) | Defender | blocks 3, very tough, skill: Hold the Line |
| Rook (blue) | Shooter | long range, weak against armor |
| Lumi (green) | Medic | heals allies, skill: Group Hug |
| Sparky (yellow) | Zapper | area electric damage, ignores armor |
| Echo (cyan) | Scanner | slows foes, reveals sneakers |

Foes include Vent Crawlers, Mimics, Wisp Ghosts (flying), Sabotage Drones (flying, shoot back), Shapeshifters (stealth), Plated Mimics (armor), Spore Walkers (split when popped) and three bosses. The **Logbook** (title/map screen) lists everyone and what to do about them.

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

Stars unlock **hats** (10), **visor colours** (5) and **pets** (5) — e.g. Party Hat at 4★, Fix-It Bot at 9★, Crown at 26★. Each crewmate has their own look, shown in battle, on cards and in story scenes. Open it from the mission map or the squad screen; new unlocks get a red dot and a line on the victory screen. Looks are cosmetic only.

Mission 1 is a hand-held **tutorial** with Captain Juno (replayable in Settings).

## Soundtrack

An original, adaptive score synthesized live in `js/audio.js` (no audio files): a tense D-minor theme in the spirit of the "hide and seek" style of space-thriller music.

- **Title / map:** slow pads, a bell melody, a low drone.
- **Story scenes:** quiet pads and distant bells.
- **Battle** is layered and follows the fight: a ticking clock before the wave, then a pulsing bass, then four-on-the-floor drums and 16th-note arpeggios, then the full lead melody when the field is crowded or on the final wave.
- **Heartbeat:** fades in and speeds up as foes get close to the reactor or the ship's health runs low.
- **Bosses** switch to a faster, darker groove with brass stabs and risers.
- **Victory and defeat** each get a short sting.

`Sound.preview(mood, intensity, danger, seconds)` renders any mood offline, which is handy for tuning the mix.

## Controls

Touch / mouse: tap a card → tap a glowing tile; tap a crewmate for its menu. Tap a striped door to slam it; tap flashing panels to fix sabotage. Keyboard: `1`–`6` pick crew, `Space` start/next wave, `P` pause, `Esc` cancel. The game plays best in **landscape**; it works in portrait with smaller tiles.

## Run it

```sh
python3 -m http.server 8000      # then open http://localhost:8000/
```

Service workers need HTTPS or localhost. Open once online, wait a moment, and it plays offline. On iPhone: Safari → Share → **Add to Home Screen**. On Android/desktop Chrome: menu → **Install app**.

Progress (stars, unlocks, settings) is saved in `localStorage` under `crewmate-command-v1`.

## GitHub Pages

`.github/workflows/pages.yml` publishes the static files on pushes to `main` (the site must already have Pages enabled; the workflow never changes Pages settings). After changing any cached file, bump `VERSION` in `sw.js`.

## Project layout

- `index.html`, `style.css` — shell and styling
- `js/data.js` — **all content**: crew, foes, themes, maps, waves, story, tutorial script, difficulty, doors & sabotage, squads, wardrobe items
- `js/art.js` — Canvas drawing for crewmates, foes and environments
- `js/engine.js` — simulation + rendering (DOM-free, can run headless)
- `js/ui.js` — screens, dialogue, squad select, wardrobe, HUD, tutorial, save data
- `js/audio.js` — synthesized sound & music
- `sw.js`, `manifest.json`, `icons/` — PWA
- `tests/` — dev only: `verify.cjs` (data validation, a click-through of the first-play journey, mechanics, offline), `sim.cjs` + `bot.js` (an automatic player used to tune difficulty)

## Testing

```sh
python3 -m http.server 8000 &
NODE_PATH=$(npm root -g) node tests/verify.cjs     # needs Playwright
NODE_PATH=$(npm root -g) node tests/sim.cjs captain,crew
```

The `?test` URL flag exposes `window.__t` for the tests; the normal game exposes nothing.

## Adding a mission

Add an entry to `LEVELS` in `js/data.js`: grid size, `routes` (ground paths on tile corners; `air` routes for flyers), `high` deck tiles, `walls`, `waves` via `W(secondsUntilNext, [foe, count, gap, route, delay])`, and `pre`/`post` story lines. Doors and sabotage go in `LEVEL_EXTRAS` (`doors: [[x, y]]` on floor-path tiles, `sabo: { waveNumber: 'lights' | 'o2' | 'reactor' }`); `squad` overrides the seat count. `node tests/verify.cjs` checks it for overlapping tiles and bad references.
