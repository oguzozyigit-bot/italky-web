// FILE: /js/system_lang.js

import { aiTranslateText } from "/js/system_lang_ai.js";

const SYSTEM_LANG_KEY = "system_lang";
const SUPPORTED = ["tr", "en", "de", "fr", "it", "es"];

const DICT = {
  "Profil": { en: "Profile", de: "Profil", fr: "Profil", it: "Profilo", es: "Perfil" },
  "Jeton Market": { en: "Token Market", de: "Token Markt", fr: "Marché des jetons", it: "Mercato Token", es: "Mercado de tokens" },
  "Kendi Sesini Oluştur": { en: "Create Your Voice", de: "Erstelle deine Stimme", fr: "Crée ta voix", it: "Crea la tua voce", es: "Crea tu voz" },
  "Çeviri Ayarları": { en: "Translation Settings", de: "Übersetzungseinstellungen", fr: "Paramètres de traduction", it: "Impostazioni traduzione", es: "Configuración de traducción" },
  "TextToText": { en: "TextToText", de: "TextToText", fr: "TextToText", it: "TextToText", es: "TextToText" },
  "QR Değiştir": { en: "Change QR", de: "QR ändern", fr: "Changer le QR", it: "Cambia QR", es: "Cambiar QR" },
  "Hakkımızda": { en: "About Us", de: "Über uns", fr: "À propos", it: "Chi siamo", es: "Sobre nosotros" },
  "Jeton Nedir": { en: "What is Token?", de: "Was ist ein Token?", fr: "Qu'est-ce qu'un jeton ?", it: "Cos'è un token?", es: "¿Qué es un token?" },
  "SSS": { en: "FAQ", de: "FAQ", fr: "FAQ", it: "FAQ", es: "FAQ" },
  "Gizlilik": { en: "Privacy", de: "Datenschutz", fr: "Confidentialité", it: "Privacy", es: "Privacidad" },
  "İletişim": { en: "Contact", de: "Kontakt", fr: "Contact", it: "Contatti", es: "Contacto" },
  "Güvenli Çıkış": { en: "Secure Logout", de: "Sicher abmelden", fr: "Déconnexion sécurisée", it: "Uscita sicura", es: "Cerrar sesión segura" },
  "Hesabımı Sil": { en: "Delete My Account", de: "Mein Konto löschen", fr: "Supprimer mon compte", it: "Elimina il mio account", es: "Eliminar mi cuenta" },
  "Bizi Puanla": { en: "Rate Us", de: "Bewerte uns", fr: "Notez-nous", it: "Valutaci", es: "Califícanos" },
  "Kısayol / Widget Ekle": { en: "Add Shortcut / Widget", de: "Verknüpfung / Widget hinzufügen", fr: "Ajouter un raccourci / widget", it: "Aggiungi scorciatoia / widget", es: "Añadir acceso directo / widget" },

  "Translation": { en: "Translation", de: "Übersetzung", fr: "Traduction", it: "Traduzione", es: "Traducción" },
  "Tercihler": { en: "Preferences", de: "Einstellungen", fr: "Préférences", it: "Preferenze", es: "Preferencias" },
  "Ses Ayarları": { en: "Voice Settings", de: "Stimmeinstellungen", fr: "Paramètres vocaux", it: "Impostazioni voce", es: "Configuración de voz" },
  "Sistem Dili": { en: "System Language", de: "Systemsprache", fr: "Langue du système", it: "Lingua di sistema", es: "Idioma del sistema" },
  "Otomatik": { en: "Automatic", de: "Automatisch", fr: "Automatique", it: "Automatico", es: "Automático" },
  "Kadın": { en: "Female", de: "Weiblich", fr: "Femme", it: "Donna", es: "Mujer" },
  "Erkek": { en: "Male", de: "Männlich", fr: "Homme", it: "Uomo", es: "Hombre" },
  "Kendi Sesim": { en: "My Voice", de: "Meine Stimme", fr: "Ma voix", it: "La mia voce", es: "Mi voz" },

  "Market": { en: "Market", de: "Markt", fr: "Marché", it: "Mercato", es: "Mercado" },
  "Sesini Tanıt": { en: "Create Voice Profile", de: "Sprachprofil erstellen", fr: "Créer un profil vocal", it: "Crea profilo vocale", es: "Crear perfil de voz" },
  "Geri dön": { en: "Back", de: "Zurück", fr: "Retour", it: "Indietro", es: "Volver" }
};

function normalizeLang(lang) {
  const raw = String(lang || "tr").toLowerCase().trim();
  const base = raw.split("-")[0];
  return SUPPORTED.includes(base) ? base : "tr";
}

export function getSystemLang() {
  try {
    return normalizeLang(localStorage.getItem(SYSTEM_LANG_KEY) || "tr");
  } catch {
    return "tr";
  }
}

export function setSystemLang(lang) {
  try {
    localStorage.setItem(SYSTEM_LANG_KEY, normalizeLang(lang));
  } catch {}
}

function dictTranslate(text, lang) {
  if (lang === "tr") return text;
  return DICT[text]?.[lang] || null;
}

function shouldSkipElement(el) {
  if (!el) return true;
  const tag = (el.tagName || "").toLowerCase();
  if (["script", "style", "textarea", "input"].includes(tag)) return true;
  if (el.closest?.("[data-no-translate='1']")) return true;
  return false;
}

function restoreOriginalIfNeeded(root) {
  const all = [root, ...root.querySelectorAll?.("*") || []];
  all.forEach((el) => {
    if (el?.dataset?.italkyOrig && el.dataset.italkyTranslatedLang) {
      const textNodes = Array.from(el.childNodes || []).filter((n) => n.nodeType === Node.TEXT_NODE);
      if (textNodes.length) {
        textNodes[0].nodeValue = el.dataset.italkyOrig;
        for (let i = 1; i < textNodes.length; i++) {
          textNodes[i].nodeValue = "";
        }
      } else if (el.hasAttribute?.("data-i18n")) {
        el.textContent = el.dataset.italkyOrig;
      }
      el.dataset.italkyTranslatedLang = "";
    }
  });
}

function translateMarkedElements(root, lang) {
  const elements = root.querySelectorAll("[data-i18n]");

  elements.forEach((el) => {
    const original = (el.dataset.italkyOrig || el.textContent || "").trim();
    if (!original) return;

    if (!el.dataset.italkyOrig) {
      el.dataset.italkyOrig = original;
    }

    if (el.dataset.italkyTranslatedLang === lang) return;

    const base = el.dataset.italkyOrig;
    const translated = dictTranslate(base, lang);

    if (translated && translated !== base) {
      el.textContent = translated;
    } else if (lang === "tr") {
      el.textContent = base;
    }

    el.dataset.italkyTranslatedLang = lang;
  });
}

async function translateElement(el, lang) {
  if (!el || shouldSkipElement(el)) return;
  if (el.hasAttribute?.("data-i18n")) return;

  const children = Array.from(el.childNodes || []);
  const textNodes = children.filter((n) => n.nodeType === Node.TEXT_NODE);
  if (!textNodes.length) return;

  const joined = textNodes.map((n) => n.nodeValue).join("");
  const trimmed = joined.trim();
  if (!trimmed) return;

  if (trimmed.length < 3 || trimmed.length > 120) return;

  if (!el.dataset.italkyOrig) {
    el.dataset.italkyOrig = trimmed;
  }

  if (el.dataset.italkyTranslatedLang === lang) {
    return;
  }

  const original = el.dataset.italkyOrig;

  let translated = dictTranslate(original, lang);

  if (!translated && original.split(/\s+/).length >= 2) {
    translated = await aiTranslateText(original, lang);
  }

  if (!translated || translated === original) {
    el.dataset.italkyTranslatedLang = lang;
    return;
  }

  textNodes.forEach((n, idx) => {
    if (idx === 0) {
      n.nodeValue = joined.replace(trimmed, translated);
    } else {
      n.nodeValue = "";
    }
  });

  el.dataset.italkyTranslatedLang = lang;
}

export function t(text, fallback = "") {
  const lang = getSystemLang();
  const key = String(text || "").trim();
  if (!key) return fallback || "";
  return dictTranslate(key, lang) || fallback || key;
}

export async function applySystemTranslations(root = document.body) {
  if (!root) return;

  const lang = getSystemLang();

  if (lang === "tr") {
    restoreOriginalIfNeeded(root);
    return;
  }

  translateMarkedElements(root, lang);

  const all = [root, ...root.querySelectorAll("*")];
  for (const el of all) {
    await translateElement(el, lang);
  }
}

let observer = null;
let busy = false;

export function installAutoTranslate(root = document.body) {
  if (!root) return;

  applySystemTranslations(root).catch(() => {});

  if (observer) return;

  observer = new MutationObserver(() => {
    if (busy) return;
    busy = true;

    requestAnimationFrame(async () => {
      try {
        await applySystemTranslations(root);
      } catch (e) {
        console.warn("[system_lang apply]", e);
      } finally {
        busy = false;
      }
    });
  });

  observer.observe(root, {
    childList: true,
    subtree: true
  });
}

function showMenuPolicyMessage(message) {
  const text = String(message || "").trim();
  if (!text) return;
  try {
    if (typeof window.showToast === "function") {
      window.showToast(text);
      return;
    }
  } catch {}
  const existing = document.getElementById("italkyMenuPolicyToast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "italkyMenuPolicyToast";
  toast.textContent = text;
  toast.style.cssText = "position:fixed;left:50%;top:22px;transform:translateX(-50%);max-width:min(92vw,430px);padding:11px 14px;border-radius:16px;background:rgba(10,16,30,.96);border:1px solid rgba(255,255,255,.14);color:#fff;font-family:Outfit,system-ui,sans-serif;font-size:12px;font-weight:900;text-align:center;z-index:2147483647;box-shadow:0 18px 38px rgba(0,0,0,.38);";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function isShellGuestMenu(nav) {
  const login = nav?.querySelector?.("#menuLoginLink");
  const profile = nav?.querySelector?.("#profileLink");
  const loginVisible = !!login && !login.hidden && getComputedStyle(login).display !== "none";
  const profileVisible = !!profile && !profile.hidden && getComputedStyle(profile).display !== "none";
  try {
    if (localStorage.getItem("italky_guest_mode_v1") === "1" && loginVisible) return true;
  } catch {}
  return loginVisible && !profileVisible;
}

function isIOSNativeAppShell() {
  const params = new URLSearchParams(window.location.search || "");
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  const queryIOS =
    params.get("ios") === "1" ||
    params.get("platform") === "ios" ||
    params.get("app") === "ios";

  const hasIOSBridge =
    !!window.webkit?.messageHandlers?.IOSStoreKit ||
    !!window.webkit?.messageHandlers?.italkyIOS ||
    !!window.webkit?.messageHandlers?.iosBridge;

  const looksLikeIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return queryIOS || hasIOSBridge || looksLikeIOS;
}

function openPlayStoreRating() {
  const packageName = "com.ozyigits.italkyai";
  const marketUrl = `market://details?id=${packageName}`;
  const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
  try {
    const bridge = window.AndroidBridge || window.Native || window.AndroidAppBridge;
    if (bridge?.openAppReview) { bridge.openAppReview(); return; }
    if (bridge?.rateApp) { bridge.rateApp(); return; }
    if (bridge?.openPlayStore) { bridge.openPlayStore(); return; }
  } catch {}
  try {
    window.location.href = marketUrl;
    setTimeout(() => {
      try { window.location.href = webUrl; }
      catch { showMenuPolicyMessage("Puanlama sayfası açılamadı. Lütfen daha sonra tekrar deneyin."); }
    }, 650);
  } catch {
    showMenuPolicyMessage("Puanlama sayfası açılamadı. Lütfen daha sonra tekrar deneyin.");
  }
}

function requestWidgetPin() {
  const bridge = window.AndroidBridge || window.Native || window.AndroidAppBridge;
  const methods = ["requestPinWidget", "pinWidget", "pinAppWidget", "pinAppShortcut", "requestPinShortcut", "addHomeShortcut", "addShortcut"];
  for (const method of methods) {
    try {
      if (bridge && typeof bridge[method] === "function") {
        bridge[method]();
        return;
      }
    } catch {}
  }
  showMenuPolicyMessage("Bu cihazda otomatik widget ekleme desteklenmiyor. Ana ekrandan widget ekleyebilirsiniz.");
}

function createShellMenuButton(id, label, onClick) {
  const btn = document.createElement("button");
  btn.id = id;
  btn.type = "button";
  btn.className = "menu-action member-only-menu-action";
  btn.setAttribute("data-i18n", "");
  btn.textContent = label;
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return btn;
}

function applyMemberGuestMenuPolicy() {
  const nav = document.querySelector(".menu-nav");
  if (!nav) return;

  nav.querySelectorAll("#logoutBtn,[data-menu-policy='logout']").forEach((el) => el.remove());
  Array.from(nav.querySelectorAll("button,a")).forEach((el) => {
    const text = (el.textContent || "").toLocaleLowerCase("tr-TR");
    if (text.includes("güvenli çıkış") || text.includes("çıkış yap") || text.trim() === "logout") {
      el.remove();
    }
  });

  const guest = isShellGuestMenu(nav);
  nav.querySelectorAll("#memberRateAppBtn,#memberPinWidgetBtn").forEach((el) => el.remove());
  if (isIOSNativeAppShell()) return;
  if (guest) return;

  const privacy = nav.querySelector("a[href='/pages/privacy.html']") || nav.querySelector("#privacyLink");
  const anchor = privacy || nav.lastElementChild;
  const rate = createShellMenuButton("memberRateAppBtn", "Bizi Puanla", openPlayStoreRating);
  const widget = createShellMenuButton("memberPinWidgetBtn", "Kısayol / Widget Ekle", requestWidgetPin);

  if (anchor?.parentNode) {
    anchor.insertAdjacentElement("afterend", widget);
    anchor.insertAdjacentElement("afterend", rate);
  } else {
    nav.append(rate, widget);
  }
}

function installMemberGuestMenuPolicy() {
  if (window.__ITALKY_MEMBER_GUEST_MENU_POLICY__) return;
  window.__ITALKY_MEMBER_GUEST_MENU_POLICY__ = true;
  const run = () => applyMemberGuestMenuPolicy();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
  setTimeout(run, 200);
  setTimeout(run, 900);
  const menuObserver = new MutationObserver(() => run());
  try {
    menuObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "style", "class"] });
  } catch {}
}

installMemberGuestMenuPolicy();
