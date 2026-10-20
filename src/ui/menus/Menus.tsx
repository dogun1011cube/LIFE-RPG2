import { useState } from 'react';
import { Gamepad2, Keyboard, Network, Pause, Settings as SettingsIcon, Skull } from 'lucide-react';
import { useUi } from '../../state/uiStore';
import { useGame } from '../../state/gameStore';
import { Panel } from '../common/Panel';
import { loadGameNow, respawnAfterDeath, returnToMenu, saveGameNow, startNewGame } from '../../game/actions';
import { saveInfo } from '../../game/save/saveSystem';
import { requestLock } from '../../game/input/input';
import { playSfx } from '../../audio/sfx';

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR');
  } catch {
    return iso;
  }
}

export function MainMenu() {
  const [info, setInfo] = useState(() => saveInfo());
  const panel = useUi((s) => s.panel);
  return (
    <div className="main-menu">
      <div className="main-menu-inner">
        <div className="brand">
          <span className="brand-kicker">CIVILIZATION · ACTION RPG</span>
          <h1>
            PROJECT <span>GENESIS</span>
          </h1>
          <p>작은 연구 전초기지에서 시작해, 탐사와 전투, 과학과 공학으로 별을 향한 문명을 건설하세요.</p>
        </div>
        <nav className="menu-buttons">
          <button
            className="menu-btn primary"
            onClick={() => {
              playSfx('click');
              if (!info) return startNewGame();
              useUi.getState().askConfirm({
                title: '새 게임을 시작할까요?',
                body: '저장된 게임은 그대로 남지만, 새 게임에서 저장하면 덮어쓰게 됩니다.',
                confirmLabel: '새 게임 시작',
                onConfirm: startNewGame,
              });
            }}
          >
            새 게임
          </button>
          <button
            className="menu-btn"
            disabled={!info}
            onClick={() => {
              playSfx('click');
              loadGameNow();
            }}
          >
            이어하기
            {info && <small>Lv.{info.level} · {formatSavedAt(info.savedAt)}</small>}
          </button>
          <button className="menu-btn" onClick={() => useUi.getState().openPanel('settings')}>
            설정
          </button>
          <button className="menu-btn" onClick={() => useUi.getState().openPanel('controls')}>
            조작법
          </button>
          <button className="menu-btn" onClick={() => useUi.getState().openPanel('multiplayer')}>
            멀티플레이 <small>개발 예정</small>
          </button>
          <FullscreenButton />
        </nav>
        <p className="menu-desktop-note">키보드와 마우스가 있는 데스크톱 브라우저에서 플레이하세요. 터치 조작은 지원하지 않습니다.</p>
        <p className="menu-foot">싱글플레이 버티컬 슬라이스 v0.1 · 저장 데이터는 이 브라우저에만 보관됩니다.</p>
      </div>
      {panel === 'settings' && <SettingsPanel onReset={() => setInfo(saveInfo())} />}
      {panel === 'controls' && <ControlsPanel />}
      {panel === 'multiplayer' && <MultiplayerPanel />}
    </div>
  );
}

/** Optional fullscreen toggle; silently unavailable where the browser/frame refuses it. */
function FullscreenButton() {
  const [full, setFull] = useState(() => !!document.fullscreenElement);
  if (!document.fullscreenEnabled) return null;
  return (
    <button
      className="menu-btn"
      onClick={() => {
        const req = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        req
          .then(() => setFull(!!document.fullscreenElement))
          .catch(() => useUi.getState().notify({ kind: 'warning', title: '이 환경에서는 전체 화면을 사용할 수 없습니다.' }));
      }}
    >
      {full ? '전체 화면 종료' : '전체 화면'}
    </button>
  );
}

export function PauseMenu() {
  const resume = () => {
    useUi.getState().openPanel(null);
    requestLock();
  };
  return (
    <Panel title="일시 정지" subtitle="전투와 문명 시뮬레이션이 멈춰 있습니다" icon={<Pause size={18} />} onClose={resume}>
      <div className="pause-buttons">
        <button className="menu-btn primary" onClick={resume}>
          계속하기
        </button>
        <button className="menu-btn" onClick={() => saveGameNow()}>
          게임 저장
        </button>
        <button
          className="menu-btn"
          onClick={() => {
            if (!saveInfo()) {
              useUi.getState().notify({ kind: 'error', title: '저장된 게임이 없습니다.' });
              return;
            }
            useUi.getState().askConfirm({
              title: '마지막 저장 상태로 되돌릴까요?',
              body: '저장하지 않은 진행은 사라집니다.',
              confirmLabel: '불러오기',
              onConfirm: () => loadGameNow(),
            });
          }}
        >
          불러오기
        </button>
        <button className="menu-btn" onClick={() => useUi.getState().openPanel('settings')}>
          설정
        </button>
        <button className="menu-btn" onClick={() => useUi.getState().openPanel('controls')}>
          조작법
        </button>
        <FullscreenButton />
        <button
          className="menu-btn"
          onClick={() => {
            useUi.getState().askConfirm({
              title: '메인 메뉴로 나갈까요?',
              body: '저장하지 않은 진행은 사라집니다.',
              confirmLabel: '메인 메뉴로',
              onConfirm: returnToMenu,
            });
          }}
        >
          메인 메뉴
        </button>
      </div>
    </Panel>
  );
}

export function SettingsPanel({ onReset }: { onReset?: () => void }) {
  const settings = useUi((s) => s.settings);
  const update = useUi((s) => s.updateSettings);
  const back = () => {
    const ui = useUi.getState();
    ui.openPanel(ui.phase === 'playing' ? ui.settingsReturn ?? 'pause' : null);
  };
  return (
    <Panel title="설정" icon={<SettingsIcon size={18} />} onClose={back}>
      <div className="settings">
        <label className="setting-row">
          <span>마우스 감도</span>
          <input type="range" min={0.2} max={3} step={0.1} value={settings.sensitivity} onChange={(e) => update({ sensitivity: Number(e.target.value) })} />
          <em>{settings.sensitivity.toFixed(1)}</em>
        </label>
        <label className="setting-row">
          <span>상하 반전</span>
          <input type="checkbox" checked={settings.invertY} onChange={(e) => update({ invertY: e.target.checked })} />
        </label>
        <label className="setting-row">
          <span>효과음 볼륨</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => update({ volume: Number(e.target.value) })} />
          <em>{Math.round(settings.volume * 100)}%</em>
        </label>
        <label className="setting-row">
          <span>음소거</span>
          <input type="checkbox" checked={settings.muted} onChange={(e) => update({ muted: e.target.checked })} />
        </label>
        <label className="setting-row">
          <span>그림자</span>
          <input type="checkbox" checked={settings.shadows} onChange={(e) => update({ shadows: e.target.checked })} />
        </label>
        <label className="setting-row">
          <span>FPS 표시</span>
          <input type="checkbox" checked={settings.showFps} onChange={(e) => update({ showFps: e.target.checked })} />
        </label>
        <label className="setting-row">
          <span>조작 안내 표시</span>
          <input type="checkbox" checked={settings.showControls} onChange={(e) => update({ showControls: e.target.checked })} />
        </label>
        <div className="setting-danger">
          <div>
            <strong>저장 데이터 초기화</strong>
            <span className="muted small">브라우저에 저장된 게임을 영구 삭제합니다.</span>
          </div>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (!saveInfo()) {
                useUi.getState().notify({ kind: 'info', title: '삭제할 저장 데이터가 없습니다.' });
                return;
              }
              useUi.getState().askConfirm({
                title: '저장 데이터를 삭제할까요?',
                body: '브라우저에 저장된 게임이 영구 삭제되며 되돌릴 수 없습니다.',
                confirmLabel: '영구 삭제',
                danger: true,
                onConfirm: () => {
                  useGame.getState().resetSave();
                  useUi.getState().notify({ kind: 'success', title: '저장 데이터가 삭제되었습니다.' });
                  onReset?.();
                },
              });
            }}
          >
            초기화
          </button>
        </div>
        <button className="btn" onClick={back}>
          돌아가기
        </button>
      </div>
    </Panel>
  );
}

export function ControlsPanel() {
  const back = () => {
    const ui = useUi.getState();
    ui.openPanel(ui.phase === 'playing' ? 'pause' : null);
  };
  const rows: [string, string][] = [
    ['W A S D', '이동'],
    ['마우스', '시점 회전 (화면 클릭으로 마우스 고정)'],
    ['방향키 / 우클릭 드래그', '시점 회전 (마우스 고정 없이)'],
    ['Space', '점프'],
    ['Shift', '달리기'],
    ['좌클릭', '기본 공격 (쿨다운 0.5초)'],
    ['E', '상호작용 — 채집, 대화, 건물 관리'],
    ['Q', '응급 치료 팩 사용'],
    ['B', '건설 모드 전환'],
    ['1–9 / 마우스 휠', '건설할 건물 선택 (건설 모드)'],
    ['R / Shift+R', '건물 회전'],
    ['우클릭', '건물 선택 취소'],
    ['I', '인벤토리 · 장비 · 훈련'],
    ['J', '임무 일지'],
    ['K', '기술 연구'],
    ['C', '제작'],
    ['V', '문명 현황'],
    ['M', '월드 지도'],
    ['O', 'ORION 어시스턴트'],
    ['H', '조작 안내 표시 전환'],
    ['Ctrl + S', '빠른 저장'],
    ['Esc', '메뉴 닫기 / 일시 정지'],
  ];
  return (
    <Panel title="조작법" icon={<Keyboard size={18} />} onClose={back}>
      <table className="controls-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>
                <kbd>{k}</kbd>
              </td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        브라우저 보안 정책상 Esc는 마우스 고정을 먼저 해제합니다. 이때 일시 정지 메뉴가 열리며, 다시 화면을 클릭하면 조작이 재개됩니다. 메뉴가 열려 있는 동안 전투는 멈추고 문명 시뮬레이션은 계속 진행됩니다(일시 정지 메뉴 제외).
      </p>
    </Panel>
  );
}

export function MultiplayerPanel() {
  return (
    <Panel title="멀티플레이 (개발 예정)" icon={<Network size={18} />}>
      <div className="mp-panel">
        <p className="warn-text">이 빌드에는 네트워크 멀티플레이가 구현되어 있지 않습니다. 접속, 매칭, 온라인 인원 표시 기능은 없습니다.</p>
        <p className="desc">게임 구조는 멀티플레이 확장을 고려해 설계되었습니다:</p>
        <ul className="effect-list">
          <li>모든 플레이어 행동은 직렬화 가능한 명령(Command)으로 처리 — 서버가 동일한 규칙으로 검증 가능</li>
          <li>건물마다 고유 ID와 소유자(ownerId) 기록 — 건설 권한 시스템의 기반</li>
          <li>시뮬레이션 로직은 렌더링/UI와 분리된 순수 함수 — 권한 서버에서 그대로 실행 가능</li>
          <li>NetworkAdapter 인터페이스 — 현재는 LocalAdapter(싱글플레이)만 존재</li>
        </ul>
        <p className="desc">계획된 기능: 협동 건설, 공유 자원 관리, 건물 권한, 거래, 협동 보스전, 선택형 PvP 아레나, 지속 공유 월드.</p>
        <p className="muted small">상세 설계: docs/MULTIPLAYER.md</p>
      </div>
    </Panel>
  );
}

export function DeathScreen() {
  const dead = useUi((s) => s.dead);
  if (!dead) return null;
  return (
    <div className="death-screen">
      <Skull size={42} />
      <h2>의식을 잃었습니다</h2>
      <p>ORION 드론이 탐사관을 전초기지로 후송합니다. 골드 {dead.goldLost}을(를) 잃었습니다.</p>
      <button
        className="menu-btn primary"
        onClick={() => {
          respawnAfterDeath();
          requestLock();
        }}
      >
        <Gamepad2 size={16} /> 전초기지에서 재시작
      </button>
    </div>
  );
}
