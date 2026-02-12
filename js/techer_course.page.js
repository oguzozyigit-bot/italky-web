// FILE: /js/teacher_course.page.js
// italkyAI Teacher Course — Speech-only, Sweet but Disciplined
// - Teacher speaks target language only
// - UI shows Turkish translation in parentheses
// - 95% similarity, 3 tries
// - Start/Pause button controls the lesson
// - Classic bell (WebAudio)
// - Teacher bubbles have speaker button to replay

import { STORAGE_KEY, BASE_DOMAIN } from "/js/config.js";
import { apiPOST } from "/js/api.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function base(){ return String(BASE_DOMAIN||"").replace(/\/+$/,""); }

// auth
function termsKey(email=""){ return `italky_terms_accepted_at::${String(email||"").toLowerCase().trim()}`; }
function getUser(){ return safeJson(localStorage.getItem(STORAGE_KEY), {}); }
function ensureLogged(){
  const u=getUser();
  if(!u?.email){ location.replace("/index.html"); return null; }
  if(!localStorage.getItem(termsKey(u.email))){ location.replace("/index.html"); return null; }
  return u;
}

// teacher prefs
const KEY_TEACHER = "italky_teacher_pref";
const KEY_MINS = "italky_lesson_mins";
const KEY_LEVEL = "italky_lesson_level";

const TEACHERS = {
  dora:   { id:"dora",   nameTR:"Dora",   lang:"en", stt:"en-US", voice:"nova" },
  ayda:   { id:"ayda",   nameTR:"Ayda",   lang:"de", stt:"de-DE", voice:"shimmer" },
  jale:   { id:"jale",   nameTR:"Jale",   lang:"fr", stt:"fr-FR", voice:"alloy" },
  sencer: { id:"sencer", nameTR:"Sencer", lang:"it", stt:"it-IT", voice:"echo" },
  ozan:   { id:"ozan",   nameTR:"Ozan",   lang:"es", stt:"es-ES", voice:"fable" },
  sungur: { id:"sungur", nameTR:"Sungur", lang:"ru", stt:"ru-RU", voice:"onyx" },
  huma:   { id:"huma",   nameTR:"Hüma",   lang:"ja", stt:"ja-JP", voice:"nova" }
};

function getTeacher(){
  const id = (localStorage.getItem(KEY_TEACHER)||"dora").trim();
  return TEACHERS[id] || TEACHERS.dora;
}
function getMins(){
  const m = (localStorage.getItem(KEY_MINS)||"10").trim();
  return (m==="20"||m==="30") ? Number(m) : 10;
}
function getLevel(){
  const l = (localStorage.getItem(KEY_LEVEL)||"A0").trim().toUpperCase();
  return ["A0","A1","A2","B1"].includes(l) ? l : "A0";
}

// UI helpers
const chatEl = $("chat");
function scrollBottom(){ try{ chatEl.scrollTop = chatEl.scrollHeight; }catch{} }

function addBubble(cls, text, { speakable=false } = {}){
  const d=document.createElement("div");
  d.className = `bubble ${cls}`;

  const txt = document.createElement("div");
  txt.className = "txt";
  txt.textContent = String(text||"");
  d.appendChild(txt);

  if(speakable){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "spkBtn";
    b.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M11 5L6 9H2v6h4l5 4V5z"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>`;
    b.addEventListener("click",(e)=>{
      e.preventDefault(); e.stopPropagation();
      speakTTS(txt.textContent, teacher.voice, ()=>{});
    });
    d.appendChild(b);
  }

  chatEl.appendChild(d);
  scrollBottom();
  return d;
}

// Turkish translation (UI only)
async function translateToTR(text, sourceLang){
  const t = String(text||"").trim();
  if(!t) return "";
  try{
    const b = base();
    if(!b) return "";
    const r = await fetch(`${b}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text:t, source: sourceLang, target:"tr", from_lang: sourceLang, to_lang:"tr" })
    });
    if(!r.ok) return "";
    const data = await r.json().catch(()=> ({}));
    return String(data?.translated || data?.translation || data?.text || "").trim() || "";
  }catch{ return ""; }
}

// similarity
const TARGET_SIM = 0.95;
const MAX_TRIES = 3;

function normText(s){
  return String(s||"")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu," ")
    .replace(/\s+/g," ")
    .trim();
}
function tokenSimilarity(a,b){
  const A = normText(a).split(" ").filter(Boolean);
  const B = normText(b).split(" ").filter(Boolean);
  if(!A.length && !B.length) return 1;
  if(!A.length || !B.length) return 0;
  const len = Math.max(A.length, B.length);
  let hit=0;
  for(let i=0;i<Math.min(A.length,B.length);i++){ if(A[i]===B[i]) hit++; }
  const setB=new Set(B); let bagHit=0;
  for(const w of A){ if(setB.has(w)) bagHit++; }
  return Math.max(hit/len, bagHit/len);
}

// bell
function playBell(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    const ctx = new Ctx();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g  = ctx.createGain();
    o1.type="sine"; o2.type="sine";
    o1.frequency.value = 880;
    o2.frequency.value = 1320;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+1.4);
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.start(); o2.start();
    o1.stop(ctx.currentTime+1.45); o2.stop(ctx.currentTime+1.45);
    setTimeout(()=>{ try{ctx.close();}catch{} }, 1600);
  }catch{}
}

// TTS via backend
let currentAudio=null;
function stopAudio(){ if(currentAudio){ try{currentAudio.pause();}catch{} currentAudio=null; } }

async function speakTTS(text, voice, onEnd){
  stopAudio();
  const t=String(text||"").trim(); if(!t){ onEnd?.(); return; }
  setStatus("SPEAKING");
  try{
    const data = await apiPOST("/api/tts_openai", { text:t, voice, speed:1.05 }, { timeoutMs:45000 });
    const b64 = data?.audio_base64;
    if(!b64){ onEnd?.(); return; }
    const audio = new Audio("data:audio/mp3;base64,"+b64);
    currentAudio=audio;
    audio.onended=()=>{ currentAudio=null; onEnd?.(); };
    await audio.play();
  }catch{
    onEnd?.();
  }
}

// STT
let recognition=null;
function stopSTT(){ try{recognition?.stop?.();}catch{} recognition=null; }
function buildRecognizer(lang){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = lang;
  r.interimResults = false;
  r.continuous = false;
  r.maxAlternatives = 1;
  return r;
}

// OpenAI teacher prompt
function teacherSystemPrompt({teacherName, lang, level, studentName}){
  return `
You are ${teacherName}, a sweet but disciplined ${lang.toUpperCase()} language teacher in italkyAI.
Rules:
- You NEVER speak Turkish. Never translate to Turkish. Never mention OpenAI/GPT/AI/Gemini.
- Teach like a real class: pronunciation + letters/sounds + examples.
- Output MUST be exactly:
TEACH: (1-3 short lines)
REPEAT: (ONE single sentence the student must say)
- Level: ${level}. Keep it appropriate.
Student name: ${studentName}.
`.trim();
}

async function apiTeacherText(userText, teacher, level, studentName, history){
  const sys = teacherSystemPrompt({ teacherName: teacher.nameTR, lang: teacher.lang, level, studentName });
  const h = [
    { role:"assistant", content: sys },
    ...(history||[]).slice(-6)
  ];
  const data = await apiPOST("/api/chat_openai", {
    text: userText,
    persona_name: teacher.nameTR,
    history: h,
    max_tokens: 220
  }, { timeoutMs: 25000 });
  return String(data?.text || "").trim();
}

function parseTeachRepeat(reply){
  const raw=String(reply||"").trim();
  let teach=raw, repeat="";
  const mR = raw.match(/REPEAT:\s*([^\n\r]+)/i);
  if(mR) repeat=String(mR[1]||"").trim();
  const mT = raw.match(/TEACH:\s*([\s\S]*?)(?:\n|\r|$)REPEAT:/i);
  if(mT) teach=String(mT[1]||"").trim();
  if(!repeat){
    const lines = raw.split(/[\n\r]+/).map(x=>x.trim()).filter(Boolean);
    repeat = lines[lines.length-1] || "";
  }
  if(!teach) teach = raw;
  return { teach, repeat };
}

// Course state
let u=null;
let teacher=null;
let level="A0";
let mins=10;
let running=false;
let paused=false;
let endAt=0;

let pendingRepeat="";
let triesLeft=MAX_TRIES;
let history=[];

function setBadges(){
  $("pillTry").textContent = "●".repeat(Math.max(0, triesLeft)) + "○".repeat(Math.max(0, MAX_TRIES-triesLeft));
  $("pillScore").textContent = "95%";
}

function setHeader(){
  $("teacherName").textContent = `${teacher.nameTR} • ${teacher.lang.toUpperCase()}`;
  $("lessonInfo").textContent = `Ders: ${level} • Süre: ${mins} dk`;
}

function setStatus(s){
  const el = $("statusText");
  if(el) el.textContent = s;
}

function resetRepeat(){
  pendingRepeat="";
  triesLeft=MAX_TRIES;
  setBadges();
}

function pauseLesson(){
  paused=true;
  stopAudio(); stopSTT();
  setStatus("PAUSED");
  const b = $("btnLesson");
  if(b) b.textContent = "Devam Et";
}
function resumeLesson(){
  paused=false;
  setStatus("RUNNING");
  const b = $("btnLesson");
  if(b) b.textContent = "Mola Ver";
  if(pendingRepeat) listenStudent();
  else teacherNext("Continue.");
}
function stopLesson(){
  running=false;
  paused=false;
  stopAudio(); stopSTT();
  setStatus("READY");
  const b = $("btnLesson");
  if(b) b.textContent = "Dersi Başlat";
}

function formatTimeLeft(){
  const ms = Math.max(0, endAt - Date.now());
  const s = Math.floor(ms/1000);
  const mm = Math.floor(s/60);
  const ss = String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}

function tickTime(){
  if(!running || paused) return;
  if(Date.now() >= endAt) endAt = Date.now();
  $("lessonInfo").textContent = `Ders: ${level} • Kalan: ${formatTimeLeft()}`;
  requestAnimationFrame(tickTime);
}

async function startLesson(){
  if(running) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    alert("Bu cihaz konuşmayı yazıya çevirmiyor (SpeechRecognition yok).");
    return;
  }

  running=true;
  paused=false;
  endAt = Date.now() + mins*60*1000;
  setStatus("RUNNING");
  const b = $("btnLesson");
  if(b) b.textContent = "Mola Ver";
  resetRepeat();

  // teacher greets
  const studentName = (u?.name || u?.fullname || "Student").split(" ")[0].trim() || "Student";

  addBubble("teacher", `Hello ${studentName}.`, { speakable:true });
  const tr1 = await translateToTR(`Hello ${studentName}.`, teacher.lang);
  if(tr1) addBubble("tr", `(${tr1})`);

  await speakTTS(`Hello ${studentName}.`, teacher.voice, async ()=>{
    await teacherNext("Start the lesson. Begin with a short warm-up and then a sound/letter topic.");
    tickTime();
  });
}

async function teacherNext(userText){
  if(!running || paused) return;

  setStatus("THINKING");
  history.push({ role:"user", content: userText });
  if(history.length>12) history = history.slice(-12);

  let reply="";
  try{ reply = await apiTeacherText(userText, teacher, level, (u?.name||"Student").split(" ")[0], history); }catch{}

  const { teach, repeat } = parseTeachRepeat(reply);
  const teachText = (teach||"").trim();
  const repeatText = (repeat||"").trim();

  history.push({ role:"assistant", content: reply||"" });
  if(history.length>12) history = history.slice(-12);

  if(teachText){
    addBubble("teacher", teachText, { speakable:true });
    const tr = await translateToTR(teachText, teacher.lang);
    if(tr) addBubble("tr", `(${tr})`);
    await speakTTS(teachText, teacher.voice, ()=>{});
  }

  if(repeatText){
    pendingRepeat = repeatText;
    triesLeft = MAX_TRIES;
    setBadges();

    addBubble("teacher", `Repeat: ${repeatText}`, { speakable:true });
    const tr = await translateToTR(`Repeat: ${repeatText}`, teacher.lang);
    if(tr) addBubble("tr", `(${tr})`);

    await speakTTS(`Repeat: ${repeatText}`, teacher.voice, ()=>{ listenStudent(); });
    return;
  }

  listenStudent();
}

function listenStudent(){
  if(!running || paused) return;
  setStatus("LISTENING");

  stopSTT();
  const rec = buildRecognizer(teacher.stt);
  if(!rec){
    alert("SpeechRecognition yok.");
    stopLesson();
    return;
  }
  recognition = rec;

  rec.onresult = async (e)=>{
    const said = String(e.results?.[0]?.[0]?.transcript || "").trim();
    if(!said) return;

    addBubble("student", said);

    if(pendingRepeat){
      const score = tokenSimilarity(said, pendingRepeat);
      if(score >= TARGET_SIM){
        addBubble("teacher", `Good. (${Math.round(score*100)}%)`, { speakable:true });
        const tr = await translateToTR(`Good.`, teacher.lang);
        if(tr) addBubble("tr", `(${tr})`);

        await speakTTS("Good.", teacher.voice, async ()=>{
          resetRepeat();
          if(Date.now() >= endAt) await endLessonProperly();
          else await teacherNext("Continue.");
        });
      } else {
        triesLeft -= 1;
        setBadges();

        addBubble("teacher", `Not yet. Listen carefully. (tries left: ${triesLeft})`, { speakable:true });
        const tr = await translateToTR(`Not yet. Listen carefully.`, teacher.lang);
        if(tr) addBubble("tr", `(${tr})`);

        await speakTTS(`Not yet. Listen carefully.`, teacher.voice, async ()=>{
          if(triesLeft <= 0){
            addBubble("teacher", `Okay. We move on.`, { speakable:true });
            const trm = await translateToTR(`Okay. We move on.`, teacher.lang);
            if(trm) addBubble("tr", `(${trm})`);

            await speakTTS(`Okay. We move on.`, teacher.voice, async ()=>{
              resetRepeat();
              if(Date.now() >= endAt) await endLessonProperly();
              else await teacherNext("Continue.");
            });
          } else {
            addBubble("teacher", `Repeat: ${pendingRepeat}`, { speakable:true });
            const tr2 = await translateToTR(`Repeat: ${pendingRepeat}`, teacher.lang);
            if(tr2) addBubble("tr", `(${tr2})`);

            await speakTTS(`Repeat: ${pendingRepeat}`, teacher.voice, ()=>{ listenStudent(); });
          }
        });
      }
      return;
    }

    await teacherNext(said);
  };

  rec.onerror = ()=>{};
  rec.onend = ()=>{};
  try{ rec.start(); }catch{}
}

async function endLessonProperly(){
  if(!running) return;
  setStatus("ENDING");

  const studentName = (u?.name || u?.fullname || "Student").split(" ")[0].trim() || "Student";
  const bye = `Good job today, ${studentName}. See you tomorrow.`;
  addBubble("teacher", bye, { speakable:true });
  const tr = await translateToTR(bye, teacher.lang);
  if(tr) addBubble("tr", `(${tr})`);

  await speakTTS(bye, teacher.voice, ()=>{
    playBell();
    stopLesson();
    setStatus("DONE");
  });
}

// boot
document.addEventListener("DOMContentLoaded", ()=>{
  try{
    u = ensureLogged();
    if(!u) return;

    teacher = getTeacher();
    mins = getMins();
    level = getLevel();

    setHeader();
    setBadges();
    setStatus("READY");

    $("backBtn")?.addEventListener("click", ()=>location.href="/pages/home.html");
    $("logoHome")?.addEventListener("click", ()=>location.href="/pages/home.html");

    const btn = $("btnLesson");
    if(!btn){
      console.error("btnLesson bulunamadı!");
      return;
    }

    // ✅ asıl kritik: tıklama kesin çalışsın
    btn.addEventListener("click", async ()=>{
      if(!running){
        await startLesson();
        return;
      }
      if(paused) resumeLesson();
      else pauseLesson();
    });

    // initial info
    addBubble("teacher", `Lesson ready. Press “Dersi Başlat”.`, { speakable:true });

  }catch(e){
    console.error("teacher_course.page.js boot error:", e);
  }
});
