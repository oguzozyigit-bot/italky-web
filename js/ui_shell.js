// FILE: /js/ui_shell.js
// Home.html üst/alt barı (isteğe bağlı) sayfalara standart olarak basar.
// Kural: Sayfada <main id="pageContent"> ... </main> olmalı.
//
// mountShell(options) ile kontrol:
//  - enabled: false -> hiç dokunma
//  - header: false  -> header basma
//  - footer: false  -> footer basma
//  - background: false -> nebula/stars basma
//  - scroll: "main" | "none"  -> main-content scroll kalsın mı? (default: "main")
//  - maxWidth: "480px" gibi -> app-shell max-width override (default: 480px)

import { STORAGE_KEY } from "/js/config.js";
import { applyI18n } from "/js/i18n.js";

const HOME_HEADER_HTML = `
<header class="premium-header">
  <div class="brand-group">
    <h1>italky<span>AI</span></h1>
    <div class="brand-slogan">Be Free</div>
  </div>
  <div class="user-pill" id="shellUserPill" role="button" aria-label="Profil">
    <div style="display:flex; flex-direction:column; align-items:flex-end">
      <span class="name" id="userName">Kullanıcı</span>
      <span class="status" id="userStatus">UNLIMITED</span>
    </div>
    <div class="avatar-circle">
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
  <div class="prestige-signature">italkyAI By Ozyigit's 2026</div>
</footer>
`;

// HOME'dan taşınan CSS (sadece shell + header/footer + arkaplan)
const SHELL_CSS = `
:root{
  --bg-void:#02000f;
  --text-main:#fff;
  --text-muted:rgba(255,255,255,0.65);
  --neon-glow:0 0 20px rgba(99,102,241,0.5);
  --ease-premium:cubic-bezier(0.22, 1, 0.36, 1);
  --footerH:120px;
}

/* sayfa genel kilit */
html,body{
  margin:0; padding:0; width:100%; height:100%;
  overflow:hidden; position:fixed;
  font-family:'Outfit',sans-serif;
  background-color: var(--bg-void);
  color: var(--text-main);
}

.nebula-bg{
  position:absolute; inset:-10%; width:120%; height:120%;
  background:
    radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.4) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.3) 0%, transparent 40%),
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
  opacity:0.4; z-index:1;
  pointer-events:none;
}

/* ana shell */
.app-shell{
  position:relative; z-index:10;
  width:100%; max-width:480px; height:100%;
  margin:0 auto;
  display:flex; flex-direction:column;
  background: rgba(10,10,30,0.4);
  backdrop-filter: blur(30px);
}

/* HEADER */
.premium-header{
  padding: calc(20px + env(safe-area-inset-top)) 24px 20px;
  display:flex; align-items:center; justify-content:space-between;
  flex: 0 0 auto;
}
.brand-group h1{
  font-family:'Space Grotesk',sans-serif;
  font-size:32px; margin:0; font-weight:700; letter-spacing:-1px;
}
.brand-group h1 span{
  background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  filter: drop-shadow(0 0 10px rgba(99,102,241,0.4));
}
.brand-slogan{
  font-size:11px; font-weight:900;
  letter-spacing:5px;
  color: var(--text-muted);
  text-transform:uppercase;
}
.user-pill{
  display:flex; align-items:center; gap:12px;
  padding:6px 6px 6px 14px;
  border-radius:40px;
  background: rgba(255,255,255,0.07);
  border:1px solid rgba(255,255,255,0.15);
  box-shadow: var(--neon-glow);
  cursor:pointer;
  user-select:none;
}
.user-pill:active{ transform: scale(.98); }
.user-pill .name{ font-weight:800; font-size:13px; }
.user-pill .status{ font-size:10px; color:#a5b4fc; font-weight:900; }
.avatar-circle{
  width:36px; height:36px;
  border-radius:50%;
  border:2px solid #6366f1;
  background:#222;
  overflow:hidden;
}
.avatar-circle img{ width:100%; height:100%; object-fit:cover; }

/* MAIN CONTENT */
.main-content{
  flex:1;
  overflow-y:auto;
  padding: 10px 20px calc(var(--footerH) + 20px);
  scrollbar-width:none;
}
.main-content::-webkit-scrollbar{ display:none; }

/* FOOTER */
.premium-footer{
  position:absolute; bottom:0; width:100%; height: var(--footerH);
  background: linear-gradient(to top, rgba(2,0,15,1) 80%, transparent);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  border-top: 1px solid rgba(255,255,255,0.08);
  z-index:20;
}
.footer-nav{ display:flex; gap:24px; margin-bottom:16px; }
.footer-nav a{
  font-size:12px; font-weight:800;
  color: rgba(255,255,255,0.5);
  text-decoration:none;
  text-transform:uppercase;
  letter-spacing:1px;
}
.footer-nav a:active{ color:#6366f1; }
.prestige-signature{
  font-size:12px; font-weight:900; letter-spacing:1.5px;
  background: linear-gradient(to right, #ffffff 0%, #6366f1 50%, #ffffff 100%);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  filter: drop-shadow(0 0 8px rgba(99,102,241,0.5));
  opacity:0.9;
}

/* header yokken yukarı boşluk olmasın */
.app-shell.no-header .premium-header{ display:none; }

/* footer yokken padding ve footerH etkisini kaldır */
.app-shell.no-footer{ --footerH: 0px; }
.app-shell.no-footer .premium-footer{ display:none; }

/* scroll kapalı mod */
.app-shell.no-scroll .main-content{ overflow:hidden; padding-bottom: 20px; }
`;

function ensureStyleOnce(){
  if(document.getElementById("italkyShellStyle")) return;
  const st = document.createElement("style");
  st.id = "italkyShellStyle";
  st.textContent = SHELL_CSS;
  document.head.appendChild(st);
}

function fillUser(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const u = JSON.parse(raw);
    const nm = (u.name || u.fullname || "Kullanıcı").trim();
    const pic = (u.picture || u.avatar || "").trim();
    const elName = document.getElementById("userName");
    const elPic  = document.getElementById("userPic");
    if(elName) elName.textContent = nm;
    if(elPic && pic) elPic.src = pic;
  }catch{}
}

export function mountShell(options = {}){
  const {
    enabled = true,
    header = true,
    footer = true,
    background = true,
    scroll = "main",     // "main" | "none"
    maxWidth = "480px"
  } = options;

  if(!enabled) return;

  ensureStyleOnce();

  const content = document.getElementById("pageContent");
  if(!content){
    console.error("mountShell: #pageContent yok.");
    return;
  }

  // background
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

  // app-shell
  const shell = document.createElement("div");
  shell.className = "app-shell";

  // maxWidth override (home ile aynı kalsın istiyorsan 480px bırak)
  shell.style.maxWidth = maxWidth;

  // header/footer HTML seçimi
  const headerHTML = header ? HOME_HEADER_HTML : "";
  const footerHTML = footer ? HOME_FOOTER_HTML : "";

  shell.innerHTML = headerHTML + `<main class="main-content"></main>` + footerHTML;

  // mode classları
  if(!header) shell.classList.add("no-header");
  if(!footer) shell.classList.add("no-footer");
  if(scroll === "none") shell.classList.add("no-scroll");

  // content'i main-content içine taşı
  const main = shell.querySelector(".main-content");
  main.appendChild(content);

  // body'yi temizle (arka plan divleri kalabilir)
  const keep = Array.from(document.body.children).filter(el =>
    el.classList.contains("nebula-bg") || el.classList.contains("stars-field")
  );
  document.body.innerHTML = "";
  keep.forEach(el=>document.body.appendChild(el));
  document.body.appendChild(shell);

  // profile click (header yoksa zaten olmayacak)
  const pill = document.getElementById("shellUserPill");
  if(pill) pill.addEventListener("click", ()=> location.href="/pages/profile.html");

  // i18n + user fill
  try{ applyI18n?.(document); }catch{}
  fillUser();
}
