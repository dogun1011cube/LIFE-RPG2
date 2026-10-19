import { useState } from 'react';
import { Lock, RotateCw, Zap } from 'lucide-react';
import { useGame } from '../../state/gameStore';
import { useUi } from '../../state/uiStore';
import { BUILDINGS, BUILD_CATEGORIES, BUILD_ORDER } from '../../data/buildings';
import { TECHNOLOGIES } from '../../data/technologies';
import { isBuildingUnlocked } from '../../game/research/modifiers';
import { canAfford } from '../../game/resources/inventory';
import { CostList } from '../common/Panel';
import { playSfx } from '../../audio/sfx';
import { buildCycle } from '../../game/actions';
import type { BuildingCategory } from '../../game/types';

export function BuildBar() {
  const game = useGame((s) => s.game);
  const selection = useUi((s) => s.buildSelection);
  const placement = useUi((s) => s.placement);
  const [cat, setCat] = useState<BuildingCategory | 'all'>('all');
  const cycle = buildCycle();
  const list = BUILD_ORDER.filter((id) => cat === 'all' || BUILDINGS[id].category === cat);
  const sel = selection ? BUILDINGS[selection] : null;
  return (
    <div className="buildbar">
      <div className="buildbar-head">
        <div className="buildbar-title">건설 모드</div>
        <div className="buildbar-tabs">
          <button className={cat === 'all' ? 'active' : ''} onClick={() => setCat('all')}>
            전체
          </button>
          {BUILD_CATEGORIES.map((c) => (
            <button key={c.id} className={cat === c.id ? 'active' : ''} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        {sel && (
          <div className={`buildbar-status ${placement?.valid ? 'ok' : 'bad'}`}>
            {placement?.valid ? `${sel.name} 설치 가능 — 좌클릭` : placement?.reason ?? '위치를 조준하세요'}
            <span className="muted">
              <RotateCw size={12} /> R 회전
            </span>
          </div>
        )}
      </div>
      <div className="buildbar-cards">
        {list.map((id) => {
          const def = BUILDINGS[id];
          const unlocked = isBuildingUnlocked(game, id);
          const affordable = canAfford(game.inventory, def.cost);
          const hotkey = cycle.indexOf(id);
          return (
            <button
              key={id}
              className={`build-card ${selection === id ? 'selected' : ''} ${!unlocked ? 'locked' : ''} ${unlocked && !affordable ? 'poor' : ''}`}
              onClick={() => {
                if (!unlocked) {
                  useUi.getState().notify({ kind: 'warning', title: `${def.name}: 연구 필요`, body: TECHNOLOGIES[def.requiredTech!]?.name });
                  playSfx('error');
                  return;
                }
                useUi.getState().selectBuilding(selection === id ? null : id);
                playSfx('click');
              }}
              title={def.description}
            >
              <div className="build-card-top">
                <span className="build-card-name">{def.name}</span>
                {hotkey >= 0 && hotkey < 9 && <kbd>{hotkey + 1}</kbd>}
              </div>
              {unlocked ? (
                <>
                  <CostList cost={def.cost} inventory={game.inventory} />
                  <div className="build-card-power">
                    <Zap size={11} />
                    {def.powerGen > 0 ? <span className="gen">+{def.powerGen} kW</span> : def.powerUse > 0 ? <span className="use">-{def.powerUse} kW</span> : <span className="muted">전력 불필요</span>}
                  </div>
                </>
              ) : (
                <div className="build-card-lock">
                  <Lock size={12} /> {TECHNOLOGIES[def.requiredTech!]?.name ?? '연구 필요'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
