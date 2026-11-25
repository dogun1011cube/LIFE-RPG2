import type { Ctx } from './core';
import { GameError, fullHeal, gainGold, gainStamina, sfx, toast } from './core';
import { claimAllDaily } from './quests';
import { todayRecords, todaySeconds, todaySubjects } from './study';
import type { DaySummary, GameState } from './types';

/**
 * RPG DAY SYSTEM
 * ──────────────
 * The day never changes because of the real-world clock. It only changes
 * when the player explicitly goes to sleep (END DAY) and then wakes up.
 *   active ──[END DAY / 잠들기]──▶ sleeping ──[WAKE UP / 일어나기]──▶ active (day+1)
 *                    ◀──[아직 안 잤어요(취소)]──
 */

export function goalSeconds(s: GameState) {
  return Math.max(1, s.settings.dailyGoalMinutes) * 60;
}

export function daySummaryNow(s: GameState, now = Date.now()): DaySummary {
  const studySeconds = todaySeconds(s);
  return {
    number: s.day.number,
    startedAt: s.day.startedAt,
    endedAt: s.day.sleptAt ?? now,
    studySeconds,
    subjects: todaySubjects(s),
    records: todayRecords(s).length,
    exp: s.day.expEarned,
    gold: s.day.goldEarned,
    monsters: s.day.monstersDefeated,
    floors: s.day.floorsCleared,
    goalMet: studySeconds >= goalSeconds(s),
    goalMinutes: s.settings.dailyGoalMinutes,
  };
}

export function goToSleep(s: GameState, ctx: Ctx) {
  if (s.day.status === 'sleeping') throw new GameError('이미 잠든 상태입니다.');
  s.day.status = 'sleeping';
  s.day.sleptAt = ctx.now;
  if (s.timer?.startedAt) {
    s.timer.accumulated += ctx.now - s.timer.startedAt;
    s.timer.startedAt = null;
  }
  sfx(ctx, 'sleep');
}

export function cancelSleep(s: GameState, ctx: Ctx) {
  if (s.day.status !== 'sleeping') return;
  s.day.status = 'active';
  s.day.sleptAt = null;
  toast(ctx, 'info', `DAY ${s.day.number} 계속`, '아직 오늘이 끝나지 않았어요.');
}

/** Wakes up → finalises the previous RPG day and starts the next one. */
export function wakeUp(s: GameState, ctx: Ctx) {
  if (s.day.status !== 'sleeping') {
    // starting a new day directly also counts as having slept
    s.day.sleptAt = ctx.now;
  }
  // 1) rewards of the finished day are never lost: auto-claim completed daily quests
  claimAllDaily(s, ctx, true);

  // 2) archive the finished day (records themselves are kept forever in s.study)
  const summary = daySummaryNow(s, ctx.now);
  summary.endedAt = s.day.sleptAt ?? ctx.now;
  s.dayHistory.push(summary);

  // 3) streak — based on completed RPG days, never on midnight
  if (summary.goalMet) {
    s.streak.current += 1;
    s.streak.longest = Math.max(s.streak.longest, s.streak.current);
    s.stats.daysCompleted += 1;
  } else {
    s.streak.current = 0;
  }

  // 4) start the new day
  const prev = s.day.number;
  s.day = {
    number: prev + 1,
    status: 'active',
    startedAt: ctx.now,
    sleptAt: null,
    expEarned: 0,
    goldEarned: 0,
    goldSpent: 0,
    monstersDefeated: 0,
    floorsCleared: 0,
    battlesWon: 0,
    gachaPulls: 0,
  };
  s.quests.dailyClaimed = [];
  s.quests.notified = s.quests.notified.filter((k) => !k.startsWith('d:'));
  delete s.tower.flags['f7_slot_day'];
  fullHeal(s);

  // 5) morning reward
  if (summary.goalMet) {
    const g = gainGold(s, 30 + 10 * Math.min(10, s.streak.current));
    const st = gainStamina(s, 3, false);
    toast(ctx, 'gold', 'DAILY REWARD', `목표 달성 보상: +${g} G · 기력 +${st} · 연속 ${s.streak.current}일`);
  } else {
    toast(ctx, 'info', `DAY ${s.day.number}`, '좋은 아침! 오늘도 한 층 더 올라가 봐요.');
  }
  sfx(ctx, 'wake');
  return summary;
}

export function dayElapsedHours(s: GameState, now = Date.now()) {
  return (now - s.day.startedAt) / 3600000;
}
