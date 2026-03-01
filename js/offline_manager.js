// FILE: /js/offline_manager.js
const OFFLINE_KEY = "italky_offline_packs_v1";
const FIRST_BOOT_KEY = "italky_first_boot_done_v1";

// 30 gün deneme
const TRIAL_DAYS = 30;

// Türkçe ana dil varsayımı: en-tr + tr-en indirilecek
const DEFAULT_BASE_LANG = "tr";
const DEFAULT_TARGET_LANG = "en";

// ✅ Supabase public path (SENİN yapın):
// offline/langpacks/en-tr/model.zip
// offline/langpacks/tr-en/model.zip
const PACK_BASE_URL = "https://auth.italky.ai/storage/v1/object/public/offline/langpacks";

function nowMs(){ return Date.now(); }
function daysMs(d){ return d * 24 * 60 * 60 * 1000; }

function loadState(){
  try{ return JSON.parse(localStorage.getItem(OFFLINE_KEY) || "{}"); }
  catch{ return {}; }
}
function saveState(s){
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(s || {}));
}

function packId(a,b){ return `${a}-${b}`; }

function getBridge(){
  // ✅ iki ayrı isim destek
  if(window.Native && typeof window.Native.downloadOfflinePack === "function") return window.Native;
  if(window.Android && typeof window.Android.downloadOfflinePack === "function") return window.Android;
  return null;
}

export function hasAndroidBridge(){
  return !!getBridge();
}

export function getPackInfo(a,b){
  const st = loadState();
  return st[packId(a,b)] || null;
}

export function isPackActive(a,b){
  const p = getPackInfo(a,b);
  if(!p) return false;
  if(!p.installed) return false;
  if(!p.expires_at) return false;
  return nowMs() < Number(p.expires_at);
}

export function remainingDays(a,b){
  const p = getPackInfo(a,b);
  if(!p?.expires_at) return 0;
  const left = Number(p.expires_at) - nowMs();
  return Math.max(0, Math.ceil(left / daysMs(1)));
}

async function markInstalled(a,b, expiresAt){
  const st = loadState();
  st[packId(a,b)] = {
    installed: true,
    installed_at: nowMs(),
    expires_at: expiresAt,
    source: "auto_trial"
  };
  saveState(st);
}

/**
 * Native bridge ile indir:
 * Native.downloadOfflinePack(url, packId) -> "ok" döndürsün (veya true)
 */
async function nativeDownload(url, id){
  const bridge = getBridge();
  if(!bridge) return false;

  try{
    const r = bridge.downloadOfflinePack(url, id);
    if(typeof r === "string" && r.toLowerCase().includes("ok")) return true;
    if(r === true) return true;
    // bazı bridge'ler void döner -> true kabul edelim
    if(r == null) return true;
    return !!r;
  }catch(e){
    console.warn("nativeDownload failed:", e);
    return false;
  }
}

export async function ensureDefaultEnglishTrial(){
  const a1 = DEFAULT_BASE_LANG, b1 = DEFAULT_TARGET_LANG; // tr-en
  const a2 = DEFAULT_TARGET_LANG, b2 = DEFAULT_BASE_LANG; // en-tr

  // zaten aktifse çık
  if(isPackActive(a1,b1) && isPackActive(a2,b2)) return { ok:true, already:true };

  if(!hasAndroidBridge()){
    return { ok:false, reason:"no_android_bridge" };
  }

  const expiresAt = nowMs() + daysMs(TRIAL_DAYS);

  const url1 = `${PACK_BASE_URL}/${encodeURIComponent(packId(a1,b1))}/model.zip`;
  const url2 = `${PACK_BASE_URL}/${encodeURIComponent(packId(a2,b2))}/model.zip`;

  // 1) tr-en
  const ok1 = await nativeDownload(url1, packId(a1,b1));
  if(!ok1) return { ok:false, reason:`download_failed_${packId(a1,b1)}` };
  await markInstalled(a1,b1, expiresAt);

  // 2) en-tr
  const ok2 = await nativeDownload(url2, packId(a2,b2));
  if(!ok2) return { ok:false, reason:`download_failed_${packId(a2,b2)}` };
  await markInstalled(a2,b2, expiresAt);

  return { ok:true, already:false, expiresAt };
}

export async function initOfflineBootstrap(){
  const done = localStorage.getItem(FIRST_BOOT_KEY) === "1";
  if(done) return;

  const r = await ensureDefaultEnglishTrial();
  console.log("offline bootstrap:", r);

  // bir kere çalışsın
  localStorage.setItem(FIRST_BOOT_KEY, "1");
}

/**
 * login.html UI
 */
export function refreshOfflineUI({ buttonId, hintId, onOpen }){
  const btn = document.getElementById(buttonId);
  const hint = document.getElementById(hintId);
  if(!btn || !hint) return;

  const offline = !navigator.onLine;

  if(!offline){
    btn.style.display = "none";
    hint.style.display = "none";
    return;
  }

  btn.style.display = "block";
  hint.style.display = "block";

  const ok = isPackActive("tr","en") && isPackActive("en","tr");
  const daysLeft = Math.min(remainingDays("tr","en"), remainingDays("en","tr"));

  if(ok){
    btn.disabled = false;
    btn.textContent = `📡 Offline Çeviri (Kalan: ${daysLeft} gün)`;
    hint.textContent = "İnternet yok: Offline paket aktif. Direkt çeviriye geçebilirsin.";
    btn.onclick = onOpen;
    return;
  }

  // paket yok / süre bitti
  btn.disabled = true;
  btn.textContent = "📦 Offline Paket Gerekli";
  hint.textContent = hasAndroidBridge()
    ? "Paket indiriliyor olabilir. İnternete bağlanınca otomatik yüklenir."
    : "Bu APK’da offline indirme köprüsü yok (Native bridge gerekli).";
}
