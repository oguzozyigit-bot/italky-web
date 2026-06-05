// FILE: /js/eme_support.js
import { supabase } from "/js/supabase_client.js";
import {
  EME_ALLOWED_SCOPE,
  EME_HANDOFF_MESSAGE,
  EME_KNOWLEDGE_BASE,
  EME_OUT_OF_SCOPE_RESPONSE
} from "/js/eme_knowledge_base.js";

const API_BASE = "https://italky-api.onrender.com/api/support/eme";

const SUCCESS_MESSAGE =
  "Talebiniz alındı. Müşteri hizmetlerimiz en kısa sürede sizinle iletişime geçecektir.";

const ERROR_MESSAGE =
  "Talebiniz şu anda gönderilemedi. Lütfen biraz sonra tekrar deneyin veya iletişim sayfasından bize ulaşın.";

const FORBIDDEN_VISIBLE_TERMS = [
  "tren" + "dyol",
  "hepsi" + "burada",
  "ama" + "zon",
  "n" + "11",
  "pazar" + " yeri",
  "dis" + " platform",
  "disaridan" + " satin aldim",
  "satin" + " alma kanali",
  "goo" + "gle",
  "goo" + "gle play",
  "app" + "le",
  "app" + " store",
  "play" + " store"
];

const SCOPE_KEYWORDS = [
  "italky", "italkyai", "eme", "aktivasyon", "kod", "üyelik", "uyelik", "üye", "uye",
  "ödeme", "odeme", "gün", "gun", "dijital", "sipariş", "siparis", "referans",
  "hesap", "giriş", "giris", "login", "profil", "uygulama", "modül", "modul",
  "offline", "dil paketi", "iki telefon", "yüzyüze", "yuzyuze", "facetoface",
  "gezi", "konferans", "yazıdan", "yazidan", "çeviri", "ceviri", "seviye",
  "tespit", "oyun", "eğlenerek", "eglenerek", "teknik", "mikrofon", "hata",
  "çalışmıyor", "calismiyor", "çalışmadı", "calismadi", "kabul etmiyor"
];

const HANDOFF_KEYWORDS = [
  "olmuyor", "çalışmadı", "calismadi", "çalışmıyor", "calismiyor", "yardım istiyorum",
  "yardim istiyorum", "müşteri hizmetleri", "musteri hizmetleri", "arasın", "arasin",
  "beni arayın", "beni arayin", "destek istiyorum", "çözülmedi", "cozulmedi",
  "yapamadım", "yapamadim", "yardım edin", "yardim edin"
];

const els = {
  messageList: document.getElementById("messageList"),
  chatInput: document.getElementById("chatInput"),
  micBtn: document.getElementById("micBtn"),
  sendBtn: document.getElementById("sendBtn"),
  composerStatus: document.getElementById("composerStatus"),
  ticketForm: document.getElementById("ticketForm"),
  ticketIntro: document.getElementById("ticketIntro"),
  ticketFirstName: document.getElementById("ticketFirstName"),
  ticketLastName: document.getElementById("ticketLastName"),
  ticketEmail: document.getElementById("ticketEmail"),
  ticketPhone: document.getElementById("ticketPhone"),
  ticketTopic: document.getElementById("ticketTopic"),
  ticketCode: document.getElementById("ticketCode"),
  ticketOrder: document.getElementById("ticketOrder"),
  ticketMessage: document.getElementById("ticketMessage"),
  createTicketBtn: document.getElementById("createTicketBtn"),
  ticketStatus: document.getElementById("ticketStatus")
};

const state = {
  lastMessage: "",
  lastCode: "",
  lastTopic: "other",
  recognition: null,
  listening: false
};

function foldTurkish(value) {
  return String(value || "")
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function normalizeText(value) {
  return foldTurkish(value)
    .replace(/[^\p{L}\p{N}_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanField(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 64);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setStatus(el, message = "", type = "") {
  if (!el) return;
  el.textContent = message;
  el.className = type ? `${el.className.split(" ")[0]} ${type}` : el.className.split(" ")[0];
}

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = escapeHtml(text);
  els.messageList.appendChild(div);
  els.messageList.scrollTop = els.messageList.scrollHeight;
  return div;
}

function updateMessage(node, text) {
  if (!node) return;
  node.innerHTML = escapeHtml(text);
  els.messageList.scrollTop = els.messageList.scrollHeight;
}

function includesAny(text, keywords) {
  const haystack = normalizeText(text);
  return keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
}

function hasForbiddenVisibleTerms(text) {
  const normalized = normalizeText(text);
  return FORBIDDEN_VISIBLE_TERMS.some((term) => normalized.includes(normalizeText(term)));
}

function isInScope(message) {
  return includesAny(message, SCOPE_KEYWORDS) || !!findKnowledge(message);
}

function needsHumanSupport(message) {
  return includesAny(message, HANDOFF_KEYWORDS);
}

function findKnowledge(message) {
  const normalized = normalizeText(message);
  let best = null;

  EME_KNOWLEDGE_BASE.forEach((item) => {
    const score = item.keywords.reduce((total, keyword) => (
      normalized.includes(normalizeText(keyword)) ? total + normalizeText(keyword).split(" ").length : total
    ), 0);
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  });

  return best?.item || null;
}

function extractCode(message) {
  const raw = String(message || "").toUpperCase();
  const compact = raw.replace(/[^A-Z0-9]/g, "");
  const direct = raw.match(/\b[A-Z0-9][A-Z0-9_-]{5,31}\b/g) || [];
  const spaced = raw.match(/\b[A-Z]{2}\s*[-_]?\s*\d{6,10}\b/g) || [];
  const compactMatches = compact.match(/[A-Z]{2}\d{6,10}|[A-Z0-9]{8,24}/g) || [];
  const ignored = new Set(["ITALKYAI", "DESTEK", "YARDIM", "HESAP", "UYELIK", "ÜYELIK"]);

  return [...spaced, ...direct, ...compactMatches]
    .map(normalizeCode)
    .find((item) => item.length >= 6 && /[0-9]/.test(item) && !ignored.has(item)) || "";
}

async function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch {}
  return headers;
}

async function getDisplayName() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const metaName = cleanField(
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.display_name ||
      "",
      120
    );

    if (user?.id) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.full_name) return cleanField(data.full_name, 120);
    }

    if (metaName) return metaName;
  } catch {}

  const storageKeys = ["italky_user_v1", "italky_user", "italky_user_cache", "italky_profile_cache"];
  for (const key of storageKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const name = cleanField(parsed?.full_name || parsed?.name || parsed?.display_name || parsed?.user?.full_name || "", 120);
      if (name) return name;
    } catch {}
  }
  return "";
}

async function diagnoseCode(code, message) {
  if (!code) return "";
  try {
    const res = await fetch(`${API_BASE}/code-diagnostic`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ code, message })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) return "";
    if (json.status === "used_by_other") return "Bu kod farklı bir hesapta kullanılmış görünüyor.";
    const safeMessage = cleanField(json.safe_message || json.message, 500);
    return hasForbiddenVisibleTerms(safeMessage) ? "" : safeMessage;
  } catch {
    return "";
  }
}

async function askAiFallback(message, matchedTopic) {
  try {
    const res = await fetch(`${API_BASE}/ai-message`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        message,
        context: {
          matched_topic: matchedTopic ? "partial" : "none",
          app: "italkyAI",
          allowed_scope: EME_ALLOWED_SCOPE
        }
      })
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json) return null;
    const answer = cleanField(json.answer || json.message || "", 900);
    if (!answer || json.open_form === true || json.needs_support_form === true) return null;
    if (hasForbiddenVisibleTerms(answer)) return null;
    return answer;
  } catch {
    return null;
  }
}

function openTicketForm(message = "", topic = "other", code = "") {
  state.lastTopic = topic || "other";
  state.lastCode = code || state.lastCode;
  state.lastMessage = message || state.lastMessage;

  els.ticketForm.classList.add("show");
  els.ticketIntro.textContent = EME_HANDOFF_MESSAGE;
  if (els.ticketTopic) els.ticketTopic.value = state.lastTopic;
  if (els.ticketCode && state.lastCode) els.ticketCode.value = state.lastCode;
  if (els.ticketMessage && state.lastMessage && !els.ticketMessage.value.trim()) {
    els.ticketMessage.value = state.lastMessage;
  }
  els.ticketForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function handleUserMessage(rawMessage) {
  const message = cleanField(rawMessage, 2000);
  if (!message) return;

  state.lastMessage = message;
  appendMessage("user", message);
  els.chatInput.value = "";
  resizeInput();
  setStatus(els.composerStatus, "");

  const waitNode = appendMessage("eme", "Sorununuzu kontrol ediyorum...");
  const code = normalizeCode(extractCode(message));
  if (code) state.lastCode = code;

  const knowledge = findKnowledge(message);
  if (knowledge) state.lastTopic = knowledge.topic || "other";

  if (!knowledge && !isInScope(message)) {
    updateMessage(waitNode, EME_OUT_OF_SCOPE_RESPONSE);
    return;
  }

  if (knowledge?.needsCodeDiagnostic && code) {
    const diagnostic = await diagnoseCode(code, message);
    if (diagnostic) {
      updateMessage(waitNode, `${diagnostic}\n\n${knowledge.answer}`);
      if (knowledge.openForm || needsHumanSupport(message)) openTicketForm(message, knowledge.topic, code);
      return;
    }
  }

  if (knowledge) {
    updateMessage(waitNode, knowledge.answer);
    if (knowledge.openForm || needsHumanSupport(message)) {
      appendMessage("eme", EME_HANDOFF_MESSAGE);
      openTicketForm(message, knowledge.topic, code);
    }
    return;
  }

  if (needsHumanSupport(message)) {
    updateMessage(waitNode, EME_HANDOFF_MESSAGE);
    openTicketForm(message, state.lastTopic, code);
    return;
  }

  updateMessage(waitNode, "Eme’ye bağlanıyorsunuz...");
  const aiAnswer = await askAiFallback(message, knowledge);
  if (aiAnswer) {
    updateMessage(waitNode, aiAnswer);
    return;
  }

  updateMessage(waitNode, EME_HANDOFF_MESSAGE);
  openTicketForm(message, state.lastTopic, code);
}

function resizeInput() {
  els.chatInput.style.height = "auto";
  els.chatInput.style.height = `${Math.min(112, els.chatInput.scrollHeight)}px`;
}

function setupSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.micBtn.disabled = false;
    els.micBtn.addEventListener("click", () => {
      setStatus(els.composerStatus, "Sesli giriş bu cihazda desteklenmiyor.", "err");
    });
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "tr-TR";
  recognition.continuous = false;
  recognition.interimResults = false;
  state.recognition = recognition;

  recognition.onstart = () => {
    state.listening = true;
    els.micBtn.classList.add("listening");
    setStatus(els.composerStatus, "Dinliyorum...", "ok");
  };

  recognition.onresult = (event) => {
    const text = Array.from(event.results || [])
      .map((result) => result?.[0]?.transcript || "")
      .join(" ")
      .trim();
    if (text) {
      els.chatInput.value = text;
      resizeInput();
      handleUserMessage(text);
    }
  };

  recognition.onerror = () => {
    setStatus(els.composerStatus, "Sesli giriş şu anda kullanılamıyor.", "err");
  };

  recognition.onend = () => {
    state.listening = false;
    els.micBtn.classList.remove("listening");
    if (els.composerStatus.textContent === "Dinliyorum...") setStatus(els.composerStatus, "");
  };

  els.micBtn.addEventListener("click", () => {
    try {
      if (state.listening) recognition.stop();
      else recognition.start();
    } catch {
      setStatus(els.composerStatus, "Sesli giriş şu anda kullanılamıyor.", "err");
    }
  });
}

function validateTicket(payload) {
  if (!payload.first_name) return "Lütfen adınızı yazın.";
  if (!payload.last_name) return "Lütfen soyadınızı yazın.";
  if (!payload.email && !payload.phone) return "Lütfen e-posta veya telefon bilgilerinden en az birini yazın.";
  if (!payload.message) return "Lütfen sorun açıklamasını yazın.";
  return "";
}

async function createTicket(event) {
  event.preventDefault();
  const payload = {
    first_name: cleanField(els.ticketFirstName?.value, 80),
    last_name: cleanField(els.ticketLastName?.value, 80),
    email: cleanField(els.ticketEmail?.value, 160),
    phone: cleanField(els.ticketPhone?.value, 32),
    support_topic: els.ticketTopic?.value || state.lastTopic || "other",
    activation_code: normalizeCode(els.ticketCode?.value),
    order_number: cleanField(els.ticketOrder?.value, 80),
    message: cleanField(els.ticketMessage?.value, 2000),
    source: "eme_support"
  };

  const validationError = validateTicket(payload);
  if (validationError) {
    setStatus(els.ticketStatus, validationError, "err");
    return;
  }

  els.createTicketBtn.disabled = true;
  setStatus(els.ticketStatus, "Destek talebi gönderiliyor...");
  try {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    setStatus(els.ticketStatus, SUCCESS_MESSAGE, "ok");
    appendMessage("eme", SUCCESS_MESSAGE);
  } catch {
    setStatus(els.ticketStatus, ERROR_MESSAGE, "err");
  } finally {
    els.createTicketBtn.disabled = false;
  }
}

async function boot() {
  const displayName = await getDisplayName();
  appendMessage(
    "eme",
    displayName
      ? `Ben Eme. italkyAI müşterilerinin destek asistanıyım. Size nasıl yardımcı olabilirim Sayın ${displayName}?`
      : "Ben Eme. italkyAI müşterilerinin destek asistanıyım. Size nasıl yardımcı olabilirim?"
  );

  setupSpeech();
  els.chatInput.addEventListener("input", resizeInput);
  els.chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleUserMessage(els.chatInput.value);
    }
  });
  els.sendBtn.addEventListener("click", () => handleUserMessage(els.chatInput.value));
  els.ticketCode?.addEventListener("input", () => {
    els.ticketCode.value = normalizeCode(els.ticketCode.value);
  });
  els.ticketForm.addEventListener("submit", createTicket);
}

boot();
