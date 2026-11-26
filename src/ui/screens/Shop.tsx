import { useState } from 'react';
import { getItem, RARITY_INFO, SHOP_TABS, SLOT_LABEL } from '../../data/items';
import { getRank } from '../../data/ranks';
import { scaledStats, currentRank } from '../../game/progression';
import { isEquipped } from '../../game/core';
import { sellItem, sellPrice } from '../../game/inventory';
import { buyItem, canBuy, dailyDeal, dealBought, dealPrice, shopItems } from '../../game/shop';
import type { GameState, ItemDef, ShopTab, StatBlock } from '../../game/types';
import { act, useGame } from '../../store/store';
import { Btn, ItemIcon, ItemSlot, Modal, PixelIcon, RarityText, Win } from '../components';

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
};

export function equippedFor(s: GameState, def: ItemDef): StatBlock {
  if (!def.slot) return {};
  const pos = def.slot === 'accessory' ? 'acc1' : def.slot;
  const uid = s.player.equipment[pos as keyof GameState['player']['equipment']];
  const e = uid ? s.inventory.find((x) => x.uid === uid) : null;
  return e ? scaledStats(getItem(e.itemId).stats, e.plus) : {};
}

export function StatCompare({ stats, compare }: { stats: StatBlock; compare?: StatBlock }) {
  const keys = Array.from(new Set([...Object.keys(stats), ...Object.keys(compare || {})])) as (keyof StatBlock)[];
  if (!keys.length) return null;
  return (
    <div className="stat-compare">
      {keys.map((k) => {
        const v = stats[k] || 0;
        const c = compare ? compare[k] || 0 : null;
        const diff = c === null ? 0 : v - c;
        return (
          <div key={k} className="sc-row">
            <span className="muted">{STAT_NAMES[k]}</span>
            <b className="num">{v > 0 ? '+' + v : v}</b>
            {c !== null && diff !== 0 && <span className={`num tiny ${diff > 0 ? 'green-t' : 'red-t'}`}>{diff > 0 ? '▲' + diff : '▼' + Math.abs(diff)}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function Shop() {
  const s = useGame();
  const [tab, setTab] = useState<ShopTab | 'sell'>('weapons');
  const [sel, setSel] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [confirm, setConfirm] = useState<{ def: ItemDef; qty: number; price: number; deal?: boolean } | null>(null);
  const rank = currentRank(s);
  const deal = dailyDeal(s);
  const bought = dealBought(s);

  const list = tab === 'sell' ? [] : shopItems(tab);
  const selDef = sel ? getItem(sel) : list[0] || null;
  const stackable = selDef ? selDef.category !== 'equipment' : false;

  const doBuy = () => {
    if (!confirm) return;
    act((d, c) => buyItem(d, c, confirm.def.id, confirm.qty, confirm.deal ? { price: confirm.price, deal: true } : {}));
    setConfirm(null);
    setQty(1);
  };

  return (
    <div className="shop">
      <Win className="shop-head" color="gold">
        <div className="row wrap">
          <div className="shop-keeper">
            <PixelIcon icon="coin" tint="#ffcf4a" size={40} />
          </div>
          <div className="grow">
            <div className="gold-t big shadow-t">마을 상점 "황금 펜촉"</div>
            <div className="small muted">"어서 오게, 모험가! 공부로 번 골드는 여기서 힘이 된다네."</div>
          </div>
          <div className="shop-gold">
            <span className="tiny muted">보유 골드</span>
            <b className="gold-t big num">{s.player.gold.toLocaleString()} G</b>
          </div>
        </div>
        <div className={`deal ${bought ? 'sold' : ''}`}>
          <span className="tag" style={{ background: 'var(--red)', color: '#fff' }}>
            DAY {s.day.number} 특가 −30%
          </span>
          <ItemIcon item={deal} size={28} />
          <RarityText rarity={deal.rarity}>{deal.name}</RarityText>
          <span className="tiny dim" style={{ textDecoration: 'line-through' }}>
            {deal.price} G
          </span>
          <b className="gold-t">{dealPrice(deal)} G</b>
          <span className="grow" />
          <Btn size="sm" variant="red" disabled={bought || s.player.gold < dealPrice(deal)} onClick={() => setConfirm({ def: deal, qty: 1, price: dealPrice(deal), deal: true })}>
            {bought ? '오늘 구매 완료' : '특가 구매'}
          </Btn>
        </div>
      </Win>

      <div className="tabs">
        {SHOP_TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => {
              setTab(t.id);
              setSel(null);
              setQty(1);
            }}
          >
            {t.en} <span className="tiny">{t.label}</span>
          </button>
        ))}
        <button
          className={`tab ${tab === 'sell' ? 'on' : ''}`}
          onClick={() => {
            setTab('sell');
            setSel(null);
          }}
        >
          SELL <span className="tiny">판매</span>
        </button>
      </div>

      {tab !== 'sell' ? (
        <div className="shop-body">
          <Win className="shop-list">
            {list.map((it) => {
              const ok = canBuy(s, it);
              return (
                <button
                  key={it.id}
                  className={`shop-row ${selDef?.id === it.id ? 'on' : ''} ${ok ? '' : 'locked'}`}
                  onClick={() => {
                    setSel(it.id);
                    setQty(1);
                  }}
                >
                  <ItemIcon item={it} size={32} />
                  <span className="grow">
                    <RarityText rarity={it.rarity}>{it.name}</RarityText>
                    <span className="tiny dim">
                      {' '}
                      {it.slot ? SLOT_LABEL[it.slot] : RARITY_INFO[it.rarity].ko}
                      {it.level ? ` · 권장 Lv ${it.level}` : ''}
                    </span>
                  </span>
                  {ok ? (
                    <b className={`num ${s.player.gold >= it.price ? 'gold-t' : 'red-t'}`}>{it.price} G</b>
                  ) : (
                    <span className="tiny" style={{ color: getRank(it.minRank!).color }}>
                      <PixelIcon icon="lock" tint="#868e96" size={12} /> 랭크 {it.minRank}
                    </span>
                  )}
                </button>
              );
            })}
          </Win>
          <Win className="shop-detail" title="ITEM" sub="상세 정보">
            {selDef ? (
              <div className="col">
                <div className="row">
                  <ItemSlot item={selDef} size={72} />
                  <div className="grow">
                    <div className="big">
                      <RarityText rarity={selDef.rarity}>{selDef.name}</RarityText>
                    </div>
                    <div className="tiny muted">
                      {selDef.nameEn} · <RarityText rarity={selDef.rarity}>{RARITY_INFO[selDef.rarity].en}</RarityText>
                      {selDef.slot && ` · ${SLOT_LABEL[selDef.slot]}`}
                    </div>
                  </div>
                </div>
                <p className="small">{selDef.desc}</p>
                {selDef.stats && (
                  <>
                    <div className="tiny muted">능력치 (▲▼ 현재 장착 대비)</div>
                    <StatCompare stats={selDef.stats} compare={equippedFor(s, selDef)} />
                  </>
                )}
                <div className="row between">
                  <span className="muted small">가격</span>
                  <b className="gold-t num">{(selDef.price * qty).toLocaleString()} G</b>
                </div>
                {stackable && (
                  <div className="row">
                    <span className="small muted">수량</span>
                    <button className="btn ghost sm" onClick={() => setQty(Math.max(1, qty - 1))}>
                      −
                    </button>
                    <b className="num" style={{ minWidth: 30, textAlign: 'center' }}>
                      {qty}
                    </b>
                    <button className="btn ghost sm" onClick={() => setQty(Math.min(99, qty + 1))}>
                      +
                    </button>
                    <button className="btn ghost sm" onClick={() => setQty(Math.max(1, Math.min(99, Math.floor(s.player.gold / selDef.price))))}>
                      MAX
                    </button>
                  </div>
                )}
                {!canBuy(s, selDef) && <div className="warn-line">랭크 {selDef.minRank} 이상 필요 (현재 {rank})</div>}
                <Btn variant="gold" size="lg" block disabled={!canBuy(s, selDef) || s.player.gold < selDef.price * qty} onClick={() => setConfirm({ def: selDef, qty, price: selDef.price })}>
                  BUY · 구매하기
                </Btn>
                {s.player.gold < selDef.price * qty && <div className="tiny red-t">골드가 {(selDef.price * qty - s.player.gold).toLocaleString()} G 부족합니다. 공부 1시간 = 약 30 G</div>}
              </div>
            ) : (
              <div className="empty-state">아이템을 선택하세요.</div>
            )}
          </Win>
        </div>
      ) : (
        <Win className="sell-list" title="SELL" sub="판매 — 가격의 40%">
          {s.inventory.length === 0 && <div className="empty-state">팔 아이템이 없습니다.</div>}
          {s.inventory.map((e) => {
            const def = getItem(e.itemId);
            const eq = isEquipped(s, e.uid);
            return (
              <div key={e.uid} className="shop-row">
                <ItemIcon item={def} size={28} />
                <span className="grow">
                  <RarityText rarity={def.rarity}>
                    {def.name}
                    {e.plus ? ` +${e.plus}` : ''}
                  </RarityText>
                  {e.qty > 1 && <span className="tiny muted"> ×{e.qty}</span>}
                  {eq && <span className="tag" style={{ marginLeft: 6, background: 'var(--gold)' }}>장착 중</span>}
                </span>
                <span className="gold-t num small">{sellPrice(e)} G</span>
                <Btn size="sm" variant="ghost" disabled={eq} onClick={() => act((d, c) => sellItem(d, c, e.uid, 1))}>
                  판매
                </Btn>
              </div>
            );
          })}
        </Win>
      )}

      {confirm && (
        <Modal title="구매 확인" color="gold" onClose={() => setConfirm(null)}>
          <div className="row">
            <ItemSlot item={confirm.def} />
            <div>
              <RarityText rarity={confirm.def.rarity}>{confirm.def.name}</RarityText>
              {confirm.qty > 1 ? ` ×${confirm.qty}` : ''}
              <div className="small">
                가격 <b className="gold-t">{(confirm.price * confirm.qty).toLocaleString()} G</b> → 구매 후 {(s.player.gold - confirm.price * confirm.qty).toLocaleString()} G
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <Btn variant="ghost" onClick={() => setConfirm(null)} sfx="cancel">
              취소
            </Btn>
            <Btn variant="gold" onClick={doBuy} sfx={null} autoFocus>
              구매
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
