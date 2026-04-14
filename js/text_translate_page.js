import { LANG_POOL } from "/js/lang_pool_full.js";
import { mountShell, setHeaderTokens } from "/js/ui_shell.js";
import {
  getOfflineStatus,
  setMockOfflineLicense
} from "/js/offline_translate_bridge.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import {
  commitUsage,
  resolveUsageModule,
  resolveUsageMode,
  buildUsageNote
} from "/js/usage_meter.js";

alert("ALL IMPORTS OK");

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
  console.log("LANG_POOL:", Array.isArray(LANG_POOL) ? LANG_POOL.length : "not-array");
  console.log("supabase:", !!supabase);
  console.log("ensureAuthAndCacheUser:", typeof ensureAuthAndCacheUser);
  console.log("commitUsage:", typeof commitUsage);
  console.log("resolveUsageModule:", typeof resolveUsageModule);
  console.log("resolveUsageMode:", typeof resolveUsageMode);
  console.log("buildUsageNote:", typeof buildUsageNote);
  console.log("setHeaderTokens:", typeof setHeaderTokens);

  if (window.OfflineTranslate) {
    setMockOfflineLicense(30);
    console.log("offline status:", getOfflineStatus());
  }
} catch (e) {
  alert("USAGE TEST HATA: " + (e?.message || e));
}

if (btnTranslate) {
  btnTranslate.addEventListener("click", () => {
    const text = String(srcTxt?.value || "").trim();
    if (!text) {
      toast("Önce çevrilecek bir metin yaz.");
      return;
    }
    if (dstTxt) dstTxt.textContent = "ALL IMPORTS TEST: " + text;
  });
}

if (btnOfflineModel) {
  btnOfflineModel.addEventListener("click", () => {
    toast("Offline butonu tıklandı");
  });
}
