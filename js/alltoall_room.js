// FILE: /js/alltoall_room.js

import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

try {
  mountShell({ scroll: "none" });
} catch (e) {
  console.warn("[alltoall room shell]", e);
}

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com/api/alltoall/ws";

const $ = (id) => document.getElementById(id);

/* =========================
   DOM
========================= */
const pageContent = $("pageContent");
const roomPill = $("roomPill");
const langSelect = $("langSelect");
const langPickerBtn = $("langPickerBtn");
const langPickerText = $("langPickerText");
const peopleScroll = $("peopleScroll");
const participantsCount = $("participantsCount");
const chat = $("chat");
const micBtn = $("micBtn");
const micHint = $("micHint");
const langSheet = $("langSheet");
const langSheetList = $("langSheetList");
const langSheetBackdrop = $("langSheetBackdrop");
const langSheetClose = $("langSheetClose");
const langSheetTitle = $("langSheetTitle");

/* =========================
   URL / STATE
========================= */
const params = new URLSearchParams(location.search);
const hostCode = String(params.get("host") || "").trim().toUpperCase();
const role = String(params.get("role") || "guest").trim().toLowerCase();
const incomingRoomId = String(params.get("room") || "").trim().toUpperCase();

let roomId = incomingRoomId || hostCode || "";
let ws = null;
let reconnectTimer = null;
let manualClose = false;

let recognizing = false;
let recognizer = null;
let recordingSide = null;
let currentAudio = null;
let voicesReady = false;
let audioCtx = null;
let preparedStream = null;
let autoSpeak = true;
let bootReady = false;
let bootStarted = false;
let bootPromise = null;

let siteLang = getSiteLang();
let LANGS = buildLangPoolForSite(siteLang);
let myLang = canonical(localStorage.getItem("alltoall_lang") || "tr");

let myProfile = {
  from: "",
  from_name: role === "host" ? "Host" : "Guest",
  from_pic: "",
  me_lang: myLang,
  role,
  user_id: "",
};

let joinedPeople = new Map();

/* =========================
   SITE TEXT
========================= */
const SITE_TEXT = {
  tr: {
    speakHint: "Konuşmak için mikrofona dokun.",
    listeningHint: "Konuşmanız bitince mikrofona tekrar basınız.",
    preparing: "Sistem hazırlanıyor...",
    translating: "Gönderiliyor...",
    roomCopied: "Oda kodu kopyalandı",
    socketNotReady: "Bağlantı henüz hazır değil.",
    roomMissing: "Oda bilgisi bulunamadı.",
    roomCreated: "Bağlantı kuruldu",
    peerJoined: "Yeni katılımcı bağlandı",
    peerLeftNamed: "{name} ayrıldı",
    roomNotFound: "Kanal bulunamadı.",
    hostNotReady: "Host henüz odaya giriş yapmadı.",
    roomNotCreated: "Bu oda henüz oluşturulmamış.",
    connectionError: "Bağlantı hatası oluştu.",
    connectionClosed: "Bağlantı koptu. Yeniden bağlanıyor...",
    micUnsupported: "Bu cihazda konuşma algılama desteklenmiyor.",
    micDenied: "Mikrofon izni gerekli.",
    micNoSpeech: "Konuşma algılanamadı. Tekrar deneyin.",
    micFailed: "Mikrofon başlatılamadı. Tekrar deneyin.",
    selectLanguage: "Dil Seç",
    participant: "Katılımcı",
    langUpdated: "Dil güncellendi"
  },
  en: {
    speakHint: "Tap the microphone to speak.",
    listeningHint: "Press the microphone again when you finish speaking.",
    preparing: "System is preparing...",
    translating: "Sending...",
    roomCopied: "Room code copied",
    socketNotReady: "Connection is not ready yet.",
    roomMissing: "Room information not found.",
    roomCreated: "Connected",
    peerJoined: "A new participant joined",
    peerLeftNamed: "{name} left",
    roomNotFound: "Channel not found.",
    hostNotReady: "Host has not entered the room yet.",
    roomNotCreated: "This room has not been created yet.",
    connectionError: "A connection error occurred.",
    connectionClosed: "Connection dropped. Reconnecting...",
    micUnsupported: "Speech recognition is not supported on this device.",
    micDenied: "Microphone permission required.",
    micNoSpeech: "Speech was not detected. Please try again.",
    micFailed: "Microphone could not be started. Please try again.",
    selectLanguage: "Select Language",
    participant: "Participant",
    langUpdated: "Language updated"
  },
  de: {
    speakHint: "Zum Sprechen auf das Mikrofon tippen.",
    listeningHint: "Drücken Sie das Mikrofon erneut, wenn Sie fertig gesprochen haben.",
    preparing: "System wird vorbereitet...",
    translating: "Wird gesendet...",
    roomCopied: "Raumcode kopiert",
    socketNotReady: "Verbindung ist noch nicht bereit.",
    roomMissing: "Rauminformation nicht gefunden.",
    roomCreated: "Verbunden",
    peerJoined: "Ein neuer Teilnehmer ist beigetreten",
    peerLeftNamed: "{name} hat den Raum verlassen",
    roomNotFound: "Kanal nicht gefunden.",
    hostNotReady: "Der Host hat den Raum noch nicht betreten.",
    roomNotCreated: "Dieser Raum wurde noch nicht erstellt.",
    connectionError: "Verbindungsfehler aufgetreten.",
    connectionClosed: "Verbindung unterbrochen. Neuverbindung...",
    micUnsupported: "Spracherkennung wird auf diesem Gerät nicht unterstützt.",
    micDenied: "Mikrofonberechtigung erforderlich.",
    micNoSpeech: "Keine Sprache erkannt. Bitte erneut versuchen.",
    micFailed: "Mikrofon konnte nicht gestartet werden. Bitte erneut versuchen.",
    selectLanguage: "Sprache wählen",
    participant: "Teilnehmer",
    langUpdated: "Sprache aktualisiert"
  },
  fr: {
    speakHint: "Touchez le micro pour parler.",
    listeningHint: "Appuyez de nouveau sur le micro quand vous avez fini de parler.",
    preparing: "Le système se prépare...",
    translating: "Envoi...",
    roomCopied: "Code de salle copié",
    socketNotReady: "La connexion n'est pas encore prête.",
    roomMissing: "Informations de salle introuvables.",
    roomCreated: "Connecté",
    peerJoined: "Un nouveau participant a rejoint",
    peerLeftNamed: "{name} a quitté la salle",
    roomNotFound: "Canal introuvable.",
    hostNotReady: "L’hôte n’est pas encore entré dans la salle.",
    roomNotCreated: "Cette salle n’a pas encore été créée.",
    connectionError: "Erreur de connexion.",
    connectionClosed: "Connexion perdue. Reconnexion...",
    micUnsupported: "La reconnaissance vocale n’est pas prise en charge sur cet appareil.",
    micDenied: "Autorisation micro requise.",
    micNoSpeech: "Aucune parole détectée. Réessayez.",
    micFailed: "Le micro n’a pas pu démarrer. Réessayez.",
    selectLanguage: "Choisir la langue",
    participant: "Participant",
    langUpdated: "Langue mise à jour"
  },
  it: {
    speakHint: "Tocca il microfono per parlare.",
    listeningHint: "Premi di nuovo il microfono quando hai finito di parlare.",
    preparing: "Sistema in preparazione...",
    translating: "Invio...",
    roomCopied: "Codice stanza copiato",
    socketNotReady: "La connessione non è ancora pronta.",
    roomMissing: "Informazioni stanza non trovate.",
    roomCreated: "Connesso",
    peerJoined: "Un nuovo partecipante è entrato",
    peerLeftNamed: "{name} è uscito",
    roomNotFound: "Canale non trovato.",
    hostNotReady: "L'host non è ancora entrato nella stanza.",
    roomNotCreated: "Questa stanza non è stata ancora creata.",
    connectionError: "Errore di connessione.",
    connectionClosed: "Connessione persa. Riconnessione...",
    micUnsupported: "Il riconoscimento vocale non è supportato su questo dispositivo.",
    micDenied: "Autorizzazione microfono richiesta.",
    micNoSpeech: "Voce non rilevata. Riprova.",
    micFailed: "Impossibile avviare il microfono. Riprova.",
    selectLanguage: "Scegli lingua",
    participant: "Partecipante",
    langUpdated: "Lingua aggiornata"
  },
  es: {
    speakHint: "Toca el micrófono para hablar.",
    listeningHint: "Pulse el micrófono otra vez cuando termine de hablar.",
    preparing: "El sistema se está preparando...",
    translating: "Enviando...",
    roomCopied: "Código de sala copiado",
    socketNotReady: "La conexión todavía no está lista.",
    roomMissing: "No se encontró información de la sala.",
    roomCreated: "Conectado",
    peerJoined: "Se unió un nuevo participante",
    peerLeftNamed: "{name} salió",
    roomNotFound: "Canal no encontrado.",
    hostNotReady: "El host todavía no ha entrado en la sala.",
    roomNotCreated: "Esta sala todavía no ha sido creada.",
    connectionError: "Se produjo un error de conexión.",
    connectionClosed: "Conexión perdida. Reconectando...",
    micUnsupported: "El reconocimiento de voz no es compatible con este dispositivo.",
    micDenied: "Se requiere permiso de micrófono.",
    micNoSpeech: "No se detectó voz. Inténtalo de nuevo.",
    micFailed: "No se pudo iniciar el micrófono. Inténtalo de nuevo.",
    selectLanguage: "Elegir idioma",
    participant: "Participante",
    langUpdated: "Idioma actualizado"
  }
};

function st(key) {
  const pack = SITE_TEXT[siteLang] || SITE_TEXT.tr;
  return pack[key] || SITE_TEXT.tr[key] || key;
}

function stf(key, vars = {}) {
  let text = st(key);
  Object.entries(vars).forEach(([k, v]) => {
    text = text.replaceAll(`{${k}}`, String(v ?? ""));
  });
  return text;
}

/* =========================
   HELPERS
========================= */
function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

function getSiteLang() {
  const v = canonical(localStorage.getItem("system_lang") || "tr");
  return ["tr", "en", "de", "fr", "it", "es"].includes(v) ? v : "tr";
}

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
  return normalized.toUpperCase();
}

function buildLangPoolForSite(locale) {
  return (Array.isArray(LANG_POOL) ? LANG_POOL : []).map((item) => ({
    code: canonical(item.code),
    flag: item.flag || "🌐",
    name: getLocalizedLanguageName(item.code, locale),
    native: item.name || item.code.toUpperCase()
  }));
}

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

function langObj(code) {
  const c = canonical(code);
  const found = LANGS.find((x) => x.code === c);
  return found || {
    code: c,
    flag: "🌐",
    name: c.toUpperCase(),
    native: c.toUpperCase(),
    bcp: BCP[c] || "en-US",
  };
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

function toBCP(code) {
  const c = canonical(code);
  return BCP[c] || "en-US";
}

function compactDisplayName(fullName) {
  const clean = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const rest = parts.slice(1).map((p) => `${p.charAt(0).toUpperCase()}.`).join("");
  return `${first} ${rest}`;
}

function getLangMeta(code) {
  const c = canonical(code);
  return LANGS.find((l) => l.code === c) || {
    code: c,
    flag: "🌐",
    name: getLocalizedLanguageName(c, siteLang)
  };
}

function getDisplayNameFromUser(user) {
  const meta = user?.user_metadata || {};
  return (
    meta.display_name ||
    meta.full_name ||
    meta.name ||
    user?.email?.split("@")[0] ||
    (role === "host" ? "Host" : "Guest")
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

function personKey(person) {
  return String(
    person?.from ||
    person?.user_id ||
    person?.role ||
    person?.from_name ||
    Math.random().toString(36).slice(2)
  );
}

function visibleCode() {
  return hostCode || roomId || "------";
}

/* =========================
   UI / VISUAL STATE
========================= */
function setHelper(el, text, tone) {
  if (!el) return;
  el.className = "helper-text";
  if (tone) el.classList.add(tone);
  el.textContent = text || "";
}

function setSystemReadyUI() {
  resetMic();
  setHelper(micHint, st("speakHint"), "helper-ready");
}

function setSystemPreparingUI() {
  resetMic();
  setHelper(micHint, st("preparing"), "helper-wait");
}

function setListeningUI() {
  setMicState("listening");
  setHelper(micHint, st("listeningHint"), "helper-repeat");
}

function setTranslatingUI() {
  setMicState("recorded");
  setHelper(micHint, st("translating"), "helper-repeat");
}

function setErrorUI(messageKey = "micFailed") {
  resetMic();
  setHelper(micHint, st(messageKey), "helper-wait");
}

function bounceToReady(delay = 1200) {
  setTimeout(() => setSystemReadyUI(), delay);
}

function setMicState(state) {
  if (!micBtn) return;
  micBtn.classList.remove("listening", "recorded");
  if (state === "listening") micBtn.classList.add("listening");
  if (state === "recorded") micBtn.classList.add("recorded");
}

function resetMic() {
  micBtn?.classList.remove("listening", "recorded");
}

function refreshStaticTexts() {
  try {
    document.documentElement.setAttribute("lang", siteLang);
  } catch {}
  if (langSheetTitle) langSheetTitle.textContent = st("selectLanguage");
  syncLangPickerLabel();
  if (!recognizing) setSystemReadyUI();
}

function syncRoomPill() {
  if (roomPill) roomPill.textContent = visibleCode();
}

function renderPeople() {
  if (!peopleScroll) return;

  peopleScroll.innerHTML = "";
  const arr = [...joinedPeople.values()].slice(0, 50);

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
      avatar.textContent = getInitials(person.from_name || st("participant"));
    }

    const label = document.createElement("div");
    label.className = "pName";
    label.textContent = compactDisplayName(person.from_name || st("participant"));

    wrap.appendChild(avatar);
    wrap.appendChild(label);
    peopleScroll.appendChild(wrap);
  });

  if (participantsCount) {
    participantsCount.textContent = `${joinedPeople.size} / 50`;
  }
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

  let removedName = "";

  for (const [k, v] of joinedPeople.entries()) {
    if (
      (person.from && v.from === person.from) ||
      (person.user_id && v.user_id === person.user_id) ||
      (person.from_name && v.from_name === person.from_name)
    ) {
      removedName = compactDisplayName(v.from_name || person.from_name || st("participant"));
      joinedPeople.delete(k);
    }
  }

  renderPeople();

  if (removedName) {
    addSystemMessage(stf("peerLeftNamed", { name: removedName }));
  }
}

/* =========================
   BUBBLES
========================= */
function scrollChatBottom() {
  if (!chat) return;
  requestAnimationFrame(() => {
    try {
      chat.scrollTop = chat.scrollHeight;
    } catch {}
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

function createSpeakerButton(text, langCode) {
  const btn = document.createElement("button");
  btn.className = "msg-spk";
  btn.type = "button";
  btn.setAttribute("aria-label", "Speak");
  btn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M3 10v4h4l5 4V6L7 10H3"></path>
      <path d="M16 8a4 4 0 0 1 0 8"></path>
      <path d="M19 5a8 8 0 0 1 0 14"></path>
    </svg>
  `;
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await speakText(text, langCode);
  });
  return btn;
}

function addMessage({ side = "left", sender = "", text = "", withSpeaker = false, speakLang = "tr", fromLang = "tr" }) {
  const safeText = String(text || "").trim();
  if (!safeText || !chat) return;

  const langMeta = getLangMeta(fromLang);

  const row = document.createElement("div");
  row.className = `msg-row ${side}`;

  const card = document.createElement("div");
  card.className = "msg-card";

  const head = document.createElement("div");
  head.className = "msg-head";

  const nameEl = document.createElement("div");
  nameEl.className = "msg-name";
  nameEl.textContent = compactDisplayName(sender || st("participant"));

  const langEl = document.createElement("div");
  langEl.className = "msg-lang";
  langEl.textContent = `${langMeta.flag} ${langMeta.name}`;

  head.appendChild(nameEl);
  head.appendChild(langEl);

  if (withSpeaker) {
    head.appendChild(createSpeakerButton(safeText, speakLang));
  }

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = safeText;

  card.appendChild(head);
  card.appendChild(bubble);
  row.appendChild(card);
  chat.appendChild(row);

  scrollChatBottom();
}

/* =========================
   LANG PICKER
========================= */
function buildLanguageSelect() {
  if (!langSelect) return;

  langSelect.innerHTML = "";
  LANGS.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.code;
    opt.textContent = `${l.flag} ${l.name}`;
    langSelect.appendChild(opt);
  });

  const exists = LANGS.some((l) => l.code === myLang);
  langSelect.value = exists ? myLang : "tr";
  myLang = langSelect.value;

  syncLangPickerLabel();
}

function syncLangPickerLabel() {
  const opt = langSelect?.options?.[langSelect.selectedIndex];
  if (!opt || !langPickerText) return;
  langPickerText.textContent = opt.textContent || "🌐";
}

function renderLangSheet() {
  if (!langSheetList || !langSelect) return;

  const options = [...langSelect.options];
  langSheetList.innerHTML = options.map((opt) => `
    <button class="sheet-item ${opt.selected ? "active" : ""}" type="button" data-value="${opt.value}">
      <div class="sheet-item-left">
        <div class="sheet-flag">${(opt.textContent || "").trim().split(" ")[0] || "🌐"}</div>
        <div class="sheet-text">
          <div class="sheet-name">${(opt.textContent || "").trim().replace(/^(\S+)\s*/, "")}</div>
          <div class="sheet-code">${String(opt.value || "").toUpperCase()}</div>
        </div>
      </div>
      <div class="sheet-check"></div>
    </button>
  `).join("");

  langSheetList.querySelectorAll(".sheet-item").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = canonical(btn.dataset.value || "tr");
      await applyMyLanguageChange(value);
      closeLangSheet();
    });
  });
}

function openLangSheet() {
  renderLangSheet();
  langSheet?.classList.add("show");
  langSheetBackdrop?.classList.add("show");
  langSheet?.setAttribute("aria-hidden", "false");
}

function closeLangSheet() {
  langSheet?.classList.remove("show");
  langSheetBackdrop?.classList.remove("show");
  langSheet?.setAttribute("aria-hidden", "true");
}

async function applyMyLanguageChange(nextLang) {
  myLang = canonical(nextLang || "tr");
  localStorage.setItem("alltoall_lang", myLang);
  myProfile.me_lang = myLang;

  syncLangPickerLabel();
  setHelper(micHint, st("langUpdated"), "helper-ready");
  bounceToReady(800);
  rebuildRecognizer();

  if (ws && ws.readyState === WebSocket.OPEN) {
    sendWs({
      type: "profile_sync",
      from_name: myProfile.from_name,
      from_pic: myProfile.from_pic,
      me_lang: myLang,
      user_id: myProfile.user_id,
    });
  }
}

/* =========================
   AUDIO / TTS
========================= */
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

function getVoicePreference() {
  const v = String(
    localStorage.getItem("tts_voice") ||
    localStorage.getItem("live_interpreter_voice") ||
    "auto"
  ).toLowerCase().trim();

  if (["auto", "female", "male", "clone"].includes(v)) return v;
  return "auto";
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
  } catch {}

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

async function requestMicPermission() {
  if (!navigator.mediaDevices?.getUserMedia) return true;
  try {
    const temp = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    temp.getTracks().forEach((t) => t.stop());
    return true;
  } catch (e) {
    console.warn("[alltoall mic permission]", e);
    return false;
  }
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

  const pref = getVoicePreference();
  const base = canonical(langCode);
  const bcp = toBCP(langCode).toLowerCase();

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

/* =========================
   SEND
========================= */
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

function sendSpeechMessage(text) {
  const value = String(text || "").trim();
  if (!value) return;

  addMessage({
    side: "right",
    sender: myProfile.from_name,
    text: value,
    withSpeaker: false,
    speakLang: myLang,
    fromLang: myLang
  });

  sendWs({
    type: "message",
    text: value,
    lang: myLang
  });
}

/* =========================
   SPEECH - LIVE_INTERPRETER STYLE
========================= */
function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = langObj(langCode).bcp || toBCP(langCode);
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

function rebuildRecognizer() {
  recognizer = buildRecognizer(myLang);
}

function stopRecognizer() {
  if (recognizer) {
    try { recognizer.stop(); } catch {}
    recognizer = null;
  }
}

async function speechToTextFallback() {
  const txt = prompt(`${langObj(myLang).name} olarak konuşmanı yaz:`) || "";
  return String(txt).trim() || null;
}

async function finalizeRecognition(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    setErrorUI("micNoSpeech");
    bounceToReady(1000);
    return;
  }

  sendSpeechMessage(cleaned);
  setTranslatingUI();
  bounceToReady(1000);
}

function startRecording() {
  const rec = buildRecognizer(myLang);

  if (!rec) {
    setErrorUI("micUnsupported");
    bounceToReady(1800);
    return;
  }

  recognizer = rec;
  recordingSide = "bot";

  rec.onstart = () => {
    recognizing = true;
    setListeningUI();
  };

  rec.onresult = (e) => {
    const heard = e.results?.[0]?.[0]?.transcript || "";
    Promise.resolve().then(() => finalizeRecognition(heard));
  };

  rec.onerror = async (e) => {
    console.warn("[alltoall speech error]", e);

    recognizing = false;
    recordingSide = null;
    recognizer = null;

    if (String(e?.error || "").includes("not-allowed")) {
      setErrorUI("micDenied");
      bounceToReady(1600);
      return;
    }

    const fallback = await speechToTextFallback();
    if (fallback) {
      await finalizeRecognition(fallback);
    } else {
      setErrorUI("micFailed");
      bounceToReady(1200);
    }
  };

  rec.onend = () => {
    recognizing = false;
    recognizer = null;
    recordingSide = null;
  };

  try {
    rec.start();
  } catch (e) {
    console.warn("[alltoall rec.start error]", e);
    recognizing = false;
    recognizer = null;
    recordingSide = null;
    setErrorUI("micFailed");
    bounceToReady(1200);
  }
}

async function toggleMic() {
  await ensureReady();

  const granted = await requestMicPermission();
  if (!granted) {
    setErrorUI("micDenied");
    bounceToReady(1500);
    return;
  }

  try {
    await warmAudio();
    await prepareEnhancedMic();
  } catch {}

  if (recordingSide === "bot") {
    stopRecognizer();
    recordingSide = null;
    recognizing = false;
    setTranslatingUI();
    bounceToReady(1000);
    return;
  }

  if (recordingSide) {
    stopRecognizer();
    recordingSide = null;
    recognizing = false;
  }

  startRecording();
}

/* =========================
   SOCKET
========================= */
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
    throw new Error(j?.detail || j?.error || "Room resolve failed");
  }

  roomId = String(j.room_id || "").trim().toUpperCase();
  syncRoomPill();
}

function scheduleReconnect() {
  if (manualClose || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!manualClose) {
      connectSocket();
    }
  }, 1500);
}

function connectSocket() {
  if (!roomId) {
    addSystemMessage(st("roomMissing"));
    return;
  }

  const wsUrl = `${WS_BASE}/${encodeURIComponent(roomId)}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

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

    setSystemReadyUI();
  };

  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data || "{}");
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
        syncRoomPill();
        ensureSelfInPeople();
        addSystemMessage(st("roomCreated"));
        setSystemReadyUI();
        return;
      }

      if (type === "presence") {
        applyRoster(data.roster || []);
        return;
      }

      if (type === "peer_joined") {
        if (data.peer) upsertPerson(data.peer);
        if (Array.isArray(data.roster)) applyRoster(data.roster);
        addSystemMessage(st("peerJoined"));
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
        return;
      }

      if (type === "translated_message") {
        const fromId = String(data.from || "").trim();
        const senderName = String(data.from_name || st("participant")).trim();
        const translated = String(data.translated_text || "").trim();
        const original = String(data.original_text || "").trim();
        const finalText = translated || original;
        const fromLang = canonical(data.from_lang || data.lang || "tr");

        if (!finalText) return;
        if (fromId && myProfile.from && fromId === myProfile.from) return;

        addMessage({
          side: "left",
          sender: senderName,
          text: finalText,
          withSpeaker: true,
          speakLang: myLang,
          fromLang
        });

        if (data.from || data.from_name || data.from_pic) {
          upsertPerson({
            from: data.from || "",
            from_name: data.from_name || senderName,
            from_pic: data.from_pic || "",
            me_lang: fromLang,
            role: data.role || "guest",
            user_id: data.from_user_id || "",
          });
        }

        await speakText(finalText, myLang);
        setSystemReadyUI();
        return;
      }

      if (type === "room_not_found") {
        addSystemMessage(data.message || st("roomNotFound"));
        return;
      }

      if (type === "error") {
        const msg = String(data.message || "");
        if (msg === "HOST_NOT_READY") {
          addSystemMessage(st("hostNotReady"));
        } else {
          addSystemMessage(msg || st("connectionError"));
        }
      }
    } catch (e) {
      console.warn("[alltoall ws parse]", e);
    }
  };

  ws.onerror = () => {
    addSystemMessage(st("connectionError"));
  };

  ws.onclose = () => {
    if (!manualClose) {
      addSystemMessage(st("connectionClosed"));
      scheduleReconnect();
    }
  };
}

/* =========================
   PROFILE
========================= */
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

/* =========================
   LAYOUT
========================= */
function applyFooterLift() {
  try {
    const root = getComputedStyle(document.documentElement);
    const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
    document.documentElement.style.setProperty("--footerSafe", `${footerH}px`);
  } catch {}
}

function fixLayout() {
  applyFooterLift();

  try {
    const root = getComputedStyle(document.documentElement);
    const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;

    if (window.visualViewport && pageContent) {
      const h = Math.max(320, Math.round(window.visualViewport.height - footerH));
      pageContent.style.height = `${h}px`;
      pageContent.style.minHeight = `${h}px`;
    }
  } catch {}
}

/* =========================
   BOOT / READY
========================= */
async function warmApis() {
  await Promise.allSettled([
    fetch(`${API_BASE}/healthz`).catch(() => {}),
  ]);
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

function startBoot() {
  if (bootStarted) return bootPromise;
  bootStarted = true;

  bootPromise = (async () => {
    setSystemPreparingUI();
    syncLangPickerLabel();

    await Promise.allSettled([
      warmApis(),
      warmAudio(),
    ]);

    bootReady = true;
    setSystemReadyUI();
  })();

  return bootPromise;
}

async function ensureReady() {
  if (bootReady) return true;
  if (!bootStarted) startBoot();
  try { await bootPromise; } catch {}
  return true;
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  syncLangPickerLabel();
  unlockOnFirstTouch();
  startBoot();

  roomPill?.addEventListener("click", async () => {
    const code = visibleCode();
    if (!code || code === "------") return;
    try {
      await navigator.clipboard.writeText(code);
      addSystemMessage(`${st("roomCopied")}: ${code}`);
    } catch {}
  });

  langPickerBtn?.addEventListener("click", openLangSheet);
  langSheetBackdrop?.addEventListener("click", closeLangSheet);
  langSheetClose?.addEventListener("click", closeLangSheet);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLangSheet();

    if ((e.key === "Enter" || e.key === " ") && document.activeElement === micBtn) {
      e.preventDefault();
      toggleMic();
    }
  });

  micBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleMic();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fixLayout);
    window.visualViewport.addEventListener("scroll", fixLayout);
  }

  window.addEventListener("resize", fixLayout);
  window.addEventListener("orientationchange", fixLayout);

  window.addEventListener("focus", () => {
    const nextSiteLang = getSiteLang();
    if (nextSiteLang !== siteLang) {
      siteLang = nextSiteLang;
      LANGS = buildLangPoolForSite(siteLang);
      refreshStaticTexts();
      buildLanguageSelect();
      renderLangSheet();
      renderPeople();
      syncRoomPill();
    }
    fixLayout();
  });

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          window.speechSynthesis.getVoices();
        } catch {}
        voicesReady = true;
      };
    }
  } catch {}
}

/* =========================
   INIT
========================= */
async function init() {
  siteLang = getSiteLang();
  LANGS = buildLangPoolForSite(siteLang);

  refreshStaticTexts();
  buildLanguageSelect();
  syncRoomPill();
  setSystemReadyUI();
  fixLayout();

  await hydrateMyProfile();
  ensureSelfInPeople();

  rebuildRecognizer();
  bindEvents();

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
  manualClose = true;
  stopAudio();
  try { stopRecognizer(); } catch {}
  try { ws?.close?.(); } catch {}
  try { preparedStream?.getTracks?.().forEach((t) => t.stop()); } catch {}
});
