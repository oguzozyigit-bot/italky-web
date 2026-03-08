// FILE: /js/profile_page.js
// ✅ profiles.id = auth.users.id
// ✅ RLS: auth.uid() = profiles.id
// ✅ Tarih formatı: GG/AA/YYYY • SS:DD
// ✅ Offline/Level bölümleri HTML'den kalksa bile JS patlamaz
// ✅ Jeton Yükle -> /pages/jetonbuy.html
// ✅ Güvenli çıkış %100
// ✅ last_login_at günceller + shell cache tazeler
// ✅ Account delete = HARD DELETE (Render API)

import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id)=>document.getElementById(id);

function safeText(id, val){
  const el = $(id);
  if(el) el.textContent = (val ?? "—");
}

function safeShow(id, on){
  const el = $(id);
  if(el) el.style.display = on ? "block" : "none";
}

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = String(msg||"");
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1800);
}

/* ✅ İSTEDİĞİN FORMAT: GG/AA/YYYY • SS:DD */
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

/* ✅ İsim kısaltma: "Oğuz Ö." / "Huri Hüma Ö." / "Mustafa" */
export function shortDisplayName(fullName){
  const s = String(fullName || "").trim().replace(/\s+/g," ");
  if(!s) return "Kullanıcı";
  const parts = s.split(" ").filter(Boolean);
  if(parts.length === 1) return parts[0];
  if(parts.length === 2) return `${parts[0]} ${(parts[1][0]||"").toUpperCase()}.`;
  const last = parts[parts.length-1];
  const firsts = parts.slice(0,-1).join(" ");
  return `${firsts} ${(last[0]||"").toUpperCase()}.`;
}

function nukeAuthStorage(){
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(!k) continue;
      if(k.startsWith("sb-")) keys.push(k);
    }
    keys.forEach(k=>localStorage.removeItem(k));
  }catch{}
}

/* ✅ ÇIKIŞ %100 */
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

/* member_no generator (fail-safe) */
function randLetter(){
  const A="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return A[Math.floor(Math.random()*A.length)];
}

function randDigits7(){
  let s="";
  for(let i=0;i<7;i++) s += String(Math.floor(Math.random()*10));
  return s;
}

function digitsOk(d){
  for(let i=0;i<=d.length-3;i++){
    const a=+d[i], b=+d[i+1], c=+d[i+2];
    if(a+1===b && b+1===c) return false;
    if(a-1===b && b-1===c) return false;
    if(a===b && b===c) return false;
  }
  return true;
}

function genMemberNo(){
  for(let k=0;k<300;k++){
    const L=randLetter(), D=randDigits7();
    if(digitsOk(D)) return `${L}${D}`;
  }
  return `${randLetter()}${randDigits7()}`;
}

/* ✅ Shell cache yaz */
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

/* ✅ Session’dan ekrana bas (DB olmasa bile) */
function paintFromSession(user){
  const full = String(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Kullanıcı");
  safeText("pName", full);
  safeText("pEmail", user?.email || "—");

  try{
    const hn = document.getElementById("userName");
    if(hn) hn.textContent = shortDisplayName(full || "Kullanıcı");

    const pic = String(user?.user_metadata?.picture || user?.user_metadata?.avatar_url || "");
    const hp = document.getElementById("userPic");
    if(hp && pic){
      hp.src = pic;
      hp.referrerPolicy = "no-referrer";
    }
  }catch{}
}

/* ✅ DB’den çek */
async function tryLoadProfile(userId){
  try{
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url,tokens,member_no,created_at,last_login_at")
      .eq("id", userId)
      .maybeSingle();
    if(error) throw error;
    return data || null;
  }catch(e){
    console.warn("[profiles.select id]", e);
    return null;
  }
}

/* ✅ Yoksa oluştur */
async function tryInsertProfile(user){
  try{
    const metaName = String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
    const metaPic  = String(user.user_metadata?.picture || user.user_metadata?.avatar_url || "").trim();

    const insert = {
      id: user.id,
      email: user.email || null,
      full_name: metaName || null,
      avatar_url: metaPic || null,
      tokens: 0,
      levels: {},
      offline_langs: [],
      study_minutes: {}
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

/* ✅ last_login_at update (silent) */
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

/* ✅ HARD DELETE (Render API) */
async function hardDeleteAccount(){
  const { data:{ session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if(!token) throw new Error("Oturum bulunamadı.");

  const r = await fetch(`${API_BASE}/api/account/delete`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` }
  });

  const j = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(j.detail || j.error || "Hesap silme başarısız.");

  try{ await supabase.auth.signOut(); }catch(e){ console.warn("[signOut after delete]", e); }
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  try{ localStorage.removeItem("NAC_ID"); }catch{}
  nukeAuthStorage();
  try{ sessionStorage.clear(); }catch{}
  location.replace("/pages/login.html");
}

export async function initProfilePage({ setHeaderTokens } = {}){
  // ✅ Butonlar
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

  // ✅ session
  const { data:{ session } } = await supabase.auth.getSession();
  if(!session?.user){
    location.replace("/pages/login.html");
    return;
  }

  const user = session.user;
  paintFromSession(user);

  // ✅ DB profile
  let profile = await tryLoadProfile(user.id);
  if(!profile){
    profile = await tryInsertProfile(user);
    if(!profile) profile = await tryLoadProfile(user.id);
  }

  // ✅ last_login_at
  await touchLastLogin(user.id);

  // ✅ DB yoksa session ekranı kalsın
  if(!profile){
    safeText("memberNo", "—");
    safeText("createdAt", "—");
    safeText("lastLogin", "—");
    safeText("tokenVal", "0");
    if(typeof setHeaderTokens === "function") setHeaderTokens(0);
    toast("Profil verisi alınamadı. (profiles RLS: auth.uid() = id olmalı)");
    return;
  }

  const fullName =
    profile.full_name ||
    (user.user_metadata?.full_name || user.user_metadata?.name) ||
    (user.email || "—");

  safeText("pEmail", profile.email || user.email || "—");
  safeText("pName", fullName);

  // ✅ member no yoksa üret
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

  // ✅ Tarihler
  safeText("createdAt", fmtDT(profile.created_at));
  safeText("lastLogin", fmtDT(profile.last_login_at));

  const tokens = Number(profile.tokens ?? 0);
  safeText("tokenVal", String(tokens));
  if(typeof setHeaderTokens === "function") setHeaderTokens(tokens);

  // ✅ header kısaltma + avatar
  try{
    const hn = document.getElementById("userName");
    if(hn) hn.textContent = shortDisplayName(fullName);

    const pic = String(profile.avatar_url || user.user_metadata?.picture || user.user_metadata?.avatar_url || "");
    const hp = document.getElementById("userPic");
    if(hp && pic){
      hp.src = pic;
      hp.referrerPolicy = "no-referrer";
    }
  }catch{}

  // ✅ cache update
  updateLocalUserCache({
    full_name: fullName,
    email: (profile.email || user.email || ""),
    tokens,
    avatar_url: (profile.avatar_url || user.user_metadata?.picture || "")
  });

  // ✅ copy
  $("copyMemberBtn")?.addEventListener("click", ()=>copyText(memberNo || ""));

  // ✅ delete
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
