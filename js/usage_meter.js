// FILE: /js/usage_meter.js

import { supabase } from "/js/supabase_client.js";

function cleanString(v, fallback = "") {
  const s = String(v ?? fallback).trim();
  return s || fallback;
}

function cleanNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function makeRequestId() {
  try {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  } catch {}
  return `usage-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function getCurrentAuth() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session || null;
    return {
      userId: session?.user?.id || null,
      accessToken: session?.access_token || null,
    };
  } catch {
    return { userId: null, accessToken: null };
  }
}

export function buildUsageNote({ surface = "", usageKind = "", mode = "", module = "" } = {}) {
  const parts = [];
  if (surface) parts.push(cleanString(surface));
  if (module) parts.push(cleanString(module));
  if (usageKind) parts.push(cleanString(usageKind));
  if (mode) parts.push(cleanString(mode));
  return parts.length ? parts.join(" • ") : "Kullanım";
}

export async function commitUsage({
  userId = "",
  module = "",
  usageKind = "text",
  charCount = 0,
  requestId = ""
} = {}) {
  const auth = await getCurrentAuth();
  const suppliedUserId = cleanString(userId);
  const resolvedUserId = auth.userId || suppliedUserId;
  const resolvedModule = cleanString(module);
  const resolvedRequestId = cleanString(requestId) || makeRequestId();

  if (!resolvedUserId || !auth.accessToken) {
    const err = new Error("Oturum doğrulanamadı. Lütfen yeniden giriş yapın.");
    err.code = "AUTH_REQUIRED";
    throw err;
  }

  if (suppliedUserId && auth.userId && suppliedUserId !== auth.userId) {
    const err = new Error("Kullanıcı oturumu eşleşmiyor.");
    err.code = "AUTH_USER_MISMATCH";
    throw err;
  }

  if (!resolvedModule) {
    const err = new Error("module required");
    err.code = "MODULE_REQUIRED";
    throw err;
  }

  // italkyAI bireysel kullanım: giriş sonrası ücretsiz. Kullanım kaydı jeton düşürmez.
  return {
    ok: true,
    charged: false,
    jetons_spent: 0,
    tokens_charged: 0,
    tokens_after: 0,
    text_bucket: Math.max(0, cleanNumber(charCount, 0)),
    voice_bucket: 0,
    request_id: resolvedRequestId,
    access_mode: "logged_in_free",
    access_ends_at: null,
    billing_model: "free_after_login",
    daily_access: false,
    usage_kind: cleanString(usageKind, "text"),
  };
}
