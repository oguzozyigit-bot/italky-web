// FILE: /js/system_lang.js

import { aiTranslateText } from "/js/system_lang_ai.js";

const SYSTEM_LANG_KEY = "system_lang";
const SUPPORTED = ["tr", "en", "de", "fr", "it", "es"];

const DICT = {
  "Profil": { en: "Profile", de: "Profil", fr: "Profil", it: "Profilo", es: "Perfil" },
  "Jeton Market": { en: "Token Market", de: "Token Markt", fr: "Marché des jetons", it: "Mercato Token", es: "Mercado de tokens" },
  "Çeviri Ayarları": { en: "Translation Settings", de: "Übersetzungseinstellungen", fr: "Paramètres de traduction", it: "Impostazioni traduzione", es: "Configuración de traducción" },
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

async function translateElement(el, lang) {
  if (!el || shouldSkipElement(el)) return;

  const children = Array.from(el.childNodes || []);
  const textNodes = children.filter((n) => n.nodeType === Node.TEXT_NODE);
  if (!textNodes.length) return;

  const joined = textNodes.map((n) => n.nodeValue).join("");
  const trimmed = joined.trim();
  if (!trimmed) return;

  // çok uzun metinleri veya tek karakterleri zorlama
  if (trimmed.length < 3 || trimmed.length > 120) return;

  // daha önce işlendiyse tekrar uğraşma
  if (!el.dataset.italkyOrig) {
    el.dataset.italkyOrig = trimmed;
  }

  if (el.dataset.italkyTranslatedLang === lang) {
    return;
  }

  const original = el.dataset.italkyOrig;

  let translated = dictTranslate(original, lang);

  // sadece sözlükte yoksa ve 2+ kelimeyse AI'ya git
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

export async function applySystemTranslations(root = document.body) {
  if (!root) return;

  const lang = getSystemLang();
  if (lang === "tr") return;

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
