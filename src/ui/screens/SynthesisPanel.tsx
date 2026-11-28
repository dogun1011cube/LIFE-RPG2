import { useState } from 'react';
import { WEAPON_KINDS } from '../../data/weapons';
import { ARMOR_MATERIALS } from '../../data/armor';
import { ACC_KINDS } from '../../data/accessories';
import { getItem, RARITY_INFO, SLOT_LABEL } from '../../data/items';
import type { SynthResult } from '../../game/inventory';
import { autoPickSynth, checkSynthesis, nextRarity, SYNTH_COST, SYNTH_COUNT, SYNTH_GREAT_CHANCE, synthCandidates, synthesize } from '../../game/inventory';
import type { Rarity } from '../../game/types';
import { RARITIES } from '../../game/types';
import { act, useGame } from '../../store/store';
import { Btn, ItemSlot, Modal, PixelIcon, RarityText } from '../components';
import { confirmDialog } from '../uiStore';

/** 합성소 — 같은 등급 장비 3개 + 골드 → 다음 등급 장비 1개. */
export function SynthesisPanel() {
  const s = useGame();
  const [rarity, setRarity] = useState<Rarity>('common');
  const [sel, setSel] = useState<string[]>([]);
  const [result, setResult] = useState<SynthResult | null>(null);

  const cands = synthCandidates(s, rarity);
  const chosen = sel.filter((u) => cands.some((c) => c.uid === u));
  const chk = checkSynthesis(s, chosen);
  const target = nextRarity(rarity)!;
  const cost = SYNTH_COST[rarity];
  const slotHint = chosen.length === SYNTH_COUNT ? chk.slot : undefined;

  const toggle = (u: string) => {
    if (chosen.includes(u)) setSel(chosen.filter((x) => x !== u));
    else if (chosen.length < SYNTH_COUNT) setSel([...chosen, u]);
  };

  const run = async () => {
    const risky = chosen.map((u) => s.inventory.find((e) => e.uid === u)!).filter((e) => e.plus >= 3 || getItem(e.itemId).unique);
    if (risky.length) {
      const ok = await confirmDialog({
        title: '합성 확인',
        text: `강화했거나 특별한 장비가 재료에 들어 있어요:\n${risky.map((e) => `· ${getItem(e.itemId).name}${e.plus ? ' +' + e.plus : ''}`).join('\n')}\n재료는 사라지고 강화 단계도 이어지지 않습니다. 합성할까요?`,
        ok: '합성',
        danger: true,
      });
      if (!ok) return;
    }
    const r = act((d, c) => synthesize(d, c, chosen));
    if (r.ok) {
      setResult(r.value);
      setSel([]);
    }
  };

  return (
    <div className="synth">
      <div className="small muted">
        같은 등급 장비 <b>{SYNTH_COUNT}개</b>와 골드를 넣으면 <b>한 단계 높은 등급</b>의 장비가 무작위로 나와요. 세 재료의 부위가 모두 같으면 같은 부위가, 같은 계열 무기·같은 소재 방어구·같은 종류 장신구 3개면 그 계열/소재/종류가 유지되고, {Math.round(SYNTH_GREAT_CHANCE * 100)}% 확률로 <span className="gold-t">대성공</span>(+1~+3 강화된 상태)!
      </div>
      <div className="tabs" style={{ marginTop: 8 }}>
        {RARITIES.filter((r) => r !== 'mythic').map((r) => (
          <button
            key={r}
            className={`tab ${rarity === r ? 'on' : ''}`}
            onClick={() => {
              setRarity(r);
              setSel([]);
            }}
          >
            <span className={rarity === r ? '' : `r-${r}`}>{RARITY_INFO[r].ko}</span> {synthCandidates(s, r).length}
          </button>
        ))}
      </div>

      <div className="synth-bench">
        <div className="synth-mats">
          {Array.from({ length: SYNTH_COUNT }, (_, i) => {
            const u = chosen[i];
            const e = u ? s.inventory.find((x) => x.uid === u) : null;
            return e ? (
              <ItemSlot key={u} item={e.itemId} plus={e.plus} onClick={() => toggle(u)} />
            ) : (
              <div key={'empty' + i} className="slot empty synth-empty">
                +
              </div>
            );
          })}
        </div>
        <div className="synth-arrow">
          <span className="gold-t">▶</span>
          <span className="tiny muted num">{cost.toLocaleString()} G</span>
        </div>
        <div className="synth-out" style={{ ['--rc' as string]: RARITY_INFO[target].color } as React.CSSProperties}>
          <span className="big">?</span>
          <span className="tiny">
            <RarityText rarity={target}>{RARITY_INFO[target].ko}</RarityText>
          </span>
          <span className="tiny dim">{chosen.length === SYNTH_COUNT && chk.kind ? WEAPON_KINDS[chk.kind].ko : chosen.length === SYNTH_COUNT && chk.material && slotHint ? `${ARMOR_MATERIALS[chk.material].ko} ${SLOT_LABEL[slotHint]}` : chosen.length === SYNTH_COUNT && chk.accKind ? ACC_KINDS[chk.accKind].ko : slotHint ? SLOT_LABEL[slotHint] : '무작위 부위'}</span>
        </div>
      </div>

      <div className="row wrap" style={{ justifyContent: 'center', margin: '10px 0' }}>
        <Btn variant="ghost" size="sm" disabled={cands.length < SYNTH_COUNT} onClick={() => setSel(autoPickSynth(s, rarity))}>
          자동 채우기
        </Btn>
        <Btn variant="ghost" size="sm" disabled={!chosen.length} onClick={() => setSel([])}>
          비우기
        </Btn>
        <Btn variant="purple" disabled={!chk.ok || s.player.gold < cost} onClick={run} sfx={null}>
          <PixelIcon icon="hammer" tint="#e5dbff" size={16} /> 합성하기 ({cost.toLocaleString()} G)
        </Btn>
      </div>
      {chosen.length === SYNTH_COUNT && !chk.ok && <div className="warn-line">{chk.reason}</div>}
      {chk.ok && s.player.gold < cost && <div className="warn-line">골드가 {(cost - s.player.gold).toLocaleString()} G 부족합니다.</div>}

      <div className="tiny muted">재료로 쓸 수 있는 {RARITY_INFO[rarity].ko} 장비 (장착 중·잠긴 장비 제외)</div>
      {cands.length === 0 ? (
        <div className="empty-state small">이 등급의 남는 장비가 없어요. 전투 전리품·보물상자·소환으로 모아 보세요.</div>
      ) : (
        <div className="inv-grid" style={{ marginTop: 6 }}>
          {cands.map((e) => (
            <ItemSlot key={e.uid} item={e.itemId} plus={e.plus} selected={chosen.includes(e.uid)} onClick={() => toggle(e.uid)} />
          ))}
        </div>
      )}

      {result && (
        <Modal title={result.great ? 'SYNTHESIS — 대성공!' : 'SYNTHESIS SUCCESS'} color="gold" onClose={() => setResult(null)}>
          <div className="synth-result" style={{ ['--rc' as string]: RARITY_INFO[getItem(result.itemId).rarity].color } as React.CSSProperties}>
            <ItemSlot item={result.itemId} plus={result.plus} size={84} />
            <div className="big">
              <RarityText rarity={getItem(result.itemId).rarity}>
                {getItem(result.itemId).name}
                {result.plus ? ` +${result.plus}` : ''}
              </RarityText>
            </div>
            <div className="small muted">
              {RARITY_INFO[getItem(result.itemId).rarity].ko} · {SLOT_LABEL[getItem(result.itemId).slot!]}
              {result.sameSlot ? ' (같은 부위 합성)' : ''}
            </div>
            <div className="small">{getItem(result.itemId).desc}</div>
          </div>
          <div className="modal-actions">
            <Btn variant="gold" onClick={() => setResult(null)}>
              확인
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
