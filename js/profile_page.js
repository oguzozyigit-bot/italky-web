// FILE: /js/profile_page.js
// ✅ profiles.id = auth.users.id
// ✅ RLS: auth.uid() = profiles.id
// ✅ Tarih formatı: GG/AA/YYYY • SS:DD
// ✅ Voice kolonları yoksa bile profil verileri gelmeye devam eder
// ✅ Jeton Yükle -> /pages/jetonbuy.html
// ✅ Güvenli çıkış %100
// ✅ last_login_at günceller + shell cache tazeler
// ✅ Account delete = HARD DELETE (Render API)

import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id)=>document.getElementById(id);

function safeText(id, val){
  const el = $(id);
  if(el) el.textContent = (val ?? "—");
}

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = String(msg || "");
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(() => t.classList.remove("show"), 1800);
}

function fmtDT(iso){
  if(!iso) return "—";
  try{
    const d = new Date(iso);
    if(Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2,"0");
    const mi = String(d.getMinutes()).padStart(2,"0");
    return `${dd}/${mm}/${yy} • ${hh}:${mi}`;
  }catch{
    return "—";
  }
}

function fmtDuration(sec){
  const s = Number(sec || 0);
  if(!s || s < 1) return "—";
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function shortDisplayName(fullName){
  const s = String(fullName || "").trim().replace(/\s+/g," ");
  if(!s) return "Kullanıcı";
  const parts = s.split(" ").filter(Boolean);
  if(parts.length === 1) return parts[0];
  if(parts.length === 2) return `${parts[0]} ${(parts[1][0]||"").toUpperCase()}.`;
  const last = parts[parts.length - 1];
  const firsts = parts.slice(0, -1).join(" ");
  return `${firsts} ${(last[0]||"").toUpperCase()}.`;
}

function nukeAuthStorage(){
  try{
    const keys = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(!k) continue;
      if(k.startsWith("sb-")) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }catch{}
}

async function safeLogoutHard(){
  try{ await supabase.auth.signOut(); }catch(e){ console.warn("[signOut]", e); }
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  try{ localStorage.removeItem("NAC_ID"); }catch{}
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

function randLetter(){
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return A[Math.floor(Math.random() * A.length)];
}

function randDigits7(){
  let s = "";
  for(let i=0;i<7;i++) s += String(Math.floor(Math.random() * 10));
  return s;
}

function digitsOk(d){
  for(let i=0;i<=d.length-3;i++){
    const a = +d[i], b = +d[i+1], c = +d[i+2];
    if(a + 1 === b && b + 1 === c) return false;
    if(a - 1 === b && b - 1 === c) return false;
    if(a === b && b === c) return false;
  }
  return true;
}

function genMemberNo(){
  for(let k=0;k<300;k++){
    const L = randLetter();
    const D = randDigits7();
    if(digitsOk(D)) return `${L}${D}`;
  }
  return `${randLetter()}${randDigits7()}`;
}

function updateLocalUserCache({ full_name, email, tokens, avatar_url }){
  try{
    const raw =
