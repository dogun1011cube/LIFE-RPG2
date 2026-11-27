import type { StatKey, SubjectDef } from '../game/types';

/**
 * Default subjects for a NEW game: 대학수학능력시험(수능) subjects.
 * Existing saves keep their own subject list (it is never replaced).
 * Each subject trains one stat: every 2 hours studied → +1 to that stat.
 */
export const DEFAULT_SUBJECTS: SubjectDef[] = [
  { name: '국어', en: 'Korean', stat: 'int', color: '#f783ac' },
  { name: '수학', en: 'Mathematics', stat: 'dex', color: '#74c0fc' },
  { name: '영어', en: 'English', stat: 'dex', color: '#63e6be' },
  { name: '한국사', en: 'Korean History', stat: 'luk', color: '#e9c46a' },
  { name: '물리학Ⅰ', en: 'Physics I', stat: 'str', color: '#ff8787' },
  { name: '화학Ⅰ', en: 'Chemistry I', stat: 'int', color: '#4dd4ac' },
  { name: '생명과학Ⅰ', en: 'Life Science I', stat: 'luk', color: '#a9e34b' },
  { name: '지구과학Ⅰ', en: 'Earth Science I', stat: 'str', color: '#ffa94d' },
  { name: '물리학Ⅱ', en: 'Physics II', stat: 'str', color: '#fa5252' },
  { name: '화학Ⅱ', en: 'Chemistry II', stat: 'int', color: '#20c997' },
  { name: '생명과학Ⅱ', en: 'Life Science II', stat: 'luk', color: '#82c91e' },
  { name: '지구과학Ⅱ', en: 'Earth Science II', stat: 'str', color: '#fd7e14' },
  { name: '사회탐구', en: 'Social Studies', stat: 'luk', color: '#b197fc' },
  { name: '제2외국어/한문', en: 'Second Language', stat: 'luk', color: '#91a7ff' },
];

export const STUDY_SECONDS_PER_TRAINING_POINT = 2 * 3600;

export const STAT_LABEL: Record<StatKey, { ko: string; en: string; desc: string }> = {
  str: { ko: '힘', en: 'STR', desc: '공격력과 최대 HP를 올린다' },
  int: { ko: '지능', en: 'INT', desc: '마법 공격력과 최대 MP를 올린다' },
  dex: { ko: '민첩', en: 'DEX', desc: '방어력과 치명타율을 올린다' },
  luk: { ko: '행운', en: 'LUK', desc: '치명타율, 골드 획득량, 전리품 확률을 올린다' },
};

const SUBJECT_COLORS = ['#63e6be', '#ffa94d', '#a9e34b', '#e599f7', '#66d9e8', '#ffc078', '#91a7ff', '#ff8787'];
export function pickCustomColor(i: number) {
  return SUBJECT_COLORS[i % SUBJECT_COLORS.length];
}

/** Strip spaces/punctuation, lower-case, normalise roman numerals & full-width digits. */
function squash(raw: string): string {
  let s = raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_\-·.()[\]{}'"`~!,/\\]+/g, '');
  s = s
    .replace(/ⅱ/g, '2')
    .replace(/ⅰ/g, '1')
    .replace(/iii$/g, '3')
    .replace(/ii$/g, '2')
    .replace(/(?<=[a-z가-힣])i$/g, '1');
  return s;
}

/** Short-prefix expansion for subjects like "생2" → "생명과학2". */
const PREFIX: Record<string, string> = { 화: '화학', 물: '물리', 생: '생명과학', 지: '지구과학' };

/**
 * Comparison key of a subject name. Two names with the same key are the same subject:
 * "화2" = "화학2" = "화학 II" = "화학Ⅱ" → "화학2", "물리학Ⅰ" = "물리1" = "물1" → "물리1".
 */
export function subjectKey(raw: string): string {
  let s = squash(raw);
  s = s.replace(/^물리학/, '물리').replace(/^생물/, '생명과학').replace(/^지학/, '지구과학');
  const m = s.match(/^([화물생지])([12])$/);
  if (m) s = PREFIX[m[1]] + m[2];
  return s;
}

/** Alias table: key of an alias → display name of the subject it means. */
const ALIASES: Record<string, string> = {};
function alias(display: string, ...names: string[]) {
  for (const n of [display, ...names]) ALIASES[subjectKey(n)] = display;
}
alias('국어', '국', 'korean', 'korean language');
alias('수학', '수', 'math', 'maths', 'mathematics');
alias('영어', '영', 'english');
alias('한국사', '국사', 'koreanhistory', 'korean history');
alias('물리학Ⅰ', 'physics1', 'physicsi', 'phys1', 'phy1');
alias('물리학Ⅱ', 'physics2', 'physicsii', 'phys2', 'phy2');
alias('화학Ⅰ', 'chemistry1', 'chemistryi', 'chem1', 'chemi');
alias('화학Ⅱ', 'chemistry2', 'chemistryii', 'chem2', 'chemii');
alias('생명과학Ⅰ', 'biology1', 'bio1', 'lifescience1');
alias('생명과학Ⅱ', 'biology2', 'bio2', 'lifescience2');
alias('지구과학Ⅰ', 'earthscience1', 'earth1');
alias('지구과학Ⅱ', 'earthscience2', 'earth2');
alias('사회탐구', '사탐', 'socialstudies', 'social studies');
alias('제2외국어/한문', '제2외국어', '제2외', '한문', 'secondlanguage');
alias('기하', '기하학', 'geometry', 'geo');
alias('과학 강의', '과학강의', '과강', 'sciencelecture', 'sciencelectures', 'science lecture');
alias('KJSO', 'kjso', '한국중등과학올림피아드', '과학올림피아드', '중등과학올림피아드');
alias('영재고 대비', '영재고', '영재학교', '영재고대비', '영재학교대비', '영재고연습', '영재학교연습', 'giftedschoolpractice', 'giftedschool', 'gifted');

/** Nice display name for keys that correspond to a 수능 subject (e.g. "생2" → "생명과학Ⅱ"). */
const DISPLAY: Record<string, string> = Object.fromEntries(DEFAULT_SUBJECTS.map((s) => [subjectKey(s.name), s.name]));

/**
 * Resolve any user input to the name of the subject it refers to.
 * Prefers a subject that already exists in `known` (so old saves that use "화학2"
 * and new saves that use "화학Ⅱ" both keep merging "화2" into their own entry).
 * Unknown names are returned trimmed (they become custom subjects).
 */
export function canonicalSubject(raw: string, known: SubjectDef[] = DEFAULT_SUBJECTS): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const k = subjectKey(trimmed);
  const findKnown = (key: string) => known.find((s) => subjectKey(s.name) === key || subjectKey(s.en) === key)?.name;
  const direct = findKnown(k);
  if (direct) return direct;
  const target = ALIASES[k];
  if (target) return findKnown(subjectKey(target)) ?? target;
  return DISPLAY[k] ?? trimmed;
}

export function sameSubject(a: string, b: string, known?: SubjectDef[]) {
  return subjectKey(canonicalSubject(a, known)) === subjectKey(canonicalSubject(b, known));
}

/** Default definition (stat/color/English name) of a 수능 subject, if the name is one. */
export function defaultSubjectDef(name: string): SubjectDef | undefined {
  const k = subjectKey(name);
  return DEFAULT_SUBJECTS.find((s) => subjectKey(s.name) === k);
}

/** Stat guess for a brand-new custom subject. */
export function guessStat(name: string): StatKey {
  const n = name.toLowerCase();
  if (/물리|지구|지학|phys|earth|체육|운동/.test(n)) return 'str';
  if (/수학|기하|영어|math|geo|english|코딩|정보|프로그래밍/.test(n)) return 'dex';
  if (/kjso|영재|올림피아드|olymp|대회|면접|생명|생물|bio|한국사|사회|외국어|한문/.test(n)) return 'luk';
  return 'int';
}
