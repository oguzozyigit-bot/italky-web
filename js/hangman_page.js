/* FILE: /js/hangman_page.js */
import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

const $ = (id) => document.getElementById(id);

// ---- UI SHELL & LIFT ----
mountShell({ scroll:"none" });
try {
  const root = getComputedStyle(document.documentElement);
  const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
  document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 10}px` : "0px");
} catch(e){}

/* ===============================
   GAME STATE (Senin Orijinal Mantığın)
================================ */
let state = {
  lang: localStorage.getItem("italky_game_lang") || "en", // Academy'den gelen dil
  level: localStorage.getItem("italky_game_level") || "A1", // Academy'den gelen seviye
  pool: [],
  target: null,
  lives: 3,
  MAX_LIVES: 9,
  totalScore: 0,
  roundScore: 100,
  guessed: new Set(),
  mistakes: 0,
  flawless: true,
  jokerUsed: false,
  lock: false,
  userId: "anon",
  bestCache: null
};

/* ===============================
   SUPABASE WORD POOL CONNECTION
================================ */
async function loadPoolFromSupabase() {
  try {
    // Havuzu Academy'den gelen lang ve level'a göre çekiyoruz
    const { data, error } = await supabase
      .from("hangman_pool") // Tablo adın hangman_pool ise
      .select("w, tr")
      .eq("lang", state.lang)
      .eq("level", state.level);

    if (error) throw error;
    state.pool = data;

    if (state.pool.length > 0) {
      $("gateInfo").textContent = `${state.lang.toUpperCase()} • ${state.level} HAZIR`;
    } else {
      $("gateInfo").textContent = "Seviye verisi bulunamadı.";
    }
  } catch (err) {
    $("gateInfo").textContent = "Bağlantı Hatası.";
  }
}

/* ===============================
   BEST SCORE LOGIC (Senin Map Yapın)
================================ */
async function ensureUser() {
  const { data: { session } } = await supabase.auth.getSession();
  state.userId = session?.user?.id || "anon";
}

async function updateBestScore(newScore) {
  if (state.userId === "anon") return;
  const key = `${state.lang}::${state.level}`; // Senin istediğin map key yapısı

  const { data } = await supabase.from("profiles").select("hangman_best").eq("id", state.userId).maybeSingle();
  let currentBestMap = data?.hangman_best || {};
  let oldBest = currentBestMap[key] || 0;

  if (newScore > oldBest) {
    currentBestMap[key] = newScore;
    await supabase.from("profiles").update({ hangman_best: currentBestMap }).eq("id", state.userId);
    $("bestVal").textContent = newScore;
  }
}

/* ===============================
   GAME FLOW
================================ */
function startRound() {
  state.lock = false;
  state.guessed.clear();
  state.mistakes = 0;
  state.roundScore = 100;
  state.flawless = true;
  state.jokerUsed = false;
  
  // Jokerleri sıfırla
  $("j0").classList.remove("spent");
  $("j1").classList.remove("spent");

  // Havuzdan rastgele seç
  state.target = state.pool[Math.floor(Math.random() * state.pool.length)];
  
  renderWord();
  renderKeyboard();
  renderHearts();
  updateMan(0);
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
  $("kb").querySelectorAll(".key").forEach(btn => {
    btn.onclick = () => makeGuess(btn.dataset.l);
  });
}

function makeGuess(l) {
  if (state.lock || state.guessed.has(l)) return;
  state.guessed.add(l);
  const btn = $(`key-${l}`);

  const w = state.target.w.toUpperCase();
  if (w.includes(l)) {
    btn.classList.add("hit");
    renderWord();
    if (w.split("").every(ch => state.guessed.has(ch))) endRound(true);
  } else {
    btn.classList.add("miss");
    state.mistakes++;
    state.flawless = false;
    state.roundScore = Math.max(0, state.roundScore - 15);
    updateMan(state.mistakes);
    if (state.mistakes >= 6) endRound(false);
  }
}

function updateMan(errs) {
  const seq = ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"];
  seq.forEach((id, i) => $(id).classList.toggle("on", i < errs));
  if (errs >= 6) $("man").classList.add("swing");
  else $("man").classList.remove("swing");
}

function renderHearts() {
  let h = "";
  for (let i = 0; i < state.lives; i++) h += `<span class="heart">❤️</span>`;
  $("hearts").innerHTML = h;
}

// JOKER MANTIĞI (Senin Jokerlerin)
window.useJoker = (idx) => {
  if (state.lock) return;
  const btn = $(`j${idx}`);
  if (btn.classList.contains("spent")) return;

  state.jokerUsed = true;
  btn.classList.add("spent");
  state.roundScore = Math.max(0, state.roundScore - 20);

  const w = state.target.w.toUpperCase();
  const hiddenLetters = w.split("").filter(l => !state.guessed.has(l));
  if (hiddenLetters.length > 0) {
    makeGuess(hiddenLetters[0]);
  }
};

async function endRound(win) {
  state.lock = true;
  
  if (win) {
    state.totalScore += state.roundScore;
    // ✅ KUSURSUZ BONUSU (Senin istediğin can artışı)
    if (state.flawless && !state.jokerUsed && state.lives < state.MAX_LIVES) {
      state.lives++;
    }
    await updateBestScore(state.totalScore);
  } else {
    state.lives--;
  }

  showModal(win);
}

function showModal(win) {
  $("mTitle").textContent = win ? "BAŞARILI!" : "MİSYON BAŞARISIZ";
  $("mTitle").style.color = win ? "var(--green)" : "var(--red)";
  $("mWord").textContent = state.target.w.toUpperCase();
  $("mTr").textContent = `(${state.target.tr})`;
  $("modal").classList.add("on");
}

$("mBtn").onclick = () => {
  $("modal").classList.remove("on");
  if (state.lives > 0) {
    startRound();
  } else {
    const want = confirm(`Oyun Bitti! Skor: ${state.totalScore}. Yeniden başlamak ister misin?`);
    if (want) {
      state.totalScore = 0;
      state.lives = 3;
      startRound();
    } else {
      location.href = "/pages/game_menu.html";
    }
  }
};

$("realStartBtn").onclick = () => {
  if (state.pool.length === 0) return;
  $("readyGate").style.display = "none";
  startRound();
};

// BOOT
(async () => {
  await ensureUser();
  await loadPoolFromSupabase();
  // İlk rekoru bas
  const key = `${state.lang}::${state.level}`;
  const { data } = await supabase.from("profiles").select("hangman_best").eq("id", state.userId).maybeSingle();
  $("bestVal").textContent = data?.hangman_best?.[key] || 0;
})();
