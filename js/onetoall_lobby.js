import { mountShell } from "/js/ui_shell.js";

try {
  mountShell({ scroll: "auto" });
} catch (e) {
  console.error("ui_shell HATASI:", e);
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

function show(panel) {
  els.homeCards.classList.add("hide");
  els.speakerSetupPanel.classList.add("hide");
  els.speakerRoomPanel.classList.add("hide");
  els.listenerPanel.classList.add("hide");
  panel.classList.remove("hide");
}

function showHome() {
  els.homeCards.classList.remove("hide");
  els.speakerSetupPanel.classList.add("hide");
  els.speakerRoomPanel.classList.add("hide");
  els.listenerPanel.classList.add("hide");
}

function makeShortCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function setExclusive(a, b) {
  a.classList.add("active");
  b.classList.remove("active");
}

function setStatus(el, text, type) {
  el.textContent = text;
  el.className = "status";
  if (type) el.classList.add(type);
}

function saveSpeakerRoom(code) {
  localStorage.setItem("italky_onetoall_room", code);
  localStorage.setItem("italky_onetoall_speaker_lang", els.speakerLang.value);
  localStorage.setItem("italky_onetoall_speaker_voice", els.speakerVoice.value);
  localStorage.setItem(
    "italky_onetoall_output_mode",
    els.modeTextBtn.classList.contains("active") ? "text" : "voice"
  );
  localStorage.setItem(
    "italky_onetoall_mic_always",
    els.micAlwaysBtn.classList.contains("active") ? "1" : "0"
  );
  localStorage.setItem(
    "italky_onetoall_noise_reduce",
    els.noiseReduceBtn.classList.contains("active") ? "1" : "0"
  );
}

function resetSpeakerSetup() {
  els.speakerLang.value = "tr";
  els.speakerVoice.value = "default_female";
  setExclusive(els.modeVoiceBtn, els.modeTextBtn);
  els.micAlwaysBtn.classList.add("active");
  els.noiseReduceBtn.classList.remove("active");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
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
    return copied ? { ok: true, type: "copy" } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function goToSpeakerLive() {
  const code = els.roomCode.textContent.trim();
  const lang = els.speakerLang.value || "tr";
  const voice = els.speakerVoice.value || "default_female";
  const output = els.modeTextBtn.classList.contains("active") ? "text" : "voice";

  location.href =
    `/pages/onetoall_live.html?role=speaker` +
    `&room=${encodeURIComponent(code)}` +
    `&lang=${encodeURIComponent(lang)}` +
    `&voice=${encodeURIComponent(voice)}` +
    `&output=${encodeURIComponent(output)}`;
}

function goToListenerLive() {
  const code = els.roomInput.value.trim().toUpperCase();

  if (code.length !== 6) {
    setStatus(els.listenerStatus, "Oda kodu 6 karakter olmalı.", "danger");
    return;
  }

  const lang = els.listenerLang.value || "en";
  const mode = els.listenTextBtn.classList.contains("active") ? "text" : "audio";

  location.href =
    `/pages/onetoall_live.html?role=listener` +
    `&room=${encodeURIComponent(code)}` +
    `&lang=${encodeURIComponent(lang)}` +
    `&mode=${encodeURIComponent(mode)}`;
}

function bindEvents() {
  els.goSpeaker.addEventListener("click", () => {
    show(els.speakerSetupPanel);
  });

  els.goListener.addEventListener("click", () => {
    show(els.listenerPanel);
    els.roomInput.focus();
  });

  els.modeVoiceBtn.addEventListener("click", () => setExclusive(els.modeVoiceBtn, els.modeTextBtn));
  els.modeTextBtn.addEventListener("click", () => setExclusive(els.modeTextBtn, els.modeVoiceBtn));

  els.micAlwaysBtn.addEventListener("click", () => {
    els.micAlwaysBtn.classList.toggle("active");
  });

  els.noiseReduceBtn.addEventListener("click", () => {
    els.noiseReduceBtn.classList.toggle("active");
  });

  els.btnCreateRoom.addEventListener("click", () => {
    const code = makeShortCode();
    els.roomCode.textContent = code;
    saveSpeakerRoom(code);
    setStatus(els.speakerStatus, "Oda oluşturuldu. Dinleyiciler artık bu kodla giriş yapabilir.", "ok");
    show(els.speakerRoomPanel);
  });

  els.btnBackSpeakerSetup.addEventListener("click", showHome);

  els.btnResetSpeakerSetup.addEventListener("click", resetSpeakerSetup);

  els.btnBackSpeakerRoom.addEventListener("click", () => {
    show(els.speakerSetupPanel);
  });

  els.btnRecreateRoom.addEventListener("click", () => {
    const code = makeShortCode();
    els.roomCode.textContent = code;
    saveSpeakerRoom(code);
    setStatus(els.speakerStatus, "Yeni oda kodu oluşturuldu.", "warn");
  });

  els.btnCopy.addEventListener("click", async () => {
    const ok = await copyText(els.roomCode.textContent.trim());
    setStatus(
      els.speakerStatus,
      ok ? "Oda kodu panoya kopyalandı." : "Kopyalama başarısız oldu.",
      ok ? "ok" : "danger"
    );
  });

  els.btnShareLink.addEventListener("click", async () => {
    const result = await shareRoomLink(els.roomCode.textContent.trim());

    if (result.ok && result.type === "share") {
      setStatus(els.speakerStatus, "Katılım linki paylaşıldı.", "ok");
    } else if (result.ok && result.type === "copy") {
      setStatus(els.speakerStatus, "Katılım linki panoya kopyalandı.", "ok");
    } else {
      setStatus(els.speakerStatus, "Link paylaşımı iptal edildi.", "warn");
    }
  });

  els.btnStartRoom.addEventListener("click", goToSpeakerLive);

  els.listenAudioBtn.addEventListener("click", () => setExclusive(els.listenAudioBtn, els.listenTextBtn));
  els.listenTextBtn.addEventListener("click", () => setExclusive(els.listenTextBtn, els.listenAudioBtn));

  els.roomInput.addEventListener("input", () => {
    els.roomInput.value = els.roomInput.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);

    if (els.roomInput.value.length === 6) {
      setStatus(els.listenerStatus, "Kod tamamlandı. Bağlanabilirsin.", "ok");
    } else {
      setStatus(els.listenerStatus, "6 karakterlik kısa oda kodunu gir.", "warn");
    }
  });

  els.btnJoin.addEventListener("click", goToListenerLive);

  els.btnBackListener.addEventListener("click", showHome);
}

function bootFromQuery() {
  const params = new URLSearchParams(location.search);
  const role = String(params.get("role") || "").trim().toLowerCase();
  const room = String(params.get("room") || "").trim().toUpperCase();

  if (role === "listener") {
    show(els.listenerPanel);
    if (room) {
      els.roomInput.value = room.replace(/[^A-Z0-9]/g, "").slice(0, 6);
      setStatus(els.listenerStatus, "Bağlantı kodu hazır. Şimdi giriş yap.", "ok");
    }
  }
}

function init() {
  bindEvents();
  bootFromQuery();
}

init();
