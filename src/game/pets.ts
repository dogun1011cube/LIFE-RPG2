import { getItem, ITEMS } from '../data/items';
import type { PetKind, PetRarity } from '../data/pets';
import { CHAR_GACHA, ELEMENTAL_PETS, nextPetRarity, PET_FUSIONS, PET_GACHA, PET_MERGE_COUNT, PET_RARITIES, PET_RARITY_INFO, PETS } from '../data/pets';
import type { Ctx } from './core';
import { addItem, GameError, sfx, spendGold, toast } from './core';
import { pick, uid as makeUid, weighted } from './rng';
import type { GachaRecord, GameState, PetEntry, Rarity } from './types';
import { RARITIES } from './types';

// ─────────────────────────────────────────────────────────────
// Pets: ownership, active pet, 3→1 merging, Secret fusions,
// and the two new summon banners (pets, characters).
// ─────────────────────────────────────────────────────────────

export function petLabel(p: Pick<PetEntry, 'kind' | 'rarity'>) {
  return `${PET_RARITY_INFO[p.rarity].ko} ${PETS[p.kind].name}`;
}

export function addPet(s: GameState, ctx: Ctx | null, kind: PetKind, rarity: PetRarity): PetEntry {
  const pet: PetEntry = { uid: makeUid('pet'), kind, rarity, obtainedAt: ctx?.now ?? Date.now() };
  s.pets.push(pet);
  // the first pet joins right away
  if (!s.player.activePet) s.player.activePet = pet.uid;
  return pet;
}

export function activePet(s: GameState): PetEntry | null {
  return s.pets.find((p) => p.uid === s.player.activePet) ?? null;
}

export function setActivePet(s: GameState, ctx: Ctx, uid: string | null) {
  if (uid && !s.pets.some((p) => p.uid === uid)) throw new GameError('펫을 찾을 수 없습니다.');
  s.player.activePet = uid;
  if (uid) {
    const p = s.pets.find((x) => x.uid === uid)!;
    toast(ctx, 'info', 'PET', `${petLabel(p)}이(가) 함께합니다!`);
    sfx(ctx, 'confirm');
  }
}

export function togglePetLock(s: GameState, ctx: Ctx, uid: string) {
  const p = s.pets.find((x) => x.uid === uid);
  if (!p) throw new GameError('펫을 찾을 수 없습니다.');
  p.locked = !p.locked;
  sfx(ctx, 'click');
}

/** Pets that may be used as merge / fusion material (not active, not locked). */
export function petMaterials(s: GameState): PetEntry[] {
  return s.pets.filter((p) => p.uid !== s.player.activePet && !p.locked);
}

export interface PetMergeCheck {
  ok: boolean;
  reason?: string;
  kind?: PetKind;
  from?: PetRarity;
  to?: PetRarity;
}

export function checkPetMerge(s: GameState, uids: string[]): PetMergeCheck {
  if (uids.length !== PET_MERGE_COUNT || new Set(uids).size !== PET_MERGE_COUNT) return { ok: false, reason: `같은 정령·같은 등급 펫 ${PET_MERGE_COUNT}마리를 골라 주세요.` };
  const pets = uids.map((u) => s.pets.find((p) => p.uid === u));
  if (pets.some((p) => !p)) return { ok: false, reason: '펫을 찾을 수 없습니다.' };
  if (pets.some((p) => p!.uid === s.player.activePet)) return { ok: false, reason: '함께하는 중인 펫은 합성할 수 없어요. (다른 펫을 먼저 출전시키세요)' };
  if (pets.some((p) => p!.locked)) return { ok: false, reason: '잠긴 펫은 합성할 수 없어요.' };
  const { kind, rarity } = pets[0]!;
  if (pets.some((p) => p!.kind !== kind || p!.rarity !== rarity)) return { ok: false, reason: '같은 정령, 같은 등급끼리만 합성할 수 있어요.' };
  const to = nextPetRarity(rarity);
  if (!to) return { ok: false, reason: rarity === 'mythic' ? '신화 등급은 다른 정령과 융합해 천사·악마로 만들 수 있어요.' : '더 이상 합성할 수 없는 등급입니다.' };
  return { ok: true, kind, from: rarity, to };
}

/** 3 same pets → 1 pet of the next grade. Returns the new pet. */
export function mergePets(s: GameState, ctx: Ctx, uids: string[]): PetEntry {
  const chk = checkPetMerge(s, uids);
  if (!chk.ok) throw new GameError(chk.reason);
  s.pets = s.pets.filter((p) => !uids.includes(p.uid));
  const pet = addPet(s, ctx, chk.kind!, chk.to!);
  s.stats.petMerges += 1;
  toast(ctx, 'item', 'PET MERGE!', `${PETS[chk.kind!].name} ${PET_RARITY_INFO[chk.from!].ko} ×3 → ${PET_RARITY_INFO[chk.to!].ko}`);
  sfx(ctx, PET_RARITIES.indexOf(chk.to!) >= 4 ? 'gachaLegend' : 'gachaRare');
  return pet;
}

/** Merges every available trio, lowest grades first (chains upward). Returns the new pets. */
export function mergeAllPets(s: GameState, ctx: Ctx): PetEntry[] {
  const made: PetEntry[] = [];
  for (let guard = 0; guard < 500; guard++) {
    let did = false;
    for (const r of PET_RARITIES.slice(0, 5)) {
      for (const k of ELEMENTAL_PETS) {
        const trio = petMaterials(s).filter((p) => p.kind === k && p.rarity === r).slice(0, PET_MERGE_COUNT);
        if (trio.length === PET_MERGE_COUNT) {
          made.push(mergePets(s, ctx, trio.map((p) => p.uid)));
          did = true;
        }
      }
    }
    if (!did) break;
  }
  if (!made.length) throw new GameError('합성할 수 있는 펫 3마리 묶음이 없어요.');
  return made;
}

/** Mythic pets that a Secret fusion would use (one per required spirit), or null if missing. */
export function fusionMaterials(s: GameState, result: PetKind): PetEntry[] | null {
  const f = PET_FUSIONS.find((x) => x.result === result);
  if (!f) return null;
  const mats = petMaterials(s);
  const picked = f.needs.map((k) => mats.find((p) => p.kind === k && p.rarity === 'mythic'));
  return picked.every(Boolean) ? (picked as PetEntry[]) : null;
}

/** Mythic Undine + Bell + Licht → Angel, Mythic Salamander + Yami + Zagred → Devil (Secret). */
export function fusePets(s: GameState, ctx: Ctx, result: PetKind): PetEntry {
  const mats = fusionMaterials(s, result);
  const f = PET_FUSIONS.find((x) => x.result === result);
  if (!f) throw new GameError('융합할 수 없는 펫입니다.');
  if (!mats) throw new GameError(`신화 등급 ${f.needs.map((k) => PETS[k].name).join(' · ')}이(가) 한 마리씩 필요해요. (출전·잠금 중인 펫 제외)`);
  const ids = mats.map((p) => p.uid);
  s.pets = s.pets.filter((p) => !ids.includes(p.uid));
  const pet = addPet(s, ctx, result, 'secret');
  s.stats.petMerges += 1;
  toast(ctx, 'item', 'SECRET FUSION!!', `${PETS[result].name} 강림! (${f.needs.map((k) => PETS[k].name).join(' + ')})`);
  sfx(ctx, 'gachaLegend');
  return pet;
}

// ── Pet summon ───────────────────────────────────────────────
export interface PetPullResult {
  kind: PetKind;
  rarity: PetRarity;
  uid: string;
  pity?: boolean;
}

export function petGachaPull(s: GameState, ctx: Ctx, count: 1 | 10): PetPullResult[] {
  spendGold(s, count === 10 ? PET_GACHA.multi : PET_GACHA.single);
  const out: PetPullResult[] = [];
  for (let i = 0; i < count; i++) {
    let rarity: Rarity = weighted(ctx.rng, PET_GACHA.rates);
    let pity = false;
    if (s.gacha.petPity + 1 >= PET_GACHA.pity && RARITIES.indexOf(rarity) < RARITIES.indexOf('epic')) {
      rarity = 'epic';
      pity = true;
    }
    // 10-pull: at least one Rare or better
    if (count === 10 && i === 9 && !out.some((r) => PET_RARITIES.indexOf(r.rarity) >= 2) && RARITIES.indexOf(rarity) < 2) rarity = 'rare';
    if (RARITIES.indexOf(rarity) >= RARITIES.indexOf('epic')) s.gacha.petPity = 0;
    else s.gacha.petPity += 1;
    const kind = pick(ctx.rng, ELEMENTAL_PETS);
    const pet = addPet(s, ctx, kind, rarity);
    const rec: GachaRecord = { at: ctx.now, itemId: 'pet:' + kind, rarity, banner: 'pet' };
    s.gacha.history.unshift(rec);
    out.push({ kind, rarity, uid: pet.uid, pity });
  }
  s.gacha.history = s.gacha.history.slice(0, 200);
  s.gacha.petPulls += count;
  s.gacha.pulls += count;
  s.day.gachaPulls += count;
  return out;
}

// ── Character summon ─────────────────────────────────────────
/** Consolation prizes of the character banner (when no character appears). */
export const CHAR_CONSOLATION: [string, number][] = [
  ['p_mid', 26],
  ['p_mana2', 18],
  ['x_power', 10],
  ['x_iron', 10],
  ['s_focus', 10],
  ['d_stamina', 14],
  ['chest_bronze', 7],
  ['d_tome', 5],
];

export interface CharPullResult {
  itemId: string;
  character: boolean;
  pity?: boolean;
}

export function unownedCharacters(s: GameState) {
  return ITEMS.filter((i) => i.category === 'character' && i.character && !s.ownedCharacters.includes(i.character));
}

export function charGachaPull(s: GameState, ctx: Ctx, count: 1 | 10): CharPullResult[] {
  if (!unownedCharacters(s).length) throw new GameError('이미 모든 캐릭터를 보유하고 있어요!');
  spendGold(s, count === 10 ? CHAR_GACHA.multi : CHAR_GACHA.single);
  const out: CharPullResult[] = [];
  for (let i = 0; i < count; i++) {
    const unowned = unownedCharacters(s);
    const pity = unowned.length > 0 && s.gacha.charPity + 1 >= CHAR_GACHA.pity;
    let itemId: string;
    let character = false;
    if (unowned.length && (pity || ctx.rng() * 100 < CHAR_GACHA.rate)) {
      itemId = pick(ctx.rng, unowned).id;
      character = true;
      s.gacha.charPity = 0;
    } else {
      itemId = weighted(ctx.rng, CHAR_CONSOLATION);
      if (unowned.length) s.gacha.charPity += 1;
    }
    const res = addItem(s, itemId, 1, ctx, false);
    s.gacha.history.unshift({ at: ctx.now, itemId, rarity: getItem(itemId).rarity, converted: res.converted, banner: 'char' });
    out.push({ itemId, character, pity: character && pity });
    if (character) toast(ctx, 'item', 'NEW CHARACTER!', getItem(itemId).name.replace('캐릭터: ', ''));
  }
  s.gacha.history = s.gacha.history.slice(0, 200);
  s.gacha.charPulls += count;
  s.gacha.pulls += count;
  s.day.gachaPulls += count;
  return out;
}
