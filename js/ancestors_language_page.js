// FILE: /js/ancestors_language_page.js

import { mountShell, setHeaderTokens } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { commitUsage } from "/js/usage_meter.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const inputText = $("inputText");
const micBtn = $("micBtn");
const translateBtn = $("translateBtn");
const clearBtn = $("clearBtn");
const speakBtn = $("speakBtn");
const copyBtn = $("copyBtn");
const retryBtn = $("retryBtn");
const gokturkOutput = $("gokturkOutput");
const latinOutput = $("latinOutput");
const leftStatus = $("leftStatus");
const rightStatus = $("rightStatus");
const toastEl = $("toast");

const tokenBackdrop = $("tokenBackdrop");
const tokenTitle = $("tokenTitle");
const tokenText = $("tokenText");
const tokenCancel = $("tokenCancel");
const tokenOk = $("tokenOk");

let recognition = null;
let isListening = false;
let lastLatin = "";
let currentAudio = null;

const runeMap = {
  "a":"𐰀","b":"𐰉","c":"𐰲","ç":"𐰲","d":"𐰑","e":"𐰀","f":"𐰯","g":"𐰏","ğ":"𐰍",
  "h":"𐰴","ı":"𐰃","i":"𐰃","j":"𐰖","k":"𐰚","l":"𐰠","m":"𐰢","n":"𐰤","o":"𐰆",
  "ö":"𐰇","p":"𐰯","r":"𐰼","s":"𐰽","ş":"𐱁","t":"𐱅","u":"𐰆","ü":"𐰇","v":"𐰉",
  "y":"𐰖","z":"𐰔","q":"𐰚","w":"𐰉","x":"𐰴"
};

function toast(message = "") {
  if (!toastEl) return;
  toastEl.textContent = String(message || "");
  toastEl.classList.add("show");
  clearTimeout(window.__ancToastTimer);
  window.__ancToastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1800);
}

function setLeftStatus(message = "") {
  if (leftStatus) leftStatus.textContent = message;
}

function setRightStatus(message = "") {
  if (rightStatus) rightStatus.textContent = message;
}

function normalizeInput(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function translitToRunes(text) {
  const chars = Array.from(String(text || "").toLowerCase());
  return chars.map((ch) => {
    if (ch === " ") return " ";
    if (".,!?;:".includes(ch)) return " · ";
    return runeMap[ch] || ch;
  }).join("");
}

function toOldTurkicStyle(text) {
  let t = normalizeInput(text).toLowerCase();

  const replacements = [
    [/tanrı/g, "teŋri"],
    [/gök/g, "kök"],
    [/türk/g, "türük"],
    [/korusun/g, "koruġsın"],
    [/nasılsın/g, "neçüksen"],
    [/iyiyim/g, "edgümen"],
    [/merhaba/g, "esen bol"],
    [/selam/g, "esenlik"],
    [/ben/g, "men"],
    [/biz/g, "biz"],
    [/sen/g, "sen"],
    [/siz/g, "siz"],
    [/yazı/g, "bitig"],
    [/dil/g, "til"],
    [/millet/g, "bodun"],
    [/vatan/g, "yurt"],
    [/ordu/g, "sü"],
    [/bilge/g, "bilge"],
    [/kağan/g, "kağan"],
    [/kutlu/g, "kutluğ"],
    [/güçlü/g, "küçlüg"]
  ];

  for (const [rx, val] of replacements) {
    t = t.replace(rx, val);
  }

  return t;
}

function stopAudio() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
  } catch {}
  currentAudio = null;

  try {
    window.speechSynthesis?.cancel?.();
  } catch {}
}

async function refreshHeaderTokens() {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("tokens")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && typeof data?.tokens === "number") {
      try { setHeaderTokens(data.tokens); } catch {}
    }
  } catch {}
}

async function getTokenBalance() {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user?.id) return 0;

    const { data, error } = await supabase
      .from("profiles")
      .select("tokens")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return 0;
    return Number(data?.tokens || 0);
  } catch {
    return 0;
  }
}

function showTokenPopup(message = "Ataların Dili çevirisi için jeton gerekiyor.") {
  if (tokenTitle) tokenTitle.textContent = "Jeton Gerekli";
  if (tokenText) tokenText.textContent = message;
  tokenBackdrop?.classList.add("show");
}

function closeTokenPopup() {
  tokenBackdrop?.classList.remove("show");
}

tokenCancel?.addEventListener("click", closeTokenPopup);
tokenOk?.addEventListener("click", () => {
  location.href = "/pages/jetonbuy.html";
});
tokenBackdrop?.addEventListener("click", (e) => {
  if (e.target === tokenBackdrop) closeTokenPopup();
});

async function ensureTranslationAccess() {
  const tokens = await getTokenBalance();
  if (tokens <= 0) {
    showTokenPopup("Ataların Dili çevirisi için jeton gerekiyor.");
    return false;
  }
  return true;
}

function animateOutputs(runes, latin) {
  gokturkOutput.textContent = runes || "𐱅𐰇𐰼𐰰 𐰖𐰀𐰔𐰃𐰽𐰃";
  latinOutput.textContent = latin || "türük bitig";

  gokturkOutput.style.animation = "none";
  latinOutput.style.animation = "none";
  void gokturkOutput.offsetWidth;
  void latinOutput.offsetWidth;
  gokturkOutput.style.animation = "riseIn .45s ease";
  latinOutput.style.animation = "riseIn .55s ease";
}

async function transformNow() {
  const rawText = normalizeInput(inputText.value);
  if (!rawText) {
    toast("Önce Türkçe metin girin");
    return;
  }

  const canRun = await ensureTranslationAccess();
  if (!canRun) return;

  setLeftStatus("Metin alındı");
  setRightStatus("Eski Türkçe hazırlanıyor...");
  translateBtn.disabled = true;

  let finalLatin = toOldTurkicStyle(rawText);
  let finalRunes = translitToRunes(finalLatin);
  let aiSucceeded = false;

  try {
    const res = await fetch(`${API_BASE}/api/translate_ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: rawText,
        from_lang: "tr",
        to_lang: "otk",
        mode: "cultural",
        cultural: true,
        use_ai: true,
        style: "historic",
        domain: "ancestors_language",
        instruction: "Translate only from Turkish into Old Turkic style. Never translate to English. Output Old Turkic Latin reading if possible."
      })
    });

    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      const aiLatin = String(
        json?.latin_reading ||
        json?.old_turkic_latin ||
        json?.translated ||
        json?.translation ||
        ""
      ).trim();

      if (aiLatin && !/[a-z]{2,}\s+[a-z]{2,}\s+[a-z]{2,}/i.test(aiLatin.replace(/teŋri|türük|bitig|bodun|yurt/g, ""))) {
        finalLatin = aiLatin;
        finalRunes = String(
          json?.gokturk_text ||
          json?.old_turkic_runes ||
          ""
        ).trim() || translitToRunes(finalLatin);
        aiSucceeded = true;
      }
    }
  } catch (e) {
    console.warn("[ancestors_language ai fallback]", e);
  }

  animateOutputs(finalRunes, finalLatin);
  lastLatin = finalLatin;

  try {
    const usage = await commitUsage({
      module: "practice_ai",
      usageKind: "text_out",
      charCount: Math.max(rawText.length, finalLatin.length),
      note: "Ataların Dili • Metin dönüşümü",
      meta: {
        surface: "ancestors_language",
        from_lang: "tr",
        to_lang: "otk",
        input_chars: rawText.length,
        output_chars: finalLatin.length
      }
    });

    if (typeof usage?.tokens_after === "number") {
      try { setHeaderTokens(usage.tokens_after); } catch {}
    }
  } catch (e) {
    if (String(e?.code || "").includes("INSUFFICIENT_TOKENS")) {
      showTokenPopup("Ataların Dili çevirisi için jeton gerekiyor.");
      translateBtn.disabled = false;
      return;
    }
    console.error("[ancestors_language usage]", e);
  }

  setRightStatus(aiSucceeded ? "Eski Türkçe hazır" : "Eski Türkçe biçimi hazır");
  translateBtn.disabled = false;
}

async function speakNow() {
  const text = normalizeInput(lastLatin || latinOutput.textContent);
  if (!text) return;

  stopAudio();

  try {
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id || null;

    const res = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        lang: "tr",
        user_id: userId,
        module: "ancestors_language",
        voice: "auto",
        tone: "neutral"
      })
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.audio_base64) {
      const audio = new Audio(`data:audio/mp3;base64,${json.audio_base64}`);
      currentAudio = audio;
      await audio.play();
      setRightStatus("TTS ile seslendirildi");
      return;
    }
  } catch (e) {
    console.warn("[ancestors_language tts fallback]", e);
  }

  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "tr-TR";
    u.rate = 0.88;
    u.pitch = 0.96;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setRightStatus("TTS ile seslendirildi");
  } catch {}
}

function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = "tr-TR";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    isListening = true;
    micBtn.textContent = "⏹️ Durdur";
    setLeftStatus("Dinliyorum...");
  };

  rec.onresult = (e) => {
    let finalText = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const txt = e.results[i][0]?.transcript || "";
      if (e.results[i].isFinal) finalText += txt + " ";
    }

    if (finalText.trim()) {
      inputText.value = normalizeInput(inputText.value + " " + finalText.trim());
      setLeftStatus("Konuşma metne döküldü");
    }
  };

  rec.onerror = () => {
    isListening = false;
    micBtn.textContent = "🎙️ Konuş";
    setLeftStatus("Mikrofon başlatılamadı");
  };

  rec.onend = () => {
    isListening = false;
    micBtn.textContent = "🎙️ Konuş";
    setLeftStatus("Hazır");
  };

  return rec;
}

micBtn?.addEventListener("click", async () => {
  if (!recognition) recognition = initRecognition();
  if (!recognition) {
    toast("Bu cihazda konuşma algılama desteklenmiyor");
    return;
  }

  if (isListening) {
    try { recognition.stop(); } catch {}
    return;
  }

  try {
    recognition.start();
  } catch {
    setLeftStatus("Mikrofon başlatılamadı");
  }
});

translateBtn?.addEventListener("click", transformNow);
retryBtn?.addEventListener("click", transformNow);

clearBtn?.addEventListener("click", () => {
  inputText.value = "";
  animateOutputs("𐱅𐰇𐰼𐰰 𐰖𐰀𐰔𐰃𐰽𐰃", "türük bitig");
  lastLatin = "";
  setLeftStatus("Hazır");
  setRightStatus("Çıktı burada görünecek");
  stopAudio();
});

copyBtn?.addEventListener("click", async () => {
  const text = `${gokturkOutput.textContent}\n${latinOutput.textContent}`;
  try {
    await navigator.clipboard.writeText(text);
    toast("Kopyalandı");
  } catch {
    toast("Kopyalanamadı");
  }
});

speakBtn?.addEventListener("click", speakNow);

async function init() {
  try {
    mountShell({ scroll: "auto" });
  } catch (e) {
    console.warn("[ancestors_language shell]", e);
  }

  await refreshHeaderTokens();
  setLeftStatus("Hazır");
  setRightStatus("Çıktı burada görünecek");
}

init();
