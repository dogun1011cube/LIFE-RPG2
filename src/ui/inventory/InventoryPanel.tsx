import { useState } from 'react';
import { Backpack, Dumbbell, HeartPulse } from 'lucide-react';
import { useGame } from '../../state/gameStore';
import { RESOURCES, RESOURCE_ORDER } from '../../data/resources';
import { ITEMS } from '../../data/items';
import { getCapacities } from '../../game/research/modifiers';
import { PROGRESSION, getPlayerStats, trainingCost, xpToNext } from '../../game/progression/progression';
import { ResourceIcon } from '../common/ResourceIcon';
import { Panel, Bar } from '../common/Panel';
import { act } from '../../game/actions';
import { playSfx } from '../../audio/sfx';
import { formatNumber } from '../../utils/math';
import type { EquipSlot } from '../../game/types';

const SLOT_LABEL: Record<EquipSlot, string> = { weapon: '무기', armor: '방어구', tool: '도구', module: '모듈' };
type Tab = 'resource' | 'material' | 'equipment' | 'consumable';
const TABS: { id: Tab; name: string }[] = [
  { id: 'resource', name: '자원' },
  { id: 'material', name: '재료' },
  { id: 'equipment', name: '장비' },
  { id: 'consumable', name: '소모품' },
];

function statLine(id: string) {
  const s = ITEMS[id]?.stats;
  if (!s) return '';
  const parts: string[] = [];
  if (s.attack) parts.push(`공격 +${s.attack}`);
  if (s.defense) parts.push(`방어 +${s.defense}`);
  if (s.maxHp) parts.push(`체력 +${s.maxHp}`);
  if (s.miningYield) parts.push(`채집 +${s.miningYield}`);
  if (s.hazardProtection) parts.push('부식 면역');
  return parts.join(' · ');
}

export function InventoryPanel() {
  const game = useGame((s) => s.game);
  const [tab, setTab] = useState<Tab>('resource');
  const caps = getCapacities(game);
  const stats = getPlayerStats(game);
  const inv = game.inventory;
  const items = Object.values(ITEMS).filter((it) => it.category === tab && (inv[it.id] ?? 0) > 0);
  return (
    <Panel title="인벤토리" subtitle="자원 · 장비 · 캐릭터" icon={<Backpack size={18} />} wide hotkey="I">
      <div className="inv-layout">
        <div className="inv-main">
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                {t.name}
              </button>
            ))}
          </div>
          {tab === 'resource' ? (
            <div className="inv-grid">
              {RESOURCE_ORDER.map((id) => {
                const cap = caps[id];
                const v = inv[id] ?? 0;
                return (
                  <div key={id} className="inv-cell">
                    <ResourceIcon id={id} size={28} />
                    <div className="inv-cell-info">
                      <strong>{RESOURCES[id].name}</strong>
                      <span className="inv-count">
                        {formatNumber(Math.floor(v))}
                        {cap !== undefined && <em> / {cap}</em>}
                      </span>
                      {cap !== undefined && <Bar value={v} max={cap} small color={RESOURCES[id].color} />}
                      <span className="muted small">{RESOURCES[id].description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : items.length === 0 ? (
            <p className="muted empty">보유한 아이템이 없습니다.</p>
          ) : (
            <div className="inv-grid">
              {items.map((it) => (
                <div key={it.id} className="inv-cell">
                  <ResourceIcon id={it.id} size={28} />
                  <div className="inv-cell-info">
                    <strong>
                      {it.name} <span className="inv-count">×{inv[it.id]}</span>
                    </strong>
                    <span className="muted small">{it.description}</span>
                    {it.stats && <span className="stat-line">{statLine(it.id)}</span>}
                    {it.category === 'equipment' && (
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          if (act({ type: 'equip', item: it.id }).ok) playSfx('click');
                        }}
                      >
                        장착
                      </button>
                    )}
                    {it.category === 'consumable' && (
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          if (act({ type: 'useItem', item: it.id }).ok) playSfx('collect');
                        }}
                      >
                        사용
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="inv-side">
          <h3>장비</h3>
          <div className="equip-slots">
            {(Object.keys(SLOT_LABEL) as EquipSlot[]).map((slot) => {
              const id = game.player.equipment[slot];
              return (
                <div key={slot} className={`equip-slot ${id ? 'filled' : ''}`}>
                  <span className="equip-slot-label">{SLOT_LABEL[slot]}</span>
                  {id ? (
                    <>
                      <div className="equip-item">
                        <ResourceIcon id={id} size={20} />
                        <div>
                          <strong>{ITEMS[id]?.name}</strong>
                          <span className="muted small">{statLine(id)}</span>
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => act({ type: 'unequip', slot })}>
                        해제
                      </button>
                    </>
                  ) : (
                    <span className="muted small">비어 있음</span>
                  )}
                </div>
              );
            })}
          </div>
          <h3>능력치</h3>
          <div className="kv-grid">
            <div>
              <span>레벨</span>
              <strong>
                {game.player.level} <em className="muted">({game.player.xp}/{xpToNext(game.player.level)} XP)</em>
              </strong>
            </div>
            <div>
              <span>체력</span>
              <strong>
                {Math.ceil(game.player.hp)} / {stats.maxHp}
              </strong>
            </div>
            <div>
              <span>공격력</span>
              <strong>{stats.attack}</strong>
            </div>
            <div>
              <span>방어력</span>
              <strong>{stats.defense}</strong>
            </div>
            <div>
              <span>채집 보너스</span>
              <strong>+{stats.miningYield}</strong>
            </div>
            <div>
              <span>부식 보호</span>
              <strong>{stats.hazardProtection ? '있음' : '없음'}</strong>
            </div>
          </div>
          <h3>훈련 (골드 사용)</h3>
          {(
            [
              ['vitality', '체력 단련', `최대 체력 +${PROGRESSION.vitalityHp}`, <HeartPulse key="h" size={14} />],
              ['strength', '전투 훈련', `공격력 +${PROGRESSION.strengthAttack}`, <Dumbbell key="d" size={14} />],
            ] as const
          ).map(([stat, name, effect, icon]) => {
            const rank = game.player.training[stat];
            const maxed = rank >= PROGRESSION.trainingMax;
            const cost = trainingCost(rank);
            return (
              <div key={stat} className="train-row">
                {icon}
                <div>
                  <strong>
                    {name} {rank}/{PROGRESSION.trainingMax}
                  </strong>
                  <span className="muted small">{effect}</span>
                </div>
                <button
                  className="btn btn-sm btn-gold"
                  disabled={maxed || (inv.gold ?? 0) < cost}
                  onClick={() => {
                    if (act({ type: 'train', stat }).ok) playSfx('levelup');
                  }}
                >
                  {maxed ? '최대' : `${cost}G`}
                </button>
              </div>
            );
          })}
        </aside>
      </div>
    </Panel>
  );
}
