import { useEffect, useState } from 'react';
import { playSfx, setMusic, setSound } from './audio/sfx';
import { fullHeal } from './game/core';
import { createNewGame } from './game/state';
import type { GameState } from './game/types';
import { legacyAlreadyImported, loadSave, markLegacyImported, migrateLegacy, readLegacy } from './store/persistence';
import { act, onEvents, setState, useMaybeGame } from './store/store';
import { Backdrop } from './ui/Backdrop';
import { Game } from './ui/Game';
import { Intro } from './ui/screens/Intro';
import { Title } from './ui/screens/Title';
import type { LoadResult } from './store/persistence';

type Phase = 'title' | 'intro' | 'game';

export function App() {
  const [phase, setPhase] = useState<Phase>('title');
  const [load] = useState<LoadResult>(() => {
    const r = loadSave();
    if (r.state) setState(r.state, false);
    return r;
  });
  const [legacy] = useState(() => (!load.state && !legacyAlreadyImported() ? readLegacy() : null));
  const s = useMaybeGame();

  // global SFX from game events
  useEffect(() => {
    return onEvents((events) => {
      for (const e of events) if (e.type === 'sfx') playSfx(e.name);
    });
  }, []);

  // apply settings
  useEffect(() => {
    if (!s) {
      setSound(true, 0.6);
      return;
    }
    setSound(s.settings.sound, s.settings.volume);
    setMusic(s.settings.music && phase === 'game');
    document.body.classList.toggle('scanlines', s.settings.scanlines);
    document.body.classList.toggle('reduce-motion', s.settings.reduceMotion);
  }, [s?.settings, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNew = (name: string) => {
    const g = createNewGame(name);
    setState(g);
    setPhase('intro');
  };

  const importLegacy = () => {
    if (!legacy) return;
    const g: GameState = migrateLegacy(legacy);
    setState(g);
    act((d) => fullHeal(d));
    markLegacyImported();
    act((d, ctx) => {
      ctx.events.push({ type: 'toast', kind: 'save', title: '이전 데이터 이전 완료', text: '공부 기록·EXP·골드를 그대로 가져왔어요. 옛 층수는 기력으로 바뀌었습니다.' });
    });
    setPhase('game');
  };

  return (
    <>
      <Backdrop />
      {phase === 'title' && (
        <Title
          hasSave={!!load.state}
          saveNote={load.note}
          legacy={legacy}
          onContinue={() => setPhase('game')}
          onNew={startNew}
          onImportLegacy={importLegacy}
        />
      )}
      {phase === 'intro' && (
        <Intro
          onDone={() => {
            act((d) => {
              d.settings.introSeen = true;
            });
            setPhase('game');
          }}
        />
      )}
      {phase === 'game' && s && <Game />}
    </>
  );
}
