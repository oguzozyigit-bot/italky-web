// /js/public_guest_ux.js
import "/js/site_language_boot.js";

const GUEST_MODE_KEY = "italky_guest_mode_v1";
const MEMBERSHIP_URL = "/pages/membership.html";

let deferredInstallPrompt = null;

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
    #guideBtn{display:none!important;pointer-events:none!important;}
    .italky-member-link{border-color:rgba(96,165,250,.36)!important;background:rgba(37,99,235,.18)!important;}
    .italky-member-link::before{background:radial-gradient(circle at left,rgba(96,165,250,.20),transparent 55%),linear-gradient(135deg,rgba(255,255,255,.045),rgba(37,99,235,.22))!important;}
    .italky-shortcut-link{border-color:rgba(56,189,248,.28)!important;}
    .italky-login-mic-btn{background:rgba(37,99,235,.12);border-color:rgba(96,165,250,.35);color:#dbeafe;}
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
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      toast("Kısa yol ana ekrana eklendi");
      return;
    }
  } catch {}

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
  if ($(id)) return null;
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

function installDrawerActions() {
  const drawer = document.querySelector(".drawer-links");
  if (!drawer) return;

  const shortcut = createDrawerLink({
    id: "publicShortcutBtn",
    className: "italky-shortcut-link",
    label: "📌 Kısa Yol Ekle",
    onClick: addHomeShortcut
  });
  if (shortcut) drawer.prepend(shortcut);

  if (shouldShowGuestCta()) {
    const member = createDrawerLink({
      id: "publicMembershipBtn",
      className: "italky-member-link",
      label: "⭐ Google ile Üye Ol",
      onClick: () => { location.href = MEMBERSHIP_URL; }
    });
    if (member) drawer.prepend(member);
  }
}

function installMicLoginButton() {
  if (!shouldShowGuestCta() || $("publicMicLoginBtn")) return;

  const btn = document.createElement("button");
  btn.id = "publicMicLoginBtn";
  btn.type = "button";
  btn.className = "hf-btn italky-login-mic-btn";
  btn.setAttribute("aria-label", "Üye Ol");
  btn.innerHTML = `
    <svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg>
    <span>Üye Ol</span>
  `;
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    location.href = MEMBERSHIP_URL;
  });

  const loginEntrySlot = document.querySelector(".half-screen.bottom .mic-line .mic-side:last-child");
  if (loginEntrySlot) {
    loginEntrySlot.appendChild(btn);
    return;
  }

  const composer = document.querySelector("#botComposer.composer");
  if (composer) composer.appendChild(btn);
}

function hideGuestGuideEntry() {
  const guideBtn = $("guideBtn");
  if (!guideBtn) return;
  guideBtn.style.display = "none";
  guideBtn.style.pointerEvents = "none";
  guideBtn.setAttribute("aria-hidden", "true");
}

function boot() {
  injectStyles();
  hideGuestGuideEntry();
  installDrawerActions();
  installMicLoginButton();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

setTimeout(boot, 700);
