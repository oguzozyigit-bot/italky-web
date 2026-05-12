const STORAGE_KEYS = ["site_lang", "italky_site_lang_v1", "siteLang"];
const FALLBACK_LANG = "en";
const IP_LOOKUP_TIMEOUT_MS = 1200;

const SUPPORTED_LANGS = new Set(["tr", "en"]);
const COUNTRY_TO_LANG = { TR: "tr" };

function safeLocalStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeLocalStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

export function normalizeSiteLang(value) {
  const raw = String(value || "").trim().toLowerCase().replace("_", "-");
  if (!raw) return "";
  const base = raw.split("-")[0];
  return SUPPORTED_LANGS.has(base) ? base : FALLBACK_LANG;
}

function normalizeCountry(value) {
  const raw = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(raw) ? raw : "";
}

function readStoredLang() {
  for (const key of STORAGE_KEYS) {
    const lang = normalizeSiteLang(safeLocalStorageGet(key));
    if (lang) return lang;
  }
  return "";
}

function langFromCountry(countryCode) {
  const country = normalizeCountry(countryCode);
  if (!country) return "";
  return COUNTRY_TO_LANG[country] || FALLBACK_LANG;
}

async function getNativeCountryCode() {
  const bridges = [window.AndroidBridge, window.Native, window.NativeLocale, window.DeviceBridge];
  const methods = ["getCountryCode", "getDeviceCountry", "getLocaleCountry", "getCountry", "getSimCountry", "getNetworkCountry"];

  for (const bridge of bridges) {
    if (!bridge) continue;
    for (const method of methods) {
      try {
        if (typeof bridge[method] !== "function") continue;
        const value = bridge[method]();
        const resolved = value && typeof value.then === "function" ? await value : value;
        const country = normalizeCountry(resolved);
        if (country) return country;
      } catch {}
    }
  }

  return "";
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IP_LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getCountryFromIp() {
  const endpoints = [
    "https://freeipapi.com/api/json",
    "https://ipapi.co/json/",
    "https://ipwho.is/"
  ];

  for (const url of endpoints) {
    const data = await fetchJsonWithTimeout(url);
    const country = normalizeCountry(
      data?.countryCode ||
      data?.country_code ||
      data?.country ||
      data?.location?.country_code
    );
    if (country) return country;
  }

  return "";
}

function getNavigatorLang() {
  try {
    const langs = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || navigator.userLanguage || ""];

    for (const item of langs) {
      const lang = normalizeSiteLang(item);
      if (lang) return lang;
    }
  } catch {}
  return "";
}

function emitSiteLangReady(lang) {
  const detail = { lang };
  try { window.dispatchEvent(new CustomEvent("italky-site-lang-changed", { detail })); } catch {}
  try { document.dispatchEvent(new CustomEvent("italky-site-lang-ready", { detail })); } catch {}
}

function applySiteLang(lang) {
  const finalLang = normalizeSiteLang(lang) || FALLBACK_LANG;
  safeLocalStorageSet("site_lang", finalLang);
  safeLocalStorageSet("italky_site_lang_v1", finalLang);
  safeLocalStorageSet("siteLang", finalLang);
  window.ITalkySiteLang = finalLang;
  document.documentElement.lang = finalLang;
  patchTwoPhoneHomeCopy();
  patchHomeGreeting();
  injectMultiChatHomeCard();
  patchMultiChatDemoComposer();
  emitSiteLangReady(finalLang);
  return finalLang;
}

function patchTwoPhoneHomeCopy() {
  const card = document.getElementById("bluetoothCard");
  if (!card) return;
  card.setAttribute("href", "/facetoface.html?mode=two-phone");

  const kicker = card.querySelector(".card-kicker");
  const title = card.querySelector(".card-title");
  const desc = card.querySelector(".card-desc");
  if (kicker) kicker.textContent = "Kod ile Bağlan";
  if (title) title.textContent = "İki Telefon";
  if (desc) desc.textContent = "Bir telefonda görüşme başlat, diğerinde kodu girerek katıl.";

  const icon = card.querySelector(".card-icon");
  if (icon) {
    icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 4.93"></path><path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19.07"></path></svg>';
  }
}

function isHomePage() {
  const path = String(location.pathname || "").toLowerCase();
  return path.endsWith("/home.html") || path === "/home.html" || path === "/pages/home.html";
}

function isMultiChatDemoPage() {
  const path = String(location.pathname || "").toLowerCase();
  return path.endsWith("/multi_chat_demo.html") || path === "/pages/multi_chat_demo.html";
}

function formatHomeGreetingText(text) {
  const raw = String(text || "").trim();
  if (!raw || raw === "Hoş geldin") return raw;

  const firstPart = raw.includes(",") ? raw.split(",")[0] : raw.split(" ")[0];
  const name = String(firstPart || "").trim();
  if (!name || name.toLowerCase() === "hoş") return raw;

  return `${name}, dünyayı anlamaya hazır mısın?`;
}

function patchHomeGreeting() {
  if (!isHomePage()) return;

  const el = document.getElementById("heroUserName");
  if (!el || el.dataset.homeGreetingPatched === "1") return;

  const applyGreeting = () => {
    const next = formatHomeGreetingText(el.textContent);
    if (next && next !== el.textContent) {
      el.textContent = next;
    }
  };

  el.dataset.homeGreetingPatched = "1";
  applyGreeting();

  const observer = new MutationObserver(() => applyGreeting());
  observer.observe(el, { childList: true, characterData: true, subtree: true });

  window.setTimeout(applyGreeting, 250);
  window.setTimeout(applyGreeting, 900);
  window.setTimeout(() => observer.disconnect(), 4000);
}

function installHomePolishStyle() {
  if (!isHomePage()) return;
  if (document.getElementById("italkyHomePolishStyle")) return;

  const style = document.createElement("style");
  style.id = "italkyHomePolishStyle";
  style.textContent = `
    #italkyFooter {
      background: rgba(9, 12, 22, .94) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    #italkyFooter .signature,
    #italkyFooter .signature-main,
    #italkyFooter .signature-year,
    #italkyFooter .signature-dot {
      text-shadow: none !important;
      filter: none !important;
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    }
    #italkyFooter .signature-main {
      letter-spacing: .18px !important;
    }
    #italkyFooter .signature + .signature {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function installMultiChatHomeCardStyle() {
  if (!isHomePage()) return;
  if (document.getElementById("italkyMultiChatHomeCardStyle")) return;

  const style = document.createElement("style");
  style.id = "italkyMultiChatHomeCardStyle";
  style.textContent = `
    .multi-chat-home-card {
      color: #082033 !important;
      background:
        radial-gradient(circle at 12% 30%, rgba(255,255,255,.52), transparent 25%),
        radial-gradient(circle at 86% 12%, rgba(255,255,255,.60), transparent 24%),
        linear-gradient(135deg, #00AEEF 0%, #38BDF8 45%, #E0F7FF 100%) !important;
      border-color: rgba(224,247,255,.70) !important;
      box-shadow: 0 18px 44px rgba(56,189,248,.24), inset 0 1px 0 rgba(255,255,255,.44) !important;
    }
    .multi-chat-home-card::before {
      background:
        linear-gradient(135deg, rgba(255,255,255,.36), transparent 44%, rgba(255,255,255,.28)),
        radial-gradient(circle at 78% 68%, rgba(14,165,233,.20), transparent 28%) !important;
    }
    .multi-chat-home-card .wide-kicker,
    .multi-chat-home-card .wide-desc {
      color: rgba(8,32,51,.74) !important;
    }
    .multi-chat-home-card .wide-title {
      color: #041827 !important;
      text-shadow: 0 1px 0 rgba(255,255,255,.34);
    }
    .multi-chat-home-card .wide-icon,
    .multi-chat-home-card .arrow-chip {
      background: rgba(255,255,255,.42) !important;
      border-color: rgba(255,255,255,.58) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.36), 0 10px 24px rgba(2,132,199,.16) !important;
    }
    .multi-chat-home-card .wide-icon svg {
      stroke: #053047 !important;
    }
    .multi-chat-home-card .arrow-chip::before {
      border-color: #053047 !important;
    }
  `;
  document.head.appendChild(style);
}

function injectMultiChatHomeCard() {
  if (!isHomePage()) return;
  if (document.getElementById("multiChatCard")) return;

  installMultiChatHomeCardStyle();

  const guideCard = document.getElementById("guideConferenceCard");
  const stack = guideCard?.parentElement || document.querySelector(".wide-stack");
  if (!stack) return;

  const card = document.createElement("a");
  card.id = "multiChatCard";
  card.className = "wide-card multi-chat-home-card";
  card.href = "/pages/multi_chat_demo.html";
  card.innerHTML = `
    <div class="wide-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M7 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path><path d="M17 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"></path><path d="M3 21a5 5 0 0 1 8 0"></path><path d="M13.5 21a4.5 4.5 0 0 1 7 0"></path><path d="M8.5 13h7"></path><path d="M13 10l2.5 3L13 16"></path></svg>
    </div>
    <div class="wide-body">
      <div class="wide-kicker">Canlı Sohbet</div>
      <h2 class="wide-title">Çoklu Katılımcı</h2>
      <p class="wide-desc">İstediğiniz kadar kişi aynı odaya katılsın. Herkes kendi dilinde yazsın, herkes kendi dilinde anlasın.</p>
    </div>
    <div class="arrow-chip"></div>
  `;

  if (guideCard) stack.insertBefore(card, guideCard);
  else stack.prepend(card);
}

function installMultiChatComposerStyle() {
  if (!isMultiChatDemoPage()) return;
  if (document.getElementById("italkyMultiChatComposerStyle")) return;

  const style = document.createElement("style");
  style.id = "italkyMultiChatComposerStyle";
  style.textContent = `
    #messageInput.message-input {
      min-height: 39px !important;
      height: 39px;
      max-height: 120px !important;
      resize: none !important;
      overflow-y: auto !important;
      padding: 10px 12px !important;
      line-height: 1.28 !important;
      scrollbar-width: none;
    }
    #messageInput.message-input::-webkit-scrollbar { display: none; }
    .composer { align-items: end !important; }
    @media(max-width:430px){
      #messageInput.message-input { min-height: 38px !important; height: 38px; }
    }
  `;
  document.head.appendChild(style);
}

function autoGrowMultiChatInput(input) {
  if (!input) return;
  input.style.height = "auto";
  const min = window.matchMedia("(max-width: 430px)").matches ? 38 : 39;
  input.style.height = `${Math.min(Math.max(input.scrollHeight, min), 120)}px`;
}

function blurMultiChatInput() {
  try { document.getElementById("messageInput")?.blur(); } catch {}
}

function patchMultiChatDemoComposer() {
  if (!isMultiChatDemoPage()) return;
  installMultiChatComposerStyle();

  const existing = document.getElementById("messageInput");
  if (!existing || existing.dataset.multiChatComposerPatched === "1") return;

  let input = existing;
  if (existing.tagName !== "TEXTAREA") {
    const textarea = document.createElement("textarea");
    textarea.id = existing.id;
    textarea.className = existing.className;
    textarea.placeholder = existing.getAttribute("placeholder") || "Mesaj yaz...";
    textarea.autocomplete = "off";
    textarea.rows = 1;
    textarea.value = existing.value || "";
    textarea.setAttribute("aria-label", "Mesaj yaz");
    existing.replaceWith(textarea);
    input = textarea;
  }

  input.dataset.multiChatComposerPatched = "1";
  input.addEventListener("input", () => autoGrowMultiChatInput(input));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      document.getElementById("sendBtn")?.click();
      window.setTimeout(() => autoGrowMultiChatInput(input), 0);
    }
  });

  const sendBtn = document.getElementById("sendBtn");
  sendBtn?.addEventListener("click", () => window.setTimeout(() => autoGrowMultiChatInput(input), 0));

  const micBtn = document.getElementById("micBtn");
  const suppressKeyboard = (event) => {
    if (event) event.preventDefault();
    window.__multiChatSuppressKeyboardUntil = Date.now() + 20000;
    blurMultiChatInput();
  };

  micBtn?.addEventListener("pointerdown", suppressKeyboard);
  micBtn?.addEventListener("touchstart", suppressKeyboard, { passive: false });
  micBtn?.addEventListener("click", () => {
    window.__multiChatSuppressKeyboardUntil = Date.now() + 20000;
    blurMultiChatInput();
    window.setTimeout(blurMultiChatInput, 40);
    window.setTimeout(blurMultiChatInput, 180);
  });

  input.addEventListener("focus", () => {
    if (Date.now() < (window.__multiChatSuppressKeyboardUntil || 0)) {
      window.setTimeout(blurMultiChatInput, 0);
    }
  });

  const previousResult = window.onNativeSpeechResult;
  if (typeof previousResult === "function" && previousResult.__multiChatKeyboardPatch !== true) {
    const wrapped = function(...args) {
      window.__multiChatSuppressKeyboardUntil = Date.now() + 2000;
      const result = previousResult.apply(window, args);
      window.setTimeout(() => {
        autoGrowMultiChatInput(document.getElementById("messageInput"));
        blurMultiChatInput();
      }, 0);
      return result;
    };
    wrapped.__multiChatKeyboardPatch = true;
    window.onNativeSpeechResult = wrapped;
  }

  autoGrowMultiChatInput(input);
}

function installUiSafetyStyle() {
  if (document.getElementById("italkySiteLanguageUiSafety")) return;

  const style = document.createElement("style");
  style.id = "italkySiteLanguageUiSafety";
  style.textContent = `
    #siteLangGrid .site-lang-item:not([data-lang="tr"]):not([data-lang="en"]) { display: none !important; }
    .section-grid.primary-grid { align-items: stretch !important; }
    #faceCard.primary-card,
    #bluetoothCard.primary-card {
      min-height: 300px !important;
      padding-bottom: 126px !important;
    }
    #faceCard .primary-art,
    #bluetoothCard .primary-art {
      bottom: 78px !important;
      height: 72px !important;
      pointer-events: none !important;
    }
    #faceCard.primary-card .card-desc,
    #bluetoothCard.primary-card .card-desc {
      margin-bottom: 8px !important;
    }
    #faceCard.primary-card .card-icon,
    #bluetoothCard.primary-card .card-icon,
    #faceCard.primary-card .arrow-chip,
    #bluetoothCard.primary-card .arrow-chip {
      bottom: 16px !important;
      z-index: 4 !important;
    }
    .wide-card {
      height: auto !important;
      min-height: 144px !important;
      padding-right: 72px !important;
    }
    .wide-card .wide-body { min-width: 0 !important; padding-right: 4px !important; }
    .wide-card .arrow-chip {
      right: 16px !important;
      top: 50% !important;
      bottom: auto !important;
      transform: translateY(-50%) !important;
    }
    @media (max-width: 390px) {
      #faceCard.primary-card,
      #bluetoothCard.primary-card {
        min-height: 280px !important;
        padding-bottom: 118px !important;
      }
      #faceCard .primary-art,
      #bluetoothCard .primary-art {
        bottom: 74px !important;
        height: 68px !important;
      }
      .wide-card { min-height: 144px !important; padding-right: 66px !important; }
    }
  `;
  document.head.appendChild(style);
}

async function detectSiteLang() {
  const stored = readStoredLang();
  if (stored) return stored;

  const nativeCountry = await getNativeCountryCode();
  const nativeLang = langFromCountry(nativeCountry);
  if (nativeLang) return nativeLang;

  const ipCountry = await getCountryFromIp();
  const ipLang = langFromCountry(ipCountry);
  if (ipLang) return ipLang;

  const navLang = getNavigatorLang();
  return navLang || FALLBACK_LANG;
}

export async function resolveSiteLanguage() {
  installUiSafetyStyle();
  installHomePolishStyle();
  installMultiChatHomeCardStyle();
  installMultiChatComposerStyle();
  patchTwoPhoneHomeCopy();
  patchHomeGreeting();
  injectMultiChatHomeCard();
  patchMultiChatDemoComposer();

  if (window.__ITALKY_SITE_LANG_BOOT_PROMISE__) return window.__ITALKY_SITE_LANG_BOOT_PROMISE__;

  window.__ITALKY_SITE_LANG_BOOT_PROMISE__ = (async () => {
    try {
      return applySiteLang(await detectSiteLang());
    } catch {
      return applySiteLang(FALLBACK_LANG);
    }
  })();

  return window.__ITALKY_SITE_LANG_BOOT_PROMISE__;
}

await resolveSiteLanguage();
