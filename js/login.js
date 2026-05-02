/* italkyAI - Akıllı Yönetim Motoru */
import { OfflinePackBridge } from "/js/offline_pack_bridge.js?v=8";
const $ = (id) => document.getElementById(id);

// ADMOB MÜHÜRLERİ
const AD_IDS = {
    BANNER: "ca-app-pub-9490095589233929/5740014081",
    REWARDED: "ca-app-pub-9490095589233929/4809016308"
};

// 58 DİL LİSTESİ (Burada 58 dilin tamamı yer almalı)
const LANG_POOL = [ {code:"tr", flag:"🇹🇷", name:"Türkçe"}, {code:"en", flag:"🇬🇧", name:"English"}, /* ... 58 Dil */ ];

let myLang = localStorage.getItem("italky_public_my_lang_v1") || "tr";
let topLang = "en", botLang = myLang;
let lastAdTime = Date.now();
const AD_LIMIT_MS = 3 * 60 * 1000; // 3 Dakika Sınırı

// REKLAM/MARKA DÖNGÜSÜ (30sn Logo / 30sn Banner)
function startAdRotation() {
    const adBox = $("adViewContainer");
    const logoBox = $("centerLogoOrb");
    const cycle = () => {
        adBox.style.display = 'none'; logoBox.style.display = 'flex';
        setTimeout(() => {
            logoBox.style.display = 'none'; adBox.style.display = 'flex';
            if(window.Android) window.Android.loadBannerAd(AD_IDS.BANNER);
            setTimeout(cycle, 30000);
        }, 30000);
    };
    cycle();
}

// OTOMATİK OFFLINE BYPASS
function checkBypass(code) {
    if(OfflinePackBridge.hasInstalledPair(myLang, code) || code === myLang) {
        showToast("Paket Hazır: Offline Mod Aktif");
        return "offline";
    }
    return "online";
}

// 3 DAKİKA REKLAM KONTROLÜ
async function validateTranslationAccess() {
    if(Date.now() - lastAdTime > AD_LIMIT_MS) {
        if(window.Android) {
            const ok = await window.Android.showRewardedAd(AD_IDS.REWARDED);
            if(ok) lastAdTime = Date.now();
            return ok;
        }
    }
    return true;
}

// Boot işlemi
document.addEventListener('DOMContentLoaded', () => {
    startAdRotation();
    // Diğer mikrofon ve dil seçim olayları...
});

function showToast(m) { const t=$("toast"); t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500); }
