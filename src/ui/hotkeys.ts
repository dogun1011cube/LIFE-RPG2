import { useEffect } from 'react';
import { useUi, type Panel } from '../state/uiStore';
import { lockState, releaseLock, requestLock } from '../game/input/input';
import { saveGameNow } from '../game/actions';
import { playSfx } from '../audio/sfx';

const PANEL_KEYS: Record<string, Panel> = {
  KeyI: 'inventory',
  KeyJ: 'quests',
  KeyK: 'research',
  KeyM: 'map',
  KeyC: 'crafting',
  KeyV: 'civilization',
  KeyO: 'orion',
};

function isTyping() {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

/** Global UI hotkeys (panels, build mode, escape). One listener for the app lifetime. */
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUi.getState();
      if (ui.confirmRequest) {
        if (e.code === 'Escape') ui.closeConfirm();
        return;
      }
      if (ui.phase !== 'playing') return;
      if (e.code === 'Escape') {
        // The same Esc press already released pointer lock (and opened pause / cancelled placement)
        if (performance.now() - lockState.lostAt < 250) return;
        if (isTyping()) (document.activeElement as HTMLElement).blur();
        if (ui.dialog) return ui.setDialog(null);
        if (ui.panel === 'settings' || ui.panel === 'controls') return ui.openPanel(ui.settingsReturn ?? 'pause');
        if (ui.panel === 'pause') {
          ui.openPanel(null);
          requestLock();
          return;
        }
        if (ui.panel) return ui.openPanel(null);
        if (ui.buildMode && ui.buildSelection) return ui.selectBuilding(null);
        if (ui.buildMode) return ui.setBuildMode(false);
        if (!ui.dead) ui.openPanel('pause');
        return;
      }
      if (isTyping() || e.repeat || ui.dead) return;
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        saveGameNow();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (ui.panel === 'pause' || ui.panel === 'settings' || ui.panel === 'controls') return;
      const panel = PANEL_KEYS[e.code];
      if (panel) {
        e.preventDefault();
        const opening = ui.panel !== panel;
        ui.togglePanel(panel);
        if (opening) releaseLock();
        playSfx('click');
        return;
      }
      if (e.code === 'KeyB') {
        if (ui.panel) ui.openPanel(null);
        ui.setBuildMode(!ui.buildMode);
        playSfx('click');
        if (!ui.buildMode) ui.notify({ kind: 'info', title: '건설 모드', body: '1–9 키 또는 하단 목록에서 건물을 선택하세요. Esc로 마우스를 풀면 목록을 클릭할 수 있습니다.' });
        return;
      }
      if (e.code === 'KeyH') {
        ui.updateSettings({ showControls: !ui.settings.showControls });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
