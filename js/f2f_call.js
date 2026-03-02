// FILE: /js/f2f_call.js
// ✅ WalkieTalkie FINAL: AI sohbet YOK (sadece kullanıcılar arası)
// ✅ Presence + roster ile katılımcı şeridi
// ✅ Tek kişiyken mesaj göstermeme
// ✅ Balonlarda avatar yok (sadece isim + balon)
// ✅ Dil seçimi her zaman dolar
// ✅ NEW: Push-to-talk (basılı tut → konuş, bırak → gönder)
// ✅ NEW: Gelen mesajı otomatik TTS ile seslendir (anti-overlap)

import { LANG_POOL } from "/js/lang_pool_full.js";
import { STORAGE_KEY } from "/js/config.js";
import { shortDisplayName } from "/js/ui_shell.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id)=>document.getElementById(id);

const params = new URLSearchParams(location.search);
const room = String(params.get("room") || "").trim().toUpperCase();
const role = String(params.get("role") || "").trim().toLowerCase();

let myLang = String(params.get("me_lang") || localStorage.getItem("f2f_my_lang") || "tr").trim().toLowerCase();
localStorage.setItem("f2f_my_lang", myLang);

// ✅ Auto TTS (varsayılan açık)
let autoTTS = (localStorage.getItem("wt_auto_tts") ?? "1") === "1";

// UI
const chat = $("chat");
const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");
const langSelect = $("langSelect");
const peopleScroll = $("peopleScroll");
const peopleCount = $("peopleCount");
const exitBtn = $("exitBtn");
const backBtn = $("backBtn");

if(!room){
  alert("Oda kodu eksik.");
  location.href = "/pages/f2f_connect.html";
}

// profile from cache
function getProfileFromCache(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { name:"Kullanıcı", picture:"" };
    const u = JSON.parse(raw);
    const full = u.display_name || u.full_name || u.name || "";
    const name = shortDisplayName(full || "Kullanıcı");
    const picture = u.picture || u.avatar || u.avatar_url || "";
    return { name, picture };
  }catch{
    return { name:"Kullanıcı", picture:"" };
  }
}
const MY = getProfileFromCache();

// language list
const LANGS = Array.isArray(LANG_POOL) && LANG_POOL.length
  ? LANG_POOL
  : [
      { code:"tr", flag:"🇹🇷", name:"Türkçe" },
      { code:"en", flag:"🇬🇧", name:"English" },
      { code:"de", flag:"🇩🇪", name:"Deutsch" },
      { code:"fr", flag:"🇫🇷", name:"Français" },
      { code:"it", flag:"🇮🇹", name:"Italiano" },
      { code:"es", flag:"🇪🇸", name:"Español" },
    ];

const norm = (c)=>String(c||"").toLowerCase().trim();

// Dil select doldur
if(langSelect){
  langSelect.innerHTML = LANGS.map(l=>{
    const c = norm(l.code);
    const label = `${l.flag||"🌐"} ${l.name||c.toUpperCase()}`;
    return `<option value="${c}">${label}</option>`;
  }).join("");
  langSelect.value = myLang;
  langSelect.addEventListener("change", ()=>{
    myLang = norm(langSelect.value);
    localStorage.setItem("f2f_my_lang", myLang);
  });
}

// Exit confirm
function askExit(){
  const ok = confirm("Sohbetten çıkmak istiyor musunuz?");
  if(ok) location.href = "/pages/home.html";
}
exitBtn?.addEventListener("click", askExit);
backBtn?.addEventListener("click", askExit);

// textarea grow + Enter send
function growTA(){
  try{
    msgInput.style.height = "0px";
    const h = Math.min(120, msgInput.scrollHeight || 54);
    msgInput.style.height = h + "px";
    chat.scrollTop = chat.scrollHeight;
  }catch{}
}
msgInput?.addEventListener("input", growTA);
setTimeout(growTA, 0);

msgInput?.addEventListener("keydown",(e)=>{
  if(e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    sendTyped();
  }
});

// participants strip
const participants = new Map(); // key -> {name,pic}
function renderParticipants(){
  if(!peopleScroll) return;
  peopleScroll.innerHTML = "";

  for(const [k,p] of participants.entries()){
    const item = document.createElement("div");
    item.className = "pItem";

    const av = document.createElement("div");
    av.className = "pAvatar";
    if(p.pic){
      const img = document.createElement("img");
      img.src = p.pic;
      img.referrerPolicy = "no-referrer";
      av.appendChild(img);
    }else{
      av.textContent = (String(p.name||"•")[0]||"•").toUpperCase();
    }

    const nm = document.createElement("div");
    nm.className = "pName";
    nm.textContent = String(p.name||"User");

    item.appendChild(av);
    item.appendChild(nm);
    peopleScroll.appendChild(item);
  }
}

function upsertParticipant(key, name, pic){
  if(!key) return;
  if(!participants.has(key)) participants.set(key, { name:name||"User", pic:pic||"" });
  else{
    const p = participants.get(key);
    p.name = name || p.name;
    p.pic = pic || p.pic;
  }
  renderParticipants();
}

// self
const clientId = (crypto?.randomUUID?.() || ("c_" + Math.random().toString(16).slice(2))).slice(0,18);
upsertParticipant(clientId, MY.name, MY.picture);
if(peopleCount) peopleCount.textContent = "1";

// local clean
function localCleanText(text){
  let s = String(text||"").trim();
  if(!s) return s;
  s = s.replace(/\s+/g," ").trim();
  s = s.replace(/\b(eee+|ııı+|umm+|hmm+)\b/gi, "").replace(/\s+/g," ").trim();
  return s;
}

// bubble (NO avatar in chat)
function addMessage(side, name, text){
  if(!chat) return;

  const row = document.createElement("div");
  row.className = "msg-row " + (side === "right" ? "right" : "left");

  const nm = document.createElement("div");
  nm.className = "sender-name";
  nm.textContent = name || "";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  row.appendChild(nm);
  row.appendChild(bubble);

  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

// echo killer
const sentLog = [];
function rememberSent(text){
  sentLog.push({ text:String(text||"").trim().toLowerCase(), t:Date.now() });
  const now = Date.now();
  while(sentLog.length && (now - sentLog[0].t > 30000)) sentLog.shift();
}
function tok(s){
  return String(s||"").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").split(/\s+/).filter(Boolean).slice(0,60);
}
function jaccard(a,b){
  const A=new Set(tok(a)), B=new Set(tok(b));
  if(!A.size || !B.size) return 0;
  let inter=0;
  for(const x of A) if(B.has(x)) inter++;
  const uni = A.size + B.size - inter;
  return uni ? inter/uni : 0;
}
function isEchoIncoming(txt){
  const s = String(txt||"").trim().toLowerCase();
  for(const it of sentLog){
    const sim = jaccard(it.text, s);
    if(sim >= 0.72) return true;
    if(Date.now()-it.t < 8000 && sim >= 0.55) return true;
  }
  return false;
}

// translate (display) — Google backend (endpoint adı translate_ai)
async function translateAI(text, from, to){
  const t = String(text||"").trim();
  if(!t) return t;
  const src = norm(from);
  const dst = norm(to);
  if(src === dst) return t;

  try{
    const res = await fetch(`${API_BASE}/api/translate_ai`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text: t, from_lang: src, to_lang: dst })
    });
    if(!res.ok) return null;
    const data = await res.json().catch(()=>null);
    return data?.translated ? String(data.translated).trim() : null;
  }catch{
    return null;
  }
}

// STT backend — Google STT
function pickMime(){
  const cands = ["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/ogg"];
  for(const m of cands){
    try{ if(MediaRecorder.isTypeSupported(m)) return m; }catch{}
  }
  return "";
}
async function sttBlob(blob, lang){
  const fd = new FormData();
  fd.append("file", blob, "speech.webm");
  fd.append("lang", norm(lang));
  const r = await fetch(`${API_BASE}/api/stt`, { method:"POST", body: fd });
  if(!r.ok) throw new Error(await r.text());
  const j = await r.json().catch(()=>({}));
  return String(j.text||"").trim();
}

/* ===============================
   ✅ AUTO TTS for incoming (anti-overlap + abort + token)
================================ */
let ttsAudio = null;
let ttsCtl = null;
let ttsToken = 0;
let ttsLastAt = 0;

function stopTTS(){
  try{ ttsCtl?.abort?.(); }catch{}
  ttsCtl = null;

  try{
    if(ttsAudio){
      ttsAudio.pause();
      ttsAudio.currentTime = 0;
    }
  }catch{}
  ttsAudio = null;
}

async function speakText(text, lang){
  if(!autoTTS) return;
  const t = String(text||"").trim();
  if(!t) return;

  const now = Date.now();
  if(now - ttsLastAt < 160) return; // spam kes
  ttsLastAt = now;

  stopTTS();
  const my = ++ttsToken;

  try{
    ttsCtl = new AbortController();

    const r = await fetch(`${API_BASE}/api/tts`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text: t, lang: norm(lang) }),
      signal: ttsCtl.signal
    });

    if(my !== ttsToken) return;
    if(!r.ok) return;

    const j = await r.json().catch(()=>null);
    if(my !== ttsToken) return;

    const b64 = j?.audio_base64;
    if(!b64) return;

    ttsAudio = new Audio("data:audio/mpeg;base64," + b64);
    ttsAudio.playsInline = true;
    ttsAudio.onended = ()=>{ if(my === ttsToken) ttsAudio=null; };
    ttsAudio.onerror = ()=>{ if(my === ttsToken) ttsAudio=null; };

    if(my !== ttsToken) return;
    await ttsAudio.play();
  }catch{
    // abort normal
  }
}

// WS
let ws = null;
let presenceKnown = false;
let presenceCount = 1;

function wsUrl(){
  return `${API_BASE.replace("https://","wss://")}/api/f2f/ws/${room}`;
}

function applyRoster(roster){
  if(!Array.isArray(roster)) return;
  for(const u of roster){
    const from = String(u?.from || "").trim();
    const name = String(u?.from_name || "User").trim();
    const pic  = String(u?.from_pic || "").trim();
    const key = from || ("p_"+name);
    upsertParticipant(key, name, pic);
  }
}

function connect(){
  ws = new WebSocket(wsUrl());

  ws.onopen = ()=>{
    const helloType = (role === "host") ? "create" : "join";
    ws.send(JSON.stringify({
      type: helloType,
      room,
      from: clientId,
      from_name: MY.name,
      from_pic: MY.picture || "",
      me_lang: myLang
    }));
  };

  ws.onmessage = async (ev)=>{
    let msg=null;
    try{ msg = JSON.parse(ev.data); }catch{ return; }

    if(msg.type === "room_not_found"){
      alert(msg.message || "Kod hatalı olabilir veya oda kapanmış olabilir.");
      location.href = "/pages/f2f_connect.html";
      return;
    }

    if(msg.type === "presence"){
      presenceKnown = true;
      const c = Number(msg.count||0);
      presenceCount = (Number.isFinite(c) && c >= 0) ? c : 1;
      if(peopleCount) peopleCount.textContent = String(Math.max(1, presenceCount));

      if(msg.roster) applyRoster(msg.roster);
      upsertParticipant(clientId, MY.name, MY.picture);
      return;
    }

    if(!presenceKnown) return;
    if(presenceCount <= 1) return;

    if(msg.type === "message"){
      const fromId   = String(msg.from || "").trim();
      const fromName = String(msg.from_name || "Katılımcı").trim();
      const fromPic  = String(msg.from_pic || "").trim();
      const srcLang  = norm(msg.lang || "en");
      const raw      = String(msg.text || "").trim();
      if(!raw) return;

      if(fromId && fromId === clientId) return;
      if(isEchoIncoming(raw)) return;

      upsertParticipant(fromId || ("p_"+fromName), fromName, fromPic);

      let shown = raw;
      if(srcLang && myLang && srcLang !== myLang){
        const tr = await translateAI(raw, srcLang, myLang);
        if(tr) shown = tr;
      }

      shown = localCleanText(shown);
      if(!shown) return;

      addMessage("left", fromName, shown);

      // ✅ AUTO TTS: okunan dil = myLang (çünkü ekranda gösterilen bu)
      speakText(shown, myLang);
    }
  };

  ws.onclose = ()=>{};
}
connect();

// SEND typed
async function sendTyped(){
  const raw = String(msgInput?.value || "").trim();
  if(!raw) return;

  msgInput.value = "";
  growTA();

  const cleaned = localCleanText(raw);
  if(!cleaned) return;

  addMessage("right", MY.name, cleaned);
  rememberSent(cleaned);

  upsertParticipant(clientId, MY.name, MY.picture);

  if(ws && ws.readyState === 1){
    ws.send(JSON.stringify({
      type:"message",
      from: clientId,
      from_name: MY.name,
      from_pic: MY.picture || "",
      lang: myLang,
      text: cleaned
    }));
  }
}
sendBtn?.addEventListener("click", sendTyped);

/* ===============================
   ✅ PUSH-TO-TALK (hold to record)
================================ */
let recJob=null, isBusy=false;
let pressActive = false;

async function startRecord(){
  if(isBusy || recJob) return;
  isBusy=true;
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    const mime = pickMime();
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks=[];
    mr.ondataavailable = (e)=>{ if(e.data && e.data.size) chunks.push(e.data); };
    mr.start(250);

    // güvenlik: 12sn auto-stop
    const timer = setTimeout(()=> stopRecord(), 12000);

    recJob = { stream, mr, chunks, timer };
    micBtn?.classList.add("listening");
  }catch{}
  finally{ isBusy=false; }
}

async function stopRecord(){
  if(!recJob || isBusy) return;
  isBusy=true;
  try{
    clearTimeout(recJob.timer);
    try{ recJob.mr.stop(); }catch{}
    try{ recJob.stream.getTracks().forEach(t=>t.stop()); }catch{}
    micBtn?.classList.remove("listening");

    const blob = new Blob(recJob.chunks, { type: recJob.mr.mimeType || "audio/webm" });
    recJob=null;

    if(!blob || blob.size < 800) return;

    const raw = await sttBlob(blob, myLang);
    const cleaned = localCleanText(raw);
    if(!cleaned) return;

    addMessage("right", MY.name, cleaned);
    rememberSent(cleaned);

    if(ws && ws.readyState === 1){
      ws.send(JSON.stringify({
        type:"message",
        from: clientId,
        from_name: MY.name,
        from_pic: MY.picture || "",
        lang: myLang,
        text: cleaned
      }));
    }
  }catch{}
  finally{ isBusy=false; }
}

// ✅ Hold handlers (touch + mouse + pen)
function bindPushToTalk(btn){
  if(!btn) return;

  const down = async (e)=>{
    e.preventDefault();
    e.stopPropagation();
    if(pressActive) return;
    pressActive = true;
    await startRecord();
  };

  const up = async (e)=>{
    e.preventDefault();
    e.stopPropagation();
    if(!pressActive) return;
    pressActive = false;
    await stopRecord();
  };

  btn.addEventListener("pointerdown", down, { passive:false });
  btn.addEventListener("pointerup", up, { passive:false });
  btn.addEventListener("pointercancel", up, { passive:false });
  btn.addEventListener("pointerleave", up, { passive:false });

  // fallback (eski click toggle)
  btn.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); }, { passive:false });
}

bindPushToTalk(micBtn);
