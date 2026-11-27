import { useMemo, useState } from 'react';
import { canonicalSubject, STAT_LABEL, STUDY_SECONDS_PER_TRAINING_POINT } from '../../data/subjects';
import { goalSeconds } from '../../game/day';
import { subjectTotals } from '../../game/progression';
import {
  addCustomSubject,
  addDefaultSubjects,
  deleteSubject,
  MAX_DAY_SECONDS,
  restoreSubject,
  clearTimer,
  deleteStudyRecord,
  fmtClock,
  fmtDuration,
  pauseTimer,
  previewStudyReward,
  recordStudy,
  startTimer,
  timerElapsedMs,
  todayRecords,
  todaySeconds,
  todaySubjects,
  totalSeconds,
} from '../../game/study';
import type { StatKey } from '../../game/types';
import { act, useGame } from '../../store/store';
import { Bar, Btn, PixelIcon, useNow, Win } from '../components';
import { confirmDialog } from '../uiStore';

function Stepper(props: { label: string; value: number; onChange: (v: number) => void; max: number; step?: number }) {
  const step = props.step ?? 1;
  return (
    <div className="stepper">
      <div className="tiny muted">{props.label}</div>
      <div className="row" style={{ gap: 4 }}>
        <button className="btn ghost sm" onClick={() => props.onChange(Math.max(0, props.value - step))} aria-label={`${props.label} 감소`}>
          −
        </button>
        <input
          className="input num step-in"
          inputMode="numeric"
          value={props.value === 0 ? '' : String(props.value)}
          placeholder="0"
          onChange={(e) => {
            const n = Math.floor(Number(e.target.value.replace(/[^0-9]/g, '')) || 0);
            props.onChange(Math.min(props.max, n));
          }}
          aria-label={props.label}
        />
        <button className="btn ghost sm" onClick={() => props.onChange(Math.min(props.max, props.value + step))} aria-label={`${props.label} 증가`}>
          +
        </button>
      </div>
    </div>
  );
}

export function Study() {
  const s = useGame();
  const now = useNow(1000);
  const visible = s.subjects.filter((x) => !x.hidden);
  const [subject, setSubject] = useState<string>(() => s.timer?.subject || visible[1]?.name || visible[0]?.name || '');
  const [typed, setTyped] = useState('');
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);
  const [sec, setSec] = useState(0);
  const [showSec, setShowSec] = useState(false);
  const [tab, setTab] = useState<'today' | 'subjects' | 'history'>('today');
  const [newSub, setNewSub] = useState('');
  const [newStat, setNewStat] = useState<StatKey>('int');

  const resolved = typed.trim() ? canonicalSubject(typed, s.subjects) : subject;
  const seconds = h * 3600 + m * 60 + (showSec ? sec : 0);
  const preview = previewStudyReward(s, seconds);
  const today = todaySeconds(s);
  const dayLeft = Math.max(0, MAX_DAY_SECONDS - today);
  const goal = goalSeconds(s);
  const totals = useMemo(() => subjectTotals(s), [s.study]); // eslint-disable-line react-hooks/exhaustive-deps
  const todaySub = todaySubjects(s);
  const recs = todayRecords(s).slice().reverse();
  const sleeping = s.day.status === 'sleeping';
  const elapsed = Math.floor(timerElapsedMs(s, now) / 1000);
  const timerOn = !!s.timer;
  const running = !!s.timer?.startedAt;

  const submit = () => {
    const r = act((d, c) => recordStudy(d, c, resolved, seconds));
    if (r.ok) {
      setH(0);
      setM(0);
      setSec(0);
      setTyped('');
      setSubject(r.value.subject);
    }
  };

  const stopTimerAndFill = () => {
    const el = Math.floor(timerElapsedMs(s, Date.now()) / 1000);
    act((d) => clearTimer(d));
    setH(Math.floor(el / 3600));
    setM(Math.floor((el % 3600) / 60));
    setSec(el % 60);
    if (el % 60) setShowSec(true);
    if (s.timer?.subject) {
      setSubject(s.timer.subject);
      setTyped('');
    }
  };

  const quick = (mins: number) => {
    const total = h * 60 + m + mins;
    setH(Math.floor(total / 60));
    setM(total % 60);
  };

  return (
    <div className="study">
      <div className="study-left">
        <Win title="RECORD STUDY" sub="공부 기록" color="gold">
          {sleeping && <div className="warn-line">잠든 상태에서는 기록할 수 없어요. 상단의 DAY 버튼으로 먼저 일어나세요.</div>}
          <div className="tiny muted">과목 선택</div>
          <div className="subject-chips">
            {visible.map((x) => (
              <button
                key={x.name}
                className={`subj-chip ${!typed && subject === x.name ? 'on' : ''}`}
                style={{ ['--sc' as string]: x.color } as React.CSSProperties}
                onClick={() => {
                  setSubject(x.name);
                  setTyped('');
                }}
                title={`${x.en} · ${STAT_LABEL[x.stat].en} 훈련`}
              >
                <span className="dot" />
                {x.name}
                <span className="st">{STAT_LABEL[x.stat].en}</span>
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <input className="input" placeholder="직접 입력 (예: 화2, 물리 I, 생2, 국어…)" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && seconds >= 60 && submit()} />
          </div>
          {typed.trim() && (
            <div className="tiny" style={{ marginTop: 4 }}>
              → <b className="gold-t">{resolved}</b> {s.subjects.some((x) => x.name === resolved) ? '(기존 과목으로 합산)' : '(새 과목으로 추가됨)'}
            </div>
          )}

          <div className="time-row">
            <Stepper label="시간" value={h} onChange={setH} max={24} />
            <Stepper label="분" value={m} onChange={setM} max={59} step={5} />
            {showSec ? (
              <Stepper label="초" value={sec} onChange={setSec} max={59} step={10} />
            ) : (
              <button className="btn ghost sm sec-toggle" onClick={() => setShowSec(true)}>
                + 초
              </button>
            )}
          </div>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            {[15, 30, 60, 120].map((q) => (
              <button key={q} className="btn ghost sm" onClick={() => quick(q)}>
                +{q >= 60 ? q / 60 + '시간' : q + '분'}
              </button>
            ))}
            <button
              className="btn ghost sm"
              onClick={() => {
                setH(0);
                setM(0);
                setSec(0);
              }}
            >
              초기화
            </button>
          </div>

          <div className="reward-preview">
            <div>
              <span className="muted tiny">예상 보상</span>
            </div>
            <div className="row wrap" style={{ gap: 12 }}>
              <span>
                <PixelIcon icon="star" tint="#b57bff" size={16} /> EXP <b className="purple-t">+{preview.exp}</b>
              </span>
              <span>
                <PixelIcon icon="coin" tint="#ffcf4a" size={16} /> <b className="gold-t">+{preview.gold} G</b>
              </span>
              <span>
                <PixelIcon icon="bolt" tint="#9be15d" size={16} /> 기력 <b className="green-t">+{preview.stamina}</b>
              </span>
              <span>
                <PixelIcon icon="heart" tint="#ff5a6e" size={16} /> HP <b>+{preview.healPct}%</b>
              </span>
            </div>
            {(preview.expBonusPct > 0 || s.player.studyBuff.goldPct > 0) && (
              <div className="tiny muted">
                EXP 보너스 +{Math.round(preview.expBonusPct)}% · 골드 보너스 +{Math.round(preview.goldBonusPct)}%
                {(s.player.studyBuff.expPct > 0 || s.player.studyBuff.goldPct > 0) && <span className="gold-t"> (두루마리 효과 적용 중)</span>}
              </div>
            )}
          </div>

          {seconds > dayLeft ? (
            <div className="warn-line">
              RPG 하루에는 최대 24시간까지 기록할 수 있어요. 오늘 남은 시간: <b>{dayLeft >= 60 ? fmtDuration(dayLeft, true) : '없음'}</b>
            </div>
          ) : (
            <div className="tiny dim" style={{ marginBottom: 6 }}>
              오늘 더 기록할 수 있는 시간: {fmtDuration(dayLeft, true)} (RPG 하루 최대 24시간)
            </div>
          )}
          <Btn variant="gold" size="lg" block onClick={submit} disabled={sleeping || seconds < 60 || !resolved || seconds > dayLeft} sfx={null}>
            <PixelIcon icon="book" tint="#2a1a00" size={20} /> RECORD STUDY {seconds >= 60 ? `· ${resolved} ${fmtDuration(seconds, showSec)}` : ''}
          </Btn>
          <div className="tiny dim" style={{ marginTop: 6 }}>
            1분 = 1 EXP · 0.5 G · 10분마다 기력 1 · 같은 과목 2시간마다 능력치 +1. 기록은 오늘 합계에 <b>더해집니다</b>.
          </div>
        </Win>

        <Win title="STUDY TIMER" sub="스톱워치" color={running ? 'red' : undefined}>
          <div className="timer-face">
            <span className={`timer-digits ${running ? 'on' : ''}`}>{fmtClock(elapsed)}</span>
            <span className="small muted">{timerOn ? s.timer!.subject : resolved || '과목 선택'}</span>
          </div>
          <div className="row wrap">
            {!running ? (
              <Btn variant="green" onClick={() => act((d) => startTimer(d, s.timer?.subject || resolved, Date.now()))} disabled={sleeping || (!resolved && !timerOn)}>
                ▶ {timerOn ? '재개' : '시작'}
              </Btn>
            ) : (
              <Btn variant="ghost" onClick={() => act((d) => pauseTimer(d, Date.now()))}>
                ❚❚ 일시정지
              </Btn>
            )}
            <Btn variant="gold" onClick={stopTimerAndFill} disabled={!timerOn}>
              ■ 종료 → 입력칸에 채우기
            </Btn>
            {timerOn && (
              <Btn
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (await confirmDialog({ title: '타이머 취소', text: '측정한 시간을 버릴까요?', ok: '버리기', danger: true })) act((d) => clearTimer(d));
                }}
              >
                취소
              </Btn>
            )}
          </div>
          <div className="tiny dim" style={{ marginTop: 6 }}>
            타이머는 새로고침해도 유지됩니다. 종료하면 측정 시간이 기록 칸에 채워지고, RECORD STUDY로 저장해요.
          </div>
        </Win>
      </div>

      <div className="study-right">
        <Win title="TODAY" sub={`DAY ${s.day.number}`} right={<span className="chip gold">누적 {fmtDuration(totalSeconds(s))}</span>}>
          <div className="today-clock">
            <span className="num">{fmtClock(today)}</span>
          </div>
          <Bar kind="exp" value={Math.min(today, goal)} max={goal} label={`일일 목표 ${fmtDuration(goal)} · ${Math.floor((Math.min(today, goal) / goal) * 100)}%`} size="tall" />
          <div className="tabs" style={{ marginTop: 12 }}>
            <button className={`tab ${tab === 'today' ? 'on' : ''}`} onClick={() => setTab('today')}>
              오늘 기록 {recs.length}
            </button>
            <button className={`tab ${tab === 'subjects' ? 'on' : ''}`} onClick={() => setTab('subjects')}>
              과목별
            </button>
            <button className={`tab ${tab === 'history' ? 'on' : ''}`} onClick={() => setTab('history')}>
              지난 날
            </button>
          </div>

          {tab === 'today' && (
            <div className="rec-list">
              {recs.length === 0 && <div className="empty-state">아직 오늘의 기록이 없어요. 첫 기록을 남겨 보세요!</div>}
              {recs.map((r) => (
                <div key={r.id} className="rec-item">
                  <span className="dot" style={{ background: s.subjects.find((x) => x.name === r.subject)?.color }} />
                  <div className="grow">
                    <div>
                      <b>{r.subject}</b> <span className="muted">{fmtDuration(r.seconds, true)}</span>
                    </div>
                    <div className="tiny dim">
                      {new Date(r.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · EXP +{r.exp} · +{r.gold} G · 기력 +{r.stamina}
                    </div>
                  </div>
                  <button
                    className="btn ghost sm"
                    title="기록 삭제 (보상도 함께 회수)"
                    onClick={async () => {
                      if (await confirmDialog({ title: '기록 삭제', text: `${r.subject} ${fmtDuration(r.seconds, true)} 기록을 삭제할까요?\n받은 EXP ${r.exp}, ${r.gold} G, 기력 ${r.stamina}도 회수됩니다.`, ok: '삭제', danger: true }))
                        act((d) => deleteStudyRecord(d, r.id));
                    }}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'subjects' && (
            <div className="subj-table">
              {s.subjects
                .filter((x) => !x.hidden)
                .sort((a, b) => (totals[b.name] || 0) - (totals[a.name] || 0))
                .map((x) => {
                  const total = totals[x.name] || 0;
                  const into = total % STUDY_SECONDS_PER_TRAINING_POINT;
                  return (
                    <div key={x.name} className="subj-row">
                      <span className="dot" style={{ background: x.color }} />
                      <div className="grow">
                        <div className="row between">
                          <span>
                            <b>{x.name}</b> <span className="tiny dim">{x.en !== x.name ? x.en : ''}</span>
                          </span>
                          <span className="num small">
                            오늘 <b>{fmtDuration(todaySub[x.name] || 0)}</b> · 누적 <b className="gold-t">{fmtDuration(total)}</b>
                          </span>
                        </div>
                        <div className="row" style={{ gap: 6 }}>
                          <span className="tiny muted" style={{ width: 70 }}>
                            {STAT_LABEL[x.stat].en} +{Math.floor(total / STUDY_SECONDS_PER_TRAINING_POINT)}
                          </span>
                          <Bar kind="st" value={into} max={STUDY_SECONDS_PER_TRAINING_POINT} size="thin" className="grow" />
                        </div>
                      </div>
                      <button
                        className="btn ghost sm"
                        title="과목 삭제"
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: '과목 삭제',
                            text:
                              total > 0
                                ? `「${x.name}」을(를) 과목 목록에서 삭제할까요?\n이 과목의 공부 기록(누적 ${fmtDuration(total)})과 그동안 얻은 EXP·능력치는 그대로 유지됩니다.\n같은 이름을 다시 입력하면 언제든 복구돼요.`
                                : `「${x.name}」을(를) 과목 목록에서 삭제할까요?\n(아직 공부 기록이 없는 과목입니다)`,
                            ok: '삭제',
                            danger: true,
                          });
                          if (!ok) return;
                          act((d, c) => {
                            const res = deleteSubject(d, x.name);
                            c.events.push({ type: 'toast', kind: 'study', title: '과목 삭제', text: res.kept ? `${x.name} (기록은 유지)` : x.name });
                          });
                          if (subject === x.name) setSubject('');
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  );
                })}
              {s.subjects.filter((x) => !x.hidden).length === 0 && <div className="empty-state small">과목이 없어요. 아래에서 추가하거나 수능 과목을 불러오세요.</div>}
              {s.subjects.some((x) => x.hidden) && (
                <details className="hist-item">
                  <summary className="small muted">삭제된 과목 {s.subjects.filter((x) => x.hidden).length}개 (공부 기록은 유지 중)</summary>
                  <div className="col" style={{ gap: 4, marginTop: 6 }}>
                    {s.subjects
                      .filter((x) => x.hidden)
                      .map((x) => (
                        <div key={x.name} className="row small">
                          <span className="dot" style={{ background: x.color }} />
                          <span className="grow">
                            {x.name} <span className="tiny dim">누적 {fmtDuration(totals[x.name] || 0)}</span>
                          </span>
                          <button className="btn ghost sm" onClick={() => act((d) => restoreSubject(d, x.name))}>
                            복구
                          </button>
                        </div>
                      ))}
                  </div>
                </details>
              )}
              <div className="row wrap" style={{ marginTop: 6 }}>
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act((d, c) => {
                      const n = addDefaultSubjects(d);
                      c.events.push({ type: 'toast', kind: 'study', title: n ? '수능 과목 불러오기' : '이미 모두 있어요', text: n ? `${n}개 과목을 추가했어요.` : '수능 과목이 이미 목록에 있습니다.' });
                    })
                  }
                >
                  수능 과목 불러오기
                </Btn>
              </div>
              <div className="sep" />
              <div className="tiny muted">새 과목 추가 (같은 과목은 자동으로 합쳐져요: 화2 = 화학Ⅱ = Chemistry II)</div>
              <div className="row wrap" style={{ marginTop: 4 }}>
                <input className="input grow" style={{ minWidth: 140 }} placeholder="과목 이름" value={newSub} onChange={(e) => setNewSub(e.target.value)} />
                <select className="input" style={{ width: 110 }} value={newStat} onChange={(e) => setNewStat(e.target.value as StatKey)}>
                  {(['str', 'int', 'dex', 'luk'] as StatKey[]).map((k) => (
                    <option key={k} value={k}>
                      {STAT_LABEL[k].en} {STAT_LABEL[k].ko}
                    </option>
                  ))}
                </select>
                <Btn
                  variant="green"
                  size="sm"
                  onClick={() => {
                    const r = act((d, c) => {
                      const res = addCustomSubject(d, newSub, newStat);
                      c.events.push({ type: 'toast', kind: 'study', title: res.created ? '과목 추가' : res.restored ? '과목 복구' : '이미 있는 과목', text: res.name });
                      return res;
                    });
                    if (r.ok) {
                      setSubject(r.value.name);
                      setNewSub('');
                    }
                  }}
                  disabled={!newSub.trim()}
                >
                  추가
                </Btn>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="rec-list">
              {s.dayHistory.length === 0 && <div className="empty-state">아직 마감한 날이 없어요. 하루를 마치면 여기에 기록됩니다.</div>}
              {s.dayHistory
                .slice()
                .reverse()
                .map((dsum) => (
                  <details key={dsum.number} className="hist-item">
                    <summary>
                      <b>DAY {dsum.number}</b> <span className="muted">{fmtDuration(dsum.studySeconds) || '0분'}</span>
                      <span className={`tag`} style={{ background: dsum.goalMet ? 'var(--green)' : 'var(--dim)', marginLeft: 8 }}>
                        {dsum.goalMet ? 'CLEAR' : 'MISS'}
                      </span>
                      <span className="tiny dim" style={{ marginLeft: 8 }}>
                        {new Date(dsum.startedAt).toLocaleDateString('ko-KR')}
                      </span>
                    </summary>
                    <div className="tiny" style={{ padding: '6px 0 4px 10px' }}>
                      {Object.entries(dsum.subjects)
                        .sort((a, b) => b[1] - a[1])
                        .map(([k, v]) => (
                          <div key={k}>
                            {k} — {fmtDuration(v)}
                          </div>
                        ))}
                      <div className="dim">
                        EXP +{dsum.exp} · +{dsum.gold} G · 몬스터 {dsum.monsters} · 층 {dsum.floors}
                      </div>
                    </div>
                  </details>
                ))}
            </div>
          )}
        </Win>
      </div>
    </div>
  );
}
