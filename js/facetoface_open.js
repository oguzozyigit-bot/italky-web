// FILE: /js/facetoface_open.js

import {
  VOICE_SAMPLE_TEXTS,
  SAMPLE_COUNT,
  getUserPreferredLang,
  createEmptyRecordings,
  finishVoiceProfile,
  enrollTTSVoice,
  markCloneAsSelected,
  VoiceProfileRecorder
} from "/js/voice_profile_core.js";
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
const voiceSampleText = $("voiceSampleText");

let voiceMode = localStorage.getItem(VOICE_KEY) || "auto";
let translateMode = localStorage.getItem(TRANSLATE_KEY) || "normal";
let tokenBalance = 0;
let voiceProfileReady = false;
let reason = "";
let isBusy = false;

/* -------------------------------------------------------------------------- */
/*  INLINE VOICE PROFILE STATE                                                */
/* -------------------------------------------------------------------------- */

let vpRecorder = new VoiceProfileRecorder();
let vpRecordings = createEmptyRecordings();
let vpIndex = 0;
let vpLang = "tr";
let vpSamples = [];
let vpPreviewUrl = "";
let vpSaving = false;

function cleanupVpPreviewUrl() {
  if (vpPreviewUrl) {
    try {
      URL.revokeObjectURL(vpPreviewUrl);
    } catch {}
    vpPreviewUrl = "";
  }
}

function resetVpPreviewPlayer() {
  cleanupVpPreviewUrl();
  if (voicePreview) {
    try {
      voicePreview.pause();
    } catch {}
    voicePreview.removeAttribute("src");
    voicePreview.classList.remove("show");
  }
}

function setEnrollStatus(text, mode = "") {
  if (!voiceEnrollStatus) return;
  voiceEnrollStatus.className = "voice-status";
  if (mode) voiceEnrollStatus.classList.add(mode);
  voiceEnrollStatus.textContent = text || "";
}

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

/* -------------------------------------------------------------------------- */
/*  INLINE VOICE PROFILE FLOW                                                 */
/* -------------------------------------------------------------------------- */

function updateVoiceModalPrimaryButton() {
  if (!saveVoiceBtn) return;

  const recordedCurrent = !!vpRecordings[vpIndex]?.blob;
  const isLast = vpIndex === SAMPLE_COUNT - 1;

  if (isLast) {
    saveVoiceBtn.textContent = "Kaydı Kaydet";
    saveVoiceBtn.disabled = !recordedCurrent || vpSaving;
    return;
  }

  saveVoiceBtn.textContent = "Sonraki Cümle";
  saveVoiceBtn.disabled = !recordedCurrent || vpSaving;
}

function updateVoiceUI() {
  const txt = vpSamples[vpIndex] || "";
  if (voiceSampleText) voiceSampleText.textContent = txt;

  if (voiceModalTitle) {
    voiceModalTitle.textContent = voiceProfileReady
      ? "Kayıtlı Sesi Değiştir"
      : "Kayıtlı Ses Oluştur";
  }

  const recordedCurrent = !!vpRecordings[vpIndex]?.blob;

  if (recordedCurrent) {
    setEnrollStatus(`Cümle ${vpIndex + 1} / ${SAMPLE_COUNT} tamamlandı. ${vpIndex === SAMPLE_COUNT - 1 ? "Kaydı Kaydet'e bas." : "Sonraki cümleye geçebilirsin."}`, "good");
  } else {
    setEnrollStatus(`Cümle ${vpIndex + 1} / ${SAMPLE_COUNT} • Hazır. Kayda başlayabilirsin.`);
  }

  resetVpPreviewPlayer();

  if (recordedCurrent) {
    try {
      vpPreviewUrl = URL.createObjectURL(vpRecordings[vpIndex].blob);
      if (voicePreview) {
        voicePreview.src = vpPreviewUrl;
        voicePreview.classList.add("show");
      }
    } catch {}
  }

  updateVoiceModalPrimaryButton();
}

async function initVoiceModal() {
  try {
    const { data } = await supabase.auth.getUser();
    vpLang = getUserPreferredLang(data?.user);
  } catch {
    vpLang = "tr";
  }

  vpSamples = VOICE_SAMPLE_TEXTS[vpLang] || VOICE_SAMPLE_TEXTS.tr;
  vpIndex = 0;
  vpRecordings = createEmptyRecordings();
  vpSaving = false;

  resetVpPreviewPlayer();
  try {
    vpRecorder.destroy();
  } catch {}
  vpRecorder = new VoiceProfileRecorder();

  updateVoiceUI();
}

async function openVoiceModal() {
  await initVoiceModal();
  voiceModal?.classList.add("show");
}

function closeVoiceModal() {
  voiceModal?.classList.remove("show");
  resetVpPreviewPlayer();
  try {
    vpRecorder.destroy();
  } catch {}
}

async function startVoiceRecording() {
  try {
    resetVpPreviewPlayer();
    await vpRecorder.start();
    setEnrollStatus(`Cümle ${vpIndex + 1} / ${SAMPLE_COUNT} • Kayıt başladı...`, "warn");
    updateVoiceModalPrimaryButton();
  } catch (e) {
    console.error("voice record start error", e);
    setEnrollStatus("Mikrofon izni gerekli veya kayıt başlatılamadı.", "bad");
  }
}

async function stopVoiceRecording() {
  try {
    const result = await vpRecorder.stop();

    vpRecordings[vpIndex] = {
      blob: result.blob,
      seconds: result.seconds,
      mime: result.mime,
    };

    updateVoiceUI();
  } catch (e) {
    console.error("voice record stop error", e);
    setEnrollStatus("Kayıt durdurulamadı.", "bad");
  }
}

function playRecordedVoice() {
  const rec = vpRecordings[vpIndex];
  if (!rec?.blob) {
    setEnrollStatus("Önce bu cümleyi kaydet.", "bad");
    return;
  }

  try {
    resetVpPreviewPlayer();
    vpPreviewUrl = URL.createObjectURL(rec.blob);
    if (voicePreview) {
      voicePreview.src = vpPreviewUrl;
      voicePreview.classList.add("show");
      voicePreview.currentTime = 0;
      voicePreview.play();
    }
    setEnrollStatus("Kayıt dinleniyor...", "warn");
  } catch (e) {
    console.error("preview play error", e);
    setEnrollStatus("Kayıt dinletilemedi.", "bad");
  }
}

async function nextVoiceSample() {
  if (!vpRecordings[vpIndex]?.blob) {
    setEnrollStatus("Önce bu cümleyi kaydet.", "bad");
    return;
  }

  if (vpIndex < SAMPLE_COUNT - 1) {
    vpIndex += 1;
    updateVoiceUI();
  }
}

async function saveVoiceProfileFull() {
  const doneCount = vpRecordings.filter((x) => !!x.blob).length;
  if (doneCount !== SAMPLE_COUNT) {
    setEnrollStatus("Tüm cümleleri tamamla.", "bad");
    return;
  }

  vpSaving = true;
  setBusy(saveVoiceBtn, "Kaydediliyor...");
  setEnrollStatus("Ses profili kaydediliyor...", "warn");

  try {
    await finishVoiceProfile(vpLang, vpRecordings);

    setEnrollStatus("AI sesi hazırlanıyor...", "warn");
    const enrollResp = await enrollTTSVoice();

    await markCloneAsSelected(enrollResp);

    voiceProfileReady = true;
    voiceMode = "clone";

    await loadProfileInfo();
    refreshCloneCard();
    paintSelections();
    refreshSummary();
    refreshPremiumWarning();

    setEnrollStatus("Özel ses hazır. Artık Kendi Sesim kullanılabilir.", "good");

    setTimeout(() => {
      closeVoiceModal();
    }, 800);
  } catch (e) {
    console.error("voice full save error", e);
    setEnrollStatus(e?.message || "Özel ses kaydedilemedi.", "bad");
  } finally {
    vpSaving = false;
    clearBusy(saveVoiceBtn);
    updateVoiceModalPrimaryButton();
  }
}

/* -------------------------------------------------------------------------- */
/*  SETTINGS FLOW                                                             */
/* -------------------------------------------------------------------------- */

async function handleCloneSelection(forceOpenModal = false) {
  voiceMode = "clone";
  paintSelections();
  refreshSummary();
  refreshPremiumWarning();

  if (!voiceProfileReady || forceOpenModal) {
    await openVoiceModal();
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
      await openVoiceModal();
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
    el.addEventListener("click", async (e) => {
      const selected = String(el.dataset.voice || "auto").trim().toLowerCase();

      if (selected === "clone") {
        const clickedMini = e.target?.closest?.("#cloneMini");
        await handleCloneSelection(!!clickedMini || voiceProfileReady);
        return;
      }

      voiceMode = selected;
      paintSelections();
      refreshSummary();
      refreshPremiumWarning();
    });
  });

  cloneMini?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleCloneSelection(true);
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

  startVoiceRecBtn?.addEventListener("click", async () => {
    if (vpSaving) return;
    await startVoiceRecording();
  });

  stopVoiceRecBtn?.addEventListener("click", async () => {
    if (vpSaving) return;
    await stopVoiceRecording();
  });

  playVoiceBtn?.addEventListener("click", () => {
    if (vpSaving) return;
    playRecordedVoice();
  });

  saveVoiceBtn?.addEventListener("click", async () => {
    if (vpSaving) return;

    if (vpIndex < SAMPLE_COUNT - 1) {
      await nextVoiceSample();
      return;
    }

    await saveVoiceProfileFull();
  });
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

window.addEventListener("beforeunload", () => {
  try {
    vpRecorder.destroy();
  } catch {}
  resetVpPreviewPlayer();
});

init();
