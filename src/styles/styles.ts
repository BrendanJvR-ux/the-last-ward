// Six art directions for the same siege. Same map, same mechanics, different worlds.
import type { FieldTowerType as TowerType } from '../balance';
import { MAP_W, MAP_H, line, smooth, rng, type Style, type Vec } from './scene';
import { renaissance } from './renaissance';
import { vanGogh } from './vangogh';
import { anime } from './anime';
import { mangaMedical } from './mangaMedical';
import { anim3d } from './anim3d';
import { anatomy } from './anatomy';
import { mangaTokyo, mangaAncient } from './mangaJapan';
import { inkSurreal } from './inkSurreal';

import { towerPath, enemyPath } from './shapes';

/** Chest recess of the Cairn-Born, so every style shows its emptiness. */
function cairnHollow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, s: number, fill: string) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(-7, -30); ctx.lineTo(-6, -44); ctx.quadraticCurveTo(0, -49, 6, -44); ctx.lineTo(7, -30); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function glow(ctx: CanvasRenderingContext2D, color: string, blur: number, fn: () => void) {
  ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; fn(); ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, inner: string, outer: string, r0 = 350, r1 = 950) {
  const g = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, r0, MAP_W / 2, MAP_H / 2, r1);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H);
}

function shadeHex(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ── 1. Low-poly diorama ─────────────────────────────────────────────────────

const lowPoly: Style = {
  id: 'lowpoly',
  name: 'Low-poly diorama',
  blurb: 'A bright little 3D world on a tabletop: faceted hills, flat-shaded trees, soft daylight. Friendly, very readable, scales from phone to TV.',
  unity: '3D. Simple low-poly models with flat shading and one sun. The cheapest 3D route: asset packs or one modeller. Camera can tilt and zoom for free.',
  ground(ctx, R) {
    ctx.fillStyle = '#9ccf7a'; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // faceted terrain: jittered triangle grid
    const step = 80, pts: Vec[][] = [];
    for (let j = 0; j <= MAP_H / step + 1; j++) { pts.push([]); for (let i = 0; i <= MAP_W / step + 1; i++) pts[j].push({ x: i * step + (R() - 0.5) * 40, y: j * step + (R() - 0.5) * 40 }); }
    for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < pts[j].length - 1; i++) {
      for (const tri of [[pts[j][i], pts[j][i + 1], pts[j + 1][i]], [pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]]]) {
        const l = 0.92 + R() * 0.16;
        ctx.fillStyle = shadeHex('#9ccf7a', l);
        ctx.beginPath(); ctx.moveTo(tri[0].x, tri[0].y); ctx.lineTo(tri[1].x, tri[1].y); ctx.lineTo(tri[2].x, tri[2].y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#d8c48e'; ctx.lineWidth = 44; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = '#4fb3c8'; ctx.lineWidth = 32; smooth(ctx, river, 80); ctx.stroke();
    ctx.fillStyle = '#d8c48e'; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 98, 64, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4fb3c8'; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 88, 55, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fd0df'; ctx.beginPath(); ctx.ellipse(pond.x - 20, pond.y - 14, 40, 20, -0.15, 0, Math.PI * 2); ctx.fill();
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#b48c58'; ctx.lineWidth = 42; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = kind === 'mill' ? '#e6c98e' : '#d9d2c3'; ctx.lineWidth = 34; smooth(ctx, pts); ctx.stroke();
  },
  bridge(ctx, at, a) {
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15);
    ctx.fillStyle = '#9a8f84'; ctx.fillRect(-48, -22, 96, 50);
    ctx.fillStyle = '#c9bfb2'; ctx.fillRect(-48, -28, 96, 48);
    ctx.fillStyle = '#e6ddd0'; ctx.fillRect(-48, -32, 96, 8); ctx.fillRect(-48, 14, 96, 8);
    ctx.restore();
  },
  tree(ctx, x, y, r, k) {
    ctx.fillStyle = 'rgba(40,70,30,0.25)'; ctx.beginPath(); ctx.ellipse(x + r * 0.5, y + r * 0.4, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a5532'; ctx.fillRect(x - 2, y - 4, 4, 10);
    if (k > 0.5) {
      ctx.fillStyle = '#3f8f4a'; ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.lineTo(x - r * 0.8, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2e6e3a'; ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    } else {
      const c = y - r * 0.9;
      const facets: [number, number, string][] = [[-1, -1, '#79c25a'], [1, -1, '#5aa848'], [-1, 1, '#4f9a40'], [1, 1, '#3c7d33']];
      for (const [dx, dy, col] of facets) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, c); ctx.lineTo(x + dx * r, c); ctx.lineTo(x, c + dy * r); ctx.closePath(); ctx.fill();
      }
    }
  },
  ley(ctx, edges) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([2, 8]); ctx.lineCap = 'round';
    for (const e of edges) line(ctx, e);
    ctx.setLineDash([]);
  },
  bound(ctx, path) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#b8862b'; ctx.lineWidth = 12; line(ctx, path);
    ctx.strokeStyle = '#ffd35c'; ctx.lineWidth = 7; line(ctx, path);
  },
  trace(ctx, path) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    glow(ctx, 'rgba(90,170,255,0.9)', 14, () => { ctx.strokeStyle = '#4aa3ff'; ctx.lineWidth = 7; line(ctx, path); });
    ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 2.5; line(ctx, path);
  },
  fire(ctx, pts) {
    for (const p of pts) { ctx.fillStyle = 'rgba(255,140,40,0.35)'; ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.fill(); }
    pts.forEach((p, i) => { if (i % 2) return; ctx.fillStyle = i % 4 ? '#ffb347' : '#ff6a2a'; ctx.beginPath(); ctx.moveTo(p.x - 7, p.y + 3); ctx.lineTo(p.x, p.y - 20); ctx.lineTo(p.x + 7, p.y + 3); ctx.closePath(); ctx.fill(); });
  },
  foundation(ctx, x, y) {
    ctx.fillStyle = '#8f8a82'; ctx.beginPath(); ctx.ellipse(x, y + 4, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfc8bc'; ctx.beginPath(); ctx.ellipse(x, y, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
  },
  tower(ctx, type, x, y, mark) {
    const col = { bramble: '#4f9a40', ember: '#d0603a', bell: '#e8dccb', verdigris: '#4fb3a0' }[type];
    ctx.fillStyle = 'rgba(40,60,30,0.3)'; ctx.beginPath(); ctx.ellipse(x + 26, y + 6, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
    // side faces: left lit, right shaded
    ctx.save(); towerPath(ctx, type, x, y); ctx.clip();
    ctx.fillStyle = shadeHex(col.startsWith('#') ? col : '#888888', 1.08); ctx.fillRect(x - 40, y - 100, 40, 110);
    ctx.fillStyle = shadeHex(col, 0.72); ctx.fillRect(x, y - 100, 40, 110);
    ctx.restore();
    if (type === 'bell') { ctx.fillStyle = '#c84a3a'; ctx.beginPath(); ctx.moveTo(x - 14, y - 54); ctx.lineTo(x, y - 92); ctx.lineTo(x + 14, y - 54); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#9a3328'; ctx.beginPath(); ctx.moveTo(x, y - 92); ctx.lineTo(x + 14, y - 54); ctx.lineTo(x, y - 54); ctx.closePath(); ctx.fill(); }
    if (type === 'ember') { ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.arc(x, y - 9, 7, Math.PI, 0); ctx.lineTo(x + 7, y); ctx.lineTo(x - 7, y); ctx.fill(); }
    marker(ctx, x + 22, y - 74, mark, '#4aa3ff', '#ffd35c');
  },
  enemy(ctx, type, x, y, dir) {
    const col = { levy: '#c8503a', bearer: '#7a3a8a', hound: '#3a3a44', cairn: '#9a978e' }[type];
    const s = type === 'cairn' ? 1 : 1.2;
    ctx.fillStyle = 'rgba(40,60,30,0.3)'; ctx.beginPath(); ctx.ellipse(x + 5, y + 8, type === 'cairn' ? 34 : 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); enemyPath(ctx, type, x, y, dir, s); ctx.clip();
    ctx.fillStyle = shadeHex(col, 1.15); ctx.fillRect(x - 60, y - 90, 60, 110);
    ctx.fillStyle = shadeHex(col, 0.8); ctx.fillRect(x, y - 90, 60, 110);
    ctx.restore();
    if (type === 'levy') { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + dir * 6 * s - (dir < 0 ? 7 * s : 0), y - 2 * s, 7 * s, 2.4 * s); }
    if (type === 'bearer') { ctx.fillStyle = '#ffd35c'; ctx.beginPath(); ctx.arc(x, y - 52, 4, 0, Math.PI * 2); ctx.fill(); }
    if (type === 'hound') { ctx.fillStyle = '#d0963a'; ctx.fillRect(x + dir * 11 * s - 2, y - 9 * s, 4, 8 * s); }
    if (type === 'cairn') cairnHollow(ctx, x, y, dir, s, '#222');
  },
  castle(ctx, at) {
    const x = at.x, y = at.y;
    ctx.fillStyle = 'rgba(40,60,30,0.3)'; ctx.fillRect(x - 50, y - 110, 140, 260);
    ctx.fillStyle = '#e6ddd0'; ctx.fillRect(x - 66, y - 126, 64, 252);
    ctx.fillStyle = '#bfb5a6'; ctx.fillRect(x - 2, y - 126, 66, 252);
    ctx.fillStyle = '#c84a3a'; for (const ty of [y - 126, y + 126]) { ctx.beginPath(); ctx.moveTo(x - 86, ty); ctx.lineTo(x - 58, ty - 50); ctx.lineTo(x - 30, ty); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#5a4232'; ctx.fillRect(x - 76, y - 20, 20, 40);
  },
  mill(ctx, at) {
    ctx.fillStyle = '#e6ddd0'; ctx.fillRect(at.x - 38, at.y - 14, 38, 40); ctx.fillStyle = '#bfb5a6'; ctx.fillRect(at.x, at.y - 14, 38, 40);
    ctx.fillStyle = '#c84a3a'; ctx.beginPath(); ctx.moveTo(at.x - 44, at.y - 14); ctx.lineTo(at.x, at.y - 52); ctx.lineTo(at.x + 44, at.y - 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a6440'; ctx.beginPath(); ctx.arc(at.x - 50, at.y + 10, 22, 0, Math.PI * 2); ctx.fill();
  },
  inkwell(ctx, at) {
    ctx.fillStyle = '#2b4f8a'; ctx.beginPath(); ctx.moveTo(at.x - 28, at.y + 24); ctx.lineTo(at.x - 18, at.y - 14); ctx.lineTo(at.x + 18, at.y - 14); ctx.lineTo(at.x + 28, at.y + 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a7ac8'; ctx.beginPath(); ctx.moveTo(at.x - 28, at.y + 24); ctx.lineTo(at.x - 18, at.y - 14); ctx.lineTo(at.x, at.y - 14); ctx.lineTo(at.x, at.y + 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd35c'; ctx.fillRect(at.x - 16, at.y - 20, 32, 7);
  },
  pulse(ctx, at, trail) {
    ctx.strokeStyle = '#bfe0ff'; ctx.lineWidth = 8; ctx.lineCap = 'round'; line(ctx, [trail, at]);
    glow(ctx, '#4aa3ff', 20, () => { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(at.x, at.y, 10, 0, Math.PI * 2); ctx.fill(); });
  },
  post(ctx) {
    // tilt-shift: soften top and bottom with haze
    const g = ctx.createLinearGradient(0, 0, 0, MAP_H);
    g.addColorStop(0, 'rgba(255,255,255,0.28)'); g.addColorStop(0.2, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H);
  },
};

function marker(ctx: CanvasRenderingContext2D, x: number, y: number, mark: 'traced' | 'bound' | null, traceCol: string, boundCol: string, shape: 'circle' | 'diamond' = 'diamond') {
  if (!mark) return;
  ctx.save();
  ctx.shadowColor = mark === 'bound' ? boundCol : traceCol; ctx.shadowBlur = 12;
  ctx.fillStyle = mark === 'bound' ? boundCol : traceCol;
  ctx.beginPath();
  if (shape === 'diamond') { ctx.moveTo(x, y - 10); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 10); ctx.lineTo(x - 8, y); ctx.closePath(); }
  else ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── 2. Dark fantasy, by night ───────────────────────────────────────────────

const darkFantasy: Style = {
  id: 'dark',
  name: 'Dark fantasy, by night',
  blurb: 'Moonlit marsh and torchlight. The leylines are the brightest thing on the field, so magic becomes the light source of the whole game.',
  unity: '2D sprites (or 3D) with URP 2D lights: towers, fires and threads cast real light. Moody and atmospheric; needs care so enemies stay readable in the dark.',
  ground(ctx, R) {
    ctx.fillStyle = '#121a1c'; ctx.fillRect(0, 0, MAP_W, MAP_H);
    for (let i = 0; i < 3000; i++) { ctx.fillStyle = `rgba(${40 + R() * 30},${60 + R() * 40},${60 + R() * 30},${R() * 0.12})`; ctx.fillRect(R() * MAP_W, R() * MAP_H, 2 + R() * 6, 1 + R() * 3); }
    const m = ctx.createRadialGradient(1250, 120, 30, 1250, 120, 900);
    m.addColorStop(0, 'rgba(150,180,210,0.22)'); m.addColorStop(1, 'rgba(150,180,210,0)');
    ctx.fillStyle = m; ctx.fillRect(0, 0, MAP_W, MAP_H);
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#05080a'; ctx.lineWidth = 34; smooth(ctx, river, 80); ctx.stroke();
    ctx.fillStyle = '#05080a'; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 92, 58, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,200,230,0.5)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(pond.x - 20 + i * 4, pond.y - 30 + i * 10); ctx.lineTo(pond.x + 10 + i * 6, pond.y - 30 + i * 10); ctx.stroke(); }
  },
  road(ctx, pts) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 42; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = '#2c2822'; ctx.lineWidth = 30; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,180,200,0.12)'; ctx.lineWidth = 2; ctx.setLineDash([30, 40]); smooth(ctx, pts); ctx.stroke(); ctx.setLineDash([]);
  },
  bridge(ctx, at, a) {
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15);
    ctx.fillStyle = '#3a3a3e'; ctx.fillRect(-48, -28, 96, 56);
    ctx.fillStyle = 'rgba(170,190,215,0.35)'; ctx.fillRect(-48, -30, 96, 4);
    ctx.restore();
  },
  tree(ctx, x, y, r) {
    ctx.fillStyle = '#060a08';
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.9); ctx.lineTo(x + r * 0.7, y + r * 0.3); ctx.lineTo(x - r * 0.7, y + r * 0.3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,185,210,0.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.9); ctx.lineTo(x + r * 0.7, y + r * 0.3); ctx.stroke();
  },
  ley(ctx, edges, knots) {
    ctx.strokeStyle = 'rgba(150,110,230,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
    for (const e of edges) line(ctx, e);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(170,130,255,0.6)';
    for (const k of knots) { ctx.beginPath(); ctx.arc(k.x, k.y, 3, 0, Math.PI * 2); ctx.fill(); }
  },
  bound(ctx, path) {
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 'rgba(255,170,40,1)', 24, () => { ctx.strokeStyle = 'rgba(255,170,50,0.9)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; line(ctx, path); });
    ctx.globalCompositeOperation = 'source-over';
  },
  trace(ctx, path) {
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 'rgba(150,90,255,1)', 26, () => { ctx.strokeStyle = 'rgba(170,110,255,0.95)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; line(ctx, path); });
    ctx.strokeStyle = 'rgba(230,215,255,0.9)'; ctx.lineWidth = 2; line(ctx, path);
    ctx.globalCompositeOperation = 'source-over';
  },
  fire(ctx, pts) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of pts) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40); g.addColorStop(0, 'rgba(255,140,40,0.35)'); g.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, Math.PI * 2); ctx.fill(); }
    pts.forEach((p, i) => { if (i % 2) return; ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.moveTo(p.x - 6, p.y + 3); ctx.quadraticCurveTo(p.x - 4, p.y - 12, p.x, p.y - 22); ctx.quadraticCurveTo(p.x + 4, p.y - 12, p.x + 6, p.y + 3); ctx.fill(); });
    ctx.globalCompositeOperation = 'source-over';
  },
  foundation(ctx, x, y) {
    ctx.fillStyle = '#26282a'; ctx.beginPath(); ctx.ellipse(x, y, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,120,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  },
  tower(ctx, type, x, y, mark) {
    towerPath(ctx, type, x, y); ctx.fillStyle = '#0b0d10'; ctx.fill();
    ctx.strokeStyle = 'rgba(170,190,215,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    // lit windows and a torch
    ctx.globalCompositeOperation = 'lighter';
    const lights: Record<TowerType, [number, number][]> = { bramble: [[0, -30]], ember: [[0, -9]], bell: [[0, -38], [0, -14]], verdigris: [[0, -44]] };
    const col = type === 'verdigris' ? 'rgba(90,255,190,' : type === 'bramble' ? 'rgba(150,255,120,' : 'rgba(255,170,60,';
    for (const [dx, dy] of lights[type]) { const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, 34); g.addColorStop(0, col + '0.9)'); g.addColorStop(1, col + '0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + dx, y + dy, 34, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    marker(ctx, x + 22, y - 74, mark, '#b080ff', '#ffb040');
  },
  enemy(ctx, type, x, y, dir) {
    const s = type === 'cairn' ? 1 : 1.2;
    enemyPath(ctx, type, x, y, dir, s); ctx.fillStyle = type === 'cairn' ? '#2a2a2c' : '#0a0a0c'; ctx.fill();
    ctx.strokeStyle = 'rgba(170,190,215,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    const eye = type === 'hound' ? [x + dir * 18 * s, y - 7 * s, '#9cff7a'] : type === 'cairn' ? [x + dir * 4, y - 66, '#ff9a3a'] : [x + dir * 2 * s, y - 15 * s, '#ff5a3a'];
    glow(ctx, eye[2] as string, 10, () => { ctx.fillStyle = eye[2] as string; ctx.beginPath(); ctx.arc(eye[0] as number, eye[1] as number, 2, 0, Math.PI * 2); ctx.fill(); });
    if (type === 'bearer') glow(ctx, '#ffd35c', 16, () => { ctx.fillStyle = 'rgba(255,210,90,0.8)'; ctx.fillRect(x - 3, y - 36, 6, 6); });
    if (type === 'levy') { ctx.fillStyle = 'rgba(230,240,255,0.7)'; ctx.fillRect(x + dir * 6 * s - (dir < 0 ? 7 * s : 0), y - 2 * s, 7 * s, 2 * s); }
    ctx.globalCompositeOperation = 'source-over';
    if (type === 'cairn') cairnHollow(ctx, x, y, dir, s, '#000');
  },
  castle(ctx, at) {
    const x = at.x, y = at.y;
    ctx.fillStyle = '#0c0e12'; ctx.fillRect(x - 66, y - 126, 130, 252);
    ctx.strokeStyle = 'rgba(170,190,215,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(x - 66, y - 126, 130, 252);
    for (const ty of [y - 126, y + 126]) { ctx.fillStyle = '#0c0e12'; ctx.beginPath(); ctx.moveTo(x - 86, ty); ctx.lineTo(x - 58, ty - 56); ctx.lineTo(x - 30, ty); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.globalCompositeOperation = 'lighter';
    for (const [wx, wy] of [[x - 20, y - 60], [x + 20, y - 20], [x - 10, y + 40], [x + 30, y + 80], [x - 66, y]]) { const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, 30); g.addColorStop(0, 'rgba(255,170,60,0.8)'); g.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(wx, wy, 30, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  },
  mill(ctx, at) {
    ctx.fillStyle = '#0c0e12'; ctx.fillRect(at.x - 38, at.y - 14, 76, 40);
    ctx.beginPath(); ctx.moveTo(at.x - 44, at.y - 14); ctx.lineTo(at.x, at.y - 52); ctx.lineTo(at.x + 44, at.y - 14); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,60,0.7)'; ctx.fillRect(at.x + 12, at.y - 6, 8, 8); ctx.globalCompositeOperation = 'source-over';
  },
  inkwell(ctx, at) {
    glow(ctx, '#b080ff', 30, () => { ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.arc(at.x, at.y, 28, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = 'rgba(190,150,255,0.9)'; ctx.beginPath(); ctx.arc(at.x, at.y, 12, 0, Math.PI * 2); ctx.fill();
  },
  pulse(ctx, at, trail) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(200,160,255,0.8)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; line(ctx, [trail, at]);
    glow(ctx, '#c090ff', 30, () => { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(at.x, at.y, 9, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalCompositeOperation = 'source-over';
  },
  post(ctx) {
    const R = rng(4);
    for (let i = 0; i < 8; i++) { const y = R() * MAP_H; const g = ctx.createLinearGradient(0, y - 40, 0, y + 40); g.addColorStop(0, 'rgba(150,170,190,0)'); g.addColorStop(0.5, 'rgba(150,170,190,0.07)'); g.addColorStop(1, 'rgba(150,170,190,0)'); ctx.fillStyle = g; ctx.fillRect(0, y - 40, MAP_W, 80); }
    vignette(ctx, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.75)');
  },
};

// ── 3. Pixel art ────────────────────────────────────────────────────────────

const PIX = ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57', '#8f563b', '#c28569', '#6b8c42', '#3e5a2a'];

const pixel: Style = {
  id: 'pixel',
  name: '16-bit pixel art',
  blurb: 'A crisp retro tower defence: chunky readable sprites, a fixed palette, tiles. Nostalgic and fast to animate frame by frame.',
  unity: '2D sprites on a tilemap with the Pixel Perfect Camera. Each asset is quick to make, but you need many animation frames. Easy on phones and the web.',
  pixel: { scale: 0.3, palette: PIX },
  ground(ctx, R) {
    ctx.fillStyle = '#38b764'; ctx.fillRect(0, 0, MAP_W, MAP_H);
    for (let i = 0; i < 500; i++) { ctx.fillStyle = R() < 0.5 ? '#6b8c42' : '#a7f070'; ctx.fillRect(Math.floor(R() * 160) * 10, Math.floor(R() * 100) * 10, 10, 10); }
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    ctx.strokeStyle = '#29366f'; ctx.lineWidth = 40; line(ctx, river);
    ctx.strokeStyle = '#3b5dc9'; ctx.lineWidth = 28; line(ctx, river);
    ctx.fillStyle = '#29366f'; ctx.fillRect(pond.x - 96, pond.y - 60, 192, 120);
    ctx.fillStyle = '#3b5dc9'; ctx.fillRect(pond.x - 86, pond.y - 50, 172, 100);
    ctx.fillStyle = '#73eff7'; ctx.fillRect(pond.x - 40, pond.y - 30, 40, 7); ctx.fillRect(pond.x + 10, pond.y + 10, 30, 7);
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    ctx.strokeStyle = '#8f563b'; ctx.lineWidth = 42; line(ctx, pts);
    ctx.strokeStyle = kind === 'mill' ? '#c28569' : '#94b0c2'; ctx.lineWidth = 30; line(ctx, pts);
  },
  bridge(ctx, at, a) { ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a); ctx.fillStyle = '#566c86'; ctx.fillRect(-50, -26, 100, 52); ctx.fillStyle = '#94b0c2'; ctx.fillRect(-50, -26, 100, 8); ctx.fillRect(-50, 18, 100, 8); ctx.restore(); },
  tree(ctx, x, y, r) {
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x - r - 3, y - r * 1.6 - 3, r * 2 + 6, r * 1.9 + 6);
    ctx.fillStyle = '#257179'; ctx.fillRect(x - r, y - r * 1.6, r * 2, r * 1.9);
    ctx.fillStyle = '#38b764'; ctx.fillRect(x - r, y - r * 1.6, r * 1.2, r);
    ctx.fillStyle = '#8f563b'; ctx.fillRect(x - 3, y + 2, 6, 8);
  },
  ley(ctx, edges) { ctx.strokeStyle = '#ffcd75'; ctx.lineWidth = 4; ctx.setLineDash([10, 14]); for (const e of edges) line(ctx, e); ctx.setLineDash([]); },
  bound(ctx, path) { ctx.strokeStyle = '#1a1c2c'; ctx.lineWidth = 16; line(ctx, path); ctx.strokeStyle = '#ffcd75'; ctx.lineWidth = 10; line(ctx, path); },
  trace(ctx, path) { ctx.strokeStyle = '#1a1c2c'; ctx.lineWidth = 14; line(ctx, path); ctx.strokeStyle = '#41a6f6'; ctx.lineWidth = 8; line(ctx, path); ctx.strokeStyle = '#73eff7'; ctx.lineWidth = 3; line(ctx, path); },
  fire(ctx, pts) { pts.forEach((p, i) => { ctx.fillStyle = i % 2 ? '#ef7d57' : '#ffcd75'; ctx.fillRect(p.x - 9, p.y - 16, 18, 22); ctx.fillStyle = '#b13e53'; ctx.fillRect(p.x - 9, p.y + 2, 18, 6); }); },
  foundation(ctx, x, y) { ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x - 30, y - 12, 60, 24); ctx.fillStyle = '#94b0c2'; ctx.fillRect(x - 26, y - 9, 52, 18); },
  tower(ctx, type, x, y, mark) {
    const body = { bramble: '#38b764', ember: '#b13e53', bell: '#f4f4f4', verdigris: '#73eff7' }[type];
    towerPath(ctx, type, x, y, 1.1); ctx.fillStyle = '#1a1c2c'; ctx.lineWidth = 8; ctx.strokeStyle = '#1a1c2c'; ctx.stroke(); ctx.fillStyle = body; ctx.fill();
    if (type === 'ember') { ctx.fillStyle = '#ffcd75'; ctx.fillRect(x - 7, y - 16, 14, 16); }
    if (type === 'bell') { ctx.fillStyle = '#b13e53'; ctx.fillRect(x - 10, y - 90, 20, 30); ctx.fillStyle = '#ffcd75'; ctx.fillRect(x - 5, y - 44, 10, 12); }
    if (mark) { ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x + 14, y - 92, 20, 20); ctx.fillStyle = mark === 'bound' ? '#ffcd75' : '#41a6f6'; ctx.fillRect(x + 17, y - 89, 14, 14); }
  },
  enemy(ctx, type, x, y, dir) {
    const s = type === 'cairn' ? 1 : 1.5;
    const col = { levy: '#b13e53', bearer: '#5d275d', hound: '#333c57', cairn: '#566c86' }[type];
    enemyPath(ctx, type, x, y, dir, s); ctx.strokeStyle = '#1a1c2c'; ctx.lineWidth = 7; ctx.stroke(); ctx.fillStyle = col; ctx.fill();
    if (type === 'levy') { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x + (dir > 0 ? 7 : -18) * 1, y - 3, 11, 4); }
    if (type === 'bearer') { ctx.fillStyle = '#ffcd75'; ctx.fillRect(x - 4, y - 74, 8, 8); }
    if (type === 'hound') { ctx.fillStyle = '#ef7d57'; ctx.fillRect(x + dir * 16 - 3, y - 14, 6, 10); ctx.fillStyle = '#a7f070'; ctx.fillRect(x + dir * 26 - 2, y - 12, 4, 4); }
    if (type === 'cairn') cairnHollow(ctx, x, y, dir, s, '#1a1c2c');
  },
  castle(ctx, at) {
    const x = at.x, y = at.y;
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x - 72, y - 132, 142, 264);
    ctx.fillStyle = '#94b0c2'; ctx.fillRect(x - 66, y - 126, 130, 252);
    ctx.fillStyle = '#566c86'; for (let yy = y - 120; yy < y + 126; yy += 24) ctx.fillRect(x - 66, yy, 130, 6);
    ctx.fillStyle = '#b13e53'; ctx.fillRect(x - 86, y - 176, 56, 50); ctx.fillRect(x - 86, y + 76, 56, 50);
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x - 76, y - 20, 22, 40);
  },
  mill(ctx, at) { ctx.fillStyle = '#1a1c2c'; ctx.fillRect(at.x - 44, at.y - 56, 88, 86); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(at.x - 38, at.y - 14, 76, 40); ctx.fillStyle = '#b13e53'; ctx.fillRect(at.x - 42, at.y - 52, 84, 38); ctx.fillStyle = '#8f563b'; ctx.fillRect(at.x - 76, at.y - 12, 34, 44); },
  inkwell(ctx, at) { ctx.fillStyle = '#1a1c2c'; ctx.fillRect(at.x - 30, at.y - 22, 60, 50); ctx.fillStyle = '#29366f'; ctx.fillRect(at.x - 26, at.y - 14, 52, 38); ctx.fillStyle = '#ffcd75'; ctx.fillRect(at.x - 18, at.y - 22, 36, 8); },
  pulse(ctx, at) { ctx.fillStyle = '#1a1c2c'; ctx.fillRect(at.x - 14, at.y - 14, 28, 28); ctx.fillStyle = '#73eff7'; ctx.fillRect(at.x - 10, at.y - 10, 20, 20); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(at.x - 6, at.y - 6, 8, 8); },
};

// ── 4. Stained glass ────────────────────────────────────────────────────────

const LEAD = '#141414';
const stainedGlass: Style = {
  id: 'glass',
  name: 'Stained glass',
  blurb: 'The battle as a cathedral window: jewel-toned glass held in black lead, lit from behind. Every thread of magic is a seam of bright glass.',
  unity: '2D vector-style sprites with an emissive glass shader and bloom. A strong, ownable look; small units need bold shapes and thick leading to stay readable.',
  ground(ctx, R) {
    ctx.fillStyle = LEAD; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // irregular quads of green glass
    const greens = ['#2f7a4a', '#3f9a58', '#256a3c', '#4aa86a', '#327f52', '#5aa860'];
    const step = 90;
    const g: Vec[][] = [];
    for (let j = 0; j <= MAP_H / step + 1; j++) { g.push([]); for (let i = 0; i <= MAP_W / step + 1; i++) g[j].push({ x: i * step + (R() - 0.5) * 60, y: j * step + (R() - 0.5) * 60 }); }
    for (let j = 0; j < g.length - 1; j++) for (let i = 0; i < g[j].length - 1; i++) {
      const q = [g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]];
      const c = greens[Math.floor(R() * greens.length)];
      const gr = ctx.createRadialGradient((q[0].x + q[2].x) / 2, (q[0].y + q[2].y) / 2, 5, (q[0].x + q[2].x) / 2, (q[0].y + q[2].y) / 2, 80);
      gr.addColorStop(0, shadeHex(c, 1.35)); gr.addColorStop(1, c);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for (const p of q.slice(1)) ctx.lineTo(p.x, p.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = LEAD; ctx.lineWidth = 4; ctx.stroke();
    }
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = LEAD; ctx.lineWidth = 42; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = '#2a5fb0'; ctx.lineWidth = 32; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = '#5a8fe0'; ctx.lineWidth = 10; smooth(ctx, river, 80); ctx.stroke();
    ctx.fillStyle = LEAD; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 98, 64, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a5fb0'; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 90, 56, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = LEAD; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(pond.x - 90, pond.y); ctx.lineTo(pond.x + 90, pond.y - 12); ctx.moveTo(pond.x - 20, pond.y - 56); ctx.lineTo(pond.x + 10, pond.y + 56); ctx.stroke();
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = LEAD; ctx.lineWidth = 46; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = kind === 'mill' ? '#c89a3a' : '#a8a098'; ctx.lineWidth = 36; smooth(ctx, pts); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.strokeStyle = LEAD; ctx.setLineDash([4, 56]); ctx.lineWidth = 36; smooth(ctx, pts); ctx.stroke(); ctx.setLineDash([]);
  },
  bridge(ctx, at, a) { ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15); ctx.fillStyle = '#b8b0a8'; ctx.strokeStyle = LEAD; ctx.lineWidth = 5; ctx.fillRect(-48, -28, 96, 56); ctx.strokeRect(-48, -28, 96, 56); for (let x = -24; x < 48; x += 24) { ctx.beginPath(); ctx.moveTo(x, -28); ctx.lineTo(x, 28); ctx.stroke(); } ctx.restore(); },
  tree(ctx, x, y, r, k) {
    ctx.fillStyle = k < 0.5 ? '#1f5a2e' : '#6a9a2a'; ctx.strokeStyle = LEAD; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - r * 0.6, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.6); ctx.lineTo(x + r, y - r * 0.6); ctx.stroke();
  },
  ley(ctx, edges) { ctx.strokeStyle = LEAD; ctx.lineWidth = 7; for (const e of edges) line(ctx, e); ctx.strokeStyle = '#d8b860'; ctx.lineWidth = 2.5; for (const e of edges) line(ctx, e); },
  bound(ctx, path) { ctx.strokeStyle = LEAD; ctx.lineWidth = 16; line(ctx, path); glow(ctx, '#ffd060', 20, () => { ctx.strokeStyle = '#ffd35c'; ctx.lineWidth = 10; line(ctx, path); }); },
  trace(ctx, path) { ctx.strokeStyle = LEAD; ctx.lineWidth = 14; line(ctx, path); glow(ctx, '#ffffff', 22, () => { ctx.strokeStyle = '#f4f8ff'; ctx.lineWidth = 8; line(ctx, path); }); },
  fire(ctx, pts) { pts.forEach((p, i) => { ctx.fillStyle = ['#e03a1a', '#ff8a1a', '#ffd040'][i % 3]; ctx.strokeStyle = LEAD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - 9, p.y + 6); ctx.lineTo(p.x, p.y - 20); ctx.lineTo(p.x + 9, p.y + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }); },
  foundation(ctx, x, y) { ctx.fillStyle = '#c8c0b8'; ctx.strokeStyle = LEAD; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, 30, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); },
  tower(ctx, type, x, y, mark) {
    const col = { bramble: '#2f8a3a', ember: '#c0281e', bell: '#e8dcb8', verdigris: '#1aa88a' }[type];
    towerPath(ctx, type, x, y, 1.05); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = LEAD; ctx.lineWidth = 5; ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 50); ctx.moveTo(x - 14, y - 26); ctx.lineTo(x + 14, y - 26); ctx.stroke();
    if (type === 'bell') { ctx.fillStyle = '#2a4fb0'; ctx.beginPath(); ctx.moveTo(x - 15, y - 57); ctx.lineTo(x, y - 97); ctx.lineTo(x + 15, y - 57); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    marker(ctx, x + 22, y - 76, mark, '#ffffff', '#ffd35c', 'circle');
  },
  enemy(ctx, type, x, y, dir) {
    const s = type === 'cairn' ? 1 : 1.3;
    const col = { levy: '#a8281e', bearer: '#6a1a8a', hound: '#2a2440', cairn: '#7a7890' }[type];
    enemyPath(ctx, type, x, y, dir, s); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = LEAD; ctx.lineWidth = 3.5; ctx.stroke();
    if (type === 'levy') { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + dir * 6 * s - (dir < 0 ? 9 : 0), y - 3, 9, 3); }
    if (type === 'hound') { ctx.fillStyle = '#d89a2a'; ctx.beginPath(); ctx.arc(x + dir * 12 * s, y - 4 * s, 3, 0, Math.PI * 2); ctx.fill(); }
    if (type === 'bearer') { ctx.fillStyle = '#ffd35c'; ctx.beginPath(); ctx.arc(x, y - 58, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    if (type === 'cairn') cairnHollow(ctx, x, y, dir, s, LEAD);
  },
  castle(ctx, at) {
    const x = at.x, y = at.y;
    ctx.fillStyle = '#d8d0c0'; ctx.strokeStyle = LEAD; ctx.lineWidth = 6; ctx.fillRect(x - 66, y - 126, 130, 252); ctx.strokeRect(x - 66, y - 126, 130, 252);
    ctx.lineWidth = 4; for (let yy = y - 84; yy < y + 126; yy += 42) { ctx.beginPath(); ctx.moveTo(x - 66, yy); ctx.lineTo(x + 64, yy); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x, y - 126); ctx.lineTo(x, y + 126); ctx.stroke();
    for (const ty of [y - 126, y + 126]) { ctx.fillStyle = '#2a4fb0'; ctx.beginPath(); ctx.moveTo(x - 86, ty); ctx.lineTo(x - 58, ty - 56); ctx.lineTo(x - 30, ty); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#c0281e'; ctx.fillRect(x - 78, y - 22, 24, 44); ctx.strokeRect(x - 78, y - 22, 24, 44);
  },
  mill(ctx, at) { ctx.fillStyle = '#e8dcb8'; ctx.strokeStyle = LEAD; ctx.lineWidth = 4; ctx.fillRect(at.x - 38, at.y - 14, 76, 40); ctx.strokeRect(at.x - 38, at.y - 14, 76, 40); ctx.fillStyle = '#c0281e'; ctx.beginPath(); ctx.moveTo(at.x - 44, at.y - 14); ctx.lineTo(at.x, at.y - 52); ctx.lineTo(at.x + 44, at.y - 14); ctx.closePath(); ctx.fill(); ctx.stroke(); },
  inkwell(ctx, at) { ctx.fillStyle = '#2a2a8a'; ctx.strokeStyle = LEAD; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(at.x, at.y, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(at.x - 28, at.y); ctx.lineTo(at.x + 28, at.y); ctx.moveTo(at.x, at.y - 28); ctx.lineTo(at.x, at.y + 28); ctx.stroke(); },
  pulse(ctx, at) { glow(ctx, '#ffffff', 30, () => { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(at.x, at.y, 11, 0, Math.PI * 2); ctx.fill(); }); ctx.strokeStyle = LEAD; ctx.lineWidth = 3; ctx.stroke(); },
  post(ctx) { const g = ctx.createRadialGradient(MAP_W * 0.4, MAP_H * 0.35, 60, MAP_W * 0.5, MAP_H * 0.5, 900); g.addColorStop(0, 'rgba(255,250,220,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H); },
};

// ── 5. Tabletop miniatures ──────────────────────────────────────────────────

const tabletop: Style = {
  id: 'tabletop',
  name: 'Tabletop miniatures',
  blurb: 'A painted wargame board under a desk lamp: model trees, miniatures on round bases, and magic as red string pinned between towers.',
  unity: '3D miniature-scale models with a single warm key light and depth of field. Charming and tactile; quality depends on good models and materials.',
  ground(ctx, R) {
    ctx.fillStyle = '#7d9a55'; ctx.fillRect(0, 0, MAP_W, MAP_H);
    for (let i = 0; i < 6000; i++) { ctx.fillStyle = `rgba(${90 + R() * 60},${110 + R() * 60},${50 + R() * 30},0.35)`; ctx.fillRect(R() * MAP_W, R() * MAP_H, 2, 2); }
    // printed hex grid of the board
    ctx.strokeStyle = 'rgba(40,50,25,0.15)'; ctx.lineWidth = 1;
    const h = 46, w = h * Math.sqrt(3);
    for (let y = 0; y < MAP_H + h; y += h * 1.5) for (let x = 0; x < MAP_W + w; x += w) {
      const ox = (Math.round(y / (h * 1.5)) % 2) * w / 2;
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; ctx.lineTo(x + ox + Math.cos(a) * h, y + Math.sin(a) * h); } ctx.closePath(); ctx.stroke();
    }
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#4a5a3a'; ctx.lineWidth = 40; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = '#3f6f86'; ctx.lineWidth = 30; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; smooth(ctx, river.map((p) => ({ x: p.x - 6, y: p.y - 4 })), 80); ctx.stroke(); // gloss resin
    ctx.fillStyle = '#3f6f86'; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 90, 56, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(pond.x - 30, pond.y - 20, 30, 8, -0.2, 0, Math.PI * 2); ctx.fill();
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6a5236'; ctx.lineWidth = 40; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = kind === 'mill' ? '#a9865a' : '#9a958a'; ctx.lineWidth = 32; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,210,0.25)'; ctx.lineWidth = 2; ctx.setLineDash([2, 10]); smooth(ctx, pts); ctx.stroke(); ctx.setLineDash([]);
  },
  bridge(ctx, at, a) { ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-40, -20, 100, 58); ctx.fillStyle = '#b5aa98'; ctx.fillRect(-48, -28, 96, 56); ctx.fillStyle = '#d9cfbc'; ctx.fillRect(-48, -34, 96, 9); ctx.fillRect(-48, 22, 96, 9); ctx.restore(); },
  tree(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + r * 0.9, y + r * 0.5, r * 1.1, r * 0.5, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.ellipse(x, y + 2, r * 0.6, r * 0.25, 0, 0, Math.PI * 2); ctx.fill(); // base
    // lichen-ball foliage
    for (let i = 0; i < 6; i++) { const a = i * 1.05; const bx = x + Math.cos(a) * r * 0.45, by = y - r * 0.9 + Math.sin(a) * r * 0.35; const g = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, r * 0.55); g.addColorStop(0, '#9cc25a'); g.addColorStop(1, '#3e6a2a'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r * 0.55, 0, Math.PI * 2); ctx.fill(); }
  },
  ley(ctx, edges, knots) {
    ctx.strokeStyle = 'rgba(60,40,20,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); for (const e of edges) line(ctx, e); ctx.setLineDash([]);
    for (const k of knots) { ctx.fillStyle = '#c8c0b0'; ctx.beginPath(); ctx.arc(k.x, k.y, 3.5, 0, Math.PI * 2); ctx.fill(); }
  },
  bound(ctx, path) {
    // a fine brass chain
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 6; line(ctx, path.map((p) => ({ x: p.x + 4, y: p.y + 5 })));
    ctx.strokeStyle = '#d8a83a'; ctx.lineWidth = 5; ctx.setLineDash([6, 3]); line(ctx, path); ctx.setLineDash([]);
  },
  trace(ctx, path) {
    // red string, slightly slack, pinned at each knot
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 4; line(ctx, path.map((p) => ({ x: p.x + 4, y: p.y + 6 })));
    ctx.strokeStyle = '#c0281e'; ctx.lineWidth = 5; line(ctx, path);
    ctx.strokeStyle = 'rgba(255,200,190,0.6)'; ctx.lineWidth = 1.4; line(ctx, path.map((p) => ({ x: p.x - 0.8, y: p.y - 0.8 })));
    for (let i = 0; i < path.length; i += 6) { const p = path[i]; ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c0281e'; ctx.beginPath(); ctx.arc(p.x - 0.8, p.y - 0.8, 2, 0, Math.PI * 2); ctx.fill(); }
  },
  fire(ctx, pts) {
    // translucent orange flame tokens
    pts.forEach((p, i) => { if (i % 2) return; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x + 5, p.y + 5, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); const g = ctx.createLinearGradient(p.x, p.y - 26, p.x, p.y + 4); g.addColorStop(0, 'rgba(255,220,120,0.95)'); g.addColorStop(1, 'rgba(230,80,20,0.85)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p.x - 9, p.y + 4); ctx.quadraticCurveTo(p.x - 8, p.y - 12, p.x, p.y - 26); ctx.quadraticCurveTo(p.x + 8, p.y - 12, p.x + 9, p.y + 4); ctx.closePath(); ctx.fill(); });
  },
  foundation(ctx, x, y) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 6, 30, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2a2622'; ctx.beginPath(); ctx.ellipse(x, y, 30, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#5a6a3a'; ctx.beginPath(); ctx.ellipse(x, y - 2, 27, 11, 0, 0, Math.PI * 2); ctx.fill(); },
  tower(ctx, type, x, y, mark) {
    const col = { bramble: '#6a7a4a', ember: '#9a4a32', bell: '#c8bca8', verdigris: '#4a9a88' }[type];
    ctx.save(); ctx.translate(30, 18); ctx.globalAlpha = 0.3; towerPath(ctx, type, x, y); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    towerPath(ctx, type, x, y);
    const g = ctx.createLinearGradient(x - 24, 0, x + 24, 0); g.addColorStop(0, shadeHex(col, 1.3)); g.addColorStop(0.5, col); g.addColorStop(1, shadeHex(col, 0.55));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,210,0.5)'; ctx.lineWidth = 1; ctx.stroke(); // dry-brushed edge highlight
    if (type === 'ember') { ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.arc(x, y - 9, 7, Math.PI, 0); ctx.lineTo(x + 7, y); ctx.lineTo(x - 7, y); ctx.fill(); }
    if (mark) { ctx.fillStyle = mark === 'bound' ? '#d8a83a' : '#c0281e'; ctx.beginPath(); ctx.arc(x + 20, y - 72, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.arc(x + 18, y - 74, 2, 0, Math.PI * 2); ctx.fill(); }
  },
  enemy(ctx, type, x, y, dir) {
    const s = type === 'cairn' ? 1 : 1.25;
    const rim = { levy: '#3a5aa8', bearer: '#a83a3a', hound: '#3a3a3a', cairn: '#7a5aa8' }[type];
    const br = type === 'cairn' ? 30 : type === 'hound' ? 16 : 10;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 6, br, br * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1a18'; ctx.beginPath(); ctx.ellipse(x, y + 2, br, br * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = 2.4; ctx.stroke();
    const col = { levy: '#3a5aa8', bearer: '#a83a3a', hound: '#2a2826', cairn: '#8a8880' }[type];
    enemyPath(ctx, type, x, y, dir, s);
    const g = ctx.createLinearGradient(x - 20, 0, x + 20, 0); g.addColorStop(0, shadeHex(col, 1.35)); g.addColorStop(1, shadeHex(col, 0.6));
    ctx.fillStyle = g; ctx.fill();
    if (type === 'levy') { ctx.fillStyle = '#f4f0e8'; ctx.fillRect(x + dir * 6 * s - (dir < 0 ? 8 : 0), y - 2, 8, 2.5); }
    if (type === 'hound') { ctx.fillStyle = '#c08a3a'; ctx.fillRect(x + dir * 11 * s - 1.5, y - 10, 3, 9); }
    if (type === 'cairn') cairnHollow(ctx, x, y, dir, s, '#141210');
  },
  castle(ctx, at) {
    const x = at.x, y = at.y;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 40, y - 100, 140, 260);
    const g = ctx.createLinearGradient(x - 66, 0, x + 64, 0); g.addColorStop(0, '#d8cfbe'); g.addColorStop(1, '#8a8274');
    ctx.fillStyle = g; ctx.fillRect(x - 66, y - 126, 130, 252);
    ctx.strokeStyle = 'rgba(60,50,40,0.4)'; for (let yy = y - 120; yy < y + 126; yy += 12) { ctx.beginPath(); ctx.moveTo(x - 66, yy); ctx.lineTo(x + 64, yy); ctx.stroke(); }
    ctx.fillStyle = '#5a4a8a'; for (const ty of [y - 126, y + 126]) { ctx.beginPath(); ctx.moveTo(x - 86, ty); ctx.lineTo(x - 58, ty - 50); ctx.lineTo(x - 30, ty); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#2a2018'; ctx.fillRect(x - 76, y - 20, 20, 40);
  },
  mill(ctx, at) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(at.x - 20, at.y, 90, 46); ctx.fillStyle = '#c8bca8'; ctx.fillRect(at.x - 38, at.y - 14, 76, 40); ctx.fillStyle = '#8a3a2a'; ctx.beginPath(); ctx.moveTo(at.x - 44, at.y - 14); ctx.lineTo(at.x, at.y - 52); ctx.lineTo(at.x + 44, at.y - 14); ctx.closePath(); ctx.fill(); },
  inkwell(ctx, at) {
    // a spool of red thread stands in for the inkwell
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(at.x + 10, at.y + 22, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8a878'; ctx.fillRect(at.x - 26, at.y - 24, 52, 8); ctx.fillRect(at.x - 26, at.y + 16, 52, 8);
    ctx.fillStyle = '#c0281e'; ctx.fillRect(at.x - 20, at.y - 16, 40, 32);
    ctx.strokeStyle = 'rgba(255,200,190,0.5)'; for (let yy = at.y - 14; yy < at.y + 16; yy += 3) { ctx.beginPath(); ctx.moveTo(at.x - 20, yy); ctx.lineTo(at.x + 20, yy); ctx.stroke(); }
  },
  pulse(ctx, at) {
    // a glass bead sliding along the string
    const g = ctx.createRadialGradient(at.x - 3, at.y - 3, 1, at.x, at.y, 11);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#ff6a5a'); g.addColorStop(1, '#8a1010');
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(at.x + 5, at.y + 7, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(at.x, at.y, 11, 0, Math.PI * 2); ctx.fill();
  },
  post(ctx) {
    // desk-lamp pool of light and a shallow depth of field
    const g = ctx.createRadialGradient(MAP_W * 0.45, MAP_H * 0.45, 120, MAP_W * 0.5, MAP_H * 0.5, 1000);
    g.addColorStop(0, 'rgba(255,230,180,0.12)'); g.addColorStop(1, 'rgba(30,20,10,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H);
    const d = ctx.createLinearGradient(0, 0, 0, MAP_H);
    d.addColorStop(0, 'rgba(200,190,170,0.25)'); d.addColorStop(0.18, 'rgba(200,190,170,0)'); d.addColorStop(0.85, 'rgba(200,190,170,0)'); d.addColorStop(1, 'rgba(200,190,170,0.25)');
    ctx.fillStyle = d; ctx.fillRect(0, 0, MAP_W, MAP_H);
  },
};

// ── 6. Neon arcane ──────────────────────────────────────────────────────────

const neon: Style = {
  id: 'neon',
  name: 'Neon arcane',
  blurb: 'Magic as circuitry: a dark field, glowing lanes, towers as luminous glyphs. Maximum clarity for a strategy game, at the cost of the folk-tale charm.',
  unity: 'Simple shapes, lines and particles with bloom post-processing. The fastest to build and to keep readable; little traditional art needed.',
  ground(ctx) {
    ctx.fillStyle = '#07060f'; ctx.fillRect(0, 0, MAP_W, MAP_H);
    ctx.strokeStyle = 'rgba(90,60,180,0.14)'; ctx.lineWidth = 1;
    for (let x = 0; x < MAP_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke(); }
    for (let y = 0; y < MAP_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }
  },
  water(ctx, river, pond) {
    glow(ctx, '#2a6aff', 16, () => { ctx.strokeStyle = 'rgba(40,110,255,0.7)'; ctx.lineWidth = 3; smooth(ctx, river, 80); ctx.stroke(); ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 90, 56, -0.15, 0, Math.PI * 2); ctx.stroke(); });
    ctx.fillStyle = 'rgba(30,60,160,0.25)'; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 90, 56, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,60,160,0.25)'; ctx.lineWidth = 30; smooth(ctx, river, 80); ctx.stroke();
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#120f22'; ctx.lineWidth = 38; smooth(ctx, pts); ctx.stroke();
    const col = kind === 'mill' ? '#ff3aa8' : '#ff8a3a';
    glow(ctx, col, 14, () => {
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      for (const off of [-17, 17]) {
        const sh = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const len = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: p.x - ((b.y - a.y) / len) * off, y: p.y + ((b.x - a.x) / len) * off }; });
        smooth(ctx, sh); ctx.stroke();
      }
    });
  },
  bridge(ctx, at, a) { ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15); glow(ctx, '#ff8a3a', 10, () => { ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = 2; ctx.strokeRect(-46, -26, 92, 52); }); ctx.restore(); },
  tree(ctx, x, y, r) { ctx.strokeStyle = 'rgba(60,220,140,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y - r * 1.5); ctx.lineTo(x + r * 0.6, y); ctx.lineTo(x - r * 0.6, y); ctx.closePath(); ctx.stroke(); },
  ley(ctx, edges, knots) {
    ctx.strokeStyle = 'rgba(60,200,255,0.3)'; ctx.lineWidth = 1.5; for (const e of edges) line(ctx, e);
    ctx.fillStyle = 'rgba(60,200,255,0.6)'; for (const k of knots) ctx.fillRect(k.x - 3, k.y - 3, 6, 6);
  },
  bound(ctx, path) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, '#ffcc33', 22, () => { ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 5; line(ctx, path); }); ctx.globalCompositeOperation = 'source-over'; },
  trace(ctx, path) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, '#3affff', 24, () => { ctx.strokeStyle = '#3affff'; ctx.lineWidth = 4; line(ctx, path); }); ctx.strokeStyle = '#e8ffff'; ctx.lineWidth = 1.5; line(ctx, path); ctx.globalCompositeOperation = 'source-over'; },
  fire(ctx, pts) { ctx.globalCompositeOperation = 'lighter'; for (const p of pts) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 24); g.addColorStop(0, 'rgba(255,120,40,0.45)'); g.addColorStop(1, 'rgba(255,60,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, Math.PI * 2); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; },
  foundation(ctx, x, y) { ctx.strokeStyle = 'rgba(60,200,255,0.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); },
  tower(ctx, type, x, y, mark) {
    const col = { bramble: '#5aff7a', ember: '#ff7a3a', bell: '#c8a0ff', verdigris: '#3affd0' }[type];
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, col, 18, () => {
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath();
      const cy = y - 28;
      if (type === 'bramble') { for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3; ctx.lineTo(x + Math.cos(a) * 24, cy + Math.sin(a) * 24); } ctx.closePath(); }
      else if (type === 'ember') ctx.arc(x, cy, 20, 0, Math.PI * 2);
      else if (type === 'bell') { ctx.moveTo(x, cy - 26); ctx.lineTo(x + 20, cy); ctx.lineTo(x, cy + 26); ctx.lineTo(x - 20, cy); ctx.closePath(); }
      else { for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; ctx.lineTo(x + Math.cos(a) * 22, cy + Math.sin(a) * 22); } ctx.closePath(); }
      ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, cy, 4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    marker(ctx, x + 24, y - 60, mark, '#3affff', '#ffcc33');
  },
  enemy(ctx, type, x, y, dir) {
    const col = { levy: '#ff3a6a', bearer: '#ffcc33', hound: '#ff3aff', cairn: '#ff4a3a' }[type];
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, col, 12, () => {
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2;
      if (type === 'levy') ctx.fillRect(x - 5, y - 13, 10, 10);
      else if (type === 'bearer') { ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 9, y - 6); ctx.lineTo(x - 9, y - 6); ctx.closePath(); ctx.fill(); }
      else if (type === 'hound') { ctx.beginPath(); ctx.moveTo(x + dir * 14, y - 6); ctx.lineTo(x - dir * 10, y - 13); ctx.lineTo(x - dir * 5, y - 6); ctx.lineTo(x - dir * 10, y + 1); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; ctx.lineTo(x + Math.cos(a) * 30, y - 30 + Math.sin(a) * 30); } ctx.closePath(); ctx.lineWidth = 4; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#07060f'; ctx.beginPath(); ctx.arc(x, y - 30, 10, 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.globalCompositeOperation = 'source-over';
  },
  castle(ctx, at) { glow(ctx, '#3affff', 18, () => { ctx.strokeStyle = '#3affff'; ctx.lineWidth = 3; ctx.strokeRect(at.x - 66, at.y - 126, 130, 252); ctx.strokeRect(at.x - 40, at.y - 70, 78, 140); ctx.beginPath(); ctx.arc(at.x - 58, at.y - 126, 24, 0, Math.PI * 2); ctx.arc(at.x - 58, at.y + 126, 24, 0, Math.PI * 2); ctx.stroke(); }); },
  mill(ctx, at) { glow(ctx, '#c8a0ff', 10, () => { ctx.strokeStyle = 'rgba(200,160,255,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(at.x - 38, at.y - 14, 76, 40); ctx.beginPath(); ctx.arc(at.x - 50, at.y + 10, 20, 0, Math.PI * 2); ctx.stroke(); }); },
  inkwell(ctx, at) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, '#3affff', 30, () => { ctx.strokeStyle = '#3affff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(at.x, at.y, 26, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(at.x, at.y, 12, 0, Math.PI * 2); ctx.stroke(); }); ctx.globalCompositeOperation = 'source-over'; },
  pulse(ctx, at, trail) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(160,255,255,0.8)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; line(ctx, [trail, at]); glow(ctx, '#ffffff', 24, () => { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(at.x, at.y, 8, 0, Math.PI * 2); ctx.fill(); }); ctx.globalCompositeOperation = 'source-over'; },
  post(ctx) { vignette(ctx, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'); },
};

// ── 7. Candlelit tabletop: miniatures under dark-fantasy lighting ───────────

interface Light { x: number; y: number; r: number; color: string; strength: number }
let lights: Light[] = [];
let emissive: (() => void)[] = [];
const addLight = (x: number, y: number, r: number, color: string, strength = 1) => lights.push({ x, y, r, color, strength });

const candlelit: Style = {
  id: 'candlelit',
  name: 'Candlelit tabletop',
  featured: 'tabletop miniatures + dark-fantasy lighting',
  blurb: 'The miniatures board at night. Moonlight falls cold across the table, a candle burns at the edge, and every source of magic lights the models around it: lanterns in the towers, fire on the road, the enchanted thread itself.',
  unity: '3D miniatures with URP lighting: a dim blue moon, one candle, and real point lights on towers, threads, fire and pulses, plus bloom and a little depth of field. Most of the work is in the models and lighting; the mechanics carry over unchanged.',
  ground(ctx, R) { lights = []; emissive = []; tabletop.ground(ctx, R); },
  water(ctx, river, pond) { tabletop.water(ctx, river, pond); addLight(pond.x - 30, pond.y - 20, 60, 'rgba(150,180,230,', 0.35); },
  road: (ctx, pts, kind) => tabletop.road(ctx, pts, kind),
  bridge: (ctx, at, a) => tabletop.bridge(ctx, at, a),
  tree: (ctx, x, y, r, k) => tabletop.tree(ctx, x, y, r, k),
  ley: (ctx, edges, knots) => tabletop.ley(ctx, edges, knots),
  bound(ctx, path) {
    tabletop.bound(ctx, path);
    for (let i = 0; i < path.length; i += 8) addLight(path[i].x, path[i].y, 55, 'rgba(255,190,80,', 0.55);
    emissive.push(() => glow(ctx, 'rgba(255,190,70,1)', 18, () => { ctx.strokeStyle = 'rgba(255,200,90,0.85)'; ctx.lineWidth = 4; ctx.setLineDash([6, 3]); line(ctx, path); ctx.setLineDash([]); }));
  },
  trace(ctx, path) {
    // the red string is enchanted: it glows violet where it runs
    tabletop.trace(ctx, path);
    for (let i = 0; i < path.length; i += 6) addLight(path[i].x, path[i].y, 60, 'rgba(170,110,255,', 0.6);
    emissive.push(() => {
      glow(ctx, 'rgba(170,110,255,1)', 22, () => { ctx.strokeStyle = 'rgba(190,140,255,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; line(ctx, path); });
      ctx.strokeStyle = 'rgba(255,220,230,0.9)'; ctx.lineWidth = 1.4; line(ctx, path);
    });
  },
  fire(ctx, pts) {
    tabletop.fire(ctx, pts);
    pts.forEach((p, i) => { if (i % 3 === 0) addLight(p.x, p.y - 8, 90, 'rgba(255,140,50,', 0.9); });
    emissive.push(() => pts.forEach((p, i) => { if (i % 2) return; glow(ctx, 'rgba(255,150,40,1)', 16, () => { ctx.fillStyle = 'rgba(255,210,120,0.9)'; ctx.beginPath(); ctx.moveTo(p.x - 5, p.y + 2); ctx.quadraticCurveTo(p.x - 4, p.y - 10, p.x, p.y - 20); ctx.quadraticCurveTo(p.x + 4, p.y - 10, p.x + 5, p.y + 2); ctx.closePath(); ctx.fill(); }); }));
  },
  foundation: (ctx, x, y) => tabletop.foundation(ctx, x, y),
  tower(ctx, type, x, y, mark) {
    tabletop.tower(ctx, type, x, y, null);
    const col = type === 'verdigris' ? 'rgba(90,255,200,' : type === 'bramble' ? 'rgba(160,255,120,' : 'rgba(255,170,70,';
    addLight(x, y - 30, type === 'ember' ? 150 : 110, col, type === 'ember' ? 1 : 0.75);
    emissive.push(() => {
      const wy = type === 'ember' ? y - 9 : type === 'bell' ? y - 38 : type === 'verdigris' ? y - 44 : y - 30;
      glow(ctx, col + '1)', 14, () => { ctx.fillStyle = col + '0.95)'; ctx.beginPath(); ctx.arc(x, wy, type === 'ember' ? 6 : 3.5, 0, Math.PI * 2); ctx.fill(); });
      if (mark) {
        const c = mark === 'bound' ? 'rgba(255,200,90,' : 'rgba(190,140,255,';
        glow(ctx, c + '1)', 14, () => { ctx.fillStyle = c + '1)'; ctx.beginPath(); ctx.arc(x + 20, y - 72, 6, 0, Math.PI * 2); ctx.fill(); });
      }
    });
    if (mark) addLight(x + 20, y - 72, 40, mark === 'bound' ? 'rgba(255,200,90,' : 'rgba(190,140,255,', 0.7);
  },
  enemy(ctx, type, x, y, dir) {
    tabletop.enemy(ctx, type, x, y, dir);
    const s = type === 'cairn' ? 1 : 1.25;
    emissive.push(() => {
      const eye: [number, number, string] = type === 'hound' ? [x + dir * 18 * s, y - 7 * s, '#9cff7a'] : type === 'cairn' ? [x + dir * 3, y - 66, '#ff9a3a'] : [x + dir * 2 * s, y - 15 * s, '#ff6a4a'];
      glow(ctx, eye[2], 8, () => { ctx.fillStyle = eye[2]; ctx.beginPath(); ctx.arc(eye[0], eye[1], type === 'cairn' ? 2.6 : 1.6, 0, Math.PI * 2); ctx.fill(); });
      if (type === 'cairn') {
        const g = ctx.createRadialGradient(x, y - 37, 0, x, y - 37, 7);
        g.addColorStop(0, 'rgba(255,140,50,0.7)'); g.addColorStop(1, 'rgba(255,140,50,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 37, 7, 0, Math.PI * 2); ctx.fill();
      }
    });
    if (type === 'bearer') { addLight(x, y - 30, 50, 'rgba(255,210,110,', 0.8); emissive.push(() => glow(ctx, '#ffd35c', 14, () => { ctx.fillStyle = 'rgba(255,215,120,0.9)'; ctx.beginPath(); ctx.arc(x, y - 30, 3, 0, Math.PI * 2); ctx.fill(); })); }
  },
  castle(ctx, at) {
    tabletop.castle(ctx, at);
    for (const [wx, wy] of [[at.x - 20, at.y - 60], [at.x + 20, at.y - 20], [at.x - 10, at.y + 40], [at.x + 30, at.y + 80], [at.x - 66, at.y]]) {
      addLight(wx, wy, 70, 'rgba(255,170,70,', 0.8);
      emissive.push(() => glow(ctx, '#ffb040', 10, () => { ctx.fillStyle = 'rgba(255,200,110,0.95)'; ctx.fillRect(wx - 3, wy - 5, 6, 9); }));
    }
  },
  mill(ctx, at) { tabletop.mill(ctx, at); addLight(at.x + 16, at.y, 50, 'rgba(255,170,70,', 0.7); emissive.push(() => { ctx.fillStyle = 'rgba(255,200,110,0.95)'; ctx.fillRect(at.x + 12, at.y - 4, 7, 8); }); },
  inkwell(ctx, at) {
    tabletop.inkwell(ctx, at);
    addLight(at.x, at.y, 170, 'rgba(170,110,255,', 0.9);
    emissive.push(() => glow(ctx, 'rgba(170,110,255,1)', 30, () => { ctx.fillStyle = 'rgba(210,170,255,0.45)'; ctx.beginPath(); ctx.arc(at.x, at.y, 22, 0, Math.PI * 2); ctx.fill(); }));
  },
  pulse(ctx, at, trail) {
    addLight(at.x, at.y, 130, 'rgba(220,180,255,', 1);
    emissive.push(() => {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(200,150,255,0.7)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; line(ctx, [trail, at]);
      ctx.globalCompositeOperation = 'source-over';
      tabletop.pulse(ctx, at, trail);
      glow(ctx, 'rgba(200,150,255,1)', 26, () => { ctx.fillStyle = 'rgba(255,235,255,0.85)'; ctx.beginPath(); ctx.arc(at.x - 2, at.y - 2, 5, 0, Math.PI * 2); ctx.fill(); });
    });
  },
  post(ctx) {
    // Light map: cold moonlit ambient + a candle at the table edge + every recorded light.
    const lm = document.createElement('canvas');
    lm.width = MAP_W; lm.height = MAP_H;
    const l = lm.getContext('2d')!;
    l.fillStyle = 'rgb(46,54,84)'; l.fillRect(0, 0, MAP_W, MAP_H);
    l.globalCompositeOperation = 'lighter';
    const pool = (x: number, y: number, r: number, color: string, a: number) => {
      const g = l.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color + a + ')'); g.addColorStop(1, color + '0)');
      l.fillStyle = g; l.beginPath(); l.arc(x, y, r, 0, Math.PI * 2); l.fill();
    };
    pool(1300, 60, 900, 'rgba(70,90,140,', 0.55); // moon through a window
    pool(70, MAP_H - 70, 760, 'rgba(255,160,70,', 0.85); // the candle at the board's edge
    pool(70, MAP_H - 70, 260, 'rgba(255,190,110,', 0.6);
    for (const li of lights) pool(li.x, li.y, li.r, li.color, li.strength);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lm, 0, 0);
    ctx.restore();
    // emissive bits sit on top, unaffected by shadow
    for (const e of emissive) e();
    vignette(ctx, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 420, 1000);
    // the candle itself, standing on the board's corner
    const cx = 70, cy = MAP_H - 70;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(cx + 26, cy + 18, 34, 10, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.ellipse(cx, cy + 10, 30, 11, 0, 0, Math.PI * 2); ctx.fill(); // brass dish (in shadow)
    ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.ellipse(cx, cy + 8, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
    const wax = ctx.createLinearGradient(cx - 12, 0, cx + 12, 0); wax.addColorStop(0, '#fff3d6'); wax.addColorStop(1, '#c8a878');
    ctx.fillStyle = wax; ctx.fillRect(cx - 12, cy - 46, 24, 54);
    ctx.beginPath(); ctx.ellipse(cx, cy - 46, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,210,0.8)'; ctx.beginPath(); ctx.ellipse(cx - 7, cy - 30, 2, 9, 0, 0, Math.PI * 2); ctx.fill(); // drip
    ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy - 48); ctx.lineTo(cx, cy - 54); ctx.stroke();
    const cg = ctx.createRadialGradient(cx, cy - 64, 0, cx, cy - 64, 90);
    cg.addColorStop(0, 'rgba(255,240,190,0.95)'); cg.addColorStop(0.15, 'rgba(255,190,90,0.55)'); cg.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy - 64, 90, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff4cc'; ctx.beginPath(); ctx.moveTo(cx - 4, cy - 54); ctx.quadraticCurveTo(cx - 3, cy - 68, cx, cy - 76); ctx.quadraticCurveTo(cx + 3, cy - 68, cx + 4, cy - 54); ctx.closePath(); ctx.fill();
    // shallow depth of field and a dark table edge
    const d = ctx.createLinearGradient(0, 0, 0, MAP_H);
    d.addColorStop(0, 'rgba(10,12,22,0.45)'); d.addColorStop(0.16, 'rgba(10,12,22,0)'); d.addColorStop(0.86, 'rgba(10,12,22,0)'); d.addColorStop(1, 'rgba(10,12,22,0.35)');
    ctx.fillStyle = d; ctx.fillRect(0, 0, MAP_W, MAP_H);
  },
};

anatomy.featured = 'new: the medical setting as an anatomy atlas';
anim3d.featured = 'animated 3D feature';
mangaMedical.featured = 'coloured manga, medical';
mangaTokyo.featured = 'coloured manga, modern Tokyo';
mangaAncient.featured = 'coloured manga, ancient Japan';
anime.featured = 'pastoral anime study';
vanGogh.featured = 'Van Gogh study';
renaissance.featured = 'Renaissance study';
export const STYLES: Style[] = [inkSurreal, anatomy, anim3d, mangaMedical, mangaTokyo, mangaAncient, anime, vanGogh, renaissance, candlelit, lowPoly, darkFantasy, pixel, stainedGlass, tabletop, neon];
