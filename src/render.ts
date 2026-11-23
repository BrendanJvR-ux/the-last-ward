// Live drawing on top of the ink sheet.
import { BALANCE, phaseRule } from './balance';
import { MAP_W, MAP_H, LANES, BRIDGE, INKWELL, NODE, FOUNDATION_IDS, RIVER, routePolyline, pointAt, type Vec } from './map';
import { type GameState, type Tower, enemyPos, posOf, towerAt, flightPoint } from './game';
import { buildStatic, stroke, roundRect, drawGoose, SERIF, WINDMILL } from './paint';
import { P, drawTowerIcon, drawEnemy, drawNameStone, litGrad, softShadow, ENEMY_SCALE, TOWER_SCALE } from './sprites';
import { inkFoundation, inkFlame, windmillSails, wizard, grow, limbs, hatch, seed, PAPER, type Seg } from './ink';

export { towerIconCanvas, enemyIconCanvas } from './sprites';

export interface Gesture {
  active: boolean;
  path: Vec[];
  pointer: Vec;
  slipping: number;
}

export interface ViewState {
  hoverFoundation: string | null;
  selectedFoundation: string | null;
  /** Foundation whose tower is being previewed for a bind. */
  bindPreview: string | null;
  gesture: Gesture;
  touch: boolean;
  /** Enemy being inspected. */
  inspectId: number | null;
}

const INK = '#15131f';
/** The keeper of the inkwell stands just east of it. */
const WIZARD = { x: INKWELL.x + 62, y: INKWELL.y + 26 };
let staticLayer: HTMLCanvasElement | null = null;
function base(ctx: CanvasRenderingContext2D) {
  if (!staticLayer) staticLayer = buildStatic(2);
  ctx.drawImage(staticLayer, 0, 0, MAP_W, MAP_H);
}

/** Iron-gall ink: tapering, wobbly, soaked into the paint, with a wet sheen while fresh. */
function inkThread(ctx: CanvasRenderingContext2D, path: Vec[], time: number, alpha = 1, mode: 'wet' | 'dry' | 'fading' = 'wet') {
  if (path.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = mode === 'dry' ? 'rgba(40,25,10,0.2)' : 'rgba(10,8,20,0.28)';
  ctx.lineWidth = 15;
  stroke(ctx, path);
  const col = mode === 'dry' ? '#4a3626' : mode === 'fading' ? '#3a3640' : INK;
  ctx.strokeStyle = col; ctx.fillStyle = col;
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    acc += Math.hypot(b.x - a.x, b.y - a.y);
    const w = (mode === 'dry' ? 3.4 : 6) + 1.8 * Math.sin(acc * 0.045) + 1 * Math.sin(acc * 0.13 + 1.7);
    ctx.lineWidth = Math.max(1.6, w);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let i = 0; i < path.length; i += Math.max(1, Math.floor(path.length / 9))) {
    const p = path[i];
    ctx.beginPath(); ctx.arc(p.x + ((i * 13) % 5) - 2, p.y + ((i * 7) % 5) - 2, 3.2 + ((i * 37) % 5) * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  if (mode === 'wet') {
    ctx.strokeStyle = 'rgba(170,185,235,0.6)'; ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 26]); ctx.lineDashOffset = -time * 60;
    stroke(ctx, path);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Permanent gold leaf along a bound tower's route, or a dashed preview. */
function goldRoute(ctx: CanvasRenderingContext2D, foundation: string, preview: boolean, time: number) {
  const path = routePolyline(foundation);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (preview) {
    ctx.strokeStyle = `rgba(90,60,10,${0.55 + 0.3 * Math.sin(time * 5)})`; ctx.lineWidth = 16; stroke(ctx, path);
    ctx.strokeStyle = P.goldLight; ctx.lineWidth = 10; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -time * 30; stroke(ctx, path);
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = '#5e4210'; ctx.lineWidth = 15; stroke(ctx, path);
    ctx.strokeStyle = P.gold; ctx.lineWidth = 11; stroke(ctx, path);
    ctx.strokeStyle = P.goldLight; ctx.lineWidth = 4; ctx.setLineDash([2, 6]); stroke(ctx, path); ctx.setLineDash([]);
    ctx.fillStyle = P.goldLight; ctx.strokeStyle = '#5e4210'; ctx.lineWidth = 1;
    for (let i = 6; i < path.length - 2; i += 7) {
      const p = path[i], q = path[i + 1];
      const a = Math.atan2(q.y - p.y, q.x - p.x) + (i % 2 ? 0.9 : -0.9);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(11, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawFoundation(ctx: CanvasRenderingContext2D, f: string, selected: boolean, hovered: boolean, bound: boolean, preview: boolean, built: boolean, time: number) {
  const n = NODE[f];
  ctx.save(); ctx.translate(n.x, n.y);
  if (!built) {
    softShadow(ctx, 3, 3, 32, 13, 0.45);
    inkFoundation(ctx, 0, 0);
    ctx.strokeStyle = 'rgba(29,25,21,0.7)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(6, -1); ctx.moveTo(0, -5); ctx.lineTo(0, 3); ctx.stroke();
  }
  if (built) ctx.scale(TOWER_SCALE, TOWER_SCALE);
  if (bound) { ctx.strokeStyle = P.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 34, 15, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (preview) {
    ctx.strokeStyle = `rgba(240,210,122,${0.6 + 0.4 * Math.sin(time * 6)})`; ctx.lineWidth = 3; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.ellipse(0, 0, 42, 20, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  if (selected || hovered) {
    ctx.strokeStyle = selected ? P.gold : 'rgba(29,25,21,0.55)'; ctx.lineWidth = selected ? 3 : 1.6; if (!selected) ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 18, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawTowerState(ctx: CanvasRenderingContext2D, s: GameState, t: Tower, time: number) {
  const p = posOf(t);
  if (t.flash > 0) {
    ctx.save(); ctx.globalAlpha = t.flash * 0.7;
    const g = ctx.createRadialGradient(p.x, p.y - 54, 2, p.x, p.y - 54, 76);
    g.addColorStop(0, P.goldLight); g.addColorStop(1, 'rgba(240,210,122,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - 54, 76, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  drawTowerIcon(ctx, t.type, p.x, p.y, TOWER_SCALE, time + p.x);
  const markX = p.x + 38, markY = p.y - 102;
  if (t.traced) {
    const ready = s.phase === 'combat' && !t.committed && s.pulsesLeft > 0;
    ctx.save(); ctx.translate(markX, markY);
    if (t.committed) {
      ctx.fillStyle = '#4a3626'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e8dcbc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-1, 4); ctx.lineTo(5, -4); ctx.stroke();
    } else {
      const k = ready ? 1 + 0.15 * Math.sin(time * 7) : 1;
      ctx.scale(k, k);
      ctx.shadowColor = 'rgba(160,180,255,0.8)'; ctx.shadowBlur = ready ? 12 : 0;
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(9, 0, 7, 5); ctx.arc(0, 4, 7.2, 0.15, Math.PI - 0.15); ctx.quadraticCurveTo(-9, 0, 0, -13); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(220,230,255,0.85)'; ctx.beginPath(); ctx.ellipse(-2.5, 2, 1.8, 3, 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  if (t.bound) {
    const ready = s.phase === 'combat' && !t.committed;
    ctx.save(); ctx.translate(markX, markY);
    const k = ready ? 1 + 0.15 * Math.sin(time * 7) : 1;
    ctx.scale(k, k);
    ctx.shadowColor = 'rgba(240,210,122,0.9)'; ctx.shadowBlur = ready ? 14 : 0;
    ctx.fillStyle = t.committed && s.phase === 'combat' ? '#8a7a52' : litGrad(ctx, -10, -10, 10, 10, '#fff0b8', P.gold, '#6b4c12');
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#3c4a26';
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.6, -0.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (t.royal) {
    ctx.save(); ctx.translate(p.x - 40, p.y - 93);
    ctx.fillStyle = litGrad(ctx, -8, -6, 8, 4, '#fff0b8', P.gold, '#6b4c12');
    ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-8, -4); ctx.lineTo(-4, 0); ctx.lineTo(0, -6); ctx.lineTo(4, 0); ctx.lineTo(8, -4); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

/** A thorny hedge of tangled ink limbs across the road. */
function drawHedge(ctx: CanvasRenderingContext2D, h: GameState['hedges'][number], time: number) {
  const life = Math.min(1, h.t / 0.35, (h.dur - h.t) / 0.5);
  ctx.save(); ctx.translate(h.at.x, h.at.y); ctx.rotate(h.angle + Math.PI / 2);
  ctx.scale(1, Math.max(0.05, life));
  softShadow(ctx, 4, 4, 36, 12, 0.6);
  const R = seed(h.at.x, h.at.y, 9);
  const segs: Seg[] = [];
  for (let i = -3; i <= 3; i++) {
    const x = i * 9;
    grow(segs, R, x, 4, -Math.PI / 2 + (R() - 0.5) * 0.9, 18 + R() * 6, 4, 1, 0.9);
  }
  for (const sgn of [-1, 1]) grow(segs, R, 0, 0, sgn > 0 ? -0.15 : Math.PI + 0.15, 34, 5, 0, 0.6);
  limbs(ctx, segs, R, false);
  // thorns and a few red hips
  ctx.strokeStyle = '#1d1915'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (const sg of segs) if (sg.w > 1.5) { const mx = (sg.x1 + sg.x2) / 2, my = (sg.y1 + sg.y2) / 2; ctx.moveTo(mx, my); ctx.lineTo(mx + 2.5, my - 2.5); }
  ctx.stroke();
  for (let i = -2; i <= 2; i++) { ctx.fillStyle = P.oxblood; ctx.beginPath(); ctx.arc(i * 10, -12 + Math.sin(time * 3 + i) * 1.5, 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/** Burning road: hatched ink flames over a warm wash, with curls of smoke. */
function drawFire(ctx: CanvasRenderingContext2D, f: GameState['fires'][number], time: number) {
  const life = Math.min(1, f.t / 0.3, (f.dur - f.t) / 0.6);
  ctx.save();
  ctx.globalAlpha = Math.max(0, life);
  for (let i = 0; i < f.pts.length; i += 2) {
    const p = f.pts[i];
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 22);
    g.addColorStop(0, 'rgba(220,140,60,0.3)'); g.addColorStop(1, 'rgba(220,140,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < f.pts.length; i += 2) {
    const p = f.pts[i];
    const fl = Math.sin(time * 9 + i * 1.7);
    inkFlame(ctx, p.x + ((i * 7) % 9) - 4, p.y + 5, 17 + fl * 4 + (i % 3) * 3, fl * 0.5);
  }
  // smoke curls in ink
  ctx.lineWidth = 0.7;
  for (let i = 0; i < f.pts.length; i += 4) {
    const p = f.pts[i];
    const t = (time * 0.6 + i * 0.37) % 1;
    ctx.strokeStyle = `rgba(29,25,21,${0.6 * (1 - t)})`;
    ctx.beginPath();
    for (let a = 0; a < 7; a += 0.3) { const r = 1 + a * 0.8; const x = p.x + Math.cos(a) * r + Math.sin(t * 6 + i) * 4, y = p.y - 24 - t * 36 - a * 1.4 + Math.sin(a) * r * 0.5; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
}

/** A defeated enemy toppling and fading where it fell; the giant crumbles to a cairn. */
function drawFallen(ctx: CanvasRenderingContext2D, f: GameState['fallen'][number], time: number) {
  const k = f.t / 1.6;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k * k);
  if (f.type === 'cairn') {
    for (let i = 0; i < 7; i++) {
      const x = f.x - 24 + i * 8, y = f.y - 4 + ((i * 5) % 7) - Math.max(0, 40 - f.t * 80) * ((i % 3) / 3);
      const st = () => { ctx.beginPath(); ctx.ellipse(x, y, 8, 6, i, 0, Math.PI * 2); };
      ctx.fillStyle = P.stone; st(); ctx.fill();
      hatch(ctx, st, [x - 8, y - 8, 16, 16], 0.9, 1.5, 0.45);
      ctx.strokeStyle = P.ink; ctx.lineWidth = 1; st(); ctx.stroke();
    }
  } else {
    ctx.translate(f.x, f.y);
    ctx.rotate(f.dir * Math.min(Math.PI / 2, f.t * 6));
    drawEnemy(ctx, f.type, 0, 0, f.dir, 0, 0, ENEMY_SCALE[f.type]);
  }
  ctx.restore();
  // a puff of dust
  const g = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, 10 + k * 24);
  g.addColorStop(0, `rgba(86,68,52,${0.3 * (1 - k)})`); g.addColorStop(1, 'rgba(86,68,52,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 10 + k * 24, 0, Math.PI * 2); ctx.fill();
  void time;
}

/** The windmill's lattice sails, turning slowly. */
function drawSails(ctx: CanvasRenderingContext2D, time: number) {
  windmillSails(ctx, WINDMILL.x, WINDMILL.y - 56, time * 0.35);
}

/** Drifting washes, small ink butterflies and glints on the river. */
function drawAmbience(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const x = ((time * (9 + i * 4) + i * 700) % (MAP_W + 900)) - 450;
    const y = 220 + i * 280 + Math.sin(time * 0.05 + i) * 60;
    const g = ctx.createRadialGradient(x, y, 20, x, y, 340);
    g.addColorStop(0, 'rgba(86,68,52,0.07)'); g.addColorStop(1, 'rgba(86,68,52,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 340, 190, 0.2, 0, Math.PI * 2); ctx.fill();
  }
  // butterflies, a few pen ticks each
  ctx.strokeStyle = 'rgba(29,25,21,0.75)'; ctx.lineWidth = 0.8;
  for (let i = 0; i < 12; i++) {
    const ph = i * 12.9898;
    const bx = ((Math.sin(ph) * 43758.5453) % 1 + 1) % 1 * MAP_W, by = ((Math.cos(ph) * 24634.6345) % 1 + 1) % 1 * (MAP_H - 120) + 60;
    const x = bx + Math.sin(time * 0.4 + i) * 40 + Math.sin(time * 1.7 + i * 2) * 6;
    const y = by + Math.cos(time * 0.3 + i * 1.3) * 26;
    const w = 1.5 + Math.abs(Math.sin(time * 14 + i)) * 2.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - w, y - 2.5); ctx.lineTo(x - w * 0.6, y + 0.5); ctx.closePath();
    ctx.moveTo(x, y); ctx.lineTo(x + w, y - 2.5); ctx.lineTo(x + w * 0.6, y + 0.5); ctx.closePath(); ctx.stroke();
  }
  // glints on the river
  const glints: Vec[] = [];
  for (let i = 1; i < RIVER.length; i++) for (let t = 0.3; t < 1; t += 0.4) glints.push({ x: RIVER[i - 1].x + (RIVER[i].x - RIVER[i - 1].x) * t, y: RIVER[i - 1].y + (RIVER[i].y - RIVER[i - 1].y) * t });
  glints.forEach((p, i) => {
    const a = Math.max(0, Math.sin(time * 1.7 + i * 2.3));
    if (a < 0.6) return;
    ctx.strokeStyle = `rgba(255,252,240,${(a - 0.6) * 2.2})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y); ctx.moveTo(p.x, p.y - 2.5); ctx.lineTo(p.x, p.y + 2.5); ctx.stroke();
  });
  ctx.restore();
}

/** Barrow Hounds: horn rings and a banner at the bridge shortly before the pack arrives. */
function drawHoundWarnings(ctx: CanvasRenderingContext2D, s: GameState, time: number) {
  if (s.phase !== 'combat') return;
  for (const w of s.warnings) {
    if (s.waveTime < w.from || s.waveTime > w.to) continue;
    const entry = LANES.king.pts[2]; // the bridge's southern approach
    const k = 0.6 + 0.4 * Math.abs(Math.sin(time * 5));
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 4;
    for (let r = 22; r < 80; r += 18) { ctx.beginPath(); ctx.arc(entry.x, entry.y, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const bx = 548, by = 722;
    ctx.fillStyle = 'rgba(239,233,218,0.96)'; roundRect(ctx, bx, by - 24, 258, 36, 4); ctx.fill();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.lineWidth = 0.6; roundRect(ctx, bx + 3, by - 21, 252, 30, 3); ctx.stroke();
    const horn = () => { ctx.beginPath(); ctx.moveTo(bx + 10, by - 2); ctx.quadraticCurveTo(bx + 18, by - 20, bx + 34, by - 16); ctx.lineTo(bx + 34, by - 4); ctx.quadraticCurveTo(bx + 20, by - 8, bx + 14, by + 2); ctx.closePath(); };
    ctx.fillStyle = PAPER; horn(); ctx.fill(); hatch(ctx, horn, [bx + 8, by - 20, 28, 24], 0.8, 1.6, 0.5); ctx.lineWidth = 1.1; horn(); ctx.stroke();
    ctx.fillStyle = '#7a2826'; ctx.font = `italic 600 17px ${SERIF}`; ctx.textAlign = 'left';
    ctx.fillText('Horns! Hounds at the bridge', bx + 42, by);
    ctx.restore();
  }
}

export function render(ctx: CanvasRenderingContext2D, s: GameState, v: ViewState, time: number) {
  base(ctx);

  // a bolder leyline from the inkwell to every tower you own, so your towers are easy to find
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const t of s.towers) {
    const path = routePolyline(t.foundation);
    ctx.strokeStyle = 'rgba(29,25,21,0.16)'; ctx.lineWidth = 7; stroke(ctx, path);
    ctx.strokeStyle = 'rgba(29,25,21,0.7)'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 5]); stroke(ctx, path); ctx.setLineDash([]);
  }
  ctx.restore();
  for (const t of s.towers) if (t.bound) goldRoute(ctx, t.foundation, false, time);
  if (v.bindPreview && !towerAt(s, v.bindPreview)?.bound) goldRoute(ctx, v.bindPreview, true, time);
  for (const f of s.fading) inkThread(ctx, f.path, time, 1 - f.t / f.dur, 'fading');
  for (const t of s.towers) if (t.traced) inkThread(ctx, routePolyline(t.foundation), time, 1, t.committed ? 'dry' : 'wet');
  if (v.gesture.active && v.gesture.path.length > 1) {
    inkThread(ctx, v.gesture.path, time, v.gesture.slipping > 0 ? 0.45 : 1, 'wet');
    const end = v.gesture.path[v.gesture.path.length - 1];
    ctx.save(); ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(end.x, end.y, 7 + Math.sin(time * 10), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(10,8,20,0.2)'; ctx.beginPath(); ctx.arc(end.x, end.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (s.phase === 'prep' && !s.pendingGrant && s.traces.length < phaseRule(s.wave).traces) {
    const k = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.save(); ctx.strokeStyle = `rgba(29,25,21,${0.3 + 0.45 * k})`; ctx.lineWidth = 2; ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.arc(INKWELL.x, INKWELL.y - 4, 56 + k * 6, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  for (const f of s.fires) drawFire(ctx, f, time);
  for (const st of s.stones) { const p = pointAt(LANES[st.lane], st.s); drawNameStone(ctx, p.x + 14, p.y + 4, time); }

  for (const f of FOUNDATION_IDS) {
    const t = towerAt(s, f);
    drawFoundation(ctx, f, v.selectedFoundation === f, v.hoverFoundation === f, !!t?.bound, v.bindPreview === f, !!t, time);
  }

  const hf = v.hoverFoundation ?? v.selectedFoundation;
  const ht = hf ? towerAt(s, hf) : undefined;
  if (ht) {
    const p = posOf(ht);
    ctx.save(); ctx.strokeStyle = 'rgba(29,25,21,0.45)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(p.x, p.y, BALANCE.towers[ht.type].range, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  type Sprite = { y: number; draw: () => void };
  const sprites: Sprite[] = [];
  for (const t of s.towers) sprites.push({ y: posOf(t).y, draw: () => drawTowerState(ctx, s, t, time) });
  for (const e of s.enemies) {
    const p = enemyPos(e);
    const dir = Math.cos(p.angle) >= -0.1 ? 1 : -1;
    const k = ENEMY_SCALE[e.type];
    sprites.push({
      y: p.y, draw: () => {
        if (e.type === 'hound') {
          // barrow-mist clinging to the pack
          for (let i = 1; i <= 3; i++) {
            const q = pointAt(LANES[e.lane], e.s - i * 12);
            ctx.fillStyle = `rgba(110,104,98,${0.12 / i})`;
            ctx.beginPath(); ctx.ellipse(q.x, q.y - 4, 12 + i * 3, 5 + i, p.angle, 0, Math.PI * 2); ctx.fill();
          }
        }
        drawEnemy(ctx, e.type, p.x, p.y, dir, e.bob, e.hit, k, { kneel: e.mode === 'kneel', alpha: e.mode === 'leave' ? e.fade ?? 1 : 1 });
        const top = e.type === 'cairn' ? (e.mode === 'kneel' ? 104 : 120) : e.type === 'bearer' ? 78 : e.type === 'hound' ? 52 : 64;
        if (e.vulnT > 0 || e.shred > 0) {
          ctx.fillStyle = e.vulnT > 0 ? 'rgba(120,220,180,0.9)' : 'rgba(120,200,170,0.6)';
          for (let i = 0; i < 4; i++) { const a = time * 3 + i * 1.6; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 12, p.y - top / 2 + Math.sin(a) * 6, 1.8, 0, Math.PI * 2); ctx.fill(); }
        }
        if (e.stun > 0) {
          ctx.fillStyle = P.goldLight;
          for (let i = 0; i < 3; i++) { const a = time * 6 + i * 2.1; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 10, p.y - top + 4 + Math.sin(a) * 3, 2.2, 0, Math.PI * 2); ctx.fill(); }
        }
        if (e.hp < e.maxHp && e.mode !== 'leave') {
          const w = e.type === 'cairn' ? 64 : 34;
          ctx.fillStyle = PAPER; ctx.fillRect(p.x - w / 2, p.y - top - 6, w, 5);
          ctx.fillStyle = '#9a2e28'; ctx.fillRect(p.x - w / 2, p.y - top - 6, w * Math.max(0, e.hp / e.maxHp), 5);
          ctx.strokeStyle = P.ink; ctx.lineWidth = 1; ctx.strokeRect(p.x - w / 2, p.y - top - 6, w, 5);
        }
        if (v.inspectId === e.id) {
          ctx.save(); ctx.strokeStyle = P.gold; ctx.lineWidth = 2.4; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -time * 20;
          const r = e.type === 'cairn' ? 52 : 24;
          ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
      },
    });
  }
  for (const h of s.hedges) sprites.push({ y: h.at.y + 1, draw: () => drawHedge(ctx, h, time) });
  for (const f of s.fallen) sprites.push({ y: f.y - 1, draw: () => drawFallen(ctx, f, time) });
  sprites.push({ y: WINDMILL.y, draw: () => drawSails(ctx, time) });
  sprites.push({ y: WIZARD.y, draw: () => wizard(ctx, WIZARD.x, WIZARD.y, -1, time, v.gesture.active || s.flights.length > 0) });
  sprites.sort((a, b) => a.y - b.y);
  for (const sp of sprites) sp.draw();

  for (const p of s.projectiles) {
    const a = Math.atan2(p.ty - p.sy, p.tx - p.sx);
    if (p.kind === 'castle') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = P.ink; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-14, -3); ctx.moveTo(-10, 0); ctx.lineTo(-14, 3); ctx.stroke();
      ctx.restore();
    } else if (p.kind === 'bramble') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.fillStyle = P.ink; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -3); ctx.lineTo(-6, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (p.kind === 'verdigris') {
      const g = ctx.createRadialGradient(p.x - 1, p.y - 1, 0, p.x, p.y, 6);
      g.addColorStop(0, '#d8fff0'); g.addColorStop(0.5, P.verdigris); g.addColorStop(1, 'rgba(40,90,75,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    } else {
      const k = Math.min(1, p.t / p.dur);
      const arc = Math.sin(k * Math.PI) * 60;
      ctx.save();
      softShadow(ctx, p.x, p.y + 30 * (1 - k), 6, 2.5, 0.4);
      ctx.shadowColor = 'rgba(255,140,40,0.9)'; ctx.shadowBlur = 10;
      const g = ctx.createRadialGradient(p.x - 1, p.y - arc - 1, 0, p.x, p.y - arc, 5);
      g.addColorStop(0, '#fff1b0'); g.addColorStop(1, '#d0541c');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - arc, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  for (const r of s.rings) {
    const k = r.t / r.dur;
    ctx.save();
    if (r.kind === 'bell' || r.kind === 'toll') {
      ctx.strokeStyle = r.kind === 'toll' ? `rgba(195,150,52,${1 - k})` : `rgba(29,25,21,${0.45 * (1 - k)})`;
      ctx.lineWidth = r.kind === 'toll' ? 5 : 1.2;
      for (const f of [0.6, 1]) { ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + 0.7 * k) * f, 0, Math.PI * 2); ctx.stroke(); }
    } else if (r.kind === 'splash') {
      ctx.fillStyle = `rgba(240,140,50,${0.45 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.5 + 0.5 * k), 0, Math.PI * 2); ctx.fill();
    } else if (r.kind === 'tarnish') {
      const rr = r.r * (0.4 + 0.6 * k);
      const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, rr);
      g.addColorStop(0, `rgba(140,230,190,${0.45 * (1 - k)})`); g.addColorStop(1, 'rgba(80,160,130,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, Math.PI * 2); ctx.fill();
    } else if (r.kind === 'corrode') {
      ctx.fillStyle = `rgba(120,220,180,${0.7 * (1 - k)})`;
      for (let i = 0; i < 5; i++) { const a = i * 1.3; ctx.beginPath(); ctx.arc(r.x + Math.cos(a) * r.r * k, r.y + Math.sin(a) * r.r * k * 0.6, 1.8, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.fillStyle = `rgba(15,12,25,${0.8 * (1 - k)})`;
      for (let i = 0; i < 9; i++) {
        const a = i * 0.7 + 0.3, d = r.r * (0.4 + k) * (0.6 + (i % 3) * 0.25);
        ctx.beginPath(); ctx.arc(r.x + Math.cos(a) * d, r.y - 30 + Math.sin(a) * d * 0.7, 4 - (i % 3), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  for (const f of s.flights) {
    const p = flightPoint(f);
    const gold = !!s.towers.find((x) => x.id === f.towerId)?.bound;
    const back = flightPoint({ ...f, s: Math.max(0, f.s - 40) });
    ctx.save();
    ctx.strokeStyle = gold ? P.gold : INK; ctx.lineCap = 'round'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(back.x, back.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.shadowColor = gold ? 'rgba(240,210,122,1)' : 'rgba(120,140,230,0.9)'; ctx.shadowBlur = 16;
    ctx.fillStyle = gold ? P.goldLight : INK;
    ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(230,236,255,0.8)';
    ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawAmbience(ctx, time);
  drawHoundWarnings(ctx, s, time);
  drawGoose(ctx, BRIDGE.x + 26, BRIDGE.y - 40, 0.8, 1);
}

/** The victory plate: the finished drawing, framed in gold. */
export function renderVictory(ctx: CanvasRenderingContext2D, s: GameState, time: number) {
  base(ctx);
  for (const t of s.towers) if (t.bound) goldRoute(ctx, t.foundation, false, time);
  for (const f of FOUNDATION_IDS) drawFoundation(ctx, f, false, false, !!towerAt(s, f)?.bound, false, !!towerAt(s, f), time);
  for (const t of [...s.towers].sort((a, b) => posOf(a).y - posOf(b).y)) drawTowerIcon(ctx, t.type, posOf(t).x, posOf(t).y, TOWER_SCALE, time);
  ctx.save();
  ctx.fillStyle = 'rgba(195,150,52,0.06)'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  const g = ctx.createRadialGradient(800, 450, 300, 800, 500, 950);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(86,68,52,0.35)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.strokeStyle = litGrad(ctx, 0, 0, MAP_W, MAP_H, '#fff0b8', P.gold, '#6b4c12'); ctx.lineWidth = 16; ctx.strokeRect(22, 22, MAP_W - 44, MAP_H - 44);
  ctx.strokeStyle = '#140c04'; ctx.lineWidth = 3; ctx.strokeRect(12, 12, MAP_W - 24, MAP_H - 24); ctx.strokeRect(34, 34, MAP_W - 68, MAP_H - 68);
  ctx.restore();
  ctx.save(); ctx.fillStyle = P.oxblood;
  for (const y of [420, 620]) { ctx.beginPath(); ctx.moveTo(1450, y); ctx.lineTo(1450, y + 70); ctx.lineTo(1462, y + 58); ctx.lineTo(1474, y + 70); ctx.lineTo(1474, y); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  for (let i = 0; i < 9; i++) {
    const x = 1500 - ((time * 60 + i * 70) % 1700);
    const y = 230 + Math.abs(i - 4) * 26 + Math.sin(time * 2 + i) * 6;
    drawGoose(ctx, x, y, 1.4, -1, true, time * 7 + i);
  }
  drawSails(ctx, time);
  wizard(ctx, WIZARD.x, WIZARD.y, -1, time, false);
  drawGoose(ctx, 1380, 520, 1.6, -1);
  drawGoose(ctx, 1330, 540, 1.4, 1);
}
