<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>italkyAI • Fotoğraftan Çeviri</title>
  
  <style>
    :root {
      --ai-gradient: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
      --glass: rgba(255, 255, 255, 0.05);
      --border: rgba(255, 255, 255, 0.1);
      --top-h: 74px;
      --bot-h: 80px;
    }

    /* ✅ TAM EKRAN VE SHELL UYUMU */
    #pageContent {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #030014;
      overflow: hidden;
    }

    /* --- 1. ÜST BAR (HEADER) --- */
    .neural-header {
      height: var(--top-h);
      padding-top: env(safe-area-inset-top);
      display: flex; align-items: center; justify-content: space-between;
      padding-left: 15px; padding-right: 15px;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      z-index: 100;
    }
    .back-btn {
      width: 40px; height: 40px; border-radius: 12px;
      border: 1px solid var(--border); background: var(--glass);
      color: #fff; font-size: 18px; cursor: pointer;
    }
    .brand-mini { text-align: center; pointer-events: none; }
    .brand-mini b { font-family: 'Space Grotesk', sans-serif; font-size: 20px; }
    .user-profile { display: flex; align-items: center; gap: 10px; }
    .user-profile img { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #6366f1; }

    /* --- 2. KAMERA VE ARAÇLAR (MAIN) --- */
    .camera-stage {
      flex: 1;
      position: relative;
      background: #000;
      overflow: hidden;
      display: flex; flex-direction: column;
    }

    /* Kamera Toolbar */
    .cam-toolbar {
      position: absolute; top: 15px; left: 10px; right: 10px;
      z-index: 50; display: flex; gap: 8px;
    }
    .pill-btn {
      flex: 1; height: 44px; border-radius: 14px; border: 1px solid var(--border);
      background: rgba(0,0,0,0.5); backdrop-filter: blur(10px);
      color: #fff; font-weight: 800; font-size: 12px;
      display: flex; align-items: center; justify-content: space-between; padding: 0 12px;
    }
    .action-btn {
      padding: 0 12px; height: 44px; border-radius: 14px; border: none;
      background: var(--ai-gradient); color: #000; font-weight: 1000; font-size: 11px;
    }

    video#cam { width: 100%; height: 100%; object-fit: cover; }
    canvas#overlay { position: absolute; inset: 0; pointer-events: none; }

    .scan-hint {
      position: absolute; bottom: 20px; left: 20px; right: 20px;
      background: rgba(0,0,0,0.6); padding: 12px; border-radius: 16px;
      border: 1px solid var(--border); backdrop-filter: blur(10px);
      font-size: 11px; font-weight: 700; color: #a5b4fc; text-align: center;
    }

    /* --- 3. ALT BAR (FOOTER) --- */
    .neural-footer {
      height: var(--bot-h);
      padding-bottom: env(safe-area-inset-bottom);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(20px);
      border-top: 1px solid var(--border);
      z-index: 100;
    }
    .footer-sig { font-size: 10px; font-weight: 900; color: rgba(255,255,255,0.3); letter-spacing: 1px; }

    /* Modal / Sheet */
    .backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8);
      z-index: 1000; display: none; align-items: center; justify-content: center; padding: 20px;
    }
    .sheet { width: 100%; max-width: 400px; background: #050510; border-radius: 28px; border: 1px solid var(--border); overflow: hidden; }
  </style>
</head>

<body>
  <div id="pageContent">

    <header class="neural-header">
      <button class="back-btn" onclick="location.href='/pages/home.html'">←</button>
      <div class="brand-mini">
        <b>italky<span style="color:#6366f1">AI</span></b>
        <div style="font-size:8px; letter-spacing:3px; opacity:0.5">BE FREE</div>
      </div>
      <div class="user-profile">
        <div style="text-align:right">
          <div id="userName" style="font-size:11px; font-weight:900">...</div>
          <div style="font-size:9px; color:#34d399; font-weight:800">FREE PLAN</div>
        </div>
        <img id="userPic" src="">
      </div>
    </header>

    <main class="camera-stage">
      <div class="cam-toolbar">
        <button class="pill-btn" id="toLangBtn">
          <span id="toFlag">🇹🇷</span> <span id="toLangTxt">Türkçe</span> ▾
        </button>
        <button class="action-btn" id="speakBtn">SAY</button>
        <button class="action-btn" id="scanBtn" style="background:#fff">SCAN</button>
      </div>

      <video id="cam" playsinline autoplay muted></video>
      <canvas id="overlay"></canvas>

      <div class="scan-hint">
        Yazının üzerine <b>basılı tut</b> → Çeviriyi Gör<br>
        (Dora sesi için SAY butonuna bas)
      </div>
    </main>

    <footer class="neural-footer">
      <div class="footer-sig">italkyAI BY OZYIGIT'S 2026</div>
    </footer>

  </div>

  <div class="backdrop" id="langSheet">
    <div class="sheet">
      <div style="padding:15px; border-bottom:1px solid var(--border); font-weight:900; color:#fff">HEDEF DİL SEÇİN</div>
      <div id="sheetList" style="max-height:300px; overflow-y:auto; padding:10px;"></div>
      <button onclick="document.getElementById('langSheet').style.display='none'" style="width:100%; padding:15px; background:rgba(255,255,255,0.05); border:none; color:#ec4899; font-weight:900">KAPAT</button>
    </div>
  </div>

  <script type="module">
    import { supabase } from "/js/supabase_client.js";

    async function syncProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const cached = JSON.parse(localStorage.getItem('italky_user_v1') || '{}');
        document.getElementById('userName').textContent = cached.name?.split(' ')[0] || "User";
        if(cached.picture) document.getElementById('userPic').src = cached.picture;
      }
    }

    // Dil seçimi tetikleyici
    document.getElementById('toLangBtn').onclick = () => {
      document.getElementById('langSheet').style.display = 'flex';
    };

    syncProfile();
  </script>

  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
  <script type="module" src="/js/photo_page.js?v=MAX"></script>
</body>
</html>
