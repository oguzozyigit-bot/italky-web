const APP_AD_STATE_KEY = "italky_app_ad_state_v5";
const OFFLINE_AD_STATE_KEY = "italky_offline_ad_state_v4";

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

function isHomePath(path = "") {
  const p = normalizePath(path);
  return p === "/" || p === "/pages/home.html";
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
      current_page: "",
      startup_page: ""
    };
    writeJson(APP_AD_STATE_KEY, fresh);
    return fresh;
  }

  return {
    day: today,
    shown_today: !!state.shown_today,
    session_started_at: Number(state.session_started_at || 0),
    ready_after: Number(state.ready_after || 0),
    current_page: String(state.current_page || ""),
    startup_page: String(state.startup_page || "")
  };
}

function setAppAdState(next) {
  const merged = {
    day: todayKey(),
    shown_today: !!next.shown_today,
    session_started_at: Number(next.session_started_at || 0),
    ready_after: Number(next.ready_after || 0),
    current_page: String(next.current_page || ""),
    startup_page: String(next.startup_page || "")
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
      position:fixed;
      inset:0;
      z-index:999999;
      display:none;
      align-items:center;
      justify-content:center;
      padding:20px;
      background:rgba(4,8,18,.58);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
    }
    .italky-ad-info-backdrop.open{
      display:flex;
    }
    .italky-ad-info-card{
      width:min(100%, 430px);
      border-radius:26px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.08);
      background:linear-gradient(180deg, rgba(10,16,30,.98), rgba(8,12,24,.98));
      box-shadow:0 24px 50px rgba(0,0,0,.34);
      color:#fff;
      font-family:Outfit, system-ui, sans-serif;
    }
    .italky-ad-info-top{
      padding:18px 18px 14px;
      background:
        radial-gradient(circle at top left, rgba(191,219,254,.16), transparent 38%),
        linear-gradient(135deg, #142033 0%, #1a2740 52%, #202b46 100%);
      border-bottom:1px solid rgba(255,255,255,.06);
    }
    .italky-ad-info-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:32px;
      padding:8px 14px;
      border-radius:999px;
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.10);
      color:rgba(255,255,255,.92);
      font-size:12px;
      font-weight:1000;
    }
    .italky-ad-info-title{
      margin:12px 0 8px;
      font-size:24px;
      line-height:1.08;
      font-weight:1000;
      letter-spacing:-.5px;
      color:#eef4ff;
    }
    .italky-ad-info-text{
      margin:0;
      font-size:13px;
      line-height:1.68;
      font-weight:800;
      color:rgba(235,242,255,.82);
      white-space:pre-line;
    }
    .italky-ad-info-body{
      padding:16px;
      display:grid;
      gap:10px;
      background:linear-gradient(180deg, rgba(9,13,24,.98), rgba(7,10,20,.98));
    }
    .italky-ad-info-btn{
      min-height:50px;
      border:none;
      border-radius:16px;
      cursor:pointer;
      font-family:inherit;
      font-size:14px;
      font-weight:1000;
      transition:transform .14s ease, opacity .14s ease;
    }
    .italky-ad-info-btn:active{
      transform:scale(.985);
    }
    .italky-ad-info-btn.primary{
      background:linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 50%, #ddd6fe 100%);
      color:#111827;
      box-shadow:0 12px 24px rgba(99,102,241,.16);
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
        <button class="italky-ad-info-btn primary" id="italkyAdInfoOk" type="button">Tamam</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  return modal;
}

function showSoftAdModal({
  title = "Küçük Bir Bilgilendirme",
  text = "Uygulamayı ücretsiz sunabilmemiz için günde yalnızca 1 kez kısa bir reklam gösterilir.\nOffline dil indirmelerinde ise, ilgili dil için reklam izlendiğinde indirme otomatik başlar.\nAnlayışınız için teşekkür ederiz."
} = {}) {
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

async function showNativeInterstitial(reason = "app_open_daily") {
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
    const old = document.getElementById("italkyAdMiniToast");
    if (old) old.remove();

    const toast = document.createElement("div");
    toast.id = "italkyAdMiniToast";
    toast.textContent = String(message || "");

    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.bottom = "28px";
    toast.style.transform = "translateX(-50%) translateY(120px)";
    toast.style.maxWidth = "min(92vw, 520px)";
    toast.style.padding = "14px 18px";
    toast.style.borderRadius = "18px";
    toast.style.background = "rgba(10,16,30,.96)";
    toast.style.border = "1px solid rgba(255,255,255,.10)";
    toast.style.boxShadow = "0 18px 36px rgba(0,0,0,.32)";
    toast.style.backdropFilter = "blur(12px)";
    toast.style.webkitBackdropFilter = "blur(12px)";
    toast.style.color = "#eef4ff";
    toast.style.fontFamily = "Outfit, system-ui, sans-serif";
    toast.style.fontSize = "13px";
    toast.style.fontWeight = "800";
    toast.style.lineHeight = "1.55";
    toast.style.textAlign = "center";
    toast.style.zIndex = "1000000";
    toast.style.transition = "transform .22s ease, opacity .22s ease";
    toast.style.opacity = "0";

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

/*
  Günlük reklam oturumu sadece uygulama ana girişinde başlasın.
*/
export function beginDailyAdSession(options = {}) {
  const {
    delayMs = DEFAULT_READY_DELAY_MS,
    currentPage = getCurrentPath()
  } = options;

  const normalizedPage = normalizePath(currentPage);
  const state = getAppAdState();

  if (!isHomePath(normalizedPage)) {
    return setAppAdState({
      ...state,
      current_page: normalizedPage
    });
  }

  if (!state.session_started_at) {
    const started = nowTs();
    return setAppAdState({
      ...state,
      session_started_at: started,
      ready_after: started + Number(delayMs || DEFAULT_READY_DELAY_MS),
      current_page: normalizedPage,
      startup_page: normalizedPage
    });
  }

  return setAppAdState({
    ...state,
    current_page: normalizedPage
  });
}

export function getCurrentDailyAdState() {
  return getAppAdState();
}

export function isDailyAdEligible() {
  const state = getAppAdState();
  if (state.shown_today) return false;
  if (!state.session_started_at || !state.ready_after) return false;
  if (!isHomePath(state.startup_page || state.current_page || "")) return false;
  return nowTs() >= state.ready_after;
}

/*
  Artık modül geçiş reklamı değil.
  Sadece HOME üzerinde, günde 1 kez app-open reklamı.
*/
export async function maybeShowDailyTransitionAd(options = {}) {
  const {
    currentPage = getCurrentPath(),
    onBeforeAd = null,
    onAfterAd = null,
    onNoAd = null
  } = options;

  const page = normalizePath(currentPage);
  const state = getAppAdState();

  if (!isHomePath(page)) {
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
      "Uygulamayı ücretsiz sunabilmemiz için günde yalnızca 1 kez kısa bir reklam gösterilir.\n" +
      "Bu reklam yalnızca uygulamaya ilk girişte gösterilir.\n" +
      "Offline dil indirmelerinde ise reklam izlendiğinde indirme otomatik başlar.\n" +
      "Anlayışınız için teşekkür ederiz."
  });

  if (!accepted) {
    if (typeof onAfterAd === "function") await onAfterAd(false);
    return false;
  }

  let shown = false;

  if (hasNativeInterstitial()) {
    shown = await showNativeInterstitial("app_open_daily");
  } else {
    showFallbackAdInfo("Bu uygulamada günlük reklam yalnızca ana girişte 1 kez gösterilir.");
    shown = true;
  }

  if (shown) {
    setAppAdState({
      ...state,
      shown_today: true,
      current_page: page,
      startup_page: page
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

/*
  Offline ödüllü reklam:
  reklam izlendiğinde true döner.
  Çağıran sayfa bu true sonrası indirmeyi otomatik başlatmalıdır.
*/
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
    if (typeof onAfterAd === "function") await onAfterAd(true);
    return true;
  }

  try {
    if (typeof onBeforeAd === "function") await onBeforeAd();
  } catch {}

  let rewarded = false;

  if (hasNativeRewarded()) {
    rewarded = await showNativeRewarded(key, "offline_download");
  } else {
    showFallbackAdInfo(
      "Bu dili indirmek için kısa bir video izlenmesi gerekir. Reklam tamamlandığında indirme otomatik başlar ve aynı dil için tekrar reklam gösterilmez."
    );
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
