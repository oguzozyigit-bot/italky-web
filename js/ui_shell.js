import { installAutoTranslate } from "/js/system_lang.js";
import { STORAGE_KEY } from "/js/config.js";

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
    <button class="settings-btn" id="headerSettingsBtn" aria-label="Ayarlar" type="button" title="Ayarlar">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l1.2 2.4 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4L12 3z"></path>
        <circle cx="12" cy="12" r="3.2"></circle>
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6z"></path>
      </svg>
    </button>

    <button class="menu-btn" id="menuBtn" aria-label="Menü" type="button">
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

          <div class="menu-token-row">
            <div class="menu-token-pill">
              <span>Jeton</span>
              <strong id="menuHeaderJeton">0</strong>
            </div>

            <a class="menu-token-link" id="menuJetonInfoLink" href="/pages/jeton-nedir.html">Jeton Nedir?</a>
          </div>
        </div>
      </div>

      <div class="menu-membership-card" id="menuMembershipCard">
        <div class="menu-membership-top">
          <div class="menu-membership-title">Üyelik Durumu</div>
          <div class="menu-membership-badge neutral" id="menuMembershipBadge">Yükleniyor</div>
        </div>

        <div class="menu-membership-main" id="menuMembershipMain">Bilgi alınıyor...</div>
        <div class="menu-membership-sub" id="menuMembershipSub">Lütfen bekleyin</div>

        <div class="menu-membership-pills">
          <div class="menu-membership-pill" id="menuMembershipSourcePill">Kaynak: -</div>
          <div class="menu-membership-pill" id="menuMembershipDaysPill">Kalan: -</div>
        </div>

        <button class="menu-membership-btn hidden" id="menuMembershipBtn" type="button">Paket Seç</button>
      </div>
    </div>

    <nav class="menu-nav">
      <a href="/pages/jetonbuy.html" class="menu-link-jeton" data-i18n="menu_token_load">Jeton Yükle</a>
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

    <div class="menu-sign" data-no-translate="1">
      <span class="menu-sign-main">italkyAI</span>
      <span class="menu-sign-dot">•</span>
      <span class="menu-sign-year">2026</span>
    </div>
  </div>
</aside>`;

const HOME_FOOTER_HTML = `
<footer class="premium-footer" id="italkyFooter">
  <div class="signature" data-no-translate="1">
    <span class="signature-main">italkyAI</span>
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

.settings-btn,
.menu-btn{
  width:44px;
  height:44px;
  border:none;
  border-radius:14px;
  background:linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08);
  box-shadow:0 8px 18px rgba(0,0,0,.24);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  flex:0 0 auto;
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
}

.side-menu.open .menu-panel{
  transform:translateX(0);
}

.menu-top{
  display:flex;
  flex-direction:column;
  gap:10px;
}

.menu-user-card{
  width:100%;
  display:flex;
  align-items:center;
  gap:14px;
  padding:14px;
  border-radius:22px;
  background:linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.07);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
  cursor:pointer;
  min-height:92px;
}

.menu-avatar-wrap{
  flex:0 0 auto;
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
}

.menu-brandline{
  display:flex;
  align-items:center;
  gap:2px;
  font-size:20px;
  line-height:1;
  font-weight:800;
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

.menu-token-row{
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
}

.menu-token-pill{
  display:inline-flex;
  align-items:center;
  gap:8px;
  width:max-content;
  max-width:100%;
  padding:6px 10px;
  border-radius:999px;
  background:rgba(139,211,255,.10);
  border:1px solid rgba(139,211,255,.14);
  color:#d9e9ff;
  font-size:11px;
  font-weight:700;
}

.menu-token-pill strong{
  font-size:12px;
  font-weight:900;
  color:#fff;
}

.menu-token-link{
  font-size:11px;
  font-weight:800;
  color:#f4d8ff;
  text-decoration:none;
  padding:6px 0;
}

.menu-membership-card{
  width:100%;
  padding:14px;
  border-radius:20px;
  background:linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025));
  border:1px solid rgba(255,255,255,.07);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.02);
}

.menu-membership-card.state-active{
  border-color:rgba(139,211,255,.18);
  background:
    radial-gradient(circle at top left, rgba(139,211,255,.08), transparent 30%),
    linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
}

.menu-membership-card.state-warning{
  border-color:rgba(245,158,11,.26);
  background:
    radial-gradient(circle at top left, rgba(245,158,11,.08), transparent 30%),
    linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
}

.menu-membership-card.state-expired{
  border-color:rgba(239,68,68,.22);
  background:
    radial-gradient(circle at top left, rgba(239,68,68,.07), transparent 30%),
    linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
}

.menu-membership-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:8px;
}

.menu-membership-title{
  font-size:12px;
  font-weight:900;
  letter-spacing:.35px;
  color:rgba(255,255,255,.74);
  text-transform:uppercase;
}

.menu-membership-badge{
  display:inline-flex;
  align-items:center;
  min-height:26px;
  padding:4px 9px;
  border-radius:999px;
  font-size:10px;
  font-weight:900;
  letter-spacing:.4px;
  text-transform:uppercase;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.05);
  color:#fff;
}

.menu-membership-badge.neutral{
  background:rgba(255,255,255,.06);
}

.menu-membership-badge.active{
  background:rgba(139,211,255,.14);
  border-color:rgba(139,211,255,.18);
  color:#dff1ff;
}

.menu-membership-badge.warning{
  background:rgba(245,158,11,.14);
  border-color:rgba(245,158,11,.20);
  color:#ffe2b3;
}

.menu-membership-badge.expired{
  background:rgba(239,68,68,.12);
  border-color:rgba(239,68,68,.18);
  color:#ffd1d1;
}

.menu-membership-main{
  font-size:15px;
  font-weight:900;
  color:#fff;
  line-height:1.25;
}

.menu-membership-sub{
  margin-top:5px;
  font-size:12px;
  font-weight:700;
  color:rgba(255,255,255,.62);
  line-height:1.45;
}

.menu-membership-pills{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:10px;
}

.menu-membership-pill{
  display:inline-flex;
  align-items:center;
  min-height:28px;
  padding:6px 9px;
  border-radius:999px;
  font-size:11px;
  font-weight:800;
  color:#e9efff;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.08);
}

.menu-membership-btn{
  width:100%;
  margin-top:12px;
  min-height:42px;
  border:none;
  border-radius:14px;
  background:linear-gradient(135deg, var(--trendyol-orange) 0%, var(--trendyol-orange-dark) 100%);
  color:#fff;
  font-size:13px;
  font-weight:900;
  cursor:pointer;
  box-shadow:0 10px 24px rgba(242,122,26,.18);
}

.menu-membership-btn.hidden{
  display:none;
}

.menu-nav{
  display:flex;
  flex-direction:column;
  gap:7px;
  overflow:auto;
  padding-right:2px;
  scrollbar-width:none;
  -ms-overflow-style:none;
}

.menu-nav::-webkit-scrollbar{
  width:0;
  height:0;
  display:none;
}

.menu-nav a,
.menu-action{
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
  transition:transform .18s ease, filter .18s ease, border-color .18s ease, box-shadow .18s ease;
}

.menu-nav a:hover,
.menu-nav a:active,
.menu-action:hover,
.menu-action:active{
  background:linear-gradient(180deg, rgba(139,211,255,.12), rgba(124,92,255,.10));
}

.menu-link-jeton{
  color:#fffaf2 !important;
  background:linear-gradient(135deg, var(--trendyol-orange) 0%, var(--trendyol-orange-dark) 100%) !important;
  border:1px solid rgba(255,173,96,.34) !important;
  box-shadow:0 10px 24px rgba(242,122,26,.22), inset 0 1px 0 rgba(255,255,255,.08);
}

.menu-link-jeton:hover,
.menu-link-jeton:active{
  filter:brightness(1.06);
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
let __membershipLoadRunning = false;

export function mountShell(options = {}) {
  document.documentElement.style.backgroundColor = "#05070f";

  if (!document.getElementById("shellOverlay")) {
    document.body.insertAdjacentHTML("afterbegin", LOADING_OVERLAY_HTML);
  }

  if (!document.getElementById("italkyShellStyle")) {
    const st = document.createElement("style");
    st.id = "italkyShellStyle";
    st.textContent = SHELL_CSS;
    document.head.prepend(st);
  }

  const content = document.getElementById("pageContent");
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
  if (main) {
    main.style.overflow = (options?.scroll === "none") ? "hidden" : "auto";
  }

  requestAnimationFrame(() => {
    document.body.classList.add("ui-ready");
    hydrateFromCache();
    syncFooterHeight();
    hydrateMembershipCard();
    hydrateAdminButton();

    try {
      if (!__shellAutoTranslateInstalled) {
        installAutoTranslate(document.body);
        __shellAutoTranslateInstalled = true;
      }
    } catch (e) {
      console.warn("[system lang install]", e);
    }

    setTimeout(removeOverlaySoon, 100);
  });
}

function bindMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const headerSettingsBtn = document.getElementById("headerSettingsBtn");
  const sideMenu = document.getElementById("sideMenu");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const menuProfileTop = document.getElementById("menuProfileTop");
  const menuAvatarClick = document.getElementById("menuAvatarClick");
  const menuJetonInfoLink = document.getElementById("menuJetonInfoLink");
  const menuMembershipBtn = document.getElementById("menuMembershipBtn");
  const adminPanelLink = document.getElementById("adminPanelLink");

  if (!menuBtn || !sideMenu) return;
  if (menuBtn.dataset.bound === "1") return;

  const openMenu = () => {
    sideMenu.classList.add("open");
    sideMenu.setAttribute("aria-hidden", "false");
    document.body.classList.add("ui-menu-open");
    hydrateMembershipCard();
    hydrateAdminButton();
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

  const goUpgrade = () => {
    closeMenu();
    location.href = "/pages/upgrade_pack.html";
  };

  menuBtn.addEventListener("click", openMenu);
  menuBackdrop?.addEventListener("click", closeMenu);
  headerSettingsBtn?.addEventListener("click", goSettings);

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

  menuMembershipBtn?.addEventListener("click", goUpgrade);

  adminPanelLink?.addEventListener("click", () => {
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
    const pic = u?.picture || u?.avatar || "";
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

async function hydrateMembershipCard() {
  if (__membershipLoadRunning) return;
  __membershipLoadRunning = true;

  const card = document.getElementById("menuMembershipCard");
  const badge = document.getElementById("menuMembershipBadge");
  const main = document.getElementById("menuMembershipMain");
  const sub = document.getElementById("menuMembershipSub");
  const sourcePill = document.getElementById("menuMembershipSourcePill");
  const daysPill = document.getElementById("menuMembershipDaysPill");
  const btn = document.getElementById("menuMembershipBtn");

  if (!card || !badge || !main || !sub || !sourcePill || !daysPill || !btn) {
    __membershipLoadRunning = false;
    return;
  }

  setMembershipUi({
    cardClass: "neutral",
    badgeClass: "neutral",
    badgeText: "Yükleniyor",
    mainText: "Bilgi alınıyor...",
    subText: "Lütfen bekleyin",
    sourceText: "Kaynak: -",
    daysText: "Kalan: -",
    showButton: false
  });

  try {
    const mod = await import("/js/global_access.js");
    const state = await mod.getGlobalAccessState();

    if (!state) {
      setMembershipUi({
        cardClass: "expired",
        badgeClass: "expired",
        badgeText: "Paket Yok",
        mainText: "Aktif üyelik bulunamadı",
        subText: "Üyeliğini başlatmak için paket seçebilirsin.",
        sourceText: "Kaynak: -",
        daysText: "Kalan: 0 gün",
        showButton: true
      });
      return;
    }

    const packageActive = isPackageActuallyActive(state);
    const trialActive = isTrialActuallyActive(state);
    const trialDays = getTrialDaysLeft(state);

    if (packageActive) {
      const code = String(state.selected_package_code || state.package_code || "-").trim();
      const sourceType = resolveSourceType(state);
      const remainingDays = getPackageDaysLeft(state);
      const niceName = packageDisplayName(code, sourceType);

      setMembershipUi({
        cardClass: remainingDays <= 7 ? "warning" : "active",
        badgeClass: remainingDays <= 7 ? "warning" : "active",
        badgeText: remainingDays <= 7 ? "Az Kaldı" : "Aktif",
        mainText: niceName,
        subText: remainingDays > 0
          ? `Üyeliğin aktif. Bitişe ${remainingDays} gün kaldı.`
          : "Üyeliğin aktif görünüyor.",
        sourceText: `Kaynak: ${sourceLabel(sourceType)}`,
        daysText: `Kalan: ${Math.max(remainingDays, 0)} gün`,
        showButton: false
      });
      return;
    }

    if (trialActive) {
      setMembershipUi({
        cardClass: trialDays <= 3 ? "warning" : "active",
        badgeClass: trialDays <= 3 ? "warning" : "active",
        badgeText: "Deneme",
        mainText: "Ücretsiz deneme aktif",
        subText: `Deneme süren devam ediyor. Süre dolmadan paket seçebilirsin.`,
        sourceText: "Kaynak: Deneme",
        daysText: `Kalan: ${trialDays} gün`,
        showButton: true
      });
      return;
    }

    setMembershipUi({
      cardClass: "expired",
      badgeClass: "expired",
      badgeText: "Süre Doldu",
      mainText: "Aktif üyelik yok",
      subText: "Devam etmek için paket seçmelisin.",
      sourceText: "Kaynak: -",
      daysText: "Kalan: 0 gün",
      showButton: true
    });
  } catch (e) {
    console.warn("[ui_shell membership]", e);
    setMembershipUi({
      cardClass: "neutral",
      badgeClass: "neutral",
      badgeText: "Bilinmiyor",
      mainText: "Üyelik bilgisi alınamadı",
      subText: "Bağlantı tekrar kurulduğunda bilgi güncellenecek.",
      sourceText: "Kaynak: -",
      daysText: "Kalan: -",
      showButton: true
    });
  } finally {
    __membershipLoadRunning = false;
  }
}

async function hydrateAdminButton() {
  const adminLink = document.getElementById("adminPanelLink");
  if (!adminLink) return;

  // Varsayılan: HER ZAMAN gizli başla
  adminLink.classList.add("hidden");
  adminLink.style.display = "none";

  try {
    const { supabase } = await import("/js/supabase_client.js");
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("role,is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return;

    const role = String(data.role || "").toLowerCase().trim();
    const allowed =
      data.is_admin === true ||
      role === "admin" ||
      role === "superadmin";

    if (allowed) {
      adminLink.classList.remove("hidden");
      adminLink.style.display = "";
    } else {
      adminLink.classList.add("hidden");
      adminLink.style.display = "none";
    }
  } catch (e) {
    console.warn("[ui_shell admin btn]", e);
    adminLink.classList.add("hidden");
    adminLink.style.display = "none";
  }
}
function setMembershipUi({
  cardClass = "neutral",
  badgeClass = "neutral",
  badgeText = "",
  mainText = "",
  subText = "",
  sourceText = "",
  daysText = "",
  showButton = false
}) {
  const card = document.getElementById("menuMembershipCard");
  const badge = document.getElementById("menuMembershipBadge");
  const main = document.getElementById("menuMembershipMain");
  const sub = document.getElementById("menuMembershipSub");
  const sourcePill = document.getElementById("menuMembershipSourcePill");
  const daysPill = document.getElementById("menuMembershipDaysPill");
  const btn = document.getElementById("menuMembershipBtn");

  if (card) {
    card.classList.remove("state-active", "state-warning", "state-expired");
    if (cardClass === "active") card.classList.add("state-active");
    if (cardClass === "warning") card.classList.add("state-warning");
    if (cardClass === "expired") card.classList.add("state-expired");
  }

  if (badge) {
    badge.classList.remove("neutral", "active", "warning", "expired");
    badge.classList.add(badgeClass || "neutral");
    badge.textContent = badgeText || "";
  }

  if (main) main.textContent = mainText || "";
  if (sub) sub.textContent = subText || "";
  if (sourcePill) sourcePill.textContent = sourceText || "";
  if (daysPill) daysPill.textContent = daysText || "";

  if (btn) {
    btn.classList.toggle("hidden", !showButton);
  }
}

function isPackageActuallyActive(state) {
  if (!state) return false;
  if (state.package_active !== true) return false;
  if (!state.package_ends_at) return true;
  return new Date(state.package_ends_at).getTime() > Date.now();
}

function isTrialActuallyActive(state) {
  if (!state?.trial_ends_at) return false;
  return new Date(state.trial_ends_at).getTime() > Date.now();
}

function getTrialDaysLeft(state) {
  if (!state) return 0;
  if (typeof state.trial_days_left === "number") {
    return Math.max(0, state.trial_days_left);
  }
  if (!state.trial_ends_at) return 0;
  const diff = new Date(state.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getPackageDaysLeft(state) {
  if (!state?.package_ends_at) return 0;
  const diff = new Date(state.package_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function resolveSourceType(state) {
  const raw = String(state?.source_type || "").trim().toLowerCase();
  if (raw) return raw;

  const pkg = String(state?.selected_package_code || state?.package_code || "").trim().toLowerCase();
  if (pkg.startsWith("pkg_")) return "nfc_qr";
  if (pkg.startsWith("premium_") || pkg.startsWith("edu_") || pkg.startsWith("translate_")) return "playstore";
  return "playstore";
}

function sourceLabel(type) {
  if (type === "nfc_qr") return "NFC / QR";
  if (type === "playstore") return "Play Store";
  if (type === "manual") return "Manuel";
  return "-";
}

function packageDisplayName(code, sourceType) {
  const c = String(code || "").trim().toLowerCase();

  if (sourceType === "nfc_qr") return "Kartlı Erişim";
  if (c === "premium_999") return "Premium Üyelik";
  if (c === "translate_699") return "Cebinizdeki Tercüman";
  if (c === "edu_699") return "Online Dil Eğitim Asistanı";
  if (c === "premium") return "Premium Üyelik";
  if (c === "translate") return "Çeviri Paketi";
  if (c === "education" || c === "egitim" || c === "edu") return "Eğitim Paketi";
  return code || "Aktif Üyelik";
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

export function refreshShellMembership() {
  hydrateMembershipCard();
}
