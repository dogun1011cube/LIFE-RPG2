// ─────────────────────────────────────────────────────────────
// Unique monster skills. Every monster has a signature skill (used often)
// and an ultimate (궁극기) that it unleashes when its HP drops to 50%
// (bosses: again at 25%). Most ultimates are telegraphed one turn ahead —
// defend on that turn to take 55% less damage.
// ─────────────────────────────────────────────────────────────

export type MSkillFx = 'melee' | 'magic' | 'dark' | 'breath' | 'gold' | 'death' | 'glitch' | 'doom';

export interface MSkill {
  name: string;
  desc: string;
  power?: number; // damage multiplier per hit
  hits?: number;
  magic?: boolean; // halves the effect of the player's DEF
  pierce?: number; // ignores this fraction of the player's DEF
  truePct?: number; // % of the player's max HP, ignores DEF
  drain?: number; // heals the monster by damage × drain
  heal?: number; // heals the monster by % of its max HP
  buffAtk?: number; // monster ATK +% for the rest of the battle
  buffDef?: { pct: number; turns: number };
  curse?: { pct: number; turns: number }; // player ATK −%
  armorBreak?: { pct: number; turns: number }; // player DEF −%
  poison?: { pct: number; turns: number }; // player loses % of max HP every turn
  steal?: boolean;
  charge?: boolean; // telegraphed one turn before it hits
  fx: MSkillFx;
}

export interface MonsterSkillSet {
  sig: MSkill;
  ult: MSkill;
}

const S = (sig: MSkill, ult: MSkill): MonsterSkillSet => ({ sig, ult });

export const MONSTER_SKILLS: Record<string, MonsterSkillSet> = {
  // ── Slimes ──
  slime_green: S(
    { name: '끈적 점액', desc: '끈적한 점액을 덮어씌운다. 2턴간 방어력 −20%.', power: 1.1, armorBreak: { pct: 20, turns: 2 }, fx: 'melee' },
    { name: '슬라임 대분열', desc: '몸을 세 갈래로 나눠 연속으로 덮친다. (0.8 × 3회)', power: 0.8, hits: 3, charge: true, fx: 'melee' },
  ),
  slime_blue: S(
    { name: '물대포', desc: '압축한 물을 쏘아낸다. (마법 1.35배)', power: 1.35, magic: true, fx: 'magic' },
    { name: '해일 덮치기', desc: '거대한 파도가 되어 덮친다. (마법 2.3배)', power: 2.3, magic: true, charge: true, fx: 'magic' },
  ),
  slime_red: S(
    { name: '작열 점액', desc: '뜨거운 점액을 튀긴다. 3턴간 화상(매 턴 최대 HP의 4%).', power: 1.0, poison: { pct: 4, turns: 3 }, fx: 'magic' },
    { name: '마그마 폭발', desc: '몸속 마그마를 폭발시킨다. (마법 2.5배)', power: 2.5, magic: true, charge: true, fx: 'breath' },
  ),
  slime_purple: S(
    { name: '맹독 방울', desc: '맹독을 뿌린다. 3턴간 중독(매 턴 최대 HP의 6%).', power: 0.6, poison: { pct: 6, turns: 3 }, fx: 'magic' },
    { name: '독안개', desc: '짙은 독안개를 퍼뜨린다. 4턴간 맹독(10%) + 마법 1.2배.', power: 1.2, magic: true, poison: { pct: 10, turns: 4 }, charge: true, fx: 'magic' },
  ),
  slime_king: S(
    { name: '왕의 짓누르기', desc: '거대한 몸으로 내리누른다. (1.6배)', power: 1.6, fx: 'melee' },
    { name: '슬라임 왕국', desc: '신하 슬라임들을 흡수해 HP 30% 회복, 공격력 +30%.', heal: 30, buffAtk: 30, fx: 'magic' },
  ),
  slime_king_gold: S(
    { name: '황금 몸통박치기', desc: '금화로 된 몸으로 들이받고 골드를 훔친다.', power: 1.4, steal: true, fx: 'gold' },
    { name: '황금 해일', desc: '금화가 해일처럼 쏟아진다. (1.0 × 3회)', power: 1.0, hits: 3, charge: true, fx: 'gold' },
  ),
  // ── Goblins ──
  goblin: S(
    { name: '급소 찌르기', desc: '방어의 틈을 노린다. (1.3배, 방어 40% 무시)', power: 1.3, pierce: 0.4, fx: 'melee' },
    { name: '도적의 연격', desc: '눈에 보이지 않는 연속 공격 후 골드를 훔친다. (0.6 × 4회)', power: 0.6, hits: 4, steal: true, charge: true, fx: 'melee' },
  ),
  goblin_archer: S(
    { name: '독화살', desc: '독을 바른 화살. 3턴간 중독(5%).', power: 0.9, poison: { pct: 5, turns: 3 }, fx: 'melee' },
    { name: '화살비', desc: '하늘에서 화살이 쏟아진다. (0.55 × 5회)', power: 0.55, hits: 5, charge: true, fx: 'melee' },
  ),
  hobgoblin: S(
    { name: '몽둥이 내려찍기', desc: '온 힘을 다해 내려찍는다. (1.7배)', power: 1.7, fx: 'melee' },
    { name: '광폭화', desc: '이성을 잃고 날뛴다. 공격력 +40% 후 1.3배 공격.', buffAtk: 40, power: 1.3, fx: 'melee' },
  ),
  goblin_king: S(
    { name: '왕의 호령', desc: '부하들을 독려한다. 공격력 +20% 후 1.0배 공격.', buffAtk: 20, power: 1.0, fx: 'melee' },
    { name: '고블린 군단 돌격', desc: '고블린 군단이 한꺼번에 몰려온다. (0.5 × 6회)', power: 0.5, hits: 6, charge: true, fx: 'melee' },
  ),
  // ── Skeletons ──
  skeleton: S(
    { name: '뼈창 투척', desc: '날카로운 뼈를 던진다. (1.35배, 방어 30% 무시)', power: 1.35, pierce: 0.3, fx: 'melee' },
    { name: '해골 폭발', desc: '자기 뼈를 폭발시킨다. (2.3배)', power: 2.3, charge: true, fx: 'dark' },
  ),
  skeleton_warrior: S(
    { name: '방패 강타', desc: '방패로 후려친다. 2턴간 공격력 −20%.', power: 1.2, curse: { pct: 20, turns: 2 }, fx: 'melee' },
    { name: '죽음의 회전베기', desc: '녹슨 검을 휘두르며 회전한다. (0.9 × 3회)', power: 0.9, hits: 3, charge: true, fx: 'melee' },
  ),
  skeleton_mage: S(
    { name: '영혼 화살', desc: '영혼을 꿰뚫는 화살. (마법 1.4배, 방어 30% 무시)', power: 1.4, magic: true, pierce: 0.3, fx: 'magic' },
    { name: '저주받은 운석', desc: '저주받은 운석을 떨어뜨린다. (마법 2.6배)', power: 2.6, magic: true, charge: true, fx: 'breath' },
  ),
  lich: S(
    { name: '생명 흡수', desc: '생명력을 빨아들인다. (마법 1.2배, 피해의 60% 회복)', power: 1.2, magic: true, drain: 0.6, fx: 'magic' },
    { name: '죽음의 왕관', desc: '최대 HP의 35% 고정 피해 + 자신 HP 15% 회복.', truePct: 35, heal: 15, charge: true, fx: 'death' },
  ),
  // ── Dark knights ──
  dark_knight: S(
    { name: '암흑 찌르기', desc: '갑옷 틈을 찌른다. (1.4배, 방어 50% 무시)', power: 1.4, pierce: 0.5, fx: 'dark' },
    { name: '칠흑의 참격', desc: '어둠을 두른 일격. (2.8배)', power: 2.8, charge: true, fx: 'dark' },
  ),
  black_paladin: S(
    { name: '타락한 심판', desc: '타락한 빛으로 심판한다. 마법 1.3배 + 2턴간 방어력 −25%.', power: 1.3, magic: true, armorBreak: { pct: 25, turns: 2 }, fx: 'magic' },
    { name: '흑염 성역', desc: '검은 성역을 펼쳐 HP 25% 회복, 3턴간 방어력 +50%.', heal: 25, buffDef: { pct: 50, turns: 3 }, fx: 'dark' },
  ),
  dk_commander: S(
    { name: '지휘관의 일격', desc: '기사단장의 정확한 일격. (1.6배, 방어 30% 무시)', power: 1.6, pierce: 0.3, fx: 'dark' },
    { name: '암흑기사단 총공격', desc: '기사단 전원이 돌격한다. (0.9 × 4회)', power: 0.9, hits: 4, charge: true, fx: 'dark' },
  ),
  // ── Magical creatures ──
  wisp: S(
    { name: '도깨비 장난', desc: '혼란스러운 불빛. 마법 1.2배 + 2턴간 공격력 −15%.', power: 1.2, magic: true, curse: { pct: 15, turns: 2 }, fx: 'magic' },
    { name: '청염 폭발', desc: '푸른 불꽃이 폭발한다. (마법 2.2배)', power: 2.2, magic: true, charge: true, fx: 'magic' },
  ),
  imp: S(
    { name: '꼬리 찌르기', desc: '독침 꼬리로 찌른다. 3턴간 중독(5%).', power: 0.8, poison: { pct: 5, turns: 3 }, fx: 'melee' },
    { name: '지옥불', desc: '지옥의 불길을 불러온다. (마법 2.3배)', power: 2.3, magic: true, charge: true, fx: 'breath' },
  ),
  gargoyle: S(
    { name: '석화의 시선', desc: '몸이 굳는다. 3턴간 방어력 −30%.', power: 0.7, armorBreak: { pct: 30, turns: 3 }, fx: 'magic' },
    { name: '낙석 강하', desc: '하늘 높이 날아올라 바위처럼 떨어진다. (2.5배)', power: 2.5, charge: true, fx: 'melee' },
  ),
  wraith: S(
    { name: '원한의 손길', desc: '차가운 손이 생명을 빼앗는다. (마법 1.0배, 피해의 50% 회복)', power: 1.0, magic: true, drain: 0.5, fx: 'magic' },
    { name: '망령의 비명', desc: '최대 HP의 20% 고정 피해 + 3턴간 공격력 −25%.', truePct: 20, curse: { pct: 25, turns: 3 }, charge: true, fx: 'death' },
  ),
  golem: S(
    { name: '대지 강타', desc: '거대한 주먹으로 내려친다. (1.5배)', power: 1.5, fx: 'melee' },
    { name: '산사태', desc: '산 하나가 무너져 내린다. (2.7배, 방어 30% 무시)', power: 2.7, pierce: 0.3, charge: true, fx: 'melee' },
  ),
  // ── Bosses ──
  reaper: S(
    { name: '영혼 수확', desc: '영혼을 거둬들인다. (마법 1.3배, 피해의 50% 회복)', power: 1.3, magic: true, drain: 0.5, fx: 'death' },
    { name: '사신의 춤', desc: '낫을 휘두르며 춤춘다. (0.8 × 4회)', power: 0.8, hits: 4, charge: true, fx: 'dark' },
  ),
  guest13: S(
    { name: '13번째 카드', desc: '불길한 카드를 뒤집는다. 최대 HP의 13% 고정 피해.', truePct: 13, fx: 'glitch' },
    { name: '최후의 만찬', desc: '마법 2.0배 + 자신 HP 20% 회복.', power: 2.0, magic: true, heal: 20, charge: true, fx: 'doom' },
  ),
  chimera: S(
    { name: '삼두 물어뜯기', desc: '사자·염소·뱀이 동시에 문다. (0.6 × 3회) + 중독(4%).', power: 0.6, hits: 3, poison: { pct: 4, turns: 3 }, fx: 'melee' },
    { name: '합성 브레스', desc: '세 가지 숨결을 섞어 내뿜는다. 마법 2.6배 + 맹독(6%).', power: 2.6, magic: true, poison: { pct: 6, turns: 3 }, charge: true, fx: 'breath' },
  ),
  abyss_dragon: S(
    { name: '심연의 발톱', desc: '심연의 발톱으로 할퀸다. (1.5배, 방어 30% 무시)', power: 1.5, pierce: 0.3, fx: 'melee' },
    { name: '심연의 포효', desc: '심연 그 자체를 토해낸다. (마법 3.0배)', power: 3.0, magic: true, charge: true, fx: 'breath' },
  ),
  frost_queen: S(
    { name: '서리 창', desc: '얼음 창을 꽂는다. 마법 1.4배 + 2턴간 방어력 −25%.', power: 1.4, magic: true, armorBreak: { pct: 25, turns: 2 }, fx: 'magic' },
    { name: '절대 영도', desc: '모든 것이 얼어붙는다. 마법 2.4배 + 3턴간 공격력 −30%.', power: 2.4, magic: true, curse: { pct: 30, turns: 3 }, charge: true, fx: 'magic' },
  ),
  ancient_golem: S(
    { name: '고대의 주먹', desc: '태고의 힘을 담은 주먹. (1.6배, 방어 40% 무시)', power: 1.6, pierce: 0.4, fx: 'melee' },
    { name: '태초의 진동', desc: '대지를 두 번 울린다. (1.5 × 2회) + 3턴간 방어력 +40%.', power: 1.5, hits: 2, buffDef: { pct: 40, turns: 3 }, charge: true, fx: 'melee' },
  ),
  archdemon: S(
    { name: '악마의 계약', desc: '생명을 대가로 받아간다. (마법 1.2배, 피해의 70% 회복)', power: 1.2, magic: true, drain: 0.7, fx: 'dark' },
    { name: '종말의 불꽃', desc: '세계를 태우는 불꽃. (마법 3.0배)', power: 3.0, magic: true, charge: true, fx: 'breath' },
  ),
  void_reaper: S(
    { name: '공허의 낫', desc: '공허로 베어낸다. (마법 1.5배, 방어 50% 무시)', power: 1.5, magic: true, pierce: 0.5, fx: 'death' },
    { name: '존재 소거', desc: '존재 자체를 지운다. 최대 HP의 45% 고정 피해.', truePct: 45, charge: true, fx: 'glitch' },
  ),
  tower_master: S(
    { name: '기습 쪽지시험', desc: '예고 없는 시험! 최대 HP의 10% 고정 피해 + 2턴간 공격력 −20%.', truePct: 10, curse: { pct: 20, turns: 2 }, fx: 'glitch' },
    { name: '최종 시험', desc: '모든 과목이 한꺼번에 출제된다. (마법 0.9 × 5회)', power: 0.9, hits: 5, magic: true, charge: true, fx: 'doom' },
  ),
};

export function monsterSkills(id: string): MonsterSkillSet | undefined {
  return MONSTER_SKILLS[id];
}
