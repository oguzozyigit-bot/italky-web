/* FILE: /js/ui_shell.js */
import { STORAGE_KEY } from "/js/config.js";

/* ===============================
    HOME HEADER/FOOTER (QUANTUM UPGRADE)
================================ */
const HOME_HEADER_HTML = `
<header class="premium-header" id="italkyHeader">
  <div class="brand-group" id="brandHome" style="cursor:pointer;">
    <div class="logo-wrap">
      <h1><span>italky</span><span class="ai">AI</span></h1>
      <div class="brand-slogan">QUANTUM TERMINAL</div>
    </div>
  </div>

  <div class="user-info" id="profileBtn" title="Profil">
    <div class="uMeta">
      <div class="uName" id="userName">Kullanıcı</div>
      <div class="uJeton"><span class="j-icon">⚡</span> <span id="headerJeton">—</span></div>
    </div>
    <div class="avatar-frame">
      <div class="avatar-glow"></div>
      <div class="avatar"><img src="" id="userPic" alt=""></div>
    </div>
  </div>
</header>
`;

const HOME_FOOTER_HTML = `
<footer class="premium-footer" id="italkyFooter">
  <div class="footer-blur-bg"></div>
  <nav class="footer-nav">
    <a href="/pages/about.html">Hakkımızda</a>
    <a href="/pages/faq.html">SSS</a>
    <a href="/pages/privacy.html">Gizlilik</a>
    <a href="/pages/contact.html">İletişim</a>
  </nav>
  <div class="signature">italkyAI @ italkyAcademy • By Ozyigit</div>
</footer>
`;

/* ===============================
    SHELL CSS (OS V3 İLE TAM UYUMLU)
================================ */
const SHELL_CSS = `
:root{
  --ai-gradient: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
  --neon-blue: #00d2ff;
  --bg-void: #000;
  --footerH: 0px;
}

*{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; outline:none; }

html, body{
  margin:0; padding:0;
  width:100%; height:100%;
  background: #000 !important;
  font-family:'Outfit', sans-serif;
  overflow:hidden;
  color:#fff;
}

/* 🟣 Kuantum Uzay Arka Planı */
.italky-bg{
  position: fixed; inset: 0; z-index: 0;
  background: radial-gradient(circle at 50% 30%, #0d0d2b 0%, #000 100%);
}

.app-viewport{
  position:relative;
  z-index: 5;
  width:100%;
  max-width:430px;
  height:100dvh;
  margin:0 auto;
  display:flex;
  flex-direction:column;
  border-left: 1px solid rgba(255,255,255,0.05);
  border-right: 1px solid rgba(255,255,255,0.05);
  overflow:hidden;
}

/* 🚀 HEADER: Holografik Terminal */
.premium-header{
  padding: calc(40px + env(safe-area-inset-top)) 20px 15px;
  display:flex; align-items:center; justify-content:space-between;
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex: 0 0 auto;
  z-index: 100;
}
.brand-group h1{
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px; margin: 0; font-weight: 800; display:flex; gap:2px;
}
.brand-group h1 .ai{
  background: var(--ai-gradient);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
}
.brand-slogan{
  font-size: 8px; font-weight: 900; letter-spacing: 3px;
  color: var(--neon-blue); text-transform: uppercase; margin-top: 4px;
}

/* Kullanıcı Alanı */
.uMeta{ display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
.uName{ font-weight:800; font-size:12px; opacity:0.8; }
.uJeton{ 
  font-size:11px; font-weight:1000; color:#fff;
  background: rgba(99, 102, 241, 0.2);
  padding: 2px 8px; border-radius: 20px;
  border: 1px solid rgba(165, 180, 252, 0.2);
}
.avatar-frame { position: relative; width: 38px; height: 38px; }
.avatar-glow {
  position: absolute; inset: -2px; border-radius: 50%;
  background: var(--ai-gradient); filter: blur(4px); opacity: 0.5;
}
.avatar{
  position: relative; width: 100%; height: 100%;
  border-radius:50%; border: 1.5px solid rgba(255,255,255,0.2);
  overflow:hidden; background: #000; z-index: 2;
}
.avatar img{ width:100%; height:100%; object-fit:cover; }

/* MAIN AREA */
.shellMain{
  flex:1; min-height:0; overflow-y:auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(var(--footerH) + 10px);
}
.shellMain::-webkit-scrollbar{ display:none; }

/* 🛸 FOOTER: Yüzen Kontrol Paneli */
.premium-footer{
  position:absolute;
  left:10px; right:10px; bottom:10px; /* Kenarlardan boşluk bırakarak yüzer hale getirdim */
  display:flex; flex-direction:column; align-items:center;
  background: rgba(10, 10, 25, 0.6);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px; /* Oval köşeler */
  padding: 12px 10px calc(12px + env(safe-area-inset-bottom));
  z-index: 50;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.footer-nav{ display:flex; gap:18px; margin-bottom: 8px; }
.footer-nav a{
  font-size:10px; font-weight:900; color: rgba(255,255,255,0.4);
  text-decoration:none; text-transform: uppercase; letter-spacing: 1px;
}
.signature{
  font-size:10px; font-weight:1000;
  color: rgba(255,255,255,0.2);
  text-align:center; letter-spacing: 0.5px;
}
`;

/* ===============================
    MOUNT & HELPERS
================================ */
function injectShellStyle(){
  if(document.getElementById("italkyShellStyle")) return;
  const st = document.createElement("style");
  st.id = "italkyShellStyle";
  st.textContent = SHELL_CSS;
  document.head.appendChild(st);
}

export function shortDisplayName(fullName){
  const s = String(fullName || "").trim().replace(/\s+/g," ");
  if(!s) return "Kullanıcı";
  const parts = s.split(" ").filter(Boolean);
  if(parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length-1][0].toUpperCase()}.`;
}

function safeSetText(id, val){
  const el = document.getElementById(id);
  if(el) el.textContent = (val ?? "");
}

function safeSetImg(id, src){
  const el = document.getElementById(id);
  if(el && src) el.src = src;
}

export function setHeaderTokens(n){
  safeSetText("headerJeton", (n == null ? "—" : String(n)));
}

export function hydrateFromCache(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const u = JSON.parse(raw);
    const nm = u?.display_name || u?.name || u?.full_name || u?.email || "";
    safeSetText("userName", shortDisplayName(nm));
    const pic = u?.picture || u?.avatar || u?.avatar_url || "";
    if(pic) safeSetImg("userPic", pic);
    if(u?.tokens != null) setHeaderTokens(u.tokens);
  }catch{}
}

function syncFooterHeight(){
  try{
    const footer = document.getElementById("italkyFooter");
    if(!footer) return;
    const h = Math.round(footer.getBoundingClientRect().height || 0);
    if(h > 0) document.documentElement.style.setProperty("--footerH", h + 40 + "px"); // Boşluk payı eklendi
  }catch{}
}

export function mountShell(options = {}){
  injectShellStyle();
  if(document.getElementById("italkyAppShell")){
    hydrateFromCache();
    return;
  }

  const content = document.getElementById("pageContent");
  if(!content) return;

  const bg = document.createElement("div");
  bg.className = "italky-bg";

  const shell = document.createElement("div");
  shell.className = "app-viewport";
  shell.id = "italkyAppShell";
  shell.innerHTML = HOME_HEADER_HTML + `<main class="shellMain" id="shellMain"></main>` + HOME_FOOTER_HTML;

  const main = shell.querySelector("#shellMain");
  main.appendChild(content);
  main.style.overflowY = (options?.scroll === "none") ? "hidden" : "auto";

  document.body.prepend(bg, shell);

  document.getElementById("brandHome")?.addEventListener("click", ()=>location.href="/pages/home.html");
  document.getElementById("profileBtn")?.addEventListener("click", ()=>location.href="/pages/profile.html");

  hydrateFromCache();
  syncFooterHeight();

  window.addEventListener("resize", syncFooterHeight);
  setTimeout(syncFooterHeight, 300);
}
