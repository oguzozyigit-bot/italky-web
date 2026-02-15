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

function minutesToHM(mins){
  const m = Math.max(0, Number(mins)||0);
  const h = Math.floor(m/60);
  const r = m%60;
  if(h<=0) return `${r} dk`;
  if(r===0) return `${h} saat`;
  return `${h} saat ${r} dk`;
}

async function requireSession(){
  const { data:{ session }, error } = await supabase.auth.getSession();
  if(error) throw error;
  if(!session){ location.replace("/pages/login.html"); return null; }
  return session;
}

async function getOrCreateProfile(user){
  try{
    const { data } = await supabase.rpc("ensure_profile");
    if(data) return data;
  }catch{}

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if(error) throw error;
  if(data) return data;

  const insert = {
    id:user.id,
    email:user.email,
    full_name:user.user_metadata?.full_name || user.user_metadata?.name || "",
    tokens:400,
    created_at:new Date().toISOString(),
    last_login_at:new Date().toISOString(),
    levels:{},
    study_minutes:{}
  };

  const { data: created, error: insErr } = await supabase
    .from("profiles")
    .insert(insert)
    .select()
    .single();

  if(insErr) throw insErr;
  return created;
}

async function ensureMemberNoServer(){
  const { data, error } = await supabase.rpc("ensure_member_no");
  if(error) throw error;
  return data;
}

async function loadLevelRequirements(){
  try{
    const { data, error } = await supabase.from("level_requirements").select("level, minutes_required");
    if(error) throw error;
    const map = {};
    (data||[]).forEach(r=>map[r.level]=Number(r.minutes_required||0));
    return map;
  }catch{
    return { A0:0, A1:360, A2:600, B1:960, B2:1440, C1:0 };
  }
}

const TEACHER_LABELS = [
  { id:"dora",   label:"İngilizce" },
  { id:"ayda",   label:"Almanca" },
  { id:"jale",   label:"Fransızca" },
  { id:"ozan",   label:"İspanyolca" },
  { id:"sencer", label:"İtalyanca" },
  { id:"sungur", label:"Rusça" },
  { id:"huma",   label:"Japonca" },
  { id:"umay",   label:"Çince" }
];

function lineRow(label, value){
  const div = document.createElement("div");
  div.className="line";
  div.innerHTML = `<div class="k">${label}</div><div class="v">${value}</div>`;
  return div;
}

function renderLevels(profile, reqMap){
  const list = $("levelsList");
  const empty = $("levelsEmptyNote");
  if(!list || !empty) return;

  list.innerHTML = "";

  const levels = (profile?.levels && typeof profile.levels === "object") ? profile.levels : {};
  const study  = (profile?.study_minutes && typeof profile.study_minutes === "object") ? profile.study_minutes : {};

  let hasAny=false;
  for(const t of TEACHER_LABELS){
    const lv = levels[t.id];
    if(!lv) continue;
    hasAny=true;

    const studiedMin = Number(study?.[t.id]||0);
    const needMin = Number(reqMap?.[lv] ?? 0);
    const remainMin = Math.max(0, needMin - studiedMin);

    const right = `${lv} • ${minutesToHM(studiedMin)} • Kalan: ${minutesToHM(remainMin)}`;
    list.appendChild(lineRow(t.label, right));
  }

  if(!hasAny){
    empty.style.display="block";
    $("goLevel")?.addEventListener("click", ()=>location.href="/pages/teacher_select.html");
  }else{
    empty.style.display="none";
  }
}

function renderOffline(profile){
  const list = $("offlineList");
  const empty = $("offlineEmptyNote");
  if(!list || !empty) return;

  list.innerHTML="";
  const packs = Array.isArray(profile?.offline_langs) ? profile.offline_langs : [];

  if(packs.length===0){
    empty.style.display="block";
    return;
  }
  empty.style.display="none";
  packs.forEach(p=>list.appendChild(lineRow(String(p),"Hazır")));
}

function nukeAuthStorage(){
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k && k.startsWith("sb-") && k.includes("auth-token")) keys.push(k);
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
  try{ localStorage.removeItem("NAC_ID"); }catch{}
  nukeAuthStorage();

  // ✅ kesin yönlendirme
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

async function updateStudentName(userId, newName){
  const clean = String(newName||"").trim().slice(0,32);
  if(clean.length < 3) throw new Error("Ad en az 3 karakter olmalı.");

  const { error } = await supabase.from("profiles").update({ full_name: clean }).eq("id", userId);
  if(error) throw error;

  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const cached = raw ? JSON.parse(raw) : {};
    cached.name = clean;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    localStorage.setItem("italky_student_name", clean);
  }catch{}
  return clean;
}

function openNameModal(force=false){
  const modal = $("nameModal");
  if(!modal) return;
  modal.classList.add("show");
  modal.dataset.force = force ? "1" : "0";
  setTimeout(()=>$("nameInput")?.focus(), 50);
}
function closeNameModal(){
  const modal = $("nameModal");
  if(!modal) return;
  if(modal.dataset.force === "1") return;
  modal.classList.remove("show");
}

export async function initProfilePage({ setHeaderTokens } = {}){
  try{
    const session = await requireSession();
    if(!session) return;

    const user = session.user;
    const profile = await getOrCreateProfile(user);
    const reqMap = await loadLevelRequirements();

    // basic
    $("pEmail").textContent = profile.email || user.email || "—";

    const name = (profile.full_name || "").trim();
    $("pName").textContent = name || "—";
    if(name.length < 3){
      $("nameInput").value = "";
      openNameModal(true);
      toast("Lütfen adınızı girin");
    }

    // member no (server)
    const memberNo = await ensureMemberNoServer();
    $("memberNo").textContent = memberNo || "—";
    $("copyMemberBtn")?.addEventListener("click", ()=>copyText(memberNo));

    // dates
    $("createdAt").textContent = fmtDT(profile.created_at);
    $("lastLogin").textContent = fmtDT(profile.last_login_at);

    // wallet
    const tokens = Number(profile.tokens ?? 0);
    $("tokenVal").textContent = String(tokens);
    if(typeof setHeaderTokens === "function") setHeaderTokens(tokens);

    // lists
    renderLevels(profile, reqMap);
    renderOffline(profile);

    // buttons
    $("logoutBtn")?.addEventListener("click", safeLogout);
    $("offlineDownloadBtn")?.addEventListener("click", ()=>location.href="/pages/offline.html");
    $("buyTokensBtn")?.addEventListener("click", ()=>toast("Jeton satın alma yakında aktif."));
    $("deleteBtn")?.addEventListener("click", async ()=>{
      const ok = confirm("Hesap silme talebi oluşturulsun mu? 30 gün içinde giriş yaparsanız iptal edilir.");
      if(!ok) return;
      await supabase.rpc("request_account_deletion");
      location.href="/pages/delete_requested.html";
    });

    // name edit
    $("editNameBtn")?.addEventListener("click", ()=>{
      $("nameInput").value = ($("pName").textContent || "").trim();
      openNameModal(false);
    });
    $("cancelNameBtn")?.addEventListener("click", closeNameModal);

    $("saveNameBtn")?.addEventListener("click", async ()=>{
      try{
        const saved = await updateStudentName(user.id, $("nameInput").value);
        $("pName").textContent = saved;
        const headerName = document.getElementById("userName");
        if(headerName) headerName.textContent = saved;

        const modal = $("nameModal");
        if(modal){ modal.dataset.force="0"; modal.classList.remove("show"); }
        toast("İsim kaydedildi");
      }catch(e){
        toast(e?.message || "Kaydedilemedi");
      }
    });

    $("nameModal")?.addEventListener("click",(ev)=>{
      if(ev.target?.id === "nameModal") closeNameModal();
    });

  }catch(e){
    console.error("Profile init error:", e);
    toast("Profil yüklenemedi");
  }
}
