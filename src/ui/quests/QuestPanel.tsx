import { BookOpen, CheckCircle2, Circle, Lock } from 'lucide-react';
import { useGame } from '../../state/gameStore';
import { QUESTS } from '../../data/quests';
import { objectiveStatus } from '../../game/quests/questSystem';
import { Panel } from '../common/Panel';
import { costEntries, stackName } from '../../game/resources/inventory';

export function QuestPanel() {
  const game = useGame((s) => s.game);
  return (
    <Panel title="임무 일지" subtitle="제네시스 개척 기록" icon={<BookOpen size={18} />} hotkey="J">
      <div className="quest-list">
        {QUESTS.map((q, idx) => {
          const prog = game.quests[q.id];
          const status = prog?.status ?? 'locked';
          return (
            <article key={q.id} className={`quest-card quest-${status}`}>
              <header>
                <span className="quest-num">{String(idx + 1).padStart(2, '0')}</span>
                <h3>{status === 'locked' ? '???' : q.name}</h3>
                <span className={`pill pill-${status === 'completed' ? 'completed' : status === 'active' ? 'researching' : 'locked'}`}>
                  {status === 'completed' ? '완료' : status === 'active' ? '진행 중' : '잠김'}
                </span>
              </header>
              {status === 'locked' ? (
                <p className="muted small">
                  <Lock size={12} /> 이전 임무를 완료하면 공개됩니다.
                </p>
              ) : (
                <>
                  <p className="desc">{q.summary}</p>
                  <ul className="objective-list">
                    {q.objectives.map((o, i) => {
                      const st = objectiveStatus(game, q.id, i);
                      return (
                        <li key={i} className={st.done ? 'done' : ''}>
                          {st.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                          <span>{o.label}</span>
                          {st.target > 1 && (
                            <span className="prog">
                              {st.current}/{st.target}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {status === 'active' && <p className="hint">힌트: {q.hint}</p>}
                  <div className="reward-line">
                    보상: {q.reward.xp ? `${q.reward.xp} XP` : ''}
                    {q.reward.stacks &&
                      costEntries(q.reward.stacks).map(([id, n]) => (
                        <span key={id}>
                          {' '}
                          · {stackName(id)} {n}
                        </span>
                      ))}
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
