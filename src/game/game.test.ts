import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { canonicalSubject } from '../data/subjects';
import { createNewGame, normalizeState } from './state';
import { makeCtx } from './core';
import type { Ctx } from './core';
import { recordStudy, todaySeconds, totalSeconds, deleteStudyRecord, previewStudyReward } from './study';
import { goToSleep, wakeUp, cancelSleep } from './day';
import { expForLevel, levelFromExp, deriveStats } from './progression';
import { createBattle, resolveTurn, spawnMonster } from './battle';
import type { BattleState } from './battle';
import { startTowerBattle, finishBattle, startFieldBattle } from './encounters';
import { floorInfo, floorAccess, spinSlots } from './tower';
import { gachaPull, buyItem } from './shop';
import { equip, upgradeItem, useItem } from './inventory';
import { metricValue, claimQuest } from './quests';
import { migrateLegacy } from '../store/persistence';
import { seeded } from './rng';
import type { GameState } from './types';

function run<T>(s: GameState, fn: (d: GameState, ctx: Ctx) => T, ctx = makeCtx(seeded(42), 1_700_000_000_000)) {
  let out!: T;
  const next = produce(s, (d) => {
    out = fn(d as GameState, ctx);
  });
  return { s: next, out, ctx };
}

describe('subjects', () => {
  it('treats 화2 / 화학2 / Chemistry II as the same subject', () => {
    expect(canonicalSubject('화2')).toBe('화학2');
    expect(canonicalSubject('화학 2')).toBe('화학2');
    expect(canonicalSubject('화학II')).toBe('화학2');
    expect(canonicalSubject('Chemistry II')).toBe('화학2');
    expect(canonicalSubject('chem2')).toBe('화학2');
    expect(canonicalSubject('화1')).toBe('화학1');
    expect(canonicalSubject('물2')).toBe('물리2');
    expect(canonicalSubject('kjso')).toBe('KJSO');
    expect(canonicalSubject('생2')).toBe('생명과학2');
    expect(canonicalSubject('국어')).toBe('국어');
  });
});

describe('study records', () => {
  it('adds study time additively and never overwrites', () => {
    let s = createNewGame('테스터');
    ({ s } = run(s, (d, c) => recordStudy(d, c, '화2', 3 * 3600 + 20 * 60)));
    ({ s } = run(s, (d, c) => recordStudy(d, c, '물리1', 2 * 3600)));
    ({ s } = run(s, (d, c) => recordStudy(d, c, 'KJSO', 3600 + 40 * 60)));
    expect(s.study.length).toBe(3);
    expect(todaySeconds(s)).toBe((3 * 60 + 20 + 120 + 100) * 60);
    expect(s.study[0].subject).toBe('화학2');
  });

  it('calculates rewards: 1 min = 1 EXP, 0.5 G, 10 min = 1 stamina', () => {
    const s0 = createNewGame('t');
    const p = previewStudyReward(s0, 60 * 60);
    expect(p.exp).toBe(60);
    expect(p.stamina).toBe(6);
    const { s } = run(s0, (d, c) => recordStudy(d, c, '수학', 3600));
    expect(s.player.totalExp).toBe(60);
    // base gold 30 × (1 + LUK 5 × 0.5%) = 30.75 → 30
    expect(s.player.gold - s0.player.gold).toBe(30);
    expect(s.player.stamina - s0.player.stamina).toBe(6);
  });

  it('rolls back rewards when deleting a record of the current day', () => {
    const s0 = createNewGame('t');
    const { s: s1, out } = run(s0, (d, c) => recordStudy(d, c, '수학', 30 * 60));
    const { s: s2 } = run(s1, (d) => deleteStudyRecord(d, out.id));
    expect(s2.study.length).toBe(0);
    expect(s2.player.totalExp).toBe(0);
    expect(s2.player.gold).toBe(s0.player.gold);
  });

  it('rejects study while asleep', () => {
    let s = createNewGame('t');
    ({ s } = run(s, (d, c) => goToSleep(d, c)));
    expect(() => run(s, (d, c) => recordStudy(d, c, '수학', 600))).toThrow();
  });
});

describe('RPG day system', () => {
  it('only changes day on sleep → wake, keeps records, updates streak', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.settings.dailyGoalMinutes = 60;
    });
    ({ s } = run(s, (d, c) => recordStudy(d, c, '수학', 90 * 60)));
    expect(s.day.number).toBe(1);
    ({ s } = run(s, (d, c) => goToSleep(d, c)));
    expect(s.day.status).toBe('sleeping');
    ({ s } = run(s, (d, c) => cancelSleep(d, c)));
    expect(s.day.status).toBe('active');
    expect(s.day.number).toBe(1);
    ({ s } = run(s, (d, c) => goToSleep(d, c)));
    ({ s } = run(s, (d, c) => wakeUp(d, c)));
    expect(s.day.number).toBe(2);
    expect(s.streak.current).toBe(1);
    expect(s.dayHistory.length).toBe(1);
    expect(s.dayHistory[0].studySeconds).toBe(90 * 60);
    expect(todaySeconds(s)).toBe(0);
    expect(totalSeconds(s)).toBe(90 * 60);
    // a day without meeting the goal breaks the streak
    ({ s } = run(s, (d, c) => recordStudy(d, c, '수학', 10 * 60)));
    ({ s } = run(s, (d, c) => wakeUp(d, c)));
    expect(s.streak.current).toBe(0);
    expect(s.streak.longest).toBe(1);
  });

  it('auto-claims unclaimed daily quests at wake-up', () => {
    let s = createNewGame('t');
    ({ s } = run(s, (d, c) => recordStudy(d, c, '수학', 35 * 60)));
    expect(metricValue(s, 'dayStudyMin')).toBe(35);
    const gold = s.player.gold;
    ({ s } = run(s, (d, c) => wakeUp(d, c)));
    expect(s.player.gold).toBeGreaterThan(gold);
  });
});

describe('progression', () => {
  it('has a monotonic EXP curve', () => {
    expect(expForLevel(1)).toBe(0);
    expect(expForLevel(2)).toBe(25);
    expect(levelFromExp(24)).toBe(1);
    expect(levelFromExp(25)).toBe(2);
    for (let i = 2; i < 99; i++) expect(expForLevel(i + 1)).toBeGreaterThan(expForLevel(i));
  });

  it('training stats from subjects', () => {
    let s = createNewGame('t');
    ({ s } = run(s, (d, c) => recordStudy(d, c, '화학2', 4 * 3600)));
    const st = deriveStats(s);
    expect(st.training.int).toBe(2);
  });
});

describe('battle', () => {
  it('a level-1 player can beat a green slime', () => {
    const s = createNewGame('t');
    const d = deriveStats(s);
    const m = spawnMonster('slime_green', 1);
    let b: BattleState = createBattle({ kind: 'field', locationId: 'forest', title: '', waves: [m], canEscape: true, bg: 'forest', staminaSpent: 1, modifiers: {} }, d, d.maxHp, d.maxMp, 100);
    const rng = seeded(7);
    for (let i = 0; i < 30 && !b.over; i++) b = resolveTurn(b, { type: 'attack' }, rng).state;
    expect(b.over).toBe('victory');
  });

  it('tower floor 1 battle grants first clear and persists progress', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.player.stamina = 10;
    });
    const { s: s1, out: setup } = run(s, (d, c) => startTowerBattle(d, c, 1));
    expect(s1.player.stamina).toBe(8);
    const d = deriveStats(s1);
    let b = createBattle(setup, d, s1.player.hp, s1.player.mp, s1.player.gold);
    const rng = seeded(3);
    for (let i = 0; i < 40 && !b.over; i++) b = resolveTurn(b, { type: 'attack' }, rng).state;
    expect(b.over).toBe('victory');
    const { s: s2, out: res } = run(s1, (dd, c) => finishBattle(dd, c, b));
    expect(res.firstClear).toBe(true);
    expect(s2.tower.highestCleared).toBe(1);
    expect(s2.stats.monstersDefeated).toBe(1);
    expect(s2.player.totalExp).toBeGreaterThan(0);
  });

  it('needs stamina to fight', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.player.stamina = 0;
    });
    expect(() => run(s, (d, c) => startFieldBattle(d, c, 'forest'))).toThrow();
  });

  it('special floors 4, 7, 13 are configured', () => {
    expect(floorInfo(4).special).toBe(4);
    expect(floorInfo(4).waves).toEqual(['wisp', 'wraith', 'reaper']);
    expect(floorInfo(7).waves).toEqual(['slime_king_gold']);
    expect(floorInfo(13).waves).toEqual(['guest13']);
    expect(floorInfo(10).type).toBe('boss');
  });

  it('locks floors above highest+1 and sealed floors by rank', () => {
    const s = createNewGame('t');
    expect(floorAccess(s, 1).ok).toBe(true);
    expect(floorAccess(s, 2).ok).toBe(false);
    const s2 = produce(s, (d) => {
      d.tower.highestCleared = 20;
    });
    expect(floorAccess(s2, 21).ok).toBe(false);
  });

  it('floor 7 slot machine gives 3 free spins before clearing', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.tower.highestCleared = 6;
    });
    for (let i = 0; i < 3; i++) ({ s } = run(s, (d, c) => spinSlots(d, c)));
    expect(() => run(s, (d, c) => spinSlots(d, c))).toThrow();
  });
});

describe('economy', () => {
  it('shop purchase spends gold and adds the item', () => {
    let s = createNewGame('t');
    ({ s } = run(s, (d, c) => buyItem(d, c, 'p_small', 2)));
    expect(s.player.gold).toBe(70);
    expect(s.inventory.find((e) => e.itemId === 'p_small')!.qty).toBe(5);
  });

  it('cannot buy without enough gold or rank', () => {
    const s = createNewGame('t');
    expect(() => run(s, (d, c) => buyItem(d, c, 'w_aurora'))).toThrow();
  });

  it('gacha always returns rewards and spends gold', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.player.gold = 5000;
    });
    const { s: s1, out } = run(s, (d, c) => gachaPull(d, c, 10));
    expect(out.length).toBe(10);
    expect(s1.player.gold).toBe(5000 - 1350 + out.reduce((a, r) => a + (r.converted || 0), 0));
    expect(out.some((r) => ['rare', 'epic', 'legendary', 'mythic'].includes(r.rarity))).toBe(true);
    expect(s1.gacha.history.length).toBe(10);
  });

  it('equipment changes stats; upgrades cost gold', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.player.gold = 1000;
    });
    ({ s } = run(s, (d, c) => buyItem(d, c, 'w_iron')));
    const atk0 = deriveStats(s).atk;
    const entry = s.inventory.find((e) => e.itemId === 'w_iron')!;
    ({ s } = run(s, (d, c) => equip(d, c, entry.uid)));
    expect(deriveStats(s).atk).toBe(atk0 - 4 + 8);
    const g = s.player.gold;
    ({ s } = run(s, (d, c) => upgradeItem(d, c, entry.uid)));
    expect(s.player.gold).toBeLessThan(g);
  });

  it('chest opening gives gold and items', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.inventory.push({ uid: 'cx', itemId: 'chest_bronze', qty: 1, plus: 0, obtainedAt: 0 });
    });
    const n = s.inventory.length;
    const { s: s1 } = run(s, (d, c) => useItem(d, c, 'cx'));
    expect(s1.stats.chestsOpened).toBe(1);
    expect(s1.inventory.length).toBeGreaterThanOrEqual(n - 1);
  });
});

describe('quests', () => {
  it('claims a completed quest once', () => {
    let s = createNewGame('t');
    ({ s } = run(s, (d, c) => recordStudy(d, c, '수학', 31 * 60)));
    ({ s } = run(s, (d, c) => claimQuest(d, c, 'd_study30')));
    expect(() => run(s, (d, c) => claimQuest(d, c, 'd_study30'))).toThrow();
  });
});

describe('save migration', () => {
  it('migrates the v2 save without losing study time', () => {
    const legacy = {
      profile: 'default',
      day: 3,
      dayOpen: true,
      totalSeconds: 3 * 3600 + 1800,
      xp: 210,
      gold: 15,
      floor: 21,
      subjectsList: ['화학2', '물리1', '수학', '국어', '영어'],
      subjectsSeconds: { 화학2: 7200, 물리1: 3600, 수학: 1800 },
      sessions: [
        { id: 'a', kind: 'study', day: 1, time: '2025-03-01 10:00:00', subject: '화학2', seconds: 7200, xp: 120, gold: 12, floors: 12 },
        { id: 'b', kind: 'study', day: 3, time: '2025-03-03 10:00:00', subject: '물리1', seconds: 3600, xp: 60, gold: 6, floors: 6 },
        { id: 'c', kind: 'shop', day: 3, time: '2025-03-03 11:00:00', meta: { name: '유튜브', cost: 100 } },
      ],
      logs: [],
    };
    const s = migrateLegacy(legacy, 1_700_000_000_000);
    expect(s.day.number).toBe(3);
    expect(totalSeconds(s)).toBe(7200 + 3600 + 1800);
    expect(todaySeconds(s)).toBe(3600);
    expect(s.player.totalExp).toBeGreaterThanOrEqual(210);
    expect(s.subjects.some((x) => x.name === '국어')).toBe(true);
    expect(s.dayHistory.length).toBe(1);
    expect(s.legacy?.floor).toBe(21);
    expect(s.player.stamina).toBe(21);
  });

  it('normalizeState fills missing fields without deleting data', () => {
    const s = createNewGame('t');
    const partial = JSON.parse(JSON.stringify(s));
    delete partial.settings;
    delete partial.gacha;
    partial.study = [{ id: 'x', subject: '신과목', seconds: 600, day: 1, at: 0, exp: 10, gold: 5, stamina: 1, bonusPct: 0 }];
    const n = normalizeState(partial);
    expect(n.settings.dailyGoalMinutes).toBe(60);
    expect(n.gacha.pulls).toBe(0);
    expect(n.study.length).toBe(1);
    expect(n.subjects.some((x) => x.name === '신과목')).toBe(true);
  });
});
