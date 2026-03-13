// FILE: /js/system_lang.js

import { aiTranslateText } from "/js/system_lang_ai.js";

const SYSTEM_LANG_KEY = "system_lang";
const SUPPORTED = ["tr", "en", "de", "fr", "it", "es"];

const DICT = {
  "Profil": { en: "Profile", de: "Profil", fr: "Profil", it: "Profilo", es: "Perfil" },
  "Jeton": { en: "Token", de: "Token", fr: "Jeton", it: "Token", es: "Token" },
  "Jeton Market": { en: "Token Market", de: "Token Markt", fr: "Marché des jetons", it: "Mercato Token", es: "Mercado de tokens" },
  "Jeton Nedir": { en: "What is Token", de: "Was ist Token", fr: "Qu'est-ce qu'un jeton", it: "Cos'è un token", es: "Qué es un token" },
  "Kendi Sesini Oluştur": { en: "Create Your Voice", de: "Eigene Stimme erstellen", fr: "Créer ta voix", it: "Crea la tua voce", es: "Crea tu voz" },
  "Sesini Tanıt": { en: "Create Voice Profile", de: "Stimmprofil erstellen", fr: "Créer profil vocal", it: "Crea profilo vocale", es: "Crear perfil de voz" },
  "Çeviri Ayarları": { en: "Translation Settings", de: "Übersetzungseinstellungen", fr: "Paramètres de traduction", it: "Impostazioni traduzione", es: "Configuración de traducción" },
  "Sistem Dili": { en: "System Language", de: "Systemsprache", fr: "Langue système", it: "Lingua di sistema", es: "Idioma del sistema" },
  "Ses Ayarları": { en: "Voice Settings", de: "Stimmeinstellungen", fr: "Paramètres vocaux", it: "Impostazioni voce", es: "Configuración de voz" },
  "Otomatik": { en: "Automatic", de: "Automatisch", fr: "Automatique", it: "Automatico", es: "Automático" },
  "Kadın": { en: "Female", de: "Weiblich", fr: "Femme", it: "Donna", es: "Mujer" },
  "Erkek": { en: "Male", de: "Männlich", fr: "Homme", it: "Uomo", es: "Hombre" },
  "Kendi Sesim": { en: "My Voice", de: "Meine Stimme", fr: "Ma voix", it: "La mia voce", es: "Mi voz" },
  "Güvenli Çıkış": { en: "Secure Logout", de: "Sicher abmelden", fr: "Déconnexion sécurisée", it: "Uscita sicura", es: "Cerrar sesión segura" },
  "Hesabımı Sil": { en: "Delete Account", de: "Konto löschen", fr: "Supprimer le compte", it: "Elimina account", es: "Eliminar cuenta" },
  "Hakkımızda": { en: "About Us", de: "Über uns", fr: "À propos", it: "Chi siamo", es: "Sobre nosotros" },
  "Gizlilik": { en: "Privacy", de: "Datenschutz", fr: "Confidentialité", it: "Privacy", es: "Privacidad" },
  "İletişim": { en: "Contact", de: "Kontakt", fr: "Contact", it: "Contatto", es: "Contacto" },
  "SSS": { en: "FAQ", de: "FAQ", fr: "FAQ", it: "FAQ", es: "FAQ" },
  "FaceToFace": { en: "FaceToFace", de: "FaceToFace", fr: "FaceToFace", it: "FaceToFace", es: "FaceToFace" },
  "SideToSide": { en: "SideToSide", de: "SideToSide", fr: "SideToSide", it: "SideToSide", es: "SideToSide" },
  "AllToAll": { en: "AllToAll", de: "AllToAll", fr: "AllToAll", it: "AllToAll", es: "AllToAll" },
  "Offline Hub": { en: "Offline Hub", de: "Offline Hub", fr: "Offline Hub", it: "Offline Hub", es: "Offline Hub" },
  "Offline Translate": { en: "Offline Translate", de: "Offline Übersetzung", fr: "Traduction hors ligne", it: "Traduzione offline", es: "Traducción offline" },
  "Geri dön": { en: "Back", de: "Zurück", fr: "Retour", it: "Indietro", es: "Volver" },
  "Kaydet": { en: "Save", de: "Speichern", fr: "Enregistrer", it: "Salva", es: "Guardar" },
  "Vazgeç": { en: "Cancel", de: "Abbrechen", fr: "Annuler", it: "Annulla", es: "Cancelar" },
  "Sonraki": { en: "Next", de: "Weiter", fr: "Suivant", it: "Avanti", es: "Siguiente" },
  "Tamamla": { en: "Finish", de: "Fertig", fr: "Terminer", it: "Completa", es: "Finalizar" },
  "Mevcut Bakiye": { en: "Current Balance", de: "Aktueller Kontostand", fr: "Solde actuel", it: "Saldo attuale", es: "Saldo actual" },
  "Hesabındaki kullanılabilir jeton": { en: "Available tokens in your account", de: "Verfügbare Token in deinem Konto", fr: "Jetons disponibles dans votre compte", it: "Token disponibili nel tuo account", es: "Tokens disponibles en tu cuenta" }
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
  const item = DICT[text];
  return item?.[lang] || null;
}

function shouldSkipElement(el) {
  if (!el) return true;
  const tag = (el.tagName || "").toLowerCase();
  if (["script", "style", "textarea", "input"].includes(tag)) return true;
  if (el.closest?.("[data-no-translate='1']")) return true;
  return false;
}

async function translateNodeText(el, lang) {
  if (!el || shouldSkipElement(el)) return;

  const children = Array.from(el.childNodes || []);
  const textNodes = children.filter((n) => n.nodeType === Node.TEXT_NODE);

  if (!textNodes.length) return;

  const joined = textNodes.map((n) => n.nodeValue).join("");
  const trimmed = joined.trim();
  if (!trimmed) return;

  if (!el.dataset.italkyOrig) {
    el.dataset.italkyOrig = trimmed;
  }

  const original = el.dataset.italkyOrig;

  let translated = dictTranslate(original, lang);
  if (!translated) {
    translated = await aiTranslateText(original, lang);
  }

  if (!translated || translated === original) return;

  textNodes.forEach((n, idx) => {
    if (idx === 0) {
      n.nodeValue = joined.replace(trimmed, translated);
    } else {
      n.nodeValue = "";
    }
  });
}

export async function applySystemTranslations(root = document.body) {
  if (!root) return;

  const lang = getSystemLang();
  if (lang === "tr") return;

  const all = [root, ...root.querySelectorAll("*")];

  for (const el of all) {
    await translateNodeText(el, lang);
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
