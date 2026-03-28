import { supabase } from "/js/supabase_client.js";

const ALLOWED_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function normalizeLang(v) {
  return String(v || "en").trim().toLowerCase();
}

export function normalizeLevel(v) {
  const raw = String(v || "").trim().toUpperCase();
  return ALLOWED_LEVELS.includes(raw) ? raw : null;
}

export function buildLevelHubUrl(lang, redirectTo = "", extra = {}) {
  const url = new URL("/pages/level_test_hub.html", location.origin);
  url.searchParams.set("lang", normalizeLang(lang));

  if (redirectTo) {
    url.searchParams.set("redirect", String(redirectTo).trim());
  }

  Object.entries(extra || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      url.searchParams.set(k, String(v));
    }
  });

  return url.toString();
}

export function resolveLevelFromProfile(profile, lang) {
  const selectedLang = normalizeLang(lang);
  const levels = profile?.levels || {};

  return (
    normalizeLevel(levels[selectedLang]) ||
    normalizeLevel(profile?.current_level) ||
    (selectedLang === "en" ? normalizeLevel(profile?.english_level) : null) ||
    null
  );
}

export function hasPlacement(profile, lang) {
  return Boolean(
    profile?.placement_completed ||
    resolveLevelFromProfile(profile, lang)
  );
}

export async function getSessionUser() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.user || null;
}

export async function getMyProfile() {
  const user = await getSessionUser();
  if (!user?.id) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, levels, current_level, english_level, placement_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[level_gate] profile read error:", error);
    return null;
  }

  return data || null;
}

export async function requireLevelForLanguage(lang, redirectTo = "", extra = {}) {
  const selectedLang = normalizeLang(lang);

  const user = await getSessionUser();
  if (!user?.id) {
    location.replace("/pages/login.html");
    return {
      ok: false,
      reason: "no_session",
      level: null,
      profile: null,
      lang: selectedLang
    };
  }

  const profile = await getMyProfile();
  if (!profile) {
    return {
      ok: false,
      reason: "profile_missing",
      level: null,
      profile: null,
      lang: selectedLang
    };
  }

  const level = resolveLevelFromProfile(profile, selectedLang);
  const placementOk = hasPlacement(profile, selectedLang);

  if (!placementOk || !level) {
    location.href = buildLevelHubUrl(selectedLang, redirectTo, extra);
    return {
      ok: false,
      reason: "level_required",
      level: null,
      profile,
      lang: selectedLang
    };
  }

  return {
    ok: true,
    reason: "ok",
    level,
    profile,
    lang: selectedLang
  };
}
