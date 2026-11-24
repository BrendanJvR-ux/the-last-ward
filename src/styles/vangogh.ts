// 9. After Van Gogh: thick, directional impasto strokes that follow a swirling wind,
// chrome-yellow wheat, viridian and cobalt, flame-like cypresses, Prussian-blue contour lines.
import type { EnemyType, FieldTowerType as TowerType } from '../balance';
import { MAP_W, MAP_H, line, smooth, rng, type Style, type Vec } from './scene';
import { towerPath, enemyPath } from './shapes';
import { LANES, LANE_IDS, RIVER, POND, pointAt } from '../map';

const V = {
  chrome: '#f2c230', chromeLight: '#fbe27a', ochre: '#d9973a', orange: '#e8772a', vermilion: '#d2452a',
  viridian: '#3f8a5a', emerald: '#5cae5a', sap: '#8fbf4a', olive: '#6f8a3a',
  cobalt: '#2f5fb8', ultramarine: '#23338f', prussian: '#14264f', turquoise: '#57b0c8', sky: '#8fc6e0',
  lilac: '#9a8ac8', white: '#f6f0dc', black: '#1a1c2a', rust: '#a8532a',
};

const R0 = rng(77);
const pick = <T,>(a: T[], R: () => number) => a[Math.floor(R() * a.length)];

/** One loaded brushstroke: a thick tapered curve with a lighter ridge of impasto. */
function stroke(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, w: number, col: string, ridge = true) {
  const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
  const bend = (R0() - 0.5) * len * 0.35;
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.quadraticCurveTo(x - dy * bend / len, y + dx * bend / len, x + dx, y + dy); ctx.stroke();
  if (ridge) {
    ctx.strokeStyle = 'rgba(255,250,230,0.22)'; ctx.lineWidth = Math.max(0.8, w * 0.28);
    ctx.beginPath(); ctx.moveTo(x - dx * 0.7 - 0.8, y - dy * 0.7 - 0.8); ctx.lineTo(x + dx * 0.6 - 0.8, y + dy * 0.6 - 0.8); ctx.stroke();
  }
}

/** The wind: a gentle drift with a few great swirls. */
const SWIRLS = [
  { x: 330, y: 420, s: 1.6, r: 240 }, { x: 1030, y: 230, s: -1.4, r: 260 }, { x: 760, y: 900, s: 1.2, r: 220 },
  { x: 1230, y: 880, s: -1.1, r: 200 }, { x: 160, y: 830, s: -1.0, r: 180 }, { x: 640, y: 505, s: 2.2, r: 130 },
];
function flow(x: number, y: number): number {
  let vx = 1 + 0.4 * Math.sin(y * 0.01), vy = 0.25 * Math.cos(x * 0.008);
  for (const w of SWIRLS) {
    const dx = x - w.x, dy = y - w.y, d = Math.hypot(dx, dy) || 1;
    const k = w.s * Math.exp(-d / w.r) * 2.2;
    vx += (-dy / d) * k; vy += (dx / d) * k;
  }
  return Math.atan2(vy, vx);
}

function distToPolyline(p: Vec, pts: Vec[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const vx = b.x - a.x, vy = b.y - a.y, len2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
    best = Math.min(best, Math.hypot(p.x - a.x - vx * t, p.y - a.y - vy * t));
  }
  return best;
}

function hex(r: number, g: number, b: number, jitter: number, R: () => number) {
  const j = () => (R() - 0.5) * jitter;
  return `rgb(${Math.max(0, Math.min(255, r + j()))},${Math.max(0, Math.min(255, g + j()))},${Math.max(0, Math.min(255, b + j()))})`;
}

/** Repaint everything laid down so far with directional strokes, sampling the colour underneath. */
function repaint(ctx: CanvasRenderingContext2D) {
  const img = ctx.getImageData(0, 0, MAP_W, MAP_H).data;
  const at = (x: number, y: number) => { const i = (Math.min(MAP_H - 1, Math.max(0, Math.round(y))) * MAP_W + Math.min(MAP_W - 1, Math.max(0, Math.round(x)))) * 4; return [img[i], img[i + 1], img[i + 2]]; };
  const R = rng(13);
  const roads = LANE_IDS.map((id) => LANES[id].pts);
  // ground: strokes along the wind
  for (let i = 0; i < 26000; i++) {
    const x = R() * MAP_W, y = 70 + R() * (MAP_H - 70);
    const p = { x, y };
    if (roads.some((pts) => distToPolyline(p, pts) < 22)) continue;
    if (distToPolyline(p, RIVER) < 19 || Math.hypot((x - POND.x) / 92, (y - POND.y) / 58) < 1) continue;
    const [r, g, b] = at(x, y);
    const accent = R() < 0.05;
    const col = accent ? pick([V.cobalt, V.chromeLight, V.vermilion, V.lilac, V.white], R) : hex(r, g, b, 46, R);
    stroke(ctx, x, y, flow(x, y) + (R() - 0.5) * 0.35, 9 + R() * 10, 3 + R() * 2.4, col, R() < 0.35);
  }
  // roads: strokes along the road, in ochres and lilac shadow
  for (const id of LANE_IDS) {
    const L = LANES[id];
    for (let s = 0; s < L.length; s += 3) {
      const q = pointAt(L, s);
      const off = (R() - 0.5) * 34;
      const x = q.x - Math.sin(q.angle) * off, y = q.y + Math.cos(q.angle) * off;
      const edge = Math.abs(off) > 13;
      const col = edge ? pick([V.lilac, V.rust, V.ochre], R) : pick(id === 'mill' ? [V.chromeLight, V.ochre, V.chrome, '#f0d8a0'] : ['#d8d0c0', '#b8b0c8', V.chromeLight, '#e8dcc0'], R);
      stroke(ctx, x, y, q.angle + (R() - 0.5) * 0.25, 10 + R() * 8, 3 + R() * 2, col, R() < 0.4);
    }
  }
  // the river: strokes along the current, cobalt to turquoise with white flecks
  for (let i = 1; i < RIVER.length; i++) {
    const a = RIVER[i - 1], b = RIVER[i], ang = Math.atan2(b.y - a.y, b.x - a.x), len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let k = 0; k < len / 2; k++) {
      const t = R(), off = (R() - 0.5) * 28;
      const x = a.x + (b.x - a.x) * t - Math.sin(ang) * off, y = a.y + (b.y - a.y) * t + Math.cos(ang) * off;
      stroke(ctx, x, y, ang + Math.sin(t * 9) * 0.3, 12 + R() * 8, 3.2, pick([V.cobalt, V.ultramarine, V.turquoise, V.sky, V.white], R), R() < 0.4);
    }
  }
  // the pond: concentric swirls, like a starry sky in water
  for (let i = 0; i < 900; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R());
    const x = POND.x + Math.cos(a) * 88 * d, y = POND.y + Math.sin(a) * 54 * d;
    stroke(ctx, x, y, a + Math.PI / 2 + d * 0.8, 10 + R() * 8, 3, d > 0.8 ? V.prussian : pick([V.cobalt, V.turquoise, V.sky, V.ultramarine, V.chromeLight], R), R() < 0.3);
  }
}

/** Fill a path with short strokes in the given colours, then draw a Prussian-blue contour. */
function strokeFill(ctx: CanvasRenderingContext2D, buildPath: () => void, box: [number, number, number, number], cols: string[], ang: number, w = 2.6, contour = 2.4) {
  const R = rng(Math.round(box[0] * 13 + box[1] * 7));
  ctx.save(); buildPath(); ctx.clip();
  ctx.fillStyle = cols[0]; ctx.fillRect(box[0], box[1], box[2], box[3]);
  const n = Math.max(12, (box[2] * box[3]) / 18);
  for (let i = 0; i < n; i++) {
    const x = box[0] + R() * box[2], y = box[1] + R() * box[3];
    // light from the upper left: lighter colours on the left
    const idx = Math.min(cols.length - 1, Math.floor(((x - box[0]) / box[2]) * cols.length * 0.8 + R() * 1.4));
    stroke(ctx, x, y, ang + (R() - 0.5) * 0.6, 6 + R() * 5, w, cols[idx], R() < 0.3);
  }
  ctx.restore();
  ctx.save(); buildPath(); ctx.strokeStyle = V.prussian; ctx.lineWidth = contour; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
}

function towerVG(ctx: CanvasRenderingContext2D, type: TowerType, x: number, y: number, mark: 'traced' | 'bound' | null) {
  // a blue-violet shadow, painted in strokes
  for (let i = 0; i < 10; i++) stroke(ctx, x + 14 + i * 3, y + 6 + (i % 3) * 2, 0.15, 16, 3.5, i % 2 ? V.ultramarine : V.lilac, false);
  const cols: Record<TowerType, string[]> = {
    bramble: [V.sap, V.emerald, V.viridian, '#245a3a'],
    ember: [V.chromeLight, V.orange, V.vermilion, V.rust],
    bell: [V.white, '#e8d8a8', V.lilac, '#6a6aa8'],
    verdigris: [V.sky, V.turquoise, '#3a8a8a', V.cobalt],
  };
  strokeFill(ctx, () => towerPath(ctx, type, x, y, 1.05), [x - 26, y - 100, 52, 104], cols[type], -Math.PI / 2 + 0.2, 2.8, 3);
  if (type === 'ember') { ctx.fillStyle = V.chromeLight; ctx.beginPath(); ctx.arc(x, y - 10, 7, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; stroke(ctx, x + Math.cos(a) * 11, y - 10 + Math.sin(a) * 11, a + Math.PI / 2, 7, 2, V.chrome, false); } }
  if (type === 'bell') { ctx.fillStyle = V.chrome; ctx.beginPath(); ctx.arc(x, y - 40, 4, 0, Math.PI * 2); ctx.fill(); }
  if (type === 'bramble') for (let i = 0; i < 5; i++) { ctx.fillStyle = V.vermilion; ctx.beginPath(); ctx.arc(x - 10 + i * 5, y - 20 - (i % 3) * 14, 2.2, 0, Math.PI * 2); ctx.fill(); }
  if (mark === 'traced') { for (let i = 0; i < 3; i++) { ctx.strokeStyle = [V.cobalt, V.white, V.turquoise][i]; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(x + 22, y - 76, 4 + i * 3, i, i + 4.5); ctx.stroke(); } }
  if (mark === 'bound') star(ctx, x + 22, y - 76, 11);
}

/** A Starry-Night star: a yellow core inside rings of short strokes. */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  for (let ring = 3; ring >= 1; ring--) {
    const rr = r * ring * 0.55;
    const n = 10 + ring * 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      stroke(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, a + Math.PI / 2, rr * 0.55 + 3, 2.4, ring === 3 ? V.chrome : ring === 2 ? V.chromeLight : V.white, false);
    }
  }
  ctx.fillStyle = V.white; ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.fill();
}

function enemyVG(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number) {
  const s = type === 'cairn' ? 1.05 : 1.3;
  for (let i = 0; i < (type === 'cairn' ? 8 : 3); i++) stroke(ctx, x + 6 + i * 3, y + 8, 0.1, type === 'cairn' ? 18 : 10, 3, V.ultramarine, false);
  const cols: Record<EnemyType, string[]> = {
    levy: [V.cobalt, V.ultramarine, V.prussian],
    bearer: [V.vermilion, '#a82a1a', '#6a1a10'],
    hound: ['#3a3a5a', V.black, '#0a0a18'],
    cairn: ['#c8c0d8', V.lilac, '#5a5a8a', '#3a3a6a'],
  };
  const box: [number, number, number, number] = type === 'cairn' ? [x - 40, y - 82, 80, 96] : [x - 34, y - 46, 68, 58];
  strokeFill(ctx, () => enemyPath(ctx, type, x, y, dir, s), box, cols[type], type === 'hound' ? 0 : -Math.PI / 2 + 0.3, type === 'cairn' ? 3 : 2, 2);
  if (type === 'levy') { const sx = x + (dir > 0 ? 6 : -15); ctx.fillStyle = V.chrome; ctx.fillRect(sx, y - 14, 9, 20); ctx.fillStyle = V.white; ctx.fillRect(sx, y - 3, 9, 3); ctx.strokeStyle = V.prussian; ctx.lineWidth = 1.6; ctx.strokeRect(sx, y - 14, 9, 20); }
  if (type === 'hound') { ctx.fillStyle = V.ochre; ctx.fillRect(x + dir * 14 - 2, y - 11, 4, 9); ctx.fillStyle = V.chromeLight; ctx.beginPath(); ctx.arc(x + dir * 22, y - 9, 1.4, 0, Math.PI * 2); ctx.fill(); }
  if (type === 'bearer') { ctx.fillStyle = '#d8d0e0'; ctx.fillRect(x - 9, y - 50, 18, 13); ctx.strokeStyle = V.prussian; ctx.lineWidth = 2; ctx.strokeRect(x - 9, y - 50, 18, 13); star(ctx, x, y - 64, 6); }
  if (type === 'cairn') { ctx.fillStyle = V.prussian; ctx.beginPath(); ctx.moveTo(x - 8, y - 32); ctx.lineTo(x - 7, y - 47); ctx.quadraticCurveTo(x, y - 52, x + 7, y - 47); ctx.lineTo(x + 8, y - 32); ctx.closePath(); ctx.fill(); ctx.fillStyle = V.orange; ctx.fillRect(x + dir * 3 - 2, y - 72, 4, 2); }
}

export const vanGogh: Style = {
  id: 'vangogh',
  name: 'After Van Gogh',
  blurb: 'The whole field repainted in thick, directional strokes that follow a swirling wind: chrome-yellow wheat, viridian meadows, a pond that turns like a starry sky, flame-like cypresses, everything outlined in Prussian blue. Traces swirl in cobalt, the bound route is a chain of stars, the pulse is a blazing star, and the sun burns over a band of turning sky.',
  unity: 'A painterly shader rather than painted assets: a brushstroke post-process (or Kuwahara-style filter) driven by a flow-field texture, applied over simple coloured models or sprites, plus thick outlines. Distinctive and moving; needs care so the strokes never hide small enemies.',
  ground(ctx, R) {
    // flat underpainting: meadow, wheat fields, fallow; later repainted in strokes
    ctx.fillStyle = V.emerald; ctx.fillRect(0, 0, MAP_W, MAP_H);
    for (let i = 0; i < 40; i++) {
      const cx = R() * MAP_W, cy = R() * MAP_H, w = 140 + R() * 220, h = 80 + R() * 120, a = -0.3 + R() * 0.6;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = pick([V.chrome, V.chrome, V.sap, V.olive, V.ochre, V.viridian], R);
      ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = V.cobalt; ctx.lineWidth = 34; smooth(ctx, river, 80); ctx.stroke();
    ctx.fillStyle = V.cobalt; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 92, 58, -0.15, 0, Math.PI * 2); ctx.fill();
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = kind === 'mill' ? V.chromeLight : '#d8d0c0'; ctx.lineWidth = 40; smooth(ctx, pts); ctx.stroke();
  },
  bridge(ctx, at, a) {
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15);
    strokeFill(ctx, () => { ctx.beginPath(); ctx.rect(-48, -28, 96, 56); }, [-48, -28, 96, 56], ['#e8dcc0', V.ochre, V.lilac, '#7a6aa8'], 0, 3, 3);
    ctx.strokeStyle = V.prussian; ctx.lineWidth = 2.4; for (const x of [-24, 0, 24]) { ctx.beginPath(); ctx.arc(x, 28, 9, Math.PI, 0); ctx.stroke(); }
    ctx.restore();
  },
  tree(ctx, x, y, r, k) {
    if (k > 0.5) {
      // a cypress like a dark green flame, strokes curling upward
      const h = r * 3.8, w = r * 0.75;
      for (let i = 0; i < 34; i++) {
        const t = i / 34, side = (i % 2 ? 1 : -1) * (1 - t * 0.8) * w;
        ctx.strokeStyle = pick([V.viridian, '#1e4a2e', '#2a3a1e', V.prussian, '#4a7a3a', '#5a8a3a'], R0); ctx.lineWidth = 4.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + side, y - t * h * 0.15); ctx.bezierCurveTo(x + side * 1.3, y - h * (0.3 + t * 0.3), x - side * 0.5, y - h * (0.6 + t * 0.2), x + Math.sin(t * 7) * 4, y - h * (0.82 + t * 0.18)); ctx.stroke();
      }
      ctx.strokeStyle = V.prussian; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w, y); ctx.bezierCurveTo(x + w * 1.3, y - h * 0.5, x + 3, y - h * 0.8, x, y - h); ctx.stroke();
    } else {
      // a round tree: a dense knot of short strokes turning around its centre
      const cy = y - r * 0.9;
      for (let i = 0; i < 34; i++) {
        const a = R0() * Math.PI * 2, d = r * Math.sqrt(R0()) * 0.95;
        const lit = Math.cos(a + 2.4) * 0.5 + 0.5; // upper-left lighter
        const col = lit > 0.65 ? pick([V.chromeLight, V.sap, '#b8d860'], R0) : lit > 0.3 ? pick([V.emerald, V.sap, V.viridian], R0) : pick([V.viridian, '#1e4a2e', V.prussian], R0);
        stroke(ctx, x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, a + Math.PI / 2 + 0.3, r * 0.55 + 4, 3.6, col, R0() < 0.3);
      }
      ctx.strokeStyle = V.prussian; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, cy, r * 1.02, -0.3, Math.PI * 0.9); ctx.stroke();
      ctx.strokeStyle = V.rust; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 1, y - r * 0.05); ctx.stroke();
    }
  },
  ley(ctx, edges, knots) {
    repaint(ctx);
    // leylines: faint dabs of white and lilac along the routes
    for (const e of edges) for (let i = 0; i < e.length; i += 2) stroke(ctx, e[i].x, e[i].y, i + 1 < e.length ? Math.atan2(e[i + 1].y - e[i].y, e[i + 1].x - e[i].x) : 0, 6, 2, i % 4 ? 'rgba(246,240,220,0.75)' : 'rgba(154,138,200,0.85)', false);
    for (const k of knots) { ctx.fillStyle = V.white; ctx.beginPath(); ctx.arc(k.x, k.y, 3, 0, Math.PI * 2); ctx.fill(); }
  },
  bound(ctx, path) {
    // a chain of stars along the gilded route
    for (let i = 0; i < path.length; i++) {
      const a = i + 1 < path.length ? Math.atan2(path[i + 1].y - path[i].y, path[i + 1].x - path[i].x) : 0;
      stroke(ctx, path[i].x, path[i].y, a, 12, 5, i % 2 ? V.chrome : V.orange, true);
    }
    for (let i = 6; i < path.length - 3; i += 14) star(ctx, path[i].x, path[i].y, 9);
  },
  trace(ctx, path) {
    // cobalt swirls laid along the leyline, with white and turquoise in the wet paint
    for (let i = 1; i < path.length; i++) {
      const a = Math.atan2(path[i].y - path[i - 1].y, path[i].x - path[i - 1].x);
      for (const [off, col, w] of [[0, V.ultramarine, 6], [-3, V.cobalt, 3.6], [3, V.turquoise, 2.4], [-1, V.white, 1.4]] as const) {
        const x = path[i].x - Math.sin(a) * off, y = path[i].y + Math.cos(a) * off;
        stroke(ctx, x, y, a + Math.sin(i * 0.7) * 0.25, 13, w, col, false);
      }
      if (i % 9 === 0) { ctx.strokeStyle = V.turquoise; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(path[i].x, path[i].y, 8, i, i + 4); ctx.stroke(); }
    }
  },
  fire(ctx, pts) {
    pts.forEach((p, i) => {
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = [V.vermilion, V.orange, V.chrome, V.chromeLight][k]; ctx.lineWidth = 4 - k * 0.6; ctx.lineCap = 'round';
        const h = 14 + ((i * 7 + k * 3) % 12);
        ctx.beginPath(); ctx.moveTo(p.x - 6 + k * 4, p.y + 4); ctx.bezierCurveTo(p.x - 10 + k * 4, p.y - h * 0.4, p.x + 6 - k * 2, p.y - h * 0.7, p.x + Math.sin(i + k) * 4, p.y - h); ctx.stroke();
      }
    });
  },
  foundation(ctx, x, y) {
    strokeFill(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, 30, 13, 0, 0, Math.PI * 2); }, [x - 30, y - 13, 60, 26], ['#f0e8d0', '#d8ccb0', V.lilac, '#7a6aa8'], 0, 2.4, 2.4);
  },
  tower: towerVG,
  enemy: enemyVG,
  castle(ctx, at) {
    const x = at.x, y = at.y;
    for (let i = 0; i < 30; i++) stroke(ctx, x + 70 + (i % 5) * 6, y - 120 + i * 9, 0.2, 24, 4, i % 2 ? V.ultramarine : V.lilac, false);
    strokeFill(ctx, () => { ctx.beginPath(); ctx.rect(x - 66, y - 126, 130, 252); }, [x - 66, y - 126, 130, 252], ['#f6ead0', '#e8d0a0', V.ochre, V.lilac], -Math.PI / 2, 3.2, 3.4);
    strokeFill(ctx, () => { ctx.beginPath(); ctx.rect(x - 24, y - 70, 72, 140); }, [x - 24, y - 70, 72, 140], ['#f0d8a0', V.chrome, V.ochre, V.rust], -Math.PI / 2, 3, 3);
    for (const ty of [y - 126, y + 126]) {
      strokeFill(ctx, () => { ctx.beginPath(); ctx.arc(x - 58, ty, 26, 0, Math.PI * 2); }, [x - 84, ty - 26, 52, 52], ['#f6ead0', '#e0c890', V.lilac], -Math.PI / 2, 3, 2.6);
      strokeFill(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 86, ty); ctx.lineTo(x - 58, ty - 52); ctx.lineTo(x - 30, ty); ctx.closePath(); }, [x - 86, ty - 52, 56, 52], [V.orange, V.vermilion, V.rust], -1.2, 3, 2.6);
    }
    strokeFill(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 32, y - 70); ctx.lineTo(x + 12, y - 116); ctx.lineTo(x + 56, y - 70); ctx.closePath(); }, [x - 32, y - 116, 88, 46], [V.cobalt, V.ultramarine, V.prussian], -0.6, 3, 2.6);
    ctx.fillStyle = V.chromeLight; for (const [wx, wy] of [[x - 4, y - 30], [x + 22, y - 30], [x - 4, y + 10], [x + 22, y + 10]]) ctx.fillRect(wx, wy, 8, 12);
    ctx.fillStyle = V.prussian; ctx.fillRect(x - 76, y - 20, 20, 40);
  },
  mill(ctx, at) {
    strokeFill(ctx, () => { ctx.beginPath(); ctx.rect(at.x - 38, at.y - 14, 76, 40); }, [at.x - 38, at.y - 14, 76, 40], ['#f6ead0', '#e8d0a0', V.lilac], -Math.PI / 2, 3, 2.6);
    strokeFill(ctx, () => { ctx.beginPath(); ctx.moveTo(at.x - 46, at.y - 14); ctx.lineTo(at.x, at.y - 52); ctx.lineTo(at.x + 46, at.y - 14); ctx.closePath(); }, [at.x - 46, at.y - 52, 92, 38], [V.orange, V.vermilion, V.rust], -0.5, 3, 2.6);
    ctx.strokeStyle = V.prussian; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(at.x - 54, at.y + 10, 20, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; stroke(ctx, at.x - 54 + Math.cos(a) * 10, at.y + 10 + Math.sin(a) * 10, a, 18, 2.4, V.rust, false); }
  },
  inkwell(ctx, at) {
    strokeFill(ctx, () => { ctx.beginPath(); ctx.moveTo(at.x - 30, at.y + 24); ctx.quadraticCurveTo(at.x - 36, at.y - 4, at.x - 16, at.y - 14); ctx.lineTo(at.x + 16, at.y - 14); ctx.quadraticCurveTo(at.x + 36, at.y - 4, at.x + 30, at.y + 24); ctx.closePath(); }, [at.x - 36, at.y - 14, 72, 38], [V.turquoise, V.cobalt, V.ultramarine, V.prussian], 0.2, 3, 2.6);
    for (let i = 0; i < 9; i++) stroke(ctx, at.x - 20 + i * 2, at.y - 40 - i * 6, -1.1, 12, 3, i % 2 ? V.white : '#e8dcc0', false);
  },
  pulse(ctx, at, trail) {
    stroke(ctx, (at.x + trail.x) / 2, (at.y + trail.y) / 2, Math.atan2(at.y - trail.y, at.x - trail.x), Math.hypot(at.x - trail.x, at.y - trail.y), 7, V.chromeLight, false);
    star(ctx, at.x, at.y, 14);
  },
  post(ctx) {
    // a band of turning sky across the top, with the sun and a few crows
    const R = rng(31);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, MAP_W, 70); ctx.clip();
    ctx.fillStyle = V.sky; ctx.fillRect(0, 0, MAP_W, 70);
    for (let i = 0; i < 900; i++) {
      const x = R() * MAP_W, y = R() * 70;
      const a = Math.sin(x * 0.012) * 0.9 + Math.cos(y * 0.08 + x * 0.004) * 0.6;
      stroke(ctx, x, y, a, 12 + R() * 8, 3, pick([V.sky, V.turquoise, V.cobalt, V.white, '#b8e0f0'], R), R() < 0.3);
    }
    ctx.restore();
    const sx = 1120, sy = 34;
    for (let ring = 4; ring >= 1; ring--) {
      const n = 12 + ring * 6;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const rr = ring * 9; stroke(ctx, sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.8, a + Math.PI / 2, rr * 0.5 + 4, 3, ring > 2 ? V.chrome : V.chromeLight, false); }
    }
    ctx.fillStyle = V.white; ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = V.black; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    for (const [cx, cy, w] of [[300, 30, 10], [340, 46, 8], [420, 24, 11], [520, 40, 9], [600, 22, 8]]) { ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.quadraticCurveTo(cx - w / 2, cy - w * 0.6, cx, cy); ctx.quadraticCurveTo(cx + w / 2, cy - w * 0.6, cx + w, cy); ctx.stroke(); }
    ctx.strokeStyle = V.prussian; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 70); for (let x = 0; x <= MAP_W; x += 20) ctx.lineTo(x, 70 + Math.sin(x * 0.02) * 3); ctx.stroke();
    // canvas weave and a little varnish
    ctx.globalAlpha = 0.05; ctx.fillStyle = '#000';
    for (let y = 0; y < MAP_H; y += 4) ctx.fillRect(0, y, MAP_W, 1);
    for (let x = 0; x < MAP_W; x += 4) ctx.fillRect(x, 0, 1, MAP_H);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = V.prussian; ctx.lineWidth = 10; ctx.strokeRect(5, 5, MAP_W - 10, MAP_H - 10);
  },
};
void line;
