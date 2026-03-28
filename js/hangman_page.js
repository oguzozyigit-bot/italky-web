import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { requireLevelForLanguage, normalizeLang } from "/js/level_gate.js";

const $ = (id) => document.getElementById(id);

// UI shell
mountShell({ scroll: "none" });
try {
  const root = getComputedStyle(document.documentElement);
  const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
  document.documentElement.style.setProperty(
    "--shellLift",
    footerH ? `${footerH + 10}px` : "0px"
  );
} catch (e) {}

/* -----------------------------
   HELPERS
----------------------------- */
function qp(name) {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

function setGate(msg) {
  const el = $("gateInfo");
  if (el) el.textContent = msg;
}

function disableStartBtn(disabled = true, text = "BAŞLA") {
  const btn = $("realStartBtn");
  if (!btn) return;
  btn.disabled = disabled;
  btn.style.opacity = disabled ? "0.5" : "1";
  btn.style.pointerEvents = disabled ? "none" : "auto";
  btn.textContent = text;
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

/* -----------------------------
   STATE
----------------------------- */
let state = {
  lang: normalizeLang(qp("lang") || localStorage.getItem("italky_game_lang") || "en"),
  level: null,
  pool: [],
  target: null,
  lastWord: null,
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
  placementOk: false
};

/* -----------------------------
   PROFILE / AUTH / DATA LOAD
----------------------------- */
async function loadGameData() {
  try {
    disableStartBtn(true, "YÜKLENİYOR...");
    setGate("SEVİYE KONTROL EDİLİYOR...");

    const gate = await requireLevelForLanguage(state.lang, "hangman", {
      lang: state.lang
    });

    if (!gate.ok) return;

    state.userId = gate.profile?.id || "anon";
    state.level = gate.level;
    state.placementOk = true;

    localStorage.setItem("italky_game_lang", state.lang);
    localStorage.setItem("italky_game_level", state.level);

    setGate(`${state.lang.toUpperCase()} • ${state.level} YÜKLENİYOR...`);

    const { data: words, error } = await supabase
      .from("hangman_pool")
      .select("w, tr")
      .eq("lang", state.lang)
      .eq("level", state.level);

    if (error) {
      console.error("hangman_pool error:", error);
      setGate("Kelime havuzu alınamadı.");
      disableStartBtn(true, "HATA");
      return;
    }

    state.pool = Array.isArray(words)
      ? words.filter((x) => x && x.w && String(x.w).trim())
      : [];

    let best = 0;
    const bestMap = gate.profile?.hangman_best || {};
    if (bestMap && typeof bestMap === "object") {
      const key = `${state.lang}::${state.level}`;
      best = Number(bestMap[key] || 0);
    }
    if ($("bestVal")) $("bestVal").textContent = String(best);

    if (!state.pool.length) {
      setGate(`${state.lang.toUpperCase()} • ${state.level} için havuz boş.`);
      disableStartBtn(true, "HAZIR DEĞİL");
      return;
    }

    setGate(`${state.lang.toUpperCase()} • ${state.level} HAZIR`);
    disableStartBtn(false, "BAŞLA");
  } catch (err) {
    console.error("loadGameData failed:", err);
    setGate("Beklenmeyen bir hata oluştu.");
    disableStartBtn(true, "HATA");
  }
}

async function updateBestScore(newScore) {
  try {
    if (state.userId === "anon") return;

    const key = `${state.lang}::${state.level}`;
    const { data: prof } = await supabase
      .from("profiles")
      .select("hangman_best")
      .eq("id", state.userId)
      .maybeSingle();

    let map = prof?.hangman_best || {};
    if (newScore > (map[key] || 0)) {
      map[key] = newScore;
      await supabase
        .from("profiles")
        .update({ hangman_best: map })
        .eq("id", state.userId);

      if ($("bestVal")) $("bestVal").textContent = String(newScore);
    }
  } catch (err) {
    console.error("updateBestScore failed:", err);
  }
}

/* -----------------------------
   GAME LOGIC
----------------------------- */
function pickWord() {
  if (!state.pool.length) return null;
  if (state.pool.length === 1) return state.pool[0];

  let tries = 0;
  let chosen = null;

  do {
    chosen = state.pool[Math.floor(Math.random() * state.pool.length)];
    tries++;
  } while (tries < 10 && chosen?.w === state.lastWord);

  return chosen;
}

function startRound() {
  if (!state.pool.length) return;

  state.lock = false;
  state.guessed.clear();
  state.mistakes = 0;
  state.roundScore = 100;
  state.flawless = true;
  state.jokerUsed = false;

  $("j0")?.classList.remove("spent");
  $("j1")?.classList.remove("spent");

  state.target = pickWord();

  if (!state.target?.w) {
    setGate("Kelime seçilemedi.");
    return;
  }

  state.lastWord = state.target.w;

  renderWord();
  renderKeyboard();
  renderHearts();
  resetMan();

  if ($("trText")) $("trText").textContent = String(state.target.tr || "—").toUpperCase();
  if ($("scoreVal")) $("scoreVal").textContent = String(state.totalScore);
}

function renderWord() {
  const w = String(state.target?.w || "").toUpperCase();
  if (!$("matrix")) return;

  $("matrix").innerHTML = w.split("").map((ch) => {
    const isLetter = /[A-Z]/.test(ch);
    const found = !isLetter || state.guessed.has(ch);

    return `
      <div class="slot ${found && isLetter ? "found" : ""}">
        ${found ? escapeHtml(ch) : ""}
      </div>
    `;
  }).join("");
}

function renderKeyboard() {
  if (!$("kb")) return;

  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  $("kb").innerHTML = abc.map((l) =>
    `<button class="key" id="key-${l}" data-l="${l}">${l}</button>`
  ).join("");

  $("kb").querySelectorAll(".key").forEach((btn) => {
    btn.onclick = () => makeGuess(btn.dataset.l);
  });
}

function makeGuess(l) {
  if (!state.target?.w) return;
  if (state.lock || state.guessed.has(l)) return;

  state.guessed.add(l);

  const btn = $(`key-${l}`);
  const w = String(state.target.w).toUpperCase();

  if (w.includes(l)) {
    btn?.classList.add("hit");
    renderWord();

    const completed = w
      .split("")
      .filter((ch) => /[A-Z]/.test(ch))
      .every((ch) => state.guessed.has(ch));

    if (completed) endRound(true);
  } else {
    btn?.classList.add("miss");
    state.mistakes++;
    state.flawless = false;
    state.roundScore = Math.max(0, state.roundScore - 15);
    updateMan(state.mistakes);

    if (state.mistakes >= 6) endRound(false);
  }
}

function updateMan(errs) {
  const seq = ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"];
  seq.forEach((id, i) => $(id)?.classList.toggle("on", i < errs));
  $("man")?.classList.toggle("swing", errs >= 6);
}

function resetMan() {
  ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"].forEach((id) => {
    $(id)?.classList.remove("on");
  });
  $("man")?.classList.remove("swing");
}

function renderHearts() {
  if (!$("hearts")) return;

  let html = "";
  for (let i = 0; i < state.lives; i++) {
    html += `<span class="heart">❤️</span>`;
  }
  $("hearts").innerHTML = html;
}

async function endRound(win) {
  state.lock = true;

  if (win) {
    state.totalScore += state.roundScore;
    if (state.flawless && !state.jokerUsed && state.lives < state.MAX_LIVES) {
      state.lives++;
    }
    await updateBestScore(state.totalScore);
  } else {
    state.lives--;
  }

  renderHearts();

  if ($("mTitle")) {
    $("mTitle").textContent = win ? "BAŞARILI!" : "MİSYON BAŞARISIZ";
    $("mTitle").style.color = win ? "var(--green)" : "var(--red)";
  }
  if ($("mWord")) $("mWord").textContent = String(state.target?.w || "").toUpperCase();
  if ($("mTr")) $("mTr").textContent = `(${state.target?.tr || "—"})`;
  $("modal")?.classList.add("on");
}

/* -----------------------------
   JOKERS
----------------------------- */
function useJ(i) {
  if (state.lock || !state.target?.w) return;

  const b = $(`j${i}`);
  if (!b || b.classList.contains("spent")) return;

  state.jokerUsed = true;
  b.classList.add("spent");
  state.roundScore = Math.max(0, state.roundScore - 20);

  const remaining = String(state.target.w)
    .toUpperCase()
    .split("")
    .filter((l) => /[A-Z]/.test(l) && !state.guessed.has(l));

  if (remaining.length > 0) {
    makeGuess(remaining[0]);
  }
}

$("j0") && ($("j0").onclick = () => useJ(0));
$("j1") && ($("j1").onclick = () => useJ(1));

$("mBtn") && ($("mBtn").onclick = () => {
  $("modal")?.classList.remove("on");

  if (state.lives > 0) {
    startRound();
  } else {
    const again = confirm(`Oyun bitti! Skor: ${state.totalScore}. Yeniden başla?`);
    if (again) {
      state.totalScore = 0;
      state.lives = 3;
      if ($("scoreVal")) $("scoreVal").textContent = "0";
      renderHearts();
      startRound();
    } else {
      location.href = "/pages/game_menu.html";
    }
  }
});

$("realStartBtn") && ($("realStartBtn").onclick = () => {
  if (!state.placementOk) {
    alert("Önce seviye tespit sınavını tamamlamalısın.");
    return;
  }

  if (!state.pool.length) {
    alert("Bu dil ve seviyede henüz oyun havuzu bulunamadı.");
    return;
  }

  if ($("readyGate")) $("readyGate").style.display = "none";
  startRound();
});

/* -----------------------------
   BOOT
----------------------------- */
loadGameData();
