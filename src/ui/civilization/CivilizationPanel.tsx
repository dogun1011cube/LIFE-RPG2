import { Activity, AlertTriangle, Power, Zap } from 'lucide-react';
import { useGame } from '../../state/gameStore';
import { useUi } from '../../state/uiStore';
import { BUILDINGS } from '../../data/buildings';
import { RESOURCES } from '../../data/resources';
import { Panel, Bar } from '../common/Panel';
import { ResourceIcon } from '../common/ResourceIcon';
import { act } from '../../game/actions';
import { effectivePowerUse, generatorMultiplier } from '../../game/simulation/civilization';
import { getCapacities } from '../../game/research/modifiers';
import { STATE_LABEL, stateClass } from '../building/BuildingInspector';
import { formatNumber } from '../../utils/math';
import type { ResourceId } from '../../game/types';

export function CivilizationPanel() {
  const game = useGame((s) => s.game);
  const report = useGame((s) => s.report);
  const caps = getCapacities(game);
  const net = report.generation - report.consumption;
  const resIds: ResourceId[] = ['iron', 'copper', 'silicon', 'alloy', 'research'];
  const genMult = generatorMultiplier(game);
  return (
    <Panel title="문명 현황" subtitle="전력 · 생산 · 설비 상태" icon={<Activity size={18} />} wide hotkey="V">
      <div className="civ-top">
        <div className={`civ-card ${report.unpowered > 0 ? 'bad' : ''}`}>
          <span className="kicker">
            <Zap size={12} /> 전력망
          </span>
          <div className="civ-big">
            {report.consumption.toFixed(1)} <em>/ {report.generation.toFixed(1)} kW</em>
          </div>
          <Bar value={report.consumption} max={Math.max(report.generation, report.demand, 1)} color={report.deficit ? 'var(--red)' : 'var(--cyan)'} />
          <span className="muted small">
            총 수요 {report.demand.toFixed(1)} kW · 잉여 {net.toFixed(1)} kW · 발전 배율 ×{genMult.toFixed(2)}
          </span>
          {report.unpowered > 0 && (
            <span className="warn-text small">
              <AlertTriangle size={12} /> 전력 부족: 우선순위가 낮은 {report.unpowered}개 설비가 정지했습니다. 발전기를 추가하거나 설비를 비활성화하세요.
            </span>
          )}
          {report.deficit && report.unpowered === 0 && <span className="warn-text small soft">저장 에너지로 부족분을 메우는 중입니다.</span>}
        </div>
        <div className="civ-card">
          <span className="kicker">
            <ResourceIcon id="energy" size={12} /> 에너지 저장
          </span>
          <div className="civ-big">
            {Math.floor(game.inventory.energy ?? 0)} <em>/ {report.energyCapacity}</em>
          </div>
          <Bar value={game.inventory.energy ?? 0} max={report.energyCapacity} color="var(--cyan)" />
          <span className="muted small">잉여 전력 1 kW당 초당 0.1 에너지 충전</span>
        </div>
        <div className="civ-card">
          <span className="kicker">연구</span>
          <div className="civ-big">
            {report.researchRate.toFixed(1)} <em>pt/s</em>
          </div>
          <span className="muted small">가동 연구소 {report.operationalLabs} · 가동 작업장 {report.operationalWorkshops}</span>
          <span className="muted small">저장 한도 {report.storageCapacity}</span>
        </div>
      </div>
      <h3>자원 흐름 (분당)</h3>
      <div className="flow-grid">
        {resIds.map((id) => {
          const prod = report.productionRates[id] ?? 0;
          const cons = report.consumptionRates[id] ?? 0;
          return (
            <div key={id} className="flow-cell">
              <ResourceIcon id={id} size={18} />
              <div>
                <strong>{RESOURCES[id].name}</strong>
                <span className="small">
                  <span className="gen">+{formatNumber(Math.round(prod * 10) / 10)}</span> / <span className="use">-{formatNumber(Math.round(cons * 10) / 10)}</span>
                </span>
                <Bar value={game.inventory[id] ?? 0} max={caps[id] ?? 1} small color={RESOURCES[id].color} />
              </div>
            </div>
          );
        })}
      </div>
      <h3>설비 ({game.buildings.length})</h3>
      <p className="muted small">전력 부족 시 우선순위: 연구소·포탑 → 작업장 → 제련소 → 자동 채굴기 → 기념비 순으로 공급됩니다.</p>
      <table className="civ-table">
        <thead>
          <tr>
            <th>설비</th>
            <th>상태</th>
            <th>전력</th>
            <th>생산</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {game.buildings.map((b) => {
            const def = BUILDINGS[b.type];
            return (
              <tr key={b.id}>
                <td>
                  <button className="link-btn" onClick={() => useUi.getState().inspectBuilding(b.id)}>
                    {def.name}
                  </button>
                  {b.veinResource && <span className="muted small"> · {RESOURCES[b.veinResource].name}</span>}
                </td>
                <td className={stateClass(b.state)}>{STATE_LABEL[b.state]}</td>
                <td>{def.powerGen > 0 ? <span className="gen">+{(def.powerGen * genMult).toFixed(1)}</span> : def.powerUse > 0 ? <span className="use">-{effectivePowerUse(game, b.type).toFixed(1)}</span> : '—'}</td>
                <td>{def.production ? Math.floor(b.produced) : '—'}</td>
                <td>
                  <button className="icon-btn" title={b.enabled ? '비활성화' : '활성화'} onClick={() => act({ type: 'toggleBuilding', id: b.id })}>
                    <Power size={14} className={b.enabled ? 'gen' : 'muted'} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
