<!-- FILE: italky-web/pages/fast.html -->
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>ITALKY • Anında Çeviri</title>
  <link rel="icon" href="data:," />

  <style>
    :root{
      --text: rgba(255,255,255,.94);
      --muted: rgba(255,255,255,.62);
      --border: rgba(255,255,255,.10);
      --border2: rgba(255,255,255,.06);
      --shadow: 0 28px 90px rgba(0,0,0,.65);

      --bgA: #0b1222;
      --bgB: #05070d;

      --burgA: rgba(120, 20, 35, .92);
      --burgB: rgba(60, 10, 20, .60);

      --g:#009246; --w:#ffffff; --r:#CE2B37;
    }

    *{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
    html,body{ margin:0; padding:0; width:100%; height:100dvh; overflow:hidden; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }

    body{
      background:
        radial-gradient(900px 520px at 50% 14%, rgba(40,120,255,.18), transparent 62%),
        radial-gradient(900px 520px at 50% 86%, rgba(120,20,35,.16), transparent 62%),
        radial-gradient(700px 360px at 12% 10%, rgba(255,255,255,.06), transparent 60%),
        radial-gradient(700px 360px at 88% 90%, rgba(255,255,255,.05), transparent 60%),
        linear-gradient(180deg, var(--bgA), var(--bgB));
      color: var(--text);
    }

    .frame{
      width:100%;
      max-width:480px;
      height:100%;
      margin:0 auto;
      position:relative;
      overflow:hidden;
    }

    /* Top bar */
    .topbar{
      position:absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      z-index: 50;
      display:flex;
      align-items:center;
      gap: 10px;
    }

    .back{
      width: 46px; height: 46px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: rgba(15,15,18,.50);
      color:#fff;
      font-size:22px;
      font-weight:1000;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; user-select:none;
      box-shadow: 0 18px 40px rgba(0,0,0,.45);
      backdrop-filter: blur(10px);
      flex:0 0 46px;
    }
    .back:active{ transform: translateY(1px); }

    .titlePill{
      flex:1;
      height:46px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: rgba(15,15,18,.35);
      box-shadow: 0 18px 40px rgba(0,0,0,.35);
      backdrop-filter: blur(10px);
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding: 0 12px;
      gap: 10px;
      min-width:0;
    }
    .titleLeft{ display:flex; flex-direction:column; gap:2px; min-width:0; }
    .ttl{ font-weight:1000; font-size:13px; letter-spacing:.2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .st{ font-weight:900; font-size:11px; color: var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    .spkBtn{
      width: 44px; height: 44px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.05);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; user-select:none;
      flex:0 0 44px;
      opacity:.55;
    }
    .spkBtn.on{ opacity:.95; }
    .spkBtn svg{ width:22px; height:22px; stroke:#fff; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

    /* Fullscreen burgundy panel */
    .panel{
      position:absolute;
      left: 12px;
      right: 12px;
      top: 70px;
      bottom: 62px;
      border-radius: 28px;
      border:1px solid var(--border);
      background:
        radial-gradient(900px 420px at 30% 10%, var(--burgA), transparent 68%),
        radial-gradient(700px 360px at 80% 18%, rgba(90, 15, 30, .70), transparent 70%),
        radial-gradient(600px 320px at 40% 75%, var(--burgB), transparent 72%),
        linear-gradient(180deg, rgba(10,10,12,.18), rgba(0,0,0,.15));
      box-shadow: var(--shadow);
      overflow:hidden;
      display:flex;
      flex-direction:column;
      min-height:0;
    }

    .panelHead{
      padding: 12px;
      border-bottom: 1px solid var(--border2);
      background: rgba(0,0,0,.18);
      display:flex;
      flex-direction:column;
      gap: 10px;
      z-index: 10;
    }

    .ddRow{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      align-items:center;
    }

    .dd{ position: relative; width: 100%; }
    .ddBtn{
      width:100%;
      padding: 12px 12px;
      border-radius: 18px;
      border:1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.06);
      color:#fff;
      font-weight: 950;
      font-size: 13px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      cursor:pointer;
      user-select:none;
    }
    .ddBtn .caret{ opacity:.75; font-size: 12px; }

    .ddMenu{
      position:absolute;
      top: calc(100% + 8px);
      left: 0;
      width: min(92vw, 360px);
      max-width: calc(100vw - 28px);
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(20,20,24,.98);
      box-shadow: 0 34px 90px rgba(0,0,0,.70);
      backdrop-filter: blur(14px);
      display:none;
      z-index: 9999;
      max-height: 320px;
      overflow:auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width:none;
      -ms-overflow-style:none;
    }
    .ddMenu::-webkit-scrollbar{ width:0; height:0; }
    .dd.open .ddMenu{ display:block; }

    /* ✅ hedef dil menüsü sağdan açılsın (taşma yok) */
    #ddDst .ddMenu{ left:auto; right:0; }

    .ddSearchWrap{
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 10px;
      background: rgba(20,20,24,.98);
      border-bottom: 1px solid rgba(255,255,255,.10);
    }
    .ddSearch{
      width:100%;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.06);
      color: rgba(255,255,255,.92);
      font-weight: 900;
      font-size: 13px;
      padding: 10px 12px;
      outline:none;
    }
    .ddSearch::placeholder{ color: rgba(255,255,255,.55); font-weight: 800; }

    .ddItem{
      padding: 13px 14px;
      cursor:pointer;
      color: rgba(255,255,255,.96);
      font-weight: 950;
      font-size: 14px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      user-select:none;
    }
    .ddItem:last-child{ border-bottom:none; }
    .ddItem:hover{ background: rgba(255,255,255,.06); }
    .ddItem.hidden{ display:none; }

    .stream{
      flex: 1 1 auto;
      min-height:0;
      padding: 12px 12px 92px;
      overflow:auto;
      -webkit-overflow-scrolling: touch;
      display:flex;
      flex-direction:column;
      gap: 10px;
      scrollbar-width:none;
      -ms-overflow-style:none;
    }
    .stream::-webkit-scrollbar{ width:0; height:0; }

    .bubble{
      border-radius: 22px;
      border:1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,.18);
      box-shadow: 0 14px 30px rgba(0,0,0,.25);
      padding: 12px 13px;
      font-weight: 950;
      font-size: 13px;
      line-height: 1.35;
      word-break: break-word;
    }
    .bubble .small{
      font-size: 11px;
      font-weight: 950;
      color: rgba(255,255,255,.62);
      margin-bottom: 6px;
    }
    .bubble.trg{ border-left: 4px solid rgba(190,242,100,.85); }

    .playDock{
      position:absolute;
      left: 50%;
      bottom: 14px;
      transform: translateX(-50%);
      z-index: 30;
      pointer-events:auto;
    }
    .playBtn{
      width: 78px; height: 78px;
      border-radius: 30px;
      border:1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.06);
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      user-select:none;
      box-shadow: 0 20px 55px rgba(0,0,0,.45);
    }
    .playBtn:active{ transform: translateY(1px); }
    .playBtn.running{
      border-color: rgba(190,242,100,.35);
      background: rgba(190,242,100,.12);
      box-shadow: 0 0 26px rgba(190,242,100,.16), 0 20px 55px rgba(0,0,0,.45);
    }
    .playBtn svg{ width:30px; height:30px; stroke:#fff; fill:none; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; opacity:.95; }

    .brandBottom{
      position:absolute;
      left: 50%;
      bottom: 10px;
      transform: translateX(-50%);
      z-index: 20;
      display:flex;
      flex-direction:column;
      align-items:center;
      gap: 6px;
      cursor:pointer;
      user-select:none;
      opacity:.92;
    }
    .bn{
      font-weight: 1000;
      letter-spacing:.35px;
      font-size: 12px;
      color: rgba(255,255,255,.92);
      line-height:1;
    }
    .flagbar{
      width: 64px;
      height: 4px;
      border-radius: 999px;
      overflow:hidden;
      display:flex;
      box-shadow: 0 10px 22px rgba(0,0,0,.25);
    }
    .flagbar span{ flex:1; }
    .f-g{ background: var(--g); }
    .f-w{ background: var(--w); }
    .f-r{ background: var(--r); }

    .toast{
      position: fixed;
      left: 50%;
      top: 14px;
      transform: translateX(-50%);
      z-index: 99999;
      padding: 10px 14px;
      border-radius: 999px;
      font-weight: 1000;
      font-size: 12px;
      background: rgba(20,20,20,.92);
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 18px 40px rgba(0,0,0,.45);
      backdrop-filter: blur(10px);
      display:none;
      color: rgba(255,255,255,.92);
      max-width: min(480px, calc(100vw - 24px));
      white-space: nowrap;
      overflow:hidden;
      text-overflow: ellipsis;
    }
    .toast.show{ display:block; }
  </style>
</head>

<body>
  <div class="frame" id="frameRoot">

    <div class="topbar">
      <button class="back" id="backBtn" aria-label="Geri">←</button>

      <div class="titlePill">
        <div class="titleLeft">
          <div class="ttl">Anında Çeviri</div>
          <div class="st" id="panelStatus">Hazır</div>
        </div>

        <button class="spkBtn" id="spkBtn" aria-label="Ses">
          <svg viewBox="0 0 24 24">
            <path d="M11 5L6 9H3v6h3l5 4z"></path>
            <path d="M15 9a4 4 0 0 1 0 6"></path>
            <path d="M17.5 6.5a7 7 0 0 1 0 11"></path>
          </svg>
        </button>
      </div>
    </div>

    <section class="panel" id="panel">
      <div class="panelHead">
        <div class="ddRow">
          <div class="dd" id="ddSrc">
            <div class="ddBtn" id="ddSrcBtn"><span id="ddSrcTxt">English</span><span class="caret">▾</span></div>
            <div class="ddMenu" id="ddSrcMenu"></div>
          </div>

          <div class="dd" id="ddDst">
            <div class="ddBtn" id="ddDstBtn"><span id="ddDstTxt">Türkçe</span><span class="caret">▾</span></div>
            <div class="ddMenu" id="ddDstMenu"></div>
          </div>
        </div>
      </div>

      <div class="stream" id="stream"></div>

      <div class="playDock">
        <button class="playBtn" id="playBtn" aria-label="Başlat/Duraklat">
          <svg id="icoPlay" viewBox="0 0 24 24">
            <polygon points="8,5 19,12 8,19"></polygon>
          </svg>
          <svg id="icoPause" viewBox="0 0 24 24" style="display:none">
            <line x1="9" y1="6" x2="9" y2="18"></line>
            <line x1="15" y1="6" x2="15" y2="18"></line>
          </svg>
        </button>
      </div>
    </section>

    <div class="brandBottom" id="brandHome" title="Anasayfa">
      <div class="bn">ITALKY</div>
      <div class="flagbar" aria-hidden="true"><span class="f-g"></span><span class="f-w"></span><span class="f-r"></span></div>
    </div>
  </div>

  <div class="toast" id="toast">—</div>

  <script type="module" src="/js/fast_page.js?v=4"></script>
</body>
</html>
