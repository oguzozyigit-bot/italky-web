// FILE: /js/photo_page.js  (FINAL — OCR quality + OpenAI TTS read)
import { STORAGE_KEY } from "/js/config.js";
import { apiPOST } from "/js/api.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{ return JSON.parse(s||""); }catch{ return fb; } }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=> t.classList.remove("show"), 1800);
}

function setStatus(msg){ const el=$("statusChip"); if(el) el.textContent = msg; }

/* ===== Guard ===== */
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

function paintHeader(u){
  const full = (u.fullname || u.name || u.display_name || u.email || "—").trim();
  $("userName").textContent = full;
  $("userPlan").textContent = String(u.plan || "FREE").toUpperCase();

  const avatarBtn = $("avatarBtn");
  const fallback = $("avatarFallback");
  const pic = String(u.picture || u.avatar || u.avatar_url || "").trim();
  if(pic){
    avatarBtn.innerHTML = `<img src="${pic}" alt="avatar" referrerpolicy="no-referrer">`;
  }else{
    fallback.textContent = (full && full[0]) ? full[0].toUpperCase() : "•";
  }
  avatarBtn.addEventListener("click", ()=> location.href="/pages/profile.html");
}

/* ===== Voice selection (same as voice module) ===== */
const VOICE_PREF_KEY = "italky_voice_pref";
const VOICE_MAP = {
  dora: "nova",
  ayda: "shimmer",
  umay: "alloy",
  sencer: "echo",
  toygar: "fable",
  sungur: "onyx",
};
function getSelectedOpenAIVoice(){
  const id = String(localStorage.getItem(VOICE_PREF_KEY) || "dora").trim();
  return VOICE_MAP[id] || "nova";
}

/* ===== Languages ===== */
const LANGS = [
  { code:"tr", name:"Türkçe", flag:"🇹🇷" },
  { code:"en", name:"İngilizce", flag:"🇬🇧" },
  { code:"de", name:"Almanca", flag:"🇩🇪" },
  { code:"fr", name:"Fransızca", flag:"🇫🇷" },
  { code:"it", name:"İtalyanca", flag:"🇮🇹" },
  { code:"es", name:"İspanyolca", flag:"🇪🇸" },
  { code:"pt", name:"Portekizce", flag:"🇵🇹" },
  { code:"pt-br", name:"Portekizce (Brezilya)", flag:"🇧🇷" },
  { code:"ru", name:"Rusça", flag:"🇷🇺" },
  { code:"ar", name:"Arapça", flag:"🇸🇦" },
  { code:"zh", name:"Çince", flag:"🇨🇳" },
  { code:"zh-tw", name:"Çince (Geleneksel)", flag:"🇹🇼" },
  { code:"ja", name:"Japonca", flag:"🇯🇵" },
  { code:"ko", name:"Korece", flag:"🇰🇷" },
];
function langBy(code){ return LANGS.find(x=>x.code===code) || { code, name: code, flag:"🌐" }; }

const SS_TO = "italky_photo_to_lang_v3";
let toLang = sessionStorage.getItem(SS_TO) || "tr";
function setToUI(){
  $("toFlag").textContent = langBy(toLang).flag;
  $("toLangTxt").textContent = langBy(toLang).name;
  sessionStorage.setItem(SS_TO, toLang);
}

function openSheet(){
  $("langSheet").classList.add("show");
  $("sheetQuery").value = "";
  renderSheet("");
  setTimeout(()=>{ try{ $("sheetQuery").focus(); }catch{} }, 0);
}
function closeSheet(){ $("langSheet").classList.remove("show"); }
function renderSheet(filter){
  const q = String(filter||"").toLowerCase().trim();
  const list = $("sheetList");
  if(!list) return;

  const items = LANGS.filter(l=>{
    if(!q) return true;
    const hay = `${l.name} ${l.code}`.toLowerCase();
    return hay.includes(q);
  });

  list.innerHTML = items.map(l=>{
    const sel = (l.code===toLang) ? "selected" : "";
    return `
      <div class="sheetRow ${sel}" data-code="${l.code}">
        <div class="left">
          <div class="code" style="min-width:28px; text-align:center;">${l.flag}</div>
          <div class="name">${l.name}</div>
        </div>
        <div class="code">${l.code.toUpperCase()}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".sheetRow").forEach(row=>{
    row.addEventListener("click", ()=>{
      toLang = row.getAttribute("data-code") || "tr";
      setToUI();
      closeSheet();
      toast("Dil seçildi");
    });
  });
}

/* ===== Secure context ===== */
function isSecureContextOk(){
  return (location.protocol === "https:" || location.hostname === "localhost");
}

/* ===== Camera ===== */
let stream = null;
async function startCamera(){
  const v = $("cam");

  if(!isSecureContextOk()){
    setStatus("❌ HTTPS gerekli (kamera açılmaz)");
    toast("HTTPS olmadan kamera açılmaz");
    enableUploadFallback();
    return;
  }

  if(!navigator.mediaDevices?.getUserMedia){
    setStatus("❌ Kamera API yok");
    enableUploadFallback();
    return;
  }

  const tries = [
    { video: { facingMode: { ideal: "environment" } }, audio:false },
    { video: { facingMode: "environment" }, audio:false },
    { video: true, audio:false },
  ];

  for(const constraints of tries){
    try{
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      v.srcObject = stream;
      v.muted = true;
      v.setAttribute("playsinline","true");
      await v.play();
      setStatus("✅ Kamera hazır • Yazıya dokun");
      return;
    }catch(e){
      console.error("getUserMedia fail:", constraints, e);
    }
  }

  setStatus("❌ Kamera açılamadı (izin/cihaz)");
  toast("Kamera izni verildi mi?");
  enableUploadFallback();
}

/* ===== Canvas ===== */
function fitCanvasToVideo(){
  const v = $("cam");
  const c = $("overlay");
  const rect = v.getBoundingClientRect();
  c.width = Math.floor(rect.width * devicePixelRatio);
  c.height = Math.floor(rect.height * devicePixelRatio);
}
function drawClear(){
  const c = $("overlay");
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);
}

/* ===== Capture ===== */
function captureFromVideo(){
  const v = $("cam");
  if(!v || v.videoWidth === 0) return null;
  const tmp = document.createElement("canvas");
  tmp.width = v.videoWidth;
  tmp.height = v.videoHeight;
  tmp.getContext("2d").drawImage(v, 0, 0, tmp.width, tmp.height);
  return tmp;
}
function stageToFrameXY(clientX, clientY, frameW, frameH){
  const v = $("cam");
  const rect = v.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const sx = frameW / rect.width;
  const sy = frameH / rect.height;
  return { fx: x * sx, fy: y * sy };
}
function cropROI(frameCanvas, fx, fy){
  const roiW = Math.floor(Math.min(520, frameCanvas.width * 0.60));
  const roiH = Math.floor(Math.min(260, frameCanvas.height * 0.25));

  let x0 = Math.floor(fx - roiW/2);
  let y0 = Math.floor(fy - roiH/2);
  x0 = Math.max(0, Math.min(frameCanvas.width - roiW, x0));
  y0 = Math.max(0, Math.min(frameCanvas.height - roiH, y0));

  const roi = document.createElement("canvas");
  roi.width = roiW;
  roi.height = roiH;
  roi.getContext("2d").drawImage(frameCanvas, x0, y0, roiW, roiH, 0, 0, roiW, roiH);

  return { roi, x0, y0, roiW, roiH };
}

/* ===== OCR (worker once) + preprocess ===== */
let OCR_READY = false;
let OCR_WORKER = null;

function preprocessCanvas(srcCanvas){
  // grayscale + contrast boost
  const c = document.createElement("canvas");
  c.width = srcCanvas.width;
  c.height = srcCanvas.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(srcCanvas, 0, 0);

  const img = ctx.getImageData(0,0,c.width,c.height);
  const d = img.data;

  const contrast = 1.35; // 1.0 normal
  const intercept = 128 * (1 - contrast);

  for(let i=0;i<d.length;i+=4){
    const r=d[i], g=d[i+1], b=d[i+2];
    // luminance
    let y = 0.299*r + 0.587*g + 0.114*b;
    // contrast
    y = y * contrast + intercept;
    y = Math.max(0, Math.min(255, y));
    d[i]=d[i+1]=d[i+2]=y;
    d[i+3]=255;
  }

  ctx.putImageData(img,0,0);
  return c;
}

async function initOCR(){
  if(OCR_READY) return;
  if(!window.Tesseract) throw new Error("Tesseract yok");
  setStatus("🧠 OCR hazırlanıyor…");
  OCR_WORKER = await window.Tesseract.createWorker("eng+tur", 1, { logger: ()=>{} });
  try{
    await OCR_WORKER.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
  }catch{}
  OCR_READY = true;
  setStatus("✅ Kamera hazır • Yazıya dokun");
}

async function ocrCanvas(canvas){
  await initOCR();
  const prep = preprocessCanvas(canvas);
  const { data } = await OCR_WORKER.recognize(prep);
  return String(data?.text || "").trim();
}

/* ===== Translate ===== */
const cache = new Map();
async function translateViaApi(text, target){
  const clean = String(text||"").replace(/\s+/g," ").trim();
  if(!clean) return "";
  const key = `${clean}__${target}`;
  if(cache.has(key)) return cache.get(key);

  const data = await apiPOST("/api/translate", {
    text: clean, source:"", target, from_lang:"", to_lang: target
  }, { timeoutMs: 25000 });

  const out = String(data?.translated || data?.translation || data?.text || data?.translated_text || "").trim() || clean;
  cache.set(key, out);
  return out;
}

/* ===== Draw overlay text ===== */
function drawOverlayTextBox(x0, y0, w, h, text){
  const c = $("overlay");
  const ctx = c.getContext("2d");
  const v = $("cam");
  const rect = v.getBoundingClientRect();

  const frameW = v.videoWidth || 1;
  const frameH = v.videoHeight || 1;

  const sx = rect.width / frameW;
  const sy = rect.height / frameH;

  const px0 = Math.round((x0 * sx) * devicePixelRatio);
  const py0 = Math.round((y0 * sy) * devicePixelRatio);
  const pw  = Math.round((w  * sx) * devicePixelRatio);
  const ph  = Math.round((h  * sy) * devicePixelRatio);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.strokeStyle = "rgba(165,180,252,0.70)";
  ctx.lineWidth = Math.max(2, Math.round(2 * devicePixelRatio));
  ctx.fillRect(px0, py0, pw, ph);
  ctx.strokeRect(px0, py0, pw, ph);

  const fontSize = Math.max(12, Math.min(22, Math.floor((ph / 2.3) / devicePixelRatio)));
  ctx.font = `900 ${Math.round(fontSize * devicePixelRatio)}px Outfit, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textBaseline = "middle";

  const tx = px0 + Math.round(10 * devicePixelRatio);
  const ty = py0 + Math.round(ph / 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(px0, py0, pw, ph);
  ctx.clip();
  ctx.fillText(text, tx, ty);
  ctx.restore();
}

/* ===== OpenAI TTS Read ===== */
let currentAudio = null;
function stopAudio(){
  if(currentAudio){ try{ currentAudio.pause(); }catch{} currentAudio=null; }
}
async function speakText(text){
  const t = String(text||"").trim();
  if(!t) return toast("Okunacak metin yok");

  stopAudio();
  setStatus("🔊 Okutuluyor…");

  try{
    const voice = getSelectedOpenAIVoice();
    const data = await apiPOST("/api/tts_openai", { text: t, voice, speed: 1.1 }, { timeoutMs: 45000 });
    const b64 = String(data?.audio_base64 || "");
    if(!b64){ setStatus("⚠️ Ses yok"); return; }

    const audio = new Audio("data:audio/mp3;base64," + b64);
    currentAudio = audio;
    audio.onended = ()=>{ currentAudio=null; setStatus("✅ Kamera hazır • Yazıya dokun"); };
    await audio.play();
  }catch(e){
    console.error(e);
    setStatus("⚠️ Ses hata");
    toast("Ses hatası");
  }
}

/* ===== State: last translation ===== */
let lastTranslatedText = "";

/* ===== Interaction ===== */
let busy = false;
let holding = false;
let lastRun = 0;

async function translateAt(clientX, clientY){
  if(busy) return;
  const v = $("cam");
  if(!v || v.videoWidth === 0){
    toast("Kamera hazır değil");
    return;
  }

  busy = true;
  setStatus("🧠 Okunuyor…");

  try{
    const frame = captureFromVideo();
    if(!frame) throw new Error("frame yok");

    const { fx, fy } = stageToFrameXY(clientX, clientY, frame.width, frame.height);
    const { roi, x0, y0, roiW, roiH } = cropROI(frame, fx, fy);

    const raw = await ocrCanvas(roi);
    const clean = raw.replace(/\s+/g, " ").trim();
    if(!clean){
      setStatus("⚠️ Yazı yok • Yaklaştır");
      return;
    }

    const out = await translateViaApi(clean, toLang);
    lastTranslatedText = out;

    drawOverlayTextBox(x0, y0, roiW, roiH, out);
    setStatus("✅ Basıldı • SAY ile okut");
  }catch(e){
    console.error(e);
    setStatus("⚠️ OCR/Çeviri hata");
    toast("OCR/Çeviri hata");
  }finally{
    busy = false;
  }
}

function onPointerDown(e){ holding = true; lastRun = 0; translateAt(e.clientX, e.clientY); }
function onPointerMove(e){
  if(!holding) return;
  const now = Date.now();
  if(now - lastRun < 700) return;
  lastRun = now;
  translateAt(e.clientX, e.clientY);
}
function onPointerUp(){ holding = false; }

/* ===== Full scan ===== */
async function doFullScan(){
  if(busy) return;
  const v = $("cam");
  if(!v || v.videoWidth === 0) return toast("Kamera hazır değil");

  busy = true;
  setStatus("🧠 SCAN…");

  try{
    const frame = captureFromVideo();
    if(!frame) throw new Error("frame yok");

    const raw = await ocrCanvas(frame);
    const txt = raw.replace(/\s+/g," ").trim();
    if(!txt){ setStatus("⚠️ Yazı bulunamadı"); return; }

    const out = await translateViaApi(txt, toLang);
    lastTranslatedText = out;

    drawClear();
    drawOverlayTextBox(
      Math.floor(frame.width*0.05),
      Math.floor(frame.height*0.05),
      Math.floor(frame.width*0.90),
      Math.floor(frame.height*0.20),
      out
    );
    setStatus("✅ SCAN basıldı • SAY ile okut");
  }catch(e){
    console.error(e);
    setStatus("❌ SCAN hata");
    toast("SCAN hata");
  }finally{
    busy = false;
  }
}

/* ===== Upload fallback ===== */
function enableUploadFallback(){
  const stage = $("stage");
  if(!stage) return;
  if(document.getElementById("photoFile")) return;

  const input = document.createElement("input");
  input.type = "file";
  input.id = "photoFile";
  input.accept = "image/*";
  input.capture = "environment";
  input.style.display = "none";
  document.body.appendChild(input);

  const hint = document.querySelector(".hint");
  if(hint){
    hint.innerHTML = `Kamera açılmadı. <b>Dokun</b> → fotoğraf seç → SCAN. (SAY: okut)`;
  }

  stage.addEventListener("click", ()=> input.click(), { passive:true });

  input.addEventListener("change", async ()=>{
    const file = input.files?.[0];
    if(!file) return;

    setStatus("🧠 Fotoğraf yükleniyor…");

    const img = new Image();
    img.onload = async ()=>{
      try{
        await initOCR();
        setStatus("🧠 SCAN…");

        const tmp = document.createElement("canvas");
        tmp.width = img.width;
        tmp.height = img.height;
        tmp.getContext("2d").drawImage(img,0,0);

        const raw = await ocrCanvas(tmp);
        const txt = raw.replace(/\s+/g," ").trim();
        if(!txt){ setStatus("⚠️ Yazı bulunamadı"); return; }

        const out = await translateViaApi(txt, toLang);
        lastTranslatedText = out;

        drawClear();
        // show as top box using overlay canvas space
        const c = $("overlay");
        const ctx = c.getContext("2d");
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.strokeStyle = "rgba(165,180,252,0.70)";
        ctx.lineWidth = Math.max(2, Math.round(2 * devicePixelRatio));
        ctx.fillRect(Math.round(12*devicePixelRatio), Math.round(12*devicePixelRatio), Math.round((c.width-24*devicePixelRatio)), Math.round(140*devicePixelRatio));
        ctx.strokeRect(Math.round(12*devicePixelRatio), Math.round(12*devicePixelRatio), Math.round((c.width-24*devicePixelRatio)), Math.round(140*devicePixelRatio));
        ctx.font = `900 ${Math.round(16*devicePixelRatio)}px Outfit, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.textBaseline = "top";
        ctx.fillText(out.slice(0,180), Math.round(22*devicePixelRatio), Math.round(22*devicePixelRatio));

        setStatus("✅ SCAN basıldı • SAY ile okut");
      }catch(e){
        console.error(e);
        setStatus("❌ OCR hata");
      }
    };
    img.onerror = ()=> setStatus("❌ Görsel açılamadı");
    img.src = URL.createObjectURL(file);
  });
}

/* ===== Boot ===== */
document.addEventListener("DOMContentLoaded", async ()=>{
  const u = ensureLogged();
  if(!u) return;

  paintHeader(u);

  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/home.html";
  });
  $("logoHome")?.addEventListener("click", ()=> location.href="/pages/home.html");

  setToUI();

  $("toLangBtn")?.addEventListener("click", openSheet);
  $("sheetClose")?.addEventListener("click", closeSheet);
  $("langSheet")?.addEventListener("click", (ev)=>{ if(ev.target === $("langSheet")) closeSheet(); });
  $("sheetQuery")?.addEventListener("input", ()=> renderSheet($("sheetQuery").value));

  $("scanBtn")?.addEventListener("click", doFullScan);
  $("clearBtn")?.addEventListener("click", ()=>{
    cache.clear();
    lastTranslatedText = "";
    stopAudio();
    drawClear();
    setStatus("🧽 Temizlendi • Yazıya dokun");
  });

  $("speakBtn")?.addEventListener("click", ()=> speakText(lastTranslatedText));

  const stage = $("stage");
  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);

  await startCamera();

  const ro = new ResizeObserver(()=>{ fitCanvasToVideo(); drawClear(); });
  ro.observe($("cam"));
  window.addEventListener("resize", ()=>{ fitCanvasToVideo(); drawClear(); }, { passive:true });

  fitCanvasToVideo();
  drawClear();
});
