// The rare creature casebook: when each rare creature was first seen, and how often seen and caught.
// Kept in this browser (localStorage) alongside the rewards.
import type { LevelId, RareType } from './balance';

export interface CaseEntry {
  seen: number;
  caught: number;
  escaped: number;
  /** When, where and in which wave it was first seen (ISO date). */
  first?: { date: string; level: LevelId; wave: number };
  lastSeen?: string;
}

const KEY = 'goosebridge.casebook';
type Book = Partial<Record<RareType, CaseEntry>>;

function load(): Book {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as Book; } catch { /* private mode: start empty */ }
  return {};
}
let book = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(book)); } catch { /* keep in memory */ } }

export const entry = (t: RareType): CaseEntry | undefined => book[t];
export const recordedCount = () => Object.values(book).filter((e) => e && e.seen > 0).length;

export function record(t: RareType, event: 'seen' | 'caught' | 'escaped', level: LevelId, wave: number, now = new Date()) {
  const e = book[t] ?? { seen: 0, caught: 0, escaped: 0 };
  if (event === 'seen') {
    e.seen += 1;
    e.lastSeen = now.toISOString();
    if (!e.first) e.first = { date: now.toISOString(), level, wave };
  } else if (event === 'caught') e.caught += 1;
  else e.escaped += 1;
  book[t] = e;
  save();
}

/** For tests and the debug hook. */
export function resetCasebook() { book = {}; save(); }
