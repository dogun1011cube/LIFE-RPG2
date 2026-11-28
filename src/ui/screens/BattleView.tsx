import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx } from '../../audio/sfx';
import { getItem } from '../../data/items';
import { getMonster } from '../../data/monsters';
import { ATK_INFO, affinityOf, getCharacter, SKILL_KEYS } from '../../data/characters';
import type { BattleEvent, BattleSetup, BattleState, PlayerAction } from '../../game/battle';
import { activeSkills, createBattle, resolveTurn, skillState } from '../../game/battle';
import { removeEntry } from '../../game/core';
import type { BattleResult } from '../../game/encounters';
import { continueTower, finishBattle, startFieldBattle, startTowerBattle } from '../../game/encounters';
import { deriveStats } from '../../game/progression';
import { towerNextStep } from '../../game/tower';
import { PETS } from '../../data/pets';
import { BattleScene, MELEE_FX } from '../../render/BattleScene';
import { act, getState, useGame } from '../../store/store';
import { Bar, Btn, ItemIcon, PixelIcon, RarityText } from '../components';
import { heroAura, heroPalette, heroSprite } from '../heroLook';
import { go, setUI } from '../uiStore';

type Menu = 'main' | 'item';

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
    const pet = st.pets?.find((x) => x.uid === st.player.activePet) ?? null;
    const b = createBattle(setup, deriveStats(st), st.player.hp, st.player.mp, st.player.gold, st.player.activeCharacter, pet);
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
    scene.setHero(heroSprite(st), heroPalette(st), heroAura(st));
    {
      const pet = st.pets?.find((x) => x.uid === st.player.activePet);
      scene.setPet(pet ? pet.kind : null, pet?.rarity === 'secret');
    }
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
        const melee = MELEE_FX.includes(ev.fx);
        later(melee ? (ev.hitIndex === 0 ? 150 : 0) : 260, () => {
          if (ev.miss) playSfx('miss');
          else {
            playSfx(ev.crit ? 'crit' : melee ? 'sword' : ev.type === 'holy' ? 'heal' : 'magic');
            setTimeout(() => playSfx(getMonster(battleRef.current!.monster.defId).family === 'slime' ? 'slime' : 'hit'), 60);
            setMHp(ev.mHp);
          }
        });
        if (!ev.miss) pushLog(`${ev.crit ? '치명타! ' : ''}${ev.dmg} 피해!${ev.aff === 'weak' ? ' (약점!)' : ev.aff === 'resist' ? ' (내성)' : ev.aff === 'immune' ? ' (면역에 가까움)' : ''}`, ev.crit ? 'crit' : 'good');
        else pushLog('공격이 빗나갔다!', 'info');
        await scene.play(ev);
        return;
      }
      case 'petAct':
        later(140, () => {
          playSfx(ev.hitIndex ? 'hit' : 'magic');
          setMHp(ev.mHp);
        });
        pushLog(`${PETS[ev.kind].name}: ${ev.dmg} 피해!${ev.aff === 'weak' ? ' (약점!)' : ''}`, 'good');
        await scene.play(ev);
        return;
      case 'mDot':
        playSfx('hit');
        setMHp(ev.mHp);
        pushLog(`${ev.kind === 'burn' ? '화상' : '중독'} 피해 ${ev.dmg}!`, 'good');
        await scene.play(ev);
        return;
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
      const k = e.key.toUpperCase();
      const cur = battleRef.current;
      if ((SKILL_KEYS as string[]).includes(k) && cur) {
        const sk = activeSkills(cur.player.charId).find((x) => x.key === k);
        if (sk && skillState(cur, sk).ready) void doAction({ type: 'skill', skillId: sk.id });
        return;
      }
      if (e.key === '1') void doAction({ type: 'attack' });
      if (e.key === '2') setMenu('item');
      if (e.key === '3') void doAction({ type: 'defend' });
      if (e.key === '4' && (setup.canEscape || def.family === 'dummy')) void doAction({ type: 'escape' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = () => setUI({ battle: null });
  const again = () => {
    const r = act((d, c) => (setup.kind === 'tower' && setup.floor ? startTowerBattle(d, c, setup.floor) : startFieldBattle(d, c, setup.locationId)));
    if (r.ok) setUI({ battle: { ...r.value } });
  };
  const goFloor = (f: number) => {
    setUI({ battle: null, towerFocus: f });
    go('tower');
  };
  // continue climbing straight from the result screen
  const towerNext = setup.kind === 'tower' && result?.outcome === 'victory' ? towerNextStep(s, setup.floor || 0) : null;
  const climbBlock = towerNext?.kind === 'battle' ? (s.day.status !== 'active' ? '잠든 상태에서는 전투할 수 없어요.' : s.player.stamina < towerNext.stamina ? `기력 부족 (필요 ${towerNext.stamina} · 보유 ${s.player.stamina})` : null) : null;
  const climb = () => {
    const r = act((d, c) => continueTower(d, c, setup.floor || 0));
    if (r.ok) setUI({ battle: { ...r.value } });
  };

  const def = getMonster(mon.defId);
  const ch = getCharacter(battle.player.charId);
  const skills = ch.skills;
  const aff = affinityOf(mon.defId);
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
          <div className="aff-row tiny">
            {aff.weak.map((t) => (
              <span key={'w' + t} className="aff weak" style={{ ['--tc' as string]: ATK_INFO[t].color } as React.CSSProperties}>
                약점 {ATK_INFO[t].ko}
              </span>
            ))}
            {aff.resist.map((t) => (
              <span key={'r' + t} className="aff resist">
                내성 {ATK_INFO[t].ko}
              </span>
            ))}
            {aff.immune.map((t) => (
              <span key={'i' + t} className="aff immune">
                면역 {ATK_INFO[t].ko}
              </span>
            ))}
          </div>
          {(battle.monster.burn || battle.monster.poison) && (
            <div className="aff-row tiny">
              {battle.monster.burn && <span className="aff dot-burn">화상 {battle.monster.burn.dmg}/턴 ({battle.monster.burn.turns})</span>}
              {battle.monster.poison && <span className="aff dot-poison">중독 {battle.monster.poison.dmg}/턴 ({battle.monster.poison.turns})</span>}
            </div>
          )}
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
            <>
              <div className="cmd-head tiny">
                <span style={{ color: ch.color }}>
                  <b>{ch.title}</b> {ch.name}
                </span>
                <span className="muted">
                  {ATK_INFO[ch.type].ko} 유형
                </span>
              </div>
              <div className="skill-bar">
                {skills.map((sk) => {
                  const st = skillState(battle, sk);
                  return (
                    <button
                      key={sk.id}
                      className={`skill-btn ${st.ready ? '' : 'off'}`}
                      style={{ ['--tc' as string]: ch.color } as React.CSSProperties}
                      disabled={busy || !st.ready}
                      title={`${sk.desc}\nMP ${st.mp} · 쿨타임 ${sk.cd}턴`}
                      onClick={() => {
                        playSfx('select');
                        void doAction({ type: 'skill', skillId: sk.id });
                      }}
                    >
                      <span className="sk-key">{sk.key}</span>
                      <span className="sk-name">{sk.name}</span>
                      <span className="sk-meta tiny">
                        {st.cd > 0 ? <b className="red-t">쿨 {st.cd}</b> : st.lackMp ? <b className="red-t">MP 부족</b> : <span className="blue-t">MP {st.mp}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="cmd-row">
                <CmdBtn n={1} label="ATTACK" ko="기본 공격" icon="sword" tint={ATK_INFO[ch.type].color} disabled={busy} onClick={() => doAction({ type: 'attack' })} />
                <CmdBtn n={2} label="ITEM" ko="아이템" icon="potion" tint="#ff6b6b" disabled={busy} onClick={() => setMenu('item')} />
                <CmdBtn n={3} label="DEFEND" ko="방어" icon="armor" tint="#a5d8ff" disabled={busy} onClick={() => doAction({ type: 'defend' })} />
                <CmdBtn
                  n={4}
                  label={def.family === 'dummy' ? 'FINISH' : 'ESCAPE'}
                  ko={def.family === 'dummy' ? '훈련 종료' : setup.canEscape ? '도망' : '도망 불가'}
                  icon="boots"
                  tint="#e9c46a"
                  disabled={busy || (!setup.canEscape && def.family !== 'dummy')}
                  onClick={() => doAction({ type: 'escape' })}
                />
              </div>
            </>
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
            {towerNext && (
              <div className="climb-info tiny">
                {towerNext.kind === 'battle' && (
                  <>
                    HP <b className={s.player.hp < deriveStats(s).maxHp * 0.35 ? 'red-t' : ''}>{s.player.hp}</b>/{deriveStats(s).maxHp} · MP {s.player.mp}/{deriveStats(s).maxMp} · 기력 <b className={climbBlock ? 'red-t' : ''}>{s.player.stamina}</b> (다음 층 {towerNext.stamina})
                    {climbBlock && <div className="red-t">{climbBlock}</div>}
                    {!climbBlock && <div className="dim">HP·MP는 그대로 이어집니다. Enter = 바로 도전</div>}
                  </>
                )}
                {towerNext.kind === 'visit' && <span className="dim">{towerNext.floor}층은 선택이 필요한 층이라 탑 화면에서 진행해요.</span>}
                {towerNext.kind === 'locked' && <span className="dim">다음 층: {towerNext.reason}</span>}
              </div>
            )}
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              {towerNext?.kind === 'battle' && (
                <Btn variant="purple" onClick={climb} sfx="stairs" disabled={!!climbBlock} autoFocus={!climbBlock}>
                  {towerNext.treasure ? `${towerNext.treasure}F 보물 열고 ${towerNext.floor}F 도전 ▶` : `다음 층 바로 도전 (${towerNext.floor}F) ▶`}
                </Btn>
              )}
              {towerNext?.kind === 'visit' && (
                <Btn variant="purple" onClick={() => goFloor(towerNext.floor)} sfx="stairs">
                  {towerNext.floor}F로 이동 ▶
                </Btn>
              )}
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
              <Btn variant="gold" onClick={close} sfx="confirm" autoFocus={!(towerNext?.kind === 'battle' && !climbBlock)}>
                {result.outcome === 'defeat' ? '마을로 돌아가기' : setup.kind === 'tower' ? '탑으로 나가기' : '계속'}
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
