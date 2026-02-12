// FILE: /js/ui_shell.js
// ✅ HOME header+footer'ını HER SAYFAYA birebir basar (milim şaşmaz)
// ✅ Anti-Flash Boot: beyaz sayfa flash'ını tek seferde azaltır
// Kural: Sayfada <main id="pageContent"> ... </main> olmalı.
// mountShell({ scroll:"none" }) => içerik scroll yok, barlar sabit.

import { STORAGE_KEY } from "/js/config.js";
import { applyI18n } from "/js/i18n.js";

/* ✅ ANTI-FLASH BOOT (tek seferde tüm sayfalarda) */
(function antiFlashBoot(){
  try{
    // 1) İlk paint için html/body arka planını hemen koyulaştır
    document.documentElement.style.backgroundColor = "#02000f";
    document.documentElement.style.colorScheme = "dark";
    if(document.body) document.body.style.backgroundColor = "#02000f";

    // 2) Head'e hızlı global style bas
    if(!document.getElementById("italkyAntiFlash")){
      const st = document.createElement("style");
      st.id = "italkyAntiFlash";
      st.textContent = `html,body{ background:#02000f !important; }`;
      document.head.appendChild(st);
    }

    // 3) Theme color (Android/WebView)
    const existing = document.querySelector('meta[name="theme-color"]');
    if(existing){
      existing.setAttribute("content", "#02000f");
    }else{
      const meta = document.createElement("meta");
      meta.setAttribute("name","theme-color");
      meta.setAttribute("content","#02000f");
      document.head.appendChild(meta);
    }
  }catch{}
})();

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
  --neon-glow: 0 0 20px rgba(99,102,241,0.45);
  --ease-premium: cubic-bezier(0.22, 1, 0.36, 1);

  /* ✅ HOME footer yüksekliği */
  --footerH: 92px;

  /* ✅ HOME üst bar zemini = alt bar zemini */
  --bar-bg: rgba(0,0,0,0.18);

  /* ✅ Home'da kullandığın eşit üst/alt boşluk fikri */
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

/* ✅ HOME HEADER BİREBİR */
.premium-header{
  padding: calc(10px + env(safe-area-inset-top)) 18px 10px;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 10px;

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
  display:flex;
  align-items:center;
  gap:10px;
  cursor:pointer;
  user-select:none;
  margin-top: 2px;
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
  width: 40px;
  height: 40px;
  border-radius: 999px;
  overflow:hidden;
  border: 2px solid rgba(99,102,241,0.65);
  background: rgba(255,255,255,0.10);
  flex: 0 0 auto;
}
.avatar img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

/* ✅ main content (shell içi) */
.main-content{
  flex:1;
  overflow-y:auto;
  padding: var(--edgePad) 20px calc(var(--footerH) + var(--edgePad) + env(safe-area-inset-bottom));
  scrollbar-width:none;
}
.main-content::-webkit-scrollbar{ display:none; }

/* ✅ HOME FOOTER BİREBİR (fixed + aynı zemin) */
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

.footer-nav{
  display:flex;
  gap: 22px;
  justify-content:center;
  flex-wrap:wrap;
  line-height:1;
  margin: 0;
  padding: 0;
}
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

/* seçenekler */
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

  // bg
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

  // shell
  const shell = document.createElement("div");
  shell.className = "app-shell";
  shell.style.maxWidth = maxWidth;

  const headerHTML = header ? HOME_HEADER_HTML : "";
  const footerHTML = footer ? HOME_FOOTER_HTML : "";
  shell.innerHTML = headerHTML + `<main class="main-content"></main>` + footerHTML;

  if(!header) shell.classList.add("no-header");
  if(!footer) shell.classList.add("no-footer");
  if(scroll === "none") shell.classList.add("no-scroll");

  // move content
  const main = shell.querySelector(".main-content");
  main.appendChild(content);

  // rebuild body keep bg
  const keep = Array.from(document.body.children).filter(el =>
    el.classList.contains("nebula-bg") || el.classList.contains("stars-field")
  );
  document.body.innerHTML = "";
  keep.forEach(el=>document.body.appendChild(el));
  document.body.appendChild(shell);

  // bind clicks (HOME ile aynı davranış)
  document.getElementById("brandHome")?.addEventListener("click", ()=>location.href="/pages/home.html");
  document.getElementById("profileBtn")?.addEventListener("click", ()=>location.href="/pages/profile.html");

  // i18n + user
  try{ applyI18n?.(document); }catch{}
  fillUser();
}
```0
