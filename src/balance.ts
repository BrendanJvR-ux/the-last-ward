// ─────────────────────────────────────────────────────────────────────────────
//  THE LAST WARD · all tuning lives here.
//  Wave composition, tower damage, pulse effects, rewards and costs.
// ─────────────────────────────────────────────────────────────────────────────

export type TowerType = 'bramble' | 'ember' | 'bell' | 'verdigris';
/** `bearer` is the marked Fen Levy carrying the Cairn-Born's name-stone; it is spawned with every `cairn`. */
export type EnemyType = 'levy' | 'bearer' | 'hound' | 'cairn';
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

  /** Barrow Hounds: the horn sounds and the bridge warning shows this many seconds before they reach the bridge. */
  houndWarning: 3.5,

  enemies: {
    levy: { name: 'Fen Levy', plural: 'Fen Levy', hp: 36, speed: 40, armour: 2, bounty: 2, castleDamage: 1, note: 'Fynbos root-walkers with protea heads and a single eye. March in tight files.' },
    bearer: { name: 'Stone-Bearer', plural: 'Stone-Bearers', hp: 130, speed: 26, armour: 0, bounty: 8, castleDamage: 1, note: 'A goggled wanderer carrying the Cairn-Born\u2019s stolen name-stone. Where it falls, the giant kneels.' },
    hound: { name: 'Barrow Hound', plural: 'Barrow Hounds', hp: 24, speed: 108, armour: 0, bounty: 2, castleDamage: 1, note: 'Striped fish loosed from the barrows, swimming through the air. Hunt in shoals.' },
    cairn: { name: 'Cairn-Born', plural: 'Cairn-Born', hp: 700, speed: 24, armour: 8, bounty: 45, castleDamage: 6, note: 'A walking citadel-fish with a stern face and an empty socket. Follows its name-stone; cannot be knocked back.' },
  } as Record<EnemyType, EnemyStats>,

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
      lesson: 'Something old is loosed from the barrows. Listen for the horn.',
      groups: [
        { type: 'levy', lane: 'mill', count: 5, abreast: 3, start: 1, interval: 1.5 },
        { type: 'hound', lane: 'king', count: 6, start: 20, interval: 0.4 },
      ],
    },
    {
      title: 'Mud and Teeth',
      lesson: 'The fen marches and the barrows bay, both at once.',
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
