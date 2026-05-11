const GAME_CONTENT_BASE_URL = "https://auth.italky.ai/storage/v1/object/public/lang";
const SUPPORTED_CONTENT_LANGS = ["en", "de", "fr", "es", "it"];
const ITEM_ARRAY_KEYS = ["items", "words", "data", "list", "entries", "pool"];

export const GAME_CONTENT_SOURCE = `${GAME_CONTENT_BASE_URL}/{lang}.json`;

export function normalizeGameContentLang(input, fallback = "en") {
  const code = String(input || "").trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_CONTENT_LANGS.includes(code) ? code : fallback;
}

export function getGameContentUrl(lang) {
  const cleanLang = normalizeGameContentLang(lang);
  return `${GAME_CONTENT_BASE_URL}/${cleanLang}.json`;
}

function extractRows(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    for (const key of ITEM_ARRAY_KEYS) {
      if (Array.isArray(raw[key])) return raw[key];
    }

    const entries = Object.entries(raw);
    if (entries.length && entries.every(([, value]) => typeof value === "string")) {
      return entries.map(([word, meaning]) => ({ word, meaning }));
    }

    const values = Object.values(raw);
    if (values.length && values.every(value => value && typeof value === "object" && !Array.isArray(value))) {
      return values;
    }
  }
  return [];
}

function normalizeKey(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ğüşıöçİĞÜŞÖÇ]+/gi, "")
    .trim();
}

function firstStringFromKeys(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value != null && typeof value !== "object" && String(value).trim()) return String(value).trim();
  }
  return "";
}

function normalizeCodeCrackerRows(rows, lang) {
  const cleanLang = normalizeGameContentLang(lang);
  const seen = new Set();
  const out = [];

  for (const item of rows) {
    let word = "";
    let meaning = "";

    if (Array.isArray(item)) {
      word = String(item[0] ?? "").trim();
      meaning = String(item[1] ?? "").trim();
    } else if (item && typeof item === "object") {
      word = firstStringFromKeys(item, ["word", "w", "text", "term", "answer"]);
      meaning = firstStringFromKeys(item, ["meaning", "tr", "translation", "hint"]);

      if (!word) word = firstStringFromKeys(item, [cleanLang]);
      if (!meaning && cleanLang !== "tr") meaning = firstStringFromKeys(item, ["tr_TR", "turkish"]);
    }

    const key = `${normalizeKey(word)}:${normalizeKey(meaning)}`;
    if (!word || !meaning || key === ":" || seen.has(key)) continue;
    seen.add(key);
    out.push({ word: String(word), meaning: String(meaning), lang: cleanLang });
  }

  return out;
}

function normalizeBroadRows(rows, lang) {
  const cleanLang = normalizeGameContentLang(lang);
  const seen = new Set();
  const out = [];

  for (const item of rows) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const word = firstStringFromKeys(item, ["word", "w", "text", "term", "answer", "source", cleanLang]);
    const meaning = firstStringFromKeys(item, ["meaning", "tr", "translation", "mean", "hint", "target", "turkish"]);
    const key = `${normalizeKey(word)}:${normalizeKey(meaning)}`;
    if (!word || !meaning || key === ":" || seen.has(key)) continue;
    seen.add(key);
    out.push({ word: String(word), meaning: String(meaning), lang: cleanLang });
  }

  return out;
}

export function normalizeGameWordRows(raw, lang = "en") {
  const rows = extractRows(raw);
  const codeCrackerRows = normalizeCodeCrackerRows(rows, lang);
  if (codeCrackerRows.length) return codeCrackerRows;
  return normalizeBroadRows(rows, lang);
}

function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function previewText(text) {
  return String(text || "").slice(0, 420).replace(/\s+/g, " ").trim();
}

export async function loadGameWords(lang, options = {}) {
  const cleanLang = normalizeGameContentLang(lang);
  const sourceUrl = getGameContentUrl(cleanLang);
  const caller = options.caller || "game";

  console.log("[GameContentHelper] url", { caller, selectedLang: cleanLang, url: sourceUrl });

  try {
    const response = await fetchWithTimeout(sourceUrl, { method: "GET", cache: "no-store" }, options.timeoutMs || 9000);
    const contentType = response.headers?.get?.("content-type") || "";
    console.log("[GameContentHelper] status", { caller, selectedLang: cleanLang, status: response.status, ok: response.ok, contentType });

    if (!response.ok) return [];

    const rawText = await response.text();
    console.log("[GameContentHelper] rawPreview", { caller, selectedLang: cleanLang, rawPreview: previewText(rawText) });

    let raw = null;
    try {
      raw = JSON.parse(rawText);
    } catch (error) {
      console.warn("[GameContentHelper] json parse failed", { caller, selectedLang: cleanLang, error: error?.message || String(error), rawPreview: previewText(rawText) });
      return [];
    }

    const rawRows = extractRows(raw);
    const normalizedRows = normalizeGameWordRows(raw, cleanLang);
    console.log("[GameContentHelper] normalizedCount", {
      caller,
      selectedLang: cleanLang,
      rawType: Array.isArray(raw) ? "array" : typeof raw,
      rawCount: rawRows.length,
      normalizedCount: normalizedRows.length,
      sample: normalizedRows[0] || null
    });

    return normalizedRows;
  } catch (error) {
    console.warn("[GameContentHelper] load failed", {
      caller,
      selectedLang: cleanLang,
      url: sourceUrl,
      error: error?.name === "AbortError" ? "fetch_timeout" : (error?.message || String(error))
    });
    return [];
  }
}

const GameContentHelper = Object.freeze({
  GAME_CONTENT_SOURCE,
  getGameContentUrl,
  loadGameWords,
  normalizeGameContentLang,
  normalizeGameWordRows
});

try {
  window.GameContentHelper = GameContentHelper;
  window.loadGameWords = loadGameWords;
  console.log("[GameContentHelper] global ready", { source: GAME_CONTENT_SOURCE });
} catch {}
