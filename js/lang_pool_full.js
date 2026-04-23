export const LANG_POOL = [
  // Avrupa Dilleri
  { code:"tr", flag:"🇹🇷", region:"europe", featured:true },
  { code:"en", flag:"🇬🇧", region:"europe", featured:true },
  { code:"de", flag:"🇩🇪", region:"europe", featured:true },
  { code:"fr", flag:"🇫🇷", region:"europe", featured:true },
  { code:"it", flag:"🇮🇹", region:"europe", featured:true },
  { code:"es", flag:"🇪🇸", region:"europe", featured:true },
  { code:"pt", flag:"🇵🇹", region:"europe", featured:true },
  { code:"pt-br", flag:"🇧🇷", region:"americas", featured:true },
  { code:"nl", flag:"🇳🇱", region:"europe", featured:false },
  { code:"sv", flag:"🇸🇪", region:"europe", featured:false },
  { code:"no", flag:"🇳🇴", region:"europe", featured:false },
  { code:"da", flag:"🇩🇰", region:"europe", featured:false },
  { code:"fi", flag:"🇫🇮", region:"europe", featured:false },
  { code:"pl", flag:"🇵🇱", region:"europe", featured:false },
  { code:"cs", flag:"🇨🇿", region:"europe", featured:false },
  { code:"sk", flag:"🇸🇰", region:"europe", featured:false },
  { code:"hu", flag:"🇭🇺", region:"europe", featured:false },
  { code:"ro", flag:"🇷🇴", region:"europe", featured:false },
  { code:"bg", flag:"🇧🇬", region:"europe", featured:false },
  { code:"el", flag:"🇬🇷", region:"europe", featured:false },
  { code:"uk", flag:"🇺🇦", region:"europe", featured:false },
  { code:"ru", flag:"🇷🇺", region:"europe", featured:true },

  // Orta Doğu Dilleri
  { code:"ar", flag:"🇸🇦", region:"middle_east", featured:true },
  { code:"he", flag:"🇮🇱", region:"middle_east", featured:false },
  { code:"fa", flag:"🇮🇷", region:"middle_east", featured:true },
  { code:"ur", flag:"🇵🇰", region:"middle_east", featured:false },

  // Asya Dilleri
  { code:"hi", flag:"🇮🇳", region:"asia", featured:true },
  { code:"bn", flag:"🇧🇩", region:"asia", featured:false },
  { code:"id", flag:"🇮🇩", region:"asia", featured:false },
  { code:"ms", flag:"🇲🇾", region:"asia", featured:false },
  { code:"vi", flag:"🇻🇳", region:"asia", featured:false },
  { code:"th", flag:"🇹🇭", region:"asia", featured:false },
  { code:"zh", flag:"🇨🇳", region:"asia", featured:true },
  { code:"ja", flag:"🇯🇵", region:"asia", featured:true },
  { code:"ko", flag:"🇰🇷", region:"asia", featured:true },
  { code:"fil", flag:"🇵🇭", region:"asia", featured:false },
  { code:"mn", flag:"🇲🇳", region:"asia", featured:false },
  { code:"ne", flag:"🇳🇵", region:"asia", featured:false },
  { code:"si", flag:"🇱🇰", region:"asia", featured:false },
  { code:"ta", flag:"🇮🇳", region:"asia", featured:false },
  { code:"te", flag:"🇮🇳", region:"asia", featured:false },
  { code:"mr", flag:"🇮🇳", region:"asia", featured:false },
  { code:"gu", flag:"🇮🇳", region:"asia", featured:false },

  // Türk Dünyası Dilleri
  { code:"az", flag:"🇦🇿", region:"turkic", featured:true },
  { code:"kk", flag:"🇰🇿", region:"turkic", featured:true },
  { code:"ky", flag:"🇰🇬", region:"turkic", featured:true },
  { code:"uz", flag:"🇺🇿", region:"turkic", featured:true },
  { code:"tk", flag:"🇹🇲", region:"turkic", featured:true },

  // Kafkas / çevre
  { code:"ka", flag:"🇬🇪", region:"caucasus", featured:true },
  { code:"hy", flag:"🇦🇲", region:"caucasus", featured:false },
  { code:"tg", flag:"🇹🇯", region:"asia", featured:false },

  // Balkan Dilleri
  { code:"sr", flag:"🇷🇸", region:"balkans", featured:true },
  { code:"hr", flag:"🇭🇷", region:"balkans", featured:true },
  { code:"bs", flag:"🇧🇦", region:"balkans", featured:true },
  { code:"sl", flag:"🇸🇮", region:"balkans", featured:false },
  { code:"mk", flag:"🇲🇰", region:"balkans", featured:true },
  { code:"sq", flag:"🇦🇱", region:"balkans", featured:true },

  // Baltık / Avrupa devam
  { code:"et", flag:"🇪🇪", region:"europe", featured:false },
  { code:"lv", flag:"🇱🇻", region:"europe", featured:false },
  { code:"lt", flag:"🇱🇹", region:"europe", featured:false },

  // Afrika Dilleri
  { code:"af", flag:"🇿🇦", region:"africa", featured:true },
  { code:"sw", flag:"🇰🇪", region:"africa", featured:true },
  { code:"am", flag:"🇪🇹", region:"africa", featured:true },

  // Avrupa alt dilleri
  { code:"ca", flag:"🇪🇸", region:"europe", featured:false },
  { code:"eu", flag:"🇪🇸", region:"europe", featured:false },
  { code:"gl", flag:"🇪🇸", region:"europe", featured:false },
  { code:"is", flag:"🇮🇸", region:"europe", featured:false },
  { code:"ga", flag:"🇮🇪", region:"europe", featured:false },
  { code:"cy", flag:"🏴", region:"europe", featured:false }
];

const REGION_NAMES = {
  europe: "Avrupa Dilleri",
  americas: "Amerika Dilleri",
  asia: "Asya Dilleri",
  middle_east: "Orta Doğu Dilleri",
  africa: "Afrika Dilleri",
  balkans: "Balkan Dilleri",
  caucasus: "Kafkas Dilleri",
  turkic: "Türk Dünyası Dilleri",
  kurdish: "Kürt Dilleri"
};

const TR_NAMES = {
  tr:"Türkçe",
  en:"İngilizce",
  de:"Almanca",
  fr:"Fransızca",
  it:"İtalyanca",
  es:"İspanyolca",
  pt:"Portekizce",
  "pt-br":"Portekizce (Brezilya)",
  nl:"Hollandaca",
  sv:"İsveççe",
  no:"Norveççe",
  da:"Danca",
  fi:"Fince",
  pl:"Lehçe",
  cs:"Çekçe",
  sk:"Slovakça",
  hu:"Macarca",
  ro:"Rumence",
  bg:"Bulgarca",
  el:"Yunanca",
  uk:"Ukraynaca",
  ru:"Rusça",
  ar:"Arapça",
  he:"İbranice",
  fa:"Farsça",
  ur:"Urduca",
  hi:"Hintçe",
  bn:"Bengalce",
  id:"Endonezce",
  ms:"Malayca",
  vi:"Vietnamca",
  th:"Tayca",
  zh:"Çince",
  ja:"Japonca",
  ko:"Korece",
  az:"Azerbaycanca",
  ka:"Gürcüce",
  hy:"Ermenice",
  kk:"Kazakça",
  ky:"Kırgızca",
  uz:"Özbekçe",
  tk:"Türkmence",
  tg:"Tacikçe",
  sr:"Sırpça",
  hr:"Hırvatça",
  bs:"Boşnakça",
  sl:"Slovence",
  mk:"Makedonca",
  sq:"Arnavutça",
  et:"Estonca",
  lv:"Letonca",
  lt:"Litvanca",
  af:"Afrikanca",
  sw:"Svahili",
  am:"Amharca",
  ca:"Katalanca",
  eu:"Baskça",
  gl:"Galiçyaca",
  is:"İzlandaca",
  ga:"İrlandaca",
  cy:"Galce",
  fil:"Filipince",
  mn:"Moğolca",
  ne:"Nepalce",
  si:"Sinhala",
  ta:"Tamilce",
  te:"Teluguca",
  mr:"Marathi",
  gu:"Guceratça"
};

const BASE_NAMES = {
  tr: TR_NAMES,
  en: TR_NAMES,
  de: TR_NAMES,
  fr: TR_NAMES,
  it: TR_NAMES,
  es: TR_NAMES
};

export function getSiteLang() {
  try {
    const value = String(
      localStorage.getItem("site_lang") ||
      localStorage.getItem("system_lang") ||
      "tr"
    ).trim().toLowerCase();

    if (["tr", "en", "de", "fr", "it", "es"].includes(value)) return value;
  } catch {}
  return "tr";
}

export function getLangName(code, siteLang = getSiteLang()) {
  const c = String(code || "").trim().toLowerCase();
  const dict = BASE_NAMES[siteLang] || BASE_NAMES.tr;
  return dict[c] || BASE_NAMES.tr[c] || c.toUpperCase();
}

function normalizeExcludeCode(options = {}) {
  return String(
    options.excludeCode ||
    (options.excludeSiteLang ? getSiteLang() : "") ||
    ""
  ).trim().toLowerCase();
}

export function getLangPoolForSite(siteLang = getSiteLang(), options = {}) {
  const excludeCode = normalizeExcludeCode(options);

  return LANG_POOL
    .filter((item) => item.code !== excludeCode)
    .map((item) => ({
      code: item.code,
      flag: item.flag,
      region: item.region,
      regionName: REGION_NAMES[item.region] || "Diller",
      featured: !!item.featured,
      name: getLangName(item.code, siteLang)
    }));
}

export function getCategorizedLangPoolForSite(siteLang = getSiteLang(), options = {}) {
  const pool = getLangPoolForSite(siteLang, options);
  const groups = {};

  pool.forEach((item) => {
    const key = item.region || "other";
    if (!groups[key]) {
      groups[key] = {
        key,
        title: REGION_NAMES[key] || "Diller",
        items: []
      };
    }
    groups[key].items.push(item);
  });

  const order = ["europe", "americas", "asia", "middle_east", "africa", "balkans", "caucasus", "turkic", "kurdish"];

  return order
    .filter((key) => groups[key])
    .map((key) => groups[key]);
}

export function getFeaturedLangsForSite(siteLang = getSiteLang(), options = {}) {
  return getLangPoolForSite(siteLang, options).filter((item) => item.featured);
}
