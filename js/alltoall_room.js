// FILE: /js/alltoall_room.js

import { supabase } from "/js/supabase_client.js";
import { getLangPoolForSite, getSiteLang } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com/api/alltoall/ws";

const $ = (id) => document.getElementById(id);
const rootStyle = document.documentElement;

const chat = $("chat");
const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");
const peopleScroll = $("peopleScroll");
const peopleCount = $("peopleCount");
const langSelect = $("langSelect");
const roomPill = $("roomPill");
const backBtn = $("backBtn");
const exitBtn = $("exitBtn");
const soundToggleBtn = $("soundToggleBtn");
const textToggleBtn = $("textToggleBtn");
const textEntry = $("textEntry");
const micHint = $("micHint");

const params = new URLSearchParams(location.search);
const hostCode = String(params.get("host") || "").trim().toUpperCase();
const role = String(params.get("role") || "guest").trim().toLowerCase();
const incomingRoomId = String(params.get("room") || "").trim().toUpperCase();

let roomId = incomingRoomId || hostCode || "";
let ws = null;
let myLang = localStorage.getItem("alltoall_lang") || "tr";
let autoSpeak = localStorage.getItem("alltoall_auto_speak") !== "0";
let recognizing = false;
let recognizer = null;
let currentAudio = null;
let voicesReady = false;
let audioCtx = null;
let preparedStream = null;
let siteLang = getSiteLang();
let LANGS = getLangPoolForSite(siteLang);

let myProfile = {
  from: "",
  from_name: role === "host" ? "Host" : "Guest",
  from_pic: "",
  me_lang: myLang,
  role,
  user_id: "",
};

let joinedPeople = new Map();

const SITE_TEXT = {
  tr: {
    soundOn: "Sesli okuma açıldı",
    soundOff: "Sesli okuma kapatıldı",
    socketNotReady: "Socket hazır değil.",
    roomMissing: "Oda bilgisi bulunamadı.",
    connected: "Bağlantı kuruldu",
    newParticipant: "Yeni katılımcı bağlandı",
    leftParticipant: "Bir katılımcı ayrıldı",
    roomNotFound: "Kanal bulunamadı.",
    hostNotReady: "Host henüz odaya giriş yapmadı.",
    connectionError: "Bağlantı hatası oluştu.",
    connectionClosed: "Bağlantı kapandı.",
    roomCopied: "Oda kodu kopyalandı",
    roomNotCreated: "Bu oda henüz oluşturulmamış.",
    participant: "Katılımcı",
    host: "Host",
    guest: "Guest",
    typingPlaceholder: "Yazmaya başla...",
    micHint: "Konuşmak için mikrofona dokun. Yazmak istersen klavye simgesine bas.",
    micListening: "Dinleniyor... Bitince tekrar dokun.",
    micUnsupported: "Bu cihazda konuşma algılama desteklenmiyor.",
    micDenied: "Mikrofon izni gerekli.",
    voiceAuto: "Ses: Otomatik",
    voiceFemale: "Ses: Kadın",
    voiceMale: "Ses: Erkek",
    voiceClone: "Ses: Kendi Sesim",
    textOpen: "Yazı alanı açıldı",
    textClosed: "Yazı alanı kapatıldı"
  },
  en: {
    soundOn: "Voice playback enabled",
    soundOff: "Voice playback disabled",
    socketNotReady: "Socket is not ready.",
    roomMissing: "Room information not found.",
    connected: "Connected",
    newParticipant: "A new participant joined",
    leftParticipant: "A participant left",
    roomNotFound: "Channel not found.",
    hostNotReady: "Host has not entered the room yet.",
    connectionError: "A connection error occurred.",
    connectionClosed: "Connection closed.",
    roomCopied: "Room code copied",
    roomNotCreated: "This room has not been created yet.",
    participant: "Participant",
    host: "Host",
    guest: "Guest",
    typingPlaceholder: "Start typing...",
    micHint: "Tap the microphone to speak. Tap keyboard if you want to type.",
    micListening: "Listening... Tap again when finished.",
    micUnsupported: "Speech recognition is not supported on this device.",
    micDenied: "Microphone permission required.",
    voiceAuto: "Voice: Auto",
    voiceFemale: "Voice: Female",
    voiceMale: "Voice: Male",
    voiceClone: "Voice: My Voice",
    textOpen: "Text input opened",
    textClosed: "Text input closed"
  },
  de: {
    soundOn: "Sprachausgabe aktiviert",
    soundOff: "Sprachausgabe deaktiviert",
    socketNotReady: "Socket ist nicht bereit.",
    roomMissing: "Rauminformation nicht gefunden.",
    connected: "Verbunden",
    newParticipant: "Ein neuer Teilnehmer ist beigetreten",
    leftParticipant: "Ein Teilnehmer hat den Raum verlassen",
    roomNotFound: "Kanal nicht gefunden.",
    hostNotReady: "Der Host hat den Raum noch nicht betreten.",
    connectionError: "Verbindungsfehler aufgetreten.",
    connectionClosed: "Verbindung geschlossen.",
    roomCopied: "Raumcode kopiert",
    roomNotCreated: "Dieser Raum wurde noch nicht erstellt.",
    participant: "Teilnehmer",
    host: "Host",
    guest: "Gast",
    typingPlaceholder: "Schreiben...",
    micHint: "Zum Sprechen auf das Mikrofon tippen. Für Text auf das Tastatursymbol tippen.",
    micListening: "Hört zu... Zum Beenden erneut tippen.",
    micUnsupported: "Spracherkennung wird auf diesem Gerät nicht unterstützt.",
    micDenied: "Mikrofonberechtigung erforderlich.",
    voiceAuto: "Stimme: Auto",
    voiceFemale: "Stimme: Weiblich",
    voiceMale: "Stimme: Männlich",
    voiceClone: "Stimme: Meine Stimme",
    textOpen: "Texteingabe geöffnet",
    textClosed: "Texteingabe geschlossen"
  },
  fr: {
    soundOn: "Lecture vocale activée",
    soundOff: "Lecture vocale désactivée",
    socketNotReady: "Socket non prêt.",
    roomMissing: "Informations de salle introuvables.",
    connected: "Connecté",
    newParticipant: "Un nouveau participant a rejoint",
    leftParticipant: "Un participant a quitté",
    roomNotFound: "Canal introuvable.",
    hostNotReady: "L’hôte n’est pas encore entré dans la salle.",
    connectionError: "Erreur de connexion.",
    connectionClosed: "Connexion fermée.",
    roomCopied: "Code de salle copié",
    roomNotCreated: "Cette salle n’a pas encore été créée.",
    participant: "Participant",
    host: "Hôte",
    guest: "Invité",
    typingPlaceholder: "Commencez à écrire...",
    micHint: "Touchez le micro pour parler. Touchez le clavier si vous voulez écrire.",
    micListening: "Écoute... Touchez encore une fois quand c’est terminé.",
    micUnsupported: "La reconnaissance vocale n’est pas prise en charge sur cet appareil.",
    micDenied: "Autorisation micro requise.",
    voiceAuto: "Voix : Auto",
    voiceFemale: "Voix : Femme",
    voiceMale: "Voix : Homme",
    voiceClone: "Voix : Ma voix",
    textOpen: "Saisie texte ouverte",
    textClosed: "Saisie texte fermée"
  },
  it: {
    soundOn: "Lettura vocale attivata",
    soundOff: "Lettura vocale disattivata",
    socketNotReady: "Socket non pronto.",
    roomMissing: "Informazioni stanza non trovate.",
    connected: "Connesso",
    newParticipant: "Un nuovo partecipante è entrato",
    leftParticipant: "Un partecipante è uscito",
    roomNotFound: "Canale non trovato.",
    hostNotReady: "L'host non è ancora entrato nella stanza.",
    connectionError: "Errore di connessione.",
    connectionClosed: "Connessione chiusa.",
    roomCopied: "Codice stanza copiato",
    roomNotCreated: "Questa stanza non è stata ancora creata.",
    participant: "Partecipante",
    host: "Host",
    guest: "Ospite",
    typingPlaceholder: "Inizia a scrivere...",
    micHint: "Tocca il microfono per parlare. Tocca la tastiera se vuoi scrivere.",
    micListening: "In ascolto... Tocca di nuovo quando hai finito.",
    micUnsupported: "Il riconoscimento vocale non è supportato su questo dispositivo.",
    micDenied: "Autorizzazione microfono richiesta.",
    voiceAuto: "Voce: Auto",
    voiceFemale: "Voce: Donna",
    voiceMale: "Voce: Uomo",
    voiceClone: "Voce: La mia voce",
    textOpen: "Input testo aperto",
    textClosed: "Input testo chiuso"
  },
  es: {
    soundOn: "Lectura de voz activada",
    soundOff: "Lectura de voz desactivada",
    socketNotReady: "Socket no está listo.",
    roomMissing: "No se encontró información de la sala.",
    connected: "Conectado",
    newParticipant: "Se unió un nuevo participante",
    leftParticipant: "Un participante salió",
    roomNotFound: "Canal no encontrado.",
    hostNotReady: "El host todavía no ha entrado en la sala.",
    connectionError: "Se produjo un error de conexión.",
    connectionClosed: "Conexión cerrada.",
    roomCopied: "Código de sala copiado",
    roomNotCreated: "Esta sala todavía no ha sido creada.",
    participant: "Participante",
    host: "Host",
    guest: "Invitado",
    typingPlaceholder: "Empieza a escribir...",
    micHint: "Toca el micrófono para hablar. Toca el teclado si quieres escribir.",
    micListening: "Escuchando... Toca otra vez al terminar.",
    micUnsupported: "El reconocimiento de voz no es compatible con este dispositivo.",
    micDenied: "Se requiere permiso de micrófono.",
    voiceAuto: "Voz: Auto",
    voiceFemale: "Voz: Mujer",
    voiceMale: "Voz: Hombre",
    voiceClone: "Voz: Mi voz",
    textOpen: "Entrada de texto abierta",
    textClosed: "Entrada de texto cerrada"
  }
};

function st(key) {
  const pack = SITE_TEXT[siteLang] || SITE_TEXT.tr;
  return pack[key] || SITE_TEXT.tr[key] || key;
}

function refreshSiteLangState() {
  siteLang = getSiteLang();
  LANGS = getLangPoolForSite(siteLang);
}

function toBCP(code) {
  const map = {
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
    pt: "pt-PT",
    "pt-br": "pt-BR",
    nl: "nl-NL",
    sv: "sv-SE",
    no: "no-NO",
    da: "da-DK",
    fi: "fi-FI",
    pl: "pl-PL",
    cs: "cs-CZ",
    sk: "sk-SK",
    hu: "hu-HU",
    ro: "ro-RO",
    bg: "bg-BG",
    uk: "uk-UA",
    ar: "ar-SA",
    he: "he-IL",
    fa: "fa-IR",
    ur: "ur-PK",
    hi: "hi-IN",
    bn: "bn-BD",
    id: "id-ID",
    ms: "ms-MY",
    vi: "vi-VN",
    th: "th-TH",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR"
  };
  return map[String(code || "tr").toLowerCase()] || "tr-TR";
}

function canonical(code) {
  return String(code || "tr").toLowerCase().trim();
}

function getVoicePreference() {
  const v = String(
    localStorage.getItem("tts_voice") ||
    localStorage.getItem("live_interpreter_voice") ||
    "auto"
  ).toLowerCase().trim();

  if (["auto", "female", "male", "clone"].includes(v)) return v;
  return "auto";
}

function getVoiceLabel() {
  const v = getVoicePreference();
  if (v === "female") return st("voiceFemale");
  if (v === "male") return st("voiceMale");
  if (v === "clone") return st("voiceClone");
  return st("voiceAuto");
}

function getDisplayNameFromUser(user) {
  const meta = user?.user_metadata || {};
  return (
    meta.display_name ||
    meta.full_name ||
    meta.name ||
    user?.email?.split("@")[0] ||
    (role === "host" ? st("host") : st("guest"))
  );
}

function getAvatarFromUser(user) {
  const meta = user?.user_metadata || {};
  return meta.picture || meta.avatar_url || meta.avatar || "";
}

function getStableFromId(user) {
  return (
    user?.id ||
    user?.email ||
    `${role}-${Math.random().toString(36).slice(2, 10)}`
  );
}

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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

async function hydrateMyProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    myProfile = {
      from: getStableFromId(user),
      from_name: getDisplayNameFromUser(user),
      from_pic: getAvatarFromUser(user),
      me_lang: myLang,
      role,
      user_id: user?.id || "",
    };
  } catch (e) {
    console.warn("[alltoall hydrateMyProfile]", e);
  }
}

function applyStaticSiteTexts() {
  try {
    document.documentElement.setAttribute("lang", siteLang);
  } catch {}

  if (msgInput) msgInput.placeholder = st("typingPlaceholder");
  if (micHint) micHint.textContent = `${st("micHint")} • ${getVoiceLabel()}`;
}

function buildLangSelect() {
  if (!langSelect) return;

  langSelect.innerHTML = "";
  LANGS.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.code;
    opt.textContent = `${l.flag} ${l.name}`;
    langSelect.appendChild(opt);
  });

  langSelect.value = myLang;

  langSelect.addEventListener("change", () => {
    myLang = canonical(langSelect.value);
    localStorage.setItem("alltoall_lang", myLang);
    myProfile.me_lang = myLang;

    if (recognizer) recognizer.lang = toBCP(myLang);

    if (ws && ws.readyState === WebSocket.OPEN) {
      sendWs({
        type: "profile_sync",
        from_name: myProfile.from_name,
        from_pic: myProfile.from_pic,
        me_lang: myLang,
        user_id: myProfile.user_id,
      });
    }

    addSystemMessage(`${langSelect.options[langSelect.selectedIndex]?.textContent || myLang.toUpperCase()}`);
  });
}

function updateSoundButton() {
  if (!soundToggleBtn) return;
  soundToggleBtn.textContent = autoSpeak ? "🔊" : "🔇";
  soundToggleBtn.title = autoSpeak ? st("soundOn") : st("soundOff");
}

function updateMicUI() {
  if (!micHint) return;
  micHint.textContent = recognizing
    ? `${st("micListening")} • ${getVoiceLabel()}`
    : `${st("micHint")} • ${getVoiceLabel()}`;
}

function stopAudio() {
  try {
    currentAudio?.pause?.();
    currentAudio = null;
  } catch {}
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
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

async function warmAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
    }
  } catch (e) {
    console.warn("[alltoall warmAudio]", e);
  }

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}
}

async function prepareEnhancedMic() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return;
    if (preparedStream) return;

    preparedStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      },
      video: false
    });
  } catch (e) {
    console.warn("[alltoall enhanced mic]", e);
  }
}

async function speakViaApi(text, langCode) {
  const userId = await getCurrentUserId();
  const voice = getVoicePreference();

  const r = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: canonical(langCode),
      user_id: userId,
      module: "alltoall",
      voice
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

  const base = canonical(langCode);
  const bcp = toBCP(langCode).toLowerCase();
  const pref = getVoicePreference();

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(base));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;

  if (pref === "female") {
    return (
      pool.find((v) => /female|woman|zira|aria|seda|helena|jenny|susan|eva|anna|emma/i.test(v.name)) ||
      pool[0]
    );
  }

  if (pref === "male") {
    return (
      pool.find((v) => /male|man|david|mark|george|james|alex|tom|jon|paul/i.test(v.name)) ||
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
    } catch (e) {
      console.warn("[alltoall native tts]", e);
    }
  }

  if (!window.speechSynthesis) return;

  try {
    if (!voicesReady) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}

  const u = new SpeechSynthesisUtterance(value);
  u.lang = toBCP(langCode);
  u.rate = c === "en" ? 0.82 : ["de", "fr", "it", "es"].includes(c) ? 0.88 : 0.92;
  u.pitch = 1.0;
  u.volume = 1;

  const voice = chooseWebVoice(langCode);
  if (voice) u.voice = voice;

  setTimeout(() => {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, 60);
}

async function speakText(text, langCode) {
  const value = String(text || "").trim();
  if (!value || !autoSpeak) return;

  const voice = getVoicePreference();

  if (voice === "auto") {
    speakFallback(value, langCode);
    return;
  }

  if (voice === "clone") {
    try {
      const ready = await hasReadyVoiceProfile();
      if (!ready) {
        speakFallback(value, langCode);
        return;
      }
      await speakViaApi(value, langCode);
      return;
    } catch (e) {
      console.warn("[alltoall clone fail]", e);
      speakFallback(value, langCode);
      return;
    }
  }

  try {
    await speakViaApi(value, langCode);
  } catch (e) {
    console.warn("[alltoall api tts fail]", e);
    speakFallback(value, langCode);
  }
}

function toggleSound() {
  autoSpeak = !autoSpeak;
  localStorage.setItem("alltoall_auto_speak", autoSpeak ? "1" : "0");
  updateSoundButton();
  addSystemMessage(autoSpeak ? st("soundOn") : st("soundOff"));
}

function personKey(person) {
  return String(
    person?.from ||
    person?.user_id ||
    person?.role ||
    person?.from_name ||
    Math.random().toString(36).slice(2)
  );
}

function renderPeople() {
  if (!peopleScroll) return;

  peopleScroll.innerHTML = "";
  const arr = [...joinedPeople.values()];

  arr.forEach((person) => {
    const wrap = document.createElement("div");
    wrap.className = "pItem";

    const avatar = document.createElement("div");
    avatar.className = "pAvatar";

    if (person.from_pic) {
      const img = document.createElement("img");
      img.src = person.from_pic;
      img.alt = person.from_name || st("participant");
      img.referrerPolicy = "no-referrer";
      avatar.appendChild(img);
    } else {
      avatar.textContent = getInitials(person.from_name);
    }

    const label = document.createElement("div");
    label.className = "pName";
    label.textContent = person.from_name || st("participant");

    wrap.appendChild(avatar);
    wrap.appendChild(label);
    peopleScroll.appendChild(wrap);
  });

  if (peopleCount) peopleCount.textContent = String(arr.length || 0);
}

function ensureSelfInPeople() {
  const key = personKey(myProfile);
  joinedPeople.set(key, { ...myProfile });
  renderPeople();
}

function applyRoster(roster = []) {
  joinedPeople.clear();

  if (Array.isArray(roster)) {
    roster.forEach((person) => {
      const key = personKey(person);
      joinedPeople.set(key, {
        from: person?.from || "",
        from_name: person?.from_name || st("participant"),
        from_pic: person?.from_pic || "",
        me_lang: person?.me_lang || "tr",
        role: person?.role || "guest",
        user_id: person?.user_id || "",
      });
    });
  }

  const existsSelf = [...joinedPeople.values()].some((p) =>
    (p.from && p.from === myProfile.from) ||
    (p.user_id && p.user_id === myProfile.user_id)
  );

  if (!existsSelf) ensureSelfInPeople();
  else renderPeople();
}

function upsertPerson(person) {
  if (!person) return;
  const key = personKey(person);
  joinedPeople.set(key, {
    from: person?.from || "",
    from_name: person?.from_name || st("participant"),
    from_pic: person?.from_pic || "",
    me_lang: person?.me_lang || "tr",
    role: person?.role || "guest",
    user_id: person?.user_id || "",
  });
  renderPeople();
}

function removePerson(person) {
  if (!person) return;
  const key = personKey(person);

  if (joinedPeople.has(key)) {
    joinedPeople.delete(key);
  } else {
    for (const [k, v] of joinedPeople.entries()) {
      if (
        (person.from && v.from === person.from) ||
        (person.user_id && v.user_id === person.user_id)
      ) {
        joinedPeople.delete(k);
      }
    }
  }

  renderPeople();
}

function scrollChatBottom() {
  if (!chat) return;
  requestAnimationFrame(() => {
    try { chat.scrollTop = chat.scrollHeight; } catch {}
  });
}

function addSystemMessage(text) {
  if (!chat) return;

  const div = document.createElement("div");
  div.className = "sys-note";
  div.textContent = String(text || "").trim();
  chat.appendChild(div);
  scrollChatBottom();
}

function addMessage({ side = "left", sender = "", text = "", withSpeaker = false, speakLang = "tr" }) {
  const safeText = String(text || "").trim();
  if (!safeText || !chat) return;

  const row = document.createElement("div");
  row.className = `msg-row ${side}`;

  const label = document.createElement("div");
  label.className = "sender-name";
  label.textContent = sender || (side === "right" ? myProfile.from_name : st("participant"));

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = safeText;

  row.appendChild(label);
  row.appendChild(bubble);

  if (withSpeaker) {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    const btn = document.createElement("button");
    btn.className = "mini-btn";
    btn.type = "button";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 10v4h4l5 4V6L7 10H3"></path>
        <path d="M16 8a4 4 0 0 1 0 8"></path>
        <path d="M19 5a8 8 0 0 1 0 14"></path>
      </svg>
    `;
    btn.addEventListener("click", () => speakText(safeText, speakLang));
    actions.appendChild(btn);
    row.appendChild(actions);
  }

  chat.appendChild(row);
  scrollChatBottom();
}

function autoGrowTextarea() {
  if (!msgInput) return;
  msgInput.style.height = "44px";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 140) + "px";
}

function sendWs(payload) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      addSystemMessage(st("socketNotReady"));
    }
  } catch (e) {
    console.warn("[alltoall sendWs]", e);
  }
}

async function resolveRoomForGuestByHost() {
  if (!hostCode || role !== "guest") return;

  const r = await fetch(`${API_BASE}/interpreter/resolve-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host_code: hostCode,
      my_lang: myLang,
      mode: "alltoall"
    })
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.room_id) {
    throw new Error(j?.detail || j?.error || "Room çözülemedi");
  }

  roomId = String(j.room_id || "").trim().toUpperCase();
}

function connectSocket() {
  if (!roomId) {
    addSystemMessage(st("roomMissing"));
    return;
  }

  const wsUrl = `${WS_BASE}/${encodeURIComponent(roomId)}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    sendWs({
      type: role === "host" ? "create" : "join",
      from: myProfile.from,
      from_name: myProfile.from_name,
      from_pic: myProfile.from_pic,
      me_lang: myLang,
      role,
      user_id: myProfile.user_id,
      host_code: hostCode || roomId
    });
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const type = String(data?.type || "").trim();

      if (type === "room_created" || type === "room_joined") {
        if (data.self) {
          myProfile = {
            ...myProfile,
            ...data.self,
            me_lang: myLang,
          };
        }

        roomId = String(data.room || roomId || "").trim().toUpperCase();
        if (roomPill) roomPill.textContent = hostCode || roomId || "------";
        ensureSelfInPeople();
        addSystemMessage(st("connected"));
        return;
      }

      if (type === "presence") {
        applyRoster(data.roster || []);
        return;
      }

      if (type === "peer_joined") {
        if (data.peer) upsertPerson(data.peer);
        if (Array.isArray(data.roster)) applyRoster(data.roster);
        addSystemMessage(st("newParticipant"));
        return;
      }

      if (type === "profile_updated") {
        if (data.peer) upsertPerson(data.peer);
        if (Array.isArray(data.roster)) applyRoster(data.roster);
        return;
      }

      if (type === "peer_left") {
        if (data.peer) removePerson(data.peer);
        if (Array.isArray(data.roster)) applyRoster(data.roster);
        addSystemMessage(st("leftParticipant"));
        return;
      }

      if (type === "translated_message") {
        const fromId = String(data.from || "").trim();
        const senderName = String(data.from_name || st("participant")).trim();
        const translated = String(data.translated_text || "").trim();
        const original = String(data.original_text || "").trim();
        const finalText = translated || original;

        if (!finalText) return;
        if (fromId && myProfile.from && fromId === myProfile.from) return;

        addMessage({
          side: "left",
          sender: senderName,
          text: finalText,
          withSpeaker: true,
          speakLang: myLang
        });

        if (data.from || data.from_name || data.from_pic) {
          upsertPerson({
            from: data.from || "",
            from_name: data.from_name || senderName,
            from_pic: data.from_pic || "",
            me_lang: data.from_lang || "tr",
            role: data.role || "guest",
            user_id: data.from_user_id || "",
          });
        }

        if (autoSpeak) {
          speakText(finalText, myLang);
        }
        return;
      }

      if (type === "room_not_found") {
        addSystemMessage(data.message || st("roomNotFound"));
        return;
      }

      if (type === "error") {
        const msg = String(data.message || "Bağlantı hatası");
        addSystemMessage(msg === "HOST_NOT_READY" ? st("hostNotReady") : msg);
      }
    } catch (e) {
      console.warn("[alltoall ws parse]", e);
    }
  };

  ws.onerror = () => {
    addSystemMessage(st("connectionError"));
  };

  ws.onclose = () => {
    addSystemMessage(st("connectionClosed"));
  };
}

function sendMessage() {
  const text = String(msgInput?.value || "").trim();
  if (!text) return;

  addMessage({
    side: "right",
    sender: myProfile.from_name,
    text,
    withSpeaker: false,
    speakLang: myLang
  });

  sendWs({
    type: "message",
    text,
    lang: myLang
  });

  msgInput.value = "";
  autoGrowTextarea();
  scrollChatBottom();
}

function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    if (micBtn) micBtn.style.display = "none";
    addSystemMessage(st("micUnsupported"));
    return;
  }

  recognizer = new SR();
  recognizer.lang = toBCP(myLang);
  recognizer.interimResults = false;
  recognizer.continuous = false;
  recognizer.maxAlternatives = 1;

  recognizer.onresult = (e) => {
    const text = e.results?.[0]?.[0]?.transcript || "";
    msgInput.value = text;
    sendMessage();
  };

  recognizer.onend = () => {
    recognizing = false;
    micBtn?.classList.remove("listening");
    updateMicUI();
  };

  recognizer.onerror = (e) => {
    recognizing = false;
    micBtn?.classList.remove("listening");
    updateMicUI();

    if (String(e?.error || "").includes("not-allowed")) {
      addSystemMessage(st("micDenied"));
    }
  };
}

async function toggleMic() {
  if (!recognizer) return;

  try {
    await warmAudio();
    await prepareEnhancedMic();
  } catch {}

  if (recognizing) {
    recognizer.stop();
    recognizing = false;
    micBtn?.classList.remove("listening");
    updateMicUI();
    return;
  }

  try {
    recognizing = true;
    micBtn?.classList.add("listening");
    recognizer.lang = toBCP(myLang);
    recognizer.start();
    updateMicUI();
  } catch (e) {
    recognizing = false;
    micBtn?.classList.remove("listening");
    updateMicUI();
    console.warn("[alltoall mic start]", e);
  }
}

function installKeyboardLift() {
  const vv = window.visualViewport;
  if (!vv) return;

  const apply = () => {
    try {
      const winH = window.innerHeight || document.documentElement.clientHeight || 0;
      const vvH = vv.height || 0;
      const vvTop = vv.offsetTop || 0;

      let keyboardHeight = Math.max(0, winH - vvH - vvTop);

      const active = document.activeElement;
      const isTyping =
        active === msgInput ||
        active?.tagName === "TEXTAREA" ||
        active?.tagName === "INPUT";

      if (!isTyping) keyboardHeight = 0;

      const lift = keyboardHeight > 80 ? keyboardHeight : 0;
      rootStyle.style.setProperty("--kb-offset", `${lift}px`);

      setTimeout(() => {
        try {
          msgInput?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          scrollChatBottom();
        } catch {}
      }, 40);
    } catch (e) {
      console.warn("[alltoall keyboard]", e);
    }
  };

  vv.addEventListener("resize", apply);
  vv.addEventListener("scroll", apply);
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", apply);

  msgInput?.addEventListener("focus", () => {
    setTimeout(apply, 80);
    setTimeout(apply, 180);
    setTimeout(apply, 320);
    setTimeout(apply, 520);
  });

  msgInput?.addEventListener("blur", () => {
    setTimeout(() => {
      rootStyle.style.setProperty("--kb-offset", "0px");
    }, 150);
  });

  apply();
}

function toggleTextEntry() {
  if (!textEntry) return;
  const willShow = !textEntry.classList.contains("show");
  textEntry.classList.toggle("show", willShow);

  if (willShow) {
    addSystemMessage(st("textOpen"));
    setTimeout(() => {
      try { msgInput?.focus(); } catch {}
    }, 80);
  } else {
    addSystemMessage(st("textClosed"));
    try { msgInput?.blur(); } catch {}
  }
}

function bindEvents() {
  sendBtn?.addEventListener("click", () => {
    const hasTextBox = !!textEntry?.classList.contains("show");
    const hasText = !!String(msgInput?.value || "").trim();

    if (hasTextBox && hasText) {
      sendMessage();
      return;
    }

    toggleTextEntry();
  });

  msgInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  msgInput?.addEventListener("input", () => {
    autoGrowTextarea();
    scrollChatBottom();
  });

  micBtn?.addEventListener("click", toggleMic);
  soundToggleBtn?.addEventListener("click", toggleSound);
  textToggleBtn?.addEventListener("click", toggleTextEntry);

  roomPill?.addEventListener("click", async () => {
    const codeToCopy = hostCode || roomId;
    if (!codeToCopy) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      addSystemMessage(`${st("roomCopied")}: ${codeToCopy}`);
    } catch {}
  });

  backBtn?.addEventListener("click", () => history.back());

  exitBtn?.addEventListener("click", () => {
    stopAudio();
    try { ws?.close?.(); } catch {}
    location.href = "/pages/alltoall.html";
  });

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        try { window.speechSynthesis.getVoices(); } catch {}
        voicesReady = true;
      };
    }
  } catch {}

  window.addEventListener("focus", () => {
    const next = getSiteLang();
    if (next !== siteLang) {
      refreshSiteLangState();
      applyStaticSiteTexts();
      buildLangSelect();
      updateSoundButton();
      updateMicUI();
    } else {
      updateMicUI();
    }
  });
}

async function init() {
  refreshSiteLangState();
  applyStaticSiteTexts();

  if (roomPill) roomPill.textContent = hostCode || roomId || "------";

  await hydrateMyProfile();
  buildLangSelect();
  updateSoundButton();
  initSpeech();
  bindEvents();
  installKeyboardLift();
  ensureSelfInPeople();
  autoGrowTextarea();
  scrollChatBottom();
  updateMicUI();

  try {
    await warmAudio();
    await prepareEnhancedMic();
  } catch {}

  try {
    if (role === "guest" && !incomingRoomId && hostCode) {
      await resolveRoomForGuestByHost();
    }
  } catch (e) {
    console.error("[alltoall resolve guest room]", e);
    addSystemMessage(st("roomNotCreated"));
    return;
  }

  connectSocket();
}

init();

window.addEventListener("beforeunload", () => {
  stopAudio();
  try { ws?.close?.(); } catch {}
  try { preparedStream?.getTracks?.().forEach((t) => t.stop()); } catch {}
});
