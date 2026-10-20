import { useEffect, useState } from 'react';
import { GameCanvas } from '../game/GameCanvas';
import { useUi } from '../state/uiStore';
import { Hud } from '../ui/hud/Hud';
import { InventoryPanel } from '../ui/inventory/InventoryPanel';
import { QuestPanel } from '../ui/quests/QuestPanel';
import { ResearchPanel } from '../ui/research/ResearchPanel';
import { CraftingPanel } from '../ui/crafting/CraftingPanel';
import { CivilizationPanel } from '../ui/civilization/CivilizationPanel';
import { MapPanel } from '../ui/map/MapPanel';
import { OrionPanel } from '../ui/assistant/OrionPanel';
import { BuildingInspector } from '../ui/building/BuildingInspector';
import { ControlsPanel, DeathScreen, MainMenu, MultiplayerPanel, PauseMenu, SettingsPanel } from '../ui/menus/Menus';
import { useHotkeys } from '../ui/hotkeys';
import { subscribeEventFeedback } from '../ui/eventFeedback';
import { ErrorBoundary } from './ErrorBoundary';
import { ConfirmDialog } from '../ui/common/ConfirmDialog';
import { installDebugHooks } from './debug';

function ActivePanel() {
  const panel = useUi((s) => s.panel);
  switch (panel) {
    case 'inventory':
      return <InventoryPanel />;
    case 'quests':
      return <QuestPanel />;
    case 'research':
      return <ResearchPanel />;
    case 'crafting':
      return <CraftingPanel />;
    case 'civilization':
      return <CivilizationPanel />;
    case 'map':
      return <MapPanel />;
    case 'orion':
      return <OrionPanel />;
    case 'building':
      return <BuildingInspector />;
    case 'pause':
      return <PauseMenu />;
    case 'settings':
      return <SettingsPanel />;
    case 'controls':
      return <ControlsPanel />;
    case 'multiplayer':
      return <MultiplayerPanel />;
    default:
      return null;
  }
}

function LoadingScreen({ done }: { done: boolean }) {
  return (
    <div className={`loading-screen ${done ? 'fade' : ''}`}>
      <div className="loading-mark" />
      <span>PROJECT GENESIS</span>
      <small>행성 지형 데이터 동기화 중…</small>
    </div>
  );
}

export default function App() {
  const phase = useUi((s) => s.phase);
  const [ready, setReady] = useState(false);
  const [hideLoader, setHideLoader] = useState(false);
  useHotkeys();
  useEffect(() => subscribeEventFeedback(), []);
  useEffect(() => installDebugHooks(), []);
  useEffect(() => {
    // Give the first frames time to compile shaders before revealing the scene
    const t1 = setTimeout(() => setReady(true), 700);
    const t2 = setTimeout(() => setHideLoader(true), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return (
    <div className="app">
      <ErrorBoundary>
        <GameCanvas />
      </ErrorBoundary>
      {phase === 'menu' ? (
        <MainMenu />
      ) : (
        <>
          <Hud />
          <ActivePanel />
          <DeathScreen />
        </>
      )}
      <ConfirmDialog />
      {!hideLoader && <LoadingScreen done={ready} />}
    </div>
  );
}
