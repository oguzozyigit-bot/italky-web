import "/js/public_guest_ux.js";

// /js/ad_gate.js

const MODULE_AD_STATE_KEY = "italky_module_ad_state_v2";
const OFFLINE_AD_STATE_KEY = "italky_offline_ad_state_v2";
const AD_INFO_MODAL_ID = "italkyAdInfoModal";
const GUEST_REWARD_MODAL_ID = "italkyGuestRewardModal";
const GUEST_MODE_KEY = "italky_guest_mode_v1";
const GUEST_REWARD_INTERVAL_MS = 3 * 60 * 1000;

function nowTs() {
  return Date.now();
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function normalizeModuleKey(moduleKey = "") {
  return String(moduleKey || "").trim().toLowerCase();
}

function getModuleAdState() {
  const state = readJson(MODULE_AD_STATE_KEY, {});
  return state && typeof state === "object" ? state : {};
}

function setModuleAdState(next) {
  const safe = next && typeof next === "object" ? next : {};
  writeJson(MODULE_AD_STATE_KEY, safe);
  return safe;
}

function getOfflineAdState() {
  const state = readJson(OFFLINE_AD_STATE_KEY, { shown_pairs: {} });
  if (!state.shown_pairs || typeof state.shown_pairs !== "object") state.shown_pairs = {};
  return state;
}

function setOfflineAdState(next) {
  const safe = next && typeof next === "object" ? next : { shown_pairs: {} };
  if (!safe.shown_pairs || typeof safe.shown_pairs !== "object") safe.shown_pairs = {};
  writeJson(OFFLINE_AD_STATE_KEY, safe);
  return safe;
}

function isTruthy(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function isGuestMode() {
  try {
    return localStorage.getItem(GUEST_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

function hasCachedSupabaseSession() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = String(localStorage.key(i) || "");
      if (!key.startsWith("sb-")) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const token =
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        parsed?.session?.access_token;

      if (token) return true;
    }
  } catch {}

  return false;
}

function getCachedAccess() {
  try {
    return window.__ITALKY_ACCESS__ || null;
  } catch {
    return null;
  }
}

function isAdsDisabledByAccess() {
  const access = getCachedAccess();
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
  try {
    const candidates = [window.AndroidAdBridge, window.NativeAds, window.AdMobBridge, window.Native, window.AndroidBridge];
    return candidates.find((bridge) => bridge && (
      typeof bridge.showRewardedAd === "function" ||
      typeof bridge.showRewardedAdForLang === "function"
    )) || null;
  } catch {
    return null;
  }
}

function hasNativeRewarded() {
  return !!getRewardedBridge();
}

function callRewardedBridge(referenceKey = "", placement = "module_access") {
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

function getOrCreateAdInfoModal() {
  let modal = document.getElementById(AD_INFO_MODAL_ID);
  if (modal) return modal;

  const style = document.createElement("style");
  style.id = "italkyAdInfoModalStyle";
  style.textContent = `
    .italky-ad-info-backdrop{position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(4,8,18,.58);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
    .italky-ad-info-backdrop.open{display:flex}
    .italky-ad-info-card{width:min(100%,430px);border-radius:26px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(10,16,30,.98),rgba(8,12,24,.98));box-shadow:0 24px 50px rgba(0,0,0,.34);color:#fff;font-family:Outfit,system-ui,sans-serif}
    .italky-ad-info-top{padding:18px 18px 14px;background:radial-gradient(circle at top left,rgba(191,219,254,.16),transparent 38%),linear-gradient(135deg,#142033 0%,#1a2740 52%,#202b46 100%);border-bottom:1px solid rgba(255,255,255,.06)}
    .italky-ad-info-chip{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);color:rgba(255,255,255,.92);font-size:12px;font-weight:1000}
    .italky-ad-info-title{margin:12px 0 8px;font-size:24px;line-height:1.08;font-weight:1000;letter-spacing:-.5px;color:#eef4ff}
    .italky-ad-info-text{margin:0;font-size:13px;line-height:1.68;font-weight:800;color:rgba(235,242,255,.82);white-space:pre-line}
    .italky-ad-info-body{padding:16px;display:grid;gap:10px;background:linear-gradient(180deg,rgba(9,13,24,.98),rgba(7,10,20,.98))}
    .italky-ad-info-btn{min-height:50px;border:none;border-radius:16px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:1000;transition:transform .14s ease,opacity .14s ease}
    .italky-ad-info-btn:active{transform:scale(.985)}
    .italky-ad-info-btn.primary{background:linear-gradient(135deg,#c7d2fe 0%,#a5b4fc 50%,#ddd6fe 100%);color:#111827;box-shadow:0 12px 24px rgba(99,102,241,.16)}
  `;
  document.head.appendChild(style);

  modal = document.createElement("div");
  modal.id = AD_INFO_MODAL_ID;
  modal.className = "italky-ad-info-backdrop";
  modal.innerHTML = `
    <div class="italky-ad-info-card">
      <div class="italky-ad-info-top">
        <div class="italky-ad-info-chip">italkyAI</div>
        <div class="italky-ad-info-title" id="italkyAdInfoTitle">Kucuk Bir Bilgilendirme</div>
        <p class="italky-ad-info-text" id="italkyAdInfoText"></p>
      </div>
      <div class="italky-ad-info-body">
        <button class="italky-ad-info-btn primary" id="italkyAdInfoOk" type="button">Tamam</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  return modal;
}

function getOrCreateGuestRewardModal() {
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

function showSoftAdModal({ title = "Bu modül için kısa bir reklam gösterilecek", text = "Bu modülü kullanabilmeniz için 1 kısa reklam gösterilecektir." } = {}) {
  return new Promise((resolve) => {
    const modal = getOrCreateAdInfoModal();
    const titleEl = modal.querySelector("#italkyAdInfoTitle");
    const textEl = modal.querySelector("#italkyAdInfoText");
    const okBtn = modal.querySelector("#italkyAdInfoOk");

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;

    const cleanup = (value) => {
      modal.classList.remove("open");
      okBtn?.removeEventListener("click", onOk);
      modal.removeEventListener("click", onBackdrop);
      resolve(value);
    };

    const onOk = () => cleanup(true);
    const onBackdrop = (e) => {
      if (e.target === modal) cleanup(true);
    };

    okBtn?.addEventListener("click", onOk);
    modal.addEventListener("click", onBackdrop);
    modal.classList.add("open");
  });
}

function showGuestRewardChoice() {
  return new Promise((resolve) => {
    const modal = getOrCreateGuestRewardModal();
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
  if (!hasNativeRewarded()) return false;

  try {
    const waitPromise = waitForRewardedResult();
    const called = callRewardedBridge(referenceKey, placement);
    if (!called) return false;

    const result = await waitPromise;
    if (result?.earned) return true;
    if (result?.shown) return true;
    return false;
  } catch {
    return false;
  }
}

function showFallbackAdInfo(message = "Bu modül için kısa bir reklam gösterilebilir.") {
  try {
    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }
  } catch {}

  try {
    const old = document.getElementById("italkyAdMiniToast");
    if (old) old.remove();

    const toast = document.createElement("div");
    toast.id = "italkyAdMiniToast";
    toast.textContent = String(message || "");
    toast.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(120px);max-width:min(92vw,520px);padding:14px 18px;border-radius:18px;background:rgba(10,16,30,.96);border:1px solid rgba(255,255,255,.10);box-shadow:0 18px 36px rgba(0,0,0,.32);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#eef4ff;font-family:Outfit,system-ui,sans-serif;font-size:13px;font-weight:800;line-height:1.55;text-align:center;z-index:1000000;transition:transform .22s ease,opacity .22s ease;opacity:0";
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = "translateX(-50%) translateY(0)";
      toast.style.opacity = "1";
    });

    setTimeout(() => {
      toast.style.transform = "translateX(-50%) translateY(120px)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 260);
    }, 2400);
  } catch {}
}

export function getModuleAccessState(moduleKey = "") {
  const key = normalizeModuleKey(moduleKey);
  const state = getModuleAdState();
  const until = Number(state?.[key]?.until || 0);
  return { moduleKey: key, until, active: until > nowTs() };
}

export function markModuleAdShown(moduleKey = "", hours = 24) {
  const key = normalizeModuleKey(moduleKey);
  if (!key) return null;

  const state = getModuleAdState();
  const until = nowTs() + Number(hours || 24) * 60 * 60 * 1000;
  state[key] = { until };
  setModuleAdState(state);

  return { moduleKey: key, until, active: true };
}

export async function ensureModuleAdAccess(options = {}) {
  const {
    moduleKey = "",
    title = "Bu modül için kısa bir reklam gösterilecek",
    text = "Bu modülü kullanabilmeniz için 1 kısa reklam gösterilecektir.\nReklamı tamamladıktan sonra bu modüle 24 saat boyunca tekrar reklam görmeden giriş yapabilirsiniz.",
    placement = "module_access",
    hours = 24,
    onBeforeAd = null,
    onAfterAd = null
  } = options;

  const key = normalizeModuleKey(moduleKey);
  if (!key) return false;

  if (isGuestMode() || hasCachedSupabaseSession() || isAdsDisabledByAccess()) {
    if (typeof onAfterAd === "function") await onAfterAd(true);
    return true;
  }

  const current = getModuleAccessState(key);
  if (current.active) {
    if (typeof onAfterAd === "function") await onAfterAd(true);
    return true;
  }

  try { if (typeof onBeforeAd === "function") await onBeforeAd(); } catch {}

  const accepted = await showSoftAdModal({ title, text });
  if (!accepted) {
    if (typeof onAfterAd === "function") await onAfterAd(false);
    return false;
  }

  let rewarded = false;
  if (hasNativeRewarded()) rewarded = await showNativeRewarded(key, placement);
  else {
    showFallbackAdInfo("Bu modülü kullanmak için kısa bir reklam gösterilebilir.");
    rewarded = true;
  }

  if (rewarded && hours > 0) markModuleAdShown(key, hours);

  try { if (typeof onAfterAd === "function") await onAfterAd(rewarded); } catch {}
  return rewarded;
}

export async function runGuestRewardedAdFlow(options = {}) {
  const { moduleKey = "guest_mode", placement = "guest_mode_timer" } = options;

  if (!canRunGuestRewardAds()) return true;

  const choice = await showGuestRewardChoice();

  if (choice === "login") {
    location.href = "/pages/membership.html";
    return false;
  }

  if (choice !== "watch") return false;

  let rewarded = false;
  if (hasNativeRewarded()) rewarded = await showNativeRewarded(moduleKey, placement);
  else {
    showFallbackAdInfo("Reklam hazır değilse misafir oturumu bu aşamada devam eder.");
    rewarded = true;
  }

  return rewarded;
}

export function startGuestRewardedAdTimer(options = {}) {
  const {
    moduleKey = "guest_mode",
    placement = "guest_mode_timer",
    intervalMs = GUEST_REWARD_INTERVAL_MS,
    startDelayMs = GUEST_REWARD_INTERVAL_MS
  } = options;

  if (!canRunGuestRewardAds()) return null;

  const key = normalizeModuleKey(moduleKey || placement || "guest_mode");
  window.__ITALKY_GUEST_REWARD_TIMERS__ = window.__ITALKY_GUEST_REWARD_TIMERS__ || {};

  if (window.__ITALKY_GUEST_REWARD_TIMERS__[key]) {
    return window.__ITALKY_GUEST_REWARD_TIMERS__[key];
  }

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
    if (document.getElementById(GUEST_REWARD_MODAL_ID)?.classList.contains("open")) return;

    busy = true;
    let ok = false;
    try {
      ok = await runGuestRewardedAdFlow({ moduleKey: key, placement });
    } catch (e) {
      console.warn("guest rewarded ad flow failed:", e);
    } finally {
      busy = false;
      schedule(ok === false ? 15000 : intervalMs);
    }
  };

  schedule(startDelayMs);

  const controller = {
    stop() {
      stopped = true;
      clearTimeout(timerId);
      delete window.__ITALKY_GUEST_REWARD_TIMERS__?.[key];
    },
    triggerNow() {
      clearTimeout(timerId);
      run();
    }
  };

  window.__ITALKY_GUEST_REWARD_TIMERS__[key] = controller;
  return controller;
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

    if (!found && path.startsWith("/pages/public/") && path.endsWith(".html")) {
      found = { moduleKey: "public_game_play_guest", placement: "public_game_play_guest_timer" };
    }

    if (!found) return;
    startGuestRewardedAdTimer(found);
  } catch {}
}

autoStartGuestRewardTimerForKnownPages();

export function hasShownOfflineDownloadAd(sessionKey = "offline_languages_page") {
  const key = normalizeModuleKey(sessionKey);
  if (!key) return false;

  const state = getOfflineAdState();
  const until = Number(state.shown_pairs[key] || 0);
  return until > nowTs();
}

export function markOfflineDownloadAdShown(sessionKey = "offline_languages_page", hours = 24) {
  const key = normalizeModuleKey(sessionKey);
  if (!key) return;

  const state = getOfflineAdState();
  state.shown_pairs[key] = nowTs() + Number(hours || 24) * 60 * 60 * 1000;
  setOfflineAdState(state);
}

export async function maybeShowOfflineDownloadAd(options = {}) {
  const {
    sessionKey = "offline_languages_page",
    title = "Bu modül için kısa bir reklam gösterilecek",
    text = "Offline dil paketini indirebilmeniz için 1 kısa reklam izlemeniz gerekmektedir.\nReklam tamamlandıktan sonra indirme başlayacaktır.",
    onBeforeAd = null,
    onAfterAd = null,
    skipInfoModal = false,
    hours = 0
  } = options;

  const key = normalizeModuleKey(sessionKey);
  if (!key) return true;

  if (hours > 0 && hasShownOfflineDownloadAd(key)) {
    if (typeof onAfterAd === "function") await onAfterAd(true);
    return true;
  }

  try { if (typeof onBeforeAd === "function") await onBeforeAd(); } catch {}

  if (!skipInfoModal) {
    const accepted = await showSoftAdModal({ title, text });
    if (!accepted) {
      if (typeof onAfterAd === "function") await onAfterAd(false);
      return false;
    }
  }

  let rewarded = false;
  if (hasNativeRewarded()) rewarded = await showNativeRewarded(key, "offline_languages_download");
  else {
    showFallbackAdInfo("Reklam hazırlanıyor, indirme başlatılıyor.");
    rewarded = true;
  }

  if (rewarded && hours > 0) markOfflineDownloadAdShown(key, hours);

  try { if (typeof onAfterAd === "function") await onAfterAd(rewarded); } catch {}
  return rewarded;
}

export function resetModuleAdStateForDebug() {
  try { localStorage.removeItem(MODULE_AD_STATE_KEY); } catch {}
}

export function resetOfflineAdStateForDebug() {
  try { localStorage.removeItem(OFFLINE_AD_STATE_KEY); } catch {}
}
