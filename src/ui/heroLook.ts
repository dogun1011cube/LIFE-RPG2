import { getCharacter } from '../data/characters';
import { getItem, RARITY_INFO } from '../data/items';
import type { HeroSpriteId } from '../render/sprites';
import type { GameState } from '../game/types';
import { shade } from '../render/draw';

/** Sprite palette of the hero, derived from equipped gear & cosmetics. */
export function heroSprite(s: GameState): HeroSpriteId {
  return getCharacter(s.player.activeCharacter).sprite;
}

export function heroPalette(s: GameState): Record<string, string> {
  const ch = getCharacter(s.player.activeCharacter);
  if (ch.sprite !== 'hero') {
    // other characters keep their own look; only the cape cosmetic is applied
    const own: Record<string, string> = { ...(ch.palette || {}) };
    if (s.player.cosmetics.cape) {
      const cos = getItem(s.player.cosmetics.cape).cosmetic;
      if (cos) own.c = cos.value;
    }
    return own;
  }
  const pal: Record<string, string> = {};
  const eq = (pos: keyof GameState['player']['equipment']) => {
    const uid = s.player.equipment[pos];
    if (!uid) return null;
    const e = s.inventory.find((x) => x.uid === uid);
    return e ? getItem(e.itemId) : null;
  };
  const armor = eq('armor');
  if (armor) {
    const c = armor.tint || RARITY_INFO[armor.rarity].color;
    pal.a = c;
    pal.A = shade(c, -0.35);
  }
  const weapon = eq('weapon');
  if (weapon) {
    pal.m = weapon.rarity === 'common' ? weapon.tint || '#dee2e6' : RARITY_INFO[weapon.rarity].color;
    if (weapon.rarity === 'mythic') pal.m = '#ff4d6d';
  }
  const helmet = eq('helmet');
  if (helmet) pal.h = helmet.tint || RARITY_INFO[helmet.rarity].color;
  const boots = eq('boots');
  if (boots) pal.b = boots.tint || RARITY_INFO[boots.rarity].color;
  const gloves = eq('gloves');
  if (gloves) pal.l = shade(gloves.tint || RARITY_INFO[gloves.rarity].color, -0.3);
  if (s.player.cosmetics.cape) {
    const cos = getItem(s.player.cosmetics.cape).cosmetic;
    if (cos) pal.c = cos.value;
  }
  return pal;
}

export function heroAura(s: GameState): string | null {
  const id = s.player.cosmetics.aura;
  return id ? getItem(id).cosmetic?.value ?? null : null;
}

export function heroTitle(s: GameState): string | null {
  const id = s.player.cosmetics.title;
  return id ? getItem(id).cosmetic?.value ?? null : null;
}
