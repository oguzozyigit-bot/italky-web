// /js/profile_page.js
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
function ensureLogged(){
  const u = getUser();
  if(!u || !u.email){ location.replace("/index.html"); return null; }
  if(!localStorage.getItem(termsKey(u.email))){ location.replace("/index.html"); return null; }
  const gid = (localStorage.getItem("google_id_token") || "").trim();
  if(!gid){ location.replace("/index.html"); return null; }
  if(!u.isSessionActive){ location.replace("/index.html"); return null; }
  return u;
}

/* Drawer */
function openDrawer(){ $("drawerBack").classList.add("show"); }
function closeDrawer(){ $("drawerBack").classList.remove("show"); }

/* Site language select labels (always same order) */
function buildLangOptions(selectEl){
  // display names in native (as you requested for now)
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
}

async function deleteAccountFlow(u){
  const ok = confirm(t("profile_delete_confirm"));
  if(!ok) return;

  try{
    await apiPOST("/api/account/delete", { user_id: (u.user_id || u.id || u.email) });
  }catch{}

  try{
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    localStorage.removeItem("italky_api_token");
    localStorage.removeItem(termsKey(u.email));
  }catch{}

  alert(t("profile_deleted_local"));
  location.replace("/index.html");
}

document.addEventListener("DOMContentLoaded", ()=>{
  // apply current lang immediately
  applyI18n(document);

  const u = ensureLogged();
  if(!u) return;

  // header actions
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href="/pages/home.html";
  });
  $("logoHome")?.addEventListener("click", ()=> location.href="/pages/home.html");

  // profile fields (Google’dan gelen)
  const full = (u.fullname || u.name || u.display_name || u.email || "—").trim();
  $("fullName").textContent = full;
  $("email").textContent = (u.email || "—").trim();
  $("planBadge").textContent = String(u.plan || "FREE").toUpperCase();

  const pic = String(u.picture || u.avatar || u.avatar_url || "").trim();
  if(pic){
    $("avatarBox").innerHTML = `<img src="${pic}" alt="avatar">`;
  }else{
    $("avatarBox").textContent = (full && full[0]) ? full[0].toUpperCase() : "•";
  }

  // drawer open/close
  $("menuBtn")?.addEventListener("click", openDrawer);
  $("closeDrawer")?.addEventListener("click", closeDrawer);
  $("drawerBack")?.addEventListener("click", (e)=>{ if(e.target === $("drawerBack")) closeDrawer(); });

  // site lang real change
  const sel = $("siteLangSelect");
  buildLangOptions(sel);
  sel.value = getSiteLang();

  sel.addEventListener("change", ()=>{
    const newLang = setSiteLang(sel.value);
    sel.value = newLang;

    // ✅ APPLY IMMEDIATELY on this page
    applyI18n(document);
    toast(t("profile_lang_saved"));

    // ✅ Also broadcast to other open tabs/pages
    try{
      localStorage.setItem("italky_lang_ping", String(Date.now()));
    }catch{}
  });

  // listen to cross-tab language changes
  window.addEventListener("storage", (e)=>{
    if(e.key === "italky_site_lang_v1" || e.key === "italky_lang_ping"){
      applyI18n(document);
      // keep select in sync
      sel.value = getSiteLang();
    }
  });

  // upgrade
  const doUpgrade = ()=>{
    toast(t("profile_upgrade_toast"));
    closeDrawer();
  };
  $("upgradeBtn")?.addEventListener("click", doUpgrade);
  $("upgradeBtn2")?.addEventListener("click", doUpgrade);

  // secure logout
  $("logoutBtn")?.addEventListener("click", ()=>{
    closeDrawer();
    logout();
  });

  // delete account
  $("deleteBtn")?.addEventListener("click", async ()=>{
    closeDrawer();
    await deleteAccountFlow(u);
  });
});
