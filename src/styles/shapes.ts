// Shared tower and enemy silhouettes for the art studies.
import type { EnemyType, FieldTowerType as TowerType } from '../balance';

// ── Shared silhouettes ──────────────────────────────────────────────────────

/** Tower outline as a path, base at (x, y), height about 90·s. */
export function towerPath(ctx: CanvasRenderingContext2D, type: TowerType, x: number, y: number, s = 1) {
  ctx.beginPath();
  const P = (dx: number, dy: number) => [x + dx * s, y + dy * s] as const;
  const m = (dx: number, dy: number) => ctx.moveTo(...P(dx, dy));
  const l = (dx: number, dy: number) => ctx.lineTo(...P(dx, dy));
  if (type === 'bramble') { m(-15, 0); l(-13, -46); l(-19, -52); l(-8, -56); l(-5, -70); l(0, -58); l(6, -72); l(9, -56); l(19, -52); l(13, -46); l(15, 0); }
  else if (type === 'ember') { m(-22, 0); ctx.quadraticCurveTo(...P(-30, -26), ...P(-10, -42)); l(-7, -62); l(7, -62); l(10, -42); ctx.quadraticCurveTo(...P(30, -26), ...P(22, 0)); }
  else if (type === 'bell') { m(-11, 0); l(-11, -54); l(-14, -54); l(0, -92); l(14, -54); l(11, -54); l(11, 0); }
  else { m(-8, 0); l(-8, -32); l(-12, -32); l(-12, -36); l(-22, -50); l(22, -50); l(12, -36); l(12, -32); l(8, -32); l(8, 0); }
  ctx.closePath();
}

/** Enemy outline as a path, feet at (x, y). */
export function enemyPath(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  ctx.beginPath();
  if (type === 'levy') {
    ctx.moveTo(-5, 8); ctx.lineTo(-6, -8); ctx.arc(0, -15, 5, Math.PI, 0); ctx.lineTo(6, -8); ctx.lineTo(5, 8); ctx.closePath();
    ctx.rect(5, -12, 7, 17);
  } else if (type === 'bearer') {
    ctx.moveTo(-5, 8); ctx.lineTo(-6, -8); ctx.arc(0, -15, 5, Math.PI, 0); ctx.lineTo(6, -8); ctx.lineTo(5, 8); ctx.closePath();
    ctx.moveTo(-9, -24); ctx.lineTo(-8, -36); ctx.quadraticCurveTo(0, -41, 8, -36); ctx.lineTo(9, -24); ctx.closePath();
  } else if (type === 'hound') {
    ctx.moveTo(-20, -6); ctx.quadraticCurveTo(-26, -12, -28, -8); ctx.quadraticCurveTo(-22, -6, -16, -4);
    ctx.quadraticCurveTo(-4, -11, 10, -7); ctx.lineTo(14, -13); ctx.lineTo(16, -8); ctx.lineTo(25, -6); ctx.lineTo(22, -2); ctx.lineTo(13, 0);
    ctx.lineTo(13, 7); ctx.lineTo(9, 7); ctx.lineTo(8, 1); ctx.lineTo(-10, 1); ctx.lineTo(-11, 7); ctx.lineTo(-15, 7); ctx.lineTo(-15, 0); ctx.closePath();
  } else {
    ctx.moveTo(-18, 10); ctx.lineTo(-20, -10); ctx.lineTo(-34, -20); ctx.lineTo(-30, -52); ctx.lineTo(-16, -60); ctx.lineTo(-8, -74);
    ctx.lineTo(10, -74); ctx.lineTo(16, -60); ctx.lineTo(30, -52); ctx.lineTo(34, -20); ctx.lineTo(20, -10); ctx.lineTo(18, 10); ctx.closePath();
  }
  ctx.restore();
}

