// FILE: /js/voice_profile_page.js

import { supabase } from "/js/supabase_client.js";

const BUCKET = "voice-samples";
const SAMPLE_COUNT = 6;

const $ = (id) => document.getElementById(id);

const recordBtn = $("recordBtn");
const redoBtn = $("redoBtn");
const nextBtn = $("nextBtn");
const finishBtn = $("finishBtn");
const backBtn = $("backBtn");

const playPreviewBtn = $("playPreviewBtn");
const deletePreviewBtn = $("deletePreviewBtn");

const statusText = $("statusText");
const timerText = $("timerText");
const audioBox = $("audioBox");
const audioPreview = $("audioPreview");
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
let currentObjectUrl = "";

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
    "Merhaba, ben italkyAI kullanıyorum ve ses profilimi oluşturuyorum.",
    "Bugün hava oldukça güzel, dışarıda hafif bir rüzgâr var.",
    "Yeni bir dil öğrenmek sabır, tekrar ve düzenli pratik gerektirir.",
    "Yapay zekâ destekli çeviri, günlük iletişimi daha kolay hale getiriyor.",
    "Seyahat ederken hızlı ve doğru konuşma çevirisi büyük avantaj sağlar.",
    "Şimdi son örneği de tamamlıyorum ve ses profilimi kaydediyorum."
  ],
  en: [
    "Hello, I am using italkyAI and creating my voice profile.",
    "The weather is quite nice today, and there is a light breeze outside.",
    "Learning a new language requires patience, repetition, and regular practice.",
    "AI-powered translation makes daily communication easier and faster.",
    "Accurate speech translation is a great advantage while traveling abroad.",
    "I am finishing the final sample now and saving my voice profile."
  ],
  de: [
    "Hallo, ich benutze italkyAI und erstelle gerade mein Sprachprofil.",
    "Heute ist das Wetter ziemlich schön und draußen weht ein leichter Wind.",
    "Eine neue Sprache zu lernen erfordert Geduld, Wiederholung und regelmäßige Übung.",
    "KI-gestützte Übersetzung erleichtert die tägliche Kommunikation deutlich.",
    "Eine schnelle und genaue Sprachübersetzung ist auf Reisen ein großer Vorteil.",
    "Ich beende jetzt das letzte Beispiel und speichere mein Sprachprofil."
  ],
  fr: [
    "Bonjour, j’utilise italkyAI et je crée mon profil vocal.",
    "Il fait très beau aujourd’hui et il y a une légère brise dehors.",
    "Apprendre une nouvelle langue demande de la patience, de la répétition et une pratique régulière.",
    "La traduction assistée par intelligence artificielle facilite la communication quotidienne.",
    "Une traduction vocale rapide et précise est très utile pendant les voyages.",
    "Je termine maintenant le dernier exemple et j’enregistre mon profil vocal."
  ],
  it: [
    "Ciao, sto usando italkyAI e sto creando il mio profilo vocale.",
    "Oggi il tempo è piuttosto bello e fuori c’è una leggera brezza.",
    "Imparare una nuova lingua richiede pazienza, ripetizione e pratica regolare.",
    "La traduzione supportata dall’intelligenza artificiale rende più facile la comunicazione quotidiana.",
    "Una traduzione vocale rapida e precisa è un grande vantaggio quando si viaggia.",
    "Ora sto completando l’ultimo esempio e salvo il mio profilo vocale."
  ],
  es: [
    "Hola, estoy usando italkyAI y creando mi perfil de voz.",
    "Hoy hace bastante buen tiempo y afuera hay una brisa suave.",
    "Aprender un nuevo idioma requiere paciencia, repetición y práctica constante.",
    "La traducción con inteligencia artificial facilita la comunicación diaria.",
    "Una traducción de voz rápida y precisa es una gran ventaja al viajar.",
    "Ahora termino la última muestra y guardo mi perfil de voz."
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

function revokePreviewUrl() {
  try {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = "";
    }
  } catch {}
}

function clearPreview() {
  currentBlob = null;
  currentSeconds = 0;
  currentMime = "";
  revokePreviewUrl();

  if (audioPreview) {
    try { audioPreview.pause(); } catch {}
    audioPreview.removeAttribute("src");
    audioPreview.load();
  }

  audioBox?.classList.remove("show");
  resetTimer();
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

  const allDone = doneCount === SAMPLE_COUNT;

  if (redoBtn) redoBtn.disabled = !currentBlob || saving;
  if (nextBtn) nextBtn.disabled = !(currentBlob && currentIndex < SAMPLE_COUNT - 1) || saving;
  if (finishBtn) finishBtn.disabled = !allDone || saving;
}

function applyCurrentSample(samples) {
  const text = samples[currentIndex] || "—";
  if (sampleLabel) sampleLabel.textContent = `CÜMLE ${currentIndex + 1}`;
  if (sampleText) sampleText.textContent = text;

  const existing = recordings[currentIndex];
  clearPreview();

  if (existing?.blob) {
    currentBlob = existing.blob;
    currentSeconds = existing.seconds || 0;
    currentMime = existing.mime || "audio/webm";

    try {
      currentObjectUrl = URL.createObjectURL(currentBlob);
      if (audioPreview) audioPreview.src = currentObjectUrl;
      audioBox?.classList.add("show");
    } catch {}

    if (timerText) timerText.textContent = fmtSec(currentSeconds);
    if (statusText) statusText.textContent = "Kayıt tamamlandı • Dinle veya sonraki cümleye geç";
  } else {
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
    clearPreview();

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
      console.warn("[voice recorder error]", e);
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

      try {
        revokePreviewUrl();
        currentObjectUrl = URL.createObjectURL(currentBlob);
        if (audioPreview) audioPreview.src = currentObjectUrl;
        audioBox?.classList.add("show");
      } catch {}

      isRecording = false;
      recordBtn?.classList.remove("listening");
      if (statusText) statusText.textContent = "Kayıt tamamlandı • Dinle veya sonraki cümleye geç";
      stopTracks();
      clearInterval(timerInt);

      renderProgress();
      renderCompletedList();
    };

    mediaRecorder.start(250);
  } catch (e) {
    console.warn("[voice startRecording]", e);
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
    console.warn("[voice stopRecording]", e);
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
  return `${userId}/voice-sample-${idx + 1}-${Date.now()}.${ext}`;
}

function parseOldPaths(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.filter(Boolean).map(String);
  }

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
    console.warn("[voice delete old samples]", e);
  }
}

async function loadCurrentProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, voice_sample_path")
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

async function finishVoiceProfile(uiLang) {
  const user = await getUserOrThrow();
  const profile = await loadCurrentProfile(user.id);

  const oldPaths = parseOldPaths(profile?.voice_sample_path);
  const uploaded = await uploadAllSamples(user);
  const previewUrl = uploaded[0]?.path ? await createFirstSignedUrl(uploaded[0].path) : "";
  const totalSec = uploaded.reduce((sum, x) => sum + Number(x.seconds || 0), 0);

  const payload = {
    voice_sample_url: previewUrl,
    voice_sample_path: JSON.stringify(uploaded.map(x => x.path)),
    voice_sample_mime: "multi",
    voice_sample_seconds: totalSec,
    voice_profile_ready: true,
    voice_profile_updated_at: new Date().toISOString(),
    voice_profile_lang: uiLang || "tr"
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
  if (statusText) statusText.textContent = "Mikrofona dokun ve konuşmaya başla";

  recordBtn?.addEventListener("click", async () => {
    if (saving) return;

    if (isRecording) {
      stopRecording();
      return;
    }
    await startRecording();
  });

  redoBtn?.addEventListener("click", () => {
    if (saving) return;
    if (isRecording) stopRecording();

    recordings[currentIndex] = { blob: null, seconds: 0, mime: "" };
    clearPreview();
    if (statusText) statusText.textContent = "Kayıt silindi • Mikrofona dokunarak yeniden başla";
    renderProgress();
    renderCompletedList();
    toast("Bu cümle sıfırlandı");
  });

  deletePreviewBtn?.addEventListener("click", () => {
    if (saving) return;
    if (isRecording) stopRecording();

    recordings[currentIndex] = { blob: null, seconds: 0, mime: "" };
    clearPreview();
    if (statusText) statusText.textContent = "Kayıt silindi • Mikrofona dokunarak yeniden başla";
    renderProgress();
    renderCompletedList();
    toast("Kayıt silindi");
  });

  playPreviewBtn?.addEventListener("click", () => {
    try{
      audioPreview?.play?.();
    }catch{}
  });

  nextBtn?.addEventListener("click", () => {
    if (saving) return;
    if (!currentBlob) {
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
    redoBtn.disabled = true;
    recordBtn.disabled = true;

    if (statusText) statusText.textContent = "Ses profili oluşturuluyor...";

    try {
      await finishVoiceProfile(lang);
      if (statusText) statusText.textContent = "Ses profili kaydedildi";
      toast("Ses profili kaydedildi");

      setTimeout(() => {
        location.href = "/pages/profile.html";
      }, 900);
    } catch (e) {
      console.warn("[voice finish]", e);
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
  revokePreviewUrl();
});

bootPage().catch((e) => {
  console.error("[voice_profile_page boot]", e);
  toast("Sayfa başlatılamadı");
});
