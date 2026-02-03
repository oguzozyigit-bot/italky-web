// Italky Chat Page Controller (Gemini - text only)
// ✅ Clear chat works
// ✅ Mic works (STT)
// ✅ Wave animation while recording
// ✅ Auto-send after speech
// ✅ No sound output

import { BASE_DOMAIN, STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{ return JSON.parse(s||""); }catch{ return fb; } }

/* ================= USER ================= */
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

/* ================= HEADER ================= */
function paintHeader(u){
  const full = (u.fullname || u.name || u.display_name || u.email || "—").trim();
  $("userName").textContent = full;
  $("userPlan").textContent = String(u.plan || "FREE").toUpperCase();

  const avatarBtn = $("avatarBtn");
  const fallback = $("avatarFallback");
  const pic = String(u.picture || "").trim();
  if(pic){
    avatarBtn.innerHTML = `<img src="${pic}" alt="avatar">`;
  }else{
    fallback.textContent = full[0] || "•";
  }

  $("logoHome").onclick = ()=> location.href="/pages/home.html";
  $("backBtn").onclick  = ()=> location.href="/pages/home.html";
  avatarBtn.onclick     = ()=> location.href="/pages/profile.html";
}

/* ================= HISTORY ================= */
function chatKey(u){
  const uid = String(u.user_id || u.email).toLowerCase();
  return `italky_chat_hist::${uid}`;
}
function loadHist(u){
  return safeJson(localStorage.getItem(chatKey(u)), []);
}
function saveHist(u, h){
  localStorage.setItem(chatKey(u), JSON.stringify(h.slice(-30)));
}

/* ================= UI ================= */
let follow = true;
function scrollBottom(force=false){
  const el = $("chat");
  requestAnimationFrame(()=>{
    if(force || follow) el.scrollTop = el.scrollHeight;
  });
}

function addBubble(role, text){
  const d = document.createElement("div");
  d.className = `bubble ${role}`;
  d.textContent = text;
  $("chat").appendChild(d);
  scrollBottom(false);
}

function typingBubble(){
  const d = document.createElement("div");
  d.className = "bubble bot";
  d.textContent = "…";
  $("chat").appendChild(d);
  scrollBottom(false);
  return d;
}

/* ================= API ================= */
async function apiChat(u, text, history){
  const r = await fetch(`${BASE_DOMAIN}/api/chat`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      user_id: u.user_id || u.email,
      text,
      history: history.slice(-20).map(x=>({role:x.role, content:x.text}))
    })
  });
  const j = await r.json();
  return String(j.text||"").trim() || "…";
}

/* ================= TEXTAREA ================= */
function autoGrow(){
  const ta = $("msgInput");
  ta.style.height="auto";
  ta.style.height=Math.min(ta.scrollHeight,120)+"px";
}

/* ================= CLEAR CHAT ================= */
function bindClearChat(u){
  $("clearChatBtn").onclick = ()=>{
    $("chat").innerHTML = "";
    localStorage.removeItem(chatKey(u)); // ✅ HAFIZA SİLİNMİYOR, SADECE SOHBET
    addBubble("meta","Sohbet temizlendi. Seni hatırlıyorum 🙂");
  };
}

/* ================= STT (MIC) ================= */
let sttBusy = false;
function startSTT(onFinal){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ alert("Bu cihaz konuşmayı yazıya çevirmiyor."); return; }
  if(sttBusy) return;

  const micBtn = $("micBtn");
  const ta = $("msgInput");

  const rec = new SR();
  rec.lang="tr-TR";
  rec.interimResults=false;
  rec.continuous=false;

  sttBusy=true;
  micBtn.classList.add("listening"); // ✅ dalga animasyonu tetik

  rec.onresult = (e)=>{
    const t = e.results[0][0].transcript.trim();
    if(t){
      ta.value=t;
      autoGrow();
      onFinal(t);
    }
  };
  rec.onend = ()=>{
    micBtn.classList.remove("listening");
    sttBusy=false;
  };
  try{ rec.start(); }catch{ sttBusy=false; }
}

/* ================= MAIN ================= */
async function main(){
  const u = ensureLogged();
  if(!u) return;

  paintHeader(u);
  bindClearChat(u);

  const chat = $("chat");
  chat.onscroll = ()=> follow = (chat.scrollHeight - chat.scrollTop - chat.clientHeight) < 120;

  const hist = loadHist(u);
  chat.innerHTML="";
  if(hist.length){
    hist.forEach(m=> addBubble(m.role,m.text));
  }else{
    addBubble("meta","italkyAI: Yazılı bilgi alma alanı.");
  }
  scrollBottom(true);

  async function send(){
    const ta=$("msgInput");
    const text=ta.value.trim();
    if(!text) return;
    ta.value=""; autoGrow();

    const h=loadHist(u);
    addBubble("user",text);
    h.push({role:"user",text});

    const loader=typingBubble();
    try{
      const out=await apiChat(u,text,h);
      loader.remove();
      addBubble("bot",out);
      h.push({role:"assistant",text:out});
      saveHist(u,h);
    }catch{
      loader.remove();
      addBubble("bot","Şu an cevap veremedim.");
    }
  }

  $("sendBtn").onclick=send;
  $("msgInput").oninput=autoGrow;
  $("msgInput").onkeydown=(e)=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault(); send();
    }
  };

  $("micBtn").onclick=()=>{
    startSTT(async ()=>{ await send(); });
  };

  autoGrow();
}

document.addEventListener("DOMContentLoaded",main);
