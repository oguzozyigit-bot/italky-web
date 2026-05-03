/**
 * italkyAI Özgür Sınav Motoru
 * Dosya Yolu: /js/level_test_engine.js
 */

class LevelTestEngine {
    constructor(langCode) {
        this.lang = langCode;
        this.pool = [];
        this.questions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.init();
    }

    async init() {
        // Yerel JSON dosyasını çek (it_test.json, en_test.json vb.)
        try {
            // HTML /pages içindeyse yol: ../assets/tests/
            const response = await fetch(`../assets/tests/${this.lang}_test.json`);
            const json = await response.json();
            this.pool = json.data;
            
            this.setupTest();
            this.renderQuestion();
        } catch (error) {
            console.error("Hata: Soru bankası yüklenemedi!", error);
        }
    }

    setupTest() {
        // Havuzdan 15(A), 20(B), 15(C) soruyu rastgele seçerek 50'ye tamamla
        const a = this.getRandom(this.pool.filter(q => q.lvl.startsWith('A')), 15);
        const b = this.getRandom(this.pool.filter(q => q.lvl.startsWith('B')), 20);
        const c = this.getRandom(this.pool.filter(q => q.lvl.startsWith('C')), 15);
        this.questions = [...a, ...b, ...c];
    }

    getRandom(arr, n) {
        return arr.sort(() => 0.5 - Math.random()).slice(0, n);
    }

    renderQuestion() {
        const q = this.questions[this.currentIndex];
        
        // Tasarımdaki ID'lerle eşleşme
        const qText = document.getElementById('questionText');
        const optWrap = document.getElementById('optionsWrap');
        const counter = document.getElementById('qCounter');
        const progress = document.getElementById('progressFill');

        if (qText) qText.innerText = q.q;
        if (counter) counter.innerText = `Soru ${this.currentIndex + 1} / 50`;
        if (progress) progress.style.width = `${((this.currentIndex + 1) / 50) * 100}%`;

        if (optWrap) {
            optWrap.innerHTML = '';
            // Şıkları her seferinde karıştır
            const choices = [
                { t: q.a, correct: true }, { t: q.b, correct: false },
                { t: q.c, correct: false }, { t: q.d, correct: false }
            ].sort(() => 0.5 - Math.random());

            choices.forEach(choice => {
                const btn = document.createElement('button');
                btn.className = 'opt-btn'; // Senin CSS'indeki class adı
                btn.innerText = choice.t;
                btn.onclick = () => this.handleAnswer(choice.correct);
                optWrap.appendChild(btn);
            });
        }
    }

    handleAnswer(isCorrect) {
        if (isCorrect) this.score++;
        this.currentIndex++;

        if (this.currentIndex < 50) {
            this.renderQuestion();
        } else {
            this.finishTest();
        }
    }

    finishTest() {
        // Puanlamaya göre seviye belirle
        let level = "A1";
        if (this.score > 43) level = "C1";
        else if (this.score > 35) level = "B2";
        else if (this.score > 25) level = "B1";
        else if (this.score > 15) level = "A2";

        // Sonucu tarayıcıya/telefona kaydet
        localStorage.setItem(`italky_level_${this.lang}`, level);
        
        // Sonuç sayfasına puan ve seviye ile git
        window.location.href = `level_result.html?lang=${this.lang}&lvl=${level}&score=${this.score}`;
    }
}

// URL'den dili çek (örn: ?lang=it) ve başlat
const params = new URLSearchParams(window.location.search);
const lang = params.get('lang') || 'en';
new LevelTestEngine(lang);
