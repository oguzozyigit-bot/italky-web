// FILE: /js/hangman_page.js

import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";

const $ = (id) => document.getElementById(id);

/* -----------------------------
   UI SHELL
----------------------------- */
mountShell({ scroll: "none" });
try {
  const root = getComputedStyle(document.documentElement);
  const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
  document.documentElement.style.setProperty(
    "--shellLift",
    footerH ? `${footerH + 10}px` : "0px"
  );
} catch (e) {}

/* -----------------------------
   HELPERS
----------------------------- */
function qp(name) {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

function setGate(msg) {
  const el = $("gateInfo");
  if (el) el.textContent = msg;
}

function disableStartBtn(disabled = true, text = "BAŞLA") {
  const btn = $("realStartBtn");
  if (!btn) return;
  btn.disabled = disabled;
  btn.style.opacity = disabled ? "0.5" : "1";
  btn.style.pointerEvents = disabled ? "none" : "auto";
  btn.textContent = text;
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function normalizeLang(v) {
  return String(v || "").trim().toLowerCase();
}

function langTitle(code) {
  const c = normalizeLang(code);
  const map = {
    tr: "Türkçe",
    en: "English",
    de: "Deutsch",
    fr: "Français",
    es: "Español",
    it: "Italiano",
    pt: "Português",
    ar: "العربية",
    ru: "Русский",
    ja: "日本語",
    ko: "한국어",
    zh: "中文",
    el: "Ελληνικά"
  };
  return map[c] || c.toUpperCase();
}

function getGameAccessState() {
  const a = window.__ITALKY_ACCESS__ || {};

  const trialActive =
    a.trialActive === true ||
    a.trial_active === true ||
    Number(a.trialDaysLeft || 0) > 0 ||
    Number(a.trial_days_left || 0) > 0 ||
    Number(a.remainingTrialDays || 0) > 0 ||
    Number(a.remaining_trial_days || 0) > 0;

  const hasPackage =
    a.hasPackage === true ||
    a.has_package === true ||
    a.packageActive === true ||
    a.package_active === true ||
    a.isPremium === true ||
    a.premium === true;

  const educationActive =
    a.educationActive === true ||
    a.education_active === true ||
    a.packageType === "education" ||
    a.package_type === "education";

  const loaded =
    a.loaded === true ||
    a.ready === true ||
    a.accessLoaded === true ||
    a.access_loaded === true ||
    Object.keys(a).length > 0;

  return {
    loaded,
    allowed: trialActive || hasPackage || educationActive
  };
}

async function waitForAccessState(maxMs = 4000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const s = getGameAccessState();
    if (s.loaded) return s;
    await new Promise((r) => setTimeout(r, 120));
  }
  return getGameAccessState();
}

/* -----------------------------
   STATE
----------------------------- */
const GAME_LANG_KEY = "italky_hangman_lang";

let state = {
  lang: normalizeLang(qp("lang") || localStorage.getItem(GAME_LANG_KEY) || ""),
  pool: [],
  target: null,
  lastWord: null,
  lives: 3,
  MAX_LIVES: 9,
  totalScore: 0,
  roundScore: 100,
  guessed: new Set(),
  mistakes: 0,
  flawless: true,
  jokerUsed: false,
  lock: false,
  userId: "anon",
  availableLangs: [],
  accessOk: true
};

/* -----------------------------
   AUTH / ACCESS
----------------------------- */
async function bootSession() {
  const ok = await ensureAuthAndCacheUser();
  if (!ok) {
    location.replace("/pages/login.html");
    return false;
  }

  try {
    const { data } = await supabase.auth.getUser();
    state.userId = data?.user?.id || "anon";
  } catch {
    state.userId = "anon";
  }

  const access = await waitForAccessState();
  state.accessOk = !access.loaded || access.allowed;

  if (!state.accessOk) {
    setGate("OYUN ERİŞİMİ KAPALI");
    disableStartBtn(true, "KİLİTLİ");
    alert("Oyunlar trial süresince açık, paketlerde ise kullanılabilir.");
    location.href = "/pages/upgrade_pack.html";
    return false;
  }

  return true;
}

/* -----------------------------
   LANGUAGE PICKER
----------------------------- */
function ensureLanguageModal() {
  if (document.getElementById("hangmanLangModal")) return;

  const modal = document.createElement("div");
  modal.id = "hangmanLangModal";
  modal.style.cssText = `
    position:fixed;
    inset:0;
    z-index:70000;
    background:rgba(2,0,12,.94);
    display:none;
    align-items:center;
    justify-content:center;
    padding:22px;
    backdrop-filter:blur(8px);
  `;

  modal.innerHTML = `
    <div style="
      width:min(92vw,520px);
      border-radius:28px;
      border:1px solid rgba(255,255,255,.12);
      background:linear-gradient(180deg, rgba(20,20,34,.96), rgba(5,0,20,.96));
      box-shadow:0 20px 60px rgba(0,0,0,.45);
      padding:22px;
    ">
      <div style="
        font-family:'Space Grotesk',sans-serif;
        font-size:28px;
        font-weight:900;
        letter-spacing:2px;
        margin-bottom:8px;
      ">OYUN DİLİ</div>

      <div style="
        color:rgba(255,255,255,.72);
        font-size:14px;
        line-height:1.55;
        font-weight:700;
        margin-bottom:16px;
      ">
        İlk girişte oyun dilinizi seçin. Sonraki girişlerde oyun bu dille doğrudan açılır.
      </div>

      <select id="hangmanLangSelect" style="
        width:100%;
        height:58px;
        border-radius:18px;
        border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.05);
        color:#fff;
        padding:0 16px;
        font-size:17px;
        font-weight:900;
        margin-bottom:14px;
      "></select>

      <div style="display:flex; gap:10px;">
        <button id="hangmanLangCancel" type="button" style="
          flex:1;
          height:54px;
          border:none;
          border-radius:18px;
          background:rgba(255,255,255,.06);
          color:#fff;
          font-size:15px;
          font-weight:900;
          cursor:pointer;
        ">Vazgeç</button>

        <button id="hangmanLangSave" type="button" style="
          flex:1;
          height:54px;
          border:none;
          border-radius:18px;
          background:linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%);
          color:#fff;
          font-size:15px;
          font-weight:900;
          cursor:pointer;
        ">Devam Et</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function openLanguagePicker() {
  ensureLanguageModal();

  const modal = document.getElementById("hangmanLangModal");
  const select = document.getElementById("hangmanLangSelect");
  const btnSave = document.getElementById("hangmanLangSave");
  const btnCancel = document.getElementById("hangmanLangCancel");

  if (!modal || !select || !btnSave || !btnCancel) return Promise.resolve(null);

  select.innerHTML = state.availableLangs.map((code) => {
    return `<option value="${escapeHtml(code)}">${escapeHtml(langTitle(code))}</option>`;
  }).join("");

  if (state.lang && state.availableLangs.includes(state.lang)) {
    select.value = state.lang;
  }

  modal.style.display = "flex";

  return new Promise((resolve) => {
    const close = (val) => {
      modal.style.display = "none";
      btnSave.onclick = null;
      btnCancel.onclick = null;
      resolve(val);
    };

    btnCancel.onclick = () => close(null);
    btnSave.onclick = () => close(normalizeLang(select.value));
  });
}

/* -----------------------------
   DATA LOAD
----------------------------- */
async function loadAvailableLangs() {
  setGate("OYUN DİLLERİ HAZIRLANIYOR...");
  disableStartBtn(true, "YÜKLENİYOR...");

  const { data, error } = await supabase
    .from("game_content")
    .select("lang")
    .eq("game_key", "hangman")
    .eq("is_active", true);

  if (error) {
    console.error("game_content lang error:", error);
    setGate("Dil listesi alınamadı.");
    disableStartBtn(true, "HATA");
    return false;
  }

  const set = new Set();
  (Array.isArray(data) ? data : []).forEach((row) => {
    const l = normalizeLang(row?.lang);
    if (l) set.add(l);
  });

  state.availableLangs = [...set];

  if (!state.availableLangs.length) {
    setGate("Henüz oyun dili bulunamadı.");
    disableStartBtn(true, "HAZIR DEĞİL");
    return false;
  }

  if (!state.lang || !state.availableLangs.includes(state.lang)) {
    state.lang = "";
  }

  return true;
}

async function loadWordsForLang(langCode) {
  state.lang = normalizeLang(langCode);
  localStorage.setItem(GAME_LANG_KEY, state.lang);
  localStorage.setItem("italky_game_lang", state.lang);

  setGate(`${langTitle(state.lang)} yükleniyor...`);
  disableStartBtn(true, "YÜKLENİYOR...");

  const { data: words, error } = await supabase
    .from("game_content")
    .select("content")
    .eq("game_key", "hangman")
    .eq("lang", state.lang)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("game_content words error:", error);
    setGate("Kelime havuzu alınamadı.");
    disableStartBtn(true, "HATA");
    return false;
  }

  state.pool = Array.isArray(words)
    ? words
        .map((x) => ({
          w: String(x?.content?.word || "").trim(),
          tr: String(x?.content?.meaning || "").trim()
        }))
        .filter((x) => x.w)
    : [];

  const bestKey = state.lang;
  let best = 0;

  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("hangman_best")
      .eq("id", state.userId)
      .maybeSingle();

    const bestMap = prof?.hangman_best || {};
    if (bestMap && typeof bestMap === "object") {
      best = Number(bestMap[bestKey] || 0);
    }
  } catch (err) {
    console.error("best score read error:", err);
  }

  if ($("bestVal")) $("bestVal").textContent = String(best);

  if (!state.pool.length) {
    setGate(`${langTitle(state.lang)} için havuz boş.`);
    disableStartBtn(true, "HAZIR DEĞİL");
    return false;
  }

  setGate(`${langTitle(state.lang)} hazır • İstersen tekrar dil seçebilirsin`);
  disableStartBtn(false, "BAŞLA");
  return true;
}

async function updateBestScore(newScore) {
  try {
    if (state.userId === "anon") return;

    const key = state.lang;
    const { data: prof } = await supabase
      .from("profiles")
      .select("hangman_best")
      .eq("id", state.userId)
      .maybeSingle();

    let map = prof?.hangman_best || {};
    if (newScore > Number(map[key] || 0)) {
      map[key] = newScore;

      await supabase
        .from("profiles")
        .update({ hangman_best: map })
        .eq("id", state.userId);

      if ($("bestVal")) $("bestVal").textContent = String(newScore);
    }
  } catch (err) {
    console.error("updateBestScore failed:", err);
  }
}

/* -----------------------------
   GAME LOGIC
----------------------------- */
function pickWord() {
  if (!state.pool.length) return null;
  if (state.pool.length === 1) return state.pool[0];

  let tries = 0;
  let chosen = null;

  do {
    chosen = state.pool[Math.floor(Math.random() * state.pool.length)];
    tries++;
  } while (tries < 10 && chosen?.w === state.lastWord);

  return chosen;
}

function startRound() {
  if (!state.pool.length) return;

  state.lock = false;
  state.guessed.clear();
  state.mistakes = 0;
  state.roundScore = 100;
  state.flawless = true;
  state.jokerUsed = false;

  $("j0")?.classList.remove("spent");
  $("j1")?.classList.remove("spent");

  state.target = pickWord();

  if (!state.target?.w) {
    setGate("Kelime seçilemedi.");
    return;
  }

  state.lastWord = state.target.w;

  renderWord();
  renderKeyboard();
  renderHearts();
  resetMan();

  if ($("trText")) $("trText").textContent = String(state.target.tr || "—").toUpperCase();
  if ($("scoreVal")) $("scoreVal").textContent = String(state.totalScore);
}

function renderWord() {
  const w = String(state.target?.w || "").toUpperCase();
  if (!$("matrix")) return;

  $("matrix").innerHTML = w.split("").map((ch) => {
    const isLetter = /[A-Z]/.test(ch);
    const found = !isLetter || state.guessed.has(ch);

    return `
      <div class="slot ${found && isLetter ? "found" : ""}">
        ${found ? escapeHtml(ch) : ""}
      </div>
    `;
  }).join("");
}

function renderKeyboard() {
  if (!$("kb")) return;

  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  $("kb").innerHTML = abc.map((l) =>
    `<button class="key" id="key-${l}" data-l="${l}">${l}</button>`
  ).join("");

  $("kb").querySelectorAll(".key").forEach((btn) => {
    btn.onclick = () => makeGuess(btn.dataset.l);
  });
}

function makeGuess(l) {
  if (!state.target?.w) return;
  if (state.lock || state.guessed.has(l)) return;

  state.guessed.add(l);

  const btn = $(`key-${l}`);
  const w = String(state.target.w).toUpperCase();

  if (w.includes(l)) {
    btn?.classList.add("hit");
    renderWord();

    const completed = w
      .split("")
      .filter((ch) => /[A-Z]/.test(ch))
      .every((ch) => state.guessed.has(ch));

    if (completed) endRound(true);
  } else {
    btn?.classList.add("miss");
    state.mistakes++;
    state.flawless = false;
    state.roundScore = Math.max(0, state.roundScore - 15);
    updateMan(state.mistakes);

    if (state.mistakes >= 6) endRound(false);
  }
}

function updateMan(errs) {
  const seq = ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"];
  seq.forEach((id, i) => $(id)?.classList.toggle("on", i < errs));
  $("man")?.classList.toggle("swing", errs >= 6);
}

function resetMan() {
  ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"].forEach((id) => {
    $(id)?.classList.remove("on");
  });
  $("man")?.classList.remove("swing");
}

function renderHearts() {
  if (!$("hearts")) return;

  let html = "";
  for (let i = 0; i < state.lives; i++) {
    html += `<span class="heart">❤️</span>`;
  }
  $("hearts").innerHTML = html;
}

async function endRound(win) {
  state.lock = true;

  if (win) {
    state.totalScore += state.roundScore;
    if (state.flawless && !state.jokerUsed && state.lives < state.MAX_LIVES) {
      state.lives++;
    }
    await updateBestScore(state.totalScore);
  } else {
    state.lives--;
  }

  renderHearts();

  if ($("mTitle")) {
    $("mTitle").textContent = win ? "BAŞARILI!" : "MİSYON BAŞARISIZ";
    $("mTitle").style.color = win ? "var(--green)" : "var(--red)";
  }
  if ($("mWord")) $("mWord").textContent = String(state.target?.w || "").toUpperCase();
  if ($("mTr")) $("mTr").textContent = `(${state.target?.tr || "—"})`;
  $("modal")?.classList.add("on");
}

/* -----------------------------
   JOKERS
----------------------------- */
function useJ(i) {
  if (state.lock || !state.target?.w) return;

  const b = $(`j${i}`);
  if (!b || b.classList.contains("spent")) return;

  state.jokerUsed = true;
  b.classList.add("spent");
  state.roundScore = Math.max(0, state.roundScore - 20);

  const remaining = String(state.target.w)
    .toUpperCase()
    .split("")
    .filter((l) => /[A-Z]/.test(l) && !state.guessed.has(l));

  if (remaining.length > 0) {
    makeGuess(remaining[0]);
  }
}

$("j0") && ($("j0").onclick = () => useJ(0));
$("j1") && ($("j1").onclick = () => useJ(1));

$("mBtn") && ($("mBtn").onclick = () => {
  $("modal")?.classList.remove("on");

  if (state.lives > 0) {
    startRound();
  } else {
    const again = confirm(`Oyun bitti! Skor: ${state.totalScore}. Yeniden başla?`);
    if (again) {
      state.totalScore = 0;
      state.lives = 3;
      if ($("scoreVal")) $("scoreVal").textContent = "0";
      renderHearts();
      startRound();
    } else {
      location.href = "/pages/game_menu.html";
    }
  }
});

/* -----------------------------
   START FLOW
----------------------------- */
async function prepareLanguageAndData(forcePick = false) {
  const ok = await loadAvailableLangs();
  if (!ok) return false;

  if (forcePick || !state.lang) {
    const picked = await openLanguagePicker();
    if (!picked) {
      setGate("Önce oyun dilini seçmelisin.");
      disableStartBtn(true, "DİL SEÇ");
      return false;
    }
    state.lang = picked;
  }

  return await loadWordsForLang(state.lang);
}

$("realStartBtn") && ($("realStartBtn").onclick = async () => {
  if (!state.lang || !$("readyGate")?.dataset.ready) {
    const ok = await prepareLanguageAndData(true);
    if (!ok) return;
  }

  if (!state.pool.length) {
    alert("Bu dilde henüz oyun havuzu bulunamadı.");
    return;
  }

  if ($("readyGate")) $("readyGate").style.display = "none";
  startRound();
});

$("gateInfo")?.addEventListener("click", async () => {
  await prepareLanguageAndData(true);
  if ($("readyGate")) $("readyGate").dataset.ready = state.pool.length ? "1" : "";
});

/* -----------------------------
   BOOT
----------------------------- */
(async function boot() {
  const sessionOk = await bootSession();
  if (!sessionOk) return;

  renderHearts();
  if ($("scoreVal")) $("scoreVal").textContent = "0";

  setGate("OYUN DİLİ HAZIRLANIYOR...");
  disableStartBtn(true, "YÜKLENİYOR...");

  const ok = await prepareLanguageAndData(false);

  if (ok) {
    if ($("readyGate")) $("readyGate").dataset.ready = "1";
    disableStartBtn(false, "BAŞLA");
  } else {
    disableStartBtn(false, "DİL SEÇ");
  }
})();
