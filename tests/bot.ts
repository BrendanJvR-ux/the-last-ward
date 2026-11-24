// A simple scripted player used by the tests to prove the six waves are winnable.
import { BALANCE, type LevelId, type TowerType } from '../src/balance';
import {
  type GameState, newGame, step, traceTower, startWave, pulseTower, buildTower, placeGrant, bindTower,
  rule, towerAt, enemyPos, posOf, emptyFoundations,
} from '../src/game';
import { dist } from '../src/map';

export interface BotPlan {
  /** Build queue, bought greedily in order whenever gold allows. */
  builds?: { foundation: string; type: TowerType }[];
  grant?: { foundation: string; type: TowerType };
  /** Bind the tower on this foundation in gold at the start of this wave's preparation. */
  bind?: { wave: number; foundation: string };
  /** Foundations to trace each wave (in preference order). */
  traces: Record<number, string[]>;
  /** Use pulses at all? */
  pulse: boolean;
  /** Which level to play (default: the fields). */
  level?: LevelId;
}

/** Play with a fixed random seed (enemy jitter uses Math.random) so balance tests repeat exactly. */
export function playBot(plan: BotPlan, maxSeconds = 2000, seed = 20261124): { state: GameState; hpByWave: number[]; leaks: string[][] } {
  const real = Math.random;
  let x = seed >>> 0;
  Math.random = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
  try { return playBotInner(plan, maxSeconds); } finally { Math.random = real; }
}

function playBotInner(plan: BotPlan, maxSeconds: number): { state: GameState; hpByWave: number[]; leaks: string[][] } {
  const leaks: string[][] = [];
  const s = newGame(plan.level ?? 'fields');
  const hpByWave: number[] = [];
  let guard = 0;
  while (s.phase !== 'victory' && s.phase !== 'defeat' && guard++ < 100) {
    // Preparation
    if (s.pendingGrant && plan.grant) placeGrant(s, plan.grant.foundation, plan.grant.type);
    if (s.pendingGrant) placeGrant(s, emptyFoundations(s)[0], 'bramble');
    for (const b of plan.builds ?? []) {
      if (towerAt(s, b.foundation)) continue;
      if (s.gold < BALANCE.towers[b.type].cost) break;
      buildTower(s, b.foundation, b.type);
    }
    if (plan.bind && plan.bind.wave === s.wave) { const t = towerAt(s, plan.bind.foundation); if (t) bindTower(s, t.id); }
    const want = plan.traces[s.wave] ?? [];
    for (const f of want) { const t = towerAt(s, f); if (t && s.traces.length < rule(s).traces) traceTower(s, t.id); }
    for (const t of s.towers) if (s.traces.length < rule(s).traces && !t.traced) traceTower(s, t.id);
    if (!startWave(s)) throw new Error(`could not start wave ${s.wave}`);
    const w = s.wave;
    let elapsed = 0;
    while (s.phase === 'combat' && elapsed < maxSeconds) {
      step(s, 1 / 30);
      elapsed += 1 / 30;
      if (plan.pulse) botPulse(s);
    }
    hpByWave[w] = s.castleHp;
    leaks[w] = s.leakLog.splice(0);
  }
  return { state: s, hpByWave, leaks };
}

function botPulse(s: GameState) {
  // Hold one pulse for a traced, uncommitted Ember Kiln while wolves are still to come.
  const wolvesToCome = s.spawns.some((x) => x.type === 'hound') || s.enemies.some((e) => e.type === 'hound');
  const emberReady = s.towers.some((t) => t.type === 'ember' && t.traced && !t.committed);
  const reserve = wolvesToCome && emberReady ? 1 : 0;
  for (const t of s.towers) {
    if (t.committed || (!t.bound && (!t.traced || s.pulsesLeft <= 0))) continue;
    const p = posOf(t);
    const near = (r: number) => s.enemies.filter((e) => dist(enemyPos(e), p) <= r);
    if (t.type === 'ember') {
      const n = near(BALANCE.pulses.fireRadius);
      if (n.filter((e) => e.type === 'hound').length >= 3 || (!wolvesToCome && n.length >= 5)) pulseTower(s, t.id);
      continue;
    }
    if (!t.bound && s.pulsesLeft <= reserve) continue;
    let fire = false;
    if (t.type === 'bramble') fire = near(170).length >= 5;
    if (t.type === 'bell') fire = near(BALANCE.pulses.tollRadius).length >= 5 || near(BALANCE.pulses.tollRadius).some((e) => e.type === 'cairn' && e.hp > 100);
    if (t.type === 'gargoyle') fire = near(BALANCE.pulses.gazeRadius).length >= 5 || near(BALANCE.pulses.gazeRadius).some((e) => e.type === 'cairn' && e.hp > 100);
    if (t.type === 'mangonel') fire = near(BALANCE.pulses.barrageRadius).length >= 7;
    if (t.type === 'fountain') fire = near(BALANCE.pulses.floodRadius).length >= 5;
    if (t.type === 'banner') fire = near(BALANCE.pulses.rallyRadius).length >= 8;
    if (fire) pulseTower(s, t.id);
  }
}
