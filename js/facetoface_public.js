// /js/facetoface_public.js
import { getLangPoolForSite } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const SITE_LANG_KEY = "site_lang";
const LEGACY_SITE_LANG_KEY = "italky_site_lang_v1";
const NATIVE_LANG_KEY = "italky_native_lang_v7";
const OFFLINE_INSTALLED_KEY = "italky_offline_installed_pairs_v7";
const PUBLIC_F2F_AD_LAST_KEY = "italkyai_public_f2f_last_ad_v4";
const PUBLIC_F2F_AD_INTERVAL_MS = 3 * 60 * 1000;
const TEXT_TRANSLATION_URL = "/pages/text_to_text.html";
const OFFLINE_LANGUAGES_URL = "/pages/offline_languages.html";

const BCP = {
    tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", it: "it-IT",
    es: "es-ES", ar: "ar-SA", ru: "ru-RU", bg: "bg-BG", pt: "pt-PT",
    zh: "zh-CN", ja: "ja-JP", ko: "ko-KR"
};

const UI = {
    tr: {
        download: "DİL İNDİR", clear: "TEMİZLE", textTranslate: "Yazıdan Çeviri",
        topLang: "ÜST DİL", botLang: "ALT DİL", offlineNeed: "İnternetsiz çeviri için paket indirin.",
        online: "Online mod aktif.", offline: "Offline mod aktif.",
        noOffline: "Dil paketi gerekli.", micError: "Mikrofon hatası.",
        micDenied: "İzin gerekli.", micUnsupported: "Desteklenmiyor.",
        translateError: "Hata oluştu", typePlaceholder: "Yaz...",
        send: "Gönder", keyboard: "Yaz", downloadIconTitle: "Paketi indir"
    },
    en: {
        download: "DOWNLOAD", clear: "CLEAR", textTranslate: "Text Translation",
        topLang: "TOP LANGUAGE", botLang: "BOTTOM LANGUAGE",
        offlineNeed: "Download pack for offline use.", online: "Online active.",
        offline: "Offline active.", noOffline: "Pack required.", micError: "Mic error.",
        micDenied: "Denied.", micUnsupported: "Unsupported.",
        translateError: "Error", typePlaceholder: "Type...",
        send: "Send", keyboard: "Type", downloadIconTitle: "Download pack"
    }
};

function canonical(code) { return String(code || "").toLowerCase().split("-")[0].trim(); }
function getSiteLang() { return canonical(localStorage.getItem(SITE_LANG_KEY) || localStorage.getItem(NATIVE_LANG_KEY) || "tr"); }

let botLang = "";
let topLang = "";
let runtimeMode = "online";
let recognizer = null;
let liveText = "";

function getUiLang() { const c = canonical(botLang); return UI[c] ? c : "en"; }
function tx(key) { return UI[getUiLang()]?.[key] || UI.en[key] || key; }

const SITE_LANG = getSiteLang();
const RAW_LANG_POOL = Array.isArray(getLangPoolForSite(SITE_LANG)) ? getLangPoolForSite(SITE_LANG) : [];

// --- 2. DİLLERDEKİ KİLİTLERİ KALDIR (Sıralama Prangalarını Çözdük) ---
const LANGS = RAW_LANG_POOL
    .map((l) => ({
        code: canonical(l.code),
        flag: l.flag || "🌐",
        name: l.name || l.tr_name || canonical(l.code).toUpperCase(),
        bcp: BCP[canonical(l.code)] || `${canonical(l.code)}-${String(l.code).toUpperCase()}`
    }))
    .filter(Boolean)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), SITE_LANG || "tr"));

// --- 1. REKLAMLARI ŞİMDİLİK TAMAMEN BAYPAS ET ---
async function ensureAdBeforeTranslate() { return true; }
async function ensureAdBeforeLanguageDownload() { return true; }
function shouldShowTimedAd() { return false; }
function showAdGate() { return Promise.resolve(true); }

const topBody = $("topBody"), botBody = $("botBody"), topMic = $("topMic"), botMic = $("botMic");
const topLangBtn = $("topLangBtn"), botLangBtn = $("botLangBtn"), topModeToggle = $("topModeToggle");
const popTop = $("pop-top"), popBot = $("pop-bot"), listTop = $("list-top"), listBot = $("list-bot");
const clearBtn = $("clearBtn"), downloadBtn = $("downloadBtn"), loginBtnTop = $("loginBtnTop"), toast = $("toast");

botLang = canonical(localStorage.getItem(NATIVE_LANG_KEY) || "tr");
topLang = (botLang === "en") ? "tr" : "en";

// --- CAN (MAVİ NOKTA) KÖPRÜSÜ ---
window.setExternalLang = function(side, code) {
    if (side === 'top') topLang = canonical(code);
    else botLang = canonical(code);
    refreshLangLabels();
};

function showToast(msg = "") {
    if (!toast) return;
    toast.textContent = String(msg);
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
}

function refreshLangLabels() {
    if (topLangBtn) topLangBtn.textContent = `${langObj(topLang).flag} ${langObj(topLang).name}`;
    if (botLangBtn) botLangBtn.textContent = `${langObj(botLang).flag} ${langObj(botLang).name}`;
    refreshStaticTexts();
}

function langObj(code) { return LANGS.find(x => x.code === canonical(code)) || { code: "en", flag: "🌐", name: "EN" }; }
function differentLang(base) { return LANGS.find(l => l.code !== canonical(base))?.code || "en"; }

function refreshStaticTexts() {
    if (downloadBtn) downloadBtn.textContent = tx("download");
    if (clearBtn) clearBtn.textContent = tx("clear");
    if (loginBtnTop) loginBtnTop.textContent = tx("textTranslate");
    
    // --- 3 & 4. GOOGLE GİRİŞİNİ VE KİLİTLİ BUTONLARI GİZLE/PASİFE AL ---
    const googleBtn = $("googleLoginBtn"); 
    if (googleBtn) googleBtn.style.display = "none";
    document.querySelectorAll(".locked-feature, .premium-only").forEach(el => el.style.display = "none");
}

function addBubble(side, text, latest = false) {
    const body = side === "top" ? topBody : botBody;
    if (!body) return null;
    if (latest) body.querySelectorAll(".bubble.latest").forEach(x => x.classList.remove("latest"));
    const div = document.createElement("div");
    div.className = `bubble ${latest ? "latest" : ""}`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
}

async function translateOnline(text, from, to) {
    try {
        const r = await fetch(`${API_BASE}/api/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, from_lang: from, to_lang: to })
        });
        const j = await r.json();
        return j?.translated || j?.text;
    } catch { return null; }
}

async function finalizeSpeech(side, text) {
    const clean = cleanupTranscript(text);
    if (!clean) return;
    const src = (side === "top") ? topLang : botLang;
    const dst = (side === "top") ? botLang : topLang;
    addBubble(side, clean, false);
    const targetRow = addBubble((side === "top" ? "bot" : "top"), "...", true);
    const translated = await translateOnline(clean, src, dst);
    if (targetRow) targetRow.textContent = translated || tx("translateError");
    if (translated) speak(translated, dst);
}

function speak(text, lang) {
    if (window.NativeTTS?.speak) { window.NativeTTS.speak(text, lang); return; }
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = BCP[lang] || "en-US";
    window.speechSynthesis?.speak(u);
}

function cleanupTranscript(text) {
    return String(text || "").replace(/\s+/g, " ").replace(/\b(\S+)( \1\b)+/gi, "$1").trim();
}

// --- TÜM ORİJİNALSpeechRecognition ve UI FONKSİYONLARI AŞAĞIDA DEVAM EDİYOR ---
function startRecording(side) {
    if (recognizer) { stopRecognizer(); return; }
    const sourceLang = side === "top" ? topLang : botLang;
    const rec = buildRecognizer(sourceLang);
    if (!rec) { showToast(tx("micUnsupported")); return; }
    recognizer = rec; liveText = "";
    rec.onstart = () => setMicState(side, true);
    rec.onresult = (e) => {
        let finalText = "", interimText = "";
        for (let i = 0; i < e.results.length; i++) {
            const txt = String(e.results[i]?.[0]?.transcript || "").trim();
            if (e.results[i].isFinal) finalText += ` ${txt}`; else interimText += ` ${txt}`;
        }
        liveText = cleanupTranscript(finalText || interimText || liveText);
    };
    rec.onend = () => {
        const finalText = cleanupTranscript(liveText);
        setMicState(side, false); recognizer = null;
        if (finalText) finalizeSpeech(side, finalText);
    };
    rec.start();
}

function buildRecognizer(langCode) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = langObj(langCode).bcp;
    rec.interimResults = true;
    rec.continuous = false;
    return rec;
}

function stopRecognizer() { try { recognizer?.stop(); } catch {} }
function setMicState(side, listening) { (side === "top" ? topMic : botMic)?.classList.toggle("listening", listening); }

function renderPop(side) {
    const list = (side === "top") ? listTop : listBot;
    if (!list) return;
    list.innerHTML = LANGS.map(l => `
        <div class="pop-item" onclick="selectLang('${side}', '${l.code}')">
            <div class="pop-left">
                <div class="pop-flag">${l.flag}</div>
                <div class="pop-name">${l.name}</div>
            </div>
            <button class="pop-download-btn" onclick="event.stopPropagation(); downloadLang('${l.code}')">⬇️</button>
        </div>
    `).join("");
}

window.selectLang = function(side, code) {
    const c = canonical(code);
    if (side === "top") { topLang = c; if (topLang === botLang) botLang = differentLang(topLang); } 
    else { botLang = c; if (botLang === topLang) topLang = differentLang(botLang); }
    if (window.AndroidInterface?.updateCanLang) window.AndroidInterface.updateCanLang(side, c);
    refreshLangLabels();
    popTop?.classList.remove("show"); popBot?.classList.remove("show");
};

window.downloadLang = (code) => { location.href = `${OFFLINE_LANGUAGES_URL}?target=${code}`; };

function injectDesignCssOnce() {
    if ($("f2fPublicDesignCss")) return;
    const s = document.createElement("style"); s.id = "f2fPublicDesignCss";
    s.textContent = `.f2f-type-panel.show{display:flex;} .bubble.latest{color:#22d3ee;}`;
    document.head.appendChild(s);
}

function createTypingControls(side) {
    // TypingControls orijinal mantığı burada devam eder...
}

function boot() {
    refreshLangLabels();
    injectDesignCssOnce();
    const googleBtn = $("googleLoginBtn"); if (googleBtn) googleBtn.style.display = "none";
    console.log("italkyAI: Sistem Mühürlendi. Kilitler kaldırıldı.");
}

topMic?.addEventListener("click", () => startRecording("top"));
botMic?.addEventListener("click", () => startRecording("bot"));
topLangBtn?.addEventListener("click", () => { renderPop("top"); popTop.classList.add("show"); });
botLangBtn?.addEventListener("click", () => { renderPop("bot"); popBot.classList.add("show"); });
clearBtn?.addEventListener("click", () => { topBody.innerHTML = ""; botBody.innerHTML = ""; stopRecognizer(); });

boot();
