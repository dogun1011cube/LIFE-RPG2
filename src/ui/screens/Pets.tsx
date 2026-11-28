import { useState } from 'react';
import { ATK_INFO } from '../../data/characters';
import type { PetKind, PetRarity } from '../../data/pets';
import { PET_FUSIONS, PET_MERGE_COUNT, PET_ORDER, PET_RARITIES, PET_RARITY_INFO, petAction, petPassive, PETS, nextPetRarity } from '../../data/pets';
import { activePet, fusePets, fusionMaterials, mergeAllPets, mergePets, petMaterials, setActivePet, togglePetLock } from '../../game/pets';
import type { PetEntry } from '../../game/types';
import { act, useGame } from '../../store/store';
import { Btn, PixelIcon, Win } from '../components';
import { statText } from '../GearInfo';
import { go } from '../uiStore';
import { PetIcon, PetRarityText } from './GachaBanners';

/** "매 턴: 공격력의 52% 화염 피해 · HP 5.5% 회복" */
export function petActionText(kind: PetKind, rarity: PetRarity) {
  const a = petAction(kind, rarity);
  const parts: string[] = [];
  if (a.attack) parts.push(`공격력의 ${Math.round(a.attack * 100)}%${a.hits && a.hits > 1 ? ` ×${a.hits}` : ''} ${ATK_INFO[a.type ?? 'magic'].ko} 피해`);
  if (a.drainPct) parts.push(`준 피해의 ${a.drainPct}% 흡수`);
  if (a.healPct) parts.push(`HP ${a.healPct}% 회복`);
  if (a.mpPct) parts.push(`MP ${a.mpPct}% 회복`);
  return '매 턴: ' + parts.join(' · ');
}

function PetCard({ p, active, selected, onClick, onLock }: { p: PetEntry; active: boolean; selected: boolean; onClick: () => void; onLock: () => void }) {
  return (
    <div
      className={`pet-card r-${p.rarity} ${selected ? 'sel' : ''}`}
      style={{ ['--pc' as string]: PET_RARITY_INFO[p.rarity].color } as React.CSSProperties}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onLock();
      }}
      role="button"
      tabIndex={0}
      title={`${PET_RARITY_INFO[p.rarity].ko} ${PETS[p.kind].name} (${PETS[p.kind].title})${p.locked ? ' (잠김)' : ''} — 우클릭: 잠금`}
    >
      <PetIcon kind={p.kind} size={36} />
      <span className="pet-card-r">{PET_RARITY_INFO[p.rarity].en.slice(0, p.rarity === 'secret' ? 6 : 3)}</span>
      {active && <span className="eq">E</span>}
      {p.locked && <PixelIcon icon="lock" tint="#ffd43b" size={12} className="lock-badge" />}
    </div>
  );
}

export function Pets() {
  const s = useGame();
  const [filter, setFilter] = useState<PetKind | 'all'>('all');
  const [sel, setSel] = useState<string | null>(null);
  const partner = activePet(s);
  const sorted = s.pets
    .filter((p) => filter === 'all' || p.kind === filter)
    .slice()
    .sort((a, b) => PET_RARITIES.indexOf(b.rarity) - PET_RARITIES.indexOf(a.rarity) || PET_ORDER.indexOf(a.kind) - PET_ORDER.indexOf(b.kind));
  const selPet = s.pets.find((p) => p.uid === sel) ?? partner ?? null;
  const mats = petMaterials(s);
  const sameMats = selPet ? mats.filter((p) => p.kind === selPet.kind && p.rarity === selPet.rarity) : [];
  const canMergeSel = !!selPet && !!nextPetRarity(selPet.rarity) && sameMats.length >= PET_MERGE_COUNT;
  const trios = PET_RARITIES.slice(0, 5).reduce((n, r) => n + PET_ORDER.slice(0, 6).reduce((m, k) => m + Math.floor(mats.filter((p) => p.kind === k && p.rarity === r).length / PET_MERGE_COUNT), 0), 0);

  return (
    <div className="pets">
      <div className="pets-left">
        <Win title="MY PETS" sub={`펫 보관함 · ${s.pets.length}마리`} right={<Btn size="sm" variant="purple" onClick={() => go('gacha')}>펫 소환 →</Btn>}>
          <div className="kind-filter">
            <button className={`kind-chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
              전체
            </button>
            {PET_ORDER.map((k) => (
              <button key={k} className={`kind-chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
                <PetIcon kind={k} size={14} /> {PETS[k].name} <span className="tiny">{s.pets.filter((p) => p.kind === k).length}</span>
              </button>
            ))}
          </div>
          {s.pets.length === 0 ? (
            <div className="empty-state">
              아직 펫이 없어요. 소환의 제단 → <b>펫 소환</b>에서 정령을 만나 보세요!
            </div>
          ) : (
            <div className="pet-grid">
              {sorted.map((p) => (
                <PetCard key={p.uid} p={p} active={p.uid === s.player.activePet} selected={selPet?.uid === p.uid} onClick={() => setSel(p.uid)} onLock={() => act((d, c) => togglePetLock(d, c, p.uid))} />
              ))}
            </div>
          )}
          <div className="tiny dim" style={{ marginTop: 6 }}>
            우클릭 = 잠금 (잠긴 펫과 함께하는 펫은 합성 재료로 쓰이지 않아요)
          </div>
        </Win>

        <Win title="SECRET FUSION" sub="시크릿 융합" color="purple">
          {PET_FUSIONS.map((f) => {
            const ready = fusionMaterials(s, f.result);
            return (
              <div key={f.result} className="fusion-row">
                <div className="fusion-needs">
                  {f.needs.map((k, i) => {
                    const have = mats.some((p) => p.kind === k && p.rarity === 'mythic');
                    return (
                      <span key={k} className={`fusion-slot ${have ? 'ok' : ''}`} title={`신화 ${PETS[k].name}`}>
                        <PetIcon kind={k} size={28} />
                        <span className="tiny">{have ? '✔' : '신화'}</span>
                        {i < f.needs.length - 1 && <span className="plus-sign">+</span>}
                      </span>
                    );
                  })}
                </div>
                <span className="arrow">→</span>
                <span className="fusion-result">
                  <PetIcon kind={f.result} size={40} />
                  <PetRarityText rarity="secret">{PETS[f.result].name}</PetRarityText>
                </span>
                <Btn variant="purple" size="sm" disabled={!ready} onClick={() => act((d, c) => setSel(fusePets(d, c, f.result).uid))}>
                  융합
                </Btn>
              </div>
            );
          })}
          <div className="tiny muted">신화 등급 정령 3마리(서로 다른 정령)를 하나로 융합합니다. 천사·악마는 시크릿 등급이에요.</div>
        </Win>
      </div>

      <div className="pets-right">
        <Win title="PARTNER" sub="함께하는 펫" color="gold">
          {partner ? (
            <div className="row">
              <div className={`pet-portrait r-${partner.rarity}`} style={{ ['--pc' as string]: PET_RARITY_INFO[partner.rarity].color } as React.CSSProperties}>
                <PetIcon kind={partner.kind} size={64} />
              </div>
              <div className="grow col" style={{ gap: 2 }}>
                <div className="big">
                  <PetRarityText rarity={partner.rarity}>{PETS[partner.kind].name}</PetRarityText> <span className="tiny muted">{PETS[partner.kind].title}</span>
                </div>
                <div className="small">
                  <PetRarityText rarity={partner.rarity} /> 등급
                </div>
                <div className="small blue-t">{statText(petPassive(partner.kind, partner.rarity))}</div>
                <div className="small green-t">{petActionText(partner.kind, partner.rarity)}</div>
              </div>
            </div>
          ) : (
            <div className="empty-state">함께하는 펫이 없어요. 아래에서 펫을 골라 출전시키세요.</div>
          )}
        </Win>

        <Win title="DETAIL" sub="펫 정보">
          {selPet ? (
            <div className="col">
              <div className="row">
                <div className={`pet-portrait r-${selPet.rarity}`} style={{ ['--pc' as string]: PET_RARITY_INFO[selPet.rarity].color } as React.CSSProperties}>
                  <PetIcon kind={selPet.kind} size={48} />
                </div>
                <div className="grow">
                  <div>
                    <PetRarityText rarity={selPet.rarity}>
                      {PET_RARITY_INFO[selPet.rarity].ko} {PETS[selPet.kind].name}
                    </PetRarityText>{' '}
                    <span className="tiny muted">{PETS[selPet.kind].title}</span>
                  </div>
                  <div className="tiny">{PETS[selPet.kind].desc}</div>
                </div>
              </div>
              <div className="small blue-t">보너스: {statText(petPassive(selPet.kind, selPet.rarity))}</div>
              <div className="small green-t">{petActionText(selPet.kind, selPet.rarity)}</div>
              <div className="row wrap">
                {selPet.uid === s.player.activePet ? (
                  <Btn variant="ghost" size="sm" onClick={() => act((d, c) => setActivePet(d, c, null))}>
                    출전 해제
                  </Btn>
                ) : (
                  <Btn variant="gold" size="sm" onClick={() => act((d, c) => setActivePet(d, c, selPet.uid))}>
                    함께하기 (출전)
                  </Btn>
                )}
                <Btn variant="ghost" size="sm" onClick={() => act((d, c) => togglePetLock(d, c, selPet.uid))} sfx={null}>
                  <PixelIcon icon="lock" tint={selPet.locked ? '#ffd43b' : '#8d94c4'} size={12} /> {selPet.locked ? '잠금 해제' : '잠금'}
                </Btn>
              </div>
              <div className="sep" />
              <div className="win-title" style={{ marginBottom: 2 }}>
                MERGE <span className="sub">합성</span>
              </div>
              {nextPetRarity(selPet.rarity) ? (
                <>
                  <div className="small">
                    {PETS[selPet.kind].name} <PetRarityText rarity={selPet.rarity} /> ×{PET_MERGE_COUNT} → <PetRarityText rarity={nextPetRarity(selPet.rarity)!} /> 1마리
                    <span className="tiny muted"> (재료 {sameMats.length}/{PET_MERGE_COUNT})</span>
                  </div>
                  <Btn variant="purple" disabled={!canMergeSel} onClick={() => act((d, c) => setSel(mergePets(d, c, sameMats.slice(0, PET_MERGE_COUNT).map((p) => p.uid)).uid))}>
                    합성하기
                  </Btn>
                </>
              ) : (
                <div className="small muted">{selPet.rarity === 'mythic' ? '신화 등급은 왼쪽 아래 시크릿 융합에 쓸 수 있어요.' : '최고 등급입니다.'}</div>
              )}
            </div>
          ) : (
            <div className="empty-state">펫을 선택하세요.</div>
          )}
          <div className="sep" />
          <div className="row between">
            <span className="small">
              일괄 합성 <span className="tiny muted">가능한 묶음 {trios}개 (낮은 등급부터 연쇄 합성)</span>
            </span>
            <Btn variant="green" size="sm" disabled={trios === 0} onClick={() => act((d, c) => mergeAllPets(d, c))}>
              모두 합성
            </Btn>
          </div>
        </Win>
      </div>
    </div>
  );
}
