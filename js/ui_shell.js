// FILE: /js/ui_shell.js
// ✅ HOME header+footer'ını HER SAYFAYA birebir basar (milim şaşmaz)
// ✅ Kullanıcı sorununu kökten çözer:
//    - STORAGE_KEY -> local/session storage taraması -> URL query/hash -> JWT decode
//    - Bulunca STORAGE_KEY'e standart user yazar + URL'yi temizler

import { STORAGE_KEY } from "/js/config.js";
import { applyI18n } from "/js/i18n.js";

/* ✅ HOME HEADER (BİREBİR) */
const HOME_HEADER_HTML = `
<header class="premium-header">
  <div class="brand-group" id="brandHome" title="Ana sayfa">
    <h1><span>italky</span><span class="ai">AI</span></h1>
    <div class="brand-slogan">BE FREE</div>
  </div>

  <div class="user-plain" id="profileBtn" title="Profil">
    <div class="uName" id="userName">Kullanıcı</div>
    <div class="avatar"><img src="" id="userPic" alt=""></div>
  </div>
</header>
`;

/* ✅ HOME FOOTER (BİREBİR) */
const HOME_FOOTER_HTML = `
<footer class="premium-footer">
  <nav class="footer-nav">
    <a href="/pages/about.html">Hakkımızda</a>
    <a href="/pages/faq.html">SSS</a>
    <a href="/pages/privacy.html">Gizlilik</a>
    <a href="/pages/contact.html">İletişim</a>
  </nav>
  <div class="prestige-signature">italkyAI By Ozyigit’s 2026</div>
</footer>
`;

/* ✅ HOME CSS (BİREBİR) + shell taşıma kuralları */
const SHELL_CSS = `
:root{
  --bg-void:#02000f;
  --text-main:#fff;
  --text-muted: rgba(255,255,255,0.65);
  --footerH: 92px;
  --bar-bg: rgba(0,0,0,0.18);
  --edgePad: 14px;
}

*{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; outline:none; }
html,body{
  margin:0; padding:0; width:100%; height:100%;
  overflow:hidden; position:fixed;
  font-family:'Outfit', sans-serif;
  background-color: var(--bg-void);
  color: var(--text-main);
}

/* background */
.nebula-bg{
  position:absolute; inset:-10%; width:120%; height:120%;
  background:
    radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.38) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.28) 0%, transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(30, 0, 60, 1) 0%, #02000f 100%);
  filter: blur(60px);
  z-index:0;
  animation: nebulaPulse 15s infinite alternate ease-in-out;
  pointer-events:none;
}
@keyframes nebulaPulse{
  from{ transform: scale(1) rotate(0deg); }
  to{ transform: scale(1.1) rotate(2deg); }
}
.stars-field{
  position:absolute; inset:0;
  background:url("https://www.transparenttextures.com/patterns/stardust.png");
  opacity:0.38;
  z-index:1;
  pointer-events:none;
}

/* shell container */
.app-shell{
  position:relative; z-index:10;
  width:100%; max-width:480px; height:100%;
  margin:0 auto;
  display:flex; flex-direction:column;
  background: rgba(10,10,30,0.40);
  backdrop-filter: blur(30px);
}

/* HEADER */
.premium-header{
  padding: calc(10px + env(safe-area-inset-top)) 18px 10px;
  display:flex; align-items:flex-start; justify-content:space-between; gap: 10px;
  background: var(--bar-bg);
  border-bottom-left-radius: 22px;
  border-bottom-right-radius: 22px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
}

.brand-group{ cursor:pointer; user-select:none; }
.brand-group h1{
  font-family:'Space Grotesk', sans-serif;
  font-size: 30px;
  margin:0;
  font-weight:700;
  letter-spacing:-1px;
  line-height: 1;
  display:flex;
  align-items:flex-end;
  gap:2px;
}
.brand-group h1 .ai{
  background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  filter: drop-shadow(0 0 10px rgba(99,102,241,0.35));
}
.brand-slogan{
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 3.6px;
  color: rgba(255,255,255,0.55);
  text-transform: uppercase;
  margin-top: 5px;
  padding-left: 1px;
  line-height: 1;
  max-width: 118px;
  overflow: hidden;
  white-space: nowrap;
}

.user-plain{
  display:flex; align-items:center; gap:10px;
  cursor:pointer; user-select:none; margin-top: 2px;
}
.uName{
  font-weight: 1000;
  font-size: 14px;
  color: rgba(255,255,255,0.92);
  white-space: nowrap;
  overflow:hidden;
  text-overflow: ellipsis;
  max-width: 190px;
  text-align:right;
}
.avatar{
  width: 40px; height: 40px;
  border-radius: 999px;
  overflow:hidden;
  border: 2px solid rgba(99,102,241,0.65);
  background: rgba(255,255,255,0.10);
  flex: 0 0 auto;
}
.avatar img{ width:100%; height:100%; object-fit:cover; display:block; }

/* main content */
.main-content{
  flex:1;
  overflow-y:auto;
  padding: var(--edgePad) 20px calc(var(--footerH) + var(--edgePad) + env(safe-area-inset-bottom));
  scrollbar-width:none;
}
.main-content::-webkit-scrollbar{ display:none; }

/* FOOTER */
.premium-footer{
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: min(480px, 100%);
  height: calc(var(--footerH) + env(safe-area-inset-bottom));
  z-index: 9999;

  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:flex-end;
  gap: 8px;

  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top-left-radius: 22px;
  border-top-right-radius: 22px;

  background: var(--bar-bg);
  border-top: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
}
.footer-nav{ display:flex; gap: 22px; justify-content:center; flex-wrap:wrap; line-height:1; margin: 0; padding: 0; }
.footer-nav a{
  font-size: 11px;
  font-weight: 900;
  color: rgba(255,255,255,0.55);
  text-decoration:none;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.footer-nav a:active{ opacity:.85; }
.prestige-signature{
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1.5px;
  background: linear-gradient(to right, #ffffff 0%, #6366f1 50%, #ffffff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 8px rgba(99,102,241,0.45));
  opacity: 0.92;
  margin: 0;
}

.app-shell.no-header .premium-header{ display:none; }
.app-shell.no-footer .premium-footer{ display:none; }
.app-shell.no-scroll .main-content{ overflow:hidden; }
`;

function ensureStyleOnce(){
  if(document.getElementById("italkyShellStyle")) return;
  const st = document.createElement("style");
  st.id = "italkyShellStyle";
  st.textContent = SHELL_CSS;
  document.head.appendChild(st);
}

/* ---------------- USER RECOVERY ---------------- */

function normalizeUserObject(o){
  if(!o) return null;
  const name = String(o.name || o.fullname || o.displayName || o.given_name || "").trim();
  const email = String(o.email || "").trim();
  const picture = String(o.picture || o.avatar || o.photoURL || o.image || "").trim();
  if(!name && !email && !picture) return null;
  return { name: name || "Kullanıcı", email, picture };
}

function decodeJwtPayload(token){
  try{
    const parts = token.split(".");
    if(parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(b64 + pad);
    return JSON.parse(json);
  }catch{
    return null;
  }
}

function findUserFromUrl(){
  try{
    // Query: ?name=&email=&picture=
    const q = new URLSearchParams(location.search || "");
    const qName = (q.get("name") || q.get("fullName") || q.get("fullname") || "").trim();
    const qEmail = (q.get("email") || "").trim();
    const qPic = (q.get("picture") || q.get("avatar") || q.get("photo") || "").trim();
    if(qName || qEmail || qPic){
      const u = normalizeUserObject({ name: qName, email: qEmail, picture: qPic });
      if(u) return u;
    }

    // Hash: #id_token=... OR #name=...
    const hash = (location.hash || "").replace(/^#/, "");
    if(hash){
      const h = new URLSearchParams(hash);

      const idTok = h.get("id_token") || h.get("idToken");
      if(idTok && idTok.includes(".")){
        const payload = decodeJwtPayload(idTok);
        if(payload){
          const u = normalizeUserObject({
            name: payload.name || payload.given_name || payload.family_name,
            email: payload.email,
            picture: payload.picture
          });
          if(u) return u;
        }
      }

      const hName = (h.get("name") || "").trim();
      const hEmail = (h.get("email") || "").trim();
      const hPic = (h.get("picture") || "").trim();
      if(hName || hEmail || hPic){
        const u = normalizeUserObject({ name: hName, email: hEmail, picture: hPic });
        if(u) return u;
      }
    }
  }catch{}
  return null;
}

function findUserByScanningStorage(storage){
  try{
    for(let i=0;i<storage.length;i++){
      const k = storage.key(i);
      if(!k) continue;
      const v = storage.getItem(k);
      if(!v) continue;

      // JSON object?
      if(v.length > 8 && v[0] === "{"){
        try{
          const obj = JSON.parse(v);

          // direct user fields
          const u1 = normalizeUserObject(obj);
          if(u1) return u1;

          // token inside object
          const tok = obj.id_token || obj.idToken || obj.access_token || obj.accessToken || obj.token;
          if(typeof tok === "string" && tok.includes(".")){
            const payload = decodeJwtPayload(tok);
            if(payload){
              const u2 = normalizeUserObject({
                name: payload.name || payload.given_name || payload.family_name,
                email: payload.email,
                picture: payload.picture
              });
              if(u2) return u2;
            }
          }
        }catch{}
      }

      // raw JWT?
      if(v.includes(".") && v.length > 40){
        const payload = decodeJwtPayload(v.trim());
        if(payload){
          const u3 = normalizeUserObject({
            name: payload.name || payload.given_name || payload.family_name,
            email: payload.email,
            picture: payload.picture
          });
          if(u3) return u3;
        }
      }
    }
  }catch{}
  return null;
}

function findUserAnywhere(){
  // 0) URL first (if OAuth returns tokens here)
  const fromUrl = findUserFromUrl();
  if(fromUrl) return fromUrl;

  // 1) STORAGE_KEY
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const u = normalizeUserObject(JSON.parse(raw));
      if(u) return u;
    }
  }catch{}

  // 2) scan localStorage
  let u = findUserByScanningStorage(localStorage);
  if(u) return u;

  // 3) scan sessionStorage
  try{
    u = findUserByScanningStorage(sessionStorage);
    if(u) return u;
  }catch{}

  return null;
}

function writeStandardUser(u){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: u.name || "Kullanıcı",
      email: u.email || "",
      picture: u.picture || ""
    }));
  }catch{}
}

function cleanUrlIfNeeded(){
  try{
    if(location.search || location.hash){
      history.replaceState({}, document.title, location.pathname);
    }
  }catch{}
}

function fillUser(){
  try{
    const u = findUserAnywhere();
    if(!u) return;

    writeStandardUser(u);
    cleanUrlIfNeeded();

    const elName = document.getElementById("userName");
    const elPic  = document.getElementById("userPic");
    if(elName) elName.textContent = u.name || "Kullanıcı";
    if(elPic && u.picture) elPic.src = u.picture;
  }catch{}
}

/* ---------------- SHELL MOUNT ---------------- */

export function mountShell(options = {}){
  const {
    enabled = true,
    header = true,
    footer = true,
    background = true,
    scroll = "main",
    maxWidth = "480px"
  } = options;

  if(!enabled) return;

  ensureStyleOnce();

  const content = document.getElementById("pageContent");
  if(!content){
    console.error("mountShell: #pageContent yok.");
    return;
  }

  if(background){
    if(!document.querySelector(".nebula-bg")){
      const n = document.createElement("div");
      n.className = "nebula-bg";
      document.body.appendChild(n);
    }
    if(!document.querySelector(".stars-field")){
      const s = document.createElement("div");
      s.className = "stars-field";
      document.body.appendChild(s);
    }
  }

  const shell = document.createElement("div");
  shell.className = "app-shell";
  shell.style.maxWidth = maxWidth;

  const headerHTML = header ? HOME_HEADER_HTML : "";
  const footerHTML = footer ? HOME_FOOTER_HTML : "";
  shell.innerHTML = headerHTML + `<main class="main-content"></main>` + footerHTML;

  if(!header) shell.classList.add("no-header");
  if(!footer) shell.classList.add("no-footer");
  if(scroll === "none") shell.classList.add("no-scroll");

  const main = shell.querySelector(".main-content");
  main.appendChild(content);

  const keep = Array.from(document.body.children).filter(el =>
    el.classList.contains("nebula-bg") || el.classList.contains("stars-field")
  );
  document.body.innerHTML = "";
  keep.forEach(el=>document.body.appendChild(el));
  document.body.appendChild(shell);

  document.getElementById("brandHome")?.addEventListener("click", ()=>location.href="/pages/home.html");
  document.getElementById("profileBtn")?.addEventListener("click", ()=>location.href="/pages/profile.html");

  try{ applyI18n?.(document); }catch{}
  fillUser();
}
