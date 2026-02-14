import { STORAGE_KEY } from "/js/config.js";
import { applyI18n } from "/js/i18n.js";

/* ✅ HOME HEADER - İSİM ÜSTTE, JETON ALTTA, AVATAR YANDA */
const HOME_HEADER_HTML = `
<header class="premium-header">
  <div class="brand-group" id="brandHome">
    <h1><span>italky</span><span class="ai">AI</span></h1>
    <div class="brand-slogan">BE FREE</div>
  </div>

  <div class="user-shell-box" id="profileBtn">
    <div class="user-info-stack">
      <div class="uName" id="userName">Kullanıcı</div>
      <div class="uJeton">Jeton: <span id="headerJeton">0</span> Adet</div>
    </div>
    <div class="avatar">
      <img src="" id="userPic" alt="">
    </div>
  </div>
</header>
`;

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

const SHELL_CSS = `
:root{
  --bg-void:#02000f;
  --text-main:#fff;
  --footerH: 92px;
  --bar-bg: rgba(0,0,0,0.40);
}

*{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; outline:none; }
html,body{
  margin:0; padding:0; width:100%; height:100%;
  overflow:hidden; position:fixed;
  font-family:'Outfit', sans-serif;
  background-color: var(--bg-void);
}

.app-shell{
  position:relative; z-index:10;
  width:100%; max-width:480px; height:100%;
  margin:0 auto;
  display:flex; flex-direction:column;
  background: rgba(10,10,30,0.40);
  backdrop-filter: blur(30px);
}

/* HEADER - TASARIM DÜZELTME */
.premium-header{
  padding: calc(14px + env(safe-area-inset-top)) 18px 14px;
  display:flex; align-items:center; justify-content:space-between;
  background: var(--bar-bg);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.user-shell-box {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.user-info-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end; /* Metinleri avatarın soluna yaslar */
}

.uName {
  font-weight: 800;
  font-size: 14px;
  color: #fff;
  line-height: 1.2;
}

.uJeton {
  font-size: 11px;
  font-weight: 800;
  color: #a5b4fc; /* Indigo tonu */
  margin-top: 2px;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px; /* Hafif karemsi premium görünüm */
  overflow: hidden;
  border: 1.5px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05);
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }

.main-content{ flex:1; overflow-y:auto; padding-bottom: 100px; scrollbar-width:none; }
.main-content::-webkit-scrollbar{ display:none; }

.premium-footer{
  position: fixed; bottom: 0; width: min(480px, 100%);
  height: var(--footerH);
  background: var(--bar-bg);
  border-top: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(30px);
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
}
.footer-nav a { font-size:11px; font-weight:900; color:rgba(255,255,255,0.5); text-decoration:none; text-transform:uppercase; letter-spacing:1px; }
.prestige-signature { font-size:12px; font-weight:900; background:linear-gradient(90deg, #fff, #6366f1); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }

/* Marka Logosu */
.brand-group h1 { font-size: 26px; margin:0; font-weight:900; display:flex; gap:2px; }
.brand-group h1 .ai { background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.brand-slogan { font-size: 8px; font-weight:900; color:rgba(255,255,255,0.4); letter-spacing:3px; margin-top:2px; }
`;

function ensureStyleOnce(){
  if(document.getElementById("italkyShellStyle")) return;
  const st = document.createElement("style");
  st.id = "italkyShellStyle";
  st.textContent = SHELL_CSS;
  document.head.appendChild(st);
}

async function fillUser(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const u = JSON.parse(raw);
    const elName = document.getElementById("userName");
    const elPic  = document.getElementById("userPic");
    const elJeton = document.getElementById("headerJeton");
    if(elName) elName.textContent = u.name || "Kullanıcı";
    if(elPic && u.picture) elPic.src = u.picture;
    if(elJeton) elJeton.textContent = u.tokens || 0; // Profiles tablosundaki tokens sütunu
  }catch{}
}

export function mountShell(options = {}){
  const { enabled = true, header = true, footer = true } = options;
  if(!enabled) return;
  ensureStyleOnce();
  const content = document.getElementById("pageContent");
  if(!content) return;
  const shell = document.createElement("div");
  shell.className = "app-shell";
  shell.innerHTML = (header ? HOME_HEADER_HTML : "") + `<main class="main-content"></main>` + (footer ? HOME_FOOTER_HTML : "");
  const main = shell.querySelector(".main-content");
  main.appendChild(content);
  document.body.innerHTML = "";
  document.body.appendChild(shell);
  document.getElementById("brandHome")?.addEventListener("click", ()=>location.href="/pages/home.html");
  document.getElementById("profileBtn")?.addEventListener("click", ()=>location.href="/pages/profile.html");
  import("/js/auth.js").then(m => m.ensureAuthAndCacheUser?.()).finally(() => fillUser());
}
