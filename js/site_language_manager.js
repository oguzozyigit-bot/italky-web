const API_BASE = "https://italky-api.onrender.com";

const STORAGE_KEY = "site_lang";
const DEFAULT_LANG = "tr";
const RTL_LANGS = new Set(["ar"]);

const TEXT_SELECTOR_BLOCKLIST = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "IFRAME",
  "CODE",
  "PRE"
]);

function normalizeLang(code = "") {
  const val = String(code || "").trim().toLowerCase().replace("_", "-");
  const base = val.split("-")[0];
  if (["tr", "en", "de", "fr", "it", "es", "ar"].includes(base)) return base;
  return DEFAULT_LANG;
}

function getTranslateRoot() {
  return (
    document.getElementById("shellMain") ||
    document.getElementById("pageContent") ||
    document.body
  );
}

function shouldSkipElement(el) {
  if (!el) return true;
  if (TEXT_SELECTOR_BLOCKLIST.has(el.tagName)) return true;
  if (el.closest("[data-no-translate='1']")) return true;
  if (el.closest("[translate='no']")) return true;
  if (el.closest("#shellOverlay")) return true;
  if (el.closest("#siteLangModal")) return true;
  if (el.closest("#menuBackdrop")) return true;
  if (el.closest(".menu-backdrop")) return true;
  if (el.closest(".shell-modal")) return true;
  if (el.closest(".side-menu")) return true;
  return false;
}

function detectInitialLanguage() {
  const saved = normalizeLang(localStorage.getItem(STORAGE_KEY) || "");
  if (saved !== DEFAULT_LANG || localStorage.getItem(STORAGE_KEY)) return saved;

  const langs = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || DEFAULT_LANG];

  for (const lang of langs) {
    const n = normalizeLang(lang);
    if (n) return n;
  }

  return DEFAULT_LANG;
}

function setDocumentDirection(lang) {
  const dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.body?.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

function getTextNodes(root) {
  const nodes = [];
  if (!root) return nodes;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const text = String(node.nodeValue || "").replace(/\s+/g, " ").trim();
        if (!text) return NodeFilter.FILTER_REJECT;

        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let current;
  while ((current = walker.nextNode())) {
    nodes.push(current);
  }

  return nodes;
}

function getAttributeTargets(root) {
  const targets = [];
  if (!root) return targets;

  const attrs = ["placeholder", "title", "aria-label"];
  const all = root.querySelectorAll("*");

  for (const el of all) {
    if (shouldSkipElement(el)) continue;

    for (const attr of attrs) {
      const value = el.getAttribute(attr);
      if (value && String(value).trim()) {
        targets.push({ el, attr, value: String(value) });
      }
    }
  }

  return targets;
}

function ensureOriginalMap(target, key, value) {
  if (!target.dataset[key]) {
    target.dataset[key] = value;
  }
}

async function fetchTranslations(texts, sourceLang, targetLang) {
  const resp = await fetch(`${API_BASE}/api/site-translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      texts,
      source_lang: sourceLang,
      target_lang: targetLang,
      format: "text"
    })
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json?.ok || !Array.isArray(json.translations)) {
    throw new Error(json?.detail || json?.error || "site_translate_failed");
  }

  return json.translations;
}

class SiteLanguageManager {
  constructor() {
    this.currentLang = detectInitialLanguage();
    this.observer = null;
    this.isApplying = false;
  }

  getCurrentLanguage() {
    return this.currentLang;
  }

  async init() {
    setDocumentDirection(this.currentLang);

    if (this.currentLang !== DEFAULT_LANG) {
      await this.applyLanguage(this.currentLang);
    }

    this.observeDom();
    window.italkySiteLanguage = this;
  }

  observeDom() {
    if (this.observer) return;

    this.observer = new MutationObserver(async () => {
      if (this.isApplying) return;
      if (this.currentLang === DEFAULT_LANG) return;

      clearTimeout(this.__siteLangDebounce);
      this.__siteLangDebounce = setTimeout(async () => {
        try {
          await this.applyLanguage(this.currentLang);
        } catch (e) {
          console.warn("[site language observer]", e);
        }
      }, 250);
    });

    const root = getTranslateRoot();
    if (!root) return;

    this.observer.observe(root, {
      childList: true,
      subtree: true
    });
  }

  async setLanguage(lang) {
    const nextLang = normalizeLang(lang);
    this.currentLang = nextLang;
    localStorage.setItem(STORAGE_KEY, nextLang);
    setDocumentDirection(nextLang);
    await this.applyLanguage(nextLang);
  }

  async applyLanguage(lang) {
    const nextLang = normalizeLang(lang);
    const root = getTranslateRoot();
    if (!root) return;

    this.isApplying = true;

    try {
      const textNodes = getTextNodes(root);
      const attrTargets = getAttributeTargets(root);

      for (const node of textNodes) {
        const parent = node.parentElement;
        if (!parent) continue;

        const key = `origTextNode_${Array.from(parent.childNodes).indexOf(node)}`;
        if (!parent.dataset[key]) {
          parent.dataset[key] = node.nodeValue || "";
        }
        node.__origKey = key;
      }

      for (const item of attrTargets) {
        const key = `origAttr_${item.attr.replace(/-/g, "_")}`;
        ensureOriginalMap(item.el, key, item.value);
      }

      if (nextLang === DEFAULT_LANG) {
        for (const node of textNodes) {
          const parent = node.parentElement;
          if (!parent || !node.__origKey) continue;
          const original = parent.dataset[node.__origKey];
          if (typeof original === "string") {
            node.nodeValue = original;
          }
        }

        for (const item of attrTargets) {
          const key = `origAttr_${item.attr.replace(/-/g, "_")}`;
          const original = item.el.dataset[key];
          if (typeof original === "string") {
            item.el.setAttribute(item.attr, original);
          }
        }
        return;
      }

      const textPayload = [];
      const textBindings = [];

      for (const node of textNodes) {
        const parent = node.parentElement;
        if (!parent || !node.__origKey) continue;

        const original = parent.dataset[node.__origKey];
        if (!original || !String(original).trim()) continue;

        textPayload.push(String(original));
        textBindings.push(node);
      }

      const attrPayload = [];
      const attrBindings = [];

      for (const item of attrTargets) {
        const key = `origAttr_${item.attr.replace(/-/g, "_")}`;
        const original = item.el.dataset[key];
        if (!original || !String(original).trim()) continue;

        attrPayload.push(String(original));
        attrBindings.push(item);
      }

      const textTranslations = textPayload.length
        ? await fetchTranslations(textPayload, DEFAULT_LANG, nextLang)
        : [];

      const attrTranslations = attrPayload.length
        ? await fetchTranslations(attrPayload, DEFAULT_LANG, nextLang)
        : [];

      textBindings.forEach((node, i) => {
        node.nodeValue = textTranslations[i] ?? node.nodeValue;
      });

      attrBindings.forEach((item, i) => {
        const translated = attrTranslations[i];
        if (typeof translated === "string" && translated.trim()) {
          item.el.setAttribute(item.attr, translated);
        }
      });
    } finally {
      this.isApplying = false;
    }
  }
}

export async function initSiteLanguageManager() {
  const manager = new SiteLanguageManager();
  await manager.init();
  return manager;
}
