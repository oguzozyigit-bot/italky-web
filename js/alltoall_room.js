<!-- FILE: /pages/alltoall_room.html -->
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
  <title>italkyAI • AllToAll Room</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">

  <style>
    :root{
      --topH:70px;
      --metaH:92px;
      --peopleH:112px;
      --dockH:108px;
      --accent:#00f2fe;
      --pink:#f472b6;
      --violet:#7c5cff;
      --line:rgba(255,255,255,.08);
    }

    *{
      box-sizing:border-box;
      -webkit-tap-highlight-color:transparent;
      outline:none;
    }

    html,body{
      margin:0;
      padding:0;
      width:100%;
      height:100%;
      background:#050208;
      color:#fff;
      font-family:'Outfit',sans-serif;
      overflow:hidden;
      position:fixed;
    }

    body{
      background:
        radial-gradient(circle at 50% 0%, rgba(0,242,254,.12) 0%, transparent 24%),
        radial-gradient(circle at 15% 18%, rgba(244,114,182,.10) 0%, transparent 20%),
        radial-gradient(circle at 85% 14%, rgba(124,92,255,.12) 0%, transparent 18%),
        linear-gradient(180deg,#050208 0%,#090411 100%);
    }

    .room{
      position:relative;
      width:min(500px,100vw);
      height:100dvh;
      margin:0 auto;
      display:flex;
      flex-direction:column;
      background:transparent;
      overflow:hidden;
    }

    .topbar{
      height:var(--topH);
      display:flex;
      align-items:center;
      padding:0 16px;
      border-bottom:1px solid rgba(255,255,255,.05);
      backdrop-filter:blur(10px);
      flex:0 0 auto;
    }

    .topBtn{
      background:none;
      border:none;
      color:#fff;
      font-size:20px;
      width:42px;
      height:42px;
      border-radius:50%;
      cursor:pointer;
      flex:0 0 auto;
    }

    .brand{
      flex:1;
      text-align:center;
      font-family:'Space Grotesk',sans-serif;
      font-weight:700;
      font-size:22px;
      letter-spacing:-.4px;
    }

    .brand .accent{ color:var(--accent); }

    .meta{
      min-height:var(--metaH);
      display:flex;
      flex-direction:column;
      justify-content:center;
      gap:10px;
      padding:10px 16px 12px;
      background:rgba(255,255,255,.02);
      border-bottom:1px solid rgba(255,255,255,.05);
      flex:0 0 auto;
    }

    .metaTop{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
    }

    #roomPill{
      background:linear-gradient(135deg,#7000ff,#9b5cff);
      padding:6px 16px;
      border-radius:12px;
      font-weight:900;
      font-size:20px;
      letter-spacing:1px;
      min-width:110px;
      text-align:center;
      cursor:pointer;
      box-shadow:0 0 16px rgba(112,0,255,.24);
      flex:0 0 auto;
    }

    .metaRight{
      display:flex;
      align-items:center;
      gap:8px;
      min-width:0;
    }

    #langSelect{
      height:38px;
      min-width:136px;
      max-width:180px;
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.10);
      border-radius:10px;
      color:#fff;
      font-size:13px;
      font-weight:700;
      padding:0 10px;
      cursor:pointer;
    }

    #langSelect option{ color:#000; }

    #soundToggleBtn{
      width:38px;
      height:38px;
      border-radius:10px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.08);
      color:#fff;
      font-size:16px;
      cursor:pointer;
      flex:0 0 auto;
    }

    .roomInfoRow{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }

    .room-info{
      font-size:11px;
      color:var(--accent);
      font-weight:800;
      line-height:1.35;
      opacity:.95;
    }

    .peopleCountWrap{
      font-size:11px;
      color:rgba(255,255,255,.72);
      font-weight:800;
      white-space:nowrap;
      flex:0 0 auto;
    }

    .people{
      height:var(--peopleH);
      padding:10px 0;
      border-bottom:1px solid rgba(255,255,255,.05);
      flex:0 0 auto;
      overflow:hidden;
    }

    .people-scroll{
      display:flex;
      gap:15px;
      overflow-x:auto;
      overflow-y:hidden;
      padding:0 16px;
      scrollbar-width:none;
      align-items:flex-start;
    }

    .people-scroll::-webkit-scrollbar{ display:none; }

    .pItem{
      display:flex;
      flex-direction:column;
      align-items:center;
      min-width:68px;
      max-width:78px;
      flex:0 0 auto;
    }

    .pAvatar{
      width:48px;
      height:48px;
      border-radius:50%;
      border:2px solid rgba(255,255,255,.10);
      overflow:hidden;
      display:flex;
      align-items:center;
      justify-content:center;
      background:rgba(255,255,255,.06);
      font-size:14px;
      font-weight:900;
      flex:0 0 auto;
    }

    .pAvatar img{
      width:100%;
      height:100%;
      object-fit:cover;
    }

    .pName{
      font-size:10px;
      font-weight:800;
      margin-top:6px;
      text-align:center;
      line-height:1.15;
      white-space:normal;
      word-break:break-word;
      max-width:100%;
      color:rgba(255,255,255,.92);
    }

    .chat{
      flex:1;
      overflow-y:auto;
      padding:15px 16px;
      display:flex;
      flex-direction:column;
      gap:18px;
      scrollbar-width:none;
      min-height:0;
    }

    .chat::-webkit-scrollbar{ display:none; }

    .sys-note{
      align-self:center;
      max-width:88%;
      padding:8px 12px;
      border-radius:999px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.06);
      color:rgba(255,255,255,.78);
      font-size:11px;
      font-weight:800;
      text-align:center;
    }

    .msg-row{
      max-width:90%;
      display:flex;
      flex-direction:column;
      position:relative;
    }

    .msg-row.left{
      align-self:flex-start;
      padding-left:14px;
    }

    .msg-row.right{
      align-self:flex-end;
      padding-right:14px;
      align-items:flex-end;
    }

    .sender-name{
      font-size:12px;
      font-weight:900;
      margin-bottom:4px;
      letter-spacing:.3px;
      color:rgba(255,255,255,.74);
    }

    .msg-bubble{
      font-size:14.5px;
      line-height:1.5;
      color:rgba(255,255,255,.95);
      background:rgba(255,255,255,.04);
      padding:10px 14px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.06);
      word-break:break-word;
    }

    .msg-row.right .msg-bubble{
      background:linear-gradient(135deg,rgba(0,242,254,.16),rgba(124,92,255,.18));
    }

    .msg-actions{
      display:flex;
      justify-content:flex-start;
      padding-left:2px;
      margin-top:6px;
    }

    .mini-btn{
      width:32px;
      height:32px;
      border:none;
      border-radius:50%;
      background:rgba(255,255,255,.08);
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
    }

    .mini-btn svg{
      width:16px;
      height:16px;
      stroke:#fff;
      fill:none;
      stroke-width:2;
    }

    .input{
      min-height:var(--dockH);
      background:#0a0510;
      border-top:1px solid rgba(255,255,255,.10);
      display:flex;
      flex-direction:column;
      justify-content:center;
      gap:10px;
      padding:10px 12px calc(10px + env(safe-area-inset-bottom));
      z-index:1000;
      flex:0 0 auto;
    }

    .mic-only-row{
      display:flex;
      align-items:center;
      justify-content:center;
      gap:12px;
    }

    .mic-side-btn{
      width:42px;
      height:42px;
      border:none;
      border-radius:14px;
      background:rgba(255,255,255,.07);
      color:#fff;
      font-size:18px;
      cursor:pointer;
      flex:0 0 auto;
    }

    .main-mic{
      width:72px;
      height:72px;
      border:none;
      border-radius:50%;
      background:linear-gradient(135deg,var(--accent),var(--violet),var(--pink));
      color:#050208;
      font-size:28px;
      font-weight:900;
      cursor:pointer;
      box-shadow:0 10px 30px rgba(0,242,254,.24);
      flex:0 0 auto;
      display:flex;
      align-items:center;
      justify-content:center;
    }

    .main-mic.listening{
      box-shadow:0 0 0 8px rgba(244,114,182,.16), 0 0 28px rgba(244,114,182,.28);
      transform:scale(1.04);
    }

    .mic-hint{
      text-align:center;
      font-size:11px;
      font-weight:800;
      color:rgba(255,255,255,.72);
      line-height:1.3;
    }

    .text-entry{
      display:none;
      align-items:center;
      gap:8px;
    }

    .text-entry.show{
      display:flex;
    }

    textarea{
      flex:1;
      min-height:44px;
      max-height:140px;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.10);
      border-radius:20px;
      color:#fff;
      padding:12px 16px;
      font-size:15px;
      resize:none;
      font-family:'Outfit',sans-serif;
      overflow:auto;
    }

    textarea::placeholder{
      color:rgba(255,255,255,.42);
    }

    .dock-btn{
      width:44px;
      height:44px;
      border-radius:50%;
      border:none;
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      color:#fff;
      flex:0 0 auto;
    }

    .send-btn{
      background:var(--accent);
      color:#000;
      font-size:18px;
      font-weight:900;
    }
  </style>
</head>

<body>
<div class="room" id="roomContainer">

  <div class="topbar">
    <button id="backBtn" class="topBtn" type="button">←</button>
    <div class="brand">All<span class="accent">To</span>All</div>
    <button id="exitBtn" class="topBtn" type="button">✕</button>
  </div>

  <div class="meta">
    <div class="metaTop">
      <div id="roomPill">------</div>

      <div class="metaRight">
        <select id="langSelect" aria-label="Dil seç">
          <option value="tr">🇹🇷 Türkçe</option>
          <option value="en">🇬🇧 English</option>
          <option value="de">🇩🇪 Deutsch</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="it">🇮🇹 Italiano</option>
          <option value="es">🇪🇸 Español</option>
        </select>

        <button id="soundToggleBtn" type="button" aria-label="Ses">🔊</button>
      </div>
    </div>

    <div class="roomInfoRow">
      <div class="room-info">Bu kodu sohbete katılmak isteyenlere veriniz.</div>
      <div class="peopleCountWrap"><span id="peopleCount">0</span> kişi</div>
    </div>
  </div>

  <div class="people">
    <div class="people-scroll" id="peopleScroll"></div>
  </div>

  <div class="chat" id="chat"></div>

  <div class="input" id="inputDock">
    <div class="mic-only-row">
      <button id="textToggleBtn" class="mic-side-btn" type="button" aria-label="Yazı aç">⌨️</button>
      <button id="micBtn" class="main-mic" type="button" aria-label="Konuş">🎙️</button>
      <button id="sendBtn" class="mic-side-btn" type="button" aria-label="Gönder">➤</button>
    </div>

    <div class="mic-hint" id="micHint">Konuşmak için mikrofona dokun. Yazmak istersen klavye simgesine bas.</div>

    <div class="text-entry" id="textEntry">
      <textarea id="msgInput" rows="1" placeholder="Yazmaya başla..."></textarea>
    </div>
  </div>
</div>

<script>
  const room = document.getElementById("roomContainer");
  const chat = document.getElementById("chat");
  const msgInput = document.getElementById("msgInput");
  const textToggleBtn = document.getElementById("textToggleBtn");
  const textEntry = document.getElementById("textEntry");

  function fixLayout() {
    try {
      if (window.visualViewport) {
        const vh = window.visualViewport.height;
        room.style.height = `${vh}px`;
        setTimeout(() => {
          try { chat.scrollTop = chat.scrollHeight; } catch {}
        }, 100);
      }
    } catch {}
  }

  function toggleTextEntry() {
    if (!textEntry) return;
    textEntry.classList.toggle("show");
    if (textEntry.classList.contains("show")) {
      setTimeout(() => {
        try { msgInput.focus(); } catch {}
        fixLayout();
      }, 80);
    } else {
      try { msgInput.blur(); } catch {}
      fixLayout();
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fixLayout);
    window.visualViewport.addEventListener("scroll", fixLayout);
  }

  window.addEventListener("resize", fixLayout);
  window.addEventListener("orientationchange", fixLayout);

  textToggleBtn?.addEventListener("click", toggleTextEntry);

  msgInput?.addEventListener("focus", () => {
    setTimeout(fixLayout, 120);
    setTimeout(fixLayout, 260);
    setTimeout(fixLayout, 420);
  });

  msgInput?.addEventListener("blur", () => {
    setTimeout(fixLayout, 120);
  });

  msgInput?.addEventListener("input", function () {
    this.style.height = "44px";
    this.style.height = Math.min(this.scrollHeight, 140) + "px";
  });

  fixLayout();
</script>

<script type="module" src="/js/alltoall_room.js?v=mic_first_1"></script>
</body>
</html>
