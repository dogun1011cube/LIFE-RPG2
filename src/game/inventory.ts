import { getItem, itemValue, RARITY_INFO } from '../data/items';
import { CHESTS } from '../data/world';
import type { Ctx } from './core';
import { addItem, clampVitals, GameError, gainExp, gainGold, gainStamina, isEquipped, removeEntry, sfx, spendGold, toast } from './core';
import { deriveStats } from './progression';
import { randInt, weighted } from './rng';
import { rollItemOfRarity } from './loot';
import type { EquipPosition, GameState, InventoryEntry } from './types';

export const MAX_PLUS = 10;
export const UPGRADE_RATES = [100, 95, 90, 80, 70, 60, 50, 40, 30, 20];

export function upgradeCost(entry: InventoryEntry) {
  const def = getItem(entry.itemId);
  const base = def.price || RARITY_INFO[def.rarity].value;
  return Math.ceil(Math.max(20, base * 0.22) * (entry.plus + 1));
}

export function sellPrice(entry: InventoryEntry) {
  return Math.max(1, Math.floor(itemValue(getItem(entry.itemId), entry.plus) * 0.4));
}

function entryOf(s: GameState, uid: string) {
  const e = s.inventory.find((x) => x.uid === uid);
  if (!e) throw new GameError('아이템을 찾을 수 없습니다.');
  return e;
}

export function positionsFor(slot: string): EquipPosition[] {
  return slot === 'accessory' ? ['acc1', 'acc2'] : [slot as EquipPosition];
}

export function equip(s: GameState, ctx: Ctx, uid: string, pos?: EquipPosition) {
  const e = entryOf(s, uid);
  const def = getItem(e.itemId);
  if (def.category !== 'equipment' || !def.slot) throw new GameError('장착할 수 없는 아이템입니다.');
  if (isEquipped(s, uid)) return;
  const positions = positionsFor(def.slot);
  const target = pos && positions.includes(pos) ? pos : positions.find((p) => !s.player.equipment[p]) ?? positions[0];
  s.player.equipment[target] = uid;
  clampVitals(s);
  toast(ctx, 'item', 'EQUIPPED', def.name);
  sfx(ctx, 'confirm');
}

export function unequip(s: GameState, ctx: Ctx, pos: EquipPosition) {
  const uid = s.player.equipment[pos];
  if (!uid) return;
  s.player.equipment[pos] = null;
  clampVitals(s);
  sfx(ctx, 'cancel');
}

export function sellItem(s: GameState, ctx: Ctx, uid: string, qty = 1) {
  const e = entryOf(s, uid);
  if (isEquipped(s, uid)) throw new GameError('장착 중인 아이템은 판매할 수 없습니다.');
  qty = Math.max(1, Math.min(qty, e.qty));
  const price = sellPrice(e) * qty;
  const def = getItem(e.itemId);
  removeEntry(s, uid, qty);
  gainGold(s, price);
  toast(ctx, 'gold', 'SOLD', `${def.name}${qty > 1 ? ' ×' + qty : ''} → +${price} G`);
  sfx(ctx, 'coin');
  return price;
}

export function upgradeItem(s: GameState, ctx: Ctx, uid: string): boolean {
  const e = entryOf(s, uid);
  const def = getItem(e.itemId);
  if (def.category !== 'equipment') throw new GameError('장비만 강화할 수 있습니다.');
  if (e.plus >= MAX_PLUS) throw new GameError('이미 최대 강화 단계입니다.');
  const cost = upgradeCost(e);
  spendGold(s, cost);
  const rate = UPGRADE_RATES[e.plus];
  const ok = ctx.rng() * 100 < rate;
  if (ok) {
    e.plus += 1;
    s.stats.upgradesSucceeded += 1;
    toast(ctx, 'item', 'UPGRADE SUCCESS', `${def.name} +${e.plus}`);
    sfx(ctx, 'upgradeOk');
  } else {
    toast(ctx, 'warn', 'UPGRADE FAILED', `${def.name} 강화 실패 (장비는 무사합니다)`);
    sfx(ctx, 'upgradeFail');
  }
  clampVitals(s);
  return ok;
}

export interface ChestResult {
  gold: number;
  items: string[];
}

export function openChest(s: GameState, ctx: Ctx, tier: 'bronze' | 'silver' | 'gold'): ChestResult {
  const cfg = CHESTS[tier];
  const gold = gainGold(s, randInt(ctx.rng, cfg.gold[0], cfg.gold[1]), true);
  const items: string[] = [];
  for (let i = 0; i < cfg.items; i++) {
    let rarity = weighted(ctx.rng, cfg.weights);
    if (i === 0 && cfg.guarantee && !cfg.guarantee.includes(rarity)) rarity = cfg.guarantee[0];
    const it = rollItemOfRarity(ctx.rng, rarity, { gacha: true });
    addItem(s, it.id, 1, ctx, false);
    items.push(it.id);
  }
  s.stats.chestsOpened += 1;
  return { gold, items };
}

export interface UseResult {
  kind: string;
  text: string;
  chest?: ChestResult;
}

/** Uses a consumable outside of battle. */
export function useItem(s: GameState, ctx: Ctx, uid: string): UseResult {
  const e = entryOf(s, uid);
  const def = getItem(e.itemId);
  const u = def.use;
  if (!u) throw new GameError('사용할 수 없는 아이템입니다.');
  const d = deriveStats(s);
  let res: UseResult;
  switch (u.type) {
    case 'heal': {
      if (s.player.hp >= d.maxHp && s.player.mp >= d.maxMp) throw new GameError('HP와 MP가 이미 가득 찼습니다.');
      const hp0 = s.player.hp;
      const mp0 = s.player.mp;
      if (u.full) {
        s.player.hp = d.maxHp;
        s.player.mp = d.maxMp;
      } else {
        s.player.hp = Math.min(d.maxHp, s.player.hp + (u.hp || 0));
        s.player.mp = Math.min(d.maxMp, s.player.mp + (u.mp || 0));
      }
      res = { kind: 'heal', text: `HP +${s.player.hp - hp0} · MP +${s.player.mp - mp0}` };
      sfx(ctx, 'heal');
      break;
    }
    case 'stamina': {
      const g = gainStamina(s, u.amount, false);
      res = { kind: 'stamina', text: `기력 +${g}` };
      sfx(ctx, 'heal');
      break;
    }
    case 'studyBuff': {
      s.player.studyBuff.expPct = Math.max(s.player.studyBuff.expPct, u.expPct || 0);
      s.player.studyBuff.goldPct = Math.max(s.player.studyBuff.goldPct, u.goldPct || 0);
      res = { kind: 'buff', text: '다음 공부 기록에 보너스가 적용됩니다.' };
      sfx(ctx, 'buff');
      break;
    }
    case 'exp': {
      gainExp(s, u.amount, 'other');
      res = { kind: 'exp', text: `EXP +${u.amount}` };
      sfx(ctx, 'buff');
      break;
    }
    case 'chest': {
      const chest = openChest(s, ctx, u.tier);
      res = { kind: 'chest', text: `+${chest.gold} G`, chest };
      sfx(ctx, 'chest');
      break;
    }
    case 'realReward': {
      if (s.realReward && s.realReward.until > ctx.now) throw new GameError('이미 진행 중인 보상 타이머가 있습니다.');
      s.realReward = { name: u.label, startedAt: ctx.now, until: ctx.now + u.minutes * 60000 };
      res = { kind: 'reward', text: `${u.label} ${u.minutes}분 타이머 시작!` };
      sfx(ctx, 'confirm');
      break;
    }
    default:
      throw new GameError('전투 중에만 사용할 수 있습니다.');
  }
  removeEntry(s, uid, 1);
  s.stats.itemsUsed += 1;
  toast(ctx, 'item', `USED: ${def.name}`, res.text);
  return res;
}

export function setCosmetic(s: GameState, ctx: Ctx, kind: 'title' | 'cape' | 'aura', itemId: string | null) {
  if (itemId && !s.ownedCosmetics.includes(itemId)) throw new GameError('보유하지 않은 외형입니다.');
  s.player.cosmetics[kind] = itemId;
  sfx(ctx, 'confirm');
}
