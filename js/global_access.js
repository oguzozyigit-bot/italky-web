import { supabase } from "/js/supabase_client.js";

let __accessCache = null;
let __popupShown = false;

async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("getUser error:", error);
    return null;
  }
  return data?.user || null;
}

async function fetchAccessState(force = false) {
  if (!force && __accessCache) return __accessCache;

  const user = await getSessionUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_access_state")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("user_access_state read error:", error);
    return null;
  }

  __accessCache = data || null;
  return __accessCache;
}

function isPackageActuallyActive(state) {
  if (!state) return false;
  if (state.package_active !== true) return false;
  if (!state.package_ends_at) return true;
  return new Date(state.package_ends_at).getTime() > Date.now();
}

function isTrialActuallyActive(state) {
  if (!state?.trial_ends_at) return false;
  return new Date(state.trial_ends_at).getTime() > Date.now();
}

function getTrialDaysLeft(state) {
  if (!state) return 0;

  if (typeof state.trial_days_left === "number") {
    return Math.max(0, state.trial_days_left);
  }

  if (!state.trial_ends_at) return 0;

  const diff = new Date(state.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function hasAnyAccess(state) {
  if (!state) return false;
  if (state.access_open === true) return true;
  if (isTrialActuallyActive(state)) return true;
  if (isPackageActuallyActive(state)) return true;
  return false;
}

function removeExistingPopup() {
  const el = document.getElementById("italkyUpgradePopup");
  if (el) el.remove();
}

function createUpgradePopup() {
  removeExistingPopup();

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
      width:min(100%,390px);
      border-radius:24px;
      padding:18px;
      background:
        radial-gradient(circle at top left, rgba(103,232,249,.10), transparent 30%),
        radial-gradient(circle at top right, rgba(244,114,182,.10), transparent 28%),
        linear-gradient(180deg, #0b0f18 0%, #070a11 100%);
      border:1px solid rgba(255,255,255,.12);
      box-shadow:0 24px 60px rgba(0,0,0,.45);
      color:#fff;
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
        Kapat
      </button>
    </div>
  `;

  document.body.appendChild(popup);

  const goBtn = document.getElementById("italkyUpgradeGoBtn");
  const laterBtn = document.getElementById("italkyUpgradeLaterBtn");

  goBtn?.addEventListener("click", () => {
    location.href = "/pages/upgrade_pack.html";
  });

  laterBtn?.addEventListener("click", () => {
    popup.style.display = "none";
  });

  return popup;
}

function showUpgradePopup(state) {
  if (__popupShown) return;
  if (!state) return;

  const packageActive = isPackageActuallyActive(state);
  const trialActive = isTrialActuallyActive(state);
  const remainingDays = getTrialDaysLeft(state);

  if (packageActive) return;
  if (!trialActive) return;
  if (remainingDays > 3) return;

  const popup =
    document.getElementById("italkyUpgradePopup") || createUpgradePopup();
  const text = document.getElementById("italkyUpgradePopupText");

  if (!popup || !text) return;

  text.innerHTML = `
    Ücretsiz kullanım hakkınız <b>${remainingDays} gün</b> kaldı.<br><br>
    Tüm modülleri sınırsız kullanmak, kültürel çeviri ve kendi sesinizle çeviri gibi gelişmiş özellikleri açmak için üyelik modelinizi seçin.
  `;

  popup.style.display = "flex";
  __popupShown = true;
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
          Ücretsiz kullanım süreniz tamamlandı.<br>
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

export async function initGlobalAccess() {
  createUpgradePopup();

  const user = await getSessionUser();
  if (!user) return;

  const state = await fetchAccessState(true);

  if (!state) {
    replacePageWithLockScreen();
    return;
  }

  if (!hasAnyAccess(state)) {
    replacePageWithLockScreen();
    return;
  }

  showUpgradePopup(state);
}

export async function enforcePackageBeforeTokens() {
  const state = await fetchAccessState(true);

  if (!state) {
    alert("Erişim bilgisi alınamadı.");
    location.href = "/pages/upgrade_pack.html";
    return false;
  }

  const packageActive = isPackageActuallyActive(state);

  if (packageActive) return true;

  alert("Jeton satın almak için önce üyelik modelinizi belirlemelisiniz.");
  location.href = "/pages/upgrade_pack.html";
  return false;
}

export async function getGlobalAccessState() {
  return await fetchAccessState(true);
}

export function clearGlobalAccessCache() {
  __accessCache = null;
}
