// italky-web/js/auth.js
// VERSION: italky-v1 (SP single source + FREE default + italky terms key)

import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "./config.js";

const API_TOKEN_KEY = "italky_api_token";
const STABLE_ID_KEY = "italky_stable_id_v1";

function getAuthState(){
  if(!window.__ITALKY_AUTH__) window.__ITALKY_AUTH__ = { inited:false, btnRendered:false };
  return window.__ITALKY_AUTH__;
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
  const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
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
    (data.token ||
     data.access_token ||
     data.api_token ||
     data.jwt ||
     data.session_token ||
     data.auth_token ||
     data.bearer ||
     data.accessToken ||
     "").trim();

  if(!token) throw new Error("auth/google token not found in response");
  setApiToken(token);
  return token;
}

async function handleGoogleResponse(res){
  try{
    const idToken = (res?.credential || "").trim();
    if(!idToken) return;

    localStorage.setItem("google_id_token", idToken);

    const payload = parseJwt(idToken);
    if(!payload?.email){
      alert("Google token çözülemedi. Client ID / domain ayarlarını kontrol et.");
      return;
    }

    const email = String(payload.email).toLowerCase().trim();
    const savedTermsAt = localStorage.getItem(termsKey(email)) || null;
    const stableId = getOrCreateStableId();

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

    try{
      await fetchBackendToken(idToken);
    }catch(e){
      console.warn("backend token alınamadı:", e);
      clearApiToken();
    }

    // ✅ sözleşme varsa direkt home, yoksa modal aç
    if(savedTermsAt){
      window.location.replace("/pages/home.html");
      return;
    }
    if(typeof window.__ITALKY_SHOW_TERMS__ === "function"){
      window.__ITALKY_SHOW_TERMS__();
      return;
    }
    window.location.replace("/index.html");
  }catch(e){
    console.error("handleGoogleResponse error:", e);
    alert("Google girişinde hata oldu. Console'u kontrol et.");
  }
}

function renderGoogleOverlayButton(){
  const st = getAuthState();
  if(st.btnRendered) return;

  // ✅ index.html wrapper id
  const wrap = document.getElementById("googleBtnWrapper");
  if(!wrap) return;

  try{
    window.google.accounts.id.renderButton(wrap, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: wrap.clientWidth || 380
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

  renderGoogleOverlayButton();
}

export async function acceptTerms(){
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const email = String(user?.email || "").toLowerCase().trim();
  if(!email) return false;

  const ts = new Date().toISOString();
  localStorage.setItem(termsKey(email), ts);

  user.terms_accepted_at = ts;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  return true;
}

export function logout(){
  if(confirm("Çıkış yapılıyor.")){
    try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch {}
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    localStorage.removeItem(API_TOKEN_KEY);
    window.location.replace("/index.html");
  }
}
