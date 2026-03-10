import { LANG_POOL } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const BCP = {
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

const STORAGE = {
  TOP_LANG: "italky_f2f_top_lang",
  BOT_LANG: "italky_f2f_bot_lang",
};

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : [])
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;
    return {
      code,
      flag: l.flag || "🌐",
      name: l.name || code.toUpperCase(),
      bcp: BCP[code] || "en-US",
    };
  })
  .filter(Boolean);

function langObj(code) {
  const c = canonical(code);
  return (
    LANGS.find((x) => x.code === c) || {
      code: c || "en",
      flag: "🌐",
      name: (c || "en").toUpperCase(),
      bcp: BCP[c] || "en-US",
    }
  );
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const dom = {
  root: $("frameRoot"),

  topBody: $("topBody"),
  botBody: $("botBody"),

  topMic: $("topMic"),
  botMic: $("botMic"),

  topHelper: $("topHelper"),
  botHelper: $("botHelper"),

  clearBtn: $("clearBtn"),
  homeLink: $("homeLink"),
  homeBtn: $("homeBtn"),
  statusPill: $("statusPill"),

  topLangBtn: $("topLangBtn"),
  botLangBtn: $("botLangBtn"),
  topLangTxt: $("topLangTxt"),
  botLangTxt: $("botLangTxt"),

  popTop: $("pop-top"),
  popBot: $("pop-bot"),
  listTop: $("list-top"),
  listBot: $("list-bot"),
  closeTop: $("close-top"),
  closeBot: $("close-bot"),
};

const state = {
  recognition: null,
  listening: false,
  starting: false,
  activeSide: null,
  finalText: "",
  interimText: "",
  topLang: localStorage.getItem(STORAGE.TOP_LANG) || "en",
  botLang: localStorage.getItem(STORAGE.BOT_LANG) || "tr",
  voicesReady: false,
  audioUnlocked: false,
  voiceProfile: null,
  voiceReady: false,
};

function setRootMode(mode) {
  if (!dom.root) return;
  dom.root.classList.remove(
    "is-idle",
    "is-ready",
    "is-listening",
    "is-translating",
    "is-error"
  );
  dom.root.classList.add(mode);
}

function setStatus(text = "") {
  if (dom.statusPill) dom.statusPill.textContent = text;
}

function setHelper(side, text, type = "ready") {
  const el = side === "top" ? dom.topHelper : dom.botHelper;
  if (!el) return;
  el.textContent = text || "";
  el.classList.remove("helper-ready", "helper-wait", "helper-repeat");
  if (type === "ready") el.classList.add("helper-ready");
  if (type === "wait") el.classList.add("helper-wait");
  if (type === "repeat") el.classList.add("helper-repeat");
}

function setBothHelpers(topText, topType, botText, botType) {
  setHelper("top", topText, topType);
  setHelper("bot", botText, botType);
}

function renderLangLabels() {
  if (dom.topLangTxt) dom.topLangTxt.textContent = labelChip(state.topLang);
  if (dom.botLangTxt) dom.botLangTxt.textContent = labelChip(state.botLang);
}

function persistLangs() {
  localStorage.setItem(STORAGE.TOP_LANG, canonical(state.topLang));
  localStorage.setItem(STORAGE.BOT_LANG, canonical(state.botLang));
  renderLangLabels();
}

function speakerSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 5L6 9H3v6h3l5 4V5Z"></path>
      <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
      <path d="M17.5 6a8 8 0 0 1 0 12"></path>
    </svg>
  `;
}

function createBubble(text, type, langCode, latest = false) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${type}${latest ? " is-latest" : ""}`;

  const row = document.createElement("div");
  row.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.innerHTML = escapeHtml(text);

  const spk = document.createElement("button");
  spk.className = "spk-icon";
  spk.type = "button";
  spk.innerHTML = speakerSvg();
  spk.addEventListener("click", () => speakText(text, langCode));

  row.appendChild(txt);
  row.appendChild(spk);
  bubble.appendChild(row);
  return bubble;
}

function clearBodies() {
  if (dom.topBody) dom.topBody.innerHTML = "";
  if (dom.botBody) dom.botBody.innerHTML = "";
}

function setBodies(sourceSide, sourceText, translatedText) {
  clearBodies();

  if (sourceSide === "top") {
    if (dom.topBody) dom.topBody.appendChild(createBubble(sourceText, "me", state.topLang, true));
    if (dom.botBody) dom.botBody.appendChild(createBubble(translatedText, "me", state.botLang, true));
  } else {
    if (dom.botBody) dom.botBody.appendChild(createBubble(sourceText, "me", state.botLang, true));
    if (dom.topBody) dom.topBody.appendChild(createBubble(translatedText, "me", state.topLang, true));
  }
}

function showInterim(side, text) {
  const clean = String(text || "").trim();
  if (!clean) return;

  const body = side === "top" ? dom.topBody : dom.botBody;
  const lang = side === "top" ? state.topLang : state.botLang;
  if (!body) return;

  body.innerHTML = "";
  body.appendChild(createBubble(clean, "me", lang, true));
}

async function ensureMic() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Mikrofon desteği yok");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    stream.getTracks().forEach((t) => t.stop());
  } catch {}
}

async function translateText(text, sourceLang, targetLang) {
  const payload = {
    text: String(text || "").trim(),
    source: canonical(sourceLang),
    target: canonical(targetLang),
    mime_type: "text/plain",
  };

  const res = await fetch(`${API_BASE}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Translate HTTP ${res.status} ${err}`);
  }

  const data = await res.json().catch(() => ({}));
  return (
    data?.translated_text ||
    data?.translation ||
    data?.translated ||
    data?.target_text ||
    data?.result ||
    data?.text ||
    ""
  );
}

async function loadVoiceProfile() {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user?.id) {
      state.voiceProfile = null;
      state.voiceReady = true;
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.warn("voice profile alınamadı:", error);
      state.voiceProfile = null;
      state.voiceReady = true;
      return null;
    }

    state.voiceProfile = data || null;
    state.voiceReady = true;
    console.log("voiceProfile:", state.voiceProfile);
    return data || null;
  } catch (e) {
    console.warn("loadVoiceProfile hatası:", e);
    state.voiceProfile = null;
    state.voiceReady = true;
    return null;
  }
}

function resolveVoiceMode() {
  const vp = state.voiceProfile || {};

  const selectedVoice = String(
    vp.tts_voice || vp.voice_name || vp.voice_type || vp.voice || "free"
  ).trim().toLowerCase();

  const gender = String(
    vp.tts_gender || vp.voice_gender || vp.gender || "female"
  ).trim().toLowerCase();

  const plan = String(
    vp.tts_plan || vp.voice_plan || vp.plan || "free"
  ).trim().toLowerCase();

  const isPremium = !!(vp.is_premium || vp.premium || vp.pro_user);

  if (plan !== "free" && !isPremium) {
    return {
      mode: "free",
      gender: gender || "female",
      voice: "free",
    };
  }

  return {
    mode: plan || "free",
    gender: gender || "female",
    voice: selectedVoice || "free",
  };
}

function chooseBrowserVoiceByPreference(langCode, preferredGender = "female") {
  if (!window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const wanted = langObj(langCode).bcp.toLowerCase();
  const shortCode = canonical(langCode);

  const filtered = voices.filter((v) => {
    const lang = String(v.lang || "").toLowerCase();
    return lang === wanted || lang.startsWith(shortCode);
  });

  const pool = filtered.length ? filtered : voices;

  if (preferredGender === "female") {
    return (
      pool.find((v) =>
        /female|woman|zira|hazel|aria|seda|leyla|helena|salli/i.test(String(v.name || ""))
      ) ||
      pool[0] ||
      null
    );
  }

  if (preferredGender === "male") {
    return (
      pool.find((v) =>
        /male|man|matthew|joey|brian|david|ali|mert/i.test(String(v.name || ""))
      ) ||
      pool[0] ||
      null
    );
  }

  return pool[0] || null;
}

function unlockAudio() {
  if (state.audioUnlocked) return;
  if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) return;

  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
    window.speechSynthesis.cancel();
    state.audioUnlocked = true;
  } catch (e) {
    console.warn("TTS unlock başarısız:", e);
  }
}

function speakText(text, langCode) {
  const clean = String(text || "").trim();
  if (!clean) return;

  const voiceMode = resolveVoiceMode();

  if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
    console.warn("TTS desteklenmiyor");
    return;
  }

  try {
    window.speechSynthesis.cancel();
  } catch {}

  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = langObj(langCode).bcp;

  const voice = chooseBrowserVoiceByPreference(langCode, voiceMode.gender);
  if (voice) utter.voice = voice;

  utter.rate = 0.96;
  utter.pitch = voiceMode.gender === "female" ? 1.05 : 0.95;
  utter.volume = 1;

  utter.onstart = () => {
    console.log("TTS başladı:", {
      lang: utter.lang,
      selectedMode: voiceMode,
      browserVoice: voice?.name || "fallback",
    });
  };

  utter.onerror = (e) => {
    console.error("TTS hatası:", e);
  };

  const run = () => {
    try {
      window.speechSynthesis.speak(utter);
    } catch (err) {
      console.error("speech speak error:", err);
    }
  };

  if (!state.voicesReady) {
    setTimeout(run, 250);
    setTimeout(run, 800);
    return;
  }

  setTimeout(run, 180);
}

function bootVoices() {
  if (!("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;

  const markReady = () => {
    const voices = synth.getVoices() || [];
    if (voices.length) {
      state.voicesReady = true;
      console.log("TTS voice sayısı:", voices.length);
    }
  };

  try {
    markReady();
    setTimeout(markReady, 200);
    setTimeout(markReady, 800);
    setTimeout(markReady, 1500);
    synth.onvoiceschanged = () => markReady();
  } catch (e) {
    console.warn("bootVoices uyarı:", e);
  }
}

function hardResetMicUi() {
  dom.topMic?.classList.remove("listening", "recorded");
  dom.botMic?.classList.remove("listening", "recorded");
}

function stopListening({ keepHelpers = false } = {}) {
  try {
    state.recognition?.abort?.();
  } catch {}

  try {
    state.recognition?.stop?.();
  } catch {}

  state.listening = false;
  state.starting = false;
  state.activeSide = null;
  state.finalText = "";
  state.interimText = "";

  hardResetMicUi();
  setRootMode("is-ready");

  if (!keepHelpers) {
    setBothHelpers("Hazır", "ready", "Hazır", "ready");
  }
}

function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    state.starting = false;
    state.listening = true;

    hardResetMicUi();
    setRootMode("is-listening");

    if (state.activeSide === "top") {
      dom.topMic?.classList.add("listening");
      setHelper("top", "Dinliyorum...", "ready");
      setHelper("bot", "Çeviri bekleniyor...", "wait");
    } else if (state.activeSide === "bot") {
      dom.botMic?.classList.add("listening");
      setHelper("bot", "Dinliyorum...", "ready");
      setHelper("top", "Çeviri bekleniyor...", "wait");
    }
  };

  rec.onerror = (e) => {
    console.error("speech error:", e);

    state.listening = false;
    state.starting = false;

    hardResetMicUi();
    setRootMode("is-error");

    const code = String(e?.error || "");

    if (state.activeSide === "top") {
      setHelper("top", code === "not-allowed" ? "Mikrofon izni verilmedi" : "Konuşma algılanamadı", "wait");
      setHelper("bot", "Beklemede", "wait");
    } else if (state.activeSide === "bot") {
      setHelper("bot", code === "not-allowed" ? "Mikrofon izni verilmedi" : "Konuşma algılanamadı", "wait");
      setHelper("top", "Beklemede", "wait");
    }
  };

  rec.onend = async () => {
    state.listening = false;
    state.starting = false;

    hardResetMicUi();

    const finalText = String(state.finalText || "").trim();
    const side = state.activeSide;

    if (!finalText || !side) {
      setRootMode("is-ready");
      setBothHelpers("Hazır", "ready", "Hazır", "ready");
      return;
    }

    setRootMode("is-translating");

    try {
      const sourceLang = side === "top" ? state.topLang : state.botLang;
      const targetLang = side === "top" ? state.botLang : state.topLang;

      if (side === "top") {
        setHelper("top", "Algılandı", "repeat");
        setHelper("bot", "Çeviri yapılıyor...", "wait");
      } else {
        setHelper("bot", "Algılandı", "repeat");
        setHelper("top", "Çeviri yapılıyor...", "wait");
      }

      const translated = await translateText(finalText, sourceLang, targetLang);
      setBodies(side, finalText, translated);

      if (side === "top") {
        dom.topMic?.classList.add("recorded");
        setHelper("top", "Tekrar konuşabilirsiniz", "repeat");
        setHelper("bot", "Çeviri hazır", "ready");
      } else {
        dom.botMic?.classList.add("recorded");
        setHelper("bot", "Tekrar konuşabilirsiniz", "repeat");
        setHelper("top", "Çeviri hazır", "ready");
      }

      setTimeout(() => speakText(translated, targetLang), 180);
      setRootMode("is-ready");
    } catch (err) {
      console.error("translate error:", err);
      setRootMode("is-error");

      if (side === "top") {
        setHelper("top", "Metin alındı", "repeat");
        setHelper("bot", "Çeviri oluşmadı", "wait");
      } else {
        setHelper("bot", "Metin alındı", "repeat");
        setHelper("top", "Çeviri oluşmadı", "wait");
      }
    } finally {
      state.finalText = "";
      state.interimText = "";
      state.activeSide = null;
    }
  };

  rec.onresult = (event) => {
    let interim = "";
    let finalTxt = state.finalText || "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      const t = String(r?.[0]?.transcript || "").trim();
      if (!t) continue;

      if (r.isFinal) finalTxt = `${finalTxt} ${t}`.trim();
      else interim = `${interim} ${t}`.trim();
    }

    state.finalText = finalTxt;
    state.interimText = interim;

    const live = [state.finalText, state.interimText].filter(Boolean).join(" ").trim();
    if (live && state.activeSide) showInterim(state.activeSide, live);
  };

  return rec;
}

async function startListening(side) {
  if (state.starting) return;

  const sameSideRunning = state.listening && state.activeSide === side;
  if (sameSideRunning) {
    stopListening({ keepHelpers: true });
    setHelper(side, "Durduruldu", "wait");
    return;
  }

  if (state.listening || state.starting) {
    stopListening({ keepHelpers: true });
    await new Promise((r) => setTimeout(r, 250));
  }

  state.starting = true;

  try {
    await ensureMic();
  } catch (e) {
    console.error("mic error:", e);
    state.starting = false;
    setRootMode("is-error");
    setHelper(side, "Mikrofon izni gerekli", "wait");
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    state.starting = false;
    setRootMode("is-error");
    setHelper(side, "Bu cihazda canlı konuşma yok", "wait");
    return;
  }

  if (!state.recognition) {
    state.recognition = createRecognition();
  }

  state.activeSide = side;
  state.finalText = "";
  state.interimText = "";

  state.recognition.lang = langObj(side === "top" ? state.topLang : state.botLang).bcp;

  try {
    state.recognition.start();
  } catch (e) {
    console.error("recognition start:", e);

    if (String(e?.name || "").includes("InvalidStateError")) {
      try {
        state.recognition.abort?.();
      } catch {}

      setTimeout(() => {
        try {
          state.recognition.lang = langObj(side === "top" ? state.topLang : state.botLang).bcp;
          state.recognition.start();
        } catch (err2) {
          console.error("recognition restart failed:", err2);
          state.starting = false;
          setRootMode("is-error");
          setHelper(side, "Mikrofon yeniden başlatılamadı", "wait");
        }
      }, 300);
      return;
    }

    state.starting = false;
    setRootMode("is-error");
    setHelper(side, "Başlatılamadı", "wait");
  }
}

function clearAll() {
  stopListening();
  clearBodies();
  setBothHelpers("Hazır", "ready", "Hazır", "ready");
}

function openPop(which) {
  if (which === "top") dom.popTop?.classList.add("show");
  if (which === "bot") dom.popBot?.classList.add("show");
}

function closePop(which) {
  if (which === "top") dom.popTop?.classList.remove("show");
  if (which === "bot") dom.popBot?.classList.remove("show");
}

function renderPopList(which) {
  const list = which === "top" ? dom.listTop : dom.listBot;
  const current = which === "top" ? state.topLang : state.botLang;
  if (!list) return;

  list.innerHTML = "";

  LANGS.forEach((l) => {
    const row = document.createElement("div");
    row.className = `pop-item${canonical(current) === l.code ? " active" : ""}`;

    row.innerHTML = `
      <div class="pop-left">
        <div class="pop-flag">${l.flag}</div>
        <div class="pop-name">${escapeHtml(l.name)}</div>
      </div>
      <div class="pop-code">${escapeHtml(l.code.toUpperCase())}</div>
    `;

    row.addEventListener("click", () => {
      if (which === "top") state.topLang = l.code;
      else state.botLang = l.code;
      persistLangs();
      renderPopList(which);
      closePop(which);
    });

    list.appendChild(row);
  });
}

function bindEvents() {
  dom.topMic?.addEventListener("click", () => {
    unlockAudio();
    startListening("top");
  });

  dom.botMic?.addEventListener("click", () => {
    unlockAudio();
    startListening("bot");
  });

  dom.topMic?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      unlockAudio();
      startListening("top");
    }
  });

  dom.botMic?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      unlockAudio();
      startListening("bot");
    }
  });

  dom.clearBtn?.addEventListener("click", clearAll);

  dom.homeLink?.addEventListener("click", () => {
    window.location.href = "/";
  });

  dom.homeBtn?.addEventListener("click", () => {
    window.location.href = "/";
  });

  dom.topLangBtn?.addEventListener("click", () => {
    renderPopList("top");
    openPop("top");
  });

  dom.botLangBtn?.addEventListener("click", () => {
    renderPopList("bot");
    openPop("bot");
  });

  dom.closeTop?.addEventListener("click", () => closePop("top"));
  dom.closeBot?.addEventListener("click", () => closePop("bot"));

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    if (dom.popTop?.classList.contains("show") && !dom.popTop.contains(t) && !dom.topLangBtn?.contains(t)) {
      closePop("top");
    }

    if (dom.popBot?.classList.contains("show") && !dom.popBot.contains(t) && !dom.botLangBtn?.contains(t)) {
      closePop("bot");
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopListening();
  });

  window.addEventListener("beforeunload", () => stopListening());
}

async function init() {
  renderLangLabels();
  renderPopList("top");
  renderPopList("bot");
  bindEvents();
  bootVoices();
  await loadVoiceProfile();

  setRootMode("is-ready");
  setBothHelpers("Hazır", "ready", "Hazır", "ready");
  setStatus("Hazır");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
