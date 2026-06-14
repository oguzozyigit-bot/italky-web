import { installAutoTranslate } from "/js/system_lang.js";
import { STORAGE_KEY } from "/js/config.js";
import { initSiteLanguageManager } from "/js/site_language_manager.js";

const NATIVE_LANG_STORAGE_KEY = "italky_native_lang_v1";
const SITE_LANG_STORAGE_KEY = "site_lang";

const NATIVE_LANG_META = {
  tr: { flag: "🇹🇷", name: "Türkçe", dir: "ltr" },
  en: { flag: "🇬🇧", name: "English", dir: "ltr" },
  de: { flag: "🇩🇪", name: "Deutsch", dir: "ltr" },
  fr: { flag: "🇫🇷", name: "Français", dir: "ltr" },
  it: { flag: "🇮🇹", name: "Italiano", dir: "ltr" },
  es: { flag: "🇪🇸", name: "Español", dir: "ltr" },
  ar: { flag: "🇸🇦", name: "العربية", dir: "rtl" },

  ru: { flag: "🇷🇺", name: "Русский", dir: "ltr" },
  bg: { flag: "🇧🇬", name: "Български", dir: "ltr" },
  bn: { flag: "🇧🇩", name: "বাংলা", dir: "ltr" },
  ca: { flag: "🇪🇸", name: "Català", dir: "ltr" },
  cs: { flag: "🇨🇿", name: "Čeština", dir: "ltr" },
  da: { flag: "🇩🇰", name: "Dansk", dir: "ltr" },
  el: { flag: "🇬🇷", name: "Ελληνικά", dir: "ltr" },
  et: { flag: "🇪🇪", name: "Eesti", dir: "ltr" },
  eu: { flag: "🇪🇸", name: "Euskara", dir: "ltr" },
  fi: { flag: "🇫🇮", name: "Suomi", dir: "ltr" },
  gl: { flag: "🇪🇸", name: "Galego", dir: "ltr" },
  hu: { flag: "🇭🇺", name: "Magyar", dir: "ltr" },
  id: { flag: "🇮🇩", name: "Bahasa Indonesia", dir: "ltr" },
  lt: { flag: "🇱🇹", name: "Lietuvių", dir: "ltr" },
  lv: { flag: "🇱🇻", name: "Latviešu", dir: "ltr" },
  ms: { flag: "🇲🇾", name: "Bahasa Melayu", dir: "ltr" },
  nl: { flag: "🇳🇱", name: "Nederlands", dir: "ltr" },
  pl: { flag: "🇵🇱", name: "Polski", dir: "ltr" },
  ro: { flag: "🇷🇴", name: "Română", dir: "ltr" },
  sk: { flag: "🇸🇰", name: "Slovenčina", dir: "ltr" },
  sl: { flag: "🇸🇮", name: "Slovenščina", dir: "ltr" },
  sq: { flag: "🇦🇱", name: "Shqip", dir: "ltr" },
  th: { flag: "🇹🇭", name: "ไทย", dir: "ltr" },
  ur: { flag: "🇵🇰", name: "اردو", dir: "rtl" },
  vi: { flag: "🇻🇳", name: "Tiếng Việt", dir: "ltr" },
  zh: { flag: "🇨🇳", name: "中文", dir: "ltr" },
  pt: { flag: "🇵🇹", name: "Português", dir: "ltr" },
  hi: { flag: "🇮🇳", name: "हिन्दी", dir: "ltr" },
  ja: { flag: "🇯🇵", name: "日本語", dir: "ltr" },
  ko: { flag: "🇰🇷", name: "한국어", dir: "ltr" },
  sv: { flag: "🇸🇪", name: "Svenska", dir: "ltr" },
  no: { flag: "🇳🇴", name: "Norsk", dir: "ltr" },
  uk: { flag: "🇺🇦", name: "Українська", dir: "ltr" },
  fa: { flag: "🇮🇷", name: "فارسی", dir: "rtl" }
};

const QUICK_SITE_LANGS = [
  "tr", "en", "de", "fr", "it", "es", "ar",
  "ru", "bg", "bn", "ca", "cs", "da", "el", "et", "eu", "fi", "gl", "hu", "id", "lt", "lv",
  "ms", "nl", "pl", "ro", "sk", "sl", "sq", "th", "ur", "vi", "zh", "pt", "hi", "ja", "ko",
  "sv", "no", "uk", "fa"
];

function syncSiteLangKeys() {
  const siteLang = String(localStorage.getItem(SITE_LANG_STORAGE_KEY) || "").trim().toLowerCase();
  const nativeLang = String(localStorage.getItem(NATIVE_LANG_STORAGE_KEY) || "").trim().toLowerCase();

  if (siteLang && siteLang !== nativeLang) {
    localStorage.setItem(NATIVE_LANG_STORAGE_KEY, siteLang);
  } else if (!siteLang && nativeLang) {
    localStorage.setItem(SITE_LANG_STORAGE_KEY, nativeLang);
  }
}

function getNativeLangCode() {
  syncSiteLangKeys();
  return String(
    localStorage.getItem(SITE_LANG_STORAGE_KEY) ||
    localStorage.getItem(NATIVE_LANG_STORAGE_KEY) ||
    "tr"
  ).trim().toLowerCase();
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
  syncSiteLangKeys();

  const info = getNativeLangInfo();
  const flagEl = document.getElementById("headerNativeLangFlag");

  if (flagEl) flagEl.textContent = info.flag;
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
  <div style="text-align:center; font-family:Outfit,sans-serif;" data-no-translate="1">
    <div style="font-size:30px; font-weight:800; color:#f5f7ff;" data-no-translate="1">
      <span data-no-translate="1">italky</span>
      <span data-no-translate="1" style="
        background:linear-gradient(135deg,#8bd3ff 0%, #7c5cff 45%, #ff66c4 100%);
        -webkit-background-clip:text;
        -webkit-text-fill-color:transparent;
      ">AI</span>
    </div>
  </div>
</div>`;

const HOME_HEADER_HTML = `
<header class="premium-header" id="italkyHeader">
  <div class="brand-group" id="brandHome" style="cursor:pointer;" data-no-translate="1">
    <h1 data-no-translate="1">
      <span data-no-translate="1">italky</span>
      <span class="ai" data-no-translate="1">AI</span>
    </h1>
  </div>

  <div class="header-actions">
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
          <div class="menu-brandblock" data-no-translate="1">
            <div class="menu-brandline" data-no-translate="1">
              <span class="menu-brand-main" data-no-translate="1">italky</span>
              <span class="menu-brand-ai" data-no-translate="1">AI</span>
            </div>
            <div class="menu-brand-sub" data-no-translate="1">BE FREE</div>
          </div>

          <div class="menu-username" id="menuUserName">Kullanıcı</div>
          <div class="menu-login-date" id="menuLoginDate">Sisteme son giriş tarihi: -</div>
        </div>
      </div>
    </div>

    <nav class="menu-nav">
      <a href="/pages/login.html" id="menuLoginLink" class="hidden">Giriş Yap</a>

      <a href="/pages/admin.html" id="adminPanelLink" class="hidden">Admin Panel</a>
      <a href="/pages/deneme.html" id="italkyAiTestLink" class="hidden">italkyAI</a>
      <a href="/pages/profile.html" id="profileLink" data-i18n="menu_profile">Profil</a>
      <a href="/pages/about.html" data-i18n="menu_about">Hakkımızda</a>
      <a href="/pages/privacy.html" data-i18n="menu_privacy">Gizlilik</a>
      <a href="/pages/contact.html" data-i18n="menu_contact">İletişim</a>

      <button class="menu-action logout-action" id="logoutBtn" type="button" data-i18n="menu_logout">Güvenli Çıkış</button>
      <button class="menu-action delete-action" id="deleteAccountBtn" type="button" data-i18n="menu_delete_account">Hesabımı Sil</button>
    </nav>

    <div class="menu-sign" data-no-translate="1">
     
    </div>
  </div>
</aside>`;

const HOME_FOOTER_HTML = `
<footer class="premium-footer" id="italkyFooter">
  <div class="signature" data-no-translate="1">
    
  </div>
</footer>`;

const SHELL_CSS = `
:root{
  --ai-gradient: linear-gradient(135deg,#8bd3ff 0%,#7c5cff 45%,#ff66c4 100%);
  --footerH:0px;
  --shell-text:#f5f7ff;
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
.brand-group{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  justify-content:center;
}
.brand-group h1{
  margin:0;display:flex;gap:2px;align-items:center;font-size:26px;line-height:1;
  font-weight:800;letter-spacing:-0.4px;color:#f6f8ff;
}
.brand-group h1 .ai{
  background:var(--ai-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 10px rgba(124,92,255,.25));
}
.header-actions{display:flex;align-items:center;gap:6px;}
.header-actions > :not(#menuBtn){display:none!important;}
.flat-top-btn{
  width:38px;height:38px;border:none;border-radius:12px;background:transparent;box-shadow:none;
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;padding:0;
}
.menu-btn{
  display:flex;
  flex-direction:column;
  gap:4px;
}
.menu-btn span{display:block;width:18px;height:2px;border-radius:999px;background:#f2f5ff;}
.shellMain{flex:1;min-height:0;overflow-y:auto;padding-bottom:calc(var(--footerH) + 10px);position:relative;}
.premium-footer{
  position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:center;align-items:center;
  background:rgba(9,12,22,.74);backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,.06);
  padding:10px 12px calc(10px + env(safe-area-inset-bottom));z-index:30;
}
.signature{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;font-size:11px;font-weight:800;letter-spacing:.25px;text-align:center;}
.signature-main{font-size:12px;font-weight:900;background:var(--ai-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 10px rgba(124,92,255,.18);}
.signature-year,.signature-dot{display:none!important;}
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
  width:100%;
  display:flex;
  align-items:center;
  gap:14px;
  padding:16px;
  border-radius:22px;
  background:linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.07);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
  cursor:pointer;
  min-height:124px;
}
.menu-avatar-wrap{
  flex:0 0 auto;
  display:flex;
  align-items:center;
  justify-content:center;
}
.menu-avatar{
  width:64px;
  height:64px;
  border-radius:20px;
  overflow:hidden;
  background:linear-gradient(135deg, rgba(139,211,255,.18), rgba(255,102,196,.14));
  border:1px solid rgba(255,255,255,.10);
  cursor:pointer;
  transition:transform .18s ease, box-shadow .18s ease;
}
.menu-avatar:active{transform:scale(.97);}
.menu-avatar:hover{box-shadow:0 0 0 3px rgba(139,211,255,.10);}
.menu-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
.menu-user-meta{
  min-width:0;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:7px;
  flex:1;
}
.menu-brandblock{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:2px;
}
.menu-brandline{
  display:flex;
  align-items:center;
  gap:2px;
  font-size:20px;
  line-height:1;
  font-weight:800;
}
.menu-brand-main{color:#f6f8ff;}
.menu-brand-ai{background:var(--ai-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.menu-brand-sub{
  font-size:10px;
  font-weight:900;
  letter-spacing:3.2px;
  color:rgba(255,255,255,.42);
}
.menu-username{
  font-size:15px;
  font-weight:900;
  color:#ffffff;
  line-height:1.25;
  word-break:break-word;
}
.menu-login-date{
  font-size:11px;
  font-weight:800;
  color:rgba(255,255,255,.64);
  line-height:1.45;
}
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
.logout-action{color:#f27a1a !important;}
.delete-action{color:var(--danger-red) !important;}
.menu-orbit-wrap{
  display:none!important;
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
.menu-sign-year,.menu-sign-dot{display:none!important;}
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
.shell-modal-card.modern{
  width:min(100%, 440px);
  max-height:min(84vh, 760px);
  overflow:auto;
  border-radius:24px;
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
.site-lang-search-wrap{
  margin-bottom:12px;
}
.site-lang-search{
  width:100%;
  min-height:46px;
  border:none;
  outline:none;
  border-radius:14px;
  padding:0 14px;
  background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
  border:1px solid rgba(255,255,255,.07);
  color:#fff;
  font-family:'Outfit',sans-serif;
  font-size:14px;
  font-weight:700;
}
.site-lang-search::placeholder{
  color:rgba(255,255,255,.45);
}
.site-lang-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}
.site-lang-grid.modern{
  max-height:min(54vh, 430px);
  overflow:auto;
  padding-right:4px;
  scrollbar-width:thin;
}
.site-lang-item{
  min-height:52px;
  border:none;
  border-radius:16px;
  padding:10px 12px;
  text-align:left;
  background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
  border:1px solid rgba(255,255,255,.07);
  color:#fff;
  cursor:pointer;
  display:flex;
  align-items:center;
  gap:10px;
  font-family:'Outfit',sans-serif;
}
.site-lang-item.modern{
  min-height:58px;
  border-radius:18px;
  background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
}
.site-lang-item:hover,.site-lang-item:active,
.site-lang-item.modern:hover,.site-lang-item.modern:active{
  background:linear-gradient(180deg, rgba(139,211,255,.16), rgba(124,92,255,.12));
}
.site-lang-item.modern.hidden{
  display:none !important;
}
.site-lang-flag{
  font-size:20px;
  line-height:1;
}
.site-lang-name{
  font-size:13px;
  font-weight:800;
  line-height:1.2;
}
`;

let __shellAutoTranslateInstalled = false;
let __shellResizeBound = false;
let __shellEscapeBound = false;

function formatLoginDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("tr-TR");
  } catch {
    return value;
  }
}

function setGuestMenuMode(isGuest) {
  const menuLoginLink = document.getElementById("menuLoginLink");
  const walletHistoryLink = document.getElementById("walletHistoryLink");
  const profileLink = document.getElementById("profileLink");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const menuUserName = document.getElementById("menuUserName");
  const menuLoginDate = document.getElementById("menuLoginDate");
  const menuProfileTop = document.getElementById("menuProfileTop");

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

  if (isGuest) {
    show(menuLoginLink);
    hide(walletHistoryLink);
    hide(profileLink);
    hide(logoutBtn);
    hide(deleteAccountBtn);

    if (menuUserName) menuUserName.textContent = "Misafir";
    if (menuLoginDate) menuLoginDate.textContent = "Sisteme son giriş tarihi: -";
    if (menuProfileTop) menuProfileTop.style.cursor = "default";
  } else {
    hide(menuLoginLink);
    hide(walletHistoryLink);
    show(profileLink);
    show(logoutBtn);
    show(deleteAccountBtn);

    if (menuProfileTop) menuProfileTop.style.cursor = "pointer";
  }
}

function removePublicEmeShortcuts() {
  const selectors = [
    'a[href*="support_eme"]',
    'button[data-href*="support_eme"]',
    '[onclick*="support_eme"]',
    '.eme-top-btn',
    '.eme-header-avatar',
    '.eme-mini-btn',
    '.eme-mini',
    '.ios-eme-btn'
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (!node.closest(".eme-support-page")) node.remove();
    });
  });

  document.querySelectorAll(".premium-header .header-actions > :not(#menuBtn)").forEach((node) => {
    node.remove();
  });
}

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
    removePublicEmeShortcuts();
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

  document.getElementById("brandHome")?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  bindMenu(options);
  removePublicEmeShortcuts();
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
  const isPublicPage = options?.publicPage === true;

  if (main) {
    main.style.overflow = options?.scroll === "none" ? "hidden" : "auto";
  }

  requestAnimationFrame(async () => {
    document.body.classList.add("ui-ready");
    hydrateFromCache();
    syncFooterHeight();
    hydrateNativeLangPill();
    removePublicEmeShortcuts();

    if (isPublicPage) {
      try {
        const { supabase } = await import("/js/supabase_client.js");
        const { data: { session } } = await supabase.auth.getSession();
        setGuestMenuMode(!session?.user);
      } catch {
        setGuestMenuMode(true);
      }
    } else {
      hydrateShellMeta();
      hydratePlanUi();
      hydrateAdminButton();
    }

    try {
      if (!window.italkySiteLanguage) {
        initSiteLanguageManager().catch((e) => {
          console.warn("[ui_shell site language init]", e);
        });
      }
    } catch (e) {
      console.warn("[ui_shell site language init sync]", e);
    }

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

function bindMenu(options = {}) {
  const isPublicPage = options?.publicPage === true;

  const menuBtn = document.getElementById("menuBtn");
  const headerSettingsBtn = document.getElementById("headerSettingsBtn");
  const headerPlusBtn = document.getElementById("headerPlusBtn");
  const sideMenu = document.getElementById("sideMenu");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const menuProfileTop = document.getElementById("menuProfileTop");
  const menuAvatarClick = document.getElementById("menuAvatarClick");
  const adminPanelLink = document.getElementById("adminPanelLink");
  const italkyAiTestLink = document.getElementById("italkyAiTestLink");
  const menuLoginLink = document.getElementById("menuLoginLink");

  if (!menuBtn || !sideMenu) return;
  if (menuBtn.dataset.bound === "1") return;

  const openMenu = async () => {
    if (isPublicPage) {
      try {
        const { supabase } = await import("/js/supabase_client.js");
        const { data: { session } } = await supabase.auth.getSession();
        setGuestMenuMode(!session?.user);
      } catch {
        setGuestMenuMode(true);
      }
    }

    sideMenu.classList.add("open");
    sideMenu.setAttribute("aria-hidden", "false");
    document.body.classList.add("ui-menu-open");

    if (!isPublicPage) {
      hydrateShellMeta();
      hydratePlanUi();
      hydrateAdminButton();
    }

    hydrateNativeLangPill();
  };

  const closeMenu = () => {
    sideMenu.classList.remove("open");
    sideMenu.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ui-menu-open");
  };

  const goProfile = () => {
    if (isPublicPage) return;
    closeMenu();
    location.href = "/pages/profile.html";
  };

  const goSettings = () => {
    if (isPublicPage) return;
    closeMenu();
    location.href = "/pages/translation_settings.html";
  };

  const goPlus = () => {
    if (isPublicPage) return;
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

  menuLoginLink?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMenu();
    location.href = "/pages/login.html";
  });

  adminPanelLink?.addEventListener("click", closeMenu);
  italkyAiTestLink?.addEventListener("click", closeMenu);

  sideMenu.querySelectorAll(".menu-nav a").forEach((link) => {
    link.addEventListener("click", closeMenu);
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
      }
    });
    __shellEscapeBound = true;
  }

  menuBtn.dataset.bound = "1";
}

async function applySiteLanguage(lang) {
  const code = String(lang || "tr").trim().toLowerCase();

  localStorage.setItem(SITE_LANG_STORAGE_KEY, code);
  localStorage.setItem(NATIVE_LANG_STORAGE_KEY, code);

  hydrateNativeLangPill();
  setDocumentDirFromLang(code);

  try {
    if (window.italkySiteLanguage && typeof window.italkySiteLanguage.setLanguage === "function") {
      await window.italkySiteLanguage.setLanguage(code);
      localStorage.setItem(SITE_LANG_STORAGE_KEY, code);
      localStorage.setItem(NATIVE_LANG_STORAGE_KEY, code);
      hydrateNativeLangPill();
      return;
    }
  } catch (e) {
    console.warn("[ui_shell setLanguage]", e);
  }

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

    const nameEl = document.getElementById("menuUserName");
    if (nameEl) nameEl.textContent = nm;

    const picEl = document.getElementById("menuUserPic");
    if (picEl && pic) {
      picEl.src = pic;
      picEl.referrerPolicy = "no-referrer";
    }

    const loginDateEl = document.getElementById("menuLoginDate");
    if (loginDateEl) {
      loginDateEl.textContent = `Sisteme son giriş tarihi: ${formatLoginDate(u?.last_login_at || "")}`;
    }
  } catch {}
}

async function hydratePlanUi() {}

async function hydrateShellMeta() {
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
      .select("last_login_at, role, is_admin, full_name, avatar_url, email")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return;

    const nameEl = document.getElementById("menuUserName");
    if (nameEl && data.full_name) {
      nameEl.textContent = data.full_name;
    }

    const loginDateEl = document.getElementById("menuLoginDate");
    if (loginDateEl) {
      loginDateEl.textContent = `Sisteme son giriş tarihi: ${formatLoginDate(data.last_login_at || "")}`;
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
    syncSiteLangKeys();
    hydrateNativeLangPill();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    syncSiteLangKeys();
    hydrateNativeLangPill();
  }
});

window.addEventListener("focus", () => {
  syncSiteLangKeys();
  hydrateNativeLangPill();
});
