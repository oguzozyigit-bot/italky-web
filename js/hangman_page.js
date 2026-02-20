// FILE: /js/hangman_page.js
import { mountShell } from "/js/ui_shell.js";

const $ = (id) => document.getElementById(id);

// ---- UI SHELL ----
mountShell({ scroll:"none" });

// footer lift (dock alt bara girmesin)
try{
  const root = getComputedStyle(document.documentElement);
  const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
  document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 10}px` : "0px");
}catch{}

// ---- LangPool base from config.js ----
async function readLangpoolBase(){
  if(window.LANGPOOL_BASE) return String(window.LANGPOOL_BASE);
  const r = await fetch("/js/config.js", { cache:"no-store" });
  const t = await r.text();
  const m = t.match(/LANGPOOL_BASE\s*=\s*["']([^"']+)["']/);
  return (m && m[1]) ? m[1] : "";
}

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?]/g, "");

function sanitize(data){
  const items = Array.isArray(data?.items) ? data.items : [];
  const seen = new Set();
  const out = [];
  for(const it of items){
    const w = String(it?.w || "").trim();
    const tr = String(it?.tr || "").trim();
    if(!w || !tr) continue;
    const k = norm(w);
    if(seen.has(k)) continue;
    seen.add(k);
    out.push({ w, tr });
  }
  return { lang: String(data?.lang||""), version: data?.version||1, items: out };
}

async function loadLangPoolDirect(lang, base){
  const L = String(lang||"").trim().toLowerCase();
  const url = `${base}/${encodeURIComponent(L)}.json`;
  const r = await fetch(url, { cache:"no-store" });
  if(!r.ok) return { lang:L, version:1, items:[] };
  return sanitize(await r.json());
}

function createUsedSet(storageKey){
  let used = new Set();
  try{
    const raw = localStorage.getItem(storageKey);
    const arr = JSON.parse(raw || "[]");
    if(Array.isArray(arr)) used = new Set(arr);
  }catch{}
  const save = () => { try{ localStorage.setItem(storageKey, JSON.stringify([...used])); }catch{} };
  return { used, save };
}

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function pick(pool, count, usedSet, saveUsed, filterFn){
  const items = Array.isArray(pool?.items)? pool.items : [];
  if(!items.length) return [];
  const candidates = items.filter(x => x?.w && !usedSet.has(norm(x.w)) && (!filterFn || filterFn(x)));
  if(candidates.length < count) usedSet.clear();
  const fresh = items.filter(x => x?.w && !usedSet.has(norm(x.w)) && (!filterFn || filterFn(x)));
  const chosen = shuffle(fresh).slice(0,count);
  chosen.forEach(x=>usedSet.add(norm(x.w)));
  if(saveUsed) saveUsed();
  return chosen;
}

// ---- SCORE RULES (Senin istediğin) ----
// 1) Best score: her dil + her seviye ayrı, sonsuza kadar saklanır
// 2) RoundScore: her kelime 100 ile başlar, yanlış+joker -10
// 3) Lives: 3, flawless+no joker => +1 life (max 9)
// 4) Kelime bilemezse: 1 can gider, puan almaz
// 5) TotalScore: doğru kelimelerin puanları birikir (GameOver'a kadar)

let LANGPOOL_BASE = "";
let pool = null;
let target = null;

let lang = "en";
let diff = 3;

let lives = 3;
const MAX_LIVES = 9;

let totalScore = 0;     // biriken
let roundScore = 100;   // kelime puanı
let guessed = new Set();
let mistakes = 0;

let jokersLeft = 2;
const MAX_JOKERS = 2;

let flawless = true;
let jokerUsed = false;
let lock = false;

// Best key per lang+diff
function bestKey(){
  return `italky_hangman_best::${lang}::${diff}`;
}
function getBest(){
  return parseInt(localStorage.getItem(bestKey()) || "0", 10);
}
function setBest(v){
  try{ localStorage.setItem(bestKey(), String(v)); }catch{}
}

function paint(){
  $("bestVal").textContent = String(getBest());
  $("scoreVal").textContent = String(totalScore);
  $("roundVal").textContent = String(roundScore);
}

function getMistakeLimit(){
  // easy(3)=6, normal(4)=4, hard(5)=2
  if(diff===3) return 6;
  if(diff===4) return 4;
  return 2;
}

function renderHearts(){
  const capped = Math.max(0, Math.min(lives, MAX_LIVES));
  let html = "";
  for(let i=0;i<capped;i++) html += `<span class="heart">❤️</span>`;
  $("hearts").innerHTML = html;
}

function resetMan(){
  ["p_head","p_body","p_larm","p_rarm","p_lleg","p_rleg"].forEach(id => $(id).classList.remove("on"));
  $("man").classList.remove("swing");
}

function updateMan(){
  resetMan();
  const seq = ["p_head","p_body","p_larm","p_rarm","p_lleg","p_rleg"];
  const limit = getMistakeLimit();
  const showCount = Math.min(limit, 6);
  seq.slice(0, Math.min(mistakes, showCount)).forEach(id => $(id).classList.add("on"));
}

function renderWord(){
  const w = target.w.toUpperCase();
  $("matrix").innerHTML = w.split("").map(ch=>{
    const found = guessed.has(ch);
    return `<div class="slot ${found ? "found":""}">${found ? ch : ""}</div>`;
  }).join("");
}

function renderKeyboard(){
  const w = target.w.toUpperCase();
  const uniq = [...new Set(w.split(""))];
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const fillers = abc.filter(l => !uniq.includes(l)).sort(()=>0.5-Math.random()).slice(0,10);
  const keys = [...uniq, ...fillers].sort(()=>0.5-Math.random());

  $("kb").innerHTML = keys.map(k=>`<button class="key" data-k="${k}">${k}</button>`).join("");
  $("kb").querySelectorAll(".key").forEach(btn=>{
    btn.onclick = () => press(btn.dataset.k, btn);
  });
}

function speakWord(text){
  try{
    const t = String(text||"").trim();
    if(!t) return;

    if(window.NativeTTS && typeof window.NativeTTS.speak === "function"){
      try{ window.NativeTTS.stop?.(); }catch{}
      setTimeout(()=>{ try{ window.NativeTTS.speak(t, lang); }catch{} }, 180);
      return;
    }

    if(!("speechSynthesis" in window)) return;
    const map = {en:"en-US",de:"de-DE",fr:"fr-FR",it:"it-IT",es:"es-ES"};
    const u = new SpeechSynthesisUtterance(t);
    u.lang = map[lang] || "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }catch{}
}

function showModal(title, color, bonus){
  $("mTitle").textContent = title;
  $("mTitle").style.color = color;
  $("mWord").textContent = target.w.toUpperCase();
  $("mTr").textContent = `(${target.tr || "—"})`;
  $("mBonus").textContent = bonus || "";
  $("modal").classList.add("on");
}

$("mBtn").onclick = () => {
  $("modal").classList.remove("on");

  if(lives <= 0){
    location.reload();
    return;
  }
  newRound();
};

function applyPenalty(){
  roundScore = Math.max(0, roundScore - 10);
  paint();
}

function endRound(win){
  lock = true;

  // round bitince kelimeyi seslendir
  speakWord(target.w);

  if(win){
    // ✅ doğru: kelime puanı totalScore'a eklenir
    totalScore += roundScore;

    // ✅ flawless & joker yoksa +1 life (max 9)
    let bonus = `+${roundScore} PUAN\nTOPLAM SKOR: ${totalScore}`;
    if(flawless && !jokerUsed && lives < MAX_LIVES){
      lives++;
      bonus += `\nKUSURSUZ: +1 CAN`;
    }

    // ✅ Best score kontrol (lang+diff)
    const b = getBest();
    if(totalScore > b) setBest(totalScore);

    renderHearts();
    paint();

    showModal("MİSYON BAŞARILI", "#00ff9d", bonus);
    return;
  }

  // ❌ yanlış kelime: can gider, puan eklenmez
  lives--;
  renderHearts();
  $("man").classList.add("swing");

  const swingMs = 2200;
  setTimeout(()=>{
    $("man").classList.remove("swing");
    if(lives <= 0){
      // ✅ game over: totalScore kalır, best zaten tutulur
      showModal("GAME OVER", "#ff0033", `TOPLAM SKOR: ${totalScore}\nEN YÜKSEK: ${getBest()}`);
    }else{
      showModal("DEŞİFRE EDİLEMEDİ", "#ff0033", "-1 CAN");
    }
  }, swingMs);
}

function press(letter, btn){
  if(lock) return;
  if(guessed.has(letter)) return;

  const w = target.w.toUpperCase();
  if(w.includes(letter)){
    guessed.add(letter);
    btn.classList.add("hit");
    renderWord();
    if(w.split("").every(ch => guessed.has(ch))) endRound(true);
  }else{
    btn.classList.add("miss");
    flawless = false;
    mistakes++;
    applyPenalty();
    updateMan();
    if(mistakes >= getMistakeLimit()) endRound(false);
  }
}

function useJ(i){
  if(lock) return;
  if(jokersLeft <= 0) return;

  jokerUsed = true;
  jokersLeft--;

  // ✅ iki joker de çalışsın
  const el = (i===0) ? $("j0") : $("j1");
  el.classList.add("spent");

  applyPenalty();

  const w = target.w.toUpperCase();
  const rem = w.split("").filter(ch => !guessed.has(ch));
  if(rem.length){
    const l = rem[0];
    const btn = $("kb").querySelector(`.key[data-k="${l}"]`);
    if(btn) press(l, btn);
    else { guessed.add(l); renderWord(); }
  }
}

$("j0").onclick = ()=>useJ(0);
$("j1").onclick = ()=>useJ(1);

function newRound(){
  lock = false;
  guessed = new Set();
  mistakes = 0;

  // ✅ joker reset
  jokersLeft = MAX_JOKERS;
  $("j0").classList.remove("spent");
  $("j1").classList.remove("spent");

  flawless = true;
  jokerUsed = false;

  // ✅ yeni kelime puanı 100
  roundScore = 100;

  resetMan();

  const usedSet = createUsedSet(`used_hangman_${lang}`);
  const pickedW = pick(pool, 1, usedSet.used, usedSet.save, (x)=> (x?.w||"").length >= 3);
  target = pickedW?.[0];

  if(!target?.w){
    $("trText").textContent = "KELİME BULUNAMADI";
    $("matrix").innerHTML = "";
    $("kb").innerHTML = "";
    paint();
    return;
  }

  $("trText").textContent = (target.tr || "—").trim() || "—";

  renderHearts();
  renderWord();
  renderKeyboard();
  updateMan();
  paint();
}

// ---- Setup seçimleri ----
$("langGrid").addEventListener("click", (e)=>{
  const c=e.target.closest(".pickCard");
  if(!c || !c.dataset.lang) return;
  [...$("langGrid").querySelectorAll(".pickCard")].forEach(x=>x.classList.remove("active"));
  c.classList.add("active");
  lang = c.dataset.lang;
});

$("diffGrid").addEventListener("click", (e)=>{
  const c=e.target.closest(".pickCard.diff");
  if(!c) return;
  [...$("diffGrid").querySelectorAll(".pickCard.diff")].forEach(x=>x.classList.remove("active"));
  c.classList.add("active");
  diff = parseInt(c.dataset.diff,10);
});

// ---- Start ----
$("startBtn").addEventListener("click", async ()=>{
  $("setupMsg").textContent = "Yükleniyor…";

  try{
    LANGPOOL_BASE = await readLangpoolBase();
    if(!LANGPOOL_BASE){
      $("setupMsg").textContent = "LANGPOOL_BASE bulunamadı (/js/config.js).";
      return;
    }

    pool = await loadLangPoolDirect(lang, LANGPOOL_BASE);
    if(!pool?.items?.length){
      $("setupMsg").textContent = `Havuz boş: ${LANGPOOL_BASE}/${lang}.json`;
      return;
    }
  }catch(err){
    $("setupMsg").textContent = "Havuz yükleme hatası:\n" + String(err);
    return;
  }

  // ✅ yeni oyun başlangıcı
  lives = 3;
  totalScore = 0;
  renderHearts();
  paint();

  $("setup").style.display = "none";
  $("setupMsg").textContent = "";

  newRound();
});

// initial render
renderHearts();
paint();
