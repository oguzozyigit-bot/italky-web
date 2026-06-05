// FILE: /js/eme_support.js
import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com/api/support/eme";

const CHANNELS = [
  { id: "italky", label: "italkyAI üzerinden aldım" },
  { id: "trendyol", label: "Trendyol üzerinden aldım" },
  { id: "other", label: "Diğer / bilmiyorum" }
];

const QUESTIONS = [
  {
    id: "used-code",
    title: "Kod daha önce kullanılmış diyor",
    answer: "Bu durumda önce kodun hangi kanaldan alındığını ve kodun hesap geçmişinde nasıl göründüğünü kontrol etmemiz gerekir. Kod aynı hesapta kullanılmışsa üyelik süresi görünümünü, farklı hesapta kullanılmışsa gizliliği koruyarak destek adımını açarız.",
    needsCode: true
  },
  {
    id: "invalid-code",
    title: "Kod geçersiz diyor",
    answer: "Kodu boşluk bırakmadan, büyük harfle ve eksiksiz girin. Harf/sayı karışıklığı varsa O-0 veya I-1 gibi karakterleri kontrol edin. Sorun sürerse Eme’ye bağlanarak destek talebi oluşturabilirsiniz."
  },
  {
    id: "not-applied",
    title: "Kod hesabıma işlenmedi",
    answer: "Kod uygulandıktan sonra üyelik süresi bazen kısa süre içinde yenilenir. Ana sayfaya dönüp hesabınızı yenileyin. Süre hâlâ görünmüyorsa kodu ve satın alma kanalını ekleyerek destek talebi oluşturun."
  },
  {
    id: "trendyol-activate",
    title: "Trendyol’dan aldım, nasıl aktif edeceğim?",
    answer: "Trendyol siparişlerinde bu fazda canlı sipariş doğrulaması yoktur. Sipariş numaranızı ve aktivasyon kodunuzu destek talebine ekleyin. Gelecek fazda onay kodu ile sınırlı sipariş doğrulama akışı açılacaktır."
  },
  {
    id: "wrong-account",
    title: "Kodumu başka hesaba girdim",
    answer: "Kod farklı bir hesapta kullanıldıysa hesap detaylarını paylaşamayız. Size ait hesabı doğruladıktan sonra destek ekibi uygun aktarım veya inceleme seçeneklerini değerlendirebilir."
  },
  {
    id: "duration-missing",
    title: "Üyelik sürem görünmüyor",
    answer: "Önce ana sayfayı yenileyin ve aynı hesapla giriş yaptığınızdan emin olun. Üyelik hâlâ görünmüyorsa kod, kanal ve varsa sipariş numarasıyla destek talebi oluşturun."
  },
  {
    id: "app-rejects",
    title: "Uygulama kodu kabul etmiyor",
    answer: "Kod alanında boşluk, küçük harf veya özel karakter kalmadığından emin olun. Kod türü doğru sayfada kullanılmalıdır: dijital aktivasyon kodları Kod ile Gün Yükle ekranından denenmelidir."
  },
  {
    id: "validity",
    title: "Kod kaç ay geçerli?",
    answer: "Kodun süresi kampanya veya satın alma paketine göre değişir. Kodun kaç aylık hak verdiği sistemdeki kampanya kaydına bağlıdır; emin değilseniz kodu ekleyerek Eme’ye bağlanın."
  },
  {
    id: "reuse",
    title: "Aynı kodu tekrar kullanabilir miyim?",
    answer: "Genellikle aynı aktivasyon kodu bir kez kullanılabilir. Aynı hesapta daha önce kullanılmışsa üyelik süresi zaten eklenmiş olabilir; farklı hesapta kullanılmışsa gizlilik nedeniyle hesap detayı paylaşılmaz."
  }
];

const state = {
  channel: localStorage.getItem("italky_eme_purchase_channel_v1") || "italky",
  questionId: "",
  lastCode: ""
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
  ticketForm: $("ticketForm"),
  ticketChannel: $("ticketChannel"),
  ticketCode: $("ticketCode"),
  ticketOrder: $("ticketOrder"),
  ticketMessage: $("ticketMessage"),
  createTicketBtn: $("createTicketBtn"),
  ticketStatus: $("ticketStatus")
};

function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 64);
}

function setStatus(el, message = "", type = "") {
  if (!el) return;
  el.textContent = message;
  el.className = `status ${type}`.trim();
}

function selectedQuestion() {
  return QUESTIONS.find((item) => item.id === state.questionId) || null;
}

async function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch {}
  return headers;
}

function renderChannels() {
  els.channelGrid.innerHTML = CHANNELS.map((item) => `
    <button class="choice-btn ${item.id === state.channel ? "active" : ""}" type="button" data-channel="${item.id}">
      ${item.label}
    </button>
  `).join("");

  els.channelGrid.querySelectorAll("[data-channel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.channel = btn.dataset.channel || "italky";
      localStorage.setItem("italky_eme_purchase_channel_v1", state.channel);
      if (els.ticketChannel) els.ticketChannel.value = state.channel;
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

    setStatus(els.diagnosticStatus, json.message, json.status === "not_found" ? "err" : "ok");
  } catch {
    setStatus(
      els.diagnosticStatus,
      "Eme şu anda kodunuzu otomatik kontrol edemedi. Destek talebi oluşturarak devam edebilirsiniz.",
      "warn"
    );
    prefillTicket();
    showTicketForm(true);
  } finally {
    els.checkCodeBtn.disabled = false;
  }
}

function prefillTicket() {
  if (els.ticketChannel) els.ticketChannel.value = state.channel;
  if (els.ticketCode && state.lastCode) els.ticketCode.value = state.lastCode;
  const q = selectedQuestion();
  if (els.ticketMessage && q && !els.ticketMessage.value.trim()) {
    els.ticketMessage.value = `${q.title}: ${q.answer}`;
  }
}

function showTicketForm(fromConnect = false) {
  prefillTicket();
  els.ticketForm.classList.add("show");
  if (fromConnect) {
    setStatus(els.ticketStatus, "Eme’ye bağlanıyorsunuz...", "warn");
    setTimeout(() => {
      if (els.ticketStatus.textContent === "Eme’ye bağlanıyorsunuz...") {
        setStatus(els.ticketStatus, "Destek talebi bilgilerini doldurarak devam edebilirsiniz.", "");
      }
    }, 650);
  }
  setTimeout(() => els.ticketForm.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}

async function createTicket() {
  const payload = {
    purchase_channel: els.ticketChannel.value || state.channel,
    activation_code: normalizeCode(els.ticketCode.value),
    order_number: String(els.ticketOrder.value || "").trim().slice(0, 80),
    message: String(els.ticketMessage.value || "").trim().slice(0, 2000),
    topic: selectedQuestion()?.title || "Eme destek talebi"
  };

  if (!payload.message && !payload.activation_code && !payload.order_number) {
    setStatus(els.ticketStatus, "Lütfen kod, sipariş numarası veya kısa açıklama ekleyin.", "err");
    return;
  }

  els.createTicketBtn.disabled = true;
  setStatus(els.ticketStatus, "Destek talebi oluşturuluyor...", "warn");

  try {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.message || json?.detail || `HTTP_${res.status}`);

    setStatus(els.ticketStatus, json?.message || "Destek talebiniz oluşturuldu. Eme ekibi inceleyecek.", "ok");
  } catch {
    setStatus(
      els.ticketStatus,
      "Bu fazda otomatik kayıt servisi hazır değil. Bilgileriniz ekranda hazır; support@italky.ai üzerinden iletebilirsiniz.",
      "warn"
    );
  } finally {
    els.createTicketBtn.disabled = false;
  }
}

function boot() {
  renderChannels();
  renderQuestions();
  if (els.ticketChannel) els.ticketChannel.value = state.channel;

  els.activationCodeInput?.addEventListener("input", () => {
    els.activationCodeInput.value = normalizeCode(els.activationCodeInput.value);
  });
  els.ticketCode?.addEventListener("input", () => {
    els.ticketCode.value = normalizeCode(els.ticketCode.value);
  });
  els.checkCodeBtn?.addEventListener("click", diagnoseCode);
  els.connectEmeBtn?.addEventListener("click", () => showTicketForm(true));
  els.createTicketBtn?.addEventListener("click", createTicket);
}

boot();
