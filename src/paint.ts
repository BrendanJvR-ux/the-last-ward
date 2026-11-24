// The static sheet: a pen-and-ink drawing on cream paper with a grey-sepia wash.
// Roads, the river and its spring, gnarled trees and fynbos, the mill, the windmill, the castle
// and the inkwell are drawn once; everything that moves is drawn live in render.ts.
import {
  MAP_W, MAP_H, GUTTER_X, LANES, LANE_IDS, RIVER, POND, MILL, BRIDGE, INKWELL, CASTLE, LEVEL,
  LEY_EDGES, NODE, FOUNDATION_IDS, pointAt, type Vec,
} from './map';
import {
  inkSurreal, scribble, inkSmudge, foldCrease, inkCastle, inkInkwell, windmillBody, turret, paperVignette, groundWash, goose,
  hatch, grow, limbs, proteaHead, seed, INK, INK2, PAPER, GOLD, type Seg,
} from './ink';

/** How much larger than its study the castle is drawn. */
const CASTLE_SCALE = 1.35;

export const SERIF = 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif';

export function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

export function stroke(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

export function smoothPath(ctx: CanvasRenderingContext2D, pts: Vec[], r = 60) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) ctx.arcTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, r);
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Geese stay at Goosebridge, now drawn in a few pen lines. */
export function drawGoose(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, dir: number, flying = false, flap = 0) {
  goose(ctx, x, y, k, dir, flying, flap);
}

function nearRoad(p: Vec, margin: number): boolean {
  for (const id of LANE_IDS) {
    const L = LANES[id];
    for (let s = 0; s < L.length; s += 14) {
      const q = pointAt(L, s);
      if (Math.hypot(q.x - p.x, q.y - p.y) < margin) return true;
    }
  }
  return false;
}
function nearLey(p: Vec, margin: number): boolean {
  for (const e of LEY_EDGES) for (const q of e.pts) if (Math.hypot(q.x - p.x, q.y - p.y) < margin) return true;
  return false;
}
function nearRiver(p: Vec, margin: number): boolean {
  for (let i = 1; i < RIVER.length; i++) {
    const a = RIVER[i - 1], b = RIVER[i];
    for (let t = 0; t <= 1; t += 0.05) {
      const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (Math.hypot(q.x - p.x, q.y - p.y) < margin) return true;
    }
  }
  return RIVER.length > 0 && Math.hypot(RIVER[0].x - p.x, RIVER[0].y - p.y) < margin + 30;
}

/** Handwritten-style italic lettering in ink. */
export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 16, angle = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.font = `italic ${size}px ${SERIF}`; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(228,211,182,0.85)';
  const w = ctx.measureText(text).width;
  ctx.fillRect(-w / 2 - 4, -size * 0.8, w + 8, size * 1.1);
  ctx.fillStyle = 'rgba(58,34,18,0.85)'; ctx.fillText(text, 0, 0);
  ctx.restore();
}

// ── Placement ───────────────────────────────────────────────────────────────

interface Spot { x: number; y: number; r: number }
/** Where the windmill stands; its sails turn in the live renderer. */
export let WINDMILL: Vec = { x: 400, y: 740 };

function clearSpot(p: Vec, r: number, taken: Spot[]): boolean {
  if (p.x < 30 + r || p.x > MAP_W - 30 - r || p.y < 30 + r || p.y > MAP_H - 30 - r) return false;
  if (p.x > 1360 && p.y > 140 && p.y < 880) return false; // castle and garden
  if (p.x < 410 + r && p.y > 860 - r) return false; // title cartouche
  if (Math.hypot(p.x - MILL.x, p.y - MILL.y) < r + 90) return false;
  if (Math.hypot(p.x - INKWELL.x, p.y - INKWELL.y) < r + 100) return false;
  if (nearRoad(p, r + 30) || nearLey(p, r + 14) || nearRiver(p, r + 14)) return false;
  if (FOUNDATION_IDS.some((f) => Math.hypot(NODE[f].x - p.x, NODE[f].y - p.y) < r + 60)) return false;
  return !taken.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < t.r + r + 8);
}

function findSpot(R: () => number, r: number, taken: Spot[], near?: Vec, spread = 400): Spot | null {
  for (let i = 0; i < 600; i++) {
    const p = near ? { x: near.x + (R() - 0.5) * spread, y: near.y + (R() - 0.5) * spread } : { x: R() * MAP_W, y: R() * MAP_H };
    if (clearSpot(p, r, taken)) { const sp = { ...p, r }; taken.push(sp); return sp; }
  }
  return null;
}

/** The Old Mill: a steep-roofed house with a spoked water wheel. */
function drawMill(ctx: CanvasRenderingContext2D) {
  const { x, y } = MILL;
  const R = rng(21);
  groundWash(ctx, x + 10, y + 24, 70, 14, 0.3);
  turret(ctx, x, y + 22, 64, 38, 34, 'orb', false, R);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 5, y + 22); ctx.lineTo(x - 5, y + 10); ctx.arc(x, y + 10, 5, Math.PI, 0); ctx.lineTo(x + 5, y + 22); ctx.fill();
  // water wheel
  const wx = x - 48, wy = y + 10;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(wx, wy, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(wx, wy, 15, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 22, wy + Math.sin(a) * 22); }
  ctx.stroke();
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.moveTo(wx + Math.cos(a) * 15, wy + Math.sin(a) * 15); ctx.lineTo(wx + Math.cos(a + 0.12) * 22, wy + Math.sin(a + 0.12) * 22); }
  ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(wx, wy, 3, 0, Math.PI * 2); ctx.fill();
  label(ctx, 'the Old Mill', x, y + 56, 14);
}

export function buildStatic(scale = 2): HTMLCanvasElement {
  if (LEVEL === 'courtyard') return buildCourtyard(scale);
  const cv = document.createElement('canvas');
  cv.width = MAP_W * scale; cv.height = MAP_H * scale;
  const ctx = cv.getContext('2d')!;
  ctx.scale(scale, scale);
  const R = rng(11);
  const st = inkSurreal;

  st.ground(ctx, R);
  st.water(ctx, RIVER, POND);
  st.road(ctx, LANES.mill.pts, 'mill');
  st.road(ctx, LANES.king.pts, 'king');
  st.bridge(ctx, BRIDGE, pointAt(LANES.king, LANES.king.cum[3]).angle);
  st.ley(ctx, LEY_EDGES.map((e) => e.pts), Object.values(NODE).filter((n) => !n.foundation && n.id !== 'ink').map((n) => ({ x: n.x, y: n.y })));

  // the windmill claims its ground first; trees grow around it
  const taken: Spot[] = [];
  const wm = findSpot(R, 44, taken, { x: 400, y: 730 }, 260) ?? findSpot(R, 44, taken);
  // notebook margins: blocks of mirror-script notes in the open ground
  const notes: Spot[] = [];
  for (let i = 0; i < 7; i++) { const sp = findSpot(R, 62, taken); if (sp) notes.push(sp); }
  for (const n of notes) scribble(ctx, n.x - 58, n.y - 28, 116, 5 + Math.floor(R() * 3), R);
  // ink spilt in the corners, well clear of play
  inkSmudge(ctx, 70, 120, 40, 110, R);
  inkSmudge(ctx, MAP_W - 60, 80, 30, 30, R);
  if (wm) WINDMILL = { x: wm.x, y: wm.y };
  const trees: { x: number; y: number; r: number; k: number }[] = [];
  for (let i = 0; i < 1400 && trees.length < 175; i++) {
    const p = { x: 20 + R() * (MAP_W - 40), y: 20 + R() * (MAP_H - 40) };
    if (p.x > 1360 && p.y > 140 && p.y < 740) continue; // the castle
    if (Math.hypot(p.x - MILL.x, p.y - MILL.y) < 105) continue;
    if (Math.hypot(p.x - INKWELL.x, p.y - INKWELL.y) < 110) continue;
    if (p.x < 410 && p.y > 860) continue; // title cartouche
    if (nearRoad(p, 52) || nearLey(p, 30) || nearRiver(p, 34)) continue;
    if (FOUNDATION_IDS.some((f) => Math.hypot(NODE[f].x - p.x, NODE[f].y - p.y) < 64)) continue;
    if (trees.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 26)) continue;
    if (taken.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < t.r + 16)) continue;
    trees.push({ ...p, r: 11 + R() * 9, k: R() });
  }

  type Item = { y: number; draw: () => void };
  const items: Item[] = trees.map((t) => ({ y: t.y, draw: () => st.tree(ctx, t.x, t.y, t.r, t.k) }));
  items.push({ y: MILL.y + 22, draw: () => drawMill(ctx) });
  if (wm) items.push({ y: WINDMILL.y, draw: () => windmillBody(ctx, WINDMILL.x, WINDMILL.y) });
  items.push({ y: CASTLE.y + 160, draw: () => {
    // drawn larger, anchored at its gate so the road still meets the arch
    const ax = CASTLE.x - 50, ay = CASTLE.y + 25;
    ctx.save(); ctx.translate(ax, ay); ctx.scale(CASTLE_SCALE, CASTLE_SCALE); ctx.translate(-ax, -ay);
    inkCastle(ctx, CASTLE);
    ctx.restore();
  } });
  items.push({ y: INKWELL.y + 22, draw: () => inkInkwell(ctx, INKWELL) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  label(ctx, 'The Mill Road', 300, 112, 17);
  label(ctx, 'The King’s Road', 1000, 772, 17, -0.33);
  label(ctx, 'Goosebridge Castle', CASTLE.x - 6, CASTLE.y + 196, 15);
  label(ctx, 'the Inkwell', INKWELL.x, INKWELL.y + 54, 14);

  finishSheet(ctx, R, 'Defence of Goosebridge Castle', 'drawn in pen and ink');
  return cv;
}

/** Folds, browning, the title plate and the ruled border: the same on every sheet. */
function finishSheet(ctx: CanvasRenderingContext2D, R: () => number, title: string, subtitle: string) {
  // the sheet was folded once across and once down
  foldCrease(ctx, true, MAP_H * 0.54, R);
  foldCrease(ctx, false, GUTTER_X, R);
  paperVignette(ctx);
  // Title plate, ruled in ink
  ctx.fillStyle = 'rgba(228,211,182,0.92)'; roundRect(ctx, 40, 880, 350, 78, 4); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.lineWidth = 0.6; roundRect(ctx, 45, 885, 340, 68, 3); ctx.stroke();
  ctx.font = `italic 600 23px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillStyle = INK;
  ctx.fillText(title, 56, 918);
  ctx.font = `italic 14px ${SERIF}`; ctx.fillStyle = 'rgba(58,34,18,0.7)';
  ctx.fillText(subtitle, 58, 942);
  // sheet border
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(14, 14, MAP_W - 28, MAP_H - 28);
  ctx.lineWidth = 0.6; ctx.strokeRect(19, 19, MAP_W - 38, MAP_H - 38);
}

// ── Level 2: the castle courtyard ───────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;

/** A building seen from the front with a gabled, hatched roof. */
function house(ctx: Ctx, x: number, base: number, w: number, h: number, roofH: number, R: () => number, door = true) {
  groundWash(ctx, x + w * 0.15, base + 3, w * 0.7, 10, 0.35);
  const L = x - w / 2, top = base - h;
  ctx.fillStyle = PAPER; ctx.fillRect(L, top, w, h);
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let yy = top + 5; yy < base; yy += 5) for (let xx = L + 2 + R() * 6; xx < L + w - 4; xx += 7 + R() * 6) { ctx.moveTo(xx, yy); ctx.lineTo(xx + 3 + R() * 2, yy); }
  ctx.stroke();
  hatch(ctx, () => { ctx.beginPath(); ctx.rect(L + w * 0.7, top, w * 0.3, h); }, [L + w * 0.7, top, w * 0.3, h], -0.3, 1.6, 0.5, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.strokeRect(L, top, w, h);
  const roof = () => { ctx.beginPath(); ctx.moveTo(L - 6, top); ctx.lineTo(L + w * 0.18, top - roofH); ctx.lineTo(L + w * 0.82, top - roofH); ctx.lineTo(L + w + 6, top); ctx.closePath(); };
  ctx.fillStyle = PAPER; roof(); ctx.fill();
  ctx.save(); roof(); ctx.clip(); ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let xx = L - 6; xx < L + w + 6; xx += 2.6) { ctx.moveTo(xx, top); ctx.lineTo(xx + (xx - x) * -0.15, top - roofH); }
  for (let yy = top - 5; yy > top - roofH; yy -= 6) { ctx.moveTo(L - 6, yy); ctx.lineTo(L + w + 6, yy); }
  ctx.stroke(); ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; roof(); ctx.stroke();
  if (door) { ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 6, base); ctx.lineTo(x - 6, base - 14); ctx.arc(x, base - 14, 6, Math.PI, 0); ctx.lineTo(x + 6, base); ctx.fill(); }
}

/** A curtain wall seen from inside the yard: a band of masonry with merlons along its far edge. */
function wallBand(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, horizontal: boolean, R: () => number) {
  ctx.fillStyle = PAPER; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  if (horizontal) {
    for (let yy = y0 + 6; yy < y1; yy += 6) for (let xx = x0 + R() * 10; xx < x1; xx += 12) { ctx.moveTo(xx, yy); ctx.lineTo(xx + 10, yy); ctx.moveTo(xx + 11, yy); ctx.lineTo(xx + 11, yy - 6); }
  } else {
    for (let xx = x0 + 6; xx < x1; xx += 6) for (let yy = y0 + R() * 10; yy < y1; yy += 12) { ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 10); ctx.moveTo(xx, yy + 11); ctx.lineTo(xx - 6, yy + 11); }
  }
  ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  // merlons on the outer edge
  ctx.fillStyle = PAPER; ctx.lineWidth = 1;
  if (horizontal) for (let xx = x0; xx < x1 - 6; xx += 14) { const yy = y0 < MAP_H / 2 ? y0 - 6 : y1; ctx.fillRect(xx, yy, 8, 6); ctx.strokeRect(xx, yy, 8, 6); }
  else for (let yy = y0; yy < y1 - 6; yy += 14) { ctx.fillRect(x0 - 6, yy, 6, 8); ctx.strokeRect(x0 - 6, yy, 6, 8); }
  // the shadow the wall throws into the yard
  const g = horizontal ? ctx.createLinearGradient(0, y1, 0, y1 + 18) : ctx.createLinearGradient(x1, 0, x1 + 18, 0);
  g.addColorStop(0, 'rgba(86,68,52,0.28)'); g.addColorStop(1, 'rgba(86,68,52,0)');
  ctx.fillStyle = g;
  if (horizontal && y0 < MAP_H / 2) ctx.fillRect(x0, y1, x1 - x0, 18); else if (!horizontal) ctx.fillRect(x1, y0, 18, y1 - y0);
}

/** Broken masonry: a scatter of hatched stones. */
const sepiaWash = (a: number) => `rgba(86,68,52,${a})`;

function rubble(ctx: Ctx, cx: number, cy: number, w: number, h: number, n: number, R: () => number, avoid?: (x: number, y: number) => boolean) {
  for (let i = 0; i < n; i++) {
    const x = cx + (R() - 0.5) * w, y = cy + (R() - 0.5) * h, r = 4 + R() * 7;
    if (avoid && avoid(x, y)) continue;
    const st = () => { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.4, y - r * 0.8); ctx.lineTo(x + r * 0.7, y - r * 0.6); ctx.lineTo(x + r, y + r * 0.2); ctx.lineTo(x + r * 0.2, y + r * 0.7); ctx.closePath(); };
    groundWash(ctx, x + 2, y + 3, r * 1.3, r * 0.5, 0.35);
    ctx.fillStyle = PAPER; st(); ctx.fill();
    hatch(ctx, st, [x - r, y - r, r * 2, r * 2], 0.8 + i, 1.5, 0.45);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; st(); ctx.stroke();
  }
}

function wellDrawing(ctx: Ctx, x: number, y: number, R: () => number) {
  groundWash(ctx, x + 6, y + 4, 40, 10, 0.4);
  // round stone curb
  const curb = () => { ctx.beginPath(); ctx.moveTo(x - 24, y - 22); ctx.lineTo(x - 24, y); ctx.quadraticCurveTo(x, y + 9, x + 24, y); ctx.lineTo(x + 24, y - 22); ctx.closePath(); };
  ctx.fillStyle = PAPER; curb(); ctx.fill();
  ctx.save(); curb(); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) { const xx = x - 24 + i * 8 + (r % 2) * 4; ctx.moveTo(xx, y - 22 + r * 6); ctx.lineTo(xx, y - 16 + r * 6); }
  for (let r = 1; r < 4; r++) { ctx.moveTo(x - 24, y - 22 + r * 6); ctx.quadraticCurveTo(x, y - 16 + r * 6, x + 24, y - 22 + r * 6); }
  ctx.stroke(); ctx.restore();
  hatch(ctx, () => { ctx.beginPath(); ctx.rect(x + 8, y - 24, 18, 34); }, [x + 8, y - 24, 18, 34], -0.3, 1.6, 0.5, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; curb(); ctx.stroke();
  ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.ellipse(x, y - 22, 24, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // posts, roof and windlass with its rope and bucket
  const segs: Seg[] = [{ x1: x - 20, y1: y - 22, x2: x - 20, y2: y - 64, w: 3.5 }, { x1: x + 20, y1: y - 22, x2: x + 20, y2: y - 64, w: 3.5 }, { x1: x - 22, y1: y - 52, x2: x + 22, y2: y - 52, w: 3 }];
  limbs(ctx, segs, R, false);
  const roof = () => { ctx.beginPath(); ctx.moveTo(x - 30, y - 62); ctx.lineTo(x, y - 84); ctx.lineTo(x + 30, y - 62); ctx.closePath(); };
  ctx.fillStyle = PAPER; roof(); ctx.fill(); hatch(ctx, roof, [x - 30, y - 86, 60, 26], 1.2, 1.6, 0.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; roof(); ctx.stroke();
  ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x + 2, y - 52); ctx.lineTo(x + 2, y - 34); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(x - 3, y - 34); ctx.lineTo(x + 7, y - 34); ctx.lineTo(x + 6, y - 26); ctx.lineTo(x - 2, y - 26); ctx.closePath(); ctx.fill(); ctx.stroke();
}

function dummy(ctx: Ctx, x: number, y: number) {
  groundWash(ctx, x + 3, y + 2, 12, 4, 0.4);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.moveTo(x - 13, y - 30); ctx.lineTo(x + 13, y - 30); ctx.stroke();
  // a straw body and a sack head with a painted target
  ctx.fillStyle = PAPER; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 24, 7, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 0.5; ctx.beginPath(); for (let i = -6; i <= 6; i += 2) { ctx.moveTo(x + i, y - 33); ctx.lineTo(x + i * 0.8, y - 15); } ctx.stroke();
  ctx.fillStyle = PAPER; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 42, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y - 24, 3.5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y - 24, 1.3, 0, Math.PI * 2); ctx.fill();
}

function barrel(ctx: Ctx, x: number, y: number) {
  const b = () => { ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x - 11, y - 10, x - 8, y - 20); ctx.lineTo(x + 8, y - 20); ctx.quadraticCurveTo(x + 11, y - 10, x + 8, y); ctx.closePath(); };
  groundWash(ctx, x + 3, y + 2, 12, 4, 0.35);
  ctx.fillStyle = PAPER; b(); ctx.fill();
  hatch(ctx, b, [x - 11, y - 21, 22, 22], -0.4, 1.5, 0.45);
  ctx.strokeStyle = INK; ctx.lineWidth = 1; b(); ctx.stroke();
  ctx.beginPath(); for (const yy of [y - 4, y - 16]) { ctx.moveTo(x - 9.5, yy); ctx.quadraticCurveTo(x, yy + 2, x + 9.5, yy); } ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(x, y - 20, 8, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function cart(ctx: Ctx, x: number, y: number, R: () => number) {
  groundWash(ctx, x + 6, y + 4, 46, 9, 0.35);
  const segs: Seg[] = [{ x1: x - 30, y1: y - 22, x2: x + 26, y2: y - 22, w: 5 }, { x1: x + 26, y1: y - 20, x2: x + 58, y2: y - 6, w: 2.6 }];
  limbs(ctx, segs, R, false);
  const box = () => { ctx.beginPath(); ctx.rect(x - 30, y - 42, 56, 18); };
  ctx.fillStyle = PAPER; box(); ctx.fill(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let yy = y - 38; yy < y - 24; yy += 4.5) { ctx.moveTo(x - 30, yy); ctx.lineTo(x + 26, yy); }
  ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; box(); ctx.stroke();
  // a load of hay spilling over the top
  ctx.lineWidth = 0.5; ctx.beginPath(); for (let i = 0; i < 30; i++) { const hx = x - 28 + R() * 52; ctx.moveTo(hx, y - 42); ctx.lineTo(hx + (R() - 0.5) * 8, y - 50 - R() * 8); } ctx.stroke();
  for (const wx of [x - 18, x + 14]) {
    ctx.fillStyle = PAPER; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(wx, y - 10, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.7; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.moveTo(wx, y - 10); ctx.lineTo(wx + Math.cos(a) * 10, y - 10 + Math.sin(a) * 10); } ctx.stroke();
  }
}

function haystack(ctx: Ctx, x: number, y: number, r: number, R: () => number) {
  groundWash(ctx, x + 4, y + 2, r * 1.3, r * 0.4, 0.35);
  const h = () => { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x - r, y - r * 1.4, x, y - r * 1.5); ctx.quadraticCurveTo(x + r, y - r * 1.4, x + r, y); ctx.closePath(); };
  ctx.fillStyle = PAPER; h(); ctx.fill();
  ctx.save(); h(); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let i = 0; i < 40; i++) { const sx = x - r + R() * r * 2, sy = y - R() * r * 1.4; ctx.moveTo(sx, sy); ctx.lineTo(sx + (R() - 0.5) * 6, sy + 6); }
  ctx.stroke(); ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1; h(); ctx.stroke();
}

/** A gnarled tree in a square stone planter. */
function plantedTree(ctx: Ctx, x: number, y: number, R: () => number) {
  const segs: Seg[] = [];
  grow(segs, R, x, y - 14, -Math.PI / 2, 46, 12, 3, 0.7);
  limbs(ctx, segs, R);
  const box = () => { ctx.beginPath(); ctx.rect(x - 22, y - 16, 44, 16); };
  ctx.fillStyle = PAPER; box(); ctx.fill(); hatch(ctx, box, [x - 22, y - 16, 44, 16], -0.3, 1.6, 0.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; box(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 22, y - 8); ctx.lineTo(x + 22, y - 8); ctx.moveTo(x - 4, y - 16); ctx.lineTo(x - 4, y - 8); ctx.moveTo(x + 10, y - 8); ctx.lineTo(x + 10, y); ctx.stroke();
}

function smithy(ctx: Ctx, x: number, y: number, R: () => number) {
  house(ctx, x, y, 64, 34, 24, R);
  // chimney with a curl of smoke, and an anvil by the door
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.fillRect(x + 14, y - 70, 9, 22); ctx.strokeRect(x + 14, y - 70, 9, 22);
  ctx.lineWidth = 0.8; ctx.beginPath(); for (let t = 0; t < 10; t += 0.25) { const r = 1 + t * 0.9; const px = x + 18 + Math.cos(t) * r * 0.7 + t * 1.2, py = y - 74 - t * 3 + Math.sin(t) * r * 0.5; t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 46, y); ctx.lineTo(x - 42, y - 6); ctx.lineTo(x - 50, y - 10); ctx.lineTo(x - 30, y - 10); ctx.lineTo(x - 34, y - 6); ctx.lineTo(x - 30, y); ctx.closePath(); ctx.fill();
}

function chapel(ctx: Ctx, x: number, y: number, R: () => number) {
  turret(ctx, x, y, 62, 64, 52, 'crescent', false, R);
  // a rose window under the gable
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x - 6, y - 46, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 0.6; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.moveTo(x - 6, y - 46); ctx.lineTo(x - 6 + Math.cos(a) * 8, y - 46 + Math.sin(a) * 8); } ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.lineTo(x - 13, y - 16); ctx.arc(x - 6, y - 16, 7, Math.PI, 0); ctx.lineTo(x + 1, y); ctx.fill();
}

function stables(ctx: Ctx, x: number, y: number, R: () => number) {
  house(ctx, x, y, 210, 40, 30, R, false);
  // stall doors, half open
  for (let i = 0; i < 4; i++) {
    const dx = x - 78 + i * 52;
    ctx.fillStyle = INK; ctx.fillRect(dx - 12, y - 30, 24, 30);
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.fillRect(dx - 12, y - 14, 24, 14); ctx.strokeRect(dx - 12, y - 14, 24, 14);
    ctx.beginPath(); ctx.moveTo(dx - 12, y - 14); ctx.lineTo(dx + 12, y); ctx.moveTo(dx + 12, y - 14); ctx.lineTo(dx - 12, y); ctx.stroke();
  }
}

function pennant(ctx: Ctx, x: number, y: number, R: () => number) {
  limbs(ctx, [{ x1: x, y1: y, x2: x, y2: y - 46, w: 2.6 }], R, false);
  const f = () => { ctx.beginPath(); ctx.moveTo(x + 1, y - 46); ctx.quadraticCurveTo(x + 14, y - 44, x + 28, y - 40); ctx.lineTo(x + 20, y - 36); ctx.lineTo(x + 28, y - 32); ctx.quadraticCurveTo(x + 14, y - 32, x + 1, y - 34); ctx.closePath(); };
  ctx.fillStyle = PAPER; f(); ctx.fill(); hatch(ctx, f, [x, y - 48, 30, 18], 0.9, 1.6, 0.45); ctx.strokeStyle = INK; ctx.lineWidth = 0.9; f(); ctx.stroke();
}

/** The east curtain wall, seen side-on along the map's edge. */
function eastWall(ctx: Ctx, x0: number, x1: number, y0: number, y1: number, R: () => number) {
  ctx.fillStyle = PAPER; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let xx = x0 + 6; xx < x1; xx += 6) for (let yy = y0 + R() * 10; yy < y1; yy += 12) { ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 10); ctx.moveTo(xx, yy + 11); ctx.lineTo(xx - 6, yy + 11); }
  ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = PAPER; ctx.lineWidth = 1;
  for (let yy = y0; yy < y1 - 6; yy += 14) { ctx.fillRect(x1, yy, 5, 8); ctx.strokeRect(x1, yy, 5, 8); }
  const g = ctx.createLinearGradient(x0, 0, x0 - 18, 0);
  g.addColorStop(0, 'rgba(86,68,52,0.28)'); g.addColorStop(1, 'rgba(86,68,52,0)');
  ctx.fillStyle = g; ctx.fillRect(x0 - 18, y0, 18, y1 - y0);
}

/** The east gate: a crenellated gatehouse with its portcullis down, where both roads end. */
function eastGate(ctx: Ctx, x: number, base: number, R: () => number) {
  turret(ctx, x, base, 58, 92, 0, 'none', false, R);
  // the arch and its portcullis
  const arch = () => { ctx.beginPath(); ctx.moveTo(x - 13, base); ctx.lineTo(x - 13, base - 26); ctx.arc(x, base - 26, 13, Math.PI, 0); ctx.lineTo(x + 13, base); ctx.closePath(); };
  ctx.fillStyle = INK; arch(); ctx.fill();
  ctx.save(); arch(); ctx.clip();
  ctx.strokeStyle = PAPER; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let gx = x - 11; gx <= x + 11; gx += 4.4) { ctx.moveTo(gx, base - 40); ctx.lineTo(gx, base); }
  for (let gy = base - 34; gy < base; gy += 7) { ctx.moveTo(x - 13, gy); ctx.lineTo(x + 13, gy); }
  ctx.stroke();
  ctx.fillStyle = PAPER; for (let gx = x - 11; gx <= x + 11; gx += 4.4) { ctx.beginPath(); ctx.moveTo(gx - 1.2, base - 2); ctx.lineTo(gx, base + 1); ctx.lineTo(gx + 1.2, base - 2); ctx.fill(); }
  ctx.restore();
  // a banner of the house over the arch
  ctx.fillStyle = '#7a2826'; ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x - 7, base - 78); ctx.lineTo(x + 7, base - 78); ctx.lineTo(x + 7, base - 56); ctx.lineTo(x, base - 61); ctx.lineTo(x - 7, base - 56); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x, base - 70, 3, 0.6, Math.PI * 2 - 0.6); ctx.arc(x + 1.2, base - 70.5, 2.4, Math.PI * 2 - 0.6, 0.6, true); ctx.fill();
}

function buildCourtyard(scale: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = MAP_W * scale; cv.height = MAP_H * scale;
  const ctx = cv.getContext('2d')!;
  ctx.scale(scale, scale);
  const R = rng(23);
  const st = inkSurreal;

  // paper, then the flagstones of the yard laid in rough courses
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, MAP_W, MAP_H);
  for (let i = 0; i < 9000; i++) { ctx.fillStyle = R() < 0.5 ? 'rgba(110,90,60,0.07)' : 'rgba(255,244,222,0.2)'; ctx.fillRect(R() * MAP_W, R() * MAP_H, 1.2, 1.2); }
  for (let i = 0; i < 14; i++) { const x = R() * MAP_W, y = R() * MAP_H; groundWash(ctx, x, y, 160 + R() * 220, 50 + R() * 70, 0.04 + R() * 0.05); }
  // worn flagstones: irregular, faint, with gaps where earth shows through
  ctx.lineWidth = 0.55;
  for (let y = 40; y < 962;) {
    const rh = 24 + R() * 14;
    let x = 38 - R() * 40;
    while (x < 1460) {
      const w = 34 + R() * 46;
      if (R() > 0.12) {
        const j = () => (R() - 0.5) * 3;
        ctx.strokeStyle = `rgba(58,34,18,${0.1 + R() * 0.1})`;
        ctx.beginPath(); ctx.moveTo(x + 3 + j(), y + 3 + j()); ctx.lineTo(x + w - 3 + j(), y + 3 + j()); ctx.lineTo(x + w - 3 + j(), y + rh - 2 + j()); ctx.lineTo(x + 3 + j(), y + rh - 2 + j()); ctx.closePath(); ctx.stroke();
        if (R() < 0.05) hatch(ctx, () => { ctx.beginPath(); ctx.rect(x + 4, y + 4, w - 8, rh - 7); }, [x, y, w, rh], 0.8, 2.4, 0.4, 'rgba(58,34,18,0.18)');
      }
      x += w;
    }
    y += rh;
  }
  // weeds in the cracks
  ctx.strokeStyle = 'rgba(58,34,18,0.42)'; ctx.lineWidth = 0.6;
  for (let i = 0; i < 120; i++) {
    const x = 50 + R() * 1380, y = 50 + R() * 900, n = 3 + Math.floor(R() * 3);
    ctx.beginPath(); for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.35; ctx.moveTo(x + k, y); ctx.lineTo(x + k + Math.cos(a) * 6, y + Math.sin(a) * 6); } ctx.stroke();
  }

  // rubble from the breach and the broken gatehouse, kept off the roads
  const onRoad = (x: number, y: number) => nearRoad({ x, y }, 26);
  rubble(ctx, 900, 60, 220, 80, 30, R, onRoad);
  rubble(ctx, 60, 480, 70, 190, 18, R, onRoad);

  // the roads: the levy's trodden passage and the cobbled way from the breach
  st.road(ctx, LANES.mill.pts, 'mill');
  st.road(ctx, LANES.king.pts, 'king');
  st.ley(ctx, LEY_EDGES.map((e) => e.pts), Object.values(NODE).filter((n) => !n.foundation && n.id !== 'ink').map((n) => ({ x: n.x, y: n.y })));

  // curtain walls: north (breached), west (gatehouse fallen), south
  // curtain walls all the way round: north (breached), west (gatehouse fallen), south, east (the gate)
  wallBand(ctx, 0, 6, 838, 36, true, R);
  wallBand(ctx, 962, 6, 1562, 36, true, R);
  wallBand(ctx, 6, 36, 36, 420, false, R);
  wallBand(ctx, 6, 540, 36, 962, false, R);
  wallBand(ctx, 0, 962, 1562, 994, true, R);
  eastWall(ctx, 1528, 1562, 6, 488, R);
  eastWall(ctx, 1528, 1562, 556, 994, R);
  // beyond the east wall: open country, the way the castle's people fled
  ctx.strokeStyle = 'rgba(58,34,18,0.4)'; ctx.lineWidth = 0.6;
  for (let i = 0; i < 26; i++) { const gx = 1570 + R() * 20, gy = 30 + R() * 940; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 2, gy - 5); ctx.moveTo(gx, gy); ctx.lineTo(gx + 2, gy - 5); ctx.stroke(); }
  // jagged broken ends of the north wall
  for (const [x, d] of [[838, -1], [962, 1]] as [number, number][]) {
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(x, 6); ctx.lineTo(x - d * 10, 12); ctx.lineTo(x + d * 2, 20); ctx.lineTo(x - d * 8, 28); ctx.lineTo(x, 36); ctx.stroke();
  }
  // ivy hanging over the walls, and torch sconces along them
  for (const [ix, iy, dir] of [[150, 36, 1], [420, 36, 1], [1240, 36, 1], [1480, 36, 1], [36, 250, 0], [36, 760, 0], [520, 962, -1], [940, 962, -1]] as [number, number, number][]) {
    const rv = seed(ix, iy, 31);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
    for (let k = 0; k < 5; k++) {
      // one tendril creeping off the wall, with leaves along it
      const pts: Vec[] = [];
      let px = dir === 0 ? ix : ix + (rv() - 0.5) * 50, py = dir === 0 ? iy + (rv() - 0.5) * 50 : iy;
      const len = 16 + rv() * 30;
      for (let t = 0; t <= len; t += 3) {
        if (dir === 0) px += 3; else py += 3 * dir;
        const wob = Math.sin(t * 0.35 + k * 1.7) * 2.5;
        pts.push(dir === 0 ? { x: px, y: py + wob } : { x: px + wob, y: py });
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      ctx.fillStyle = PAPER; ctx.lineWidth = 0.6;
      for (let i = 2; i < pts.length; i += 3) {
        const p = pts[i], side = i % 2 ? 1 : -1;
        const lx = p.x + (dir === 0 ? 0 : side * 3), ly = p.y + (dir === 0 ? side * 3 : 0);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(lx + side * 2, ly - 2, lx + side * 4, ly + 1); ctx.quadraticCurveTo(lx, ly + 3, p.x, p.y); ctx.fill(); ctx.stroke();
      }
    }
  }
  for (const tx of [300, 700, 1100, 1380]) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(tx, 36); ctx.lineTo(tx, 48); ctx.stroke();
    ctx.fillStyle = 'rgba(206,120,52,0.55)'; ctx.beginPath(); ctx.moveTo(tx - 3, 37); ctx.quadraticCurveTo(tx, 26, tx + 1, 22); ctx.quadraticCurveTo(tx + 4, 30, tx + 3, 37); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 0.6; ctx.stroke();
  }
  // spent arrows and a broken shield where the breach was stormed
  for (const [ax, ay, aa] of [[790, 140, 0.6], [1050, 120, -0.8], [980, 160, 2.3], [120, 560, 1.2], [210, 440, -0.4], [80, 360, 0.2]] as [number, number, number][]) {
    if (nearRoad({ x: ax, y: ay }, 22)) continue;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(aa);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.moveTo(-9, 0); ctx.lineTo(-12, -2.5); ctx.moveTo(-9, 0); ctx.lineTo(-12, 2.5); ctx.stroke();
    ctx.restore();
  }
  if (!nearRoad({ x: 1060, y: 160 }, 26)) { ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(1060, 160, 9, 0.4, Math.PI * 1.7); ctx.lineTo(1060, 160); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // the fallen gatehouse: two stumps of tower either side of the passage
  turret(ctx, 24, 440, 42, 46, 0, 'none', false, R);
  turret(ctx, 24, 575, 42, 46, 0, 'none', false, R);
  rubble(ctx, 54, 470, 30, 80, 8, R, onRoad);
  pennant(ctx, 230, 34, R); pennant(ctx, 560, 34, R); pennant(ctx, 1140, 34, R); pennant(ctx, 1360, 34, R);

  // buildings and things of the yard, back to front
  type Item = { y: number; draw: () => void };
  const items: Item[] = [
    { y: 252, draw: () => plantedTree(ctx, 700, 252, seed(700, 252, 4)) },
    { y: 360, draw: () => wellDrawing(ctx, 1010, 360, R) },
    { y: 482, draw: () => chapel(ctx, 770, 482, R) },
    { y: 662, draw: () => smithy(ctx, 525, 662, R) },
    { y: 760, draw: () => dummy(ctx, 250, 760) },
    { y: 792, draw: () => dummy(ctx, 296, 792) },
    { y: 944, draw: () => cart(ctx, 640, 944, R) },
    { y: 950, draw: () => stables(ctx, 1200, 950, R) },
    { y: 930, draw: () => haystack(ctx, 1338, 930, 14, R) },
    { y: 950, draw: () => haystack(ctx, 1062, 948, 12, R) },
    { y: 930, draw: () => barrel(ctx, 1496, 930) },
    { y: 946, draw: () => barrel(ctx, 1512, 948) },
    // the east gate in the wall, a guard tower beside it, and a squat tower to the south
    { y: 468, draw: () => turret(ctx, 1478, 468, 42, 160, 58, 'orb', true, R) },
    { y: 548, draw: () => eastGate(ctx, 1545, 548, R) },
    { y: 650, draw: () => turret(ctx, 1545, 650, 44, 70, 0, 'none', false, R) },
    { y: INKWELL.y + 22, draw: () => inkInkwell(ctx, INKWELL) },
  ];
  // the life of the yard: claim ground around what is already built, then fill in
  const taken: Spot[] = [
    { x: 700, y: 240, r: 50 }, { x: 1010, y: 340, r: 50 }, { x: 770, y: 450, r: 55 }, { x: 525, y: 640, r: 50 },
    { x: 272, y: 770, r: 45 }, { x: 640, y: 930, r: 50 }, { x: 1120, y: 925, r: 60 }, { x: 1280, y: 925, r: 60 },
    { x: 1338, y: 920, r: 20 }, { x: 1062, y: 940, r: 18 }, { x: 1504, y: 935, r: 22 }, { x: 1478, y: 420, r: 45 },
  ];
  const decor: [(x: number, y: number, r: () => number) => void, number, number, number][] = [
    [beehives, 30, 300, 230], [kitchenGarden, 42, 420, 840], [woodpile, 28, 860, 880], [weaponRack, 26, 330, 640],
    [archeryButt, 18, 150, 760], [archeryButt, 18, 150, 840], [dovecote, 22, 1150, 640], [marketStall, 36, 980, 780],
    [washingLine, 40, 240, 120], [statue, 22, 1240, 230], [crates, 20, 1420, 730], [crates, 20, 470, 120],
    [puddle, 24, 880, 640], [puddle, 20, 360, 460], [hens, 26, 760, 760], [hens, 26, 1100, 120], [woodpile, 24, 1420, 180],
  ];
  for (const [draw, r, nx, ny] of decor) {
    const sp = findSpot(R, r, taken, { x: nx, y: ny }, 160);
    if (!sp || sp.y < 70 || sp.y > 930 || sp.x < 70 || sp.x > 1500) continue;
    const dx = sp.x, dy = sp.y, rs = seed(dx, dy, 12);
    items.push({ y: dy, draw: () => draw(dx, dy, rs) });
  }
  // and a few fynbos shrubs between the flagstones
  for (let i = 0; i < 10; i++) {
    const sp = findSpot(R, 20, taken);
    if (!sp || sp.x < 60 || sp.y < 70 || sp.y > 900) continue;
    const sx = sp.x, sy = sp.y, rs = seed(sx, sy, 6);
    items.push({ y: sy, draw: () => { groundWash(ctx, sx + 4, sy + 2, 18, 5, 0.3); for (let k = 0; k < 3; k++) { const tx = sx + (k - 1) * 8, ty = sy - 14 - rs() * 8; ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(sx + (k - 1) * 2, sy); ctx.quadraticCurveTo((sx + tx) / 2, (sy + ty) / 2, tx, ty + 3); ctx.stroke(); proteaHead(ctx, tx, ty, 1, rs); } } });
  }
  // ── yard life, drawn here so each piece can use this sheet's context ──
  function beehives(x: number, y: number) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.fillStyle = PAPER;
    ctx.fillRect(x - 30, y - 6, 60, 5); ctx.strokeRect(x - 30, y - 6, 60, 5);
    ctx.beginPath(); ctx.moveTo(x - 26, y - 1); ctx.lineTo(x - 26, y + 6); ctx.moveTo(x + 26, y - 1); ctx.lineTo(x + 26, y + 6); ctx.stroke();
    for (const hx of [-18, 0, 18]) {
      const sk = () => { ctx.beginPath(); ctx.moveTo(x + hx - 9, y - 6); ctx.quadraticCurveTo(x + hx - 9, y - 26, x + hx, y - 27); ctx.quadraticCurveTo(x + hx + 9, y - 26, x + hx + 9, y - 6); ctx.closePath(); };
      ctx.fillStyle = PAPER; sk(); ctx.fill();
      ctx.save(); sk(); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath();
      for (let yy = y - 9; yy > y - 27; yy -= 3.2) { ctx.moveTo(x + hx - 10, yy); ctx.quadraticCurveTo(x + hx, yy + 1.5, x + hx + 10, yy); }
      ctx.stroke(); ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; sk(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + hx, y - 9, 1.6, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = INK; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(x - 20 + i * 7, y - 34 - (i % 3) * 4, 0.9, 0, Math.PI * 2); ctx.fill(); }
  }
  function kitchenGarden(x: number, y: number, r: () => number) {
    for (const [bx, by] of [[-40, -22], [6, -22], [-40, 6], [6, 6]]) {
      ctx.fillStyle = 'rgba(92,70,50,0.18)'; ctx.fillRect(x + bx, y + by, 36, 18);
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(x + bx, y + by, 36, 18);
      ctx.lineWidth = 0.6; ctx.beginPath();
      for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) { const px = x + bx + 4 + k * 5.6, py = y + by + 5 + row * 5; ctx.moveTo(px, py + 1.5); ctx.lineTo(px - 1.4, py - 1.5 - r()); ctx.moveTo(px, py + 1.5); ctx.lineTo(px + 1.4, py - 1.5 - r()); }
      ctx.stroke();
    }
  }
  function woodpile(x: number, y: number) {
    groundWash(ctx, x + 4, y + 3, 30, 7, 0.35);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) {
      const lx = x - 15 + row * 5 + k * 10, ly = y - 5 - row * 9;
      ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(lx, ly, 5, 4.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(lx, ly, 2.6, 2.3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(lx, ly, 0.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x + 24, y); ctx.lineTo(x + 30, y - 18); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x + 27, y - 15); ctx.lineTo(x + 34, y - 20); ctx.lineTo(x + 31, y - 13); ctx.closePath(); ctx.fill();
  }
  function weaponRack(x: number, y: number) {
    groundWash(ctx, x + 4, y + 3, 26, 6, 0.35);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.lineTo(x - 20, y - 30); ctx.moveTo(x + 20, y); ctx.lineTo(x + 20, y - 30); ctx.moveTo(x - 22, y - 24); ctx.lineTo(x + 22, y - 24); ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const sx = x - 14 + i * 7; ctx.beginPath(); ctx.moveTo(sx, y - 2); ctx.lineTo(sx + 2, y - 44); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(sx + 2, y - 50); ctx.lineTo(sx + 4, y - 43); ctx.lineTo(sx, y - 43); ctx.closePath(); ctx.fill(); }
    // a round shield leaning against it
    ctx.fillStyle = PAPER; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x + 26, y - 9, 8, 10, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + 26, y - 9, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  function archeryButt(x: number, y: number) {
    groundWash(ctx, x + 3, y + 2, 16, 4, 0.35);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 3, y - 14); ctx.moveTo(x + 8, y); ctx.lineTo(x + 3, y - 14); ctx.stroke();
    ctx.fillStyle = PAPER; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y - 22, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.7; for (const rr of [8.5, 5]) { ctx.beginPath(); ctx.arc(x, y - 22, rr, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y - 22, 2, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x + 3, y - 24); ctx.lineTo(x + 13, y - 29); ctx.moveTo(x + 13, y - 29); ctx.lineTo(x + 16, y - 27); ctx.moveTo(x + 13, y - 29); ctx.lineTo(x + 15, y - 32); ctx.stroke();
  }
  function dovecote(x: number, y: number, r: () => number) {
    groundWash(ctx, x + 4, y + 3, 16, 5, 0.35);
    limbs(ctx, [{ x1: x, y1: y, x2: x, y2: y - 46, w: 3.2 }], r, false);
    house(ctx, x, y - 46, 26, 16, 12, r, false);
    ctx.fillStyle = INK; for (const hx of [-6, 0, 6]) { ctx.beginPath(); ctx.arc(x + hx, y - 54, 2.2, Math.PI, 0); ctx.lineTo(x + hx + 2.2, y - 52); ctx.lineTo(x + hx - 2.2, y - 52); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
    for (const [bx, by] of [[x - 18, y - 74], [x + 14, y - 82]]) { ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.quadraticCurveTo(bx - 2, by - 4, bx, by); ctx.quadraticCurveTo(bx + 2, by - 4, bx + 5, by); ctx.stroke(); }
  }
  function marketStall(x: number, y: number, r: () => number) {
    groundWash(ctx, x + 6, y + 3, 40, 8, 0.35);
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.fillRect(x - 30, y - 18, 60, 18); ctx.strokeRect(x - 30, y - 18, 60, 18);
    ctx.beginPath(); ctx.moveTo(x - 28, y - 18); ctx.lineTo(x - 28, y - 46); ctx.moveTo(x + 28, y - 18); ctx.lineTo(x + 28, y - 46); ctx.stroke();
    // striped awning with a scalloped edge
    const aw = () => { ctx.beginPath(); ctx.moveTo(x - 34, y - 40); ctx.lineTo(x - 26, y - 54); ctx.lineTo(x + 26, y - 54); ctx.lineTo(x + 34, y - 40); for (let i = 0; i < 6; i++) ctx.arc(x + 34 - 6 - i * 11.4 + 0.3, y - 40, 5.7, 0, Math.PI); ctx.closePath(); };
    ctx.fillStyle = PAPER; aw(); ctx.fill();
    ctx.save(); aw(); ctx.clip(); ctx.fillStyle = sepiaWash(0.45); for (let i = -3; i < 3; i += 2) ctx.fillRect(x + i * 11.4, y - 56, 11.4, 22); ctx.restore();
    ctx.lineWidth = 1; aw(); ctx.stroke();
    // wares: pots and loaves on the counter
    for (let i = 0; i < 4; i++) { ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(x - 20 + i * 13, y - 21, 4.5, 3.6 + r(), 0, Math.PI, 0); ctx.fill(); ctx.stroke(); }
  }
  function washingLine(x: number, y: number) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.lineTo(x - 40, y - 40); ctx.moveTo(x + 40, y); ctx.lineTo(x + 40, y - 40); ctx.stroke();
    ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x - 40, y - 38); ctx.quadraticCurveTo(x, y - 30, x + 40, y - 38); ctx.stroke();
    for (const [cx, w, h] of [[-26, 14, 18], [-6, 18, 14], [16, 12, 20]] as [number, number, number][]) {
      const top = y - 34 + Math.abs(cx) * 0.04;
      const cl = () => { ctx.beginPath(); ctx.moveTo(x + cx - w / 2, top); ctx.lineTo(x + cx + w / 2, top); ctx.lineTo(x + cx + w / 2 - 1, top + h); ctx.quadraticCurveTo(x + cx, top + h + 3, x + cx - w / 2 + 1, top + h); ctx.closePath(); };
      ctx.fillStyle = PAPER; cl(); ctx.fill(); hatch(ctx, cl, [x + cx - w / 2, top, w, h + 4], 1.2, 2, 0.4); ctx.strokeStyle = INK; ctx.lineWidth = 0.9; cl(); ctx.stroke();
    }
  }
  function statue(x: number, y: number, r: () => number) {
    groundWash(ctx, x + 6, y + 3, 24, 6, 0.4);
    const plinth = () => { ctx.beginPath(); ctx.rect(x - 14, y - 16, 28, 16); };
    ctx.fillStyle = PAPER; plinth(); ctx.fill(); hatch(ctx, plinth, [x - 14, y - 16, 28, 16], -0.3, 1.6, 0.45, INK, r); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; plinth(); ctx.stroke();
    // a robed founder holding up a quill, like the wizard
    const fig = () => { ctx.beginPath(); ctx.moveTo(x - 8, y - 16); ctx.quadraticCurveTo(x - 9, y - 40, x - 4, y - 50); ctx.lineTo(x + 4, y - 50); ctx.quadraticCurveTo(x + 9, y - 40, x + 8, y - 16); ctx.closePath(); };
    ctx.fillStyle = '#e6dfcf'; fig(); ctx.fill(); hatch(ctx, fig, [x - 10, y - 52, 20, 38], -0.7, 1.7, 0.45); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; fig(); ctx.stroke();
    ctx.fillStyle = '#e6dfcf'; ctx.beginPath(); ctx.arc(x, y - 55, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 5, y - 42); ctx.lineTo(x + 12, y - 60); ctx.stroke();
    ctx.lineWidth = 0.5; ctx.beginPath(); for (let t = 0.3; t < 1; t += 0.12) { const px = x + 5 + 7 * t, py = y - 42 - 18 * t; ctx.moveTo(px, py); ctx.lineTo(px + 3, py + 1); } ctx.stroke();
  }
  function crates(x: number, y: number, r: () => number) {
    groundWash(ctx, x + 4, y + 3, 22, 5, 0.35);
    for (const [cx, cy, w] of [[-10, 0, 18], [9, 0, 16], [-1, -18, 16]] as [number, number, number][]) {
      const b = () => { ctx.beginPath(); ctx.rect(x + cx - w / 2, y + cy - w, w, w); };
      ctx.fillStyle = PAPER; b(); ctx.fill(); hatch(ctx, b, [x + cx - w / 2, y + cy - w, w, w], -0.4, 2.4, 0.4, INK, r);
      ctx.strokeStyle = INK; ctx.lineWidth = 1; b(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + cx - w / 2, y + cy - w); ctx.lineTo(x + cx + w / 2, y + cy); ctx.stroke();
    }
  }
  function puddle(x: number, y: number) {
    ctx.fillStyle = 'rgba(52,48,46,0.16)'; ctx.beginPath(); ctx.ellipse(x, y, 24, 9, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(x, y, 24, 9, 0.1, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 4, y, 9, 3, 0.1, 0, Math.PI * 2); ctx.stroke();
  }
  function hens(x: number, y: number, r: () => number) {
    for (let i = 0; i < 3; i++) {
      const hx = x + (i - 1) * 16 + (r() - 0.5) * 6, hy = y + (r() - 0.5) * 10, d = r() < 0.5 ? -1 : 1;
      ctx.save(); ctx.translate(hx, hy); ctx.scale(d, 1);
      groundWash(ctx, 0, 1, 8, 2.5, 0.35);
      ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-7, -6); ctx.quadraticCurveTo(-8, 0, 0, 0); ctx.quadraticCurveTo(6, 0, 6, -6); ctx.lineTo(7, -11); ctx.quadraticCurveTo(4, -13, 3, -9); ctx.quadraticCurveTo(-2, -9, -7, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(-10, -10); ctx.lineTo(-8, -5); ctx.stroke();
      ctx.fillStyle = '#7a2826'; ctx.beginPath(); ctx.arc(5.5, -12.5, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(7, -10); ctx.lineTo(9.5, -9.5); ctx.lineTo(7, -9); ctx.fill(); ctx.beginPath(); ctx.arc(5.2, -10.3, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(-1, 3); ctx.moveTo(2, 0); ctx.lineTo(2, 3); ctx.stroke();
      ctx.restore();
    }
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  label(ctx, 'the fallen Gatehouse', 130, 405, 15);
  label(ctx, 'the Breach', 1010, 66, 15);
  label(ctx, 'the Old Well', 1010, 396, 14);
  label(ctx, 'Stables', 1200, 978, 14);
  label(ctx, 'the East Gate', 1462, 594, 15);
  label(ctx, 'the Inkwell', INKWELL.x, INKWELL.y + 54, 14);

  finishSheet(ctx, R, 'The Castle Courtyard', 'Defence of Goosebridge Castle · Level 2');
  return cv;
}
