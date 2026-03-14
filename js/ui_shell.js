// FILE: /js/ui_shell.js

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

  <button class="menu-btn" id="menuBtn" aria-label="Menü" type="button">
    <span></span><span></span><span></span>
  </button>
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
    </div>

    <nav class="menu-nav">
      <a href="/pages/academy.html" class="menu-link-academy" data-i18n="menu_academy">italkyACADEMY</a>
      <a href="/pages/text_translate.html" class="menu-link-text" data-i18n="menu_text_to_text">TextToText</a>
      <a href="/pages/jetonbuy.html" class="menu-link-jeton" data-i18n="menu_token_market">Jeton Market</a>

      <a href="/pages/profile.html" data-i18n="menu_profile">Profil</a>
      <a href="/pages/voice_profile.html" data-i18n="menu_create_voice">Kendi Sesini Oluştur</a>
      <a href="/pages/translation_settings.html" data-i18n="menu_translation_settings">Çeviri Ayarları</a>
      <a href="/pages/qr-change.html" data-i18n="menu_change_qr">QR Değiştir</a>
      <a href="/pages/about.html" data-i18n="menu_about">Hakkımızda</a>
      <a href="/pages/jeton-nedir.html" data-i18n="menu_what_is_token">Jeton Nedir</a>
      <a href="/pages/faq.html" data-i18n="menu_faq">SSS</a>
      <a href="/pages/privacy.html" data-i18n="menu_privacy">Gizlilik</a>
      <a href="/pages/contact.html" data-i18n="menu_contact">İletişim</a>

      <button class="menu-action danger-lite" id="logoutBtn" type="button" data-i18n="menu_logout">Güvenli Çıkış</button>
      <button class="menu-action danger" id="deleteAccountBtn" type="button" data-i18n="menu_delete_account">Hesabımı Sil</button>
    </nav>

    <div class="menu-sign" data-no-translate="1">italkyAI By Ozyigit's • 2026</div>
  </div>
</aside>`;

const HOME_FOOTER_HTML = `
<footer class="premium-footer" id="italkyFooter">
  <div class="signature" data-no-translate="1">italkyAI By Ozyigit's • 2026</div>
</footer>`;

const SHELL_CSS = `
:root{
  --ai-gradient: linear-gradient(135deg,#8bd3ff 0%,#7c5cff 45%,#ff66c4 100%);
  --footerH:0px;
  --shell-text:#f5f7ff;
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

.menu-btn{
  width:44px;
  height:44px;
  border:none;
  border-radius:14px;
  background:linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08);
  box-shadow:0 8px 18px rgba(0,0,0,.24);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:4px;
  cursor:pointer;
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
  font-size:10px;
  font-weight:700;
  letter-spacing:.3px;
  color:rgba(255,255,255,.34);
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
  display:block;
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

.menu-link-academy{
  padding:14px 14px !important;
  font-size:14px !important;
  font-weight:900 !important;
  letter-spacing:.25px !important;
  border-radius:16px !important;
  color:#ffffff !important;
  background:
    linear-gradient(135deg, rgba(103,232,249,.22) 0%, rgba(124,92,255,.28) 45%, rgba(255,102,196,.20) 100%) !important;
  border:1px solid rgba(139,211,255,.28) !important;
  box-shadow:0 10px 24px rgba(124,92,255,.18), inset 0 1px 0 rgba(255,255,255,.06);
}

.menu-link-academy:hover,
.menu-link-academy:active{
  filter:brightness(1.08);
  transform:translateY(-1px);
}

.menu-link-text{
  color:#f8fbff !important;
  background:linear-gradient(135deg, rgba(34,197,94,.18) 0%, rgba(6,182,212,.16) 100%) !important;
  border:1px solid rgba(52,211,153,.22) !important;
}

.menu-link-text:hover,
.menu-link-text:active{
  filter:brightness(1.06);
}

.menu-link-jeton{
  color:#fffaf2 !important;
  background:linear-gradient(135deg, rgba(251,146,60,.28) 0%, rgba(249,115,22,.22) 100%) !important;
  border:1px solid rgba(251,146,60,.30) !important;
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
  padding-top:6px;
  font-size:10px;
  color:rgba(255,255,255,.30);
  text-align:center;
}
`;

let __shellAutoTranslateInstalled = false;
let __shellResizeBound = false;
let __shellEscapeBound = false;

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
  const sideMenu = document.getElementById("sideMenu");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const menuProfileTop = document.getElementById("menuProfileTop");
  const menuAvatarClick = document.getElementById("menuAvatarClick");
  const menuJetonInfoLink = document.getElementById("menuJetonInfoLink");

  if (!menuBtn || !sideMenu) return;
  if (menuBtn.dataset.bound === "1") return;

  const openMenu = () => {
    sideMenu.classList.add("open");
    sideMenu.setAttribute("aria-hidden", "false");
    document.body.classList.add("ui-menu-open");
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

  menuBtn.addEventListener("click", openMenu);
  menuBackdrop?.addEventListener("click", closeMenu);

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
