import {
  VOICE_SAMPLE_TEXTS,
  SAMPLE_COUNT,
  fmtSec,
  getUserPreferredLang,
  createEmptyRecordings,
  getUserOrThrow,
  finishVoiceProfile,
  enrollTTSVoice,
  markCloneAsSelected,
  VoiceProfileRecorder
} from "/js/voice_profile_core.js";

const $ = (id) => document.getElementById(id);

const recordBtn = $("recordBtn");
const nextBtn = $("nextBtn");
const finishBtn = $("finishBtn");
const backBtn = $("backBtn");
const cancelBtn = $("cancelBtn");

const statusText = $("statusText");
const timerText = $("timerText");
const toastEl = $("toast");

const sampleLabel = $("sampleLabel");
const sampleText = $("sampleText");
const progressCount = $("progressCount");
const progressFill = $("progressFill");
const completedList = $("completedList");
const micWrapper = $("micWrapper");

let recorder = new VoiceProfileRecorder();
let timerInt = null;
let saving = false;

let currentIndex = 0;
let currentBlob = null;
let currentSeconds = 0;
let currentMime = "";
let uiLang = "tr";
let samples = VOICE_SAMPLE_TEXTS.tr;
const recordings = createEmptyRecordings();

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__voiceToast);
  window.__voiceToast = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function resetTimer() {
  clearInterval(timerInt);
  timerInt = null;
  if (timerText) timerText.textContent = "00:00";
}

function startTimer() {
  resetTimer();
  timerInt = setInterval(() => {
    const sec = Math.max(1, Math.floor((Date.now() - recorder.startedAt) / 1000));
    if (timerText) timerText.textContent = fmtSec(sec);
  }, 200);
}

function setListening(on) {
  if (on) {
    recordBtn?.classList.add("listening");
    micWrapper?.classList.add("listening");
  } else {
    recordBtn?.classList.remove("listening");
    micWrapper?.classList.remove("listening");
  }
}

function renderCompletedList() {
  if (!completedList) return;

  const items = recordings
    .map((r, idx) => ({ ...r, idx }))
    .filter((r) => !!r.blob);

  completedList.innerHTML = items.length
    ? items.map((item) => `
        <div class="completed-item">
          <div>Cümle ${item.idx + 1} tamamlandı</div>
          <div>${fmtSec(item.seconds)}</div>
        </div>
      `).join("")
    : "";
}

function renderProgress() {
  const doneCount = recordings.filter((x) => !!x.blob).length;
  const currentHuman = Math.min(currentIndex + 1, SAMPLE_COUNT);

  if (progressCount) progressCount.textContent = `${currentHuman} / ${SAMPLE_COUNT}`;

  if (progressFill) {
    const pct = Math.max(0, Math.min(100, (doneCount / SAMPLE_COUNT) * 100));
    progressFill.style.width = `${pct}%`;
  }

  if (nextBtn) {
    nextBtn.disabled = !(recordings[currentIndex]?.blob && currentIndex < SAMPLE_COUNT - 1) || saving;
  }

  if (finishBtn) {
    finishBtn.disabled = !(doneCount === SAMPLE_COUNT) || saving;
  }
}

function applyCurrentSample() {
  const text = samples[currentIndex] || "—";

  if (sampleLabel) sampleLabel.textContent = `CÜMLE ${currentIndex + 1}`;
  if (sampleText) sampleText.textContent = text;

  const existing = recordings[currentIndex];
  resetTimer();

  if (existing?.blob) {
    currentBlob = existing.blob;
    currentSeconds = existing.seconds || 0;
    currentMime = existing.mime || "audio/webm";
    if (timerText) timerText.textContent = fmtSec(currentSeconds);
    if (statusText) {
      statusText.textContent = currentIndex === SAMPLE_COUNT - 1
        ? "Kayıt tamamlandı • Kaydet butonuna bas"
        : "Kayıt tamamlandı • Sonraki cümleye geç";
    }
  } else {
    currentBlob = null;
    currentSeconds = 0;
    currentMime = "";
    if (timerText) timerText.textContent = "00:00";
    if (statusText) statusText.textContent = "Mikrofona dokun ve konuşmaya başla";
  }

  if (nextBtn) nextBtn.style.display = currentIndex === SAMPLE_COUNT - 1 ? "none" : "block";
  if (finishBtn) finishBtn.style.display = currentIndex === SAMPLE_COUNT - 1 ? "block" : "none";

  renderProgress();
  renderCompletedList();
}

async function startRecording() {
  try {
    currentBlob = null;
    currentSeconds = 0;
    currentMime = "";
    resetTimer();

    await recorder.start();

    setListening(true);
    if (statusText) statusText.textContent = "Kayıt başladı • Bitirmek için mikrofona tekrar dokun";
    startTimer();
  } catch (e) {
    console.warn("[voice startRecording]", e);
    setListening(false);
    resetTimer();
    if (statusText) statusText.textContent = "Mikrofon izni alınamadı";
    toast(e?.message || "Mikrofon izni gerekli");
  }
}

async function stopRecording() {
  try {
    const result = await recorder.stop();

    clearInterval(timerInt);
    setListening(false);

    currentBlob = result.blob;
    currentSeconds = result.seconds;
    currentMime = result.mime;

    recordings[currentIndex] = {
      blob: currentBlob,
      seconds: currentSeconds,
      mime: currentMime
    };

    if (statusText) {
      statusText.textContent = currentIndex === SAMPLE_COUNT - 1
        ? "Kayıt tamamlandı • Kaydet butonuna bas"
        : "Kayıt tamamlandı • Sonraki cümleye geç";
    }

    renderProgress();
    renderCompletedList();
  } catch (e) {
    console.warn("[voice stopRecording]", e);
    setListening(false);
    if (statusText) statusText.textContent = "Kayıt durdurulamadı";
    toast("Kayıt durdurulamadı");
  }
}

async function finishAll() {
  if (saving) return;

  const doneCount = recordings.filter((x) => !!x.blob).length;
  if (doneCount !== SAMPLE_COUNT) {
    toast("Tüm cümleleri tamamla");
    return;
  }

  saving = true;
  finishBtn && (finishBtn.disabled = true);
  nextBtn && (nextBtn.disabled = true);
  recordBtn && (recordBtn.disabled = true);

  if (statusText) statusText.textContent = "Ses profili kaydediliyor...";

  try {
    await finishVoiceProfile(uiLang, recordings);

    if (statusText) statusText.textContent = "Ses profili işleniyor...";
    const enrollResp = await enrollTTSVoice();

    await markCloneAsSelected(enrollResp);

    if (statusText) statusText.textContent = "Ses profili hazır • Kendi Sesim seçildi";
    toast("Ses profili hazır");

    setTimeout(() => {
      location.href = "/pages/translation_settings.html";
    }, 900);
  } catch (e) {
    console.warn("[voice finish]", e);
    if (statusText) statusText.textContent = e?.message || "Profil oluşturulamadı";
    toast(e?.message || "Profil oluşturulamadı");
  } finally {
    saving = false;
    recordBtn && (recordBtn.disabled = false);
    renderProgress();
  }
}

async function bootPage() {
  const user = await getUserOrThrow();
  uiLang = getUserPreferredLang(user);
  samples = VOICE_SAMPLE_TEXTS[uiLang] || VOICE_SAMPLE_TEXTS.tr;

  applyCurrentSample();

  recordBtn?.addEventListener("click", async () => {
    if (saving) return;

    if (recorder.isRecording) {
      await stopRecording();
      return;
    }

    await startRecording();
  });

  nextBtn?.addEventListener("click", () => {
    if (saving) return;

    if (!recordings[currentIndex]?.blob) {
      toast("Önce bu cümleyi kaydet");
      return;
    }

    if (currentIndex >= SAMPLE_COUNT - 1) return;

    currentIndex += 1;
    applyCurrentSample();
  });

  finishBtn?.addEventListener("click", finishAll);

  backBtn?.addEventListener("click", () => {
    history.back();
  });

  cancelBtn?.addEventListener("click", () => {
    history.back();
  });
}

window.addEventListener("beforeunload", () => {
  try {
    recorder.destroy();
  } catch {}
  clearInterval(timerInt);
});

bootPage().catch((e) => {
  console.error("[voice_profile_page boot]", e);
  toast("Sayfa başlatılamadı");
});

export function initVoiceProfile() {
  // Bilerek boş. Otomatik boot ediliyor.
}
