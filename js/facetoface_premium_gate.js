// FILE: /js/facetoface_premium_gate.js

import { supabase } from "/js/supabase_client.js";

const JETON_PAGE_URL = "/pages/jetonbuy.html";

const POPUPS = [
  {
    title: "Jeton Gerekli",
    text: "Bu özelliği kullanmak için jeton yüklemeniz gerekmektedir.\nKültürel çeviri ve kendi sesinizle çeviri gibi gelişmiş özellikler jetonla çalışır.",
    accent: "linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%)",
    button: "Jeton Yükle"
  },
  {
    title: "Jetonunuzla Devam Edin",
    text: "FaceToFace içindeki gelişmiş özellikleri kullanmak için jeton gereklidir.\nJeton yükleyerek işlemi hemen başlatabilirsiniz.",
    accent: "linear-gradient(135deg,#ff9a3c 0%,#ff4fa3 100%)",
    button: "Jeton Yükle"
  },
  {
    title: "Gelişmiş Özellik İçin Jeton Gerekli",
    text: "Standart kullanımın ötesindeki çeviri özellikleri jetonla çalışır.\nJeton yükleyerek devam edebilirsiniz.",
    accent: "linear-gradient(135deg,#4de8ff 0%,#7b7dff 100%)",
    button: "Jeton Yükle"
  }
];

function $(id) {
  return document.getElementById(id);
}

function ensureStyles() {
  if ($("f2fPremiumGateStyles")) return;

  const style = document.createElement("style");
  style.id = "f2fPremiumGateStyles";
  style.textContent = `
    .f2f-gate-backdrop{
      position:fixed;
      inset:0;
      z-index:1000000;
      display:none;
      align-items:center;
      justify-content:center;
      padding:18px;
      background:rgba(2,6,23,.76);
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
    }

    .f2f-gate-backdrop.show{
      display:flex;
    }

    .f2f-gate-card{
      width:min(100%,430px);
      border-radius:30px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.12);
      background:linear-gradient(180deg, rgba(10,12,26,.98), rgba(6,8,20,.98));
      box-shadow:0 28px 90px rgba(0,0,0,.42);
      color:#fff;
      font-family:Outfit,system-ui,sans-serif;
    }

    .f2f-gate-top{
      padding:20px 20px 16px;
      background:linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%);
    }

    .f2f-gate-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:34px;
      padding:8px 14px;
      border-radius:999px;
      background:rgba(255,255,255,.16);
      border:1px solid rgba(255,255,255,.18);
      color:#fff;
      font-size:12px;
      font-weight:1000;
    }

    .f2f-gate-title{
      margin:14px 0 6px;
      font-size:28px;
      line-height:1.08;
      font-weight:1000;
      letter-spacing:-.6px;
    }

    .f2f-gate-text{
      margin:0;
      font-size:14px;
      line-height:1.6;
      font-weight:800;
      color:rgba(255,255,255,.92);
      white-space:pre-line;
    }

    .f2f-gate-body{
      padding:18px;
      display:grid;
      gap:12px;
    }

    .f2f-gate-box{
      border-radius:20px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      padding:14px;
    }

    .f2f-gate-label{
      font-size:11px;
      font-weight:1000;
      color:rgba(255,255,255,.50);
      text-transform:uppercase;
      letter-spacing:.8px;
      margin-bottom:5px;
    }

    .f2f-gate-value{
      font-size:20px;
      line-height:1.15;
      font-weight:1000;
    }

    .f2f-gate-desc{
      margin:2px 0 0;
      font-size:12px;
      line-height:1.45;
      font-weight:800;
      color:rgba(255,255,255,.62);
    }

    .f2f-gate-actions{
      display:grid;
      gap:10px;
      margin-top:2px;
    }

    .f2f-gate-btn{
      min-height:54px;
      border:none;
      border-radius:18px;
      cursor:pointer;
      font-size:15px;
      font-weight:1000;
      transition:transform .16s ease;
    }

    .f2f-gate-btn:active{
      transform:scale(.985);
    }

    .f2f-gate-btn.primary{
      color:#fff;
      background:linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%);
      box-shadow:0 14px 34px rgba(99,102,241,.26);
    }

    .f2f-gate-btn.secondary{
      color:#fff;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.10);
    }
  `;
  document.head.appendChild(style);
}

function ensureModal() {
  ensureStyles();
  if ($("f2fPremiumGate")) return;

  const wrap = document.createElement("div");
  wrap.className = "f2f-gate-backdrop";
  wrap.id = "f2fPremiumGate";
  wrap.innerHTML = `
    <div class="f2f-gate-card">
      <div class="f2f-gate-top" id="f2fGateTop">
        <div class="f2f-gate-chip">italkyAI • FaceToFace</div>
        <div class="f2f-gate-title" id="f2fGateTitle"></div>
        <p class="f2f-gate-text" id="f2fGateText"></p>
      </div>

      <div class="f2f-gate-body">
        <div class="f2f-gate-box">
          <div class="f2f-gate-label">Jetonla Açılan Özellikler</div>
          <div class="f2f-gate-value">Kültürel Çeviri • Kendi Sesiniz</div>
          <p class="f2f-gate-desc">Gelişmiş özellikler jetonla kullanılabilir.</p>
        </div>

        <div class="f2f-gate-box">
          <div class="f2f-gate-label">Durum</div>
          <div class="f2f-gate-value">Jeton Yetersiz</div>
          <p class="f2f-gate-desc">Devam etmek için jeton yükleyebilirsiniz.</p>
        </div>

        <div class="f2f-gate-actions">
          <button class="f2f-gate-btn primary" id="f2fGatePrimary">Jeton Yükle</button>
          <button class="f2f-gate-btn secondary" id="f2fGateClose">Şimdilik Vazgeç</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  $("f2fGatePrimary")?.addEventListener("click", () => {
    location.href = JETON_PAGE_URL;
  });

  $("f2fGateClose")?.addEventListener("click", closeFaceToFacePremiumGate);

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeFaceToFacePremiumGate();
  });
}

function randomPopup() {
  return POPUPS[Math.floor(Math.random() * POPUPS.length)];
}

export function openFaceToFacePremiumGate() {
  ensureModal();

  const pick = randomPopup();

  if ($("f2fGateTop")) $("f2fGateTop").style.background = pick.accent;
  if ($("f2fGateTitle")) $("f2fGateTitle").textContent = pick.title;
  if ($("f2fGateText")) $("f2fGateText").textContent = pick.text;
  if ($("f2fGatePrimary")) $("f2fGatePrimary").textContent = pick.button;

  $("f2fPremiumGate")?.classList.add("show");
}

export function closeFaceToFacePremiumGate() {
  $("f2fPremiumGate")?.classList.remove("show");
}

export async function getCurrentTokens() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const user = session?.user || null;
  if (!user?.id) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("tokens")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[facetoface_premium_gate] token read error:", error);
    return null;
  }

  return Number(data?.tokens ?? 0);
}

export async function ensureFaceToFacePremiumAccess() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const user = session?.user || null;
  if (!user?.id) {
    location.replace("/pages/login.html");
    return false;
  }

  const tokens = await getCurrentTokens();

  if (tokens === null) {
    return false;
  }

  if (tokens > 0) {
    return true;
  }

  openFaceToFacePremiumGate();
  return false;
}
