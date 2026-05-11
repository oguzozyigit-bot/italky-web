import { supabase } from "/js/supabase_client.js";
import { initGlobalAccess } from "/js/global_access.js";
import { LANG_POOL, getLangName } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const ROOM_PREFIX = "italky-conference-";
const LOCAL_MESSAGE_KEY = "italky_conference_last_message_v1";
const $ = (id) => document.getElementById(id);

let role = "";
let sessionCode = "";
let channel = null;
let speakerLang = "tr";
let listenerLang = "en";
let recording = false;
let handsFree = false;
let webRecognizer = null;
let lastMessageId = "";
let localPollTimer = null;
let nativeRestore = null;

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim() || "en";
}

function siteLang() {
  return canonical(window.ITalkySiteLang || localStorage.getItem("site_lang") || localStorage.getItem("italky_site_lang_v1") || navigator.language || "en");
}

function langName(code) {
  try { return getLangName(canonical(code), siteLang()) || canonical(code).toUpperCase(); }
  catch { return canonical(code).toUpperCase(); }
}

function langFlag(code) {
  const lang = canonical(code);
  return LANG_POOL.find((item) => canonical(item.code) === lang)?.flag || "🌐";
}

function bcpFor(code) {
  return {
    tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", it: "it-IT", es: "es-ES", ar: "ar-SA", ru: "ru-RU",
    pt: "pt-PT", nl: "nl-NL", pl: "pl-PL", uk: "uk-UA", fa: "fa-IR", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR"
  }[canonical(code)] || "en-US";
}

function langLabel(code) {
  const lang = canonical(code);
  return `${langFlag(lang)} ${langName(lang)}`;
}

function commonLangs() {
  const preferred = ["tr", "en", "de", "fr", "es", "it", "ar", "ru", "pt", "nl", "pl", "uk", "fa", "zh", "ja", "ko"];
  const seen = new Set();
  const pool = [...preferred.map((code) => LANG_POOL.find((item) => canonical(item.code) === code)).filter(Boolean), ...LANG_POOL];
  return pool.filter((item) => {
    const code = canonical(item?.code);
    if (!code || seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

function fillLangSelect(select, selected) {
  if (!select) return;
  select.innerHTML = commonLangs().map((item) => {
    const code = canonical(item.code);
    return `<option value="${code}" ${code === canonical(selected) ? "selected" : ""}>${item.flag || "🌐"} ${langName(code)}</option>`;
  }).join("");
}

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = String(message || "");
  el.classList.add("show");
  clearTimeout(window.__conferenceToastTimer);
  window.__conferenceToastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function showView(id) {
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === id));
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function makeMessageId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function hasPremiumAccess(access) {
  return !!(
    access?.is_admin || access?.is_superadmin || access?.has_active_membership || access?.is_member ||
    access?.subscription_active || access?.package_active || access?.ads_disabled || access?.no_ads
  );
}

async function ensurePremium() {
  const result = await initGlobalAccess({ allowPublicPageBypass: false });
  if (!result?.ok) return false;
  const access = result.access || window.__ITALKY_ACCESS__ || {};
  if (!hasPremiumAccess(access)) {
    toast("Bu mod premium üyelik gerektirir.");
    setTimeout(() => location.replace("/pages/membership.html"), 500);
    return false;
  }
  return true;
}

function addMessage(containerId, text) {
  const container = $(containerId);
  if (!container) return;
  container.querySelectorAll(".message.latest").forEach((el) => el.classList.remove("latest"));
  const div = document.createElement("div");
  div.className = "message latest";
  div.textContent = String(text || "");
  container.appendChild(div);
  while (container.children.length > 5) container.firstElementChild?.remove();
}

function setBadge(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function sessionUrl(code) {
  return `${location.origin}/pages/conference.html?join=${encodeURIComponent(code)}`;
}

function renderQr(code) {
  const el = $("sessionQr");
  if (!el) return;
  el.innerHTML = `<img alt="Konferans QR" src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(sessionUrl(code))}">`;
}

function transportLabel() {
  const native = !!(window.ConferenceBridge || window.GuideBridge || window.AndroidBridge?.startConferenceBroadcast);
  return native ? "Native bridge hazır" : "Realtime yayın";
}

function getNativeBridge() {
  return window.ConferenceBridge || window.GuideBridge || null;
}

async function closeChannel() {
  if (channel) {
    try { await supabase.removeChannel(channel); } catch {}
  }
  channel = null;
  clearInterval(localPollTimer);
  localPollTimer = null;
}

async function connectRoom(code) {
  await closeChannel();
  sessionCode = String(code || "").replace(/\D/g, "").slice(0, 6);
  if (!sessionCode) return false;

  channel = supabase.channel(`${ROOM_PREFIX}${sessionCode}`, { config: { broadcast: { self: false } } });
  channel.on("broadcast", { event: "speech" }, ({ payload }) => handleIncomingSpeech(payload));
  channel.on("broadcast", { event: "session_end" }, () => {
    toast("Yayın kapatıldı.");
    showView("roleView");
  });

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") toast("Oturum kanalı hazır.");
  });

  localPollTimer = setInterval(() => {
    try {
      const raw = localStorage.getItem(LOCAL_MESSAGE_KEY);
      if (!raw) return;
      const payload = JSON.parse(raw);
      if (payload?.sessionCode === sessionCode) handleIncomingSpeech(payload);
    } catch {}
  }, 1200);

  return true;
}

async function broadcastSpeech(text) {
  const value = clean(text);
  if (!value || !sessionCode) return;
  const payload = { type: "speech", sessionCode, text: value, sourceLang: speakerLang, messageId: makeMessageId(), sentAt: Date.now() };
  lastMessageId = payload.messageId;
  addMessage("speakerTranscript", value);

  try { localStorage.setItem(LOCAL_MESSAGE_KEY, JSON.stringify(payload)); } catch {}

  try {
    getNativeBridge()?.sendBroadcast?.(JSON.stringify(payload));
    window.AndroidBridge?.sendConferenceSpeech?.(JSON.stringify(payload));
  } catch {}

  try {
    await channel?.send({ type: "broadcast", event: "speech", payload });
  } catch (e) {
    console.warn("[conference] realtime send failed", e);
    toast("Yayın gönderimi gecikti.");
  }
}

async function translateText(text, from, to) {
  const payload = { text: clean(text), from_lang: canonical(from), to_lang: canonical(to), source: canonical(from), target: canonical(to), mode: "normal", use_ai: false, cultural: false, tone: "neutral" };
  const endpoints = [`${API_BASE}/api/translate_ai`, `${API_BASE}/api/translate-ai`, `${API_BASE}/api/translate`];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => null);
      const translated = clean(data?.translated || data?.translation || data?.text || "");
      if (response.ok && translated) return translated;
    } catch {}
  }
  return "";
}

function speak(text, lang) {
  const value = clean(text);
  if (!value) return;
  try {
    if (window.NativeTTS?.speak) { window.NativeTTS.speak(value, canonical(lang)); return; }
    if (window.AndroidBridge?.speak) { window.AndroidBridge.speak(value, canonical(lang)); return; }
  } catch {}
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(value);
    u.lang = bcpFor(lang);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
}

async function handleIncomingSpeech(payload) {
  if (!payload || role !== "listener") return;
  if (payload.messageId && payload.messageId === lastMessageId) return;
  const source = clean(payload.text);
  if (!source) return;
  const rowText = "Çevriliyor...";
  addMessage("listenerTranscript", rowText);
  const translated = await translateText(source, payload.sourceLang || "auto", listenerLang);
  const finalText = translated || "Çeviri alınamadı.";
  const latest = $("listenerTranscript")?.querySelector(".message.latest");
  if (latest) latest.textContent = finalText;
  if (translated) speak(translated, listenerLang);
}

function parseSpeechResult(arg1, arg2, arg3) {
  let text = "";
  let isFinal = true;
  if (typeof arg1 === "string" && arg1 === "conference") {
    text = String(arg2 || "");
    isFinal = arg3 !== false;
  } else if (typeof arg1 === "string") {
    try {
      const data = JSON.parse(arg1);
      text = String(data?.text || data?.transcript || "");
      isFinal = data?.isFinal !== false && data?.final !== false;
    } catch { text = arg1; }
  } else if (arg1 && typeof arg1 === "object") {
    text = String(arg1.text || arg1.transcript || "");
    isFinal = arg1.isFinal !== false && arg1.final !== false;
  }
  return { text: clean(text), isFinal };
}

function installNativeSpeechHook() {
  if (nativeRestore) return;
  const previous = window.onNativeSpeechResult;
  nativeRestore = previous;
  window.onNativeSpeechResult = function(arg1, arg2, arg3) {
    const result = parseSpeechResult(arg1, arg2, arg3);
    if (role === "speaker") {
      if (result.text && !result.isFinal) addMessage("speakerTranscript", `${result.text}...`);
      if (result.text && result.isFinal) {
        recording = false;
        setMic(false);
        broadcastSpeech(result.text).finally(restartHandsFreeIfNeeded);
      }
      return;
    }
    try { previous?.(arg1, arg2, arg3); } catch {}
  };
  window.onNativeSpeechError = function(error) {
    const code = String(error || "").toLowerCase().replace(/[\s-]+/g, "_");
    recording = false;
    setMic(false);
    if (["no_speech", "speech_timeout", "timeout", "empty", "empty_result", "client_error", "recognizer_busy"].includes(code)) {
      restartHandsFreeIfNeeded();
      return;
    }
    toast(code.includes("permission") ? "Mikrofon izni gerekli." : "Mikrofon başlatılamadı.");
  };
}

function setMic(value) {
  recording = !!value;
  $("speakerMicBtn")?.classList.toggle("listening", recording);
}

function stopSpeech() {
  try {
    if (window.Native?.stopSpeechRecognition) window.Native.stopSpeechRecognition();
    else if (window.AndroidBridge?.stopSpeechRecognition) window.AndroidBridge.stopSpeechRecognition();
    else webRecognizer?.stop?.();
  } catch {}
  webRecognizer = null;
  setMic(false);
}

function startSpeech() {
  if (role !== "speaker") return;
  if (recording) { stopSpeech(); return; }
  installNativeSpeechHook();
  const bcp = bcpFor(speakerLang);
  setMic(true);

  try {
    if (window.Native?.startSpeechRecognition) { window.Native.startSpeechRecognition(bcp, "conference"); return; }
    if (window.AndroidBridge?.startSpeechRecognition) { window.AndroidBridge.startSpeechRecognition(bcp, "conference"); return; }
  } catch {}

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setMic(false);
    toast("Bu cihazda konuşma tanıma hazır değil.");
    return;
  }
  const rec = new SpeechRecognition();
  webRecognizer = rec;
  rec.lang = bcp;
  rec.continuous = false;
  rec.interimResults = true;
  rec.onresult = (event) => {
    let finalText = "";
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const value = event.results[i][0]?.transcript || "";
      if (event.results[i].isFinal) finalText += value;
      else interim += value;
    }
    if (interim) addMessage("speakerTranscript", `${interim}...`);
    if (finalText) {
      setMic(false);
      broadcastSpeech(finalText).finally(restartHandsFreeIfNeeded);
    }
  };
  rec.onerror = () => { setMic(false); restartHandsFreeIfNeeded(); };
  rec.onend = () => { if (recording) { setMic(false); restartHandsFreeIfNeeded(); } };
  try { rec.start(); } catch { setMic(false); toast("Mikrofon başlatılamadı."); }
}

function restartHandsFreeIfNeeded() {
  if (!handsFree || role !== "speaker" || recording) return;
  setTimeout(() => { if (handsFree && role === "speaker" && !recording) startSpeech(); }, 900 + Math.floor(Math.random() * 500));
}

async function startSpeakerSession() {
  role = "speaker";
  speakerLang = canonical($("speakerLang")?.value || siteLang() || "tr");
  sessionCode = makeCode();
  await connectRoom(sessionCode);
  $("sessionCode").textContent = sessionCode;
  setBadge("speakerLangBadge", `Dil: ${langLabel(speakerLang)}`);
  setBadge("speakerTransportBadge", transportLabel());
  renderQr(sessionCode);
  addMessage("speakerTranscript", "Yayın hazır. Mikrofonu açıp konuşabilirsiniz.");
  showView("speakerLiveView");
  try {
    getNativeBridge()?.startBroadcast?.(JSON.stringify({ sessionCode, sourceLang: speakerLang }));
    window.AndroidBridge?.startConferenceBroadcast?.(JSON.stringify({ sessionCode, sourceLang: speakerLang }));
  } catch {}
}

async function joinListenerSession() {
  role = "listener";
  const code = String($("joinCode")?.value || "").replace(/\D/g, "").slice(0, 6);
  if (code.length !== 6) { toast("6 haneli oturum kodu girin."); return; }
  listenerLang = canonical($("listenerLang")?.value || siteLang() || "en");
  await connectRoom(code);
  setBadge("listenerLangBadge", `Dinleme: ${langLabel(listenerLang)}`);
  setBadge("listenerTransportBadge", transportLabel());
  addMessage("listenerTranscript", "Rehberi dinliyorsunuz. Gelen çeviri burada görünecek.");
  showView("listenerLiveView");
  try {
    getNativeBridge()?.joinBroadcast?.(JSON.stringify({ sessionCode: code, targetLang: listenerLang }));
    window.AndroidBridge?.joinConferenceBroadcast?.(JSON.stringify({ sessionCode: code, targetLang: listenerLang }));
  } catch {}
}

function bind() {
  $("homeBtn")?.addEventListener("click", () => location.href = "/pages/home.html");
  $("speakerRoleBtn")?.addEventListener("click", () => showView("speakerSetupView"));
  $("listenerRoleBtn")?.addEventListener("click", () => showView("listenerSetupView"));
  document.querySelectorAll(".back-role").forEach((btn) => btn.addEventListener("click", () => showView("roleView")));
  $("createSessionBtn")?.addEventListener("click", startSpeakerSession);
  $("joinSessionBtn")?.addEventListener("click", joinListenerSession);
  $("speakerMicBtn")?.addEventListener("click", startSpeech);
  $("handsFreeBtn")?.addEventListener("click", () => {
    handsFree = !handsFree;
    $("handsFreeBtn")?.classList.toggle("active", handsFree);
    if (handsFree) startSpeech();
    else stopSpeech();
  });
  $("endSessionBtn")?.addEventListener("click", async () => {
    try { await channel?.send({ type: "broadcast", event: "session_end", payload: { sessionCode } }); } catch {}
    stopSpeech();
    await closeChannel();
    showView("roleView");
  });
  $("leaveSessionBtn")?.addEventListener("click", async () => {
    await closeChannel();
    showView("roleView");
  });
}

async function boot() {
  if (!(await ensurePremium())) return;
  const defaultLang = siteLang() || "tr";
  speakerLang = defaultLang;
  listenerLang = defaultLang === "tr" ? "en" : defaultLang;
  fillLangSelect($("speakerLang"), speakerLang);
  fillLangSelect($("listenerLang"), listenerLang);
  const join = new URLSearchParams(location.search).get("join") || "";
  if (join) {
    $("joinCode").value = String(join).replace(/\D/g, "").slice(0, 6);
    showView("listenerSetupView");
  }
  bind();
}

boot();
