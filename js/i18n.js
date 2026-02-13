<!-- FILE: /pages/profile.html -->
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title data-i18n="profile_title">italkyAI • Profil</title>
  <link rel="icon" href="data:," />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">

  <style>
    #pageContent{ height:100%; }

    .wrap{
      min-height:100%;
      padding: 14px 14px 190px;
      display:flex;
      flex-direction:column;
      gap:12px;
    }

    .panel{
      border-radius:28px;
      border:1px solid rgba(255,255,255,0.10);
      background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      padding: 16px 14px;
    }

    .name{
      font-size:18px;
      font-weight:1000;
      letter-spacing:-0.3px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .email{
      margin-top:6px;
      font-size:12px;
      font-weight:900;
      color: rgba(255,255,255,0.70);
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .keyRow{
      margin-top:12px;
      display:flex;
      gap:10px;
      align-items:center;
    }
    .keyPill{
      flex:1;
      padding:10px 12px;
      border-radius:18px;
      border:1px solid rgba(99,102,241,0.35);
      background: rgba(99,102,241,0.12);
      font-weight:1000;
      letter-spacing:1px;
      color:#fff;
      cursor:pointer;
      user-select:none;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
    }
    .keyPill:active{ transform: scale(.99); }
    .copyHint{
      font-size:11px;
      font-weight:1000;
      color: rgba(255,255,255,0.75);
      letter-spacing:.4px;
    }

    .card{
      border-radius:26px;
      border:1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.18);
      padding: 14px 12px;
    }

    .row{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:12px;
    }
    .left{
      display:flex;
      flex-direction:column;
      gap:6px;
      min-width:0;
    }
    .title{
      font-size:13px;
      font-weight:1000;
      color: rgba(255,255,255,0.92);
    }
    .desc{
      font-size:11px;
      font-weight:900;
      color: rgba(255,255,255,0.62);
      line-height:1.35;
    }

    /* Custom flag dropdown */
    .langBox{ position:relative; min-width: 160px; }
    .langBtn{
      width:100%;
      height:44px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      color:#fff;
      font-weight:1000;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding: 0 12px;
      user-select:none;
    }
    .langBtn:active{ transform: scale(.99); }
    .langLeft{ display:flex; align-items:center; gap:10px; min-width:0; }
    .flag{ font-size:18px; line-height:1; }
    .langText{
      font-size:13px;
      font-weight:1000;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .chev{ opacity:.7; font-size:14px; }

    .langMenu{
      position:absolute;
      top: 50px;
      left:0; right:0;
      background: rgba(10,10,18,0.92);
      border:1px solid rgba(255,255,255,0.12);
      border-radius:18px;
      padding:8px;
      display:none;
      z-index:9999;
      backdrop-filter: blur(12px);
    }
    .langItem{
      padding:10px 10px;
      border-radius:14px;
      display:flex;
      gap:10px;
      align-items:center;
      cursor:pointer;
      user-select:none;
      font-weight:1000;
    }
    .langItem:active{ transform: scale(.99); background: rgba(255,255,255,0.06); }

    .grid2{
      margin-top:12px;
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap:10px;
    }
    .mini{
      border-radius: 22px;
      border:1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.05);
      padding: 12px;
    }
    .k{
      font-size:11px;
      font-weight:1000;
      color: rgba(255,255,255,0.60);
      text-transform:uppercase;
      letter-spacing:1px;
    }
    .v{
      margin-top:6px;
      font-size:16px;
      font-weight:1000;
      color:#fff;
    }

    .list{ margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; }
    .tag{
      padding:8px 10px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.06);
      font-size:12px;
      font-weight:900;
      color: rgba(255,255,255,0.85);
    }

    .btnFull{
      width:100%;
      height:52px;
      border-radius:18px;
      border:none;
      cursor:pointer;
      font-weight:1000;
      font-size:14px;
      color:#fff;
      background: rgba(255,255,255,0.08);
      border:1px solid rgba(255,255,255,0.12);
    }
    .btnFull:active{ transform: scale(.99); }

    .btnPrimary{
      background: linear-gradient(135deg, #A5B4FC, #4F46E5);
      border:none;
      box-shadow: 0 16px 44px rgba(79,70,229,.18);
    }
    .btnSafe{
      background: rgba(0,200,120,0.20);
      border:1px solid rgba(0,200,120,0.40);
    }
    .btnDanger{
      background: rgba(255,60,60,0.18);
      border:1px solid rgba(255,60,60,0.40);
    }

    .toast{
      position: fixed;
      left:50%;
      top: 18px;
      transform: translateX(-50%) translateY(-120px);
      background: rgba(10,10,18,.92);
      border:1px solid rgba(165,180,252,.35);
      padding: 10px 14px;
      border-radius: 999px;
      color:#fff;
      z-index: 9999999;
      font-weight:900;
      font-size:12px;
      transition:.28s;
      backdrop-filter: blur(12px);
      pointer-events:none;
      max-width:min(92vw, 520px);
      text-align:center;
    }
    .toast.show{ transform: translateX(-50%) translateY(0); }

    /* Modal */
    .modalBack{
      position:fixed; inset:0;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(8px);
      display:none;
      align-items:center;
      justify-content:center;
      z-index: 999999;
      padding: 18px;
    }
    .modal{
      width:min(420px, 92vw);
      border-radius: 26px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(10,10,18,0.92);
      padding: 16px 14px;
    }
    .modal h3{ margin:0; font-size:16px; font-weight:1000; }
    .modal p{ margin:10px 0 0; font-size:12px; font-weight:900; color: rgba(255,255,255,0.72); line-height:1.45; }
    .modalBtns{ margin-top:14px; display:flex; gap:10px; }
    .mBtn{
      flex:1; height:46px; border-radius:16px; cursor:pointer;
      font-weight:1000; font-size:13px; color:#fff;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
    }
    .mBtnDanger{
      background: rgba(255,60,60,0.18);
      border: 1px solid rgba(255,60,60,0.40);
    }
  </style>
</head>

<body>
  <main id="pageContent">
    <div class="wrap">

      <section class="panel">
        <div class="name" id="fullName">—</div>
        <div class="email" id="email">—</div>

        <div class="keyRow">
          <div class="keyPill" id="keyCopy">
            <span id="userKeyText">KEY: —</span>
            <span class="copyHint" data-i18n="profile_copy_key">KOPYALA</span>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="row">
          <div class="left">
            <div class="title" data-i18n="profile_token_wallet">Token Cüzdan</div>
            <div class="desc" data-i18n="profile_token_desc">Ders ve paketler token ile çalışır</div>
          </div>
        </div>
        <div class="grid2">
          <div class="mini">
            <div class="k" data-i18n="profile_remaining_tokens">Kalan Token</div>
            <div class="v" id="tokenVal">0</div>
          </div>
          <div class="mini">
            <div class="k" data-i18n="profile_gift">Hediye</div>
            <div class="v" data-i18n="profile_gift_10">İlk giriş: 10</div>
          </div>
        </div>
        <button class="btnFull btnPrimary" id="buyTokenBtn" type="button" data-i18n="buy_tokens" style="margin-top:12px;">Token Satın Al</button>
      </section>

      <section class="card">
        <div class="row">
          <div class="left">
            <div class="title" data-i18n="profile_site_lang">Site Dili</div>
            <div class="desc" data-i18n="profile_site_lang_desc">Şimdilik 5 dil</div>
          </div>

          <div class="langBox">
            <button class="langBtn" id="langBtn" type="button">
              <div class="langLeft">
                <span class="flag" id="langFlag">🇹🇷</span>
                <span class="langText" id="langLabel">Türkçe</span>
              </div>
              <span class="chev">▾</span>
            </button>

            <div class="langMenu" id="langMenu">
              <div class="langItem" data-v="tr" data-flag="🇹🇷" data-label="Türkçe"><span class="flag">🇹🇷</span>Türkçe</div>
              <div class="langItem" data-v="en" data-flag="🇬🇧" data-label="English"><span class="flag">🇬🇧</span>English</div>
              <div class="langItem" data-v="de" data-flag="🇩🇪" data-label="Deutsch"><span class="flag">🇩🇪</span>Deutsch</div>
              <div class="langItem" data-v="it" data-flag="🇮🇹" data-label="Italiano"><span class="flag">🇮🇹</span>Italiano</div>
              <div class="langItem" data-v="fr" data-flag="🇫🇷" data-label="Français"><span class="flag">🇫🇷</span>Français</div>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="row">
          <div class="left">
            <div class="title" data-i18n="offline_packs">Offline Paketler</div>
            <div class="desc" data-i18n="profile_offline_desc">İndirilen diller</div>
          </div>
        </div>
        <div class="list" id="offlineList"></div>
        <button class="btnFull" id="downloadLangBtn" type="button" data-i18n="download_language" style="margin-top:12px;">Dil İndir</button>
      </section>

      <button class="btnFull btnSafe" id="logoutBtn" type="button" data-i18n="profile_secure_logout">Güvenli Çıkış</button>
      <button class="btnFull btnDanger" id="deleteBtn" type="button" data-i18n="profile_delete">Hesabımı Sil</button>
    </div>
  </main>

  <div class="toast" id="toast"></div>

  <div class="modalBack" id="confirmBack">
    <div class="modal">
      <h3 data-i18n="are_you_sure">Emin misiniz?</h3>
      <p data-i18n="cannot_undo">Bu işlem geri alınamaz.</p>
      <div class="modalBtns">
        <button class="mBtn" id="confirmNo" type="button" data-i18n="cancel">Vazgeç</button>
        <button class="mBtn mBtnDanger" id="confirmYes" type="button" data-i18n="yes_delete">Evet, Sil</button>
      </div>
    </div>
  </div>

  <script type="module">
    import { mountShell } from "/js/ui_shell.js";
    import { applyI18n, setSiteLang, getSiteLang, t } from "/js/i18n.js";
    import { STORAGE_KEY } from "/js/config.js";

    mountShell();
    applyI18n(document);

    const $ = (id)=>document.getElementById(id);

    function toast(msg){
      const el = $("toast");
      el.textContent = String(msg||"");
      el.classList.add("show");
      clearTimeout(window.__to);
      window.__to = setTimeout(()=>el.classList.remove("show"), 1600);
    }

    // KEY
    const USER_KEY_STORAGE = "italky_user_key";
    function randLetters3(){ const A="ABCDEFGHIJKLMNOPQRSTUVWXYZ"; let s=""; for(let i=0;i<3;i++) s+=A[Math.floor(Math.random()*A.length)]; return s; }
    function randDigits6(){ let s=""; for(let i=0;i<6;i++) s+=String(Math.floor(Math.random()*10)); return s; }
    function getOrCreateUserKey(){
      let k = (localStorage.getItem(USER_KEY_STORAGE) || "").trim();
      if(k && /^[A-Z]{3}\d{6}$/.test(k)) return k;
      k = `${randLetters3()}${randDigits6()}`;
      localStorage.setItem(USER_KEY_STORAGE, k);
      return k;
    }

    // Wallet
    function loadWallet(){
      try{
        const w = JSON.parse(localStorage.getItem("italky_wallet") || "null");
        if(w && typeof w.balance === "number") return w;
      }catch{}
      return { balance: 0 };
    }
    $("tokenVal").textContent = String(loadWallet().balance || 0);

    // User
    function fillUser(){
      let name="Kullanıcı", email="—";
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(raw){
          const u = JSON.parse(raw);
          name = (u.name || u.fullname || "Kullanıcı").trim();
          email = (u.email || "—").trim();
        }
      }catch{}
      $("fullName").textContent = name;
      $("email").textContent = email;

      const key = getOrCreateUserKey();
      $("userKeyText").textContent = `KEY: ${key}`;

      $("keyCopy").addEventListener("click", async ()=>{
        try{
          await navigator.clipboard.writeText(key);
          toast(t("key_copied") || "KEY kopyalandı");
        }catch{
          toast(t("key_copied") || "KEY kopyalandı");
        }
      });
    }
    fillUser();

    // Offline list
    (function(){
      let arr=[];
      try{ arr = JSON.parse(localStorage.getItem("italky_offline_langs") || "[]"); }catch{}
      const box = $("offlineList");
      box.innerHTML = "";
      if(!arr.length){
        box.innerHTML = `<div class="tag">—</div>`;
      }else{
        arr.forEach(x=>{
          const el = document.createElement("div");
          el.className="tag";
          el.textContent=String(x);
          box.appendChild(el);
        });
      }
    })();

    // Buy tokens / Download lang
    $("buyTokenBtn").addEventListener("click", ()=>location.href="/pages/course_signup.html");
    $("downloadLangBtn").addEventListener("click", ()=>toast("OK"));

    // Language menu (KİLİT: set + reload)
    const LANG_UI = {
      tr:{flag:"🇹🇷", label:"Türkçe"},
      en:{flag:"🇬🇧", label:"English"},
      de:{flag:"🇩🇪", label:"Deutsch"},
      it:{flag:"🇮🇹", label:"Italiano"},
      fr:{flag:"🇫🇷", label:"Français"},
    };

    function setLangUI(v){
      const info = LANG_UI[v] || LANG_UI.tr;
      $("langFlag").textContent = info.flag;
      $("langLabel").textContent = info.label;
    }

    const cur = getSiteLang();
    setLangUI(cur);

    const menu = $("langMenu");
    const btn = $("langBtn");

    btn.addEventListener("click", ()=>{
      menu.style.display = (menu.style.display === "block") ? "none" : "block";
    });

    menu.querySelectorAll(".langItem").forEach(item=>{
      item.addEventListener("click", ()=>{
        const v = item.getAttribute("data-v");
        setSiteLang(v);
        // ✅ kilit: tüm sayfa yeni dile dönsün
        location.reload();
      });
    });

    document.addEventListener("click", (e)=>{
      if(!menu.contains(e.target) && !btn.contains(e.target)){
        menu.style.display = "none";
      }
    });

    // Logout / delete
    $("logoutBtn").addEventListener("click", ()=>{
      try{ localStorage.removeItem(STORAGE_KEY); }catch{}
      location.href="/pages/home.html";
    });

    $("deleteBtn").addEventListener("click", ()=>{ $("confirmBack").style.display="flex"; });
    $("confirmNo").addEventListener("click", ()=>{ $("confirmBack").style.display="none"; });
    $("confirmYes").addEventListener("click", ()=>{
      try{ localStorage.clear(); }catch{}
      location.href="/pages/home.html";
    });
  </script>
</body>
</html>
