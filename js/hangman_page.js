// FILE: /js/hangman_page.js

import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";

const $ = (id) => document.getElementById(id);

/* -----------------------------
   UI SHELL
----------------------------- */
mountShell({ scroll: "none" });

function syncShellLift() {
  try {
    const root = getComputedStyle(document.documentElement);
    const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
    document.documentElement.style.setProperty(
      "--shellLift",
      footerH ? `${footerH + 12}px` : "0px"
    );
  } catch {}
}
syncShellLift();
window.addEventListener("load", () => {
  syncShellLift();
  setTimeout(syncShellLift, 150);
  setTimeout(syncShellLift, 500);
  setTimeout(syncShellLift, 1000);
});
window.addEventListener("resize", syncShellLift);

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

function normalizeLang(v) {
  return String(v || "").trim().toLowerCase();
}

function normalizePlayableWord(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .trim();
}

function toast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = String(msg || "");
  el.classList.add("show");
  clearTimeout(window.__hangmanToastTimer);
  window.__hangmanToastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 1800);
}

function updateTranslationBox(text) {
  const el = $("trText");
  if (el) el.textContent = String(text || "—");
}

/* -----------------------------
   LANGUAGE META
----------------------------- */
const LANG_META = {
  de: { name: "Almanca", flag: "🇩🇪", bcp: "de-DE" },
  en: { name: "İngilizce", flag: "🇬🇧", bcp: "en-US" },
  es: { name: "İspanyolca", flag: "🇪🇸", bcp: "es-ES" },
  fr: { name: "Fransızca", flag: "🇫🇷", bcp: "fr-FR" },
  it: { name: "İtalyanca", flag: "🇮🇹", bcp: "it-IT" }
};

function langTitle(code) {
  return LANG_META[normalizeLang(code)]?.name || String(code || "").toUpperCase();
}

function langFlag(code) {
  return LANG_META[normalizeLang(code)]?.flag || "🌐";
}

function langBCP(code) {
  return LANG_META[normalizeLang(code)]?.bcp || "en-US";
}

/* -----------------------------
   STORAGE URL / BUCKET PROBE
----------------------------- */
function getPublicLangUrl(langCode) {
  const code = normalizeLang(langCode);
  return `https://auth.italky.ai/storage/v1/object/public/lang/${code}.json`;
}

async function fileExists(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      cache: "no-store"
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* -----------------------------
   AUDIO / FX
----------------------------- */
let audioCtx = null;

function getAudioCtx() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function beep({ freq = 440, duration = 0.08, type = "sine", gain = 0.03, when = 0 }) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(g);
  g.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playHitFx() {
  beep({ freq: 720, duration: 0.07, type: "triangle", gain: 0.04 });
  beep({ freq: 920, duration: 0.08, type: "triangle", gain: 0.03, when: 0.05 });
}

function playMissFx() {
  beep({ freq: 220, duration: 0.10, type: "sawtooth", gain: 0.04 });
  beep({ freq: 170, duration: 0.12, type: "sawtooth", gain: 0.03, when: 0.04 });
}

function playWinFx() {
  beep({ freq: 523, duration: 0.09, type: "triangle", gain: 0.05 });
  beep({ freq: 659, duration: 0.09, type: "triangle", gain: 0.05, when: 0.08 });
  beep({ freq: 784, duration: 0.11, type: "triangle", gain: 0.05, when: 0.16 });
  beep({ freq: 1046, duration: 0.15, type: "triangle", gain: 0.05, when: 0.26 });
}

function playLoseFx() {
  beep({ freq: 250, duration: 0.12, type: "square", gain: 0.04 });
  beep({ freq: 180, duration: 0.15, type: "square", gain: 0.04, when: 0.10 });
}

function speakText(text, langCode) {
  const t = String(text || "").trim();
  if (!t || !("speechSynthesis" in window)) return;

  try { window.speechSynthesis.cancel(); } catch {}

  const u = new SpeechSynthesisUtterance(t);
  u.lang = langBCP(langCode);
  u.rate = 0.95;
  u.pitch = 1.0;
  u.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  if (voices?.length) {
    const base = normalizeLang(langCode);
    const found = voices.find(v =>
      String(v.lang || "").toLowerCase().startsWith(base)
    );
    if (found) u.voice = found;
  }

  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch {}
  }, 80);
}

/* -----------------------------
   ACCESS
----------------------------- */
function getGameAccessState() {
  const a = window.__ITALKY_ACCESS__ || {};

  const trialActive =
    a.trialActive === true ||
    a.trial_active === true ||
    Number(a.trialDaysLeft || 0) > 0 ||
    Number(a.trial_days_left || 0) > 0 ||
    Number(a.remainingTrialDays || 0) > 0 ||
    Number(a.remaining_trial_days || 0) > 0;

  const hasPackage =
    a.hasPackage === true ||
    a.has_package === true ||
    a.packageActive === true ||
    a.package_active === true ||
    a.isPremium === true ||
    a.premium === true;

  const educationActive =
    a.educationActive === true ||
    a.education_active === true ||
    a.packageType === "education" ||
    a.package_type === "education";

  const loaded =
    a.loaded === true ||
    a.ready === true ||
    a.accessLoaded === true ||
    a.access_loaded === true ||
    Object.keys(a).length > 0;

  return {
    loaded,
    allowed: trialActive || hasPackage || educationActive
  };
}

async function waitForAccessState(maxMs = 4000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const s = getGameAccessState();
    if (s.loaded) return s;
    await new Promise((r) => setTimeout(r, 120));
  }
  return getGameAccessState();
}

/* -----------------------------
   STATE
----------------------------- */
const GAME_LANG_KEY = "italky_hangman_lang";

let state = {
  lang: normalizeLang(qp("lang") || localStorage.getItem(GAME_LANG_KEY) || ""),
  pool: [],
  target: null,
  lastWord: null,
  lives: 5,
  MAX_LIVES: 9,
  totalScore: 0,
  roundScore: 100,
  guessed: new Set(),
  mistakes: 0,
  flawless: true,
  jokerUsed: false,
  lock: false,
  userId: "anon",
  availableLangs: [],
  accessOk: true,
  autoNextTimer: null
};

/* -----------------------------
   AUTH
----------------------------- */
async function bootSession() {
  const ok = await ensureAuthAndCacheUser();
  if (!ok) {
    location.replace("/pages/login.html");
    return false;
  }

  try {
    const { data } = await supabase.auth.getUser();
    state.userId = data?.user?.id || "anon";
  } catch {
    state.userId = "anon";
  }

  const access = await waitForAccessState();
  state.accessOk = !access.loaded || access.allowed;

  if (!state.accessOk) {
    setGate("Oyun erişimi kapalı.");
    disableStartBtn(true, "KİLİTLİ");
    toast("Bu modül için erişim gerekli");
    setTimeout(() => {
      location.href = "/pages/upgrade_pack.html";
    }, 800);
    return false;
  }

  return true;
}

/* -----------------------------
   LANGUAGE SHEET
----------------------------- */
function closeLangSheet() {
  $("langSheet")?.classList.remove("show");
}

function renderLangGrid() {
  const grid = $("langGrid");
  if (!grid) return;

  grid.innerHTML = state.availableLangs.map((code) => {
    const active = code === state.lang ? "active" : "";
    return `
      <button class="langCard ${active}" type="button" data-lang="${escapeHtml(code)}">
        <div class="langFlag">${escapeHtml(langFlag(code))}</div>
        <div class="langName">${escapeHtml(langTitle(code))}</div>
        <div class="langHint">${active ? "Seçili" : "Dokun ve seç"}</div>
      </button>
    `;
  }).join("");

  grid.querySelectorAll(".langCard").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const picked = normalizeLang(btn.dataset.lang);
      if (!picked) return;

      state.lang = picked;
      localStorage.setItem(GAME_LANG_KEY, picked);
      localStorage.setItem("italky_game_lang", picked);

      renderLangGrid();
      closeLangSheet();

      const ok = await loadWordsForLang(picked);
      if (ok && $("readyGate")) {
        $("readyGate").dataset.ready = "1";
      }
    });
  });
}

function openLangSheet() {
  renderLangGrid();
  $("langSheet")?.classList.add("show");
}

/* -----------------------------
   DATA LOAD
----------------------------- */
async function loadAvailableLangsFromBucket() {
  try {
    const candidates = ["de", "en", "es", "fr", "it"];
    const found = [];

    for (const code of candidates) {
      const url = getPublicLangUrl(code);
      const ok = await fileExists(url);
      if (ok) found.push(code);
    }

    state.availableLangs = found;
    return found.length > 0;
  } catch (err) {
    console.error("bucket lang probe error:", err);
    state.availableLangs = [];
    return false;
  }
}

async function loadAvailableLangs() {
  setGate("Oyun dilleri hazırlanıyor...");
  disableStartBtn(true, "YÜKLENİYOR...");

  const ok = await loadAvailableLangsFromBucket();

  if (!ok || !state.availableLangs.length) {
    setGate("Henüz oyun dili bulunamadı.");
    disableStartBtn(true, "HAZIR DEĞİL");
    return false;
  }

  if (!state.lang || !state.availableLangs.includes(state.lang)) {
    state.lang = state.availableLangs[0];
  }

  return true;
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const keys = ["items", "words", "data", "list", "entries", "pool"];
    for (const key of keys) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
}

function normalizeBucketItems(items) {
  return items
    .map((item) => {
      if (typeof item === "string") {
        const w = normalizePlayableWord(item);
        return { w, tr: item };
      }

      const rawWord =
        item?.word ??
        item?.w ??
        item?.text ??
        item?.term ??
        item?.answer ??
        item?.source ??
        "";

      const rawMeaning =
        item?.meaning ??
        item?.tr ??
        item?.translation ??
        item?.mean ??
        item?.hint ??
        item?.target ??
        "";

      const w = normalizePlayableWord(rawWord);
      const tr = String(rawMeaning || "").trim();

      return { w, tr };
    })
    .filter((x) => x.w);
}

async function loadWordsFromBucket(langCode) {
  try {
    const url = getPublicLangUrl(langCode);
    if (!url) return [];

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];

    const json = await res.json();
    const items = extractItems(json);
    return normalizeBucketItems(items);
  } catch (err) {
    console.error("bucket word load error:", err);
    return [];
  }
}

async function loadWordsForLang(langCode) {
  state.lang = normalizeLang(langCode);
  localStorage.setItem(GAME_LANG_KEY, state.lang);
  localStorage.setItem("italky_game_lang", state.lang);

  setGate(`${langFlag(state.lang)} ${langTitle(state.lang)} yükleniyor...`);
  disableStartBtn(true, "YÜKLENİYOR...");

  state.pool = await loadWordsFromBucket(state.lang);

  const bestKey = `hangman::${state.lang}`;
  let best = 0;

  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("hangman_best")
      .eq("id", state.userId)
      .maybeSingle();

    const bestMap = prof?.hangman_best || {};
    if (bestMap && typeof bestMap === "object") {
      best = Number(bestMap[bestKey] || 0);
    }
  } catch (err) {
    console.error("best score read error:", err);
  }

  if ($("bestVal")) $("bestVal").textContent = String(best);

  if (!state.pool.length) {
    setGate(`${langTitle(state.lang)} için havuz boş.`);
    disableStartBtn(false, "TEKRAR DENE");
    return false;
  }

  setGate(`${langFlag(state.lang)} ${langTitle(state.lang)} hazır`);
  disableStartBtn(false, "BAŞLA");
  toast(`${langTitle(state.lang)} seçildi`);
  return true;
}

async function updateBestScore(newScore) {
  try {
    if (state.userId === "anon") return;

    const key = `hangman::${state.lang}`;
    const { data: prof } = await supabase
      .from("profiles")
      .select("hangman_best")
      .eq("id", state.userId)
      .maybeSingle();

    let map = prof?.hangman_best || {};
    if (newScore > Number(map[key] || 0)) {
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
function speakCurrentWord() {
  if (!state.target?.w) return;
  speakText(state.target.w, state.lang);
}

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
  if (state.autoNextTimer) {
    clearTimeout(state.autoNextTimer);
    state.autoNextTimer = null;
  }

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
  updateTranslationBox(state.target.tr || "—");

  if ($("scoreVal")) $("scoreVal").textContent = String(state.totalScore);

  setTimeout(() => {
    speakCurrentWord();
  }, 250);
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
    playHitFx();
    renderWord();

    const completed = w
      .split("")
      .filter((ch) => /[A-Z]/.test(ch))
      .every((ch) => state.guessed.has(ch));

    if (completed) endRound(true);
  } else {
    btn?.classList.add("miss");
    playMissFx();
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
    playWinFx();
    await updateBestScore(state.totalScore);
  } else {
    state.lives--;
    playLoseFx();
  }

  renderHearts();

  if ($("mTitle")) {
    $("mTitle").textContent = win ? "OYUN BAŞARILI" : "OYUN BAŞARISIZ";
    $("mTitle").style.color = win ? "var(--green)" : "var(--red)";
  }
  if ($("mWord")) $("mWord").textContent = String(state.target?.w || "").toUpperCase();
  if ($("mTr")) $("mTr").textContent = `(${state.target?.tr || "—"})`;

  $("modal")?.classList.add("on");

  speakText(state.target.w, state.lang);

  state.autoNextTimer = setTimeout(() => {
    $("modal")?.classList.remove("on");

    if (state.lives <= 0) {
      state.totalScore = 0;
      state.lives = 5;
      if ($("scoreVal")) $("scoreVal").textContent = "0";
      renderHearts();
    }

    startRound();
  }, 3000);
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

/* -----------------------------
   EVENTS
----------------------------- */
$("j0") && ($("j0").onclick = () => useJ(0));
$("j1") && ($("j1").onclick = () => useJ(1));

$("realStartBtn") && ($("realStartBtn").onclick = async () => {
  if (!state.lang || !$("readyGate")?.dataset.ready) {
    const ok = await prepareLanguageAndData(false);
    if (!ok) return;
  }

  if (!state.pool.length) {
    toast("Bu dilde henüz oyun havuzu bulunamadı");
    return;
  }

  if ($("readyGate")) $("readyGate").style.display = "none";
  startRound();
});

$("langChangeBtn")?.addEventListener("click", () => {
  openLangSheet();
});

$("langSheetClose")?.addEventListener("click", () => {
  closeLangSheet();
});

$("langSheet")?.addEventListener("click", (e) => {
  if (e.target?.id === "langSheet") closeLangSheet();
});

/* -----------------------------
   START FLOW
----------------------------- */
async function prepareLanguageAndData(forcePick = false) {
  const ok = await loadAvailableLangs();
  if (!ok) return false;

  if (!state.lang || forcePick) {
    renderLangGrid();
    openLangSheet();
    return false;
  }

  return await loadWordsForLang(state.lang);
}

/* -----------------------------
   BOOT
----------------------------- */
(async function boot() {
  const sessionOk = await bootSession();
  if (!sessionOk) return;

  renderHearts();
  if ($("scoreVal")) $("scoreVal").textContent = "0";
  updateTranslationBox("—");

  setGate("Oyun dili hazırlanıyor...");
  disableStartBtn(true, "YÜKLENİYOR...");

  const ok = await prepareLanguageAndData(false);

  if (ok) {
    if ($("readyGate")) $("readyGate").dataset.ready = "1";
    disableStartBtn(false, "BAŞLA");
  } else if (!state.lang) {
    disableStartBtn(true, "DİL SEÇ");
  } else {
    disableStartBtn(false, "BAŞLA");
  }

  try {
    window.speechSynthesis?.getVoices?.();
  } catch {}
})();
