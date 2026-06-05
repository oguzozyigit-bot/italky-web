// FILE: /js/facetoface_bluetooth_premium.js
import { installTwoPhoneBluetoothMode } from "/js/facetoface_bluetooth_two_phone_guard.js";

const mode = new URLSearchParams(location.search).get("mode");
const isTwoPhoneMode = mode === "two-phone" || mode === "bluetooth";
const isGuideMode = mode === "guide" || mode === "conference" || mode === "tour";

if (isGuideMode) {
  location.replace("/pages/conference.html");
}

function injectPremiumUiCss() {
  if (document.getElementById("italkyPremiumTwoPhoneStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyPremiumTwoPhoneStyle";
  style.textContent = `
    body#frameRoot .italky-global-footer,
    body#frameRoot [data-italky-footer]{display:none!important;}

    body#frameRoot.bt-premium-mode .container{
      background:radial-gradient(circle at 50% 4%,rgba(59,130,246,.18),transparent 34%),linear-gradient(180deg,#020617,#050508 52%,#07111f)!important;
    }

    body#frameRoot.bt-premium-mode .half-screen.top,
    body#frameRoot.bt-premium-mode .half-screen.bottom,
    body#frameRoot.bt-premium-mode .chat-body,
    body#frameRoot.bt-premium-mode .bubble,
    body#frameRoot.bt-premium-mode .bubble-row,
    body#frameRoot.bt-premium-mode .txt{
      transform:none!important;
      rotate:0deg!important;
      writing-mode:horizontal-tb!important;
      text-orientation:mixed!important;
    }

    body#frameRoot.bt-premium-mode .half-screen.top,
    body#frameRoot.bt-premium-mode .half-screen.bottom{flex:1 1 0!important;min-height:0!important;}
    body#frameRoot.bt-premium-mode .half-screen.top{justify-content:flex-start!important;padding:10px 10px 6px!important;background:linear-gradient(180deg,rgba(15,23,42,.74),rgba(2,6,23,.22))!important;border-bottom:1px solid rgba(147,197,253,.08)!important;}
    body#frameRoot.bt-premium-mode .half-screen.bottom{padding:8px 8px calc(26px + var(--safe-bottom))!important;background:linear-gradient(180deg,rgba(14,165,233,.08),rgba(2,6,23,.30))!important;}

    body#frameRoot.bt-premium-mode #topSection .composer-stack,
    body#frameRoot.bt-premium-mode #topSection .lang-row,
    body#frameRoot.bt-premium-mode #topMic,
    body#frameRoot.bt-premium-mode #topLangBtn,
    body#frameRoot.bt-premium-mode #botLangBtn,
    body#frameRoot.bt-premium-mode #topModeToggle,
    body#frameRoot.bt-premium-mode #botModeToggle,
    body#frameRoot.bt-premium-mode #pop-top,
    body#frameRoot.bt-premium-mode #pop-bot,
    body#frameRoot.bt-premium-mode .mode-toggle-inline,
    body#frameRoot.bt-premium-mode .kb-wrap,
    body#frameRoot.bt-premium-mode .composer-center,
    body#frameRoot.bt-premium-mode .send-btn,
    body#frameRoot.bt-premium-mode #botSection .lang-row{display:none!important;pointer-events:none!important;}

    body#frameRoot.bt-premium-mode .chat-body{mask-image:none!important;padding:12px 0!important;min-height:0!important;flex:1 1 auto!important;}
    body#frameRoot.bt-premium-mode #topBody,
    body#frameRoot.bt-premium-mode #botBody{min-height:0!important;}
    body#frameRoot.bt-premium-mode #botSection .composer-stack{position:relative!important;transform:translateY(-3px)!important;isolation:isolate!important;}
    body#frameRoot.bt-premium-mode #botComposer{position:relative!important;z-index:2!important;}

    body#frameRoot.bt-premium-mode .premium-bt-hint{
      width:min(78vw,430px);margin:12px auto 0;padding:12px 15px;border-radius:18px;color:rgba(255,255,255,.88);
      font-size:12px;font-weight:900;line-height:1.35;text-align:center;border:1px solid rgba(147,197,253,.28);
      background:linear-gradient(145deg,rgba(15,23,42,.84),rgba(30,64,175,.34));box-shadow:0 14px 38px rgba(15,23,42,.35),inset 0 1px 0 rgba(255,255,255,.08);
      backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);pointer-events:none;position:relative;z-index:22;
    }
    body#frameRoot.bt-premium-mode.bt-active .premium-bt-hint{display:none!important;}

    body#frameRoot.bt-premium-mode .nav-btn{writing-mode:vertical-rl!important;text-orientation:upright!important;letter-spacing:1px!important;line-height:1.1!important;width:30px!important;height:118px!important;top:50%!important;transform:translateY(-50%)!important;display:flex!important;align-items:center!important;justify-content:center!important;z-index:1800!important;}
    body#frameRoot.bt-premium-mode .nav-btn .label-rotate{writing-mode:vertical-rl!important;text-orientation:upright!important;transform:none!important;}
    body#frameRoot.bt-premium-mode #clearBtn{left:0!important;right:auto!important;border-radius:0 18px 18px 0!important;}
    body#frameRoot.bt-premium-mode #homeLink{right:0!important;left:auto!important;border-radius:18px 0 0 18px!important;}

    body#frameRoot.bt-premium-mode #btToggleBtn{position:fixed!important;left:38px!important;top:50%!important;transform:translateY(-50%)!important;z-index:1810!important;display:flex!important;width:48px!important;height:48px!important;}
    body#frameRoot.bt-premium-mode #btToggleBtn.connected{color:#bbf7d0!important;border-color:rgba(34,197,94,.68)!important;background:rgba(22,163,74,.22)!important;box-shadow:0 0 18px rgba(34,197,94,.36),inset 0 1px 0 rgba(255,255,255,.10)!important;}

    body#frameRoot.bt-premium-mode #centerHub #handsFreeToggle,
    body#frameRoot.bt-premium-mode .center-hub #handsFreeToggle{display:none!important;pointer-events:none!important;}
    body#frameRoot.bt-premium-mode #botSection .composer-stack > #handsFreeToggle{position:absolute!important;left:calc(50% + 50px)!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translateY(-50%)!important;z-index:70!important;width:auto!important;max-width:116px!important;min-height:40px!important;white-space:nowrap!important;padding:7px 10px!important;font-size:10px!important;line-height:1!important;gap:6px!important;flex-shrink:0!important;}
    body#frameRoot.bt-premium-mode #botSection .composer-stack > #handsFreeToggle span{display:inline!important;overflow:visible!important;text-overflow:clip!important;white-space:nowrap!important;}

    @media(max-width:390px){
      body#frameRoot.bt-premium-mode #botSection .composer-stack{transform:translateY(-3px)!important;}
      body#frameRoot.bt-premium-mode #btToggleBtn{left:36px!important;width:44px!important;height:44px!important;}
      body#frameRoot.bt-premium-mode #botSection .composer-stack > #handsFreeToggle{left:calc(50% + 42px)!important;width:auto!important;height:38px!important;min-height:38px!important;max-width:112px!important;padding:6px 8px!important;justify-content:center!important;gap:5px!important;font-size:9px!important;}
      body#frameRoot.bt-premium-mode #botSection .composer-stack > #handsFreeToggle span{display:inline!important;font-size:9px!important;line-height:1!important;max-width:76px!important;overflow:visible!important;text-overflow:clip!important;}
      body#frameRoot.bt-premium-mode #botSection .composer-stack > #handsFreeToggle svg{width:15px!important;height:15px!important;flex:0 0 auto!important;}
      body#frameRoot.bt-premium-mode .premium-bt-hint{width:min(76vw,340px);margin-top:10px;padding:10px 12px;font-size:11px;}
    }
  `;
  document.head.appendChild(style);
}

function closeLanguagePopups() {
  document.getElementById("pop-top")?.classList.remove("show");
  document.getElementById("pop-bot")?.classList.remove("show");
}

function injectConnectionHint() {
  if (document.getElementById("premiumBtHint")) return;
  const topSection = document.getElementById("topSection");
  if (!topSection) return;
  const hint = document.createElement("div");
  hint.id = "premiumBtHint";
  hint.className = "premium-bt-hint";
  hint.textContent = "Bir telefonda görüşme başlatın, diğer telefonda kodu girerek katılın. Bağlantı kurulunca konuşmaya başlayabilirsiniz.";
  topSection.insertBefore(hint, topSection.firstChild);
}

function replaceInteractiveNode(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const clean = el.cloneNode(true);
  clean.removeAttribute("onclick");
  clean.__italkyTwoPhoneClean = true;
  el.replaceWith(clean);
  return clean;
}

function detachFaceToFaceHandlers() {
  replaceInteractiveNode("botMic");
  replaceInteractiveNode("topMic");
  replaceInteractiveNode("clearBtn");
  replaceInteractiveNode("homeLink");
  replaceInteractiveNode("btToggleBtn");
  replaceInteractiveNode("handsFreeToggle");
}

function moveHandsFreeToBottomMic() {
  const handsFree = document.getElementById("handsFreeToggle");
  const target = document.querySelector("#botSection .composer-stack");
  if (!handsFree || !target || handsFree.parentElement === target) return;
  target.appendChild(handsFree);
}

function updateConnectButtonCopy() {
  const btn = document.getElementById("btToggleBtn");
  if (!btn) return;
  btn.setAttribute("aria-label", "Kod ile bağlan");
  btn.setAttribute("title", "Kod ile bağlan");
  btn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 4.93"></path>
      <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19.07"></path>
    </svg>`;
}

function boot() {
  injectPremiumUiCss();
  if (!isTwoPhoneMode) return;
  document.body.classList.add("bt-premium-mode", "premium-bt-mode");
  closeLanguagePopups();
  injectConnectionHint();
  detachFaceToFaceHandlers();
  moveHandsFreeToBottomMic();
  updateConnectButtonCopy();
  installTwoPhoneBluetoothMode({ homeHref: "/pages/home.html" });
  document.documentElement.classList.remove("two-phone-booting");
  document.documentElement.classList.add("two-phone-ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
