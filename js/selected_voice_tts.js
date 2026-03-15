// FILE: /js/selected_voice_tts.js

const API_BASE = "https://italky-api.onrender.com/api";

const VOICE_KEY = "tts_voice";
const LEGACY_KEY = "live_interpreter_voice";

const BCP_MAP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ru: "ru-RU",
  el: "el-GR",
  az: "az-AZ",
  ka: "ka-GE",
};

function canonicalLang(code = "tr") {
  return String(code || "tr").toLowerCase().split("-")[0].trim();
}

function toBCP(code = "tr") {
  const c = canonicalLang(code);
  return BCP_MAP[c] || "tr-TR";
}

export function getSelectedVoiceMode() {
  const v =
    localStorage.getItem(VOICE_KEY) ||
    localStorage.getItem(LEGACY_KEY) ||
    "auto";

  const norm = String(v || "auto").toLowerCase().trim();

  if (norm === "female" || norm === "male" || norm === "clone") return norm;
  return "auto";
}

function loadVoices() {
  return new Promise((resolve) => {
    let voices = speechSynthesis.getVoices();
    if (voices && voices.length) {
      resolve(voices);
      return;
    }

    const done = () => {
      voices = speechSynthesis.getVoices();
      resolve(voices || []);
    };

    speechSynthesis.onvoiceschanged = done;
    setTimeout(done, 700);
  });
}

function scoreVoice(voice, langBCP, mode) {
  const name = String(voice?.name || "").toLowerCase();
  const lang = String(voice?.lang || "").toLowerCase();
  const want = String(langBCP || "").toLowerCase();

  let score = 0;

  if (lang === want) score += 100;
  else if (lang.startsWith(want.split("-")[0])) score += 70;

  if (mode === "female") {
    if (
      name.includes("female") ||
      name.includes("woman") ||
      name.includes("zira") ||
      name.includes("seda") ||
      name.includes("selin")
    ) score += 35;
  }

  if (mode === "male") {
    if (
      name.includes("male") ||
      name.includes("man") ||
      name.includes("david") ||
      name.includes("murat") ||
      name.includes("cem")
    ) score += 35;
  }

  if (voice?.default) score += 8;

  return score;
}

async function chooseBestBrowserVoice(langCode = "tr", mode = "auto") {
  const voices = await loadVoices();
  if (!voices || !voices.length) return null;

  const langBCP = toBCP(langCode);

  let ranked = [...voices].map((v) => ({
    voice: v,
    score: scoreVoice(v, langBCP, mode),
  }));

  ranked.sort((a, b) => b.score - a.score);

  return ranked[0]?.voice || null;
}

function speakWithBrowser(text, langCode = "tr", mode = "auto") {
  return new Promise(async (resolve) => {
    try {
      if (!("speechSynthesis" in window)) {
        resolve(false);
        return;
      }

      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(String(text || "").trim());
      utter.lang = toBCP(langCode);

      const selected = await chooseBestBrowserVoice(langCode, mode);
      if (selected) utter.voice = selected;

      utter.onend = () => resolve(true);
      utter.onerror = () => resolve(false);

      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utter);
        } catch {
          resolve(false);
        }
      }, 60);
    } catch {
      resolve(false);
    }
  });
}

async function speakWithBackendClone(text, langCode = "tr") {
  try {
    const res = await fetch(`${API_BASE}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: String(text || "").trim(),
        lang: canonicalLang(langCode),
        voice_mode: "clone"
      })
    });

    if (!res.ok) return false;

    const blob = await res.blob();
    if (!blob || !blob.size) return false;

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    await audio.play().catch(() => false);

    audio.onended = () => {
      try { URL.revokeObjectURL(audioUrl); } catch {}
    };

    return true;
  } catch {
    return false;
  }
}

export async function speakSelectedVoice(text, langCode = "tr") {
  const clean = String(text || "").trim();
  if (!clean) return false;

  const mode = getSelectedVoiceMode();

  // clone seçiliyse önce backend dene
  if (mode === "clone") {
    const cloneOk = await speakWithBackendClone(clean, langCode);
    if (cloneOk) return true;

    // clone yoksa sessiz kalmasın
    return await speakWithBrowser(clean, langCode, "auto");
  }

  return await speakWithBrowser(clean, langCode, mode);
}
