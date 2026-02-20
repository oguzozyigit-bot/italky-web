import { mountShell } from "./ui_shell.js";
import { loadLangPool, createUsedSet, pick } from "./langpool.js";

const $ = (id) => document.getElementById(id);

// --- OYUN DURUMU ---
let lang = "en";
let muted = false;
let totalScore = 0;
let lives = 3;
let momentum = 1.0;
let poolItems = [];
let currentItem = null;
let setCounter = 0;
let cooldown = false;

// --- SES SİSTEMİ (TTS) ---
const LANGMAP = { en: "en-US", de: "de-DE", fr: "fr-FR", es: "es-ES", it: "it-IT" };

function speak(txt, onDone) {
    if (muted || !txt) return onDone?.();
    window.speechSynthesis.cancel(); // Önceki sesleri durdur

    const u = new SpeechSynthesisUtterance(txt);
    u.lang = LANGMAP[lang] || "en-US";
    u.rate = 0.9;
    u.onend = () => onDone?.();
    u.onerror = (e) => {
        console.error("TTS Hatası:", e);
        onDone?.();
    };
    window.speechSynthesis.speak(u);
}

// --- OYUN MANTIĞI ---
async function initGame() {
    console.log(`${lang} dili için veriler yükleniyor...`);
    try {
        const data = await loadLangPool(lang);
        console.log("Gelen ham veri:", data);

        const USED_KEY = `spy_used_${lang}`;
        const { used, save } = createUsedSet(USED_KEY);

        // langpool.js pick fonksiyonu bir dizi döner
        poolItems = pick(data, 12, used, save);
        
        if (!poolItems || poolItems.length === 0) {
            console.error("Havuz boş döndü!");
            return;
        }

        console.log("Seçilen sorular:", poolItems);
        setCounter = 0;
        nextQuestion();
    } catch (err) {
        console.error("Yükleme sırasında hata oluştu:", err);
    }
}

function nextQuestion() {
    if (setCounter >= 8 || lives <= 0) {
        finishGame();
        return;
    }

    const item = poolItems[setCounter];
    currentItem = {
        say: item.sentence || item.w,
        ans: item.tr
    };

    renderOptions(currentItem.ans);
    updateUI();
}

function renderOptions(correct) {
    const area = $("optionsArea");
    area.innerHTML = "";

    // Yanlış şıkları mevcut havuzdan al
    let options = [correct];
    let others = poolItems
        .filter(i => i.tr !== correct)
        .map(i => i.tr)
        .sort(() => 0.5 - Math.random());
    
    options = [...options, ...others.slice(0, 3)].sort(() => 0.5 - Math.random());

    options.forEach(optText => {
        const btn = document.createElement("div");
        btn.className = "opt";
        btn.textContent = optText;
        btn.onclick = () => checkAnswer(btn, optText);
        area.appendChild(btn);
    });
}

function checkAnswer(el, val) {
    if (cooldown) return;
    cooldown = true;

    const isCorrect = val === currentItem.ans;
    if (isCorrect) {
        el.classList.add("correct");
        totalScore += Math.round(100 * momentum);
        momentum = Math.min(2.0, momentum + 0.1);
    } else {
        el.classList.add("wrong");
        lives--;
        momentum = 1.0;
        // Doğruyu göster
        Array.from($("optionsArea").children).forEach(b => {
            if (b.textContent === currentItem.ans) b.classList.add("correct");
        });
    }

    setTimeout(() => {
        setCounter++;
        cooldown = false;
        nextQuestion();
    }, 1500);
}

function updateUI() {
    $("scoreDisp").textContent = totalScore;
    $("livesDisp").textContent = "❤️".repeat(lives);
    $("momDisp").textContent = `x${momentum.toFixed(2)} MOMENTUM`;
}

function finishGame() {
    $("endModal").classList.add("show");
    $("endStats").innerHTML = `SKOR: ${totalScore}`;
}

// --- EVENT LISTENERS ---
$("startBtn").onclick = () => {
    // Ses motorunu uyandır (Safari/Chrome için boş ses)
    window.speechSynthesis.speak(new SpeechSynthesisUtterance("")); 
    $("startModal").classList.remove("show");
    initGame();
};

$("listenBtn").onclick = () => {
    if (!currentItem) return;
    $("radar").classList.add("playing");
    speak(currentItem.say, () => {
        $("radar").classList.remove("playing");
    });
};

document.querySelectorAll(".langBtn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".langBtn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        lang = btn.dataset.lang;
    };
});
