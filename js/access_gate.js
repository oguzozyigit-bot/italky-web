import { supabase } from "/js/supabase_client.js";

const ACCESS_CACHE_KEY = "italky_access_gate_v2";
const ACCESS_CACHE_TTL_MS = 1000 * 60 * 2;
const TRIAL_DAYS = 7;

const PACKAGE_NONE = "none";
const PACKAGE_EDU = "edu";
const PACKAGE_TRANSLATE = "translate";
const PACKAGE_PREMIUM = "premium";

const MODULES_NONE = {
  can_text_to_text: false,
  can_face_to_face: false,
  can_side_to_side: false,
  can_offline: false,
  can_practice: false,
  can_games: false,
  can_level_test: false,
  can_education: false
};

const MODULES_EDU = {
  can_text_to_text: true,
  can_face_to_face: false,
  can_side_to_side: false,
  can_offline: false,
  can_practice: true,
  can_games: true,
  can_level_test: true,
  can_education: true
};

const MODULES_TRANSLATE = {
  can_text_to_text: true,
  can_face_to_face: true,
  can_side_to_side: true,
  can_offline: true,
  can_practice: false,
  can_games: false,
  can_level_test: false,
  can_education: false
};

const MODULES_PREMIUM = {
  can_text_to_text: true,
  can_face_to_face: true,
  can_side_to_side: true,
  can_offline: true,
  can_practice: true,
  can_games: true,
  can_level_test: true,
  can_education: true
};

const DEFAULT_ACCESS = {
  source: "default",
  is_logged_in: false,

  package_code: PACKAGE_NONE,
  trial_started_at: null,
  trial_ends_at: null,
  trial_active: false,
  trial_days_left: 0,

  jeton_balance: 0,

  show_trial_banner: false,
  trial_banner_title: "",
  trial_banner_text: "",
  trial_cta_label: "",
  trial_cta_href: "/pages/upgrade_pack.html",

  ...MODULES_NONE
};

function nowMs() {
  return Date.now();
}

function safeText(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function toBool(v, fallback = false) {
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
    if (!ts || nowMs() - ts > ACCESS_CACHE_TTL_MS) {
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
        ts: nowMs(),
        data
      })
    );
  } catch {}
}

function clearNode(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function showNode(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = visible ? "" : "none";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

function setHref(id, href) {
  const el = document.getElementById(id);
  if (el) el.setAttribute("href", href || "#");
}

function packageLabel(code) {
  switch (code) {
    case PACKAGE_EDU: return "Eğitim Paketi";
    case PACKAGE_TRANSLATE: return "Translate Paketi";
    case PACKAGE_PREMIUM: return "Premium";
    default: return "Paket Yok";
  }
}

function getPackageModules(code) {
  switch (code) {
    case PACKAGE_EDU: return { ...MODULES_EDU };
    case PACKAGE_TRANSLATE: return { ...MODULES_TRANSLATE };
    case PACKAGE_PREMIUM: return { ...MODULES_PREMIUM };
    default: return { ...MODULES_NONE };
  }
}

function ensureTrialDates(rawStartedAt, rawEndsAt) {
  const startedAt = safeText(rawStartedAt);
  const endsAt = safeText(rawEndsAt);

  if (startedAt && endsAt) {
    return {
      trial_started_at: startedAt,
      trial_ends_at: endsAt
    };
  }

  const start = new Date();
  const end = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  return {
    trial_started_at: start.toISOString(),
    trial_ends_at: end.toISOString()
  };
}

function getTrialInfo(trialEndsAt) {
  if (!trialEndsAt) {
    return {
      trial_active: false,
      trial_days_left: 0
    };
  }

  const diff = new Date(trialEndsAt).getTime() - nowMs();
  const active = diff > 0;
  const daysLeft = active ? Math.ceil(diff / (24 * 60 * 60 * 1000)) : 0;

  return {
    trial_active: active,
    trial_days_left: daysLeft
  };
}

function mergeAccess(raw = {}) {
  return {
    ...DEFAULT_ACCESS,
    ...raw
  };
}

async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  } catch {
    return null;
  }
}

async function fetchProfile(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        package_code,
        jeton_balance,
        trial_started_at,
        trial_ends_at
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (e) {
    console.warn("[access_gate profile]", e);
    return null;
  }
}

async function ensureTrialPersisted(userId, profile) {
  const fixed = ensureTrialDates(profile?.trial_started_at, profile?.trial_ends_at);

  const needsWrite =
    !safeText(profile?.trial_started_at) ||
    !safeText(profile?.trial_ends_at);

  if (!needsWrite) return fixed;

  try {
    await supabase
      .from("profiles")
      .update({
        trial_started_at: fixed.trial_started_at,
        trial_ends_at: fixed.trial_ends_at
      })
      .eq("id", userId);
  } catch (e) {
    console.warn("[access_gate trial persist]", e);
  }

  return fixed;
}

function buildResolvedAccess(profile) {
  const packageCode = safeText(profile?.package_code, PACKAGE_NONE).toLowerCase();
  const jetonBalance = Number(profile?.jeton_balance || 0);

  const { trial_started_at, trial_ends_at } = ensureTrialDates(
    profile?.trial_started_at,
    profile?.trial_ends_at
  );

  const { trial_active, trial_days_left } = getTrialInfo(trial_ends_at);

  let modules = {};
  let showTrialBanner = false;
  let trialBannerTitle = "";
  let trialBannerText = "";
  let trialCtaLabel = "";

  if (trial_active) {
    modules = { ...MODULES_PREMIUM };
    showTrialBanner = true;

    if (packageCode === PACKAGE_NONE) {
      trialBannerTitle = `7 Gün Full Erişim • Kalan ${trial_days_left} Gün`;
      trialBannerText = "Şu an tüm modüller açık. Deneme bitmeden paketini seçerek erişimini kesintisiz sürdür.";
      trialCtaLabel = "Paket Satın Al";
    } else {
      trialBannerTitle = `Deneme Sürüyor • Kalan ${trial_days_left} Gün`;
      trialBannerText = `Deneme sonunda ${packageLabel(packageCode)} aktif kalacak. İstersen daha güçlü pakete geçebilirsin.`;
      trialCtaLabel = packageCode === PACKAGE_PREMIUM ? "Premium Aktif" : "Paketi Yükselt";
    }
  } else {
    modules = getPackageModules(packageCode);

    if (packageCode === PACKAGE_NONE) {
      showTrialBanner = true;
      trialBannerTitle = "Deneme Süresi Bitti";
      trialBannerText = "Devam etmek için bir paket seçmen gerekiyor.";
      trialCtaLabel = "Paket Seç";
    } else {
      showTrialBanner = true;
      trialBannerTitle = `${packageLabel(packageCode)} Aktif`;
      trialBannerText = packageCode === PACKAGE_PREMIUM
        ? "Tüm modüller açık. Premium deneyim aktif."
        : "Paketine dahil modüller açık. İstersen Premium'a geçebilirsin.";
      trialCtaLabel = packageCode === PACKAGE_PREMIUM ? "Premium Aktif" : "Premium'a Geç";
    }
  }

  return mergeAccess({
    source: "profiles",
    is_logged_in: true,
    package_code: packageCode,
    trial_started_at,
    trial_ends_at,
    trial_active,
    trial_days_left,
    jeton_balance: jetonBalance,
    show_trial_banner: showTrialBanner,
    trial_banner_title: trialBannerTitle,
    trial_banner_text: trialBannerText,
    trial_cta_label: trialCtaLabel,
    trial_cta_href: "/pages/upgrade_pack.html",
    ...modules
  });
}

function applyTrialBanner(access) {
  const box = document.getElementById("nfcUpgradeBox");
  if (!box) return;

  if (!access.show_trial_banner) {
    box.style.display = "none";
    return;
  }

  box.style.display = "";

  const anchor = box.querySelector("a");
  if (!anchor) return;

  anchor.textContent = access.trial_cta_label || "Paket Seç";
  anchor.setAttribute("href", access.trial_cta_href || "/pages/upgrade_pack.html");
}

function applyHero(access) {
  const heroSub = document.getElementById("heroSub");
  const heroStatus = document.getElementById("heroStatus");

  if (!heroSub || !heroStatus) return;

  if (access.trial_active) {
    heroSub.textContent = "7 günlük deneme boyunca tüm modüller açık. Süre bitmeden paketini seç, deneyimin kesilmesin.";
    heroStatus.textContent = `Deneme aktif • Kalan süre: ${access.trial_days_left} gün`;
    return;
  }

  if (access.package_code === PACKAGE_EDU) {
    heroSub.textContent = "Eğitim paketin aktif. Öğrenme, pratik ve seviye modülleri hazır.";
    heroStatus.textContent = "Eğitim Paketi aktif";
    return;
  }

  if (access.package_code === PACKAGE_TRANSLATE) {
    heroSub.textContent = "Translate paketin aktif. Çeviri ve iletişim modülleri hazır.";
    heroStatus.textContent = "Translate Paketi aktif";
    return;
  }

  if (access.package_code === PACKAGE_PREMIUM) {
    heroSub.textContent = "Premium aktif. Tüm modüller ve genişletilmiş erişim hazır.";
    heroStatus.textContent = "Premium aktif";
    return;
  }

  heroSub.textContent = "Deneme bitti. Devam etmek için bir paket seçmelisin.";
  heroStatus.textContent = "Paket seçimi gerekli";
}

function applyAccessToDom(access) {
  const finalAccess = mergeAccess(access);

  applyHero(finalAccess);
  applyTrialBanner(finalAccess);

  if (!finalAccess.can_face_to_face) clearNode("faceCard");
  if (!finalAccess.can_offline) clearNode("offlineCard");
  if (!finalAccess.can_games) clearNode("funCard");
  if (!finalAccess.can_level_test) clearNode("levelCard");
  if (!finalAccess.can_practice) clearNode("practiceCard");

  showNode("sideToSideArea", !!finalAccess.can_side_to_side);
  showNode("connectionCodeWrap", !!finalAccess.can_side_to_side);

  if (!finalAccess.can_text_to_text) {
    clearNode("textCard");
  }

  const premiumGrid = document.getElementById("premiumGrid");
  if (premiumGrid && !premiumGrid.children.length) {
    premiumGrid.remove();
  }

  return finalAccess;
}

async function resolveAccess() {
  const user = await getCurrentUser();
  if (!user?.id) return mergeAccess(DEFAULT_ACCESS);

  const profile = await fetchProfile(user.id);
  if (!profile) return mergeAccess({ ...DEFAULT_ACCESS, is_logged_in: true });

  await ensureTrialPersisted(user.id, profile);

  const refreshedProfile = {
    ...profile,
    ...ensureTrialDates(profile?.trial_started_at, profile?.trial_ends_at)
  };

  return buildResolvedAccess(refreshedProfile);
}

export async function bootAccessGate(options = {}) {
  const useCache = options?.useCache !== false;

  try {
    if (useCache) {
      const cached = readCache();
      if (cached) {
        const applied = applyAccessToDom(cached);
        window.__ITALKY_ACCESS__ = applied;
        return applied;
      }
    }

    const access = await resolveAccess();
    writeCache(access);

    const applied = applyAccessToDom(access);
    window.__ITALKY_ACCESS__ = applied;
    return applied;
  } catch (e) {
    console.warn("[access_gate boot]", e);
    const applied = applyAccessToDom(DEFAULT_ACCESS);
    window.__ITALKY_ACCESS__ = applied;
    return applied;
  }
}

export function clearAccessGateCache() {
  try {
    localStorage.removeItem(ACCESS_CACHE_KEY);
  } catch {}
}
