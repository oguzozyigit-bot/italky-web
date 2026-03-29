// FILE: /js/offline_languages_page.js

import { mountShell, setHeaderTokens } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";

mountShell({ scroll: "auto" });

const API_BASE = "https://italky-api.onrender.com";
const BUCKET = "offline";
const PIVOT = "en";
const USER_LANG_KEY = "italky_user_lang_v1";
const BASE_READY_PREFIX = "offline_base_ready_";
const LOCAL_INSTALLED_KEY = "offline_installed_langs_v2";
const REDOWNLOAD_COST = 20;

const $ = (id) => document.getElementById(id);

const toastEl = $("toast");
const sourceSelect = $("sourceSelect");
const installedList = $("installedList");
const searchInput = $("searchInput");
const countPill = $("installedCount");
const installBaseBtn = $("btnInstallBase");
const statusBox = $("statusBox");

/* ---------------- STATE ---------------- */
let currentUserId = "";
let profileRow = null;
let renderToken = 0;

/* ---------------- TOAST ---------------- */
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2200);
}

function setStatus(msg, kind = "info") {
  if (!statusBox) return;
  statusBox.textContent = String(msg || "");
  statusBox.dataset.kind = kind;
}

function norm(v) {
  return String(v || "").toLowerCase().trim();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* ---------------- LANG ---------------- */
const LANGS = [
  { code: "tr", flag: "🇹🇷", name: "Türkçe" },
  { code: "en", flag: "🇬🇧", name: "İngilizce" },
  { code: "de", flag: "🇩🇪", name: "Almanca" },
  { code: "fr", flag: "🇫🇷", name: "Fransızca" },
  { code: "es", flag: "🇪🇸", name: "İspanyolca" },
  { code: "it", flag: "🇮🇹", name: "İtalyanca" },
  { code: "ru", flag: "🇷🇺", name: "Rusça" },
  { code: "ja", flag: "🇯🇵", name: "Japonca" },
  { code: "ko", flag: "🇰🇷", name: "Korece" },
  { code: "zh", flag: "🇨🇳", name: "Çince" }
];

/* ---------------- USER LANG ---------------- */
function getUserLang() {
  return localStorage.getItem(USER_LANG_KEY) || "tr";
}

function setUserLang(code) {
  localStorage.setItem(USER_LANG_KEY, norm(code));
}

/* ---------------- BASE ---------------- */
function baseReadyKey(lang) {
  return BASE_READY_PREFIX + norm(lang);
}

function isBaseReady(lang) {
  return localStorage.getItem(baseReadyKey(lang)) === "1";
}

function setBaseReady(lang) {
  localStorage.setItem(baseReadyKey(lang), "1");
}

/* ---------------- LOCAL INSTALL STATE (DEVICE) ---------------- */
function getLocalInstalled() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_INSTALLED_KEY) || "[]");
  } catch {
    return [];
  }
}

function markLocalInstalled(lang) {
  const set = new Set(getLocalInstalled().map(norm));
  set.add(norm(lang));
  localStorage.setItem(LOCAL_INSTALLED_KEY, JSON.stringify([...set]));
}

function isLocallyInstalled(lang) {
  return getLocalInstalled().map(norm).includes(norm(lang));
}

/* ---------------- PROFILE / DB ---------------- */
function getProfileOfflineLangEntries() {
  const raw = profileRow?.offline_langs;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === "string") {
        return {
          code: norm(x),
          download_count: 1,
          last_download_at: null
        };
      }
      return {
        code: norm(x?.code),
        download_count: Number(x?.download_count || 0),
        last_download_at: x?.last_download_at || null
      };
    })
    .filter((x) => !!x.code);
}

function getOfflineEntry(lang) {
  return getProfileOfflineLangEntries().find((x) => x.code === norm(lang)) || null;
}

function getDownloadCount(lang) {
  return Number(getOfflineEntry(lang)?.download_count || 0);
}

function hasEverDownloaded(lang) {
  return getDownloadCount(lang) > 0;
}

function nextDownloadCost(lang) {
  return hasEverDownloaded(lang) ? REDOWNLOAD_COST : 0;
}

async function loadProfile() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data?.user?.id || "";
  if (!userId) throw new Error("Oturum bulunamadı");

  currentUserId = userId;

  const { data: row, error: pErr } = await supabase
    .from("profiles")
    .select("id,tokens,offline_langs")
    .eq("id", userId)
    .single();

  if (pErr) throw pErr;

  profileRow = row || null;

  try {
    setHeaderTokens(Number(profileRow?.tokens || 0));
  } catch {}
}

async function saveOfflineLangDownload(lang) {
  const code = norm(lang);
  const list = getProfileOfflineLangEntries();
  const nowIso = new Date().toISOString();

  const idx = list.findIndex((x) => x.code === code);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      code,
      download_count: Number(list[idx].download_count || 0) + 1,
      last_download_at: nowIso
    };
  } else {
    list.push({
      code,
      download_count: 1,
      last_download_at: nowIso
    });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ offline_langs: list })
    .eq("id", currentUserId)
    .select("id,tokens,offline_langs")
    .single();

  if (error) throw error;
  profileRow = data || profileRow;
}

async function chargeRedownload(lang) {
  const entry = getOfflineEntry(lang);
  const count = Number(entry?.download_count || 0);

  if (count <= 0) {
    return {
      charged: 0,
      tokens_after: Number(profileRow?.tokens || 0)
    };
  }

  const note = `Offline dil tekrar indirme: ${lang}`;

  const rpc = await supabase.rpc("apply_wallet_tx", {
    p_user_id: currentUserId,
    p_type: "manual_deduct",
    p_amount: -REDOWNLOAD_COST,
    p_reason: note,
    p_meta: {
      module: "offline_download",
      lang: norm(lang),
      redownload: true,
      unit_cost: REDOWNLOAD_COST
    }
  });

  if (rpc.error) {
    const msg = String(rpc.error?.message || "");
    if (msg.includes("insufficient_tokens")) {
      const err = new Error("insufficient_tokens");
      err.code = "INSUFFICIENT_TOKENS";
      throw err;
    }
    throw rpc.error;
  }

  const walletData = rpc.data || {};
  const tokensAfter = Number(walletData?.tokens_after || 0);

  profileRow = {
    ...(profileRow || {}),
    tokens: tokensAfter
  };

  try {
    setHeaderTokens(tokensAfter);
  } catch {}

  return {
    charged: REDOWNLOAD_COST,
    tokens_after: tokensAfter
  };
}

/* ---------------- NATIVE ---------------- */
function nativeReady() {
  return !!(window.Offline && typeof window.Offline.installFromUrl === "function");
}

function installNative(pair, url) {
  if (!nativeReady()) throw new Error("native_offline_not_ready");
  window.Offline.installFromUrl(pair, url);
}

/* ---------------- FILE ---------------- */
function publicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

function pairPath(pair) {
  return `langpacks/${pair}/model.zip`;
}

/* ---------------- INSTALL BASE ---------------- */
async function installBase() {
  const lang = getUserLang();

  if (!nativeReady()) {
    toast("Offline sistem hazır değil");
    return;
  }

  installBaseBtn.disabled = true;
  installBaseBtn.textContent = "Kuruluyor...";

  try {
    const pairs = [`${lang}-${PIVOT}`, `${PIVOT}-${lang}`];

    for (const pair of pairs) {
      const url = publicUrl(pairPath(pair));
      if (!url) throw new Error(`base_url_missing_${pair}`);
      installNative(pair, url);
    }

    markLocalInstalled("en");
    markLocalInstalled(lang);
    setBaseReady(lang);

    setStatus("Temel kurulum tamamlandı", "ok");
    toast("Temel kurulum tamamlandı");
  } catch (e) {
    console.error(e);
    setStatus("Temel kurulum başarısız", "err");
    toast("Kurulum hatası");
  }

  installBaseBtn.disabled = false;
  installBaseBtn.textContent = "Hazır";
  render();
}

/* ---------------- INSTALL LANG ---------------- */
window.installLang = async function (lang) {
  const code = norm(lang);
  if (!code) return;

  if (!nativeReady()) {
    toast("Offline sistem hazır değil");
    return;
  }

  if (!currentUserId) {
    toast("Önce giriş yapın.");
    return;
  }

  if (isLocallyInstalled(code)) {
    toast("Bu dil bu cihazda zaten kurulu");
    return;
  }

  const myToken = ++renderToken;
  const cost = nextDownloadCost(code);

  try {
    setStatus(
      cost > 0
        ? `${code.toUpperCase()} yeniden indiriliyor (${cost} jeton)`
        : `${code.toUpperCase()} ilk kez indiriliyor (ücretsiz)`,
      "info"
    );

    if (cost > 0) {
      const approved = confirm(
        `${code.toUpperCase()} dili daha önce indirildi.\n` +
        `Bu yeniden indirme ${cost} jeton düşer.\n\nDevam edilsin mi?`
      );

      if (!approved) {
        setStatus("İşlem iptal edildi", "warn");
        return;
      }

      await chargeRedownload(code);
    }

    const pairs = [`${code}-${PIVOT}`, `${PIVOT}-${code}`];

    for (const pair of pairs) {
      const url = publicUrl(pairPath(pair));
      if (!url) throw new Error(`pack_url_missing_${pair}`);
      installNative(pair, url);
    }

    markLocalInstalled(code);
    await saveOfflineLangDownload(code);

    if (myToken !== renderToken) return;

    const afterCount = getDownloadCount(code);
    const chargedText = cost > 0 ? ` • ${cost} jeton düşüldü` : " • ücretsiz";
    setStatus(`${code.toUpperCase()} indirildi • indirme sayısı: ${afterCount}${chargedText}`, "ok");
    toast(cost > 0 ? `Dil indirildi • ${cost} jeton düşüldü` : "Dil indirildi");
  } catch (e) {
    console.error(e);

    if (e?.code === "INSUFFICIENT_TOKENS" || String(e?.message || "").includes("insufficient_tokens")) {
      setStatus("Yetersiz jeton", "err");
      toast("Jeton yetersiz");
      setTimeout(() => {
        location.href = "/pages/jetonbuy.html";
      }, 350);
      return;
    }

    setStatus("Dil indirilemedi", "err");
    toast("İndirme hatası");
  }

  render();
};

/* ---------------- RENDER ---------------- */
function buildLangCard(l, userLang, query) {
  if (l.code === userLang) return "";

  const q = norm(query);
  if (q && !(`${l.name} ${l.code}`.toLowerCase().includes(q))) return "";

  const localInstalled = isLocallyInstalled(l.code);
  const downloadedBefore = hasEverDownloaded(l.code);
  const downloadCount = getDownloadCount(l.code);
  const cost = nextDownloadCost(l.code);

  let sub = "";
  if (localInstalled) {
    sub = "Bu cihazda kurulu";
  } else if (!downloadedBefore) {
    sub = "İlk indirme ücretsiz";
  } else {
    sub = `Tekrar indirme ${cost} jeton • Önceki indirme: ${downloadCount}`;
  }

  const btnText = localInstalled
    ? "✅ Kuruldu"
    : (!downloadedBefore ? "Ücretsiz İndir" : `${cost} Jetonla İndir`);

  const btnClass = localInstalled
    ? "lang-btn installed"
    : (!downloadedBefore ? "lang-btn free" : "lang-btn paid");

  const disabledAttr = localInstalled ? "disabled" : "";

  return `
    <div class="lang-card">
      <div class="lang-head">
        <div class="flag">${escapeHtml(l.flag)}</div>
        <div>
          <div class="lang-name">${escapeHtml(l.name)}</div>
          <div class="lang-sub">${escapeHtml(sub)}</div>
        </div>
      </div>

      <button class="${btnClass}" onclick="installLang('${escapeHtml(l.code)}')" ${disabledAttr}>
        ${escapeHtml(btnText)}
      </button>
    </div>
  `;
}

function render() {
  const userLang = getUserLang();
  const localInstalled = getLocalInstalled();

  if (sourceSelect) sourceSelect.value = userLang;
  if (countPill) countPill.textContent = String(localInstalled.length);

  const html = LANGS
    .map((l) => buildLangCard(l, userLang, searchInput?.value || ""))
    .filter(Boolean)
    .join("");

  installedList.innerHTML = html || `
    <div class="lang-card">
      <div class="lang-head">
        <div class="flag">🔎</div>
        <div>
          <div class="lang-name">Sonuç bulunamadı</div>
          <div class="lang-sub">Aramayı biraz sadeleştir.</div>
        </div>
      </div>
    </div>
  `;

  const baseText = isBaseReady(userLang)
    ? `${userLang.toUpperCase()} temel kurulum hazır`
    : `${userLang.toUpperCase()} temel kurulum bekleniyor`;

  const tokenInfo = Number(profileRow?.tokens || 0);
  if (statusBox && !statusBox.textContent.trim()) {
    setStatus(`${baseText} • Bakiye: ${tokenInfo} jeton`, "info");
  }
}

/* ---------------- INIT ---------------- */
async function boot() {
  try {
    const ok = await ensureAuthAndCacheUser();
    if (!ok) {
      location.replace("/pages/login.html");
      return;
    }

    await loadProfile();

    const userLang = getUserLang();
    if (sourceSelect) {
      sourceSelect.value = userLang;
    }

    try {
      setHeaderTokens(Number(profileRow?.tokens || 0));
    } catch {}

    setStatus("Offline diller hazır", "ok");
    render();
  } catch (e) {
    console.error(e);
    setStatus("Oturum doğrulanamadı", "err");
    toast("Önce giriş yapın");
    setTimeout(() => {
      location.replace("/pages/login.html");
    }, 350);
  }
}

/* ---------------- EVENTS ---------------- */
if (installBaseBtn) {
  installBaseBtn.onclick = installBase;
}

if (sourceSelect) {
  sourceSelect.onchange = () => {
    setUserLang(sourceSelect.value);
    setStatus("", "info");
    render();
  };
}

if (searchInput) {
  searchInput.oninput = () => {
    render();
  };
}

boot();
