// FILE: /js/ancestors_language_page.js

import { mountShell, setHeaderTokens } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { commitUsage } from "/js/usage_meter.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const micBtn = $("micBtn");
const sendBtn = $("sendBtn");
const clearBtn = $("clearBtn");
const speakBtn = $("speakBtn");
const copyBtn = $("copyBtn");
const retryBtn = $("retryBtn");
const inputPreview = $("inputPreview");
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
let currentAudio = null;
let sourceText = "";
let lastLatin = "";

const runeMap = {
  "a":"𐰀","b":"𐰉","c":"𐰲","ç":"𐰲","d":"𐰑","e":"𐰀","f":"𐰯","g":"𐰏","ğ":"𐰍",
  "h":"𐰴","ı":"𐰃","i":"𐰃","j":"𐰖","k":"𐰚","l":"𐰠","m":"𐰢","n":"𐰤","o":"𐰆",
  "ö":"𐰇","p":"𐰯","r":"𐰼","s":"𐰽","ş":"𐱁","t":"𐱅","u":"𐰆","ü":"𐰇","v":"𐰉",
  "y":"𐰖","z":"𐰔","q":"𐰚","w":"𐰉","x":"𐰴"
};

const phraseMap = new Map([
  ["selam", "esen bol"],
  ["merhaba", "esen bol"],
  ["nasılsın", "neçüksen"],
  ["iyi misin", "edgüsen mü"],
  ["iyiyim", "edgümen"],
  ["tanrı türkü korusun", "teŋri türüküg koruġsın"],
  ["tanrı türk'ü korusun", "teŋri türüküg koruġsın"],
  ["tanrı türk’ü korusun", "teŋri türüküg koruġsın"],
  ["türk yazısı", "türük bitig"],
  ["ben türküm", "men türükmen"],
  ["biz türküz", "biz türükbiz"],
  ["güçlü millet", "küçlüg bodun"],
  ["kutlu yurt", "kutluğ yurt"]
]);

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

function normalizeKey(value) {
  return normalizeInput(value)
    .toLowerCase()
    .replaceAll("’", "'")
    .replaceAll("‘", "'");
}

function translitToRunes(text) {
  const chars = Array.from(String(text || "").toLowerCase());
  return chars.map((ch) => {
    if (ch === " ") return " ";
    if (".,!?;:".includes(ch)) return " · ";
    return runeMap[ch] || ch;
  }).join("");
}

function wordLevelOldTurkic(text) {
  let t = normalizeInput(text).toLowerCase();

  const replacements = [
    [/tanrı/g, "teŋri"],
    [/gök/g, "kök"],
    [/türk/g, "türük"],
    [/korusun/g, "koruġsın"],
    [/nasılsın/g, "neçüksen"],
    [/iyiyim/g, "edgümen"],
    [/merhaba/g, "esen bol"],
    [/selam/g, "esen bol"],
    [/ben/g, "men"],
    [/biz/g, "biz"],
    [/siz/g, "siz"],
    [/sen/g, "sen"],
    [/yazı/g, "bitig"],
    [/dil/g, "til"],
    [/millet/g, "bodun"],
    [/vatan/g, "yurt"],
    [/ordu/g, "sü"],
    [/bilge/g, "bilge"],
    [/kağan/g, "kağan"],
    [/kutlu/g, "kutluğ"],
    [/güçlü/g, "küçlüg"],
    [/iyi/g, "edgü"]
  ];

  for (const [rx, val] of replacements) {
    t = t.replace(rx, val);
  }

  return t;
}

function buildOldTurkic(text) {
  const key = normalizeKey(text);
  if (phraseMap.has(key)) return phraseMap.get(key);
  return wordLevelOldTurkic(text);
}

function looksEnglish(text) {
  const s = String(text || "").trim().toLowerCase();
  if (!s) return false;
  const hits = ["hello", "hi", "may", "god", "protect", "the", "turk", "how are you", "good", "welcome"];
  let n = 0;
  for (const w of hits) {
    if (s.includes(w)) n++;
  }
  return n >= 2;
}

function renderInputPreview(text) {
  const clean = normalizeInput(text);
  inputPreview.textContent = clean || "Henüz konuşma alınmadı.";
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

function showTokenPopup(message = "Ataların Dili dönüşümü için jeton gerekiyor.") {
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
    showTokenPopup("Ataların Dili dönüşümü için jeton gerekiyor.");
    return false;
  }
  return true;
}

function animateOutputs(runes, latin) {
  gokturkOutput.textContent = runes || "𐱅𐰇𐰼𐰰 𐰖𐰀𐰔𐰃𐰽𐰃";
  latinOutput.textContent = latin || "türük bitig";
}

async function transformNow() {
  const rawText = normalizeInput(sourceText);
  if (!rawText) {
    toast("Önce konuşun");
    return;
  }

  const canRun = await ensureTranslationAccess();
  if (!canRun) return;

  setLeftStatus("Metin alındı");
  setRightStatus("Eski Türkçe hazırlanıyor...");
  sendBtn.disabled = true;

  let finalLatin = buildOldTurkic(rawText);
  let finalRunes = translitToRunes(finalLatin);

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
        instruction: "Translate only from Turkish into Old Turkic style. Never translate to English. Never answer in English. Return Old Turkic in Latin reading."
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

      const safeLatin = aiLatin && !looksEnglish(aiLatin) ? aiLatin : "";
      if (safeLatin) {
        finalLatin = safeLatin;
        finalRunes = String(
          json?.gokturk_text ||
          json?.old_turkic_runes ||
          ""
        ).trim() || translitToRunes(finalLatin);
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
      showTokenPopup("Ataların Dili dönüşümü için jeton gerekiyor.");
      sendBtn.disabled = false;
      return;
    }
    console.error("[ancestors_language usage]", e);
  }

  setRightStatus("Eski Türkçe hazır");
  sendBtn.disabled = false;
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
      sourceText = normalizeInput(sourceText + " " + finalText.trim());
      renderInputPreview(sourceText);
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

micBtn?.addEventListener("click", () => {
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

sendBtn?.addEventListener("click", transformNow);
retryBtn?.addEventListener("click", transformNow);

clearBtn?.addEventListener("click", () => {
  sourceText = "";
  renderInputPreview(sourceText);
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

  renderInputPreview(sourceText);
  await refreshHeaderTokens();
  setLeftStatus("Hazır");
  setRightStatus("Çıktı burada görünecek");
}

init();
