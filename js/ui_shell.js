import { installAutoTranslate } from "/js/system_lang.js";
import { STORAGE_KEY } from "/js/config.js";

const NATIVE_LANG_STORAGE_KEY = "italky_native_lang_v1";
const SITE_LANG_STORAGE_KEY = "site_lang";

const NATIVE_LANG_META = {
  tr: { flag: "🇹🇷", name: "Türkçe", dir: "ltr" },
  en: { flag: "🇬🇧", name: "İngilizce", dir: "ltr" },
  de: { flag: "🇩🇪", name: "Almanca", dir: "ltr" },
  fr: { flag: "🇫🇷", name: "Fransızca", dir: "ltr" },
  it: { flag: "🇮🇹", name: "İtalyanca", dir: "ltr" },
  es: { flag: "🇪🇸", name: "İspanyolca", dir: "ltr" },
  ar: { flag: "🇸🇦", name: "Arapça", dir: "rtl" },

  ru: { flag: "🇷🇺", name: "Rusça", dir: "ltr" },
  bg: { flag: "🇧🇬", name: "Bulgarca", dir: "ltr" },
  bn: { flag: "🇧🇩", name: "Bengalce", dir: "ltr" },
  ca: { flag: "🇪🇸", name: "Katalanca", dir: "ltr" },
  cs: { flag: "🇨🇿", name: "Çekçe", dir: "ltr" },
  da: { flag: "🇩🇰", name: "Danca", dir: "ltr" },
  el: { flag: "🇬🇷", name: "Yunanca", dir: "ltr" },
  et: { flag: "🇪🇪", name: "Estonca", dir: "ltr" },
  eu: { flag: "🇪🇸", name: "Baskça", dir: "ltr" },
  fi: { flag: "🇫🇮", name: "Fince", dir: "ltr" },
  gl: { flag: "🇪🇸", name: "Galiçyaca", dir: "ltr" },
  hu: { flag: "🇭🇺", name: "Macarca", dir: "ltr" },
  id: { flag: "🇮🇩", name: "Endonezce", dir: "ltr" },
  lt: { flag: "🇱🇹", name: "Litvanca", dir: "ltr" },
  lv: { flag: "🇱🇻", name: "Letonca", dir: "ltr" },
  ms: { flag: "🇲🇾", name: "Malayca", dir: "ltr" },
  nl: { flag: "🇳🇱", name: "Hollandaca", dir: "ltr" },
  pl: { flag: "🇵🇱", name: "Lehçe", dir: "ltr" },
  ro: { flag: "🇷🇴", name: "Romence", dir: "ltr" },
  sk: { flag: "🇸🇰", name: "Slovakça", dir: "ltr" },
  sl: { flag: "🇸🇮", name: "Slovence", dir: "ltr" },
  sq: { flag: "🇦🇱", name: "Arnavutça", dir: "ltr" },
  th: { flag: "🇹🇭", name: "Tayca", dir: "ltr" },
  ur: { flag: "🇵🇰", name: "Urduca", dir: "rtl" },
  vi: { flag: "🇻🇳", name: "Vietnamca", dir: "ltr" },
  zh: { flag: "🇨🇳", name: "Çince", dir: "ltr" }
};

const QUICK_SITE_LANGS = ["tr", "en", "de", "fr", "it", "es", "ar"];

function getNativeLangCode() {
  return String(
    localStorage.getItem(NATIVE_LANG_STORAGE_KEY) ||
    localStorage.getItem(SITE_LANG_STORAGE_KEY) ||
    "tr"
  )
    .trim()
    .toLowerCase();
}

function getNativeLangInfo() {
  const code = getNativeLangCode();
  return NATIVE_LANG_META[code] || {
    flag: "🌐",
    name: code.toUpperCase() || "Dil",
    dir: "ltr"
  };
}

function hydrateNativeLangPill() {
  const info = getNativeLangInfo();
  const flagEl = document.getElementById("headerNativeLangFlag");
  const textEl = document.getElementById("siteLangCurrentText");
  const btnEl = document.getElementById("siteLangBtn");

  if (flagEl) flagEl.textContent = info.flag;
  if (textEl) textEl.textContent = `${info.flag} ${info.name}`;
  if (btnEl) btnEl.textContent = `Site Dili • ${info.name}`;
}

export function refreshHeaderNativeLang() {
  hydrateNativeLangPill();
}

const LOADING_OVERLAY_HTML = `
<div id="shellOverlay" style="
  position:fixed; inset:0; background:#070812; z-index:99999;
  display:flex; align-items:center; justify-content:center;
  transition:opacity .35s ease;
">
  <div style="text-align:center; font-family:Outfit,sans-serif;">
    <div style="font-size:30px; font-weight:800; color:#f5f7ff;">
      italky
      <span style="
        background:linear-gradient(135deg,#8bd3ff 0%, #7c5cff 45%, #ff66c4 100%);
        -webkit-background-clip:text;
        -webkit-text-fill-color:transparent;
      ">AI</span>
    </div>
    <div style="
      font-size:10px; letter-spacing:4px; color:rgba(255,255,255,.36);
      margin-top:8px; font-weight:800;
    ">BE FREE</div>
  </div>
</div>`;

const HOME_HEADER_HTML = `
<header class="premium-header" id="italkyHeader">
  <div class="brand-group" id="brandHome" style="cursor:pointer;" data-no-translate="1">
    <h1>
      <span>italky</span>
      <span class="ai">AI</span>
    </h1>
    <div class="brand-slogan" data-no-translate="1">BE FREE</div>
  </div>

  <div class="header-actions">
    <button class="plus-btn flat-top-btn" id="headerPlusBtn" aria-label="Jeton Yükle" type="button" title="Jeton Yükle">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14"></path>
        <path d="M5 12h14"></path>
      </svg>
    </button>

    <button class="settings-btn flat-top-btn" id="headerSettingsBtn" aria-label="Ayarlar" type="button" title="Ayarlar">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l1.2 2.4 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4L12 3z"></path>
        <circle cx="12" cy="12" r="3.2"></circle>
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6z"></path>
      </svg>
    </button>

    <button class="menu-btn flat-top-btn" id="menuBtn" aria-label="Menü" type="button">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<aside class="side-menu" id="sideMenu" aria-hidden="true">
  <div class="menu-backdrop" id="menuBackdrop"></div>

  <div class="menu-panel">
    <div class="menu-top">
      <div class="menu-user-card" id="menuProfileTop">
        <div class="menu-avatar-wrap">
          <div class="menu-avatar" id="menuAvatarClick">
            <img src="" id="menuUserPic" alt="Avatar">
          </div>
        </div>

        <div class="menu-user-meta">
          <div class="menu-brandline" data-no-translate="1">
            <span class="menu-brand-main">italky</span>
            <span class="menu-brand-ai">AI</span>
          </div>

          <div class="menu-username" id="menuUserName">Kullanıcı</div>
          <div class="menu-last-login" id="menuLastLogin">S.G.T: -</div>
          <div class="menu-plan-line" id="menuPlanLine">Üyelik • Aktif</div>

          <div class="menu-token-row">
            <div class="menu-token-pill">
              <span>Jeton Bakiyesi</span>
              <strong id="menuHeaderJeton">0</strong>
            </div>
          </div>

          <div class="menu-token-link-wrap">
            <a class="menu-token-link" id="menuJetonInfoLink" href="/pages/jeton-nedir.html">Jeton Nedir?</a>
          </div>
        </div>
      </div>
    </div>

    <nav class="menu-nav">
      <a href="/pages/jetonbuy.html" id="jetonDirectLink">Jeton Yükle</a>
      <button class="menu-action" id="siteLangBtn" type="button">Site Dili • Türkçe</button>
      <a href="/pages/wallet_history.html" data-i18n="menu_wallet_history">Jeton Hareketleri</a>
      <a href="/pages/admin.html" id="adminPanelLink" class="hidden">Admin Panel</a>
      <a href="/pages/deneme.html" id="italkyAiTestLink" class="hidden">italkyAI</a>
      <a href="/pages/profile.html" data-i18n="menu_profile">Profil</a>
      <a href="/pages/about.html" data-i18n="menu_about">Hakkımızda</a>
      <a href="/pages/jeton-nedir.html" data-i18n="menu_what_is_token">Jeton Nedir</a>
      <a href="/pages/faq.html" data-i18n="menu_faq">SSS</a>
      <a href="/pages/privacy.html" data-i18n="menu_privacy">Gizlilik</a>
      <a href="/pages/contact.html" data-i18n="menu_contact">İletişim</a>

      <button class="menu-action logout-action" id="logoutBtn" type="button" data-i18n="menu_logout">Güvenli Çıkış</button>
      <button class="menu-action delete-action" id="deleteAccountBtn" type="button" data-i18n="menu_delete_account">Hesabımı Sil</button>
    </nav>

    <div class="menu-orbit-wrap" aria-hidden="true">
      <div class="menu-orbit-core">italkyAI</div>
      <div class="menu-orbit-ring ring-1">
        <span class="orbit-dot dot-red"></span>
      </div>
      <div class="menu-orbit-ring ring-2">
        <span class="orbit-dot dot-blue"></span>
      </div>
      <div class="menu-orbit-ring ring-3">
        <span class="orbit-dot dot-green"></span>
      </div>
    </div>

    <div class="menu-sign" data-no-translate="1">
      <span class="menu-sign-main">italkyAI By Ozyigit's</span>
      <span class="menu-sign-dot">•</span>
      <span class="menu-sign-year">2026</span>
    </div>
  </div>
</aside>`;

const HOME_FOOTER_HTML = `
<footer class="premium-footer" id="italkyFooter">
  <div class="signature" data-no-translate="1">
    <span class="signature-main">italkyAI By Ozyigit's</span>
    <span class="signature-dot">•</span>
    <span class="signature-year">2026</span>
  </div>
</footer>`;

const SITE_LANG_MODAL_HTML = `
<div class="shell-modal" id="siteLangModal" aria-hidden="true">
  <div class="shell-modal-backdrop" id="siteLangBackdrop"></div>
  <div class="shell-modal-card">
    <div class="shell-modal-head">
      <h3>Site Dili</h3>
      <button type="button" class="shell-modal-close" id="siteLangCloseBtn" aria-label="Kapat">✕</button>
    </div>
    <div class="shell-modal-sub" id="siteLangCurrentText">🇹🇷 Türkçe</div>
    <div class="site-lang-grid" id="siteLangGrid">
      ${QUICK_SITE_LANGS.map(code => {
        const meta = NATIVE_LANG_META[code];
        return `
          <button class="site-lang-item" type="button" data-lang="${code}">
            <span class="site-lang-flag">${meta.flag}</span>
            <span class="site-lang-name">${meta.name}</span>
          </button>
        `;
      }).join("")}
    </div>
  </div>
</div>`;

const SHELL_CSS = `
:root{
  --ai-gradient: linear-gradient(135deg,#8bd3ff 0%,#7c5cff 45%,#ff66c4 100%);
  --footerH:0px;
  --shell-text:#f5f7ff;
  --trendyol-orange:#f27a1a;
  --trendyol-orange-dark:#e46f17;
  --danger-red:#d95f5f;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
.hidden{display:none !important;}
html,body{
  margin:0;padding:0;width:100%;height:100%;
  background:#05070f !important;font-family:'Outfit',sans-serif;
  overflow:hidden;color:var(--shell-text);
}
#pageContent{transition:opacity .18s ease;}
body.ui-menu-open{overflow:hidden;}
.italky-bg{
  position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(circle at 20% 15%, rgba(124,92,255,.14) 0%, transparent 28%),
    radial-gradient(circle at 78% 22%, rgba(139,211,255,.11) 0%, transparent 24%),
    radial-gradient(circle at 50% 55%, rgba(255,102,196,.06) 0%, transparent 22%),
    linear-gradient(180deg,#05070f 0%, #090d19 45%, #05070f 100%);
}
.italky-bg::after{
  content:"";position:absolute;inset:0;
  background:
    linear-gradient(to bottom, transparent, rgba(255,255,255,.012)),
    repeating-linear-gradient(to bottom, transparent 0px, transparent 36px, rgba(255,255,255,.012) 37px);
  opacity:.34;
}
.app-viewport{
  position:relative;z-index:5;width:100%;max-width:430px;height:100dvh;margin:0 auto;
  display:flex;flex-direction:column;
  background:linear-gradient(180deg, rgba(13,17,31,.92) 0%, rgba(8,11,22,.84) 100%);
  backdrop-filter:blur(18px);
  border-left:1px solid rgba(255,255,255,.06);
  border-right:1px solid rgba(255,255,255,.06);
  overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.36);opacity:0;
}
.premium-header{
  position:relative;padding:calc(18px + env(safe-area-inset-top)) 18px 14px;
  display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid rgba(255,255,255,.06);
  background:linear-gradient(180deg, rgba(10,13,24,.88) 0%, rgba(10,13,24,.52) 100%);
  flex:0 0 auto;
}
.premium-header::after{
  content:"";position:absolute;left:18px;right:18px;bottom:-1px;height:1px;
  background:linear-gradient(90deg, transparent, rgba(139,211,255,.18), transparent);
}
.brand-group{display:flex;flex-direction:column;gap:3px;}
.brand-group h1{
  margin:0;display:flex;gap:2px;align-items:center;font-size:26px;line-height:1;
  font-weight:800;letter-spacing:-0.4px;color:#f6f8ff;
}
.brand-group h1 .ai{
  background:var(--ai-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 10px rgba(124,92,255,.25));
}
.brand-slogan{font-size:9px;font-weight:800;letter-spacing:3.8px;color:rgba(255,255,255,.38);margin-left:1px;}
.header-actions{display:flex;align-items:center;gap:6px;}
.flat-top-btn{
  width:38px;height:38px;border:none;border-radius:12px;background:transparent;box-shadow:none;
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;padding:0;
}
.plus-btn svg,
.settings-btn svg{
  width:18px;height:18px;stroke:#f2f5ff;stroke-width:2;fill:none;opacity:.96;
}
.menu-btn{flex-direction:column;gap:4px;}
.menu-btn span{display:block;width:18px;height:2px;border-radius:999px;background:#f2f5ff;}
.shellMain{flex:1;min-height:0;overflow-y:auto;padding-bottom:calc(var(--footerH) + 10px);position:relative;}
.premium-footer{
  position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:center;align-items:center;
  background:rgba(9,12,22,.74);backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,.06);
  padding:10px 12px calc(10px + env(safe-area-inset-bottom));z-index:30;
}
.signature{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;font-size:11px;font-weight:800;letter-spacing:.25px;text-align:center;}
.signature-main{font-size:12px;font-weight:900;background:var(--ai-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 10px rgba(124,92,255,.18);}
.signature-year{color:rgba(139,211,255,.78);}
.signature-dot{color:rgba(255,255,255,.28);}
.side-menu{position:fixed;inset:0;z-index:200;pointer-events:none;}
.side-menu.open{pointer-events:auto;}
.menu-backdrop{
  position:absolute;inset:0;background:rgba(0,0,0,.42);opacity:0;transition:opacity .24s ease;backdrop-filter:blur(4px);
}
.side-menu.open .menu-backdrop{opacity:1;}
.menu-panel{
  position:absolute;top:0;right:0;width:min(86vw, 340px);height:100%;transform:translateX(104%);
  transition:transform .28s ease;background:linear-gradient(180deg, rgba(12,16,29,.98) 0%, rgba(8,11,21,.98) 100%);
  border-left:1px solid rgba(255,255,255,.07);box-shadow:-18px 0 44px rgba(0,0,0,.38);
  padding:calc(14px + env(safe-area-inset-top)) 12px calc(14px + env(safe-area-inset-bottom));
  display:flex;flex-direction:column;gap:10px;overflow:hidden;
}
.side-menu.open .menu-panel{transform:translateX(0);}
.menu-top{display:flex;flex-direction:column;gap:10px;position:relative;z-index:3;flex:0 0 auto;}
.menu-user-card{
  width:100%;display:flex;align-items:flex-start;gap:14px;padding:14px;border-radius:22px;
  background:linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.07);box-shadow:inset 0 1px 0 rgba(255,255,255,.03);cursor:pointer;min-height:112px;
}
.menu-avatar-wrap{flex:0 0 auto;padding-top:20px;}
.menu-avatar{
  width:62px;height:62px;border-radius:20px;overflow:hidden;background:linear-gradient(135deg, rgba(139,211,255,.18), rgba(255,102,196,.14));
  border:1px solid rgba(255,255,255,.10);cursor:pointer;transition:transform .18s ease, box-shadow .18s ease;
}
.menu-avatar:active{transform:scale(.97);}
.menu-avatar:hover{box-shadow:0 0 0 3px rgba(139,211,255,.10);}
.menu-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
.menu-user-meta{min-width:0;display:flex;flex-direction:column;gap:6px;flex:1;}
.menu-brandline{display:flex;align-items:center;gap:2px;font-size:20px;line-height:1;font-weight:800;margin-top:-12px;}
.menu-brand-main{color:#f6f8ff;}
.menu-brand-ai{background:var(--ai-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.menu-username{font-size:14px;font-weight:800;color:#ffffff;line-height:1.2;word-break:break-word;}
.menu-last-login{font-size:11px;font-weight:800;color:rgba(255,255,255,.56);line-height:1.3;}
.menu-plan-line{font-size:12px;font-weight:800;color:rgba(255,255,255,.72);line-height:1.35;margin-top:-2px;}
.menu-token-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.menu-token-pill{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;width:max-content;max-width:100%;
  padding:10px 14px;border-radius:999px;
  background:linear-gradient(135deg, rgba(255,118,20,.35), rgba(255,184,92,.24)), radial-gradient(circle at top left, rgba(255,255,255,.18), transparent 42%);
  border:1px solid rgba(255,167,71,.55);color:#fff8ef;font-size:13px;font-weight:1000;
  box-shadow:0 12px 26px rgba(242,122,26,.22),0 0 18px rgba(255,145,50,.14),inset 0 1px 0 rgba(255,255,255,.12);
}
.menu-token-pill strong{font-size:16px;font-weight:1000;color:#ffffff;}
.menu-token-link-wrap{display:flex;justify-content:center;width:100%;}
.menu-token-link{font-size:12px;font-weight:900;color:#f4d8ff;text-decoration:none;padding:4px 0 0;text-align:center;}
.menu-nav{display:flex;flex-direction:column;gap:7px;overflow:visible;padding-right:0;position:relative;z-index:3;flex:0 0 auto;}
.menu-nav a,.menu-action{
  width:100%;text-align:left;text-decoration:none;color:#f3f6ff;padding:12px 13px;border-radius:14px;
  background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
  border:1px solid rgba(255,255,255,.06);font-size:13px;font-weight:700;letter-spacing:.1px;cursor:pointer;
  font-family:'Outfit',sans-serif;line-height:1.15;
  transition:transform .18s ease,filter .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease;
}
.menu-nav a:hover,.menu-nav a:active,.menu-action:hover,.menu-action:active{
  background:linear-gradient(180deg, rgba(139,211,255,.12), rgba(124,92,255,.10));
}
#jetonDirectLink{
  color:#fffaf2 !important;
  background:linear-gradient(135deg, var(--trendyol-orange) 0%, var(--trendyol-orange-dark) 100%) !important;
  border:1px solid rgba(255,173,96,.34) !important;
  box-shadow:0 10px 24px rgba(242,122,26,.22), inset 0 1px 0 rgba(255,255,255,.08);
}
.logout-action{
  color:var(--trendyol-orange) !important;
}
.delete-action{
  color:var(--danger-red) !important;
}
.menu-orbit-wrap{
  position:absolute;left:50%;bottom:62px;transform:translateX(-50%);width:170px;height:170px;margin:0;
  pointer-events:none;z-index:1;opacity:.92;
}
.menu-orbit-core{
  position:absolute;inset:50%;width:68px;height:68px;margin-left:-34px;margin-top:-34px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%, rgba(255,255,255,.08), transparent 26%),linear-gradient(180deg,#030406 0%, #0a0d18 100%);
  border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;color:#f5f7ff;font-size:12px;font-weight:900;
  box-shadow:inset 0 0 18px rgba(255,255,255,.04), 0 0 26px rgba(124,92,255,.12);
}
.menu-orbit-ring{position:absolute;inset:0;border-radius:50%;border:1px solid rgba(139,211,255,.08);animation:orbitSpin 18s linear infinite;}
.menu-orbit-ring.ring-2{inset:16px;animation-duration:14s;animation-direction:reverse;border-color:rgba(255,102,196,.08);}
.menu-orbit-ring.ring-3{inset:32px;animation-duration:11s;border-color:rgba(52,211,153,.08);}
.orbit-dot{position:absolute;top:-5px;left:50%;width:10px;height:10px;margin-left:-5px;border-radius:50%;box-shadow:0 0 14px currentColor;}
.dot-red{background:#ff4d6d;color:#ff4d6d;}
.dot-blue{background:#38bdf8;color:#38bdf8;}
.dot-green{background:#34d399;color:#34d399;}
@keyframes orbitSpin{from{ transform:rotate(0deg); }to{ transform:rotate(360deg); }}
.menu-sign{
  margin-top:auto;padding-top:10px;display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;text-align:center;
  font-size:11px;font-weight:800;letter-spacing:.2px;position:relative;z-index:3;
}
.menu-sign-main{font-size:13px;font-weight:900;background:var(--ai-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 12px rgba(124,92,255,.18);}
.menu-sign-year{color:rgba(139,211,255,.82);}
.menu-sign-dot{color:rgba(255,255,255,.30);}
.shell-modal{
  position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:400;padding:18px;
}
.shell-modal.open{display:flex;}
.shell-modal-backdrop{
  position:absolute;inset:0;background:rgba(0,0,0,.48);backdrop-filter:blur(5px);
}
.shell-modal-card{
  position:relative;z-index:2;width:min(100%, 420px);border-radius:22px;
  background:linear-gradient(180deg, rgba(12,16,29,.98) 0%, rgba(8,11,21,.98) 100%);
  border:1px solid rgba(255,255,255,.08);box-shadow:0 22px 48px rgba(0,0,0,.38);
  padding:16px;
}
.shell-modal-head{
  display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;
}
.shell-modal-head h3{
  margin:0;font-size:18px;font-weight:900;color:#fff;
}
.shell-modal-close{
  width:34px;height:34px;border:none;border-radius:12px;background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.08);color:#fff;cursor:pointer;font-size:14px;font-weight:900;
}
.shell-modal-sub{
  color:rgba(255,255,255,.68);font-size:12px;font-weight:800;margin-bottom:12px;
}
.site-lang-grid{
  display:grid;grid-template-columns:1fr 1fr;gap:10px;
}
.site-lang-item{
  min-height:52px;border:none;border-radius:16px;padding:10px 12px;text-align:left;
  background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
  border:1px solid rgba(255,255,255,.07);color:#fff;cursor:pointer;
  display:flex;align-items:center;gap:10px;font-family:'Outfit',sans-serif;
}
.site-lang-item:hover,.site-lang-item:active{
  background:linear-gradient(180deg, rgba(139,211,255,.12), rgba(124,92,255,.10));
}
.site-lang-flag{font-size:18px;line-height:1;}
.site-lang-name{font-size:13px;font-weight:800;line-height:1.2;}
`;

let __shellAutoTranslateInstalled = false;
let __shellResizeBound = false;
let __shellEscapeBound = false;

export function mountShell(options = {}) {
  document.documentElement.style.backgroundColor = "#05070f";

  const content = document.getElementById("pageContent");
  if (content) {
    content.style.visibility = "hidden";
    content.style.opacity = "0";
  }

  if (!document.getElementById("shellOverlay")) {
    document.body.insertAdjacentHTML("afterbegin", LOADING_OVERLAY_HTML);
  }

  if (!document.getElementById("italkyShellStyle")) {
    const st = document.createElement("style");
    st.id = "italkyShellStyle";
    st.textContent = SHELL_CSS;
    document.head.prepend(st);
  }

  if (!content) {
    removeOverlaySoon();
    return;
  }

  if (document.getElementById("italkyAppShell")) {
    finishMount(options);
    return;
  }

  const bg = document.createElement("div");
  bg.className = "italky-bg";

  const shell = document.createElement("div");
  shell.className = "app-viewport";
  shell.id = "italkyAppShell";
  shell.innerHTML = `${HOME_HEADER_HTML}<main class="shellMain" id="shellMain"></main>${HOME_FOOTER_HTML}`;

  const main = shell.querySelector("#shellMain");
  main.appendChild(content);

  document.body.prepend(bg, shell);

  if (!document.getElementById("siteLangModal")) {
    document.body.insertAdjacentHTML("beforeend", SITE_LANG_MODAL_HTML);
  }

  document.getElementById("brandHome")?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  bindMenu();
  finishMount(options);

  if (!__shellResizeBound) {
    window.addEventListener("resize", syncFooterHeight, { passive: true });
    __shellResizeBound = true;
  }
}

function finishMount(options) {
  const main = document.getElementById("shellMain");
  const shell = document.getElementById("italkyAppShell");
  const content = document.getElementById("pageContent");

  if (main) {
    main.style.overflow = options?.scroll === "none" ? "hidden" : "auto";
  }

  requestAnimationFrame(() => {
    document.body.classList.add("ui-ready");
    hydrateFromCache();
    syncFooterHeight();
    hydrateShellMeta();
    hydratePlanUi();
    hydrateAdminButton();
    hydrateNativeLangPill();

    try {
      if (!__shellAutoTranslateInstalled) {
        installAutoTranslate(document.body);
        __shellAutoTranslateInstalled = true;
      }
    } catch (e) {
      console.warn("[system lang install]", e);
    }

    if (content) {
      content.style.visibility = "visible";
      content.style.opacity = "1";
    }

    if (shell) {
      shell.style.opacity = "1";
      shell.style.transition = "opacity .18s ease";
    }

    setTimeout(removeOverlaySoon, 60);
  });
}

function bindMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const headerSettingsBtn = document.getElementById("headerSettingsBtn");
  const headerPlusBtn = document.getElementById("headerPlusBtn");
  const sideMenu = document.getElementById("sideMenu");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const menuProfileTop = document.getElementById("menuProfileTop");
  const menuAvatarClick = document.getElementById("menuAvatarClick");
  const menuJetonInfoLink = document.getElementById("menuJetonInfoLink");
  const adminPanelLink = document.getElementById("adminPanelLink");
  const italkyAiTestLink = document.getElementById("italkyAiTestLink");
  const jetonDirectLink = document.getElementById("jetonDirectLink");
  const siteLangBtn = document.getElementById("siteLangBtn");

  const siteLangModal = document.getElementById("siteLangModal");
  const siteLangBackdrop = document.getElementById("siteLangBackdrop");
  const siteLangCloseBtn = document.getElementById("siteLangCloseBtn");
  const siteLangGrid = document.getElementById("siteLangGrid");

  if (!menuBtn || !sideMenu) return;
  if (menuBtn.dataset.bound === "1") return;

  const openMenu = () => {
    sideMenu.classList.add("open");
    sideMenu.setAttribute("aria-hidden", "false");
    document.body.classList.add("ui-menu-open");
    hydrateShellMeta();
    hydratePlanUi();
    hydrateAdminButton();
    hydrateNativeLangPill();
  };

  const closeMenu = () => {
    sideMenu.classList.remove("open");
    sideMenu.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ui-menu-open");
  };

  const openSiteLangModal = () => {
    siteLangModal?.classList.add("open");
    hydrateNativeLangPill();
  };

  const closeSiteLangModal = () => {
    siteLangModal?.classList.remove("open");
  };

  const goProfile = () => {
    closeMenu();
    location.href = "/pages/profile.html";
  };

  const goSettings = () => {
    closeMenu();
    location.href = "/pages/translation_settings.html";
  };

  const goPlus = () => {
    closeMenu();
    location.href = "/pages/jetonbuy.html";
  };

  menuBtn.addEventListener("click", openMenu);
  menuBackdrop?.addEventListener("click", closeMenu);
  headerSettingsBtn?.addEventListener("click", goSettings);
  headerPlusBtn?.addEventListener("click", goPlus);

  menuProfileTop?.addEventListener("click", goProfile);
  menuAvatarClick?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    goProfile();
  });

  menuJetonInfoLink?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenu();
    location.href = "/pages/jeton-nedir.html";
  });

  jetonDirectLink?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMenu();
    location.href = "/pages/jetonbuy.html";
  });

  siteLangBtn?.addEventListener("click", async () => {
    closeMenu();
    openSiteLangModal();
  });

  siteLangBackdrop?.addEventListener("click", closeSiteLangModal);
  siteLangCloseBtn?.addEventListener("click", closeSiteLangModal);

  siteLangGrid?.querySelectorAll("[data-lang]")?.forEach((btn) => {
    btn.addEventListener("click", async () => {
  const lang = String(btn.getAttribute("data-lang") || "tr").trim().toLowerCase();
  closeSiteLangModal();
  await applySiteLanguage(lang);
  hydrateNativeLangPill();
});

  adminPanelLink?.addEventListener("click", () => {
    closeMenu();
  });

  italkyAiTestLink?.addEventListener("click", () => {
    closeMenu();
  });

  sideMenu.querySelectorAll(".menu-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      closeMenu();
      const { supabase } = await import("/js/supabase_client.js");
      await supabase.auth.signOut();
    } catch {}
    location.href = "/pages/login.html";
  });

  deleteAccountBtn?.addEventListener("click", () => {
    closeMenu();
    location.href = "/pages/delete-account.html";
  });

  if (!__shellEscapeBound) {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
        closeSiteLangModal();
      }
    });
    __shellEscapeBound = true;
  }

  menuBtn.dataset.bound = "1";
}

async function applySiteLanguage(lang) {
  const code = String(lang || "tr").trim().toLowerCase();
  localStorage.setItem(NATIVE_LANG_STORAGE_KEY, code);
  localStorage.setItem(SITE_LANG_STORAGE_KEY, code);

  hydrateNativeLangPill();

  try {
    if (window.italkySiteLanguage && typeof window.italkySiteLanguage.setLanguage === "function") {
      await window.italkySiteLanguage.setLanguage(code);
      return;
    }
  } catch (e) {
    console.warn("[ui_shell setLanguage]", e);
  }

  setDocumentDirFromLang(code);
  window.location.reload();
}

function setDocumentDirFromLang(code) {
  const info = NATIVE_LANG_META[code] || { dir: "ltr" };
  const dir = info.dir || "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", code);
  document.body?.setAttribute("dir", dir);
}

export function hydrateFromCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const u = JSON.parse(raw);

    const nm = u?.display_name || u?.name || u?.full_name || u?.email || "Kullanıcı";
    const pic = String(u?.picture || u?.avatar || "").trim();
    const tokens = Number(u?.tokens ?? 0);

    const nameEl = document.getElementById("menuUserName");
    if (nameEl) nameEl.textContent = nm;

    const picEl = document.getElementById("menuUserPic");
    if (picEl && pic) {
      picEl.src = pic;
      picEl.referrerPolicy = "no-referrer";
    }

    const jetonEl = document.getElementById("menuHeaderJeton");
    if (jetonEl) jetonEl.textContent = String(tokens);
  } catch {}
}

async function hydratePlanUi() {
  const line = document.getElementById("menuPlanLine");
  if (!line) return;

  let mainLabel = "Üyelik";
  let subLabel = "Aktif";

  try {
    const { supabase } = await import("/js/supabase_client.js");
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      const resp = await fetch("https://italky-api.onrender.com/api/session/access-state", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const access = await resp.json().catch(() => ({}));
      const accessOpen = !!access?.access_open;
      subLabel = accessOpen ? "Aktif" : "Kapalı";
    }
  } catch (e) {
    console.warn("[ui_shell hydratePlanUi]", e);
  }

  line.textContent = `${mainLabel} • ${subLabel}`;
}

async function hydrateShellMeta() {
  const lastLoginEl = document.getElementById("menuLastLogin");
  const adminLink = document.getElementById("adminPanelLink");
  const aiTestLink = document.getElementById("italkyAiTestLink");

  try {
    const { supabase } = await import("/js/supabase_client.js");
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    const userId = user?.id || "";
    if (!userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("last_login_at, role, is_admin, tokens, full_name, avatar_url, email")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return;

    if (lastLoginEl) {
      let text = "S.G.T: -";
      if (data.last_login_at) {
        try {
          text = "S.G.T: " + new Date(data.last_login_at).toLocaleString("tr-TR");
        } catch {}
      }
      lastLoginEl.textContent = text;
    }

    const jetonEl = document.getElementById("menuHeaderJeton");
    if (jetonEl && typeof data.tokens !== "undefined" && data.tokens !== null) {
      jetonEl.textContent = String(Number(data.tokens || 0));
    }

    const nameEl = document.getElementById("menuUserName");
    if (nameEl && data.full_name) {
      nameEl.textContent = data.full_name;
    }

    const pic = String(data.avatar_url || "").trim();
    const picEl = document.getElementById("menuUserPic");
    if (picEl && pic) {
      picEl.src = pic;
      picEl.referrerPolicy = "no-referrer";
    }

    const role = String(data.role || "").toLowerCase().trim();
    const email = String(data.email || user.email || "").toLowerCase().trim();

    const isAdminAllowed =
      data.is_admin === true ||
      role === "admin" ||
      role === "superadmin" ||
      email === "oguzozyigit@gmail.com";

    const isSuperAdminAllowed =
      role === "superadmin" ||
      email === "oguzozyigit@gmail.com";

    if (adminLink) {
      if (isAdminAllowed) {
        adminLink.classList.remove("hidden");
        adminLink.style.display = "";
      } else {
        adminLink.classList.add("hidden");
        adminLink.style.display = "none";
      }
    }

    if (aiTestLink) {
      if (isSuperAdminAllowed) {
        aiTestLink.classList.remove("hidden");
        aiTestLink.style.display = "";
      } else {
        aiTestLink.classList.add("hidden");
        aiTestLink.style.display = "none";
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const cached = raw ? JSON.parse(raw) : {};
      cached.tokens = Number(data.tokens || 0);
      cached.role = role;
      cached.is_admin = data.is_admin === true;
      cached.last_login_at = data.last_login_at || "";
      cached.email = email || cached.email || "";
      if (data.full_name) cached.full_name = data.full_name;
      if (pic) cached.avatar = pic;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    } catch {}
  } catch (e) {
    console.warn("[ui_shell hydrateShellMeta]", e);
  }
}

async function hydrateAdminButton() {
  const adminLink = document.getElementById("adminPanelLink");
  const aiTestLink = document.getElementById("italkyAiTestLink");

  if (!adminLink && !aiTestLink) return;

  const show = (el) => {
    if (!el) return;
    el.classList.remove("hidden");
    el.style.display = "";
  };

  const hide = (el) => {
    if (!el) return;
    el.classList.add("hidden");
    el.style.display = "none";
  };

  hide(adminLink);
  hide(aiTestLink);

  try {
    const { supabase } = await import("/js/supabase_client.js");

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const u = JSON.parse(raw);

        const cachedRole = String(
          u?.role ||
          u?.user_metadata?.role ||
          ""
        ).toLowerCase().trim();

        const cachedEmail = String(
          u?.email ||
          u?.user_metadata?.email ||
          ""
        ).toLowerCase().trim();

        const cachedAdmin =
          u?.is_admin === true ||
          u?.user_metadata?.is_admin === true ||
          cachedRole === "admin" ||
          cachedRole === "superadmin" ||
          cachedEmail === "oguzozyigit@gmail.com";

        const cachedSuperAdmin =
          cachedRole === "superadmin" ||
          cachedEmail === "oguzozyigit@gmail.com";

        if (cachedAdmin) show(adminLink);
        if (cachedSuperAdmin) show(aiTestLink);
      }
    } catch {}

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    const userId = user?.id || "";
    if (!userId) {
      hide(adminLink);
      hide(aiTestLink);
      return;
    }

    const sessionRole = String(
      user?.user_metadata?.role || ""
    ).toLowerCase().trim();

    const sessionEmail = String(
      user?.email || ""
    ).toLowerCase().trim();

    const sessionAdmin =
      user?.user_metadata?.is_admin === true ||
      sessionRole === "admin" ||
      sessionRole === "superadmin" ||
      sessionEmail === "oguzozyigit@gmail.com";

    const sessionSuperAdmin =
      sessionRole === "superadmin" ||
      sessionEmail === "oguzozyigit@gmail.com";

    if (sessionAdmin) show(adminLink);
    if (sessionSuperAdmin) show(aiTestLink);

    const { data, error } = await supabase
      .from("profiles")
      .select("role,is_admin,email")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return;

    const role = String(data.role || "").toLowerCase().trim();
    const email = String(data.email || sessionEmail || "").toLowerCase().trim();

    const allowedAdmin =
      data.is_admin === true ||
      role === "admin" ||
      role === "superadmin" ||
      email === "oguzozyigit@gmail.com";

    const allowedSuperAdmin =
      role === "superadmin" ||
      email === "oguzozyigit@gmail.com";

    if (allowedAdmin) show(adminLink);
    else hide(adminLink);

    if (allowedSuperAdmin) show(aiTestLink);
    else hide(aiTestLink);
  } catch (e) {
    console.warn("[ui_shell admin btn]", e);
    hide(adminLink);
    hide(aiTestLink);
  }
}

function syncFooterHeight() {
  const f = document.getElementById("italkyFooter");
  if (f) {
    document.documentElement.style.setProperty("--footerH", `${f.offsetHeight}px`);
  }
}

function removeOverlaySoon() {
  const ov = document.getElementById("shellOverlay");
  if (ov) {
    ov.style.opacity = "0";
    setTimeout(() => ov.remove(), 350);
  }
}

export function setHeaderTokens(val) {
  const jetonEl = document.getElementById("menuHeaderJeton");
  if (jetonEl) jetonEl.textContent = String(val ?? "0");

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const u = raw ? JSON.parse(raw) : {};
    u.tokens = Number(val ?? 0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  } catch {}
}

try {
  window.setHeaderTokens = setHeaderTokens;
} catch {}

window.addEventListener("storage", (e) => {
  if (e.key === NATIVE_LANG_STORAGE_KEY || e.key === SITE_LANG_STORAGE_KEY) {
    hydrateNativeLangPill();
  }
});
