import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { canonicalSubject } from '../data/subjects';
import { createNewGame, normalizeState } from './state';
import { makeCtx } from './core';
import type { Ctx } from './core';
import { recordStudy, todaySeconds, totalSeconds, deleteStudyRecord, previewStudyReward, deleteSubject, addDefaultSubjects } from './study';
import { goToSleep, wakeUp, cancelSleep } from './day';
import { expForLevel, levelFromExp, deriveStats, currentRank, unlockStage } from './progression';
import { createBattle, resolveTurn, spawnMonster, activeSkills, skillState } from './battle';
import { ATK_TYPES, CHARACTERS, affinityMult } from '../data/characters';
import type { BattleState } from './battle';
import { startTowerBattle, finishBattle, startFieldBattle, continueTower } from './encounters';
import { floorInfo, floorAccess, spinSlots, towerNextStep } from './tower';
import { gachaPull, buyItem, autoGacha } from './shop';
import { GACHA } from '../data/world';
import { equip, upgradeItem, useItem, synthesize, checkSynthesis, SYNTH_COST, sellItem, sellAll, toggleLock, setActiveCharacter } from './inventory';
import { MONSTERS } from '../data/monsters';
import { MONSTER_SKILLS } from '../data/monsterSkills';
import { getItem, ITEMS } from '../data/items';
import { stageForLevel, WEAPON_KIND_ORDER } from '../data/weapons';
import { ARMOR_MATERIAL_ORDER } from '../data/armor';
import { ACC_KIND_ORDER } from '../data/accessories';
import { ICON_ALIAS, ICONS } from '../render/sprites';
import { rankAtLeast } from '../data/ranks';
import { rollItemOfRarity } from './loot';
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
  const legacyList = ['화학1', '화학2', '물리1', '물리2', '수학', '기하', 'KJSO'].map((name) => ({ name, en: name, stat: 'int' as const, color: '#fff' }));

  it('new games start with 수능 subjects', () => {
    const s = createNewGame('t');
    const names = s.subjects.map((x) => x.name);
    for (const n of ['국어', '수학', '영어', '한국사', '물리학Ⅰ', '화학Ⅱ', '생명과학Ⅰ', '지구과학Ⅱ', '사회탐구']) expect(names).toContain(n);
  });

  it('treats 화2 / 화학2 / 화학Ⅱ / Chemistry II as the same subject (new list)', () => {
    for (const raw of ['화2', '화학2', '화학 2', '화학II', '화학Ⅱ', 'Chemistry II', 'chem2']) expect(canonicalSubject(raw)).toBe('화학Ⅱ');
    expect(canonicalSubject('물1')).toBe('물리학Ⅰ');
    expect(canonicalSubject('물리1')).toBe('물리학Ⅰ');
    expect(canonicalSubject('생2')).toBe('생명과학Ⅱ');
    expect(canonicalSubject('지1')).toBe('지구과학Ⅰ');
    expect(canonicalSubject('사탐')).toBe('사회탐구');
    expect(canonicalSubject('kjso')).toBe('KJSO');
    expect(canonicalSubject('국어')).toBe('국어');
  });

  it('keeps merging into the old names in an existing save', () => {
    for (const raw of ['화2', '화학Ⅱ', 'Chemistry II', 'chem2']) expect(canonicalSubject(raw, legacyList)).toBe('화학2');
    expect(canonicalSubject('물리학Ⅰ', legacyList)).toBe('물리1');
    expect(canonicalSubject('geometry', legacyList)).toBe('기하');
  });

  it('deletes subjects without ever deleting study records', () => {
    let s = createNewGame('t');
    ({ s } = run(s, (d, c) => recordStudy(d, c, '화2', 3600)));
    const { s: s1, out } = run(s, (d) => deleteSubject(d, '화학Ⅱ'));
    expect(out.kept).toBe(true);
    expect(s1.subjects.find((x) => x.name === '화학Ⅱ')!.hidden).toBe(true);
    expect(totalSeconds(s1)).toBe(3600);
    // typing the name again restores it
    const { s: s2 } = run(s1, (d, c) => recordStudy(d, c, '화학Ⅱ', 600));
    expect(s2.subjects.find((x) => x.name === '화학Ⅱ')!.hidden).toBe(false);
    // a subject without records is removed outright and stays removed after a reload
    const { s: s3, out: o3 } = run(s2, (d) => deleteSubject(d, '한국사'));
    expect(o3.kept).toBe(false);
    expect(normalizeState(JSON.parse(JSON.stringify(s3))).subjects.some((x) => x.name === '한국사')).toBe(false);
    const { s: s4, out: n } = run(s3, (d) => addDefaultSubjects(d));
    expect(n).toBe(1);
    expect(s4.subjects.some((x) => x.name === '한국사')).toBe(true);
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
    expect(s.study[0].subject).toBe('화학Ⅱ');
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

  it('caps one RPG day at 24 hours in total', () => {
    let s = createNewGame('t');
    ({ s } = run(s, (d, c) => recordStudy(d, c, '수학', 20 * 3600)));
    expect(() => run(s, (d, c) => recordStudy(d, c, '국어', 5 * 3600))).toThrow(/24시간/);
    ({ s } = run(s, (d, c) => recordStudy(d, c, '국어', 4 * 3600)));
    expect(todaySeconds(s)).toBe(24 * 3600);
    expect(() => run(s, (d, c) => recordStudy(d, c, '국어', 60))).toThrow();
    // a new RPG day resets the allowance
    ({ s } = run(s, (d, c) => wakeUp(d, c)));
    ({ s } = run(s, (d, c) => recordStudy(d, c, '국어', 3600)));
    expect(todaySeconds(s)).toBe(3600);
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
    expect(deriveStats(s).atk).toBeGreaterThan(atk0); // iron sword (+8) beats the wooden sword (+4)
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

describe('synthesis', () => {
  it('combines 3 same-rarity pieces into 1 of the next rarity and charges gold', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.player.gold = 1000;
      d.inventory.push({ uid: 'a', itemId: 'h_leather', qty: 1, plus: 0, obtainedAt: 0 });
      d.inventory.push({ uid: 'b', itemId: 'h_iron', qty: 1, plus: 2, obtainedAt: 0 });
      d.inventory.push({ uid: 'c', itemId: 'h_leather', qty: 1, plus: 0, obtainedAt: 0 });
    });
    expect(checkSynthesis(s, ['a', 'b', 'c']).slot).toBe('helmet');
    const n = s.inventory.length;
    const { s: s1, out } = run(s, (d, c) => synthesize(d, c, ['a', 'b', 'c']));
    expect(getItem(out.itemId).rarity).toBe('uncommon');
    expect(getItem(out.itemId).slot).toBe('helmet'); // same-slot materials → same slot
    expect(s1.inventory.length).toBe(n - 2);
    expect(s1.player.gold).toBe(1000 - SYNTH_COST.common);
    expect(s1.stats.synthesized).toBe(1);
  });

  it('rejects mixed rarities, equipped items and mythic materials', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.player.gold = 99999;
      d.inventory.push({ uid: 'x', itemId: 'h_leather', qty: 1, plus: 0, obtainedAt: 0 });
      d.inventory.push({ uid: 'y', itemId: 'h_scholar', qty: 1, plus: 0, obtainedAt: 0 });
      d.inventory.push({ uid: 'm1', itemId: 'w_infinitepen', qty: 1, plus: 0, obtainedAt: 0 });
      d.inventory.push({ uid: 'm2', itemId: 'w_infinitepen', qty: 1, plus: 0, obtainedAt: 0 });
      d.inventory.push({ uid: 'm3', itemId: 'w_infinitepen', qty: 1, plus: 0, obtainedAt: 0 });
    });
    expect(checkSynthesis(s, ['x', 'y', 'start_w']).ok).toBe(false); // start_w is equipped
    expect(checkSynthesis(s, ['m1', 'm2', 'm3']).ok).toBe(false);
    expect(() => run(s, (d, c) => synthesize(d, c, ['x', 'y', 'm1']))).toThrow();
  });
});

describe('auto gacha', () => {
  it('stops at the target rarity, costs the premium price, and gives every result', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.player.gold = 100000;
    });
    const { s: s1, out } = run(s, (d, c) => autoGacha(d, c, { stopAt: 'epic', maxPulls: 100 }));
    const last = out.results[out.results.length - 1];
    if (out.stopReason === 'target') expect(['epic', 'legendary', 'mythic']).toContain(last.rarity);
    expect(out.spent).toBe(out.results.length * GACHA.auto);
    expect(GACHA.auto).toBeGreaterThan(GACHA.single);
    expect(s1.gacha.pulls).toBe(out.results.length);
    expect(s1.gacha.history.length).toBe(Math.min(200, out.results.length));
  });

  it('stops when gold runs out', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.player.gold = GACHA.auto * 3 + 10;
    });
    const { out } = run(s, (d, c) => autoGacha(d, c, { stopAt: 'mythic', maxPulls: 100 }));
    expect(out.results.length).toBeGreaterThanOrEqual(3);
    expect(['gold', 'target']).toContain(out.stopReason);
  });
});

describe('round 3: lock/sell-all, level, rank, monsters', () => {
  it('locked items cannot be sold; sell-all skips equipped and locked items', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.inventory.push({ uid: 'k1', itemId: 'w_iron', qty: 1, plus: 0, obtainedAt: 0, locked: true });
      d.inventory.push({ uid: 'k2', itemId: 'h_iron', qty: 1, plus: 0, obtainedAt: 0 });
      d.inventory.push({ uid: 'k3', itemId: 'p_mid', qty: 4, plus: 0, obtainedAt: 0 });
    });
    expect(() => run(s, (d, c) => sellItem(d, c, 'k1', 1))).toThrow(/잠긴/);
    const { s: s1, out } = run(s, (d, c) => sellAll(d, c, 'equipment'));
    expect(out.count).toBe(1); // only the unlocked, unequipped helmet
    expect(s1.inventory.some((e) => e.uid === 'k1')).toBe(true); // locked kept
    expect(s1.inventory.some((e) => e.uid === 'start_w')).toBe(true); // equipped kept
    expect(s1.inventory.some((e) => e.uid === 'k3')).toBe(true); // consumables kept in equipment scope
    const { s: s2 } = run(s1, (d, c) => sellAll(d, c, 'all'));
    expect(s2.inventory.map((e) => e.uid).sort()).toEqual(['k1', 'start_a', 'start_w']);
    const { s: s3 } = run(s2, (d, c) => toggleLock(d, c, 'k1'));
    expect(s3.inventory.find((e) => e.uid === 'k1')!.locked).toBe(false);
  });

  it('has no level cap and ATK grows in proportion to level', () => {
    for (const lv of [99, 100, 150, 500]) expect(levelFromExp(expForLevel(lv))).toBe(lv);
    expect(levelFromExp(expForLevel(250) - 1)).toBe(249);
    const at = (lv: number) => deriveStats(produce(createNewGame('t'), (d) => void (d.player.totalExp = expForLevel(lv))));
    expect(at(20).atk - at(10).atk).toBeGreaterThanOrEqual(100); // +10 per level (+STR)
    expect(at(200).level).toBe(200);
  });

  it('character rank is 1,000,000x harder while content unlocks use the base thresholds', () => {
    const s = produce(createNewGame('t'), (d) => {
      d.player.totalExp = expForLevel(40);
      d.tower.highestCleared = 30;
      d.stats.bossesDefeated = ['reaper', 'slime_king_gold', 'goblin_king', 'guest13', 'lich', 'dk_commander'];
    });
    expect(currentRank(s)).toBe('F');
    expect(unlockStage(s)).toBe('B');
    expect(floorAccess(s, 41).ok).toBe(false);
    expect(floorAccess(produce(s, (d) => void (d.tower.highestCleared = 40)), 41).ok).toBe(true); // stage B opens 41~60
    expect(floorAccess(produce(s, (d) => void (d.tower.highestCleared = 60)), 61).ok).toBe(false); // stage A needs 7 bosses
  });

  it('every monster has a signature skill and an ultimate', () => {
    for (const m of MONSTERS) if (m.family !== 'dummy') expect(MONSTER_SKILLS[m.id], m.id).toBeTruthy();
  });

  it('monsters telegraph their ultimate at 50% HP and use it the next turn', () => {
    const s = createNewGame('t');
    const d = deriveStats(s);
    const m = spawnMonster('dark_knight', 1);
    m.hp = Math.floor(m.maxHp * 0.5);
    m.skillRate = 0;
    let b = createBattle({ kind: 'field', locationId: 'forest', title: '', waves: [m], canEscape: true, bg: 'forest', staminaSpent: 1, modifiers: {} }, { ...d, maxHp: 99999 }, 99999, d.maxMp, 0);
    const rng = seeded(11);
    const r1 = resolveTurn(b, { type: 'defend' }, rng);
    expect(r1.state.monster.charging).toBe('ult');
    expect(r1.events.some((e) => e.k === 'mCharge')).toBe(true);
    const r2 = resolveTurn(r1.state, { type: 'defend' }, rng);
    expect(r2.events.some((e) => e.k === 'text' && e.text.includes('칠흑의 참격'))).toBe(true);
    expect(r2.state.monster.ultUses).toBe(1);
    b = r2.state;
  });

  it('poison deals damage every turn', () => {
    const s = createNewGame('t');
    const d = deriveStats(s);
    const m = spawnMonster('dummy', 1);
    let b = createBattle({ kind: 'training', locationId: 'training', title: '', waves: [m], canEscape: true, bg: 'training', staminaSpent: 0, modifiers: {} }, d, d.maxHp, d.maxMp, 0);
    b = { ...b, player: { ...b.player, poison: { pct: 10, turns: 2 } } };
    const r = resolveTurn(b, { type: 'defend' }, seeded(1));
    const dot = r.events.find((e) => e.k === 'pDot');
    expect(dot && dot.k === 'pDot' && dot.dmg).toBe(Math.round(d.maxHp * 0.1));
    expect(r.state.player.poison!.turns).toBe(1);
  });
});

describe('round 4: attack types, characters, Q/W/E/R skills', () => {
  const mkBattle = (charId: string, monsterId = 'dummy', lvl = 10, mods?: (m: ReturnType<typeof spawnMonster>) => void) => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.player.activeCharacter = charId;
      d.player.totalExp = expForLevel(lvl);
      d.ownedCharacters = ['swordsman', 'mage', 'pyro', 'toxin', 'cleric'];
    });
    const d = deriveStats(s);
    const m = spawnMonster(monsterId, lvl);
    mods?.(m);
    const b = createBattle({ kind: 'field', locationId: 'forest', title: '', waves: [m], canEscape: true, bg: 'forest', staminaSpent: 0, modifiers: {} }, d, d.maxHp, d.maxMp, 0, charId);
    return { s, d, b };
  };

  it('has 5 attack types with 5 characters, each with exactly Q/W/E/R skills', () => {
    expect(ATK_TYPES.length).toBe(5);
    expect(new Set(CHARACTERS.map((c) => c.type)).size).toBe(5);
    for (const c of CHARACTERS) expect(c.skills.map((x) => x.key)).toEqual(['Q', 'W', 'E', 'R']);
    expect(CHARACTERS.filter((c) => c.starter).length).toBe(1);
  });

  it('new games own only the starter; the others come from the gacha', () => {
    const s = createNewGame('t');
    expect(s.ownedCharacters).toEqual(['swordsman']);
    expect(s.player.activeCharacter).toBe('swordsman');
    expect(() => run(s, (d, c) => setActiveCharacter(d, c, 'mage'))).toThrow();
  });

  it('gacha summons every character within the hard pity and never duplicates', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => void (d.player.gold = 10_000_000));
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const r = run(s, (d, c) => gachaPull(d, c, 10));
      s = r.s;
      for (const x of r.out) if (getItem(x.itemId).category === 'character') seen.add(x.itemId);
    }
    expect([...seen].sort()).toEqual(['char_cleric', 'char_mage', 'char_pyro', 'char_toxin']);
    expect(s.ownedCharacters.length).toBe(5);
    // with everyone owned, no further character results
    const r2 = run(s, (d, c) => gachaPull(d, c, 10));
    expect(r2.out.some((x) => getItem(x.itemId).category === 'character')).toBe(false);
    const { s: s2 } = run(s, (d, c) => setActiveCharacter(d, c, 'cleric'));
    expect(s2.player.activeCharacter).toBe('cleric');
  });

  it('skills cost MP, go on cooldown, and are blocked until ready', () => {
    const { b } = mkBattle('swordsman');
    const rng = seeded(3);
    const q = activeSkills('swordsman')[0];
    const w = activeSkills('swordsman')[1];
    const r1 = resolveTurn(b, { type: 'skill', skillId: w.id }, rng);
    expect(r1.state.player.mp).toBeLessThan(b.player.mp);
    expect(r1.state.player.cooldowns[w.id]).toBe(w.cd - 1); // ticked once at round end
    const r2 = resolveTurn(r1.state, { type: 'skill', skillId: w.id }, rng);
    expect(r2.state).toBe(r1.state); // refused: still on cooldown
    expect(skillState(r1.state, w).ready).toBe(false);
    expect(skillState(r1.state, q).ready).toBe(true);
  });

  it('weaknesses / resistances change damage', () => {
    // slime: weak to fire, immune to poison
    const dmgOf = (charId: string, skillIdx: number) => {
      const { b } = mkBattle(charId, 'slime_green', 10, (m) => void (m.maxHp = m.hp = 1e7));
      const sk = activeSkills(charId)[skillIdx];
      const r = resolveTurn({ ...b, monster: { ...b.monster, def: 0 } }, { type: 'skill', skillId: sk.id }, seeded(9));
      const hit = r.events.find((e) => e.k === 'pAttack');
      return hit && hit.k === 'pAttack' ? hit : null;
    };
    expect(affinityMult('slime_green', 'fire')).toBeGreaterThan(1);
    expect(affinityMult('slime_green', 'poison')).toBeLessThan(1);
    expect(affinityMult('skeleton', 'holy')).toBeGreaterThan(1);
    expect(dmgOf('pyro', 0)!.aff).toBe('weak');
    expect(dmgOf('toxin', 0)!.aff).toBe('immune');
  });

  it('fire burns and poison stacks over time, and burst detonates them', () => {
    const rng = seeded(21);
    const { b } = mkBattle('pyro', 'skeleton_warrior', 10, (m) => void (m.maxHp = m.hp = 1e7));
    const q = activeSkills('pyro')[0];
    const e = activeSkills('pyro')[2];
    let st = resolveTurn(b, { type: 'skill', skillId: q.id }, rng).state;
    expect(st.monster.burn).not.toBeNull();
    const hpAfterQ = st.monster.hp;
    expect(hpAfterQ).toBeLessThan(1e7);
    // burn ticked at the end of that round
    const t2 = resolveTurn(b, { type: 'skill', skillId: q.id }, seeded(21));
    expect(t2.events.some((x) => x.k === 'mDot' && x.kind === 'burn')).toBe(true);
    // burst consumes the burn
    st = { ...st, player: { ...st.player, mp: st.player.maxMp, cooldowns: {} } };
    const r = resolveTurn(st, { type: 'skill', skillId: e.id }, rng);
    expect(r.state.monster.burn).toBeNull();

    const tx = mkBattle('toxin', 'goblin', 10, (m) => void (m.maxHp = m.hp = 1e7)).b;
    const px = activeSkills('toxin')[0];
    const a1 = resolveTurn(tx, { type: 'skill', skillId: px.id }, seeded(5)).state;
    const a2 = resolveTurn({ ...a1, player: { ...a1.player, cooldowns: {}, mp: a1.player.maxMp } }, { type: 'skill', skillId: px.id }, seeded(6)).state;
    expect(a2.monster.poison!.dmg).toBeGreaterThan(a1.monster.poison!.dmg); // stacks
  });

  it('holy heals on hit and the cleric blessing heals + buffs defence', () => {
    const { b } = mkBattle('cleric', 'skeleton', 10, (m) => void (m.maxHp = m.hp = 1e7));
    const hurt = { ...b, player: { ...b.player, hp: Math.floor(b.player.maxHp * 0.5) } };
    const q = activeSkills('cleric')[0];
    const r = resolveTurn(hurt, { type: 'skill', skillId: q.id }, seeded(2));
    expect(r.events.some((e) => e.k === 'pHeal')).toBe(true);
    const bless = activeSkills('cleric')[2];
    const r2 = resolveTurn(hurt, { type: 'skill', skillId: bless.id }, seeded(2));
    expect(r2.state.player.hp).toBeGreaterThan(hurt.player.hp);
    expect(r2.state.player.buffs.some((x) => x.kind === 'def')).toBe(true);
  });

  it('character stat modifiers apply (mage trades HP/DEF for MATK)', () => {
    const at = (ch: string) => deriveStats(produce(createNewGame('t'), (d) => void ((d.player.activeCharacter = ch), (d.player.totalExp = expForLevel(30)))));
    expect(at('mage').matk).toBeGreaterThan(at('swordsman').matk);
    expect(at('swordsman').atk).toBeGreaterThan(at('mage').atk);
    expect(at('swordsman').maxHp).toBeGreaterThan(at('mage').maxHp);
  });

  it('migrates old saves: starter owned and active', () => {
    const s = createNewGame('t');
    const old = JSON.parse(JSON.stringify(s));
    delete old.ownedCharacters;
    delete old.player.activeCharacter;
    delete old.gacha.charPity;
    const n = normalizeState(old);
    expect(n.ownedCharacters).toEqual(['swordsman']);
    expect(n.player.activeCharacter).toBe('swordsman');
    expect(n.gacha.charPity).toBe(0);
  });
});

describe('round 5: weapon kinds & many more weapons', () => {
  const weapons = ITEMS.filter((i) => i.slot === 'weapon');
  const withWeapon = (itemId: string, plus = 0, charId = 'swordsman', lvl = 20) =>
    produce(createNewGame('t'), (d) => {
      d.player.activeCharacter = charId;
      d.ownedCharacters = ['swordsman', 'mage', 'pyro', 'toxin', 'cleric'];
      d.player.totalExp = expForLevel(lvl);
      d.inventory.push({ uid: 'w', itemId, qty: 1, plus, obtainedAt: 0 });
      d.player.equipment.weapon = 'w';
    });
  const battleOf = (s: GameState, monsterId = 'dummy') => {
    const d = deriveStats(s);
    const m = spawnMonster(monsterId, 20);
    m.maxHp = m.hp = 1e8;
    return createBattle({ kind: 'field', locationId: 'forest', title: '', waves: [m], canEscape: true, bg: 'forest', staminaSpent: 0, modifiers: {} }, d, d.maxHp, d.maxMp, 0, s.player.activeCharacter);
  };

  it('has 100+ weapons across 15 kinds, every kind with 5+ weapons and a shop entry', () => {
    expect(weapons.length).toBeGreaterThanOrEqual(100);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length); // ids unique
    expect(WEAPON_KIND_ORDER.length).toBe(15);
    for (const k of WEAPON_KIND_ORDER) {
      const list = weapons.filter((w) => w.kind === k);
      expect(list.length, k).toBeGreaterThanOrEqual(5);
      expect(list.some((w) => w.shop === 'weapons'), k).toBe(true);
    }
    for (const w of weapons) {
      expect(w.kind, w.id).toBeTruthy();
      expect(ICONS[w.icon] || ICON_ALIAS[w.icon], `${w.id} icon ${w.icon}`).toBeTruthy();
      expect(w.price, w.id).toBeGreaterThan(0);
      expect(w.level, w.id).toBeGreaterThan(0);
      if (w.shop) expect(rankAtLeast(stageForLevel(w.level!) ?? 'F', w.minRank), w.id).toBe(true);
    }
  });

  it('kind passives apply while equipped and are not scaled by upgrades', () => {
    const base = deriveStats(withWeapon('w_hatchet'));
    expect(base.pierce).toBeCloseTo(0.12); // axe: 방어 관통 +12%
    expect(deriveStats(withWeapon('w_hatchet', 10)).pierce).toBeCloseTo(0.12);
    expect(deriveStats(withWeapon('w_dirk')).crit - deriveStats(withWeapon('w_hatchet')).crit).toBeGreaterThanOrEqual(6);
    expect(deriveStats(withWeapon('w_bokken')).critDmg).toBeCloseTo(1.75 + 0.18); // katana
    expect(deriveStats(withWeapon('w_sickle')).lifesteal).toBe(5); // scythe
    expect(deriveStats(withWeapon('w_notebook')).mpSave).toBe(15); // tome
    expect(deriveStats(withWeapon('w_pencil')).expBonus).toBe(3); // pen
  });

  it('tomes make skills cheaper; lifesteal heals; type damage only boosts its own type', () => {
    // mpSave
    const mage = (id: string) => battleOf(withWeapon(id, 0, 'mage'));
    const r = activeSkills('mage')[3];
    expect(skillState(mage('w_notebook'), r).mp).toBeLessThan(skillState(mage('w_practicewand'), r).mp);
    // lifesteal: hurt swordsman with a scythe heals by hitting
    const b = battleOf(withWeapon('w_sickle'));
    const hurt = { ...b, player: { ...b.player, hp: Math.floor(b.player.maxHp / 2) } };
    const res = resolveTurn(hurt, { type: 'attack' }, seeded(3));
    expect(res.events.some((e) => e.k === 'pHeal')).toBe(true);
    // type damage: the same weapon with fireDmg boosts the pyro but not the mage
    const dmgWith = (charId: string, fire: number) => {
      const bb = battleOf(withWeapon('w_ember', 0, charId));
      bb.player.typeDmg = { fire };
      const out = resolveTurn(bb, { type: 'skill', skillId: activeSkills(charId)[0].id }, seeded(9));
      return out.events.filter((e) => e.k === 'pAttack').reduce((a, e) => a + (e.k === 'pAttack' ? e.dmg : 0), 0);
    };
    expect(dmgWith('pyro', 50)).toBeGreaterThan(dmgWith('pyro', 0));
    expect(dmgWith('mage', 50)).toBe(dmgWith('mage', 0));
  });

  it('drops / summons are not flooded by weapons', () => {
    const rng = seeded(77);
    let w = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) if (rollItemOfRarity(rng, 'rare', { gacha: true }).slot === 'weapon') w++;
    expect(w / N).toBeLessThan(0.5);
    expect(w / N).toBeGreaterThan(0.15);
  });

  it('three same-kind weapons synthesize into a weapon of that kind', () => {
    let s = createNewGame('t');
    s = produce(s, (d) => {
      d.player.gold = 5000;
      for (const u of ['a', 'b', 'c']) d.inventory.push({ uid: u, itemId: 'w_bokken', qty: 1, plus: 0, obtainedAt: 0 });
    });
    expect(checkSynthesis(s, ['a', 'b', 'c']).kind).toBe('katana');
    for (let seed = 1; seed < 6; seed++) {
      const { s: s1, out } = run(s, (d, c) => synthesize(d, c, ['a', 'b', 'c']), makeCtx(seeded(seed), 1));
      expect(getItem(out.itemId).kind).toBe('katana');
      expect(getItem(out.itemId).rarity).toBe('uncommon');
      expect(s1.discovered).toContain(out.itemId);
    }
  });

  it('codex: obtained items are recorded; old saves start from what they hold', () => {
    const s = createNewGame('t');
    expect(s.discovered).toEqual(expect.arrayContaining(['w_wood', 'a_tunic', 'p_small']));
    const { s: s1 } = run(s, (d, c) => buyItem(d, c, 'w_knife'));
    expect(s1.discovered).toContain('w_knife');
    const old = JSON.parse(JSON.stringify(produce(s, (d) => void d.inventory.push({ uid: 'z', itemId: 'w_claymore', qty: 1, plus: 0, obtainedAt: 0 }))));
    delete old.discovered;
    const n = normalizeState(old);
    expect(n.discovered).toEqual(expect.arrayContaining(['w_wood', 'w_claymore']));
    expect(normalizeState(JSON.parse(JSON.stringify(s1))).discovered).toEqual(s1.discovered); // kept as is
  });
});

describe('round 6: armor materials, set bonuses, accessory kinds', () => {
  const gearOf = (slot: string) => ITEMS.filter((i) => i.category === 'equipment' && i.slot === slot);
  const wearing = (ids: Record<string, string>, lvl = 30) =>
    produce(createNewGame('t'), (d) => {
      d.player.totalExp = expForLevel(lvl);
      d.player.equipment.armor = null;
      d.player.equipment.weapon = null;
      for (const [pos, id] of Object.entries(ids)) {
        d.inventory.push({ uid: 'u_' + pos, itemId: id, qty: 1, plus: 0, obtainedAt: 0 });
        (d.player.equipment as Record<string, string | null>)[pos] = 'u_' + pos;
      }
    });

  it('every armor slot and accessories have many items; every piece has a material / kind', () => {
    expect(gearOf('helmet').length).toBeGreaterThanOrEqual(25);
    expect(gearOf('armor').length).toBeGreaterThanOrEqual(25);
    expect(gearOf('gloves').length).toBeGreaterThanOrEqual(20);
    expect(gearOf('boots').length).toBeGreaterThanOrEqual(15);
    expect(gearOf('accessory').length).toBeGreaterThanOrEqual(45);
    for (const slot of ['helmet', 'armor', 'gloves', 'boots']) {
      for (const it of gearOf(slot)) expect(it.material, it.id).toBeTruthy();
      for (const m of ARMOR_MATERIAL_ORDER) expect(gearOf(slot).some((i) => i.material === m), `${slot}/${m}`).toBe(true);
    }
    for (const it of gearOf('accessory')) expect(it.accKind, it.id).toBeTruthy();
    for (const k of ACC_KIND_ORDER) expect(gearOf('accessory').filter((i) => i.accKind === k).length, k).toBeGreaterThanOrEqual(5);
    for (const it of ITEMS.filter((i) => i.category === 'equipment')) {
      expect(ICONS[it.icon] || ICON_ALIAS[it.icon], `${it.id} icon ${it.icon}`).toBeTruthy();
      if (it.shop) expect(rankAtLeast(stageForLevel(it.level!) ?? 'F', it.minRank), it.id).toBe(true);
    }
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });

  it('2-piece and 4-piece material sets apply', () => {
    const none = deriveStats(wearing({ helmet: 'h_pot', armor: 'a_tunic' })); // plate + cloth: no set
    const plate2 = deriveStats(wearing({ helmet: 'h_pot', armor: 'a_breastplate' }));
    const plate4 = deriveStats(wearing({ helmet: 'h_pot', armor: 'a_breastplate', gloves: 'g_iron', boots: 'b_iron' }));
    expect(none.dmgReduce).toBe(0);
    expect(plate2.def).toBeGreaterThan(deriveStats(wearing({ helmet: 'h_pot' })).def + 17); // +17 flat and DEF +10%
    expect(plate2.dmgReduce).toBe(0);
    expect(plate4.dmgReduce).toBe(10);
    const leather4 = deriveStats(wearing({ helmet: 'h_leather', armor: 'a_leather', gloves: 'g_leather', boots: 'b_leather' }));
    expect(leather4.dodge).toBe(7);
    expect(leather4.critDmg).toBeCloseTo(1.75 + 0.15);
    const cloth4 = deriveStats(wearing({ helmet: 'h_bandana', armor: 'a_tunic', gloves: 'g_cotton', boots: 'b_sandal' }));
    expect(cloth4.mpSave).toBe(10);
    expect(cloth4.dmgPct).toBe(6);
  });

  it('accessory kinds give passives, stacking for two of the same kind', () => {
    const one = deriveStats(wearing({ acc1: 'e_stud' }));
    const two = deriveStats(wearing({ acc1: 'e_stud', acc2: 'e_hawk' }));
    const base = deriveStats(wearing({}));
    const gain = one.crit - base.crit; // passive +2, crit +1, dex +1 → +0.15 (crit is rounded to 0.1)
    expect(gain).toBeGreaterThanOrEqual(3);
    expect(gain).toBeLessThanOrEqual(3.3);
    expect(two.crit).toBeGreaterThan(one.crit + 2);
    expect(deriveStats(wearing({ acc1: 'n_shell' })).maxHp).toBeGreaterThan(base.maxHp + 15); // +15 flat and HP +3%
  });

  it('damage reduction lowers monster damage, but not true damage; dodge adds evasion', () => {
    const run1 = (ids: Record<string, string>) => {
      const s = wearing(ids, 20);
      const d = deriveStats(s);
      const m = spawnMonster('slime_green', 20);
      m.maxHp = m.hp = 1e8;
      let total = 0;
      for (let i = 0; i < 200; i++) {
        const b = createBattle({ kind: 'field', locationId: 'forest', title: '', waves: [{ ...m }], canEscape: true, bg: 'forest', staminaSpent: 0, modifiers: {} }, d, d.maxHp, d.maxMp, 0, 'swordsman');
        b.player.dodge = 0; // isolate damage reduction
        const r = resolveTurn(b, { type: 'defend' }, seeded(500 + i));
        total += r.events.filter((e) => e.k === 'mAttack').reduce((a, e) => a + (e.k === 'mAttack' ? e.dmg : 0), 0);
      }
      return { total, d };
    };
    const plain = run1({});
    const reduced = run1({ armor: 'a_eternal' }); // dmgReduce 5 (+ big DEF)
    expect(reduced.d.dmgReduce).toBe(5);
    expect(reduced.total).toBeLessThan(plain.total);
    const dodgy = deriveStats(wearing({ boots: 'b_winged', helmet: 'h_galeband' }));
    expect(dodgy.dodge).toBe(4 + 3 + 3); // items + leather 2-piece set
  });

  it('drops stay varied: no single equipment slot floods common drops, consumables still drop', () => {
    const rng = seeded(11);
    const tally: Record<string, number> = {};
    const N = 6000;
    for (let i = 0; i < N; i++) {
      const it = rollItemOfRarity(rng, 'common', { maxLevel: 30 });
      const g = it.category === 'equipment' ? it.slot! : it.category;
      tally[g] = (tally[g] || 0) + 1;
    }
    for (const v of Object.values(tally)) expect(v / N).toBeLessThan(0.3);
    expect((tally.consumable || 0) / N).toBeGreaterThan(0.08);
  });

  it('synthesis keeps armor material and accessory kind', () => {
    const s0 = produce(createNewGame('t'), (d) => {
      d.player.gold = 99999;
      for (const u of ['a', 'b', 'c']) d.inventory.push({ uid: u, itemId: 'h_pot', qty: 1, plus: 0, obtainedAt: 0 });
      for (const u of ['x', 'y', 'z']) d.inventory.push({ uid: u, itemId: 'c_clover', qty: 1, plus: 0, obtainedAt: 0 });
    });
    expect(checkSynthesis(s0, ['a', 'b', 'c']).material).toBe('plate');
    expect(checkSynthesis(s0, ['x', 'y', 'z']).accKind).toBe('charm');
    for (let seed = 1; seed < 6; seed++) {
      const r1 = run(s0, (d, c) => synthesize(d, c, ['a', 'b', 'c']), makeCtx(seeded(seed), 1)).out;
      expect(getItem(r1.itemId).slot).toBe('helmet');
      expect(getItem(r1.itemId).material).toBe('plate');
      const r2 = run(s0, (d, c) => synthesize(d, c, ['x', 'y', 'z']), makeCtx(seeded(seed), 1)).out;
      expect(getItem(r2.itemId).accKind).toBe('charm');
    }
  });
});

describe('tower: continue climbing from the result screen', () => {
  const at = (highest: number, stamina = 50) =>
    produce(createNewGame('t'), (d) => {
      d.tower.highestCleared = highest;
      d.player.stamina = stamina;
      d.player.totalExp = expForLevel(40);
    });

  it('goes straight to the next battle floor', () => {
    const s = at(1);
    expect(towerNextStep(s, 1)).toMatchObject({ kind: 'battle', floor: 2, stamina: floorInfo(2).stamina });
    const { s: s1, out } = run(s, (d, c) => continueTower(d, c, 1));
    expect(out.floor).toBe(2);
    expect(s1.player.stamina).toBe(50 - floorInfo(2).stamina);
  });

  it('opens an unopened treasure floor on the way, then starts the next battle', () => {
    const s = at(2);
    const step = towerNextStep(s, 2);
    expect(step).toMatchObject({ kind: 'battle', floor: 4, treasure: 3 });
    expect(step.stamina).toBe(floorInfo(3).stamina + floorInfo(4).stamina);
    const { s: s1, out } = run(s, (d, c) => continueTower(d, c, 2));
    expect(out.floor).toBe(4);
    expect(s1.tower.highestCleared).toBe(3);
  });

  it('skips cleared treasure / event / merchant floors and sends choice floors to the tower screen', () => {
    // replaying 7F when 8F (event) and 9F (merchant) are already cleared → 10F boss
    expect(towerNextStep(at(12), 7)).toMatchObject({ kind: 'battle', floor: 10 });
    // 8F event not cleared yet → needs the tower screen
    expect(towerNextStep(at(7), 7)).toMatchObject({ kind: 'visit', floor: 8 });
    // 13F needs the seal quiz → tower screen
    expect(towerNextStep(at(12), 12)).toMatchObject({ kind: 'visit', floor: 13 });
  });

  it('is atomic: without enough stamina nothing is spent (treasure stays closed)', () => {
    const s = at(2, 0);
    const r = (() => {
      try {
        run(s, (d, c) => continueTower(d, c, 2));
        return 'ok';
      } catch (e) {
        return (e as Error).message;
      }
    })();
    expect(r).toContain('기력이 부족');
    expect(s.tower.highestCleared).toBe(2);
  });

  it('respects sealed floors', () => {
    const s = produce(at(20), (d) => void (d.player.totalExp = 0));
    expect(towerNextStep(s, 20).kind).toBe('locked');
  });
});
