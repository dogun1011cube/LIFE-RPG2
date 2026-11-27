import { getRank, nextRank } from '../../data/ranks';
import { GameError, spendGold, staminaMax, fullHeal, sfx, toast } from '../../game/core';
import { goalSeconds } from '../../game/day';
import { currentRank, deriveStats, levelProgress } from '../../game/progression';
import { allQuestStatus } from '../../game/quests';
import { fmtClock, fmtDuration, todaySeconds, todaySubjects, totalSeconds } from '../../game/study';
import { floorInfo } from '../../game/tower';
import { act, useGame } from '../../store/store';
import { Bar, Btn, PixelIcon, RankBadge, Ticker, Win } from '../components';
import { heroAura, heroPalette, heroTitle } from '../heroLook';
import { Stage } from '../Stage';
import { go, setUI } from '../uiStore';

const TIPS = [
  '공부 10분 = 기력 1. 기력으로 몬스터와 싸우고 탑을 오른다.',
  '과목마다 훈련되는 능력치가 다르다. 국어·화학 → 지능, 물리·지구과학 → 힘, 수학·영어 → 민첩, 생명과학·한국사·사탐 → 행운.',
  '같은 과목을 2시간 공부할 때마다 해당 능력치가 영구히 1 오른다.',
  '공부하면 HP와 MP도 회복된다. (1분 = 1%)',
  '자정이 지나도 하루는 끝나지 않는다. 잠들고 일어날 때 새 RPG 하루가 시작된다.',
  '암흑 기사가 힘을 모으면 다음 턴에 방어하라!',
  '4층, 7층, 13층에는 특별한 사건이 기다린다.',
  '연속 달성 일수만큼 공부 EXP 보너스가 붙는다. (하루 +2%, 최대 +20%)',
];

export function innCost(level: number) {
  return 5 * level + 10;
}

export function Home() {
  const s = useGame();
  const d = deriveStats(s);
  const lp = levelProgress(s.player.totalExp);
  const rank = currentRank(s);
  const rdef = getRank(rank);
  const nr = nextRank(rank);
  const today = todaySeconds(s);
  const goal = goalSeconds(s);
  const nextFloor = Math.max(1, s.tower.highestCleared + 1);
  const nf = floorInfo(nextFloor);
  const dailies = allQuestStatus(s).filter((q) => q.def.kind === 'daily');
  const doneDaily = dailies.filter((q) => q.done).length;
  const tip = TIPS[(s.day.number + Math.floor(Date.now() / 60000)) % TIPS.length];
  const title = heroTitle(s);
  const cost = innCost(d.level);

  const rest = () =>
    act((dd, ctx) => {
      const st = deriveStats(dd);
      if (dd.player.hp >= st.maxHp && dd.player.mp >= st.maxMp) throw new GameError('이미 HP와 MP가 가득 찼습니다.');
      spendGold(dd, cost);
      fullHeal(dd);
      toast(ctx, 'info', '여관에서 휴식', `HP·MP 완전 회복 (−${cost} G)`);
      sfx(ctx, 'heal');
    });

  const todaySub = Object.entries(todaySubjects(s)).sort((a, b) => b[1] - a[1]);
  const maxSub = Math.max(1, ...todaySub.map(([, v]) => v));
  const recent = s.study.slice(-5).reverse();
  return (
    <div className="home">
      <div className="home-left">
      <Win className="home-stage" color="gold">
        <Stage bg="town" heroPalette={heroPalette(s)} aura={heroAura(s)} monster={s.tower.highestCleared < 1 ? 'slime_green' : null} />
        <div className="stage-overlay">
          <div className="stage-name">
            <RankBadge rank={rank} size="lg" />
            <div>
              {title && <div className="hero-title">「{title}」</div>}
              <div className="hero-name">{s.player.name}</div>
              <div className="small">
                <span className="gold-t">Lv {lp.level}</span> · <span style={{ color: rdef.color }}>{rdef.title}</span>
              </div>
            </div>
          </div>
          <div className="stage-day">
            <div className="tiny muted">CURRENT RPG DAY</div>
            <div className="big gold-t shadow-t">DAY {s.day.number}</div>
            <div className="tiny">{s.day.status === 'sleeping' ? '잠든 중' : '활동 중'} · 연속 {s.streak.current}일</div>
          </div>
        </div>
        <div className="stage-actions">
          <Btn variant="gold" size="lg" onClick={() => go('study')} sfx="confirm">
            <PixelIcon icon="book" tint="#2a1a00" size={20} /> RECORD STUDY
          </Btn>
          <Btn variant="purple" size="lg" onClick={() => go('tower')}>
            <PixelIcon icon="tower" tint="#e5dbff" size={20} /> {nextFloor}층 도전
          </Btn>
          <Btn variant="red" size="lg" onClick={() => go('battle')}>
            <PixelIcon icon="swords" tint="#fff" size={20} /> 사냥
          </Btn>
        </div>
      </Win>
      <div className="home-lower">
        <Win title="TODAY'S STUDY" sub="오늘의 과목">
          {todaySub.length === 0 ? (
            <div className="empty-state small">
              아직 오늘의 공부 기록이 없어요.
              <br />
              <Btn size="sm" variant="gold" onClick={() => go('study')} className="mt8">
                첫 기록 남기기
              </Btn>
            </div>
          ) : (
            <div className="subj-bars">
              {todaySub.map(([name, sec]) => (
                <div key={name} className="subj-bar">
                  <span className="nm">{name}</span>
                  <span className="track">
                    <span style={{ width: (sec / maxSub) * 100 + '%', background: s.subjects.find((x) => x.name === name)?.color }} />
                  </span>
                  <span className="tm num">{fmtDuration(sec)}</span>
                </div>
              ))}
            </div>
          )}
        </Win>
        <Win title="ADVENTURE LOG" sub="최근 기록">
          {recent.length === 0 ? (
            <div className="empty-state small">공부를 기록하면 모험 일지가 채워집니다.</div>
          ) : (
            <div className="col" style={{ gap: 4 }}>
              {recent.map((r) => (
                <div key={r.id} className="log-entry small">
                  <span className="dot" style={{ background: s.subjects.find((x) => x.name === r.subject)?.color }} />
                  <span className="grow">
                    <b>{r.subject}</b> {fmtDuration(r.seconds)}
                  </span>
                  <span className="tiny dim">
                    DAY {r.day} · +{r.exp} EXP
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="tiny muted" style={{ marginTop: 8 }}>
            처치 {s.stats.monstersDefeated} · 보스 {s.stats.bossesDefeated.length}종 · 최고 {s.tower.highestCleared}F · 최장 연속 {s.streak.longest}일
          </div>
        </Win>
      </div>
      </div>

      <div className="home-side">
        <Win title="STATUS" sub="상태">
          <div className="col">
            <Bar kind="hp" value={s.player.hp} max={d.maxHp} label={`HP ${s.player.hp} / ${d.maxHp}`} size="tall" />
            <Bar kind="mp" value={s.player.mp} max={d.maxMp} label={`MP ${s.player.mp} / ${d.maxMp}`} size="tall" />
            <Bar kind="exp" value={lp.into} max={lp.need} label={`EXP ${lp.into} / ${lp.need} (${Math.floor(lp.pct * 100)}%)`} size="tall" />
            <Bar kind="st" value={s.player.stamina} max={staminaMax(s)} label={`기력 ${s.player.stamina} / ${staminaMax(s)}`} size="tall" />
          </div>
          <div className="home-res">
            <div>
              <PixelIcon icon="coin" tint="#ffcf4a" size={20} />
              <span className="muted small">GOLD</span>
              <b className="gold-t big">
                <Ticker value={s.player.gold} />
              </b>
              <span className="tiny muted">오늘 +{s.day.goldEarned}</span>
            </div>
            <div>
              <PixelIcon icon="hourglass" tint="#ffd8a8" size={20} />
              <span className="muted small">TODAY</span>
              <b className="big num">{fmtClock(today)}</b>
              <span className="tiny muted">누적 {fmtDuration(totalSeconds(s))}</span>
            </div>
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            오늘의 목표 {fmtDuration(goal)}
          </div>
          <Bar kind="st" value={Math.min(today, goal)} max={goal} label={today >= goal ? '★ 목표 달성' : `${Math.floor((today / goal) * 100)}%`} />
          <div className="row" style={{ marginTop: 10 }}>
            <Btn size="sm" variant="ghost" onClick={rest} disabled={s.day.status === 'sleeping'}>
              <PixelIcon icon="heart" tint="#ff5a6e" size={14} /> 여관 휴식 ({cost} G)
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => setUI({ dayFlow: s.day.status === 'sleeping' ? 'sleeping' : 'summary' })}>
              <PixelIcon icon="moon" tint="#ffe066" size={14} /> {s.day.status === 'sleeping' ? '일어나기' : '하루 마감'}
            </Btn>
          </div>
        </Win>

        <Win title="TOWER" sub="시련의 탑" right={<span className="chip">최고 {s.tower.highestCleared}F</span>}>
          <div className="row">
            <div className="grow">
              <div className="small muted">다음 목표</div>
              <div className="gold-t">{nf.name}</div>
              <div className="tiny muted">{nf.zone} · 몬스터 Lv {nf.level} · 기력 {nf.stamina}</div>
            </div>
            <Btn size="sm" variant="purple" onClick={() => go('tower')}>
              입장
            </Btn>
          </div>
          <Bar kind="boss" value={s.tower.highestCleared} max={100} size="thin" className="mt8" />
          <div className="tiny dim" style={{ marginTop: 4 }}>
            정상까지 {Math.max(0, 100 - s.tower.highestCleared)}층
          </div>
        </Win>

        <Win title="DAILY" sub={`일일 퀘스트 ${doneDaily}/${dailies.length}`} right={<Btn size="sm" variant="ghost" onClick={() => go('quests')}>보기</Btn>}>
          <div className="col" style={{ gap: 6 }}>
            {dailies.slice(0, 4).map((q) => (
              <div key={q.def.id} className={`mini-quest ${q.done ? 'done' : ''}`}>
                <span className="grow small">{q.def.desc}</span>
                <span className="tiny num muted">
                  {Math.min(q.value, q.def.target)}/{q.def.target}
                </span>
              </div>
            ))}
          </div>
          {nr && (
            <div className="tiny muted" style={{ marginTop: 8 }}>
              다음 랭크 <b style={{ color: nr.color }}>{nr.id}</b>: Lv {nr.level} · {nr.floor}층 · 보스 {nr.bosses}종
            </div>
          )}
        </Win>
        <div className="tip-line small">
          <PixelIcon icon="star" tint="#ffd43b" size={14} /> TIP · {tip}
        </div>
      </div>
    </div>
  );
}
