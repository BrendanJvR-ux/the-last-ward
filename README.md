# Defence of Goosebridge Castle

A three-level fantasy tower defence prototype, drawn as a sheet from an old notebook of studies, after the Renaissance anatomical notebooks: sepia ink on mottled parchment, folded once across and once down, with ink smudges and blocks of mirror-script notes in the margins. The drawing itself has dense hatching, gnarled trees full of knots, fynbos and protea, a turning windmill, butterflies in pen ticks, and a river that wells up from a spring among stones. An old wizard in a patterned robe and crooked hat keeps the inkwell, leaning on a quill as tall as a staff; he raises it while you trace and pulse. The sheet hangs in a thin silver frame on a sage-green wall. The creatures are gentle impossible hybrids: root-walking fynbos spirits, lean war dogs, a goggled wanderer and a walking citadel-fish with a stern human face. Two roads lead to Goosebridge Castle; your magic runs in ink along a separate network of leylines, from the wizard's inkwell in the castle garden out to thirteen tower foundations.

**Play it:** https://brendanjvr-ux.github.io/the-last-ward/

**Its anatomy offshoot:** *Defend the Heart* began as a conversion of this game and now lives in its own repository: [defend-the-heart](https://github.com/BrendanJvR-ux/defend-the-heart) (play at https://brendanjvr-ux.github.io/defend-the-heart/).

**Art style studies:** https://brendanjvr-ux.github.io/the-last-ward/styles.html (the same battle moment in alternative art directions, led by the sepia notebook look the game now uses, with notes on what each would mean in Unity; source in `src/styles/`)

## Menu and levels

The game opens on a **menu** (the **Menu** button returns to it at any time):

- **Start** chooses a level: **Level 1: Gate Defence**, **Level 2: The Castle Courtyard**, **Level 3: The Keep**, **Level 4: The Flooded Fen** or **Level 5: The Barrows**, each with a drawn thumbnail, its four towers and your best result.
- **Resume** returns to the game in progress.
- **Redeem rewards** spends **Wizard's Seals**. You earn 1 seal for every wave held, 5 for winning a level, 5 more the first time you win it, and 3 more for a flawless defence (no castle health lost). Seals buy lasting rewards, kept in this browser:

  | Reward | Seals | What it does |
  |---|---|---|
  | Deep Inkwell | 8 | Begin every level with 30 more gold. |
  | Gilded Start | 10 | Begin every level with one Gilded Leaf. |
  | Stout Walls | 14 | The castle starts every level with 5 more health. |
  | Owl Familiar | 5 | A small ink owl sits by the inkwell. |
  | Crimson Ink | 6 | Traced threads run in crimson ink. |

  Perks apply from the next level you start; any reward you own can be switched off and on again.
- **Rare creature casebook** records the very rare creatures you have met (see below).
- **Exit** closes the book (the game waits on its page until you close the tab).

1. **Gate Defence**: two roads across the fields to the castle gate (the Fen Levy and the war dogs), with the Bramble, Ember, Bell and Verdigris towers. Everything below describes this level unless it says otherwise.
2. **The Castle Courtyard**: the outer wall has fallen. The levy pour through the ruined gatehouse in the west wall (the Gatehouse Passage); the war dogs leap the breach in the north wall (the Breach, announced by a warning at the stable yard). Both meet at the gate stair before the east gate, beside its guard tower. Curtain walls enclose the whole yard, and the yard is full of life: a well, chapel, smithy, stables, beehives, a kitchen garden, a market stall, a washing line, archery butts, a weapon rack, a dovecote, a founder's statue, hens, woodpiles, ivy and torches on the walls. Four different towers defend it: the Gargoyle Perch, the Mangonel, the Ink Fountain and the Banner Tower. Same rules, same enemies, six new waves; 60 starting gold.

3. **The Keep**: inside the keep itself, drawn in cut-away like an architect's section: four floors from the cellars to the roof. The levy come in at the broken west door and climb the **Great Stair**; the dogs come up from the cellars by the **Cellar Stair** (a warning shows there). The two stairs meet on the landing of the Great Hall, and one grand stair climbs to the top floor and along it to the **study door**, where the wizard keeps his inkwell. Towers stand on the floors and on stone ledges and landings between them: the Suit of Armour, the Flapping Library, the Chandelier and the Great Hearth. Kitchen, library, Great Hall with its long table, tapestries, chandeliers, cellar casks and the wizard's study fill the rooms. Six new waves; 70 starting gold.
4. **The Flooded Fen**: the water meadows in flood, the levy's own home ground. The levy wade in along the **Reed Causeway**, which zigzags across the drowned fields in three switchbacks; the dogs come up the **Eel Dyke** from the sluice in the south (a warning shows there), stepping east and north. Both meet below the Withy Bed and one causeway runs east to the **Weir House**, where the wizard keeps his inkwell. **The flood:** each wave one road is under water, the Eel Dyke on odd waves and the Reed Causeway on even ones (the margin says which). The levy, bearers and giants wade the flooded stretch at 60% speed; the war dogs swim through at full speed. Every foundation is a little island of firm ground. Towers: the Waterwheel, the Heron Roost, the Eel Trap and the Marsh Lantern. Six new waves; 75 starting gold.
5. **The Barrows**: the chalk downs at dusk, where the dogs are kennelled in the old burial mounds and the giants sleep. The levy come over the hill by the **Corpse Road**, which loops north round the dolmen before turning east; the dogs break out of the **Kennel Barrow** in the south and run the sunken **Hollow Way** east and back north. Both meet below the **Ward Ring**, a henge where the wizard makes his last stand. **Nightfall:** each wave starts at dusk and grows dark over 35 s; by full night every tower reaches 25% less far, except towers within the light of a **Barrow Beacon**, which keep their full range (the margin shows how dark it is). Towers: the Standing Stone, the Bone Chimes, the Barrow Beacon and the Barrow Warden. Six new waves, the hardest in the game; 100 starting gold.

Winning each level offers the next one straight away (the fields, the courtyard, the keep, the fen, the barrows), and the barrows end the story. Each level remembers your best result (castle health) in the browser.

TypeScript, Vite, HTML Canvas for the battlefield and HTML/CSS for the controls. All artwork is made procedurally: no image files, no fonts or services from the internet, no accounts or API keys.

## The central rule

Three separate decisions:

| | When | What it does |
|---|---|---|
| **Trace** | Between waves | Drag a line of ink from the inkwell along a leyline to a tower. It prepares that tower for the *next wave only*. |
| **Pulse** | During a wave | Double-click a traced tower (or press its Pulse button) to send a pulse down its thread. Its special ability fires when the pulse arrives. |
| **Bind** | Between waves, from wave 4 | Spend 3 Gilded Leaves to bind one tower in gold. From then on it has its own free pulse every wave, with no trace and no shared charge. Bound towers can't be traced; their leyline is gilded, a burnished vine of gold leaves. |

Always: **shared pulses < traces < unbound towers.** Binding is refused if it would leave too few unbound towers to fill the traces (in waves 4–6 you need five towers before you can bind one).

| Waves | Traces required | Pulses |
|---|---|---|
| 1–3 | exactly 2 distinct towers | 1 |
| 4–6 | exactly 3 distinct towers | 2 |

If you still own only three towers when wave 4's preparation begins, the Crown sends a free fourth tower (you choose its type and foundation), so the rule always holds.

The castle defends itself too: a weak, short-range volley at anything that reaches the gate.

Every tower attacks on its own, traced or not. Shared pulse charges never recharge during a wave and never carry over; each tower fires at most once per wave. Every ink thread fades at the end of every wave; gold stays.

### Learning it in the first wave

Level 1, wave 1 teaches the core rule through play. The margin opens with *"All towers attack. Trace two. During the wave, choose one to pulse."* above the towers, the towers still to be traced are ringed on the map, and the Build and Bind sections start folded (they open with a click; from wave 2 the usual panels return). Both freehand tracing and the Trace buttons work.

**Previewing a pulse is free.** Hover or keyboard-focus a tower's Pulse button, or hover the tower on the map, and its pulse is previewed: the tower is ringed, its area (a circle, a stretch of road, the spot a hedge would grow, the crowd a mangonel would aim at, or the towers a banner would rally) is marked in a light ink line, and the enemies it could affect are outlined: a solid ring for those affected now, a dashed ring for those it should catch by the time the ink arrives or the effect has run. A short label says what it would do. On a touch screen, **press and hold** a tower (or its Pulse button) for about half a second to see the same preview; it lingers a moment after you lift your finger. A quick tap still pulses, or opens the tower between waves, exactly as before, and sliding your finger away before the hold completes cancels it. Nothing is spent, nothing pauses, and clicks, taps and number keys work as before.

**Every pulse reports what it did**, beside its tower, from what actually happened: "3 enemies knocked back and dazed", "2 enemies set burning", "No enemies in range", "5 towers shoot twice as fast for 8 s". Lasting effects add a closing line when they end ("The hedge held 9 enemies", "The fire burned 4 enemies"). When the shared charge is spent, the label says so, a dashed thread runs to the other prepared towers with "Thread dry: the shared pulse is spent · still attacking on its own", their ink drop dries, and the margin explains that every tower keeps attacking.

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
| Menu | **Menu**: Start (choose a level), Resume, Redeem rewards, Exit | `Esc` goes back, or returns to a game in progress |
| Trace a tower | Press the inkwell, follow a leyline, release on a tower | Tab to **Trace** beside the tower in the margin |
| Undo / clear threads | **Undo last**, **Clear all**, or click a traced tower → **Remove this thread** | `U` undoes the last thread |
| Build | Click an empty foundation, pick a tower | Pick a foundation in the margin's **Build** list |
| Bind | Click a tower → **Bind in gold**, or margin → **Bind a tower**; hover to preview, confirm | Tab to a tower in **Bind a tower** (focus previews it), Enter |
| Start wave | **Start wave** (active once the exact number of threads is drawn) | `Enter` |
| Pulse | Double-click / double-tap a tower with a wet ink drop or a gold seal, or press its **Pulse** button in the margin. Hover (or press and hold on touch) to preview first | `1`–`9` pulse ready towers in margin order (gilded first); focus a Pulse button to preview |
| Pause | **Pause** | `P` or `Space` |
| Speed | **Speed ×1 / ×2** | |
| Inspect an enemy | Click / tap it during a wave | |
| Restart | **Restart** (immediate) | |
| Wave preview | The ▴/▾ on the bookmark folds it (it folds itself during battle) | |
| Cancel | | `Esc` closes a popover or drops a thread |

## Enemies

Click (or tap) any enemy during a wave to see its health, armour and speed.

| Enemy | Health | Armour | Speed | Notes |
|---|---|---|---|---|
| **Fen Levy** | 36 | 2 | 40 | Fynbos root-walkers: protea-bud heads, one eye, bodies of tangled roots. Steady infantry that march down the Mill Road in tight files, three abreast, spaced so a Bramble hedge bunches the front ranks for the Ember Kiln's splash. |
| **War Dog** | 24 | 0 | 108 | Lean war dogs in studded collars, loosed in small packs on the King's Road. A warning appears at the bridge about 3.5 s before they reach it, enough to save an Ember pulse for the crossing. |
| **Stone-Bearer** | 130 | 0 | 26 | A goggled wanderer with a spiky crest, patterned coat and oxblood sash, carrying the Cairn-Born's stolen name-stone. |
| **Cairn-Born** | 360 | 4 | 24 | A walking citadel-fish with a stern human face, a little town on its back and an empty socket where its stone belonged, following its bearer. When the bearer falls, the giant walks to the stone, kneels there for 7 s blocking everything behind it on that road (both roads if on the shared stretch), then rises with its stone and marches on towards the gate: it must be brought down, and costs 3 castle health if it gets through. Time a pulse against the bearer to choose where the blockade forms. If the bearer reaches the gate, the giant marches on. Cannot be knocked back. |

Waves: Levy alone (1), War Dogs join (2), both together (3), a calmer wave to try your first bind (4), the Cairn-Born and its bearer on a quiet Mill Road (5), the pair on the Mill Road while the dogs threaten the bridge (6). The bookmark gives each wave a title and a line of verse; it does not tell you what is coming, where, or how many.

### Rare creatures

In about a third of games (`BALANCE.rares.chance`), one very rare creature wanders onto a road during a random wave from 2 onwards, ringed by little gold stars. It never harms the castle: if it reaches the gate, or is still on the road when the wave ends, it simply slips away. Catch it for gold and Wizard's Seals.

| Creature | Rarity | Health · armour · speed | Caught |
|---|---|---|---|
| **Lantern Moth** (eyes on its wings, carrying a lantern) | rare | 70 · 0 · 58 | 12 gold, 1 seal |
| **Clockwork Heron** (brass gears showing through) | rare | 110 · 3 · 74 | 18 gold, 2 seals |
| **Teapot Tortoise** (its shell a steaming teapot) | rare | 300 · 6 · 18 | 28 gold, 2 seals |
| **Cathedral Snail** (a cathedral for a shell) | very rare | 420 · 5 · 13 | 40 gold, 3 seals |
| **Golden Hare** (beaten gold leaf) | rarest | 50 · 0 · 150 | 60 gold, 5 seals |

The **Rare creature casebook** in the menu keeps a page for each: a silhouette until you first see it, then its picture, when and where you first saw it (date, level and wave), and how many times you have seen and caught it. It is kept in this browser.

## Towers

| Tower | Attack | Pulse |
|---|---|---|
| **Bramble Tower** (a gnarled trunk; something watches from the knothole) | Thorns, single target | **Hedge**: a hedge grows across the nearest road; enemies on that lane halt and bunch up. On the shared stretch by the gate it blocks both lanes. |
| **Ember Kiln** (a hollow stump breathing smoke) | Lobbed coals, splash | **Firebrand**: the road near the kiln burns for several seconds. Burning ignores armour. The kiln at the Crossroads covers both roads. |
| **Bell Spire** (a striped spire with a crescent finial) | Periodic ring around it | **Great Toll**: knocks nearby enemies a short way back along their own road and dazes them briefly (not the Cairn-Born). |
| **Verdigris Font** (the eye-flower) | Copper spray that strips 2 armour per hit (up to 6, wears off after 4 s) | **Tarnish**: a green mist removes all armour from enemies nearby and makes them take 30% more damage for 6 s. |


### Courtyard towers

| Tower | Attack | Pulse |
|---|---|---|
| **Gargoyle Perch** (a winged stone gargoyle on a fluted pillar) | Long-range stone shards, single target, heavy and slow | **Stone Gaze**: everything nearby is turned to stone (stunned) for 4 s and chipped. The Cairn-Born only stiffens briefly. |
| **Mangonel** (a throwing engine on a stone platform) | Lobbed boulders, splash, very long range, slow | **Boulder Barrage**: seven boulders land one after another on the thickest crowd in reach. |
| **Ink Fountain** (a stone fountain; a striped fish spouts ink) | Gobs of ink that stain and slow the target | **Inkflood**: the nearby road floods with ink for 4 s; everything wading through slows to a little under half speed and is slowly stained. |
| **Banner Tower** (a tall pole with a swallow-tailed pennant) | Light arrows. Every tower within a wide reach of a banner always reloads 25% faster | **Rally**: every tower across a broad swathe of the yard shoots twice as fast for 8 s. |

### Keep towers

| Tower | Attack | Pulse |
|---|---|---|
| **Suit of Armour** (plumed helm, crescent shield, halberd) | Thrown daggers: short reach, hard hits | **Shield Wall**: the armour plants a wall of shields across the nearest stair for 6 s; enemies on that way halt behind it, and those right at it are struck. |
| **Flapping Library** (a bookcase whose books fly off like birds) | Fast, light flying books | **Paper Storm**: a whirl of pages blinds and slows everything nearby for 5 s. |
| **Chandelier** (an iron wheel of candles on a gibbet post) | Drips of hot wax that splash | **The Fall**: the chain is cut and the chandelier crashes onto the thickest crowd in reach. |
| **Great Hearth** (a stone fireplace with a hooded chimney) | Embers that splash | **Back-draught**: fire roars across the nearby floor; everything on it burns, ignoring armour. |

### Fen towers

| Tower | Attack | Pulse |
|---|---|---|
| **Waterwheel** (a timber wheel-house on piles, its wheel turning) | Buckets of water flung in an arc, splashing | **Sluice Surge**: a wall of water washes everything nearby back down the causeway and dazes it. Giants stand firm. |
| **Heron Roost** (a stilted reed platform with herons on guard) | Fast stabs of the bill | **Stoop**: every heron dives at once onto the thickest crowd in reach. |
| **Eel Trap** (wicker traps hung on a post, eels curling out) | Thrown eels that slow what they hit | **Eel Snare**: eels coil across the nearest causeway for 6 s; enemies on that way halt behind them, and those right at it are bitten. |
| **Marsh Lantern** (a horn lantern on a crooked pole, wisps circling) | Wisps of light | **Marsh Lights**: everything nearby is lit up, loses its armour and takes 30% more damage for 6 s. |

### Barrow towers

| Tower | Attack | Pulse |
|---|---|---|
| **Standing Stone** (a carved menhir whose rune glows) | Heavy chips of rune-stone | **Stone Sleep**: everything nearby is turned to stone for 4 s; giants only stiffen. |
| **Bone Chimes** (a dead thorn hung with bone chimes) | A ring that hurts everything in reach | **Dirge**: a low dirge slows everything nearby for 5 s and hurts it. |
| **Barrow Beacon** (an iron fire-basket on a cairn) | Firebrands that splash | **Beacon Blaze**: burning brands set the nearby road alight; everything on it burns, ignoring armour. |
| **Barrow Warden** (a hooded warden of the dead with a spear) | Javelins | **The Old Watch**: every tower nearby shoots twice as fast for 8 s. Towers beside a warden always shoot a little faster. |

## Tuning

Every number lives in [`src/balance.ts`](src/balance.ts): castle health and its volley, rewards, tower costs and damage, pulse durations and strengths, bind cost, the trace/pulse table, the reinforcement wave, and for each sheet its starting gold, towers and six hand-authored waves (`LEVEL_BALANCE`).

`tests/balance.test.ts` (Gate Defence), `tests/courtyard.test.ts`, `tests/keep.test.ts`, `tests/fen.test.ts` and `tests/barrows.test.ts` play each level headlessly with a scripted player and check that a sensible strategy wins, that the same towers without pulses lose, and that pulses without building lose. The scripted player uses a fixed random seed, so the results repeat exactly. Rerun `npm test` after tuning.

## Files

| File | What it is |
|---|---|
| `src/balance.ts` | All tuning values, the twenty tower types, and each sheet's towers, purse and six waves. |
| `src/map.ts` | Each sheet's geometry: roads, river, the inkwell, the leyline tree and its 13 foundations, snapping. `setMapLevel` swaps them. |
| `src/game.ts` | Game state, the trace / pulse / bind / build rules, the pulse families every tower's pulse belongs to (block, road, pool, stun, slow, weaken, knockback, volley, rally) and the combat simulation (no DOM). |
| `src/ink.ts` | The pen-and-ink look: hatching, wood grain and wash helpers, every tower, creature and building, the wizard, shared with the art studies. |
| `src/paint.ts` | The static sheets, drawn once each: the fields (roads, river and spring, trees, mill, windmill, castle) the courtyard (flagstones, walls all round, fallen gatehouse, breach, east gate and guard tower, and the life of the yard) the keep in cut-away (floors, stairs, rooms, cellars and the study), the flooded fen (causeways on banks, islands, reeds, the sluice and the weir house) and the barrows (downs, mounds, standing stones, the kennel barrow and the Ward Ring). |
| `src/sprites.ts` | Tower and enemy sprites (walk cycles, the kneeling giant, ink spatter on hits) and margin icons. |
| `src/render.ts` | Live drawing: ink threads, gold leaf, hedges, flames, turning sails, butterflies, the wizard, effects, warnings, inspect highlight, the victory plate. |
| `src/casebook.ts` | The rare creature casebook: first sighting, times seen, caught and slipped away (saved in localStorage). |
| `src/rewards.ts` | Wizard's Seals: earning, the five rewards, what they change, and their little ink pictures (saved in localStorage). |
| `src/main.ts` | The main menu and rewards screen, input (the trace gesture, pulses), the margin, HUD, ribbon bookmark, popovers and overlays. |
| `src/style.css` | Layout and look, including the phone layout. |
| `tests/` | Acceptance-rule tests, balance tests and the scripted player; `pulse.test.ts` covers free previews, one charge per shared pulse, result wording and attacks carrying on. |
| `scripts/deploy.sh` | Builds and publishes the game to the `gh-pages` branch. |
