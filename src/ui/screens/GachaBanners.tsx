import { useEffect, useState } from 'react';
import { playSfx } from '../../audio/sfx';
import { ATK_INFO, CHARACTERS } from '../../data/characters';
import { getItem, RARITY_INFO } from '../../data/items';
import { CHAR_GACHA, ELEMENTAL_PETS, PET_GACHA, PET_RARITY_INFO, PETS } from '../../data/pets';
import type { PetRarity } from '../../data/pets';
import type { CharPullResult, PetPullResult } from '../../game/pets';
import { charGachaPull, petGachaPull, unownedCharacters } from '../../game/pets';
import { act, useGame } from '../../store/store';
import { Btn, ItemIcon, PixelIcon, RarityText, Win } from '../components';
import { go } from '../uiStore';

// ─────────────────────────────────────────────────────────────
// Character & pet summon banners (the equipment banner lives in Gacha.tsx).
// ─────────────────────────────────────────────────────────────

interface Card {
  key: string;
  node: React.ReactNode;
  name: React.ReactNode;
  color: string;
  label: string;
  note?: React.ReactNode;
  /** 0 = plain, 1 = good, 2 = great (sfx / glow). */
  tier: number;
}

/** Charge → reveal animation shared by the two banners. */
function useReveal() {
  const [phase, setPhase] = useState<'idle' | 'charge' | 'reveal'>('idle');
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState(0);
  useEffect(() => {
    if (phase !== 'charge') return;
    const t = setTimeout(() => setPhase('reveal'), 1100);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'reveal' || flipped >= cards.length) return;
    const t = setTimeout(
      () => {
        const c = cards[flipped];
        playSfx(c.tier >= 2 ? 'gachaLegend' : c.tier >= 1 ? 'gachaRare' : 'gachaReveal');
        setFlipped(flipped + 1);
      },
      flipped === 0 ? 150 : 220,
    );
    return () => clearTimeout(t);
  }, [phase, flipped, cards]);
  const start = (c: Card[]) => {
    setCards(c);
    setFlipped(0);
    setPhase('charge');
    playSfx('gachaCharge');
  };
  const done = phase === 'reveal' && flipped >= cards.length;
  const busy = phase === 'charge' || (phase === 'reveal' && !done);
  const best = cards.reduce((a, c) => (c.tier > a.tier ? c : a), cards[0] ?? { color: '#9b6bff', tier: 0 });
  return { phase, cards, flipped, done, busy, start, close: () => setPhase('idle'), bestColor: best?.color ?? '#9b6bff' };
}

function Altar({ phase, color, hint }: { phase: string; color: string; hint: string }) {
  return (
    <div className={`altar ${phase}`} style={{ ['--best' as string]: color } as React.CSSProperties}>
      <div className="altar-rays" />
      <div className="orb">
        <div className="orb-core" />
        <div className="orb-shine" />
      </div>
      <div className="altar-base" />
      {phase === 'idle' && <div className="altar-hint small">{hint}</div>}
    </div>
  );
}

function Cards({ r }: { r: ReturnType<typeof useReveal> }) {
  if (r.phase !== 'reveal') return null;
  return (
    <div className={`gacha-cards ${r.cards.length === 1 ? 'single' : ''}`}>
      {r.cards.map((c, i) => (
        <div key={c.key + i} className={`gcard ${i < r.flipped ? 'open' : ''} ${c.tier >= 2 ? 'rc-legendary' : c.tier >= 1 ? 'rc-epic' : ''}`} style={{ ['--rc' as string]: c.color } as React.CSSProperties}>
          <div className="gcard-inner">
            <div className="gcard-back">?</div>
            <div className="gcard-front">
              <div className="gcard-rarity">{c.label}</div>
              {c.node}
              <div className="gcard-name">{c.name}</div>
              {c.note}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PetIcon({ kind, size = 36 }: { kind: keyof typeof PETS; size?: number }) {
  return <PixelIcon icon={'pet_' + kind} tint={PETS[kind].color} size={size} title={PETS[kind].name} />;
}

export function PetRarityText({ rarity, children }: { rarity: PetRarity; children?: React.ReactNode }) {
  return (
    <span className={`pet-rarity r-${rarity}`} style={{ color: PET_RARITY_INFO[rarity].color }}>
      {children ?? PET_RARITY_INFO[rarity].ko}
    </span>
  );
}

// ── Character banner ─────────────────────────────────────────
export function CharBanner() {
  const s = useGame();
  const r = useReveal();
  const unowned = unownedCharacters(s);
  const allOwned = unowned.length === 0;
  const pull = (n: 1 | 10) => {
    const res = act((d, c) => charGachaPull(d, c, n));
    if (!res.ok) return;
    r.start(
      res.value.map((x: CharPullResult) => {
        const def = getItem(x.itemId);
        return {
          key: x.itemId,
          node: <ItemIcon item={def} size={res.value.length === 1 ? 72 : 44} />,
          name: <RarityText rarity={def.rarity}>{x.character ? def.name.replace('캐릭터: ', '') : def.name}</RarityText>,
          color: x.character ? '#74c0fc' : RARITY_INFO[def.rarity].color,
          label: x.character ? 'NEW CHARACTER' : RARITY_INFO[def.rarity].en,
          note: x.pity ? <div className="tiny red-t">천장 보장!</div> : x.character ? <div className="tiny gold-t">캐릭터 획득!</div> : null,
          tier: x.character ? 2 : 0,
        };
      }),
    );
  };
  return (
    <div className="gacha">
      <Win className="gacha-stage" color="purple" title="HERO SUMMON" sub="캐릭터 소환">
        <Altar phase={r.phase} color={r.bestColor} hint={allOwned ? '모든 캐릭터를 모았어요!' : '아직 만나지 못한 동료를 부른다'} />
        <Cards r={r} />
        <div className="gacha-actions">
          {r.done && (
            <Btn variant="ghost" onClick={r.close}>
              닫기
            </Btn>
          )}
          <Btn variant="purple" size="lg" disabled={allOwned || r.busy || s.player.gold < CHAR_GACHA.single} onClick={() => pull(1)}>
            1회 소환 · {CHAR_GACHA.single} G
          </Btn>
          <Btn variant="gold" size="lg" disabled={allOwned || r.busy || s.player.gold < CHAR_GACHA.multi} onClick={() => pull(10)}>
            10회 소환 · {CHAR_GACHA.multi.toLocaleString()} G
          </Btn>
        </div>
        <div className="row between small" style={{ marginTop: 8 }}>
          <span>
            보유 <b className="gold-t">{s.player.gold.toLocaleString()} G</b>
          </span>
          <span className="muted">{allOwned ? '모든 캐릭터 보유' : <>캐릭터 확정까지 <b className="gold-t">{CHAR_GACHA.pity - s.gacha.charPity}</b>회</>}</span>
        </div>
      </Win>
      <Win className="gacha-info" title="LINEUP" sub="소환 가능 캐릭터">
        <div className="col">
          {CHARACTERS.map((c) => {
            const owned = s.ownedCharacters.includes(c.id);
            return (
              <div key={c.id} className={`char-line ${owned ? 'owned' : ''}`}>
                <span className="type-dot" style={{ background: ATK_INFO[c.type].color }} />
                <b>{c.title}</b>
                <span className="tiny muted">
                  {c.name} · {ATK_INFO[c.type].ko}
                </span>
                <span className="grow" />
                {owned ? <span className="tag" style={{ background: 'var(--green)', color: '#000' }}>보유</span> : <span className="tiny gold-t">미보유</span>}
              </div>
            );
          })}
          <div className="sep" />
          <div className="tiny muted">
            · 매 소환마다 <b>{CHAR_GACHA.rate}%</b> 확률로 아직 없는 캐릭터가 나와요.
            <br />· {CHAR_GACHA.pity}회 동안 못 만나면 다음 소환은 캐릭터 확정 (현재 {s.gacha.charPity}/{CHAR_GACHA.pity}).
            <br />· 캐릭터가 아니면 회복 물약·마나 물약·비약·기력 드링크·보물상자·경험의 서 중 하나를 받아요. 꽝은 없습니다.
            <br />· 이미 가진 캐릭터는 나오지 않아요. 모두 모으면 이 소환은 닫힙니다.
          </div>
        </div>
      </Win>
    </div>
  );
}

// ── Pet banner ───────────────────────────────────────────────
export function PetBanner() {
  const s = useGame();
  const r = useReveal();
  const pull = (n: 1 | 10) => {
    const res = act((d, c) => petGachaPull(d, c, n));
    if (!res.ok) return;
    r.start(
      res.value.map((x: PetPullResult) => ({
        key: x.uid,
        node: <PetIcon kind={x.kind} size={res.value.length === 1 ? 72 : 44} />,
        name: <PetRarityText rarity={x.rarity}>{PETS[x.kind].name}</PetRarityText>,
        color: PET_RARITY_INFO[x.rarity].color,
        label: PET_RARITY_INFO[x.rarity].en,
        note: x.pity ? <div className="tiny red-t">천장 보장!</div> : <div className="tiny muted">{PETS[x.kind].title}</div>,
        tier: x.rarity === 'legendary' ? 2 : x.rarity === 'epic' || x.rarity === 'rare' ? 1 : 0,
      })),
    );
  };
  return (
    <div className="gacha">
      <Win className="gacha-stage" color="purple" title="SPIRIT SUMMON" sub="펫 소환">
        <Altar phase={r.phase} color={r.bestColor} hint="여섯 원소의 정령을 부른다" />
        <Cards r={r} />
        <div className="gacha-actions">
          {r.done && (
            <>
              <Btn variant="ghost" onClick={r.close}>
                닫기
              </Btn>
              <Btn variant="green" onClick={() => go('pets')}>
                펫 관리 →
              </Btn>
            </>
          )}
          <Btn variant="purple" size="lg" disabled={r.busy || s.player.gold < PET_GACHA.single} onClick={() => pull(1)}>
            1회 소환 · {PET_GACHA.single} G
          </Btn>
          <Btn variant="gold" size="lg" disabled={r.busy || s.player.gold < PET_GACHA.multi} onClick={() => pull(10)}>
            10회 소환 · {PET_GACHA.multi.toLocaleString()} G <span className="kbd">희귀 1마리 이상 확정</span>
          </Btn>
        </div>
        <div className="row between small" style={{ marginTop: 8 }}>
          <span>
            보유 <b className="gold-t">{s.player.gold.toLocaleString()} G</b> · 펫 {s.pets.length}마리
          </span>
          <span className="muted">
            영웅 확정까지 <b className="gold-t">{PET_GACHA.pity - s.gacha.petPity}</b>회
          </span>
        </div>
      </Win>
      <Win className="gacha-info" title="RATES" sub="확률표">
        <div className="col">
          {PET_GACHA.rates.map(([rr, p]) => (
            <div key={rr} className="rate-row">
              <PetRarityText rarity={rr}>{PET_RARITY_INFO[rr].en}</PetRarityText>
              <span className="tiny muted">{PET_RARITY_INFO[rr].ko}</span>
              <span className="grow rate-track">
                <span style={{ width: Math.max(2, p * 1.6) + '%', background: PET_RARITY_INFO[rr].color }} />
              </span>
              <b className="num">{p}%</b>
            </div>
          ))}
          <div className="row wrap" style={{ gap: 6, justifyContent: 'center', margin: '6px 0' }}>
            {ELEMENTAL_PETS.map((k) => (
              <span key={k} className="pet-chip" title={PETS[k].desc}>
                <PetIcon kind={k} size={20} /> {PETS[k].title}({PETS[k].name})
              </span>
            ))}
          </div>
          <div className="sep" />
          <div className="tiny muted">
            · 여섯 정령이 같은 확률로 나와요. 신화·시크릿 등급은 소환으로는 나오지 않고 <b>합성</b>으로만 만들 수 있어요.
            <br />· {PET_GACHA.pity}회 동안 영웅 이상이 안 나오면 다음 소환은 영웅 확정. 10회 소환은 희귀 이상 1마리 확정.
            <br />· 같은 정령·같은 등급 3마리 → 한 등급 위 (펫 화면에서 합성).
            <br />· 신화 <b>물+바람+빛</b> → <span style={{ color: PET_RARITY_INFO.secret.color }}>천사 (SECRET)</span>, 신화 <b>불+어둠+파괴</b> → <span style={{ color: PET_RARITY_INFO.secret.color }}>악마 (SECRET)</span>
          </div>
        </div>
      </Win>
    </div>
  );
}
