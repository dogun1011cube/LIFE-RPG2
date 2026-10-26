// HUD, 핫바, 정보창, 토스트, 대화상자
import { TOOLS } from './tools.js';
import { ZONE_NAMES, CAPACITY, LEVEL_NAMES, TERRAIN, FEATURE, ZONE } from './config.js';
import { buildingName } from './models.js';

const $ = (s) => document.querySelector(s);
const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
const money = (n) => (n < 0 ? '-$' : '$') + fmt(Math.abs(n));

export class UI {
  constructor(game) {
    this.game = game;
    this.el = {
      money: $('#money'), pop: $('#pop'), jobs: $('#jobs'), date: $('#date'),
      tax: $('#tax'), income: $('#income'), expense: $('#expense'),
      hint: $('#tool-hint'), hotbar: $('#hotbar'), tooltip: $('#tooltip'), info: $('#info'),
      toasts: $('#toasts'), modal: $('#modal'), modalButtons: $('#modalButtons'), modalBody: $('#modal .help'),
    };
    this.helpHTML = this.el.modalBody.innerHTML;
    this.fills = {};
    document.querySelectorAll('.rci .bar').forEach(b => { this.fills[b.dataset.k] = b.querySelector('.fill'); });
    this.speedBtns = [...document.querySelectorAll('#speed [data-speed]')];
    this.speedBtns.forEach(b => b.addEventListener('click', () => game.setSpeed(+b.dataset.speed)));
    $('#taxDown').addEventListener('click', () => game.changeTax(-1));
    $('#taxUp').addEventListener('click', () => game.changeTax(1));
    $('#saveBtn').addEventListener('click', () => game.save(true));
    $('#newBtn').addEventListener('click', () => this.confirmNew());
    $('#helpBtn').addEventListener('click', () => this.showHelp());
    const hold = (id, fn) => {
      const b = $(id);
      let timer = null;
      const stop = () => { clearInterval(timer); timer = null; };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); timer = setInterval(fn, 60); });
      b.addEventListener('pointerup', stop);
      b.addEventListener('pointerleave', stop);
    };
    hold('#rotL', () => game.renderer.rotateBy(0.08));
    hold('#rotR', () => game.renderer.rotateBy(-0.08));
    hold('#zoomIn', () => game.renderer.zoomBy(0.94));
    hold('#zoomOut', () => game.renderer.zoomBy(1.06));
    this.buildHotbar();
  }

  buildHotbar() {
    this.slots = {};
    for (const t of TOOLS) {
      const s = document.createElement('div');
      s.className = 'slot';
      s.title = `${t.name} (${t.key})`;
      s.appendChild(this.game.renderer.iconCanvas(t.icon, 32));
      s.insertAdjacentHTML('beforeend', `<span class="key">${t.key}</span><span class="name">${t.name}</span>`);
      s.addEventListener('click', () => this.game.setTool(t.id));
      this.el.hotbar.appendChild(s);
      this.slots[t.id] = s;
    }
  }

  setTool(id) {
    for (const [k, s] of Object.entries(this.slots)) s.classList.toggle('active', k === id);
    const t = TOOLS.find(t => t.id === id);
    this.el.hint.textContent = t ? t.hint : '';
  }

  update(sim) {
    const d = sim.date;
    this.el.money.textContent = money(sim.money);
    this.el.money.classList.toggle('bad', sim.money < 0);
    this.el.pop.textContent = fmt(sim.pop);
    this.el.jobs.textContent = fmt(sim.jobsC + sim.jobsI);
    this.el.date.textContent = `${d.year}년 ${d.month}월 ${d.day}일`;
    this.el.tax.textContent = sim.tax + '%';
    const est = sim.estimateMonthly();
    this.el.income.textContent = '+' + fmt(est.income);
    this.el.expense.textContent = '-' + fmt(est.expense);
    for (const k of ['r', 'c', 'i']) {
      const v = Math.max(-1, Math.min(1, sim.demand[k]));
      const f = this.fills[k];
      if (v >= 0) { f.style.bottom = '50%'; f.style.top = ''; f.style.height = (v * 50) + '%'; }
      else { f.style.top = '50%'; f.style.bottom = ''; f.style.height = (-v * 50) + '%'; }
      f.style.opacity = v >= 0 ? 1 : 0.55;
    }
    this.speedBtns.forEach(b => b.classList.toggle('active', +b.dataset.speed === sim.speed));
  }

  toast(text, kind = '', ms = 3200) {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = text;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, ms);
  }

  tooltip(x, y, html) {
    const tt = this.el.tooltip;
    if (!html) { tt.classList.add('hidden'); return; }
    tt.innerHTML = html;
    tt.classList.remove('hidden');
    const w = tt.offsetWidth;
    tt.style.left = Math.min(window.innerWidth - w - 6, x + 16) + 'px';
    tt.style.top = Math.max(6, y - 34) + 'px';
  }

  showInfo(world, i) {
    if (i == null) { this.el.info.classList.add('hidden'); return; }
    const [x, z] = world.xz(i);
    const rows = [];
    const terr = ['풀밭', '모래', '물'][world.terrain[i]];
    let title = terr;
    rows.push(['위치', `${x}, ${z}`]);
    if (world.road[i]) title = '도로';
    else if (world.zone[i]) {
      const zn = world.zone[i], L = world.level[i];
      title = `${ZONE_NAMES[zn]} 구역`;
      if (L > 0) {
        rows.push(['건물', buildingName(zn, L, world.variant[i])]);
        rows.push(['단계', `Lv.${L} ${LEVEL_NAMES[zn][L]}`]);
        rows.push([zn === ZONE.R ? '주민' : '일자리', `${CAPACITY[zn][L]}${zn === ZONE.R ? '명' : '개'}`]);
      } else rows.push(['건물', '빈 땅 (건설 대기)']);
      world.updateAccess();
      rows.push(['도로 연결', world.access[i] ? '<span class="good">연결됨</span>' : '<span class="bad">3칸 안에 도로 없음</span>']);
    } else if (world.feature[i] === FEATURE.TREE) title = '나무';
    else if (world.feature[i] === FEATURE.ROCK) title = '바위';
    if (world.terrain[i] !== TERRAIN.GRASS || title !== terr) rows.push(['지형', terr]);
    this.el.info.innerHTML = `<span class="close">✕</span><h3>${title}</h3>` +
      rows.map(([a, b]) => `<div class="row"><span>${a}</span><span>${b}</span></div>`).join('');
    this.el.info.querySelector('.close').addEventListener('click', () => this.game.inspect(null));
    this.el.info.classList.remove('hidden');
  }

  modal(buttons, body = this.helpHTML, closable = true) {
    const m = this.el.modal;
    this.el.modalBody.innerHTML = body;
    this.el.modalButtons.innerHTML = '';
    for (const [label, fn] of buttons) {
      const b = document.createElement('button');
      b.className = 'mc-btn';
      b.textContent = label;
      b.addEventListener('click', () => { m.classList.add('hidden'); fn && fn(); });
      this.el.modalButtons.appendChild(b);
    }
    m.classList.remove('hidden');
    m.onclick = closable ? (e) => { if (e.target === m) m.classList.add('hidden'); } : null;
  }

  get modalOpen() { return !this.el.modal.classList.contains('hidden'); }

  showHelp() { this.modal([['닫기', null]]); }

  confirmNew() {
    this.modal([['취소', null], ['새 도시 만들기', () => this.game.newGame()]],
      '<p>지금 도시를 두고 새 지도에서 시작할까요?<br>저장하지 않은 진행 상황은 사라져요.</p>');
  }
}
