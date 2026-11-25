import { describe, it, expect } from 'vitest';
import { playBot } from './bot';
import { newGame, step, startWave, traceTower, pulseTower, floodFor, type Enemy } from '../src/game';
import { BALANCE } from '../src/balance';
import { LANES, NODE, FOUNDATION_IDS, LEVEL, nearestOnLane } from '../src/map';

// Level 4: the flooded fen, with its own four towers.
export const fenBuilds = [
  { foundation: 'f_drowned', type: 'lantern' as const },
  { foundation: 'f_osiers', type: 'wheel' as const },
  { foundation: 'f_weir', type: 'heron' as const },
  { foundation: 'f_reedbank', type: 'heron' as const },
  { foundation: 'f_staithe', type: 'eeltrap' as const },
  { foundation: 'f_punt', type: 'wheel' as const },
];
export const fenTraces = {
  1: ['f_heronry', 'f_withy'], 2: ['f_island', 'f_withy'], 3: ['f_heronry', 'f_withy'],
  4: ['f_withy', 'f_heronry', 'f_island'], 5: ['f_withy', 'f_heronry', 'f_island'], 6: ['f_withy', 'f_heronry', 'f_island'],
};

describe('the flooded fen', () => {
  it('loads its own map and towers, with every foundation clear of the causeways', () => {
    const s = newGame('fen');
    expect(LEVEL).toBe('fen');
    expect(FOUNDATION_IDS).toHaveLength(13);
    expect(s.towers.map((t) => t.type).sort()).toEqual(['eeltrap', 'heron', 'wheel']);
    expect(s.flood?.lane).toBe('king'); // the flood starts on the Eel Dyke
    expect(LANES.mill.name).toBe('Reed Causeway');
    for (const f of FOUNDATION_IDS) for (const id of ['mill', 'king'] as const) {
      expect(nearestOnLane(LANES[id], NODE[f]).d, `${f} vs ${id}`).toBeGreaterThan(40);
    }
    newGame();
  });

  it('new pulses: sluice surge, stoop, eel snare and marsh lights', () => {
    const s = newGame('fen');
    const T = (f: string) => s.towers.find((t) => t.foundation === f)!.id;
    traceTower(s, T('f_withy')); traceTower(s, T('f_island'));
    startWave(s); s.spawns = [];
    const foe = (lane: 'mill' | 'king', near: string, id: number) => {
      const e: Enemy = { id, type: 'levy', lane, s: nearestOnLane(LANES[lane], NODE[near]).s, hp: 400, maxHp: 400, stun: 0, hit: 0, side: 0, bob: 0, shred: 0, shredT: 0, vulnT: 0 };
      s.enemies.push(e); return e;
    };
    const atWeir = foe('mill', 'f_withy', 901);
    const before = atWeir.s;
    foe('king', 'f_dyke', 950); // far away: keeps the wave going
    s.pulsesLeft = 2;
    pulseTower(s, T('f_withy'));
    pulseTower(s, T('f_island'));
    for (let i = 0; i < 90 && s.pulseResults.length < 2; i++) step(s, 1 / 30);
    expect(atWeir.s).toBeLessThan(before);
    expect(s.hedges.some((h) => h.kind === 'eels')).toBe(true);
    const text = s.pulseResults.map((r) => r.text).join(' | ');
    expect(text).toMatch(/washed back by the surge/);
    expect(text).toMatch(/Eels coiled across/);
  });

  it('the flood slows the levy on its road but the dogs swim through, and it moves each wave', () => {
    const s = newGame('fen');
    const f = s.flood!;
    const mid = (f.s0 + f.s1) / 2;
    const levy: Enemy = { id: 1, type: 'levy', lane: f.lane, s: mid, hp: 400, maxHp: 400, stun: 0, hit: 0, side: 0, bob: 0, shred: 0, shredT: 0, vulnT: 0 };
    const dog: Enemy = { ...levy, id: 2, type: 'hound' };
    traceTower(s, s.towers[0].id); traceTower(s, s.towers[1].id);
    expect(startWave(s)).toBe(true); s.spawns = [];
    s.enemies.push(levy, dog);
    for (let i = 0; i < 5; i++) step(s, 0.1);
    expect(levy.s - mid).toBeCloseTo(BALANCE.enemies.levy.speed * BALANCE.fen.wade * 0.5, 0);
    expect(dog.s - mid).toBeCloseTo(BALANCE.enemies.hound.speed * 0.5, 0);
    expect(floodFor(s, 2)!.lane).not.toBe(f.lane);
    newGame();
  });

  it('a sensible strategy wins all six waves', () => {
    const r = playBot({ level: 'fen', pulse: true, builds: fenBuilds, traces: fenTraces, bind: { wave: 4, foundation: 'f_heronry' } });
    console.log('fen strategy', r.hpByWave.slice(1), r.state.phase, 'gold', r.state.gold, JSON.stringify(r.leaks.slice(1)));
    expect(r.state.phase).toBe('victory');
  });

  it('pulses matter: the same builds without pulses lose', () => {
    const r = playBot({ level: 'fen', pulse: false, builds: fenBuilds, traces: fenTraces });
    console.log('fen, no pulses', r.hpByWave.slice(1), r.state.phase);
    expect(r.state.phase).toBe('defeat');
  });

  it('building matters: pulses alone with no new towers lose', () => {
    const r = playBot({ level: 'fen', pulse: true, traces: fenTraces });
    console.log('fen, no builds', r.hpByWave.slice(1), r.state.phase);
    expect(r.state.phase).toBe('defeat');
  });
});
