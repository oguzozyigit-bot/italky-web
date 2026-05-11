import { mountShell } from "/js/ui_shell.js";
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
  contentReady: false,
};

let personalBestVal = null;
let globalBestVal = null;
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
  document.getElementById("hangmanMobileScoreBarFix")?.remove();
  if (HAS_GAME_MENU_LANG) document.body.classList.add("hangman-direct-start");
  if ($("hangmanUiPolish")) return;
  const style = document.createElement("style");
  style.id = "hangmanUiPolish";
  style.textContent = `
    body.hangman-game-screen .ready-gate.hidden,
    body.hangman-direct-start #readyGate{display:none!important;pointer-events:none!important;visibility:hidden!important}
    body.hangman-game-screen #shellMain{overflow:hidden!important;padding-bottom:calc(var(--footerH,0px) + 8px)!important}
    body.hangman-game-screen #pageContent{height:100%!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;padding:10px 14px calc(228px + var(--footerH,0px) + env(safe-area-inset-bottom,0px) + 12px)!important;position:relative!important}
    body.hangman-game-screen .top{flex:1 1 auto!important;min-height:0!important;height:auto!important;display:flex!important;flex-direction:column!important;gap:8px!important}
    body.hangman-game-screen .title{font-size:20px!important;letter-spacing:7px!important;padding-top:0!important;margin:0!important;flex:0 0 auto!important}
    body.hangman-game-screen .hud{top:58px!important;left:0!important;right:0!important;gap:10px!important;align-items:flex-start!important;pointer-events:none!important}
    body.hangman-game-screen .leftHud,body.hangman-game-screen .rightHud{pointer-events:auto!important}
    body.hangman-game-screen .rightHud{min-width:124px!important;max-width:142px!important;padding:8px 9px!important;border-radius:16px!important;background:rgba(3,7,18,.52)!important;border:1px solid rgba(148,163,184,.16)!important;box-shadow:0 14px 38px rgba(0,0,0,.25)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;gap:7px!important}
    body.hangman-game-screen .score .best{font-size:8px!important;line-height:1.15!important;letter-spacing:.6px!important}.score .val{font-size:24px!important;line-height:1!important}
    body.hangman-game-screen #hangmanScoreMeta{margin-top:4px!important;gap:4px!important;font-size:8.5px!important;line-height:1.2!important;max-width:122px!important}
    body.hangman-game-screen .stage{flex:1 1 auto!important;min-height:0!important;padding-top:96px!important;justify-content:flex-start!important}
    body.hangman-game-screen .gallows{width:118px!important;height:126px!important;flex:0 0 auto!important}
    body.hangman-game-screen .man{transform:scale(.82);transform-origin:top center!important}
    body.hangman-game-screen .trBox{margin-top:14px!important;min-height:46px!important;font-size:15px!important;padding:10px 12px!important;width:100%!important;max-width:100%!important;position:relative!important;z-index:1!important}
    body.hangman-game-screen .dock{position:absolute!important;left:14px!important;right:14px!important;bottom:calc(var(--footerH,0px) + env(safe-area-inset-bottom,0px) + 6px)!important;height:232px!important;gap:8px!important;padding:10px!important;border-radius:22px!important;overflow:hidden!important;box-shadow:0 24px 70px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.14)!important}
    body.hangman-game-screen .matrix{min-height:40px!important;max-height:48px!important;gap:5px!important;overflow:hidden!important;flex:0 0 auto!important}
    body.hangman-game-screen .slot{width:24px!important;height:36px!important;font-size:21px!important}
    body.hangman-game-screen .kb{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;grid-auto-rows:34px!important;align-content:start!important;gap:5px!important;min-height:0!important;overflow:hidden!important;flex:1 1 auto!important}
    body.hangman-game-screen .key{min-width:0!important;width:100%!important;height:34px!important;border-radius:10px!important;padding:0!important;font-size:13px!important}
    body.hangman-game-screen .hearts{display:grid!important;grid-template-columns:repeat(9,max-content)!important;gap:3px!important;max-width:142px!important}
    body.hangman-game-screen .heart{font-size:16px!important}.heart.lost{opacity:.16;filter:none!important}
    body.hangman-game-screen .jokerCol{align-items:flex-end!important;gap:6px!important;margin-top:4px!important}.joker.secondary-joker{display:none!important}.joker.joker-main{width:auto!important;min-width:86px!important;height:36px!important;padding:0 10px!important;font-size:12px!important;font-weight:1000!important}
    .hangman-back-btn{position:relative;z-index:20;align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;margin:0 0 8px;border:1px solid rgba(167,243,208,.25);background:linear-gradient(135deg,rgba(15,23,42,.78),rgba(30,64,175,.48));color:rgba(239,246,255,.94);border-radius:999px;padding:9px 12px;font:900 12px/1 Inter,system-ui,sans-serif;letter-spacing:.2px;box-shadow:0 14px 36px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.12);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
    .hangman-back-btn:active{transform:translateY(1px) scale(.99)}
    .game-over-modal{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;padding:18px;background:radial-gradient(circle at 50% 20%,rgba(34,211,238,.18),transparent 34%),rgba(2,6,23,.74);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
    .game-over-modal.on{display:flex}.game-over-card{width:min(420px,calc(100vw - 28px));max-height:min(86vh,680px);overflow:auto;border:1px solid rgba(125,211,252,.28);border-radius:26px;padding:20px;color:#f8fafc;background:radial-gradient(circle at 12% 0%,rgba(34,211,238,.18),transparent 34%),linear-gradient(150deg,rgba(15,23,42,.96),rgba(30,41,59,.92));box-shadow:0 30px 90px rgba(0,0,0,.56),inset 0 1px 0 rgba(255,255,255,.12)}
    .game-over-eyebrow{color:rgba(125,211,252,.92);font:900 11px/1 Inter,system-ui,sans-serif;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:10px}.game-over-card h2{margin:0 0 12px;font:1000 28px/1.05 Inter,system-ui,sans-serif;letter-spacing:0}
    .game-over-word{border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:12px 14px;margin:12px 0;background:rgba(15,23,42,.52);color:rgba(226,232,240,.9);font:800 14px/1.4 Inter,system-ui,sans-serif}.game-over-word strong{color:#fff;font-size:17px}
    .game-over-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.game-over-stat{min-height:62px;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:10px;background:rgba(2,6,23,.34)}.game-over-stat span{display:block;color:rgba(203,213,225,.72);font:900 10px/1 Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}.game-over-stat b{font:1000 18px/1 Inter,system-ui,sans-serif}.game-over-record{min-height:24px;margin:8px 0 14px;color:#fde68a;font:900 13px/1.35 Inter,system-ui,sans-serif}.game-over-actions{display:grid;gap:10px}.game-over-actions button{border:0;border-radius:18px;min-height:48px;color:#f8fafc;font:1000 14px/1 Inter,system-ui,sans-serif;box-shadow:0 14px 34px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.14)}.game-over-actions .primary{background:linear-gradient(135deg,#06b6d4,#2563eb 58%,#7c3aed)}.game-over-actions .secondary{background:rgba(15,23,42,.74);border:1px solid rgba(148,163,184,.28)}
    @media(max-width:700px){
      body.hangman-game-screen #pageContent{padding:8px 12px calc(224px + var(--footerH,0px) + env(safe-area-inset-bottom,0px) + 10px)!important}
      body.hangman-game-screen .top{gap:6px!important}
      body.hangman-game-screen .title{font-size:18px!important;letter-spacing:5px!important}
      body.hangman-game-screen .hud{position:relative!important;top:auto!important;left:auto!important;right:auto!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:6px!important;margin:0 0 4px!important;pointer-events:auto!important;z-index:12!important}
      body.hangman-game-screen .leftHud{width:100%!important;align-items:center!important;gap:0!important}
      body.hangman-game-screen .hearts{display:flex!important;flex-wrap:nowrap!important;justify-content:center!important;max-width:100%!important;gap:4px!important}
      body.hangman-game-screen .heart{font-size:16px!important}
      body.hangman-game-screen .rightHud{position:relative!important;width:100%!important;min-width:0!important;max-width:100%!important;display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;align-items:center!important;justify-content:center!important;gap:5px 8px!important;margin:0!important;padding:7px 8px!important;border-radius:15px!important;background:rgba(255,255,255,.055)!important;border:1px solid rgba(255,255,255,.10)!important;box-shadow:0 10px 24px rgba(0,0,0,.20)!important;overflow:hidden!important;transform:none!important}
      body.hangman-game-screen .score{display:inline-flex!important;align-items:baseline!important;justify-content:center!important;gap:4px!important;min-width:0!important;flex:0 0 auto!important}
      body.hangman-game-screen .score::before{content:"SKOR:";color:rgba(255,255,255,.66);font-size:9px;font-weight:900;letter-spacing:.4px}
      body.hangman-game-screen .score .best{display:none!important}
      body.hangman-game-screen .score .val{font-size:17px!important;line-height:1!important;text-align:left!important}
      body.hangman-game-screen .jokerCol{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:6px!important;margin:0!important;min-width:0!important;flex:1 1 190px!important;max-width:100%!important}
      body.hangman-game-screen .joker.joker-main{width:auto!important;min-width:72px!important;height:29px!important;padding:0 9px!important;border-radius:999px!important;font-size:10px!important;white-space:nowrap!important;flex:0 0 auto!important}
      body.hangman-game-screen #j1{display:none!important}
      body.hangman-game-screen #hangmanScoreMeta{display:flex!important;flex-wrap:wrap!important;align-items:center!important;justify-content:center!important;gap:3px 7px!important;margin:0!important;max-width:none!important;min-width:0!important;flex:1 1 92px!important;font-size:7.8px!important;line-height:1.1!important;text-align:center!important;overflow:hidden!important}
      body.hangman-game-screen #hangmanScoreMeta div{white-space:nowrap!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}
      body.hangman-game-screen .stage{padding-top:6px!important;min-height:0!important;flex:1 1 auto!important;justify-content:flex-start!important}
      body.hangman-game-screen .gallows{width:118px!important;height:126px!important;margin-top:4px!important}
      body.hangman-game-screen .trBox{margin-top:12px!important}
    }
    @media(max-width:420px){
      body.hangman-game-screen #pageContent{padding-left:12px!important;padding-right:12px!important}
      body.hangman-game-screen .dock{left:12px!important;right:12px!important;bottom:calc(var(--footerH,0px) + env(safe-area-inset-bottom,0px) + 5px)!important;height:224px!important;padding:9px!important}
      body.hangman-game-screen .kb{grid-auto-rows:31px!important;gap:5px!important}
      body.hangman-game-screen .key{height:31px!important;font-size:12px!important}
      body.hangman-game-screen .slot{width:22px!important;height:32px!important;font-size:19px!important}.hangman-back-btn{padding:8px 10px;font-size:11px;margin-bottom:6px}.game-over-card{padding:18px;border-radius:23px}
    }
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
  const host = $("pageContent") || document.body;
  host.insertBefore(btn, host.firstElementChild || null);
}

function createScoreMetaUi() {
  const jokerCol = document.querySelector(".jokerCol");
  if (!jokerCol || $("hangmanScoreMeta")) return;
  const meta = document.createElement("div");
  meta.id = "hangmanScoreMeta";
  meta.style.cssText = "display:grid;gap:7px;margin-top:8px;color:rgba(255,255,255,.85);font:900 10px/1.25 Inter,system-ui,sans-serif;letter-spacing:.3px;text-transform:uppercase";
  meta.innerHTML = `
    <div>SENİN: <span id="personalBestVal">—</span></div>
    <div id="globalBestVal">GENEL: —</div>
  `;
  jokerCol.appendChild(meta);
  personalBestVal = $("personalBestVal");
  globalBestVal = $("globalBestVal");
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

function normalizeWordItem(item) {
  if (!item || typeof item !== "object") return null;
  const rawWord = item.word ?? item.w ?? item.text ?? item.term ?? item.answer ?? "";
  const rawMeaning = item.meaning ?? item.tr ?? item.translation ?? item.hint ?? "";
  const clue = String(rawMeaning || "").trim();
  const answer = normalizeWord(rawWord);
  if (!clue || !answer || answer.length < 2) return null;
  return { w: answer, clue };
}

function getPublicLangUrl(langCode) {
  return `https://auth.italky.ai/storage/v1/object/public/lang/${langCode}.json`;
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const key of ["items", "words", "data", "list", "entries", "pool"]) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
}

async function loadCodeCrackerPool(langCode) {
  try {
    const res = await fetch(getPublicLangUrl(langCode), { cache: "no-store" });
    if (!res.ok) {
      console.warn("[HANGMAN] Code Cracker pool fetch failed", { source: "storage:lang", langCode, status: res.status });
      return [];
    }
    const json = await res.json();
    const items = extractItems(json).map(normalizeWordItem).filter(Boolean);
    console.info("[HANGMAN] words loaded from Code Cracker pool", { source: "storage:lang", langCode, rowCount: items.length });
    return items;
  } catch (err) {
    console.warn("[HANGMAN] Code Cracker pool load failed", { source: "storage:lang", langCode, error: err });
    return [];
  }
}

function showContentUnavailable() {
  state.contentReady = false;
  if ($("trText")) $("trText").textContent = "İçerik şu anda yüklenemedi. Lütfen tekrar deneyin.";
  if ($("matrix")) $("matrix").innerHTML = "";
  const kb = $("kb");
  if (kb) kb.innerHTML = "";
  toast("İçerik şu anda yüklenemedi. Lütfen tekrar deneyin.");
}

async function loadData(lang) {
  const poolWords = await loadCodeCrackerPool(lang);
  state.words = poolWords;
  state.lang = lang;
  state.contentReady = state.words.length > 0;
  if (!state.contentReady) {
    showContentUnavailable();
    return;
  }
  if ($("trText")) $("trText").textContent = `Türkçe anlam: ${state.words[0]?.clue || "—"}`;
}

async function refreshScoreUi() {
  const localBest = getLocalHighScore(GAME_SLUG, state.lang);
  if ($("bestVal")) $("bestVal").textContent = String(localBest || 0);
  if (personalBestVal) personalBestVal.textContent = String(localBest || 0);
  if (globalBestVal) globalBestVal.textContent = "GENEL: —";
  try {
    const best = await refreshGameScoreLabels(GAME_SLUG, state.lang, { personalEl: personalBestVal, globalEl: globalBestVal });
    if (globalBestVal && String(globalBestVal.textContent || "").startsWith("GENEL REKOR:")) {
      globalBestVal.textContent = String(globalBestVal.textContent).replace("GENEL REKOR:", "GENEL:");
    }
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
  for (let i = 0; i < 32; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 100 + "%";
    s.style.animationDuration = (2.5 + Math.random() * 3) + "s";
    document.body.appendChild(s);
  }
}
function resetMan() { document.querySelectorAll(".organ").forEach((p) => p.classList.remove("on")); $("man")?.classList.remove("swing"); }
function revealParts(n) {
  const parts = ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"];
  const visible = Math.min(parts.length, Math.ceil((n / Math.max(1, INITIAL_LIVES)) * parts.length));
  parts.forEach((id, i) => $(id)?.classList.toggle("on", i < visible));
  $("man")?.classList.toggle("swing", state.lives <= 0);
}

function pickWord() {
  if (!state.words.length) return null;
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
  if (!state.contentReady || !state.words.length) {
    showContentUnavailable();
    return;
  }
  const pick = pickWord();
  if (!pick) {
    showContentUnavailable();
    return;
  }
  state.word = normalizeWord(pick?.w);
  state.clue = String(pick?.clue || "").trim();
  if (!state.word || !state.clue) {
    showContentUnavailable();
    return;
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
    j0.disabled = state.roundJokers <= 0 || state.roundEnded || !state.contentReady;
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
  if (state.roundEnded || !state.contentReady || state.guessed.has(letter) || btn?.disabled) return;
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
  if (state.roundEnded || !state.contentReady || state.roundJokers <= 0) return;
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
    if (globalBestVal) globalBestVal.textContent = formatGlobalBest(afterGlobal).replace("GENEL REKOR:", "GENEL:");
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
  try { mountShell({ scroll: "none" }); } catch (err) { console.warn("[HANGMAN] shell mount skipped", err); }
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
