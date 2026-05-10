// /js/public_guest_ux.js
import "/js/site_language_boot.js";

const GUEST_MODE_KEY = "italky_guest_mode_v1";
const MEMBERSHIP_URL = "/pages/membership.html";
const LOGIN_URL = "/pages/login.html";
const GUIDE_ROOM_KEY = "italky_guide_room_v1";
const GUIDE_MESSAGE_KEY = "italky_guide_message_v1";
const GUIDE_LANGS = [
  ["tr", "Türkçe"],
  ["en", "English"],
  ["de", "Deutsch"],
  ["fr", "Français"],
  ["it", "Italiano"],
  ["es", "Español"],
  ["ar", "العربية"],
  ["ru", "Русский"]
];
const GUIDE_BCP = { tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", it: "it-IT", es: "es-ES", ar: "ar-SA", ru: "ru-RU" };

let deferredInstallPrompt = null;
let guideRecognizer = null;
let guideListenTimer = null;
let guideRoom = null;
let guideNativeSpeechRestore = null;

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

function pauseGuestRewardTimersForGuide() {
  try {
    window.__ITALKY_GUIDE_MODE_ACTIVE__ = true;
    const timers = window.__ITALKY_GUEST_REWARD_TIMERS__ || {};
    Object.values(timers).forEach((controller) => {
      try { controller?.stop?.(); } catch {}
    });
  } catch {}
}

function resumeGuestRewardTimersAfterGuide() {
  try {
    window.__ITALKY_GUIDE_MODE_ACTIVE__ = false;
    if (!shouldShowGuestCta()) return;

    import("/js/ad_gate.js").then((mod) => {
      const path = String(location.pathname || "").toLowerCase();
      const config = path.endsWith("/pages/login_entry.html")
        ? { moduleKey: "public_facetoface_guest", placement: "public_facetoface_guest_timer" }
        : path.endsWith("/facetoface.html")
          ? { moduleKey: "facetoface_guest", placement: "facetoface_guest_timer" }
          : null;
      if (config && typeof mod.startGuestRewardedAdTimer === "function") mod.startGuestRewardedAdTimer(config);
    }).catch(() => {});
  } catch {}
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
    .italky-member-link{border-color:rgba(96,165,250,.36)!important;background:rgba(37,99,235,.18)!important;}
    .italky-member-link::before{background:radial-gradient(circle at left,rgba(96,165,250,.20),transparent 55%),linear-gradient(135deg,rgba(255,255,255,.045),rgba(37,99,235,.22))!important;}
    .italky-shortcut-link{border-color:rgba(56,189,248,.28)!important;}
    .italky-login-mic-btn{background:rgba(37,99,235,.12);border-color:rgba(96,165,250,.35);color:#dbeafe;}
    .italky-guide-card{width:100%;min-height:56px;border:none;border-radius:16px;padding:12px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(147,197,253,.18);color:#fff;font:inherit;text-align:left;cursor:pointer;}
    .italky-guide-card strong{display:block;font-size:14px;font-weight:1000;color:#eaf2ff;}
    .italky-guide-card span{display:block;margin-top:4px;font-size:12px;font-weight:800;line-height:1.45;color:rgba(226,232,240,.72);}
    .italky-guide-code{margin:12px auto;width:max-content;min-width:140px;padding:12px 16px;border-radius:16px;background:rgba(15,23,42,.86);border:1px solid rgba(96,165,250,.28);font-size:22px;font-weight:1000;letter-spacing:3px;color:#bfdbfe;}
    .italky-guide-row{display:grid;gap:8px;margin:12px 0;text-align:left;}
    .italky-guide-row label{font-size:12px;font-weight:900;color:rgba(226,232,240,.75);}
    .italky-guide-row select,.italky-guide-row input{min-height:46px;border-radius:14px;border:1px solid rgba(147,197,253,.22);background:rgba(15,23,42,.76);color:#fff;font:inherit;font-weight:900;padding:0 12px;}
    .italky-guide-panel{margin-top:12px;padding:12px;border-radius:16px;background:rgba(15,23,42,.62);border:1px solid rgba(147,197,253,.16);text-align:left;}
    .italky-guide-panel h4{margin:0 0 8px;font-size:12px;color:#bfdbfe;letter-spacing:.4px;text-transform:uppercase;}
    .italky-guide-panel p{margin:0;min-height:42px;font-size:14px;font-weight:800;line-height:1.45;color:rgba(255,255,255,.88);white-space:pre-wrap;}
    .italky-guide-qr{margin:10px auto 6px;width:136px;height:136px;border-radius:14px;background:#fff;padding:8px;box-shadow:0 12px 30px rgba(0,0,0,.32);}
    .italky-guide-qr img{width:120px;height:120px;display:block;}
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

function ensureGuideModal() {
  let modal = $("uiModal") || $("guideModeModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "guideModeModal";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-card">
      <h3 class="modal-title"></h3>
      <p class="modal-text"></p>
      <div class="modal-actions" style="grid-template-columns:1fr;"></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function setModalContent(title, text, actionsHtml) {
  const modal = ensureGuideModal();
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

function stopGuideSpeech() {
  try { guideRecognizer?.stop?.(); } catch {}
  guideRecognizer = null;
  if (guideNativeSpeechRestore) {
    try { window.onNativeSpeechResult = guideNativeSpeechRestore; } catch {}
    guideNativeSpeechRestore = null;
  }
}

function stopGuideListening() {
  clearInterval(guideListenTimer);
  guideListenTimer = null;
}

function closeKnownModal(modal) {
  stopGuideSpeech();
  stopGuideListening();
  modal?.classList.remove("open", "show");
  resumeGuestRewardTimersAfterGuide();
}

function guideCode() {
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem("italky_guide_room_code_v1", code);
    return code;
  } catch {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}

function guideLangOptions(selected = "tr") {
  return GUIDE_LANGS.map(([code, name]) => `<option value="${code}" ${code === selected ? "selected" : ""}>${name}</option>`).join("");
}

function getGuideJoinUrl(code) {
  return `${location.origin}${location.pathname}?guide=${encodeURIComponent(code)}`;
}

function saveGuideRoom(room) {
  guideRoom = room;
  try { localStorage.setItem(GUIDE_ROOM_KEY, JSON.stringify(room)); } catch {}
}

function loadGuideRoom(code = "") {
  try {
    const room = JSON.parse(localStorage.getItem(GUIDE_ROOM_KEY) || "null");
    if (room && (!code || String(room.code) === String(code))) return room;
  } catch {}
  return null;
}

function publishGuideMessage(text, lang) {
  const clean = String(text || "").trim();
  if (!clean || !guideRoom) return;

  const message = { roomCode: guideRoom.code, sourceLang: lang, text: clean, createdAt: Date.now() };
  try { localStorage.setItem(GUIDE_MESSAGE_KEY, JSON.stringify(message)); } catch {}
  window.dispatchEvent(new CustomEvent("italkyGuideMockMessage", { detail: message }));
  const speakerText = $("guideSpeakerTranscript");
  if (speakerText) speakerText.textContent = clean;
}

function renderGuideListenerMessage(message, targetLang) {
  if (!message) return;
  const source = String(message.text || "").trim();
  const incoming = $("guideIncomingText");
  const translated = $("guideTranslatedText");
  if (incoming) incoming.textContent = source || "Henüz metin yok.";
  if (translated) translated.textContent = source ? `[${targetLang.toUpperCase()}] ${source}` : "Çeviri burada görünecek.";
  if (source) speakGuide(`[${targetLang.toUpperCase()}] ${source}`, targetLang);
}

function speakGuide(text, lang) {
  const value = String(text || "").trim();
  if (!value) return;

  try {
    if (window.NativeTTS?.speak) { window.NativeTTS.speak(value, lang); return; }
    if (window.AndroidBridge?.speak) { window.AndroidBridge.speak(value, lang); return; }
  } catch {}

  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(value);
    u.lang = GUIDE_BCP[lang] || "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
}

function installGuideNativeSpeechHook(lang) {
  if (guideNativeSpeechRestore) return;
  const previous = window.onNativeSpeechResult;
  guideNativeSpeechRestore = previous;

  window.onNativeSpeechResult = function (arg1, arg2, arg3) {
    try {
      let side = "";
      let text = "";
      let isFinal = true;
      if (typeof arg1 === "string" && arg1 === "guide") {
        side = arg1; text = String(arg2 || ""); isFinal = arg3 !== false;
      } else if (typeof arg1 === "string") {
        const data = JSON.parse(arg1);
        side = data?.side || ""; text = String(data?.text || ""); isFinal = data?.isFinal !== false;
      } else if (arg1 && typeof arg1 === "object") {
        side = arg1.side || ""; text = String(arg1.text || ""); isFinal = arg1.isFinal !== false;
      }

      if (side === "guide") {
        const speakerText = $("guideSpeakerTranscript");
        if (speakerText) speakerText.textContent = text || "Dinleniyor...";
        if (isFinal && text) publishGuideMessage(text, lang);
        return;
      }
    } catch {}

    try { previous?.(arg1, arg2, arg3); } catch {}
  };
}

function startGuideSpeech(lang) {
  stopGuideSpeech();

  // TODO: Gerçek yayın transportu için native Wi-Fi/WebSocket bridge buraya bağlanacak.
  try { window.GuideBridge?.startBroadcast?.(JSON.stringify({ code: guideRoom?.code || "", lang })); } catch {}

  installGuideNativeSpeechHook(lang);

  try {
    if (window.Native?.startSpeechRecognition) {
      window.Native.startSpeechRecognition(GUIDE_BCP[lang] || lang, "guide");
      toast("Rehber mikrofonu açıldı");
      return;
    }
    if (window.AndroidBridge?.startSpeechRecognition) {
      window.AndroidBridge.startSpeechRecognition(GUIDE_BCP[lang] || lang, "guide");
      toast("Rehber mikrofonu açıldı");
      return;
    }
  } catch {}

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast("Bu cihazda konuşma tanıma hazır değil");
    return;
  }

  const rec = new SpeechRecognition();
  guideRecognizer = rec;
  rec.lang = GUIDE_BCP[lang] || "tr-TR";
  rec.continuous = false;
  rec.interimResults = true;
  rec.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const value = event.results[i][0]?.transcript || "";
      if (event.results[i].isFinal) finalText += value;
      else interimText += value;
    }
    const speakerText = $("guideSpeakerTranscript");
    if (speakerText) speakerText.textContent = finalText || interimText || "Dinleniyor...";
    if (finalText) publishGuideMessage(finalText, lang);
  };
  rec.onerror = () => toast("Rehber mikrofonu başlatılamadı");
  rec.onend = () => { guideRecognizer = null; };

  try { rec.start(); toast("Rehber mikrofonu açıldı"); }
  catch { toast("Rehber mikrofonu başlatılamadı"); }
}

function showGuideStart() {
  pauseGuestRewardTimersForGuide();
  const modal = setModalContent(
    "Rehber Modu",
    "Rehber konuşur, katılımcılar kendi dillerinde dinler.",
    `
      <button class="italky-guide-card" id="guideSpeakerBtn" type="button"><strong>Rehber Olarak Başlat</strong><span>Oturum kodu ve QR oluştur.</span></button>
      <button class="italky-guide-card" id="guideListenerBtn" type="button"><strong>Katılımcı Olarak Katıl</strong><span>Kod girip kendi dilinde dinle.</span></button>
      <button class="modal-btn secondary" id="guideCloseBtn" type="button">Kapat</button>
    `
  );
  $("guideSpeakerBtn")?.addEventListener("click", () => showGuideSpeakerSetup(modal));
  $("guideListenerBtn")?.addEventListener("click", () => showGuideListenerSetup(modal));
  $("guideCloseBtn")?.addEventListener("click", () => closeKnownModal(modal));
}

function showGuideSpeakerSetup(modal) {
  const code = guideCode();
  const joinUrl = getGuideJoinUrl(code);
  saveGuideRoom({ code, speakerLang: "tr", started: false, joinUrl, updatedAt: Date.now() });

  setModalContent("Rehber Oturumu", "Katılımcılar QR veya kod ile katılabilir. Dinleme dilini katılımcı seçer.", `
    <div class="italky-guide-code">${code}</div>
    <div class="italky-guide-qr"><img alt="Rehber QR" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(joinUrl)}"></div>
    <div class="italky-guide-row"><label>Katılım bağlantısı</label><input readonly value="${joinUrl}"></div>
    <div class="italky-guide-row"><label>Rehber dili</label><select id="guideSpeakerLang">${guideLangOptions("tr")}</select></div>
    <button class="modal-btn primary" id="guideStartBroadcastBtn" type="button">Yayını Başlat</button>
    <button class="modal-btn secondary" id="guideBackBtn" type="button">Geri</button>
  `);

  $("guideStartBroadcastBtn")?.addEventListener("click", () => showGuideSpeakerLive(modal, code));
  $("guideBackBtn")?.addEventListener("click", showGuideStart);
}

function showGuideSpeakerLive(modal, code) {
  const lang = $("guideSpeakerLang")?.value || guideRoom?.speakerLang || "tr";
  const joinUrl = getGuideJoinUrl(code);
  saveGuideRoom({ code, speakerLang: lang, started: true, joinUrl, updatedAt: Date.now() });

  setModalContent("Yayın Açık", "Rehber mikrofonu ile konuşun. Metin yerel test yayınına aktarılır.", `
    <div class="italky-guide-code">${code}</div>
    <div class="italky-guide-panel"><h4>Rehber konuşması</h4><p id="guideSpeakerTranscript">Yayın metni burada görünecek.</p></div>
    <button class="modal-btn primary" id="guideMicBtn" type="button">Mikrofonu Aç</button>
    <button class="modal-btn secondary" id="guideMockBtn" type="button">Test Mesajı Gönder</button>
    <button class="modal-btn secondary" id="guideEndBtn" type="button">Yayını Kapat</button>
  `);

  $("guideMicBtn")?.addEventListener("click", () => startGuideSpeech(lang));
  $("guideMockBtn")?.addEventListener("click", () => publishGuideMessage("Rehber konuşması test yayını.", lang));
  $("guideEndBtn")?.addEventListener("click", () => closeKnownModal(modal));
}

function showGuideListenerSetup(modal) {
  const urlCode = new URLSearchParams(location.search).get("guide") || "";
  setModalContent("Katılımcı Olarak Katıl", "Oturum kodunu girin ve dinlemek istediğiniz dili seçin.", `
    <div class="italky-guide-row"><label>Oturum kodu</label><input id="guideJoinCode" inputmode="numeric" maxlength="8" placeholder="123456" value="${String(urlCode).replace(/[^0-9]/g, "")}"></div>
    <div class="italky-guide-row"><label>Dinleme dili</label><select id="guideListenerLang">${guideLangOptions("en")}</select></div>
    <button class="modal-btn primary" id="guideJoinBtn" type="button">Katıl</button>
    <button class="modal-btn secondary" id="guideBackBtn" type="button">Geri</button>
  `);

  $("guideJoinBtn")?.addEventListener("click", () => {
    const code = String($("guideJoinCode")?.value || "").replace(/\D/g, "").slice(0, 8);
    const lang = $("guideListenerLang")?.value || "en";
    if (!code) { toast("Oturum kodu gerekli"); return; }
    showGuideListenerLive(modal, code, lang);
  });
  $("guideBackBtn")?.addEventListener("click", showGuideStart);
}

function showGuideListenerLive(modal, code, lang) {
  stopGuideListening();
  setModalContent("Rehberi dinliyorsunuz", "Gelen rehber konuşması ve çeviri burada görünecek. TTS okuma hazırlığı aktiftir.", `
    <div class="italky-guide-code">${code}</div>
    <div class="italky-guide-panel"><h4>Gelen metin</h4><p id="guideIncomingText">Henüz metin yok.</p></div>
    <div class="italky-guide-panel"><h4>Çeviri</h4><p id="guideTranslatedText">Çeviri burada görünecek.</p></div>
    <button class="modal-btn secondary" id="guideRefreshBtn" type="button">Kontrol Et</button>
    <button class="modal-btn secondary" id="guideLeaveBtn" type="button">Ayrıl</button>
  `);

  const readLatest = () => {
    const room = loadGuideRoom(code);
    const raw = localStorage.getItem(GUIDE_MESSAGE_KEY);
    const msg = raw ? JSON.parse(raw) : null;
    if (room && msg?.roomCode === code) renderGuideListenerMessage(msg, lang);
  };

  window.addEventListener("italkyGuideMockMessage", (e) => {
    if (e.detail?.roomCode === code) renderGuideListenerMessage(e.detail, lang);
  });

  $("guideRefreshBtn")?.addEventListener("click", () => { try { readLatest(); } catch { toast("Henüz yayın verisi yok"); } });
  $("guideLeaveBtn")?.addEventListener("click", () => closeKnownModal(modal));
  guideListenTimer = setInterval(() => { try { readLatest(); } catch {} }, 1200);
  try { readLatest(); } catch {}

  // TODO: Gerçek yayın transportu için native Wi-Fi/WebSocket listener bridge buraya bağlanacak.
  try { window.GuideBridge?.joinBroadcast?.(JSON.stringify({ code, targetLang: lang })); } catch {}
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
