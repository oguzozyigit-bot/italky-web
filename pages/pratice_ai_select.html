<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
  <title>italkyAI • Practice AI Dil Seçimi</title>
  <link rel="icon" href="data:," />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@700;800&display=swap" rel="stylesheet">

  <style>
    :root{
      --bg:#05070d;
      --bg2:#09101b;
      --txt:#fff;
      --muted:rgba(255,255,255,.68);
      --line:rgba(255,255,255,.12);
      --c1:#67e8f9;
      --c2:#60a5fa;
      --c3:#34d399;
      --safe-bottom:env(safe-area-inset-bottom,0px);
      --shellLift:0px;
      --shadow:0 18px 40px rgba(0,0,0,.35);
      --grad:linear-gradient(135deg,var(--c1),var(--c2),var(--c3));
    }

    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;outline:none}
    html,body{
      margin:0;
      width:100%;
      height:100%;
      overflow:hidden;
      font-family:Outfit,system-ui,sans-serif;
      color:var(--txt);
      background:
        radial-gradient(circle at 12% 10%, rgba(103,232,249,.08), transparent 20%),
        radial-gradient(circle at 88% 8%, rgba(96,165,250,.09), transparent 20%),
        linear-gradient(180deg,var(--bg),var(--bg2));
    }

    #pageContent{
      height:100%;
      overflow:hidden;
      opacity:0;
      transition:opacity .2s ease;
      padding:10px 10px calc(10px + var(--safe-bottom) + var(--shellLift)) 10px;
    }
    #pageContent.ready{ opacity:1; }

    .page{
      width:100%;
      max-width:480px;
      height:100%;
      margin:0 auto;
      display:flex;
      flex-direction:column;
    }

    .card{
      flex:1;
      border:1px solid var(--line);
      border-radius:26px;
      background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
      box-shadow:var(--shadow);
      padding:18px 14px;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
      align-items:center;
      text-align:center;
      overflow:hidden;
      position:relative;
    }

    .card::before{
      content:"";
      position:absolute;
      right:-70px;
      top:-70px;
      width:180px;
      height:180px;
      border-radius:50%;
      background:radial-gradient(circle, rgba(103,232,249,.16), transparent 70%);
      filter:blur(10px);
      pointer-events:none;
    }

    .top{
      width:100%;
      z-index:2;
    }

    .title{
      margin:0 0 8px;
      font-family:"Space Grotesk",sans-serif;
      font-size:25px;
      font-weight:800;
      letter-spacing:-.4px;
    }

    .desc{
      margin:0;
      color:var(--muted);
      font-size:14px;
      line-height:1.6;
      font-weight:600;
    }

    .lang-grid{
      width:100%;
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:12px;
      z-index:2;
    }

    .lang-btn{
      min-height:94px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.04);
      color:#fff;
      cursor:pointer;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:8px;
      font-weight:900;
      font-size:15px;
      transition:.15s ease;
    }

    .lang-btn .flag{
      font-size:30px;
      line-height:1;
    }

    .lang-btn.active{
      border-color:rgba(103,232,249,.38);
      background:rgba(103,232,249,.12);
      box-shadow:0 0 0 1px rgba(103,232,249,.18), 0 0 18px rgba(103,232,249,.10);
    }

    .bottom{
      width:100%;
      z-index:2;
    }

    .start-btn{
      width:100%;
      min-height:56px;
      border:none;
      border-radius:18px;
      background:var(--grad);
      color:#052433;
      font-size:16px;
      font-weight:900;
      cursor:pointer;
      box-shadow:0 12px 26px rgba(0,0,0,.22);
    }

    #membershipModal{
      display:none;
      position:fixed;
      inset:0;
      z-index:9999;
      background:rgba(0,0,0,.72);
      backdrop-filter:blur(8px);
      align-items:center;
      justify-content:center;
      padding:20px;
    }

    .membership-card{
      width:min(92vw,380px);
      border:1px solid rgba(255,255,255,.12);
      border-radius:24px;
      background:linear-gradient(180deg, rgba(18,22,32,.98), rgba(10,14,22,.98));
      box-shadow:0 18px 40px rgba(0,0,0,.35);
      padding:22px 18px;
      text-align:center;
    }

    .membership-title{
      font-family:'Space Grotesk',sans-serif;
      font-size:24px;
      font-weight:800;
      margin-bottom:10px;
    }

    .membership-text{
      font-size:15px;
      line-height:1.6;
      color:rgba(255,255,255,.86);
      margin-bottom:16px;
    }

    .membership-btn{
      width:100%;
      min-height:54px;
      border:none;
      border-radius:16px;
      background:linear-gradient(135deg,#67e8f9,#60a5fa,#34d399);
      color:#041722;
      font-size:16px;
      font-weight:900;
      cursor:pointer;
    }
  </style>
</head>
<body>
  <div id="pageContent">
    <div class="page">
      <section class="card">
        <div class="top">
          <h1 class="title">Practice AI</h1>
          <p class="desc">
            Önce çalışmak istediğin dili seç. Öğretmen o dilde konuşacak ve seni o dilde yönlendirecek.
          </p>
        </div>

        <div class="lang-grid" id="langGrid"></div>

        <div class="bottom">
          <button class="start-btn" id="startBtn">BAŞLA</button>
        </div>
      </section>
    </div>
  </div>

  <div id="membershipModal">
    <div class="membership-card">
      <div class="membership-title">Practice AI</div>
      <div class="membership-text" id="membershipModalText">
        Bu modülü kullanabilmek için üyelik gerekir.
      </div>
      <button class="membership-btn" id="membershipGoBtn">Üyelik Sayfasına Git</button>
    </div>
  </div>

  <script type="module">
    import { mountShell } from "/js/ui_shell.js";
    mountShell({ scroll:"none" });

    try{
      const root = getComputedStyle(document.documentElement);
      const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
      document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 10}px` : "0px");
    }catch{}

    setTimeout(() => {
      document.getElementById("pageContent")?.classList.add("ready");
    }, 120);
  </script>

  <script type="module">
    import { bootAccessGate } from "/js/global_access.js";
    await bootAccessGate({ useCache: true });
  </script>

  <script type="module">
    const LANGS = {
      en:{ name:"English", flag:"🇬🇧" },
      de:{ name:"Deutsch", flag:"🇩🇪" },
      fr:{ name:"Français", flag:"🇫🇷" },
      es:{ name:"Español", flag:"🇪🇸" },
      it:{ name:"Italiano", flag:"🇮🇹" }
    };

    let selectedLang = localStorage.getItem("italky_game_lang") || "en";
    const grid = document.getElementById("langGrid");

    function getAccessState() {
      const a = window.__ITALKY_ACCESS__ || {};
      return {
        is_logged_in: a.is_logged_in === true,
        trial_active: a.trial_active === true,
        package_code: String(a.package_code || "none").toLowerCase(),
        can_practice: a.can_practice === true
      };
    }

    function openMembershipModal(message) {
      const modal = document.getElementById("membershipModal");
      const text = document.getElementById("membershipModalText");
      const btn = document.getElementById("membershipGoBtn");

      text.textContent = message || "Bu modülü kullanabilmek için üyelik gerekir.";
      modal.style.display = "flex";

      btn.onclick = () => {
        location.href = "/pages/upgrade_pack.html";
      };
    }

    function ensurePracticeAccess() {
      const access = getAccessState();

      const TEST_BYPASS = true;

      if (TEST_BYPASS) return true;

      if (!access.is_logged_in) {
        openMembershipModal("Bu modülü kullanabilmek için üye olmanız gerekir. Lütfen üyelik sayfasına gidin.");
        return false;
      }

      if (access.trial_active) {
        openMembershipModal("Practice AI deneme paketinde kapalıdır. Devam etmek için uygun üyelik almalısınız.");
        return false;
      }

      if (access.package_code === "translate") {
        openMembershipModal("Practice AI, Translate paketinde kapalıdır. Bu modül için uygun üyelik almalısınız.");
        return false;
      }

      if (!access.can_practice) {
        openMembershipModal("Bu modülü kullanabilmek için uygun üyelik gerekir. Lütfen üyelik sayfasına gidin.");
        return false;
      }

      return true;
    }

    function renderLangs() {
      grid.innerHTML = Object.entries(LANGS).map(([code, meta]) => `
        <button class="lang-btn ${selectedLang === code ? "active" : ""}" data-lang="${code}">
          <div class="flag">${meta.flag}</div>
          <div>${meta.name}</div>
        </button>
      `).join("");

      grid.querySelectorAll(".lang-btn").forEach(btn => {
        btn.onclick = () => {
          selectedLang = btn.dataset.lang;
          localStorage.setItem("italky_game_lang", selectedLang);
          localStorage.setItem("italky_practice_lang_v3", selectedLang);
          renderLangs();
        };
      });
    }

    document.getElementById("startBtn").onclick = () => {
      if (!ensurePracticeAccess()) return;

      localStorage.setItem("italky_game_lang", selectedLang);
      localStorage.setItem("italky_practice_lang_v3", selectedLang);
      location.href = `/pages/practice_ai.html?lang=${encodeURIComponent(selectedLang)}`;
    };

    renderLangs();
  </script>
</body>
</html>
