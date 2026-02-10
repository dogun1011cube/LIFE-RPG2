// LIFE RPG v2.1.0 - 선택형 인트로 + 타워 연출(무한 계단) + 공부=층
const APP_VERSION = "v2.2.1-randomtower-fixstart";

const KEY_STATE = "lifeRpg2_state_v1";
const KEY_BLOCK = "lifeRpg_rewardBlock_v1";
const KEY_PROFILE = "lifeRpg2_profile_v1";

// (인트로 이미지는 index.html에서 각 Scene에 직접 연결)

// ---------- DOM
const $intro = document.getElementById("intro");
const $introScene1 = document.getElementById("introScene1");
const $introScene2 = document.getElementById("introScene2");
const $introScene3 = document.getElementById("introScene3");
const $enterCastleBtn = document.getElementById("enterCastleBtn");
const $slimeDialog = document.getElementById("slimeDialog");
const $studyStartBtn = document.getElementById("studyStartBtn");

const $game = document.getElementById("game");

const $profileName = document.getElementById("profileName");
const $dayText = document.getElementById("dayText");
const $levelText = document.getElementById("levelText");
const $xpText = document.getElementById("xpText");
const $goldText = document.getElementById("goldText");
const $floorText = document.getElementById("floorText");
const $totalText = document.getElementById("totalText");

const $towerFloorBig = document.getElementById("towerFloorBig");
const $towerBarFill = document.getElementById("towerBarFill");
const $toNextFloor = document.getElementById("toNextFloor");

const $towerStairs = document.getElementById("towerStairs");
const $bgStairs = document.getElementById("bgStairs");

const $subjectSelect = document.getElementById("subjectSelect");
const $addSubjectOpenBtn = document.getElementById("addSubjectOpenBtn");
const $addSubjectRow = document.getElementById("addSubjectRow");
const $newSubjectInput = document.getElementById("newSubjectInput");
const $addSubjectBtn = document.getElementById("addSubjectBtn");

const $hoursInput = document.getElementById("hoursInput");
const $minutesInput = document.getElementById("minutesInput");
const $secondsInput = document.getElementById("secondsInput");
const $addStudyBtn = document.getElementById("addStudyBtn");
const $wakeBtn = document.getElementById("wakeBtn");
const $endDayBtn = document.getElementById("endDayBtn");

const $rewardUrl = document.getElementById("rewardUrl");
const $rewardStatus = document.getElementById("rewardStatus");
const $shopItems = Array.from(document.querySelectorAll(".shopItem"));

const $log = document.getElementById("log");

// edit
const $editOverlay = document.getElementById("editOverlay");
const $closeEditBtn = document.getElementById("closeEditBtn");
const $editSubjectSelect = document.getElementById("editSubjectSelect");
const $editAddSubjectOpenBtn = document.getElementById("editAddSubjectOpenBtn");
const $editAddSubjectRow = document.getElementById("editAddSubjectRow");
const $editNewSubjectInput = document.getElementById("editNewSubjectInput");
const $editAddSubjectBtn = document.getElementById("editAddSubjectBtn");
const $editHours = document.getElementById("editHours");
const $editMinutes = document.getElementById("editMinutes");
const $editSeconds = document.getElementById("editSeconds");
const $saveEditBtn = document.getElementById("saveEditBtn");
const $deleteEditBtn = document.getElementById("deleteEditBtn");
let editingId = null;

// ---------- utils
function qs(n){ return document.querySelector(n); }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function pad2(n){ return String(n).padStart(2, "0"); }
function fmtHMS(sec){
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
function secondsFromHMS(h, m, s){
  return Math.max(0, Math.floor(h*3600 + m*60 + s));
}
function nowStamp(){
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function toInt(v){ 
  if(v === "" || v === null || typeof v === "undefined") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
function ensureZeroInputs(){
  [$hoursInput,$minutesInput,$secondsInput,$editHours,$editMinutes,$editSeconds].forEach(el=>{
    if(!el) return;
    if(el.value === "" || el.value === null || typeof el.value === "undefined") el.value = "0";
    const n = Number(el.value);
    if(!Number.isFinite(n) || n < 0) el.value = "0";
  });
}
function genId(){
  return "s" + Math.random().toString(16).slice(2,10) + Date.now().toString(16);
}
function calcLevel(xp){ return Math.floor(Math.max(0, xp)/1000) + 1; }
function gainsFromSeconds(seconds){
  const minutes = Math.floor(seconds/60);
  return {
    minutes,
    xp: minutes,
    gold: Math.floor(minutes/10),
    floors: Math.floor(minutes/10),
  };
}
function openOverlay(){ $editOverlay.classList.remove("hidden"); }
function closeOverlay(){ $editOverlay.classList.add("hidden"); editingId = null; }

// ---------- state
function defaultState(){
  return {
    profile: "default",
    day: 1,
    dayOpen: true,
    totalSeconds: 0,
    xp: 0,
    gold: 0,
    floor: 0,
    subjectsList: ["화학2","물리1","수학","국어","영어"],
    subjectsSeconds: {},
    sessions: [], // {id, kind:'study'|'shop', day, time, subject, seconds, xp, gold, floors, meta}
    logs: [],
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(KEY_STATE);
    if(!raw) return defaultState();
    const s = JSON.parse(raw);
    return Object.assign(defaultState(), s);
  }catch{
    return defaultState();
  }
}
function saveState(){ localStorage.setItem(KEY_STATE, JSON.stringify(state)); }

function resetStateToFresh(){
  // "내 계정은 복구하지 말고 처음부터 시작"
  localStorage.removeItem(KEY_STATE);
  localStorage.removeItem(KEY_BLOCK);
  state = defaultState();
  saveState();
}

let state = loadState();

// If user wants fresh start ALWAYS for this build, uncomment next line
// resetStateToFresh();

// ---------- intro (선택형)
let introAutoTimer = null;

function showIntroScene(n){
  [$introScene1,$introScene2,$introScene3].forEach((el, idx)=>{
    if(!el) return;
    el.classList.toggle("active", idx === (n-1));
  });

  // Scene 2: 잠깐 보여주고 Scene 3로 자동
  if(introAutoTimer){ clearTimeout(introAutoTimer); introAutoTimer = null; }
  if(n === 2){
    // 성 내부 장면은 너무 빠르면 어색해서 여유를 둠
    introAutoTimer = setTimeout(()=>showIntroScene(3), 2800);
  }
}

function runSlimeDialog(){
  if(!$slimeDialog) return;
  $studyStartBtn.classList.add("hidden");

  // 요청 대사 3단계
  $slimeDialog.textContent = "이 성을 올라가기 위해서는 반드시 나를 이겨야만 한닷!!!";
  setTimeout(()=>{ $slimeDialog.textContent = "나를 이길 수 있는 방법은 단 하나밖에 없지 (후훗)"; }, 2300);
  setTimeout(()=>{ $slimeDialog.textContent = "그것은 바로 공부닷!!!"; }, 5000);
  setTimeout(()=>{ $studyStartBtn.classList.remove("hidden"); }, 7000);
}

function enterGame(){
  $intro.classList.add("hidden");
  $game.classList.remove("hidden");
  if(location.hash !== "#game") history.replaceState(null, "", "#game");

  // ✅ 시작 안 되는 문제 방지: 화면이 열린 뒤(다음 프레임)에 배경 시작
  requestAnimationFrame(()=>{
    startTowerCanvas();   // 랜덤 캔버스 타워(없으면 조용히 스킵)
    renderAll();
  });
}

$enterCastleBtn?.addEventListener("click", ()=>{
  showIntroScene(2);
});

// Scene3가 보이면 대사 시작
const introObserver = new MutationObserver(()=>{
  if($introScene3.classList.contains("active")) runSlimeDialog();
});
if($introScene3) introObserver.observe($introScene3, {attributes:true, attributeFilter:["class"]});

$studyStartBtn?.addEventListener("click", ()=>{
  enterGame();
});

// 기본은 항상 인트로부터 시작 (GitHub Pages에서 #game가 남아있어도 인트로가 안 건너뛰게)
// 필요하면 나중에 "skipIntro=1" 같은 옵션으로만 스킵하도록 확장 가능
if(location.hash === "#game"){
  // 해시가 남아있어서 인트로가 안 보이는 문제 방지
  history.replaceState(null, "", location.pathname + location.search);
}
showIntroScene(1);

// ---------- tower animation (JS)
let stairsAnimRaf = null;
let stairsOffset = 0;
function startTowerAnim(){
  if(!$towerStairs && !$bgStairs) return;
  if(stairsAnimRaf) return;
  const baseSpeed = 22; // px/sec
  let last = performance.now();
  const tick = (t)=>{
    const dt = (t - last) / 1000;
    last = t;
    // Floor가 높아질수록 조금 더 빨라짐
    const speed = baseSpeed + Math.min(18, Math.floor(state.floor/20));
    stairsOffset = (stairsOffset + speed*dt) % 20000;
    $towerStairs && ($towerStairs.style.backgroundPositionY = `${stairsOffset}px`);
    $bgStairs && ($bgStairs.style.backgroundPositionY = `${stairsOffset}px`);
    stairsAnimRaf = requestAnimationFrame(tick);
  };
  stairsAnimRaf = requestAnimationFrame(tick);
}
function stopTowerAnim(){
  if(stairsAnimRaf){ cancelAnimationFrame(stairsAnimRaf); stairsAnimRaf = null; }


// ---------- tower canvas (랜덤 생성: 좌/우 성벽 랜덤 + 가운데 계단 무한 스크롤)
let towerCanvasRaf = null;
let towerScrollY = 0;
let towerWalls = null;
let towerSprite = null;
let towerAtlas = null;

const TOWER = {
  TILE: 128,
  SRC: "assets/tower_tiles.png",
  COLORKEY_ON: true,      // 검정 배경이면 true
  COLORKEY: [0,0,0],
  TOL: 18,
  WALL_PARTS: [
    // ✅ 예시 좌표(타일 시트에 맞춰서 나중에 조정하면 됨)
    {sx:0,   sy:0},
    {sx:128, sy:0},
    {sx:256, sy:0},
    {sx:384, sy:0},
  ],
  STAIRS: {sx:512, sy:256},
  SPEED_PX_PER_SEC: 22,
};

function towerMakeColorKeyTransparent(img, key=[0,0,0], tolerance=10){
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img,0,0);
  const imageData = ctx.getImageData(0,0,c.width,c.height);
  const d = imageData.data;
  for(let i=0;i<d.length;i+=4){
    const r=d[i], g=d[i+1], b=d[i+2];
    if (Math.abs(r-key[0])<=tolerance && Math.abs(g-key[1])<=tolerance && Math.abs(b-key[2])<=tolerance){
      d[i+3]=0;
    }
  }
  ctx.putImageData(imageData,0,0);
  return c;
}
function towerRand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function towerResize(canvas){
  canvas.width = Math.floor(window.innerWidth);
  canvas.height = Math.floor(window.innerHeight);
}

function towerGenerateWalls(canvas){
  const rows = Math.ceil(canvas.height / TOWER.TILE) + 2;
  const left = [];
  const right = [];
  for(let i=0;i<rows;i++){
    left.push(towerRand(TOWER.WALL_PARTS));
    right.push(towerRand(TOWER.WALL_PARTS));
  }
  towerWalls = { rows, left, right };
}

function towerDraw(ctx, canvas){
  if(!towerSprite || !towerWalls) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const TILE = TOWER.TILE;
  const wallCols = 2;
  const centerX = wallCols * TILE;
  const centerW = canvas.width - wallCols*2*TILE;
  const stairX = centerX + Math.floor((centerW - TILE)/2);

  const src = towerAtlas || towerSprite;

  // 성벽(고정)
  for(let r=0;r<towerWalls.rows;r++){
    const y = r*TILE;
    for(let c=0;c<wallCols;c++){
      const L = towerWalls.left[r];
      const R = towerWalls.right[r];
      ctx.drawImage(src, L.sx, L.sy, TILE, TILE, c*TILE, y, TILE, TILE);
      ctx.drawImage(src, R.sx, R.sy, TILE, TILE, canvas.width - (c+1)*TILE, y, TILE, TILE);
    }
  }

  // 계단(무한 스크롤)
  for(let r=0;r<towerWalls.rows;r++){
    const y = ((r*TILE + towerScrollY) % (towerWalls.rows*TILE)) - TILE;
    ctx.drawImage(src, TOWER.STAIRS.sx, TOWER.STAIRS.sy, TILE, TILE, stairX, y, TILE, TILE);
  }
}

function startTowerCanvas(){
  const canvas = document.getElementById("towerCanvas");
  if(!canvas) return; // ✅ canvas가 없으면 조용히 종료(시작 안 되는 문제 방지)
  const ctx = canvas.getContext("2d");

  // 기존 CSS 배경을 숨겨서 '배경이 그대로' 문제 해결
  const oldBg = document.getElementById("towerBg");
  if(oldBg) oldBg.style.display = "none";

  // 이미 돌고 있으면 중복 실행 방지
  if(towerCanvasRaf){ cancelAnimationFrame(towerCanvasRaf); towerCanvasRaf = null; }
  towerScrollY = 0;
  towerWalls = null;

  towerResize(canvas);
  window.addEventListener("resize", ()=>towerResize(canvas), { passive:true });

  towerSprite = new Image();
  towerSprite.src = TOWER.SRC;

  towerSprite.onload = ()=>{
    towerAtlas = TOWER.COLORKEY_ON ? towerMakeColorKeyTransparent(towerSprite, TOWER.COLORKEY, TOWER.TOL) : null;
    towerGenerateWalls(canvas);

    let last = performance.now();
    const tick = (t)=>{
      const dt = (t-last)/1000; last = t;
      const speed = TOWER.SPEED_PX_PER_SEC + Math.min(18, Math.floor(state.floor/20));
      towerScrollY = (towerScrollY + speed*dt) % 1000000;
      towerDraw(ctx, canvas);
      towerCanvasRaf = requestAnimationFrame(tick);
    };
    towerCanvasRaf = requestAnimationFrame(tick);
  };

  towerSprite.onerror = ()=>{
    // 타일 시트 없으면 게임이 멈추면 안 됨: 경고만 띄우고 종료
    console.warn("[LIFE-RPG] assets/tower_tiles.png 를 못 찾았어. 랜덤 타워 배경을 끄고 진행해.");
    // 다시 보이도록 원하면 oldBg를 복구(선택)
    // if(oldBg) oldBg.style.display = "";
  };
}

}

// ---------- game logic
function pushLog(title, msg){
  state.logs.unshift({title, msg, time: nowStamp()});
  state.logs = state.logs.slice(0, 200);
}

function renderSubjects(){
  $subjectSelect.innerHTML = state.subjectsList.map(s=>`<option value="${s}">${s}</option>`).join("");
  $editSubjectSelect.innerHTML = state.subjectsList.map(s=>`<option value="${s}">${s}</option>`).join("");
}

function renderStats(){
  $profileName.textContent = state.profile || "default";
  state.level = calcLevel(state.xp);

  $dayText.textContent = String(state.day);
  $levelText.textContent = String(state.level);
  $xpText.textContent = String(state.xp);
  $goldText.textContent = `${state.gold}G`;
  $floorText.textContent = `${state.floor}F`;
  $totalText.textContent = fmtHMS(state.totalSeconds);

  $towerFloorBig.textContent = String(state.floor);
  // progress to next floor: based on minutes within the current 10-min block
  const minutes = Math.floor(state.totalSeconds/60);
  const mod = minutes % 10;
  $toNextFloor.textContent = String(mod);
  $towerBarFill.style.width = `${(mod/10)*100}%`;
}

function renderLog(){
  const items = state.sessions.slice(0, 25).map(s=>{
    const tag = s.kind === "shop" ? "🛒" : "📌";
    const sub = s.kind === "shop" ? (s.meta?.name || "상점") : s.subject;
    const msg = s.kind === "shop"
      ? `${sub} / -${s.meta?.cost || 0}G / 보상 ${s.meta?.min || 0}분`
      : `${sub} / ${fmtHMS(s.seconds)} → +XP ${s.xp} / +G ${s.gold} / +${s.floors}F`;

    const help = s.kind === "shop" ? "상점 기록(삭제 불가)" : "클릭해서 수정/삭제";
    return `
      <div class="logItem ${s.kind === "study" ? "clickable" : ""}" data-id="${s.id}">
        <div class="t">${tag} ${msg}</div>
        <div class="m" style="opacity:.65">${help} · Day ${s.day} · ${s.time}</div>
      </div>
    `;
  }).join("") || `<div class="logItem"><div class="m" style="opacity:.7">기록이 없어</div></div>`;

  $log.innerHTML = `
    <div class="logItem" style="border-style:dashed; opacity:.95;">
      <div class="t">🧾 최근 기록</div>
      <div class="m" style="opacity:.7;">${APP_VERSION}</div>
    </div>
    ${items}
  `;

  Array.from($log.querySelectorAll("[data-id]")).forEach(el=>{
    const id = el.getAttribute("data-id");
    const sess = state.sessions.find(x=>x.id===id);
    if(sess && sess.kind==="study"){
      el.addEventListener("click", ()=>openEdit(id));
    }
  });
}

function renderRewardStatus(){
  const b = getBlock();
  if(b && Date.now() < b.until){
    const left = Math.ceil((b.until - Date.now())/1000);
    $rewardStatus.textContent = `보상 진행 중: ${b.name} · 남은 ${left}초`;
  }else{
    $rewardStatus.textContent = "보상 없음";
  }
}

function renderAll(){
  renderSubjects();
  renderStats();
  renderLog();
  renderRewardStatus();
}

function addStudy(){
  ensureZeroInputs();
  const subject = $subjectSelect.value || "미분류";
  const h = toInt($hoursInput.value);
  const m = toInt($minutesInput.value);
  const s = toInt($secondsInput.value);
  const seconds = secondsFromHMS(h,m,s);
  if(seconds <= 0) return alert("시간을 입력해줘.");

  const g = gainsFromSeconds(seconds);
  if(g.minutes <= 0) return alert("1분 이상부터 XP가 쌓여.");

  state.totalSeconds += seconds;
  state.xp += g.xp;
  state.gold += g.gold;
  state.floor += g.floors;

  state.subjectsSeconds[subject] = (state.subjectsSeconds[subject] || 0) + seconds;

  const sess = {id: genId(), kind:"study", day: state.day, time: nowStamp(), subject, seconds, xp:g.xp, gold:g.gold, floors:g.floors};
  state.sessions.unshift(sess);

  pushLog("✅ 공부", `${subject} ${fmtHMS(seconds)} 기록`);
  saveState();
  $hoursInput.value="0"; $minutesInput.value="0"; $secondsInput.value="0";
  renderAll();
}

function wakeNextDay(){
  state.day += 1;
  state.dayOpen = true;
  pushLog("🌅 Day 시작", `Day ${state.day}`);
  saveState();
  renderAll();
}

function endDay(){
  state.dayOpen = false;
  pushLog("🌙 Day 마감", `Day ${state.day} 마감`);
  saveState();
  renderAll();
}

// ---------- edit
function openEdit(id){
  const sess = state.sessions.find(s=>s.id===id);
  if(!sess) return;
  if(sess.kind !== "study") return;

  editingId = id;
  renderSubjects();
  $editSubjectSelect.value = sess.subject;

  const h = Math.floor(sess.seconds/3600);
  const m = Math.floor((sess.seconds%3600)/60);
  const s = sess.seconds%60;
  $editHours.value = String(h);
  $editMinutes.value = String(m);
  $editSeconds.value = String(s);

  $editAddSubjectRow.classList.add("hidden");
  openOverlay();
}

function saveEdit(){
  ensureZeroInputs();
  const sess = state.sessions.find(s=>s.id===editingId);
  if(!sess || sess.kind !== "study") return;

  const newSubject = $editSubjectSelect.value || "미분류";
  const nh = toInt($editHours.value);
  const nm = toInt($editMinutes.value);
  const ns = toInt($editSeconds.value);
  const newSeconds = secondsFromHMS(nh,nm,ns);
  if(newSeconds <= 0) return alert("시간은 1초 이상");

  const oldG = gainsFromSeconds(sess.seconds);
  const newG = gainsFromSeconds(newSeconds);
  if(newG.minutes <= 0) return alert("1분 이상부터 XP가 쌓여.");

  // rollback old
  state.totalSeconds = Math.max(0, state.totalSeconds - sess.seconds);
  state.xp = Math.max(0, state.xp - oldG.xp);
  state.gold = Math.max(0, state.gold - oldG.gold);
  state.floor = Math.max(0, state.floor - oldG.floors);
  state.subjectsSeconds[sess.subject] = Math.max(0, (state.subjectsSeconds[sess.subject]||0) - sess.seconds);

  // apply new
  state.totalSeconds += newSeconds;
  state.xp += newG.xp;
  state.gold += newG.gold;
  state.floor += newG.floors;
  state.subjectsSeconds[newSubject] = (state.subjectsSeconds[newSubject]||0) + newSeconds;

  sess.subject = newSubject;
  sess.seconds = newSeconds;
  sess.xp = newG.xp;
  sess.gold = newG.gold;
  sess.floors = newG.floors;

  pushLog("✏️ 수정", `${newSubject} ${fmtHMS(newSeconds)}`);
  saveState();
  closeOverlay();
  renderAll();
}

function deleteEdit(){
  const idx = state.sessions.findIndex(s=>s.id===editingId);
  if(idx === -1) return;
  const sess = state.sessions[idx];
  if(sess.kind !== "study") return alert("상점 기록은 삭제할 수 없어.");

  if(!confirm("이 기록을 삭제할까요? (XP/Gold/층도 같이 감소)")) return;

  const g = gainsFromSeconds(sess.seconds);
  state.totalSeconds = Math.max(0, state.totalSeconds - sess.seconds);
  state.xp = Math.max(0, state.xp - g.xp);
  state.gold = Math.max(0, state.gold - g.gold);
  state.floor = Math.max(0, state.floor - g.floors);
  state.subjectsSeconds[sess.subject] = Math.max(0, (state.subjectsSeconds[sess.subject]||0) - sess.seconds);

  state.sessions.splice(idx, 1);
  pushLog("🗑️ 삭제", `${sess.subject} ${fmtHMS(sess.seconds)}`);
  saveState();
  closeOverlay();
  renderAll();
}

// ---------- subjects
$addSubjectOpenBtn.addEventListener("click", ()=>{
  $addSubjectRow.classList.toggle("hidden");
  if(!$addSubjectRow.classList.contains("hidden")) $newSubjectInput.focus();
});
$addSubjectBtn.addEventListener("click", ()=>{
  const name = ($newSubjectInput.value || "").trim();
  if(!name) return alert("과목 이름을 입력해줘.");
  if(state.subjectsList.includes(name)) return alert("이미 있는 과목이야.");
  state.subjectsList.unshift(name);
  state.subjectsSeconds[name] = state.subjectsSeconds[name] || 0;
  $newSubjectInput.value = "";
  $addSubjectRow.classList.add("hidden");
  saveState();
  renderSubjects();
  $subjectSelect.value = name;
});

$editAddSubjectOpenBtn.addEventListener("click", ()=>{
  $editAddSubjectRow.classList.toggle("hidden");
  if(!$editAddSubjectRow.classList.contains("hidden")) $editNewSubjectInput.focus();
});
$editAddSubjectBtn.addEventListener("click", ()=>{
  const name = ($editNewSubjectInput.value || "").trim();
  if(!name) return alert("과목 이름을 입력해줘.");
  if(state.subjectsList.includes(name)) return alert("이미 있는 과목이야.");
  state.subjectsList.unshift(name);
  state.subjectsSeconds[name] = state.subjectsSeconds[name] || 0;
  $editNewSubjectInput.value = "";
  $editAddSubjectRow.classList.add("hidden");
  saveState();
  renderSubjects();
  $editSubjectSelect.value = name;
});

// ---------- shop + blocking
function normalizeUrl(u){
  u = (u||"").trim();
  if(!u) return "";
  if(!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}
function setBlock(name, minutes){
  const until = Date.now() + minutes*60*1000;
  const obj = {until, name};
  localStorage.setItem(KEY_BLOCK, JSON.stringify(obj));
}
function getBlock(){
  try{ return JSON.parse(localStorage.getItem(KEY_BLOCK) || "null"); }catch{ return null; }
}
function clearBlock(){ localStorage.removeItem(KEY_BLOCK); }

function startRewardFlow(name, cost, minutes){
  if(state.gold < cost) return alert("골드가 부족해.");
  const url = normalizeUrl($rewardUrl.value);
  if(!url) return alert("이동할 사이트를 먼저 입력해줘.");

  state.gold -= cost;

  // log session (non-deletable)
  const sess = {id: genId(), kind:"shop", day: state.day, time: nowStamp(), meta:{name, cost, min: minutes, url}};
  state.sessions.unshift(sess);
  pushLog("🛒 상점 구매", `${name} (-${cost}G)`);
  saveState();
  renderAll();

  // start block timer in THIS TAB. We'll open the reward in new tab.
  setBlock(name, minutes);

  // attempt open
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if(!w){
    alert("팝업이 차단됐어. 브라우저에서 이 사이트를 허용 목록에 추가해줘.");
  }

  alert(`보상 시작! ${minutes}분 뒤에 이 탭은 차단 페이지로 이동해.`);
}

function tickBlock(){
  const b = getBlock();
  if(!b) return;
  if(Date.now() >= b.until){
    // time over -> redirect to blocked
    clearBlock();
    location.href = "./blocked.html";
    return;
  }
  renderRewardStatus();
}
setInterval(tickBlock, 500);

// Shop click handlers
$shopItems.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const cost = toInt(btn.getAttribute("data-cost"));
    const min = toInt(btn.getAttribute("data-min"));
    const name = btn.querySelector(".name")?.textContent?.trim() || "보상";
    startRewardFlow(name, cost, min);
  });
});

// ---------- wire game controls
$addStudyBtn.addEventListener("click", addStudy);
$wakeBtn.addEventListener("click", wakeNextDay);
$endDayBtn.addEventListener("click", endDay);

$closeEditBtn.addEventListener("click", closeOverlay);
$saveEditBtn.addEventListener("click", saveEdit);
$deleteEditBtn.addEventListener("click", deleteEdit);

[$hoursInput,$minutesInput,$secondsInput,$editHours,$editMinutes,$editSeconds].forEach(el=>{
  el.addEventListener("blur", ensureZeroInputs);
});

// ---------- init
// Reset to fresh start ONCE when build first runs, then remember
const ONCE_KEY = "lifeRpg2_fresh_once_v1";
if(!localStorage.getItem(ONCE_KEY)){
  resetStateToFresh();
  localStorage.setItem(ONCE_KEY, "1");
}
renderAll();
