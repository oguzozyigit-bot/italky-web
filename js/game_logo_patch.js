// FILE: /js/game_logo_patch.js
// Ortak görünüm düzeltmeleri: logo, BE FREE temizliği, alt bar, hamburger menü ve jeton market.
// Çalışan modül fonksiyonlarına dokunmaz; sadece DOM/CSS katmanını standartlaştırır.

const GAME_LOGO_SRC = "https://www.icany.ai/brand/italkyai-logo-clear.png";
const HOME_HREF = "https://italky.ai/hosgeldiniz";
const STANDARD_SIGNATURE = "by Ozyigit's 2026";
const STANDARD_RUNE = "𐰆𐰍𐰔 𐰇𐰔𐰘𐰃𐰏𐱅";

const BRAND_PATCH_PATHS = new Set([
  "/pages/game_menu.html",
  "/pages/hangman.html",
  "/pages/word_cracker.html",
  "/pages/gap_master.html",
  "/pages/glitch.html",
  "/pages/signal_hunt.html",
  "/pages/hangman_ios.html",
  "/pages/word_cracker_ios.html",
  "/pages/gap_master_ios.html",
  "/pages/glitch_ios.html",
  "/pages/signal_hunt_ios.html",
  "/pages/level_test_hub.html",
  "/pages/conference.html"
]);

const TOKEN_PRODUCTS = {
  jeton_20: { amount: "25 Jeton", price: "0,99 USD", bonus: "Başlangıç paketi" },
  jeton_50: { amount: "50 Jeton", price: "1,49 USD", bonus: "Günlük kullanım için ideal" },
  jeton_100: { amount: "100 Jeton", price: "2,29 USD", bonus: "En popüler paket" },
  jeton_500: { amount: "500 Jeton", price: "9,99 USD", bonus: "Yoğun kullanım paketi" }
};

const MENU_ITEMS = [
  { label: "Anasayfa", href: HOME_HREF, icon: "⌂" },
  { label: "Jeton Yükle", href: "/pages/jetonbuy.html", icon: "+" },
  { label: "Jeton Hareketleri", href: "/pages/wallet_history.html", icon: "↕" },
  { label: "Fiyatlandırma", href: "/pages/plan_select.html", icon: "$" },
  { label: "Hakkımızda", href: "/pages/about.html", icon: "i" },
  { label: "Özellikler", href: "/pages/features.html", icon: "◆" },
  { label: "Gizlilik", href: "/pages/privacy.html", icon: "◌" },
  { label: "İletişim", href: "/pages/contact.html", icon: "@" },
  { label: "Müzik Hakları", href: "/music-showcase/", icon: "♫" },
  { label: "Güvenli Çıkış", action: "logout", icon: "⇥", danger: true },
  { label: "Hesabımı Sil", href: "/pages/delete-account.html", icon: "×", danger: true }
];

function currentPath() {
  try {
    return String(location.pathname || "").replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function isBrandPatchedPath() {
  return BRAND_PATCH_PATHS.has(currentPath());
}

function ensureLogoStyle() {
  if (document.getElementById("italkyUnifiedUiPatchStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyUnifiedUiPatchStyle";
  style.textContent = `
    body.italky-game-brand-patched .brand-group::after,
    body.italky-game-brand-patched .menu-brand-sub,
    body.italky-game-brand-patched [data-italky-be-free],
    body.italky-game-brand-patched .brand-sub,
    body.italky-game-brand-patched .logo-subtitle,
    body.italky-smart-menu-ready .menu-brand-sub,
    body.italky-smart-menu-ready .brand-group::after{
      content:none!important;
      display:none!important;
      visibility:hidden!important;
      width:0!important;
      height:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
    }
    .italky-game-logo-img,
    .italky-smart-menu-logo{
      display:block!important;
      width:132px!important;
      max-width:38vw!important;
      height:auto!important;
      max-height:58px!important;
      object-fit:contain!important;
      background:transparent!important;
      border:0!important;
      box-shadow:none!important;
      filter:none!important;
    }
    .menu-brandblock .italky-game-logo-img,
    .menu-user-meta .italky-game-logo-img{
      width:118px!important;
      max-width:100%!important;
      max-height:50px!important;
    }
    .gate-logo.italky-game-logo-ready{
      width:156px!important;
      height:auto!important;
      min-height:60px!important;
      margin:0 auto 10px!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      background:transparent!important;
      border:0!important;
      box-shadow:none!important;
      font-size:0!important;
    }
    .gate-logo.italky-game-logo-ready .italky-game-logo-img{
      width:156px!important;
      max-width:62vw!important;
      max-height:70px!important;
    }
    body.italky-game-brand-patched .premium-footer,
    body.italky-game-brand-patched .site-footer,
    body.italky-game-brand-patched footer.footer,
    body.italky-game-brand-patched .italky-game-standard-footer{
      position:fixed!important;
      left:0!important;
      right:0!important;
      bottom:0!important;
      z-index:214748200!important;
      min-height:66px!important;
      height:calc(66px + env(safe-area-inset-bottom,0px))!important;
      padding:7px 12px calc(7px + env(safe-area-inset-bottom,0px))!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      gap:5px!important;
      overflow:hidden!important;
      border-top:1px solid rgba(78,210,217,.24)!important;
      background:#06111d!important;
      backdrop-filter:blur(16px)!important;
      -webkit-backdrop-filter:blur(16px)!important;
      box-shadow:none!important;
      color:#f6fbff!important;
      text-align:center!important;
      pointer-events:auto!important;
    }
    body.italky-game-brand-patched .italky-game-footer-links{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:16px!important;
      min-height:18px!important;
      white-space:nowrap!important;
      flex-wrap:nowrap!important;
    }
    body.italky-game-brand-patched .italky-game-footer-links a{
      color:#aebdcc!important;
      text-decoration:none!important;
      font-size:11px!important;
      line-height:1!important;
      font-weight:800!important;
      letter-spacing:0!important;
      text-shadow:none!important;
      -webkit-text-fill-color:currentColor!important;
    }
    body.italky-game-brand-patched .italky-game-footer-signature{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:5px!important;
      min-height:14px!important;
      max-width:100%!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      color:#91a4b8!important;
      font-size:10px!important;
      line-height:1.15!important;
      font-weight:900!important;
      letter-spacing:0!important;
      text-align:center!important;
      text-shadow:none!important;
      -webkit-text-fill-color:currentColor!important;
    }
    body.italky-game-brand-patched .italky-game-footer-rune{
      display:inline!important;
      margin-left:2px!important;
      color:#36d4ce!important;
      font-family:"Segoe UI Historic","Noto Sans Old Turkic",serif!important;
      font-size:10px!important;
      line-height:1!important;
      font-weight:900!important;
      direction:rtl!important;
      unicode-bidi:isolate!important;
      vertical-align:baseline!important;
      -webkit-text-fill-color:currentColor!important;
    }
    body.italky-game-brand-patched .site-footer-corp,
    body.italky-game-brand-patched .corp,
    body.italky-game-brand-patched a[href*="audience=corporate"]{
      display:none!important;
    }
    body.italky-game-brand-patched .italky-global-footer:not(.italky-game-standard-footer){display:none!important;}

    body.italky-smart-menu-ready .side-menu .menu-panel{
      width:min(92vw,370px)!important;
      padding:calc(16px + env(safe-area-inset-top,0px)) 14px calc(18px + env(safe-area-inset-bottom,0px))!important;
      gap:12px!important;
      background:
        radial-gradient(circle at 14% 0%,rgba(53,213,208,.18),transparent 34%),
        linear-gradient(180deg,rgba(7,19,31,.99),rgba(4,12,22,.99))!important;
      border-left:1px solid rgba(53,213,208,.20)!important;
      box-shadow:-24px 0 70px rgba(0,0,0,.48)!important;
      overflow-y:auto!important;
    }
    .italky-menu-logo-row{
      width:100%;
      min-height:54px;
      display:flex;
      align-items:center;
      justify-content:flex-start;
      padding:2px 4px 4px;
      cursor:pointer;
    }
    .italky-menu-logo-row .italky-smart-menu-logo{width:126px!important;max-width:62%!important;max-height:54px!important;}
    body.italky-smart-menu-ready .menu-user-card.italky-smart-menu-profile{
      min-height:118px!important;
      padding:14px!important;
      border-radius:24px!important;
      display:grid!important;
      grid-template-columns:64px 1fr!important;
      align-items:center!important;
      gap:14px!important;
      background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.032))!important;
      border:1px solid rgba(53,213,208,.18)!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 18px 44px rgba(0,0,0,.22)!important;
    }
    .italky-smart-avatar{
      width:64px;height:64px;border-radius:22px;overflow:hidden;
      border:1px solid rgba(53,213,208,.28);
      background:linear-gradient(135deg,rgba(53,213,208,.22),rgba(15,23,42,.92));
      display:grid;place-items:center;cursor:pointer;flex:0 0 auto;
    }
    .italky-smart-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
    .italky-menu-mail{font-size:12px;font-weight:900;color:#f6fbff;line-height:1.25;word-break:break-all;}
    .italky-menu-name{font-size:15px;font-weight:1000;color:#fff;line-height:1.1;margin-bottom:4px;}
    .italky-menu-token-pill{
      margin-top:8px;display:inline-flex;align-items:center;justify-content:center;gap:7px;
      min-height:30px;padding:6px 11px;border-radius:999px;
      background:rgba(53,213,208,.12);border:1px solid rgba(53,213,208,.28);
      color:#bafffb;font-size:12px;font-weight:1000;white-space:nowrap;width:max-content;max-width:100%;
    }
    body.italky-smart-menu-ready .menu-nav.italky-smart-menu-nav{
      display:grid!important;
      gap:8px!important;
      overflow:visible!important;
      padding:0!important;
      flex:0 0 auto!important;
    }
    .italky-smart-menu-nav .italky-menu-item{
      width:100%;min-height:45px;border-radius:16px;
      display:flex;align-items:center;gap:11px;padding:0 13px;
      background:linear-gradient(180deg,rgba(255,255,255,.058),rgba(255,255,255,.026));
      border:1px solid rgba(255,255,255,.075);
      color:#f6fbff;text-decoration:none;text-align:left;
      font-size:13px;font-weight:900;line-height:1;letter-spacing:0;
      font-family:Outfit,Manrope,Arial,sans-serif;cursor:pointer;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
    }
    .italky-smart-menu-nav .italky-menu-item:active{transform:scale(.988);}
    .italky-smart-menu-nav .italky-menu-item.danger{color:#fecaca;border-color:rgba(248,113,113,.18);}
    .italky-menu-icon{
      width:26px;height:26px;border-radius:10px;display:grid;place-items:center;flex:0 0 auto;
      background:rgba(53,213,208,.11);border:1px solid rgba(53,213,208,.18);
      color:#84fff7;font-size:13px;font-weight:1000;
    }
    .italky-smart-menu-nav .italky-menu-item.danger .italky-menu-icon{background:rgba(248,113,113,.10);border-color:rgba(248,113,113,.16);color:#fecaca;}
    .italky-token-day-note{
      margin:4px 2px 0;padding:11px 12px;border-radius:18px;
      background:rgba(53,213,208,.08);border:1px solid rgba(53,213,208,.16);
      color:#b9c8d7;font-size:11px;font-weight:800;line-height:1.45;text-align:center;
    }
    @media(max-width:700px){
      .italky-game-logo-img{width:104px!important;max-height:50px!important;}
      .gate-logo.italky-game-logo-ready .italky-game-logo-img{width:136px!important;}
      body.italky-game-brand-patched .italky-game-footer-links{gap:10px!important;}
      body.italky-game-brand-patched .italky-game-footer-links a{font-size:9px!important;}
      body.italky-game-brand-patched .italky-game-footer-signature,
      body.italky-game-brand-patched .italky-game-footer-rune{font-size:8px!important;}
      body.italky-smart-menu-ready .side-menu .menu-panel{width:min(94vw,360px)!important;}
      .italky-smart-menu-nav .italky-menu-item{min-height:43px;font-size:12px;}
    }
  `;
  document.head.appendChild(style);
}

function logoImg(extraClass = "") {
  return `<img class="italky-game-logo-img ${extraClass}" src="${GAME_LOGO_SRC}" alt="italkyAI" data-no-translate="1">`;
}

function standardFooterHtml() {
  return `
    <nav class="italky-game-footer-links" aria-label="Alt menü">
      <a href="/pages/about.html">Hakkımızda</a>
      <a href="/pages/features.html">Özellikler</a>
      <a href="/pages/privacy.html">Gizlilik</a>
      <a href="/pages/contact.html">İletişim</a>
    </nav>
    <div class="italky-game-footer-signature" data-no-translate="1">
      ${STANDARD_SIGNATURE}<span class="italky-game-footer-rune" lang="otk" dir="rtl">${STANDARD_RUNE}</span>
    </div>`;
}

function killBeFreeText() {
  document.querySelectorAll(".menu-brand-sub,.brand-sub,.logo-subtitle").forEach((el) => {
    if (el.dataset.italkyBeFree === "1") return;
    el.textContent = "";
    el.setAttribute("data-italky-be-free", "1");
  });

  document.querySelectorAll("body *").forEach((el) => {
    if (!el || el.children?.length || el.dataset.italkyBeFree === "1") return;
    const txt = String(el.textContent || "").trim().toUpperCase();
    if (txt === "BE FREE" || txt === "SPEAK · LISTEN · CREATE") {
      el.textContent = "";
      el.setAttribute("data-italky-be-free", "1");
    }
  });
}

function patchLogos() {
  ensureLogoStyle();
  document.body?.classList?.add("italky-game-brand-patched");

  document.querySelectorAll("#brandHome.brand-group").forEach((brand) => {
    if (!brand.querySelector(".italky-game-logo-img")) brand.innerHTML = logoImg();
    brand.setAttribute("aria-label", "italkyAI Ana Sayfa");
    brand.setAttribute("role", "link");
    if (brand.dataset.italkyLogoClickPatched !== "1") {
      brand.dataset.italkyLogoClickPatched = "1";
      brand.addEventListener("click", () => { location.href = HOME_HREF; });
    }
  });

  document.querySelectorAll(".menu-brandblock").forEach((block) => {
    if (!block.querySelector(".italky-game-logo-img")) block.innerHTML = logoImg("menu-logo");
  });

  document.querySelectorAll(".brand-link img.logo,.brand-link img.brand-logo,header .logo,header .brand-logo").forEach((img) => {
    if (img.dataset.italkyGameLogoPatched !== "1") {
      img.src = GAME_LOGO_SRC;
      img.alt = "italkyAI";
      img.dataset.italkyGameLogoPatched = "1";
    }
  });

  document.querySelectorAll(".brand-link,header a.logo-link,header a[aria-label*='Ana']").forEach((link) => {
    try {
      if (link.querySelector?.("img")) link.setAttribute("href", HOME_HREF);
    } catch {}
  });

  const gateLogo = document.querySelector(".gate-logo");
  if (gateLogo && !gateLogo.querySelector(".italky-game-logo-img")) {
    gateLogo.innerHTML = logoImg();
    gateLogo.classList.add("italky-game-logo-ready");
  }

  killBeFreeText();
}

function patchFooter() {
  ensureLogoStyle();
  document.body?.classList?.add("italky-game-brand-patched");

  let footer = document.querySelector("#italkyFooter.premium-footer")
    || document.querySelector("footer.site-footer")
    || document.querySelector("footer.footer")
    || document.querySelector(".italky-game-standard-footer");

  if (!footer) {
    footer = document.createElement("footer");
    document.body.appendChild(footer);
  }

  footer.classList.add("italky-game-standard-footer");
  footer.setAttribute("data-no-translate", "1");

  if (footer.dataset.italkyStandardFooter !== "1") {
    footer.innerHTML = standardFooterHtml();
    footer.dataset.italkyStandardFooter = "1";
  }

  try {
    document.documentElement.style.setProperty("--footerH", `${footer.offsetHeight || 66}px`);
    document.documentElement.style.setProperty("--foot", "66px");
  } catch {}
}

function readJsonStorage(keys) {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }
  return {};
}

function avatarFallback(nameOrEmail = "AI") {
  const clean = String(nameOrEmail || "AI").trim();
  const base = clean.replace(/@.*/, "").split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = (base.length ? base.map(x => x[0]).join("") : clean.slice(0, 2)).toUpperCase() || "AI";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#35d5d0"/><stop offset="1" stop-color="#0f6f8f"/></linearGradient></defs><rect width="96" height="96" rx="28" fill="url(#g)"/><text x="48" y="58" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="900" fill="#06111d">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function closeMenu() {
  try {
    document.getElementById("sideMenu")?.classList.remove("open");
    document.getElementById("sideMenu")?.setAttribute("aria-hidden", "true");
    document.body?.classList?.remove("ui-menu-open", "italky-shell-menu-open");
  } catch {}
}

async function safeLogout() {
  try {
    const sb = window.supabase;
    if (sb?.auth?.signOut) await sb.auth.signOut();
  } catch {}
  try {
    localStorage.removeItem("italky_supabase_session_backup");
    localStorage.removeItem("italky_user");
  } catch {}
  location.href = HOME_HREF;
}

function menuItemHtml(item) {
  const cls = `italky-menu-item${item.danger ? " danger" : ""}`;
  const action = item.action ? `data-action="${item.action}"` : "";
  const href = item.href ? `href="${item.href}"` : "href="#"";
  return `<a class="${cls}" ${href} ${action}><span class="italky-menu-icon" data-no-translate="1">${item.icon}</span><span>${item.label}</span></a>`;
}

function patchMenuSkeleton() {
  const panel = document.querySelector("#sideMenu .menu-panel");
  if (!panel) return false;
  ensureLogoStyle();
  document.body?.classList?.add("italky-smart-menu-ready");

  let logoRow = panel.querySelector(".italky-menu-logo-row");
  if (!logoRow) {
    logoRow = document.createElement("div");
    logoRow.className = "italky-menu-logo-row";
    panel.insertBefore(logoRow, panel.firstChild);
  }
  if (!logoRow.querySelector("img")) {
    logoRow.innerHTML = `<img class="italky-smart-menu-logo" src="${GAME_LOGO_SRC}" alt="italkyAI" data-no-translate="1">`;
  }
  if (logoRow.dataset.bound !== "1") {
    logoRow.dataset.bound = "1";
    logoRow.addEventListener("click", () => { location.href = HOME_HREF; });
  }

  const profile = document.getElementById("menuProfileTop");
  if (profile) {
    profile.classList.add("italky-smart-menu-profile");
    if (profile.dataset.italkySmartProfile !== "1") {
      profile.dataset.italkySmartProfile = "1";
      profile.innerHTML = `
        <div class="italky-smart-avatar" id="menuAvatarClick"><img src="" id="menuUserPic" alt="Profil"></div>
        <div class="italky-smart-user-meta">
          <div class="italky-menu-name" id="menuUserName">Kullanıcı</div>
          <div class="italky-menu-mail" id="italkyMenuEmail">-</div>
          <div id="menuLoginDate" style="display:none"></div>
          <div class="italky-menu-token-pill"><span>Jeton</span><strong id="italkyMenuTokenCount">0</strong></div>
        </div>`;
      profile.addEventListener("click", () => { location.href = "/pages/profile.html"; });
    }
  }

  const nav = panel.querySelector(".menu-nav");
  if (nav) {
    nav.classList.add("italky-smart-menu-nav");
    if (nav.dataset.italkySmartNav !== "1") {
      nav.dataset.italkySmartNav = "1";
      nav.innerHTML = MENU_ITEMS.map(menuItemHtml).join("");
      nav.querySelectorAll(".italky-menu-item").forEach((item) => {
        item.addEventListener("click", (event) => {
          const action = item.getAttribute("data-action") || "";
          if (action === "logout") {
            event.preventDefault();
            closeMenu();
            safeLogout();
            return;
          }
          closeMenu();
        });
      });
    }
  }

  return true;
}

async function hydrateMenuData() {
  const picEl = document.getElementById("menuUserPic");
  const emailEl = document.getElementById("italkyMenuEmail");
  const nameEl = document.getElementById("menuUserName");
  const tokenEl = document.getElementById("italkyMenuTokenCount");
  if (!picEl && !emailEl && !tokenEl) return;

  const cached = readJsonStorage(["italky_user_cache", "italky_user", "user", "auth_user", "italky_auth_user"]);
  const access = window.__ITALKY_ACCESS__ || {};
  let email = access.email || cached.email || cached.user?.email || cached.user_metadata?.email || "";
  let name = access.full_name || access.display_name || cached.full_name || cached.name || cached.display_name || cached.user_metadata?.full_name || cached.user_metadata?.name || email || "Kullanıcı";
  let pic = access.avatar_url || access.picture || cached.avatar_url || cached.avatar || cached.picture || cached.user_metadata?.avatar_url || cached.user_metadata?.picture || "";
  let tokens = Number(access.tokens ?? cached.tokens ?? cached.jetons ?? cached.user_metadata?.tokens ?? 0) || 0;

  try {
    const sb = window.supabase;
    if (sb?.auth?.getSession) {
      const { data: { session } } = await sb.auth.getSession();
      const user = session?.user || null;
      const meta = user?.user_metadata || {};
      email = user?.email || email;
      name = meta.full_name || meta.name || name || email || "Kullanıcı";
      pic = meta.avatar_url || meta.picture || meta.avatar || pic;
      if (user?.id && sb.from) {
        const { data } = await sb
          .from("profiles")
          .select("email,full_name,display_name,avatar_url,tokens")
          .eq("id", user.id)
          .maybeSingle();
        if (data) {
          email = data.email || email;
          name = data.full_name || data.display_name || name;
          pic = data.avatar_url || pic;
          tokens = Number(data.tokens ?? tokens) || 0;
        }
      }
    }
  } catch {}

  if (nameEl) nameEl.textContent = name || "Kullanıcı";
  if (emailEl) emailEl.textContent = email || "E-posta bulunamadı";
  if (tokenEl) tokenEl.textContent = String(tokens);
  if (picEl) {
    picEl.referrerPolicy = "no-referrer";
    picEl.onerror = () => { picEl.src = avatarFallback(name || email); };
    picEl.src = pic || avatarFallback(name || email);
  }
}

function patchMenu() {
  const ok = patchMenuSkeleton();
  if (!ok) return;
  hydrateMenuData();
}

function patchJetonMarketProducts() {
  if (currentPath() !== "/pages/jetonbuy.html") return;
  ensureLogoStyle();

  document.querySelectorAll('.pkg[onclick*="jeton_10"], .pkg[onclick*="jeton_250"]').forEach((el) => el.remove());

  Object.entries(TOKEN_PRODUCTS).forEach(([productId, meta]) => {
    const card = document.querySelector(`.pkg[onclick*="${productId}"]`);
    if (!card) return;
    const amount = card.querySelector(".amt");
    const price = card.querySelector(".price");
    const bonus = card.querySelector(".bonus");
    if (amount) amount.textContent = meta.amount;
    if (price) price.textContent = meta.price;
    if (bonus) bonus.textContent = meta.bonus;
    card.setAttribute("data-google-product", productId);
  });

  const headText = document.querySelector(".head p");
  if (headText) headText.textContent = "Jeton satın alma işlemini Google Play hesabınızla tamamlayabilirsiniz.";

  if (!document.getElementById("italkyTokenDayNote")) {
    const note = document.createElement("div");
    note.id = "italkyTokenDayNote";
    note.className = "italky-token-day-note";
    note.textContent = "Günü olmayan kullanıcıda ilk girişte 6 jeton düşer ve 24 saat kullanım açılır. Sonraki 24 saatlik kullanımlar 5 jetondur.";
    const balance = document.querySelector(".balanceCard");
    balance?.insertAdjacentElement("afterend", note);
  }
}

function patchBrandPage() {
  if (!isBrandPatchedPath()) return;
  patchLogos();
  patchFooter();
}

function patchAll() {
  patchBrandPage();
  patchMenu();
  patchJetonMarketProducts();
}

function boot() {
  patchAll();
  const observer = new MutationObserver(() => patchAll());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(patchAll, 80);
  setTimeout(patchAll, 250);
  setTimeout(patchAll, 700);
  setTimeout(patchAll, 1600);
  setTimeout(patchAll, 2600);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

window.addEventListener("focus", () => setTimeout(hydrateMenuData, 120));
window.addEventListener("italkyAccessReady", () => setTimeout(hydrateMenuData, 120));
