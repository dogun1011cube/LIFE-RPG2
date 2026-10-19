import { Hammer, Lock, X } from 'lucide-react';
import { useGame } from '../../state/gameStore';
import { RECIPES, RECIPE_ORDER } from '../../data/recipes';
import { TECHNOLOGIES } from '../../data/technologies';
import { ITEMS } from '../../data/items';
import { craftBlocker, hasWorkshop, MAX_CRAFT_QUEUE } from '../../game/crafting/craftingSystem';
import { isRecipeUnlocked } from '../../game/research/modifiers';
import { Panel, Bar, CostList } from '../common/Panel';
import { ResourceIcon } from '../common/ResourceIcon';
import { act } from '../../game/actions';
import { playSfx } from '../../audio/sfx';

export function CraftingPanel() {
  const game = useGame((s) => s.game);
  const report = useGame((s) => s.report);
  const workshop = hasWorkshop(game);
  return (
    <Panel
      title="제작"
      subtitle={workshop ? `작업장 ${report.operationalWorkshops}곳 가동 · 대기열 ${game.craftQueue.length}/${MAX_CRAFT_QUEUE}` : '작업장이 필요합니다'}
      icon={<Hammer size={18} />}
      wide
      hotkey="C"
    >
      {!workshop && <p className="warn-text">건설 모드(B)에서 작업장을 건설해야 제작할 수 있습니다.</p>}
      {workshop && report.operationalWorkshops === 0 && <p className="warn-text">작업장이 가동되지 않아 제작이 멈춰 있습니다. 전력을 확인하세요.</p>}
      <div className="craft-layout">
        <div className="craft-list">
          {RECIPE_ORDER.map((id) => {
            const r = RECIPES[id];
            const unlocked = isRecipeUnlocked(game, id);
            const blocker = craftBlocker(game, id);
            const outId = 'item' in r.output ? r.output.item : null;
            const owned = outId ? game.inventory[outId] ?? 0 : game.civ.generatorBoost;
            return (
              <div key={id} className={`craft-card ${!unlocked ? 'locked' : ''}`}>
                <div className="craft-card-head">
                  {outId ? <ResourceIcon id={outId} size={26} /> : <ResourceIcon id="energy" size={26} />}
                  <div>
                    <strong>{r.name}</strong>
                    <span className="muted small">{r.description}</span>
                  </div>
                  <span className="muted small owned">{outId ? `보유 ${owned}` : `강화 ${owned}/3`}</span>
                </div>
                {unlocked ? (
                  <>
                    <CostList cost={r.cost} inventory={game.inventory} />
                    <div className="craft-card-foot">
                      <span className="muted small">제작 시간 {r.time}초</span>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={!!blocker}
                        title={blocker ?? ''}
                        onClick={() => {
                          if (act({ type: 'queueCraft', recipe: id }).ok) playSfx('craft');
                        }}
                      >
                        제작
                      </button>
                    </div>
                    {blocker && <span className="warn-text small">{blocker}</span>}
                  </>
                ) : (
                  <div className="craft-locked">
                    <Lock size={12} /> 필요 연구: {TECHNOLOGIES[r.requiredTech!]?.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <aside className="craft-queue">
          <h3>제작 대기열</h3>
          {game.craftQueue.length === 0 && <p className="muted small">대기 중인 작업이 없습니다.</p>}
          {game.craftQueue.map((job, i) => {
            const r = RECIPES[job.recipeId];
            return (
              <div key={i} className="queue-row">
                <div className="queue-row-head">
                  <strong>{r?.name}</strong>
                  <button className="icon-btn" title="취소 (비용 반환)" onClick={() => act({ type: 'cancelCraft', index: i })}>
                    <X size={14} />
                  </button>
                </div>
                <Bar value={i === 0 ? job.progress : 0} max={r?.time ?? 1} small color="var(--gold)" />
              </div>
            );
          })}
          <p className="muted small">완성된 장비는 인벤토리(I)에서 장착하세요. 현재 무기: {ITEMS[game.player.equipment.weapon ?? '']?.name ?? '없음'}</p>
        </aside>
      </div>
    </Panel>
  );
}
