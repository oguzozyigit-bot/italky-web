import { supabase, removeSupabaseSessionBackup, clearNativeSupabaseSession } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);
const isIOSApp = () => !!(window.__ITALKY_IOS_APP__ || window.__ITALKY_PLATFORM__ === "ios");
const loginTarget = () => isIOSApp() ? "/pages/login_ios.html" : "/pages/login.html";

let __voiceProfileReady = false;

const HOST_CODE_KEY = "italky_interpreter_host_code";
const QR_VERSION_KEY = "italky_interpreter_qr_version";

function safeText(id, val){
  const el = $(id);
  if(el) el.textContent = (val ?? "—");
}

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = String(msg || "");
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(() => t.classList.remove("show"), 1800);
}

function fmtDT(iso){
  if(!iso) return "—";
  try{
    const d = new Date(iso);
    if(Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2,"0");
    const mi = String(d.getMinutes()).padStart(2,"0");
    return `${dd}.${mm}.${yy} ${hh}:${mi}`;
  }catch{
    return "—";
  }
}

function fmtDuration(sec){
  const s = Number(sec || 0);
  if(!s || s < 1) return "—";
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function shortDisplayName(fullName){
  const s = String(fullName || "").trim().replace(/\s+/g," ");
  if(!s) return "Kullanıcı";
  const parts = s.split(" ").filter(Boolean);
  if(parts.length === 1) return parts[0];
  if(parts.length === 2) return `${parts[0]} ${(parts[1][0] || "").toUpperCase()}.`;
  const last = parts[parts.length - 1];
  const firsts = parts.slice(0, -1).join(" ");
  return `${firsts} ${(last[0] || "").toUpperCase()}.`;
}

function nukeAuthStorage(){
  try{
    const keys = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(!k) continue;
      if(k.startsWith("sb-")) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }catch{}
}

async function safeLogoutHard(){
  try{ await supabase.auth.signOut(); }catch(e){ console.warn("[signOut]", e); }
  try{ removeSupabaseSessionBackup(); clearNativeSupabaseSession(); }catch{}
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  try{ localStorage.removeItem("NAC_ID"); }catch{}
  nukeAuthStorage();
  location.replace(loginTarget());
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    toast("Kopyalandı");
  }catch{
    toast("Kopyalanamadı");
  }
}

function randLetter(){
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return A[Math.floor(Math.random() * A.length)];
}

function randDigits7(){
  let s = "";
  for(let i=0;i<7;i++) s += String(Math.floor(Math.random() * 10));
  return s;
}

function digitsOk(d){
  for(let i=0;i<=d.length-3;i++){
    const a = +d[i], b = +d[i+1], c = +d[i+2];
    if(a + 1 === b && b + 1 === c) return false;
    if(a - 1 === b && b - 1 === c) return false;
    if(a === b && b === c) return false;
  }
  return true;
}

function genMemberNo(){
  for(let k=0;k<300;k++){
    const L = randLetter();
    const D = randDigits7();
    if(digitsOk(D)) return `${L}${D}`;
  }
  return `${randLetter()}${randDigits7()}`;
}

function updateLocalUserCache({ full_name, email, tokens, avatar_url }){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const u = raw ? JSON.parse(raw) : {};
    if(full_name) u.name = full_name;
    if(email) u.email = email;
    if(tokens != null) u.tokens = tokens;
    if(avatar_url) u.picture = avatar_url;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }catch{}
}

function paintHeaderLite(full, pic){
  try{
    const hn = document.getElementById("userName");
    if(hn) hn.textContent = shortDisplayName(full || "Kullanıcı");

    const hp = document.getElementById("userPic");
    if(hp && pic){
      hp.src = pic;
      hp.referrerPolicy = "no-referrer";
    }
  }catch{}
}

function paintFromSession(user){
  const full = String(
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Kullanıcı"
  );

  const pic = String(user?.user_metadata?.picture || user?.user_metadata?.avatar_url || "");

  safeText("pName", full);
  safeText("pEmail", user?.email || "—");
  paintHeaderLite(full, pic);
}

async function getUserSafe(){
  try{
    const { data, error } = await supabase.auth.getUser();
    if(error) throw error;
    return data?.user || null;
  }catch(e){
    console.warn("[auth.getUser]", e);
    return null;
  }
}

async function tryLoadProfileBase(userId){
  try{
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url,tokens,member_no,created_at,last_login_at,voice_sample_seconds,voice_profile_ready,voice_profile_updated_at,voice_profile_lang")
      .eq("id", userId)
      .maybeSingle();

    if(error) throw error;
    return data || null;
  }catch(e){
    console.warn("[profiles.select base]", e);
    return null;
  }
}

async function tryInsertProfile(user){
  try{
    const metaName = String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
    const metaPic = String(user.user_metadata?.picture || user.user_metadata?.avatar_url || "").trim();

    const insert = {
      id: user.id,
      email: user.email || null,
      full_name: metaName || null,
      avatar_url: metaPic || null,
      tokens: 0
    };

    const { data, error } = await supabase
      .from("profiles")
      .insert(insert)
      .select()
      .single();

    if(error) throw error;
    return data || null;
  }catch(e){
    console.warn("[profiles.insert]", e);
    return null;
  }
}

async function touchLastLogin(userId){
  try{
    const now = new Date().toISOString();
    await supabase.from("profiles").update({ last_login_at: now }).eq("id", userId);
  }catch(e){
    console.warn("[last_login_at update]", e);
  }
}

function langLabel(code){
  const c = String(code || "").toLowerCase();
  if(c === "tr") return "Türkçe";
  if(c === "en") return "English";
  if(c === "de") return "Deutsch";
  if(c === "fr") return "Français";
  if(c === "it") return "Italiano";
  if(c === "es") return "Español";
  return "—";
}

function paintVoiceProfile(profile){
  const ready = !!profile?.voice_profile_ready;
  const secs = Number(profile?.voice_sample_seconds || 0);
  const updated = fmtDT(profile?.voice_profile_updated_at);
  const lang = langLabel(profile?.voice_profile_lang);

  __voiceProfileReady = ready;

  safeText("voiceProfileStatus", ready ? "Hazır" : "Hazır değil");

  const metaEl = $("voiceProfileMeta");
  if(metaEl){
    if(ready){
      metaEl.textContent = `Kayıt süresi: ${fmtDuration(secs)} • Dil: ${lang} • Güncelleme: ${updated}`;
    }else{
      metaEl.textContent = "Henüz ses örneği kaydedilmedi.";
    }
  }

  const btn = $("voiceProfileBtn");
  if(btn){
    btn.textContent = ready ? "Ses Profilini Güncelle" : "Sesini Tanıt";
  }

  const currentTts = normalizeVoiceStorage(localStorage.getItem("tts_voice") || "auto");
  if(currentTts === "clone" && !ready){
    localStorage.setItem("tts_voice", "auto");
  }

  renderSettingValues();
}

async function hardDeleteAccount(){
  const { data:{ session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if(!token) throw new Error("Oturum bulunamadı.");

  const r = await fetch(`${API_BASE}/api/account/delete`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` }
  });

  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(j.detail || j.error || "Hesap silme başarısız.");

  try{ await supabase.auth.signOut(); }catch(e){ console.warn("[signOut after delete]", e); }
  try{ removeSupabaseSessionBackup(); clearNativeSupabaseSession(); }catch{}
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  try{ localStorage.removeItem("NAC_ID"); }catch{}
  nukeAuthStorage();
  try{ sessionStorage.clear(); }catch{}
  location.replace(loginTarget());
}

const SETTINGS_META = {
  tts_voice: {
    title: "Çeviri Sesi",
    values: {
      auto: "Otomatik",
      female: "Kadın",
      male: "Erkek",
      clone: "Benim Sesim"
    }
  }
};

function normalizeVoiceStorage(value){
  const v = String(value || "auto").toLowerCase().trim();
  if(v === "own" || v === "my") return "clone";
  if(v === "female" || v === "male" || v === "clone") return v;
  return "auto";
}

function settingLabel(key, value){
  return SETTINGS_META[key]?.values?.[value] || "—";
}

function renderSettingValues(){
  let tts = normalizeVoiceStorage(localStorage.getItem("tts_voice") || "auto");
  if(tts === "clone" && !__voiceProfileReady) tts = "auto";
  safeText("ttsVoiceValue", settingLabel("tts_voice", tts));
}

function closeSheet(){
  $("sheetBackdrop")?.classList.remove("show");
  $("optionSheet")?.classList.remove("show");
  document.body.style.overflow = "";
}

function openSheet(storageKey){
  const backdrop = $("sheetBackdrop");
  const sheet = $("optionSheet");
  const title = $("sheetTitle");
  const list = $("sheetList");

  const meta = SETTINGS_META[storageKey];
  if(!meta || !backdrop || !sheet || !title || !list) return;

  const current = normalizeVoiceStorage(localStorage.getItem(storageKey) || "auto");
  title.textContent = meta.title;

  list.innerHTML = Object.entries(meta.values).map(([value, label]) => {
    let disabled = false;
    if(storageKey === "tts_voice" && value === "clone" && !__voiceProfileReady) disabled = true;

    return `
      <div class="sheetItem ${value === current ? "active" : ""} ${disabled ? "disabled" : ""}"
           data-storage-key="${storageKey}"
           data-value="${value}"
           data-disabled="${disabled ? "1" : "0"}">
        <div>${label}</div>
        <div class="sheetItemCheck"></div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".sheetItem").forEach(el => {
    el.addEventListener("click", () => {
      const key = el.dataset.storageKey;
      const value = el.dataset.value;
      const disabled = el.dataset.disabled === "1";

      if(disabled){
        toast("Önce Ses Profilini Güncelle");
        return;
      }

      localStorage.setItem(key, value);
      renderSettingValues();
      toast("Çeviri sesi ayarı kaydedildi");
      closeSheet();
    });
  });

  backdrop.classList.add("show");
  sheet.classList.add("show");
  document.body.style.overflow = "hidden";
}

function loadSettings(){
  localStorage.setItem("tts_voice", normalizeVoiceStorage(localStorage.getItem("tts_voice") || "auto"));
  renderSettingValues();
}

function bindSettings(){
  $("ttsVoiceTrigger")?.addEventListener("click", ()=>openSheet("tts_voice"));
  $("sheetBackdrop")?.addEventListener("click", closeSheet);
}

function renewQrCode(){
  const nextVersion = String(Date.now());
  localStorage.setItem(QR_VERSION_KEY, nextVersion);

  const currentHost = localStorage.getItem(HOST_CODE_KEY);
  if(!currentHost){
    const fallback = `ITK-${Math.random().toString(36).slice(2,10).toUpperCase()}`;
    localStorage.setItem(HOST_CODE_KEY, fallback);
  }

  toast("QR kodunuz yenilendi");
}

export async function initProfilePage({ setHeaderTokens } = {}){
  $("logoutBtn")?.addEventListener("click", (e)=>{
    e.preventDefault();
    safeLogoutHard();
  });

  $("buyTokensBtn")?.addEventListener("click", ()=>{
    location.href = "/pages/jetonbuy.html";
  });

  $("voiceProfileBtn")?.addEventListener("click", ()=>{
    location.href = "/pages/voice_profile.html";
  });

  $("renewQrBtn")?.addEventListener("click", ()=>{
    renewQrCode();
  });

  loadSettings();
  bindSettings();

  const user = await getUserSafe();

  if(!user?.id){
    toast("Oturum bulunamadı");
    setTimeout(() => location.replace("/pages/login.html"), 500);
    return;
  }

  paintFromSession(user);

  let profile = await tryLoadProfileBase(user.id);
  if(!profile){
    profile = await tryInsertProfile(user);
    if(!profile) profile = await tryLoadProfileBase(user.id);
  }

  await touchLastLogin(user.id);

  if(!profile){
    safeText("memberNo", "—");
    safeText("createdAt", "—");
    safeText("lastLogin", "—");
    safeText("tokenVal", "0");
    safeText("voiceProfileStatus", "Hazır değil");
    safeText("voiceProfileMeta", "Henüz ses örneği kaydedilmedi.");
    if(typeof setHeaderTokens === "function") setHeaderTokens(0);
    toast("Profil tablosuna erişilemedi");
    return;
  }

  const fullName =
    profile.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "—";

  safeText("pEmail", profile.email || user.email || "—");
  safeText("pName", fullName);

  let memberNo = profile.member_no;
  if(!memberNo){
    memberNo = genMemberNo();
    try{
      await supabase.from("profiles").update({ member_no: memberNo }).eq("id", user.id);
    }catch(e){
      console.warn("[member_no update]", e);
    }
  }

  safeText("memberNo", memberNo || "—");
  safeText("createdAt", fmtDT(profile.created_at));
  safeText("lastLogin", fmtDT(profile.last_login_at));

  const tokens = Number(profile.tokens ?? 0);
  safeText("tokenVal", String(tokens));
  if(typeof setHeaderTokens === "function") setHeaderTokens(tokens);

  paintVoiceProfile(profile);

  const pic = String(profile.avatar_url || user.user_metadata?.picture || user.user_metadata?.avatar_url || "");
  paintHeaderLite(fullName, pic);

  updateLocalUserCache({
    full_name: fullName,
    email: profile.email || user.email || "",
    tokens,
    avatar_url: pic
  });

  $("copyMemberBtn")?.addEventListener("click", ()=>copyText(memberNo || ""));

  $("deleteBtn")?.addEventListener("click", async ()=>{
    const ok = confirm("Hesabınız kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam edilsin mi?");
    if(!ok) return;
    toast("Hesap siliniyor...");
    try{
      await hardDeleteAccount();
    }catch(e){
      console.warn(e);
      toast(String(e?.message || "Hesap silinemedi"));
    }
  });
}
