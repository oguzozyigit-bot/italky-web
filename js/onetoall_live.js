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
const WS_ORIGIN = "wss://italky-api.onrender.com";

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

function getSiteLang() {
  const v = canonical(localStorage.getItem("system_lang") || "tr");
  return ["tr", "en", "de", "fr", "it", "es"].includes(v) ? v : "tr";
}

const siteLang = getSiteLang();

function toDisplayCode(code) {
  const parts = String(code || "").split("-");
  if (parts.length === 2) return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  return String(code || "").toLowerCase();
}

function getLocalizedLanguageName(code, locale) {
  const normalized = toDisplayCode(code);
  try {
    const dn = new Intl.DisplayNames([locale], { type: "language" });
    const out = dn.of(normalized) || dn.of(normalized.split("-")[0]);
    if (out) return out.charAt(0).toUpperCase() + out.slice(1);
  } catch {}
  return String(code || "").toUpperCase();
}

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : [])
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;
    return {
      code,
      flag: l.flag || "🌐",
      name: getLocalizedLanguageName(code, siteLang),
      native: l.name || code.toUpperCase(),
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
      name: getLocalizedLanguageName(c, siteLang),
      native: c.toUpperCase(),
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
const micAlways = false;
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
let activeWsUrlIndex = 0;

let recognizer = null;
let isMicRunning = false;
let micShouldRun = false;
let currentAudio = null;
let audioCtx = null;
let voicesReady = false;
let preparedStream = null;

let lastSpeakerSentText = "";
let lastSpeakerSentAt = 0;
let lastReplayText = "";
let lastReplayLang = lang;
let lastInterimText = "";
let speechRestartTimer = null;

let myUserId = "";
let myDisplayName = "";
let micGranted = role === "speaker";
let activeSpeakerId = role === "speaker" ? "speaker-main" : "";
let handRaised = false;
let pendingSpeakers = [];
let participants = {};

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

function escapeHtml(v) {
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ensureControlPanels() {
  if (role === "speaker") {
    if (!$("moderatorPanel") && els.speakerActions?.parentElement) {
      const box = document.createElement("div");
      box.id = "moderatorPanel";
      box.style.marginTop = "14px";
      box.style.padding = "14px";
      box.style.border = "1px solid rgba(255,255,255,.12)";
      box.style.borderRadius = "18px";
      box.style.background = "rgba(255,255,255,.04)";
      box.innerHTML = `
        <div style="font-weight:800;margin-bottom:10px;">Söz İstekleri</div>
        <div id="speakerQueue" style="display:flex;flex-direction:column;gap:8px;"></div>
      `;
      els.speakerActions.parentElement.appendChild(box);
    }
  } else {
    if (!$("listenerRequestWrap") && els.listenerActions?.parentElement) {
      const box = document.createElement("div");
      box.id = "listenerRequestWrap";
      box.style.marginTop = "14px";
      box.style.display = "flex";
      box.style.flexDirection = "column";
      box.style.gap = "10px";
      box.innerHTML = `
        <button id="btnRaiseHand" class="cta-btn" type="button">Söz İste</button>
        <div id="raiseStatus" class="status-pill warn">Durum: Dinleyici</div>
      `;
      els.listenerActions.parentElement.appendChild(box);
    }
  }
}

function updateRaiseStatus(text, ok = false) {
  const el = $("raiseStatus");
  if (!el) return;
  el.textContent = text;
  el.className = `status-pill ${ok ? "ok" : "warn"}`;
}

function renderSpeakerQueue() {
  const wrap = $("speakerQueue");
  if (!wrap) return;

  if (!pendingSpeakers.length) {
    wrap.innerHTML = `<div style="opacity:.7">Bekleyen söz isteği yok.</div>`;
    return;
  }

  wrap.innerHTML = pendingSpeakers.map((item) => {
    const isActive = item.user_id === activeSpeakerId;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(255,255,255,.03);">
        <div>
          <div style="font-weight:700">${escapeHtml(item.name || "Katılımcı")}</div>
          <div style="font-size:12px;opacity:.72">${escapeHtml(item.lang || "")}${isActive ? " • aktif" : ""}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="mini-grant" data-user="${escapeHtml(item.user_id)}" type="button" style="padding:8px 12px;border:none;border-radius:12px;font-weight:700;">Onayla</button>
          <button class="mini-close" data-user="${escapeHtml(item.user_id)}" type="button" style="padding:8px 12px;border:none;border-radius:12px;font-weight:700;">Kapat</button>
        </div>
      </div>
    `;
  }).join("");

  wrap.querySelectorAll(".mini-grant").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = String(btn.dataset.user || "").trim();
      if (!userId) return;
      grantMicTo(userId);
    });
  });

  wrap.querySelectorAll(".mini-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = String(btn.dataset.user || "").trim();
      if (!userId) return;
      revokeMicFrom(userId);
    });
  });
}

function setRoleUI() {
  if (els.heroRoleText) {
    els.heroRoleText.textContent = role === "speaker" ? "Moderator" : "Participant";
  }

  if (els.heroSubText) {
    els.heroSubText.textContent =
      role === "speaker"
        ? "Söz isteyen katılımcıları onaylar, mikrofonu kontrollü açarsınız."
        : "Dinleyici modundasınız. Söz istemek için butona basınız. Onay gelince mikrofon açılır.";
  }

  if (els.pillRole) els.pillRole.textContent = `Role: ${role}`;
  if (els.pillRoom) els.pillRoom.textContent = `Room: ${room || "------"}`;
  if (els.pillLang) els.pillLang.textContent = `Lang: ${langObj(lang).flag} ${langObj(lang).name}`;

  if (els.roomCodeText) els.roomCodeText.textContent = room || "------";
  if (els.langText) els.langText.textContent = `${langObj(lang).flag} ${langObj(lang).name}`;

  if (role === "speaker") {
    els.speakerActions?.classList.remove("hide");
    els.listenerActions?.classList.add("hide");

    if (els.mainKicker) els.mainKicker.textContent = "Aktif Konuşmacı";
    if (els.subKicker) els.subKicker.textContent = "İşlenmiş Çıkış";
    if (els.mainText) els.mainText.textContent = "Mikrofon kapalı. Söz verilen kişi konuştuğunda akış burada görünür.";
    if (els.subText) els.subText.textContent = "Çeviri / dağıtım çıktısı burada görünecek.";
  } else {
    els.speakerActions?.classList.add("hide");
    els.listenerActions?.classList.remove("hide");

    if (els.mainKicker) els.mainKicker.textContent = "Konuşmacı";
    if (els.subKicker) els.subKicker.textContent = "Sizin Diliniz";
    if (els.mainText) els.mainText.textContent = "Canlı akış bekleniyor...";
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
    try {
      await warmAudio();
    } catch {}
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
  try {
    window.speechSynthesis?.cancel?.();
  } catch {}
  try {
    window.NativeTTS?.stop?.();
  } catch {}
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
      try {
        preparedStream.getTracks().forEach((t) => t.stop());
      } catch {}
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

function getWsCandidates() {
  const encoded = encodeURIComponent(room);
  return [
    `${WS_ORIGIN}/api/onetoall/ws/${encoded}`,
    `${WS_ORIGIN}/api/ws/onetoall/${encoded}`,
    `${WS_ORIGIN}/api/ws/onetoall/${encoded}?role=${encodeURIComponent(role)}&lang=${encodeURIComponent(lang)}`,
  ];
}

function sendWs(payload) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
  } catch (e) {
    logLine(`WS gönderim hatası: ${e?.message || e}`);
  }
  return false;
}

function sendHandshake() {
  const base = {
    room,
    room_id: room,
    host_code: room,
    role,
    lang,
    voice,
    output,
    mode: listenMode,
    module: "onetoall",
    user_id: myUserId,
    display_name: myDisplayName,
  };

  if (role === "speaker") {
    sendWs({ type: "create", ...base });
    setTimeout(() => sendWs({ type: "speaker_join", ...base }), 120);
  } else {
    sendWs({ type: "join", ...base });
    setTimeout(() => sendWs({ type: "listener_join", ...base }), 120);
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
  const urls = getWsCandidates();
  const url = urls[activeWsUrlIndex] || urls[0];

  if (!room) {
    setWsStatus("WS: Oda yok", false);
    setFlowStatus("Akış: Oda kodu eksik", false);
    return;
  }

  try {
    if (ws && ws.readyState === WebSocket.OPEN) return;
  } catch {}

  try {
    ws = new WebSocket(url);
    logLine(`WS deneniyor: ${url}`);
  } catch (e) {
    setWsStatus("WS: Hata", false);
    logLine(`WebSocket oluşturulamadı: ${e?.message || e}`);
    activeWsUrlIndex = (activeWsUrlIndex + 1) % urls.length;
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    wsReady = true;
    reconnectCount = 0;
    setWsStatus("WS: Açık", true);
    setFlowStatus("Akış: Hazır", true);
    logLine("WebSocket bağlandı.");
    sendHandshake();
  };

  ws.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data || "{}");
      const type = String(payload?.type || "").trim();

      if (type === "room_created" || type === "room_joined" || type === "joined" || type === "presence") {
        setWsStatus("WS: Açık", true);
        setFlowStatus("Akış: Bağlı", true);
        logLine(`Odaya giriş onayı: ${type}`);
        return;
      }

      if (type === "listener_count") {
        logLine(`Dinleyici sayısı: ${payload?.count ?? 0}`);
        return;
      }

      if (type === "hand_raised") {
        if (role === "speaker") {
          const req = {
            user_id: String(payload?.user_id || ""),
            name: String(payload?.display_name || "Katılımcı"),
            lang: String(payload?.lang || "")
          };
          if (req.user_id && !pendingSpeakers.some((x) => x.user_id === req.user_id)) {
            pendingSpeakers.push(req);
            renderSpeakerQueue();
            setFlowStatus("Akış: Yeni söz isteği var", true);
            logLine(`Söz isteyen: ${req.name}`);
          }
        }
        return;
      }

      if (type === "mic_granted") {
        const target = String(payload?.user_id || "");
        activeSpeakerId = target;

        if (target === myUserId) {
          micGranted = true;
          handRaised = false;
          updateRaiseStatus("Durum: Söz verildi", true);
          setMicStatus("Mic: Açık izni verildi", true);
          if (role === "listener") {
            await startMic();
          }
        }

        if (role === "speaker") {
          pendingSpeakers = pendingSpeakers.filter((x) => x.user_id !== target);
          renderSpeakerQueue();
        }
        return;
      }

      if (type === "mic_revoked") {
        const target = String(payload?.user_id || "");

        if (target === myUserId) {
          micGranted = false;
          handRaised = false;
          updateRaiseStatus("Durum: Mikrofon kapatıldı", false);
          if (role === "listener") {
            stopMic();
          }
        }

        if (activeSpeakerId === target) activeSpeakerId = "";
        if (role === "speaker") {
          pendingSpeakers = pendingSpeakers.filter((x) => x.user_id !== target);
          renderSpeakerQueue();
        }
        return;
      }

      if (type === "speaker_chunk" || type === "speaker_text" || type === "text_message") {
        const rawText = String(payload?.text || payload?.original_text || "").trim();
        if (rawText && els.mainText) {
          els.mainText.textContent = rawText;
          lastInterimText = rawText;
        }
        return;
      }

      if (
        type === "translated_message" ||
        type === "broadcast_translation" ||
        type === "listener_translation" ||
        type === "message"
      ) {
        const sourceText = String(
          payload?.source_text ||
          payload?.original_text ||
          payload?.text ||
          ""
        ).trim();

        const translatedText = String(
          payload?.translated_text ||
          payload?.translation ||
          ""
        ).trim();

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
      activeWsUrlIndex = (activeWsUrlIndex + 1) % getWsCandidates().length;
      scheduleReconnect();
    }
  };
}

function stopSocket() {
  manuallyClosed = true;
  try {
    ws?.close?.();
  } catch {}
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
  rec.continuous = true;
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

function sendSpeakerFinal(text) {
  const value = String(text || "").trim();
  if (!value || !wsReady || !ws || ws.readyState !== WebSocket.OPEN) return;

  sendWs({
    type: "message",
    room,
    room_id: room,
    role,
    user_id: myUserId,
    text: value,
    original_text: value,
    lang,
    from_lang: lang,
    source_lang: lang,
    target_mode: output,
    module: "onetoall"
  });
}

function sendSpeakerInterim(text) {
  const value = String(text || "").trim();
  if (!value || !wsReady || !ws || ws.readyState !== WebSocket.OPEN) return;

  sendWs({
    type: "speaker_text",
    room,
    room_id: room,
    role,
    user_id: myUserId,
    text: value,
    lang,
    source_lang: lang,
    partial: true,
    module: "onetoall"
  });
}

async function startMic() {
  if (role !== "speaker" && !micGranted) {
    setMicStatus("Mic: İzin bekleniyor", false);
    return;
  }

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

  micShouldRun = true;
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
        sendSpeakerFinal(finalPart);
      }
    }

    const liveText = finalBuffer || interim || "";
    if (liveText && els.mainText) els.mainText.textContent = liveText;

    if (interim && interim !== lastInterimText) {
      lastInterimText = interim;
      sendSpeakerInterim(interim);
    }
  };

  recognizer.onerror = (e) => {
    const err = String(e?.error || "").toLowerCase();
    logLine(`Mic hata: ${err || "unknown"}`);

    isMicRunning = false;
    prepareMicVisual(false);

    if (err.includes("not-allowed") || err.includes("service-not-allowed")) {
      micShouldRun = false;
      setMicStatus("Mic: İzin yok", false);
      setFlowStatus("Akış: Mikrofon izni gerekli", false);
      return;
    }

    if (err.includes("audio-capture")) {
      micShouldRun = false;
      setMicStatus("Mic: Yok", false);
      setFlowStatus("Akış: Mikrofon bulunamadı", false);
      return;
    }

    if (err.includes("no-speech")) {
      setMicStatus("Mic: Açık", true);
      setFlowStatus("Akış: Dinliyor", true);
      return;
    }

    setMicStatus("Mic: Hata", false);
    setFlowStatus("Akış: Mic sorunu", false);
  };

  recognizer.onend = () => {
    isMicRunning = false;
    prepareMicVisual(false);

    if (micShouldRun && role === "speaker") {
      clearTimeout(speechRestartTimer);
      speechRestartTimer = setTimeout(() => {
        if (!micShouldRun) return;
        startMic().catch((e) => {
          logLine(`Mic yeniden başlatılamadı: ${e?.message || e}`);
        });
      }, 250);
      return;
    }

    setMicStatus("Mic: Kapalı", false);
    setFlowStatus("Akış: Hazır", true);
    if (els.btnStartMic) els.btnStartMic.classList.remove("hide");
    if (els.btnStopMic) els.btnStopMic.classList.add("hide");
    logLine("Mikrofon durdu.");
  };

  try {
    recognizer.start();
  } catch (e) {
    micShouldRun = false;
    setMicStatus("Mic: Başlatılamadı", false);
    setFlowStatus("Akış: Mic başlatılamadı", false);
    logLine(`Mic start error: ${e?.message || e}`);
  }
}

function stopMic() {
  micShouldRun = false;
  clearTimeout(speechRestartTimer);
  try {
    recognizer?.stop?.();
  } catch {}
  try {
    preparedStream?.getTracks?.().forEach((t) => t.stop());
  } catch {}
  preparedStream = null;
  isMicRunning = false;
  prepareMicVisual(false);
  setMicStatus("Mic: Kapalı", false);
  setFlowStatus("Akış: Hazır", true);
}

function requestHandRaise() {
  if (role !== "listener" || !myUserId) return;
  handRaised = true;
  updateRaiseStatus("Durum: Söz istendi, onay bekleniyor", false);
  sendWs({
    type: "hand_raise",
    room,
    room_id: room,
    role,
    user_id: myUserId,
    display_name: myDisplayName,
    lang,
    module: "onetoall"
  });
  logLine("Söz isteği gönderildi.");
}

function grantMicTo(userId) {
  activeSpeakerId = userId;
  sendWs({
    type: "grant_mic",
    room,
    room_id: room,
    role: "speaker",
    user_id,
    module: "onetoall"
  });
  logLine(`Mic izni verildi: ${userId}`);
}

function revokeMicFrom(userId) {
  if (activeSpeakerId === userId) activeSpeakerId = "";
  sendWs({
    type: "revoke_mic",
    room,
    room_id: room,
    role: "speaker",
    user_id,
    module: "onetoall"
  });
  logLine(`Mic kapatıldı: ${userId}`);
}

function bindEvents() {
  unlockOnFirstTouch();
  setRoleUI();
  ensureControlPanels();
  renderSpeakerQueue();

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

  $("btnRaiseHand")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    requestHandRaise();
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

async function initIdentity() {
  const user = await getCurrentUser();
  myUserId = String(user?.id || "").trim();
  myDisplayName =
    String(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "")
      .trim() || (role === "speaker" ? "Moderator" : "Katılımcı");

  if (!myUserId) {
    myUserId = `anon_${Math.random().toString(36).slice(2, 10)}`;
  }
}

async function init() {
  if (!room) {
    setFlowStatus("Akış: Oda kodu eksik", false);
    logLine("Room parametresi gelmedi.");
    return;
  }

  await initIdentity();
  bindEvents();
  await warmAudio().catch(() => {});
  connectSocket();

  setWsStatus("WS: Bağlanıyor", false);
  setMicStatus(role === "speaker" ? "Mic: Moderatör" : "Mic: İzin bekleniyor", role === "speaker");
  setFlowStatus("Akış: Hazır", true);

  if (role !== "speaker") {
    updateRaiseStatus("Durum: Dinleyici", false);
  }

  logLine(`Rol: ${role}`);
  logLine(`Oda: ${room}`);
  logLine(`Dil: ${lang}`);
  logLine(`Site dili: ${siteLang}`);
  logLine(`User: ${myDisplayName}`);
}

init();

window.addEventListener("beforeunload", () => {
  manuallyClosed = true;
  stopMic();
  stopAudio();
  stopSocket();
});
