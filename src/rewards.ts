// Rewards: Wizard's Seals are earned by holding waves and levels, and redeemed for lasting
// perks and looks. Everything is kept in this browser (localStorage); nothing leaves it.
import type { LevelId } from './balance';
import type { Perks } from './game';
import { INK, PAPER, GOLD, hatch, eye, inkInkwell, turret, inkBlot, rng } from './ink';

export type RewardId = 'deepInkwell' | 'gildedStart' | 'stoutWalls' | 'owl' | 'crimson';

export interface Reward {
  id: RewardId;
  name: string;
  text: string;
  cost: number;
  kind: 'perk' | 'look';
}

export const REWARDS: Reward[] = [
  { id: 'deepInkwell', name: 'Deep Inkwell', text: 'Begin every level with 30 more gold.', cost: 8, kind: 'perk' },
  { id: 'gildedStart', name: 'Gilded Start', text: 'Begin every level with one Gilded Leaf already in hand.', cost: 10, kind: 'perk' },
  { id: 'stoutWalls', name: 'Stout Walls', text: 'The castle starts every level with 5 more health.', cost: 14, kind: 'perk' },
  { id: 'owl', name: 'Owl Familiar', text: 'A small ink owl keeps the wizard company by the inkwell.', cost: 5, kind: 'look' },
  { id: 'crimson', name: 'Crimson Ink', text: 'Your traced threads run in deep crimson ink instead of black.', cost: 6, kind: 'look' },
];

/** How seals are earned. */
export const EARN = { perWave: 1, levelWon: 5, firstWin: 5, flawless: 3 };

interface Store { seals: number; earned: number; owned: RewardId[]; active: RewardId[]; firstWins: LevelId[] }
const KEY = 'goosebridge.rewards';

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Store>;
      return { seals: v.seals ?? 0, earned: v.earned ?? 0, owned: v.owned ?? [], active: v.active ?? [], firstWins: v.firstWins ?? [] };
    }
  } catch { /* private mode or blocked storage: start empty */ }
  return { seals: 0, earned: 0, owned: [], active: [], firstWins: [] };
}
let store = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* keep going in memory */ } }

export const seals = () => store.seals;
export const sealsEarned = () => store.earned;
export const owns = (id: RewardId) => store.owned.includes(id);
export const isActive = (id: RewardId) => store.owned.includes(id) && store.active.includes(id);

export function award(n: number) { if (n <= 0) return; store.seals += n; store.earned += n; save(); }

/** Seals for winning a level: the win, a first-time bonus, and a bonus for a flawless defence. */
export function awardWin(level: LevelId, flawless: boolean): number {
  let n = EARN.levelWon;
  if (!store.firstWins.includes(level)) { n += EARN.firstWin; store.firstWins.push(level); }
  if (flawless) n += EARN.flawless;
  award(n);
  return n;
}

export function redeem(id: RewardId): { ok: boolean; reason: string } {
  const r = REWARDS.find((x) => x.id === id)!;
  if (owns(id)) return { ok: false, reason: 'Already yours.' };
  if (store.seals < r.cost) return { ok: false, reason: `Needs ${r.cost} seals (you have ${store.seals}).` };
  store.seals -= r.cost;
  store.owned.push(id);
  store.active.push(id);
  save();
  return { ok: true, reason: '' };
}

/** Owned rewards can be switched off and on again, for a harder game or a plainer page. */
export function toggle(id: RewardId) {
  if (!owns(id)) return;
  store.active = isActive(id) ? store.active.filter((x) => x !== id) : [...store.active, id];
  save();
}

/** Bonuses the active perks give a new game. */
export function activePerks(): Perks {
  return {
    gold: isActive('deepInkwell') ? 30 : 0,
    leaves: isActive('gildedStart') ? 1 : 0,
    castle: isActive('stoutWalls') ? 5 : 0,
  };
}

/** For tests and the debug hook: forget everything. */
export function resetRewards() { store = { seals: 0, earned: 0, owned: [], active: [], firstWins: [] }; save(); }

// ── Little ink pictures for the reward cards ────────────────────────────────

export function rewardIcon(id: RewardId, size = 64): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = size * dpr; cv.height = size * dpr; cv.style.width = cv.style.height = `${size}px`;
  const ctx = cv.getContext('2d')!;
  ctx.scale((dpr * size) / 64, (dpr * size) / 64);
  if (id === 'deepInkwell') {
    ctx.save(); ctx.translate(32, 36); ctx.scale(0.75, 0.75); inkInkwell(ctx, { x: 0, y: 0 }); ctx.restore();
    ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
    for (const [cx, cy] of [[14, 52], [22, 56], [46, 54]]) { ctx.beginPath(); ctx.ellipse(cx, cy, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  } else if (id === 'gildedStart') {
    ctx.save(); ctx.translate(32, 32); ctx.rotate(-0.6);
    const leaf = () => { ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(0, -14, 20, 0); ctx.quadraticCurveTo(0, 14, -20, 0); ctx.closePath(); };
    ctx.fillStyle = '#c9a85c'; leaf(); ctx.fill(); hatch(ctx, leaf, [-20, -14, 40, 28], 0.9, 2.4, 0.4); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; leaf(); ctx.stroke();
    ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(18, 0); for (let x = -12; x < 16; x += 6) { ctx.moveTo(x, 0); ctx.lineTo(x + 4, -5); ctx.moveTo(x, 0); ctx.lineTo(x + 4, 5); } ctx.stroke();
    ctx.restore();
  } else if (id === 'stoutWalls') {
    const R = rng(5);
    turret(ctx, 22, 58, 22, 36, 18, 'none', false, R);
    turret(ctx, 44, 58, 24, 46, 22, 'crescent', true, R);
  } else if (id === 'owl') {
    owl(ctx, 32, 58, 0, 1.6);
  } else {
    ctx.save(); ctx.fillStyle = '#6e1418';
    const R = rng(9);
    ctx.translate(0, 0);
    inkBlot(ctx, 32, 30, 11, R);
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#7a1c20'; ctx.fillRect(0, 0, 64, 64);
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, 56); ctx.quadraticCurveTo(32, 44, 52, 54); ctx.stroke();
  }
  return cv;
}

/** A small owl, feet at (x, y). It blinks now and then. */
export function owl(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, k = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  const body = () => { ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-11, -14, -7, -22); ctx.lineTo(-6, -27); ctx.lineTo(-3, -23); ctx.lineTo(3, -23); ctx.lineTo(6, -27); ctx.lineTo(7, -22); ctx.quadraticCurveTo(11, -14, 8, 0); ctx.closePath(); };
  ctx.fillStyle = PAPER; body(); ctx.fill();
  hatch(ctx, body, [-11, -28, 22, 28], -0.9, 1.6, 0.4);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.1; body(); ctx.stroke();
  // breast feathers
  ctx.lineWidth = 0.6; ctx.beginPath();
  for (let r = 0; r < 3; r++) for (let i = -1; i <= 1; i++) { const cx = i * 3.6 + (r % 2) * 1.8, cy = -10 + r * 3.2; ctx.moveTo(cx - 1.8, cy); ctx.quadraticCurveTo(cx, cy + 2, cx + 1.8, cy); }
  ctx.stroke();
  const shut = time % 5.7 < 0.16;
  ctx.fillStyle = PAPER; ctx.lineWidth = 0.9;
  for (const ex of [-3.4, 3.4]) { ctx.beginPath(); ctx.arc(ex, -18, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); eye(ctx, ex, -18, 2.4, 0, shut); }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-1.2, -15); ctx.lineTo(1.2, -15); ctx.lineTo(0, -12); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-3, 2); ctx.moveTo(3, 0); ctx.lineTo(3, 2); ctx.stroke();
  ctx.restore();
}
