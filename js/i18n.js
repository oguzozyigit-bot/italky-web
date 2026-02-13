// FILE: /js/i18n.js
// Simple i18n for italky (TR/EN/DE/IT/FR)

export const SITE_LANG_KEY = "italky_site_lang_v1";
export const SUPPORTED_SITE_LANGS = ["tr","en","de","it","fr"];

// ✅ MIGRATION: eski key'leri v1'e taşı (tek sefer)
(function migrateSiteLang(){
  try{
    const v1 = localStorage.getItem(SITE_LANG_KEY);
    if(v1) return;

    const legacyKeys = ["italky_site_lang", "italky_site_lang_v2"];
    for(const k of legacyKeys){
      const val = (localStorage.getItem(k) || "").trim().toLowerCase();
      if(val){
        localStorage.setItem(SITE_LANG_KEY, val);
        return;
      }
    }
  }catch{}
})();

const DICT = {
  tr: {
    // TITLES
    home_title: "italkyAI • Ana Menü",
    profile_title: "italkyAI • Profil",
    about_title: "Hakkımızda",
    faq_title: "SSS",
    privacy_title: "Gizlilik",
    contact_title: "İletişim",

    // HOME
    home_face_to_face: "Yüz Yüze",
    home_live_translate: "Canlı çeviri",
    home_text_translate: "Metinden",
    home_text_translate_sub: "Yazıdan çeviri",
    home_photo_translate: "Fotoğraf",
    home_overlay_translate: "Üstüne çevir",
    home_document_translate: "Belge",
    home_pdf_camera: "PDF / Kamera",
    home_chat_ai: "Sohbet AI",
    home_assistant: "Asistanın",
    home_talk_ai: "Konuşkan",
    home_voice_ai: "Sesli AI",
    home_teacher: "Dil Öğretmeni",
    home_pronounce_lessons: "Telaffuz ve ders",
    home_learn_fun: "Eğlenerek Öğren",
    home_games_quiz: "Oyun ve yarışma",

    // NAV
    nav_about: "Hakkında",
    nav_faq: "SSS",
    nav_privacy: "Gizlilik",
    nav_contact: "İletişim",

    // PROFILE
    profile_upgrade: "Üyelik Yükselt",
    profile_site_lang: "Site Dili",
    profile_site_lang_desc: "Şimdilik 5 dil",
    profile_upgrade_desc: "Premium özellikler",
    profile_secure_logout: "Güvenli Çıkış",
    profile_secure_logout_desc: "Oturumu kapat",
    profile_delete: "Hesabımı Sil",
    profile_delete_desc: "Geri alınamaz",
    profile_upgrade_btn: "Yükselt",
    profile_logout_btn: "Çıkış",
    profile_delete_btn: "Sil",
    profile_upgrade_toast: "Üyelik yükseltme yakında",
    profile_lang_saved: "Site dili kaydedildi",
    profile_delete_confirm: "Hesabını silmek istediğine emin misin?\nBu işlem geri alınamaz.",
    profile_deleted_local: "Hesap verileri cihazdan silindi.",

    // PAGES
    page_back: "Geri",
    about_body: "italkyAI; çeviri, konuşma ve dil öğrenimini tek yerde birleştiren bir dil platformudur.",
    faq_body: "Sık sorulan sorular yakında burada olacak.",
    privacy_body: "Gizlilik politikası yakında burada olacak.",
    contact_body: "Bize ulaşmak için:",
    contact_email_label: "E-posta",

    // EXTRA (kullandığımız ortaklar)
    remaining_tokens: "Kalan Token",
    buy_tokens: "Token Satın Al",
    offline_packs: "Offline Paketler",
    download_language: "Dil İndir",
    are_you_sure: "Emin misiniz?",
    cannot_undo: "Bu işlem geri alınamaz.",
    cancel: "Vazgeç",
    yes_delete: "Evet, Sil",
    key_copied: "KEY kopyalandı",
    profile_copy_key: "KOPYALA",
    profile_token_wallet: "Token Cüzdan",
    profile_token_desc: "Ders ve paketler token ile çalışır",
    profile_offline_desc: "İndirilen diller",
    profile_gift: "Hediye",
    profile_gift_10: "İlk giriş: 10",
  },

  en: {
    home_title: "italkyAI • Home",
    profile_title: "italkyAI • Profile",
    about_title: "About",
    faq_title: "FAQ",
    privacy_title: "Privacy",
    contact_title: "Contact",

    home_face_to_face: "Face to Face",
    home_live_translate: "Live translation",
    home_text_translate: "Text",
    home_text_translate_sub: "Translate text",
    home_photo_translate: "Photo",
    home_overlay_translate: "On-image",
    home_document_translate: "Document",
    home_pdf_camera: "PDF / Camera",
    home_chat_ai: "Chat AI",
    home_assistant: "Your assistant",
    home_talk_ai: "Talk AI",
    home_voice_ai: "Voice AI",
    home_teacher: "Language Teacher",
    home_pronounce_lessons: "Pronunciation & lessons",
    home_learn_fun: "Learn by Playing",
    home_games_quiz: "Games & quiz",

    nav_about: "About",
    nav_faq: "FAQ",
    nav_privacy: "Privacy",
    nav_contact: "Contact",

    profile_upgrade: "Upgrade",
    profile_site_lang: "Site Language",
    profile_site_lang_desc: "5 languages for now",
    profile_upgrade_desc: "Premium features",
    profile_secure_logout: "Secure Logout",
    profile_secure_logout_desc: "Sign out",
    profile_delete: "Delete Account",
    profile_delete_desc: "Cannot be undone",
    profile_upgrade_btn: "Upgrade",
    profile_logout_btn: "Logout",
    profile_delete_btn: "Delete",
    profile_upgrade_toast: "Upgrade is coming soon",
    profile_lang_saved: "Language saved",
    profile_delete_confirm: "Are you sure you want to delete your account?\nThis cannot be undone.",
    profile_deleted_local: "Account data removed from this device.",

    page_back: "Back",
    about_body: "italkyAI is a language platform that combines translation, speaking, and learning in one place.",
    faq_body: "Frequently asked questions will appear here soon.",
    privacy_body: "Privacy policy will appear here soon.",
    contact_body: "Contact us at:",
    contact_email_label: "Email",

    remaining_tokens: "Remaining Tokens",
    buy_tokens: "Buy Tokens",
    offline_packs: "Offline Packs",
    download_language: "Download Language",
    are_you_sure: "Are you sure?",
    cannot_undo: "This action cannot be undone.",
    cancel: "Cancel",
    yes_delete: "Yes, Delete",
    key_copied: "KEY copied",
    profile_copy_key: "COPY",
    profile_token_wallet: "Token Wallet",
    profile_token_desc: "Lessons and packs use tokens",
    profile_offline_desc: "Downloaded languages",
    profile_gift: "Gift",
    profile_gift_10: "First login: 10",
  },

  de: { /* (senin mevcut de bloğun aynen kalabilir) */ ...DICT?.de },
  it: { /* (senin mevcut it bloğun aynen kalabilir) */ ...DICT?.it },
  fr: { /* (senin mevcut fr bloğun aynen kalabilir) */ ...DICT?.fr },
};

// ⚠️ NOT:
// Yukarıdaki "de/it/fr" satırlarını senin eski dosyandaki de/it/fr bloklarıyla değiştir.
// Burada kısaltmak için yazdım. Aşağıdaki fonksiyonlar asıl kritik kısım.

export function getSiteLang(){
  const v = (localStorage.getItem(SITE_LANG_KEY) || "tr").trim().toLowerCase();
  return SUPPORTED_SITE_LANGS.includes(v) ? v : "tr";
}

export function setSiteLang(lang){
  const v = String(lang||"tr").trim().toLowerCase();
  const safe = SUPPORTED_SITE_LANGS.includes(v) ? v : "tr";
  localStorage.setItem(SITE_LANG_KEY, safe);
  try{ document.documentElement.lang = safe; }catch{}
  return safe;
}

export function t(key){
  const lang = getSiteLang();
  return (DICT[lang] && DICT[lang][key]) || (DICT.tr[key] || key);
}

export function applyI18n(root = document){
  const lang = getSiteLang();
  try{ document.documentElement.lang = lang; }catch{}

  root.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if(key) el.textContent = t(key);
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{
    const key = el.getAttribute("data-i18n-placeholder");
    if(key) el.setAttribute("placeholder", t(key));
  });
}
