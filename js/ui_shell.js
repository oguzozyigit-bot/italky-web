/* FILE: /js/ui_shell.js */
import { STORAGE_KEY } from "/js/config.js";

/* ===============================
   LOADING OVERLAY
================================ */
const LOADING_OVERLAY_HTML = `
<div id="shellOverlay" style="
  position:fixed;
  inset:0;
  background:#000;
  z-index:99999;
  display:flex;
  align-items:center;
  justify-content:center;
  transition: opacity .35s ease;
">
  <div style="text-align:center; font-family:'Space Grotesk', sans-serif;">
    <div style="font-size:28px; font-weight:800; color:#fff;">
      italky<span style="
        background:linear-gradient(135deg,#a5b4fc,#ec4899);
        -webkit-background-clip:text;
        -webkit-text-fill-color:transparent;
      ">AI</span>
    </div>
    <div style="font-size:9px; letter-spacing:4px; color:rgba(255,255,255,.4); margin-top:8px; font-weight:900;">
      BE FREE
    </div>
  </div>
</div>
`;

/* ===============================
   SHELL CSS
================================ */
const SHELL_CSS = `
:root{
  --ai-gradient: linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%);
  --bg-void:#000;
  --footerH:0px;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;outline:none;}
html,body{
  margin:0;
  padding:0;
  width:100%;
  height:100%;
  background:#000 !important;
  font-family:'Outfit',sans-serif;
  overflow:hidden;
  color:#fff;
}
.italky-bg{
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:0;
  background:radial-gradient(circle at 50% 30%,#0d0d2b 0%,#000 100%);
}
.app-viewport{
  position:relative;
  z-index:5;
  width:100%;
  max-width:430px;
  height:100dvh;
  margin:0 auto;
  display:flex;
  flex-direction:column;
  background:rgba(10,10,30,.4);
  backdrop-filter:blur(30px);
  border-left:1px solid rgba(255,255,255,.08);
  border-right:1px solid rgba(255,255,255,.08);
  overflow:hidden;
}
.shellMain{
  flex:1;
  min-height:0;
  overflow-y:auto;
  -webkit-overflow-scrolling:touch;
  padding-bottom:calc(var(--footerH) + 12px);
}
.shellMain::-webkit-scrollbar{display:none;}
`;

/* ===============================
   MOUNT SHELL
================================ */
export function mountShell(options = {}) {

  // Overlay'i en başta bas
  if(!document.getElementById("shellOverlay")){
    document.body.insertAdjacentHTML("afterbegin", LOADING_OVERLAY_HTML);
  }

  // CSS inject
  if(!document.getElementById("italkyShellStyle")){
    const st = document.createElement("style");
    st.id = "italkyShellStyle";
    st.textContent = SHELL_CSS;
    document.head.appendChild(st);
  }

  const content = document.getElementById("pageContent");
  if(!content){
    // Eğer content yoksa overlay'i kaldır
    setTimeout(removeOverlay, 300);
    return;
  }

  // Daha önce mount edilmiş mi?
  if(document.getElementById("italkyAppShell")){
    hydrateFromCache();
    removeOverlay();
    return;
  }

  const bg = document.createElement("div");
  bg.className = "italky-bg";

  const shell = document.createElement("div");
  shell.className = "app-viewport";
  shell.id = "italkyAppShell";
  shell.innerHTML = `<main class="shellMain" id="shellMain"></main>`;

  const main = shell.querySelector("#shellMain");
  main.appendChild(content);

  if(options?.scroll === "none"){
    main.style.overflow = "hidden";
  }

  document.body.prepend(bg, shell);

  hydrateFromCache();

  // Smooth fade
  requestAnimationFrame(() => {
    removeOverlay();
  });
}

/* ===============================
   OVERLAY REMOVE
================================ */
function removeOverlay(){
  const ov = document.getElementById("shellOverlay");
  if(!ov) return;
  ov.style.opacity = "0";
  setTimeout(()=> ov.remove(), 350);
}

/* ===============================
   CACHE HYDRATION
================================ */
export function shortDisplayName(fullName){
  const s = String(fullName||"").trim().replace(/\s+/g," ");
  if(!s) return "Kullanıcı";
  const parts = s.split(" ").filter(Boolean);
  if(parts.length===1) return parts[0];
  const last = parts[parts.length-1];
  const first = parts.slice(0,-1).join(" ");
  return `${first} ${last?.[0]?last[0].toUpperCase()+".":""}`.trim();
}

function safeSetText(id,val){
  const el=document.getElementById(id);
  if(el) el.textContent=(val??"");
}

function safeSetImg(id,src){
  const el=document.getElementById(id);
  if(el && src) el.src=src;
}

export function hydrateFromCache(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const u=JSON.parse(raw);
    const nm=u?.display_name||u?.name||u?.full_name||u?.email||"";
    safeSetText("userName", shortDisplayName(nm));
    const pic=u?.picture||u?.avatar||u?.avatar_url||"";
    if(pic) safeSetImg("userPic",pic);
    if(u?.tokens!=null) safeSetText("headerJeton",String(u.tokens));
  }catch{}
}
