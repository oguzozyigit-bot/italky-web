import "/js/public_guest_ux.js";

const MODULE_AD_STATE_KEY = "italky_module_ad_state_v2";
const OFFLINE_AD_STATE_KEY = "italky_offline_ad_state_v2";
const GUEST_TIMER_STATE_KEY = "italky_guest_reward_timer_state_v1";
const GUEST_MODE_KEY = "italky_guest_mode_v1";
const GUEST_REWARD_MODAL_ID = "italkyGuestRewardModal";
const GUEST_REWARD_INTERVAL_MS = 3 * 60 * 1000;

function nowTs() { return Date.now(); }
function normalizeModuleKey(v = "") { return String(v || "").trim().toLowerCase(); }
function readJson(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) || fallback) : fallback; } catch { return fallback; } }
function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
function isTruthy(v) { return v === true || v === "true" || v === 1 || v === "1"; }
function isGuestMode() { try { return localStorage.getItem(GUEST_MODE_KEY) === "1"; } catch { return false; } }

function hasCachedSupabaseSession() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = String(localStorage.key(i) || "");
      if (!key.startsWith("sb-")) continue;
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      const token = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
      if (token) return true;
    }
  } catch {}
  return false;
}

function isAdsDisabledByAccess() {
  const access = window.__ITALKY_ACCESS__ || null;
  return Boolean(
    isTruthy(access?.ads_disabled) ||
    isTruthy(access?.no_ads) ||
    isTruthy(access?.is_no_ads_member) ||
    isTruthy(access?.subscription_active) ||
    isTruthy(access?.has_active_membership) ||
    isTruthy(access?.is_member) ||
    isTruthy(access?.is_admin) ||
    isTruthy(access?.is_superadmin)
  );
}

function canRunGuestRewardAds() {
  return isGuestMode() && !hasCachedSupabaseSession() && !isAdsDisabledByAccess();
}

function getRewardedBridge() {
  const bridges = [window.AndroidAdBridge, window.NativeAds, window.AdMobBridge, window.Native, window.AndroidBridge];
  return bridges.find((b) => b && (typeof b.showRewardedAd === "function" || typeof b.showRewardedAdForLang === "function")) || null;
}

function callRewardedBridge(referenceKey = "", placement = "guest_reward") {
  const bridge = getRewardedBridge();
  if (!bridge) return false;
  try {
    if (typeof bridge.showRewardedAdForLang === "function") {
      bridge.showRewardedAdForLang("", placement || referenceKey || "guest_reward");
      return true;
    }
  } catch {}
  try {
    if (typeof bridge.showRewardedAd === "function") {
      bridge.showRewardedAd(String(referenceKey || ""), String(placement || "guest_reward"));
      return true;
    }
  } catch {}
  try {
    if (typeof bridge.showRewardedAd === "function") {
      bridge.showRewardedAd(String(placement || referenceKey || "guest_reward"));
      return true;
    }
  } catch {}
  return false;
}

function getNextGuestAdAt(key) {
  const state = readJson(GUEST_TIMER_STATE_KEY, {});
  return Number(state?.[key]?.nextAt || 0);
}

function setNextGuestAdAt(key, nextAt) {
  const state = readJson(GUEST_TIMER_STATE_KEY, {});
  state[key] = { nextAt: Number(nextAt || 0) };
  writeJson(GUEST_TIMER_STATE_KEY, state);
}

function ensureGuestModal() {
  let modal = document.getElementById(GUEST_REWARD_MODAL_ID);
  if (modal) return modal;

  if (!document.getElementById("italkyGuestRewardModalStyle")) {
    const style = document.createElement("style");
    style.id = "italkyGuestRewardModalStyle";
    style.textContent = `
      .italky-guest-ad-backdrop{position:fixed;inset:0;z-index:1000000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(2,6,23,.74);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      .italky-guest-ad-backdrop.open{display:flex}
      .italky-guest-ad-card{width:min(100%,430px);border-radius:24px;overflow:hidden;border:1px solid rgba(96,165,250,.22);background:linear-gradient(180deg,#0f1b33 0%,#071225 100%);box-shadow:0 26px 64px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.045);color:#fff;font-family:Outfit,system-ui,sans-serif}
      .italky-guest-ad-top{padding:22px 20px 16px;text-align:left;background:radial-gradient(circle at top left,rgba(96,165,250,.18),transparent 42%),linear-gradient(180deg,rgba(15,27,51,.98),rgba(11,20,38,.98))}
      .italky-guest-ad-badge{display:inline-flex;align-items:center;min-height:30px;padding:7px 12px;border-radius:999px;border:1px solid rgba(147,197,253,.22);background:rgba(59,130,246,.11);color:#dbeafe;font-size:11px;font-weight:1000;letter-spacing:.3px}
      .italky-guest-ad-title{margin:14px 0 10px;color:#f8fbff;font-size:23px;line-height:1.1;font-weight:1000;letter-spacing:-.35px}
      .italky-guest-ad-text{margin:0;color:rgba(226,232,240,.86);font-size:14px;line-height:1.62;font-weight:760}
      .italky-guest-ad-actions{display:grid;gap:10px;padding:16px;background:rgba(5,10,22,.76)}
      .italky-guest-ad-btn{min-height:52px;border:none;border-radius:16px;cursor:pointer;font:inherit;font-size:14px;font-weight:1000;transition:transform .14s ease,opacity .14s ease}
      .italky-guest-ad-btn:active{transform:scale(.985)}
      .italky-guest-ad-btn.primary{color:#061227;background:linear-gradient(135deg,#dbeafe 0%,#60a5fa 100%);box-shadow:0 14px 28px rgba(37,99,235,.22)}
      .italky-guest-ad-btn.secondary{color:#eaf2ff;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.11)}
    `;
    document.head.appendChild(style);
  }

  modal = document.createElement("div");
  modal.id = GUEST_REWARD_MODAL_ID;
  modal.className = "italky-guest-ad-backdrop";
  modal.innerHTML = `
    <div class="italky-guest-ad-card" role="dialog" aria-modal="true">
      <div class="italky-guest-ad-top">
        <div class="italky-guest-ad-badge">MISAFIR MODU</div>
        <h2 class="italky-guest-ad-title">Reklamsız Devam Etmek İster misiniz?</h2>
        <p class="italky-guest-ad-text">Misafir kullanımını sürdürebilmek için kısa bir ödüllü reklam izleyebilirsiniz. Reklamsız ve sınırsız kullanım için Google hesabınızla üyeliğinizi başlatabilirsiniz.</p>
      </div>
      <div class="italky-guest-ad-actions">
        <button class="italky-guest-ad-btn primary" id="italkyGuestWatchBtn" type="button">Reklamı İzleyip Devam Et</button>
        <button class="italky-guest-ad-btn secondary" id="italkyGuestLoginBtn" type="button">Reklamsız Kullanım İçin Üye Ol</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function showGuestRewardChoice() {
  return new Promise((resolve) => {
    const modal = ensureGuestModal();
    const loginBtn = modal.querySelector("#italkyGuestLoginBtn");
    const watchBtn = modal.querySelector("#italkyGuestWatchBtn");
    const cleanup = (value) => {
      modal.classList.remove("open");
      loginBtn?.removeEventListener("click", onLogin);
      watchBtn?.removeEventListener("click", onWatch);
      resolve(value);
    };
    const onLogin = () => cleanup("login");
    const onWatch = () => cleanup("watch");
    loginBtn?.addEventListener("click", onLogin);
    watchBtn?.addEventListener("click", onWatch);
    modal.classList.add("open");
  });
}

function waitForRewardedResult(timeoutMs = 35000) {
  return new Promise((resolve) => {
    let done = false;
    let earned = false;
    const prevEarned = window.onNativeRewardEarned;
    const prevClosed = window.onNativeRewardClosed;
    const finish = (payload) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.onNativeRewardEarned = prevEarned;
      window.onNativeRewardClosed = prevClosed;
      resolve({ shown: !!payload?.shown, earned, payload: payload || {} });
    };
    window.onNativeRewardEarned = function (payload) {
      try { if (typeof prevEarned === "function") prevEarned(payload); } catch {}
      earned = true;
    };
    window.onNativeRewardClosed = function (payload) {
      try { if (typeof prevClosed === "function") prevClosed(payload); } catch {}
      finish(payload || { shown: true });
    };
    const timer = setTimeout(() => finish({ shown: false, reason: "timeout" }), timeoutMs);
  });
}

async function showNativeRewarded(referenceKey = "", placement = "module_access") {
  if (!getRewardedBridge()) return false;
  const waitPromise = waitForRewardedResult();
  if (!callRewardedBridge(referenceKey, placement)) return false;
  const result = await waitPromise;
  return !!(result?.earned || result?.shown);
}

function showFallbackAdInfo(message = "Reklam hazır değilse misafir oturumu bu aşamada devam eder.") {
  try { if (typeof window.showToast === "function") { window.showToast(message); return; } } catch {}
}

export function getModuleAccessState(moduleKey = "") {
  const key = normalizeModuleKey(moduleKey);
  const state = readJson(MODULE_AD_STATE_KEY, {});
  const until = Number(state?.[key]?.until || 0);
  return { moduleKey: key, until, active: until > nowTs() };
}

export function markModuleAdShown(moduleKey = "", hours = 24) {
  const key = normalizeModuleKey(moduleKey);
  if (!key) return null;
  const state = readJson(MODULE_AD_STATE_KEY, {});
  const until = nowTs() + Number(hours || 24) * 60 * 60 * 1000;
  state[key] = { until };
  writeJson(MODULE_AD_STATE_KEY, state);
  return { moduleKey: key, until, active: true };
}

export async function ensureModuleAdAccess(options = {}) {
  const { moduleKey = "", placement = "module_access", hours = 24, onBeforeAd = null, onAfterAd = null } = options;
  const key = normalizeModuleKey(moduleKey);
  if (!key) return false;
  if (isGuestMode() || hasCachedSupabaseSession() || isAdsDisabledByAccess()) return true;
  if (getModuleAccessState(key).active) return true;
  try { if (typeof onBeforeAd === "function") await onBeforeAd(); } catch {}
  const rewarded = getRewardedBridge() ? await showNativeRewarded(key, placement) : true;
  if (rewarded && hours > 0) markModuleAdShown(key, hours);
  try { if (typeof onAfterAd === "function") await onAfterAd(rewarded); } catch {}
  return rewarded;
}

export async function runGuestRewardedAdFlow(options = {}) {
  const { moduleKey = "guest_mode", placement = "guest_mode_timer" } = options;
  if (!canRunGuestRewardAds()) return true;
  const choice = await showGuestRewardChoice();
  if (choice === "login") { location.href = "/pages/membership.html"; return false; }
  if (choice !== "watch") return false;
  if (getRewardedBridge()) return await showNativeRewarded(moduleKey, placement);
  showFallbackAdInfo();
  return true;
}

export function startGuestRewardedAdTimer(options = {}) {
  const { moduleKey = "guest_mode", placement = "guest_mode_timer", intervalMs = GUEST_REWARD_INTERVAL_MS, startDelayMs = GUEST_REWARD_INTERVAL_MS } = options;
  if (!canRunGuestRewardAds()) return null;
  const key = normalizeModuleKey(moduleKey || placement || "guest_mode");
  window.__ITALKY_GUEST_REWARD_TIMERS__ = window.__ITALKY_GUEST_REWARD_TIMERS__ || {};
  if (window.__ITALKY_GUEST_REWARD_TIMERS__[key]) return window.__ITALKY_GUEST_REWARD_TIMERS__[key];

  let stopped = false;
  let busy = false;
  let timerId = null;
  const schedule = (delay = intervalMs) => {
    if (stopped || !canRunGuestRewardAds()) return;
    clearTimeout(timerId);
    timerId = setTimeout(run, Math.max(1000, Number(delay) || intervalMs));
  };
  const run = async () => {
    if (stopped || busy || !canRunGuestRewardAds()) return;
    if (document.getElementById(GUEST_REWARD_MODAL_ID)?.classList.contains("open")) { schedule(15000); return; }
    busy = true;
    let ok = false;
    try { ok = await runGuestRewardedAdFlow({ moduleKey: key, placement }); } catch (e) { console.warn("guest rewarded ad flow failed:", e); }
    finally {
      busy = false;
      const nextDelay = ok === false ? 15000 : intervalMs;
      setNextGuestAdAt(key, nowTs() + nextDelay);
      schedule(nextDelay);
    }
  };
  const nextAt = getNextGuestAdAt(key);
  const storedDelay = nextAt > nowTs() ? nextAt - nowTs() : 0;
  schedule(Math.max(Number(startDelayMs) || intervalMs, storedDelay || 0));
  const controller = { stop() { stopped = true; clearTimeout(timerId); delete window.__ITALKY_GUEST_REWARD_TIMERS__?.[key]; }, triggerNow() { clearTimeout(timerId); run(); } };
  window.__ITALKY_GUEST_REWARD_TIMERS__[key] = controller;
  return controller;
}

function resetBtUiWithoutNavigation() {
  try { window.isBtConnected = false; } catch {}
  try { document.body.classList.remove("bt-active"); } catch {}
  try {
    const btn = document.getElementById("btToggleBtn");
    if (btn) {
      btn.style.color = "#fff";
      btn.style.borderColor = "rgba(255,255,255,0.15)";
      btn.style.background = "rgba(255,255,255,0.05)";
      btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10-5 5V2l5 5-10 10"></path></svg>';
    }
    const hf = document.getElementById("handsFreeToggle");
    if (hf) { hf.style.display = "none"; hf.classList.remove("active"); }
    const share = document.getElementById("shareQrBtn");
    if (share) share.style.display = "flex";
  } catch {}
}

const SILENT_SPEECH_ERRORS = new Set([
  "no_speech",
  "no speech",
  "speech_timeout",
  "timeout",
  "empty",
  "empty_result",
  "manual_stop_empty"
]);
const HANDSFREE_RETRY_ERRORS = new Set(["client_error", "recognizer_busy"]);
const lastSpeechToastAt = new Map();
let handsFreeRestartTimer = null;

function normalizeSpeechError(errorMsg) {
  return String(errorMsg || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isHandsFreeVisibleAndActive() {
  const btn = document.getElementById("handsFreeToggle");
  return !!(btn && btn.classList.contains("active"));
}

function localSpeechToast(message, key = message) {
  const now = Date.now();
  const last = Number(lastSpeechToastAt.get(key) || 0);
  if (now - last < 5000) return;
  lastSpeechToastAt.set(key, now);
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = String(message || "");
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function cleanupSpeechPreview() {
  try {
    [document.getElementById("topBody"), document.getElementById("botBody")].forEach((body) => {
      const activeBubble = body?.querySelector?.(".bubble.latest");
      if (activeBubble && String(activeBubble.textContent || "").endsWith("...")) activeBubble.remove();
    });
  } catch {}
}

function scheduleHandsFreeRestart() {
  if (!isHandsFreeVisibleAndActive()) return;
  clearTimeout(handsFreeRestartTimer);
  const delay = 600 + Math.floor(Math.random() * 601);
  handsFreeRestartTimer = setTimeout(() => {
    if (!isHandsFreeVisibleAndActive()) return;
    const botMic = document.getElementById("botMic");
    const topMic = document.getElementById("topMic");
    if (botMic?.classList.contains("listening") || topMic?.classList.contains("listening")) return;
    botMic?.click?.();
  }, delay);
}

function installHandsFreeSpeechGuard() {
  if (window.__ITALKY_HANDSFREE_SPEECH_GUARD__) return;
  window.__ITALKY_HANDSFREE_SPEECH_GUARD__ = true;

  window.onNativeSpeechError = function (errorMsg) {
    const raw = String(errorMsg || "").trim();
    const code = normalizeSpeechError(raw);

    try {
      document.getElementById("topMic")?.classList.remove("listening");
      document.getElementById("botMic")?.classList.remove("listening");
      cleanupSpeechPreview();
    } catch {}

    if (SILENT_SPEECH_ERRORS.has(code) || SILENT_SPEECH_ERRORS.has(raw.toLowerCase())) {
      scheduleHandsFreeRestart();
      return;
    }

    if (isHandsFreeVisibleAndActive() && HANDSFREE_RETRY_ERRORS.has(code)) {
      scheduleHandsFreeRestart();
      return;
    }

    if (code.includes("permission") || code === "not_allowed") {
      localSpeechToast("Mikrofon izni gerekli", "permission");
    } else if (code.includes("network") || code === "server_error") {
      localSpeechToast("Ağ bağlantısı zayıf veya konuşma motoru yanıt vermiyor.", "network");
    } else if (code.includes("not_available") || code.includes("unavailable") || code.includes("engine") || code === "start_error") {
      localSpeechToast("Konuşma tanıma hazır değil.", "engine");
    } else if (!isHandsFreeVisibleAndActive()) {
      localSpeechToast(`Mikrofon hatası (${raw || "unknown"})`, code || "unknown");
    }

    scheduleHandsFreeRestart();
  };
}

function installLoginEntryLegacyGuards() {
  const path = String(location.pathname || "").toLowerCase();
  if (!path.endsWith("/pages/login_entry.html")) return;

  try {
    if (!window.__ITALKY_LEGACY_LOGIN_ENTRY_AD_GUARD__) {
      window.__ITALKY_LEGACY_LOGIN_ENTRY_AD_GUARD__ = true;
      const nativeSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = function (callback, delay, ...args) {
        try {
          const source = Function.prototype.toString.call(callback);
          const ms = Number(delay || 0);
          if (ms >= 250000 && source.includes("showAdModal") && source.includes("scheduleAutoAd")) return 0;
        } catch {}
        return nativeSetTimeout(callback, delay, ...args);
      };
    }
  } catch {}

  setTimeout(() => {
    try { window.onBtDisconnected = resetBtUiWithoutNavigation; } catch {}
    try { window.onBtDevicePickerClosed = window.onBtDevicePickerClosed || function () {}; } catch {}
    try { installHandsFreeSpeechGuard(); } catch {}

    try {
      const handsFree = document.getElementById("handsFreeToggle");
      const share = document.getElementById("shareQrBtn");
      const micLine = document.querySelector("#botSection .mic-line");
      const sides = micLine ? micLine.querySelectorAll(".mic-side") : [];
      if (handsFree && sides[0] && !sides[0].contains(handsFree)) sides[0].appendChild(handsFree);
      if (share && sides[2] && !sides[2].contains(share)) sides[2].appendChild(share);
    } catch {}
  }, 0);

  setTimeout(() => { try { installHandsFreeSpeechGuard(); } catch {} }, 350);
  setTimeout(() => { try { installHandsFreeSpeechGuard(); } catch {} }, 1200);
}

function autoStartGuestRewardTimerForKnownPages() {
  try {
    const path = String(location.pathname || "").toLowerCase();
    const configs = [
      { match: "/facetoface.html", moduleKey: "facetoface_guest", placement: "facetoface_guest_timer" },
      { match: "/pages/login_entry.html", moduleKey: "public_facetoface_guest", placement: "public_facetoface_guest_timer" },
      { match: "/pages/text_translate_public.html", moduleKey: "text_translate_public_guest", placement: "text_translate_public_guest_timer" },
      { match: "/pages/game_menu_public.html", moduleKey: "public_games_guest", placement: "public_games_guest_timer" },
      { match: "/pages/level_test_public.html", moduleKey: "public_level_test_guest", placement: "public_level_test_guest_timer" }
    ];
    let found = configs.find((item) => path.endsWith(item.match));
    if (!found && path.startsWith("/pages/public/") && path.endsWith(".html")) found = { moduleKey: "public_game_play_guest", placement: "public_game_play_guest_timer" };
    if (found) startGuestRewardedAdTimer(found);
  } catch {}
}

installLoginEntryLegacyGuards();
autoStartGuestRewardTimerForKnownPages();

export function hasShownOfflineDownloadAd(sessionKey = "offline_languages_page") {
  const key = normalizeModuleKey(sessionKey);
  const state = readJson(OFFLINE_AD_STATE_KEY, { shown_pairs: {} });
  return Number(state?.shown_pairs?.[key] || 0) > nowTs();
}

export function markOfflineDownloadAdShown(sessionKey = "offline_languages_page", hours = 24) {
  const key = normalizeModuleKey(sessionKey);
  const state = readJson(OFFLINE_AD_STATE_KEY, { shown_pairs: {} });
  if (!state.shown_pairs || typeof state.shown_pairs !== "object") state.shown_pairs = {};
  state.shown_pairs[key] = nowTs() + Number(hours || 24) * 60 * 60 * 1000;
  writeJson(OFFLINE_AD_STATE_KEY, state);
}

export async function maybeShowOfflineDownloadAd(options = {}) {
  const { sessionKey = "offline_languages_page", onBeforeAd = null, onAfterAd = null, hours = 0 } = options;
  const key = normalizeModuleKey(sessionKey);
  if (!key) return true;
  if (hours > 0 && hasShownOfflineDownloadAd(key)) return true;
  try { if (typeof onBeforeAd === "function") await onBeforeAd(); } catch {}
  const rewarded = getRewardedBridge() ? await showNativeRewarded(key, "offline_languages_download") : true;
  if (rewarded && hours > 0) markOfflineDownloadAdShown(key, hours);
  try { if (typeof onAfterAd === "function") await onAfterAd(rewarded); } catch {}
  return rewarded;
}

export function resetModuleAdStateForDebug() { try { localStorage.removeItem(MODULE_AD_STATE_KEY); } catch {} }
export function resetOfflineAdStateForDebug() { try { localStorage.removeItem(OFFLINE_AD_STATE_KEY); } catch {} }
