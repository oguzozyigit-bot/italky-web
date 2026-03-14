<!-- FILE: /pages/alltoall_room.html -->
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
  <title>italkyAI • AllToAll Room</title>

  <meta name="theme-color" content="#030014">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">

  <style>
    :root{
      --ai-grad: linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%);
      --glass: rgba(255,255,255,.05);
      --glass-border: rgba(255,255,255,.12);
      --muted: rgba(255,255,255,.58);
      --panel: rgba(255,255,255,.04);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --footerSafe: var(--footerH, 0px);
    }

    *{
      box-sizing:border-box;
      -webkit-tap-highlight-color:transparent;
      outline:none;
    }

    html,body{
      margin:0;
      width:100%;
      height:100%;
      overflow:hidden;
      background:#000;
      color:#fff;
      font-family:'Outfit',sans-serif;
    }

    body{
      background:
        radial-gradient(circle at 50% 14%, rgba(99,102,241,.20), transparent 34%),
        radial-gradient(circle at 80% 18%, rgba(236,72,153,.12), transparent 24%),
        radial-gradient(circle at 20% 75%, rgba(96,165,250,.10), transparent 28%),
        linear-gradient(180deg,#05030d 0%, #090514 48%, #04020a 100%);
    }

    #pageContent{
      width:100%;
      height:calc(100dvh - var(--footerSafe));
      display:flex;
      flex-direction:column;
      min-height:0;
      overflow:hidden;
    }

    .room-shell{
      flex:1;
      display:flex;
      flex-direction:column;
      min-height:0;
      width:100%;
      max-width:520px;
      margin:0 auto;
      backdrop-filter:blur(18px);
      -webkit-backdrop-filter:blur(18px);
      background:rgba(8,8,20,.34);
      border-left:1px solid rgba(255,255,255,.06);
      border-right:1px solid rgba(255,255,255,.06);
      overflow:hidden;
    }

    .topbar{
      height:70px;
      flex:0 0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:0 14px;
      border-bottom:1px solid var(--glass-border);
      background:rgba(0,0,0,.26);
    }

    .nav-btn{
      width:42px;
      height:42px;
      border-radius:14px;
      border:1px solid var(--glass-border);
      background:var(--glass);
      color:#fff;
      font-weight:1000;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:18px;
    }

    .nav-btn:active{ transform:scale(.96); }

    .brand{
      text-align:center;
      line-height:1.05;
    }

    .brand-name{
      font-family:'Space Grotesk',sans-serif;
      font-size:18px;
      font-weight:700;
      color:#fff;
    }

    .brand-name span{
      background:var(--ai-grad);
      -webkit-background-clip:text;
      -webkit-text-fill-color:transparent;
    }

    .brand-sub{
      font-size:8px;
      color:rgba(255,255,255,.34);
      font-weight:900;
      letter-spacing:2px;
      margin-top:4px;
    }

    .roombar{
      height:46px;
      flex:0 0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:0 14px;
      border-bottom:1px solid var(--glass-border);
      background:rgba(255,255,255,.02);
    }

    .room-left{
      min-width:0;
      display:flex;
      align-items:center;
      gap:8px;
      font-size:11px;
      font-weight:900;
      color:var(--muted);
    }

    .room-pill{
      max-width:160px;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      border-radius:12px;
      border:1px solid var(--glass-border);
      background:rgba(0,0,0,.22);
      padding:5px 10px;
      color:#fff;
      font-family:ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size:11px;
      letter-spacing:1.2px;
      font-weight:1000;
      cursor:pointer;
      user-select:none;
    }

    .lang-select{
      height:30px;
      max-width:152px;
      border-radius:10px;
      border:1px solid var(--glass-border);
      background:rgba(0,0,0,.26);
      color:#c7d2fe;
      font-size:11px;
      font-weight:900;
      padding:0 8px;
    }

    .peoplebar{
      height:62px;
      flex:0 0 auto;
      display:flex;
      align-items:center;
      gap:10px;
      padding:0 14px;
      border-bottom:1px solid var(--glass-border);
      background:rgba(255,255,255,.015);
    }

    .people-count{
      min-width:20px;
      text-align:center;
      font-size:12px;
      font-weight:1000;
      color:#818cf8;
    }

    .people-scroll{
      flex:1;
      display:flex;
      gap:10px;
      overflow-x:auto;
      scrollbar-width:none;
    }

    .people-scroll::-webkit-scrollbar{ display:none; }

    .pItem{
      flex:0 0 auto;
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:4px;
    }

    .pAvatar{
      width:34px;
      height:34px;
      border-radius:50%;
      border:1.5px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.06);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:10px;
      font-weight:1000;
      color:#fff;
      overflow:hidden;
    }

    .pAvatar img{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
    }

    .pName{
      max-width:48px;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      font-size:9px;
      font-weight:800;
      color:rgba(255,255,255,.46);
    }

    .chat-area{
      flex:1;
      min-height:0;
      overflow-y:auto;
      padding:16px;
      display:flex;
      flex-direction:column;
      gap:16px;
      scrollbar-width:none;
      -webkit-overflow-scrolling:touch;
    }

    .chat-area::-webkit-scrollbar{ display:none; }

    .msg-row{
      display:flex;
      flex-direction:column;
      max-width:86%;
    }

    .msg-row.left{
      align-self:flex-start;
    }

    .msg-row.right{
      align-self:flex-end;
      align-items:flex-end;
    }

    .sender-name{
      font-size:10px;
      font-weight:900;
      color:rgba(255,255,255,.44);
      margin-bottom:4px;
      text-transform:uppercase;
      letter-spacing:.5px;
    }

    .msg-bubble{
      padding:10px 15px;
      border-radius:20px;
      font-size:15px;
      line-height:1.45;
      white-space:pre-wrap;
      word-break:break-word;
      border:1px solid var(--glass-border);
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
      position:relative;
    }

    .msg-row.left .msg-bubble{
      background:rgba(255,255,255,.05);
      border-bottom-left-radius:6px;
      border-left:3px solid rgba(99,102,241,.45);
    }

    .msg-row.right .msg-bubble{
      background:linear-gradient(135deg, rgba(86,17,79,.58) 0%, rgba(45,7,28,.74) 100%);
      border-bottom-right-radius:6px;
      border-right:3px solid rgba(236,72,153,.45);
      color:#ffe4f3;
    }

    .dock{
      flex:0 0 auto;
      padding:10px 14px calc(10px + var(--safe-bottom));
      border-top:1px solid var(--glass-border);
      background:rgba(0,0,0,.45);
      backdrop-filter:blur(22px);
      -webkit-backdrop-filter:blur(22px);
    }

    .dock-inner{
      min-height:58px;
      border-radius:28px;
      border:1px solid var(--glass-border);
      background:rgba(255,255,255,.05);
      display:flex;
      align-items:flex-end;
      gap:10px;
      padding:7px 8px 7px 14px;
    }

    #msgInput{
      flex:1;
      border:none;
      background:transparent;
      color:#fff;
      resize:none;
      font-size:15px;
      line-height:18px;
      max-height:120px;
      min-height:26px;
      padding:9px 0;
      font-family:inherit;
      overflow:auto;
    }

    #msgInput::placeholder{
      color:rgba(255,255,255,.36);
    }

    .dock-btns{
      display:flex;
      gap:8px;
      align-items:center;
      flex:0 0 auto;
    }

    .circle-btn{
      width:44px;
      height:44px;
      border-radius:16px;
      border:1px solid var(--glass-border);
      background:rgba(0,0,0,.18);
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      padding:0;
      flex:0 0 auto;
    }

    .circle-btn:active{ transform:scale(.96); }

    .circle-btn svg{
      width:22px;
      height:22px;
      stroke:#fff;
      fill:none;
      stroke-width:2;
      stroke-linecap:round;
      stroke-linejoin:round;
      opacity:.92;
    }

    #micBtn.listening{
      background:rgba(239,68,68,.20);
      border-color:rgba(239,68,68,.38);
      box-shadow:0 0 18px rgba(239,68,68,.22);
    }

    @media (max-width:390px){
      .msg-bubble{ font-size:14px; }
      .room-pill{ max-width:126px; }
      .lang-select{ max-width:128px; }
    }
  </style>
</head>

<body>
  <main id="pageContent">
    <div class="room-shell">

      <header class="topbar">
        <button class="nav-btn" id="backBtn" type="button">←</button>

        <div class="brand">
          <div class="brand-name">All<span>To</span>All</div>
          <div class="brand-sub">LIVE CHANNEL</div>
        </div>

        <button class="nav-btn" id="exitBtn" type="button">✕</button>
      </header>

      <div class="roombar">
        <div class="room-left">
          ODA:
          <div class="room-pill" id="roomPill">------</div>
        </div>

        <select class="lang-select" id="langSelect"></select>
      </div>

      <div class="peoplebar">
        <div class="people-count" id="peopleCount">1</div>
        <div class="people-scroll" id="peopleScroll"></div>
      </div>

      <div class="chat-area" id="chat"></div>

      <footer class="dock">
        <div class="dock-inner">
          <textarea id="msgInput" rows="1" placeholder="Yaz ya da konuş…"></textarea>

          <div class="dock-btns">
            <button class="circle-btn" id="micBtn" type="button" aria-label="Mikrofon">
              <svg viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>

            <button class="circle-btn" id="sendBtn" type="button" aria-label="Gönder">
              <svg viewBox="0 0 24 24">
                <path d="M22 2L11 13"></path>
                <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
              </svg>
            </button>
          </div>
        </div>
      </footer>

    </div>
  </main>

  <script type="module">
    import { mountShell } from "/js/ui_shell.js";
    try { mountShell({ scroll:"none" }); } catch(e) { console.warn("[alltoall room shell]", e); }
  </script>

  <script type="module" src="/js/alltoall_room.js?v=2"></script>
</body>
</html>
