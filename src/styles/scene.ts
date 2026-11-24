// One frozen moment of the siege, described once and drawn by any art style.
import {
  MAP_W, MAP_H, LANES, LANE_IDS, RIVER, POND, BRIDGE, INKWELL, CASTLE, MILL, LEY_EDGES, NODE, FOUNDATION_IDS,
  routePolyline, pointAt, type Vec,
} from '../map';
import type { FieldEnemyType as EnemyType, FieldTowerType as TowerType, LaneId } from '../balance';

export type { Vec };
export { MAP_W, MAP_H };

export interface Style {
  id: string;
  name: string;
  blurb: string;
  unity: string;
  /** Shown full width at the top of the gallery with this label. */
  featured?: string;
  /** Optional: draw small then upscale with a fixed palette (pixel art). */
  pixel?: { scale: number; palette: string[] };
  ground(ctx: CanvasRenderingContext2D, R: () => number): void;
  water(ctx: CanvasRenderingContext2D, river: Vec[], pond: Vec): void;
  road(ctx: CanvasRenderingContext2D, pts: Vec[], kind: 'mill' | 'king'): void;
  bridge(ctx: CanvasRenderingContext2D, at: Vec, angle: number): void;
  tree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, k: number): void;
  ley(ctx: CanvasRenderingContext2D, edges: Vec[][], knots: Vec[]): void;
  bound(ctx: CanvasRenderingContext2D, path: Vec[]): void;
  trace(ctx: CanvasRenderingContext2D, path: Vec[]): void;
  fire(ctx: CanvasRenderingContext2D, pts: Vec[]): void;
  foundation(ctx: CanvasRenderingContext2D, x: number, y: number): void;
  tower(ctx: CanvasRenderingContext2D, type: TowerType, x: number, y: number, mark: 'traced' | 'bound' | null): void;
  enemy(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number): void;
  castle(ctx: CanvasRenderingContext2D, at: Vec): void;
  mill(ctx: CanvasRenderingContext2D, at: Vec): void;
  inkwell(ctx: CanvasRenderingContext2D, at: Vec): void;
  pulse(ctx: CanvasRenderingContext2D, at: Vec, trail: Vec): void;
  post?(ctx: CanvasRenderingContext2D): void;
}

export function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

export function line(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

export function smooth(ctx: CanvasRenderingContext2D, pts: Vec[], r = 60) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) ctx.arcTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, r);
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
}

// ── The frozen moment ───────────────────────────────────────────────────────

const towers: { f: string; type: TowerType; mark: 'traced' | 'bound' | null }[] = [
  { f: 'f_mill', type: 'bramble', mark: 'traced' },
  { f: 'f_junction', type: 'ember', mark: 'bound' },
  { f: 'f_bend', type: 'bell', mark: null },
  { f: 'f_upper', type: 'verdigris', mark: 'traced' },
  { f: 'f_watch', type: 'bramble', mark: null },
];

const enemies: { type: EnemyType; lane: LaneId; s: number; side: number }[] = [];
// Levy in files of three on the Mill Road
for (let r = 0; r < 4; r++) for (let j = -1; j <= 1; j++) enemies.push({ type: 'levy', lane: 'mill', s: 470 - r * 34, side: j * 12 });
// The bearer and its giant further back
enemies.push({ type: 'bearer', lane: 'mill', s: 300, side: 0 });
enemies.push({ type: 'cairn', lane: 'mill', s: 215, side: 0 });
// More levy near the bend
for (let r = 0; r < 2; r++) for (let j = -1; j <= 1; j++) enemies.push({ type: 'levy', lane: 'mill', s: 860 - r * 34, side: j * 12 });
// A hound pack crossing the bridge
for (let i = 0; i < 6; i++) enemies.push({ type: 'hound', lane: 'king', s: 470 - i * 22, side: ((i % 3) - 1) * 8 });
// Levy on the King's Road near the crossroads (in the fire)
for (let j = -1; j <= 1; j += 2) enemies.push({ type: 'levy', lane: 'king', s: 780, side: j * 8 });

function enemyPos(lane: LaneId, s: number, side: number) {
  const p = pointAt(LANES[lane], s);
  return { x: p.x - Math.sin(p.angle) * side, y: p.y + Math.cos(p.angle) * side, dir: Math.cos(p.angle) >= -0.1 ? 1 : -1 };
}

function firePoints(): Vec[] {
  const t = NODE.f_junction;
  const out: Vec[] = [];
  for (const id of LANE_IDS) {
    const L = LANES[id];
    for (let x = 0; x <= L.length; x += 10) {
      const q = pointAt(L, x);
      if (Math.hypot(q.x - t.x, q.y - t.y) <= 135 && (id === 'mill' || x < L.junctionS)) out.push(q);
    }
  }
  return out;
}

function treeSpots(): { x: number; y: number; r: number; k: number }[] {
  const R = rng(5);
  const road: Vec[] = [];
  for (const id of LANE_IDS) for (let s = 0; s < LANES[id].length; s += 14) road.push(pointAt(LANES[id], s));
  const ley: Vec[] = LEY_EDGES.flatMap((e) => e.pts);
  const out: { x: number; y: number; r: number; k: number }[] = [];
  for (let i = 0; i < 1400 && out.length < 150; i++) {
    const p = { x: 25 + R() * (MAP_W - 50), y: 25 + R() * (MAP_H - 50) };
    if (p.x > 1400 && p.y > 330 && p.y < 880) continue;
    if (Math.hypot(p.x - MILL.x, p.y - MILL.y) < 90) continue;
    if (road.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 50)) continue;
    if (ley.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 28)) continue;
    if (FOUNDATION_IDS.some((f) => Math.hypot(NODE[f].x - p.x, NODE[f].y - p.y) < 62)) continue;
    if (Math.hypot(POND.x - p.x, (POND.y - p.y) * 1.4) < 110) continue;
    let nearRiver = false;
    for (let k = 1; k < RIVER.length && !nearRiver; k++) for (let t = 0; t <= 1; t += 0.05) {
      const q = { x: RIVER[k - 1].x + (RIVER[k].x - RIVER[k - 1].x) * t, y: RIVER[k - 1].y + (RIVER[k].y - RIVER[k - 1].y) * t };
      if (Math.hypot(q.x - p.x, q.y - p.y) < 36) { nearRiver = true; break; }
    }
    if (nearRiver) continue;
    if (out.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 26)) continue;
    out.push({ ...p, r: 11 + R() * 9, k: R() });
  }
  return out.sort((a, b) => a.y - b.y);
}

const TREES = treeSpots();
const FIRE = firePoints();

/** Draw the whole moment in one style onto a 1600×1000 context. */
export function drawScene(ctx: CanvasRenderingContext2D, st: Style) {
  const R = rng(9);
  st.ground(ctx, R);
  st.water(ctx, RIVER, POND);
  st.road(ctx, LANES.mill.pts, 'mill');
  st.road(ctx, LANES.king.pts, 'king');
  const bridgeAngle = pointAt(LANES.king, LANES.king.cum[3]).angle;
  st.bridge(ctx, BRIDGE, bridgeAngle);
  st.ley(ctx, LEY_EDGES.map((e) => e.pts), Object.values(NODE).filter((n) => !n.foundation && n.id !== 'ink').map((n) => ({ x: n.x, y: n.y })));
  for (const t of towers) if (t.mark === 'bound') st.bound(ctx, routePolyline(t.f));
  for (const t of towers) if (t.mark === 'traced') st.trace(ctx, routePolyline(t.f));
  st.fire(ctx, FIRE);
  for (const f of FOUNDATION_IDS) if (!towers.some((t) => t.f === f)) st.foundation(ctx, NODE[f].x, NODE[f].y);

  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  for (const t of TREES) items.push({ y: t.y, draw: () => st.tree(ctx, t.x, t.y, t.r, t.k) });
  for (const t of towers) { const n = NODE[t.f]; items.push({ y: n.y, draw: () => { st.foundation(ctx, n.x, n.y); st.tower(ctx, t.type, n.x, n.y, t.mark); } }); }
  for (const e of enemies) { const p = enemyPos(e.lane, e.s, e.side); items.push({ y: p.y, draw: () => st.enemy(ctx, e.type, p.x, p.y, p.dir) }); }
  items.push({ y: CASTLE.y + 120, draw: () => st.castle(ctx, CASTLE) });
  items.push({ y: MILL.y + 20, draw: () => st.mill(ctx, MILL) });
  items.push({ y: INKWELL.y + 20, draw: () => st.inkwell(ctx, INKWELL) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  // a pulse on its way to the Bramble Tower
  const path = routePolyline('f_mill');
  let acc = 0, at = path[0], trail = path[0];
  const total = path.reduce((s, p, i) => (i ? s + Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y) : 0), 0);
  for (let i = 1; i < path.length; i++) {
    acc += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    if (acc < total * 0.62) { trail = at; at = path[i]; }
  }
  const back = path[Math.max(0, path.indexOf(at) - 4)];
  st.pulse(ctx, at, back ?? trail);
  st.post?.(ctx);
}

/** Render a style to a canvas, handling pixel-art downscale and palette quantising. */
export function renderStyle(canvas: HTMLCanvasElement, st: Style) {
  canvas.width = MAP_W; canvas.height = MAP_H;
  const ctx = canvas.getContext('2d')!;
  if (!st.pixel) { drawScene(ctx, st); return; }
  const k = st.pixel.scale;
  const small = document.createElement('canvas');
  small.width = Math.round(MAP_W * k); small.height = Math.round(MAP_H * k);
  const sctx = small.getContext('2d')!;
  sctx.scale(k, k);
  drawScene(sctx, st);
  // snap every pixel to the palette
  const img = sctx.getImageData(0, 0, small.width, small.height);
  const pal = st.pixel.palette.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let best = pal[0], bd = Infinity;
    for (const c of pal) {
      const dr = d[i] - c[0], dg = d[i + 1] - c[1], db = d[i + 2] - c[2];
      const dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (dd < bd) { bd = dd; best = c; }
    }
    d[i] = best[0]; d[i + 1] = best[1]; d[i + 2] = best[2]; d[i + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, MAP_W, MAP_H);
}
