// italky-web/js/auth.js
// VERSION: italky-v1.3 (FORCE terms accepted in Android WebView to prevent white screen)

import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "/js/config.js";

const API_TOKEN_KEY = "italky_api_token";
const STABLE_ID_KEY = "italky_stable_id_v1";
const TERMS_PENDING_KEY = "italky_terms_pending_v1";

const GOOGLE_BTN_ID = "googleBtnContainer";
const HOME_PATH = "/pages/home.html";

function getAuthState(){
  if(!window.__ITALKY_AUTH__) window.__ITALKY_AUTH__ = { inited:false, btnRendered:false };
  return window.__ITALKY_AUTH__;
}

function isWebView(){
  try{
    if (window.Android) return true;
  }catch{}
  const ua = String(navigator.userAgent || "");
  return /; wv\)|\bwv\b|Android.*Version\/\d+\.\d+.*Chrome/i.test(ua);
}

function termsKey(email=""){
  return `italky_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}

function setApiToken(t){ if(t) localStorage.setItem(API_TOKEN_KEY, t); }
function clearApiToken(){ localStorage.removeItem(API_TOKEN_KEY); }

function base64UrlToBytes(base64Url){
  let b64 = String(base64Url || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function parseJwt(idToken = ""){
  try{
    const parts = String(idToken).split(".");
    if(parts.length < 2) return null;
    const bytes = base64UrlToBytes(parts[1]);
    const json = new TextDecoder("utf-8", { fatal:false }).decode(bytes);
    return JSON.parse(json);
  }catch(e){
    console.error("parseJwt failed:", e);
    return null;
  }
}

function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickLetter(except){
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let ch = "";
  for(let t=0;t<50;t++){
    ch = A[randInt(0, A.length-1)];
    if(ch !== except) return ch;
  }
  return ch || "X";
}
function buildNonSequentialDigits(len=8){
  const digits = [];
  for(let i=0;i<len;i++){
    let d = randInt(0,9);
    for(let t=0;t<120;t++){
      const prev = digits[i-1];
      const prev2 = digits[i-2];
      const ok1 = (prev === undefined) ? true : (d !== prev && Math.abs(d - prev) !== 1);
      const ok2 = (prev2 === undefined) ? true : (d !== prev2);
      if(ok1 && ok2) break;
      d = randInt(0,9);
    }
    digits.push(d);
  }
  return digits.join("");
}
function getOrCreateStableId(){
  const existing = (localStorage.getItem(STABLE_ID_KEY) || "").trim();
  if(existing) return existing;
  const a = pickLetter("");
  const b = pickLetter(a);
  const nums = buildNonSequentialDigits(8);
  const id = `${a}${b}${nums}`;
  localStorage.setItem(STABLE_ID_KEY, id);
  return id;
}

async function fetchBackendToken(googleIdToken){
  const url = `${String(BASE_DOMAIN||"").replace(/\/+$/,"")}/api/auth/google`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      google_id_token: googleIdToken,
      id_token: googleIdToken,
      token: googleIdToken
    })
  });

  const txt = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(`auth/google failed: ${r.status} ${txt}`);

  let data = {};
  try { data = JSON.parse(txt || "{}"); } catch {}

  const token =
    (data.token || data.access_token || data.api_token || data.jwt || data.session_token ||
     data.auth_token || data.bearer || data.accessToken || "").trim();

  if(!token) throw new Error("auth/google token not found in response");
  setApiToken(token);
  return token;
}

/* ✅ index sayfasında zaten login ise direkt home */
export function redirectIfLoggedIn(){
  try{
    const u = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if(u?.email){
      window.location.replace(HOME_PATH);
      return true;
    }
  }catch{}
  return false;
}

function markTermsPending(){ try{ localStorage.setItem(TERMS_PENDING_KEY, "1"); }catch{} }
function clearTermsPending(){ try{ localStorage.removeItem(TERMS_PENDING_KEY); }catch{} }

async function handleGoogleResponse(res){
  try{
    const idToken = (res?.credential || "").trim();
    if(!idToken) return;

    localStorage.setItem("google_id_token", idToken);

    const payload = parseJwt(idToken);
    if(!payload?.email){
      console.error("Google token çözülemedi. Client ID / domain ayarlarını kontrol et.");
      return;
    }

    const email = String(payload.email).toLowerCase().trim();
    const stableId = getOrCreateStableId();

    // ✅ WEBVIEW: terms otomatik kabul (beyaz ekran fix)
    let savedTermsAt = localStorage.getItem(termsKey(email)) || null;
    if(!savedTermsAt && isWebView()){
      savedTermsAt = new Date().toISOString();
      localStorage.setItem(termsKey(email), savedTermsAt);
      clearTermsPending();
    }

    const user = {
      id: stableId,
      user_id: stableId,
      email,
      fullname: payload.name || "",
      name: payload.name || "",
      display_name: payload.name || "",
      picture: payload.picture || "",
      avatar: payload.picture || "",
      provider: "google",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),
      terms_accepted_at: savedTermsAt,
      sp_score: 10,
      plan: "FREE"
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    // backend token opsiyonel (başarısız olsa da giriş devam)
    try{
      await fetchBackendToken(idToken);
    }catch(e){
      console.warn("backend token alınamadı:", e);
      clearApiToken();
    }

    // ✅ terms varsa direkt home
    if(savedTermsAt){
      window.location.replace(HOME_PATH);
      return;
    }

    // Web (tarayıcı) tarafı: modal varsa aç
    if(typeof window.__ITALKY_SHOW_TERMS__ === "function"){
      markTermsPending();
      window.__ITALKY_SHOW_TERMS__();
      return;
    }

    // Web’de de modal yoksa bile artık kilitleme yok:
    console.warn("terms UI yok: home'a geçiliyor (terms_pending=1)");
    markTermsPending();
    window.location.replace(HOME_PATH);
  }catch(e){
    console.error("handleGoogleResponse error:", e);
  }
}

function renderGoogleButton(){
  const st = getAuthState();
  if(st.btnRendered) return;

  const wrap = document.getElementById(GOOGLE_BTN_ID);
  if(!wrap) return;

  try{
    if(wrap.childElementCount > 0){ st.btnRendered = true; return; }

    window.google.accounts.id.renderButton(wrap, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 320,
      logo_alignment: "left"
    });
    st.btnRendered = true;
  }catch(e){
    console.warn("renderButton failed:", e);
  }
}

export function initAuth(){
  const st = getAuthState();
  if(st.inited) return;

  if(!window.google?.accounts?.id) return;
  if(!GOOGLE_CLIENT_ID){
    console.error("GOOGLE_CLIENT_ID missing in config.js");
    return;
  }

  st.inited = true;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse,
    auto_select: false,
    use_fedcm_for_prompt: false,
    cancel_on_tap_outside: false
  });

  renderGoogleButton();
}

export async function acceptTerms(){
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const email = String(user?.email || "").toLowerCase().trim();
  if(!email) return false;

  const ts = new Date().toISOString();
  localStorage.setItem(termsKey(email), ts);

  user.terms_accepted_at = ts;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  clearTermsPending();
  return true;
}

export function logout(){
  if(confirm("Çıkış yapılıyor.")){
    try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch {}
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    localStorage.removeItem(API_TOKEN_KEY);
    localStorage.removeItem(TERMS_PENDING_KEY);
    window.location.replace("/index.html");
  }
}
