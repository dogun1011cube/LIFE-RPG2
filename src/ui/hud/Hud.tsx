import { useEffect, useRef } from 'react';
import { AlertTriangle, BatteryCharging, Bot, Coins, FlaskConical, Heart, Shield, Swords, Zap } from 'lucide-react';
import { useGame } from '../../state/gameStore';
import { useUi } from '../../state/uiStore';
import { getPlayerStats, xpToNext } from '../../game/progression/progression';
import { RESOURCES } from '../../data/resources';
import { TECHNOLOGIES } from '../../data/technologies';
import { ITEMS } from '../../data/items';
import { QUESTS } from '../../data/quests';
import { getCapacities } from '../../game/research/modifiers';
import { activeQuest, objectiveStatus } from '../../game/quests/questSystem';
import { ResourceIcon } from '../common/ResourceIcon';
import { Bar } from '../common/Panel';
import { formatNumber } from '../../utils/math';
import { fpsState } from '../../game/FpsProbe';
import { BuildBar } from '../building/BuildBar';
import { registerTextLayer } from '../../game/fx/Effects';
import type { ResourceId } from '../../game/types';

function PlayerStatus() {
  const player = useGame((s) => s.game.player);
  const game = useGame((s) => s.game);
  const stats = getPlayerStats(game);
  const gold = useGame((s) => s.game.inventory.gold ?? 0);
  const need = xpToNext(player.level);
  const hpRatio = player.hp / stats.maxHp;
  return (
    <div className="hud-player">
      <div className="hud-level">
        <span className="hud-level-label">LV</span>
        <span className="hud-level-num">{player.level}</span>
      </div>
      <div className="hud-player-bars">
        <div className="hud-bar-row">
          <Heart size={14} className={hpRatio < 0.3 ? 'pulse-red' : ''} />
          <Bar value={player.hp} max={stats.maxHp} color={hpRatio < 0.3 ? 'var(--red)' : 'linear-gradient(90deg,#ff5f6d,#ff9a7a)'} label={`${Math.ceil(player.hp)} / ${stats.maxHp}`} />
        </div>
        <div className="hud-bar-row">
          <span className="xp-tag">XP</span>
          <Bar value={player.xp} max={need} color="var(--gold)" small label={`${player.xp} / ${need}`} />
        </div>
        <div className="hud-substats">
          <span title="골드">
            <Coins size={13} /> {formatNumber(gold)}
          </span>
          <span title="공격력">
            <Swords size={13} /> {stats.attack}
          </span>
          <span title="방어력">
            <Shield size={13} /> {stats.defense}
          </span>
          <span title="응급 치료 팩 (Q)" className="medpack">
            <ResourceIcon id="med_pack" size={13} /> {game.inventory.med_pack ?? 0} <kbd>Q</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

const STRIP: ResourceId[] = ['iron', 'copper', 'silicon', 'alloy', 'research', 'energy'];

function ResourceStrip() {
  const inv = useGame((s) => s.game.inventory);
  const game = useGame((s) => s.game);
  const report = useGame((s) => s.report);
  const caps = getCapacities(game);
  const active = game.research.active;
  const tech = active ? TECHNOLOGIES[active.techId] : null;
  const shortage = report.unpowered > 0;
  const draining = report.deficit && !shortage;
  return (
    <div className="hud-right-top">
      <div className="hud-resources">
        {STRIP.map((id) => {
          const v = inv[id] ?? 0;
          const cap = caps[id];
          const full = cap !== undefined && v >= cap;
          return (
            <div key={id} className={`hud-res ${full ? 'full' : ''}`} title={`${RESOURCES[id].name}${cap ? ` (한도 ${cap})` : ''}`}>
              <ResourceIcon id={id} size={16} />
              <span>{formatNumber(Math.floor(v))}</span>
            </div>
          );
        })}
      </div>
      <div className={`hud-power ${shortage ? 'shortage' : draining ? 'draining' : ''}`}>
        <Zap size={14} />
        <span>
          전력 {formatNumber(Math.round(report.consumption * 10) / 10)} / {formatNumber(Math.round(report.generation * 10) / 10)} kW
        </span>
        {shortage && (
          <span className="hud-warn">
            <AlertTriangle size={13} /> 전력 부족 · {report.unpowered}개 정지
          </span>
        )}
        {draining && (
          <span className="hud-warn soft">
            <BatteryCharging size={13} /> 저장 에너지 방전 중
          </span>
        )}
      </div>
      {tech && active && (
        <div className="hud-research">
          <FlaskConical size={13} />
          <span>{tech.name}</span>
          <Bar value={active.progress} max={tech.points} small color="var(--violet)" />
          {report.researchRate === 0 && <span className="hud-warn soft">연구소 정지</span>}
        </div>
      )}
    </div>
  );
}

function QuestTracker() {
  const game = useGame((s) => s.game);
  const quest = activeQuest(game);
  if (!quest) {
    const allDone = QUESTS.every((q) => game.quests[q.id]?.status === 'completed');
    return allDone ? (
      <div className="hud-quest">
        <div className="hud-quest-title">모든 임무 완료</div>
        <div className="hud-quest-hint">문명을 계속 확장하세요.</div>
      </div>
    ) : null;
  }
  return (
    <div className="hud-quest">
      <div className="hud-quest-kicker">
        진행 중인 임무 <kbd>J</kbd>
      </div>
      <div className="hud-quest-title">{quest.name}</div>
      <ul>
        {quest.objectives.map((o, i) => {
          const st = objectiveStatus(game, quest.id, i);
          return (
            <li key={i} className={st.done ? 'done' : ''}>
              <span className="check" />
              <span>{o.label}</span>
              {st.target > 1 && (
                <span className="prog">
                  {st.current}/{st.target}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="hud-quest-hint">{quest.hint}</div>
    </div>
  );
}

function Prompt() {
  const prompt = useUi((s) => s.prompt);
  const buildMode = useUi((s) => s.buildMode);
  if (!prompt || buildMode) return null;
  return (
    <div className={`hud-prompt ${prompt.disabled ? 'disabled' : ''}`}>
      <kbd>E</kbd>
      <span className="hud-prompt-action">{prompt.action}</span>
      <span className="hud-prompt-label">{prompt.label}</span>
    </div>
  );
}

function DialogBox() {
  const dialog = useUi((s) => s.dialog);
  if (!dialog) return null;
  return (
    <div className="hud-dialog">
      <div className="hud-dialog-title">
        {dialog.speaker ? <Bot size={16} /> : null}
        {dialog.speaker ?? dialog.title}
      </div>
      <p>{dialog.text}</p>
      <button className="btn btn-ghost btn-sm" onClick={() => useUi.getState().setDialog(null)}>
        닫기
      </button>
    </div>
  );
}

function Notices() {
  const notices = useUi((s) => s.notices);
  return (
    <div className="hud-notices">
      {notices.map((n) => (
        <div key={n.id} className={`notice notice-${n.kind}`}>
          <strong>{n.title}</strong>
          {n.body && <span>{n.body}</span>}
        </div>
      ))}
    </div>
  );
}

function ZoneLabel() {
  const zone = useUi((s) => s.zoneName);
  if (!zone) return null;
  return <div className="hud-zone">{zone}</div>;
}

function ControlsHint() {
  const show = useUi((s) => s.settings.showControls);
  const buildMode = useUi((s) => s.buildMode);
  if (!show) return null;
  const rows: [string, string][] = buildMode
    ? [
        ['1–9 / 휠', '건물 선택'],
        ['좌클릭', '설치'],
        ['R', '회전'],
        ['우클릭 / Esc', '선택 취소'],
        ['B', '건설 모드 종료'],
      ]
    : [
        ['WASD', '이동'],
        ['Shift', '달리기'],
        ['Space', '점프'],
        ['좌클릭', '공격'],
        ['E', '상호작용'],
        ['B', '건설'],
        ['I · J · K', '인벤토리 · 임무 · 연구'],
        ['C · V · M', '제작 · 문명 · 지도'],
        ['O', 'ORION'],
        ['H', '도움말 숨기기'],
      ];
  return (
    <div className="hud-controls">
      {rows.map(([k, v]) => (
        <div key={k}>
          <kbd>{k}</kbd>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

function LockHint() {
  const locked = useUi((s) => s.pointerLocked);
  const panel = useUi((s) => s.panel);
  const buildMode = useUi((s) => s.buildMode);
  const sel = useUi((s) => s.buildSelection);
  const dead = useUi((s) => s.dead);
  const unavailable = useUi((s) => s.lockUnavailable);
  if (locked || panel || dead) return null;
  const text =
    buildMode && sel
      ? '커서 모드: 지면을 클릭해 설치 · 우클릭으로 취소'
      : unavailable
        ? '마우스 고정을 사용할 수 없는 환경: 우클릭 드래그 또는 방향키로 시점 회전, 좌클릭으로 공격'
        : '화면을 클릭하면 시점 조작이 활성화됩니다 (방향키·우클릭 드래그로도 회전 가능)';
  return <div className="hud-lockhint">{text}</div>;
}

function Fps() {
  const show = useUi((s) => s.settings.showFps);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fpsState.el = ref.current;
    return () => {
      fpsState.el = null;
    };
  }, [show]);
  if (!show) return null;
  return <div ref={ref} className="hud-fps" />;
}

function EquipHint() {
  const weapon = useGame((s) => s.game.player.equipment.weapon);
  return weapon ? <div className="hud-weapon">{ITEMS[weapon]?.name}</div> : null;
}

export function Hud() {
  const buildMode = useUi((s) => s.buildMode);
  const textLayer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    registerTextLayer(textLayer.current);
    return () => registerTextLayer(null);
  }, []);
  return (
    <div className="hud">
      <div ref={textLayer} className="float-layer" />
      <div className="crosshair" />
      <PlayerStatus />
      <ResourceStrip />
      <QuestTracker />
      <ZoneLabel />
      <Notices />
      <Prompt />
      <DialogBox />
      <ControlsHint />
      <LockHint />
      <Fps />
      {!buildMode && <EquipHint />}
      {buildMode && <BuildBar />}
    </div>
  );
}
