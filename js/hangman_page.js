/* FILE: /js/hangman_page.js */
import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

const $ = (id) => document.getElementById(id);

const PUBLIC_PARAMS = new URLSearchParams(location.search);
const IS_PUBLIC_GAME =
  PUBLIC_PARAMS.get("public") === "1" ||
  PUBLIC_PARAMS.get("from_public_games") === "1" ||
  document.referrer.includes("/pages/game_menu_public.html");

const PUBLIC_BACK_URL = "/pages/game_menu_public.html";
const PRIVATE_BACK_URL = "/pages/game_menu.html";

// UI shell
try {
  mountShell({ scroll: "none" });
} catch (e) {
  console.warn("[hangman shell]", e);
}

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

function normalizeLang(v) {
  return String(v || "en").trim().toLowerCase();
}

function normalizeLevel(v) {
  const raw = String(v || "").trim().toUpperCase();
  const allowed = ["A1", "A2", "B1", "B2", "C1", "C2"];
  return allowed.includes(raw) ? raw : null;
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

function toast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__hangToast);
  window.__hangToast = setTimeout(() => {
    el.classList.remove("show");
  }, 1600);
}

function getBackUrl() {
  return IS_PUBLIC_GAME ? PUBLIC_BACK_URL : PRIVATE_BACK_URL;
}

function speakText(text) {
  const t = String(text || "").trim();
  if (!t) return;

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      const map = {
        en: "en-US",
        de: "de-DE",
        fr: "fr-FR",
        es: "es-ES",
        it: "it-IT"
      };
      window.NativeTTS.speak(t, map[state.lang] || "en-US");
      return;
    }
  } catch (e) {
    console.warn("NativeTTS failed:", e);
  }

  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(t);
    const map = {
      en: "en-US",
      de: "de-DE",
      fr: "fr-FR",
      es: "es-ES",
      it: "it-IT"
    };
    utter.lang = map[state.lang] || "en-US";
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;

    const voices = window.speechSynthesis.getVoices?.() || [];
    const found = voices.find(v =>
      String(v.lang || "").toLowerCase().startsWith(String(utter.lang).split("-")[0].toLowerCase())
    );
    if (found) utter.voice = found;

    setTimeout(() => {
      try { window.speechSynthesis.speak(utter); } catch {}
    }, 120);
  } catch (e) {
    console.warn("speechSynthesis failed:", e);
  }
}

/* -----------------------------
   LOCAL FALLBACK WORD POOL
----------------------------- */
const LOCAL_FALLBACK_POOL = {
  en: [
    { w: "APPLE", tr: "Elma" },
    { w: "HOUSE", tr: "Ev" },
    { w: "WATER", tr: "Su" },
    { w: "LIGHT", tr: "Işık" },
    { w: "WORLD", tr: "Dünya" },
    { w: "FRIEND", tr: "Arkadaş" },
    { w: "SCHOOL", tr: "Okul" },
    { w: "FAMILY", tr: "Aile" },
    { w: "MUSIC", tr: "Müzik" },
    { w: "TRAVEL", tr: "Seyahat" }
  ],
  de: [
    { w: "HAUS", tr: "Ev" },
    { w: "WASSER", tr: "Su" },
    { w: "LICHT", tr: "Işık" },
    { w: "FREUND", tr: "Arkadaş" },
    { w: "SCHULE", tr: "Okul" },
    { w: "FAMILIE", tr: "Aile" }
  ],
  fr: [
    { w: "MAISON", tr: "Ev" },
    { w: "EAU", tr: "Su" },
    { w: "AMI", tr: "Arkadaş" },
    { w: "ECOLE", tr: "Okul" },
    { w: "FAMILLE", tr: "Aile" },
    { w: "MUSIQUE", tr: "Müzik" }
  ],
  es: [
    { w: "CASA", tr: "Ev" },
    { w: "AGUA", tr: "Su" },
    { w: "AMIGO", tr: "Arkadaş" },
    { w: "ESCUELA", tr: "Okul" },
    { w: "FAMILIA", tr: "Aile" },
    { w: "MUSICA", tr: "Müzik" }
  ],
  it: [
    { w: "CASA", tr: "Ev" },
    { w: "ACQUA", tr: "Su" },
    { w: "AMICO", tr: "Arkadaş" },
    { w: "SCUOLA", tr: "Okul" },
    { w: "FAMIGLIA", tr: "Aile" },
    { w: "MUSICA", tr: "Müzik" }
  ]
};

function getFallbackPool(lang) {
  const list = LOCAL_FALLBACK_POOL[normalizeLang(lang)] || LOCAL_FALLBACK_POOL.en;
  return list.map((x) => ({
    w: String(x.w || "").toUpperCase(),
    tr: String(x.tr || "—")
  }));
}

/* -----------------------------
   STATE
----------------------------- */
let state = {
  lang: normalizeLang(qp("lang") || localStorage.getItem("italky_game_lang") || "en"),
  level: normalizeLevel(qp("level") || localStorage.getItem("italky_game_level")) || "A1",
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
  userId: "anon"
};

const LANG_META = {
  en: { name: "İngilizce", flag: "🇬🇧" },
  de: { name: "Almanca", flag: "🇩🇪" },
  fr: { name: "Fransızca", flag: "🇫🇷" },
  es: { name: "İspanyolca", flag: "🇪🇸" },
  it: { name: "İtalyanca", flag: "🇮🇹" }
};

/* -----------------------------
   LANGUAGE + RULES
----------------------------- */
function renderLangCards() {
  const box = $("langGrid");
  if (!box) return;

  box.innerHTML = Object.entries(LANG_META).map(([code, meta]) => `
    <button class="langCard ${state.lang === code ? "active" : ""}" data-lang="${code}" type="button">
      <div class="langFlag">${meta.flag}</div>
      <div class="langName">${meta.name}</div>
      <div class="langHint">${code.toUpperCase()}</div>
    </button>
  `).join("");

  box.querySelectorAll(".langCard").forEach(btn => {
    btn.onclick = () => {
      state.lang = normalizeLang(btn.dataset.lang);
      localStorage.setItem("italky_game_lang", state.lang);
      renderLangCards();
      setGate(`${state.lang.toUpperCase()} SEÇİLDİ`);
    };
  });
}

function openLangSheet() {
  $("langSheet")?.classList.add("show");
}

function closeLangSheet() {
  $("langSheet")?.classList.remove("show");
}

function openRulesSheet() {
  $("rulesSheet")?.classList.add("show");
}

function closeRulesSheet() {
  $("rulesSheet")?.classList.remove("show");
}

/* -----------------------------
   AUTH / DATA LOAD
----------------------------- */
async function fetchWordsFromSupabase(lang, level) {
  const { data: words, error } = await supabase
    .from("hangman_pool")
    .select("w, tr")
    .eq("lang", lang)
    .eq("level", level);

  if (error) {
    console.warn("hangman_pool exact level error:", error);
    return [];
  }

  return Array.isArray(words)
    ? words.filter(x => x && x.w && String(x.w).trim())
    : [];
}

async function fetchWordsAnyLevel(lang) {
  const { data: words, error } = await supabase
    .from("hangman_pool")
    .select("w, tr, level")
    .eq("lang", lang);

  if (error) {
    console.warn("hangman_pool any level error:", error);
    return [];
  }

  return Array.isArray(words)
    ? words.filter(x => x && x.w && String(x.w).trim())
    : [];
}

async function loadGameData() {
  try {
    disableStartBtn(true, "YÜKLENİYOR...");
    setGate("OYUN VERİSİ HAZIRLANIYOR...");

    const {
      data: { session }
    } = await supabase.auth.getSession();

    state.userId = session?.user?.id || "anon";

    state.lang = normalizeLang(
      qp("lang") ||
      localStorage.getItem("italky_game_lang") ||
      state.lang ||
      "en"
    );

    state.level = normalizeLevel(
      qp("level") ||
      localStorage.getItem("italky_game_level") ||
      state.level ||
      "A1"
    ) || "A1";

    localStorage.setItem("italky_game_lang", state.lang);
    localStorage.setItem("italky_game_level", state.level);

    setGate(`${state.lang.toUpperCase()} • ${state.level} YÜKLENİYOR...`);

    let words = await fetchWordsFromSupabase(state.lang, state.level);

    if (!words.length) {
      console.warn("Exact level pool empty, trying any level for lang:", state.lang);
      words = await fetchWordsAnyLevel(state.lang);
    }

    if (!words.length) {
      console.warn("Supabase pool empty, using local fallback:", state.lang);
      words = getFallbackPool(state.lang);
      setGate(`${state.lang.toUpperCase()} • YEDEK HAVUZ HAZIR`);
    }

    state.pool = Array.isArray(words)
      ? words.filter(x => x && x.w && String(x.w).trim()).map((x) => ({
          w: String(x.w || "").toUpperCase(),
          tr: String(x.tr || "—")
        }))
      : [];

    let best = 0;
    if (state.userId !== "anon") {
      const { data: prof } = await supabase
        .from("profiles")
        .select("hangman_best")
        .eq("id", state.userId)
        .maybeSingle();

      if (prof?.hangman_best) {
        const key = `${state.lang}::${state.level}`;
        best = prof.hangman_best?.[key] || 0;
      }
    }

    const bestEl = $("bestVal");
    if (bestEl) bestEl.textContent = String(best);

    if (!state.pool.length) {
      setGate(`${state.lang.toUpperCase()} için oyun havuzu bulunamadı.`);
      disableStartBtn(true, "HAZIR DEĞİL");
      return;
    }

    setGate(`${state.lang.toUpperCase()} • ${state.level} HAZIR`);
    disableStartBtn(false, "BAŞLA");
  } catch (err) {
    console.error("loadGameData failed:", err);

    state.pool = getFallbackPool(state.lang);

    if (state.pool.length) {
      setGate(`${state.lang.toUpperCase()} • YEDEK HAVUZ HAZIR`);
      disableStartBtn(false, "BAŞLA");
    } else {
      setGate("Beklenmeyen bir hata oluştu.");
      disableStartBtn(true, "HATA");
    }
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

      $("bestVal").textContent = String(newScore);
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

  $("trText").textContent = String(state.target.tr || "—").toUpperCase();
  $("scoreVal").textContent = String(state.totalScore);
}

function renderWord() {
  const w = String(state.target?.w || "").toUpperCase();
  $("matrix").innerHTML = w.split("").map(ch => {
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
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  $("kb").innerHTML = abc.map(l =>
    `<button class="key" id="key-${l}" data-l="${l}">${l}</button>`
  ).join("");

  $("kb").querySelectorAll(".key").forEach(btn => {
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
      .filter(ch => /[A-Z]/.test(ch))
      .every(ch => state.guessed.has(ch));

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
  ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"].forEach(id => {
    $(id)?.classList.remove("on");
  });
  $("man")?.classList.remove("swing");
}

function renderHearts() {
  let html = "";
  for (let i = 0; i < state.lives; i++) {
    html += `<span class="heart">❤️</span>`;
  }
  $("hearts").innerHTML = html;
}

async function endRound(win) {
  state.lock = true;

  const solvedWord = String(state.target?.w || "").toUpperCase();
  const solvedTr = String(state.target?.tr || "—");

  speakText(solvedWord);

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

  $("mTitle").textContent = win ? "BAŞARILI!" : "DOĞRU CEVAP";
  $("mTitle").style.color = win ? "var(--green)" : "#60a5fa";
  $("mWord").textContent = solvedWord;
  $("mTr").textContent = `(${solvedTr})`;
  $("modal").classList.add("on");
}

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
    .filter(l => /[A-Z]/.test(l) && !state.guessed.has(l));

  if (remaining.length > 0) {
    makeGuess(remaining[0]);
  }
}

$("j0").onclick = () => useJ(0);
$("j1").onclick = () => useJ(1);

$("mBtn").onclick = () => {
  $("modal").classList.remove("on");

  if (state.lives > 0) {
    startRound();
  } else {
    const again = confirm(`Oyun bitti! Skor: ${state.totalScore}. Yeniden başla?`);
    if (again) {
      state.totalScore = 0;
      state.lives = 3;
      $("scoreVal").textContent = "0";
      renderHearts();
      startRound();
    } else {
      location.href = getBackUrl();
    }
  }
};

$("realStartBtn").onclick = () => {
  if (!state.pool.length) {
    alert("Bu dil ve seviyede henüz oyun havuzu bulunamadı.");
    return;
  }

  $("readyGate").style.display = "none";
  startRound();
};

/* -----------------------------
   LANGUAGE + RULES EVENTS
----------------------------- */
$("langChangeBtn").onclick = () => {
  openLangSheet();
};

$("langSheetClose").onclick = () => {
  closeLangSheet();
};

$("toRulesBtn").onclick = async () => {
  closeLangSheet();
  await loadGameData();
  openRulesSheet();
};

$("rulesClose").onclick = () => {
  closeRulesSheet();
};

$("finishRulesBtn").onclick = async () => {
  closeRulesSheet();
  await loadGameData();
};

/* -----------------------------
   BOOT
----------------------------- */
window.onload = async () => {
  renderLangCards();
  openLangSheet();
  await loadGameData();
};
