import { supabase } from "/js/supabase_client.js";

const ACCESS_CACHE_KEY = "italky_global_access_v2";
const ACCESS_CACHE_TTL_MS = 1000 * 60 * 3;

const REMINDER_DAY_KEY = "italky_membership_reminder_day_v1";
const MODAL_ID = "italkyGlobalAccessModal";

const DEFAULT_STATE = {
  ready: false,
  accessOpen: false,

  trialActive: false,
  trialDaysLeft: 0,
  trialEndsAt: null,

  hasPackage: false,
  packageCode: "",
  packageActive: false,
  packageEndsAt: null,

  tokens: 0,

  canUseTextToText: false,
  canUseFaceToFace: false,
  canUseEarToEar: false,
  canUseOffline: false,
  canUseEducation: false,
  canUseGames: false,
  canUsePractice: false,
  canUseLevelTest: false
};

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeText(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function bool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  if (typeof v === "string") {
    const x = v.trim().toLowerCase();
    if (["true", "1", "yes", "on", "active"].includes(x)) return true;
    if (["false", "0", "no", "off", "inactive"].includes(x)) return false;
  }
  return fallback;
}

function readCache() {
  try {
    const raw = localStorage.getItem(ACCESS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    if (!ts || Date.now() - ts > ACCESS_CACHE_TTL_MS) {
      localStorage.removeItem(ACCESS_CACHE_KEY);
      return null;
    }
    return parsed?.data || null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      ACCESS_CACHE_KEY,
      JSON.stringify({
        ts: Date.now(),
        data
      })
    );
  } catch {}
}

function clearGlobalAccessCache() {
  try {
    localStorage.removeItem(ACCESS_CACHE_KEY);
  } catch {}
}

function getPackageCapabilities(packageCode) {
  const code = safeText(packageCode).toLowerCase();

  if (code === "premium") {
    return {
      canUseTextToText: true,
      canUseFaceToFace: true,
      canUseEarToEar: true,
      canUseOffline: true,
      canUseEducation: true,
      canUseGames: true,
      canUsePractice: true,
      canUseLevelTest: true
    };
  }

  if (code === "translate") {
    return {
      canUseTextToText: true,
      canUseFaceToFace: true,
      canUseEarToEar: true,
      canUseOffline: true,
      canUseEducation: false,
      canUseGames: false,
      canUsePractice: false,
      canUseLevelTest: false
    };
  }

  if (code === "education") {
    return {
      canUseTextToText: true,
      canUseFaceToFace: false,
      canUseEarToEar: false,
      canUseOffline: false,
      canUseEducation: true,
      canUseGames: true,
      canUsePractice: true,
      canUseLevelTest: true
    };
  }

  return {
    canUseTextToText: false,
    canUseFaceToFace: false,
    canUseEarToEar: false,
    canUseOffline: false,
    canUseEducation: false,
    canUseGames: false,
    canUsePractice: false,
    canUseLevelTest: false
  };
}

function buildStateFromRow(row = {}) {
  const trialActive = safeNum(row.trial_days_left, 0) > 0 || (
    row.trial_ends_at ? new Date(row.trial_ends_at).getTime() > Date.now() : false
  );

  const hasPackage =
    bool(row.package_active) ||
    bool(row.has_package) ||
    safeText(row.selected_package_code) !== "";

  const packageCode = safeText(row.selected_package_code).toLowerCase();
  const accessOpen =
    bool(row.access_open) ||
    trialActive ||
    hasPackage;

  let capabilities = getPackageCapabilities(packageCode);

  if (trialActive) {
    capabilities = {
      canUseTextToText: true,
      canUseFaceToFace: true,
      canUseEarToEar: true,
      canUseOffline: true,
      canUseEducation: true,
      canUseGames: true,
      canUsePractice: true,
      canUseLevelTest: true
    };
  }

  return {
    ready: true,
    accessOpen,

    trialActive,
    trialDaysLeft: safeNum(row.trial_days_left, 0),
    trialEndsAt: row.trial_ends_at || null,

    hasPackage,
    packageCode,
    packageActive: bool(row.package_active),
    packageEndsAt: row.package_ends_at || null,

    tokens: safeNum(row.tokens, 0),

    ...capabilities
  };
}

async function getCurrentUserId() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data?.user?.id || "";
  } catch {
    return "";
  }
}

async function fetchAccessState() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { ...DEFAULT_STATE, ready: true };
  }

  // 1) Önce hızlı state tablosunu dene
  try {
    const { data, error } = await supabase
      .from("user_access_state")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      return buildStateFromRow(data);
    }
  } catch {}

  // 2) Yoksa profiles tablosundan türet
  try {
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select(`
        tokens,
        selected_package_code,
        package_active,
        package_ends_at,
        trial_started_at,
        trial_ends_at
      `)
      .eq("id", userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return { ...DEFAULT_STATE, ready: true };
    }

    const now = Date.now();

    const trialActive =
      !!profile.trial_ends_at &&
      new Date(profile.trial_ends_at).getTime() > now;

    const trialDaysLeft = trialActive
      ? Math.max(
          0,
          Math.ceil((new Date(profile.trial_ends_at).getTime() - now) / (1000 * 60 * 60 * 24))
        )
      : 0;

    const hasPackage =
      !!profile.selected_package_code &&
      profile.package_active === true &&
      (!profile.package_ends_at || new Date(profile.package_ends_at).getTime() > now);

    const packageCode = safeText(profile.selected_package_code).toLowerCase();
    const packageCaps = hasPackage ? getPackageCapabilities(packageCode) : getPackageCapabilities("");

    const trialCaps = trialActive
      ? {
          canUseTextToText: true,
          canUseFaceToFace: true,
          canUseEarToEar: true,
          canUseOffline: true,
          canUseEducation: true,
          canUseGames: true,
          canUsePractice: true,
          canUseLevelTest: true
        }
      : null;

    return {
      ready: true,
      accessOpen: hasPackage || trialActive,

      trialActive,
      trialDaysLeft,
      trialEndsAt: profile.trial_ends_at || null,

      hasPackage,
      packageCode,
      packageActive: !!hasPackage,
      packageEndsAt: profile.package_ends_at || null,

      tokens: safeNum(profile.tokens, 0),

      ...(trialCaps || packageCaps)
    };
  } catch (e) {
    console.warn("[global_access] profile fallback error:", e);
    return { ...DEFAULT_STATE, ready: true };
  }
}
function setWindowState(state) {
  window.__ITALKY_ACCESS__ = state;
}

export function getGlobalAccessState() {
  return window.__ITALKY_ACCESS__ || { ...DEFAULT_STATE };
}

function closeExistingModal() {
  const el = document.getElementById(MODAL_ID);
  if (el) el.remove();
}

function openUpgradePage() {
  location.href = "/pages/upgrade_pack.html";
}

function createModalHtml(message, buttonText = "Üyelik Modelleri") {
  return `
    <div id="${MODAL_ID}" style="
      position:fixed;
      inset:0;
      z-index:99999;
      background:rgba(0,0,0,.62);
      backdrop-filter:blur(8px);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    ">
      <div style="
        width:min(100%,420px);
        border-radius:28px;
        padding:22px;
        color:#fff;
        background:linear-gradient(180deg, rgba(17,24,39,.96), rgba(10,14,25,.96));
        border:1px solid rgba(255,255,255,.10);
        box-shadow:0 28px 60px rgba(0,0,0,.42);
        font-family:Outfit, Arial, sans-serif;
      ">
        <div style="
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-height:32px;
          padding:0 12px;
          border-radius:999px;
          background:rgba(245,158,11,.12);
          border:1px solid rgba(245,158,11,.24);
          color:#ffd38a;
          font-size:11px;
          font-weight:900;
          letter-spacing:.5px;
          margin-bottom:12px;
        ">italkyAI • Erişim Bilgisi</div>

        <div style="
          font-size:22px;
          font-weight:1000;
          line-height:1.15;
          margin-bottom:10px;
        ">Üyelik Modelini Belirle</div>

        <div style="
          font-size:14px;
          line-height:1.6;
          color:rgba(255,255,255,.78);
          margin-bottom:18px;
        ">${message}</div>

        <button id="italkyAccessGoUpgrade" type="button" style="
          width:100%;
          min-height:56px;
          border:none;
          border-radius:18px;
          cursor:pointer;
          font-size:16px;
          font-weight:1000;
          color:#fff;
          background:linear-gradient(135deg,#f59e0b 0%, #f97316 100%);
          box-shadow:0 16px 30px rgba(249,115,22,.28);
        ">${buttonText}</button>

        <button id="italkyAccessLater" type="button" style="
          width:100%;
          min-height:48px;
          margin-top:10px;
          border-radius:16px;
          cursor:pointer;
          font-size:14px;
          font-weight:900;
          color:#fff;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.12);
        ">Hatırlat</button>
      </div>
    </div>
  `;
}

function showModal(message, opts = {}) {
  closeExistingModal();
  document.body.insertAdjacentHTML(
    "beforeend",
    createModalHtml(message, opts.buttonText || "Üyelik Modelleri")
  );

  document.getElementById("italkyAccessGoUpgrade")?.addEventListener("click", () => {
    openUpgradePage();
  });

  document.getElementById("italkyAccessLater")?.addEventListener("click", () => {
    try {
      localStorage.setItem(REMINDER_DAY_KEY, todayKey());
    } catch {}
    closeExistingModal();
  });
}

function shouldShowDailyReminder() {
  try {
    return localStorage.getItem(REMINDER_DAY_KEY) !== todayKey();
  } catch {
    return true;
  }
}

function maybeShowReminder(state) {
  if (!state.ready) return;
  if (!state.accessOpen) {
    if (shouldShowDailyReminder()) {
      showModal(
        "7 günlük ücretsiz kullanım süreniz tamamlandı. Tüm modülleri yeniden kullanmak için üyelik modelinizi seçmeniz gerekiyor."
      );
    }
    return;
  }

  if (state.trialActive && !state.hasPackage && state.trialDaysLeft >= 0 && shouldShowDailyReminder()) {
    showModal(
      `Ücretsiz kullanım süreniz devam ediyor. Kalan süreniz yaklaşık ${state.trialDaysLeft} gün. Süre dolmadan üyelik modelinizi seçerek kesintisiz devam edebilirsiniz.`,
      { buttonText: "Paketleri Gör" }
    );
  }
}

function applyDomVisibility(state) {
  const set = (id, visible) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = visible ? "" : "none";
  };

  set("textCard", state.canUseTextToText);
  set("faceCard", state.canUseFaceToFace);
  set("offlineCard", state.canUseOffline);
  set("funCard", state.canUseGames);
  set("levelCard", state.canUseLevelTest);
  set("practiceCard", state.canUsePractice);
  set("goSideToSide", state.canUseEarToEar);
  set("copyConnectionCodeBtn", state.canUseEarToEar);
  set("connectionCodeText", state.canUseEarToEar);
}

export function canUseModule(moduleName) {
  const s = getGlobalAccessState();
  const key = safeText(moduleName).toLowerCase();

  if (!s.accessOpen) return false;

  if (key === "texttotext" || key === "text_to_text") return s.canUseTextToText;
  if (key === "facetoface" || key === "face_to_face") return s.canUseFaceToFace;
  if (key === "eartoear" || key === "side_to_side" || key === "sidetoside") return s.canUseEarToEar;
  if (key === "offline" || key === "offtoff") return s.canUseOffline;
  if (key === "education") return s.canUseEducation;
  if (key === "games") return s.canUseGames;
  if (key === "practice") return s.canUsePractice;
  if (key === "leveltest" || key === "level_test") return s.canUseLevelTest;

  return false;
}

export function requireModuleAccess(moduleName, customMessage = "") {
  const ok = canUseModule(moduleName);
  if (ok) return true;

  const s = getGlobalAccessState();

  if (!s.accessOpen) {
    showModal(
      customMessage || "Bu özelliği kullanabilmek için önce üyelik modelinizi seçmeniz gerekiyor."
    );
    return false;
  }

  showModal(
    customMessage || "Bu özellik mevcut üyelik modelinizde açık değil. Uygun pakete geçerek sınırsız kullanabilirsiniz."
  );
  return false;
}

export function enforcePackageBeforeTokens() {
  const s = getGlobalAccessState();

  if (s.hasPackage) return true;

  showModal(
    "Jeton satın almadan önce üyelik modelinizi belirlemeniz gerekiyor. Önce paket seçin, sonra ekstra jeton alabilirsiniz.",
    { buttonText: "Paket Seç" }
  );
  return false;
}

export async function refreshGlobalAccess(options = {}) {
  const useCache = options?.useCache !== false;

  try {
    if (useCache) {
      const cached = readCache();
      if (cached) {
        setWindowState(cached);
        applyDomVisibility(cached);
        return cached;
      }
    }

    const state = await fetchAccessState();
    writeCache(state);
    setWindowState(state);
    applyDomVisibility(state);
    return state;
  } catch (e) {
    console.warn("[global_access] refresh error:", e);
    const fallback = { ...DEFAULT_STATE, ready: true };
    setWindowState(fallback);
    applyDomVisibility(fallback);
    return fallback;
  }
}

export async function initGlobalAccess(options = {}) {
  const state = await refreshGlobalAccess(options);
  maybeShowReminder(state);
  return state;
}

export { clearGlobalAccessCache };
