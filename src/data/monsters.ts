import type { Rarity } from '../game/types';

export type MonsterFamily = 'slime' | 'goblin' | 'skeleton' | 'darkknight' | 'magic' | 'boss' | 'dummy';
export type SpriteId =
  | 'slime' | 'goblin' | 'skeleton' | 'knight' | 'ghost' | 'imp' | 'reaper'
  | 'dragon' | 'golem' | 'lich' | 'jester' | 'dummy';

export interface MonsterDef {
  id: string;
  name: string;
  nameEn: string;
  family: MonsterFamily;
  sprite: SpriteId;
  colors?: Record<string, string>;
  rarity: Rarity;
  hp: number; // multipliers vs. the level curve
  atk: number;
  def: number;
  exp?: number;
  gold?: number;
  skills: string[];
  skillRate?: number;
  boss?: boolean;
  elite?: boolean;
  scale?: number;
  crown?: boolean;
  float?: boolean;
  magic?: boolean;
  desc: string;
}

const M = (d: MonsterDef) => d;

export const MONSTERS: MonsterDef[] = [
  // ── Slimes ──
  M({ id: 'slime_green', name: '초록 슬라임', nameEn: 'Green Slime', family: 'slime', sprite: 'slime', rarity: 'common', hp: 0.8, atk: 0.8, def: 0.6, skills: ['splash', 'regen'], skillRate: 0.25, desc: '탑 입구를 지키는 말랑말랑한 슬라임. 베어도 다시 붙는다.' }),
  M({ id: 'slime_blue', name: '푸른 슬라임', nameEn: 'Blue Slime', family: 'slime', sprite: 'slime', colors: { a: '#1c7ed6', b: '#4dabf7', c: '#a5d8ff', d: '#1864ab' }, rarity: 'common', hp: 0.95, atk: 0.85, def: 0.7, skills: ['splash', 'regen'], skillRate: 0.3, desc: '물을 머금어 조금 더 단단한 슬라임.' }),
  M({ id: 'slime_red', name: '불꽃 슬라임', nameEn: 'Ember Slime', family: 'slime', sprite: 'slime', colors: { a: '#e03131', b: '#ff6b6b', c: '#ffc9c9', d: '#a51111' }, rarity: 'uncommon', hp: 0.9, atk: 1.05, def: 0.65, skills: ['ember', 'splash'], skillRate: 0.35, exp: 1.15, gold: 1.15, desc: '몸속에서 불꽃이 끓어오르는 성난 슬라임.' }),
  M({ id: 'slime_purple', name: '독 슬라임', nameEn: 'Toxic Slime', family: 'slime', sprite: 'slime', colors: { a: '#7048e8', b: '#9775fa', c: '#d0bfff', d: '#5f3dc4' }, rarity: 'uncommon', hp: 1.0, atk: 0.95, def: 0.7, skills: ['drain', 'splash'], skillRate: 0.35, exp: 1.15, gold: 1.15, desc: '닿으면 기운이 빨려 나가는 보랏빛 슬라임.' }),
  M({ id: 'slime_king', name: '슬라임 킹', nameEn: 'Slime King', family: 'slime', sprite: 'slime', crown: true, rarity: 'rare', hp: 2.0, atk: 1.0, def: 0.8, skills: ['splash', 'regen', 'heavy'], skillRate: 0.4, elite: true, scale: 1.35, exp: 2.2, gold: 2.5, desc: '푸른 수정 왕관을 쓴 슬라임들의 왕. “공부로 나를 이겨 보아랏!”' }),
  M({ id: 'slime_king_gold', name: '황금 슬라임 킹', nameEn: 'Golden Slime King', family: 'slime', sprite: 'slime', crown: true, colors: { a: '#f08c00', b: '#fcc419', c: '#fff3bf', d: '#c46b00' }, rarity: 'legendary', hp: 2.0, atk: 1.0, def: 0.9, skills: ['goldrain', 'regen', 'splash'], skillRate: 0.45, boss: true, scale: 1.5, exp: 2.5, gold: 7, desc: '7층 행운의 전당의 주인. 온몸이 금화로 이루어져 있다.' }),

  // ── Goblins ──
  M({ id: 'goblin', name: '고블린', nameEn: 'Goblin', family: 'goblin', sprite: 'goblin', rarity: 'common', hp: 0.9, atk: 1.0, def: 0.8, skills: ['ambush', 'steal'], skillRate: 0.3, desc: '반짝이는 것을 좋아하는 교활한 고블린. 골드를 훔친다.' }),
  M({ id: 'goblin_archer', name: '고블린 궁수', nameEn: 'Goblin Archer', family: 'goblin', sprite: 'goblin', colors: { s: '#5c940d', t: '#82c91e', c: '#495057' }, rarity: 'common', hp: 0.8, atk: 1.1, def: 0.7, skills: ['arrow'], skillRate: 0.4, desc: '멀리서 화살을 쏘아대는 귀찮은 고블린.' }),
  M({ id: 'hobgoblin', name: '홉고블린', nameEn: 'Hobgoblin', family: 'goblin', sprite: 'goblin', colors: { s: '#c2410c', t: '#ea580c', c: '#7c2d12' }, rarity: 'uncommon', hp: 1.25, atk: 1.1, def: 1.0, skills: ['ambush', 'heavy'], skillRate: 0.35, scale: 1.15, exp: 1.2, gold: 1.2, desc: '고블린보다 머리 하나는 큰 근육질 전사.' }),
  M({ id: 'goblin_king', name: '고블린 킹', nameEn: 'Goblin King', family: 'boss', sprite: 'goblin', crown: true, colors: { s: '#2b8a3e', t: '#40c057', c: '#862e9c' }, rarity: 'epic', hp: 2.6, atk: 1.1, def: 1.0, skills: ['ambush', 'warcry', 'heavy', 'steal'], skillRate: 0.45, boss: true, scale: 1.5, exp: 3, gold: 3, desc: '10층을 지배하는 고블린들의 왕. 훔친 보물로 왕관을 만들었다.' }),

  // ── Skeletons ──
  M({ id: 'skeleton', name: '스켈레톤', nameEn: 'Skeleton', family: 'skeleton', sprite: 'skeleton', rarity: 'common', hp: 1.0, atk: 1.0, def: 1.0, skills: ['bonethrow', 'reassemble'], skillRate: 0.3, desc: '덜그럭거리는 해골 병사. 한 번 쓰러져도 다시 조립된다.' }),
  M({ id: 'skeleton_warrior', name: '스켈레톤 전사', nameEn: 'Skeleton Warrior', family: 'skeleton', sprite: 'skeleton', colors: { w: '#e9ecef', g: '#adb5bd', r: '#c92a2a' }, rarity: 'uncommon', hp: 1.15, atk: 1.1, def: 1.15, skills: ['heavy', 'reassemble'], skillRate: 0.35, exp: 1.15, gold: 1.1, desc: '녹슨 검과 방패를 든 해골 전사.' }),
  M({ id: 'skeleton_mage', name: '스켈레톤 마법사', nameEn: 'Skeleton Mage', family: 'skeleton', sprite: 'lich', colors: { r: '#364fc7', q: '#4c6ef5', e: '#74c0fc' }, rarity: 'uncommon', hp: 0.85, atk: 1.15, def: 0.85, magic: true, skills: ['fireball', 'curse'], skillRate: 0.45, exp: 1.2, gold: 1.15, desc: '죽어서도 주문을 외우는 해골 마법사.' }),
  M({ id: 'lich', name: '리치', nameEn: 'Lich', family: 'boss', sprite: 'lich', crown: true, rarity: 'epic', hp: 2.6, atk: 1.15, def: 1.0, magic: true, skills: ['fireball', 'curse', 'drain', 'heavy'], skillRate: 0.5, boss: true, scale: 1.45, exp: 3, gold: 3, desc: '20층의 불사의 마도사. 영원한 시험 기간에 갇혀 있다.' }),

  // ── Dark knights ──
  M({ id: 'dark_knight', name: '암흑 기사', nameEn: 'Dark Knight', family: 'darkknight', sprite: 'knight', rarity: 'uncommon', hp: 1.25, atk: 1.1, def: 1.25, skills: ['darkcharge', 'ironwall'], skillRate: 0.35, exp: 1.25, gold: 1.2, desc: '어둠의 힘을 모아 일격을 노리는 기사. 힘을 모을 때 방어하라!' }),
  M({ id: 'black_paladin', name: '흑기사', nameEn: 'Black Paladin', family: 'darkknight', sprite: 'knight', colors: { k: '#212529', p: '#c92a2a', v: '#ff6b6b' }, rarity: 'rare', hp: 1.35, atk: 1.05, def: 1.4, skills: ['ironwall', 'drain', 'darkcharge'], skillRate: 0.4, exp: 1.35, gold: 1.3, desc: '타락한 성기사. 상대의 생명력을 빼앗는다.' }),
  M({ id: 'dk_commander', name: '암흑기사단장', nameEn: 'Dark Commander', family: 'boss', sprite: 'knight', crown: true, colors: { k: '#1a1033', p: '#7048e8', v: '#d0bfff' }, rarity: 'epic', hp: 2.8, atk: 1.15, def: 1.25, skills: ['darkcharge', 'ironwall', 'warcry', 'heavy'], skillRate: 0.5, boss: true, scale: 1.5, exp: 3.2, gold: 3.2, desc: '30층을 지키는 암흑기사단의 수장.' }),

  // ── Magical creatures ──
  M({ id: 'wisp', name: '도깨비불', nameEn: 'Will-o-Wisp', family: 'magic', sprite: 'ghost', colors: { a: '#1c7ed6', b: '#74c0fc', c: '#e7f5ff' }, rarity: 'common', hp: 0.75, atk: 1.15, def: 0.6, magic: true, float: true, skills: ['fireball'], skillRate: 0.35, desc: '밤의 숲을 떠도는 푸른 불꽃.' }),
  M({ id: 'imp', name: '임프', nameEn: 'Imp', family: 'magic', sprite: 'imp', rarity: 'uncommon', hp: 0.85, atk: 1.1, def: 0.75, magic: true, float: true, skills: ['fireball', 'curse'], skillRate: 0.4, exp: 1.1, gold: 1.1, desc: '장난을 좋아하는 작은 악마. 저주를 건다.' }),
  M({ id: 'gargoyle', name: '가고일', nameEn: 'Gargoyle', family: 'magic', sprite: 'imp', colors: { r: '#495057', o: '#868e96', y: '#ced4da' }, rarity: 'uncommon', hp: 1.2, atk: 1.0, def: 1.4, float: true, skills: ['ironwall', 'heavy'], skillRate: 0.35, exp: 1.2, gold: 1.15, desc: '돌로 된 날개 괴물. 매우 단단하다.' }),
  M({ id: 'wraith', name: '레이스', nameEn: 'Wraith', family: 'magic', sprite: 'ghost', colors: { a: '#5f3dc4', b: '#9775fa', c: '#e5dbff' }, rarity: 'uncommon', hp: 0.95, atk: 1.15, def: 0.7, magic: true, float: true, skills: ['drain', 'curse'], skillRate: 0.4, exp: 1.2, gold: 1.1, desc: '망자의 원한이 모인 유령.' }),
  M({ id: 'golem', name: '골렘', nameEn: 'Golem', family: 'magic', sprite: 'golem', rarity: 'rare', hp: 1.6, atk: 1.05, def: 1.5, skills: ['heavy', 'quake'], skillRate: 0.35, exp: 1.4, gold: 1.3, desc: '고대 마법으로 움직이는 돌 거인.' }),

  // ── Special & floor bosses ──
  M({ id: 'reaper', name: '사신', nameEn: 'The Reaper', family: 'boss', sprite: 'reaper', rarity: 'epic', hp: 1.6, atk: 1.0, def: 0.9, magic: true, float: true, skills: ['scythe', 'deathsentence', 'drain'], skillRate: 0.5, boss: true, scale: 1.4, exp: 3, gold: 3, desc: '4층, 죽음(死)의 층을 지키는 사신. 죽음의 선고가 끝나기 전에 쓰러뜨려라.' }),
  M({ id: 'guest13', name: '열세 번째 손님', nameEn: 'The Thirteenth Guest', family: 'boss', sprite: 'jester', rarity: 'legendary', hp: 3.0, atk: 1.1, def: 1.0, magic: true, float: true, skills: ['doom', 'curse', 'drain', 'glitch'], skillRate: 0.55, boss: true, scale: 1.55, exp: 4, gold: 4, desc: '초대받지 않은 열세 번째 손님. 13층의 봉인 그 자체.' }),
  M({ id: 'chimera', name: '키메라', nameEn: 'Chimera', family: 'boss', sprite: 'dragon', colors: { a: '#5c940d', b: '#94d82d', c: '#e9c46a', e: '#f08c00' }, rarity: 'epic', hp: 2.8, atk: 1.2, def: 1.1, skills: ['breath', 'heavy', 'warcry'], skillRate: 0.5, boss: true, scale: 1.5, exp: 3.2, gold: 3.2, desc: '40층의 합성 마수. 사자의 힘과 뱀의 독을 지녔다.' }),
  M({ id: 'abyss_dragon', name: '심연의 용', nameEn: 'Abyssal Dragon', family: 'boss', sprite: 'dragon', crown: true, rarity: 'legendary', hp: 3.2, atk: 1.2, def: 1.2, skills: ['breath', 'heavy', 'warcry'], skillRate: 0.5, boss: true, scale: 1.6, exp: 3.5, gold: 3.5, desc: '50층에 잠든 심연의 용. 탑의 중심을 지킨다.' }),
  M({ id: 'frost_queen', name: '서리 여왕', nameEn: 'Frost Queen', family: 'boss', sprite: 'lich', crown: true, colors: { r: '#1971c2', q: '#74c0fc', e: '#e7f5ff', w: '#e7f5ff' }, rarity: 'legendary', hp: 3.0, atk: 1.2, def: 1.1, magic: true, skills: ['fireball', 'curse', 'drain', 'quake'], skillRate: 0.55, boss: true, scale: 1.5, exp: 3.5, gold: 3.5, desc: '60층을 얼려버린 여왕. 그녀의 시간은 멈춰 있다.' }),
  M({ id: 'ancient_golem', name: '고대 골렘', nameEn: 'Ancient Golem', family: 'boss', sprite: 'golem', crown: true, colors: { a: '#5c3d2e', b: '#8d6e63', c: '#d7ccc8', e: '#22b8cf' }, rarity: 'legendary', hp: 3.6, atk: 1.15, def: 1.5, skills: ['heavy', 'ironwall', 'quake'], skillRate: 0.5, boss: true, scale: 1.6, exp: 3.6, gold: 3.6, desc: '70층의 수호자. 탑과 함께 태어났다.' }),
  M({ id: 'archdemon', name: '대악마', nameEn: 'Archdemon', family: 'boss', sprite: 'imp', crown: true, colors: { r: '#a51111', o: '#e03131', y: '#ffd43b' }, rarity: 'legendary', hp: 3.3, atk: 1.25, def: 1.2, magic: true, float: true, skills: ['fireball', 'curse', 'drain', 'darkcharge'], skillRate: 0.55, boss: true, scale: 1.7, exp: 3.8, gold: 3.8, desc: '80층 심연에서 올라온 대악마.' }),
  M({ id: 'void_reaper', name: '공허의 사신', nameEn: 'Void Reaper', family: 'boss', sprite: 'reaper', colors: { a: '#0b0b1a', b: '#3b1f75', e: '#ff4d6d', s: '#ced4da' }, rarity: 'legendary', hp: 3.4, atk: 1.25, def: 1.2, magic: true, float: true, skills: ['scythe', 'deathsentence', 'drain', 'curse'], skillRate: 0.55, boss: true, scale: 1.6, exp: 4, gold: 4, desc: '90층. 사신의 상위 존재. 공허 그 자체.' }),
  M({ id: 'tower_master', name: '최종 시험관', nameEn: 'The Final Examiner', family: 'boss', sprite: 'jester', crown: true, colors: { a: '#f8f9fa', b: '#ffd43b', e: '#4dabf7', k: '#212529' }, rarity: 'mythic', hp: 3.4, atk: 1.18, def: 1.2, magic: true, float: true, skills: ['doom', 'darkcharge', 'curse', 'warcry'], skillRate: 0.6, boss: true, scale: 1.7, exp: 5, gold: 5, desc: '탑의 정상, 100층에서 기다리는 최종 시험관. 모든 공부의 끝.' }),

  // ── Training ──
  M({ id: 'dummy', name: '훈련용 허수아비', nameEn: 'Training Dummy', family: 'dummy', sprite: 'dummy', rarity: 'common', hp: 1, atk: 0, def: 0.5, skills: [], desc: '아무리 때려도 화내지 않는 허수아비. 스킬을 연습해 보자.' }),
];

export const MONSTER_MAP: Record<string, MonsterDef> = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));

export function getMonster(id: string): MonsterDef {
  const m = MONSTER_MAP[id];
  if (!m) throw new Error('Unknown monster ' + id);
  return m;
}

/** Monster pools used by tower floors (by floor range). */
export function towerPool(floor: number): string[] {
  if (floor <= 3) return ['slime_green', 'slime_blue'];
  if (floor <= 9) return ['slime_green', 'slime_blue', 'slime_red', 'goblin', 'goblin_archer'];
  if (floor <= 19) return ['goblin', 'goblin_archer', 'hobgoblin', 'skeleton', 'slime_purple', 'wisp'];
  if (floor <= 29) return ['skeleton', 'skeleton_warrior', 'skeleton_mage', 'imp', 'wraith', 'hobgoblin'];
  if (floor <= 44) return ['skeleton_warrior', 'skeleton_mage', 'dark_knight', 'gargoyle', 'wraith', 'imp'];
  if (floor <= 64) return ['dark_knight', 'black_paladin', 'gargoyle', 'golem', 'wraith', 'skeleton_mage'];
  return ['black_paladin', 'golem', 'dark_knight', 'wraith', 'gargoyle', 'slime_purple'];
}

export const FLOOR_BOSSES: Record<number, string> = {
  4: 'reaper',
  7: 'slime_king_gold',
  10: 'goblin_king',
  13: 'guest13',
  20: 'lich',
  30: 'dk_commander',
  40: 'chimera',
  50: 'abyss_dragon',
  60: 'frost_queen',
  70: 'ancient_golem',
  80: 'archdemon',
  90: 'void_reaper',
  100: 'tower_master',
};
