import type { StatKey, SubjectDef } from '../game/types';

/**
 * Default subjects. The canonical name is the short Korean form the player
 * already used in the previous version (e.g. "화학2").
 * Each subject trains one stat: every 2 hours studied → +1 to that stat.
 */
export const DEFAULT_SUBJECTS: SubjectDef[] = [
  { name: '화학1', en: 'Chemistry I', stat: 'int', color: '#4dd4ac' },
  { name: '화학2', en: 'Chemistry II', stat: 'int', color: '#20c997' },
  { name: '물리1', en: 'Physics I', stat: 'str', color: '#ff8787' },
  { name: '물리2', en: 'Physics II', stat: 'str', color: '#fa5252' },
  { name: '수학', en: 'Mathematics', stat: 'dex', color: '#74c0fc' },
  { name: '기하', en: 'Geometry', stat: 'dex', color: '#4dabf7' },
  { name: '과학 강의', en: 'Science Lectures', stat: 'int', color: '#b197fc' },
  { name: 'KJSO', en: 'KJSO', stat: 'luk', color: '#ffd43b' },
  { name: '영재고 대비', en: 'Gifted School Practice', stat: 'luk', color: '#f783ac' },
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

/** Alias table: squashed alias → canonical name. */
const ALIASES: Record<string, string> = {};
function alias(canonical: string, ...names: string[]) {
  for (const n of [canonical, ...names]) ALIASES[squash(n)] = canonical;
}
alias('화학1', '화1', '화학i', '화학Ⅰ', 'chemistry1', 'chemistryi', 'chem1', 'chemi', 'chem 1');
alias('화학2', '화2', '화학ii', '화학Ⅱ', 'chemistry2', 'chemistryii', 'chem2', 'chemii', 'chem 2');
alias('물리1', '물1', '물리i', '물리학1', '물리학i', 'physics1', 'physicsi', 'phys1', 'phy1');
alias('물리2', '물2', '물리ii', '물리학2', '물리학ii', 'physics2', 'physicsii', 'phys2', 'phy2');
alias('수학', '수', 'math', 'maths', 'mathematics', '수학1', '수학2', '미적분', '미적');
alias('기하', '기하학', 'geometry', 'geo');
alias('과학 강의', '과학강의', '과강', '강의', 'sciencelecture', 'sciencelectures', 'science lecture');
alias('KJSO', 'kjso', '한국중등과학올림피아드', '과학올림피아드', '중등과학올림피아드');
alias('영재고 대비', '영재고', '영재학교', '영재고대비', '영재학교대비', '영재고연습', '영재학교연습', 'giftedschoolpractice', 'giftedschool', 'gifted');

/** Short-prefix expansion for subjects like "생2" → "생명과학2". */
const PREFIX: Record<string, string> = { 화: '화학', 물: '물리', 생: '생명과학', 지: '지구과학' };

/**
 * Resolve any user input to a canonical subject name.
 * "화2", "화학 II", "Chemistry II", "chem2" → "화학2".
 * Unknown names are returned trimmed (they become custom subjects).
 */
export function canonicalSubject(raw: string, known: SubjectDef[] = DEFAULT_SUBJECTS): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const sq = squash(trimmed);
  // 1) exact match against known subject names / English names
  for (const s of known) {
    if (squash(s.name) === sq || squash(s.en) === sq) return s.name;
  }
  // 2) alias table
  if (ALIASES[sq]) return ALIASES[sq];
  // 3) short prefix + number (생1, 지2 …)
  const m = sq.match(/^([화물생지])(학|리|명과학|구과학)?([12])$/);
  if (m) return PREFIX[m[1]] + m[3];
  // 4) long Korean form with roman numeral already squashed (e.g. 생명과학ii → 생명과학2)
  const m2 = sq.match(/^(생명과학|지구과학)([12])$/);
  if (m2) return m2[1] + m2[2];
  return trimmed;
}

export function sameSubject(a: string, b: string, known?: SubjectDef[]) {
  return canonicalSubject(a, known) === canonicalSubject(b, known);
}

/** Stat guess for a brand-new custom subject. */
export function guessStat(name: string): StatKey {
  const n = name.toLowerCase();
  if (/물리|phys|체육|운동/.test(n)) return 'str';
  if (/수학|기하|math|geo|코딩|정보|프로그래밍/.test(n)) return 'dex';
  if (/올림피아드|olymp|대회|면접/.test(n)) return 'luk';
  return 'int';
}
