// /js/public_guest_ux.js
import "/js/site_language_boot.js";

const GUEST_MODE_KEY = "italky_guest_mode_v1";
const MEMBERSHIP_URL = "/pages/membership.html";

function $(id) {
  return document.getElementById(id);
}

function isGuestMode() {
  try { return localStorage.getItem(GUEST_MODE_KEY) === "1"; }
  catch { return false; }
}

function hasCachedSupabaseSession() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = String(localStorage.key(i) || "");
      if (!key.startsWith("sb-")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
      if (token) return true;
    }
  } catch {}
  return false;
}

function isAccessOpen() {
  try {
    const access = window.__ITALKY_ACCESS__ || null;
    return !!(
      access?.access_open || access?.ads_disabled || access?.subscription_active || access?.has_active_membership ||
      access?.is_member || access?.is_admin || access?.is_superadmin
    );
  } catch { return false; }
}

function shouldShowGuestCta() {
  return isGuestMode() && !hasCachedSupabaseSession() && !isAccessOpen();
}

function toast(message) {
  const value = String(message || "").trim();
  if (!value) return;

  try {
    if (typeof window.showToast === "function") {
      window.showToast(value);
      return;
    }
  } catch {}

  const existing = $("italkyPublicGuestToast");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.id = "italkyPublicGuestToast";
  el.textContent = value;
  el.style.cssText = "position:fixed;left:50%;top:28px;transform:translateX(-50%) translateY(-120px);max-width:min(92vw,430px);min-height:44px;padding:11px 16px;border-radius:16px;background:rgba(12,16,28,.98);border:1px solid rgba(255,255,255,.15);color:#fff;font-family:Outfit,system-ui,sans-serif;font-size:12px;font-weight:1000;text-align:center;z-index:2147483647;box-shadow:0 18px 36px rgba(0,0,0,.45);transition:.22s ease;pointer-events:none";
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.transform = "translateX(-50%) translateY(0)"; });
  setTimeout(() => {
    el.style.transform = "translateX(-50%) translateY(-120px)";
    setTimeout(() => el.remove(), 260);
  }, 2400);
}

function injectStyles() {
  if ($("italkyPublicGuestUxStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyPublicGuestUxStyle";
  style.textContent = `
    #guideBtn,#publicMicLoginBtn{display:none!important;pointer-events:none!important;}
    .center-hub{justify-content:space-between!important;padding:0 40px!important;}
    .center-hub .orb-wrapper{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;z-index:3!important;}
    .center-hub .hub-btn{position:relative!important;z-index:8!important;}
    .center-hub .hub-btn:first-of-type{margin-right:auto!important;}
    .center-hub .hub-btn:last-of-type{margin-left:auto!important;}
    .drawer-links{gap:10px!important;}
    .italky-member-link{border-color:rgba(96,165,250,.36)!important;background:rgba(37,99,235,.18)!important;}
    .italky-member-link::before{background:radial-gradient(circle at left,rgba(96,165,250,.20),transparent 55%),linear-gradient(135deg,rgba(255,255,255,.045),rgba(37,99,235,.22))!important;}
    @media(max-width:390px){.center-hub{padding:0 34px!important}.center-hub .hub-btn{width:48px!important;height:48px!important}.center-hub .orb-wrapper{width:62px!important;height:62px!important}.center-hub .orb{width:62px!important;height:62px!important}}
  `;
  document.head.appendChild(style);
}

function callShortcutBridge() {
  const calls = [
    [window.AndroidBridge, "addHomeShortcut"],
    [window.Native, "addHomeShortcut"],
    [window.AndroidBridge, "pinWidget"],
    [window.Native, "pinWidget"],
    [window.AndroidBridge, "requestPinShortcut"],
    [window.Native, "requestPinShortcut"],
    [window.AndroidBridge, "addShortcut"],
    [window.Native, "addShortcut"]
  ];

  for (const [bridge, method] of calls) {
    try {
      if (bridge && typeof bridge[method] === "function") {
        bridge[method]();
        return true;
      }
    } catch {}
  }
  return false;
}

async function addHomeShortcut() {
  if (callShortcutBridge()) {
    toast("Kısa yol ana ekrana eklendi");
    return;
  }

  try {
    if (navigator.share) {
      await navigator.share({ title: "italkyAI", text: "italkyAI", url: location.origin + "/pages/login_entry.html" });
      toast("Kısa yol bağlantısı paylaşıldı");
      return;
    }
  } catch {}

  toast("Bu cihazda kısa yol ekleme desteklenmiyor");
}

function createDrawerLink({ id, className = "", label, suffix = "›", onClick }) {
  const btn = document.createElement("button");
  btn.id = id;
  btn.type = "button";
  btn.className = `drawer-link ${className}`.trim();
  btn.innerHTML = `<span>${label}</span><small>${suffix}</small>`;
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  });
  return btn;
}

function openRateFlow() {
  try {
    if (window.AndroidBridge?.openAppReview) { window.AndroidBridge.openAppReview(); return; }
    if (window.Native?.openAppReview) { window.Native.openAppReview(); return; }
    if (window.AndroidBridge?.rateApp) { window.AndroidBridge.rateApp(); return; }
    if (window.Native?.rateApp) { window.Native.rateApp(); return; }
  } catch {}
  toast("Değerlendirmeniz bizim için önemli.");
}

function installDrawerActions() {
  const drawer = document.querySelector(".drawer-links");
  if (!drawer) return;

  drawer.innerHTML = "";
  drawer.append(
    createDrawerLink({ id: "guestAboutBtn", label: "Hakkımızda", onClick: () => { location.href = "/pages/about.html"; } }),
    createDrawerLink({ id: "guestPrivacyBtn", label: "Gizlilik", onClick: () => { location.href = "/pages/privacy.html"; } }),
    createDrawerLink({ id: "guestRateBtn", label: "Bizi Puanla", onClick: openRateFlow }),
    createDrawerLink({ id: "guestMembershipBtn", className: "italky-member-link", label: "Üye Ol", onClick: () => { location.href = MEMBERSHIP_URL; } })
  );
}

function hideGuestGuideEntry() {
  const guideBtn = $("guideBtn");
  if (!guideBtn) return;
  guideBtn.style.display = "none";
  guideBtn.style.pointerEvents = "none";
  guideBtn.setAttribute("aria-hidden", "true");
}

function hideGuestMembershipCtaOnMain() {
  const micLogin = $("publicMicLoginBtn");
  if (micLogin) micLogin.remove();
  try {
    document.querySelectorAll(".italky-member-link").forEach((el) => {
      if (!el.closest(".drawer-links")) el.remove();
    });
  } catch {}
}

function boot() {
  injectStyles();
  hideGuestGuideEntry();
  installDrawerActions();
  hideGuestMembershipCtaOnMain();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

setTimeout(boot, 200);
setTimeout(boot, 900);
