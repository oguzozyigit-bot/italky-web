const DEBUG_READY_KEY = "deneme_dual_ear_pro_debug_ready";
const HEADSET_LABEL_RE = /bluetooth|headset|headphones?|airpods|buds|earbuds?|kulakl[ıi]k|hands[-\s]?free|handsfree/i;

function isLocalhost() {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  } catch {
    return false;
  }
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function safeBool(value) {
  try {
    if (typeof value === "function") return !!value();
    return !!value;
  } catch {
    return false;
  }
}

function inspectPremiumObject(obj) {
  if (!obj || typeof obj !== "object") return false;

  const checks = [
    () => obj.isConnected?.(),
    () => obj.isReady?.(),
    () => obj.connected,
    () => obj.ready,
    () => obj.active,
    () => obj.mode === "bluetooth",
    () => obj.mode === "two-phone",
    () => obj.status === "connected",
    () => obj.status === "ready"
  ];

  return checks.some((fn) => safeBool(fn));
}

function getPremiumModuleSignal() {
  const names = [
    "italkyFaceBluetoothPremium",
    "italkyF2FBluetooth",
    "facetofaceBluetoothPremium",
    "FaceToFaceBluetoothPremium",
    "italkyBt",
    "btPremium"
  ];

  for (const name of names) {
    try {
      const obj = window[name];
      if (inspectPremiumObject(obj)) {
        return { ok: true, source: "premium-module", name };
      }
    } catch {}
  }

  return { ok: false, source: "none" };
}

function getBodyClassSignal() {
  try {
    const body = document.body?.classList;
    const root = document.documentElement?.classList;
    const hasStrongBodySignal =
      body?.contains("premium-bt-mode") ||
      body?.contains("bt-active") ||
      root?.contains("two-phone-ready");

    if (hasStrongBodySignal) return { ok: true, source: "body-class" };
  } catch {}

  return { ok: false, source: "none" };
}

function getUrlHelperSignal() {
  try {
    const mode = String(new URLSearchParams(location.search || "").get("mode") || "").toLowerCase();
    if (mode === "bluetooth" || mode === "two-phone") return { ok: true, source: "url-mode" };
  } catch {}
  return { ok: false, source: "none" };
}

async function hasHeadsetDeviceLabel() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return { ok: false, source: "none" };
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const hit = devices.find((d) => {
      const kind = String(d?.kind || "");
      const label = String(d?.label || "");
      return (kind === "audioinput" || kind === "audiooutput") && HEADSET_LABEL_RE.test(label);
    });

    return hit ? { ok: true, source: "device-label" } : { ok: false, source: "none" };
  } catch {
    return { ok: false, source: "none" };
  }
}

async function probeMicrophonePermission() {
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { ok: true };
  } catch (error) {
    const name = String(error?.name || error?.message || "").toLowerCase();
    if (name.includes("notallowed") || name.includes("permission") || name.includes("denied")) {
      return { ok: false, reason: "mic_permission_denied" };
    }
    return { ok: false, reason: "media_devices_missing" };
  } finally {
    try {
      stream?.getTracks?.().forEach((track) => track.stop());
    } catch {}
  }
}

function hasDebugOverride() {
  try {
    return localStorage.getItem(DEBUG_READY_KEY) === "1";
  } catch {
    return false;
  }
}

function isBusy(options = {}) {
  if (options.recordingSide) return true;
  if (options.recognizer) return true;

  const active = String(options.activeSide || "").toLowerCase();
  if (active === "listening" || active === "translating") return true;

  if (options.frameRoot?.classList?.contains?.("is-listening")) return true;
  if (options.frameRoot?.classList?.contains?.("is-translating")) return true;

  return false;
}

export async function getDualEarProStatus(options = {}) {
  try {
    const secureOk = !!window.isSecureContext || isLocalhost();
    if (!secureOk) {
      return { ok: false, reason: "not_secure_context", headsetLikely: false, source: "none" };
    }

    if (!getSpeechRecognitionCtor()) {
      return { ok: false, reason: "speech_unsupported", headsetLikely: false, source: "none" };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return { ok: false, reason: "media_devices_missing", headsetLikely: false, source: "none" };
    }

    if (String(options.currentRuntimeMode || "online").toLowerCase() === "offline") {
      return { ok: false, reason: "offline_mode", headsetLikely: false, source: "none" };
    }

    if (isBusy(options)) {
      return { ok: false, reason: "busy", headsetLikely: false, source: "none" };
    }

    const micProbe = await probeMicrophonePermission();
    if (!micProbe.ok) {
      return { ok: false, reason: micProbe.reason || "mic_permission_denied", headsetLikely: false, source: "none" };
    }

    if (hasDebugOverride()) {
      console.warn("[DualEarPro] Debug override aktif");
      return { ok: true, reason: "ready", headsetLikely: true, source: "debug-override" };
    }

    const premiumSignal = getPremiumModuleSignal();
    if (premiumSignal.ok) {
      return { ok: true, reason: "ready", headsetLikely: true, source: premiumSignal.source };
    }

    const bodySignal = getBodyClassSignal();
    const urlSignal = getUrlHelperSignal();
    if (bodySignal.ok && urlSignal.ok) {
      return { ok: true, reason: "ready", headsetLikely: true, source: bodySignal.source };
    }

    const deviceSignal = await hasHeadsetDeviceLabel();
    if (deviceSignal.ok) {
      return { ok: true, reason: "ready", headsetLikely: true, source: deviceSignal.source };
    }

    return { ok: false, reason: "headset_not_detected", headsetLikely: false, source: "none" };
  } catch (error) {
    console.warn("[DualEarPro] status error", error);
    return { ok: false, reason: "unknown_error", headsetLikely: false, source: "none" };
  }
}

export async function canEnableDualEarPro(options = {}) {
  return await getDualEarProStatus(options);
}

export function getDualEarProBlockedMessage(reason = "unknown_error") {
  const messages = {
    not_secure_context: "Eller Serbest için güvenli bağlantı gerekli.",
    speech_unsupported: "Bu tarayıcı Eller Serbest konuşma tanımayı desteklemiyor.",
    media_devices_missing: "Mikrofon erişimi bu cihazda kullanılamıyor.",
    mic_permission_denied: "Mikrofon izni verilmeden Eller Serbest açılamaz.",
    offline_mode: "Eller Serbest şu anda online modda kullanılabilir.",
    busy: "Devam eden dinleme bitince tekrar deneyin.",
    headset_not_detected: "Eller Serbest için kulaklık bağlantısı önerilir.",
    unknown_error: "Eller Serbest şu anda başlatılamadı.",
    ready: "Eller Serbest hazır."
  };

  return messages[reason] || messages.unknown_error;
}

export function showDualEarProBlockedReason(reason = "unknown_error", toastFn = null) {
  const message = getDualEarProBlockedMessage(reason);
  if (typeof toastFn === "function") {
    toastFn(message);
    return message;
  }

  console.warn("[DualEarPro]", message);
  return message;
}
