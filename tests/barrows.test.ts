import { describe, it, expect } from 'vitest';
import { playBot } from './bot';
import { newGame, step, startWave, traceTower, pulseTower, fireRate, type Enemy } from '../src/game';
import { LANES, NODE, FOUNDATION_IDS, LEVEL, nearestOnLane } from '../src/map';

// Level 5: the barrows, the last stand, with its own four towers.
export const barrowBuilds = [
  { foundation: 'f_chalk', type: 'chimes' as const },
  { foundation: 'f_gallows', type: 'beacon' as const },
  { foundation: 'f_dolmen', type: 'menhir' as const },
  { foundation: 'f_dyke', type: 'warden' as const },
  { foundation: 'f_cromlech', type: 'menhir' as const },
  { foundation: 'f_owlstone', type: 'chimes' as const },
];
export const barrowTraces = {
  1: ['f_kingstone', 'f_longbarrow'], 2: ['f_longbarrow', 'f_kingstone'], 3: ['f_kingstone', 'f_longbarrow'],
  4: ['f_kingstone', 'f_longbarrow', 'f_ring'], 5: ['f_kingstone', 'f_longbarrow', 'f_ring'], 6: ['f_kingstone', 'f_longbarrow', 'f_ring'],
};

describe('the barrows', () => {
  it('loads its own map and towers, with every foundation clear of the roads', () => {
    const s = newGame('barrows');
    expect(LEVEL).toBe('barrows');
    expect(FOUNDATION_IDS).toHaveLength(13);
    expect(s.towers.map((t) => t.type).sort()).toEqual(['beacon', 'chimes', 'menhir']);
    expect(LANES.king.name).toBe('Hollow Way');
    for (const f of FOUNDATION_IDS) for (const id of ['mill', 'king'] as const) {
      expect(nearestOnLane(LANES[id], NODE[f]).d, `${f} vs ${id}`).toBeGreaterThan(40);
    }
    newGame();
  });

  it('new pulses: stone sleep and the dirge; the warden quickens its neighbours', () => {
    const s = newGame('barrows');
    const T = (f: string) => s.towers.find((t) => t.foundation === f)!.id;
    traceTower(s, T('f_kingstone')); traceTower(s, T('f_longbarrow'));
    startWave(s); s.spawns = [];
    const foe = (lane: 'mill' | 'king', near: string, id: number) => {
      const e: Enemy = { id, type: 'levy', lane, s: nearestOnLane(LANES[lane], NODE[near]).s, hp: 400, maxHp: 400, stun: 0, hit: 0, side: 0, bob: 0, shred: 0, shredT: 0, vulnT: 0 };
      s.enemies.push(e); return e;
    };
    const atStone = foe('mill', 'f_kingstone', 901);
    const atBarrow = foe('king', 'f_longbarrow', 902);
    foe('mill', 'f_cairnhill', 950); // far away: keeps the wave going
    s.pulsesLeft = 2;
    pulseTower(s, T('f_kingstone'));
    pulseTower(s, T('f_longbarrow'));
    for (let i = 0; i < 90 && s.pulseResults.length < 2; i++) step(s, 1 / 30);
    expect(atStone.petrifyT ?? 0).toBeGreaterThan(0);
    expect(atBarrow.slowT ?? 0).toBeGreaterThan(0);
    const text = s.pulseResults.map((r) => r.text).join(' | ');
    expect(text).toMatch(/stone sleep/);
    expect(text).toMatch(/slowed by the dirge/);
    // a warden beside a tower quickens it
    const ring = s.towers.find((t) => t.foundation === 'f_ring')!;
    const before = fireRate(s, ring);
    s.towers.push({ id: 'w', foundation: 'f_owlstone', type: 'warden', cd: 0, traced: false, committed: false, flash: 0, bound: false });
    expect(fireRate(s, ring)).toBeGreaterThan(before);
  });

  it('a sensible strategy wins all six waves', () => {
    const r = playBot({ level: 'barrows', pulse: true, builds: barrowBuilds, traces: barrowTraces, bind: { wave: 4, foundation: 'f_kingstone' } });
    console.log('barrows strategy', r.hpByWave.slice(1), r.state.phase, 'gold', r.state.gold, JSON.stringify(r.leaks.slice(1)));
    expect(r.state.phase).toBe('victory');
  });

  it('pulses matter: the same builds without pulses lose', () => {
    const r = playBot({ level: 'barrows', pulse: false, builds: barrowBuilds, traces: barrowTraces });
    console.log('barrows, no pulses', r.hpByWave.slice(1), r.state.phase);
    expect(r.state.phase).toBe('defeat');
  });

  it('building matters: pulses alone with no new towers lose', () => {
    const r = playBot({ level: 'barrows', pulse: true, traces: barrowTraces });
    console.log('barrows, no builds', r.hpByWave.slice(1), r.state.phase);
    expect(r.state.phase).toBe('defeat');
  });
});
