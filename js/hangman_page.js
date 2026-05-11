import {
  GAME_LANG_META,
  formatGlobalBest,
  getGameLangFromUrl,
  getLocalHighScore,
  getGlobalBest,
  refreshGameScoreLabels,
  saveGameScore,
  setLocalHighScore,
  speakGameText,
} from "/js/game_score_helper.js";

const GAME_SLUG = "hangman";
const SUPPORTED_LANGS = Object.keys(GAME_LANG_META);
const MAX_LIVES = 9;
const INITIAL_LIVES = 5;
const JOKERS_PER_ROUND = 2;
const qs = new URLSearchParams(location.search);
const requestedLang = String(qs.get("lang") || "").toLowerCase();
const HAS_GAME_MENU_LANG = SUPPORTED_LANGS.includes(requestedLang);
const selectedLang = getGameLangFromUrl("en");
const $ = (id) => document.getElementById(id);

const BASE_WORDS = [
  { tr: "uyumak", en: "sleep", de: "schlafen", fr: "dormir", es: "dormir", it: "dormire" },
  { tr: "elma", en: "apple", de: "apfel", fr: "pomme", es: "manzana", it: "mela" },
  { tr: "su", en: "water", de: "wasser", fr: "eau", es: "agua", it: "acqua" },
  { tr: "ev", en: "house", de: "haus", fr: "maison", es: "casa", it: "casa" },
  { tr: "kitap", en: "book", de: "buch", fr: "livre", es: "libro", it: "libro" },
  { tr: "arkadaş", en: "friend", de: "freund", fr: "ami", es: "amigo", it: "amico" },
  { tr: "okul", en: "school", de: "schule", fr: "ecole", es: "escuela", it: "scuola" },
  { tr: "pencere", en: "window", de: "fenster", fr: "fenetre", es: "ventana", it: "finestra" },
  { tr: "köprü", en: "bridge", de: "brucke", fr: "pont", es: "puente", it: "ponte" },
  { tr: "seyahat", en: "travel", de: "reisen", fr: "voyage", es: "viaje", it: "viaggio" },
  { tr: "güneş", en: "sun", de: "sonne", fr: "soleil", es: "sol", it: "sole" },
  { tr: "ay", en: "moon", de: "mond", fr: "lune", es: "luna", it: "luna" },
  { tr: "yıldız", en: "star", de: "stern", fr: "etoile", es: "estrella", it: "stella" },
  { tr: "zaman", en: "time", de: "zeit", fr: "temps", es: "tiempo", it: "tempo" },
  { tr: "pazar", en: "market", de: "markt", fr: "marche", es: "mercado", it: "mercato" },
  { tr: "renk", en: "color", de: "farbe", fr: "couleur", es: "color", it: "colore" },
  { tr: "hızlı", en: "quick", de: "schnell", fr: "rapide", es: "rapido", it: "veloce" },
  { tr: "mutlu", en: "happy", de: "glucklich", fr: "heureux", es: "feliz", it: "felice" },
  { tr: "yemek", en: "food", de: "essen", fr: "nourriture", es: "comida", it: "cibo" },
  { tr: "çalışmak", en: "work", de: "arbeit", fr: "travail", es: "trabajo", it: "lavoro" },
];

const state = {
  lang: selectedLang,
  words: [],
  word: "",
  clue: "",
  guessed: new Set(),
  lives: INITIAL_LIVES,
  totalScore: 0,
  gameStartedAt: Date.now(),
  scoreSaved: false,
  correctCount: 0,
  wrongCount: 0,
  lastSolvedWord: "",
  lastSolvedClue: "",
  lastSolvedLang: selectedLang,
  newPersonalBest: false,
  newGlobalBest: false,
  wrongThisRound: false,
  usedJokerThisRound: false,
  roundJokers: JOKERS_PER_ROUND,
  roundEnded: false,
  previousWord: "",
};

let personalBestVal = null;
let globalBestVal = null;
let listenSolvedBtn = null;
let hangAudioCtx = null;

function applyShellLift() {
  try {
    const shell = document.querySelector(".italky-mobile-shell, .bottom-nav, .mobile-nav, [data-italky-shell]");
    const h = shell ? Math.min(92, Math.max(0, shell.getBoundingClientRect().height || 0)) : 0;
    document.documentElement.style.setProperty("--shellLift", h ? `${h + 8}px` : "0px");
  } catch (_) {}
}
applyShellLift();
window.addEventListener("resize", applyShellLift);
window.addEventListener("orientationchange", applyShellLift);

function normalizeWord(word) {
  return String(word || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

function langLabel(lang) {
  return GAME_LANG_META[lang]?.name || GAME_LANG_META.en.name;
}

function getBackUrl() {
  return qs.get("back") || (window.__ITalkyPublicGuest ? "/pages/login_entry.html" : "/pages/game_menu.html");
}

function toast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 1600);
}

function injectHangmanUiPolish() {
  document.body.classList.add("hangman-game-screen");
  if (HAS_GAME_MENU_LANG) document.body.classList.add("hangman-direct-start");
  if ($("hangmanUiPolish")) return;
  const style = document.createElement("style");
  style.id = "hangmanUiPolish";
  style.textContent = `
    body.hangman-game-screen .global-footer,
    body.hangman-game-screen [data-italky-footer],
    body.hangman-game-screen .italky-global-footer{display:none!important}
    body.hangman-game-screen .ready-gate.hidden,
    body.hangman-direct-start #readyGate{display:none!important;pointer-events:none!important;visibility:hidden!important}
    body.hangman-game-screen .dock{bottom:calc(var(--safeB) + var(--shellLift) + 34px)!important;height:204px!important;gap:8px!important;padding:10px!important;box-shadow:0 24px 70px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.14)!important}
    body.hangman-game-screen #pageContent{padding-bottom:calc(204px + var(--shellLift) + var(--safeB) + 58px)!important}
    body.hangman-game-screen .kb{gap:5px!important}
    body.hangman-game-screen .key{min-width:27px!important;height:35px!important;border-radius:11px!important}
    body.hangman-game-screen .hearts{display:grid!important;grid-template-columns:repeat(9,max-content)!important;gap:3px!important;max-width:142px!important}
    body.hangman-game-screen .heart{font-size:16px!important}.heart.lost{opacity:.16;filter:none!important}
    body.hangman-game-screen .jokerCol{align-items:flex-end!important;gap:7px!important}.joker.secondary-joker{display:none!important}.joker.joker-main{width:auto!important;min-width:90px!important;padding:0 12px!important;font-size:13px!important;font-weight:1000!important}
    .hangman-back-btn{position:fixed;top:calc(env(safe-area-inset-top,0px) + 12px);left:14px;z-index:9500;border:1px solid rgba(167,243,208,.25);background:linear-gradient(135deg,rgba(15,23,42,.78),rgba(30,64,175,.48));color:rgba(239,246,255,.94);border-radius:999px;padding:9px 12px;font:900 12px/1 Inter,system-ui,sans-serif;letter-spacing:.2px;box-shadow:0 14px 36px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.12);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
    .hangman-back-btn:active{transform:translateY(1px) scale(.99)}
    .game-over-modal{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;padding:18px;background:radial-gradient(circle at 50% 20%,rgba(34,211,238,.18),transparent 34%),rgba(2,6,23,.74);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
    .game-over-modal.on{display:flex}.game-over-card{width:min(420px,calc(100vw - 28px));max-height:min(86vh,680px);overflow:auto;border:1px solid rgba(125,211,252,.28);border-radius:26px;padding:20px;color:#f8fafc;background:radial-gradient(circle at 12% 0%,rgba(34,211,238,.18),transparent 34%),linear-gradient(150deg,rgba(15,23,42,.96),rgba(30,41,59,.92));box-shadow:0 30px 90px rgba(0,0,0,.56),inset 0 1px 0 rgba(255,255,255,.12)}
    .game-over-eyebrow{color:rgba(125,211,252,.92);font:900 11px/1 Inter,system-ui,sans-serif;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:10px}.game-over-card h2{margin:0 0 12px;font:1000 28px/1.05 Inter,system-ui,sans-serif;letter-spacing:0}
    .game-over-word{border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:12px 14px;margin:12px 0;background:rgba(15,23,42,.52);color:rgba(226,232,240,.9);font:800 14px/1.4 Inter,system-ui,sans-serif}.game-over-word strong{color:#fff;font-size:17px}
    .game-over-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.game-over-stat{min-height:62px;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:10px;background:rgba(2,6,23,.34)}.game-over-stat span{display:block;color:rgba(203,213,225,.72);font:900 10px/1 Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}.game-over-stat b{font:1000 18px/1 Inter,system-ui,sans-serif}.game-over-record{min-height:24px;margin:8px 0 14px;color:#fde68a;font:900 13px/1.35 Inter,system-ui,sans-serif}.game-over-actions{display:grid;gap:10px}.game-over-actions button{border:0;border-radius:18px;min-height:48px;color:#f8fafc;font:1000 14px/1 Inter,system-ui,sans-serif;box-shadow:0 14px 34px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.14)}.game-over-actions .primary{background:linear-gradient(135deg,#06b6d4,#2563eb 58%,#7c3aed)}.game-over-actions .secondary{background:rgba(15,23,42,.74);border:1px solid rgba(148,163,184,.28)}
    @media(max-width:420px){body.hangman-game-screen .dock{bottom:calc(var(--safeB) + var(--shellLift) + 30px)!important;height:198px!important}body.hangman-game-screen #pageContent{padding-bottom:calc(198px + var(--shellLift) + var(--safeB) + 54px)!important}body.hangman-game-screen .key{height:33px!important;min-width:25px!important}.hangman-back-btn{padding:8px 10px;font-size:11px}.game-over-card{padding:18px;border-radius:23px}}
  `;
  document.head.appendChild(style);
}

function hideReadyGate() {
  const gate = $("readyGate");
  if (!gate) return;
  gate.classList.add("hidden");
  gate.style.display = "none";
  gate.setAttribute("aria-hidden", "true");
}

function showReadyGate() {
  const gate = $("readyGate");
  if (!gate) return;
  gate.classList.remove("hidden");
  gate.style.display = "flex";
  gate.setAttribute("aria-hidden", "false");
}

function createBackButton() {
  if ($("hangmanBackBtn")) return;
  const btn = document.createElement("button");
  btn.id = "hangmanBackBtn";
  btn.type = "button";
  btn.className = "hangman-back-btn";
  btn.textContent = "← Oyun Menüsü";
  btn.addEventListener("click", () => { location.href = getBackUrl(); });
  document.body.appendChild(btn);
}

function createScoreMetaUi() {
  const jokerCol = document.querySelector(".jokerCol");
  if (!jokerCol || $("hangmanScoreMeta")) return;
  const meta = document.createElement("div");
  meta.id = "hangmanScoreMeta";
  meta.style.cssText = "display:grid;gap:7px;margin-top:8px;color:rgba(255,255,255,.85);font:900 10px/1.25 Inter,system-ui,sans-serif;letter-spacing:.3px;text-transform:uppercase";
  meta.innerHTML = `
    <div>SENİN REKORUN: <span id="personalBestVal">—</span></div>
    <div id="globalBestVal">GENEL REKOR: —</div>
    <button id="listenSolvedBtn" type="button" style="border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.10);color:#fff;border-radius:999px;padding:8px 10px;font:1000 11px Inter,system-ui,sans-serif;display:none">Anlamı Dinle</button>
  `;
  jokerCol.appendChild(meta);
  personalBestVal = $("personalBestVal");
  globalBestVal = $("globalBestVal");
  listenSolvedBtn = $("listenSolvedBtn");
  listenSolvedBtn?.addEventListener("click", () => {
    if (state.roundEnded && state.lastSolvedWord) speakGameText(state.lastSolvedWord, state.lastSolvedLang);
    else if (state.clue) speakGameText(state.clue, "tr");
  });
}

function createGameOverModal() {
  if ($("gameOverModal")) return;
  const modal = document.createElement("div");
  modal.id = "gameOverModal";
  modal.className = "game-over-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="game-over-card" role="dialog" aria-modal="true" aria-labelledby="gameOverTitle">
      <div class="game-over-eyebrow">Hangman</div>
      <h2 id="gameOverTitle">Oyun bitti</h2>
      <div class="game-over-word">Kelime: <strong id="gameOverWord">—</strong></div>
      <div class="game-over-word">Türkçe anlam: <strong id="gameOverMeaning">—</strong></div>
      <div class="game-over-stats">
        <div class="game-over-stat"><span>Skor</span><b id="gameOverScore">0</b></div>
        <div class="game-over-stat"><span>Senin Rekorun</span><b id="gameOverPersonal">—</b></div>
      </div>
      <div class="game-over-word" id="gameOverGlobal">GENEL REKOR: —</div>
      <div class="game-over-record" id="gameOverRecord"></div>
      <div class="game-over-actions">
        <button class="primary" id="gameOverReplay" type="button">Tekrar oyna</button>
        <button class="secondary" id="gameOverMenu" type="button">Oyun menüsüne dön</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  $("gameOverReplay")?.addEventListener("click", () => {
    hideGameOverModal();
    resetGameState();
    startRound();
  });
  $("gameOverMenu")?.addEventListener("click", () => { location.href = getBackUrl(); });
}

function hideGameOverModal() {
  const modal = $("gameOverModal");
  if (!modal) return;
  modal.classList.remove("on");
  modal.setAttribute("aria-hidden", "true");
}

async function showGameOverModal() {
  const globalBest = await finishGameAndSave();
  const modal = $("gameOverModal");
  if (!modal) return;
  const title = state.newPersonalBest || state.newGlobalBest ? "Tebrikler!" : "Kaybettin";
  $("gameOverTitle").textContent = title;
  $("gameOverWord").textContent = state.lastSolvedWord || state.word || "—";
  $("gameOverMeaning").textContent = state.lastSolvedClue || state.clue || "—";
  $("gameOverScore").textContent = String(state.totalScore || 0);
  $("gameOverPersonal").textContent = String(getLocalHighScore(GAME_SLUG, state.lang) || state.totalScore || 0);
  $("gameOverGlobal").textContent = formatGlobalBest(globalBest);
  const messages = [];
  if (state.newPersonalBest) messages.push("Yeni yüksek skor!");
  if (state.newGlobalBest) messages.push("Yeni genel rekor!");
  $("gameOverRecord").textContent = messages.join(" ");
  modal.classList.add("on");
  modal.setAttribute("aria-hidden", "false");
}

function getAudioContext() {
  try {
    if (!hangAudioCtx) hangAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (hangAudioCtx.state === "suspended") hangAudioCtx.resume().catch(() => {});
    return hangAudioCtx;
  } catch (_) { return null; }
}

function playTone(freq, duration = 0.08, delay = 0, type = "sine", volume = 0.025) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}
function playCorrectSound() { playTone(540, 0.07, 0, "triangle", 0.025); playTone(780, 0.09, 0.07, "triangle", 0.021); }
function playWrongSound() { playTone(190, 0.08, 0, "sine", 0.022); playTone(135, 0.10, 0.075, "sine", 0.018); }
function playJokerSound() { playTone(420, 0.08, 0, "triangle", 0.018); }
["pointerdown", "touchstart", "click"].forEach((evt) => window.addEventListener(evt, () => getAudioContext(), { once: true, passive: true }));

function normalizeWordItem(item, lang) {
  if (!item || typeof item !== "object") return null;
  const clue = String(item.tr || item.turkish || item.meaning_tr || item.clue_tr || "").trim();
  const answer = normalizeWord(item[lang] || item.answer?.[lang] || item.word?.[lang] || item.target?.[lang]);
  if (!clue || !answer || answer.length < 2) return null;
  return { w: answer, clue };
}

async function fetchWordsFromLangStorage(lang) {
  try {
    const res = await fetch("/data/game_word_sets.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const sources = [data?.hangman, data?.hangman?.words, data?.words, data];
    const out = [];
    for (const source of sources) {
      if (!source) continue;
      const list = Array.isArray(source) ? source : source.common || source.items || source.vocabulary;
      if (!Array.isArray(list)) continue;
      list.map((item) => normalizeWordItem(item, lang)).filter(Boolean).forEach((item) => out.push(item));
    }
    return out;
  } catch (err) {
    console.warn("[HANGMAN] word fetch failed", err);
    return [];
  }
}

async function loadData(lang) {
  const externalWords = await fetchWordsFromLangStorage(lang);
  const fallbackWords = BASE_WORDS.map((item) => normalizeWordItem(item, lang)).filter(Boolean);
  state.words = externalWords.length ? externalWords : fallbackWords;
  state.lang = state.words.length ? lang : "en";
  if (!state.words.length) state.words = BASE_WORDS.map((item) => normalizeWordItem(item, "en")).filter(Boolean);
  if ($("trText")) $("trText").textContent = `Türkçe anlam: ${state.words[0]?.clue || "—"}`;
}

async function refreshScoreUi() {
  const localBest = getLocalHighScore(GAME_SLUG, state.lang);
  if ($("bestVal")) $("bestVal").textContent = String(localBest || 0);
  if (personalBestVal) personalBestVal.textContent = String(localBest || 0);
  if (globalBestVal) globalBestVal.textContent = "GENEL REKOR: —";
  try {
    const best = await refreshGameScoreLabels(GAME_SLUG, state.lang, { personalEl: personalBestVal, globalEl: globalBestVal });
    return best?.globalBest || null;
  } catch (err) {
    console.warn("[HANGMAN] score labels failed", err);
    return null;
  }
}

function markLocalBestIfNeeded() {
  const current = getLocalHighScore(GAME_SLUG, state.lang);
  if (state.totalScore > current) {
    setLocalHighScore(GAME_SLUG, state.lang, state.totalScore);
    state.newPersonalBest = true;
    if ($("bestVal")) $("bestVal").textContent = String(state.totalScore);
    if (personalBestVal) personalBestVal.textContent = String(state.totalScore);
    toast("Yeni yüksek skor!");
    return true;
  }
  return false;
}

function createStars() {
  for (let i = 0; i < 55; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 100 + "%";
    s.style.animationDuration = (2.5 + Math.random() * 3) + "s";
    document.body.appendChild(s);
  }
}
function drawGallows() {}
function resetMan() { document.querySelectorAll(".organ").forEach((p) => p.classList.remove("on")); $("man")?.classList.remove("swing"); }
function revealParts(n) {
  const parts = ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"];
  const visible = Math.min(parts.length, Math.ceil((n / Math.max(1, INITIAL_LIVES)) * parts.length));
  parts.forEach((id, i) => $(id)?.classList.toggle("on", i < visible));
  $("man")?.classList.toggle("swing", state.lives <= 0);
}

function pickWord() {
  if (!state.words.length) return { w: "SLEEP", clue: "uyumak" };
  let pick = state.words[Math.floor(Math.random() * state.words.length)];
  if (state.words.length > 1) {
    let guard = 0;
    while (pick?.w === state.previousWord && guard < 8) {
      pick = state.words[Math.floor(Math.random() * state.words.length)];
      guard += 1;
    }
  }
  return pick;
}

function startRound() {
  hideReadyGate();
  const pick = pickWord();
  state.word = normalizeWord(pick?.w);
  state.clue = String(pick?.clue || "").trim();
  if (!state.word || !state.clue) {
    state.word = "SLEEP";
    state.clue = "uyumak";
  }
  state.previousWord = state.word;
  state.guessed = new Set();
  state.roundJokers = JOKERS_PER_ROUND;
  state.wrongThisRound = false;
  state.usedJokerThisRound = false;
  state.roundEnded = false;
  state.lastSolvedWord = state.word;
  state.lastSolvedClue = state.clue;
  state.lastSolvedLang = state.lang;
  renderWord();
  renderKeyboard();
  renderHearts();
  renderJokers();
  resetMan();
  if ($("trText")) $("trText").textContent = `Türkçe anlam: ${state.clue}`;
  if (listenSolvedBtn) {
    listenSolvedBtn.textContent = "Anlamı Dinle";
    listenSolvedBtn.style.display = "block";
  }
}

function renderWord() {
  const wordEl = $("matrix");
  if (!wordEl) return;
  wordEl.innerHTML = "";
  state.word.split("").forEach((ch) => {
    const span = document.createElement("span");
    const found = state.guessed.has(ch);
    span.className = `slot${found ? " found" : ""}`;
    span.textContent = found ? ch : "";
    wordEl.appendChild(span);
  });
}

function renderKeyboard() {
  const kb = $("kb");
  if (!kb) return;
  kb.innerHTML = "";
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((ch) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "key";
    btn.textContent = ch;
    btn.addEventListener("click", () => makeGuess(ch, btn));
    kb.appendChild(btn);
  });
}

function renderHearts() {
  const h = $("hearts");
  if (!h) return;
  h.innerHTML = "";
  for (let i = 0; i < MAX_LIVES; i++) {
    const s = document.createElement("span");
    s.textContent = "♥";
    s.className = i < state.lives ? "heart" : "heart lost";
    h.appendChild(s);
  }
}

function renderJokers() {
  const j0 = $("j0");
  const j1 = $("j1");
  if (j0) {
    j0.className = `joker joker-main${state.roundJokers <= 0 ? " spent" : ""}`;
    j0.textContent = `Joker: ${state.roundJokers}`;
    j0.disabled = state.roundJokers <= 0 || state.roundEnded;
    j0.onclick = useJoker;
  }
  if (j1) {
    j1.className = "joker secondary-joker spent";
    j1.disabled = true;
    j1.textContent = "";
  }
}

function updateScore(delta = 0) {
  state.totalScore = Math.max(0, state.totalScore + delta);
  if ($("scoreVal")) $("scoreVal").textContent = state.totalScore;
}

function isSolved() {
  return state.word.split("").every((c) => state.guessed.has(c));
}

function makeGuess(letter, btn) {
  if (state.roundEnded || state.guessed.has(letter) || btn?.disabled) return;
  state.guessed.add(letter);
  if (btn) btn.disabled = true;
  if (state.word.includes(letter)) {
    btn?.classList.add("hit");
    playCorrectSound();
    const matches = state.word.split("").filter((c) => c === letter).length;
    state.correctCount += matches;
    updateScore(10 * matches);
    renderWord();
    if (isSolved()) endRound(true);
  } else {
    btn?.classList.add("miss");
    playWrongSound();
    state.wrongCount += 1;
    state.wrongThisRound = true;
    state.lives = Math.max(0, state.lives - 1);
    renderHearts();
    revealParts(INITIAL_LIVES - state.lives);
    if (state.lives <= 0) endRound(false);
  }
}

function useJoker() {
  if (state.roundEnded || state.roundJokers <= 0) return;
  const hidden = [...new Set(state.word.split(""))].filter((ch) => !state.guessed.has(ch));
  if (!hidden.length) return;
  const ch = hidden[Math.floor(Math.random() * hidden.length)];
  state.guessed.add(ch);
  state.roundJokers -= 1;
  state.usedJokerThisRound = true;
  playJokerSound();
  renderWord();
  renderKeyboardState();
  renderJokers();
  if (isSolved()) endRound(true);
}

function renderKeyboardState() {
  document.querySelectorAll("#kb .key").forEach((btn) => {
    const ch = btn.textContent;
    if (!state.guessed.has(ch)) return;
    btn.disabled = true;
    btn.classList.add(state.word.includes(ch) ? "hit" : "miss");
  });
}

function endRound(win) {
  state.roundEnded = true;
  document.querySelectorAll(".key").forEach((b) => (b.disabled = true));
  state.lastSolvedWord = state.word;
  state.lastSolvedClue = state.clue;
  state.lastSolvedLang = state.lang;
  if (listenSolvedBtn) {
    listenSolvedBtn.textContent = "Kelimeyi Dinle";
    listenSolvedBtn.style.display = "block";
  }
  if (win) {
    const perfect = !state.wrongThisRound && !state.usedJokerThisRound;
    updateScore(40 + (perfect ? 20 : 0));
    if (perfect && state.lives < MAX_LIVES) {
      state.lives = Math.min(MAX_LIVES, state.lives + 1);
      renderHearts();
      toast("Kusursuz çözüm: +1 can");
    }
    markLocalBestIfNeeded();
    showRoundModal("Kazandın", "+40 puan" + (perfect ? " • Kusursuz +1 can" : ""), "Sonraki kelime");
    speakGameText(state.word, state.lang);
    return;
  }
  speakGameText(state.word, state.lang);
  showGameOverModal();
}

function showRoundModal(title, info, buttonText) {
  const modal = $("modal");
  if (!modal) return;
  $("mTitle").textContent = title;
  $("mWord").textContent = state.word;
  $("mTr").textContent = `Türkçe anlam: ${state.clue} • ${info}`;
  $("mBtn").textContent = buttonText;
  modal.classList.add("on");
}

async function finishGameAndSave() {
  if (state.scoreSaved) {
    try { return await getGlobalBest(GAME_SLUG, state.lang); } catch (_) { return null; }
  }
  state.scoreSaved = true;
  const durationSeconds = Math.max(1, Math.round((Date.now() - state.gameStartedAt) / 1000));
  let beforeGlobal = null;
  try { beforeGlobal = await getGlobalBest(GAME_SLUG, state.lang); } catch (_) {}
  markLocalBestIfNeeded();
  try {
    await saveGameScore({
      gameSlug: GAME_SLUG,
      lang: state.lang,
      score: state.totalScore,
      correctCount: state.correctCount,
      wrongCount: state.wrongCount,
      durationSeconds,
    });
  } catch (err) {
    console.warn("[HANGMAN] score save failed", err);
  }
  let afterGlobal = null;
  try {
    afterGlobal = await getGlobalBest(GAME_SLUG, state.lang);
    const beforeScore = Number(beforeGlobal?.score || 0);
    const afterScore = Number(afterGlobal?.score || 0);
    state.newGlobalBest = state.totalScore > beforeScore && afterScore === state.totalScore;
    if (globalBestVal) globalBestVal.textContent = formatGlobalBest(afterGlobal);
  } catch (_) {}
  return afterGlobal || beforeGlobal;
}

function resetGameState() {
  state.lives = INITIAL_LIVES;
  state.totalScore = 0;
  state.correctCount = 0;
  state.wrongCount = 0;
  state.gameStartedAt = Date.now();
  state.scoreSaved = false;
  state.newPersonalBest = false;
  state.newGlobalBest = false;
  state.previousWord = "";
  if ($("scoreVal")) $("scoreVal").textContent = "0";
  renderHearts();
}

function startGameNow() {
  hideReadyGate();
  resetGameState();
  startRound();
}

$("mBtn")?.addEventListener("click", () => {
  $("modal")?.classList.remove("on");
  startRound();
});
$("realStartBtn")?.addEventListener("click", startGameNow);
$("langChangeBtn")?.addEventListener("click", () => toast("Dil seçimi oyun menüsünden yapılıyor."));
$("logo")?.addEventListener("click", () => { location.href = getBackUrl(); });

window.onload = async () => {
  injectHangmanUiPolish();
  createBackButton();
  createStars();
  createScoreMetaUi();
  createGameOverModal();
  await loadData(selectedLang);
  refreshScoreUi().catch((err) => console.warn("[HANGMAN] score refresh non-blocking", err));
  if (HAS_GAME_MENU_LANG) {
    startGameNow();
    return;
  }
  showReadyGate();
  const gateInfo = $("gateInfo");
  if (gateInfo) gateInfo.textContent = `${langLabel(state.lang)} ile başla`;
};
