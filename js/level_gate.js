// FILE: /js/level_gate.js

import { supabase } from "/js/supabase_client.js";

const ALLOWED_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const API_BASE = "https://italky-api.onrender.com";

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

async function getAuthHeaders() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const token = data?.session?.access_token || "";

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  } catch (e) {
    console.warn("[level_gate] getAuthHeaders error:", e);
    return { "Content-Type": "application/json" };
  }
}

function showLevelExamTokenWarning() {
  alert("Seviye Tespit Sınavı için 1 jeton gerekir. 1 jetonla 7 gün boyunca sınırsız giriş açılır.");
  location.href = "/pages/jetonbuy.html";
}

export async function ensureLevelTestAccess() {
  const user = await getSessionUser();

  if (!user?.id) {
    location.replace("/pages/login.html");
    return {
      ok: false,
      reason: "no_session",
      access_open: false
    };
  }

  try {
    const res = await fetch(`${API_BASE}/level_test/ensure_access`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        user_id: user.id
      })
    });

    const json = await res.json().catch(() => null);

    if (!json) {
      alert("Sınav erişimi şu anda kontrol edilemedi.");
      return {
        ok: false,
        reason: "invalid_response",
        access_open: false
      };
    }

    if (!json.ok && json.reason === "INSUFFICIENT_TOKENS") {
      showLevelExamTokenWarning();
      return {
        ok: false,
        reason: "INSUFFICIENT_TOKENS",
        access_open: false,
        data: json
      };
    }

    if (!res.ok) {
      alert("Sınav erişimi kontrolünde hata oluştu.");
      return {
        ok: false,
        reason: "request_failed",
        access_open: false,
        data: json
      };
    }

    if (typeof json.tokens_after === "number" && window.setHeaderTokens) {
      try {
        window.setHeaderTokens(json.tokens_after);
      } catch {}
    }

    return {
      ok: true,
      reason: json.used_token ? "token_spent_access_opened" : "existing_access",
      access_open: true,
      data: json
    };
  } catch (e) {
    console.error("[level_gate] ensureLevelTestAccess error:", e);
    alert("Sınav erişimi kontrol edilemedi.");
    return {
      ok: false,
      reason: "exception",
      access_open: false,
      error: e
    };
  }
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
