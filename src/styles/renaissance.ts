// 8. An Italian Renaissance panel painting: tempera and oil glazes, sfumato distance,
// Tuscan architecture, sinopia underdrawing for the traces and tooled gold leaf for binds.
import type { FieldEnemyType as EnemyType, FieldTowerType as TowerType } from '../balance';
import { MAP_W, MAP_H, line, smooth, rng, type Style, type Vec } from './scene';

const C = {
  verde: '#7d8a5a', verdeDark: '#4e5a34', verdeLight: '#a9b07a',
  ochre: '#c9a56a', ochreDark: '#8f6e3c', ochreLight: '#e7cf9a',
  umber: '#4a3320', sienna: '#9a4f2c', terracotta: '#b65a36', terracottaDark: '#7a351c',
  marble: '#ece4d4', marbleShade: '#b9ae98', stone: '#cdbb98', stoneDark: '#8a7656',
  lapis: '#24417a', lapisDark: '#142a52', azure: '#7fa2c4',
  gold: '#c99a36', goldLight: '#f4d98a', goldDark: '#7a5714',
  vermilion: '#b8322a', sinopia: '#a04a32', flesh: '#e2b896',
  cypress: '#26331c', pine: '#3e4c2a', olive: '#8c9a72',
};

function grad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, a: string, b: string, c: string) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, a); g.addColorStop(0.5, b); g.addColorStop(1, c);
  return g;
}
function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.4) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(40,25,10,${a})`); g.addColorStop(1, 'rgba(40,25,10,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2); ctx.fill();
}
/** Fine parallel strokes, as tempera is modelled. */
function hatch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, angle: number, gap: number, color: string) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(angle);
  ctx.strokeStyle = color; ctx.lineWidth = 0.7;
  const r = Math.hypot(w, h);
  for (let i = -r; i < r; i += gap) { ctx.beginPath(); ctx.moveTo(-r, i); ctx.lineTo(r, i); ctx.stroke(); }
  ctx.restore();
}
/** Swallowtail (Ghibelline) merlons along a wall top. */
function merlons(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, fill: string) {
  ctx.fillStyle = fill;
  for (let x = x0; x < x1 - 8; x += 14) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 10); ctx.lineTo(x + 4, y - 7); ctx.lineTo(x + 8, y - 10); ctx.lineTo(x + 8, y); ctx.closePath(); ctx.fill();
  }
}
function arch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w / 2); ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
}
function halo(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, C.goldLight); g.addColorStop(0.7, C.gold); g.addColorStop(1, C.goldDark);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  // punched tooling around the rim
  ctx.fillStyle = C.goldDark;
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78, 0.9, 0, Math.PI * 2); ctx.fill(); }
}

function marker(ctx: CanvasRenderingContext2D, x: number, y: number, mark: 'traced' | 'bound' | null) {
  if (mark === 'bound') { halo(ctx, x, y, 9); return; }
  if (mark === 'traced') {
    // a red-chalk sigil
    ctx.strokeStyle = C.vermilion; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
  }
}

// ── Towers ──────────────────────────────────────────────────────────────────

function tower(ctx: CanvasRenderingContext2D, type: TowerType, x: number, y: number, mark: 'traced' | 'bound' | null) {
  shadow(ctx, x + 22, y + 6, 40, 13, 0.45);
  if (type === 'bramble') {
    // round stone tower overgrown with ivy and roses
    ctx.fillStyle = grad(ctx, x - 15, 0, x + 15, 0, C.marble, C.stone, C.stoneDark);
    ctx.fillRect(x - 15, y - 58, 30, 58);
    ctx.beginPath(); ctx.ellipse(x, y, 15, 5, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(90,70,40,0.35)'; ctx.lineWidth = 0.6;
    for (let yy = y - 6; yy > y - 58; yy -= 6) { ctx.beginPath(); ctx.moveTo(x - 15, yy); ctx.lineTo(x + 15, yy); ctx.stroke(); }
    merlons(ctx, x - 16, x + 18, y - 58, C.stone);
    arch(ctx, x, y - 22, 8, 16, '#2a1c10');
    const R = rng(Math.round(x * 7 + y));
    // ivy climbs in clusters, lit from the upper left
    for (let c = 0; c < 7; c++) {
      const cx2 = x - 12 + R() * 24, cy2 = y - 6 - R() * 52;
      for (let i = 0; i < 9; i++) {
        const lx = cx2 + (R() - 0.5) * 12, ly = cy2 + (R() - 0.5) * 12;
        ctx.fillStyle = ['#7a9a44', '#5a7a30', '#3e5a22', '#2e4418'][Math.floor(R() * 4)];
        ctx.beginPath(); ctx.ellipse(lx, ly, 4, 2.8, R() * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(210,220,150,0.5)'; ctx.beginPath(); ctx.ellipse(cx2 - 3, cy2 - 3, 2.4, 1.4, -0.5, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#d8606a' : '#f0d0c8'; ctx.beginPath(); ctx.arc(x - 12 + R() * 24, y - 8 - R() * 46, 1.8, 0, Math.PI * 2); ctx.fill(); }
  } else if (type === 'ember') {
    // terracotta kiln with an arched mouth
    ctx.fillStyle = grad(ctx, x - 24, 0, x + 24, 0, '#d98a5e', C.terracotta, C.terracottaDark);
    ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.quadraticCurveTo(x - 28, y - 34, x - 8, y - 50); ctx.lineTo(x - 6, y - 64); ctx.lineTo(x + 6, y - 64); ctx.lineTo(x + 8, y - 50); ctx.quadraticCurveTo(x + 28, y - 34, x + 22, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,35,15,0.4)'; ctx.lineWidth = 0.7;
    for (let yy = y - 6; yy > y - 46; yy -= 5) { ctx.beginPath(); ctx.moveTo(x - 22 + (y - yy) * 0.2, yy); ctx.lineTo(x + 22 - (y - yy) * 0.2, yy); ctx.stroke(); }
    const g = ctx.createRadialGradient(x, y - 9, 1, x, y - 9, 14);
    g.addColorStop(0, '#fff2b8'); g.addColorStop(0.5, '#f08a2e'); g.addColorStop(1, '#7a2a10');
    arch(ctx, x, y, 14, 20, '#2a1208'); ctx.save(); ctx.globalAlpha = 0.95; arch(ctx, x, y, 11, 17, g as unknown as string); ctx.restore();
    ctx.fillStyle = 'rgba(150,140,130,0.35)'; ctx.beginPath(); ctx.arc(x + 3, y - 74, 7, 0, Math.PI * 2); ctx.arc(x - 2, y - 86, 10, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'bell') {
    // a Tuscan campanile: brick shaft, marble string courses, open loggia, terracotta pyramid roof
    ctx.fillStyle = grad(ctx, x - 12, 0, x + 12, 0, '#d0896a', '#a85a3a', '#6e3420');
    ctx.fillRect(x - 12, y - 70, 24, 70);
    ctx.fillStyle = C.marble; for (const yy of [y - 24, y - 46, y - 70]) ctx.fillRect(x - 13, yy - 2, 26, 3);
    arch(ctx, x - 5, y - 50, 6, 14, '#1c120a'); arch(ctx, x + 5, y - 50, 6, 14, '#1c120a');
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x - 5, y - 55, 2.4, 0, Math.PI * 2); ctx.arc(x + 5, y - 55, 2.4, 0, Math.PI * 2); ctx.fill();
    arch(ctx, x, y - 28, 6, 12, '#1c120a');
    ctx.fillStyle = grad(ctx, x - 15, 0, x + 15, 0, '#d0703e', C.terracotta, C.terracottaDark);
    ctx.beginPath(); ctx.moveTo(x - 15, y - 72); ctx.lineTo(x, y - 96); ctx.lineTo(x + 15, y - 72); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - 96); ctx.lineTo(x, y - 104); ctx.moveTo(x - 3, y - 101); ctx.lineTo(x + 3, y - 101); ctx.stroke();
  } else {
    // a bronze fountain with verdigris, on a marble pedestal
    ctx.fillStyle = grad(ctx, x - 10, 0, x + 10, 0, C.marble, C.marbleShade, '#8a7e6a');
    ctx.fillRect(x - 8, y - 30, 16, 30); ctx.fillRect(x - 14, y - 6, 28, 6);
    ctx.fillStyle = grad(ctx, x - 26, 0, x + 26, 0, '#8ad0b6', '#4f9a83', '#24493f');
    ctx.beginPath(); ctx.moveTo(x - 26, y - 46); ctx.quadraticCurveTo(x - 22, y - 30, x, y - 31); ctx.quadraticCurveTo(x + 22, y - 30, x + 26, y - 46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = grad(ctx, x - 26, 0, x + 26, 0, '#e6a56c', '#a8683a', '#5e3418'); ctx.beginPath(); ctx.ellipse(x, y - 46, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a8aa4'; ctx.beginPath(); ctx.ellipse(x, y - 46, 22, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    // a small putto on top, and jets of water
    ctx.fillStyle = grad(ctx, x - 5, 0, x + 5, 0, '#8ad0b6', '#4f9a83', '#24493f');
    ctx.beginPath(); ctx.arc(x, y - 62, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 3.5, y - 59, 7, 10);
    ctx.strokeStyle = 'rgba(220,240,255,0.85)'; ctx.lineWidth = 1.2;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y - 64); ctx.quadraticCurveTo(x + d * 14, y - 80, x + d * 20, y - 48); ctx.stroke(); }
  }
  marker(ctx, x + 22, y - 76, mark);
}

// ── Enemies ─────────────────────────────────────────────────────────────────

function enemy(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number) {
  ctx.save(); ctx.translate(x, y);
  if (type === 'cairn') {
    // a broken marble colossus with an empty chest
    shadow(ctx, 14, 8, 44, 12, 0.5);
    ctx.scale(dir, 1);
    const m = (x0: number, y0: number, x1: number, y1: number) => grad(ctx, x0, y0, x1, y1, '#fbf6ec', C.marble, C.marbleShade);
    ctx.fillStyle = m(-14, 0, 14, 0); ctx.fillRect(-14, -18, 10, 28); ctx.fillRect(4, -18, 10, 28);
    ctx.fillStyle = m(-24, -70, 24, -14);
    ctx.beginPath(); ctx.moveTo(-20, -16); ctx.lineTo(-26, -58); ctx.quadraticCurveTo(0, -68, 26, -58); ctx.lineTo(20, -16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = m(-34, -60, -20, -20); ctx.beginPath(); ctx.ellipse(-30, -38, 6, 18, 0.2, 0, Math.PI * 2); ctx.fill();
    // the right arm is broken off at the shoulder
    ctx.fillStyle = C.marbleShade; ctx.beginPath(); ctx.ellipse(27, -56, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    // head with classical curls
    ctx.fillStyle = m(-9, -86, 9, -68); ctx.beginPath(); ctx.ellipse(0, -76, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.marbleShade; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 2.6, -85, 2.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(120,105,85,0.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-16, -50); ctx.lineTo(-8, -42); ctx.lineTo(-12, -30); ctx.moveTo(14, -24); ctx.lineTo(18, -36); ctx.stroke(); // cracks
    // the empty recess where the name-stone belongs
    const g = ctx.createRadialGradient(0, -40, 1, 0, -40, 11);
    g.addColorStop(0, '#120c06'); g.addColorStop(1, '#5a4c3a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-8, -32); ctx.lineTo(-7, -46); ctx.quadraticCurveTo(0, -51, 7, -46); ctx.lineTo(8, -32); ctx.closePath(); ctx.fill();
    ctx.restore();
    return;
  }
  if (type === 'hound') {
    shadow(ctx, 4, 7, 22, 5, 0.45);
    ctx.scale(dir * 1.1, 1.1);
    ctx.strokeStyle = '#1c1814'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); for (const lx of [-12, -8, 8, 12]) { ctx.moveTo(lx, -1); ctx.lineTo(lx + (lx > 0 ? 2 : -2), 8); } ctx.stroke();
    ctx.fillStyle = grad(ctx, 0, -12, 0, 2, '#5a504a', '#2a2420', '#120e0c');
    ctx.beginPath(); ctx.moveTo(-22, -6); ctx.quadraticCurveTo(-28, -14, -30, -10); ctx.quadraticCurveTo(-22, -8, -16, -5); ctx.quadraticCurveTo(-4, -12, 10, -6);
    ctx.lineTo(14, -14); ctx.lineTo(16, -9); ctx.lineTo(26, -6); ctx.lineTo(22, -2); ctx.lineTo(12, 0); ctx.quadraticCurveTo(0, 4, -15, 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(11.5, -1); ctx.stroke();
    ctx.fillStyle = '#f0e8d0'; ctx.beginPath(); ctx.arc(19, -7, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  // levy and bearer: figures in doublets and morions
  shadow(ctx, 4, 9, 12, 4, 0.45);
  ctx.scale(dir * 1.25, 1.25);
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(-3, 9); ctx.moveTo(2, 2); ctx.lineTo(3, 9); ctx.stroke();
  const tunic = type === 'bearer' ? [ '#e06a5a', C.vermilion, '#6e1a14'] : ['#7a9ac0', '#3f5f8a', '#1e2f4a'];
  ctx.fillStyle = grad(ctx, -7, -12, 7, 4, tunic[0], tunic[1], tunic[2]);
  ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(-7, -9); ctx.quadraticCurveTo(0, -14, 7, -9); ctx.lineTo(6, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,15,10,0.35)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(-3, 2); ctx.moveTo(2, -9); ctx.lineTo(3, 2); ctx.stroke();
  ctx.fillStyle = grad(ctx, -3, -18, 3, -12, '#f4d0b0', C.flesh, '#a8785a'); ctx.beginPath(); ctx.arc(0, -15, 3.5, 0, Math.PI * 2); ctx.fill();
  if (type === 'levy') {
    // morion helmet with a crest, a pike, and the reed shield with its white flood line
    ctx.fillStyle = grad(ctx, -7, -22, 7, -16, '#f0f0ea', '#a8a8a0', '#5a5a54');
    ctx.beginPath(); ctx.ellipse(0, -18, 7.5, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -19, 4.2, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, -22); ctx.quadraticCurveTo(0, -27, 3, -22); ctx.fill();
    ctx.strokeStyle = '#5a3e22'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(-5, -36); ctx.stroke();
    ctx.fillStyle = '#d8d4c8'; ctx.beginPath(); ctx.moveTo(-5, -41); ctx.lineTo(-3, -35); ctx.lineTo(-7, -35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = grad(ctx, 4, -13, 13, 6, '#f0dca0', '#c9a96a', '#8a6e3a');
    ctx.beginPath(); ctx.moveTo(4, -13); ctx.quadraticCurveTo(13, -14, 13, -4); ctx.quadraticCurveTo(13, 6, 4, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fbfaf4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4.5, 0); ctx.lineTo(12.8, 0); ctx.stroke();
  } else {
    // bearer: the name-stone held aloft, and a gilded halo to mark it
    ctx.strokeStyle = C.vermilion; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-8, -30); ctx.moveTo(6, -8); ctx.lineTo(8, -30); ctx.stroke();
    ctx.fillStyle = grad(ctx, -9, -44, 9, -28, '#e8e4d8', '#a8a498', '#5a5850');
    ctx.beginPath(); ctx.moveTo(-9, -30); ctx.lineTo(-8, -41); ctx.quadraticCurveTo(0, -46, 8, -41); ctx.lineTo(9, -30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -39); ctx.lineTo(0, -33); ctx.lineTo(3, -39); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(x, y); halo(ctx, 0, -20 * 1.25, 7); ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * 1.25, 1.25);
    ctx.fillStyle = grad(ctx, -3, -18, 3, -12, '#f4d0b0', C.flesh, '#a8785a'); ctx.beginPath(); ctx.arc(0, -15, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ── The style ───────────────────────────────────────────────────────────────

export const renaissance: Style = {
  id: 'renaissance',
  name: 'Renaissance panel painting',
  blurb: 'An Italian altarpiece landscape: terra verde ground modelled in fine tempera hatching, vineyards and olive groves, cypresses and umbrella pines, a Tuscan fortress with swallowtail battlements and a terracotta dome, blue hills dissolving into haze. Traces are red-chalk underdrawing, binds are tooled gold leaf, the pulse is a gilded orb, and the Cairn-Born is a broken marble colossus.',
  unity: 'Hand-painted 2D sprites and textures (or textured 3D) with a warm key light and a haze gradient for distance. The richest look so far, and the most art per asset; strong for a premium release, slow to iterate on.',
  ground(ctx, R) {
    ctx.fillStyle = C.verde; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // fields: wheat, vineyards, olive groves, fallow
    for (let i = 0; i < 44; i++) {
      const cx = R() * MAP_W, cy = R() * MAP_H, w = 120 + R() * 200, h = 70 + R() * 110, a = -0.25 + R() * 0.5;
      const kind = Math.floor(R() * 4);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = ['rgba(222,190,110,0.55)', 'rgba(120,135,80,0.5)', 'rgba(150,160,120,0.45)', 'rgba(170,140,90,0.45)'][kind];
      ctx.fillRect(-w / 2, -h / 2, w, h);
      if (kind === 0) { ctx.strokeStyle = 'rgba(170,130,60,0.45)'; ctx.lineWidth = 0.8; for (let x = -w / 2; x < w / 2; x += 4) { ctx.beginPath(); ctx.moveTo(x, -h / 2); ctx.lineTo(x + 2, h / 2); ctx.stroke(); } }
      if (kind === 1) { ctx.fillStyle = 'rgba(60,75,35,0.75)'; for (let y = -h / 2 + 5; y < h / 2; y += 9) for (let x = -w / 2 + 4; x < w / 2; x += 6) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); } }
      if (kind === 2) { for (let y = -h / 2 + 10; y < h / 2; y += 18) for (let x = -w / 2 + 10; x < w / 2; x += 18) { ctx.fillStyle = 'rgba(70,60,40,0.35)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 3, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.olive; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(220,225,200,0.5)'; ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 2, 0, Math.PI * 2); ctx.fill(); } }
      ctx.strokeStyle = 'rgba(80,60,30,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    // tempera modelling: fine cross-hatching in two directions
    hatch(ctx, 0, 0, MAP_W, MAP_H, 0.5, 7, 'rgba(60,70,35,0.07)');
    hatch(ctx, 0, 0, MAP_W, MAP_H, -0.6, 9, 'rgba(240,230,190,0.05)');
    // distant blue hills along the top, fading in sfumato
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = ['rgba(127,162,196,0.35)', 'rgba(150,175,200,0.28)', 'rgba(175,195,210,0.22)'][k];
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= MAP_W; x += 40) ctx.lineTo(x, 34 + k * 12 + Math.sin(x * 0.006 + k * 2) * 18 + Math.sin(x * 0.017 + k) * 8);
      ctx.lineTo(MAP_W, 0); ctx.closePath(); ctx.fill();
    }
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(110,90,55,0.7)'; ctx.lineWidth = 40; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = '#5f8a9a'; ctx.lineWidth = 32; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = 'rgba(170,205,220,0.6)'; ctx.lineWidth = 12; smooth(ctx, river, 80); ctx.stroke();
    ctx.fillStyle = 'rgba(110,90,55,0.7)'; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 96, 62, -0.15, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(pond.x - 30, pond.y - 20, 5, pond.x, pond.y, 95);
    g.addColorStop(0, '#b8d4dc'); g.addColorStop(0.5, '#6f97a6'); g.addColorStop(1, '#3f6474');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 90, 56, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,250,0.7)'; ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) { const x = pond.x - 60 + i * 12, y = pond.y - 26 + (i % 4) * 14; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 5, y - 2, x + 10, y); ctx.stroke(); }
    // swans, of course
    for (const [sx, sy] of [[pond.x - 30, pond.y - 8], [pond.x + 22, pond.y + 12]]) {
      ctx.fillStyle = '#fbf8f0'; ctx.beginPath(); ctx.ellipse(sx, sy, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fbf8f0'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx + 6, sy - 2); ctx.quadraticCurveTo(sx + 12, sy - 14, sx + 8, sy - 15); ctx.stroke();
      ctx.fillStyle = '#e07a2a'; ctx.beginPath(); ctx.moveTo(sx + 8, sy - 16); ctx.lineTo(sx + 12, sy - 14); ctx.lineTo(sx + 8, sy - 13); ctx.fill();
    }
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(110,80,45,0.6)'; ctx.lineWidth = 42; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = kind === 'mill' ? C.ochre : '#cbbfa6'; ctx.lineWidth = 34; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = kind === 'mill' ? C.ochreLight : '#e6dcc6'; ctx.lineWidth = 16; smooth(ctx, pts); ctx.stroke();
    if (kind === 'king') {
      // Roman paving: fine joints across the road
      ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(110,95,70,0.45)'; ctx.setLineDash([1.2, 9]); ctx.lineWidth = 32; smooth(ctx, pts); ctx.stroke(); ctx.restore();
    } else {
      const R = rng(3);
      ctx.fillStyle = 'rgba(120,95,60,0.6)';
      for (let i = 1; i < pts.length; i++) for (let t = 0; t < 1; t += 0.05) { const x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t + (R() - 0.5) * 24, y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t + (R() - 0.5) * 24; ctx.beginPath(); ctx.arc(x, y, 1 + R(), 0, Math.PI * 2); ctx.fill(); }
    }
  },
  bridge(ctx, at, a) {
    // a Roman arched bridge in travertine
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15);
    shadow(ctx, 10, 26, 64, 20, 0.5);
    ctx.fillStyle = grad(ctx, -50, -30, 50, 30, C.marble, C.stone, C.stoneDark); ctx.fillRect(-50, -28, 100, 56);
    ctx.fillStyle = 'rgba(40,30,20,0.6)'; for (const x of [-26, 0, 26]) { ctx.beginPath(); ctx.ellipse(x, 28, 10, 8, 0, Math.PI, 0); ctx.fill(); }
    ctx.fillStyle = C.marble; ctx.fillRect(-52, -32, 104, 6); ctx.fillRect(-52, 22, 104, 6);
    ctx.strokeStyle = 'rgba(110,95,70,0.45)'; ctx.lineWidth = 0.7; for (let x = -46; x < 50; x += 8) { ctx.beginPath(); ctx.moveTo(x, -26); ctx.lineTo(x, 22); ctx.stroke(); }
    ctx.restore();
  },
  tree(ctx, x, y, r, k) {
    if (k > 0.62) {
      // cypress
      shadow(ctx, x + r * 0.8, y + 3, r * 1.3, r * 0.35, 0.4);
      ctx.fillStyle = grad(ctx, x - r * 0.45, 0, x + r * 0.45, 0, '#4e5e34', C.cypress, '#121a0c');
      ctx.beginPath(); ctx.moveTo(x, y - r * 2.6); ctx.quadraticCurveTo(x + r * 0.6, y - r, x + r * 0.35, y + 2); ctx.lineTo(x - r * 0.35, y + 2); ctx.quadraticCurveTo(x - r * 0.6, y - r, x, y - r * 2.6); ctx.fill();
      ctx.strokeStyle = 'rgba(140,150,90,0.35)'; ctx.lineWidth = 0.8; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x - r * 0.25, y - r * 0.45 * i); ctx.lineTo(x + r * 0.05, y - r * 0.45 * i - 3); ctx.stroke(); }
    } else if (k > 0.32) {
      // umbrella pine
      shadow(ctx, x + r, y + r * 0.5, r * 1.5, r * 0.45, 0.4);
      ctx.strokeStyle = '#5a3e22'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x - 2, y - r * 0.6, x + 2, y - r * 1.1); ctx.stroke();
      ctx.fillStyle = grad(ctx, x, y - r * 1.7, x, y - r * 0.8, '#7a8a4a', C.pine, '#1e2810');
      ctx.beginPath(); ctx.ellipse(x + 2, y - r * 1.25, r * 1.2, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(190,200,130,0.35)'; ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 1.4, r * 0.6, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // olive / oak
      shadow(ctx, x + r * 0.7, y + r * 0.4, r * 1.2, r * 0.4, 0.4);
      ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x, y - r * 0.4); ctx.stroke();
      for (let i = 0; i < 5; i++) { const a = i * 1.25; const bx = x + Math.cos(a) * r * 0.45, by = y - r * 0.8 + Math.sin(a) * r * 0.32; ctx.fillStyle = grad(ctx, bx - r * 0.5, by - r * 0.5, bx + r * 0.5, by + r * 0.5, '#b4be92', C.olive, '#4e5a3a'); ctx.beginPath(); ctx.arc(bx, by, r * 0.5, 0, Math.PI * 2); ctx.fill(); }
    }
  },
  ley(ctx, edges, knots) {
    // perspective construction lines, as in an underdrawing
    ctx.strokeStyle = 'rgba(160,74,50,0.32)'; ctx.lineWidth = 1; ctx.setLineDash([10, 4, 2, 4]);
    for (const e of edges) line(ctx, e);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(160,74,50,0.5)'; ctx.lineWidth = 1;
    for (const k of knots) { ctx.beginPath(); ctx.arc(k.x, k.y, 4, 0, Math.PI * 2); ctx.moveTo(k.x - 7, k.y); ctx.lineTo(k.x + 7, k.y); ctx.moveTo(k.x, k.y - 7); ctx.lineTo(k.x, k.y + 7); ctx.stroke(); }
  },
  bound(ctx, path) {
    // tooled gold leaf with punched dots
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.goldDark; ctx.lineWidth = 15; line(ctx, path);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 12; line(ctx, path);
    ctx.strokeStyle = C.goldLight; ctx.lineWidth = 4; line(ctx, path.map((p) => ({ x: p.x - 1.5, y: p.y - 1.5 })));
    ctx.fillStyle = C.goldDark;
    for (let i = 2; i < path.length; i += 2) { ctx.beginPath(); ctx.arc(path[i].x, path[i].y, 1.3, 0, Math.PI * 2); ctx.fill(); }
  },
  trace(ctx, path) {
    // sinopia: red-chalk underdrawing, hatched beside the line
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(184,50,42,0.25)'; ctx.lineWidth = 12; line(ctx, path);
    ctx.strokeStyle = C.sinopia; ctx.lineWidth = 4.5; line(ctx, path);
    ctx.strokeStyle = C.vermilion; ctx.lineWidth = 2; line(ctx, path.map((p) => ({ x: p.x + 1, y: p.y - 1 })));
    ctx.strokeStyle = 'rgba(160,74,50,0.6)'; ctx.lineWidth = 0.8;
    for (let i = 1; i < path.length; i += 2) {
      const a = path[i - 1], b = path[i]; const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(b.x + Math.cos(ang) * 4, b.y + Math.sin(ang) * 4); ctx.lineTo(b.x + Math.cos(ang) * 9 + 3, b.y + Math.sin(ang) * 9 - 3); ctx.stroke();
    }
  },
  fire(ctx, pts) {
    for (const p of pts) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 24); g.addColorStop(0, 'rgba(255,190,90,0.45)'); g.addColorStop(1, 'rgba(200,80,30,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, Math.PI * 2); ctx.fill(); }
    pts.forEach((p, i) => {
      if (i % 2) return;
      ctx.fillStyle = grad(ctx, p.x, p.y - 26, p.x, p.y + 4, '#fff6c8', i % 4 ? '#f6a23a' : '#e2622a', '#8a2a12');
      ctx.beginPath(); ctx.moveTo(p.x - 7, p.y + 4); ctx.bezierCurveTo(p.x - 9, p.y - 8, p.x - 2, p.y - 12, p.x, p.y - 26); ctx.bezierCurveTo(p.x + 3, p.y - 14, p.x + 9, p.y - 8, p.x + 7, p.y + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(120,110,100,0.25)'; ctx.beginPath(); ctx.arc(p.x + 4, p.y - 34, 7, 0, Math.PI * 2); ctx.fill();
    });
  },
  foundation(ctx, x, y) {
    // a veined marble disc
    shadow(ctx, x + 4, y + 4, 32, 12, 0.35);
    ctx.fillStyle = grad(ctx, x - 30, y - 12, x + 30, y + 12, '#fbf6ec', C.marble, C.marbleShade);
    ctx.beginPath(); ctx.ellipse(x, y, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,120,110,0.45)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x - 22, y - 4); ctx.quadraticCurveTo(x - 4, y + 4, x + 18, y - 6); ctx.moveTo(x - 10, y + 8); ctx.quadraticCurveTo(x + 4, y + 2, x + 24, y + 4); ctx.stroke();
    ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 30, 13, 0, 0, Math.PI * 2); ctx.stroke();
  },
  tower,
  enemy,
  castle(ctx, at) {
    const x = at.x, y = at.y;
    shadow(ctx, x + 40, y + 30, 120, 160, 0.4);
    // curtain wall
    ctx.fillStyle = grad(ctx, x - 70, 0, x + 66, 0, '#efe2c4', C.stone, C.stoneDark);
    ctx.fillRect(x - 70, y - 126, 134, 252);
    ctx.strokeStyle = 'rgba(110,90,60,0.35)'; ctx.lineWidth = 0.6;
    for (let yy = y - 120; yy < y + 126; yy += 7) { ctx.beginPath(); ctx.moveTo(x - 70, yy); ctx.lineTo(x + 64, yy); ctx.stroke(); }
    ctx.save(); ctx.translate(x - 70, y - 126); ctx.rotate(Math.PI / 2); merlons(ctx, 0, 252, 0, C.stone); ctx.restore();
    // inner court: a terracotta-roofed palazzo and a dome with a lantern
    ctx.fillStyle = grad(ctx, x - 30, 0, x + 50, 0, '#e2a882', '#c47a52', '#7a4428'); ctx.fillRect(x - 30, y + 20, 80, 70);
    for (let i = 0; i < 4; i++) arch(ctx, x - 20 + i * 20, y + 82, 9, 22, '#3a2414');
    ctx.fillStyle = C.terracottaDark; ctx.fillRect(x - 34, y + 14, 88, 8);
    const dg = ctx.createRadialGradient(x - 10, y - 50, 5, x + 8, y - 30, 60);
    dg.addColorStop(0, '#e8956a'); dg.addColorStop(0.6, C.terracotta); dg.addColorStop(1, C.terracottaDark);
    ctx.fillStyle = C.marble; ctx.fillRect(x - 34, y - 26, 72, 26);
    ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(x - 34, y - 26); ctx.bezierCurveTo(x - 34, y - 80, x + 38, y - 80, x + 38, y - 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.marble; ctx.lineWidth = 2; for (const dx of [-18, 2, 22]) { ctx.beginPath(); ctx.moveTo(x + dx * 0.4, y - 66); ctx.quadraticCurveTo(x + dx, y - 50, x + dx * 1.2, y - 26); ctx.stroke(); }
    ctx.fillStyle = C.marble; ctx.fillRect(x - 3, y - 84, 10, 14); ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x + 2, y - 88, 3, 0, Math.PI * 2); ctx.fill();
    // round corner towers with swallowtail tops
    for (const ty of [y - 126, y + 126]) {
      ctx.fillStyle = grad(ctx, x - 86, 0, x - 30, 0, '#efe2c4', C.stone, C.stoneDark);
      ctx.beginPath(); ctx.arc(x - 58, ty, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.stoneDark; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; ctx.fillRect(x - 58 + Math.cos(a) * 24 - 3, ty + Math.sin(a) * 24 - 3, 6, 6); }
      ctx.strokeStyle = C.umber; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 58, ty); ctx.lineTo(x - 58, ty - 40); ctx.stroke();
      ctx.fillStyle = C.vermilion; ctx.beginPath(); ctx.moveTo(x - 58, ty - 40); ctx.lineTo(x - 36, ty - 34); ctx.lineTo(x - 44, ty - 30); ctx.lineTo(x - 36, ty - 26); ctx.lineTo(x - 58, ty - 28); ctx.fill();
    }
    // gate
    arch(ctx, x - 70, y + 22, 18, 44, '#24160c');
    ctx.fillStyle = C.lapis; ctx.fillRect(x - 64, y - 46, 22, 16); ctx.fillStyle = C.goldLight; ctx.beginPath(); ctx.arc(x - 53, y - 38, 4, 0, Math.PI * 2); ctx.fill(); // coat of arms
  },
  mill(ctx, at) {
    // a villa-mill with a loggia and a water wheel
    shadow(ctx, at.x + 26, at.y + 22, 70, 14, 0.4);
    ctx.fillStyle = grad(ctx, at.x - 44, 0, at.x + 44, 0, '#f2e6cc', '#dcc8a2', '#9a8662'); ctx.fillRect(at.x - 44, at.y - 20, 88, 46);
    for (let i = 0; i < 4; i++) arch(ctx, at.x - 30 + i * 20, at.y + 26, 10, 22, '#3a2a1a');
    ctx.fillStyle = grad(ctx, at.x - 50, 0, at.x + 50, 0, '#d0703e', C.terracotta, C.terracottaDark);
    ctx.beginPath(); ctx.moveTo(at.x - 50, at.y - 20); ctx.lineTo(at.x - 36, at.y - 42); ctx.lineTo(at.x + 36, at.y - 42); ctx.lineTo(at.x + 50, at.y - 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,35,15,0.35)'; ctx.lineWidth = 0.8; for (let i = -44; i <= 44; i += 5) { ctx.beginPath(); ctx.moveTo(at.x + i, at.y - 21); ctx.lineTo(at.x + i * 0.8, at.y - 41); ctx.stroke(); }
    ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(at.x - 56, at.y + 8, 20, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(at.x - 56, at.y + 8); ctx.lineTo(at.x - 56 + Math.cos(a) * 20, at.y + 8 + Math.sin(a) * 20); ctx.stroke(); }
  },
  inkwell(ctx, at) {
    // a majolica inkwell: blue, white and yellow glaze, with a quill
    shadow(ctx, at.x + 14, at.y + 26, 42, 12, 0.45);
    ctx.fillStyle = grad(ctx, at.x - 30, 0, at.x + 30, 0, '#fbf6ea', '#e6dcc4', '#a89c80');
    ctx.beginPath(); ctx.moveTo(at.x - 30, at.y + 24); ctx.quadraticCurveTo(at.x - 36, at.y - 4, at.x - 16, at.y - 14); ctx.lineTo(at.x + 16, at.y - 14); ctx.quadraticCurveTo(at.x + 36, at.y - 4, at.x + 30, at.y + 24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.lapis; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(at.x - 28, at.y + 6); ctx.bezierCurveTo(at.x - 10, at.y - 6, at.x + 10, at.y + 16, at.x + 28, at.y + 4); ctx.stroke();
    ctx.fillStyle = '#e8b83a'; for (const dx of [-16, 0, 16]) { ctx.beginPath(); ctx.arc(at.x + dx, at.y + 14, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = C.lapisDark; ctx.beginPath(); ctx.ellipse(at.x, at.y - 14, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = grad(ctx, at.x - 36, at.y - 90, at.x + 2, at.y - 14, '#fffef8', '#e8e0cc', '#a49a84');
    ctx.beginPath(); ctx.moveTo(at.x + 2, at.y - 16); ctx.quadraticCurveTo(at.x - 10, at.y - 58, at.x - 36, at.y - 92); ctx.quadraticCurveTo(at.x - 6, at.y - 72, at.x + 2, at.y - 16); ctx.fill();
  },
  pulse(ctx, at, trail) {
    // a gilded orb with radiating rays
    ctx.strokeStyle = 'rgba(244,217,138,0.7)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; line(ctx, [trail, at]);
    ctx.strokeStyle = C.goldLight; ctx.lineWidth = 1.4;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r1 = i % 2 ? 22 : 30; ctx.beginPath(); ctx.moveTo(at.x + Math.cos(a) * 13, at.y + Math.sin(a) * 13); ctx.lineTo(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1); ctx.stroke(); }
    halo(ctx, at.x, at.y, 12);
  },
  post(ctx) {
    // aerial perspective: the top of the panel recedes into blue haze
    const haze = ctx.createLinearGradient(0, 0, 0, MAP_H * 0.45);
    haze.addColorStop(0, 'rgba(190,210,225,0.45)'); haze.addColorStop(1, 'rgba(190,210,225,0)');
    ctx.fillStyle = haze; ctx.fillRect(0, 0, MAP_W, MAP_H * 0.45);
    // warm light from the upper left, deep umber at the edges
    const light = ctx.createRadialGradient(MAP_W * 0.3, MAP_H * 0.25, 80, MAP_W * 0.45, MAP_H * 0.5, 1050);
    light.addColorStop(0, 'rgba(255,235,190,0.18)'); light.addColorStop(0.6, 'rgba(255,235,190,0)'); light.addColorStop(1, 'rgba(50,30,10,0.45)');
    ctx.fillStyle = light; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // aged varnish and its fine cracks
    ctx.fillStyle = 'rgba(200,150,70,0.10)'; ctx.fillRect(0, 0, MAP_W, MAP_H);
    const R = rng(21);
    ctx.strokeStyle = 'rgba(50,30,10,0.12)'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 700; i++) { let x = R() * MAP_W, y = R() * MAP_H, a = R() * 6.28; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { a += (R() - 0.5) * 1.8; x += Math.cos(a) * 10; y += Math.sin(a) * 10; ctx.lineTo(x, y); } ctx.stroke(); }
    // gilt arched frame: lapis spandrels with gold stars in the top corners
    for (const side of [-1, 1]) {
      const cx = side < 0 ? 0 : MAP_W;
      ctx.fillStyle = C.lapis;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx - side * 150, 0); ctx.quadraticCurveTo(cx - side * 40, 10, cx, 110); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.goldLight;
      for (const [sx, sy] of [[30, 22], [70, 16], [22, 58], [104, 12], [50, 44]]) {
        const px = cx - side * sx, py = sy;
        ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 1.6 : 4; const a = (k / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - side * 150, 0); ctx.quadraticCurveTo(cx - side * 40, 10, cx, 110); ctx.stroke();
    }
    ctx.strokeStyle = C.goldDark; ctx.lineWidth = 14; ctx.strokeRect(7, 7, MAP_W - 14, MAP_H - 14);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.strokeRect(7, 7, MAP_W - 14, MAP_H - 14);
    ctx.strokeStyle = C.goldLight; ctx.lineWidth = 1.5; ctx.strokeRect(13, 13, MAP_W - 26, MAP_H - 26);
    // a trompe-l'oeil cartellino, pinned to the panel
    ctx.save(); ctx.translate(70, 900); ctx.rotate(-0.04);
    ctx.fillStyle = 'rgba(40,25,10,0.35)'; ctx.fillRect(6, 6, 250, 62);
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, 250, 62);
    ctx.strokeStyle = 'rgba(120,100,70,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(250, 0); ctx.lineTo(236, 14); ctx.lineTo(250, 14); ctx.stroke();
    ctx.fillStyle = '#2a1c10'; ctx.font = 'italic 600 19px Palatino, "Palatino Linotype", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('OBSIDIO · GOSEBRIDGIAE', 125, 28);
    ctx.font = 'italic 14px Palatino, "Palatino Linotype", Georgia, serif'; ctx.fillText('MDXXV', 125, 48);
    ctx.restore();
  },
};

// keep the helper referenced for future variants
void hatch;
export type { Vec };
