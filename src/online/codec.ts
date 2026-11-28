import { compressToBase64, decompressFromBase64 } from 'lz-string';
import { normalizeState } from '../game/state';
import type { GameState } from '../game/types';

/** Compact text form of a save for cloud storage (LZ-compressed JSON, base64). */
export function encodeSave(state: GameState): string {
  return compressToBase64(JSON.stringify(state));
}

export function decodeSave(data: string): GameState {
  const json = decompressFromBase64(data);
  if (!json) throw new Error('클라우드 세이브를 읽을 수 없습니다.');
  return normalizeState(JSON.parse(json));
}

/** Small human summary stored next to the save (for conflict dialogs / debugging). */
export function saveSummary(state: GameState) {
  const studySeconds = state.study.reduce((a, r) => a + (r.seconds || 0), 0);
  return { name: state.player.name, day: state.day.number, totalExp: state.player.totalExp, studySeconds };
}
