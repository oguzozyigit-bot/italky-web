const API_BASE = "https://italky-api.onrender.com";
const CACHE_KEY = "italky_ui_translate_cache_v2";
const SUPPORTED = ["en", "de", "fr", "it", "es"];

function getCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function makeKey(text, lang) {
  return `${lang}:::${String(text || "").trim()}`;
}

export async function aiTranslateText(text, lang) {
  const clean = String(text || "").trim();
  const target = String(lang || "").toLowerCase().trim();

  if (!clean) return "";
  if (!SUPPORTED.includes(target)) return clean;

  const cache = getCache();
  const key = makeKey(clean, target);

  if (cache[key]) return cache[key];

  try {
    const res = await fetch(`${API_BASE}/api/ui-translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: clean,
        target_lang: target
      })
    });

    if (!res.ok) return clean;

    const data = await res.json().catch(() => ({}));
    const translated = String(data?.translated_text || clean).trim() || clean;

    cache[key] = translated;
    setCache(cache);

    return translated;
  } catch {
    return clean;
  }
}
