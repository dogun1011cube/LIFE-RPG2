import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx } from '../../audio/sfx';
import { getItem } from '../../data/items';
import { getMonster } from '../../data/monsters';
import { SKILLS } from '../../data/skills';
import type { BattleEvent, BattleSetup, BattleState, PlayerAction } from '../../game/battle';
import { availableSkills, createBattle, resolveTurn } from '../../game/battle';
import { removeEntry } from '../../game/core';
import type { BattleResult } from '../../game/encounters';
import { finishBattle, startFieldBattle, startTowerBattle } from '../../game/encounters';
import { deriveStats } from '../../game/progression';
import { floorAccess } from '../../game/tower';
import { BattleScene } from '../../render/BattleScene';
import { act, getState, useGame } from '../../store/store';
import { Bar, Btn, ItemIcon, PixelIcon, RarityText } from '../components';
import { heroAura, heroPalette } from '../heroLook';
import { go, setUI } from '../uiStore';

type Menu = 'main' | 'skill' | 'item';

interface LogLine {
  id: number;
  text: string;
  tone?: string;
}
let logId = 1;

export function BattleView({ setup }: { setup: BattleSetup }) {
  const s = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BattleScene | null>(null);
  const battleRef = useRef<BattleState | null>(null);
  const [battle, setBattle] = useState<BattleState>(() => {
    const st = getState();
    const b = createBattle(setup, deriveStats(st), st.player.hp, st.player.mp, st.player.gold);
    battleRef.current = b;
    return b;
  });
  const [busy, setBusy] = useState(true);
  const [menu, setMenu] = useState<Menu>('main');
  const [log, setLog] = useState<LogLine[]>([]);
  const [pHp, setPHp] = useState(battle.player.hp);
  const [pMp, setPMp] = useState(battle.player.mp);
  const [mHp, setMHp] = useState(battle.monster.hp);
  const [mon, setMon] = useState(battle.monster);
  const [counters, setCounters] = useState<{ doom: number | null; death: number | null }>({ doom: battle.monster.doom, death: null });
  const [result, setResult] = useState<BattleResult | null>(null);
  const [speed, setSpeed] = useState(() => {
    try {
      return Number(sessionStorage.getItem('lifeRPG3.bspeed')) || 1;
    } catch {
      return 1;
    }
  });
  const [encounter, setEncounter] = useState(true);

  const pushLog = useCallback((text: string, tone?: string) => {
    setLog((l) => [...l.slice(-5), { id: logId++, text, tone }]);
  }, []);

  // scene lifecycle
  useEffect(() => {
    const scene = new BattleScene(canvasRef.current!);
    sceneRef.current = scene;
    const st = getState();
    scene.reduceMotion = st.settings.reduceMotion;
    scene.speed = speed;
    scene.setBackground(setup.bg);
    scene.setHero(heroPalette(st), heroAura(st));
    scene.setMonster(battle.monster, true);
    playSfx('door');
    const first = battle.monster;
    pushLog(`${first.name} (Lv ${first.level})이(가) 나타났다!`, 'warn');
    if (setup.waves.length > 1) pushLog(`연속 전투! 적이 ${setup.waves.length}번 나타난다.`, 'warn');
    if (setup.modifiers.curse4) pushLog('죽음의 저주: 모든 회복 효과가 절반이 된다.', 'bad');
    if (setup.modifiers.doom13) pushLog(`파멸의 시계가 움직이기 시작했다… (봉인 ${setup.modifiers.seals ?? 0}/3 해제)`, 'bad');
    const t = setTimeout(() => {
      setEncounter(false);
      setBusy(false);
    }, 650);
    return () => {
      clearTimeout(t);
      scene.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.speed = speed;
    try {
      sessionStorage.setItem('lifeRPG3.bspeed', String(speed));
    } catch {
      /* ignore */
    }
  }, [speed]);

  const playEvent = async (ev: BattleEvent) => {
    const scene = sceneRef.current!;
    const later = (ms: number, fn: () => void) => setTimeout(fn, ms / scene.speed);
    switch (ev.k) {
      case 'text':
        pushLog(ev.text, ev.tone);
        return;
      case 'pAttack': {
        const melee = ev.fx === 'slash' || ev.fx === 'insight' || ev.fx === 'gravity';
        later(melee ? (ev.hitIndex === 0 ? 150 : 0) : 260, () => {
          if (ev.miss) playSfx('miss');
          else {
            playSfx(ev.crit ? 'crit' : melee ? 'sword' : 'magic');
            setTimeout(() => playSfx(getMonster(battleRef.current!.monster.defId).family === 'slime' ? 'slime' : 'hit'), 60);
            setMHp(ev.mHp);
          }
        });
        if (!ev.miss) pushLog(`${ev.crit ? '치명타! ' : ''}${ev.dmg} 피해!`, ev.crit ? 'crit' : 'good');
        else pushLog('공격이 빗나갔다!', 'info');
        await scene.play(ev);
        return;
      }
      case 'pHeal':
        playSfx('heal');
        setPHp(ev.pHp);
        setPMp(ev.pMp);
        if (ev.hp) pushLog(`HP ${ev.hp} 회복!`, 'good');
        if (ev.mp) pushLog(`MP ${ev.mp} 회복!`, 'good');
        await scene.play(ev);
        return;
      case 'pBuff':
        playSfx('buff');
        pushLog(ev.text, 'good');
        await scene.play(ev);
        return;
      case 'pDefend':
        playSfx('confirm');
        setPMp(ev.pMp);
        await scene.play(ev);
        return;
      case 'pMp':
        setPMp(ev.pMp);
        return;
      case 'mCharge':
        playSfx('magic');
        pushLog(ev.text, 'warn');
        await scene.play(ev);
        return;
      case 'mAttack':
        later(ev.fx === 'melee' ? 130 : 280, () => {
          if (ev.miss) playSfx('miss');
          else {
            playSfx('monsterAttack');
            setTimeout(() => playSfx('playerHurt'), 50);
            setPHp(ev.pHp);
          }
        });
        if (ev.miss) pushLog('공격을 피했다!', 'good');
        else pushLog(`${ev.dmg} 피해를 입었다${ev.guarded ? ' (방어)' : ''}`, 'bad');
        await scene.play(ev);
        setPHp(ev.pHp);
        return;
      case 'mHeal':
        playSfx('heal');
        setMHp(ev.mHp);
        await scene.play(ev);
        return;
      case 'mBuff':
        playSfx('buff');
        pushLog(ev.text, 'warn');
        await scene.play(ev);
        return;
      case 'mRevive':
        playSfx('magic');
        pushLog(ev.text, 'warn');
        await scene.play(ev);
        setMHp(ev.mHp);
        return;
      case 'mDefeated':
        playSfx(getMonster(battleRef.current!.monster.defId).family === 'slime' ? 'slime' : 'defeatMonster');
        pushLog(`${ev.name}을(를) 쓰러뜨렸다!`, 'good');
        await scene.play(ev);
        return;
      case 'wave':
        setMon(ev.monster);
        setMHp(ev.monster.hp);
        setCounters((c) => ({ ...c, death: null, doom: ev.monster.doom }));
        playSfx('door');
        await scene.play(ev);
        return;
      case 'counter':
        setCounters((c) => ({ ...c, [ev.kind]: ev.value }));
        return;
      case 'pDot':
        playSfx('playerHurt');
        setPHp(ev.pHp);
        pushLog(ev.text, 'bad');
        await scene.play(ev);
        return;
      case 'escape':
        if (ev.ok) playSfx('cancel');
        await scene.play(ev);
        return;
      case 'victory':
        pushLog('승리했다!', 'good');
        await scene.play(ev);
        return;
      case 'defeat':
        pushLog('쓰러지고 말았다…', 'bad');
        await scene.play(ev);
        return;
    }
  };

  const doAction = async (action: PlayerAction) => {
    if (busy || !battleRef.current || battleRef.current.over) return;
    setBusy(true);
    setMenu('main');
    if (action.type === 'item') {
      const entry = getState().inventory.find((e) => e.itemId === action.itemId);
      if (!entry) {
        setBusy(false);
        return;
      }
      const r = act((d) => {
        removeEntry(d, entry.uid, 1);
        d.stats.itemsUsed += 1;
      });
      if (!r.ok) {
        setBusy(false);
        return;
      }
    }
    const { state, events } = resolveTurn(battleRef.current, action, Math.random);
    battleRef.current = state;
    for (const ev of events) await playEvent(ev);
    setBattle(state);
    setPHp(state.player.hp);
    setPMp(state.player.mp);
    if (state.over) {
      await new Promise((r) => setTimeout(r, 350));
      const r = act((d, c) => finishBattle(d, c, state));
      if (r.ok) setResult(r.value);
      else setResult({ outcome: state.over, exp: 0, gold: 0, items: [], lines: [], firstClear: false, newBosses: [] });
    }
    setBusy(false);
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (result || busy) return;
      if (e.key === 'Escape') setMenu('main');
      if (menu !== 'main') return;
      if (e.key === '1') void doAction({ type: 'attack' });
      if (e.key === '2') setMenu('skill');
      if (e.key === '3') setMenu('item');
      if (e.key === '4') void doAction({ type: 'defend' });
      if (e.key === '5') void doAction({ type: 'escape' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = () => setUI({ battle: null });
  const again = () => {
    const r = act((d, c) => (setup.kind === 'tower' && setup.floor ? startTowerBattle(d, c, setup.floor) : startFieldBattle(d, c, setup.locationId)));
    if (r.ok) setUI({ battle: { ...r.value } });
  };
  const nextFloor = () => {
    const f = (setup.floor || 0) + 1;
    setUI({ battle: null, towerFocus: f });
    go('tower');
  };

  const def = getMonster(mon.defId);
  const skills = availableSkills(battle.player.level);
  const items = s.inventory.filter((e) => getItem(e.itemId).battle);
  const isBoss = mon.boss;
  const p = battle.player;

  return (
    <div className={`battle-view ${setup.modifiers.doom13 ? 'f13' : ''}`}>
      <div className="bv-top">
        <div className="bv-title">
          <PixelIcon icon="swords" tint="#ff6b6b" size={18} /> {setup.title}
        </div>
        <span className="chip">TURN {battle.turn}</span>
        <button className="chip bv-speed" onClick={() => setSpeed(speed === 1 ? 2 : 1)} title="전투 속도">
          속도 ×{speed}
        </button>
      </div>

      <div className="bv-stage">
        <canvas ref={canvasRef} className="pixel bv-canvas" />
        {encounter && <div className="encounter-flash" />}
        <div className={`nameplate mon ${isBoss ? 'boss' : ''}`}>
          <div className="row between">
            <b>
              {mon.name} <span className="tiny muted">Lv {mon.level}</span>
            </b>
            {isBoss && <span className="tag" style={{ background: 'var(--red)', color: '#fff' }}>BOSS</span>}
            {mon.elite && !isBoss && <span className="tag" style={{ background: 'var(--orange)' }}>ELITE</span>}
          </div>
          <Bar kind={isBoss ? 'boss' : 'hp'} value={mHp} max={mon.maxHp} size="tall" label={`${mHp.toLocaleString()} / ${mon.maxHp.toLocaleString()}`} />
          {setup.waves.length > 1 && <div className="tiny muted">WAVE {battle.wave + 1} / {setup.waves.length}</div>}
        </div>
        {(counters.doom !== null || counters.death !== null) && (
          <div className="counters">
            {counters.doom !== null && (
              <div className={`counter doom ${counters.doom <= 2 ? 'urgent' : ''}`}>
                <span className="tiny">파멸의 시계</span>
                <b>{counters.doom}</b>
                {counters.doom === 1 && <span className="tiny blink">다음 턴에 울린다 — 방어!</span>}
              </div>
            )}
            {counters.death !== null && (
              <div className={`counter death ${counters.death <= 1 ? 'urgent' : ''}`}>
                <span className="tiny">죽음의 선고</span>
                <b>{counters.death}</b>
                {counters.death === 1 && <span className="tiny blink">다음 턴 집행 — 방어!</span>}
              </div>
            )}
          </div>
        )}
        <div className="nameplate hero">
          <b>
            {s.player.name} <span className="tiny muted">Lv {p.level}</span>
          </b>
          <Bar kind="hp" value={pHp} max={p.maxHp} size="tall" label={`HP ${pHp} / ${p.maxHp}`} />
          <Bar kind="mp" value={pMp} max={p.maxMp} label={`MP ${pMp} / ${p.maxMp}`} />
          <div className="row tiny" style={{ gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            {p.buffs.map((b, i) => (
              <span key={i} className="buff-chip">
                {b.kind === 'atk' ? 'ATK' : 'DEF'}+{b.pct}% ({b.turns})
              </span>
            ))}
            {p.curse && <span className="buff-chip bad">저주 ATK−{p.curse.pct}% ({p.curse.turns})</span>}
            {p.poison && <span className="buff-chip bad">중독 {p.poison.pct}%/턴 ({p.poison.turns})</span>}
            {p.armorBreak && <span className="buff-chip bad">DEF−{p.armorBreak.pct}% ({p.armorBreak.turns})</span>}
            {battle.monster.charging === 'ult' ? (
              <span className="buff-chip bad blink">궁극기 준비 중! 방어하세요</span>
            ) : battle.monster.charging ? (
              <span className="buff-chip bad blink">적이 힘을 모으는 중!</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bv-bottom">
        <div className="bv-log win">
          {log.map((l) => (
            <div key={l.id} className={`log-line ${l.tone || ''}`}>
              ▸ {l.text}
            </div>
          ))}
        </div>
        <div className="bv-cmd win gold">
          {menu === 'main' && (
            <div className="cmd-grid">
              <CmdBtn n={1} label="ATTACK" ko="공격" icon="sword" tint="#dee2e6" disabled={busy} onClick={() => doAction({ type: 'attack' })} />
              <CmdBtn n={2} label="SKILL" ko="스킬" icon="star" tint="#74c0fc" disabled={busy} onClick={() => setMenu('skill')} />
              <CmdBtn n={3} label="ITEM" ko="아이템" icon="potion" tint="#ff6b6b" disabled={busy} onClick={() => setMenu('item')} />
              <CmdBtn n={4} label="DEFEND" ko="방어" icon="armor" tint="#a5d8ff" disabled={busy} onClick={() => doAction({ type: 'defend' })} />
              <CmdBtn
                n={5}
                label={def.family === 'dummy' ? 'FINISH' : 'ESCAPE'}
                ko={def.family === 'dummy' ? '훈련 종료' : setup.canEscape ? '도망' : '도망 불가'}
                icon="boots"
                tint="#e9c46a"
                disabled={busy || (!setup.canEscape && def.family !== 'dummy')}
                onClick={() => doAction({ type: 'escape' })}
              />
            </div>
          )}
          {menu === 'skill' && (
            <div className="sub-menu">
              {skills.map((sk) => (
                <button key={sk.id} className="sub-item" disabled={busy || pMp < sk.mp} onClick={() => doAction({ type: 'skill', skillId: sk.id })}>
                  <b>{sk.name}</b>
                  <span className="tiny muted grow">{sk.desc}</span>
                  <span className="tiny blue-t">MP {sk.mp}</span>
                </button>
              ))}
              {SKILLS.filter((x) => x.level > p.level).slice(0, 1).map((x) => (
                <div key={x.id} className="tiny dim" style={{ padding: 4 }}>
                  다음 스킬: Lv {x.level}
                </div>
              ))}
              <button className="btn ghost sm" onClick={() => setMenu('main')}>
                ◀ 뒤로 (Esc)
              </button>
            </div>
          )}
          {menu === 'item' && (
            <div className="sub-menu">
              {items.length === 0 && <div className="tiny muted" style={{ padding: 6 }}>전투에서 쓸 수 있는 아이템이 없어요. 상점에서 물약을 사 두세요.</div>}
              {items.map((e) => {
                const it = getItem(e.itemId);
                return (
                  <button key={e.uid} className="sub-item" disabled={busy} onClick={() => doAction({ type: 'item', itemId: it.id, name: it.name, effect: it.use! })}>
                    <ItemIcon item={it} size={22} />
                    <b>{it.name}</b>
                    <span className="tiny muted grow">{it.desc}</span>
                    <span className="tiny">×{e.qty}</span>
                  </button>
                );
              })}
              <button className="btn ghost sm" onClick={() => setMenu('main')}>
                ◀ 뒤로 (Esc)
              </button>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="bv-result">
          <div className={`win ${result.outcome === 'victory' ? 'gold' : result.outcome === 'defeat' ? 'red' : ''} result-card`}>
            <div className={`result-title ${result.outcome}`}>{result.outcome === 'victory' ? 'VICTORY!' : result.outcome === 'defeat' ? 'DEFEAT…' : setup.kind === 'training' ? 'TRAINING END' : 'ESCAPED'}</div>
            {result.outcome === 'victory' && (
              <div className="result-rewards">
                <div>
                  <PixelIcon icon="star" tint="#b57bff" size={20} /> EXP <b className="purple-t">+{result.exp}</b>
                </div>
                <div>
                  <PixelIcon icon="coin" tint="#ffcf4a" size={20} /> GOLD <b className="gold-t">+{result.gold}</b>
                </div>
              </div>
            )}
            {result.items.length > 0 && (
              <div className="result-items">
                <div className="tiny muted">전리품</div>
                {result.items.map((id, i) => (
                  <div key={i} className="row">
                    <ItemIcon item={id} size={24} /> <RarityText rarity={getItem(id).rarity}>{getItem(id).name}</RarityText>
                  </div>
                ))}
              </div>
            )}
            {result.newBosses.length > 0 && <div className="gold-t small">보스 격파: {result.newBosses.join(', ')}</div>}
            {result.lines.map((l) => (
              <div key={l} className="small">
                {l}
              </div>
            ))}
            {result.outcome === 'defeat' && <div className="small muted">공부해서 레벨을 올리거나, 장비를 강화하고 다시 도전하세요!</div>}
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              {setup.kind === 'tower' && result.outcome === 'victory' && result.firstClear && floorAccess(getState(), (setup.floor || 0) + 1).ok ? (
                <Btn variant="purple" onClick={nextFloor} sfx="stairs">
                  다음 층 도전 ({(setup.floor || 0) + 1}F) ▶
                </Btn>
              ) : null}
              {(setup.kind === 'field' || setup.kind === 'arena') && s.player.stamina >= setup.staminaSpent && s.day.status === 'active' && (
                <Btn variant="red" onClick={again}>
                  다시 싸우기 (기력 {setup.staminaSpent})
                </Btn>
              )}
              {setup.kind === 'training' && (
                <Btn variant="ghost" onClick={again}>
                  다시 훈련
                </Btn>
              )}
              <Btn variant="gold" onClick={close} sfx="confirm" autoFocus>
                {result.outcome === 'defeat' ? '마을로 돌아가기' : '계속'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CmdBtn(props: { n: number; label: string; ko: string; icon: string; tint: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      className="cmd-btn"
      disabled={props.disabled}
      onClick={() => {
        playSfx('select');
        props.onClick();
      }}
    >
      <span className="cursor-slot">
        <span className="cursor-arrow" />
      </span>
      <PixelIcon icon={props.icon} tint={props.tint} size={20} />
      <span className="col0">
        <b>{props.label}</b>
        <span className="tiny muted">{props.ko}</span>
      </span>
      <span className="tiny dim">{props.n}</span>
    </button>
  );
}
