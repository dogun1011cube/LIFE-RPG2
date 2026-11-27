import React, { useEffect, useRef, useState } from 'react';
import { playSfx } from '../audio/sfx';
import { getRank } from '../data/ranks';
import type { GameEvent, RankId, StudyRecord, ToastKind } from '../game/types';
import { fmtDuration } from '../game/study';
import { onEvents, useGame, act } from '../store/store';
import { Btn, PixelIcon, RankBadge, Ticker, useNow } from './components';
import { confirmDialog, setUI, useUI } from './uiStore';

// ── Toasts ──────────────────────────────────────────────────
interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  text?: string;
  out?: boolean;
}

const TOAST_STYLE: Record<ToastKind, { color: string; icon: string; tint: string }> = {
  study: { color: '#3ddc84', icon: 'book', tint: '#3ddc84' },
  exp: { color: '#b57bff', icon: 'star', tint: '#b57bff' },
  gold: { color: '#ffcf4a', icon: 'coin', tint: '#ffcf4a' },
  level: { color: '#ffcf4a', icon: 'star', tint: '#ffcf4a' },
  quest: { color: '#3bc9db', icon: 'quest', tint: '#e9c46a' },
  item: { color: '#4dabf7', icon: 'chest', tint: '#cd7f32' },
  rank: { color: '#ff4d6d', icon: 'crown', tint: '#ffd43b' },
  tower: { color: '#9b6bff', icon: 'tower', tint: '#9b6bff' },
  info: { color: '#5663c7', icon: 'sun', tint: '#ffd43b' },
  warn: { color: '#ff4d6d', icon: 'skull', tint: '#e9ecef' },
  save: { color: '#3ddc84', icon: 'gem', tint: '#3ddc84' },
  stamina: { color: '#9be15d', icon: 'bolt', tint: '#9be15d' },
};

let toastId = 1;

export function Toasts() {
  const [items, setItems] = useState<(ToastItem & { exp: number })[]>([]);
  useEffect(() => {
    return onEvents((events) => {
      const add = events.filter((e): e is Extract<GameEvent, { type: 'toast' }> => e.type === 'toast');
      if (!add.length) return;
      // merge several toasts with the same title from one action into one
      const merged: { kind: ToastKind; title: string; texts: string[] }[] = [];
      for (const t of add) {
        const m = merged.find((x) => x.title === t.title && x.kind === t.kind);
        if (m) {
          if (t.text) m.texts.push(t.text);
        } else merged.push({ kind: t.kind, title: t.title, texts: t.text ? [t.text] : [] });
      }
      const now = Date.now();
      setItems((prev) => {
        const next = [
          ...prev,
          ...merged.map((m, i) => ({
            id: toastId++,
            kind: m.kind,
            title: m.texts.length > 1 ? `${m.title} ×${m.texts.length}` : m.title,
            text: m.texts.length > 2 ? m.texts.slice(0, 2).join(' · ') + ` 외 ${m.texts.length - 2}개` : m.texts.join(' · '),
            exp: now + 2600 + i * 350,
          })),
        ];
        return next.slice(-4);
      });
    });
  }, []);
  useEffect(() => {
    if (!items.length) return;
    const id = setInterval(() => {
      const now = Date.now();
      setItems((prev) => {
        let changed = false;
        const next = prev
          .map((i) => {
            if (!i.out && now > i.exp) {
              changed = true;
              return { ...i, out: true };
            }
            return i;
          })
          .filter((i) => {
            const keep = !(i.out && now > i.exp + 320);
            if (!keep) changed = true;
            return keep;
          });
        return changed ? next : prev;
      });
    }, 150);
    return () => clearInterval(id);
  }, [items.length]);
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => {
        const st = TOAST_STYLE[t.kind] || TOAST_STYLE.info;
        return (
          <div key={t.id} className={`toast ${t.out ? 'out' : ''}`} style={{ ['--tc' as string]: st.color } as React.CSSProperties} onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))}>
            <PixelIcon icon={st.icon} tint={st.tint} size={28} className="ic" />
            <div className="grow">
              <div className="ti">{t.title}</div>
              {t.text && <div className="tx">{t.text}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Big overlays queue (level up / rank up / study reward) ──
type Big =
  | { kind: 'level'; from: number; to: number; gains: Record<string, number>; rewards: string[] }
  | { kind: 'rank'; from: RankId; to: RankId }
  | { kind: 'study'; record: StudyRecord; hp: number; stamina: number; notes: string[] };

export function BigOverlays() {
  const [queue, setQueue] = useState<Big[]>([]);
  useEffect(() => {
    return onEvents((events) => {
      const add: Big[] = [];
      for (const e of events) {
        if (e.type === 'studyReward') add.push({ kind: 'study', record: e.record, hp: e.hpRestored, stamina: e.staminaGained, notes: e.trainingNotes });
      }
      for (const e of events) {
        if (e.type === 'levelUp') add.push({ kind: 'level', from: e.from, to: e.to, gains: e.gains, rewards: e.rewards });
        if (e.type === 'rankUp') add.push({ kind: 'rank', from: e.from, to: e.to });
      }
      if (add.length) setQueue((q) => [...q, ...add]);
    });
  }, []);
  const { battle } = useUI();
  const cur = queue[0];
  const next = () => setQueue((q) => q.slice(1));
  if (!cur || battle) return null; // shown after the battle result is closed
  if (cur.kind === 'study') return <StudyReward key={cur.record.id} data={cur} onDone={next} />;
  if (cur.kind === 'level') return <LevelUp key={'lv' + cur.to} data={cur} onDone={next} />;
  return <RankUp key={'rk' + cur.to} data={cur} onDone={next} />;
}

function StudyReward({ data, onDone }: { data: Extract<Big, { kind: 'study' }>; onDone: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShown(true), 60);
    const t2 = setTimeout(onDone, 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const r = data.record;
  return (
    <div className="study-reward" onClick={onDone} role="dialog" aria-label="공부 기록 보상">
      <div className="sr-card win gold">
        <div className="sr-head">STUDY RECORDED</div>
        <div className="sr-sub">
          <b>{r.subject}</b> · {fmtDuration(r.seconds, true)}
        </div>
        <div className="sr-rows">
          <div className="sr-row exp">
            <PixelIcon icon="star" tint="#b57bff" size={20} /> EXP <b>+<Ticker value={shown ? r.exp : 0} /></b>
            {r.bonusPct > 0 && <span className="tiny muted">(보너스 +{Math.round(r.bonusPct)}%)</span>}
          </div>
          <div className="sr-row gold">
            <PixelIcon icon="coin" tint="#ffcf4a" size={20} /> GOLD <b>+<Ticker value={shown ? r.gold : 0} /></b>
          </div>
          <div className="sr-row st">
            <PixelIcon icon="bolt" tint="#9be15d" size={20} /> 기력 <b>+{data.stamina}</b>
            {data.stamina === 0 && r.seconds >= 600 && <span className="tiny muted">(최대치)</span>}
          </div>
          {data.hp > 0 && (
            <div className="sr-row hp">
              <PixelIcon icon="heart" tint="#ff5a6e" size={20} /> HP 회복 <b>+{data.hp}</b>
            </div>
          )}
          {data.notes.map((n) => (
            <div className="sr-row train" key={n}>
              <PixelIcon icon="swords" tint="#3bc9db" size={20} /> 훈련 <b>{n}</b>
            </div>
          ))}
        </div>
        <div className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>
          클릭해서 닫기
        </div>
      </div>
    </div>
  );
}

function LevelUp({ data, onDone }: { data: Extract<Big, { kind: 'level' }>; onDone: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ts = [setTimeout(() => setStep(1), 500), setTimeout(() => setStep(2), 1100)];
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <div className="levelup" role="dialog" aria-label="레벨 업">
      <div className="lu-rays" />
      <div className="lu-inner">
        <div className="lu-title">LEVEL UP!</div>
        <div className="lu-levels">
          <span className="old">Lv {data.from}</span>
          <span className="arrow">▶</span>
          <span className="new">Lv {data.to}</span>
        </div>
        <div className={`lu-gains ${step >= 1 ? 'on' : ''}`}>
          {Object.entries(data.gains)
            .filter(([, v]) => v > 0)
            .map(([k, v], i) => (
              <div key={k} className="lu-gain" style={{ animationDelay: i * 60 + 'ms' }}>
                <span>{k}</span>
                <b>+{v}</b>
              </div>
            ))}
        </div>
        <div className={`lu-rewards ${step >= 2 ? 'on' : ''}`}>
          {data.rewards.map((r) => (
            <div key={r}>
              <PixelIcon icon="star" tint="#ffd43b" size={14} /> {r}
            </div>
          ))}
        </div>
        <Btn variant="gold" size="lg" onClick={onDone} sfx="confirm" autoFocus>
          계속하기
        </Btn>
      </div>
    </div>
  );
}

function RankUp({ data, onDone }: { data: Extract<Big, { kind: 'rank' }>; onDone: () => void }) {
  useEffect(() => {
    playSfx('rankUp');
  }, []);
  const def = getRank(data.to);
  return (
    <div className="levelup rankup" role="dialog" aria-label="랭크 업">
      <div className="lu-rays" style={{ ['--ray' as string]: def.color } as React.CSSProperties} />
      <div className="lu-inner">
        <div className="lu-title">RANK UP!</div>
        <div className="row" style={{ justifyContent: 'center', gap: 20, margin: '10px 0' }}>
          <RankBadge rank={data.from} size="lg" />
          <span className="arrow gold-t big">▶</span>
          <span className="rank-pop">
            <RankBadge rank={data.to} size="xl" />
          </span>
        </div>
        <div className="big" style={{ color: def.color, textShadow: '2px 2px 0 #000' }}>
          {def.title}
        </div>
        <div className="lu-rewards on">
          <div>
            <PixelIcon icon="crown" tint="#ffd43b" size={14} /> 기존의 100만 배 난이도를 뚫고 도달한 명예 랭크입니다.
          </div>
        </div>
        <Btn variant="gold" size="lg" onClick={onDone} sfx="confirm" autoFocus>
          확인
        </Btn>
      </div>
    </div>
  );
}

// ── Confirm dialog ──────────────────────────────────────────
export function ConfirmHost() {
  const { confirm } = useUI();
  if (!confirm) return null;
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && confirm.resolve(false)}>
      <section className={`win modal ${confirm.danger ? 'red' : 'gold'}`}>
        <div className="win-title">{confirm.title}</div>
        <div style={{ whiteSpace: 'pre-line' }}>{confirm.text}</div>
        <div className="modal-actions">
          <Btn variant="ghost" onClick={() => confirm.resolve(false)} sfx="cancel">
            {confirm.cancel || '취소'}
          </Btn>
          <Btn variant={confirm.danger ? 'red' : 'gold'} onClick={() => confirm.resolve(true)} sfx="confirm" autoFocus>
            {confirm.ok || '확인'}
          </Btn>
        </div>
      </section>
    </div>
  );
}

// ── Real-life reward timer (legacy feature, now a Special item) ──
export function RealRewardWatcher() {
  const s = useGame();
  const now = useNow(1000);
  const rr = s.realReward;
  const shownRef = useRef<number | null>(null);
  const [ended, setEnded] = useState<string | null>(null);
  useEffect(() => {
    if (rr && now >= rr.until && shownRef.current !== rr.until) {
      shownRef.current = rr.until;
      setEnded(rr.name);
      playSfx('rankUp');
      act((d) => {
        d.realReward = null;
      });
    }
  }, [now, rr]);
  if (!ended) return null;
  return (
    <div className="modal-back">
      <section className="win modal red" style={{ textAlign: 'center' }}>
        <div className="win-title">보상 시간 종료</div>
        <div className="big row" style={{ margin: '10px 0', justifyContent: 'center' }}>
          <PixelIcon icon="hourglass" tint="#ffd8a8" size={28} /> {ended} 시간이 끝났어요!
        </div>
        <p className="muted">즐거웠죠? 이제 다시 탑을 오를 시간이에요. 공부하면 기력과 EXP가 쌓입니다.</p>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <Btn
            variant="gold"
            size="lg"
            onClick={() => {
              setEnded(null);
              setUI({ screen: 'study' });
            }}
          >
            공부하러 가기
          </Btn>
        </div>
      </section>
    </div>
  );
}

export async function askCancelReward() {
  return confirmDialog({ title: '보상 타이머 종료', text: '진행 중인 보상 타이머를 지금 끝낼까요?', ok: '끝내기' });
}
