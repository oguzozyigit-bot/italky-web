// FILE: /js/offline_languages_page.js

import { mountShell, setHeaderTokens } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { ensureOfflineLangAccess } from "/js/offline_access_gate.js";

const $ = (id) => document.getElementById(id);

const installedList = $("installedList");
const searchInput = $("searchInput");

const confirmBackdrop = $("confirmBackdrop");
const confirmTitle = $("confirmTitle");
const confirmText = $("confirmText");
const confirmCancel = $("confirmCancel");
const confirmOk = $("confirmOk");

const toastEl = $("toast");

const STORAGE = {
  installed: "italky_offline_installed_packs_v6",
  siteLang: "italky_site_lang"
};

const SUPPORTED_OFFLINE_LANGS = [
  { code: "bg", name: "Bulgarca", flag: "🇧🇬" },
  { code: "bn", name: "Bengalce", flag: "🇧🇩" },
  { code: "ca", name: "Katalanca", flag: "🇪🇸" },
  { code: "cs", name: "Çekçe", flag: "🇨🇿" },
  { code: "da", name: "Danca", flag: "🇩🇰" },
  { code: "de", name: "Almanca", flag: "🇩🇪" },
  { code: "el", name: "Yunanca", flag: "🇬🇷" },
  { code: "et", name: "Estonca", flag: "🇪🇪" },
  { code: "eu", name: "Baskça", flag: "🇪🇸" },
  { code: "fi", name: "Fince", flag: "🇫🇮" },
  { code: "fr", name: "Fransızca", flag: "🇫🇷" },
  { code: "gl", name: "Galiçyaca", flag: "🇪🇸" },
  { code: "hu", name: "Macarca", flag: "🇭🇺" },
  { code: "id", name: "Endonezce", flag: "🇮🇩" },
  { code: "lt", name: "Litvanca", flag: "🇱🇹" },
  { code: "lv", name: "Letonca", flag: "🇱🇻" },
  { code: "ms", name: "Malayca", flag: "🇲🇾" },
  { code: "nl", name: "Hollandaca", flag: "🇳🇱" },
  { code: "pl", name: "Lehçe", flag: "🇵🇱" },
  { code: "ro", name: "Romence", flag: "🇷🇴" },
  { code: "ru", name: "Rusça", flag: "🇷🇺" },
  { code: "sk", name: "Slovakça", flag: "🇸🇰" },
  { code: "sl", name: "Slovence", flag: "🇸🇮" },
  { code: "sq", name: "Arnavutça", flag: "🇦🇱" },
  { code: "th", name: "Tayca", flag: "🇹🇭" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ur", name: "Urduca", flag: "🇵🇰" },
  { code: "vi", name: "Vietnamca", flag: "🇻🇳" },
  { code: "zh", name: "Çince", flag: "🇨🇳" }
];

const PRIORITY_ORDER = [
  "tr",
  "en",
  "de",
  "fr",
  "it",
  "es",
  "ar",
  "ru",
  "az"
];

let currentUser = null;
let busy = false;
let confirmResolver = null;
let LANGS = [];

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */
function toast(message = "") {
  if (!toastEl) return;
  toastEl.textContent = String(message || "");
  toastEl.classList.add("show");
  clearTimeout(window.__offlineToastTimer);
  window.__offlineToastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1800);
}

function safeJsonParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getSiteLang() {
  return String(
    localStorage.getItem(STORAGE.siteLang) ||
    document.documentElement.lang ||
    "tr"
  ).trim().toLowerCase();
}

function priorityIndex(code) {
  const idx = PRIORITY_ORDER.indexOf(String(code || "").trim().toLowerCase());
  return idx === -1 ? 999 : idx;
}

function buildSupportedLangList() {
  const siteLang = getSiteLang();

  const uniq = [];
  const seen = new Set();

  for (const item of SUPPORTED_OFFLINE_LANGS) {
    const code = String(item.code || "").trim().toLowerCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    uniq.push({
      code,
      name: String(item.name || code.toUpperCase()).trim(),
      flag: String(item.flag || "🌐").trim()
    });
  }

  uniq.sort((a, b) => {
    const pa = priorityIndex(a.code);
    const pb = priorityIndex(b.code);

    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, siteLang);
  });

  return uniq;
}

function getInstalledPacks() {
  const data = safeJsonParse(localStorage.getItem(STORAGE.installed) || "[]", []);
  return Array.isArray(data) ? data : [];
}

function saveInstalledPacks(list) {
  localStorage.setItem(STORAGE.installed, JSON.stringify(Array.isArray(list) ? list : []));
}

function nowTs() {
  return Date.now();
}

function isPackActive(pack) {
  if (!pack) return false;
  if (!pack.expires_at) return false;
  return new Date(pack.expires_at).getTime() > nowTs();
}

function packKeyForLang(code) {
  const lang = String(code || "").trim().toLowerCase();
  if (lang === "tr" || lang === "en") return `free-${lang}`;
  return `${lang}-offline`;
}

function isFreeLang(code) {
  const lang = String(code || "").trim().toLowerCase();
  return lang === "tr" || lang === "en";
}

function upsertInstalledPack(entry) {
  const packs = getInstalledPacks();
  const idx = packs.findIndex((p) => p.lang_pack === entry.lang_pack);

  if (idx >= 0) {
    packs[idx] = { ...packs[idx], ...entry };
  } else {
    packs.push(entry);
  }

  saveInstalledPacks(packs);
}

function getInstalledPackByLang(code) {
  const key = packKeyForLang(code);
  return getInstalledPacks().find((p) => p.lang_pack === key) || null;
}

function setBusy(flag) {
  busy = !!flag;
}

function langInfo(code) {
  return LANGS.find((l) => l.code === code) || {
    code,
    name: code?.toUpperCase() || "Dil",
    flag: "🌐"
  };
}

function showConfirm(title, text) {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmText) confirmText.textContent = text;
    confirmBackdrop?.classList.add("show");
  });
}

function closeConfirm(result) {
  confirmBackdrop?.classList.remove("show");
  if (typeof confirmResolver === "function") {
    confirmResolver(result);
    confirmResolver = null;
  }
}

confirmCancel?.addEventListener("click", () => closeConfirm(false));
confirmOk?.addEventListener("click", () => closeConfirm(true));
confirmBackdrop?.addEventListener("click", (e) => {
  if (e.target === confirmBackdrop) closeConfirm(false);
});

/* -------------------------------------------------------
   HEADER TOKENS
------------------------------------------------------- */
async function getCurrentUser() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.user || null;
}

async function refreshHeaderTokens() {
  if (!currentUser?.id) return;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("tokens")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (!error && typeof data?.tokens === "number") {
      try { setHeaderTokens(data.tokens); } catch {}
    }
  } catch {}
}

/* -------------------------------------------------------
   INSTALL LOGIC
------------------------------------------------------- */
async function installFreePack(lang) {
  const info = langInfo(lang);

  upsertInstalledPack({
    lang_pack: packKeyForLang(lang),
    free_pack: true,
    token_spent: 0,
    starts_at: new Date().toISOString(),
    expires_at: "2099-12-31T23:59:59.000Z",
    lang: lang
  });

  renderInstalledList();
  toast(`${info.name} kuruldu`);
}

async function openOfflinePack(langCode) {
  const lang = String(langCode || "").trim().toLowerCase();
  if (!lang || busy) return;

  const info = langInfo(lang);
  const currentPack = getInstalledPackByLang(lang);

  if (isPackActive(currentPack)) {
    toast(`${info.name} zaten kurulu`);
    return;
  }

  const title = isFreeLang(lang)
    ? `${info.name} ücretsiz kurulsun mu?`
    : `${info.name} offline erişimi açılsın mı?`;

  const text = isFreeLang(lang)
    ? `${info.name} ücretsiz kurulacak.`
    : `${info.name} için 10 jeton kullanılacak.`;

  const confirmed = await showConfirm(title, text);
  if (!confirmed) return;

  setBusy(true);

  try {
    if (isFreeLang(lang)) {
      await installFreePack(lang);
      await refreshHeaderTokens();
      return;
    }

    const access = await ensureOfflineLangAccess(lang, 10);

    if (!access?.ok) {
      toast(`${info.name} açılamadı`);
      return;
    }

    const data = access.data || {};

    upsertInstalledPack({
      lang_pack: data.lang_pack || packKeyForLang(lang),
      free_pack: false,
      token_spent: 10,
      starts_at: new Date().toISOString(),
      expires_at: data.valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      lang: lang
    });

    renderInstalledList();
    await refreshHeaderTokens();
    toast(`${info.name} açıldı`);
  } catch (e) {
    console.error("[offline_languages_page] openOfflinePack error:", e);
    toast(`${info.name} açılamadı`);
  } finally {
    setBusy(false);
  }
}

/* -------------------------------------------------------
   RENDER
------------------------------------------------------- */
function renderInstalledList() {
  const q = String(searchInput?.value || "").trim().toLowerCase();

  const cards = LANGS
    .filter((l) => !q || l.name.toLowerCase().includes(q) || l.code.includes(q))
    .map((lang) => {
      const pack = getInstalledPackByLang(lang.code);
      const active = isPackActive(pack);
      const free = isFreeLang(lang.code);

      let btnClass = "lang-btn paid";
      let btnText = "10 Jeton ile Aç";
      let subText = free
        ? "Offline erişim ücretsiz"
        : "Offline erişim";

      if (free) {
        btnClass = active ? "lang-btn installed" : "lang-btn free";
        btnText = active ? "Kuruldu" : "Ücretsiz Kur";
      } else if (active) {
        btnClass = "lang-btn installed";
        btnText = "Kuruldu";
      }

      return `
        <div class="lang-card">
          <div class="lang-head">
            <div class="flag">${lang.flag}</div>
            <div>
              <h3 class="lang-name">${lang.name}</h3>
              <div class="lang-sub">${subText}</div>
            </div>
          </div>

          <button
            class="${btnClass}"
            type="button"
            data-lang="${lang.code}"
            ${busy ? "disabled" : ""}
          >
            ${btnText}
          </button>
        </div>
      `;
    })
    .join("");

  installedList.innerHTML = cards || `
    <div class="lang-card">
      <div class="lang-head">
        <div class="flag">🔎</div>
        <div>
          <h3 class="lang-name">Sonuç bulunamadı</h3>
          <div class="lang-sub">Arama metnini değiştirip tekrar deneyin.</div>
        </div>
      </div>
    </div>
  `;

  installedList.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lang = btn.getAttribute("data-lang");
      await openOfflinePack(lang);
    });
  });
}

/* -------------------------------------------------------
   INIT
------------------------------------------------------- */
async function init() {
  try {
    mountShell({ scroll: "auto" });
  } catch (e) {
    console.warn("[offline_languages_page] shell:", e);
  }

  LANGS = buildSupportedLangList();

  currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    location.replace("/pages/login.html");
    return;
  }

  try {
    const root = getComputedStyle(document.documentElement);
    const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
    document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 10}px` : "0px");
  } catch {}

  renderInstalledList();
  await refreshHeaderTokens();

  searchInput?.addEventListener("input", renderInstalledList);
}

init();
