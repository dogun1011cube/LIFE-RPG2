import { gameEvents } from '../game/events';
import { useUi } from '../state/uiStore';
import { playSfx } from '../audio/sfx';
import { QUESTS } from '../data/quests';
import { TECHNOLOGIES } from '../data/technologies';
import { RECIPES } from '../data/recipes';
import type { GameEvent } from '../game/types';

/** Maps gameplay events to notifications and sound. Subscribed once at startup. */
export function subscribeEventFeedback() {
  return gameEvents.subscribe((events: GameEvent[]) => {
    const ui = useUi.getState();
    for (const e of events) {
      switch (e.type) {
        case 'levelUp':
          ui.notify({ kind: 'reward', title: `레벨 업! Lv.${e.level}`, body: '체력이 모두 회복되고 능력치가 상승했습니다.' });
          playSfx('levelup');
          break;
        case 'questCompleted': {
          const q = QUESTS.find((x) => x.id === e.quest);
          ui.notify({ kind: 'reward', title: `임무 완료: ${q?.name}`, body: '보상을 획득했습니다.' });
          playSfx('quest');
          break;
        }
        case 'questStarted': {
          const q = QUESTS.find((x) => x.id === e.quest);
          ui.notify({ kind: 'info', title: `새 임무: ${q?.name}`, body: q?.summary });
          break;
        }
        case 'researched':
          ui.notify({ kind: 'success', title: `연구 완료: ${TECHNOLOGIES[e.tech]?.name}`, body: '새로운 기능이 해금되었습니다.' });
          playSfx('research');
          break;
        case 'crafted':
          ui.notify({ kind: 'success', title: `제작 완료: ${RECIPES[e.recipe]?.name}` });
          playSfx('craft');
          break;
        case 'powerShortage':
          ui.notify({ kind: 'warning', title: '전력 부족!', body: '일부 설비가 정지했습니다. 발전기를 추가하세요.' });
          break;
        case 'powerRestored':
          ui.notify({ kind: 'success', title: '전력 공급 정상화' });
          break;
      }
    }
  });
}
