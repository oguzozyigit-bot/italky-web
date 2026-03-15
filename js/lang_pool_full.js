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
  { code:"tg", flag:"🇹🇯" }
];


export const LANG_NAMES = {

tr:{
tr:"Türkçe",
en:"İngilizce",
de:"Almanca",
fr:"Fransızca",
it:"İtalyanca",
es:"İspanyolca",
ru:"Rusça",
el:"Yunanca",
az:"Azerice",
ka:"Gürcüce"
},

en:{
tr:"Turkish",
en:"English",
de:"German",
fr:"French",
it:"Italian",
es:"Spanish",
ru:"Russian",
el:"Greek",
az:"Azerbaijani",
ka:"Georgian"
},

de:{
tr:"Türkisch",
en:"Englisch",
de:"Deutsch",
fr:"Französisch",
it:"Italienisch",
es:"Spanisch",
ru:"Russisch",
el:"Griechisch",
az:"Aserbaidschanisch",
ka:"Georgisch"
},

fr:{
tr:"Turc",
en:"Anglais",
de:"Allemand",
fr:"Français",
it:"Italien",
es:"Espagnol",
ru:"Russe",
el:"Grec",
az:"Azerbaïdjanais",
ka:"Géorgien"
},

it:{
tr:"Turco",
en:"Inglese",
de:"Tedesco",
fr:"Francese",
it:"Italiano",
es:"Spagnolo",
ru:"Russo",
el:"Greco",
az:"Azero",
ka:"Georgiano"
},

es:{
tr:"Turco",
en:"Inglés",
de:"Alemán",
fr:"Francés",
it:"Italiano",
es:"Español",
ru:"Ruso",
el:"Griego",
az:"Azerí",
ka:"Georgiano"
}

};


export function getLangName(code){

const siteLang = localStorage.getItem("system_lang") || "tr";

const dict = LANG_NAMES[siteLang] || LANG_NAMES.tr;

return dict[code] || code.toUpperCase();

}
