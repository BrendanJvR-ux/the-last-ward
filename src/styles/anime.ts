// 10. Pastoral anime: hand-painted gouache backgrounds with clean, cel-shaded figures.
// Lush meadows, towering cumulus, clear water, red-roofed hill town, spirit-light magic.
import type { EnemyType, FieldTowerType as TowerType } from '../balance';
import { MAP_W, MAP_H, line, smooth, rng, type Style, type Vec } from './scene';
import { towerPath, enemyPath } from './shapes';

const A = {
  meadow: '#7cbf4a', meadowLight: '#b6e06a', meadowDark: '#3f8a3a', deep: '#245a34',
  path: '#e8d3a2', pathDark: '#c4a874', stone: '#d8d2c2', stoneDark: '#9a9486',
  water: '#4fc0d0', waterDeep: '#1f78a8', waterLight: '#bdf0f0',
  sky: '#6fb6ee', skyLight: '#cfe9fb', cloud: '#ffffff', cloudShade: '#c8d8ec',
  roof: '#d0523a', roofDark: '#8a2e22', roofLight: '#f08a62', wall: '#f6ead2', wallShade: '#d6c4a2',
  line: '#4a3424', glow: '#9ff6ff', gold: '#ffd25a', goldDeep: '#e09a2a',
  ivy: '#4f9a3a', flower: ['#ffffff', '#ffd84a', '#ff8ab0', '#b49aff', '#ff6a4a'],
};
const R0 = rng(2024);
const pick = <T,>(a: T[], R: () => number) => a[Math.floor(R() * a.length)];

/** Cel shading: base fill, a shadow band on the right, a rim highlight on the left, a soft brown line. */
function cel(ctx: CanvasRenderingContext2D, build: () => void, cx: number, base: string, shade: string, light: string, outline = A.line, lw = 1.8) {
  ctx.save(); build(); ctx.fillStyle = base; ctx.fill(); ctx.clip();
  ctx.fillStyle = shade; ctx.globalAlpha = 0.85; ctx.fillRect(cx + 2, -9999, 20000, 20000);
  ctx.restore();
  ctx.save(); build(); ctx.clip(); ctx.strokeStyle = light; ctx.lineWidth = 3; ctx.globalAlpha = 0.6; ctx.translate(-1.5, -1.5); build(); ctx.stroke(); ctx.restore();
  ctx.save(); build(); ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
}

function softShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.28) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(30,60,90,${a})`); g.addColorStop(1, 'rgba(30,60,90,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col = '#ffffff') {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
}

/** A lush deciduous tree: dark base mass, mid clumps, sunlit clusters top-left, scalloped edges. */
function bigTree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, R: () => number) {
  softShadow(ctx, x + r * 0.6, y + r * 0.3, r * 1.5, r * 0.55, 0.35);
  ctx.strokeStyle = '#6a4a2e'; ctx.lineWidth = Math.max(2, r * 0.22); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x - 2, y - r * 0.4, x + 1, y - r * 0.7); ctx.stroke();
  const cy = y - r * 1.05;
  const clump = (cx: number, cy2: number, rr: number, col: string) => {
    ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; ctx.arc(cx + Math.cos(a) * rr * 0.6, cy2 + Math.sin(a) * rr * 0.5, rr * 0.48, 0, Math.PI * 2); }
    ctx.fill();
  };
  clump(x + r * 0.1, cy + r * 0.15, r * 1.05, A.deep);
  for (let i = 0; i < 4; i++) clump(x - r * 0.35 + R() * r * 0.6, cy - r * 0.2 + R() * r * 0.4, r * 0.55, A.meadowDark);
  for (let i = 0; i < 3; i++) clump(x - r * 0.45 + R() * r * 0.4, cy - r * 0.45 + R() * r * 0.25, r * 0.32, A.meadow);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = A.meadowLight; ctx.beginPath(); ctx.ellipse(x - r * 0.5 + R() * r * 0.5, cy - r * 0.55 + R() * r * 0.3, r * 0.12, r * 0.08, -0.5, 0, Math.PI * 2); ctx.fill(); }
}

function tower(ctx: CanvasRenderingContext2D, type: TowerType, x: number, y: number, mark: 'traced' | 'bound' | null) {
  softShadow(ctx, x + 18, y + 4, 40, 12, 0.35);
  const cols: Record<TowerType, [string, string, string]> = {
    bramble: ['#d8cfb8', '#a89e86', '#fffaf0'],
    ember: ['#d8743e', '#9a4424', '#ffb07a'],
    bell: ['#f6ead2', '#cdb894', '#ffffff'],
    verdigris: ['#5ec4aa', '#2e8a78', '#bff4e4'],
  };
  const [b, s, l] = cols[type];
  cel(ctx, () => towerPath(ctx, type, x, y, 1.05), x, b, s, l);
  if (type === 'bramble') {
    for (let i = 0; i < 18; i++) { const ly = y - 4 - R0() * 60, lx = x - 13 + R0() * 26; ctx.fillStyle = i % 3 ? A.ivy : '#6fbf4a'; ctx.beginPath(); ctx.ellipse(lx, ly, 4, 3, R0() * 3, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 7; i++) { ctx.fillStyle = pick(A.flower, R0); ctx.beginPath(); ctx.arc(x - 12 + R0() * 24, y - 6 - R0() * 56, 2, 0, Math.PI * 2); ctx.fill(); }
  }
  if (type === 'ember') {
    const g = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, 28);
    g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(0.3, 'rgba(255,170,60,0.8)'); g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 10, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 4 + i * 3, y - 72 - i * 10, 6 + i * 3, 0, Math.PI * 2); ctx.fill(); }
  }
  if (type === 'bell') {
    // a red pointed roof and a clock face
    cel(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 15, y - 56); ctx.lineTo(x, y - 96); ctx.lineTo(x + 15, y - 56); ctx.closePath(); }, x, A.roof, A.roofDark, A.roofLight);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y - 30, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = A.line; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x, y - 34); ctx.moveTo(x, y - 30); ctx.lineTo(x + 3, y - 29); ctx.stroke();
    ctx.fillStyle = '#c86a9a'; ctx.fillRect(x - 9, y - 14, 18, 4); // flower box
    for (let i = 0; i < 5; i++) { ctx.fillStyle = pick(A.flower, R0); ctx.beginPath(); ctx.arc(x - 7 + i * 3.5, y - 15, 1.8, 0, Math.PI * 2); ctx.fill(); }
  }
  if (type === 'verdigris') {
    ctx.strokeStyle = A.waterLight; ctx.lineWidth = 1.6;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y - 50); ctx.quadraticCurveTo(x + d * 14, y - 70, x + d * 22, y - 46); ctx.stroke(); }
    for (let i = 0; i < 4; i++) sparkle(ctx, x - 16 + i * 10, y - 56 - (i % 2) * 8, 3);
  }
  if (mark === 'traced') { const g = ctx.createRadialGradient(x + 22, y - 76, 0, x + 22, y - 76, 14); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(160,250,255,0.9)'); g.addColorStop(1, 'rgba(160,250,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 22, y - 76, 14, 0, Math.PI * 2); ctx.fill(); }
  if (mark === 'bound') { const g = ctx.createRadialGradient(x + 22, y - 76, 0, x + 22, y - 76, 15); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.4, 'rgba(255,210,90,0.95)'); g.addColorStop(1, 'rgba(255,190,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 22, y - 76, 15, 0, Math.PI * 2); ctx.fill(); sparkle(ctx, x + 22, y - 76, 6); }
}

function enemy(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number) {
  const s = type === 'cairn' ? 1.05 : 1.3;
  softShadow(ctx, x + 4, y + 7, type === 'cairn' ? 40 : 14, type === 'cairn' ? 12 : 4, 0.35);
  const cols: Record<EnemyType, [string, string, string]> = {
    levy: ['#5a7ac0', '#34508a', '#9ab8f0'],
    bearer: ['#d0523a', '#8a2e22', '#ff9a7a'],
    hound: ['#3a3450', '#1e1a2e', '#6a6488'],
    cairn: ['#a8a496', '#74705f', '#d8d4c4'],
  };
  const [b, sh, l] = cols[type];
  cel(ctx, () => enemyPath(ctx, type, x, y, dir, s), x, b, sh, l, type === 'hound' ? '#14101e' : A.line, 1.6);
  if (type === 'levy') {
    const sx = x + (dir > 0 ? 7 : -16);
    cel(ctx, () => { ctx.beginPath(); ctx.roundRect(sx, y - 15, 9, 21, 3); }, sx + 4, '#e8cf7a', '#b89a4a', '#fff4c0', A.line, 1.2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 1, y - 2, 7, 2.6);
    ctx.fillStyle = '#f4d0b0'; ctx.beginPath(); ctx.arc(x + dir * 1.5, y - 19.5, 3.2, 0, Math.PI * 2); ctx.fill();
  }
  if (type === 'hound') {
    ctx.fillStyle = '#e0a040'; ctx.fillRect(x + dir * 14 - 2, y - 11, 4, 9);
    ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(x + dir * 22, y - 9, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,110,160,0.35)'; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(x - dir * (16 + i * 7), y - 4, 5 - i, 0, Math.PI * 2); ctx.fill(); }
  }
  if (type === 'bearer') {
    const g = ctx.createRadialGradient(x, y - 44, 0, x, y - 44, 18);
    g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 44, 18, 0, Math.PI * 2); ctx.fill();
    sparkle(ctx, x, y - 60, 5, '#fff4c0');
  }
  if (type === 'cairn') {
    // moss, small flowers on the shoulders, and the empty hollow in its chest
    ctx.fillStyle = '#6fae4a'; for (const [mx, my, rx] of [[-22, -54, 9], [16, -58, 8], [-4, -76, 7], [22, -30, 6]]) { ctx.beginPath(); ctx.ellipse(x + mx * dir, y + my, rx, rx * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = pick(A.flower, R0); ctx.beginPath(); ctx.arc(x + (-26 + R0() * 50) * dir, y - 50 - R0() * 26, 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#1a1820'; ctx.beginPath(); ctx.moveTo(x - 8, y - 32); ctx.lineTo(x - 7, y - 47); ctx.quadraticCurveTo(x, y - 52, x + 7, y - 47); ctx.lineTo(x + 8, y - 32); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(x + dir * 3, y - 70, 1.8, 0, Math.PI * 2); ctx.fill();
  }
}

export const anime: Style = {
  id: 'anime',
  name: 'Pastoral anime',
  blurb: 'In the spirit of hand-painted Japanese animation backgrounds: gouache meadows rippling in the wind, big layered trees, towering cumulus, clear turquoise water, a cream-and-red hill town, and clean cel-shaded figures. Magic is gentle spirit-light, with sparkles drifting along the threads.',
  unity: '2D: hand-painted background layers plus cel-shaded sprites (or 3D with a toon shader and painted skies). Warm and inviting; the painted backgrounds are the big art cost, but they are drawn once per map.',
  ground(ctx, R) {
    const g = ctx.createLinearGradient(0, 0, MAP_W, MAP_H);
    g.addColorStop(0, '#9ad45a'); g.addColorStop(0.5, A.meadow); g.addColorStop(1, '#4f9a3e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // broad soft patches of light and shade
    for (let i = 0; i < 26; i++) {
      const x = R() * MAP_W, y = R() * MAP_H, r = 120 + R() * 220;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
      const light = R() < 0.5;
      gg.addColorStop(0, light ? 'rgba(220,250,140,0.35)' : 'rgba(40,110,60,0.3)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // wind-swept grass: sweeping lighter strokes
    ctx.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const x = R() * MAP_W, y = R() * MAP_H, l = 40 + R() * 80;
      ctx.strokeStyle = `rgba(230,255,170,${0.15 + R() * 0.15})`; ctx.lineWidth = 2 + R() * 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l * 0.5, y - 10, x + l, y + 4); ctx.stroke();
    }
    // grass blades in tufts
    for (let i = 0; i < 2600; i++) {
      const x = R() * MAP_W, y = R() * MAP_H;
      ctx.strokeStyle = pick(['rgba(60,130,50,0.55)', 'rgba(150,210,90,0.6)', 'rgba(40,100,45,0.5)'], R); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1, y - 4, x + 3, y - 8); ctx.moveTo(x + 2, y); ctx.quadraticCurveTo(x + 2, y - 4, x + 1, y - 7); ctx.stroke();
    }
    // wildflowers
    for (let i = 0; i < 900; i++) { ctx.fillStyle = pick(A.flower, R); ctx.beginPath(); ctx.arc(R() * MAP_W, R() * MAP_H, 1.3 + R() * 1.4, 0, Math.PI * 2); ctx.fill(); }
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#d8c89a'; ctx.lineWidth = 42; smooth(ctx, river, 80); ctx.stroke(); // sandy banks
    ctx.strokeStyle = A.waterDeep; ctx.lineWidth = 34; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = A.water; ctx.lineWidth = 22; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,250,250,0.6)'; ctx.lineWidth = 3; ctx.setLineDash([18, 22]); smooth(ctx, river, 80); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#d8c89a'; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 98, 64, -0.15, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(pond.x - 20, pond.y - 18, 4, pond.x, pond.y, 92);
    g.addColorStop(0, A.waterLight); g.addColorStop(0.45, A.water); g.addColorStop(1, A.waterDeep);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 90, 56, -0.15, 0, Math.PI * 2); ctx.fill();
    // reflected clouds and sparkles
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(pond.x - 26, pond.y - 18, 30, 9, -0.15, 0, Math.PI * 2); ctx.ellipse(pond.x + 10, pond.y - 22, 20, 7, -0.15, 0, Math.PI * 2); ctx.fill();
    const R = rng(8);
    for (let i = 0; i < 10; i++) sparkle(ctx, pond.x - 70 + R() * 140, pond.y - 40 + R() * 80, 2.5 + R() * 2.5);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#5aae4a'; const a = R() * 6.28; ctx.beginPath(); ctx.ellipse(pond.x + Math.cos(a) * 64, pond.y + Math.sin(a) * 38, 6, 3.5, a, 0.3, Math.PI * 2); ctx.lineTo(pond.x + Math.cos(a) * 64, pond.y + Math.sin(a) * 38); ctx.fill(); }
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(80,120,50,0.5)'; ctx.lineWidth = 44; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = kind === 'mill' ? A.pathDark : A.stoneDark; ctx.lineWidth = 36; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = kind === 'mill' ? A.path : A.stone; ctx.lineWidth = 30; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,240,0.5)'; ctx.lineWidth = 8; smooth(ctx, pts.map((p) => ({ x: p.x - 4, y: p.y - 4 }))); ctx.stroke();
    if (kind === 'king') { ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(120,110,95,0.4)'; ctx.setLineDash([1.5, 11]); ctx.lineWidth = 28; smooth(ctx, pts); ctx.stroke(); ctx.restore(); }
    // grass creeping in at the verges
    const R = rng(kind === 'mill' ? 4 : 5);
    for (let i = 1; i < pts.length; i++) for (let t = 0; t < 1; t += 0.03) {
      const a = pts[i - 1], b = pts[i], ang = Math.atan2(b.y - a.y, b.x - a.x), side = R() < 0.5 ? -1 : 1;
      const x = a.x + (b.x - a.x) * t - Math.sin(ang) * 16 * side, y = a.y + (b.y - a.y) * t + Math.cos(ang) * 16 * side;
      ctx.strokeStyle = '#5aa84a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y - 6); ctx.moveTo(x + 2, y); ctx.lineTo(x + 4, y - 5); ctx.stroke();
    }
  },
  bridge(ctx, at, a) {
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15);
    softShadow(ctx, 10, 26, 60, 16, 0.4);
    cel(ctx, () => { ctx.beginPath(); ctx.roundRect(-48, -28, 96, 56, 6); }, 0, A.stone, A.stoneDark, '#ffffff');
    for (const yy of [-30, 22]) cel(ctx, () => { ctx.beginPath(); ctx.roundRect(-50, yy, 100, 8, 3); }, 0, '#e8e2d2', A.stoneDark, '#ffffff', A.line, 1.2);
    ctx.fillStyle = '#5aa84a'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(-40 + i * 16, -24 + (i % 2) * 48, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); } // moss
    ctx.restore();
  },
  tree(ctx, x, y, r, k) {
    if (k > 0.8) {
      // tall dark cedar
      softShadow(ctx, x + r * 0.6, y + 3, r * 1.2, r * 0.4, 0.35);
      for (let i = 0; i < 4; i++) {
        const w = r * (0.9 - i * 0.18), yy = y - r * 0.5 - i * r * 0.55;
        ctx.fillStyle = i % 2 ? A.deep : '#1e4a2e'; ctx.beginPath(); ctx.moveTo(x - w, yy + r * 0.3); ctx.quadraticCurveTo(x, yy - r * 0.6, x + w, yy + r * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(160,220,120,0.6)'; ctx.beginPath(); ctx.ellipse(x - w * 0.4, yy, w * 0.3, r * 0.08, -0.3, 0, Math.PI * 2); ctx.fill();
      }
    } else bigTree(ctx, x, y, r * 1.05, R0);
  },
  ley(ctx, edges, knots) {
    ctx.strokeStyle = 'rgba(255,255,240,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
    for (const e of edges) line(ctx, e);
    ctx.setLineDash([]);
    for (const k of knots) { ctx.fillStyle = 'rgba(255,255,240,0.8)'; ctx.beginPath(); ctx.arc(k.x, k.y, 3, 0, Math.PI * 2); ctx.fill(); }
  },
  bound(ctx, path) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,210,90,0.95)'; ctx.shadowBlur = 18;
    ctx.strokeStyle = A.goldDeep; ctx.lineWidth = 9; line(ctx, path);
    ctx.shadowBlur = 0; ctx.strokeStyle = A.gold; ctx.lineWidth = 5; line(ctx, path);
    ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 1.6; line(ctx, path);
    ctx.restore();
    // golden leaves drifting along it
    for (let i = 5; i < path.length; i += 9) { ctx.fillStyle = A.gold; ctx.beginPath(); ctx.ellipse(path[i].x + 8, path[i].y - 8, 4.5, 2, 0.8, 0, Math.PI * 2); ctx.fill(); sparkle(ctx, path[i].x - 6, path[i].y + 6, 3, '#fff6d0'); }
  },
  trace(ctx, path) {
    // spirit light: a soft glowing ribbon with motes drifting off it
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(140,250,255,1)'; ctx.shadowBlur = 22;
    ctx.strokeStyle = 'rgba(120,230,240,0.7)'; ctx.lineWidth = 9; line(ctx, path);
    ctx.shadowBlur = 0; ctx.strokeStyle = A.glow; ctx.lineWidth = 4; line(ctx, path);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; line(ctx, path);
    ctx.restore();
    const R = rng(path.length * 17);
    for (let i = 0; i < path.length; i += 3) {
      const p = path[i], ox = (R() - 0.5) * 28, oy = (R() - 0.5) * 28 - 6;
      const g = ctx.createRadialGradient(p.x + ox, p.y + oy, 0, p.x + ox, p.y + oy, 6);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(160,250,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x + ox, p.y + oy, 6, 0, Math.PI * 2); ctx.fill();
    }
  },
  fire(ctx, pts) {
    for (const p of pts) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26); g.addColorStop(0, 'rgba(255,200,90,0.4)'); g.addColorStop(1, 'rgba(255,140,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.fill(); }
    pts.forEach((p, i) => {
      if (i % 2) return;
      const f = (sc: number, col: string) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p.x - 8 * sc, p.y + 3); ctx.bezierCurveTo(p.x - 10 * sc, p.y - 10 * sc, p.x - 2, p.y - 14 * sc, p.x + 2, p.y - 26 * sc); ctx.bezierCurveTo(p.x + 4, p.y - 14 * sc, p.x + 10 * sc, p.y - 8 * sc, p.x + 8 * sc, p.y + 3); ctx.closePath(); ctx.fill(); };
      f(1, '#e8502a'); f(0.7, '#ffa030'); f(0.4, '#fff0a0');
    });
  },
  foundation(ctx, x, y) {
    softShadow(ctx, x + 4, y + 4, 32, 12, 0.3);
    cel(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, 30, 13, 0, 0, Math.PI * 2); }, x, A.stone, A.stoneDark, '#ffffff', A.line, 1.4);
    ctx.fillStyle = '#5aa84a'; ctx.beginPath(); ctx.ellipse(x - 14, y + 4, 7, 3, 0.3, 0, Math.PI * 2); ctx.fill();
  },
  tower,
  enemy,
  castle(ctx, at) {
    const x = at.x, y = at.y;
    softShadow(ctx, x + 40, y + 30, 130, 170, 0.35);
    cel(ctx, () => { ctx.beginPath(); ctx.roundRect(x - 66, y - 126, 130, 252, 6); }, x + 10, A.wall, A.wallShade, '#ffffff');
    // a hill town inside the walls: houses with red roofs, chimneys and flower boxes
    const houses: [number, number, number, number][] = [[x - 50, y - 96, 44, 40], [x + 2, y - 104, 50, 48], [x - 44, y - 30, 52, 44], [x + 14, y - 40, 42, 52], [x - 40, y + 40, 46, 40], [x + 10, y + 36, 44, 56]];
    for (const [hx, hy, w, h] of houses) {
      cel(ctx, () => { ctx.beginPath(); ctx.rect(hx, hy + h * 0.35, w, h * 0.65); }, hx + w * 0.6, '#fff4e0', '#e0ccaa', '#ffffff', A.line, 1.3);
      cel(ctx, () => { ctx.beginPath(); ctx.moveTo(hx - 4, hy + h * 0.38); ctx.lineTo(hx + w / 2, hy); ctx.lineTo(hx + w + 4, hy + h * 0.38); ctx.closePath(); }, hx + w / 2, A.roof, A.roofDark, A.roofLight, A.line, 1.3);
      ctx.fillStyle = '#8a6a5a'; ctx.fillRect(hx + w * 0.7, hy + 2, 5, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(hx + w * 0.7 + 4, hy - 6, 5, 0, Math.PI * 2); ctx.arc(hx + w * 0.7 + 8, hy - 14, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a6a9a'; ctx.fillRect(hx + 7, hy + h * 0.5, 8, 9); ctx.fillRect(hx + w - 15, hy + h * 0.5, 8, 9);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = pick(A.flower, R0); ctx.beginPath(); ctx.arc(hx + 7 + i * 2.5, hy + h * 0.5 + 10, 1.6, 0, Math.PI * 2); ctx.fill(); }
    }
    // round towers with conical roofs and pennants
    for (const ty of [y - 126, y + 126]) {
      cel(ctx, () => { ctx.beginPath(); ctx.arc(x - 58, ty, 26, 0, Math.PI * 2); }, x - 58, A.wall, A.wallShade, '#ffffff');
      cel(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 88, ty); ctx.lineTo(x - 58, ty - 58); ctx.lineTo(x - 28, ty); ctx.closePath(); }, x - 58, A.roof, A.roofDark, A.roofLight);
      ctx.strokeStyle = A.line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 58, ty - 58); ctx.lineTo(x - 58, ty - 76); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 58, ty - 76); ctx.quadraticCurveTo(x - 46, ty - 76, x - 38, ty - 70); ctx.lineTo(x - 58, ty - 66); ctx.fill();
    }
    // ivy over the walls and the gate
    for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 3 ? A.ivy : '#6fbf4a'; ctx.beginPath(); ctx.ellipse(x - 66 + R0() * 18, y - 110 + R0() * 230, 4, 3, R0() * 3, 0, Math.PI * 2); ctx.fill(); }
    cel(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 78, y + 22); ctx.lineTo(x - 78, y - 8); ctx.arc(x - 68, y - 8, 10, Math.PI, 0); ctx.lineTo(x - 58, y + 22); ctx.closePath(); }, x - 68, '#6a4a30', '#3a2818', '#9a7050');
  },
  mill(ctx, at) {
    softShadow(ctx, at.x + 26, at.y + 24, 70, 14, 0.3);
    cel(ctx, () => { ctx.beginPath(); ctx.rect(at.x - 38, at.y - 14, 76, 40); }, at.x + 10, '#e8dcc6', '#c2b090', '#ffffff');
    cel(ctx, () => { ctx.beginPath(); ctx.moveTo(at.x - 46, at.y - 12); ctx.lineTo(at.x, at.y - 52); ctx.lineTo(at.x + 46, at.y - 12); ctx.closePath(); }, at.x, A.roof, A.roofDark, A.roofLight);
    ctx.fillStyle = '#4a6a9a'; ctx.fillRect(at.x - 24, at.y - 2, 10, 12); ctx.fillRect(at.x + 14, at.y - 2, 10, 12);
    cel(ctx, () => { ctx.beginPath(); ctx.arc(at.x - 56, at.y + 10, 22, 0, Math.PI * 2); }, at.x - 56, '#9a6a3e', '#6a4424', '#c89a6a');
    ctx.strokeStyle = A.line; ctx.lineWidth = 1.6; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(at.x - 56, at.y + 10); ctx.lineTo(at.x - 56 + Math.cos(a) * 22, at.y + 10 + Math.sin(a) * 22); ctx.stroke(); }
    // a washing line
    ctx.strokeStyle = '#8a7a6a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(at.x + 40, at.y + 4); ctx.quadraticCurveTo(at.x + 64, at.y + 10, at.x + 86, at.y + 2); ctx.stroke();
    for (const [dx, c] of [[48, '#ffffff'], [60, '#7ab0e0'], [72, '#ff9a8a']] as const) { ctx.fillStyle = c; ctx.fillRect(at.x + dx, at.y + 6, 7, 9); }
  },
  inkwell(ctx, at) {
    // a glowing spring in a ring of mossy stones
    softShadow(ctx, at.x + 10, at.y + 16, 50, 14, 0.3);
    const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, 60);
    g.addColorStop(0, 'rgba(220,255,255,0.95)'); g.addColorStop(0.35, 'rgba(140,240,250,0.6)'); g.addColorStop(1, 'rgba(140,240,250,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(at.x, at.y, 60, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; cel(ctx, () => { ctx.beginPath(); ctx.ellipse(at.x + Math.cos(a) * 26, at.y + Math.sin(a) * 16, 8, 6, a, 0, Math.PI * 2); }, at.x + Math.cos(a) * 26, A.stone, A.stoneDark, '#ffffff', A.line, 1.2); }
    for (let i = 0; i < 8; i++) sparkle(ctx, at.x - 20 + R0() * 40, at.y - 30 + R0() * 40, 2.5 + R0() * 2);
  },
  pulse(ctx, at, trail) {
    ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(160,250,255,1)'; ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(200,255,255,0.8)'; ctx.lineWidth = 6; line(ctx, [trail, at]);
    const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, 22);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(180,250,255,0.9)'); g.addColorStop(1, 'rgba(160,250,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(at.x, at.y, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    sparkle(ctx, at.x, at.y, 12);
  },
  post(ctx) {
    // big cumulus drifting over the land, each with its soft shadow on the fields below
    const R = rng(55);
    const cumulus = (cx: number, cy: number, w: number, h: number) => {
      const puffs: [number, number, number][] = [];
      const n = 7 + Math.floor(R() * 4);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const px = cx - w / 2 + t * w + (R() - 0.5) * 14;
        const lift = Math.sin(t * Math.PI) * h * (0.65 + R() * 0.35);
        puffs.push([px, cy - lift * 0.55, w * (0.1 + R() * 0.05) + lift * 0.22]);
      }
      // shadow on the ground, offset down-right
      ctx.fillStyle = 'rgba(30,70,100,0.16)';
      for (const [px, py, r] of puffs) { ctx.beginPath(); ctx.ellipse(px + 70, py + 120, r * 1.1, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - w, cy - h * 2, w * 2, h * 2 + 6); ctx.clip(); // flat base
      ctx.fillStyle = '#b8c8e0'; for (const [px, py, r] of puffs) { ctx.beginPath(); ctx.arc(px + 4, py + 5, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#e6eef8'; for (const [px, py, r] of puffs) { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ffffff'; for (const [px, py, r] of puffs) { ctx.beginPath(); ctx.arc(px - r * 0.25, py - r * 0.3, r * 0.7, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(150,170,200,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 10, cy + 6); ctx.lineTo(cx + w / 2 + 10, cy + 6); ctx.stroke();
    };
    cumulus(335, 92, 180, 46);
    cumulus(930, 108, 220, 58);
    cumulus(1335, 96, 170, 46);
    // cloud shadows drifting over the fields
    for (const [x, y, rx, ry] of [[420, 640, 260, 120], [1180, 300, 240, 110], [880, 920, 220, 90]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0, 'rgba(40,80,110,0.14)'); g.addColorStop(1, 'rgba(40,80,110,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2); ctx.fill();
    }
    // a flock of birds
    ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (const [bx, by] of [[700, 150], [724, 140], [748, 156], [770, 146]]) { ctx.beginPath(); ctx.moveTo(bx - 6, by); ctx.quadraticCurveTo(bx - 3, by - 4, bx, by); ctx.quadraticCurveTo(bx + 3, by - 4, bx + 6, by); ctx.stroke(); }
    // warm afternoon light from the upper left
    const light = ctx.createRadialGradient(MAP_W * 0.25, MAP_H * 0.2, 60, MAP_W * 0.4, MAP_H * 0.45, 1100);
    light.addColorStop(0, 'rgba(255,240,190,0.22)'); light.addColorStop(0.6, 'rgba(255,240,190,0)'); light.addColorStop(1, 'rgba(30,60,80,0.18)');
    ctx.fillStyle = light; ctx.fillRect(0, 0, MAP_W, MAP_H);
  },
};
export type { Vec };
