import { mountShell } from "/js/ui_shell.js";

const API_BASE = "https://italky-api.onrender.com/api";
const $ = (id) => document.getElementById(id);

try {
  mountShell({ scroll: "none" });
} catch (e) {
  console.warn("ui_shell warning:", e);
}

const inputText       = $("inputText");
const sendBtn         = $("sendBtn");
const micBtn          = $("micBtn");
const chatLog         = $("chatLog");
const explainCard     = $("explainCard");
const statusBox       = $("statusBox");

const gokturkText     = $("gokturkText");
const latinText       = $("latinText");
const confidencePill  = $("confidencePill");
const voicePill       = $("voicePill");

const copyLatinBtn    = $("copyLatinBtn");
const copyGokturkBtn  = $("copyGokturkBtn");
const speakBtn        = $("speakBtn");

const modeTtsBtn      = $("modeTtsBtn");
const modeOwnBtn      = $("modeOwnBtn");

let latestResult = null;
let speechMode = localStorage.getItem("atalarin_dili_voice_mode") || "tts";
let recog = null;
let isListening = false;

applyVoiceModeUI();

function setStatus(message = "", type = "info") {
  if (!message) {
    statusBox.className = "status info";
    statusBox.textContent = "";
    statusBox.classList.remove("show");
    return;
  }
  statusBox.textContent = message;
  statusBox.className = `status ${type} show`;
}

function saveVoiceMode(mode) {
  speechMode = mode === "own" ? "own" : "tts";
  localStorage.setItem("atalarin_dili_voice_mode", speechMode);
  applyVoiceModeUI();
}

function applyVoiceModeUI() {
  const isOwn = speechMode === "own";
  modeTtsBtn.classList.toggle("active", !isOwn);
  modeOwnBtn.classList.toggle("active", isOwn);
  voicePill.textContent = `Ses modu: ${isOwn ? "Kendi Sesim" : "Otomatik TTS"}`;
}

function addMsg(text, who = "ai") {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight + 300;
}

function setOutput(data) {
  latestResult = data || null;

  gokturkText.textContent = data?.gokturk_script || "𐱅𐰭𐰼𐰃 𐰽𐰇𐰔𐰃…";
  latinText.textContent = data?.old_turkic_latin || "Sonuç burada görünecek.";
  explainCard.textContent = data?.explanation || "Açıklama burada görünecek.";
  confidencePill.textContent = `Güven: ${data?.confidence || "-"}`;
}

async function copyToClipboard(text, okMessage) {
  try {
    await navigator.clipboard.writeText(String(text || ""));
    setStatus(okMessage, "ok");
  } catch {
    setStatus("Kopyalama başarısız oldu.", "error");
  }
}

async function requestTransform(text) {
  const res = await fetch(`${API_BASE}/old_turkic/transform`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ text })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Dönüştürme hatası.");
  }

  return data.result || null;
}

async function tryOwnVoicePlayback(text) {
  try {
    const res = await fetch(`${API_BASE}/old_turkic/voice`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        text,
        voice_mode: "own"
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.audio_url) {
      throw new Error(data?.error || "Özel ses üretilemedi.");
    }

    const audio = new Audio(data.audio_url);
    await audio.play().catch(() => {});
    return true;
  } catch (e) {
    console.warn("own voice fallback:", e);
    return false;
  }
}

function speakWithBrowserTTS(text) {
  try {
    window.speechSynthesis.cancel();
    const ut = new SpeechSynthesisUtterance(String(text || ""));
    ut.lang = "tr-TR";
    ut.rate = 0.88;
    ut.pitch = 0.95;
    window.speechSynthesis.speak(ut);
    return true;
  } catch {
    return false;
  }
}

async function autoSpeakResult() {
  if (!latestResult?.old_turkic_latin) return;
  const text = latestResult.old_turkic_latin;

  if (speechMode === "own") {
    const ok = await tryOwnVoicePlayback(text);
    if (ok) return;

    setStatus("Kendi sesin hazır değil; geçici olarak otomatik TTS ile okundu.", "info");
    speakWithBrowserTTS(text);
    return;
  }

  speakWithBrowserTTS(text);
}

async function runTransform() {
  const text = String(inputText.value || "").trim();
  if (!text) {
    setStatus("Lütfen bir cümle yaz.", "error");
    inputText.focus();
    return;
  }

  setStatus("Ata dili işleniyor…", "info");
  sendBtn.disabled = true;

  addMsg(text, "user");

  try {
    const result = await requestTransform(text);
    setOutput(result);
    addMsg(result?.old_turkic_latin || "Sonuç üretildi.", "ai");
    setStatus("Dönüşüm tamamlandı.", "ok");
    autoSpeakResult();
  } catch (err) {
    setStatus(err?.message || "Beklenmeyen bir hata oluştu.", "error");
    addMsg("Dönüştürme sırasında bir sorun oluştu.", "ai");
  } finally {
    sendBtn.disabled = false;
    inputText.value = "";
    autoResize();
  }
}

function autoResize() {
  inputText.style.height = "44px";
  inputText.style.height = Math.min(inputText.scrollHeight, 120) + "px";
}

function setupHints() {
  document.querySelectorAll(".hint").forEach((el) => {
    el.addEventListener("click", () => {
      inputText.value = el.textContent.trim();
      autoResize();
      inputText.focus();
    });
  });
}

function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    micBtn.disabled = true;
    micBtn.title = "Tarayıcı mikrofon desteği yok";
    return;
  }

  recog = new SR();
  recog.lang = "tr-TR";
  recog.interimResults = true;
  recog.continuous = false;

  recog.onstart = () => {
    isListening = true;
    micBtn.classList.add("live");
    setStatus("Dinliyorum… konuş.", "info");
  };

  recog.onresult = (event) => {
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      finalText += event.results[i][0].transcript || "";
    }
    inputText.value = finalText.trim();
    autoResize();
  };

  recog.onerror = () => {
    isListening = false;
    micBtn.classList.remove("live");
    setStatus("Mikrofon algılama hatası.", "error");
  };

  recog.onend = () => {
    isListening = false;
    micBtn.classList.remove("live");
    setStatus("Mikrofon kapandı.", "ok");
  };
}

modeTtsBtn.addEventListener("click", () => saveVoiceMode("tts"));
modeOwnBtn.addEventListener("click", () => saveVoiceMode("own"));
sendBtn.addEventListener("click", runTransform);

inputText.addEventListener("input", autoResize);
inputText.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runTransform();
  }
});

copyLatinBtn.addEventListener("click", () => {
  if (!latestResult?.old_turkic_latin) {
    setStatus("Henüz latin çıktı yok.", "error");
    return;
  }
  copyToClipboard(latestResult.old_turkic_latin, "Latin metin kopyalandı.");
});

copyGokturkBtn.addEventListener("click", () => {
  if (!latestResult?.gokturk_script) {
    setStatus("Henüz Göktürk çıktısı yok.", "error");
    return;
  }
  copyToClipboard(latestResult.gokturk_script, "Göktürk metni kopyalandı.");
});

speakBtn.addEventListener("click", async () => {
  if (!latestResult?.old_turkic_latin) {
    setStatus("Önce bir sonuç üret.", "error");
    return;
  }
  await autoSpeakResult();
});

micBtn.addEventListener("click", () => {
  if (!recog) {
    setStatus("Bu cihazda mikrofon desteği yok.", "error");
    return;
  }

  if (isListening) {
    try { recog.stop(); } catch {}
    return;
  }

  try { recog.start(); } catch {}
});

setupHints();
setupSpeechRecognition();
autoResize();
setOutput(null);
