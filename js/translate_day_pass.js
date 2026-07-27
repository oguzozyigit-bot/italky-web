// FILE: /js/translate_day_pass.js
// Çeviri erişimi: ilk 7 gün ücretsiz (trial), sonrası giriş günü = 5 jeton / 24 saat.
// Mevcut paket / üyelik / hediye günleri bitene kadar aynen devam eder; yeni kural süre dolunca devreye girer.

import { supabase } from "/js/supabase_client.js";

export const TRANSLATE_DAY_PASS_COST = 5;
export const TRANSLATE_FREE_TRIAL_DAYS = 7;
export const TRANSLATE_DAY_PASS_MS = 24 * 60 * 60 * 1000;
export const TRANSLATE_DAY_PASS_SOURCE = "translate_day_pass";

const API_BASE = "https://italky-api.onrender.com";

function dayLabel(d = new Date()) {
  try {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

function parseEndMs(...values) {
  let max = 0;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (Number.isFinite(ms) && ms > max) max = ms;
  }
  return max;
}

async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

/**
 * Aktif paket / trial / üyelik günü varsa yeni 5 jeton kuralı uygulanmaz.
 * Mevcut haklar bitiş tarihine kadar devam eder.
 */
export async function getActiveTranslateAccessUntil(userId) {
  const id = String(userId || "").trim();
  if (!id) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "package_ends_at,trial_ends_at,membership_ends_at,subscription_ends_at,gift_ends_at,nfc_expires_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;

  const endMs = parseEndMs(
    profile?.package_ends_at,
    profile?.trial_ends_at,
    profile?.membership_ends_at,
    profile?.subscription_ends_at,
    profile?.gift_ends_at,
    profile?.nfc_expires_at
  );
  if (!endMs || endMs <= Date.now()) return null;
  return new Date(endMs).toISOString();
}

/**
 * API üzerinden 24 saatlik çeviri günü açmayı dener.
 * italky-api destekliyorsa tercih edilen yol budur.
 */
async function tryApiDayPass(accessToken) {
  const paths = [
    "/license/day-pass",
    "/api/license/day-pass",
    "/license/extend-days",
    "/api/license/extend-days",
  ];
  for (const path of paths) {
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          days: 1,
          cost: TRANSLATE_DAY_PASS_COST,
          tokens: TRANSLATE_DAY_PASS_COST,
          source: TRANSLATE_DAY_PASS_SOURCE,
        }),
      });
      const txt = await r.text();
      let json = null;
      try {
        json = JSON.parse(txt);
      } catch {
        json = { raw: txt };
      }
      if (r.ok && json?.ok !== false) {
        return { ok: true, via: "api", path, json };
      }
    } catch {
      // next path
    }
  }
  return { ok: false };
}

/**
 * Yerel fallback: profiles.tokens düş + wallet_tx + package_ends_at +24s.
 * Aktif bitiş tarihi varsa kısaltılmaz; üzerine eklenir.
 */
async function localDayPass(userId) {
  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select(
      "tokens,package_ends_at,trial_ends_at,membership_ends_at,subscription_ends_at,gift_ends_at,nfc_expires_at,created_at"
    )
    .eq("id", userId)
    .maybeSingle();
  if (readErr) throw readErr;

  const activeUntil = parseEndMs(
    profile?.package_ends_at,
    profile?.trial_ends_at,
    profile?.membership_ends_at,
    profile?.subscription_ends_at,
    profile?.gift_ends_at,
    profile?.nfc_expires_at
  );
  if (activeUntil > Date.now()) {
    return {
      ok: true,
      via: "existing",
      alreadyActive: true,
      package_ends_at: new Date(activeUntil).toISOString(),
      tokens: Math.floor(Number(profile?.tokens || 0)),
    };
  }

  const tokens = Math.floor(Number(profile?.tokens || 0));
  if (tokens < TRANSLATE_DAY_PASS_COST) {
    const err = new Error("INSUFFICIENT_TOKENS");
    err.code = "INSUFFICIENT_TOKENS";
    err.balance = tokens;
    throw err;
  }

  const now = Date.now();
  const base = Math.max(now, activeUntil || 0);
  const newEndsAt = new Date(base + TRANSLATE_DAY_PASS_MS).toISOString();
  const newTokens = tokens - TRANSLATE_DAY_PASS_COST;

  const { error: updErr } = await supabase
    .from("profiles")
    .update({
      tokens: newTokens,
      package_ends_at: newEndsAt,
    })
    .eq("id", userId);
  if (updErr) throw updErr;

  const note = `Çeviri gün geçişi · ${dayLabel()}`;
  try {
    await supabase.from("wallet_tx").insert({
      user_id: userId,
      amount: -TRANSLATE_DAY_PASS_COST,
      tx_type: "debit",
      source: TRANSLATE_DAY_PASS_SOURCE,
      note,
      description: note,
      meta: { days: 1, cost: TRANSLATE_DAY_PASS_COST, day: dayLabel() },
    });
  } catch (e) {
    console.warn("[translate_day_pass] wallet_tx insert failed", e);
  }

  return {
    ok: true,
    via: "local",
    tokens: newTokens,
    package_ends_at: newEndsAt,
  };
}

/** İlk 7 gün ücretsiz mi? (trial_ends_at veya start-trial). */
export function isTranslateTrialActive(profileOrAccess) {
  const trialEnds = profileOrAccess?.trial_ends_at || profileOrAccess?.trialEndsAt;
  if (trialEnds && new Date(trialEnds).getTime() > Date.now()) return true;
  return false;
}

/**
 * 5 jeton karşılığı 24 saat çeviri erişimi açar.
 * Hâlâ geçerli gün hakkı varsa jeton düşülmez; mevcut süre korunur.
 */
export async function purchaseTranslateDayPass() {
  const session = await getSession();
  if (!session?.user?.id || !session.access_token) {
    return { ok: false, error: "Önce giriş yapmalısınız.", code: "SESSION_REQUIRED" };
  }

  try {
    const activeUntil = await getActiveTranslateAccessUntil(session.user.id);
    if (activeUntil) {
      return {
        ok: true,
        via: "existing",
        alreadyActive: true,
        package_ends_at: activeUntil,
        message:
          "Mevcut gün hakkınız bitene kadar devam ediyor. Yeni 5 jeton kuralı süre dolunca geçerli olur.",
      };
    }
  } catch (e) {
    console.warn("[translate_day_pass] active-until check failed", e);
  }

  const api = await tryApiDayPass(session.access_token);
  if (api.ok) {
    return {
      ok: true,
      via: "api",
      message: "24 saatlik çeviri erişimi açıldı (5 jeton).",
      json: api.json,
    };
  }

  try {
    const local = await localDayPass(session.user.id);
    if (local.alreadyActive) {
      return {
        ok: true,
        via: "existing",
        alreadyActive: true,
        package_ends_at: local.package_ends_at,
        message:
          "Mevcut gün hakkınız bitene kadar devam ediyor. Yeni 5 jeton kuralı süre dolunca geçerli olur.",
      };
    }
    return {
      ok: true,
      via: "local",
      message: "24 saatlik çeviri erişimi açıldı (5 jeton).",
      tokens: local.tokens,
      package_ends_at: local.package_ends_at,
    };
  } catch (e) {
    if (e?.code === "INSUFFICIENT_TOKENS" || String(e?.message) === "INSUFFICIENT_TOKENS") {
      return {
        ok: false,
        code: "INSUFFICIENT_TOKENS",
        error: "Yetersiz jeton. 24 saat çeviri için 5 jeton gerekir.",
        balance: e.balance || 0,
      };
    }
    return {
      ok: false,
      error: e?.message || "Gün açılamadı.",
    };
  }
}

export async function ensureTranslateTrialStarted() {
  const session = await getSession();
  if (!session?.access_token) return { ok: false, code: "SESSION_REQUIRED" };
  try {
    const r = await fetch(`${API_BASE}/license/start-trial`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ days: TRANSLATE_FREE_TRIAL_DAYS }),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { ok: false, error: json?.detail || json?.error || `HTTP_${r.status}` };
    }
    return { ok: true, json };
  } catch (e) {
    return { ok: false, error: e?.message || "Trial başlatılamadı" };
  }
}
