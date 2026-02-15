// FILE: /js/profile_page.js
import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

const TEACHER_LABELS = [
  { id:"dora",   label:"İngilizce" },
  { id:"ayda",   label:"Almanca" },
  { id:"jale",   label:"Fransızca" },
  { id:"ozan",   label:"İspanyolca" },
  { id:"sencer", label:"İtalyanca" },
  { id:"sungur", label:"Rusça" },
  { id:"huma",   label:"Japonca" },
  { id:"umay",   label:"Çince" },
];

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = String(msg||"");
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1800);
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function lineRow(label, value){
  const div = document.createElement("div");
  div.className = "line";
  div.innerHTML = `
    <div class="k">${escapeHtml(label)}</div>
    <div class="v">${escapeHtml(value)}</div>
  `;
  return div;
}

function fmtDT(iso){
  if(!iso) return "—";
  try{
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }catch{ return "—"; }
}

/* Üyelik no üretimi */
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
    const a=Number(d[i]), b=Number(d[i+1]), c=Number(d[i+2]);
    if(a+1===b && b+1===c) return false;
    if(a-1===b && b-1===c) return false;
    if(a===b && b===c) return false;
  }
  return true;
}
function genMemberNo(){
  for(let tries=0; tries<200; tries++){
    const L = randLetter();
    const D = randDigits7();
    if(!digitsOk(D)) continue;
    return `${L}${D}`;
  }
  return `${randLetter()}${randDigits7()}`;
}

async function requireSessionOrRedirect(){
  const { data, error } = await supabase.auth.getSession();
  if(error) throw error;
  if(!data?.session){
    location.replace("/pages/login.html");
    return null;
  }
  return data.session;
}

async function fetchProfile(userId){
  // varsa ensure_profile RPC
  try{
    const { data: p, error: e } = await supabase.rpc("ensure_profile");
    if(!e && p) return p;
  }catch{}

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if(error) throw error;

  try{
    await supabase.from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);
  }catch{}

  return data;
}

async function ensureMemberNo(profile){
  if(profile?.member_no) return profile.member_no;

  const newNo = genMemberNo();
  const { data, error } = await supabase
    .from("profiles")
    .update({ member_no: newNo })
    .eq("id", profile.id)
    .select("member_no")
    .single();

  if(error) throw error;
  return data.member_no;
}

function getLevelsPairs(profile){
  // DB: profile.levels = { dora:"A2", umay:"A0" }
  if(profile?.levels && typeof profile.levels === "object"){
    const pairs = [];
    for(const t of TEACHER_LABELS){
      const v = profile.levels[t.id];
      if(v) pairs.push([t.label, String(v)]);
    }
    return pairs;
  }
  return [];
}

function renderLevels(profile){
  const list = $("levelsList");
  const empty = $("levelsEmptyNote");
  list.innerHTML = "";

  const pairs = getLevelsPairs(profile);

  if(pairs.length === 0){
    empty.style.display = "block";
    empty.onclick = ()=>location.href="/pages/teacher_select.html";
    return;
  }

  empty.style.display = "none";
  empty.onclick = null;

  for(const [lang, lvl] of pairs){
    list.appendChild(lineRow(`${lang}`, `${lvl}`));
  }
}

function renderOffline(profile){
  const list = $("offlineList");
  const empty = $("offlineEmptyNote");
  list.innerHTML = "";

  const packs = Array.isArray(profile?.offline_langs) ? profile.offline_langs : [];

  if(!packs || packs.length === 0){
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  packs.forEach(x=>{
    list.appendChild(lineRow(String(x), "Hazır"));
  });
}

function nukeSupabaseAuthStorage(){
  try{
    const keys = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(!k) continue;
      if(k.startsWith("sb-") && k.includes("auth-token")) keys.push(k);
    }
    keys.forEach(k=>localStorage.removeItem(k));
  }catch(_e){}
}

async function safeLogoutHard(){
  try{ await supabase.auth.signOut({ scope:"global" }); }catch(_e){}
  try{ localStorage.removeItem(STORAGE_KEY); }catch(_e){}
  try{ localStorage.removeItem("NAC_ID"); }catch(_e){}
  nukeSupabaseAuthStorage();
  location.href = "/pages/login.html";
}

async function buyTokens(){
  alert("Jeton satın alma web sürümünde kapalı. APK sürümünde Google Play ile açılacak.");
}

async function requestDeletionFlow(){
  const ok = confirm("Hesabınız için silme talebi oluşturulsun mu? 30 gün içinde tekrar giriş yaparsanız talep iptal edilir.");
  if(!ok) return;

  const { error } = await supabase.rpc("request_account_deletion");
  if(error){
    alert(error.message);
    return;
  }

  location.href = "/pages/delete_requested.html";
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    toast("Kopyalandı");
    return;
  }catch{}
  try{
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast("Kopyalandı");
  }catch{
    toast("Kopyalanamadı");
  }
}

/* ✅ Ad güncelle: DB + cache + “öğrenci adı” local anahtar */
async function updateStudentName(userId, newName){
  const clean = String(newName || "").trim().slice(0, 32);
  if(clean.length < 2) throw new Error("Ad en az 2 karakter olmalı.");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: clean })
    .eq("id", userId);

  if(error) throw error;

  // cache update (STORAGE_KEY)
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const cached = raw ? JSON.parse(raw) : {};
    cached.name = clean;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  }catch{}

  // öğretmen sayfaları için basit key
  try{ localStorage.setItem("italky_student_name", clean); }catch{}
  return clean;
}

function openNameModal(currentName){
  const modal = $("nameModal");
  const input = $("nameInput");
  if(!modal || !input) return;

  input.value = currentName || "";
  modal.classList.add("show");
  setTimeout(()=>input.focus(), 50);
}

function closeNameModal(){
  $("nameModal")?.classList.remove("show");
}

export async function initProfilePage({ setHeaderTokens } = {}){
  const session = await requireSessionOrRedirect();
  if(!session) return;

  const user = session.user;
  const profile = await fetchProfile(user.id);

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "Kullanıcı";

  $("pName").textContent = displayName;
  $("pEmail").textContent = profile?.email || user.email || "—";

  const memberNo = await ensureMemberNo(profile);
  $("memberNo").textContent = memberNo || "—";
  $("copyMemberBtn")?.addEventListener("click", ()=>copyText(memberNo));

  $("createdAt").textContent = fmtDT(profile?.created_at);
  $("lastLogin").textContent = fmtDT(profile?.last_login_at);

  const tokens = Number(profile?.tokens ?? 0);
  $("tokenVal").textContent = String(tokens);
  if(typeof setHeaderTokens === "function") setHeaderTokens(tokens);

  renderLevels(profile);
  renderOffline(profile);

  // Buttons
  $("buyTokensBtn")?.addEventListener("click", buyTokens);
  $("offlineDownloadBtn")?.addEventListener("click", ()=>location.href="/pages/offline.html");
  $("logoutBtn")?.addEventListener("click", safeLogoutHard);
  $("deleteBtn")?.addEventListener("click", requestDeletionFlow);

  // ✅ Ad düzenleme
  $("editNameBtn")?.addEventListener("click", ()=>openNameModal(displayName));
  $("cancelNameBtn")?.addEventListener("click", closeNameModal);

  $("saveNameBtn")?.addEventListener("click", async ()=>{
    const input = $("nameInput");
    try{
      const saved = await updateStudentName(user.id, input?.value);
      $("pName").textContent = saved;

      // Header’daki isim de güncellensin (ui_guard bootPage nameId="userName")
      const headerName = document.getElementById("userName");
      if(headerName) headerName.textContent = saved;

      toast("İsim güncellendi");
      closeNameModal();
    }catch(e){
      toast(e?.message || "İsim güncellenemedi");
    }
  });

  // modal dışına tıklayınca kapat
  $("nameModal")?.addEventListener("click", (ev)=>{
    if(ev.target?.id === "nameModal") closeNameModal();
  });
}
