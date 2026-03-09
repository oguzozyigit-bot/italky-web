<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
<title>italkyAI • Profil</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">

<style>
html,body{
  margin:0;
  padding:0;
  background:#02000f;
  font-family:Outfit,sans-serif;
  height:100%;
  overflow:hidden;
  scrollbar-width:none;
}
html::-webkit-scrollbar,
body::-webkit-scrollbar{
  display:none;
}

*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
  outline:none;
}

#pageContent{
  height:100%;
  overflow-y:auto;
  padding:16px 14px calc(var(--footerH,92px) + env(safe-area-inset-bottom) + 12px);
  scrollbar-width:none;
}
#pageContent::-webkit-scrollbar{
  display:none;
}

.panel{
  background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.02));
  border:1px solid rgba(255,255,255,.12);
  border-radius:26px;
  padding:14px;
  margin-bottom:12px;
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
}

.title{
  font-family:"Space Grotesk",sans-serif;
  font-size:18px;
  font-weight:900;
  color:#fff;
  margin:0 0 10px;
}

.line{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.08);
  border-radius:18px;
  padding:12px;
  margin-bottom:8px;
}

.k{
  font-size:12px;
  font-weight:900;
  color:#a5b4fc;
  white-space:nowrap;
}

.v{
  font-size:13px;
  font-weight:900;
  color:#fff;
  text-align:right;
  word-break:break-word;
}

.mono{
  font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
}

.copyWrap{
  display:flex;
  align-items:center;
  gap:8px;
  max-width:68%;
}

.iconBtn{
  width:38px;
  height:38px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(0,0,0,.18);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  user-select:none;
  flex:0 0 auto;
}
.iconBtn:active{ transform:scale(.98); }

.iconBtn svg{
  width:18px;
  height:18px;
  stroke:rgba(255,255,255,.85);
  stroke-width:2.1;
  fill:none;
}

.wallet{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  background:rgba(99,102,241,.12);
  border:1px solid rgba(99,102,241,.35);
  border-radius:20px;
  padding:12px;
}

.walletLeft{
  min-width:0;
}

.btn{
  border:none;
  border-radius:16px;
  padding:12px 16px;
  font-weight:900;
  font-family:inherit;
  cursor:pointer;
  user-select:none;
  min-height:46px;
}
.btn:active{ transform:scale(.98); }

.btn-primary{
  background:linear-gradient(135deg,#a5b4fc,#6366f1,#ec4899);
  color:#000;
}

.btn-safe{
  width:100%;
  background:rgba(0,200,120,.18);
  border:1px solid rgba(0,200,120,.35);
  color:#fff;
  margin-bottom:10px;
}

.btn-danger{
  width:100%;
  background:transparent;
  border:1px solid rgba(255,0,90,.35);
  color:#ff5a8c;
}

.settingTrigger{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  min-width:160px;
  background:rgba(0,0,0,.25);
  border:1px solid rgba(255,255,255,.12);
  border-radius:14px;
  padding:10px 12px;
  cursor:pointer;
  color:#fff;
  font-weight:900;
}

.settingValue{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.note{
  font-size:11px;
  font-weight:800;
  color:rgba(255,255,255,.55);
  line-height:1.4;
  margin-top:8px;
}

.sheetBackdrop{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.5);
  display:none;
  z-index:100;
  backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);
}
.sheetBackdrop.show{
  display:block;
}

.sheet{
  position:fixed;
  left:0;
  right:0;
  bottom:0;
  background:linear-gradient(180deg,rgba(24,24,36,.98),rgba(10,10,18,.99));
  border-radius:28px 28px 0 0;
  border:1px solid rgba(255,255,255,.10);
  border-bottom:none;
  padding:14px 14px calc(16px + env(safe-area-inset-bottom));
  display:none;
  z-index:101;
  max-width:560px;
  margin:0 auto;
  box-shadow:0 -20px 60px rgba(0,0,0,.45);
}
.sheet.show{
  display:block;
}

.sheetHandle{
  width:48px;
  height:5px;
  border-radius:999px;
  background:rgba(255,255,255,.18);
  margin:2px auto 12px;
}

.sheetTitle{
  font-family:"Space Grotesk",sans-serif;
  font-size:18px;
  font-weight:900;
  color:#fff;
  margin:0 0 12px;
  text-align:center;
}

.sheetList{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.sheetItem{
  min-height:56px;
  border-radius:18px;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.04);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:0 14px;
  cursor:pointer;
  user-select:none;
  color:#fff;
  font-weight:900;
}

.sheetItem.active{
  border-color:rgba(165,180,252,.35);
  background:rgba(99,102,241,.14);
}

.sheetItem.disabled{
  opacity:.45;
}

.sheetItemCheck{
  width:24px;
  height:24px;
  border-radius:999px;
  border:2px solid rgba(255,255,255,.30);
  flex:0 0 auto;
}

.sheetItem.active .sheetItemCheck{
  border-color:#9fe7ea;
  box-shadow:inset 0 0 0 5px #9fe7ea;
}

.toast{
  position:fixed;
  left:50%;
  top:16px;
  transform:translateX(-50%) translateY(-120px);
  background:rgba(10,10,18,.94);
  border:1px solid rgba(165,180,252,.32);
  padding:10px 14px;
  border-radius:999px;
  color:#fff;
  z-index:9999;
  font-weight:900;
  font-size:12px;
  transition:.25s;
  backdrop-filter:blur(12px);
  pointer-events:none;
  max-width:min(92vw,520px);
  text-align:center;
}
.toast.show{
  transform:translateX(-50%) translateY(0);
}
</style>
</head>

<body>

<div id="pageContent">

  <div class="panel">
    <div class="title">Profil</div>

    <div class="line">
      <div class="k">Ad Soyad</div>
      <div class="v" id="pName">—</div>
    </div>

    <div class="line">
      <div class="k">Mail</div>
      <div class="v" id="pEmail">—</div>
    </div>

    <div class="line">
      <div class="k">Üyelik No</div>
      <div class="copyWrap">
        <div class="v mono" id="memberNo">—</div>
        <button class="iconBtn" id="copyMemberBtn" type="button" aria-label="Kopyala">
          <svg viewBox="0 0 24 24">
            <rect x="9" y="9" width="10" height="10" rx="2"></rect>
            <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="line">
      <div class="k">Üyelik Tarihi</div>
      <div class="v" id="createdAt">—</div>
    </div>

    <div class="line">
      <div class="k">Son Giriş Tarihi</div>
      <div class="v" id="lastLogin">—</div>
    </div>

    <div class="wallet">
      <div class="walletLeft">
        <div class="k" style="margin-bottom:6px;">Jeton</div>
        <div class="v" id="tokenVal" style="text-align:left;">0</div>
      </div>
      <button class="btn btn-primary" id="buyTokensBtn" type="button">Jeton Yükle</button>
    </div>
  </div>

  <div class="panel">
    <div class="title">Ses Profili</div>

    <div class="line">
      <div class="k">Durum</div>
      <div class="v" id="voiceProfileStatus">Hazır değil</div>
    </div>

    <div class="note" id="voiceProfileMeta">Henüz ses örneği kaydedilmedi.</div>

    <button class="btn btn-primary" id="voiceProfileBtn" type="button" style="margin-top:10px;">
      Ses Profilini Güncelle
    </button>
  </div>

  <div class="panel">
    <div class="title">Çeviri Ayarları</div>

    <div class="line">
      <div class="k">Çeviri Sesi</div>

      <div class="settingTrigger" id="ttsVoiceTrigger" role="button" tabindex="0">
        <span class="settingValue" id="ttsVoiceValue">Otomatik</span>
        <span>⌄</span>
      </div>
    </div>

    <div class="note">FaceToFace ve Interpreter modüllerinde kullanılacak ses.</div>
  </div>

  <div class="panel">
    <div class="title">Interpreter QR</div>

    <div class="line">
      <div class="k">Bağlantı QR</div>
      <button class="btn btn-primary" id="renewQrBtn" type="button">QR Kod Yenile</button>
    </div>

    <div class="note">Güvenlik için eski QR iptal edilir, yeni QR aktif olur.</div>
  </div>

  <div class="panel">
    <button class="btn btn-safe" id="logoutBtn" type="button">Güvenli Çıkış</button>
    <button class="btn btn-danger" id="deleteBtn" type="button">Hesabımı Kalıcı Sil</button>
  </div>

</div>

<div class="sheetBackdrop" id="sheetBackdrop"></div>

<div class="sheet" id="optionSheet" aria-hidden="true">
  <div class="sheetHandle"></div>
  <div class="sheetTitle" id="sheetTitle">Çeviri Sesi</div>
  <div class="sheetList" id="sheetList"></div>
</div>

<div class="toast" id="toast"></div>

<script type="module" src="/js/profile_boot.js?v=profile_fixed_final"></script>
</body>
</html>
