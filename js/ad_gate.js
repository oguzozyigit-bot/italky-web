const MODULE_AD_STATE_KEY = "italky_module_ad_state_v1";
const OFFLINE_AD_STATE_KEY = "italky_offline_ad_state_v1";
const MODULE_AD_WAIT_MS = 3 * 60 * 1000;

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

function getModuleAdState() {
  const state = readJson(MODULE_AD_STATE_KEY, {});
  const today = todayKey();

  if (state.day !== today) {
    const fresh = {
      day: today,
      shown_today: false,
      active_module: "",
      entered_at: 0,
      eligible_at: 0
    };
    writeJson(MODULE_AD_STATE_KEY, fresh);
    return fresh;
  }

  return {
    day: today,
    shown_today: !!state.shown_today,
    active_module: String(state.active_module || ""),
    entered_at: Number(state.entered_at || 0),
    eligible_at: Number(state.eligible_at || 0)
  };
}

function setModuleAdState(next) {
  const merged = {
    day: todayKey(),
    shown_today: !!next.shown_today,
    active_module: String(next.active_module || ""),
    entered_at: Number(next.entered_at || 0),
    eligible_at: Number(next.eligible_at || 0)
  };
  writeJson(MODULE_AD_STATE_KEY, merged);
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

function normalizeModuleName(name) {
  return String(name || "").trim().toLowerCase();
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

async function showNativeInterstitial(reason = "module_switch") {
  if (!hasNativeInterstitial()) return false;

  try {
    window.Native.showInterstitialAd(reason);
    const result = await waitForAdClosed();
    return !!result;
  } catch {
    return false;
  }
}

function showFallbackAdInfo(message = "Bugünlük kısa reklam hakkınız kullanılıyor.") {
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

export function beginModuleAdSession(moduleName) {
  const mod = normalizeModuleName(moduleName);
  if (!mod) return;

  const enteredAt = nowTs();

  setModuleAdState({
    ...getModuleAdState(),
    active_module: mod,
    entered_at: enteredAt,
    eligible_at: enteredAt + MODULE_AD_WAIT_MS
  });
}

export function clearModuleAdSession(moduleName = "") {
  const state = getModuleAdState();
  const mod = normalizeModuleName(moduleName);

  if (!mod || state.active_module === mod) {
    setModuleAdState({
      ...state,
      active_module: "",
      entered_at: 0,
      eligible_at: 0
    });
  }
}

export function isModuleAdEligible() {
  const state = getModuleAdState();
  if (state.shown_today) return false;
  if (!state.active_module) return false;
  if (!state.eligible_at) return false;
  return nowTs() >= state.eligible_at;
}

export function getCurrentModuleAdState() {
  return getModuleAdState();
}

export async function maybeShowModuleExitAd(options = {}) {
  const {
    fromModule = "",
    toModule = "",
    onBeforeAd = null,
    onAfterAd = null,
    onNoAd = null,
    fallbackMessage = "Bugünlük reklam gösterimi yapılıyor. Bu sadece günde 1 kez olur."
  } = options;

  const state = getModuleAdState();
  const currentFrom = normalizeModuleName(fromModule || state.active_module);
  const nextTo = normalizeModuleName(toModule);

  if (!currentFrom) {
    if (typeof onNoAd === "function") await onNoAd();
    return false;
  }

  const switchingModule = nextTo && nextTo !== currentFrom;
  if (!switchingModule) {
    if (typeof onNoAd === "function") await onNoAd();
    return false;
  }

  if (state.shown_today || nowTs() < Number(state.eligible_at || 0)) {
    if (typeof onNoAd === "function") await onNoAd();
    return false;
  }

  try {
    if (typeof onBeforeAd === "function") await onBeforeAd();
  } catch {}

  let shown = false;

  if (hasNativeInterstitial()) {
    shown = await showNativeInterstitial("module_switch");
  } else {
    showFallbackAdInfo(fallbackMessage);
    shown = true;
  }

  if (shown) {
    setModuleAdState({
      ...state,
      shown_today: true
    });
  }

  try {
    if (typeof onAfterAd === "function") await onAfterAd(shown);
  } catch {}

  return shown;
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

export function resetModuleAdStateForDebug() {
  try {
    localStorage.removeItem(MODULE_AD_STATE_KEY);
  } catch {}
}

export function resetOfflineAdStateForDebug() {
  try {
    localStorage.removeItem(OFFLINE_AD_STATE_KEY);
  } catch {}
}
