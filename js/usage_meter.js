// FILE: /js/usage_meter.js

import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";

function cleanString(v, fallback = "") {
  const s = String(v ?? fallback).trim();
  return s || fallback;
}

function cleanNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

export function buildUsageNote({
  surface = "",
  usageKind = "",
  mode = "",
  module = ""
} = {}) {
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
  note = "",
  meta = {},
  charsPerJeton = undefined
} = {}) {
  const resolvedUserId = cleanString(userId) || await getCurrentUserId();
  const resolvedModule = cleanString(module);
  const resolvedUsageKind = cleanString(usageKind, "text");
  const resolvedCharCount = Math.max(0, cleanNumber(charCount, 0));

  if (!resolvedUserId) {
    const err = new Error("user_id required");
    err.code = "USER_ID_REQUIRED";
    throw err;
  }

  if (!resolvedModule) {
    const err = new Error("module required");
    err.code = "MODULE_REQUIRED";
    throw err;
  }

  if (resolvedCharCount <= 0) {
    return {
      ok: true,
      charged: false,
      jetons_spent: 0,
      tokens_after: 0,
      text_bucket: 0,
      voice_bucket: 0
    };
  }

  const payload = {
    user_id: resolvedUserId,
    module: resolvedModule,
    usage_kind: resolvedUsageKind,
    char_count: resolvedCharCount,
    note: cleanString(note),
    meta: meta && typeof meta === "object" ? meta : {}
  };

  if (charsPerJeton != null) {
    payload.chars_per_jeton = cleanNumber(charsPerJeton, 0);
  }

  const resp = await fetch(`${API_BASE}/api/usage/commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const detail = json?.detail;

    if (detail?.code === "INSUFFICIENT_TOKENS") {
      const err = new Error("insufficient_tokens");
      err.code = "INSUFFICIENT_TOKENS";
      err.detail = detail;
      throw err;
    }

    const err = new Error(
      detail?.message ||
      detail?.error ||
      detail?.detail ||
      detail ||
      `usage_commit_failed_${resp.status}`
    );
    err.code = "USAGE_COMMIT_FAILED";
    err.detail = detail || json;
    throw err;
  }

  if (json?.detail?.code === "INSUFFICIENT_TOKENS") {
    const err = new Error("insufficient_tokens");
    err.code = "INSUFFICIENT_TOKENS";
    err.detail = json.detail;
    throw err;
  }

  return {
    ...json,
    charged: !!json?.charged || cleanNumber(json?.tokens_charged, 0) > 0,
    jetons_spent: cleanNumber(json?.jetons_spent, cleanNumber(json?.tokens_charged, 0)),
    tokens_after: cleanNumber(json?.tokens_after, 0),
    text_bucket: cleanNumber(json?.text_bucket, 0),
    voice_bucket: cleanNumber(json?.voice_bucket, 0)
  };
}
