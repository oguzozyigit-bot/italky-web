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

const BASE_NAMES = {
  tr: { tr:"Türkçe", en:"English", de:"Deutsch", fr:"Français", it:"Italiano", es:"Español", pt:"Português", "pt-br":"Português (BR)", nl:"Nederlands", sv:"Svenska", no:"Norsk", da:"Dansk", fi:"Suomi", pl:"Polski", cs:"Čeština", sk:"Slovenčina", hu:"Magyar", ro:"Română", bg:"Български", el:"Ελληνικά", uk:"Українська", ru:"Русский", ar:"العربية", he:"עברית", fa:"فارسی", ur:"اردو", hi:"हिन्दी", bn:"বাংলা", id:"Bahasa Indonesia", ms:"Bahasa Melayu", vi:"Tiếng Việt", th:"ไทย", zh:"中文", ja:"日本語", ko:"한국어", az:"Azərbaycan dili", ka:"ქართული", hy:"Հայերեն", kk:"Қазақша", ky:"Кыргызча", uz:"Oʻzbekcha", tk:"Türkmençe", tg:"Тоҷикӣ", sr:"Srpski", hr:"Hrvatski", bs:"Bosanski", sl:"Slovenščina", mk:"Македонски", sq:"Shqip", et:"Eesti", lv:"Latviešu", lt:"Lietuvių", af:"Afrikaans", sw:"Kiswahili", am:"አማርኛ", ca:"Català", eu:"Euskara", gl:"Galego", is:"Íslenska", ga:"Gaeilge", cy:"Cymraeg", fil:"Filipino", mn:"Монгол", ne:"नेपाली", si:"සිංහල", ta:"தமிழ்", te:"తెలుగు", mr:"मराठी", gu:"ગુજરાતી" },

  en: { tr:"Turkish", en:"English", de:"German", fr:"French", it:"Italian", es:"Spanish", pt:"Portuguese", "pt-br":"Portuguese (BR)", nl:"Dutch", sv:"Swedish", no:"Norwegian", da:"Danish", fi:"Finnish", pl:"Polish", cs:"Czech", sk:"Slovak", hu:"Hungarian", ro:"Romanian", bg:"Bulgarian", el:"Greek", uk:"Ukrainian", ru:"Russian", ar:"Arabic", he:"Hebrew", fa:"Persian", ur:"Urdu", hi:"Hindi", bn:"Bengali", id:"Indonesian", ms:"Malay", vi:"Vietnamese", th:"Thai", zh:"Chinese", ja:"Japanese", ko:"Korean", az:"Azerbaijani", ka:"Georgian", hy:"Armenian", kk:"Kazakh", ky:"Kyrgyz", uz:"Uzbek", tk:"Turkmen", tg:"Tajik", sr:"Serbian", hr:"Croatian", bs:"Bosnian", sl:"Slovenian", mk:"Macedonian", sq:"Albanian", et:"Estonian", lv:"Latvian", lt:"Lithuanian", af:"Afrikaans", sw:"Swahili", am:"Amharic", ca:"Catalan", eu:"Basque", gl:"Galician", is:"Icelandic", ga:"Irish", cy:"Welsh", fil:"Filipino", mn:"Mongolian", ne:"Nepali", si:"Sinhala", ta:"Tamil", te:"Telugu", mr:"Marathi", gu:"Gujarati" },

  de: { tr:"Türkisch", en:"Englisch", de:"Deutsch", fr:"Französisch", it:"Italienisch", es:"Spanisch", pt:"Portugiesisch", "pt-br":"Portugiesisch (BR)", nl:"Niederländisch", sv:"Schwedisch", no:"Norwegisch", da:"Dänisch", fi:"Finnisch", pl:"Polnisch", cs:"Tschechisch", sk:"Slowakisch", hu:"Ungarisch", ro:"Rumänisch", bg:"Bulgarisch", el:"Griechisch", uk:"Ukrainisch", ru:"Russisch", ar:"Arabisch", he:"Hebräisch", fa:"Persisch", ur:"Urdu", hi:"Hindi", bn:"Bengalisch", id:"Indonesisch", ms:"Malaiisch", vi:"Vietnamesisch", th:"Thailändisch", zh:"Chinesisch", ja:"Japanisch", ko:"Koreanisch", az:"Aserbaidschanisch", ka:"Georgisch", hy:"Armenisch", kk:"Kasachisch", ky:"Kirgisisch", uz:"Usbekisch", tk:"Turkmenisch", tg:"Tadschikisch", sr:"Serbisch", hr:"Kroatisch", bs:"Bosnisch", sl:"Slowenisch", mk:"Mazedonisch", sq:"Albanisch", et:"Estnisch", lv:"Lettisch", lt:"Litauisch", af:"Afrikaans", sw:"Suaheli", am:"Amharisch", ca:"Katalanisch", eu:"Baskisch", gl:"Galicisch", is:"Isländisch", ga:"Irisch", cy:"Walisisch", fil:"Filipino", mn:"Mongolisch", ne:"Nepalesisch", si:"Singhalesisch", ta:"Tamil", te:"Telugu", mr:"Marathi", gu:"Gujarati" },

  fr: { tr:"Turc", en:"Anglais", de:"Allemand", fr:"Français", it:"Italien", es:"Espagnol", pt:"Portugais", "pt-br":"Portugais (BR)", nl:"Néerlandais", sv:"Suédois", no:"Norvégien", da:"Danois", fi:"Finnois", pl:"Polonais", cs:"Tchèque", sk:"Slovaque", hu:"Hongrois", ro:"Roumain", bg:"Bulgare", el:"Grec", uk:"Ukrainien", ru:"Russe", ar:"Arabe", he:"Hébreu", fa:"Persan", ur:"Ourdou", hi:"Hindi", bn:"Bengali", id:"Indonésien", ms:"Malais", vi:"Vietnamien", th:"Thaï", zh:"Chinois", ja:"Japonais", ko:"Coréen", az:"Azerbaïdjanais", ka:"Géorgien", hy:"Arménien", kk:"Kazakh", ky:"Kirghiz", uz:"Ouzbek", tk:"Turkmène", tg:"Tadjik", sr:"Serbe", hr:"Croate", bs:"Bosnien", sl:"Slovène", mk:"Macédonien", sq:"Albanais", et:"Estonien", lv:"Letton", lt:"Lituanien", af:"Afrikaans", sw:"Swahili", am:"Amharique", ca:"Catalan", eu:"Basque", gl:"Galicien", is:"Islandais", ga:"Irlandais", cy:"Gallois", fil:"Filipino", mn:"Mongol", ne:"Népalais", si:"Cinghalais", ta:"Tamoul", te:"Télougou", mr:"Marathi", gu:"Gujarati" },

  it: { tr:"Turco", en:"Inglese", de:"Tedesco", fr:"Francese", it:"Italiano", es:"Spagnolo", pt:"Portoghese", "pt-br":"Portoghese (BR)", nl:"Olandese", sv:"Svedese", no:"Norvegese", da:"Danese", fi:"Finlandese", pl:"Polacco", cs:"Ceco", sk:"Slovacco", hu:"Ungherese", ro:"Rumeno", bg:"Bulgaro", el:"Greco", uk:"Ucraino", ru:"Russo", ar:"Arabo", he:"Ebraico", fa:"Persiano", ur:"Urdu", hi:"Hindi", bn:"Bengalese", id:"Indonesiano", ms:"Malese", vi:"Vietnamita", th:"Thailandese", zh:"Cinese", ja:"Giapponese", ko:"Coreano", az:"Azero", ka:"Georgiano", hy:"Armeno", kk:"Kazako", ky:"Kirghiso", uz:"Uzbeco", tk:"Turkmeno", tg:"Tagico", sr:"Serbo", hr:"Croato", bs:"Bosniaco", sl:"Sloveno", mk:"Macedone", sq:"Albanese", et:"Estone", lv:"Lettone", lt:"Lituano", af:"Afrikaans", sw:"Swahili", am:"Amarico", ca:"Catalano", eu:"Basco", gl:"Galiziano", is:"Islandese", ga:"Irlandese", cy:"Gallese", fil:"Filippino", mn:"Mongolo", ne:"Nepalese", si:"Singalese", ta:"Tamil", te:"Telugu", mr:"Marathi", gu:"Gujarati" },

  es: { tr:"Turco", en:"Inglés", de:"Alemán", fr:"Francés", it:"Italiano", es:"Español", pt:"Portugués", "pt-br":"Portugués (BR)", nl:"Neerlandés", sv:"Sueco", no:"Noruego", da:"Danés", fi:"Finés", pl:"Polaco", cs:"Checo", sk:"Eslovaco", hu:"Húngaro", ro:"Rumano", bg:"Búlgaro", el:"Griego", uk:"Ucraniano", ru:"Ruso", ar:"Árabe", he:"Hebreo", fa:"Persa", ur:"Urdu", hi:"Hindi", bn:"Bengalí", id:"Indonesio", ms:"Malayo", vi:"Vietnamita", th:"Tailandés", zh:"Chino", ja:"Japonés", ko:"Coreano", az:"Azerí", ka:"Georgiano", hy:"Armenio", kk:"Kazajo", ky:"Kirguís", uz:"Uzbeko", tk:"Turcomano", tg:"Tayiko", sr:"Serbio", hr:"Croata", bs:"Bosnio", sl:"Esloveno", mk:"Macedonio", sq:"Albanés", et:"Estonio", lv:"Letón", lt:"Lituano", af:"Afrikáans", sw:"Suajili", am:"Amhárico", ca:"Catalán", eu:"Euskera", gl:"Gallego", is:"Islandés", ga:"Irlandés", cy:"Galés", fil:"Filipino", mn:"Mongol", ne:"Nepalí", si:"Cingalés", ta:"Tamil", te:"Telugu", mr:"Maratí", gu:"Gujarati" }
};

export function getSiteLang() {
  try {
    const value = String(localStorage.getItem("system_lang") || "tr").trim().toLowerCase();
    if (["tr","en","de","fr","it","es"].includes(value)) return value;
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
