// Core type definitions for PROJECT GENESIS.
// Definitions (static data) are kept separate from runtime instances (saved state).

export type Vec3 = [number, number, number];

// ---------- Resources & items ----------

export type ResourceId =
  | 'gold'
  | 'iron'
  | 'copper'
  | 'silicon'
  | 'energy'
  | 'research'
  | 'alloy';

export type ItemCategory = 'resource' | 'material' | 'equipment' | 'consumable';
export type EquipSlot = 'weapon' | 'armor' | 'tool' | 'module';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  short: string;
  description: string;
  color: string;
  /** Whether storage capacity limits this resource. */
  capped: boolean;
}

export interface EquipmentStats {
  attack?: number;
  defense?: number;
  maxHp?: number;
  miningYield?: number;
  hazardProtection?: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: Exclude<ItemCategory, 'resource'>;
  color: string;
  slot?: EquipSlot;
  stats?: EquipmentStats;
  /** Consumable effect */
  heal?: number;
}

/** Stack key: either a ResourceId or an item id. */
export type StackId = string;
export type Cost = Partial<Record<StackId, number>>;

// ---------- Buildings ----------

export type BuildingCategory = 'power' | 'production' | 'research' | 'defense' | 'logistics' | 'monument';

export type BuildingState =
  | 'operational'
  | 'unpowered'
  | 'disabled'
  | 'no_input'
  | 'storage_full'
  | 'idle'
  | 'invalid_site';

export interface ProductionDef {
  /** Resources consumed per cycle */
  inputs?: Cost;
  /** Resources produced per cycle. 'vein' means the resource under the building. */
  outputs: Cost | 'vein';
  /** Amount produced per cycle when outputs = 'vein' */
  veinAmount?: number;
  /** Seconds per production cycle */
  cycleTime: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  category: BuildingCategory;
  description: string;
  cost: Cost;
  requiredTech?: string;
  /** Positive = consumption (kW) */
  powerUse: number;
  /** Positive = generation (kW) */
  powerGen: number;
  /** Lower number = served first when power is short */
  priority: number;
  /** Footprint radius in meters for collisions and placement */
  radius: number;
  height: number;
  production?: ProductionDef;
  storageBonus?: number;
  energyStorageBonus?: number;
  /** Placement requires being on top of an ore vein */
  requiresVein?: boolean;
  /** Max number of instances (undefined = unlimited) */
  maxCount?: number;
  turret?: { range: number; damage: number; cooldown: number };
}

export interface BuildingInstance {
  id: string;
  type: string;
  ownerId: string;
  position: Vec3;
  rotation: number;
  enabled: boolean;
  state: BuildingState;
  /** Production cycle progress (seconds) */
  progress: number;
  /** Total units produced, for statistics/quests */
  produced: number;
  /** Resource of the ore vein this building sits on (miners) */
  veinResource?: ResourceId;
  builtAt: number;
  /** True for structures present at game start */
  prebuilt?: boolean;
}

// ---------- Technology ----------

export type TechBranch = 'energy' | 'materials' | 'electronics' | 'automation' | 'engineering';

export type TechEffect =
  | { type: 'unlockBuilding'; building: string }
  | { type: 'unlockRecipe'; recipe: string }
  | { type: 'modifier'; key: ModifierKey; value: number; label: string };

export type ModifierKey =
  | 'generatorOutput'
  | 'researchSpeed'
  | 'productionSpeed'
  | 'productionPowerUse'
  | 'storageCapacity'
  | 'minerSpeed';

export interface TechnologyDef {
  id: string;
  name: string;
  branch: TechBranch;
  tier: number;
  description: string;
  cost: Cost;
  /** Research points needed (1 point / second / operational laboratory) */
  points: number;
  prerequisites: string[];
  effects: TechEffect[];
}

export type TechStatus = 'locked' | 'available' | 'researching' | 'completed';

export interface ResearchState {
  completed: string[];
  active: { techId: string; progress: number } | null;
}

// ---------- Crafting ----------

export interface RecipeDef {
  id: string;
  name: string;
  description: string;
  cost: Cost;
  requiredTech?: string;
  output: { item: string; amount: number } | { upgrade: 'generatorBoost'; max: number };
  time: number;
}

export interface CraftJob {
  recipeId: string;
  progress: number;
}

// ---------- Enemies ----------

export interface DropDef {
  id: StackId;
  min: number;
  max: number;
  chance: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  speed: number;
  detectRange: number;
  attackRange: number;
  attackCooldown: number;
  scale: number;
  xp: number;
  drops: DropDef[];
  /** seconds; null = never respawns */
  respawnTime: number | null;
  color: string;
  coreColor: string;
  boss?: boolean;
}

export interface EnemySpawn {
  id: string;
  type: string;
  position: [number, number];
  zone: string;
}

export interface EnemyPersist {
  alive: boolean;
  respawnIn: number;
  defeats: number;
}

// ---------- World ----------

export interface ResourceNodeDef {
  id: string;
  kind: 'iron' | 'copper' | 'silicon' | 'wreck';
  position: [number, number];
  charges: number;
  regenTime: number;
}

export interface ResourceNodeState {
  charges: number;
  regenIn: number;
}

export interface OreVein {
  id: string;
  resource: ResourceId;
  position: [number, number];
  radius: number;
}

export interface ZoneDef {
  id: string;
  name: string;
  center: [number, number];
  radius: number;
  danger: number;
  hazard?: boolean;
}

// ---------- Quests ----------

export type QuestObjective =
  | { type: 'reach'; zone: string; label: string }
  | { type: 'collect'; resource: StackId; amount: number; label: string }
  | { type: 'build'; building: string; amount: number; label: string }
  | { type: 'condition'; condition: QuestCondition; label: string }
  | { type: 'research'; tech: string | 'any'; label: string }
  | { type: 'kill'; enemy: string; amount: number; label: string }
  | { type: 'produce'; building: string; amount: number; label: string };

export type QuestCondition = 'labPowered' | 'hasItem:ancient_core';

export interface QuestDef {
  id: string;
  name: string;
  summary: string;
  hint: string;
  objectives: QuestObjective[];
  reward: Reward;
}

export interface QuestProgress {
  status: 'locked' | 'active' | 'completed';
  /** Event-driven counters per objective index */
  counters: number[];
  /** Objectives that have been satisfied at least once (sticky) */
  done: boolean[];
}

// ---------- Rewards / progression ----------

export interface Reward {
  xp?: number;
  stacks?: Cost;
}

export interface PlayerState {
  level: number;
  xp: number;
  hp: number;
  position: Vec3;
  yaw: number;
  equipment: Partial<Record<EquipSlot, string>>;
  training: { vitality: number; strength: number };
  deaths: number;
}

export interface CivilizationState {
  /** Number of crafted generator boost coils (+10% generation each). Stored energy lives in inventory.energy. */
  generatorBoost: number;
}

/** Derived (non-persistent) civilization metrics computed by the simulation. */
export interface CivilizationReport {
  generation: number;
  demand: number;
  consumption: number;
  energyCapacity: number;
  storageCapacity: number;
  /** Demand exceeds generation (stored energy is being drained or buildings are off) */
  deficit: boolean;
  /** Number of consumers shut down for lack of power */
  unpowered: number;
  /** Units per minute */
  productionRates: Partial<Record<StackId, number>>;
  consumptionRates: Partial<Record<StackId, number>>;
  researchRate: number;
  operationalLabs: number;
  operationalWorkshops: number;
}

export interface GameStats {
  kills: Record<string, number>;
  collected: Record<string, number>;
  buildingsPlaced: number;
  playTime: number;
}

export interface GameState {
  player: PlayerState;
  inventory: Record<StackId, number>;
  buildings: BuildingInstance[];
  research: ResearchState;
  craftQueue: CraftJob[];
  quests: Record<string, QuestProgress>;
  nodes: Record<string, ResourceNodeState>;
  enemies: Record<string, EnemyPersist>;
  civ: CivilizationState;
  discovered: string[];
  stats: GameStats;
  time: number;
  nextId: number;
}

// ---------- Events (emitted by systems, consumed by quests / UI / audio) ----------

export type GameEvent =
  | { type: 'gained'; id: StackId; amount: number; source: 'collect' | 'reward' | 'production' | 'craft' | 'drop' }
  | { type: 'built'; building: string; id: string }
  | { type: 'researched'; tech: string }
  | { type: 'researchStarted'; tech: string }
  | { type: 'crafted'; recipe: string }
  | { type: 'killed'; enemy: string }
  | { type: 'entered'; zone: string }
  | { type: 'produced'; building: string; id: StackId; amount: number }
  | { type: 'levelUp'; level: number }
  | { type: 'questCompleted'; quest: string }
  | { type: 'questStarted'; quest: string }
  | { type: 'powerShortage' }
  | { type: 'powerRestored' };

export type Notice = { kind: 'info' | 'success' | 'warning' | 'error' | 'reward'; title: string; body?: string };

export type SystemResult<T = GameState> =
  | { ok: true; state: T; events: GameEvent[] }
  | { ok: false; reason: string };
