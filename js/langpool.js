// /js/langpool.js
const CACHE_KEY = (l) => `italky_lang_${l}_v1`;

// normalize: "used" anahtarı için
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?]/g, "");

// JSON parse güvenliği
function safeJsonParse(raw, fallback = null) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

export async function loadLangPool(lang) {
  // localStorage cache
  try {
    const raw = localStorage.getItem(CACHE_KEY(lang));
    if (raw) {
      const parsed = safeJsonParse(raw, null);
      if (parsed) return sanitize(parsed);
    }
  } catch {}

  // file fetch (offline cache varsa çalışır)
  let data = null;
  try {
    const r = await fetch(`/assets/lang/${lang}.json`, { cache: "force-cache" });
    data = await r.json();
  } catch {
    // fetch/json patlarsa en azından boş havuz döndür
    return { lang: lang || "", version: 1, items: [] };
  }

  try {
    localStorage.setItem(CACHE_KEY(lang), JSON.stringify(data));
  } catch {}

  return sanitize(data);
}

function sanitize(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const seen = new Set();
  const out = [];

  for (const it of items) {
    const w = String(it?.w || "").trim();
    const tr = String(it?.tr || "").trim();
    if (!w || !tr) continue;

    const k = norm(w);
    if (seen.has(k)) continue;
    seen.add(k);

    // ✅ PATCH: sentence/ex gibi alanları koru (opsiyonel)
    const sentence = String(it?.sentence || it?.ex || "").trim();

    out.push({
      w,
      tr,
      pos: String(it?.pos || "").trim(),  // noun/verb/adj/adv vs
      lvl: String(it?.lvl || "").trim(),  // A2/B1/B2/C1...
      sentence
    });
  }

  return { lang: String(data?.lang || ""), version: data?.version || 1, items: out };
}

export function createUsedSet(storageKey) {
  // oyun başına ayrı used anahtarı: örn "used_hangman_en_A2"
  let used = new Set();
  try {
    const raw = localStorage.getItem(storageKey);
    const arr = safeJsonParse(raw, []);
    if (Array.isArray(arr)) used = new Set(arr);
  } catch {}

  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify([...used])); } catch {}
  };

  return { used, save, norm };
}

export function pick(pool, count, usedSet, saveUsed, filterFn) {
  const items = Array.isArray(pool?.items) ? pool.items : [];

  // filtreli adaylar (used hariç)
  const candidates = items.filter(
    (x) => !usedSet.has(norm(x.w)) && (!filterFn || filterFn(x))
  );

  // ✅ PATCH: aday sayısı azsa used reset (yeni tur)
  // (mevcut mantık korunuyor)
  if (candidates.length < count) usedSet.clear();

  const fresh = items.filter(
    (x) => !usedSet.has(norm(x.w)) && (!filterFn || filterFn(x))
  );

  const chosen = shuffle(fresh).slice(0, count);
  chosen.forEach((x) => usedSet.add(norm(x.w)));

  if (saveUsed) saveUsed();
  return chosen;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
