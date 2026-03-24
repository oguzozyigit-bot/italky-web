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

let voiceMode = localStorage.getItem(VOICE_KEY) || "auto";
let translateMode = localStorage.getItem(TRANSLATE_KEY) || "normal";
let tokenBalance = 0;
let voiceProfileReady = false;
let reason = "";
let isBusy = false;

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
        "Jetonunuz bittiği için kayıtlı ses ve çeviri tercihleriniz şu anda kullanılamamaktadır.";
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

async function handleCloneNeed() {
  if (voiceMode !== "clone") return false;
  if (voiceProfileReady) return false;

  const goCreate = confirm(
    "Kendi sesin henüz oluşturulmamış. Bu özellik için önce ses profili oluşturman gerekiyor.\n\nTamam: Ses oluşturma sayfasına git\nİptal: Şimdilik kal"
  );

  if (goCreate) {
    location.href = "/pages/voice_clone.html?next=/pages/facetoface_open.html";
    return true;
  }

  return true;
}

async function handleSaveAndStart() {
  if (isBusy) return;
  isBusy = true;
  setBusy(saveStartBtn, "Kontrol ediliyor...");

  try {
    await loadProfileInfo();

    const cloneBlocked = await handleCloneNeed();
    if (cloneBlocked) return;

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
    el.addEventListener("click", () => {
      voiceMode = String(el.dataset.voice || "auto").trim().toLowerCase();
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

async function init() {
  const url = new URL(location.href);
  reason = String(url.searchParams.get("reason") || "").trim().toLowerCase();

  bindVoiceChoices();
  bindTranslateChoices();

  saveStartBtn?.addEventListener("click", handleSaveAndStart);

  freeContinueBtn?.addEventListener("click", () => {
    forceFreeSettings();
    goFaceToFace();
  });

  buyJetonBtn?.addEventListener("click", goJetonMarket);

  await loadProfileInfo();
  paintSelections();
  refreshSummary();
  refreshPremiumWarning();
}

init();
