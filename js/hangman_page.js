// FILE: /js/hangman_page.js
import { mountShell } from "/js/ui_shell.js";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  /* =========================
     CONFIG
  ========================= */
  const MAX_LIVES = 9;
  const START_LIVES = 3;
  const WORD_START_SCORE = 100;
  const PENALTY = 10;
  const MAX_JOKERS = 2;

  // Rekor: dil + zorluk bazlı ayrı, cihazda kalıcı
  const BEST_PREFIX = "italky_hangman_best_v2";

  let LANGPOOL_BASE = "";
  let pool = null;
  let target = null;

  // UI seçimleri
  let lang = "en";
  let diff = 3; // 3 easy, 4 normal, 5 hard (UI böyle)

  // oyun state
  let lives = START_LIVES;
  let guessed = new Set();
  let mistakes = 0;
  let jokersLeft = MAX_JOKERS;
  let flawless = true;
  let jokerUsed = false;
  let lock = false;

  // skorlar
  let wordScore = WORD_START_SCORE; // o anki kelimenin puanı
  let totalScore = 0;              // toplam skor (biriken)
  let bestScore = 0;               // rekor (kalıcı)

  /* =========================
     SAFE DOM REFS (shell mount sonrası yeniden alınacak)
  ========================= */
  let el = {};
  function grab(){
    el = {
      setup: $("setup"),
      setupMsg: $("setupMsg"),
      startBtn: $("startBtn"),
      langGrid: $("langGrid"),
      diffGrid: $("diffGrid"),

      hearts: $("hearts"),
      bestVal: $("bestVal"),
      scoreVal: $("scoreVal"),

      trText: $("trText"),
      matrix: $("matrix"),
      kb: $("kb"),

      man: $("man"),
      p_head: $("p_head"),
      p_body: $("p_body"),
      p_larm: $("p_larm"),
      p_rarm: $("p_rarm"),
      p_lleg: $("p_lleg"),
      p_rleg: $("p_rleg"),

      j0: $("j0"),
      j1: $("j1"),

      modal: $("modal"),
      mTitle: $("mTitle"),
      mWord: $("mWord"),
      mTr: $("mTr"),
      mBonus: $("mBonus"),
      mBtn: $("mBtn"),
    };
    return el;
  }
  grab();

  function saySetup(msg){
    if(el.setupMsg) el.setupMsg.textContent = String(msg || "");
  }

  /* =========================
     HELPERS
  ========================= */
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,!?]/g, "");

  function shuffle(arr){
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function sanitize(data){
    const items = Array.isArray(data?.items) ? data.items : [];
    const seen = new Set();
    const out = [];
    for(const it of items){
      const w = String(it?.w || "").trim();
      const tr = String(it?.tr || "").trim();
      if(!w || !tr) continue;
      const k = norm(w);
      if(seen.has(k)) continue;
      seen.add(k);
      out.push({ w, tr });
    }
    return { lang: String(data?.lang||""), version: data?.version||1, items: out };
  }

  async function readLangpoolBase(){
    if(window.LANGPOOL_BASE) return String(window.LANGPOOL_BASE);
    const r = await fetch("/js/config.js", { cache:"no-store" });
    const t = await r.text();
    const m = t.match(/LANGPOOL_BASE\s*=\s*["']([^"']+)["']/);
    return (m && m[1]) ? m[1] : "";
  }

  async function loadLangPoolDirect(langCode, base){
    const L = String(langCode||"").trim().toLowerCase();
    const url = `${base}/${encodeURIComponent(L)}.json`;
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error(`Dil havuzu bulunamadı: ${url} (HTTP ${r.status})`);
    return sanitize(await r.json());
  }

  function createUsedSet(storageKey){
    let used = new Set();
    try{
      const raw = localStorage.getItem(storageKey);
      const arr = JSON.parse(raw || "[]");
      if(Array.isArray(arr)) used = new Set(arr);
    }catch{}
    const save = () => { try{ localStorage.setItem(storageKey, JSON.stringify([...used])); }catch{} };
    return { used, save };
  }

  function pick(poolObj, count, usedSet, saveUsed, filterFn){
    const items = Array.isArray(poolObj?.items)? poolObj.items : [];
    if(!items.length) return [];
    const candidates = items.filter(x => x?.w && !usedSet.has(norm(x.w)) && (!filterFn || filterFn(x)));
    if(candidates.length < count) usedSet.clear();
    const fresh = items.filter(x => x?.w && !usedSet.has(norm(x.w)) && (!filterFn || filterFn(x)));
    const chosen = shuffle(fresh).slice(0,count);
    chosen.forEach(x=>usedSet.add(norm(x.w)));
    if(saveUsed) saveUsed();
    return chosen;
  }

  /* =========================
     SOUND (mini sfx + word speak)
  ========================= */
  const AC = (window.AudioContext || window.webkitAudioContext)
    ? new (window.AudioContext || window.webkitAudioContext)()
    : null;

  function beep(freq=880, ms=110, type="sine", vol=0.04){
    try{
      if(!AC) return;
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(AC.destination);
      o.start();
      setTimeout(()=>{ try{o.stop()}catch{} }, ms);
    }catch{}
  }

  function speakWord(text, langCode){
    try{
      const t = String(text||"").trim();
      if(!t) return;

      // APK NativeTTS varsa onu kullan
      if(window.NativeTTS && typeof window.NativeTTS.speak === "function"){
        try{ window.NativeTTS.stop?.(); }catch{}
        setTimeout(()=>{ try{ window.NativeTTS.speak(t, langCode); }catch{} }, 180);
        return;
      }

      if(!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(t);
      const map = {en:"en-US",de:"de-DE",fr:"fr-FR",it:"it-IT",es:"es-ES"};
      u.lang = map[langCode] || "en-US";
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }catch{}
  }

  /* =========================
     RULES
  ========================= */
  function getMistakeLimit(){
    // Kolay: 6, Normal: 4, Zor: 2
    if(diff===3) return 6;
    if(diff===4) return 4;
    return 2;
  }

  function bestKey(){
    return `${BEST_PREFIX}_${lang}_${diff}`;
  }

  function loadBest(){
    try{
      bestScore = parseInt(localStorage.getItem(bestKey()) || "0", 10);
      if(Number.isNaN(bestScore)) bestScore = 0;
    }catch{
      bestScore = 0;
    }
  }

  function saveBest(){
    try{ localStorage.setItem(bestKey(), String(bestScore)); }catch{}
  }

  /* =========================
     UI PAINT
  ========================= */
  function renderHearts(){
    if(!el.hearts) return;
    const capped = Math.max(0, Math.min(lives, MAX_LIVES));
    let html = "";
    for(let i=0;i<capped;i++) html += `<span class="heart">❤️</span>`;
    el.hearts.innerHTML = html;
  }

  function paintScores(){
    if(el.bestVal) el.bestVal.textContent = String(bestScore);
    if(el.scoreVal) el.scoreVal.textContent = String(totalScore);
  }

  function resetMan(){
    ["p_head","p_body","p_larm","p_rarm","p_lleg","p_rleg"].forEach(id => {
      const node = $(id);
      node && node.classList.remove("on");
    });
    el.man && el.man.classList.remove("swing");
  }

  function updateMan(){
    resetMan();
    const m = mistakes;

    const seq = ["p_head","p_body","p_larm","p_rarm","p_lleg","p_rleg"];
    const showCount = Math.min(getMistakeLimit(), 6);

    seq.slice(0, Math.min(m, showCount)).forEach(id => {
      const node = $(id);
      node && node.classList.add("on");
    });
  }

  function renderWord(){
    if(!target?.w || !el.matrix) return;
    const w = target.w.toUpperCase();
    el.matrix.innerHTML = w.split("").map(ch=>{
      const found = guessed.has(ch);
      return `<div class="slot ${found ? "found":""}">${found ? ch : ""}</div>`;
    }).join("");
  }

  function renderKeyboard(){
    if(!target?.w || !el.kb) return;
    const w = target.w.toUpperCase();
    const uniq = [...new Set(w.split(""))];

    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const fillers = abc.filter(l => !uniq.includes(l)).sort(()=>0.5-Math.random()).slice(0,10);
    const keys = [...uniq, ...fillers].sort(()=>0.5-Math.random());

    el.kb.innerHTML = keys.map(k=>`<button class="key" data-k="${k}">${k}</button>`).join("");
    el.kb.querySelectorAll(".key").forEach(btn=>{
      btn.addEventListener("click", ()=>press(btn.dataset.k, btn));
    });
  }

  function showModal(title, color, bonus){
    if(!el.modal) return;
    if(el.mTitle){ el.mTitle.textContent = title; el.mTitle.style.color = color; }
    if(el.mWord) el.mWord.textContent = (target?.w || "—").toUpperCase();
    if(el.mTr) el.mTr.textContent = `(${target?.tr || "—"})`;
    if(el.mBonus) el.mBonus.textContent = bonus || "";
    el.modal.classList.add("on");
  }

  /* =========================
     SCORE MECHANICS
  ========================= */
  function resetForNewWord(){
    wordScore = WORD_START_SCORE;
    mistakes = 0;
    guessed = new Set();
    jokersLeft = MAX_JOKERS;
    flawless = true;
    jokerUsed = false;

    el.j0 && el.j0.classList.remove("spent");
    el.j1 && el.j1.classList.remove("spent");

    updateMan();
  }

  function applyPenalty(){
    wordScore = Math.max(0, wordScore - PENALTY);
  }

  function addTotalScore(){
    totalScore += wordScore;
    if(totalScore > bestScore){
      bestScore = totalScore;
      saveBest();
    }
  }

  /* =========================
     GAME FLOW
  ========================= */
  function endRound(win){
    lock = true;

    // kelimeyi her bitişte seslendir
    if(target?.w) speakWord(target.w, lang);

    if(win){
      // doğru: puanı ekle
      addTotalScore();

      // sfx
      beep(880, 90, "sine", 0.05);
      beep(1320, 90, "sine", 0.04);

      // bonus can
      let bonus = `KELİME PUANI: +${wordScore}\nTOPLAM SKOR: ${totalScore}`;
      if(flawless && !jokerUsed && lives < MAX_LIVES){
        lives++;
        bonus += `\nKUSURSUZ: +1 CAN`;
      }

      paintScores();
      renderHearts();
      showModal("MİSYON BAŞARILI", "#00ff9d", bonus);
      return;
    }

    // kayıp: 1 can gider, puan eklenmez
    lives--;
    renderHearts();

    // sfx
    beep(180, 140, "square", 0.04);

    el.man && el.man.classList.add("swing");
    setTimeout(()=>{
      el.man && el.man.classList.remove("swing");
      if(lives <= 0){
        // oyun bitti: rekor zaten totalScore ile güncellenmiş olabilir
        if(totalScore > bestScore){
          bestScore = totalScore;
          saveBest();
        }
        paintScores();
        showModal("GAME OVER", "#ff0033", `TOPLAM SKOR: ${totalScore}\nREKOR: ${bestScore}`);
      }else{
        showModal("DEŞİFRE EDİLEMEDİ", "#ff0033", "-1 CAN");
      }
    }, 2200);
  }

  function press(letter, btn){
    if(lock) return;
    if(!letter) return;
    if(guessed.has(letter)) return;
    if(!target?.w) return;

    const w = target.w.toUpperCase();
    if(w.includes(letter)){
      guessed.add(letter);
      btn && btn.classList.add("hit");
      beep(740, 70, "sine", 0.03);

      renderWord();
      const done = w.split("").every(ch => guessed.has(ch));
      if(done) endRound(true);
    }else{
      btn && btn.classList.add("miss");
      beep(220, 90, "square", 0.03);

      flawless = false;
      mistakes++;
      applyPenalty();
      updateMan();

      if(mistakes >= getMistakeLimit()){
        endRound(false);
      }
    }
  }

  function useJ(which){
    if(lock) return;
    if(jokersLeft <= 0) return;
    if(!target?.w) return;

    jokerUsed = true;
    jokersLeft--;
    (which===0 ? el.j0 : el.j1)?.classList.add("spent");

    // joker cezası
    applyPenalty();

    const w = target.w.toUpperCase();
    const rem = w.split("").filter(ch => !guessed.has(ch));
    if(rem.length){
      const l = rem[0];
      const btn = el.kb?.querySelector(`.key[data-k="${l}"]`);
      if(btn) press(l, btn);
      else{
        guessed.add(l);
        renderWord();
      }
    }
  }

  function newRound(){
    lock = false;

    const usedSet = createUsedSet(`used_hangman_${lang}`);
    const pickedW = pick(pool, 1, usedSet.used, usedSet.save, (x)=> (x?.w||"").length >= 3);
    target = pickedW?.[0];

    if(!target?.w){
      if(el.trText) el.trText.textContent = "KELİME BULUNAMADI";
      if(el.matrix) el.matrix.innerHTML = "";
      if(el.kb) el.kb.innerHTML = "";
      return;
    }

    resetForNewWord();
    if(el.trText) el.trText.textContent = (target.tr || "—").trim() || "—";

    renderHearts();
    renderWord();
    renderKeyboard();
    paintScores();
  }

  /* =========================
     SHELL (mount + dock lift)
  ========================= */
  async function bootShellAndLift(){
    // Shell bas
    mountShell({ scroll:"none" });

    // mountShell body’yi replace ettiği için elementleri yeniden yakala
    grab();

    // footer lift (dock shell footer üstüne girmez)
    try{
      const root = getComputedStyle(document.documentElement);
      const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
      document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 10}px` : "0px");
    }catch{}
  }

  /* =========================
     BIND UI
  ========================= */
  function bindSetup(){
    // Dil seçimi
    el.langGrid?.addEventListener("click", (e)=>{
      const c = e.target.closest(".pickCard");
      if(!c || !c.dataset.lang) return;
      [...el.langGrid.querySelectorAll(".pickCard")].forEach(x=>x.classList.remove("active"));
      c.classList.add("active");
      lang = c.dataset.lang;

      loadBest();
      paintScores();
    });

    // Zorluk seçimi
    el.diffGrid?.addEventListener("click", (e)=>{
      const c = e.target.closest(".pickCard.diff");
      if(!c) return;
      [...el.diffGrid.querySelectorAll(".pickCard.diff")].forEach(x=>x.classList.remove("active"));
      c.classList.add("active");
      diff = parseInt(c.dataset.diff,10);

      loadBest();
      paintScores();
    });

    // Start
    el.startBtn?.addEventListener("click", async ()=>{
      saySetup("Yükleniyor…");

      // Shell
      await bootShellAndLift();

      // tekrar yakala (mount sonrası)
      // (grab zaten boot içinde çağrıldı)
      // bind joker/modal yeniden (çünkü elementler taşındı)
      bindInGameButtons();

      try{
        LANGPOOL_BASE = await readLangpoolBase();
        if(!LANGPOOL_BASE){
          saySetup("LANGPOOL_BASE bulunamadı (/js/config.js).");
          return;
        }
      }catch(e){
        saySetup("config.js okunamadı.");
        return;
      }

      try{
        pool = await loadLangPoolDirect(lang, LANGPOOL_BASE);
        if(!pool?.items?.length){
          saySetup(`Havuz boş: ${LANGPOOL_BASE}/${lang}.json`);
          return;
        }
      }catch(err){
        saySetup(String(err?.message || err));
        return;
      }

      // oyun başlangıcı
      lives = START_LIVES;
      totalScore = 0;

      loadBest();
      renderHearts();
      paintScores();

      if(el.setup) el.setup.style.display = "none";
      saySetup("");

      newRound();
    });
  }

  function bindInGameButtons(){
    el.j0?.addEventListener("click", ()=>useJ(0));
    el.j1?.addEventListener("click", ()=>useJ(1));

    el.mBtn?.addEventListener("click", ()=>{
      el.modal?.classList.remove("on");
      if(lives <= 0){
        location.reload();
        return;
      }
      newRound();
    });
  }

  /* =========================
     INIT
  ========================= */
  loadBest();
  renderHearts();
  paintScores();

  bindSetup();
  bindInGameButtons();
});
