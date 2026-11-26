import { daySummaryNow, dayElapsedHours, goToSleep, wakeUp, cancelSleep, goalSeconds } from '../game/day';
import { claimableCount } from '../game/quests';
import { fmtDuration } from '../game/study';
import { act, useGame } from '../store/store';
import { Bar, Btn, PixelIcon } from './components';
import { setUI, useUI } from './uiStore';

function SubjectBars({ subjects, colorOf }: { subjects: Record<string, number>; colorOf: (n: string) => string }) {
  const entries = Object.entries(subjects).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (!entries.length) return <div className="empty-state small">오늘은 아직 공부 기록이 없어요.</div>;
  return (
    <div className="subj-bars">
      {entries.map(([name, sec]) => (
        <div key={name} className="subj-bar">
          <span className="nm">{name}</span>
          <span className="track">
            <span style={{ width: (sec / max) * 100 + '%', background: colorOf(name) }} />
          </span>
          <span className="tm num">{fmtDuration(sec)}</span>
        </div>
      ))}
    </div>
  );
}

export function DayFlow() {
  const ui = useUI();
  const s = useGame();
  if (!ui.dayFlow) return null;
  const colorOf = (n: string) => s.subjects.find((x) => x.name === n)?.color || '#91a7ff';
  const close = () => setUI({ dayFlow: null });

  if (ui.dayFlow === 'summary') {
    const sum = daySummaryNow(s);
    const goal = goalSeconds(s);
    const claim = claimableCount(s);
    const hours = dayElapsedHours(s);
    return (
      <div className="modal-back">
        <section className="win modal wide gold day-summary">
          <div className="win-title">
            DAY {s.day.number} RESULT <span className="sub">오늘의 결산</span>
          </div>
          <div className="ds-grid">
            <div className="ds-big">
              <div className="tiny muted">오늘 공부 시간</div>
              <div className="ds-time">{fmtDuration(sum.studySeconds) || '0분'}</div>
              <Bar kind="exp" value={Math.min(goal, sum.studySeconds)} max={goal} label={`목표 ${fmtDuration(goal)}`} />
              <div className={`ds-goal ${sum.goalMet ? 'ok' : ''}`}>{sum.goalMet ? '★ 일일 목표 달성! 잠들면 연속 기록이 이어집니다.' : '목표 미달성 — 이대로 잠들면 연속 기록이 초기화돼요.'}</div>
            </div>
            <div className="kv">
              <span>기록 횟수</span>
              <span>{sum.records}회</span>
              <span>획득 EXP</span>
              <span className="purple-t">+{sum.exp}</span>
              <span>획득 골드</span>
              <span className="gold-t">+{sum.gold} G</span>
              <span>처치한 몬스터</span>
              <span>{sum.monsters}</span>
              <span>돌파한 층</span>
              <span>{sum.floors}</span>
              <span>연속 달성</span>
              <span>{s.streak.current}일</span>
            </div>
          </div>
          <div className="sep" />
          <SubjectBars subjects={sum.subjects} colorOf={colorOf} />
          {claim > 0 && <div className="small gold-t" style={{ marginTop: 8 }}>받지 않은 퀘스트 보상 {claim}개 — 일일 퀘스트 보상은 일어날 때 자동으로 지급됩니다.</div>}
          <div className="small muted" style={{ marginTop: 8 }}>
            RPG 하루는 자정이 아니라 <b>잠들고 일어날 때</b> 바뀝니다. 밤 12시가 넘어도 계속 같은 날로 기록돼요. (이번 하루 진행: {hours.toFixed(1)}시간)
          </div>
          <div className="modal-actions">
            <Btn variant="ghost" onClick={close} sfx="cancel">
              계속 공부하기
            </Btn>
            <Btn
              variant="purple"
              onClick={() => {
                const r = act((d, c) => goToSleep(d, c));
                if (r.ok) setUI({ dayFlow: 'sleeping' });
              }}
            >
              <PixelIcon icon="moon" tint="#ffe066" size={18} /> 하루 마감 · 잠들기
            </Btn>
          </div>
        </section>
      </div>
    );
  }

  if (ui.dayFlow === 'sleeping') {
    return (
      <div className="night-screen">
        <div className="night-sky" />
        <div className="night-moon" />
        <div className="zzz">
          <span>Z</span>
          <span>z</span>
          <span>z</span>
        </div>
        <div className="night-panel win purple">
          <div className="win-title">
            GOOD NIGHT <span className="sub">DAY {s.day.number} 종료</span>
          </div>
          <p>수고했어요, {s.player.name}. 오늘의 기록은 안전하게 저장되었습니다.</p>
          <p className="small muted">충분히 자고 일어난 뒤 [일어나기]를 누르면 DAY {s.day.number + 1}이 시작됩니다. HP·MP가 모두 회복되고 일일 퀘스트가 새로 고쳐져요.</p>
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <Btn
              variant="ghost"
              sfx="cancel"
              onClick={() => {
                act((d, c) => cancelSleep(d, c));
                close();
              }}
            >
              아직 안 잤어요 (취소)
            </Btn>
            <Btn variant="ghost" sfx="click" onClick={close}>
              잠든 채로 둘러보기
            </Btn>
            <Btn
              variant="gold"
              size="lg"
              onClick={() => {
                const r = act((d, c) => wakeUp(d, c));
                if (r.ok) setUI({ dayFlow: 'morning', morning: r.value });
              }}
            >
              <PixelIcon icon="sun" tint="#ffcf4a" size={20} /> 일어나기
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  // morning
  const prev = ui.morning;
  return (
    <div className="morning-screen" onClick={close}>
      <div className="sunrise" />
      <div className="morning-panel win gold" onClick={(e) => e.stopPropagation()}>
        <div className="morning-day">DAY {s.day.number}</div>
        <div className="small muted" style={{ textAlign: 'center' }}>
          새로운 RPG 하루가 시작되었습니다
        </div>
        {prev && (
          <div className="kv" style={{ marginTop: 12 }}>
            <span>어제(DAY {prev.number}) 공부</span>
            <span>{fmtDuration(prev.studySeconds) || '0분'}</span>
            <span>목표 달성</span>
            <span className={prev.goalMet ? 'green-t' : 'red-t'}>{prev.goalMet ? '성공' : '실패'}</span>
            <span>연속 달성</span>
            <span className="gold-t">{s.streak.current}일 (최고 {s.streak.longest}일)</span>
            <span>공부 EXP 보너스</span>
            <span className="purple-t">+{Math.min(20, s.streak.current * 2)}%</span>
          </div>
        )}
        <div className="small" style={{ marginTop: 10 }}>
          <PixelIcon icon="heart" tint="#ff5a6e" size={14} /> HP·MP 완전 회복 &nbsp; <PixelIcon icon="quest" tint="#e9c46a" size={14} /> 일일 퀘스트 갱신
        </div>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <Btn variant="gold" size="lg" onClick={close} sfx="confirm" autoFocus>
            오늘의 모험 시작 ▶
          </Btn>
        </div>
      </div>
    </div>
  );
}
