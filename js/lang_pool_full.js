// FILE: /js/lang_pool_full.js

export const LANG_POOL = [
  { code:"tr", flag:"🇹🇷" },
  { code:"en", flag:"🇬🇧" },
  { code:"de", flag:"🇩🇪" },
  { code:"fr", flag:"🇫🇷" },
  { code:"it", flag:"🇮🇹" },
  { code:"es", flag:"🇪🇸" },
  { code:"pt", flag:"🇵🇹" },
  { code:"pt-br", flag:"🇧🇷" },
  { code:"nl", flag:"🇳🇱" },
  { code:"sv", flag:"🇸🇪" },
  { code:"no", flag:"🇳🇴" },
  { code:"da", flag:"🇩🇰" },
  { code:"fi", flag:"🇫🇮" },
  { code:"pl", flag:"🇵🇱" },
  { code:"cs", flag:"🇨🇿" },
  { code:"sk", flag:"🇸🇰" },
  { code:"hu", flag:"🇭🇺" },
  { code:"ro", flag:"🇷🇴" },
  { code:"bg", flag:"🇧🇬" },
  { code:"el", flag:"🇬🇷" },
  { code:"uk", flag:"🇺🇦" },
  { code:"ru", flag:"🇷🇺" },

  { code:"ar", flag:"🇸🇦" },
  { code:"he", flag:"🇮🇱" },
  { code:"fa", flag:"🇮🇷" },
  { code:"ur", flag:"🇵🇰" },
  { code:"hi", flag:"🇮🇳" },
  { code:"bn", flag:"🇧🇩" },

  { code:"id", flag:"🇮🇩" },
  { code:"ms", flag:"🇲🇾" },
  { code:"vi", flag:"🇻🇳" },
  { code:"th", flag:"🇹🇭" },
  { code:"zh", flag:"🇨🇳" },
  { code:"ja", flag:"🇯🇵" },
  { code:"ko", flag:"🇰🇷" },

  { code:"az", flag:"🇦🇿" },
  { code:"ka", flag:"🇬🇪" },
  { code:"hy", flag:"🇦🇲" },
  { code:"kk", flag:"🇰🇿" },
  { code:"ky", flag:"🇰🇬" },
  { code:"uz", flag:"🇺🇿" },
  { code:"tk", flag:"🇹🇲" },
  { code:"tg", flag:"🇹🇯" },

  { code:"sr", flag:"🇷🇸" },
  { code:"hr", flag:"🇭🇷" },
  { code:"bs", flag:"🇧🇦" },
  { code:"sl", flag:"🇸🇮" },
  { code:"mk", flag:"🇲🇰" },
  { code:"sq", flag:"🇦🇱" },

  { code:"et", flag:"🇪🇪" },
  { code:"lv", flag:"🇱🇻" },
  { code:"lt", flag:"🇱🇹" },

  { code:"af", flag:"🇿🇦" },
  { code:"sw", flag:"🇰🇪" },
  { code:"am", flag:"🇪🇹" },

  { code:"ca", flag:"🇪🇸" },
  { code:"eu", flag:"🇪🇸" },
  { code:"gl", flag:"🇪🇸" },

  { code:"is", flag:"🇮🇸" },
  { code:"ga", flag:"🇮🇪" },
  { code:"cy", flag:"🏴" },

  { code:"fil", flag:"🇵🇭" },
  { code:"mn", flag:"🇲🇳" },
  { code:"ne", flag:"🇳🇵" },
  { code:"si", flag:"🇱🇰" },
  { code:"ta", flag:"🇮🇳" },
  { code:"te", flag:"🇮🇳" },
  { code:"mr", flag:"🇮🇳" },
  { code:"gu", flag:"🇮🇳" }
];

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
    const value = String(localStorage.getItem("system_lang") || "tr").trim().toLowerCase();
    if (["tr", "en", "de", "fr", "it", "es"].includes(value)) return value;
  } catch {}
  return "tr";
}

export function getLangName(code, siteLang = getSiteLang()) {
  const c = String(code || "").trim().toLowerCase();
  const dict = BASE_NAMES[siteLang] || BASE_NAMES.tr;
  return dict[c] || BASE_NAMES.tr[c] || c.toUpperCase();
}

export function getLangPoolForSite(siteLang = getSiteLang()) {
  return LANG_POOL.map((item) => ({
    code: item.code,
    flag: item.flag,
    name: getLangName(item.code, siteLang)
  }));
}
