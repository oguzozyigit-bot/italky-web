// /js/public_guest_ux.js

const GUEST_MODE_KEY = "italky_guest_mode_v1";
const MEMBERSHIP_URL = "/pages/membership.html";
const LOGIN_URL = "/pages/login.html";

let deferredInstallPrompt = null;

function $(id) {
  return document.getElementById(id);
}

function isGuestMode() {
  try {
    return localStorage.getItem(GUEST_MODE_KEY) === "1";
  } catch {
    return false;
  }
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
      access?.access_open ||
      access?.ads_disabled ||
      access?.subscription_active ||
      access?.has_active_membership ||
      access?.is_member ||
      access?.is_admin ||
      access?.is_superadmin
    );
  } catch {
    return false;
  }
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

  requestAnimationFrame(() => {
    el.style.transform = "translateX(-50%) translateY(0)";
  });

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
    .italky-member-link{border-color:rgba(96,165,250,.36)!important;background:rgba(37,99,235,.18)!important;}
    .italky-member-link::before{background:radial-gradient(circle at left,rgba(96,165,250,.20),transparent 55%),linear-gradient(135deg,rgba(255,255,255,.045),rgba(37,99,235,.22))!important;}
    .italky-shortcut-link{border-color:rgba(56,189,248,.28)!important;}
    .italky-login-mic-btn{background:rgba(37,99,235,.12);border-color:rgba(96,165,250,.35);color:#dbeafe;}
    .italky-guide-grid{display:grid;gap:10px;margin-top:20px;}
    .italky-guide-card{width:100%;min-height:56px;border:none;border-radius:16px;padding:12px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(147,197,253,.18);color:#fff;font:inherit;text-align:left;cursor:pointer;}
    .italky-guide-card strong{display:block;font-size:14px;font-weight:1000;color:#eaf2ff;}
    .italky-guide-card span{display:block;margin-top:4px;font-size:12px;font-weight:800;line-height:1.45;color:rgba(226,232,240,.72);}
    .italky-guide-code{margin:14px auto 0;width:max-content;min-width:140px;padding:12px 16px;border-radius:16px;background:rgba(15,23,42,.86);border:1px solid rgba(96,165,250,.28);font-size:22px;font-weight:1000;letter-spacing:3px;color:#bfdbfe;}
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
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
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
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    location.href = LOGIN_URL;
  });

  const loginEntrySlot = document.querySelector(".half-screen.bottom .mic-line .mic-side:last-child");
  if (loginEntrySlot) {
    loginEntrySlot.appendChild(btn);
    return;
  }

  const composer = document.querySelector("#botComposer.composer");
  if (composer) composer.appendChild(btn);
}

function setModalContent(title, text, actionsHtml) {
  const modal = $("uiModal") || $("guideModeModal");
  if (!modal) return null;

  const titleEl = $("uiModalTitle") || modal.querySelector(".modal-title");
  const textEl = $("uiModalText") || modal.querySelector(".modal-text");
  const actions = modal.querySelector(".modal-actions");

  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;
  if (actions) actions.innerHTML = actionsHtml;

  modal.classList.add("open", "show");
  return modal;
}

function closeKnownModal(modal) {
  modal?.classList.remove("open", "show");
}

function guideCode() {
  try {
    const saved = sessionStorage.getItem("italky_guide_room_code_v1");
    if (saved) return saved;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem("italky_guide_room_code_v1", code);
    return code;
  } catch {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}

function showGuideStart() {
  const modal = setModalContent(
    "Rehber Modu",
    "Konuşmacı bir oda başlatır, dinleyiciler kod veya bağlantı ile katılır. Bu ilk sürüm yayın altyapısını kurmadan giriş akışını açar.",
    `
      <button class="italky-guide-card" id="guideSpeakerBtn" type="button"><strong>Konuşmacı olarak başlat</strong><span>Bu telefonda rehber oturumu oluştur.</span></button>
      <button class="italky-guide-card" id="guideListenerBtn" type="button"><strong>Dinleyici olarak katıl</strong><span>Kod veya bağlantı ile dinleme ekranına hazırlan.</span></button>
      <button class="modal-btn secondary" id="guideCloseBtn" type="button">Kapat</button>
    `
  );

  $("guideSpeakerBtn")?.addEventListener("click", () => showGuideSpeaker(modal));
  $("guideListenerBtn")?.addEventListener("click", () => showGuideListener(modal));
  $("guideCloseBtn")?.addEventListener("click", () => closeKnownModal(modal));
}

function showGuideSpeaker(modal) {
  const code = guideCode();
  const titleEl = $("uiModalTitle") || modal?.querySelector(".modal-title");
  const textEl = $("uiModalText") || modal?.querySelector(".modal-text");
  const actions = modal?.querySelector(".modal-actions");

  if (titleEl) titleEl.textContent = "Konuşmacı Hazır";
  if (textEl) textEl.textContent = "Katılımcılar bu kodla bağlanabilir. Gerçek yayın altyapısı sonraki aşamada bağlanacak.";
  if (actions) {
    actions.innerHTML = `
      <div class="italky-guide-code">${code}</div>
      <button class="modal-btn primary" id="guideShareBtn" type="button">Kodu Paylaş</button>
      <button class="modal-btn secondary" id="guideBackBtn" type="button">Geri</button>
    `;
  }

  $("guideShareBtn")?.addEventListener("click", async () => {
    const url = `${location.origin}/pages/login_entry.html?guide=${code}`;
    try {
      if (navigator.share) await navigator.share({ title: "italkyAI Rehber Modu", text: `Katılım kodu: ${code}`, url });
      else await navigator.clipboard?.writeText?.(url);
      toast("Katılım bilgisi hazır");
    } catch {
      toast("Katılım kodu: " + code);
    }
  });
  $("guideBackBtn")?.addEventListener("click", showGuideStart);
}

function showGuideListener(modal) {
  const titleEl = $("uiModalTitle") || modal?.querySelector(".modal-title");
  const textEl = $("uiModalText") || modal?.querySelector(".modal-text");
  const actions = modal?.querySelector(".modal-actions");

  if (titleEl) titleEl.textContent = "Dinleyici Modu";
  if (textEl) textEl.textContent = "Rehberden gelen kodu girerek dinleme oturumuna hazırlanabilirsiniz. Canlı yayın altyapısı sonraki aşamada bağlanacak.";
  if (actions) {
    actions.innerHTML = `
      <input id="guideJoinCode" inputmode="numeric" maxlength="8" placeholder="Katılım kodu" style="width:100%;min-height:48px;border-radius:16px;border:1px solid rgba(147,197,253,.22);background:rgba(15,23,42,.76);color:#fff;font:inherit;font-weight:900;text-align:center;letter-spacing:2px;">
      <button class="modal-btn primary" id="guideJoinBtn" type="button">Katılmaya Hazırla</button>
      <button class="modal-btn secondary" id="guideBackBtn" type="button">Geri</button>
    `;
  }

  $("guideJoinBtn")?.addEventListener("click", () => {
    const value = String($("guideJoinCode")?.value || "").trim();
    toast(value ? "Dinleyici modu hazırlandı" : "Katılım kodu gerekli");
  });
  $("guideBackBtn")?.addEventListener("click", showGuideStart);
}

function installGuideMode() {
  const guideBtn = $("guideBtn");
  if (!guideBtn || guideBtn.__italkyGuideUxBound) return;
  guideBtn.__italkyGuideUxBound = true;

  guideBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    showGuideStart();
  }, true);
}

function boot() {
  injectStyles();
  installDrawerActions();
  installMicLoginButton();
  installGuideMode();
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
