export function getOfflineStatus() {
  if (!window.OfflineTranslate) {
    return { ok: false, error: "OfflineTranslate bridge not available" };
  }

  try {
    return JSON.parse(window.OfflineTranslate.getOfflineStatus());
  } catch (e) {
    return { ok: false, error: "offline_status_parse_failed" };
  }
}

export function setMockOfflineLicense(days = 30) {
  if (!window.OfflineTranslate) {
    throw new Error("OfflineTranslate bridge not available");
  }
  window.OfflineTranslate.setMockOfflineLicense(Number(days) || 30);
}

export function clearOfflineLicense() {
  if (!window.OfflineTranslate) {
    throw new Error("OfflineTranslate bridge not available");
  }
  window.OfflineTranslate.clearOfflineLicense();
}

export function downloadOfflineModel(from, to, wifiOnly = false) {
  if (!window.OfflineTranslate) {
    throw new Error("OfflineTranslate bridge not available");
  }

  window.OfflineTranslate.downloadModel(
    JSON.stringify({
      from,
      to,
      wifiOnly
    })
  );
}

export function translateOffline(from, to, text) {
  if (!window.OfflineTranslate) {
    throw new Error("OfflineTranslate bridge not available");
  }

  window.OfflineTranslate.translate(
    JSON.stringify({
      from,
      to,
      text
    })
  );
}

export function bindOfflineTranslateEvents({ onDownloadResult, onTranslateResult } = {}) {
  window.addEventListener("offlineModelDownloadResult", (e) => {
    onDownloadResult?.(e.detail || {});
  });

  window.addEventListener("offlineTranslateResult", (e) => {
    onTranslateResult?.(e.detail || {});
  });
}
