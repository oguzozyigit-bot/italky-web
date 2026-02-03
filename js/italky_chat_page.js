// FILE: italky-web/js/italky_chat_page.js
// Italky Chat Page Controller (Gemini backend - text only)
// ✅ STT -> auto-send (no enter needed)
// ✅ No TTS here (no sound)
// ✅ Footer links fixed; dock sits above footer
// ✅ Local history per user (last 30)
// ✅ Plus sheet: camera/photos/files (OCR hook is optional)

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

function chatKey(u){
  const uid = String(u.user_id || u.id || u.email || "guest").toLowerCase().trim();
  return `italky_chat_hist::${uid}`;
}
function loadHist(u){
  return safeJson(localStorage.getItem(chatKey(u)), []);
}
function saveHist(u, h){
  try{ localStorage.setItem(chatKey(u), JSON.stringify((h||[]).slice(-30))); }catch{}
}

function isNearBottom(el, slack=140){
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

async function apiChat(u, text, history){
  const base = String(BASE_DOMAIN||"").replace(/\/+$/,"");
  const url = `${base}/api/chat`;

  // ✅ sadece yazı: Italky AI ürünü
  const body = {
    user_id: (u.user_id || u.id || u.email),
    text,
    history: (history || []).slice(-20),
    user_meta: {
      // bu alanlar backend prompt'a yardımcı olur
      fullname: u.fullname || u.name || u.display_name || "",
      plan: u.plan || "FREE",
      product: "italkyAI"
    }
  };

  const r = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });

  const raw = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(raw || `HTTP ${r.status}`);

  let data = {};
  try{ data = JSON.parse(raw || "{}"); }catch{}
  const out = String(data.text || data.reply || data.answer || "").trim();
  return out || "…";
}

/* OPTIONAL OCR hook (eğer backend’de /api/ocr varsa) */
async function tryOCRImage(base64DataUrl){
  const base = String(BASE_DOMAIN||"").replace(/\/+$/,"");
  if(!base) return "";

  // beklenen örnek payload: { image_base64: "data:image/jpeg;base64,..." } veya { image: "..." }
  const url = `${base}/api/ocr`;
  try{
    const r = await fetch(url,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ image_base64: base64DataUrl })
    });
    const raw = await r.text().catch(()=> "");
    if(!r.ok) return "";
    let d={}; try{ d=JSON.parse(raw||"{}"); }catch{}
    const text = String(d.text || d.ocr_text || d.result || "").trim();
    return text;
  }catch{
    return "";
  }
}

function autoGrow(){
  const ta = $("msgInput");
  if(!ta) return;
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
}

let sttBusy = false;

function startSTT(onFinal){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ alert("Bu cihaz konuşmayı yazıya çevirmiyor."); return; }
  if(sttBusy) return;

  const micBtn = $("micBtn");
  const ta = $("msgInput");

  const rec = new SR();
  rec.lang = "tr-TR";
  rec.interimResults = false;
  rec.continuous = false;

  sttBusy = true;
  micBtn.classList.add("listening");

  rec.onresult = (e)=>{
    const t = e.results?.[0]?.[0]?.transcript || "";
    if(t){
      ta.value = t.trim();
      autoGrow();
      onFinal?.(t.trim());
    }
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

function bindPlusSheet(u, sendFn){
  const camBtn = $("camBtn");
  const plusSheet = $("plusSheet");
  const fileCamera = $("fileCamera");
  const filePhotos = $("filePhotos");
  const fileFiles  = $("fileFiles");

  const pickCamera = $("pickCamera");
  const pickPhotos = $("pickPhotos");
  const pickFiles  = $("pickFiles");

  function toggle(open){
    plusSheet.classList.toggle("show", !!open);
  }

  camBtn.addEventListener("click",(e)=>{
    e.preventDefault();
    toggle(!plusSheet.classList.contains("show"));
  });

  document.addEventListener("click",(e)=>{
    if(!plusSheet.classList.contains("show")) return;
    if(plusSheet.contains(e.target)) return;
    if(camBtn.contains(e.target)) return;
    toggle(false);
  }, true);

  pickCamera.onclick = ()=>{ toggle(false); fileCamera.click(); };
  pickPhotos.onclick = ()=>{ toggle(false); filePhotos.click(); };
  pickFiles.onclick  = ()=>{ toggle(false); fileFiles.click(); };

  async function handleImage(file){
    if(!file) return;
    addBubble("meta", `📷 Fotoğraf alındı: ${file.name || "image"}`);

    // base64
    const dataUrl = await new Promise((res)=>{
      const fr = new FileReader();
      fr.onload = ()=> res(String(fr.result||""));
      fr.readAsDataURL(file);
    });

    const ocrText = await tryOCRImage(dataUrl);
    if(ocrText){
      addBubble("meta", `📝 Metin (OCR): ${ocrText.slice(0, 900)}${ocrText.length>900 ? "…" : ""}`);
      // istersen otomatik sohbete soralım:
      // $("msgInput").value = ocrText; autoGrow(); sendFn();
    }else{
      addBubble("meta", "📝 OCR şu an bağlı değil (backend /api/ocr yok ya da hata).");
    }
  }

  fileCamera.addEventListener("change", async ()=>{
    const f = fileCamera.files?.[0];
    fileCamera.value = "";
    await handleImage(f);
  });

  filePhotos.addEventListener("change", async ()=>{
    const f = filePhotos.files?.[0];
    filePhotos.value = "";
    await handleImage(f);
  });

  fileFiles.addEventListener("change", async ()=>{
    const f = fileFiles.files?.[0];
    fileFiles.value = "";
    if(!f) return;

    addBubble("meta", `📎 Dosya alındı: ${f.name} (${Math.round((f.size||0)/1024)} KB)`);
    // burada ileride: PDF/text çıkarma + web arama bağlarız
  });
}

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
    addBubble("meta", "italkyAI: Yazılı sohbet modundasın. Mikrofon konuşmanı yazıya çevirir ve otomatik gönderir.");
  }else{
    hist.forEach(m=> addBubble(m.role, m.text));
  }

  follow = true;
  scrollBottom(true);

  async function send(){
    const ta = $("msgInput");
    const text = String(ta.value||"").trim();
    if(!text) return;

    ta.value = "";
    autoGrow();

    const h = loadHist(u);
    addBubble("user", text);
    h.push({ role:"user", text });

    const loader = typingBubble();

    try{
      const out = await apiChat(u, text, h.map(x=>({role:x.role, content:x.text})));
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

  bindPlusSheet(u, send);

  $("sendBtn").addEventListener("click", send);

  $("msgInput").addEventListener("input", autoGrow);
  $("msgInput").addEventListener("keydown",(e)=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      send();
    }
  });

  // ✅ Mikrofon: konuşma biter bitmez otomatik gönder
  $("micBtn").addEventListener("click", ()=>{
    startSTT(async ()=>{
      // STT yazdıktan sonra otomatik gönder
      await send();
    });
  });

  autoGrow();
}

document.addEventListener("DOMContentLoaded", main);
