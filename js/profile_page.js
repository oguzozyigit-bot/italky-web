// FILE: /js/profile_page.js
import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = String(msg||"");
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1800);
}

function fmtDT(iso){
  if(!iso) return "—";
  try{
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }catch{ return "—"; }
}

function lineRow(label, value){
  const div = document.createElement("div");
  div.className = "line";
  div.innerHTML = `<div class="k">${label}</div><div class="v">${value}</div>`;
  return div;
}

// 1 harf + 7 rakam (ardışık 3’lü yok, aynı 3’lü yok)
function randLetter(){
  const A="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return A[Math.floor(Math.random()*A.length)];
}
function randDigits7(){
  let s=""; for(let i=0;i<7;i++) s += String(Math.floor(Math.random()*10));
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

function nukeAuthStorage(){
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(!k) continue;
      if(k.startsWith("sb-") && k.includes("auth-token")) keys.push(k);
    }
    keys.forEach(k=>localStorage.removeItem(k));
  }catch{}
}

async function safeLogout(){
  try{
    await supabase.auth.signOut({ scope:"global" });
  }catch(e){
    console.warn("signOut error:", e);
  }
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
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

function openNameModal(force=false){
  const m = $("nameModal");
  if(!m) return;
  m.dataset.force = force ? "1" : "0";
  m.classList.add("show");
  setTimeout(()=>$("nameInput")?.focus(), 60);
}
function closeNameModal(){
  const m = $("nameModal");
  if(!m) return;
  if(m.dataset.force === "1") return;
  m.classList.remove("show");
}

async function updateStudentName(userId, newName){
  const clean = String(newName||"").trim().slice(0,32);
  if(clean.length < 3) throw new Error("Ad en az 3 karakter olmalı.");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: clean })
    .eq("id", userId);

  if(error) throw error;

  // cache update
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const c = raw ? JSON.parse(raw) : {};
    c.name = clean;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  }catch{}

  return clean;
}

export async function initProfilePage({ setHeaderTokens } = {}){
  // session
  const { data:{ session } } = await supabase.auth.getSession();
  if(!session){
    location.replace("/pages/login.html");
    return;
  }
  const user = session.user;

  // profile fetch
  let prof = null;
  try{
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,tokens,member_no,created_at,last_login_at,levels,offline_langs,study_minutes")
      .eq("id", user.id)
      .single();

    if(error) throw error;
    prof = data;
  }catch(e){
    console.error(e);
    toast("Profil okunamadı (RLS / key)");
    return;
  }

  // last_login_at update (hata olsa da sayfa çalışsın)
  try{
    await supabase.from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);
  }catch{}

  // ensure member_no (auth gerektirmez; user kendi satırını update eder)
  if(!prof.member_no){
    try{
      const newNo = genMemberNo();
      const { data: upd, error } = await supabase
        .from("profiles")
        .update({ member_no: newNo })
        .eq("id", user.id)
        .select("member_no")
        .single();
      if(!error) prof.member_no = upd.member_no;
    }catch{}
  }

  // render
  $("pEmail").textContent = prof.email || user.email || "—";
  $("pName").textContent = (prof.full_name || "—");

  $("memberNo").textContent = prof.member_no || "—";
  $("createdAt").textContent = fmtDT(prof.created_at);
  $("lastLogin").textContent = fmtDT(prof.last_login_at);

  const tokens = Number(prof.tokens ?? 0);
  $("tokenVal").textContent = String(tokens);
  if(typeof setHeaderTokens === "function") setHeaderTokens(tokens);

  // name enforce (min 3)
  if(!prof.full_name || String(prof.full_name).trim().length < 3){
    $("nameInput").value = "";
    openNameModal(true);
    toast("Lütfen adınızı girin");
  }

  // levels
  const levelsList = $("levelsList");
  const levelsEmpty = $("levelsEmptyNote");
  levelsList.innerHTML = "";
  const levels = (prof.levels && typeof prof.levels === "object") ? prof.levels : {};
  const TEACHERS = [
    ["dora","İngilizce"],["ayda","Almanca"],["jale","Fransızca"],["ozan","İspanyolca"],
    ["sencer","İtalyanca"],["sungur","Rusça"],["huma","Japonca"],["umay","Çince"]
  ];
  let any=false;
  for(const [id,label] of TEACHERS){
    if(levels[id]){
      any=true;
      levelsList.appendChild(lineRow(label, String(levels[id])));
    }
  }
  levelsEmpty.style.display = any ? "none" : "block";
  $("goLevel")?.addEventListener("click", ()=>location.href="/pages/teacher_select.html");

  // offline
  const offlineList = $("offlineList");
  const offlineEmpty = $("offlineEmptyNote");
  offlineList.innerHTML = "";
  const packs = Array.isArray(prof.offline_langs) ? prof.offline_langs : [];
  if(packs.length === 0){
    offlineEmpty.style.display = "block";
  }else{
    offlineEmpty.style.display = "none";
    packs.forEach(p=>offlineList.appendChild(lineRow(String(p), "Hazır")));
  }

  // events
  $("copyMemberBtn")?.addEventListener("click", ()=>copyText(prof.member_no || ""));
  $("offlineDownloadBtn")?.addEventListener("click", ()=>location.href="/pages/offline.html");
  $("buyTokensBtn")?.addEventListener("click", ()=>toast("Jeton yükleme yakında (Google Play)."));

  $("logoutBtn")?.addEventListener("click", safeLogout);

  $("deleteBtn")?.addEventListener("click", async ()=>{
    const ok = confirm("Hesap silme talebi oluşturulsun mu? 30 gün içinde giriş yaparsanız iptal edilir.");
    if(!ok) return;
    try{
      await supabase.rpc("request_account_deletion");
      location.href="/pages/delete_requested.html";
    }catch(e){
      toast("Silme talebi kaydedilemedi");
      console.warn(e);
    }
  });

  $("editNameBtn")?.addEventListener("click", ()=>{
    $("nameInput").value = String($("pName").textContent||"").trim();
    openNameModal(false);
  });

  $("cancelNameBtn")?.addEventListener("click", closeNameModal);

  $("saveNameBtn")?.addEventListener("click", async ()=>{
    try{
      const saved = await updateStudentName(user.id, $("nameInput").value);
      $("pName").textContent = saved;

      // header name update (shell)
      const headerName = document.getElementById("userName");
      if(headerName) headerName.textContent = saved;

      const m = $("nameModal");
      if(m){ m.dataset.force="0"; m.classList.remove("show"); }
      toast("İsim kaydedildi");
    }catch(e){
      toast(e?.message || "Kaydedilemedi");
    }
  });

  $("nameModal")?.addEventListener("click",(ev)=>{
    if(ev.target?.id === "nameModal") closeNameModal();
  });
}
