import { getItem } from '../data/items';
import type { QuestDef, QuestMetric, QuestReward } from '../data/quests';
import { QUESTS } from '../data/quests';
import type { Ctx } from './core';
import { addItem, GameError, gainExp, gainGold, gainStamina, sfx, toast } from './core';
import { levelFromExp, bossCount } from './progression';
import { todayRecords, todaySeconds, todaySubjects, totalSeconds } from './study';
import type { GameState } from './types';

export function metricValue(s: GameState, m: QuestMetric): number {
  switch (m) {
    case 'dayStudyMin':
      return Math.floor(todaySeconds(s) / 60);
    case 'daySubjects':
      return Object.keys(todaySubjects(s)).length;
    case 'dayRecords':
      return todayRecords(s).length;
    case 'dayMonsters':
      return s.day.monstersDefeated;
    case 'dayFloors':
      return s.day.floorsCleared;
    case 'dayBattles':
      return s.day.battlesWon;
    case 'totalStudyHours':
      return Math.floor((totalSeconds(s) / 3600) * 10) / 10;
    case 'level':
      return levelFromExp(s.player.totalExp);
    case 'monstersTotal':
      return s.stats.monstersDefeated;
    case 'highestFloor':
      return s.tower.highestCleared;
    case 'streak':
      return Math.max(s.streak.current, s.streak.longest);
    case 'gachaTotal':
      return s.gacha.pulls;
    case 'bossesTotal':
      return bossCount(s);
    case 'upgrades':
      return s.stats.upgradesSucceeded;
    case 'daysCompleted':
      return s.stats.daysCompleted;
    case 'subjectsStudied':
      return new Set(s.study.map((r) => r.subject)).size;
    case 'chests':
      return s.stats.chestsOpened;
  }
}

export interface QuestStatus {
  def: QuestDef;
  value: number;
  done: boolean;
  claimed: boolean;
}

export function questStatus(s: GameState, def: QuestDef): QuestStatus {
  const value = metricValue(s, def.metric);
  const claimed = def.kind === 'daily' ? s.quests.dailyClaimed.includes(def.id) : s.quests.achievementsClaimed.includes(def.id);
  return { def, value, done: value >= def.target, claimed };
}

export function allQuestStatus(s: GameState) {
  return QUESTS.map((q) => questStatus(s, q));
}

export function claimableCount(s: GameState) {
  return allQuestStatus(s).filter((q) => q.done && !q.claimed).length;
}

export function rewardText(r: QuestReward) {
  const parts: string[] = [];
  if (r.exp) parts.push(`EXP ${r.exp}`);
  if (r.gold) parts.push(`${r.gold} G`);
  if (r.stamina) parts.push(`기력 ${r.stamina}`);
  for (const [id, q] of r.items || []) parts.push(`${getItem(id).name}${q > 1 ? ' ×' + q : ''}`);
  return parts.join(' · ');
}

function grant(s: GameState, ctx: Ctx, r: QuestReward) {
  if (r.exp) gainExp(s, r.exp, 'quest');
  if (r.gold) gainGold(s, r.gold);
  if (r.stamina) gainStamina(s, r.stamina, false);
  for (const [id, q] of r.items || []) addItem(s, id, q, ctx, false);
}

export function claimQuest(s: GameState, ctx: Ctx, id: string, silent = false) {
  const def = QUESTS.find((q) => q.id === id);
  if (!def) throw new GameError('알 수 없는 퀘스트');
  const st = questStatus(s, def);
  if (st.claimed) throw new GameError('이미 보상을 받았습니다.');
  if (!st.done) throw new GameError('아직 완료되지 않았습니다.');
  if (def.kind === 'daily') s.quests.dailyClaimed.push(id);
  else s.quests.achievementsClaimed.push(id);
  grant(s, ctx, def.reward);
  if (!silent) {
    toast(ctx, 'quest', 'REWARD CLAIMED', `${def.title} — ${rewardText(def.reward)}`);
    sfx(ctx, 'coin');
  }
}

export function claimAllDaily(s: GameState, ctx: Ctx, auto = false) {
  let n = 0;
  for (const q of allQuestStatus(s)) {
    if (q.def.kind === 'daily' && q.done && !q.claimed) {
      claimQuest(s, ctx, q.def.id, true);
      n++;
    }
  }
  if (n && auto) toast(ctx, 'quest', '일일 퀘스트 자동 수령', `받지 않은 보상 ${n}개를 챙겨뒀어요.`);
  return n;
}

export function claimAll(s: GameState, ctx: Ctx) {
  let n = 0;
  for (const q of allQuestStatus(s)) {
    if (q.done && !q.claimed) {
      claimQuest(s, ctx, q.def.id, true);
      n++;
    }
  }
  if (n) {
    toast(ctx, 'quest', 'REWARDS CLAIMED', `${n}개의 퀘스트 보상을 받았습니다.`);
    sfx(ctx, 'coin');
  }
  return n;
}

/** Emits QUEST COMPLETE once per newly completed quest. */
export function detectQuestCompletion(s: GameState, ctx: Ctx) {
  for (const q of allQuestStatus(s)) {
    if (!q.done || q.claimed) continue;
    const key = (q.def.kind === 'daily' ? 'd:' : 'a:') + q.def.id;
    if (s.quests.notified.includes(key)) continue;
    s.quests.notified.push(key);
    toast(ctx, 'quest', 'QUEST COMPLETE', `${q.def.title} — 퀘스트 메뉴에서 보상을 받으세요`);
    sfx(ctx, 'quest');
  }
}
