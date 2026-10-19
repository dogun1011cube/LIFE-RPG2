import { useEffect, useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { Panel } from '../common/Panel';
import { orion, SUGGESTED_QUESTIONS } from '../../ai/OrionAssistant';
import { useGame } from '../../state/gameStore';
import { runtime } from '../../game/runtime';
import { playSfx } from '../../audio/sfx';

interface Msg {
  from: 'user' | 'orion';
  text: string;
}

// Chat history persists across panel open/close for the session
const history: Msg[] = [
  { from: 'orion', text: '안녕하세요, 탐사관님. ORION입니다. 기지 데이터를 실시간으로 분석해 답변드립니다. 무엇이 궁금하신가요?' },
];

export function OrionPanel() {
  const [messages, setMessages] = useState<Msg[]>(history);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const ask = async (query: string) => {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    const user: Msg = { from: 'user', text: q };
    history.push(user);
    setMessages([...history]);
    setText('');
    const { game, report } = useGame.getState();
    const reply = await orion.respond(q, { game, report, player: { x: runtime.player.pos.x, z: runtime.player.pos.z } });
    history.push({ from: 'orion', text: reply });
    if (history.length > 60) history.splice(1, history.length - 60);
    setMessages([...history]);
    setBusy(false);
    playSfx('click');
  };

  return (
    <Panel title="ORION" subtitle={orion.label} icon={<Bot size={18} />} className="orion-panel" hotkey="O">
      <div className="orion-messages" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`orion-msg orion-${m.from}`}>
            {m.from === 'orion' && <span className="orion-avatar">O</span>}
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <div className="orion-suggest">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button key={q} className="chip" onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>
      <form
        className="orion-input"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
      >
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="ORION에게 질문하기…" maxLength={200} />
        <button className="btn btn-primary" type="submit" disabled={!text.trim() || busy}>
          <Send size={14} /> 전송
        </button>
      </form>
    </Panel>
  );
}
