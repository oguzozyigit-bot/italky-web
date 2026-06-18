const HEADSET_WORDS = [
  "bluetooth",
  "headset",
  "headphones",
  "headphone",
  "airpods",
  "buds",
  "earbud",
  "kulaklık",
  "hands-free",
  "handsfree",
];

function clean(value) {
  return String(value || "").trim();
}

function isLocalhost() {
  const host = clean(window.location?.hostname).toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function speechSupported() {
  return typeof window.SpeechRecognition === "function" || typeof window.webkitSpeechRecognition === "function";
}

function mediaDevicesReady() {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function");
}

function readBoolSignal(obj) {
  if (!obj) return false;
  try {
    if (typeof obj.isConnected === "function" && obj.isConnected()) return true;
    if (typeof obj.isReady === "function" && obj.isReady()) return true;
    if (obj.connected === true || obj.ready === true || obj.active === true) return true;
    if (obj.mode === "bluetooth" || obj.mode === "two-phone") return true;
  } catch {}
  return false;
}

function premiumModuleSignal() {
  const names = [
    "italkyFaceBluetoothPremium",
    "italkyF2FBluetooth",
    "facetofaceBluetoothPremium",
    "FaceToFaceBluetoothPremium",
    "italkyBt",
    "btPremium",
  ];
  for (const name of names) {
    if (readBoolSignal(window?.[name])) return true;
  }
  return false;
}

function bodyClassSignal() {
  try {
    return (
      document.body?.classList?.contains("premium-bt-mode") ||
      document.body?.classList?.contains("bt-active") ||
      document.documentElement?.classList?.contains("two-phone-ready")
    );
  } catch {
    return false;
  }
}

function urlModeSignal() {
  try {
    const mode = new URLSearchParams(window.location.search || "").get("mode");
    return mode === "bluetooth" || mode === "two-phone";
  } catch {
    return false;
  }
}

function debugOverrideSignal() {
  try {
    const storage = window.localStorage || globalThis.localStorage;
    if (storage?.getItem("deneme_dual_ear_pro_debug_ready") === "1") {
      console.warn("[DualEarPro] Debug override aktif");
      return true;
    }
  } catch {}
  return false;
}

async function deviceLabelSignal() {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== "function") return false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => {
      const kind = clean(device.kind).toLowerCase();
      if (kind !== "audioinput" && kind !== "audiooutput") return false;
      const label = clean(device.label).toLowerCase();
      return !!label && HEADSET_WORDS.some((word) => label.includes(word));
    });
  } catch {
    return false;
  }
}

async function probeMicrophone(options) {
  if (options?.probeMic === false || options?.skipMicProbe === true) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    try {
      stream.getTracks().forEach((track) => track.stop());
    } catch {}
    return true;
  } catch (error) {
    const name = clean(error?.name).toLowerCase();
    if (name.includes("notallowed") || name.includes("permission") || name.includes("denied")) {
      return "mic_permission_denied";
    }
    return "unknown_error";
  }
}

function busyReason(options) {
  if (options?.handsFreeRunning || options?.handsFreeActive) return "busy";
  if (options?.recognizer) return "busy";
  if (clean(options?.recordingSide)) return "busy";
  const active = clean(options?.activeSide).toLowerCase();
  if (active === "listening" || active === "translating") return "busy";
  return "";
}

function baseBlockedStatus(reason) {
  return { ok: false, reason, headsetLikely: false, source: "none" };
}

export async function getDualEarProStatus(options = {}) {
  try {
    if (!(window.isSecureContext || isLocalhost())) return baseBlockedStatus("not_secure_context");
    if (!speechSupported()) return baseBlockedStatus("speech_unsupported");
    if (!mediaDevicesReady()) return baseBlockedStatus("media_devices_missing");
    if (clean(options.currentRuntimeMode).toLowerCase() === "offline") return baseBlockedStatus("offline_mode");

    const busy = busyReason(options);
    if (busy) return baseBlockedStatus(busy);

    const micProbe = await probeMicrophone(options);
    if (micProbe !== true) return baseBlockedStatus(micProbe || "mic_permission_denied");

    if (debugOverrideSignal()) {
      return { ok: true, reason: "ready", headsetLikely: true, source: "debug-override" };
    }
    if (premiumModuleSignal()) {
      return { ok: true, reason: "ready", headsetLikely: true, source: "premium-module" };
    }
    const bodySignal = bodyClassSignal();
    if (bodySignal && urlModeSignal()) {
      return { ok: true, reason: "ready", headsetLikely: true, source: "body-class" };
    }
    if (bodySignal) {
      return { ok: true, reason: "ready", headsetLikely: true, source: "body-class" };
    }
    if (await deviceLabelSignal()) {
      return { ok: true, reason: "ready", headsetLikely: true, source: "device-label" };
    }
    return baseBlockedStatus("headset_not_detected");
  } catch (error) {
    console.warn("[DualEarPro] status check failed", error);
    return baseBlockedStatus("unknown_error");
  }
}

export async function canEnableDualEarPro(options = {}) {
  return getDualEarProStatus(options);
}

export function getDualEarProBlockedMessage(reason) {
  const messages = {
    not_secure_context: "Eller Serbest için güvenli bağlantı gerekli.",
    speech_unsupported: "Bu tarayıcı Eller Serbest konuşma tanımayı desteklemiyor.",
    media_devices_missing: "Mikrofon erişimi bu cihazda kullanılamıyor.",
    mic_permission_denied: "Mikrofon izni verilmeden Eller Serbest açılamaz.",
    offline_mode: "Eller Serbest şu anda online modda kullanılabilir.",
    busy: "Devam eden dinleme bitince tekrar deneyin.",
    headset_not_detected: "Eller Serbest için kulaklık bağlantısı önerilir.",
    unknown_error: "Eller Serbest şu anda başlatılamadı.",
  };
  return messages[reason] || messages.unknown_error;
}

export function showDualEarProBlockedReason(reason, toastFn) {
  const message = getDualEarProBlockedMessage(reason);
  if (typeof toastFn === "function") {
    toastFn(message);
    return;
  }
  console.warn(message);
}
