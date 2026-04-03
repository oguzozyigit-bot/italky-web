// FILE: /js/offline_languages_page.js

import { mountShell, setHeaderTokens } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { ensureOfflineLangAccess } from "/js/offline_access_gate.js";
import { getLangPoolForSite } from "/js/lang_pool_full.js";

const $ = (id) => document.getElementById(id);

const sourceSelect = $("sourceSelect");
const btnInstallBase = $("btnInstallBase");
const statusBox = $("statusBox");
const installedList = $("installedList");
const installedCount = $("installedCount");
const searchInput = $("searchInput");
const networkTag = $("networkTag");
const trialTag = $("trialTag");

const confirmBackdrop = $("confirmBackdrop");
const confirmTitle = $("confirmTitle");
const confirmText = $("confirmText");
const confirmCancel = $("confirmCancel");
const confirmOk = $("confirmOk");

const toastEl = $("toast");

const STORAGE = {
  sourceLang: "italky_offline_source_lang_v5",
  installed: "italky_offline_installed_packs_v5",
  siteLang: "italky_site_lang"
};

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

function normalizeFlag(code) {
  const map = {
    tr: "🇹🇷",
    en: "🇬🇧",
    de: "🇩🇪",
    fr: "🇫🇷",
    it: "🇮🇹",
    es: "🇪🇸",
    ru: "🇷🇺",
    ar: "🇸🇦",
    pt: "🇵🇹",
    nl: "🇳🇱",
    pl: "🇵🇱",
    uk: "🇺🇦",
    el: "🇬🇷",
    az: "🇦🇿",
    ka: "🇬🇪",
    fa: "🇮🇷",
    hi: "🇮🇳",
    ja: "🇯🇵",
    ko: "🇰🇷",
    zh: "🇨🇳"
  };
  return map[String(code || "").trim().toLowerCase()] || "🌐";
}

function buildLangsFromPool() {
  const siteLang = getSiteLang();
  let pool = [];

  try {
    pool = getLangPoolForSite(siteLang) || [];
  } catch (e) {
    console.warn("[offline_languages_page] getLangPoolForSite error:", e);
    pool = [];
  }

  const normalized = pool
    .map((item) => {
      const code = String(
        item?.code ||
        item?.lang ||
        item?.value ||
        item?.key ||
        ""
      ).trim().toLowerCase();

      if (!code) return null;

      const name = String(
        item?.label ||
        item?.name ||
        item?.title ||
        code.toUpperCase()
      ).trim();

      const flag = String(item?.flag || normalizeFlag(code)).trim();

      return { code, name, flag };
    })
    .filter(Boolean);

  const uniq = [];
  const seen = new Set();

  for (const item of normalized) {
    if (seen.has(item.code)) continue;
    seen.add(item.code);
    uniq.push(item);
  }

  uniq.sort((a, b) => {
    if (a.code === "tr") return -1;
    if (b.code === "tr") return 1;
    if (a.code === "en") return -1;
    if (b.code === "en") return 1;
    return a.name.localeCompare(b.name, siteLang);
  });

  return uniq;
}

function getSourceLang() {
  const saved = String(localStorage.getItem(STORAGE.sourceLang) || "").trim().toLowerCase();
  return LANGS.some((l) => l.code === saved) ? saved : "tr";
}

function setSourceLang(code) {
  localStorage.setItem(STORAGE.sourceLang, String(code || "tr").trim().toLowerCase());
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
  if (lang === "tr" || lang === "en") return "free-core";
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

function updateNetworkUi() {
  const online = navigator.onLine;
  if (networkTag) networkTag.textContent = online ? "ONLINE" : "OFFLINE";
  if (trialTag) trialTag.textContent = "HAZIR";
}

function setStatus(message, kind = "info") {
  if (!statusBox) return;
  statusBox.textContent = message;
  statusBox.setAttribute("data-kind", kind);
}

function setBusy(flag) {
  busy = !!flag;
  if (btnInstallBase) btnInstallBase.disabled = busy;
}

function langInfo(code) {
  return LANGS.find((l) => l.code === code) || {
    code,
    name: code?.toUpperCase() || "Dil",
    flag: normalizeFlag(code)
  };
}

function formatRemaining(expiresAt) {
  if (!expiresAt) return "";
  const diff = new Date(expiresAt).getTime() - nowTs();
  if (diff <= 0) return "Süre doldu";

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days >= 365) {
    const years = Math.max(1, Math.round(days / 365));
    return `${years} yıl kaldı`;
  }

  return `${days} gün kaldı`;
}

function syncInstalledCount() {
  const activeCount = getInstalledPacks().filter(isPackActive).length;
  if (installedCount) installedCount.textContent = String(activeCount);
}

function buildSourceOptions() {
  sourceSelect.innerHTML = LANGS.map((l) => {
    return `<option value="${l.code}">${l.flag} ${l.name}</option>`;
  }).join("");

  sourceSelect.value = getSourceLang();
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
  setStatus(`${info.name} ücretsiz offline erişimi hazırlandı.`, "ok");
  toast(`${info.name} hazır`);
}

async function openOfflinePack(langCode) {
  const lang = String(langCode || "").trim().toLowerCase();
  if (!lang || busy) return;

  const info = langInfo(lang);
  const currentPack = getInstalledPackByLang(lang);

  if (isPackActive(currentPack)) {
    setStatus(`${info.name} zaten aktif. ${formatRemaining(currentPack.expires_at)}.`, "ok");
    toast(`${info.name} zaten açık`);
    return;
  }

  const title = isFreeLang(lang)
    ? `${info.name} indirilsin mi?`
    : `${info.name} offline paketi açılsın mı?`;

  const text = isFreeLang(lang)
    ? `${info.name} ücretsiz olarak hazır edilecek.`
    : `${info.name} için 5 jeton kullanılacak.\n\nBu erişim 12 ay boyunca aktif kalır.`;

  const confirmed = await showConfirm(title, text);
  if (!confirmed) return;

  setBusy(true);
  setStatus(`${info.name} erişimi kontrol ediliyor...`, "warn");

  try {
    if (isFreeLang(lang)) {
      await installFreePack(lang);
      await refreshHeaderTokens();
      return;
    }

    const access = await ensureOfflineLangAccess(lang);

    if (!access?.ok) {
      setStatus(`${info.name} açılamadı. Jeton veya erişim kontrolü başarısız.`, "err");
      return;
    }

    const data = access.data || {};

    upsertInstalledPack({
      lang_pack: data.lang_pack || packKeyForLang(lang),
      free_pack: false,
      token_spent: 5,
      starts_at: new Date().toISOString(),
      expires_at: data.valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      lang: lang
    });

    renderInstalledList();
    await refreshHeaderTokens();

    setStatus(`${info.name} offline paketi açıldı. ${formatRemaining(data.valid_until)}.`, "ok");
    toast(`${info.name} paketi hazır`);
  } catch (e) {
    console.error("[offline_languages_page] openOfflinePack error:", e);
    setStatus(`${info.name} açılamadı.`, "err");
  } finally {
    setBusy(false);
  }
}

async function handleBaseInstall() {
  if (busy) return;

  const lang = String(sourceSelect?.value || "tr").trim().toLowerCase();
  const info = langInfo(lang);

  setSourceLang(lang);

  const title = isFreeLang(lang)
    ? `${info.name} ücretsiz kurulsun mu?`
    : `${info.name} temel kurulum başlasın mı?`;

  const text = isFreeLang(lang)
    ? `${info.name} ücretsiz olarak hazır edilecek.`
    : `${info.name} için 5 jeton kullanılacak.\n\nBu erişim 12 ay boyunca aktif kalır.`;

  const confirmed = await showConfirm(title, text);
  if (!confirmed) return;

  await openOfflinePack(lang);
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
      let btnText = "5 Jeton ile Aç";
      let subText = free
        ? "Offline erişim ücretsiz"
        : "Offline erişim • 12 ay";

      if (free) {
        btnClass = "lang-btn free";
        btnText = active
          ? `Kurulu • ${formatRemaining(pack?.expires_at || "2099-12-31T23:59:59.000Z")}`
          : "Ücretsiz Aç";
      } else if (active) {
        btnClass = "lang-btn installed";
        btnText = `Kurulu • ${formatRemaining(pack.expires_at)}`;
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
            style="${!free && !active ? "background:linear-gradient(135deg, rgba(255,140,40,.24), rgba(255,84,201,.14)); border:1px solid rgba(255,140,40,.38);" : ""}"
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

  syncInstalledCount();
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

  LANGS = buildLangsFromPool();

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

  updateNetworkUi();
  buildSourceOptions();
  renderInstalledList();
  await refreshHeaderTokens();

  const selected = getSourceLang();
  const info = langInfo(selected);
  setStatus(`Seçili ana dil: ${info.name}. Kurulumu başlatabilir veya aşağıdan ek dilleri açabilirsiniz.`, "warn");

  btnInstallBase?.addEventListener("click", handleBaseInstall);

  sourceSelect?.addEventListener("change", () => {
    const lang = String(sourceSelect.value || "tr").trim().toLowerCase();
    setSourceLang(lang);
    const inf = langInfo(lang);
    setStatus(`${inf.name} seçildi. Kurulumu başlatabilirsiniz.`, "warn");
  });

  searchInput?.addEventListener("input", renderInstalledList);

  window.addEventListener("online", updateNetworkUi);
  window.addEventListener("offline", updateNetworkUi);
}

init();
