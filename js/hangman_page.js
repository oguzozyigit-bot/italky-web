/* FILE: /js/hangman_page.js */
import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

const $ = (id) => document.getElementById(id);

// UI SHELL Sığdırma
mountShell({ scroll:"none" });
try {
  const root = getComputedStyle(document.documentElement);
  const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
  document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 10}px` : "0px");
} catch(e){}

/* --- STATE --- */
let state = {
  lang: localStorage.getItem("italky_game_lang") || "en",
  level: localStorage.getItem("italky_game_level") || "A1",
  pool: [], target: null, lives: 3, MAX_LIVES: 9,
  totalScore: 0, roundScore: 100, guessed: new Set(),
  mistakes: 0, flawless: true, jokerUsed: false, lock: false,
  userId: "anon"
};

/* --- SUPABASE BAĞLANTISI --- */
async function loadGameData() {
  const { data: { session } } = await supabase.auth.getSession();
  state.userId = session?.user?.id || "anon";

  // Havuzu Çek
  const { data: words, error } = await supabase
    .from("hangman_pool") // Veritabanındaki tablo adın
    .select("w, tr")
    .eq("lang", state.lang)
    .eq("level", state.level);

  if (error) {
    $("gateInfo").textContent = "Veritabanı Hatası!";
    return;
  }
  
  state.pool = words;

  // Rekoru Çek
  const { data: prof } = await supabase.from("profiles").select("hangman_best").eq("id", state.userId).maybeSingle();
  const key = `${state.lang}::${state.level}`;
  $("bestVal").textContent = prof?.hangman_best?.[key] || 0;

  $("gateInfo").textContent = state.pool.length > 0 ? `${state.lang.toUpperCase()} • ${state.level} HAZIR` : "HAVUZ BOŞ!";
}

async function updateBestScore(newScore) {
  if (state.userId === "anon") return;
  const key = `${state.lang}::${state.level}`;
  const { data: prof } = await supabase.from("profiles").select("hangman_best").eq("id", state.userId).maybeSingle();
  let map = prof?.hangman_best || {};
  if (newScore > (map[key] || 0)) {
    map[key] = newScore;
    await supabase.from("profiles").update({ hangman_best: map }).eq("id", state.userId);
    $("bestVal").textContent = newScore;
  }
}

/* --- OYUN MANTIĞI --- */
function startRound() {
  state.lock = false; state.guessed.clear(); state.mistakes = 0;
  state.roundScore = 100; state.flawless = true; state.jokerUsed = false;
  $("j0").classList.remove("spent"); $("j1").classList.remove("spent");
  
  state.target = state.pool[Math.floor(Math.random() * state.pool.length)];
  if (!state.target) return;

  renderWord(); renderKeyboard(); renderHearts(); resetMan();
  $("trText").textContent = (state.target.tr || "").toUpperCase();
  $("scoreVal").textContent = state.totalScore;
}

function renderWord() {
  const w = state.target.w.toUpperCase();
  $("matrix").innerHTML = w.split("").map(ch => {
    const found = state.guessed.has(ch);
    return `<div class="slot ${found ? "found" : ""}">${found ? ch : ""}</div>`;
  }).join("");
}

function renderKeyboard() {
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  $("kb").innerHTML = abc.map(l => `<button class="key" id="key-${l}" data-l="${l}">${l}</button>`).join("");
  $("kb").querySelectorAll(".key").forEach(btn => btn.onclick = () => makeGuess(btn.dataset.l));
}

function makeGuess(l) {
  if (state.lock || state.guessed.has(l)) return;
  state.guessed.add(l);
  const btn = $(`key-${l}`);
  const w = state.target.w.toUpperCase();

  if (w.includes(l)) {
    btn.classList.add("hit"); renderWord();
    if (w.split("").every(ch => state.guessed.has(ch))) endRound(true);
  } else {
    btn.classList.add("miss"); state.mistakes++; state.flawless = false;
    state.roundScore = Math.max(0, state.roundScore - 15); updateMan(state.mistakes);
    if (state.mistakes >= 6) endRound(false);
  }
}

function updateMan(errs) {
  const seq = ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"];
  seq.forEach((id, i) => $(id).classList.toggle("on", i < errs));
  $("man").classList.toggle("swing", errs >= 6);
}

function resetMan() {
  ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"].forEach(id => $(id).classList.remove("on"));
  $("man").classList.remove("swing");
}

function renderHearts() {
  let h = ""; for (let i = 0; i < state.lives; i++) h += `<span class="heart">❤️</span>`;
  $("hearts").innerHTML = h;
}

async function endRound(win) {
  state.lock = true;
  if (win) {
    state.totalScore += state.roundScore;
    if (state.flawless && !state.jokerUsed && state.lives < state.MAX_LIVES) state.lives++;
    await updateBestScore(state.totalScore);
  } else { state.lives--; }

  $("mTitle").textContent = win ? "BAŞARILI!" : "MİSYON BAŞARISIZ";
  $("mTitle").style.color = win ? "var(--green)" : "var(--red)";
  $("mWord").textContent = state.target.w.toUpperCase();
  $("mTr").textContent = `(${state.target.tr})`;
  $("modal").classList.add("on");
}

/* --- JOKERLER --- */
window.useJ = (i) => {
  if (state.lock) return;
  const b = $(`j${i}`); if (b.classList.contains("spent")) return;
  state.jokerUsed = true; b.classList.add("spent"); state.roundScore = Math.max(0, state.roundScore - 20);
  const rem = state.target.w.toUpperCase().split("").filter(l => !state.guessed.has(l));
  if (rem.length > 0) makeGuess(rem[0]);
};
$("j0").onclick = () => useJ(0); $("j1").onclick = () => useJ(1);

$("mBtn").onclick = () => {
  $("modal").classList.remove("on");
  if (state.lives > 0) startRound();
  else {
    if(confirm(`Oyun Bitti! Skor: ${state.totalScore}. Yeniden başla?`)) {
      state.totalScore = 0; state.lives = 3; startRound();
    } else location.href = "/pages/game_menu.html";
  }
};

$("realStartBtn").onclick = () => {
  if (state.pool.length > 0) {
    $("readyGate").style.display = "none";
    startRound();
  }
};

/* BOOT */
loadGameData();
