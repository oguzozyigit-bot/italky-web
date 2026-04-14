import { LANG_POOL } from "/js/lang_pool_full.js";
import { mountShell } from "/js/ui_shell.js";
import {
  getOfflineStatus,
  setMockOfflineLicense
} from "/js/offline_translate_bridge.js";

alert("LANG_POOL + UI_SHELL + OFFLINE_BRIDGE OK");

try {
  mountShell({ scroll: "none" });
} catch (e) {
  alert("UI_SHELL HATA: " + (e?.message || e));
}

const btnTranslate = document.getElementById("btnTranslate");
const btnOfflineModel = document.getElementById("btnOfflineModel");
const srcTxt = document.getElementById("srcTxt");
const dstTxt = document.getElementById("dstTxt");
const toastEl = document.getElementById("toast");

function toast(msg) {
  if (!toastEl) {
    alert(msg);
    return;
  }
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__qttToastTest);
  window.__qttToastTest = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2000);
}

try {
  if (window.OfflineTranslate) {
    setMockOfflineLicense(30);
    const status = getOfflineStatus();
    console.log("offline status test:", status);
  } else {
    console.log("window.OfflineTranslate yok");
  }
} catch (e) {
  alert("OFFLINE BRIDGE HATA: " + (e?.message || e));
}

if (btnTranslate) {
  btnTranslate.addEventListener("click", () => {
    const text = String(srcTxt?.value || "").trim();
    if (!text) {
      toast("Önce çevrilecek bir metin yaz.");
      return;
    }
    if (dstTxt) dstTxt.textContent = "OFFLINE BRIDGE TEST: " + text;
  });
}

if (btnOfflineModel) {
  btnOfflineModel.addEventListener("click", () => {
    toast("Offline butonu tıklandı");
  });
}
