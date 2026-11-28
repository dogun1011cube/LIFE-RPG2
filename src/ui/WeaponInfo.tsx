import { useMemo, useState } from 'react';
import { ITEMS, RARITY_INFO } from '../data/items';
import { stageReqText } from '../data/ranks';
import { WEAPON_KIND_ORDER, WEAPON_KINDS } from '../data/weapons';
import type { GameState, ItemDef, StatBlock, WeaponKind } from '../game/types';
import { RARITIES } from '../game/types';
import { ItemSlot, PixelIcon, RarityText } from './components';

/** Human-readable names for every stat key (used by stat lists and passives). */
export const STAT_NAMES: Record<keyof StatBlock, string> = {
  atk: 'ATK',
  def: 'DEF',
  matk: 'MATK',
  hp: 'HP',
  mp: 'MP',
  crit: 'CRIT%',
  str: 'STR',
  int: 'INT',
  dex: 'DEX',
  luk: 'LUK',
  expBonus: '공부 EXP%',
  goldBonus: '골드%',
  pierce: '방어 관통%',
  critDmg: '치명 피해%',
  lifesteal: '흡혈%',
  dmg: '모든 피해%',
  physDmg: '물리 피해%',
  magicDmg: '마법 피해%',
  fireDmg: '화염 피해%',
  poisonDmg: '독 피해%',
  holyDmg: '신성 피해%',
  mpSave: '스킬 MP 절약%',
};

const PCT_TEXT: Partial<Record<keyof StatBlock, string>> = {
  crit: '치명타',
  critDmg: '치명 피해',
  pierce: '방어 관통',
  lifesteal: '흡혈',
  dmg: '모든 피해',
  mpSave: '스킬 MP 절약',
  expBonus: '공부 EXP',
  goldBonus: '골드',
  physDmg: '물리 피해',
  magicDmg: '마법 피해',
  fireDmg: '화염 피해',
  poisonDmg: '독 피해',
  holyDmg: '신성 피해',
};

/** "치명 피해 +10% · 모든 피해 +3%" */
export function statText(block: StatBlock): string {
  return (Object.entries(block) as [keyof StatBlock, number][])
    .map(([k, v]) => (PCT_TEXT[k] ? `${PCT_TEXT[k]} ${v > 0 ? '+' : ''}${v}%` : `${STAT_NAMES[k]} ${v > 0 ? '+' : ''}${v}`))
    .join(' · ');
}

export function kindPassiveText(kind: WeaponKind) {
  return statText(WEAPON_KINDS[kind].passive);
}

export function KindBadge({ kind }: { kind: WeaponKind }) {
  const k = WEAPON_KINDS[kind];
  return (
    <span className="kind-badge" title={`${k.ko} 계열: ${kindPassiveText(kind)}`}>
      <PixelIcon icon={k.icon} tint="#dbe4ff" size={12} /> {k.ko}
    </span>
  );
}

/** Box describing a weapon's kind and its fixed passive. */
export function WeaponKindLine({ def }: { def: ItemDef }) {
  if (!def.kind) return null;
  const k = WEAPON_KINDS[def.kind];
  return (
    <div className="kind-line">
      <PixelIcon icon={k.icon} tint="#ffd43b" size={20} />
      <div className="grow">
        <div className="small">
          <b className="gold-t">{k.ko}</b> 계열 효과 <span className="tiny muted">(강화와 무관하게 항상 적용)</span>
        </div>
        <div className="small">{kindPassiveText(def.kind)}</div>
        <div className="tiny dim">{k.desc}</div>
      </div>
    </div>
  );
}

export const ALL_WEAPONS = ITEMS.filter((i) => i.slot === 'weapon');

/** Row of kind filter chips: 전체 + each kind. */
export function KindFilter({ value, onChange, counts }: { value: WeaponKind | 'all'; onChange: (k: WeaponKind | 'all') => void; counts?: Partial<Record<WeaponKind | 'all', string>> }) {
  return (
    <div className="kind-filter">
      <button className={`kind-chip ${value === 'all' ? 'on' : ''}`} onClick={() => onChange('all')}>
        전체{counts?.all ? <span className="tiny"> {counts.all}</span> : null}
      </button>
      {WEAPON_KIND_ORDER.map((k) => (
        <button key={k} className={`kind-chip ${value === k ? 'on' : ''}`} onClick={() => onChange(k)} title={`${WEAPON_KINDS[k].ko}: ${kindPassiveText(k)}`}>
          <PixelIcon icon={WEAPON_KINDS[k].icon} tint={value === k ? '#1a1c2c' : '#c5cbe8'} size={12} />
          {WEAPON_KINDS[k].ko}
          {counts?.[k] ? <span className="tiny"> {counts[k]}</span> : null}
        </button>
      ))}
    </div>
  );
}

function sources(def: ItemDef): string[] {
  const out: string[] = [];
  if (def.shop) out.push(def.minRank ? `상점 (${stageReqText(def.minRank)})` : '상점');
  if (def.loot) out.push('몬스터 드롭 · 보물상자');
  if (def.gacha) out.push('소환 · 합성');
  if (def.unique) out.push('탑 특별 보상');
  return out;
}

/** Weapon codex: every weapon grouped by kind, discovered ones revealed. */
export function WeaponCodex({ s }: { s: GameState }) {
  const [kind, setKind] = useState<WeaponKind | 'all'>('all');
  const [sel, setSel] = useState<string | null>(null);
  const found = useMemo(() => new Set(s.discovered || []), [s.discovered]);
  const counts = useMemo(() => {
    const c: Partial<Record<WeaponKind | 'all', string>> = {};
    c.all = `${ALL_WEAPONS.filter((w) => found.has(w.id)).length}/${ALL_WEAPONS.length}`;
    for (const k of WEAPON_KIND_ORDER) {
      const list = ALL_WEAPONS.filter((w) => w.kind === k);
      c[k] = `${list.filter((w) => found.has(w.id)).length}/${list.length}`;
    }
    return c;
  }, [found]);
  const kinds = kind === 'all' ? WEAPON_KIND_ORDER : [kind];
  const selDef = sel ? ALL_WEAPONS.find((w) => w.id === sel) ?? null : null;
  const selFound = selDef ? found.has(selDef.id) : false;

  return (
    <div className="codex">
      <div className="row between">
        <span className="small">
          무기 도감 <b className="gold-t">{counts.all}</b> <span className="tiny muted">— 한 번이라도 얻은 무기가 기록돼요.</span>
        </span>
      </div>
      <KindFilter value={kind} onChange={setKind} counts={counts} />
      <div className="codex-groups">
        {kinds.map((k) => {
          const list = ALL_WEAPONS.filter((w) => w.kind === k).sort((a, b) => (a.level || 0) - (b.level || 0) || RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity));
          return (
            <div key={k} className="codex-group">
              <div className="codex-head">
                <PixelIcon icon={WEAPON_KINDS[k].icon} tint="#ffd43b" size={16} />
                <b>{WEAPON_KINDS[k].ko}</b>
                <span className="tiny muted">{WEAPON_KINDS[k].en}</span>
                <span className="tiny blue-t">{kindPassiveText(k)}</span>
                <span className="grow" />
                <span className="tiny muted">{counts[k]}</span>
              </div>
              <div className="codex-grid">
                {list.map((w) =>
                  found.has(w.id) ? (
                    <ItemSlot key={w.id} item={w} size={44} selected={sel === w.id} onClick={() => setSel(w.id)} />
                  ) : (
                    <div key={w.id} className={`slot unknown rc-${w.rarity} ${sel === w.id ? 'sel' : ''}`} style={{ width: 44, height: 44 }} onClick={() => setSel(w.id)} title="미발견 무기" role="button" tabIndex={0}>
                      <PixelIcon icon={w.icon} tint="#2b3057" size={36} />
                      <span className="q">?</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selDef && (
        <div className="codex-detail">
          <div className="row">
            {selFound ? <ItemSlot item={selDef} size={52} /> : <div className={`slot unknown rc-${selDef.rarity}`} style={{ width: 52, height: 52 }}><PixelIcon icon={selDef.icon} tint="#2b3057" size={40} /><span className="q">?</span></div>}
            <div className="grow">
              <div>
                <RarityText rarity={selDef.rarity}>{selFound ? selDef.name : '???'}</RarityText>{' '}
                <span className="tiny muted">
                  {RARITY_INFO[selDef.rarity].ko} · {WEAPON_KINDS[selDef.kind!].ko} · 권장 Lv {selDef.level ?? 1}
                </span>
              </div>
              <div className="tiny">{selFound ? selDef.desc : '아직 얻지 못한 무기입니다.'}</div>
              {selFound && selDef.stats && <div className="tiny blue-t">{statText(selDef.stats)}</div>}
              <div className="tiny dim">획득처: {sources(selDef).join(' / ') || '알 수 없음'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
