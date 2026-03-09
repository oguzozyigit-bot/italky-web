// FILE: /js/profile_page.js

import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id)=>document.getElementById(id);

let __voiceProfileReady = false;
let __aiVoiceProfileReady = false;

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
    return `${dd}/${mm}/${yy} • ${hh}:${mi}`;
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
  if(parts.length === 2) return `${parts[0]} ${(parts[1][0]||"").toUpperCase()}.`;
  const last = parts[parts.length - 1];
  const firsts = parts.slice(0, -1).join(" ");
  return `${firsts} ${(last[0]||"").toUpperCase()}.`;
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
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  try{ localStorage.removeItem("NAC_ID"); }catch{}
  nukeAuthStorage();
  location.replace("/pages/login.html");
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
      .select("id,email,full_name,avatar_url,tokens,member_no,created_at,last_login_at")
      .eq("id", userId)
      .maybeSingle();

    if(error) throw error;
    return data || null;
  }catch(e){
    console.warn("[profiles.select base]", e);
    return null;
  }
}

async function tryLoadVoiceFields(userId){
  try{
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        voice_sample_seconds,
        voice_profile_ready,
        voice_profile_updated_at,
        voice_profile_lang,
        ai_voice_sample_seconds,
        ai_voice_profile_ready,
        ai_voice_profile_updated_at,
        ai_voice_profile_lang
      `)
      .eq("id", userId)
      .maybeSingle();

    if(error) throw error;
    return data || null;
  }catch(e){
    console.warn("[profiles.select voice optional]", e);
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
    await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);
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

function paintVoiceProfile(profile, voiceExtra){
  const ready = !!(voiceExtra?.voice_profile_ready || profile?.voice_profile_ready);
  const secs = Number(voiceExtra?.voice_sample_seconds || profile?.voice_sample_seconds || 0);
  const updated = fmtDT(voiceExtra?.voice_profile_updated_at || profile?.voice_profile_updated_at);
  const lang = langLabel(voiceExtra?.voice_profile_lang || profile?.voice_profile_lang);

  const aiReady = !!(voiceExtra?.ai_voice_profile_ready || profile?.ai_voice_profile_ready);
  const aiSecs = Number(voiceExtra?.ai_voice_sample_seconds || profile?.ai_voice_sample_seconds || 0);
  const aiUpdated = fmtDT(voiceExtra?.ai_voice_profile_updated_at || profile?.ai_voice_profile_updated_at);
  const aiLang = langLabel(voiceExtra?.ai_voice_profile_lang || profile?.ai_voice_profile_lang);

  __voiceProfileReady = ready;
  __aiVoiceProfileReady = aiReady;

  safeText("voiceProfileStatus", ready ? "Ses profili hazır" : "Hazır değil");
  safeText("aiVoiceProfileStatus", aiReady ? "AI özel ses hazır" : "Hazır değil");

  const metaEl = $("voiceProfileMeta");
  if(metaEl){
    if(ready){
      metaEl.textContent = `Kayıt süresi: ${fmtDuration(secs)} • Dil: ${lang} • Güncelleme: ${updated}`;
    }else{
      metaEl.textContent = "Henüz ses örneği kaydedilmedi.";
    }
  }

  const aiMetaEl = $("aiVoiceProfileMeta");
  if(aiMetaEl){
    if(aiReady){
      aiMetaEl.textContent = `Kayıt süresi: ${fmtDuration(aiSecs)} • Dil: ${aiLang} • Güncelleme: ${aiUpdated}`;
    }else{
      aiMetaEl.textContent = "Henüz AI özel ses kaydı oluşturulmadı.";
    }
  }

  const btn = $("voiceProfileBtn");
  if(btn){
    btn.textContent = ready ? "Ses Profilini Güncelle" : "Sesini Tanıt";
  }

  const aiBtn = $("aiVoiceProfileBtn");
  if(aiBtn){
    aiBtn.textContent = aiReady ? "AI Özel Sesi Güncelle" : "AI Özel Ses Oluştur";
  }

  const currentTts = localStorage.getItem("tts_voice") || "auto";
  if(currentTts === "own" && !ready) localStorage.setItem("tts_voice", "auto");
  if(currentTts === "ai" && !aiReady) localStorage.setItem("tts_voice", "auto");

  const currentChatAi = localStorage.getItem("chat_ai_voice") || "female";
  if(currentChatAi === "own" && !ready) localStorage.setItem("chat_ai_voice", "female");
  if(currentChatAi === "ai_custom" && !aiReady) localStorage.setItem("chat_ai_voice", "female");

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
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  try{ localStorage.removeItem("NAC_ID"); }catch{}
  nukeAuthStorage();
  try{ sessionStorage.clear(); }catch{}
  location.replace("/pages/login.html");
}

const SETTINGS_META = {
  tts_voice: {
    title: "Çeviri Sesi",
    values: {
      auto: "Otomatik",
      own: "Kendi Sesim",
      ai: "AI Sesi"
    }
  },
  chat_ai_voice: {
    title: "Sohbet AI Sesi",
    values: {
      female: "Kadın",
      male: "Erkek",
      own: "Benim Sesim",
      ai_custom: "AI Özel Ses"
    }
  }
};

function settingLabel(key, value){
  return SETTINGS_META[key]?.values?.[value] || "—";
}

function renderSettingValues(){
  const tts = localStorage.getItem("tts_voice") || "auto";
  const chatAi = localStorage.getItem("chat_ai_voice") || "female";

  let ttsLabel = settingLabel("tts_voice", tts);
  if(tts === "own" && !__voiceProfileReady) ttsLabel = "Otomatik";
  if(tts === "ai" && !__aiVoiceProfileReady) ttsLabel = "Otomatik";

  let chatAiLabel = settingLabel("chat_ai_voice", chatAi);
  if(chatAi === "own" && !__voiceProfileReady) chatAiLabel = "Kadın";
  if(chatAi === "ai_custom" && !__aiVoiceProfileReady) chatAiLabel = "Kadın";

  safeText("ttsVoiceValue", ttsLabel);
  safeText("chatAiVoiceValue", chatAiLabel);
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

  const current = localStorage.getItem(storageKey) || Object.keys(meta.values)[0];
  title.textContent = meta.title;

  list.innerHTML = Object.entries(meta.values).map(([value, label]) => {
    let disabled = false;

    if(storageKey === "tts_voice" && value === "own" && !__voiceProfileReady) disabled = true;
    if(storageKey === "tts_voice" && value === "ai" && !__aiVoiceProfileReady) disabled = true;

    if(storageKey === "chat_ai_voice" && value === "own" && !__voiceProfileReady) disabled = true;
    if(storageKey === "chat_ai_voice" && value === "ai_custom" && !__aiVoiceProfileReady) disabled = true;

    return `
      <div class="sheetItem ${value === current ? "active" : ""} ${disabled ? "disabled" : ""}"
           data-storage-key="${storageKey}"
           data-value="${value}"
           data-disabled="${disabled ? "1" : "0"}">
        <div class="sheetItemLabel">${label}</div>
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
        if(value === "own") toast("Önce Ses Profilini Güncelle");
        if(value === "ai") toast("Önce AI Özel Ses Oluştur");
        if(value === "ai_custom") toast("Önce AI Özel Ses Oluştur");
        return;
      }

      localStorage.setItem(key, value);
      renderSettingValues();

      if(key === "tts_voice") toast("Çeviri sesi ayarı kaydedildi");
      if(key === "chat_ai_voice") toast("Sohbet AI sesi ayarı kaydedildi");

      closeSheet();
    });
  });

  backdrop.classList.add("show");
  sheet.classList.add("show");
  document.body.style.overflow = "hidden";
}

function loadSettings(){
  if(!localStorage.getItem("tts_voice")) localStorage.setItem("tts_voice", "auto");
  if(!localStorage.getItem("chat_ai_voice")) localStorage.setItem("chat_ai_voice", "female");
  renderSettingValues();
}

function bindSettings(){
  $("ttsVoiceTrigger")?.addEventListener("click", ()=>openSheet("tts_voice"));
  $("chatAiVoiceTrigger")?.addEventListener("click", ()=>openSheet("chat_ai_voice"));
  $("sheetBackdrop")?.addEventListener("click", closeSheet);
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

  $("aiVoiceProfileBtn")?.addEventListener("click", ()=>{
    location.href = "/pages/ai_voice_profile.html";
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
    safeText("aiVoiceProfileStatus", "Hazır değil");
    safeText("aiVoiceProfileMeta", "Henüz AI özel ses kaydı oluşturulmadı.");
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

  const voiceExtra = await tryLoadVoiceFields(user.id);
  paintVoiceProfile(profile, voiceExtra);

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
