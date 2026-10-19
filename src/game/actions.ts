import * as THREE from 'three';
import { useGame } from '../state/gameStore';
import { useUi } from '../state/uiStore';
import { playSfx } from '../audio/sfx';
import { fx } from './fx/Effects';
import { runtime, resetRuntime } from './runtime';
import { clearInput, releaseLock } from './input/input';
import { RESOURCE_NODES, SIGNS } from '../data/world';
import { NPC_LINES, NPC_NAME } from '../data/dialogue';
import { BUILDINGS, BUILD_ORDER } from '../data/buildings';
import { stackName } from './resources/inventory';
import { NODE_INFO } from './resources/nodes';
import { activeQuest } from './quests/questSystem';
import { terrainHeight } from './world/terrain';
import { isBuildingUnlocked } from './research/modifiers';
import type { Command } from './commands';
import type { Cost } from './types';
import type { Interactable } from './world/interactables';

// High-level player actions shared by the game loop and the UI. They dispatch
// commands to the game store and attach audiovisual feedback.

export function act(cmd: Command, opts: { silentFail?: boolean } = {}) {
  const r = useGame.getState().dispatch(cmd);
  if (!r.ok && !opts.silentFail) {
    useUi.getState().notify({ kind: 'error', title: r.reason ?? '실행할 수 없습니다.' });
    playSfx('error');
  }
  return r;
}

export function showGains(pos: THREE.Vector3, gains: Cost) {
  let i = 0;
  for (const [id, n] of Object.entries(gains)) {
    if (!n) continue;
    const p = pos.clone();
    p.y += 1.4 + i * 0.45;
    fx.text(p, `+${Math.round(n * 10) / 10} ${stackName(id)}`, id === 'gold' ? 'reward' : 'gain');
    i++;
  }
}

function diffInventory(before: Record<string, number>, after: Record<string, number>): Cost {
  const out: Cost = {};
  for (const [k, v] of Object.entries(after)) {
    const d = v - (before[k] ?? 0);
    if (d > 0) out[k] = d;
  }
  return out;
}

export function interact(target: Interactable) {
  const ui = useUi.getState();
  switch (target.kind) {
    case 'node': {
      const def = RESOURCE_NODES.find((n) => n.id === target.id)!;
      const before = useGame.getState().game.inventory;
      const r = act({ type: 'collectNode', nodeId: target.id });
      if (r.ok) {
        const after = useGame.getState().game.inventory;
        const pos = new THREE.Vector3(def.position[0], terrainHeight(def.position[0], def.position[1]) + 0.8, def.position[1]);
        fx.burst(pos, NODE_INFO[def.kind].emissive, 14, 4);
        showGains(pos, diffInventory(before, after));
        playSfx('collect');
        runtime.player.attackAnim = 0.32;
        runtime.player.attackSide *= -1;
      }
      break;
    }
    case 'sign': {
      const s = SIGNS.find((x) => x.id === target.id);
      if (s) ui.setDialog({ title: s.title, text: s.text });
      playSfx('click');
      break;
    }
    case 'npc': {
      const q = activeQuest(useGame.getState().game);
      ui.setDialog({ title: '대화', speaker: NPC_NAME, text: NPC_LINES[q?.id ?? 'done'] ?? NPC_LINES.done });
      playSfx('click');
      break;
    }
    case 'terminal':
      releaseLock();
      ui.openPanel('civilization');
      playSfx('click');
      break;
    case 'building':
      releaseLock();
      ui.inspectBuilding(target.id);
      playSfx('click');
      break;
  }
}

export function placeSelectedBuilding() {
  const ui = useUi.getState();
  const sel = ui.buildSelection;
  const point = runtime.buildPoint;
  if (!sel || !point) return;
  const r = act({
    type: 'placeBuilding',
    building: sel,
    x: point.x,
    z: point.z,
    rotation: ui.buildRotation,
    playerX: runtime.player.pos.x,
    playerZ: runtime.player.pos.z,
  });
  if (r.ok) {
    playSfx('build');
    fx.burst(point.clone().add(new THREE.Vector3(0, 0.5, 0)), '#5ef2ff', 26, 6, 6, 0.16);
    const def = BUILDINGS[sel];
    ui.notify({ kind: 'success', title: `${def.name} 건설 완료` });
  }
}

/** Selectable buildings in build-menu order (unlocked first) */
export function buildCycle() {
  const game = useGame.getState().game;
  return BUILD_ORDER.filter((id) => isBuildingUnlocked(game, id));
}

export function syncPlayerToStore() {
  const p = runtime.player.pos;
  useGame.getState().syncPlayerTransform([p.x, p.y, p.z], runtime.player.facing);
}

export function saveGameNow(silent = false) {
  syncPlayerToStore();
  const ok = useGame.getState().saveGame();
  const ui = useUi.getState();
  if (ok) {
    ui.setLastSaveAt(Date.now());
    if (!silent) ui.notify({ kind: 'success', title: '게임이 저장되었습니다.' });
  } else if (!silent) {
    ui.notify({ kind: 'error', title: '저장에 실패했습니다.', body: '브라우저 저장소를 사용할 수 없습니다.' });
  }
  return ok;
}

function enterWorld() {
  const g = useGame.getState().game;
  resetRuntime(g.player.position, g.player.yaw);
  fx.clear();
  clearInput();
  useUi.getState().setPhase('playing');
}

export function startNewGame() {
  useGame.getState().newGame();
  enterWorld();
  useUi.getState().notify({ kind: 'info', title: '임무 시작: 첫 접촉', body: '북쪽의 전초기지를 찾아가세요.' });
}

export function loadGameNow() {
  const r = useGame.getState().loadGame();
  if (!r.ok) {
    useUi.getState().notify({ kind: 'error', title: r.reason ?? '불러오기에 실패했습니다.' });
    return false;
  }
  enterWorld();
  useUi.getState().notify({ kind: 'success', title: '저장된 게임을 불러왔습니다.' });
  return true;
}

export function returnToMenu() {
  releaseLock();
  useUi.getState().setPhase('menu');
}

export function respawnAfterDeath() {
  useGame.getState().respawn();
  const g = useGame.getState().game;
  resetRuntime(g.player.position, runtime.camera.yaw);
  useUi.getState().setDead(null);
}

export function useMedPack() {
  const r = act({ type: 'useItem', item: 'med_pack' });
  if (r.ok) {
    playSfx('collect');
    fx.burst(runtime.player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), '#ff8a8a', 16, 3, 2);
    fx.text(runtime.player.pos.clone().add(new THREE.Vector3(0, 2, 0)), '+60 체력', 'gain');
  }
}

