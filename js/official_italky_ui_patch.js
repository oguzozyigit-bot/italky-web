// FILE: js/official_italky_ui_patch.js
// Central italkyAI UI patch: official logo + unified hamburger menu.

const OFFICIAL_LOGO = "/assets/italkyai-logo-clear.png?v=20260727-vector";
const PERSONAL_HOME = "https://www.icany.ai/hosgeldiniz";

const MENU_ITEMS = [
  { href: PERSONAL_HOME, icon: "⌂", label: "Anasayfa" },
  { href: "/pages/jetonbuy.html", icon: "+", label: "Jeton Yükle" },
  { href: "/pages/wallet_history.html", icon: "↕", label: "Jeton Hareketleri" },
  { href: "/pages/pricing.html", icon: "$", label: "Fiyatlandırma" },
  { href: "/pages/about.html", icon: "i", label: "Hakkımızda" },
  { href: "/pages/features.html", icon: "◆", label: "Özellikler" },
  { href: "/pages/privacy.html", icon: "◌", label: "Gizlilik" },
  { href: "/pages/contact.html", icon: "@", label: "İletişim" },
  { href: "https://www.icany.ai/music-rights", icon: "♫", label: "Müzik Hakları" },
  { button: true, danger: true, icon: "⇥", label: "Güvenli Çıkış", action: "logout" },
  { href: "/pages/delete-account.html", danger: true, icon: "×", label: "Hesabımı Sil" },
];

const FALLBACK_AVATAR = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#0f766e"/><text x="40" y="50" text-anchor="middle" font-family="Arial" font-size="34" font-weight="800" fill="white">i</text></svg>'
);

function injectStyle() {
  if (document.getElementById("officialItalkyUiPatchStyle")) return;
  const style = document.createElement("style");
  style.id = "officialItalkyUiPatchStyle";
  style.textContent = `
    img[src*="italkyai-logo-clear"],
    img[src*="icanyai-logo-clear"],
    img[src*="italkyai-logo"],
    img[src*="italky-logo-official"]{
      object-fit:contain!important;
      object-position:left center!important;
      background:transparent!important;
      border:0!important;
      box-shadow:none!important;
    }
    .logo,.brand-logo{width:154px!important;max-width:42vw!important;height:64px!important;max-height:64px!important;object-fit:contain!important;object-position:left center!important;}
    .drawer-logo,.menu-official-logo{width:132px!important;height:56px!important;object-fit:contain!important;object-position:left center!important;}
    .italky-official-user{margin:10px 0 12px;min-height:104px;padding:13px;border-radius:24px;display:grid;grid-template-columns:64px 1fr;align-items:center;gap:13px;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.032));border:1px solid rgba(53,213,208,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 18px 44px rgba(0,0,0,.22);}
    .italky-official-avatar{width:64px;height:64px;border-radius:22px;overflow:hidden;border:1px solid rgba(53,213,208,.28);background:linear-gradient(135deg,rgba(53,213,208,.22),rgba(15,23,42,.92));display:grid;place-items:center;}
    .italky-official-avatar img{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:0!important;}
    .italky-official-name{font-size:15px;font-weight:1000;color:#fff;line-height:1.1;margin-bottom:4px;}
    .italky-official-mail{font-size:12px;font-weight:900;color:#f6fbff;line-height:1.25;word-break:break-all;}
    .italky-official-token{margin-top:8px;display:inline-flex;align-items:center;gap:7px;min-height:30px;padding:6px 11px;border-radius:999px;background:rgba(53,213,208,.12);border:1px solid rgba(53,213,208,.28);color:#bafffb;font-size:12px;font-weight:1000;white-space:nowrap;}
    .italky-official-nav{display:grid!important;gap:8px!important;margin-top:12px!important;}
    .italky-official-nav a,.italky-official-nav button{width:100%!important;min-height:45px!important;border-radius:16px!important;display:flex!important;align-items:center!important;gap:11px!important;padding:0 13px!important;background:linear-gradient(180deg,rgba(255,255,255,.058),rgba(255,255,255,.026))!important;border:1px solid rgba(255,255,255,.075)!important;color:#f6fbff!important;text-align:left!important;text-decoration:none!important;font-size:13px!important;font-weight:900!important;line-height:1!important;font-family:Manrope,Arial,sans-serif!important;cursor:pointer!important;}
    .italky-official-nav .danger{color:#fecaca!important;border-color:rgba(248,113,113,.18)!important;}
    .italky-official-icon{width:26px;height:26px;border-radius:10px;display:grid;place-items:center;flex:0 0 auto;background:rgba(53,213,208,.11);border:1px solid rgba(53,213,208,.18);color:#84fff7;font-size:13px;font-weight:1000;}
    .italky-official-nav .danger .italky-official-icon{background:rgba(248,113,113,.10);border-color:rgba(248,113,113,.16);color:#fecaca;}
    @media(max-width:700px){.logo,.brand-logo{width:118px!important;height:54px!important}.drawer-logo,.menu-official-logo{width:118px!important;height:52px!important}.italky-official-nav a,.italky-official-nav button{min-height:43px!important;font-size:12px!important}}
  `;
  document.head.appendChild(style);
}

function fixLogos(root = document) {
  const imgs = root.querySelectorAll?.('img[src*="italkyai-logo"],img[src*="icanyai-logo"],img[src*="italky-logo-official"],img.logo,img.brand-logo,img.drawer-logo,.menu-brand img') || [];
  imgs.forEach((img) => {
    if (img.dataset.officialItalkyLogo === "1" || img.dataset.italkyLogoFixed === "1") return;
    const current = String(img.getAttribute("src") || img.src || "");
    img.dataset.officialItalkyLogo = "1";
    img.dataset.italkyLogoFixed = "1";
    if (!current.includes("italkyai-logo-clear.png?v=20260727-vector")) {
      img.setAttribute("src", OFFICIAL_LOGO);
    }
    if (img.getAttribute("alt") !== "italkyAI") img.alt = "italkyAI";
  });
}

function fixMenuRoutes(root = document) {
  const links = root.querySelectorAll?.("a[href]") || [];
  links.forEach((link) => {
    const href = String(link.getAttribute("href") || "").trim();
    if (!href) return;
    if (
      href === "https://italky.ai/hosgeldiniz" ||
      href === "https://www.italky.ai/hosgeldiniz"
    ) {
      link.setAttribute("href", PERSONAL_HOME);
      return;
    }
    if (href === "/pages/plan_select.html" || href.endsWith("/pages/plan_select.html")) {
      link.setAttribute("href", "/pages/pricing.html");
      return;
    }
    if (href === "/music-showcase/" || href.includes("/music-showcase")) {
      link.setAttribute("href", "https://www.icany.ai/music-rights");
    }
  });
}

function itemHtml(item) {
  const cls = item.danger ? "danger" : "";
  const inner = `<span class="italky-official-icon">${item.icon}</span><span>${item.label}</span>`;
  if (item.button) return `<button class="${cls}" type="button" data-official-action="${item.action}">${inner}</button>`;
  return `<a class="${cls}" href="${item.href}">${inner}</a>`;
}

function normalizeDrawer(drawer) {
  if (!drawer || drawer.dataset.officialItalkyDrawer === "1") return;
  const nav = drawer.querySelector("nav,.menu-nav");
  if (!nav) return;

  const oldText = nav.textContent || "";
  const hasModernMenu = /Jeton Yükle/.test(oldText) && /Güvenli Çıkış|Hesabımı Sil/.test(oldText);
  const hasExistingChrome =
    !!drawer.querySelector(".drawer-head,.drawer-logo,.menu-user-card,.drawer-user,.menu-official-logo,.italky-official-user");
  if (hasModernMenu || hasExistingChrome) {
    drawer.dataset.officialItalkyDrawer = "1";
    fixMenuRoutes(drawer);
    return;
  }

  const looksOld = /Konuş|Dinle|Üret|Profilim|Çıkış Yap|Giriş Yap/.test(oldText) || !/Jeton Yükle/.test(oldText);
  if (!looksOld) return;

  if (!drawer.querySelector(".menu-official-logo,.drawer-logo,.drawer-head img")) {
    const logoWrap = document.createElement("div");
    logoWrap.innerHTML = `<a href="${PERSONAL_HOME}"><img class="menu-official-logo" src="${OFFICIAL_LOGO}" alt="italkyAI"></a>`;
    drawer.insertBefore(logoWrap.firstElementChild, drawer.firstChild);
  }

  if (!drawer.querySelector(".italky-official-user,.menu-user-card,.drawer-user")) {
    const existingAvatar = document.getElementById("avatar")?.src || document.getElementById("menuUserPic")?.src || FALLBACK_AVATAR;
    const userBox = document.createElement("div");
    userBox.className = "italky-official-user";
    userBox.innerHTML = `
      <div class="italky-official-avatar"><img id="officialMenuAvatar" src="${existingAvatar || FALLBACK_AVATAR}" alt="Profil"></div>
      <div>
        <div class="italky-official-name" id="officialMenuName">Kullanıcı</div>
        <div class="italky-official-mail" id="officialMenuMail">-</div>
        <div class="italky-official-token"><span>Jeton</span><strong id="officialMenuTokens">0</strong></div>
      </div>`;
    drawer.insertBefore(userBox, nav);
  }

  nav.className = `${nav.className || ""} italky-official-nav`.trim();
  nav.innerHTML = MENU_ITEMS.map(itemHtml).join("");
  drawer.dataset.officialItalkyDrawer = "1";
}

async function hydrateUser() {
  try {
    const { supabase } = await import("/js/supabase_client.js");
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const meta = user.user_metadata || {};
    const email = user.email || "";
    const name = meta.full_name || meta.name || email || "Kullanıcı";
    const pic = meta.avatar_url || meta.picture || FALLBACK_AVATAR;
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set("officialMenuName", name);
    set("officialMenuMail", email);
    const img = document.getElementById("officialMenuAvatar");
    if (img) img.src = pic;
    try {
      const res = await supabase.from("profiles").select("tokens").eq("id", user.id).maybeSingle();
      const tokens = res?.data?.tokens ?? 0;
      set("officialMenuTokens", String(tokens));
    } catch {}
  } catch {}
}

function normalizeDrawers(root = document) {
  root.querySelectorAll?.(".drawer,.side-menu,.menu-panel").forEach(normalizeDrawer);
  hydrateUser();
}

async function logout() {
  try {
    const { supabase } = await import("/js/supabase_client.js");
    await supabase.auth.signOut();
  } catch {}
  try {
    localStorage.removeItem("italky_protected_after_login");
    localStorage.removeItem("italky_icany_pending_target");
  } catch {}
  location.replace(PERSONAL_HOME);
}

function boot() {
  injectStyle();
  fixLogos();
  fixMenuRoutes();
  normalizeDrawers();
  document.addEventListener("click", (event) => {
    const btn = event.target.closest?.('[data-official-action="logout"],#logout');
    if (!btn) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    logout();
  }, true);
  const obs = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        fixLogos(node);
        fixMenuRoutes(node);
        normalizeDrawers(node);
      });
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
