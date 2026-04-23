const MODULE_AD_STATE_KEY = "italky_module_ad_state_v2";
const AD_INFO_MODAL_ID = "italkyAdInfoModal";

function nowTs() {
  return Date.now();
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function normalizeModuleKey(moduleKey = "") {
  return String(moduleKey || "").trim().toLowerCase();
}

function getModuleAdState() {
  const state = readJson(MODULE_AD_STATE_KEY, {});
  return state && typeof state === "object" ? state : {};
}

function setModuleAdState(next) {
  const safe = next && typeof next === "object" ? next : {};
  writeJson(MODULE_AD_STATE_KEY, safe);
  return safe;
}

function hasNativeRewarded() {
  try {
    return !!(window.Native && typeof window.Native.showRewardedAd === "function");
  } catch {
    return false;
  }
}

function getOrCreateAdInfoModal() {
  let modal = document.getElementById(AD_INFO_MODAL_ID);
  if (modal) return modal;

  const style = document.createElement("style");
  style.id = "italkyAdInfoModalStyle";
  style.textContent = `
    .italky-ad-info-backdrop{
      position:fixed;
      inset:0;
      z-index:999999;
      display:none;
      align-items:center;
      justify-content:center;
      padding:20px;
      background:rgba(4,8,18,.58);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
    }
    .italky-ad-info-backdrop.open{
      display:flex;
    }
    .italky-ad-info-card{
      width:min(100%,430px);
      border-radius:26px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.08);
      background:linear-gradient(180deg, rgba(10,16,30,.98), rgba(8,12,24,.98));
      box-shadow:0 24px 50px rgba(0,0,0,.34);
      color:#fff;
      font-family:Outfit, system-ui, sans-serif;
    }
    .italky-ad-info-top{
      padding:18px 18px 14px;
      background:
        radial-gradient(circle at top left, rgba(191,219,254,.16), transparent 38%),
        linear-gradient(135deg, #142033 0%, #1a2740 52%, #202b46 100%);
      border-bottom:1px solid rgba(255,255,255,.06);
    }
    .italky-ad-info-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:32px;
      padding:8px 14px;
      border-radius:999px;
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.10);
      color:rgba(255,255,255,.92);
      font-size:12px;
      font-weight:1000;
    }
    .italky-ad-info-title{
      margin:12px 0 8px;
      font-size:24px;
      line-height:1.08;
      font-weight:1000;
      letter-spacing:-.5px;
      color:#eef4ff;
    }
    .italky-ad-info-text{
      margin:0;
      font-size:13px;
      line-height:1.68;
      font-weight:800;
      color:rgba(235,242,255,.82);
      white-space:pre-line;
    }
    .italky-ad-info-body{
      padding:16px;
      display:grid;
      gap:10px;
      background:linear-gradient(180deg, rgba(9,13,24,.98), rgba(7,10,20,.98));
    }
    .italky-ad-info-btn{
      min-height:50px;
      border:none;
      border-radius:16px;
      cursor:pointer;
      font-family:inherit;
      font-size:14px;
      font-weight:1000;
      transition:transform .14s ease, opacity .14s ease;
    }
    .italky-ad-info-btn:active{
      transform:scale(.985);
    }
    .italky-ad-info-btn.primary{
      background:linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 50%, #ddd6fe 100%);
      color:#111827;
      box-shadow:0 12px 24px rgba(99,102,241,.16);
    }
  `;
  document.head.appendChild(style);

  modal = document.createElement("div");
  modal.id = AD_INFO_MODAL_ID;
  modal.className = "italky-ad-info-backdrop";
  modal.innerHTML = `
    <div class="italky-ad-info-card">
      <div class="italky-ad-info-top">
        <div class="italky-ad-info-chip">italkyAI</div>
        <div class="italky-ad-info-title" id="italkyAdInfoTitle">Küçük Bir Bilgilendirme</div>
        <p class="italky-ad-info-text" id="italkyAdInfoText"></p>
      </div>
      <div class="italky-ad-info-body">
        <button class="italky-ad-info-btn primary" id="italkyAdInfoOk" type="button">Tamam</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  return modal;
}

function showSoftAdModal({
  title = "Bu modül için kısa bir reklam gösterilecek",
  text = "Bu modülü kullanabilmeniz için 1 kısa reklam gösterilecektir.\nReklamı tamamladıktan sonra bu modüle 24 saat boyunca tekrar reklam görmeden giriş yapabilirsiniz."
} = {}) {
  return new Promise((resolve) => {
    const modal = getOrCreateAdInfoModal();
    const titleEl = modal.querySelector("#italkyAdInfoTitle");
    const textEl = modal.querySelector("#italkyAdInfoText");
    const okBtn = modal.querySelector("#italkyAdInfoOk");

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;

    const cleanup = (value) => {
      modal.classList.remove("open");
      okBtn?.removeEventListener("click", onOk);
      modal.removeEventListener("click", onBackdrop);
      resolve(value);
    };

    const onOk = () => cleanup(true);
    const onBackdrop = (e) => {
      if (e.target === modal) cleanup(true);
    };

    okBtn?.addEventListener("click", onOk);
    modal.addEventListener("click", onBackdrop);
    modal.classList.add("open");
  });
}

function waitForRewardedResult(timeoutMs = 35000) {
  return new Promise((resolve) => {
    let done = false;
    let earned = false;

    const prevEarned = window.onNativeRewardEarned;
    const prevClosed = window.onNativeRewardClosed;

    const finish = (payload) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.onNativeRewardEarned = prevEarned;
      window.onNativeRewardClosed = prevClosed;
      resolve({
        shown: !!payload?.shown,
        earned,
        payload: payload || {}
      });
    };

    window.onNativeRewardEarned = function (payload) {
      try {
        if (typeof prevEarned === "function") prevEarned(payload);
      } catch {}
      earned = true;
    };

    window.onNativeRewardClosed = function (payload) {
      try {
        if (typeof prevClosed === "function") prevClosed(payload);
      } catch {}
      finish(payload);
    };

    const timer = setTimeout(() => {
      finish({ shown: false, reason: "timeout" });
    }, timeoutMs);
  });
}

async function showNativeRewarded(referenceKey = "", placement = "module_access") {
  if (!hasNativeRewarded()) return false;

  try {
    const waitPromise = waitForRewardedResult();
    window.Native.showRewardedAd(String(referenceKey || ""), String(placement || "module_access"));
    const result = await waitPromise;

    if (result?.earned) return true;
    if (result?.shown) return true;

    return false;
  } catch {
    return false;
  }
}

function showFallbackAdInfo(message = "Bu modül için kısa bir reklam gösterilebilir.") {
  try {
    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }
  } catch {}

  try {
    const old = document.getElementById("italkyAdMiniToast");
    if (old) old.remove();

    const toast = document.createElement("div");
    toast.id = "italkyAdMiniToast";
    toast.textContent = String(message || "");

    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.bottom = "28px";
    toast.style.transform = "translateX(-50%) translateY(120px)";
    toast.style.maxWidth = "min(92vw, 520px)";
    toast.style.padding = "14px 18px";
    toast.style.borderRadius = "18px";
    toast.style.background = "rgba(10,16,30,.96)";
    toast.style.border = "1px solid rgba(255,255,255,.10)";
    toast.style.boxShadow = "0 18px 36px rgba(0,0,0,.32)";
    toast.style.backdropFilter = "blur(12px)";
    toast.style.webkitBackdropFilter = "blur(12px)";
    toast.style.color = "#eef4ff";
    toast.style.fontFamily = "Outfit, system-ui, sans-serif";
    toast.style.fontSize = "13px";
    toast.style.fontWeight = "800";
    toast.style.lineHeight = "1.55";
    toast.style.textAlign = "center";
    toast.style.zIndex = "1000000";
    toast.style.transition = "transform .22s ease, opacity .22s ease";
    toast.style.opacity = "0";

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = "translateX(-50%) translateY(0)";
      toast.style.opacity = "1";
    });

    setTimeout(() => {
      toast.style.transform = "translateX(-50%) translateY(120px)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 260);
    }, 2400);
  } catch {}
}

export function getModuleAccessState(moduleKey = "") {
  const key = normalizeModuleKey(moduleKey);
  const state = getModuleAdState();
  const until = Number(state?.[key]?.until || 0);

  return {
    moduleKey: key,
    until,
    active: until > nowTs()
  };
}

export function markModuleAdShown(moduleKey = "", hours = 24) {
  const key = normalizeModuleKey(moduleKey);
  if (!key) return null;

  const state = getModuleAdState();
  const until = nowTs() + Number(hours || 24) * 60 * 60 * 1000;

  state[key] = { until };
  setModuleAdState(state);

  return {
    moduleKey: key,
    until,
    active: true
  };
}

export async function ensureModuleAdAccess(options = {}) {
  const {
    moduleKey = "",
    title = "Bu modül için kısa bir reklam gösterilecek",
    text = "Bu modülü kullanabilmeniz için 1 kısa reklam gösterilecektir.\nReklamı tamamladıktan sonra bu modüle 24 saat boyunca tekrar reklam görmeden giriş yapabilirsiniz.",
    placement = "module_access",
    hours = 24,
    onBeforeAd = null,
    onAfterAd = null
  } = options;

  const key = normalizeModuleKey(moduleKey);
  if (!key) return false;

  const current = getModuleAccessState(key);
  if (current.active) {
    if (typeof onAfterAd === "function") await onAfterAd(true);
    return true;
  }

  try {
    if (typeof onBeforeAd === "function") await onBeforeAd();
  } catch {}

  const accepted = await showSoftAdModal({ title, text });
  if (!accepted) {
    if (typeof onAfterAd === "function") await onAfterAd(false);
    return false;
  }

  let rewarded = false;

  if (hasNativeRewarded()) {
    rewarded = await showNativeRewarded(key, placement);
  } else {
    showFallbackAdInfo("Bu modülü kullanmak için kısa bir reklam gösterilebilir.");
    rewarded = true;
  }

  if (rewarded) {
    markModuleAdShown(key, hours);
  }

  try {
    if (typeof onAfterAd === "function") await onAfterAd(rewarded);
  } catch {}

  return rewarded;
}

export function hasShownOfflineDownloadAd(sessionKey = "offline_languages_page") {
  const key = normalizeModuleKey(sessionKey);
  if (!key) return false;

  const state = getOfflineAdState();
  const until = Number(state.shown_pairs[key] || 0);
  return until > nowTs();
}

export function markOfflineDownloadAdShown(sessionKey = "offline_languages_page", hours = 24) {
  const key = normalizeModuleKey(sessionKey);
  if (!key) return;

  const state = getOfflineAdState();
  state.shown_pairs[key] = nowTs() + Number(hours || 24) * 60 * 60 * 1000;
  setOfflineAdState(state);
}

export async function maybeShowOfflineDownloadAd(options = {}) {
  const {
    sessionKey = "offline_languages_page",
    title = "Bu modül için kısa bir reklam gösterilecek",
    text = "Offline diller sayfasını kullanabilmeniz için 1 kısa reklam izlemeniz gerekmektedir.\nReklamı tamamladıktan sonra bu sayfayı 24 saat boyunca tekrar reklam görmeden kullanabilirsiniz.",
    onBeforeAd = null,
    onAfterAd = null,
    skipInfoModal = false,
    hours = 24
  } = options;

  const key = normalizeModuleKey(sessionKey);
  if (!key) return false;

  if (hasShownOfflineDownloadAd(key)) {
    if (typeof onAfterAd === "function") await onAfterAd(true);
    return true;
  }

  try {
    if (typeof onBeforeAd === "function") await onBeforeAd();
  } catch {}

  if (!skipInfoModal) {
    const accepted = await showSoftAdModal({ title, text });
    if (!accepted) {
      if (typeof onAfterAd === "function") await onAfterAd(false);
      return false;
    }
  }

  let rewarded = false;

  if (hasNativeRewarded()) {
    rewarded = await showNativeRewarded(key, "offline_languages_access");
  } else {
    showFallbackAdInfo(
      "Bu sayfayı kullanmak için kısa bir reklam gösterilebilir."
    );
    rewarded = true;
  }

  if (rewarded) {
    markOfflineDownloadAdShown(key, hours);
  }

  try {
    if (typeof onAfterAd === "function") await onAfterAd(rewarded);
  } catch {}

  return rewarded;
}

export function resetModuleAdStateForDebug() {
  try {
    localStorage.removeItem(MODULE_AD_STATE_KEY);
  } catch {}
}

export function resetOfflineAdStateForDebug() {
  try {
    localStorage.removeItem(OFFLINE_AD_STATE_KEY);
  } catch {}
}
