import { ATK_INFO, CHARACTERS, getCharacter } from '../data/characters';
import type { CharacterDef } from '../data/characters';
import { skillMp } from '../data/characters';
import { deriveStats } from '../game/progression';
import { setActiveCharacter } from '../game/inventory';
import type { GameState } from '../game/types';
import { act, useGame } from '../store/store';
import { go } from './uiStore';
import { Btn, PixelIcon } from './components';
import { spriteCanvas, toDataURL } from '../render/draw';

function CharFace({ ch, size = 4 }: { ch: CharacterDef; size?: number }) {
  const url = toDataURL(spriteCanvas(ch.sprite, ch.palette || {}), size);
  return <img className="pixel" src={url} alt={ch.name} draggable={false} />;
}

/** Row of owned / unowned characters; click an owned one to bring it into battle. */
export function CharacterPicker({ compact }: { compact?: boolean }) {
  const s = useGame();
  return (
    <div className={`char-picker ${compact ? 'compact' : ''}`}>
      {CHARACTERS.map((ch) => {
        const owned = s.ownedCharacters.includes(ch.id);
        const on = s.player.activeCharacter === ch.id;
        return (
          <button
            key={ch.id}
            className={`char-card ${on ? 'on' : ''} ${owned ? '' : 'locked'}`}
            style={{ ['--tc' as string]: ch.color } as React.CSSProperties}
            title={owned ? `${ch.title} ${ch.name} — ${ATK_INFO[ch.type].ko} 유형` : '소환의 제단에서 만날 수 있어요'}
            onClick={() => {
              if (!owned) {
                go('gacha');
                return;
              }
              if (!on) act((d, c) => setActiveCharacter(d, c, ch.id));
            }}
          >
            <span className={`char-face ${owned ? '' : 'silhouette'}`}>
              <CharFace ch={ch} size={compact ? 3 : 4} />
            </span>
            <span className="char-name">{owned ? ch.name : '???'}</span>
            <span className="tiny" style={{ color: ATK_INFO[ch.type].color }}>
              {ATK_INFO[ch.type].ko}
            </span>
            {on && <span className="char-on tiny">출전</span>}
            {!owned && <span className="char-on tiny dim">소환</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Full detail of the active character: type, modifiers and the four Q/W/E/R skills. */
export function CharacterDetail({ state }: { state: GameState }) {
  const ch = getCharacter(state.player.activeCharacter);
  const d = deriveStats(state);
  const info = ATK_INFO[ch.type];
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="char-face big">
          <CharFace ch={ch} size={6} />
        </span>
        <div className="grow">
          <div style={{ color: ch.color }}>
            <b>{ch.title}</b> <span className="big">{ch.name}</span>
          </div>
          <div className="small">
            <span className="tag" style={{ background: info.color, color: '#000' }}>
              {info.ko} 유형
            </span>
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>
            {info.desc}
          </div>
        </div>
      </div>
      <div className="tiny muted">{ch.desc}</div>
      <div className="tiny">
        보정:{' '}
        {[
          ['HP', ch.mods.hp],
          ['방어', ch.mods.def],
          ['공격', ch.mods.atk],
          ['마공', ch.mods.matk],
        ]
          .filter(([, v]) => v !== 1)
          .map(([k, v]) => (
            <span key={k as string} className={(v as number) > 1 ? 'green-t' : 'red-t'} style={{ marginRight: 6 }}>
              {k} {(v as number) > 1 ? '+' : ''}
              {Math.round(((v as number) - 1) * 100)}%
            </span>
          ))}
        {ch.mods.crit ? <span className="green-t">치명타 +{ch.mods.crit}%</span> : null}
      </div>
      <div className="col" style={{ gap: 4 }}>
        {ch.skills.map((sk) => (
          <div key={sk.id} className="skill-row">
            <span className="sk-key sm" style={{ background: ch.color }}>
              {sk.key}
            </span>
            <b>{sk.name}</b>
            <span className="tiny muted grow">{sk.desc}</span>
            <span className="tiny blue-t">
              MP {skillMp(d.maxMp, sk)} · 쿨 {sk.cd}
            </span>
          </div>
        ))}
      </div>
      <Btn size="sm" variant="ghost" onClick={() => go('gacha')}>
        <PixelIcon icon="orb" tint="#e599f7" size={14} /> 새 캐릭터 소환하러 가기
      </Btn>
    </div>
  );
}
