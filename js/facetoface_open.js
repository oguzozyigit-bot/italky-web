import { supabase } from "/js/supabase_client.js";

const VOICE_KEY = "facetoface_voice_mode";
const TRANSLATE_KEY = "facetoface_translate_mode";
const SETUP_KEY = "facetoface_setup_done";

const $ = (id) => document.getElementById(id);

const voiceGrid = $("voiceGrid");
const translateGrid = $("translateGrid");
const voiceSummary = $("voiceSummary");
const translateSummary = $("translateSummary");
const tokenSummary = $("tokenSummary");
const saveStartBtn = $("saveStartBtn");
const freeContinueBtn = $("freeContinueBtn");
const buyJetonBtn = $("buyJetonBtn");
const premiumWarnBox = $("premiumWarnBox");
const warnTitle = $("warnTitle");
const warnText = $("warnText");

const cloneDesc = $("cloneDesc");
const cloneMini = $("cloneMini");

const voiceModal = $("voiceModal");
const voiceModalTitle = $("voiceModalTitle");
const voiceModalClose = $("voiceModalClose");
const voiceEnrollStatus = $("voiceEnrollStatus");
const voicePreview = $("voicePreview");
const startVoiceRecBtn = $("startVoiceRecBtn");
const stopVoiceRecBtn = $("stopVoiceRecBtn");
const playVoiceBtn = $("playVoiceBtn");
const saveVoiceBtn = $("saveVoiceBtn");

let voiceMode = localStorage.getItem(VOICE_KEY) || "auto";
let translateMode = localStorage.getItem(TRANSLATE_KEY) || "normal";
let tokenBalance = 0;
let voiceProfileReady = false;
let reason = "";
let isBusy = false;

let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let recordedBlob = null;
let recordedObjectUrl = "";

function isPremiumVoice(v) {
  return ["female", "male", "clone"].includes(String(v || "").trim().toLowerCase());
}

function isPremiumTranslate(v) {
  return String(v || "").trim().toLowerCase() === "cultural";
}

function needsJeton(voice, translate) {
  return isPremiumVoice(voice) || isPremiumTranslate(translate);
}

function voiceLabel(v) {
  const map = {
    auto: "Otomatik",
    female: "Kadın Ses",
    male: "Erkek Ses",
    clone: "Kendi Sesim",
  };
  return map[String(v || "").trim().toLowerCase()] || "Otomatik";
}

function translateLabel(v) {
  const map = {
    normal: "Translate",
    cultural: "Kültürel Translate",
  };
  return map[String(v || "").trim().toLowerCase()] || "Translate";
}

function setBusy(btn, text) {
  if (!btn) return;
  btn.dataset.oldText = btn.textContent;
  btn.textContent = text;
  btn.style.opacity = "0.7";
  btn.style.pointerEvents = "none";
}

function clearBusy(btn) {
  if (!btn) return;
  btn.textContent = btn.dataset.oldText || btn.textContent;
  btn.style.opacity = "1";
  btn.style.pointerEvents = "auto";
}

function setEnrollStatus(text, mode = "") {
  if (!voiceEnrollStatus) return;
  voiceEnrollStatus.className = "voice-status";
  if (mode) voiceEnrollStatus.classList.add(mode);
  voiceEnrollStatus.textContent = text;
}

async function getCurrentUid() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || localStorage.getItem("user_id") || null;
  } catch {
    return localStorage.getItem("user_id") || null;
  }
}

async function loadProfileInfo() {
  try {
    const uid = await getCurrentUid();
    if (!uid) {
      tokenBalance = 0;
      voiceProfileReady = false;
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("tokens,tts_voice_ready,tts_voice_id")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      tokenBalance = 0;
      voiceProfileReady = false;
      return;
    }

    tokenBalance = Number(data?.tokens || 0);
    voiceProfileReady = !!data?.tts_voice_ready && !!String(data?.tts_voice_id || "").trim();
  } catch {
    tokenBalance = 0;
    voiceProfileReady = false;
  }
}

function paintSelections() {
  voiceGrid?.querySelectorAll(".choice").forEach((el) => {
    el.classList.toggle("active", el.dataset.voice === voiceMode);
  });

  translateGrid?.querySelectorAll(".choice").forEach((el) => {
    el.classList.toggle("active", el.dataset.translate === translateMode);
  });
}

function refreshCloneCard() {
  if (!cloneDesc || !cloneMini) return;

  if (voiceProfileReady) {
    cloneDesc.textContent = "Kayıtlı özel sesin hazır. İstersen değiştirerek yeniden kaydedebilirsin.";
    cloneMini.textContent = "Kayıtlı sesi değiştir";
  } else {
    cloneDesc.textContent = "Henüz kayıtlı özel sesin yok. Oluşturmak için dokun.";
    cloneMini.textContent = "Özel sesi oluştur";
  }
}

function refreshSummary() {
  if (voiceSummary) voiceSummary.textContent = voiceLabel(voiceMode);
  if (translateSummary) translateSummary.textContent = translateLabel(translateMode);

  if (tokenSummary) {
    tokenSummary.textContent = tokenBalance > 0
      ? `${tokenBalance} jeton mevcut`
      : "Jeton bulunmuyor";
  }
}

function refreshPremiumWarning() {
  const premiumSelected = needsJeton(voiceMode, translateMode);
  const noJeton = tokenBalance <= 0;

  if (!premiumWarnBox) return;

  if (reason === "insufficient") {
    premiumWarnBox.classList.add("show");
    if (warnTitle) warnTitle.textContent = "Kayıtlı tercihleriniz jeton gerektiriyor";
    if (warnText) {
      warnText.textContent =
        "Jetonunuz bittiği için kayıtlı tercihleriniz kullanılamamaktadır.";
    }
    buyJetonBtn?.classList.add("show");
    return;
  }

  if (premiumSelected && noJeton) {
    premiumWarnBox.classList.add("show");
    if (warnTitle) warnTitle.textContent = "Bu ayarları kullanabilmek için jeton satın almanız gereklidir";
    if (warnText) {
      warnText.textContent =
        "Seçtiğiniz ses veya çeviri ayarı jeton gerektiriyor. Jeton satın alabilir ya da ücretsiz ayarla devam edebilirsiniz.";
    }
    buyJetonBtn?.classList.add("show");
    return;
  }

  premiumWarnBox.classList.remove("show");
  buyJetonBtn?.classList.remove("show");
}

function saveSettings() {
  localStorage.setItem(VOICE_KEY, voiceMode);
  localStorage.setItem(TRANSLATE_KEY, translateMode);
  localStorage.setItem(SETUP_KEY, "1");
}

function forceFreeSettings() {
  voiceMode = "auto";
  translateMode = "normal";
  saveSettings();
  paintSelections();
  refreshSummary();
  refreshPremiumWarning();
}

function goFaceToFace() {
  location.href = "/facetoface.html";
}

function goJetonMarket() {
  location.href = "/pages/jetonbuy.html";
}

function openVoiceModal() {
  if (voiceModalTitle) {
    voiceModalTitle.textContent = voiceProfileReady ? "Kayıtlı Sesi Değiştir" : "Kayıtlı Ses Oluştur";
  }
  setEnrollStatus("Hazır. İstersen kayda başlayabilirsin.");
  voiceModal?.classList.add("show");
}

function closeVoiceModal() {
  voiceModal?.classList.remove("show");
}

function cleanupPreviewUrl() {
  if (recordedObjectUrl) {
    URL.revokeObjectURL(recordedObjectUrl);
    recordedObjectUrl = "";
  }
}

function resetRecorderState() {
  recordedChunks = [];
  recordedBlob = null;
  cleanupPreviewUrl();
  if (voicePreview) {
    voicePreview.pause();
    voicePreview.removeAttribute("src");
    voicePreview.classList.remove("show");
  }
}

async function startVoiceRecording() {
  try {
    resetRecorderState();

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(mediaStream);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      cleanupPreviewUrl();
      recordedObjectUrl = URL.createObjectURL(recordedBlob);

      if (voicePreview) {
        voicePreview.src = recordedObjectUrl;
        voicePreview.classList.add("show");
      }

      setEnrollStatus("Kayıt alındı. İstersen dinle veya kaydet.", "good");

      mediaStream?.getTracks?.().forEach((t) => t.stop());
      mediaStream = null;
    };

    mediaRecorder.start();
    setEnrollStatus("Kayıt başladı. Metni doğal şekilde oku.", "warn");
  } catch (e) {
    console.error("voice record start error", e);
    setEnrollStatus("Mikrofon izni gerekli veya kayıt başlatılamadı.", "bad");
  }
}

function stopVoiceRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  } catch (e) {
    console.error("voice record stop error", e);
    setEnrollStatus("Kayıt durdurulamadı.", "bad");
  }
}

function playRecordedVoice() {
  if (!voicePreview || !recordedBlob) {
    setEnrollStatus("Önce bir kayıt oluştur.", "bad");
    return;
  }

  try {
    voicePreview.currentTime = 0;
    voicePreview.play();
    setEnrollStatus("Kayıt dinleniyor...", "warn");
  } catch (e) {
    console.error("preview play error", e);
  }
}

async function saveRecordedVoice() {
  if (!recordedBlob) {
    setEnrollStatus("Kaydedilecek ses bulunamadı. Önce kayıt al.", "bad");
    return;
  }

  const uid = await getCurrentUid();
  if (!uid) {
    setEnrollStatus("Kullanıcı bilgisi bulunamadı.", "bad");
    return;
  }

  setBusy(saveVoiceBtn, "Kaydediliyor...");
  setEnrollStatus("Özel sesin hazırlanıyor...", "warn");

  try {
    const fileExt = "webm";
    const filePath = `${uid}/voice_${Date.now()}.${fileExt}`;
    const file = new File([recordedBlob], `voice.${fileExt}`, { type: recordedBlob.type || "audio/webm" });

    const upload = await supabase.storage
      .from("voice-samples")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (upload.error) throw upload.error;

    const pub = supabase.storage.from("voice-samples").getPublicUrl(filePath);
    const publicUrl = pub?.data?.publicUrl || null;

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        voice_sample_path: filePath,
        voice_sample_url: publicUrl,
        voice_sample_mime: file.type,
        voice_profile_ready: true,
        voice_profile_updated_at: new Date().toISOString(),
        tts_voice_ready: true,
        tts_voice_updated_at: new Date().toISOString(),
        tts_voice_id: `clone_${uid}`,
        tts_voice_provider: "custom",
        tts_voice_mode: "clone",
        tts_voice: "clone"
      })
      .eq("id", uid);

    if (profileErr) throw profileErr;

    voiceProfileReady = true;
    voiceMode = "clone";

    refreshCloneCard();
    paintSelections();
    refreshSummary();
    refreshPremiumWarning();

    setEnrollStatus("Özel sesin kaydedildi. Artık Kendi Sesim kullanılabilir.", "good");

    setTimeout(() => {
      closeVoiceModal();
    }, 700);
  } catch (e) {
    console.error("voice save error", e);
    setEnrollStatus("Özel ses kaydedilemedi.", "bad");
  } finally {
    clearBusy(saveVoiceBtn);
  }
}

async function handleCloneSelection() {
  voiceMode = "clone";
  paintSelections();
  refreshSummary();
  refreshPremiumWarning();

  if (!voiceProfileReady) {
    openVoiceModal();
  }
}

async function handleSaveAndStart() {
  if (isBusy) return;
  isBusy = true;
  setBusy(saveStartBtn, "Kontrol ediliyor...");

  try {
    await loadProfileInfo();
    refreshCloneCard();

    if (voiceMode === "clone" && !voiceProfileReady) {
      openVoiceModal();
      return;
    }

    const premiumSelected = needsJeton(voiceMode, translateMode);

    if (premiumSelected && tokenBalance <= 0) {
      reason = "";
      refreshSummary();
      refreshPremiumWarning();
      return;
    }

    saveSettings();
    goFaceToFace();
  } finally {
    isBusy = false;
    clearBusy(saveStartBtn);
  }
}

function bindVoiceChoices() {
  voiceGrid?.querySelectorAll(".choice").forEach((el) => {
    el.addEventListener("click", async () => {
      const selected = String(el.dataset.voice || "auto").trim().toLowerCase();
      if (selected === "clone") {
        await handleCloneSelection();
        return;
      }

      voiceMode = selected;
      paintSelections();
      refreshSummary();
      refreshPremiumWarning();
    });
  });
}

function bindTranslateChoices() {
  translateGrid?.querySelectorAll(".choice").forEach((el) => {
    el.addEventListener("click", () => {
      translateMode = String(el.dataset.translate || "normal").trim().toLowerCase();
      paintSelections();
      refreshSummary();
      refreshPremiumWarning();
    });
  });
}

function bindVoiceModal() {
  voiceModalClose?.addEventListener("click", closeVoiceModal);

  voiceModal?.addEventListener("click", (e) => {
    if (e.target === voiceModal) closeVoiceModal();
  });

  startVoiceRecBtn?.addEventListener("click", startVoiceRecording);
  stopVoiceRecBtn?.addEventListener("click", stopVoiceRecording);
  playVoiceBtn?.addEventListener("click", playRecordedVoice);
  saveVoiceBtn?.addEventListener("click", saveRecordedVoice);
}

async function init() {
  const url = new URL(location.href);
  reason = String(url.searchParams.get("reason") || "").trim().toLowerCase();

  bindVoiceChoices();
  bindTranslateChoices();
  bindVoiceModal();

  saveStartBtn?.addEventListener("click", handleSaveAndStart);

  freeContinueBtn?.addEventListener("click", () => {
    forceFreeSettings();
    goFaceToFace();
  });

  buyJetonBtn?.addEventListener("click", goJetonMarket);

  await loadProfileInfo();
  refreshCloneCard();
  paintSelections();
  refreshSummary();
  refreshPremiumWarning();
}

init();
