<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>italkyAI • Karşılıklı Çeviri</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">

  <style>
    :root {
      --bg-void: #02000a;
      --brand-burgundy: #4a0817; /* Karşı taraf */
      --brand-lacivert: #0f172a; /* Senin tarafın */
      --ai-grad: linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%);
    }

    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
    body {
      margin: 0; padding: 0; width: 100%; height: 100dvh;
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-void); color: #fff;
      display: flex; flex-direction: column; overflow: hidden;
    }

    .container { display: flex; flex-direction: column; height: 100%; width: 100%; position: relative; }

    /* ÜST BÖLME (BORDO) */
    .half-screen.top {
      background: linear-gradient(to bottom, #2d060e, var(--brand-burgundy));
      transform: rotate(180deg); /* Karşıdaki kişi için ters */
    }

    /* ALT BÖLME (LACİVERT) */
    .half-screen.bottom {
      background: linear-gradient(to bottom, var(--brand-lacivert), #02000a);
    }

    .half-screen {
      flex: 1; position: relative; display: flex; flex-direction: column;
      align-items: center; justify-content: space-between; padding: 30px 20px;
    }

    /* DİL SEÇİM BUTONLARI */
    .lang-pill {
      background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
      color: #fff; padding: 10px 20px; border-radius: 25px;
      font-size: 13px; font-weight: 700; cursor: pointer; backdrop-filter: blur(10px);
      display: flex; align-items: center; gap: 8px; z-index: 50;
    }

    /* MESAJ BALONLARI VE METİN ALANI */
    .chat-body {
      flex: 1; width: 100%; max-width: 90%; 
      display: flex; flex-direction: column; justify-content: center;
      overflow-y: auto; scrollbar-width: none;
    }
    .chat-body::-webkit-scrollbar { display: none; }

    .bubble {
      font-size: 24px; font-weight: 800; line-height: 1.2;
      margin: 10px 0; text-align: center; width: 100%;
    }
    .bubble.me { color: #fff; } /* Çevrilen (Karşı tarafa giden) */
    .bubble.them { color: rgba(255,255,255,0.4); font-size: 18px; font-weight: 500; } /* Konuşulan */

    /* HOPARLÖR BUTONU */
    .speaker-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 5px; }
    .btn-speak {
      width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.05); color: #fff; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: 0.2s;
    }
    .btn-speak.muted { opacity: 0.3; border-color: transparent; }

    /* MİKROFONLAR (EN ALTTA VE EN ÜSTTE) */
    .btn-mic {
      width: 72px; height: 72px; border-radius: 50%;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2);
      color: #fff; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: 0.3s; margin-top: 10px;
    }
    .btn-mic.listening { 
        background: #fff; color: #000; transform: scale(1.1); 
        box-shadow: 0 0 25px rgba(255,255,255,0.4);
    }

    /* ORTA HUB (LOGO + DALGA) */
    .center-hub {
      position: absolute; top: 50%; left: 0; width: 100%; height: 80px;
      transform: translateY(-50%); display: flex; align-items: center;
      justify-content: center; z-index: 100; pointer-events: none;
    }

    /* Logo Kapasülü */
    .logo-capsule {
      background: #02000a; padding: 10px 24px; border-radius: 30px;
      border: 2px solid rgba(255,255,255,0.1); display: flex; align-items: center;
      pointer-events: auto; box-shadow: 0 0 40px rgba(0,0,0,0.9);
      cursor: pointer;
    }
    .logo-text { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; }
    .logo-ai { background: var(--ai-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

    /* Dinamik Ses Dalgaları */
    .wave-visual {
      position: absolute; display: flex; align-items: center; gap: 4px; opacity: 0; transition: 0.3s;
    }
    .listening .wave-visual { opacity: 1; }
    .bar { width: 3px; height: 12px; background: var(--ai-grad); border-radius: 4px; animation: bounce 0.8s infinite ease-in-out; }
    @keyframes bounce { 0%, 100% { height: 10px; } 50% { height: 50px; } }

    /* DİL SEÇİM PANELİ (BOTTOM SHEET) */
    .sheet-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px);
      z-index: 1000; display: none; align-items: flex-end; justify-content: center;
    }
    .sheet-overlay.show { display: flex; }
    .sheet-card {
      width: 100%; max-width: 480px; background: #0a0a15; border-radius: 30px 30px 0 0;
      max-height: 80vh; display: flex; flex-direction: column; padding: 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .sheet-overlay.fromTop .sheet-card { border-radius: 0 0 30px 30px; align-self: flex-start; }

    .sheet-list { flex: 1; overflow-y: auto; margin-top: 15px; }
    .sheet-row { 
      padding: 14px; display: flex; justify-content: space-between; align-items: center; 
      border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer;
    }
    .sheet-row.selected { background: rgba(99, 102, 241, 0.1); border-radius: 12px; }
  </style>
</head>

<body id="frameRoot">

  <div class="container">
    
    <div class="half-screen top">
      <div class="lang-pill" id="topLangBtn">
        <span id="topLangTxt">🌐 İngilizce</span>
      </div>

      <div class="chat-body" id="topBody">
        </div>

      <div class="speaker-row">
        <button class="btn-speak" id="topSpeak">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </button>
        <button class="btn-mic" id="topMic">
          <svg viewBox="0 0 24 24" width="30"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </button>
      </div>
    </div>

    <div class="center-hub">
      <div class="wave-visual">
        <div class="bar" style="animation-delay:0.1s"></div>
        <div class="bar" style="animation-delay:0.3s"></div>
        <div class="bar" style="animation-delay:0.5s"></div>
        <div class="bar" style="animation-delay:0.3s"></div>
        <div class="bar" style="animation-delay:0.1s"></div>
      </div>
      <div class="logo-capsule" id="backBtn">
        <span class="logo-text">italky<span class="logo-ai">AI</span></span>
      </div>
    </div>

    <div class="half-screen bottom">
      <div class="speaker-row">
        <button class="btn-mic" id="botMic">
          <svg viewBox="0 0 24 24" width="30"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </button>
        <button class="btn-speak" id="botSpeak">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </button>
      </div>

      <div class="chat-body" id="botBody">
        </div>

      <div class="lang-pill" id="botLangBtn">
        <span id="botLangTxt">🌐 Türkçe</span>
      </div>
    </div>

  </div>

  <div class="sheet-overlay" id="langSheet">
    <div class="sheet-card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 id="sheetTitle" style="margin:0;">Dil Seçin</h3>
        <button id="sheetClose" style="background:none; border:none; color:#fff; font-size:20px;">✕</button>
      </div>
      <input type="text" id="sheetQuery" placeholder="Dil ara..." style="width:100%; padding:12px; margin-top:15px; border-radius:12px; border:1px solid #333; background:#111; color:#fff;">
      <div class="sheet-list" id="sheetList"></div>
    </div>
  </div>

  <script type="module" src="/js/facetoface_page.js"></script>

</body>
</html>
