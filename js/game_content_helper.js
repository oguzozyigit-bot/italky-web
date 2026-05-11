const GAME_CONTENT_BASE_URL = "https://auth.italky.ai/storage/v1/object/public/lang";
const SUPPORTED_CONTENT_LANGS = ["en", "de", "fr", "es", "it"];
const ITEM_ARRAY_KEYS = ["items", "words", "data", "list", "entries", "pool"];

export const GAME_CONTENT_SOURCE = `${GAME_CONTENT_BASE_URL}/{lang}.json`;

export function normalizeGameContentLang(input, fallback = "en") {
  const code = String(input || "").trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_CONTENT_LANGS.includes(code) ? code : fallback;
}

export function getGameContentUrl(lang) {
  return `${GAME_CONTENT_BASE_URL}/${normalizeGameContentLang(lang)}.json`;
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

function readFirstString(item, keys) {
  if (Array.isArray(item)) {
    for (const value of item) {
      if (typeof value === "string" && value.trim()) return value.trim();
      if (value != null && typeof value !== "object" && String(value).trim()) return String(value).trim();
    }
  }

  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value != null && typeof value !== "object" && String(value).trim()) return String(value).trim();
  }
  return "";
}

function normalizeKey(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, "")
    .trim();
}

export function normalizeGameWordRows(raw, lang = "en") {
  const cleanLang = normalizeGameContentLang(lang);
  const rows = extractRows(raw);
  const seen = new Set();
  const normalized = [];

  for (const item of rows) {
    let word = "";
    let meaning = "";

    if (Array.isArray(item)) {
      word = readFirstString([item[0]], []);
      meaning = readFirstString([item[1]], []);
    } else {
      word = readFirstString(item, ["word", "w", "text", "term", "answer", "source", cleanLang]);
      meaning = readFirstString(item, ["meaning", "tr", "translation", "mean", "hint", "target"]);
    }

    const key = `${normalizeKey(word)}:${normalizeKey(meaning)}`;
    if (!word || !meaning || key === ":" || seen.has(key)) continue;
    seen.add(key);
    normalized.push({ word, meaning, lang: cleanLang });
  }

  return normalized;
}

function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function loadGameWords(lang, options = {}) {
  const cleanLang = normalizeGameContentLang(lang);
  const sourceUrl = getGameContentUrl(cleanLang);
  const caller = options.caller || "game";

  console.warn("[GAME_CONTENT] load start", { caller, selectedLang: cleanLang, source: GAME_CONTENT_SOURCE, url: sourceUrl });

  try {
    const response = await fetchWithTimeout(sourceUrl, { cache: "no-store" }, options.timeoutMs || 9000);
    console.warn("[GAME_CONTENT] fetch status", { caller, selectedLang: cleanLang, url: sourceUrl, status: response.status, ok: response.ok });

    if (!response.ok) return [];

    let raw = null;
    try {
      raw = await response.json();
    } catch (error) {
      console.warn("[GAME_CONTENT] json parse failed", { caller, selectedLang: cleanLang, url: sourceUrl, error: error?.message || String(error) });
      return [];
    }

    const rawRows = extractRows(raw);
    const normalizedRows = normalizeGameWordRows(raw, cleanLang);

    console.warn("[GAME_CONTENT] rows normalized", {
      caller,
      selectedLang: cleanLang,
      rawType: Array.isArray(raw) ? "array" : typeof raw,
      rawCount: rawRows.length,
      normalizedCount: normalizedRows.length,
      sample: normalizedRows[0] || null
    });

    return normalizedRows;
  } catch (error) {
    console.warn("[GAME_CONTENT] load failed", {
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
  console.warn("[GAME_CONTENT] global helper ready", { source: GAME_CONTENT_SOURCE });
} catch {}
