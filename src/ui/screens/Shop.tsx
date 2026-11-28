import { useState } from 'react';
import { getItem, RARITY_INFO, SHOP_TABS, SLOT_LABEL } from '../../data/items';
import { stageReqText } from '../../data/ranks';
import { WEAPON_KINDS } from '../../data/weapons';
import { scaledStats } from '../../game/progression';
import { isEquipped } from '../../game/core';
import type { SellScope } from '../../game/inventory';
import { sellAll, sellAllPreview, sellItem, sellPrice, toggleLock } from '../../game/inventory';
import { buyItem, canBuy, dailyDeal, dealBought, dealPrice, shopItems } from '../../game/shop';
import type { GameState, ItemDef, ShopTab, StatBlock, WeaponKind } from '../../game/types';
import { act, useGame } from '../../store/store';
import { Btn, ItemIcon, ItemSlot, Modal, PixelIcon, RarityText, Win } from '../components';
import { confirmDialog } from '../uiStore';
import { KindBadge, KindFilter, STAT_NAMES, WeaponKindLine } from '../WeaponInfo';

export { STAT_NAMES };

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
  const [scope, setScope] = useState<SellScope>('equipment');
  const [kind, setKind] = useState<WeaponKind | 'all'>('all');

  const doSellAll = async () => {
    const p = sellAllPreview(s, scope);
    if (!p.entries.length) return;
    const ok = await confirmDialog({
      title: '모두 판매',
      text:
        `${scope === 'equipment' ? '장비' : '모든 아이템'} ${p.count}개를 판매하고 ${p.gold.toLocaleString()} G를 받습니다.\n` +
        `장착 중 ${p.skippedEquipped}개 · 잠금 ${p.skippedLocked}개는 판매하지 않아요.` +
        (p.highRarity ? `\n주의: 영웅 등급 이상 ${p.highRarity}개가 포함돼 있어요. 지키고 싶은 아이템은 우클릭으로 잠그세요.` : ''),
      ok: '모두 판매',
      danger: true,
    });
    if (ok) act((d, c) => sellAll(d, c, scope));
  };
  const deal = dailyDeal(s);
  const bought = dealBought(s);

  const list =
    tab === 'sell'
      ? []
      : tab === 'weapons'
        ? shopItems(tab)
            .filter((it) => kind === 'all' || it.kind === kind)
            .sort((a, b) => (a.level || 0) - (b.level || 0) || a.price - b.price)
        : shopItems(tab);
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
            {tab === 'weapons' && (
              <KindFilter
                value={kind}
                onChange={(k) => {
                  setKind(k);
                  setSel(null);
                }}
              />
            )}
            {list.length === 0 && <div className="empty-state">이 계열은 상점에서 팔지 않아요. 몬스터 드롭·소환·합성으로 얻을 수 있습니다.</div>}
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
                      {it.kind ? <KindBadge kind={it.kind} /> : it.slot ? SLOT_LABEL[it.slot] : RARITY_INFO[it.rarity].ko}
                      {it.level ? ` · 권장 Lv ${it.level}` : ''}
                    </span>
                  </span>
                  {ok ? (
                    <b className={`num ${s.player.gold >= it.price ? 'gold-t' : 'red-t'}`}>{it.price} G</b>
                  ) : (
                    <span className="tiny dim" title={`${stageReqText(it.minRank!)} 달성 시 해금`}>
                      <PixelIcon icon="lock" tint="#868e96" size={12} /> {stageReqText(it.minRank!)}
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
                      {selDef.slot && ` · ${selDef.kind ? WEAPON_KINDS[selDef.kind].ko : SLOT_LABEL[selDef.slot]}`}
                    </div>
                  </div>
                </div>
                <p className="small">{selDef.desc}</p>
                <WeaponKindLine def={selDef} />
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
                {!canBuy(s, selDef) && <div className="warn-line">아직 해금되지 않았어요 — {stageReqText(selDef.minRank!)} 달성 시 판매</div>}
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
        <Win className="sell-list" title="SELL" sub="판매 — 가격의 40% · 우클릭으로 잠금">
          <div className="sell-all-bar">
            <select className="input" style={{ width: 150 }} value={scope} onChange={(e) => setScope(e.target.value as SellScope)}>
              <option value="equipment">장비만</option>
              <option value="all">전체 (소모품·특수 포함)</option>
            </select>
            <span className="small muted grow">
              판매 예정 {sellAllPreview(s, scope).count}개 · <b className="gold-t">{sellAllPreview(s, scope).gold.toLocaleString()} G</b> (장착·잠금 제외)
            </span>
            <Btn variant="red" size="sm" disabled={!sellAllPreview(s, scope).entries.length} onClick={doSellAll} sfx={null}>
              모두 판매
            </Btn>
          </div>
          {s.inventory.length === 0 && <div className="empty-state">팔 아이템이 없습니다.</div>}
          {s.inventory.map((e) => {
            const def = getItem(e.itemId);
            const eq = isEquipped(s, e.uid);
            return (
              <div
                key={e.uid}
                className={`shop-row ${e.locked ? 'locked-row' : ''}`}
                onContextMenu={(ev) => {
                  ev.preventDefault();
                  act((d, c) => toggleLock(d, c, e.uid));
                }}
                title="우클릭: 잠금 / 잠금 해제"
              >
                <button className={`lock-btn ${e.locked ? 'on' : ''}`} onClick={() => act((d, c) => toggleLock(d, c, e.uid))} title={e.locked ? '잠금 해제' : '잠금'} aria-label={e.locked ? '잠금 해제' : '잠금'}>
                  <PixelIcon icon="lock" tint={e.locked ? '#ffd43b' : '#5c638f'} size={16} />
                </button>
                <ItemIcon item={def} size={28} />
                <span className="grow">
                  <RarityText rarity={def.rarity}>
                    {def.name}
                    {e.plus ? ` +${e.plus}` : ''}
                  </RarityText>
                  {e.qty > 1 && <span className="tiny muted"> ×{e.qty}</span>}
                  {eq && <span className="tag" style={{ marginLeft: 6, background: 'var(--gold)' }}>장착 중</span>}
                  {e.locked && <span className="tag" style={{ marginLeft: 6, background: '#ffd43b' }}>잠금</span>}
                </span>
                <span className="gold-t num small">{sellPrice(e)} G</span>
                <Btn size="sm" variant="ghost" disabled={eq || !!e.locked} onClick={() => act((d, c) => sellItem(d, c, e.uid, 1))}>
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
