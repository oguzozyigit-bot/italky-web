// /js/offline_pack_bridge.js

const OFFLINE_INSTALLED_KEY = "italky_offline_installed_pairs_v7";
const NATIVE_LANG_KEY = "italky_native_lang_v7";
const OFFLINE_LICENSE_DAYS_KEY = "italky_offline_license_days_v7";
const HOME_LANG_WIDGET_KEY = "italky_home_lang_pack_widget_v1";
const QUEUE_KEY = "italky_offline_download_queue_v1";
const ACTIVE_KEY = "italky_offline_download_active_v1";

const ACTIVE_STALE_MS = 8 * 60 * 1000;
const PENDING_START_TIMEOUT_MS = 6 * 60 * 1000;

let pendingRewardResolve = null;
let pendingRewardTimer = null;
let activeDownload = null;
let langInfoResolverGlobal = null;
let handlersInstalled = false;

function canonical(code = "") {
  return String(code || "").toLowerCase().split("-")[0].trim();
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
    localStorage.setItem(key, JSON.stringify(value || {}));
  } catch {}
}

function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function pairKey(from, to) {
  return `${canonical(from)}_${canonical(to)}`;
}

function getItemTime(item) {
  if (!item) return 0;

  const raw =
    item.updatedAt ||
    item.startedAt ||
    item.queuedAt ||
    item.createdAt ||
    "";

  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function isStaleActive(item) {
  if (!item) return false;

  const t = getItemTime(item);
  if (!t) return false;

  return Date.now() - t > ACTIVE_STALE_MS;
}

function isPendingStartExpired(item) {
  if (!item) return false;

  const percent = Number(item.percent || 0);

  // Native started/progress event geldiyse artık web tarafı erken temizlemesin.
  // ML Kit ilk model indirmesi birkaç dakika sürebilir.
  if (percent >= 10) return false;

  const t = getItemTime(item);
  if (!t) return false;

  return Date.now() - t > PENDING_START_TIMEOUT_MS;
}
function dispatchState() {
  window.dispatchEvent(
    new CustomEvent("offlinePackBridgeStateChanged", {
      detail: getState()
    })
  );
}

function clearActiveDownload() {
  activeDownload = null;
  removeKey(ACTIVE_KEY);
}

function clearStaleActiveDownload({ notify = false } = {}) {
  const active = activeDownload || readJson(ACTIVE_KEY, null);

  if (!active) return false;

  if (isStaleActive(active) || isPendingStartExpired(active)) {
    const source = canonical(active.source || "");
    const target = canonical(active.target || "");

    if (source && target) {
      saveHomeWidget(source, target, langInfoResolverGlobal, "failed", false);
    }

    clearActiveDownload();

    if (notify) dispatchState();

    setTimeout(() => {
      startNextQueuedDownload(langInfoResolverGlobal);
    }, 300);

    return true;
  }

  return false;
}

function getState() {
  clearStaleActiveDownload({ notify: false });

  return {
    active: activeDownload || readJson(ACTIVE_KEY, null),
    queue: getQueue()
  };
}

function getQueue() {
  const data = readJson(QUEUE_KEY, []);
  return Array.isArray(data) ? data : [];
}

function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(Array.isArray(queue) ? queue : []));
  } catch {}

  dispatchState();
}

function setActiveDownload(item) {
  activeDownload = item || null;

  try {
    if (item) localStorage.setItem(ACTIVE_KEY, JSON.stringify(item));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}

  dispatchState();
}

function getActiveDownload() {
  clearStaleActiveDownload({ notify: true });
  return activeDownload || readJson(ACTIVE_KEY, null);
}

function resetDownloadState() {
  clearActiveDownload();
  saveQueue([]);
  dispatchState();
}

function isPairActive(source, target) {
  const active = getActiveDownload();
  if (!active) return false;

  const s = canonical(source);
  const t = canonical(target);

  return canonical(active.source) === s && canonical(active.target) === t;
}

function isPairQueued(source, target) {
  const s = canonical(source);
  const t = canonical(target);

  return getQueue().some((item) => {
    return canonical(item.source) === s && canonical(item.target) === t;
  });
}

function enqueueDownload(source, target, langInfoResolver) {
  clearStaleActiveDownload({ notify: true });

  const s = canonical(source);
  const t = canonical(target);

  if (!s || !t || s === t) {
    return { ok: false, error: "invalid_pair" };
  }

  if (hasInstalledPair(s, t)) {
    saveHomeWidget(s, t, langInfoResolver, "ready");
    return { ok: true, queued: false, alreadyInstalled: true };
  }

  if (isPairActive(s, t)) {
    return { ok: true, queued: false, active: true };
  }

  if (isPairQueued(s, t)) {
    return { ok: true, queued: true, duplicate: true };
  }

  const queue = getQueue();

  const sourceInfo = typeof langInfoResolver === "function"
    ? langInfoResolver(s)
    : { name: s.toUpperCase(), flag: "🌐" };

  const targetInfo = typeof langInfoResolver === "function"
    ? langInfoResolver(t)
    : { name: t.toUpperCase(), flag: "🌐" };

  queue.push({
    source: s,
    target: t,
    sourceName: sourceInfo?.name || s.toUpperCase(),
    targetName: targetInfo?.name || t.toUpperCase(),
    sourceFlag: sourceInfo?.flag || "🌐",
    targetFlag: targetInfo?.flag || "🌐",
    queuedAt: new Date().toISOString()
  });

  saveQueue(queue);
  saveHomeWidget(s, t, langInfoResolver, "queued");

  startNextQueuedDownload(langInfoResolver);

  return { ok: true, queued: true };
}

function startNextQueuedDownload(langInfoResolver) {
  clearStaleActiveDownload({ notify: true });

  if (getActiveDownload()) {
    return { ok: true, active: true };
  }

  const queue = getQueue();
  const next = queue.shift();

  if (!next) {
    saveQueue([]);
    return { ok: true, idle: true };
  }

  saveQueue(queue);

  return startNativeDownload(next.source, next.target, langInfoResolver, {
    fromQueue: true
  });
}

function getInstalledPairs() {
  syncInstalledPairsFromNative();
  return readJson(OFFLINE_INSTALLED_KEY, {});
}

function saveInstalledPairs(map) {
  writeJson(OFFLINE_INSTALLED_KEY, map || {});

  try {
    if (window.OfflineTranslate?.setInstalledOfflinePairs) {
      window.OfflineTranslate.setInstalledOfflinePairs(JSON.stringify(map || {}));
    }
  } catch (e) {
    console.warn("[offline_pack_bridge] native installed write failed:", e);
  }

  dispatchState();
}

function syncInstalledPairsFromNative() {
  try {
    if (!window.OfflineTranslate?.getInstalledOfflinePairs) return;

    const raw = window.OfflineTranslate.getInstalledOfflinePairs() || "{}";
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === "object") {
      localStorage.setItem(OFFLINE_INSTALLED_KEY, JSON.stringify(parsed));
    }
  } catch (e) {
    console.warn("[offline_pack_bridge] native installed read failed:", e);
  }
}

function clearInstalledPairs() {
  saveInstalledPairs({});

  try {
    if (window.OfflineTranslate?.clearInstalledOfflinePairs) {
      window.OfflineTranslate.clearInstalledOfflinePairs();
    }
  } catch (e) {
    console.warn("[offline_pack_bridge] native installed clear failed:", e);
  }

  dispatchState();
}

function hasAnyInstalledPair() {
  return Object.keys(getInstalledPairs()).length > 0;
}

function hasInstalledPair(source, target) {
  const s = canonical(source);
  const t = canonical(target);
  const installed = getInstalledPairs();

  return !!installed[pairKey(s, t)] && !!installed[pairKey(t, s)];
}

function markInstalledPair(source, target) {
  const s = canonical(source);
  const t = canonical(target);

  if (!s || !t || s === t) return;

  const installed = getInstalledPairs();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const installedAt = new Date().toISOString();

  installed[pairKey(s, t)] = {
    from: s,
    to: t,
    installedAt,
    expiresAt
  };

  installed[pairKey(t, s)] = {
    from: t,
    to: s,
    installedAt,
    expiresAt
  };

  saveInstalledPairs(installed);
  dispatchState();
}

function getOfflineNativeLang(fallback = "tr") {
  return canonical(localStorage.getItem(NATIVE_LANG_KEY) || fallback || "tr") || "tr";
}

function setOfflineNativeLang(code) {
  const clean = canonical(code || "tr") || "tr";

  localStorage.setItem(NATIVE_LANG_KEY, clean);

  try {
    if (window.OfflineTranslate?.setNativeOfflineLang) {
      window.OfflineTranslate.setNativeOfflineLang(clean);
    }
  } catch (e) {
    console.warn("[offline_pack_bridge] native lang write failed:", e);
  }

  dispatchState();
  return clean;
}

function ensurePublicOfflineLicense(days = 365) {
  try {
    localStorage.setItem(OFFLINE_LICENSE_DAYS_KEY, String(days));

    if (window.OfflineTranslate?.setMockOfflineLicense) {
      window.OfflineTranslate.setMockOfflineLicense(days);
    }
  } catch (e) {
    console.warn("[offline_pack_bridge] license write failed:", e);
  }
}

function canUseNativeInstaller() {
  return !!(
    window.OfflineTranslate &&
    typeof window.OfflineTranslate.downloadBiDirectionalPair === "function"
  );
}

function canUseNativeTranslator() {
  return !!(
    window.OfflineTranslate &&
    typeof window.OfflineTranslate.translate === "function"
  );
}

function saveHomeWidget(source, target, langInfoResolver, status = "downloading", emit = true) {
  const s = canonical(source);
  const t = canonical(target);

  if (!s || !t || s === t) return;

  const sourceInfo = typeof langInfoResolver === "function"
    ? langInfoResolver(s)
    : { code: s, name: s.toUpperCase(), flag: "🌐" };

  const targetInfo = typeof langInfoResolver === "function"
    ? langInfoResolver(t)
    : { code: t, name: t.toUpperCase(), flag: "🌐" };

  let statusText = "Dil paketi indiriliyor";

  if (status === "ready") statusText = "Dil paketi hazır";
  if (status === "queued") statusText = "Sıraya alındı";
  if (status === "failed") statusText = "İndirme başarısız";

  const item = {
    source: s,
    target: t,
    sourceName: sourceInfo?.name || s.toUpperCase(),
    targetName: targetInfo?.name || t.toUpperCase(),
    sourceFlag: sourceInfo?.flag || "🌐",
    targetFlag: targetInfo?.flag || "🌐",
    title: `${sourceInfo?.name || s.toUpperCase()} ⇄ ${targetInfo?.name || t.toUpperCase()}`,
    status,
    statusText,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(HOME_LANG_WIDGET_KEY, JSON.stringify(item));
  } catch (e) {
    console.warn("[offline_pack_bridge] home widget write failed:", e);
  }

  if (emit) dispatchState();
}

function callRewardedAd(adUnit, langCode = "") {
  let called = false;

  try {
    if (window.AndroidAdBridge?.showRewardedAdForLang) {
      window.AndroidAdBridge.showRewardedAdForLang(langCode, adUnit);
      called = true;
    }
  } catch {}

  try {
    if (!called && window.AndroidAdBridge?.showRewardedAd) {
      window.AndroidAdBridge.showRewardedAd(adUnit);
      called = true;
    }
  } catch {}

  try {
    if (!called && window.NativeAds?.showRewardedAdForLang) {
      window.NativeAds.showRewardedAdForLang(langCode, adUnit);
      called = true;
    }
  } catch {}

  try {
    if (!called && window.NativeAds?.showRewardedAd) {
      window.NativeAds.showRewardedAd(adUnit);
      called = true;
    }
  } catch {}

  try {
    if (!called && window.AdMobBridge?.showRewardedAdForLang) {
      window.AdMobBridge.showRewardedAdForLang(langCode, adUnit);
      called = true;
    }
  } catch {}

  try {
    if (!called && window.AdMobBridge?.showRewardedAd) {
      window.AdMobBridge.showRewardedAd(adUnit);
      called = true;
    }
  } catch {}

  try {
    if (!called && window.Native?.showRewardedAd) {
      window.Native.showRewardedAd(langCode, adUnit);
      called = true;
    }
  } catch {}

  return called;
}

function finishReward(ok) {
  if (typeof pendingRewardResolve !== "function") return;

  const resolve = pendingRewardResolve;
  pendingRewardResolve = null;

  clearTimeout(pendingRewardTimer);
  pendingRewardTimer = null;

  resolve(!!ok);
}

window.onNativeRewardEarned = function () {
  finishReward(true);
};

window.onNativeRewardClosed = function (payload) {
  if (payload && payload.shown === false) {
    finishReward(false);
    return;
  }

  if (pendingRewardResolve) {
    finishReward(true);
  }
};

function showRewardedAd({ adUnit = "offline_download", langCode = "", timeoutMs = 20000 } = {}) {
  return new Promise((resolve) => {
    pendingRewardResolve = resolve;

    const called = callRewardedAd(adUnit, langCode);

    if (!called) {
      finishReward(false);
      return;
    }

    pendingRewardTimer = setTimeout(() => {
      finishReward(false);
    }, timeoutMs);
  });
}

function preloadRewardedAd() {
  try {
    if (window.AndroidAdBridge?.preloadRewardedAd) {
      window.AndroidAdBridge.preloadRewardedAd();
      return;
    }

    if (window.NativeAds?.preloadRewardedAd) {
      window.NativeAds.preloadRewardedAd();
      return;
    }

    if (window.AdMobBridge?.preloadRewardedAd) {
      window.AdMobBridge.preloadRewardedAd();
    }
  } catch {}
}

function startNativeDownload(source, target, langInfoResolver, options = {}) {
  clearStaleActiveDownload({ notify: true });

  const s = canonical(source);
  const t = canonical(target);

  langInfoResolverGlobal = langInfoResolver || langInfoResolverGlobal;

  if (!s || !t || s === t) {
    return { ok: false, error: "invalid_pair" };
  }

  if (hasInstalledPair(s, t)) {
    saveHomeWidget(s, t, langInfoResolverGlobal, "ready");
    return { ok: true, alreadyInstalled: true };
  }

  if (getActiveDownload() && !options.fromQueue) {
    return enqueueDownload(s, t, langInfoResolverGlobal);
  }

  if (!canUseNativeInstaller()) {
    return { ok: false, error: "native_installer_missing" };
  }

  ensurePublicOfflineLicense(365);

  try {
    window.OfflineTranslate.downloadBiDirectionalPair(
      JSON.stringify({
        source: s,
        target: t
      })
    );

    setActiveDownload({
      source: s,
      target: t,
      percent: 1,
      label: "Başlatılıyor...",
      message: "",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    saveHomeWidget(s, t, langInfoResolverGlobal, "downloading");

    setTimeout(() => {
      clearStaleActiveDownload({ notify: true });
    }, PENDING_START_TIMEOUT_MS + 1000);

    return { ok: true, active: true };
  } catch (e) {
    clearActiveDownload();
    saveHomeWidget(s, t, langInfoResolverGlobal, "failed");

    return {
      ok: false,
      error: e?.message || "download_call_failed"
    };
  }
}

function installDownloadEventHandlers(langInfoResolver) {
  langInfoResolverGlobal = langInfoResolver || langInfoResolverGlobal;

  if (handlersInstalled) return;
  handlersInstalled = true;

  window.addEventListener("offlinePairDownloadStarted", (e) => {
    const d = e.detail || {};
    const source = canonical(d.source || getActiveDownload()?.source);
    const target = canonical(d.target || getActiveDownload()?.target);

    if (!source || !target) return;

    setActiveDownload({
      source,
      target,
      percent: 10,
      label: "Başlatılıyor...",
      message: d.message || "",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    saveHomeWidget(source, target, langInfoResolverGlobal, "downloading");
  });

  window.addEventListener("offlinePairDownloadProgress", (e) => {
    const d = e.detail || {};
    const source = canonical(d.source || getActiveDownload()?.source);
    const target = canonical(d.target || getActiveDownload()?.target);

    if (!source || !target) return;

    setActiveDownload({
      source,
      target,
      percent: Number(d.percent || 0),
      label: d.label || "İndiriliyor...",
      message: d.message || "",
      startedAt: getActiveDownload()?.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    saveHomeWidget(source, target, langInfoResolverGlobal, "downloading");
  });

  window.addEventListener("offlinePairDownloadCompleted", (e) => {
    const d = e.detail || {};
    const source = canonical(d.source || getActiveDownload()?.source);
    const target = canonical(d.target || getActiveDownload()?.target);

    if (!source || !target) return;

    markInstalledPair(source, target);
    saveHomeWidget(source, target, langInfoResolverGlobal, "ready");
    setActiveDownload(null);

    setTimeout(() => {
      startNextQueuedDownload(langInfoResolverGlobal);
    }, 600);
  });

  window.addEventListener("offlinePairDownloadFailed", (e) => {
    const d = e.detail || {};
    const source = canonical(d.source || getActiveDownload()?.source);
    const target = canonical(d.target || getActiveDownload()?.target);

    if (source && target) {
      saveHomeWidget(source, target, langInfoResolverGlobal, "failed");
    }

    setActiveDownload(null);

    setTimeout(() => {
      startNextQueuedDownload(langInfoResolverGlobal);
    }, 900);
  });

  clearStaleActiveDownload({ notify: true });
}

function translateOffline(text, source, target) {
  return new Promise((resolve) => {
    if (!canUseNativeTranslator()) {
      resolve(null);
      return;
    }

    const handler = (e) => {
      window.removeEventListener("offlineTranslateResult", handler);

      const value = String(
        e.detail?.translatedText ||
        e.detail?.translation ||
        ""
      ).trim();

      resolve(value || null);
    };

    window.addEventListener("offlineTranslateResult", handler);

    try {
      window.OfflineTranslate.translate(
        JSON.stringify({
          text: String(text || "").trim(),
          from: canonical(source),
          to: canonical(target)
        })
      );
    } catch {
      window.removeEventListener("offlineTranslateResult", handler);
      resolve(null);
    }
  });
}

export const OfflinePackBridge = {
  canonical,
  readJson,
  getState,
  getQueue,
  getActiveDownload,
  resetDownloadState,
  isPairActive,
  isPairQueued,
  enqueueDownload,
  startNextQueuedDownload,
  getInstalledPairs,
  saveInstalledPairs,
  syncInstalledPairsFromNative,
  clearInstalledPairs,
  hasAnyInstalledPair,
  hasInstalledPair,
  markInstalledPair,
  getOfflineNativeLang,
  setOfflineNativeLang,
  ensurePublicOfflineLicense,
  canUseNativeInstaller,
  canUseNativeTranslator,
  saveHomeWidget,
  showRewardedAd,
  preloadRewardedAd,
  startNativeDownload,
  installDownloadEventHandlers,
  translateOffline
};
