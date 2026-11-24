// 11. Coloured manga, inside the body. Roads are blood vessels, the castle is the heart,
// leylines are nerves from a ganglion, towers are immune cells, enemies are pathogens and a clot.
import type { EnemyType, FieldTowerType as TowerType } from '../balance';
import { MAP_W, MAP_H, line, smooth, rng, type Style, type Vec } from './scene';
import { INK, inked, tone, speedLines, sfx, panel, hardShadow } from './mangaKit';

const M = {
  tissue: '#f6c9c4', tissueDark: '#e4a29c', cellLine: '#c97a74', nucleus: '#b8608a',
  vessel: '#c8242e', vesselDark: '#7a0f18', lumen: '#e8424a', rbc: '#f05a5a',
  lymph: '#f2e6a0', lymphDark: '#c8b860', node: '#b89ad8', nerve: '#f6d24a', nerveDark: '#b8901a',
  myelin: '#ffd23a', spark: '#fff6a0', cyan: '#7ff0ff',
  neutro: '#f4f0fa', macro: '#ffb48a', mast: '#d8c0ff', bcell: '#9ae0c8',
  bacteria: '#7ac64a', virus: '#9a4ad8', clot: '#7a1820', platelet: '#f4d4a0',
};

function cellBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number) {
  const R = rng(seed);
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2; const rr = r * (0.88 + R() * 0.2); i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
}

function tower(ctx: CanvasRenderingContext2D, type: TowerType, x: number, y: number, mark: 'traced' | 'bound' | null) {
  const cy = y - 30, r = 26;
  const body = () => cellBlob(ctx, x, cy, r, Math.round(x));
  hardShadow(ctx, body, 8, 8, [x - r, cy - r, r * 2, r * 2]);
  const base = { bramble: M.neutro, ember: M.macro, bell: M.mast, verdigris: M.bcell }[type];
  const shade = { bramble: '#c8c0e0', ember: '#e07a4a', bell: '#a888d8', verdigris: '#5ab89a' }[type];
  if (type === 'ember') {
    // macrophage: pseudopods reaching out, and the glow of fever around it
    const g = ctx.createRadialGradient(x, cy, 10, x, cy, 70); g.addColorStop(0, 'rgba(255,120,60,0.45)'); g.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, 70, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) { const a = i * 1.3; inked(ctx, () => { ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 30, cy + Math.sin(a) * 26, 12, 6, a, 0, Math.PI * 2); }, [x - 46, cy - 40, 92, 80], base, shade, 2); }
  }
  inked(ctx, body, [x - r, cy - r, r * 2, r * 2], base, shade, 2.6);
  // nuclei and granules
  if (type === 'bramble') {
    // neutrophil: multi-lobed nucleus, and sticky NET strands
    ctx.fillStyle = '#8a4ab8'; for (const [dx, dy] of [[-8, -4], [0, 4], [8, -2]]) { ctx.beginPath(); ctx.arc(x + dx, cy + dy, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; for (const [dx, dy] of [[-8, -4], [0, 4], [8, -2]]) { ctx.beginPath(); ctx.arc(x + dx, cy + dy, 7, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(180,150,230,0.8)'; ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) { const a = i * 0.8; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 26, cy + Math.sin(a) * 26); ctx.quadraticCurveTo(x + Math.cos(a + 0.3) * 40, cy + Math.sin(a + 0.3) * 40, x + Math.cos(a) * 48, cy + Math.sin(a) * 46); ctx.stroke(); }
  } else if (type === 'ember') {
    ctx.fillStyle = '#c84a2a'; ctx.beginPath(); ctx.ellipse(x - 4, cy, 10, 8, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#7ac64a'; ctx.beginPath(); ctx.ellipse(x + 10, cy + 8, 5, 2.5, 0.5, 0, Math.PI * 2); ctx.fill(); // a swallowed bacterium
  } else if (type === 'bell') {
    // mast cell: granules bursting out in rings
    ctx.fillStyle = '#6a3aa8'; ctx.beginPath(); ctx.arc(x, cy, 9, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 14; i++) { const a = i * 0.45; ctx.fillStyle = '#8a5ad8'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 17, cy + Math.sin(a) * 15, 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; for (const rr of [36, 46]) { ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(x, cy, rr, 0, Math.PI * 2); ctx.stroke(); } ctx.setLineDash([]);
  } else {
    // B cell: large nucleus, Y-shaped antibodies streaming off
    ctx.fillStyle = '#2a8a6a'; ctx.beginPath(); ctx.arc(x - 2, cy, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.5, px = x + Math.cos(a) * 40, py = cy + Math.sin(a) * 36; ctx.beginPath(); ctx.moveTo(px, py + 6); ctx.lineTo(px, py); ctx.lineTo(px - 4, py - 5); ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 5); ctx.stroke(); }
  }
  if (mark === 'traced') { speedLines(ctx, x + 24, y - 72, 6, 20, 14, Math.round(x), '#2a2a2a'); ctx.fillStyle = M.spark; ctx.beginPath(); ctx.arc(x + 24, y - 72, 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }
  if (mark === 'bound') { ctx.fillStyle = M.myelin; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x + 14, y - 80, 20, 12, 6); ctx.fill(); ctx.stroke(); }
}

function enemy(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number) {
  if (type === 'levy') {
    // bacillus: a green capsule rod with flagella, and a white capsule stripe
    ctx.save(); ctx.translate(x, y - 8); ctx.rotate(dir > 0 ? -0.2 : 0.2);
    const body = () => { ctx.beginPath(); ctx.roundRect(-12, -6, 24, 12, 6); };
    inked(ctx, body, [-12, -6, 24, 12], M.bacteria, '#4a9a2a', 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, -6, 3, 12);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-dir * 12, 0); ctx.bezierCurveTo(-dir * 18, -6, -dir * 22, 6, -dir * 28, 0); ctx.stroke();
    ctx.restore();
  } else if (type === 'hound') {
    // virus: a spiky purple capsid, fast
    const cy = y - 8;
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 9, cy + Math.sin(a) * 9); ctx.lineTo(x + Math.cos(a) * 15, cy + Math.sin(a) * 15); ctx.stroke(); ctx.fillStyle = '#ff6ab0'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 15, cy + Math.sin(a) * 15, 2.2, 0, Math.PI * 2); ctx.fill(); }
    inked(ctx, () => { ctx.beginPath(); ctx.arc(x, cy, 10, 0, Math.PI * 2); }, [x - 10, cy - 10, 20, 20], M.virus, '#5a1a98', 2);
    ctx.fillStyle = INK; for (let i = 1; i <= 3; i++) ctx.fillRect(x - dir * (16 + i * 7), cy - 5 + i * 2, 5, 1.6); // motion
  } else if (type === 'bearer') {
    // a platelet carrying the clot's missing core, marked with a star
    inked(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y - 8, 12, 7, 0, 0, Math.PI * 2); }, [x - 12, y - 15, 24, 14], M.platelet, '#d8a860', 2);
    inked(ctx, () => { ctx.beginPath(); ctx.arc(x, y - 24, 8, 0, Math.PI * 2); }, [x - 8, y - 32, 16, 16], M.clot, '#4a0a10', 2);
    ctx.fillStyle = '#ffe14a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 4 : 9; const a = (k / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * rr, y - 46 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    // the clot: a heap of tangled fibrin and trapped red cells, with a hollow where its core belongs
    const body = () => cellBlob(ctx, x, y - 36, 38, 9);
    hardShadow(ctx, body, 10, 8, [x - 40, y - 76, 80, 80]);
    inked(ctx, body, [x - 40, y - 76, 80, 80], '#a8242e', M.clot, 3);
    ctx.strokeStyle = 'rgba(255,220,200,0.7)'; ctx.lineWidth = 1.2;
    const R = rng(3); for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(x - 30 + R() * 60, y - 66 + R() * 56); ctx.lineTo(x - 30 + R() * 60, y - 66 + R() * 56); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = M.rbc; ctx.beginPath(); ctx.ellipse(x - 24 + R() * 48, y - 60 + R() * 46, 6, 4, R() * 3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = '#1a0406'; ctx.beginPath(); ctx.ellipse(x, y - 36, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
  }
}

export const mangaMedical: Style = {
  id: 'manga-medical',
  name: 'Coloured manga: inside the body',
  blurb: 'The siege inside a patient. Blood vessels are the roads to the heart, nerves run from a ganglion to the immune cells that defend them: a neutrophil throws sticky nets, a macrophage burns with fever, a mast cell bursts its granules, a B cell sheds antibodies that strip a pathogen’s armour. Bacteria march in files, a pack of viruses races the short vessel, and a clot follows the platelet carrying its missing core. Traces are nerve impulses, binds are myelin sheaths, the pulse is an action potential.',
  unity: '2D sprites with bold outlines and a screentone shader (halftone dots in shadow), plus speed-line and lettering effects. Cheap to produce, very readable, and the medical skin is a pure re-theme: the rules are untouched.',
  ground(ctx, R) {
    ctx.fillStyle = M.tissue; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // tissue: a mosaic of cells with nuclei
    for (let y = 10; y < MAP_H; y += 34) for (let x = 10 + ((y / 34) % 2) * 17; x < MAP_W; x += 34) {
      const r = 15 + R() * 4;
      ctx.fillStyle = R() < 0.2 ? M.tissueDark : '#f8d6d0';
      cellBlob(ctx, x + (R() - 0.5) * 6, y + (R() - 0.5) * 6, r, Math.round(x * 3 + y));
      ctx.fill(); ctx.strokeStyle = M.cellLine; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = M.nucleus; ctx.beginPath(); ctx.arc(x + (R() - 0.5) * 6, y + (R() - 0.5) * 6, 3.4, 0, Math.PI * 2); ctx.fill();
    }
    // a wash of screentone over the far side of the page
    ctx.save(); ctx.globalAlpha = 0.5; tone(ctx, MAP_W * 0.62, 0, MAP_W, MAP_H, 7, 1.2, 'rgba(150,60,70,0.25)'); ctx.restore();
  },
  water(ctx, river, pond) {
    // a lymph vessel and a lymph node
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 30; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = M.lymph; ctx.lineWidth = 24; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = M.lymphDark; ctx.lineWidth = 2; ctx.setLineDash([3, 16]); smooth(ctx, river, 80); ctx.stroke(); ctx.setLineDash([]);
    const node = () => { ctx.beginPath(); ctx.moveTo(pond.x - 80, pond.y); ctx.bezierCurveTo(pond.x - 90, pond.y - 70, pond.x + 90, pond.y - 70, pond.x + 86, pond.y); ctx.bezierCurveTo(pond.x + 80, pond.y + 60, pond.x + 10, pond.y + 30, pond.x, pond.y + 40); ctx.bezierCurveTo(pond.x - 20, pond.y + 60, pond.x - 76, pond.y + 50, pond.x - 80, pond.y); };
    inked(ctx, node, [pond.x - 90, pond.y - 60, 180, 120], M.node, '#8a6ab8', 3);
    ctx.fillStyle = '#e8dcff'; const R = rng(6); for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.arc(pond.x - 50 + R() * 110, pond.y - 30 + R() * 50, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.font = `700 15px ${'"Hiragino Sans", sans-serif'}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('LYMPH NODE', pond.x, pond.y + 78);
  },
  road(ctx, pts, kind) {
    // a blood vessel: thick wall, bright lumen, red cells drifting along
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 46; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = M.vesselDark; ctx.lineWidth = 40; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = M.vessel; ctx.lineWidth = 32; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = M.lumen; ctx.lineWidth = 18; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,220,0.6)'; ctx.lineWidth = 3; smooth(ctx, pts.map((p) => ({ x: p.x - 8, y: p.y - 8 }))); ctx.stroke();
    const R = rng(kind === 'mill' ? 11 : 12);
    for (let i = 1; i < pts.length; i++) for (let t = 0; t < 1; t += 0.12) {
      const a = pts[i - 1], b = pts[i]; const x = a.x + (b.x - a.x) * t + (R() - 0.5) * 16, y = a.y + (b.y - a.y) * t + (R() - 0.5) * 16;
      ctx.fillStyle = M.rbc; ctx.beginPath(); ctx.ellipse(x, y, 5, 3.4, R() * 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a01822'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.font = `700 15px ${'"Hiragino Sans", sans-serif'}`; ctx.fillStyle = INK; ctx.textAlign = 'left';
    if (kind === 'mill') ctx.fillText('LONG VEIN', 270, 132); else ctx.fillText('SHORT ARTERY', 670, 1000 - 70);
  },
  bridge(ctx, at, a) {
    // a ligament band crossing the lymph vessel
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-50, -26, 100, 52, 10); }, [-50, -26, 100, 52], '#f8f0e8', '#d8c8b8', 2.4);
    ctx.strokeStyle = '#c8b8a8'; ctx.lineWidth = 1.2; for (let y2 = -20; y2 <= 20; y2 += 6) { ctx.beginPath(); ctx.moveTo(-46, y2); ctx.lineTo(46, y2 + 2); ctx.stroke(); }
    ctx.restore();
  },
  tree(ctx, x, y, r) {
    // scattered fat cells: big pale yellow cells with the nucleus pushed aside
    const cy = y - r * 0.4;
    inked(ctx, () => cellBlob(ctx, x, cy, r * 0.95, Math.round(x + y)), [x - r, cy - r, r * 2, r * 2], '#fff4c8', '#f0d890', 1.8);
    ctx.fillStyle = M.nucleus; ctx.beginPath(); ctx.ellipse(x + r * 0.55, cy + r * 0.2, 3, 2, 0.5, 0, Math.PI * 2); ctx.fill();
  },
  ley(ctx, edges, knots) {
    // nerves: yellow cords with fine striations
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const e of edges) { ctx.strokeStyle = INK; ctx.lineWidth = 7; line(ctx, e); ctx.strokeStyle = M.nerve; ctx.lineWidth = 4.4; line(ctx, e); ctx.strokeStyle = M.nerveDark; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); line(ctx, e); ctx.setLineDash([]); }
    for (const k of knots) { inked(ctx, () => { ctx.beginPath(); ctx.arc(k.x, k.y, 6, 0, Math.PI * 2); }, [k.x - 6, k.y - 6, 12, 12], M.nerve, M.nerveDark, 1.8); }
  },
  bound(ctx, path) {
    // a myelin sheath: segmented gold with nodes of Ranvier
    ctx.lineCap = 'butt';
    for (let i = 1; i < path.length; i++) {
      if (i % 3 === 0) continue;
      const a = path[i - 1], b = path[i];
      ctx.strokeStyle = INK; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = M.myelin; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x - 2, a.y - 2); ctx.lineTo(b.x - 2, b.y - 2); ctx.stroke();
    }
    ctx.lineCap = 'round';
  },
  trace(ctx, path) {
    // a nerve impulse: a crackling electric zigzag down the nerve
    const R = rng(path.length);
    const zig: Vec[] = path.map((p, i) => ({ x: p.x + (i % 2 ? 1 : -1) * (3 + R() * 4), y: p.y + (R() - 0.5) * 6 }));
    ctx.save(); ctx.lineJoin = 'miter';
    ctx.shadowColor = M.cyan; ctx.shadowBlur = 16;
    ctx.strokeStyle = INK; ctx.lineWidth = 7; line(ctx, zig);
    ctx.shadowBlur = 0; ctx.strokeStyle = M.cyan; ctx.lineWidth = 4; line(ctx, zig);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; line(ctx, zig);
    ctx.restore();
  },
  fire(ctx, pts) {
    // inflammation: swollen red glow and heat marks
    for (const p of pts) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 34); g.addColorStop(0, 'rgba(255,80,40,0.5)'); g.addColorStop(1, 'rgba(255,80,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    pts.forEach((p, i) => { if (i % 3) return; ctx.beginPath(); ctx.moveTo(p.x - 6, p.y - 10); ctx.quadraticCurveTo(p.x - 2, p.y - 16, p.x - 6, p.y - 22); ctx.moveTo(p.x + 4, p.y - 8); ctx.quadraticCurveTo(p.x + 8, p.y - 14, p.x + 4, p.y - 20); ctx.stroke(); });
  },
  foundation(ctx, x, y) {
    // a receptor site on the membrane
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(x, y, 28, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 1.6; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 9, y + 4); ctx.lineTo(x + i * 9, y - 4); ctx.lineTo(x + i * 9 - 3, y - 8); ctx.moveTo(x + i * 9, y - 4); ctx.lineTo(x + i * 9 + 3, y - 8); ctx.stroke(); }
  },
  tower,
  enemy,
  castle(ctx, at) {
    // the heart
    const x = at.x - 4, y = at.y;
    const heart = () => { ctx.beginPath(); ctx.moveTo(x - 10, y + 120); ctx.bezierCurveTo(x - 90, y + 40, x - 100, y - 70, x - 40, y - 100); ctx.bezierCurveTo(x - 10, y - 116, x + 10, y - 90, x + 14, y - 70); ctx.bezierCurveTo(x + 30, y - 110, x + 80, y - 106, x + 70, y - 40); ctx.bezierCurveTo(x + 66, y + 30, x + 20, y + 90, x - 10, y + 120); ctx.closePath(); };
    hardShadow(ctx, heart, 12, 10, [x - 100, y - 116, 180, 240]);
    inked(ctx, heart, [x - 100, y - 116, 180, 240], '#d8343a', '#8a1018', 4);
    // great vessels and coronary arteries
    for (const [vx, vw, col] of [[x - 30, 22, '#c8242e'], [x + 2, 18, '#3a5ac8'], [x + 30, 16, '#c8242e']] as const) inked(ctx, () => { ctx.beginPath(); ctx.roundRect(vx - vw / 2, y - 150, vw, 52, 8); }, [vx - vw / 2, y - 150, vw, 52], col, '#5a0a10', 2.4);
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 20, y - 70); ctx.bezierCurveTo(x - 50, y - 20, x - 30, y + 40, x - 10, y + 90); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    speedLines(ctx, x - 10, y, 140, 190, 40, 17, 'rgba(20,20,20,0.6)');
    sfx(ctx, 'ドクン', x - 10, y - 180, 40, -0.12, '#ff4a5a');
  },
  mill(ctx, at) {
    // a kidney
    const k = () => { ctx.beginPath(); ctx.moveTo(at.x - 10, at.y - 34); ctx.bezierCurveTo(at.x - 60, at.y - 40, at.x - 60, at.y + 40, at.x - 10, at.y + 34); ctx.bezierCurveTo(at.x + 14, at.y + 30, at.x + 2, at.y + 8, at.x + 14, at.y); ctx.bezierCurveTo(at.x + 2, at.y - 8, at.x + 14, at.y - 30, at.x - 10, at.y - 34); ctx.closePath(); };
    hardShadow(ctx, k, 8, 6, [at.x - 60, at.y - 40, 80, 80]);
    inked(ctx, k, [at.x - 60, at.y - 40, 80, 80], '#c8584a', '#8a2a24', 3);
  },
  inkwell(ctx, at) {
    // a ganglion: a neuron body with dendrites, where every nerve begins
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) { const a = i * 0.9; ctx.beginPath(); ctx.moveTo(at.x, at.y); ctx.quadraticCurveTo(at.x + Math.cos(a) * 30, at.y + Math.sin(a) * 30 - 10, at.x + Math.cos(a + 0.3) * 50, at.y + Math.sin(a + 0.3) * 44); ctx.stroke(); }
    inked(ctx, () => cellBlob(ctx, at.x, at.y, 26, 4), [at.x - 26, at.y - 26, 52, 52], M.nerve, M.nerveDark, 3);
    ctx.fillStyle = '#8a5a1a'; ctx.beginPath(); ctx.arc(at.x - 3, at.y - 2, 9, 0, Math.PI * 2); ctx.fill();
  },
  pulse(ctx, at, trail) {
    speedLines(ctx, at.x, at.y, 14, 60, 26, 5);
    ctx.strokeStyle = M.cyan; ctx.lineWidth = 6; ctx.lineCap = 'round'; line(ctx, [trail, at]);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); for (let k = 0; k < 16; k++) { const rr = k % 2 ? 7 : 16; const a = (k / 16) * Math.PI * 2; ctx.lineTo(at.x + Math.cos(a) * rr, at.y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
    sfx(ctx, 'ビリッ', at.x + 40, at.y - 40, 32, 0.15, M.cyan);
  },
  post(ctx) {
    sfx(ctx, 'ゴゴゴ', 140, 260, 34, -0.1, '#ff6a6a');
    panel(ctx);
  },
};
