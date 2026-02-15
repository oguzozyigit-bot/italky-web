import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

/* ---------------- HELPERS ---------------- */

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
    return d.toLocaleString("tr-TR", {
      year:"numeric", month:"2-digit", day:"2-digit",
      hour:"2-digit", minute:"2-digit"
    });
  }catch{
    return "—";
  }
}

/* ------------- SESSION CONTROL ------------- */

async function requireSession(){
  const { data:{ session }, error } = await supabase.auth.getSession();
  if(error) throw error;
  if(!session){
    location.href="/pages/login.html";
    return null;
  }
  return session;
}

/* ------------- PROFILE FETCH ------------- */

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
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || "Kullanıcı",
    tokens: 400,
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
    levels: {},
    study_minutes: {}
  };

  const { data: created, error: insErr } = await supabase
    .from("profiles")
    .insert(insert)
    .select()
    .single();

  if(insErr) throw insErr;
  return created;
}

/* -------- MEMBER NO SERVER GUARANTEE -------- */

async function ensureMemberNoServer(){
  const { data, error } = await supabase.rpc("ensure_member_no");
  if(error) throw error;
  return data;
}

/* ------------- LEVEL RENDER ------------- */

const TEACHER_LABELS = [
  { id:"dora",   label:"İngilizce" },
  { id:"ayda",   label:"Almanca" },
  { id:"jale",   label:"Fransızca" },
  { id:"ozan",   label:"İspanyolca" },
  { id:"sencer", label:"İtalyanca" },
  { id:"sungur", label:"Rusça" },
  { id:"huma",   label:"Japonca" },
  { id:"umay",   label:"Çince" },
  { id:"jack",   label:"İngilizce" },
  { id:"heidi",  label:"Almanca" },
  { id:"claire", label:"Fransızca" },
  { id:"diego",  label:"İspanyolca" },
  { id:"marco",  label:"İtalyanca" },
  { id:"elena",  label:"Rusça" },
  { id:"kenji",  label:"Japonca" },
  { id:"mei",    label:"Çince" }
];

function lineRow(label, value){
  const div = document.createElement("div");
  div.className = "line";
  div.innerHTML = `
    <div class="k">${label}</div>
    <div class="v">${value}</div>
  `;
  return div;
}

function renderLevels(profile){
  const list = $("levelsList");
  const empty = $("levelsEmptyNote");
  if(!list || !empty) return;

  list.innerHTML = "";

  const pairs = [];
  if(profile?.levels && typeof profile.levels === "object"){
    for(const t of TEACHER_LABELS){
      const v = profile.levels[t.id];
      if(v) pairs.push([t.label, String(v)]);
    }
  }

  if(pairs.length === 0){
    empty.style.display = "block";
    empty.onclick = ()=>location.href="/pages/teacher_select.html";
    return;
  }

  empty.style.display = "none";
  pairs.forEach(([lang,lvl])=>{
    list.appendChild(lineRow(lang, lvl));
  });
}

/* ------------- OFFLINE RENDER ------------- */

function renderOffline(profile){
  const list = $("offlineList");
  const empty = $("offlineEmptyNote");
  if(!list || !empty) return;

  list.innerHTML = "";
  const packs = Array.isArray(profile?.offline_langs) ? profile.offline_langs : [];

  if(packs.length === 0){
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  packs.forEach(p=>{
    list.appendChild(lineRow(String(p), "Hazır"));
  });
}

/* ------------- LOGOUT ------------- */

function nukeAuthStorage(){
  try{
    const keys = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith("sb-") && k.includes("auth-token")){
        keys.push(k);
      }
    }
    keys.forEach(k=>localStorage.removeItem(k));
  }catch{}
}

async function safeLogout(){
  try{ await supabase.auth.signOut({ scope:"global" }); }catch{}
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  try{ localStorage.removeItem("NAC_ID"); }catch{}
  nukeAuthStorage();
  location.href="/pages/login.html";
}

/* ------------- NAME UPDATE ------------- */

async function updateStudentName(userId, newName){
  const clean = String(newName || "").trim().slice(0,32);
  if(clean.length < 2) throw new Error("Ad en az 2 karakter olmalı.");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: clean })
    .eq("id", userId);

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

/* ------------- INIT ------------- */

export async function initProfilePage({ setHeaderTokens } = {}){

  const session = await requireSession();
  if(!session) return;

  const user = session.user;
  const profile = await getOrCreateProfile(user);

  $("pName").textContent =
    profile.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "Kullanıcı";

  $("pEmail").textContent = profile.email || user.email || "—";

  const memberNo = await ensureMemberNoServer();
  $("memberNo").textContent = memberNo || "—";

  $("createdAt").textContent = fmtDT(profile.created_at);
  $("lastLogin").textContent = fmtDT(profile.last_login_at);

  const tokens = Number(profile.tokens ?? 0);
  $("tokenVal").textContent = tokens;
  if(typeof setHeaderTokens === "function"){
    setHeaderTokens(tokens);
  }

  renderLevels(profile);
  renderOffline(profile);

  $("logoutBtn")?.addEventListener("click", safeLogout);

  $("buyTokensBtn")?.addEventListener("click", ()=>{
    toast("Jeton satın alma yakında aktif.");
  });

  $("deleteBtn")?.addEventListener("click", async ()=>{
    const ok = confirm("Hesap silme talebi oluşturulsun mu? 30 gün içinde giriş yaparsanız iptal edilir.");
    if(!ok) return;
    await supabase.rpc("request_account_deletion");
    location.href="/pages/delete_requested.html";
  });

  $("editNameBtn")?.addEventListener("click", ()=>{
    $("nameModal")?.classList.add("show");
    $("nameInput").value = $("pName").textContent;
  });

  $("cancelNameBtn")?.addEventListener("click", ()=>{
    $("nameModal")?.classList.remove("show");
  });

  $("saveNameBtn")?.addEventListener("click", async ()=>{
    try{
      const saved = await updateStudentName(user.id, $("nameInput").value);
      $("pName").textContent = saved;
      const headerName = document.getElementById("userName");
      if(headerName) headerName.textContent = saved;
      toast("İsim güncellendi");
      $("nameModal")?.classList.remove("show");
    }catch(e){
      toast(e.message || "Güncellenemedi");
    }
  });

  $("nameModal")?.addEventListener("click",(ev)=>{
    if(ev.target.id === "nameModal"){
      $("nameModal").classList.remove("show");
    }
  });
}
