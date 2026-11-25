import { useEffect, useState } from 'react';
import { playSfx } from '../../audio/sfx';
import { getItem, RARITY_INFO } from '../../data/items';
import { GACHA } from '../../data/world';
import type { GachaResult } from '../../game/shop';
import { gachaPull } from '../../game/shop';
import { RARITIES } from '../../game/types';
import { act, useGame } from '../../store/store';
import { Btn, ItemIcon, RarityText, Win } from '../components';

type Phase = 'idle' | 'charge' | 'reveal';

export function Gacha() {
  const s = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<GachaResult[]>([]);
  const [flipped, setFlipped] = useState(0);
  const [tab, setTab] = useState<'rates' | 'history'>('rates');

  const best = results.reduce((a, r) => Math.max(a, RARITIES.indexOf(r.rarity)), 0);
  const bestColor = RARITY_INFO[RARITIES[best]].color;

  const pull = (n: 1 | 10) => {
    const r = act((d, c) => gachaPull(d, c, n));
    if (!r.ok) return;
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

  useEffect(() => {
    if (phase !== 'reveal' || flipped >= results.length) return;
    const t = setTimeout(
      () => {
        const r = results[flipped];
        const ri = RARITIES.indexOf(r.rarity);
        playSfx(ri >= 4 ? 'gachaLegend' : ri >= 2 ? 'gachaRare' : 'gachaReveal');
        setFlipped(flipped + 1);
      },
      flipped === 0 ? 150 : 230,
    );
    return () => clearTimeout(t);
  }, [phase, flipped, results]);

  const done = phase === 'reveal' && flipped >= results.length;

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

        {phase === 'reveal' && (
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
            소환 기록 {s.gacha.history.length}
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
              <br />· 소환은 언제나 보상을 줍니다. 꽝은 없습니다.
            </div>
          </div>
        ) : (
          <div className="gacha-history">
            {s.gacha.history.length === 0 && <div className="empty-state">아직 소환 기록이 없습니다.</div>}
            {s.gacha.history.slice(0, 60).map((h, i) => (
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
