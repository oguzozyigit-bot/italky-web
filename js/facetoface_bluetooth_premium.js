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

    body#frameRoot.bt-premium-mode{
      --ai-gradient:linear-gradient(135deg,#8ffff8,#35d5d0 52%,#0ea5a4)!important;
      --bg:#06111d!important;
      --border:rgba(78,210,217,.28)!important;
      --safe-bottom:env(safe-area-inset-bottom,0px);
      background:#06111d!important;
    }

    body#frameRoot.bt-premium-mode .container{
      background:
        radial-gradient(circle at 50% 0%,rgba(53,213,208,.18),transparent 32%),
        radial-gradient(circle at 10% 38%,rgba(14,165,164,.12),transparent 28%),
        radial-gradient(circle at 90% 62%,rgba(132,255,247,.10),transparent 26%),
        linear-gradient(180deg,#06111d,#07131f 52%,#06111d)!important;
    }

    body#frameRoot.bt-premium-mode .container:before{
      content:"";
      position:fixed;
      inset:0;
      pointer-events:none;
      z-index:0;
      background:
        linear-gradient(90deg,transparent,rgba(53,213,208,.06),transparent),
        repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 64px);
      opacity:.28;
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
    body#frameRoot.bt-premium-mode .half-screen.bottom{
      flex:1 1 0!important;
      min-height:0!important;
      position:relative!important;
      isolation:isolate!important;
    }

    body#frameRoot.bt-premium-mode .half-screen.top{
      justify-content:flex-start!important;
      padding:10px 10px 6px!important;
      background:
        linear-gradient(180deg,rgba(6,17,29,.92),rgba(7,31,39,.52) 58%,rgba(6,17,29,.36)),
        radial-gradient(circle at 50% 6%,rgba(53,213,208,.15),transparent 32%)!important;
      border-bottom:1px solid rgba(53,213,208,.20)!important;
    }

    body#frameRoot.bt-premium-mode .half-screen.bottom{
      padding:8px 8px calc(26px + var(--safe-bottom))!important;
      background:
        linear-gradient(180deg,rgba(6,17,29,.38),rgba(7,31,39,.55) 46%,rgba(6,17,29,.92)),
        radial-gradient(circle at 50% 92%,rgba(132,255,247,.13),transparent 34%)!important;
    }

    body#frameRoot.bt-premium-mode .half-screen.top:after,
    body#frameRoot.bt-premium-mode .half-screen.bottom:after{
      content:"";
      position:absolute;
      inset:12px;
      z-index:-1;
      border-radius:28px;
      border:1px solid rgba(78,210,217,.16);
      background:linear-gradient(135deg,rgba(255,255,255,.035),transparent 48%,rgba(53,213,208,.035));
      box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 18px 50px rgba(0,0,0,.20);
      pointer-events:none;
    }

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

    body#frameRoot.bt-premium-mode .chat-body{
      mask-image:none!important;
      padding:12px 0!important;
      min-height:0!important;
      flex:1 1 auto!important;
    }

    body#frameRoot.bt-premium-mode #topBody,
    body#frameRoot.bt-premium-mode #botBody{min-height:0!important;}
    body#frameRoot.bt-premium-mode #botSection .composer-stack{position:relative!important;transform:translateY(-3px)!important;isolation:isolate!important;}
    body#frameRoot.bt-premium-mode #botComposer{position:relative!important;z-index:2!important;}

    body#frameRoot.bt-premium-mode .premium-bt-hint{
      width:min(84vw,520px);
      margin:14px auto 0;
      padding:15px 16px;
      border-radius:22px;
      color:#eafffd;
      font-size:12px;
      font-weight:850;
      line-height:1.42;
      text-align:center;
      border:1px solid rgba(53,213,208,.34);
      background:
        radial-gradient(circle at 14% 0%,rgba(53,213,208,.20),transparent 38%),
        linear-gradient(145deg,rgba(6,28,42,.88),rgba(9,24,36,.72));
      box-shadow:0 18px 50px rgba(0,0,0,.34),0 0 34px rgba(53,213,208,.10),inset 0 1px 0 rgba(255,255,255,.09);
      backdrop-filter:blur(16px);
      -webkit-backdrop-filter:blur(16px);
      pointer-events:none;
      position:relative;
      z-index:22;
    }

    body#frameRoot.bt-premium-mode .premium-bt-hint strong{
      display:block;
      margin-bottom:5px;
      font-size:20px;
      line-height:1.02;
      letter-spacing:-.045em;
      color:#fff;
      font-family:"Space Grotesk",Outfit,sans-serif;
      font-weight:900;
    }

    body#frameRoot.bt-premium-mode .premium-bt-hint span{
      display:block;
      color:#aeeeed;
      font-weight:900;
    }

    body#frameRoot.bt-premium-mode.bt-active .premium-bt-hint{display:none!important;}

    body#frameRoot.bt-premium-mode .bubble.them{opacity:.62;color:#bfd6e3!important;}
    body#frameRoot.bt-premium-mode .bubble.me{opacity:.9;color:#e8fffd!important;}
    body#frameRoot.bt-premium-mode .bubble.me.is-latest{color:#fff!important;text-shadow:0 0 22px rgba(53,213,208,.18);}

    body#frameRoot.bt-premium-mode .mic-btn{
      background:radial-gradient(circle at 50% 35%,rgba(132,255,247,.20),rgba(53,213,208,.12) 48%,rgba(6,17,29,.86))!important;
      border:1px solid rgba(132,255,247,.26)!important;
      box-shadow:0 18px 44px rgba(0,0,0,.35),0 0 26px rgba(53,213,208,.12),inset 0 1px 0 rgba(255,255,255,.10)!important;
    }

    body#frameRoot.bt-premium-mode .mic-btn.listening{
      background:radial-gradient(circle at 50% 35%,rgba(132,255,247,.38),rgba(53,213,208,.24) 46%,rgba(6,17,29,.86))!important;
      box-shadow:0 0 0 10px rgba(53,213,208,.13),0 0 36px rgba(53,213,208,.48),0 0 72px rgba(14,165,164,.25),inset 0 1px 0 rgba(255,255,255,.12)!important;
    }

    body#frameRoot.bt-premium-mode .mic-btn.listening::after{
      border-color:rgba(132,255,247,.78)!important;
      box-shadow:0 0 0 12px rgba(53,213,208,.10),0 0 38px rgba(53,213,208,.35)!important;
    }

    body#frameRoot.bt-premium-mode .center-hub{
      height:76px!important;
      background:rgba(3,14,27,.70)!important;
      border-top:1px solid rgba(78,210,217,.18)!important;
      border-bottom:1px solid rgba(78,210,217,.18)!important;
      box-shadow:0 0 44px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.04)!important;
    }

    body#frameRoot.bt-premium-mode .ai-core{
      background:#06111d!important;
      border-color:rgba(53,213,208,.30)!important;
      box-shadow:0 0 28px rgba(53,213,208,.16),inset 0 1px 0 rgba(255,255,255,.06)!important;
    }

    body#frameRoot.bt-premium-mode .ball-1,
    body#frameRoot.bt-premium-mode .ball-2{background:#35d5d0!important;box-shadow:0 0 18px rgba(53,213,208,.9)!important;}
    body#frameRoot.bt-premium-mode #frameRoot.is-ready .ball-1,
    body#frameRoot.bt-premium-mode #frameRoot.is-ready .ball-2{background:#22c55e!important;}

    body#frameRoot.bt-premium-mode .nav-btn{
      writing-mode:vertical-rl!important;
      text-orientation:upright!important;
      letter-spacing:1px!important;
      line-height:1.1!important;
      width:30px!important;
      height:118px!important;
      top:50%!important;
      transform:translateY(-50%)!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      z-index:1800!important;
      background:linear-gradient(180deg,rgba(53,213,208,.23),rgba(6,17,29,.86))!important;
      border-color:rgba(53,213,208,.25)!important;
      color:#eafffd!important;
    }
    body#frameRoot.bt-premium-mode .nav-btn .label-rotate{writing-mode:vertical-rl!important;text-orientation:upright!important;transform:none!important;}
    body#frameRoot.bt-premium-mode #clearBtn{left:0!important;right:auto!important;border-radius:0 18px 18px 0!important;}
    body#frameRoot.bt-premium-mode #homeLink{right:0!important;left:auto!important;border-radius:18px 0 0 18px!important;}

    body#frameRoot.bt-premium-mode #btToggleBtn{
      position:fixed!important;
      left:38px!important;
      top:50%!important;
      transform:translateY(-50%)!important;
      z-index:1810!important;
      display:flex!important;
      width:50px!important;
      height:50px!important;
      background:rgba(53,213,208,.12)!important;
      border-color:rgba(53,213,208,.36)!important;
      color:#aafffb!important;
      box-shadow:0 16px 38px rgba(0,0,0,.28),0 0 22px rgba(53,213,208,.14)!important;
    }
    body#frameRoot.bt-premium-mode #btToggleBtn.connected{color:#bbf7d0!important;border-color:rgba(34,197,94,.68)!important;background:rgba(22,163,74,.22)!important;box-shadow:0 0 18px rgba(34,197,94,.36),inset 0 1px 0 rgba(255,255,255,.10)!important;}

    body#frameRoot.bt-premium-mode #centerHub #handsFreeToggle,
    body#frameRoot.bt-premium-mode .center-hub #handsFreeToggle{display:none!important;pointer-events:none!important;}
    body#frameRoot.bt-premium-mode #botSection .composer-stack > #handsFreeToggle{position:absolute!important;left:calc(50% + 50px)!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translateY(-50%)!important;z-index:70!important;width:auto!important;max-width:116px!important;min-height:40px!important;white-space:nowrap!important;padding:7px 10px!important;font-size:10px!important;line-height:1!important;gap:6px!important;flex-shrink:0!important;background:rgba(53,213,208,.10)!important;border-color:rgba(53,213,208,.28)!important;color:#ddfffc!important;}
    body#frameRoot.bt-premium-mode #botSection .composer-stack > #handsFreeToggle span{display:inline!important;overflow:visible!important;text-overflow:clip!important;white-space:nowrap!important;}

    @media(max-width:390px){
      body#frameRoot.bt-premium-mode #botSection .composer-stack{transform:translateY(-3px)!important;}
      body#frameRoot.bt-premium-mode #btToggleBtn{left:36px!important;width:44px!important;height:44px!important;}
      body#frameRoot.bt-premium-mode #botSection .composer-stack > #handsFreeToggle{left:calc(50% + 42px)!important;width:auto!important;height:38px!important;min-height:38px!important;max-width:112px!important;padding:6px 8px!important;justify-content:center!important;gap:5px!important;font-size:9px!important;}
      body#frameRoot.bt-premium-mode #botSection .composer-stack > #handsFreeToggle span{display:inline!important;font-size:9px!important;line-height:1!important;max-width:76px!important;overflow:visible!important;text-overflow:clip!important;}
      body#frameRoot.bt-premium-mode #botSection .composer-stack > #handsFreeToggle svg{width:15px!important;height:15px!important;flex:0 0 auto!important;}
      body#frameRoot.bt-premium-mode .premium-bt-hint{width:min(82vw,340px);margin-top:10px;padding:12px 13px;font-size:11px;}
      body#frameRoot.bt-premium-mode .premium-bt-hint strong{font-size:18px;}
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
  hint.innerHTML = "<strong>İkili Telefon</strong><span>Bir telefonda kod oluşturun, diğer telefonda aynı kodla katılın. Bağlantı kurulunca iki cihaz arasında çeviri akışı çalışır.</span>";
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

function updateTwoPhonePageMeta() {
  document.title = "İkili Telefon | italkyAI";
  const homeLink = document.getElementById("homeLink");
  if (homeLink) homeLink.setAttribute("href", "/pages/home.html");
}

function boot() {
  injectPremiumUiCss();
  if (!isTwoPhoneMode) return;
  updateTwoPhonePageMeta();
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
