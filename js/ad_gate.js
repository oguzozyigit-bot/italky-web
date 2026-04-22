const APP_AD_STATE_KEY = "italky_app_ad_state_v2";
const OFFLINE_AD_STATE_KEY = "italky_offline_ad_state_v1";

/*
  Reklam mantığı:
  - Kullanıcı uygulamaya/güne ilk girişte timer başlar
  - Varsayılan bekleme: 90 saniye
  - Süre dolduktan sonra ilk uygun sayfa geçişinde reklam gösterilir
  - Günde sadece 1 kez
  - Jeton yükleme sayfasına giderken reklam gösterilmez
*/

const DEFAULT_READY_DELAY_MS = 90 * 1000;

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

function normalizePairKey(fromLang, toLang) {
  const a = String(fromLang || "").trim().toLowerCase();
  const b = String(toLang || "").trim().toLowerCase();
  if (!a || !b) return "";
  return `${a}_${b}`;
}

function hasNativeInterstitial() {
  try {
    return !!(
      window.Native &&
      typeof window.Native.showInterstitialAd === "function"
    );
  } catch {
    return false;
  }
}

function waitForAdClosed(timeoutMs = 15000) {
  return new Promise((resolve) => {
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      window.removeEventListener("nativeInterstitialClosed", onClosed);
      window.removeEventListener("nativeInterstitialFailed", onFailed);
      clearTimeout(timer);
      resolve(result);
    };

    const onClosed = () => finish(true);
    const onFailed = () => finish(false);

    window.addEventListener("nativeInterstitialClosed", onClosed, { once: true });
    window.addEventListener("nativeInterstitialFailed", onFailed, { once: true });

    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}

async function showNativeInterstitial(reason = "daily_transition") {
  if (!hasNativeInterstitial()) return false;

  try {
    window.Native.showInterstitialAd(reason);
    const result = await waitForAdClosed();
    return !!result;
  } catch {
    return false;
  }
}

function showFallbackAdInfo(message = "Bugünlük kısa reklam gösterimi yapılıyor. Bu sadece günde 1 kez olur.") {
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

/*
  Uygulama/gün başlangıcı:
  - İlk uygun girişte session başlatılır
  - Aynı gün tekrar çağrılırsa sadece current_page güncellenir
*/
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
    onNoAd = null,
    fallbackMessage = "Bugünlük reklam gösterimi yapılıyor. Bu sadece günde 1 kez olur."
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

  let shown = false;

  if (hasNativeInterstitial()) {
    shown = await showNativeInterstitial("daily_transition");
  } else {
    showFallbackAdInfo(fallbackMessage);
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

/*
  Sayfa gerçekten değiştiğinde yeni aktif sayfayı kaydetmek için
*/
export function markCurrentPageForAdSession(path = getCurrentPath()) {
  const state = getAppAdState();
  setAppAdState({
    ...state,
    current_page: normalizePath(path)
  });
}

/*
  Offline dil indirimi için ayrı günlük reklam:
  Her dil çifti için günde 1 kez
*/
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
    onAfterAd = null,
    fallbackMessage = "Bu dil indirimi için kısa reklam gösterimi yapılıyor."
  } = options;

  const key = normalizePairKey(fromLang, toLang);
  if (!key) return false;

  if (hasShownOfflineDownloadAd(fromLang, toLang)) {
    return false;
  }

  try {
    if (typeof onBeforeAd === "function") await onBeforeAd();
  } catch {}

  let shown = false;

  if (hasNativeInterstitial()) {
    shown = await showNativeInterstitial("offline_download");
  } else {
    showFallbackAdInfo(fallbackMessage);
    shown = true;
  }

  if (shown) {
    markOfflineDownloadAdShown(fromLang, toLang);
  }

  try {
    if (typeof onAfterAd === "function") await onAfterAd(shown);
  } catch {}

  return shown;
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
