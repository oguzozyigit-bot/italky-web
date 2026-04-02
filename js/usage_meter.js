import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const CHARS_PER_JETON = 3000;

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
  return Math.ceil(n / CHARS_PER_JETON);
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

/*
  Yeni mantık:
  - standard / ai ayrımı yerine usage_kind: text | voice
  - ücretli olan her modül tek merkezden usage_billing'e gider
  - ilk kullanımda 1 jeton + her 3000 karakterde 1 jeton
*/
export async function commitUsage({
  module,
  usageKind = "text",
  text,
  charCount,
  note = "",
  meta = {}
}) {
  const userId = await getUserIdOrThrow();
  const finalCharCount = Math.max(0, Number(charCount || countChars(text)));

  if (!finalCharCount) {
    return {
      ok: true,
      module,
      usage_kind: usageKind,
      char_count: 0,
      tokens_charged: 0,
      tokens_before: 0,
      tokens_after: 0,
      reason: "Boş içerik"
    };
  }

  return await postUsage("/api/usage/commit", {
    user_id: userId,
    module,
    usage_kind: usageKind,
    char_count: finalCharCount,
    note,
    meta
  });
}

/*
  Jetonlu modül isimlerini tek merkezden çözüyoruz
*/
export function resolveUsageModule({
  surface = "",
  kind = "text",
  mode = ""
}) {
  const s = String(surface || "").trim().toLowerCase();
  const k = String(kind || "text").trim().toLowerCase();
  const m = String(mode || "").trim().toLowerCase();

  // Practice AI
  if (s === "practice" || s === "practic" || s === "practiceai") {
    if (k === "voice") return "voice_ai";
    return "practic_ai";
  }

  // FaceToFace
  if (s === "facetoface" || s === "f2f" || s === "face") {
    if (k === "voice") {
      if (m === "clone_preview") return "voice_clone_preview";
      if (m === "clone") return "voice_clone";
      if (m === "preset_preview") return "voice_preset_preview";
      if (m === "preset") return "voice_preset_use";
      return "voice_ai";
    }

    if (m === "cultural") return "facetoface_ai";
    return "facetoface_standard";
  }

  // SideToSide / EarToEar
  if (s === "eartoear" || s === "sidetoside" || s === "s2s") {
    if (k === "voice") {
      if (m === "clone_preview") return "voice_clone_preview";
      if (m === "clone") return "voice_clone";
      if (m === "preset_preview") return "voice_preset_preview";
      if (m === "preset") return "voice_preset_use";
      return "voice_ai";
    }

    if (m === "cultural") return "eartoear_ai";
    return "eartoear_standard";
  }

  // TextToText / Cultural Translate
  if (s === "text" || s === "texttotext" || s === "translate") {
    if (k === "voice") {
      if (m === "clone_preview") return "voice_clone_preview";
      if (m === "clone") return "voice_clone";
      if (m === "preset_preview") return "voice_preset_preview";
      if (m === "preset") return "voice_preset_use";
      return "voice_ai";
    }

    if (m === "cultural") return "text_ai";
    return "text_standard";
  }

  // Genel fallback
  if (k === "voice") return "voice_ai";
  return "text_ai";
}

export function buildUsageNote({
  surface = "",
  usageKind = "text",
  mode = "",
  custom = ""
}) {
  if (custom) return String(custom);

  const s = String(surface || "").trim().toLowerCase();
  const k = String(usageKind || "text").trim().toLowerCase();
  const m = String(mode || "").trim().toLowerCase();

  if (k === "voice") {
    if (m === "preset_preview") return "Ücretsiz özel ses önizleme";
    if (m === "preset") return "Jetonlu model kullanımı • Özel Ses";
    if (m === "clone_preview") return "Jetonlu model kullanımı • Kendi Sesim Önizleme";
    if (m === "clone") return "Jetonlu model kullanımı • Kendi Sesim";
    return "Jetonlu model kullanımı • Ses";
  }

  if (s === "practice" || s === "practic" || s === "practiceai") {
    return "Jetonlu model kullanımı • Practice AI";
  }

  if (m === "cultural") {
    return "Jetonlu model kullanımı • Kültürel Translate";
  }

  if (s === "facetoface" || s === "f2f" || s === "face") {
    return "Jetonlu model kullanımı • FaceToFace";
  }

  if (s === "eartoear" || s === "sidetoside" || s === "s2s") {
    return "Jetonlu model kullanımı • SideToSide";
  }

  if (s === "text" || s === "texttotext" || s === "translate") {
    return "Jetonlu model kullanımı • Çeviri";
  }

  return "Jetonlu model kullanımı";
}
