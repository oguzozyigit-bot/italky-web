import { supabase } from "/js/supabase_client.js";

const PIVOT = "en";

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function getAccessSnapshot() {
  const g = window.__ITALKY_ACCESS__ || {};

  const trialDaysLeft =
    Number(g.trialDaysLeft ?? g.trial_days_left ?? g.remainingTrialDays ?? g.remaining_trial_days ?? 0) || 0;

  const trialActive =
    g.trialActive === true ||
    g.trial_active === true ||
    trialDaysLeft > 0;

  const packageActive =
    g.hasPackage === true ||
    g.has_package === true ||
    g.packageActive === true ||
    g.package_active === true ||
    g.isPremium === true ||
    g.premium === true;

  const nfcActive =
    g.nfcActive === true ||
    g.nfc_active === true ||
    g.cardAccess === true ||
    g.card_access === true;

  return {
    ok: trialActive || packageActive || nfcActive,
    trialActive,
    packageActive,
    nfcActive,
    trialDaysLeft
  };
}

function getInstalledPairs() {
  try {
    return JSON.parse(localStorage.getItem("offline_installed_langs_v2") || "[]");
  } catch {
    return [];
  }
}

function isPairInstalled(pair) {
  const p = norm(pair);
  const local = getInstalledPairs().map(norm);
  if (local.includes(p)) return true;

  try {
    if (window.Offline && typeof window.Offline.isInstalled === "function") {
      return !!window.Offline.isInstalled(p);
    }
  } catch {}

  return false;
}

function getProfileOfflineLangEntries(profile) {
  const raw = profile?.offline_langs;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === "string") {
        return { code: norm(x), download_count: 1 };
      }
      return {
        code: norm(x?.code),
        download_count: Number(x?.download_count || 0)
      };
    })
    .filter((x) => !!x.code);
}

function hasEverDownloaded(profile, lang) {
  return getProfileOfflineLangEntries(profile).some((x) => x.code === norm(lang) && x.download_count > 0);
}

function hasBaseForUserLang(userLang) {
  const lang = norm(userLang);
  if (!lang || lang === PIVOT) return true;
  return isPairInstalled(`${lang}-${PIVOT}`) && isPairInstalled(`${PIVOT}-${lang}`);
}

function hasOfflineLanguage(profile, userLang, targetLang) {
  const user = norm(userLang);
  const target = norm(targetLang);

  if (!target || target === user) return false;
  if (!hasBaseForUserLang(user)) return false;

  if (target === PIVOT) {
    return true;
  }

  return (
    hasEverDownloaded(profile, target) &&
    isPairInstalled(`${target}-${PIVOT}`) &&
    isPairInstalled(`${PIVOT}-${target}`)
  );
}

async function getCurrentProfile() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data?.user?.id || "";
  if (!userId) {
    return { user: null, profile: null };
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, tokens, offline_langs")
    .eq("id", userId)
    .single();

  if (pErr) throw pErr;

  return {
    user: data.user,
    profile: profile || null
  };
}

export async function resolveOfflineRuntime(userLang, targetLang) {
  const access = getAccessSnapshot();

  const { user, profile } = await getCurrentProfile();

  if (!user?.id) {
    return {
      ok: false,
      reason: "no_session",
      access,
      profile: null
    };
  }

  if (!access.ok) {
    return {
      ok: false,
      reason: "license_required",
      access,
      profile
    };
  }

  if (!hasBaseForUserLang(userLang)) {
    return {
      ok: false,
      reason: "base_missing",
      access,
      profile
    };
  }

  if (!hasOfflineLanguage(profile, userLang, targetLang)) {
    return {
      ok: false,
      reason: "lang_missing",
      access,
      profile
    };
  }

  return {
    ok: true,
    reason: "ok",
    access,
    profile
  };
}

export function explainOfflineFailure(reason) {
  if (reason === "no_session") {
    return "Önce giriş yapmalısınız.";
  }
  if (reason === "license_required") {
    return "Offline paketler cihazda hazır. Kullanıma devam etmek için üyelik veya erişim gerekir.";
  }
  if (reason === "base_missing") {
    return "Temel offline köprü kurulu değil. İnternet varken önce temel kurulumu tamamlayın.";
  }
  if (reason === "lang_missing") {
    return "Seçtiğiniz hedef dil bu cihazda offline kurulu değil.";
  }
  return "Offline çalışma koşulları sağlanamadı.";
}
