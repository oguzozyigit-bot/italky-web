// /js/ai_data_consent.js
// italkyAI - AI Data Processing Consent
// Shows a consent dialog before user data is sent to third-party AI services.

(() => {
  "use strict";

  const STORAGE_KEY = "italky_ai_data_consent_v1";
  const PRIVACY_URL = "https://italky.ai/pages/privacy.html";

  function getLang() {
    const raw =
      localStorage.getItem("site_lang") ||
      localStorage.getItem("italky_site_lang_v1") ||
      navigator.language ||
      "tr";

    const code = String(raw).toLowerCase().slice(0, 2);
    return code === "en" ? "en" : "tr";
  }

  function hasConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      return parsed && parsed.accepted === true;
    } catch (_) {
      return false;
    }
  }

  function saveConsent() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accepted: true,
        accepted_at: new Date().toISOString(),
        version: 1,
        providers: ["Google Gemini", "ElevenLabs"]
      })
    );
  }

  function ensureStyles() {
    if (document.getElementById("italkyAiConsentStyles")) return;

    const style = document.createElement("style");
    style.id = "italkyAiConsentStyles";
    style.textContent = `
      .italky-ai-consent-backdrop {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(2, 8, 23, .72);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      .italky-ai-consent-modal {
        width: min(440px, 100%);
        border-radius: 26px;
        padding: 20px;
        background:
          radial-gradient(circle at top right, rgba(56,189,248,.18), transparent 36%),
          linear-gradient(145deg, rgba(15,39,66,.98), rgba(7,17,31,.98));
        border: 1px solid rgba(56,189,248,.22);
        box-shadow: 0 24px 70px rgba(0,0,0,.42);
        color: #f8fbff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .italky-ai-consent-badge {
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

      .italky-ai-consent-modal h2 {
        margin: 0 0 10px;
        font-size: 22px;
        line-height: 1.15;
        font-weight: 900;
      }

      .italky-ai-consent-modal p {
        margin: 0 0 12px;
        color: rgba(248,251,255,.78);
        font-size: 14px;
        line-height: 1.55;
        font-weight: 600;
      }

      .italky-ai-consent-list {
        margin: 12px 0;
        padding: 12px;
        border-radius: 18px;
        background: rgba(255,255,255,.055);
        border: 1px solid rgba(255,255,255,.10);
      }

      .italky-ai-consent-list div {
        margin: 0 0 7px;
        color: rgba(248,251,255,.82);
        font-size: 13px;
        line-height: 1.45;
        font-weight: 650;
      }

      .italky-ai-consent-list div:last-child {
        margin-bottom: 0;
      }

      .italky-ai-consent-actions {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }

      .italky-ai-consent-primary,
      .italky-ai-consent-secondary,
      .italky-ai-consent-link {
        width: 100%;
        min-height: 46px;
        border-radius: 16px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 900;
      }

      .italky-ai-consent-primary {
        background: linear-gradient(135deg, #dbeafe, #60a5fa 38%, #2563eb);
        color: #07111f;
      }

      .italky-ai-consent-secondary {
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.12);
        color: #f8fbff;
      }

      .italky-ai-consent-link {
        background: transparent;
        color: #93c5fd;
        text-decoration: underline;
      }
    `;

    document.head.appendChild(style);
  }

  function requestConsent() {
    return new Promise((resolve) => {
      if (hasConsent()) {
        resolve(true);
        return;
      }

      ensureStyles();

      const lang = getLang();

      const text = lang === "en"
        ? {
            badge: "AI Data Processing Consent",
            title: "Before using AI features",
            p1: "italkyAI may send the text you enter, speech-to-text content, selected language information, and relevant request context to third-party AI service providers such as Google (Gemini) and ElevenLabs in order to provide translation, speech, and AI language assistant features.",
            p2: "This data is used only to generate the translation, speech, or AI response you request. italkyAI does not use this data for advertising tracking and does not sell personal data.",
            list1: "Data that may be sent: entered text, speech-to-text content, selected source/target languages, and request context.",
            list2: "Providers: Google (Gemini) and ElevenLabs.",
            list3: "Purpose: to generate the requested translation, speech, or AI assistant response.",
            agree: "I Agree",
            cancel: "Cancel",
            privacy: "Privacy Policy"
          }
        : {
            badge: "AI Veri İşleme İzni",
            title: "AI özelliklerini kullanmadan önce",
            p1: "italkyAI, çeviri, konuşma ve yapay zekâ destekli dil asistanı özelliklerini sunmak için yazdığınız metni, konuşmadan metne dönüştürülen içeriği, seçtiğiniz dil bilgilerini ve ilgili istek bağlamını Google (Gemini) ve ElevenLabs gibi üçüncü taraf yapay zekâ servislerine gönderebilir.",
            p2: "Bu veriler yalnızca talep ettiğiniz çeviri, konuşma veya AI yanıtını üretmek için kullanılır. italkyAI bu verileri reklam takibi için kullanmaz ve kişisel verileri satmaz.",
            list1: "Gönderilebilecek veriler: yazılan metin, konuşmadan metne dönüştürülen içerik, kaynak/hedef dil bilgisi ve istek bağlamı.",
            list2: "Servis sağlayıcılar: Google (Gemini) ve ElevenLabs.",
            list3: "Amaç: talep edilen çeviri, konuşma veya AI asistan yanıtını üretmek.",
            agree: "Kabul Ediyorum",
            cancel: "Vazgeç",
            privacy: "Gizlilik Politikası"
          };

      const backdrop = document.createElement("div");
      backdrop.className = "italky-ai-consent-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");

      backdrop.innerHTML = `
        <div class="italky-ai-consent-modal">
          <div class="italky-ai-consent-badge">${text.badge}</div>
          <h2>${text.title}</h2>
          <p>${text.p1}</p>
          <p>${text.p2}</p>

          <div class="italky-ai-consent-list">
            <div>• ${text.list1}</div>
            <div>• ${text.list2}</div>
            <div>• ${text.list3}</div>
          </div>

          <div class="italky-ai-consent-actions">
            <button class="italky-ai-consent-primary" type="button" data-action="agree">${text.agree}</button>
            <button class="italky-ai-consent-secondary" type="button" data-action="cancel">${text.cancel}</button>
            <button class="italky-ai-consent-link" type="button" data-action="privacy">${text.privacy}</button>
          </div>
        </div>
      `;

      function close(result) {
        backdrop.remove();
        resolve(result);
      }

      backdrop.addEventListener("click", (event) => {
        const action = event.target?.getAttribute?.("data-action");

        if (action === "agree") {
          saveConsent();
          close(true);
          return;
        }

        if (action === "cancel") {
          close(false);
          return;
        }

        if (action === "privacy") {
          window.open(PRIVACY_URL, "_blank", "noopener,noreferrer");
        }
      });

      document.body.appendChild(backdrop);
    });
  }

  async function requireConsent() {
    if (hasConsent()) return true;
    return await requestConsent();
  }

  window.italkyAIConsent = {
    hasConsent,
    requestConsent,
    requireConsent
  };
})();
