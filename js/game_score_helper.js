import { supabase } from "/js/supabase_client.js";

export const SUPPORTED_GAME_LANGS = ["en", "de", "fr", "es", "it"];

export const GAME_LANG_META = {
  en: { name: "İngilizce", flag: "🇬🇧", bcp: "en-US" },
  de: { name: "Almanca", flag: "🇩🇪", bcp: "de-DE" },
  fr: { name: "Fransızca", flag: "🇫🇷", bcp: "fr-FR" },
  es: { name: "İspanyolca", flag: "🇪🇸", bcp: "es-ES" },
  it: { name: "İtalyanca", flag: "🇮🇹", bcp: "it-IT" }
};

export function normalizeGameLang(input, fallback = "en") {
  const code = String(input || "").trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_GAME_LANGS.includes(code) ? code : fallback;
}

export function getGameLangFromUrl(fallback = "en") {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return normalizeGameLang(params.get("lang"), fallback);
  } catch {
    return fallback;
  }
}

export function getGameHighScoreKey(gameSlug, lang) {
  return `italky_game_high_score_${String(gameSlug || "game")}_${normalizeGameLang(lang)}`;
}

export function getLocalHighScore(gameSlug, lang) {
  try {
    return Number(localStorage.getItem(getGameHighScoreKey(gameSlug, lang)) || 0) || 0;
  } catch {
    return 0;
  }
}

export function setLocalHighScore(gameSlug, lang, score) {
  const cleanScore = Math.max(0, Number(score || 0) || 0);
  const current = getLocalHighScore(gameSlug, lang);
  if (cleanScore <= current) return current;
  try {
    localStorage.setItem(getGameHighScoreKey(gameSlug, lang), String(cleanScore));
  } catch {}
  return cleanScore;
}

export function countryCodeToFlag(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return Array.from(code).map(char => String.fromCodePoint(127397 + char.charCodeAt(0))).join("");
}

function buildInitials(name) {
  const clean = String(name || "").trim();
  if (!clean) return "Oyuncu";
  const parts = clean.split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "Oyuncu";
  return parts.map(part => `${part[0]?.toLocaleUpperCase("tr-TR") || ""}.`).join("");
}

async function getSessionUser() {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) return data.user;
  } catch (error) {
    console.warn("[GAME_SCORE] getUser failed", error);
  }

  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user || null;
  } catch (error) {
    console.warn("[GAME_SCORE] getSession failed", error);
    return null;
  }
}

export async function getCurrentUserId() {
  const user = await getSessionUser();
  return user?.id || null;
}

export async function getScoreOwnerSnapshot() {
  const user = await getSessionUser();
  if (!user) return { user: null, playerInitials: "Oyuncu", countryCode: null };

  let profile = null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (!error) profile = data || null;
    if (error) console.warn("[GAME_SCORE] profile snapshot skipped", error);
  } catch (error) {
    console.warn("[GAME_SCORE] profile snapshot failed", error);
  }

  const meta = user.user_metadata || {};
  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.name ||
    profile?.hitap ||
    meta.full_name ||
    meta.name ||
    meta.display_name ||
    user.email?.split("@")[0] ||
    "";

  const countryCode = profile?.country_code || meta.country_code || null;
  return {
    user,
    playerInitials: buildInitials(displayName),
    countryCode: countryCode ? String(countryCode).trim().toUpperCase() : null
  };
}

export async function saveGameScore({
  gameSlug,
  lang,
  score,
  correctCount = 0,
  wrongCount = 0,
  durationSeconds = 0
}) {
  const cleanSlug = String(gameSlug || "").trim();
  const cleanLang = normalizeGameLang(lang);
  const cleanScore = Math.max(0, Number(score || 0) || 0);
  if (!cleanSlug) return { ok: false, skipped: true, reason: "missing_game_slug" };

  setLocalHighScore(cleanSlug, cleanLang, cleanScore);

  const snapshot = await getScoreOwnerSnapshot();
  if (!snapshot.user?.id) return { ok: false, skipped: true, reason: "no_session" };

  try {
    const { error } = await supabase.from("game_scores").insert({
      user_id: snapshot.user.id,
      game_slug: cleanSlug,
      lang: cleanLang,
      score: cleanScore,
      correct_count: Math.max(0, Number(correctCount || 0) || 0),
      wrong_count: Math.max(0, Number(wrongCount || 0) || 0),
      duration_seconds: Math.max(0, Number(durationSeconds || 0) || 0),
      player_initials: snapshot.playerInitials,
      country_code: snapshot.countryCode
    });
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    console.warn("[GAME_SCORE] save failed", { gameSlug: cleanSlug, lang: cleanLang, error });
    return { ok: false, error };
  }
}

export async function getPersonalBest(gameSlug, lang) {
  const cleanSlug = String(gameSlug || "").trim();
  const cleanLang = normalizeGameLang(lang);
  const userId = await getCurrentUserId();
  if (!cleanSlug || !userId) return null;

  try {
    const { data, error } = await supabase
      .from("game_scores")
      .select("score")
      .eq("user_id", userId)
      .eq("game_slug", cleanSlug)
      .eq("lang", cleanLang)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.score ?? null;
  } catch (error) {
    console.warn("[GAME_SCORE] personal best failed", { gameSlug: cleanSlug, lang: cleanLang, error });
    return null;
  }
}

export async function getGlobalBest(gameSlug, lang) {
  const cleanSlug = String(gameSlug || "").trim();
  const cleanLang = normalizeGameLang(lang);
  if (!cleanSlug) return null;

  try {
    const { data, error } = await supabase
      .from("game_scores")
      .select("score, player_initials, country_code")
      .eq("game_slug", cleanSlug)
      .eq("lang", cleanLang)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.warn("[GAME_SCORE] global best failed", { gameSlug: cleanSlug, lang: cleanLang, error });
    return null;
  }
}

export function formatGlobalBest(best) {
  if (!best || !Number.isFinite(Number(best.score))) return "GENEL REKOR: —";
  const owner = String(best.player_initials || "Oyuncu").trim() || "Oyuncu";
  const flag = countryCodeToFlag(best.country_code);
  return `GENEL REKOR: ${Number(best.score)} • ${owner}${flag ? ` ${flag}` : ""}`;
}

export async function refreshGameScoreLabels({ gameSlug, lang, personalEl, globalEl }) {
  const cleanLang = normalizeGameLang(lang);
  const localBest = getLocalHighScore(gameSlug, cleanLang);
  if (personalEl) personalEl.textContent = `SENİN REKORUN: ${localBest || "—"}`;
  if (globalEl) globalEl.textContent = "GENEL REKOR: —";

  const [personalBest, globalBest] = await Promise.all([
    getPersonalBest(gameSlug, cleanLang),
    getGlobalBest(gameSlug, cleanLang)
  ]);

  const bestPersonal = Math.max(localBest, Number(personalBest || 0) || 0);
  if (bestPersonal > localBest) setLocalHighScore(gameSlug, cleanLang, bestPersonal);
  if (personalEl) personalEl.textContent = `SENİN REKORUN: ${bestPersonal || "—"}`;
  if (globalEl) globalEl.textContent = formatGlobalBest(globalBest);

  return { personalBest: bestPersonal, globalBest };
}

export function speakGameText(text, lang) {
  const clean = String(text || "").trim();
  if (!clean) return false;
  const bcp = GAME_LANG_META[normalizeGameLang(lang)]?.bcp || "en-US";

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(clean, bcp);
      return true;
    }
  } catch (error) {
    console.warn("[GAME_SCORE] NativeTTS failed", error);
  }

  try {
    if (!("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = bcp;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    const langPrefix = bcp.split("-")[0].toLowerCase();
    const voices = window.speechSynthesis.getVoices?.() || [];
    const voice = voices.find(item => String(item.lang || "").toLowerCase().startsWith(langPrefix));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.warn("[GAME_SCORE] speechSynthesis failed", error);
    return false;
  }
}
