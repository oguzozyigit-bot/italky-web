// FILE: /js/ui_hotfixes.js

const FOOTER_TEXT = "italkyAI By Özyiğit's 2026";

function normalizeFooters() {
  try {
    document.querySelectorAll(".menu-sign").forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });

    const shellFooter = document.querySelector("#italkyFooter .signature, .premium-footer .signature");
    const globalFooters = Array.from(document.querySelectorAll(".italky-global-footer"));

    if (shellFooter) {
      shellFooter.textContent = FOOTER_TEXT;
      shellFooter.setAttribute("data-no-translate", "1");
      globalFooters.forEach((el) => el.remove());
      return;
    }

    const stamped = Array.from(document.querySelectorAll("[data-italky-footer], .signature, .prestige-signature, .drawer-footer-seal"))
      .filter((el) => el && el.offsetParent !== null && String(el.textContent || "").trim());

    stamped.forEach((el, index) => {
      el.textContent = FOOTER_TEXT;
      if (index > 0 && el.classList.contains("italky-global-footer")) el.remove();
    });
  } catch {}
}

function patchHomeConferenceLink() {
  try {
    const card = document.getElementById("guideConferenceCard");
    if (!card) return;
    card.setAttribute("href", "/pages/conference.html");
  } catch {}
}

function patchTwoPhoneCopy() {
  try {
    const card = document.getElementById("bluetoothCard");
    if (card) {
      const isIosHome =
        location.pathname.endsWith("/home_ios.html") ||
        new URLSearchParams(location.search || "").get("ios") === "1";
      card.setAttribute(
        "href",
        isIosHome
          ? "/pages/facetoface_ios.html?ios=1&mode=two-phone&v=IOS_TWO_PHONE_PAGES_ROUTE_20260611"
          : "/facetoface.html?mode=two-phone"
      );
      const kicker = card.querySelector(".card-kicker");
      const title = card.querySelector(".card-title");
      const desc = card.querySelector(".card-desc");
      if (kicker) kicker.textContent = "LİSANS";
      if (title) title.textContent = "İki Telefon";
      if (desc) desc.textContent = "Kodu al, diğer telefonda gir. İki cihaz arasında canlı çeviri yap.";
      card.setAttribute("aria-label", "İki Telefon - Kod ile bağlan");
    }

    document.querySelectorAll("body *").forEach((el) => {
      if (!el || el.children?.length) return;
      const text = String(el.textContent || "");
      if (!text) return;
      const next = text
        .replace(/Bluetooth eşleşmesini kontrol edip tekrar deneyin\.?/gi, "Kodu ve internet bağlantınızı kontrol edip tekrar deneyin.")
        .replace(/Önce Bluetooth ile diğer telefonu bağlayın\.?/gi, "Önce kod ile diğer telefonu bağlayın.")
        .replace(/Bluetooth bağlan/gi, "Kod ile bağlan")
        .replace(/Bluetooth/gi, "Kod");
      if (next !== text) el.textContent = next;
    });
  } catch {}
}

function injectConferenceEntryStyle() {
  try {
    if (document.getElementById("italkyConferenceEntryPolish")) return;
    const style = document.createElement("style");
    style.id = "italkyConferenceEntryPolish";
    style.textContent = `
      .role-grid{grid-template-columns:1fr!important;gap:14px!important;}
      .role-btn{min-height:128px!important;border-radius:26px!important;padding:18px 18px 18px 86px!important;position:relative!important;overflow:hidden!important;justify-content:center!important;gap:8px!important;box-shadow:0 18px 42px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.10)!important;}
      .role-btn::before{content:"";position:absolute;left:18px;top:50%;width:50px;height:50px;transform:translateY(-50%);border-radius:18px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 0 18px rgba(255,255,255,.05);}
      .role-btn::after{position:absolute;left:31px;top:50%;transform:translateY(-50%);font-size:24px;line-height:1;}
      .speaker-btn::after{content:"🎙️";}.listener-btn::after{content:"🎧";}
      .role-btn strong{font-size:24px!important;line-height:1.05!important;}.role-btn span{max-width:95%;font-size:13.5px!important;color:rgba(255,255,255,.82)!important;}
      .speaker-btn{background:radial-gradient(circle at 12% 18%, rgba(125,211,252,.24), transparent 30%),radial-gradient(circle at 88% 72%, rgba(59,130,246,.22), transparent 34%),linear-gradient(135deg,#0b4f6c 0%,#0f6f8f 48%,#1e3a8a 100%)!important;}
      .listener-btn{background:radial-gradient(circle at 12% 18%, rgba(45,212,191,.24), transparent 30%),radial-gradient(circle at 88% 72%, rgba(96,165,250,.24), transparent 34%),linear-gradient(135deg,#064e3b 0%,#0f766e 48%,#1d4ed8 100%)!important;}
      .hero{min-height:170px!important;}.hero-title{font-size:25px!important;}.hero-text{font-size:14.5px!important;}
      #listenerLiveLangWrap{margin-top:10px;display:grid;gap:7px;text-align:left;}#listenerLiveLangWrap label{font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.5px;color:rgba(191,219,254,.70);}#listenerLiveLang{width:100%;min-height:46px;border-radius:16px;border:1px solid rgba(147,197,253,.20);background:rgba(2,6,23,.60);color:#fff;padding:0 12px;font-size:14px;font-weight:900;}
    `;
    document.head.appendChild(style);
  } catch {}
}

function bootHotfixes() {
  normalizeFooters();
  patchHomeConferenceLink();
  patchTwoPhoneCopy();
  injectConferenceEntryStyle();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootHotfixes, { once: true });
} else {
  bootHotfixes();
}

window.addEventListener("load", bootHotfixes, { once: true });
window.addEventListener("italkyAccessReady", bootHotfixes);
setTimeout(bootHotfixes, 150);
setTimeout(bootHotfixes, 400);
setTimeout(bootHotfixes, 1400);
setTimeout(bootHotfixes, 2600);
