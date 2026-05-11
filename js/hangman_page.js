/* FILE: /js/hangman_page.js */
import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import {
  GAME_LANG_META,
  formatGlobalBest,
  getGameLangFromUrl,
  getLocalHighScore,
  getGlobalBest,
  refreshGameScoreLabels,
  saveGameScore,
  setLocalHighScore,
  speakGameText
} from "/js/game_score_helper.js";

const $ = (id) => document.getElementById(id);
const PARAMS = new URLSearchParams(location.search);
const URL_LANG = PARAMS.get("lang");
const HAS_GAME_MENU_LANG = ["en", "de", "fr", "es", "it"].includes(String(URL_LANG || "").toLowerCase());
const IS_PUBLIC_GAME =
  PARAMS.get("public") === "1" ||
  PARAMS.get("from_public_games") === "1" ||
  document.referrer.includes("/pages/game_menu_public.html");

const PUBLIC_BACK_URL = "/pages/game_menu_public.html";
const PRIVATE_BACK_URL = "/pages/game_menu.html";
const WORD_BUCKET = "lang";
const GAME_SLUG = "hangman";
const MAX_MISTAKES = 6;

const LANG_FILE_MAP = {
  en: "en.json",
  de: "de.json",
  es: "es.json",
  fr: "fr.json",
  it: "it.json"
};

const LOCAL_FALLBACK_POOL = {
  en: [
    { w: "APPLE", tr: "Elma" }, { w: "HOUSE", tr: "Ev" }, { w: "WATER", tr: "Su" },
    { w: "LIGHT", tr: "Işık" }, { w: "WORLD", tr: "Dünya" }, { w: "FRIEND", tr: "Arkadaş" },
    { w: "SCHOOL", tr: "Okul" }, { w: "FAMILY", tr: "Aile" }, { w: "MUSIC", tr: "Müzik" },
    { w: "TRAVEL", tr: "Seyahat" }
  ],
  de: [
    { w: "HAUS", tr: "Ev" }, { w: "WASSER", tr: "Su" }, { w: "LICHT", tr: "Işık" },
    { w: "FREUND", tr: "Arkadaş" }, { w: "SCHULE", tr: "Okul" }, { w: "FAMILIE", tr: "Aile" }
  ],
  fr: [
    { w: "MAISON", tr: "Ev" }, { w: "EAU", tr: "Su" }, { w: "AMI", tr: "Arkadaş" },
    { w: "ECOLE", tr: "Okul" }, { w: "FAMILLE", tr: "Aile" }, { w: "MUSIQUE", tr: "Müzik" }
  ],
  es: [
    { w: "CASA", tr: "Ev" }, { w: "AGUA", tr: "Su" }, { w: "AMIGO", tr: "Arkadaş" },
    { w: "ESCUELA", tr: "Okul" }, { w: "FAMILIA", tr: "Aile" }, { w: "MUSICA", tr: "Müzik" }
  ],
  it: [
    { w: "CASA", tr: "Ev" }, { w: "ACQUA", tr: "Su" }, { w: "AMICO", tr: "Arkadaş" },
    { w: "SCUOLA", tr: "Okul" }, { w: "FAMIGLIA", tr: "Aile" }, { w: "MUSICA", tr: "Müzik" }
  ]
};

try {
  mountShell({ scroll: "none" });
} catch (error) {
  console.warn("[HANGMAN] shell skipped", error);
}

try {
  const root = getComputedStyle(document.documentElement);
  const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
  document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 10}px` : "0px");
} catch {}

let state = {
  lang: getGameLangFromUrl("en"),
  level: normalizeLevel(PARAMS.get("level") || localStorage.getItem("italky_game_level")) || "A1",
  pool: [],
  usedWords: new Set(),
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
  gameStartedAt: 0,
  scoreSaved: false,
  correctCount: 0,
  wrongCount: 0,
  lastSolvedWord: "",
  lastSolvedLang: "en"
};

function normalizeLevel(value) {
  const raw = String(value || "").trim().toUpperCase();
  return ["A1", "A2", "B1", "B2", "C1", "C2"].includes(raw) ? raw : null;
}

function setGate(message) {
  const el = $("gateInfo");
  if (el) el.textContent = message;
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
  return String(str || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__hangToast);
  window.__hangToast = setTimeout(() => el.classList.remove("show"), 1800);
}

function getBackUrl() {
  return IS_PUBLIC_GAME ? PUBLIC_BACK_URL : PRIVATE_BACK_URL;
}

function cleanHangmanWord(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ß", "SS")
    .replaceAll("ẞ", "SS")
    .replace(/[^A-Z]/g, "");
}

function getGameDurationSeconds() {
  if (!state.gameStartedAt) return 0;
  return Math.max(0, Math.round((Date.now() - state.gameStartedAt) / 1000));
}

function createScoreMetaUi() {
  const scoreBox = document.querySelector(".rightHud .score");
  if (!scoreBox || $("personalBestVal")) return;

  const personal = document.createElement("div");
  personal.className = "best";
  personal.id = "personalBestVal";
  personal.textContent = "SENİN REKORUN: —";

  const global = document.createElement("div");
  global.className = "best";
  global.id = "globalBestVal";
  global.textContent = "GENEL REKOR: —";

  const listen = document.createElement("button");
  listen.className = "joker";
  listen.id = "listenSolvedBtn";
  listen.type = "button";
  listen.title = "Dinle";
  listen.setAttribute("aria-label", "Dinle");
  listen.textContent = "🔊";

  scoreBox.appendChild(personal);
  scoreBox.appendChild(global);
  document.querySelector(".jokerCol")?.appendChild(listen);

  listen.onclick = () => {
    if (!state.lastSolvedWord) {
      toast("Kelimeyi oyun sonunda dinleyebilirsiniz");
      return;
    }
    speakGameText(state.lastSolvedWord, state.lastSolvedLang);
  };
}

async function refreshScoreUi() {
  $("bestVal") && ($("bestVal").textContent = String(getLocalHighScore(GAME_SLUG, state.lang) || 0));
  await refreshGameScoreLabels({
    gameSlug: GAME_SLUG,
    lang: state.lang,
    personalEl: $("personalBestVal"),
    globalEl: $("globalBestVal")
  });
}

function markLocalBestIfNeeded() {
  const previous = getLocalHighScore(GAME_SLUG, state.lang);
  const next = setLocalHighScore(GAME_SLUG, state.lang, state.totalScore);
  $("bestVal") && ($("bestVal").textContent = String(next || 0));
  $("personalBestVal") && ($("personalBestVal").textContent = `SENİN REKORUN: ${next || "—"}`);
  return state.totalScore > previous;
}

function normalizeWordItem(item, lang, level) {
  if (!item) return null;
  if (typeof item === "string") {
    const w = cleanHangmanWord(item);
    return w ? { w, tr: "—" } : null;
  }
  if (typeof item !== "object") return null;

  const itemLevel = String(item.level || item.seviye || item.cefr || item.difficulty || "").trim().toUpperCase();
  const wantedLevel = String(level || "").trim().toUpperCase();
  if (itemLevel && wantedLevel && itemLevel !== wantedLevel) return null;

  const rawWord = item.w || item.word || item.kelime || item.text || item.value || item.target || item.question || item.answer || item[lang] || item.en || item.de || item.fr || item.es || item.it || "";
  const rawHint = item.tr || item.tr_meaning || item.turkish || item.turkce || item.meaning_tr || item.meaning || item.translation || item.ceviri || item.answer_tr || "—";
  const w = cleanHangmanWord(rawWord);
  return w ? { w, tr: String(rawHint || "—") } : null;
}

function extractWordsFromJson(json, lang, level) {
  const out = [];
  const wantedLevel = String(level || "A1").toUpperCase();
  const pushArray = (arr, strictLevel = true) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      const normalized = normalizeWordItem(item, lang, strictLevel ? wantedLevel : "");
      if (normalized) out.push(normalized);
    });
  };

  if (Array.isArray(json)) {
    pushArray(json, true);
    if (!out.length) pushArray(json, false);
    return out;
  }
  if (!json || typeof json !== "object") return out;

  if (Array.isArray(json[wantedLevel])) {
    pushArray(json[wantedLevel], false);
    return out;
  }
  if (json.levels && Array.isArray(json.levels[wantedLevel])) {
    pushArray(json.levels[wantedLevel], false);
    return out;
  }

  ["words", "data", "items", "list", "pool", "vocabulary", "kelimeler"].forEach((key) => pushArray(json[key], true));
  if (out.length) return out;

  Object.values(json).forEach((value) => pushArray(value, true));
  if (out.length) return out;

  ["words", "data", "items", "list", "pool", "vocabulary", "kelimeler"].forEach((key) => pushArray(json[key], false));
  Object.values(json).forEach((value) => pushArray(value, false));
  return out;
}

async function fetchWordsFromLangStorage(lang, level) {
  try {
    const code = GAME_LANG_META[lang] ? lang : "en";
    const fileName = LANG_FILE_MAP[code] || `${code}.json`;
    const { data, error } = await supabase.storage.from(WORD_BUCKET).download(fileName);
    if (error || !data) {
      console.warn("[HANGMAN] word bucket empty", { bucket: WORD_BUCKET, fileName, error });
      return [];
    }
    const json = JSON.parse(await data.text());
    const seen = new Set();
    return extractWordsFromJson(json, code, level)
      .map((item) => ({ w: cleanHangmanWord(item.w), tr: String(item.tr || "—") }))
      .filter((item) => {
        if (!item.w || item.w.length < 2) return false;
        if (seen.has(item.w)) return false;
        seen.add(item.w);
        return true;
      });
  } catch (error) {
    console.warn("[HANGMAN] word load failed", error);
    return [];
  }
}

function getFallbackPool(lang) {
  return (LOCAL_FALLBACK_POOL[lang] || LOCAL_FALLBACK_POOL.en).map((item) => ({
    w: cleanHangmanWord(item.w),
    tr: String(item.tr || "—")
  }));
}

function renderLangCards() {
  const box = $("langGrid");
  if (!box) return;
  box.innerHTML = Object.entries(GAME_LANG_META).map(([code, meta]) => `
    <button class="langCard ${state.lang === code ? "active" : ""}" data-lang="${code}" type="button">
      <div class="langFlag">${meta.flag}</div>
      <div class="langName">${meta.name}</div>
      <div class="langHint">${code.toUpperCase()}</div>
    </button>
  `).join("");
  box.querySelectorAll(".langCard").forEach((btn) => {
    btn.onclick = async () => {
      state.lang = btn.dataset.lang || "en";
      localStorage.setItem("italky_game_lang", state.lang);
      renderLangCards();
      setGate(`${state.lang.toUpperCase()} SEÇİLDİ`);
      await loadGameData();
    };
  });
}

function openLangSheet() { $("langSheet")?.classList.add("show"); }
function closeLangSheet() { $("langSheet")?.classList.remove("show"); }
function openRulesSheet() { $("rulesSheet")?.classList.add("show"); }
function closeRulesSheet() { $("rulesSheet")?.classList.remove("show"); }

async function loadGameData() {
  disableStartBtn(true, "YÜKLENİYOR...");
  setGate("OYUN VERİSİ HAZIRLANIYOR...");

  state.lang = HAS_GAME_MENU_LANG ? getGameLangFromUrl("en") : (GAME_LANG_META[state.lang] ? state.lang : "en");
  state.level = normalizeLevel(PARAMS.get("level") || localStorage.getItem("italky_game_level") || state.level) || "A1";
  localStorage.setItem("italky_game_lang", state.lang);
  localStorage.setItem("italky_game_level", state.level);

  setGate(`${state.lang.toUpperCase()} • ${state.level} YÜKLENİYOR...`);
  let words = await fetchWordsFromLangStorage(state.lang, state.level);
  if (!words.length) {
    console.warn("[HANGMAN] fallback pool used", { lang: state.lang, level: state.level });
    words = getFallbackPool(state.lang);
  }

  state.pool = words;
  await refreshScoreUi();

  if (!state.pool.length) {
    setGate(`${state.lang.toUpperCase()} için oyun havuzu bulunamadı.`);
    disableStartBtn(true, "HAZIR DEĞİL");
    return false;
  }

  setGate(`${state.lang.toUpperCase()} • ${state.level} HAZIR`);
  disableStartBtn(false, "BAŞLA");
  return true;
}

function pickWord() {
  if (!state.pool.length) return null;
  const available = state.pool.filter((item) => item.w !== state.lastWord && !state.usedWords.has(item.w));
  if (!available.length) state.usedWords.clear();
  const list = available.length ? available : state.pool.filter((item) => item.w !== state.lastWord);
  const chosen = (list.length ? list : state.pool)[Math.floor(Math.random() * (list.length ? list.length : state.pool.length))];
  if (chosen?.w) state.usedWords.add(chosen.w);
  return chosen || null;
}

function startRound() {
  if (!state.pool.length) return;
  if (!state.gameStartedAt) state.gameStartedAt = Date.now();
  state.lock = false;
  state.guessed.clear();
  state.mistakes = 0;
  state.roundScore = 100;
  state.flawless = true;
  state.jokerUsed = false;
  state.lastSolvedWord = "";
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
  const word = String(state.target?.w || "").toUpperCase();
  $("matrix").innerHTML = word.split("").map((char) => {
    const isLetter = /[A-Z]/.test(char);
    const found = !isLetter || state.guessed.has(char);
    return `<div class="slot ${found && isLetter ? "found" : ""}">${found ? escapeHtml(char) : ""}</div>`;
  }).join("");
}

function renderKeyboard() {
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  $("kb").innerHTML = abc.map((letter) => `<button class="key" id="key-${letter}" data-l="${letter}" type="button">${letter}</button>`).join("");
  $("kb").querySelectorAll(".key").forEach((btn) => {
    btn.onclick = () => makeGuess(btn.dataset.l);
  });
}

function makeGuess(letter) {
  if (!state.target?.w || state.lock || state.guessed.has(letter)) return;
  state.guessed.add(letter);
  const btn = $(`key-${letter}`);
  const word = String(state.target.w).toUpperCase();

  if (word.includes(letter)) {
    btn?.classList.add("hit");
    state.correctCount += 1;
    renderWord();
    const completed = word.split("").filter((char) => /[A-Z]/.test(char)).every((char) => state.guessed.has(char));
    if (completed) endRound(true);
    return;
  }

  btn?.classList.add("miss");
  state.wrongCount += 1;
  state.mistakes += 1;
  state.flawless = false;
  state.roundScore = Math.max(0, state.roundScore - 15);
  updateMan(state.mistakes);
  if (state.mistakes >= MAX_MISTAKES) endRound(false);
}

function updateMan(errorCount) {
  const seq = ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"];
  seq.forEach((id, index) => $(id)?.classList.toggle("on", index < errorCount));
  $("man")?.classList.toggle("swing", errorCount >= MAX_MISTAKES);
}

function resetMan() {
  ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"].forEach((id) => $(id)?.classList.remove("on"));
  $("man")?.classList.remove("swing");
}

function renderHearts() {
  $("hearts").innerHTML = Array.from({ length: state.lives }).map(() => `<span class="heart">❤️</span>`).join("");
}

async function endRound(win) {
  state.lock = true;
  const solvedWord = String(state.target?.w || "").toUpperCase();
  const solvedHint = String(state.target?.tr || "—");
  state.lastSolvedWord = solvedWord;
  state.lastSolvedLang = state.lang;

  if (win) {
    state.totalScore += state.roundScore;
    if (state.flawless && !state.jokerUsed && state.lives < state.MAX_LIVES) state.lives += 1;
    const isNewBest = markLocalBestIfNeeded();
    if (isNewBest) toast("Yeni kişisel rekor!");
  } else {
    state.lives -= 1;
  }

  renderHearts();
  $("mTitle").textContent = win ? "BAŞARILI!" : "DOĞRU CEVAP";
  $("mTitle").style.color = win ? "var(--green)" : "#60a5fa";
  $("mWord").textContent = solvedWord;
  $("mTr").textContent = `(${solvedHint})`;
  $("modal").classList.add("on");
  speakGameText(solvedWord, state.lang);
}

function useJ(index) {
  if (state.lock || !state.target?.w) return;
  const button = $(`j${index}`);
  if (!button || button.classList.contains("spent")) return;
  state.jokerUsed = true;
  button.classList.add("spent");
  state.roundScore = Math.max(0, state.roundScore - 20);
  const remaining = String(state.target.w).toUpperCase().split("").filter((letter) => /[A-Z]/.test(letter) && !state.guessed.has(letter));
  if (remaining.length) makeGuess(remaining[0]);
}

async function finishGameAndSave() {
  if (state.scoreSaved) return;
  state.scoreSaved = true;
  const beforeGlobal = await getGlobalBest(GAME_SLUG, state.lang);
  const beforeScore = Number(beforeGlobal?.score || 0) || 0;
  await saveGameScore({
    gameSlug: GAME_SLUG,
    lang: state.lang,
    score: state.totalScore,
    correctCount: state.correctCount,
    wrongCount: state.wrongCount,
    durationSeconds: getGameDurationSeconds()
  });
  const afterGlobal = await getGlobalBest(GAME_SLUG, state.lang);
  if (state.totalScore > beforeScore && Number(afterGlobal?.score || 0) === state.totalScore) {
    toast("Yeni genel rekor!");
  }
  $("globalBestVal") && ($("globalBestVal").textContent = formatGlobalBest(afterGlobal));
  await refreshScoreUi();
}

function resetGameState() {
  state.totalScore = 0;
  state.lives = 3;
  state.gameStartedAt = Date.now();
  state.scoreSaved = false;
  state.correctCount = 0;
  state.wrongCount = 0;
  state.lastSolvedWord = "";
  $("scoreVal") && ($("scoreVal").textContent = "0");
  renderHearts();
}

$("j0").onclick = () => useJ(0);
$("j1").onclick = () => useJ(1);

$("mBtn").onclick = async () => {
  $("modal")?.classList.remove("on");
  if (state.lives > 0) {
    startRound();
    return;
  }

  await finishGameAndSave();
  const again = confirm(`Oyun bitti! Skor: ${state.totalScore}. Yeniden başla?`);
  if (again) {
    resetGameState();
    startRound();
  } else {
    location.href = getBackUrl();
  }
};

$("realStartBtn").onclick = () => {
  if (!state.pool.length) {
    toast("Bu dil için oyun havuzu hazır değil");
    return;
  }
  $("readyGate").style.display = "none";
  resetGameState();
  startRound();
};

$("langChangeBtn").onclick = () => openLangSheet();
$("langSheetClose").onclick = () => closeLangSheet();
$("toRulesBtn").onclick = async () => {
  closeLangSheet();
  await loadGameData();
  openRulesSheet();
};
$("rulesClose").onclick = () => closeRulesSheet();
$("finishRulesBtn").onclick = async () => {
  closeRulesSheet();
  await loadGameData();
};

window.onload = async () => {
  createScoreMetaUi();
  renderLangCards();
  renderHearts();
  const ready = await loadGameData();

  if (HAS_GAME_MENU_LANG && ready) {
    $("langChangeBtn")?.style.setProperty("display", "none");
    $("readyGate").style.display = "none";
    resetGameState();
    startRound();
    return;
  }

  if (!HAS_GAME_MENU_LANG) {
    setGate(`${state.lang.toUpperCase()} • ${state.level} HAZIR`);
  }
};
