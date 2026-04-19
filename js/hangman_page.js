import { mountShell } from "/js/ui_shell.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import { supabase } from "/js/supabase_client.js";

mountShell({ scroll: "none" });

try{
  const root = getComputedStyle(document.documentElement);
  const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
  document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 8}px` : "0px");
}catch{}

const $ = (id) => document.getElementById(id);

const LANGS = {
  en:{ name:"İngilizce", flag:"🇬🇧" },
  de:{ name:"Almanca", flag:"🇩🇪" },
  fr:{ name:"Fransızca", flag:"🇫🇷" },
  es:{ name:"İspanyolca", flag:"🇪🇸" },
  it:{ name:"İtalyanca", flag:"🇮🇹" }
};

const GAME_LANG_KEY = "italky_hangman_lang";
const GAME_CODE = "hangman_nitro";
const SET_SIZE = 12;
const MAX_LIVES = 3;
const MAX_JOKERS = 2;

let currentLang = localStorage.getItem(GAME_LANG_KEY) || "en";
let puzzles = [];
let currentIdx = 0;
let score = 0;
let lives = MAX_LIVES;
let isBusy = false;
let currentPuzzle = null;
let guessedLetters = new Set();
let wrongLetters = new Set();
let bestScore = 0;
let jokerRevealUsed = false;
let jokerCleanUsed = false;
let userId = null;

let audioCtx = null;
function getAudioCtx(){
  try{
    if(!audioCtx){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }catch{
    return null;
  }
}
async function unlockAudio(){
  try{
    const ctx = getAudioCtx();
    if(ctx && ctx.state === "suspended") await ctx.resume();
  }catch{}
}

function beep({freq=440,duration=.08,type="sine",gain=.03,when=0}){
  const ctx = getAudioCtx();
  if(!ctx) return;
  if(ctx.state === "suspended") ctx.resume().catch(() => {});
  const now = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + .01);
  g.gain.exponentialRampToValueAtTime(.0001, now + duration);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(now); osc.stop(now + duration + .02);
}

function playGood(){
  beep({freq:620,duration:.08,type:"triangle",gain:.05});
  beep({freq:820,duration:.10,type:"triangle",gain:.05,when:.08});
}

function playBad(){
  beep({freq:180,duration:.12,type:"sawtooth",gain:.05});
  beep({freq:140,duration:.14,type:"sawtooth",gain:.04,when:.06});
}

function playFinish(){
  beep({freq:700,duration:.10,type:"triangle",gain:.05});
  beep({freq:920,duration:.12,type:"triangle",gain:.05,when:.10});
  beep({freq:1180,duration:.15,type:"triangle",gain:.05,when:.22});
}

function playApplause(){
  const ctx = getAudioCtx();
  if(!ctx) return;
  if(ctx.state === "suspended") ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  const duration = 1.8;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for(let i=0; i<bufferSize; i++){
    const t = i / ctx.sampleRate;
    const burst = (Math.random() * 2 - 1) * (0.4 + 0.6 * Math.sin(t * 38) ** 2);
    const env = Math.max(0, 1 - (t / duration) * 0.7);
    data[i] = burst * env * 0.7;
  }

  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.9;

  const gain = ctx.createGain();
  gain.gain.value = 0.08;

  src.buffer = buffer;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(now);
  src.stop(now + duration);
}

["click","touchstart","pointerdown","keydown"].forEach(evt => {
  window.addEventListener(evt, () => unlockAudio(), { passive:true, once:true });
});

function normalize(s){
  return String(s || "")
    .toLowerCase()
    .replace(/ß/g,"ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function toast(msg){
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__hangToast);
  window.__hangToast = setTimeout(() => el.classList.remove("show"), 1800);
}

function speak(t) {
  const text = String(t || "").trim();
  if (!text) return;

  const langMap = {
    en: "en-US",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    it: "it-IT"
  };
  const bcp = langMap[currentLang] || "en-US";

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(text, bcp);
      return;
    }
  } catch (e) {
    console.warn("NativeTTS speak failed:", e);
  }

  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = bcp;
    u.rate = 0.9;
    u.pitch = 1;
    u.volume = 1;

    const voices = window.speechSynthesis.getVoices?.() || [];
    const found = voices.find(v =>
      String(v.lang || "").toLowerCase().startsWith(bcp.split("-")[0].toLowerCase())
    );
    if (found) u.voice = found;

    setTimeout(() => {
      try { window.speechSynthesis.speak(u); } catch {}
    }, 120);
  } catch {}
}

function getPublicLangUrl(langCode){
  return `https://auth.italky.ai/storage/v1/object/public/lang/${langCode}.json`;
}

async function fileExists(url){
  try{
    const res = await fetch(url, { method:"HEAD", cache:"no-store" });
    return res.ok;
  }catch{
    return false;
  }
}

function extractItems(payload){
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const keys = ["items","words","data","list","entries","pool"];
    for (const key of keys) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
}

function normalizePoolItems(items){
  return items.map((item) => {
    const rawWord =
      item?.word ??
      item?.w ??
      item?.text ??
      item?.term ??
      item?.answer ??
      "";

    const rawMeaning =
      item?.meaning ??
      item?.tr ??
      item?.translation ??
      "";

    return {
      w: String(rawWord || "").trim(),
      tr: String(rawMeaning || "").trim()
    };
  }).filter(x => x.w && x.tr && !x.w.includes(" "));
}

async function loadLangPool(langCode){
  const url = getPublicLangUrl(langCode);
  const ok = await fileExists(url);
  if (!ok) return { items: [] };

  const res = await fetch(url, { cache:"no-store" });
  if (!res.ok) return { items: [] };

  const json = await res.json();
  return { items: normalizePoolItems(extractItems(json)) };
}

function shuffleArray(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickFreshSet(items, count){
  const filtered = items.filter(x => /^[a-zA-ZÀ-ÿÄÖÜäöüßÇçĞğİıÖöŞşÜü-]+$/.test(x.w));
  return shuffleArray(filtered).slice(0, count);
}

async function loadBestScore(){
  try{
    const { data:{ session } } = await supabase.auth.getSession();
    userId = session?.user?.id || null;
    if(!userId) return 0;

    const { data, error } = await supabase
      .from("user_game_best_scores")
      .select("best_score")
      .eq("user_id", userId)
      .eq("game_code", GAME_CODE)
      .eq("language_code", currentLang)
      .maybeSingle();

    if(error){
      console.warn("best score load error:", error);
      return 0;
    }

    return Number(data?.best_score || 0);
  }catch(e){
    console.warn("best score load exception:", e);
    return 0;
  }
}

async function saveBestScoreIfNeeded(){
  if(!userId) return false;
  if(score <= bestScore) return false;

  try{
    const { error } = await supabase
      .from("user_game_best_scores")
      .upsert({
        user_id: userId,
        game_code: GAME_CODE,
        language_code: currentLang,
        best_score: score,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,game_code,language_code"
      });

    if(error){
      console.warn("best score save error:", error);
      return false;
    }

    bestScore = score;
    $("bestVal").textContent = String(bestScore);
    return true;
  }catch(e){
    console.warn("best score save exception:", e);
    return false;
  }
}

function launchConfetti(){
  const layer = $("confettiLayer");
  layer.innerHTML = "";
  const colors = ["#22c55e", "#60a5fa", "#ec4899", "#f59e0b", "#ffffff", "#a5b4fc"];

  for(let i=0; i<120; i++){
    const c = document.createElement("span");
    c.className = "confetti";
    c.style.left = `${Math.random() * 100}%`;
    c.style.top = `${-20 - Math.random() * 100}px`;
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = `${2.2 + Math.random() * 2.4}s`;
    c.style.animationDelay = `${Math.random() * 0.4}s`;
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(c);
  }

  setTimeout(() => { layer.innerHTML = ""; }, 5000);
}

function launchFireworks(){
  const layer = $("fireworksLayer");
  layer.innerHTML = "";
  const colors = ["#22c55e", "#60a5fa", "#ec4899", "#f59e0b", "#ffffff"];

  const centers = [
    {x:20, y:25},
    {x:50, y:18},
    {x:78, y:28},
    {x:30, y:45},
    {x:70, y:42}
  ];

  centers.forEach((center) => {
    const count = 22;
    for(let i=0; i<count; i++){
      const p = document.createElement("span");
      p.className = "firework";
      p.style.left = `${center.x}%`;
      p.style.top = `${center.y}%`;
      p.style.color = colors[Math.floor(Math.random() * colors.length)];

      const angle = (Math.PI * 2 * i) / count;
      const distance = 40 + Math.random() * 60;
      p.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      p.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);

      layer.appendChild(p);
    }
  });

  setTimeout(() => { layer.innerHTML = ""; }, 1400);
}

function updateHearts(){
  const heartsEl = $("hearts");
  heartsEl.innerHTML = "";
  for(let i=0; i<MAX_LIVES; i++){
    const span = document.createElement("span");
    span.className = "heart";
    span.textContent = i < lives ? "❤️" : "🖤";
    if(i >= lives) span.style.filter = "none";
    heartsEl.appendChild(span);
  }
}

function updateHangman(){
  const parts = ["p_head","p_body","p_larm","p_rarm","p_lleg","p_rleg"];
  const wrongCount = wrongLetters.size;
  parts.forEach((id, idx) => {
    $(id).classList.toggle("on", idx < wrongCount);
  });
  $("man").classList.toggle("swing", wrongCount >= 6);
}

function renderWordSlots(){
  const matrix = $("matrix");
  matrix.innerHTML = "";

  const word = currentPuzzle?.w || "";
  for(const ch of word){
    const slot = document.createElement("div");
    slot.className = "slot";

    if(ch === "-" || ch === " "){
      slot.textContent = ch;
      slot.classList.add("found");
    } else if(guessedLetters.has(normalize(ch))){
      slot.textContent = ch.toUpperCase();
      slot.classList.add("found");
    } else {
      slot.textContent = "";
    }

    matrix.appendChild(slot);
  }
}

function buildKeyboard(){
  const kb = $("kb");
  kb.innerHTML = "";

  const rows = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  rows.split("").forEach(letter => {
    const btn = document.createElement("button");
    btn.className = "key";
    btn.textContent = letter;
    btn.dataset.letter = normalize(letter);
    btn.type = "button";
    btn.onclick = () => handleGuess(letter);
    kb.appendChild(btn);
  });

  refreshKeyboardState();
}

function refreshKeyboardState(){
  document.querySelectorAll(".key").forEach(btn => {
    const l = btn.dataset.letter;
    btn.disabled = guessedLetters.has(l) || wrongLetters.has(l) || isBusy;

    btn.classList.remove("hit","miss");

    if(guessedLetters.has(l)) btn.classList.add("hit");
    if(wrongLetters.has(l)) btn.classList.add("miss");
  });
}

function updateScoreUI(){
  $("scoreVal").textContent = String(score);
  $("bestVal").textContent = String(bestScore);
}

function updateJokersUI(){
  $("j0").classList.toggle("spent", jokerRevealUsed);
  $("j1").classList.toggle("spent", jokerCleanUsed);
}

function isWordSolved(){
  const word = currentPuzzle?.w || "";
  return [...normalize(word)].every(ch => {
    if(ch === "-" || ch === " ") return true;
    return guessedLetters.has(ch);
  });
}

function renderPuzzle(){
  if(!currentPuzzle) return;

  $("trText").textContent = currentPuzzle.tr || "—";
  renderWordSlots();
  refreshKeyboardState();
  updateHearts();
  updateHangman();
  updateScoreUI();
  updateJokersUI();
}

async function nextPuzzle(){
  if(lives <= 0){
    await showFinal(true);
    return;
  }

  if(currentIdx >= puzzles.length){
    await showFinal(false);
    return;
  }

  currentPuzzle = puzzles[currentIdx];
  guessedLetters = new Set();
  wrongLetters = new Set();
  jokerRevealUsed = false;
  jokerCleanUsed = false;
  isBusy = false;

  renderPuzzle();
  speak(currentPuzzle.w);
}

async function handleSolvedWord(){
  isBusy = true;
  score += 20 + Math.max(0, 8 - wrongLetters.size) * 2;
  updateScoreUI();

  playGood();
  toast("Doğru bildin!");
  speak(currentPuzzle.w);

  const newRecord = await saveBestScoreIfNeeded();
  if(newRecord){
    launchConfetti();
    launchFireworks();
    playApplause();
    toast("Yeni rekor! 🔥");
  }

  setTimeout(async () => {
    currentIdx++;
    await nextPuzzle();
  }, 1200);
}

async function handleGameOver(){
  isBusy = true;
  playBad();
  toast("Canlar bitti!");
  setTimeout(async () => {
    await showFinal(true);
  }, 900);
}

async function handleGuess(rawLetter){
  if(isBusy || !currentPuzzle) return;
  await unlockAudio();

  const letter = normalize(rawLetter);
  const word = normalize(currentPuzzle.w);

  if(guessedLetters.has(letter) || wrongLetters.has(letter)) return;

  if(word.includes(letter)){
    guessedLetters.add(letter);
    playGood();
    toast("Doğru harf!");
    renderPuzzle();

    if(isWordSolved()){
      await handleSolvedWord();
    }
  } else {
    wrongLetters.add(letter);
    playBad();
    lives--;
    renderPuzzle();

    if(lives <= 0){
      await handleGameOver();
    } else {
      toast("Yanlış harf!");
    }
  }
}

function revealRandomLetter(){
  if(jokerRevealUsed || !currentPuzzle || isBusy) return;

  const wordChars = [...normalize(currentPuzzle.w)].filter(ch => ch !== "-" && ch !== " ");
  const hidden = [...new Set(wordChars)].filter(ch => !guessedLetters.has(ch));

  if(!hidden.length){
    toast("Açılacak harf kalmadı.");
    return;
  }

  const picked = hidden[Math.floor(Math.random() * hidden.length)];
  guessedLetters.add(picked);
  jokerRevealUsed = true;
  renderPuzzle();
  playGood();
  toast(`Joker açtı: ${picked.toUpperCase()}`);

  if(isWordSolved()){
    handleSolvedWord();
  }
}

function cleanWrongKeys(){
  if(jokerCleanUsed || !currentPuzzle || isBusy) return;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const wordSet = new Set([...normalize(currentPuzzle.w)].filter(ch => ch !== "-" && ch !== " "));

  const candidates = alphabet
    .map(x => normalize(x))
    .filter(ch => !wordSet.has(ch) && !wrongLetters.has(ch) && !guessedLetters.has(ch));

  if(!candidates.length){
    toast("Temizlenecek yanlış harf yok.");
    return;
  }

  const removeCount = Math.min(6, candidates.length);
  const shuffled = shuffleArray(candidates).slice(0, removeCount);

  document.querySelectorAll(".key").forEach(btn => {
    if(shuffled.includes(btn.dataset.letter)){
      btn.disabled = true;
      btn.classList.add("miss");
      btn.style.opacity = ".15";
    }
  });

  jokerCleanUsed = true;
  updateJokersUI();
  playGood();
  toast("Yanlış harfler temizlendi.");
}

async function showFinal(gameEnded){
  const newRecord = await saveBestScoreIfNeeded();
  if(newRecord){
    launchConfetti();
    launchFireworks();
    playApplause();
  } else {
    playFinish();
  }

  const title = gameEnded ? "OYUN BİTTİ" : "SET TAMAMLANDI";
  const color = gameEnded ? "var(--red)" : "var(--green)";

  $("modal").classList.add("on");
  $("mTitle").textContent = title;
  $("mTitle").style.color = color;
  $("mWord").textContent = `SKOR ${score}`;
  $("mTr").textContent = newRecord ? "Yeni en yüksek skor!" : `En yüksek skor: ${bestScore}`;

  setTimeout(() => {
    $("modal").classList.remove("on");
    const endCardHtml = `
      <div class="modalCard">
        <h1 style="margin:0;font-size:28px;color:${gameEnded ? "var(--red)" : "var(--green)"};">${title}</h1>
        <div style="margin:18px 0 8px;font-size:18px;font-weight:900;">Skor: ${score}</div>
        <div style="font-size:14px;line-height:1.8;opacity:.86;">
          Dil: <b>${LANGS[currentLang]?.name || currentLang.toUpperCase()}</b><br>
          En yüksek skor: <b>${bestScore}</b><br>
          ${newRecord ? "Yeni rekor kırdın 🎉" : "Bir sonraki turda daha yukarı çıkalım."}
        </div>
        <button id="hangReplayBtn" style="margin-top:16px;width:100%;height:54px;border:none;border-radius:18px;background:var(--grad);color:#fff;font-size:16px;font-weight:900;cursor:pointer;">YENİDEN OYNA</button>
        <button id="hangCloseBtn" style="margin-top:10px;width:100%;height:50px;border:none;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:#fff;font-size:14px;font-weight:900;cursor:pointer;">ANA MENÜ</button>
      </div>
    `;
    $("modal").innerHTML = endCardHtml;
    $("modal").classList.add("on");

    $("hangReplayBtn").onclick = async () => {
      $("modal").classList.remove("on");
      await startGame();
    };
    $("hangCloseBtn").onclick = () => {
      location.href = "/pages/game_menu.html";
    };
  }, 1300);
}

async function startGame(){
  const ok = await ensureAuthAndCacheUser();
  if (!ok) {
    location.href = "/pages/login.html";
    return;
  }

  await unlockAudio();

  score = 0;
  lives = MAX_LIVES;
  currentIdx = 0;
  isBusy = false;
  guessedLetters = new Set();
  wrongLetters = new Set();
  jokerRevealUsed = false;
  jokerCleanUsed = false;

  const pool = await loadLangPool(currentLang);
  const items = [...(pool?.items || [])];
  puzzles = pickFreshSet(items, SET_SIZE);

  if (!puzzles.length) {
    toast("Kelime havuzu yüklenemedi.");
    return;
  }

  $("langSheet").classList.remove("show");
  $("rulesSheet").classList.remove("show");
  $("modal").classList.remove("on");

  buildKeyboard();
  await nextPuzzle();
}

function renderLangs(){
  $("langGrid").innerHTML = Object.entries(LANGS).map(([code, meta]) => `
    <button class="langCard ${currentLang===code ? "active" : ""}" data-lang="${code}" type="button">
      <div class="langFlag">${meta.flag}</div>
      <div class="langName">${meta.name}</div>
      <div class="langHint">${code.toUpperCase()}</div>
    </button>
  `).join("");

  $("langGrid").querySelectorAll(".langCard").forEach(btn => {
    btn.onclick = async () => {
      currentLang = btn.dataset.lang;
      localStorage.setItem(GAME_LANG_KEY, currentLang);
      renderLangs();
      bestScore = await loadBestScore();
      updateScoreUI();
    };
  });
}

$("j0").onclick = () => revealRandomLetter();
$("j1").onclick = () => cleanWrongKeys();

$("toRulesBtn").onclick = () => {
  $("langSheet").classList.remove("show");
  $("rulesSheet").classList.add("show");
};

$("langSheetClose").onclick = () => {
  $("langSheet").classList.remove("show");
};

$("rulesClose").onclick = () => {
  $("rulesSheet").classList.remove("show");
  $("langSheet").classList.add("show");
};

$("startGameBtn").onclick = startGame;

window.addEventListener("keydown", (e) => {
  if (!$("langSheet").classList.contains("show") && !$("rulesSheet").classList.contains("show") && !$("modal").classList.contains("on")) {
    const key = String(e.key || "").toUpperCase();
    if (/^[A-Z]$/.test(key)) handleGuess(key);
  }
});

window.onload = async () => {
  const ok = await ensureAuthAndCacheUser();
  if (!ok) {
    location.href = "/pages/login.html";
    return;
  }

  bestScore = await loadBestScore();
  updateScoreUI();
  updateHearts();
  updateHangman();
  renderLangs();
  buildKeyboard();

  $("langSheet").classList.add("show");
};
