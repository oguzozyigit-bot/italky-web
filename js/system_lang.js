// FILE: /js/system_lang.js

const SYSTEM_LANG_KEY = "system_lang";

/* =========================
   Desteklenen diller
========================= */
const SUPPORTED = ["tr","en","de","fr","it","es"];

/* =========================
   italky sözlüğü (çekirdek)
========================= */
const DICT = {

"Profil":{
  en:"Profile",
  de:"Profil",
  fr:"Profil",
  it:"Profilo",
  es:"Perfil"
},

"Jeton":{
  en:"Token",
  de:"Token",
  fr:"Jeton",
  it:"Token",
  es:"Token"
},

"Jeton Market":{
  en:"Token Market",
  de:"Token Markt",
  fr:"Marché des jetons",
  it:"Mercato Token",
  es:"Mercado de tokens"
},

"Jeton Nedir":{
  en:"What is Token",
  de:"Was ist Token",
  fr:"Qu'est-ce qu'un jeton",
  it:"Cos'è un token",
  es:"Qué es un token"
},

"Sesini Tanıt":{
  en:"Create Voice Profile",
  de:"Stimmprofil erstellen",
  fr:"Créer profil vocal",
  it:"Crea profilo vocale",
  es:"Crear perfil de voz"
},

"Kendi Sesini Oluştur":{
  en:"Create Your Voice",
  de:"Eigene Stimme erstellen",
  fr:"Créer ta voix",
  it:"Crea la tua voce",
  es:"Crea tu voz"
},

"Çeviri Ayarları":{
  en:"Translation Settings",
  de:"Übersetzungseinstellungen",
  fr:"Paramètres de traduction",
  it:"Impostazioni traduzione",
  es:"Configuración de traducción"
},

"Sistem Dili":{
  en:"System Language",
  de:"Systemsprache",
  fr:"Langue système",
  it:"Lingua di sistema",
  es:"Idioma del sistema"
},

"Ses Ayarları":{
  en:"Voice Settings",
  de:"Stimmeinstellungen",
  fr:"Paramètres vocaux",
  it:"Impostazioni voce",
  es:"Configuración de voz"
},

"Otomatik":{
  en:"Automatic",
  de:"Automatisch",
  fr:"Automatique",
  it:"Automatico",
  es:"Automático"
},

"Kadın":{
  en:"Female",
  de:"Weiblich",
  fr:"Femme",
  it:"Donna",
  es:"Mujer"
},

"Erkek":{
  en:"Male",
  de:"Männlich",
  fr:"Homme",
  it:"Uomo",
  es:"Hombre"
},

"Kendi Sesim":{
  en:"My Voice",
  de:"Meine Stimme",
  fr:"Ma voix",
  it:"La mia voce",
  es:"Mi voz"
},

"Güvenli Çıkış":{
  en:"Secure Logout",
  de:"Sicher abmelden",
  fr:"Déconnexion sécurisée",
  it:"Uscita sicura",
  es:"Cerrar sesión segura"
},

"Hesabımı Sil":{
  en:"Delete Account",
  de:"Konto löschen",
  fr:"Supprimer le compte",
  it:"Elimina account",
  es:"Eliminar cuenta"
},

"Hakkımızda":{
  en:"About Us",
  de:"Über uns",
  fr:"À propos",
  it:"Chi siamo",
  es:"Sobre nosotros"
},

"Gizlilik":{
  en:"Privacy",
  de:"Datenschutz",
  fr:"Confidentialité",
  it:"Privacy",
  es:"Privacidad"
},

"İletişim":{
  en:"Contact",
  de:"Kontakt",
  fr:"Contact",
  it:"Contatto",
  es:"Contacto"
},

"SSS":{
  en:"FAQ",
  de:"FAQ",
  fr:"FAQ",
  it:"FAQ",
  es:"FAQ"
},

"FaceToFace":{
  en:"FaceToFace",
  de:"FaceToFace",
  fr:"FaceToFace",
  it:"FaceToFace",
  es:"FaceToFace"
},

"SideToSide":{
  en:"SideToSide",
  de:"SideToSide",
  fr:"SideToSide",
  it:"SideToSide",
  es:"SideToSide"
},

"AllToAll":{
  en:"AllToAll",
  de:"AllToAll",
  fr:"AllToAll",
  it:"AllToAll",
  es:"AllToAll"
},

"Offline Hub":{
  en:"Offline Hub",
  de:"Offline Hub",
  fr:"Offline Hub",
  it:"Offline Hub",
  es:"Offline Hub"
},

"Offline Translate":{
  en:"Offline Translate",
  de:"Offline Übersetzung",
  fr:"Traduction hors ligne",
  it:"Traduzione offline",
  es:"Traducción offline"
},

"Geri dön":{
  en:"Back",
  de:"Zurück",
  fr:"Retour",
  it:"Indietro",
  es:"Volver"
},

"Kaydet":{
  en:"Save",
  de:"Speichern",
  fr:"Enregistrer",
  it:"Salva",
  es:"Guardar"
},

"Vazgeç":{
  en:"Cancel",
  de:"Abbrechen",
  fr:"Annuler",
  it:"Annulla",
  es:"Cancelar"
},

"Sonraki":{
  en:"Next",
  de:"Weiter",
  fr:"Suivant",
  it:"Avanti",
  es:"Siguiente"
},

"Tamamla":{
  en:"Finish",
  de:"Fertig",
  fr:"Terminer",
  it:"Completa",
  es:"Finalizar"
}

};

/* =========================
   Dil okuma
========================= */

export function getSystemLang(){
  try{
    const raw = localStorage.getItem(SYSTEM_LANG_KEY) || "tr";
    const base = raw.toLowerCase().split("-")[0];
    return SUPPORTED.includes(base) ? base : "tr";
  }catch{
    return "tr";
  }
}

/* =========================
   Dil kaydetme
========================= */

export function setSystemLang(lang){
  try{
    const base = String(lang).toLowerCase().split("-")[0];
    localStorage.setItem(SYSTEM_LANG_KEY, SUPPORTED.includes(base) ? base : "tr");
  }catch{}
}

/* =========================
   Çeviri
========================= */

function translate(text,lang){
  if(lang==="tr") return text;
  const t = DICT[text];
  if(!t) return text;
  return t[lang] || text;
}

/* =========================
   DOM çeviri
========================= */

export function applySystemTranslations(root=document.body){

  const lang = getSystemLang();

  const nodes = root.querySelectorAll("*");

  nodes.forEach(el=>{

    if(
      el.tagName==="SCRIPT" ||
      el.tagName==="STYLE" ||
      el.tagName==="INPUT" ||
      el.tagName==="TEXTAREA"
    ) return;

    const children = Array.from(el.childNodes).filter(n=>n.nodeType===3);

    children.forEach(node=>{
      const txt = node.nodeValue.trim();
      if(!txt) return;

      if(!el.dataset.orig){
        el.dataset.orig = txt;
      }

      const translated = translate(el.dataset.orig,lang);

      if(translated!==txt){
        node.nodeValue = node.nodeValue.replace(txt,translated);
      }

    });

  });

}

/* =========================
   Otomatik çeviri observer
========================= */

let observer=null;

export function installAutoTranslate(root=document.body){

  applySystemTranslations(root);

  if(observer) return;

  observer = new MutationObserver(()=>{
    applySystemTranslations(root);
  });

  observer.observe(root,{
    childList:true,
    subtree:true
  });

}
