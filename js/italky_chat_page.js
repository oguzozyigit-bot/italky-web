// FILE: /js/italky_chat_page.js
import { STORAGE_KEY } from "/js/config.js";
import { apiPOST } from "/js/api.js";
import { getSiteLang } from "/js/i18n.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{ return JSON.parse(s||""); }catch{ return fb; } }

function termsKey(email=""){
  return `italky_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}
function getUser(){ return safeJson(localStorage.getItem(STORAGE_KEY), {}); }
function ensureLogged(){
  const u = getUser();
  if(!u?.email){ location.replace("/index.html"); return null; }
  if(!localStorage.getItem(termsKey(u.email))){ location.replace("/index.html"); return null; }
  return u;
}

function isPro(u){
  const p = String(u?.plan || "").toUpperCase().trim();
  return p === "PRO" || p === "PREMIUM" || p === "PLUS";
}

function uidKey(u){ return String(u.user_id || u.id || u.email || "guest").toLowerCase().trim(); }
function histKey(u){ return `italky_chat_hist::${uidKey(u)}`; }
function memKey(u){ return `italky_chat_memory::${uidKey(u)}`; }

function loadHist(u){ return safeJson(localStorage.getItem(histKey(u)), []); }
function saveHist(u, h){ try{ localStorage.setItem(histKey(u), JSON.stringify((h||[]).slice(-30))); }catch{} }
function loadMem(u){ const m = safeJson(localStorage.getItem(memKey(u)), {}); return (m && typeof m==="object") ? m : {}; }
function saveMem(u, m){ try{ localStorage.setItem(memKey(u), JSON.stringify(m||{})); }catch{} }

function maybeCaptureMemory(mem, text){
  const t = String(text||"").trim();
  const m1 = t.match(/\b(ad[ıi]m|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü\-']{2,})\b/i);
  if(m1 && !mem.name) mem.name = m1[2];
  const m2 = t.match(/\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)[’']?deyim\b/i);
  if(m2 && !mem.city) mem.city = m2[1];
  return mem;
}

/* ===== Daily 60s gate (same as before) ===== */
const FREE_SECONDS_PER_DAY = 60;
const MIN_AI_WAIT_CHARGE = 1;
const MAX_AI_WAIT_CHARGE = 15;

function isoDateLocal(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function usageKey(u){ return `italky_chat_free_used_sec::${uidKey(u)}::${isoDateLocal()}`; }
function getUsed(u){
  if(isPro(u)) return 0;
  const v = Number(localStorage.getItem(usageKey(u)) || "0");
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}
function setUsed(u, sec){ if(!isPro(u)) localStorage.setItem(usageKey(u), String(Math.max(0, Math.floor(sec)))); }
function addUsed(u, add){
  if(isPro(u)) return 0;
  const cur = getUsed(u);
  const next = cur + Math.max(0, Math.floor(add));
  setUsed(u, next);
  return next;
}
function remaining(u){ return isPro(u) ? 9999 : Math.max(0, FREE_SECONDS_PER_DAY - getUsed(u)); }
function canUse(u){ return isPro(u) ? true : remaining(u) > 0; }

/* ===== minimal toast ===== */
let toastEl=null;
function toast(msg){
  if(!toastEl){
    toastEl=document.createElement("div");
    toastEl.style.position="fixed";
    toastEl.style.left="50%";
    toastEl.style.top="18px";
    toastEl.style.transform="translateX(-50%) translateY(-120px)";
    toastEl.style.background="rgba(10,10,18,.92)";
    toastEl.style.border="1px solid rgba(165,180,252,.35)";
    toastEl.style.padding="10px 14px";
    toastEl.style.borderRadius="999px";
    toastEl.style.color="#fff";
    toastEl.style.zIndex="99999";
    toastEl.style.fontWeight="900";
    toastEl.style.fontSize="12px";
    toastEl.style.transition=".28s";
    toastEl.style.backdropFilter="blur(12px)";
    toastEl.style.pointerEvents="none";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent=msg;
  toastEl.style.transform="translateX(-50%) translateY(0)";
  clearTimeout(window.__it_to);
  window.__it_to=setTimeout(()=>toastEl.style.transform="translateX(-50%) translateY(-120px)",1800);
}

let paywallEl=null;
function showPaywall(u){
  if(isPro(u)) return;
  if(paywallEl) return;
  paywallEl=document.createElement("div");
  paywallEl.style.position="fixed";
  paywallEl.style.inset="0";
  paywallEl.style.zIndex="99998";
  paywallEl.style.background="rgba(0,0,0,.72)";
  paywallEl.style.display="flex";
  paywallEl.style.alignItems="center";
  paywallEl.style.justifyContent="center";
  paywallEl.style.padding="18px";
  paywallEl.innerHTML=`
    <div style="width:min(420px, calc(100vw - 36px));border-radius:26px;border:1px solid rgba(255,255,255,.14);background:rgba(8,8,20,.86);backdrop-filter:blur(18px);box-shadow:0 40px 120px rgba(0,0,0,.75);padding:16px;">
      <div style="font-weight:1000;font-size:16px;margin-bottom:8px;">Günlük ücretsiz süre bitti</div>
      <div style="font-weight:800;font-size:12px;color:rgba(255,255,255,.75);line-height:1.45;">
        Bugünlük 60 saniyelik ücretsiz kullanım hakkın doldu. Abonelik sadece uygulama içinden.
      </div>
      <div style="margin-top:12px;padding:10px 12px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);font-weight:900;font-size:12px;">
        Bugünkü kalan: ${remaining(u)}s
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;">
        <button id="pwSub" style="flex:1;height:46px;border-radius:16px;border:none;cursor:pointer;font-weight:1000;color:#fff;background:linear-gradient(135deg,#A5B4FC,#4F46E5);">Uygulamadan Abone Ol</button>
        <button id="pwClose" style="flex:1;height:46px;border-radius:16px;border:1px solid rgba(255,255,255,.14);cursor:pointer;font-weight:1000;color:#fff;background:rgba(255,255,255,.06);">Kapat</button>
      </div>
    </div>
  `;
  document.body.appendChild(paywallEl);
  paywallEl.querySelector("#pwSub").onclick=()=>toast("Abonelik uygulama içinden yapılır.");
  paywallEl.querySelector("#pwClose").onclick=()=>{ paywallEl.remove(); paywallEl=null; };
}

let follow=true;
function isNearBottom(el, slack=160){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }catch{ return true; }
}
function scrollBottom(force=false){
  const el=$("chat"); if(!el) return;
  requestAnimationFrame(()=>{ if(force||follow) el.scrollTop = el.scrollHeight; });
}
function addBubble(role, text){
  const chat=$("chat");
  const d=document.createElement("div");
  d.className=`bubble ${role==="user"?"user":(role==="meta"?"meta":"bot")}`;
  d.textContent=String(text||"");
  chat.appendChild(d);
  scrollBottom(false);
}
function typingBubble(){
  const chat=$("chat");
  const d=document.createElement("div");
  d.className="bubble bot";
  d.textContent="…";
  chat.appendChild(d);
  scrollBottom(false);
  return d;
}
function autoGrow(){
  const ta=$("msgInput");
  if(!ta) return;
  ta.style.height="auto";
  ta.style.height=Math.min(ta.scrollHeight,120)+"px";
}

async function apiChat(text, history, persona){
  const data = await apiPOST("/api/chat", {
    text,
    persona_name: persona || "italkyAI",
    history: (history||[]).slice(-4),  // ✅ faster
    max_tokens: 120                     // ✅ faster
  }, { timeoutMs: 25000 });
  return String(data?.text || "").trim() || "…";
}

let sttBusy=false;
let sttStartTs=0;
function startSTT(u, onFinal){
  if(!canUse(u)){ showPaywall(u); return; }
  if(location.protocol!=="https:" && location.hostname!=="localhost"){ toast("Mikrofon için HTTPS gerekli."); return; }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast("Bu cihaz konuşmayı yazıya çevirmiyor."); return; }
  if(sttBusy) return;

  const micBtn=$("micBtn");
  const rec=new SR();
  rec.lang="tr-TR";
  rec.interimResults=false;
  rec.continuous=false;

  sttBusy=true;
  sttStartTs=Date.now();
  micBtn.classList.add("listening");

  rec.onresult=(e)=>{
    const t=e.results?.[0]?.[0]?.transcript||"";
    const finalText=String(t||"").trim();
    if(finalText) onFinal?.(finalText);
  };
  rec.onend=()=>{
    micBtn.classList.remove("listening");
    sttBusy=false;
    if(!isPro(u)){
      const sec=(Date.now()-sttStartTs)/1000;
      addUsed(u, sec);
    }
    if(!canUse(u)) showPaywall(u);
  };
  try{ rec.start(); }catch{
    micBtn.classList.remove("listening");
    sttBusy=false;
  }
}

document.addEventListener("DOMContentLoaded", async ()=>{
  const u = ensureLogged();
  if(!u) return;

  const uiLang = (()=>{ try{ return (getSiteLang()||"tr").toLowerCase(); }catch{ return "tr"; } })();

  // header
  const full=(u.fullname||u.name||u.display_name||u.email||"—").trim();
  $("userName").textContent=full;
  $("userPlan").textContent=String(u.plan||"FREE").toUpperCase();

  const avatarBtn=$("avatarBtn");
  const fallback=$("avatarFallback");
  const pic=String(u.picture||u.avatar||u.avatar_url||"").trim();
  if(pic) avatarBtn.innerHTML=`<img src="${pic}" alt="avatar" referrerpolicy="no-referrer">`;
  else fallback.textContent=(full&&full[0])?full[0].toUpperCase():"•";

  avatarBtn.addEventListener("click",()=>location.href="/pages/profile.html");
  $("logoHome").addEventListener("click",()=>location.href="/pages/home.html");
  $("backBtn").addEventListener("click",()=>location.href="/pages/home.html");

  // scroll follow
  const chat=$("chat");
  chat.addEventListener("scroll",()=>{ follow=isNearBottom(chat); },{ passive:true });

  // history
  const hist=loadHist(u);
  chat.innerHTML="";
  if(hist.length) hist.forEach(m=>addBubble(m.role,m.text));
  addBubble("meta", isPro(u) ? "PRO: sınırsız" : `Bugünkü kalan: ${remaining(u)}s`);
  scrollBottom(true);

  $("clearChat").addEventListener("click",()=>{
    chat.innerHTML="";
    addBubble("meta","Sohbet temizlendi.");
    saveHist(u,[]);
    addBubble("meta", isPro(u) ? "PRO: sınırsız" : `Bugünkü kalan: ${remaining(u)}s`);
    scrollBottom(true);
  });

  async function send(textOverride=null){
    if(!canUse(u)){ showPaywall(u); return; }

    const ta=$("msgInput");
    const text=String(textOverride ?? ta.value ?? "").trim();
    if(!text) return;

    ta.value="";
    autoGrow();

    // memory
    const mem=maybeCaptureMemory(loadMem(u), text);
    saveMem(u, mem);

    const h=loadHist(u);

    addBubble("user", text);
    h.push({ role:"user", text });

    const loader=typingBubble();

    // ✅ smaller memBlock for speed
    const memLines=[];
    if(mem.name) memLines.push(`Ad: ${mem.name}`);
    if(mem.city) memLines.push(`Şehir: ${mem.city}`);
    const memBlock = memLines.length ? `HAFIZA: ${memLines.join(" / ")}` : `HAFIZA: -`;

    const apiHistory = [
      { role:"assistant", content: memBlock },
      ...h.slice(-10).map(x=>({ role: x.role==="assistant" ? "assistant" : "user", content: x.text }))
    ];

    const started=Date.now();

    try{
      const out=await apiChat(text, apiHistory, "italkyAI");
      try{ loader.remove(); }catch{}
      addBubble("assistant", out);
      h.push({ role:"assistant", text: out });
      saveHist(u, h);
    }catch(e){
      try{ loader.remove(); }catch{}
      const msg = uiLang==="tr" ? "Şu an cevap veremedim." : "I couldn't answer now.";
      addBubble("assistant", msg);
      h.push({ role:"assistant", text: msg });
      saveHist(u, h);
    }finally{
      if(!isPro(u)){
        const elapsed=(Date.now()-started)/1000;
        const charge=Math.max(MIN_AI_WAIT_CHARGE, Math.min(MAX_AI_WAIT_CHARGE, Math.floor(elapsed)));
        addUsed(u, charge);
      }
      addBubble("meta", isPro(u) ? "PRO: sınırsız" : `Bugünkü kalan: ${remaining(u)}s`);
      if(!canUse(u)) showPaywall(u);
    }
  }

  $("sendBtn").addEventListener("click",()=>send());
  $("msgInput").addEventListener("input",autoGrow);
  $("msgInput").addEventListener("keydown",(e)=>{
    if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }
  });
  $("micBtn").addEventListener("click",()=>{
    startSTT(u, async (finalText)=>{
      $("msgInput").value=finalText;
      autoGrow();
      await send(finalText);
    });
  });

  autoGrow();
  if(!canUse(u)) showPaywall(u);
});
