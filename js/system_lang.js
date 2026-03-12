// FILE: /js/system_lang.js

const SYSTEM_LANG_KEY = "system_lang";

const DICT_BY_TEXT = {
  "Çeviri Ayarları": {
    en: "Translation Settings",
    de: "Übersetzungseinstellungen",
    fr: "Paramètres de traduction",
    it: "Impostazioni traduzione",
    es: "Ajustes de traducción"
  },
  "Ses ayarlarını ve sistem dilini buradan yönet.": {
    en: "Manage voice settings and system language here.",
    de: "Verwalte hier Stimmeinstellungen und Systemsprache.",
    fr: "Gérez ici les paramètres vocaux et la langue du système.",
    it: "Gestisci qui le impostazioni vocali e la lingua del sistema.",
    es: "Administra aquí la voz y el idioma del sistema."
  },
  "Tercihler": {
    en: "Preferences",
    de: "Einstellungen",
    fr: "Préférences",
    it: "Preferenze",
    es: "Preferencias"
  },
  "Ses Ayarları": {
    en: "Voice Settings",
    de: "Stimmeinstellungen",
    fr: "Paramètres vocaux",
    it: "Impostazioni voce",
    es: "Ajustes de voz"
  },
  "Bu ayar FaceToFace ve SideToSide modüllerinde kullanılacak.": {
    en: "This setting will be used in FaceToFace and SideToSide modules.",
    de: "Diese Einstellung wird in FaceToFace- und SideToSide-Modulen verwendet.",
    fr: "Ce réglage sera utilisé dans les modules FaceToFace et SideToSide.",
    it: "Questa impostazione sarà usata nei moduli FaceToFace e SideToSide.",
    es: "Esta configuración se usará en los módulos FaceToFace y SideToSide."
  },
  "Sistem Dili": {
    en: "System Language",
    de: "Systemsprache",
    fr: "Langue du système",
    it: "Lingua di sistema",
    es: "Idioma del sistema"
  },
  "Türkçe arayüz metinlerini seçtiğin dile otomatik çevirir.": {
    en: "Automatically translates Turkish interface texts into your selected language.",
    de: "Übersetzt türkische Oberflächentexte automatisch in die gewählte Sprache.",
    fr: "Traduit automatiquement les textes turcs de l’interface dans la langue choisie.",
    it: "Traduce automaticamente i testi turchi dell’interfaccia nella lingua scelta.",
    es: "Traduce automáticamente los textos turcos de la interfaz al idioma elegido."
  },
  "Otomatik": {
    en: "Automatic",
    de: "Automatisch",
    fr: "Automatique",
    it: "Automatico",
    es: "Automático"
  },
  "Kadın": {
    en: "Female",
    de: "Weiblich",
    fr: "Femme",
    it: "Donna",
    es: "Mujer"
  },
  "Erkek": {
    en: "Male",
    de: "Männlich",
    fr: "Homme",
    it: "Uomo",
    es: "Hombre"
  },
  "Kendi Sesim": {
    en: "My Voice",
    de: "Meine Stimme",
    fr: "Ma voix",
    it: "La mia voce",
    es: "Mi voz"
  },
  "Jeton Market": {
    en: "Token Market",
    de: "Token Markt",
    fr: "Marché des jetons",
    it: "Mercato Token",
    es: "Mercado de fichas"
  },
  "Mevcut Bakiye": {
    en: "Current Balance",
    de: "Aktueller Kontostand",
    fr: "Solde actuel",
    it: "Saldo attuale",
    es: "Saldo actual"
  },
  "Hesabındaki kullanılabilir jeton": {
    en: "Available tokens in your account",
    de: "Verfügbare Token in deinem Konto",
    fr: "Jetons disponibles dans votre compte",
    it: "Token disponibili nel tuo account",
    es: "Fichas disponibles en tu cuenta"
  },
  "Jeton nedir?": {
    en: "What is a token?",
    de: "Was ist ein Token?",
    fr: "Qu’est-ce qu’un jeton ?",
    it: "Cos'è un token?",
    es: "¿Qué es una ficha?"
  },
  "Profil": {
    en: "Profile",
    de: "Profil",
    fr: "Profil",
    it: "Profilo",
    es: "Perfil"
  },
  "Ses Profili": {
    en: "Voice Profile",
    de: "Sprachprofil",
    fr: "Profil vocal",
    it: "Profilo vocale",
    es: "Perfil de voz"
  },
  "Sesini Tanıt": {
    en: "Create Your Voice",
    de: "Stimme einrichten",
    fr: "Présente ta voix",
    it: "Presenta la tua voce",
    es: "Presenta tu voz"
  },
  "Kısa cümleleri okuyarak kendine özel ses profilini oluştur.": {
    en: "Build your personal voice profile by reading short sentences.",
    de: "Erstelle dein persönliches Sprachprofil, indem du kurze Sätze liest.",
    fr: "Crée ton profil vocal personnel en lisant de courtes phrases.",
    it: "Crea il tuo profilo vocale leggendo frasi brevi.",
    es: "Crea tu perfil de voz leyendo frases cortas."
  },
  "İLERLEME": {
    en: "PROGRESS",
    de: "FORTSCHRITT",
    fr: "PROGRESSION",
    it: "AVANZAMENTO",
    es: "PROGRESO"
  },
  "Tamamlananlar": {
    en: "Completed",
    de: "Abgeschlossen",
    fr: "Terminés",
    it: "Completati",
    es: "Completados"
  },
  "Sonraki Cümle": {
    en: "Next Sentence",
    de: "Nächster Satz",
    fr: "Phrase suivante",
    it: "Frase successiva",
    es: "Siguiente frase"
  },
  "Kaydet ve Tamamla": {
    en: "Save and Finish",
    de: "Speichern und Abschließen",
    fr: "Enregistrer et terminer",
    it: "Salva e termina",
    es: "Guardar y finalizar"
  },
  "Vazgeç": {
    en: "Cancel",
    de: "Abbrechen",
    fr: "Annuler",
    it: "Annulla",
    es: "Cancelar"
  },
  "Mikrofona dokun ve başla": {
    en: "Tap the microphone to start",
    de: "Tippe auf das Mikrofon, um zu starten",
    fr: "Touchez le micro pour commencer",
    it: "Tocca il microfono per iniziare",
    es: "Toca el micrófono para comenzar"
  },
  "Geri dön": {
    en: "Back",
    de: "Zurück",
    fr: "Retour",
    it: "Indietro",
    es: "Volver"
  },
  "FaceToFace": {
    en: "FaceToFace",
    de: "FaceToFace",
    fr: "FaceToFace",
    it: "FaceToFace",
    es: "FaceToFace"
  },
  "AllToAll": {
    en: "AllToAll",
    de: "AllToAll",
    fr: "AllToAll",
    it: "AllToAll",
    es: "AllToAll"
  },
  "Offline Translate": {
    en: "Offline Translate",
    de: "Offline Übersetzung",
    fr: "Traduction hors ligne",
    it: "Traduzione offline",
    es: "Traducción sin conexión"
  },
  "QR Kodu tarat, anında bağlan.mesafe tanımadan anlaş...": {
    en: "Scan the QR code and connect instantly. Communicate without limits...",
    de: "QR-Code scannen und sofort verbinden. Verstehe dich ohne Grenzen...",
    fr: "Scanne le code QR et connecte-toi instantanément. Comprends-toi sans limites...",
    it: "Scansiona il codice QR e collegati subito. Comunica senza limiti...",
    es: "Escanea el código QR y conéctate al instante. Comunícate sin límites..."
  }
};

function normalizeLang(lang) {
  const raw = String(lang || "tr").toLowerCase().trim();
  const base = raw.split("-")[0];
  return ["tr","en","de","fr","it","es"].includes(base) ? base : "tr";
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

function translateText(text, lang) {
  const clean = String(text || "").trim();
  if (!clean || lang === "tr") return clean;
  return DICT_BY_TEXT[clean]?.[lang] || clean;
}

function shouldSkipElement(el) {
  if (!el) return true;
  const tag = (el.tagName || "").toLowerCase();
  if (["script", "style", "textarea"].includes(tag)) return true;
  if (el.closest?.("[data-no-translate='1']")) return true;
  return false;
}

function translateTextNode(node, lang) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const parent = node.parentElement;
  if (shouldSkipElement(parent)) return;

  const raw = node.nodeValue;
  if (!raw || !raw.trim()) return;

  if (!node.__italkyOriginalText) {
    node.__italkyOriginalText = raw;
  }

  const original = node.__italkyOriginalText;
  const trimmed = String(original).trim();
  if (!trimmed) return;

  const translated = translateText(trimmed, lang);
  if (!translated || translated === trimmed) {
    node.nodeValue = original;
    return;
  }

  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  node.nodeValue = `${leading}${translated}${trailing}`;
}

function translateAttributes(root, lang) {
  const all = [root, ...root.querySelectorAll?.("*") || []];

  all.forEach((el) => {
    if (shouldSkipElement(el)) return;

    ["placeholder", "title", "aria-label"].forEach((attr) => {
      const val = el.getAttribute?.(attr);
      if (!val || !val.trim()) return;

      const key = `__italkyOriginal_${attr}`;
      if (!el[key]) el[key] = val;

      const translated = translateText(el[key], lang);
      el.setAttribute(attr, translated || el[key]);
    });
  });
}

function walkAndTranslate(root, lang) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => translateTextNode(node, lang));

  translateAttributes(root, lang);
}

let __observer = null;
let __lastAppliedLang = null;

export function applySystemTranslations(root = document.body) {
  if (!root) return;
  const lang = getSystemLang();
  __lastAppliedLang = lang;
  walkAndTranslate(root, lang);
}

export function installAutoTranslate(root = document.body) {
  if (!root) return;

  applySystemTranslations(root);

  if (__observer) {
    try { __observer.disconnect(); } catch {}
  }

  __observer = new MutationObserver((mutations) => {
    const lang = getSystemLang();
    __lastAppliedLang = lang;

    for (const m of mutations) {
      if (m.type === "characterData") {
        translateTextNode(m.target, lang);
        continue;
      }

      if (m.type === "childList") {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node, lang);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            walkAndTranslate(node, lang);
          }
        });
      }

      if (m.type === "attributes") {
        if (m.target?.nodeType === Node.ELEMENT_NODE) {
          translateAttributes(m.target, lang);
        }
      }
    }
  });

  __observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label"]
  });
}

export function refreshSystemTranslations(root = document.body) {
  applySystemTranslations(root);
}
