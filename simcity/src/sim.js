// 도시 시뮬레이션: 수요(RCI), 건물 성장, 세금
import {
  ZONE, CAPACITY, UPGRADE_REQ, SPEEDS, DAYS_PER_MONTH, START_YEAR,
  START_MONEY, DEFAULT_TAX, MILESTONES,
} from './config.js';

const KEYS = { [ZONE.R]: 'r', [ZONE.C]: 'c', [ZONE.I]: 'i' };

export class Sim {
  constructor(world, rng = Math.random) {
    this.world = world;
    this.rng = rng;
    this.events = [];
    this.reset();
  }

  reset() {
    this.money = START_MONEY;
    this.day = 0;
    this.tax = DEFAULT_TAX;
    this.speed = 1;
    this.pop = 0;
    this.jobsC = 0;
    this.jobsI = 0;
    this.roads = 0;
    this.demand = { r: 0.8, c: -0.2, i: 0.6 };
    this.lastMonth = null;
    this.milestone = 0;
    this.acc = 0;
    this.noAccessDays = 0;
    this.hintedAccess = false;
  }

  emit(type, data) { this.events.push({ type, ...data }); }

  get date() {
    const m = Math.floor(this.day / DAYS_PER_MONTH);
    return { year: START_YEAR + Math.floor(m / 12), month: (m % 12) + 1, day: (this.day % DAYS_PER_MONTH) + 1 };
  }

  update(dt) {
    this.acc += dt * SPEEDS[this.speed];
    let n = 0;
    while (this.acc >= 1 && n < 30) { this.acc -= 1; this.tickDay(); n++; }
    if (n >= 30) this.acc = 0;
  }

  recount() {
    const w = this.world;
    let pop = 0, jc = 0, ji = 0, roads = 0;
    for (let i = 0; i < w.n; i++) {
      roads += w.road[i];
      const z = w.zone[i], L = w.level[i];
      if (!z || !L) continue;
      const cap = CAPACITY[z][L];
      if (z === ZONE.R) pop += cap; else if (z === ZONE.C) jc += cap; else ji += cap;
    }
    this.pop = pop; this.jobsC = jc; this.jobsI = ji; this.roads = roads;
  }

  // 일자리와 노동력의 균형으로 수요를 계산 (-1 ~ 1)
  targetDemand() {
    const workers = this.pop * 0.5;
    const jobs = this.jobsC + this.jobsI;
    const taxAdj = (DEFAULT_TAX - this.tax) * 0.06;
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    return {
      r: clamp((jobs - workers * 0.92 + 50) / (25 + 0.2 * workers) + taxAdj),
      i: clamp((workers * 0.6 + 25 - this.jobsI) / (25 + 0.11 * workers) + taxAdj),
      c: clamp((workers * 0.48 + (this.pop >= 30 ? 8 : -6) - this.jobsC) / (15 + 0.09 * workers) + taxAdj),
    };
  }

  canUpgrade(i, toLevel) {
    const req = UPGRADE_REQ[toLevel];
    if (this.pop < req.pop) return false;
    const w = this.world;
    const [x, z] = w.xz(i);
    let n = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = x + dx, nz = z + dz;
      if (!w.inBounds(nx, nz)) continue;
      const j = w.idx(nx, nz);
      if (w.zone[j] && w.level[j] >= req.neighborLevel) n++;
    }
    return n >= req.neighbors;
  }

  tickDay() {
    const w = this.world, rng = this.rng;
    w.updateAccess();
    this.recount();
    const t = this.targetDemand();
    for (const k of ['r', 'c', 'i']) this.demand[k] += (t[k] - this.demand[k]) * 0.3;

    let zoned = 0, reachable = 0;
    for (let i = 0; i < w.n; i++) {
      const z = w.zone[i];
      if (!z) continue;
      zoned++;
      const L = w.level[i];
      const d = this.demand[KEYS[z]];
      if (!w.access[i]) {
        if (L > 0 && rng() < 0.03) w.setBuilding(i, L - 1, w.variant[i], w.rot[i]);
        continue;
      }
      reachable++;
      if (L === 0) {
        if (d > 0 && rng() < 0.02 * d) w.setBuilding(i, 1, Math.floor(rng() * 12), w.facing(i));
      } else if (d > 0.15 && L < 3 && rng() < 0.004 * d && this.canUpgrade(i, L + 1)) {
        w.setBuilding(i, L + 1, Math.floor(rng() * 12), w.facing(i));
      } else if (d < -0.2 && rng() < 0.015 * -d) {
        w.setBuilding(i, L - 1, w.variant[i], w.rot[i]);
      }
    }

    // 도로 없는 구역만 있을 때 한 번 안내
    if (zoned > 0 && reachable === 0) this.noAccessDays++; else this.noAccessDays = 0;
    if (this.noAccessDays === 20 && !this.hintedAccess) {
      this.hintedAccess = true;
      this.emit('toast', { text: '구역 3칸 안에 도로가 있어야 건물이 지어져요!', kind: 'warn' });
    }

    this.day++;
    if (this.day % DAYS_PER_MONTH === 0) this.monthly();
    this.recount();
    while (this.milestone < MILESTONES.length && this.pop >= MILESTONES[this.milestone][0]) {
      this.emit('toast', { text: `🎉 인구 ${MILESTONES[this.milestone][0].toLocaleString()} — ${MILESTONES[this.milestone][1]}`, kind: 'good' });
      this.milestone++;
    }
  }

  estimateMonthly() {
    const income = Math.round((this.tax / 100) * (this.pop * 5 + (this.jobsC + this.jobsI) * 4));
    const expense = this.roads * 1;
    return { income, expense };
  }

  monthly() {
    const m = this.estimateMonthly();
    this.money += m.income - m.expense;
    this.lastMonth = m;
    this.emit('month', m);
    if (this.money < 0) this.emit('toast', { text: '예산이 바닥났어요! 세금을 올리거나 도로를 줄여 보세요.', kind: 'warn' });
  }

  serialize() {
    const { money, day, tax, speed, demand, milestone, lastMonth, hintedAccess } = this;
    return { money, day, tax, speed, demand, milestone, lastMonth, hintedAccess };
  }

  load(o) {
    Object.assign(this, o);
    this.acc = 0;
    this.recount();
  }
}
