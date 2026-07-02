// /js/offline_translate_bridge.js

import { modelParent, normalizeLangCode } from "/js/language_registry_129.js";

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

/**
 * Public FaceToFace/offline download modeli:
 * - Login yoksa bile indirme engellenmez.
 * - Lisans hatası bu dosyada bloklanmaz.
 * - Reklam gösterme işi sayfada yapılacak:
 *   Her dil indirme butonuna basınca önce reklam, sonra bu fonksiyon çağrılacak.
 */
export function downloadOfflineModel(from, to, wifiOnly = false) {
  if (!window.OfflineTranslate) {
    throw new Error("OfflineTranslate bridge not available");
  }

  const payload = {
    source: modelParent(from),
    target: modelParent(to),
    displaySource: normalizeLangCode(from),
    displayTarget: normalizeLangCode(to),
    from: modelParent(from),
    to: modelParent(to),
    wifiOnly: !!wifiOnly,

    // Yeni public kullanım işaretleri
    publicDownload: true,
    loginRequired: false,
    requireLicense: false,
    skipLicenseCheck: true,
    sourceModule: "offline_languages_public",
    source_system: "android_onnx_supabase"
  };

  if (typeof window.OfflineTranslate.downloadBiDirectionalPair === "function") {
    window.OfflineTranslate.downloadBiDirectionalPair(JSON.stringify(payload));
    return;
  }

  if (typeof window.OfflineTranslate.downloadModel === "function") {
    window.OfflineTranslate.downloadModel(JSON.stringify(payload));
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
