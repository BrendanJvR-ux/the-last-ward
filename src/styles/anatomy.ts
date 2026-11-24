// 15. An anatomy-atlas plate of the siege inside the body: cream paper, engraved hatching,
// stippled tissue, muted textbook colours, numbered leader lines and a Latin legend.
import type { EnemyType, FieldTowerType as TowerType } from '../balance';
import { MAP_W, MAP_H, line, smooth, rng, type Style, type Vec } from './scene';
import { CASTLE, MILL, INKWELL, POND, BRIDGE, NODE } from '../map';

const T = {
  paper: '#f3ead6', paperDark: '#e2d5b8', ink: '#2a2018', inkSoft: 'rgba(42,32,24,0.55)',
  artery: '#b8433a', arteryDark: '#7a2620', vein: '#4a6aa8', veinDark: '#2a3e6a',
  nerve: '#e0c060', nerveDark: '#9a7e2a', lymph: '#7aa87a', lymphDark: '#3e6a4a',
  fat: '#f2e2a8', tissue: '#e8c8b4', nucleus: '#6a4a8a', blood: '#c84a40',
  serif: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
};

const labels: { n: number; x: number; y: number; lx: number; ly: number; name: string }[] = [];
function tag(n: number, x: number, y: number, lx: number, ly: number, name: string) { labels.push({ n, x, y, lx, ly, name }); }

/** Engraved hatching inside the current clip: parallel lines, optionally crossed. */
function hatch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ang: number, gap: number, col: string, lw = 0.7) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(ang);
  ctx.strokeStyle = col; ctx.lineWidth = lw;
  const r = Math.hypot(w, h) / 2 + 4;
  for (let i = -r; i < r; i += gap) { ctx.beginPath(); ctx.moveTo(-r, i); ctx.lineTo(r, i); ctx.stroke(); }
  ctx.restore();
}

/** A tinted, engraved form: watercolour tint, hatched shadow on the right, a fine contour. */
function engrave(ctx: CanvasRenderingContext2D, build: () => void, box: [number, number, number, number], tint: string, shadow: string, cross = false) {
  const [x, y, w, h] = box;
  ctx.save(); build(); ctx.fillStyle = tint; ctx.fill(); ctx.clip();
  ctx.save(); ctx.beginPath(); ctx.rect(x + w * 0.5, y - 2, w * 0.6, h + 4); ctx.clip(); hatch(ctx, x, y, w, h, -0.7, 3, shadow); if (cross) hatch(ctx, x, y, w, h, 0.6, 4, shadow, 0.5); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x + w * 0.78, y - 2, w * 0.3, h + 4); ctx.clip(); hatch(ctx, x, y, w, h, 0.5, 3, shadow); ctx.restore();
  ctx.restore();
  ctx.save(); build(); ctx.strokeStyle = T.ink; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, n = 16) {
  const R = rng(seed); ctx.beginPath();
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; const rr = r * (0.9 + R() * 0.16); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
}

function stipple(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, col: string, seed: number) {
  const R = rng(seed); ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r; ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.9, 0.9); }
}

/** A blood vessel drawn as an engraved tube: tint, cross-contour hatching along one side, adventitia lines. */
function vessel(ctx: CanvasRenderingContext2D, pts: Vec[], w: number, tint: string, dark: string) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = T.ink; ctx.lineWidth = w + 2.6; smooth(ctx, pts); ctx.stroke();
  ctx.strokeStyle = tint; ctx.lineWidth = w; smooth(ctx, pts); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,230,0.45)'; ctx.lineWidth = w * 0.28; smooth(ctx, pts.map((p) => ({ x: p.x - w * 0.18, y: p.y - w * 0.18 }))); ctx.stroke();
  // cross-contour hatching on the shadow side
  ctx.strokeStyle = dark; ctx.lineWidth = 0.8;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    for (let t = 0; t < len; t += 4) {
      const cx = a.x + Math.cos(ang) * t, cy = a.y + Math.sin(ang) * t;
      ctx.beginPath(); ctx.moveTo(cx + nx * w * 0.12, cy + ny * w * 0.12); ctx.quadraticCurveTo(cx + nx * w * 0.34 + Math.cos(ang) * 2, cy + ny * w * 0.34 + Math.sin(ang) * 2, cx + nx * w * 0.48, cy + ny * w * 0.48); ctx.stroke();
    }
  }
  // tiny vasa vasorum branching off
  const R = rng(Math.round(pts[0].x + pts[0].y));
  ctx.strokeStyle = dark; ctx.lineWidth = 0.9;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], ang = Math.atan2(b.y - a.y, b.x - a.x), side = R() < 0.5 ? 1 : -1;
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, nx = -Math.sin(ang) * side, ny = Math.cos(ang) * side;
    ctx.beginPath(); ctx.moveTo(cx + nx * w * 0.5, cy + ny * w * 0.5); ctx.bezierCurveTo(cx + nx * w, cy + ny * w + 6, cx + nx * w * 1.2 + 8, cy + ny * w * 1.3, cx + nx * w * 1.6 + 4, cy + ny * w * 1.7); ctx.stroke();
  }
}

function tower(ctx: CanvasRenderingContext2D, type: TowerType, x: number, y: number, mark: 'traced' | 'bound' | null) {
  const cy = y - 30, r = 25;
  const tint = { bramble: '#ece4f0', ember: '#f0d0b8', bell: '#e4d8f0', verdigris: '#d8ecdc' }[type];
  const shade = { bramble: 'rgba(90,70,120,0.6)', ember: 'rgba(140,70,40,0.6)', bell: 'rgba(90,60,140,0.6)', verdigris: 'rgba(50,110,80,0.6)' }[type];
  if (type === 'ember') {
    // macrophage pseudopodia
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.2; engrave(ctx, () => { ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 28, cy + Math.sin(a) * 24, 13, 6, a, 0, Math.PI * 2); }, [x - 44, cy - 40, 88, 80], tint, shade); }
  }
  engrave(ctx, () => blob(ctx, x, cy, r, Math.round(x)), [x - r, cy - r, r * 2, r * 2], tint, shade, true);
  stipple(ctx, x, cy, r * 0.9, 90, 'rgba(60,40,70,0.55)', Math.round(x * 3));
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1;
  if (type === 'bramble') {
    ctx.fillStyle = '#6a4a9a'; for (const [dx, dy] of [[-8, -4], [0, 5], [8, -3]]) { ctx.beginPath(); ctx.arc(x + dx, cy + dy, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(90,70,120,0.8)'; for (let i = 0; i < 9; i++) { const a = i * 0.7; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 25, cy + Math.sin(a) * 25); ctx.bezierCurveTo(x + Math.cos(a + 0.2) * 34, cy + Math.sin(a + 0.2) * 34, x + Math.cos(a - 0.2) * 40, cy + Math.sin(a - 0.2) * 40, x + Math.cos(a) * 48, cy + Math.sin(a) * 46); ctx.stroke(); }
  } else if (type === 'ember') {
    ctx.fillStyle = '#8a4a6a'; ctx.beginPath(); ctx.ellipse(x - 5, cy, 9, 7, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (const [dx, dy] of [[9, 8], [8, -9], [-12, 10]]) { ctx.fillStyle = '#f4ead0'; ctx.beginPath(); ctx.arc(x + dx, cy + dy, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  } else if (type === 'bell') {
    ctx.fillStyle = '#5a3a8a'; ctx.beginPath(); ctx.arc(x, cy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7a4aa8'; const R = rng(4); for (let i = 0; i < 26; i++) { const a = R() * 6.28, d = 11 + R() * 11; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, cy + Math.sin(a) * d, 1.6, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 10; i++) { const a = R() * 6.28, d = 30 + R() * 12; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, cy + Math.sin(a) * d, 1.4, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.fillStyle = '#4a6a5a'; ctx.beginPath(); ctx.arc(x - 2, cy, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.4; for (let i = 0; i < 6; i++) { const a = -1.3 + i * 0.5, px = x + Math.cos(a) * 40, py = cy + Math.sin(a) * 36; ctx.beginPath(); ctx.moveTo(px, py + 6); ctx.lineTo(px, py); ctx.lineTo(px - 4, py - 5); ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 5); ctx.stroke(); }
  }
  if (mark === 'traced') { ctx.fillStyle = '#c8402a'; ctx.beginPath(); ctx.moveTo(x + 18, y - 70); ctx.lineTo(x + 30, y - 76); ctx.lineTo(x + 30, y - 64); ctx.closePath(); ctx.fill(); }
  if (mark === 'bound') { ctx.fillStyle = T.nerve; ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + 16, y - 76, 18, 10, 5); ctx.fill(); ctx.stroke(); }
}

function enemy(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number) {
  ctx.strokeStyle = T.ink;
  if (type === 'levy') {
    // bacillus with peritrichous flagella
    ctx.save(); ctx.translate(x, y - 8); ctx.rotate(dir > 0 ? -0.2 : 0.2);
    ctx.lineWidth = 0.7; for (let i = 0; i < 5; i++) { const sx = -10 + i * 5; ctx.beginPath(); ctx.moveTo(sx, -5); ctx.bezierCurveTo(sx - 3, -10, sx + 3, -13, sx - 1, -18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx, 5); ctx.bezierCurveTo(sx - 3, 10, sx + 3, 13, sx - 1, 18); ctx.stroke(); }
    engrave(ctx, () => { ctx.beginPath(); ctx.roundRect(-12, -5.5, 24, 11, 5.5); }, [-12, -5.5, 24, 11], '#c8b0d8', 'rgba(90,60,120,0.7)');
    ctx.restore();
  } else if (type === 'hound') {
    // an icosahedral virion with surface spikes
    const cy = y - 8; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 10, cy + Math.sin(a) * 10); ctx.lineTo(x + Math.cos(a) * 15, cy + Math.sin(a) * 15); ctx.stroke(); ctx.beginPath(); ctx.arc(x + Math.cos(a) * 15.5, cy + Math.sin(a) * 15.5, 1.6, 0, Math.PI * 2); ctx.stroke(); }
    engrave(ctx, () => { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; ctx.lineTo(x + Math.cos(a) * 10, cy + Math.sin(a) * 10); } ctx.closePath(); }, [x - 10, cy - 10, 20, 20], '#d8c8a8', 'rgba(110,80,40,0.7)', true);
    ctx.lineWidth = 0.6; for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.3; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + Math.cos(a) * 10, cy + Math.sin(a) * 10); ctx.stroke(); }
  } else if (type === 'bearer') {
    // a platelet carrying the thrombus core
    engrave(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y - 8, 12, 6.5, 0, 0, Math.PI * 2); }, [x - 12, y - 14.5, 24, 13], '#f0dcb0', 'rgba(140,100,40,0.6)');
    stipple(ctx, x, y - 8, 9, 30, 'rgba(90,60,30,0.8)', 3);
    engrave(ctx, () => blob(ctx, x, y - 24, 8, 7, 10), [x - 8, y - 32, 16, 16], '#a84a40', 'rgba(80,20,15,0.8)', true);
    ctx.fillStyle = T.ink; ctx.font = `italic 700 13px ${T.serif}`; ctx.textAlign = 'center'; ctx.fillText('*', x, y - 38);
  } else {
    // a thrombus: fibrin mesh with trapped erythrocytes, hollow at its core
    engrave(ctx, () => blob(ctx, x, y - 36, 36, 9), [x - 38, y - 74, 76, 76], '#d8a098', 'rgba(110,30,25,0.65)', true);
    ctx.strokeStyle = 'rgba(90,30,25,0.7)'; ctx.lineWidth = 0.6;
    const R = rng(5); for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.moveTo(x - 30 + R() * 60, y - 66 + R() * 58); ctx.lineTo(x - 30 + R() * 60, y - 66 + R() * 58); ctx.stroke(); }
    for (let i = 0; i < 8; i++) { const ex = x - 24 + R() * 48, ey = y - 60 + R() * 46; ctx.fillStyle = T.blood; ctx.beginPath(); ctx.ellipse(ex, ey, 5.5, 3.6, R() * 3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 0.8; ctx.stroke(); ctx.beginPath(); ctx.ellipse(ex, ey, 2.4, 1.4, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = T.paper; ctx.beginPath(); ctx.ellipse(x, y - 36, 9, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]);
  }
}

export const anatomy: Style = {
  id: 'anatomy',
  name: 'Anatomy atlas plate',
  blurb: 'The medical siege as a plate from an old anatomy atlas: cream paper, engraved hatching and stippling, muted textbook colours (arteries red, veins blue, nerves yellow, lymph green), every structure numbered with a leader line and named in a Latin legend. Traces are drawn as conduction arrows along the nerves, the bound route is a myelinated nerve with its sheath segments, and the pulse is marked by a small action-potential trace.',
  unity: '2D sprites with a paper texture and a hatching/stipple shader, plus a label layer for the legend. Calm and readable, ideal as a teaching or medical-education skin; the labels double as an in-game glossary.',
  ground(ctx, R) {
    labels.length = 0;
    ctx.fillStyle = T.paper; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // foxing and paper tone
    for (let i = 0; i < 30; i++) { const g = ctx.createRadialGradient(R() * MAP_W, R() * MAP_H, 0, 0, 0, 0); void g; ctx.fillStyle = `rgba(180,140,80,${0.03 + R() * 0.05})`; ctx.beginPath(); ctx.arc(R() * MAP_W, R() * MAP_H, 6 + R() * 26, 0, Math.PI * 2); ctx.fill(); }
    // connective tissue: faint fibres and stippled cells
    ctx.strokeStyle = 'rgba(170,110,90,0.18)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 260; i++) { const x = R() * MAP_W, y = R() * MAP_H, a = R() * 0.6 - 0.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 30, y + Math.sin(a) * 20, x + 60, y - 8, x + 90, y + Math.sin(a) * 10); ctx.stroke(); }
    for (let i = 0; i < 900; i++) { const x = R() * MAP_W, y = R() * MAP_H; ctx.strokeStyle = 'rgba(160,110,100,0.25)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(x, y, 6 + R() * 4, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(110,80,130,0.4)'; ctx.beginPath(); ctx.arc(x + (R() - 0.5) * 4, y + (R() - 0.5) * 4, 1.4, 0, Math.PI * 2); ctx.fill(); }
    // a light tissue tint around the field
    const g = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, 200, MAP_W / 2, MAP_H / 2, 900);
    g.addColorStop(0, 'rgba(232,200,180,0.25)'); g.addColorStop(1, 'rgba(232,200,180,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H);
  },
  water(ctx, river, pond) {
    // vas lymphaticum with valves, and a nodus lymphaticus in section
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = T.ink; ctx.lineWidth = 26; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = '#cfe0c4'; ctx.lineWidth = 23; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = T.lymphDark; ctx.lineWidth = 0.8;
    for (let i = 1; i < river.length; i++) for (let t = 0.15; t < 1; t += 0.22) {
      const a = river[i - 1], b = river[i], ang = Math.atan2(b.y - a.y, b.x - a.x);
      const cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t, nx = -Math.sin(ang), ny = Math.cos(ang);
      ctx.beginPath(); ctx.moveTo(cx + nx * 11, cy + ny * 11); ctx.quadraticCurveTo(cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8, cx - nx * 11, cy - ny * 11); ctx.stroke(); // valve
    }
    const node = () => { ctx.beginPath(); ctx.moveTo(pond.x - 82, pond.y); ctx.bezierCurveTo(pond.x - 92, pond.y - 72, pond.x + 92, pond.y - 72, pond.x + 86, pond.y); ctx.bezierCurveTo(pond.x + 80, pond.y + 60, pond.x + 10, pond.y + 30, pond.x, pond.y + 40); ctx.bezierCurveTo(pond.x - 20, pond.y + 60, pond.x - 78, pond.y + 50, pond.x - 82, pond.y); };
    engrave(ctx, node, [pond.x - 92, pond.y - 64, 184, 124], '#d0e2c8', 'rgba(60,100,70,0.55)');
    // cortex follicles and medullary cords
    const R = rng(6);
    for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI, fx = pond.x + Math.cos(a) * 62, fy = pond.y - 6 + Math.sin(a) * 40; ctx.fillStyle = '#b8d0b0'; ctx.beginPath(); ctx.arc(fx, fy, 11, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 0.8; ctx.stroke(); stipple(ctx, fx, fy, 9, 24, 'rgba(40,70,50,0.8)', i); }
    ctx.strokeStyle = 'rgba(60,100,70,0.7)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(pond.x - 40 + i * 16, pond.y - 20); ctx.bezierCurveTo(pond.x - 30 + i * 12, pond.y, pond.x - 10 + i * 6, pond.y + 10, pond.x, pond.y + 30); ctx.stroke(); }
    void R;
    tag(7, pond.x + 60, pond.y - 40, pond.x + 150, pond.y - 90, 'Nodus lymphaticus');
    tag(8, (river[1].x + river[2].x) / 2 + 12, (river[1].y + river[2].y) / 2, (river[1].x + river[2].x) / 2 + 90, (river[1].y + river[2].y) / 2 + 10, 'Vas lymphaticum');
  },
  road(ctx, pts, kind) {
    if (kind === 'mill') { vessel(ctx, pts, 34, T.vein, T.veinDark); tag(1, 330, 160, 300, 70, 'Vena longa'); }
    else { vessel(ctx, pts, 32, T.artery, T.arteryDark); tag(2, 1000, 722, 1080, 820, 'Arteria brevis'); }
  },
  bridge(ctx, at, a) {
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15);
    engrave(ctx, () => { ctx.beginPath(); ctx.roundRect(-50, -24, 100, 48, 10); }, [-50, -24, 100, 48], '#f2ead8', 'rgba(120,100,70,0.55)');
    ctx.strokeStyle = 'rgba(120,100,70,0.8)'; ctx.lineWidth = 0.7; for (let yy = -20; yy <= 20; yy += 4) { ctx.beginPath(); ctx.moveTo(-46, yy); ctx.bezierCurveTo(-10, yy + 3, 10, yy - 3, 46, yy + 1); ctx.stroke(); }
    ctx.restore();
    tag(9, at.x + 30, at.y + 10, at.x + 110, at.y + 70, 'Ligamentum');
  },
  tree(ctx, x, y, r) {
    // lobules of adipose tissue: polygonal fat cells with peripheral nuclei
    const cy = y - r * 0.5, R = rng(Math.round(x * 7 + y));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, cx = x + Math.cos(a) * r * 0.45, cyy = cy + Math.sin(a) * r * 0.4;
      blob(ctx, cx, cyy, r * 0.42, Math.round(cx + cyy), 7); ctx.fillStyle = T.fat; ctx.fill(); ctx.strokeStyle = 'rgba(120,90,40,0.8)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = T.nucleus; ctx.beginPath(); ctx.ellipse(cx + r * 0.3, cyy + (R() - 0.5) * 4, 2, 1.2, 0.4, 0, Math.PI * 2); ctx.fill();
    }
  },
  ley(ctx, edges, knots) {
    // nervi: yellow cords with fascicle lines and a fine perineurium
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const e of edges) { ctx.strokeStyle = T.ink; ctx.lineWidth = 6.4; line(ctx, e); ctx.strokeStyle = '#f0dc94'; ctx.lineWidth = 4.6; line(ctx, e); ctx.strokeStyle = T.nerveDark; ctx.lineWidth = 0.6; line(ctx, e.map((p) => ({ x: p.x + 1, y: p.y + 1 }))); }
    for (const k of knots) { ctx.fillStyle = '#f0dc94'; ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(k.x, k.y, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    const n = NODE.w3;
    tag(6, n.x - 40, n.y + 10, n.x - 120, n.y - 70, 'Nervus');
  },
  bound(ctx, path) {
    // a myelinated fibre: sheath segments with nodes of Ranvier, in pale yellow with hatching
    for (let i = 1; i < path.length; i++) {
      if (i % 3 === 0) continue;
      const a = path[i - 1], b = path[i];
      ctx.lineCap = 'round'; ctx.strokeStyle = T.ink; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = '#f6e8b0'; ctx.lineWidth = 10.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(150,120,40,0.7)'; ctx.lineWidth = 0.6; const ang = Math.atan2(b.y - a.y, b.x - a.x);
      for (let t = 0; t < 1; t += 0.25) { const cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t; ctx.beginPath(); ctx.moveTo(cx - Math.sin(ang) * 1, cy + Math.cos(ang) * 1); ctx.lineTo(cx - Math.sin(ang) * 5, cy + Math.cos(ang) * 5); ctx.stroke(); }
    }
    const m = path[Math.floor(path.length * 0.55)];
    tag(5, m.x + 6, m.y, m.x + 70, m.y + 60, 'Fibra myelinata');
  },
  trace(ctx, path) {
    // conduction arrows along the nerve, as in a physiology diagram
    ctx.strokeStyle = '#c8402a'; ctx.lineWidth = 2.4; ctx.setLineDash([10, 6]); ctx.lineCap = 'round';
    line(ctx, path.map((p) => ({ x: p.x + 7, y: p.y - 7 })));
    ctx.setLineDash([]);
    ctx.fillStyle = '#c8402a';
    for (let i = 6; i < path.length; i += 8) {
      const a = path[i - 1], b = path[i], ang = Math.atan2(b.y - a.y, b.x - a.x), x = b.x + 7, y = b.y - 7;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * 8, y + Math.sin(ang) * 8); ctx.lineTo(x + Math.cos(ang + 2.6) * 7, y + Math.sin(ang + 2.6) * 7); ctx.lineTo(x + Math.cos(ang - 2.6) * 7, y + Math.sin(ang - 2.6) * 7); ctx.closePath(); ctx.fill();
    }
    // depolarisation marks
    ctx.font = `700 10px ${T.serif}`; ctx.textAlign = 'center';
    for (let i = 3; i < path.length; i += 8) { ctx.fillText(i % 16 < 8 ? '+' : '−', path[i].x - 8, path[i].y + 12); }
  },
  fire(ctx, pts) {
    // inflammation: a hatched zone of rubor with stippled exudate
    ctx.save();
    ctx.beginPath(); for (const p of pts) { ctx.moveTo(p.x + 26, p.y); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); }
    ctx.fillStyle = 'rgba(200,70,50,0.18)'; ctx.fill(); ctx.clip();
    hatch(ctx, Math.min(...pts.map((p) => p.x)) - 30, Math.min(...pts.map((p) => p.y)) - 30, 320, 320, 0.8, 4, 'rgba(180,50,40,0.5)');
    ctx.restore();
    pts.forEach((p, i) => { if (i % 3 === 0) stipple(ctx, p.x, p.y, 16, 14, 'rgba(160,40,30,0.9)', i); });
    const p = pts[Math.floor(pts.length / 2)];
    tag(10, p.x + 20, p.y + 10, p.x + 120, p.y + 120, 'Inflammatio');
  },
  foundation(ctx, x, y) {
    ctx.strokeStyle = T.inkSoft; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(x, y, 28, 12, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    stipple(ctx, x, y, 22, 40, 'rgba(90,60,40,0.5)', Math.round(x));
  },
  tower(ctx, type, x, y, mark) {
    tower(ctx, type, x, y, mark);
    const names: Record<TowerType, [number, string]> = { bramble: [11, 'Neutrophilus'], ember: [12, 'Macrophagus'], bell: [13, 'Mastocytus'], verdigris: [14, 'Lymphocytus B'] };
    const [n, name] = names[type];
    if (!labels.some((l) => l.n === n)) tag(n, x + 22, y - 40, x + 70, y - 100, name);
  },
  enemy(ctx, type, x, y, dir) {
    enemy(ctx, type, x, y, dir);
    const names: Record<EnemyType, [number, string]> = { levy: [15, 'Bacillus'], hound: [16, 'Virion'], bearer: [17, 'Thrombocytus'], cairn: [18, 'Thrombus'] };
    const [n, name] = names[type];
    if (!labels.some((l) => l.n === n)) tag(n, x + 10, y - 20, x + 60, y + (type === 'hound' ? 70 : type === 'cairn' ? 60 : 70), name);
  },
  castle(ctx, at) {
    // cor, anterior view: ventricles, atria, the great vessels and coronary arteries
    const x = at.x - 22, y = at.y;
    const heart = () => { ctx.beginPath(); ctx.moveTo(x - 10, y + 118); ctx.bezierCurveTo(x - 92, y + 40, x - 98, y - 66, x - 42, y - 96); ctx.bezierCurveTo(x - 12, y - 112, x + 8, y - 90, x + 14, y - 70); ctx.bezierCurveTo(x + 32, y - 108, x + 80, y - 100, x + 70, y - 40); ctx.bezierCurveTo(x + 66, y + 30, x + 20, y + 88, x - 10, y + 118); ctx.closePath(); };
    for (const [vx, vw, col] of [[x - 28, 24, T.artery], [x + 2, 20, T.vein], [x + 30, 18, T.artery]] as const) engrave(ctx, () => { ctx.beginPath(); ctx.roundRect(vx - vw / 2, y - 150, vw, 64, 9); }, [vx - vw / 2, y - 150, vw, 64], col, 'rgba(40,20,20,0.6)');
    engrave(ctx, heart, [x - 98, y - 112, 176, 232], '#cf7a6e', 'rgba(90,25,20,0.42)');
    // interventricular sulcus with coronary vessels
    ctx.strokeStyle = T.arteryDark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 4, y - 72); ctx.bezierCurveTo(x - 20, y - 20, x - 24, y + 40, x - 10, y + 108); ctx.stroke();
    ctx.strokeStyle = T.veinDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 9, y - 70); ctx.bezierCurveTo(x - 14, y - 20, x - 18, y + 40, x - 4, y + 106); ctx.stroke();
    ctx.strokeStyle = T.arteryDark; ctx.lineWidth = 1.4; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const yy = y - 40 + i * 32; ctx.beginPath(); ctx.moveTo(x - 14 + s * 2, yy); ctx.quadraticCurveTo(x - 14 + s * 24, yy + 8, x - 14 + s * 40, yy + 20); ctx.stroke(); }
    // fat along the grooves
    ctx.fillStyle = T.fat; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x - 6 - i * 2, y - 60 + i * 26, 5, 3, 0.5, 0, Math.PI * 2); ctx.fill(); }
    tag(3, x + 50, y - 20, x - 40, y + 170, 'Cor');
  },
  mill(ctx, at) {
    const k = () => { ctx.beginPath(); ctx.moveTo(at.x - 10, at.y - 34); ctx.bezierCurveTo(at.x - 60, at.y - 40, at.x - 60, at.y + 40, at.x - 10, at.y + 34); ctx.bezierCurveTo(at.x + 14, at.y + 30, at.x + 2, at.y + 8, at.x + 14, at.y); ctx.bezierCurveTo(at.x + 2, at.y - 8, at.x + 14, at.y - 30, at.x - 10, at.y - 34); ctx.closePath(); };
    engrave(ctx, k, [at.x - 60, at.y - 40, 80, 80], '#b8645a', 'rgba(80,25,20,0.7)', true);
    ctx.strokeStyle = 'rgba(80,25,20,0.8)'; ctx.lineWidth = 0.8; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(at.x + 6, at.y); ctx.lineTo(at.x - 40 + i * 4, at.y - 24 + i * 9); ctx.stroke(); }
    tag(19, at.x - 40, at.y - 30, at.x - 120, at.y - 70, 'Ren');
  },
  inkwell(ctx, at) {
    // a ganglion with its neuron cell bodies
    ctx.strokeStyle = T.ink; ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) { const a = i * 0.9; ctx.beginPath(); ctx.moveTo(at.x, at.y); ctx.quadraticCurveTo(at.x + Math.cos(a) * 30, at.y + Math.sin(a) * 30 - 8, at.x + Math.cos(a + 0.3) * 52, at.y + Math.sin(a + 0.3) * 46); ctx.stroke(); }
    engrave(ctx, () => blob(ctx, at.x, at.y, 30, 4), [at.x - 30, at.y - 30, 60, 60], '#f0dc94', 'rgba(140,110,40,0.7)', true);
    for (let i = 0; i < 7; i++) { const a = i * 0.9, cx = at.x + Math.cos(a) * 15, cy = at.y + Math.sin(a) * 13; ctx.fillStyle = '#e8c878'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 0.7; ctx.stroke(); ctx.fillStyle = T.nucleus; ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, Math.PI * 2); ctx.fill(); }
    tag(4, at.x - 20, at.y + 20, at.x - 110, at.y + 110, 'Ganglion');
  },
  pulse(ctx, at, trail) {
    void trail;
    ctx.fillStyle = '#c8402a'; ctx.beginPath(); ctx.arc(at.x, at.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.stroke();
    // an inset action-potential trace with axes
    const bx = at.x + 26, by = at.y - 80, w = 110, h = 58;
    ctx.fillStyle = 'rgba(243,234,214,0.95)'; ctx.fillRect(bx, by, w, h); ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.strokeRect(bx, by, w, h);
    ctx.beginPath(); ctx.moveTo(bx + 10, by + 6); ctx.lineTo(bx + 10, by + h - 8); ctx.lineTo(bx + w - 6, by + h - 8); ctx.stroke();
    ctx.strokeStyle = '#c8402a'; ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(bx + 12, by + 40); ctx.lineTo(bx + 34, by + 40); ctx.lineTo(bx + 40, by + 34); ctx.lineTo(bx + 46, by + 10); ctx.lineTo(bx + 52, by + 30); ctx.lineTo(bx + 58, by + 46); ctx.quadraticCurveTo(bx + 70, by + 44, bx + 100, by + 40); ctx.stroke();
    ctx.fillStyle = T.ink; ctx.font = `italic 10px ${T.serif}`; ctx.textAlign = 'left'; ctx.fillText('mV', bx + 12, by + 12); ctx.fillText('t', bx + w - 12, by + h - 11);
    ctx.strokeStyle = T.inkSoft; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(at.x + 6, at.y - 4); ctx.lineTo(bx, by + h); ctx.stroke();
    ctx.fillStyle = T.ink; ctx.font = `italic 11px ${T.serif}`; ctx.fillText('Fig. 2  Potentiale actionis', bx, by - 5);
  },
  post(ctx) {
    // numbered leader lines and their labels
    ctx.font = `600 13px ${T.serif}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const l of labels) {
      ctx.strokeStyle = T.ink; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.lx, l.ly); ctx.stroke();
      ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(l.x, l.y, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = T.paper; ctx.beginPath(); ctx.arc(l.lx, l.ly, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = T.ink; ctx.fillText(String(l.n), l.lx, l.ly + 0.5);
    }
    ctx.textBaseline = 'alphabetic';
    // the legend, bottom left
    const sorted = [...labels].sort((a, b) => a.n - b.n);
    const lx = 34, ly = MAP_H - 34 - Math.ceil(sorted.length / 2) * 17 - 40, lw = 380;
    ctx.fillStyle = 'rgba(243,234,214,0.96)'; ctx.fillRect(lx, ly, lw, MAP_H - 34 - ly); ctx.strokeStyle = T.ink; ctx.lineWidth = 1.2; ctx.strokeRect(lx, ly, lw, MAP_H - 34 - ly);
    ctx.fillStyle = T.ink; ctx.font = `italic 600 15px ${T.serif}`; ctx.textAlign = 'left'; ctx.fillText('Explicatio figurae', lx + 12, ly + 22);
    ctx.font = `12.5px ${T.serif}`;
    sorted.forEach((l, i) => { const col = i % 2, row = Math.floor(i / 2); ctx.fillText(`${l.n}. ${l.name}`, lx + 14 + col * 186, ly + 44 + row * 17); });
    // caption, scale bar, plate border
    ctx.fillStyle = T.ink; ctx.font = `italic 15px ${T.serif}`; ctx.textAlign = 'center';
    ctx.fillText('Tab. XIV.  Fig. 1.  The defence of the heart: pathogens advancing along the vena longa and arteria brevis.', MAP_W / 2 + 210, MAP_H - 18);
    ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(MAP_W - 220, MAP_H - 46); ctx.lineTo(MAP_W - 120, MAP_H - 46); ctx.stroke();
    for (const x of [MAP_W - 220, MAP_W - 170, MAP_W - 120]) { ctx.beginPath(); ctx.moveTo(x, MAP_H - 50); ctx.lineTo(x, MAP_H - 42); ctx.stroke(); }
    ctx.font = `italic 12px ${T.serif}`; ctx.fillText('100 µm', MAP_W - 170, MAP_H - 54);
    ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.strokeRect(10, 10, MAP_W - 20, MAP_H - 20); ctx.lineWidth = 2.4; ctx.strokeRect(16, 16, MAP_W - 32, MAP_H - 32);
    void CASTLE; void MILL; void INKWELL; void POND; void BRIDGE;
  },
};
