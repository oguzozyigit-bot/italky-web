// FILE: /js/system_lang.js

const SYSTEM_LANG_KEY = "system_lang";

const DICT = {
  tr: {
    back: "Geri dön",
    translation_settings: "Çeviri Ayarları",
    translation_settings_desc: "Ses ayarlarını ve sistem dilini buradan yönet.",
    preferences: "Tercihler",
    voice_settings: "Ses Ayarları",
    voice_settings_desc_scope: "Bu ayar FaceToFace ve SideToSide modüllerinde kullanılacak.",
    system_language: "Sistem Dili",
    system_language_desc_auto: "Türkçe arayüz metinlerini seçtiğin dile otomatik çevirir.",
    automatic: "Otomatik",
    female: "Kadın",
    male: "Erkek",
    own_voice: "Kendi Sesim",
    free_tts_default: "TTS ücretsiz ve varsayılan seçenek",
    female_voice_desc: "Kadın ses tonuna yakın okuma",
    male_voice_desc: "Erkek ses tonuna yakın okuma",
    clone_voice_desc: "Daha önce oluşturduğun ses profili",
    updated_voice_setting: "Ses ayarı güncellendi",
    updated_system_lang: "Sistem dili güncellendi",
    settings_note_1: "Ses ayarı eski çalışan sistemle uyumlu olarak tts_voice anahtarına yazılır. Sistem dili ise uygulama metinlerinin hangi dilde gösterileceğini belirler."
  },

  en: {
    back: "Back",
    translation_settings: "Translation Settings",
    translation_settings_desc: "Manage voice settings and system language here.",
    preferences: "Preferences",
    voice_settings: "Voice Settings",
    voice_settings_desc_scope: "This setting will be used in FaceToFace and SideToSide modules.",
    system_language: "System Language",
    system_language_desc_auto: "Automatically translates Turkish interface texts into your selected language.",
    automatic: "Automatic",
    female: "Female",
    male: "Male",
    own_voice: "My Voice",
    free_tts_default: "Free TTS and default option",
    female_voice_desc: "Speech closer to a female tone",
    male_voice_desc: "Speech closer to a male tone",
    clone_voice_desc: "Your previously created voice profile",
    updated_voice_setting: "Voice setting updated",
    updated_system_lang: "System language updated",
    settings_note_1: "Voice setting is saved with the old working system using the tts_voice key. System language determines which language the app texts are shown in."
  },

  de: {
    back: "Zurück",
    translation_settings: "Übersetzungseinstellungen",
    translation_settings_desc: "Verwalte hier Stimmeinstellungen und Systemsprache.",
    preferences: "Einstellungen",
    voice_settings: "Stimmeinstellungen",
    voice_settings_desc_scope: "Diese Einstellung wird in FaceToFace- und SideToSide-Modulen verwendet.",
    system_language: "Systemsprache",
    system_language_desc_auto: "Übersetzt türkische Oberflächentexte automatisch in die gewählte Sprache.",
    automatic: "Automatisch",
    female: "Weiblich",
    male: "Männlich",
    own_voice: "Meine Stimme",
    free_tts_default: "Kostenlose TTS und Standardoption",
    female_voice_desc: "Ausgabe näher an weiblicher Stimme",
    male_voice_desc: "Ausgabe näher an männlicher Stimme",
    clone_voice_desc: "Dein zuvor erstelltes Sprachprofil",
    updated_voice_setting: "Stimmeinstellung aktualisiert",
    updated_system_lang: "Systemsprache aktualisiert",
    settings_note_1: "Die Stimmeinstellung wird mit dem alten funktionierenden System über den Schlüssel tts_voice gespeichert. Die Systemsprache bestimmt, in welcher Sprache die App-Texte angezeigt werden."
  },

  fr: {
    back: "Retour",
    translation_settings: "Paramètres de traduction",
    translation_settings_desc: "Gérez ici les paramètres vocaux et la langue du système.",
    preferences: "Préférences",
    voice_settings: "Paramètres vocaux",
    voice_settings_desc_scope: "Ce réglage sera utilisé dans les modules FaceToFace et SideToSide.",
    system_language: "Langue du système",
    system_language_desc_auto: "Traduit automatiquement les textes turcs de l’interface dans la langue choisie.",
    automatic: "Automatique",
    female: "Femme",
    male: "Homme",
    own_voice: "Ma voix",
    free_tts_default: "TTS gratuit et option par défaut",
    female_voice_desc: "Voix plus proche d’un ton féminin",
    male_voice_desc: "Voix plus proche d’un ton masculin",
    clone_voice_desc: "Votre profil vocal créé précédemment",
    updated_voice_setting: "Paramètre vocal mis à jour",
    updated_system_lang: "Langue du système mise à jour",
    settings_note_1: "Le réglage vocal est enregistré avec l’ancien système fonctionnel via la clé tts_voice. La langue du système détermine dans quelle langue les textes de l’application sont affichés."
  },

  it: {
    back: "Indietro",
    translation_settings: "Impostazioni traduzione",
    translation_settings_desc: "Gestisci qui le impostazioni vocali e la lingua del sistema.",
    preferences: "Preferenze",
    voice_settings: "Impostazioni voce",
    voice_settings_desc_scope: "Questa impostazione sarà usata nei moduli FaceToFace e SideToSide.",
    system_language: "Lingua di sistema",
    system_language_desc_auto: "Traduce automaticamente i testi turchi dell’interfaccia nella lingua scelta.",
    automatic: "Automatico",
    female: "Donna",
    male: "Uomo",
    own_voice: "La mia voce",
    free_tts_default: "TTS gratuito e opzione predefinita",
    female_voice_desc: "Lettura vicina a una voce femminile",
    male_voice_desc: "Lettura vicina a una voce maschile",
    clone_voice_desc: "Il tuo profilo vocale creato in precedenza",
    updated_voice_setting: "Impostazione voce aggiornata",
    updated_system_lang: "Lingua di sistema aggiornata",
    settings_note_1: "L’impostazione voce viene salvata con il vecchio sistema funzionante tramite la chiave tts_voice. La lingua di sistema determina in quale lingua vengono mostrati i testi dell’app."
  },

  es: {
    back: "Volver",
    translation_settings: "Ajustes de traducción",
    translation_settings_desc: "Administra aquí la voz y el idioma del sistema.",
    preferences: "Preferencias",
    voice_settings: "Ajustes de voz",
    voice_settings_desc_scope: "Esta configuración se usará en los módulos FaceToFace y SideToSide.",
    system_language: "Idioma del sistema",
    system_language_desc_auto: "Traduce automáticamente los textos turcos de la interfaz al idioma elegido.",
    automatic: "Automático",
    female: "Mujer",
    male: "Hombre",
    own_voice: "Mi voz",
    free_tts_default: "TTS gratis y opción predeterminada",
    female_voice_desc: "Lectura cercana a una voz femenina",
    male_voice_desc: "Lectura cercana a una voz masculina",
    clone_voice_desc: "Tu perfil de voz creado anteriormente",
    updated_voice_setting: "Ajuste de voz actualizado",
    updated_system_lang: "Idioma del sistema actualizado",
    settings_note_1: "La configuración de voz se guarda con el sistema antiguo funcional usando la clave tts_voice. El idioma del sistema determina en qué idioma se muestran los textos de la app."
  }
};

function normalizeLang(lang) {
  const raw = String(lang || "tr").toLowerCase().trim();
  const base = raw.split("-")[0];
  return DICT[base] ? base : "tr";
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

export function t(key, fallback = "") {
  const lang = getSystemLang();
  return DICT[lang]?.[key] || DICT.tr?.[key] || fallback || key;
}

export function applySystemTranslations(root = document) {
  if (!root) return;

  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key, el.textContent || "");
  });

  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (!key) return;
    el.setAttribute("title", t(key, el.getAttribute("title") || ""));
    el.setAttribute("aria-label", t(key, el.getAttribute("aria-label") || ""));
  });
}

let __observerInstalled = false;

export function installAutoTranslate(root = document.body) {
  applySystemTranslations(root);

  if (__observerInstalled || !root) return;
  __observerInstalled = true;

  const obs = new MutationObserver(() => {
    applySystemTranslations(root);
  });

  obs.observe(root, {
    childList: true,
    subtree: true
  });
}
