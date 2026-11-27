import { useState } from 'react';
import { getItem, ITEMS, RARITY_INFO, SLOT_LABEL } from '../../data/items';
import { isEquipped } from '../../game/core';
import type { ChestResult } from '../../game/inventory';
import { equip, MAX_PLUS, positionsFor, sellItem, sellPrice, setCosmetic, unequip, upgradeCost, upgradeItem, UPGRADE_RATES, useItem } from '../../game/inventory';
import { scaledStats } from '../../game/progression';
import { RARITIES } from '../../game/types';
import type { EquipPosition, InventoryEntry } from '../../game/types';
import { act, useGame } from '../../store/store';
import { Btn, HeroSprite, ItemIcon, ItemSlot, Modal, PixelIcon, RarityText, Win } from '../components';
import { confirmDialog } from '../uiStore';
import { equippedFor, StatCompare } from './Shop';
import { SynthesisPanel } from './SynthesisPanel';

type Filter = 'all' | 'equipment' | 'consumable' | 'special' | 'cosmetic' | 'synth';

export function Inventory() {
  const s = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState<string | null>(null);
  const [chest, setChest] = useState<ChestResult | null>(null);

  const entries = s.inventory
    .filter((e) => filter === 'all' || filter === 'cosmetic' || filter === 'synth' || getItem(e.itemId).category === filter)
    .slice()
    .sort((a, b) => {
      const da = getItem(a.itemId);
      const db = getItem(b.itemId);
      const ea = isEquipped(s, a.uid) ? 1 : 0;
      const eb = isEquipped(s, b.uid) ? 1 : 0;
      if (ea !== eb) return eb - ea;
      if (da.category !== db.category) return da.category.localeCompare(db.category);
      return RARITIES.indexOf(db.rarity) - RARITIES.indexOf(da.rarity);
    });
  const selEntry: InventoryEntry | undefined = s.inventory.find((e) => e.uid === sel) ?? (filter !== 'cosmetic' && filter !== 'synth' ? entries[0] : undefined);
  const def = selEntry ? getItem(selEntry.itemId) : null;
  const eq = selEntry ? isEquipped(s, selEntry.uid) : false;
  const eqPos = selEntry ? (Object.entries(s.player.equipment).find(([, u]) => u === selEntry.uid)?.[0] as EquipPosition | undefined) : undefined;

  const doUse = () => {
    if (!selEntry) return;
    const r = act((d, c) => useItem(d, c, selEntry.uid));
    if (r.ok && r.value.chest) setChest(r.value.chest);
  };

  const cosmetics = ITEMS.filter((i) => i.category === 'cosmetic');
  const totalSlots = Math.max(30, Math.ceil((entries.length + 1) / 6) * 6);

  return (
    <div className="inventory">
      <div className="inv-left">
        <Win title="INVENTORY" sub={`가방 · ${s.inventory.length}종`} right={<span className="chip gold">{s.player.gold.toLocaleString()} G</span>}>
          <div className="tabs">
            {(
              [
                ['all', '전체'],
                ['equipment', '장비'],
                ['consumable', '소모품'],
                ['special', '특수'],
                ['cosmetic', '외형'],
                ['synth', '합성'],
              ] as [Filter, string][]
            ).map(([f, l]) => (
              <button key={f} className={`tab ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                {l}
              </button>
            ))}
          </div>
          {filter === 'synth' ? (
            <SynthesisPanel />
          ) : filter !== 'cosmetic' ? (
            <div className="inv-grid">
              {entries.map((e) => (
                <ItemSlot key={e.uid} item={e.itemId} qty={e.qty} plus={e.plus} equipped={isEquipped(s, e.uid)} selected={selEntry?.uid === e.uid} onClick={() => setSel(e.uid)} />
              ))}
              {Array.from({ length: totalSlots - entries.length }, (_, i) => (
                <div key={'e' + i} className="slot empty" />
              ))}
            </div>
          ) : (
            <div className="cos-list">
              {(['title', 'cape', 'aura'] as const).map((kind) => (
                <div key={kind} className="cos-group">
                  <div className="tiny muted">{kind === 'title' ? '칭호' : kind === 'cape' ? '망토' : '오라'}</div>
                  <div className="row wrap">
                    <button className={`cos-chip ${!s.player.cosmetics[kind] ? 'on' : ''}`} onClick={() => act((d, c) => setCosmetic(d, c, kind, null))}>
                      없음
                    </button>
                    {cosmetics
                      .filter((c) => c.cosmetic!.kind === kind)
                      .map((c) => {
                        const owned = s.ownedCosmetics.includes(c.id);
                        return (
                          <button key={c.id} className={`cos-chip ${s.player.cosmetics[kind] === c.id ? 'on' : ''}`} disabled={!owned} onClick={() => act((d, cx) => setCosmetic(d, cx, kind, c.id))} title={owned ? c.desc : '소환에서 획득 가능'}>
                            <ItemIcon item={c} size={18} />
                            <RarityText rarity={c.rarity}>{owned ? c.cosmetic!.value.startsWith('#') || c.cosmetic!.value === 'rainbow' ? c.name.replace(/^칭호: /, '') : c.cosmetic!.value : '???'}</RarityText>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
              <div className="tiny dim">외형 아이템은 소환의 제단(가챠)에서만 얻을 수 있어요.</div>
            </div>
          )}
        </Win>
      </div>

      <div className="inv-right">
        <Win title="EQUIPPED" sub="장착 장비">
          <div className="paper-doll">
            <div className="doll-hero">
              <HeroSprite state={s} scale={7} />
            </div>
            <div className="doll-slots">
              {(['weapon', 'helmet', 'armor', 'gloves', 'boots', 'acc1', 'acc2'] as EquipPosition[]).map((pos) => {
                const uid = s.player.equipment[pos];
                const e = uid ? s.inventory.find((x) => x.uid === uid) : null;
                return (
                  <div key={pos} className="doll-slot">
                    {e ? <ItemSlot item={e.itemId} plus={e.plus} size={44} selected={selEntry?.uid === e.uid} onClick={() => setSel(e.uid)} /> : <div className="slot empty" style={{ width: 44, height: 44 }} />}
                    <span className="tiny muted">{SLOT_LABEL[pos]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Win>

        <Win title="DETAIL" sub="상세" color={def && RARITIES.indexOf(def.rarity) >= 4 ? 'gold' : undefined}>
          {selEntry && def ? (
            <div className="col">
              <div className="row">
                <ItemSlot item={def} plus={selEntry.plus} size={64} />
                <div className="grow">
                  <div className="big">
                    <RarityText rarity={def.rarity}>
                      {def.name}
                      {selEntry.plus ? ` +${selEntry.plus}` : ''}
                    </RarityText>
                  </div>
                  <div className="tiny muted">
                    {RARITY_INFO[def.rarity].en} {def.slot ? `· ${SLOT_LABEL[def.slot]}` : ''} {selEntry.qty > 1 ? `· 보유 ${selEntry.qty}` : ''}
                    {eq && <span className="gold-t"> · 장착 중 ({SLOT_LABEL[eqPos!]})</span>}
                  </div>
                </div>
              </div>
              <p className="small">{def.desc}</p>
              {def.stats && <StatCompare stats={scaledStats(def.stats, selEntry.plus)} compare={eq ? undefined : equippedFor(s, def)} />}
              <div className="row wrap">
                {def.category === 'equipment' &&
                  (eq ? (
                    <Btn variant="ghost" onClick={() => act((d, c) => unequip(d, c, eqPos!))}>
                      해제
                    </Btn>
                  ) : (
                    <>
                      <Btn variant="gold" onClick={() => act((d, c) => equip(d, c, selEntry.uid))}>
                        장착
                      </Btn>
                      {def.slot === 'accessory' &&
                        positionsFor('accessory').map((p) => (
                          <Btn key={p} size="sm" variant="ghost" onClick={() => act((d, c) => equip(d, c, selEntry.uid, p))}>
                            {SLOT_LABEL[p]}에 장착
                          </Btn>
                        ))}
                    </>
                  ))}
                {def.use && (
                  <Btn variant="green" onClick={doUse}>
                    {def.use.type === 'chest' ? '열기' : '사용'}
                  </Btn>
                )}
                <Btn
                  variant="ghost"
                  size="sm"
                  disabled={eq}
                  onClick={async () => {
                    if (RARITIES.indexOf(def.rarity) >= 3 || def.unique) {
                      const ok = await confirmDialog({ title: '판매 확인', text: `${def.name}을(를) ${sellPrice(selEntry)} G에 판매할까요?`, ok: '판매', danger: true });
                      if (!ok) return;
                    }
                    act((d, c) => sellItem(d, c, selEntry.uid, 1));
                    setSel(null);
                  }}
                >
                  판매 {sellPrice(selEntry)} G
                </Btn>
              </div>
              {def.category === 'equipment' && (
                <div className="forge">
                  <div className="win-title" style={{ marginBottom: 4 }}>
                    FORGE <span className="sub">대장간 강화</span>
                  </div>
                  {selEntry.plus < MAX_PLUS ? (
                    <>
                      <div className="small">
                        +{selEntry.plus} → <b className="gold-t">+{selEntry.plus + 1}</b> · 성공 확률 <b>{UPGRADE_RATES[selEntry.plus]}%</b> · 비용 <b className="gold-t">{upgradeCost(selEntry)} G</b>
                      </div>
                      <div className="tiny muted">강화 1단계마다 모든 능력치 +10%. 실패해도 장비는 사라지지 않아요.</div>
                      <Btn variant="purple" disabled={s.player.gold < upgradeCost(selEntry)} onClick={() => act((d, c) => upgradeItem(d, c, selEntry.uid))}>
                        <PixelIcon icon="hammer" tint="#e5dbff" size={16} /> 강화하기
                      </Btn>
                    </>
                  ) : (
                    <div className="gold-t small">최대 강화 단계 (+{MAX_PLUS})</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">아이템을 선택하세요.</div>
          )}
        </Win>
      </div>

      {chest && (
        <Modal title="TREASURE OPENED!" color="gold" onClose={() => setChest(null)}>
          <div className="treasure-open">
            <PixelIcon icon="chest" tint="#ffd43b" size={64} />
          </div>
          <div className="col">
            <div>
              <PixelIcon icon="coin" tint="#ffcf4a" size={18} /> <b className="gold-t">+{chest.gold} G</b>
            </div>
            {chest.items.map((id, i) => (
              <div key={i} className="row">
                <ItemIcon item={id} size={28} /> <RarityText rarity={getItem(id).rarity}>{getItem(id).name}</RarityText>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <Btn variant="gold" onClick={() => setChest(null)}>
              확인
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
