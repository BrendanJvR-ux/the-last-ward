import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, rollRare, startWave, step, traceTower, RARE_TYPES, isRare } from '../src/game';
import { BALANCE } from '../src/balance';
import { LANES } from '../src/map';
import { record, entry, recordedCount, resetCasebook } from '../src/casebook';

function seeded(n: number) { let x = n >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }

describe('rare creatures', () => {
  beforeEach(() => resetCasebook());

  it('turn up in some games but not most, the rarest least often', () => {
    const r = seeded(7);
    const counts: Record<string, number> = {};
    let games = 0;
    for (let i = 0; i < 6000; i++) { const v = rollRare(r); if (v) { games++; counts[v.type] = (counts[v.type] ?? 0) + 1; expect(v.wave).toBeGreaterThanOrEqual(2); } }
    expect(games / 6000).toBeGreaterThan(BALANCE.rares.chance - 0.03);
    expect(games / 6000).toBeLessThan(BALANCE.rares.chance + 0.03);
    for (const t of RARE_TYPES) expect(counts[t]).toBeGreaterThan(0);
    expect(counts.hare).toBeLessThan(counts.moth);
  });

  it('plain games (and the balance tests) never roll one', () => {
    expect(newGame('fields').rare).toBeNull();
  });

  it('a rare creature appears in its wave, never harms the castle, and slips away when the wave ends', () => {
    const s = newGame('fields');
    s.rare = { type: 'snail', wave: 1, lane: 'mill', at: 0.5 };
    const T = (f: string) => s.towers.find((t) => t.foundation === f)!.id;
    traceTower(s, T('f_mill')); traceTower(s, T('f_junction'));
    expect(startWave(s)).toBe(true);
    for (let i = 0; i < 30; i++) step(s, 1 / 30);
    expect(s.enemies.some((e) => e.type === 'snail')).toBe(true);
    expect(s.rareLog).toContainEqual({ type: 'snail', event: 'seen', wave: 1 });
    // carry the snail to the gate: the castle is untouched
    const snail = s.enemies.find((e) => e.type === 'snail')!;
    snail.s = LANES.mill.length + 1;
    const hp = s.castleHp;
    step(s, 1 / 30);
    expect(s.castleHp).toBe(hp);
    expect(s.rareLog.some((e) => e.event === 'escaped')).toBe(true);
    expect(s.enemies.some((e) => isRare(e.type))).toBe(false);
  });

  it('the casebook keeps the first sighting and counts', () => {
    expect(recordedCount()).toBe(0);
    record('moth', 'seen', 'courtyard', 3, new Date('2026-11-24T10:00:00Z'));
    record('moth', 'caught', 'courtyard', 3);
    record('moth', 'seen', 'fields', 5, new Date('2026-12-01T10:00:00Z'));
    const e = entry('moth')!;
    expect(e.seen).toBe(2);
    expect(e.caught).toBe(1);
    expect(e.first).toEqual({ date: '2026-11-24T10:00:00.000Z', level: 'courtyard', wave: 3 });
    expect(recordedCount()).toBe(1);
  });
});
