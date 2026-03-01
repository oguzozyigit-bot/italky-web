<!-- FILE: /pages/f2f_call.html -->
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>italkyAI • Walkie Talkie Terminal</title>

  <meta name="theme-color" content="#030014">
  <style>html,body{background:#000 !important; margin:0; padding:0; overflow:hidden;}</style>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">

  <style>
    :root {
      --ai-grad: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
      --bordo: #2d0a0a;
      --glass: rgba(255, 255, 255, 0.04);
      --glass2: rgba(255, 255, 255, 0.06);
      --glass-border: rgba(255, 255, 255, 0.10);

      --topH: 72px;
      --roomH: 44px;
      --peopleH: 62px;
      --dockH: 86px;

      --bg:#030014;
      --text: rgba(255,255,255,.92);
      --muted: rgba(255,255,255,.60);

      --ai1:#A5B4FC;
      --ai2:#4F46E5;
      --befree:#6B7280;
    }

    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }

    html, body {
      width: 100%;
      height: 100dvh;
      overflow: hidden;
      position: fixed;
      font-family: 'Outfit', sans-serif;
      background: var(--bg);
      color: var(--text);
    }

    /* Background */
    .cosmos-bg { position: absolute; inset: -50%; width: 200%; height: 200%; z-index: 0; pointer-events: none; }
    .orb { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .22; animation: floatOrbit 30s infinite alternate ease-in-out; }
    .orb-1 { top: 10%; left: 10%; width: 60vw; height: 60vw; background: radial-gradient(circle, rgba(79,70,229,.55), transparent 70%); }
    .orb-2 { bottom: 10%; right: 10%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(236,72,153,.40), transparent 70%); animation-delay:-5s; }
    @keyframes floatOrbit { 0% { transform: translate(0,0) scale(1);} 100% { transform: translate(10%,-10%) scale(1.1);} }

    .noise{
      position:absolute; inset:0;
      background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events:none; mix-blend-mode:overlay; z-index:1;
    }

    /* Frame */
    #pageContent {
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 500px;
      margin: 0 auto;
      border-left: 1px solid var(--glass-border);
      border-right: 1px solid var(--glass-border);
      background: rgba(8, 8, 20, 0.52);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      overflow: hidden;
    }

    /* TOP BAR */
    .topbar {
      height: var(--topH);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      background: rgba(0,0,0,.35);
      flex-shrink: 0;
    }

    .nav-btn {
      width: 42px; height: 42px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.18);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 1000;
      user-select: none;
    }
    .nav-btn:active { transform: scale(.96); }

    .brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1;
      user-select:none;
    }
    .brand-name {
      font-family: 'Space Grotesk';
      font-size: 18px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.3px;
    }
    .brand-name span {
      background: var(--ai-grad);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-sub {
      margin-top: 6px;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 2.6px;
      color: rgba(255,255,255,0.35);
      text-transform: uppercase;
    }

    /* ROOM BAR */
    .roomBar {
      height: var(--roomH);
      background: rgba(0,0,0,0.20);
      display: none;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0;
      gap:10px;
    }

    .roomLeft {
      display:flex;
      align-items:center;
      gap:10px;
      min-width:0;
      font-size: 11px;
      font-weight: 900;
      color: rgba(255,255,255,0.72);
      white-space: nowrap;
    }
    .roomPill {
      padding: 6px 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 900;
      letter-spacing: 1.5px;
      color:#fff;
      max-width: 220px;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .copyBtn{
      width:40px;height:40px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.18);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; user-select:none;
      flex: 0 0 auto;
    }
    .copyBtn:active{ transform: scale(.96); }
    .copyBtn svg{ width:18px;height:18px; stroke: rgba(255,255,255,.9); fill:none; stroke-width:2.2; }

    .langSelect {
      height: 34px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.18);
      color: rgba(255,255,255,.92);
      font-weight: 900;
      font-size: 12px;
      padding: 0 10px;
      max-width: 170px;
    }

    /* PEOPLE BAR (avatars here only) */
    .peopleBar {
      height: var(--peopleH);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 12px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0;
    }
    .peopleCount {
      font-size: 12px;
      font-weight: 1000;
      color: rgba(165,180,252,0.95);
      min-width: 22px;
      text-align:center;
    }
    .peopleScroll {
      flex: 1;
      display: flex;
      gap: 10px;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .peopleScroll::-webkit-scrollbar { display:none; }

    .pItem { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .pAvatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.10);
      overflow: hidden;
      background: rgba(255,255,255,0.06);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size: 11px;
      font-weight: 1000;
      color: rgba(255,255,255,0.92);
      user-select:none;
    }
    .pAvatar img { width:100%; height:100%; object-fit: cover; display:block; }
    .pName {
      font-size: 9px;
      font-weight: 900;
      color: rgba(255,255,255,0.45);
      max-width: 54px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align:center;
    }

    /* CHAT */
    #chat.chat-area{
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 14px 12px;
      display:flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width:none;
      -webkit-overflow-scrolling: touch;
    }
    #chat.chat-area::-webkit-scrollbar { display:none; }
    #chat.chat-area::before { content:""; flex:1 0 auto; } /* bottom stick */

    /* Message rows (NO avatars in bubbles) */
    .msgRow{
      display:flex;
      flex-direction: column;
      max-width: 85%;
      gap: 4px;
    }
    .msgRow.left { align-self:flex-start; }
    .msgRow.right { align-self:flex-end; align-items:flex-end; }

    /* IMPORTANT: hide avatar inside messages (JS still creates it, we hide it safely) */
    .msgAvatar{ display:none !important; }

    .bubbleWrap{ display:flex; flex-direction:column; gap:4px; min-width:0; }
    .nameLine{
      font-size: 10px;
      font-weight: 1000;
      color: rgba(255,255,255,0.55);
      letter-spacing: .6px;
      text-transform: uppercase;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      max-width: 320px;
    }

    .bubble{
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.45;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      white-space: pre-wrap;
      word-break: break-word;
      box-shadow: 0 12px 28px rgba(0,0,0,.22);
    }

    .bubble.bot{
      border-left: 4px solid rgba(99,102,241,.65);
      background: rgba(99,102,241,.10);
    }

    .bubble.user{
      border-right: 4px solid rgba(236,72,153,.35);
      background: linear-gradient(135deg, rgba(45,10,10,.55) 0%, rgba(0,0,0,.55) 100%);
      color: rgba(251,207,232,0.95);
      text-align: right;
    }

    /* Meta system messages (join/leave) */
    .bubble.meta{
      align-self:center;
      max-width: 92%;
      text-align:center;
      font-size: 12px;
      font-weight: 900;
      color: rgba(255,255,255,0.72);
      background: rgba(255,255,255,0.04);
      border-color: rgba(255,255,255,0.08);
    }

    /* DOCK */
    .input-dock{
      height: var(--dockH);
      padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
      background: rgba(0,0,0,0.45);
      border-top: 1px solid rgba(255,255,255,.08);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      flex-shrink: 0;
    }

    .dock-inner{
      height: 56px;
      background: rgba(255,255,255,0.05);
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,0.10);
      display:flex;
      align-items:center;
      padding: 0 8px 0 16px;
      gap: 8px;
    }

    #msgInput{
      flex: 1;
      min-width:0;
      background: transparent;
      border:none;
      color:#fff;
      font-size: 15px;
      font-weight: 700;
      font-family: inherit;
      outline:none;
    }
    #msgInput::placeholder{ color: rgba(255,255,255,0.35); font-weight:800; }

    .circle-btn{
      width: 44px;
      height: 44px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.22);
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      user-select:none;
      flex: 0 0 auto;
      transition: transform .12s ease, opacity .12s ease;
    }
    .circle-btn:active{ transform: scale(.96); }

    /* mic */
    #micBtn.listening{
      background: rgba(239,68,68,0.25);
      border-color: rgba(239,68,68,0.35);
      box-shadow: 0 0 16px rgba(239,68,68,0.20);
      position: relative;
    }
    #micBtn.listening::after{
      content:"";
      position:absolute;
      inset:-7px;
      border-radius: 18px;
      border: 2px solid rgba(239,68,68,.45);
      animation: micPulse 1.1s ease-in-out infinite;
    }
    @keyframes micPulse{
      0%{ transform: scale(0.92); opacity:.75; }
      50%{ transform: scale(1.08); opacity:.28; }
      100%{ transform: scale(0.92); opacity:.75; }
    }

    /* send */
    #sendBtn{
      background: var(--ai-grad);
      border: none;
      box-shadow: 0 10px 18px rgba(99,102,241,0.22);
    }
    .circle-btn svg{
      width: 22px;
      height: 22px;
      stroke: rgba(255,255,255,0.92);
      fill: none;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* tiny helpers */
    .hide{ display:none !important; }
  </style>
</head>

<body>
  <div class="cosmos-bg">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
  </div>
  <div class="noise"></div>

  <main id="pageContent">
    <header class="topbar">
      <button class="nav-btn" id="backBtn" type="button" aria-label="Geri">←</button>

      <div class="brand" id="logoHome" title="Ana sayfa">
        <div class="brand-name">italky<span>AI</span></div>
        <div class="brand-sub">WALKIE TALKIE</div>
      </div>

      <button class="nav-btn" id="exitBtn" type="button" aria-label="Çık">✕</button>
    </header>

    <div class="roomBar" id="roomBar">
      <div class="roomLeft">
        <span style="opacity:.7">FREKANS:</span>
        <span class="roomPill" id="roomPill">—</span>
      </div>

      <div style="display:flex; gap:10px; align-items:center;">
        <select class="langSelect" id="langSelect" title="Dil Seç"></select>
        <button class="copyBtn" id="copyRoomBtn" type="button" title="Kodu kopyala" aria-label="Kodu kopyala">
          <svg viewBox="0 0 24 24">
            <rect x="9" y="9" width="10" height="10" rx="2"></rect>
            <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="peopleBar">
      <div class="peopleCount" id="peopleCount">1</div>
      <div class="peopleScroll" id="peopleScroll"></div>
    </div>

    <div class="chat-area" id="chat"></div>

    <footer class="input-dock">
      <div class="dock-inner">
        <input id="msgInput" type="text" placeholder="Mesajını yaz ya da konuş…" autocomplete="off" />

        <button class="circle-btn" id="micBtn" type="button" aria-label="Mikrofon">
          <svg viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>

        <button class="circle-btn" id="sendBtn" type="button" aria-label="Gönder">
          <!-- paper plane -->
          <svg viewBox="0 0 24 24">
            <path d="M22 2L11 13"></path>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
          </svg>
        </button>
      </div>
    </footer>

    <!-- signature minimal -->
    <div style="height:30px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:rgba(255,255,255,0.18);letter-spacing:1px;text-transform:uppercase;background:rgba(0,0,0,0.35);border-top:1px solid rgba(255,255,255,0.03);">
      italkyAI • Walkie Talkie • 2026
    </div>
  </main>

  <script type="module">
    // Room code visibility + copy
    const p = new URLSearchParams(location.search);
    const room = String(p.get("room") || "").trim().toUpperCase();
    const bar = document.getElementById("roomBar");
    const pill = document.getElementById("roomPill");
    const copy = document.getElementById("copyRoomBtn");

    if(room){
      bar.style.display = "flex";
      pill.textContent = room;
      copy?.addEventListener("click", async ()=>{
        try{
          await navigator.clipboard.writeText(room);
          copy.style.opacity = "0.75";
          setTimeout(()=>copy.style.opacity="1", 500);
        }catch{
          alert("Kod: " + room);
        }
      });
    }else{
      // oda yoksa bar'ı sakla (JS zaten yönlendiriyor)
      bar.style.display = "none";
    }
  </script>

  <script type="module" src="/js/f2f_call.js?v=CHAT_WT_FINAL_007"></script>
</body>
</html>
