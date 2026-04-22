const APP_AD_STATE_KEY = "italky_app_ad_state_v4";
const OFFLINE_AD_STATE_KEY = "italky_offline_ad_state_v3";

const DEFAULT_READY_DELAY_MS = 90 * 1000;
const AD_INFO_MODAL_ID = "italkyAdInfoModal";

function nowTs() {
  return Date.now();
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function normalizePath(path = "") {
  try {
    const url = new URL(path, location.origin);
    return url.pathname.toLowerCase();
  } catch {
    return String(path || "").trim().toLowerCase();
  }
}

function getCurrentPath() {
  return normalizePath(location.pathname || "/");
}

function isJetonBuyPath(path = "") {
  const p = normalizePath(path);
  return p.includes("/pages/jetonbuy.html") || p.endsWith("/jetonbuy.html");
}

function normalizePairKey(fromLang, toLang) {
  const a = String(fromLang || "").trim().toLowerCase();
  const b = String(toLang || "").trim().toLowerCase();
  if (!a || !b) return "";
  return `${a}_${b}`;
}

function getAppAdState() {
  const state = readJson(APP_AD_STATE_KEY, {});
  const today = todayKey();

  if (state.day !== today) {
    const fresh = {
      day: today,
      shown_today: false,
      session_started_at: 0,
      ready_after: 0,
      current_page: ""
    };
    writeJson(APP_AD_STATE_KEY, fresh);
    return fresh;
  }

  return {
    day: today,
    shown_today: !!state.shown_today,
    session_started_at: Number(state.session_started_at || 0),
    ready_after: Number(state.ready_after || 0),
    current_page: String(state.current_page || "")
  };
}

function setAppAdState(next) {
  const merged = {
    day: todayKey(),
    shown_today: !!next.shown_today,
    session_started_at: Number(next.session_started_at || 0),
    ready_after: Number(next.ready_after || 0),
    current_page: String(next.current_page || "")
  };
  writeJson(APP_AD_STATE_KEY, merged);
  return merged;
}

function getOfflineAdState() {
  const state = readJson(OFFLINE_AD_STATE_KEY, {});
  const today = todayKey();

  if (state.day !== today) {
    const fresh = {
      day: today,
      shown_pairs: {}
    };
    writeJson(OFFLINE_AD_STATE_KEY, fresh);
    return fresh;
  }

  return {
    day: today,
    shown_pairs: state.shown_pairs && typeof state.shown_pairs === "object" ? state.shown_pairs : {}
  };
}

function setOfflineAdState(next) {
  const merged = {
    day: todayKey(),
    shown_pairs: next?.shown_pairs && typeof next.shown_pairs === "object" ? next.shown_pairs : {}
  };
  writeJson(OFFLINE_AD_STATE_KEY, merged);
  return merged;
}

function hasNativeInterstitial() {
  try {
    return !!(window.Native && typeof window.Native.showInterstitialAd === "function");
  } catch {
    return false;
  }
}

function hasNativeRewarded() {
  try {
    return !!(window.Native && typeof window.Native.showRewardedAd === "function");
  } catch {
    return false;
  }
}

function getOrCreateAdInfoModal() {
  let modal = document.getElementById(AD_INFO_MODAL_ID);
  if (modal) return modal;

  const style = document.createElement("style");
  style.id = "italkyAdInfoModalStyle";
  style.textContent = `
    .italky-ad-info-backdrop{
      position:fixed; inset:0; z-index:999999; display:none; align-items:center; justify-content:center;
      padding:20px; background:rgba(0,0,0,.54); backdrop-filter:blur(8px);
    }
    .italky-ad-info-backdrop.open{ display:flex; }
    .italky-ad-info-card{
      width:min(100%,430px); border-radius:24px; overflow:hidden; border:1px solid rgba(255,255,255,.10);
      background:linear-gradient(145deg, rgba(16,16,24,.98), rgba(10,10,18,.98));
      box-shadow:0 24px 50px rgba(0,0,0,.30); color:#fff; font-family:Outfit,system-ui,sans-serif;
    }
    .italky-ad-info-top{
      padding:18px 18px 14px;
      background:linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%);
    }
    .italky-ad-info-chip{
      display:inline-flex; align-items:center; justify-content:center; min-height:32px; padding:8px 14px;
      border-radius:999px; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.18);
      color:#fff; font-size:12px; font-weight:1000;
    }
    .italky-ad-info-title{
      margin:12px 0 6px; font-size:24px; line-height:1.08; font-weight:1000; letter-spacing:-.5px;
    }
    .italky-ad-info-text{
      margin:0; font-size:13px; line-height:1.65; font-weight:800; color:rgba(255,255,255,.92); white-space:pre-line;
    }
    .italky-ad-info-body{ padding:16px; display:grid; gap:10px; }
    .italky-ad-info-btn{
      min-height:50px; border:none; border-radius:16px; cursor:pointer; font-family:inherit; font-size:14px; font-weight:1000;
    }
    .italky-ad-info-btn.primary{
      background:linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%); color:#05060d;
    }
    .italky-ad-info-btn.secondary{
      background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); color:#fff;
    }
    .italky-ad-info-actions{
      display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:4px;
    }
    @media (max-width:390px){
      .italky-ad-info-actions{ grid-template-columns:1fr; }
    }
  `;
  document.head.appendChild(style);

  modal = document.createElement("div");
  modal.id = AD_INFO_MODAL_ID;
  modal.className = "italky-ad-info-backdrop";
  modal.innerHTML = `
    <div class="italky-ad-info-card">
      <div class="italky-ad-info-top">
        <div class="italky-ad-info-chip">italkyAI</div>
        <div class="italky-ad-info-title" id="italkyAdInfoTitle">Küçük Bir Bilgilendirme</div>
        <p class="italky-ad-info-text" id="italkyAdInfoText"></p>
      </div>
      <div class="italky-ad-info-body">
        <div class="italky-ad-info-actions">
          <button class="italky-ad-info-btn secondary" id="italkyAdInfoCancel" type="button">Vazgeç</button>
          <button class="italky-ad-info-btn primary" id="italkyAdInfoOk" type="button">Devam Et</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  return modal;
}

function showSoftAdModal({
  title = "Küçük Bir Bilgilendirme",
  text = "Uygulamayı ücretsiz sunabilmemiz için, sayfalar arasında geçişlerde günde yalnızca 1 kez kısa bir reklam gösterilebilir.\nOffline dil indirmelerinde ise, her dil için indirme öncesinde bir kez reklam gösterilebilir.\nAnlayışınız için teşekkür ederiz."
} = {}) {
  return new Promise((resolve) => {
    const modal = getOrCreateAdInfoModal();
    const titleEl = modal.querySelector("#italkyAdInfoTitle");
    const textEl = modal.querySelector("#italkyAdInfoText");
    const okBtn = modal.querySelector("#italkyAdInfoOk");
    const cancelBtn = modal.querySelector("#italkyAdInfoCancel");

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;

    const cleanup = (value) => {
      modal.classList.remove("open");
      okBtn?.removeEventListener("click", onOk);
      cancelBtn?.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onBackdrop);
      resolve(value);
    };

    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onBackdrop = (e) => {
      if (e.target === modal) cleanup(false);
    };

    okBtn?.addEventListener("click", onOk);
    cancelBtn?.addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);
    modal.classList.add("open");
  });
}

function waitForInterstitialClosed(timeoutMs = 20000) {
  return new Promise((resolve) => {
    let done = false;
    const previousHandler = window.onNativeInterstitialClosed;

    const finish = (payload) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.onNativeInterstitialClosed = previousHandler;
      resolve(payload || { shown: false });
    };

    window.onNativeInterstitialClosed = function (payload) {
      try {
        if (typeof previousHandler === "function") previousHandler(payload);
      } catch {}
      finish(payload);
    };

    const timer = setTimeout(() => {
      finish({ shown: false, reason: "timeout" });
    }, timeoutMs);
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
      resolve({
        shown: !!payload?.shown,
        earned,
        payload: payload || {}
      });
    };

    window.onNativeRewardEarned = function (payload) {
      try {
        if (typeof prevEarned === "function") prevEarned(payload);
      } catch {}
      earned = true;
    };

    window.onNativeRewardClosed = function (payload) {
      try {
        if (typeof prevClosed === "function") prevClosed(payload);
      } catch {}
      finish(payload);
    };

    const timer = setTimeout(() => {
      finish({ shown: false, reason: "timeout" });
    }, timeoutMs);
  });
}

async function showNativeInterstitial(reason = "daily_transition") {
  if (!hasNativeInterstitial()) return false;

  try {
    const waitPromise = waitForInterstitialClosed();
    window.Native.showInterstitialAd(reason);
    const result = await waitPromise;
    return !!result?.shown;
  } catch {
    return false;
  }
}

async function showNativeRewarded(langCode = "", placement = "offline_download") {
  if (!hasNativeRewarded()) return false;

  try {
    const waitPromise = waitForRewardedResult();
    window.Native.showRewardedAd(String(langCode || ""), String(placement || "offline_download"));
    const result = await waitPromise;
    return !!result?.earned;
  } catch {
    return false;
  }
}

function showFallbackAdInfo(message = "Uygulamayı ücretsiz sunabilmemiz için kısa bir reklam gösterilebilir.") {
  try {
    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }
  } catch {}

  try {
    alert(message);
  } catch {}
}

export function beginDailyAdSession(options = {}) {
  const {
    delayMs = DEFAULT_READY_DELAY_MS,
    currentPage = getCurrentPath()
  } = options;

  const state = getAppAdState();

  if (!state.session_started_at) {
    const started = nowTs();
    return setAppAdState({
      ...state,
      session_started_at: started,
      ready_after: started + Number(delayMs || DEFAULT_READY_DELAY_MS),
      current_page: normalizePath(currentPage)
    });
  }

  return setAppAdState({
    ...state,
    current_page: normalizePath(currentPage)
  });
}

export function getCurrentDailyAdState() {
  return getAppAdState();
}

export function isDailyAdEligible() {
  const state = getAppAdState();
  if (state.shown_today) return false;
  if (!state.session_started_at || !state.ready_after) return false;
  return nowTs() >= state.ready_after;
}

export async function maybeShowDailyTransitionAd(options = {}) {
  const {
    fromPage = getCurrentPath(),
    toPage = "",
    onBeforeAd = null,
    onAfterAd = null,
    onNoAd = null
  } = options;

  const state = getAppAdState();
  const currentFrom = normalizePath(fromPage || state.current_page || getCurrentPath());
  const nextTo = normalizePath(toPage);

  if (!nextTo || nextTo === currentFrom) {
    if (typeof onNoAd === "function") await onNoAd();
    return false;
  }

  if (isJetonBuyPath(nextTo)) {
    if (typeof onNoAd === "function") await onNoAd();
    return false;
  }

  if (state.shown_today || !state.ready_after || nowTs() < state.ready_after) {
    if (typeof onNoAd === "function") await onNoAd();
    return false;
  }

  try {
    if (typeof onBeforeAd === "function") await onBeforeAd();
  } catch {}

  const accepted = await showSoftAdModal({
    title: "Küçük Bir Bilgilendirme",
    text:
      "Uygulamayı ücretsiz sunabilmemiz için, sayfalar arasında geçişlerde günde yalnızca 1 kez kısa bir reklam gösterilebilir.\n" +
      "Offline dil indirmelerinde ise, her dil için indirme öncesinde bir kez reklam gösterilebilir.\n" +
      "Anlayışınız için teşekkür ederiz."
  });

  if (!accepted) {
    if (typeof onAfterAd === "function") await onAfterAd(false);
    return false;
  }

  let shown = false;

  if (hasNativeInterstitial()) {
    shown = await showNativeInterstitial("daily_transition");
  } else {
    showFallbackAdInfo("Bu uygulamada sayfalar arası geçişlerde günde sadece 1 reklam gösterilir.");
    shown = true;
  }

  if (shown) {
    setAppAdState({
      ...state,
      shown_today: true,
      current_page: currentFrom
    });
  }

  try {
    if (typeof onAfterAd === "function") await onAfterAd(shown);
  } catch {}

  return shown;
}

export function markCurrentPageForAdSession(path = getCurrentPath()) {
  const state = getAppAdState();
  setAppAdState({
    ...state,
    current_page: normalizePath(path)
  });
}

export function hasShownOfflineDownloadAd(fromLang, toLang) {
  const key = normalizePairKey(fromLang, toLang);
  if (!key) return false;
  const state = getOfflineAdState();
  return !!state.shown_pairs[key];
}

export function markOfflineDownloadAdShown(fromLang, toLang) {
  const key = normalizePairKey(fromLang, toLang);
  if (!key) return;

  const state = getOfflineAdState();
  state.shown_pairs[key] = true;
  setOfflineAdState(state);
}

export async function maybeShowOfflineDownloadAd(options = {}) {
  const {
    fromLang = "",
    toLang = "",
    onBeforeAd = null,
    onAfterAd = null
  } = options;

  const key = normalizePairKey(fromLang, toLang);
  if (!key) return false;

  if (hasShownOfflineDownloadAd(fromLang, toLang)) {
    return true;
  }

  try {
    if (typeof onBeforeAd === "function") await onBeforeAd();
  } catch {}

  let rewarded = false;

  if (hasNativeRewarded()) {
    rewarded = await showNativeRewarded(key, "offline_download");
  } else {
    showFallbackAdInfo("Bu dili indirmeden önce kısa bir video gösterilebilir.");
    rewarded = true;
  }

  if (rewarded) {
    markOfflineDownloadAdShown(fromLang, toLang);
  }

  try {
    if (typeof onAfterAd === "function") await onAfterAd(rewarded);
  } catch {}

  return rewarded;
}

export function resetDailyAdStateForDebug() {
  try {
    localStorage.removeItem(APP_AD_STATE_KEY);
  } catch {}
}

export function resetOfflineAdStateForDebug() {
  try {
    localStorage.removeItem(OFFLINE_AD_STATE_KEY);
  } catch {}
          }
