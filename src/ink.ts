// Pen-and-ink surrealism: cream paper, dense hatching, wood-grain whorls and a grey-sepia wash.
// Creatures are hybrids: root-walking fynbos spirits, shoals of striped air-fish,
// a goggled wanderer carrying the name-stone, and a walking citadel-fish with a human face.
// Used by the game (paint, sprites, render) and by the art-style gallery.
import type { EnemyType, TowerType } from './balance';
import { MAP_W, MAP_H, type Vec } from './map';
import type { Style } from './styles/scene';

type C = CanvasRenderingContext2D;
type R = () => number;

export function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

export const INK = '#3a2212';
export const INK2 = 'rgba(58,34,18,0.5)';
export const PAPER = '#e4d3b6';
export const GOLD = '#c39634';
export const sepia = (a: number) => `rgba(92,58,30,${a})`;
export const seed = (x: number, y: number, k = 0) => rng(((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663) ^ (k * 83492791)) >>> 0);

// ── Pen helpers ─────────────────────────────────────────────────────────────

/** Parallel hatching inside a path. */
export function hatch(ctx: C, path: () => void, box: [number, number, number, number], angle: number, gap: number, lw = 0.7, color = INK, R?: R) {
  ctx.save(); path(); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
  const [bx, by, bw, bh] = box;
  const cx = bx + bw / 2, cy = by + bh / 2, L = Math.hypot(bw, bh) / 2 + 2;
  const c = Math.cos(angle), s = Math.sin(angle);
  for (let d = -L; d <= L; d += gap) {
    const e = d + (R ? (R() - 0.5) * gap * 0.5 : 0);
    ctx.moveTo(cx - c * L - s * e, cy - s * L + c * e);
    ctx.lineTo(cx + c * L - s * e, cy + s * L + c * e);
  }
  ctx.stroke(); ctx.restore();
}

/** A knot in the wood: wobbly concentric ellipses. */
export function whorl(ctx: C, x: number, y: number, r: number, R: R, lw = 0.6) {
  ctx.strokeStyle = INK; ctx.lineWidth = lw;
  const n = 2 + Math.floor(R() * 3);
  for (let i = 1; i <= n; i++) {
    const rr = (r * i) / n;
    ctx.beginPath(); ctx.ellipse(x + (R() - 0.5) * r * 0.2, y, rr * 0.7, rr, (R() - 0.5) * 0.4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x, y, r * 0.18, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
}

export interface Seg { x1: number; y1: number; x2: number; y2: number; w: number }

/** Grow a gnarled limb as segments. Angle -PI/2 is straight up. */
export function grow(segs: Seg[], R: R, x: number, y: number, a: number, len: number, w: number, depth: number, bend = 0.5) {
  const n = 3;
  let cx = x, cy = y, ca = a;
  for (let i = 0; i < n; i++) {
    ca += (R() - 0.5) * bend;
    const l = len / n, nx = cx + Math.cos(ca) * l, ny = cy + Math.sin(ca) * l;
    segs.push({ x1: cx, y1: cy, x2: nx, y2: ny, w: w * (1 - 0.28 * (i + 1) / n) });
    cx = nx; cy = ny;
  }
  if (depth === 0) {
    // fine twigs so limbs taper to nothing instead of ending blunt
    for (let j = 0; j < 3; j++) {
      const ta = ca + (j - 1) * 0.6 + (R() - 0.5) * 0.4, tl = len * (0.35 + R() * 0.3);
      const mx = cx + Math.cos(ta) * tl * 0.5, my = cy + Math.sin(ta) * tl * 0.5, tb = ta + (R() - 0.5) * 0.8;
      segs.push({ x1: cx, y1: cy, x2: mx, y2: my, w: 1.2 }, { x1: mx, y1: my, x2: mx + Math.cos(tb) * tl * 0.5, y2: my + Math.sin(tb) * tl * 0.5, w: 0.7 });
    }
  }
  if (depth > 0) {
    const k = 2 + (R() < 0.4 ? 1 : 0);
    for (let j = 0; j < k; j++) grow(segs, R, cx, cy, ca + (j - (k - 1) / 2) * 0.75 + (R() - 0.5) * 0.35, len * 0.66, w * 0.6, depth - 1, bend);
  }
}

/** Ink limbs as one merged outlined silhouette, with grain and shade inside. */
export function limbs(ctx: C, segs: Seg[], R: R, shade = true) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const seg = (s: Seg) => { ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); };
  ctx.strokeStyle = INK; for (const s of segs) { ctx.lineWidth = s.w > 2 ? s.w + 1.6 : Math.max(0.5, s.w * 0.8); seg(s); }
  ctx.strokeStyle = PAPER; for (const s of segs) if (s.w > 2) { ctx.lineWidth = s.w; seg(s); }
  const knots: [number, number, number][] = [];
  for (const s of segs) {
    if (s.w <= 3) continue;
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    if (shade) {
      // cross-strokes on the shadow side
      ctx.strokeStyle = INK2; ctx.lineWidth = 0.4;
      const sgn = nx > 0 ? 1 : -1;
      ctx.beginPath();
      for (let t = 0; t < 1; t += 1.6 / L) {
        const px = s.x1 + dx * t, py = s.y1 + dy * t;
        ctx.moveTo(px + nx * sgn * s.w * 0.1, py + ny * sgn * s.w * 0.1); ctx.lineTo(px + nx * sgn * s.w * 0.5, py + ny * sgn * s.w * 0.5 - 0.8);
      }
      ctx.stroke();
    }
    // flowing grain, dense like fine-liner bark
    ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
    const lines = Math.max(2, Math.floor(s.w / 1.7));
    ctx.beginPath();
    for (let k = 0; k < lines; k++) {
      const o = ((k + 0.5) / lines - 0.5) * s.w * 0.92, wob = (R() - 0.5) * s.w * 0.35;
      ctx.moveTo(s.x1 + nx * o, s.y1 + ny * o);
      ctx.bezierCurveTo(s.x1 + dx * 0.33 + nx * (o + wob), s.y1 + dy * 0.33 + ny * (o + wob), s.x1 + dx * 0.66 + nx * (o - wob), s.y1 + dy * 0.66 + ny * (o - wob), s.x2 + nx * o, s.y2 + ny * o);
    }
    ctx.stroke();
    if (s.w > 7 && R() < 0.45) knots.push([s.x1 + dx * 0.5 + nx * (R() - 0.5) * s.w * 0.4, s.y1 + dy * 0.5 + ny * (R() - 0.5) * s.w * 0.4, s.w * 0.22]);
  }
  for (const [kx, ky, kr] of knots) { ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(kx, ky, kr * 0.8, kr * 1.1, 0, 0, Math.PI * 2); ctx.fill(); whorl(ctx, kx, ky, kr, R, 0.45); }
}

export function eye(ctx: C, x: number, y: number, r: number, look = 0.25, shut = false) {
  if (shut) {
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.7, r * 0.18);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI); ctx.stroke();
    return;
  }
  ctx.fillStyle = '#f3e9d6'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.6, r * 0.12);
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const ix = x + r * look, ir = r * 0.58;
  ctx.lineWidth = Math.max(0.4, r * 0.05);
  ctx.beginPath();
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; ctx.moveTo(ix + Math.cos(a) * ir * 0.45, y + Math.sin(a) * ir * 0.45); ctx.lineTo(ix + Math.cos(a) * ir, y + Math.sin(a) * ir); }
  ctx.stroke();
  ctx.beginPath(); ctx.arc(ix, y, ir, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ix, y, ir * 0.48, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ix - ir * 0.28, y - ir * 0.3, ir * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.7, r * 0.16);
  ctx.beginPath(); ctx.ellipse(x, y, r * 1.05, r * 0.85, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
}

/** A striped angelfish, centred at (x, y), facing +x before `dir`. `flap` sways the fins. */
export function airFish(ctx: C, x: number, y: number, s: number, dir: number, flap = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  const body = () => { ctx.beginPath(); ctx.moveTo(11, 0); ctx.quadraticCurveTo(4, -10, -6, -8); ctx.quadraticCurveTo(-11, -2, -10, 0); ctx.quadraticCurveTo(-11, 2, -6, 8); ctx.quadraticCurveTo(4, 10, 11, 0); ctx.closePath(); };
  const f = Math.sin(flap) * 2.5;
  // fins and trailing filament
  ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.fillStyle = PAPER;
  ctx.beginPath(); ctx.moveTo(-2, -8); ctx.quadraticCurveTo(-10, -16 + f, -22, -19 + f * 1.6); ctx.quadraticCurveTo(-12, -11, -7, -6); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2, 8); ctx.quadraticCurveTo(-9, 14 - f, -15, 15 - f); ctx.quadraticCurveTo(-10, 9, -7, 6); ctx.fill(); ctx.stroke();
  const tail = () => { ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-16, -6 + f * 0.6); ctx.quadraticCurveTo(-14, 0, -16, 6 + f * 0.6); ctx.closePath(); };
  tail(); ctx.fill(); ctx.stroke();
  hatch(ctx, tail, [-17, -8, 9, 16], 0, 1.4, 0.4);
  ctx.fillStyle = PAPER; body(); ctx.fill();
  // three dark bands
  ctx.save(); body(); ctx.clip(); ctx.fillStyle = INK;
  for (const bx of [5, -1.5, -7.5]) { ctx.beginPath(); ctx.moveTo(bx - 1.6, -12); ctx.quadraticCurveTo(bx - 3.2, 0, bx - 1.6, 12); ctx.lineTo(bx + 1.6, 12); ctx.quadraticCurveTo(bx, 0, bx + 1.6, -12); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  hatch(ctx, body, [-11, -10, 22, 20], 0.9, 1.6, 0.35);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.9; body(); ctx.stroke();
  ctx.fillStyle = '#f3e9d6'; ctx.beginPath(); ctx.arc(7.2, -1.5, 1.9, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(7.6, -1.5, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function proteaHead(ctx: C, x: number, y: number, s: number, R: R) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.35;
  // fuzzy dome
  ctx.beginPath();
  for (let i = 0; i < 15; i++) { const a = -Math.PI + (i / 14) * Math.PI; ctx.moveTo(Math.cos(a) * 2, -3 + Math.sin(a) * 2); ctx.lineTo(Math.cos(a) * 6 + (R() - 0.5), -4 + Math.sin(a) * 7); }
  ctx.stroke();
  // bracts
  ctx.fillStyle = PAPER; ctx.lineWidth = 0.7;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.38, L = 7 + (3 - Math.abs(i - 3)) * 0.8;
    ctx.beginPath(); ctx.moveTo(Math.cos(a + 0.5) * 2, 2); ctx.quadraticCurveTo(Math.cos(a) * L * 0.7 - 1, Math.sin(a) * L * 0.4 + 2, Math.cos(a) * L, Math.sin(a) * L * 0.55 + 0.5);
    ctx.quadraticCurveTo(Math.cos(a) * L * 0.7 + 1, Math.sin(a) * L * 0.4 + 3, Math.cos(a - 0.5) * 2, 3); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

export function groundWash(ctx: C, x: number, y: number, rx: number, ry: number, a = 0.22) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, sepia(a)); g.addColorStop(1, sepia(0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

// ── Towers ──────────────────────────────────────────────────────────────────

/** The study's marks (the game draws its own ink drop and gold seal). */
export function mark(ctx: C, x: number, y: number, m: 'traced' | 'bound' | null) {
  if (m === 'traced') {
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.quadraticCurveTo(x + 8, y - 3, x, y + 1); ctx.quadraticCurveTo(x - 8, y - 3, x, y - 16); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x - 2, y - 5, 1.2, 2.2, -0.4, 0, Math.PI * 2); ctx.fill();
  } else if (m === 'bound') {
    ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y - 7, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(x, y - 7, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 2.5, y - 7); ctx.lineTo(x + 2.5, y - 7); ctx.moveTo(x, y - 9.5); ctx.lineTo(x, y - 4.5); ctx.stroke();
  }
}

/** A tower standing on its foundation at (x, y). `time` animates smoke, eyes and filaments. */
export function towerInk(ctx: C, type: TowerType, x: number, y: number, m: 'traced' | 'bound' | null = null, time = 0) {
  const R = seed(x, y, 7);
  groundWash(ctx, x + 6, y + 2, 40, 12, 0.3);
  if (type === 'bramble') {
    // gnarled trunk tower with a knothole watcher and a thorny crown
    const segs: Seg[] = [];
    for (const a of [-0.25, 0.3, Math.PI + 0.25, Math.PI - 0.3]) grow(segs, R, x + Math.cos(a) * 6, y - 2, a, 16, 7, 0, 0.6);
    segs.push({ x1: x, y1: y, x2: x - 3, y2: y - 30, w: 26 }, { x1: x - 3, y1: y - 30, x2: x + 2, y2: y - 58, w: 20 });
    grow(segs, R, x + 2, y - 58, -Math.PI / 2 - 0.6, 26, 7, 1, 0.7);
    grow(segs, R, x + 2, y - 58, -Math.PI / 2 + 0.55, 28, 7, 1, 0.7);
    grow(segs, R, x + 2, y - 58, -Math.PI / 2, 22, 6, 1, 0.5);
    limbs(ctx, segs, R);
    // thorns on the crown
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.beginPath();
    for (const s of segs) if (s.w < 5 && s.w > 1 && s.y2 < y - 60) for (let t = 0.3; t < 1; t += 0.35) { const px = s.x1 + (s.x2 - s.x1) * t, py = s.y1 + (s.y2 - s.y1) * t; ctx.moveTo(px, py); ctx.lineTo(px + (R() - 0.5) * 6, py - 3); }
    ctx.stroke();
    whorl(ctx, x + 5, y - 14, 4, R); whorl(ctx, x - 6, y - 48, 3, R);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x - 2, y - 33, 5.5, 8, 0.1, 0, Math.PI * 2); ctx.fill();
    eye(ctx, x - 1.5, y - 33, 3.2, 0.3 * Math.sin(time * 0.6), time % 4.7 < 0.14);
    mark(ctx, x + 2, y - 96, m);
  } else if (type === 'ember') {
    // a hollow stump kiln breathing smoke curls
    const shape = () => { ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.quadraticCurveTo(x - 32, y - 26, x - 13, y - 42); ctx.lineTo(x - 10, y - 58); ctx.lineTo(x + 10, y - 58); ctx.lineTo(x + 13, y - 42); ctx.quadraticCurveTo(x + 32, y - 26, x + 24, y); ctx.closePath(); };
    ctx.fillStyle = PAPER; shape(); ctx.fill();
    ctx.save(); shape(); ctx.clip();
    ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath();
    for (let i = -6; i <= 6; i++) { ctx.moveTo(x + i * 4, y); ctx.bezierCurveTo(x + i * 4.5 + (R() - 0.5) * 8, y - 20, x + i * 2 + (R() - 0.5) * 6, y - 40, x + i * 1.6, y - 60); }
    ctx.stroke();
    ctx.fillStyle = sepia(0.3); ctx.fillRect(x + 8, y - 60, 30, 60);
    ctx.restore();
    hatch(ctx, shape, [x - 32, y - 60, 64, 60], -1.1, 2.2, 0.5, INK, R);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 40, y - 70, 40, 75); ctx.clip(); ctx.fillStyle = PAPER; ctx.globalAlpha = 0.55; shape(); ctx.fill(); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; shape(); ctx.stroke();
    whorl(ctx, x - 12, y - 26, 4, R);
    // rim
    ctx.fillStyle = PAPER; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y - 58, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (let i = 1; i <= 2; i++) { ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(x, y - 58, 10 - i * 3, 3.5 - i, 0, 0, Math.PI * 2); ctx.stroke(); }
    // glowing mouth
    const mouth = () => { ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x - 9, y - 12); ctx.quadraticCurveTo(x, y - 24, x + 9, y - 12); ctx.lineTo(x + 9, y); ctx.closePath(); };
    ctx.fillStyle = '#c8763a'; mouth(); ctx.fill();
    ctx.fillStyle = `rgba(240,190,90,${0.7 + 0.25 * Math.sin(time * 7)})`; ctx.beginPath(); ctx.ellipse(x, y - 4, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    hatch(ctx, mouth, [x - 9, y - 24, 18, 24], 0.6, 2, 0.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; mouth(); ctx.stroke();
    // smoke spirals, rising and fading
    ctx.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) {
      const ph = ((time * 0.35 + k / 3) % 1);
      const sx = x - 4 + Math.sin(ph * 5 + k) * 3, sy = y - 62 - ph * 40;
      ctx.strokeStyle = `rgba(58,34,18,${0.9 * (1 - ph)})`;
      ctx.beginPath();
      for (let t = 0; t < 9; t += 0.2) { const r = 1 + t * 0.9, px = sx + Math.cos(t) * r * 0.7 + t * 0.6, py = sy - t * 1.6 + Math.sin(t) * r * 0.5; t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
    mark(ctx, x, y - 104, m);
  } else if (type === 'bell') {
    // a striped spire with a crescent finial and a bell hung from a crooked arm
    const body = () => { ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x - 9, y - 58); ctx.lineTo(x + 9, y - 58); ctx.lineTo(x + 11, y); ctx.closePath(); };
    ctx.fillStyle = PAPER; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = sepia(0.45);
    for (let i = 1; i < 8; i += 2) { ctx.beginPath(); ctx.moveTo(x - 14, y - i * 8); ctx.lineTo(x + 14, y - i * 8 - 5); ctx.lineTo(x + 14, y - i * 8 - 9); ctx.lineTo(x - 14, y - i * 8 - 4); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    hatch(ctx, () => { ctx.beginPath(); ctx.rect(x + 3, y - 60, 10, 62); }, [x + 3, y - 60, 10, 62], -0.3, 1.8, 0.5);
    ctx.save(); body(); ctx.clip(); ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath();
    for (let i = 0; i < 8; i++) { ctx.moveTo(x - 14, y - i * 8); ctx.lineTo(x + 14, y - i * 8 - 5); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; body(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 2.5, y - 30); ctx.lineTo(x - 2.5, y - 38); ctx.arc(x, y - 38, 2.5, Math.PI, 0); ctx.lineTo(x + 2.5, y - 30); ctx.fill();
    // conical roof
    const roof = () => { ctx.beginPath(); ctx.moveTo(x - 14, y - 57); ctx.quadraticCurveTo(x - 4, y - 70, x, y - 90); ctx.quadraticCurveTo(x + 4, y - 70, x + 14, y - 57); ctx.closePath(); };
    ctx.fillStyle = PAPER; roof(); ctx.fill();
    ctx.save(); roof(); ctx.clip(); ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let i = -14; i <= 14; i += 2) { ctx.moveTo(x, y - 90); ctx.lineTo(x + i, y - 56); }
    ctx.stroke();
    ctx.fillStyle = sepia(0.35); ctx.fillRect(x + 2, y - 92, 14, 40); ctx.restore();
    ctx.lineWidth = 1.3; roof(); ctx.stroke();
    // finial: rod, ring and crescent
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 90); ctx.lineTo(x, y - 106); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y - 97, 4, 1.4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y - 110, 4.5, 0.4, Math.PI * 2 - 0.4); ctx.arc(x + 1.8, y - 111, 3.6, Math.PI * 2 - 0.4, 0.4, true); ctx.fill();
    // crooked arm and a gently swinging bell
    limbs(ctx, [{ x1: x + 8, y1: y - 48, x2: x + 18, y2: y - 52, w: 3.5 }, { x1: x + 18, y1: y - 52, x2: x + 25, y2: y - 49, w: 2.6 }], R, false);
    ctx.save(); ctx.translate(x + 24, y - 49); ctx.rotate(Math.sin(time * 1.6) * 0.12);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 5); ctx.stroke();
    const bell = () => { ctx.beginPath(); ctx.moveTo(-4, 15); ctx.quadraticCurveTo(-4, 5, 0, 5); ctx.quadraticCurveTo(4, 5, 4, 15); ctx.lineTo(6, 17); ctx.lineTo(-6, 17); ctx.closePath(); };
    ctx.fillStyle = PAPER; bell(); ctx.fill(); hatch(ctx, bell, [-6, 4, 12, 13], -0.4, 1.3, 0.5); ctx.lineWidth = 1; bell(); ctx.stroke();
    ctx.restore();
    mark(ctx, x, y - 120, m);
  } else if (type === 'gargoyle') {
    courtGargoyle(ctx, x, y, time, R);
    mark(ctx, x, y - 120, m);
  } else if (type === 'mangonel') {
    courtMangonel(ctx, x, y, time, R);
    mark(ctx, x, y - 112, m);
  } else if (type === 'fountain') {
    courtFountain(ctx, x, y, time);
    mark(ctx, x, y - 92, m);
  } else if (type === 'banner') {
    courtBanner(ctx, x, y, time, R);
    mark(ctx, x, y - 128, m);
  } else if (type === 'armour') {
    keepArmour(ctx, x, y, time, R);
    mark(ctx, x, y - 118, m);
  } else if (type === 'books') {
    keepBooks(ctx, x, y, time, R);
    mark(ctx, x, y - 118, m);
  } else if (type === 'chandelier') {
    keepChandelier(ctx, x, y, time, R);
    mark(ctx, x, y - 120, m);
  } else if (type === 'hearth') {
    keepHearth(ctx, x, y, time, R);
    mark(ctx, x, y - 112, m);
  } else {
    // the eye-flower: a crooked stalk carrying a great watching eye in a crown of filaments
    ctx.lineCap = 'round';
    const stalk = (w: number, col: string) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 14, y - 18, x - 16, y - 34, x - 2, y - 52); ctx.stroke(); };
    stalk(8, INK); stalk(5.6, PAPER);
    ctx.lineWidth = 0.5; ctx.strokeStyle = INK2;
    for (let i = 0; i < 6; i++) { const t = i / 6; ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 5) * 6, y - t * 50, 2.6, 0.8, 0, 0, Math.PI * 2); ctx.stroke(); }
    // curling leaf ribbons
    ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.fillStyle = PAPER;
    ctx.beginPath(); ctx.moveTo(x + 4, y - 16); ctx.bezierCurveTo(x + 24, y - 26, x + 22, y - 6, x + 12, y - 8); ctx.bezierCurveTo(x + 18, y - 14, x + 12, y - 18, x + 4, y - 13); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 3, y - 30); ctx.bezierCurveTo(x - 22, y - 36, x - 22, y - 20, x - 14, y - 20); ctx.bezierCurveTo(x - 18, y - 26, x - 12, y - 30, x - 3, y - 27); ctx.fill(); ctx.stroke();
    // filaments, swaying
    const ex = x - 2, ey = y - 66;
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + Math.sin(time * 1.4 + i * 0.5) * 0.06, L = 14 + R() * 9;
      ctx.strokeStyle = i % 3 ? INK : 'rgba(84,104,70,0.9)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * 9, ey + Math.sin(a) * 8);
      ctx.quadraticCurveTo(ex + Math.cos(a + 0.25) * L * 0.8, ey + Math.sin(a + 0.25) * L * 0.75, ex + Math.cos(a) * L, ey + Math.sin(a) * L * 0.9); ctx.stroke();
      if (i % 5 === 0) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ex + Math.cos(a) * L, ey + Math.sin(a) * L * 0.9, 1.1, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.fillStyle = 'rgba(96,110,76,0.18)'; ctx.beginPath(); ctx.ellipse(ex, ey, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(ex, ey, 11, 9.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    eye(ctx, ex, ey, 8, 0.35 * Math.sin(time * 0.8), time % 6.1 < 0.14);
    mark(ctx, ex, ey - 30, m);
  }
}

// ── Enemies ─────────────────────────────────────────────────────────────────

const ENEMY_SEED: Record<EnemyType, number> = { levy: 1, hound: 2, bearer: 3, cairn: 4, moth: 5, heron: 6, tortoise: 7, snail: 8, hare: 9 };

/** An enemy with its feet at (x, y). `bob` is its walk phase; the Cairn-Born can kneel. */
export function enemyInk(ctx: C, type: EnemyType, x: number, y: number, dir: number, bob = 0, kneel = false) {
  // a fixed seed per kind, so lines don't boil as the figure moves
  const R = seed(0, 0, ENEMY_SEED[type]);
  if (type === 'hound') {
    warDog(ctx, x, y, dir, bob);
    return;
  }
  if (type === 'moth' || type === 'heron' || type === 'tortoise' || type === 'snail' || type === 'hare') {
    rareInk(ctx, type, x, y, dir, bob);
    return;
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  if (type === 'levy') {
    // a fynbos root-walker: protea-bud head, one eye, a body of tangled roots
    groundWash(ctx, 0, 1, 11, 3, 0.35);
    const segs: Seg[] = [];
    ([[-5, -0.5], [-1, 0.3], [3, -0.2], [6, 0.5]] as [number, number][]).forEach(([lx, bend], i) => {
      const sw = Math.sin(bob + i * 1.7) * 2;
      const kx = lx * 0.6 + bend * 4 + sw * 0.5;
      segs.push({ x1: lx * 0.3, y1: -14, x2: kx, y2: -7, w: 2.4 }, { x1: kx, y1: -7, x2: lx + sw + (R() - 0.5) * 2, y2: 0, w: 1.8 });
    });
    segs.push({ x1: 0, y1: -13, x2: 1, y2: -20, w: 7 }, { x1: 1, y1: -20, x2: 3, y2: -25, w: 5 });
    limbs(ctx, segs, R, false);
    // leaves off the back
    for (const [ly, la] of [[-17, 0], [-21, -0.5]] as [number, number][]) {
      ctx.save(); ctx.translate(-1, ly); ctx.rotate(la + Math.sin(bob * 0.5) * 0.1);
      ctx.strokeStyle = INK; ctx.fillStyle = PAPER; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-7, -5, -12, 0); ctx.quadraticCurveTo(-6, 3, 0, 0); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11, 0); for (let v = -2; v > -10; v -= 2) { ctx.moveTo(v, 0); ctx.lineTo(v - 2, -2); ctx.moveTo(v, 0); ctx.lineTo(v - 2, 1.6); } ctx.stroke();
      ctx.restore();
    }
    proteaHead(ctx, 3, -29, 1.35, R);
    eye(ctx, 5.5, -28.5, 2.3, 0.35);
  } else if (type === 'bearer') {
    // the goggled wanderer: patterned coat, coiled scarf, spiky crest, holding the name-stone
    groundWash(ctx, 0, 1, 12, 3.5, 0.35);
    const st = Math.sin(bob) * 1.6;
    ctx.fillStyle = INK; ctx.fillRect(-4 + st, -8, 3, 8); ctx.fillRect(1 - st, -8, 3, 8);
    const coat = () => { ctx.beginPath(); ctx.moveTo(-8, -6); ctx.quadraticCurveTo(-9, -18, -5, -26); ctx.lineTo(5, -26); ctx.quadraticCurveTo(9, -18, 8, -6); ctx.closePath(); };
    ctx.fillStyle = PAPER; coat(); ctx.fill();
    ctx.save(); coat(); ctx.clip();
    ctx.fillStyle = INK; ctx.fillRect(-10, -12, 20, 3.5);
    ctx.fillStyle = PAPER; for (let i = -9; i < 10; i += 3) { ctx.beginPath(); ctx.arc(i, -10.2, 0.7, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.beginPath(); for (let i = -10; i < 10; i += 2) { ctx.lineTo(i, -15); ctx.lineTo(i + 1, -17); } ctx.stroke();
    ctx.fillStyle = INK; ctx.fillRect(1, -26, 7, 14);
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(4.5, -21, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(4.5, -16, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.9; coat(); ctx.stroke();
    // sash in oxblood so the bearer still reads as the marked one
    ctx.strokeStyle = 'rgba(122,40,32,0.85)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(6, -8); ctx.stroke();
    // scarf coils
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.ellipse(0, -27, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (let i = -6; i <= 6; i += 1.5) { ctx.moveTo(i, -30); ctx.lineTo(i + 0.6, -24); } ctx.stroke();
    // head: long nose, goggles, crest of spikes
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(-4, -29); ctx.quadraticCurveTo(-5, -38, 1, -38); ctx.lineTo(9, -33); ctx.lineTo(3, -31); ctx.lineTo(3, -29); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.5; ctx.beginPath();
    for (let i = 0; i < 34; i++) { const a = -Math.PI * 0.95 + (i / 33) * Math.PI * 0.8; ctx.moveTo(-1 + Math.cos(a) * 3, -36 + Math.sin(a) * 2); ctx.lineTo(-4 + Math.cos(a) * (15 + R() * 7), -37 + Math.sin(a) * (14 + R() * 7)); }
    ctx.stroke();
    ctx.fillStyle = '#cbb99a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(3, -35, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(3.4, -35, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(2.8, -35.6, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(0.4, -35); ctx.lineTo(-4, -34); ctx.stroke();
    // the name-stone, held out in front
    const stone = () => { ctx.beginPath(); ctx.ellipse(10, -18, 5.5, 5, 0.2, 0, Math.PI * 2); };
    ctx.fillStyle = '#cdbb9c'; stone(); ctx.fill();
    hatch(ctx, stone, [4, -23, 12, 10], -0.8, 1.2, 0.4);
    ctx.lineWidth = 0.9; stone(); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.9; ctx.beginPath(); for (let t = 0; t < 10; t += 0.3) { const r = t * 0.32; ctx.lineTo(10 + Math.cos(t) * r, -18 + Math.sin(t) * r); } ctx.stroke();
  } else if (type === 'cairn') {
    // a walking citadel-fish with a stern human face and an empty socket in its flank
    groundWash(ctx, -2, 2, 52, 8, 0.4);
    const drop = kneel ? 16 : 0;
    const legs: [number, number][] = [[-26, 0], [-14, 2.2], [16, 1.1], [27, 3.3]];
    for (const [lx, ph] of legs) {
      const step = kneel ? 0 : Math.sin(bob + ph) * 3;
      const top = -30 + drop;
      const leg = () => { ctx.beginPath(); ctx.moveTo(lx - 4, top); ctx.quadraticCurveTo(lx - 5 + step, (top - 3) / 2, lx - 3 + step * 1.5, -3); ctx.lineTo(lx + 3 + step * 1.5, -3); ctx.quadraticCurveTo(lx + 4 + step, (top - 3) / 2, lx + 4, top); ctx.closePath(); };
      ctx.fillStyle = PAPER; leg(); ctx.fill();
      ctx.save(); leg(); ctx.clip(); ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath();
      for (let r = top + 2; r < -3; r += 3) { ctx.moveTo(lx - 8, r); ctx.quadraticCurveTo(lx, r + 1.5, lx + 8, r); }
      ctx.stroke(); ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = 1; leg(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(lx + step * 1.5, -1.5, 4.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save(); ctx.translate(0, drop); if (kneel) ctx.rotate(0.06);
    // tail fan, swishing
    const sw = kneel ? 0 : Math.sin(bob * 0.7) * 4;
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    const tail = () => { ctx.beginPath(); ctx.moveTo(-40, -44); ctx.quadraticCurveTo(-56, -70 + sw, -66, -74 + sw); ctx.quadraticCurveTo(-60, -48, -70, -20 + sw); ctx.quadraticCurveTo(-54, -26, -40, -36); ctx.closePath(); };
    tail(); ctx.fill();
    ctx.save(); tail(); ctx.clip(); ctx.lineWidth = 0.5; ctx.beginPath();
    for (let i = 0; i < 14; i++) { const t = i / 13; ctx.moveTo(-40, -40); ctx.lineTo(-66 + Math.sin(t * 3) * 3, -74 + sw + t * 54); }
    ctx.stroke(); ctx.restore(); ctx.lineWidth = 1; tail(); ctx.stroke();
    // body with scales
    const body = () => { ctx.beginPath(); ctx.moveTo(-42, -40); ctx.bezierCurveTo(-36, -72, 24, -76, 36, -56); ctx.lineTo(38, -30); ctx.bezierCurveTo(20, -18, -30, -18, -42, -40); ctx.closePath(); };
    ctx.fillStyle = PAPER; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.55;
    for (let row = 0, yy = -76; yy < -34; yy += 3.6, row++) { ctx.beginPath(); for (let xx = -46 + (row % 2) * 3; xx < 40; xx += 6) { ctx.moveTo(xx + 3, yy); ctx.arc(xx, yy, 3, 0, Math.PI); } ctx.stroke(); }
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(-44, -34); ctx.bezierCurveTo(-20, -40, 10, -36, 40, -40); ctx.lineTo(40, -10); ctx.lineTo(-44, -10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); for (let i = 0; i < 6; i++) { ctx.moveTo(-44, -32 + i * 2.4); ctx.bezierCurveTo(-20, -38 + i * 2.6, 10, -34 + i * 2.2, 40, -38 + i * 2.6); } ctx.stroke();
    ctx.fillStyle = sepia(0.25); ctx.fillRect(-50, -34, 100, 20);
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; body(); ctx.stroke();
    ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-42, -38); ctx.bezierCurveTo(-30, -42, -20, -34, -10, -40); ctx.bezierCurveTo(0, -44, 10, -36, 22, -41); ctx.stroke();
    // pectoral fin
    const fin = () => { ctx.beginPath(); ctx.moveTo(-4, -46); ctx.lineTo(-22, -54); ctx.lineTo(-20, -40); ctx.closePath(); };
    ctx.fillStyle = PAPER; fin(); ctx.fill(); ctx.stroke();
    hatch(ctx, fin, [-22, -54, 18, 14], 1.2, 1.6, 0.4);
    // the empty socket where its name-stone belonged
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(8, -50, 7, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    hatch(ctx, () => { ctx.beginPath(); ctx.ellipse(8, -50, 7, 6, 0, Math.PI * 0.95, Math.PI * 2.05); ctx.ellipse(8, -48, 6, 4, 0, 0, Math.PI, true); }, [1, -56, 14, 10], 0.5, 1, 0.5);
    // the cairn town on its back
    const towers: [number, number, number][] = [[-18, 9, 16], [-6, 11, 26], [6, 8, 20], [16, 7, 13]];
    for (const [tx, tw, th] of towers) {
      const base = -70 + Math.abs(tx) * 0.12;
      const tw2 = tw / 2;
      ctx.fillStyle = PAPER; ctx.fillRect(tx - tw2, base - th, tw, th);
      hatch(ctx, () => { ctx.beginPath(); ctx.rect(tx + tw2 * 0.2, base - th, tw2 * 0.8, th); }, [tx, base - th, tw2, th], 0.2, 1.3, 0.45);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.strokeRect(tx - tw2, base - th, tw, th);
      ctx.fillStyle = INK; ctx.fillRect(tx - 1, base - th * 0.6, 2, 3.5);
      ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(tx - tw2 - 1.5, base - th); ctx.lineTo(tx, base - th - tw * 0.9); ctx.lineTo(tx + tw2 + 1.5, base - th); ctx.closePath(); ctx.fill(); ctx.stroke();
      hatch(ctx, () => { ctx.beginPath(); ctx.moveTo(tx, base - th - tw * 0.9); ctx.lineTo(tx + tw2 + 1.5, base - th); ctx.lineTo(tx, base - th); ctx.closePath(); }, [tx, base - th - tw, tw2 + 2, tw], 1.1, 1.2, 0.45);
      const fy = base - th - tw * 0.9;
      ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(tx, fy); ctx.lineTo(tx, fy - 6); ctx.stroke();
      ctx.beginPath(); ctx.arc(tx, fy - 8, 1.8, 0, Math.PI * 2); ctx.stroke();
    }
    // a ribbed shell hood behind the face
    const hood = () => { ctx.beginPath(); ctx.ellipse(32, -46, 11, 27, 0.05, 0, Math.PI * 2); };
    ctx.fillStyle = PAPER; hood(); ctx.fill();
    ctx.save(); hood(); ctx.clip(); ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let i = -26; i <= 26; i += 1.8) { ctx.moveTo(20, -46 + i); ctx.quadraticCurveTo(32, -46 + i * 1.15, 44, -46 + i); }
    ctx.stroke(); ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; hood(); ctx.stroke();
    // the face, large and stern
    ctx.save(); ctx.translate(36, -44); ctx.scale(1.55, 1.55); ctx.translate(-36, 44);
    const face = () => { ctx.beginPath(); ctx.moveTo(34, -60); ctx.bezierCurveTo(44, -66, 52, -60, 52, -50); ctx.lineTo(58, -42); ctx.lineTo(53, -40); ctx.quadraticCurveTo(55, -36, 52, -35); ctx.quadraticCurveTo(54, -31, 50, -30); ctx.quadraticCurveTo(48, -24, 40, -24); ctx.lineTo(36, -28); ctx.closePath(); };
    ctx.fillStyle = '#eddfc6'; face(); ctx.fill();
    hatch(ctx, () => { ctx.beginPath(); ctx.rect(34, -62, 8, 40); }, [34, -62, 8, 40], 1.2, 1.4, 0.4);
    ctx.fillStyle = sepia(0.25); ctx.beginPath(); ctx.ellipse(46, -38, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.1; face(); ctx.stroke();
    eye(ctx, 46.5, -50, 3, 0.45, kneel);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(43, -55.5); ctx.quadraticCurveTo(47, -57, 51, -54); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(42, -40, 0.8, 0, Math.PI * 2); ctx.fill();
    // snail-shell temple and fern horns
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let t = 0; t < 14; t += 0.2) { const r = 6 - t * 0.4; ctx.lineTo(38 + Math.cos(t) * r, -56 + Math.sin(t) * r); } ctx.stroke();
    for (const [hx, lean] of [[38, -0.15], [44, 0.25]] as [number, number][]) {
      ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(hx, -62); ctx.quadraticCurveTo(hx + lean * 20, -78, hx + lean * 30 - 2, -94); ctx.stroke();
      ctx.lineWidth = 0.7; ctx.beginPath();
      for (let t = 0.15; t < 1; t += 0.1) { const px = hx + lean * 30 * t * t - 2 * t, py = -62 - 32 * t; ctx.moveTo(px, py); ctx.lineTo(px - 3.5, py - 2.5); ctx.moveTo(px, py); ctx.lineTo(px + 3.5, py - 2.5); }
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }
  ctx.restore();
}

// ── Scenery ─────────────────────────────────────────────────────────────────

export function chaikin(pts: Vec[], it = 2): Vec[] {
  let p = pts;
  for (let k = 0; k < it; k++) {
    const out: Vec[] = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      out.push({ x: p[i].x * 0.75 + p[i + 1].x * 0.25, y: p[i].y * 0.75 + p[i + 1].y * 0.25 });
      out.push({ x: p[i].x * 0.25 + p[i + 1].x * 0.75, y: p[i].y * 0.25 + p[i + 1].y * 0.75 });
    }
    out.push(p[p.length - 1]); p = out;
  }
  return p;
}

export function samples(pts: Vec[], step: number) {
  const out: { x: number; y: number; a: number }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
    const n = Math.max(1, Math.round(L / step));
    for (let j = 0; j < n; j++) out.push({ x: a.x + ((b.x - a.x) * j) / n, y: a.y + ((b.y - a.y) * j) / n, a: ang });
  }
  return out;
}

export function polyline(ctx: C, pts: Vec[]) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); }

export function edges(ctx: C, pts: Vec[], half: number, R: R, lw = 1.3) {
  const S = samples(pts, 8);
  for (const sgn of [-1, 1]) {
    ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.beginPath();
    S.forEach((p, i) => { const o = half + (R() - 0.5) * 1.6; const q = { x: p.x - Math.sin(p.a) * o * sgn, y: p.y + Math.cos(p.a) * o * sgn }; i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
    ctx.stroke();
  }
}

export function turret(ctx: C, x: number, base: number, w: number, h: number, roofH: number, fin: string, stripe: boolean, R: R) {
  const L = x - w / 2, top = base - h;
  ctx.fillStyle = PAPER; ctx.fillRect(L, top, w, h);
  if (stripe) { ctx.save(); ctx.beginPath(); ctx.rect(L, top, w, h); ctx.clip(); ctx.fillStyle = sepia(0.35); for (let yy = top; yy < base; yy += 12) { ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(L + w, yy - 5); ctx.lineTo(L + w, yy + 1); ctx.lineTo(L, yy + 6); ctx.fill(); } ctx.restore(); }
  // brickwork
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let yy = top + 5; yy < base; yy += 5) for (let xx = L + 2 + (R() * 6); xx < L + w - 3; xx += 6 + R() * 6) { ctx.moveTo(xx, yy); ctx.lineTo(xx + 3 + R() * 2, yy); }
  ctx.stroke();
  hatch(ctx, () => { ctx.beginPath(); ctx.rect(L + w * 0.6, top, w * 0.4, h); }, [L + w * 0.6, top, w * 0.4, h], -0.25, 1.6, 0.5, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.strokeRect(L, top, w, h);
  // windows
  ctx.fillStyle = INK;
  for (let yy = top + 14; yy < base - 16; yy += 26) { const wx = x - 2 - (w > 40 ? 8 : 0); for (let k = 0; k < (w > 40 ? 2 : 1); k++) { ctx.beginPath(); ctx.moveTo(wx + k * 16, yy + 9); ctx.lineTo(wx + k * 16, yy + 2); ctx.arc(wx + k * 16 + 2, yy + 2, 2, Math.PI, 0); ctx.lineTo(wx + k * 16 + 4, yy + 9); ctx.fill(); } }
  // roof
  if (roofH > 0) {
    const roof = () => { ctx.beginPath(); ctx.moveTo(L - 4, top); ctx.quadraticCurveTo(x - w * 0.2, top - roofH * 0.4, x, top - roofH); ctx.quadraticCurveTo(x + w * 0.2, top - roofH * 0.4, L + w + 4, top); ctx.closePath(); };
    ctx.fillStyle = PAPER; roof(); ctx.fill();
    ctx.save(); roof(); ctx.clip(); ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let i = -w / 2 - 4; i <= w / 2 + 4; i += 2.4) { ctx.moveTo(x, top - roofH); ctx.lineTo(x + i, top + 1); }
    for (let yy = top - 4; yy > top - roofH * 0.8; yy -= 5) { ctx.moveTo(L - 4, yy); ctx.lineTo(L + w + 4, yy); }
    ctx.stroke();
    ctx.fillStyle = sepia(0.35); ctx.fillRect(x + 1, top - roofH, w, roofH); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; roof(); ctx.stroke();
  } else {
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.1;
    for (let xx = L; xx < L + w - 2; xx += 7) { ctx.fillRect(xx, top - 5, 4, 5); ctx.strokeRect(xx, top - 5, 4, 5); }
  }
  // finial
  if (fin === 'none') return;
  const fy = top - roofH;
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, fy - 16); ctx.stroke();
  if (fin === 'crescent') { ctx.beginPath(); ctx.arc(x, fy - 21, 5, 0.5, Math.PI * 2 - 0.5); ctx.arc(x + 2, fy - 22, 4, Math.PI * 2 - 0.5, 0.5, true); ctx.fill(); }
  else if (fin === 'ring') { ctx.beginPath(); ctx.ellipse(x, fy - 10, 6, 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, fy - 19, 3, 0, Math.PI * 2); ctx.stroke(); }
  else if (fin === 'orb') { ctx.beginPath(); ctx.arc(x, fy - 18, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x, fy - 9, 1.6, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(x - 4 + k, fy - 8 - k * 4); ctx.lineTo(x + 4 - k, fy - 8 - k * 4); } ctx.stroke(); }
}

/** A small ink windmill body; its sails are drawn separately so they can turn. */
export function windmillBody(ctx: C, x: number, y: number) {
  const R = rng(66);
  groundWash(ctx, x + 10, y + 2, 50, 10, 0.3);
  const body = () => { ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x - 11, y - 54); ctx.lineTo(x + 11, y - 54); ctx.lineTo(x + 18, y); ctx.closePath(); };
  ctx.fillStyle = PAPER; body(); ctx.fill();
  ctx.save(); body(); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath(); for (let yy = y - 52; yy < y; yy += 4) { ctx.moveTo(x - 20, yy); ctx.lineTo(x + 20, yy + (R() - 0.5)); } ctx.stroke(); ctx.restore();
  hatch(ctx, () => { ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + 4, y - 54); ctx.lineTo(x + 11, y - 54); ctx.lineTo(x + 18, y); ctx.closePath(); }, [x, y - 54, 18, 54], -0.4, 1.6, 0.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; body(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 4, y - 9); ctx.arc(x, y - 9, 4, Math.PI, 0); ctx.lineTo(x + 4, y); ctx.fill();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(x - 14, y - 53); ctx.quadraticCurveTo(x, y - 72, x + 14, y - 53); ctx.closePath(); ctx.fill(); ctx.stroke();
}

/** Four lattice sails around the hub, at angle `rot`. */
export function windmillSails(ctx: C, hx: number, hy: number, rot: number) {
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
    const sail = () => { ctx.beginPath(); ctx.moveTo(hx + c * 6 - s * 2, hy + s * 6 + c * 2); ctx.lineTo(hx + c * 44 - s * 2, hy + s * 44 + c * 2); ctx.lineTo(hx + c * 44 - s * 11, hy + s * 44 + c * 11); ctx.lineTo(hx + c * 10 - s * 9, hy + s * 10 + c * 9); ctx.closePath(); };
    ctx.fillStyle = 'rgba(228,211,182,0.9)'; sail(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let t = 10; t <= 44; t += 5) { ctx.moveTo(hx + c * t - s * 2, hy + s * t + c * 2); ctx.lineTo(hx + c * t - s * 11, hy + s * t + c * 11); }
    ctx.stroke();
    ctx.lineWidth = 0.9; sail(); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + c * 46, hy + s * 46); ctx.stroke();
  }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
}

/** A goose, in a few pen lines: Goosebridge keeps its geese. */
export function goose(ctx: C, x: number, y: number, k: number, dir: number, flying = false, flap = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k * dir, k);
  ctx.strokeStyle = INK; ctx.fillStyle = PAPER; ctx.lineWidth = 0.9;
  if (flying) {
    const w = Math.sin(flap) * 6;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, -3, 10, -1); ctx.quadraticCurveTo(0, 3, -8, 0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -1); ctx.quadraticCurveTo(-6, -8 - w, -12, -10 - w); ctx.moveTo(1, -1); ctx.quadraticCurveTo(-2, -9 - w, -7, -13 - w); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -1); ctx.lineTo(16, -2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-9, -7, 0, -6); ctx.quadraticCurveTo(5, -6, 5, -10); ctx.quadraticCurveTo(5, -16, 8, -16); ctx.quadraticCurveTo(10, -16, 10, -14); ctx.lineTo(13, -13); ctx.lineTo(9, -12); ctx.quadraticCurveTo(8, -8, 9, -4); ctx.quadraticCurveTo(8, 1, 0, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-2, -5, 3, -3); ctx.moveTo(-5, -1); ctx.quadraticCurveTo(-1, -3, 3, -1.5); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(8.4, -14.2, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK2; ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(-4, 2); ctx.moveTo(2, 2.5); ctx.lineTo(10, 2.5); ctx.stroke();
  }
  ctx.restore();
}

/** The Cairn-Born's name-stone lying on the road, its spiral glinting. */
export function nameStone(ctx: C, x: number, y: number, time: number) {
  groundWash(ctx, x + 2, y + 3, 14, 4, 0.4);
  const stone = () => { ctx.beginPath(); ctx.moveTo(x - 9, y + 2); ctx.lineTo(x - 8, y - 11); ctx.quadraticCurveTo(x, y - 17, x + 8, y - 11); ctx.lineTo(x + 9, y + 2); ctx.closePath(); };
  ctx.fillStyle = '#cdbb9c'; stone(); ctx.fill();
  hatch(ctx, stone, [x - 9, y - 17, 18, 20], -0.8, 1.6, 0.45);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.1; stone(); ctx.stroke();
  ctx.strokeStyle = `rgba(195,150,52,${0.6 + 0.4 * Math.sin(time * 4)})`; ctx.lineWidth = 1.3; ctx.beginPath();
  for (let t = 0; t < 12; t += 0.3) { const r = t * 0.42; ctx.lineTo(x + Math.cos(t) * r, y - 6 + Math.sin(t) * r); }
  ctx.stroke();
}

export const inkSurreal: Style = {
  id: 'ink',
  name: 'Sepia notebook',
  featured: 'In the game now',
  blurb: 'Sepia ink on mottled, folded parchment, after Renaissance anatomical notebooks: dense hatching, mirror-script notes in the margins, and gentle impossible creatures (root-walkers, striped air-fish, a walking citadel-fish).',
  unity: '2D. Hand-drawn sprite sheets on a paper background; a paper-grain overlay and a light wash shader.',
  ground(ctx, R) {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // paper tooth
    for (let i = 0; i < 9000; i++) { ctx.fillStyle = R() < 0.5 ? 'rgba(110,90,60,0.07)' : 'rgba(255,244,222,0.2)'; ctx.fillRect(R() * MAP_W, R() * MAP_H, 1.2, 1.2); }
    // age: a mottled parchment, darker in blooms and blotches
    for (let i = 0; i < 70; i++) {
      const x = R() * MAP_W, y = R() * MAP_H, r = 40 + R() * 220;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(120,78,38,${0.02 + R() * 0.06})`); g.addColorStop(1, 'rgba(120,78,38,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // pooled washes, as at the feet of the drawings
    for (let i = 0; i < 16; i++) { const x = R() * MAP_W, y = R() * MAP_H; groundWash(ctx, x, y, 160 + R() * 220, 50 + R() * 70, 0.05 + R() * 0.05); }
    // a ridge of distant hills in wash across the top
    ctx.fillStyle = sepia(0.07); ctx.beginPath(); ctx.moveTo(0, 70);
    for (let x = 0; x <= MAP_W; x += 40) ctx.lineTo(x, 46 + Math.sin(x * 0.006) * 18 + Math.sin(x * 0.021) * 8);
    ctx.lineTo(MAP_W, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    // scattered tufts of fynbos grass
    ctx.strokeStyle = 'rgba(58,34,18,0.42)'; ctx.lineWidth = 0.6;
    for (let i = 0; i < 160; i++) {
      const x = R() * MAP_W, y = 60 + R() * (MAP_H - 60), n = 3 + Math.floor(R() * 4), lean = (R() - 0.5) * 0.6;
      ctx.beginPath();
      for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + lean + (k - (n - 1) / 2) * 0.3, L = 4 + R() * 7; ctx.moveTo(x + k * 1.3, y); ctx.quadraticCurveTo(x + k * 1.3 + Math.cos(a) * L * 0.3, y - L * 0.5, x + k * 1.3 + Math.cos(a) * L, y + Math.sin(a) * L); }
      ctx.stroke();
    }
  },
  water(ctx, river, pond) {
    const pts = chaikin(river, 3), R = rng(41);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(84,54,30,0.28)'; ctx.lineWidth = 34; polyline(ctx, pts); ctx.stroke();
    edges(ctx, pts, 17, R, 1.4);
    ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath();
    for (const p of samples(pts, 7)) for (const o of [-12, -7, -2, 3, 8, 13]) {
      if (R() < 0.15) continue;
      const ox = p.x - Math.sin(p.a) * (o + (R() - 0.5) * 3), oy = p.y + Math.cos(p.a) * (o + (R() - 0.5) * 3), L = 6 + R() * 8;
      ctx.moveTo(ox, oy); ctx.quadraticCurveTo(ox + Math.cos(p.a) * L * 0.5 + 1.5, oy + Math.sin(p.a) * L * 0.5 - 1.5, ox + Math.cos(p.a) * L, oy + Math.sin(p.a) * L);
    }
    ctx.stroke();
    // the river wells up from a spring: a small rocky pool with rushes
    const h = river[0], a0 = Math.atan2(river[1].y - h.y, river[1].x - h.x);
    const px = h.x - Math.cos(a0) * 22, py = h.y - Math.sin(a0) * 22;
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(px, py, 40, 31, a0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(84,54,30,0.28)'; ctx.beginPath(); ctx.ellipse(px, py, 40, 31, a0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.6;
    for (let k = 1; k <= 4; k++) { ctx.setLineDash([6 + k * 3, 4 + k]); ctx.beginPath(); ctx.ellipse(px, py, k * 8, k * 6, a0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
    const RS = rng(43);
    for (let i = 0; i < 15; i++) {
      // a ring of stones round the pool, open where the river flows out
      const t = -2.45 + (i / 14) * 4.9, a = a0 + Math.PI + t, r = 6 + RS() * 6;
      const sx = px + Math.cos(a0) * Math.cos(t + Math.PI) * 44 - Math.sin(a0) * Math.sin(t + Math.PI) * 35;
      const sy = py + Math.sin(a0) * Math.cos(t + Math.PI) * 44 + Math.cos(a0) * Math.sin(t + Math.PI) * 35;
      const st = () => { ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.68, a + RS() * 0.3, 0, Math.PI * 2); };
      groundWash(ctx, sx + 3, sy + 3, r * 1.3, r * 0.6, 0.35);
      ctx.fillStyle = '#d8c7a8'; st(); ctx.fill();
      hatch(ctx, st, [sx - r, sy - r, r * 2, r * 2], 0.7 + i * 0.3, 1.6, 0.45);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.1; st(); ctx.stroke();
    }
    // rushes at either side of the outflow
    ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.beginPath();
    for (const sgn of [-1, 1]) for (let i = 0; i < 6; i++) {
      const bx = h.x + Math.cos(a0) * (8 + i * 3) - Math.sin(a0) * sgn * (24 + (i % 2) * 3), by = h.y + Math.sin(a0) * (8 + i * 3) + Math.cos(a0) * sgn * (24 + (i % 2) * 3);
      ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + (i - 3) * 0.6, by - 7, bx + (i - 3) * 1.4, by - 13 - (i % 3) * 2);
    }
    ctx.stroke();
    void pond;
  },
  road(ctx, pts, kind) {
    const P = chaikin(pts, 2), R = rng(kind === 'mill' ? 11 : 12);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#eadcc2'; ctx.lineWidth = 38; polyline(ctx, P); ctx.stroke();
    ctx.strokeStyle = sepia(0.09); ctx.lineWidth = 38; polyline(ctx, P); ctx.stroke();
    if (kind === 'king') {
      // cobbles laid like fish scales
      ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath();
      const S = samples(P, 8);
      S.forEach((p, i) => { for (let o = -14; o <= 14; o += 9) { const oo = o + (i % 2) * 4.5; if (Math.abs(oo) > 15) continue; const cx = p.x - Math.sin(p.a) * oo, cy = p.y + Math.cos(p.a) * oo; ctx.moveTo(cx + Math.cos(p.a - Math.PI / 2) * 4.6, cy + Math.sin(p.a - Math.PI / 2) * 4.6); ctx.arc(cx, cy, 4.6, p.a - Math.PI / 2, p.a + Math.PI / 2); } });
      ctx.stroke();
    } else {
      // dirt: stipple and two cart ruts
      const S = samples(P, 4);
      ctx.fillStyle = 'rgba(58,34,18,0.5)';
      for (const p of S) for (let k = 0; k < 3; k++) { const o = (R() - 0.5) * 32; ctx.beginPath(); ctx.arc(p.x - Math.sin(p.a) * o, p.y + Math.cos(p.a) * o, 0.5 + R() * 0.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = INK2; ctx.lineWidth = 0.7;
      for (const o of [-7, 7]) { ctx.beginPath(); S.forEach((p, i) => { const q = { x: p.x - Math.sin(p.a) * (o + (R() - 0.5)), y: p.y + Math.cos(p.a) * (o + (R() - 0.5)) }; i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke(); }
    }
    edges(ctx, P, 19, R, 1.3);
  },
  bridge(ctx, at, a) {
    const R = rng(77);
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a);
    ctx.fillStyle = PAPER; ctx.fillRect(-26, -46, 52, 92);
    ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath();
    for (let yy = -44; yy < 44; yy += 5) { ctx.moveTo(-22, yy + (R() - 0.5)); ctx.lineTo(22, yy + (R() - 0.5)); }
    ctx.stroke();
    for (const sx of [-26, 18]) {
      ctx.fillStyle = PAPER; ctx.fillRect(sx, -48, 8, 96);
      hatch(ctx, () => { ctx.beginPath(); ctx.rect(sx, -48, 8, 96); }, [sx, -48, 8, 96], 0.8, 1.6, 0.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(sx, -48, 8, 96);
      ctx.lineWidth = 0.6; ctx.beginPath(); for (let yy = -48; yy < 48; yy += 10) { ctx.moveTo(sx, yy); ctx.lineTo(sx + 8, yy); } ctx.stroke();
    }
    ctx.restore();
  },
  tree(ctx, x, y, r, k) {
    const R = seed(x, y, 1);
    if (k > 0.5) return;
    r *= 1.35;
    groundWash(ctx, x + r * 0.5, y + 2, r * 1.4, r * 0.35, 0.3);
    if (k < 0.14) {
      // a fynbos shrub with protea heads
      const n = 3 + Math.floor(R() * 2);
      for (let i = 0; i < n; i++) {
        ctx.strokeStyle = INK; ctx.lineWidth = 0.9;
        const tx = x + (i - (n - 1) / 2) * r * 0.45 + (R() - 0.5) * 4, ty = y - r * (0.9 + R() * 0.7);
        ctx.beginPath(); ctx.moveTo(x + (i - (n - 1) / 2) * 2, y); ctx.quadraticCurveTo((x + tx) / 2 + (R() - 0.5) * 6, (y + ty) / 2, tx, ty + 3); ctx.stroke();
        for (let l = 0; l < 3; l++) { const ly = y - (ty - y) * -0.25 * (l + 1), lx = x + (tx - x) * 0.3 * (l + 1); ctx.fillStyle = PAPER; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(lx + 3, ly, 3.5, 1.3, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        proteaHead(ctx, tx, ty, 1.1 + R() * 0.4, R);
      }
      return;
    }
    const segs: Seg[] = [];
    for (const a of [-0.3, 0.25, Math.PI + 0.3, Math.PI - 0.2]) segs.push({ x1: x, y1: y - 2, x2: x + Math.cos(a) * r * 0.55, y2: y + Math.abs(Math.sin(a)) * r * 0.1, w: r * 0.25 });
    grow(segs, R, x, y, -Math.PI / 2 + (R() - 0.5) * 0.3, r * 1.5, r * 0.5, 3, 0.75);
    limbs(ctx, segs, R);
    if (r > 14) whorl(ctx, x + (R() - 0.5) * r * 0.2, y - r * 0.6, r * 0.18, R, 0.5);
  },
  ley(ctx, edgesList, knots) {
    ctx.strokeStyle = 'rgba(58,34,18,0.45)'; ctx.lineWidth = 1.1; ctx.setLineDash([2, 5]); ctx.lineCap = 'round';
    for (const e of edgesList) { polyline(ctx, e); ctx.stroke(); }
    ctx.setLineDash([]);
    for (const k of knots) { ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(k.x, k.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(k.x, k.y, 1.3, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill(); }
  },
  bound(ctx, path) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 7; polyline(ctx, path); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 4.6; polyline(ctx, path); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,190,0.7)'; ctx.lineWidth = 1.2; polyline(ctx, path.map((p) => ({ x: p.x - 1, y: p.y - 1 }))); ctx.stroke();
  },
  trace(ctx, path) {
    const R = rng(path.length * 13);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const S = samples(path, 6);
    ctx.strokeStyle = INK; ctx.lineWidth = 4.2; ctx.beginPath();
    S.forEach((p, i) => { const j = (R() - 0.5) * 1.2; i ? ctx.lineTo(p.x + j, p.y + j) : ctx.moveTo(p.x, p.y); }); ctx.stroke();
    ctx.fillStyle = INK;
    for (const p of S) if (R() < 0.05) { ctx.beginPath(); ctx.arc(p.x + (R() - 0.5) * 3, p.y + (R() - 0.5) * 3, 3 + R() * 2.5, 0, Math.PI * 2); ctx.fill(); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(p.x + (R() - 0.5) * 18, p.y + (R() - 0.5) * 18, 0.6 + R() * 0.9, 0, Math.PI * 2); ctx.fill(); } }
  },
  fire(ctx, pts) {
    const R = rng(91);
    for (let i = 0; i < pts.length; i += 2) inkFlame(ctx, pts[i].x + (R() - 0.5) * 22, pts[i].y + (R() - 0.5) * 12, 12 + R() * 14, R() - 0.5);
  },
  foundation(ctx, x, y) { inkFoundation(ctx, x, y); },
  tower(ctx, type, x, y, m) { towerInk(ctx, type, x, y, m); },
  enemy(ctx, type, x, y, dir) { enemyInk(ctx, type, x, y, dir); },
  castle(ctx, at) { inkCastle(ctx, at); },
  mill(ctx, at) { windmillBody(ctx, at.x, at.y + 20); windmillSails(ctx, at.x, at.y - 36, 0.4); },
  // the gallery shows the keeper of the inkwell too (the game draws him live, so he can move)
  inkwell(ctx, at) { inkInkwell(ctx, at); wizard(ctx, at.x + 62, at.y + 26, -1, 0, false); },
  pulse(ctx, at, trail) {
    const R = rng(3);
    ctx.strokeStyle = INK; ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) { const t = k / 6; ctx.lineWidth = 1 + t * 6; ctx.beginPath(); ctx.moveTo(trail.x + (at.x - trail.x) * t, trail.y + (at.y - trail.y) * t); ctx.lineTo(trail.x + (at.x - trail.x) * (t + 0.17), trail.y + (at.y - trail.y) * (t + 0.17)); ctx.stroke(); }
    inkBlot(ctx, at.x, at.y, 9, R);
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(at.x - 2, at.y - 2, 2.6, 0, Math.PI * 2); ctx.fill();
  },
  post(ctx) { paperVignette(ctx); },
};

/** One hatched flame with a warm wash. `lean` tilts its tip. */
export function inkFlame(ctx: C, x: number, y: number, h: number, lean: number) {
  const fl = () => { ctx.beginPath(); ctx.moveTo(x - h * 0.3, y); ctx.bezierCurveTo(x - h * 0.4, y - h * 0.5, x + lean * h * 0.2, y - h * 0.6, x + h * 0.1 + lean * h * 0.3, y - h); ctx.bezierCurveTo(x + h * 0.2, y - h * 0.55, x + h * 0.45, y - h * 0.4, x + h * 0.3, y); ctx.closePath(); };
  ctx.fillStyle = 'rgba(206,120,52,0.4)'; fl(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.8; fl(); ctx.stroke();
  ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.quadraticCurveTo(x - h * 0.15, y - h * 0.35, x + h * 0.05 + lean * h * 0.2, y - h * 0.6); ctx.stroke();
}

/** A splash of ink with satellite droplets. */
export function inkBlot(ctx: C, x: number, y: number, r: number, R: R) {
  ctx.fillStyle = INK; ctx.beginPath();
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2, rr = r + (i % 2 ? R() * r * 0.66 : 0); i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.fill();
  for (let k = 0; k < 14; k++) { const a = R() * Math.PI * 2, d = r * 1.5 + R() * r * 1.5; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.8 + R() * 1.6, 0, Math.PI * 2); ctx.fill(); }
}

export function inkFoundation(ctx: C, x: number, y: number) {
  const R = seed(x, y, 5);
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(x, y, 28, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  hatch(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, 28, 12, 0, 0, Math.PI * 2); ctx.ellipse(x, y - 1, 21, 8, 0, 0, Math.PI * 2, true); }, [x - 28, y - 12, 56, 24], 1, 1.6, 0.45, INK, R);
  ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(x, y - 1, 21, 8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; ctx.moveTo(x + Math.cos(a) * 21, y - 1 + Math.sin(a) * 8); ctx.lineTo(x + Math.cos(a) * 28, y + Math.sin(a) * 12); }
  ctx.stroke();
}

export function inkCastle(ctx: C, at: Vec) {
  const R = rng(55), x = at.x, y = at.y;
  groundWash(ctx, x, y + 40, 120, 160, 0.25);
  type T = { x: number; base: number; w: number; h: number; roof: number; fin: string; stripe: boolean };
  const parts: (T | 'wall')[] = [
    // a tall, tight citadel: everything stays within x + 35 so it can be drawn larger at the page edge
    { x: x + 18, base: y - 70, w: 26, h: 120, roof: 50, fin: 'orb', stripe: false },
    { x: x - 28, base: y - 55, w: 22, h: 80, roof: 38, fin: 'crescent', stripe: true },
    { x: x + 2, base: y - 10, w: 46, h: 160, roof: 62, fin: 'ring', stripe: false },
    'wall',
    { x: x - 50, base: y + 25, w: 34, h: 70, roof: 0, fin: 'bars', stripe: false },
    { x: x + 22, base: y + 45, w: 26, h: 120, roof: 44, fin: 'bars', stripe: true },
    { x: x - 18, base: y + 90, w: 28, h: 95, roof: 40, fin: 'crescent', stripe: false },
    { x: x + 18, base: y + 125, w: 30, h: 70, roof: 34, fin: 'orb', stripe: false },
  ];
  for (const p of parts) {
    if (p === 'wall') {
      const top = y - 6, bot = y + 24;
      ctx.fillStyle = PAPER; ctx.fillRect(x - 66, top, 101, bot - top);
      ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
      for (let yy = top + 5; yy < bot; yy += 5) for (let xx = x - 64 + R() * 6; xx < x + 32; xx += 8 + R() * 4) { ctx.moveTo(xx, yy); ctx.lineTo(xx + 4, yy); }
      ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(x - 66, top, 101, bot - top);
      ctx.fillStyle = PAPER; for (let xx = x - 66; xx < x + 32; xx += 9) { ctx.fillRect(xx, top - 5, 5, 5); ctx.strokeRect(xx, top - 5, 5, 5); }
      continue;
    }
    turret(ctx, p.x, p.base, p.w, p.h, p.roof, p.fin, p.stripe, R);
    if (p.fin === 'bars' && p.roof === 0) {
      // gatehouse: the arch that faces the road
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(p.x - 9, p.base); ctx.lineTo(p.x - 9, p.base - 16); ctx.arc(p.x, p.base - 16, 9, Math.PI, 0); ctx.lineTo(p.x + 9, p.base); ctx.fill();
      ctx.strokeStyle = PAPER; ctx.lineWidth = 0.6; ctx.beginPath(); for (let gx = p.x - 7; gx <= p.x + 7; gx += 3.5) { ctx.moveTo(gx, p.base - 22); ctx.lineTo(gx, p.base); } ctx.stroke();
    }
  }
}

export function inkInkwell(ctx: C, at: Vec) {
  const x = at.x, y = at.y;
  groundWash(ctx, x + 6, y + 22, 40, 9, 0.35);
  const bottle = () => { ctx.beginPath(); ctx.moveTo(x - 26, y + 22); ctx.quadraticCurveTo(x - 32, y - 2, x - 12, y - 10); ctx.lineTo(x - 9, y - 20); ctx.lineTo(x + 9, y - 20); ctx.lineTo(x + 12, y - 10); ctx.quadraticCurveTo(x + 32, y - 2, x + 26, y + 22); ctx.closePath(); };
  ctx.fillStyle = INK; bottle(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(x - 16, y + 2, 2.5, 9, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let i = 0; i < 5; i++) { ctx.moveTo(x - 8 + i * 4, y - 8); ctx.lineTo(x - 12 + i * 6, y + 20); }
  ctx.stroke();
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(x, y - 20, 10, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x, y - 20, 7, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  // quill
  ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 2, y - 18); ctx.quadraticCurveTo(x + 18, y - 52, x + 30, y - 78); ctx.stroke();
  ctx.lineWidth = 0.5; ctx.beginPath();
  for (let t = 0.3; t <= 1; t += 0.045) {
    const px = x + 2 + 28 * t + Math.sin(t * 3) * 2, py = y - 18 - 60 * t, w = Math.sin(t * Math.PI * 0.95) * 9;
    ctx.moveTo(px, py); ctx.quadraticCurveTo(px - w * 0.6, py + 1, px - w, py + 5); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + w * 0.6, py - 1, px + w * 0.9, py + 3);
  }
  ctx.stroke();
}

/** Sepia darkening towards the edges of the sheet, and a little foxing. */
export function paperVignette(ctx: C) {
  const R = rng(8);
  const g = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, 380, MAP_W / 2, MAP_H / 2, 960);
  g.addColorStop(0, 'rgba(96,58,26,0)'); g.addColorStop(1, 'rgba(96,58,26,0.36)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H);
  for (let i = 0; i < 14; i++) { const x = R() * MAP_W, y = R() * MAP_H, r = 2 + R() * 6; const f = ctx.createRadialGradient(x, y, 0, x, y, r); f.addColorStop(0, 'rgba(150,110,60,0.18)'); f.addColorStop(1, 'rgba(150,110,60,0)'); ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
}

/**
 * The keeper of the inkwell: a tall wizard in a patterned robe and a crooked hat,
 * leaning on a quill as long as a staff. Feet at (x, y), facing `dir` (towards the inkwell).
 * While `casting`, the quill is raised and ink drips from its nib.
 */
export function wizard(ctx: C, x: number, y: number, dir: number, time: number, casting: boolean) {
  const R = seed(0, 0, 77);
  groundWash(ctx, x, y + 2, 30, 7, 0.45);
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const sway = Math.sin(time * 0.9) * 1.5;
  const lift = casting ? 1 : 0;
  // the quill-staff, behind the front arm
  const qa = -Math.PI / 2 + (casting ? -0.55 + Math.sin(time * 6) * 0.05 : -0.08);
  const qx = 20, qy = casting ? -54 : -40;
  const tipX = qx + Math.cos(qa + Math.PI) * 44, tipY = qy + Math.sin(qa + Math.PI) * 44;
  const topX = qx + Math.cos(qa) * 52, topY = qy + Math.sin(qa) * 52;
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(topX, topY); ctx.stroke();
  // feather vanes on the upper half
  ctx.lineWidth = 0.5; ctx.beginPath();
  for (let t = 0.35; t <= 1; t += 0.04) {
    const px = qx + Math.cos(qa) * 52 * t, py = qy + Math.sin(qa) * 52 * t, w = Math.sin(((t - 0.35) / 0.65) * Math.PI) * 9 + 1;
    const nx = -Math.sin(qa), ny = Math.cos(qa);
    ctx.moveTo(px, py); ctx.quadraticCurveTo(px + nx * w * 0.6 - Math.cos(qa) * 2, py + ny * w * 0.6 - Math.sin(qa) * 2, px + nx * w - Math.cos(qa) * 4, py + ny * w - Math.sin(qa) * 4);
    ctx.moveTo(px, py); ctx.quadraticCurveTo(px - nx * w * 0.6 - Math.cos(qa) * 2, py - ny * w * 0.6 - Math.sin(qa) * 2, px - nx * w - Math.cos(qa) * 4, py - ny * w - Math.sin(qa) * 4);
  }
  ctx.stroke();
  // nib, and drops of ink while casting
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tipX + Math.cos(qa) * 6 - 1.5, tipY + Math.sin(qa) * 6); ctx.lineTo(tipX + Math.cos(qa) * 6 + 1.5, tipY + Math.sin(qa) * 6); ctx.fill();
  if (casting) for (let i = 0; i < 3; i++) { const t = (time * 1.4 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(tipX, tipY + t * 26, 1.4, 2.2, 0, 0, Math.PI * 2); ctx.globalAlpha = 1 - t; ctx.fill(); ctx.globalAlpha = 1; }

  // robe
  const robe = () => { ctx.beginPath(); ctx.moveTo(-9, -64); ctx.quadraticCurveTo(-16, -30, -20 + sway, 0); ctx.lineTo(20 + sway, 0); ctx.quadraticCurveTo(15, -30, 9, -64); ctx.closePath(); };
  ctx.fillStyle = PAPER; robe(); ctx.fill();
  ctx.save(); robe(); ctx.clip();
  // fold lines
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let i = -3; i <= 3; i++) { ctx.moveTo(i * 2.2, -60); ctx.quadraticCurveTo(i * 4 + sway * 0.5, -30, i * 5.5 + sway, 0); }
  ctx.stroke();
  // patterned bands at the hem: dots on black, a zigzag, crescent moons
  ctx.fillStyle = INK; ctx.fillRect(-24, -11, 48, 5);
  ctx.fillStyle = PAPER; for (let i = -20; i <= 20; i += 4) { ctx.beginPath(); ctx.arc(i + sway, -8.5, 0.9, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath(); for (let i = -22; i <= 22; i += 3) { ctx.lineTo(i + sway, -15); ctx.lineTo(i + 1.5 + sway, -18); } ctx.stroke();
  ctx.fillStyle = INK;
  for (let i = -16; i <= 16; i += 8) { ctx.beginPath(); ctx.arc(i + sway * 0.7, -25, 2, 0.6, Math.PI * 2 - 0.6); ctx.arc(i + 0.9 + sway * 0.7, -25.5, 1.6, Math.PI * 2 - 0.6, 0.6, true); ctx.fill(); }
  // a few stars scattered up the robe
  ctx.lineWidth = 0.5; ctx.beginPath();
  for (let i = 0; i < 7; i++) { const sx = (R() - 0.5) * 20, sy = -34 - R() * 24; ctx.moveTo(sx - 1.6, sy); ctx.lineTo(sx + 1.6, sy); ctx.moveTo(sx, sy - 1.6); ctx.lineTo(sx, sy + 1.6); }
  ctx.stroke();
  ctx.restore();
  ctx.save(); robe(); ctx.clip(); hatch(ctx, () => { ctx.beginPath(); ctx.rect(-30, -70, 18, 72); }, [-30, -70, 18, 72], -1.1, 1.8, 0.45); ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; robe(); ctx.stroke();
  // shoes peeping out, curled at the toe
  ctx.lineWidth = 1; ctx.fillStyle = INK;
  ctx.beginPath(); ctx.moveTo(6 + sway, 0); ctx.quadraticCurveTo(16 + sway, 1, 19 + sway, -3); ctx.lineTo(18 + sway, 1); ctx.lineTo(6 + sway, 2); ctx.fill();

  // the reaching arm and sleeve
  const hx = qx - 2, hy = qy + 2;
  const sleeve = () => { ctx.beginPath(); ctx.moveTo(4, -60); ctx.quadraticCurveTo(14, -58 + lift * -4, hx + 2, hy - 4); ctx.lineTo(hx + 4, hy + 6); ctx.quadraticCurveTo(10, -46 + lift * -4, 2, -48); ctx.closePath(); };
  ctx.fillStyle = PAPER; sleeve(); ctx.fill(); hatch(ctx, sleeve, [0, -66, 30, 30], 0.9, 1.7, 0.45); ctx.strokeStyle = INK; ctx.lineWidth = 1; sleeve(); ctx.stroke();
  ctx.fillStyle = '#eddfc6'; ctx.beginPath(); ctx.arc(hx + 2, hy, 3, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 0.8; ctx.stroke();

  // face, nose, spectacle and beard
  ctx.fillStyle = '#eddfc6'; ctx.beginPath(); ctx.ellipse(1, -72, 7, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#eddfc6'; ctx.beginPath(); ctx.moveTo(6, -75); ctx.quadraticCurveTo(15, -72, 14, -66); ctx.quadraticCurveTo(10, -67, 6, -69); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#cbb99a'; ctx.beginPath(); ctx.arc(4, -75, 2.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(4.6, -75, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4.1, -75.6, 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(1.2, -75); ctx.lineTo(-4, -74); ctx.stroke();
  // bushy brow
  ctx.lineWidth = 0.5; ctx.beginPath(); for (let i = 0; i < 7; i++) { ctx.moveTo(1 + i, -78.5); ctx.lineTo(2 + i * 1.3, -81 - (i % 2)); } ctx.stroke();
  // beard: many flowing lines from cheek to chest
  const bs = Math.sin(time * 1.2) * 1.2;
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(-5, -70); ctx.quadraticCurveTo(-4, -50, 2 + bs, -36); ctx.quadraticCurveTo(10, -50, 11, -66); ctx.quadraticCurveTo(4, -64, -5, -70); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.45; ctx.beginPath();
  for (let i = 0; i < 14; i++) { const sx = -5 + i * 1.15, sy = -70 + Math.abs(i - 7) * 0.5; ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx - 2, sy + 10, sx + 3 + bs, sy + 20, 2 + bs + (i - 7) * 0.4, -36 + Math.abs(i - 7) * 0.6); }
  ctx.stroke();
  ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-5, -70); ctx.quadraticCurveTo(-4, -50, 2 + bs, -36); ctx.quadraticCurveTo(10, -50, 11, -66); ctx.stroke();

  // the tall, crooked hat
  const tip = Math.sin(time * 0.8) * 3;
  const hat = () => { ctx.beginPath(); ctx.moveTo(-10, -80); ctx.quadraticCurveTo(-6, -100, -10 + tip * 0.4, -112); ctx.quadraticCurveTo(-16 + tip, -122, -24 + tip, -120); ctx.quadraticCurveTo(-12 + tip * 0.5, -114, -4, -104); ctx.quadraticCurveTo(4, -92, 10, -80); ctx.closePath(); };
  ctx.fillStyle = PAPER; hat(); ctx.fill();
  hatch(ctx, hat, [-26, -124, 38, 46], -0.9, 1.7, 0.45);
  ctx.save(); hat(); ctx.clip();
  ctx.fillStyle = INK; ctx.fillRect(-14, -86, 30, 4);
  ctx.beginPath(); ctx.arc(-1, -96, 3.4, 0.5, Math.PI * 2 - 0.5); ctx.arc(0.4, -96.8, 2.7, Math.PI * 2 - 0.5, 0.5, true); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; hat(); ctx.stroke();
  // brim
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(0, -80, 16, 3.6, -0.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(0, -80, 11, 2.2, -0.05, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/**
 * Lines of notebook handwriting, written right to left as in old mirror-script notebooks.
 * It is not real text: loops, humps, ascenders and descenders in a running hand.
 */
export function scribble(ctx: C, x: number, y: number, w: number, lines: number, R: R, size = 4.5) {
  ctx.strokeStyle = 'rgba(58,34,18,0.72)'; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
  for (let li = 0; li < lines; li++) {
    const cy = y + li * size * 2.1;
    let cx = x + w - R() * size;
    const end = x + (li === lines - 1 ? w * (0.3 + R() * 0.5) : R() * w * 0.12);
    while (cx > end) {
      const letters = 2 + Math.floor(R() * 6);
      ctx.beginPath(); ctx.moveTo(cx, cy);
      for (let k = 0; k < letters && cx > end; k++) {
        const lw = size * (0.55 + R() * 0.5), t = R();
        if (t < 0.3) ctx.quadraticCurveTo(cx - lw * 0.5, cy - size * 1.1, cx - lw, cy);
        else if (t < 0.5) ctx.bezierCurveTo(cx - lw * 0.1, cy - size * 1.1, cx - lw * 1.1, cy - size, cx - lw * 0.8, cy);
        else if (t < 0.65) { ctx.lineTo(cx - lw * 0.1, cy - size * 2); ctx.quadraticCurveTo(cx - lw * 0.5, cy - size * 2.2, cx - lw * 0.6, cy); }
        else if (t < 0.75) { ctx.lineTo(cx - lw * 0.4, cy + size * 1.4); ctx.quadraticCurveTo(cx - lw * 0.7, cy + size * 1.8, cx - lw * 0.8, cy + size * 1.1); ctx.lineTo(cx - lw * 0.7, cy); }
        else ctx.lineTo(cx - lw, cy - size * 0.5 * R());
        cx -= lw;
      }
      ctx.stroke();
      cx -= size * (1 + R() * 0.6);
    }
  }
}

/** A dark smudge of spilt ink, as on a well-used sheet. */
export function inkSmudge(ctx: C, x: number, y: number, w: number, h: number, R: R) {
  for (let i = 0; i < 26; i++) {
    const px = x + (R() - 0.5) * w, py = y + (R() - 0.5) * h, r = 3 + R() * Math.min(w, h) * 0.3;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(40,22,10,${0.2 + R() * 0.35})`); g.addColorStop(1, 'rgba(40,22,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
}

/** The sheet has been folded: a crease across it, light on one side and dark on the other. */
export function foldCrease(ctx: C, horizontal: boolean, at: number, R: R) {
  const n = horizontal ? MAP_W : MAP_H, pts: Vec[] = [];
  for (let t = 0; t <= n; t += 20) { const o = at + (R() - 0.5) * 3; pts.push(horizontal ? { x: t, y: o } : { x: o, y: t }); }
  const off = (d: number) => pts.map((p) => (horizontal ? { x: p.x, y: p.y + d } : { x: p.x + d, y: p.y }));
  const band = ctx.createLinearGradient(horizontal ? 0 : at - 14, horizontal ? at - 14 : 0, horizontal ? 0 : at + 14, horizontal ? at + 14 : 0);
  band.addColorStop(0, 'rgba(80,50,24,0)'); band.addColorStop(0.5, 'rgba(80,50,24,0.12)'); band.addColorStop(1, 'rgba(80,50,24,0)');
  ctx.fillStyle = band; if (horizontal) ctx.fillRect(0, at - 14, MAP_W, 28); else ctx.fillRect(at - 14, 0, 28, MAP_H);
  ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,244,220,0.45)'; polyline(ctx, off(-1.2)); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,34,14,0.4)'; polyline(ctx, off(0.8)); ctx.stroke();
}


// ── Courtyard towers ────────────────────────────────────────────────────────

/** A crouching stone gargoyle with bat wings on a fluted pillar. */
function courtGargoyle(ctx: C, x: number, y: number, time: number, R: R) {
  // pillar: plinth, fluted shaft, capital
  const plinth = () => { ctx.beginPath(); ctx.rect(x - 16, y - 9, 32, 9); };
  const shaft = () => { ctx.beginPath(); ctx.moveTo(x - 10, y - 9); ctx.lineTo(x - 9, y - 56); ctx.lineTo(x + 9, y - 56); ctx.lineTo(x + 10, y - 9); ctx.closePath(); };
  const cap = () => { ctx.beginPath(); ctx.rect(x - 15, y - 64, 30, 8); };
  for (const part of [plinth, shaft, cap]) { ctx.fillStyle = PAPER; part(); ctx.fill(); }
  ctx.save(); shaft(); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let i = -8; i <= 8; i += 2.6) { ctx.moveTo(x + i, y - 9); ctx.lineTo(x + i * 0.92, y - 56); }
  ctx.stroke(); ctx.restore();
  hatch(ctx, () => { ctx.beginPath(); ctx.rect(x + 3, y - 66, 14, 66); }, [x + 3, y - 66, 14, 66], -0.3, 1.7, 0.5, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; for (const part of [plinth, shaft, cap]) { part(); ctx.stroke(); }
  // volutes on the capital
  ctx.lineWidth = 0.7;
  for (const sx of [-1, 1]) { ctx.beginPath(); for (let t = 0; t < 9; t += 0.3) { const r = 3.2 - t * 0.33; ctx.lineTo(x + sx * 13 + Math.cos(t) * r * sx, y - 60 + Math.sin(t) * r); } ctx.stroke(); }
  // wings, raised behind, flexing a little
  const flex = Math.sin(time * 1.3) * 2;
  for (const sx of [-1, 1]) {
    const wing = () => {
      ctx.beginPath(); ctx.moveTo(x + sx * 4, y - 80);
      ctx.quadraticCurveTo(x + sx * 16, y - 108 - flex, x + sx * 34, y - 112 - flex);
      ctx.quadraticCurveTo(x + sx * 30, y - 98, x + sx * 33, y - 88);
      ctx.quadraticCurveTo(x + sx * 25, y - 92, x + sx * 24, y - 82);
      ctx.quadraticCurveTo(x + sx * 17, y - 86, x + sx * 14, y - 76);
      ctx.closePath();
    };
    ctx.fillStyle = PAPER; wing(); ctx.fill();
    hatch(ctx, wing, [x - 36, y - 116, 72, 44], sx > 0 ? -0.6 : 0.6, 1.5, 0.45);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.1; wing(); ctx.stroke();
    ctx.lineWidth = 0.7; ctx.beginPath();
    for (const [tx, ty] of [[33, -88], [24, -82], [14, -76]]) { ctx.moveTo(x + sx * 5, y - 82); ctx.lineTo(x + sx * tx, y + ty); }
    ctx.stroke();
  }
  // crouching body
  const body = () => { ctx.beginPath(); ctx.moveTo(x - 13, y - 64); ctx.quadraticCurveTo(x - 17, y - 84, x - 4, y - 90); ctx.quadraticCurveTo(x + 10, y - 92, x + 12, y - 80); ctx.quadraticCurveTo(x + 15, y - 70, x + 13, y - 64); ctx.closePath(); };
  ctx.fillStyle = PAPER; body(); ctx.fill();
  hatch(ctx, body, [x - 18, y - 94, 34, 32], -0.9, 1.6, 0.45, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; body(); ctx.stroke();
  // haunch and claws gripping the capital
  ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(x - 7, y - 70, 6, 5, -0.3, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); for (const cx of [x - 11, x - 7, x + 6, x + 10]) { ctx.moveTo(cx, y - 64); ctx.lineTo(cx + 1, y - 61); } ctx.stroke();
  // tail curling down the pillar
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 12, y - 66); ctx.bezierCurveTo(x - 22, y - 50, x - 6, y - 40, x - 14, y - 28); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 14, y - 28); ctx.lineTo(x - 18, y - 22); ctx.lineTo(x - 11, y - 25); ctx.fill();
  // horned head leaning out, mouth open
  const head = () => { ctx.beginPath(); ctx.moveTo(x + 4, y - 90); ctx.quadraticCurveTo(x + 6, y - 100, x + 15, y - 98); ctx.lineTo(x + 24, y - 92); ctx.lineTo(x + 22, y - 88); ctx.lineTo(x + 15, y - 88); ctx.lineTo(x + 21, y - 84); ctx.quadraticCurveTo(x + 12, y - 80, x + 6, y - 84); ctx.closePath(); };
  ctx.fillStyle = PAPER; head(); ctx.fill();
  hatch(ctx, head, [x + 2, y - 102, 24, 24], 0.9, 1.6, 0.4);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.1; head(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x + 15, y - 88); ctx.lineTo(x + 22, y - 88); ctx.lineTo(x + 21, y - 84); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAPER; ctx.beginPath(); for (const tx of [16.5, 19]) { ctx.moveTo(x + tx, y - 88); ctx.lineTo(x + tx + 1, y - 86.4); ctx.lineTo(x + tx + 2, y - 88); } ctx.fill();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 7, y - 97); ctx.quadraticCurveTo(x + 2, y - 106, x - 2, y - 104); ctx.moveTo(x + 11, y - 98); ctx.quadraticCurveTo(x + 10, y - 108, x + 5, y - 109); ctx.stroke();
  eye(ctx, x + 13, y - 93, 2.4, 0.35, time % 5.3 < 0.14);
}

/** A stone platform carrying a wooden throwing engine, its sling loaded. */
function courtMangonel(ctx: C, x: number, y: number, time: number, R: R) {
  const base = () => { ctx.beginPath(); ctx.rect(x - 22, y - 42, 44, 42); };
  ctx.fillStyle = PAPER; base(); ctx.fill();
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let yy = y - 38; yy < y; yy += 6) for (let xx = x - 20 + (((yy - y) / 6) % 2 ? 6 : 0); xx < x + 20; xx += 12) { ctx.moveTo(xx, yy); ctx.lineTo(xx + 9, yy); ctx.moveTo(xx + 10, yy); ctx.lineTo(xx + 10, yy + 6); }
  ctx.stroke();
  hatch(ctx, () => { ctx.beginPath(); ctx.rect(x + 6, y - 42, 16, 42); }, [x + 6, y - 42, 16, 42], -0.3, 1.6, 0.5, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; base(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.lineWidth = 1;
  for (let xx = x - 22; xx < x + 22; xx += 11) { ctx.fillRect(xx, y - 48, 6, 6); ctx.strokeRect(xx, y - 48, 6, 6); }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 4, y - 12); ctx.arc(x, y - 12, 4, Math.PI, 0); ctx.lineTo(x + 4, y); ctx.fill();
  // the engine: A-frame, a long arm on its axle, counterweight and sling
  const ax = x, ay = y - 80, a = -2.45 + Math.sin(time * 0.9) * 0.05;
  const longX = ax + Math.cos(a) * 46, longY = ay + Math.sin(a) * 46;
  const shortX = ax - Math.cos(a) * 18, shortY = ay - Math.sin(a) * 18;
  const segs: Seg[] = [
    { x1: x - 16, y1: y - 48, x2: ax - 2, y2: ay, w: 4.5 }, { x1: x + 16, y1: y - 48, x2: ax + 2, y2: ay, w: 4.5 },
    { x1: x - 18, y1: y - 49, x2: x + 18, y2: y - 49, w: 4 },
    { x1: shortX, y1: shortY, x2: longX, y2: longY, w: 5 },
  ];
  limbs(ctx, segs, R, false);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ax, ay, 2.6, 0, Math.PI * 2); ctx.fill();
  // counterweight box
  ctx.save(); ctx.translate(shortX, shortY); ctx.rotate(a + Math.PI / 2);
  const box = () => { ctx.beginPath(); ctx.rect(-8, -2, 16, 14); };
  ctx.fillStyle = PAPER; box(); ctx.fill(); hatch(ctx, box, [-8, -2, 16, 14], 0.8, 1.4, 0.5); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; box(); ctx.stroke();
  ctx.restore();
  // sling and boulder
  const bx = longX + 4, by = longY + 16 + Math.sin(time * 1.8) * 1.5;
  ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(longX, longY); ctx.lineTo(bx - 4, by - 3); ctx.moveTo(longX, longY); ctx.lineTo(bx + 4, by - 3); ctx.stroke();
  const rock = () => { ctx.beginPath(); ctx.ellipse(bx, by, 6, 5.2, 0.3, 0, Math.PI * 2); };
  ctx.fillStyle = '#d9d1c0'; rock(); ctx.fill(); hatch(ctx, rock, [bx - 6, by - 6, 12, 12], 0.9, 1.3, 0.45); ctx.lineWidth = 1; rock(); ctx.stroke();
}

/** A two-tier stone fountain; a striped fish on top spouts ink into the basins. */
function courtFountain(ctx: C, x: number, y: number, time: number) {
  // lower basin
  const bowl = () => { ctx.beginPath(); ctx.moveTo(x - 30, y - 16); ctx.quadraticCurveTo(x - 26, y + 1, x, y + 1); ctx.quadraticCurveTo(x + 26, y + 1, x + 30, y - 16); ctx.closePath(); };
  ctx.fillStyle = PAPER; bowl(); ctx.fill();
  hatch(ctx, bowl, [x - 30, y - 18, 60, 20], -0.5, 1.6, 0.45);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; bowl(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(x, y - 16, 31, 8.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.ellipse(x, y - 16, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(239,233,218,0.55)'; ctx.lineWidth = 0.6;
  for (let k = 1; k <= 2; k++) { const r = ((time * 0.6 + k / 2) % 1); ctx.beginPath(); ctx.ellipse(x + 4, y - 16, 6 + r * 18, 1.5 + r * 4, 0, 0, Math.PI * 2); ctx.stroke(); }
  // pedestal and upper basin
  const col = () => { ctx.beginPath(); ctx.moveTo(x - 5, y - 18); ctx.lineTo(x - 4, y - 48); ctx.lineTo(x + 4, y - 48); ctx.lineTo(x + 5, y - 18); ctx.closePath(); };
  ctx.fillStyle = PAPER; col(); ctx.fill(); hatch(ctx, () => { ctx.beginPath(); ctx.rect(x + 1, y - 50, 5, 34); }, [x + 1, y - 50, 5, 34], -0.2, 1.3, 0.45);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.1; col(); ctx.stroke();
  const up = () => { ctx.beginPath(); ctx.moveTo(x - 15, y - 50); ctx.quadraticCurveTo(x - 10, y - 42, x, y - 42); ctx.quadraticCurveTo(x + 10, y - 42, x + 15, y - 50); ctx.closePath(); };
  ctx.fillStyle = PAPER; up(); ctx.fill(); hatch(ctx, up, [x - 15, y - 52, 30, 12], -0.5, 1.4, 0.45); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; up(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(x, y - 50, 15.5, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.ellipse(x, y - 50, 12.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  // the fish spout, nose to the sky
  ctx.save(); ctx.translate(x - 1, y - 62); ctx.rotate(-0.9); airFish(ctx, 0, 0, 0.72, 1, time * 3); ctx.restore();
  // jets of ink arcing down into both basins, with droplets running along them
  const mx = x + 4, my = y - 72;
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
  const arcs: [number, number, number, number][] = [[mx, my, x + 14, y - 50], [mx, my, x + 24, y - 18], [mx, my, x - 20, y - 18]];
  for (const [sx, sy, ex, ey] of arcs) {
    const cx = (sx + ex) / 2 + (ex > sx ? 6 : -10), cy = Math.min(sy, ey) - 16;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    for (let k = 0; k < 3; k++) {
      const t = (time * 0.9 + k / 3) % 1, u = 1 - t;
      const px = u * u * sx + 2 * u * t * cx + t * t * ex, py = u * u * sy + 2 * u * t * cy + t * t * ey;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(px, py, 1.4, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/** A tall banner pole with a long swallow-tailed pennant streaming in the wind. */
function courtBanner(ctx: C, x: number, y: number, time: number, R: R) {
  groundWash(ctx, x + 4, y + 2, 28, 8, 0.3);
  // round stone plinth
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 12, y - 14); ctx.lineTo(x + 12, y - 14); ctx.lineTo(x + 14, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  hatch(ctx, () => { ctx.beginPath(); ctx.rect(x + 3, y - 15, 12, 15); }, [x + 3, y - 15, 12, 15], -0.4, 1.5, 0.45);
  ctx.beginPath(); ctx.ellipse(x, y - 14, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // the pole and crossbar
  limbs(ctx, [{ x1: x, y1: y - 14, x2: x, y2: y - 112, w: 5 }, { x1: x - 3, y1: y - 104, x2: x + 12, y2: y - 104, w: 3 }], R, false);
  // finial: a gilt crescent
  ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(x, y - 120, 5, 0.5, Math.PI * 2 - 0.5); ctx.arc(x + 2, y - 121, 4, Math.PI * 2 - 0.5, 0.5, true); ctx.closePath(); ctx.fill(); ctx.stroke();
  // pennant, rippling
  const N = 14, len = 58, top: Vec[] = [], bot: Vec[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, px = x + 3 + t * len;
    const wave = Math.sin(time * 3.2 - t * 5) * 5 * t;
    const h = 24 - t * 8;
    top.push({ x: px, y: y - 104 + wave });
    bot.push({ x: px, y: y - 104 + h + wave * 1.1 });
  }
  const flag = () => {
    ctx.beginPath(); ctx.moveTo(top[0].x, top[0].y);
    for (const p of top) ctx.lineTo(p.x, p.y);
    const end = top[N], endB = bot[N];
    ctx.lineTo((end.x + endB.x) / 2 - 12, (end.y + endB.y) / 2);
    for (let i = N; i >= 0; i--) ctx.lineTo(bot[i].x, bot[i].y);
    ctx.closePath();
  };
  ctx.fillStyle = PAPER; flag(); ctx.fill();
  ctx.save(); flag(); ctx.clip();
  // two dark bands and a fold-shadow hatch
  ctx.fillStyle = INK;
  for (const band of [0.5, 0.75]) { const i = Math.round(band * N); ctx.beginPath(); ctx.moveTo(top[i].x, top[i].y); ctx.lineTo(top[i].x + 5, top[i].y); ctx.lineTo(bot[i].x + 5, bot[i].y); ctx.lineTo(bot[i].x, bot[i].y); ctx.fill(); }
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let i = 1; i < N; i++) if (Math.sin(time * 3.2 - (i / N) * 5) > 0.2) { ctx.moveTo(top[i].x, top[i].y); ctx.lineTo(bot[i].x, bot[i].y); }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.1; flag(); ctx.stroke();
  // the emblem: an eye in a ring, like the Verdigris flower's
  const ex = top[3].x + 3, ey = (top[3].y + bot[3].y) / 2;
  ctx.fillStyle = PAPER; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  eye(ctx, ex, ey, 4.2, 0.2);
}


/** A lean war dog at full gallop, in a studded collar. Feet at (x, y), facing `dir`; `bob` is the stride. */
export function warDog(ctx: C, x: number, y: number, dir: number, bob: number) {
  const R = seed(0, 0, 21);
  groundWash(ctx, x, y + 1, 15, 3.5, 0.4);
  ctx.save(); ctx.translate(x, y - Math.abs(Math.sin(bob)) * 2); ctx.scale(dir, 1);
  const g = Math.sin(bob), h = Math.cos(bob);
  // legs: front pair reach while the hind pair push, then swap
  ctx.strokeStyle = INK; ctx.lineCap = 'round';
  const leg = (hx: number, hy: number, a1: number, a2: number, w: number) => {
    const kx = hx + Math.sin(a1) * 7, ky = hy + Math.cos(a1) * 7;
    const fx = kx + Math.sin(a2) * 7, fy = Math.min(0, ky + Math.cos(a2) * 7);
    ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.lineTo(fx + 2.5, fy); ctx.stroke();
  };
  leg(-9, -12, 0.6 + g * 0.6, -0.3 + g * 0.5, 1.6);   // far hind
  leg(8, -11, -0.5 + h * 0.6, 0.4 + h * 0.4, 1.6);    // far fore
  // body: deep chest, tucked waist
  const body = () => {
    ctx.beginPath(); ctx.moveTo(-13, -16);
    ctx.quadraticCurveTo(-4, -21, 6, -19); ctx.quadraticCurveTo(12, -18, 13, -14);
    ctx.quadraticCurveTo(13, -8, 8, -8); ctx.quadraticCurveTo(0, -11, -6, -10);
    ctx.quadraticCurveTo(-12, -9, -14, -13); ctx.closePath();
  };
  ctx.fillStyle = PAPER; body(); ctx.fill();
  hatch(ctx, body, [-15, -22, 30, 15], -0.9, 2.2, 0.35, INK, R);
  // short coat: ticks along the back
  ctx.save(); body(); ctx.clip(); ctx.fillStyle = sepia(0.35); ctx.fillRect(-16, -22, 32, 5); ctx.restore();
  ctx.lineWidth = 1.1; body(); ctx.stroke();
  // tail, raised in a curve
  ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-13, -15); ctx.quadraticCurveTo(-20, -18 + g * 2, -21, -25 + g * 2); ctx.stroke();
  // near legs
  leg(-8, -11, -0.6 - g * 0.6, 0.3 - g * 0.5, 2);
  leg(9, -10, 0.5 - h * 0.6, -0.4 - h * 0.4, 2);
  // neck and head with a long muzzle and pricked ears
  const head = () => {
    ctx.beginPath(); ctx.moveTo(9, -17); ctx.quadraticCurveTo(13, -25, 18, -25);
    ctx.lineTo(25, -22); ctx.lineTo(25, -20); ctx.lineTo(18, -19); ctx.quadraticCurveTo(14, -15, 12, -13); ctx.closePath();
  };
  ctx.fillStyle = PAPER; head(); ctx.fill();
  hatch(ctx, head, [9, -27, 17, 15], 0.9, 2.2, 0.3);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.1; head(); ctx.stroke();
  // a soft ear folded back along the skull
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(16.5, -24.5); ctx.quadraticCurveTo(13, -27, 11.5, -23.5); ctx.lineTo(14.5, -23); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(25, -21, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(19, -22.6, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(24, -19.6); ctx.lineTo(19, -19.4); ctx.stroke();
  // studded collar
  ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(11.5, -22); ctx.lineTo(14.5, -15.5); ctx.stroke();
  ctx.fillStyle = PAPER; for (const t of [0.25, 0.6, 0.9]) { ctx.beginPath(); ctx.arc(11.5 + 3 * t, -22 + 6.5 * t, 0.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}


// ── Rare creatures ──────────────────────────────────────────────────────────

/** One of the very rare creatures, feet (or shadow) at (x, y), facing `dir`. */
export function rareInk(ctx: C, type: 'moth' | 'heron' | 'tortoise' | 'snail' | 'hare', x: number, y: number, dir: number, bob: number) {
  const R = seed(0, 0, 40 + type.length);
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  if (type === 'moth') {
    // a great moth with eyes on its wings, carrying a lantern
    groundWash(ctx, 0, 1, 14, 4, 0.3);
    const h = -30 + Math.sin(bob * 0.7) * 4, f = Math.sin(bob * 2.2);
    ctx.save(); ctx.translate(0, h);
    for (const side of [-1, 1]) {
      const wing = () => { ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(side * 10, -22 - f * 4, side * 24, -14 - f * 5); ctx.quadraticCurveTo(side * 26, -2, side * 14, 2); ctx.quadraticCurveTo(side * 20, 10 + f * 2, side * 10, 14); ctx.quadraticCurveTo(side * 4, 8, 0, 2); ctx.closePath(); };
      ctx.fillStyle = PAPER; wing(); ctx.fill();
      hatch(ctx, wing, [-28, -28, 56, 44], side > 0 ? 0.7 : -0.7, 2, 0.4, INK, R);
      ctx.strokeStyle = INK; ctx.lineWidth = 1; wing(); ctx.stroke();
      ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(side * 14, -10 - f * 3, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      eye(ctx, side * 14, -10 - f * 3, 3.6, 0);
    }
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(0, 2, 3.4, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.5; ctx.beginPath(); for (let k = -6; k <= 10; k += 3) { ctx.moveTo(-3.2, k); ctx.lineTo(3.2, k); } ctx.stroke();
    // feathered antennae
    ctx.lineWidth = 0.7; ctx.beginPath();
    for (const side of [-1, 1]) { ctx.moveTo(0, -8); ctx.quadraticCurveTo(side * 6, -18, side * 10, -20); for (let t = 0.3; t < 1; t += 0.15) { const px = side * 10 * t, py = -8 - 12 * t; ctx.moveTo(px, py); ctx.lineTo(px + side * 2, py - 2); } }
    ctx.stroke();
    // the lantern on a thread, glowing
    ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 20); ctx.stroke();
    const g = ctx.createRadialGradient(0, 25, 0, 0, 25, 14); g.addColorStop(0, 'rgba(250,215,120,0.75)'); g.addColorStop(1, 'rgba(250,215,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 25, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0cf7a'; ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.rect(-3.5, 20, 7, 9); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4.5, 20); ctx.lineTo(0, 17); ctx.lineTo(4.5, 20); ctx.stroke();
    ctx.restore();
  } else if (type === 'heron') {
    // a heron of brass gears, stepping delicately
    groundWash(ctx, 0, 1, 14, 4, 0.35);
    const st = Math.sin(bob) * 5;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-2, -24); ctx.lineTo(-4 + st * 0.4, -12); ctx.lineTo(-3 + st, 0); ctx.moveTo(2, -24); ctx.lineTo(4 - st * 0.4, -12); ctx.lineTo(3 - st, 0); ctx.stroke();
    ctx.beginPath(); for (const fx of [-3 + st, 3 - st]) { ctx.moveTo(fx - 3, 0); ctx.lineTo(fx + 4, 0); } ctx.stroke();
    const body = () => { ctx.beginPath(); ctx.ellipse(-2, -30, 13, 8, -0.15, 0, Math.PI * 2); };
    ctx.fillStyle = PAPER; body(); ctx.fill(); hatch(ctx, body, [-16, -40, 28, 20], -0.8, 2.4, 0.4); ctx.lineWidth = 1.1; body(); ctx.stroke();
    // gears showing through
    for (const [gx, gy, gr, sp] of [[-5, -30, 5, 1], [3, -28, 3.4, -1.5]] as [number, number, number, number][]) {
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(bob * sp * 0.5);
      ctx.fillStyle = '#e2c98a'; ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? gr : gr + 1.4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.lineWidth = 0.7; ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // tail plumes, S-curved neck, dagger beak
    ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-14, -30 + i); ctx.lineTo(-22, -26 + i * 2.2); } ctx.stroke();
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(8, -34); ctx.bezierCurveTo(16, -40, 4, -48, 12, -56); ctx.stroke();
    ctx.fillStyle = PAPER; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(13, -58, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(16, -59); ctx.lineTo(30, -57); ctx.lineTo(16, -56); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(13.5, -58.6, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(11, -60); ctx.quadraticCurveTo(4, -62, 0, -60); ctx.stroke();
  } else if (type === 'tortoise') {
    // an old tortoise whose shell is a steaming teapot
    groundWash(ctx, 0, 1, 22, 5, 0.4);
    const st = Math.sin(bob) * 2;
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    for (const [lx, o] of [[-12, st], [10, -st]] as [number, number][]) { ctx.beginPath(); ctx.ellipse(lx + o, -3, 4, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // head on a wrinkled neck
    const head = () => { ctx.beginPath(); ctx.moveTo(14, -10); ctx.quadraticCurveTo(22, -12, 26, -8); ctx.quadraticCurveTo(27, -3, 22, -3); ctx.quadraticCurveTo(18, -4, 14, -5); ctx.closePath(); };
    ctx.fillStyle = PAPER; head(); ctx.fill(); hatch(ctx, head, [14, -13, 14, 11], 1.2, 1.8, 0.4); ctx.lineWidth = 1; head(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(23, -8.5, 0.9, 0, Math.PI * 2); ctx.fill();
    // the teapot shell, its spout behind and lid on top
    const pot = () => { ctx.beginPath(); ctx.moveTo(-18, -5); ctx.quadraticCurveTo(-20, -24, 0, -26); ctx.quadraticCurveTo(20, -24, 18, -5); ctx.closePath(); };
    ctx.fillStyle = PAPER; pot(); ctx.fill();
    ctx.save(); pot(); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath();
    for (const yy of [-10, -16]) { ctx.moveTo(-20, yy); ctx.quadraticCurveTo(0, yy + 2, 20, yy); }
    ctx.stroke(); ctx.fillStyle = 'rgba(122,40,32,0.35)'; ctx.fillRect(-20, -16, 40, 6); ctx.restore();
    ctx.save(); pot(); ctx.clip(); hatch(ctx, () => { ctx.beginPath(); ctx.rect(4, -28, 18, 26); }, [4, -28, 18, 26], -0.5, 2, 0.4); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; pot(); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-16, -14); ctx.quadraticCurveTo(-26, -16, -28, -26); ctx.stroke();
    ctx.fillStyle = PAPER; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -26, 7, 2.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -29, 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // steam from the spout
    ctx.lineWidth = 0.7;
    for (let k = 0; k < 2; k++) { const t = (bob * 0.15 + k / 2) % 1; ctx.strokeStyle = `rgba(29,25,21,${0.7 * (1 - t)})`; ctx.beginPath(); for (let a = 0; a < 6; a += 0.3) { const r = 1 + a * 0.6; const px = -28 + Math.cos(a) * r - t * 4, py = -28 - t * 14 - a * 1.2 + Math.sin(a) * r * 0.5; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
  } else if (type === 'snail') {
    // a snail carrying a cathedral, spires and all
    groundWash(ctx, 0, 1, 26, 5, 0.4);
    const stretch = Math.sin(bob * 0.5) * 2;
    const foot = () => { ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(0, 2, 20 + stretch, 0); ctx.quadraticCurveTo(28 + stretch, -2, 27 + stretch, -9); ctx.quadraticCurveTo(22 + stretch, -11, 16, -6); ctx.lineTo(-22, -4); ctx.closePath(); };
    ctx.fillStyle = PAPER; foot(); ctx.fill(); hatch(ctx, foot, [-22, -12, 52, 14], 0.3, 2.4, 0.35); ctx.strokeStyle = INK; ctx.lineWidth = 1; foot(); ctx.stroke();
    ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(24 + stretch, -9); ctx.lineTo(28 + stretch, -20); ctx.moveTo(22 + stretch, -9); ctx.lineTo(23 + stretch, -19); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(28 + stretch, -20.5, 1.4, 0, Math.PI * 2); ctx.arc(23 + stretch, -19.5, 1.2, 0, Math.PI * 2); ctx.fill();
    // the shell: a spiral base, a nave and two spires
    ctx.fillStyle = PAPER; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(-4, -12, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.7; ctx.beginPath(); for (let t = 0; t < 14; t += 0.2) { const r = 10 - t * 0.7; ctx.lineTo(-4 + Math.cos(t) * r, -12 + Math.sin(t) * r); } ctx.stroke();
    const R2 = rng(17);
    turret(ctx, -10, -18, 14, 18, 12, 'crescent', false, R2);
    turret(ctx, 3, -18, 12, 26, 16, 'orb', true, R2);
  } else {
    // a hare of beaten gold leaf, gone in a blink
    groundWash(ctx, 0, 1, 14, 3.5, 0.35);
    const g = Math.sin(bob * 1.2);
    const body = () => {
      ctx.beginPath(); ctx.moveTo(-14, -8); ctx.quadraticCurveTo(-12, -20, 2, -18); ctx.quadraticCurveTo(10, -18, 13, -14);
      ctx.lineTo(16, -26 - g); ctx.lineTo(18, -26 - g); ctx.lineTo(17, -16); ctx.lineTo(20, -28 - g); ctx.lineTo(22, -27 - g); ctx.lineTo(19, -15);
      ctx.quadraticCurveTo(24, -12, 22, -9); ctx.lineTo(16, -9);
      ctx.lineTo(14 + g * 6, -2); ctx.lineTo(10 + g * 6, -2); ctx.lineTo(9, -8);
      ctx.lineTo(-4, -8); ctx.lineTo(-10 - g * 6, 0); ctx.lineTo(-15 - g * 6, 0); ctx.lineTo(-12, -6); ctx.closePath();
    };
    const gl = ctx.createLinearGradient(-14, -28, 20, 0); gl.addColorStop(0, '#f6dd8a'); gl.addColorStop(0.5, GOLD); gl.addColorStop(1, '#8a6418');
    ctx.fillStyle = gl; body(); ctx.fill();
    hatch(ctx, body, [-16, -30, 40, 30], -0.9, 2.4, 0.35);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.1; body(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(18, -14, 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(-15, -9, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // a glint running along the gold
    const t = (bob * 0.3) % 1;
    ctx.strokeStyle = `rgba(255,250,225,${0.9 * Math.sin(t * Math.PI)})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-10 + t * 26, -18); ctx.lineTo(-7 + t * 26, -12); ctx.stroke();
  }
  ctx.restore();
}


// ── Keep towers ─────────────────────────────────────────────────────────────

/** A suit of armour on its stand: plumed helm, crescent shield and a tall halberd. */
function keepArmour(ctx: C, x: number, y: number, time: number, R: R) {
  groundWash(ctx, x + 4, y + 2, 28, 7, 0.35);
  // plinth
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.fillRect(x - 18, y - 8, 36, 8); ctx.strokeRect(x - 18, y - 8, 36, 8);
  // greaves and sabatons
  const leg = (lx: number) => { ctx.beginPath(); ctx.moveTo(lx - 4, y - 8); ctx.lineTo(lx - 5, y - 36); ctx.lineTo(lx + 5, y - 36); ctx.lineTo(lx + 4, y - 8); ctx.closePath(); };
  for (const lx of [-7, 7]) { ctx.fillStyle = PAPER; leg(x + lx); ctx.fill(); hatch(ctx, () => leg(x + lx), [x + lx - 6, y - 38, 12, 30], 0, 2.2, 0.4); ctx.lineWidth = 1; leg(x + lx); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x + lx, y - 24, 4, 2, 0, 0, Math.PI * 2); ctx.stroke(); }
  // tassets and breastplate
  const chest = () => { ctx.beginPath(); ctx.moveTo(x - 14, y - 36); ctx.lineTo(x - 15, y - 62); ctx.quadraticCurveTo(x, y - 70, x + 15, y - 62); ctx.lineTo(x + 14, y - 36); ctx.quadraticCurveTo(x, y - 32, x - 14, y - 36); ctx.closePath(); };
  ctx.fillStyle = PAPER; chest(); ctx.fill();
  ctx.save(); chest(); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let k = -12; k <= 12; k += 2.4) { ctx.moveTo(x + k, y - 70); ctx.quadraticCurveTo(x + k * 0.6, y - 52, x + k, y - 34); }
  ctx.stroke(); ctx.fillStyle = sepia(0.3); ctx.fillRect(x + 4, y - 72, 14, 40); ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; chest(); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y - 66); ctx.lineTo(x, y - 38); ctx.stroke();
  // pauldrons
  for (const sx of [-1, 1]) { ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(x + sx * 15, y - 62, 7, 5, sx * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // helm with visor slits and a plume that stirs
  const helm = () => { ctx.beginPath(); ctx.moveTo(x - 8, y - 66); ctx.lineTo(x - 9, y - 80); ctx.quadraticCurveTo(x, y - 92, x + 9, y - 80); ctx.lineTo(x + 8, y - 66); ctx.closePath(); };
  ctx.fillStyle = PAPER; helm(); ctx.fill(); hatch(ctx, helm, [x - 10, y - 92, 20, 26], -0.4, 2, 0.4); ctx.lineWidth = 1.2; helm(); ctx.stroke();
  ctx.fillStyle = INK; for (const vy of [-78, -75]) ctx.fillRect(x - 6, y + vy, 12, 1.4);
  const sway = Math.sin(time * 1.4) * 3;
  ctx.lineWidth = 0.7; ctx.beginPath();
  for (let i = 0; i < 8; i++) { ctx.moveTo(x, y - 90); ctx.quadraticCurveTo(x - 6 - i + sway, y - 104 - i, x - 16 - i * 1.4 + sway, y - 96 + i * 1.2); }
  ctx.stroke();
  // halberd in the right gauntlet
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 22, y - 4); ctx.lineTo(x + 22, y - 108); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 22, y - 108); ctx.lineTo(x + 32, y - 96); ctx.quadraticCurveTo(x + 34, y - 88, x + 22, y - 86); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 22, y - 116); ctx.lineTo(x + 25, y - 108); ctx.lineTo(x + 19, y - 108); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(x + 20, y - 56, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // kite shield with a crescent, on the left arm
  const shield = () => { ctx.beginPath(); ctx.moveTo(x - 30, y - 62); ctx.lineTo(x - 12, y - 62); ctx.quadraticCurveTo(x - 12, y - 32, x - 21, y - 20); ctx.quadraticCurveTo(x - 30, y - 32, x - 30, y - 62); ctx.closePath(); };
  ctx.fillStyle = PAPER; shield(); ctx.fill(); hatch(ctx, shield, [x - 31, y - 63, 20, 44], 0.9, 2.2, 0.4, INK, R); ctx.lineWidth = 1.2; shield(); ctx.stroke();
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x - 21, y - 46, 6, 0.6, Math.PI * 2 - 0.6); ctx.arc(x - 19, y - 47, 5, Math.PI * 2 - 0.6, 0.6, true); ctx.closePath(); ctx.fill(); ctx.lineWidth = 0.6; ctx.stroke();
}

/** A tall bookcase whose books keep flapping up off the shelves like birds. */
function keepBooks(ctx: C, x: number, y: number, time: number, R: R) {
  groundWash(ctx, x + 4, y + 2, 30, 7, 0.35);
  const w = 42, h = 82, L = x - w / 2, top = y - h;
  ctx.fillStyle = PAPER; ctx.fillRect(L, top, w, h);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.strokeRect(L, top, w, h);
  ctx.beginPath(); ctx.moveTo(L - 3, top); ctx.lineTo(L + w + 3, top); ctx.lineTo(L + w, top - 5); ctx.lineTo(L, top - 5); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const sy = top + 4 + i * 19;
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, sy + 16); ctx.lineTo(L + w, sy + 16); ctx.stroke();
    let bx = L + 2;
    while (bx < L + w - 4) {
      const bw = 2.5 + R() * 3, bh = 9 + R() * 6;
      ctx.fillStyle = R() < 0.3 ? 'rgba(122,40,38,0.45)' : R() < 0.55 ? sepia(0.4) : PAPER;
      ctx.fillRect(bx, sy + 16 - bh, bw, bh); ctx.lineWidth = 0.45; ctx.strokeRect(bx, sy + 16 - bh, bw, bh);
      bx += bw + 0.4;
    }
  }
  hatch(ctx, () => { ctx.beginPath(); ctx.rect(L + w - 8, top, 8, h); }, [L + w - 8, top, 8, h], -0.3, 1.8, 0.45);
  // books in flight, wings beating
  for (let k = 0; k < 4; k++) {
    const ph = time * 0.5 + k * 0.27, t = ph % 1;
    const bx = x - 22 + k * 15 + Math.sin(ph * 6 + k) * 8, by = top - 10 - t * 40 - k * 4;
    const flap = Math.sin(time * 9 + k * 2) * 0.7;
    ctx.save(); ctx.translate(bx, by); ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 0.9;
    for (const side of [-1, 1]) { ctx.save(); ctx.scale(side, 1); ctx.rotate(-0.4 - flap * 0.6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, -2); ctx.lineTo(9, 4); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.lineWidth = 0.4; ctx.beginPath(); for (let l = 1; l < 4; l++) { ctx.moveTo(2, l * 1.2); ctx.lineTo(8, l * 1.2 - 1); } ctx.stroke(); ctx.lineWidth = 0.9; ctx.restore(); }
    ctx.fillStyle = 'rgba(122,40,38,0.7)'; ctx.fillRect(-1, -1, 2, 6);
    ctx.restore();
  }
}

/** A great iron wheel of candles hung from a gibbet post, dripping wax. */
function keepChandelier(ctx: C, x: number, y: number, time: number, R: R) {
  groundWash(ctx, x + 4, y + 2, 30, 7, 0.35);
  limbs(ctx, [{ x1: x - 14, y1: y, x2: x - 14, y2: y - 112, w: 5 }, { x1: x - 18, y1: y - 108, x2: x + 26, y2: y - 108, w: 4 }, { x1: x - 14, y1: y - 90, x2: x + 2, y2: y - 106, w: 2.6 }], R, false);
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.fillRect(x - 26, y - 8, 26, 8); ctx.strokeRect(x - 26, y - 8, 26, 8);
  // chain swinging gently
  const sw = Math.sin(time * 0.9) * 2.5;
  const cx = x + 18 + sw, cy = y - 54;
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 9; k++) { const t = k / 9; ctx.beginPath(); ctx.ellipse(x + 20 + sw * t, y - 106 + t * 46, 1.6, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
  // the wheel and its spokes
  ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(cx, cy, 26, 7, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 0.7; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 7); } ctx.stroke();
  // candles with flickering flames and drips
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, px = cx + Math.cos(a) * 26, py = cy + Math.sin(a) * 7;
    ctx.fillStyle = PAPER; ctx.fillRect(px - 2, py - 10, 4, 10); ctx.strokeRect(px - 2, py - 10, 4, 10);
    const f = Math.sin(time * 11 + i * 1.7);
    ctx.fillStyle = 'rgba(240,190,90,0.9)'; ctx.beginPath(); ctx.moveTo(px - 1.8, py - 10); ctx.quadraticCurveTo(px - 1, py - 15 - f, px, py - 18 - f * 1.5); ctx.quadraticCurveTo(px + 1, py - 15, px + 1.8, py - 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.stroke(); ctx.lineWidth = 0.7;
    if (i % 3 === 0) { const d = (time * 0.7 + i * 0.3) % 1; ctx.fillStyle = 'rgba(239,233,218,0.95)'; ctx.beginPath(); ctx.ellipse(px, py + 2 + d * 30, 1, 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
}

/** A stone fireplace with a hooded chimney, fire roaring between the firedogs. */
function keepHearth(ctx: C, x: number, y: number, time: number, R: R) {
  groundWash(ctx, x + 4, y + 2, 34, 8, 0.4);
  const body = () => { ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x - 30, y - 50); ctx.lineTo(x - 34, y - 50); ctx.lineTo(x - 34, y - 58); ctx.lineTo(x - 16, y - 66); ctx.lineTo(x - 12, y - 104); ctx.lineTo(x + 12, y - 104); ctx.lineTo(x + 16, y - 66); ctx.lineTo(x + 34, y - 58); ctx.lineTo(x + 34, y - 50); ctx.lineTo(x + 30, y - 50); ctx.lineTo(x + 30, y); ctx.closePath(); };
  ctx.fillStyle = PAPER; body(); ctx.fill();
  ctx.save(); body(); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let yy = y - 6; yy > y - 104; yy -= 7) for (let xx = x - 34 + ((yy / 7) % 2 ? 0 : 6) + R() * 2; xx < x + 34; xx += 12) { ctx.moveTo(xx, yy); ctx.lineTo(xx + 9, yy); ctx.moveTo(xx + 10, yy); ctx.lineTo(xx + 10, yy + 7); }
  ctx.stroke(); ctx.fillStyle = sepia(0.3); ctx.fillRect(x + 12, y - 106, 24, 106); ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; body(); ctx.stroke();
  // the firebox
  const box = () => { ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 22, y - 34); ctx.quadraticCurveTo(x, y - 46, x + 22, y - 34); ctx.lineTo(x + 22, y); ctx.closePath(); };
  ctx.fillStyle = 'rgba(29,25,21,0.88)'; box(); ctx.fill();
  const g = ctx.createRadialGradient(x, y - 8, 2, x, y - 8, 26); g.addColorStop(0, `rgba(250,200,100,${0.85 + 0.1 * Math.sin(time * 8)})`); g.addColorStop(1, 'rgba(200,90,40,0)');
  ctx.fillStyle = g; box(); ctx.fill();
  for (let i = 0; i < 4; i++) { const fx = x - 12 + i * 8, f = Math.sin(time * 10 + i * 1.9); inkFlame(ctx, fx, y - 2, 14 + f * 4 + (i % 2) * 4, f * 0.3); }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; box(); ctx.stroke();
  // firedogs and a log
  ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 16, y - 10); ctx.moveTo(x + 16, y); ctx.lineTo(x + 16, y - 10); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 5, 16, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // sparks rising from the chimney
  ctx.fillStyle = 'rgba(214,130,58,0.9)';
  for (let k = 0; k < 4; k++) { const t = (time * 0.8 + k * 0.25) % 1; ctx.beginPath(); ctx.arc(x - 4 + Math.sin(t * 7 + k) * 6, y - 108 - t * 30, 1.4 * (1 - t) + 0.4, 0, Math.PI * 2); ctx.fill(); }
}
