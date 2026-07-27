// FILE: js/home_nav_patch.js
// Logo → https://italky.ai
// Ana sayfa dışı header profil resmi → ana sayfa ikonu
// Hamburger profil resmi kalır ama hiçbir profil resmi tıklanmaz

const HOME_URL = "https://italky.ai";

const HOME_ICON_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path fill="currentColor" d="M12 3.2 3.8 10.2c-.3.3-.2.8.2.8H7v8.2c0 .4.3.8.8.8h3.2v-5.2h2v5.2h3.2c.4 0 .8-.4.8-.8V11h3c.4 0 .5-.5.2-.8L12 3.2z"/></svg>';

function path() {
  try {
    return String(location.pathname || "/").replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function isHomePage() {
  const p = path().toLowerCase();
  return (
    p === "/" ||
    p === "/hosgeldiniz" ||
    p.endsWith("/hosgeldiniz.html") ||
    p === "/index.html"
  );
}

function isHeaderAvatar(el) {
  if (!el) return false;
  if (el.closest?.(".drawer,.side-menu,.menu-panel,.italky-official-user,.drawer-user,.menu-user-card,#menuProfileTop,#drawerProfile")) {
    return false;
  }
  return !!el.closest?.(
    "header .profile, header .profile-btn, header .avatar-btn, header a[aria-label='Profil'], .top-actions .profile, .top-actions .profile-btn, .top-actions .avatar-btn"
  );
}

function neutralizeAvatarClicks(root = document) {
  const selectors = [
    "#avatar",
    "#drawerPic",
    "#menuUserPic",
    "#officialMenuAvatar",
    ".profile",
    ".profile-btn",
    ".avatar-btn",
    ".drawer-avatar",
    ".menu-avatar",
    ".italky-official-avatar",
    "#drawerProfile",
    "#menuProfileCard",
    "#menuProfileTop",
    "#menuAvatarClick",
    ".italky-official-user",
    ".drawer-user",
    ".menu-user-card",
  ];

  root.querySelectorAll?.(selectors.join(",")).forEach((el) => {
    if (!el || el.dataset.homeNavNeutral === "1") return;
    el.dataset.homeNavNeutral = "1";

    if (el.tagName === "A") {
      el.removeAttribute("href");
      el.setAttribute("role", "presentation");
      el.setAttribute("aria-disabled", "true");
      el.style.pointerEvents = "none";
      el.style.cursor = "default";
      el.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
    } else {
      el.style.cursor = "default";
      el.onclick = null;
      el.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        true
      );
    }
  });
}

function wireBrandHome(root = document) {
  const links = root.querySelectorAll?.(
    "header a.brand-link, header a.brand, a.brand-link, .drawer-logo, .drawer-head a, a.menu-official-logo, .brand-link, header a[aria-label*='Ana']"
  );
  links?.forEach((a) => {
    if (!a || a.tagName !== "A") return;
    const hasLogo = a.querySelector?.("img.logo, img.brand-logo, img.drawer-logo, .menu-official-logo, img[alt*='italky'], img[src*='italky'], img[src*='icany']");
    if (!hasLogo && !a.classList.contains("brand-link") && !a.classList.contains("brand")) return;
    a.href = HOME_URL;
    a.setAttribute("aria-label", "Ana sayfa");
  });

  // bare logo images wrapped later / drawer logo divs
  root.querySelectorAll?.(".drawer-logo").forEach((node) => {
    if (node.tagName === "A") {
      node.href = HOME_URL;
      return;
    }
    if (node.dataset.homeNavLogo === "1") return;
    node.dataset.homeNavLogo = "1";
    node.style.cursor = "pointer";
    node.addEventListener("click", () => {
      location.href = HOME_URL;
    });
  });
}

function replaceHeaderAvatarWithHome(root = document) {
  if (isHomePage()) return;

  const candidates = root.querySelectorAll?.(
    "header a.profile, header a.profile-btn, header a.avatar-btn, .top-actions a.profile, .top-actions a.profile-btn, .top-actions a.avatar-btn, header #avatar"
  );
  candidates?.forEach((node) => {
    const host = node.id === "avatar" ? node.closest("a,button,div") || node : node;
    if (!host || host.dataset.homeNavHomeIcon === "1") return;
    if (!isHeaderAvatar(host) && host.id !== "avatar" && !host.closest?.("header,.top-actions,.topbar,.top")) return;

    const wrap = document.createElement("a");
    wrap.className = "italky-home-icon-btn";
    wrap.href = HOME_URL;
    wrap.setAttribute("aria-label", "Ana sayfa");
    wrap.dataset.homeNavHomeIcon = "1";
    wrap.innerHTML = HOME_ICON_SVG;

    // keep similar footprint
    wrap.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;border:1.7px solid rgba(53,213,208,.62);background:rgba(15,72,76,.35);color:#bafffb;text-decoration:none;flex:0 0 auto;";

    const target = host.id === "avatar" ? host.parentElement || host : host;
    target.replaceWith(wrap);
  });
}

function injectStyle() {
  if (document.getElementById("homeNavPatchStyle")) return;
  const style = document.createElement("style");
  style.id = "homeNavPatchStyle";
  style.textContent = `
    .italky-home-icon-btn{display:inline-flex!important;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;border:1.7px solid rgba(53,213,208,.62);background:rgba(15,72,76,.35);color:#bafffb;text-decoration:none;flex:0 0 auto}
    .italky-home-icon-btn svg{display:block}
    @media(max-width:700px){.italky-home-icon-btn{width:40px;height:40px}}
    header .profile, header .profile-btn, header .avatar-btn{pointer-events:none!important;cursor:default!important}
    .drawer-user, .menu-user-card, .italky-official-user, #drawerProfile, #menuProfileCard, #menuProfileTop, #menuAvatarClick{cursor:default!important}
  `;
  document.head.appendChild(style);
}

function patchAll(root = document) {
  injectStyle();
  wireBrandHome(root);
  replaceHeaderAvatarWithHome(root);
  neutralizeAvatarClicks(root);
}

function boot() {
  patchAll();
  [80, 250, 700, 1400].forEach((ms) => setTimeout(() => patchAll(), ms));
  const obs = new MutationObserver(() => patchAll());
  obs.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
