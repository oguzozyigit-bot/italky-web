<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>italkyAI • Neural Scanner</title>
  
  <style>
    :root {
      --ai-gradient: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
      --glass: rgba(255, 255, 255, 0.05);
      --border: rgba(255, 255, 255, 0.1);
      /* Shell yüksekliği ile senkronize */
      --header-h: 74px;
      --footer-h: 92px;
    }

    /* ✅ TAM EKRAN VE SHELL DÜZENİ */
    #pageContent {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #030014;
      overflow: hidden;
    }

    /* --- 1. PREMIUM HEADER (ÜST BAR) --- */
    .premium-header {
      height: var(--header-h);
      padding: calc(10px + env(safe-area-inset-top)) 18px 10px;
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(10, 10, 30, 0.4);
      backdrop-filter: blur(30px);
      border-bottom: 1px solid var(--border);
      z-index: 1000;
    }
    
    .brand-hub { cursor: pointer; display: flex; flex-direction: column; }
    .brand-hub h1 { font-family: 'Space Grotesk', sans-serif; font-size: 24px; margin: 0; display: flex; align-items: flex-end; gap: 2px; }
    .brand-hub h1 span.ai { background: var(--ai-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .brand-slogan { font-size: 8px; font-weight: 900; letter-spacing: 3px; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-top: 2px; }

    .user-pill { display: flex; align-items: center; gap: 10px; }
    .u-meta { text-align: right; }
    .u-name { font-weight: 900; font-size: 13px; color: #fff; }
    .u-plan { font-size: 10px; color: #6366f1; font-weight: 800; }
    .avatar-circle { width: 38px; height: 38px; border-radius: 50%; border: 2px solid #6366f1; overflow: hidden; }
    .avatar-circle img { width: 100%; height: 100%; object-fit: cover; }

    /* --- 2. NEURAL SCANNER (ANA ALAN) --- */
    .scanner-stage {
      flex: 1;
      position: relative;
      background: #000;
      overflow: hidden;
    }

    /* Kamera Kontrolleri (Kameranın Üstünde Yüzer) */
    .scanner-tools {
      position: absolute; top: 15px; left: 15px; right: 15px;
      z-index: 50; display: flex; gap: 8px;
    }
    .pill-select {
      flex: 1; height: 46px; border-radius: 16px; border: 1px solid var(--border);
      background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
      color: #fff; font-weight: 900; font-size: 13px;
      display: flex; align-items: center; justify-content: space-between; padding: 0 15px;
      cursor: pointer;
    }
    .btn-action {
      padding: 0 15px; height: 46px; border-radius: 16px; border: none;
      background: var(--ai-gradient); color: #000; font-weight: 1000; font-size: 12px;
      cursor: pointer;
    }

    video#cam { width: 100%; height: 100%; object-fit: cover; }
    canvas#overlay { position: absolute; inset: 0; pointer-events: none; }

    .scanner-hint {
      position: absolute; bottom: 20px; left: 20px; right: 20px;
      background: rgba(0,0,0,0.6); padding: 14px; border-radius: 18px;
      border: 1px solid var(--border); backdrop-filter: blur(15px);
      font-size: 11px; font-weight: 800; color: #a5b4fc; text-align: center;
      line-height: 1.4;
    }

    /* --- 3. PREMIUM FOOTER (ALT BAR) --- */
    .premium-footer {
      height: var(--footer-h);
      padding: 10px 18px calc(10px + env(safe-area-inset-bottom));
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(10, 10, 30, 0.4);
      backdrop-filter: blur(30px);
      border-top: 1px solid var(--border);
      z-index: 1000;
    }
    .footer-signature { font-size: 11px; font-weight: 900; color: rgba(255,255,255,0.25); letter-spacing: 1.5px; }

    /* Açılır Pencere (Modal) */
    .sheet-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      z-index: 5000; display: none; align-items: center; justify-content: center; padding: 25px;
      backdrop-filter: blur(10px);
    }
    .neural-sheet { 
      width: 100%; max-width: 400px; background: #050510; 
      border-radius: 30px; border: 1px solid var(--border); overflow: hidden; 
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }
  </style>
</head>

<body>
  <div id="pageContent">

    <header class="premium-header">
      <div class="brand-hub" onclick="location.href='/pages/home.html'">
        <h1>italky<span class="ai">AI</span></h1>
        <div class="brand-slogan">BE FREE</div>
      </div>
      
      <div class="user-pill">
        <div class="u-meta">
          <div id="userName" class="u-name">Yükleniyor...</div>
          <div class="u-plan">PREMIUM HUB</div>
        </div>
        <div class="avatar-circle">
          <img id="userPic" src="">
        </div>
      </div>
    </header>

    <main class="scanner-stage">
      <div class="scanner-tools">
        <div class="pill-select" id="toLangBtn">
          <span id="toFlag">🇹🇷</span> <span id="toLangTxt">Türkçe</span> <span style="opacity:0.5">▾</span>
        </div>
        <button class="btn-action" id="speakBtn">SAY</button>
        <button class="btn-action" id="scanBtn" style="background:#fff">SCAN</button>
      </div>

      <video id="cam" playsinline autoplay muted></video>
      <canvas id="overlay"></canvas>

      <div class="scanner-hint">
        Yazının üzerine <b>parmağını basılı tut</b> → Anında Çeviri<br>
        Dora seslendirmesi için <b>SAY</b> butonunu kullan.
      </div>
    </main>

    <footer class="premium-footer">
      <div class="footer-signature">italkyAI @ italkyAcedemia By Ozyigit's</div>
    </footer>

  </div>

  <div class="sheet-overlay" id="langSheet">
    <div class="neural-sheet">
      <div style="padding:20px; border-bottom:1px solid var(--border); font-weight:1000; color:#fff; font-size:14px; letter-spacing:1px; text-align:center;">HEDEF DİL ANALİZİ</div>
      <div id="sheetList" style="max-height:350px; overflow-y:auto; padding:15px;"></div>
      <button onclick="document.getElementById('langSheet').style.display='none'" style="width:100%; padding:20px; background:rgba(255,255,255,0.03); border:none; color:#ec4899; font-weight:1000; cursor:pointer;">KAPAT</button>
    </div>
  </div>

  <script type="module">
    import { supabase } from "/js/supabase_client.js";

    async function initScannerUI() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const cached = JSON.parse(localStorage.getItem('italky_user_v1') || '{}');
        document.getElementById('userName').textContent = cached.name?.split(' ')[0] || "User";
        if(cached.picture) document.getElementById('userPic').src = cached.picture;
      }
    }

    document.getElementById('toLangBtn').onclick = () => {
      document.getElementById('langSheet').style.display = 'flex';
    };

    initScannerUI();
  </script>

  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
  <script type="module" src="/js/photo_page.js?v=HYPER"></script>
</body>
</html>
