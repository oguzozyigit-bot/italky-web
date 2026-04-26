// /js/offline_pack_bridge.js

const OFFLINE_INSTALLED_KEY = "italky_offline_installed_pairs_v7";
const NATIVE_LANG_KEY = "italky_native_lang_v7";
const OFFLINE_LICENSE_DAYS_KEY = "italky_offline_license_days_v7";
const HOME_LANG_WIDGET_KEY = "italky_home_lang_pack_widget_v1";

let pendingRewardResolve = null;
let pendingRewardTimer = null;
let pendingDownloadSource = "";
let pendingDownloadTarget = "";

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

function pairKey(from, to) {
  return `${canonical(from)}_${canonical(to)}`;
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

function saveHomeWidget(source, target, langInfoResolver, status = "downloading") {
  const s = canonical(source);
  const t = canonical(target);

  if (!s || !t || s === t) return;

  const sourceInfo = typeof langInfoResolver === "function"
    ? langInfoResolver(s)
    : { code: s, name: s.toUpperCase(), flag: "🌐" };

  const targetInfo = typeof langInfoResolver === "function"
    ? langInfoResolver(t)
    : { code: t, name: t.toUpperCase(), flag: "🌐" };

  const item = {
    source: s,
    target: t,
    sourceName: sourceInfo?.name || s.toUpperCase(),
    targetName: targetInfo?.name || t.toUpperCase(),
    sourceFlag: sourceInfo?.flag || "🌐",
    targetFlag: targetInfo?.flag || "🌐",
    title: `${sourceInfo?.name || s.toUpperCase()} ⇄ ${targetInfo?.name || t.toUpperCase()}`,
    status,
    statusText: status === "ready" ? "Dil paketi hazır" : "Dil paketi indiriliyor",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(HOME_LANG_WIDGET_KEY, JSON.stringify(item));
  } catch (e) {
    console.warn("[offline_pack_bridge] home widget write failed:", e);
  }
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

function startNativeDownload(source, target, langInfoResolver) {
  const s = canonical(source);
  const t = canonical(target);

  if (!s || !t || s === t) {
    return {
      ok: false,
      error: "invalid_pair"
    };
  }

  if (!canUseNativeInstaller()) {
    return {
      ok: false,
      error: "native_installer_missing"
    };
  }

  ensurePublicOfflineLicense(365);

  pendingDownloadSource = s;
  pendingDownloadTarget = t;

  try {
    window.OfflineTranslate.downloadBiDirectionalPair(
      JSON.stringify({
        source: s,
        target: t
      })
    );

    saveHomeWidget(s, t, langInfoResolver, "downloading");

    return {
      ok: true
    };
  } catch (e) {
    pendingDownloadSource = "";
    pendingDownloadTarget = "";

    return {
      ok: false,
      error: e?.message || "download_call_failed"
    };
  }
}

function installDownloadEventHandlers(langInfoResolver) {
  window.addEventListener("offlinePairDownloadStarted", (e) => {
    const d = e.detail || {};
    const source = canonical(d.source || pendingDownloadSource);
    const target = canonical(d.target || pendingDownloadTarget);

    if (!source || !target) return;

    saveHomeWidget(source, target, langInfoResolver, "downloading");
  });

  window.addEventListener("offlinePairDownloadCompleted", (e) => {
    const d = e.detail || {};
    const source = canonical(d.source || pendingDownloadSource);
    const target = canonical(d.target || pendingDownloadTarget);

    if (!source || !target) return;

    markInstalledPair(source, target);
    saveHomeWidget(source, target, langInfoResolver, "ready");

    pendingDownloadSource = "";
    pendingDownloadTarget = "";
  });

  window.addEventListener("offlinePairDownloadFailed", () => {
    pendingDownloadSource = "";
    pendingDownloadTarget = "";
  });
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
