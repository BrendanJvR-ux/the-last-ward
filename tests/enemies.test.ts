import { describe, it, expect } from 'vitest';
import { BALANCE } from '../src/balance';
import { newGame, traceTower, startWave, step, effectiveArmour, waveSpawns, hurt, BRIDGE_S, type GameState } from '../src/game';
import { LANES } from '../src/map';

function begin(wave: number): GameState {
  const s = newGame();
  s.wave = wave;
  if (wave >= 4) { s.pendingGrant = false; s.gold = 999; }
  // enough towers for any wave's traces
  for (const t of s.towers) if (s.traces.length < (wave >= 4 ? 3 : 2)) traceTower(s, t.id);
  if (wave >= 4) {
    s.towers.push({ id: 'x1', foundation: 'f_hollow', type: 'bramble', cd: 0, traced: false, committed: false, flash: 0, bound: false });
    s.towers.push({ id: 'x2', foundation: 'f_fen', type: 'bramble', cd: 0, traced: false, committed: false, flash: 0, bound: false });
  }
  expect(startWave(s)).toBe(true);
  return s;
}
/** Disarm every tower and the castle so we can watch movement alone. */
function disarm(s: GameState) { for (const t of s.towers) t.cd = 1e9; s.castleCd = 1e9; }
function run(s: GameState, seconds: number) { for (let t = 0; t < seconds; t += 1 / 30) { step(s, 1 / 30); disarm(s); } }

describe('new enemies', () => {
  it('wave 1 is Fen Levy only, on the Mill Road, marching in files abreast', () => {
    const sp = waveSpawns(1);
    expect(new Set(sp.map((x) => x.type))).toEqual(new Set(['levy']));
    expect(new Set(sp.map((x) => x.lane))).toEqual(new Set(['mill']));
    const first = sp.filter((x) => x.at === sp[0].at);
    expect(first.length).toBe(3);
    expect(new Set(first.map((x) => x.side)).size).toBe(3);
  });

  it('waves introduce hounds in 2, mix in 3, giant in 5, giant + hounds in 6', () => {
    const types = (w: number) => new Set(waveSpawns(w).map((x) => x.type));
    expect(types(2).has('hound')).toBe(true);
    expect(types(3).has('hound') && types(3).has('levy')).toBe(true);
    expect(types(4).has('cairn')).toBe(false);
    expect(types(5).has('cairn') && types(5).has('bearer')).toBe(true);
    expect(types(5).has('hound')).toBe(false); // a quiet Mill Road
    expect(waveSpawns(5).filter((x) => x.type === 'cairn').every((x) => x.lane === 'mill')).toBe(true);
    expect(types(6).has('cairn') && types(6).has('hound')).toBe(true);
    expect(waveSpawns(6).filter((x) => x.type === 'hound').every((x) => x.lane === 'king')).toBe(true);
  });

  it('hounds sound a warning at the bridge shortly before they arrive', () => {
    const s = begin(2);
    expect(s.warnings.length).toBe(1);
    const w = s.warnings[0];
    const arrive = 20 + BRIDGE_S / BALANCE.enemies.hound.speed;
    expect(w.from).toBeCloseTo(arrive - BALANCE.houndWarning);
    expect(w.from).toBeGreaterThan(20); // after they set out, before the bridge
  });

  it('the giant follows its bearer, kneels where the bearer falls, blocks the road behind, then marches on', () => {
    const s = begin(5);
    run(s, 12);
    const bearer = s.enemies.find((e) => e.type === 'bearer')!;
    const giant = s.enemies.find((e) => e.type === 'cairn')!;
    expect(giant.bearerId).toBe(bearer.id);
    expect(giant.mode).toBe('follow');
    expect(bearer.s - giant.s).toBeGreaterThan(40);
    const fallAt = bearer.s;
    hurt(s, bearer, 9999);
    expect(giant.mode).toBe('seek');
    expect(giant.stone).toEqual({ lane: 'mill', s: fallAt });
    for (let i = 0; i < 30 * 15 && giant.mode !== 'kneel'; i++) run(s, 1 / 30);
    expect(giant.mode).toBe('kneel');
    expect(giant.s).toBeCloseTo(fallAt, 0);
    // Levy that were behind the giant when it knelt are held up behind it.
    const behindIds = new Set(s.enemies.filter((e) => e.type === 'levy' && e.lane === 'mill' && e.s < giant.s).map((e) => e.id));
    run(s, BALANCE.cairn.kneelSeconds - 0.5);
    expect(giant.mode).toBe('kneel');
    const behind = s.enemies.filter((e) => behindIds.has(e.id));
    expect(behind.length).toBeGreaterThan(0);
    for (const e of behind) expect(e.s).toBeLessThan(giant.s);
    expect(Math.max(...behind.map((e) => e.s))).toBeGreaterThan(giant.s - 40); // queued right up against it
    run(s, 0.6);
    // it rises, takes up its stone and marches on: it does not leave the field
    expect(s.enemies.includes(giant)).toBe(true);
    expect(giant.mode).toBe('march');
    const rose = giant.s;
    run(s, 3);
    expect(giant.s).toBeGreaterThan(rose);
    expect(Math.max(...s.enemies.filter((e) => behindIds.has(e.id)).map((e) => e.s))).toBeGreaterThan(fallAt); // released
  });

  it('a bearer that reaches the gate leaves its giant marching on; the giant cannot be knocked back', () => {
    const s = begin(5);
    run(s, 8);
    const bearer = s.enemies.find((e) => e.type === 'bearer')!;
    const giant = s.enemies.find((e) => e.type === 'cairn')!;
    bearer.s = LANES.mill.length + 1;
    run(s, 0.2);
    expect(s.enemies.includes(bearer)).toBe(false);
    expect(giant.mode).toBe('march');
  });

  it('Verdigris hits strip armour, up to the enemy\'s armour, and it grows back', () => {
    const s = begin(5);
    run(s, 8);
    const giant = s.enemies.find((e) => e.type === 'cairn')!;
    const base = BALANCE.enemies.cairn.armour;
    expect(effectiveArmour(giant)).toBe(base);
    giant.shred = base - 1; giant.shredT = 1;
    expect(effectiveArmour(giant)).toBe(1);
    giant.vulnT = 2;
    expect(effectiveArmour(giant)).toBe(0);
    run(s, 2.1);
    expect(effectiveArmour(giant)).toBe(base);
  });
});
