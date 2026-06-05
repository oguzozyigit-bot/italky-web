// FILE: /js/eme_support.js
import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com/api/support/eme";

const OUT_OF_SCOPE_RESPONSE =
  "Ben Eme, italkyAI destek asistanıyım. Size uygulama kullanımı, üyelik, aktivasyon kodu ve teknik destek konularında yardımcı olabilirim. Lütfen italkyAI ile ilgili sorunuzu yazın.";

const HANDOFF_MESSAGE =
  "Bu konuda size hemen net bir çözüm sunamadığım için özür dilerim. Müşteri hizmetlerimiz konuyu inceleyip en kısa sürede sizinle iletişime geçecektir. Lütfen aşağıdaki formu doldurun.";

const SUCCESS_MESSAGE =
  "Talebiniz alındı. Müşteri hizmetlerimiz en kısa sürede sizinle iletişime geçecektir.";

const ERROR_MESSAGE =
  "Talebiniz şu anda gönderilemedi. Lütfen biraz sonra tekrar deneyin veya iletişim sayfasından bize ulaşın.";

const SUPPORT_TOPICS = [
  {
    id: "used-code",
    topic: "activation_code",
    title: "Kod daha önce kullanılmış diyor",
    keywords: ["daha önce", "daha once", "kullanılmış", "kullanilmis", "used"],
    answer:
      "Bu uyarı, kodun daha önce işlenmiş olabileceğini gösterir. Aynı hesabı kullandığınızdan emin olun ve üyelik sürenizi yenileyerek kontrol edin. Kod farklı bir hesapta kullanılmış görünüyorsa kişisel hesap bilgisi paylaşamam; bu durumda destek ekibimiz inceleme yapar.",
    codeDiagnostic: true
  },
  {
    id: "invalid-code",
    topic: "activation_code",
    title: "Kod geçersiz diyor",
    keywords: ["geçersiz", "gecersiz", "invalid", "hatalı kod", "hatali kod"],
    answer:
      "Kodu boşluk bırakmadan, büyük harfle ve eksiksiz girin. O-0 veya I-1 gibi benzer karakterleri kontrol edin. Uyarı devam ederse kodu ve sorunu forma ekleyin."
  },
  {
    id: "not-applied",
    topic: "activation_code",
    title: "Kod hesabıma işlenmedi",
    keywords: ["işlenmedi", "islenmedi", "eklenmedi", "yüklenmedi", "yuklenmedi", "hesabıma geçmedi", "hesabima gecmedi"],
    answer:
      "Ana sayfaya dönüp hesabınızı yenileyin ve aynı hesapla giriş yaptığınızı kontrol edin. Süre hâlâ görünmüyorsa destek ekibi kayıtları inceleyebilir."
  },
  {
    id: "duration-missing",
    topic: "membership",
    title: "Üyelik sürem görünmüyor",
    keywords: ["üyelik", "uyelik", "sürem", "surem", "görünmüyor", "gorunmuyor", "günüm", "gunum"],
    answer:
      "Aynı hesapla giriş yaptığınızı kontrol edin ve ana sayfayı yenileyin. Süre görünmüyorsa destek formunda hesabınızı ve sorunu kısaca yazın."
  },
  {
    id: "activate-code",
    topic: "activation_code",
    title: "Aktivasyon kodu nasıl kullanılır?",
    keywords: ["nasıl kullanılır", "nasil kullanilir", "aktivasyon", "kodu nereye", "kod nasıl", "kod nasil"],
    answer:
      "Aktivasyon kodunu uygulamadaki kod yükleme alanına boşluk bırakmadan girin. Kod kabul edilirse süre hesabınıza eklenir. İşlemden sonra ana sayfayı yenileyin."
  },
  {
    id: "app-rejects",
    topic: "activation_code",
    title: "Uygulama kodu kabul etmiyor",
    keywords: ["kabul etmiyor", "reddediyor", "almıyor", "almiyor"],
    answer:
      "Kod alanında boşluk, küçük harf veya özel karakter kalmadığından emin olun. Kod hâlâ kabul edilmiyorsa ekran uyarısını ve kodu destek formuna ekleyin."
  },
  {
    id: "reuse",
    topic: "activation_code",
    title: "Aynı kodu tekrar kullanabilir miyim?",
    keywords: ["tekrar", "yeniden", "aynı kod", "ayni kod", "bir daha"],
    answer:
      "Genellikle aynı aktivasyon kodu bir kez kullanılabilir. Daha önce işlendiğini düşünüyorsanız destek ekibi kayıtları kontrol edebilir."
  },
  {
    id: "technical",
    topic: "technical",
    title: "Teknik sorun yaşıyorum",
    keywords: ["teknik", "hata", "donuyor", "açılmıyor", "acilmiyor", "çalışmıyor", "calismiyor", "çöktü", "coktu"],
    answer:
      "Uygulamayı kapatıp tekrar açın, bağlantınızı kontrol edin ve aynı işlemi yeniden deneyin. Sorun devam ederse hangi ekranda olduğunu destek formuna yazın."
  },
  {
    id: "mic",
    topic: "technical",
    title: "Mikrofon çalışmıyor",
    keywords: ["mikrofon", "ses", "konuşma", "konusma", "duymuyor"],
    answer:
      "Cihazınızda mikrofon izninin açık olduğundan emin olun. Tarayıcı veya uygulama ayarlarından mikrofon erişimini kontrol edin, sonra sayfayı yenileyin."
  },
  {
    id: "offline",
    topic: "module_usage",
    title: "Dil paketi görünmüyor",
    keywords: ["dil paketi", "offline", "paket görünmüyor", "paket gorunmuyor", "indirme"],
    answer:
      "Dil paketleri ekranını yenileyin ve bağlantınızın açık olduğundan emin olun. Paket hâlâ görünmüyorsa hangi dili aradığınızı destek formuna yazın."
  },
  {
    id: "two-phone",
    topic: "module_usage",
    title: "İki Telefon bağlanmıyor",
    keywords: ["iki telefon", "oda kodu", "bağlanmıyor", "baglanmiyor", "eşleşmiyor", "eslesmiyor"],
    answer:
      "İki cihazda da aynı oda kodunun girildiğini kontrol edin. Her iki cihazda bağlantı açık olmalı ve kod süresi dolmadan işlem tamamlanmalıdır."
  },
  {
    id: "conference",
    topic: "module_usage",
    title: "Gezi & Konferans çalışmıyor",
    keywords: ["gezi", "konferans", "toplantı", "toplanti", "dinleyici", "konuşmacı", "konusmaci"],
    answer:
      "Gezi & Konferans modülünde bağlantı ve mikrofon izinlerini kontrol edin. Dinleyici bağlantısı yenilenmezse oturumu kapatıp yeniden başlatın."
  }
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
  "yapamadım", "yapamadim"
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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
}

function includesAny(text, keywords) {
  const haystack = normalizeText(text);
  return keywords.some((keyword) => haystack.includes(keyword));
}

function isInScope(message) {
  return includesAny(message, SCOPE_KEYWORDS) || !!findTopic(message);
}

function needsHumanSupport(message) {
  return includesAny(message, HANDOFF_KEYWORDS);
}

function findTopic(message) {
  return SUPPORT_TOPICS.find((item) => includesAny(message, item.keywords)) || null;
}

function extractCode(message) {
  const normalized = String(message || "").toUpperCase();
  const matches = normalized.match(/\b[A-Z0-9][A-Z0-9_-]{5,31}\b/g) || [];
  const ignored = new Set(["ITALKYAI", "DESTEK", "YARDIM", "HESAP", "UYELIK", "ÜYELIK"]);
  return matches.find((item) => /[0-9]/.test(item) && !ignored.has(item)) || "";
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
    return cleanField(json.message, 500);
  } catch {
    return "";
  }
}

function openTicketForm(message = "", topic = "other", code = "") {
  state.lastTopic = topic || "other";
  state.lastCode = code || state.lastCode;
  state.lastMessage = message || state.lastMessage;

  els.ticketForm.classList.add("show");
  els.ticketIntro.textContent = HANDOFF_MESSAGE;
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

  if (!isInScope(message)) {
    appendMessage("eme", OUT_OF_SCOPE_RESPONSE);
    return;
  }

  const code = normalizeCode(extractCode(message));
  if (code) state.lastCode = code;

  const topic = findTopic(message);
  if (topic) state.lastTopic = topic.topic;

  if ((topic?.codeDiagnostic || topic?.topic === "activation_code") && code) {
    const diagnostic = await diagnoseCode(code, message);
    if (diagnostic) {
      appendMessage("eme", `${diagnostic}\n\n${topic.answer}`);
      return;
    }
  }

  if (topic) {
    appendMessage("eme", topic.answer);
    if (needsHumanSupport(message)) {
      appendMessage("eme", HANDOFF_MESSAGE);
      openTicketForm(message, topic.topic, code);
    }
    return;
  }

  if (needsHumanSupport(message)) {
    appendMessage("eme", HANDOFF_MESSAGE);
    openTicketForm(message, state.lastTopic, code);
    return;
  }

  appendMessage("eme", HANDOFF_MESSAGE);
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
      if (state.listening) {
        recognition.stop();
      } else {
        recognition.start();
      }
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
