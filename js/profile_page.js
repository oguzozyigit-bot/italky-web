// /js/profile_page.js  (RELAXED GUARD - same as home)
// - google_id_token şartı KALKTI (home gibi)
// - terms + email + STORAGE_KEY yeterli
// - dil değişimi anında applyI18n
// ✅ FIX: title i18n + null-guards + better initials

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
  return safeJson(localStorage.getItem(STORAGE_KEY), {});
}

/* ✅ Home ile aynı: token şartı yok */
function ensureLogged(){
  const u = getUser();
  if(!u || !u.email){
    location.replace("/index.html");
    return null;
  }
  // sözleşme onayı zorunlu
  if(!localStorage.getItem(termsKey(u.email))){
    location.replace("/index.html");
    return null;
  }
  return u;
}

function initialsFrom(full=""){
  const s = String(full||"").trim();
  if(!s) return "•";
  const parts = s.split(/\s+/).filter(Boolean);
  if(parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0,1).toUpperCase();
}

function buildLangOptions(selectEl){
  if(!selectEl) return; // ✅ guard
  const labels = {
    tr: "TR • Türkçe",
    en: "EN • English",
    de: "DE • Deutsch",
    it: "IT • Italiano",
    fr: "FR • Français",
  };
  selectEl.innerHTML = SUPPORTED_SITE_LANGS.map(code=>{
    const txt = labels[code] || code.toUpperCase();
    return `<option value="${code}">${txt}</option>`;
  }).join("");

async function deleteAccountFlow(u){
  const ok = confirm(t("profile_delete_confirm"));
  if(!ok) return;

  try{
    await apiPOST("/api/account/delete", { user_id: (u.user_id || u.id || u.email) });
  }catch{}

  try{
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("italky_api_token");
    localStorage.removeItem("google_id_token"); // varsa
    localStorage.removeItem(termsKey(u.email));
  }catch{}

  alert(t("profile_deleted_local"));
  location.replace("/index.html");
}

document.addEventListener("DOMContentLoaded", ()=>{
  const u = ensureLogged();
  if(!u) return;

  // i18n uygula + title
  applyI18n(document);
  document.title = t("profile_title"); // ✅

  // Back/Home
  $("backBtn")?.addEventListener("click", (e)=>{
    // link var ama safe olsun
    e?.preventDefault?.();
    if(history.length>1) history.back();
    else location.href="/pages/home.html";
  });
  $("logoHome")?.addEventListener("click", ()=> location.href="/pages/home.html");

  // Profile fields
  const full = (u.fullname || u.name || u.display_name || u.email || "—").trim();
  $("fullName").textContent = full;
  $("email").textContent = (u.email || "—").trim();
  $("planBadge").textContent = String(u.plan || "FREE").toUpperCase();

  const pic = String(u.picture || u.avatar || u.avatar_url || "").trim();
  if(pic) $("avatarBox").innerHTML = `<img src="${pic}" alt="avatar" referrerpolicy="no-referrer">`;
  else $("avatarBox").textContent = initialsFrom(full);

  // Site language
  const sel = $("siteLangSelect");
  buildLangOptions(sel);
  if(sel) sel.value = getSiteLang();

  sel?.addEventListener("change", ()=>{
    const newLang = setSiteLang(sel.value);
    sel.value = newLang;

    applyI18n(document);
    document.title = t("profile_title");
    toast(t("profile_lang_saved"));

    // diğer sayfalar anında güncellensin
    try{ localStorage.setItem("italky_lang_ping", String(Date.now())); }catch{}
  });

  // dışarıdan dil değişince
  window.addEventListener("storage",(e)=>{
    if(e.key==="italky_site_lang_v1" || e.key==="italky_lang_ping"){
      applyI18n(document);
      document.title = t("profile_title");
      if(sel) sel.value = getSiteLang();
    }
  });

  // Upgrade
  const doUpgrade = ()=> toast(t("profile_upgrade_toast"));
  $("upgradeBtn")?.addEventListener("click", doUpgrade);
  $("upgradeBtn2")?.addEventListener("click", doUpgrade);

  // Logout / Delete
  $("logoutBtn")?.addEventListener("click", ()=> logout());
  $("deleteBtn")?.addEventListener("click", ()=> deleteAccountFlow(u));
});
