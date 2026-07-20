/**
 * Speed lab: EN↔TR offline fallback (native Android ONNX or browser Transformers.js).
 * Used only on yeni_yuzyuze.html — not production facetoface.
 */

const EN_TR_MODEL_CANDIDATES = {
  en_tr: [
    "Helsinki-NLP/opus-mt-en-tr",
    "Helsinki-NLP/opus-mt-tc-big-en-tr",
  ],
  tr_en: [
    "Xenova/opus-mt-tr-en",
    "Helsinki-NLP/opus-mt-tr-en",
  ],
};

const pipeCache = new Map();
let transformersModule = null;
let prefetchPromise = null;
let lastEngine = "none";

export function getLastOfflineEngine() {
  return lastEngine;
}

export function isEnTrPair(from, to) {
  const src = String(from || "").toLowerCase().split("-")[0].trim();
  const dst = String(to || "").toLowerCase().split("-")[0].trim();
  if (src === dst) return false;
  return (src === "en" && dst === "tr") || (src === "tr" && dst === "en");
}

function pairKey(from, to) {
  const src = String(from || "").toLowerCase().split("-")[0].trim();
  const dst = String(to || "").toLowerCase().split("-")[0].trim();
  return `${src}_${dst}`;
}

function hasNativeOfflineTranslate() {
  return typeof window.OfflineTranslate?.translate === "function";
}

function nativeTranslateRequest(payload, timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (!hasNativeOfflineTranslate()) {
      resolve({ ok: false, error: "offline_engine_missing" });
      return;
    }

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("offlineTranslateResult", handler);
      resolve(value);
    };

    const handler = (event) => {
      const detail = event?.detail || {};
      finish({
        ok: !!detail.ok,
        translatedText: String(detail.translatedText || detail.text || "").trim(),
        error: detail.error || "",
      });
    };

    window.addEventListener("offlineTranslateResult", handler, { once: true });

    try {
      window.OfflineTranslate.translate(JSON.stringify(payload));
    } catch {
      finish({ ok: false, error: "offline_translate_failed" });
      return;
    }

    setTimeout(() => finish({ ok: false, error: "offline_translate_timeout" }), timeoutMs);
  });
}

async function loadTransformers() {
  if (transformersModule) return transformersModule;
  transformersModule = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
  transformersModule.env.allowLocalModels = false;
  transformersModule.env.useBrowserCache = true;
  return transformersModule;
}

async function getBrowserPipeline(from, to, onProgress) {
  const key = pairKey(from, to);
  const candidates = EN_TR_MODEL_CANDIDATES[key];
  if (!candidates?.length) return null;

  if (pipeCache.has(key)) return pipeCache.get(key);

  const { pipeline } = await loadTransformers();
  let lastError = null;

  for (const modelId of candidates) {
    try {
      const pipe = await pipeline("translation", modelId, {
        dtype: "q8",
        progress_callback: (data) => {
          if (typeof onProgress === "function") onProgress(data);
        },
      });
      pipeCache.set(key, pipe);
      return pipe;
    } catch (e) {
      lastError = e;
      console.warn("[speed_lab_entr_offline] model failed", modelId, e);
    }
  }

  throw lastError || new Error("en_tr_browser_model_unavailable");
}

export function prefetchBrowserEnTrModels(onProgress) {
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = (async () => {
    try {
      await getBrowserPipeline("en", "tr", onProgress);
      await getBrowserPipeline("tr", "en", onProgress);
      return true;
    } catch (e) {
      console.warn("[speed_lab_entr_offline] prefetch failed", e);
      prefetchPromise = null;
      return false;
    }
  })();

  return prefetchPromise;
}

export async function tryNativeEnTrTranslate(text, from, to) {
  if (!hasNativeOfflineTranslate()) return null;

  const value = String(text || "").trim();
  if (!value || !isEnTrPair(from, to)) return null;

  const src = String(from || "").toLowerCase().split("-")[0].trim();
  const dst = String(to || "").toLowerCase().split("-")[0].trim();

  const raw = await nativeTranslateRequest({
    from: src,
    to: dst,
    text: value,
    sourceLang: src,
    targetLang: dst,
    source: src,
    target: dst,
    source_system: "speed_lab_entr_offline",
  });

  if (raw?.ok && raw.translatedText) {
    lastEngine = "native";
    return raw.translatedText;
  }
  return null;
}

export async function tryBrowserEnTrTranslate(text, from, to, onProgress) {
  const value = String(text || "").trim();
  if (!value || !isEnTrPair(from, to)) return null;

  try {
    const pipe = await getBrowserPipeline(from, to, onProgress);
    if (!pipe) return null;

    const out = await pipe(value, {
      top_k: 0,
      do_sample: false,
      num_beams: 1,
      max_new_tokens: 128,
    });

    const translated = String(out?.[0]?.translation_text || "").trim();
    if (translated) {
      lastEngine = "browser";
      return translated;
    }
  } catch (e) {
    console.warn("[speed_lab_entr_offline] browser translate failed", e);
  }
  return null;
}

export async function translateEnTrOfflineFallback(text, from, to, opts = {}) {
  if (!isEnTrPair(from, to)) return null;

  const native = await tryNativeEnTrTranslate(text, from, to);
  if (native) return native;

  if (opts.skipBrowser) return null;

  return tryBrowserEnTrTranslate(text, from, to, opts.onProgress);
}

export function canUseBrowserOfflineEnTr() {
  return typeof window !== "undefined" && typeof WebAssembly !== "undefined";
}
