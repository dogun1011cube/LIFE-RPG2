import { useSyncExternalStore } from 'react';
import type { BattleSetup } from '../game/battle';
import type { DaySummary } from '../game/types';

export type Screen = 'home' | 'study' | 'status' | 'battle' | 'tower' | 'shop' | 'gacha' | 'inventory' | 'quests' | 'settings';

export interface ConfirmReq {
  title: string;
  text: string;
  ok?: string;
  cancel?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
}

export interface UIState {
  screen: Screen;
  battle: BattleSetup | null;
  dayFlow: null | 'summary' | 'sleeping' | 'morning';
  morning: DaySummary | null;
  confirm: ConfirmReq | null;
  towerFocus: number | null;
  transition: number;
}

let ui: UIState = {
  screen: 'home',
  battle: null,
  dayFlow: null,
  morning: null,
  confirm: null,
  towerFocus: null,
  transition: 0,
};
const listeners = new Set<() => void>();

export function getUI() {
  return ui;
}

export function setUI(patch: Partial<UIState>) {
  ui = { ...ui, ...patch };
  listeners.forEach((l) => l());
}

function subscribeUI(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useUI(): UIState {
  return useSyncExternalStore(subscribeUI, getUI, getUI);
}

export function go(screen: Screen) {
  if (ui.screen === screen) return;
  setUI({ screen, transition: ui.transition + 1 });
  try {
    sessionStorage.setItem('lifeRPG3.screen', screen);
  } catch {
    /* ignore */
  }
}

export function confirmDialog(opts: Omit<ConfirmReq, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    setUI({
      confirm: {
        ...opts,
        resolve: (v) => {
          setUI({ confirm: null });
          resolve(v);
        },
      },
    });
  });
}
