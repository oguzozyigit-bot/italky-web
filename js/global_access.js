// FILE: /js/global_access.js

const ITALKY_TRIAL_DAYS = 7;
const ITALKY_DAY_MS = 24 * 60 * 60 * 1000;

function nowTs() {
  return Date.now();
}

function getTrialStart() {
  let startedAt = localStorage.getItem("trial_started_at");
  if (!startedAt) {
    startedAt = String(nowTs());
    localStorage.setItem("trial_started_at", startedAt);
  }
  return Number(startedAt);
}

function normalizePackageCode(raw) {
  const value = String(raw || "").trim().toLowerCase();

  if (!value) return "";
  if (value.includes("premium")) return "premium";
  if (value.includes("translate")) return "translate";
  if (value.includes("education")) return "education";
  if (value.includes("egitim")) return "education";

  return value;
}

function getAccessState() {
  const startedAt = getTrialStart();
  const elapsed = nowTs() - startedAt;

  const remainingMs = Math.max(0, (ITALKY_TRIAL_DAYS * ITALKY_DAY_MS) - elapsed);
  const trialActive = remainingMs > 0;
  const remainingDays = Math.max(0, Math.ceil(remainingMs / ITALKY_DAY_MS));

  const packageCode = normalizePackageCode(
    localStorage.getItem("package_code") ||
    localStorage.getItem("premium_plan_code") ||
    ""
  );

  const premiumFlag =
    localStorage.getItem("premium_is_active") === "1" ||
    localStorage.getItem("premium_is_active") === "true";

  const premiumActive = premiumFlag || packageCode === "premium";
  const hasPackage = premiumActive || packageCode === "translate" || packageCode === "education";

  return {
    trialActive,
    remainingDays,
    packageCode,
    premiumActive,
    hasPackage
  };
}

function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shouldShowReminderToday() {
  const today = getTodayKey();
  const lastSeen = localStorage.getItem("upgrade_popup_seen_date");
  return lastSeen !== today;
}

function markReminderSeenToday() {
  localStorage.setItem("upgrade_popup_seen_date", getTodayKey());
}

function createUpgradePopup() {
  if (document.getElementById("italkyUpgradePopup")) return;

  const popup = document.createElement("div");
  popup.id = "italkyUpgradePopup";
  popup.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(2,6,12,0.76);
    backdrop-filter: blur(12px);
  `;

  popup.innerHTML = `
    <div style="
      width: min(100%, 390px);
      border-radius: 24px;
      padding: 18px;
      background:
        radial-gradient(circle at top left, rgba(103,232,249,.10), transparent 30%),
        radial-gradient(circle at top right, rgba(244,114,182,.10), transparent 28%),
        linear-gradient(180deg, #0b0f18 0%, #070a11 100%);
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 24px 60px rgba(0,0,0,.45);
      color: #fff;
      font-family: Outfit, sans-serif;
    ">
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        width:64px;
        height:64px;
        margin:0 auto 14px;
        border-radius:18px;
        background: linear-gradient(135deg,#67e8f9 0%, #818cf8 46%, #f472b6 100%);
        box-shadow: 0 12px 28px rgba(129,140,248,.24);
        font-size:28px;
      ">✨</div>

      <div style="
        text-align:center;
        font-size:20px;
        font-weight:900;
        margin-bottom:10px;
        letter-spacing:-.3px;
      ">
        italkyAI Üyelik
      </div>

      <div id="italkyUpgradePopupText" style="
        text-align:center;
        font-size:14px;
        line-height:1.6;
        color:rgba(255,255,255,.86);
        margin-bottom:16px;
      "></div>

      <button id="italkyUpgradeGoBtn" type="button" style="
        width:100%;
        min-height:48px;
        border:none;
        border-radius:14px;
        background: linear-gradient(135deg,#f59e0b 0%, #f97316 100%);
        color:#fff;
        font-size:14px;
        font-weight:900;
        cursor:pointer;
        box-shadow:0 14px 30px rgba(249,115,22,.24);
      ">
        Üyelik Modellerini Gör
      </button>

      <button id="italkyUpgradeLaterBtn" type="button" style="
        width:100%;
        min-height:44px;
        margin-top:10px;
        border:none;
        border-radius:12px;
        background: rgba(255,255,255,.08);
        color: rgba(255,255,255,.82);
        font-size:13px;
        font-weight:800;
        cursor:pointer;
      ">
        Sonra Hatırlat
      </button>
    </div>
  `;

  document.body.appendChild(popup);

  const goBtn = document.getElementById("italkyUpgradeGoBtn");
  const laterBtn = document.getElementById("italkyUpgradeLaterBtn");

  goBtn?.addEventListener("click", () => {
    window.location.href = "/pages/upgrade_pack.html";
  });

  laterBtn?.addEventListener("click", () => {
    popup.style.display = "none";
  });
}

function showUpgradePopupIfNeeded() {
  const access = getAccessState();

  if (access.hasPackage) return;
  if (!shouldShowReminderToday()) return;

  const popup = document.getElementById("italkyUpgradePopup");
  const text = document.getElementById("italkyUpgradePopupText");

  if (!popup || !text) return;

  if (access.trialActive) {
    text.innerHTML = `
      Bu modülün bazı gelişmiş özellikleri sınırlı erişimdedir.<br><br>
      Ücretsiz kullanım hakkınız <b>${access.remainingDays} gün</b> kaldı.<br><br>
      Tüm modülleri sınırsız kullanmak, kültürel çeviri ve kendi sesinizle çeviri gibi gelişmiş özellikleri açmak için üyelik modelinizi değiştirin.
    `;
  } else {
    text.innerHTML = `
      Ücretsiz kullanım süreniz doldu.<br><br>
      TextToText dahil tüm modülleri yeniden kullanabilmek için üyelik modelinizi seçmeniz gerekiyor.
    `;
  }

  popup.style.display = "flex";
  markReminderSeenToday();
}

function replacePageWithLockScreen() {
  document.body.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      background:
        radial-gradient(circle at top left, rgba(103,232,249,.08), transparent 28%),
        radial-gradient(circle at top right, rgba(244,114,182,.08), transparent 26%),
        linear-gradient(180deg,#080b12 0%, #05070a 100%);
      color:#fff;
      font-family: Outfit, sans-serif;
      text-align:center;
    ">
      <div style="
        width:min(100%,420px);
        border-radius:26px;
        padding:22px;
        background:rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.10);
        box-shadow:0 26px 60px rgba(0,0,0,.34);
      ">
        <div style="
          width:76px;
          height:76px;
          margin:0 auto 14px;
          border-radius:22px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:linear-gradient(135deg,#f59e0b 0%, #f97316 100%);
          font-size:34px;
        ">🔒</div>

        <div style="font-size:24px;font-weight:900;line-height:1.1;margin-bottom:10px;">
          Kullanım Süresi Doldu
        </div>

        <div style="font-size:14px;line-height:1.6;color:rgba(255,255,255,.82);margin-bottom:16px;">
          7 günlük ücretsiz kullanım süresi tamamlandı.<br>
          Devam etmek için paket seçmelisiniz.
        </div>

        <button onclick="location.href='/pages/upgrade_pack.html'" style="
          width:100%;
          min-height:50px;
          border:none;
          border-radius:14px;
          background:linear-gradient(135deg,#f59e0b 0%, #f97316 100%);
          color:#fff;
          font-size:14px;
          font-weight:900;
          cursor:pointer;
        ">
          Paket Seç
        </button>
      </div>
    </div>
  `;
}

export function initGlobalAccess() {
  createUpgradePopup();

  const access = getAccessState();

  if (!access.trialActive && !access.hasPackage) {
    replacePageWithLockScreen();
    return;
  }

  showUpgradePopupIfNeeded();
}

export function enforcePackageBeforeTokens() {
  const access = getAccessState();

  if (access.trialActive) return true;
  if (access.hasPackage) return true;

  alert("Jeton satın almak için önce üyelik modelinizi belirleyin.");
  window.location.href = "/pages/upgrade_pack.html";
  return false;
}

export function getGlobalAccessState() {
  return getAccessState();
}
