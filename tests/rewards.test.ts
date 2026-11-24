import { describe, it, expect, beforeEach } from 'vitest';
import { newGame } from '../src/game';
import { BALANCE } from '../src/balance';
import { award, awardWin, redeem, toggle, isActive, owns, seals, activePerks, resetRewards, EARN, REWARDS } from '../src/rewards';

describe('rewards', () => {
  beforeEach(() => resetRewards());

  it('a new game without perks is unchanged', () => {
    const s = newGame('fields');
    expect(s.castleHp).toBe(BALANCE.castleHp);
    expect(s.castleMax).toBe(BALANCE.castleHp);
    expect(s.gold).toBe(BALANCE.startGold);
    expect(s.leaves).toBe(BALANCE.startLeaves);
  });

  it('seals are earned for wins, with a first-time and a flawless bonus', () => {
    expect(awardWin('fields', true)).toBe(EARN.levelWon + EARN.firstWin + EARN.flawless);
    expect(awardWin('fields', false)).toBe(EARN.levelWon);
    award(2);
    expect(seals()).toBe(EARN.levelWon * 2 + EARN.firstWin + EARN.flawless + 2);
  });

  it('redeeming costs seals once, and perks change the next game', () => {
    const walls = REWARDS.find((r) => r.id === 'stoutWalls')!;
    expect(redeem('stoutWalls').ok).toBe(false); // too poor
    award(walls.cost + 8);
    expect(redeem('stoutWalls').ok).toBe(true);
    expect(redeem('stoutWalls').ok).toBe(false); // already owned
    expect(redeem('deepInkwell').ok).toBe(true);
    expect(seals()).toBe(0);
    const s = newGame('courtyard', activePerks());
    expect(s.castleMax).toBe(BALANCE.castleHp + 5);
    expect(s.castleHp).toBe(s.castleMax);
    expect(s.gold).toBe(BALANCE.startGold + 30);
    // switched off, the perk no longer applies; it stays owned
    toggle('stoutWalls');
    expect(owns('stoutWalls')).toBe(true);
    expect(isActive('stoutWalls')).toBe(false);
    expect(newGame('courtyard', activePerks()).castleMax).toBe(BALANCE.castleHp);
  });
});
