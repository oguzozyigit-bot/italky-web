import { supabase } from "/js/supabase_client.js";

export function normalizeLang(v) {
  return String(v || "en").trim().toLowerCase();
}

export function normalizeLevel(v) {
  const raw = String(v || "").trim().toUpperCase();
  const allowed = ["A1", "A2", "B1", "B2", "C1", "C2"];
  return allowed.includes(raw) ? raw : null;
}

export async function requireLevelForLanguage(lang, redirectTo = "") {
  const selectedLang = normalizeLang(lang);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    location.replace("/pages/login.html");
    return { ok: false, reason: "no_session", level: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, levels, current_level, english_level, placement_completed")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !profile) {
    return { ok: false, reason: "profile_missing", level: null, profile: null };
  }

  const levels = profile.levels || {};
  const langLevel =
    normalizeLevel(levels[selectedLang]) ||
    normalizeLevel(profile.current_level) ||
    (selectedLang === "en" ? normalizeLevel(profile.english_level) : null);

  const placementOk = Boolean(profile.placement_completed || langLevel);

  if (!placementOk || !langLevel) {
    const url = new URL("/pages/level_test_hub.html", location.origin);
    url.searchParams.set("lang", selectedLang);
    if (redirectTo) url.searchParams.set("redirect", redirectTo);
    location.href = url.toString();
    return { ok: false, reason: "level_required", level: null, profile };
  }

  return {
    ok: true,
    reason: "ok",
    level: langLevel,
    profile
  };
}
