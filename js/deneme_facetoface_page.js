import "/js/facetoface_page.js";
import {
  canEnableDualEarPro,
  getDualEarProStatus,
  getDualEarProBlockedMessage,
  showDualEarProBlockedReason,
} from "/js/dual_ear_pro.js";

const F2F_MODE_KEY = "facetoface_runtime_mode";
const HANDS_FREE_KEYS = ["deneme_hands_free_mode", "italky_hands_free_mode", "facetoface_hands_free_mode"];

function $(id) {
  return document.getElementById(id);
}

function showToast(message = "") {
  const el = $("miniToast");
  if (!el) {
    console.warn(message);
    return;
  }
  el.textContent = String(message || "");
  el.classList.add("show");
  clearTimeout(window.__denemeDualEarToastTimer);
  window.__denemeDualEarToastTimer = setTimeout(() => el.classList.remove("show"), 1900);
}

function currentRuntimeMode() {
  try {
    if (document.body?.classList?.contains("offline-mode")) return "offline";
    return localStorage.getItem(F2F_MODE_KEY) || "online";
  } catch {
    return "online";
  }
}

function activeSide() {
  if ($("topMic")?.classList.contains("listening")) return "listening";
  if ($("botMic")?.classList.contains("listening")) return "listening";
  if ($("topMic")?.classList.contains("recorded")) return "translating";
  if ($("botMic")?.classList.contains("recorded")) return "translating";
  return "";
}

function recordingSide() {
  if ($("topMic")?.classList.contains("listening")) return "top";
  if ($("botMic")?.classList.contains("listening")) return "bot";
  return "";
}

function setHandsFreeUiOff() {
  const btn = $("handsFreeToggle");
  btn?.classList.remove("active", "on", "listening");
  document.body?.classList?.remove("handsfree-mode");
  try {
    HANDS_FREE_KEYS.forEach((key) => localStorage.setItem(key, "off"));
  } catch {}
}

function stopHandsFreeLoop(reason = "guard-stop") {
  const btn = $("handsFreeToggle");
  if (btn?.classList.contains("active")) {
    try {
      btn.click();
    } catch {}
  }
  setHandsFreeUiOff();
  try {
    window.dispatchEvent(new CustomEvent("denemeDualEarProStop", { detail: { reason } }));
  } catch {}
}

function speechErrorCode(error) {
  return String(error?.error || error?.code || error || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isSoftSpeechError(error) {
  const code = speechErrorCode(error);
  return ["", "aborted", "manual_stop_empty", "no_speech", "no_match", "speech_timeout", "timeout", "empty", "empty_result"].includes(code);
}

function closeOnCriticalSpeechError(error) {
  if (isSoftSpeechError(error)) return false;
  stopHandsFreeLoop("speech-error");
  return true;
}

function installSpeechErrorGuard() {
  if (window.__denemeSpeechErrorGuardInstalled) return;
  window.__denemeSpeechErrorGuardInstalled = true;

  try {
    let nativeHandler = typeof window.onNativeSpeechError === "function" ? window.onNativeSpeechError : null;
    Object.defineProperty(window, "onNativeSpeechError", {
      configurable: true,
      get() {
        return function denemeNativeSpeechErrorGuard(...args) {
          const critical = closeOnCriticalSpeechError(args[0]);
          const result = nativeHandler?.apply(this, args);
          if (critical) setTimeout(() => stopHandsFreeLoop("speech-error"), 0);
          return result;
        };
      },
      set(handler) {
        nativeHandler = typeof handler === "function" ? handler : null;
      },
    });
  } catch {}

  window.addEventListener("denemeSpeechRecognitionError", (event) => closeOnCriticalSpeechError(event.detail || event));
  window.addEventListener("italkySpeechRecognitionError", (event) => closeOnCriticalSpeechError(event.detail || event));
}

function guardOptions() {
  return {
    currentRuntimeMode: currentRuntimeMode(),
    recordingSide: recordingSide(),
    activeSide: activeSide(),
    recognizer: null,
    bootReady: document.body?.classList?.contains("ready") !== false,
    handsFreeRunning: $("handsFreeToggle")?.classList.contains("active") === true,
  };
}

async function guardHandsFreeClick(event) {
  const btn = event.target?.closest?.("#handsFreeToggle");
  if (!btn) return;

  if (btn.dataset.dualEarGuardPass === "1") {
    delete btn.dataset.dualEarGuardPass;
    return;
  }

  if (btn.classList.contains("active") || btn.classList.contains("on")) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  let status = null;
  try {
    status = await canEnableDualEarPro(guardOptions());
  } catch {
    status = { ok: false, reason: "unknown_error" };
  }

  if (!status?.ok) {
    setHandsFreeUiOff();
    stopHandsFreeLoop("guard-blocked");
    showDualEarProBlockedReason(status?.reason || "unknown_error", showToast);
    return;
  }

  try {
    HANDS_FREE_KEYS.forEach((key) => localStorage.setItem(key, "on"));
  } catch {}
  btn.dataset.dualEarGuardPass = "1";
  btn.click();
}

function installGuard() {
  if (window.__denemeDualEarProGuardInstalled) return;
  window.__denemeDualEarProGuardInstalled = true;
  window.denemeDualEarPro = {
    canEnableDualEarPro,
    getDualEarProStatus,
    getDualEarProBlockedMessage,
    showDualEarProBlockedReason,
  };
  installSpeechErrorGuard();

  document.addEventListener("click", guardHandsFreeClick, true);

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("#clearBtn,#topMic,#botMic,#topModeToggle,#botModeToggle")) {
      stopHandsFreeLoop("manual-control");
    }
  }, true);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") stopHandsFreeLoop("hidden");
  });
  window.addEventListener("beforeunload", () => stopHandsFreeLoop("beforeunload"));
  window.addEventListener("pagehide", () => stopHandsFreeLoop("pagehide"));
  window.addEventListener("offline", () => stopHandsFreeLoop("offline"));
  window.addEventListener("denemeTranslationError", () => stopHandsFreeLoop("translation-error"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installGuard, { once: true });
} else {
  installGuard();
}
