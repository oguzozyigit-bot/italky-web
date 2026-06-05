// FILE: /js/eme_support.js
import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com/api/support/eme";

const OUT_OF_SCOPE_RESPONSE =
  "Ben Eme, italkyAI destek asistanıyım. Size uygulama, üyelik, aktivasyon kodu, Trendyol dijital kod ve kullanım sorunları hakkında yardımcı olabilirim. Lütfen italkyAI ile ilgili sorunuzu yazın.";

const HANDOFF_MESSAGE =
  "Bu konuda size hemen net bir çözüm sunamadığım için özür dilerim. Müşteri hizmetlerimiz konuyu inceleyip en kısa sürede sizinle iletişime geçecektir. Lütfen aşağıdaki formu doldurun.";

const CONNECTING_TEXT = "Eme’ye bağlanıyorsunuz...";
const CONNECTING_DETAIL =
  "Sorununuzu anlamaya çalışıyorum. Gerekirse sizi müşteri hizmetlerimize yönlendireceğim.";

const SUCCESS_MESSAGE =
  "Talebiniz alındı. Müşteri hizmetlerimiz en kısa sürede sizinle iletişime geçecektir.";

const ERROR_MESSAGE =
  "Talebiniz şu anda gönderilemedi. Lütfen biraz sonra tekrar deneyin veya iletişim sayfasından bize ulaşın.";

const CHANNELS = [
  { id: "italky", label: "italkyAI üzerinden aldım" },
  { id: "trendyol", label: "Trendyol üzerinden aldım" },
  { id: "other", label: "Diğer / bilmiyorum" }
];

const QUESTIONS = [
  {
    id: "used-code",
    title: "Kod daha önce kullanılmış diyor",
    answer:
      "Bu kod aynı hesapta daha önce kullanılmışsa üyelik süresi zaten eklenmiş olabilir. Kod farklı bir hesapta kullanılmış görünüyorsa başka kullanıcıya ait e-posta, ad veya hesap bilgisi paylaşamam. Bu durumda sadece şu bilgiyi verebilirim: Bu kod farklı bir hesapta kullanılmış görünüyor.",
    needsCode: true
  },
  {
    id: "invalid-code",
    title: "Kod geçersiz diyor",
    answer:
      "Kodu boşluk bırakmadan, büyük harfle ve eksiksiz girin. O-0 veya I-1 gibi karakterleri kontrol edin. Sorun sürerse aktivasyon kodu ve satın alma kanalını yazarak destek formunu doldurun."
  },
  {
    id: "not-applied",
    title: "Kod hesabıma işlenmedi",
    answer:
      "Ana sayfaya dönüp hesabınızı yenileyin ve aynı hesapla giriş yaptığınızdan emin olun. Süre hâlâ görünmüyorsa kod, kanal ve varsa sipariş numarasıyla destek formu açın."
  },
  {
    id: "trendyol-activate",
    title: "Trendyol’dan aldım, nasıl aktif edeceğim?",
    answer:
      "Trendyol dijital kodunu italkyAI içindeki kod yükleme alanından deneyin. Kod kabul edilmezse sipariş numarası, aktivasyon kodu ve iletişim bilginizle destek formunu doldurun. Onay olmadan sipariş veya kod detayı gösterilmez."
  },
  {
    id: "wrong-account",
    title: "Kodumu başka hesaba girdim",
    answer:
      "Kod başka hesaba girildiyse o hesaba ait kişisel bilgi paylaşamam. Destek ekibi, sizin talebinizi ve doğrulama bilgilerinizi inceleyerek uygun seçeneği değerlendirebilir."
  },
  {
    id: "duration-missing",
    title: "Üyelik sürem görünmüyor",
    answer:
      "Aynı hesapla giriş yaptığınızı kontrol edin ve ana sayfayı yenileyin. Üyelik süresi hâlâ görünmüyorsa destek formuna kodu, satın alma kanalını ve sorununuzu ekleyin."
  },
  {
    id: "app-rejects",
    title: "Uygulama kodu kabul etmiyor",
    answer:
      "Kod alanında boşluk, küçük harf veya özel karakter kalmadığından emin olun. Dijital aktivasyon kodları Kod ile Gün Yükle ekranından denenmelidir."
  },
  {
    id: "validity",
    title: "Kod kaç ay geçerli?",
    answer:
      "Kod süresi kampanya veya satın alma paketine göre değişebilir. Emin değilseniz kodu ve satın alma kanalını destek formuna ekleyin; müşteri hizmetleri kayıt üzerinden kontrol eder."
  },
  {
    id: "reuse",
    title: "Aynı kodu tekrar kullanabilir miyim?",
    answer:
      "Genellikle aynı aktivasyon kodu bir kez kullanılabilir. Aynı hesapta daha önce kullanılmışsa süre eklenmiş olabilir. Farklı hesapta kullanılmışsa kişisel detay paylaşılmaz."
  }
];

const SCOPE_KEYWORDS = [
  "italky", "italkyai", "eme", "aktivasyon", "kod", "üyelik", "uyelik", "üye", "uye",
  "ödeme", "odeme", "satın", "satin", "gün", "gun", "trendyol", "dijital",
  "sipariş", "siparis", "hesap", "giriş", "giris", "login", "profil",
  "uygulama", "modül", "modul", "offline", "dil paketi", "iki telefon", "yüzyüze",
  "yuzyuze", "facetoface", "gezi", "konferans", "yazıdan", "yazidan", "çeviri",
  "ceviri", "seviye", "tespit", "oyun", "eğlenerek", "eglenerek", "teknik",
  "çalışmıyor", "calismiyor", "çalışmadı", "calismadi", "hata", "kabul etmiyor"
];

const HANDOFF_KEYWORDS = [
  "olmuyor", "çalışmadı", "calismadi", "çalışmıyor", "calismiyor", "yardım istiyorum",
  "yardim istiyorum", "müşteri hizmetleri", "musteri hizmetleri", "arasın", "arasin",
  "beni arayın", "beni arayin", "destek istiyorum", "çözülmedi", "cozulmedi",
  "yapamadım", "yapamadim"
];

const QUESTION_KEYWORDS = {
  "used-code": ["daha önce", "daha once", "kullanılmış", "kullanilmis", "used"],
  "invalid-code": ["geçersiz", "gecersiz", "invalid"],
  "not-applied": ["işlenmedi", "islenmedi", "eklenmedi", "yüklenmedi", "yuklenmedi"],
  "trendyol-activate": ["trendyol"],
  "wrong-account": ["başka hesap", "baska hesap", "yanlış hesap", "yanlis hesap"],
  "duration-missing": ["sürem", "surem", "görünmüyor", "gorunmuyor"],
  "app-rejects": ["kabul etmiyor", "reddediyor"],
  validity: ["kaç ay", "kac ay", "geçerli", "gecerli"],
  reuse: ["tekrar", "yeniden", "aynı kod", "ayni kod"]
};

const state = {
  channel: localStorage.getItem("italky_eme_purchase_channel_v1") || "italky",
  questionId: "",
  lastCode: "",
  lastUserMessage: ""
};

const $ = (id) => document.getElementById(id);

const els = {
  channelGrid: $("channelGrid"),
  questionGrid: $("questionGrid"),
  answerCard: $("answerCard"),
  answerTitle: $("answerTitle"),
  answerText: $("answerText"),
  codeDiagnosticPanel: $("codeDiagnosticPanel"),
  activationCodeInput: $("activationCodeInput"),
  checkCodeBtn: $("checkCodeBtn"),
  diagnosticStatus: $("diagnosticStatus"),
  connectEmeBtn: $("connectEmeBtn"),
  freeQuestion: $("freeQuestion"),
  askEmeBtn: $("askEmeBtn"),
  freeAnswerCard: $("freeAnswerCard"),
  freeAnswerTitle: $("freeAnswerTitle"),
  freeAnswerText: $("freeAnswerText"),
  freeProblemContinuesBtn: $("freeProblemContinuesBtn"),
  ticketForm: $("ticketForm"),
  ticketIntro: $("ticketIntro"),
  ticketFirstName: $("ticketFirstName"),
  ticketLastName: $("ticketLastName"),
  ticketEmail: $("ticketEmail"),
  ticketPhone: $("ticketPhone"),
  ticketChannel: $("ticketChannel"),
  trendyolOrderHint: $("trendyolOrderHint"),
  ticketCode: $("ticketCode"),
  ticketOrder: $("ticketOrder"),
  ticketMessage: $("ticketMessage"),
  createTicketBtn: $("createTicketBtn"),
  ticketStatus: $("ticketStatus")
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 64);
}

function cleanField(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function setStatus(el, message = "", type = "") {
  if (!el) return;
  el.textContent = message;
  el.className = `status ${type}`.trim();
}

function selectedQuestion() {
  return QUESTIONS.find((item) => item.id === state.questionId) || null;
}

function includesAny(text, keywords) {
  const haystack = normalizeText(text);
  return keywords.some((keyword) => haystack.includes(keyword));
}

function isInScope(message) {
  return includesAny(message, SCOPE_KEYWORDS);
}

function needsHumanSupport(message) {
  return includesAny(message, HANDOFF_KEYWORDS);
}

function findQuestionByMessage(message) {
  return QUESTIONS.find((q) => includesAny(message, QUESTION_KEYWORDS[q.id] || [])) || null;
}

async function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch {}
  return headers;
}

function setChannel(channel) {
  state.channel = channel || "italky";
  localStorage.setItem("italky_eme_purchase_channel_v1", state.channel);
  if (els.ticketChannel) els.ticketChannel.value = state.channel;
  els.trendyolOrderHint?.classList.toggle("hidden", state.channel !== "trendyol");
}

function renderChannels() {
  els.channelGrid.innerHTML = CHANNELS.map((item) => `
    <button class="choice-btn ${item.id === state.channel ? "active" : ""}" type="button" data-channel="${item.id}">
      ${item.label}
    </button>
  `).join("");

  els.channelGrid.querySelectorAll("[data-channel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setChannel(btn.dataset.channel || "italky");
      renderChannels();
    });
  });
}

function renderQuestions() {
  els.questionGrid.innerHTML = QUESTIONS.map((item) => `
    <button class="question-btn ${item.id === state.questionId ? "active" : ""}" type="button" data-question="${item.id}">
      ${item.title}
    </button>
  `).join("");

  els.questionGrid.querySelectorAll("[data-question]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.questionId = btn.dataset.question || "";
      renderQuestions();
      openAnswer();
    });
  });
}

function openAnswer() {
  const q = selectedQuestion();
  if (!q) return;

  els.answerTitle.textContent = q.title;
  els.answerText.textContent = q.answer;
  els.answerCard.classList.add("show");
  els.codeDiagnosticPanel.classList.toggle("hidden", !q.needsCode);
  setStatus(els.diagnosticStatus, "", "");

  if (q.needsCode) {
    setTimeout(() => els.activationCodeInput?.focus?.(), 80);
  }
}

function answerFreeQuestion() {
  const message = cleanField(els.freeQuestion?.value, 2000);
  state.lastUserMessage = message;

  els.freeAnswerCard.classList.add("show");
  els.freeAnswerTitle.textContent = "Eme yanıtı";

  if (!message) {
    els.freeAnswerText.textContent = "Lütfen italkyAI ile ilgili sorununuzu kısaca yazın.";
    return;
  }

  if (!isInScope(message)) {
    els.freeAnswerText.textContent = OUT_OF_SCOPE_RESPONSE;
    return;
  }

  if (needsHumanSupport(message)) {
    els.freeAnswerText.textContent = HANDOFF_MESSAGE;
    prefillTicket(message);
    showTicketForm(true);
    return;
  }

  const matched = findQuestionByMessage(message);
  if (matched) {
    state.questionId = matched.id;
    renderQuestions();
    openAnswer();
    els.freeAnswerText.textContent = matched.answer;
    return;
  }

  els.freeAnswerText.textContent =
    "Eme’ye bağlanıyorsunuz... Sorununuzu anlamaya çalışıyorum. Gerekirse sizi müşteri hizmetlerimize yönlendireceğim.";
  prefillTicket(message);
}

async function diagnoseCode() {
  const code = normalizeCode(els.activationCodeInput.value);
  els.activationCodeInput.value = code;
  state.lastCode = code;

  if (!code) {
    setStatus(els.diagnosticStatus, "Aktivasyon kodu boş olamaz.", "err");
    return;
  }

  els.checkCodeBtn.disabled = true;
  setStatus(els.diagnosticStatus, "Kod kontrol ediliyor...", "warn");

  try {
    const res = await fetch(`${API_BASE}/code-diagnostic`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        code,
        purchase_channel: state.channel
      })
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.message) throw new Error(json?.message || json?.detail || `HTTP_${res.status}`);

    const safeMessage = json.status === "used_by_other"
      ? "Bu kod farklı bir hesapta kullanılmış görünüyor."
      : String(json.message || "");
    setStatus(els.diagnosticStatus, safeMessage, json.status === "not_found" ? "err" : "ok");
  } catch {
    setStatus(
      els.diagnosticStatus,
      "Eme şu anda kodunuzu otomatik kontrol edemedi. Destek formunu doldurarak devam edebilirsiniz.",
      "warn"
    );
    prefillTicket();
    showTicketForm(true);
  } finally {
    els.checkCodeBtn.disabled = false;
  }
}

function prefillTicket(message = "") {
  if (els.ticketChannel) els.ticketChannel.value = state.channel;
  els.trendyolOrderHint?.classList.toggle("hidden", (els.ticketChannel?.value || state.channel) !== "trendyol");
  if (els.ticketCode && state.lastCode) els.ticketCode.value = state.lastCode;

  const q = selectedQuestion();
  const text = message || state.lastUserMessage || (q ? q.title : "");
  if (els.ticketMessage && text && !els.ticketMessage.value.trim()) {
    els.ticketMessage.value = text;
  }
}

function showTicketForm(fromConnect = false) {
  prefillTicket();
  els.ticketForm.classList.add("show");

  if (fromConnect) {
    if (els.ticketIntro) els.ticketIntro.textContent = HANDOFF_MESSAGE;
    setStatus(els.ticketStatus, `${CONNECTING_TEXT} ${CONNECTING_DETAIL}`, "warn");
    setTimeout(() => {
      if (els.ticketStatus.textContent.includes(CONNECTING_TEXT)) {
        setStatus(els.ticketStatus, "Lütfen formu doldurun. En az e-posta veya telefon bilgilerinden biri gereklidir.", "");
      }
    }, 800);
  }

  setTimeout(() => els.ticketForm.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}

function validateTicket(payload) {
  if (!payload.first_name) return "Lütfen adınızı yazın.";
  if (!payload.last_name) return "Lütfen soyadınızı yazın.";
  if (!payload.email && !payload.phone) return "Lütfen e-posta veya telefon bilgilerinden en az birini yazın.";
  if (!payload.message) return "Lütfen sorun açıklamasını yazın.";
  return "";
}

async function createTicket() {
  const payload = {
    first_name: cleanField(els.ticketFirstName?.value, 80),
    last_name: cleanField(els.ticketLastName?.value, 80),
    email: cleanField(els.ticketEmail?.value, 160),
    phone: cleanField(els.ticketPhone?.value, 32),
    purchase_channel: els.ticketChannel?.value || state.channel,
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
  setStatus(els.ticketStatus, "Destek talebi gönderiliyor...", "warn");

  try {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    setStatus(els.ticketStatus, SUCCESS_MESSAGE, "ok");
  } catch {
    setStatus(els.ticketStatus, ERROR_MESSAGE, "err");
  } finally {
    els.createTicketBtn.disabled = false;
  }
}

function boot() {
  renderChannels();
  renderQuestions();
  setChannel(state.channel);

  els.activationCodeInput?.addEventListener("input", () => {
    els.activationCodeInput.value = normalizeCode(els.activationCodeInput.value);
  });
  els.ticketCode?.addEventListener("input", () => {
    els.ticketCode.value = normalizeCode(els.ticketCode.value);
  });
  els.ticketChannel?.addEventListener("change", () => {
    setChannel(els.ticketChannel.value);
    renderChannels();
  });
  els.checkCodeBtn?.addEventListener("click", diagnoseCode);
  els.connectEmeBtn?.addEventListener("click", () => showTicketForm(true));
  els.askEmeBtn?.addEventListener("click", answerFreeQuestion);
  els.freeProblemContinuesBtn?.addEventListener("click", () => showTicketForm(true));
  els.createTicketBtn?.addEventListener("click", createTicket);
}

boot();
