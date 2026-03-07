// FILE: /js/facetoface_page.js
import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const BCP = {
  tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", it: "it-IT", es: "es-ES",
  ru: "ru-RU", el: "el-GR", az: "az-AZ", ka: "ka-GE"
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
      bcp: BCP[code] || "en-US"
    };
  })
  .filter(Boolean);

function langObj(code) {
  const c = canonical(code);
  return LANGS.find((x) => x.code === c) || {
    code: c,
    flag: "🌐",
    name: c.toUpperCase(),
    bcp: BCP[c] || "en-US"
  };
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

// UI
const topBody = $("topBody");
const botBody = $("botBody");
const topMic = $("topMic");
const botMic = $("botMic");

const topLangBtn = $("topLangBtn");
const botLangBtn = $("botLangBtn");
const topLangTxt = $("topLangTxt");
const botLangTxt = $("botLangTxt");

const popTop = $("pop-top");
const popBot = $("pop-bot");
const listTop = $("list-top");
const listBot = $("list-bot");
const closeTop = $("close-top");
const closeBot = $("close-bot");

const clearBtn = $("clearBtn");
const homeLink = $("homeLink");
const homeBtn = $("homeBtn");

let topLang = "en";
let botLang = "tr";
let ttsDebounceAt = 0;

function refreshLangLabels() {
  if (topLangTxt) topLangTxt.textContent = labelChip(topLang);
  if (botLangTxt) botLangTxt.textContent = labelChip(botLang);
}

function closeAllPop() {
  popTop?.classList.remove("show");
  popBot?.classList.remove("show");
}

function setFrameListening(on) {
  const root = $("frameRoot");
  if (root) root.classList.toggle("listening", !!on);
}

function stopAudio() {
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

function speak(text, langCode) {
  const t = String(text || "").trim();
  if (!t) return;

  const now = Date.now();
  if (now - ttsDebounceAt < 250) stopAudio();
  ttsDebounceAt = now;

  stopAudio();

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(t, canonical(langCode));
      return;
    } catch {}
  }

  if (!window.speechSynthesis) return;

  const u = new SpeechSynthesisUtterance(t);
  u.lang = langObj(langCode).bcp;
  u.rate = 1;
  u.pitch = 1;
  u.volume = 1;

  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch {}
  }, 60);
}

function addBubble(side, kind, text, opts = {}) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}` + (opts.latest ? " is-latest" : "");

  if (kind === "me") {
    const spk = document.createElement("div");
    spk.className = "spk-icon";
    spk.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 10v4h4l5 4V6L7 10H3"></path>
        <path d="M16 8a4 4 0 0 1 0 8"></path>
        <path d="M19 5a8 8 0 0 1 0 14"></path>
      </svg>
    `;
    spk.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const txt = row.querySelector(".txt")?.textContent || "";
      speak(txt, opts.speakLang || "en");
    });
    row.appendChild(spk);
  }

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();
  row.appendChild(txt);

  wrap.appendChild(row);
  try { wrap.scrollTop = wrap.scrollHeight; } catch {}
  return row;
}

function clearLatest(side) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((x) => {
    x.classList.remove("is-latest");
  });
}

function renderPop(side) {
  const list = side === "top" ? listTop : listBot;
  const sel = side === "top" ? topLang : botLang;
  if (!list) return;

  list.innerHTML = LANGS.map((l) => {
    const active = canonical(l.code) === canonical(sel) ? "active" : "";
    return `
      <div class="pop-item ${active}" data-code="${canonical(l.code)}">
        <div class="pop-left">
          <div class="pop-flag">${l.flag}</div>
          <div class="pop-name">${l.name}</div>
        </div>
        <div class="pop-code">${canonical(l.code).toUpperCase()}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      const code = el.getAttribute("data-code") || "en";
      if (side === "top") topLang = code;
      else botLang = code;
      refreshLangLabels();
      closeAllPop();
    });
  });
}

async function translateText(text, from, to) {
  const t = String(text || "").trim();
  if (!t) return "";
  const src = canonical(from);
  const dst = canonical(to);
  if (src === dst) return t;

  try {
    const r = await fetch(`${API_BASE}/api/translate_ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: t,
        from_lang: src,
        to_lang: dst
      })
    });

    if (!r.ok) {
      console.error("translate_ai failed", r.status);
      return null;
    }

    const j = await r.json().catch(() => null);
    return String(j?.translated || "").trim() || null;
  } catch (e) {
    console.error("translate_ai error", e);
    return null;
  }
}

function getRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = langObj(langCode).bcp;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

async function speechToText(langCode) {
  return new Promise((resolve) => {
    const rec = getRecognizer(langCode);
    if (!rec) return resolve(null);

    let done = false;

    const finish = (val) => {
      if (done) return;
      done = true;
      try { rec.stop?.(); } catch {}
      resolve(val);
    };

    rec.onresult = (e) => {
      const t = e.results?.[0]?.[0]?.transcript || "";
      finish(String(t || "").trim() || null);
    };

    rec.onerror = () => finish(null);
    rec.onend = () => { if (!done) finish(null); };

    try {
      rec.start();
      setTimeout(() => finish(null), 8000);
    } catch {
      finish(null);
    }
  });
}

async function handleInput(side) {
  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const other = side === "top" ? "bot" : "top";

  setFrameListening(true);

  try {
    let text = await speechToText(src);

    if (!text) {
      const raw = prompt(`${langObj(src).name} yazın → ${langObj(dst).name} çevrilecek:`) || "";
      text = String(raw).trim() || null;
    }

    if (!text) return;

    addBubble(side, "them", text);

    const tr = await translateText(text, src, dst);
    clearLatest(other);

    if (!tr) {
      addBubble(
        other,
        "me",
        "⚠️ Çeviri servisine ulaşılamadı.",
        { latest: true, speakLang: dst }
      );
      return;
    }

    addBubble(other, "me", tr, { latest: true, speakLang: dst });
    speak(tr, dst);
  } finally {
    setFrameListening(false);
  }
}

function bind() {
  refreshLangLabels();

  topLangBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderPop("top");
    popTop?.classList.add("show");
  });

  botLangBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderPop("bot");
    popBot?.classList.add("show");
  });

  closeTop?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  closeBot?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  document.addEventListener("click", (e) => {
    const inside = (popTop && popTop.contains(e.target)) || (popBot && popBot.contains(e.target));
    const isBtn = e.target?.closest?.("#topLangBtn,#botLangBtn");
    if (!inside && !isBtn) closeAllPop();
  }, { capture: true });

  clearBtn?.addEventListener("click", () => {
    stopAudio();
    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";
  });

  homeLink?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  homeBtn?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  topMic?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleInput("top");
  });

  botMic?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleInput("bot");
  });
}

bind();
