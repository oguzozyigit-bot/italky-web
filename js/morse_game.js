import { mountShell } from "/js/ui_shell.js";

try {
  mountShell({ scroll: "auto" });
} catch (err) {
  console.warn("ui_shell mount skipped:", err);
}

const $ = (id) => document.getElementById(id);

/* =========================================================
   DOM
========================================================= */
const stepLang = $("stepLang");
const stepRules = $("stepRules");
const stepDifficulty = $("stepDifficulty");
const stepGame = $("stepGame");

const panelLanguage = $("panelLanguage");
const panelRules = $("panelRules");
const panelDifficulty = $("panelDifficulty");
const panelGame = $("panelGame");

const languageGrid = $("languageGrid");
const difficultyGrid = $("difficultyGrid");

const btnGoRules = $("btnGoRules");
const btnBackToLang = $("btnBackToLang");
const btnGoDifficulty = $("btnGoDifficulty");
const btnBackToRules = $("btnBackToRules");
const btnStartGame = $("btnStartGame");

const statLang = $("statLang");
const statDifficulty = $("statDifficulty");
const statRound = $("statRound");
const statScore = $("statScore");
const gameInfoText = $("gameInfoText");

const morseCode = $("morseCode");
const answerInput = $("answerInput");
const btnReplayAudio = $("btnReplayAudio");
const btnShowHint = $("btnShowHint");
const btnShowMeaning = $("btnShowMeaning");
const btnCheck = $("btnCheck");
const btnSkip = $("btnSkip");

const hintBox = $("hintBox");
const meaningBox = $("meaningBox");
const hintText = $("hintText");
const meaningText = $("meaningText");
const feedbackText = $("feedbackText");

const finalBox = $("finalBox");
const finalText = $("finalText");
const btnRestart = $("btnRestart");
const btnBackToStart = $("btnBackToStart");

/* =========================================================
   GAME META
========================================================= */
const TOTAL_ROUNDS = 10;

const LANG_OPTIONS = [
  {
    code: "en",
    flag: "🇬🇧",
    title: "English",
    desc: "En bilinen temel kelimelerle başlamak için iyi seçim.",
    badge: "Başlangıç için iyi"
  },
  {
    code: "de",
    flag: "🇩🇪",
    title: "Deutsch",
    desc: "Biraz daha sert görünüp aslında düzenli ilerleyen kelimeler.",
    badge: "Pratik"
  },
  {
    code: "fr",
    flag: "🇫🇷",
    title: "Français",
    desc: "Yazımı estetik, Mors karşılığı da gayet eğlenceli.",
    badge: "Şık seçim"
  },
  {
    code: "it",
    flag: "🇮🇹",
    title: "Italiano",
    desc: "Kısa ve tanıdık kelimelerle rahat başlangıç sağlar.",
    badge: "Akıcı"
  },
  {
    code: "es",
    flag: "🇪🇸",
    title: "Español",
    desc: "Tanıdık kelimeler ve hızlı tahmin hissi için güzel seçenek.",
    badge: "Popüler"
  }
];

const DIFFICULTIES = [
  {
    code: "easy",
    title: "Kolay",
    desc: "Kısa ve daha tanıdık kelimeler gelir. Yeni başlayanlar için ideal.",
    badge: "3-5 harf",
    minLen: 3,
    maxLen: 5
  },
  {
    code: "medium",
    title: "Orta",
    desc: "Karışım mod. Ne çok kolay ne çok zor; tam karar veremeyenlerin klasiği.",
    badge: "4-7 harf",
    minLen: 4,
    maxLen: 7
  },
  {
    code: "hard",
    title: "Zor",
    desc: "Daha uzun kelimeler ve daha yoğun Mors dizileri gelir.",
    badge: "6-10 harf",
    minLen: 6,
    maxLen: 10
  }
];

/* =========================================================
   MORSE MAP
========================================================= */
const MORSE = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----."
};

/* =========================================================
   WORD POOLS
   Türkçe havuz yok. Türkçe sadece ipucu/anlam tarafında.
========================================================= */
const WORDS = {
  en: [
    { word: "HELLO", tr: "Merhaba", hint: "Selamlaşma kelimesi" },
    { word: "WORLD", tr: "Dünya", hint: "Yaşadığımız gezegen" },
    { word: "BOOK", tr: "Kitap", hint: "Okunur, sayfaları vardır" },
    { word: "WATER", tr: "Su", hint: "Hayat için vazgeçilmez içecek" },
    { word: "APPLE", tr: "Elma", hint: "Meyve, kırmızı veya yeşil olabilir" },
    { word: "BREAD", tr: "Ekmek", hint: "Sofrada sık görülür" },
    { word: "HOUSE", tr: "Ev", hint: "İçinde yaşanır" },
    { word: "SMILE", tr: "Gülümse", hint: "Yüz ifadesi" },
    { word: "LIGHT", tr: "Işık", hint: "Karanlığı giderir" },
    { word: "TRAIN", tr: "Tren", hint: "Rayda gider" },
    { word: "PHONE", tr: "Telefon", hint: "Arama yapılır" },
    { word: "SCHOOL", tr: "Okul", hint: "Ders yapılan yer" },
    { word: "MARKET", tr: "Market", hint: "Alışveriş yapılan yer" },
    { word: "FAMILY", tr: "Aile", hint: "Yakın bağ kurulan insanlar" },
    { word: "FRIEND", tr: "Arkadaş", hint: "Dostça ilişki" },
    { word: "MUSIC", tr: "Müzik", hint: "Dinlenir" },
    { word: "GARDEN", tr: "Bahçe", hint: "Bitkilerin olduğu alan" },
    { word: "ORANGE", tr: "Portakal", hint: "Turuncu meyve" },
    { word: "BUTTON", tr: "Buton", hint: "Basılır" },
    { word: "ROCKET", tr: "Roket", hint: "Uzaya gider" }
  ],

  de: [
    { word: "HALLO", tr: "Merhaba", hint: "Selamlaşma kelimesi" },
    { word: "WELT", tr: "Dünya", hint: "Yaşadığımız gezegen" },
    { word: "WASSER", tr: "Su", hint: "İçilir" },
    { word: "BROT", tr: "Ekmek", hint: "Fırından alınabilir" },
    { word: "HAUS", tr: "Ev", hint: "İçinde yaşanır" },
    { word: "BUCH", tr: "Kitap", hint: "Okunur" },
    { word: "SCHULE", tr: "Okul", hint: "Ders yapılan yer" },
    { word: "FAMILIE", tr: "Aile", hint: "Yakın bağ kurulan insanlar" },
    { word: "FREUND", tr: "Arkadaş", hint: "Dost" },
    { word: "MUSIK", tr: "Müzik", hint: "Dinlenir" },
    { word: "GARTEN", tr: "Bahçe", hint: "Çiçekler olabilir" },
    { word: "LICHT", tr: "Işık", hint: "Karanlığı dağıtır" },
    { word: "APFEL", tr: "Elma", hint: "Meyve" },
    { word: "MARKT", tr: "Pazar/Market", hint: "Alışveriş alanı" },
    { word: "ZUG", tr: "Tren", hint: "Rayda gider" },
    { word: "FENSTER", tr: "Pencere", hint: "Evde dışarıyı gösterir" },
    { word: "BLUME", tr: "Çiçek", hint: "Renkli olabilir" },
    { word: "SONNE", tr: "Güneş", hint: "Isı ve ışık kaynağı" },
    { word: "MOND", tr: "Ay", hint: "Gece gökte görünür" },
    { word: "STRASSE", tr: "Sokak", hint: "Üzerinden yürünür veya araç geçer" }
  ],

  fr: [
    { word: "BONJOUR", tr: "Merhaba", hint: "Gün içinde kullanılan selamlaşma" },
    { word: "MONDE", tr: "Dünya", hint: "Yaşadığımız gezegen" },
    { word: "LIVRE", tr: "Kitap", hint: "Okunur" },
    { word: "EAU", tr: "Su", hint: "İçilir" },
    { word: "POMME", tr: "Elma", hint: "Meyve" },
    { word: "MAISON", tr: "Ev", hint: "İçinde yaşanır" },
    { word: "ECOLE", tr: "Okul", hint: "Ders yapılan yer" },
    { word: "AMI", tr: "Arkadaş", hint: "Dostça ilişki" },
    { word: "MUSIQUE", tr: "Müzik", hint: "Dinlenir" },
    { word: "JARDIN", tr: "Bahçe", hint: "Bitkili alan" },
    { word: "LUMIERE", tr: "Işık", hint: "Karanlığı giderir" },
    { word: "TRAIN", tr: "Tren", hint: "Rayda gider" },
    { word: "FAMILLE", tr: "Aile", hint: "Yakın bağ" },
    { word: "ORANGE", tr: "Portakal", hint: "Turuncu meyve" },
    { word: "SOLEIL", tr: "Güneş", hint: "Gökyüzünde parlar" },
    { word: "LUNE", tr: "Ay", hint: "Gece görünür" },
    { word: "FLEUR", tr: "Çiçek", hint: "Renkli olabilir" },
    { word: "MARCHE", tr: "Pazar", hint: "Alışveriş alanı" },
    { word: "PORTE", tr: "Kapı", hint: "Açılır kapanır" },
    { word: "ROBOT", tr: "Robot", hint: "Mekanik/akıllı sistem" }
  ],

  it: [
    { word: "CIAO", tr: "Merhaba / Hoşça kal", hint: "Çok bilinen İtalyanca selam" },
    { word: "MONDO", tr: "Dünya", hint: "Yaşadığımız gezegen" },
    { word: "LIBRO", tr: "Kitap", hint: "Okunur" },
    { word: "ACQUA", tr: "Su", hint: "İçilir" },
    { word: "MELA", tr: "Elma", hint: "Meyve" },
    { word: "CASA", tr: "Ev", hint: "İçinde yaşanır" },
    { word: "SCUOLA", tr: "Okul", hint: "Ders yapılan yer" },
    { word: "AMICO", tr: "Arkadaş", hint: "Dost" },
    { word: "MUSICA", tr: "Müzik", hint: "Dinlenir" },
    { word: "GIARDINO", tr: "Bahçe", hint: "Bitkili alan" },
    { word: "LUCE", tr: "Işık", hint: "Karanlığı giderir" },
    { word: "TRENO", tr: "Tren", hint: "Rayda gider" },
    { word: "FAMIGLIA", tr: "Aile", hint: "Yakın bağ kurulan insanlar" },
    { word: "ARANCIA", tr: "Portakal", hint: "Turuncu meyve" },
    { word: "SOLE", tr: "Güneş", hint: "Işık ve ısı kaynağı" },
    { word: "LUNA", tr: "Ay", hint: "Gece görünür" },
    { word: "FIORE", tr: "Çiçek", hint: "Renkli olabilir" },
    { word: "PORTA", tr: "Kapı", hint: "Açılır kapanır" },
    { word: "STRADA", tr: "Yol / Sokak", hint: "Üzerinden gidilir" },
    { word: "ROBOT", tr: "Robot", hint: "Akıllı makine" }
  ],

  es: [
    { word: "HOLA", tr: "Merhaba", hint: "Selamlaşma kelimesi" },
    { word: "MUNDO", tr: "Dünya", hint: "Yaşadığımız gezegen" },
    { word: "LIBRO", tr: "Kitap", hint: "Okunur" },
    { word: "AGUA", tr: "Su", hint: "İçilir" },
    { word: "MANZANA", tr: "Elma", hint: "Meyve" },
    { word: "CASA", tr: "Ev", hint: "İçinde yaşanır" },
    { word: "ESCUELA", tr: "Okul", hint: "Ders yapılan yer" },
    { word: "AMIGO", tr: "Arkadaş", hint: "Dost" },
    { word: "MUSICA", tr: "Müzik", hint: "Dinlenir" },
    { word: "JARDIN", tr: "Bahçe", hint: "Bitkili alan" },
    { word: "LUZ", tr: "Işık", hint: "Karanlığı giderir" },
    { word: "TREN", tr: "Tren", hint: "Rayda gider" },
    { word: "FAMILIA", tr: "Aile", hint: "Yakın bağ" },
    { word: "NARANJA", tr: "Portakal", hint: "Turuncu meyve" },
    { word: "SOL", tr: "Güneş", hint: "Gökte parlar" },
    { word: "LUNA", tr: "Ay", hint: "Gece görünür" },
    { word: "FLOR", tr: "Çiçek", hint: "Renkli olabilir" },
    { word: "PUERTA", tr: "Kapı", hint: "Açılır kapanır" },
    { word: "CALLE", tr: "Sokak", hint: "Üzerinden yürünür" },
    { word: "ROBOT", tr: "Robot", hint: "Akıllı makine" }
  ]
};

/* =========================================================
   STATE
========================================================= */
const state = {
  language: null,
  difficulty: null,
  round: 1,
  score: 0,
  usedWords: [],
  currentItem: null,
  hintOpened: false,
  meaningOpened: false,
  audioBusy: false
};

/* =========================================================
   HELPERS
========================================================= */
function setStep(activeKey) {
  const map = {
    language: [stepLang, stepRules, stepDifficulty, stepGame],
    rules: [stepLang, stepRules, stepDifficulty, stepGame],
    difficulty: [stepLang, stepRules, stepDifficulty, stepGame],
    game: [stepLang, stepRules, stepDifficulty, stepGame]
  };

  [stepLang, stepRules, stepDifficulty, stepGame].forEach((el) => {
    el.classList.remove("active", "done");
  });

  if (activeKey === "language") {
    stepLang.classList.add("active");
  } else if (activeKey === "rules") {
    stepLang.classList.add("done");
    stepRules.classList.add("active");
  } else if (activeKey === "difficulty") {
    stepLang.classList.add("done");
    stepRules.classList.add("done");
    stepDifficulty.classList.add("active");
  } else if (activeKey === "game") {
    stepLang.classList.add("done");
    stepRules.classList.add("done");
    stepDifficulty.classList.add("done");
    stepGame.classList.add("active");
  }
}

function showPanel(name) {
  panelLanguage.classList.remove("active");
  panelRules.classList.remove("active");
  panelDifficulty.classList.remove("active");
  panelGame.classList.remove("active");

  if (name === "language") {
    panelLanguage.classList.add("active");
    setStep("language");
  } else if (name === "rules") {
    panelRules.classList.add("active");
    setStep("rules");
  } else if (name === "difficulty") {
    panelDifficulty.classList.add("active");
    setStep("difficulty");
  } else if (name === "game") {
    panelGame.classList.add("active");
    setStep("game");
  }
}

function normalizeWord(str) {
  return String(str || "")
    .toUpperCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/İ/g, "I")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U")
    .replace(/[^A-Z0-9]/g, "");
}

function toMorse(word) {
  return normalizeWord(word)
    .split("")
    .map((ch) => MORSE[ch] || "")
    .filter(Boolean)
    .join(" ");
}

function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getLanguageMeta(code) {
  return LANG_OPTIONS.find((x) => x.code === code) || null;
}

function getDifficultyMeta(code) {
  return DIFFICULTIES.find((x) => x.code === code) || null;
}

function setFeedback(text, type = "info") {
  feedbackText.textContent = text;
  feedbackText.className = `feedback ${type}`;
}

function resetHelpers() {
  state.hintOpened = false;
  state.meaningOpened = false;
  hintBox.classList.remove("show");
  meaningBox.classList.remove("show");
}

function updateTopStats() {
  const langMeta = getLanguageMeta(state.language);
  const diffMeta = getDifficultyMeta(state.difficulty);

  statLang.textContent = langMeta ? langMeta.title : "-";
  statDifficulty.textContent = diffMeta ? diffMeta.title : "-";
  statRound.textContent = state.round;
  statScore.textContent = String(state.score);
}

function updateGameHeaderText() {
  const langMeta = getLanguageMeta(state.language);
  const diffMeta = getDifficultyMeta(state.difficulty);

  gameInfoText.textContent =
    `Seçili dil: ${langMeta?.title || "-"} • ` +
    `Seviye: ${diffMeta?.title || "-"} • ` +
    `Türkçe ipucu desteği aktif.`;
}

/* =========================================================
   UI BUILD
========================================================= */
function buildLanguageCards() {
  languageGrid.innerHTML = "";

  LANG_OPTIONS.forEach((item) => {
    const div = document.createElement("button");
    div.type = "button";
    div.className = "opt";
    div.dataset.code = item.code;
    div.innerHTML = `
      <div class="opt-top">
        <div class="flag">${item.flag}</div>
        <div class="badge">${item.badge}</div>
      </div>
      <div class="opt-title">${item.title}</div>
      <div class="opt-desc">${item.desc}</div>
    `;

    div.addEventListener("click", () => {
      state.language = item.code;
      [...languageGrid.querySelectorAll(".opt")].forEach((el) => el.classList.remove("selected"));
      div.classList.add("selected");
      btnGoRules.disabled = false;
    });

    languageGrid.appendChild(div);
  });
}

function buildDifficultyCards() {
  difficultyGrid.innerHTML = "";

  DIFFICULTIES.forEach((item) => {
    const div = document.createElement("button");
    div.type = "button";
    div.className = "opt";
    div.dataset.code = item.code;
    div.innerHTML = `
      <div class="opt-top">
        <div class="flag">🎯</div>
        <div class="badge">${item.badge}</div>
      </div>
      <div class="opt-title">${item.title}</div>
      <div class="opt-desc">${item.desc}</div>
    `;

    div.addEventListener("click", () => {
      state.difficulty = item.code;
      [...difficultyGrid.querySelectorAll(".opt")].forEach((el) => el.classList.remove("selected"));
      div.classList.add("selected");
      btnStartGame.disabled = false;
    });

    difficultyGrid.appendChild(div);
  });
}

/* =========================================================
   WORD SELECTION
========================================================= */
function getFilteredPool() {
  const pool = WORDS[state.language] || [];
  const diff = getDifficultyMeta(state.difficulty);

  if (!diff) return pool;

  let filtered = pool.filter((item) => {
    const len = normalizeWord(item.word).length;
    return len >= diff.minLen && len <= diff.maxLen;
  });

  if (!filtered.length) filtered = pool.slice();
  return filtered;
}

function chooseNextWord() {
  const pool = getFilteredPool();
  const available = pool.filter((item) => !state.usedWords.includes(item.word));

  let next = null;

  if (available.length) {
    next = choice(available);
  } else {
    // havuz biterse tekrar kullan ama karışık gelsin
    next = choice(pool);
  }

  state.currentItem = next;
  if (!state.usedWords.includes(next.word)) {
    state.usedWords.push(next.word);
  }
}

/* =========================================================
   AUDIO: simple Web Audio Morse beeps
========================================================= */
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playTone(ms = 100, freq = 650, gainValue = 0.08) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch (_) {}
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = gainValue;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  await sleep(ms);
  osc.stop();
}

async function playMorseAudio(code) {
  if (state.audioBusy) return;
  state.audioBusy = true;

  try {
    const DOT = 90;
    const DASH = 240;
    const GAP_SYMBOL = 85;
    const GAP_LETTER = 180;

    const parts = String(code || "").trim().split(" ");

    for (let i = 0; i < parts.length; i++) {
      const symbolGroup = parts[i];

      for (let j = 0; j < symbolGroup.length; j++) {
        const s = symbolGroup[j];
        if (s === ".") {
          await playTone(DOT);
        } else if (s === "-") {
          await playTone(DASH);
        }
        if (j < symbolGroup.length - 1) {
          await sleep(GAP_SYMBOL);
        }
      }

      if (i < parts.length - 1) {
        await sleep(GAP_LETTER);
      }
    }
  } catch (err) {
    console.warn("Morse audio error:", err);
  } finally {
    state.audioBusy = false;
  }
}

/* =========================================================
   GAME FLOW
========================================================= */
function renderCurrentQuestion() {
  if (!state.currentItem) return;

  resetHelpers();
  answerInput.value = "";
  answerInput.focus();

  const code = toMorse(state.currentItem.word);
  morseCode.textContent = code;
  hintText.textContent = state.currentItem.hint;
  meaningText.textContent = state.currentItem.tr;

  updateTopStats();
  updateGameHeaderText();

  setFeedback("Hazırsan Mors kodunu incele veya dinleyip cevabı yaz.", "info");

  finalBox.classList.remove("show");
}

async function startGame() {
  state.round = 1;
  state.score = 0;
  state.usedWords = [];
  state.currentItem = null;
  resetHelpers();

  chooseNextWord();
  showPanel("game");
  renderCurrentQuestion();

  await playMorseAudio(morseCode.textContent);
}

async function goNextRound() {
  if (state.round >= TOTAL_ROUNDS) {
    finishGame();
    return;
  }

  state.round += 1;
  chooseNextWord();
  renderCurrentQuestion();
  await playMorseAudio(morseCode.textContent);
}

function getAwardPoints() {
  if (state.meaningOpened) return 5;
  if (state.hintOpened) return 7;
  return 10;
}

async function checkAnswer() {
  if (!state.currentItem) return;

  const user = normalizeWord(answerInput.value);
  const correct = normalizeWord(state.currentItem.word);

  if (!user) {
    setFeedback("Önce bir cevap yazman gerekiyor.", "bad");
    return;
  }

  if (user === correct) {
    const points = getAwardPoints();
    state.score += points;
    updateTopStats();

    setFeedback(`Doğru bildin. +${points} puan kazandın.`, "ok");
    btnCheck.disabled = true;
    btnSkip.disabled = true;
    btnShowHint.disabled = true;
    btnShowMeaning.disabled = true;

    setTimeout(async () => {
      btnCheck.disabled = false;
      btnSkip.disabled = false;
      btnShowHint.disabled = false;
      btnShowMeaning.disabled = false;
      await goNextRound();
    }, 850);
  } else {
    setFeedback("Olmadı. Tekrar dene, ipucu al veya anlamı aç.", "bad");
  }
}

function showHint() {
  if (!state.currentItem) return;
  state.hintOpened = true;
  hintBox.classList.add("show");
  setFeedback("Türkçe ipucu açıldı. Bu turdan alacağın puan biraz düştü.", "info");
}

function showMeaning() {
  if (!state.currentItem) return;
  state.meaningOpened = true;
  state.hintOpened = true;
  hintBox.classList.add("show");
  meaningBox.classList.add("show");
  setFeedback("Türkçe anlam açıldı. Bu turu artık daha rahat çözersin.", "info");
}

async function skipRound() {
  if (!state.currentItem) return;

  const answer = state.currentItem.word;
  setFeedback(`Tur geçildi. Doğru cevap: ${answer}`, "bad");

  btnCheck.disabled = true;
  btnSkip.disabled = true;
  btnShowHint.disabled = true;
  btnShowMeaning.disabled = true;

  setTimeout(async () => {
    btnCheck.disabled = false;
    btnSkip.disabled = false;
    btnShowHint.disabled = false;
    btnShowMeaning.disabled = false;
    await goNextRound();
  }, 1100);
}

function finishGame() {
  updateTopStats();
  finalText.textContent =
    `Toplam ${TOTAL_ROUNDS} tur tamamlandı. ` +
    `Seçilen dil: ${getLanguageMeta(state.language)?.title || "-"}. ` +
    `Seçilen seviye: ${getDifficultyMeta(state.difficulty)?.title || "-"}. ` +
    `Toplam puanın: ${state.score}.`;

  finalBox.classList.add("show");
  setFeedback("Oyun tamamlandı. İstersen tekrar oynayabilir veya başa dönebilirsin.", "ok");
}

/* =========================================================
   EVENTS
========================================================= */
btnGoRules.addEventListener("click", () => {
  if (!state.language) return;
  showPanel("rules");
});

btnBackToLang.addEventListener("click", () => {
  showPanel("language");
});

btnGoDifficulty.addEventListener("click", () => {
  showPanel("difficulty");
});

btnBackToRules.addEventListener("click", () => {
  showPanel("rules");
});

btnStartGame.addEventListener("click", async () => {
  if (!state.language || !state.difficulty) return;
  await startGame();
});

btnReplayAudio.addEventListener("click", async () => {
  await playMorseAudio(morseCode.textContent);
});

btnShowHint.addEventListener("click", () => {
  showHint();
});

btnShowMeaning.addEventListener("click", () => {
  showMeaning();
});

btnCheck.addEventListener("click", async () => {
  await checkAnswer();
});

btnSkip.addEventListener("click", async () => {
  await skipRound();
});

answerInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    await checkAnswer();
  }
});

btnRestart.addEventListener("click", async () => {
  await startGame();
});

btnBackToStart.addEventListener("click", () => {
  state.round = 1;
  state.score = 0;
  state.usedWords = [];
  state.currentItem = null;
  resetHelpers();
  answerInput.value = "";
  finalBox.classList.remove("show");
  btnStartGame.disabled = !state.difficulty;
  showPanel("language");
});

/* =========================================================
   INIT
========================================================= */
function init() {
  buildLanguageCards();
  buildDifficultyCards();
  showPanel("language");
  updateTopStats();
}

init();
