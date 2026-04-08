// FILE: /js/ui_shell.js

import { installAutoTranslate } from "/js/system_lang.js";
import { STORAGE_KEY } from "/js/config.js";

const NATIVE_LANG_STORAGE_KEY = "italky_native_lang_v1";

const NATIVE_LANG_META = {
  tr: { flag: "🇹🇷", name: "Türkçe" },
  en: { flag: "🇬🇧", name: "İngilizce" },
  de: { flag: "🇩🇪", name: "Almanca" },
  fr: { flag: "🇫🇷", name: "Fransızca" },
  ru: { flag: "🇷🇺", name: "Rusça" },
  bg: { flag: "🇧🇬", name: "Bulgarca" },
  bn: { flag: "🇧🇩", name: "Bengalce" },
  ca: { flag: "🇪🇸", name: "Katalanca" },
  cs: { flag: "🇨🇿", name: "Çekçe" },
  da: { flag: "🇩🇰", name: "Danca" },
  el: { flag: "🇬🇷", name: "Yunanca" },
  et: { flag: "🇪🇪", name: "Estonca" },
  eu: { flag: "🇪🇸", name: "Baskça" },
  fi: { flag: "🇫🇮", name: "Fince" },
  gl: { flag: "🇪🇸", name: "Galiçyaca" },
  hu: { flag: "🇭🇺", name: "Macarca" },
  id: { flag: "🇮🇩", name: "Endonezce" },
  lt: { flag: "🇱🇹", name: "Litvanca" },
  lv: { flag: "🇱🇻", name: "Letonca" },
  ms: { flag: "🇲🇾", name: "Malayca" },
  nl: { flag: "🇳🇱", name: "Hollandaca" },
  pl: { flag: "🇵🇱", name: "Lehçe" },
  ro: { flag: "🇷🇴", name: "Romence" },
  sk: { flag: "🇸🇰", name: "Slovakça" },
  sl: { flag: "🇸🇮", name: "Slovence" },
  sq: { flag: "🇦🇱", name: "Arnavutça" },
  th: { flag: "🇹🇭", name: "Tayca" },
  ur: { flag: "🇵🇰", name: "Urduca" },
  vi: { flag: "🇻🇳", name: "Vietnamca" },
  zh: { flag: "🇨🇳", name: "Çince" }
};

function getNativeLangInfo() {
  const code = String(localStorage.getItem(NATIVE_LANG_STORAGE_KEY) || "tr")
    .trim()
    .toLowerCase();

  return NATIVE_LANG_META[code] || {
    flag: "🌐",
    name: code.toUpperCase() || "Dil"
  };
}

function hydrateNativeLangPill() {
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
    <div class="native-lang-pill only-flag" id="headerNativeLangPill" title="Ana dil">
      <span class="native-lang-flag" id="headerNativeLangFlag">🌐</span>
    </div>

    <button class="avatar-mini-btn empty" id="headerAvatarBtn" aria-label="Profil" type="button" title="Profil">
      <img src="" id="headerAvatarImg" alt="Avatar">
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
      <div class="menu-accordion" id="jetonAccordion">
        <button class="menu-link-jeton accordion-trigger" id="jetonAccordionBtn" type="button">
          <span>Jeton Yükle</span>
          <span class="accordion-arrow">⌄</span>
        </button>

        <div class="accordion-body" id="jetonAccordionBody">
          <div class="accordion-body-inner">
            <button class="accordion-subbtn sub-google" id="jetonPlayBtn" type="button">
              <span class="sub-dot"></span>
              Google Hesabınla Yükle
            </button>

            <button class="accordion-subbtn sub-nfc" id="jetonNfcBtn" type="button">
              <span class="sub-dot"></span>
              NFC Kart İle Yükle
            </button>

            <button class="accordion-subbtn sub-code" id="jetonCodeBtn" type="button">
              <span class="sub-dot"></span>
              Kod İle Yükle
            </button>
          </div>
        </div>
      </div>

      <a href="/pages/wallet_history.html" data-i18n="menu_wallet_history">Jeton Hareketleri</a>
      <a href="/pages/admin.html" id="adminPanelLink" class="hidden">Admin Panel</a>
      <a href="/pages/profile.html" data-i18n="menu_profile">Profil</a>
      <a href="/pages/about.html" data-i18n="menu_about">Hakkımızda</a>
      <a href="/pages/jeton-nedir.html" data-i18n="menu_what_is_token">Jeton Nedir</a>
      <a href="/pages/faq.html" data-i18n="menu_faq">SSS</a>
      <a href="/pages/privacy.html" data-i18n="menu_privacy">Gizlilik</a>
      <a href="/pages/contact.html" data-i18n="menu_contact">İletişim</a>

      <button class="menu-action danger-lite" id="logoutBtn" type="button" data-i18n="menu_logout">Güvenli Çıkış</button>
      <button class="menu-action danger" id="deleteAccountBtn" type="button" data-i18n="menu_delete_account">Hesabımı Sil</button>
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

const SHELL_CSS = `
:root{
  --ai-gradient: linear-gradient(135deg,#8bd3ff 0%,#7c5cff 45%,#ff66c4 100%);
  --footerH:0px;
  --shell-text:#f5f7ff;
  --trendyol-orange:#f27a1a;
  --trendyol-orange-dark:#e46f17;
}

*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
}

.hidden{
  display:none !important;
}

html,body{
  margin:0;
  padding:0;
  width:100%;
  height:100%;
  background:#05070f !important;
  font-family:'Outfit',sans-serif;
  overflow:hidden;
  color:var(--shell-text);
}

#pageContent{
  transition:opacity .18s ease;
}

body.ui-menu-open{
  overflow:hidden;
}

.italky-bg{
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:0;
  background:
    radial-gradient(circle at 20% 15%, rgba(124,92,255,.14) 0%, transparent 28%),
    radial-gradient(circle at 78% 22%, rgba(139,211,255,.11) 0%, transparent 24%),
    radial-gradient(circle at 50% 55%, rgba(255,102,196,.06) 0%, transparent 22%),
    linear-gradient(180deg,#05070f 0%, #090d19 45%, #05070f 100%);
}

.italky-bg::after{
  content:"";
  position:absolute;
  inset:0;
  background:
    linear-gradient(to bottom, transparent, rgba(255,255,255,.012)),
    repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 36px,
      rgba(255,255,255,.012) 37px
    );
  opacity:.34;
}

.app-viewport{
  position:relative;
  z-index:5;
  width:100%;
  max-width:430px;
  height:100dvh;
  margin:0 auto;
  display:flex;
  flex-direction:column;
  background:linear-gradient(180deg, rgba(13,17,31,.92) 0%, rgba(8,11,22,.84) 100%);
  backdrop-filter:blur(18px);
  border-left:1px solid rgba(255,255,255,.06);
  border-right:1px solid rgba(255,255,255,.06);
  overflow:hidden;
  box-shadow:0 18px 50px rgba(0,0,0,.36);
  opacity:0;
}

.premium-header{
  position:relative;
  padding:calc(18px + env(safe-area-inset-top)) 18px 14px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  border-bottom:1px solid rgba(255,255,255,.06);
  background:linear-gradient(180deg, rgba(10,13,24,.88) 0%, rgba(10,13,24,.52) 100%);
  flex:0 0 auto;
}

.premium-header::after{
  content:"";
  position:absolute;
  left:18px;
  right:18px;
  bottom:-1px;
  height:1px;
  background:linear-gradient(90deg, transparent, rgba(139,211,255,.18), transparent);
}

.brand-group{
  display:flex;
  flex-direction:column;
  gap:3px;
}

.brand-group h1{
  margin:0;
  display:flex;
  gap:2px;
  align-items:center;
  font-size:26px;
  line-height:1;
  font-weight:800;
  letter-spacing:-0.4px;
  color:#f6f8ff;
}

.brand-group h1 .ai{
  background:var(--ai-gradient);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 10px rgba(124,92,255,.25));
}

.brand-slogan{
  font-size:9px;
  font-weight:800;
  letter-spacing:3.8px;
  color:rgba(255,255,255,.38);
  margin-left:1px;
}

.header-actions{
  display:flex;
  align-items:center;
  gap:10px;
}

.native-lang-pill{
  height:38px;
  min-width:38px;
  max-width:38px;
  padding:0;
  border-radius:12px;
  background:transparent;
  border:none;
  box-shadow:none;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:0;
  color:#f2f5ff;
  flex:0 0 auto;
  overflow:hidden;
}

.native-lang-flag{
  font-size:18px;
  line-height:1;
  flex:0 0 auto;
  filter:drop-shadow(0 0 6px rgba(255,255,255,.12));
}

.native-lang-label{
  display:none !important;
}

.avatar-mini-btn{
  width:38px;
  height:38px;
  border:none;
  border-radius:50%;
  background:transparent;
  box-shadow:none;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  overflow:hidden;
  padding:0;
  flex:0 0 auto;
}

.avatar-mini-btn img{
  width:34px;
  height:34px;
  border-radius:50%;
  object-fit:cover;
  display:block;
  border:1px solid rgba(255,255,255,.18);
}

.avatar-mini-btn.empty img{
  display:none;
}

.avatar-mini-btn.empty::before{
  content:"👤";
  font-size:20px;
  opacity:.92;
}

.flat-top-btn{
  width:38px;
  height:38px;
  border:none;
  border-radius:12px;
  background:transparent;
  box-shadow:none;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  flex:0 0 auto;
  padding:0;
}

.settings-btn svg{
  width:18px;
  height:18px;
  stroke:#f2f5ff;
  stroke-width:2;
  fill:none;
  opacity:.96;
}

.menu-btn{
  flex-direction:column;
  gap:4px;
}

.menu-btn span{
  display:block;
  width:18px;
  height:2px;
  border-radius:999px;
  background:#f2f5ff;
}

.shellMain{
  flex:1;
  min-height:0;
  overflow-y:auto;
  padding-bottom:calc(var(--footerH) + 10px);
  position:relative;
}

.premium-footer{
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  display:flex;
  justify-content:center;
  align-items:center;
  background:rgba(9,12,22,.74);
  backdrop-filter:blur(16px);
  border-top:1px solid rgba(255,255,255,.06);
  padding:10px 12px calc(10px + env(safe-area-inset-bottom));
  z-index:30;
}

.signature{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  flex-wrap:wrap;
  font-size:11px;
  font-weight:800;
  letter-spacing:.25px;
  text-align:center;
}

.signature-main{
  font-size:12px;
  font-weight:900;
  background:var(--ai-gradient);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  text-shadow:0 0 10px rgba(124,92,255,.18);
}

.signature-year{
  color:rgba(139,211,255,.78);
}

.signature-dot{
  color:rgba(255,255,255,.28);
}

.side-menu{
  position:fixed;
  inset:0;
  z-index:200;
  pointer-events:none;
}

.side-menu.open{
  pointer-events:auto;
}

.menu-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.42);
  opacity:0;
  transition:opacity .24s ease;
  backdrop-filter:blur(4px);
}

.side-menu.open .menu-backdrop{
  opacity:1;
}

.menu-panel{
  position:absolute;
  top:0;
  right:0;
  width:min(86vw, 340px);
  height:100%;
  transform:translateX(104%);
  transition:transform .28s ease;
  background:linear-gradient(180deg, rgba(12,16,29,.98) 0%, rgba(8,11,21,.98) 100%);
  border-left:1px solid rgba(255,255,255,.07);
  box-shadow:-18px 0 44px rgba(0,0,0,.38);
  padding:calc(14px + env(safe-area-inset-top)) 12px calc(14px + env(safe-area-inset-bottom));
  display:flex;
  flex-direction:column;
  gap:10px;
  overflow:hidden;
}

.side-menu.open .menu-panel{
  transform:translateX(0);
}

.menu-top{
  display:flex;
  flex-direction:column;
  gap:10px;
  position:relative;
  z-index:3;
  flex:0 0 auto;
}

.menu-user-card{
  width:100%;
  display:flex;
  align-items:flex-start;
  gap:14px;
  padding:14px;
  border-radius:22px;
  background:linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.07);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
  cursor:pointer;
  min-height:112px;
}

.menu-avatar-wrap{
  flex:0 0 auto;
  padding-top:20px;
}

.menu-avatar{
  width:62px;
  height:62px;
  border-radius:20px;
  overflow:hidden;
  background:linear-gradient(135deg, rgba(139,211,255,.18), rgba(255,102,196,.14));
  border:1px solid rgba(255,255,255,.10);
  cursor:pointer;
  transition:transform .18s ease, box-shadow .18s ease;
}

.menu-avatar:active{
  transform:scale(.97);
}

.menu-avatar:hover{
  box-shadow:0 0 0 3px rgba(139,211,255,.10);
}

.menu-avatar img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

.menu-user-meta{
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:6px;
  flex:1;
}

.menu-brandline{
  display:flex;
  align-items:center;
  gap:2px;
  font-size:20px;
  line-height:1;
  font-weight:800;
  margin-top:-12px;
}

.menu-brand-main{
  color:#f6f8ff;
}

.menu-brand-ai{
  background:var(--ai-gradient);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
}

.menu-username{
  font-size:14px;
  font-weight:800;
  color:#ffffff;
  line-height:1.2;
  word-break:break-word;
}

.menu-last-login{
  font-size:11px;
  font-weight:800;
  color:rgba(255,255,255,.56);
  line-height:1.3;
}

.menu-token-row{
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
}

.menu-token-pill{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  width:max-content;
  max-width:100%;
  padding:10px 14px;
  border-radius:999px;
  background:
    linear-gradient(135deg, rgba(255,118,20,.35), rgba(255,184,92,.24)),
    radial-gradient(circle at top left, rgba(255,255,255,.18), transparent 42%);
  border:1px solid rgba(255,167,71,.55);
  color:#fff8ef;
  font-size:13px;
  font-weight:1000;
  box-shadow:
    0 12px 26px rgba(242,122,26,.22),
    0 0 18px rgba(255,145,50,.14),
    inset 0 1px 0 rgba(255,255,255,.12);
}

.menu-token-pill strong{
  font-size:16px;
  font-weight:1000;
  color:#ffffff;
}

.menu-token-link-wrap{
  display:flex;
  justify-content:center;
  width:100%;
}

.menu-token-link{
  font-size:12px;
  font-weight:900;
  color:#f4d8ff;
  text-decoration:none;
  padding:4px 0 0;
  text-align:center;
}

.menu-nav{
  display:flex;
  flex-direction:column;
  gap:7px;
  overflow:visible;
  padding-right:0;
  position:relative;
  z-index:3;
  flex:0 0 auto;
}

.menu-nav a,
.menu-action,
.accordion-trigger,
.accordion-subbtn{
  width:100%;
  text-align:left;
  text-decoration:none;
  color:#f3f6ff;
  padding:12px 13px;
  border-radius:14px;
  background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
  border:1px solid rgba(255,255,255,.06);
  font-size:13px;
  font-weight:700;
  letter-spacing:.1px;
  cursor:pointer;
  font-family:'Outfit',sans-serif;
  line-height:1.15;
  transition:
    transform .18s ease,
    filter .18s ease,
    border-color .18s ease,
    box-shadow .18s ease,
    background .18s ease;
}

.menu-nav a:hover,
.menu-nav a:active,
.menu-action:hover,
.menu-action:active,
.accordion-trigger:hover,
.accordion-trigger:active,
.accordion-subbtn:hover,
.accordion-subbtn:active{
  background:linear-gradient(180deg, rgba(139,211,255,.12), rgba(124,92,255,.10));
}

.menu-link-jeton,
.accordion-trigger{
  color:#fffaf2 !important;
  background:linear-gradient(135deg, var(--trendyol-orange) 0%, var(--trendyol-orange-dark) 100%) !important;
  border:1px solid rgba(255,173,96,.34) !important;
  box-shadow:0 10px 24px rgba(242,122,26,.22), inset 0 1px 0 rgba(255,255,255,.08);
}

.accordion-trigger{
  display:flex;
  align-items:center;
  justify-content:space-between;
  min-height:60px;
}

.menu-accordion{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.accordion-arrow{
  font-size:22px;
  font-weight:900;
  opacity:.9;
  transition:transform .22s ease, opacity .22s ease;
}

.menu-accordion.open .accordion-arrow{
  transform:rotate(180deg) scale(1.08);
  opacity:1;
}

.accordion-body{
  display:grid;
  grid-template-rows:0fr;
  transition:grid-template-rows .24s ease;
}

.menu-accordion.open .accordion-body{
  grid-template-rows:1fr;
}

.accordion-body-inner{
  overflow:hidden;
  display:flex;
  flex-direction:column;
  gap:10px;
  padding:0 2px 2px 10px;
}

.accordion-subbtn{
  min-height:50px;
  display:flex;
  align-items:center;
  gap:10px;
  font-size:13px;
  font-weight:900;
  border:1px solid rgba(255,255,255,.08);
  transform:translateY(-4px);
  opacity:.92;
}

.menu-accordion.open .accordion-subbtn{
  transform:translateY(0);
  opacity:1;
}

.accordion-subbtn .sub-dot{
  width:10px;
  height:10px;
  border-radius:50%;
  flex:0 0 auto;
  box-shadow:0 0 10px currentColor;
}

.accordion-subbtn.sub-google{
  background:linear-gradient(135deg, rgba(255,86,86,.18), rgba(255,126,126,.10));
  border-color:rgba(255,106,106,.24);
  color:#ffecec;
  box-shadow:0 8px 18px rgba(255,86,86,.08);
}

.accordion-subbtn.sub-google .sub-dot{
  background:#ff5f5f;
  color:#ff5f5f;
}

.accordion-subbtn.sub-nfc{
  background:linear-gradient(135deg, rgba(70,155,255,.18), rgba(100,190,255,.10));
  border-color:rgba(100,190,255,.22);
  color:#ecf7ff;
  box-shadow:0 8px 18px rgba(70,155,255,.08);
}

.accordion-subbtn.sub-nfc .sub-dot{
  background:#4ea8ff;
  color:#4ea8ff;
}

.accordion-subbtn.sub-code{
  background:linear-gradient(135deg, rgba(60,210,140,.16), rgba(90,230,170,.10));
  border-color:rgba(90,230,170,.20);
  color:#ecfff5;
  box-shadow:0 8px 18px rgba(65,216,143,.08);
}

.accordion-subbtn.sub-code .sub-dot{
  background:#41d88f;
  color:#41d88f;
}

.accordion-subbtn:active{
  transform:scale(.985);
}

.menu-action{
  background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
}

.menu-action.danger-lite{
  border-color:rgba(255,180,180,.10);
}

.menu-action.danger{
  border-color:rgba(255,120,120,.18);
  color:#ffd6d6;
}

.menu-orbit-wrap{
  position:absolute;
  left:50%;
  bottom:62px;
  transform:translateX(-50%);
  width:170px;
  height:170px;
  margin:0;
  flex:0 0 auto;
  pointer-events:none;
  z-index:1;
  opacity:.92;
}

.menu-orbit-core{
  position:absolute;
  inset:50%;
  width:68px;
  height:68px;
  margin-left:-34px;
  margin-top:-34px;
  border-radius:50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255,255,255,.08), transparent 26%),
    linear-gradient(180deg,#030406 0%, #0a0d18 100%);
  border:1px solid rgba(255,255,255,.08);
  display:flex;
  align-items:center;
  justify-content:center;
  color:#f5f7ff;
  font-size:12px;
  font-weight:900;
  box-shadow:inset 0 0 18px rgba(255,255,255,.04), 0 0 26px rgba(124,92,255,.12);
}

.menu-orbit-ring{
  position:absolute;
  inset:0;
  border-radius:50%;
  border:1px solid rgba(139,211,255,.08);
  animation:orbitSpin 18s linear infinite;
}

.menu-orbit-ring.ring-2{
  inset:16px;
  animation-duration:14s;
  animation-direction:reverse;
  border-color:rgba(255,102,196,.08);
}

.menu-orbit-ring.ring-3{
  inset:32px;
  animation-duration:11s;
  border-color:rgba(52,211,153,.08);
}

.orbit-dot{
  position:absolute;
  top:-5px;
  left:50%;
  width:10px;
  height:10px;
  margin-left:-5px;
  border-radius:50%;
  box-shadow:0 0 14px currentColor;
}

.dot-red{
  background:#ff4d6d;
  color:#ff4d6d;
}

.dot-blue{
  background:#38bdf8;
  color:#38bdf8;
}

.dot-green{
  background:#34d399;
  color:#34d399;
}

@keyframes orbitSpin{
  from{ transform:rotate(0deg); }
  to{ transform:rotate(360deg); }
}

.menu-sign{
  margin-top:auto;
  padding-top:10px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  flex-wrap:wrap;
  text-align:center;
  font-size:11px;
  font-weight:800;
  letter-spacing:.2px;
  position:relative;
  z-index:3;
}

.menu-sign-main{
  font-size:13px;
  font-weight:900;
  background:var(--ai-gradient);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  text-shadow:0 0 12px rgba(124,92,255,.18);
}

.menu-sign-year{
  color:rgba(139,211,255,.82);
}

.menu-sign-dot{
  color:rgba(255,255,255,.30);
}
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
  const headerAvatarBtn = document.getElementById("headerAvatarBtn");
  const sideMenu = document.getElementById("sideMenu");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const menuProfileTop = document.getElementById("menuProfileTop");
  const menuAvatarClick = document.getElementById("menuAvatarClick");
  const menuJetonInfoLink = document.getElementById("menuJetonInfoLink");
  const adminPanelLink = document.getElementById("adminPanelLink");
  const jetonAccordion = document.getElementById("jetonAccordion");
  const jetonAccordionBtn = document.getElementById("jetonAccordionBtn");
  const jetonPlayBtn = document.getElementById("jetonPlayBtn");
  const jetonNfcBtn = document.getElementById("jetonNfcBtn");
  const jetonCodeBtn = document.getElementById("jetonCodeBtn");

  if (!menuBtn || !sideMenu) return;
  if (menuBtn.dataset.bound === "1") return;

  const openMenu = () => {
    sideMenu.classList.add("open");
    sideMenu.setAttribute("aria-hidden", "false");
    document.body.classList.add("ui-menu-open");
    hydrateShellMeta();
    hydrateAdminButton();
    hydrateNativeLangPill();
  };

  const closeMenu = () => {
    sideMenu.classList.remove("open");
    sideMenu.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ui-menu-open");
  };

  const goProfile = () => {
    closeMenu();
    location.href = "/pages/profile.html";
  };

  const goSettings = () => {
    closeMenu();
    location.href = "/pages/translation_settings.html";
  };

  menuBtn.addEventListener("click", openMenu);
  menuBackdrop?.addEventListener("click", closeMenu);
  headerSettingsBtn?.addEventListener("click", goSettings);
  headerAvatarBtn?.addEventListener("click", goProfile);

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

  adminPanelLink?.addEventListener("click", () => {
    closeMenu();
  });

  jetonAccordionBtn?.addEventListener("click", () => {
    jetonAccordion?.classList.toggle("open");
  });

  jetonPlayBtn?.addEventListener("click", () => {
    closeMenu();
    location.href = "/pages/jetonbuy.html";
  });

  jetonNfcBtn?.addEventListener("click", () => {
    closeMenu();
    location.href = "/pages/nfc_load.html";
  });

  jetonCodeBtn?.addEventListener("click", () => {
    closeMenu();
    location.href = "/pages/code_load.html";
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
      }
    });
    __shellEscapeBound = true;
  }

  menuBtn.dataset.bound = "1";
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

    const topAvatarImg = document.getElementById("headerAvatarImg");
    const topAvatarBtn = document.getElementById("headerAvatarBtn");
    if (topAvatarImg && pic) {
      topAvatarImg.src = pic;
      topAvatarImg.referrerPolicy = "no-referrer";
      topAvatarBtn?.classList.remove("empty");
    }

    const jetonEl = document.getElementById("menuHeaderJeton");
    if (jetonEl) jetonEl.textContent = String(tokens);
  } catch {}
}

async function hydrateShellMeta() {
  const lastLoginEl = document.getElementById("menuLastLogin");
  const adminLink = document.getElementById("adminPanelLink");

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

    const topAvatarImg = document.getElementById("headerAvatarImg");
    const topAvatarBtn = document.getElementById("headerAvatarBtn");
    if (topAvatarImg && pic) {
      topAvatarImg.src = pic;
      topAvatarImg.referrerPolicy = "no-referrer";
      topAvatarBtn?.classList.remove("empty");
    }

    const role = String(data.role || "").toLowerCase().trim();
    const email = String(data.email || user.email || "").toLowerCase().trim();
    const allowed =
      data.is_admin === true ||
      role === "admin" ||
      role === "superadmin" ||
      email === "oguzozyigit@gmail.com";

    if (adminLink) {
      if (allowed) {
        adminLink.classList.remove("hidden");
        adminLink.style.display = "";
      } else {
        adminLink.classList.add("hidden");
        adminLink.style.display = "none";
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
  if (!adminLink) return;

  const show = () => {
    adminLink.classList.remove("hidden");
    adminLink.style.display = "";
  };

  const hide = () => {
    adminLink.classList.add("hidden");
    adminLink.style.display = "none";
  };

  hide();

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

        if (cachedAdmin) show();
      }
    } catch {}

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    const userId = user?.id || "";
    if (!userId) {
      hide();
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

    if (sessionAdmin) show();

    const { data, error } = await supabase
      .from("profiles")
      .select("role,is_admin,email")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return;

    const role = String(data.role || "").toLowerCase().trim();
    const email = String(data.email || sessionEmail || "").toLowerCase().trim();
    const allowed =
      data.is_admin === true ||
      role === "admin" ||
      role === "superadmin" ||
      email === "oguzozyigit@gmail.com";

    if (allowed) show();
    else hide();
  } catch (e) {
    console.warn("[ui_shell admin btn]", e);
    hide();
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
  if (e.key === NATIVE_LANG_STORAGE_KEY) {
    hydrateNativeLangPill();
  }
});
