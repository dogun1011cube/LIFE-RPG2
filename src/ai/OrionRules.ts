import { BUILDINGS } from '../data/buildings';
import { TECHNOLOGIES } from '../data/technologies';
import { RESOURCES } from '../data/resources';
import { ENEMIES } from '../data/enemies';
import { ENEMY_SPAWNS, ORE_VEINS, ZONES } from '../data/world';
import { getTechStatus, researchBlocker } from '../game/research/researchSystem';
import { getCapacities, isBuildingUnlocked } from '../game/research/modifiers';
import { costEntries, count, missing, stackName } from '../game/resources/inventory';
import { effectivePowerUse, generatorMultiplier } from '../game/simulation/civilization';
import { getPlayerStats } from '../game/progression/progression';
import { activeQuest, objectiveStatus } from '../game/quests/questSystem';
import { hasWorkshop } from '../game/crafting/craftingSystem';
import type { CivilizationReport, GameState } from '../game/types';

// Rule-based analysis for ORION. Every number in a response is read from the live
// game state passed in — nothing is invented.

export interface OrionContext {
  game: GameState;
  report: CivilizationReport;
  player: { x: number; z: number };
}

export interface OrionRule {
  id: string;
  /** Keywords (Korean or English) that trigger this rule */
  keywords: string[];
  answer: (ctx: OrionContext, query: string) => string;
}

const n1 = (v: number) => (Math.round(v * 10) / 10).toString();

function powerStatus({ game, report }: OrionContext) {
  const lines: string[] = [];
  const gens = game.buildings.filter((b) => (BUILDINGS[b.type]?.powerGen ?? 0) > 0);
  const gensOn = gens.filter((b) => b.enabled).length;
  lines.push(`현재 발전량 ${n1(report.generation)} kW, 공급 중인 소비량 ${n1(report.consumption)} kW, 총 수요 ${n1(report.demand)} kW입니다.`);
  lines.push(`발전 설비 ${gens.length}기 (가동 ${gensOn}기), 발전 배율 ×${generatorMultiplier(game).toFixed(2)}. 저장 에너지 ${Math.floor(count(game.inventory, 'energy'))}/${report.energyCapacity}.`);
  if (gens.length === 0) {
    lines.push('발전기가 하나도 없습니다. B 키로 건설 모드에 들어가 발전기(철 10, 구리 5)를 세우세요.');
    return lines.join('\n');
  }
  if (report.unpowered > 0) {
    const off = game.buildings.filter((b) => b.state === 'unpowered').map((b) => BUILDINGS[b.type]?.name);
    const shortfall = report.demand - report.generation;
    lines.push(`⚠ 전력 부족으로 정지된 설비: ${off.join(', ')}. 부족분은 약 ${n1(Math.max(0, shortfall))} kW입니다.`);
    const genOut = BUILDINGS.power_generator.powerGen * generatorMultiplier(game);
    lines.push(`해결책: 발전기 ${Math.max(1, Math.ceil(shortfall / genOut))}기 추가 (기당 ${n1(genOut)} kW), 사용하지 않는 설비 비활성화, 또는 '개량 발전기' 연구.`);
  } else if (report.deficit) {
    lines.push('수요가 발전량보다 많아 저장 에너지를 소모하고 있습니다. 에너지가 바닥나면 우선순위가 낮은 설비부터 정지합니다.');
  } else {
    lines.push(`전력은 충분합니다. 여유 전력 ${n1(report.generation - report.consumption)} kW가 에너지 저장소를 충전 중입니다.`);
  }
  const disabled = game.buildings.filter((b) => !b.enabled);
  if (disabled.length) lines.push(`참고: 비활성화된 설비 ${disabled.length}개가 있습니다.`);
  return lines.join('\n');
}

function researchAdvice({ game, report }: OrionContext) {
  const lines: string[] = [];
  if (game.research.active) {
    const t = TECHNOLOGIES[game.research.active.techId];
    const pct = Math.floor((game.research.active.progress / t.points) * 100);
    lines.push(`현재 '${t.name}' 연구 중 (${pct}%).${report.researchRate === 0 ? ' 하지만 가동 중인 연구소가 없어 멈춰 있습니다 — 전력을 확인하세요.' : ` 연구 속도 ${n1(report.researchRate)} pt/s.`}`);
  }
  const available = Object.values(TECHNOLOGIES).filter((t) => getTechStatus(game, t.id) === 'available');
  if (available.length === 0) {
    lines.push(game.research.completed.length === Object.keys(TECHNOLOGIES).length ? '모든 기술을 연구했습니다!' : '지금 연구 가능한 기술이 없습니다. 선행 기술을 먼저 완료하세요.');
    return lines.join('\n');
  }
  // Priority: what the active quest needs, then automation/energy, then cheapest
  const quest = activeQuest(game);
  const questTech = quest?.objectives.find((o) => o.type === 'research' && o.tech !== 'any');
  const priority = ['basic_semiconductors', 'automated_mining', 'improved_generators', 'improved_alloys', 'advanced_equipment', 'research_infrastructure', 'energy_storage'];
  const score = (id: string) => {
    if (questTech && questTech.type === 'research' && (questTech.tech === id || TECHNOLOGIES[questTech.tech]?.prerequisites.includes(id))) return -100;
    const i = priority.indexOf(id);
    return i >= 0 ? i : 50 + (TECHNOLOGIES[id].cost.research ?? 0);
  };
  const best = [...available].sort((a, b) => score(a.id) - score(b.id))[0];
  const blocker = researchBlocker(game, best.id);
  lines.push(`추천 연구: '${best.name}' — ${best.description}`);
  lines.push(`비용: ${costEntries(best.cost).map(([k, v]) => `${stackName(k)} ${v} (보유 ${Math.floor(count(game.inventory, k))})`).join(', ')}.`);
  if (blocker) lines.push(`현재 시작 불가: ${blocker}`);
  else lines.push('지금 바로 시작할 수 있습니다. K 키로 연구 트리를 여세요.');
  const others = available.filter((t) => t.id !== best.id).map((t) => t.name);
  if (others.length) lines.push(`그 외 연구 가능: ${others.join(', ')}.`);
  return lines.join('\n');
}

function automationGuide({ game }: OrionContext) {
  const steps: [boolean, string][] = [
    [getTechStatus(game, 'basic_semiconductors') === 'completed', "'기초 반도체 제조' 연구"],
    [getTechStatus(game, 'automated_mining') === 'completed', "'자동 채굴' 연구"],
    [hasWorkshop(game), '작업장 건설'],
    [count(game.inventory, 'mining_component') > 0 || game.buildings.some((b) => b.type === 'auto_miner'), '작업장에서 자동 채굴 부품 제작'],
    [game.buildings.some((b) => b.type === 'auto_miner'), '기지 안의 광맥(바닥에 빛나는 원) 위에 자동 채굴기 건설'],
    [game.buildings.some((b) => b.type === 'auto_miner' && b.state === 'operational'), '채굴기 전력 공급 (8 kW 필요)'],
  ];
  const lines = ['자동 채굴 진행 단계:'];
  steps.forEach(([done, label], i) => lines.push(`${done ? '✔' : '○'} ${i + 1}. ${label}`));
  const next = steps.find(([d]) => !d);
  if (next) lines.push(`다음 할 일: ${next[1]}.`);
  else lines.push('자동 채굴이 가동 중입니다! 광맥별로 채굴기를 늘리면 생산량이 증가합니다.');
  lines.push(`광맥 위치: ${ORE_VEINS.map((v) => `${RESOURCES[v.resource].name} (${v.position[0]}, ${v.position[1]})`).join(', ')}.`);
  return lines.join('\n');
}

function buildingCost(ctx: OrionContext, query: string) {
  const { game } = ctx;
  const q = query.replace(/\s/g, '');
  const aliases: Record<string, string[]> = {
    research_lab: ['연구소', '실험실', 'lab', 'laboratory'],
    power_generator: ['발전기', 'generator'],
    workshop: ['작업장', 'workshop'],
    auto_miner: ['채굴기', 'miner'],
    smelter: ['제련소', 'smelter'],
    storage_depot: ['저장고', 'storage'],
    battery_bank: ['배터리', '저장장치', 'battery'],
    defense_turret: ['포탑', 'turret'],
    plasma_generator: ['플라즈마', 'plasma'],
    genesis_beacon: ['신호탑', 'beacon'],
  };
  let id = Object.keys(aliases).find((k) => aliases[k].some((a) => q.toLowerCase().includes(a)));
  if (id === 'power_generator' && q.includes('플라즈마')) id = 'plasma_generator';
  if (!id) return null;
  const def = BUILDINGS[id];
  const lines = [`${def.name} 건설 비용: ${costEntries(def.cost).map(([k, v]) => `${stackName(k)} ${v}`).join(', ')}.`];
  const miss = missing(game.inventory, def.cost);
  if (!isBuildingUnlocked(game, id)) lines.push(`아직 잠겨 있습니다 — '${TECHNOLOGIES[def.requiredTech!].name}' 연구가 필요합니다.`);
  if (miss.length === 0) lines.push('현재 자원으로 바로 건설할 수 있습니다.');
  else lines.push(`부족한 자원: ${miss.map((m) => `${stackName(m.id)} ${Math.ceil(m.need - m.have)}`).join(', ')}.`);
  if (def.powerUse > 0) {
    const free = ctx.report.generation - ctx.report.consumption;
    const use = effectivePowerUse(game, id);
    lines.push(`가동에 ${n1(use)} kW가 필요합니다. 현재 여유 전력 ${n1(free)} kW${free < use ? ' — 발전기를 추가해야 합니다.' : '로 충분합니다.'}`);
  }
  if (def.requiresVein) lines.push('광맥 위에만 설치할 수 있습니다.');
  return lines.join('\n');
}

function combatPrep({ game, player }: OrionContext) {
  const stats = getPlayerStats(game);
  const lines = [`현재 체력 ${Math.ceil(game.player.hp)}/${stats.maxHp}, 공격력 ${stats.attack}, 방어력 ${stats.defense}, 치료 팩 ${count(game.inventory, 'med_pack')}개.`];
  // nearest alive enemy
  let nearest: { name: string; d: number; type: string } | null = null;
  for (const s of ENEMY_SPAWNS) {
    if (!game.enemies[s.id]?.alive) continue;
    const d = Math.hypot(s.position[0] - player.x, s.position[1] - player.z);
    if (!nearest || d < nearest.d) nearest = { name: ENEMIES[s.type].name, d, type: s.type };
  }
  if (nearest) {
    const e = ENEMIES[nearest.type];
    const hits = Math.ceil(e.maxHp / stats.attack);
    const taken = Math.max(1, e.attack - stats.defense);
    lines.push(`가장 가까운 적: ${nearest.name} (약 ${Math.round(nearest.d)}m). 체력 ${e.maxHp} → 약 ${hits}회 공격 필요, 피격 시 ${taken} 피해.`);
    lines.push('적이 몸을 웅크리면 공격 신호입니다. 옆으로 피한 뒤 반격하세요.');
  }
  const boss = ENEMY_SPAWNS.find((s) => s.type === 'guardian')!;
  if (game.enemies[boss.id]?.alive) {
    const g = ENEMIES.guardian;
    lines.push(`수호자(체력 ${g.maxHp}, 공격 ${g.attack})는 바닥의 붉은 원으로 내려찍기를 예고합니다. 원 밖으로 벗어나세요.`);
  }
  if (!stats.hazardProtection) lines.push("타락 지대는 초당 5의 부식 피해를 줍니다. '고급 장비' 연구 후 환경 보호 모듈을 제작하세요.");
  if ((game.player.equipment.weapon ?? '') === 'rusty_blade') lines.push('무기가 기본 마체테입니다. 작업장에서 강화 철검(철 15, 구리 5)을 제작하면 공격력이 크게 오릅니다.');
  if (!game.player.equipment.armor) lines.push('방어구가 없습니다. 기본 방호복(철 20, 구리 4)을 추천합니다.');
  return lines.join('\n');
}

function civStatus({ game, report }: OrionContext) {
  const caps = getCapacities(game);
  const res = (['iron', 'copper', 'silicon', 'alloy', 'research', 'energy'] as const)
    .map((id) => `${RESOURCES[id].name} ${Math.floor(count(game.inventory, id))}${caps[id] ? `/${caps[id]}` : ''}`)
    .join(', ');
  const byState: Record<string, number> = {};
  for (const b of game.buildings) byState[b.state] = (byState[b.state] ?? 0) + 1;
  const rates = Object.entries(report.productionRates)
    .map(([k, v]) => `${stackName(k)} +${n1(v ?? 0)}/분`)
    .join(', ');
  return [
    `문명 현황 보고 — 레벨 ${game.player.level} 탐사관, 골드 ${Math.floor(count(game.inventory, 'gold'))}.`,
    `자원: ${res}.`,
    `설비 ${game.buildings.length}개: 가동 ${byState.operational ?? 0}, 전력 부족 ${byState.unpowered ?? 0}, 원료 부족 ${byState.no_input ?? 0}, 비활성 ${byState.disabled ?? 0}.`,
    `전력 ${n1(report.consumption)}/${n1(report.generation)} kW. 연구 완료 ${game.research.completed.length}/${Object.keys(TECHNOLOGIES).length}.`,
    rates ? `자동 생산: ${rates}.` : '자동 생산 설비가 아직 없습니다.',
  ].join('\n');
}

function questHelp({ game }: OrionContext) {
  const q = activeQuest(game);
  if (!q) return '진행 중인 임무가 없습니다. 모든 임무를 완료했어요 — 기지를 자유롭게 확장하세요.';
  const lines = [`현재 임무: '${q.name}' — ${q.summary}`];
  q.objectives.forEach((o, i) => {
    const st = objectiveStatus(game, q.id, i);
    lines.push(`${st.done ? '✔' : '○'} ${o.label}${st.target > 1 ? ` (${st.current}/${st.target})` : ''}`);
  });
  lines.push(`힌트: ${q.hint}`);
  return lines.join('\n');
}

function resourceWhere({ game }: OrionContext, query: string) {
  const q = query.toLowerCase();
  const koreanAliases: Record<string, string[]> = { iron: ['철'], copper: ['구리'], silicon: ['실리콘'], research: ['연구 데이터', '데이터'], alloy: ['합금'], gold: ['골드', '돈'] };
  const want = (['iron', 'copper', 'silicon', 'research', 'alloy', 'gold'] as const).find(
    (id) => q.includes(RESOURCES[id].name) || koreanAliases[id].some((k) => q.includes(k)) || new RegExp(`\\b${id}\\b`).test(q),
  );
  const where: Record<string, string> = {
    iron: '낙하 지점 주변과 기지 서쪽에 회색 광상이 있습니다. 기지 서쪽 광맥에 자동 채굴기를 세울 수도 있습니다.',
    copper: '낙하 지점 동쪽과 녹색 초원 근처에 주황색 광상이 있습니다.',
    silicon: '북서쪽 결정 능선에 푸른 결정이 많습니다. 결정 슬라임도 실리콘을 떨어뜨립니다.',
    research: '서쪽 추락한 탐사선의 기술 잔해(빛나는 파편)를 회수하거나 슬라임을 처치하세요.',
    alloy: '합금 제련소(개량 합금 연구)에서 생산하거나 기술 잔해에서 소량 회수합니다.',
    gold: '적 처치와 임무 보상으로 얻습니다.',
  };
  if (!want) return null;
  return `${RESOURCES[want].name}: 보유 ${Math.floor(count(game.inventory, want))}. ${where[want]}`;
}

function whereAmI({ player }: OrionContext) {
  const zone = ZONES.find((z) => Math.hypot(player.x - z.center[0], player.z - z.center[1]) <= z.radius);
  const d = Math.round(Math.hypot(player.x, player.z));
  return `현재 좌표 (${Math.round(player.x)}, ${Math.round(player.z)}), ${zone ? `'${zone.name}' 구역` : '미지정 구역'}입니다. 전초기지 중심까지 약 ${d}m.`;
}

export const ORION_RULES: OrionRule[] = [
  { id: 'power', keywords: ['전력', '전기', '발전', 'power', 'energy', '에너지', '정전'], answer: powerStatus },
  { id: 'automation', keywords: ['자동', '채굴기', 'automat', 'mining'], answer: automationGuide },
  { id: 'research', keywords: ['연구', '기술', 'research', 'tech'], answer: researchAdvice },
  { id: 'combat', keywords: ['적', '전투', '보스', '수호자', '슬라임', '준비', 'enemy', 'fight', 'boss', 'combat'], answer: combatPrep },
  { id: 'status', keywords: ['상태', '현황', '보고', 'status', 'report', '문명'], answer: civStatus },
  { id: 'quest', keywords: ['임무', '퀘스트', '뭐 해', '무엇을', '다음', 'quest', 'what should', 'next'], answer: questHelp },
  { id: 'where', keywords: ['어디', '위치', 'where'], answer: (c, q) => resourceWhere(c, q) ?? whereAmI(c) },
];

export function matchRules(ctx: OrionContext, query: string): string {
  const q = query.toLowerCase();
  // Building cost questions take precedence when a building is named with cost words
  if (/(비용|필요|얼마|자원|cost|need|건설|짓)/.test(q)) {
    const cost = buildingCost(ctx, q);
    if (cost) return cost;
  }
  const scored = ORION_RULES.map((r) => ({ r, score: r.keywords.filter((k) => q.includes(k.toLowerCase())).length })).filter((x) => x.score > 0);
  if (scored.length === 0) {
    const cost = buildingCost(ctx, q);
    if (cost) return cost;
    const where = resourceWhere(ctx, q);
    if (where) return where;
    return [
      '질문을 이해하지 못했습니다. ORION은 현재 규칙 기반 분석 모드로 동작합니다.',
      '예: "전력이 왜 부족해?", "다음에 뭘 연구할까?", "자동 채굴은 어떻게 해?", "연구소 짓는 데 뭐가 필요해?", "다음 적을 어떻게 대비해?", "문명 현황 보여줘"',
    ].join('\n');
  }
  scored.sort((a, b) => b.score - a.score);
  // "자동" + "연구" → automation guide wins if both present
  const top = scored[0].r;
  return top.answer(ctx, q);
}
