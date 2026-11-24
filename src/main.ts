import './style.css';
import { BALANCE, TOTAL_WAVES, LEVEL_BALANCE, phaseRule, type TowerType, type EnemyType, type LevelId, type RareType } from './balance';
import {
  type GameState, newGame, step, rule, traceTower, untraceTower, undoTrace, clearTraces, canStartWave, startWave,
  pulseTower, pulseCheck, enemyPos, effectiveArmour, buildTower, buildCheck, placeGrant, bindTower, bindCheck, towerAt, towerById, emptyFoundations,
  towerDamage, toast, traceCheck, setLevel, RARE_TYPES,
} from './game';
import {
  MAP_W, MAP_H, NODE, FOUNDATION_IDS, INKWELL, snapToNetwork,
  routeToEdgePoint, dist, type Vec,
} from './map';
import { render, renderVictory, towerIconCanvas, enemyIconCanvas, levelThumbnail, type ViewState } from './render';
import { entry, record, recordedCount, resetCasebook } from './casebook';
import { LANES } from './map';
import { REWARDS, EARN, seals, sealsEarned, owns, isActive, redeem, toggle, activePerks, award, awardWin, rewardIcon, resetRewards, type RewardId } from './rewards';

// ── State ───────────────────────────────────────────────────────────────────
/** Which sheet is open, and whether the main menu is showing over it. */
let currentLevel: LevelId = 'fields';
let menuOpen = true;
let s: GameState = newGame(currentLevel, activePerks(), true);
/** Waves already paid out in seals this game, and whether the win has been. */
let paidWaves = 0;
let paidWin = false;
const view: ViewState = {
  hoverFoundation: null,
  selectedFoundation: null,
  bindPreview: null,
  gesture: { active: false, path: [], pointer: { x: 0, y: 0 }, slipping: 0 },
  touch: matchMedia('(pointer: coarse)').matches,
  inspectId: null,
};
/** Tower id awaiting bind confirmation. */
let bindConfirm: string | null = null;
let grantType: TowerType = BALANCE.towerTypes[0];
let popoverFor: string | null = null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('board');
const ctx = canvas.getContext('2d')!;
const margin = $('margin');
const ribbon = $('ribbon');
const popover = $('popover');
const overlay = $('overlay');
const toastsEl = $('toasts');

const fname = (f: string) => NODE[f].foundation!.name;
const tname = (t: TowerType) => BALANCE.towers[t].name;
const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);


// ── Canvas sizing ───────────────────────────────────────────────────────────
function resize() {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
}
new ResizeObserver(resize).observe(canvas);

function toMap(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * MAP_W, y: ((e.clientY - r.top) / r.height) * MAP_H };
}

/** Foundation under a map point: the stone ring, or the tower body above it. */
function hitFoundation(p: Vec, slack = 0): string | null {
  let best: string | null = null;
  let bd = Infinity;
  for (const f of FOUNDATION_IDS) {
    const n = NODE[f];
    const built = !!towerAt(s, f);
    const inRing = Math.hypot((p.x - n.x) / 40, (p.y - n.y) / 24) <= 1 + slack / 40;
    const inBody = built && Math.abs(p.x - n.x) <= 40 + slack && p.y <= n.y + 15 && p.y >= n.y - 145 - slack;
    if (inRing || inBody) {
      const d = dist(p, { x: n.x, y: n.y - (built ? 50 : 0) });
      if (d < bd) { bd = d; best = f; }
    }
  }
  return best;
}

/** Enemy under a map point (their bodies stand above their feet). */
function hitEnemy(p: Vec, r: number) {
  let best: GameState['enemies'][number] | null = null;
  let bd = Infinity;
  for (const e of s.enemies) {
    if (e.mode === 'leave') continue;
    const q = enemyPos(e);
    const h = e.type === 'cairn' ? 52 : 22;
    const d = Math.hypot(p.x - q.x, (p.y - (q.y - h)) * (e.type === 'cairn' ? 0.6 : 1));
    const rr = e.type === 'cairn' ? r + 32 : r + 6;
    if (d < rr && d < bd) { bd = d; best = e; }
  }
  return best;
}

// ── Trace gesture ───────────────────────────────────────────────────────────
const SNAP = 60;
const SLIP = 150;

function cancelGesture(reason?: string) {
  if (view.gesture.active && reason) toast(s, reason, 'bad');
  view.gesture = { active: false, path: [], pointer: { x: 0, y: 0 }, slipping: 0 };
}

// ── Touch: press and hold to preview a pulse ────────────────────────────────
// A quick tap still does what it always did (pulse in battle, open a tower between waves).
// Holding a finger on a tower, or on its Pulse button, previews its pulse instead and fires nothing.
const HOLD_MS = 420;
const HOLD_LINGER_MS = 2600;
interface Hold { pointerId: number; towerId: string; at: Vec; timer: number; long: boolean }
let hold: Hold | null = null;
let lingerTimer = 0;
function startHold(e: PointerEvent, towerId: string, at: Vec) {
  endHold(false);
  const h: Hold = { pointerId: e.pointerId, towerId, at, long: false, timer: 0 };
  h.timer = window.setTimeout(() => {
    h.long = true;
    window.clearTimeout(lingerTimer);
    previewFrom('touch', towerId);
    try { navigator.vibrate?.(12); } catch { /* not supported */ }
  }, HOLD_MS);
  hold = h;
}
/** Finish a hold. After a long press the preview lingers a moment so it can be read. */
function endHold(linger: boolean) {
  if (!hold) return;
  window.clearTimeout(hold.timer);
  if (hold.long && linger) {
    window.clearTimeout(lingerTimer);
    lingerTimer = window.setTimeout(() => { if (previewSource === 'touch') previewFrom(null, null); }, HOLD_LINGER_MS);
  } else if (hold.long && previewSource === 'touch') previewFrom(null, null);
  hold = null;
}
const isTouch = (e: PointerEvent) => e.pointerType === 'touch' || e.pointerType === 'pen';

canvas.addEventListener('pointerdown', (e) => {
  const p = toMap(e);
  closePopover();
  if (isTouch(e) && (s.phase === 'combat' || s.phase === 'prep')) {
    const f = hitFoundation(p, 14);
    const t = f ? towerAt(s, f) : undefined;
    if (previewable(t)) {
      // decide on release: a tap acts as before, a hold only previews
      startHold(e, t!.id, p);
      if (s.phase === 'prep') downAt = p;
      return;
    }
  }
  if (s.phase === 'combat') {
    const f = hitFoundation(p, view.touch ? 14 : 4);
    const t = f ? towerAt(s, f) : undefined;
    // A tower that can pulse wins; otherwise a click on an enemy inspects it.
    if (t && pulseCheck(s, t.id).ok) { pulseTower(s, t.id); return; }
    const foe = hitEnemy(p, view.touch ? 34 : 24);
    if (foe) { view.inspectId = foe.id; return; }
    if (t) pulseTower(s, t.id);
    else view.inspectId = null;
    return;
  }
  if (s.phase !== 'prep') return;
  if (dist(p, INKWELL) < 78 || dist(p, NODE.ink) < 60) {
    if (s.pendingGrant) { toast(s, 'Place the royal reinforcement first.', 'bad'); return; }
    if (s.traces.length >= rule(s).traces) { toast(s, `All ${rule(s).traces} traces drawn. Undo one to redraw.`, 'bad'); return; }
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    view.gesture = { active: true, path: [{ x: NODE.ink.x, y: NODE.ink.y }], pointer: p, slipping: 0 };
    e.preventDefault();
    return;
  }
  downAt = p;
});
let downAt: Vec | null = null;

canvas.addEventListener('pointermove', (e) => {
  const p = toMap(e);
  if (hold && e.pointerId === hold.pointerId) {
    // sliding away before the hold completes cancels it (nothing fires); after, the preview stays
    if (!hold.long && dist(p, hold.at) > 26) endHold(false);
    return;
  }
  if (isTouch(e)) return; // fingers do not hover: previews come from pressing and holding
  if (view.gesture.active) {
    view.gesture.pointer = p;
    const snap = snapToNetwork(p);
    if (snap && snap.d <= SNAP) {
      view.gesture.path = routeToEdgePoint(snap.child, snap.sampleIdx, snap.point);
      view.gesture.slipping = 0;
    } else if (!snap || snap.d > SLIP) {
      cancelGesture('The thread slipped off the leyline — nothing spent.');
    } else view.gesture.slipping = 1;
    return;
  }
  const f = hitFoundation(p);
  view.hoverFoundation = f;
  const t = f ? towerAt(s, f) : undefined;
  if (previewable(t)) previewFrom('canvas', t!.id);
  else if (previewSource === 'canvas') previewFrom(null, null);
  canvas.style.cursor =
    s.phase === 'prep' && (dist(p, INKWELL) < 78) ? 'grab'
      : s.phase === 'combat' && t && pulseCheck(s, t.id).ok ? 'pointer'
        : s.phase === 'prep' && f ? 'pointer' : 'default';
});

canvas.addEventListener('pointerup', (e) => {
  const p = toMap(e);
  if (hold && e.pointerId === hold.pointerId) {
    const h = hold;
    endHold(true);
    downAt = null;
    if (h.long) return; // a hold only previews
    // a tap: exactly what a tap did before
    if (s.phase === 'combat') {
      const t = towerById(s, h.towerId);
      if (t && pulseCheck(s, t.id).ok) pulseTower(s, t.id);
      else if (t) pulseTower(s, t.id); // lets the rules explain why not
    } else if (s.phase === 'prep') {
      const f = towerById(s, h.towerId)?.foundation;
      if (f) { view.selectedFoundation = f; openPopover(f); }
    }
    return;
  }
  if (view.gesture.active) {
    const f = hitFoundation(p, 22);
    if (!f) cancelGesture('Released before reaching a tower — nothing spent.');
    else {
      const t = towerAt(s, f);
      if (!t) { cancelGesture(`${fname(f)} is an empty foundation — nothing spent.`); return; }
      const c = traceCheck(s, t.id);
      if (!c.ok) { cancelGesture(c.reason); return; }
      traceTower(s, t.id);
      cancelGesture();
    }
    return;
  }
  if (downAt && dist(downAt, p) < 14 && s.phase === 'prep') {
    const f = hitFoundation(p, view.touch ? 12 : 0);
    if (f) { view.selectedFoundation = f; openPopover(f); }
    else view.selectedFoundation = null;
  }
  downAt = null;
});
canvas.addEventListener('pointercancel', () => { cancelGesture(); downAt = null; endHold(false); });
// no callout or selection menu on a long press
canvas.addEventListener('contextmenu', (e) => { if (hold || previewSource === 'touch') e.preventDefault(); });
canvas.addEventListener('pointerleave', () => { if (!view.gesture.active) view.hoverFoundation = null; if (previewSource === 'canvas') previewFrom(null, null); });

// ── Popover (build / tower info) ────────────────────────────────────────────
function openPopover(f: string) {
  popoverFor = f;
  const n = NODE[f];
  popover.style.left = `${(n.x / MAP_W) * 100}%`;
  popover.style.top = `${(n.y / MAP_H) * 100}%`;
  popover.classList.toggle('flip-x', n.x > MAP_W * 0.62);
  popover.classList.toggle('flip-y', n.y > MAP_H * 0.6);
  popover.hidden = false;
  fillPopover();
  (popover.querySelector('button:not([disabled])') as HTMLButtonElement | null)?.focus({ preventScroll: true });
}
function closePopover() { popover.hidden = true; popoverFor = null; view.selectedFoundation = null; }

function fillPopover() {
  const f = popoverFor;
  if (!f) return;
  const t = towerAt(s, f);
  const bound = !!t?.bound;
  let html = `<button class="x" data-act="close" aria-label="Close">×</button><h3>${esc(fname(f))}</h3>${bound ? '<p class="sub"><b class="giltxt">Bound in gold · a free pulse every wave</b></p>' : ''}`;
  if (t) {
    const st = BALANCE.towers[t.type];
    html += `<p><b>${esc(st.name)}</b>${t.royal ? ' (royal)' : ''} · ${towerDamage(s, t).toFixed(1).replace('.0', '')} dmg / ${st.cooldown}s · range ${st.range}</p>
      <p class="pulse"><b>Pulse — ${esc(st.pulseName)}:</b> ${esc(st.pulseText)}</p>`;
    if (s.phase === 'prep' && !t.bound) {
      html += t.traced
        ? `<button data-act="untrace" data-id="${t.id}">Remove this thread</button>`
        : `<p class="hint">Drag from the inkwell along the leyline to prepare it.</p>`;
      const bc = bindCheck(s, t.id);
      html += `<p class="sub" style="margin-top:8px">${bc.ok ? '' : esc(bc.reason)}</p><button data-act="bindAsk" data-id="${t.id}" class="gild" ${bc.ok ? '' : 'disabled'}>Bind in gold (${BALANCE.bindCost} leaves)</button>`;
    }
  } else if (s.pendingGrant) {
    html += `<p class="royal">Royal reinforcement — free. Choose its type:</p><div class="choices">`;
    for (const ty of BALANCE.towerTypes) html += `<button data-act="grant" data-f="${f}" data-type="${ty}" class="choice"><span class="ico" data-tower="${ty}"></span><span>${esc(tname(ty))}<small>free</small></span></button>`;
    html += `</div>`;
  } else {
    html += `<div class="choices">`;
    for (const ty of BALANCE.towerTypes) {
      const c = buildCheck(s, f, ty);
      html += `<button data-act="build" data-f="${f}" data-type="${ty}" class="choice" ${c.ok ? '' : 'disabled'} title="${esc(c.reason || BALANCE.towers[ty].pulseText)}"><span class="ico" data-tower="${ty}"></span><span>${esc(tname(ty))}<small>${BALANCE.towers[ty].cost} gold</small></span></button>`;
    }
    html += `</div>`;
  }
  popover.innerHTML = html;
  hydrateIcons(popover);
}

popover.addEventListener('click', (e) => handleAction(e));

// ── Actions (delegated) ─────────────────────────────────────────────────────
function handleAction(e: Event) {
  const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!el || (el as HTMLButtonElement).disabled) return;
  const a = el.dataset.act!;
  if (a === 'pulse' && swallowPulseClick) { swallowPulseClick = false; return; } // that was a long press: preview only
  const id = el.dataset.id!;
  const f = el.dataset.f!;
  const ty = el.dataset.type as TowerType;
  switch (a) {
    case 'close': closePopover(); break;
    case 'trace': traceTower(s, id); break;
    case 'untrace': untraceTower(s, id); if (popoverFor) fillPopover(); break;
    case 'undo': undoTrace(s); break;
    case 'clear': clearTraces(s); break;
    case 'pulse': pulseTower(s, id); break;
    case 'select': view.selectedFoundation = f; openPopover(f); return;
    case 'build': if (buildTower(s, f, ty)) closePopover(); else fillPopover(); break;
    case 'grantType': grantType = ty; break;
    case 'grant': if (placeGrant(s, f, ty ?? grantType)) closePopover(); break;
    case 'bindAsk': bindConfirm = id; view.bindPreview = towerById(s, id)?.foundation ?? null; closePopover(); margin.querySelector('.bind')?.scrollIntoView({ block: 'nearest' }); break;
    case 'bindCancel': bindConfirm = null; view.bindPreview = null; break;
    case 'bindDo': if (bindConfirm && bindTower(s, bindConfirm)) { bindConfirm = null; view.bindPreview = null; } break;
    case 'start': if (startWave(s)) { closePopover(); bindConfirm = null; view.bindPreview = null; } break;
    case 'restart': restart(); break;
    case 'resume': s.paused = false; break;
    case 'play': startLevel(el.dataset.level as LevelId); break;
    case 'menu': openMenu(); break;
    case 'closeMenu': closeMenu(); break;
    case 'menuStart': menuView = 'levels'; renderMenu(); return;
    case 'menuRewards': menuView = 'rewards'; renderMenu(); return;
    case 'menuCasebook': menuView = 'casebook'; renderMenu(); return;
    case 'menuExit': menuView = 'exit'; renderMenu(); return;
    case 'menuBack': menuView = 'title'; renderMenu(); return;
    case 'redeem': {
      const r = redeem(id as RewardId);
      renderMenu();
      const name = REWARDS.find((x) => x.id === id)!.name;
      if (r.ok) { applyLooks(); flashMenu(`${name} is yours.`); } else flashMenu(r.reason);
      (menuEl.querySelector(`[data-act="toggleReward"][data-id="${id}"]`) as HTMLButtonElement | null)?.focus({ preventScroll: true });
      return;
    }
    case 'toggleReward': toggle(id as RewardId); applyLooks(); renderMenu(); (menuEl.querySelector(`[data-id="${id}"]`) as HTMLButtonElement | null)?.focus({ preventScroll: true }); return;
    case 'ribbon': ribbonFolded = !ribbonFolded; break;
  }
  lastSig = '';
}
margin.addEventListener('click', handleAction);
/** Set by a long press on a Pulse button so that the click following it does not fire. */
let swallowPulseClick = false;
margin.addEventListener('pointerdown', (e) => {
  if (!isTouch(e)) return;
  const b = (e.target as HTMLElement).closest('[data-act="pulse"]') as HTMLButtonElement | null;
  if (!b || b.disabled) return;
  startHold(e, b.dataset.id!, { x: e.clientX, y: e.clientY });
});
const marginRelease = (e: PointerEvent) => {
  if (!hold || e.pointerId !== hold.pointerId) return;
  if (hold.long) swallowPulseClick = true;
  endHold(true);
};
margin.addEventListener('pointerup', marginRelease);
margin.addEventListener('pointercancel', (e) => { if (hold && e.pointerId === hold.pointerId) endHold(false); });
margin.addEventListener('pointermove', (e) => { if (hold && e.pointerId === hold.pointerId && !hold.long && Math.hypot(e.clientX - hold.at.x, e.clientY - hold.at.y) > 18) endHold(false); });
margin.addEventListener('contextmenu', (e) => { if ((e.target as HTMLElement).closest('[data-act="pulse"]')) e.preventDefault(); });
margin.addEventListener('toggle', (e) => {
  const d = e.target as HTMLDetailsElement;
  const k = d.dataset?.fold as 'build' | 'bind' | undefined;
  if (k) foldOpen[k] = d.open;
}, true);
overlay.addEventListener('click', handleAction);
ribbon.addEventListener('click', handleAction);
margin.addEventListener('pointerover', (e) => {
  const el = (e.target as HTMLElement).closest('[data-bindf]') as HTMLElement | null;
  if (!bindConfirm) view.bindPreview = el ? el.dataset.bindf! : null;
  const pulse = (e.target as HTMLElement).closest('[data-act="pulse"]') as HTMLElement | null;
  if (pulse) previewFrom('margin', pulse.dataset.id!);
  else if (previewSource === 'margin' && !(e.target as HTMLElement).closest('.tower-row')) previewFrom(null, null);
});
margin.addEventListener('pointerout', (e) => {
  if (!bindConfirm) view.bindPreview = null;
  const to = (e as PointerEvent).relatedTarget as HTMLElement | null;
  if (previewSource === 'margin' && !to?.closest?.('[data-act="pulse"]') && document.activeElement?.getAttribute('data-act') !== 'pulse') previewFrom(null, null);
});
margin.addEventListener('focusin', (e) => {
  const el = (e.target as HTMLElement).closest('[data-bindf]') as HTMLElement | null;
  if (el && !bindConfirm) view.bindPreview = el.dataset.bindf!;
  const pulse = (e.target as HTMLElement).closest('[data-act="pulse"]') as HTMLElement | null;
  if (pulse) previewFrom('margin', pulse.dataset.id!);
});
margin.addEventListener('focusout', () => { if (!bindConfirm) view.bindPreview = null; if (previewSource === 'margin') previewFrom(null, null); });

/** Who is asking for a pulse preview: a Pulse control in the margin, or the pointer over a tower on the map. */
let previewSource: 'margin' | 'canvas' | 'touch' | null = null;
function previewFrom(src: 'margin' | 'canvas' | 'touch' | null, towerId: string | null) {
  previewSource = towerId ? src : null;
  view.pulsePreview = towerId;
}
/** A tower whose pulse can be previewed: prepared (traced) or bound, and not yet spent this wave. */
function previewable(t: GameState['towers'][number] | undefined) {
  return !!t && (t.traced || t.bound) && !t.committed && (s.phase === 'prep' || s.phase === 'combat');
}

$('btnPause').addEventListener('click', togglePause);
$('btnSpeed').addEventListener('click', () => { s.speed = s.speed === 1 ? 2 : 1; });
$('btnRestart').addEventListener('click', restart);

function togglePause() {
  if (s.phase !== 'combat' && s.phase !== 'prep') return;
  s.paused = !s.paused;
  lastSig = '';
}

function restart() {
  view.inspectId = null;
  const speed = s.speed;
  s = newGame(currentLevel, activePerks(), true);
  s.speed = speed;
  paidWaves = 0; paidWin = false;
  bindConfirm = null;
  grantType = BALANCE.towerTypes[0];
  view.bindPreview = null;
  view.selectedFoundation = null;
  cancelGesture();
  closePopover();
  lastSig = '';
  toast(s, 'A fresh page. The siege begins again.', 'info');
}

window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (menuOpen) {
    if (e.key === 'Escape') { if (menuView !== 'title') { menuView = 'title'; renderMenu(); } else if (menuCanClose()) closeMenu(); }
    return;
  }
  if (e.key === 'Escape') { closePopover(); cancelGesture(); bindConfirm = null; view.bindPreview = null; lastSig = ''; return; }
  if (e.key === 'p' || e.key === 'P' || (e.key === ' ' && tag !== 'BUTTON')) { e.preventDefault(); togglePause(); return; }
  if ((e.key === 'u' || e.key === 'U') && s.phase === 'prep') { undoTrace(s); return; }
  if (e.key === 'Enter' && tag !== 'BUTTON' && s.phase === 'prep') { startWave(s); return; }
  if (s.phase === 'combat' && /^[1-9]$/.test(e.key)) {
    const prepared = pulseable();
    const t = prepared[Number(e.key) - 1];
    if (t) pulseTower(s, t.id);
  }
});

// ── Margin, HUD, ribbon ─────────────────────────────────────────────────────
let lastSig = '';

function signature(): string {
  return JSON.stringify([
    s.phase, s.paused, s.wave, s.phase === 'prep' ? s.gold : 0, s.leaves, s.pendingGrant, s.pulsesLeft, s.traces,
    s.towers.map((t) => [t.id, t.type, t.traced, t.committed, t.bound]), bindConfirm, grantType, s.resetBanner > 0,
  ]);
}

function renderRibbon() {
  const def = BALANCE.waves[s.wave - 1];
  if (!def || s.phase === 'victory') { ribbon.hidden = true; return; }
  ribbon.hidden = false;
  ribbon.classList.toggle('folded', ribbonFolded);
  ribbon.innerHTML = `<div class="ribbon-body"><button class="fold" data-act="ribbon" aria-expanded="${!ribbonFolded}" title="${ribbonFolded ? 'Show the wave preview' : 'Fold the bookmark away'}">${ribbonFolded ? '\u25be' : '\u25b4'}</button><p class="kicker">Wave ${s.wave} of ${TOTAL_WAVES}</p><h3>${esc(def.title)}</h3>
    <p class="lesson">${esc(def.lesson)}</p></div>`;
  hydrateIcons(ribbon);
}

function towerRow(t: GameState['towers'][number], mode: 'prep' | 'combat'): string {
  const badges = `${t.bound ? '<span class="badge gilt">bound · free pulse</span>' : ''}${t.royal ? '<span class="badge royal">royal</span>' : ''}`;
  let btn = '';
  if (mode === 'prep' && t.bound) {
    btn = `<button disabled class="gilt-btn" title="Bound towers are never traced">Gilded</button>`;
  } else if (mode === 'prep') {
    const full = s.traces.length >= rule(s).traces;
    btn = t.traced
      ? `<button data-act="untrace" data-id="${t.id}" aria-pressed="true" class="traced" title="Remove this thread">Traced ✓</button>`
      : `<button data-act="trace" data-id="${t.id}" aria-pressed="false" ${full || s.pendingGrant ? 'disabled' : ''} title="Prepare without dragging">Trace</button>`;
  } else {
    const c = pulseCheck(s, t.id);
    btn = t.committed ? `<button disabled class="spent">Pulse sent<small>still attacking</small></button>`
      : !t.bound && s.pulsesLeft <= 0 ? `<button disabled class="spent dry" title="The shared pulse was spent on another tower">No pulse left<small>still attacking</small></button>`
        : `<button data-act="pulse" data-id="${t.id}" class="pulse ${t.bound ? 'gild' : ''}" ${c.ok ? '' : 'disabled'} aria-describedby="pulse-help">${t.bound ? 'Free pulse' : 'Pulse'}</button>`;
  }
  return `<li class="tower-row ${t.traced ? 'is-traced' : ''} ${t.bound ? 'is-bound' : ''}"><span class="ico" data-tower="${t.type}"></span><span class="tw"><b>${esc(tname(t.type))}</b><small>${esc(fname(t.foundation))}</small>${badges}</span>${btn}</li>`;
}

/** In battle: say plainly whom the shared pulse is for, and once spent, what that means for the others. */
function sharedNote(): string {
  const r = rule(s);
  const prepared = s.towers.filter((t) => t.traced);
  const names = prepared.map((t) => tname(t.type));
  if (s.pulsesLeft > 0) {
    if (prepared.length < 2) return '';
    const list = names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
    return `<p class="coach">${r.pulses === 1 ? `Your ${list} share <b>one pulse</b> this wave.` : `Your ${list} share <b>${s.pulsesLeft} pulse${s.pulsesLeft === 1 ? '' : 's'}</b> this wave.`} Fire now, wait for a crowd, or save it for the other.</p>`;
  }
  const used = prepared.filter((t) => t.committed).map((t) => tname(t.type));
  const dry = prepared.filter((t) => !t.committed).map((t) => tname(t.type));
  if (!used.length) return '';
  return `<p class="coach spent">The shared pulse went to the <b>${used.join(' and the ')}</b>.${dry.length ? ` The ${dry.join(' and the ')}'s thread is dry for this wave.` : ''} Every tower keeps attacking on its own.</p>`;
}

/** First-time help: Level 1, wave 1, before it starts. */
const onboarding = () => s.level === 'fields' && s.wave === 1;
/** Build and Bind are folded away during the first preparation; the player may open them. */
let foldOpen = { build: false, bind: false };
let foldWave = -1;

/** Towers that can be pulsed this wave, gilded first: the order the number keys use. */
function pulseable() { return [...s.towers.filter((t) => t.bound), ...s.towers.filter((t) => t.traced)]; }

function renderMargin() {
  const r = rule(s);
  const def = BALANCE.waves[s.wave - 1];
  let h = '';
  if (s.phase === 'prep') {
    h += `<h2><small>Preparation</small>Wave ${s.wave}: ${esc(def.title)}</h2>`;
    if (s.resetBanner > 0 && !s.traces.length) {
      h += `<div class="notice fade">The ink has faded. Every thread from the last wave is gone, and unspent pulses with it. <b>0 of ${r.traces} traced.</b></div>`;
    }
    if (s.pendingGrant) {
      h += `<div class="notice royal-card"><h3>A royal reinforcement!</h3><p>The Crown sends a fourth tower, free of charge, so the ward can meet its new demands: <b>${r.traces} threads</b> and <b>${r.pulses} pulses</b> a wave. Choose its type, then an empty foundation.</p>
        <div class="choices row">${BALANCE.towerTypes.map((ty) => `<button data-act="grantType" data-type="${ty}" class="choice ${grantType === ty ? 'on' : ''}" aria-pressed="${grantType === ty}"><span class="ico" data-tower="${ty}"></span><span>${esc(tname(ty))}</span></button>`).join('')}</div>
        <p class="sub">Place the ${esc(tname(grantType))} at:</p>
        <div class="flist">${emptyFoundations(s).map((f) => `<button data-act="grant" data-f="${f}" data-type="${grantType}">${esc(fname(f))}</button>`).join('')}</div></div>`;
    }
    // Threads
    const coach = onboarding();
    if (foldWave !== s.wave) { foldWave = s.wave; foldOpen = { build: false, bind: false }; }
    h += `<section class="card threads"><h3>Threads <span class="need">${s.traces.length} of ${r.traces}</span></h3>
      ${coach ? '<p class="coach lead">All towers attack. Trace two. During the wave, choose one to pulse.</p>' : ''}
      <p class="hint">Press the <b>inkwell</b> beside the castle, follow a leyline and release on a tower${coach ? ', or use the <b>Trace</b> buttons below' : ''}. Each thread prepares one tower for the next wave only.</p>
      <ul class="towers">${s.towers.map((t) => towerRow(t, 'prep')).join('')}</ul>
      <div class="row"><button data-act="undo" ${s.traces.length ? '' : 'disabled'}>Undo last</button><button data-act="clear" ${s.traces.length ? '' : 'disabled'}>Clear all</button></div></section>`;
    // Build
    const empties = emptyFoundations(s);
    h += (coach ? `<details class="card fold" data-fold="build" ${foldOpen.build ? 'open' : ''}><summary><h3>Build <span class="need">${s.gold} gold</span></h3></summary>` : `<section class="card"><h3>Build <span class="need">${s.gold} gold</span></h3>`) + `
      <p class="hint">Click an empty foundation on the map, or pick one here. ${BALANCE.towerTypes.map((ty) => `${esc(tname(ty).split(' ')[0])} ${BALANCE.towers[ty].cost}`).join(' · ')}.</p>
      <div class="flist">${empties.map((f) => `<button data-act="select" data-f="${f}" ${s.pendingGrant ? 'disabled' : ''}>${esc(fname(f))}</button>`).join('') || '<em>Every foundation is built.</em>'}</div>${coach ? '</details>' : '</section>'}`;
    // Bind
    h += coach ? `<details class="card bind fold" data-fold="bind" ${foldOpen.bind ? 'open' : ''}><summary><h3>Bind a tower <span class="need gilt">${s.leaves} / ${BALANCE.bindCost} leaves</span></h3></summary>` : `<section class="card bind"><h3>Bind a tower <span class="need gilt">${s.leaves} / ${BALANCE.bindCost} leaves</span></h3>`;
    const confirmT = bindConfirm ? towerById(s, bindConfirm) : undefined;
    if (confirmT) {
      h += `<div class="confirm"><p><b>Bind the ${esc(tname(confirmT.type))} at ${esc(fname(confirmT.foundation))} in gold?</b></p>
        <p>Costs <b>${BALANCE.bindCost} Gilded Leaves</b> (you have ${s.leaves}). From now on it has <b>its own free pulse every wave</b>, with no trace needed and no shared charge spent.</p>
        <p class="sub">It can no longer be traced, so your ${r.traces} threads each wave go to other towers.${confirmT.traced ? ' Its thread this round is returned.' : ''}</p>
        <div class="row"><button data-act="bindDo" class="gild">Bind for ${BALANCE.bindCost} leaves</button><button data-act="bindCancel">Cancel</button></div></div>`;
    } else {
      const unbound = s.towers.filter((t) => !t.bound);
      const first = unbound[0] ? bindCheck(s, unbound[0].id) : { ok: false, reason: '' };
      h += `<p class="hint">${s.leaves < BALANCE.bindCost
        ? `Gilded Leaves ${s.leaves}/${BALANCE.bindCost} · one for each wave survived. Bind a tower at ${BALANCE.bindCost}: it gets a free pulse every wave, no trace needed.`
        : first.ok ? 'Choose a tower. Hover or focus to preview its gold path.' : esc(first.reason)}</p>
        <div class="branches">${unbound.map((t) => {
          const c = bindCheck(s, t.id);
          return `<button data-act="bindAsk" data-id="${t.id}" data-bindf="${t.foundation}" ${c.ok ? '' : 'disabled'} title="${esc(c.reason)}"><b>${esc(tname(t.type))}</b><small>${esc(fname(t.foundation))}</small></button>`;
        }).join('')}${s.towers.filter((t) => t.bound).map((t) => `<button disabled class="bound"><b>${esc(tname(t.type))}</b><small>${esc(fname(t.foundation))} · bound in gold</small></button>`).join('')}</div>`;
    }
    h += coach ? '</details>' : '</section>';
    const c = canStartWave(s);
    h += `<div class="start"><button data-act="start" class="primary" ${c.ok ? '' : 'disabled'}>Start wave ${s.wave}</button><p class="sub">${c.ok ? 'Building, tracing and binding lock once the wave begins.' : esc(c.reason)}</p></div>`;
  } else if (s.phase === 'combat') {
    h += `<h2><small>In battle</small>Wave ${s.wave}: ${esc(def.title)}</h2>
      <section class="card pulses"><h3>Pulses <span class="need">${s.pulsesLeft} of ${r.pulses}</span></h3>
      <div class="beads" aria-hidden="true">${Array.from({ length: r.pulses }, (_, i) => `<i class="${i < s.pulsesLeft ? 'on' : ''}"></i>`).join('')}</div>
      ${sharedNote()}
      <p class="hint" id="pulse-help">Hover or focus a Pulse button (or the tower on the map), or press and hold on a touch screen, to preview what it would do; nothing is spent until you click or tap. Click a tower with a wet ink drop, or press its number, to send the pulse. Shared charges never recharge and vanish at wave end. Gilded towers fire their own free pulse. Every tower keeps attacking on its own.</p>
      <ul class="towers">${pulseable().map((t, i) => towerRow(t, 'combat').replace('<span class="ico"', `<kbd>${i + 1}</kbd><span class="ico"`)).join('')}</ul></section>
      <section class="card"><h3>Unthreaded towers</h3><ul class="towers dim">${s.towers.filter((t) => !t.traced && !t.bound).map((t) => `<li class="tower-row"><span class="ico" data-tower="${t.type}"></span><span class="tw"><b>${esc(tname(t.type))}</b><small>${esc(fname(t.foundation))} · attacking</small></span></li>`).join('') || '<li class="sub">None</li>'}</ul></section>`;
  }
  if (s.phase === 'victory') {
    const T = STORY[s.level], next = T.next ? LEVELS.find((l) => l.id === T.next)! : null;
    h = `<h2><small>${T.num} complete</small>${T.heldTitle}</h2><p class="hint">${T.heldHint}</p><div class="start">${next
      ? `<button data-act="play" data-level="${next.id}" class="primary">On to ${next.sub}: ${next.name.replace(/^The /, 'the ')}</button>`
      : '<button data-act="menu" class="primary">Back to the menu</button>'}<button data-act="restart">${T.again}</button></div>`;
  }
  if (s.phase === 'defeat') h = `<h2><small>Wave ${s.wave}</small>${STORY[s.level].fallen}</h2><p class="hint">Restart clears gold, leaves, binds and every thread.</p><div class="start"><button data-act="restart" class="primary">Restart this level</button><button data-act="menu">Main menu</button></div>`;
  const focused = document.activeElement as HTMLElement | null;
  const key = focused && margin.contains(focused) ? focused.getAttribute('data-act') + '|' + (focused.dataset.id ?? focused.dataset.f ?? focused.dataset.type ?? '') : null;
  margin.innerHTML = h;
  hydrateIcons(margin);
  if (key) {
    const [act, k] = key.split('|');
    const again = [...margin.querySelectorAll<HTMLElement>(`[data-act="${act}"]`)].find((el) => (el.dataset.id ?? el.dataset.f ?? el.dataset.type ?? '') === k);
    (again && !(again as HTMLButtonElement).disabled ? again : margin.querySelector<HTMLElement>('button:not([disabled])'))?.focus({ preventScroll: true });
  }
}

function renderOverlay() {
  if (s.phase === 'victory') {
    overlay.hidden = false;
    overlay.className = 'victory';
    const bound = s.towers.filter((t) => t.bound).length;
    const stats = `<p class="sub">Castle ${s.castleHp}/${s.castleMax} · ${s.kills} foes turned back · ${bound} tower${bound === 1 ? '' : 's'} bound in gold</p>`;
    const T = STORY[s.level], L = LEVELS.find((l) => l.id === s.level)!, next = T.next ? LEVELS.find((l) => l.id === T.next)! : null;
    overlay.innerHTML = next
      ? `<div class="plate"><p class="kicker">${L.sub} · ${L.name}</p><h2>${T.plateTitle}</h2><p class="caption">${T.caption}</p>${stats}<button data-act="play" data-level="${next.id}" class="primary">On to ${next.sub}: ${next.name.replace(/^The /, 'the ')}</button> <button data-act="restart">Read it again</button></div>`
      : `<div class="plate"><p class="kicker">The End</p><h2>Defence of Goosebridge Castle</h2><p class="caption">${T.caption}</p>${stats}<button data-act="menu" class="primary">Back to the menu</button> <button data-act="restart">Read it again</button></div>`;
    recordWin(s.level, s.castleHp);
  } else if (s.phase === 'defeat') {
    overlay.hidden = false;
    overlay.className = 'defeat';
    overlay.innerHTML = `<div class="plate"><p class="kicker">Wave ${s.wave}</p><h2>${STORY[s.level].fallen}</h2><p class="caption">The ink ran dry before the last ward could hold. Turn back the page and try another thread.</p><button data-act="restart" class="primary">Restart this level</button> <button data-act="menu">Main menu</button></div>`;
  } else if (s.paused) {
    overlay.hidden = false;
    overlay.className = 'paused';
    overlay.innerHTML = `<div class="plate"><h2>Paused</h2><p class="caption">A bookmark holds the page.</p><button data-act="resume" class="primary">Resume</button> <button data-act="restart">Restart</button></div>`;
  } else {
    overlay.hidden = true;
    overlay.innerHTML = '';
  }
  const btn = overlay.querySelector('button.primary') as HTMLButtonElement | null;
  btn?.focus({ preventScroll: true });
}

function renderHud() {
  $('hp').textContent = `${s.castleHp}/${s.castleMax}`;
  ($('hpbar') as HTMLElement).style.width = `${(s.castleHp / s.castleMax) * 100}%`;
  $('wave').textContent = `${Math.min(s.wave, TOTAL_WAVES)}/${TOTAL_WAVES}`;
  $('gold').textContent = String(s.gold);
  $('leaves').innerHTML = s.phase === 'victory' || s.phase === 'defeat' ? `${s.leaves}`
    : s.leaves >= BALANCE.bindCost ? `${s.leaves} <em>· ready to bind</em>`
      : `${s.leaves}/${BALANCE.bindCost} <em>· Bind a tower at ${BALANCE.bindCost}</em>`;
  const r = phaseRule(s.wave);
  const pr = $('phaseRes');
  if (s.phase === 'prep') {
    pr.className = 'phase-res prep' + (s.traces.length === r.traces ? ' done' : '');
    pr.innerHTML = s.pendingGrant ? `<b>Place the royal reinforcement</b>` : `<b>Choose ${r.traces} towers</b> · ${s.traces.length} of ${r.traces} traced`;
  } else if (s.phase === 'combat') {
    pr.className = 'phase-res combat' + (s.pulsesLeft === 0 ? ' empty' : '');
    const gild = s.towers.filter((t) => t.bound);
    pr.innerHTML = `<b>Pulses ${s.pulsesLeft}</b> of ${r.pulses} <span class="beads">${Array.from({ length: r.pulses }, (_, i) => `<i class="${i < s.pulsesLeft ? 'on' : ''}"></i>`).join('')}</span>${gild.length ? ` <span class="gildres">+ ${gild.filter((t) => !t.committed).length} gilded</span>` : ''}`;
  } else {
    pr.className = 'phase-res';
    pr.textContent = s.phase === 'victory' ? 'Victory' : 'Defeat';
  }
  $('btnPause').textContent = s.paused ? 'Resume' : 'Pause';
  ($('btnPause') as HTMLButtonElement).disabled = s.phase === 'victory' || s.phase === 'defeat';
  $('btnSpeed').textContent = `Speed ×${s.speed}`;
  document.body.dataset.phase = s.phase;
}

const inspectEl = $('inspect');
let inspectSig = '';
function renderInspect() {
  const e = view.inspectId !== null ? s.enemies.find((x) => x.id === view.inspectId) : undefined;
  if (!e || s.phase !== 'combat') {
    if (view.inspectId !== null && !e) view.inspectId = null;
    if (!inspectEl.hidden) { inspectEl.hidden = true; inspectSig = ''; }
    return;
  }
  const st = BALANCE.enemies[e.type];
  const arm = effectiveArmour(e);
  const hp = Math.max(0, Math.ceil(e.hp));
  const status = e.mode === 'kneel' ? `Kneeling at its stone \u2014 blocking the road behind (${Math.ceil(e.modeT ?? 0)}s)`
    : e.mode === 'seek' ? 'Walking to its fallen name-stone'
      : e.mode === 'follow' ? 'Following its Stone-Bearer'
        : e.stun > 0 ? 'Dazed' : '';
  const speedWord = st.speed >= 90 ? 'fast' : st.speed >= 35 ? 'steady' : 'slow';
  const sig = [e.id, hp, arm, e.vulnT > 0, status].join('|');
  if (sig === inspectSig) return;
  inspectSig = sig;
  inspectEl.hidden = false;
  inspectEl.innerHTML = `<button class="x" data-act="uninspect" aria-label="Close">\u00d7</button>
    <div class="ins-head"><span class="eico" data-enemy="${e.type}"></span><div><h3>${esc(st.name)}</h3><p class="sub">${esc(st.note)}</p></div></div>
    <dl class="ins-stats">
      <div><dt>Health</dt><dd>${hp} / ${st.hp}<span class="bar"><i style="width:${(100 * hp) / st.hp}%"></i></span></dd></div>
      <div><dt>Armour</dt><dd>${arm}${arm !== st.armour ? ` <small>(${st.armour} base, ${e.vulnT > 0 ? 'tarnished' : 'corroded'})</small>` : ''}</dd></div>
      <div><dt>Speed</dt><dd>${st.speed} <small>${speedWord}</small></dd></div>
    </dl>${status ? `<p class="status">${esc(status)}</p>` : ''}`;
  hydrateIcons(inspectEl);
}
inspectEl.addEventListener('click', (ev) => { if ((ev.target as HTMLElement).closest('[data-act=uninspect]')) { view.inspectId = null; } });

let toastSig = '';
function renderToasts() {
  const sig = s.toasts.map((t) => t.text).join('|');
  if (sig === toastSig) return;
  toastSig = sig;
  toastsEl.innerHTML = s.toasts.map((t) => `<div class="toast ${t.kind}">${esc(t.text)}</div>`).join('');
}

const iconCache = new Map<string, HTMLCanvasElement>();
function hydrateIcons(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-tower]').forEach((el) => {
    const ty = el.dataset.tower as TowerType;
    const k = 't' + ty;
    if (!iconCache.has(k)) iconCache.set(k, towerIconCanvas(ty, 40));
    const src = iconCache.get(k)!;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height; c.style.width = c.style.height = '40px';
    c.getContext('2d')!.drawImage(src, 0, 0);
    el.replaceChildren(c);
  });
  root.querySelectorAll<HTMLElement>('[data-enemy]').forEach((el) => {
    const ty = el.dataset.enemy as EnemyType;
    const k = 'e' + ty;
    if (!iconCache.has(k)) iconCache.set(k, enemyIconCanvas(ty, 44));
    const src = iconCache.get(k)!;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height; c.style.width = c.style.height = '44px';
    c.getContext('2d')!.drawImage(src, 0, 0);
    el.replaceChildren(c);
  });
}

// ── Main menu ───────────────────────────────────────────────────────────────
const menuEl = $('menu');
const LEVELS: { id: LevelId; name: string; sub: string; blurb: string }[] = [
  { id: 'fields', name: 'Gate Defence', sub: 'Level 1', blurb: 'Two roads cross the fields to Goosebridge Castle: the Fen Levy on the Mill Road, the war dogs over the bridge. Bramble, Ember, Bell and Verdigris hold the way.' },
  { id: 'courtyard', name: 'The Castle Courtyard', sub: 'Level 2', blurb: 'The outer wall has fallen. The levy pour through the ruined gatehouse and the dogs leap the breach. Hold the east gate with gargoyles, mangonels, ink fountains and banners.' },
  { id: 'keep', name: 'The Keep', sub: 'Level 3', blurb: 'Inside the keep itself, seen in cut-away. The levy climb the Great Stair, the dogs come up from the cellars, and every floor leads to the wizard\u2019s study. Hold the stairs with suits of armour, flapping libraries, chandeliers and the great hearth.' },  { id: 'fen', name: 'The Flooded Fen', sub: 'Level 4', blurb: 'The water meadows in flood, the levy\u2019s own home ground. They wade the Reed Causeway, the dogs run the Eel Dyke past the sluice, and both make for the weir house. Hold it with waterwheels, heron roosts, eel traps and marsh lanterns.' },
  { id: 'barrows', name: 'The Barrows', sub: 'Level 5', blurb: 'The chalk downs at dusk, where the dogs are kennelled in the old mounds and the giants sleep. The last stand, at the Ward Ring. Hold it with standing stones, bone chimes, barrow beacons and the wardens of the dead.' },
];

/** What each level's ending says, and where it leads. */
const STORY: Record<LevelId, { num: string; fallen: string; heldTitle: string; heldHint: string; again: string; plateTitle: string; caption: string; next?: LevelId }> = {
  fields: { num: 'Level 1', fallen: 'The gate has fallen', heldTitle: 'The gate held', heldHint: 'Every wave held at the gate. The fight moves inside the walls.', again: 'Play Gate Defence again', plateTitle: 'The gate is held',
    caption: '\u201cThe levy broke on the roads, and the dogs on the bridge. But the old wizard turned the page: the outer wall had already fallen.\u201d', next: 'courtyard' },
  courtyard: { num: 'Level 2', fallen: 'The east gate is broken', heldTitle: 'The courtyard held', heldHint: 'Every wave held in the courtyard. The fight goes indoors.', again: 'Play the courtyard again', plateTitle: 'The courtyard is held',
    caption: '\u201cThe dogs fell back over the breach and the levy broke at the gate stair. But smoke was rising inside the keep.\u201d', next: 'keep' },
  keep: { num: 'Level 3', fallen: 'The study door is broken', heldTitle: 'The study held', heldHint: 'Every wave held in the keep. The levy fall back to their fen.', again: 'Play the keep again', plateTitle: 'The study is held',
    caption: '\u201cThe levy fled down the stairs and out into the rain. But the river was rising, and in the drowned meadows they were gathering again.\u201d', next: 'fen' },
  fen: { num: 'Level 4', fallen: 'The weir house is lost', heldTitle: 'The weir held', heldHint: 'Every wave held at the weir house. The dogs run for the downs.', again: 'Play the fen again', plateTitle: 'The weir is held',
    caption: '\u201cThe levy sank back into their reeds, and the dogs ran howling for the barrows on the downs. The old wizard corked his inkwell and went after them.\u201d', next: 'barrows' },
  barrows: { num: 'Level 5', fallen: 'The Ward Ring is broken', heldTitle: 'The ring held', heldHint: 'Every wave held at the Ward Ring. Dawn comes up over the downs.', again: 'Play the barrows again', plateTitle: 'The ring is held',
    caption: '\u201cDawn came up over the downs, the giants lay down in their barrows, and the hunt-master\u2019s horn was never heard again. And so Goosebridge Castle held, and the old wizard let the ink dry on the final page.\u201d' },
};
const thumbs = new Map<LevelId, HTMLCanvasElement>();

function readRecord(id: LevelId): number | null {
  try { const v = localStorage.getItem(`goosebridge.best.${id}`); return v === null ? null : Number(v); } catch { return null; }
}
function recordWin(id: LevelId, hp: number) {
  try { const best = readRecord(id); if (best === null || hp > best) localStorage.setItem(`goosebridge.best.${id}`, String(hp)); } catch { /* private mode */ }
}

/** The menu can be closed back to a game already under way. */
function menuCanClose() { return s.phase !== 'victory' && s.phase !== 'defeat' && (s.wave > 1 || s.phase === 'combat' || s.traces.length > 0 || s.gold !== BALANCE.startGold); }

/** Which page of the menu is open. */
type MenuView = 'title' | 'levels' | 'rewards' | 'casebook' | 'exit';
let menuView: MenuView = 'title';

function renderMenu() {
  if (!thumbs.size) {
    // draw each level once in its own geometry, then return to the open one
    for (const L of LEVELS) { setLevel(L.id); thumbs.set(L.id, levelThumbnail(360)); }
    setLevel(s.level);
  }
  const here = LEVELS.find((L) => L.id === s.level)!;
  const canResume = menuCanClose();
  let body = '';
  if (menuView === 'title') {
    body = `<header><h1>Defence of Goosebridge Castle</h1><p class="lede">A tower defence drawn in pen and ink. Trace threads of ink from the wizard's inkwell to prepare your towers, then pulse them in battle.</p></header>
      <nav class="menu-buttons" aria-label="Main menu">
        <button data-act="menuStart" class="primary">Start</button>
        <button data-act="closeMenu" ${canResume ? '' : 'disabled'}>Resume${canResume ? `<small>${esc(here.sub)}: ${esc(here.name)}, wave ${s.wave}</small>` : '<small>no game in progress</small>'}</button>
        <button data-act="menuCasebook">Rare creature casebook<small>${recordedCount()} of ${RARE_TYPES.length} recorded</small></button>
        <button data-act="menuRewards">Redeem rewards<small>${seals()} Wizard's Seal${seals() === 1 ? '' : 's'}</small></button>
        <button data-act="menuExit">Exit</button>
      </nav>`;
  } else if (menuView === 'levels') {
    const cards = LEVELS.map((L) => {
      const best = readRecord(L.id);
      const towers = LEVEL_BALANCE[L.id].towerTypes;
      return `<article class="level-card"><div class="thumb" data-thumb="${L.id}"></div><div class="lc-body">
        <p class="kicker">${esc(L.sub)}${best !== null ? ` · <span class="won">held, castle health ${best}</span>` : ''}</p>
        <h2>${esc(L.name)}</h2><p>${esc(L.blurb)}</p>
        <div class="lc-towers">${towers.map((ty) => `<span class="ico" data-tower="${ty}" title="${esc(BALANCE.towers[ty].name)}"></span>`).join('')}</div>
        <button data-act="play" data-level="${L.id}" class="primary">${s.level === L.id && canResume ? 'Start this level again' : `Begin ${esc(L.sub)}`}</button></div></article>`;
    }).join('');
    body = `<header><h1>Choose a level</h1></header><div class="levels">${cards}</div><p class="menu-back"><button data-act="menuBack">Back</button></p>`;
  } else if (menuView === 'rewards') {
    const cards = REWARDS.map((r) => {
      const have = owns(r.id), on = isActive(r.id), afford = seals() >= r.cost;
      const btn = have
        ? `<button data-act="toggleReward" data-id="${r.id}" aria-pressed="${on}" class="${on ? 'gild' : ''}">${on ? 'In use ✓' : 'Switched off'}<small>${on ? 'click to switch off' : 'click to use it again'}</small></button>`
        : `<button data-act="redeem" data-id="${r.id}" class="primary" ${afford ? '' : 'disabled'}>Redeem for ${r.cost} seals${afford ? '' : `<small>you need ${r.cost - seals()} more</small>`}</button>`;
      return `<article class="reward-card ${have ? 'owned' : ''}"><span class="rico" data-reward="${r.id}"></span><div><p class="kicker">${r.kind === 'perk' ? 'Perk' : 'Look'}${have ? ' · yours' : ` · ${r.cost} seals`}</p><h3>${esc(r.name)}</h3><p>${esc(r.text)}</p>${btn}</div></article>`;
    }).join('');
    body = `<header><h1>Redeem rewards</h1>
      <p class="purse"><span class="seal" aria-hidden="true"></span><b>${seals()}</b> Wizard's Seal${seals() === 1 ? '' : 's'} to spend <small>(${sealsEarned()} earned in all)</small></p>
      <p class="lede">Earn seals by holding the line: ${EARN.perWave} for every wave survived, ${EARN.levelWon} for winning a level, ${EARN.firstWin} more the first time you win it, and ${EARN.flawless} more if the castle takes no harm. Perks apply from the next level you start; owned rewards can be switched off and on.</p></header>
      <div class="rewards">${cards}</div>
      <p class="menu-back"><button data-act="menuBack">Back</button></p>`;
  } else if (menuView === 'casebook') {
    const rarity = (t: RareType) => { const w = BALANCE.rares.weights[t]; return w >= 4 ? 'Rare' : w >= 2 ? 'Very rare' : 'Rarest of all'; };
    const entries = RARE_TYPES.map((t) => {
      const e = entry(t), st = BALANCE.enemies[t];
      if (!e || !e.seen) {
        return `<article class="case-card unseen"><span class="cico" data-rare="${t}" data-seen="0"></span><div><p class="kicker">${rarity(t)}</p><h3>Not yet seen</h3><p class="sub">A page left blank for something that has not crossed your roads yet.</p></div></article>`;
      }
      const f = e.first!;
      const when = new Date(f.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      const where = LEVELS.find((L) => L.id === f.level)!;
      return `<article class="case-card"><span class="cico" data-rare="${t}" data-seen="1"></span><div><p class="kicker">${rarity(t)} · ${BALANCE.rares.seals[t]} seal${BALANCE.rares.seals[t] === 1 ? '' : 's'} if caught</p><h3>${esc(st.name)}</h3><p>${esc(st.note)}</p>
        <p class="sub">First seen ${esc(when)} · ${esc(where.sub)}: ${esc(where.name)}, wave ${f.wave}</p>
        <p class="sub">Seen ${e.seen} time${e.seen === 1 ? '' : 's'} · caught ${e.caught}${e.escaped ? ` · slipped away ${e.escaped}` : ''}</p></div></article>`;
    }).join('');
    body = `<header><h1>Rare creature casebook</h1><p class="lede">Now and then, in some games but not most, something rare wanders onto the roads. It never harms the castle; catch it for gold and Wizard's Seals before it slips away. Every sighting is written down here.</p>
      <p class="purse"><b>${recordedCount()}</b> of ${RARE_TYPES.length} recorded</p></header>
      <div class="casebook">${entries}</div>
      <p class="menu-back"><button data-act="menuBack">Back</button></p>`;
  } else {
    body = `<header><h1>The book is closed</h1><p class="lede">The wizard sets down his quill. You can close this tab now${canResume ? '; your game will wait on its page until you do' : ''}.</p></header>
      <p class="menu-back"><button data-act="menuBack" class="primary">Open the book again</button></p>`;
  }
  menuEl.innerHTML = `<div class="menu-panel menu-${menuView}">${body}</div>`;
  menuEl.querySelectorAll<HTMLElement>('[data-thumb]').forEach((el) => {
    const src = thumbs.get(el.dataset.thumb as LevelId)!;
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    c.getContext('2d')!.drawImage(src, 0, 0); el.replaceChildren(c);
  });
  hydrateIcons(menuEl);
  menuEl.querySelectorAll<HTMLElement>('[data-reward]').forEach((el) => el.replaceChildren(rewardIcon(el.dataset.reward as RewardId, 64)));
  menuEl.querySelectorAll<HTMLElement>('[data-rare]').forEach((el) => {
    const c = enemyIconCanvas(el.dataset.rare as EnemyType, 84);
    if (el.dataset.seen === '0') {
      // unseen: only an ink silhouette and a question mark
      const g = c.getContext('2d')!;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(58,34,18,0.96)'; g.fillRect(0, 0, c.width, c.height); g.restore();
    }
    el.replaceChildren(c);
  });
  if (menuView !== 'rewards') (menuEl.querySelector('button.primary:not([disabled])') as HTMLButtonElement | null)?.focus({ preventScroll: true });
}
function openMenu() {
  menuOpen = true; menuEl.hidden = false; document.body.dataset.menu = '1';
  menuView = 'title';
  closePopover(); cancelGesture();
  renderMenu();
}
function closeMenu() { menuOpen = false; menuEl.hidden = true; delete document.body.dataset.menu; lastSig = ''; }
function startLevel(id: LevelId) {
  currentLevel = id;
  closeMenu();
  restart();
  iconCache.clear();
  ribbonSig = ''; overlaySig = '';
  toast(s, ({ fields: 'Level 1: Gate Defence. Hold the roads to the castle gate.', courtyard: 'Level 2: the Castle Courtyard. New towers to raise.', keep: 'Level 3: the Keep. Hold the stairs to the wizard\u2019s study.', fen: 'Level 4: the Flooded Fen. Hold the causeways to the weir house.', barrows: 'Level 5: the Barrows. Hold the Ward Ring until dawn.' } as Record<LevelId, string>)[id], 'info');
}
menuEl.addEventListener('click', handleAction);
$('btnMenu').addEventListener('click', openMenu);

// ── Main loop ───────────────────────────────────────────────────────────────
let last = performance.now();
let ribbonSig = '';
/** The bookmark folds up during battle (so it never hides the field) and on demand. */
let ribbonFolded = false;
let ribbonPhase = '';
let overlaySig = '';

/** Redeemed looks show at once; perks wait for the next game. */
function applyLooks() { view.owl = isActive('owl'); view.crimson = isActive('crimson'); }
applyLooks();

/** A short line under the menu's buttons after redeeming. */
function flashMenu(text: string) {
  const p = document.createElement('p'); p.className = 'menu-flash'; p.setAttribute('role', 'status'); p.textContent = text;
  menuEl.querySelector('.menu-panel')?.appendChild(p);
}

/** Pay seals for waves held and for the win, once each per game. */
function payOut() {
  const held = s.phase === 'victory' ? TOTAL_WAVES : s.wave - 1;
  if (held > paidWaves && s.phase !== 'defeat') {
    const n = (held - paidWaves) * EARN.perWave;
    paidWaves = held;
    award(n);
    if (s.phase !== 'victory') toast(s, `+${n} Wizard's Seal${n === 1 ? '' : 's'} for holding the wave.`, 'gold');
  }
  if (s.phase === 'victory' && !paidWin) {
    paidWin = true;
    const n = awardWin(s.level, s.castleHp === s.castleMax) + EARN.perWave;
    toast(s, `+${n} Wizard's Seals for holding the level. Spend them in the menu under Redeem rewards.`, 'gold');
  }
}

/** Write rare sightings into the casebook, pay for catches, and say what happened. */
function noteRares() {
  while (s.rareLog.length) {
    const ev = s.rareLog.shift()!;
    const name = BALANCE.enemies[ev.type].name;
    const first = !entry(ev.type)?.seen;
    record(ev.type, ev.event, s.level, ev.wave);
    if (ev.event === 'seen') {
      const lane = LANES[s.rare?.lane ?? 'mill'].name;
      toast(s, `A rare sight: a ${name} on the ${lane}!${first ? ' A new page in your casebook.' : ''}`, 'gold');
    } else if (ev.event === 'caught') {
      const n = BALANCE.rares.seals[ev.type];
      award(n);
      toast(s, `Caught the ${name}: +${BALANCE.enemies[ev.type].bounty} gold, +${n} Wizard's Seal${n === 1 ? '' : 's'}.`, 'gold');
    } else toast(s, `The ${name} slipped away.`, 'info');
  }
}

function refresh(now: number) {
  view.coachTrace = onboarding() && s.phase === 'prep';
  if (view.pulsePreview && !previewable(towerById(s, view.pulsePreview))) previewFrom(null, null);
  noteRares();
  payOut();
  const sig = signature();
  if (sig !== lastSig) {
    lastSig = sig;
    renderMargin();
    if (popoverFor) fillPopover();
  }
  if (ribbonPhase !== s.phase) { ribbonPhase = s.phase; ribbonFolded = s.phase === 'combat'; }
  const rs = `${s.wave}|${s.phase}|${ribbonFolded}`;
  if (rs !== ribbonSig) { ribbonSig = rs; renderRibbon(); }
  const os = `${s.phase}|${s.paused}`;
  if (os !== overlaySig) { overlaySig = os; renderOverlay(); }
  renderHud();
  renderToasts();
  renderInspect();
  const k = canvas.width / MAP_W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (s.phase === 'victory') renderVictory(ctx, s, now / 1000);
  else render(ctx, s, view, now / 1000);
}

function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!s.paused && !menuOpen) for (let i = 0; i < s.speed; i++) step(s, dt);
  refresh(now);
  requestAnimationFrame(frame);
}
resize();
refresh(performance.now());
openMenu();
requestAnimationFrame(frame);

// Debug / automated-check hooks (harmless in play): inspect state, advance the clock.
Object.assign(window, {
  __ward: () => s,
  __advance: (seconds: number) => {
    for (let t = 0; t < seconds && !s.paused; t += 1 / 30) step(s, 1 / 30);
    refresh(performance.now());
    return { phase: s.phase, wave: s.wave, hp: s.castleHp, enemies: s.enemies.length, pulses: s.pulsesLeft };
  },
  __refresh: () => refresh(performance.now()),
  __level: (id: LevelId) => startLevel(id),
  __seals: (n: number) => { award(n); if (menuOpen) renderMenu(); return seals(); },
  __resetRewards: () => { resetRewards(); resetCasebook(); applyLooks(); if (menuOpen) renderMenu(); },
  /** Debug: make the current game's rare creature appear in the next wave. */
  __rare: (type: RareType) => { s.rare = { type, wave: s.phase === 'prep' ? s.wave : s.wave + 1, lane: 'mill', at: 3 }; return s.rare; },
});

