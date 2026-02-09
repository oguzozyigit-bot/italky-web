import { STORAGE_KEY } from "/js/config.js";
import { logout } from "/js/auth.js";
import { apiPOST } from "/js/api.js";
import { getSiteLang, setSiteLang, applyI18n, t, SUPPORTED_SITE_LANGS } from "/js/i18n.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{ return JSON.parse(s||""); }catch{ return fb; } }

function toast(msg){
  const tEl = $("toast");
  if(!tEl) return;
  tEl.textContent = msg;
  tEl.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=> tEl.classList.remove("show"), 1800);
}

function termsKey(email=""){
  return `italky_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}

function getUser(){
  // LocalStorage'dan ana veriyi çekiyoruz
  return safeJson(localStorage.getItem(STORAGE_KEY), {});
}

function ensureLogged(){
  const u = getUser();
  // Eğer kullanıcı verisi yoksa index'e atar
  if(!u || !u.email){
    location.replace("/index.html");
    return null;
  }
  return u;
}

function initialsFrom(full=""){
  const s = String(full||"").trim();
  if(!s || s === "—") return "•";
  const parts = s.split(/\s+/).filter(Boolean);
  if(parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0,1).toUpperCase();
}

function buildLangOptions(selectEl){
  if(!selectEl) return;
  const labels = { tr: "TR • Türkçe", en: "EN • English", de: "DE • Deutsch", it: "IT • Italiano", fr: "FR • Français" };
  selectEl.innerHTML = SUPPORTED_SITE_LANGS.map(code=>{
    const txt = labels[code] || code.toUpperCase();
    return `<option value="${code}">${txt}</option>`;
  }).join("");
}

async function deleteAccountFlow(u){
  const ok = confirm(t("profile_delete_confirm"));
  if(!ok) return;
  try{ await apiPOST("/api/account/delete", { user_id: (u.user_id || u.id || u.email) }); }catch{}
  try{
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("italky_api_token");
    localStorage.removeItem(termsKey(u.email));
  }catch{}
  alert(t("profile_deleted_local"));
  location.replace("/index.html");
}

document.addEventListener("DOMContentLoaded", ()=>{
  const u = ensureLogged();
  if(!u) return;

  applyI18n(document);
  document.title = t("profile_title");

  // ✅ DÜZELTME: Geri butonunun seni dışarı atmasını engelledik
  $("backBtn")?.addEventListener("click", (e)=>{
    if(history.length > 1) {
      e.preventDefault();
      history.back();
    }
    // else: history yoksa HTML'deki href="/pages/home.html" çalışacak
  });
  
  $("logoHome")?.addEventListener("click", ()=> location.href="/pages/home.html");

  // ✅ PROFİL VERİLERİ: Veri gelmiyorsa alternatif isim alanlarını kontrol et
  const full = (u.fullname || u.name || u.display_name || u.email || "—").trim();
  if($("fullName")) $("fullName").textContent = full;
  if($("email")) $("email").textContent = (u.email || "—").trim();
  if($("planBadge")) $("planBadge").textContent = String(u.plan || "FREE").toUpperCase();

  // ✅ AVATAR: Resim varsa göster, yoksa baş harfleri koy
  const pic = String(u.picture || u.avatar || u.avatar_url || "").trim();
  if(pic && $("avatarBox")) {
    $("avatarBox").innerHTML = `<img src="${pic}" alt="avatar" referrerpolicy="no-referrer">`;
  } else if($("avatarBox")) {
    $("avatarBox").textContent = initialsFrom(full);
  }

  const sel = $("siteLangSelect");
  buildLangOptions(sel);
  if(sel) {
    sel.value = getSiteLang();
    sel.addEventListener("change", ()=>{
      setSiteLang(sel.value);
      applyI18n(document);
      toast(t("profile_lang_saved"));
      try{ localStorage.setItem("italky_lang_ping", String(Date.now())); }catch{}
    });
  }

  const doUpgrade = ()=> toast(t("profile_upgrade_toast"));
  $("upgradeBtn")?.addEventListener("click", doUpgrade);
  $("upgradeBtn2")?.addEventListener("click", doUpgrade);
  $("logoutBtn")?.addEventListener("click", ()=> logout());
  $("deleteBtn")?.addEventListener("click", ()=> deleteAccountFlow(u));
});
