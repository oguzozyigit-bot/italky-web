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

  if (typeof window.OfflineTranslate.downloadBiDirectionalPair === "function") {
    window.OfflineTranslate.downloadBiDirectionalPair(
      JSON.stringify({
        source: from,
        target: to,
        wifiOnly: !!wifiOnly
      })
    );
    return;
  }

  if (typeof window.OfflineTranslate.downloadModel === "function") {
    window.OfflineTranslate.downloadModel(
      JSON.stringify({
        from,
        to,
        wifiOnly: !!wifiOnly
      })
    );
    return;
  }

  throw new Error("OfflineTranslate download method not available");
}

export function translateOffline(from, to, text) {
  if (!window.OfflineTranslate) {
    throw new Error("OfflineTranslate bridge not available");
  }

  if (typeof window.OfflineTranslate.translate !== "function") {
    throw new Error("OfflineTranslate translate method not available");
  }

  window.OfflineTranslate.translate(
    JSON.stringify({
      from,
      to,
      text
    })
  );
}
