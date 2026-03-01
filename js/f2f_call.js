// FILE: /js/f2f_call.js
// WalkieTalkie FINAL (No AI chat)
// ✅ top: participants strip (avatar + name)
// ✅ chat: NO avatars, name label + colored bubbles
// ✅ join/leave system messages from roster diff
// ✅ ignore incoming messages when alone
// ✅ echo killer
// ✅ translate for display only
// ✅ TTS uses /api/tts ok:true else silent
// ✅ STT uses /api/stt (MediaRecorder -> FormData)

import { LANG_POOL } from "/js/lang_pool_full.js";
import { STORAGE_KEY } from "/js/config.js";

const API_BASE = "https://italky-api.onrender.com";
const WS_BASE  = API_BASE.replace("https://", "wss://");

const $ = (id)=>document.getElementById(id);
const params = new URLSearchParams(location.search);

const room = String(params.get("room") || "").trim().toUpperCase();
const role = String(params.get("role") || "").trim().toLowerCase();

let myLang = String(params.get("me_lang") || localStorage.getItem("f2f_my_lang") || "tr").trim().toLowerCase();
localStorage.setItem("f2f_my_lang", myLang);

// UI
const chat        = $("chat");
const msgInput    = $("msgInput");
const sendBtn     = $("sendBtn");
const micBtn      = $("micBtn");
const langSelect  = $("langSelect");     // varsa
const peopleScroll= $("peopleScroll");
const peopleCount = $("peopleCount");
const roomBar     = $("roomBar");        // varsa
const roomPill    = $("roomPill");       // varsa
const exitBtn     = $("exitBtn");        // varsa
const backBtn     = $("backBtn");        // varsa
const logoHome    = $("logoHome");       // varsa

if(!room){
  alert("Oda kodu eksik.");
  location.href = "/pages/f2f_connect.html";
}

// ---------- profile from cache ----------
function shortName(full){
  const s = String(full||"").trim().replace(/\s+/g," ");
  if(!s) return "Kullanıcı";
  const parts = s.split(" ").filter(Boolean);
  if(parts.length === 1) return parts[0];
  // soyadı çıkar
  return parts.slice(0,-1).join(" ");
}

function getProfileFromCache(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { name:"Kullanıcı", picture:"" };
    const u = JSON.parse(raw);
    const full = u.display_name || u.full_name || u.name || u.email || "";
    const name = shortName(full);
    const picture = u.picture || u.avatar || u.avatar_url || u.photo || "";
    return { name: name || "Kullanıcı", picture: picture || "" };
  }catch{
    return { name:"Kullanıcı", picture:"" };
  }
}

const MY = getProfileFromCache();
const clientId = (crypto?.randomUUID?.() || ("c_" + Math.random().toString(16).slice(2))).slice(0,18);

// ---------- language select ----------
const LANGS = Array.isArray(LANG_POOL) && LANG_POOL.length ? LANG_POOL : [
  { code:"tr", flag:"🇹🇷", name:"Türkçe" },
  { code:"en", flag:"🇬🇧", name:"English" },
  { code:"de", flag:"🇩🇪", name:"Deutsch" },
  { code:"fr", flag:"🇫🇷", name:"Français" },
  { code:"it", flag:"🇮🇹", name:"Italiano" },
  { code:"es", flag:"🇪🇸", name:"Español" },
  { code:"ru", flag:"🇷🇺", name:"Русский" },
];

const norm = (c)=>String(c||"").toLowerCase().trim();

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

// ---------- exit ----------
function askExit(){
  const ok = confirm("Sohbetten çıkmak istiyor musunuz?");
  if(ok) location.href = "/pages/home.html";
}
exitBtn?.addEventListener("click", askExit);
backBtn?.addEventListener("click", askExit);
logoHome?.addEventListener("click", askExit);

// ---------- textarea grow + Enter send ----------
function growTA(){
  try{
    if(!msgInput) return;
    msgInput.style.height = "0px";
    const h = Math.min(120, msgInput.scrollHeight || 54);
    msgInput.style.height = h + "px";
    try{ chat.scrollTop = chat.scrollHeight; }catch{}
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

// ---------- participants strip (top avatars) ----------
const participants = new Map(); // key -> { id,name,pic }
function upsertParticipant(id, name, pic){
  const key = String(id||"").trim();
  if(!key) return;
  const nm = String(name||"Kullanıcı").trim() || "Kullanıcı";
  const pc = String(pic||"").trim();

  if(!participants.has(key)){
    participants.set(key, { id:key, name:nm, pic:pc });
  }else{
    const p = participants.get(key);
    p.name = nm || p.name;
    p.pic = pc || p.pic;
  }
}

function initials(name){
  const parts = String(name||"").trim().split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0]||"U").toUpperCase();
  const b = (parts[1]?.[0]||"").toUpperCase();
  return (a+b) || "U";
}

function renderParticipants(){
  if(!peopleScroll) return;
  peopleScroll.innerHTML = "";

  for(const p of participants.values()){
    const item = document.createElement("div");
    item.className = "pItem";
    item.title = p.name;

    const av = document.createElement("div");
    av.className = "pAvatar";
    if(p.pic){
      const img = document.createElement("img");
      img.src = p.pic;
      img.referrerPolicy = "no-referrer";
      av.appendChild(img);
    }else{
      av.textContent = initials(p.name);
      av.style.display="flex";
      av.style.alignItems="center";
      av.style.justifyContent="center";
      av.style.fontWeight="900";
      av.style.color="rgba(255,255,255,.9)";
    }

    const nm = document.createElement("div");
    nm.className = "pName";
    nm.textContent = p.name;

    item.appendChild(av);
    item.appendChild(nm);
    peopleScroll.appendChild(item);
  }

  if(peopleCount) peopleCount.textContent = String(Math.max(1, participants.size));
}

// self always present
upsertParticipant(clientId, MY.name, MY.picture);
renderParticipants();

// ---------- chat rendering (NO avatars in bubbles) ----------
function scrollBottom(){
  try{ chat.scrollTop = chat.scrollHeight; }catch{}
}

function addSystem(text){
  const div = document.createElement("div");
  div.className = "bubble meta";
  div.textContent = String(text||"");
  chat.appendChild(div);
  scrollBottom();
}

function hashHue(str){
  let h = 0;
  const s = String(str||"");
  for(let i=0;i<s.length;i++){
    h = (h*31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

function bubbleColors(name){
  const hue = hashHue(name);
  return {
    border: `hsla(${hue}, 90%, 65%, .35)`,
    bg:     `hsla(${hue}, 80%, 55%, .10)`,
  };
}

function addMessage({ name, text, mine=false }){
  if(!chat) return;

  const row = document.createElement("div");
  row.className = "msg-row " + (mine ? "right" : "left");

  const nm = document.createElement("div");
  nm.className = "sender-name";
  nm.textContent = String(name||"").toUpperCase();

  const b = document.createElement("div");
  b.className = "msg-bubble";

  const c = bubbleColors(name || "user");
  b.style.borderColor = c.border;

  // sağdaki balonun arkaplanı zaten CSS’te bordo. Solda kişiye renk veriyoruz:
  if(!mine) b.style.background = c.bg;

  b.textContent = String(text||"");

  row.appendChild(nm);
  row.appendChild(b);
  chat.appendChild(row);
  scrollBottom();
}

// ---------- local clean (no AI) ----------
function localCleanText(text){
  let s = String(text||"").trim();
  if(!s) return "";
  s = s.replace(/\s+/g," ").trim();
  s = s.replace(/\b(eee+|ııı+|umm+|hmm+)\b/gi, "").replace(/\s+/g," ").trim();
  return s;
}

// ---------- echo killer ----------
const sentLog = []; // {text, t}
function rememberSent(text){
  sentLog.push({ text:String(text||"").trim().toLowerCase(), t:Date.now() });
  const now = Date.now();
  while(sentLog.length && (now - sentLog[0].t > 30000)) sentLog.shift();
}

function tok(s){
  return String(s||"")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu," ")
    .split(/\s+/).filter(Boolean).slice(0,80);
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

// ---------- translate (display only) ----------
async function translateAI(text, from, to){
  const t = String(text||"").trim();
  if(!t) return null;
  const src = norm(from);
  const dst = norm(to);
  if(!src || !dst || src === dst) return null;

  try{
    const res = await fetch(`${API_BASE}/api/translate_ai`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        text: t,
        from_lang: src,
        to_lang: dst,
        style: "fast",
        provider: "auto",
        strict: true,
        no_extra: true
      })
    });
    if(!res.ok) return null;
    const data = await res.json().catch(()=>null);
    const out = data?.translated ? String(data.translated).trim() : "";
    return out || null;
  }catch{
    return null;
  }
}

// ---------- TTS (/api/tts ok:true else silent) ----------
let audioObj=null;
let lastAudioAt=0;

function stopAudio(){
  try{
    if(audioObj){
      audioObj.pause();
      audioObj.currentTime=0;
    }
  }catch{}
  audioObj=null;
}

async function speakViaTTS(text, lang){
  const t = String(text||"").trim();
  if(!t) return;

  // spam koruması: hızlı tıklamada önceki sesi kes
  const now = Date.now();
  if(now - lastAudioAt < 250) stopAudio();
  lastAudioAt = now;

  try{
    const res = await fetch(`${API_BASE}/api/tts`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text: t, lang: norm(lang) })
    });
    if(!res.ok) return;

    const data = await res.json().catch(()=>null);
    if(!data?.ok || !data.audio_base64) return;

    const binary = atob(data.audio_base64);
    const bytes = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);

    const blob = new Blob([bytes], {type:"audio/mpeg"});
    const url = URL.createObjectURL(blob);

    stopAudio();
    audioObj = new Audio(url);
    audioObj.onended = ()=>URL.revokeObjectURL(url);
    audioObj.onerror = ()=>URL.revokeObjectURL(url);
    await audioObj.play();
  }catch{}
}

// ---------- STT (MediaRecorder -> /api/stt) ----------
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
  if(!r.ok) throw new Error(await r.text().catch(()=> "stt error"));
  const j = await r.json().catch(()=> ({}));
  return String(j.text||j.transcript||"").trim();
}

// ---------- WS connection ----------
let ws = null;
let presenceKnown = false;
let presenceCount = 1;

// roster diff tracking (join/leave system)
let lastRosterKeys = new Set();

function wsUrl(){
  // senin backend ws yolu: /api/f2f/ws/{room}
  return `${WS_BASE}/api/f2f/ws/${encodeURIComponent(room)}`;
}

function applyRoster(roster){
  if(!Array.isArray(roster)) return;

  // new keys
  const newKeys = new Set();
  for(const u of roster){
    const id   = String(u?.from || "").trim();
    const name = String(u?.from_name || "Katılımcı").trim();
    const pic  = String(u?.from_pic || "").trim();
    if(!id) continue;
    newKeys.add(id);
    upsertParticipant(id, name, pic);
  }

  // diff -> system messages
  // join
  for(const k of newKeys){
    if(!lastRosterKeys.has(k) && k !== clientId){
      const nm = participants.get(k)?.name || "Katılımcı";
      addSystem(`${nm} sohbete katıldı.`);
    }
  }
  // leave
  for(const k of lastRosterKeys){
    if(!newKeys.has(k) && k !== clientId){
      const nm = participants.get(k)?.name || "Katılımcı";
      addSystem(`${nm} sohbetten ayrıldı.`);
      participants.delete(k);
    }
  }

  lastRosterKeys = newKeys;
  // keep self
  upsertParticipant(clientId, MY.name, MY.picture);
  renderParticipants();
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

      // roster
      if(msg.roster) applyRoster(msg.roster);

      // count
      if(peopleCount) peopleCount.textContent = String(Math.max(1, presenceCount));
      return;
    }

    // presence gelmeden hiçbir şey gösterme
    if(!presenceKnown) return;

    // tek kişiyken gelen hiçbir mesajı gösterme
    if(presenceCount <= 1) return;

    if(msg.type === "message"){
      const fromId   = String(msg.from || "").trim();
      const fromName = String(msg.from_name || "Katılımcı").trim();
      const srcLang  = norm(msg.lang || "en");
      const raw      = String(msg.text || "").trim();
      if(!raw) return;

      // kesin echo kes
      if(fromId && fromId === clientId) return;
      if(isEchoIncoming(raw)) return;

      upsertParticipant(fromId || ("p_"+fromName), fromName, String(msg.from_pic||"").trim());
      renderParticipants();

      let shown = raw;

      // display translate
      if(srcLang && myLang && srcLang !== myLang){
        const tr = await translateAI(raw, srcLang, myLang);
        if(tr) shown = tr;
      }

      shown = localCleanText(shown);
      if(!shown) return;

      addMessage({ name: fromName, text: shown, mine:false });
      await speakViaTTS(shown, myLang);
    }
  };

  ws.onclose = ()=>{
    presenceKnown = false;
    setTimeout(()=>connect(), 900);
  };

  ws.onerror = ()=>{};
}

connect();

// ---------- SEND typed ----------
async function sendTyped(){
  const raw = String(msgInput?.value || "").trim();
  if(!raw) return;

  msgInput.value = "";
  growTA();

  const cleaned = localCleanText(raw);
  if(!cleaned) return;

  addMessage({ name: MY.name, text: cleaned, mine:true });
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
}
sendBtn?.addEventListener("click", sendTyped);

// ---------- MIC ----------
let recJob=null;
let isBusy=false;

async function startRecord(){
  if(isBusy) return;
  isBusy=true;

  try{
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    const mime = pickMime();
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];

    mr.ondataavailable = (e)=>{ if(e.data && e.data.size) chunks.push(e.data); };

    const stopped = new Promise((resolve)=>{ mr.onstop = resolve; });

    mr.start();
    micBtn?.classList.add("listening");

    // 2.2 sn kayıt (walkie hissi)
    const timer = setTimeout(()=>{ try{ mr.stop(); }catch{} }, 2200);

    recJob = { stream, mr, chunks, timer, stopped };
  }catch{
    recJob=null;
  }finally{
    isBusy=false;
  }
}

async function stopRecord(){
  if(!recJob || isBusy) return;
  isBusy=true;

  try{
    clearTimeout(recJob.timer);
    try{ if(recJob.mr && recJob.mr.state !== "inactive") recJob.mr.stop(); }catch{}
    await recJob.stopped.catch(()=>{});

    try{ recJob.stream.getTracks().forEach(t=>t.stop()); }catch{}
    micBtn?.classList.remove("listening");

    const blob = new Blob(recJob.chunks, { type: recJob.mr.mimeType || "audio/webm" });
    recJob = null;

    if(!blob || blob.size < 900) return;

    const raw = await sttBlob(blob, myLang);
    if(!raw) return;

    const cleaned = localCleanText(raw);
    if(!cleaned) return;

    // local echo
    addMessage({ name: MY.name, text: cleaned, mine:true });
    rememberSent(cleaned);

    // send
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
  }catch{
    try{ micBtn?.classList.remove("listening"); }catch{}
  }finally{
    isBusy=false;
  }
}

micBtn?.addEventListener("click", ()=>{
  if(!recJob) return startRecord();
  return stopRecord();
});

// ---------- room pill display (if UI has it) ----------
if(roomPill && roomBar){
  roomBar.style.display = "flex";
  roomPill.textContent = room;
  roomPill.addEventListener("click", async ()=>{
    try{
      await navigator.clipboard.writeText(room);
      addSystem("Kod kopyalandı.");
    }catch{
      alert("Kod: " + room);
    }
  });
}

// ---------- unload -> best effort leave (server may ignore) ----------
window.addEventListener("beforeunload", ()=>{
  try{
    if(ws && ws.readyState === 1){
      ws.send(JSON.stringify({
        type:"leave",
        room,
        from: clientId,
        from_name: MY.name
      }));
    }
  }catch{}
});
