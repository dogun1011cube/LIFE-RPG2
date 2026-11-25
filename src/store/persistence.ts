import { canonicalSubject, guessStat, pickCustomColor } from '../data/subjects';
import { createNewGame, normalizeState } from '../game/state';
import type { DaySummary, GameState, StudyRecord } from '../game/types';

// ─────────────────────────────────────────────────────────────
// Save slots (localStorage)
//   lifeRPG3.save       — main save (written on every change, debounced)
//   lifeRPG3.backup     — previous save, rotated at most every 10 min
//   lifeRPG3.snapshots  — last 3 "start of day" snapshots
// The previous version's key (lifeRpg2_state_v1) is only READ, never
// modified or deleted.
// ─────────────────────────────────────────────────────────────
export const KEY_SAVE = 'lifeRPG3.save';
export const KEY_BACKUP = 'lifeRPG3.backup';
export const KEY_SNAPSHOTS = 'lifeRPG3.snapshots';
export const KEY_LEGACY_DONE = 'lifeRPG3.legacyMigrated';
export const LEGACY_KEY = 'lifeRpg2_state_v1';

const BACKUP_INTERVAL = 10 * 60 * 1000;
let lastBackupAt = 0;

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readJSON(key: string): unknown {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isValidSave(v: unknown): v is GameState {
  return !!v && typeof v === 'object' && 'player' in (v as object) && 'study' in (v as object) && 'day' in (v as object);
}

export interface LoadResult {
  state: GameState | null;
  source: 'save' | 'backup' | null;
  note?: string;
}

export function loadSave(): LoadResult {
  const main = readJSON(KEY_SAVE);
  if (isValidSave(main)) return { state: normalizeState(main), source: 'save' };
  const backup = readJSON(KEY_BACKUP);
  if (isValidSave(backup)) return { state: normalizeState(backup), source: 'backup', note: '메인 세이브를 읽지 못해 백업에서 복구했습니다.' };
  return { state: null, source: null };
}

export function writeSave(state: GameState, force = false): boolean {
  const ls = storage();
  if (!ls) return false;
  const now = Date.now();
  const data = JSON.stringify({ ...state, savedAt: now });
  try {
    if (force || now - lastBackupAt > BACKUP_INTERVAL) {
      const prev = ls.getItem(KEY_SAVE);
      if (prev) ls.setItem(KEY_BACKUP, prev);
      lastBackupAt = now;
    }
    ls.setItem(KEY_SAVE, data);
    return true;
  } catch {
    // quota exceeded → drop snapshots first, then retry once
    try {
      ls.removeItem(KEY_SNAPSHOTS);
      ls.setItem(KEY_SAVE, data);
      return true;
    } catch {
      return false;
    }
  }
}

export interface Snapshot {
  day: number;
  at: number;
  label: string;
  data: GameState;
}

export function getSnapshots(): Snapshot[] {
  const v = readJSON(KEY_SNAPSHOTS);
  return Array.isArray(v) ? (v as Snapshot[]).filter((x) => x && isValidSave(x.data)) : [];
}

export function addSnapshot(state: GameState, label: string) {
  const ls = storage();
  if (!ls) return;
  try {
    const list = getSnapshots();
    list.unshift({ day: state.day.number, at: Date.now(), label, data: state });
    ls.setItem(KEY_SNAPSHOTS, JSON.stringify(list.slice(0, 3)));
  } catch {
    /* ignore — snapshots are a convenience */
  }
}

export function getBackup(): GameState | null {
  const b = readJSON(KEY_BACKUP);
  return isValidSave(b) ? normalizeState(b) : null;
}

/** Removes the v3 save (used by RESET after explicit confirmation). Legacy data is untouched. */
export function deleteSave() {
  const ls = storage();
  if (!ls) return;
  const cur = ls.getItem(KEY_SAVE);
  if (cur) ls.setItem(KEY_BACKUP, cur); // keep one last backup, just in case
  ls.removeItem(KEY_SAVE);
}

export function exportSave(state: GameState): string {
  return JSON.stringify({ format: 'LIFE-RPG-SAVE', exportedAt: new Date().toISOString(), state }, null, 1);
}

export function importSave(text: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON 형식이 아닙니다.');
  }
  const obj = parsed as Record<string, unknown>;
  if (obj && obj.format === 'LIFE-RPG-SAVE' && isValidSave(obj.state)) return normalizeState(obj.state);
  if (isValidSave(obj)) return normalizeState(obj);
  if (obj && typeof obj === 'object' && 'sessions' in obj && 'xp' in obj) return migrateLegacy(obj);
  throw new Error('LIFE RPG 세이브 파일이 아닙니다.');
}

// ─────────────────────────────────────────────────────────────
// Legacy (v2.x) migration
// ─────────────────────────────────────────────────────────────
export function readLegacy(): Record<string, unknown> | null {
  const v = readJSON(LEGACY_KEY);
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const hasData = Number(o.totalSeconds) > 0 || (Array.isArray(o.sessions) && o.sessions.length > 0) || Number(o.xp) > 0;
  return hasData ? o : null;
}

export function legacyAvailable(): boolean {
  const ls = storage();
  if (!ls) return false;
  return !!readLegacy();
}

export function legacyAlreadyImported(): boolean {
  return storage()?.getItem(KEY_LEGACY_DONE) === '1';
}

export function markLegacyImported() {
  try {
    storage()?.setItem(KEY_LEGACY_DONE, '1');
  } catch {
    /* ignore */
  }
}

function parseStamp(t: unknown, fallback: number): number {
  if (typeof t !== 'string') return fallback;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return fallback;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  return Number.isFinite(d.getTime()) ? d.getTime() : fallback;
}

export function migrateLegacy(old: Record<string, unknown>, now = Date.now()): GameState {
  const name = typeof old.profile === 'string' && old.profile !== 'default' ? old.profile : '모험가';
  const s = createNewGame(name, now);
  const dayNum = Math.max(1, Math.floor(Number(old.day) || 1));
  s.day.number = dayNum;
  s.day.startedAt = now;

  // subjects
  const addSubject = (raw: string) => {
    const canon = canonicalSubject(raw, s.subjects);
    if (!canon) return '';
    if (!s.subjects.some((x) => x.name === canon)) {
      const customs = s.subjects.filter((x) => x.custom).length;
      s.subjects.push({ name: canon, en: canon, stat: guessStat(canon), color: pickCustomColor(customs), custom: true });
    }
    return canon;
  };
  if (Array.isArray(old.subjectsList)) for (const n of old.subjectsList) if (typeof n === 'string') addSubject(n);

  // study records
  const records: StudyRecord[] = [];
  const sessions = Array.isArray(old.sessions) ? (old.sessions as Record<string, unknown>[]) : [];
  for (const ss of sessions) {
    if (!ss || ss.kind !== 'study') continue;
    const seconds = Math.floor(Number(ss.seconds) || 0);
    if (seconds <= 0) continue;
    const subject = addSubject(String(ss.subject || '미분류')) || '미분류';
    const minutes = seconds / 60;
    records.push({
      id: 'L' + String(ss.id || Math.random().toString(36).slice(2)),
      subject,
      seconds,
      day: Math.min(dayNum, Math.max(0, Math.floor(Number(ss.day) || 0))),
      at: parseStamp(ss.time, now),
      exp: Math.floor(minutes),
      gold: Math.floor(minutes * 0.5),
      stamina: 0,
      bonusPct: 0,
      legacy: true,
    });
  }
  // subject totals that are not covered by individual sessions → carry-over records (day 0)
  const covered: Record<string, number> = {};
  for (const r of records) covered[r.subject] = (covered[r.subject] || 0) + r.seconds;
  const subjSec = (old.subjectsSeconds && typeof old.subjectsSeconds === 'object' ? old.subjectsSeconds : {}) as Record<string, unknown>;
  const merged: Record<string, number> = {};
  for (const [k, v] of Object.entries(subjSec)) {
    const canon = addSubject(k);
    if (canon) merged[canon] = (merged[canon] || 0) + Math.floor(Number(v) || 0);
  }
  for (const [subject, total] of Object.entries(merged)) {
    const diff = total - (covered[subject] || 0);
    if (diff >= 60) {
      records.push({ id: 'Lc' + subject, subject, seconds: diff, day: 0, at: now, exp: Math.floor(diff / 60), gold: Math.floor(diff / 120), stamina: 0, bonusPct: 0, legacy: true });
    }
  }
  records.sort((a, b) => a.at - b.at);
  s.study = records;

  const totalSec = records.reduce((a, r) => a + r.seconds, 0);
  const totalMin = Math.floor(totalSec / 60);
  const oldXp = Math.max(0, Math.floor(Number(old.xp) || 0));
  s.player.totalExp = Math.max(oldXp, records.reduce((a, r) => a + r.exp, 0));
  s.stats.expFromStudy = s.player.totalExp;
  const oldGold = Math.max(0, Math.floor(Number(old.gold) || 0));
  // old economy: 10 min = 1 G. New: 1 min = 0.5 G → convert retroactively
  s.player.gold = oldGold + Math.floor(totalMin * 0.4) + 100;
  s.stats.goldEarned = s.player.gold;
  const oldFloor = Math.max(0, Math.floor(Number(old.floor) || 0));
  // old "floors" were 1 per 10 study-minutes == new stamina rate
  s.player.stamina = Math.min(300, Math.max(6, oldFloor));

  // past days → history
  const byDay = new Map<number, StudyRecord[]>();
  for (const r of records) {
    if (r.day >= dayNum || r.day <= 0) continue;
    if (!byDay.has(r.day)) byDay.set(r.day, []);
    byDay.get(r.day)!.push(r);
  }
  const history: DaySummary[] = [];
  for (const [d, rs] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    const subjects: Record<string, number> = {};
    for (const r of rs) subjects[r.subject] = (subjects[r.subject] || 0) + r.seconds;
    const sec = rs.reduce((a, r) => a + r.seconds, 0);
    history.push({
      number: d,
      startedAt: rs[0].at,
      endedAt: rs[rs.length - 1].at,
      studySeconds: sec,
      subjects,
      records: rs.length,
      exp: rs.reduce((a, r) => a + r.exp, 0),
      gold: rs.reduce((a, r) => a + r.gold, 0),
      monsters: 0,
      floors: 0,
      goalMet: sec >= 3600,
      goalMinutes: 60,
    });
  }
  s.dayHistory = history;
  s.legacy = { importedFrom: LEGACY_KEY, floor: oldFloor, importedAt: now };
  s.settings.introSeen = true;
  return normalizeState(s);
}
