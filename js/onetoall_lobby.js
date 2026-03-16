// FILE: /js/onetoall_lobby.js

import { mountShell } from "/js/ui_shell.js";

try {
  mountShell({ scroll: "auto" });
} catch (e) {
  console.warn("[onetoall lobby shell]", e);
}

const $ = (id) => document.getElementById(id);

const els = {
  homeCards: $("homeCards"),
  speakerSetupPanel: $("speakerSetupPanel"),
  speakerRoomPanel: $("speakerRoomPanel"),
  listenerPanel: $("listenerPanel"),

  goSpeaker: $("goSpeaker"),
  goListener: $("goListener"),

  speakerLang: $("speakerLang"),
  speakerVoice: $("speakerVoice"),

  modeVoiceBtn: $("modeVoiceBtn"),
  modeTextBtn: $("modeTextBtn"),

  micAlwaysBtn: $("micAlwaysBtn"),
  noiseReduceBtn: $("noiseReduceBtn"),

  btnCreateRoom: $("btnCreateRoom"),
  btnBackSpeakerSetup: $("btnBackSpeakerSetup"),
  btnResetSpeakerSetup: $("btnResetSpeakerSetup"),

  roomCode: $("roomCode"),
  speakerStatus: $("speakerStatus"),
  btnStartRoom: $("btnStartRoom"),
  btnCopy: $("btnCopy"),
  btnShareLink: $("btnShareLink"),
  btnBackSpeakerRoom: $("btnBackSpeakerRoom"),
  btnRecreateRoom: $("btnRecreateRoom"),

  roomInput: $("roomInput"),
  listenerLang: $("listenerLang"),
  listenAudioBtn: $("listenAudioBtn"),
  listenTextBtn: $("listenTextBtn"),
  listenerStatus: $("listenerStatus"),
  btnJoin: $("btnJoin"),
  btnBackListener: $("btnBackListener"),
};

let activeCode = "";

function show(panel) {
  [els.homeCards, els.speakerSetupPanel, els.speakerRoomPanel, els.listenerPanel]
    .filter(Boolean)
    .forEach((el) => el.classList.add("hide"));

  if (panel) {
    panel.classList.remove("hide");
    panel.classList.remove("panel-entry");
    void panel.offsetWidth;
    panel.classList.add("panel-entry");
  }
}

function showHome() {
  show(els.homeCards);
}

function makeShortCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function cleanCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function setExclusive(a, b) {
  if (!a || !b) return;
  a.classList.add("active");
  b.classList.remove("active");
}

function setStatus(el, text, type = "") {
  if (!el) return;
  el.textContent = text || "";
  el.className = `status ${type}`.trim();
}

function saveSpeakerRoom(code) {
  localStorage.setItem("italky_onetoall_room", code);
  localStorage.setItem("italky_onetoall_speaker_lang", els.speakerLang?.value || "tr");
  localStorage.setItem("italky_onetoall_speaker_voice", els.speakerVoice?.value || "default_female");
  localStorage.setItem(
    "italky_onetoall_output_mode",
    els.modeTextBtn?.classList.contains("active") ? "text" : "voice"
  );
  localStorage.setItem(
    "italky_onetoall_mic_always",
    els.micAlwaysBtn?.classList.contains("active") ? "1" : "0"
  );
  localStorage.setItem(
    "italky_onetoall_noise_reduce",
    els.noiseReduceBtn?.classList.contains("active") ? "1" : "0"
  );
}

function resetSpeakerSetup() {
  if (els.speakerLang) els.speakerLang.value = "tr";
  if (els.speakerVoice) els.speakerVoice.value = "default_female";
  setExclusive(els.modeVoiceBtn, els.modeTextBtn);

  els.micAlwaysBtn?.classList.add("active");
  els.noiseReduceBtn?.classList.remove("active");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text || ""));
    return true;
  } catch {
    return false;
  }
}

async function shareRoomLink(code) {
  const shareUrl = `${location.origin}/pages/onetoall.html?role=listener&room=${encodeURIComponent(code)}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "italkyAI OneToAll",
        text: "Bu yayın odasına katıl",
        url: shareUrl,
      });
      return { ok: true, type: "share" };
    }

    const copied = await copyText(shareUrl);
    return copied ? { ok: true, type: "copy" } : { ok: false, type: "none" };
  } catch {
    return { ok: false, type: "none" };
  }
}

function goToSpeakerLive() {
  const code = String(els.roomCode?.textContent || "").trim().toUpperCase();
  const lang = els.speakerLang?.value || "tr";
  const voice = els.speakerVoice?.value || "default_female";
  const output = els.modeTextBtn?.classList.contains("active") ? "text" : "voice";
  const micAlways = els.micAlwaysBtn?.classList.contains("active") ? "1" : "0";
  const noiseReduce = els.noiseReduceBtn?.classList.contains("active") ? "1" : "0";

  if (!code || code.length !== 6) {
    setStatus(els.speakerStatus, "Önce geçerli oda oluştur.", "danger");
    return;
  }

  location.href =
    `/pages/onetoall_live.html?role=speaker` +
    `&room=${encodeURIComponent(code)}` +
    `&lang=${encodeURIComponent(lang)}` +
    `&voice=${encodeURIComponent(voice)}` +
    `&output=${encodeURIComponent(output)}` +
    `&mic_always=${encodeURIComponent(micAlways)}` +
    `&noise_reduce=${encodeURIComponent(noiseReduce)}`;
}

function goToListenerLive() {
  const code = cleanCode(els.roomInput?.value || "");

  if (code.length !== 6) {
    setStatus(els.listenerStatus, "Oda kodu 6 karakter olmalı.", "danger");
    els.roomInput?.focus();
    return;
  }

  const lang = els.listenerLang?.value || "en";
  const mode = els.listenTextBtn?.classList.contains("active") ? "text" : "audio";

  location.href =
    `/pages/onetoall_live.html?role=listener` +
    `&room=${encodeURIComponent(code)}` +
    `&lang=${encodeURIComponent(lang)}` +
    `&mode=${encodeURIComponent(mode)}`;
}

function createSpeakerRoom() {
  activeCode = makeShortCode(6);
  if (els.roomCode) els.roomCode.textContent = activeCode;

  saveSpeakerRoom(activeCode);
  setStatus(els.speakerStatus, "Oda oluşturuldu. Dinleyiciler artık bu kodla giriş yapabilir.", "ok");
  show(els.speakerRoomPanel);
}

function recreateRoom() {
  activeCode = makeShortCode(6);
  if (els.roomCode) els.roomCode.textContent = activeCode;

  saveSpeakerRoom(activeCode);
  setStatus(els.speakerStatus, "Yeni oda kodu oluşturuldu.", "warn");
}

function bootFromCache() {
  try {
    const code = cleanCode(localStorage.getItem("italky_onetoall_room") || "");
    const speakerLang = localStorage.getItem("italky_onetoall_speaker_lang") || "tr";
    const speakerVoice = localStorage.getItem("italky_onetoall_speaker_voice") || "default_female";
    const outputMode = localStorage.getItem("italky_onetoall_output_mode") || "voice";
    const micAlways = localStorage.getItem("italky_onetoall_mic_always") || "1";
    const noiseReduce = localStorage.getItem("italky_onetoall_noise_reduce") || "0";

    if (els.speakerLang) els.speakerLang.value = speakerLang;
    if (els.speakerVoice) els.speakerVoice.value = speakerVoice;

    if (outputMode === "text") setExclusive(els.modeTextBtn, els.modeVoiceBtn);
    else setExclusive(els.modeVoiceBtn, els.modeTextBtn);

    if (micAlways === "1") els.micAlwaysBtn?.classList.add("active");
    else els.micAlwaysBtn?.classList.remove("active");

    if (noiseReduce === "1") els.noiseReduceBtn?.classList.add("active");
    else els.noiseReduceBtn?.classList.remove("active");

    if (code) {
      activeCode = code;
      if (els.roomCode) els.roomCode.textContent = code;
    }
  } catch (e) {
    console.warn("[onetoall bootFromCache]", e);
  }
}

function bootFromQuery() {
  const params = new URLSearchParams(location.search);
  const role = String(params.get("role") || "").trim().toLowerCase();
  const room = cleanCode(params.get("room") || "");

  if (role === "listener") {
    show(els.listenerPanel);
    if (room && els.roomInput) {
      els.roomInput.value = room;
      setStatus(els.listenerStatus, "Bağlantı kodu hazır. Şimdi giriş yap.", "ok");
    }
    return;
  }

  showHome();
}

function bindEvents() {
  els.goSpeaker?.addEventListener("click", () => {
    show(els.speakerSetupPanel);
  });

  els.goListener?.addEventListener("click", () => {
    show(els.listenerPanel);
    setTimeout(() => els.roomInput?.focus(), 120);
  });

  els.modeVoiceBtn?.addEventListener("click", () => setExclusive(els.modeVoiceBtn, els.modeTextBtn));
  els.modeTextBtn?.addEventListener("click", () => setExclusive(els.modeTextBtn, els.modeVoiceBtn));

  els.listenAudioBtn?.addEventListener("click", () => setExclusive(els.listenAudioBtn, els.listenTextBtn));
  els.listenTextBtn?.addEventListener("click", () => setExclusive(els.listenTextBtn, els.listenAudioBtn));

  els.micAlwaysBtn?.addEventListener("click", () => {
    els.micAlwaysBtn.classList.toggle("active");
  });

  els.noiseReduceBtn?.addEventListener("click", () => {
    els.noiseReduceBtn.classList.toggle("active");
  });

  els.btnCreateRoom?.addEventListener("click", createSpeakerRoom);
  els.btnRecreateRoom?.addEventListener("click", recreateRoom);

  els.btnStartRoom?.addEventListener("click", goToSpeakerLive);

  els.btnBackSpeakerSetup?.addEventListener("click", showHome);
  els.btnBackSpeakerRoom?.addEventListener("click", () => show(els.speakerSetupPanel));
  els.btnBackListener?.addEventListener("click", showHome);

  els.btnResetSpeakerSetup?.addEventListener("click", resetSpeakerSetup);

  els.btnCopy?.addEventListener("click", async () => {
    const ok = await copyText(String(els.roomCode?.textContent || "").trim());
    setStatus(
      els.speakerStatus,
      ok ? "Oda kodu panoya kopyalandı." : "Kopyalama başarısız oldu.",
      ok ? "ok" : "danger"
    );
  });

  els.btnShareLink?.addEventListener("click", async () => {
    const result = await shareRoomLink(String(els.roomCode?.textContent || "").trim());

    if (result.ok && result.type === "share") {
      setStatus(els.speakerStatus, "Katılım linki paylaşıldı.", "ok");
    } else if (result.ok && result.type === "copy") {
      setStatus(els.speakerStatus, "Katılım linki panoya kopyalandı.", "ok");
    } else {
      setStatus(els.speakerStatus, "Link paylaşımı iptal edildi.", "warn");
    }
  });

  els.roomInput?.addEventListener("input", () => {
    els.roomInput.value = cleanCode(els.roomInput.value);

    if (els.roomInput.value.length === 6) {
      setStatus(els.listenerStatus, "Kod tamamlandı. Bağlanabilirsin.", "ok");
    } else {
      setStatus(els.listenerStatus, "6 karakterlik kısa oda kodunu gir.", "warn");
    }
  });

  els.roomInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goToListenerLive();
    }
  });

  els.btnJoin?.addEventListener("click", goToListenerLive);
}

function init() {
  bootFromCache();
  bindEvents();
  bootFromQuery();
}

init();
