// 먼작귀 친구들 - 폰 안을 돌아다니는 작은 캐릭터들
const $ = (id) => document.getElementById(id);
const stage = $("stage"), plates = $("plates");
const CHAR_SIZE = 76;
const KEY_LIMIT = "chii_limit_v1";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 캐릭터 그림 (SVG)
const STROKE = "#6b5b5b";
const face = (ex1 = 38, ex2 = 62, ey = 58) => `
  <g class="eyes"><ellipse class="eye" cx="${ex1}" cy="${ey}" rx="3.2" ry="4" fill="#4a3f3f"/><ellipse class="eye" cx="${ex2}" cy="${ey}" rx="3.2" ry="4" fill="#4a3f3f"/></g>
  <circle cx="${ex1 - 7}" cy="${ey + 8}" r="4.5" fill="#ffb3c1" opacity=".85"/><circle cx="${ex2 + 7}" cy="${ey + 8}" r="4.5" fill="#ffb3c1" opacity=".85"/>
  <path class="mouth-closed" d="M46 ${ey + 7} Q50 ${ey + 11} 54 ${ey + 7}" fill="none" stroke="${STROKE}" stroke-width="2" stroke-linecap="round"/>
  <ellipse class="mouth-open" cx="50" cy="${ey + 9}" rx="4" ry="4.5" fill="#e8737f" stroke="${STROKE}" stroke-width="1.6"/>`;

const SVGS = {
  chiikawa: `<svg viewBox="0 0 100 100">
    <ellipse cx="33" cy="30" rx="9" ry="12" fill="#fff" stroke="${STROKE}" stroke-width="2.5" transform="rotate(-12 33 30)"/>
    <ellipse cx="67" cy="30" rx="9" ry="12" fill="#fff" stroke="${STROKE}" stroke-width="2.5" transform="rotate(12 67 30)"/>
    <ellipse cx="50" cy="62" rx="33" ry="29" fill="#fff" stroke="${STROKE}" stroke-width="2.5"/>
    <ellipse cx="24" cy="70" rx="7" ry="5" fill="#fff" stroke="${STROKE}" stroke-width="2.2"/>
    <ellipse cx="76" cy="70" rx="7" ry="5" fill="#fff" stroke="${STROKE}" stroke-width="2.2"/>
    <ellipse cx="38" cy="90" rx="9" ry="5" fill="#fff" stroke="${STROKE}" stroke-width="2.2"/>
    <ellipse cx="62" cy="90" rx="9" ry="5" fill="#fff" stroke="${STROKE}" stroke-width="2.2"/>
    ${face()}</svg>`,
  hachiware: `<svg viewBox="0 0 100 100">
    <path d="M26 42 L28 14 L46 30 Z" fill="#7fb8e8" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M74 42 L72 14 L54 30 Z" fill="#7fb8e8" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="62" rx="33" ry="29" fill="#fff" stroke="${STROKE}" stroke-width="2.5"/>
    <path d="M20 54 Q22 32 50 32 Q78 32 80 54 Q70 46 60 50 L50 40 L40 50 Q30 46 20 54 Z" fill="#7fb8e8" stroke="${STROKE}" stroke-width="2.2" stroke-linejoin="round"/>
    <ellipse cx="24" cy="70" rx="7" ry="5" fill="#fff" stroke="${STROKE}" stroke-width="2.2"/>
    <ellipse cx="76" cy="70" rx="7" ry="5" fill="#fff" stroke="${STROKE}" stroke-width="2.2"/>
    <ellipse cx="38" cy="90" rx="9" ry="5" fill="#fff" stroke="${STROKE}" stroke-width="2.2"/>
    <ellipse cx="62" cy="90" rx="9" ry="5" fill="#fff" stroke="${STROKE}" stroke-width="2.2"/>
    ${face(38, 62, 62)}</svg>`,
  usagi: `<svg viewBox="0 0 100 100">
    <ellipse cx="36" cy="18" rx="8" ry="22" fill="#fff3b0" stroke="${STROKE}" stroke-width="2.5" transform="rotate(-8 36 18)"/>
    <ellipse cx="64" cy="18" rx="8" ry="22" fill="#fff3b0" stroke="${STROKE}" stroke-width="2.5" transform="rotate(8 64 18)"/>
    <ellipse cx="36" cy="20" rx="3.5" ry="14" fill="#ffd6dc" transform="rotate(-8 36 20)"/>
    <ellipse cx="64" cy="20" rx="3.5" ry="14" fill="#ffd6dc" transform="rotate(8 64 20)"/>
    <ellipse cx="50" cy="65" rx="32" ry="27" fill="#fff3b0" stroke="${STROKE}" stroke-width="2.5"/>
    <ellipse cx="25" cy="72" rx="7" ry="5" fill="#fff3b0" stroke="${STROKE}" stroke-width="2.2"/>
    <ellipse cx="75" cy="72" rx="7" ry="5" fill="#fff3b0" stroke="${STROKE}" stroke-width="2.2"/>
    <ellipse cx="38" cy="91" rx="9" ry="5" fill="#fff3b0" stroke="${STROKE}" stroke-width="2.2"/>
    <ellipse cx="62" cy="91" rx="9" ry="5" fill="#fff3b0" stroke="${STROKE}" stroke-width="2.2"/>
    ${face(38, 62, 62)}</svg>`,
};

// ---------- 캐릭터별 대사/행동
const DATA = {
  chiikawa: {
    name: "치이카와", food: "🍙",
    hello: ["안녕…! 왔구나", "오늘도 잘 부탁해…!", "와, 만나서 기뻐…!"],
    touch: [["히잉… 간지러워", "squish"], ["우와아앙… (감동)", "shake"], ["열심히 할게…!", "jump"], ["둘이서 같이 하자…!", "hop"], ["푸슛… 꺄!", "squish"]],
    nag: ["폰 그만 보고 쉬자…", "눈이 아파 보여…", "나 조금 걱정돼…"],
    eat: ["냠냠…", "맛있어…!", "행복해…"],
  },
  hachiware: {
    name: "하치와레", food: "🍰",
    hello: ["안녕! 오늘도 화이팅!", "어서 와! 기다렸어!", "좋은 하루야!"],
    touch: [["와하하! 좋아 좋아!", "hop"], ["이이이이! 얍!", "spin"], ["오늘도 힘내자!", "jump"], ["간지러워~ 푸하하!", "shake"], ["노래 불러줄까? 랄라~", "hop"]],
    nag: ["이제 그만 쓰자! 응?", "휴식도 중요해!", "밖에 나가서 놀자!"],
    eat: ["맛있다~!", "우물우물!", "한 입 더!"],
  },
  usagi: {
    name: "우사기", food: "🥕",
    hello: ["야하!", "우라~!", "왔냐! 야하하!"],
    touch: [["우라라라라!", "spin"], ["야하! 야하!", "hop"], ["푸! 푸! 푸!", "shake"], ["만지지 마! …좀 더!", "squish"], ["우라아아!!", "jump"]],
    nag: ["그만 해! 야하!", "폰 내려놔! 우라!", "나랑 놀아야지!!"],
    eat: ["우걱우걱!", "야하~ 맛있다!", "더 줘! 우라!"],
  },
};
const FX = { touch: ["💗", "✨", "⭐", "🌸"], eat: ["🍴", "💖", "✨"] };

// ---------- 캐릭터 객체
const chars = Object.keys(DATA).map((type, i) => {
  const el = document.createElement("div");
  el.className = "char idle";
  el.innerHTML = `<div class="bubble"></div><div class="shadow"></div><div class="body"><div class="walk">${SVGS[type]}</div></div>`;
  stage.appendChild(el);
  if (i === 1) el.style.setProperty("--bo", "34px"); // 가운데 캐릭터 말풍선은 한 칸 위로 (겹침 방지)
  const c = { type, el, bubble: el.querySelector(".bubble"), x: 0, y: 0, mode: "wander", timer: null, bubbleTimer: null, taps: [], i };
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); onTouch(c); });
  return c;
});

function bounds() {
  const w = stage.clientWidth, h = stage.clientHeight;
  return { minX: 6, maxX: Math.max(6, w - CHAR_SIZE - 6), minY: h * 0.42, maxY: Math.max(h * 0.42, h - CHAR_SIZE - 80) };
}
function place(c, x, y, dur) {
  const dx = x - c.x;
  if (Math.abs(dx) > 4) c.el.classList.toggle("flip", dx < 0);
  c.el.style.transitionDuration = dur + "ms";
  c.el.style.transform = `translate(${x}px,${y}px)`;
  c.el.style.zIndex = Math.round(y);
  c.x = x; c.y = y;
}
function moveTo(c, x, y, speed = 38) {
  const dist = Math.hypot(x - c.x, y - c.y);
  const dur = Math.max(300, (dist / speed) * 1000);
  c.el.classList.remove("idle");
  place(c, x, y, dur);
  return sleep(dur).then(() => c.el.classList.add("idle"));
}

function say(c, text, ms = 2200) {
  c.bubble.textContent = text;
  c.bubble.classList.add("show");
  clearTimeout(c.bubbleTimer);
  c.bubbleTimer = setTimeout(() => c.bubble.classList.remove("show"), ms);
}
function anim(c, name, ms = 900) {
  const el = c.el;
  ["jump", "spin", "shake", "hop", "squish"].forEach((n) => el.classList.remove(n));
  void el.offsetWidth;
  el.classList.add(name);
  setTimeout(() => el.classList.remove(name), ms);
}
function fx(c, list) {
  const s = document.createElement("span");
  s.className = "fx";
  s.textContent = pick(list);
  s.style.left = c.x + rand(10, CHAR_SIZE - 10) + "px";
  s.style.top = c.y - 6 + "px";
  stage.appendChild(s);
  setTimeout(() => s.remove(), 1000);
}

// ---------- 돌아다니기
let mode = "wander"; // wander | eat | nag
function wanderLoop(c) {
  clearTimeout(c.timer);
  if (mode !== "wander") return;
  const b = bounds();
  const near = Math.random() < 0.5;
  const x = near ? Math.min(b.maxX, Math.max(b.minX, c.x + rand(-90, 90))) : rand(b.minX, b.maxX);
  const y = near ? Math.min(b.maxY, Math.max(b.minY, c.y + rand(-50, 50))) : rand(b.minY, b.maxY);
  moveTo(c, x, y).then(() => {
    if (Math.random() < 0.25) say(c, pick(["♪", "~", "…!", "zZ", "ふん♪"]), 1200);
    c.timer = setTimeout(() => wanderLoop(c), rand(800, 3500));
  });
}
function startWander() {
  mode = "wander";
  chars.forEach((c) => { c.el.classList.remove("eating", "nagging"); clearTimeout(c.timer); c.timer = setTimeout(() => wanderLoop(c), rand(200, 1200)); });
}

// ---------- 터치
function onTouch(c) {
  const now = Date.now();
  c.taps = c.taps.filter((t) => now - t < 1500).concat(now);
  const d = DATA[c.type];
  if (c.taps.length >= 5) {
    say(c, pick(["그만 간지러워어~!", "어지러워…!", "으아아아!"]));
    anim(c, "spin", 700);
    c.taps = [];
    fx(c, ["💫", "💦"]);
    return;
  }
  if (mode === "eat") { say(c, pick(d.eat)); anim(c, "squish", 500); fx(c, FX.eat); return; }
  if (mode === "nag") { say(c, pick(d.nag)); anim(c, "shake", 500); return; }
  const [line, a] = pick(d.touch);
  say(c, line); anim(c, a); fx(c, FX.touch);
}

// ---------- 인사
async function greet(kind = "start") {
  if (mode !== "wander") return;
  const h = new Date().getHours();
  const part = h < 5 ? "늦은 밤이야…" : h < 11 ? "좋은 아침!" : h < 17 ? "좋은 오후!" : h < 22 ? "좋은 저녁!" : "벌써 밤이네!";
  chars.forEach((c) => clearTimeout(c.timer));
  const b = bounds();
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  chars.forEach((c, i) => {
    if (kind === "start") { place(c, cx + (i - 1) * 70, b.maxY + 60, 0); }
    moveTo(c, cx + (i - 1) * 78, cy, 120);
  });
  await sleep(700);
  for (const c of chars) {
    const d = DATA[c.type];
    say(c, kind === "start" ? pick(d.hello) : pick(["다시 왔구나!", "보고 싶었어!", ...d.hello]), 2600);
    anim(c, "jump", 600);
    fx(c, FX.touch);
    await sleep(450);
  }
  chars[0] && setTimeout(() => say(chars[1], part, 2200), 300);
  await sleep(2800);
  if (mode === "wander") startWander();
}

// ---------- 충전 = 밥
function setPlates() {
  plates.innerHTML = "";
  const b = bounds();
  const cx = (b.minX + b.maxX) / 2, y = b.maxY + 40;
  chars.forEach((c, i) => {
    const p = document.createElement("div");
    p.className = "plate";
    p.textContent = DATA[c.type].food;
    p.style.left = cx + (i - 1) * 84 + CHAR_SIZE / 2 + "px";
    p.style.top = y + CHAR_SIZE - 2 + "px";
    plates.appendChild(p);
    c.plateX = cx + (i - 1) * 84; c.plateY = y;
  });
}
let eatLoops = [];
function startEating() {
  if (mode === "eat") return;
  mode = "eat";
  chars.forEach((c) => clearTimeout(c.timer));
  setPlates();
  plates.classList.add("on");
  chars.forEach((c) => {
    moveTo(c, c.plateX, c.plateY, 80).then(() => {
      if (mode !== "eat") return;
      c.el.classList.add("eating");
      const loop = setInterval(() => {
        if (mode !== "eat") return clearInterval(loop);
        say(c, pick(DATA[c.type].eat), 1500);
        fx(c, FX.eat);
      }, rand(2600, 3800));
      eatLoops.push(loop);
      say(c, pick(DATA[c.type].eat), 1500);
    });
  });
}
function stopEating() {
  if (mode !== "eat") return;
  eatLoops.forEach(clearInterval); eatLoops = [];
  plates.classList.remove("on");
  chars.forEach((c) => { c.el.classList.remove("eating"); say(c, pick(["잘 먹었다~!", "배불러…!", "고마워!"]), 2000); anim(c, "hop", 900); });
  setTimeout(startWander, 1600);
  mode = "wander";
}

// ---------- 오래 쓰면 그만 쓰자고 떼쓰기
const nagLines = ["이제 그만 쓰자~", "눈 좀 쉬게 하자!", "폰 내려놓고 스트레칭 해볼까?", "제발 그만~! 우리랑 놀자!"];
let usedSec = 0, hiddenAt = null, nagCount = 0, nagTimer = null;
let limitSec = parseInt(localStorage.getItem(KEY_LIMIT) || "1800", 10);
$("limitSel").value = String(limitSec);
$("limitSel").onchange = (e) => { limitSec = parseInt(e.target.value, 10); try { localStorage.setItem(KEY_LIMIT, limitSec); } catch {} };

function startNag() {
  if (mode === "nag") return;
  const wasEat = mode === "eat";
  if (wasEat) { eatLoops.forEach(clearInterval); eatLoops = []; plates.classList.remove("on"); }
  mode = "nag";
  nagCount++;
  chars.forEach((c) => clearTimeout(c.timer));
  const b = bounds(), cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  $("nagBar").classList.remove("hidden");
  $("nagText").textContent = nagLines[Math.min(nagCount, 4) - 1];
  chars.forEach((c, i) => {
    c.el.classList.remove("eating");
    moveTo(c, cx + (i - 1) * 80, cy + 30, 120).then(() => {
      if (mode !== "nag") return;
      c.el.classList.add("nagging");
      say(c, pick(DATA[c.type].nag), 3000);
    });
  });
  nagTimer = setInterval(() => {
    if (mode !== "nag") return clearInterval(nagTimer);
    const c = pick(chars);
    nagCount = Math.min(nagCount + 1, 4);
    $("nagText").textContent = nagLines[nagCount - 1];
    say(c, pick(DATA[c.type].nag), 2500);
    fx(c, ["💢", "😣", "💦"]);
  }, 3200);
}
function endNag() {
  clearInterval(nagTimer);
  $("nagBar").classList.add("hidden");
  usedSec = 0; nagCount = 0;
  chars.forEach((c) => { c.el.classList.remove("nagging"); say(c, pick(["고마워!", "잘 생각했어!", "푹 쉬어~"]), 2200); anim(c, "hop", 900); });
  mode = "wander";
  setTimeout(() => { if (charging) startEating(); else startWander(); }, 1600);
}
$("nagOk").onclick = endNag;

// 1초마다: 시계 + 연속 사용 시간
function tick() {
  const d = new Date();
  $("clockTime").textContent = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  $("clockDate").textContent = d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
  if (!document.hidden) {
    usedSec++;
    $("useChip").textContent = usedSec < 60 ? `📱 ${usedSec}초` : `📱 ${Math.floor(usedSec / 60)}분`;
    if (usedSec >= limitSec && mode !== "nag") startNag();
  }
}
setInterval(tick, 1000);
tick();

// ---------- 폰을 켰을 때(화면이 다시 보일 때) 인사
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  const away = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0;
  hiddenAt = null;
  if (away > 300) { usedSec = 0; nagCount = 0; if (mode === "nag") endNag(); } // 5분 이상 쉬면 사용 시간 리셋
  if (away >= 3) greet("back");
});

// ---------- 배터리(충전) 감지
let charging = false;
function setBat(b) {
  charging = b.charging;
  $("batChip").textContent = `${charging ? "⚡" : "🔋"} ${Math.round(b.level * 100)}%`;
  $("batInfo").textContent = "충전 감지 사용 중";
}
if (navigator.getBattery) {
  navigator.getBattery().then((b) => {
    let was = b.charging;
    setBat(b);
    if (was) setTimeout(startEating, 4500);
    b.addEventListener("chargingchange", () => { setBat(b); b.charging ? startEating() : stopEating(); });
    b.addEventListener("levelchange", () => setBat(b));
  });
} else {
  $("batInfo").textContent = "이 브라우저는 충전 감지를 지원하지 않아요 (안드로이드 크롬에서 동작). 위 버튼으로 테스트할 수 있어요.";
  $("batChip").textContent = "🔋 --";
}

// ---------- 설정/테스트 패널
$("gearBtn").onclick = () => $("panel").classList.toggle("hidden");
document.querySelectorAll("[data-test]").forEach((b) => (b.onclick = () => {
  const t = b.dataset.test;
  if (t === "hello") greet("back");
  if (t === "nag") startNag();
  if (t === "charge") { charging = true; startEating(); }
  if (t === "unplug") { charging = false; stopEating(); }
}));

// ---------- 시작
window.addEventListener("resize", () => { if (mode === "eat") { setPlates(); plates.classList.add("on"); } });
(function init() {
  const b = bounds();
  chars.forEach((c, i) => place(c, rand(b.minX, b.maxX), rand(b.minY, b.maxY), 0));
  greet("start");
})();
