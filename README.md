# Defence of Goosebridge Castle

A single-map fantasy tower defence prototype, drawn as a surreal pen-and-ink drawing on cream paper with a soft grey-sepia wash: dense hatching, gnarled trees full of knots, fynbos and protea, a turning windmill, butterflies in pen ticks, and a river that wells up from a spring among stones. An old wizard in a patterned robe and crooked hat keeps the inkwell, leaning on a quill as tall as a staff; he raises it while you trace and pulse. The page hangs like a gallery print on an indigo wall. The creatures are gentle impossible hybrids: root-walking fynbos spirits, shoals of striped air-fish, a goggled wanderer and a walking citadel-fish with a stern human face. Two roads lead to Goosebridge Castle; your magic runs in ink along a separate network of leylines, from the wizard's inkwell in the castle garden out to thirteen tower foundations.

**Play it:** https://brendanjvr-ux.github.io/the-last-ward/

**Its anatomy offshoot:** *Defend the Heart* began as a conversion of this game and now lives in its own repository: [defend-the-heart](https://github.com/BrendanJvR-ux/defend-the-heart) (play at https://brendanjvr-ux.github.io/defend-the-heart/).

**Art style studies:** https://brendanjvr-ux.github.io/the-last-ward/styles.html (the same battle moment in alternative art directions, led by the pen-and-ink look the game now uses, with notes on what each would mean in Unity; source in `src/styles/`)

TypeScript, Vite, HTML Canvas for the battlefield and HTML/CSS for the controls. All artwork and sound are made procedurally: no image or audio files, no fonts or services from the internet, no accounts or API keys.

## The central rule

Three separate decisions:

| | When | What it does |
|---|---|---|
| **Trace** | Between waves | Drag a line of ink from the inkwell along a leyline to a tower. It prepares that tower for the *next wave only*. |
| **Pulse** | During a wave | Click a traced tower to send a pulse down its thread. Its special ability fires when the pulse arrives. |
| **Bind** | Between waves, from wave 4 | Spend 3 Gilded Leaves to bind one tower in gold. From then on it has its own free pulse every wave, with no trace and no shared charge. Bound towers can't be traced. |

Always: **shared pulses < traces < unbound towers.** Binding is refused if it would leave too few unbound towers to fill the traces (in waves 4–6 you need five towers before you can bind one).

| Waves | Traces required | Pulses |
|---|---|---|
| 1–3 | exactly 2 distinct towers | 1 |
| 4–6 | exactly 3 distinct towers | 2 |

If you still own only three towers when wave 4's preparation begins, the Crown sends a free fourth tower (you choose its type and foundation), so the rule always holds.

The castle defends itself too: a weak, short-range volley at anything that reaches the gate.

Every tower attacks on its own, traced or not. Shared pulse charges never recharge during a wave and never carry over; each tower fires at most once per wave. Every ink thread fades at the end of every wave; gold stays.

## Run it locally

Needs Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173/ (the game) or http://localhost:5173/styles.html (art studies). Other commands: `npm test` (rules and balance tests), `npm run build` (production build into `dist/`), `npm run preview` (serve the build), `npm run deploy` (test, build and publish `dist/` to the `gh-pages` branch that GitHub Pages serves).

## Controls

| | Mouse / touch | Keyboard |
|---|---|---|
| Trace a tower | Press the inkwell, follow a leyline, release on a tower | Tab to **Trace** beside the tower in the margin |
| Undo / clear threads | **Undo last**, **Clear all**, or click a traced tower → **Remove this thread** | `U` undoes the last thread |
| Build | Click an empty foundation, pick a tower | Pick a foundation in the margin's **Build** list |
| Bind | Click a tower → **Bind in gold**, or margin → **Bind a tower**; hover to preview, confirm | Tab to a tower in **Bind a tower** (focus previews it), Enter |
| Start wave | **Start wave** (active once the exact number of threads is drawn) | `Enter` |
| Pulse | Click / tap a tower with a wet ink drop or a gold seal | `1`–`9` pulse ready towers in margin order (gilded first) |
| Pause | **Pause** | `P` or `Space` |
| Speed | **Speed ×1 / ×2** | |
| Inspect an enemy | Click / tap it during a wave | |
| Sound | **Sound on / off** (the hounds' horn) | |
| Restart | **Restart** (immediate) | |
| Wave preview | The ▴/▾ on the bookmark folds it (it folds itself during battle) | |
| Cancel | | `Esc` closes a popover or drops a thread |

## Enemies

Click (or tap) any enemy during a wave to see its health, armour and speed.

| Enemy | Health | Armour | Speed | Notes |
|---|---|---|---|---|
| **Fen Levy** | 36 | 2 | 40 | Fynbos root-walkers: protea-bud heads, one eye, bodies of tangled roots. Steady infantry that march down the Mill Road in tight files, three abreast, spaced so a Bramble hedge bunches the front ranks for the Ember Kiln's splash. |
| **Barrow Hound** | 24 | 0 | 108 | Striped fish loosed from the barrows, swimming through the air in small shoals on the King's Road. A double horn call sounds and a warning appears at the bridge about 3.5 s before they reach it, enough to save an Ember pulse for the crossing. |
| **Stone-Bearer** | 130 | 0 | 26 | A goggled wanderer with a spiky crest, patterned coat and oxblood sash, carrying the Cairn-Born's stolen name-stone. |
| **Cairn-Born** | 700 | 8 | 24 | A walking citadel-fish with a stern human face, a little town on its back and an empty socket where its stone belonged, following its bearer. When the bearer falls, the giant walks to the stone, kneels there for 7 s blocking everything behind it on that road (both roads if on the shared stretch), then leaves the field and the queue is released. Time a pulse against the bearer to choose where the blockade forms. If the bearer reaches the gate, the giant marches on. Cannot be knocked back. |

Waves: Levy alone (1), Hounds join (2), both together (3), a calmer wave to try your first bind (4), the Cairn-Born and its bearer on a quiet Mill Road (5), the pair on the Mill Road while Hounds threaten the bridge (6). The bookmark gives each wave a title and a line of verse; it does not tell you what is coming, where, or how many.

## Towers

| Tower | Attack | Pulse |
|---|---|---|
| **Bramble Tower** (a gnarled trunk; something watches from the knothole) | Thorns, single target | **Hedge**: a hedge grows across the nearest road; enemies on that lane halt and bunch up. On the shared stretch by the gate it blocks both lanes. |
| **Ember Kiln** (a hollow stump breathing smoke) | Lobbed coals, splash | **Firebrand**: the road near the kiln burns for several seconds. Burning ignores armour. The kiln at the Crossroads covers both roads. |
| **Bell Spire** (a striped spire with a crescent finial) | Periodic ring around it | **Great Toll**: knocks nearby enemies back along their own road and dazes them (not the Cairn-Born). |
| **Verdigris Font** (the eye-flower) | Copper spray that strips 2 armour per hit (up to 6, wears off after 4 s) | **Tarnish**: a green mist removes all armour from enemies nearby and makes them take 30% more damage for 6 s. |


## Tuning

Every number lives in [`src/balance.ts`](src/balance.ts): castle health and its volley, starting gold, rewards, tower costs and damage, pulse durations and strengths, bind cost, the trace/pulse table, the reinforcement wave and all six hand-authored waves.

`tests/balance.test.ts` plays the game headlessly with a scripted player and checks that a sensible strategy wins, that the same towers without pulses lose, and that pulses without building lose. Rerun `npm test` after tuning.

## Files

| File | What it is |
|---|---|
| `src/balance.ts` | All tuning values and the six waves. |
| `src/map.ts` | Map geometry: roads, river, the inkwell, the leyline tree and its 13 foundations, snapping. |
| `src/game.ts` | Game state, the trace / pulse / bind / build rules and the combat simulation (no DOM). |
| `src/ink.ts` | The pen-and-ink look: hatching, wood grain and wash helpers, every tower, creature and building, the wizard, shared with the art studies. |
| `src/paint.ts` | The static sheet: paper, roads, river and spring, trees, mill, windmill, castle, inkwell and labels (drawn once). |
| `src/sprites.ts` | Tower and enemy sprites (walk cycles, the kneeling giant, ink spatter on hits) and margin icons. |
| `src/render.ts` | Live drawing: ink threads, gold leaf, hedges, flames, turning sails, butterflies, the wizard, effects, warnings, inspect highlight, the victory plate. |
| `src/audio.ts` | The synthesized double horn. |
| `src/main.ts` | Input (the trace gesture, pulses), the margin, HUD, ribbon bookmark, popovers and overlays. |
| `src/style.css` | Layout and look, including the phone layout. |
| `tests/` | Acceptance-rule tests, balance tests and the scripted player. |
| `scripts/deploy.sh` | Builds and publishes the game to the `gh-pages` branch. |
