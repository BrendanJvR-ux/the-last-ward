# Defence of Goosebridge Castle

A single-map fantasy tower defence prototype, drawn as a sheet from an old notebook of studies, after the Renaissance anatomical notebooks: sepia ink on mottled parchment, folded once across and once down, with ink smudges and blocks of mirror-script notes in the margins. The drawing itself has dense hatching, gnarled trees full of knots, fynbos and protea, a turning windmill, butterflies in pen ticks, and a river that wells up from a spring among stones. An old wizard in a patterned robe and crooked hat keeps the inkwell, leaning on a quill as tall as a staff; he raises it while you trace and pulse. The sheet hangs in a thin silver frame on a sage-green wall. The creatures are gentle impossible hybrids: root-walking fynbos spirits, shoals of striped air-fish, a goggled wanderer and a walking citadel-fish with a stern human face. Two roads lead to Goosebridge Castle; your magic runs in ink along a separate network of leylines, from the wizard's inkwell in the castle garden out to thirteen tower foundations.

**Play it:** https://brendanjvr-ux.github.io/the-last-ward/

**Its anatomy offshoot:** *Defend the Heart* began as a conversion of this game and now lives in its own repository: [defend-the-heart](https://github.com/BrendanJvR-ux/defend-the-heart) (play at https://brendanjvr-ux.github.io/defend-the-heart/).

**Art style studies:** https://brendanjvr-ux.github.io/the-last-ward/styles.html (the same battle moment in alternative art directions, led by the sepia notebook look the game now uses, with notes on what each would mean in Unity; source in `src/styles/`)

## Two sheets

The game opens on a **main menu** (the **Menu** button returns to it at any time, and you can return to a game in progress). Pick a sheet:

1. **The Fields**: two roads across the fields to the castle gate (the Fen Levy and the war dogs), with the Bramble, Ember, Bell and Verdigris towers. Everything below describes this sheet unless it says otherwise.
2. **The Castle Courtyard**: the outer wall has fallen. The levy pour through the ruined gatehouse in the west wall (the Gatehouse Passage); the war dogs leap the breach in the north wall (the Breach, announced by the horn at the stable yard). Both meet at the gate stair before the east gate, beside its guard tower. Curtain walls enclose the whole yard. Four different towers defend it: the Gargoyle Perch, the Mangonel, the Ink Fountain and the Banner Tower. Same rules, same enemies, six new waves; 60 starting gold.

Winning the fields offers the courtyard straight away. Each sheet remembers your best result (castle health) in the browser.

TypeScript, Vite, HTML Canvas for the battlefield and HTML/CSS for the controls. All artwork and sound are made procedurally: no image or audio files, no fonts or services from the internet, no accounts or API keys.

## The central rule

Three separate decisions:

| | When | What it does |
|---|---|---|
| **Trace** | Between waves | Drag a line of ink from the inkwell along a leyline to a tower. It prepares that tower for the *next wave only*. |
| **Pulse** | During a wave | Click a traced tower to send a pulse down its thread. Its special ability fires when the pulse arrives. |
| **Bind** | Between waves, from wave 4 | Spend 3 Gilded Leaves to bind one tower in gold. From then on it has its own free pulse every wave, with no trace and no shared charge. Bound towers can't be traced; their leyline is gilded, a burnished vine of gold leaves. |

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
| Choose a sheet | **Menu**, then **Begin** on a sheet | `Esc` returns to a game in progress |
| Trace a tower | Press the inkwell, follow a leyline, release on a tower | Tab to **Trace** beside the tower in the margin |
| Undo / clear threads | **Undo last**, **Clear all**, or click a traced tower → **Remove this thread** | `U` undoes the last thread |
| Build | Click an empty foundation, pick a tower | Pick a foundation in the margin's **Build** list |
| Bind | Click a tower → **Bind in gold**, or margin → **Bind a tower**; hover to preview, confirm | Tab to a tower in **Bind a tower** (focus previews it), Enter |
| Start wave | **Start wave** (active once the exact number of threads is drawn) | `Enter` |
| Pulse | Click / tap a tower with a wet ink drop or a gold seal | `1`–`9` pulse ready towers in margin order (gilded first) |
| Pause | **Pause** | `P` or `Space` |
| Speed | **Speed ×1 / ×2** | |
| Inspect an enemy | Click / tap it during a wave | |
| Sound | **Sound on / off** (the hunt-master's horn) | |
| Restart | **Restart** (immediate) | |
| Wave preview | The ▴/▾ on the bookmark folds it (it folds itself during battle) | |
| Cancel | | `Esc` closes a popover or drops a thread |

## Enemies

Click (or tap) any enemy during a wave to see its health, armour and speed.

| Enemy | Health | Armour | Speed | Notes |
|---|---|---|---|---|
| **Fen Levy** | 36 | 2 | 40 | Fynbos root-walkers: protea-bud heads, one eye, bodies of tangled roots. Steady infantry that march down the Mill Road in tight files, three abreast, spaced so a Bramble hedge bunches the front ranks for the Ember Kiln's splash. |
| **War Dog** | 24 | 0 | 108 | Lean war dogs in studded collars, loosed in small packs on the King's Road. The hunt-master's double horn sounds and a warning appears at the bridge about 3.5 s before they reach it, enough to save an Ember pulse for the crossing. |
| **Stone-Bearer** | 130 | 0 | 26 | A goggled wanderer with a spiky crest, patterned coat and oxblood sash, carrying the Cairn-Born's stolen name-stone. |
| **Cairn-Born** | 700 | 8 | 24 | A walking citadel-fish with a stern human face, a little town on its back and an empty socket where its stone belonged, following its bearer. When the bearer falls, the giant walks to the stone, kneels there for 7 s blocking everything behind it on that road (both roads if on the shared stretch), then leaves the field and the queue is released. Time a pulse against the bearer to choose where the blockade forms. If the bearer reaches the gate, the giant marches on. Cannot be knocked back. |

Waves: Levy alone (1), War Dogs join (2), both together (3), a calmer wave to try your first bind (4), the Cairn-Born and its bearer on a quiet Mill Road (5), the pair on the Mill Road while the dogs threaten the bridge (6). The bookmark gives each wave a title and a line of verse; it does not tell you what is coming, where, or how many.

## Towers

| Tower | Attack | Pulse |
|---|---|---|
| **Bramble Tower** (a gnarled trunk; something watches from the knothole) | Thorns, single target | **Hedge**: a hedge grows across the nearest road; enemies on that lane halt and bunch up. On the shared stretch by the gate it blocks both lanes. |
| **Ember Kiln** (a hollow stump breathing smoke) | Lobbed coals, splash | **Firebrand**: the road near the kiln burns for several seconds. Burning ignores armour. The kiln at the Crossroads covers both roads. |
| **Bell Spire** (a striped spire with a crescent finial) | Periodic ring around it | **Great Toll**: knocks nearby enemies back along their own road and dazes them (not the Cairn-Born). |
| **Verdigris Font** (the eye-flower) | Copper spray that strips 2 armour per hit (up to 6, wears off after 4 s) | **Tarnish**: a green mist removes all armour from enemies nearby and makes them take 30% more damage for 6 s. |


### Courtyard towers

| Tower | Attack | Pulse |
|---|---|---|
| **Gargoyle Perch** (a winged stone gargoyle on a fluted pillar) | Long-range stone shards, single target, heavy and slow | **Stone Gaze**: everything nearby is turned to stone (stunned) for 4 s and chipped. The Cairn-Born only stiffens briefly. |
| **Mangonel** (a throwing engine on a stone platform) | Lobbed boulders, splash, very long range, slow | **Boulder Barrage**: seven boulders land one after another on the thickest crowd in reach. |
| **Ink Fountain** (a stone fountain; a striped fish spouts ink) | Gobs of ink that stain and slow the target | **Inkflood**: the nearby road floods with ink for 6 s; everything wading through crawls at a quarter speed and is slowly stained. |
| **Banner Tower** (a tall pole with a swallow-tailed pennant) | Light arrows. Every tower within a wide reach of a banner always reloads 25% faster | **Rally**: every tower across a broad swathe of the yard shoots twice as fast for 8 s. |

## Tuning

Every number lives in [`src/balance.ts`](src/balance.ts): castle health and its volley, rewards, tower costs and damage, pulse durations and strengths, bind cost, the trace/pulse table, the reinforcement wave, and for each sheet its starting gold, towers and six hand-authored waves (`LEVEL_BALANCE`).

`tests/balance.test.ts` (the fields) and `tests/courtyard.test.ts` (the courtyard) play each sheet headlessly with a scripted player and check that a sensible strategy wins, that the same towers without pulses lose, and that pulses without building lose. The scripted player uses a fixed random seed, so the results repeat exactly. Rerun `npm test` after tuning.

## Files

| File | What it is |
|---|---|
| `src/balance.ts` | All tuning values, the eight tower types, and each sheet's towers, purse and six waves. |
| `src/map.ts` | Each sheet's geometry: roads, river, the inkwell, the leyline tree and its 13 foundations, snapping. `setMapLevel` swaps them. |
| `src/game.ts` | Game state, the trace / pulse / bind / build rules and the combat simulation (no DOM). |
| `src/ink.ts` | The pen-and-ink look: hatching, wood grain and wash helpers, every tower, creature and building, the wizard, shared with the art studies. |
| `src/paint.ts` | The static sheets, drawn once each: the fields (roads, river and spring, trees, mill, windmill, castle) and the courtyard (flagstones, broken walls, gatehouse, breach, well, chapel, smithy, stables, keep). |
| `src/sprites.ts` | Tower and enemy sprites (walk cycles, the kneeling giant, ink spatter on hits) and margin icons. |
| `src/render.ts` | Live drawing: ink threads, gold leaf, hedges, flames, turning sails, butterflies, the wizard, effects, warnings, inspect highlight, the victory plate. |
| `src/audio.ts` | The synthesized double horn. |
| `src/main.ts` | The main menu, input (the trace gesture, pulses), the margin, HUD, ribbon bookmark, popovers and overlays. |
| `src/style.css` | Layout and look, including the phone layout. |
| `tests/` | Acceptance-rule tests, balance tests and the scripted player. |
| `scripts/deploy.sh` | Builds and publishes the game to the `gh-pages` branch. |
