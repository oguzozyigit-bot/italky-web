// ✅ italkyAI Merkezi Şablon (Shell) - HOME TASARIMI BİREBİR ESAS ALINMIŞTIR
import { STORAGE_KEY } from "/js/config.js";

/* ✅ SENİN TASARIMIN: ÜST BAR + JETON ALANI */
const HOME_HEADER_HTML = `
<header class="premium-header">
  <div class="brand-group" id="brandHome" title="Ana sayfa">
    <h1><span>italky</span><span class="ai">AI</span></h1>
    <div class="brand-slogan">BE FREE</div>
  </div>

  <div class="user-plain" id="profileBtn" title="Profil">
    <div class="uMeta">
      <div class="uName" id="userName">Kullanıcı</div>
      <div class="uJeton">Jeton: <span id="headerJeton">0</span> Adet</div>
    </div>
    <div class="avatar"><img src="" id="userPic" alt=""></div>
  </div>
</header>
`;

/* ✅ SENİN TASARIMIN: ALT BAR (PARLAK İMZA DAHİL) */
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

/* ✅ SENİN TASARIMIN: KRİTİK CSS (DOKUNULMAZ) */
const SHELL_CSS = `
:root{
  --bg-void:#02000f;
  --text-main:#fff;
  --text-muted: rgba(255,255,255,0.65);
  --footerH: 92px;
  --bar-bg: rgba(0,0,0,0.18);
  --edgePad: 14px;
}

/* Jeton Meta Alanı Tasarımı */
.uMeta { display: flex; flex-direction: column; align-items: flex-end; margin-right: 2px; }
.uJeton { font-size: 11px; font-weight: 800; color: #a5b4fc; margin-top: 2px; letter-spacing: 0.5px; text-transform: uppercase; }

/* Arka Plan ve Nebula Efektleri */
.nebula-bg{ position:absolute; inset:-10%; width:120%; height:120%; z-index:0; pointer-events:none; filter: blur(60px); animation: nebulaPulse 15s infinite alternate ease-in-out; background: radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.38) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.28) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(30, 0, 60, 1) 0%, #02000f 100%); }
@keyframes nebulaPulse{ from{ transform: scale(1); } to{ transform: scale(1.1); } }
.stars-field{ position:absolute; inset:0; background:url("https://www.transparenttextures.com/patterns/stardust.png"); opacity:0.38; z-index:1; pointer-events:none; }

.app-shell{ position:relative; z-index:10; width:100%; max-width:480px; height:100%; margin:0 auto; display:flex; flex-direction:column; background: rgba(10,10,30,0.40); backdrop-filter: blur(30px); }

/* Header & Footer (Orijinal Boyut ve Renkler) */
.premium-header{ padding: calc(10px + env(safe-area-inset-top)) 18px 10px; display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; background: var(--bar-bg); border-bottom-left-radius: 22px; border-bottom-right-radius: 22px; border-bottom: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); }
.premium-footer{ position: fixed; left: 50%; transform: translateX(-50%); bottom: 0; width: min(480px, 100%); height: var(--footerH); z-index: 9999; display:flex; flex-direction:column; align-items:center; justify-content:center; gap: 8px; padding: 10px 16px; border-top-left-radius: 22px; border-top-right-radius: 22px; background: var(--bar-bg); border-top: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(30px); }

/* Marka ve İmza Efektleri */
.brand-group h1{ font-family:'Space Grotesk', sans-serif; font-size: 30px; margin:0; font-weight:700; letter-spacing:-1px; line-height: 1; display:flex; align-items:flex-end; gap:2px; }
.brand-group h1 .ai{ background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; filter: drop-shadow(0 0 10px rgba(99,102,241,0.35)); }
.brand-slogan{ font-size: 9px; font-weight: 900; letter-spacing: 3.6px; color: rgba(255,255,255,0.55); text-transform: uppercase; margin-top: 5px; }
.uName{ font-weight: 1000; font-size: 14px; color: rgba(255,255,255,0.92); }
.avatar{ width: 40px; height: 40px; border-radius: 999px; overflow:hidden; border: 2px solid rgba(99,102,241,0.65); background: rgba(255,255,255,0.10); }
.avatar img{ width:100%; height:100%; object-fit:cover; display:block; }
.prestige-signature{ font-size: 12px; font-weight: 900; letter-spacing: 1.5px; background: linear-gradient(to right, #ffffff 0%, #6366f1 50%, #ffffff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 8px rgba(99,102,241,0.45)); }
.footer-nav{ display:flex; gap: 22px; justify-content:center; }
.footer-nav a{ font-size: 11px; font-weight: 900; color: rgba(255,255,255,0.55); text-decoration:none; text-transform: uppercase; }
`;

export function mountShell(options = {}){
  if(document.getElementById("italkyShellStyle")) return;
  const st = document.createElement("style");
  st.id = "italkyShellStyle";
  st.textContent = SHELL_CSS;
  document.head.appendChild(st);

  const content = document.getElementById("pageContent");
  if(!content) return;

  // Arka plan efektlerini mühürle
  const n = document.createElement("div"); n.className = "nebula-bg";
  const s = document.createElement("div"); s.className = "stars-field";
  document.body.prepend(s); document.body.prepend(n);

  const shell = document.createElement("div");
  shell.className = "app-shell";
  shell.innerHTML = HOME_HEADER_HTML + `<main style="flex:1; overflow-y:auto; padding: 14px 20px 110px; scrollbar-width:none;"></main>` + HOME_FOOTER_HTML;
  shell.querySelector("main").appendChild(content);

  document.body.innerHTML = ""; // Body'yi temizle
  document.body.appendChild(n); document.body.appendChild(s);
  document.body.appendChild(shell);

  document.getElementById("brandHome")?.addEventListener("click", ()=>location.href="/pages/home.html");
  document.getElementById("profileBtn")?.addEventListener("click", ()=>location.href="/pages/profile.html");
  
  import("/js/auth.js").then(m => m.ensureAuthAndCacheUser?.()).then(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) {
       const u = JSON.parse(raw);
       document.getElementById("userName").textContent = u.name || "Kullanıcı";
       document.getElementById("userPic").src = u.picture || "";
       document.getElementById("headerJeton").textContent = u.tokens || 1000;
    }
  });
}
