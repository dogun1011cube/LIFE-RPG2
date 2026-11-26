import { getItem, SLOT_LABEL } from '../../data/items';
import { getRank, nextRank, RANKS } from '../../data/ranks';
import { SKILLS } from '../../data/skills';
import { STAT_LABEL } from '../../data/subjects';
import { staminaMax } from '../../game/core';
import { bossCount, currentRank, deriveStats, levelProgress } from '../../game/progression';
import { fmtDuration, totalSeconds } from '../../game/study';
import { EQUIP_POSITIONS, STAT_KEYS } from '../../game/types';
import { useGame } from '../../store/store';
import { Bar, HeroSprite, ItemSlot, PixelIcon, RankBadge, Win } from '../components';
import { heroTitle } from '../heroLook';
import { go } from '../uiStore';

const SLOT_ICON: Record<string, string> = { weapon: 'sword', helmet: 'helmet', armor: 'armor', gloves: 'gloves', boots: 'boots', acc1: 'ring', acc2: 'amulet' };

export function Status() {
  const s = useGame();
  const d = deriveStats(s);
  const lp = levelProgress(s.player.totalExp);
  const rank = currentRank(s);
  const rdef = getRank(rank);
  const nr = nextRank(rank);
  const title = heroTitle(s);
  const bosses = bossCount(s);

  return (
    <div className="status">
      <Win className="status-main" color="gold" title="CHARACTER STATUS" sub="캐릭터 정보">
        <div className="status-grid">
          <div className="portrait">
            <div className="portrait-frame">
              <HeroSprite state={s} scale={9} />
            </div>
            {title && <div className="hero-title">「{title}」</div>}
            <div className="hero-name">{s.player.name}</div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <RankBadge rank={rank} size="lg" />
              <div>
                <div className="gold-t big">Lv {lp.level}</div>
                <div className="small" style={{ color: rdef.color }}>
                  {rdef.title}
                </div>
              </div>
            </div>
          </div>

          <div className="col">
            <Bar kind="hp" value={s.player.hp} max={d.maxHp} label={`HP ${s.player.hp} / ${d.maxHp}`} size="tall" />
            <Bar kind="mp" value={s.player.mp} max={d.maxMp} label={`MP ${s.player.mp} / ${d.maxMp}`} size="tall" />
            <Bar kind="exp" value={lp.into} max={lp.need} label={`EXP ${lp.into} / ${lp.need}`} size="tall" />
            <div className="tiny muted">총 EXP {s.player.totalExp.toLocaleString()} · 다음 레벨까지 {Math.max(0, lp.need - lp.into)}</div>

            <div className="stat-cards">
              <div className="stat-card">
                <span className="lbl">ATK 공격력</span>
                <b>{d.atk}</b>
              </div>
              <div className="stat-card">
                <span className="lbl">DEF 방어력</span>
                <b>{d.def}</b>
              </div>
              <div className="stat-card">
                <span className="lbl">MATK 마공</span>
                <b>{d.matk}</b>
              </div>
              <div className="stat-card">
                <span className="lbl">CRIT 치명타</span>
                <b>{d.crit}%</b>
              </div>
            </div>

            <div className="attr-table">
              {STAT_KEYS.map((k) => (
                <div key={k} className="attr-row" title={STAT_LABEL[k].desc}>
                  <span className="attr-name">
                    {STAT_LABEL[k].en} <span className="tiny muted">{STAT_LABEL[k].ko}</span>
                  </span>
                  <b className="num attr-val">{d[k]}</b>
                  <span className="tiny dim num">
                    기본 {d.base[k]} · 훈련 <span className="green-t">+{d.training[k]}</span> · 장비 <span className="blue-t">+{d.gear[k] || 0}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="tiny muted">
              공부 EXP 보너스 <b className="purple-t">+{Math.round(d.expBonus)}%</b> · 골드 보너스 <b className="gold-t">+{d.goldBonus}%</b> · 치명타 피해 ×{d.critDmg}
            </div>
          </div>

          <div className="col">
            <div className="win-title" style={{ marginBottom: 2 }}>
              EQUIPMENT
            </div>
            <div className="equip-grid">
              {EQUIP_POSITIONS.map((pos) => {
                const uid = s.player.equipment[pos];
                const e = uid ? s.inventory.find((x) => x.uid === uid) : null;
                return (
                  <div key={pos} className="equip-cell" onClick={() => go('inventory')}>
                    {e ? (
                      <ItemSlot item={e.itemId} plus={e.plus} size={48} />
                    ) : (
                      <div className="slot empty" style={{ width: 48, height: 48 }}>
                        <PixelIcon icon={SLOT_ICON[pos]} tint="#3c4697" size={28} />
                      </div>
                    )}
                    <div>
                      <div className="tiny muted">{SLOT_LABEL[pos]}</div>
                      <div className="small">{e ? `${getItem(e.itemId).name}${e.plus ? ' +' + e.plus : ''}` : <span className="dim">비어 있음</span>}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Win>

      <div className="status-side">
        <Win title="RECORDS" sub="기록">
          <div className="kv">
            <span>총 공부 시간</span>
            <span className="gold-t">{fmtDuration(totalSeconds(s))}</span>
            <span>현재 RPG 일차</span>
            <span>DAY {s.day.number}</span>
            <span>연속 / 최고 연속</span>
            <span>
              {s.streak.current}일 / {s.streak.longest}일
            </span>
            <span>현재 골드</span>
            <span className="gold-t">{s.player.gold.toLocaleString()} G</span>
            <span>오늘 획득 골드</span>
            <span>+{s.day.goldEarned.toLocaleString()} G</span>
            <span>총 획득 골드</span>
            <span>{s.stats.goldEarned.toLocaleString()} G</span>
            <span>총 사용 골드</span>
            <span>{s.stats.goldSpent.toLocaleString()} G</span>
            <span>기력</span>
            <span>
              {s.player.stamina} / {staminaMax(s)}
            </span>
            <span>처치한 몬스터</span>
            <span>{s.stats.monstersDefeated}</span>
            <span>승 / 패 / 도주</span>
            <span>
              {s.stats.battlesWon} / {s.stats.battlesLost} / {s.stats.escapes}
            </span>
            <span>격파한 보스</span>
            <span>{bosses}종</span>
            <span>탑 최고 층</span>
            <span>{s.tower.highestCleared}F</span>
            <span>최대 피해</span>
            <span>{s.stats.highestDamage}</span>
            <span>EXP 출처</span>
            <span className="tiny">
              공부 {s.stats.expFromStudy} · 전투 {s.stats.expFromBattle} · 퀘스트 {s.stats.expFromQuests}
            </span>
          </div>
          {s.legacy && <div className="tiny dim" style={{ marginTop: 8 }}>v2에서 이전된 세이브 (당시 층 기록 {s.legacy.floor}F → 기력으로 변환)</div>}
        </Win>

        <Win title="RANK" sub="랭크 진행">
          <div className="rank-ladder">
            {RANKS.map((r) => (
              <span key={r.id} className={`rl ${r.id === rank ? 'on' : ''}`} style={{ ['--rc' as string]: r.color } as React.CSSProperties}>
                {r.id}
              </span>
            ))}
          </div>
          {nr ? (
            <div className="col" style={{ gap: 4, marginTop: 8 }}>
              <div className="small">
                다음 랭크 <b style={{ color: nr.color }}>{nr.id} · {nr.title}</b>
              </div>
              <Req ok={lp.level >= nr.level} label={`레벨 ${nr.level}`} cur={lp.level} />
              <Req ok={s.tower.highestCleared >= nr.floor} label={`탑 ${nr.floor}층 돌파`} cur={s.tower.highestCleared} />
              <Req ok={bosses >= nr.bosses} label={`보스 ${nr.bosses}종 격파`} cur={bosses} />
              <div className="tiny muted">해금: {nr.perks.join(', ')}</div>
            </div>
          ) : (
            <div className="gold-t">최고 랭크에 도달했습니다!</div>
          )}
        </Win>

        <Win title="SKILLS" sub="스킬">
          <div className="col" style={{ gap: 6 }}>
            {SKILLS.map((sk) => {
              const on = sk.level <= lp.level;
              return (
                <div key={sk.id} className={`skill-row ${on ? '' : 'locked'}`}>
                  <b>{on ? sk.name : '???'}</b>
                  <span className="tiny muted grow">{on ? sk.desc : `Lv ${sk.level}에 습득`}</span>
                  <span className="tiny blue-t">MP {sk.mp}</span>
                </div>
              );
            })}
          </div>
        </Win>
      </div>
    </div>
  );
}

function Req({ ok, label, cur }: { ok: boolean; label: string; cur: number }) {
  return (
    <div className={`req ${ok ? 'ok' : ''}`}>
      <span className="box">{ok ? '✓' : ''}</span> {label} <span className="tiny dim">(현재 {cur})</span>
    </div>
  );
}
