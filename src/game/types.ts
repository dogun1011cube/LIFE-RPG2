// ─────────────────────────────────────────────────────────────
// LIFE RPG — core type definitions
// ─────────────────────────────────────────────────────────────

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export type StatKey = 'str' | 'int' | 'dex' | 'luk';
export const STAT_KEYS: StatKey[] = ['str', 'int', 'dex', 'luk'];

export type RankId = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export type EquipSlot = 'weapon' | 'helmet' | 'armor' | 'gloves' | 'boots' | 'accessory';
export type EquipPosition = 'weapon' | 'helmet' | 'armor' | 'gloves' | 'boots' | 'acc1' | 'acc2';
export const EQUIP_POSITIONS: EquipPosition[] = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'acc1', 'acc2'];

export type ItemCategory = 'equipment' | 'consumable' | 'special' | 'cosmetic';
export type ShopTab = 'weapons' | 'armor' | 'accessories' | 'consumables' | 'special';

export type IconId =
  | 'sword' | 'staff' | 'book' | 'hammer' | 'scythe' | 'pen'
  | 'helmet' | 'armor' | 'robe' | 'gloves' | 'boots'
  | 'ring' | 'amulet' | 'charm' | 'hourglass' | 'seal'
  | 'potion' | 'ether' | 'elixir' | 'scroll' | 'bomb' | 'flask'
  | 'chest' | 'ticket' | 'cape' | 'crown' | 'aura' | 'gem' | 'coin' | 'drink';

/** Flat bonus block used by equipment and derived stats. */
export interface StatBlock {
  hp?: number;
  mp?: number;
  atk?: number;
  def?: number;
  matk?: number;
  crit?: number; // %
  str?: number;
  int?: number;
  dex?: number;
  luk?: number;
  expBonus?: number; // % applied to study EXP
  goldBonus?: number; // % applied to all gold gains
}

export type ConsumableEffect =
  | { type: 'heal'; hp?: number; mp?: number; full?: boolean }
  | { type: 'stamina'; amount: number }
  | { type: 'studyBuff'; expPct?: number; goldPct?: number }
  | { type: 'chest'; tier: 'bronze' | 'silver' | 'gold' }
  | { type: 'battleBuff'; atkPct?: number; defPct?: number; turns: number }
  | { type: 'escape' }
  | { type: 'exp'; amount: number }
  | { type: 'realReward'; minutes: number; label: string };

export interface ItemDef {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  category: ItemCategory;
  slot?: EquipSlot;
  rarity: Rarity;
  /** Shop price (also the base value for selling / upgrading). */
  price: number;
  stats?: StatBlock;
  icon: IconId;
  /** Main color of the icon (defaults to rarity color). */
  tint?: string;
  /** Item appears in the shop (subject to rank). */
  shop?: ShopTab;
  minRank?: RankId;
  /** Recommended level — used for loot tables. */
  level?: number;
  use?: ConsumableEffect;
  /** Can be used inside battle. */
  battle?: boolean;
  cosmetic?: { kind: 'title' | 'cape' | 'aura'; value: string };
  /** Can appear from the gacha. */
  gacha?: boolean;
  /** Can drop from monsters / chests. */
  loot?: boolean;
  /** Unique reward (cannot be bought, never from gacha). */
  unique?: boolean;
}

export interface InventoryEntry {
  uid: string;
  itemId: string;
  qty: number;
  plus: number; // upgrade level (+0 ~ +10)
  obtainedAt: number;
}

export interface SubjectDef {
  name: string; // canonical (Korean) name — e.g. "화학2"
  en: string;
  stat: StatKey; // stat trained by studying this subject
  color: string;
  custom?: boolean;
  hidden?: boolean;
}

export interface StudyRecord {
  id: string;
  subject: string;
  seconds: number;
  day: number;
  at: number; // real timestamp
  exp: number;
  gold: number;
  stamina: number;
  bonusPct: number; // total EXP bonus applied
  legacy?: boolean;
}

export interface DaySummary {
  number: number;
  startedAt: number;
  endedAt: number;
  studySeconds: number;
  subjects: Record<string, number>;
  records: number;
  exp: number;
  gold: number;
  monsters: number;
  floors: number;
  goalMet: boolean;
  goalMinutes: number;
}

export interface DayState {
  number: number;
  status: 'active' | 'sleeping';
  startedAt: number;
  sleptAt: number | null;
  expEarned: number;
  goldEarned: number;
  goldSpent: number;
  monstersDefeated: number;
  floorsCleared: number;
  battlesWon: number;
  gachaPulls: number;
}

export interface StudyTimer {
  subject: string;
  startedAt: number | null; // running since (timestamp) or null when paused
  accumulated: number; // ms accumulated before the current run
}

export interface PlayerState {
  name: string;
  createdAt: number;
  totalExp: number;
  hp: number;
  mp: number;
  gold: number;
  stamina: number;
  equipment: Record<EquipPosition, string | null>;
  cosmetics: { title: string | null; cape: string | null; aura: string | null };
  studyBuff: { expPct: number; goldPct: number };
}

export interface LifetimeStats {
  goldEarned: number;
  goldSpent: number;
  expFromStudy: number;
  expFromBattle: number;
  expFromQuests: number;
  expFromOther: number;
  monstersDefeated: number;
  battlesWon: number;
  battlesLost: number;
  escapes: number;
  bossesDefeated: string[];
  criticalHits: number;
  highestDamage: number;
  chestsOpened: number;
  itemsBought: number;
  itemsUsed: number;
  upgradesSucceeded: number;
  daysCompleted: number;
  synthesized: number;
  autoGachaRuns: number;
}

export interface TowerState {
  highestCleared: number;
  currentFloor: number;
  /** Special-floor flags: e.g. { f7_slots: 3 } */
  flags: Record<string, number>;
  runs: number;
}

export interface MonsterRecord {
  seen: number;
  defeated: number;
  firstAt?: number;
  maxLevel?: number;
}

export interface GachaRecord {
  at: number;
  itemId: string;
  rarity: Rarity;
  converted?: number; // gold refund for duplicate cosmetic
}

export interface RealReward {
  name: string;
  until: number;
  startedAt: number;
}

export interface Settings {
  sound: boolean;
  volume: number; // 0..1
  music: boolean;
  dailyGoalMinutes: number;
  scanlines: boolean;
  reduceMotion: boolean;
  introSeen: boolean;
}

export interface GameState {
  version: number;
  createdAt: number;
  savedAt: number;
  player: PlayerState;
  inventory: InventoryEntry[];
  ownedCosmetics: string[];
  subjects: SubjectDef[];
  study: StudyRecord[];
  day: DayState;
  dayHistory: DaySummary[];
  streak: { current: number; longest: number };
  tower: TowerState;
  quests: { dailyClaimed: string[]; achievementsClaimed: string[]; notified: string[] };
  monsters: Record<string, MonsterRecord>;
  gacha: { pulls: number; pity: number; history: GachaRecord[] };
  stats: LifetimeStats;
  rankSeen: RankId;
  timer: StudyTimer | null;
  realReward: RealReward | null;
  settings: Settings;
  legacy: { importedFrom?: string; floor?: number; importedAt?: number } | null;
}

/** Derived (computed) character stats. */
export interface DerivedStats {
  level: number;
  str: number;
  int: number;
  dex: number;
  luk: number;
  maxHp: number;
  maxMp: number;
  atk: number;
  matk: number;
  def: number;
  crit: number; // %
  critDmg: number; // multiplier
  expBonus: number; // %
  goldBonus: number; // %
  base: Record<StatKey, number>;
  training: Record<StatKey, number>;
  gear: StatBlock;
}

// ── Game events (for notifications / overlays) ──────────────
export type ToastKind =
  | 'study' | 'exp' | 'gold' | 'level' | 'quest' | 'item' | 'rank' | 'tower' | 'info' | 'warn' | 'save' | 'stamina';

export type GameEvent =
  | { type: 'toast'; kind: ToastKind; title: string; text?: string }
  | { type: 'levelUp'; from: number; to: number; gains: Record<string, number>; rewards: string[] }
  | { type: 'rankUp'; from: RankId; to: RankId }
  | { type: 'studyReward'; record: StudyRecord; hpRestored: number; staminaGained: number; trainingNotes: string[] }
  | { type: 'sfx'; name: SfxName };

export type SfxName =
  | 'click' | 'select' | 'confirm' | 'cancel' | 'error'
  | 'sword' | 'hit' | 'crit' | 'magic' | 'heal' | 'buff' | 'miss'
  | 'monsterAttack' | 'playerHurt' | 'defeatMonster' | 'victory' | 'defeat'
  | 'levelUp' | 'rankUp' | 'item' | 'coin' | 'study' | 'quest'
  | 'gachaCharge' | 'gachaReveal' | 'gachaRare' | 'gachaLegend'
  | 'door' | 'stairs' | 'sleep' | 'wake' | 'slime' | 'upgradeOk' | 'upgradeFail' | 'chest';
