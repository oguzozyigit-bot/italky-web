/* 
   FILE: /js/face_to_face.js 
   italkyAI FaceToFace Engine v2026 - Ozigit's Special Edition
*/

import { getLangPoolForSite } from "/js/lang_pool_full.js";
import { OfflinePackBridge } from "/js/offline_pack_bridge.js?v=8";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

// --- TİCARİ SABİTLER ---
const ADS = {
    BANNER: "ca-app-pub-9490095589233929/5740014081",
    REWARDED: "ca-app-pub-9490095589233929/4809016308"
};
const AD_INTERVAL_MS = 3 * 60 * 1000; // 3 Dakika

const SITE_LANG_KEY = "site_lang";
const LEGACY_SITE_LANG_KEY = "italky_site_lang_v1";
const NATIVE_LANG_KEY = "italky_native_lang_v7";
const MY_LANG_KEY = "italky_public_my_lang_v1";

const BCP = {
    tr:"tr-TR", en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT", es:"es-ES",
    ar:"ar-SA", ru:"ru-RU", bg:"bg-BG", pt:"pt-PT", zh:"zh-CN", ja:"ja-JP", ko:"ko-KR"
};

const UI = {
    tr:{
        topLang:"ÜST DİL", botLang:"ALT DİL", adTitle:"Ücretsiz Kullanım",
        adText:"FaceToFace ücretsiz kullanımda reklam içerir. Devam etmek için kısa bir reklam izleyin.",
        downloadAdTitle:"Dil Paketi İndirme", downloadAdText:"Bu dili internet olmadan kullanmak için dil paketini indirebilirsiniz.",
        watchAd:"Reklam İzle", close:"Şimdilik Kapat", adNeeded:"Reklam izlenmeden işlem başlatılmadı.",
        micError:"Mikrofon hatası.", micDenied:"Mikrofon izni gerekli.", micUnsupported:"Konuşma algılama desteklenmiyor.",
        listeningDone:"Dinleme tamamlanıyor...", translateError:"Çeviri yapılamadı",
        loginSoon:"Üyelik sistemi çok yakında aktif olacak.", onlineMode:"Online mod aktif.", offlineMode:"Offline mod aktif.",
        packReady:"Dil paketi zaten hazır.", packDownloading:"Dil paketiniz indiriliyor.", packQueued:"Dil paketi sıraya alındı.",
        packDownloaded:"Dil paketiniz indirildi.", offerTitle:"Offline Dil Paketi",
        offerText:"Kendi diliniz: {sourceLang}\nSeçilen dil: {targetLang}\n\nPaketi indirerek internet olmadan kullanabilirsiniz.",
        offerOk:"İndir", offerCancel:"Şimdilik Kapat", sameLang:"Aynı dil için paket indirilemez.",
        nativeNotReady:"Gerçek indirme için uygulama tarafı hazır değil.", noInstalledOffline:"Henüz indirilmiş paket yok.",
        myLangChanged:"Kendi diliniz güncellendi.", myLangWarnTitle:"Kendi Dilim Değişsin mi?",
        myLangWarnText:"Kendi dilinizi değiştirirseniz eski offline paketler silinir.",
        myLangWarnOk:"Değiştir", myLangWarnCancel:"Vazgeç"
    },
    en:{
        topLang:"TOP LANGUAGE", botLang:"BOTTOM LANGUAGE", adTitle:"Free Use",
        adText:"FaceToFace free use includes ads. Watch a short ad to continue.",
        downloadAdTitle:"Language Pack Download", downloadAdText:"Download this pack to use it without internet.",
        watchAd:"Watch Ad", close:"Close", adNeeded:"The action was not started without the ad.",
        micError:"Microphone error.", micDenied:"Permission required.", micUnsupported:"Not supported on this device.",
        listeningDone:"Finishing...", translateError:"Translation failed",
        loginSoon:"Membership system coming soon.", onlineMode:"Online mode active.", offlineMode:"Offline mode active.",
        packReady:"Ready.", packDownloading:"Downloading...", packQueued:"Queued.", packDownloaded:"Downloaded.",
        offerTitle:"Offline Pack", offerText:"Your language: {sourceLang}\nSelected: {targetLang}\n\nDownload for offline use.",
        offerOk:"Download", offerCancel:"Not Now", sameLang:"Cannot download same language.",
        nativeNotReady:"Native download not ready.", noInstalledOffline:"No packs yet.",
        myLangChanged:"Updated.", myLangWarnTitle:"Change Language?",
        myLangWarnText:"Old packs will be deleted.", myLangWarnOk:"Change", myLangWarnCancel:"Cancel"
    }
};

// --- GLOBAL DEĞİŞKENLER ---
let myLang = getSavedMyLang();
let botLang = myLang;
let topLang = langExists("en") && botLang !== "en" ? "en" : differentLang(botLang);
if(topLang === botLang) topLang = differentLang(botLang);

let recognizer = null;
let liveText = "";
let lastAdAt = Date.now();
let currentMode = "online";
let lastOpenPopSide = null;
let manualStopPending = false;

// --- TİCARİ DÖNGÜ VE MÜHÜR ---
function startCommercialEngine() {
    const logoOrb = document.querySelector('.orb');
    // Eğer HTML'de reklam alanı yoksa dinamik oluşturur
    let adContainer = $("adViewContainer");
    if (!adContainer) {
        adContainer = document.createElement('div');
        adContainer.id = "adViewContainer";
        adContainer.style.cssText = "width:100%;height:60px;display:none;justify-content:center;align-items:center;position:absolute;z-index:10;";
        logoOrb.parentNode.appendChild(adContainer);
    }

    setInterval(() => {
        if (logoOrb.style.display !== 'none') {
            logoOrb.style.display = 'none';
            adContainer.style.display = 'flex';
            if (window.Android && window.Android.loadBannerAd) window.Android.loadBannerAd(ADS.BANNER);
        } else {
            adContainer.style.display = 'none';
            logoOrb.style.display = 'flex';
        }
    }, 30000); // 30/30 Döngüsü
}

async function checkAdAccess() {
    const now = Date.now();
    if (now - lastAdAt < AD_INTERVAL_MS) return true;

    const ok = await showAdModal({
        title: tx("adTitle"),
        text: tx("adText"),
        adUnit: ADS.REWARDED
    });

    if (!ok) showToast(tx("adNeeded"));
    return ok;
}

// --- YARDIMCI FONKSİYONLAR ---
function canonical(code){ return OfflinePackBridge.canonical(code); }

function getInitialSiteLang(){
    return canonical(localStorage.getItem(SITE_LANG_KEY) || localStorage.getItem(LEGACY_SITE_LANG_KEY) || localStorage.getItem(NATIVE_LANG_KEY) || navigator.language || "tr") || "tr";
}

const SITE_LANG = getInitialSiteLang();
const RAW_LANG_POOL = Array.isArray(getLangPoolForSite(SITE_LANG)) ? getLangPoolForSite(SITE_LANG) : [];

const FALLBACK_LANGS = [
    { code:"tr", flag:"🇹🇷", name:"Türkçe", bcp:"tr-TR" },
    { code:"en", flag:"🇬🇧", name:"İngilizce", bcp:"en-US" },
    { code:"de", flag:"🇩🇪", name:"Almanca", bcp:"de-DE" },
    { code:"fr", flag:"🇫🇷", name:"Fransızca", bcp:"fr-FR" },
    { code:"it", flag:"🇮🇹", name:"İtalyanca", bcp:"it-IT" },
    { code:"es", flag:"🇪🇸", name:"İspanyolca", bcp:"es-ES" },
    { code:"ar", flag:"🇸🇦", name:"Arapça", bcp:"ar-SA" },
    { code:"ru", flag:"🇷🇺", name:"Rusça", bcp:"ru-RU" }
];

const LANGS = (RAW_LANG_POOL.length ? RAW_LANG_POOL : FALLBACK_LANGS)
    .map((l) => {
        const code = canonical(l.code);
        return code ? { code, flag:l.flag || "🌐", name:l.name || code.toUpperCase(), bcp:l.bcp || BCP[code] || `${code}-${code.toUpperCase()}` } : null;
    })
    .filter(Boolean)
    .filter((item,index,arr) => arr.findIndex((x) => x.code === item.code) === index);

function langExists(code){ return !!LANGS.find((x) => x.code === canonical(code)); }

function langObj(code){
    const c = canonical(code);
    return LANGS.find((x) => x.code === c) || { code:c || "en", flag:"🌐", name:(c || "en").toUpperCase(), bcp:BCP[c] || "en-US" };
}

function labelChip(code){ const o = langObj(code); return `${o.flag} ${o.name}`; }

function differentLang(base){
    const b = canonical(base);
    const preferred = b === "tr" ? ["en","de","fr"] : ["tr","en","de"];
    for(const c of preferred) if(c !== b && langExists(c)) return c;
    return LANGS.find((l) => l.code !== b)?.code || "en";
}

function getSavedMyLang(){
    const saved = canonical(localStorage.getItem(MY_LANG_KEY) || "");
    if(saved && langExists(saved)) return saved;
    const initial = getInitialSiteLang();
    return (initial && langExists(initial)) ? initial : (langExists("tr") ? "tr" : LANGS[0]?.code || "tr");
}

function tx(key){ const c = UI[myLang] ? myLang : "en"; return UI[c]?.[key] || UI.en[key] || key; }

function showToast(msg){
    if(!$("toast")) return;
    $("toast").textContent = String(msg || "");
    $("toast").classList.add("show");
    setTimeout(() => $("toast").classList.remove("show"), 2600);
}

// --- MODAL VE REKLAM MANTIĞI ---
function showAdModal({title, text, adUnit}){
    return new Promise((resolve) => {
        $("adTitle").textContent = title;
        $("adText").textContent = text;
        $("adModal").classList.add("show");

        $("watchAdBtn").onclick = async () => {
            $("adModal").classList.remove("show");
            let success = false;
            if(window.Android && window.Android.showRewardedAd){
                success = await window.Android.showRewardedAd(adUnit);
            } else { success = true; } // Tarayıcı testi için

            if(success) lastAdAt = Date.now();
            resolve(success);
        };

        $("closeAdBtn").onclick = () => {
            $("adModal").classList.remove("show");
            resolve(false);
        };
    });
}

function showModalChoice({ title, text, okText, cancelText }){
    return new Promise((resolve) => {
        $("adTitle").textContent = title;
        $("adText").textContent = text;
        $("watchAdBtn").textContent = okText;
        $("closeAdBtn").textContent = cancelText;
        $("adModal").classList.add("show");

        $("watchAdBtn").onclick = () => { $("adModal").classList.remove("show"); resolve(true); };
        $("closeAdBtn").onclick = () => { $("adModal").classList.remove("show"); resolve(false); };
    });
}

// --- ANA FONKSİYONLAR (RECORDING & TRANSLATE) ---
async function translateText(text, from, to){
    if(currentMode === "offline"){
        if(!OfflinePackBridge.hasInstalledPair(from, to)){
            showToast(tx("offlineMode"));
            await startOfflinePackDownload(to);
            return null;
        }
        return await OfflinePackBridge.translateOffline(text, from, to);
    }
    
    try {
        const r = await fetch(`${API_BASE}/api/translate`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ text, from_lang: from, to_lang: to })
        });
        const j = await r.json();
        return j?.translated || null;
    } catch { return null; }
}

function speak(text, langCode){
    const bcp = langObj(langCode).bcp;
    if(window.NativeTTS) {
        window.NativeTTS.speak(text, langCode);
    } else {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = bcp;
        window.speechSynthesis.speak(u);
    }
}

async function finalizeSpeech(side, text){
    const clean = text.trim();
    if(!clean) return;

    if(!await checkAdAccess()) return; // 3 Dakika Mühürü

    const src = side === "top" ? topLang : botLang;
    const dst = side === "top" ? botLang : topLang;
    const other = side === "top" ? "botBody" : "topBody";

    addBubble(side, clean, false);
    const targetRow = addBubble(side === "top" ? "bot" : "top", "...", true);

    const translated = await translateText(clean, src, dst);
    if(translated){
        targetRow.textContent = translated;
        speak(translated, dst);
    } else {
        targetRow.textContent = tx("translateError");
    }
}

function startRecording(side){
    if(recognizer) { stopRecognizer(); return; }

    const sourceLang = side === "top" ? topLang : botLang;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ showToast(tx("micUnsupported")); return; }

    recognizer = new SR();
    recognizer.lang = langObj(sourceLang).bcp;
    recognizer.interimResults = true;

    recognizer.onstart = () => $(side + "Mic").classList.add("listening");
    recognizer.onresult = (e) => { liveText = e.results[0][0].transcript; };
    recognizer.onend = () => {
        $(side + "Mic").classList.remove("listening");
        const t = liveText; recognizer = null; liveText = "";
        if(t) finalizeSpeech(side, t);
    };
    recognizer.start();
}

function addBubble(side, text, latest){
    const body = $(side + "Body");
    const div = document.createElement("div");
    div.className = `bubble ${latest ? 'latest' : ''}`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
}

function stopRecognizer(){ if(recognizer) recognizer.stop(); }

// --- BOOT VE EVENT LISTENERS ---
async function boot(){
    startCommercialEngine();
    
    $("topMic").onclick = () => startRecording("top");
    $("botMic").onclick = () => startRecording("bot");
    $("sideClearBtn").onclick = () => { $("topBody").innerHTML = ""; $("botBody").innerHTML = ""; };
    
    $("modeOnlineBtn").onclick = () => { currentMode = "online"; $("modeOnlineBtn").classList.add("active"); $("modeOfflineBtn").classList.remove("active"); };
    $("modeOfflineBtn").onclick = () => { currentMode = "offline"; $("modeOfflineBtn").classList.add("active"); $("modeOnlineBtn").classList.remove("active"); };

    $("drawerEdgeBtn").onclick = () => $("drawerBackdrop").classList.add("show");
    $("drawerBackdrop").onclick = (e) => { if(e.target === $("drawerBackdrop")) $("drawerBackdrop").classList.remove("show"); };

    refreshTexts();
}

function refreshTexts(){
    $("topLangBtn").textContent = labelChip(topLang);
    $("botLangBtn").textContent = labelChip(botLang);
    $("myLangDrawerFlag").textContent = langObj(myLang).flag;
    $("myLangDrawerTitle").textContent = langObj(myLang).name;
}

boot();
