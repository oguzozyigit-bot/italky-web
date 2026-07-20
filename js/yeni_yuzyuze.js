/**
 * Staging-only fast face-to-face lane.
 * Transport: Supabase Realtime Broadcast (serverless).
 * Isolated from games, ads, global_access, Render WS, and legacy facetoface modules.
 */
import { supabase } from "/js/supabase_client.js";

const ROOM_PREFIX = "f2f_staging_";
const PEER_KEY = "italky_staging_peer_id_v1";
const MAX_BROADCAST_B64 = 28000;

const $ = (id) => document.getElementById(id);

const state = {
  channel: null,
  channelReady: false,
  room: "",
  role: "",
  peerId: "",
  displayName: "",
  listening: false,
  recognizer: null,
  partialThrottle: 0,
  audioRecorder: null,
  audioSeq: 0,
  ttsEnabled: true,
  audioUnlocked: false,
  metrics: {
    realtimeRtt: null,
    sttMs: null,
    translateMs: null,
    totalMs: null,
    ttsMs: null,
  },
};

const playback = {
  speakToken: 0,
  chunkQueue: [],
  chunkPlaying: false,
  chunkAudio: null,
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

function roomChannelName(roomCode) {
  const room = String(roomCode || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return `${ROOM_PREFIX}${room}`;
}

function isRemotePeer(msg) {
  const from = String(msg?.from || msg?.peer_id || "").trim();
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

async function disconnectRoom() {
  clearInterval(pingTimer);
  pingTimer = null;

  if (state.channel) {
    try {
      await state.channel.untrack();
    } catch {}
    try {
      await supabase.removeChannel(state.channel);
    } catch {}
  }

  state.channel = null;
  state.channelReady = false;
  setConn("Kapalı", false);
}

async function broadcastEvent(event, payload) {
  if (!state.channel || !state.channelReady) return false;
  const body = {
    ...payload,
    from: state.peerId,
    peer_id: state.peerId,
    name: state.displayName,
    sent_at: wallMs(),
  };
  try {
    const status = await state.channel.send({
      type: "broadcast",
      event,
      payload: body,
    });
    return status === "ok";
  } catch {
    return false;
  }
}

function attachChannelHandlers() {
  const ch = state.channel;
  if (!ch) return;

  ch.on("broadcast", { event: "utterance" }, ({ payload }) => handleRoomMessage(payload));
  ch.on("broadcast", { event: "translation" }, ({ payload }) => handleRoomMessage(payload));
  ch.on("broadcast", { event: "audio_chunk" }, ({ payload }) => handleRoomMessage(payload));
  ch.on("broadcast", { event: "peer_joined" }, ({ payload }) => handleRoomMessage(payload));
  ch.on("broadcast", { event: "peer_left" }, ({ payload }) => handleRoomMessage(payload));
  ch.on("broadcast", { event: "pong" }, ({ payload }) => {
    const clientTs = Number(payload?.client_ts || 0);
    if (clientTs && isRemotePeer(payload)) {
      setMetric("realtimeRtt", Math.max(0, wallMs() - clientTs));
    }
  });
  ch.on("broadcast", { event: "ping" }, ({ payload }) => {
    if (!isRemotePeer(payload)) return;
    broadcastEvent("pong", {
      type: "pong",
      client_ts: Number(payload.client_ts || 0),
    }).catch(() => {});
  });

  ch.on("presence", { event: "sync" }, () => {
    const count = Object.keys(ch.presenceState?.() || {}).length;
    $("peerCount").textContent = String(count);
  });

  ch.on("presence", { event: "join" }, ({ key, newPresences }) => {
    const peer = newPresences?.[0] || {};
    if (key && key !== state.peerId) {
      logLine(`Peer katıldı: ${peer.name || key}`, "ok");
    }
  });

  ch.on("presence", { event: "leave" }, ({ key }) => {
    if (key && key !== state.peerId) {
      logLine("Peer ayrıldı", "warn");
      stopRemoteChunkPlayback();
    }
  });
}

async function connectRoom(roomCode, asHost) {
  await disconnectRoom();

  const room = String(roomCode || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (!room) throw new Error("Oda kodu gerekli");

  state.room = room;
  state.role = asHost ? "host" : "guest";
  state.displayName = String($("displayName")?.value || (asHost ? "Host" : "Guest")).trim() || "Guest";
  ensurePeerId();

  const channelName = roomChannelName(room);
  setConn("Bağlanıyor…", false);
  logLine(`Supabase Realtime: ${channelName}`);

  state.channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: state.peerId },
    },
  });

  attachChannelHandlers();

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Realtime subscribe timeout")), 12000);

    state.channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        try {
          await state.channel.track({
            peer_id: state.peerId,
            name: state.displayName,
            role: state.role,
            me_lang: canonLang($("myLang")?.value, "tr"),
            target_lang: canonLang($("targetLang")?.value, "en"),
            joined_at: wallMs(),
          });
        } catch (e) {
          logLine(`Presence track hatası: ${e?.message || e}`, "warn");
        }

        state.channelReady = true;
        setConn("Realtime bağlı", true);
        logLine("Supabase Realtime kanalı hazır", "ok");

        await broadcastEvent("peer_joined", {
          type: "peer_joined",
          peer: {
            peer_id: state.peerId,
            name: state.displayName,
            role: state.role,
          },
        });

        startRealtimePingLoop();
        resolve(true);
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        setConn("Hata", false);
        logLine(`Realtime durumu: ${status}`, "err");
        reject(new Error(status));
      }
    });
  });

  $("laneStatus").textContent = asHost
    ? "Oda oluşturuldu — Supabase Realtime aktif"
    : "Odaya katıldınız — Supabase Realtime aktif";
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

async function speakTranslatedText(text, langCode) {
  if (!state.ttsEnabled) return;

  const value = String(text || "").trim();
  if (!value) return;

  await unlockAudio();
  stopTtsPlayback();
  const tokenId = ++playback.speakToken;
  const t0 = nowMs();

  const ok = await speakViaBrowser(value, langCode);
  if (tokenId !== playback.speakToken) return;

  const ttsMs = Math.round(nowMs() - t0);
  setMetric("ttsMs", ttsMs);
  setTtsStatus(ok ? "TTS açık · tarayıcı" : "TTS kapalı", state.ttsEnabled);
  logLine(`TTS (tarayıcı, ${ttsMs}ms): ${value.slice(0, 80)}`, ok ? "ok" : "warn");
}

async function translateStaging(text, sourceLang, targetLang) {
  const value = String(text || "").trim();
  if (!value) return "";
  const src = canonLang(sourceLang, "auto");
  const tgt = canonLang(targetLang, "en");
  if (src === tgt) return value;

  const params = new URLSearchParams({
    client: "gtx",
    sl: src,
    tl: tgt,
    dt: "t",
    q: value,
  });

  const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  if (!res.ok) throw new Error(`translate_${res.status}`);
  const data = await res.json();
  const parts = Array.isArray(data?.[0])
    ? data[0].map((chunk) => String(chunk?.[0] || "")).join("")
    : "";
  return String(parts || value).trim() || value;
}

function handleRoomMessage(msg) {
  const type = String(msg?.type || "");

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

  if (type === "peer_joined" && isRemotePeer(msg)) {
    logLine(`Peer katıldı: ${msg.peer?.name || msg.name || "?"}`, "ok");
    return;
  }

  if (type === "peer_left" && isRemotePeer(msg)) {
    logLine("Peer ayrıldı", "warn");
    stopRemoteChunkPlayback();
  }
}

let pingTimer = null;
function startRealtimePingLoop() {
  clearInterval(pingTimer);
  pingTimer = setInterval(() => {
    broadcastEvent("ping", { type: "ping", client_ts: wallMs() }).catch(() => {});
  }, 4000);
}

async function publishUtterance(text, partial, clientTs) {
  const sourceLang = canonLang($("myLang")?.value, "tr");
  const targetLang = canonLang($("targetLang")?.value, "en");
  const payload = {
    type: "utterance",
    text,
    partial,
    source_lang: sourceLang,
    target_lang: targetLang,
    client_ts: clientTs,
  };

  await broadcastEvent("utterance", payload);

  if (partial) return;

  const t0 = nowMs();
  try {
    const translated = await translateStaging(text, sourceLang, targetLang);
    const translateMs = Math.round(nowMs() - t0);
    const totalMs = Math.max(translateMs, wallMs() - clientTs);

    setMetric("translateMs", translateMs);
    setMetric("totalMs", totalMs);

    await broadcastEvent("translation", {
      type: "translation",
      source_text: text,
      translated_text: translated,
      source_lang: sourceLang,
      target_lang: targetLang,
      client_ts: clientTs,
      translate_ms: translateMs,
      total_ms: totalMs,
      staging: true,
    });

    $("localFinal").textContent = text;
    logLine(`Çeviri yayınlandı (${translateMs}ms)`, "ok");
  } catch (e) {
    logLine(`Çeviri hatası: ${e?.message || e}`, "err");
  }
}

function joinStaging(asHost) {
  unlockAudio().catch(() => {});
  connectRoom($("roomCode")?.value || "", asHost).catch((e) => {
    setConn("Hata", false);
    logLine(`Bağlantı hatası: ${e?.message || e}`, "err");
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
  if (!state.channelReady) {
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
        publishUtterance(interim.trim(), true, wallMs()).catch(() => {});
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
      publishUtterance(text, false, wallMs()).catch(() => {});
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

  if (!state.channelReady) {
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
      if (b64.length > MAX_BROADCAST_B64) {
        logLine(`Ses chunk atlandı (>${MAX_BROADCAST_B64} b64)`, "warn");
        return;
      }
      state.audioSeq += 1;
      await broadcastEvent("audio_chunk", {
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
    logLine("Audio chunk Realtime stream başladı", "ok");
  } catch (e) {
    logLine(`Mikrofon izni/akış hatası: ${e?.message || e}`, "err");
  }
}

function toggleTtsEnabled() {
  state.ttsEnabled = !state.ttsEnabled;
  $("ttsBtn")?.classList.toggle("active", state.ttsEnabled);
  if (!state.ttsEnabled) stopTtsPlayback();
  setTtsStatus(state.ttsEnabled ? "TTS açık · tarayıcı" : "TTS kapalı", state.ttsEnabled);
}

function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
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
    disconnectRoom().catch(() => {});
    $("laneStatus").textContent = "Bağlantı kesildi";
  });

  $("micBtn")?.addEventListener("click", () => {
    if (state.listening) stopListening();
    else startListening();
  });

  $("audioStreamBtn")?.addEventListener("click", () => {
    toggleAudioStream().catch(() => {});
  });

  $("ttsBtn")?.addEventListener("click", () => toggleTtsEnabled());

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
  setTtsStatus("TTS açık · tarayıcı", true);
  logLine(`Staging peer: ${state.peerId}`);
  logLine("Supabase Realtime · Render WS yok", "ok");
}

bindUi();
