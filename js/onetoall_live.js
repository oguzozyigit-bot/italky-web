// FILE: /js/onetoall_live.js

import { mountShell } from "/js/ui_shell.js";
import { LANG_POOL } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";

try {
  mountShell({ scroll: "auto" });
} catch (e) {
  console.warn("[onetoall live shell]", e);
}

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com/api/onetoall/ws";

const $ = (id) => document.getElementById(id);

const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ru: "ru-RU",
  el: "el-GR",
  az: "az-AZ",
  ka: "ka-GE",
};

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : [])
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;
    return {
      code,
      flag: l.flag || "🌐",
      name: l.name || code.toUpperCase(),
      bcp: BCP[code] || "en-US",
    };
  })
  .filter(Boolean);

function langObj(code) {
  const c = canonical(code);
  return (
    LANGS.find((x) => x.code === c) || {
      code: c,
      flag: "🌐",
      name: c.toUpperCase(),
      bcp: BCP[c] || "en-US",
    }
  );
}

const query = new URLSearchParams(location.search);

const role = String(query.get("role") || "listener").trim().toLowerCase();
const room = String(query.get("room") || "").trim().toUpperCase();
const lang = canonical(query.get("lang") || (role === "speaker" ? "tr" : "en"));
const voice = String(query.get("voice") || "default_female").trim();
const output = String(query.get("output") || "voice").trim().toLowerCase();
const listenMode = String(query.get("mode") || "audio").trim().toLowerCase();
const micAlways = String(query.get("mic_always") || "1").trim() === "1";
const noiseReduce = String(query.get("noise_reduce") || "0").trim() === "1";

const els = {
  heroRoleText: $("heroRoleText"),
  heroSubText: $("heroSubText"),
  pillRole: $("pillRole"),
  pillRoom: $("pillRoom"),
  pillLang: $("pillLang"),

  roomCodeText: $("roomCodeText"),
  langText: $("langText"),

  wsStatus: $("wsStatus"),
  micStatus: $("micStatus"),
  flowStatus: $("flowStatus"),

  micVisualWrapper: $("micVisualWrapper"),
  btnStartMic: $("btnStartMic"),
  btnStopMic: $("btnStopMic"),
  btnBackLobby: $("btnBackLobby"),
  btnBackLobby2: $("btnBackLobby2"),
  btnReplay: $("btnReplay"),

  speakerActions: $("speakerActions"),
  listenerActions: $("listenerActions"),

  mainKicker: $("mainKicker"),
  mainText: $("mainText"),
  subKicker: $("subKicker"),
  subText: $("subText"),

  debugLog: $("debugLog"),
};

let ws = null;
let wsReady = false;
let reconnectTimer = null;
let reconnectCount = 0;
let manuallyClosed = false;

let recognizer = null;
let isMicRunning = false;
let currentAudio = null;
let audioCtx = null;
let voicesReady = false;
let preparedStream = null;

let lastSpeakerSentText = "";
let lastSpeakerSentAt = 0;
let lastReplayText = "";
let lastReplayLang = lang;
let lastPartialText = "";

function logLine(text) {
  if (!els.debugLog) return;
  const now = new Date();
  const stamp = now.toLocaleTimeString("tr-TR", { hour12: false });
  els.debugLog.textContent += `\n[${stamp}] ${text}`;
  els.debugLog.scrollTop = els.debugLog.scrollHeight;
}

function setWsStatus(text, ok = false) {
  if (!els.wsStatus) return;
  els.wsStatus.textContent = text;
  els.wsStatus.className = `status-pill ${ok ? "ok" : "warn"}`;
}

function setMicStatus(text, ok = false) {
  if (!els.micStatus) return;
  els.micStatus.textContent = text;
  els.micStatus.className = `status-pill ${ok ? "ok" : "warn"}`;
}

function setFlowStatus(text, ok = true) {
  if (!els.flowStatus) return;
  els.flowStatus.textContent = text;
  els.flowStatus.className = `status-pill ${ok ? "ok" : "warn"}`;
}

function setRoleUI() {
  if (els.heroRoleText) {
    els.heroRoleText.textContent = role === "speaker" ? "Speaker" : "Listener";
  }

  if (els.heroSubText) {
    els.heroSubText.textContent =
      role === "speaker"
        ? "Yayın oturumu aktif. Sesiniz gerçek zamanlı olarak işlenip dinleyicilere ulaştırılır."
        : "Dinleyici modundasınız. Konuşmacının yayını kendi dilinizde anlık işlenir.";
  }

  if (els.pillRole) els.pillRole.textContent = `Role: ${role}`;
  if (els.pillRoom) els.pillRoom.textContent = `Room: ${room || "------"}`;
  if (els.pillLang) els.pillLang.textContent = `Lang: ${langObj(lang).flag} ${langObj(lang).name}`;

  if (els.roomCodeText) els.roomCodeText.textContent = room || "------";
  if (els.langText) els.langText.textContent = `${langObj(lang).flag} ${langObj(lang).name}`;

  if (role === "speaker") {
    els.speakerActions?.classList.remove("hide");
    els.listenerActions?.classList.add("hide");
    if (els.mainKicker) els.mainKicker.textContent = "Canlı Mikrofon";
    if (els.subKicker) els.subKicker.textContent = "İşlenmiş Çıkış";
    if (els.mainText) els.mainText.textContent = "Mikrofon kapalı. Başlatınca canlı konuşma burada akacak.";
    if (els.subText) els.subText.textContent = "Çeviri / dağıtım çıktısı burada görünecek.";
  } else {
    els.speakerActions?.classList.add("hide");
    els.listenerActions?.classList.remove("hide");
    if (els.mainKicker) els.mainKicker.textContent = "Konuşmacı";
    if (els.subKicker) els.subKicker.textContent = "Sizin Diliniz";
    if (els.mainText) els.mainText.textContent = "Konuşmacıdan canlı akış bekleniyor...";
    if (els.subText) els.subText.textContent = "Çevrilmiş metin burada görünecek.";
  }
}

async function warmAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") await audioCtx.resume();
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}
}

function unlockOnFirstTouch() {
  const once = async () => {
    try { await warmAudio(); } catch {}
    window.removeEventListener("touchstart", once);
    window.removeEventListener("pointerdown", once);
    window.removeEventListener("click", once);
  };

  window.addEventListener("touchstart", once, { passive: true });
  window.addEventListener("pointerdown", once, { passive: true });
  window.addEventListener("click", once, { passive: true });
}

function stopAudio() {
  try {
    currentAudio?.pause?.();
    currentAudio = null;
  } catch {}
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

async function getCurrentUserId() {
  const u = await getCurrentUser();
  return u?.id || null;
}

function getVoicePreference() {
  const raw = String(localStorage.getItem("tts_voice") || "auto").toLowerCase().trim();
  if (["auto", "female", "male", "clone"].includes(raw)) return raw;
  return "auto";
}

async function hasReadyVoiceProfile() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("tts_voice_ready,tts_voice_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return false;
    return !!data?.tts_voice_ready && !!String(data?.tts_voice_id || "").trim();
  } catch {
    return false;
  }
}

async function speakViaApi(text, langCode) {
  const userId = await getCurrentUserId();
  const pref = getVoicePreference();

  const r = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: canonical(langCode),
      user_id: userId,
      module: "onetoall",
      voice: pref === "auto" ? voice : pref
    }),
  });

  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok || !j?.audio_base64) {
    throw new Error(j?.error || j?.detail || "TTS API unavailable");
  }

  const audio = new Audio(`data:audio/mp3;base64,${j.audio_base64}`);
  audio.preload = "auto";
  audio.playsInline = true;
  currentAudio = audio;

  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  await warmAudio();

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.then === "function") {
    await playPromise;
  }
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (!voices.length) return null;

  const pref = getVoicePreference();
  const base = canonical(langCode);
  const bcp = (BCP[base] || "en-US").toLowerCase();

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(base));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;

  if (pref === "female") {
    return (
      pool.find((v) => /female|woman|zira|aria|jenny|eva|emma|anna|helena/i.test(v.name)) ||
      pool[0]
    );
  }

  if (pref === "male") {
    return (
      pool.find((v) => /male|man|david|mark|alex|tom|jon|paul/i.test(v.name)) ||
      pool[0]
    );
  }

  return pool[0] || null;
}

function speakFallback(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  stopAudio();

  const pref = getVoicePreference();
  const c = canonical(langCode);

  if (pref === "auto" && window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(value, c);
      return;
    } catch {}
  }

  if (!window.speechSynthesis) return;

  try {
    if (!voicesReady) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}

  const u = new SpeechSynthesisUtterance(value);
  u.lang = BCP[c] || "en-US";
  u.rate = c === "en" ? 0.84 : ["de", "fr", "it", "es"].includes(c) ? 0.88 : 0.92;
  u.pitch = 1.0;
  u.volume = 1;

  const chosen = chooseWebVoice(c);
  if (chosen) u.voice = chosen;

  setTimeout(() => {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, 60);
}

async function speakText(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  const pref = getVoicePreference();

  if (pref === "auto") {
    speakFallback(value, langCode);
    return;
  }

  if (pref === "clone") {
    try {
      const ready = await hasReadyVoiceProfile();
      if (!ready) {
        speakFallback(value, langCode);
        return;
      }
      await speakViaApi(value, langCode);
      return;
    } catch {
      speakFallback(value, langCode);
      return;
    }
  }

  try {
    await speakViaApi(value, langCode);
  } catch {
    speakFallback(value, langCode);
  }
}

function prepareMicVisual(active) {
  if (!els.micVisualWrapper) return;
  if (active) els.micVisualWrapper.classList.add("live");
  else els.micVisualWrapper.classList.remove("live");
}

async function requestMicPermission() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    const temp = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    temp.getTracks().forEach((t) => t.stop());
    return true;
  } catch (e) {
    logLine(`Mic izin hatası: ${e?.message || e}`);
    return false;
  }
}

async function prepareEnhancedMic() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return;

    if (preparedStream) {
      try { preparedStream.getTracks().forEach((t) => t.stop()); } catch {}
      preparedStream = null;
    }

    preparedStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: !!noiseReduce,
        autoGainControl: true,
        channelCount: 1
      },
      video: false
    });
  } catch (e) {
    logLine(`Gelişmiş mic hazırlığı başarısız: ${e?.message || e}`);
  }
}

function wsUrl() {
  if (!room) return null;
  return `${WS_BASE}/${encodeURIComponent(room)}`;
}

function sendWs(payload) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  } catch (e) {
    logLine(`WS gönderim hatası: ${e?.message || e}`);
  }
}

function scheduleReconnect() {
  if (manuallyClosed || reconnectTimer) return;

  const delay = Math.min(1500 + reconnectCount * 1000, 6000);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectCount += 1;
    logLine("Yeniden bağlanılıyor...");
    connectSocket();
  }, delay);
}

function connectSocket() {
  const url = wsUrl();

  if (!url) {
    setWsStatus("WS: Oda yok", false);
    setFlowStatus("Akış: Oda kodu eksik", false);
    return;
  }

  try {
    if (ws && ws.readyState === WebSocket.OPEN) return;
  } catch {}

  try {
    ws = new WebSocket(url);
  } catch (e) {
    setWsStatus("WS: Hata", false);
    logLine(`WebSocket oluşturulamadı: ${e?.message || e}`);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    wsReady = true;
    reconnectCount = 0;
    setWsStatus("WS: Açık", true);
    setFlowStatus("Akış: Hazır", true);
    logLine("WebSocket bağlandı.");

    sendWs({
      type: role === "speaker" ? "speaker_join" : "listener_join",
      room,
      role,
      lang,
      voice,
      output,
      mode: listenMode
    });
  };

  ws.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data || "{}");
      const type = String(payload?.type || "").trim();

      if (type === "joined" || type === "presence") {
        logLine("Odaya giriş onayı alındı.");
        return;
      }

      if (type === "listener_count") {
        logLine(`Dinleyici sayısı: ${payload?.count ?? 0}`);
        return;
      }

      if (type === "speaker_chunk" || type === "speaker_text") {
        const rawText = String(payload?.text || "").trim();
        if (rawText && role === "listener") {
          if (els.mainText) els.mainText.textContent = rawText;
          lastPartialText = rawText;
        }
        return;
      }

      if (type === "translated_message" || type === "broadcast_translation" || type === "listener_translation") {
        const sourceText = String(payload?.source_text || payload?.original_text || payload?.text || "").trim();
        const translatedText = String(payload?.translated_text || payload?.translation || "").trim();
        const finalText = translatedText || sourceText;
        const outLang = canonical(payload?.target_lang || payload?.lang || lang);

        if (sourceText && els.mainText) els.mainText.textContent = sourceText;
        if (finalText && els.subText) els.subText.textContent = finalText;

        lastReplayText = finalText;
        lastReplayLang = outLang;

        logLine(`Çeviri geldi: ${finalText || "(boş)"}`);

        if (role === "listener" && listenMode === "audio" && finalText) {
          await speakText(finalText, outLang);
        }

        if (role === "speaker" && output === "voice" && finalText) {
          await speakText(finalText, outLang);
        }

        return;
      }

      if (type === "error") {
        const msg = String(payload?.message || "Bilinmeyen hata");
        logLine(`Sunucu hatası: ${msg}`);
        setFlowStatus(`Akış: ${msg}`, false);
        return;
      }

      logLine(`WS mesajı: ${type || "bilinmeyen"}`);
    } catch (e) {
      logLine(`Mesaj parse hatası: ${e?.message || e}`);
    }
  };

  ws.onerror = () => {
    wsReady = false;
    setWsStatus("WS: Hata", false);
    setFlowStatus("Akış: Bağlantı sorunu", false);
    logLine("WebSocket hata verdi.");
  };

  ws.onclose = () => {
    wsReady = false;
    setWsStatus("WS: Kapalı", false);
    if (!manuallyClosed) {
      setFlowStatus("Akış: Yeniden bağlanıyor", false);
      logLine("WebSocket kapandı.");
      scheduleReconnect();
    }
  };
}

function stopSocket() {
  manuallyClosed = true;
  try { ws?.close?.(); } catch {}
  ws = null;
  wsReady = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = langObj(langCode).bcp;
  rec.interimResults = true;
  rec.continuous = !!micAlways;
  rec.maxAlternatives = 1;
  return rec;
}

function shouldIgnoreDuplicate(text) {
  const value = String(text || "").trim();
  const now = Date.now();

  if (!value) return true;
  if (value === lastSpeakerSentText && (now - lastSpeakerSentAt) < 1800) return true;

  lastSpeakerSentText = value;
  lastSpeakerSentAt = now;
  return false;
}

function sendSpeakerText(text, isFinal = false) {
  const value = String(text || "").trim();
  if (!value || !wsReady || !ws || ws.readyState !== WebSocket.OPEN) return;

  sendWs({
    type: isFinal ? "speaker_final" : "speaker_text",
    room,
    role: "speaker",
    text: value,
    lang,
    target_mode: output
  });
}

async function startMic() {
  if (role !== "speaker") return;

  const granted = await requestMicPermission();
  if (!granted) {
    setMicStatus("Mic: İzin yok", false);
    setFlowStatus("Akış: Mikrofon izni gerekli", false);
    logLine("Mikrofon izni verilmedi.");
    return;
  }

  await warmAudio();
  await prepareEnhancedMic();

  recognizer = buildRecognizer(lang);

  if (!recognizer) {
    setMicStatus("Mic: Desteksiz", false);
    setFlowStatus("Akış: SpeechRecognition yok", false);
    logLine("SpeechRecognition desteklenmiyor.");
    return;
  }

  let finalBuffer = "";

  recognizer.onstart = () => {
    isMicRunning = true;
    prepareMicVisual(true);
    setMicStatus("Mic: Açık", true);
    setFlowStatus("Akış: Dinliyor", true);
    if (els.btnStartMic) els.btnStartMic.classList.add("hide");
    if (els.btnStopMic) els.btnStopMic.classList.remove("hide");
    logLine("Mikrofon başladı.");
  };

  recognizer.onresult = (e) => {
    let interim = "";
    let finalPart = "";

    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      const chunk = String(e.results[i]?.[0]?.transcript || "").trim();
      if (!chunk) continue;

      if (e.results[i].isFinal) finalPart += `${chunk} `;
      else interim += `${chunk} `;
    }

    finalPart = finalPart.trim();
    interim = interim.trim();

    if (finalPart) {
      finalBuffer = `${finalBuffer} ${finalPart}`.trim();
      if (!shouldIgnoreDuplicate(finalPart)) {
        sendSpeakerText(finalPart, true);
      }
    }

    const liveText = finalBuffer || interim || "";
    if (liveText && els.mainText) els.mainText.textContent = liveText;
    if (interim) sendSpeakerText(interim, false);
  };

  recognizer.onerror = (e) => {
    const err = String(e?.error || "").toLowerCase();
    isMicRunning = false;
    prepareMicVisual(false);
    setMicStatus("Mic: Hata", false);
    setFlowStatus(`Akış: ${err || "mic hatası"}`, false);
    logLine(`Mic hata: ${err || "unknown"}`);
  };

  recognizer.onend = () => {
    isMicRunning = false;
    prepareMicVisual(false);
    setMicStatus("Mic: Kapalı", false);
    setFlowStatus("Akış: Hazır", true);
    if (els.btnStartMic) els.btnStartMic.classList.remove("hide");
    if (els.btnStopMic) els.btnStopMic.classList.add("hide");
    logLine("Mikrofon durdu.");
  };

  try {
    recognizer.start();
  } catch (e) {
    setMicStatus("Mic: Başlatılamadı", false);
    setFlowStatus("Akış: Mic başlatılamadı", false);
    logLine(`Mic start error: ${e?.message || e}`);
  }
}

function stopMic() {
  try { recognizer?.stop?.(); } catch {}
  try { preparedStream?.getTracks?.().forEach((t) => t.stop()); } catch {}
  preparedStream = null;
  isMicRunning = false;
  prepareMicVisual(false);
  setMicStatus("Mic: Kapalı", false);
  setFlowStatus("Akış: Hazır", true);
}

function bindEvents() {
  unlockOnFirstTouch();
  setRoleUI();

  els.btnStartMic?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await startMic();
  });

  els.btnStopMic?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    stopMic();
  });

  els.btnReplay?.addEventListener("click", async () => {
    if (!lastReplayText) return;
    await speakText(lastReplayText, lastReplayLang || lang);
  });

  els.btnBackLobby?.addEventListener("click", () => {
    stopMic();
    stopAudio();
    stopSocket();
    location.href = "/pages/onetoall.html";
  });

  els.btnBackLobby2?.addEventListener("click", () => {
    stopAudio();
    stopSocket();
    location.href = "/pages/onetoall.html";
  });

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesReady = true;
      };
      window.speechSynthesis.getVoices();
    }
  } catch {}
}

async function init() {
  if (!room) {
    setFlowStatus("Akış: Oda kodu eksik", false);
    logLine("Room parametresi gelmedi.");
    return;
  }

  bindEvents();
  await warmAudio().catch(() => {});
  connectSocket();

  setWsStatus("WS: Bağlanıyor", false);
  setMicStatus(role === "speaker" ? "Mic: Kapalı" : "Mic: Dinleyici", role !== "speaker");
  setFlowStatus("Akış: Hazır", true);
  logLine(`Rol: ${role}`);
  logLine(`Oda: ${room}`);
  logLine(`Dil: ${lang}`);
}

init();

window.addEventListener("beforeunload", () => {
  manuallyClosed = true;
  stopMic();
  stopAudio();
  stopSocket();
});
