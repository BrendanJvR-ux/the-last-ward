// The static sheet: a pen-and-ink drawing on cream paper with a grey-sepia wash.
// Roads, the river and its spring, gnarled trees and fynbos, the mill, the windmill, the castle
// and the inkwell are drawn once; everything that moves is drawn live in render.ts.
import {
  KEEP_FLOORS, MAP_W, MAP_H, GUTTER_X, LANES, LANE_IDS, RIVER, POND, MILL, BRIDGE, INKWELL, CASTLE, LEVEL, GATE,
  LEY_EDGES, NODE, FOUNDATION_IDS, pointAt, type Vec,
} from './map';
import {
  inkSurreal, scribble, inkSmudge, foldCrease, inkCastle, inkInkwell, windmillBody, windmillSails, turret, paperVignette, groundWash, goose,
  hatch, grow, limbs, proteaHead, seed, sepia, INK, INK2, PAPER, GOLD, type Seg,
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
  if (LEVEL === 'keep') return buildKeep(scale);
  if (LEVEL === 'fen') return buildFen(scale);
  if (LEVEL === 'barrows') return buildBarrows(scale);
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
function finishSheet(ctx: CanvasRenderingContext2D, R: () => number, title: string, subtitle: string, plateY = 880, plateX = 40) {
  // the sheet was folded once across and once down
  foldCrease(ctx, true, MAP_H * 0.54, R);
  foldCrease(ctx, false, GUTTER_X, R);
  paperVignette(ctx);
  // Title plate, ruled in ink
  const py = plateY, px = plateX;
  ctx.fillStyle = 'rgba(228,211,182,0.92)'; roundRect(ctx, px, py, 350, 78, 4); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.lineWidth = 0.6; roundRect(ctx, px + 5, py + 5, 340, 68, 3); ctx.stroke();
  ctx.font = `italic 600 23px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillStyle = INK;
  ctx.fillText(title, px + 16, py + 38);
  ctx.font = `italic 14px ${SERIF}`; ctx.fillStyle = 'rgba(58,34,18,0.7)';
  ctx.fillText(subtitle, px + 18, py + 62);
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

// ── Level 3: the keep, in cut-away ──────────────────────────────────────────

/** A flight of stairs seen side-on along a segment of a way: treads and risers above a hatched stringer. */
function stairFlight(ctx: Ctx, a: Vec, b: Vec, R: () => number) {
  const up = b.y < a.y;
  const lo = up ? a : b, hi = up ? b : a;
  const n = Math.max(3, Math.round((lo.y - hi.y) / 14));
  const dx = (hi.x - lo.x) / n, dy = (hi.y - lo.y) / n;
  // the stair body: from the step profile down to a parallel stringer
  const body = () => {
    ctx.beginPath(); ctx.moveTo(lo.x - dx * 0.5, lo.y + 20);
    for (let i = 0; i < n; i++) { const x = lo.x + dx * i, y = lo.y + 20 + dy * i; ctx.lineTo(x, y + dy); ctx.lineTo(x + dx, y + dy); }
    ctx.lineTo(hi.x + dx * 0.5, hi.y + 20); ctx.lineTo(hi.x + dx * 0.5, hi.y + 44); ctx.lineTo(lo.x - dx * 0.5 + (dx > 0 ? 18 : -18), lo.y + 44); ctx.closePath();
  };
  ctx.fillStyle = PAPER; body(); ctx.fill();
  hatch(ctx, body, [Math.min(lo.x, hi.x) - 30, hi.y, Math.abs(hi.x - lo.x) + 60, lo.y - hi.y + 50], dx > 0 ? -0.6 : 0.6, 2.2, 0.45, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; body(); ctx.stroke();
  // a handrail on turned posts
  ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(lo.x, lo.y - 18); ctx.lineTo(hi.x, hi.y - 18); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.beginPath();
  for (let i = 0; i <= n; i += 2) { const x = lo.x + dx * i, y = lo.y + dy * i; ctx.moveTo(x, y + 20 + dy); ctx.lineTo(x, y - 18); }
  ctx.stroke();
}

/** A runner of carpet along a floor where a way walks across it. */
function runner(ctx: Ctx, a: Vec, b: Vec) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y = a.y + 12;
  ctx.fillStyle = 'rgba(122,40,38,0.32)'; ctx.fillRect(x0, y, x1 - x0, 8);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.strokeRect(x0, y, x1 - x0, 8);
  ctx.lineWidth = 0.5; ctx.beginPath();
  for (let x = x0 + 6; x < x1 - 4; x += 12) { ctx.moveTo(x, y + 4); ctx.lineTo(x + 3, y + 1); ctx.lineTo(x + 6, y + 4); ctx.lineTo(x + 3, y + 7); ctx.closePath(); }
  ctx.stroke();
}

function keepWay(ctx: Ctx, pts: Vec[], R: () => number) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (Math.abs(b.y - a.y) > 30) stairFlight(ctx, a, b, R);
    else runner(ctx, a, b);
  }
}

function archWindow(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const win = () => { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w / 2); ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y); ctx.closePath(); };
  const g = ctx.createLinearGradient(x, y - h, x, y); g.addColorStop(0, 'rgba(250,240,210,0.9)'); g.addColorStop(1, 'rgba(230,215,180,0.7)');
  ctx.fillStyle = g; win(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; win(); ctx.stroke();
  ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); for (let k = y - 12; k > y - h + 6; k -= 12) { ctx.moveTo(x - w / 2, k); ctx.lineTo(x + w / 2, k); } ctx.stroke();
}

function bookshelf(ctx: Ctx, x: number, base: number, w: number, h: number, R: () => number) {
  ctx.fillStyle = PAPER; ctx.fillRect(x, base - h, w, h); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(x, base - h, w, h);
  const shelves = Math.floor(h / 26);
  for (let i = 0; i < shelves; i++) {
    const sy = base - h + 4 + i * 26;
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, sy + 22); ctx.lineTo(x + w, sy + 22); ctx.stroke();
    let bx = x + 3;
    while (bx < x + w - 6) {
      const bw = 3 + R() * 4, bh = 12 + R() * 8, lean = R() < 0.1;
      ctx.fillStyle = R() < 0.25 ? 'rgba(122,40,38,0.45)' : R() < 0.5 ? 'rgba(58,34,18,0.35)' : PAPER;
      ctx.save(); ctx.translate(bx, sy + 22); if (lean) ctx.rotate(0.25);
      ctx.fillRect(0, -bh, bw, bh); ctx.lineWidth = 0.5; ctx.strokeRect(0, -bh, bw, bh);
      ctx.restore();
      bx += bw + 0.6;
    }
  }
}

function longTable(ctx: Ctx, x: number, base: number, w: number) {
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.fillRect(x, base - 26, w, 6); ctx.strokeRect(x, base - 26, w, 6);
  ctx.beginPath(); for (const lx of [x + 10, x + w - 10]) { ctx.moveTo(lx, base - 20); ctx.lineTo(lx - 4, base); ctx.moveTo(lx, base - 20); ctx.lineTo(lx + 4, base); } ctx.stroke();
  // goblets, a platter and candles
  for (let i = 0; i < 5; i++) { const gx = x + 20 + i * (w - 40) / 4; ctx.beginPath(); ctx.moveTo(gx - 3, base - 36); ctx.lineTo(gx + 3, base - 36); ctx.lineTo(gx, base - 30); ctx.closePath(); ctx.moveTo(gx, base - 30); ctx.lineTo(gx, base - 26); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(x + w / 2, base - 28, 16, 3, 0, 0, Math.PI * 2); ctx.stroke();
}

function hangingChandelier(ctx: Ctx, x: number, top: number, drop: number) {
  ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + drop); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, top + drop, 22, 5, 0, 0, Math.PI * 2); ctx.stroke();
  for (let i = -2; i <= 2; i++) { const cx = x + i * 10; ctx.fillStyle = PAPER; ctx.fillRect(cx - 1.5, top + drop - 10, 3, 8); ctx.strokeRect(cx - 1.5, top + drop - 10, 3, 8); }
}

function tapestry(ctx: Ctx, x: number, top: number, w: number, h: number, R: () => number) {
  const t = () => { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w, top + h); for (let i = 0; i < 5; i++) ctx.lineTo(x + w - (i + 0.5) * w / 5, top + h + (i % 2 ? 0 : 6)); ctx.lineTo(x, top + h); ctx.closePath(); };
  ctx.fillStyle = 'rgba(122,40,38,0.25)'; t(); ctx.fill();
  hatch(ctx, t, [x, top, w, h + 8], 1.2, 3, 0.4, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1; t(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(x + w / 2, top + h * 0.45, w * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x + w / 2, top + h * 0.45, w * 0.12, 0.6, Math.PI * 2 - 0.6); ctx.fill();
  ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 4, top); ctx.lineTo(x + w + 4, top); ctx.stroke();
}

function cask(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 0.6; for (const k of [0.45, 0.8]) { ctx.beginPath(); ctx.ellipse(x, y, r * k, r * 0.9 * k, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
}

function cauldronHearth(ctx: Ctx, x: number, base: number, R: () => number) {
  // a deep kitchen fireplace with a cauldron over the fire
  const fp = () => { ctx.beginPath(); ctx.moveTo(x - 60, base); ctx.lineTo(x - 60, base - 110); ctx.lineTo(x + 60, base - 110); ctx.lineTo(x + 60, base); ctx.lineTo(x + 40, base); ctx.lineTo(x + 40, base - 70); ctx.quadraticCurveTo(x, base - 90, x - 40, base - 70); ctx.lineTo(x - 40, base); ctx.closePath(); };
  ctx.fillStyle = PAPER; fp(); ctx.fill(); hatch(ctx, fp, [x - 60, base - 110, 120, 110], -0.3, 2.2, 0.45, INK, R); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; fp(); ctx.stroke();
  ctx.fillStyle = 'rgba(29,25,21,0.85)'; ctx.beginPath(); ctx.moveTo(x - 40, base); ctx.lineTo(x - 40, base - 70); ctx.quadraticCurveTo(x, base - 90, x + 40, base - 70); ctx.lineTo(x + 40, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(214,130,58,0.65)'; ctx.beginPath(); ctx.moveTo(x - 22, base); ctx.quadraticCurveTo(x - 10, base - 30, x, base - 18); ctx.quadraticCurveTo(x + 10, base - 34, x + 22, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, base - 34, 18, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 18, base - 40); ctx.lineTo(x + 18, base - 40); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, base - 47); ctx.lineTo(x, base - 70); ctx.stroke();
  // pots on hooks along the mantel
  for (const px of [x - 48, x + 48]) { ctx.beginPath(); ctx.moveTo(px, base - 110); ctx.lineTo(px, base - 124); ctx.stroke(); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(px, base - 128, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}

function studyDesk(ctx: Ctx, x: number, base: number, R: () => number) {
  // the wizard's desk, a globe, a star chart and a candle
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.fillRect(x - 40, base - 34, 80, 6); ctx.strokeRect(x - 40, base - 34, 80, 6);
  ctx.beginPath(); ctx.moveTo(x - 34, base - 28); ctx.lineTo(x - 34, base); ctx.moveTo(x + 34, base - 28); ctx.lineTo(x + 34, base); ctx.stroke();
  ctx.lineWidth = 0.7; for (let i = 0; i < 4; i++) { ctx.strokeRect(x - 30 + i * 2, base - 40 - i * 3, 22, 3); }
  ctx.beginPath(); ctx.moveTo(x + 14, base - 34); ctx.lineTo(x + 14, base - 48); ctx.stroke();
  ctx.fillStyle = 'rgba(250,215,120,0.8)'; ctx.beginPath(); ctx.ellipse(x + 14, base - 52, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
  // globe on a stand
  const gx = x - 70;
  ctx.fillStyle = PAPER; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(gx, base - 40, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  hatch(ctx, () => { ctx.beginPath(); ctx.arc(gx, base - 40, 14, 0.4, 2.2); ctx.lineTo(gx, base - 40); ctx.closePath(); }, [gx - 14, base - 54, 28, 28], 0.9, 2, 0.4, INK, R);
  ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(gx, base - 40, 14, 5, 0.2, 0, Math.PI * 2); ctx.moveTo(gx, base - 26); ctx.lineTo(gx, base); ctx.moveTo(gx - 8, base); ctx.lineTo(gx + 8, base); ctx.stroke();
}

function buildKeep(scale: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = MAP_W * scale; cv.height = MAP_H * scale;
  const ctx = cv.getContext('2d')!;
  ctx.scale(scale, scale);
  const R = rng(37);
  const [GROUND, FIRST, SECOND, TOP] = KEEP_FLOORS;

  // paper, then the dressed stone of the inner walls in faint courses
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, MAP_W, MAP_H);
  for (let i = 0; i < 9000; i++) { ctx.fillStyle = R() < 0.5 ? 'rgba(110,90,60,0.07)' : 'rgba(255,244,222,0.2)'; ctx.fillRect(R() * MAP_W, R() * MAP_H, 1.2, 1.2); }
  for (let i = 0; i < 12; i++) groundWash(ctx, R() * MAP_W, 100 + R() * 860, 200 + R() * 200, 60 + R() * 60, 0.04 + R() * 0.04);
  ctx.lineWidth = 0.5;
  for (let y = 70; y < 990; y += 22) {
    let x = 60 - R() * 40;
    while (x < 1540) { const w = 40 + R() * 40; ctx.strokeStyle = `rgba(58,34,18,${0.08 + R() * 0.07})`; ctx.strokeRect(x, y, w, 22); x += w; }
  }
  // sky and roofline: battlements, two turrets and their pennants
  ctx.fillStyle = 'rgba(86,68,52,0.06)'; ctx.fillRect(0, 0, MAP_W, 62);
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.fillRect(20, 52, 1560, 14); ctx.strokeRect(20, 52, 1560, 14);
  for (let x = 30; x < 1570; x += 22) { ctx.fillRect(x, 40, 12, 12); ctx.strokeRect(x, 40, 12, 12); }
  for (const tx of [110, 1490]) turret(ctx, tx, 66, 70, 40, 46, tx < 800 ? 'crescent' : 'orb', true, R);
  // outer walls, thick, with the two ways in: the broken west door and the east cellar postern
  for (const [x0, x1] of [[20, 62], [1538, 1580]] as [number, number][]) {
    ctx.fillStyle = PAPER; ctx.fillRect(x0, 66, x1 - x0, 924);
    hatch(ctx, () => { ctx.beginPath(); ctx.rect(x0, 66, x1 - x0, 924); }, [x0, 66, x1 - x0, 924], 0.8, 2.6, 0.45, INK, R);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(x0, 66, x1 - x0, 924);
  }
  ctx.fillStyle = PAPER; ctx.fillRect(18, GROUND - 74, 46, 74); ctx.fillRect(1536, GROUND - 74, 46, 74);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(18, GROUND - 74); ctx.lineTo(64, GROUND - 74); ctx.moveTo(1536, GROUND - 74); ctx.lineTo(1582, GROUND - 74); ctx.stroke();
  // the splintered west door hangs off its hinge
  ctx.save(); ctx.translate(64, GROUND - 2); ctx.rotate(-0.55);
  ctx.fillStyle = PAPER; ctx.fillRect(0, -70, 12, 68); ctx.strokeRect(0, -70, 12, 68);
  ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = -64; k < 0; k += 8) { ctx.moveTo(0, k); ctx.lineTo(12, k); } ctx.stroke(); ctx.restore();
  // cellars below the ground floor: vaults and casks
  ctx.fillStyle = 'rgba(58,34,18,0.08)'; ctx.fillRect(62, GROUND + 18, 1476, 972 - GROUND - 18);
  ctx.strokeStyle = INK; ctx.lineWidth = 1;
  for (let x = 62; x < 1538; x += 120) { ctx.beginPath(); ctx.moveTo(x, 990); ctx.lineTo(x, GROUND + 50); ctx.quadraticCurveTo(x + 60, GROUND + 22, x + 120, GROUND + 50); ctx.stroke(); }
  for (const cx of [180, 230, 205, 1250, 1300, 1350, 1275, 1325]) cask(ctx, cx, cx === 205 || cx === 1275 || cx === 1325 ? 950 : 972, 14);

  // floors: timber floors on joists, the ground floor flagged
  for (const fy of KEEP_FLOORS) {
    ctx.fillStyle = PAPER; ctx.fillRect(62, fy, 1476, 18);
    hatch(ctx, () => { ctx.beginPath(); ctx.rect(62, fy + 6, 1476, 12); }, [62, fy, 1476, 18], 0, 3, 0.45, INK, R);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(62, fy); ctx.lineTo(1538, fy); ctx.moveTo(62, fy + 18); ctx.lineTo(1538, fy + 18); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.beginPath(); for (let x = 90; x < 1538; x += 60) { ctx.moveTo(x, fy + 18); ctx.lineTo(x, fy + 26); } ctx.stroke();
  }
  // the rooms, floor by floor: windows, tapestries, shelves, hall, kitchen, study
  for (const [wx, fy] of [[160, GROUND], [1000, GROUND], [600, FIRST], [1440, FIRST], [300, SECOND], [1360, SECOND], [380, TOP], [700, TOP]] as [number, number][]) archWindow(ctx, wx, fy - 70, 30, 90);
  bookshelf(ctx, 90, FIRST, 160, 150, R);
  bookshelf(ctx, 1300, TOP, 80, 120, R);
  tapestry(ctx, 1260, SECOND - 190, 46, 100, R);
  tapestry(ctx, 160, SECOND - 190, 46, 100, R);
  tapestry(ctx, 1420, FIRST - 190, 46, 100, R);
  longTable(ctx, 120, SECOND, 240);
  hangingChandelier(ctx, 240, TOP + 18, 70);
  hangingChandelier(ctx, 900, FIRST + 18, 60);
  cauldronHearth(ctx, 800, GROUND, R);
  studyDesk(ctx, 1380, TOP, R);
  // stone ledges and landings for the towers that stand between floors
  for (const id of ['f_westledge', 'f_eastledge', 'f_studyledge', 'f_bell']) {
    const n = NODE[id];
    ctx.fillStyle = PAPER; ctx.fillRect(n.x - 46, n.y + 2, 92, 12);
    hatch(ctx, () => { ctx.beginPath(); ctx.rect(n.x - 46, n.y + 2, 92, 12); }, [n.x - 46, n.y + 2, 92, 12], 0.5, 2, 0.45, INK, R);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(n.x - 46, n.y + 2, 92, 12);
    for (const bx of [n.x - 34, n.x + 34]) { ctx.beginPath(); ctx.moveTo(bx - 8, n.y + 14); ctx.quadraticCurveTo(bx, n.y + 40, bx + 2, n.y + 44); ctx.lineTo(bx + 8, n.y + 14); ctx.stroke(); }
  }
  // the ways up: carpets along the floors, stairs between them
  keepWay(ctx, LANES.mill.pts, R);
  keepWay(ctx, LANES.king.pts.slice(0, LANES.king.pts.indexOf(LANES.king.pts.find((p) => p === LANES.mill.pts[4])!) + 1), R);
  // the study door, and the study itself
  const door = LANES.mill.pts.at(-1)!;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(door.x + 14, TOP); ctx.lineTo(door.x + 14, TOP - 64); ctx.arc(door.x + 28, TOP - 64, 14, Math.PI, 0); ctx.lineTo(door.x + 42, TOP); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = PAPER; ctx.lineWidth = 0.8; ctx.beginPath(); for (let y = TOP - 70; y < TOP; y += 9) { ctx.moveTo(door.x + 16, y); ctx.lineTo(door.x + 40, y); } ctx.stroke();
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(door.x + 36, TOP - 32, 2, 0, Math.PI * 2); ctx.fill();
  st_ley(ctx);
  inkInkwell(ctx, INKWELL);

  label(ctx, 'the Great Stair', 210, GROUND - 98, 15);
  label(ctx, 'the Cellar Stair', 1390, GROUND - 98, 15);
  label(ctx, 'Kitchen', 800, GROUND + 44, 14);
  label(ctx, 'Library', 170, FIRST - 166, 14);
  label(ctx, 'Great Hall', 240, SECOND - 120, 15);
  label(ctx, 'the Study', 1310, TOP - 150, 15);
  label(ctx, 'Cellars', 760, 980, 13);

  finishSheet(ctx, R, 'The Keep', 'Defence of Goosebridge Castle · Level 3', 70);
  return cv;
}

/** Leylines on the keep sheet (the same dotted ink as elsewhere). */
function st_ley(ctx: Ctx) {
  inkSurreal.ley(ctx, LEY_EDGES.map((e) => e.pts), Object.values(NODE).filter((n) => !n.foundation && n.id !== 'ink').map((n) => ({ x: n.x, y: n.y })));
}


// ── Shared helpers for the open-country sheets (levels 4 and 5) ─────────────

/** Room for scenery: off the roads, leylines, foundations, inkwell, gate and title plate. */
function openGround(p: Vec, r: number, plate: [number, number, number, number], taken: Spot[] = []): boolean {
  if (p.x < 30 + r || p.x > MAP_W - 30 - r || p.y < 30 + r || p.y > MAP_H - 30 - r) return false;
  const [px, py, pw, ph] = plate;
  if (p.x > px - r - 6 && p.x < px + pw + r + 6 && p.y > py - r - 6 && p.y < py + ph + r + 6) return false;
  if (Math.hypot(p.x - INKWELL.x, p.y - INKWELL.y) < r + 100) return false;
  if (Math.hypot(p.x - GATE.x, p.y - GATE.y) < r + 120) return false;
  if (nearRoad(p, r + 30) || nearLey(p, r + 12)) return false;
  if (FOUNDATION_IDS.some((f) => Math.hypot(NODE[f].x - p.x, NODE[f].y - p.y) < r + 62)) return false;
  return !taken.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < t.r + r + 6);
}
function scatter(R: () => number, n: number, r: number, plate: [number, number, number, number], taken: Spot[], tries = 1500): Spot[] {
  const out: Spot[] = [];
  for (let i = 0; i < tries && out.length < n; i++) {
    const p = { x: R() * MAP_W, y: R() * MAP_H };
    if (openGround(p, r, plate, taken)) { const sp = { ...p, r }; taken.push(sp); out.push(sp); }
  }
  return out;
}
function paperGround(ctx: Ctx, R: () => number, mottles = 50) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, MAP_W, MAP_H);
  for (let i = 0; i < 9000; i++) { ctx.fillStyle = R() < 0.5 ? 'rgba(110,90,60,0.07)' : 'rgba(255,244,222,0.2)'; ctx.fillRect(R() * MAP_W, R() * MAP_H, 1.2, 1.2); }
  for (let i = 0; i < mottles; i++) {
    const x = R() * MAP_W, y = R() * MAP_H, r = 40 + R() * 220;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(120,78,38,${0.02 + R() * 0.05})`); g.addColorStop(1, 'rgba(120,78,38,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
/** A clump of reeds with bulrush heads. */
function reeds(ctx: Ctx, x: number, y: number, n: number, R: () => number) {
  ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let i = 0; i < n; i++) { const bx = x + (i - n / 2) * 2.6 + (R() - 0.5) * 2, h = 12 + R() * 14, lean = (R() - 0.5) * 6; ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + lean * 0.3, y - h * 0.6, bx + lean, y - h); }
  ctx.stroke();
  ctx.fillStyle = INK;
  for (let i = 0; i < Math.ceil(n / 4); i++) { const bx = x + (R() - 0.5) * n * 2.4, h = 16 + R() * 10; ctx.beginPath(); ctx.ellipse(bx, y - h, 1.6, 4, 0, 0, Math.PI * 2); ctx.fill(); }
}
/** A raised bank under a road: a wide paper band with hatched slopes. */
function embankment(ctx: Ctx, pts: Vec[], R: () => number, half = 34) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(86,68,52,0.18)'; ctx.lineWidth = half * 2 + 10; smoothPath(ctx, pts, 50); ctx.stroke();
  ctx.strokeStyle = PAPER; ctx.lineWidth = half * 2; smoothPath(ctx, pts, 50); ctx.stroke();
  // slope hatching along both sides
  ctx.strokeStyle = 'rgba(58,34,18,0.45)'; ctx.lineWidth = 0.6;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    ctx.beginPath();
    for (let d = 0; d < L; d += 5) for (const sd of [-1, 1]) {
      const cx = a.x + ux * d, cy = a.y + uy * d, nx = -uy * sd, ny = ux * sd;
      const o0 = half - 12 - R() * 2, o1 = half;
      ctx.moveTo(cx + nx * o0, cy + ny * o0); ctx.lineTo(cx + nx * o1 + ux * 2, cy + ny * o1 + uy * 2);
    }
    ctx.stroke();
  }
}


// ── More life on the fen ────────────────────────────────────────────────────

/** Rings of water round anything standing in the flood. */
function wading(ctx: Ctx, x: number, y: number, w: number) {
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.6;
  for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.ellipse(x, y + 1, w + k * 7, 3 + k * 2, 0, 0, Math.PI * 2); ctx.stroke(); }
}
/** A pollard willow: a squat trunk bursting into a crown of wands. */
function pollardWillow(ctx: Ctx, x: number, y: number, R: () => number) {
  wading(ctx, x, y, 12);
  limbs(ctx, [{ x1: x, y1: y, x2: x + (R() - 0.5) * 4, y2: y - 26, w: 9 }], R, true);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.beginPath();
  for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (i - 7.5) * 0.17, L = 18 + R() * 16, bx = x + (i - 7.5) * 0.8; ctx.moveTo(bx, y - 26); ctx.quadraticCurveTo(bx + Math.cos(a) * L * 0.4, y - 26 + Math.sin(a) * L * 0.6, bx + Math.cos(a) * L, y - 26 + Math.sin(a) * L + L * 0.25); }
  ctx.stroke();
  ctx.lineWidth = 0.4; ctx.beginPath();
  for (let i = 0; i < 30; i++) { const lx = x - 22 + R() * 44, ly = y - 50 + R() * 26; ctx.moveTo(lx, ly); ctx.lineTo(lx + 2, ly + 4); }
  ctx.stroke();
}
/** An eel-catcher's hut on stilts, with a ladder and nets hung to dry. */
function stiltHut(ctx: Ctx, x: number, y: number, R: () => number) {
  wading(ctx, x, y, 30);
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); for (const px of [-20, -6, 8, 22]) { ctx.moveTo(x + px, y); ctx.lineTo(x + px * 0.9, y - 30); } ctx.stroke();
  ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x - 20, y - 4); ctx.lineTo(x + 22, y - 26); ctx.moveTo(x + 22, y - 4); ctx.lineTo(x - 20, y - 26); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.fillRect(x - 24, y - 34, 50, 5); ctx.strokeRect(x - 24, y - 34, 50, 5);
  ctx.fillRect(x - 18, y - 58, 36, 24); ctx.lineWidth = 1.1; ctx.strokeRect(x - 18, y - 58, 36, 24);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 18, y - 58, 36, 24); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath(); for (let k = -16; k < 18; k += 4) { ctx.moveTo(x + k, y - 58); ctx.lineTo(x + k, y - 34); } ctx.stroke(); ctx.restore();
  const roof = () => { ctx.beginPath(); ctx.moveTo(x - 24, y - 56); ctx.quadraticCurveTo(x, y - 84, x + 24, y - 56); ctx.closePath(); };
  ctx.fillStyle = PAPER; roof(); ctx.fill(); hatch(ctx, roof, [x - 24, y - 84, 48, 28], -1.2, 1.8, 0.5, INK, R); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; roof(); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(x - 4, y - 50, 8, 16);
  // ladder
  ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 26, y + 2); ctx.lineTo(x + 32, y - 32); ctx.moveTo(x + 32, y + 2); ctx.lineTo(x + 38, y - 32);
  for (let k = 0; k < 6; k++) { const t = k / 6; ctx.moveTo(x + 26 + t * 6, y + 2 - t * 34); ctx.lineTo(x + 32 + t * 6, y + 2 - t * 34); } ctx.stroke();
  // a net drying on a pole
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 30, y - 34); ctx.lineTo(x - 48, y - 60); ctx.stroke();
  ctx.lineWidth = 0.4; ctx.beginPath(); for (let k = 0; k < 6; k++) { ctx.moveTo(x - 46 + k * 2.5, y - 57 + k * 3.6); ctx.lineTo(x - 52 + k * 2.5, y - 30 + k); ctx.moveTo(x - 50, y - 50 + k * 4); ctx.lineTo(x - 34, y - 44 + k * 3); } ctx.stroke();
}
/** A drainage windpump on its bank, sails still. */
function drainageMill(ctx: Ctx, x: number, y: number, R: () => number) {
  const bank = () => { ctx.beginPath(); ctx.ellipse(x, y + 2, 44, 14, 0, 0, Math.PI * 2); };
  ctx.fillStyle = PAPER; bank(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; bank(); ctx.stroke();
  windmillBody(ctx, x, y);
  windmillSails(ctx, x, y - 56, 0.3);
  void R;
}
/** The top of a drowned church tower standing out of the flood. */
function drownedTower(ctx: Ctx, x: number, y: number, R: () => number) {
  wading(ctx, x, y, 30);
  ctx.fillStyle = PAPER; ctx.fillRect(x - 18, y - 46, 36, 46);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 18, y - 46, 36, 46); ctx.clip();
  ctx.strokeStyle = 'rgba(58,34,18,0.4)'; ctx.lineWidth = 0.5; for (let yy = y - 46; yy < y; yy += 7) { ctx.beginPath(); ctx.moveTo(x - 18, yy); ctx.lineTo(x + 18, yy); ctx.stroke(); }
  ctx.fillStyle = sepia(0.3); ctx.fillRect(x + 6, y - 48, 14, 50); ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.strokeRect(x - 18, y - 46, 36, 46);
  for (let k = -18; k < 18; k += 9) { ctx.fillStyle = PAPER; ctx.fillRect(x + k, y - 54, 6, 8); ctx.strokeRect(x + k, y - 54, 6, 8); }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 5, y - 14); ctx.lineTo(x - 5, y - 30); ctx.arc(x, y - 30, 5, Math.PI, 0); ctx.lineTo(x + 5, y - 14); ctx.closePath(); ctx.fill();
  // a weathercock still turning above the flood
  ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 54); ctx.lineTo(x, y - 74); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 7, y - 74); ctx.quadraticCurveTo(x, y - 82, x + 8, y - 76); ctx.lineTo(x + 3, y - 72); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
  // flood-wrack caught on the stones
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath(); for (let i = 0; i < 10; i++) { const bx = x - 20 + R() * 40; ctx.moveTo(bx, y - 2); ctx.lineTo(bx + (R() - 0.5) * 8, y - 6); } ctx.stroke();
}
/** A fish weir: hurdles of woven withies set in a V across the current. */
function fishWeir(ctx: Ctx, x: number, y: number, a: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  for (const sd of [-1, 1]) {
    ctx.beginPath(); for (let k = 0; k <= 6; k++) { ctx.moveTo(k * 6, sd * k * 4); ctx.lineTo(k * 6, sd * k * 4 - 8); } ctx.stroke();
    ctx.lineWidth = 0.6; ctx.beginPath(); for (const o of [-2, -5]) { ctx.moveTo(0, o); for (let k = 0; k <= 6; k++) ctx.lineTo(k * 6, sd * k * 4 + o + (k % 2 ? 1 : -1)); } ctx.stroke(); ctx.lineWidth = 1.2;
  }
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(18, 0, 26, 18, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
/** Ducks paddling in a line, each with its wake. */
function ducks(ctx: Ctx, x: number, y: number, n: number, dir: number) {
  for (let i = 0; i < n; i++) {
    const dx = x + i * 14 * -dir, dy = y + i * 2;
    ctx.save(); ctx.translate(dx, dy); ctx.scale(dir, 1);
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-6, -5, 1, -4); ctx.lineTo(3, -7); ctx.arc(4.5, -7.5, 2, Math.PI, 0); ctx.lineTo(8, -7); ctx.lineTo(6, -5); ctx.quadraticCurveTo(7, 0, -6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-8, 1); ctx.lineTo(-18, 3); ctx.moveTo(-8, 1); ctx.lineTo(-16, -1); ctx.stroke();
    ctx.restore();
  }
}
/** A raft of water-lily pads with a flower or two. */
function lilies(ctx: Ctx, x: number, y: number, R: () => number) {
  for (let i = 0; i < 6; i++) {
    const lx = x + (R() - 0.5) * 30, ly = y + (R() - 0.5) * 14, r = 4 + R() * 3, a = R() * 6;
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.ellipse(lx, ly, r, r * 0.55, 0, a, a + Math.PI * 1.8); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#efe6d2'; ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ctx.ellipse(x + Math.cos(a) * 2, y - 2 + Math.sin(a), 2.4, 1.2, a, 0, Math.PI * 2); } ctx.fill(); ctx.stroke();
}
/** Eel-nets strung between two poles. */
function netPoles(ctx: Ctx, x: number, y: number) {
  wading(ctx, x, y, 22);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x - 18, y - 30); ctx.moveTo(x + 18, y); ctx.lineTo(x + 18, y - 28); ctx.stroke();
  ctx.lineWidth = 0.4; ctx.beginPath();
  for (let k = 0; k <= 8; k++) { ctx.moveTo(x - 18 + k * 4.5, y - 28 + Math.sin(k / 8 * Math.PI) * 6); ctx.lineTo(x - 18 + k * 4.5, y - 4); }
  for (let k = 0; k < 5; k++) { ctx.moveTo(x - 18, y - 26 + k * 5); ctx.quadraticCurveTo(x, y - 20 + k * 5, x + 18, y - 26 + k * 5); }
  ctx.stroke();
  ctx.fillStyle = INK; for (const fx of [x - 10, x + 2, x + 12]) { ctx.beginPath(); ctx.arc(fx, y - 26 + Math.sin(((fx - x + 18) / 36) * Math.PI) * 5, 1.4, 0, Math.PI * 2); ctx.fill(); }
}

// ── More life on the downs ──────────────────────────────────────────────────

/** A dolmen: a great capstone on three uprights. */
function dolmen(ctx: Ctx, x: number, y: number, R: () => number) {
  groundWash(ctx, x + 10, y + 2, 46, 10, 0.4);
  for (const [dx, h] of [[-22, 30], [20, 28], [0, 26]] as [number, number][]) {
    const up = () => { ctx.beginPath(); ctx.moveTo(x + dx - 6, y); ctx.lineTo(x + dx - 5, y - h); ctx.lineTo(x + dx + 5, y - h - 2); ctx.lineTo(x + dx + 6, y); ctx.closePath(); };
    ctx.fillStyle = '#d8c7a8'; up(); ctx.fill(); hatch(ctx, up, [x + dx - 7, y - h - 2, 14, h + 2], 0.9, 1.8, 0.45, INK, R); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; up(); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(29,25,21,0.7)'; ctx.fillRect(x - 15, y - 24, 30, 22);
  const cap = () => { ctx.beginPath(); ctx.moveTo(x - 36, y - 28); ctx.quadraticCurveTo(x - 20, y - 46, x + 10, y - 44); ctx.quadraticCurveTo(x + 36, y - 40, x + 34, y - 28); ctx.quadraticCurveTo(x, y - 22, x - 36, y - 28); ctx.closePath(); };
  ctx.fillStyle = '#d8c7a8'; cap(); ctx.fill(); hatch(ctx, cap, [x - 36, y - 46, 72, 24], 0.3, 2, 0.45, INK, R); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; cap(); ctx.stroke();
}
/** A short row of little stones running across the down. */
function stoneRow(ctx: Ctx, x: number, y: number, a: number, R: () => number) {
  for (let i = 0; i < 6; i++) stone(ctx, x + Math.cos(a) * i * 16, y + Math.sin(a) * i * 16, 12 + R() * 6, R);
}
/** A gorse bush: a spiky round clump with a few flowers. */
function gorse(ctx: Ctx, x: number, y: number, r: number, R: () => number) {
  groundWash(ctx, x + 3, y + 1, r * 1.2, r * 0.3, 0.3);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let i = 0; i < 40; i++) { const a = -Math.PI * R(), L = r * (0.4 + R() * 0.7), bx = x + (R() - 0.5) * r; ctx.moveTo(bx, y); ctx.lineTo(bx + Math.cos(a) * L, y + Math.sin(a) * L); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(195,150,52,0.85)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + (R() - 0.5) * r * 1.4, y - R() * r * 0.9, 1.3, 0, Math.PI * 2); ctx.fill(); }
}
/** Sheep grazing on the down. */
function sheep(ctx: Ctx, x: number, y: number, dir: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); for (const lx of [-5, -2, 3, 6]) { ctx.moveTo(lx, -3); ctx.lineTo(lx, 3); } ctx.stroke();
  ctx.fillStyle = '#efe6d2'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (let i = 0; i < 6; i++) ctx.arc(-6 + i * 2.6, -6 + (i % 2) * 1.5, 3.2, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(10, -4, 2.8, 2, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/** A shepherd's hut on iron wheels. */
function shepherdsHut(ctx: Ctx, x: number, y: number, R: () => number) {
  groundWash(ctx, x + 6, y + 2, 36, 8, 0.35);
  ctx.fillStyle = PAPER; ctx.fillRect(x - 26, y - 34, 52, 24);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 26, y - 34, 52, 24); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath(); for (let k = -24; k < 26; k += 4) { ctx.moveTo(x + k, y - 34); ctx.lineTo(x + k, y - 10); } ctx.stroke(); ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.strokeRect(x - 26, y - 34, 52, 24);
  const roof = () => { ctx.beginPath(); ctx.moveTo(x - 30, y - 32); ctx.quadraticCurveTo(x, y - 50, x + 30, y - 32); ctx.closePath(); };
  ctx.fillStyle = PAPER; roof(); ctx.fill(); hatch(ctx, roof, [x - 30, y - 50, 60, 18], 0, 2, 0.5, INK, R); ctx.lineWidth = 1.1; roof(); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(x + 8, y - 30, 8, 18); ctx.fillRect(x - 14, y - 28, 8, 7);
  ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 2, y - 52); ctx.lineTo(x - 2, y - 44); ctx.stroke();
  for (const wx of [-16, 16]) { ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x + wx, y - 4, 6, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 0.5; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.moveTo(x + wx, y - 4); ctx.lineTo(x + wx + Math.cos(a) * 6, y - 4 + Math.sin(a) * 6); } ctx.stroke(); }
}
/** An old gibbet with crows on the arm. */
function gibbet(ctx: Ctx, x: number, y: number, R: () => number) {
  groundWash(ctx, x + 4, y + 1, 20, 5, 0.35);
  limbs(ctx, [{ x1: x, y1: y, x2: x, y2: y - 66, w: 4 }, { x1: x - 2, y1: y - 62, x2: x + 28, y2: y - 62, w: 3 }, { x1: x, y1: y - 46, x2: x + 12, y2: y - 62, w: 2 }], R, false);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x + 24, y - 62); ctx.lineTo(x + 24, y - 44); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + 24, y - 38, 5, 7, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); for (let k = -4; k <= 4; k += 2.5) { ctx.moveTo(x + 24 + k, y - 45); ctx.lineTo(x + 24 + k * 0.8, y - 31); } ctx.stroke();
  for (const cx of [x + 8, x + 18]) crow(ctx, cx, y - 64, 1);
}
/** A crow perched, or flying when `fly`. */
function crow(ctx: Ctx, x: number, y: number, dir: number, fly = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.fillStyle = INK;
  if (fly) {
    ctx.beginPath(); ctx.moveTo(-12, -3); ctx.quadraticCurveTo(-5, -9, 0, -1); ctx.quadraticCurveTo(5, -9, 12, -4); ctx.quadraticCurveTo(5, -4, 0, 1); ctx.quadraticCurveTo(-5, -4, -12, -3); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(0, -5, 3.4, 5, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.4, -10, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, -10.5); ctx.lineTo(7.5, -9.5); ctx.lineTo(4, -9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-6, 2); ctx.lineTo(-3, -1); ctx.fill();
  }
  ctx.restore();
}
/** An owl on top of a standing stone. */
function owlStone(ctx: Ctx, x: number, y: number, R: () => number) {
  stone(ctx, x, y, 40, R);
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 0.9;
  const body = () => { ctx.beginPath(); ctx.ellipse(x, y - 47, 6, 8, 0, 0, Math.PI * 2); };
  body(); ctx.fill(); hatch(ctx, body, [x - 6, y - 55, 12, 16], -0.6, 1.5, 0.4); body(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 5, y - 54); ctx.lineTo(x - 5, y - 59); ctx.lineTo(x - 2, y - 55); ctx.moveTo(x + 5, y - 54); ctx.lineTo(x + 5, y - 59); ctx.lineTo(x + 2, y - 55); ctx.stroke();
  ctx.fillStyle = 'rgba(240,220,150,0.95)'; ctx.beginPath(); ctx.arc(x - 2.4, y - 52, 1.8, 0, Math.PI * 2); ctx.arc(x + 2.4, y - 52, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x - 2.4, y - 52, 0.8, 0, Math.PI * 2); ctx.arc(x + 2.4, y - 52, 0.8, 0, Math.PI * 2); ctx.fill();
}
/** A rising crescent moon and a few early stars. */
function moonAndStars(ctx: Ctx, x: number, y: number, R: () => number) {
  ctx.fillStyle = '#f3ead6'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 18, 0.5, Math.PI * 2 - 0.5); ctx.arc(x + 8, y - 3, 15, Math.PI * 2 - 0.62, 0.62, true); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(58,34,18,0.6)'; ctx.lineWidth = 0.7;
  for (let i = 0; i < 7; i++) { const sx = x - 70 + R() * 160, sy = y - 20 + R() * 50, r = 2 + R() * 2; ctx.beginPath(); ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r); ctx.stroke(); }
}
/** A broken burial urn with bones spilt in the grass. */
function spiltUrn(ctx: Ctx, x: number, y: number, R: () => number) {
  groundWash(ctx, x + 3, y + 1, 18, 4, 0.3);
  const urn = () => { ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x - 12, y - 10, x - 6, y - 16); ctx.lineTo(x + 2, y - 14); ctx.lineTo(x + 6, y - 4); ctx.closePath(); };
  ctx.fillStyle = PAPER; urn(); ctx.fill(); hatch(ctx, urn, [x - 12, y - 16, 18, 16], 0.5, 1.8, 0.45, INK, R); ctx.strokeStyle = INK; ctx.lineWidth = 0.9; urn(); ctx.stroke();
  ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(x - 10, y - 4 - k * 4); ctx.lineTo(x + 3, y - 3 - k * 4); } ctx.stroke();
  ctx.fillStyle = '#efe6d2'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x + 10 + i * 5, y - 1 + (i % 2) * 2, 3.4, 1.1, R() - 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}

// ── Level 4: the flooded fen ────────────────────────────────────────────────

/** A half-drowned cottage roof standing out of the flood. */
function drownedRoof(ctx: Ctx, x: number, y: number, R: () => number) {
  const roof = () => { ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x - 16, y - 26); ctx.lineTo(x + 22, y - 26); ctx.lineTo(x + 34, y); ctx.closePath(); };
  ctx.fillStyle = PAPER; roof(); ctx.fill(); hatch(ctx, roof, [x - 30, y - 26, 64, 26], 0.6, 2.2, 0.5, INK, R); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; roof(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.fillRect(x + 8, y - 40, 8, 16); ctx.strokeRect(x + 8, y - 40, 8, 16);
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(x + 2, y + 1, 36 + k * 7, 4 + k * 2, 0, 0, Math.PI); ctx.stroke(); }
}
/** A punt moored by a pole. */
function punt(ctx: Ctx, x: number, y: number, a: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-26, -5); ctx.lineTo(26, -5); ctx.lineTo(30, 0); ctx.lineTo(26, 5); ctx.lineTo(-26, 5); ctx.lineTo(-30, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 0.5; ctx.beginPath(); for (let k = -20; k <= 20; k += 8) { ctx.moveTo(k, -5); ctx.lineTo(k, 5); } ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-34, -14); ctx.lineTo(18, 10); ctx.stroke();
  ctx.restore();
}
/** A heron standing in the shallows. */
function standingHeron(ctx: Ctx, x: number, y: number, dir: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(-1, -14); ctx.moveTo(2, 0); ctx.lineTo(1, -14); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, -14); ctx.quadraticCurveTo(-2, -30, 7, -24); ctx.quadraticCurveTo(9, -17, 2, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(6, -23); ctx.bezierCurveTo(13, -30, 2, -36, 8, -42); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(9, -43); ctx.lineTo(20, -41); ctx.lineTo(9, -40); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(0, 1, 12, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
/** The weir house: a tall timber mill over the weir, with the race foaming beneath. */
function weirHouse(ctx: Ctx, gate: Vec, R: () => number) {
  const x = gate.x + 20, base = gate.y + 50;
  // the weir: a stepped stone sill across the water, below the house
  ctx.fillStyle = PAPER; ctx.fillRect(x - 10, base, 150, 22);
  hatch(ctx, () => { ctx.beginPath(); ctx.rect(x - 10, base, 150, 22); }, [x - 10, base, 150, 22], 0.2, 2.6, 0.45, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(x - 10, base, 150, 22);
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = 0; k < 30; k++) { const wx = x - 6 + k * 5; ctx.moveTo(wx, base + 22); ctx.quadraticCurveTo(wx + 2, base + 34, wx - 1, base + 44 + (k % 3) * 4); } ctx.stroke();
  // the house itself, its door on the causeway
  turret(ctx, x + 66, base, 104, 120, 70, 'orb', false, R);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x + 2, base); ctx.lineTo(x + 2, base - 38); ctx.arc(x + 14, base - 38, 12, Math.PI, 0); ctx.lineTo(x + 26, base); ctx.closePath(); ctx.fill();
  // the great wheel on its west wall
  const wx = x + 120, wy = base - 6;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(wx, wy, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 26, wy + Math.sin(a) * 26); } ctx.stroke();
}
/** The sluice on the Eel Dyke: posts and a lifting board. */
function sluiceGate(ctx: Ctx, at: Vec, R: () => number) {
  const x = at.x - 10, y = at.y + 46;
  for (const px of [x - 22, x + 22]) { ctx.fillStyle = PAPER; ctx.fillRect(px - 4, y - 44, 8, 50); hatch(ctx, () => { ctx.beginPath(); ctx.rect(px - 4, y - 44, 8, 50); }, [px - 4, y - 44, 8, 50], 0.8, 1.8, 0.45, INK, R); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.strokeRect(px - 4, y - 44, 8, 50); }
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 28, y - 44); ctx.lineTo(x + 28, y - 44); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.fillRect(x - 18, y - 30, 36, 24); ctx.lineWidth = 1; ctx.strokeRect(x - 18, y - 30, 36, 24);
  ctx.lineWidth = 0.5; ctx.beginPath(); for (let k = -24; k < -6; k += 6) { ctx.moveTo(x - 18, y + k); ctx.lineTo(x + 18, y + k); } ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y - 52, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = 0; k < 8; k++) { ctx.moveTo(x - 16 + k * 4, y - 4); ctx.quadraticCurveTo(x - 15 + k * 4, y + 6, x - 18 + k * 4, y + 12); } ctx.stroke();
}

function buildFen(scale: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = MAP_W * scale; cv.height = MAP_H * scale;
  const ctx = cv.getContext('2d')!;
  ctx.scale(scale, scale);
  const R = rng(41);
  const plate: [number, number, number, number] = [40, 40, 350, 78];
  paperGround(ctx, R, 40);

  // the flood: a grey-sepia wash over nearly everything, with wind-ruffled lines on the water
  ctx.fillStyle = 'rgba(84,74,62,0.13)'; ctx.fillRect(20, 20, MAP_W - 40, MAP_H - 40);
  for (let i = 0; i < 18; i++) groundWash(ctx, R() * MAP_W, R() * MAP_H, 200 + R() * 260, 40 + R() * 50, 0.04 + R() * 0.05);
  ctx.strokeStyle = 'rgba(58,34,18,0.32)'; ctx.lineWidth = 0.6;
  for (let i = 0; i < 520; i++) {
    const x = 30 + R() * (MAP_W - 60), y = 30 + R() * (MAP_H - 60), L = 8 + R() * 22;
    if (nearRoad({ x, y }, 40)) continue;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + L / 2, y - 1.5, x + L, y); ctx.stroke();
  }
  // drowned hedgerows: rows of willow tops and posts poking out of the water
  for (const [x0, y0, x1, y1] of [[80, 560, 360, 520], [980, 120, 1380, 170], [1100, 900, 1500, 860], [560, 640, 700, 560]] as [number, number, number, number][]) {
    for (let t = 0; t <= 1; t += 0.06) {
      const p = { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
      if (nearRoad(p, 34) || nearLey(p, 10) || FOUNDATION_IDS.some((f) => Math.hypot(NODE[f].x - p.x, NODE[f].y - p.y) < 56)) continue;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (R() - 0.5) * 2, p.y - 6 - R() * 6); ctx.stroke();
      ctx.strokeStyle = INK2; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 6, 1.6, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // islands of firm ground under every foundation, with a fringe of reeds
  for (const f of FOUNDATION_IDS) {
    const n = NODE[f], isl = () => { ctx.beginPath(); ctx.ellipse(n.x, n.y + 4, 58, 26, 0, 0, Math.PI * 2); };
    ctx.fillStyle = PAPER; isl(); ctx.fill();
    ctx.save(); isl(); ctx.clip(); ctx.strokeStyle = 'rgba(58,34,18,0.35)'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 40; i++) { const gx = n.x - 56 + R() * 112, gy = n.y - 20 + R() * 46; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + (R() - 0.5) * 3, gy - 4); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; isl(); ctx.stroke();
    reeds(ctx, n.x - 50, n.y + 16, 6, R); reeds(ctx, n.x + 48, n.y + 12, 5, R);
  }
  // the causeways, raised on banks above the flood
  embankment(ctx, LANES.mill.pts, R);
  embankment(ctx, LANES.king.pts.slice(0, LANES.king.pts.length - 3), R);
  inkSurreal.road(ctx, LANES.mill.pts, 'mill');
  inkSurreal.road(ctx, LANES.king.pts, 'king');
  inkSurreal.ley(ctx, LEY_EDGES.map((e) => e.pts), Object.values(NODE).filter((n) => !n.foundation && n.id !== 'ink').map((n) => ({ x: n.x, y: n.y })));

  // scenery in the open water: reed beds, punts, herons, drowned roofs, eel men's huts
  const taken: Spot[] = [];
  for (const sp of scatter(R, 1, 60, plate, taken)) drownedTower(ctx, sp.x, sp.y, R);
  for (const sp of scatter(R, 1, 56, plate, taken)) drainageMill(ctx, sp.x, sp.y, R);
  for (const sp of scatter(R, 2, 52, plate, taken)) stiltHut(ctx, sp.x, sp.y, R);
  for (const sp of scatter(R, 12, 26, plate, taken)) pollardWillow(ctx, sp.x, sp.y, R);
  for (const sp of scatter(R, 4, 34, plate, taken)) fishWeir(ctx, sp.x - 18, sp.y, (R() - 0.5) * 0.6);
  for (const sp of scatter(R, 4, 26, plate, taken)) netPoles(ctx, sp.x, sp.y);
  for (const sp of scatter(R, 5, 34, plate, taken)) ducks(ctx, sp.x, sp.y, 3 + Math.floor(R() * 3), R() < 0.5 ? -1 : 1);
  for (const sp of scatter(R, 14, 18, plate, taken)) lilies(ctx, sp.x, sp.y, R);
  const roofs = scatter(R, 3, 46, plate, taken);
  for (const sp of roofs) drownedRoof(ctx, sp.x, sp.y, R);
  for (const sp of scatter(R, 4, 34, plate, taken)) punt(ctx, sp.x, sp.y, (R() - 0.5) * 0.8);
  for (const sp of scatter(R, 7, 18, plate, taken)) standingHeron(ctx, sp.x, sp.y, R() < 0.5 ? -1 : 1);
  for (const sp of scatter(R, 70, 14, plate, taken, 6000)) reeds(ctx, sp.x, sp.y, 6 + Math.floor(R() * 8), R);
  for (const sp of scatter(R, 6, 40, plate, taken)) scribble(ctx, sp.x - 36, sp.y - 14, 72, 3 + Math.floor(R() * 2), R);
  // mist lying in bands
  for (let i = 0; i < 7; i++) { const y = 120 + R() * 780; const g = ctx.createLinearGradient(0, y - 30, 0, y + 30); g.addColorStop(0, 'rgba(240,230,210,0)'); g.addColorStop(0.5, 'rgba(240,230,210,0.32)'); g.addColorStop(1, 'rgba(240,230,210,0)'); ctx.fillStyle = g; ctx.fillRect(0, y - 30, MAP_W, 60); }

  sluiceGate(ctx, BRIDGE, R);
  weirHouse(ctx, GATE, R);
  inkInkwell(ctx, INKWELL);
  inkSmudge(ctx, MAP_W - 70, MAP_H - 90, 30, 40, R);

  label(ctx, 'the Reed Causeway', 160, 222, 16);
  label(ctx, 'the Eel Dyke', 140, 832, 16);
  label(ctx, 'the Sluice', BRIDGE.x - 10, BRIDGE.y + 76, 14);
  label(ctx, 'the Weir House', GATE.x + 76, GATE.y - 196, 15);
  label(ctx, 'the Inkwell', INKWELL.x, INKWELL.y + 54, 14);

  finishSheet(ctx, R, 'The Flooded Fen', 'Defence of Goosebridge Castle · Level 4', 40);
  return cv;
}

// ── Level 5: the barrows ────────────────────────────────────────────────────

/** A grassy burial mound; long barrows are stretched, and some have a stone door. */
function barrowMound(ctx: Ctx, x: number, y: number, w: number, h: number, R: () => number, door = false) {
  groundWash(ctx, x + w * 0.2, y + 4, w * 1.1, h * 0.5, 0.35);
  const m = () => { ctx.beginPath(); ctx.moveTo(x - w, y); ctx.bezierCurveTo(x - w * 0.8, y - h * 1.1, x + w * 0.8, y - h * 1.1, x + w, y); ctx.closePath(); };
  ctx.fillStyle = PAPER; m(); ctx.fill();
  ctx.save(); m(); ctx.clip();
  ctx.strokeStyle = 'rgba(58,34,18,0.5)'; ctx.lineWidth = 0.55; ctx.beginPath();
  for (let k = 0; k < 6; k++) { const yy = y - h * (0.15 + k * 0.14); ctx.moveTo(x - w, yy + 4); ctx.quadraticCurveTo(x, yy - 6, x + w, yy + 4); }
  ctx.stroke();
  ctx.fillStyle = sepia(0.25); ctx.beginPath(); ctx.ellipse(x + w * 0.55, y, w * 0.6, h * 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; m(); ctx.stroke();
  if (door) {
    const dw = Math.min(16, w * 0.3);
    ctx.fillStyle = PAPER; ctx.fillRect(x - dw - 6, y - h * 0.62, (dw + 6) * 2, h * 0.62);
    ctx.lineWidth = 1.2; ctx.strokeRect(x - dw - 6, y - h * 0.62, (dw + 6) * 2, h * 0.62);
    ctx.fillStyle = 'rgba(29,25,21,0.92)'; ctx.beginPath(); ctx.moveTo(x - dw, y); ctx.lineTo(x - dw, y - h * 0.5); ctx.lineTo(x + dw, y - h * 0.5); ctx.lineTo(x + dw, y); ctx.closePath(); ctx.fill();
  }
  // grass fringe
  ctx.strokeStyle = 'rgba(58,34,18,0.5)'; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let i = 0; i < w / 3; i++) { const gx = x - w + R() * w * 2; ctx.moveTo(gx, y); ctx.lineTo(gx + (R() - 0.5) * 3, y - 4 - R() * 3); }
  ctx.stroke();
}
/** A lone standing stone of the downs. */
function stone(ctx: Ctx, x: number, y: number, h: number, R: () => number, lean = 0) {
  groundWash(ctx, x + 4, y + 1, h * 0.5, h * 0.12, 0.4);
  const w = h * 0.22;
  const st = () => { ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 1.1 + lean, y - h * 0.6, x - w * 0.5 + lean * 1.4, y - h); ctx.quadraticCurveTo(x + lean * 1.4, y - h * 1.08, x + w * 0.6 + lean * 1.4, y - h * 0.95); ctx.quadraticCurveTo(x + w * 1.1 + lean, y - h * 0.5, x + w, y); ctx.closePath(); };
  ctx.fillStyle = '#d8c7a8'; st(); ctx.fill(); hatch(ctx, st, [x - w * 1.2 + Math.min(0, lean * 1.4), y - h * 1.1, w * 2.4 + Math.abs(lean) * 1.4, h * 1.1], 0.9, 2, 0.45, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; st(); ctx.stroke();
}
/** A dark yew. */
function yew(ctx: Ctx, x: number, y: number, r: number, R: () => number) {
  groundWash(ctx, x + r * 0.4, y + 2, r * 1.3, r * 0.3, 0.4);
  limbs(ctx, [{ x1: x, y1: y, x2: x, y2: y - r * 0.8, w: r * 0.28 }], R, false);
  const crown = () => { ctx.beginPath(); ctx.ellipse(x, y - r * 1.3, r * 0.95, r * 0.9, 0, 0, Math.PI * 2); };
  ctx.fillStyle = PAPER; crown(); ctx.fill(); hatch(ctx, crown, [x - r, y - r * 2.2, r * 2, r * 1.8], 0.7, 1.5, 0.5, INK, R);
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const cx = x + Math.cos(a) * r * 0.88, cy = y - r * 1.3 + Math.sin(a) * r * 0.84; ctx.moveTo(cx + 4, cy); ctx.arc(cx, cy, 4, 0, Math.PI * 2); }
  ctx.stroke();
}
/** A white horse cut in the chalk of a hillside. */
function chalkHorse(ctx: Ctx, x: number, y: number) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(250,244,230,0.95)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-50, 0); ctx.bezierCurveTo(-30, -14, 10, -16, 30, -10); ctx.quadraticCurveTo(44, -20, 52, -30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-44, 18); ctx.moveTo(-20, 0); ctx.lineTo(-16, 20); ctx.moveTo(14, -4); ctx.lineTo(8, 18); ctx.moveTo(28, -6); ctx.lineTo(34, 16); ctx.moveTo(-50, 0); ctx.lineTo(-64, -8); ctx.stroke();
  ctx.beginPath(); ctx.arc(52, -30, 3, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = INK2; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-50, 3); ctx.bezierCurveTo(-30, -10, 10, -12, 30, -6); ctx.stroke();
  ctx.restore();
}
/** The Ward Ring: a henge of great stones round the place the wizard holds. */
function wardRing(ctx: Ctx, gate: Vec, R: () => number) {
  const cx = gate.x + 80, cy = gate.y + 6;
  // bank and ditch
  ctx.strokeStyle = 'rgba(58,34,18,0.35)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(cx, cy, 104, 66, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(cx, cy, 110, 71, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, cy, 98, 61, 0, 0, Math.PI * 2); ctx.stroke();
  // stones: back half first, front half after
  const at = (a: number) => ({ x: cx + Math.cos(a) * 86, y: cy + Math.sin(a) * 52 });
  const angles = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2).filter((a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) - Math.PI) > 0.3 && Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) + Math.PI) > 0.3);
  for (const a of angles.filter((a) => Math.sin(a) < 0)) { const p = at(a); stone(ctx, p.x, p.y, 34, R); }
  // the altar stone at the centre
  ctx.fillStyle = '#d8c7a8'; ctx.fillRect(cx - 18, cy - 6, 36, 10); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(cx - 18, cy - 6, 36, 10);
  for (const a of angles.filter((a) => Math.sin(a) >= 0)) { const p = at(a); stone(ctx, p.x, p.y, 34, R); }
}

function buildBarrows(scale: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = MAP_W * scale; cv.height = MAP_H * scale;
  const ctx = cv.getContext('2d')!;
  ctx.scale(scale, scale);
  const R = rng(53);
  const plate: [number, number, number, number] = [1210, 900, 350, 78];
  paperGround(ctx, R, 60);

  // the downs: long contour lines of chalk hills
  ctx.strokeStyle = 'rgba(58,34,18,0.16)'; ctx.lineWidth = 0.7;
  for (let k = 0; k < 26; k++) {
    const y0 = 40 + k * 38 + R() * 10, amp = 14 + R() * 20, f = 0.003 + R() * 0.004, ph = R() * 6;
    ctx.beginPath(); for (let x = 20; x <= MAP_W - 20; x += 16) { const y = y0 + Math.sin(x * f + ph) * amp; x === 20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  }
  // tufts of downland grass
  ctx.strokeStyle = 'rgba(58,34,18,0.42)'; ctx.lineWidth = 0.6;
  for (let i = 0; i < 220; i++) {
    const x = R() * MAP_W, y = 40 + R() * (MAP_H - 60), n = 3 + Math.floor(R() * 3);
    ctx.beginPath(); for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.35; ctx.moveTo(x + k, y); ctx.lineTo(x + k + Math.cos(a) * 7, y + Math.sin(a) * 7); } ctx.stroke();
  }
  // the hollow way is sunk between banks; the corpse road runs over the top
  embankment(ctx, LANES.king.pts.slice(0, LANES.king.pts.length - 3), R, 30);
  inkSurreal.road(ctx, LANES.mill.pts, 'mill');
  inkSurreal.road(ctx, LANES.king.pts, 'king');
  inkSurreal.ley(ctx, LEY_EDGES.map((e) => e.pts), Object.values(NODE).filter((n) => !n.foundation && n.id !== 'ink').map((n) => ({ x: n.x, y: n.y })));

  // the kennel barrow: the hollow way comes out of its door
  barrowMound(ctx, BRIDGE.x, BRIDGE.y + 70, 120, 70, R, true);

  const taken: Spot[] = [];
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  const horse = scatter(R, 1, 70, plate, taken)[0];
  if (horse) chalkHorse(ctx, horse.x, horse.y);
  const moon = scatter(R, 1, 62, plate, taken)[0];
  for (const sp of scatter(R, 4, 70, plate, taken)) { const w = 60 + R() * 50; items.push({ y: sp.y, draw: () => barrowMound(ctx, sp.x, sp.y, w, 26 + R() * 14, R, R() < 0.5) }); }
  for (const sp of scatter(R, 7, 34, plate, taken)) items.push({ y: sp.y, draw: () => barrowMound(ctx, sp.x, sp.y, 28 + R() * 10, 22 + R() * 8, R) });
  for (const sp of scatter(R, 12, 14, plate, taken)) { const h = 30 + R() * 26, l = (R() - 0.5) * 8; items.push({ y: sp.y, draw: () => stone(ctx, sp.x, sp.y, h, R, l) }); }
  for (const sp of scatter(R, 9, 26, plate, taken)) items.push({ y: sp.y, draw: () => yew(ctx, sp.x, sp.y, 16 + R() * 8, R) });
  for (const sp of scatter(R, 1, 50, plate, taken)) items.push({ y: sp.y, draw: () => shepherdsHut(ctx, sp.x, sp.y, R) });
  for (const sp of scatter(R, 2, 44, plate, taken)) items.push({ y: sp.y, draw: () => dolmen(ctx, sp.x, sp.y, R) });
  for (const sp of scatter(R, 2, 46, plate, taken)) { const a = (R() - 0.5) * 0.6; items.push({ y: sp.y, draw: () => stoneRow(ctx, sp.x - 40, sp.y, a, R) }); }
  for (const sp of scatter(R, 2, 30, plate, taken)) items.push({ y: sp.y, draw: () => gibbet(ctx, sp.x, sp.y, R) });
  for (const sp of scatter(R, 3, 18, plate, taken)) items.push({ y: sp.y, draw: () => owlStone(ctx, sp.x, sp.y, R) });
  for (const sp of scatter(R, 16, 18, plate, taken)) { const r = 10 + R() * 8; items.push({ y: sp.y, draw: () => gorse(ctx, sp.x, sp.y, r, R) }); }
  for (const sp of scatter(R, 6, 26, plate, taken)) { const n = 3 + Math.floor(R() * 3); items.push({ y: sp.y, draw: () => { for (let i = 0; i < n; i++) sheep(ctx, sp.x + (i % 3) * 16 - 16, sp.y + Math.floor(i / 3) * 12 - 4 + (i % 2) * 4, i % 2 ? 1 : -1); } }); }
  for (const sp of scatter(R, 5, 18, plate, taken)) items.push({ y: sp.y, draw: () => spiltUrn(ctx, sp.x, sp.y, R) });
  for (const sp of scatter(R, 5, 40, plate, taken)) scribble(ctx, sp.x - 36, sp.y - 14, 72, 3 + Math.floor(R() * 2), R);
  items.push({ y: GATE.y + 60, draw: () => wardRing(ctx, GATE, R) });
  items.push({ y: INKWELL.y + 22, draw: () => inkInkwell(ctx, INKWELL) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  // crows over the downs, and the moon coming up
  for (const sp of scatter(R, 6, 14, plate, taken)) crow(ctx, sp.x, sp.y, R() < 0.5 ? -1 : 1, true);
  if (moon) moonAndStars(ctx, moon.x, moon.y, R);
  // dusk: the sky darkens from the east, and the sheet's edges sink into shadow
  const dusk = ctx.createLinearGradient(0, 0, 0, MAP_H);
  dusk.addColorStop(0, 'rgba(60,40,30,0.16)'); dusk.addColorStop(0.4, 'rgba(60,40,30,0.04)'); dusk.addColorStop(1, 'rgba(60,40,30,0.1)');
  ctx.fillStyle = dusk; ctx.fillRect(0, 0, MAP_W, MAP_H);

  label(ctx, 'the Corpse Road', 150, 252, 16);
  label(ctx, 'the Hollow Way', 600, 940, 16);
  label(ctx, 'the Kennel Barrow', BRIDGE.x + 150, BRIDGE.y + 64, 13);
  label(ctx, 'the Ward Ring', GATE.x + 80, GATE.y - 74, 15);
  label(ctx, 'the Inkwell', INKWELL.x, INKWELL.y + 54, 14);

  finishSheet(ctx, R, 'The Barrows', 'Defence of Goosebridge Castle · Level 5', plate[1], plate[0]);
  return cv;
}
