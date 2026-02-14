/* FILE: /js/profile_page.js */
import { supabase } from "/js/supabase_client.js";

/**
 * Beklenen profiles kolonları (Supabase):
 * - id (uuid) = auth.users.id
 * - full_name (text) [opsiyon]
 * - avatar_url (text) [opsiyon]
 * - member_no (text) [YOKSA biz üretip yazacağız]
 * - tokens (int8)
 * - level_jack, level_heidi, level_diego ... (text)
 * - offline_langs (jsonb)  -> örn ["en-tr","tr-en"] veya ["en","de"]
 * - created_at (timestamptz)
 * - last_login_at (timestamptz)
 */

const $ = (id)=>document.getElementById(id);

const LEVEL_FIELDS = [
  { key: "jack",  field: "level_jack",  label: "Jack"  },
  { key: "heidi", field: "level_heidi", label: "Heidi" },
  { key: "diego", field: "level_diego", label: "Diego" },
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

// ✅ 1 harf + 7 rakam, rakamlar ardışık olmayacak (1-2, 5-6 gibi yok)
function generateMemberNo(){
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // I,O yok (karışmasın)
  const letter = letters[Math.floor(Math.random()*letters.length)];

  const digits = [];
  while(digits.length < 7){
    const d = Math.floor(Math.random()*10);
    if(digits.length > 0){
      const prev = digits[digits.length-1];
      if(Math.abs(d - prev) === 1) continue; // ardışık yok
      if(d === prev) continue; // aynı yan yana olmasın (bonus güvenlik)
    }
    digits.push(d);
  }
  return `${letter}${digits.join("")}`;
}

function pill(title, desc, rightText){
  const div = document.createElement("div");
  div.className = "pill";
  div.innerHTML = `
    <div class="left">
      <div class="t">${escapeHtml(title)}</div>
      <div class="d">${escapeHtml(desc || "")}</div>
    </div>
    <div class="t" style="opacity:.92">${escapeHtml(rightText || "")}</div>
  `;
  return div;
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function getSessionOrRedirect(){
  const { data, error } = await supabase.auth.getSession();
  if(error) throw error;
  const sess = data?.session;
  if(!sess){
    location.replace("/pages/login.html");
    return null;
  }
  return sess;
}

async function ensureProfileRow(user){
  // profiles satırı yoksa aç (tokens default 400 olmalı)
  // Not: RLS + insert policy yoksa bu insert başarısız olur => o durumda RPC kullanacağız.
  const userId = user.id;

  const { data: existing, error: e1 } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if(e1) throw e1;
  if(existing) return existing;

  const payload = {
    id: userId,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
    tokens: 400,
  };

  const { data: created, error: e2 } = await supabase
    .from("profiles")
    .insert(payload)
    .select("*")
    .single();

  if(e2){
    // Eğer RLS insert kapalıysa, burada patlar. O zaman RPC şart.
    throw new Error("profiles insert engellendi. Çözüm: ensure_profile() RPC kullanmalıyız.");
  }
  return created;
}

async function updateLastLogin(userId){
  // last_login_at kolonu yoksa sorun etmeyelim
  try{
    await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);
  }catch(_e){}
}

async function ensureMemberNo(profile){
  if(profile.member_no) return profile.member_no;

  const candidate = generateMemberNo();

  // Çakışma çok düşük ama yine de kontrol edelim (member_no unique olursa daha iyi)
  const { data, error } = await supabase
    .from("profiles")
    .update({ member_no: candidate })
    .eq("id", profile.id)
    .select("member_no")
    .single();

  if(error) throw error;
  return data.member_no || candidate;
}

function renderLevels(profile){
  const list = $("levelsList");
  const emptyNote = $("levelsEmptyNote");
  list.innerHTML = "";

  const items = LEVEL_FIELDS
    .map(x => ({ ...x, value: profile?.[x.field] ?? null }))
    .filter(x => x.value);

  if(items.length === 0){
    emptyNote.style.display = "block";
    return;
  }
  emptyNote.style.display = "none";

  for(const it of items){
    list.appendChild(
      pill(
        `Dil / Eğitmen: ${it.label}`,
        "Seviye tespit sonucu",
        String(it.value)
      )
    );
  }
}

function renderOffline(profile){
  const list = $("offlineList");
  const emptyNote = $("offlineEmptyNote");
  list.innerHTML = "";

  const langs = Array.isArray(profile?.offline_langs) ? profile.offline_langs : [];

  if(langs.length === 0){
    emptyNote.style.display = "block";
    return;
  }
  emptyNote.style.display = "none";

  for(const x of langs){
    list.appendChild(
      pill(
        String(x),
        "Offline paket indirildi",
        "Hazır"
      )
    );
  }
}

async function buyTokens(){
  // Web’de şimdilik bilgilendirme.
  // APK tarafında Google Play Billing bağlandığında bu buton native bridge / deep link / billing flow tetikleyecek.
  alert("Jeton satın alma şu an web sürümünde kapalı. APK sürümünde Google Play üzerinden açılacak.");
}

async function deleteAccountFlow(){
  // 2 aşamalı onay
  const ok1 = confirm("Hesabınızı KALICI olarak silmek istediğinize emin misiniz?");
  if(!ok1) return;

  const ok2 = confirm("Son kez soruyorum: Hesabınız silinecek ve geri alınamayacak. Devam edilsin mi?");
  if(!ok2) return;

  /**
   * ⚠️ Supabase client ile kullanıcıyı kalıcı silmek için admin yetkisi gerekir.
   * Çözüm: Supabase Edge Function (service role) veya kendi API’n.
   * Örn: supabase.functions.invoke("delete_account")
   */
  try{
    const { error } = await supabase.functions.invoke("delete_account");
    if(error) throw error;

    // Fonksiyon user’ı sildiyse session zaten düşer.
    alert("Hesap silme işlemi başlatıldı.");
    location.replace("/pages/login.html");
  }catch(e){
    alert("Hesap silme şu an aktif değil. Edge Function 'delete_account' kurulmalı.\n\nDetay: " + (e?.message || e));
  }
}

export async function initProfilePage({ setHeaderTokens } = {}){
  const sess = await getSessionOrRedirect();
  if(!sess) return;

  const user = sess.user;

  // Profil satırını al/oluştur
  const profile = await ensureProfileRow(user);

  // member_no yoksa üret ve yaz
  const memberNo = await ensureMemberNo(profile);

  // last_login_at güncelle
  await updateLastLogin(profile.id);

  // Güncel profil çekelim (member_no + last_login_at için)
  const { data: fresh, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profile.id)
    .single();

  if(error) throw error;

  // UI
  $("pName").textContent  = fresh.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Kullanıcı";
  $("pEmail").textContent = user.email || "—";

  $("memberBadge").textContent = `Üyelik: ${memberNo}`;

  const tokens = Number(fresh.tokens ?? 0);
  $("tokenVal").textContent = String(tokens);

  // header jeton (shell)
  if(typeof setHeaderTokens === "function") setHeaderTokens(tokens);

  $("createdAtVal").textContent = fmtDateTime(fresh.created_at);
  $("createdAtBadge").textContent = `Kayıt: ${fmtDateTime(fresh.created_at)}`;
  $("lastLoginVal").textContent = fmtDateTime(fresh.last_login_at);

  renderLevels(fresh);
  renderOffline(fresh);

  // Buttons
  $("buyTokensBtn").addEventListener("click", buyTokens);
  $("goTeacherSelectBtn").addEventListener("click", ()=>location.href="/pages/teacher_select.html");
  $("offlineDownloadBtn").addEventListener("click", ()=>location.href="/pages/offline.html");

  $("logoutBtn").addEventListener("click", async ()=>{
    await supabase.auth.signOut();
    location.replace("/pages/login.html");
  });

  $("deleteBtn").addEventListener("click", deleteAccountFlow);
}
