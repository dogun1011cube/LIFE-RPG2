import { useEffect, useState } from 'react';
import { playSfx } from '../../audio/sfx';
import { getItem, RARITY_INFO } from '../../data/items';
import { GACHA } from '../../data/world';
import type { AutoGachaResult, GachaResult } from '../../game/shop';
import { autoGacha, autoGachaMaxCost, gachaPull } from '../../game/shop';
import type { Rarity } from '../../game/types';
import { RARITIES } from '../../game/types';
import { act, useGame } from '../../store/store';
import { Btn, ItemIcon, PixelIcon, RarityText, Win } from '../components';
import { CharBanner, PetBanner } from './GachaBanners';
import { confirmDialog } from '../uiStore';

const AUTO_TARGETS: Rarity[] = ['rare', 'epic', 'legendary', 'mythic'];
const STOP_TEXT: Record<AutoGachaResult['stopReason'], string> = {
  target: '목표 등급 획득! 자동 소환을 멈췄습니다.',
  max: '설정한 최대 횟수에 도달했습니다.',
  gold: '골드가 부족해 자동 소환을 멈췄습니다.',
};

type Phase = 'idle' | 'charge' | 'reveal';

/** Equipment banner (장비 소환): gear, consumables and cosmetics. */
function EquipBanner() {
  const s = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<GachaResult[]>([]);
  const [flipped, setFlipped] = useState(0);
  const [tab, setTab] = useState<'rates' | 'history'>('rates');
  const [auto, setAuto] = useState<AutoGachaResult | null>(null);
  const [autoTarget, setAutoTarget] = useState<Rarity>('legendary');
  const [autoMax, setAutoMax] = useState<number>(30);

  const best = results.reduce((a, r) => Math.max(a, RARITIES.indexOf(r.rarity)), 0);
  const bestColor = RARITY_INFO[RARITIES[best]].color;

  const pull = (n: 1 | 10) => {
    const r = act((d, c) => gachaPull(d, c, n));
    if (!r.ok) return;
    setAuto(null);
    setResults(r.value);
    setFlipped(0);
    setPhase('charge');
    playSfx('gachaCharge');
  };

  useEffect(() => {
    if (phase !== 'charge') return;
    const t = setTimeout(() => setPhase('reveal'), 1300);
    return () => clearTimeout(t);
  }, [phase]);

  const startAuto = async () => {
    const maxCost = autoGachaMaxCost(autoMax);
    const ok = await confirmDialog({
      title: '자동 소환',
      text: `${RARITY_INFO[autoTarget].ko} 이상이 나올 때까지 최대 ${autoMax}회 자동으로 소환합니다.\n1회 ${GACHA.auto} G (일반 소환 ${GACHA.single} G보다 비쌈) · 최대 ${maxCost.toLocaleString()} G\n목표 등급이 나오거나 골드가 떨어지면 바로 멈춥니다.`,
      ok: '자동 소환 시작',
    });
    if (!ok) return;
    const r = act((d, c) => autoGacha(d, c, { stopAt: autoTarget, maxPulls: autoMax }));
    if (!r.ok) return;
    setAuto(r.value);
    setResults(r.value.results);
    setFlipped(0);
    setPhase('charge');
    playSfx('gachaCharge');
  };

  useEffect(() => {
    if (phase !== 'reveal' || flipped >= results.length) return;
    const isAuto = !!auto;
    const t = setTimeout(
      () => {
        const r = results[flipped];
        const ri = RARITIES.indexOf(r.rarity);
        if (!isAuto || ri >= 2 || flipped === results.length - 1) playSfx(ri >= 4 ? 'gachaLegend' : ri >= 2 ? 'gachaRare' : 'gachaReveal');
        setFlipped(flipped + 1);
      },
      isAuto ? (results.length > 40 ? 35 : 70) : flipped === 0 ? 150 : 230,
    );
    return () => clearTimeout(t);
  }, [phase, flipped, results, auto]);

  const done = phase === 'reveal' && flipped >= results.length;
  const equipHistory = s.gacha.history.filter((h) => (h.banner ?? 'equip') === 'equip' && !h.itemId.startsWith('pet:') && getItem(h.itemId).category !== 'character');

  return (
    <div className="gacha">
      <Win className="gacha-stage" color="purple" title="SUMMONING ALTAR" sub="소환의 제단">
        <div className={`altar ${phase}`} style={{ ['--best' as string]: bestColor } as React.CSSProperties}>
          <div className="altar-rays" />
          <div className="orb">
            <div className="orb-core" />
            <div className="orb-shine" />
          </div>
          <div className="altar-base" />
          {phase === 'idle' && <div className="altar-hint small">골드를 바쳐 장비 · 소모품 · 외형을 소환한다</div>}
        </div>

        {phase === 'reveal' && auto && (
          <div className="auto-reveal">
            <div className="auto-grid">
              {results.slice(0, flipped).map((r, i) => (
                <div key={i} className={`auto-cell rc-${r.rarity} ${i === auto.bestIndex && flipped >= results.length ? 'best' : ''}`} style={{ ['--rc' as string]: RARITY_INFO[r.rarity].color } as React.CSSProperties} title={getItem(r.itemId).name}>
                  <ItemIcon item={r.itemId} size={26} />
                </div>
              ))}
            </div>
            {done && (
              <div className="auto-summary">
                <div className="small gold-t">{STOP_TEXT[auto.stopReason]}</div>
                <div className="row wrap small" style={{ gap: 10, justifyContent: 'center' }}>
                  <span>
                    소환 <b>{results.length}</b>회
                  </span>
                  <span>
                    사용 <b className="gold-t">{auto.spent.toLocaleString()} G</b>
                  </span>
                  {RARITIES.map((r) => {
                    const n = results.filter((x) => x.rarity === r).length;
                    return n ? (
                      <span key={r}>
                        <RarityText rarity={r}>{RARITY_INFO[r].ko}</RarityText> {n}
                      </span>
                    ) : null;
                  })}
                </div>
                <div className="auto-best">
                  <span className="tiny muted">최고 등급</span>
                  <ItemIcon item={results[auto.bestIndex].itemId} size={40} />
                  <RarityText rarity={results[auto.bestIndex].rarity}>{getItem(results[auto.bestIndex].itemId).name}</RarityText>
                </div>
              </div>
            )}
          </div>
        )}

        {phase === 'reveal' && !auto && (
          <div className={`gacha-cards ${results.length === 1 ? 'single' : ''}`}>
            {results.map((r, i) => {
              const def = getItem(r.itemId);
              const open = i < flipped;
              return (
                <div key={i} className={`gcard ${open ? 'open' : ''} rc-${r.rarity}`} style={{ ['--rc' as string]: RARITY_INFO[r.rarity].color } as React.CSSProperties}>
                  <div className="gcard-inner">
                    <div className="gcard-back">?</div>
                    <div className="gcard-front">
                      <div className="gcard-rarity">{RARITY_INFO[r.rarity].en}</div>
                      <ItemIcon item={def} size={results.length === 1 ? 72 : 44} />
                      <div className="gcard-name">
                        <RarityText rarity={r.rarity}>{def.name}</RarityText>
                      </div>
                      {r.converted ? <div className="tiny gold-t">중복 → +{r.converted} G</div> : null}
                      {r.pity ? <div className="tiny red-t">천장 보장!</div> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="gacha-actions">
          {done && (
            <Btn variant="ghost" onClick={() => setPhase('idle')}>
              닫기
            </Btn>
          )}
          <Btn variant="purple" size="lg" disabled={phase === 'charge' || (phase === 'reveal' && !done) || s.player.gold < GACHA.single} onClick={() => pull(1)}>
            1회 소환 · {GACHA.single} G
          </Btn>
          <Btn variant="gold" size="lg" disabled={phase === 'charge' || (phase === 'reveal' && !done) || s.player.gold < GACHA.multi} onClick={() => pull(10)}>
            10회 소환 · {GACHA.multi} G <span className="kbd">희귀 1개 이상 확정</span>
          </Btn>
        </div>
        <div className="auto-panel">
          <div className="win-title" style={{ marginBottom: 6 }}>
            AUTO SUMMON <span className="sub">자동 소환 · 1회 {GACHA.auto} G (프리미엄)</span>
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            <label className="small row" style={{ gap: 6 }}>
              목표
              <select className="input" style={{ width: 120 }} value={autoTarget} onChange={(e) => setAutoTarget(e.target.value as Rarity)}>
                {AUTO_TARGETS.map((r) => (
                  <option key={r} value={r}>
                    {RARITY_INFO[r].ko} 이상
                  </option>
                ))}
              </select>
            </label>
            <label className="small row" style={{ gap: 6 }}>
              최대
              <select className="input" style={{ width: 90 }} value={autoMax} onChange={(e) => setAutoMax(Number(e.target.value))}>
                {GACHA.autoMaxPulls.map((n) => (
                  <option key={n} value={n}>
                    {n}회
                  </option>
                ))}
              </select>
            </label>
            <span className="grow" />
            <Btn variant="red" disabled={phase === 'charge' || (phase === 'reveal' && !done) || s.player.gold < GACHA.auto} onClick={startAuto} sfx="confirm">
              자동 소환 시작
            </Btn>
          </div>
          <div className="tiny dim" style={{ marginTop: 4 }}>
            최대 {autoGachaMaxCost(autoMax).toLocaleString()} G · 목표 등급이 나오거나 골드가 떨어지면 자동으로 멈춰요. 편한 대신 일반 소환보다 1회당 {GACHA.auto - GACHA.single} G 비쌉니다.
          </div>
        </div>
        <div className="row between small" style={{ marginTop: 8 }}>
          <span>
            보유 <b className="gold-t">{s.player.gold.toLocaleString()} G</b>
          </span>
          <span className="muted">
            전설 천장까지 <b className="gold-t">{GACHA.pity - s.gacha.pity}</b>회 · 총 {s.gacha.pulls}회 소환
          </span>
        </div>
      </Win>

      <Win className="gacha-info">
        <div className="tabs">
          <button className={`tab ${tab === 'rates' ? 'on' : ''}`} onClick={() => setTab('rates')}>
            확률표
          </button>
          <button className={`tab ${tab === 'history' ? 'on' : ''}`} onClick={() => setTab('history')}>
            소환 기록 {equipHistory.length}
          </button>
        </div>
        {tab === 'rates' ? (
          <div className="col">
            {GACHA.rates.map(([r, p]) => (
              <div key={r} className="rate-row">
                <RarityText rarity={r}>{RARITY_INFO[r].en}</RarityText>
                <span className="tiny muted">{RARITY_INFO[r].ko}</span>
                <span className="grow rate-track">
                  <span style={{ width: Math.max(2, p * 2) + '%', background: RARITY_INFO[r].color }} />
                </span>
                <b className="num">{p}%</b>
              </div>
            ))}
            <div className="sep" />
            <div className="tiny muted">
              · {GACHA.pity}회 연속으로 전설 이상이 나오지 않으면 다음 소환은 전설 확정.
              <br />· 10회 소환은 희귀 이상 1개 이상 확정.
              <br />· 같은 외형(칭호·망토·오라)이 중복되면 등급 가치의 50%를 골드로 돌려받습니다.
              <br />· 자동 소환은 1회 {GACHA.auto} G이며 확률·천장은 동일합니다 (10회 확정 보장은 없음).
              <br />· 캐릭터는 <b>캐릭터 소환</b>, 펫은 <b>펫 소환</b> 탭에서 따로 소환해요.
              <br />· 소환은 언제나 보상을 줍니다. 꽝은 없습니다.
            </div>
          </div>
        ) : (
          <div className="gacha-history">
            {equipHistory.length === 0 && <div className="empty-state">아직 소환 기록이 없습니다.</div>}
            {equipHistory.slice(0, 60).map((h, i) => (
              <div key={i} className="row small">
                <ItemIcon item={h.itemId} size={20} />
                <RarityText rarity={h.rarity}>{getItem(h.itemId).name}</RarityText>
                <span className="grow" />
                {h.converted ? <span className="tiny gold-t">+{h.converted} G</span> : null}
                <span className="tiny dim">{new Date(h.at).toLocaleDateString('ko-KR')}</span>
              </div>
            ))}
          </div>
        )}
      </Win>
    </div>
  );
}

type Banner = 'equip' | 'char' | 'pet';
const BANNERS: { id: Banner; label: string; sub: string; icon: string; tint: string }[] = [
  { id: 'equip', label: '장비 소환', sub: '장비 · 소모품 · 외형', icon: 'sword', tint: '#ffd43b' },
  { id: 'char', label: '캐릭터 소환', sub: '새 캐릭터', icon: 'person', tint: '#74c0fc' },
  { id: 'pet', label: '펫 소환', sub: '정령 펫', icon: 'pet_undine', tint: '#4dabf7' },
];

/** Summoning altar with three separate banners. */
export function Gacha() {
  const [banner, setBanner] = useState<Banner>(() => {
    try {
      return (sessionStorage.getItem('lifeRPG3.banner') as Banner) || 'equip';
    } catch {
      return 'equip';
    }
  });
  const pickBanner = (b: Banner) => {
    setBanner(b);
    try {
      sessionStorage.setItem('lifeRPG3.banner', b);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="gacha-wrap">
      <div className="banner-tabs">
        {BANNERS.map((b) => (
          <button key={b.id} className={`banner-tab ${banner === b.id ? 'on' : ''}`} onClick={() => pickBanner(b.id)}>
            <PixelIcon icon={b.icon} tint={b.tint} size={22} />
            <span>
              <b>{b.label}</b>
              <span className="tiny muted"> {b.sub}</span>
            </span>
          </button>
        ))}
      </div>
      {banner === 'equip' ? <EquipBanner /> : banner === 'char' ? <CharBanner /> : <PetBanner />}
    </div>
  );
}
