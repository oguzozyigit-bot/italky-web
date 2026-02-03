import { BASE_DOMAIN, STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{ return JSON.parse(s||""); }catch{ return fb; } }

function getUser(){
  return safeJson(localStorage.getItem(STORAGE_KEY), {});
}
function ensureLogged(){
  const u = getUser();
  if(!u || !u.email || !u.isSessionActive){
    location.replace("/index.html");
    return null;
  }
  return u;
}

function uidKey(u){
  return String(u.user_id || u.id || u.email || "guest").toLowerCase().trim();
}

function histKey(u){
  return `italky_chat_hist::${uidKey(u)}`;
}
function memKey(u){
  return `italky_chat_memory::${uidKey(u)}`; // ✅ kalıcı hafıza (silinmez)
}

function loadHist(u){
  return safeJson(localStorage.getItem(histKey(u)), []);
}
function saveHist(u, h){
  try{ localStorage.setItem(histKey(u), JSON.stringify((h||[]).slice(-30))); }catch{}
}

/* ========= MEMORY (kalıcı) ========= */
function loadMem(u){
  const m = safeJson(localStorage.getItem(memKey(u)), {});
  return (m && typeof m === "object") ? m : {};
}
function saveMem(u, m){
  try{ localStorage.setItem(memKey(u), JSON.stringify(m||{})); }catch{}
}

// basit yakalama: "adım X", "ben X" vb. (yeterli MVP)
function maybeCaptureMemory(mem, text){
  const t = String(text||"").trim();

  // ad yakala
  const m1 = t.match(/\b(ad[ıi]m|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü\-']{2,})\b/i);
  if(m1 && !mem.name){
    mem.name = m1[2];
  }

  // şehir yakala (…deyim / …'deyim)
  const m2 = t.match(/\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)[’']?deyim\b/i);
  if(m2 && !mem.city){
    mem.city = m2[1];
  }

  return mem;
}

function paintHeader(u){
  const full = (u.fullname || u.name || u.display_name || u.email || "—").trim();
  $("userName").textContent = full;
  $("userPlan").textContent = String(u.plan || "FREE").toUpperCase();

  const avatarBtn = $("avatarBtn");
  const fallback = $("avatarFallback");
  const pic = String(u.picture || u.avatar || u.avatar_url || "").trim();

  if(pic){
    avatarBtn.innerHTML = `<img src="${pic}" alt="avatar">`;
  }else{
    fallback.textContent = (full && full[0]) ? full[0].toUpperCase() : "•";
  }

  avatarBtn.addEventListener("click", ()=> location.href="/pages/profile.html");
  $("logoHome").addEventListener("click", ()=> location.href="/pages/home.html");
  $("backBtn").addEventListener("click", ()=> location.href="/pages/home.html");
}

function isNearBottom(el, slack=160){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch{ return true; }
}
let follow = true;
function scrollBottom(force=false){
  const el = $("chat");
  if(!el) return;
  requestAnimationFrame(()=>{
    if(force || follow) el.scrollTop = el.scrollHeight;
  });
}

function addBubble(role, text){
  const chat = $("chat");
  const d = document.createElement("div");
  d.className = `bubble ${role==="user" ? "user" : (role==="meta" ? "meta" : "bot")}`;
  d.textContent = String(text||"");
  chat.appendChild(d);
  scrollBottom(false);
}

function typingBubble(){
  const chat = $("chat");
  const d = document.createElement("div");
  d.className = "bubble bot";
  d.textContent = "…";
  chat.appendChild(d);
  scrollBottom(false);
  return d;
}

function autoGrow(){
  const ta = $("msgInput");
  if(!ta) return;
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
}

/* ========= API ========= */
async function apiChat(u, text, history){
  const base = String(BASE_DOMAIN||"").replace(/\/+$/,"");
  const url = `${base}/api/chat`;

  const r = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      user_id: (u.user_id || u.id || u.email),
      text,
      history: (history || []).slice(-20)
    })
  });

  const raw = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(raw || `HTTP ${r.status}`);
  let data = {};
  try{ data = JSON.parse(raw || "{}"); }catch{}
  const out = String(data.text || "").trim();
  return out || "…";
}

/* ========= STT ========= */
let sttBusy = false;
function startSTT(onFinal){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ alert("Bu cihaz konuşmayı yazıya çevirmiyor."); return; }
  if(sttBusy) return;

  const micBtn = $("micBtn");

  const rec = new SR();
  rec.lang = "tr-TR";
  rec.interimResults = false;
  rec.continuous = false;

  sttBusy = true;
  micBtn.classList.add("listening");

  rec.onresult = (e)=>{
    const t = e.results?.[0]?.[0]?.transcript || "";
    const finalText = String(t||"").trim();
    if(finalText) onFinal?.(finalText);
  };
  rec.onerror = ()=>{};
  rec.onend = ()=>{
    micBtn.classList.remove("listening");
    sttBusy = false;
  };

  try{ rec.start(); }
  catch{
    micBtn.classList.remove("listening");
    sttBusy = false;
  }
}

/* ========= MAIN ========= */
async function main(){
  const u = ensureLogged();
  if(!u) return;

  paintHeader(u);

  const chat = $("chat");
  chat.addEventListener("scroll", ()=>{ follow = isNearBottom(chat); }, { passive:true });

  // load history
  const hist = loadHist(u);
  chat.innerHTML = "";
  if(!hist.length){
    addBubble("meta", "italkyAI yazılı bilgi alanıdır. Mikrofon konuşmanı yazıya çevirir ve otomatik gönderir.");
  }else{
    hist.forEach(m=> addBubble(m.role, m.text));
  }
  follow = true;
  scrollBottom(true);

  // clear chat (UI only)
  $("clearChat").addEventListener("click", ()=>{
    chat.innerHTML = "";
    addBubble("meta", "Sohbet temizlendi. Seni hatırlıyorum.");
    saveHist(u, []);
    scrollBottom(true);
  });

  async function send(textOverride=null){
    const ta = $("msgInput");
    const text = String(textOverride ?? ta.value ?? "").trim();
    if(!text) return;

    ta.value = "";
    autoGrow();

    // update memory (persistent)
    const mem = maybeCaptureMemory(loadMem(u), text);
    saveMem(u, mem);

    const h = loadHist(u);

    addBubble("user", text);
    h.push({ role:"user", text });

    const loader = typingBubble();

    // build special "memory primer" as first assistant message
    const memLines = [];
    if(mem.name) memLines.push(`Kullanıcının adı: ${mem.name}`);
    if(mem.city) memLines.push(`Kullanıcının şehri: ${mem.city}`);
    const memBlock = memLines.length
      ? `KALICI HAFIZA:\n${memLines.join("\n")}\n\nKural: Kullanıcı seni/yaratıcını sorarsa: "Ben italkyAI tarafından geliştirilen bir dil yazılımıyım." de. Google/başka firma deme.`
      : `Kural: Kullanıcı seni/yaratıcını sorarsa: "Ben italkyAI tarafından geliştirilen bir dil yazılımıyım." de. Google/başka firma deme.`;

    const apiHistory = [
      { role:"assistant", content: memBlock },
      ...h.slice(-18).map(x=>({ role: x.role==="assistant" ? "assistant" : "user", content: x.text }))
    ];

    try{
      const out = await apiChat(u, text, apiHistory);
      try{ loader.remove(); }catch{}
      addBubble("assistant", out);
      h.push({ role:"assistant", text: out });
      saveHist(u, h);
    }catch{
      try{ loader.remove(); }catch{}
      const msg = "Şu an cevap veremedim. Bir daha dener misin?";
      addBubble("assistant", msg);
      h.push({ role:"assistant", text: msg });
      saveHist(u, h);
    }

    scrollBottom(false);
  }

  $("sendBtn").addEventListener("click", ()=> send());

  $("msgInput").addEventListener("input", autoGrow);
  $("msgInput").addEventListener("keydown",(e)=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      send();
    }
  });

  // mic => stt => auto-send
  $("micBtn").addEventListener("click", ()=>{
    startSTT(async (finalText)=>{
      // show it in input briefly then send
      $("msgInput").value = finalText;
      autoGrow();
      await send(finalText);
    });
  });

  autoGrow();
}

document.addEventListener("DOMContentLoaded", main);
