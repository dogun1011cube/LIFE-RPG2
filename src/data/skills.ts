export type SkillKind = 'phys' | 'magic' | 'heal' | 'buff';

export interface SkillDef {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  level: number; // unlock level
  mp: number;
  kind: SkillKind;
  power: number; // damage multiplier per hit (phys → ATK, magic → MATK)
  hits?: number;
  critBonus?: number; // added crit %
  guaranteedCrit?: boolean;
  defPierce?: number; // 0..1 portion of monster DEF ignored
  healPct?: number; // heal % of max HP
  buff?: { atkPct?: number; defPct?: number; turns: number };
  debuff?: { defPct: number; turns: number }; // applied to monster
  fx: 'slash' | 'orb' | 'heal' | 'buff' | 'chain' | 'gravity' | 'nova' | 'insight';
}

export const SKILLS: SkillDef[] = [
  { id: 'focus_slash', name: '집중 베기', nameEn: 'Focus Slash', desc: '정신을 집중해 강하게 벤다. (공격력 ×1.7)', level: 1, mp: 6, kind: 'phys', power: 1.7, fx: 'slash' },
  { id: 'formula_burst', name: '공식 폭발', nameEn: 'Formula Burst', desc: '외운 공식을 마력으로 터뜨린다. (마공 ×2.0, 방어 50% 무시)', level: 4, mp: 10, kind: 'magic', power: 2.0, defPierce: 0.5, fx: 'orb' },
  { id: 'second_wind', name: '재충전', nameEn: 'Second Wind', desc: '심호흡으로 기운을 되찾는다. (최대 HP의 35% 회복)', level: 6, mp: 12, kind: 'heal', power: 0, healPct: 35, fx: 'heal' },
  { id: 'insight', name: '통찰', nameEn: 'Critical Insight', desc: '약점을 꿰뚫어 반드시 치명타를 낸다. (공격력 ×1.4, 확정 치명타)', level: 9, mp: 14, kind: 'phys', power: 1.4, guaranteedCrit: true, fx: 'insight' },
  { id: 'chain_reaction', name: '연쇄 반응', nameEn: 'Chain Reaction', desc: '화학 반응처럼 연속 폭발을 일으킨다. (마공 ×0.9 × 3회)', level: 13, mp: 20, kind: 'magic', power: 0.9, hits: 3, fx: 'chain' },
  { id: 'gravity_crush', name: '중력 붕괴', nameEn: 'Gravity Crush', desc: '중력으로 짓누른다. (공격력 ×2.4, 3턴간 적 방어 -30%)', level: 18, mp: 26, kind: 'phys', power: 2.4, debuff: { defPct: 30, turns: 3 }, fx: 'gravity' },
  { id: 'exam_mode', name: '시험 모드', nameEn: 'Exam Mode', desc: '극한의 집중 상태. (3턴간 공격력 +50%, 방어력 +25%)', level: 25, mp: 30, kind: 'buff', power: 0, buff: { atkPct: 50, defPct: 25, turns: 3 }, fx: 'buff' },
  { id: 'eureka', name: '유레카', nameEn: 'Eureka!', desc: '깨달음의 빛이 폭발한다. (마공 ×4.2, 방어 30% 무시)', level: 35, mp: 45, kind: 'magic', power: 4.2, defPierce: 0.3, fx: 'nova' },
];

export function unlockedSkills(level: number) {
  return SKILLS.filter((s) => s.level <= level);
}
