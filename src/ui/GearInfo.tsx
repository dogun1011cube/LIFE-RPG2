import { useMemo, useState } from 'react';
import { ACC_KIND_ORDER, ACC_KINDS } from '../data/accessories';
import { ARMOR_MATERIAL_ORDER, ARMOR_MATERIALS, ARMOR_SLOTS, armorSetBonuses } from '../data/armor';
import { ITEMS, RARITY_INFO, SLOT_LABEL } from '../data/items';
import { stageReqText } from '../data/ranks';
import { WEAPON_KIND_ORDER, WEAPON_KINDS } from '../data/weapons';
import { equippedDefs } from '../game/progression';
import type { EquipSlot, GameState, IconId, ItemDef, StatBlock } from '../game/types';
import { RARITIES } from '../game/types';
import { ItemSlot, PixelIcon, RarityText } from './components';

// ─────────────────────────────────────────────────────────────
// Shared UI for equipment families:
//   weapons → kind (계열), helmet/armor/gloves/boots → material (소재, set bonus),
//   accessories → kind (종류).
// ─────────────────────────────────────────────────────────────

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
  dodge: '회피%',
  dmgReduce: '받는 피해 감소%',
  hpPct: 'HP%',
  mpPct: 'MP%',
  defPct: 'DEF%',
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
  dodge: '회피',
  dmgReduce: '받는 피해 감소',
  hpPct: '최대 HP',
  mpPct: '최대 MP',
  defPct: '방어력',
};

/** "치명 피해 +10% · 모든 피해 +3%" */
export function statText(block: StatBlock): string {
  return (Object.entries(block) as [keyof StatBlock, number][])
    .map(([k, v]) => (PCT_TEXT[k] ? `${PCT_TEXT[k]} ${v > 0 ? '+' : ''}${v}%` : `${STAT_NAMES[k]} ${v > 0 ? '+' : ''}${v}`))
    .join(' · ');
}

// ── families ─────────────────────────────────────────────────
export type GearTab = 'weapon' | 'helmet' | 'armor' | 'gloves' | 'boots' | 'accessory';
export const GEAR_TABS: GearTab[] = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'accessory'];

export interface FamilyOpt {
  id: string;
  ko: string;
  en: string;
  icon: IconId;
  /** Effect summary (tooltip / headers). */
  effect: string;
}

function setText(material: keyof typeof ARMOR_MATERIALS) {
  return ARMOR_MATERIALS[material].sets.map(([n, b]) => `${n}세트: ${statText(b)}`).join(' / ');
}

export function familiesFor(slot: EquipSlot | GearTab): FamilyOpt[] {
  if (slot === 'weapon') return WEAPON_KIND_ORDER.map((k) => ({ id: k, ko: WEAPON_KINDS[k].ko, en: WEAPON_KINDS[k].en, icon: WEAPON_KINDS[k].icon, effect: statText(WEAPON_KINDS[k].passive) }));
  if (slot === 'accessory') return ACC_KIND_ORDER.map((k) => ({ id: k, ko: ACC_KINDS[k].ko, en: ACC_KINDS[k].en, icon: ACC_KINDS[k].icon, effect: statText(ACC_KINDS[k].passive) }));
  return ARMOR_MATERIAL_ORDER.map((m) => ({ id: m, ko: ARMOR_MATERIALS[m].ko, en: ARMOR_MATERIALS[m].en, icon: ARMOR_MATERIALS[m].icon, effect: setText(m) }));
}

export function familyOf(def: ItemDef): string | undefined {
  return def.kind ?? def.material ?? def.accKind;
}

export function familyInfo(def: ItemDef): FamilyOpt | undefined {
  const f = familyOf(def);
  return f && def.slot ? familiesFor(def.slot).find((o) => o.id === f) : undefined;
}

/** "한손검" / "천 투구" / "반지" */
export function familyLabel(def: ItemDef): string {
  const f = familyInfo(def);
  if (!f) return def.slot ? SLOT_LABEL[def.slot] : '';
  if (def.material) return `${f.ko} ${SLOT_LABEL[def.slot!]}`;
  return f.ko;
}

export function FamilyBadge({ def }: { def: ItemDef }) {
  const f = familyInfo(def);
  if (!f) return <>{def.slot ? SLOT_LABEL[def.slot] : ''}</>;
  return (
    <span className="kind-badge" title={`${f.ko}: ${f.effect}`}>
      <PixelIcon icon={f.icon} tint="#dbe4ff" size={12} /> {familyLabel(def)}
    </span>
  );
}

/** Box describing an item's family effect (weapon kind / armor set / accessory kind). */
export function GearFamilyLine({ def, s }: { def: ItemDef; s?: GameState }) {
  if (def.kind) {
    const k = WEAPON_KINDS[def.kind];
    return (
      <div className="kind-line">
        <PixelIcon icon={k.icon} tint="#ffd43b" size={20} />
        <div className="grow">
          <div className="small">
            <b className="gold-t">{k.ko}</b> 계열 효과 <span className="tiny muted">(강화와 무관하게 항상 적용)</span>
          </div>
          <div className="small">{statText(k.passive)}</div>
          <div className="tiny dim">{k.desc}</div>
        </div>
      </div>
    );
  }
  if (def.accKind) {
    const k = ACC_KINDS[def.accKind];
    return (
      <div className="kind-line">
        <PixelIcon icon={k.icon} tint="#ffd43b" size={20} />
        <div className="grow">
          <div className="small">
            <b className="gold-t">{k.ko}</b> 종류 효과 <span className="tiny muted">(장신구 2칸 모두 같은 종류면 2번 적용)</span>
          </div>
          <div className="small">{statText(k.passive)}</div>
          <div className="tiny dim">{k.desc}</div>
        </div>
      </div>
    );
  }
  if (def.material) {
    const m = ARMOR_MATERIALS[def.material];
    const worn = s ? equippedDefs(s).filter((d) => d.material === def.material && d.slot !== 'accessory' && d.slot !== 'weapon').length : 0;
    return (
      <div className="kind-line">
        <PixelIcon icon={m.icon} tint="#ffd43b" size={20} />
        <div className="grow">
          <div className="small">
            <b className="gold-t">{m.ko}</b> 세트 효과 <span className="tiny muted">(투구·갑옷·장갑·신발 중 같은 소재 {s ? `· 현재 ${worn}/4 착용` : ''})</span>
          </div>
          {m.sets.map(([n, b]) => (
            <div key={n} className={`small ${worn >= n ? 'green-t' : 'dim'}`}>
              {n}세트: {statText(b)} {worn >= n ? '✔' : ''}
            </div>
          ))}
          <div className="tiny dim">{m.desc}</div>
        </div>
      </div>
    );
  }
  return null;
}

/** Active armor set bonuses of the player (status / inventory). */
export function SetBonusSummary({ s }: { s: GameState }) {
  const defs = equippedDefs(s).filter((d) => d.slot && (ARMOR_SLOTS as string[]).includes(d.slot));
  const sets = armorSetBonuses(defs);
  if (!sets.length) return <div className="tiny dim">세트 효과 없음 — 같은 소재 방어구 2개/4개를 입으면 세트 효과가 생겨요.</div>;
  return (
    <div className="set-summary">
      {sets.map((x) => (
        <span key={x.material} className={`set-chip ${x.active.length ? 'on' : ''}`} title={setText(x.material)}>
          <PixelIcon icon={ARMOR_MATERIALS[x.material].icon} tint={x.active.length ? '#3ddc84' : '#8d94c4'} size={12} />
          {ARMOR_MATERIALS[x.material].ko} {x.count}/4
          {x.active.length ? <b> {x.active.map((b) => statText(b)).join(' · ')}</b> : <span className="dim"> ({x.next}개부터)</span>}
        </span>
      ))}
    </div>
  );
}

/** Row of filter chips: 전체 + options. */
export function FilterChips({ options, value, onChange, counts, allLabel = '전체' }: { options: FamilyOpt[]; value: string; onChange: (k: string) => void; counts?: Record<string, string>; allLabel?: string }) {
  return (
    <div className="kind-filter">
      <button className={`kind-chip ${value === 'all' ? 'on' : ''}`} onClick={() => onChange('all')}>
        {allLabel}
        {counts?.all ? <span className="tiny"> {counts.all}</span> : null}
      </button>
      {options.map((o) => (
        <button key={o.id} className={`kind-chip ${value === o.id ? 'on' : ''}`} onClick={() => onChange(o.id)} title={`${o.ko}: ${o.effect}`}>
          <PixelIcon icon={o.icon} tint={value === o.id ? '#1a1c2c' : '#c5cbe8'} size={12} />
          {o.ko}
          {counts?.[o.id] ? <span className="tiny"> {counts[o.id]}</span> : null}
        </button>
      ))}
    </div>
  );
}

export const SLOT_OPTS: FamilyOpt[] = ARMOR_SLOTS.map((sl) => ({ id: sl, ko: SLOT_LABEL[sl], en: sl.toUpperCase(), icon: sl, effect: SLOT_LABEL[sl] }));

function sources(def: ItemDef): string[] {
  const out: string[] = [];
  if (def.shop) out.push(def.minRank ? `상점 (${stageReqText(def.minRank)})` : '상점');
  if (def.loot) out.push('몬스터 드롭 · 보물상자');
  if (def.gacha) out.push('소환 · 합성');
  if (def.unique) out.push('탑 특별 보상');
  return out;
}

const TAB_LABEL: Record<GearTab, string> = { weapon: '무기', helmet: '투구', armor: '갑옷', gloves: '장갑', boots: '신발', accessory: '장신구' };
const BY_TAB: Record<GearTab, ItemDef[]> = Object.fromEntries(GEAR_TABS.map((t) => [t, ITEMS.filter((i) => i.category === 'equipment' && i.slot === t)])) as Record<GearTab, ItemDef[]>;
export const ALL_GEAR = GEAR_TABS.flatMap((t) => BY_TAB[t]);

/** Equipment codex: every piece of equipment by slot and family, discovered ones revealed. */
export function GearCodex({ s }: { s: GameState }) {
  const [tab, setTab] = useState<GearTab>('weapon');
  const [fam, setFam] = useState<string>('all');
  const [sel, setSel] = useState<string | null>(null);
  const found = useMemo(() => new Set(s.discovered || []), [s.discovered]);
  const list = BY_TAB[tab];
  const fams = familiesFor(tab);
  const frac = (items: ItemDef[]) => `${items.filter((w) => found.has(w.id)).length}/${items.length}`;
  const counts = useMemo(() => {
    const c: Record<string, string> = { all: frac(list) };
    for (const f of fams) c[f.id] = frac(list.filter((w) => familyOf(w) === f.id));
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, tab]);
  const shown = fam === 'all' ? fams : fams.filter((f) => f.id === fam);
  const selDef = sel ? ALL_GEAR.find((w) => w.id === sel) ?? null : null;
  const selFound = selDef ? found.has(selDef.id) : false;

  return (
    <div className="codex">
      <div className="row between wrap">
        <span className="small">
          장비 도감 <b className="gold-t">{frac(ALL_GEAR)}</b> <span className="tiny muted">— 한 번이라도 얻은 장비가 기록돼요.</span>
        </span>
      </div>
      <div className="codex-tabs">
        {GEAR_TABS.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'on' : ''}`}
            onClick={() => {
              setTab(t);
              setFam('all');
              setSel(null);
            }}
          >
            {TAB_LABEL[t]} <span className="tiny">{frac(BY_TAB[t])}</span>
          </button>
        ))}
      </div>
      <FilterChips options={fams} value={fam} onChange={setFam} counts={counts} />
      <div className="codex-groups">
        {shown.map((f) => {
          const items = list.filter((w) => familyOf(w) === f.id).sort((a, b) => (a.level || 0) - (b.level || 0) || RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity));
          if (!items.length) return null;
          return (
            <div key={f.id} className="codex-group">
              <div className="codex-head">
                <PixelIcon icon={f.icon} tint="#ffd43b" size={16} />
                <b>{f.ko}</b>
                <span className="tiny muted">{f.en}</span>
                <span className="tiny blue-t">{f.effect}</span>
                <span className="grow" />
                <span className="tiny muted">{counts[f.id]}</span>
              </div>
              <div className="codex-grid">
                {items.map((w) =>
                  found.has(w.id) ? (
                    <ItemSlot key={w.id} item={w} size={44} selected={sel === w.id} onClick={() => setSel(w.id)} />
                  ) : (
                    <div key={w.id} className={`slot unknown rc-${w.rarity} ${sel === w.id ? 'sel' : ''}`} style={{ width: 44, height: 44 }} onClick={() => setSel(w.id)} title="미발견 장비" role="button" tabIndex={0}>
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
            {selFound ? (
              <ItemSlot item={selDef} size={52} />
            ) : (
              <div className={`slot unknown rc-${selDef.rarity}`} style={{ width: 52, height: 52 }}>
                <PixelIcon icon={selDef.icon} tint="#2b3057" size={40} />
                <span className="q">?</span>
              </div>
            )}
            <div className="grow">
              <div>
                <RarityText rarity={selDef.rarity}>{selFound ? selDef.name : '???'}</RarityText>{' '}
                <span className="tiny muted">
                  {RARITY_INFO[selDef.rarity].ko} · {familyLabel(selDef)} · 권장 Lv {selDef.level ?? 1}
                </span>
              </div>
              <div className="tiny">{selFound ? selDef.desc : '아직 얻지 못한 장비입니다.'}</div>
              {selFound && selDef.stats && <div className="tiny blue-t">{statText(selDef.stats)}</div>}
              <div className="tiny dim">획득처: {sources(selDef).join(' / ') || '알 수 없음'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
