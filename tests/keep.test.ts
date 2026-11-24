import { describe, it, expect } from 'vitest';
import { playBot } from './bot';
import { newGame, step, startWave, traceTower, pulseTower, type Enemy } from '../src/game';
import { BALANCE } from '../src/balance';
import { LANES, NODE, FOUNDATION_IDS, LEVEL, nearestOnLane } from '../src/map';

// Level 3: the keep, with its own four towers.
export const keepBuilds = [
  { foundation: 'f_gallery', type: 'chandelier' as const },
  { foundation: 'f_westledge', type: 'armour' as const },
  { foundation: 'f_eastledge', type: 'books' as const },
  { foundation: 'f_tower', type: 'hearth' as const },
  { foundation: 'f_solar', type: 'armour' as const },
  { foundation: 'f_kitchen', type: 'chandelier' as const },
];
export const keepTraces = {
  1: ['f_armoury', 'f_library'], 2: ['f_armoury', 'f_hall'], 3: ['f_armoury', 'f_hall'],
  4: ['f_armoury', 'f_hall', 'f_library'], 5: ['f_armoury', 'f_hall', 'f_library'], 6: ['f_armoury', 'f_hall', 'f_library'],
};

describe('the keep', () => {
  it('loads its own map and towers, with every foundation clear of the stairs', () => {
    const s = newGame('keep');
    expect(LEVEL).toBe('keep');
    expect(FOUNDATION_IDS).toHaveLength(13);
    expect(s.towers.map((t) => t.type).sort()).toEqual(['armour', 'books', 'hearth']);
    expect(s.towers.find((t) => t.type === 'hearth')!.foundation).toBe('f_hall');
    expect(LANES.mill.name).toBe('Great Stair');
    for (const f of FOUNDATION_IDS) for (const id of ['mill', 'king'] as const) {
      expect(nearestOnLane(LANES[id], NODE[f]).d, `${f} vs ${id}`).toBeGreaterThan(40);
    }
    newGame();
  });

  it('new pulses: shield wall, paper storm, the fall and the back-draught', () => {
    const s = newGame('keep');
    const T = (f: string) => s.towers.find((t) => t.foundation === f)!.id;
    traceTower(s, T('f_armoury')); traceTower(s, T('f_library'));
    startWave(s); s.spawns = [];
    const foe = (lane: 'mill' | 'king', near: string, id: number) => {
      const e: Enemy = { id, type: 'levy', lane, s: nearestOnLane(LANES[lane], NODE[near]).s, hp: 400, maxHp: 400, stun: 0, hit: 0, side: 0, bob: 0, shred: 0, shredT: 0, vulnT: 0 };
      s.enemies.push(e); return e;
    };
    const atLib = foe('mill', 'f_library', 901);
    foe('king', 'f_buttery', 950); // far from both: keeps the wave going
    s.pulsesLeft = 2;
    pulseTower(s, T('f_library'));
    pulseTower(s, T('f_armoury'));
    for (let i = 0; i < 90 && s.pulseResults.length < 2; i++) step(s, 1 / 30);
    expect(atLib.slowT ?? 0).toBeGreaterThan(0);
    expect(s.hedges.some((h) => h.kind === 'shield')).toBe(true);
    expect(s.pulseResults.map((r) => r.text).join(' | ')).toMatch(/blinded and slowed by pages/);
    expect(s.pulseResults.map((r) => r.text).join(' | ')).toMatch(/Shield wall raised/);
  });

  it('a sensible strategy wins all six waves', () => {
    const r = playBot({ level: 'keep', pulse: true, builds: keepBuilds, traces: keepTraces, bind: { wave: 4, foundation: 'f_hall' } });
    console.log('keep strategy', r.hpByWave.slice(1), r.state.phase, 'gold', r.state.gold, JSON.stringify(r.leaks.slice(1)));
    expect(r.state.phase).toBe('victory');
  });

  it('pulses matter: the same builds without pulses lose', () => {
    const r = playBot({ level: 'keep', pulse: false, builds: keepBuilds, traces: keepTraces });
    console.log('keep, no pulses', r.hpByWave.slice(1), r.state.phase);
    expect(r.state.phase).toBe('defeat');
  });

  it('building matters: pulses alone with no new towers lose', () => {
    const r = playBot({ level: 'keep', pulse: true, traces: keepTraces });
    console.log('keep, no builds', r.hpByWave.slice(1), r.state.phase);
    expect(r.state.phase).toBe('defeat');
    void BALANCE;
  });
});
