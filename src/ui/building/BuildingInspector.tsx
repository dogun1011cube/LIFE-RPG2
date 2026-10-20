import { Factory, Power, Trash2, Zap } from 'lucide-react';
import { useGame } from '../../state/gameStore';
import { useUi } from '../../state/uiStore';
import { BUILDINGS } from '../../data/buildings';
import { RESOURCES } from '../../data/resources';
import { Panel, Bar, CostList } from '../common/Panel';
import { act } from '../../game/actions';
import { effectivePowerUse, generatorMultiplier, productionSpeed } from '../../game/simulation/civilization';
import { scaleCost, costEntries, stackName } from '../../game/resources/inventory';
import { DEMOLISH_REFUND } from '../../game/building/placement';
import { playSfx } from '../../audio/sfx';
import type { BuildingState } from '../../game/types';

export const STATE_LABEL: Record<BuildingState, string> = {
  operational: '가동 중',
  unpowered: '전력 부족',
  disabled: '비활성화됨',
  no_input: '원료 부족',
  storage_full: '저장 공간 가득',
  idle: '대기',
  invalid_site: '설치 위치 오류',
};

export function stateClass(s: BuildingState) {
  return s === 'operational' ? 'st-ok' : s === 'disabled' ? 'st-off' : 'st-bad';
}

export function BuildingInspector() {
  const id = useUi((s) => s.inspectBuildingId);
  const game = useGame((s) => s.game);
  const b = game.buildings.find((x) => x.id === id);
  if (!b) {
    return (
      <Panel title="건물 정보">
        <p className="muted">건물이 더 이상 존재하지 않습니다.</p>
      </Panel>
    );
  }
  const def = BUILDINGS[b.type];
  const prod = def.production;
  const speed = productionSpeed(game, b.type);
  const outputs = prod ? (prod.outputs === 'vein' ? (b.veinResource ? { [b.veinResource]: prod.veinAmount ?? 1 } : {}) : prod.outputs) : {};
  return (
    <Panel title={def.name} subtitle={`${b.id} · 소유자: 로컬 플레이어`} icon={<Factory size={18} />}>
      <p className="desc">{def.description}</p>
      <div className="kv-grid">
        <div>
          <span>상태</span>
          <strong className={stateClass(b.state)}>{STATE_LABEL[b.state]}</strong>
        </div>
        <div>
          <span>전력</span>
          <strong>
            <Zap size={12} />{' '}
            {def.powerGen > 0 ? `+${(def.powerGen * generatorMultiplier(game)).toFixed(1)} kW 생산` : def.powerUse > 0 ? `${effectivePowerUse(game, b.type).toFixed(1)} kW 소비` : '없음'}
          </strong>
        </div>
        <div>
          <span>우선순위</span>
          <strong>{def.priority <= 1 ? '높음' : def.priority <= 3 ? '보통' : '낮음'}</strong>
        </div>
        {b.veinResource && (
          <div>
            <span>광맥</span>
            <strong style={{ color: RESOURCES[b.veinResource].color }}>{RESOURCES[b.veinResource].name}</strong>
          </div>
        )}
      </div>
      {prod && (
        <div className="section">
          <h3>생산</h3>
          <p className="muted small">
            {prod.inputs ? `${costEntries(prod.inputs).map(([k, n]) => `${stackName(k)} ${n}`).join(' + ')} → ` : ''}
            {costEntries(outputs).map(([k, n]) => `${stackName(k)} ${n}`).join(', ')} / {(prod.cycleTime / speed).toFixed(1)}초
          </p>
          <Bar value={b.progress} max={prod.cycleTime} color="var(--cyan)" label={`누적 생산 ${Math.floor(b.produced)}`} />
        </div>
      )}
      {b.type === 'research_lab' && (
        <div className="section">
          <button className="btn" onClick={() => useUi.getState().openPanel('research')}>
            연구 트리 열기 (K)
          </button>
        </div>
      )}
      {b.type === 'workshop' && (
        <div className="section">
          <button className="btn" onClick={() => useUi.getState().openPanel('crafting')}>
            제작 열기 (C)
          </button>
        </div>
      )}
      <div className="section row-gap">
        <button
          className="btn"
          onClick={() => {
            act({ type: 'toggleBuilding', id: b.id });
            playSfx('click');
          }}
        >
          <Power size={14} /> {b.enabled ? '비활성화' : '활성화'}
        </button>
        {!b.prebuilt && (
          <button
            className="btn btn-danger"
            onClick={() => {
              useUi.getState().askConfirm({
                title: `${def.name}을(를) 철거할까요?`,
                body: `건설 비용의 ${DEMOLISH_REFUND * 100}%가 반환됩니다.`,
                confirmLabel: '철거',
                danger: true,
                onConfirm: () => {
                  const r = act({ type: 'demolishBuilding', id: b.id });
                  if (r.ok) {
                    useUi.getState().inspectBuilding(null);
                    useUi.getState().notify({ kind: 'info', title: `${def.name} 철거됨` });
                  }
                },
              });
            }}
          >
            <Trash2 size={14} /> 철거
          </button>
        )}
      </div>
      {!b.prebuilt && (
        <div className="section">
          <span className="muted small">철거 시 반환:</span>
          <CostList cost={scaleCost(def.cost, DEMOLISH_REFUND)} inventory={{}} />
        </div>
      )}
    </Panel>
  );
}
