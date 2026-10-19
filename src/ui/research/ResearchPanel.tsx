import { useState } from 'react';
import { Check, FlaskConical, Lock, Loader } from 'lucide-react';
import { useGame } from '../../state/gameStore';
import { TECHNOLOGIES, TECH_BRANCHES } from '../../data/technologies';
import { BUILDINGS } from '../../data/buildings';
import { RECIPES } from '../../data/recipes';
import { getTechStatus, researchBlocker } from '../../game/research/researchSystem';
import { researchSpeedPerLab } from '../../game/simulation/civilization';
import { Panel, Bar, CostList } from '../common/Panel';
import { act } from '../../game/actions';
import { playSfx } from '../../audio/sfx';
import type { TechEffect, TechStatus } from '../../game/types';

const COL_W = 168;
const ROW_H = 86;
const NODE_W = 150;
const NODE_H = 60;
const PAD = 14;

const STATUS_LABEL: Record<TechStatus, string> = { locked: '잠김', available: '연구 가능', researching: '연구 중', completed: '완료' };

function effectText(e: TechEffect) {
  if (e.type === 'unlockBuilding') return `건물 해금: ${BUILDINGS[e.building]?.name ?? e.building}`;
  if (e.type === 'unlockRecipe') return `제작법 해금: ${RECIPES[e.recipe]?.name ?? e.recipe}`;
  return e.label;
}

function nodePos(id: string) {
  const t = TECHNOLOGIES[id];
  const row = TECH_BRANCHES.findIndex((b) => b.id === t.branch);
  return { x: PAD + t.tier * COL_W, y: PAD + row * ROW_H };
}

export function ResearchPanel() {
  const game = useGame((s) => s.game);
  const report = useGame((s) => s.report);
  const [selected, setSelected] = useState<string>(() => game.research.active?.techId ?? 'improved_generators');
  const tech = TECHNOLOGIES[selected];
  const status = getTechStatus(game, selected);
  const blocker = researchBlocker(game, selected);
  const active = game.research.active;
  const ids = Object.keys(TECHNOLOGIES);
  const maxTier = Math.max(...ids.map((id) => TECHNOLOGIES[id].tier));
  const width = PAD * 2 + maxTier * COL_W + NODE_W;
  const height = PAD * 2 + (TECH_BRANCHES.length - 1) * ROW_H + NODE_H;
  const labs = game.buildings.filter((b) => b.type === 'research_lab').length;

  return (
    <Panel title="기술 연구" subtitle={`연구소 ${report.operationalLabs}/${labs} 가동 · 연구 속도 ${report.researchRate.toFixed(1)} pt/s`} icon={<FlaskConical size={18} />} wide className="panel-research" hotkey="K">
      <div className="research-layout">
        <div className="research-tree-wrap">
          <div className="research-branches" style={{ height }}>
            {TECH_BRANCHES.map((b, i) => (
              <div key={b.id} className="research-branch" style={{ top: PAD + i * ROW_H, height: NODE_H, borderColor: b.color }}>
                {b.name}
              </div>
            ))}
          </div>
          <div className="research-tree" style={{ width, height }}>
            <svg width={width} height={height} className="research-links">
              {ids.flatMap((id) =>
                TECHNOLOGIES[id].prerequisites.map((pre) => {
                  const a = nodePos(pre);
                  const b = nodePos(id);
                  const done = game.research.completed.includes(pre);
                  const x1 = a.x + NODE_W;
                  const y1 = a.y + NODE_H / 2;
                  const x2 = b.x;
                  const y2 = b.y + NODE_H / 2;
                  const mx = (x1 + x2) / 2;
                  return <path key={`${pre}-${id}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} className={done ? 'link done' : 'link'} />;
                }),
              )}
            </svg>
            {ids.map((id) => {
              const t = TECHNOLOGIES[id];
              const st = getTechStatus(game, id);
              const pos = nodePos(id);
              const branch = TECH_BRANCHES.find((b) => b.id === t.branch)!;
              const progress = active?.techId === id ? active.progress / t.points : st === 'completed' ? 1 : 0;
              return (
                <button
                  key={id}
                  className={`tech-node tech-${st} ${selected === id ? 'selected' : ''}`}
                  style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H, ['--branch' as string]: branch.color }}
                  onClick={() => {
                    setSelected(id);
                    playSfx('click');
                  }}
                >
                  <span className="tech-node-name">{t.name}</span>
                  <span className="tech-node-status">
                    {st === 'completed' ? <Check size={12} /> : st === 'locked' ? <Lock size={12} /> : st === 'researching' ? <Loader size={12} className="spin" /> : null}
                    {STATUS_LABEL[st]}
                  </span>
                  {progress > 0 && <span className="tech-node-progress" style={{ width: `${progress * 100}%` }} />}
                </button>
              );
            })}
          </div>
        </div>
        <aside className="research-detail">
          <div className="kicker" style={{ color: TECH_BRANCHES.find((b) => b.id === tech.branch)?.color }}>
            {TECH_BRANCHES.find((b) => b.id === tech.branch)?.name}
          </div>
          <h3>{tech.name}</h3>
          <span className={`pill pill-${status}`}>{STATUS_LABEL[status]}</span>
          <p className="desc">{tech.description}</p>
          <h4>효과</h4>
          <ul className="effect-list">
            {tech.effects.map((e, i) => (
              <li key={i}>{effectText(e)}</li>
            ))}
          </ul>
          {tech.prerequisites.length > 0 && (
            <>
              <h4>선행 기술</h4>
              <ul className="effect-list">
                {tech.prerequisites.map((p) => (
                  <li key={p} className={game.research.completed.includes(p) ? 'ok' : 'missing'}>
                    {TECHNOLOGIES[p].name}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h4>비용</h4>
          <CostList cost={tech.cost} inventory={game.inventory} />
          <p className="muted small">
            연구량 {tech.points} pt · 연구소 1곳 기준 약 {Math.ceil(tech.points / researchSpeedPerLab(game))}초
          </p>
          {status === 'researching' && active && (
            <>
              <Bar value={active.progress} max={tech.points} color="var(--violet)" label={`${Math.floor((active.progress / tech.points) * 100)}%`} />
              {report.researchRate === 0 && <p className="warn-text">가동 중인 연구소가 없어 연구가 멈춰 있습니다. 전력을 확인하세요.</p>}
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (act({ type: 'cancelResearch' }).ok) playSfx('click');
                }}
              >
                연구 취소 (비용 반환)
              </button>
            </>
          )}
          {status !== 'researching' && status !== 'completed' && (
            <>
              <button
                className="btn btn-primary"
                disabled={!!blocker}
                onClick={() => {
                  if (act({ type: 'startResearch', tech: tech.id }).ok) playSfx('research');
                }}
              >
                연구 시작
              </button>
              {blocker && <p className="warn-text">{blocker}</p>}
            </>
          )}
        </aside>
      </div>
    </Panel>
  );
}
