// FILE: /js/profile_page.js
import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

/**
 * Seviye alanları:
 * Şu an tablonda level kolonları yoksa boş kalır ve “Henüz…” yazar.
 * Kolon ekleyince burayı genişlet:
 *  - level_jack, level_heidi, level_diego ... veya level_en, level_de ...
 */
const LEVEL_FIELDS = [
  { field: "level_jack",  label: "English • Jack" },
  { field: "level_heidi", label: "Deutsch • Heidi" },
  { field: "level_diego", label: "Español • Diego" },
];

function fmtDateTime(iso){
  if(!iso) return "—";
  try{
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }catch{
    return "—";
  }
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function pill(title, desc, right){
  const div = document.createElement("div");
  div.className = "pill";
  div.innerHTML = `
    <div>
      <div class="t">${escapeHtml(title)}</div>
      <div class="d">${escapeHtml(desc || "")}</div>
    </div>
    <div class="r">${escapeHtml(right || "")}</div>
  `;
  return div;
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

/**
 * PROFİLİ DB’DE GARANTİLE
 * - ensure_profile RPC varsa: tokens=400 ilk kayıtta garanti
 * - yoksa: profiles select (fallback)
 */
async function fetchProfileEnsured(userId){
  const { data: p, error: e } = await supabase.rpc("ensure_profile");
  if(!e && p) return p;

  const { data: p2, error: e2 } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if(e2) throw e2;
  return p2;
}

function renderLevels(profile){
  const list = $("levelsList");
  const empty = $("levelsEmptyNote");
  list.innerHTML = "";

  const items = LEVEL_FIELDS
    .map(x => ({ ...x, value: profile?.[x.field] ?? null }))
    .filter(x => x.value);

  if(items.length === 0){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  for(const it of items){
    list.appendChild(pill(it.label, "Seviye tespit sonucu", String(it.value)));
  }
}

function renderOffline(profile){
  const list = $("offlineList");
  const empty = $("offlineEmptyNote");
  list.innerHTML = "";

  const langs = Array.isArray(profile?.offline_langs) ? profile.offline_langs : [];

  if(langs.length === 0){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  for(const x of langs){
    list.appendChild(pill(String(x), "Offline paket indirildi", "Hazır"));
  }
}

/**
 * ✅ GÜVENLİ ÇIKIŞ (kesin)
 * - Supabase session kapat
 * - cache temizle (wallet/guard tekrar “login olmuş” sanmasın)
 * - login’e yönlendir
 */
async function safeLogout(){
  try{ await supabase.auth.signOut(); }catch(_e){}
  try{ localStorage.removeItem(STORAGE_KEY); }catch(_e){}
  try{ localStorage.removeItem("NAC_ID"); }catch(_e){}
  location.href = "/pages/login.html";
}

async function buyTokens(){
  alert("Jeton satın alma web sürümünde kapalı. APK sürümünde Google Play ile açılacak.");
}

async function deleteAccountFlow(){
  const ok1 = confirm("Hesabınızı KALICI olarak silmek istediğinize emin misiniz?");
  if(!ok1) return;
  const ok2 = confirm("Son kez: Bu işlem geri alınamaz. Devam edilsin mi?");
  if(!ok2) return;

  // Admin gerekir -> Edge Function
  try{
    const { error } = await supabase.functions.invoke("delete_account");
    if(error) throw error;
    alert("Hesap silme işlemi başlatıldı.");
    await safeLogout();
  }catch(e){
    alert("Kalıcı silme şu an aktif değil. Edge Function 'delete_account' kurulmalı.\n\nDetay: " + (e?.message || e));
  }
}

export async function initProfilePage({ setHeaderTokens } = {}){
  const session = await requireSessionOrRedirect();
  if(!session) return;

  const user = session.user;

  // Profilü çek
  const profile = await fetchProfileEnsured(user.id);

  // UI bind
  $("pId").textContent = profile?.id || user.id;
  $("pName").textContent = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Kullanıcı";
  $("pEmail").textContent = profile?.email || user.email || "—";

  // Üyelik no badge (member_no)
  $("memberBadge").textContent = `Üyelik: ${profile?.member_no || "—"}`;

  // Tarihler
  $("createdAtVal").textContent = fmtDateTime(profile?.created_at);
  $("lastLoginVal").textContent = fmtDateTime(profile?.last_login_at);

  // Token
  const tokens = Number(profile?.tokens ?? 0);
  $("tokenVal").textContent = String(tokens);
  if(typeof setHeaderTokens === "function") setHeaderTokens(tokens);

  // Listeler
  renderLevels(profile);
  renderOffline(profile);

  // Butonlar
  $("buyTokensBtn")?.addEventListener("click", buyTokens);
  $("goTeacherSelectBtn")?.addEventListener("click", ()=>location.href="/pages/teacher_select.html");
  $("offlineDownloadBtn")?.addEventListener("click", ()=>location.href="/pages/offline.html");
  $("logoutBtn")?.addEventListener("click", safeLogout);
  $("deleteBtn")?.addEventListener("click", deleteAccountFlow);
}
