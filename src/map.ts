// The Siege of Goosebridge: fixed geometry for roads, leylines and foundations.
// Logical map size is 1600 × 1000 (an open two-page spread, gutter at x = 800).
import type { LaneId } from './balance';

export interface Vec { x: number; y: number }
export const MAP_W = 1600;
export const MAP_H = 1000;
export const GUTTER_X = 800;

export const JUNCTION: Vec = { x: 1290, y: 520 };
export const GATE: Vec = { x: 1452, y: 520 };
export const BRIDGE: Vec = { x: 870, y: 765 };
export const MILL: Vec = { x: 520, y: 112 };
export const POND: Vec = { x: 640, y: 505 };
/** The inkwell stands in the castle garden, just south of the walls. */
export const INKWELL: Vec = { x: 1488, y: 806 };
export const CASTLE: Vec = { x: 1520, y: 520 };

const MILL_ROAD: Vec[] = [
  { x: -40, y: 150 }, { x: 250, y: 150 }, { x: 420, y: 255 }, { x: 640, y: 220 },
  { x: 820, y: 300 }, { x: 900, y: 420 }, { x: 1080, y: 420 }, { x: 1200, y: 470 }, JUNCTION, GATE,
];
const KINGS_ROAD: Vec[] = [
  { x: 560, y: 1045 }, { x: 640, y: 900 }, { x: 760, y: 810 }, BRIDGE,
  { x: 1060, y: 700 }, { x: 1180, y: 610 }, JUNCTION, GATE,
];
export const RIVER: Vec[] = [
  { x: 676, y: 548 }, { x: 790, y: 640 }, BRIDGE, { x: 960, y: 900 }, { x: 1030, y: 1020 },
];

export interface Lane {
  id: LaneId;
  name: string;
  pts: Vec[];
  cum: number[];
  length: number;
  /** Distance along this lane at which it reaches the shared junction. */
  junctionS: number;
}

function buildLane(id: LaneId, name: string, pts: Vec[]): Lane {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const ji = pts.indexOf(JUNCTION);
  return { id, name, pts, cum, length: cum[cum.length - 1], junctionS: cum[ji] };
}

export const LANES: Record<LaneId, Lane> = {
  mill: buildLane('mill', 'Mill Road', MILL_ROAD),
  king: buildLane('king', 'King’s Road', KINGS_ROAD),
};
export const LANE_IDS: LaneId[] = ['mill', 'king'];

export function dist(a: Vec, b: Vec): number { return Math.hypot(a.x - b.x, a.y - b.y); }

export function pointAt(lane: Lane, s: number): Vec & { angle: number } {
  const c = Math.max(0, Math.min(lane.length, s));
  let i = 1;
  while (i < lane.cum.length - 1 && lane.cum[i] < c) i++;
  const a = lane.pts[i - 1], b = lane.pts[i];
  const seg = lane.cum[i] - lane.cum[i - 1] || 1;
  const t = (c - lane.cum[i - 1]) / seg;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

export function projectOnSegment(p: Vec, a: Vec, b: Vec): { t: number; point: Vec; d: number } {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const point = { x: a.x + dx * t, y: a.y + dy * t };
  return { t, point, d: dist(p, point) };
}

export function nearestOnLane(lane: Lane, p: Vec): { s: number; d: number; point: Vec } {
  let best = { s: 0, d: Infinity, point: lane.pts[0] };
  for (let i = 1; i < lane.pts.length; i++) {
    const pr = projectOnSegment(p, lane.pts[i - 1], lane.pts[i]);
    if (pr.d < best.d) best = { s: lane.cum[i - 1] + pr.t * (lane.cum[i] - lane.cum[i - 1]), d: pr.d, point: pr.point };
  }
  return best;
}

/** Sample points every `step` units along a lane between s0 and s1. */
export function sampleLane(lane: Lane, s0: number, s1: number, step = 12): Vec[] {
  const out: Vec[] = [];
  for (let s = Math.max(0, s0); s <= Math.min(lane.length, s1); s += step) out.push(pointAt(lane, s));
  return out;
}

// ── Leylines ────────────────────────────────────────────────────────────────
// A fixed tree rooted at the inkwell. Leaves are tower foundations.

export interface LeyNode {
  id: string;
  x: number;
  y: number;
  parent?: string;
  /** Sideways bow of the edge from parent → this node (purely visual, also used for snapping). */
  bow?: number;
  foundation?: { name: string };
}

// The leylines fan out from the inkwell beside the castle across the whole spread.
export const LEY_NODES: LeyNode[] = [
  { id: 'ink', x: INKWELL.x - 34, y: INKWELL.y - 8 },
  { id: 't0', x: 1395, y: 792, parent: 'ink', bow: 6 },
  // Wallward: north along the walls, then west along the top of the map
  { id: 'w1', x: 1405, y: 612, parent: 't0', bow: -10 },
  { id: 'f_gate', x: 1330, y: 662, parent: 'w1', bow: 6, foundation: { name: 'Gate Garden' } },
  { id: 'w2', x: 1398, y: 440, parent: 'w1', bow: 10 },
  { id: 'f_watch', x: 1300, y: 418, parent: 'w2', bow: -6, foundation: { name: 'Watch Hill' } },
  { id: 'w3', x: 1190, y: 318, parent: 'w2', bow: -14 },
  { id: 'f_upper', x: 1062, y: 318, parent: 'w3', bow: 8, foundation: { name: 'Upper Field' } },
  { id: 'w4', x: 940, y: 226, parent: 'w3', bow: 12 },
  { id: 'f_millhill', x: 712, y: 132, parent: 'w4', bow: -10, foundation: { name: 'Windy Hill' } },
  // Crossroads: the hub south-west of the castle
  { id: 'c1', x: 1250, y: 735, parent: 't0', bow: -8 },
  { id: 'f_junction', x: 1172, y: 532, parent: 'c1', bow: 14, foundation: { name: 'The Crossroads' } },
  { id: 'f_east', x: 1112, y: 812, parent: 'c1', bow: -8, foundation: { name: 'East Bank' } },
  // Fenward: low along the bottom page
  { id: 'c3', x: 985, y: 845, parent: 'c1', bow: 10 },
  { id: 'c5', x: 812, y: 925, parent: 'c3', bow: -10 },
  { id: 'f_fen', x: 705, y: 962, parent: 'c5', bow: 6, foundation: { name: 'Fen Gate' } },
  { id: 'c6', x: 640, y: 790, parent: 'c5', bow: 14 },
  { id: 'f_ford', x: 530, y: 852, parent: 'c6', bow: -8, foundation: { name: 'Ford Meadow' } },
  // Heartwood: through the middle to the mill and the far west
  { id: 'p1', x: 1060, y: 562, parent: 'c1', bow: 10 },
  { id: 'f_bridge', x: 985, y: 625, parent: 'p1', bow: 6, foundation: { name: 'Goosebridge' } },
  { id: 'p2', x: 880, y: 560, parent: 'p1', bow: -8 },
  { id: 'f_bend', x: 838, y: 478, parent: 'p2', bow: 6, foundation: { name: 'Spring Bend' } },
  { id: 'p3', x: 735, y: 700, parent: 'p2', bow: 12 },
  { id: 'p4', x: 470, y: 600, parent: 'p3', bow: -14 },
  { id: 'f_mill', x: 560, y: 340, parent: 'p4', bow: 14, foundation: { name: 'Mill Yard' } },
  { id: 'p5', x: 320, y: 470, parent: 'p4', bow: 10 },
  { id: 'f_millgate', x: 300, y: 300, parent: 'p5', bow: -10, foundation: { name: 'Millgate Knoll' } },
  { id: 'f_hollow', x: 150, y: 262, parent: 'p5', bow: 12, foundation: { name: 'Hollow Oak' } },
];

export const NODE: Record<string, LeyNode> = Object.fromEntries(LEY_NODES.map((n) => [n.id, n]));
export const FOUNDATION_IDS = LEY_NODES.filter((n) => n.foundation).map((n) => n.id);

/** Polyline samples for the edge parent → node, following its bow. */
function sampleEdge(n: LeyNode): Vec[] {
  const p = NODE[n.parent!];
  const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2;
  const len = dist(p, n) || 1;
  const nx = -(n.y - p.y) / len, ny = (n.x - p.x) / len;
  const cx = mx + nx * (n.bow ?? 0), cy = my + ny * (n.bow ?? 0);
  const steps = Math.max(6, Math.ceil(len / 14));
  const out: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push({ x: u * u * p.x + 2 * u * t * cx + t * t * n.x, y: u * u * p.y + 2 * u * t * cy + t * t * n.y });
  }
  return out;
}

export interface LeyEdge { child: string; parent: string; pts: Vec[]; cum: number[]; length: number }
export const LEY_EDGES: LeyEdge[] = LEY_NODES.filter((n) => n.parent).map((n) => {
  const pts = sampleEdge(n);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  return { child: n.id, parent: n.parent!, pts, cum, length: cum[cum.length - 1] };
});
export const EDGE_TO: Record<string, LeyEdge> = Object.fromEntries(LEY_EDGES.map((e) => [e.child, e]));

/** Node ids from the inkwell down to `nodeId` (inclusive). */
export function routeNodes(nodeId: string): string[] {
  const out: string[] = [];
  let n: LeyNode | undefined = NODE[nodeId];
  while (n) { out.unshift(n.id); n = n.parent ? NODE[n.parent] : undefined; }
  return out;
}

/** Full polyline from the inkwell to a foundation. */
export function routePolyline(nodeId: string): Vec[] {
  const ids = routeNodes(nodeId);
  const out: Vec[] = [{ x: NODE.ink.x, y: NODE.ink.y }];
  for (let i = 1; i < ids.length; i++) out.push(...EDGE_TO[ids[i]].pts.slice(1));
  return out;
}

/** Polyline from the inkwell to a point partway (t ∈ [0,1] by sample index) along the edge into `child`. */
export function routeToEdgePoint(child: string, sampleIdx: number, point: Vec): Vec[] {
  const parentPath = routePolyline(EDGE_TO[child].parent);
  return [...parentPath, ...EDGE_TO[child].pts.slice(1, sampleIdx + 1), point];
}

export interface Snap { child: string; sampleIdx: number; point: Vec; d: number }

/** Nearest point on the whole leyline network. */
export function snapToNetwork(p: Vec): Snap | null {
  let best: Snap | null = null;
  for (const e of LEY_EDGES) {
    for (let i = 1; i < e.pts.length; i++) {
      const pr = projectOnSegment(p, e.pts[i - 1], e.pts[i]);
      if (!best || pr.d < best.d) best = { child: e.child, sampleIdx: i - 1, point: pr.point, d: pr.d };
    }
  }
  return best;
}

export function polylineLength(pts: Vec[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L;
}

export function pointAlong(pts: Vec[], s: number): Vec {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (acc + d >= s) {
      const t = d ? (s - acc) / d : 0;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
    acc += d;
  }
  return pts[pts.length - 1];
}
