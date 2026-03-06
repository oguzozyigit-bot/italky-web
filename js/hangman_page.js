/* FILE: /js/hangman_page.js */
import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

const $ = (id) => document.getElementById(id);

// 1. SHELL & UI FIX
mountShell({ scroll: "none" });
const rootStyle = getComputedStyle(document.documentElement);
const footerH = parseFloat(rootStyle.getPropertyValue("--footerH")) || 0;
document.documentElement.style.setProperty("--shellLift", `${footerH + 10}px`);

// 2. GAME STATE
let state = {
    lang: localStorage.getItem("italky_game_lang") || "en",
    level: localStorage.getItem("italky_game_level") || "A1",
    pool: [],
    target: null,
    lives: 5,
    score: 0,
    guessed: new Set(),
    mistakes: 0,
    lock: false
};

// 3. HAVUZ BAĞLANTISI (Kelime Yükleme)
async function loadPool() {
    try {
        const langFile = state.lang.toLowerCase();
        // Academy havuzuna bağlan: /js/langpools/en.json gibi
        const r = await fetch(`/js/langpools/${langFile}.json`);
        const data = await r.json();
        
        // Seviyeye göre filtrele
        state.pool = data.items.filter(item => item.level === state.level || !item.level);
        
        if (state.pool.length > 0) {
            $("gateInfo").textContent = `${state.lang.toUpperCase()} • ${state.level} MODU HAZIR`;
            $("pageContent").classList.add("ui-ready");
        } else {
            $("gateInfo").textContent = "Havuz boş, lütfen dil seçin.";
        }
    } catch (e) {
        $("gateInfo").textContent = "Bağlantı Hatası.";
    }
}

// 4. OYUN MANTIĞI
function startRound() {
    state.lock = false;
    state.guessed.clear();
    state.mistakes = 0;
    state.target = state.pool[Math.floor(Math.random() * state.pool.length)];
    
    renderHearts();
    renderWord();
    renderKeyboard();
    updateMan();
    $("trText").textContent = `İPUCU: ${state.target.tr}`;
}

function renderWord() {
    const w = state.target.w.toUpperCase();
    $("matrix").innerHTML = w.split("").map(ch => {
        const isFound = state.guessed.has(ch);
        return `<div class="slot ${isFound ? "found" : ""}">${isFound ? ch : ""}</div>`;
    }).join("");
}

function renderKeyboard() {
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    $("kb").innerHTML = abc.map(l => `<button class="key" id="key-${l}" onclick="window.makeGuess('${l}')">${l}</button>`).join("");
}

function renderHearts() {
    let h = "";
    for (let i = 0; i < 5; i++) h += `<div class="heart ${i >= state.lives ? 'lost' : ''}">❤️</div>`;
    $("hearts").innerHTML = h;
}

function updateMan() {
    const parts = ["p_head", "p_body", "p_larm", "p_rarm", "p_lleg", "p_rleg"];
    parts.forEach((p, i) => $(p).classList.toggle("on", i < state.mistakes));
}

window.makeGuess = (l) => {
    if (state.lock || state.guessed.has(l)) return;
    state.guessed.add(l);
    const btn = $(`key-${l}`);
    
    if (state.target.w.toUpperCase().includes(l)) {
        btn.classList.add("hit");
        renderWord();
        if (state.target.w.toUpperCase().split("").every(ch => state.guessed.has(ch))) {
            endRound(true);
        }
    } else {
        btn.classList.add("miss");
        state.mistakes++;
        updateMan();
        if (state.mistakes >= 6) endRound(false);
    }
};

function endRound(win) {
    state.lock = true;
    $("mTitle").textContent = win ? "BAŞARILI!" : "ASILDIN!";
    $("mTitle").style.color = win ? "var(--green)" : "var(--red)";
    $("mWord").textContent = state.target.w.toUpperCase();
    $("mTr").textContent = `(${state.target.tr})`;
    $("modal").classList.add("on");
    
    if (!win) state.lives--;
    if (win) state.score += 100;
}

$("mBtn").onclick = () => {
    $("modal").classList.remove("on");
    if (state.lives > 0) startRound();
    else location.reload();
};

$("realStartBtn").onclick = () => {
    $("readyGate").style.display = "none";
    startRound();
};

// BOOT
loadPool();
