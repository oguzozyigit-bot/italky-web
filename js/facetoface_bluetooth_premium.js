// FILE: /js/facetoface_bluetooth_premium.js
import { installFaceToFaceBluetoothGuestFlow } from "/js/facetoface_bluetooth_guest_flow.js";

const isBluetoothMode = new URLSearchParams(location.search).get("mode") === "bluetooth";

function injectPremiumUiCss() {
  if (document.getElementById("italkyPremiumF2fBtPolishStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyPremiumF2fBtPolishStyle";
  style.textContent = `
    body#frameRoot .italky-global-footer,
    body#frameRoot [data-italky-footer]{display:none!important;}
    body#frameRoot.premium-bt-mode .half-screen.bottom{padding-bottom:calc(18px + var(--safe-bottom))!important;}
    body#frameRoot.premium-bt-mode .half-screen.bottom .composer-stack{transform:translateY(-10px);}
    body#frameRoot.premium-bt-mode #topSection .composer-stack{display:none!important;}
    body#frameRoot.premium-bt-mode #topLangBtn{pointer-events:none!important;opacity:.78;}
    body#frameRoot.premium-bt-mode #pop-top{display:none!important;}
    body#frameRoot.premium-bt-mode .premium-bt-hint{
      width:min(78vw,420px);
      margin:18px auto 0;
      padding:13px 15px;
      border-radius:18px;
      color:rgba(255,255,255,.88);
      font-size:12px;
      font-weight:900;
      line-height:1.35;
      text-align:center;
      border:1px solid rgba(147,197,253,.28);
      background:linear-gradient(145deg,rgba(15,23,42,.82),rgba(30,64,175,.34));
      box-shadow:0 14px 38px rgba(15,23,42,.35), inset 0 1px 0 rgba(255,255,255,.08);
      backdrop-filter:blur(14px);
      -webkit-backdrop-filter:blur(14px);
      pointer-events:none;
      position:relative;
      z-index:22;
    }
    body#frameRoot.premium-bt-mode #btToggleBtn{
      position:fixed!important;
      left:38px!important;
      top:50%!important;
      transform:translateY(-50%)!important;
      z-index:1810!important;
      display:flex!important;
      width:48px;
      height:48px;
    }
    body#frameRoot.premium-bt-mode #btToggleBtn:active{transform:translateY(-50%) scale(.94)!important;}
    body#frameRoot.premium-bt-mode #btToggleBtn.connected{
      color:#93c5fd!important;
      border-color:rgba(147,197,253,.52)!important;
      background:rgba(37,99,235,.18)!important;
      box-shadow:0 0 18px rgba(37,99,235,.28)!important;
    }
    body#frameRoot.premium-bt-mode #handsFreeToggle{
      position:fixed!important;
      right:42px!important;
      top:calc(50% - 92px)!important;
      bottom:auto!important;
      transform:none!important;
      z-index:1810!important;
      max-width:118px;
      white-space:nowrap;
    }
    body#frameRoot.premium-bt-mode #handsFreeToggle:active{transform:scale(.96)!important;}
    @media(max-width:390px){
      body#frameRoot.premium-bt-mode #btToggleBtn{left:36px!important;width:44px;height:44px;}
      body#frameRoot.premium-bt-mode #handsFreeToggle{right:34px!important;top:calc(50% - 94px)!important;padding:7px 9px;font-size:10px;}
      body#frameRoot.premium-bt-mode .half-screen.bottom .composer-stack{transform:translateY(-12px);}
      body#frameRoot.premium-bt-mode .premium-bt-hint{width:min(76vw,340px);margin-top:12px;padding:11px 12px;font-size:11px;}
    }
  `;
  document.head.appendChild(style);
}

function closeLanguagePopups() {
  document.getElementById("pop-top")?.classList.remove("show");
  document.getElementById("pop-bot")?.classList.remove("show");
}

function injectBluetoothHint() {
  if (document.getElementById("premiumBtHint")) return;
  const topSection = document.getElementById("topSection");
  const langRow = topSection?.querySelector(".lang-row");
  if (!topSection || !langRow) return;

  const hint = document.createElement("div");
  hint.id = "premiumBtHint";
  hint.className = "premium-bt-hint";
  hint.textContent = "İki telefonu eşleştirmek için Bluetooth tuşuna basın. Bağlantı kurulduktan sonra konuşmalar karşı telefonda çevrilir.";
  langRow.insertAdjacentElement("afterend", hint);
}

function boot() {
  injectPremiumUiCss();
  if (!isBluetoothMode) return;

  document.body.classList.add("premium-bt-mode");
  closeLanguagePopups();
  injectBluetoothHint();
  installFaceToFaceBluetoothGuestFlow({ homeHref: "/pages/home.html" });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
