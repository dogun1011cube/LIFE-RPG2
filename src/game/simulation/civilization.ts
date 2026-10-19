import { BUILDINGS } from '../../data/buildings';
import { TECHNOLOGIES } from '../../data/technologies';
import { RECIPES } from '../../data/recipes';
import { ENEMIES, RESPAWN_MIN_DISTANCE } from '../../data/enemies';
import { ENEMY_SPAWNS, RESOURCE_NODES } from '../../data/world';
import { canAfford, costEntries, count, spend } from '../resources/inventory';
import { getCapacities, getEnergyCapacity, getModifier, getStorageCapacity } from '../research/modifiers';
import { completeCraft } from '../crafting/craftingSystem';
import { grantStacks } from '../progression/rewards';
import type { BuildingInstance, BuildingState, CivilizationReport, Cost, GameEvent, GameState, StackId } from '../types';

// Fixed simulation step used by the game loop. All industrial simulation (power,
// production, research, crafting, regeneration, respawn timers) advances here, never
// in per-building timers.
export const SIM_STEP = 0.25;

/** 1 kW sustained for one second stores this much energy. */
export const ENERGY_PER_KW_SECOND = 0.1;
/** Stored energy needed (in seconds of deficit) before a stopped building restarts on battery power */
export const RESTART_BUFFER_SECONDS = 5;
/** Generator boost coil bonus per level */
export const BOOST_PER_COIL = 0.1;

export function generatorMultiplier(state: GameState) {
  return 1 + getModifier(state.research.completed, 'generatorOutput') + state.civ.generatorBoost * BOOST_PER_COIL;
}

/** Effective power draw of a building (production buildings benefit from efficiency research) */
export function effectivePowerUse(state: GameState, type: string) {
  const def = BUILDINGS[type];
  if (!def) return 0;
  if (def.production) return def.powerUse * (1 + getModifier(state.research.completed, 'productionPowerUse'));
  return def.powerUse;
}

export function productionSpeed(state: GameState, type: string) {
  const done = state.research.completed;
  let speed = 1 + getModifier(done, 'productionSpeed');
  if (type === 'auto_miner') speed += getModifier(done, 'minerSpeed');
  return speed;
}

export function researchSpeedPerLab(state: GameState) {
  return 1 + getModifier(state.research.completed, 'researchSpeed');
}

function outputsOf(b: BuildingInstance): Cost {
  const prod = BUILDINGS[b.type]?.production;
  if (!prod) return {};
  if (prod.outputs === 'vein') return b.veinResource ? { [b.veinResource]: prod.veinAmount ?? 1 } : {};
  return prod.outputs;
}

/** Pre-check whether a production building can run this step (inputs + free storage) */
function productionBlock(inv: Record<StackId, number>, b: BuildingInstance, caps: ReturnType<typeof getCapacities>): BuildingState | null {
  const prod = BUILDINGS[b.type]?.production;
  if (!prod) return null;
  if (prod.outputs === 'vein' && !b.veinResource) return 'invalid_site';
  if (prod.inputs && !canAfford(inv, prod.inputs)) return 'no_input';
  const outs = costEntries(outputsOf(b));
  if (outs.length > 0 && outs.every(([id]) => caps[id] !== undefined && count(inv, id) >= (caps[id] ?? Infinity))) return 'storage_full';
  return null;
}

export const EMPTY_REPORT: CivilizationReport = {
  generation: 0,
  demand: 0,
  consumption: 0,
  energyCapacity: 100,
  storageCapacity: 150,
  deficit: false,
  unpowered: 0,
  productionRates: {},
  consumptionRates: {},
  researchRate: 0,
  operationalLabs: 0,
  operationalWorkshops: 0,
};

export interface SimContext {
  playerX: number;
  playerZ: number;
  /** Previous report, used to emit shortage transitions */
  prev?: CivilizationReport;
}

/**
 * Advances the civilization by dt seconds.
 *
 * Power rule: generation (+ stored energy) is allocated to enabled consumers in
 * ascending `priority` order (laboratories & turrets first, miners last), oldest
 * building first within the same priority. A building whose demand does not fit in the
 * remaining budget is shut down ("unpowered"). Surplus generation charges the energy
 * store; deficits are covered by discharging it. A running building may drain the
 * store to zero, but a stopped one only restarts on stored energy once the store can
 * cover its deficit for RESTART_BUFFER_SECONDS (prevents on/off flicker).
 */
export function simulate(state: GameState, dt: number, ctx: SimContext): { state: GameState; events: GameEvent[]; report: CivilizationReport } {
  const events: GameEvent[] = [];
  let s: GameState = { ...state, time: state.time + dt, stats: { ...state.stats, playTime: state.stats.playTime + dt } };
  const caps = getCapacities(s);
  let inv = { ...s.inventory };

  // ---- 1. Generation
  const genMult = generatorMultiplier(s);
  let generation = 0;
  for (const b of s.buildings) {
    const def = BUILDINGS[b.type];
    if (def && def.powerGen > 0 && b.enabled) generation += def.powerGen * genMult;
  }

  // ---- 2. Determine consumers
  const buildings = s.buildings.map((b) => ({ ...b }));
  const consumers: { b: BuildingInstance; wasOn: boolean }[] = [];
  for (const b of buildings) {
    const def = BUILDINGS[b.type];
    if (!def) continue;
    const wasOn = b.state === 'operational';
    if (!b.enabled) {
      b.state = 'disabled';
      continue;
    }
    if (def.powerUse <= 0) {
      b.state = 'operational';
      continue;
    }
    const block = productionBlock(inv, b, caps);
    if (block) {
      b.state = block;
      continue;
    }
    consumers.push({ b, wasOn });
  }
  consumers.sort((x, y) => (BUILDINGS[x.b.type].priority - BUILDINGS[y.b.type].priority) || x.b.builtAt - y.b.builtAt);

  // ---- 3. Allocate power
  const stored = count(inv, 'energy');
  let genLeft = generation;
  let storeLeft = stored;
  let demand = 0;
  let consumption = 0;
  let unpowered = 0;
  for (const { b, wasOn } of consumers) {
    const use = effectivePowerUse(s, b.type);
    demand += use;
    const fromGen = Math.min(use, genLeft);
    const fromStore = use - fromGen;
    // Running buildings may drain storage to zero; restarting needs a buffer (hysteresis)
    const required = fromStore * ENERGY_PER_KW_SECOND * (wasOn ? dt : RESTART_BUFFER_SECONDS);
    if (fromStore <= 1e-6 || storeLeft >= required) {
      genLeft -= fromGen;
      storeLeft -= fromStore * ENERGY_PER_KW_SECOND * dt;
      consumption += use;
      b.state = 'operational';
    } else {
      b.state = 'unpowered';
      unpowered++;
    }
  }
  const shortage = unpowered > 0;
  const net = generation - consumption;
  const energyCap = getEnergyCapacity(s);
  inv.energy = Math.max(0, Math.min(energyCap, stored + net * ENERGY_PER_KW_SECOND * dt));

  // ---- 4. Production
  const productionRates: Partial<Record<StackId, number>> = {};
  const consumptionRates: Partial<Record<StackId, number>> = {};
  let operationalLabs = 0;
  let operationalWorkshops = 0;
  for (const b of buildings) {
    if (b.state !== 'operational') continue;
    if (b.type === 'research_lab') operationalLabs++;
    if (b.type === 'workshop') operationalWorkshops++;
    const def = BUILDINGS[b.type];
    const prod = def?.production;
    if (!prod) continue;
    const speed = productionSpeed(s, b.type);
    const outs = outputsOf(b);
    for (const [id, n] of costEntries(outs)) productionRates[id] = (productionRates[id] ?? 0) + (n * 60 * speed) / prod.cycleTime;
    if (prod.inputs) for (const [id, n] of costEntries(prod.inputs)) consumptionRates[id] = (consumptionRates[id] ?? 0) + (n * 60 * speed) / prod.cycleTime;
    b.progress += dt * speed;
    if (b.progress >= prod.cycleTime) {
      // Re-check inputs: another building may have consumed them this step.
      if (prod.inputs) {
        const after = spend(inv, prod.inputs);
        if (!after) {
          b.progress = prod.cycleTime;
          b.state = 'no_input';
          continue;
        }
        inv = after;
      }
      b.progress -= prod.cycleTime;
      s = { ...s, inventory: inv };
      const r = grantStacks(s, outs, 'production');
      inv = { ...r.state.inventory };
      for (const [id, amount] of Object.entries(r.added)) {
        b.produced += amount ?? 0;
        events.push({ type: 'produced', building: b.type, id, amount: amount ?? 0 });
      }
    }
  }

  s = { ...s, buildings, inventory: inv };

  // ---- 5. Research
  const perLab = researchSpeedPerLab(s);
  const researchRate = operationalLabs * perLab;
  if (s.research.active && researchRate > 0) {
    const tech = TECHNOLOGIES[s.research.active.techId];
    const progress = s.research.active.progress + dt * researchRate;
    if (tech && progress >= tech.points) {
      s = { ...s, research: { completed: [...s.research.completed, tech.id], active: null } };
      events.push({ type: 'researched', tech: tech.id });
    } else {
      s = { ...s, research: { ...s.research, active: { ...s.research.active, progress } } };
    }
  }

  // ---- 6. Crafting (one job at a time; extra workshops speed it up)
  if (s.craftQueue.length > 0 && operationalWorkshops > 0) {
    const [job, ...rest] = s.craftQueue;
    const recipe = RECIPES[job.recipeId];
    const progress = job.progress + dt * (1 + 0.5 * (operationalWorkshops - 1)) * (1 + getModifier(s.research.completed, 'productionSpeed'));
    if (!recipe) {
      s = { ...s, craftQueue: rest };
    } else if (progress >= recipe.time) {
      s = { ...s, craftQueue: rest };
      const r = completeCraft(s, recipe.id);
      s = r.state;
      events.push(...r.events);
    } else {
      s = { ...s, craftQueue: [{ ...job, progress }, ...rest] };
    }
  }

  // ---- 7. World regeneration timers
  let nodesChanged = false;
  const nodes = { ...s.nodes };
  for (const def of RESOURCE_NODES) {
    const n = nodes[def.id];
    if (n && n.charges <= 0) {
      const regenIn = n.regenIn - dt;
      nodes[def.id] = regenIn <= 0 ? { charges: def.charges, regenIn: 0 } : { ...n, regenIn };
      nodesChanged = true;
    }
  }
  let enemiesChanged = false;
  const enemies = { ...s.enemies };
  for (const spawn of ENEMY_SPAWNS) {
    const e = enemies[spawn.id];
    if (!e || e.alive) continue;
    const def = ENEMIES[spawn.type];
    if (!def || def.respawnTime === null) continue;
    const respawnIn = Math.max(0, e.respawnIn - dt);
    const far = Math.hypot(ctx.playerX - spawn.position[0], ctx.playerZ - spawn.position[1]) > RESPAWN_MIN_DISTANCE;
    enemies[spawn.id] = respawnIn <= 0 && far ? { ...e, alive: true, respawnIn: 0 } : { ...e, respawnIn };
    enemiesChanged = true;
  }
  if (nodesChanged) s = { ...s, nodes };
  if (enemiesChanged) s = { ...s, enemies };

  const report: CivilizationReport = {
    generation,
    demand,
    consumption,
    energyCapacity: energyCap,
    storageCapacity: getStorageCapacity(s),
    deficit: demand > generation + 1e-6,
    unpowered,
    productionRates,
    consumptionRates,
    researchRate,
    operationalLabs,
    operationalWorkshops,
  };
  if (ctx.prev) {
    if (shortage && ctx.prev.unpowered === 0) events.push({ type: 'powerShortage' });
    if (!shortage && ctx.prev.unpowered > 0) events.push({ type: 'powerRestored' });
  }
  return { state: s, events, report };
}
