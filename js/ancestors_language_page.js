// FILE: /js/ancestors_language_page.js

import { supabase } from "/js/supabase_client.js";
import { setHeaderTokens } from "/js/ui_shell.js";
import { commitUsage } from "/js/usage_meter.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const topBody = $("topBody");
const botBody = $("botBody");
const botMic = $("botMic");
const topHelper = $("topHelper");
const botHelper = $("botHelper");
const clearBtn = $("clearBtn");
const homeLink = $("homeLink");

const uiModal = $("uiModal");
const uiModalText = $("uiModalText");
const uiModalGo = $("uiModalGo");
const uiModalClose = $("uiModalClose");

let recognizer = null;
let listening = false;
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

function normalizeInput(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value) {
  return normalizeInput(value).toLowerCase().replaceAll("’", "'").replaceAll("‘", "'");
}

function buildOldTurkic(text) {
  const key = normalizeKey(text);
  if (phraseMap.has(key)) return phraseMap.get(key);

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
    [/kağan/g, "kağan"],
    [/kutlu/g, "kutluğ"],
    [/güçlü/g, "küçlüg"],
    [/iyi/g, "edgü"]
  ];
  for (const [rx, val] of replacements) t = t.replace(rx, val);
  return t;
}

function translitToRunes(text) {
  const chars = Array.from(String(text || "").toLowerCase());
  return chars.map((ch) => {
    if (ch === " ") return " ";
    if (".,!?;:".includes(ch)) return " · ";
    return runeMap[ch] || ch;
  }).join("");
}

function stopAudio() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
  } catch {}
  currentAudio = null;

  try { window.speechSynthesis?.cancel?.(); } catch {}
}

function setTopMessage(text) {
  topBody.innerHTML = "";
  const bubble = document.createElement("div");
  bubble.className = "bubble me is-latest";
  bubble.innerHTML = `<div class="bubble-row"><span class="txt">${text}</span></div>`;
  topBody.appendChild(bubble);
}

function setTopOutput(runes, latin) {
  topBody.innerHTML = "";

  const runeBubble = document.createElement("div");
  runeBubble.className = "bubble me is-latest";
  runeBubble.innerHTML = `<div class="bubble-row"><span class="txt">${runes}</span></div>`;

  const latinBubble = document.createElement("div");
  latinBubble.className = "bubble them";
  latinBubble.innerHTML = `
    <div class="bubble-row">
      <span class="txt">${latin}</span>
      <button class="spk-icon" id="speakLatinBtn" aria-label="Seslendir">
        <svg viewBox="0 0 24 24">
          <path d="M3 10v4h4l5 4V6L7 10H3"></path>
          <path d="M16 8a4 4 0 0 1 0 8"></path>
          <path d="M19 5a8 8 0 0 1 0 14"></path>
        </svg>
      </button>
    </div>
  `;

  topBody.appendChild(runeBubble);
  topBody.appendChild(latinBubble);

  document.getElementById("speakLatinBtn")?.addEventListener("click", speakNow);
}

function setBottomMessage(text) {
  botBody.innerHTML = "";
  const bubble = document.createElement("div");
  bubble.className = "bubble me is-latest";
  bubble.innerHTML = `<div class="bubble-row"><span class="txt">${text}</span></div>`;
  botBody.appendChild(bubble);
}

function setHelpers(top, bottom, bottomWait = false) {
  topHelper.textContent = top || "";
  botHelper.textContent = bottom || "";
  botHelper.className = `helper-text${bottomWait ? " helper-wait" : ""}`;
  topHelper.className = "helper-text";
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

function showUiModal(message) {
  uiModalText.textContent = message;
  uiModal.classList.add("open");
}

function closeUiModal() {
  uiModal.classList.remove("open");
}

uiModalGo?.addEventListener("click", () => {
  location.href = "/pages/jetonbuy.html";
});
uiModalClose?.addEventListener("click", closeUiModal);
uiModal?.addEventListener("click", (e) => {
  if (e.target === uiModal) closeUiModal();
});

async function ensureTranslationAccess() {
  const tokens = await getTokenBalance();
  if (tokens <= 0) {
    showUiModal("Ataların Dili dönüşümü için jeton gerekiyor.");
    return false;
  }
  return true;
}

async function transformNow() {
  const rawText = normalizeInput(sourceText);
  if (!rawText) return;

  const canRun = await ensureTranslationAccess();
  if (!canRun) return;

  setHelpers("Eski Türkçe hazırlanıyor...", "Lütfen bekleyiniz...", true);

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
    const aiLatin = String(
      json?.latin_reading ||
      json?.old_turkic_latin ||
      json?.translated ||
      json?.translation ||
      ""
    ).trim();

    if (res.ok && aiLatin && !/\b(hello|hi|may|god|protect|the|turk)\b/i.test(aiLatin)) {
      finalLatin = aiLatin;
      finalRunes = String(
        json?.gokturk_text ||
        json?.old_turkic_runes ||
        ""
      ).trim() || translitToRunes(finalLatin);
    }
  } catch {}

  setTopOutput(finalRunes, finalLatin);
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
      showUiModal("Ataların Dili dönüşümü için jeton gerekiyor.");
      return;
    }
  }

  setHelpers("Eski Türkçe hazır", "Konuşmak için mikrofona dokununuz.");
  speakNow();
}

async function speakNow() {
  const text = normalizeInput(lastLatin);
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
      return;
    }
  } catch {}

  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "tr-TR";
    u.rate = 0.88;
    u.pitch = 0.96;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
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
    listening = true;
    botMic.classList.add("listening");
    setHelpers("Hazır", "Konuşuyorsunuz...");
  };

  rec.onresult = (e) => {
    let finalText = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const txt = e.results[i][0]?.transcript || "";
      if (e.results[i].isFinal) finalText += txt + " ";
    }

    if (finalText.trim()) {
      sourceText = normalizeInput(sourceText + " " + finalText.trim());
      setBottomMessage(sourceText);
      transformNow();
    }
  };

  rec.onerror = () => {
    listening = false;
    botMic.classList.remove("listening");
    setHelpers("Hazır", "Mikrofon başlatılamadı", true);
  };

  rec.onend = () => {
    listening = false;
    botMic.classList.remove("listening");
    setHelpers("Hazır", "Konuşmak için mikrofona dokununuz.");
  };

  return rec;
}

botMic?.addEventListener("click", () => {
  if (!recognizer) recognizer = initRecognition();
  if (!recognizer) return;

  if (listening) {
    try { recognizer.stop(); } catch {}
    return;
  }

  try {
    recognizer.start();
  } catch {}
});

clearBtn?.addEventListener("click", () => {
  sourceText = "";
  lastLatin = "";
  stopAudio();
  setBottomMessage("Henüz konuşma alınmadı.");
  setTopOutput("𐱅𐰇𐰼𐰰 𐰖𐰀𐰔𐰃𐰽𐰃", "türük bitig");
  setHelpers("Hazır", "Konuşmak için mikrofona dokununuz.");
});

homeLink?.addEventListener("click", () => {
  location.href = "/pages/home.html";
});

async function init() {
  setBottomMessage("Henüz konuşma alınmadı.");
  setTopOutput("𐱅𐰇𐰼𐰰 𐰖𐰀𐰔𐰃𐰽𐰃", "türük bitig");
  setHelpers("Hazır", "Konuşmak için mikrofona dokununuz.");
  await refreshHeaderTokens();
}

init();
