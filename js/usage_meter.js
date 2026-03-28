import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";

function normalizeText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .trim();
}

export function countChars(value) {
  return normalizeText(value).length;
}

export function calcTokensFromChars(charCount) {
  const n = Math.max(0, Number(charCount || 0));
  return Math.ceil(n / 1000);
}

async function getUserIdOrThrow() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message || "Oturum okunamadı");
  const userId = data?.user?.id || "";
  if (!userId) throw new Error("Giriş yapmanız gerekiyor");
  return userId;
}

async function postUsage(path, payload) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    const detail = json?.detail;

    if (detail?.code === "INSUFFICIENT_TOKENS") {
      const needed = Number(detail?.tokens_needed || 0);
      const have = Number(detail?.tokens_before || 0);
      const err = new Error(`Yetersiz jeton. Gereken: ${needed}, mevcut: ${have}`);
      err.code = "INSUFFICIENT_TOKENS";
      err.tokensNeeded = needed;
      err.tokensBefore = have;
      throw err;
    }

    throw new Error(
      typeof detail === "string"
        ? detail
        : json?.message || `Kullanım isteği başarısız (${res.status})`
    );
  }

  return json;
}

export async function previewUsage({
  module,
  mode,
  text,
  charCount,
  note = "",
  meta = {}
}) {
  const userId = await getUserIdOrThrow();
  const finalCharCount = Math.max(
    0,
    Number(charCount || countChars(text))
  );

  if (!finalCharCount) {
    return {
      ok: true,
      module,
      mode,
      char_count: 0,
      free_applied_chars: 0,
      paid_chars: 0,
      tokens_to_charge: 0,
      tokens_before: 0,
      tokens_after: 0,
      standard_char_used_before: 0,
      standard_char_used_after: 0,
      free_limit: 10000,
      chars_per_token: 1000,
      reason: "Boş içerik"
    };
  }

  return await postUsage("/api/usage/preview", {
    user_id: userId,
    module,
    char_count: finalCharCount,
    mode,
    note,
    meta
  });
}

export async function commitUsage({
  module,
  mode,
  text,
  charCount,
  note = "",
  meta = {}
}) {
  const userId = await getUserIdOrThrow();
  const finalCharCount = Math.max(
    0,
    Number(charCount || countChars(text))
  );

  if (!finalCharCount) {
    return {
      ok: true,
      module,
      mode,
      char_count: 0,
      free_applied_chars: 0,
      paid_chars: 0,
      tokens_charged: 0,
      tokens_before: 0,
      tokens_after: 0,
      standard_char_used_before: 0,
      standard_char_used_after: 0,
      reason: "Boş içerik"
    };
  }

  return await postUsage("/api/usage/commit", {
    user_id: userId,
    module,
    char_count: finalCharCount,
    mode,
    note,
    meta
  });
}

export function resolveUsageModule({
  surface = "",
  ai = false
}) {
  const s = String(surface || "").trim().toLowerCase();

  if (s === "text" || s === "texttotext") {
    return ai ? "text_ai" : "text_standard";
  }

  if (s === "facetoface" || s === "f2f" || s === "face") {
    return ai ? "facetoface_ai" : "facetoface_standard";
  }

  if (s === "eartoear" || s === "sidetoside" || s === "s2s") {
    return ai ? "eartoear_ai" : "eartoear_standard";
  }

  if (s === "practic" || s === "practice") {
    return "practic_ai";
  }

  return ai ? "text_ai" : "text_standard";
}

export function resolveUsageMode({
  ai = false
}) {
  return ai ? "ai" : "standard";
}

export function buildUsageNote({
  surface = "",
  ai = false,
  custom = ""
}) {
  if (custom) return String(custom);

  const s = String(surface || "").trim().toLowerCase();

  if (s === "text" || s === "texttotext") {
    return ai ? "AI / kültürel TextToText kullanımı" : "Standart TextToText kullanımı";
  }

  if (s === "facetoface" || s === "f2f" || s === "face") {
    return ai ? "AI / özel ses FaceToFace kullanımı" : "Standart FaceToFace kullanımı";
  }

  if (s === "eartoear" || s === "sidetoside" || s === "s2s") {
    return ai ? "AI / özel ses EarToEar kullanımı" : "Standart EarToEar kullanımı";
  }

  if (s === "practic" || s === "practice") {
    return "Practic AI sohbet kullanımı";
  }

  return ai ? "AI kullanım" : "Standart kullanım";
}
