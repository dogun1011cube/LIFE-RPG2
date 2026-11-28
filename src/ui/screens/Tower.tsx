import { useEffect, useMemo, useRef, useState } from 'react';
import { playSfx } from '../../audio/sfx';
import { getItem } from '../../data/items';
import { getMonster } from '../../data/monsters';
import type { QuizQ, SlotSymbol } from '../../data/world';
import { claimTreasureFloor, passFloor, startTowerBattle } from '../../game/encounters';
import { buyItem } from '../../game/shop';
import type { SlotResult } from '../../game/tower';
import {
  EVENTS,
  eventBetAmount,
  FLOOR13_LORE,
  FLOOR4_LORE,
  FLOOR7_LORE,
  floorAccess,
  floorInfo,
  merchantStock,
  pickQuiz,
  resolveEvent,
  shrineOffer,
  slotAvailable,
  spinSlots,
} from '../../game/tower';
import { FLOOR_H, floorY, renderTower, TOWER_W, towerHeight } from '../../render/TowerArt';
import { act, useGame } from '../../store/store';
import { stageReqText } from '../../data/ranks';
import { CharacterPicker } from '../CharacterPanel';
import { Bar, Btn, ItemIcon, Modal, MonsterSkillInfo, MonsterSprite, PixelIcon, RarityText, Win } from '../components';
import { setUI, useUI } from '../uiStore';

const SCALE = 2;
const TYPE_LABEL: Record<string, [string, string]> = {
  battle: ['전투', '#adb5bd'],
  elite: ['정예', '#ff922b'],
  boss: ['BOSS', '#ff4d6d'],
  treasure: ['보물', '#ffd43b'],
  event: ['이벤트', '#3bc9db'],
  merchant: ['상인', '#69db7c'],
  special: ['특별', '#b57bff'],
};

const SLOT_GLYPH: Record<SlotSymbol, [string, string]> = {
  seven: ['seal', '#ff4d6d'],
  gem: ['gem', '#4dabf7'],
  coin: ['coin', '#ffd43b'],
  potion: ['potion', '#ff6b6b'],
  star: ['star', '#b57bff'],
};

export function Tower() {
  const s = useGame();
  const ui = useUI();
  const highest = s.tower.highestCleared;
  const next = highest + 1;
  const shown = Math.max(20, Math.ceil((highest + 8) / 5) * 5);
  const [sel, setSel] = useState<number>(ui.towerFocus ?? next);
  const [lore, setLore] = useState<4 | 7 | 13 | null>(null);
  const [quiz, setQuiz] = useState<{ qs: QuizQ[]; idx: number; correct: number; picked: number | null } | null>(null);
  const [eventResult, setEventResult] = useState<string | null>(null);
  const [treasure, setTreasure] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<SlotResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const art = useMemo(() => renderTower(shown, highest), [shown, highest]);
  const artUrl = useMemo(() => art.toDataURL(), [art]);
  const H = towerHeight(shown);

  // after clearing the selected floor, move the selection up to the new "next" floor
  const prevHighest = useRef(highest);
  useEffect(() => {
    if (highest > prevHighest.current && sel === prevHighest.current + 1) setSel(highest + 1);
    prevHighest.current = highest;
  }, [highest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ui.towerFocus) {
      setSel(ui.towerFocus);
      setUI({ towerFocus: null });
    }
  }, [ui.towerFocus]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const y = floorY(Math.min(sel, shown), shown) * SCALE;
    el.scrollTo({ top: Math.max(0, y - el.clientHeight / 2 + 30), behavior: 'smooth' });
  }, [sel, shown]);

  const info = floorInfo(sel);
  const access = floorAccess(s, sel);
  const cleared = sel <= highest;
  const sleeping = s.day.status === 'sleeping';
  const [tl, tc] = TYPE_LABEL[info.type];

  const challenge = (seals = 0) => {
    const r = act((d, c) => startTowerBattle(d, c, sel, { seals }));
    if (r.ok) setUI({ battle: r.value });
  };

  const onChallenge = () => {
    if (info.special === 13) {
      setLore(13);
      return;
    }
    if (info.special === 4 && !cleared) {
      setLore(4);
      return;
    }
    challenge();
  };

  const startQuiz = () => {
    setLore(null);
    setQuiz({ qs: pickQuiz(Math.random, 3), idx: 0, correct: 0, picked: null });
  };

  const answer = (i: number) => {
    if (!quiz || quiz.picked !== null) return;
    const ok = i === quiz.qs[quiz.idx].answer;
    playSfx(ok ? 'quest' : 'error');
    setQuiz({ ...quiz, picked: i, correct: quiz.correct + (ok ? 1 : 0) });
  };

  const spin = async () => {
    setSpinning(true);
    setSlot(null);
    playSfx('gachaCharge');
    await new Promise((r) => setTimeout(r, 900));
    const r = act((d, c) => spinSlots(d, c));
    setSpinning(false);
    if (r.ok) setSlot(r.value);
  };

  const slotAv = slotAvailable(s);

  return (
    <div className="tower-screen">
      <Win className="tower-col" color="purple" title="TOWER OF TRIALS" sub="시련의 탑">
        <div className="tower-stats">
          <div>
            <span className="tiny muted">현재 층</span>
            <b className="big">{Math.min(s.tower.currentFloor, next)}F</b>
          </div>
          <div>
            <span className="tiny muted">최고 돌파</span>
            <b className="big gold-t">{highest}F</b>
          </div>
          <div>
            <span className="tiny muted">다음 층</span>
            <b className="big purple-t">{next}F</b>
          </div>
        </div>
        <Bar kind="boss" value={Math.min(100, highest)} max={100} size="thin" label="" />
        <div className="tower-scroll" ref={scrollRef}>
          <div className="tower-art" style={{ width: TOWER_W * SCALE, height: H * SCALE, backgroundImage: `url(${artUrl})` }}>
            {Array.from({ length: shown }, (_, i) => i + 1).map((f) => {
              const fi = floorInfo(f);
              const y = floorY(f, shown) * SCALE;
              const isNext = f === next;
              const locked = f > next;
              return (
                <button
                  key={f}
                  className={`floor-hit ${sel === f ? 'sel' : ''} ${isNext ? 'next' : ''} ${locked ? 'locked' : ''}`}
                  style={{ top: y, height: FLOOR_H * SCALE }}
                  onClick={() => {
                    playSfx('select');
                    setSel(f);
                  }}
                  title={fi.name}
                >
                  <span className="fl-num">{f}F</span>
                  {(fi.type !== 'battle' || f % 5 === 0) && (
                    <span className="fl-type" style={{ color: TYPE_LABEL[fi.type][1] }}>
                      {TYPE_LABEL[fi.type][0]}
                    </span>
                  )}
                  {isNext && <span className="fl-you">◀ YOU</span>}
                </button>
              );
            })}
            <div className="tower-top-label" style={{ top: 30 }}>
              ??? <span className="tiny">구름 너머</span>
            </div>
          </div>
        </div>
      </Win>

      <div className="tower-detail">
        <Win title={info.name} sub={info.zone} color={info.type === 'boss' || info.special === 13 ? 'red' : info.type === 'special' ? 'purple' : 'gold'} right={<span className="tag" style={{ background: tc, color: '#000' }}>{tl}</span>}>
          <p className="small">{info.desc}</p>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="chip">
              몬스터 Lv <b>{info.level}</b>
            </span>
            <span className="chip">
              <PixelIcon icon="bolt" tint="#9be15d" size={14} /> 기력 <b>{info.stamina}</b>
            </span>
            {!info.canEscape && <span className="chip" style={{ color: 'var(--red)' }}>도망 불가</span>}
            {info.sealRank && <span className="chip gold">봉인 해제: {stageReqText(info.sealRank)}</span>}
            {cleared ? <span className="chip" style={{ color: 'var(--green)' }}>돌파 완료</span> : sel === next ? <span className="chip gold">도전 가능</span> : null}
          </div>

          {info.waves.length > 0 && (
            <div className="floor-mons">
              {info.waves.map((id, i) => (
                <div key={i} className="floor-mon">
                  <MonsterSprite id={id} scale={3} silhouette={!s.monsters[id]?.seen && !cleared} />
                  <span className="tiny">{s.monsters[id]?.seen || cleared ? getMonster(id).name : '???'}</span>
                  {(s.monsters[id]?.seen || cleared) && <MonsterSkillInfo id={id} compact />}
                </div>
              ))}
            </div>
          )}

          <div className="sep" />
          <div className="small muted">첫 돌파 보상 {cleared && <span className="green-t">(획득 완료)</span>}</div>
          <div className="row wrap" style={{ gap: 10 }}>
            <span>
              <PixelIcon icon="star" tint="#b57bff" size={14} /> EXP {info.firstClear.exp}
            </span>
            <span>
              <PixelIcon icon="coin" tint="#ffcf4a" size={14} /> {info.firstClear.gold} G
            </span>
            {info.firstClear.items.map(([id, q]) => (
              <span key={id} className="row" style={{ gap: 4 }}>
                <ItemIcon item={id} size={18} />
                <RarityText rarity={getItem(id).rarity}>
                  {getItem(id).name}
                  {q > 1 ? ' ×' + q : ''}
                </RarityText>
              </span>
            ))}
          </div>

          {!access.ok && <div className="warn-line">{access.reason}</div>}
          {info.waves.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="tiny muted">출전 캐릭터</div>
              <CharacterPicker compact />
            </div>
          )}

          <div className="col" style={{ marginTop: 12 }}>
            {(info.type === 'battle' || info.type === 'elite' || info.type === 'boss' || info.type === 'special') && (
              <Btn variant={info.type === 'boss' || info.special ? 'red' : 'purple'} size="lg" disabled={!access.ok || sleeping} onClick={onChallenge} sfx="confirm">
                {cleared ? '다시 도전 (보상: 전리품만)' : info.special === 13 ? '금기의 문을 연다' : info.special === 7 ? '황금 슬라임 킹에게 도전' : '도전!'}
              </Btn>
            )}
            {info.special && (
              <Btn variant="ghost" size="sm" onClick={() => setLore(info.special!)}>
                이 층의 비밀 읽기
              </Btn>
            )}
            {info.type === 'treasure' && (
              <Btn
                variant="gold"
                size="lg"
                disabled={!access.ok || cleared || sleeping}
                onClick={() => {
                  const r = act((d, c) => claimTreasureFloor(d, c, sel));
                  if (r.ok) setTreasure(r.value);
                }}
              >
                {cleared ? '이미 열어본 상자' : `보물상자 열기 (기력 ${info.stamina})`}
              </Btn>
            )}
            {info.type === 'event' && info.eventId && (
              <div className="event-box">
                <div className="gold-t">{EVENTS[info.eventId].title}</div>
                <p className="small">{EVENTS[info.eventId].text}</p>
                {cleared ? (
                  <div className="small dim">이미 지나온 층이다.</div>
                ) : (
                  EVENTS[info.eventId].options.map((o) => (
                    <Btn
                      key={o.id}
                      variant="ghost"
                      block
                      disabled={!access.ok || sleeping}
                      onClick={() => {
                        const r = act((d, c) => {
                          const text = resolveEvent(d, c, sel, o.id);
                          passFloor(d, c, sel);
                          return text;
                        });
                        if (r.ok) setEventResult(r.value);
                      }}
                    >
                      {o.label} <span className="tiny muted">— {o.hint}{o.id === 'bet' ? ` (${eventBetAmount(sel)} G)` : o.id === 'offer' ? ` (${shrineOffer(sel)} G)` : ''}</span>
                    </Btn>
                  ))
                )}
                {!cleared && <div className="tiny dim">선택하면 기력 {info.stamina}을 사용하고 층을 통과합니다.</div>}
              </div>
            )}
            {info.type === 'merchant' && (
              <div className="merchant-box">
                <div className="small muted">떠돌이 상인 — 전 품목 20% 할인</div>
                {merchantStock(sel).map(({ item, price }) => (
                  <div key={item.id} className="merchant-row">
                    <ItemIcon item={item} size={26} />
                    <span className="grow small">
                      <RarityText rarity={item.rarity}>{item.name}</RarityText>
                      <span className="tiny dim"> {item.desc}</span>
                    </span>
                    <Btn size="sm" variant="gold" disabled={(!access.ok && !cleared) || s.player.gold < price} onClick={() => act((d, c) => buyItem(d, c, item.id, 1, { price }))}>
                      {price} G
                    </Btn>
                  </div>
                ))}
                {!cleared && (
                  <Btn variant="purple" block disabled={!access.ok || sleeping} onClick={() => act((d, c) => passFloor(d, c, sel))}>
                    계속 오르기 (기력 {info.stamina})
                  </Btn>
                )}
              </div>
            )}
          </div>
        </Win>

        {(sel === 7 || (info.special === 7 && !cleared)) && highest >= 6 && (
          <Win title="LUCKY SLOTS" sub="행운의 슬롯머신" color="gold">
            <div className="slots">
              {[0, 1, 2].map((i) => {
                const sym = slot?.reels[i];
                return (
                  <div key={i} className={`reel ${spinning ? 'spin' : ''}`}>
                    {spinning ? <span className="reel-blur" /> : sym ? <PixelIcon icon={SLOT_GLYPH[sym][0]} tint={SLOT_GLYPH[sym][1]} size={44} /> : <span className="big gold-t">7</span>}
                  </div>
                );
              })}
            </div>
            {slot && (
              <div className="small" style={{ textAlign: 'center' }}>
                <b className="gold-t">{slot.text}</b>
                <div className="tiny">
                  {slot.gold ? `+${slot.gold} G ` : ''}
                  {slot.items.map((id) => getItem(id).name).join(', ')}
                </div>
              </div>
            )}
            <Btn variant="gold" block disabled={!slotAv.ok || spinning} onClick={spin}>
              {slotAv.ok ? `SPIN! (무료 ${slotAv.free}회)` : slotAv.reason}
            </Btn>
            <div className="tiny dim" style={{ marginTop: 4 }}>
              7·7·7 = 777 G + 은 보물상자 · 같은 그림 3개 = 보너스 · 7이 나올수록 행운
            </div>
          </Win>
        )}
      </div>

      {lore && (
        <Modal title={lore === 13 ? 'FLOOR 13 — 금기의 층' : lore === 7 ? 'FLOOR 7 — 행운의 전당' : 'FLOOR 4 — 死'} color={lore === 13 ? 'red' : lore === 7 ? 'gold' : 'purple'} onClose={() => setLore(null)}>
          <div className={`lore ${lore === 13 ? 'glitchy' : ''}`}>
            {(lore === 13 ? FLOOR13_LORE : lore === 7 ? FLOOR7_LORE : FLOOR4_LORE).map((p, i) => (
              <p key={i} className={i === 0 ? 'gold-t' : 'small'}>
                {p}
              </p>
            ))}
          </div>
          <div className="modal-actions">
            <Btn variant="ghost" onClick={() => setLore(null)} sfx="cancel">
              닫기
            </Btn>
            {lore === 13 && sel === 13 && access.ok && !sleeping && (
              <Btn variant="red" onClick={startQuiz}>
                지식의 봉인에 도전한다
              </Btn>
            )}
            {lore === 4 && sel === 4 && access.ok && !sleeping && (
              <Btn
                variant="purple"
                onClick={() => {
                  setLore(null);
                  challenge();
                }}
              >
                망자의 회랑으로
              </Btn>
            )}
          </div>
        </Modal>
      )}

      {quiz && (
        <Modal title={`지식의 봉인 ${quiz.idx + 1} / ${quiz.qs.length}`} sub={quiz.qs[quiz.idx].subject} color="red">
          <div className="seals">
            {quiz.qs.map((_, i) => (
              <span key={i} className={`seal ${i < quiz.idx || (i === quiz.idx && quiz.picked !== null) ? 'done' : ''}`}>
                <PixelIcon icon="seal" tint={i < quiz.correct ? '#69db7c' : '#ff4d6d'} size={28} />
              </span>
            ))}
          </div>
          <p className="big" style={{ margin: '8px 0 12px' }}>
            {quiz.qs[quiz.idx].q}
          </p>
          <div className="quiz-opts">
            {quiz.qs[quiz.idx].options.map((o, i) => {
              const q = quiz.qs[quiz.idx];
              const state = quiz.picked === null ? '' : i === q.answer ? 'right' : i === quiz.picked ? 'wrong' : '';
              return (
                <button key={i} className={`quiz-opt ${state}`} onClick={() => answer(i)} disabled={quiz.picked !== null}>
                  <b>{'ABCD'[i]}</b> {o}
                </button>
              );
            })}
          </div>
          {quiz.picked !== null && (
            <div className="modal-actions">
              <span className="small grow">{quiz.picked === quiz.qs[quiz.idx].answer ? '정답! 봉인이 깨졌다.' : '오답… 봉인이 그대로 남았다.'}</span>
              {quiz.idx < quiz.qs.length - 1 ? (
                <Btn variant="gold" onClick={() => setQuiz({ ...quiz, idx: quiz.idx + 1, picked: null })}>
                  다음 봉인 ▶
                </Btn>
              ) : (
                <Btn
                  variant="red"
                  onClick={() => {
                    const seals = quiz.correct;
                    setQuiz(null);
                    challenge(seals);
                  }}
                >
                  봉인 {quiz.correct}/3 해제 — 손님에게 도전 (약화 {quiz.correct * 12}%)
                </Btn>
              )}
            </div>
          )}
        </Modal>
      )}

      {eventResult && (
        <Modal title="EVENT" color="gold" onClose={() => setEventResult(null)}>
          <p>{eventResult}</p>
          <div className="modal-actions">
            <Btn variant="gold" onClick={() => setEventResult(null)}>
              확인
            </Btn>
          </div>
        </Modal>
      )}
      {treasure && (
        <Modal title="TREASURE!" color="gold" onClose={() => setTreasure(null)}>
          <div className="treasure-open">
            <PixelIcon icon="chest" tint="#ffd43b" size={64} />
          </div>
          {treasure.map((l) => (
            <p key={l} className="small">
              {l}
            </p>
          ))}
          <p className="tiny muted">보물상자는 가방에서 열 수 있어요.</p>
          <div className="modal-actions">
            <Btn variant="gold" onClick={() => setTreasure(null)}>
              확인
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
