/* FILE: /js/ui_shell.js */
import { STORAGE_KEY } from "/js/config.js";

/* ===============================
    HOME HEADER/FOOTER (QUANTUM)
================================ */
const HOME_HEADER_HTML = `
<header class="premium-header" id="italkyHeader">
  <div class="brand-group" id="brandHome" style="cursor:pointer;">
    <h1><span>italky</span><span class="ai">AI</span></h1>
    <div class="brand-slogan">BE FREE</div>
  </div>

  <div class="user-info" id="profileBtn" title="Profil">
    <div class="uMeta">
      <div class="uName" id="userName">Kullanıcı</div>
      <div class="uJeton">Jeton: <span id="headerJeton">—</span></div>
    </div>
    <div class="avatar"><img src="" id="userPic" alt=""></div>
  </div>
</header>
`;

const HOME_FOOTER_HTML = `
<footer class="premium-footer" id="italkyFooter">
  <nav class="footer-nav">
    <a href="/pages/about.html">Hakkımızda</a>
    <a href="/pages/faq.html">SSS</a>
    <a href="/pages/privacy.html">Gizlilik</a>
    <a href="/pages/contact.html">İletişim</a>
  </nav>
  <div class="signature">italkyAI @ italkyAcademy By Ozyigit's • 2026</div>
</footer>
`;

/* ===============================
    SHELL CSS (OS V3 MODERNA)
================================ */
const SHELL_CSS = `
:root{
  --ai-gradient: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
  --bg-void: #000;
  --footerH: 0px;
}

*{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; outline:none; }

html, body{
  margin:0; padding:0;
  width:100%; height:100%;
  background: var(--bg-void) !important;
  font-family:'Outfit', sans-serif;
  overflow:hidden;
  color:#fff;
}

/* 🟣 Quantum Nebula Background */
.italky-bg{
  position: fixed; inset: 0;
  pointer-events:none; z-index: 0;
  background: radial-gradient(circle at 50% 30%, #0d0d2b 0%, #000 100%);
}

/* App Frame */
.app-viewport{
  position:relative;
  z-index: 5;
  width:100%;
  max-width:430px;
  height:100dvh;
  margin:0 auto;
  display:flex;
  flex-direction:column;
  background: rgba(10, 10, 30, 0.4);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-left: 1px solid rgba(255,255,255,0.08);
  border-right: 1px solid rgba(255,255,255,0.08);
  overflow:hidden;
}

/* HEADER: Ovallik eklendi, ölçü korundu */
.premium-header{
  padding: calc(45px + env(safe-area-inset-top)) 18px 15px;
  display:flex; align-items:flex-start; justify-content:space-between;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.3);
  border-radius: 0 0 24px 24px; /* ✅ Yumuşak Alt Köşeler */
  flex: 0 0 auto;
}
.brand-group h1{
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px; margin: 0; font-weight: 700; line-height: 1;
  display:flex; gap:2px;
}
.brand-group h1 .ai{
  background: var(--ai-gradient);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
}
.brand-slogan{
  font-size: 8px; font-weight: 900; letter-spacing: 3px;
  color: rgba(255,255,255,0.5); text-transform: uppercase;
  margin-top: 5px;
}

.user-info{ display:flex; align-items:center; gap:12px; cursor:pointer; user-select:none; }
.uMeta{ display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
.uName{ font-weight:900; font-size:13px; max-width: 140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.uJeton{ 
    font-size:10px; font-weight:900; color:#a5b4fc; 
    background: rgba(165,180,252,0.12); padding: 2px 8px; border-radius: 8px; 
}
.avatar{
  width:38px; height:38px;
  border-radius:50%;
  border: 1.5px solid #6366f1;
  overflow:hidden;
  background: rgba(0,0,0,0.3);
  box-shadow: 0 0 10px rgba(99,102,241,0.2);
}
.avatar img{ width:100%; height:100%; object-fit:cover; display:block; }

/* MAIN CONTENT */
.shellMain{
  flex:1; min-height:0; overflow-y:auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(var(--footerH) + 12px);
}
.shellMain::-webkit-scrollbar{ display:none; }

/* FOOTER: Ovallik eklendi, ölçü korundu */
.premium-footer{
  position:absolute;
  left:0; right:0; bottom:0;
  display:flex; flex-direction:column; align-items:center;
  background: rgba(10, 10, 25, 0.6);
  backdrop-filter: blur(25px);
  border-top: 1px solid rgba(255,255,255,0.1);
  border-radius: 28px 28px 0 0; /* ✅ Yumuşak Üst Köşeler */
  padding: 12px 10px calc(10px + env(safe-area-inset-bottom));
  z-index: 50;
}
.footer-nav{ display:flex; gap:20px; margin-bottom: 8px; justify-content:center; }
.footer-nav a{
  font-size:10px; font-weight:900; color: rgba(255,255,255,0.4);
  text-decoration:none; text-transform: uppercase;
}
.signature{
  font-size:10px; font-weight:900;
  background: linear-gradient(to right, #6366f1, #ec4899);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  opacity: 0.8;
}
`;

/* ===============================
    HELPERS & MOUNT (Logic Protected)
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
  const last = parts[parts.length-1];
  const first = parts.slice(0,-1).join(" ");
  return `${first} ${last?.[0] ? last[0].toUpperCase() + "." : ""}`.trim();
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
    if(u?.tokens != null) safeSetText("headerJeton", String(u.tokens));
  }catch{}
}

function syncFooterHeight(){
  try{
    const footer = document.getElementById("italkyFooter");
    if(!footer) return;
    const h = Math.round(footer.getBoundingClientRect().height || 0);
    if(h > 0) document.documentElement.style.setProperty("--footerH", h + "px");
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
  setTimeout(syncFooterHeight, 200);
}
