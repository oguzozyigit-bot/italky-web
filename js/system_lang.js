// FILE: /js/system_lang.js

const SYSTEM_LANG_KEY = "system_lang";

const DICT = {
  tr: {
    app_name: "italkyAI",
    translation_settings: "Çeviri Ayarları",
    translation_settings_desc: "Ses ayarlarını ve sistem dilini buradan yönet.",
    preferences: "Tercihler",
    voice_settings: "Ses Ayarları",
    voice_settings_desc: "Bu ayar FaceToFace ve SideToSide modüllerinde kullanılacak.",
    system_language: "Sistem Dili",
    system_language_desc: "Türkçe arayüz metinlerini seçtiğin dile otomatik çevirir.",
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
    select_option: "Seçim",
    back: "Geri dön",
    profile: "Profil",
    token_market: "Jeton Market",
    current_balance: "Mevcut Bakiye",
    available_tokens: "Hesabındaki kullanılabilir jeton",
    token_what_is: "Jeton nedir?",
    voice_profile: "Ses Profili",
    introduce_your_voice: "Sesini Tanıt",
    introduce_your_voice_desc: "Kısa cümleleri okuyarak kendine özel ses profilini oluştur.",
    progress: "İLERLEME",
    completed: "Tamamlananlar",
    next_sentence: "Sonraki Cümle",
    save_and_finish: "Kaydet ve Tamamla",
    cancel: "Vazgeç",
    tap_mic_to_start: "Mikrofona dokun ve başla"
  },

  en: {
    app_name: "italkyAI",
    translation_settings: "Translation Settings",
    translation_settings_desc: "Manage voice settings and system language here.",
    preferences: "Preferences",
    voice_settings: "Voice Settings",
    voice_settings_desc: "This setting will be used in FaceToFace and SideToSide modules.",
    system_language: "System Language",
    system_language_desc: "Automatically translates Turkish interface texts into your selected language.",
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
    select_option: "Select",
    back: "Back",
    profile: "Profile",
    token_market: "Token Market",
    current_balance: "Current Balance",
    available_tokens: "Available tokens in your account",
    token_what_is: "What is a token?",
    voice_profile: "Voice Profile",
    introduce_your_voice: "Create Your Voice",
    introduce_your_voice_desc: "Build your personal voice profile by reading short sentences.",
    progress: "PROGRESS",
    completed: "Completed",
    next_sentence: "Next Sentence",
    save_and_finish: "Save and Finish",
    cancel: "Cancel",
    tap_mic_to_start: "Tap the microphone to start"
  },

  de: {
    app_name: "italkyAI",
    translation_settings: "Übersetzungseinstellungen",
    translation_settings_desc: "Verwalte hier Stimmeinstellungen und Systemsprache.",
    preferences: "Einstellungen",
    voice_settings: "Stimmeinstellungen",
    voice_settings_desc: "Diese Einstellung wird in FaceToFace und SideToSide verwendet.",
    system_language: "Systemsprache",
    system_language_desc: "Übersetzt türkische Oberflächentexte automatisch in die gewählte Sprache.",
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
    select_option: "Auswahl",
    back: "Zurück",
    profile: "Profil",
    token_market: "Token Markt",
    current_balance: "Aktueller Kontostand",
    available_tokens: "Verfügbare Token in deinem Konto",
    token_what_is: "Was ist ein Token?",
    voice_profile: "Sprachprofil",
    introduce_your_voice: "Stimme einrichten",
    introduce_your_voice_desc: "Erstelle dein persönliches Sprachprofil, indem du kurze Sätze liest.",
    progress: "FORTSCHRITT",
    completed: "Abgeschlossen",
    next_sentence: "Nächster Satz",
    save_and_finish: "Speichern und Abschließen",
    cancel: "Abbrechen",
    tap_mic_to_start: "Tippe auf das Mikrofon, um zu starten"
  },

  fr: {
    app_name: "italkyAI",
    translation_settings: "Paramètres de traduction",
    translation_settings_desc: "Gérez ici les paramètres vocaux et la langue du système.",
    preferences: "Préférences",
    voice_settings: "Paramètres vocaux",
    voice_settings_desc: "Ce réglage sera utilisé dans FaceToFace et SideToSide.",
    system_language: "Langue du système",
    system_language_desc: "Traduit automatiquement les textes turcs de l’interface dans la langue choisie.",
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
    select_option: "Sélection",
    back: "Retour",
    profile: "Profil",
    token_market: "Marché des jetons",
    current_balance: "Solde actuel",
    available_tokens: "Jetons disponibles dans votre compte",
    token_what_is: "Qu’est-ce qu’un jeton ?",
    voice_profile: "Profil vocal",
    introduce_your_voice: "Présente ta voix",
    introduce_your_voice_desc: "Crée ton profil vocal personnel en lisant de courtes phrases.",
    progress: "PROGRESSION",
    completed: "Terminés",
    next_sentence: "Phrase suivante",
    save_and_finish: "Enregistrer et terminer",
    cancel: "Annuler",
    tap_mic_to_start: "Touchez le micro pour commencer"
  },

  it: {
    app_name: "italkyAI",
    translation_settings: "Impostazioni traduzione",
    translation_settings_desc: "Gestisci qui le impostazioni vocali e la lingua del sistema.",
    preferences: "Preferenze",
    voice_settings: "Impostazioni voce",
    voice_settings_desc: "Questa impostazione sarà usata nei moduli FaceToFace e SideToSide.",
    system_language: "Lingua di sistema",
    system_language_desc: "Traduce automaticamente i testi turchi dell’interfaccia nella lingua scelta.",
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
    select_option: "Selezione",
    back: "Indietro",
    profile: "Profilo",
    token_market: "Mercato Token",
    current_balance: "Saldo attuale",
    available_tokens: "Token disponibili nel tuo account",
    token_what_is: "Cos'è un token?",
    voice_profile: "Profilo vocale",
    introduce_your_voice: "Presenta la tua voce",
    introduce_your_voice_desc: "Crea il tuo profilo vocale leggendo brevi frasi.",
    progress: "AVANZAMENTO",
    completed: "Completati",
    next_sentence: "Frase successiva",
    save_and_finish: "Salva e termina",
    cancel: "Annulla",
    tap_mic_to_start: "Tocca il microfono per iniziare"
  },

  es: {
    app_name: "italkyAI",
    translation_settings: "Ajustes de traducción",
    translation_settings_desc: "Administra aquí la voz y el idioma del sistema.",
    preferences: "Preferencias",
    voice_settings: "Ajustes de voz",
    voice_settings_desc: "Esta opción se usará en FaceToFace y SideToSide.",
    system_language: "Idioma del sistema",
    system_language_desc: "Traduce automáticamente los textos turcos de la interfaz al idioma elegido.",
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
    select_option: "Selección",
    back: "Volver",
    profile: "Perfil",
    token_market: "Mercado de fichas",
    current_balance: "Saldo actual",
    available_tokens: "Fichas disponibles en tu cuenta",
    token_what_is: "¿Qué es una ficha?",
    voice_profile: "Perfil de voz",
    introduce_your_voice: "Presenta tu voz",
    introduce_your_voice_desc: "Crea tu perfil de voz leyendo frases cortas.",
    progress: "PROGRESO",
    completed: "Completados",
    next_sentence: "Siguiente frase",
    save_and_finish: "Guardar y finalizar",
    cancel: "Cancelar",
    tap_mic_to_start: "Toca el micrófono para comenzar"
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
  if (lang === "tr") {
    return DICT.tr[key] || fallback || key;
  }
  return DICT[lang]?.[key] || DICT.tr[key] || fallback || key;
}

export function applySystemTranslations(root = document) {
  if (!root) return;

  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key, el.textContent || "");
  });

  root.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (!key) return;
    el.innerHTML = t(key, el.innerHTML || "");
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    el.setAttribute("placeholder", t(key, el.getAttribute("placeholder") || ""));
  });

  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (!key) return;
    el.setAttribute("title", t(key, el.getAttribute("title") || ""));
  });
}

export function getSystemLangDict() {
  const lang = getSystemLang();
  return DICT[lang] || DICT.tr;
}
