// FILE: /js/italky_chat_page.js
import { STORAGE_KEY } from "/js/config.js";
import { apiPOST } from "/js/api.js";
import { getSiteLang } from "/js/i18n.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{ return JSON.parse(s||""); }catch{ return fb; } }

/* ===============================
   Guard (home/profile standard)
   =============================== */
function termsKey(email=""){
  return `italky_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}
function getUser(){
  return safeJson(localStorage.getItem(STORAGE_KEY), {});
}
function ensureLogged(){
  const u = getUser();
  if(!u || !u.email){ location.replace("/index.html"); return null; }
  if(!localStorage.getItem(termsKey(u.email))){ location.replace("/index.html"); return null; }
  return u;
}

/* ===============================
   Plan
   =============================== */
function isPro(u){
  const p = String(u?.plan || "").toUpperCase().trim();
  return p === "PRO" || p === "PREMIUM" || p === "PLUS";
}

/* ===============================
   Keys + storage
   =============================== */
function uidKey(u){
  return String(u.user_id || u.id || u.email || "guest").toLowerCase().trim();
}
function histKey(u){ return `italky_chat_hist::${uidKey(u)}`; }
function memKey(u){ return `italky_chat_memory::${uidKey(u)}`; } // kalıcı hafıza

function loadHist(u){ return safeJson(localStorage.getItem(histKey(u)), []); }
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

// basit yakalama: "adım X", "ismim X", "...deyim"
function maybeCaptureMemory(mem, text){
  const t = String(text||"").trim();

  const m1 = t.match(/\b(ad[ıi]m|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü\-']{2,})\b/i);
  if(m1 && !mem.name) mem.name = m1[2];

  const m2 = t.match(/\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)[’']?deyim\b/i);
  if(m2 && !mem.city) mem.city = m2[1];

  return mem;
}

/* ===============================
   Daily Free 60s (per user/day)
   - only for FREE plans
   =============================== */
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

function usageKey(u){
  return `italky_chat_free_used_sec::${uidKey(u)}::${isoDateLocal()}`;
}
function getUsed(u){
  if(isPro(u)) return 0;
  const v = Number(localStorage.getItem(usageKey(u)) || "0");
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}
function setUsed(u, sec){
  if(isPro(u)) return;
  localStorage.setItem(usageKey(u), String(Math.max(0, Math.floor(sec))));
}
function addUsed(u, add){
  if(isPro(u)) return getUsed(u);
  const cur = getUsed(u);
  const next = cur + Math.max(0, Math.floor(add));
  setUsed(u, next);
  return next;
}
function remaining(u){
  if(isPro(u)) return 9999;
  return Math.max(0, FREE_SECONDS_PER_DAY - getUsed(u));
}
function canUse(u){
  if(isPro(u)) return true;
  return remaining(u) > 0;
}

/* ===============================
   UI language
   =============================== */
const UI_LANG = (()=>{ try{ return (getSiteLang()||"tr").toLowerCase(); }catch{ return "tr"; } })();

/* ===============================
   Toast
   =============================== */
let toastEl = null;
function toast(msg){
  if(!toastEl){
    toastEl = document.createElement("div");
    toastEl.id = "__it_toast";
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
  toastEl.textContent = msg;
  toastEl.style.transform="translateX(-50%) translateY(0)";
  clearTimeout(window.__it_to);
  window.__it_to = setTimeout(()=> toastEl.style.transform="translateX(-50%) translateY(-120px)", 1800);
}

/* ===============================
   UI helpers
   =============================== */
function setInputEnabled(on){
  const input = $("msgInput"), send = $("sendBtn"), mic = $("micBtn");
  if(input) input.disabled = !on;
  if(send) send.disabled = !on;
  if(mic) mic.disabled = !on;
}

function autoGrow(){
  const ta = $("msgInput");
  if(!ta) return;
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
}

let follow = true;
function isNearBottom(el, slack=160){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch{ return true; }
}
function scrollBottom(force=false){
  const el = $("chat");
  if(!el) return;
  requestAnimationFrame(()=>{ if(force || follow) el.scrollTop = el.scrollHeight; });
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

/* ===============================
   Paywall overlay (no web payment)
   =============================== */
let paywallEl = null;

function showPaywall(u){
  if(isPro(u)) return;        // ✅ PRO: never show
  if(paywallEl) return;

  setInputEnabled(false);

  addBubble("meta", UI_LANG==="tr"
    ? "Günlük ücretsiz süre bitti. Abonelik uygulama içinden yapılır."
    : "Daily free time is over. Subscribe in the app."
  );

  paywallEl = document.createElement("div");
  paywallEl.style.position="fixed";
  paywallEl.style.inset="0";
  paywallEl.style.zIndex="99998";
  paywallEl.style.background="rgba(0,0,0,.72)";
  paywallEl.style.display="flex";
  paywallEl.style.alignItems="center";
  paywallEl.style.justifyContent="center";
  paywallEl.style.padding="18px";

  const card = document.createElement("div");
  card.style.width="min(420px, calc(100vw - 36px))";
  card.style.borderRadius="26px";
  card.style.border="1px solid rgba(255,255,255,.14)";
  card.style.background="rgba(8,8,20,.86)";
  card.style.backdropFilter="blur(18px)";
  card.style.boxShadow="0 40px 120px rgba(0,0,0,.75)";
  card.style.padding="16px";

  const title = document.createElement("div");
  title.style.fontWeight="1000";
  title.style.fontSize="16px";
  title.style.marginBottom="8px";
  title.textContent = UI_LANG==="tr" ? "Günlük ücretsiz süre bitti" : "Daily free time is over";

  const body = document.createElement("div");
  body.style.fontWeight="800";
  body.style.fontSize="12px";
  body.style.color="rgba(255,255,255,.75)";
  body.style.lineHeight="1.45";
  body.textContent = UI_LANG==="tr"
    ? "Bugünlük 60 saniyelik ücretsiz kullanım hakkın doldu. Ödeme sadece uygulama içinden (Play Store / yakında App Store)."
    : "Your 60 seconds quota is used up. Payments are only inside the app (Play Store / soon App Store).";

  const meter = document.createElement("div");
  meter.style.marginTop="12px";
  meter.style.padding="10px 12px";
  meter.style.borderRadius="16px";
  meter.style.border="1px solid rgba(255,255,255,.10)";
  meter.style.background="rgba(255,255,255,.05)";
  meter.style.fontWeight="900";
  meter.style.fontSize="12px";
  meter.textContent = UI_LANG==="tr"
    ? `Bugünkü kalan: ${remaining(u)}s`
    : `Remaining today: ${remaining(u)}s`;

  const row = document.createElement("div");
  row.style.display="flex";
  row.style.gap="10px";
  row.style.marginTop="14px";

  const btnSub = document.createElement("button");
  btnSub.type="button";
  btnSub.textContent = UI_LANG==="tr" ? "Uygulamadan Abone Ol" : "Subscribe in the App";
  btnSub.style.flex="1";
  btnSub.style.height="44px";
  btnSub.style.borderRadius="16px";
  btnSub.style.border="none";
  btnSub.style.cursor="pointer";
  btnSub.style.fontWeight="1000";
  btnSub.style.color="#fff";
  btnSub.style.background="linear-gradient(135deg, #A5B4FC, #4F46E5)";
  btnSub.addEventListener("click", ()=>{
    // İleride:
    // location.href = "italky://subscribe";
    toast(UI_LANG==="tr" ? "Abonelik uygulama içinden yapılır." : "Subscribe inside the app.");
  });

  const btnClose = document.createElement("button");
  btnClose.type="button";
  btnClose.textContent = UI_LANG==="tr" ? "Kapat" : "Close";
  btnClose.style.flex="1";
  btnClose.style.height="44px";
  btnClose.style.borderRadius="16px";
  btnClose.style.border="1px solid rgba(255,255,255,.14)";
  btnClose.style.cursor="pointer";
  btnClose.style.fontWeight="1000";
  btnClose.style.color="#fff";
  btnClose.style.background="rgba(255,255,255,.06)";
  btnClose.addEventListener("click", ()=>{
    paywallEl?.remove?.();
    paywallEl = null;
    toast(UI_LANG==="tr" ? "Ücretsiz süre bitti." : "Free time over.");
  });

  row.appendChild(btnSub);
  row.appendChild(btnClose);

  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(meter);
  card.appendChild(row);

  paywallEl.appendChild(card);
  paywallEl.addEventListener("click", (e)=>{ if(e.target === paywallEl) btnClose.click(); });

  document.body.appendChild(paywallEl);
}

/* ===============================
   Backend call (chat.py ile birebir)
   =============================== */
async function apiChat(text, history){
  const data = await apiPOST("/api/chat", {
    text,
    persona_name: "italkyAI",
    history: (history || []).slice(-6),
    max_tokens: 200
  }, { timeoutMs: 45000 });

  return String(data?.text || "").trim() || "…";
}

/* ===============================
   STT (counts usage for FREE)
   =============================== */
let sttBusy = false;
let sttStartTs = 0;

function startSTT(u, onFinal){
  if(!canUse(u)){ showPaywall(u); return; }

  if(location.protocol !== "https:" && location.hostname !== "localhost"){
    toast(UI_LANG==="tr" ? "Mikrofon için HTTPS gerekli." : "HTTPS required for mic.");
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ toast(UI_LANG==="tr" ? "Bu cihaz konuşmayı yazıya çevirmiyor." : "STT not supported."); return; }
  if(sttBusy) return;

  const micBtn = $("micBtn");
  const rec = new SR();
  rec.lang = "tr-TR";
  rec.interimResults = false;
  rec.continuous = false;

  sttBusy = true;
  sttStartTs = Date.now();
  micBtn.classList.add("listening");

  rec.onresult = (e)=>{
    const t = e.results?.[0]?.[0]?.transcript || "";
    const finalText = String(t||"").trim();
    if(finalText) onFinal?.(finalText);
  };

  rec.onend = ()=>{
    micBtn.classList.remove("listening");
    sttBusy = false;

    if(!isPro(u)){
      const elapsed = (Date.now() - sttStartTs) / 1000;
      addUsed(u, elapsed);
    }

    addBubble("meta", isPro(u)
      ? (UI_LANG==="tr" ? "PRO üyelik: sınırsız kullanım" : "PRO: unlimited")
      : (UI_LANG==="tr" ? `Bugünkü ücretsiz kalan: ${remaining(u)}s` : `Remaining today: ${remaining(u)}s`)
    );

    if(!canUse(u)) showPaywall(u);
  };

  try{ rec.start(); }
  catch{
    micBtn.classList.remove("listening");
    sttBusy = false;
    toast(UI_LANG==="tr" ? "Mikrofon açılamadı." : "Mic failed.");
  }
}

/* ===============================
   MAIN
   =============================== */
async function main(){
  const u = ensureLogged();
  if(!u) return;

  // header
  const full = (u.fullname || u.name || u.display_name || u.email || "—").trim();
  $("userName").textContent = full;
  $("userPlan").textContent = String(u.plan || "FREE").toUpperCase();

  const avatarBtn = $("avatarBtn");
  const fallback = $("avatarFallback");
  const pic = String(u.picture || u.avatar || u.avatar_url || "").trim();
  if(pic) avatarBtn.innerHTML = `<img src="${pic}" alt="avatar" referrerpolicy="no-referrer">`;
  else fallback.textContent = (full && full[0]) ? full[0].toUpperCase() : "•";

  avatarBtn.addEventListener("click", ()=> location.href="/pages/profile.html");
  $("logoHome").addEventListener("click", ()=> location.href="/pages/home.html");
  $("backBtn").addEventListener("click", ()=> location.href="/pages/home.html");

  // scroll follow
  const chat = $("chat");
  chat.addEventListener("scroll", ()=>{ follow = isNearBottom(chat); }, { passive:true });

  // history load
  const hist = loadHist(u);
  chat.innerHTML = "";
  if(!hist.length){
    addBubble("meta", UI_LANG==="tr"
      ? "italkyAI yazılı bilgi alanıdır. Mikrofon konuşmanı yazıya çevirir ve otomatik gönderir."
      : "italkyAI is a text chat. Mic converts speech to text and auto-sends."
    );
  }else{
    hist.forEach(m=> addBubble(m.role, m.text));
  }

  addBubble("meta", isPro(u)
    ? (UI_LANG==="tr" ? "PRO üyelik: sınırsız kullanım" : "PRO: unlimited")
    : (UI_LANG==="tr" ? `Bugünkü ücretsiz kalan: ${remaining(u)}s` : `Remaining today: ${remaining(u)}s`)
  );

  follow = true;
  scrollBottom(true);

  // clear chat UI only
  $("clearChat").addEventListener("click", ()=>{
    chat.innerHTML = "";
    addBubble("meta", UI_LANG==="tr" ? "Sohbet temizlendi. Seni hatırlıyorum." : "Chat cleared. I still remember you.");
    saveHist(u, []);
    addBubble("meta", isPro(u)
      ? (UI_LANG==="tr" ? "PRO üyelik: sınırsız kullanım" : "PRO: unlimited")
      : (UI_LANG==="tr" ? `Bugünkü ücretsiz kalan: ${remaining(u)}s` : `Remaining today: ${remaining(u)}s`)
    );
    scrollBottom(true);
  });

  async function send(textOverride=null){
    if(!canUse(u)){ showPaywall(u); return; }

    const ta = $("msgInput");
    const text = String(textOverride ?? ta.value ?? "").trim();
    if(!text) return;

    ta.value = "";
    autoGrow();

    // memory
    const mem = maybeCaptureMemory(loadMem(u), text);
    saveMem(u, mem);

    const h = loadHist(u);

    addBubble("user", text);
    h.push({ role:"user", text });

    const loader = typingBubble();

    // memory primer
    const memLines = [];
    if(mem.name) memLines.push(`Kullanıcının adı: ${mem.name}`);
    if(mem.city) memLines.push(`Kullanıcının şehri: ${mem.city}`);
    const memBlock = memLines.length
      ? `KALICI HAFIZA:\n${memLines.join("\n")}\n\nKural: Kullanıcı seni/yaratıcını sorarsa: "Ben italkyAI tarafından geliştirilen bir dil yazılımıyım." de.`
      : `Kural: Kullanıcı seni/yaratıcını sorarsa: "Ben italkyAI tarafından geliştirilen bir dil yazılımıyım." de.`;

    // chat.py expects role/content dicts
    const apiHistory = [
      { role:"assistant", content: memBlock },
      ...h.slice(-18).map(x=>({ role: x.role==="assistant" ? "assistant" : "user", content: x.text }))
    ];

    const started = Date.now();

    try{
      const out = await apiChat(text, apiHistory);
      try{ loader.remove(); }catch{}
      addBubble("assistant", out);
      h.push({ role:"assistant", text: out });
      saveHist(u, h);
    }catch{
      try{ loader.remove(); }catch{}
      const msg = UI_LANG==="tr" ? "Şu an cevap veremedim. Bir daha dener misin?" : "I couldn't answer. Try again?";
      addBubble("assistant", msg);
      h.push({ role:"assistant", text: msg });
      saveHist(u, h);
    }finally{
      if(!isPro(u)){
        const elapsed = (Date.now() - started) / 1000;
        const charge = Math.max(MIN_AI_WAIT_CHARGE, Math.min(MAX_AI_WAIT_CHARGE, Math.floor(elapsed)));
        addUsed(u, charge);
      }

      addBubble("meta", isPro(u)
        ? (UI_LANG==="tr" ? "PRO üyelik: sınırsız kullanım" : "PRO: unlimited")
        : (UI_LANG==="tr" ? `Bugünkü ücretsiz kalan: ${remaining(u)}s` : `Remaining today: ${remaining(u)}s`)
      );

      if(!canUse(u)) showPaywall(u);
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

  $("micBtn").addEventListener("click", ()=>{
    startSTT(u, async (finalText)=>{
      $("msgInput").value = finalText;
      autoGrow();
      await send(finalText);
    });
  });

  autoGrow();

  // gate on load
  if(!canUse(u)) showPaywall(u);

  // if system language changes: simplest safe behavior
  window.addEventListener("storage", (e)=>{
    if(e.key==="italky_site_lang_v1" || e.key==="italky_lang_ping"){
      location.reload();
    }
  });
}

document.addEventListener("DOMContentLoaded", main);
