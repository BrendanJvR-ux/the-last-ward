import { describe, it, expect } from 'vitest';
import { playBot } from './bot';
import { newGame, step, startWave, traceTower, pulseTower, fireRate, type Enemy } from '../src/game';
import { BALANCE } from '../src/balance';
import { LANES, NODE, FOUNDATION_IDS, LEVEL, nearestOnLane } from '../src/map';

// Level 2: the castle courtyard, with its own four towers.
const builds = [
  { foundation: 'f_well', type: 'gargoyle' as const },
  { foundation: 'f_armoury', type: 'banner' as const },
  { foundation: 'f_chapel', type: 'gargoyle' as const },
  { foundation: 'f_training', type: 'fountain' as const },
  { foundation: 'f_stair', type: 'mangonel' as const },
  { foundation: 'f_smithy', type: 'mangonel' as const },
];
const traces = {
  1: ['f_herb', 'f_barracks'], 2: ['f_stable', 'f_barracks'], 3: ['f_stable', 'f_herb'],
  4: ['f_stable', 'f_herb', 'f_chapel'], 5: ['f_herb', 'f_chapel', 'f_stable'], 6: ['f_herb', 'f_chapel', 'f_stable'],
};

describe('the castle courtyard', () => {
  it('loads its own map, towers and waves, and the fields come back afterwards', () => {
    const s = newGame('courtyard');
    expect(LEVEL).toBe('courtyard');
    expect(FOUNDATION_IDS).toHaveLength(13);
    expect(s.towers.map((t) => t.type).sort()).toEqual(['fountain', 'gargoyle', 'mangonel']);
    expect(BALANCE.towerTypes).toEqual(['gargoyle', 'mangonel', 'fountain', 'banner']);
    expect(LANES.mill.name).toBe('Gatehouse Passage');
    // every foundation keeps clear of both roads
    for (const f of FOUNDATION_IDS) for (const id of ['mill', 'king'] as const) {
      const L = LANES[id];
      for (let x = 0; x <= L.length; x += 10) {
        const i = Math.max(1, L.cum.findIndex((c) => c >= x));
        const a = L.pts[i - 1], b = L.pts[i], t = (x - L.cum[i - 1]) / ((L.cum[i] - L.cum[i - 1]) || 1);
        const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        expect(Math.hypot(q.x - NODE[f].x, q.y - NODE[f].y)).toBeGreaterThan(40);
      }
    }
    newGame();
    expect(LEVEL).toBe('fields');
    expect(BALANCE.towerTypes).toContain('bramble');
  });

  it('new towers work: fountain slows, banner quickens, gargoyle petrifies, mangonel lands boulders', () => {
    const s = newGame('courtyard');
    const T = (f: string) => s.towers.find((t) => t.foundation === f)!;
    traceTower(s, T('f_barracks').id);
    traceTower(s, T('f_herb').id);
    expect(startWave(s)).toBe(true);
    s.spawns = [];
    const foe = (lane: 'mill' | 'king', near: string, id: number) => {
      const n = nearestOnLane(LANES[lane], NODE[near]);
      const e: Enemy = { id, type: 'levy', lane, s: n.s, hp: 400, maxHp: 400, stun: 0, hit: 0, side: 0, bob: 0, shred: 0, shredT: 0, vulnT: 0 };
      s.enemies.push(e);
      return e;
    };
    const atStable = foe('king', 'f_stable', 901);
    const atBarracks = foe('king', 'f_barracks', 902);
    const atHerb = [foe('mill', 'f_herb', 903), foe('mill', 'f_herb', 904), foe('mill', 'f_herb', 905)];
    // the fountain's ink stains and slows
    for (let i = 0; i < 60 && !(atStable.slowT ?? 0); i++) step(s, 1 / 30);
    expect(atStable.slowT ?? 0).toBeGreaterThan(0);
    // a banner beside the barracks quickens its gargoyle
    expect(fireRate(s, T('f_barracks'))).toBe(1);
    s.towers.push({ id: 'b1', foundation: 'f_armoury', type: 'banner', cd: 0, traced: false, committed: false, flash: 0, bound: false });
    expect(fireRate(s, T('f_barracks'))).toBeCloseTo(1 + BALANCE.pulses.bannerAura);
    // Stone Gaze petrifies, Boulder Barrage throws a volley
    expect(pulseTower(s, T('f_barracks').id)).toBe(true);
    for (let i = 0; i < 60 && s.flights.length; i++) step(s, 1 / 30);
    expect(atBarracks.petrifyT ?? 0).toBeGreaterThan(0);
    expect(atBarracks.stun).toBeGreaterThan(0);
    s.pulsesLeft = 1;
    for (const e of atHerb) e.s = nearestOnLane(LANES.mill, NODE.f_herb).s;
    expect(pulseTower(s, T('f_herb').id)).toBe(true);
    let volley = 0;
    for (let i = 0; i < 90; i++) { step(s, 1 / 30); volley = Math.max(volley, s.projectiles.filter((p) => p.kind === 'mangonel' && p.arc === 110).length); }
    expect(volley).toBe(BALANCE.pulses.barrageCount);
  });

  it('a sensible strategy wins all six waves', () => {
    const r = playBot({ level: 'courtyard', pulse: true, builds, traces, bind: { wave: 4, foundation: 'f_barracks' } });
    console.log('courtyard strategy', r.hpByWave.slice(1), r.state.phase, 'gold', r.state.gold, JSON.stringify(r.leaks.slice(1)));
    expect(r.state.phase).toBe('victory');
  });

  it('pulses matter: the same builds without pulses lose', () => {
    const r = playBot({ level: 'courtyard', pulse: false, builds, traces });
    console.log('courtyard, no pulses', r.hpByWave.slice(1), r.state.phase);
    expect(r.state.phase).toBe('defeat');
  });

  it('building matters: pulses alone with no new towers lose', () => {
    const r = playBot({ level: 'courtyard', pulse: true, traces });
    console.log('courtyard, no builds', r.hpByWave.slice(1), r.state.phase);
    expect(r.state.phase).toBe('defeat');
  });
});
