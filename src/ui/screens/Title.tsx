import { useEffect, useState } from 'react';
import { playSfx } from '../../audio/sfx';
import { Btn, MonsterSprite } from '../components';

const BASE = import.meta.env.BASE_URL;

export function Title(props: {
  hasSave: boolean;
  saveNote?: string;
  legacy: Record<string, unknown> | null;
  onContinue: () => void;
  onNew: (name: string) => void;
  onImportLegacy: () => void;
}) {
  const [mode, setMode] = useState<'menu' | 'name'>('menu');
  const [name, setName] = useState('');
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 600);
    return () => clearInterval(id);
  }, []);
  const legacyMinutes = props.legacy ? Math.floor(Number(props.legacy.totalSeconds || 0) / 60) : 0;

  return (
    <div className="title-screen">
      <div className="title-bg pixel" style={{ backgroundImage: `url(${BASE}assets/intro1_px.png)` }} />
      <div className="title-vignette" />
      <div className="title-content">
        <div className="logo">
          <div className="logo-top">STUDY · RPG</div>
          <h1 className="logo-main">
            <span>LIFE</span> <span className="rpg">RPG</span>
          </h1>
          <div className="logo-sub">현실의 공부가 너를 강하게 만든다</div>
        </div>

        <div className="title-slime">
          <MonsterSprite id="slime_king" scale={6} />
        </div>

        {mode === 'menu' && (
          <div className="title-menu win">
            {props.hasSave && (
              <Btn variant="gold" size="lg" block onClick={props.onContinue} sfx="confirm" autoFocus>
                ▶ CONTINUE <span className="kbd">이어하기</span>
              </Btn>
            )}
            {props.legacy && !props.hasSave && (
              <Btn variant="gold" size="lg" block onClick={props.onImportLegacy} sfx="confirm" autoFocus>
                ▶ 이전 데이터로 이어하기
              </Btn>
            )}
            {props.legacy && !props.hasSave && (
              <div className="tiny muted" style={{ textAlign: 'center' }}>
                LIFE RPG v2 세이브 발견 · 누적 공부 {Math.floor(legacyMinutes / 60)}시간 {legacyMinutes % 60}분 · Day {String(props.legacy.day ?? 1)}
              </div>
            )}
            <Btn
              variant={props.hasSave || props.legacy ? 'ghost' : 'gold'}
              size="lg"
              block
              onClick={() => setMode('name')}
              autoFocus={!props.hasSave && !props.legacy}
            >
              ✦ NEW GAME <span className="kbd">새로 시작</span>
            </Btn>
            {props.saveNote && <div className="tiny gold-t">{props.saveNote}</div>}
            {props.hasSave && <div className="tiny dim" style={{ textAlign: 'center' }}>새로 시작해도 기존 세이브는 설정에서 확인 후에만 덮어씁니다.</div>}
          </div>
        )}

        {mode === 'name' && (
          <form
            className="title-menu win gold"
            onSubmit={(e) => {
              e.preventDefault();
              if (props.hasSave && !window.confirm('기존 세이브 위에 새 게임을 시작할까요? (이전 세이브는 백업 슬롯에 1회분 보관됩니다)')) return;
              playSfx('confirm');
              props.onNew(name.trim() || '모험가');
            }}
          >
            <div className="win-title">모험가의 이름은?</div>
            <input className="input" maxLength={12} placeholder="이름 (최대 12자)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <div className="row" style={{ marginTop: 10 }}>
              <Btn variant="ghost" onClick={() => setMode('menu')} sfx="cancel">
                뒤로
              </Btn>
              <button type="submit" className="btn gold grow">
                모험 시작
              </button>
            </div>
          </form>
        )}

        <div className="press-start" style={{ opacity: blink ? 1 : 0 }}>
          — 공부할수록 강해지는 레트로 RPG —
        </div>
      </div>
      <div className="title-foot tiny dim">LIFE RPG v3.0 · 진행 상황은 이 브라우저에 자동 저장됩니다</div>
    </div>
  );
}
