import { useState } from 'react';
import { allQuestStatus, claimAll, claimQuest, rewardText } from '../../game/quests';
import type { QuestStatus } from '../../game/quests';
import { act, useGame } from '../../store/store';
import { Bar, Btn, PixelIcon, Win } from '../components';

export function Quests() {
  const s = useGame();
  const [tab, setTab] = useState<'daily' | 'achievement'>('daily');
  const all = allQuestStatus(s);
  const list = all.filter((q) => q.def.kind === tab);
  const claimable = all.filter((q) => q.done && !q.claimed).length;
  const dailyClaimable = all.filter((q) => q.def.kind === 'daily' && q.done && !q.claimed).length;
  const achClaimable = all.filter((q) => q.def.kind === 'achievement' && q.done && !q.claimed).length;
  const sorted = list.slice().sort((a, b) => rank(a) - rank(b));

  return (
    <div className="quests">
      <Win title="QUEST BOARD" sub="퀘스트 게시판" color="gold" right={<Btn size="sm" variant="gold" disabled={!claimable} onClick={() => act((d, c) => claimAll(d, c))}>모두 받기 ({claimable})</Btn>}>
        <div className="tabs">
          <button className={`tab ${tab === 'daily' ? 'on' : ''}`} onClick={() => setTab('daily')}>
            DAILY 일일 {dailyClaimable > 0 && <span className="badge">{dailyClaimable}</span>}
          </button>
          <button className={`tab ${tab === 'achievement' ? 'on' : ''}`} onClick={() => setTab('achievement')}>
            LONG-TERM 업적 {achClaimable > 0 && <span className="badge">{achClaimable}</span>}
          </button>
        </div>
        <div className="small muted" style={{ marginBottom: 8 }}>
          {tab === 'daily'
            ? `일일 퀘스트는 새 RPG 하루(일어날 때)마다 갱신됩니다. 받지 않은 보상은 다음 날로 넘어갈 때 자동 지급돼요. 현재 DAY ${s.day.number}`
            : '장기 목표. 공부·전투·탑 등반으로 진행도가 자동 갱신됩니다.'}
        </div>
        <div className="quest-list">
          {sorted.map((q) => (
            <div key={q.def.id} className={`quest ${q.claimed ? 'claimed' : q.done ? 'done' : ''}`}>
              <PixelIcon icon={q.claimed ? 'star' : q.done ? 'chest' : 'quest'} tint={q.claimed ? '#5c638f' : q.done ? '#ffd43b' : '#e9c46a'} size={30} />
              <div className="grow">
                <div className="row between">
                  <b>{q.def.title}</b>
                  <span className="tiny num muted">
                    {fmt(Math.min(q.value, q.def.target))} / {fmt(q.def.target)}
                  </span>
                </div>
                <div className="small muted">{q.def.desc}</div>
                <Bar kind={q.done ? 'exp' : 'st'} value={Math.min(q.value, q.def.target)} max={q.def.target} size="thin" />
                <div className="tiny gold-t" style={{ marginTop: 3 }}>
                  보상: {rewardText(q.def.reward)}
                </div>
              </div>
              <div className="quest-act">
                {q.claimed ? (
                  <span className="tag" style={{ background: 'var(--dim)' }}>
                    완료
                  </span>
                ) : q.done ? (
                  <Btn variant="gold" size="sm" onClick={() => act((d, c) => claimQuest(d, c, q.def.id))} sfx={null}>
                    CLAIM
                  </Btn>
                ) : (
                  <span className="tag">진행 중</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Win>
    </div>
  );
}

function rank(q: QuestStatus) {
  if (q.done && !q.claimed) return 0;
  if (!q.done) return 1;
  return 2;
}

function fmt(n: number) {
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
}
