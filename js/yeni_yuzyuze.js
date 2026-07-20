/**
 * Staging-only fast face-to-face lane.
 * Isolated from games, ads, global_access, and legacy facetoface modules.
 */
import { BASE_DOMAIN } from "/js/config.js";
import { supabase } from "/js/supabase_client.js";

const WS_BASE = String(BASE_DOMAIN || "").replace(/^http/i, "ws").replace(/\/+$/, "");
const STAGING_WS = `${WS_BASE}/api/f2f/staging/ws`;
const API_BASE = String(BASE_DOMAIN || "").replace(/\/+$/, "");
const PEER_KEY = "italky_staging_peer_id_v1";
const TTS_PREF_KEY = "italky_staging_tts_pref_v1";

const $ = (id) => document.getElementById(id);

const state = {
  ws: null,
  wsReady: false,
  room: "",
  role: "",
  peerId: "",
  listening: false,
  recognizer: null,
  partialThrottle: 0,
  audioRecorder: null,
  audioSeq: 0,
  ttsEnabled: true,
  ttsPreferApi: localStorage.getItem(TTS_PREF_KEY) === "api",
  audioUnlocked: false,
  metrics: {
    wsRtt: null,
    sttMs: null,
    translateMs: null,
    totalMs: null,
    ttsMs: null,
  },
};

const playback = {
  speakToken: 0,
  currentAudio: null,
  chunkQueue: [],
  chunkPlaying: false,
  chunkAudio: null,
  chunkDropped: 0,
};

function nowMs() {
  return performance.now();
}

function wallMs() {
  return Date.now();
}

function canonLang(v, fallback = "tr") {
  return String(v || fallback).trim().toLowerCase().split("-")[0] || fallback;
}

function ensurePeerId() {
  let id = localStorage.getItem(PEER_KEY) || "";
  if (!id) {
    id = `stg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(PEER_KEY, id);
  }
  state.peerId = id;
  return id;
}

function isRemotePeer(msg) {
  const from = String(msg?.from || "").trim();
  return !!from && from !== state.peerId;
}

function logLine(text, kind = "info") {
  const box = $("eventLog");
  if (!box) return;
  const row = document.createElement("div");
  row.className = `log-row log-${kind}`;
  row.textContent = `[${new Date().toLocaleTimeString("tr-TR")}] ${text}`;
  box.prepend(row);
  while (box.children.length > 120) box.lastChild?.remove();
}

function setMetric(key, value) {
  state.metrics[key] = value;
  const el = $(`metric${key.charAt(0).toUpperCase()}${key.slice(1)}`);
  if (el) el.textContent = value == null ? "—" : `${value} ms`;
}

function setConn(status, ok = false) {
  const el = $("connStatus");
  if (!el) return;
  el.textContent = status;
  el.classList.toggle("ok", !!ok);
  el.classList.toggle("bad", !ok && status !== "Bağlanıyor…");
}

function setTtsStatus(text, active = true) {
  const el = $("ttsStatus");
  if (!el) return;
  el.textContent = text;
  el.style.color = active ? "var(--lime)" : "var(--muted)";
}

function wsSend(payload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return false;
  try {
    state.ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function disconnectWs() {
  try { state.ws?.close(); } catch {}
  state.ws = null;
  state.wsReady = false;
  setConn("Kapalı", false);
}

function connectWs(roomCode, afterOpen) {
  disconnectWs();
  const room = String(roomCode || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (!room) throw new Error("Oda kodu gerekli");

  state.room = room;
  const url = `${STAGING_WS}/${encodeURIComponent(room)}`;
  setConn("Bağlanıyor…", false);
  logLine(`WS bağlanıyor: ${url}`);

  const ws = new WebSocket(url);
  state.ws = ws;

  ws.onopen = () => {
    state.wsReady = true;
    setConn("Bağlı", true);
    logLine("WebSocket açık", "ok");
    afterOpen?.();
    startWsPingLoop();
  };

  ws.onmessage = (ev) => {
    try {
      handleWsMessage(JSON.parse(ev.data || "{}"));
    } catch (e) {
      logLine(`WS parse hatası: ${e?.message || e}`, "err");
    }
  };

  ws.onerror = () => {
    setConn("Hata", false);
    logLine("WebSocket hata", "err");
  };

  ws.onclose = () => {
    state.wsReady = false;
    setConn("Kapalı", false);
    logLine("WebSocket kapandı", "warn");
  };
}

function bcpLang(code) {
  const c = canonLang(code);
  return ({
    tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", es: "es-ES", it: "it-IT",
    ar: "ar-SA", ru: "ru-RU", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN",
  }[c] || "en-US");
}

function chooseWebVoice(langCode) {
  const lang = canonLang(langCode, "en");
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return (
    voices.find((v) => String(v.lang || "").toLowerCase().startsWith(lang))
    || voices.find((v) => String(v.lang || "").toLowerCase().startsWith("en"))
    || voices[0]
    || null
  );
}

async function unlockAudio() {
  if (state.audioUnlocked) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      if (ctx.state === "suspended") await ctx.resume();
      await ctx.close();
    }
  } catch {}
  try { window.speechSynthesis?.getVoices?.(); } catch {}
  state.audioUnlocked = true;
}

function stopTtsPlayback() {
  playback.speakToken += 1;
  try {
    if (playback.currentAudio) {
      playback.currentAudio.pause();
      playback.currentAudio.currentTime = 0;
    }
  } catch {}
  playback.currentAudio = null;
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

function stopRemoteChunkPlayback() {
  playback.chunkQueue.forEach((item) => {
    try { URL.revokeObjectURL(item.url); } catch {}
  });
  playback.chunkQueue = [];
  playback.chunkPlaying = false;
  try {
    if (playback.chunkAudio) {
      playback.chunkAudio.pause();
      playback.chunkAudio.currentTime = 0;
    }
  } catch {}
  playback.chunkAudio = null;
}

function playNextRemoteChunk() {
  if (playback.chunkPlaying || !playback.chunkQueue.length) return;
  const item = playback.chunkQueue.shift();
  if (!item?.url) {
    playNextRemoteChunk();
    return;
  }

  playback.chunkPlaying = true;
  const audio = new Audio(item.url);
  audio.playsInline = true;
  audio.preload = "auto";
  playback.chunkAudio = audio;

  const done = () => {
    try { URL.revokeObjectURL(item.url); } catch {}
    playback.chunkAudio = null;
    playback.chunkPlaying = false;
    playNextRemoteChunk();
  };

  audio.onended = done;
  audio.onerror = done;
  audio.play().catch(() => done());
}

function enqueueRemoteAudioChunk(msg) {
  const b64 = String(msg?.chunk_b64 || "").trim();
  if (!b64) return;

  if (playback.chunkQueue.length > 24) {
    const dropped = playback.chunkQueue.shift();
    try { URL.revokeObjectURL(dropped?.url); } catch {}
    playback.chunkDropped += 1;
  }

  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const mime = String(msg?.mime || "audio/webm").trim() || "audio/webm";
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    playback.chunkQueue.push({ url, seq: Number(msg?.seq || 0) });
    playNextRemoteChunk();
  } catch (e) {
    logLine(`Ses chunk decode hatası: ${e?.message || e}`, "err");
  }
}

async function speakViaBrowser(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return false;

  try {
    if (window.NativeTTS?.speak) {
      window.NativeTTS.speak(value, canonLang(langCode, "en"));
      return true;
    }
  } catch {}

  if (!window.speechSynthesis) return false;

  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = bcpLang(langCode);
      utterance.rate = 1.02;
      utterance.pitch = 1;
      const voice = chooseWebVoice(langCode);
      if (voice) utterance.voice = voice;
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve(false);
    }
  });
}

async function speakViaApi(text, langCode, token) {
  const value = String(text || "").trim();
  if (!value || !token?.userId) return false;

  const headers = { "Content-Type": "application/json" };
  if (token.accessToken) headers.Authorization = `Bearer ${token.accessToken}`;

  const res = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: value,
      lang: canonLang(langCode, "en"),
      user_id: token.userId,
      voice: "mine",
      module: "facetoface",
    }),
  });

  const data = await res.json().catch(() => null);
  const audioBase64 = String(data?.audio_base64 || "").trim();
  if (!res.ok || !data?.ok || !audioBase64) return false;

  const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
  audio.playsInline = true;
  audio.preload = "auto";
  playback.currentAudio = audio;

  await audio.play();
  await new Promise((resolve) => {
    audio.onended = resolve;
    audio.onerror = resolve;
  });
  if (playback.currentAudio === audio) playback.currentAudio = null;
  return true;
}

async function getAuthToken() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.user?.id) return null;
    return {
      userId: session.user.id,
      accessToken: session.access_token || "",
    };
  } catch {
    return null;
  }
}

async function speakTranslatedText(text, langCode) {
  if (!state.ttsEnabled) return;

  const value = String(text || "").trim();
  if (!value) return;

  await unlockAudio();
  stopTtsPlayback();
  const tokenId = ++playback.speakToken;
  const t0 = nowMs();

  let mode = "tarayıcı";
  let ok = false;

  if (state.ttsPreferApi) {
    const auth = await getAuthToken();
    if (auth && tokenId === playback.speakToken) {
      try {
        ok = await speakViaApi(value, langCode, auth);
        if (ok) mode = "Cartesia";
      } catch {}
    }
  }

  if (!ok && tokenId === playback.speakToken) {
    ok = await speakViaBrowser(value, langCode);
    mode = ok ? "tarayıcı" : "kapalı";
  }

  if (tokenId !== playback.speakToken) return;

  const ttsMs = Math.round(nowMs() - t0);
  setMetric("ttsMs", ttsMs);
  setTtsStatus(`TTS açık · ${mode}`, state.ttsEnabled);
  logLine(`TTS (${mode}, ${ttsMs}ms): ${value.slice(0, 80)}`, ok ? "ok" : "warn");
}

function handleWsMessage(msg) {
  const type = String(msg?.type || "");

  if (type === "pong") {
    const clientTs = Number(msg.client_ts || 0);
    if (clientTs) setMetric("wsRtt", Math.max(0, wallMs() - clientTs));
    return;
  }

  if (type === "presence") {
    $("peerCount").textContent = String(msg.count ?? "0");
    return;
  }

  if (type === "utterance" && msg.partial && isRemotePeer(msg)) {
    $("remotePartial").textContent = String(msg.text || "");
    return;
  }

  if (type === "translation") {
    const translateMs = Number(msg.translate_ms || 0);
    const totalMs = Number(msg.total_ms || 0);
    setMetric("translateMs", translateMs);
    setMetric("totalMs", totalMs);

    if (isRemotePeer(msg)) {
      $("remoteFinal").textContent = String(msg.translated_text || "");
      $("remoteSource").textContent = String(msg.source_text || "");
      logLine(`Çeviri ${translateMs}ms | toplam ${totalMs}ms`, "ok");
      speakTranslatedText(msg.translated_text, msg.target_lang || $("targetLang")?.value || "en").catch(() => {});
    }
    return;
  }

  if (type === "audio_chunk" && msg.chunk_b64 && isRemotePeer(msg)) {
    enqueueRemoteAudioChunk(msg);
    if (Number(msg.seq || 0) % 8 === 0) {
      logLine(`Ses chunk oynatılıyor seq=${msg.seq}`, "info");
    }
    return;
  }

  if (type === "peer_joined") {
    logLine(`Peer katıldı: ${msg.peer?.name || "?"}`, "ok");
    return;
  }

  if (type === "peer_left") {
    logLine("Peer ayrıldı", "warn");
    stopRemoteChunkPlayback();
    return;
  }

  if (type === "error") {
    logLine(`Sunucu: ${msg.message || "error"}`, "err");
  }
}

let pingTimer = null;
function startWsPingLoop() {
  clearInterval(pingTimer);
  pingTimer = setInterval(() => {
    wsSend({ type: "ping", client_ts: wallMs() });
  }, 4000);
}

function joinStaging(asHost) {
  const room = $("roomCode")?.value || "";
  const meLang = canonLang($("myLang")?.value, "tr");
  const targetLang = canonLang($("targetLang")?.value, "en");
  ensurePeerId();
  unlockAudio().catch(() => {});

  connectWs(room, () => {
    wsSend({
      type: asHost ? "create" : "join",
      peer_id: state.peerId,
      name: String($("displayName")?.value || (asHost ? "Host" : "Guest")).trim(),
      me_lang: meLang,
      target_lang: targetLang,
    });
    state.role = asHost ? "host" : "guest";
    $("laneStatus").textContent = asHost ? "Oda oluşturuldu — staging aktif" : "Odaya katıldınız";
  });
}

function stopListening() {
  state.listening = false;
  try { state.recognizer?.stop(); } catch {}
  state.recognizer = null;
  $("micBtn")?.classList.remove("active");
  $("micStatus").textContent = "Mikrofon kapalı";
}

function startListening() {
  if (!state.wsReady) {
    logLine("Önce odaya bağlanın", "warn");
    return;
  }

  unlockAudio().catch(() => {});

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    logLine("SpeechRecognition desteklenmiyor", "err");
    return;
  }

  stopListening();
  const rec = new SR();
  state.recognizer = rec;
  rec.lang = bcpLang($("myLang")?.value || "tr");
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let sttStart = 0;

  rec.onstart = () => {
    state.listening = true;
    $("micBtn")?.classList.add("active");
    $("micStatus").textContent = "Dinleniyor…";
  };

  rec.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = String(event.results[i][0]?.transcript || "");
      if (event.results[i].isFinal) finalText += piece;
      else interim += piece;
    }

    if (interim) {
      $("localPartial").textContent = interim.trim();
      const t = nowMs();
      if (t - state.partialThrottle > 180) {
        state.partialThrottle = t;
        wsSend({
          type: "utterance",
          text: interim.trim(),
          partial: true,
          source_lang: canonLang($("myLang")?.value, "tr"),
          target_lang: canonLang($("targetLang")?.value, "en"),
          client_ts: wallMs(),
        });
      }
    }

    if (finalText.trim()) {
      sttStart = sttStart || nowMs();
      const sttMs = Math.round(nowMs() - sttStart);
      setMetric("sttMs", sttMs);
      sttStart = nowMs();

      const text = finalText.trim();
      $("localFinal").textContent = text;
      $("localPartial").textContent = "";

      wsSend({
        type: "utterance",
        text,
        partial: false,
        source_lang: canonLang($("myLang")?.value, "tr"),
        target_lang: canonLang($("targetLang")?.value, "en"),
        client_ts: wallMs(),
      });
      logLine(`STT final (${sttMs}ms): ${text}`);
    }
  };

  rec.onerror = (e) => {
    logLine(`STT hata: ${e.error || "unknown"}`, "err");
    stopListening();
  };

  rec.onend = () => {
    if (state.listening) {
      try { rec.start(); } catch {}
    }
  };

  try {
    rec.start();
  } catch (e) {
    logLine(`STT başlatılamadı: ${e?.message || e}`, "err");
  }
}

async function toggleAudioStream() {
  if (state.audioRecorder?.state === "recording") {
    state.audioRecorder.stop();
    $("audioStreamBtn")?.classList.remove("active");
    $("audioStreamStatus").textContent = "Ses akışı kapalı";
    return;
  }

  if (!state.wsReady) {
    logLine("Önce odaya bağlanın", "warn");
    return;
  }

  await unlockAudio();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    state.audioRecorder = recorder;
    state.audioSeq = 0;

    recorder.ondataavailable = async (ev) => {
      if (!ev.data?.size) return;
      const buf = await ev.data.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      state.audioSeq += 1;
      wsSend({
        type: "audio_chunk",
        seq: state.audioSeq,
        mime,
        chunk_b64: b64,
        client_ts: wallMs(),
      });
    };

    recorder.start(250);
    $("audioStreamBtn")?.classList.add("active");
    $("audioStreamStatus").textContent = "Ses akışı açık (250ms chunk)";
    logLine("Audio chunk stream başladı", "ok");
  } catch (e) {
    logLine(`Mikrofon izni/akış hatası: ${e?.message || e}`, "err");
  }
}

function toggleTtsMode() {
  state.ttsPreferApi = !state.ttsPreferApi;
  localStorage.setItem(TTS_PREF_KEY, state.ttsPreferApi ? "api" : "browser");
  setTtsStatus(
    state.ttsEnabled
      ? `TTS açık · ${state.ttsPreferApi ? "Cartesia öncelik" : "tarayıcı"}`
      : "TTS kapalı",
    state.ttsEnabled,
  );
  logLine(`TTS modu: ${state.ttsPreferApi ? "Cartesia öncelik" : "tarayıcı öncelik"}`, "ok");
}

function toggleTtsEnabled() {
  state.ttsEnabled = !state.ttsEnabled;
  $("ttsBtn")?.classList.toggle("active", state.ttsEnabled);
  if (!state.ttsEnabled) stopTtsPlayback();
  setTtsStatus(
    state.ttsEnabled
      ? `TTS açık · ${state.ttsPreferApi ? "Cartesia öncelik" : "tarayıcı"}`
      : "TTS kapalı",
    state.ttsEnabled,
  );
}

function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function hydrateTtsPreference() {
  const auth = await getAuthToken();
  if (auth?.userId && state.ttsPreferApi) {
    setTtsStatus("TTS açık · Cartesia öncelik", true);
  } else {
    setTtsStatus("TTS açık · tarayıcı", true);
  }
}

function bindUi() {
  $("genRoomBtn")?.addEventListener("click", () => {
    if ($("roomCode")) $("roomCode").value = randomRoomCode();
  });

  $("hostBtn")?.addEventListener("click", () => joinStaging(true));
  $("guestBtn")?.addEventListener("click", () => joinStaging(false));
  $("disconnectBtn")?.addEventListener("click", () => {
    stopListening();
    stopTtsPlayback();
    stopRemoteChunkPlayback();
    disconnectWs();
    $("laneStatus").textContent = "Bağlantı kesildi";
  });

  $("micBtn")?.addEventListener("click", () => {
    if (state.listening) stopListening();
    else startListening();
  });

  $("audioStreamBtn")?.addEventListener("click", () => {
    toggleAudioStream().catch(() => {});
  });

  $("ttsBtn")?.addEventListener("click", (ev) => {
    if (ev.shiftKey) toggleTtsMode();
    else toggleTtsEnabled();
  });

  $("clearLogBtn")?.addEventListener("click", () => {
    $("eventLog").innerHTML = "";
  });

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.getVoices();
  }

  ["click", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, () => { unlockAudio().catch(() => {}); }, { once: true, passive: true });
  });

  if ($("roomCode") && !$("roomCode").value) {
    $("roomCode").value = randomRoomCode();
  }

  ensurePeerId();
  hydrateTtsPreference().catch(() => {});
  logLine(`Staging peer: ${state.peerId}`);
  logLine("Modül izole — oyun/şov/ad gate yok", "ok");
  logLine("Shift+TTS: Cartesia/tarayıcı modu değiştir", "info");
}

bindUi();
