// 12 & 13. Coloured manga in Japan: modern Tokyo and ancient Japan.
// Towers become shrine guardians (hokora, stone lantern, temple bell, copper basin).
import type { EnemyType, FieldTowerType as TowerType } from '../balance';
import { MAP_W, MAP_H, line, smooth, rng, type Style, type Vec } from './scene';
import { INK, JP_FONT, inked, tone, speedLines, sfx, panel, hardShadow, clearSite } from './mangaKit';

const J = {
  vermilion: '#e0432a', vermilionDark: '#9a2416', gold: '#f2c23a', goldDark: '#b8861a',
  white: '#fbf8f0', stone: '#c8c2b4', stoneDark: '#8a8478', wood: '#8a5a32', woodDark: '#5a3418',
  copper: '#4ab89a', copperDark: '#2a7a64', slate: '#3a4250', slateDark: '#1e242e',
  sakura: '#ffb8cc', sakuraDark: '#e07a9a', pine: '#2e6a3a', pineDark: '#1a4022', bamboo: '#7ac04a',
  paddy: '#9ad06a', paddyWater: '#a8e0e8', earth: '#d8b880', earthDark: '#a8844a',
  asphalt: '#5a5e66', asphaltDark: '#3a3e46', concrete: '#c8ccd0', neonCyan: '#5af0ff', neonPink: '#ff5ab0',
};

// ── Shared shrine towers ─────────────────────────────────────────────────────

function shrineTower(ctx: CanvasRenderingContext2D, type: TowerType, x: number, y: number, mark: 'traced' | 'bound' | null, night = false) {
  const box: [number, number, number, number] = [x - 30, y - 96, 60, 100];
  if (type === 'bramble') {
    // a small hokora shrine with a curved roof, wrapped in vines
    const hall = () => { ctx.beginPath(); ctx.rect(x - 16, y - 40, 32, 40); };
    hardShadow(ctx, hall, 8, 6, box);
    inked(ctx, hall, [x - 16, y - 40, 32, 40], J.wood, J.woodDark, 2.4);
    const roof = () => { ctx.beginPath(); ctx.moveTo(x - 30, y - 38); ctx.quadraticCurveTo(x - 14, y - 46, x - 8, y - 66); ctx.lineTo(x + 8, y - 66); ctx.quadraticCurveTo(x + 14, y - 46, x + 30, y - 38); ctx.closePath(); };
    inked(ctx, roof, [x - 30, y - 66, 60, 28], J.slate, J.slateDark, 2.4);
    ctx.fillStyle = J.white; ctx.fillRect(x - 8, y - 32, 16, 20); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(x - 8, y - 32, 16, 20);
    ctx.fillStyle = J.vermilion; ctx.font = `900 11px ${JP_FONT}`; ctx.textAlign = 'center'; ctx.fillText('守', x, y - 18);
    ctx.strokeStyle = J.pine; ctx.lineWidth = 2.2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 16 + i * 10, y); ctx.bezierCurveTo(x - 24 + i * 12, y - 20, x - 8 + i * 8, y - 30, x - 14 + i * 10, y - 48); ctx.stroke(); }
    ctx.fillStyle = J.bamboo; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.ellipse(x - 18 + (i * 37 % 36), y - 6 - (i * 13 % 44), 3.4, 2, i, 0, Math.PI * 2); ctx.fill(); }
  } else if (type === 'ember') {
    // a tall stone lantern (toro) with fire in its window
    const parts: [number, number, number, number][] = [[-14, -8, 28, 8], [-5, -36, 10, 28], [-14, -46, 28, 10], [-11, -64, 22, 18]];
    hardShadow(ctx, () => { ctx.beginPath(); ctx.rect(x - 14, y - 80, 28, 80); }, 8, 6, box);
    for (const [px, py, w, h] of parts) inked(ctx, () => { ctx.beginPath(); ctx.rect(x + px, y + py, w, h); }, [x + px, y + py, w, h], J.stone, J.stoneDark, 2.2);
    const cap = () => { ctx.beginPath(); ctx.moveTo(x - 22, y - 64); ctx.quadraticCurveTo(x, y - 74, x + 22, y - 64); ctx.lineTo(x + 8, y - 80); ctx.lineTo(x - 8, y - 80); ctx.closePath(); };
    inked(ctx, cap, [x - 22, y - 80, 44, 16], J.stone, J.stoneDark, 2.2);
    const g = ctx.createRadialGradient(x, y - 55, 0, x, y - 55, night ? 60 : 30);
    g.addColorStop(0, 'rgba(255,230,140,1)'); g.addColorStop(0.35, 'rgba(255,150,40,0.85)'); g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 55, night ? 60 : 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffdc6a'; ctx.fillRect(x - 6, y - 61, 12, 12); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(x - 6, y - 61, 12, 12);
  } else if (type === 'bell') {
    // a temple bell tower (shoro): four posts, a heavy roof, the bronze bell
    hardShadow(ctx, () => { ctx.beginPath(); ctx.rect(x - 22, y - 70, 44, 70); }, 8, 6, box);
    inked(ctx, () => { ctx.beginPath(); ctx.rect(x - 22, y - 6, 44, 6); }, [x - 22, y - 6, 44, 6], J.stone, J.stoneDark, 2);
    ctx.fillStyle = J.vermilion; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (const px of [-18, 14]) { ctx.fillRect(x + px, y - 58, 5, 52); ctx.strokeRect(x + px, y - 58, 5, 52); }
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 10, y - 50); ctx.quadraticCurveTo(x - 10, y - 20, x - 12, y - 16); ctx.lineTo(x + 12, y - 16); ctx.quadraticCurveTo(x + 10, y - 20, x + 10, y - 50); ctx.closePath(); }, [x - 12, y - 50, 24, 34], '#b88a3a', '#6a4a1a', 2.2);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; for (let yy = y - 46; yy < y - 20; yy += 6) { ctx.beginPath(); ctx.moveTo(x - 9, yy); ctx.lineTo(x + 9, yy); ctx.stroke(); }
    const roof = () => { ctx.beginPath(); ctx.moveTo(x - 34, y - 56); ctx.quadraticCurveTo(x - 16, y - 62, x - 10, y - 82); ctx.lineTo(x + 10, y - 82); ctx.quadraticCurveTo(x + 16, y - 62, x + 34, y - 56); ctx.closePath(); };
    inked(ctx, roof, [x - 34, y - 82, 68, 26], J.slate, J.slateDark, 2.6);
  } else {
    // a copper water basin (chozubachi) with a bamboo spout
    hardShadow(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y - 14, 24, 16, 0, 0, Math.PI * 2); }, 8, 6, box);
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 24, y - 26); ctx.quadraticCurveTo(x - 24, y, x, y); ctx.quadraticCurveTo(x + 24, y, x + 24, y - 26); ctx.closePath(); }, [x - 24, y - 26, 48, 26], J.copper, J.copperDark, 2.4);
    ctx.fillStyle = '#6ad0f0'; ctx.beginPath(); ctx.ellipse(x, y - 26, 22, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    inked(ctx, () => { ctx.beginPath(); ctx.rect(x + 10, y - 62, 6, 40); }, [x + 10, y - 62, 6, 40], J.bamboo, '#4a8a2a', 1.8);
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x + 16, y - 60); ctx.lineTo(x - 6, y - 50); ctx.lineTo(x - 4, y - 46); ctx.lineTo(x + 16, y - 54); ctx.closePath(); }, [x - 6, y - 60, 22, 14], J.bamboo, '#4a8a2a', 1.8);
    ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 5, y - 47); ctx.lineTo(x - 5, y - 28); ctx.stroke();
  }
  if (mark === 'traced') { ctx.fillStyle = J.white; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.fillRect(x + 18, y - 90, 12, 22); ctx.strokeRect(x + 18, y - 90, 12, 22); ctx.fillStyle = J.vermilion; ctx.font = `900 10px ${JP_FONT}`; ctx.textAlign = 'center'; ctx.fillText('符', x + 24, y - 75); }
  if (mark === 'bound') { ctx.strokeStyle = J.goldDark; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 14, y - 82); ctx.quadraticCurveTo(x + 24, y - 76, x + 34, y - 82); ctx.stroke(); ctx.strokeStyle = J.gold; ctx.lineWidth = 2; ctx.stroke(); for (const dx of [18, 30]) { ctx.fillStyle = J.white; ctx.beginPath(); ctx.moveTo(x + dx, y - 79); ctx.lineTo(x + dx + 3, y - 72); ctx.lineTo(x + dx - 1, y - 70); ctx.lineTo(x + dx + 2, y - 64); ctx.lineTo(x + dx - 2, y - 66); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke(); } }
}

/** A shimenawa: twisted straw rope with zigzag paper shide hanging from it. */
function shimenawa(ctx: CanvasRenderingContext2D, path: Vec[]) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 14; line(ctx, path);
  ctx.strokeStyle = '#e8c86a'; ctx.lineWidth = 10; line(ctx, path);
  ctx.strokeStyle = '#a88a3a'; ctx.lineWidth = 2;
  for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i]; const ang = Math.atan2(b.y - a.y, b.x - a.x) + 0.9; ctx.beginPath(); ctx.moveTo(b.x - Math.cos(ang) * 5, b.y - Math.sin(ang) * 5); ctx.lineTo(b.x + Math.cos(ang) * 5, b.y + Math.sin(ang) * 5); ctx.stroke(); }
  for (let i = 4; i < path.length; i += 8) {
    const p = path[i];
    ctx.fillStyle = J.white; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x - 2, p.y + 4); ctx.lineTo(p.x + 3, p.y + 9); ctx.lineTo(p.x - 1, p.y + 11); ctx.lineTo(p.x + 4, p.y + 17); ctx.lineTo(p.x, p.y + 17); ctx.lineTo(p.x - 4, p.y + 12); ctx.lineTo(p.x, p.y + 10); ctx.lineTo(p.x - 5, p.y + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

/** A stone oni with an empty hollow in its chest. */
function stoneOni(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, moss: boolean) {
  const body = () => { ctx.beginPath(); ctx.moveTo(x - 20, y + 6); ctx.lineTo(x - 24, y - 20); ctx.lineTo(x - 38, y - 30); ctx.lineTo(x - 32, y - 58); ctx.lineTo(x - 16, y - 64); ctx.lineTo(x + 16, y - 64); ctx.lineTo(x + 32, y - 58); ctx.lineTo(x + 38, y - 30); ctx.lineTo(x + 24, y - 20); ctx.lineTo(x + 20, y + 6); ctx.closePath(); };
  hardShadow(ctx, body, 12, 8, [x - 40, y - 90, 80, 100]);
  inked(ctx, body, [x - 40, y - 66, 80, 72], '#9a9a94', '#5a5a56', 3.4);
  const head = () => { ctx.beginPath(); ctx.ellipse(x, y - 74, 13, 12, 0, 0, Math.PI * 2); };
  inked(ctx, head, [x - 13, y - 86, 26, 24], '#a8a8a2', '#5a5a56', 3);
  // horns, glaring eyes and fangs
  ctx.fillStyle = J.white; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 7, y - 84); ctx.quadraticCurveTo(x + s * 14, y - 98, x + s * 10, y - 104); ctx.lineTo(x + s * 4, y - 86); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#ffd24a'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 5 + dir, y - 76, 3, 2, s * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = J.white; ctx.beginPath(); ctx.moveTo(x - 5, y - 68); ctx.lineTo(x - 3, y - 63); ctx.lineTo(x - 1, y - 68); ctx.moveTo(x + 1, y - 68); ctx.lineTo(x + 3, y - 63); ctx.lineTo(x + 5, y - 68); ctx.fill();
  // cracks and the empty chest
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 26, y - 48); ctx.lineTo(x - 18, y - 40); ctx.lineTo(x - 22, y - 30); ctx.moveTo(x + 18, y - 24); ctx.lineTo(x + 26, y - 36); ctx.stroke();
  ctx.fillStyle = '#0e0c0a'; ctx.beginPath(); ctx.moveTo(x - 9, y - 30); ctx.lineTo(x - 8, y - 48); ctx.quadraticCurveTo(x, y - 54, x + 8, y - 48); ctx.lineTo(x + 9, y - 30); ctx.closePath(); ctx.fill();
  if (moss) { ctx.fillStyle = '#5aa84a'; for (const [mx, my] of [[-28, -56], [22, -60], [-6, -86]]) { ctx.beginPath(); ctx.ellipse(x + mx, y + my, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); } }
}

function wolf(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, shadowy: boolean) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * 1.2, 1.2);
  const body = () => { ctx.beginPath(); ctx.moveTo(-22, -6); ctx.quadraticCurveTo(-30, -14, -32, -8); ctx.quadraticCurveTo(-24, -6, -17, -4); ctx.quadraticCurveTo(-4, -12, 10, -7); ctx.lineTo(13, -15); ctx.lineTo(16, -9); ctx.lineTo(26, -6); ctx.lineTo(22, -1); ctx.lineTo(13, 0); ctx.lineTo(13, 8); ctx.lineTo(9, 8); ctx.lineTo(8, 1); ctx.lineTo(-10, 1); ctx.lineTo(-11, 8); ctx.lineTo(-15, 8); ctx.lineTo(-15, 0); ctx.closePath(); };
  inked(ctx, body, [-32, -15, 58, 23], shadowy ? '#2a2638' : '#8a8a90', shadowy ? '#0e0c18' : '#4a4a52', 2);
  ctx.fillStyle = shadowy ? '#ff4a6a' : '#ffd24a'; ctx.beginPath(); ctx.arc(18, -8, 1.6, 0, Math.PI * 2); ctx.fill();
  if (!shadowy) { ctx.strokeStyle = '#c8862a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(11, -1); ctx.stroke(); }
  ctx.restore();
  if (shadowy) { ctx.fillStyle = 'rgba(40,30,60,0.35)'; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(x - dir * (24 + i * 8), y - 6, 6 - i, 0, Math.PI * 2); ctx.fill(); } }
  ctx.fillStyle = INK; for (let i = 0; i < 3; i++) ctx.fillRect(x - dir * (34 + i * 6), y - 10 + i * 4, dir * -5, 1.6);
}

// ── Modern Tokyo ─────────────────────────────────────────────────────────────

function tokyoEnemy(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number) {
  if (type === 'cairn') { stoneOni(ctx, x, y, dir, false); return; }
  if (type === 'hound') { wolf(ctx, x, y, dir, true); return; }
  if (type === 'levy') {
    // kasa-obake: a one-eyed paper-umbrella yokai hopping on one leg, holding a riot shield with a white stripe
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y - 6); ctx.stroke();
    const umb = () => { ctx.beginPath(); ctx.moveTo(x - 13, y - 6); ctx.lineTo(x, y - 30); ctx.lineTo(x + 13, y - 6); ctx.quadraticCurveTo(x, y - 10, x - 13, y - 6); ctx.closePath(); };
    inked(ctx, umb, [x - 13, y - 30, 26, 24], '#e85a4a', '#9a2a1e', 2);
    ctx.fillStyle = J.white; ctx.beginPath(); ctx.ellipse(x + dir * 1, y - 17, 4, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + dir * 2, y - 17, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e04a7a'; ctx.beginPath(); ctx.ellipse(x + dir * 2, y - 10, 2.4, 3.6, 0, 0, Math.PI); ctx.fill(); // tongue
    const sx = x + (dir > 0 ? 8 : -18);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(sx, y - 18, 10, 24, 2); }, [sx, y - 18, 10, 24], 'rgba(170,200,230,0.95)', '#6a8ab0', 1.6);
    ctx.fillStyle = J.white; ctx.fillRect(sx + 1, y - 4, 8, 3);
  } else {
    // a fox-masked figure carrying the name-stone
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 7, y + 8); ctx.lineTo(x - 8, y - 12); ctx.lineTo(x + 8, y - 12); ctx.lineTo(x + 7, y + 8); ctx.closePath(); }, [x - 8, y - 12, 16, 20], '#2a2a3a', '#0e0e18', 2);
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 6, y - 14); ctx.lineTo(x - 7, y - 26); ctx.lineTo(x - 2, y - 21); ctx.lineTo(x + 2, y - 21); ctx.lineTo(x + 7, y - 26); ctx.lineTo(x + 6, y - 14); ctx.lineTo(x, y - 10); ctx.closePath(); }, [x - 7, y - 26, 14, 16], J.white, '#d8d0c8', 1.6);
    ctx.strokeStyle = J.vermilion; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 4, y - 18); ctx.lineTo(x - 1, y - 17); ctx.moveTo(x + 4, y - 18); ctx.lineTo(x + 1, y - 17); ctx.stroke();
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(x - 9, y - 44, 18, 14, 4); }, [x - 9, y - 44, 18, 14], '#b8b4a8', '#6a6a62', 2);
    sfx(ctx, '★', x, y - 56, 14, 0, J.gold);
  }
}

export const mangaTokyo: Style = {
  id: 'manga-tokyo',
  name: 'Coloured manga: modern Tokyo',
  blurb: 'Urban fantasy in present-day Tokyo: rooftops and water tanks seen from above, avenues with crosswalks, an elevated expressway, a concrete canal and a park pond. The castle is a shrine compound under a red lattice tower; towers are a vine-wrapped hokora, a stone lantern, a temple bell and a copper basin. Umbrella yokai with riot shields march the avenue, shadow dogs run the expressway, and a stone oni follows a fox-masked bearer. Traces are spirit lines, binds are sacred straw rope, the pulse is a flying paper charm.',
  unity: '2D sprites with ink outlines and a screentone shader; the city is a tilemap of rooftop tiles, so new maps are cheap to build. Strong identity, very readable, and it suits mobile.',
  ground(ctx, R) {
    ctx.fillStyle = J.asphaltDark; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // city blocks: rooftops with water tanks, AC units and the odd rooftop garden; small parks between
    for (let gy = 30; gy < MAP_H; gy += 64) for (let gx = 30; gx < MAP_W; gx += 74) {
      const w = 50 + R() * 16, h = 40 + R() * 14, x = gx + (R() - 0.5) * 6, y = gy + (R() - 0.5) * 6;
      if (!clearSite(x, y, w / 2, h / 2, -8)) continue;
      if (R() < 0.15) {
        ctx.fillStyle = '#6aaa4a'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = '#3a7a3a'; ctx.beginPath(); ctx.arc(x - w / 3 + R() * w * 0.66, y - h / 3 + R() * h * 0.66, 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke(); }
        continue;
      }
      const roof = pick(['#dcdcd6', '#c8ccd2', '#e8e0d0', '#a8b4c0', '#d8c8b0', '#b8c8d8'], R);
      const b = () => { ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); };
      hardShadow(ctx, b, 6, 6, [x - w / 2, y - h / 2, w, h]);
      inked(ctx, b, [x - w / 2, y - h / 2, w, h], roof, shade(roof), 1.8, 0.7);
      if (R() < 0.6) { ctx.fillStyle = '#8ab0d0'; ctx.beginPath(); ctx.arc(x - w / 4, y - h / 6, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke(); }
      for (let i = 0; i < 2; i++) { ctx.fillStyle = '#f4f4f0'; const ax = x + w / 6 + i * 10, ay = y + h / 8; ctx.fillRect(ax, ay, 8, 6); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(ax, ay, 8, 6); }
      if (R() < 0.15) { ctx.fillStyle = '#7ac04a'; ctx.fillRect(x - w / 2 + 4, y + h / 6, w / 3, h / 4); }
    }
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 44; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = J.concrete; ctx.lineWidth = 40; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = '#3a8ab0'; ctx.lineWidth = 28; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([10, 18]); smooth(ctx, river, 80); ctx.stroke(); ctx.setLineDash([]);
    // the park around the pond
    ctx.fillStyle = '#6aaa4a'; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 130, 92, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 104, 68, -0.15, 0, Math.PI * 2); ctx.stroke();
    inked(ctx, () => { ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 90, 56, -0.15, 0, Math.PI * 2); }, [pond.x - 90, pond.y - 56, 180, 112], '#4aa8d0', '#2a78a8', 2.6);
    // swan boats
    for (const [sx, sy] of [[pond.x - 30, pond.y - 10], [pond.x + 26, pond.y + 16]]) { inked(ctx, () => { ctx.beginPath(); ctx.ellipse(sx, sy, 9, 6, 0, 0, Math.PI * 2); }, [sx - 9, sy - 6, 18, 12], J.white, '#c8c8c8', 1.6); }
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    if (kind === 'king') {
      // elevated expressway: hard shadow below, barrier walls, lane lines
      ctx.save(); ctx.translate(14, 18); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 44; smooth(ctx, pts); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 48; smooth(ctx, pts); ctx.stroke();
      ctx.strokeStyle = J.concrete; ctx.lineWidth = 44; smooth(ctx, pts); ctx.stroke();
      ctx.strokeStyle = J.asphalt; ctx.lineWidth = 34; smooth(ctx, pts); ctx.stroke();
      ctx.strokeStyle = '#f2c23a'; ctx.lineWidth = 2; ctx.setLineDash([14, 10]); smooth(ctx, pts); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = `900 14px ${JP_FONT}`; ctx.fillStyle = J.white; ctx.textAlign = 'center'; ctx.fillText('首都高', 1000, 692);
    } else {
      // an avenue with sidewalks, centre line and zebra crossings
      ctx.strokeStyle = INK; ctx.lineWidth = 48; smooth(ctx, pts); ctx.stroke();
      ctx.strokeStyle = '#b8b4ac'; ctx.lineWidth = 44; smooth(ctx, pts); ctx.stroke();
      ctx.strokeStyle = J.asphalt; ctx.lineWidth = 32; smooth(ctx, pts); ctx.stroke();
      ctx.strokeStyle = J.white; ctx.lineWidth = 2; ctx.setLineDash([16, 12]); smooth(ctx, pts); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 1; i < pts.length - 1; i++) {
        const a = pts[i - 1], b = pts[i], ang = Math.atan2(b.y - a.y, b.x - a.x);
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.fillStyle = J.white; for (let k = -14; k <= 14; k += 6) ctx.fillRect(-6, k - 1.5, 12, 3);
        ctx.restore();
      }
    }
  },
  bridge(ctx, at, a) {
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15);
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.fillStyle = '#7a8a9a'; ctx.fillRect(-52, -30, 104, 6); ctx.strokeRect(-52, -30, 104, 6); ctx.fillRect(-52, 24, 104, 6); ctx.strokeRect(-52, 24, 104, 6);
    for (let x = -48; x <= 48; x += 12) { ctx.beginPath(); ctx.moveTo(x, -30); ctx.lineTo(x + 6, -24); ctx.moveTo(x, 30); ctx.lineTo(x + 6, 24); ctx.stroke(); }
    ctx.restore();
  },
  tree(ctx, x, y, r) {
    // street and park trees, drawn as inked crowns from above
    if (!clearSite(x, y - r * 0.4, r, r, -26)) { /* trees are fine beside buildings */ }
    hardShadow(ctx, () => { ctx.beginPath(); ctx.arc(x, y - r * 0.4, r * 0.8, 0, Math.PI * 2); }, 5, 5, [x - r, y - r * 1.4, r * 2, r * 2]);
    inked(ctx, () => { ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; ctx.arc(x + Math.cos(a) * r * 0.42, y - r * 0.4 + Math.sin(a) * r * 0.42, r * 0.42, 0, Math.PI * 2); } }, [x - r, y - r * 1.4, r * 2, r * 2], '#5ab04a', '#2e7a34', 1.6);
  },
  ley(ctx, edges, knots) {
    // spirit lines hidden in the city: faint dotted white, with paper tags at the knots
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([3, 7]); ctx.lineCap = 'round';
    for (const e of edges) line(ctx, e);
    ctx.setLineDash([]);
    for (const k of knots) { ctx.fillStyle = J.white; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.fillRect(k.x - 3, k.y - 6, 6, 12); ctx.strokeRect(k.x - 3, k.y - 6, 6, 12); ctx.fillStyle = J.vermilion; ctx.fillRect(k.x - 1, k.y - 4, 2, 6); }
  },
  bound: shimenawa,
  trace(ctx, path) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = J.neonCyan; ctx.shadowBlur = 18;
    ctx.strokeStyle = INK; ctx.lineWidth = 8; line(ctx, path);
    ctx.shadowBlur = 0; ctx.strokeStyle = J.neonCyan; ctx.lineWidth = 5; line(ctx, path);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; line(ctx, path);
    ctx.restore();
  },
  fire(ctx, pts) { fireManga(ctx, pts); },
  foundation(ctx, x, y) {
    // a rooftop helipad-style marking
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = J.white; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.fillStyle = J.white; ctx.font = `900 13px ${JP_FONT}`; ctx.textAlign = 'center'; ctx.fillText('結', x, y + 5);
  },
  tower: (ctx, type, x, y, mark) => shrineTower(ctx, type, x, y, mark, false),
  enemy: tokyoEnemy,
  castle(ctx, at) {
    const x = at.x, y = at.y;
    // shrine compound: vermilion hall, torii at the gate, and a red lattice tower behind
    hardShadow(ctx, () => { ctx.beginPath(); ctx.rect(x - 66, y - 126, 130, 252); }, 10, 10, [x - 66, y - 126, 130, 252]);
    inked(ctx, () => { ctx.beginPath(); ctx.rect(x - 66, y - 126, 130, 252); }, [x - 66, y - 126, 130, 252], '#e8e0cc', '#b8ac94', 3);
    // lattice tower
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
    const tx = x + 20, ty = y + 40;
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(tx - 26, ty); ctx.lineTo(tx - 4, ty - 150); ctx.lineTo(tx + 4, ty - 150); ctx.lineTo(tx + 26, ty); ctx.closePath(); }, [tx - 26, ty - 150, 52, 150], '#f04a2a', '#a02a16', 2.4);
    ctx.strokeStyle = J.white; ctx.lineWidth = 1.2;
    for (let k = 0; k < 10; k++) { const yy = ty - k * 15; const w = 26 - k * 2.2; ctx.beginPath(); ctx.moveTo(tx - w, yy); ctx.lineTo(tx + w - 2, yy - 15); ctx.moveTo(tx + w, yy); ctx.lineTo(tx - w + 2, yy - 15); ctx.stroke(); }
    for (const yy of [ty - 60, ty - 110]) inked(ctx, () => { ctx.beginPath(); ctx.rect(tx - 14, yy - 6, 28, 8); }, [tx - 14, yy - 6, 28, 8], J.white, '#c8c8c8', 1.8);
    // shrine hall
    inked(ctx, () => { ctx.beginPath(); ctx.rect(x - 40, y + 50, 70, 46); }, [x - 40, y + 50, 70, 46], J.vermilion, J.vermilionDark, 2.4);
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 56, y + 54); ctx.quadraticCurveTo(x - 30, y + 44, x - 22, y + 24); ctx.lineTo(x + 14, y + 24); ctx.quadraticCurveTo(x + 22, y + 44, x + 46, y + 54); ctx.closePath(); }, [x - 56, y + 24, 102, 30], '#3a7a6a', '#1e4a3e', 2.6);
    // torii at the gate
    const gx = x - 74, gy = y;
    ctx.fillStyle = J.vermilion; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (const dy of [-22, 18]) { ctx.fillRect(gx - 3, gy + dy, 6, 6); }
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(gx - 10, gy - 30); ctx.quadraticCurveTo(gx, gy - 34, gx + 10, gy - 30); ctx.lineTo(gx + 10, gy + 30); ctx.quadraticCurveTo(gx, gy + 34, gx - 10, gy + 30); ctx.closePath(); }, [gx - 10, gy - 34, 20, 68], J.vermilion, J.vermilionDark, 2.4);
    ctx.fillStyle = INK; ctx.fillRect(gx - 12, gy - 32, 4, 64);
    sfx(ctx, 'ゴゴゴ', x - 10, y - 160, 30, -0.08, '#a88aff');
  },
  mill(ctx, at) {
    // a corner convenience store with a striped awning
    hardShadow(ctx, () => { ctx.beginPath(); ctx.rect(at.x - 42, at.y - 22, 84, 46); }, 8, 8, [at.x - 42, at.y - 22, 84, 46]);
    inked(ctx, () => { ctx.beginPath(); ctx.rect(at.x - 42, at.y - 22, 84, 46); }, [at.x - 42, at.y - 22, 84, 46], J.white, '#d0d0d0', 2.4);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#2a9a4a', J.white, '#f2a23a'][i % 3]; ctx.fillRect(at.x - 42 + i * 14, at.y - 22, 14, 10); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(at.x - 42, at.y - 22, 84, 10);
    ctx.fillStyle = '#8ad0f0'; ctx.fillRect(at.x - 34, at.y - 6, 68, 20); ctx.strokeRect(at.x - 34, at.y - 6, 68, 20);
    ctx.font = `900 12px ${JP_FONT}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('コンビニ', at.x, at.y + 38);
  },
  inkwell(ctx, at) {
    // a glowing sacred well wrapped in rope, tucked between buildings
    const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, 64); g.addColorStop(0, 'rgba(90,240,255,0.75)'); g.addColorStop(1, 'rgba(90,240,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(at.x, at.y, 64, 0, Math.PI * 2); ctx.fill();
    inked(ctx, () => { ctx.beginPath(); ctx.ellipse(at.x, at.y, 30, 20, 0, 0, Math.PI * 2); }, [at.x - 30, at.y - 20, 60, 40], J.stone, J.stoneDark, 2.6);
    ctx.fillStyle = '#5af0ff'; ctx.beginPath(); ctx.ellipse(at.x, at.y - 2, 20, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    shimenawa(ctx, [{ x: at.x - 30, y: at.y + 4 }, { x: at.x, y: at.y + 14 }, { x: at.x + 30, y: at.y + 4 }]);
  },
  pulse(ctx, at, trail) {
    speedLines(ctx, at.x, at.y, 14, 64, 26, 9);
    ctx.strokeStyle = J.neonCyan; ctx.lineWidth = 6; ctx.lineCap = 'round'; line(ctx, [trail, at]);
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(0.4);
    ctx.fillStyle = J.white; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(-8, -16, 16, 32); ctx.strokeRect(-8, -16, 16, 32);
    ctx.fillStyle = J.vermilion; ctx.font = `900 13px ${JP_FONT}`; ctx.textAlign = 'center'; ctx.fillText('急', 0, -2); ctx.fillText('急', 0, 12);
    ctx.restore();
    sfx(ctx, 'シュッ', at.x + 44, at.y - 36, 28, 0.12, J.neonCyan);
  },
  post(ctx) {
    // evening sky glow over the city edges
    const g = ctx.createLinearGradient(0, 0, 0, MAP_H);
    g.addColorStop(0, 'rgba(255,140,120,0.16)'); g.addColorStop(0.4, 'rgba(255,140,120,0)'); g.addColorStop(1, 'rgba(60,40,120,0.18)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H);
    sfx(ctx, 'ワン!', 820, 900, 30, 0.1, '#ff5ab0');
    panel(ctx);
  },
};

// ── Ancient Japan ────────────────────────────────────────────────────────────

function ancientEnemy(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, dir: number) {
  if (type === 'cairn') { stoneOni(ctx, x, y, dir, true); return; }
  if (type === 'hound') { wolf(ctx, x, y, dir, false); return; }
  if (type === 'levy') {
    // ashigaru: jingasa hat, yari spear, a sashimono banner with a white band
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - 2, y + 2); ctx.lineTo(x - 3, y + 9); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 3, y + 9); ctx.stroke();
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 6, y + 3); ctx.lineTo(x - 7, y - 10); ctx.lineTo(x + 7, y - 10); ctx.lineTo(x + 6, y + 3); ctx.closePath(); }, [x - 7, y - 10, 14, 13], '#3a5a9a', '#1e3060', 1.8);
    ctx.fillStyle = '#f0c8a0'; ctx.beginPath(); ctx.arc(x, y - 14, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 9, y - 16); ctx.lineTo(x, y - 22); ctx.lineTo(x + 9, y - 16); ctx.closePath(); }, [x - 9, y - 22, 18, 6], '#2a2a2a', '#0e0e0e', 1.6);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + dir * 6, y + 6); ctx.lineTo(x + dir * 6, y - 38); ctx.stroke();
    ctx.fillStyle = '#d8d8d8'; ctx.beginPath(); ctx.moveTo(x + dir * 6, y - 44); ctx.lineTo(x + dir * 6 + 2, y - 38); ctx.lineTo(x + dir * 6 - 2, y - 38); ctx.closePath(); ctx.fill();
    const fx = x - dir * 4;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx, y - 8); ctx.lineTo(fx, y - 40); ctx.stroke();
    inked(ctx, () => { ctx.beginPath(); ctx.rect(fx - dir * 10 - (dir < 0 ? 0 : 0), y - 40, dir * -10, 16); }, [Math.min(fx, fx - dir * 10), y - 40, 10, 16], '#e0432a', '#9a2416', 1.4);
    ctx.fillStyle = J.white; ctx.fillRect(Math.min(fx, fx - dir * 10), y - 33, 10, 3);
  } else {
    // a monk in black robes carrying the name-stone
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 8, y + 8); ctx.lineTo(x - 7, y - 12); ctx.lineTo(x + 7, y - 12); ctx.lineTo(x + 8, y + 8); ctx.closePath(); }, [x - 8, y - 12, 16, 20], '#2a2a2a', '#0e0e0e', 2);
    ctx.fillStyle = '#e0a020'; ctx.beginPath(); ctx.moveTo(x - 7, y - 10); ctx.lineTo(x + 7, y + 4); ctx.lineTo(x + 7, y - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f0c8a0'; ctx.beginPath(); ctx.arc(x, y - 16, 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(x - 9, y - 40, 18, 14, 4); }, [x - 9, y - 40, 18, 14], '#b8b4a8', '#6a6a62', 2);
    ctx.fillStyle = J.vermilion; ctx.font = `900 10px ${JP_FONT}`; ctx.textAlign = 'center'; ctx.fillText('名', x, y - 29);
    sfx(ctx, '★', x, y - 52, 14, 0, J.gold);
  }
}

function fireManga(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  pts.forEach((p, i) => {
    if (i % 2) return;
    const f = (sc: number, col: string) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p.x - 9 * sc, p.y + 4); ctx.lineTo(p.x - 6 * sc, p.y - 10 * sc); ctx.lineTo(p.x - 2, p.y - 6 * sc); ctx.lineTo(p.x, p.y - 26 * sc); ctx.lineTo(p.x + 3, p.y - 8 * sc); ctx.lineTo(p.x + 7 * sc, p.y - 14 * sc); ctx.lineTo(p.x + 9 * sc, p.y + 4); ctx.closePath(); ctx.fill(); };
    f(1.05, INK); f(1, '#ff4a1a'); f(0.65, '#ffa020'); f(0.35, '#fff09a');
  });
}

export const mangaAncient: Style = {
  id: 'manga-ancient',
  name: 'Coloured manga: ancient Japan',
  blurb: 'Feudal Japan in bold ink and flat colour: flooded rice paddies, bamboo groves, twisted pines and cherry blossom, a red arched bridge over the river, a koi pond, a farmhouse with a water wheel and a castle keep with curved roofs and golden shachihoko. The inkwell is an ink stone and brush: traces are sumi brushstrokes, binds are kintsugi gold, the pulse is a falling drop of ink. Ashigaru with spears and banners march, wolves run the short road, and a stone oni follows the monk who carries its name.',
  unity: '2D sprites and painted tiles with ink outlines and screentone; brushstroke traces as a trail renderer with a sumi texture. The most “Japanese RPG” feel of the three, and the ink-stone theme fits the tracing mechanic perfectly.',
  ground(ctx, R) {
    ctx.fillStyle = '#8ac860'; ctx.fillRect(0, 0, MAP_W, MAP_H);
    // flooded paddies with earthen dikes, reflecting the sky
    for (let gy = 26; gy < MAP_H; gy += 58) for (let gx = 26; gx < MAP_W; gx += 70) {
      const w = 56 + R() * 10, h = 44 + R() * 8, x = gx + (R() - 0.5) * 6, y = gy + (R() - 0.5) * 6;
      if (!clearSite(x, y, w / 2, h / 2, -12)) continue;
      const k = R();
      if (k < 0.6) {
        ctx.fillStyle = J.earth; ctx.fillRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6);
        ctx.fillStyle = k < 0.3 ? J.paddyWater : J.paddy; ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6);
        if (k < 0.3) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - w / 3, y - h / 4); ctx.lineTo(x, y - h / 4); ctx.stroke(); }
        ctx.strokeStyle = '#4a9a2a'; ctx.lineWidth = 1; for (let yy = y - h / 2 + 6; yy < y + h / 2; yy += 7) for (let xx = x - w / 2 + 5; xx < x + w / 2; xx += 8) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 1, yy - 4); ctx.stroke(); }
      } else if (k < 0.75) {
        // bamboo grove
        for (let i = 0; i < 14; i++) { const bx = x - w / 2 + R() * w, by = y - h / 2 + R() * h; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by + 10); ctx.lineTo(bx, by - 14); ctx.stroke(); ctx.strokeStyle = J.bamboo; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#5aa83a'; ctx.beginPath(); ctx.ellipse(bx + 4, by - 14, 6, 2, -0.5, 0, Math.PI * 2); ctx.ellipse(bx - 4, by - 10, 6, 2, 0.5, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // distant mountains in a band of screentone at the top
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= MAP_W; x += 40) ctx.lineTo(x, 60 + Math.sin(x * 0.008) * 24 + Math.sin(x * 0.03) * 8); ctx.lineTo(MAP_W, 0); ctx.closePath();
    ctx.fillStyle = '#8aa8c8'; ctx.fill(); ctx.clip(); tone(ctx, 0, 0, MAP_W, 100, 5, 1.1, 'rgba(30,50,90,0.35)'); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); for (let x = 0; x <= MAP_W; x += 40) ctx.lineTo(x, 60 + Math.sin(x * 0.008) * 24 + Math.sin(x * 0.03) * 8); ctx.stroke();
  },
  water(ctx, river, pond) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 38; smooth(ctx, river, 80); ctx.stroke();
    ctx.strokeStyle = '#4a9ad8'; ctx.lineWidth = 32; smooth(ctx, river, 80); ctx.stroke();
    // wave crests, as in woodblock prints
    ctx.strokeStyle = J.white; ctx.lineWidth = 2;
    for (let i = 1; i < river.length; i++) for (let t = 0.1; t < 1; t += 0.2) { const x = river[i - 1].x + (river[i].x - river[i - 1].x) * t, y = river[i - 1].y + (river[i].y - river[i - 1].y) * t; ctx.beginPath(); ctx.arc(x, y + 4, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y + 4, 3.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    inked(ctx, () => { ctx.beginPath(); ctx.ellipse(pond.x, pond.y, 90, 56, -0.15, 0, Math.PI * 2); }, [pond.x - 90, pond.y - 56, 180, 112], '#5ab0d8', '#2a7ab0', 3);
    // koi
    const R = rng(4);
    for (let i = 0; i < 6; i++) { const kx = pond.x - 50 + R() * 100, ky = pond.y - 30 + R() * 56, a = R() * 6.28; ctx.save(); ctx.translate(kx, ky); ctx.rotate(a); inked(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2); ctx.moveTo(-8, 0); ctx.lineTo(-14, -4); ctx.lineTo(-14, 4); ctx.closePath(); }, [-14, -4, 23, 8], i % 2 ? '#ff7a2a' : J.white, '#c84a1a', 1.2); if (i % 2 === 0) { ctx.fillStyle = '#e0432a'; ctx.beginPath(); ctx.arc(2, -1, 2.4, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
    for (let i = 0; i < 5; i++) { ctx.fillStyle = '#5aa84a'; ctx.beginPath(); ctx.arc(pond.x - 70 + i * 30, pond.y + 34 - (i % 2) * 60, 6, 0.3, Math.PI * 2); ctx.lineTo(pond.x - 70 + i * 30, pond.y + 34 - (i % 2) * 60); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); }
  },
  road(ctx, pts, kind) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 44; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = J.earthDark; ctx.lineWidth = 40; smooth(ctx, pts); ctx.stroke();
    ctx.strokeStyle = J.earth; ctx.lineWidth = 30; smooth(ctx, pts); ctx.stroke();
    if (kind === 'king') { ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(90,70,40,0.5)'; ctx.setLineDash([2, 10]); ctx.lineWidth = 28; smooth(ctx, pts); ctx.stroke(); ctx.restore(); }
    // small stone lanterns along the way
    for (let i = 2; i < pts.length - 1; i += 2) {
      const a = pts[i - 1], b = pts[i], ang = Math.atan2(b.y - a.y, b.x - a.x);
      const x = (a.x + b.x) / 2 - Math.sin(ang) * 30, y = (a.y + b.y) / 2 + Math.cos(ang) * 30;
      inked(ctx, () => { ctx.beginPath(); ctx.rect(x - 4, y - 12, 8, 12); }, [x - 4, y - 12, 8, 12], J.stone, J.stoneDark, 1.4);
      inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 7, y - 12); ctx.lineTo(x, y - 18); ctx.lineTo(x + 7, y - 12); ctx.closePath(); }, [x - 7, y - 18, 14, 6], J.stone, J.stoneDark, 1.4);
    }
  },
  bridge(ctx, at, a) {
    // a red arched taiko bridge
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(a - 0.15);
    hardShadow(ctx, () => { ctx.beginPath(); ctx.roundRect(-52, -24, 104, 48, 20); }, 8, 12, [-52, -24, 104, 48]);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-52, -24, 104, 48, 20); }, [-52, -24, 104, 48], '#c89a62', '#8a6234', 2.6);
    for (const yy of [-28, 22]) inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-54, yy, 108, 7, 3); }, [-54, yy, 108, 7], J.vermilion, J.vermilionDark, 2);
    ctx.fillStyle = J.gold; for (const x of [-48, -16, 16, 48]) for (const yy of [-30, 25]) { ctx.beginPath(); ctx.arc(x, yy + 3, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
  },
  tree(ctx, x, y, r, k) {
    hardShadow(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y - r * 0.6, r, r * 0.6, 0, 0, Math.PI * 2); }, 6, 8, [x - r, y - r * 1.4, r * 2, r * 2]);
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.bezierCurveTo(x - 6, y - r * 0.2, x + 6, y - r * 0.5, x - 2, y - r * 0.8); ctx.stroke();
    ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 2.4; ctx.stroke();
    if (k > 0.55) {
      // sakura: clouds of pink blossom
      inked(ctx, () => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.arc(x + Math.cos(a) * r * 0.5, y - r * 0.9 + Math.sin(a) * r * 0.35, r * 0.45, 0, Math.PI * 2); } }, [x - r, y - r * 1.4, r * 2, r], J.sakura, J.sakuraDark, 1.8);
      ctx.fillStyle = J.white; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - r * 0.4 + (i * 7 % (r)), y - r * 1.05 + (i % 2) * 6, 1.6, 0, Math.PI * 2); ctx.fill(); }
    } else {
      // a twisted pine with flat layered foliage
      for (const [dx, dy, w] of [[-r * 0.5, -r * 0.7, r * 0.7], [r * 0.4, -r * 1.0, r * 0.6], [-r * 0.1, -r * 1.3, r * 0.5]]) inked(ctx, () => { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, w, w * 0.4, 0, 0, Math.PI * 2); }, [x + dx - w, y + dy - w * 0.4, w * 2, w * 0.8], J.pine, J.pineDark, 1.8);
    }
  },
  ley(ctx, edges, knots) {
    ctx.strokeStyle = 'rgba(20,20,20,0.35)'; ctx.lineWidth = 1.6; ctx.setLineDash([2, 6]); ctx.lineCap = 'round';
    for (const e of edges) line(ctx, e);
    ctx.setLineDash([]);
    for (const k of knots) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(k.x, k.y, 3, 0, Math.PI * 2); ctx.fill(); }
  },
  bound(ctx, path) {
    // kintsugi: a gold seam, as if the land had been mended with gold
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 10; line(ctx, path);
    ctx.strokeStyle = J.goldDark; ctx.lineWidth = 7; line(ctx, path);
    ctx.strokeStyle = J.gold; ctx.lineWidth = 4; line(ctx, path);
    ctx.strokeStyle = '#fff4c0'; ctx.lineWidth = 1.2; line(ctx, path.map((p) => ({ x: p.x - 1, y: p.y - 1 })));
    // branching hairline cracks
    ctx.strokeStyle = J.gold; ctx.lineWidth = 1.6;
    for (let i = 6; i < path.length; i += 9) { const p = path[i]; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 10, p.y - 8); ctx.lineTo(p.x + 16, p.y - 6); ctx.stroke(); }
  },
  trace(ctx, path) {
    // a sumi brushstroke: pressure swells and thins, with dry-brush streaks and splatter
    let acc = 0;
    ctx.lineCap = 'round'; ctx.strokeStyle = INK;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i]; acc += Math.hypot(b.x - a.x, b.y - a.y);
      ctx.lineWidth = 4 + 4 * Math.abs(Math.sin(acc * 0.012)) + 2 * Math.sin(acc * 0.05);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.8;
    for (const off of [-1.5, 1.5]) line(ctx, path.map((p) => ({ x: p.x + off, y: p.y - off })));
    const R = rng(path.length * 3);
    ctx.fillStyle = INK;
    for (let i = 0; i < path.length; i += 5) { const p = path[i]; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(p.x + (R() - 0.5) * 22, p.y + (R() - 0.5) * 22, 0.8 + R() * 1.6, 0, Math.PI * 2); ctx.fill(); } }
  },
  fire: fireManga,
  foundation(ctx, x, y) {
    inked(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, 28, 12, 0, 0, Math.PI * 2); }, [x - 28, y - 12, 56, 24], J.stone, J.stoneDark, 2);
    ctx.fillStyle = INK; ctx.font = `900 12px ${JP_FONT}`; ctx.textAlign = 'center'; ctx.fillText('礎', x, y + 4);
  },
  tower: (ctx, type, x, y, mark) => shrineTower(ctx, type, x, y, mark, false),
  enemy: ancientEnemy,
  castle(ctx, at) {
    const x = at.x, y = at.y;
    // stone base, white walls, layered curved roofs, golden shachihoko on the ridge
    const base = () => { ctx.beginPath(); ctx.moveTo(x - 80, y + 126); ctx.lineTo(x - 64, y - 126); ctx.lineTo(x + 64, y - 126); ctx.lineTo(x + 80, y + 126); ctx.closePath(); };
    hardShadow(ctx, base, 12, 10, [x - 80, y - 126, 160, 252]);
    inked(ctx, base, [x - 80, y - 126, 160, 252], '#b8b0a0', '#7a7266', 3);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; const R = rng(2);
    for (let yy = y - 120; yy < y + 126; yy += 14) for (let xx = x - 70; xx < x + 70; xx += 22) { ctx.strokeRect(xx + (R() - 0.5) * 4, yy, 20, 12); }
    const tiers: [number, number, number][] = [[y - 10, 96, 50], [y - 64, 74, 44], [y - 112, 52, 40]];
    for (const [ty, w, h] of tiers) {
      inked(ctx, () => { ctx.beginPath(); ctx.rect(x - w / 2, ty - h, w, h); }, [x - w / 2, ty - h, w, h], J.white, '#d8d0c0', 2.4);
      ctx.fillStyle = INK; for (let k = -1; k <= 1; k++) ctx.fillRect(x + k * w / 4 - 4, ty - h + 12, 8, 10);
      inked(ctx, () => { ctx.beginPath(); ctx.moveTo(x - w / 2 - 22, ty - h + 4); ctx.quadraticCurveTo(x - w / 2, ty - h - 4, x - w / 2 + 8, ty - h - 22); ctx.lineTo(x + w / 2 - 8, ty - h - 22); ctx.quadraticCurveTo(x + w / 2, ty - h - 4, x + w / 2 + 22, ty - h + 4); ctx.closePath(); }, [x - w / 2 - 22, ty - h - 22, w + 44, 26], J.slate, J.slateDark, 2.6);
    }
    ctx.fillStyle = J.gold; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 18, y - 174); ctx.quadraticCurveTo(x + s * 26, y - 188, x + s * 14, y - 194); ctx.lineTo(x + s * 12, y - 176); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // gate
    inked(ctx, () => { ctx.beginPath(); ctx.rect(x - 84, y - 22, 24, 44); }, [x - 84, y - 22, 24, 44], J.woodDark, '#2a1808', 2.4);
    sfx(ctx, 'ズン', 140, 280, 34, -0.1, '#a8a8a2');
  },
  mill(ctx, at) {
    // a farmhouse with a thatched roof and a water wheel
    inked(ctx, () => { ctx.beginPath(); ctx.arc(at.x - 54, at.y + 10, 22, 0, Math.PI * 2); }, [at.x - 76, at.y - 12, 44, 44], J.wood, J.woodDark, 2.4);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(at.x - 54, at.y + 10); ctx.lineTo(at.x - 54 + Math.cos(a) * 22, at.y + 10 + Math.sin(a) * 22); ctx.stroke(); }
    hardShadow(ctx, () => { ctx.beginPath(); ctx.rect(at.x - 38, at.y - 10, 76, 36); }, 8, 8, [at.x - 38, at.y - 10, 76, 36]);
    inked(ctx, () => { ctx.beginPath(); ctx.rect(at.x - 38, at.y - 10, 76, 36); }, [at.x - 38, at.y - 10, 76, 36], '#e8dcc0', '#b8a888', 2.4);
    inked(ctx, () => { ctx.beginPath(); ctx.moveTo(at.x - 50, at.y - 8); ctx.lineTo(at.x - 20, at.y - 50); ctx.lineTo(at.x + 20, at.y - 50); ctx.lineTo(at.x + 50, at.y - 8); ctx.closePath(); }, [at.x - 50, at.y - 50, 100, 42], '#c8a860', '#8a6a2a', 2.6);
    ctx.strokeStyle = 'rgba(90,60,20,0.6)'; ctx.lineWidth = 1; for (let i = -44; i <= 44; i += 5) { ctx.beginPath(); ctx.moveTo(at.x + i, at.y - 9); ctx.lineTo(at.x + i * 0.5, at.y - 48); ctx.stroke(); }
  },
  inkwell(ctx, at) {
    // a suzuri ink stone with a pool of ink, and a brush resting on it
    hardShadow(ctx, () => { ctx.beginPath(); ctx.roundRect(at.x - 34, at.y - 22, 68, 44, 8); }, 8, 8, [at.x - 34, at.y - 22, 68, 44]);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(at.x - 34, at.y - 22, 68, 44, 8); }, [at.x - 34, at.y - 22, 68, 44], '#3a3a40', '#1a1a20', 3);
    ctx.fillStyle = '#0a0a10'; ctx.beginPath(); ctx.ellipse(at.x - 12, at.y, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(at.x - 16, at.y - 4, 4, 2, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(at.x + 8, at.y - 6); ctx.rotate(-0.7);
    inked(ctx, () => { ctx.beginPath(); ctx.rect(-4, -60, 8, 54); }, [-4, -60, 8, 54], '#c89a52', '#8a6228', 2);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.quadraticCurveTo(0, 14, 5, -6); ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  pulse(ctx, at, trail) {
    speedLines(ctx, at.x, at.y, 14, 64, 26, 13);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(at.x, at.y - 18); ctx.quadraticCurveTo(at.x + 12, at.y + 2, at.x, at.y + 10); ctx.quadraticCurveTo(at.x - 12, at.y + 2, at.x, at.y - 18); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(at.x - 3, at.y - 2, 2, 4, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(at.x, at.y + 14, 16, 5, 0, 0, Math.PI * 2); ctx.stroke();
    void trail;
    sfx(ctx, 'ポタ', at.x + 40, at.y - 34, 28, 0.12, '#ffffff');
  },
  post(ctx) {
    sfx(ctx, 'ザッザッ', 330, 330, 26, -0.15, '#ffd24a');
    panel(ctx);
  },
};

function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * 0.72);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
const pick = <T,>(a: T[], R: () => number) => a[Math.floor(R() * a.length)];
