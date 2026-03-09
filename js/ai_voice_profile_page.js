// FILE: /js/ai_voice_profile_page.js

import { supabase } from "/js/supabase_client.js";

const BUCKET = "voice-samples";
const SAMPLE_COUNT = 6;

const $ = (id) => document.getElementById(id);

const recordBtn = $("recordBtn");
const nextBtn = $("nextBtn");
const finishBtn = $("finishBtn");
const backBtn = $("backBtn");

const statusText = $("statusText");
const timerText = $("timerText");
const toastEl = $("toast");

const sampleLabel = $("sampleLabel");
const sampleText = $("sampleText");
const progressCount = $("progressCount");
const progressFill = $("progressFill");
const completedList = $("completedList");

let mediaRecorder = null;
let mediaStream = null;
let audioChunks = [];
let isRecording = false;
let timerInt = null;
let startedAt = 0;

let currentIndex = 0;
let currentBlob = null;
let currentSeconds = 0;
let currentMime = "";
let saving = false;

const recordings = Array.from({ length: SAMPLE_COUNT }, () => ({
  blob: null,
  seconds: 0,
  mime: "",
}));

const SAMPLE_TEXTS = {
  tr: [
    "Merhaba, ben Sohbet AI için özel ses profilimi oluşturuyorum.",
    "Bugün kendimi oldukça iyi hissediyorum ve ses örneğimi kaydediyorum.",
    "Yapay zekâ ile sohbet etmek artık daha doğal ve daha kişisel olacak.",
    "Bu özel kayıt sayesinde cevaplar bana daha yakın bir sesle okunacak.",
    "Net, sakin ve doğal bir şekilde konuşmaya devam ediyorum.",
    "Şimdi son örneği de tamamlıyorum ve AI özel sesimi kaydediyorum."
  ],
  en: [
    "Hello, I am creating my custom voice profile for Chat AI.",
    "I feel quite good today and I am recording my voice sample.",
    "Talking with artificial intelligence will now feel more natural and personal.",
    "With this custom recording, replies will be read in a voice closer to me.",
    "I continue speaking clearly, calmly, and naturally.",
    "I am now finishing the final sample and saving my custom AI voice."
  ],
  de: [
    "Hallo, ich erstelle mein spezielles Sprachprofil für den Chat AI.",
    "Heute fühle ich mich gut und nehme mein Sprachbeispiel auf.",
    "Gespräche mit künstlicher Intelligenz werden jetzt natürlicher und persönlicher.",
    "Dank dieser Aufnahme werden Antworten mit einer Stimme gelesen, die meiner ähnlicher ist.",
    "Ich spreche weiterhin klar, ruhig und natürlich.",
    "Jetzt beende ich das letzte Beispiel und speichere meine spezielle AI Stimme."
  ],
  fr: [
    "Bonjour, je crée mon profil vocal personnalisé pour le Chat AI.",
    "Aujourd’hui je me sens bien et j’enregistre mon échantillon de voix.",
    "Parler avec une intelligence artificielle sera désormais plus naturel et plus personnel.",
    "Grâce à cet enregistrement, les réponses seront lues avec une voix plus proche de la mienne.",
    "Je continue à parler clairement, calmement et naturellement.",
    "Je termine maintenant le dernier exemple et j’enregistre ma voix IA personnalisée."
  ],
  it: [
    "Ciao, sto creando il mio profilo vocale personalizzato per Chat AI.",
    "Oggi mi sento bene e sto registrando il mio campione vocale.",
    "Parlare con l’intelligenza artificiale sarà ora più naturale e più personale.",
    "Grazie a questa registrazione, le risposte saranno lette con una voce più vicina alla mia.",
    "Continuo a parlare in modo chiaro, calmo e naturale.",
    "Ora completo l’ultimo esempio e salvo la mia voce AI personalizzata."
  ],
  es: [
    "Hola, estoy creando mi perfil de voz personalizado para Chat AI.",
    "Hoy me siento bastante bien y estoy grabando mi muestra de voz.",
    "Hablar con inteligencia artificial será ahora más natural y más personal.",
    "Gracias a esta grabación, las respuestas se leerán con una voz más parecida a la mía.",
    "Sigo hablando de forma clara, tranquila y natural.",
    "Ahora termino la última muestra y guardo mi voz AI personalizada."
  ]
};

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__voiceToast);
  window.__voiceToast = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function fmtSec(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function getUserPreferredLang(user) {
  const fromMeta =
    user?.user_metadata?.language ||
    user?.user_metadata?.lang ||
    user?.user_metadata?.site_lang ||
    user?.app_metadata?.language ||
    "";

  const raw = String(fromMeta || "tr").toLowerCase().trim();
  const base = raw.split("-")[0];
  return SAMPLE_TEXTS[base] ? base : "tr";
}

function getSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    ""
  ];

  for (const type of candidates) {
    try {
      if (!type) return "";
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
    } catch {}
  }
  return "";
}

function resetTimer() {
  clearInterval(timerInt);
  timerInt = null;
  startedAt = 0;
  currentSeconds = 0;
  if (timerText) timerText.textContent = "00:00";
}

function startTimer() {
  startedAt = Date.now();
  if (timerText) timerText.textContent = "00:00";
  clearInterval(timerInt);
  timerInt = setInterval(() => {
    const sec = (Date.now() - startedAt) / 1000;
    currentSeconds = Math.max(1, Math.floor(sec));
    if (timerText) timerText.textContent = fmtSec(sec);
  }, 200);
}

function stopTracks() {
  try {
    mediaStream?.getTracks?.().forEach((t) => t.stop());
  } catch {}
  mediaStream = null;
}

function renderCompletedList() {
  if (!completedList) return;

  const items = recordings
    .map((r, idx) => ({ ...r, idx }))
    .filter((r) => !!r.blob);

  completedList.innerHTML = items.length
    ? items.map((item) => `
        <div class="completedItem">
          <div class="completedText">Cümle ${item.idx + 1} tamamlandı</div>
          <div class="completedDur">${fmtSec(item.seconds)}</div>
        </div>
      `).join("")
    : "";
}

function renderProgress() {
  const doneCount = recordings.filter((x) => !!x.blob).length;
  const currentHuman = Math.min(currentIndex + 1, SAMPLE_COUNT);

  if (progressCount) {
    progressCount.textContent = `${currentHuman} / ${SAMPLE_COUNT}`;
  }

  if (progressFill) {
    const pct = Math.max(0, Math.min(100, (doneCount / SAMPLE_COUNT) * 100));
    progressFill.style.width = `${pct}%`;
  }

  if (nextBtn) nextBtn.disabled = !(recordings[currentIndex]?.blob && currentIndex < SAMPLE_COUNT - 1) || saving;
  if (finishBtn) finishBtn.disabled = !(doneCount === SAMPLE_COUNT) || saving;
}

function applyCurrentSample(samples) {
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
    if (statusText) statusText.textContent = "Kayıt tamamlandı • Sonraki cümleye geç";
  } else {
    currentBlob = null;
    currentSeconds = 0;
    currentMime = "";
    if (statusText) statusText.textContent = "Mikrofona dokun ve konuşmaya başla";
  }

  renderProgress();
  renderCompletedList();
}

async function startRecording() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Bu cihaz mikrofon kaydını desteklemiyor");
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    audioChunks = [];
    currentBlob = null;
    currentSeconds = 0;
    currentMime = "";
    resetTimer();

    const mimeType = getSupportedMimeType();
    mediaRecorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream);

    mediaRecorder.onstart = () => {
      isRecording = true;
      recordBtn?.classList.add("listening");
      if (statusText) statusText.textContent = "Kayıt başladı • Bitirmek için mikrofona tekrar dokun";
      startTimer();
    };

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onerror = (e) => {
      console.warn("[ai voice recorder error]", e);
      isRecording = false;
      recordBtn?.classList.remove("listening");
      if (statusText) statusText.textContent = "Kayıt başlatılamadı";
      stopTracks();
      resetTimer();
      toast("Kayıt başlatılamadı");
    };

    mediaRecorder.onstop = () => {
      const finalType = mediaRecorder?.mimeType || "audio/webm";
      currentBlob = new Blob(audioChunks, { type: finalType });
      currentMime = finalType;

      if (!currentSeconds || currentSeconds < 1) {
        currentSeconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
      }

      recordings[currentIndex] = {
        blob: currentBlob,
        seconds: currentSeconds,
        mime: currentMime
      };

      isRecording = false;
      recordBtn?.classList.remove("listening");
      if (statusText) statusText.textContent = "Kayıt tamamlandı • Sonraki cümleye geç";
      stopTracks();
      clearInterval(timerInt);

      renderProgress();
      renderCompletedList();
    };

    mediaRecorder.start(250);
  } catch (e) {
    console.warn("[ai voice startRecording]", e);
    isRecording = false;
    recordBtn?.classList.remove("listening");
    stopTracks();
    resetTimer();
    if (statusText) statusText.textContent = "Mikrofon izni alınamadı";
    toast(e?.message || "Mikrofon izni gerekli");
  }
}

function stopRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  } catch (e) {
    console.warn("[ai voice stopRecording]", e);
    if (statusText) statusText.textContent = "Kayıt durdurulamadı";
    toast("Kayıt durdurulamadı");
  }
}

async function getUserOrThrow() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data?.user || null;
  if (!user?.id) throw new Error("Oturum bulunamadı");
  return user;
}

function getExtensionFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("mpeg")) return "mp3";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  return "webm";
}

function buildFilePath(userId, idx, ext = "webm") {
  return `${userId}/ai-voice-sample-${idx + 1}-${Date.now()}.${ext}`;
}

function parseOldPaths(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);

  const s = String(raw).trim();
  if (!s) return [];

  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
    } catch {
      return [];
    }
  }

  return [s];
}

async function deletePathsIfExist(paths) {
  const list = (Array.isArray(paths) ? paths : []).filter(Boolean);
  if (!list.length) return;

  try {
    await supabase.storage.from(BUCKET).remove(list);
  } catch (e) {
    console.warn("[ai voice delete old samples]", e);
  }
}

async function loadCurrentProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, ai_voice_sample_path")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function uploadAllSamples(user) {
  const uploaded = [];

  for (let i = 0; i < recordings.length; i++) {
    const item = recordings[i];
    if (!item?.blob) throw new Error(`Cümle ${i + 1} eksik`);

    const mime = item.mime || item.blob.type || "audio/webm";
    const ext = getExtensionFromMime(mime);
    const path = buildFilePath(user.id, i, ext);

    const { error: uploadErr } = await supabase
      .storage
      .from(BUCKET)
      .upload(path, item.blob, {
        contentType: mime,
        upsert: true
      });

    if (uploadErr) throw uploadErr;

    uploaded.push({
      index: i,
      path,
      mime,
      seconds: item.seconds || 0
    });
  }

  return uploaded;
}

async function createFirstSignedUrl(path) {
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (error) throw error;
  return data?.signedUrl || "";
}

async function finishAiVoiceProfile(uiLang) {
  const user = await getUserOrThrow();
  const profile = await loadCurrentProfile(user.id);

  const oldPaths = parseOldPaths(profile?.ai_voice_sample_path);
  const uploaded = await uploadAllSamples(user);
  const previewUrl = uploaded[0]?.path ? await createFirstSignedUrl(uploaded[0].path) : "";
  const totalSec = uploaded.reduce((sum, x) => sum + Number(x.seconds || 0), 0);

  const payload = {
    ai_voice_sample_url: previewUrl,
    ai_voice_sample_path: JSON.stringify(uploaded.map(x => x.path)),
    ai_voice_sample_mime: "multi",
    ai_voice_sample_seconds: totalSec,
    ai_voice_profile_ready: true,
    ai_voice_profile_updated_at: new Date().toISOString(),
    ai_voice_profile_lang: uiLang || "tr"
  };

  const { error: updateErr } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (updateErr) {
    await deletePathsIfExist(uploaded.map(x => x.path));
    throw updateErr;
  }

  await deletePathsIfExist(oldPaths);
  return uploaded;
}

async function bootPage() {
  const user = await getUserOrThrow();
  const lang = getUserPreferredLang(user);
  const samples = SAMPLE_TEXTS[lang] || SAMPLE_TEXTS.tr;

  applyCurrentSample(samples);

  recordBtn?.addEventListener("click", async () => {
    if (saving) return;

    if (isRecording) {
      stopRecording();
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
    applyCurrentSample(samples);
  });

  finishBtn?.addEventListener("click", async () => {
    if (saving) return;

    const doneCount = recordings.filter(x => !!x.blob).length;
    if (doneCount !== SAMPLE_COUNT) {
      toast("Tüm cümleleri tamamla");
      return;
    }

    saving = true;
    finishBtn.disabled = true;
    nextBtn.disabled = true;
    recordBtn.disabled = true;

    if (statusText) statusText.textContent = "AI özel ses kaydediliyor...";

    try {
      await finishAiVoiceProfile(lang);
      if (statusText) statusText.textContent = "AI özel ses kaydedildi";
      toast("AI özel ses kaydedildi");

      setTimeout(() => {
        location.href = "/pages/profile.html";
      }, 700);
    } catch (e) {
      console.warn("[ai voice finish]", e);
      if (statusText) statusText.textContent = e?.message || "Profil oluşturulamadı";
      toast(e?.message || "Profil oluşturulamadı");
    } finally {
      saving = false;
      recordBtn.disabled = false;
      renderProgress();
    }
  });

  backBtn?.addEventListener("click", () => {
    history.back();
  });
}

window.addEventListener("beforeunload", () => {
  try {
    if (isRecording && mediaRecorder?.state !== "inactive") {
      mediaRecorder.stop();
    }
  } catch {}
  stopTracks();
  clearInterval(timerInt);
});

bootPage().catch((e) => {
  console.error("[ai_voice_profile_page boot]", e);
  toast("Sayfa başlatılamadı");
});
