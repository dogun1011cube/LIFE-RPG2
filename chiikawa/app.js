// 먼작귀 친구들 - 폰 안을 돌아다니는 작은 캐릭터들
const $ = (id) => document.getElementById(id);
const stage = $("stage"), plates = $("plates");
const CHAR_SIZE = 76;
const KEY_LIMIT = "chii_limit_v1";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isNight = () => { const h = new Date().getHours(); return h >= 23 || h < 6; };

// 캐릭터 그림(SVGS)은 chars.js에 있다

// ---------- 캐릭터별 성격 · 대사 · 행동
// t: 대사, a: 짧은 동작, sp: 특수 행동, tr: 하치와레의 통역(말을 잘 못하는 캐릭터용)
const DATA = {
  chiikawa: {
    // 소심한 울보. 말은 거의 못 하고 짧은 소리만 낸다. 풀 뽑기 검정 공부 중.
    food: "🍙", speed: 26, pause: [1800, 4500],
    hello: ["…와!", "와아…!", "에헤…"],
    idle: ["…와", "후에…", "…!", "(꼼지락)"],
    touch: [
      { t: "와…!", a: "squish", tr: "좋다는 거야!?" },
      { t: "에…?", a: "shake", tr: "깜짝 놀랐다는 거야!?" },
      { t: "후에에…", sp: "tremble", tr: "부끄럽다는 거야!?" },
      { t: "와아…!", a: "hop", tr: "신난다는 거야!?" },
      { t: "뽑… 뽑…", sp: "weed", tr: "풀 뽑기 연습이야!? 이번 검정은 꼭 붙자!" },
      { t: "……(펄럭)", sp: "study", tr: "풀 뽑기 검정 공부 중이라는 거야!?" },
    ],
    tickle: { t: "우와아앙…!", sp: "cry" },
    nag: ["이야…", "우…(울먹)", "후에에…"], nagSp: "cry",
    eat: ["와…!", "냠…", "(맛있어서 울었다)"],
    full: ["와아…!", "…헤헤"],
  },
  hachiware: {
    // 밝고 긍정적인 수다쟁이. 유일하게 말을 잘해서 통역 담당. 기타와 사진이 취미.
    food: "🍜", speed: 40, pause: [1200, 3500],
    hello: ["안녕! 오늘도 화이팅!", "어서 와! 보고 싶었어!", "왔구나! 좋은 하루 보내자!"],
    idle: ["♪ 랄라~", "오늘 날씨 좋다~", "뭐 먹을까~?"],
    touch: [
      { t: "헤헤! 간지럽다는 거야!?", a: "hop" },
      { t: "어떻게든 되라~!!", a: "jump" },
      { t: "노래 하나 할게! ♪", sp: "guitar" },
      { t: "다들 모여! 사진 찍자~", sp: "photo" },
      { t: "최고야~!", a: "spin" },
      { t: "같이 하면 할 수 있어!", a: "jump" },
    ],
    tickle: { t: "으하하! 그만~! 어떻게든 되라~!!", a: "spin" },
    nag: ["이제 그만 쓰자! 눈이 피곤하다는 거야!", "폰 내려놓고 우리랑 놀자!", "휴식도 중요해! 진짜로!"], nagA: "jump",
    eat: ["맛있다~ 최고!", "후루룩~!", "따끈따끈해~!"],
    full: ["잘 먹었다~! 최고!", "배불러~"],
  },
  usagi: {
    // 제멋대로 토끼. 말 대신 "우라!", "야하!", "하?" 같은 소리만. 엄청 빠르고 먹보.
    food: "🍗", speed: 95, pause: [400, 1500],
    hello: ["야하!", "우라~!", "하아?! 야하!"],
    idle: ["우라", "하?", "푸루루루", "야하"],
    touch: [
      { t: "우라!", a: "jump", tr: "반갑다는 거야!?" },
      { t: "야하!", a: "hop", tr: "신난다는 거야!?" },
      { t: "하?", a: "shake", tr: "뭐냐는 거야!?" },
      { t: "우라라라라라!", sp: "dash", tr: "달리기 하자는 거야!?" },
      { t: "푸루루루루…", a: "spin", tr: "……무슨 뜻이지?" },
      { t: "하아아앙?!", a: "squish", tr: "화났다는 거야!?" },
    ],
    tickle: { t: "우라라라라라라!!", sp: "dash" },
    nag: ["우라!!", "하아?!", "야하! 야하!"], nagA: "spin",
    eat: ["우마! 야하!", "우걱우걱!", "우라!"],
    full: ["야하~!", "하아…(만족)"],
  },
  momonga: {
    // 관심받고 싶은 날다람쥐. "칭찬해!", "내놔!", "싫어싫어!". 날아다닌다.
    food: "🍮", speed: 46, pause: [1000, 3000],
    hello: ["늦었잖아! 나부터 봐!", "왔어? 칭찬해!", "나 귀엽지? 그치?"],
    idle: ["흥!", "나 귀엽지?", "심심해!"],
    touch: [
      { t: "칭찬해! 더!", a: "hop" },
      { t: "나 귀엽지? 그치?", a: "squish" },
      { t: "흥! …더 쓰다듬어도 돼", a: "shake" },
      { t: "날아라~!", sp: "glide" },
      { t: "그거 내놔!", a: "jump" },
    ],
    tickle: { t: "흥, 당연하지! 난 귀여우니까!", a: "spin" },
    nag: ["싫어싫어싫어! 폰 말고 나를 봐!", "그 폰 내놔!", "나랑 놀아야지!!"], nagA: "shake",
    eat: ["내 거야!", "맛있다! 더 내놔!", "냠냠! 칭찬해!"],
    full: ["흥, 나쁘지 않았어", "더 없어?"],
  },
};
const FX = { touch: ["💗", "✨", "⭐", "🌸"], eat: ["🍴", "💖", "✨"] };

// ---------- 캐릭터 객체
const chars = Object.keys(DATA).map((type, i) => {
  const el = document.createElement("div");
  el.className = "char idle";
  el.innerHTML = `<div class="bubble"></div><div class="shadow"></div><div class="body"><div class="walk">${SVGS[type]}</div></div>`;
  if (i % 2) el.style.setProperty("--bo", "34px"); // 옆 캐릭터와 말풍선이 겹치지 않게 번갈아 높이기
  stage.appendChild(el);
  const c = { type, d: DATA[type], el, bubble: el.querySelector(".bubble"), x: 0, y: 0, i, gen: 0, moveId: 0, busy: false, timer: null, bubbleTimer: null, taps: [] };
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); onTouch(c); });
  return c;
});
const C = Object.fromEntries(chars.map((c) => [c.type, c]));

function bounds() {
  const w = stage.clientWidth, h = stage.clientHeight;
  return { minX: 6, maxX: Math.max(6, w - CHAR_SIZE - 6), minY: h * 0.42, maxY: Math.max(h * 0.42, h - CHAR_SIZE - 80) };
}
const clampX = (x) => { const b = bounds(); return Math.min(b.maxX, Math.max(b.minX, x)); };
const clampY = (y) => { const b = bounds(); return Math.min(b.maxY + 40, Math.max(b.minY, y)); };
function place(c, x, y, dur) {
  const dx = x - c.x;
  if (Math.abs(dx) > 4) c.el.classList.toggle("flip", dx < 0);
  c.el.style.transitionDuration = dur + "ms";
  c.el.style.transform = `translate(${x}px,${y}px)`;
  c.el.style.zIndex = Math.round(y);
  c.x = x; c.y = y;
}
function moveTo(c, x, y, speed = c.d.speed) {
  const id = ++c.moveId;
  const dur = Math.max(300, (Math.hypot(x - c.x, y - c.y) / speed) * 1000);
  c.el.classList.remove("idle");
  place(c, x, y, dur);
  return sleep(dur).then(() => { if (c.moveId === id) c.el.classList.add("idle"); });
}
// 여러 명을 한 줄로 세울 때의 x 좌표
function rowX(i, n = chars.length) {
  const b = bounds();
  const gap = Math.min(80, (b.maxX - b.minX) / Math.max(1, n - 1));
  return (b.minX + b.maxX) / 2 + (i - (n - 1) / 2) * gap;
}

function say(c, text, ms = 2200) {
  c.bubble.textContent = text;
  // 화면 가장자리에서 말풍선이 잘리지 않게 안쪽으로 밀기
  const w = Math.min(150, c.bubble.scrollWidth), center = c.x + CHAR_SIZE / 2, sw = stage.clientWidth;
  const shift = Math.max(8 + w / 2 - center, Math.min(0, sw - 8 - w / 2 - center));
  c.bubble.style.setProperty("--bx", Math.round(shift) + "px");
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
function prop(c, emoji, ms) {
  const p = document.createElement("span");
  p.className = "prop";
  p.textContent = emoji;
  c.el.appendChild(p);
  setTimeout(() => p.remove(), ms);
}
function flagFor(c, cls, ms) {
  c.el.classList.add(cls);
  return sleep(ms).then(() => c.el.classList.remove(cls));
}

// ---------- 캐릭터별 특수 행동
const SPECIAL = {
  async cry(c) { // 치이카와: 울먹울먹
    for (let k = 0; k < 4; k++) setTimeout(() => fx(c, ["💧"]), k * 500);
    await flagFor(c, "crying", 2400);
  },
  tremble: (c) => flagFor(c, "tremble", 1400), // 치이카와: 부들부들
  async weed(c) { // 치이카와: 풀 뽑기 검정 연습
    prop(c, "🌿", 2200);
    for (let k = 0; k < 3; k++) { anim(c, "squish", 500); fx(c, ["🌱"]); await sleep(650); }
  },
  async study(c) { // 치이카와: 풀 뽑기 검정 공부
    prop(c, "📖", 2800);
    await flagFor(c, "sleepy", 2800);
  },
  async guitar(c) { // 하치와레: 기타 연주
    prop(c, "🎸", 3200);
    c.el.classList.add("groove");
    for (let k = 0; k < 7; k++) { fx(c, ["♪", "♫", "🎵"]); await sleep(450); }
    c.el.classList.remove("groove");
  },
  photo: () => photoScene(), // 하치와레: 다 같이 사진
  async dash(c) { // 우사기: 화면 끝까지 질주
    const b = bounds();
    c.el.classList.add("dashing");
    await moveTo(c, c.x < (b.minX + b.maxX) / 2 ? b.maxX : b.minX, rand(b.minY, b.maxY), 300);
    await moveTo(c, rand(b.minX, b.maxX), rand(b.minY, b.maxY), 300);
    c.el.classList.remove("dashing");
  },
  async glide(c) { // 모몽가: 활공
    const b = bounds();
    c.el.classList.add("gliding");
    await moveTo(c, c.x < (b.minX + b.maxX) / 2 ? rand(b.maxX * 0.6, b.maxX) : rand(b.minX, b.maxX * 0.4), rand(b.minY, b.maxY), 170);
    c.el.classList.remove("gliding");
    anim(c, "squish", 500);
  },
};
async function doSpecial(c, name) {
  if (c.busy) return;
  c.busy = true;
  try { await SPECIAL[name](c); } finally { c.busy = false; }
}

// ---------- 돌아다니기
let mode = "wander"; // wander | eat | nag
let sceneLock = false;
function wanderLoop(c, gen) {
  if (mode !== "wander" || gen !== c.gen) return;
  if (c.busy || sceneLock) { c.timer = setTimeout(() => wanderLoop(c, gen), 600); return; }
  const b = bounds();
  const near = Math.random() < 0.5;
  const x = near ? clampX(c.x + rand(-90, 90)) : rand(b.minX, b.maxX);
  const y = near ? Math.min(b.maxY, Math.max(b.minY, c.y + rand(-50, 50))) : rand(b.minY, b.maxY);
  moveTo(c, x, y, isNight() ? c.d.speed * 0.6 : c.d.speed).then(() => {
    if (gen !== c.gen) return;
    if (Math.random() < 0.2 && !c.busy) say(c, isNight() ? pick(["zZ", "후아암…", ...c.d.idle]) : pick(c.d.idle), 1300);
    c.timer = setTimeout(() => wanderLoop(c, gen), rand(...c.d.pause));
  });
}
function haltWander() { chars.forEach((c) => { c.gen++; clearTimeout(c.timer); }); }
function startWander() {
  mode = "wander";
  haltWander();
  chars.forEach((c) => {
    c.el.classList.remove("eating", "nagging", "crying");
    const gen = c.gen;
    c.timer = setTimeout(() => wanderLoop(c, gen), rand(200, 1200));
  });
}

// ---------- 터치
let lastMomongaTouch = Date.now();
function onTouch(c) {
  const now = Date.now(), d = c.d;
  if (c.type === "momonga") lastMomongaTouch = now;
  c.taps = c.taps.filter((t) => now - t < 1500).concat(now);
  if (c.taps.length >= 5) { // 연타하면 캐릭터마다 다른 반응
    c.taps = [];
    say(c, d.tickle.t, 2400);
    if (d.tickle.sp && mode === "wander") doSpecial(c, d.tickle.sp);
    else anim(c, d.tickle.a || "spin", 700);
    fx(c, ["💫", "💦"]);
    return;
  }
  if (mode === "eat") { say(c, pick(d.eat)); anim(c, "squish", 500); fx(c, FX.eat); return; }
  if (mode === "nag") { say(c, pick(d.nag)); anim(c, "shake", 500); return; }
  if (c.busy) return;
  const e = pick(d.touch);
  say(c, e.t, e.sp ? 2800 : 2200);
  if (e.sp) doSpecial(c, e.sp); else anim(c, e.a);
  fx(c, FX.touch);
  // 하치와레가 치이카와·우사기의 말을 통역해 준다
  if (e.tr && !C.hachiware.busy && Math.random() < 0.6) {
    setTimeout(() => { if (mode === "wander") { say(C.hachiware, e.tr, 2600); anim(C.hachiware, "hop", 600); } }, 900);
  }
}

// ---------- 친구들끼리 주고받는 장면
// [누가, 대사, 동작 또는 특수행동, 다음까지 기다릴 ms]
const SCENES = [
  [["usagi", "우라!", "jump"], ["hachiware", "같이 놀자는 거야!?", "hop"], ["chiikawa", "와…!", "hop"]],
  [["chiikawa", "……(펄럭)", "study", 1400], ["hachiware", "풀 뽑기 검정 공부야? 이번엔 꼭 붙을 거야!"], ["chiikawa", "와… (울먹)", "cry"]],
  [["hachiware", "노래할게~ ♪", "guitar", 1200], ["chiikawa", "와아…!", "hop"], ["usagi", "야하!", "jump"], ["momonga", "나도! 나도 노래할래!", "shake"]],
  [["momonga", "나 귀엽지? 칭찬해!", "squish"], ["usagi", "하?", "shake"], ["momonga", "이익…! 칭찬하라고!", "shake"], ["hachiware", "귀여워 귀여워~", "hop"]],
  [["usagi", "우라라라라!", "dash", 1600], ["chiikawa", "에…?!", "tremble"], ["hachiware", "어떻게든 되라~!!", "jump"]],
  [["hachiware", "오늘 저녁은 라멘 먹을까?", "hop"], ["usagi", "야하!!", "jump"], ["chiikawa", "와…!", "squish"], ["momonga", "내 건 곱빼기로!", "jump"]],
];
const NIGHT_SCENE = [["chiikawa", "후아암…", "study", 1200], ["hachiware", "벌써 밤이야~ 일찍 자자!"], ["usagi", "zZ…", "squish"]];
async function runScene(steps) {
  if (mode !== "wander" || sceneLock) return;
  sceneLock = true;
  try {
    for (const [who, text, act, wait = 1500] of steps) {
      if (mode !== "wander") break;
      const c = C[who];
      say(c, text, 2400);
      if (SPECIAL[act]) doSpecial(c, act); else if (act) anim(c, act);
      await sleep(wait);
    }
  } finally { sceneLock = false; }
}
async function photoScene() {
  if (mode !== "wander" || sceneLock) return;
  sceneLock = true;
  haltWander();
  const b = bounds(), y = (b.minY + b.maxY) / 2;
  await Promise.all(chars.map((c, i) => moveTo(c, rowX(i), y, 140)));
  say(C.hachiware, "다들 웃어~ 하나, 둘…", 1800);
  prop(C.hachiware, "📷", 2600);
  await sleep(1600);
  $("flash").classList.add("on");
  setTimeout(() => $("flash").classList.remove("on"), 80);
  say(C.hachiware, "찰칵! 잘 나왔다~!", 2000);
  chars.forEach((c) => { anim(c, "jump", 600); fx(c, ["✨", "📸"]); });
  say(C.usagi, "야하!", 1500);
  await sleep(1800);
  sceneLock = false;
  if (mode === "wander") startWander();
}
function scheduleScenes() {
  setTimeout(() => {
    if (!document.hidden && mode === "wander") {
      if (isNight() && Math.random() < 0.5) runScene(NIGHT_SCENE);
      else if (Math.random() < 0.15) photoScene();
      else runScene(pick(SCENES));
    }
    scheduleScenes();
  }, rand(25000, 45000));
}

// 모몽가: 한동안 안 만져주면 관심을 끌러 앞으로 나온다
async function momongaWantsAttention() {
  const m = C.momonga;
  if (mode !== "wander" || sceneLock || m.busy) return;
  lastMomongaTouch = Date.now();
  m.busy = true;
  const b = bounds();
  await moveTo(m, (b.minX + b.maxX) / 2, b.maxY, 90);
  say(m, pick(["날 봐! 귀여워해 줘!", "왜 나는 안 만져?! 칭찬해!", "싫어싫어! 나도 봐줘!"]), 3000);
  anim(m, "shake", 600);
  await sleep(2000);
  m.busy = false;
}

// ---------- 인사
async function greet(kind = "start") {
  if (mode !== "wander" || sceneLock) return;
  sceneLock = true;
  haltWander();
  const h = new Date().getHours();
  const part = h < 5 ? "늦은 밤이네… 일찍 자자!" : h < 11 ? "좋은 아침!" : h < 17 ? "좋은 오후야!" : h < 23 ? "좋은 저녁!" : "벌써 밤이야~ 일찍 자자!";
  const b = bounds(), cy = (b.minY + b.maxY) / 2;
  chars.forEach((c, i) => {
    if (kind === "start") place(c, rowX(i), b.maxY + 60, 0);
    moveTo(c, rowX(i), cy, 120);
  });
  await sleep(800);
  for (const c of chars) {
    const line = kind === "start" ? pick(c.d.hello) : c.type === "hachiware" ? pick(["다시 왔구나!", "보고 싶었어!"]) : pick(c.d.hello);
    say(c, line, 2600);
    anim(c, c.type === "chiikawa" ? "squish" : "jump", 600);
    fx(c, FX.touch);
    await sleep(450);
  }
  setTimeout(() => say(C.hachiware, part, 2200), 900);
  await sleep(3200);
  sceneLock = false;
  if (mode === "wander") startWander();
}

// ---------- 충전 = 밥
const MEAL_MS = 40000; // 충전기를 오래 꽂아둬도 한 끼만 먹고 다시 논다
let eatLoops = [], eatGag = null, mealTimer = null;
function setPlates() {
  plates.innerHTML = "";
  const y = bounds().maxY + 40;
  chars.forEach((c, i) => {
    const p = document.createElement("div");
    p.className = "plate";
    p.textContent = c.d.food;
    p.style.left = rowX(i) + CHAR_SIZE / 2 + "px";
    p.style.top = y + CHAR_SIZE - 2 + "px";
    plates.appendChild(p);
    c.plateX = rowX(i); c.plateY = y;
  });
}
function startEating() {
  if (mode === "eat" || mode === "nag") return;
  mode = "eat";
  haltWander();
  setPlates();
  plates.classList.add("on");
  say(C.hachiware, "밥 먹자~!", 1800);
  clearTimeout(mealTimer);
  mealTimer = setTimeout(stopEating, MEAL_MS);
  chars.forEach((c) => {
    c.busy = false;
    moveTo(c, c.plateX, c.plateY, c.type === "usagi" ? 200 : 80).then(() => {
      if (mode !== "eat") return;
      c.el.classList.add("eating");
      say(c, pick(c.d.eat), 1500);
      // 우사기는 빨리, 치이카와는 천천히 먹는다
      const loop = setInterval(() => {
        if (mode !== "eat") return clearInterval(loop);
        say(c, pick(c.d.eat), 1500);
        fx(c, c.type === "chiikawa" && Math.random() < 0.4 ? ["💧"] : FX.eat);
      }, c.type === "usagi" ? rand(1500, 2200) : c.type === "chiikawa" ? rand(3500, 4500) : rand(2600, 3400));
      eatLoops.push(loop);
    });
  });
  // 모몽가가 치이카와 밥을 뺏으려는 소동 (충전할 때마다 한 번)
  eatGag = setTimeout(async () => {
    if (mode !== "eat") return;
    const m = C.momonga, ch = C.chiikawa;
    m.el.classList.remove("eating");
    await moveTo(m, ch.plateX + 30, ch.plateY - 10, 120);
    if (mode !== "eat") return;
    say(m, "그거 내놔!", 1800); anim(m, "jump", 600);
    await sleep(900);
    say(ch, "이야…!", 2000); ch.el.classList.add("crying");
    await sleep(1100);
    say(C.hachiware, "모몽가! 그건 치이카와 거라는 거야!", 2400);
    await sleep(1300);
    say(C.usagi, "우라!!", 1500); anim(C.usagi, "jump", 600);
    await sleep(900);
    ch.el.classList.remove("crying");
    if (mode !== "eat") return;
    say(m, "흥…! 알았어", 1600);
    await moveTo(m, m.plateX, m.plateY, 120);
    if (mode === "eat") m.el.classList.add("eating");
  }, 9000);
}
function stopEating() {
  if (mode !== "eat") return;
  clearTimeout(eatGag); clearTimeout(mealTimer);
  eatLoops.forEach(clearInterval); eatLoops = [];
  plates.classList.remove("on");
  chars.forEach((c) => { c.el.classList.remove("eating", "crying"); say(c, pick(c.d.full), 2000); anim(c, "hop", 900); });
  mode = "wander";
  setTimeout(() => { if (mode === "wander") startWander(); }, 1600);
}

// ---------- 오래 쓰면 그만 쓰자고 떼쓰기
const nagLines = ["이제 그만 쓰자~", "눈 좀 쉬게 하자!", "폰 내려놓고 스트레칭 해볼까?", "제발 그만~! 우리랑 놀자!"];
let usedSec = 0, hiddenAt = null, nagCount = 0, nagTimer = null;
let limitSec = 1800;
try { limitSec = parseInt(localStorage.getItem(KEY_LIMIT) || "1800", 10) || 1800; } catch {}
$("limitSel").value = String(limitSec);
$("limitSel").onchange = (e) => { limitSec = parseInt(e.target.value, 10); try { localStorage.setItem(KEY_LIMIT, limitSec); } catch {} };

function nagOnce(c) {
  say(c, pick(c.d.nag), 2600);
  if (c.d.nagSp) { c.el.classList.add("crying"); fx(c, ["💧"]); setTimeout(() => mode === "nag" && c.el.classList.remove("crying"), 2400); }
  else anim(c, c.d.nagA, 700);
}
function startNag() {
  if (mode === "nag") return;
  if (mode === "eat") { clearTimeout(eatGag); clearTimeout(mealTimer); eatLoops.forEach(clearInterval); eatLoops = []; plates.classList.remove("on"); }
  mode = "nag";
  nagCount = 1;
  haltWander();
  const b = bounds(), cy = (b.minY + b.maxY) / 2 + 30;
  $("nagBar").classList.remove("hidden");
  $("nagText").textContent = nagLines[0];
  chars.forEach((c, i) => {
    c.busy = false;
    c.el.classList.remove("eating");
    moveTo(c, rowX(i), cy, 140).then(() => {
      if (mode !== "nag") return;
      c.el.classList.add("nagging");
      setTimeout(() => mode === "nag" && nagOnce(c), i * 600);
    });
  });
  clearInterval(nagTimer);
  nagTimer = setInterval(() => {
    if (mode !== "nag") return clearInterval(nagTimer);
    nagCount = Math.min(nagCount + 1, nagLines.length);
    $("nagText").textContent = nagLines[nagCount - 1];
    const c = pick(chars);
    nagOnce(c);
    fx(c, ["💢", "😣", "💦"]);
  }, 3200);
}
function endNag() {
  clearInterval(nagTimer);
  $("nagBar").classList.add("hidden");
  usedSec = 0; nagCount = 0;
  const thanks = { chiikawa: "와…!", hachiware: "잘 생각했어! 푹 쉬어~", usagi: "야하!", momonga: "흥, 칭찬해 줄게!" };
  chars.forEach((c) => { c.el.classList.remove("nagging", "crying"); say(c, thanks[c.type], 2200); anim(c, "hop", 900); });
  mode = "wander";
  setTimeout(() => { if (mode === "wander") startWander(); }, 1600);
}
$("nagOk").onclick = endNag;

// 1초마다: 시계 + 연속 사용 시간
function tick() {
  const d = new Date();
  $("clockTime").textContent = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  $("clockDate").textContent = d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
  if (document.hidden) return;
  usedSec++;
  $("useChip").textContent = usedSec < 60 ? `📱 ${usedSec}초` : `📱 ${Math.floor(usedSec / 60)}분`;
  if (usedSec >= limitSec && mode !== "nag") startNag();
  if (Date.now() - lastMomongaTouch > 90000) momongaWantsAttention();
}
setInterval(tick, 1000);
tick();

// ---------- 폰을 켰을 때(화면이 다시 보일 때) 인사
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  const away = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0;
  hiddenAt = null;
  if (away > 300) { usedSec = 0; if (mode === "nag") endNag(); } // 5분 이상 쉬면 사용 시간 리셋
  if (away >= 3) greet("back");
});

// ---------- 배터리(충전) 감지
let charging = false, lowWarned = false;
async function lowBatteryScene() {
  await runScene([["chiikawa", "우…", "tremble"], ["hachiware", "배터리가 배고프대! 충전해 달라는 거야!?", "jump", 1800], ["usagi", "하?!", "shake"], ["momonga", "밥 내놔!", "jump"]]);
}
function setBat(b) {
  charging = b.charging;
  $("batChip").textContent = `${charging ? "⚡" : "🔋"} ${Math.round(b.level * 100)}%`;
  $("batInfo").textContent = "충전 감지 사용 중";
  if (charging || b.level > 0.2) lowWarned = false;
  else if (!lowWarned) { lowWarned = true; lowBatteryScene(); }
}
if (navigator.getBattery) {
  navigator.getBattery().then((b) => {
    setBat(b);
    if (b.charging) setTimeout(startEating, 5000);
    b.addEventListener("chargingchange", () => { setBat(b); b.charging ? startEating() : stopEating(); });
    b.addEventListener("levelchange", () => setBat(b));
  });
} else {
  $("batInfo").textContent = "이 브라우저는 충전 감지를 지원하지 않아요 (안드로이드 크롬에서 동작). 위 버튼으로 테스트할 수 있어요.";
}

// ---------- 설정/테스트 패널
$("gearBtn").onclick = () => $("panel").classList.toggle("hidden");
document.querySelectorAll("[data-test]").forEach((b) => (b.onclick = () => {
  const t = b.dataset.test;
  if (t === "hello") greet("back");
  if (t === "nag") startNag();
  if (t === "charge") { charging = true; startEating(); }
  if (t === "unplug") { charging = false; stopEating(); }
  if (t === "scene") runScene(pick(SCENES));
  if (t === "lowbat") lowBatteryScene();
}));

// ---------- 시작
window.addEventListener("resize", () => { if (mode === "eat") { setPlates(); plates.classList.add("on"); } });
(function init() {
  const b = bounds();
  chars.forEach((c) => place(c, rand(b.minX, b.maxX), rand(b.minY, b.maxY), 0));
  greet("start");
  scheduleScenes();
})();
