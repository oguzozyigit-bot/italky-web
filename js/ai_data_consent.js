// /js/ai_data_consent.js
// italkyAI - Online Translation Data Processing Consent
// Purpose:
// - Before online translation / speech-assisted translation data is sent,
//   show a clear consent dialog.
// - This file intentionally avoids "AI provider" wording.
// - Current disclosure: user text / speech-to-text content may be sent to
//   Google translation services only to provide the requested translation.

(() => {
  "use strict";

  const STORAGE_KEY = "italky_online_translation_consent_v1";
  const CONSENT_VERSION = 1;
  const PRIVACY_URL = "https://italky.ai/pages/privacy.html";

  let pendingConsentPromise = null;
  let networkGuardInstalled = false;
  let clickGuardInstalled = false;

  function getLang() {
    const raw =
      localStorage.getItem("site_lang") ||
      localStorage.getItem("italky_site_lang_v1") ||
      navigator.language ||
      "tr";

    const code = String(raw).toLowerCase().slice(0, 2);
    return code === "en" ? "en" : "tr";
  }

  function getStoredConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || parsed.accepted !== true) return null;

      return parsed;
    } catch (_) {
      return null;
    }
  }

  function hasConsent() {
    const saved = getStoredConsent();
    return !!saved && saved.version === CONSENT_VERSION;
  }

  function saveConsent() {
    const payload = {
      accepted: true,
      version: CONSENT_VERSION,
      accepted_at: new Date().toISOString(),
      scope: "online_translation",
      data_may_be_sent: [
        "user_entered_text",
        "speech_to_text_content",
        "source_language",
        "target_language",
        "translation_request_context"
      ],
      recipient: "Google translation services",
      purpose: "to generate the translation requested by the user"
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    try {
      window.dispatchEvent(
        new CustomEvent("italky:translation-consent-accepted", {
          detail: payload
        })
      );
    } catch (_) {}

    return payload;
  }

  function resetConsent() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function waitForBody() {
    if (document.body) return Promise.resolve();

    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }

  function ensureStyles() {
    if (document.getElementById("italkyTranslationConsentStyles")) return;

    const style = document.createElement("style");
    style.id = "italkyTranslationConsentStyles";
    style.textContent = `
      .italky-translation-consent-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999999; /* Z-index artırıldı, kesin en üstte olacak */
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(2, 8, 23, .74);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        pointer-events: auto; /* Tıklamaları yakalaması garanti altına alındı */
      }

      .italky-translation-consent-modal {
        width: min(460px, 100%);
        max-height: calc(100dvh - 36px);
        overflow: auto;
        border-radius: 26px;
        padding: 20px;
        background:
          radial-gradient(circle at top right, rgba(56,189,248,.18), transparent 36%),
          linear-gradient(145deg, rgba(15,39,66,.98), rgba(7,17,31,.98));
        border: 1px solid rgba(56,189,248,.24);
        box-shadow: 0 24px 70px rgba(0,0,0,.42);
        color: #f8fbff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        pointer-events: auto;
      }

      .italky-translation-consent-badge {
        display: inline-flex;
        margin-bottom: 10px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.12);
        color: #bfdbfe;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .3px;
      }

      .italky-translation-consent-modal h2 {
        margin: 0 0 10px;
        color: #f8fbff;
        font-size: 22px;
        line-height: 1.15;
        font-weight: 900;
      }

      .italky-translation-consent-modal p {
        margin: 0 0 12px;
        color: rgba(248,251,255,.80);
        font-size: 14px;
        line-height: 1.55;
        font-weight: 600;
      }

      .italky-translation-consent-list {
        margin: 12px 0;
        padding: 12px;
        border-radius: 18px;
        background: rgba(255,255,255,.055);
        border: 1px solid rgba(255,255,255,.10);
      }

      .italky-translation-consent-list div {
        margin: 0 0 8px;
        color: rgba(248,251,255,.84);
        font-size: 13px;
        line-height: 1.45;
        font-weight: 650;
      }

      .italky-translation-consent-list div:last-child {
        margin-bottom: 0;
      }

      .italky-translation-consent-actions {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }

      .italky-translation-consent-primary,
      .italky-translation-consent-secondary,
      .italky-translation-consent-link {
        width: 100%;
        min-height: 46px;
        border-radius: 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 900;
        font-family: inherit;
        position: relative; /* Butonların tıklanabilirlik alanını sağlamlaştırır */
        z-index: 10;
        pointer-events: auto;
      }

      .italky-translation-consent-primary {
        border: none;
        background: linear-gradient(135deg, #dbeafe, #60a5fa 38%, #2563eb);
        color: #07111f;
      }

      .italky-translation-consent-secondary {
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.12);
        color: #f8fbff;
      }

      .italky-translation-consent-link {
        min-height: 34px;
        background: transparent;
        border: none;
        color: #93c5fd;
        text-decoration: underline;
      }
    `;

    document.head.appendChild(style);
  }

  function getCopy() {
    const lang = getLang();

    if (lang === "en") {
      return {
        badge: "Online Translation Data Processing Consent",
        title: "Before using online translation",
        p1: "italkyAI may send the text you enter, speech-to-text content, selected source/target language information, and relevant translation request context to Google translation services in order to provide online translation and speech-assisted translation features.",
        p2: "This data is used only to generate the translation you request. italkyAI does not use this data for advertising tracking and does not sell personal data.",
        p3: "If you do not consent, the online translation request will not be sent.",
        item1: "Data that may be sent: entered text, speech-to-text content, source/target language information, and translation request context.",
        item2: "Recipient: Google translation services.",
        item3: "Purpose: to generate the translation requested by the user.",
        agree: "I Agree",
        cancel: "Cancel",
        privacy: "Privacy Policy"
      };
    }

    return {
      badge: "Çevrimiçi Çeviri Veri İşleme İzni",
      title: "Çevrimiçi çeviri kullanmadan önce",
      p1: "italkyAI, çevrimiçi çeviri ve konuşma destekli çeviri özelliklerini sunmak için yazdığınız metni, konuşmadan metne dönüştürülen içeriği, kaynak/hedef dil bilgilerini ve ilgili çeviri isteği bağlamını Google çeviri servislerine gönderebilir.",
      p2: "Bu veriler yalnızca talep ettiğiniz çeviriyi üretmek için kullanılır. italkyAI bu verileri reklam takibi için kullanmaz ve kişisel verileri satmaz.",
      p3: "Onay vermezseniz çevrimiçi çeviri isteği gönderilmez.",
      item1: "Gönderilebilecek veriler: yazılan metin, konuşmadan metne dönüştürülen içerik, kaynak/hedef dil bilgisi ve çeviri isteği bağlamı.",
      item2: "Alıcı: Google çeviri servisleri.",
      item3: "Amaç: kullanıcının talep ettiği çeviriyi üretmek.",
      agree: "Kabul Ediyorum",
      cancel: "Vazgeç",
      privacy: "Gizlilik Politikası"
    };
  }

  async function requestConsent() {
    if (hasConsent()) return true;

    if (pendingConsentPromise) {
      return pendingConsentPromise;
    }

    pendingConsentPromise = new Promise(async (resolve) => {
      await waitForBody();
      ensureStyles();

      const copy = getCopy();

      const backdrop = document.createElement("div");
      backdrop.className = "italky-translation-consent-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");

      backdrop.innerHTML = `
        <div class="italky-translation-consent-modal">
          <div class="italky-translation-consent-badge">${copy.badge}</div>

          <h2>${copy.title}</h2>

          <p>${copy.p1}</p>
          <p>${copy.p2}</p>
          <p>${copy.p3}</p>

          <div class="italky-translation-consent-list">
            <div>• ${copy.item1}</div>
            <div>• ${copy.item2}</div>
            <div>• ${copy.item3}</div>
          </div>

          <div class="italky-translation-consent-actions">
            <button class="italky-translation-consent-primary" type="button" data-action="agree">${copy.agree}</button>
            <button class="italky-translation-consent-secondary" type="button" data-action="cancel">${copy.cancel}</button>
            <button class="italky-translation-consent-link" type="button" data-action="privacy">${copy.privacy}</button>
          </div>
        </div>
      `;

      function close(result) {
        backdrop.remove();
        pendingConsentPromise = null;
        resolve(result);
      }

      function onKeyDown(event) {
        if (event.key === "Escape") {
          document.removeEventListener("keydown", onKeyDown);
          close(false);
        }
      }

      document.addEventListener("keydown", onKeyDown);

      // Event Listener Düzeltmesi: Tıklamaları doğrudan yakalamak için passive: false kullanıyoruz
      backdrop.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        
        if (!button) return;

        const action = button.getAttribute("data-action");

        // Event'in sayfadaki diğer elementlere yayılmasını engelle
        event.preventDefault();
        event.stopPropagation();

        if (action === "agree") {
          document.removeEventListener("keydown", onKeyDown);
          saveConsent();
          close(true);
          return;
        }

        if (action === "cancel") {
          document.removeEventListener("keydown", onKeyDown);
          close(false);
          return;
        }

        if (action === "privacy") {
          window.location.href = PRIVACY_URL;
        }
      }, { capture: true }); // capture: true, tıklamaları en dıştan içeriye doğru ilk bu katmanın almasını sağlar.

      document.body.appendChild(backdrop);

      const firstButton = backdrop.querySelector("[data-action='agree']");
      if(firstButton && typeof firstButton.focus === 'function') {
         firstButton.focus();
      }
    });

    return pendingConsentPromise;
  }

  async function requireConsent() {
    if (hasConsent()) return true;
    return await requestConsent();
  }

  async function guard(callback) {
    const allowed = await requireConsent();
    if (!allowed) return null;

    if (typeof callback === "function") {
      return await callback();
    }

    return true;
  }

  function normalizeUrl(input) {
    try {
      if (typeof input === "string") {
        return new URL(input, location.href).href;
      }

      if (input instanceof URL) {
        return input.href;
      }

      if (input instanceof Request) {
        return input.url;
      }
    } catch (_) {}

    return "";
  }

  function bodyToText(body) {
    if (!body) return "";

    try {
      if (typeof body === "string") return body;
      if (body instanceof URLSearchParams) return body.toString();
      if (body instanceof FormData) {
        const parts = [];
        body.forEach((value, key) => {
          if (typeof value === "string") parts.push(`${key}=${value}`);
        });
        return parts.join("&");
      }
    } catch (_) {}

    return "";
  }

  function looksLikeOnlineTranslationRequest(input, init = {}) {
    const url = normalizeUrl(input).toLowerCase();
    const method =
      String(init?.method || (input instanceof Request ? input.method : "GET") || "GET")
        .toUpperCase();

    const bodyText = bodyToText(init?.body).toLowerCase();

    const combined = `${url} ${method} ${bodyText}`;

    const allowListSignals = [
      "translate",
      "translation",
      "ceviri",
      "çeviri",
      "speech",
      "voice",
      "stt",
      "tts",
      "transcribe",
      "speech-to-text",
      "language",
      "detect-language",
      "googleapis",
      "google"
    ];

    const ignoreSignals = [
      "supabase",
      "auth",
      "login",
      "logout",
      "session",
      "profile",
      "access-state",
      "membership",
      "iap",
      "storekit",
      "billing",
      "purchase",
      "payment",
      "admob",
      "privacy.html",
      "terms",
      "eula",
      "analytics",
      "admin",
      "promo",
      "campaign",
      "code_load",
      "kampanya"
    ];

    const hasTranslationSignal = allowListSignals.some((signal) =>
      combined.includes(signal)
    );

    const hasIgnoreSignal = ignoreSignals.some((signal) =>
      combined.includes(signal)
    );

    if (!hasTranslationSignal) return false;
    if (hasIgnoreSignal) return false;

    return true;
  }

  function installFetchGuard() {
    if (networkGuardInstalled) return;
    if (typeof window.fetch !== "function") return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async function guardedFetch(input, init = {}) {
      if (looksLikeOnlineTranslationRequest(input, init)) {
        const allowed = await requireConsent();

        if (!allowed) {
          throw new DOMException(
            "Online translation request cancelled by the user.",
            "AbortError"
          );
        }
      }

      return originalFetch(input, init);
    };

    networkGuardInstalled = true;
  }

  function installXHRGuard() {
    if (!window.XMLHttpRequest) return;
    if (window.XMLHttpRequest.__italkyTranslationConsentGuarded) return;

    const originalOpen = window.XMLHttpRequest.prototype.open;
    const originalSend = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.open = function guardedOpen(method, url, ...rest) {
      this.__italkyConsentMethod = method || "GET";
      this.__italkyConsentUrl = url || "";
      return originalOpen.call(this, method, url, ...rest);
    };

    window.XMLHttpRequest.prototype.send = function guardedSend(body) {
      const fakeInput = this.__italkyConsentUrl || "";
      const fakeInit = {
        method: this.__italkyConsentMethod || "GET",
        body
      };

      if (!looksLikeOnlineTranslationRequest(fakeInput, fakeInit)) {
        return originalSend.call(this, body);
      }

      requireConsent().then((allowed) => {
        if (!allowed) {
          try {
            this.abort();
          } catch (_) {}
          return;
        }

        originalSend.call(this, body);
      });

      return undefined;
    };

    window.XMLHttpRequest.__italkyTranslationConsentGuarded = true;
  }

  function isClickableTranslationAction(el) {
    if (!el) return false;

    const text = String(el.textContent || "").trim().toLowerCase();
    const id = String(el.id || "").toLowerCase();
    const cls = String(el.className || "").toLowerCase();
    const href = String(el.getAttribute?.("href") || "").toLowerCase();
    const action = String(el.getAttribute?.("data-action") || "").toLowerCase();
    const consentAttr = el.getAttribute?.("data-requires-translation-consent");

    if (consentAttr === "1" || consentAttr === "true") return true;

    const combined = `${text} ${id} ${cls} ${href} ${action}`;

    const signals = [
      "çevir",
      "cevir",
      "translate",
      "translation",
      "konuş",
      "konus",
      "speech",
      "voice",
      "microphone",
      "mikrofon",
      "dictation",
      "transcribe"
    ];

    const ignore = [
      "privacy",
      "gizlilik",
      "eula",
      "terms",
      "payment",
      "purchase",
      "billing",
      "gün yükle",
      "gun yukle",
      "promo",
      "kod",
      "kupon"
    ];

    const hasSignal = signals.some((signal) => combined.includes(signal));
    const hasIgnore = ignore.some((signal) => combined.includes(signal));

    return hasSignal && !hasIgnore;
  }

  function installClickGuard() {
    if (clickGuardInstalled) return;

    document.addEventListener(
      "click",
      async (event) => {
        if (hasConsent()) return;

        const target = event.target?.closest?.(
          "button,a,[role='button'],.btn,.action,.card,[data-action],[data-requires-translation-consent]"
        );

        if (!target) return;
        if (!isClickableTranslationAction(target)) return;

        if (target.__italkyConsentReplay === true) {
          target.__italkyConsentReplay = false;
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const allowed = await requireConsent();
        if (!allowed) return;

        try {
          target.__italkyConsentReplay = true;
          target.click();
        } catch (_) {}
      },
      true
    );

    clickGuardInstalled = true;
  }

  function installGuards() {
    installFetchGuard();
    installXHRGuard();
    installClickGuard();
  }

  const api = {
    STORAGE_KEY,
    hasConsent,
    requestConsent,
    requireConsent,
    resetConsent,
    guard,
    installGuards
  };

  window.italkyTranslationConsent = api;
  window.italkyOnlineTranslationConsent = api;

  // Backward-compatible alias.
  // Existing code may already call window.italkyAIConsent.requireConsent().
  // User-facing text still says "online translation", not AI.
  window.italkyAIConsent = api;

  try {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("reset_translation_consent") === "1") {
      resetConsent();
    }
  } catch (_) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installGuards, { once: true });
  } else {
    installGuards();
  }
})();
