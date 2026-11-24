import { describe, it, expect } from 'vitest';
import { newGame, traceTower, startWave, step, pulseTower, pulsePreview, enemyPos, posOf, type Enemy, type GameState } from '../src/game';
import { BALANCE } from '../src/balance';
import { LANES, nearestOnLane, NODE, dist } from '../src/map';

/** Level 1, wave 1, with Bramble and Ember prepared and the wave under way. */
function wave1(): { s: GameState; bramble: string; ember: string } {
  const s = newGame('fields');
  const id = (f: string) => s.towers.find((t) => t.foundation === f)!.id;
  const bramble = id('f_mill'), ember = id('f_junction');
  traceTower(s, bramble); traceTower(s, ember);
  expect(startWave(s)).toBe(true);
  s.spawns = [];
  return { s, bramble, ember };
}
function foe(s: GameState, lane: 'mill' | 'king', at: number, id: number): Enemy {
  const e: Enemy = { id, type: 'levy', lane, s: at, hp: 500, maxHp: 500, stun: 0, hit: 0, side: 0, bob: 0, shred: 0, shredT: 0, vulnT: 0 };
  s.enemies.push(e);
  return e;
}
const near = (lane: 'mill' | 'king', f: string) => nearestOnLane(LANES[lane], NODE[f]).s;

describe('pulse preview and results', () => {
  it('previewing is free: nothing changes, no charge is spent', () => {
    const { s, bramble, ember } = wave1();
    foe(s, 'mill', near('mill', 'f_junction'), 901);
    const before = JSON.stringify({ p: s.pulsesLeft, e: s.enemies, f: s.flights, t: s.towers, h: s.hedges, fi: s.fires });
    const a = pulsePreview(s, bramble)!, b = pulsePreview(s, ember)!;
    expect(JSON.stringify({ p: s.pulsesLeft, e: s.enemies, f: s.flights, t: s.towers, h: s.hedges, fi: s.fires })).toBe(before);
    expect(a.hedge).toBeDefined();
    expect(b.road!.length).toBeGreaterThan(0);
    expect(b.now).toContain(901);
    expect(b.summary).toMatch(/Firebrand/);
  });

  it('spending the shared pulse takes exactly one charge, for both prepared towers', () => {
    const { s, bramble, ember } = wave1();
    expect(s.pulsesLeft).toBe(1);
    expect(pulseTower(s, ember)).toBe(true);
    expect(s.pulsesLeft).toBe(0);
    expect(pulseTower(s, bramble)).toBe(false);
    expect(pulseTower(s, ember)).toBe(false);
    expect(s.pulsesLeft).toBe(0);
    expect(s.sharedSpend?.others).toEqual([bramble]);
  });

  it('the result says what actually happened', () => {
    const { s, ember } = wave1();
    const at = near('mill', 'f_junction');
    const a = foe(s, 'mill', at, 901), b = foe(s, 'mill', at - 20, 902), c = foe(s, 'mill', at + 25, 903);
    const inRoad = [a, b, c].filter((e) => dist(enemyPos(e), posOf(s.towers.find((t) => t.id === ember)!)) <= BALANCE.pulses.fireRadius + 40).length;
    pulseTower(s, ember);
    for (let i = 0; i < 60 && !s.pulseResults.length; i++) step(s, 1 / 30);
    const r = s.pulseResults.find((x) => x.towerId === ember)!;
    expect(r.text).toBe(`${inRoad} enemies set burning`);
    expect(r.note).toMatch(/Shared pulse spent/);
  });

  it('a pulse that finds no one says so', () => {
    const { s, ember } = wave1();
    foe(s, 'king', 1, 950); // far away, so the wave keeps going
    pulseTower(s, ember);
    for (let i = 0; i < 60 && !s.pulseResults.length; i++) step(s, 1 / 30);
    expect(s.pulseResults[0].text).toBe('No enemies in range');
  });

  it('automatic attacks carry on after the shared pulse is spent', () => {
    const { s, bramble, ember } = wave1();
    foe(s, 'mill', near('mill', 'f_mill'), 901);
    foe(s, 'mill', near('mill', 'f_junction'), 902);
    pulseTower(s, ember);
    for (let i = 0; i < 30; i++) step(s, 1 / 30);
    s.projectiles = [];
    const shots = new Set<string>();
    for (let i = 0; i < 90; i++) { step(s, 1 / 30); for (const p of s.projectiles) shots.add(p.kind); }
    expect(shots.has('bramble')).toBe(true);
    expect(shots.has('ember')).toBe(true);
    expect(s.towers.find((t) => t.id === bramble)!.committed).toBe(false);
  });

  it('a banner pulse describes the buff it gave', () => {
    const s = newGame('courtyard');
    s.towers.push({ id: 'b1', foundation: 'f_armoury', type: 'banner', cd: 0, traced: false, committed: false, flash: 0, bound: true });
    const id = (f: string) => s.towers.find((t) => t.foundation === f)!.id;
    traceTower(s, id('f_herb')); traceTower(s, id('f_stable'));
    startWave(s); s.spawns = [];
    foe(s, 'mill', 1, 950); // keeps the wave going
    pulseTower(s, 'b1');
    for (let i = 0; i < 60 && !s.pulseResults.length; i++) step(s, 1 / 30);
    expect(s.pulseResults[0].text).toMatch(/^\d+ towers shoot twice as fast for 8 s$/);
    expect(s.pulseResults[0].note).toBeUndefined(); // a bound tower's free pulse spends no shared charge
  });
});
