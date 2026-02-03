<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>italkyAI • Sohbet AI</title>
  <link rel="icon" href="data:,">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">

  <style>
    :root{
      --frameW: min(480px, calc(100vw - 18px));
      --topH: 74px;
      --footerH: 72px;
      --dockH: 76px;

      --text: rgba(255,255,255,.92);
      --muted: rgba(255,255,255,.60);
      --border: rgba(255,255,255,.10);

      /* 🔒 KİLİTLİ PALET */
      --ai-color:#4F46E5;
      --be-free:#6B7280;
    }

    *{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
    html,body{
      margin:0; padding:0;
      width:100%; height:100dvh;
      overflow:hidden;
      font-family:'Outfit', sans-serif;
      background:#030014;
      color:var(--text);
      display:flex; align-items:center; justify-content:center;
      position:fixed;
    }

    .mobile-frame{
      width:100%; max-width:480px; height:100%;
      position:relative;
      background: rgba(8,8,20,.65);
      backdrop-filter: blur(25px);
      display:flex; flex-direction:column;
    }

    /* ================= TOP BAR ================= */
    .topbar{
      height:var(--topH);
      display:flex; align-items:center; justify-content:space-between;
      padding:0 12px;
      border-bottom:1px solid rgba(255,255,255,.08);
      background: rgba(0,0,0,.35);
      backdrop-filter: blur(12px);
    }

    .leftControls{ display:flex; align-items:center; gap:10px; }
    .backBtn{
      width:42px;height:42px;border-radius:14px;
      border:1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.18);
      color:#fff;font-size:20px;font-weight:900;
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;
    }

    .mini-brand{
      display:flex; flex-direction:column;
      line-height:1; cursor:pointer;
    }
    .logo-line{
      font-family:'Space Grotesk',sans-serif;
      font-size:20px;
      letter-spacing:-.4px;
    }
    .logo-main{ color:#fff; font-weight:700; }
    .logo-ai{
      font-weight:700;
      background: linear-gradient(135deg,#A5B4FC,#4F46E5);
      -webkit-background-clip:text;
      -webkit-text-fill-color:transparent;
    }
    .logo-slogan{
      font-size:10px;
      font-weight:700;
      letter-spacing:4px;
      color:#6B7280;
      margin-top:5px;
    }

    .rightControls{
      display:flex; align-items:center; gap:10px;
    }
    .usertext{
      display:flex; flex-direction:column; align-items:flex-end;
    }
    .uname{ font-size:12px; font-weight:900; }
    .plan{ font-size:11px; color:var(--muted); font-weight:800; }

    .avatar-btn{
      width:40px;height:40px;border-radius:999px;
      border:none;background:transparent;cursor:pointer;
      overflow:hidden;
    }
    .avatar-btn img{ width:100%;height:100%;object-fit:cover; }
    .avatar-fallback{
      width:40px;height:40px;border-radius:999px;
      display:flex;align-items:center;justify-content:center;
      background: rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.12);
      font-weight:900;
    }

    /* ================= CLEAR CHAT ================= */
    .clear-wrap{
      text-align:center;
      padding:8px 0;
      border-bottom:1px solid rgba(255,255,255,.05);
    }
    .clear-btn{
      background:none;
      border:none;
      color:var(--be-free);
      font-size:12px;
      font-weight:800;
      cursor:pointer;
      letter-spacing:.3px;
    }

    /* ================= CHAT ================= */
    #chat{
      position:absolute;
      top:calc(var(--topH) + 36px);
      bottom:calc(var(--dockH) + var(--footerH));
      left:0; right:0;
      padding:14px 12px;
      overflow-y:auto;
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .bubble{
      max-width:85%;
      padding:10px 14px;
      border-radius:16px;
      font-size:14px;
      line-height:1.45;
      background: rgba(0,0,0,.18);
      border:1px solid rgba(255,255,255,.10);
      backdrop-filter: blur(8px);
      white-space:pre-wrap;
    }
    .bubble.bot{
      align-self:flex-start;
      border-left:4px solid var(--ai-color);
    }
    .bubble.user{
      align-self:flex-end;
      text-align:right;
      border-right:4px solid var(--be-free);
    }
    .bubble.meta{
      align-self:center;
      font-size:12px;
      color:var(--muted);
      background: rgba(255,255,255,.04);
    }

    /* ================= INPUT ================= */
    .input-dock{
      position:fixed;
      bottom:var(--footerH);
      left:50%;
      transform:translateX(-50%);
      width:var(--frameW);
      padding:10px 12px;
      background: rgba(0,0,0,.32);
      border-top:1px solid rgba(255,255,255,.08);
    }
    .dock-inner{
      display:flex; gap:8px; align-items:flex-end;
      background: rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.10);
      border-radius:26px;
      padding:8px;
    }

    #msgInput{
      flex:1;
      background:none;
      border:none;
      color:#fff;
      font-size:14px;
      resize:none;
      max-height:120px;
      outline:none;
    }

    .icon-btn, .send-btn{
      width:40px;height:40px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.22);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;
    }

    .send-btn{
      border-color: rgba(107,114,128,.45);
      background: rgba(107,114,128,.22);
    }
    .send-btn svg{ stroke:#6B7280; }

    /* ================= FOOTER ================= */
    .footerbar{
      position:fixed;
      bottom:0; left:50%;
      transform:translateX(-50%);
      width:var(--frameW);
      height:var(--footerH);
      background: rgba(3,0,20,.95);
      border-top:1px solid rgba(255,255,255,.05);
      display:flex;
      flex-direction:column;
      justify-content:center;
      gap:6px;
    }
    .links{
      display:flex;
      justify-content:center;
      gap:16px;
    }
    .links a{
      color:var(--muted);
      font-size:12px;
      font-weight:800;
      text-decoration:none;
    }
    .footerBrand{
      text-align:center;
      font-size:10px;
      color: rgba(255,255,255,.22);
      font-weight:700;
    }
  </style>
</head>

<body>
<div class="mobile-frame">

  <div class="topbar">
    <div class="leftControls">
      <button class="backBtn" id="backBtn">←</button>
      <div class="mini-brand" id="logoHome">
        <div class="logo-line">
          <span class="logo-main">italky</span><span class="logo-ai">AI</span>
        </div>
        <div class="logo-slogan">BE FREE</div>
      </div>
    </div>
    <div class="rightControls">
      <div class="usertext">
        <div class="uname" id="userName">—</div>
        <div class="plan" id="userPlan">FREE</div>
      </div>
      <button class="avatar-btn" id="avatarBtn">
        <span class="avatar-fallback" id="avatarFallback">•</span>
      </button>
    </div>
  </div>

  <div class="clear-wrap">
    <button class="clear-btn" id="clearChatBtn">Sohbeti Temizle</button>
  </div>

  <div id="chat"></div>

  <div class="input-dock">
    <div class="dock-inner">
      <textarea id="msgInput" rows="1" placeholder="Sohbet AI… yaz bakalım."></textarea>
      <button class="icon-btn" id="micBtn">🎙️</button>
      <button class="send-btn" id="sendBtn">✈️</button>
    </div>
  </div>

  <div class="footerbar">
    <div class="links">
      <a href="/pages/about.html">Hakkında</a>
      <a href="/pages/faq.html">SSS</a>
      <a href="/pages/privacy.html">Gizlilik</a>
      <a href="/pages/contact.html">İletişim</a>
    </div>
    <div class="footerBrand">italkyAI By Ozyigit’s 2026</div>
  </div>

</div>

<script type="module" src="/js/italky_chat_page.js?v=4"></script>
</body>
</html>
