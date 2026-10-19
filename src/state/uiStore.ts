import { create } from 'zustand';
import type { Notice } from '../game/types';

export type Panel =
  | 'inventory'
  | 'quests'
  | 'research'
  | 'map'
  | 'crafting'
  | 'civilization'
  | 'orion'
  | 'pause'
  | 'settings'
  | 'controls'
  | 'building'
  | 'multiplayer';

export type Phase = 'menu' | 'playing';

export interface Settings {
  sensitivity: number;
  invertY: boolean;
  volume: number;
  muted: boolean;
  shadows: boolean;
  showFps: boolean;
  showControls: boolean;
}

export interface Prompt {
  id: string;
  label: string;
  action: string;
  disabled?: boolean;
}

export interface Dialog {
  title: string;
  text: string;
  speaker?: string;
}

export interface Placement {
  valid: boolean;
  reason?: string;
}

interface UiStore {
  phase: Phase;
  panel: Panel | null;
  /** panel to return to when settings closes */
  settingsReturn: Panel | null;
  buildMode: boolean;
  buildSelection: string | null;
  buildRotation: number;
  placement: Placement | null;
  inspectBuildingId: string | null;
  prompt: Prompt | null;
  dialog: Dialog | null;
  notices: (Notice & { id: number; at: number })[];
  zoneName: string | null;
  dead: { goldLost: number } | null;
  pointerLocked: boolean;
  settings: Settings;
  lastSaveAt: number | null;

  setPhase: (p: Phase) => void;
  openPanel: (p: Panel | null) => void;
  togglePanel: (p: Panel) => void;
  setBuildMode: (on: boolean) => void;
  selectBuilding: (id: string | null) => void;
  rotateBuilding: (delta: number) => void;
  setPlacement: (p: Placement | null) => void;
  setPrompt: (p: Prompt | null) => void;
  setDialog: (d: Dialog | null) => void;
  notify: (n: Notice) => void;
  dismissNotice: (id: number) => void;
  setZoneName: (z: string | null) => void;
  setDead: (d: { goldLost: number } | null) => void;
  setPointerLocked: (v: boolean) => void;
  updateSettings: (s: Partial<Settings>) => void;
  inspectBuilding: (id: string | null) => void;
  setLastSaveAt: (t: number | null) => void;
}

const SETTINGS_KEY = 'project-genesis.settings';
const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1,
  invertY: false,
  volume: 0.6,
  muted: false,
  shadows: true,
  showFps: false,
  showControls: true,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const out = { ...DEFAULT_SETTINGS };
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (typeof parsed[k] === typeof DEFAULT_SETTINGS[k]) (out as Record<string, unknown>)[k] = parsed[k];
    }
    out.sensitivity = Math.min(3, Math.max(0.2, out.sensitivity));
    out.volume = Math.min(1, Math.max(0, out.volume));
    return out;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let noticeId = 1;

export const useUi = create<UiStore>((set, get) => ({
  phase: 'menu',
  panel: null,
  settingsReturn: null,
  buildMode: false,
  buildSelection: null,
  buildRotation: 0,
  placement: null,
  inspectBuildingId: null,
  prompt: null,
  dialog: null,
  notices: [],
  zoneName: null,
  dead: null,
  pointerLocked: false,
  settings: loadSettings(),
  lastSaveAt: null,

  setPhase: (phase) => set({ phase, panel: null, buildMode: false, buildSelection: null, dialog: null, dead: null }),
  openPanel: (panel) => {
    const cur = get().panel;
    set({ panel, settingsReturn: panel === 'settings' ? cur : get().settingsReturn, dialog: panel ? null : get().dialog });
  },
  togglePanel: (p) => {
    const cur = get().panel;
    set({ panel: cur === p ? null : p, dialog: null });
  },
  setBuildMode: (on) => set({ buildMode: on, buildSelection: on ? get().buildSelection : null, placement: null }),
  selectBuilding: (id) => set({ buildSelection: id, placement: null }),
  rotateBuilding: (delta) => set({ buildRotation: (get().buildRotation + delta) % (Math.PI * 2) }),
  setPlacement: (placement) => {
    const cur = get().placement;
    if (cur?.valid === placement?.valid && cur?.reason === placement?.reason) return;
    set({ placement });
  },
  setPrompt: (prompt) => {
    const cur = get().prompt;
    if (cur?.id === prompt?.id && cur?.label === prompt?.label && cur?.disabled === prompt?.disabled && cur?.action === prompt?.action) return;
    set({ prompt });
  },
  setDialog: (dialog) => set({ dialog }),
  notify: (n) => {
    const id = noticeId++;
    const notices = [...get().notices, { ...n, id, at: performance.now() }].slice(-5);
    set({ notices });
    setTimeout(() => get().dismissNotice(id), n.kind === 'error' ? 2600 : 4200);
  },
  dismissNotice: (id) => set({ notices: get().notices.filter((n) => n.id !== id) }),
  setZoneName: (zoneName) => {
    if (get().zoneName !== zoneName) set({ zoneName });
  },
  setDead: (dead) => set({ dead }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  updateSettings: (s) => {
    const settings = { ...get().settings, ...s };
    set({ settings });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable: settings stay for this session */
    }
  },
  inspectBuilding: (id) => set({ inspectBuildingId: id, panel: id ? 'building' : null }),
  setLastSaveAt: (lastSaveAt) => set({ lastSaveAt }),
}));
