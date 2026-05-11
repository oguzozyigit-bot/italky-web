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

    body#frameRoot.premium-bt-mode,
    body#frameRoot.premium-bt-mode *{
      writing-mode:horizontal-tb!important;
      text-orientation:mixed!important;
    }

    body#frameRoot.premium-bt-mode .container{
      background:radial-gradient(circle at 50% 6%,rgba(37,99,235,.16),transparent 34%),linear-gradient(180deg,#020617,#050508 52%,#07111f);
    }

    body#frameRoot.premium-bt-mode .half-screen.top{
      transform:none!important;
      rotate:0deg!important;
      flex:.82 1 0!important;
      justify-content:flex-start!important;
      padding:12px 10px 6px!important;
      background:linear-gradient(180deg,rgba(15,23,42,.72),rgba(2,6,23,.22))!important;
      border-bottom:1px solid rgba(147,197,253,.08)!important;
    }

    body#frameRoot.premium-bt-mode .half-screen.bottom{
      transform:none!important;
      rotate:0deg!important;
      flex:1.18 1 0!important;
      padding:8px 8px calc(18px + var(--safe-bottom))!important;
      background:linear-gradient(180deg,rgba(14,165,233,.08),rgba(2,6,23,.28))!important;
    }

    body#frameRoot.premium-bt-mode #topSection .composer-stack,
    body#frameRoot.premium-bt-mode #topSection .lang-row,
    body#frameRoot.premium-bt-mode #topLangBtn,
    body#frameRoot.premium-bt-mode #botLangBtn,
    body#frameRoot.premium-bt-mode #topModeToggle,
    body#frameRoot.premium-bt-mode #botModeToggle,
    body#frameRoot.premium-bt-mode #pop-top,
    body#frameRoot.premium-bt-mode #pop-bot,
    body#frameRoot.premium-bt-mode .mode-toggle-inline,
    body#frameRoot.premium-bt-mode .kb-wrap,
    body#frameRoot.premium-bt-mode .composer-center,
    body#frameRoot.premium-bt-mode .send-btn{
      display:none!important;
      pointer-events:none!important;
    }

    body#frameRoot.premium-bt-mode #botSection .lang-row{
      display:flex!important;
      min-height:0!important;
      height:0!important;
      padding:0!important;
      overflow:hidden!important;
      pointer-events:none!important;
    }

    body#frameRoot.premium-bt-mode .chat-body{
      transform:none!important;
      rotate:0deg!important;
      mask-image:none!important;
      padding:14px 0!important;
    }

    body#frameRoot.premium-bt-mode .bubble,
    body#frameRoot.premium-bt-mode .bubble-row,
    body#frameRoot.premium-bt-mode .txt{
      transform:none!important;
      rotate:0deg!important;
      writing-mode:horizontal-tb!important;
      text-orientation:mixed!important;
    }

    body#frameRoot.premium-bt-mode #topBody{
      justify-content:center!important;
      min-height:0!important;
      padding-top:8px!important;
    }

    body#frameRoot.premium-bt-mode #botBody{
      justify-content:flex-start!important;
    }

    body#frameRoot.premium-bt-mode .half-screen.bottom .composer-stack{
      transform:translateY(-10px)!important;
    }

    body#frameRoot.premium-bt-mode .premium-bt-hint{
      width:min(78vw,430px);
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

    body#frameRoot.premium-bt-mode.bt-active .premium-bt-hint{
      display:none!important;
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
      body#frameRoot.premium-bt-mode .half-screen.bottom .composer-stack{transform:translateY(-12px)!important;}
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
  if (!topSection) return;

  const hint = document.createElement("div");
  hint.id = "premiumBtHint";
  hint.className = "premium-bt-hint";
  hint.textContent = "İki telefonu eşleştirmek için Bluetooth tuşuna basın. Bağlantı kurulduktan sonra konuşmalar karşı telefonda çevrilir.";
  topSection.insertBefore(hint, topSection.firstChild);
}

function removeFaceToFaceMicHandlers() {
  const botMic = document.getElementById("botMic");
  if (botMic && !botMic.__italkyBtCleanMic) {
    const cleanBotMic = botMic.cloneNode(true);
    cleanBotMic.__italkyBtCleanMic = true;
    botMic.replaceWith(cleanBotMic);
  }

  const topMic = document.getElementById("topMic");
  if (topMic && !topMic.__italkyBtCleanMic) {
    const cleanTopMic = topMic.cloneNode(true);
    cleanTopMic.__italkyBtCleanMic = true;
    topMic.replaceWith(cleanTopMic);
  }
}

function bindPremiumBtStateHooks() {
  if (window.__italkyPremiumBtStateHooksBound) return;
  window.__italkyPremiumBtStateHooksBound = true;

  const originalConnected = window.onBtConnected;
  const originalDisconnected = window.onBtDisconnected;

  window.onBtConnected = function (...args) {
    document.getElementById("premiumBtHint")?.classList.add("hidden");
    document.body.classList.add("bt-active");
    try { originalConnected?.(...args); } catch (e) { console.warn("[BT_PREMIUM] onBtConnected failed", e); }
  };

  window.onBtDisconnected = function (...args) {
    document.getElementById("premiumBtHint")?.classList.remove("hidden");
    document.body.classList.remove("bt-active");
    try { originalDisconnected?.(...args); } catch (e) { console.warn("[BT_PREMIUM] onBtDisconnected failed", e); }
  };
}

function boot() {
  injectPremiumUiCss();
  if (!isBluetoothMode) return;

  document.body.classList.add("premium-bt-mode", "bt-premium-mode");
  closeLanguagePopups();
  injectBluetoothHint();
  removeFaceToFaceMicHandlers();
  installFaceToFaceBluetoothGuestFlow({ homeHref: "/pages/home.html" });
  bindPremiumBtStateHooks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
