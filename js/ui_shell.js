import { STORAGE_KEY } from "/js/config.js";

const LOADING_OVERLAY_HTML = `<div id="shellOverlay" style="position:fixed; inset:0; background:#000; z-index:99999; display:flex; align-items:center; justify-content:center; transition: opacity .35s ease;"><div style="text-align:center; font-family:sans-serif;"><div style="font-size:28px; font-weight:800; color:#fff;">italky<span style="background:linear-gradient(135deg,#a5b4fc,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">AI</span></div><div style="font-size:9px; letter-spacing:4px; color:rgba(255,255,255,.4); margin-top:8px; font-weight:900;">BE FREE</div></div></div>`;

const HOME_HEADER_HTML = `<header class="premium-header" id="italkyHeader"><div class="brand-group" id="brandHome" style="cursor:pointer;"><h1><span>italky</span><span class="ai">AI</span></h1><div class="brand-slogan">BE FREE</div></div><div class="user-info" id="profileBtn"><div class="uMeta"><div class="uName" id="userName">Kullanıcı</div><div class="uJetonRow"><div class="uJeton">Jeton: <span id="headerJeton">—</span></div></div><a class="uJetonLink" id="jetonInfoLink" href="/pages/jeton-nedir.html">Jeton Nedir?</a></div><div class="avatar"><img src="" id="userPic"></div></div></header>`;

const HOME_FOOTER_HTML = `<footer class="premium-footer" id="italkyFooter"><nav class="footer-nav"><a href="/pages/about.html">Hakkımızda</a><a href="/pages/faq.html">SSS</a><a href="/pages/jeton-nedir.html">Jeton Nedir</a><a href="/pages/privacy.html">Gizlilik</a><a href="/pages/contact.html">İletişim</a></nav><div class="signature">italkyAI @ italkyAcademy By Ozyigit's • 2026</div></footer>`;

const SHELL_CSS = `:root{--ai-gradient: linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%);--footerH:0px;} *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;} html,body{margin:0;padding:0;width:100%;height:100%;background:#000 !important;font-family:'Outfit',sans-serif;overflow:hidden;color:#fff;} .italky-bg{position:fixed; inset:0; pointer-events:none; z-index:0; background:radial-gradient(circle at 50% 30%,#0d0d2b 0%,#000 100%);} .app-viewport{position:relative; z-index:5; width:100%; max-width:430px; height:100dvh; margin:0 auto; display:flex; flex-direction:column; background:rgba(10,10,30,.4); backdrop-filter:blur(30px); border-left:1px solid rgba(255,255,255,.08); border-right:1px solid rgba(255,255,255,.08); overflow:hidden;} .premium-header{padding: calc(45px + env(safe-area-inset-top)) 18px 15px; display:flex; align-items:flex-start; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,.08); background:rgba(0,0,0,.30); border-radius: 0 0 24px 24px; flex:0 0 auto;} .brand-group h1{font-family:sans-serif; font-size:26px; margin:0; font-weight:700; display:flex; gap:2px;} .brand-group h1 .ai{ background:var(--ai-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent; } .brand-slogan{ font-size:8px; font-weight:900; letter-spacing:3px; color:rgba(255,255,255,.5); margin-top:5px; } .user-info{ display:flex; align-items:center; gap:12px; cursor:pointer; } .uMeta{ display:flex; flex-direction:column; align-items:flex-end; gap:2px; } .uName{ font-weight:900; font-size:13px; } .uJeton{ font-size:10px; font-weight:900; color:#a5b4fc; background:rgba(165,180,252,.12); padding:2px 8px; border-radius:8px; } .uJetonLink{ font-size:10px; font-weight:900; color: #c084fc; text-decoration:none; } .avatar{ width:38px; height:38px; border-radius:50%; border:1.5px solid #6366f1; overflow:hidden; } .avatar img{ width:100%; height:100%; object-fit:cover; } .shellMain{ flex:1; min-height:0; overflow-y:auto; padding-bottom: calc(var(--footerH) + 12px); } .premium-footer{ position:absolute; left:0; right:0; bottom:0; display:flex; flex-direction:column; align-items:center; background:rgba(10,10,25,.6); backdrop-filter:blur(25px); border-top:1px solid rgba(255,255,255,.1); border-radius:28px 28px 0 0; padding:12px 10px calc(10px + env(safe-area-inset-bottom)); z-index:50; } .footer-nav{ display:flex; gap:18px; margin-bottom:8px; } .footer-nav a{ font-size:10px; font-weight:900; color:rgba(255,255,255,.4); text-decoration:none; } .signature{ font-size:10px; font-weight:900; background:linear-gradient(to right,#6366f1,#ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }`;

export function mountShell(options = {}) {
  document.documentElement.style.backgroundColor = "#020205";

  if(!document.getElementById("shellOverlay")){
    document.body.insertAdjacentHTML("afterbegin", LOADING_OVERLAY_HTML);
  }

  if(!document.getElementById("italkyShellStyle")){
    const st = document.createElement("style");
    st.id = "italkyShellStyle";
    st.textContent = SHELL_CSS;
    document.head.prepend(st);
  }

  const content = document.getElementById("pageContent");
  if(!content) { removeOverlaySoon(); return; }

  if(document.getElementById("italkyAppShell")){
    finishMount(options);
    return;
  }

  const bg = document.createElement("div");
  bg.className = "italky-bg";
  const shell = document.createElement("div");
  shell.className = "app-viewport";
  shell.id = "italkyAppShell";
  shell.innerHTML = `${HOME_HEADER_HTML}<main class="shellMain" id="shellMain"></main>${HOME_FOOTER_HTML}`;
  
  const main = shell.querySelector("#shellMain");
  main.appendChild(content);
  document.body.prepend(bg, shell);

  // Bindings
  document.getElementById("brandHome")?.addEventListener("click", () => location.href="/pages/home.html");
  document.getElementById("profileBtn")?.addEventListener("click", () => location.href="/pages/profile.html");
  document.getElementById("jetonInfoLink")?.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation(); location.href = "/pages/jeton-nedir.html";
  });

  finishMount(options);
  window.addEventListener("resize", syncFooterHeight, { passive: true });
}

function finishMount(options) {
  const main = document.getElementById("shellMain");
  if(main) main.style.overflow = (options?.scroll === "none") ? "hidden" : "auto";
  
  requestAnimationFrame(() => {
    document.body.classList.add('ui-ready');
    hydrateFromCache();
    syncFooterHeight();
    setTimeout(removeOverlaySoon, 100);
  });
}

export function hydrateFromCache(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const u = JSON.parse(raw);
    const nm = u?.display_name || u?.name || u?.email || "Kullanıcı";
    const nameEl = document.getElementById("userName");
    if(nameEl) nameEl.textContent = nm;
    const pic = u?.picture || u?.avatar || "";
    const picEl = document.getElementById("userPic");
    if(picEl && pic) picEl.src = pic;
    const jetonEl = document.getElementById("headerJeton");
    if(jetonEl && u?.tokens != null) jetonEl.textContent = u.tokens;
  }catch(e){}
}

function syncFooterHeight(){
  const f = document.getElementById("italkyFooter");
  if(f) document.documentElement.style.setProperty("--footerH", f.offsetHeight + "px");
}

function removeOverlaySoon(){
  const ov = document.getElementById("shellOverlay");
  if(ov) { ov.style.opacity = "0"; setTimeout(() => ov.remove(), 350); }
}

export function setHeaderTokens(val){
  const el = document.getElementById("headerJeton");
  if(el) el.textContent = String(val ?? "0");

  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const u = raw ? JSON.parse(raw) : {};
    u.tokens = Number(val ?? 0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }catch(e){}
}
