import { useEffect, useState } from 'react';
import { playSfx } from '../../audio/sfx';
import { Btn, MonsterSprite } from '../components';

const BASE = import.meta.env.BASE_URL;

/** Story intro — reuses the player's original intro art and slime lines. */
const SCENES: { img: string; lines: string[]; slime?: boolean }[] = [
  {
    img: 'intro1_px.png',
    lines: ['구름 위로 솟은 탑이 있다.', '정상까지 오른 자는 아무도 없다고 한다.', '탑을 오르는 힘은 오직 하나 — 현실에서 쌓은 노력.'],
  },
  {
    img: 'intro2_px.png',
    lines: ['성 안의 왕좌는 비어 있다.', '탑의 100층, 그 위에서 "최종 시험관"이 기다린다.'],
  },
  {
    img: 'intro3_px.png',
    slime: true,
    lines: ['이 성을 올라가기 위해서는 반드시 나를 이겨야만 한닷!!!', '나를 이길 수 있는 방법은 단 하나밖에 없지 (후훗)', '그것은 바로 공부닷!!!'],
  },
];

export function Intro({ onDone }: { onDone: () => void }) {
  const [scene, setScene] = useState(0);
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const sc = SCENES[scene];
  const text = sc.lines[line];

  useEffect(() => {
    setChars(0);
    const id = setInterval(() => {
      setChars((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        if (c % 3 === 0) playSfx('click');
        return c + 1;
      });
    }, 38);
    return () => clearInterval(id);
  }, [scene, line, text]);

  const advance = () => {
    if (chars < text.length) {
      setChars(text.length);
      return;
    }
    if (line < sc.lines.length - 1) setLine(line + 1);
    else if (scene < SCENES.length - 1) {
      playSfx('door');
      setScene(scene + 1);
      setLine(0);
    } else onDone();
  };

  const last = scene === SCENES.length - 1 && line === sc.lines.length - 1 && chars >= text.length;

  return (
    <div className="intro-screen" onClick={last ? undefined : advance}>
      <div key={scene} className="intro-bg pixel" style={{ backgroundImage: `url(${BASE}assets/${sc.img})` }} />
      <div className="title-vignette" />
      {sc.slime && (
        <div className="intro-slime">
          <MonsterSprite id="slime_king" scale={8} />
        </div>
      )}
      <div className="intro-box win">
        {sc.slime && <div className="intro-speaker">슬라임 킹</div>}
        <div className="intro-text">
          {text.slice(0, chars)}
          <span className="blink">▼</span>
        </div>
        <div className="row between" style={{ marginTop: 10 }}>
          <button className="btn ghost sm" onClick={(e) => (e.stopPropagation(), onDone())}>
            SKIP
          </button>
          {last ? (
            <Btn variant="gold" onClick={onDone} sfx="confirm" autoFocus>
              성 위로 올라가기 위해 공부를 하시겠습니까? ▶
            </Btn>
          ) : (
            <span className="tiny muted">클릭 / 터치로 진행</span>
          )}
        </div>
      </div>
    </div>
  );
}
