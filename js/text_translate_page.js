import { LANG_POOL } from "/js/lang_pool_full.js";
import { mountShell } from "/js/ui_shell.js";

alert("LANG_POOL + UI_SHELL OK");

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

console.log("LANG_POOL length:", Array.isArray(LANG_POOL) ? LANG_POOL.length : "not-array");

if (btnTranslate) {
  btnTranslate.addEventListener("click", () => {
    const text = String(srcTxt?.value || "").trim();
    if (!text) {
      toast("Önce çevrilecek bir metin yaz.");
      return;
    }
    if (dstTxt) dstTxt.textContent = "UI_SHELL TEST: " + text;
  });
}

if (btnOfflineModel) {
  btnOfflineModel.addEventListener("click", () => {
    toast("Offline butonu tıklandı");
  });
}
