// Ink sprites: towers and enemies drawn with a fine liner on cream paper (see ink.ts).
import type { EnemyType, TowerType } from './balance';
import { towerInk, enemyInk, inkFoundation, nameStone, sepia } from './ink';

/** Accent colours used by the live renderer, chosen to sit on cream paper beside black ink. */
export const P = {
  ink: '#1d1915',
  umber: '#3b2a18',
  shadow: 'rgba(60,46,34,0.35)',
  stone: '#d9d1c0',
  stoneDark: '#8a8070',
  stoneLight: '#f4eee2',
  leaf: '#efe9da',
  leafDark: '#1d1915',
  leafLight: '#f8f4ea',
  cream: '#efe9da',
  gold: '#c39634',
  goldLight: '#e8c766',
  copper: '#a8683a',
  verdigris: '#3c7a64',
  verdigrisLight: '#8fc8b0',
  oxblood: '#7a2826',
};

export function litGrad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, light: string, mid: string, dark: string) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, light); g.addColorStop(0.5, mid); g.addColorStop(1, dark);
  return g;
}

/** A soft pool of grey-sepia wash beneath something. */
export function softShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha = 0.45) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, sepia(alpha * 0.7)); g.addColorStop(1, sepia(0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

// ── Towers ──────────────────────────────────────────────────────────────────

export function drawTowerIcon(ctx: CanvasRenderingContext2D, type: TowerType, x: number, y: number, k: number, time = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  inkFoundation(ctx, 0, 0);
  towerInk(ctx, type, 0, 0, null, time);
  ctx.restore();
}

// ── Enemies ─────────────────────────────────────────────────────────────────

export interface EnemyLook { kneel?: boolean; alpha?: number; marked?: boolean }

/** How large each kind is drawn on the battlefield. */
/** How large towers are drawn on the battlefield (icons in the margin are sized separately). */
export const TOWER_SCALE = 1.4;

export const ENEMY_SCALE: Record<EnemyType, number> = { levy: 1.6, bearer: 1.5, hound: 1.6, cairn: 1.3 };

/** The Cairn-Born is drawn a little smaller than its study so it fits the road. */
const SIZE: Record<EnemyType, number> = { levy: 1, bearer: 1, hound: 1, cairn: 0.78 };

export function drawEnemy(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number, bob: number, hit: number, k = 1, look: EnemyLook = {}) {
  ctx.save();
  ctx.globalAlpha = look.alpha ?? 1;
  ctx.translate(x, y + Math.sin(bob) * 0.8);
  ctx.scale(k * SIZE[type], k * SIZE[type]);
  enemyInk(ctx, type, 0, 0, dir, bob * 2, !!look.kneel);
  if (hit > 0) {
    // a spatter of ink where the blow lands
    const a = Math.min(1, hit * 6), cy = type === 'cairn' ? -50 : type === 'hound' ? -14 : -20;
    ctx.fillStyle = `rgba(29,25,21,${0.8 * a})`;
    for (let i = 0; i < 7; i++) {
      const ang = i * 2.4 + hit * 20, d = 4 + (i % 3) * 4 + (1 - a) * 6;
      ctx.beginPath(); ctx.arc(Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.8, 1 + (i % 2), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** The fallen name-stone lying on the road. */
export function drawNameStone(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  nameStone(ctx, x, y, time);
}

export function enemyIconCanvas(type: EnemyType, size = 44): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = size * dpr; cv.height = size * dpr; cv.style.width = cv.style.height = `${size}px`;
  const ctx = cv.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const k = type === 'cairn' ? size / 118 : type === 'hound' ? size / 44 : type === 'bearer' ? size / 58 : size / 44;
  const x = type === 'cairn' ? size * 0.4 : size / 2;
  drawEnemy(ctx, type, x, size - 4, 1, 0, 0, k);
  return cv;
}

export function towerIconCanvas(type: TowerType, size = 48): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = size * dpr; cv.height = size * dpr; cv.style.width = cv.style.height = `${size}px`;
  const ctx = cv.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const k = size / (type === 'bell' ? 128 : 112);
  drawTowerIcon(ctx, type, size / 2, size - 14 * k, k);
  return cv;
}
