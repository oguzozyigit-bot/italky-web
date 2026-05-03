/**
 * italkyAI Sınav Motoru - Final Sürüm
 * Hem Public hem Hub üzerinden gelen istekleri karşılar.
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
        try {
            // Android/Vercel yerel dosya yolundan soruları çek
            const response = await fetch(`../../assets/tests/${this.lang}_test.json`);
            if (!response.ok) throw new Error("JSON bulunamadı");
            
            const json = await response.json();
            this.pool = json.data;
            
            this.setupTest();
            this.renderQuestion();
        } catch (error) {
            console.error("Soru havuzu hatası:", error);
            document.getElementById('questionText').innerText = "Hata: Soru havuzu yüklenemedi.";
        }
    }

    setupTest() {
        // Seviye bazlı dengeli dağılım: 15(A) + 20(B) + 15(C) = 50 Soru
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
        
        // Tasarımdaki ID'lerle haberleşme
        const qText = document.getElementById('questionText');
        const optWrap = document.getElementById('optionsWrap');
        const counter = document.getElementById('qCounter');
        const progress = document.getElementById('progressFill');

        if (qText) qText.innerText = q.q;
        if (counter) counter.innerText = `SORU ${this.currentIndex + 1} / 50`;
        if (progress) progress.style.width = `${((this.currentIndex + 1) / 50) * 100}%`;

        if (optWrap) {
            optWrap.innerHTML = '';
            // Şıkları karıştırarak butonları oluştur
            const choices = [
                { t: q.a, correct: true }, { t: q.b, correct: false },
                { t: q.c, correct: false }, { t: q.d, correct: false }
            ].sort(() => 0.5 - Math.random());

            choices.forEach(choice => {
                const btn = document.createElement('button');
                btn.className = 'opt-btn'; // Senin CSS'indeki class
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
        let level = "A1";
        if (this.score > 43) level = "C1";
        else if (this.score > 35) level = "B2";
        else if (this.score > 25) level = "B1";
        else if (this.score > 15) level = "A2";

        // Hem LocalStorage'a hem varsa Supabase'e yazma ihtimali için sakla
        localStorage.setItem(`italky_level_${this.lang}`, level);
        localStorage.setItem(`italky_score_${this.lang}`, this.score);

        // Sonuç sayfasına git (Parametreleri URL ile taşıyoruz)
        window.location.href = `/pages/public/level_result.html?lang=${this.lang}&lvl=${level}&score=${this.score}`;
    }
}

// URL'den dili al ve motoru ateşle
const params = new URLSearchParams(window.location.search);
const lang = params.get('lang') || 'en';
new LevelTestEngine(lang);
