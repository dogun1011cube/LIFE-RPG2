import { canonicalSubject, guessStat, pickCustomColor, STUDY_SECONDS_PER_TRAINING_POINT, STAT_LABEL } from '../data/subjects';
import type { Ctx } from './core';
import { GameError, gainExp, gainGold, gainStamina, healPct, sfx } from './core';
import { deriveStats, subjectTotals } from './progression';
import { uid } from './rng';
import type { GameState, StatKey, StudyRecord } from './types';

export const MAX_RECORD_SECONDS = 24 * 3600;
export const GOLD_PER_MINUTE = 0.5;
export const SECONDS_PER_STAMINA = 600; // 10 minutes of study = 1 stamina
export const HEAL_PCT_PER_MINUTE = 1;

export interface StudyRewardPreview {
  minutes: number;
  exp: number;
  gold: number;
  stamina: number;
  expBonusPct: number;
  goldBonusPct: number;
  healPct: number;
}

/** Pure reward calculation used both for the preview and the actual record. */
export function previewStudyReward(s: GameState, seconds: number): StudyRewardPreview {
  const d = deriveStats(s);
  const minutes = Math.max(0, seconds) / 60;
  const expBonusPct = d.expBonus + s.player.studyBuff.expPct;
  const goldBonusPct = d.goldBonus + s.player.studyBuff.goldPct;
  const exp = Math.floor(minutes * (1 + expBonusPct / 100));
  const gold = Math.floor(minutes * GOLD_PER_MINUTE * (1 + goldBonusPct / 100));
  const before = todaySeconds(s);
  const stamina = Math.floor((before + seconds) / SECONDS_PER_STAMINA) - Math.floor(before / SECONDS_PER_STAMINA);
  return { minutes, exp, gold, stamina, expBonusPct, goldBonusPct, healPct: Math.min(100, Math.floor(minutes * HEAL_PCT_PER_MINUTE)) };
}

export function ensureSubject(s: GameState, raw: string): string {
  const name = canonicalSubject(raw, s.subjects);
  if (!name) throw new GameError('과목을 입력하세요.');
  if (name.length > 24) throw new GameError('과목 이름이 너무 깁니다. (24자 이하)');
  const ex = s.subjects.find((x) => x.name === name);
  if (ex) {
    if (ex.hidden) ex.hidden = false;
    return name;
  }
  const customCount = s.subjects.filter((x) => x.custom).length;
  s.subjects.push({ name, en: name, stat: guessStat(name), color: pickCustomColor(customCount), custom: true });
  return name;
}

export function addCustomSubject(s: GameState, raw: string, stat?: StatKey) {
  const before = s.subjects.length;
  const name = ensureSubject(s, raw);
  const sub = s.subjects.find((x) => x.name === name)!;
  if (stat && sub.custom) sub.stat = stat;
  return { name, created: s.subjects.length > before };
}

export function recordStudy(s: GameState, ctx: Ctx, subjectRaw: string, seconds: number): StudyRecord {
  if (s.day.status === 'sleeping') throw new GameError('지금은 잠든 상태예요. 먼저 [일어나기]로 새 하루를 시작하세요.');
  seconds = Math.floor(seconds);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new GameError('공부 시간을 입력하세요.');
  if (seconds < 60) throw new GameError('1분 이상부터 기록할 수 있어요.');
  if (seconds > MAX_RECORD_SECONDS) throw new GameError('한 번에 최대 24시간까지 기록할 수 있어요.');
  const subject = ensureSubject(s, subjectRaw);

  const totalsBefore = subjectTotals(s)[subject] || 0;
  const p = previewStudyReward(s, seconds);

  const exp = gainExp(s, p.exp, 'study');
  const gold = gainGold(s, p.gold, false);
  const stamina = gainStamina(s, p.stamina, true);
  const hpRestored = healPct(s, p.healPct);

  const record: StudyRecord = {
    id: uid('r'),
    subject,
    seconds,
    day: s.day.number,
    at: ctx.now,
    exp,
    gold,
    stamina,
    bonusPct: p.expBonusPct,
  };
  s.study.push(record);
  // consume one-shot scroll buffs
  s.player.studyBuff = { expPct: 0, goldPct: 0 };

  const trainingNotes: string[] = [];
  const stat = s.subjects.find((x) => x.name === subject)?.stat ?? 'int';
  const gained = Math.floor((totalsBefore + seconds) / STUDY_SECONDS_PER_TRAINING_POINT) - Math.floor(totalsBefore / STUDY_SECONDS_PER_TRAINING_POINT);
  if (gained > 0) trainingNotes.push(`${STAT_LABEL[stat].en} +${gained} (${subject} 훈련)`);

  ctx.events.push({ type: 'studyReward', record, hpRestored, staminaGained: stamina, trainingNotes });
  sfx(ctx, 'study');
  return record;
}

/** Deletes a record from the CURRENT day and rolls back its rewards. */
export function deleteStudyRecord(s: GameState, id: string) {
  const idx = s.study.findIndex((r) => r.id === id);
  if (idx < 0) throw new GameError('기록을 찾을 수 없습니다.');
  const r = s.study[idx];
  if (r.day !== s.day.number) throw new GameError('지난 날의 기록은 수정할 수 없어요.');
  s.player.totalExp = Math.max(0, s.player.totalExp - r.exp);
  s.stats.expFromStudy = Math.max(0, s.stats.expFromStudy - r.exp);
  s.day.expEarned = Math.max(0, s.day.expEarned - r.exp);
  s.player.gold = Math.max(0, s.player.gold - r.gold);
  s.stats.goldEarned = Math.max(0, s.stats.goldEarned - r.gold);
  s.day.goldEarned = Math.max(0, s.day.goldEarned - r.gold);
  s.player.stamina = Math.max(0, s.player.stamina - r.stamina);
  s.study.splice(idx, 1);
  return r;
}

// ── Study timer (persisted, survives refresh) ───────────────
export function timerElapsedMs(s: GameState, now = Date.now()) {
  const t = s.timer;
  if (!t) return 0;
  return t.accumulated + (t.startedAt ? Math.max(0, now - t.startedAt) : 0);
}

export function startTimer(s: GameState, subject: string, now: number) {
  if (s.timer) {
    if (!s.timer.startedAt) s.timer.startedAt = now;
    s.timer.subject = subject || s.timer.subject;
    return;
  }
  s.timer = { subject, startedAt: now, accumulated: 0 };
}

export function pauseTimer(s: GameState, now: number) {
  if (!s.timer || !s.timer.startedAt) return;
  s.timer.accumulated += Math.max(0, now - s.timer.startedAt);
  s.timer.startedAt = null;
}

export function clearTimer(s: GameState) {
  s.timer = null;
}

// ── Selectors ────────────────────────────────────────────────
export function recordsForDay(s: GameState, day: number) {
  return s.study.filter((r) => r.day === day);
}

export function todayRecords(s: GameState) {
  return recordsForDay(s, s.day.number);
}

export function todaySeconds(s: GameState) {
  let t = 0;
  for (const r of s.study) if (r.day === s.day.number) t += r.seconds;
  return t;
}

export function todaySubjects(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of s.study) if (r.day === s.day.number) out[r.subject] = (out[r.subject] || 0) + r.seconds;
  return out;
}

export function totalSeconds(s: GameState) {
  let t = 0;
  for (const r of s.study) t += r.seconds;
  return t;
}

export function fmtDuration(sec: number, withSeconds = false) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}시간`);
  if (m || (!h && !withSeconds)) parts.push(`${m}분`);
  if (withSeconds && (ss || (!h && !m))) parts.push(`${ss}초`);
  return parts.join(' ');
}

export function fmtClock(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
