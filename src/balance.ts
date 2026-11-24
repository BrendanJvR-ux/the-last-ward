// ─────────────────────────────────────────────────────────────────────────────
//  THE LAST WARD · all tuning lives here.
//  Wave composition, tower damage, pulse effects, rewards and costs.
// ─────────────────────────────────────────────────────────────────────────────

/** The four towers of the fields (level 1). The art-style studies draw only these. */
export type FieldTowerType = 'bramble' | 'ember' | 'bell' | 'verdigris';
/** The four towers of the castle courtyard (level 2). */
export type CourtTowerType = 'gargoyle' | 'mangonel' | 'fountain' | 'banner';
/** The four towers of the keep (level 3). */
export type KeepTowerType = 'armour' | 'books' | 'chandelier' | 'hearth';
/** The four towers of the flooded fen (level 4). */
export type FenTowerType = 'wheel' | 'heron' | 'eeltrap' | 'lantern';
/** The four towers of the barrows (level 5). */
export type BarrowTowerType = 'menhir' | 'chimes' | 'beacon' | 'warden';
export type TowerType = FieldTowerType | CourtTowerType | KeepTowerType | FenTowerType | BarrowTowerType;
export type LevelId = 'fields' | 'courtyard' | 'keep' | 'fen' | 'barrows';
/** `bearer` is the marked Fen Levy carrying the Cairn-Born's name-stone; it is spawned with every `cairn`. */
/** The enemies every wave is made of. The art-style studies draw only these. */
export type FieldEnemyType = 'levy' | 'bearer' | 'hound' | 'cairn';
/** Very rare creatures that wander onto the roads in some games, never harming the castle. */
export type RareType = 'moth' | 'heron' | 'tortoise' | 'snail' | 'hare';
export type EnemyType = FieldEnemyType | RareType;
export type LaneId = 'mill' | 'king';

export interface TowerStats {
  name: string;
  cost: number;
  /** Attack damage per hit. */
  damage: number;
  /** Seconds between attacks. */
  cooldown: number;
  /** Attack range in map units. */
  range: number;
  /** Projectile speed in map units per second (0 = instant ring). */
  projectileSpeed: number;
  /** Splash radius for Ember coals; 0 = single target. */
  splash: number;
  /** Armour stripped per hit (Verdigris Font only). */
  shred?: number;
  /** Seconds of slow applied per hit (Ink Fountain only). */
  slow?: number;
  pulseName: string;
  pulseText: string;
}

export interface EnemyStats {
  name: string;
  plural: string;
  hp: number;
  /** Map units per second. */
  speed: number;
  /** Flat damage removed from every tower hit (burning ignores armour). */
  armour: number;
  bounty: number;
  /** Castle health lost when it reaches the gate. */
  castleDamage: number;
  /** One line for the inspect card. */
  note: string;
}

export interface WaveGroup {
  type: EnemyType;
  lane: LaneId;
  count: number;
  /** Seconds after the wave starts that the first one appears. */
  start: number;
  /** Seconds between each one (or each rank) in the group. */
  interval: number;
  /** Fen Levy march in tight files: this many abreast per rank. `count` is the number of ranks. */
  abreast?: number;
}

export interface WaveDef {
  title: string;
  /** A line of verse for the bookmark. Deliberately says nothing about where or how many. */
  lesson: string;
  groups: WaveGroup[];
}

export interface PhaseRule {
  fromWave: number;
  /** Exactly this many distinct towers must be traced before the wave starts. */
  traces: number;
  /** Pulse charges available during the wave. */
  pulses: number;
}

export const BALANCE = {
  castleHp: 20,
  startGold: 40,
  startLeaves: 0,
  /** Gilded Leaves awarded for each wave survived. */
  leavesPerWave: 1,
  /** Gold awarded for surviving wave n. */
  waveClearGold: (wave: number) => 15 + 5 * wave,
  /** Binding one tower costs this many leaves. A bound tower gets its own free pulse every wave, with no trace. */
  bindCost: 3,

  /** The castle defends itself: a weak, short-range volley from the walls. */
  castle: { damage: 4, cooldown: 1.1, range: 140 },

  /** Trace / shared-pulse allocation by wave. Always pulses < traces < unbound built towers. */
  phaseRules: [
    { fromWave: 1, traces: 2, pulses: 1 },
    { fromWave: 4, traces: 3, pulses: 2 },
  ] as PhaseRule[],
  /** On this wave's preparation, a free tower is granted if the player still owns only three. */
  reinforcementWave: 4,
  reinforcementIfTowersAtMost: 3,

  /** How fast a pulse runs along its thread (map units per second). */
  pulseSpeed: 1600,

  /** Tower types that can be built on the current level (set by applyBalanceLevel). */
  towerTypes: ['bramble', 'ember', 'bell', 'verdigris'] as TowerType[],
  /** Warning shown when hounds near the current level's choke point. */
  houndWarnText: 'Horns! Dogs at the bridge',

  startingTowers: [
    { foundation: 'f_mill', type: 'bramble' },
    { foundation: 'f_junction', type: 'ember' },
    { foundation: 'f_bend', type: 'bell' },
  ] as { foundation: string; type: TowerType }[],

  towers: {
    bramble: {
      name: 'Bramble Tower', cost: 70, damage: 8, cooldown: 0.75, range: 185,
      projectileSpeed: 520, splash: 0,
      pulseName: 'Hedge', pulseText: 'Grows a hedge across the nearest road: enemies on that lane halt and bunch up.',
    },
    ember: {
      name: 'Ember Kiln', cost: 90, damage: 13, cooldown: 1.5, range: 175,
      projectileSpeed: 330, splash: 46,
      pulseName: 'Firebrand', pulseText: 'Sets the nearby road ablaze for several seconds. Burning ignores armour.',
    },
    bell: {
      name: 'Bell Spire', cost: 90, damage: 9, cooldown: 1.9, range: 135,
      projectileSpeed: 0, splash: 0,
      pulseName: 'Great Toll', pulseText: 'Knocks nearby enemies back along their own road and dazes them. Stone giants do not budge.',
    },
    verdigris: {
      name: 'Verdigris Font', cost: 80, damage: 4, cooldown: 0.9, range: 165,
      projectileSpeed: 420, splash: 0, shred: 2,
      pulseName: 'Tarnish', pulseText: 'A green mist strips all armour from enemies nearby and makes them take extra damage for a while.',
    },
    // ── The castle courtyard ──
    gargoyle: {
      name: 'Gargoyle Perch', cost: 90, damage: 24, cooldown: 2.0, range: 240,
      projectileSpeed: 720, splash: 0,
      pulseName: 'Stone Gaze', pulseText: 'The gargoyle wakes and stares: everything nearby is turned to stone for a few seconds. Stone giants only stiffen.',
    },
    mangonel: {
      name: 'Mangonel', cost: 100, damage: 17, cooldown: 2.8, range: 270,
      projectileSpeed: 260, splash: 58,
      pulseName: 'Boulder Barrage', pulseText: 'Hurls a volley of boulders onto the thickest crowd in reach.',
    },
    fountain: {
      name: 'Ink Fountain', cost: 70, damage: 5, cooldown: 1.0, range: 165,
      projectileSpeed: 380, splash: 0, slow: 1.6,
      pulseName: 'Inkflood', pulseText: 'Floods the nearby road with ink: everything wading through it crawls and is slowly stained.',
    },
    // ── The keep ──
    armour: {
      name: 'Suit of Armour', cost: 80, damage: 22, cooldown: 1.1, range: 160,
      projectileSpeed: 900, splash: 0,
      pulseName: 'Shield Wall', pulseText: 'The armour clanks down onto the nearest stair and plants its shield: enemies on that way halt behind it.',
    },
    books: {
      name: 'Flapping Library', cost: 70, damage: 7, cooldown: 0.5, range: 195,
      projectileSpeed: 620, splash: 0,
      pulseName: 'Paper Storm', pulseText: 'Every book takes flight at once: enemies nearby are blinded by pages and slowed for a while.',
    },
    chandelier: {
      name: 'Chandelier', cost: 100, damage: 14, cooldown: 2.0, range: 210,
      projectileSpeed: 300, splash: 50,
      pulseName: 'The Fall', pulseText: 'The chain is cut: the great wheel of candles crashes onto the thickest crowd in reach.',
    },
    hearth: {
      name: 'Great Hearth', cost: 90, damage: 13, cooldown: 1.4, range: 175,
      projectileSpeed: 340, splash: 40,
      pulseName: 'Back-draught', pulseText: 'The fire roars out across the nearby floor: everything on it burns for a few seconds. Burning ignores armour.',
    },
    // ── The flooded fen ──
    wheel: {
      name: 'Waterwheel', cost: 80, damage: 16, cooldown: 1.2, range: 180,
      projectileSpeed: 360, splash: 42,
      pulseName: 'Sluice Surge', pulseText: 'The wheel throws open the sluice: a wall of water washes everything nearby back down the causeway. Giants stand firm.',
    },
    heron: {
      name: 'Heron Roost', cost: 70, damage: 11, cooldown: 0.55, range: 205,
      projectileSpeed: 700, splash: 0,
      pulseName: 'Stoop', pulseText: 'Every heron on the roost dives at once, stabbing into the thickest crowd in reach.',
    },
    eeltrap: {
      name: 'Eel Trap', cost: 70, damage: 8, cooldown: 0.8, range: 170,
      projectileSpeed: 420, splash: 0, slow: 1.6,
      pulseName: 'Eel Snare', pulseText: 'The traps open and eels coil across the nearest causeway: enemies on that way halt behind them and are bitten.',
    },
    lantern: {
      name: 'Marsh Lantern', cost: 80, damage: 9, cooldown: 0.6, range: 195,
      projectileSpeed: 520, splash: 0,
      pulseName: 'Marsh Lights', pulseText: 'Will-o\u2019-wisps pour out of the lantern: everything nearby is lit up, loses its armour and takes extra damage for a while.',
    },
    // ── The barrows ──
    menhir: {
      name: 'Standing Stone', cost: 90, damage: 20, cooldown: 1.2, range: 175,
      projectileSpeed: 800, splash: 0,
      pulseName: 'Stone Sleep', pulseText: 'The old words on the stone wake: everything nearby falls into a stone sleep. Giants only stiffen.',
    },
    chimes: {
      name: 'Bone Chimes', cost: 70, damage: 8, cooldown: 1.4, range: 140,
      projectileSpeed: 0, splash: 0,
      pulseName: 'Dirge', pulseText: 'The chimes ring a long, low dirge: enemies nearby lose heart, are slowed for a while and hurt.',
    },
    beacon: {
      name: 'Barrow Beacon', cost: 90, damage: 14, cooldown: 1.4, range: 180,
      projectileSpeed: 340, splash: 40,
      pulseName: 'Beacon Blaze', pulseText: 'The beacon is fed: burning brands rain on the nearby road and it burns for a few seconds. Burning ignores armour.',
    },
    warden: {
      name: 'Barrow Warden', cost: 80, damage: 10, cooldown: 0.7, range: 185,
      projectileSpeed: 600, splash: 0,
      pulseName: 'The Old Watch', pulseText: 'The warden calls up the old watch: every tower nearby shoots twice as fast for a while. Towers beside a warden always shoot a little faster.',
    },
    banner: {
      name: 'Banner Tower', cost: 80, damage: 7, cooldown: 0.8, range: 175,
      projectileSpeed: 560, splash: 0,
      pulseName: 'Rally', pulseText: 'Sounds a rally: every tower nearby shoots twice as fast for a while. Towers beside a banner always shoot a little faster.',
    },
  } as Record<TowerType, TowerStats>,

  pulses: {
    /** Bramble hedge. */
    hedgeDuration: 6,
    /** Ember road fire. */
    fireDuration: 6,
    fireDps: 26,
    /** Road within this distance of the kiln catches fire. */
    fireRadius: 135,
    /** Bell knockback. */
    tollRadius: 175,
    tollKnockback: 170,
    tollDamage: 12,
    tollStun: 1.0,
    /** Verdigris corrosion from normal hits. */
    shredMax: 6,
    shredDuration: 4,
    /** Verdigris pulse. */
    tarnishRadius: 175,
    tarnishDuration: 6,
    tarnishVulnerability: 0.3,
    /** Gargoyle pulse: petrify everything nearby. */
    gazeRadius: 175,
    gazeStun: 4,
    gazeGiantStun: 1.4,
    gazeDamage: 10,
    /** Mangonel pulse: a volley of boulders. */
    barrageCount: 7,
    barrageRadius: 300,
    barrageDamage: 55,
    barrageSplash: 68,
    /** Ink Fountain hits: speed multiplier while stained. Inkflood: a slowing pool on the road. */
    inkSlow: 0.6,
    floodRadius: 155,
    floodDuration: 6,
    floodSlow: 0.25,
    floodDps: 12,
    /** Banner: towers within this range of a banner shoot this much faster; Rally doubles it. */
    bannerAuraRadius: 260,
    bannerAura: 0.25,
    rallyRadius: 400,
    rallyDuration: 8,
    rallyRate: 2,
    /** Suit of Armour pulse: a shield wall across the nearest way (works like a hedge). */
    shieldDuration: 6,
    shieldDamage: 14,
    /** Flapping Library pulse: a storm of pages. */
    stormRadius: 185,
    stormSlow: 5,
    stormDamage: 8,
    /** Chandelier pulse: one great crash. */
    fallRadius: 240,
    fallDamage: 110,
    fallSplash: 80,
    /** Great Hearth pulse: the floor nearby burns (as the Ember Kiln's road fire). */
    draughtRadius: 150,
    /** Waterwheel pulse: a surge that washes enemies back (as the Bell's toll). */
    surgeRadius: 180,
    surgeKnockback: 160,
    surgeDamage: 12,
    surgeStun: 1.0,
    /** Heron Roost pulse: herons dive on the thickest crowd. */
    stoopCount: 5,
    stoopRadius: 260,
    stoopDamage: 32,
    stoopSplash: 42,
    /** Eel Trap pulse: eels across the nearest way (works like a hedge). */
    snareDuration: 6,
    snareDamage: 10,
    /** Marsh Lantern pulse: lit enemies lose their armour (as the Verdigris Tarnish). */
    lightsRadius: 200,
    /** Standing Stone pulse: stone sleep (as the Gargoyle's gaze). */
    sleepRadius: 180,
    /** Bone Chimes pulse: a dirge that slows and hurts. */
    dirgeRadius: 190,
    dirgeSlow: 5,
    dirgeDamage: 9,
    /** Barrow Beacon pulse: the road nearby burns. */
    blazeRadius: 145,
  },

  cairn: {
    /** The giant walks this far behind its bearer. */
    followGap: 95,
    /** Seconds the giant kneels at its fallen name-stone, blocking the road behind it. */
    kneelSeconds: 7,
    /** Seconds it takes to walk off the field afterwards (it does not reach the gate). */
    leaveSeconds: 1.6,
    /** Gold paid when the giant leaves (it is not killed). */
    leaveBounty: 20,
  },

  /** War Dogs: the bridge warning shows this many seconds before they reach the bridge. */
  houndWarning: 3.5,

  enemies: {
    levy: { name: 'Fen Levy', plural: 'Fen Levy', hp: 36, speed: 40, armour: 2, bounty: 2, castleDamage: 1, note: 'Fynbos root-walkers with protea heads and a single eye. March in tight files.' },
    bearer: { name: 'Stone-Bearer', plural: 'Stone-Bearers', hp: 130, speed: 26, armour: 0, bounty: 8, castleDamage: 1, note: 'A goggled wanderer carrying the Cairn-Born\u2019s stolen name-stone. Where it falls, the giant kneels.' },
    hound: { name: 'War Dog', plural: 'War Dogs', hp: 24, speed: 108, armour: 0, bounty: 2, castleDamage: 1, note: 'Lean war dogs in studded collars, loosed by the hunt-master\u2019s horn. Hunt in packs.' },
    cairn: { name: 'Cairn-Born', plural: 'Cairn-Born', hp: 700, speed: 24, armour: 8, bounty: 45, castleDamage: 6, note: 'A walking citadel-fish with a stern face and an empty socket. Follows its name-stone; cannot be knocked back.' },
    // ── Rare creatures: never part of a wave, never harm the castle ──
    moth: { name: 'Lantern Moth', plural: 'Lantern Moths', hp: 70, speed: 58, armour: 0, bounty: 12, castleDamage: 0, note: 'A great moth with eyes on its wings, carrying a little lantern through the battle. Rare.' },
    heron: { name: 'Clockwork Heron', plural: 'Clockwork Herons', hp: 110, speed: 74, armour: 3, bounty: 18, castleDamage: 0, note: 'A heron of brass gears and ink, stepping delicately between the fighting. Rare.' },
    tortoise: { name: 'Teapot Tortoise', plural: 'Teapot Tortoises', hp: 300, speed: 18, armour: 6, bounty: 28, castleDamage: 0, note: 'An old tortoise whose shell is a steaming teapot. Slow, and very hard to crack. Rare.' },
    snail: { name: 'Cathedral Snail', plural: 'Cathedral Snails', hp: 420, speed: 13, armour: 5, bounty: 40, castleDamage: 0, note: 'A snail carrying a whole cathedral, spires and all, on its back. Very rare.' },
    hare: { name: 'Golden Hare', plural: 'Golden Hares', hp: 50, speed: 150, armour: 0, bounty: 60, castleDamage: 0, note: 'A hare of beaten gold leaf, gone in a blink. The rarest sight of all.' },
  } as Record<EnemyType, EnemyStats>,

  /** Rare creatures: the chance a game has one, how often each kind is chosen, and the seals for catching it. */
  rares: {
    chance: 0.33,
    weights: { moth: 5, heron: 4, tortoise: 3, snail: 2, hare: 1 } as Record<RareType, number>,
    seals: { moth: 1, heron: 2, tortoise: 2, snail: 3, hare: 5 } as Record<RareType, number>,
  },

  waves: [
    {
      title: 'The Fen Levy',
      lesson: 'Reeds rustle on the low road; the drum keeps time.',
      groups: [
        { type: 'levy', lane: 'mill', count: 4, abreast: 3, start: 1, interval: 1.6 },
        { type: 'levy', lane: 'mill', count: 3, abreast: 2, start: 17, interval: 1.6 },
      ],
    },
    {
      title: 'Horns at the Bridge',
      lesson: 'The hunt-master has loosed his dogs on the King\u2019s Road. Watch for the warning at the bridge.',
      groups: [
        { type: 'levy', lane: 'mill', count: 5, abreast: 3, start: 1, interval: 1.5 },
        { type: 'hound', lane: 'king', count: 6, start: 20, interval: 0.4 },
      ],
    },
    {
      title: 'Mud and Teeth',
      lesson: 'The fen marches and the kennels bay, both at once.',
      groups: [
        { type: 'levy', lane: 'mill', count: 5, abreast: 3, start: 1, interval: 1.5 },
        { type: 'hound', lane: 'king', count: 3, start: 9, interval: 0.4 },
        { type: 'levy', lane: 'king', count: 3, abreast: 2, start: 13, interval: 1.8 },
        { type: 'hound', lane: 'king', count: 4, start: 26, interval: 0.4 },
      ],
    },
    {
      title: 'Royal Reinforcement',
      lesson: 'The Crown\u2019s gift arrives. Gold may hold where ink cannot.',
      groups: [
        { type: 'levy', lane: 'mill', count: 8, abreast: 3, start: 1, interval: 1.3 },
        { type: 'levy', lane: 'king', count: 5, abreast: 2, start: 6, interval: 1.5 },
        { type: 'hound', lane: 'king', count: 8, start: 16, interval: 0.4 },
        { type: 'hound', lane: 'king', count: 6, start: 30, interval: 0.4 },
      ],
    },
    {
      title: 'The Stone-Bearer',
      lesson: 'A giant follows what was taken from it. Choose where it finds it.',
      groups: [
        { type: 'cairn', lane: 'mill', count: 1, start: 1, interval: 0 },
        { type: 'levy', lane: 'mill', count: 9, abreast: 3, start: 8, interval: 1.3 },
        { type: 'levy', lane: 'king', count: 5, abreast: 2, start: 14, interval: 1.6 },
      ],
    },
    {
      title: 'The Last Ward',
      lesson: 'Stone on the low road, teeth at the bridge. Keep one drop of ink in hand.',
      groups: [
        { type: 'cairn', lane: 'mill', count: 1, start: 1, interval: 0 },
        { type: 'levy', lane: 'mill', count: 9, abreast: 3, start: 7, interval: 1.3 },
        { type: 'hound', lane: 'king', count: 7, start: 12, interval: 0.4 },
        { type: 'levy', lane: 'king', count: 6, abreast: 2, start: 18, interval: 1.5 },
        { type: 'hound', lane: 'king', count: 12, start: 36, interval: 0.34 },
      ],
    },
  ] as WaveDef[],
};

export const TOTAL_WAVES = BALANCE.waves.length;

export function phaseRule(wave: number): PhaseRule {
  let rule = BALANCE.phaseRules[0];
  for (const r of BALANCE.phaseRules) if (wave >= r.fromWave) rule = r;
  return rule;
}

// ── Levels ──────────────────────────────────────────────────────────────────
// The rules, enemies and tower stats are shared; each level has its own towers, waves and purse.

export interface LevelBalance {
  startGold: number;
  towerTypes: TowerType[];
  startingTowers: { foundation: string; type: TowerType }[];
  waves: WaveDef[];
  houndWarnText: string;
}

const FIELDS: LevelBalance = {
  startGold: BALANCE.startGold,
  towerTypes: [...BALANCE.towerTypes],
  startingTowers: BALANCE.startingTowers,
  waves: BALANCE.waves,
  houndWarnText: BALANCE.houndWarnText,
};

/** Level 2: the outer wall has fallen and the fight moves into the castle courtyard. */
const COURTYARD: LevelBalance = {
  startGold: 60,
  towerTypes: ['gargoyle', 'mangonel', 'fountain', 'banner'],
  startingTowers: [
    { foundation: 'f_barracks', type: 'gargoyle' },
    { foundation: 'f_herb', type: 'mangonel' },
    { foundation: 'f_stable', type: 'fountain' },
  ],
  houndWarnText: 'Horns! Dogs in the stable yard',
  waves: [
    {
      title: 'The Gatehouse Falls',
      lesson: 'The outer gate is splinters. The drum comes on through the arch.',
      groups: [
        { type: 'levy', lane: 'mill', count: 7, abreast: 3, start: 1, interval: 1.4 },
      ],
    },
    {
      title: 'Through the Breach',
      lesson: 'Stones still falling from the north wall, and something leaping over them.',
      groups: [
        { type: 'levy', lane: 'mill', count: 6, abreast: 3, start: 1, interval: 1.4 },
        { type: 'hound', lane: 'king', count: 8, start: 16, interval: 0.4 },
      ],
    },
    {
      title: 'Teeth in the Yard',
      lesson: 'Both ways in are open now. Watch for the warning in the stable yard.',
      groups: [
        { type: 'levy', lane: 'mill', count: 7, abreast: 3, start: 1, interval: 1.3 },
        { type: 'hound', lane: 'king', count: 5, start: 8, interval: 0.4 },
        { type: 'levy', lane: 'king', count: 4, abreast: 2, start: 12, interval: 1.6 },
        { type: 'hound', lane: 'king', count: 6, start: 26, interval: 0.4 },
      ],
    },
    {
      title: 'Torn Banners',
      lesson: 'The Crown remembers its own. Gold may yet hold the yard.',
      groups: [
        { type: 'levy', lane: 'mill', count: 12, abreast: 3, start: 1, interval: 1.1 },
        { type: 'levy', lane: 'king', count: 6, abreast: 2, start: 5, interval: 1.4 },
        { type: 'hound', lane: 'king', count: 9, start: 16, interval: 0.4 },
        { type: 'hound', lane: 'mill', count: 8, start: 30, interval: 0.4 },
      ],
    },
    {
      title: 'Stone in the Courtyard',
      lesson: 'The giant has followed its stone over the threshold. Choose where it kneels.',
      groups: [
        { type: 'cairn', lane: 'mill', count: 1, start: 1, interval: 0 },
        { type: 'levy', lane: 'mill', count: 13, abreast: 3, start: 8, interval: 1.1 },
        { type: 'hound', lane: 'king', count: 8, start: 14, interval: 0.4 },
        { type: 'levy', lane: 'king', count: 5, abreast: 2, start: 18, interval: 1.5 },
        { type: 'hound', lane: 'mill', count: 7, start: 32, interval: 0.4 },
      ],
    },
    {
      title: 'The Keep Door',
      lesson: 'Two stones, two giants, and only the keep behind you.',
      groups: [
        { type: 'cairn', lane: 'mill', count: 1, start: 1, interval: 0 },
        { type: 'cairn', lane: 'king', count: 1, start: 10, interval: 0 },
        { type: 'levy', lane: 'mill', count: 12, abreast: 3, start: 7, interval: 1.1 },
        { type: 'hound', lane: 'king', count: 14, start: 14, interval: 0.36 },
        { type: 'levy', lane: 'king', count: 8, abreast: 2, start: 24, interval: 1.4 },
        { type: 'hound', lane: 'king', count: 24, start: 40, interval: 0.28 },
      ],
    },
  ],
};

/** Level 3: the fight is inside the keep, floor by floor, up to the wizard's study. */
const KEEP: LevelBalance = {
  startGold: 70,
  towerTypes: ['armour', 'books', 'chandelier', 'hearth'],
  startingTowers: [
    { foundation: 'f_armoury', type: 'armour' },
    { foundation: 'f_library', type: 'books' },
    { foundation: 'f_hall', type: 'hearth' },
  ],
  houndWarnText: 'Horns! Dogs on the cellar stair',
  waves: [
    {
      title: 'The Door Gives Way',
      lesson: 'Boots on the great stair. The keep is not a fortress any more; it is a house under siege.',
      groups: [
        { type: 'levy', lane: 'mill', count: 5, abreast: 3, start: 1, interval: 1.6 },
        { type: 'levy', lane: 'king', count: 2, abreast: 2, start: 18, interval: 1.6 },
      ],
    },
    {
      title: 'Up from the Cellars',
      lesson: 'Something scrabbles behind the wine casks. Watch for the warning on the cellar stair.',
      groups: [
        { type: 'levy', lane: 'mill', count: 7, abreast: 3, start: 1, interval: 1.3 },
        { type: 'hound', lane: 'king', count: 9, start: 14, interval: 0.4 },
      ],
    },
    {
      title: 'Smoke in the Great Hall',
      lesson: 'Both stairs at once, and the hall between them.',
      groups: [
        { type: 'levy', lane: 'mill', count: 8, abreast: 3, start: 1, interval: 1.2 },
        { type: 'hound', lane: 'king', count: 6, start: 8, interval: 0.4 },
        { type: 'levy', lane: 'king', count: 5, abreast: 2, start: 12, interval: 1.5 },
        { type: 'hound', lane: 'king', count: 8, start: 26, interval: 0.4 },
      ],
    },
    {
      title: 'The Crown Remembers',
      lesson: 'Gold leaf on the banisters. Bind what you can trust.',
      groups: [
        { type: 'levy', lane: 'mill', count: 12, abreast: 3, start: 1, interval: 1.1 },
        { type: 'levy', lane: 'king', count: 7, abreast: 2, start: 5, interval: 1.3 },
        { type: 'hound', lane: 'king', count: 10, start: 16, interval: 0.38 },
        { type: 'hound', lane: 'mill', count: 8, start: 30, interval: 0.4 },
      ],
    },
    {
      title: 'A Giant on the Stairs',
      lesson: 'The steps groan under stone. Where will it kneel?',
      groups: [
        { type: 'cairn', lane: 'mill', count: 1, start: 1, interval: 0 },
        { type: 'levy', lane: 'mill', count: 15, abreast: 3, start: 8, interval: 1.0 },
        { type: 'hound', lane: 'king', count: 10, start: 14, interval: 0.38 },
        { type: 'levy', lane: 'king', count: 6, abreast: 2, start: 18, interval: 1.4 },
        { type: 'hound', lane: 'mill', count: 8, start: 32, interval: 0.4 },
      ],
    },
    {
      title: 'The Study Door',
      lesson: 'Behind the last door the wizard writes on. Hold the page.',
      groups: [
        { type: 'cairn', lane: 'mill', count: 1, start: 1, interval: 0 },
        { type: 'cairn', lane: 'king', count: 1, start: 10, interval: 0 },
        { type: 'levy', lane: 'mill', count: 15, abreast: 3, start: 7, interval: 1.0 },
        { type: 'hound', lane: 'king', count: 18, start: 14, interval: 0.32 },
        { type: 'levy', lane: 'king', count: 9, abreast: 2, start: 24, interval: 1.3 },
        { type: 'hound', lane: 'king', count: 32, start: 40, interval: 0.25 },
        { type: 'hound', lane: 'mill', count: 12, start: 46, interval: 0.3 },
      ],
    },
  ],
};

/** Level 4: the water meadows below Goosebridge in flood, the levy's own home ground. */
const FEN: LevelBalance = {
  startGold: 75,
  towerTypes: ['wheel', 'heron', 'eeltrap', 'lantern'],
  startingTowers: [
    { foundation: 'f_weir', type: 'wheel' },
    { foundation: 'f_withy', type: 'heron' },
    { foundation: 'f_island', type: 'eeltrap' },
  ],
  houndWarnText: 'Dogs at the sluice!',
  waves: [
    {
      title: 'High Water',
      lesson: 'The levy wade home through their own reeds. They know every causeway.',
      groups: [
        { type: 'levy', lane: 'mill', count: 5, abreast: 3, start: 1, interval: 1.6 },
        { type: 'levy', lane: 'king', count: 2, abreast: 2, start: 18, interval: 1.6 },
      ],
    },
    {
      title: 'Dogs on the Dyke',
      lesson: 'Paws on the planking. Watch for the warning at the sluice.',
      groups: [
        { type: 'levy', lane: 'mill', count: 8, abreast: 3, start: 1, interval: 1.3 },
        { type: 'hound', lane: 'king', count: 10, start: 12, interval: 0.4 },
      ],
    },
    {
      title: 'Mist on the Meadows',
      lesson: 'You hear them before you see them.',
      groups: [
        { type: 'levy', lane: 'mill', count: 9, abreast: 3, start: 1, interval: 1.2 },
        { type: 'hound', lane: 'king', count: 9, start: 8, interval: 0.4 },
        { type: 'levy', lane: 'king', count: 6, abreast: 2, start: 14, interval: 1.4 },
        { type: 'hound', lane: 'mill', count: 8, start: 28, interval: 0.4 },
      ],
    },
    {
      title: 'The Eel Moon',
      lesson: 'Gold on the water. Bind what you can trust.',
      groups: [
        { type: 'levy', lane: 'mill', count: 22, abreast: 3, start: 1, interval: 0.95 },
        { type: 'levy', lane: 'king', count: 14, abreast: 2, start: 5, interval: 1.1 },
        { type: 'hound', lane: 'king', count: 24, start: 16, interval: 0.3 },
        { type: 'hound', lane: 'mill', count: 19, start: 30, interval: 0.32 },
      ],
    },
    {
      title: 'Stone in the Shallows',
      lesson: 'Something huge is wading the dyke. Where will it kneel?',
      groups: [
        { type: 'cairn', lane: 'king', count: 1, start: 1, interval: 0 },
        { type: 'levy', lane: 'mill', count: 23, abreast: 3, start: 6, interval: 0.9 },
        { type: 'hound', lane: 'king', count: 22, start: 14, interval: 0.3 },
        { type: 'levy', lane: 'king', count: 13, abreast: 2, start: 20, interval: 1.1 },
        { type: 'cairn', lane: 'mill', count: 1, start: 26, interval: 0 },
        { type: 'hound', lane: 'mill', count: 22, start: 34, interval: 0.3 },
      ],
    },
    {
      title: 'The Weir Breaks',
      lesson: 'All the fen at once. Hold the weir house.',
      groups: [
        { type: 'cairn', lane: 'mill', count: 1, start: 1, interval: 0 },
        { type: 'cairn', lane: 'king', count: 1, start: 10, interval: 0 },
        { type: 'levy', lane: 'mill', count: 26, abreast: 3, start: 6, interval: 0.85 },
        { type: 'hound', lane: 'king', count: 31, start: 14, interval: 0.26 },
        { type: 'levy', lane: 'king', count: 16, abreast: 2, start: 22, interval: 1.0 },
        { type: 'cairn', lane: 'king', count: 1, start: 30, interval: 0 },
        { type: 'hound', lane: 'king', count: 43, start: 40, interval: 0.22 },
        { type: 'hound', lane: 'mill', count: 28, start: 46, interval: 0.26 },
      ],
    },
  ],
};

/** Level 5: the barrows on the downs, where the dogs are kennelled and the giants sleep. The last stand. */
const BARROWS: LevelBalance = {
  startGold: 70,
  towerTypes: ['menhir', 'chimes', 'beacon', 'warden'],
  startingTowers: [
    { foundation: 'f_kingstone', type: 'menhir' },
    { foundation: 'f_longbarrow', type: 'chimes' },
    { foundation: 'f_ring', type: 'beacon' },
  ],
  houndWarnText: 'Dogs from the mound door!',
  waves: [
    {
      title: 'Dusk on the Downs',
      lesson: 'The old road to the barrows. Nobody walks it after dark, except tonight.',
      groups: [
        { type: 'levy', lane: 'mill', count: 5, abreast: 3, start: 1, interval: 1.6 },
        { type: 'levy', lane: 'king', count: 3, abreast: 2, start: 16, interval: 1.6 },
      ],
    },
    {
      title: 'The Kennels Open',
      lesson: 'Scratching under the turf. Watch for the warning at the mound door.',
      groups: [
        { type: 'levy', lane: 'mill', count: 9, abreast: 3, start: 1, interval: 1.2 },
        { type: 'hound', lane: 'king', count: 16, start: 10, interval: 0.34 },
      ],
    },
    {
      title: 'Owl Light',
      lesson: 'Both ways at once, and the stones listening.',
      groups: [
        { type: 'levy', lane: 'mill', count: 14, abreast: 3, start: 1, interval: 1.0 },
        { type: 'hound', lane: 'king', count: 16, start: 7, interval: 0.32 },
        { type: 'levy', lane: 'king', count: 10, abreast: 2, start: 13, interval: 1.2 },
        { type: 'hound', lane: 'mill', count: 16, start: 26, interval: 0.32 },
      ],
    },
    {
      title: 'The Grave Goods',
      lesson: 'Gold in the barrows. Bind what you can trust.',
      groups: [
        { type: 'cairn', lane: 'king', count: 1, start: 1, interval: 0 },
        { type: 'levy', lane: 'mill', count: 34, abreast: 3, start: 1, interval: 0.9 },
        { type: 'levy', lane: 'king', count: 23, abreast: 2, start: 5, interval: 1.0 },
        { type: 'hound', lane: 'king', count: 40, start: 14, interval: 0.28 },
        { type: 'hound', lane: 'mill', count: 34, start: 28, interval: 0.3 },
      ],
    },
    {
      title: 'The Sleepers Wake',
      lesson: 'The long barrow cracks open. The giants walk.',
      groups: [
        { type: 'cairn', lane: 'king', count: 1, start: 1, interval: 0 },
        { type: 'cairn', lane: 'mill', count: 1, start: 8, interval: 0 },
        { type: 'levy', lane: 'mill', count: 50, abreast: 3, start: 6, interval: 0.85 },
        { type: 'hound', lane: 'king', count: 50, start: 12, interval: 0.28 },
        { type: 'levy', lane: 'king', count: 32, abreast: 2, start: 20, interval: 1.0 },
        { type: 'cairn', lane: 'king', count: 1, start: 28, interval: 0 },
        { type: 'hound', lane: 'mill', count: 50, start: 34, interval: 0.28 },
      ],
    },
    {
      title: 'The Last Ward',
      lesson: 'Everything the hunt-master has left. Hold the ring until dawn.',
      groups: [
        { type: 'cairn', lane: 'mill', count: 1, start: 1, interval: 0 },
        { type: 'cairn', lane: 'king', count: 1, start: 8, interval: 0 },
        { type: 'levy', lane: 'mill', count: 59, abreast: 3, start: 5, interval: 0.8 },
        { type: 'hound', lane: 'king', count: 69, start: 12, interval: 0.24 },
        { type: 'levy', lane: 'king', count: 38, abreast: 2, start: 20, interval: 0.95 },
        { type: 'cairn', lane: 'mill', count: 1, start: 26, interval: 0 },
        { type: 'cairn', lane: 'king', count: 1, start: 34, interval: 0 },
        { type: 'hound', lane: 'king', count: 92, start: 40, interval: 0.2 },
        { type: 'hound', lane: 'mill', count: 64, start: 46, interval: 0.24 },
      ],
    },
  ],
};

export const LEVEL_BALANCE: Record<LevelId, LevelBalance> = { fields: FIELDS, courtyard: COURTYARD, keep: KEEP, fen: FEN, barrows: BARROWS };

/** Swap in a level's towers, waves and purse. Every level has the same number of waves. */
export function applyBalanceLevel(id: LevelId) {
  const L = LEVEL_BALANCE[id];
  BALANCE.startGold = L.startGold;
  BALANCE.towerTypes = L.towerTypes;
  BALANCE.startingTowers = L.startingTowers;
  BALANCE.waves = L.waves;
  BALANCE.houndWarnText = L.houndWarnText;
}
