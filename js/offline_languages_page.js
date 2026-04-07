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
  installing: "italky_offline_installing_v1",
  siteLang: "italky_site_lang",
  nativeLang: "italky_native_lang_v1"
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

const PRIORITY_ORDER = ["tr","de","fr","ru"];

let currentUser = null;
let busy = false;
let confirmResolver = null;
let LANGS = [];

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

function getNativeLang() {
  return String(localStorage.getItem(STORAGE.nativeLang) || "tr").trim().toLowerCase();
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

function getInstallingLangs() {
  const data = safeJsonParse(localStorage.getItem(STORAGE.installing) || "[]", []);
  return Array.isArray(data) ? data : [];
}

function saveInstallingLangs(list) {
  localStorage.setItem(STORAGE.installing, JSON.stringify(Array.isArray(list) ? list : []));
}

function markInstalling(lang, value) {
  const arr = getInstallingLangs();
  const code = String(lang || "").trim().toLowerCase();
  const exists = arr.includes(code);

  if (value && !exists) arr.push(code);
  if (!value && exists) arr.splice(arr.indexOf(code), 1);

  saveInstallingLangs(arr);
}

function isInstalling(lang) {
  return getInstallingLangs().includes(String(lang || "").trim().toLowerCase());
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
  return `${String(code || "").trim().toLowerCase()}-offline`;
}

function upsertInstalledPack(entry) {
  const packs = getInstalledPacks();
  const idx = packs.findIndex((p) => p.lang_pack === entry.lang_pack);

  if (idx >= 0) packs[idx] = { ...packs[idx], ...entry };
  else packs.push(entry);

  saveInstalledPacks(packs);
}

function getInstalledPackByLang(code) {
  const key = packKeyForLang(code);
  return getInstalledPacks().find((p) => p.lang_pack === key) || null;
}

function seedPreinstalledLangs() {
  const nativeLang = getNativeLang();

  [nativeLang, "en"].forEach((lang) => {
    if (!lang) return;
    if (getInstalledPackByLang(lang)) return;

    upsertInstalledPack({
      lang_pack: packKeyForLang(lang),
      free_pack: true,
      token_spent: 0,
      starts_at: new Date().toISOString(),
      expires_at: "2099-12-31T23:59:59.000Z",
      lang
    });
  });
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

async function triggerAppInstall(lang) {
  try {
    if (window.AndroidOfflineTranslate && typeof window.AndroidOfflineTranslate.prepareOfflineLang === "function") {
      window.AndroidOfflineTranslate.prepareOfflineLang(lang);
      return true;
    }
    if (window.Android && typeof window.Android.prepareOfflineLang === "function") {
      window.Android.prepareOfflineLang(lang);
      return true;
    }
  } catch (e) {
    console.error("[offline_languages_page] prepareOfflineLang error:", e);
  }
  return false;
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

  if (isInstalling(lang)) {
    toast("Lütfen bekleyiniz...");
    return;
  }

  const confirmed = await showConfirm(
    `${info.name} indirilsin mi?`,
    `${info.name} için 10 jeton düşecek ve paket arka planda kurulacak.`
  );
  if (!confirmed) return;

  setBusy(true);

  try {
    const access = await ensureOfflineLangAccess(lang, 10);

    if (!access?.ok) {
      toast(`${info.name} açılamadı`);
      return;
    }

    markInstalling(lang, true);

    upsertInstalledPack({
      lang_pack: packKeyForLang(lang),
      free_pack: false,
      token_spent: 10,
      starts_at: new Date().toISOString(),
      expires_at: "2099-12-31T23:59:59.000Z",
      lang
    });

    renderInstalledList();
    await refreshHeaderTokens();

    const ok = await triggerAppInstall(lang);
    if (!ok) {
      markInstalling(lang, false);
      toast(`${info.name} indirilemedi`);
      renderInstalledList();
      return;
    }

    markInstalling(lang, false);
    renderInstalledList();
    toast(`${info.name} kurulumu başlatıldı`);
  } catch (e) {
    console.error("[offline_languages_page] openOfflinePack error:", e);
    markInstalling(lang, false);
    renderInstalledList();
    toast(`${info.name} açılamadı`);
  } finally {
    setBusy(false);
  }
}

function renderInstalledList() {
  const q = String(searchInput?.value || "").trim().toLowerCase();
  const nativeLang = getNativeLang();

  const cards = LANGS
    .filter((l) => l.code !== nativeLang && l.code !== "en")
    .filter((l) => !q || l.name.toLowerCase().includes(q) || l.code.includes(q))
    .map((lang) => {
      const pack = getInstalledPackByLang(lang.code);
      const active = isPackActive(pack);
      const installing = isInstalling(lang.code);

      let btnClass = "lang-btn paid";
      let btnText = "10 Jeton ile İndir";

      if (installing) {
        btnClass = "lang-btn installing";
        btnText = "Lütfen bekleyiniz...";
      } else if (active) {
        btnClass = "lang-btn installed";
        btnText = "Kurulu";
      }

      return `
        <div class="lang-card">
          <div class="lang-head">
            <div class="flag">${lang.flag}</div>
            <div>
              <h3 class="lang-name">${lang.name}</h3>
              <div class="lang-sub">Offline erişim</div>
            </div>
          </div>

          <button
            class="${btnClass}"
            type="button"
            data-lang="${lang.code}"
            ${(busy || installing) ? "disabled" : ""}
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
        <div class="flag">✅</div>
        <div>
          <h3 class="lang-name">Uygun dil bulunamadı</h3>
          <div class="lang-sub">Arama filtresini değiştirerek tekrar deneyin.</div>
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

async function init() {
  try {
    mountShell({ scroll: "auto" });
  } catch (e) {
    console.warn("[offline_languages_page] shell:", e);
  }

  LANGS = buildSupportedLangList();
  seedPreinstalledLangs();

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
