/* LIFE RPG v2.0 – Intro + Tower + Shop
   - Intro: 3 images in order (3 sec each), each with a Skip button (go next)
   - Game: study tracking + tower floors + profiles + shop reward timer + blocked redirect
*/
const APP_VERSION = "v2.0 INTRO+TOWER+SHOP";

/* ---------- Keys ---------- */
const KEY_PROFILE_LIST = "lifeRpg_profiles_v2";
const KEY_ACTIVE_PROFILE = "lifeRpg_activeProfile_v2";
const KEY_REWARD = "lifeRpg_reward_v1"; // keep stable for blocked.html compatibility
function stateKey(profile){ return `lifeRpg_state_${profile}_v2`; }

/* ---------- Intro ---------- */
const introEl = document.getElementById("intro");
const introBg = document.getElementById("introBg");
const skipBtn = document.getElementById("skipBtn");
const enterBtn = document.getElementById("enterBtn");
const dots = Array.from(document.querySelectorAll(".dot"));

const INTRO_IMAGES = ["assets/intro1.png","assets/intro2.png","assets/intro3.png"];
let introIndex = 0;
let introTimer = null;

function setDot(i){
  dots.forEach(d => d.classList.toggle("on", Number(d.dataset.dot) === i+1));
}
function showIntro(i){
  introIndex = Math.max(0, Math.min(2, i));
  introBg.style.backgroundImage = `url('${INTRO_IMAGES[introIndex]}')`;
  setDot(introIndex);
  enterBtn.classList.toggle("hidden", introIndex !== 2);
}
function nextIntro(){
  if(introIndex < 2){
    showIntro(introIndex+1);
    restartIntroTimer();
  }else{
    startGame();
  }
}
function restartIntroTimer(){
  if(introTimer) clearInterval(introTimer);
  let t = 3;
  introTimer = setInterval(() => {
    t -= 1;
    if(t <= 0) nextIntro();
  }, 1000);
}
function preloadIntro(){
  INTRO_IMAGES.forEach(src => { const img = new Image(); img.src = src; });
  const s = new Image(); s.src = "assets/slime.png";
}

/* ---------- Game state ---------- */
const gameEl = document.getElementById("game");

const $dayText = document.getElementById("dayText");
const $levelText = document.getElementById("levelText");
const $xpText = document.getElementById("xpText");
const $goldText = document.getElementById("goldText");
const $floorText = document.getElementById("floorText");
const $floorText2 = document.getElementById("floorText2");
const $battleText = document.getElementById("battleText");
const $totalText = document.getElementById("totalText");
const $lastDrop = document.getElementById("lastDrop");

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
const $resetBtn = document.getElementById("resetBtn");

const $log = document.getElementById("log");

/* Overlays */
const $profileBtn = document.getElementById("profileBtn");
const $recordsBtn = document.getElementById("recordsBtn");
const $shopBtn = document.getElementById("shopBtn");

const $profileOverlay = document.getElementById("profileOverlay");
const $closeProfileBtn = document.getElementById("closeProfileBtn");
const $profileSelect = document.getElementById("profileSelect");
const $newProfileBtn = document.getElementById("newProfileBtn");
const $newProfileRow = document.getElementById("newProfileRow");
const $newProfileInput = document.getElementById("newProfileInput");
const $createProfileBtn = document.getElementById("createProfileBtn");
const $exportBtn = document.getElementById("exportBtn");
const $importBtn = document.getElementById("importBtn");
const $importFile = document.getElementById("importFile");

const $recordsOverlay = document.getElementById("recordsOverlay");
const $closeRecordsBtn = document.getElementById("closeRecordsBtn");
const $recordsList = document.getElementById("recordsList");
const $recordsSearch = document.getElementById("recordsSearch");
const $recordsSelectAll = document.getElementById("recordsSelectAll");
const $deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

const $shopOverlay = document.getElementById("shopOverlay");
const $closeShopBtn = document.getElementById("closeShopBtn");
const $rewardUrl = document.getElementById("rewardUrl");
const shopItems = Array.from(document.querySelectorAll(".shopItem"));

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
let editingSessionId = null;

/* Reward bar */
const $rewardBar = document.getElementById("rewardBar");
const $rewardRemaining = document.getElementById("rewardRemaining");
const $openRewardBtn = document.getElementById("openRewardBtn");
const $backToGameBtn = document.getElementById("backToGameBtn");

/* ---------- Helpers ---------- */
function openOverlay(el){ if(!el) return; el.classList.remove("hidden"); }
function closeOverlay(el){ if(!el) return; el.classList.add("hidden"); }

function nowStamp(){
  const d = new Date();
  const p = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function formatHMS(total){
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  const ss = s%60;
  const p = n => String(n).padStart(2,"0");
  return `${p(h)}:${p(m)}:${p(ss)}`;
}
function formatMMSS(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(s/60);
  const ss = s%60;
  const p = n => String(n).padStart(2,"0");
  return `${p(m)}:${p(ss)}`;
}
function ensureZero(el){
  if(!el) return;
  if(el.value === "" || el.value === null || typeof el.value === "undefined") el.value = "0";
  const n = Number(el.value);
  if(!Number.isFinite(n) || n < 0) el.value = "0";
}
function genId(){
  return "s" + Math.random().toString(16).slice(2,10) + Date.now().toString(16);
}
function calcLevel(xp){
  return Math.floor(Math.max(0, xp)/1000) + 1;
}
function computeGainsFromSeconds(seconds){
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const xpGain = minutes;                 // 1분=1XP
  const goldGain = Math.floor(minutes/10);// 10분=1G
  const floorsUp = Math.floor(minutes/10);// 10분=+1F
  return { minutes, xpGain, goldGain, floorsUp };
}
function secondsToHMS(total){
  const s = Math.max(0, Math.floor(total));
  return { h: Math.floor(s/3600), m: Math.floor((s%3600)/60), s: s%60 };
}
function safeUrl(url){
  const u = (url||"").trim();
  if(!u) return "";
  if(/^https?:\/\//i.test(u)) return u;
  // allow domain-only input
  return "https://" + u;
}
function setNote(t){ if($lastDrop) $lastDrop.textContent = t; }

/* ---------- Profiles & State ---------- */
function getProfiles(){
  try{ return JSON.parse(localStorage.getItem(KEY_PROFILE_LIST) || "[]"); }catch{ return []; }
}
function setProfiles(list){ localStorage.setItem(KEY_PROFILE_LIST, JSON.stringify(list)); }
function getActiveProfile(){ return localStorage.getItem(KEY_ACTIVE_PROFILE) || "default"; }
function setActiveProfile(name){ localStorage.setItem(KEY_ACTIVE_PROFILE, name); }

function defaultState(){
  return {
    day: 1,
    totalSeconds: 0,
    xp: 0,
    gold: 0,
    floor: 0,
    battleCount: 0,
    level: 1,
    dayClosed: false,
    dayClosedAt: null,
    subjects: {},
    subjectsList: ["화학2","물리1","수학","국어","영어"],
    sessions: [], // {id,kind, time, day, subject, seconds, xpGain, goldGain, floorsUp, ...}
    logs: []
  };
}

let profile = getActiveProfile();
let state = loadState(profile);

function loadState(p){
  const k = stateKey(p);
  try{
    const raw = localStorage.getItem(k);
    if(!raw){
      const s = defaultState();
      persist(p, s);
      return s;
    }
    const s = JSON.parse(raw);
    // harden
    if(typeof s.day !== "number") s.day = 1;
    if(typeof s.totalSeconds !== "number") s.totalSeconds = 0;
    if(typeof s.xp !== "number") s.xp = 0;
    if(typeof s.gold !== "number") s.gold = 0;
    if(typeof s.floor !== "number") s.floor = 0;
    if(typeof s.battleCount !== "number") s.battleCount = 0;
    s.dayClosed = !!s.dayClosed;
    s.dayClosedAt = s.dayClosedAt || null;
    s.subjects = (s.subjects && typeof s.subjects === "object") ? s.subjects : {};
    s.subjectsList = Array.isArray(s.subjectsList) ? s.subjectsList : ["화학2","물리1","수학","국어","영어"];
    s.sessions = Array.isArray(s.sessions) ? s.sessions : [];
    s.logs = Array.isArray(s.logs) ? s.logs : [];
    s.level = calcLevel(s.xp);
    return s;
  }catch{
    const s = defaultState();
    persist(p, s);
    return s;
  }
}
function persist(p=profile, s=state){
  localStorage.setItem(stateKey(p), JSON.stringify(s));
}
function pushLog(title, msg){
  state.logs.unshift({ title, msg, time: nowStamp() });
  state.logs = state.logs.slice(0, 200);
}

/* ---------- Subjects UI ---------- */
function renderSubjects(){
  const cur = $subjectSelect.value;
  $subjectSelect.innerHTML = state.subjectsList.map(s => `<option value="${s}">${s}</option>`).join("");
  if(cur && state.subjectsList.includes(cur)) $subjectSelect.value = cur;

  renderSubjectsInto($editSubjectSelect);
}
function renderSubjectsInto(sel){
  if(!sel) return;
  const cur = sel.value;
  sel.innerHTML = state.subjectsList.map(s => `<option value="${s}">${s}</option>`).join("");
  if(cur && state.subjectsList.includes(cur)) sel.value = cur;
}

/* ---------- Stats UI ---------- */
function renderStats(){
  $dayText.textContent = String(state.day);
  $xpText.textContent = String(state.xp);
  $goldText.textContent = `${state.gold}G`;
  $floorText.textContent = `${state.floor}F`;
  $floorText2.textContent = String(state.floor);
  $battleText.textContent = String(state.battleCount);
  state.level = calcLevel(state.xp);
  $levelText.textContent = String(state.level);
  $totalText.textContent = formatHMS(state.totalSeconds);
}

/* ---------- Sessions ---------- */
function addStudySession(subject, seconds){
  if(state.dayClosed){
    return { ok:false, error:"오늘은 이미 마감했어. 내일(“일어났어”)부터 기록해줘." };
  }
  if(seconds <= 0) return { ok:false, error:"시간은 1초 이상이어야 해." };

  const g = computeGainsFromSeconds(seconds);
  // allow seconds-only records but warn
  if(g.minutes <= 0) return { ok:false, error:"1분 이상부터 XP/Gold/층이 쌓여. (초만 입력하면 0)" };

  state.totalSeconds += seconds;
  state.xp += g.xpGain;
  state.gold += g.goldGain;
  state.floor += g.floorsUp;
  state.battleCount += 1;
  state.subjects[subject] = (state.subjects[subject] || 0) + seconds;

  const sess = {
    id: genId(),
    kind: "study",
    time: nowStamp(),
    day: state.day,
    subject,
    seconds,
    xpGain: g.xpGain,
    goldGain: g.goldGain,
    floorsUp: g.floorsUp
  };
  state.sessions.unshift(sess);
  pushLog("✅ 공부 기록", `${subject} / ${formatHMS(seconds)} → +XP ${g.xpGain} / +G ${g.goldGain} / +${g.floorsUp}F`);
  return { ok:true, session: sess };
}

function deleteSession(sessionId){
  const i = state.sessions.findIndex(s => s.id === sessionId);
  if(i === -1) return;
  const s = state.sessions[i];
  if(s.kind !== "study") return alert("상점 구매 기록은 삭제할 수 없어.");

  if(!confirm(`이 기록을 삭제할까요?\n${s.subject} / ${formatHMS(s.seconds)}\n(되돌리면 XP/Gold/층도 함께 감소)`)) return;

  state.totalSeconds = Math.max(0, state.totalSeconds - s.seconds);
  state.xp = Math.max(0, state.xp - s.xpGain);
  state.gold = Math.max(0, state.gold - s.goldGain);
  state.floor = Math.max(0, state.floor - s.floorsUp);
  state.battleCount = Math.max(0, state.battleCount - 1);
  state.subjects[s.subject] = Math.max(0, (state.subjects[s.subject]||0) - s.seconds);

  state.sessions.splice(i,1);
  pushLog("🗑️ 기록 삭제", `${s.subject} / ${formatHMS(s.seconds)} 삭제`);
  persist(); renderStats(); renderLogs(); renderRecordsList();
}

function applySessionEdit(sessionId, newSubject, newSeconds){
  const i = state.sessions.findIndex(s => s.id === sessionId);
  if(i === -1) return false;
  const old = state.sessions[i];
  if(old.kind !== "study") { alert("상점 구매 기록은 수정할 수 없어."); return false; }
  if(newSeconds <= 0) { alert("시간은 1초 이상"); return false; }
  const g = computeGainsFromSeconds(newSeconds);
  if(g.minutes <= 0){ alert("1분 이상부터 XP가 쌓여"); return false; }

  // remove old
  state.totalSeconds = Math.max(0, state.totalSeconds - old.seconds);
  state.xp = Math.max(0, state.xp - old.xpGain);
  state.gold = Math.max(0, state.gold - old.goldGain);
  state.floor = Math.max(0, state.floor - old.floorsUp);
  state.subjects[old.subject] = Math.max(0, (state.subjects[old.subject]||0) - old.seconds);

  // add new
  state.totalSeconds += newSeconds;
  state.xp += g.xpGain;
  state.gold += g.goldGain;
  state.floor += g.floorsUp;
  state.subjects[newSubject] = (state.subjects[newSubject]||0) + newSeconds;

  state.sessions[i] = { ...old, subject:newSubject, seconds:newSeconds, xpGain:g.xpGain, goldGain:g.goldGain, floorsUp:g.floorsUp };
  pushLog("✏️ 기록 수정", `${old.subject}/${formatHMS(old.seconds)} → ${newSubject}/${formatHMS(newSeconds)}`);
  persist(); renderStats(); renderLogs(); renderRecordsList();
  return true;
}

/* ---------- Logs UI (click-to-edit) ---------- */
function openEditSession(sessionId){
  const sess = state.sessions.find(s => s.id === sessionId);
  if(!sess) return;
  if(sess.kind !== "study") return alert("상점 구매 기록은 수정/삭제 불가.");
  editingSessionId = sessionId;

  renderSubjectsInto($editSubjectSelect);
  $editSubjectSelect.value = sess.subject;

  const hms = secondsToHMS(sess.seconds);
  $editHours.value = String(hms.h);
  $editMinutes.value = String(hms.m);
  $editSeconds.value = String(hms.s);
  [$editHours,$editMinutes,$editSeconds].forEach(ensureZero);
  openOverlay($editOverlay);
}

function renderLogs(){
  const sessionsHtml = state.sessions.slice(0, 25).map(s => {
    const icon = s.kind === "study" ? "📌" : "🛒";
    const label = s.kind === "study" ? s.subject : (s.itemName || "상점 구매");
    const clickable = s.kind === "study" ? "clickable" : "";
    const data = s.kind === "study" ? `data-edit="${s.id}"` : "";
    const sub = s.kind === "study"
      ? `${formatHMS(s.seconds)} (Day ${s.day}) → +XP ${s.xpGain} / +G ${s.goldGain} / +${s.floorsUp}F`
      : `${s.itemName} · -${s.cost}G · ${s.minutes}분`;
    return `
      <div class="logItem ${clickable}" ${data}>
        <div class="t">${icon} ${label}</div>
        <div class="m">${sub}</div>
        <div class="m" style="opacity:.55">${s.time}</div>
      </div>
    `;
  }).join("");

  const sysHtml = state.logs.slice(0, 20).map(l => `
    <div class="logItem">
      <div class="t">${l.title}</div>
      <div class="m">${l.msg}</div>
      <div class="m" style="opacity:.55">${l.time}</div>
    </div>
  `).join("");

  $log.innerHTML = `
    ${sessionsHtml || `<div class="logItem"><div class="m" style="opacity:.7;">최근 기록 없음</div></div>`}
    <div class="logItem" style="border-style:dashed; opacity:.95; margin-top:8px;">
      <div class="t">📜 시스템 로그</div>
    </div>
    ${sysHtml}
  `;

  document.querySelectorAll("[data-edit]").forEach(el => {
    el.onclick = () => openEditSession(el.getAttribute("data-edit"));
  });
}

/* ---------- Records manager ---------- */
function renderRecordsList(){
  const q = ($recordsSearch.value || "").trim().toLowerCase();
  const list = state.sessions.filter(s => s.kind === "study").slice(0, 200).filter(s => !q || s.subject.toLowerCase().includes(q));
  $recordsList.innerHTML = list.map(s => `
    <div class="recordRow clickable" data-edit="${s.id}">
      <input type="checkbox" class="recChk" data-rec-id="${s.id}" onclick="event.stopPropagation()"/>
      <div>
        <div style="font-weight:1000;">${s.subject} — ${formatHMS(s.seconds)}</div>
        <div class="recordMeta">Day ${s.day} · +XP ${s.xpGain} / +G ${s.goldGain} / +${s.floorsUp}F · ${s.time}</div>
      </div>
      <button class="btn danger smallBtn" data-del="${s.id}" type="button">삭제</button>
    </div>
  `).join("") || `<div class="logItem"><div class="m" style="opacity:.7;">표시할 기록이 없어</div></div>`;

  $recordsList.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); deleteSession(btn.getAttribute("data-del")); };
  });
  $recordsList.querySelectorAll("[data-edit]").forEach(row => {
    row.onclick = () => openEditSession(row.getAttribute("data-edit"));
  });
  $recordsSelectAll.checked = false;
}

function deleteSelectedSessions(){
  const chks = Array.from(document.querySelectorAll(".recChk:checked"));
  if(chks.length === 0) return alert("삭제할 기록을 선택해줘.");
  if(!confirm(`선택한 ${chks.length}개의 기록을 삭제할까요?\n(되돌리면 XP/Gold/층/누적시간이 같이 감소)`)) return;

  const ids = chks.map(c => c.getAttribute("data-rec-id"));
  ids.forEach(id => {
    const i = state.sessions.findIndex(s => s.id === id && s.kind === "study");
    if(i === -1) return;
    const s = state.sessions[i];
    state.totalSeconds = Math.max(0, state.totalSeconds - s.seconds);
    state.xp = Math.max(0, state.xp - s.xpGain);
    state.gold = Math.max(0, state.gold - s.goldGain);
    state.floor = Math.max(0, state.floor - s.floorsUp);
    state.battleCount = Math.max(0, state.battleCount - 1);
    state.subjects[s.subject] = Math.max(0, (state.subjects[s.subject]||0) - s.seconds);
    state.sessions.splice(i, 1);
  });

  pushLog("🗑️ 선택 삭제", `${ids.length}개 기록 삭제`);
  persist(); renderStats(); renderLogs(); renderRecordsList();
}

/* ---------- Day rules ---------- */
function wakeUp(){
  // start next day regardless of closed state
  state.day += 1;
  state.dayClosed = false;
  state.dayClosedAt = null;
  pushLog("🌅 Day 증가", `“일어났어” → Day ${state.day} 시작`);
  persist(); renderStats(); renderLogs();
  setNote(`Day ${state.day} 시작!`);
}
function endDay(){
  if(state.dayClosed) return alert("이미 마감했어.");
  state.dayClosed = true;
  state.dayClosedAt = nowStamp();
  pushLog("🧾 하루 마감", `Day ${state.day} 마감 (${state.dayClosedAt})`);
  persist(); renderStats(); renderLogs();
  alert("오늘 기록 마감 완료! 내일은 “일어났어”를 눌러 시작해.");
}

/* ---------- Shop / Reward ---------- */
let rewardTicker = null;

function getReward(){
  try{ return JSON.parse(localStorage.getItem(KEY_REWARD) || "null"); }catch{ return null; }
}
function setReward(obj){
  localStorage.setItem(KEY_REWARD, JSON.stringify(obj));
}
function clearReward(){
  localStorage.removeItem(KEY_REWARD);
}
function rewardActive(){
  const r = getReward();
  if(!r) return false;
  return Date.now() < r.deadline;
}
function startReward(minutes, cost, itemName){
  if(state.gold < cost) return alert("골드가 부족해.");
  const url = safeUrl($rewardUrl.value);
  if(!url) return alert("열 사이트 주소를 입력해줘.");

  state.gold -= cost;

  const deadline = Date.now() + minutes*60*1000;
  setReward({ deadline, url, minutes, startedAt: Date.now() });

  // log as non-deletable session
  const sess = {
    id: genId(),
    kind: "shop",
    time: nowStamp(),
    day: state.day,
    itemName,
    minutes,
    cost
  };
  state.sessions.unshift(sess);
  pushLog("🛒 상점 구매", `${itemName} (-${cost}G) · ${minutes}분 타이머 시작`);
  persist();

  // open site
  window.open(url, "_blank", "noopener,noreferrer");
  closeOverlay($shopOverlay);
  updateRewardUI(true);
}
function updateRewardUI(forceShow=false){
  const r = getReward();
  if(!r){
    $rewardBar.classList.add("hidden");
    if(rewardTicker){ clearInterval(rewardTicker); rewardTicker=null; }
    return;
  }
  const remaining = r.deadline - Date.now();
  if(remaining <= 0){
    // time up -> block THIS tab
    clearReward();
    if(rewardTicker){ clearInterval(rewardTicker); rewardTicker=null; }
    location.href = "blocked.html";
    return;
  }
  if(forceShow) $rewardBar.classList.remove("hidden");
  $rewardBar.classList.toggle("hidden", false);
  $rewardRemaining.textContent = formatMMSS(remaining);

  if(!rewardTicker){
    rewardTicker = setInterval(() => updateRewardUI(false), 1000);
  }
}

$openRewardBtn.onclick = () => {
  const r = getReward();
  if(!r) return;
  window.open(r.url, "_blank", "noopener,noreferrer");
};
$backToGameBtn.onclick = () => {
  // just focus on this tab; nothing special needed
  alert("게임 탭이야. 보상 시간은 아래에서 계속 표시돼.");
};

/* ---------- Reset ---------- */
function fullReset(){
  if(!confirm("정말 초기화할까요?\n(현재 프로필 진행/로그/기록이 모두 삭제돼)")) return;
  // wipe current profile state only (profiles list stays)
  state = defaultState();
  persist(profile, state);
  renderSubjects();
  renderStats();
  renderLogs();
  renderRecordsList();
  setNote("초기화 완료");
}

/* ---------- Wire UI ---------- */
$addSubjectOpenBtn.onclick = () => {
  $addSubjectRow.classList.toggle("hidden");
  if(!$addSubjectRow.classList.contains("hidden")) $newSubjectInput.focus();
};
$addSubjectBtn.onclick = () => {
  const name = ($newSubjectInput.value || "").trim();
  if(!name) return alert("과목 이름을 입력해줘.");
  if(state.subjectsList.includes(name)) return alert("이미 있는 과목이야.");
  state.subjectsList.unshift(name);
  state.subjects[name] = state.subjects[name] || 0;
  $newSubjectInput.value = "";
  $addSubjectRow.classList.add("hidden");
  renderSubjects();
  $subjectSelect.value = name;
  persist();
};

$addStudyBtn.onclick = () => {
  const subject = $subjectSelect.value || "미분류";
  const h = Number($hoursInput.value || 0);
  const m = Number($minutesInput.value || 0);
  const s = Number($secondsInput.value || 0);
  const total = (h*3600) + (m*60) + s;
  const res = addStudySession(subject, total);
  if(!res.ok) return alert(res.error);
  $hoursInput.value = "0"; $minutesInput.value = "0"; $secondsInput.value = "0";
  persist(); renderStats(); renderLogs(); renderRecordsList();
};

$wakeBtn.onclick = wakeUp;
$endDayBtn.onclick = endDay;
$resetBtn.onclick = fullReset;

[$hoursInput,$minutesInput,$secondsInput].forEach(el => el.addEventListener("blur", ()=>ensureZero(el)));
$secondsInput.addEventListener("blur", ()=>ensureZero($secondsInput));

/* Profile overlay */
function renderProfileUI(){
  let list = getProfiles();
  if(list.length === 0){
    list = ["default"];
    setProfiles(list);
  }
  if(!list.includes(profile)){
    profile = list[0];
    setActiveProfile(profile);
    state = loadState(profile);
  }
  $profileSelect.innerHTML = list.map(p => `<option value="${p}">${p}</option>`).join("");
  $profileSelect.value = profile;
}
$profileBtn.onclick = () => { renderProfileUI(); openOverlay($profileOverlay); };
$closeProfileBtn.onclick = () => closeOverlay($profileOverlay);
$newProfileBtn.onclick = () => { $newProfileRow.classList.toggle("hidden"); if(!$newProfileRow.classList.contains("hidden")) $newProfileInput.focus(); };
$createProfileBtn.onclick = () => {
  const name = ($newProfileInput.value || "").trim();
  if(!name) return alert("이름을 입력해줘.");
  const list = getProfiles();
  if(list.includes(name)) return alert("이미 있는 프로필이야.");
  list.push(name);
  setProfiles(list);
  profile = name;
  setActiveProfile(profile);
  state = defaultState();
  persist(profile, state);
  $newProfileInput.value = "";
  $newProfileRow.classList.add("hidden");
  renderProfileUI();
  renderSubjects();
  renderStats(); renderLogs(); renderRecordsList();
  closeOverlay($profileOverlay);
};

$profileSelect.onchange = () => {
  profile = $profileSelect.value;
  setActiveProfile(profile);
  state = loadState(profile);
  renderSubjects();
  renderStats(); renderLogs(); renderRecordsList();
};

$exportBtn.onclick = () => {
  const blob = new Blob([JSON.stringify({profile, state}, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `life-rpg2-backup-${profile}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
$importBtn.onclick = () => $importFile.click();
$importFile.onchange = async () => {
  const f = $importFile.files && $importFile.files[0];
  if(!f) return;
  const txt = await f.text();
  try{
    const obj = JSON.parse(txt);
    if(!obj || !obj.profile || !obj.state) throw new Error("bad");
    const name = String(obj.profile);
    const list = getProfiles();
    if(!list.includes(name)) { list.push(name); setProfiles(list); }
    profile = name;
    setActiveProfile(profile);
    state = obj.state;
    persist(profile, state);
    renderProfileUI(); renderSubjects(); renderStats(); renderLogs(); renderRecordsList();
    alert("가져오기 완료!");
  }catch{
    alert("가져오기 실패: 파일이 올바르지 않아.");
  }
};

/* Records overlay */
$recordsBtn.onclick = () => { renderRecordsList(); openOverlay($recordsOverlay); };
$closeRecordsBtn.onclick = () => closeOverlay($recordsOverlay);
$recordsSearch.oninput = () => renderRecordsList();
$recordsSelectAll.onchange = () => {
  document.querySelectorAll(".recChk").forEach(c => c.checked = $recordsSelectAll.checked);
};
$deleteSelectedBtn.onclick = () => deleteSelectedSessions();

/* Shop overlay */
$shopBtn.onclick = () => openOverlay($shopOverlay);
$closeShopBtn.onclick = () => closeOverlay($shopOverlay);
shopItems.forEach(btn => {
  btn.onclick = () => {
    const cost = Number(btn.dataset.cost);
    const minutes = Number(btn.dataset.min);
    const name = btn.querySelector(".name")?.textContent || "보상";
    startReward(minutes, cost, name);
    renderStats();
    renderLogs();
  };
});

/* Edit overlay */
$closeEditBtn.onclick = () => { editingSessionId = null; closeOverlay($editOverlay); };
$saveEditBtn.onclick = () => {
  if(!editingSessionId) return;
  const subject = $editSubjectSelect.value || "미분류";
  const h = Number($editHours.value || 0);
  const m = Number($editMinutes.value || 0);
  const s = Number($editSeconds.value || 0);
  const total = (h*3600) + (m*60) + s;
  applySessionEdit(editingSessionId, subject, total);
  editingSessionId = null;
  closeOverlay($editOverlay);
};
$deleteEditBtn.onclick = () => {
  if(!editingSessionId) return;
  deleteSession(editingSessionId);
  editingSessionId = null;
  closeOverlay($editOverlay);
};

$editAddSubjectOpenBtn.onclick = () => {
  $editAddSubjectRow.classList.toggle("hidden");
  if(!$editAddSubjectRow.classList.contains("hidden")) $editNewSubjectInput.focus();
};
$editAddSubjectBtn.onclick = () => {
  const name = ($editNewSubjectInput.value || "").trim();
  if(!name) return alert("과목 이름을 입력해줘.");
  if(state.subjectsList.includes(name)) return alert("이미 있는 과목이야.");
  state.subjectsList.unshift(name);
  state.subjects[name] = state.subjects[name] || 0;
  $editNewSubjectInput.value = "";
  $editAddSubjectRow.classList.add("hidden");
  renderSubjects();
  $editSubjectSelect.value = name;
  persist();
};
[$editHours,$editMinutes,$editSeconds].forEach(el => el.addEventListener("blur", ()=>ensureZero(el)));

/* ---------- Start / Transitions ---------- */
function startGame(){
  if(introTimer) clearInterval(introTimer);
  introEl.classList.add("hidden");
  gameEl.classList.remove("hidden");

  // Fresh start request: do NOT restore old account in this repo.
  // If user previously used this repo, they can press "초기화".
  // We also ensure default profile exists.
  let list = getProfiles();
  if(list.length === 0){
    list = ["default"];
    setProfiles(list);
  }
  if(!list.includes(profile)){
    profile = list[0];
    setActiveProfile(profile);
  }
  state = loadState(profile);

  renderProfileUI();
  renderSubjects();
  renderStats();
  renderLogs();
  renderRecordsList();
  setNote(`${APP_VERSION} 적용됨`);

  // reward timer check
  updateRewardUI(false);
}

function init(){
  preloadIntro();
  showIntro(0);
  restartIntroTimer();

  skipBtn.onclick = nextIntro;     // per-image skip -> next image
  enterBtn.onclick = startGame;    // on 3rd image
}

window.addEventListener("focus", () => {
  // When user comes back to game tab, enforce block if expired
  updateRewardUI(false);
});

init();
