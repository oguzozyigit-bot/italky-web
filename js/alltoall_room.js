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
      --metaH:108px;
      --peopleH:112px;
      --dockH:108px;
      --accent:#00f2fe;
      --pink:#f472b6;
      --violet:#7c5cff;
      --line:rgba(255,255,255,.08);
      --panel:rgba(255,255,255,.06);
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
      gap:12px;
      padding:12px 16px 14px;
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
      padding:8px 18px;
      border-radius:14px;
      font-weight:900;
      font-size:22px;
      letter-spacing:1.5px;
      min-width:124px;
      text-align:center;
      cursor:pointer;
      box-shadow:0 0 18px rgba(112,0,255,.26);
      flex:0 0 auto;
      border:1px solid rgba(255,255,255,.10);
    }

    .metaRight{
      display:flex;
      align-items:center;
      gap:8px;
      min-width:0;
    }

    #langSelect{
      position:absolute;
      opacity:0;
      pointer-events:none;
      width:1px;
      height:1px;
    }

    .lang-picker-btn{
      height:40px;
      min-width:152px;
      max-width:190px;
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.10);
      border-radius:12px;
      color:#fff;
      font-size:13px;
      font-weight:800;
      padding:0 12px;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }

    .lang-picker-text{
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .lang-picker-arrow{
      opacity:.8;
      flex:0 0 auto;
    }

    #soundToggleBtn{
      width:40px;
      height:40px;
      border-radius:12px;
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
      max-width:82px;
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
      transition:transform .16s ease, box-shadow .16s ease;
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
      min-height:28px;
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

    .sheet-backdrop{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.52);
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
      opacity:0;
      pointer-events:none;
      transition:.22s ease;
      z-index:9998;
    }

    .sheet-backdrop.show{
      opacity:1;
      pointer-events:auto;
    }

    .lang-sheet{
      position:fixed;
      left:50%;
      bottom:0;
      transform:translateX(-50%) translateY(110%);
      width:min(500px,100vw);
      background:linear-gradient(180deg,rgba(20,18,30,.98),rgba(10,8,18,.98));
      border:1px solid rgba(255,255,255,.10);
      border-bottom:none;
      border-radius:28px 28px 0 0;
      box-shadow:0 -20px 60px rgba(0,0,0,.42);
      transition:.24s ease;
      z-index:9999;
      padding:10px 14px calc(18px + env(safe-area-inset-bottom));
      max-height:72dvh;
      display:flex;
      flex-direction:column;
      gap:12px;
    }

    .lang-sheet.show{
      transform:translateX(-50%) translateY(0);
    }

    .sheet-handle{
      width:52px;
      height:5px;
      border-radius:999px;
      background:rgba(255,255,255,.18);
      margin:2px auto 2px;
    }

    .sheet-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }

    .sheet-title{
      font-family:'Space Grotesk',sans-serif;
      font-size:18px;
      font-weight:700;
      letter-spacing:-.4px;
    }

    .sheet-close{
      width:38px;
      height:38px;
      border:none;
      border-radius:12px;
      background:rgba(255,255,255,.08);
      color:#fff;
      font-size:18px;
      cursor:pointer;
    }

    .sheet-list{
      overflow:auto;
      display:flex;
      flex-direction:column;
      gap:8px;
      scrollbar-width:none;
    }

    .sheet-list::-webkit-scrollbar{ display:none; }

    .sheet-item{
      min-height:58px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:0 14px;
      cursor:pointer;
      color:#fff;
      transition:.16s ease;
    }

    .sheet-item.active{
      border-color:rgba(0,242,254,.34);
      background:linear-gradient(135deg,rgba(0,242,254,.12),rgba(124,92,255,.12));
      box-shadow:0 0 0 1px rgba(0,242,254,.08) inset;
    }

    .sheet-item-left{
      min-width:0;
      display:flex;
      align-items:center;
      gap:12px;
    }

    .sheet-flag{
      width:32px;
      text-align:center;
      font-size:22px;
      flex:0 0 auto;
    }

    .sheet-text{
      min-width:0;
    }

    .sheet-name{
      font-size:14px;
      font-weight:900;
      color:#fff;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .sheet-code{
      font-size:11px;
      font-weight:800;
      color:rgba(255,255,255,.56);
      margin-top:3px;
      letter-spacing:.5px;
    }

    .sheet-check{
      width:24px;
      height:24px;
      border-radius:999px;
      border:2px solid rgba(255,255,255,.26);
      flex:0 0 auto;
    }

    .sheet-item.active .sheet-check{
      border-color:var(--accent);
      box-shadow:inset 0 0 0 5px var(--accent);
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
        <select id="langSelect" aria-label="Dil seç"></select>

        <button id="langPickerBtn" class="lang-picker-btn" type="button" aria-label="Dil seç">
          <span class="lang-picker-text" id="langPickerText">🌐 Dil</span>
          <span class="lang-picker-arrow">⌄</span>
        </button>

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

<div class="sheet-backdrop" id="langSheetBackdrop"></div>

<div class="lang-sheet" id="langSheet" aria-hidden="true">
  <div class="sheet-handle"></div>

  <div class="sheet-head">
    <div class="sheet-title">Dil Seç</div>
    <button id="langSheetClose" class="sheet-close" type="button">✕</button>
  </div>

  <div class="sheet-list" id="langSheetList"></div>
</div>

<script>
  const room = document.getElementById("roomContainer");
  const chat = document.getElementById("chat");
  const msgInput = document.getElementById("msgInput");
  const textToggleBtn = document.getElementById("textToggleBtn");
  const textEntry = document.getElementById("textEntry");

  const langSelect = document.getElementById("langSelect");
  const langPickerBtn = document.getElementById("langPickerBtn");
  const langPickerText = document.getElementById("langPickerText");
  const langSheet = document.getElementById("langSheet");
  const langSheetList = document.getElementById("langSheetList");
  const langSheetBackdrop = document.getElementById("langSheetBackdrop");
  const langSheetClose = document.getElementById("langSheetClose");

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

  function syncLangPickerLabel() {
    try {
      const opt = langSelect?.options?.[langSelect.selectedIndex];
      if (!opt || !langPickerText) return;
      langPickerText.textContent = opt.textContent || "🌐 Dil";
    } catch {}
  }

  function renderLangSheet() {
    if (!langSheetList || !langSelect) return;

    const options = [...langSelect.options];
    langSheetList.innerHTML = options.map((opt) => `
      <button class="sheet-item ${opt.selected ? "active" : ""}" type="button" data-value="${opt.value}">
        <div class="sheet-item-left">
          <div class="sheet-flag">${(opt.textContent || "").trim().split(" ")[0] || "🌐"}</div>
          <div class="sheet-text">
            <div class="sheet-name">${(opt.textContent || "").trim().replace(/^(\S+)\s*/, "")}</div>
            <div class="sheet-code">${String(opt.value || "").toUpperCase()}</div>
          </div>
        </div>
        <div class="sheet-check"></div>
      </button>
    `).join("");

    langSheetList.querySelectorAll(".sheet-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.value || "";
        langSelect.value = value;
        langSelect.dispatchEvent(new Event("change", { bubbles: true }));
        syncLangPickerLabel();
        closeLangSheet();
      });
    });
  }

  function openLangSheet() {
    renderLangSheet();
    langSheet?.classList.add("show");
    langSheetBackdrop?.classList.add("show");
    langSheet?.setAttribute("aria-hidden", "false");
  }

  function closeLangSheet() {
    langSheet?.classList.remove("show");
    langSheetBackdrop?.classList.remove("show");
    langSheet?.setAttribute("aria-hidden", "true");
  }

  function waitLangOptions() {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (langSelect && langSelect.options.length > 0) {
        syncLangPickerLabel();
        clearInterval(timer);
      }
      if (tries > 30) clearInterval(timer);
    }, 200);
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fixLayout);
    window.visualViewport.addEventListener("scroll", fixLayout);
  }

  window.addEventListener("resize", fixLayout);
  window.addEventListener("orientationchange", fixLayout);

  textToggleBtn?.addEventListener("click", toggleTextEntry);
  langPickerBtn?.addEventListener("click", openLangSheet);
  langSheetBackdrop?.addEventListener("click", closeLangSheet);
  langSheetClose?.addEventListener("click", closeLangSheet);

  langSelect?.addEventListener("change", () => {
    syncLangPickerLabel();
    setTimeout(renderLangSheet, 50);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLangSheet();
  });

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

  waitLangOptions();
  fixLayout();
</script>

<script type="module" src="/js/alltoall_room.js?v=mic_first_2"></script>
</body>
</html>
