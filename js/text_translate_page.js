import { LANG_POOL } from "/js/lang_pool_full.js";
import { mountShell } from "/js/ui_shell.js";
import {
  getOfflineStatus,
  setMockOfflineLicense
} from "/js/offline_translate_bridge.js";
import { supabase } from "/js/supabase_client.js";

alert("LANG_POOL + UI_SHELL + OFFLINE_BRIDGE + SUPABASE OK");

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
  console.log("supabase object:", !!supabase);
  if (window.OfflineTranslate) {
    setMockOfflineLicense(30);
    console.log("offline status test:", getOfflineStatus());
  }
} catch (e) {
  alert("SUPABASE/BRIDGE HATA: " + (e?.message || e));
}

if (btnTranslate) {
  btnTranslate.addEventListener("click", () => {
    const text = String(srcTxt?.value || "").trim();
    if (!text) {
      toast("Önce çevrilecek bir metin yaz.");
      return;
    }
    if (dstTxt) dstTxt.textContent = "SUPABASE TEST: " + text;
  });
}

if (btnOfflineModel) {
  btnOfflineModel.addEventListener("click", () => {
    toast("Offline butonu tıklandı");
  });
}
