// /js/langpool.js
const CACHE_KEY = (l) => `italky_lang_${l}_v1`;

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?]/g, "");

export async function loadLangPool(lang) {
  // 1️⃣ localStorage
  try {
    const raw = localStorage.getItem(CACHE_KEY(lang));
    if (raw) return sanitize(JSON.parse(raw));
  } catch {}

  // 2️⃣ dosyadan
  const r = await fetch(`/assets/lang/${lang}.json`, { cache: "force-cache" });
  const data = await r.json();

  try {
    localStorage.setItem(CACHE_KEY(lang), JSON.stringify(data));
  } catch {}

  return sanitize(data);
}

function sanitize(data) {
  const seen = new Set();
  const out = [];
  for (const it of data.items || []) {
    if (!it.w || !it.tr) continue;
    const k = norm(it.w);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      w: it.w.trim(),
      tr: it.tr.trim(),
      pos: it.pos || "",
      lvl: it.lvl || ""
    });
  }
  return { lang: data.lang, version: data.version, items: out };
}

export function pick(pool, count, used, filterFn) {
  const candidates = pool.items.filter(
    (x) => !used.has(norm(x.w)) && (!filterFn || filterFn(x))
  );

  if (candidates.length < count) used.clear();

  const fresh = pool.items.filter(
    (x) => !used.has(norm(x.w)) && (!filterFn || filterFn(x))
  );

  const shuffled = shuffle(fresh).slice(0, count);
  shuffled.forEach((x) => used.add(norm(x.w)));
  return shuffled;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
