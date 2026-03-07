const DB = {
  en: [
    {
      id: "en-1",
      title: "Perfect",
      artist: "Ed Sheeran",
      level: "A2-B1",
      mode: "romantic",
      audio: "",
      lyrics: [
        { t: 0, text: "I found a love for me" },
        { t: 4, text: "Darling just dive right in" },
        { t: 8, text: "And follow my lead" },
        { t: 12, text: "Well I found a girl beautiful and sweet" },
        { t: 18, text: "I never knew you were the someone waiting for me" },
        { t: 24, text: "Cause we were just kids when we fell in love" }
      ]
    },
    {
      id: "en-2",
      title: "Believer",
      artist: "Imagine Dragons",
      level: "B1",
      mode: "energetic",
      audio: "",
      lyrics: [
        { t: 0, text: "First things first" },
        { t: 3, text: "I am gonna say all the words inside my head" },
        { t: 8, text: "I am fired up and tired of the way that things have been" },
        { t: 14, text: "Oh ooh" },
        { t: 16, text: "Pain you made me a believer" },
        { t: 21, text: "Believer" }
      ]
    }
  ],
  de: [
    {
      id: "de-1",
      title: "99 Luftballons",
      artist: "Nena",
      level: "A2-B1",
      mode: "classic",
      audio: "",
      lyrics: [
        { t: 0, text: "Hast du etwas Zeit für mich" },
        { t: 4, text: "Dann singe ich ein Lied für dich" },
        { t: 9, text: "Von neunundneunzig Luftballons" },
        { t: 13, text: "Auf ihrem Weg zum Horizont" }
      ]
    },
    {
      id: "de-2",
      title: "Lieblingsmensch",
      artist: "Namika",
      level: "A2",
      mode: "soft",
      audio: "",
      lyrics: [
        { t: 0, text: "Manchmal fühl ich mich hier falsch" },
        { t: 4, text: "Wie ein Segel im All" },
        { t: 8, text: "Aber bist du bei mir" },
        { t: 12, text: "Bin ich bereit zu glauben" }
      ]
    }
  ],
  fr: [
    {
      id: "fr-1",
      title: "Dernière danse",
      artist: "Indila",
      level: "A2-B1",
      mode: "dramatic",
      audio: "",
      lyrics: [
        { t: 0, text: "Oh ma douce souffrance" },
        { t: 4, text: "Pourquoi sacharner tu recommences" },
        { t: 9, text: "Je ne suis quun être sans importance" },
        { t: 14, text: "Sans lui je suis un peu perdue" }
      ]
    },
    {
      id: "fr-2",
      title: "Je veux",
      artist: "Zaz",
      level: "A2",
      mode: "playful",
      audio: "",
      lyrics: [
        { t: 0, text: "Donnez moi une suite au Ritz" },
        { t: 4, text: "Je nen veux pas" },
        { t: 7, text: "Des bijoux de chez Chanel" },
        { t: 11, text: "Je nen veux pas" }
      ]
    }
  ],
  it: [
    {
      id: "it-1",
      title: "Volare",
      artist: "Domenico Modugno",
      level: "A1-A2",
      mode: "classic",
      audio: "",
      lyrics: [
        { t: 0, text: "Penso che un sogno così non ritorni mai più" },
        { t: 6, text: "Mi dipingevo le mani e la faccia di blu" },
        { t: 12, text: "Poi dimprovviso venivo dal vento rapito" },
        { t: 18, text: "E incominciavo a volare nel cielo infinito" }
      ]
    },
    {
      id: "it-2",
      title: "Bella Ciao",
      artist: "Traditional",
      level: "A1",
      mode: "folk",
      audio: "",
      lyrics: [
        { t: 0, text: "Una mattina mi son svegliato" },
        { t: 4, text: "O bella ciao bella ciao bella ciao ciao ciao" },
        { t: 10, text: "Una mattina mi son svegliato" },
        { t: 14, text: "E ho trovato linvasor" }
      ]
    }
  ],
  es: [
    {
      id: "es-1",
      title: "La Bamba",
      artist: "Traditional",
      level: "A1",
      mode: "festive",
      audio: "",
      lyrics: [
        { t: 0, text: "Para bailar la bamba" },
        { t: 3, text: "Para bailar la bamba se necesita una poca de gracia" },
        { t: 9, text: "Una poca de gracia pa mi pa ti y arriba y arriba" },
        { t: 15, text: "Y arriba y arriba por ti seré por ti seré por ti seré" }
      ]
    },
    {
      id: "es-2",
      title: "Vivir Mi Vida",
      artist: "Marc Anthony",
      level: "A2",
      mode: "uplifting",
      audio: "",
      lyrics: [
        { t: 0, text: "Voy a reír voy a bailar" },
        { t: 4, text: "Vivir mi vida la la la la" },
        { t: 8, text: "Voy a reír voy a gozar" },
        { t: 12, text: "Vivir mi vida la la la la" }
      ]
    }
  ]
};

const LANGS = [
  { key: "en", label: "🇬🇧 English" },
  { key: "de", label: "🇩🇪 German" },
  { key: "fr", label: "🇫🇷 French" },
  { key: "it", label: "🇮🇹 Italian" },
  { key: "es", label: "🇪🇸 Spanish" }
];

const state = {
  lang: "en",
  query: "",
  song: null,
  mode: "solo",
  timer: null,
  startedAt: 0,
  elapsed: 0,
  currentIndex: 0,
  micOn: false,
  heard: "",
  recognition: null,
  lineResults: [],
  score: {
    pronunciation: 0,
    timing: 0,
    accuracy: 0,
    total: 0
  }
};

const $ = (id) => document.getElementById(id);

const langTabs = $("langTabs");
const songList = $("songList");
const searchInput = $("searchInput");
const songTitle = $("songTitle");
const songMeta = $("songMeta");
const currentLine = $("currentLine");
const nextLine = $("nextLine");
const turnPill = $("turnPill");
const turnInfo = $("turnInfo");
const timeNow = $("timeNow");
const timeTotal = $("timeTotal");
const progressBar = $("progressBar");
const heardText = $("heardText");
const coachList = $("coachList");
const audio = $("audio");
const playBtn = $("playBtn");
const pauseBtn = $("pauseBtn");
const micBtn = $("micBtn");
const resetBtn = $("resetBtn");
const soloBtn = $("soloBtn");
const duetBtn = $("duetBtn");
const mainPanel = document.querySelector(".main");

function init() {
  renderLangTabs();
  renderSongList();
  bindEvents();
  setupSpeechRecognition();
  paintEmptyStage();
}

function bindEvents() {
  searchInput.addEventListener("input", (e) => {
    state.query = String(e.target.value || "").toLowerCase().trim();
    renderSongList();
  });

  playBtn.addEventListener("click", startPlayback);
  pauseBtn.addEventListener("click", pausePlayback);
  resetBtn.addEventListener("click", resetPlayback);
  micBtn.addEventListener("click", toggleMic);
  soloBtn.addEventListener("click", () => setMode("solo"));
  duetBtn.addEventListener("click", () => setMode("duet"));
  audio.addEventListener("timeupdate", syncFromAudio);
  audio.addEventListener("ended", finishPlayback);
}

function renderLangTabs() {
  langTabs.innerHTML = "";

  LANGS.forEach((lang) => {
    const btn = document.createElement("button");
    btn.className = "chip" + (state.lang === lang.key ? " active" : "");
    btn.textContent = lang.label;
    btn.onclick = () => {
      state.lang = lang.key;
      state.song = null;
      state.query = "";
      searchInput.value = "";
      resetPlayback();
      renderLangTabs();
      renderSongList();
      paintEmptyStage();
      updateRecognitionLang();
    };
    langTabs.appendChild(btn);
  });
}

function getFilteredSongs() {
  const rows = DB[state.lang] || [];
  if (!state.query) return rows;

  return rows.filter((song) =>
    `${song.title} ${song.artist} ${song.level} ${song.mode}`
      .toLowerCase()
      .includes(state.query)
  );
}

function renderSongList() {
  const rows = getFilteredSongs();
  songList.innerHTML = "";

  if (!rows.length) {
    songList.innerHTML = `
      <div class="song">
        <div class="song-title">Sonuç bulunamadı</div>
        <div class="song-meta">Aramayı değiştir.</div>
      </div>
    `;
    return;
  }

  rows.forEach((song) => {
    const el = document.createElement("div");
    el.className = "song" + (state.song?.id === song.id ? " active" : "");
    el.innerHTML = `
      <div class="song-title">${escapeHtml(song.title)}</div>
      <div class="song-meta">${escapeHtml(song.artist)}</div>
      <div class="song-tags">
        <span class="tag">${escapeHtml(song.level)}</span>
        <span class="tag">${escapeHtml(song.mode)}</span>
        <span class="tag">${song.lyrics.length} satır</span>
      </div>
    `;
    el.onclick = () => selectSong(song);
    songList.appendChild(el);
  });
}

function selectSong(song) {
  state.song = JSON.parse(JSON.stringify(song));
  state.currentIndex = 0;
  state.elapsed = 0;
  state.heard = "";
  state.lineResults = [];

  heardText.textContent = "Mikrofon aktif olduğunda burada canlı algılanan sözler akacak.";
  setScore({ pronunciation: 0, timing: 0, accuracy: 0, total: 0 });

  songTitle.textContent = song.title;
  songMeta.textContent = `${song.artist} • ${song.level} • ${song.mode}`;
  audio.src = song.audio || "";

  currentLine.textContent = song.lyrics[0]?.text || "Bu şarkıda satır yok.";
  nextLine.textContent = song.lyrics[1]?.text || "Sonraki satır yok.";
  timeTotal.textContent = formatTime(song.lyrics.at(-1)?.t || 0);

  paintCoach(song.lyrics[0]?.text || "");
  renderSongList();
  refreshTurnUI();

  if (window.innerWidth <= 1024 && mainPanel) {
    mainPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function paintEmptyStage() {
  songTitle.textContent = "Şarkı seç";
  songMeta.textContent = "Katalogdan bir parça seçince karaoke alanı aktif olur.";
  currentLine.textContent = "Bir şarkı seç ve başlat.";
  nextLine.textContent = "Sonraki satır burada görünecek.";
  turnPill.textContent = "🎙️ Sıra bekleniyor";
  turnPill.className = "turn-pill user";
  turnInfo.textContent = "Hazır";
  timeNow.textContent = "00:00";
  timeTotal.textContent = "00:00";
  progressBar.style.width = "0%";
  coachList.innerHTML = `<div class="coach-word"><span>Seçili satır yok</span><span>—</span></div>`;
}

function setMode(mode) {
  state.mode = mode;
  soloBtn.classList.toggle("active", mode === "solo");
  duetBtn.classList.toggle("active", mode === "duet");
  refreshTurnUI();
}

function refreshTurnUI() {
  if (!state.song) {
    paintEmptyStage();
    return;
  }

  const isAITurn = state.mode === "duet" && state.currentIndex % 2 === 0;

  if (state.mode === "solo") {
    turnPill.textContent = "🎤 Sen söylüyorsun";
    turnPill.className = "turn-pill user";
    turnInfo.textContent = "Solo mod";
  } else if (isAITurn) {
    turnPill.textContent = "🤖 AI singing";
    turnPill.className = "turn-pill ai";
    turnInfo.textContent = "AI sıra";
  } else {
    turnPill.textContent = "🎤 Your turn";
    turnPill.className = "turn-pill user";
    turnInfo.textContent = "Senin sıran";
  }
}

function startPlayback() {
  if (!state.song) {
    alert("Önce bir şarkı seç.");
    return;
  }

  if (audio.src) {
    audio.play().catch(() => {});
  }

  if (state.timer) return;

  state.startedAt = Date.now() - state.elapsed * 1000;
  state.timer = setInterval(tick, 120);
}

function pausePlayback() {
  if (audio.src) audio.pause();
  clearInterval(state.timer);
  state.timer = null;
}

function resetPlayback() {
  pausePlayback();
  state.elapsed = 0;
  state.currentIndex = 0;
  state.lineResults = [];

  if (audio.src) {
    audio.currentTime = 0;
  }

  progressBar.style.width = "0%";
  timeNow.textContent = "00:00";
  heardText.textContent = state.micOn
    ? "Dinleniyor…"
    : "Mikrofon aktif olduğunda burada canlı algılanan sözler akacak.";
  setScore({ pronunciation: 0, timing: 0, accuracy: 0, total: 0 });

  if (state.song) {
    currentLine.textContent = state.song.lyrics[0]?.text || "Bu şarkıda satır yok.";
    nextLine.textContent = state.song.lyrics[1]?.text || "Sonraki satır yok.";
    paintCoach(state.song.lyrics[0]?.text || "");
  } else {
    paintEmptyStage();
  }

  refreshTurnUI();
}

function tick() {
  if (audio.src && !audio.paused) {
    state.elapsed = audio.currentTime;
  } else {
    state.elapsed = (Date.now() - state.startedAt) / 1000;
  }

  updateLyricsByTime(state.elapsed);
  updateProgress();
}

function syncFromAudio() {
  state.elapsed = audio.currentTime;
  updateLyricsByTime(state.elapsed);
  updateProgress();
}

function updateLyricsByTime(sec) {
  if (!state.song) return;

  const lyrics = state.song.lyrics;
  let idx = 0;

  for (let i = 0; i < lyrics.length; i++) {
    if (sec >= lyrics[i].t) idx = i;
  }

  if (idx !== state.currentIndex) {
    finalizePreviousLine();
    state.currentIndex = idx;
    currentLine.textContent = lyrics[idx]?.text || "—";
    nextLine.textContent = lyrics[idx + 1]?.text || "Şarkı bitiyor…";
    paintCoach(lyrics[idx]?.text || "");
    refreshTurnUI();
  }

  timeNow.textContent = formatTime(sec);
}

function updateProgress() {
  if (!state.song) return;
  const total = state.song.lyrics.at(-1)?.t || 1;
  const pct = Math.max(0, Math.min(100, (state.elapsed / total) * 100));
  progressBar.style.width = pct + "%";
}

function finalizePreviousLine() {
  if (!state.song) return;

  const prevIndex = state.currentIndex;
  const line = state.song.lyrics[prevIndex];
  if (!line) return;

  const shouldScore =
    state.mode === "solo" || (state.mode === "duet" && prevIndex % 2 === 1);

  if (!shouldScore) return;

  const heard = normalizeText(state.heard);
  const target = normalizeText(line.text);

  const accuracy = similarityScore(target, heard);
  const timing = Math.max(0, 100 - Math.min(100, Math.abs(state.elapsed - line.t) * 10));
  const pronunciation = Math.round(accuracy * 0.7 + timing * 0.3);

  state.lineResults.push({
    target: line.text,
    heard: state.heard || "",
    accuracy,
    timing,
    pronunciation
  });

  recalcOverall();
  state.heard = "";
  heardText.textContent = state.micOn
    ? "Dinleniyor…"
    : "Mikrofon aktif olduğunda burada canlı algılanan sözler akacak.";
}

function finishPlayback() {
  finalizePreviousLine();
  pausePlayback();
  refreshTurnUI();
}

function recalcOverall() {
  if (!state.lineResults.length) return;

  const sum = state.lineResults.reduce(
    (acc, item) => {
      acc.pronunciation += item.pronunciation;
      acc.timing += item.timing;
      acc.accuracy += item.accuracy;
      return acc;
    },
    { pronunciation: 0, timing: 0, accuracy: 0 }
  );

  const n = state.lineResults.length;
  const pronunciation = Math.round(sum.pronunciation / n);
  const timing = Math.round(sum.timing / n);
  const accuracy = Math.round(sum.accuracy / n);
  const total = Math.round((pronunciation + timing + accuracy) / 3);

  setScore({ pronunciation, timing, accuracy, total });
}

function setScore(score) {
  state.score = score;
  $("scorePron").textContent = String(score.pronunciation);
  $("scoreTiming").textContent = String(score.timing);
  $("scoreAccuracy").textContent = String(score.accuracy);
  $("scoreTotal").textContent = String(score.total);
}

function paintCoach(text) {
  const words = splitWords(text);
  coachList.innerHTML = "";

  if (!words.length) {
    coachList.innerHTML = `<div class="coach-word"><span>Satır yok</span><span>—</span></div>`;
    return;
  }

  const heardWords = new Set(splitWords(state.heard));

  words.forEach((word) => {
    const good = heardWords.has(word.toLowerCase());
    const row = document.createElement("div");
    row.className = "coach-word " + (good ? "good" : "bad");
    row.innerHTML = `<strong>${escapeHtml(word)}</strong><span>${good ? "✔ iyi" : "❌ tekrar et"}</span>`;
    coachList.appendChild(row);
  });
}

function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    micBtn.disabled = true;
    micBtn.textContent = "🎤 Destek yok";
    return;
  }

  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = langToSpeechLocale(state.lang);

  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      interim += (event.results[i][0].transcript || "") + " ";
    }
    state.heard = interim.trim();
    heardText.textContent = state.heard || "Dinleniyor…";

    if (state.song) {
      paintCoach(state.song.lyrics[state.currentIndex]?.text || "");
    }
  };

  rec.onend = () => {
    if (state.micOn) {
      try {
        rec.lang = langToSpeechLocale(state.lang);
        rec.start();
      } catch {}
    }
  };

  state.recognition = rec;
}

function updateRecognitionLang() {
  if (!state.recognition) return;
  try {
    state.recognition.lang = langToSpeechLocale(state.lang);
  } catch {}
}

function toggleMic() {
  if (!state.recognition) return;

  state.micOn = !state.micOn;
  micBtn.textContent = state.micOn ? "🛑 Mikrofonu Kapat" : "🎤 Mikrofonu Aç";

  try {
    if (state.micOn) {
      state.recognition.lang = langToSpeechLocale(state.lang);
      state.recognition.start();
      heardText.textContent = "Dinleniyor…";
    } else {
      state.recognition.stop();
      heardText.textContent = "Mikrofon aktif olduğunda burada canlı algılanan sözler akacak.";
    }
  } catch {}
}

function langToSpeechLocale(lang) {
  return (
    {
      en: "en-US",
      de: "de-DE",
      fr: "fr-FR",
      it: "it-IT",
      es: "es-ES"
    }[lang] || "en-US"
  );
}

function formatTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitWords(str) {
  return normalizeText(str).split(" ").filter(Boolean);
}

function similarityScore(target, heard) {
  if (!target && !heard) return 100;
  if (!target || !heard) return 0;

  const a = splitWords(target);
  const b = splitWords(heard);

  if (!a.length) return 0;

  let hits = 0;
  const bag = [...b];

  for (const word of a) {
    const idx = bag.indexOf(word);
    if (idx >= 0) {
      hits++;
      bag.splice(idx, 1);
    }
  }

  return Math.round((hits / a.length) * 100);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m];
  });
}

init();
