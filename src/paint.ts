// The static sheet: a pen-and-ink drawing on cream paper with a grey-sepia wash.
// Roads, the river and its spring, gnarled trees and fynbos, the mill, the windmill, the castle
// and the inkwell are drawn once; everything that moves is drawn live in render.ts.
import {
  MAP_W, MAP_H, GUTTER_X, LANES, LANE_IDS, RIVER, POND, MILL, BRIDGE, INKWELL, CASTLE,
  LEY_EDGES, NODE, FOUNDATION_IDS, pointAt, type Vec,
} from './map';
import {
  inkSurreal, scribble, inkSmudge, foldCrease, inkCastle, inkInkwell, windmillBody, turret, paperVignette, groundWash, goose,
  INK, INK2, PAPER,
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
  return Math.hypot(RIVER[0].x - p.x, RIVER[0].y - p.y) < margin + 30;
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

  // the sheet was folded once across and once down
  foldCrease(ctx, true, MAP_H * 0.54, R);
  foldCrease(ctx, false, GUTTER_X, R);
  paperVignette(ctx);

  // Title plate, ruled in ink
  ctx.fillStyle = 'rgba(228,211,182,0.92)'; roundRect(ctx, 40, 880, 350, 78, 4); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.lineWidth = 0.6; roundRect(ctx, 45, 885, 340, 68, 3); ctx.stroke();
  ctx.font = `italic 600 23px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillStyle = INK;
  ctx.fillText('Defence of Goosebridge Castle', 56, 918);
  ctx.font = `italic 14px ${SERIF}`; ctx.fillStyle = 'rgba(58,34,18,0.7)';
  ctx.fillText('drawn in pen and ink', 58, 942);
  // sheet border
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(14, 14, MAP_W - 28, MAP_H - 28);
  ctx.lineWidth = 0.6; ctx.strokeRect(19, 19, MAP_W - 38, MAP_H - 38);
  return cv;
}
