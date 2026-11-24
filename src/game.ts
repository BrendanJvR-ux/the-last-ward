// Game state, rules (trace / pulse / bind / build) and the combat simulation.
// Pure logic: no DOM, so it runs in tests and in the browser alike.
import { BALANCE, TOTAL_WAVES, phaseRule, applyBalanceLevel, type EnemyType, type LaneId, type LevelId, type RareType, type TowerType } from './balance';
import {
  LANES, LANE_IDS, NODE, FOUNDATION_IDS, GATE, BRIDGE, dist, nearestOnLane, pointAt, routePolyline,
  polylineLength, pointAlong, setMapLevel, type Vec,
} from './map';

export type Phase = 'prep' | 'combat' | 'victory' | 'defeat';

export interface Tower {
  id: string;
  foundation: string;
  type: TowerType;
  cd: number;
  /** Prepared for the current/upcoming wave by a temporary trace. */
  traced: boolean;
  /** A pulse has been launched at this tower this wave. */
  committed: boolean;
  flash: number;
  /** Was this the royal reinforcement? */
  royal?: boolean;
  /** Bound in gold: its own free pulse every wave, never traced. */
  bound: boolean;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  lane: LaneId;
  s: number;
  hp: number;
  maxHp: number;
  stun: number;
  hit: number;
  /** Sideways offset: files of levy march abreast; others jitter so bunches stay visible. */
  side: number;
  bob: number;
  /** Armour stripped by Verdigris hits, and how long it lasts. */
  shred: number;
  shredT: number;
  /** Tarnished: no armour and extra damage taken. */
  vulnT: number;
  /** Stained by an Ink Fountain: slowed while this runs. */
  slowT?: number;
  /** Turned to stone by a Gargoyle's gaze (visual; the stun does the work). */
  petrifyT?: number;
  /** Cairn-Born behaviour. */
  mode?: 'follow' | 'march' | 'seek' | 'kneel' | 'leave';
  modeT?: number;
  bearerId?: number;
  stone?: { lane: LaneId; s: number };
  /** Fades out while leaving the field. */
  fade?: number;
}

/** A defeated enemy, toppling and fading where it fell (visual only). */
export interface Fallen { type: EnemyType; x: number; y: number; dir: number; t: number }

/** A fallen name-stone lying on the road. */
export interface Stone { lane: LaneId; s: number; giantId: number }

export interface Projectile {
  kind: TowerType | 'castle';
  x: number; y: number;
  sx: number; sy: number;
  tx: number; ty: number;
  targetId: number | null;
  speed: number;
  damage: number;
  splash: number;
  shred?: number;
  /** Ink Fountain: seconds of slow on hit. */
  slow?: number;
  /** Arc height for lobbed shots (mangonel boulders). */
  arc?: number;
  /** Boulder Barrage this boulder belongs to. */
  volley?: number;
  t: number;
  dur: number;
}

export interface Hedge { towerId: string; at: Vec; angle: number; stops: { lane: LaneId; s: number }[]; t: number; dur: number; laneName: string; held: number[] }
export interface Fire { towerId: string; ranges: { lane: LaneId; s0: number; s1: number }[]; pts: Vec[]; t: number; dur: number; hit: number[] }
export interface Ring { x: number; y: number; r: number; t: number; dur: number; kind: 'bell' | 'toll' | 'splash' | 'arrive' | 'spawn' | 'tarnish' | 'corrode' | 'gaze' | 'rally' | 'thud' | 'ink' }
/** Inkflood: a slowing pool of ink on the road. */
export interface Pool { towerId: string; ranges: { lane: LaneId; s0: number; s1: number }[]; pts: Vec[]; t: number; dur: number; hit: number[] }
/** What a pulse achieved, shown briefly beside its tower. `note` adds a second, smaller line. */
export interface PulseResult { towerId: string; text: string; note?: string; t: number; dur: number }
/** A Boulder Barrage in flight: counts the distinct enemies its boulders strike. */
export interface Volley { id: number; towerId: string; left: number; hit: number[]; shared: boolean }
/** A shared pulse was just spent: the other prepared towers lose their chance this wave. */
export interface SharedSpend { by: string; others: string[]; t: number; dur: number }
/** Rally: towers near the banner shoot faster for a while. */
export interface Rally { x: number; y: number; r: number; t: number; dur: number }
export interface PulseFlight { towerId: string; path: Vec[]; length: number; s: number; shared: boolean }
/** War Dogs: horn and a marker at the bridge shortly before the pack arrives there. */
export interface Warning { lane: LaneId; type: EnemyType; from: number; to: number; count: number; sounded: boolean }
export interface FadingThread { path: Vec[]; t: number; dur: number }
export interface Toast { text: string; kind: 'info' | 'good' | 'bad' | 'gold'; t: number }

export interface Spawn { type: EnemyType; lane: LaneId; at: number; side?: number }

/** A rare creature this game will see (if any), and what happened to it. */
export interface RareVisit { type: RareType; wave: number; lane: LaneId; at: number }
export interface RareEvent { type: RareType; event: 'seen' | 'caught' | 'escaped'; wave: number }
export const RARE_TYPES: RareType[] = ['moth', 'heron', 'tortoise', 'snail', 'hare'];
export const isRare = (t: EnemyType): t is RareType => (RARE_TYPES as EnemyType[]).includes(t);

export interface GameState {
  level: LevelId;
  /** The rare creature due in this game, or null (most games). */
  rare: RareVisit | null;
  /** Sightings for the casebook, drained by the page. */
  rareLog: RareEvent[];
  phase: Phase;
  paused: boolean;
  speed: number;
  wave: number;
  castleHp: number;
  /** Castle health at the start (more with the Stout Walls reward). */
  castleMax: number;
  gold: number;
  leaves: number;
  towers: Tower[];
  /** Tower ids in the order they were traced (for undo). */
  traces: string[];
  pulsesLeft: number;
  pendingGrant: boolean;
  enemies: Enemy[];
  projectiles: Projectile[];
  hedges: Hedge[];
  fires: Fire[];
  pools: Pool[];
  rallies: Rally[];
  rings: Ring[];
  flights: PulseFlight[];
  spawns: Spawn[];
  warnings: Warning[];
  stones: Stone[];
  fallen: Fallen[];
  fading: FadingThread[];
  toasts: Toast[];
  pulseResults: PulseResult[];
  volleys: Volley[];
  sharedSpend: SharedSpend | null;
  waveTime: number;
  time: number;
  nextId: number;
  kills: number;
  leaked: number;
  leakLog: string[];
  /** Set for one preparation phase after a wave ends, so the reset is visible. */
  resetBanner: number;
  castleCd: number;
}

/** Distance along the King's lane to its choke point (the bridge on level 1). */
export let BRIDGE_S = 0;

/** Load a level's map and balance. Every new game does this, so levels never leak into each other. */
export function setLevel(level: LevelId) {
  setMapLevel(level);
  applyBalanceLevel(level);
  BRIDGE_S = LANES.king.cum[LANES.king.pts.indexOf(BRIDGE)];
}

/** Bonuses from redeemed rewards, applied at the start of a game. */
export interface Perks { gold?: number; leaves?: number; castle?: number }

/** Roll whether a game meets a rare creature: in which wave, on which road, and which one. */
export function rollRare(random: () => number = Math.random): RareVisit | null {
  const C = BALANCE.rares;
  if (random() >= C.chance) return null;
  const total = RARE_TYPES.reduce((n, t) => n + C.weights[t], 0);
  let pick = random() * total, type: RareType = 'moth';
  for (const t of RARE_TYPES) { pick -= C.weights[t]; if (pick < 0) { type = t; break; } }
  return { type, wave: 2 + Math.floor(random() * (TOTAL_WAVES - 1)), lane: random() < 0.5 ? 'mill' : 'king', at: 6 + random() * 14 };
}

export function newGame(level: LevelId = 'fields', perks: Perks = {}, rares = false): GameState {
  setLevel(level);
  const castle = BALANCE.castleHp + (perks.castle ?? 0);
  const s: GameState = {
    level,
    rare: rares ? rollRare() : null,
    rareLog: [],
    phase: 'prep', paused: false, speed: 1, wave: 1,
    castleHp: castle, castleMax: castle, gold: BALANCE.startGold + (perks.gold ?? 0), leaves: BALANCE.startLeaves + (perks.leaves ?? 0),
    towers: [], traces: [], pulsesLeft: 0, pendingGrant: false, castleCd: 0,
    enemies: [], projectiles: [], hedges: [], fires: [], pools: [], rallies: [], rings: [], flights: [], spawns: [],
    warnings: [], stones: [], fallen: [], fading: [], toasts: [], pulseResults: [], volleys: [], sharedSpend: null, waveTime: 0, time: 0, nextId: 1, kills: 0, leaked: 0, leakLog: [], resetBanner: 0,
  };
  for (const t of BALANCE.startingTowers) addTower(s, t.foundation, t.type);
  return s;
}

function addTower(s: GameState, foundation: string, type: TowerType, royal = false): Tower {
  const t: Tower = { id: `t${s.nextId++}`, foundation, type, cd: 0.4, traced: false, committed: false, flash: 0, royal, bound: false };
  s.towers.push(t);
  return t;
}

export function toast(s: GameState, text: string, kind: Toast['kind'] = 'info') {
  s.toasts.push({ text, kind, t: 0 });
  if (s.toasts.length > 2) s.toasts.shift();
}

// ── Derived values ──────────────────────────────────────────────────────────

export const rule = (s: GameState) => phaseRule(s.wave);
export const builtCount = (s: GameState) => s.towers.length;
export const towerAt = (s: GameState, f: string) => s.towers.find((t) => t.foundation === f);
export const towerById = (s: GameState, id: string) => s.towers.find((t) => t.id === id);
export const posOf = (t: Tower): Vec => ({ x: NODE[t.foundation].x, y: NODE[t.foundation].y });
export const emptyFoundations = (s: GameState) => FOUNDATION_IDS.filter((f) => !towerAt(s, f));

export const unboundCount = (s: GameState) => s.towers.filter((t) => !t.bound).length;
export const boundTowers = (s: GameState) => s.towers.filter((t) => t.bound);

export function towerDamage(_s: GameState, t: Tower): number {
  return BALANCE.towers[t.type].damage;
}

/** Shared pulses < traces < built towers that can be traced (bound towers are never traced). */
export function invariantHolds(s: GameState): boolean {
  const r = rule(s);
  return r.pulses < r.traces && r.traces < unboundCount(s);
}

/** The most traces any remaining wave will demand. */
function maxTracesAhead(s: GameState): number {
  let m = 0;
  for (let w = s.wave; w <= TOTAL_WAVES; w++) m = Math.max(m, phaseRule(w).traces);
  return m;
}

// ── Preparation: tracing ────────────────────────────────────────────────────

export function traceCheck(s: GameState, towerId: string | null): { ok: boolean; reason: string } {
  if (s.phase !== 'prep') return { ok: false, reason: 'Threads can only be traced between waves.' };
  if (s.pendingGrant) return { ok: false, reason: 'Place the royal reinforcement first.' };
  const t = towerId ? towerById(s, towerId) : undefined;
  if (!t) return { ok: false, reason: 'No tower stands there — nothing spent.' };
  if (t.bound) return { ok: false, reason: `${BALANCE.towers[t.type].name} is bound in gold: it has its own pulse every wave — nothing spent.` };
  if (t.traced) return { ok: false, reason: `${BALANCE.towers[t.type].name} is already prepared — nothing spent.` };
  const r = rule(s);
  if (s.traces.length >= r.traces) return { ok: false, reason: `All ${r.traces} traces drawn. Undo one to redraw.` };
  return { ok: true, reason: '' };
}

export function traceTower(s: GameState, towerId: string): boolean {
  const c = traceCheck(s, towerId);
  if (!c.ok) { toast(s, c.reason, 'bad'); return false; }
  const t = towerById(s, towerId)!;
  t.traced = true;
  s.traces.push(t.id);
  s.resetBanner = 0;
  return true;
}

export function untraceTower(s: GameState, towerId: string): boolean {
  if (s.phase !== 'prep') return false;
  const t = towerById(s, towerId);
  if (!t || !t.traced) return false;
  t.traced = false;
  s.traces = s.traces.filter((id) => id !== towerId);
  s.fading.push({ path: routePolyline(t.foundation), t: 0, dur: 0.6 });
  return true;
}

export function undoTrace(s: GameState): boolean {
  const last = s.traces[s.traces.length - 1];
  return last ? untraceTower(s, last) : false;
}

export function clearTraces(s: GameState) {
  for (const id of [...s.traces]) untraceTower(s, id);
}

// ── Preparation: building ───────────────────────────────────────────────────

export function buildCheck(s: GameState, foundation: string, type: TowerType, free = false): { ok: boolean; reason: string } {
  if (s.phase !== 'prep') return { ok: false, reason: 'Building is locked during a wave.' };
  if (!NODE[foundation]?.foundation) return { ok: false, reason: 'That is not a foundation.' };
  if (towerAt(s, foundation)) return { ok: false, reason: 'A tower already stands there.' };
  if (free) return s.pendingGrant ? { ok: true, reason: '' } : { ok: false, reason: 'No reinforcement to place.' };
  if (s.pendingGrant) return { ok: false, reason: 'Place the royal reinforcement first.' };
  const cost = BALANCE.towers[type].cost;
  if (s.gold < cost) return { ok: false, reason: `Needs ${cost} gold.` };
  return { ok: true, reason: '' };
}

export function buildTower(s: GameState, foundation: string, type: TowerType): boolean {
  const c = buildCheck(s, foundation, type);
  if (!c.ok) { toast(s, c.reason, 'bad'); return false; }
  s.gold -= BALANCE.towers[type].cost;
  addTower(s, foundation, type);
  toast(s, `${BALANCE.towers[type].name} raised at ${NODE[foundation].foundation!.name}.`, 'good');
  return true;
}

export function placeGrant(s: GameState, foundation: string, type: TowerType): boolean {
  const c = buildCheck(s, foundation, type, true);
  if (!c.ok) { toast(s, c.reason, 'bad'); return false; }
  addTower(s, foundation, type, true);
  s.pendingGrant = false;
  toast(s, `The Crown’s ${BALANCE.towers[type].name} stands at ${NODE[foundation].foundation!.name}.`, 'gold');
  return true;
}

// ── Preparation: binding ────────────────────────────────────────────────────

export function bindCheck(s: GameState, towerId: string): { ok: boolean; reason: string } {
  if (s.phase !== 'prep') return { ok: false, reason: 'Binding is locked during a wave.' };
  if (s.pendingGrant) return { ok: false, reason: 'Place the royal reinforcement first.' };
  const t = towerById(s, towerId);
  if (!t) return { ok: false, reason: 'No tower there.' };
  if (t.bound) return { ok: false, reason: 'Already bound in gold.' };
  if (s.leaves < BALANCE.bindCost) return { ok: false, reason: `Needs ${BALANCE.bindCost} Gilded Leaves (you have ${s.leaves}).` };
  const need = maxTracesAhead(s) + 1;
  if (unboundCount(s) - 1 < need) {
    const more = need - (unboundCount(s) - 1);
    return { ok: false, reason: `Keep ${need} towers free to trace: build ${more} more tower${more === 1 ? '' : 's'} first.` };
  }
  return { ok: true, reason: '' };
}

export function bindTower(s: GameState, towerId: string): boolean {
  const c = bindCheck(s, towerId);
  if (!c.ok) { toast(s, c.reason, 'bad'); return false; }
  const t = towerById(s, towerId)!;
  if (t.traced) untraceTower(s, t.id);
  s.leaves -= BALANCE.bindCost;
  t.bound = true;
  t.flash = 1;
  toast(s, `${BALANCE.towers[t.type].name} is bound in gold: a free pulse every wave from now on.`, 'gold');
  return true;
}

// ── Starting a wave ─────────────────────────────────────────────────────────

export function canStartWave(s: GameState): { ok: boolean; reason: string } {
  if (s.phase !== 'prep') return { ok: false, reason: '' };
  if (s.pendingGrant) return { ok: false, reason: 'Place the royal reinforcement.' };
  const r = rule(s);
  if (!invariantHolds(s)) return { ok: false, reason: `Needs more than ${r.traces} unbound towers.` };
  if (s.traces.length !== r.traces) return { ok: false, reason: `Trace exactly ${r.traces} towers (${s.traces.length} of ${r.traces}).` };
  return { ok: true, reason: '' };
}

export function waveSpawns(wave: number): Spawn[] {
  const def = BALANCE.waves[wave - 1];
  const out: Spawn[] = [];
  for (const g of def.groups) {
    for (let i = 0; i < g.count; i++) {
      const at = g.start + i * g.interval;
      if (g.type === 'cairn') {
        // The marked bearer goes first; its giant follows at a fixed distance.
        out.push({ type: 'bearer', lane: g.lane, at, side: 0 });
        out.push({ type: 'cairn', lane: g.lane, at: at + BALANCE.cairn.followGap / BALANCE.enemies.bearer.speed, side: 0 });
      } else if (g.abreast && g.abreast > 1) {
        for (let j = 0; j < g.abreast; j++) out.push({ type: g.type, lane: g.lane, at, side: (j - (g.abreast - 1) / 2) * 12 });
      } else out.push({ type: g.type, lane: g.lane, at });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

function houndWarnings(wave: number): Warning[] {
  const out: Warning[] = [];
  for (const g of BALANCE.waves[wave - 1].groups) {
    if (g.type !== 'hound' || g.lane !== 'king') continue;
    const arrive = g.start + BRIDGE_S / BALANCE.enemies.hound.speed;
    out.push({ lane: g.lane, type: 'hound', from: Math.max(0, arrive - BALANCE.houndWarning), to: arrive + g.count * g.interval + 0.8, count: g.count, sounded: false });
  }
  return out;
}

export function startWave(s: GameState): boolean {
  const c = canStartWave(s);
  if (!c.ok) { if (c.reason) toast(s, c.reason, 'bad'); return false; }
  s.phase = 'combat';
  s.pulsesLeft = rule(s).pulses;
  s.waveTime = 0;
  s.spawns = waveSpawns(s.wave);
  if (s.rare && s.rare.wave === s.wave) {
    s.spawns.push({ type: s.rare.type, lane: s.rare.lane, at: s.rare.at, side: 0 });
    s.spawns.sort((a, b) => a.at - b.at);
  }
  s.resetBanner = 0;
  s.warnings = houndWarnings(s.wave);
  s.stones = [];
  for (const t of s.towers) { t.committed = false; t.cd = 0.3; }
  return true;
}

// ── Combat: pulses ──────────────────────────────────────────────────────────

export function pulseCheck(s: GameState, towerId: string): { ok: boolean; reason: string } {
  if (s.phase !== 'combat') return { ok: false, reason: '' };
  if (s.paused) return { ok: false, reason: 'Paused.' };
  const t = towerById(s, towerId);
  if (!t) return { ok: false, reason: '' };
  if (t.committed) return { ok: false, reason: 'Already pulsed this wave — no pulse spent.' };
  if (t.bound) return { ok: true, reason: '' };
  if (!t.traced) return { ok: false, reason: `${BALANCE.towers[t.type].name} has no thread this wave — no pulse spent.` };
  if (s.pulsesLeft <= 0) return { ok: false, reason: 'No pulses left this wave.' };
  return { ok: true, reason: '' };
}

/** Launch a pulse. Marks the tower committed immediately so a double-click cannot spend two charges. */
export function pulseTower(s: GameState, towerId: string): boolean {
  const c = pulseCheck(s, towerId);
  if (!c.ok) { if (c.reason) toast(s, c.reason, 'bad'); return false; }
  const t = towerById(s, towerId)!;
  t.committed = true;
  const shared = !t.bound;
  if (shared) {
    s.pulsesLeft -= 1;
    // with the last shared charge gone, every other prepared tower's thread is dry for this wave
    if (s.pulsesLeft === 0) s.sharedSpend = { by: t.id, others: s.towers.filter((o) => o.traced && !o.committed && o.id !== t.id).map((o) => o.id), t: 0, dur: 3.5 };
  }
  const path = routePolyline(t.foundation);
  s.flights.push({ towerId, path, length: polylineLength(path), s: 0, shared });
  return true;
}

/** Stretches of road within `radius` of a point (and points to draw on them, the shared stretch once). */
function roadNear(p: Vec, radius: number): { ranges: Fire['ranges']; pts: Vec[] } {
  const ranges: Fire['ranges'] = [];
  const pts: Vec[] = [];
  for (const id of LANE_IDS) {
    const L = LANES[id];
    let s0 = -1;
    for (let x = 0; x <= L.length; x += 8) {
      const q = pointAt(L, x);
      const inside = dist(q, p) <= radius;
      if (inside) {
        if (s0 < 0) s0 = x;
        if (id === 'mill' || x < L.junctionS) pts.push(q);
      }
      if ((!inside || x + 8 > L.length) && s0 >= 0) { ranges.push({ lane: id, s0, s1: x }); s0 = -1; }
    }
  }
  return { ranges, pts };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const alive = (e: Enemy) => e.hp > 0 && e.s > 0 && e.mode !== 'leave';
const onRanges = (e: Enemy, ranges: Fire['ranges']) => ranges.some((r) => r.lane === e.lane && e.s >= r.s0 && e.s <= r.s1);

/** Where a Bramble's hedge would grow: the nearest road point; on the shared stretch it blocks both lanes. */
function hedgeSpot(p: Vec): { at: Vec & { angle: number }; stops: Hedge['stops']; laneName: string } {
  let best: { lane: LaneId; s: number; d: number; point: Vec } | null = null;
  for (const id of LANE_IDS) {
    const n = nearestOnLane(LANES[id], p);
    if (!best || n.d < best.d) best = { lane: id, ...n };
  }
  const lane = LANES[best!.lane];
  const stops: Hedge['stops'] = [];
  let laneName = lane.name;
  if (best!.s >= lane.junctionS) {
    const fromGate = lane.length - best!.s;
    for (const id of LANE_IDS) stops.push({ lane: id, s: LANES[id].length - fromGate });
    laneName = 'the shared road by the gate';
  } else stops.push({ lane: best!.lane, s: best!.s });
  return { at: pointAt(lane, best!.s), stops, laneName };
}

/** Show what a pulse did, beside its tower. */
function result(s: GameState, t: Tower, text: string, shared: boolean, note?: string) {
  s.pulseResults = s.pulseResults.filter((r) => r.towerId !== t.id || r.t > 0.2);
  s.pulseResults.push({ towerId: t.id, text, note: note ?? (shared ? 'Shared pulse spent · every tower keeps attacking' : undefined), t: 0, dur: 3.4 });
}

function applyPulse(s: GameState, t: Tower, shared = false) {
  const p = posOf(t);
  const P = BALANCE.pulses;
  t.flash = 1;
  s.rings.push({ x: p.x, y: p.y, r: 40, t: 0, dur: 0.5, kind: 'arrive' });
  const none = 'No enemies in range';
  if (t.type === 'bramble') {
    const h = hedgeSpot(p);
    s.hedges.push({ towerId: t.id, at: h.at, angle: h.at.angle, stops: h.stops, t: 0, dur: P.hedgeDuration, laneName: h.laneName, held: [] });
    const coming = s.enemies.filter((e) => alive(e) && h.stops.some((st) => st.lane === e.lane && e.s < st.s)).length;
    result(s, t, `Hedge grown across ${h.laneName.startsWith('the ') ? h.laneName : `the ${h.laneName}`}`, shared,
      coming ? `${plural(coming, 'enemy', 'enemies')} on the road behind it${shared ? ' · shared pulse spent' : ''}` : (shared ? 'No one behind it yet · shared pulse spent' : 'No one behind it yet'));
  } else if (t.type === 'ember') {
    const { ranges, pts } = roadNear(p, P.fireRadius);
    const now = s.enemies.filter((e) => alive(e) && onRanges(e, ranges));
    s.fires.push({ towerId: t.id, ranges, pts, t: 0, dur: P.fireDuration, hit: now.map((e) => e.id) });
    result(s, t, now.length ? `${plural(now.length, 'enemy', 'enemies')} set burning` : none, shared,
      now.length ? undefined : `the road burns for ${P.fireDuration} s${shared ? ' · shared pulse spent' : ''}`);
  } else if (t.type === 'gargoyle') {
    // Stone Gaze: everything nearby turns to stone; giants only stiffen.
    s.rings.push({ x: p.x, y: p.y - 60, r: P.gazeRadius, t: 0, dur: 1.1, kind: 'gaze' });
    let n = 0;
    for (const e of s.enemies) {
      if (!alive(e) || dist(enemyPos(e), p) > P.gazeRadius) continue;
      const d = e.type === 'cairn' ? P.gazeGiantStun : P.gazeStun;
      e.stun = Math.max(e.stun, d);
      e.petrifyT = Math.max(e.petrifyT ?? 0, d);
      hurt(s, e, P.gazeDamage, true);
      n++;
    }
    result(s, t, n ? `${plural(n, 'enemy', 'enemies')} turned to stone` : none, shared);
  } else if (t.type === 'mangonel') {
    // Boulder Barrage: a volley onto the thickest crowd in reach, landing one after another.
    const near = s.enemies.filter((e) => alive(e) && dist(enemyPos(e), p) <= P.barrageRadius);
    let centre: Vec | null = null, most = -1;
    for (const e of near) {
      const ep = enemyPos(e);
      const n = near.filter((o) => dist(enemyPos(o), ep) <= P.barrageSplash).length;
      if (n > most) { most = n; centre = ep; }
    }
    if (centre) {
      const id = s.nextId++;
      s.volleys.push({ id, towerId: t.id, left: P.barrageCount, hit: [], shared });
      for (let i = 0; i < P.barrageCount; i++) {
        const a = i * 2.39996, r = (i === 0 ? 0 : 18 + (i % 3) * 16);
        const tx = centre.x + Math.cos(a) * r, ty = centre.y + Math.sin(a) * r * 0.7;
        s.projectiles.push({
          kind: 'mangonel', x: p.x, y: p.y - 50, sx: p.x, sy: p.y - 50, tx, ty, targetId: null, speed: 0,
          damage: P.barrageDamage, splash: P.barrageSplash, arc: 110, t: 0, dur: 0.7 + i * 0.28, volley: id,
        });
      }
    } else result(s, t, none, shared);
  } else if (t.type === 'fountain') {
    const { ranges, pts } = roadNear(p, P.floodRadius);
    const now = s.enemies.filter((e) => alive(e) && onRanges(e, ranges));
    s.pools.push({ towerId: t.id, ranges, pts, t: 0, dur: P.floodDuration, hit: now.map((e) => e.id) });
    s.rings.push({ x: p.x, y: p.y, r: P.floodRadius, t: 0, dur: 0.8, kind: 'ink' });
    result(s, t, now.length ? `${plural(now.length, 'enemy', 'enemies')} slowed in the ink` : none, shared,
      now.length ? undefined : `the ink lies for ${P.floodDuration} s${shared ? ' · shared pulse spent' : ''}`);
  } else if (t.type === 'banner') {
    s.rallies.push({ x: p.x, y: p.y, r: P.rallyRadius, t: 0, dur: P.rallyDuration });
    s.rings.push({ x: p.x, y: p.y, r: P.rallyRadius, t: 0, dur: 1.0, kind: 'rally' });
    const k = s.towers.filter((o) => dist(posOf(o), p) <= P.rallyRadius).length;
    result(s, t, `${plural(k, 'tower shoots', 'towers shoot')} twice as fast for ${P.rallyDuration} s`, shared);
  } else if (t.type === 'verdigris') {
    s.rings.push({ x: p.x, y: p.y, r: P.tarnishRadius, t: 0, dur: 1.4, kind: 'tarnish' });
    let n = 0;
    for (const e of s.enemies) if (alive(e) && dist(enemyPos(e), p) <= P.tarnishRadius) { e.vulnT = P.tarnishDuration; n++; }
    result(s, t, n ? `${plural(n, 'enemy', 'enemies')} tarnished: no armour, +${Math.round(P.tarnishVulnerability * 100)}% damage` : none, shared);
  } else {
    s.rings.push({ x: p.x, y: p.y, r: P.tollRadius, t: 0, dur: 0.9, kind: 'toll' });
    let moved = 0, giants = 0;
    for (const e of s.enemies) {
      if (!alive(e) || dist(enemyPos(e), p) > P.tollRadius) continue;
      // Stone giants do not budge.
      if (e.type !== 'cairn') {
        e.s = Math.max(0, e.s - P.tollKnockback);
        e.stun = Math.max(e.stun, P.tollStun);
        moved++;
      } else giants++;
      hurt(s, e, P.tollDamage, true);
    }
    const g = giants ? (giants === 1 ? 'the giant would not budge' : `${giants} giants would not budge`) : '';
    result(s, t, moved ? `${plural(moved, 'enemy', 'enemies')} knocked back and dazed` : giants ? g.charAt(0).toUpperCase() + g.slice(1) : none, shared,
      moved && giants ? `${g}${shared ? ' · shared pulse spent' : ''}` : undefined);
  }
}

// ── Pulse preview ───────────────────────────────────────────────────────────

/** What a pulse would do, for the hover preview. Pure: it changes nothing. */
export interface PulsePreview {
  towerId: string;
  type: TowerType;
  centre: Vec;
  /** Seconds for the ink to run from the inkwell to the tower. */
  flight: number;
  /** Area pulses: the circle of effect. */
  radius?: number;
  /** Road pulses (fire, flood): the stretch of road affected. */
  road?: Vec[];
  /** Hedge: where it would grow. */
  hedge?: { at: Vec & { angle: number }; laneName: string };
  /** Mangonel: the crowd it would aim at now. */
  crowd?: { at: Vec; r: number };
  /** Banner: towers that would be rallied. */
  towers?: string[];
  /** Enemies it would affect if it landed this instant. */
  now: number[];
  /** Enemies not affected now that should be by the time the ink arrives (or that the effect will catch later). */
  later: number[];
  summary: string;
}

/** Where an enemy should be `dt` seconds from now, ignoring hedges and blocks. */
function predicted(e: Enemy, dt: number): Vec {
  const st = BALANCE.enemies[e.type];
  const k = e.slowT ? BALANCE.pulses.inkSlow : 1;
  const moving = Math.max(0, dt - Math.max(0, e.stun));
  return enemyPos({ ...e, s: Math.min(LANES[e.lane].length, e.s + st.speed * k * moving) });
}

export function pulsePreview(s: GameState, towerId: string): PulsePreview | null {
  const t = towerById(s, towerId);
  if (!t) return null;
  const P = BALANCE.pulses;
  const p = posOf(t);
  const flight = polylineLength(routePolyline(t.foundation)) / BALANCE.pulseSpeed;
  const foes = s.enemies.filter(alive);
  const name = BALANCE.towers[t.type].pulseName;
  const fl = `${flight.toFixed(1)} s`;
  const out: PulsePreview = { towerId, type: t.type, centre: p, flight, now: [], later: [], summary: '' };
  const enemies = (n: number) => plural(n, 'enemy', 'enemies');
  const areaSplit = (inNow: (e: Enemy) => boolean, inLater: (e: Enemy) => boolean) => {
    out.now = foes.filter(inNow).map((e) => e.id);
    out.later = foes.filter((e) => !inNow(e) && inLater(e)).map((e) => e.id);
  };
  if (t.type === 'bramble') {
    const h = hedgeSpot(p);
    out.hedge = { at: h.at, laneName: h.laneName };
    // the hedge holds whoever reaches it while it stands: those already near it, and those further back
    const behind = foes.filter((e) => h.stops.some((st) => st.lane === e.lane && e.s < st.s));
    const soon = (e: Enemy) => h.stops.some((st) => st.lane === e.lane && st.s - e.s <= BALANCE.enemies[e.type].speed * P.hedgeDuration);
    out.now = behind.filter(soon).map((e) => e.id);
    out.later = behind.filter((e) => !soon(e)).map((e) => e.id);
    const road = h.laneName.startsWith('the ') ? h.laneName : `the ${h.laneName}`;
    out.summary = out.now.length
      ? `${name} on ${road} · would hold ${enemies(out.now.length)} that reach it while it stands (${P.hedgeDuration} s)${out.later.length ? `; ${out.later.length} more further back` : ''}`
      : out.later.length ? `${name} on ${road} · ${enemies(out.later.length)} coming, but none close enough to be held in its ${P.hedgeDuration} s` : `${name} on ${road} · no one on that road behind it yet`;
  } else if (t.type === 'ember' || t.type === 'fountain') {
    const r = t.type === 'ember' ? P.fireRadius : P.floodRadius;
    const { ranges, pts } = roadNear(p, r);
    out.road = pts;
    areaSplit((e) => onRanges(e, ranges), (e) => { const q = predicted(e, flight + (t.type === 'ember' ? P.fireDuration : P.floodDuration) * 0.5); return ranges.some((rg) => rg.lane === e.lane) && dist(q, p) <= r; });
    out.summary = `${name} · ${out.now.length ? `${enemies(out.now.length)} on that road now` : 'no enemies on that road now'}${out.later.length ? ` · ${out.later.length} more walking into it` : ''} · ink lands in ${fl}`;
  } else if (t.type === 'mangonel') {
    const near = foes.filter((e) => dist(enemyPos(e), p) <= P.barrageRadius);
    let centre: Vec | null = null, most = -1;
    for (const e of near) { const ep = enemyPos(e); const n = near.filter((o) => dist(enemyPos(o), ep) <= P.barrageSplash).length; if (n > most) { most = n; centre = ep; } }
    out.radius = P.barrageRadius;
    if (centre) {
      out.crowd = { at: centre, r: P.barrageSplash + 34 };
      areaSplit((e) => dist(enemyPos(e), centre!) <= P.barrageSplash + 34, (e) => dist(predicted(e, flight + 1.2), centre!) <= P.barrageSplash + 34);
    }
    out.summary = centre ? `${name} · aims at the thickest crowd when the ink lands (${fl}); ${enemies(out.now.length)} there now` : `${name} · no enemies in reach now`;
  } else if (t.type === 'banner') {
    out.radius = P.rallyRadius;
    out.towers = s.towers.filter((o) => dist(posOf(o), p) <= P.rallyRadius).map((o) => o.id);
    out.summary = `${name} · ${plural(out.towers.length, 'tower', 'towers')} would shoot twice as fast for ${P.rallyDuration} s`;
  } else {
    const r = t.type === 'bell' ? P.tollRadius : t.type === 'verdigris' ? P.tarnishRadius : P.gazeRadius;
    out.radius = r;
    areaSplit((e) => dist(enemyPos(e), p) <= r, (e) => dist(predicted(e, flight), p) <= r);
    const verb = t.type === 'bell' ? 'knocked back' : t.type === 'verdigris' ? 'tarnished' : 'turned to stone';
    out.summary = `${name} · ${out.now.length ? `${enemies(out.now.length)} in reach now` : 'no enemies in reach now'}${out.later.length ? ` · ${out.later.length} more by the time the ink lands (${fl})` : ` · ink lands in ${fl}`} · they would be ${verb}`;
  }
  return out;
}

// ── Combat simulation ───────────────────────────────────────────────────────

export function enemyPos(e: Enemy): Vec & { angle: number } {
  const p = pointAt(LANES[e.lane], e.s);
  // Sideways offset (perpendicular to the road).
  return { x: p.x - Math.sin(p.angle) * e.side, y: p.y + Math.cos(p.angle) * e.side, angle: p.angle };
}

/** Armour after Verdigris corrosion and Tarnish. */
export function effectiveArmour(e: Enemy): number {
  if (e.vulnT > 0) return 0;
  return Math.max(0, BALANCE.enemies[e.type].armour - e.shred);
}

export function hurt(s: GameState, e: Enemy, raw: number, ignoreArmour = false) {
  if (e.hp <= 0 || e.mode === 'leave') return;
  const armour = ignoreArmour ? 0 : effectiveArmour(e);
  const mult = e.vulnT > 0 ? 1 + BALANCE.pulses.tarnishVulnerability : 1;
  e.hp -= Math.max(1, raw - armour) * mult;
  e.hit = 0.15;
  if (e.hp <= 0) {
    s.gold += BALANCE.enemies[e.type].bounty;
    s.kills += 1;
    const p = enemyPos(e);
    s.fallen.push({ type: e.type, x: p.x, y: p.y, dir: Math.cos(p.angle) >= -0.1 ? 1 : -1, t: 0 });
    if (e.type === 'bearer') dropStone(s, e);
    if (e.type === 'cairn') s.stones = s.stones.filter((st) => st.giantId !== e.id);
    if (isRare(e.type)) s.rareLog.push({ type: e.type, event: 'caught', wave: s.wave });
  }
}

/** The bearer has fallen: its name-stone lies where it fell, and the giant goes to it. */
function dropStone(s: GameState, bearer: Enemy) {
  const giant = s.enemies.find((g) => g.type === 'cairn' && g.bearerId === bearer.id && g.hp > 0);
  if (!giant) return;
  const stone = { lane: bearer.lane, s: bearer.s };
  giant.mode = 'seek';
  giant.stone = stone;
  s.stones.push({ ...stone, giantId: giant.id });
  toast(s, 'The name-stone falls. The Cairn-Born turns towards it\u2026', 'info');
}

/** Distance from the gate, so blocks on the shared stretch apply to both lanes. */
function blocksFor(lane: LaneId, sOn: number): { lane: LaneId; s: number }[] {
  const L = LANES[lane];
  if (sOn < L.junctionS) return [{ lane, s: sOn }];
  const fromGate = L.length - sOn;
  return LANE_IDS.map((id) => ({ lane: id, s: LANES[id].length - fromGate }));
}

function spawnEnemy(s: GameState, sp: Spawn) {
  const st = BALANCE.enemies[sp.type];
  const e: Enemy = {
    id: s.nextId++, type: sp.type, lane: sp.lane, s: 0, hp: st.hp, maxHp: st.hp, stun: 0, hit: 0,
    side: sp.side ?? (Math.random() * 2 - 1) * 7, bob: Math.random() * 6, shred: 0, shredT: 0, vulnT: 0,
  };
  if (sp.type === 'cairn') {
    // Bind the giant to the latest unclaimed bearer on its road.
    const bearer = [...s.enemies].reverse().find((b) => b.type === 'bearer' && b.lane === sp.lane && !s.enemies.some((g) => g.bearerId === b.id));
    e.bearerId = bearer?.id;
    e.mode = bearer ? 'follow' : 'march';
  }
  s.enemies.push(e);
  if (isRare(sp.type)) s.rareLog.push({ type: sp.type, event: 'seen', wave: s.wave });
}

/** How fast a tower reloads: banners nearby quicken it a little, an active Rally doubles it. */
export function fireRate(s: GameState, t: Tower): number {
  const P = BALANCE.pulses;
  const p = posOf(t);
  let k = 1;
  if (s.towers.some((o) => o !== t && o.type === 'banner' && dist(posOf(o), p) <= P.bannerAuraRadius)) k += P.bannerAura;
  if (s.rallies.some((r) => dist(r, p) <= r.r)) k *= P.rallyRate;
  return k;
}

function pickTarget(s: GameState, from: Vec, range: number): Enemy | null {
  let best: Enemy | null = null;
  let bestLeft = Infinity;
  for (const e of s.enemies) {
    if (e.hp <= 0 || e.s <= 0 || e.mode === 'leave') continue;
    if (dist(enemyPos(e), from) > range) continue;
    const left = LANES[e.lane].length - e.s;
    if (left < bestLeft) { bestLeft = left; best = e; }
  }
  return best;
}

/** Seek / kneel / leave. Returns true when the giant's movement is fully handled here. */
function moveGiant(s: GameState, g: Enemy, dt: number): boolean {
  const C = BALANCE.cairn;
  if (g.mode === 'seek' && g.stone) {
    const dir = Math.sign(g.stone.s - g.s);
    const step = BALANCE.enemies.cairn.speed * 1.25 * dt;
    if (Math.abs(g.stone.s - g.s) <= step + 1) {
      g.s = g.stone.s;
      g.mode = 'kneel';
      g.modeT = C.kneelSeconds;
      toast(s, 'The Cairn-Born kneels at its name-stone. The road behind it is blocked.', 'gold');
    } else g.s += dir * step;
    g.bob += dt * 2;
    return true;
  }
  if (g.mode === 'kneel') {
    g.modeT = (g.modeT ?? 0) - dt;
    if (g.modeT <= 0) {
      g.mode = 'leave';
      g.modeT = C.leaveSeconds;
      s.stones = s.stones.filter((st) => st.giantId !== g.id);
      toast(s, 'The Cairn-Born rises with its stone and leaves the field. The road is open again.', 'info');
    }
    return true;
  }
  if (g.mode === 'leave') {
    g.modeT = (g.modeT ?? 0) - dt;
    g.fade = Math.max(0, (g.modeT ?? 0) / C.leaveSeconds);
    return true;
  }
  return false;
}

export function step(s: GameState, dtRaw: number) {
  const dt = Math.min(dtRaw, 0.1);
  s.time += dt;
  for (const t of s.toasts) t.t += dt;
  s.toasts = s.toasts.filter((t) => t.t < 3.5);
  for (const f of s.fading) f.t += dt;
  s.fading = s.fading.filter((f) => f.t < f.dur);
  for (const f of s.fallen) f.t += dt;
  s.fallen = s.fallen.filter((f) => f.t < 1.6);
  for (const r of s.rings) r.t += dt;
  s.rings = s.rings.filter((r) => r.t < r.dur);
  for (const r of s.pulseResults) r.t += dt;
  s.pulseResults = s.pulseResults.filter((r) => r.t < r.dur);
  if (s.sharedSpend) { s.sharedSpend.t += dt; if (s.sharedSpend.t >= s.sharedSpend.dur) s.sharedSpend = null; }
  for (const t of s.towers) t.flash = Math.max(0, t.flash - dt * 1.5);
  if (s.phase === 'prep' && s.resetBanner > 0) s.resetBanner = Math.max(0, s.resetBanner - dt);
  if (s.phase !== 'combat') return;

  s.waveTime += dt;

  // Spawns
  while (s.spawns.length && s.spawns[0].at <= s.waveTime) spawnEnemy(s, s.spawns.shift()!);

  // Pulses travelling along their threads
  for (const f of s.flights) {
    f.s += BALANCE.pulseSpeed * dt;
    if (f.s >= f.length) {
      const t = towerById(s, f.towerId);
      if (t) applyPulse(s, t, f.shared);
    }
  }
  s.flights = s.flights.filter((f) => f.s < f.length);

  // Hedges and fires
  for (const h of s.hedges) h.t += dt;
  for (const h of s.hedges) if (h.t >= h.dur) endResult(s, h.towerId, h.held.length ? `The hedge held ${plural(h.held.length, 'enemy', 'enemies')}` : 'The hedge held no one');
  s.hedges = s.hedges.filter((h) => h.t < h.dur);
  for (const f of s.fires) f.t += dt;
  for (const f of s.fires) if (f.t >= f.dur) endResult(s, f.towerId, f.hit.length ? `The fire burned ${plural(f.hit.length, 'enemy', 'enemies')}` : 'The fire burned no one');
  s.fires = s.fires.filter((f) => f.t < f.dur);
  for (const pl of s.pools) pl.t += dt;
  for (const pl of s.pools) if (pl.t >= pl.dur) endResult(s, pl.towerId, pl.hit.length ? `The ink slowed ${plural(pl.hit.length, 'enemy', 'enemies')}` : 'The ink slowed no one');
  s.pools = s.pools.filter((pl) => pl.t < pl.dur);
  for (const r of s.rallies) r.t += dt;
  s.rallies = s.rallies.filter((r) => r.t < r.dur);

  // Kneeling giants block their road behind them (both lanes if on the shared stretch).
  const giantBlocks: { lane: LaneId; s: number; id: number }[] = [];
  for (const g of s.enemies) if (g.type === 'cairn' && g.mode === 'kneel') for (const b of blocksFor(g.lane, g.s)) giantBlocks.push({ ...b, id: g.id });

  // Enemy movement
  for (const e of s.enemies) {
    e.hit = Math.max(0, e.hit - dt);
    if (e.shredT > 0) { e.shredT -= dt; if (e.shredT <= 0) e.shred = 0; }
    if (e.vulnT > 0) e.vulnT = Math.max(0, e.vulnT - dt);
    if (e.slowT) e.slowT = Math.max(0, e.slowT - dt);
    if (e.petrifyT) e.petrifyT = Math.max(0, e.petrifyT - dt);
    const st = BALANCE.enemies[e.type];
    if (e.type === 'cairn') {
      if (moveGiant(s, e, dt)) continue;
    }
    if (e.stun > 0) { e.stun -= dt; continue; }
    let k = 1;
    if (e.slowT) k = Math.min(k, BALANCE.pulses.inkSlow);
    if (s.pools.some((pl) => pl.ranges.some((r) => r.lane === e.lane && e.s >= r.s0 && e.s <= r.s1))) k = Math.min(k, BALANCE.pulses.floodSlow);
    let ns = e.s + st.speed * k * dt;
    for (const h of s.hedges) {
      for (const stop of h.stops) {
        if (stop.lane === e.lane && e.s <= stop.s - 2 && ns > stop.s - 10) {
          ns = Math.min(ns, Math.max(e.s, stop.s - 10));
          if (!h.held.includes(e.id)) h.held.push(e.id);
        }
      }
    }
    for (const b of giantBlocks) {
      if (b.id !== e.id && b.lane === e.lane && e.s < b.s && ns > b.s - 30) ns = Math.min(ns, Math.max(e.s, b.s - 30));
    }
    if (e.type === 'cairn' && e.mode === 'follow') {
      const bearer = s.enemies.find((b) => b.id === e.bearerId && b.hp > 0);
      if (bearer && bearer.lane === e.lane) ns = Math.min(ns, Math.max(e.s, bearer.s - BALANCE.cairn.followGap * 0.75));
      else if (!bearer) e.mode = 'march';
    }
    e.s = ns;
    e.bob += dt * st.speed * 0.15;
  }
  // Giants that left the field
  for (const e of s.enemies) {
    if (e.mode === 'leave' && (e.modeT ?? 0) <= 0) {
      e.hp = 0;
      s.gold += BALANCE.cairn.leaveBounty;
      s.stones = s.stones.filter((st) => st.giantId !== e.id);
    }
  }

  // Burning road
  for (const f of s.fires) {
    for (const e of s.enemies) {
      if (f.ranges.some((r) => r.lane === e.lane && e.s >= r.s0 && e.s <= r.s1)) {
        if (!f.hit.includes(e.id)) f.hit.push(e.id);
        hurt(s, e, BALANCE.pulses.fireDps * dt, true);
      }
    }
  }
  // Ink pools stain whatever wades through them
  for (const pl of s.pools) {
    for (const e of s.enemies) {
      if (pl.ranges.some((r) => r.lane === e.lane && e.s >= r.s0 && e.s <= r.s1)) {
        if (!pl.hit.includes(e.id)) pl.hit.push(e.id);
        hurt(s, e, BALANCE.pulses.floodDps * dt, true);
      }
    }
  }

  // Towers attack automatically (traced or not)
  for (const t of s.towers) {
    t.cd -= dt * fireRate(s, t);
    if (t.cd > 0) continue;
    const st = BALANCE.towers[t.type];
    const p = posOf(t);
    const target = pickTarget(s, p, st.range);
    if (!target) continue;
    t.cd = st.cooldown;
    const dmg = towerDamage(s, t);
    if (t.type === 'bell') {
      s.rings.push({ x: p.x, y: p.y, r: st.range, t: 0, dur: 0.55, kind: 'bell' });
      for (const e of s.enemies) if (e.hp > 0 && e.s > 0 && dist(enemyPos(e), p) <= st.range) hurt(s, e, dmg);
    } else {
      const ep = enemyPos(target);
      let tx = ep.x, ty = ep.y;
      const flight = dist(p, ep) / st.projectileSpeed;
      if ((t.type === 'ember' || t.type === 'mangonel') && target.stun <= 0) {
        const fut = enemyPos({ ...target, s: target.s + BALANCE.enemies[target.type].speed * flight * 0.8 });
        tx = fut.x; ty = fut.y;
      }
      s.projectiles.push({
        kind: t.type, x: p.x, y: p.y - 30, sx: p.x, sy: p.y - 30, tx, ty,
        targetId: st.splash > 0 ? null : target.id, speed: st.projectileSpeed, damage: dmg, splash: st.splash, shred: st.shred, slow: st.slow,
        arc: t.type === 'mangonel' ? 80 : t.type === 'ember' ? 60 : 0,
        t: 0, dur: Math.max(0.12, flight),
      });
    }
  }

  // The castle's own weak, short-range volley
  s.castleCd -= dt;
  if (s.castleCd <= 0) {
    const C = BALANCE.castle;
    const target = pickTarget(s, GATE, C.range);
    if (target) {
      s.castleCd = C.cooldown;
      const ep = enemyPos(target);
      s.projectiles.push({
        kind: 'castle', x: GATE.x + 12, y: GATE.y - 40, sx: GATE.x + 12, sy: GATE.y - 40, tx: ep.x, ty: ep.y,
        targetId: target.id, speed: 600, damage: C.damage, splash: 0, t: 0, dur: Math.max(0.1, dist(GATE, ep) / 600),
      });
    }
  }

  // Projectiles
  for (const pr of s.projectiles) {
    pr.t += dt;
    if (pr.targetId !== null) {
      const e = s.enemies.find((x) => x.id === pr.targetId && x.hp > 0);
      if (e) { const ep = enemyPos(e); pr.tx = ep.x; pr.ty = ep.y; }
    }
    const k = Math.min(1, pr.t / pr.dur);
    pr.x = pr.sx + (pr.tx - pr.sx) * k;
    pr.y = pr.sy + (pr.ty - pr.sy) * k;
    if (k >= 1) {
      if (pr.splash > 0) {
        s.rings.push({ x: pr.tx, y: pr.ty, r: pr.splash, t: 0, dur: 0.35, kind: pr.kind === 'mangonel' ? 'thud' : 'splash' });
        const v = pr.volley !== undefined ? s.volleys.find((x) => x.id === pr.volley) : undefined;
        for (const e of s.enemies) if (e.hp > 0 && dist(enemyPos(e), { x: pr.tx, y: pr.ty }) <= pr.splash) {
          if (v && !v.hit.includes(e.id)) v.hit.push(e.id);
          hurt(s, e, pr.damage);
        }
        if (v && --v.left <= 0) {
          const t = towerById(s, v.towerId);
          if (t) result(s, t, v.hit.length ? `Boulders struck ${plural(v.hit.length, 'enemy', 'enemies')}` : 'The boulders hit nothing', v.shared);
          s.volleys = s.volleys.filter((x) => x !== v);
        }
      } else {
        const e = s.enemies.find((x) => x.id === pr.targetId && x.hp > 0);
        if (e) {
          if (pr.slow) e.slowT = Math.max(e.slowT ?? 0, pr.slow);
          if (pr.shred) {
            e.shred = Math.min(BALANCE.pulses.shredMax, BALANCE.enemies[e.type].armour, e.shred + pr.shred);
            e.shredT = BALANCE.pulses.shredDuration;
            s.rings.push({ x: pr.tx, y: pr.ty, r: 16, t: 0, dur: 0.4, kind: 'corrode' });
          }
          hurt(s, e, pr.damage);
        }
      }
    }
  }
  s.projectiles = s.projectiles.filter((p) => p.t < p.dur);

  // Reaching the gate
  for (const e of s.enemies) {
    if (e.hp > 0 && e.s >= LANES[e.lane].length && isRare(e.type)) {
      // rare creatures never harm the castle: they simply wander off
      e.hp = 0;
      s.rareLog.push({ type: e.type, event: 'escaped', wave: s.wave });
      continue;
    }
    if (e.hp > 0 && e.s >= LANES[e.lane].length) {
      e.hp = 0;
      s.castleHp = Math.max(0, s.castleHp - BALANCE.enemies[e.type].castleDamage);
      s.leaked += 1;
      s.leakLog.push(`${e.type}@${e.lane}`);
      s.rings.push({ x: LANES[e.lane].pts.at(-1)!.x, y: LANES[e.lane].pts.at(-1)!.y, r: 50, t: 0, dur: 0.5, kind: 'splash' });
    }
  }
  s.enemies = s.enemies.filter((e) => e.hp > 0);

  if (s.castleHp <= 0) {
    s.phase = 'defeat';
    s.flights = [];
    return;
  }
  if (s.spawns.length === 0 && s.enemies.every((e) => isRare(e.type))) {
    // the wave is over: any rare creature still on the road slips away
    for (const e of s.enemies) s.rareLog.push({ type: e.type as RareType, event: 'escaped', wave: s.wave });
    s.enemies = [];
    endWave(s);
  }
}

function endWave(s: GameState) {
  const survived = s.wave;
  const gold = BALANCE.waveClearGold(survived);
  s.gold += gold;
  s.leaves += BALANCE.leavesPerWave;
  // Every temporary trace fades, pulsed or not. Unspent pulses vanish.
  for (const t of s.towers) {
    if (t.traced) s.fading.push({ path: routePolyline(t.foundation), t: 0, dur: 1.6 });
    t.traced = false;
    t.committed = false;
  }
  s.traces = [];
  s.pulsesLeft = 0;
  s.flights = [];
  s.hedges = [];
  s.fires = [];
  s.pools = [];
  s.rallies = [];
  s.volleys = [];
  s.sharedSpend = null;
  s.projectiles = [];
  s.warnings = [];
  s.stones = [];
  if (survived >= TOTAL_WAVES) { s.phase = 'victory'; return; }
  s.wave = survived + 1;
  s.phase = 'prep';
  s.resetBanner = 6;
  toast(s, `Wave ${survived} held! +${gold} gold, +${BALANCE.leavesPerWave} Gilded Leaf.`, 'gold');
  toast(s, 'The ink fades: every temporary thread is cleared.', 'info');
  if (s.wave === BALANCE.reinforcementWave && unboundCount(s) <= BALANCE.reinforcementIfTowersAtMost) {
    s.pendingGrant = true;
  }
}

/** A follow-up line when a lasting effect (hedge, fire, ink) ends: what it did over its whole life. */
function endResult(s: GameState, towerId: string, text: string) {
  s.pulseResults.push({ towerId, text, t: 0, dur: 2.8 });
}

/** Pulse flight progress for rendering: point along the thread. */
export function flightPoint(f: PulseFlight): Vec { return pointAlong(f.path, f.s); }
