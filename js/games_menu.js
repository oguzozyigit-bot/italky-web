// FILE: /js/games_menu.js
import { mountShell, setHeaderTokens } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";

const $ = (id)=>document.getElementById(id);

const DAY_MS = 24 * 60 * 60 * 1000;
const COST_PER_GAME = 1;

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = String(msg||"");
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1800);
}

function passKey(gameId, userId){
  return `italky_gamepass_${gameId}_${userId}`;
}

function now(){ return Date.now(); }

function hasValidPass(gameId, userId){
  try{
    const raw = localStorage.getItem(passKey(gameId, userId));
    const ts = Number(raw || 0);
    if(!ts) return false;
    return (now() - ts) < DAY_MS;
  }catch{
    return false;
  }
}

function setPass(gameId, userId){
  try{ localStorage.setItem(passKey(gameId, userId), String(now())); }catch{}
}

function paintPasses(userId){
  document.querySelectorAll("[data-pass]").forEach(el=>{
    const gid = el.getAttribute("data-pass");
    if(!gid) return;
    const ok = hasValidPass(gid, userId);
    // PASS varsa daha parlak göster
    el.style.opacity = ok ? "1" : "0.55";
    el.textContent = ok ? "24h PASS ✓" : "24h PASS";
  });
}

async function getTokens(userId){
  const { data, error } = await supabase.from("profiles").select("tokens").eq("id", userId).single();
  if(error) throw error;
  return Number(data?.tokens ?? 0);
}

async function spendToken(userId, currentTokens){
  const newTokens = Math.max(0, Number(currentTokens||0) - COST_PER_GAME);
  const { error } = await supabase.from("profiles").update({ tokens: newTokens }).eq("id", userId);
  if(error) throw error;
  return newTokens;
}

async function launchGame(gameId, url){
  const { data:{ session } } = await supabase.auth.getSession();
  if(!session?.user){
    location.href = "/pages/login.html";
    return;
  }

  const userId = session.user.id;

  // 24h geçerliyse direk gir
  if(hasValidPass(gameId, userId)){
    location.href = url;
    return;
  }

  // Token kontrol + düş
  let tokens = 0;
  try{
    tokens = await getTokens(userId);
  }catch(e){
    console.error(e);
    toast("Jeton okunamadı");
    return;
  }

  if(tokens < COST_PER_GAME){
    toast("Devam etmek için jeton gerekli!");
    // istersen profile’a yönlendir:
    // location.href="/pages/profile.html";
    return;
  }

  try{
    const left = await spendToken(userId, tokens);
    setHeaderTokens(left);
    $("tokenBadge") && ($("tokenBadge").textContent = `Jeton: ${left}`);
    setPass(gameId, userId);
    paintPasses(userId);
    toast("24 saatlik erişim açıldı ✓");
    setTimeout(()=> location.href = url, 250);
  }catch(e){
    console.error(e);
    toast("Jeton düşülemedi");
  }
}

(async function boot(){
  mountShell({ scroll:"none" });

  // login guard
  const { data:{ session } } = await supabase.auth.getSession();
  if(!session?.user){
    location.replace("/pages/login.html");
    return;
  }

  // cache + header jeton
  const cached = await ensureAuthAndCacheUser().catch(()=>null);
  const tokens = Number(cached?.tokens ?? 0);
  setHeaderTokens(tokens);
  $("tokenBadge") && ($("tokenBadge").textContent = `Jeton: ${tokens}`);

  // PASS yazıları
  paintPasses(session.user.id);

  // click bind
  document.querySelectorAll(".game-module[data-game][data-url]").forEach(card=>{
    card.addEventListener("click", ()=>{
      const gid = card.getAttribute("data-game");
      const url = card.getAttribute("data-url");
      if(!gid || !url) return;
      launchGame(gid, url);
    });
  });
})();
