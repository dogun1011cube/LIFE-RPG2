import { useRef, useState } from 'react';
import { playSfx } from '../../audio/sfx';
import { fullHeal } from '../../game/core';
import { createNewGame } from '../../game/state';
import { fmtDuration, totalSeconds } from '../../game/study';
import { deleteSave, exportSave, getBackup, getSnapshots, importSave, legacyAvailable, markLegacyImported, migrateLegacy, readLegacy } from '../../store/persistence';
import { act, getLastSavedAt, getState, saveNow, setState, useGame } from '../../store/store';
import { Btn, Win } from '../components';
import { confirmDialog, go } from '../uiStore';
import { AccountPanel } from '../online/AccountUI';

export function Settings() {
  const s = useGame();
  const [name, setName] = useState(s.player.name);
  const [resetText, setResetText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const snaps = getSnapshots();
  const backup = getBackup();
  const [, force] = useState(0);

  const set = (fn: (st: typeof s.settings) => void) =>
    act((d) => {
      fn(d.settings);
    });

  const download = () => {
    const blob = new Blob([exportSave(getState())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `life-rpg-save-day${s.day.number}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    act((_, c) => c.events.push({ type: 'toast', kind: 'save', title: 'EXPORTED', text: '세이브 파일을 내려받았어요.' }));
  };

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const next = importSave(text);
      const ok = await confirmDialog({
        title: '세이브 불러오기',
        text: `불러올 세이브: ${next.player.name} · DAY ${next.day.number} · 누적 ${fmtDuration(totalSeconds(next))}\n현재 진행 상황을 이 세이브로 바꿀까요? (현재 상태는 백업 슬롯에 보관됩니다)`,
        ok: '불러오기',
        danger: true,
      });
      if (!ok) return;
      setState(next);
      act((_, c) => c.events.push({ type: 'toast', kind: 'save', title: 'IMPORTED', text: '세이브를 불러왔습니다.' }));
    } catch (e) {
      act((_, c) => c.events.push({ type: 'toast', kind: 'warn', title: '불러오기 실패', text: (e as Error).message }));
    }
  };

  const restore = async (label: string, data: typeof s) => {
    const ok = await confirmDialog({ title: '복원', text: `${label} 상태로 되돌릴까요?\n(DAY ${data.day.number} · 누적 ${fmtDuration(totalSeconds(data))})\n현재 상태는 백업 슬롯으로 이동합니다.`, ok: '복원', danger: true });
    if (!ok) return;
    setState(data);
  };

  const doReset = async () => {
    const ok = await confirmDialog({
      title: '게임 초기화',
      text: '정말로 모든 진행 상황을 지우고 처음부터 시작할까요?\n레벨·골드·장비·공부 기록·탑 진행이 모두 초기화됩니다.\n(직전 세이브 1개는 백업 슬롯에 남습니다)',
      ok: '초기화',
      danger: true,
    });
    if (!ok) return;
    deleteSave();
    setState(createNewGame(s.player.name));
    setResetText('');
    go('home');
  };

  return (
    <div className="settings">
      <AccountPanel />
      <Win title="PLAYER" sub="캐릭터">
        <div className="row">
          <input className="input" maxLength={12} value={name} onChange={(e) => setName(e.target.value)} />
          <Btn
            variant="gold"
            onClick={() =>
              act((d) => {
                d.player.name = name.trim() || d.player.name;
              })
            }
          >
            이름 변경
          </Btn>
        </div>
        <div className="sep" />
        <div className="row between">
          <span>
            일일 공부 목표 <span className="tiny muted">(연속 기록 기준)</span>
          </span>
          <select className="input" style={{ width: 140 }} value={s.settings.dailyGoalMinutes} onChange={(e) => set((st) => (st.dailyGoalMinutes = Number(e.target.value)))}>
            {[30, 60, 90, 120, 180, 240, 300, 360, 480, 600].map((m) => (
              <option key={m} value={m}>
                {fmtDuration(m * 60)}
              </option>
            ))}
          </select>
        </div>
      </Win>

      <Win title="SOUND & DISPLAY" sub="소리 · 화면">
        <label className="toggle-row">
          <span>효과음</span>
          <input type="checkbox" checked={s.settings.sound} onChange={(e) => set((st) => (st.sound = e.target.checked))} />
        </label>
        <label className="toggle-row">
          <span>볼륨</span>
          <input type="range" min={0} max={1} step={0.05} value={s.settings.volume} onChange={(e) => set((st) => (st.volume = Number(e.target.value)))} onMouseUp={() => playSfx('coin')} onTouchEnd={() => playSfx('coin')} />
          <span className="num small">{Math.round(s.settings.volume * 100)}</span>
        </label>
        <label className="toggle-row">
          <span>배경 음악 (칩튠)</span>
          <input type="checkbox" checked={s.settings.music} onChange={(e) => set((st) => (st.music = e.target.checked))} />
        </label>
        <label className="toggle-row">
          <span>CRT 스캔라인</span>
          <input type="checkbox" checked={s.settings.scanlines} onChange={(e) => set((st) => (st.scanlines = e.target.checked))} />
        </label>
        <label className="toggle-row">
          <span>움직임 줄이기</span>
          <input type="checkbox" checked={s.settings.reduceMotion} onChange={(e) => set((st) => (st.reduceMotion = e.target.checked))} />
        </label>
        <Btn size="sm" variant="ghost" onClick={() => playSfx('levelUp')}>
          소리 테스트
        </Btn>
      </Win>

      <Win title="SAVE DATA" sub="저장 · 백업" color="gold">
        <p className="small muted">
          모든 진행 상황은 이 브라우저(localStorage)에 자동 저장됩니다. 마지막 저장: {getLastSavedAt() ? new Date(getLastSavedAt()).toLocaleTimeString('ko-KR') : '방금'}. 기기를 바꾸거나 브라우저 데이터를 지우기 전에 세이브 파일을 내보내 두세요.
        </p>
        <div className="row wrap">
          <Btn
            variant="gold"
            onClick={() => {
              const ok = saveNow();
              act((_, c) => c.events.push({ type: 'toast', kind: ok ? 'save' : 'warn', title: ok ? 'GAME SAVED' : '저장 실패', text: ok ? '진행 상황을 저장했습니다.' : '브라우저 저장소에 접근할 수 없습니다.' }));
              force((x) => x + 1);
            }}
          >
            지금 저장
          </Btn>
          <Btn variant="ghost" onClick={download}>
            세이브 내보내기 (.json)
          </Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
            세이브 불러오기
          </Btn>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
        </div>
        <div className="sep" />
        <div className="small">자동 백업</div>
        <div className="col" style={{ gap: 4, marginTop: 4 }}>
          {backup && (
            <div className="row small">
              <span className="grow">
                백업 슬롯 · DAY {backup.day.number} · 누적 {fmtDuration(totalSeconds(backup))} · {new Date(backup.savedAt).toLocaleString('ko-KR')}
              </span>
              <Btn size="sm" variant="ghost" onClick={() => restore('백업 슬롯', backup)}>
                복원
              </Btn>
            </div>
          )}
          {snaps.map((sn, i) => (
            <div key={i} className="row small">
              <span className="grow">
                {sn.label} · 누적 {fmtDuration(totalSeconds(sn.data))} · {new Date(sn.at).toLocaleString('ko-KR')}
              </span>
              <Btn size="sm" variant="ghost" onClick={() => restore(sn.label, sn.data)}>
                복원
              </Btn>
            </div>
          ))}
          {!backup && snaps.length === 0 && <div className="tiny dim">아직 백업이 없습니다. (10분마다, 그리고 하루가 바뀔 때 자동 생성)</div>}
        </div>
        {legacyAvailable() && (
          <>
            <div className="sep" />
            <div className="small">LIFE RPG v2 데이터</div>
            <div className="tiny muted">이 브라우저에 이전 버전 세이브가 남아 있습니다. 이전 데이터는 절대 지워지지 않아요.</div>
            <Btn
              size="sm"
              variant="ghost"
              onClick={async () => {
                const legacy = readLegacy();
                if (!legacy) return;
                const ok = await confirmDialog({ title: 'v2 데이터 다시 가져오기', text: '현재 진행 상황을 v2 데이터로 새로 변환한 세이브로 바꿀까요?\n(현재 상태는 백업 슬롯으로 이동)', ok: '가져오기', danger: true });
                if (!ok) return;
                setState(migrateLegacy(legacy));
                act((d) => fullHeal(d));
                markLegacyImported();
              }}
            >
              v2 데이터 다시 가져오기
            </Btn>
          </>
        )}
      </Win>

      <Win title="DANGER ZONE" sub="초기화" color="red">
        <p className="small">게임을 처음부터 다시 시작합니다. 확인을 위해 아래에 <b>RESET</b> 을 입력하세요.</p>
        <div className="row">
          <input className="input" value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="RESET" />
          <Btn variant="red" disabled={resetText !== 'RESET'} onClick={doReset}>
            초기화
          </Btn>
        </div>
      </Win>

      <Win title="HOW TO PLAY" sub="도움말">
        <ul className="help small">
          <li>
            <b>공부 = 성장.</b> 공부 1분 = EXP 1 · 골드 0.5. 10분마다 기력 1. 같은 과목 2시간마다 해당 능력치 +1.
          </li>
          <li>
            <b>기력</b>으로 전투한다. 숲·지하묘지 1, 투기장 2, 탑 1~3. 훈련장은 무료.
          </li>
          <li>
            <b>RPG 하루</b>는 자정이 아니라 잠들고 일어날 때 바뀐다. 상단 DAY 버튼 → 하루 마감 → 일어나기.
          </li>
          <li>
            <b>연속 달성</b>: 하루 목표를 채우고 잠들면 +1일. 하루 +2% 공부 EXP 보너스 (최대 20%).
          </li>
          <li>
            <b>탑</b>: N층 몬스터 = Lv N. 5층마다 정예, 10층마다 보스, 4·7·13층은 특별한 층. 21·41·61·81층은 해금 단계로 봉인.
          </li>
          <li>
            <b>캐릭터</b>: 공격 유형 5가지(물리·마법·화염·독·신성) × 캐릭터 5명. 상태 화면에서 출전 캐릭터를 바꾸고, 전투에서는 <b>Q·W·E·R</b> 키로 스킬 4개를 쓴다. 몬스터마다 약점/내성이 다르니 골라서 출전! 새 캐릭터는 소환의 제단 → 캐릭터 소환에서.</li>
          <li><b>펫</b>: 펫 소환으로 정령을 모으고 펫 화면에서 함께할 1마리를 고른다. 같은 정령·같은 등급 3마리 → 한 등급 위. 신화 물+바람+빛 → 천사, 신화 불+어둠+파괴 → 악마 (시크릿).</li>
          <li><b>전투 팁</b>: 몬스터마다 고유 스킬과 궁극기가 있다. 궁극기·차지 공격 예고가 뜨면 다음 턴 방어! 공부하면 HP·MP가 회복된다 (1분 = 1%).
          </li>
          <li><b>무기</b>: 15계열 109종. 계열마다 고정 효과(관통·치명·흡혈·MP 절약 등)가 있고, 속성 피해% 무기는 같은 유형 캐릭터에게만 적용된다. 가방 → 장비 도감에서 수집 현황 확인.</li>
          <li><b>방어구 세트</b>: 투구·갑옷·장갑·신발을 같은 소재(천·가죽·사슬·판금)로 2개/4개 맞추면 세트 효과. 장신구는 반지·목걸이·부적·귀걸이·팔찌·유물마다 고정 효과가 있다.</li>
          <li>아이템 우클릭 = 잠금/해제. 잠긴 아이템은 판매·합성 불가 (상점 SELL의 「모두 판매」에서도 제외).</li>
          <li>단축키: 1~0 메뉴 이동, 전투 중 Q·W·E·R 스킬 / 1 공격 · 2 아이템 · 3 방어 · 4 도망, Esc 뒤로.</li>
        </ul>
      </Win>
    </div>
  );
}
