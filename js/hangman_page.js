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
const MAX_MISTAKES = 6;
const qs = new URLSearchParams(location.search);
const requestedLang = String(qs.get("lang") || "").toLowerCase();
const HAS_GAME_MENU_LANG = SUPPORTED_LANGS.includes(requestedLang);
const selectedLang = getGameLangFromUrl("en");

const $ = (id) => document.getElementById(id);

const W = innerWidth;
const H = innerHeight;
const floor = Math.round(H * 0.60);

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

function injectHangmanUiPolish() {
  document.body.classList.add("hangman-game-screen");
  if (HAS_GAME_MENU_LANG) document.body.classList.add("hangman-direct-start");
  if ($("hangmanUiPolish")) return;
  const style = document.createElement("style");
  style.id = "hangmanUiPolish";
  style.textContent = `
    body.hangman-game-screen .global-footer,
    body.hangman-game-screen [data-italky-footer],
    body.hangman-game-screen .italky-global-footer {
      display: none !important;
    }
    body.hangman-game-screen .ready-gate.hidden,
    body.hangman-direct-start #readyGate {
      display: none !important;
      pointer-events: none !important;
      visibility: hidden !important;
    }
    body.hangman-game-screen .dock {
      bottom: calc(var(--safeB) + var(--shellLift) + 34px) !important;
      height: 204px !important;
      gap: 8px !important;
      padding: 10px !important;
      box-shadow: 0 24px 70px rgba(0, 0, 0, .48), inset 0 1px 0 rgba(255,255,255,.14) !important;
    }
    body.hangman-game-screen #pageContent {
      padding-bottom: calc(204px + var(--shellLift) + var(--safeB) + 58px) !important;
    }
    body.hangman-game-screen .kb { gap: 5px !important; }
    body.hangman-game-screen .key {
      min-width: 27px !important;
      height: 35px !important;
      border-radius: 11px !important;
    }
    .hangman-back-btn {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 12px);
      left: 14px;
      z-index: 9500;
      border: 1px solid rgba(167, 243, 208, .25);
      background: linear-gradient(135deg, rgba(15, 23, 42, .78), rgba(30, 64, 175, .48));
      color: rgba(239, 246, 255, .94);
      border-radius: 999px;
      padding: 9px 12px;
      font: 900 12px/1 Inter, system-ui, sans-serif;
      letter-spacing: .2px;
      box-shadow: 0 14px 36px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.12);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .hangman-back-btn:active { transform: translateY(1px) scale(.99); }
    .game-over-modal {
      position: fixed;
      inset: 0;
      z-index: 12000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: radial-gradient(circle at 50% 20%, rgba(34,211,238,.18), transparent 34%), rgba(2, 6, 23, .74);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    .game-over-modal.on { display: flex; }
    .game-over-card {
      width: min(420px, calc(100vw - 28px));
      max-height: min(86vh, 680px);
      overflow: auto;
      border: 1px solid rgba(125, 211, 252, .28);
      border-radius: 26px;
      padding: 20px;
      color: #f8fafc;
      background:
        radial-gradient(circle at 12% 0%, rgba(34,211,238,.18), transparent 34%),
        linear-gradient(150deg, rgba(15,23,42,.96), rgba(30,41,59,.92));
      box-shadow: 0 30px 90px rgba(0,0,0,.56), inset 0 1px 0 rgba(255,255,255,.12);
    }
    .game-over-eyebrow {
      color: rgba(125, 211, 252, .92);
      font: 900 11px/1 Inter, system-ui, sans-serif;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .game-over-card h2 {
      margin: 0 0 12px;
      font: 1000 28px/1.05 Inter, system-ui, sans-serif;
      letter-spacing: 0;
    }
    .game-over-word {
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 18px;
      padding: 12px 14px;
      margin: 12px 0;
      background: rgba(15,23,42,.52);
      color: rgba(226,232,240,.9);
      font: 800 14px/1.4 Inter, system-ui, sans-serif;
    }
    .game-over-word strong { color: #fff; font-size: 17px; }
    .game-over-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 12px 0;
    }
    .game-over-stat {
      min-height: 62px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 18px;
      padding: 10px;
      background: rgba(2,6,23,.34);
    }
    .game-over-stat span {
      display: block;
      color: rgba(203,213,225,.72);
      font: 900 10px/1 Inter, system-ui, sans-serif;
      text-transform: uppercase;
      letter-spacing: .8px;
      margin-bottom: 8px;
    }
    .game-over-stat b { font: 1000 18px/1 Inter, system-ui, sans-serif; }
    .game-over-record {
      min-height: 24px;
      margin: 8px 0 14px;
      color: #fde68a;
      font: 900 13px/1.35 Inter, system-ui, sans-serif;
    }
    .game-over-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .game-over-actions button {
      border: 0;
      border-radius: 18px;
      min-height: 48px;
      color: #f8fafc;
      font: 1000 14px/1 Inter, system-ui, sans-serif;
      box-shadow: 0 14px 34px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.14);
    }
    .game-over-actions .primary {
      background: linear-gradient(135deg, #06b6d4, #2563eb 58%, #7c3aed);
    }
    .game-over-actions .secondary {
      background: rgba(15,23,42,.74);
      border: 1px solid rgba(148,163,184,.28);
    }
    @media (max-width: 420px) {
      body.hangman-game-screen .dock {
        bottom: calc(var(--safeB) + var(--shellLift) + 30px) !important;
        height: 198px !important;
      }
      body.hangman-game-screen #pageContent {
        padding-bottom: calc(198px + var(--shellLift) + var(--safeB) + 54px) !important;
      }
      body.hangman-game-screen .key { height: 33px !important; min-width: 25px !important; }
      .hangman-back-btn { padding: 8px 10px; font-size: 11px; }
      .game-over-card { padding: 18px; border-radius: 23px; }
    }
  `;
  document.head.appendChild(style);
}

function getBackUrl() {
  return qs.get("back") || (window.__ITalkyPublicGuest ? "/pages/login_entry.html" : "/pages/game_menu.html");
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
  btn.addEventListener("click", () => {
    location.href = getBackUrl();
  });
  document.body.appendChild(btn);
}

const DICT = {
  en: [
    { w: "ORANGE", h: "A citrus fruit" },
    { w: "BRIDGE", h: "Connects two sides" },
    { w: "WINDOW", h: "Lets light in" },
    { w: "MARKET", h: "A place to buy things" },
    { w: "TRAVEL", h: "To go from one place to another" },
    { w: "FRIEND", h: "Someone you trust" },
    { w: "PLANET", h: "Earth is one" },
    { w: "SILVER", h: "A shiny metal" },
  ],
  de: [
    { w: "APFEL", h: "Eine Frucht" },
    { w: "BRUCKE", h: "Verbindet zwei Seiten" },
    { w: "FENSTER", h: "Dort kommt Licht herein" },
    { w: "REISEN", h: "Von Ort zu Ort gehen" },
    { w: "FREUND", h: "Eine vertraute Person" },
    { w: "SCHULE", h: "Ein Ort zum Lernen" },
    { w: "WASSER", h: "Man trinkt es" },
  ],
  fr: [
    { w: "ORANGE", h: "Un fruit" },
    { w: "PONT", h: "Relie deux côtés" },
    { w: "FENETRE", h: "Laisse entrer la lumière" },
    { w: "VOYAGE", h: "Aller ailleurs" },
    { w: "AMI", h: "Une personne de confiance" },
    { w: "ECOLE", h: "Un lieu pour apprendre" },
    { w: "SOLEIL", h: "Il brille dans le ciel" },
  ],
  es: [
    { w: "NARANJA", h: "Una fruta" },
    { w: "PUENTE", h: "Une dos lados" },
    { w: "VENTANA", h: "Deja entrar la luz" },
    { w: "VIAJE", h: "Ir a otro lugar" },
    { w: "AMIGO", h: "Persona de confianza" },
    { w: "ESCUELA", h: "Lugar para aprender" },
    { w: "TIEMPO", h: "Pasa cada día" },
  ],
  it: [
    { w: "ARANCIA", h: "Un frutto" },
    { w: "PONTE", h: "Unisce due lati" },
    { w: "FINESTRA", h: "Fa entrare la luce" },
    { w: "VIAGGIO", h: "Andare altrove" },
    { w: "AMICO", h: "Persona fidata" },
    { w: "SCUOLA", h: "Luogo per imparare" },
    { w: "STELLA", h: "Brilla nel cielo" },
  ],
};

const state = {
  lang: selectedLang,
  words: [],
  word: "",
  hint: "",
  guessed: new Set(),
  mistakes: 0,
  lives: 3,
  roundScore: 0,
  totalScore: 0,
  gameStartedAt: Date.now(),
  scoreSaved: false,
  correctCount: 0,
  wrongCount: 0,
  lastSolvedWord: "",
  lastSolvedLang: selectedLang,
  newPersonalBest: false,
  newGlobalBest: false,
};

let personalBestVal = null;
let globalBestVal = null;
let listenSolvedBtn = null;
let hangAudioCtx = null;

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

function toast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 1600);
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
    <button id="listenSolvedBtn" type="button" style="border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.10);color:#fff;border-radius:999px;padding:8px 10px;font:1000 11px Inter,system-ui,sans-serif;display:none">Dinle</button>
  `;
  jokerCol.appendChild(meta);
  personalBestVal = $("personalBestVal");
  globalBestVal = $("globalBestVal");
  listenSolvedBtn = $("listenSolvedBtn");
  listenSolvedBtn?.addEventListener("click", () => {
    if (!state.lastSolvedWord) return;
    speakGameText(state.lastSolvedWord, state.lastSolvedLang);
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
  $("gameOverMenu")?.addEventListener("click", () => {
    location.href = getBackUrl();
  });
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
  const title = state.newPersonalBest || state.newGlobalBest ? "Tebrikler!" : "Oyun bitti";
  $("gameOverTitle").textContent = title;
  $("gameOverWord").textContent = state.lastSolvedWord || state.word || "—";
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
  } catch (_) {
    return null;
  }
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

function playCorrectSound() {
  playTone(540, 0.07, 0, "triangle", 0.025);
  playTone(780, 0.09, 0.07, "triangle", 0.021);
}

function playWrongSound() {
  playTone(190, 0.08, 0, "sine", 0.022);
  playTone(135, 0.10, 0.075, "sine", 0.018);
}

["pointerdown", "touchstart", "click"].forEach((evt) => {
  window.addEventListener(evt, () => getAudioContext(), { once: true, passive: true });
});

async function refreshScoreUi() {
  const localBest = getLocalHighScore(GAME_SLUG, state.lang);
  if ($("bestVal")) $("bestVal").textContent = String(localBest || 0);
  if (personalBestVal) personalBestVal.textContent = String(localBest || 0);
  if (globalBestVal) globalBestVal.textContent = "GENEL REKOR: —";
  try {
    const best = await refreshGameScoreLabels(GAME_SLUG, state.lang, {
      personalEl: personalBestVal,
      globalEl: globalBestVal,
    });
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

async function fetchWordsFromLangStorage(lang) {
  try {
    const res = await fetch("/data/game_word_sets.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const words = data?.hangman?.[lang] || data?.words?.[lang] || data?.[lang];
    if (!Array.isArray(words)) return [];
    return words
      .map((item) => {
        if (typeof item === "string") return { w: normalizeWord(item), h: langLabel(lang) };
        return {
          w: normalizeWord(item.word || item.w || item.text || item.answer),
          h: String(item.hint || item.h || item.clue || langLabel(lang)),
        };
      })
      .filter((item) => item.w && item.w.length >= 3);
  } catch (err) {
    console.warn("[HANGMAN] word fetch failed", err);
    return [];
  }
}

async function loadData(lang) {
  const externalWords = await fetchWordsFromLangStorage(lang);
  state.words = externalWords.length ? externalWords : (DICT[lang] || DICT.en);
  state.lang = (DICT[lang] || externalWords.length) ? lang : "en";
  if ($("langBadge")) $("langBadge").textContent = GAME_LANG_META[state.lang]?.flag || "🇬🇧";
  if ($("trText")) $("trText").textContent = `Dil: ${langLabel(state.lang)}`;
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

function drawGallows() {
  // HTML/CSS hangman figure is kept; this function stays harmless for older SVG builds.
  const svg = $("gallowsSvg");
  if (!svg) return;
  const wood = "rgba(255,255,255,.56)";
  function line(x1, y1, x2, y2, w = 8) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", "line");
    e.setAttribute("x1", x1); e.setAttribute("y1", y1); e.setAttribute("x2", x2); e.setAttribute("y2", y2);
    e.setAttribute("stroke", wood); e.setAttribute("stroke-width", w); e.setAttribute("stroke-linecap", "round");
    svg.appendChild(e);
  }
  line(35, floor, W - 35, floor, 10);
  line(82, floor, 82, 90, 9);
  line(82, 90, 228, 90, 9);
  line(228, 90, 228, 138, 5);
}

function resetMan() {
  document.querySelectorAll(".organ").forEach((p) => p.classList.remove("on"));
  $("man")?.classList.remove("swing");
}

function revealParts(n) {
  const parts = ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"];
  parts.forEach((id, i) => $(id)?.classList.toggle("on", i < n));
  $("man")?.classList.toggle("swing", n >= MAX_MISTAKES);
}

function startRound() {
  hideReadyGate();
  if (!state.words.length) state.words = DICT[state.lang] || DICT.en;
  const pick = state.words[Math.floor(Math.random() * state.words.length)];
  state.word = normalizeWord(pick?.w || pick?.word || pick?.text);
  if (!state.word) state.word = normalizeWord((DICT[state.lang] || DICT.en)[0].w);
  state.hint = pick?.h || pick?.hint || "";
  state.guessed = new Set();
  state.mistakes = 0;
  state.roundScore = 0;
  state.scoreSaved = false;
  state.lastSolvedWord = state.word;
  state.lastSolvedLang = state.lang;
  renderWord();
  renderKeyboard();
  renderHearts();
  resetMan();
  if ($("trText")) $("trText").textContent = `İpucu: ${state.hint || langLabel(state.lang)}`;
  if ($("resultBox")) $("resultBox").innerHTML = "";
  if (listenSolvedBtn) listenSolvedBtn.style.display = "none";
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
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("span");
    s.textContent = "♥";
    s.className = i < state.lives ? "heart" : "heart lost";
    h.appendChild(s);
  }
}

function updateScore(delta = 0) {
  state.totalScore = Math.max(0, state.totalScore + delta);
  if ($("scoreVal")) $("scoreVal").textContent = state.totalScore;
}

function makeGuess(letter, btn) {
  if (state.guessed.has(letter) || btn?.disabled) return;
  state.guessed.add(letter);
  if (btn) btn.disabled = true;
  if (state.word.includes(letter)) {
    btn?.classList.add("hit");
    playCorrectSound();
    const matches = state.word.split("").filter((c) => c === letter).length;
    state.correctCount += matches;
    updateScore(10 * matches);
    renderWord();
    if (state.word.split("").every((c) => state.guessed.has(c))) endRound(true);
  } else {
    btn?.classList.add("miss");
    playWrongSound();
    state.wrongCount += 1;
    state.mistakes += 1;
    updateScore(-5);
    revealParts(state.mistakes);
    if (state.mistakes >= MAX_MISTAKES) endRound(false);
  }
}

function endRound(win) {
  document.querySelectorAll(".key").forEach((b) => (b.disabled = true));
  const modal = $("modal");
  const mTitle = $("mTitle");
  const mWord = $("mWord");
  const mTr = $("mTr");
  const mBtn = $("mBtn");
  if (!modal || !mTitle || !mWord || !mTr || !mBtn) return;
  state.lastSolvedWord = state.word;
  state.lastSolvedLang = state.lang;
  if (win) {
    updateScore(40);
    markLocalBestIfNeeded();
    mTitle.textContent = "Başarılı!";
    mWord.textContent = state.word;
    mTr.textContent = "+40 puan";
    mBtn.textContent = "Sonraki kelime";
    if (listenSolvedBtn) listenSolvedBtn.style.display = "block";
    speakGameText(state.word, state.lang);
    modal.classList.add("on");
    return;
  }

  state.lives -= 1;
  renderHearts();
  speakGameText(state.word, state.lang);
  if (state.lives <= 0) {
    showGameOverModal();
    return;
  }
  mTitle.textContent = "Oyun bitti";
  mWord.textContent = state.word;
  mTr.textContent = "Bir can gitti, devam edebilirsin.";
  mBtn.textContent = "Devam et";
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
  state.lives = 3;
  state.totalScore = 0;
  state.correctCount = 0;
  state.wrongCount = 0;
  state.gameStartedAt = Date.now();
  state.scoreSaved = false;
  state.newPersonalBest = false;
  state.newGlobalBest = false;
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
$("langChangeBtn")?.addEventListener("click", () => {
  toast("Dil seçimi oyun menüsünden yapılıyor.");
});
$("logo")?.addEventListener("click", () => {
  location.href = getBackUrl();
});

window.onload = async () => {
  injectHangmanUiPolish();
  createBackButton();
  createStars();
  drawGallows();
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
