import {
  VOICE_SAMPLE_TEXTS,
  SAMPLE_COUNT,
  getUserPreferredLang,
  createEmptyRecordings,
  finishVoiceProfile,
  enrollTTSVoice,
  markCloneAsSelected,
  VoiceProfileRecorder,
  fmtSec
} from "/js/voice_profile_core.js";
import { supabase } from "/js/supabase_client.js";

const VOICE_KEY = "facetoface_voice_mode";
const VOICE_PRESET_KEY = "facetoface_voice_preset";
const TRANSLATE_KEY = "facetoface_translate_mode";
const SETUP_KEY = "facetoface_setup_done";

const $ = (id) => document.getElementById(id);

const voiceGrid = $("voiceGrid");
const translateGrid = $("translateGrid");
const voiceSummary = $("voiceSummary");
const translateSummary = $("translateSummary");
const tokenSummary = $("tokenSummary");
const saveStartBtn = $("saveStartBtn");
const buyJetonBtn = $("buyJetonBtn");
const premiumWarnBox = $("premiumWarnBox");
const warnTitle = $("warnTitle");
const warnText = $("warnText");

const cloneDesc = $("cloneDesc");
const cloneMini = $("cloneMini");

const voiceModal = $("voiceModal");
const voiceModalTitle = $("voiceModalTitle");
const voiceModalClose = $("voiceModalClose");
const replaceVoiceNote = $("replaceVoiceNote");

const voiceSampleLabel = $("voiceSampleLabel");
const voiceSampleText = $("voiceSampleText");
const voiceEnrollStatus = $("voiceEnrollStatus");
const voiceMicWrapper = $("voiceMicWrapper");
const voiceRecordBtn = $("voiceRecordBtn");
const voiceNextBtn = $("voiceNextBtn");
const voiceFinishBtn = $("voiceFinishBtn");
const voiceCancelBtn = $("voiceCancelBtn");
const voiceProgressCount = $("voiceProgressCount");
const voiceProgressFill = $("voiceProgressFill");
const voiceCompletedList = $("voiceCompletedList");
const voiceTimerText = $("voiceTimerText");
const voiceToast = $("voiceToast");

const url = new URL(location.href);
const fromPage = String(url.searchParams.get("from") || "").trim().toLowerCase();
const editMode = String(url.searchParams.get("edit") || "").trim() === "1";

const PRESET_VOICES = [
  { id: "huma", name: "Hüma", tag: "Kadın", text: "Merhaba, ben Hüma. Ben neşeliyim. Haydi italkyAI sayesinde dil engellerini birlikte kaldıralım." },
  { id: "umay", name: "Umay", tag: "Kadın", text: "Merhaba, ben Umay. Sakin, net ve güven veren bir sesle seninleyim." },
  { id: "jale", name: "Jale", tag: "Kadın", text: "Merhaba, ben Jale. italkyAI ile çevirileri daha sıcak ve doğal hale getiriyorum." },
  { id: "mina", name: "Mina", tag: "Kadın", text: "Merhaba, ben Mina. Hızlı, enerjik ve akıcı bir şekilde konuşabilirim." },
  { id: "beren", name: "Beren", tag: "Kadın", text: "Merhaba, ben Beren. Daha yumuşak ve doğal bir tonla sana eşlik ediyorum." },
  { id: "ozan", name: "Ozan", tag: "Erkek", text: "Merhaba, ben Ozan. Güçlü ve net bir ses tonuyla italkyAI deneyimine eşlik ediyorum." },
  { id: "kaan", name: "Kaan", tag: "Erkek", text: "Merhaba, ben Kaan. Doğal, akıcı ve dengeli bir ses istiyorsan buradayım." }
];

let voiceMode = normalizeVoiceMode(localStorage.getItem(VOICE_KEY) || "auto");
let selectedPreset = String(localStorage.getItem(VOICE_PRESET_KEY) || "huma").trim().toLowerCase();
let translateMode = normalizeTranslateMode(localStorage.getItem(TRANSLATE_KEY) || "normal");

let tokenBalance = 0;
let voiceProfileReady = false;
let reason = "";
let isBusy = false;
let profileRow = null;

let accessState = {
  trialActive: false,
  packageCode: "",
  lockedAll: false
};

let vpRecorder = null;
let vpRecordings = createEmptyRecordings();
let vpIndex = 0;
let vpLang = "tr";
let vpSamples = [];
let vpSaving = false;
let vpTimerInt = null;

function normalizeVoiceMode(v) {
  const x = String(v || "").trim().toLowerCase();
  if (x === "clone") return "clone";
  if (x === "preset") return "preset";
  return "auto";
}

function normalizeTranslateMode(v) {
  return String(v || "").trim().toLowerCase() === "cultural" ? "cultural" : "normal";
}

function normalizePackageCode(raw) {
  const code = String(raw || "").trim().toLowerCase();
  if (!code) return "";
  if (code.startsWith("premium")) return "premium";
  if (code.startsWith("translate")) return "translate";
  if (code.startsWith("education")) return "education";
  if (code.startsWith("edu")) return "education";
  return code;
}

function toast(msg) {
  if (!voiceToast) return;
  voiceToast.textContent = String(msg || "");
  voiceToast.classList.add("show");
  clearTimeout(window.__f2fVoiceToast);
  window.__f2fVoiceToast = setTimeout(() => {
    voiceToast.classList.remove("show");
  }, 1700);
}

function showUiModal(message, title = "Üyelik Gerekli") {
  const modal = document.getElementById("uiModal");
  const titleEl = document.getElementById("uiModalTitle");
  const textEl = document.getElementById("uiModalText");
  const goBtn = document.getElementById("uiModalGo");
  const closeBtn = document.getElementById("uiModalClose");

  if (!modal || !titleEl || !textEl) {
    alert(message);
    return;
  }

  titleEl.textContent = title;
  textEl.textContent = message;
  modal.classList.add("open");

  const goHandler = () => {
    modal.classList.remove("open");
    location.href = "/pages/upgrade_pack.html";
  };

  const closeHandler = () => {
    modal.classList.remove("open");
    cleanup();
  };

  const backdropHandler = (e) => {
    if (e.target === modal) {
      modal.classList.remove("open");
      cleanup();
    }
  };

  function cleanup() {
    goBtn?.removeEventListener("click", goHandler);
    closeBtn?.removeEventListener("click", closeHandler);
    modal.removeEventListener("click", backdropHandler);
  }

  goBtn?.addEventListener("click", goHandler);
  closeBtn?.addEventListener("click", closeHandler);
  modal.addEventListener("click", backdropHandler);
}

function voiceLabel(v) {
  if (normalizeVoiceMode(v) === "clone") return "Kendi Sesim";
  if (normalizeVoiceMode(v) === "preset") {
    const found = PRESET_VOICES.find(x => x.id === selectedPreset);
    return found ? `Özel Ses • ${found.name}` : "Özel Sesler";
  }
  return "Otomatik";
}

function translateLabel(v) {
  return normalizeTranslateMode(v) === "cultural" ? "Kültürel Translate" : "Translate";
}

function pickPositiveNumber(...vals) {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function hasMeaningfulString(v) {
  const s = String(v ?? "").trim();
  return !!s && s !== "null" && s !== "[]" && s !== "{}";
}

function detectVoiceProfileReady(profile) {
  if (!profile) return false;

  const flags = [
    profile?.tts_voice_ready,
    profile?.voice_profile_ready,
    profile?.voice_ready,
    profile?.clone_voice_ready
  ].some(Boolean);

  const ids = [
    profile?.tts_voice_id,
    profile?.voice_id,
    profile?.clone_voice_id
  ].some(hasMeaningfulString);

  const sampleData = [
    profile?.voice_sample_path,
    profile?.voice_sample_url,
    profile?.voice_sample_urls
  ].some(hasMeaningfulString);

  const prefs = [
    profile?.tts_voice,
    profile?.tts_voice_preference
  ].some((v) => String(v || "").trim().toLowerCase() === "clone");

  return flags || ids || sampleData || prefs;
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
      profileRow = null;
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      tokenBalance = 0;
      voiceProfileReady = false;
      profileRow = null;
      return;
    }

    profileRow = data || null;

    tokenBalance = pickPositiveNumber(
      data?.jeton_balance,
      data?.tokens,
      data?.jeton,
      data?.balance,
      data?.credits
    );

    voiceProfileReady = detectVoiceProfileReady(data);
  } catch {
    tokenBalance = 0;
    voiceProfileReady = false;
    profileRow = null;
  }
}

async function readAccessState() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      accessState = { trialActive: false, packageCode: "", lockedAll: false };
      return;
    }

    const { data: row } = await supabase
      .from("user_access_state")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (row) {
      const rawCode = String(row.selected_package_code || "").trim().toLowerCase();
      const packageCode = normalizePackageCode(rawCode);
      const packageActive = !!packageCode && row.package_active === true &&
        (!row.package_ends_at || new Date(row.package_ends_at).getTime() > Date.now());

      const trialActive = !packageActive && (
        Number(row.trial_days_left || 0) > 0 ||
        (!!row.trial_ends_at && new Date(row.trial_ends_at).getTime() > Date.now())
      );

      accessState = {
        trialActive,
        packageCode: packageActive ? packageCode : "",
        lockedAll: !packageActive && !trialActive
      };
      return;
    }

    accessState = { trialActive: false, packageCode: "", lockedAll: false };
  } catch {
    accessState = { trialActive: false, packageCode: "", lockedAll: false };
  }
}

function canUsePresetVoice() {
  const pkg = normalizePackageCode(accessState.packageCode);
  return pkg === "premium" || pkg === "translate";
}

function canUseCloneVoice() {
  const pkg = normalizePackageCode(accessState.packageCode);
  return pkg === "premium";
}

function canUseCulturalTranslate() {
  const pkg = normalizePackageCode(accessState.packageCode);
  return pkg === "premium" || pkg === "translate";
}

function paintSelections() {
  voiceGrid?.querySelectorAll(".choice").forEach((el) => {
    el.classList.toggle("active", normalizeVoiceMode(el.dataset.voice) === voiceMode);
  });

  translateGrid?.querySelectorAll(".choice").forEach((el) => {
    el.classList.toggle("active", normalizeTranslateMode(el.dataset.translate) === translateMode);
  });
}

function refreshCloneCard() {
  if (!cloneDesc || !cloneMini) return;

  if (voiceProfileReady) {
    cloneDesc.textContent = "Kayıtlı özel sesin hazır. Bu kartı seçerek doğrudan kullanabilirsin.";
    cloneMini.textContent = "Kendi sesimi dinle / değiştir";
    replaceVoiceNote?.classList.add("show");
    if (voiceModalTitle) voiceModalTitle.textContent = "Kayıtlı Sesi Değiştir";
  } else {
    cloneDesc.textContent = "Henüz kayıtlı özel sesin yok. Oluşturmak için dokun.";
    cloneMini.textContent = "Kendi sesini oluştur";
    replaceVoiceNote?.classList.remove("show");
    if (voiceModalTitle) voiceModalTitle.textContent = "Kayıtlı Ses Oluştur";
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
  const premiumSelected = normalizeVoiceMode(voiceMode) === "clone" || normalizeTranslateMode(translateMode) === "cultural";
  const noJeton = tokenBalance <= 0;

  if (!premiumWarnBox) return;

  if (reason === "insufficient") {
    premiumWarnBox.classList.add("show");
    if (warnTitle) warnTitle.textContent = "Kayıtlı tercihleriniz jeton gerektiriyor";
    if (warnText) warnText.textContent = "Jetonunuz bittiği için kayıtlı tercihleriniz şu anda kullanılamıyor.";
    buyJetonBtn?.classList.add("show");
    return;
  }

  if (premiumSelected && noJeton) {
    premiumWarnBox.classList.add("show");
    if (warnTitle) warnTitle.textContent = "Bu ayarlar jeton gerektiriyor";
    if (warnText) warnText.textContent = "Jeton yoksa konuşma yarım kalmaz; sistem otomatik olarak ücretsiz moda geçer.";
    buyJetonBtn?.classList.add("show");
    return;
  }

  premiumWarnBox.classList.remove("show");
  buyJetonBtn?.classList.remove("show");
}

function saveSettings() {
  localStorage.setItem(VOICE_KEY, voiceMode);
  localStorage.setItem(VOICE_PRESET_KEY, selectedPreset);
  localStorage.setItem(TRANSLATE_KEY, translateMode);
  localStorage.setItem(SETUP_KEY, "1");
  localStorage.setItem("tts_voice", voiceMode);
  localStorage.setItem("live_interpreter_voice", voiceMode);
}

function getLiveSideToSideParams() {
  const current = new URLSearchParams(window.location.search);

  const room =
    String(current.get("room") || localStorage.getItem("italky_active_interpreter_room_id") || "").trim();

  const role =
    String(current.get("role") || localStorage.getItem("italky_active_interpreter_role") || "host").trim().toLowerCase();

  const my =
    String(current.get("my") || localStorage.getItem("live_interpreter_lang") || "tr").trim().toLowerCase();

  const peer =
    String(current.get("peer") || localStorage.getItem("live_interpreter_peer_lang") || "").trim().toLowerCase();

  const auto =
    String(current.get("auto") || "1").trim() === "1" ? "1" : "0";

  return { room, role, my, peer, auto };
}

function buildStartHref() {
  if (fromPage === "sidetoside") {
    const { room, role, my, peer, auto } = getLiveSideToSideParams();

    const qs = new URLSearchParams();
    if (room) qs.set("room", room);
    if (role) qs.set("role", role);
    if (my) qs.set("my", my);
    if (peer) qs.set("peer", peer);
    qs.set("auto", auto || "1");

    return `/pages/sidetoside.html${qs.toString() ? `?${qs.toString()}` : ""}`;
  }

  return "/facetoface.html";
}

function goStartPage() {
  location.href = buildStartHref();
}

function goJetonMarket() {
  location.href = "/pages/jetonbuy.html";
}

function destroyRecorder() {
  try {
    vpRecorder?.destroy?.();
  } catch {}
  vpRecorder = new VoiceProfileRecorder();
}

function setBusy(btn, text) {
  if (!btn) return;
  btn.dataset.oldText = btn.textContent;
  btn.textContent = text;
  btn.disabled = true;
}

function clearBusy(btn) {
  if (!btn) return;
  btn.textContent = btn.dataset.oldText || btn.textContent;
  btn.disabled = false;
}

function setEnrollStatus(text, mode = "") {
  if (!voiceEnrollStatus) return;
  voiceEnrollStatus.style.color = "";
  if (mode === "good") voiceEnrollStatus.style.color = "#86efac";
  if (mode === "warn") voiceEnrollStatus.style.color = "#fde68a";
  if (mode === "bad") voiceEnrollStatus.style.color = "#fca5a5";
  voiceEnrollStatus.textContent = text || "";
}

function setMicListening(on) {
  if (!voiceRecordBtn || !voiceMicWrapper) return;
  if (on) {
    voiceRecordBtn.classList.add("listening");
    voiceMicWrapper.classList.add("listening");
  } else {
    voiceRecordBtn.classList.remove("listening");
    voiceMicWrapper.classList.remove("listening");
  }
}

function resetVpTimer() {
  clearInterval(vpTimerInt);
  vpTimerInt = null;
  if (voiceTimerText) voiceTimerText.textContent = "00:00";
}

function startVpTimer() {
  resetVpTimer();
  vpTimerInt = setInterval(() => {
    if (!vpRecorder?.startedAt) return;
    const sec = Math.max(1, Math.floor((Date.now() - vpRecorder.startedAt) / 1000));
    if (voiceTimerText) voiceTimerText.textContent = fmtSec(sec);
  }, 200);
}

function renderCompletedList() {
  if (!voiceCompletedList) return;

  const items = vpRecordings
    .map((r, idx) => ({ ...r, idx }))
    .filter((r) => !!r.blob);

  voiceCompletedList.innerHTML = items.length
    ? items.map((item) => `
        <div class="completed-item">
          <div>Cümle ${item.idx + 1} tamamlandı</div>
          <div>${fmtSec(item.seconds)}</div>
        </div>
      `).join("")
    : "";
}

function renderVoiceProgress() {
  const doneCount = vpRecordings.filter((x) => !!x.blob).length;
  const currentHuman = Math.min(vpIndex + 1, SAMPLE_COUNT);

  if (voiceProgressCount) voiceProgressCount.textContent = `${currentHuman} / ${SAMPLE_COUNT}`;
  if (voiceProgressFill) {
    const pct = Math.max(0, Math.min(100, (doneCount / SAMPLE_COUNT) * 100));
    voiceProgressFill.style.width = `${pct}%`;
  }

  const hasCurrent = !!vpRecordings[vpIndex]?.blob;
  const isLast = vpIndex === SAMPLE_COUNT - 1;

  if (voiceNextBtn) {
    voiceNextBtn.style.display = isLast ? "none" : "flex";
    voiceNextBtn.disabled = !hasCurrent || vpSaving;
  }

  if (voiceFinishBtn) {
    voiceFinishBtn.style.display = isLast ? "flex" : "none";
    voiceFinishBtn.disabled = !(doneCount === SAMPLE_COUNT) || vpSaving;
  }
}

function updateVoiceUI() {
  const txt = vpSamples[vpIndex] || "";

  if (voiceSampleLabel) voiceSampleLabel.textContent = `CÜMLE ${vpIndex + 1}`;
  if (voiceSampleText) voiceSampleText.textContent = txt;

  const existing = vpRecordings[vpIndex];
  resetVpTimer();
  setMicListening(false);

  if (existing?.blob) {
    if (voiceTimerText) voiceTimerText.textContent = fmtSec(existing.seconds || 0);
    setEnrollStatus(
      vpIndex === SAMPLE_COUNT - 1
        ? "Kayıt tamamlandı • Kaydet ve Tamamla'ya bas"
        : "Kayıt tamamlandı • Sonraki Cümle'ye geç",
      "good"
    );
  } else {
    if (voiceTimerText) voiceTimerText.textContent = "00:00";
    setEnrollStatus("Mikrofona dokun ve başla");
  }

  renderVoiceProgress();
  renderCompletedList();
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

  resetVpTimer();
  destroyRecorder();
  updateVoiceUI();
}

async function openVoiceModal() {
  await initVoiceModal();
  voiceModal?.classList.add("show");
}

function closeVoiceModal() {
  voiceModal?.classList.remove("show");
  resetVpTimer();
  setMicListening(false);
  destroyRecorder();
}

async function toggleVoiceRecording() {
  if (vpSaving) return;

  if (!vpRecorder?.isRecording) {
    try {
      await vpRecorder.start();
      setMicListening(true);
      startVpTimer();
      setEnrollStatus("Kayıt başladı • Bitirmek için tekrar dokun", "warn");
    } catch (e) {
      setMicListening(false);
      resetVpTimer();
      setEnrollStatus("Mikrofon izni gerekli veya kayıt başlatılamadı.", "bad");
      toast("Mikrofon izni gerekli");
    }
    return;
  }

  try {
    const result = await vpRecorder.stop();

    vpRecordings[vpIndex] = {
      blob: result.blob,
      seconds: result.seconds,
      mime: result.mime,
    };

    setMicListening(false);
    updateVoiceUI();
  } catch (e) {
    setMicListening(false);
    setEnrollStatus("Kayıt durdurulamadı.", "bad");
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

async function previewCloneVoice() {
  const uid = await getCurrentUid();
  if (!uid) {
    toast("Oturum bulunamadı");
    return;
  }

  const name =
    String(profileRow?.full_name || profileRow?.name || "").trim().split(" ")[0] || "Arkadaşım";

  const text = `Merhaba, ben ${name}. italkyAI ile çevirileri kendi sesimle ve duygularımı da yansıtarak yapabiliyorum. Böylece konuşmalarım daha doğal, daha sıcak ve bana daha yakın oluyor.`;

  try {
    const r = await fetch(`${location.origin}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        lang: "tr",
        user_id: uid,
        voice: "clone",
        tone: "neutral",
        module: "clone_preview"
      })
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.audio_base64) {
      toast("Kendi sesin oynatılamadı");
      return;
    }

    const audio = new Audio(`data:audio/mp3;base64,${j.audio_base64}`);
    audio.play().catch(() => {
      toast("Ses oynatılamadı");
    });
  } catch {
    toast("Kendi sesin oynatılamadı");
  }
}

async function saveVoiceProfileFull() {
  const doneCount = vpRecordings.filter((x) => !!x.blob).length;
  if (doneCount !== SAMPLE_COUNT) {
    setEnrollStatus("Tüm cümleleri tamamla.", "bad");
    return;
  }

  vpSaving = true;
  setBusy(voiceFinishBtn, "Kaydediliyor...");
  setEnrollStatus("Ses profili kaydediliyor...", "warn");

  try {
    await finishVoiceProfile(vpLang, vpRecordings);
    setEnrollStatus("AI sesi hazırlanıyor...", "warn");

    const enrollResp = await enrollTTSVoice();
    await markCloneAsSelected(enrollResp);

    await loadProfileInfo();

    voiceProfileReady = true;
    voiceMode = "clone";

    refreshCloneCard();
    paintSelections();
    refreshSummary();
    refreshPremiumWarning();
    saveSettings();

    setEnrollStatus("Özel ses hazır. Artık Kendi Sesim kullanılabilir.", "good");
    toast("Ses profili hazır");

    setTimeout(() => {
      closeVoiceModal();
    }, 800);
  } catch (e) {
    setEnrollStatus(e?.message || "Özel ses kaydedilemedi.", "bad");
    toast(e?.message || "Profil oluşturulamadı");
  } finally {
    vpSaving = false;
    clearBusy(voiceFinishBtn);
    renderVoiceProgress();
  }
}

async function handleCloneSelection(openEditor = false) {
  await loadProfileInfo();
  refreshCloneCard();
  refreshSummary();
  refreshPremiumWarning();

  if (accessState.lockedAll) {
    showUiModal("Bu menüyü kullanabilmek için üyelik paketi satın almanız gereklidir.");
    return;
  }

  if (accessState.trialActive) {
    showUiModal("Kendi sesinizi kullanmak için üye olmanız gereklidir.");
    return;
  }

  if (!canUseCloneVoice()) {
    showUiModal("Kendi sesinizi kullanmak için üyelik paketi satın almanız gereklidir.");
    return;
  }

  if (voiceProfileReady && !openEditor) {
    voiceMode = "clone";
    paintSelections();
    refreshSummary();
    refreshPremiumWarning();
    await previewCloneVoice();
    return;
  }

  await openVoiceModal();
}

function bindVoiceChoices() {
  voiceGrid?.querySelectorAll(".choice").forEach((el) => {
    el.addEventListener("click", async (e) => {
      const selected = normalizeVoiceMode(el.dataset.voice || "auto");

      if (selected === "clone") {
        const clickedMini = !!e.target?.closest?.("#cloneMini");
        await handleCloneSelection(clickedMini);
        return;
      }

      if (accessState.lockedAll) {
        showUiModal("Bu menüyü kullanabilmek için üyelik paketi satın almanız gereklidir.");
        return;
      }

      voiceMode = "auto";
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
      const selected = normalizeTranslateMode(el.dataset.translate || "normal");

      if (accessState.lockedAll) {
        showUiModal("Bu menüyü kullanabilmek için üyelik paketi satın almanız gereklidir.");
        return;
      }

      if (selected === "cultural") {
        if (accessState.trialActive) {
          showUiModal("Kültürel Translate kullanmak için üye olmanız gereklidir.");
          return;
        }

        if (!canUseCulturalTranslate()) {
          showUiModal("Kültürel Translate kullanmak için üyelik paketi satın almanız gereklidir.");
          return;
        }
      }

      translateMode = selected;
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

  voiceRecordBtn?.addEventListener("click", async () => {
    await toggleVoiceRecording();
  });

  voiceNextBtn?.addEventListener("click", async () => {
    if (vpSaving) return;
    await nextVoiceSample();
  });

  voiceFinishBtn?.addEventListener("click", async () => {
    if (vpSaving) return;
    await saveVoiceProfileFull();
  });

  voiceCancelBtn?.addEventListener("click", () => {
    closeVoiceModal();
  });
}

async function handleSaveAndStart() {
  if (isBusy) return;
  isBusy = true;
  setBusy(saveStartBtn, "Kontrol ediliyor...");

  try {
    await loadProfileInfo();
    refreshCloneCard();
    refreshSummary();
    refreshPremiumWarning();

    if (accessState.lockedAll) {
      showUiModal("Deneme süreniz doldu. Sistemi kullanabilmek için üyelik paketi satın almanız gereklidir.");
      return;
    }

    if (voiceMode === "clone" && !voiceProfileReady) {
      await openVoiceModal();
      return;
    }

    saveSettings();
    goStartPage();
  } finally {
    isBusy = false;
    clearBusy(saveStartBtn);
  }
}

function applyEntryContext() {
  if (!saveStartBtn) return;

  if (fromPage === "sidetoside") {
    saveStartBtn.textContent = editMode ? "Kaydet ve Dön" : "Kaydet ve Başlat";
    return;
  }

  saveStartBtn.textContent = "Kaydet ve Başlat";
}

async function init() {
  reason = String(url.searchParams.get("reason") || "").trim().toLowerCase();

  applyEntryContext();
  bindVoiceChoices();
  bindTranslateChoices();
  bindVoiceModal();

  saveStartBtn?.addEventListener("click", handleSaveAndStart);
  buyJetonBtn?.addEventListener("click", goJetonMarket);

  await readAccessState();
  await loadProfileInfo();

  refreshCloneCard();
  paintSelections();
  refreshSummary();
  refreshPremiumWarning();
}

window.addEventListener("beforeunload", () => {
  destroyRecorder();
  resetVpTimer();
});

init();
