// FILE: /js/offline_languages_page.js

import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

mountShell({ scroll: "auto" });

const API_BASE = "https://italky-api.onrender.com";
const BUCKET = "offline";
const PIVOT = "en";
const USER_LANG_KEY = "italky_user_lang_v1";
const BASE_READY_PREFIX = "offline_base_ready_";

// 🔥 FREE LIMIT
const OFFLINE_FREE_LIMIT_KEY = "offline_free_langs_v1";

const $ = (id) => document.getElementById(id);

const toastEl = $("toast");
const sourceSelect = $("sourceSelect");
const installedList = $("installedList");
const searchInput = $("searchInput");
const countPill = $("installedCount");
const installBaseBtn = $("btnInstallBase");
const statusBox = $("statusBox");

/* ---------------- TOAST ---------------- */
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>{
    toastEl.classList.remove("show");
  },2200);
}

function norm(v){
  return String(v || "").toLowerCase().trim();
}

/* ---------------- FREE LIMIT ---------------- */
function getUsedFreeLangs(){
  try{
    return JSON.parse(localStorage.getItem(OFFLINE_FREE_LIMIT_KEY) || "[]");
  }catch{
    return [];
  }
}

function markLangAsUsed(lang){
  const set = new Set(getUsedFreeLangs());
  set.add(norm(lang));
  localStorage.setItem(OFFLINE_FREE_LIMIT_KEY, JSON.stringify([...set]));
}

function hasFreeRight(lang){
  return !getUsedFreeLangs().includes(norm(lang));
}

/* ---------------- LANG ---------------- */
const LANGS = [
  { code:"tr", flag:"🇹🇷", name:"Türkçe"},
  { code:"en", flag:"🇬🇧", name:"İngilizce"},
  { code:"de", flag:"🇩🇪", name:"Almanca"},
  { code:"fr", flag:"🇫🇷", name:"Fransızca"},
  { code:"es", flag:"🇪🇸", name:"İspanyolca"},
  { code:"it", flag:"🇮🇹", name:"İtalyanca"},
  { code:"ru", flag:"🇷🇺", name:"Rusça"},
  { code:"ja", flag:"🇯🇵", name:"Japonca"},
  { code:"ko", flag:"🇰🇷", name:"Korece"},
  { code:"zh", flag:"🇨🇳", name:"Çince"}
];

/* ---------------- USER LANG ---------------- */
function getUserLang(){
  return localStorage.getItem(USER_LANG_KEY) || "tr";
}

function setUserLang(code){
  localStorage.setItem(USER_LANG_KEY, code);
}

/* ---------------- BASE ---------------- */
function baseReadyKey(lang){
  return BASE_READY_PREFIX + lang;
}

function isBaseReady(lang){
  return localStorage.getItem(baseReadyKey(lang)) === "1";
}

function setBaseReady(lang){
  localStorage.setItem(baseReadyKey(lang), "1");
}

/* ---------------- STORAGE ---------------- */
function getInstalled(){
  return JSON.parse(localStorage.getItem("offline_installed_langs") || "[]");
}

function markInstalled(lang){
  const set = new Set(getInstalled());
  set.add(lang);
  localStorage.setItem("offline_installed_langs", JSON.stringify([...set]));
}

/* ---------------- NATIVE ---------------- */
function nativeReady(){
  return window.Offline && typeof window.Offline.installFromUrl === "function";
}

function installNative(pair, url){
  window.Offline.installFromUrl(pair, url);
}

/* ---------------- FILE ---------------- */
function publicUrl(path){
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

function pairPath(pair){
  return `langpacks/${pair}/model.zip`;
}

/* ---------------- INSTALL BASE ---------------- */
async function installBase(){

  const lang = getUserLang();

  installBaseBtn.disabled = true;
  installBaseBtn.textContent = "Kuruluyor...";

  try{

    const pairs = [`${lang}-${PIVOT}`, `${PIVOT}-${lang}`];

    for(const pair of pairs){
      const url = publicUrl(pairPath(pair));
      installNative(pair, url);
    }

    markInstalled("en");
    markInstalled(lang);
    setBaseReady(lang);

    toast("Temel kurulum tamamlandı");

  }catch(e){
    console.error(e);
    toast("Kurulum hatası");
  }

  installBaseBtn.textContent = "Hazır";
  render();
}

/* ---------------- INSTALL LANG ---------------- */
window.installLang = async function(lang){

  if(getInstalled().includes(lang)){
    toast("Zaten kurulu");
    return;
  }

  if(!hasFreeRight(lang)){
    toast("Bu dili daha önce indirdin");
    return;
  }

  if(!nativeReady()){
    toast("Offline sistem hazır değil");
    return;
  }

  try{
    const pairs = [`${lang}-${PIVOT}`, `${PIVOT}-${lang}`];

    for(const pair of pairs){
      const url = publicUrl(pairPath(pair));
      installNative(pair, url);
    }

    markInstalled(lang);
    markLangAsUsed(lang);

    toast("Dil indirildi");

  }catch(e){
    console.error(e);
    toast("İndirme hatası");
  }

  render();
};

/* ---------------- RENDER ---------------- */
function render(){

  const userLang = getUserLang();
  const installed = getInstalled();

  countPill.textContent = installed.length;

  installedList.innerHTML = LANGS
    .filter(l => l.code !== userLang)
    .map(l => {

      const installedFlag = installed.includes(l.code);
      const free = hasFreeRight(l.code);

      return `
      <div class="lang-card">
        <div class="lang-head">
          <div class="flag">${l.flag}</div>
          <div>
            <div class="lang-name">${l.name}</div>
            <div class="lang-sub">
              ${
                installedFlag
                ? "Kurulu"
                : (free ? "İlk indirme ücretsiz" : "Tekrar indirilemez")
              }
            </div>
          </div>
        </div>

        <button class="lang-btn" onclick="installLang('${l.code}')">
          ${installedFlag ? "✅ Kuruldu" : "İndir"}
        </button>
      </div>
      `;
    }).join("");
}

/* ---------------- EVENTS ---------------- */
installBaseBtn.onclick = installBase;

sourceSelect.onchange = ()=>{
  setUserLang(sourceSelect.value);
  render();
};

searchInput.oninput = render;

/* ---------------- INIT ---------------- */
render();
