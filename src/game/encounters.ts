import { getMonster, MONSTERS } from '../data/monsters';
import { getLocation } from '../data/world';
import { rankAtLeast } from '../data/ranks';
import type { BattleSetup, BattleState, MonsterInstance } from './battle';
import { spawnMonster, totalRewards } from './battle';
import type { Ctx } from './core';
import { addItem, GameError, gainExp, gainGold, recordMonsterSeen, sfx } from './core';
import { rollDrop, rollItemOfRarity } from './loot';
import { deriveStats, unlockStage } from './progression';
import { pick, randInt } from './rng';
import { clearFloor, floorAccess, floorInfo, isCleared } from './tower';
import type { GameState } from './types';

function requireAwake(s: GameState) {
  if (s.day.status === 'sleeping') throw new GameError('잠든 상태에서는 전투할 수 없어요. 먼저 일어나세요!');
}

function payStamina(s: GameState, cost: number) {
  if (s.player.stamina < cost) throw new GameError(`기력이 부족합니다. (필요 ${cost}, 보유 ${s.player.stamina}) — 공부 10분마다 기력 1을 얻어요.`);
  s.player.stamina -= cost;
}

function ensureHp(s: GameState) {
  if (s.player.hp <= 0) s.player.hp = 1;
}

export function locationUnlocked(s: GameState, id: string): boolean {
  const loc = getLocation(id);
  if (!loc.unlock) return true;
  if (loc.unlock.rank && !rankAtLeast(unlockStage(s), loc.unlock.rank)) return false;
  if (loc.unlock.floor && s.tower.highestCleared < loc.unlock.floor) return false;
  return true;
}

export function towerBattleCost(s: GameState, f: number) {
  return floorInfo(f).stamina;
}

export function startTowerBattle(s: GameState, ctx: Ctx, f: number, opts: { seals?: number } = {}): BattleSetup {
  requireAwake(s);
  const acc = floorAccess(s, f);
  if (!acc.ok) throw new GameError(acc.reason);
  const info = floorInfo(f);
  if (!info.waves.length) throw new GameError('이 층에는 전투가 없습니다.');
  payStamina(s, info.stamina);
  ensureHp(s);
  const weaken = f === 13 ? Math.min(3, opts.seals || 0) * 0.12 : 0;
  const waves = info.waves.map((id, i) => {
    // floor 4: the first two spirits are one level lower than the Reaper
    const lv = info.level + (info.type === 'boss' && f >= 20 ? 1 : 0) - (f === 4 && i < info.waves.length - 1 ? 1 : 0);
    return spawnMonster(id, lv, { elite: info.elite, weaken });
  });
  waves.forEach((m) => recordMonsterSeen(s, m.defId, m.level, ctx.now));
  sfx(ctx, 'door');
  return {
    kind: 'tower',
    locationId: 'tower',
    title: `${info.name} — ${info.zone}`,
    floor: f,
    waves,
    canEscape: info.canEscape,
    bg: info.bg,
    staminaSpent: info.stamina,
    firstClear: !isCleared(s, f),
    modifiers: { curse4: f === 4, doom13: f === 13, seals: opts.seals },
  };
}

export function startFieldBattle(s: GameState, ctx: Ctx, locationId: string): BattleSetup {
  requireAwake(s);
  const loc = getLocation(locationId);
  if (!locationUnlocked(s, locationId)) throw new GameError(loc.unlock?.text || '잠겨 있습니다.');
  const d = deriveStats(s);
  let waves: MonsterInstance[];
  let canEscape = true;
  if (loc.kind === 'training') {
    waves = [spawnMonster('dummy', d.level)];
  } else if (loc.kind === 'arena') {
    payStamina(s, loc.stamina);
    const pool = MONSTERS.filter((m) => !m.boss && m.family !== 'dummy' && !m.elite);
    const lv = d.level + 1;
    waves = [spawnMonster(pick(ctx.rng, pool).id, lv, { elite: true })];
  } else {
    payStamina(s, loc.stamina);
    const [lo, hi] = loc.levelRange!;
    const lv = Math.max(lo, Math.min(hi, d.level - 2 + randInt(ctx.rng, -1, 1)));
    let pool = loc.pool!;
    if (locationId === 'forest' && lv < 5) pool = pool.filter((id) => id !== 'slime_red');
    let id = pick(ctx.rng, pool);
    if (locationId === 'forest' && ctx.rng() < 0.03) id = 'slime_king';
    waves = [spawnMonster(id, lv)];
    if (getMonster(id).elite) canEscape = true;
  }
  ensureHp(s);
  if (loc.kind !== 'training') waves.forEach((m) => recordMonsterSeen(s, m.defId, m.level, ctx.now));
  return {
    kind: loc.kind === 'training' ? 'training' : loc.kind === 'arena' ? 'arena' : 'field',
    locationId,
    title: loc.name,
    waves,
    canEscape,
    bg: loc.bg,
    staminaSpent: loc.kind === 'training' ? 0 : loc.stamina,
    modifiers: {},
  };
}

export interface BattleResult {
  outcome: 'victory' | 'defeat' | 'escape';
  exp: number;
  gold: number;
  items: string[];
  lines: string[];
  floor?: number;
  firstClear: boolean;
  newBosses: string[];
}

export function finishBattle(s: GameState, ctx: Ctx, b: BattleState): BattleResult {
  const outcome = b.over ?? 'escape';
  const res: BattleResult = { outcome, exp: 0, gold: 0, items: [], lines: [], floor: b.setup.floor, firstClear: false, newBosses: [] };
  const kind = b.setup.kind;
  if (kind === 'training') {
    res.lines.push(`훈련 결과: 총 피해 ${b.stats.dmgDealt.toLocaleString()} · 최대 ${b.stats.maxHit.toLocaleString()} · 치명타 ${b.stats.crits}회`);
    return res;
  }
  const d = deriveStats(s);
  s.player.mp = Math.max(0, Math.min(d.maxMp, b.player.mp));
  s.stats.criticalHits += b.stats.crits;
  s.stats.highestDamage = Math.max(s.stats.highestDamage, b.stats.maxHit);

  if (outcome === 'victory') {
    s.player.hp = Math.max(1, Math.min(d.maxHp, b.player.hp));
    const r = totalRewards(b);
    res.exp = gainExp(s, r.exp, 'battle');
    res.gold = gainGold(s, r.gold, true);
    if (b.stolenGold > 0) res.lines.push(`도둑맞은 ${b.stolenGold} G를 되찾았다!`);
    for (const m of b.defeated) {
      const def = getMonster(m.defId);
      const rec = (s.monsters[m.defId] ||= { seen: 1, defeated: 0 });
      rec.defeated += 1;
      s.stats.monstersDefeated += 1;
      s.day.monstersDefeated += 1;
      if (def.boss && !s.stats.bossesDefeated.includes(m.defId)) {
        s.stats.bossesDefeated.push(m.defId);
        res.newBosses.push(def.name);
      }
      const boost = def.boss ? 8 : m.elite ? 4 : kind === 'arena' ? 3 : 0;
      let drop = rollDrop(ctx.rng, m.level, d.luk, boost);
      if (!drop && def.boss) drop = rollItemOfRarity(ctx.rng, m.level >= 30 ? 'epic' : 'rare', { maxLevel: m.level + 12 });
      if (drop) {
        addItem(s, drop.id, 1, ctx, false);
        res.items.push(drop.id);
      }
    }
    s.stats.battlesWon += 1;
    s.day.battlesWon += 1;
    if (kind === 'tower' && b.setup.floor) {
      res.firstClear = b.setup.floor === s.tower.highestCleared + 1;
      res.lines.push(...clearFloor(s, ctx, b.setup.floor));
    }
    sfx(ctx, 'victory');
  } else if (outcome === 'defeat') {
    s.player.hp = Math.max(1, Math.round(d.maxHp * 0.25));
    s.stats.battlesLost += 1;
    if (b.stolenGold > 0) {
      const lost = Math.min(s.player.gold, b.stolenGold);
      s.player.gold -= lost;
      res.lines.push(`고블린이 ${lost} G를 가지고 도망쳤다…`);
    }
    res.lines.push('마을로 돌아와 정신을 차렸다. (HP 25%로 회복)');
    sfx(ctx, 'defeat');
  } else {
    s.player.hp = Math.max(1, Math.min(d.maxHp, b.player.hp));
    s.stats.escapes += 1;
    if (b.stolenGold > 0) {
      const lost = Math.min(s.player.gold, b.stolenGold);
      s.player.gold -= lost;
      res.lines.push(`도둑맞은 ${lost} G는 되찾지 못했다.`);
    }
  }
  return res;
}

/** Treasure floors: open the chest & clear. */
export function claimTreasureFloor(s: GameState, ctx: Ctx, f: number) {
  requireAwake(s);
  const info = floorInfo(f);
  if (info.type !== 'treasure') throw new GameError('보물 층이 아닙니다.');
  const acc = floorAccess(s, f);
  if (!acc.ok) throw new GameError(acc.reason);
  if (isCleared(s, f)) throw new GameError('이미 열어본 보물상자입니다.');
  payStamina(s, info.stamina);
  sfx(ctx, 'chest');
  return clearFloor(s, ctx, f);
}

/** Event / merchant floors: resolve and clear. */
export function passFloor(s: GameState, ctx: Ctx, f: number) {
  requireAwake(s);
  const info = floorInfo(f);
  if (info.type !== 'event' && info.type !== 'merchant') throw new GameError('통과할 수 없는 층입니다.');
  const acc = floorAccess(s, f);
  if (!acc.ok) throw new GameError(acc.reason);
  if (isCleared(s, f)) return [];
  payStamina(s, info.stamina);
  return clearFloor(s, ctx, f);
}
