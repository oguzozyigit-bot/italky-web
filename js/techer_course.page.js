<!-- FILE: /pages/teacher_course.html -->
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>italkyAI • Teacher Course</title>
  <link rel="icon" href="data:," />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800;900&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">

  <style>
    :root{
      --frameW: min(480px, calc(100vw - 18px));
      --topH: 86px;
      --footerH: 66px;
      --dockH: 70px;

      --bg:#030014;
      --text: rgba(255,255,255,.92);
      --muted: rgba(255,255,255,.60);
      --border: rgba(255,255,255,.10);

      --ai1:#A5B4FC;
      --ai2:#4F46E5;
      --befree:#6B7280;

      --card: rgba(0,0,0,.18);
    }

    *{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; outline:none; }
    html,body{
      margin:0; padding:0; width:100%; height:100dvh;
      overflow:hidden; position:fixed;
      font-family:'Outfit', sans-serif;
      background:var(--bg);
      color:var(--text);
      display:flex; align-items:center; justify-content:center;
    }

    .cosmos-bg{ position:absolute; inset:-50%; width:200%; height:200%; background:var(--bg); z-index:0; pointer-events:none; }
    .orb{ position:absolute; border-radius:50%; filter: blur(90px); opacity:.28; animation: floatOrbit 30s infinite alternate ease-in-out; }
    .orb-1{ top:10%; left:10%; width:60vw; height:60vw; background: radial-gradient(circle, rgba(79,70,229,.55), transparent 70%); }
    .orb-2{ bottom:10%; right:10%; width:50vw; height:50vw; background: radial-gradient(circle, rgba(165,180,252,.45), transparent 70%); animation-delay:-5s; }
    @keyframes floatOrbit{ 0%{ transform: translate(0,0) scale(1);} 100%{ transform: translate(10%,-10%) scale(1.1);} }
    .noise{
      position:absolute; inset:0;
      background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events:none; mix-blend-mode:overlay; z-index:1;
    }

    .mobile-frame{
      width:100%; max-width:480px; height:100%;
      position:relative; z-index:10;
      background: rgba(8, 8, 20, 0.65);
      backdrop-filter: blur(25px);
      overflow:hidden;
      display:flex; flex-direction:column;
    }

    /* TOPBAR */
    .topbar{
      position: sticky; top:0; z-index: 3000;
      height: var(--topH);
      display:flex; align-items:center; justify-content:space-between;
      padding: 10px 12px 0;
      border-bottom:1px solid rgba(255,255,255,.08);
      background: rgba(0,0,0,.35);
      backdrop-filter: blur(12px);
    }

    .backBtn{
      width:auto;
      min-width:88px;
      padding:0 14px;
      height:44px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.18);
      color:#fff;
      display:flex;align-items:center;justify-content:center;
      gap:10px;
      cursor:pointer; user-select:none;
    }
    .backBtn:active{ transform: scale(.96); }
    .backBtn .arr{ font-size:22px; font-weight:1000; line-height:1; }
    .backBtn .lbl{ font-size:12px; font-weight:1000; letter-spacing:.4px; opacity:.92; }

    .mini-brand{display:flex;flex-direction:column;align-items:center;line-height:1;cursor:pointer; user-select:none;}
    .logo-line{font-family:'Space Grotesk', sans-serif;font-size:20px;display:flex;gap:2px}
    .logo-ai{background:linear-gradient(135deg,var(--ai1),var(--ai2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .logo-slogan{font-size:10px;font-weight:900;letter-spacing:4px;color:var(--befree);margin-top:6px;text-transform:uppercase}

    .rightMeta{display:flex;flex-direction:column;align-items:flex-end;gap:2px;max-width:220px}
    .tName{font-weight:1000;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tInfo{font-weight:900;font-size:12px;color:rgba(255,255,255,.68);white-space:nowrap}

    /* mini cloud status */
    .statusMini{
      position:absolute; left:50%; transform:translateX(-50%);
      top: 92px;
      z-index:2500;
      padding: 6px 10px;
      border-radius: 999px;
      border:1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,.22);
      backdrop-filter: blur(12px);
      font-weight:1000;
      font-size:10px;
      letter-spacing:1.2px;
      color:rgba(255,255,255,.85);
      display:flex; align-items:center; gap:8px;
      pointer-events:none;
      opacity:.92;
    }
    .dots{display:flex;gap:4px}
    .dot{width:5px;height:5px;border-radius:99px;background:rgba(165,180,252,.75);animation:b 1s infinite ease-in-out;}
    .dot:nth-child(2){animation-delay:.12s}
    .dot:nth-child(3){animation-delay:.24s}
    @keyframes b{0%,100%{transform:translateY(0);opacity:.8}50%{transform:translateY(-4px);opacity:1}}

    /* chat area */
    #chat{
      position:absolute; left:0; right:0;
      top: calc(var(--topH) + 44px);
      bottom: calc(var(--dockH) + var(--footerH) + 10px);
      padding: 16px 14px 24px;
      overflow-y:auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      scrollbar-width:none;
      display:flex;flex-direction:column;gap:10px;
      z-index:1200; /* ✅ dock'un altında kalsın */
    }
    #chat::-webkit-scrollbar{display:none}
    #chat::before{content:"";flex:1 0 auto;}

    .bubble{
      max-width:92%;
      padding:12px 14px;
      border-radius:18px;
      font-size:16px;
      line-height:1.5;
      border:1px solid rgba(255,255,255,.10);
      background: var(--card);
      box-shadow: 0 12px 28px rgba(0,0,0,.22);
      backdrop-filter: blur(8px);
      white-space: pre-wrap;
      word-break: break-word;
      position: relative;
    }
    .bubble.teacher{
      align-self:flex-start;
      border-left:4px solid var(--ai2);
      background: rgba(79,70,229,.12);
      padding-right: 52px; /* hoparlör alanı */
    }
    .bubble.student{
      align-self:flex-end;
      border-right:4px solid var(--befree);
      background: rgba(107,114,128,.14);
      text-align:right;
    }
    .bubble.tr{
      align-self:flex-start;
      opacity:.85;
      font-size:13px;
      background: rgba(255,255,255,.04);
      border-color: rgba(255,255,255,.08);
      color: rgba(255,255,255,.78);
    }

    /* speaker button */
    .spkBtn{
      position:absolute;
      right:10px;
      top:10px;
      width:34px; height:34px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.14);
      background: rgba(0,0,0,.18);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer;
    }
    .spkBtn svg{ width:18px; height:18px; stroke:#fff; fill:none; stroke-width:2.2; opacity:.9; }
    .spkBtn:active{ transform: scale(.96); }

    /* bottom controls */
    .dock{
      position:fixed; left:50%; transform:translateX(-50%);
      width: var(--frameW);
      bottom: var(--footerH);
      z-index:2600;           /* ✅ her şeyin üstünde */
      padding: 10px 12px;
      background: rgba(0,0,0,.32);
      border-top: 1px solid rgba(255,255,255,.08);
      backdrop-filter: blur(12px);
      pointer-events:auto;    /* ✅ tıklamayı garantiye al */
    }
    .dockInner{
      width:100%;
      display:flex;align-items:center;justify-content:space-between;gap:10px;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 22px;
      padding: 8px;
    }
    .btnMain{
      flex:1;
      height:52px;
      border-radius:18px;
      border:none;
      cursor:pointer;
      font-weight:1000;
      font-size:14px;
      color:#fff;
      background: linear-gradient(135deg, #A5B4FC, #4F46E5);
      box-shadow: 0 14px 40px rgba(79,70,229,.18);
    }
    .btnMain:active{transform:scale(.99)}
    .pill{
      height:52px;
      min-width:64px;
      padding:0 12px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.18);
      color:rgba(255,255,255,.9);
      font-weight:1000;
      font-size:12px;
      display:flex;align-items:center;justify-content:center;
      white-space:nowrap;
    }

    .footerbar{
      position:fixed; left:50%; transform:translateX(-50%);
      width: var(--frameW);
      bottom:0;
      height: var(--footerH);
      z-index:2400;
      padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
      background: rgba(3, 0, 20, 0.95);
      border-top: 1px solid rgba(255,255,255,.05);
      backdrop-filter: blur(10px);
      display:flex;align-items:center;justify-content:center;
      color: rgba(255,255,255,.22);
      font-weight:800;font-size:10px;
      pointer-events:none;
    }
  </style>
</head>

<body>
  <div class="cosmos-bg"><div class="orb orb-1"></div><div class="orb orb-2"></div></div>
  <div class="noise"></div>

  <div class="mobile-frame">
    <div class="topbar">
      <button class="backBtn" id="backBtn" aria-label="Geri">
        <span class="arr">←</span><span class="lbl">Geri</span>
      </button>

      <div class="mini-brand" id="logoHome" title="Ana sayfa">
        <div class="logo-line"><span>italky</span><span class="logo-ai">AI</span></div>
        <div class="logo-slogan">TEACHER</div>
      </div>

      <div class="rightMeta">
        <div class="tName" id="teacherName">Teacher</div>
        <div class="tInfo" id="lessonInfo">—</div>
      </div>
    </div>

    <div class="statusMini" id="statusMini">
      <span id="statusText">READY</span>
      <span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
    </div>

    <div id="chat"></div>

    <div class="dock">
      <div class="dockInner">
        <button class="btnMain" id="btnLesson" type="button">Dersi Başlat</button>
        <div class="pill" id="pillTry">●●●</div>
        <div class="pill" id="pillScore">95%</div>
      </div>
    </div>

    <div class="footerbar">italkyAI Teacher • 2026</div>
  </div>

  <script type="module" src="/js/teacher_course.page.js?v=1"></script>
</body>
</html>
