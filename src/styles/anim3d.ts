// 14. Animated 3D feature: chunky toy-like forms, soft global illumination, glossy highlights,
// rim light, contact shadows, big expressive eyes, warm sun and a tilt-shift blur.
import type { FieldEnemyType as EnemyType, FieldTowerType as TowerType } from '../balance';
import { MAP_W, MAP_H, smooth, rng, type Style, type Vec } from './scene';

function mix(hex: string, k: number): string {
  // k > 0 lightens towards white, k < 0 darkens towards black
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Ambient-occlusion contact shadow under an object. */
function contact(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.45) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(40,30,60,${a})`); g.addColorStop(0.6, `rgba(40,30,60,${a * 0.4})`); g.addColorStop(1, 'rgba(40,30,60,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

/** A soft-lit sphere: key light upper-left, warm bounce below, cool rim right, specular dot. */
function sphere(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, spec = 0.85) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, mix(col, 0.45)); g.addColorStop(0.55, col); g.addColorStop(1, mix(col, -0.45));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  const b = ctx.createRadialGradient(x, y + r, 0, x, y + r * 0.6, r * 0.9);
  b.addColorStop(0, 'rgba(255,200,140,0.35)'); b.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = b; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(190,220,255,0.45)'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.arc(x, y, r * 0.94, -0.9, 0.9); ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${spec})`; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
}

/** A rounded upright body (capsule / bean) with the same lighting. */
function bean(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, mix(col, 0.35)); g.addColorStop(0.45, col); g.addColorStop(1, mix(col, -0.45));
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, w / 2); ctx.fill();
  const t = ctx.createLinearGradient(0, y - h, 0, y);
  t.addColorStop(0, 'rgba(255,255,255,0.25)'); t.addColorStop(0.3, 'rgba(255,255,255,0)'); t.addColorStop(1, 'rgba(60,30,40,0.25)');
  ctx.fillStyle = t; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, w / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - w * 0.22, y - h * 0.72, w * 0.1, h * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();
}

/** A 3D tube along a path: dark underside, body colour, bright top ridge, specular line. */
function tube(ctx: CanvasRenderingContext2D, path: Vec[], w: number, col: string, glow = '') {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (pts: Vec[]) => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y); ctx.stroke(); };
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = w * 2.4; }
  ctx.strokeStyle = mix(col, -0.45); ctx.lineWidth = w; line(path.map((p) => ({ x: p.x + w * 0.12, y: p.y + w * 0.18 })));
  ctx.shadowBlur = 0;
  ctx.strokeStyle = col; ctx.lineWidth = w * 0.82; line(path);
  ctx.strokeStyle = mix(col, 0.4); ctx.lineWidth = w * 0.42; line(path.map((p) => ({ x: p.x - w * 0.12, y: p.y - w * 0.14 })));
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, w * 0.12); line(path.map((p) => ({ x: p.x - w * 0.2, y: p.y - w * 0.24 })));
  ctx.restore();
}

/** Big expressive cartoon eyes. */
function eyes(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dir: number, mood: 'eager' | 'sad' | 'sly' = 'eager') {
  for (const s of [-1, 1]) {
    const ex = x + s * r * 1.05;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, y, r, r * 1.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,50,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = mood === 'sly' ? '#c8302a' : '#3a2a1a'; ctx.beginPath(); ctx.arc(ex + dir * r * 0.3, y + r * 0.15, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex + dir * r * 0.3 - r * 0.2, y - r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
    // brows show the mood
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = Math.max(1.2, r * 0.3); ctx.lineCap = 'round';
    ctx.beginPath();
    if (mood === 'sad') { ctx.moveTo(ex - r * 0.8, y - r * 1.2 - s * r * 0.3); ctx.lineTo(ex + r * 0.8, y - r * 1.2 + s * r * 0.3); }
    else if (mood === 'sly') { ctx.moveTo(ex - r * 0.8, y - r * 1.1 + s * r * 0.35); ctx.lineTo(ex + r * 0.8, y - r * 1.1 - s * r * 0.35); }
    else { ctx.moveTo(ex - r * 0.7, y - r * 1.4); ctx.quadraticCurveTo(ex, y - r * 1.7, ex + r * 0.7, y - r * 1.4); }
    ctx.stroke();
  }
}

function tower(ctx: CanvasRenderingContext2D, type: TowerType, x: number, y: number, mark: 'traced' | 'bound' | null) {
  contact(ctx, x + 10, y + 2, 40, 13, 0.5);
  // a rounded stone plinth
  const pg = ctx.createLinearGradient(x - 26, 0, x + 26, 0); pg.addColorStop(0, '#e8e0d8'); pg.addColorStop(1, '#9a9088');
  ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(x, y - 2, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
  if (type === 'bramble') {
    bean(ctx, x, y - 4, 30, 54, '#c8b8a0');
    for (const [dx, dy, r] of [[-12, -46, 13], [10, -52, 14], [0, -64, 12], [-14, -26, 10], [13, -30, 9]] as const) sphere(ctx, x + dx, y + dy, r, '#4aa84a', 0.6);
    for (const [dx, dy] of [[-8, -56], [12, -44], [2, -70], [-16, -32]]) sphere(ctx, x + dx, y + dy, 3.2, '#e8344a', 0.9);
    ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.roundRect(x - 5, y - 20, 10, 16, 5); ctx.fill();
  } else if (type === 'ember') {
    bean(ctx, x, y - 4, 44, 52, '#d8683a');
    bean(ctx, x, y - 50, 16, 22, '#b8542e');
    const g = ctx.createRadialGradient(x, y - 18, 0, x, y - 18, 34);
    g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(0.3, 'rgba(255,160,60,0.9)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 18, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff0a0'; ctx.beginPath(); ctx.roundRect(x - 8, y - 28, 16, 20, 8); ctx.fill();
    for (let i = 0; i < 3; i++) sphere(ctx, x + 4 + i * 4, y - 80 - i * 12, 6 + i * 3, '#d8d0d0', 0.3);
  } else if (type === 'bell') {
    bean(ctx, x, y - 4, 26, 64, '#f4ead8');
    ctx.fillStyle = '#3a2a40'; ctx.beginPath(); ctx.roundRect(x - 7, y - 54, 14, 18, 7); ctx.fill();
    sphere(ctx, x, y - 42, 6, '#f2b83a');
    const rg = ctx.createLinearGradient(x - 18, 0, x + 18, 0); rg.addColorStop(0, '#5a8ae8'); rg.addColorStop(1, '#22408a');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x - 18, y - 64); ctx.quadraticCurveTo(x - 6, y - 76, x, y - 100); ctx.quadraticCurveTo(x + 6, y - 76, x + 18, y - 64); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(x - 7, y - 76, 2, 8, 0.3, 0, Math.PI * 2); ctx.fill();
    sphere(ctx, x, y - 102, 4, '#f2b83a');
  } else {
    bean(ctx, x, y - 4, 16, 32, '#e8e0d8');
    const bg = ctx.createLinearGradient(x - 26, 0, x + 26, 0); bg.addColorStop(0, '#9af0d0'); bg.addColorStop(0.5, '#3ab89a'); bg.addColorStop(1, '#1a6a5a');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(x - 26, y - 46); ctx.quadraticCurveTo(x - 22, y - 28, x, y - 28); ctx.quadraticCurveTo(x + 22, y - 28, x + 26, y - 46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0a060'; ctx.beginPath(); ctx.ellipse(x, y - 46, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
    const wg = ctx.createRadialGradient(x - 6, y - 48, 0, x, y - 46, 22); wg.addColorStop(0, '#d8fbff'); wg.addColorStop(1, '#3aa8d8');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(x, y - 46, 22, 4.4, 0, 0, Math.PI * 2); ctx.fill();
    for (const d of [-1, 1]) { ctx.strokeStyle = 'rgba(200,245,255,0.95)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y - 58); ctx.quadraticCurveTo(x + d * 14, y - 76, x + d * 22, y - 48); ctx.stroke(); }
    sphere(ctx, x, y - 60, 5, '#3ab89a');
  }
  if (mark === 'traced') { const g = ctx.createRadialGradient(x + 24, y - 80, 0, x + 24, y - 80, 18); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(110,190,255,0.9)'); g.addColorStop(1, 'rgba(110,190,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 24, y - 80, 18, 0, Math.PI * 2); ctx.fill(); }
  if (mark === 'bound') sphere(ctx, x + 24, y - 80, 9, '#f2b83a', 1);
}

function enemy(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number) {
  if (type === 'cairn') {
    // a big, gentle, sad stone giant with a hole where its heart-stone should be
    contact(ctx, x + 6, y + 6, 50, 14, 0.55);
    sphere(ctx, x - 14, y - 6, 12, '#9a968e', 0.3); sphere(ctx, x + 14, y - 6, 12, '#9a968e', 0.3);
    sphere(ctx, x, y - 42, 34, '#a8a49a', 0.5);
    sphere(ctx, x - 36, y - 40, 13, '#9a968e', 0.4); sphere(ctx, x + 36, y - 40, 13, '#9a968e', 0.4);
    sphere(ctx, x, y - 84, 18, '#b0aca2', 0.6);
    ctx.fillStyle = 'rgba(90,150,70,0.9)'; ctx.beginPath(); ctx.ellipse(x - 10, y - 99, 10, 4, -0.2, 0, Math.PI * 2); ctx.fill();
    eyes(ctx, x, y - 86, 5, dir, 'sad');
    const hg = ctx.createRadialGradient(x, y - 40, 0, x, y - 40, 14); hg.addColorStop(0, '#0a0808'); hg.addColorStop(1, '#4a4640');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(x, y - 40, 11, 14, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (type === 'hound') {
    // a sleek, mischievous dog with a brass collar
    contact(ctx, x + 2, y + 6, 22, 6, 0.5);
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    for (const lx of [-12, -7, 6, 11]) bean(ctx, lx, 8, 4, 12, '#3a3446');
    // a long, low body as a horizontal capsule, lit from above
    const bg = ctx.createLinearGradient(0, -16, 0, 2); bg.addColorStop(0, '#7a7090'); bg.addColorStop(0.45, '#4a4258'); bg.addColorStop(1, '#221e2c');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-20, -16, 36, 17, 8.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-6, -13, 8, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a4258'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-19, -10); ctx.quadraticCurveTo(-28, -16, -30, -24); ctx.stroke(); // tail
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    ctx.fillStyle = '#4a4258'; ctx.beginPath(); ctx.moveTo(8, -22); ctx.lineTo(12, -32); ctx.lineTo(15, -22); ctx.fill(); ctx.beginPath(); ctx.moveTo(14, -22); ctx.lineTo(19, -30); ctx.lineTo(20, -20); ctx.fill();
    sphere(ctx, 21, -13, 3, '#1a1420', 0.8);
    ctx.strokeStyle = '#e0a840'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(8, -10, 7, -0.6, 1.2); ctx.stroke();
    ctx.restore();
    eyes(ctx, x + dir * 13, y - 17, 2.6, dir, 'sly');
    return;
  }
  // levy and bearer: round little soldiers
  contact(ctx, x + 2, y + 6, 14, 5, 0.5);
  bean(ctx, x - 3, y + 8, 4, 9, '#5a3a2a'); bean(ctx, x + 3, y + 8, 4, 9, '#5a3a2a');
  bean(ctx, x, y, 18, 22, type === 'bearer' ? '#d8443a' : '#4a7ad8');
  sphere(ctx, x, y - 24, 9, '#f2c49a', 0.5);
  eyes(ctx, x, y - 25, 2.6, dir, type === 'bearer' ? 'eager' : 'eager');
  if (type === 'levy') {
    // a shiny helmet and a round reed shield with its white flood line
    ctx.fillStyle = '#a8b0b8'; ctx.beginPath(); ctx.arc(x, y - 27, 9.5, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(x - 4, y - 32, 3, 1.6, -0.4, 0, Math.PI * 2); ctx.fill();
    const sx = x + dir * 11;
    sphere(ctx, sx, y - 8, 9, '#e8c870', 0.6);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 8, y - 7, 16, 3);
    ctx.strokeStyle = '#7a5a30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - dir * 10, y + 4); ctx.lineTo(x - dir * 10, y - 40); ctx.stroke();
    sphere(ctx, x - dir * 10, y - 42, 3, '#d8d8e0', 0.9);
  } else {
    // the bearer heaves the name-stone overhead, a sparkle marking it
    bean(ctx, x - 9, y - 26, 4, 14, '#d8443a'); bean(ctx, x + 9, y - 26, 4, 14, '#d8443a');
    ctx.fillStyle = '#b8b4aa'; ctx.beginPath(); ctx.roundRect(x - 13, y - 54, 26, 18, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(x - 6, y - 50, 4, 2, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f2b83a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y - 50); ctx.lineTo(x, y - 42); ctx.lineTo(x + 4, y - 50); ctx.stroke();
    star(ctx, x, y - 66, 7);
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4); g.addColorStop(0, 'rgba(255,240,170,0.9)'); g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6c0'; ctx.beginPath();
  for (let k = 0; k < 8; k++) { const rr = k % 2 ? r * 0.35 : r; const a = (k / 8) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}

export const anim3d: Style = {
  id: 'anim3d',
  name: 'Animated 3D feature',
  blurb: 'Like a still from an animated feature film: chunky, rounded, toy-like forms with soft global-illumination shading, glossy highlights, rim light and contact shadows, under warm sunshine with a tilt-shift blur. Every character has big expressive eyes: eager little soldiers, sly dogs, and a sad stone giant missing its heart-stone. Traces are glowing glass tubes, the bound route is polished gold, the pulse is a blooming orb of light.',
  unity: '3D with URP: rounded low-to-mid-poly models, soft baked lighting or real-time GI, an outline-free toon-PBR material, bloom and depth of field. The most expensive look here (character modelling and animation), and the most emotionally appealing.',
  ground(ctx, R) {
    const g = ctx.createLinearGradient(0, 0, MAP_W, MAP_H);
    g.addColorStop(0, '#9ad86a'); g.addColorStop(1, '#5aa84a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // gentle rolling hills: big soft light and shadow blobs
    for (let i = 0; i < 34; i++) {
      const x = R() * MAP_W, y = R() * MAP_H, r = 90 + R() * 160;
      const hg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      hg.addColorStop(0, 'rgba(220,255,170,0.32)'); hg.addColorStop(0.45, 'rgba(120,190,90,0)'); hg.addColorStop(0.8, 'rgba(40,90,50,0.12)'); hg.addColorStop(1, 'rgba(40,90,50,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // fine grass and tiny glossy flowers
    for (let i = 0; i < 1800; i++) { ctx.fillStyle = R() < 0.5 ? 'rgba(80,150,60,0.35)' : 'rgba(180,230,120,0.35)'; ctx.fillRect(R() * MAP_W, R() * MAP_H, 1.5, 4); }
    for (let i = 0; i < 320; i++) sphere(ctx, R() * MAP_W, R() * MAP_H, 2 + R() * 1.6, ['#ffffff', '#ffd84a', '#ff8ab0', '#b49aff'][Math.floor(R() * 4)], 0.9);
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#c8b890'; ctx.lineWidth = 42; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = '#2a7ac8'; ctx.lineWidth = 34; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = '#4ab0e8'; ctx.lineWidth = 22; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; smooth(ctx, river.map((p) => ({ x: p.x - 6, y: p.y - 6 })), 80); ctx.stroke();
    ctx.fillStyle = '#c8b890'; ctx.beginPath(); ctx.ellipse(pond.x, pond.y + 4, 98, 64, -0.15, 0, Math.PI * 2); ctx.fill();
    const pg = ctx.createRadialGradient(pond.x - 30, pond.y - 20, 4, pond.x, pond.y, 92);
    pg.addColorStop(0, '#bff0ff'); pg.addColorStop(0.4, '#4ab0e8'); pg.addColorStop(1, '#1a5aa8');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 90, 56, -0.15, 0, Math.PI * 2); ctx.fill();
    // caustic ripples and a glossy sky reflection
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.4;
    const R = rng(3); for (let i = 0; i < 14; i++) { const x = pond.x - 60 + R() * 120, y = pond.y - 30 + R() * 60; ctx.beginPath(); ctx.arc(x, y, 6 + R() * 6, 0.2, 2.4); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(pond.x - 34, pond.y - 26, 26, 6, -0.3, 0, Math.PI * 2); ctx.fill();
    // ducks
    for (const [dx, dy] of [[-20, 4], [24, 18]]) { contact(ctx, pond.x + dx + 2, pond.y + dy + 6, 12, 4, 0.3); bean(ctx, pond.x + dx, pond.y + dy + 6, 20, 12, '#ffd84a'); sphere(ctx, pond.x + dx + 8, pond.y + dy - 6, 6, '#ffd84a'); ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.ellipse(pond.x + dx + 14, pond.y + dy - 5, 4, 2, 0, 0, Math.PI * 2); ctx.fill(); }
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(60,90,40,0.35)'; ctx.lineWidth = 48; smooth(ctx, pts.map((p) => ({ x: p.x + 4, y: p.y + 6 }))); ctx.stroke();
    ctx.strokeStyle = kind === 'mill' ? '#c8a070' : '#a8a4a0'; ctx.lineWidth = 40; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = kind === 'mill' ? '#e8c898' : '#d0ccc8'; ctx.lineWidth = 28; smooth(ctx, pts.map((p) => ({ x: p.x - 2, y: p.y - 3 }))); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 6; smooth(ctx, pts.map((p) => ({ x: p.x - 6, y: p.y - 8 }))); ctx.stroke();
    const R = rng(kind === 'mill' ? 7 : 8);
    for (let i = 1; i < pts.length; i++) for (let t = 0; t < 1; t += kind === 'king' ? 0.05 : 0.12) {
      const a = pts[i - 1], b = pts[i]; const x = a.x + (b.x - a.x) * t + (R() - 0.5) * 26, y = a.y + (b.y - a.y) * t + (R() - 0.5) * 26;
      sphere(ctx, x, y, kind === 'king' ? 4 + R() * 2 : 2 + R() * 1.5, kind === 'king' ? '#bab4ae' : '#a8885a', 0.5);
    }
  },
  bridge(ctx, at, a) {
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15);
    contact(ctx, 6, 30, 64, 16, 0.45);
    const g = ctx.createLinearGradient(0, -30, 0, 30); g.addColorStop(0, '#e8e0d4'); g.addColorStop(1, '#8a8278');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-52, -28, 104, 56, 14); ctx.fill();
    for (const yy of [-32, 24]) { const rg = ctx.createLinearGradient(0, yy, 0, yy + 9); rg.addColorStop(0, '#fff8ee'); rg.addColorStop(1, '#a89e92'); ctx.fillStyle = rg; ctx.beginPath(); ctx.roundRect(-54, yy, 108, 9, 4.5); ctx.fill(); }
    ctx.restore();
  },
  tree(ctx, x, y, r, k) {
    contact(ctx, x + r * 0.4, y + 3, r * 1.3, r * 0.42, 0.45);
    bean(ctx, x, y + 2, r * 0.36, r * 0.9, '#8a5a3a');
    if (k > 0.65) {
      // a rounded pine: stacked soft cones
      for (let i = 0; i < 3; i++) { const yy = y - r * (0.7 + i * 0.55), w = r * (1 - i * 0.22); const g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, '#6ac85a'); g.addColorStop(0.5, '#2e8a44'); g.addColorStop(1, '#14502a'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w, yy + r * 0.3); ctx.quadraticCurveTo(x, yy - r * 0.9, x + w, yy + r * 0.3); ctx.quadraticCurveTo(x, yy + r * 0.5, x - w, yy + r * 0.3); ctx.fill(); }
    } else {
      // a lollipop tree: a cluster of soft glossy spheres
      const col = k < 0.2 ? '#e88a3a' : k < 0.35 ? '#e8c43a' : '#4aa84a';
      sphere(ctx, x + r * 0.35, y - r * 0.9, r * 0.6, mix(col, -0.15), 0.4);
      sphere(ctx, x - r * 0.35, y - r * 0.95, r * 0.62, col, 0.5);
      sphere(ctx, x, y - r * 1.45, r * 0.62, mix(col, 0.08), 0.7);
    }
  },
  ley(ctx, edges, knots) {
    // faint glowing grooves in the grass
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.setLineDash([1, 9]);
    for (const e of edges) { ctx.beginPath(); ctx.moveTo(e[0].x, e[0].y); for (const p of e.slice(1)) ctx.lineTo(p.x, p.y); ctx.stroke(); }
    ctx.restore();
    for (const k of knots) sphere(ctx, k.x, k.y, 4, '#d8f0ff', 0.9);
  },
  bound(ctx, path) { tube(ctx, path, 13, '#e8a82a', 'rgba(255,200,80,0.9)'); },
  trace(ctx, path) {
    tube(ctx, path, 10, '#3a9af0', 'rgba(110,190,255,1)');
    // light travelling inside the glass
    for (let i = 3; i < path.length; i += 7) { const g = ctx.createRadialGradient(path[i].x, path[i].y, 0, path[i].x, path[i].y, 10); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(160,220,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(path[i].x, path[i].y, 10, 0, Math.PI * 2); ctx.fill(); }
  },
  fire(ctx, pts) {
    // volumetric cartoon flames: layered soft blobs
    for (const p of pts) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 32); g.addColorStop(0, 'rgba(255,180,80,0.5)'); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 32, 0, Math.PI * 2); ctx.fill(); }
    pts.forEach((p, i) => {
      if (i % 2) return;
      const blob = (dy: number, r: number, c0: string, c1: string) => { const g = ctx.createRadialGradient(p.x - r * 0.3, p.y + dy - r * 0.3, 0, p.x, p.y + dy, r); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p.x - r, p.y + dy); ctx.quadraticCurveTo(p.x - r, p.y + dy - r * 1.6, p.x, p.y + dy - r * 2.4); ctx.quadraticCurveTo(p.x + r, p.y + dy - r * 1.6, p.x + r, p.y + dy); ctx.arc(p.x, p.y + dy, r, 0, Math.PI); ctx.fill(); };
      blob(2, 10, '#ffb040', '#e84a1a'); blob(0, 6.5, '#fff0a0', '#ffa020'); blob(-1, 3.4, '#ffffff', '#fff0a0');
    });
  },
  foundation(ctx, x, y) {
    contact(ctx, x + 3, y + 3, 32, 12, 0.35);
    const g = ctx.createLinearGradient(x - 30, y - 12, x + 30, y + 12); g.addColorStop(0, '#f4ece4'); g.addColorStop(1, '#a8a098');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 2, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - 12, y - 5, 8, 2.4, -0.2, 0, Math.PI * 2); ctx.fill();
  },
  tower,
  enemy,
  castle(ctx, at) {
    const x = at.x, y = at.y;
    contact(ctx, x + 20, y + 120, 120, 30, 0.45);
    const wall = ctx.createLinearGradient(x - 70, 0, x + 66, 0); wall.addColorStop(0, '#fff4e4'); wall.addColorStop(0.5, '#e8d8c0'); wall.addColorStop(1, '#a89880');
    ctx.fillStyle = wall; ctx.beginPath(); ctx.roundRect(x - 70, y - 126, 136, 252, 24); ctx.fill();
    // chunky round towers with glossy blue cones
    for (const [tx, ty, h] of [[x - 50, y - 118, 90], [x - 50, y + 118, 90], [x + 20, y - 40, 150]] as const) {
      bean(ctx, tx, ty + 30, 44, h, '#f4e8d4');
      const cg = ctx.createLinearGradient(tx - 30, 0, tx + 30, 0); cg.addColorStop(0, '#7ab0ff'); cg.addColorStop(0.5, '#3a6ad8'); cg.addColorStop(1, '#1a3488');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(tx - 30, ty + 34 - h); ctx.quadraticCurveTo(tx - 8, ty + 10 - h, tx, ty - 26 - h * 0.4); ctx.quadraticCurveTo(tx + 8, ty + 10 - h, tx + 30, ty + 34 - h); ctx.quadraticCurveTo(tx, ty + 44 - h, tx - 30, ty + 34 - h); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(tx - 12, ty + 8 - h * 0.8, 3, 12, 0.3, 0, Math.PI * 2); ctx.fill();
      sphere(ctx, tx, ty - 28 - h * 0.4, 5, '#f2b83a');
      // glowing windows
      ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.roundRect(tx - 5, ty + 20 - h * 0.5, 10, 16, 5); ctx.fill();
    }
    // the gate
    const gg = ctx.createLinearGradient(x - 82, 0, x - 58, 0); gg.addColorStop(0, '#8a5a3a'); gg.addColorStop(1, '#4a2a1a');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.roundRect(x - 82, y - 26, 26, 52, [13, 13, 2, 2]); ctx.fill();
    sphere(ctx, x - 62, y + 2, 2.4, '#f2b83a');
  },
  mill(ctx, at) {
    contact(ctx, at.x + 12, at.y + 30, 70, 14, 0.4);
    bean(ctx, at.x, at.y + 28, 80, 44, '#f4e4cc');
    const rg = ctx.createLinearGradient(at.x - 50, 0, at.x + 50, 0); rg.addColorStop(0, '#ff8a6a'); rg.addColorStop(0.5, '#d8443a'); rg.addColorStop(1, '#8a2420');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(at.x - 50, at.y - 10); ctx.quadraticCurveTo(at.x - 10, at.y - 64, at.x, at.y - 56); ctx.quadraticCurveTo(at.x + 10, at.y - 64, at.x + 50, at.y - 10); ctx.quadraticCurveTo(at.x, at.y, at.x - 50, at.y - 10); ctx.fill();
    ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.roundRect(at.x + 12, at.y - 2, 12, 14, 6); ctx.fill();
    // a chunky water wheel
    sphere(ctx, at.x - 56, at.y + 10, 22, '#a8784a', 0.4);
    ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(at.x - 56, at.y + 10); ctx.lineTo(at.x - 56 + Math.cos(a) * 20, at.y + 10 + Math.sin(a) * 20); ctx.stroke(); }
    sphere(ctx, at.x - 56, at.y + 10, 5, '#8a5a3a');
  },
  inkwell(ctx, at) {
    // a glossy glass ink bottle full of glowing magic ink
    contact(ctx, at.x + 8, at.y + 28, 40, 12, 0.5);
    const g = ctx.createRadialGradient(at.x, at.y + 4, 0, at.x, at.y + 4, 70); g.addColorStop(0, 'rgba(120,190,255,0.5)'); g.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(at.x, at.y + 4, 70, 0, Math.PI * 2); ctx.fill();
    sphere(ctx, at.x, at.y + 6, 28, '#2a4ab8', 0.9);
    const ig = ctx.createRadialGradient(at.x, at.y + 12, 0, at.x, at.y + 12, 22); ig.addColorStop(0, 'rgba(160,230,255,0.9)'); ig.addColorStop(1, 'rgba(60,120,255,0)');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(at.x, at.y + 12, 22, 0, Math.PI * 2); ctx.fill();
    bean(ctx, at.x, at.y - 16, 18, 16, '#f2b83a');
    // a feather quill
    ctx.save(); ctx.translate(at.x + 4, at.y - 22); ctx.rotate(-0.6);
    const fg = ctx.createLinearGradient(-8, 0, 8, 0); fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, '#c8c0d8');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-12, -40, 0, -76); ctx.quadraticCurveTo(12, -40, 0, 0); ctx.fill();
    ctx.restore();
  },
  pulse(ctx, at, trail) {
    tube(ctx, [trail, at], 8, '#8ad0ff', 'rgba(160,220,255,1)');
    const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, 40); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(170,225,255,0.9)'); g.addColorStop(1, 'rgba(110,190,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(at.x, at.y, 40, 0, Math.PI * 2); ctx.fill();
    sphere(ctx, at.x, at.y, 10, '#d8f0ff', 1);
    const R = rng(9); for (let i = 0; i < 8; i++) star(ctx, at.x + (R() - 0.5) * 70, at.y + (R() - 0.5) * 60, 2.4 + R() * 2);
  },
  post(ctx) {
    // warm key light from the upper left, cool fill in the shadows
    const light = ctx.createRadialGradient(MAP_W * 0.28, MAP_H * 0.2, 60, MAP_W * 0.45, MAP_H * 0.45, 1100);
    light.addColorStop(0, 'rgba(255,235,180,0.22)'); light.addColorStop(0.6, 'rgba(255,235,180,0)'); light.addColorStop(1, 'rgba(60,70,140,0.22)');
    ctx.fillStyle = light; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // tilt-shift: soften the top and bottom of the frame as if out of focus
    const blur = (y0: number, y1: number, top: boolean) => {
      const img = ctx.getImageData(0, y0, MAP_W, y1 - y0);
      const c = document.createElement('canvas'); c.width = MAP_W / 6; c.height = (y1 - y0) / 6;
      const cx = c.getContext('2d')!; const t = document.createElement('canvas'); t.width = MAP_W; t.height = y1 - y0; t.getContext('2d')!.putImageData(img, 0, 0);
      cx.drawImage(t, 0, 0, c.width, c.height);
      const mask = ctx.createLinearGradient(0, y0, 0, y1);
      mask.addColorStop(top ? 0 : 1, 'rgba(0,0,0,1)'); mask.addColorStop(top ? 1 : 0, 'rgba(0,0,0,0)');
      const o = document.createElement('canvas'); o.width = MAP_W; o.height = y1 - y0; const ox = o.getContext('2d')!;
      ox.imageSmoothingQuality = 'high'; ox.drawImage(c, 0, 0, MAP_W, y1 - y0);
      ox.globalCompositeOperation = 'destination-in'; const mg = ox.createLinearGradient(0, 0, 0, y1 - y0); mg.addColorStop(top ? 0 : 1, 'rgba(0,0,0,0.95)'); mg.addColorStop(top ? 1 : 0, 'rgba(0,0,0,0)'); ox.fillStyle = mg; ox.fillRect(0, 0, MAP_W, y1 - y0);
      ctx.drawImage(o, 0, y0);
      void mask;
    };
    blur(0, 170, true);
    blur(MAP_H - 150, MAP_H, false);
    // gentle vignette and bloom haze
    const v = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, 420, MAP_W / 2, MAP_H / 2, 1000);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,20,50,0.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, MAP_W, MAP_H);
  },
};
