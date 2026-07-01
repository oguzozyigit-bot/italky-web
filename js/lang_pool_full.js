/* FILE: /js/lang_pool_full.js */

import { LANGUAGE_REGISTRY_129 } from "/js/language_registry_129.js";

/** Supabase ONNX offline — 129 display langs (dialect clone). */
const OFFLINE_CODE_SET = new Set(
  LANGUAGE_REGISTRY_129.flatMap((e) => [e.code, e.code.split("-")[0], e.parent])
);

export const LANG_POOL = [
  // Avrupa Dilleri
  { code: "tr", flag: "🇹🇷", region: "europe", featured: true },
  { code: "en", flag: "🇬🇧", region: "europe", featured: true },
  { code: "de", flag: "🇩🇪", region: "europe", featured: true },
  { code: "fr", flag: "🇫🇷", region: "europe", featured: true },
  { code: "it", flag: "🇮🇹", region: "europe", featured: true },
  { code: "es", flag: "🇪🇸", region: "europe", featured: true },
  { code: "pt", flag: "🇵🇹", region: "europe", featured: true },
  { code: "nl", flag: "🇳🇱", region: "europe", featured: false },
  { code: "sv", flag: "🇸🇪", region: "europe", featured: false },
  { code: "no", flag: "🇳🇴", region: "europe", featured: false },
  { code: "da", flag: "🇩🇰", region: "europe", featured: false },
  { code: "fi", flag: "🇫🇮", region: "europe", featured: false },
  { code: "pl", flag: "🇵🇱", region: "europe", featured: false },
  { code: "cs", flag: "🇨🇿", region: "europe", featured: false },
  { code: "sk", flag: "🇸🇰", region: "europe", featured: false },
  { code: "hu", flag: "🇭🇺", region: "europe", featured: false },
  { code: "ro", flag: "🇷🇴", region: "europe", featured: false },
  { code: "bg", flag: "🇧🇬", region: "europe", featured: false },
  { code: "el", flag: "🇬🇷", region: "europe", featured: false },
  { code: "uk", flag: "🇺🇦", region: "europe", featured: false },
  { code: "ru", flag: "🇷🇺", region: "europe", featured: true },

  // Orta Doğu & Doğu Avrupa
  { code: "ar", flag: "🇸🇦", region: "middle_east", featured: true },
  { code: "he", flag: "🇮🇱", region: "middle_east", featured: false },
  { code: "fa", flag: "🇮🇷", region: "middle_east", featured: true },
  { code: "ur", flag: "🇵🇰", region: "middle_east", featured: false },

  // Asya Dilleri
  { code: "hi", flag: "🇮🇳", region: "asia", featured: true },
  { code: "bn", flag: "🇧🇩", region: "asia", featured: false },
  { code: "id", flag: "🇮🇩", region: "asia", featured: false },
  { code: "ms", flag: "🇲🇾", region: "asia", featured: false },
  { code: "vi", flag: "🇻🇳", region: "asia", featured: false },
  { code: "th", flag: "🇹🇭", region: "asia", featured: false },
  { code: "zh", flag: "🇨🇳", region: "asia", featured: true },
  { code: "ja", flag: "🇯🇵", region: "asia", featured: true },
  { code: "ko", flag: "🇰🇷", region: "asia", featured: true },
  { code: "fil", flag: "🇵🇭", region: "asia", featured: false },
  { code: "mr", flag: "🇮🇳", region: "asia", featured: false },
  { code: "ta", flag: "🇮🇳", region: "asia", featured: false },
  { code: "te", flag: "🇮🇳", region: "asia", featured: false },
  { code: "gu", flag: "🇮🇳", region: "asia", featured: false },
  { code: "kn", flag: "🇮🇳", region: "asia", featured: false },

  // Türk Dünyası Dilleri (Cloud Only)
  { code: "az", flag: "🇦🇿", region: "turkic", featured: true },
  { code: "kk", flag: "🇰🇿", region: "turkic", featured: true },
  { code: "ky", flag: "🇰🇬", region: "turkic", featured: true },
  { code: "uz", flag: "🇺🇿", region: "turkic", featured: true },
  { code: "tk", flag: "🇹🇲", region: "turkic", featured: true },

  // Kafkas / Çevre
  { code: "ka", flag: "🇬🇪", region: "caucasus", featured: true },
  { code: "hy", flag: "🇦🇲", region: "caucasus", featured: false },

  // Balkan Dilleri
  { code: "sr", flag: "🇷🇸", region: "balkans", featured: true },
  { code: "hr", flag: "🇭🇷", region: "balkans", featured: true },
  { code: "bs", flag: "🇧🇦", region: "balkans", featured: true },
  { code: "sl", flag: "🇸🇮", region: "balkans", featured: false },
  { code: "mk", flag: "🇲🇰", region: "balkans", featured: true },
  { code: "sq", flag: "🇦🇱", region: "balkans", featured: true },

  // Baltık
  { code: "et", flag: "🇪🇪", region: "europe", featured: false },
  { code: "lv", flag: "🇱🇻", region: "europe", featured: false },
  { code: "lt", flag: "🇱🇹", region: "europe", featured: false },

  // Afrika
  { code: "af", flag: "🇿🇦", region: "africa", featured: true },
  { code: "sw", flag: "🇰🇪", region: "africa", featured: true }
].map(lang => ({
  ...lang,
  // Registry 129: Supabase ONNX offline destekli dil
  canOffline: OFFLINE_CODE_SET.has(lang.code)
}));

const REGION_NAMES = {
  europe: "Avrupa Dilleri",
  asia: "Asya Dilleri",
  middle_east: "Orta Doğu Dilleri",
  africa: "Afrika Dilleri",
  balkans: "Balkan Dilleri",
  caucasus: "Kafkas Dilleri",
  turkic: "Türk Dünyası Dilleri"
};

const TR_NAMES = {
  tr: "Türkçe", en: "İngilizce", de: "Almanca", fr: "Fransızca", it: "İtalyanca",
  es: "İspanyolca", pt: "Portekizce", nl: "Hollandaca", sv: "İsveççe", no: "Norveççe",
  da: "Danca", fi: "Fince", pl: "Lehçe", cs: "Çekçe", sk: "Slovakça", hu: "Macarca",
  ro: "Rumence", bg: "Bulgarca", el: "Yunanca", uk: "Ukraynaca", ru: "Rusça",
  ar: "Arapça", he: "İbranice", fa: "Farsça", ur: "Urduca", hi: "Hintçe",
  bn: "Bengalce", id: "Endonezce", ms: "Malayca", vi: "Vietnamca", th: "Tayca",
  zh: "Çince", ja: "Japonca", ko: "Korece", fil: "Filipince", mr: "Marathi",
  ta: "Tamilce", te: "Teluguca", gu: "Guceratça", kn: "Kannada", az: "Azerbaycanca",
  kk: "Kazakça", ky: "Kırgızca", uz: "Özbekçe", tk: "Türkmence", ka: "Gürcüce",
  hy: "Ermenice", sr: "Sırpça", hr: "Hırvatça", bs: "Boşnakça", sl: "Slovence",
  mk: "Makedonca", sq: "Arnavutça", et: "Estonca", lv: "Letonca", lt: "Litvanca",
  af: "Afrikanca", sw: "Svahili"
};

const BASE_NAMES = {
  tr: TR_NAMES, en: TR_NAMES, de: TR_NAMES, fr: TR_NAMES, it: TR_NAMES, es: TR_NAMES
};

export function getSiteLang() {
  try {
    const value = String(localStorage.getItem("site_lang") || "tr").trim().toLowerCase();
    return ["tr", "en", "de", "fr", "it", "es"].includes(value) ? value : "tr";
  } catch { return "tr"; }
}

export function getLangName(code, siteLang = getSiteLang()) {
  const c = String(code || "").trim().toLowerCase();
  const dict = BASE_NAMES[siteLang] || BASE_NAMES.tr;
  return dict[c] || BASE_NAMES.tr[c] || c.toUpperCase();
}

export function getLangPoolForSite(siteLang = getSiteLang(), options = {}) {
  const excludeCode = String(options.excludeCode || "").trim().toLowerCase();
  return LANG_POOL
    .filter((item) => item.code !== excludeCode)
    .map((item) => ({
      ...item,
      regionName: REGION_NAMES[item.region] || "Diller",
      name: getLangName(item.code, siteLang)
    }));
}
