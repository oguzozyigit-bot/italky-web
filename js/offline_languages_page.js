// FILE: /js/offline_languages_page.js

import { mountShell, setHeaderTokens } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import { getLangPoolForSite } from "/js/lang_pool_full.js";

mountShell({ scroll: "auto" });

const PIVOT = "en";
const USER_LANG_KEY = "italky_user_lang_v1";
const BASE_READY_PREFIX = "offline_base_ready_";
const LOCAL_INSTALLED_KEY = "offline_installed_langs_v2";
const REDOWNLOAD_COST = 20;
const BUCKET = "offline";

const $ = (id) => document.getElementById(id);

const toastEl = $("toast");
const sourceSelect = $("sourceSelect");
const installedList = $("installedList");
const searchInput = $("searchInput");
const countPill = $("installedCount");
const installBaseBtn = $("btnInstallBase");
const statusBox = $("statusBox");
const networkTag = $("networkTag");
const trialTag = $("trialTag");
const btnHome = $("btnHome");

/* ---------------- STATE ---------------- */
let currentUserId = "";
let profileRow = null;
let renderToken = 0;
let LANGS = [];

/* ---------------- HELPERS ---------------- */
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

function getHomeUrl() {
  return "/pages/home.html";
}

function getLanguagePool() {
  const raw = Array.isArray(getLangPoolForSite?.("tr")) ? getLangPoolForSite("tr") : [];
  const seen = new Set();
  const list = raw
    .map((x) => ({
      code: norm(x?.code),
      name: String(x?.name || "").trim(),
      flag: String(x?.flag || "🌐")
    }))
    .filter((x) => x.code && x.name)
    .filter((x) => {
      if (seen.has(x.code)) return false;
      seen.add(x.code);
      return true;
    });

  if (!list.find((x) => x.code === "en")) {
    list.unshift({ code: "en", name: "İngilizce", flag: "🇬🇧" });
  }

  return list;
}

function langName(code) {
  return LANGS.find((x) => x.code === norm(code))?.name || String(code || "").toUpperCase();
}

function langFlag(code) {
  return LANGS.find((x) => x.code === norm(code))?.flag || "🌐";
}

/* ---------------- ACCESS ---------------- */
function getAccessState() {
  const a = window.__ITALKY_ACCESS__ || {};

  const trialActive =
    a.trialActive === true ||
    a.trial_active === true ||
    Number(a.trialDaysLeft || 0) > 0 ||
    Number(a.trial_days_left || 0) > 0 ||
    Number(a.remainingTrialDays || 0) > 0 ||
    Number(a.remaining_trial_days || 0) > 0;

  const hasPackage =
    a.hasPackage === true ||
    a.has_package === true ||
    a.packageActive === true ||
    a.package_active === true ||
    a.isPremium === true ||
    a.premium === true;

  const nfcActive =
    a.nfcActive === true ||
    a.nfc_active === true ||
    a.cardAccess === true ||
    a.card_access === true;

  const loaded =
    a.loaded === true ||
    a.ready === true ||
    a.accessLoaded === true ||
    a.access_loaded === true ||
    Object.keys(a).length > 0;

  return { trialActive, hasPackage, nfcActive, loaded };
}

async function waitForAccessState(maxMs = 5000) {
  const started = Date.now();

  while (Date.now() - started < maxMs) {
    const access = getAccessState();
    if (access.loaded) return access;
    await new Promise((r) => setTimeout(r, 150));
  }

  return getAccessState();
}

function accessOk(access) {
  const s = access || getAccessState();
  return s.trialActive || s.hasPackage || s.nfcActive;
}

function updateTopStatus() {
  if (networkTag) networkTag.textContent = navigator.onLine ? "ONLINE" : "OFFLINE";

  const access = getAccessState();
  if (!trialTag) return;

  if (access.trialActive) {
    trialTag.textContent = "DENEME AKTİF";
  } else if (access.hasPackage || access.nfcActive) {
    trialTag.textContent = "ERİŞİM AÇIK";
  } else {
    trialTag.textContent = "KİLİTLİ";
  }
}

/* ---------------- USER LANG ---------------- */
function getUserLang() {
  return localStorage.getItem(USER_LANG_KEY) || "tr";
}

function setUserLang(code) {
  localStorage.setItem(USER_LANG_KEY, norm(code));
}

function baseReadyKey(lang) {
  return BASE_READY_PREFIX + norm(lang);
}

function isBaseReady(lang) {
  return localStorage.getItem(baseReadyKey(lang)) === "1";
}

function setBaseReady(lang) {
  localStorage.setItem(baseReadyKey(lang), "1");
}

/* ---------------- DEVICE STATE ---------------- */
function getLocalInstalled() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_INSTALLED_KEY) || "[]");
  } catch {
    return [];
  }
}

function setLocalInstalled(arr) {
  localStorage.setItem(LOCAL_INSTALLED_KEY, JSON.stringify(arr));
}

function markLocalInstalled(code) {
  const set = new Set(getLocalInstalled().map(norm));
  set.add(norm(code));
  setLocalInstalled([...set]);
}

function isLocallyInstalled(code) {
  return getLocalInstalled().map(norm).includes(norm(code));
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

async function saveOwnLanguageBase(lang) {
  const code = norm(lang);
  const list = getProfileOfflineLangEntries();
  const nowIso = new Date().toISOString();

  const idx = list.findIndex((x) => x.code === code);
  if (idx >= 0) {
    if (Number(list[idx].download_count || 0) < 1) {
      list[idx].download_count = 1;
    }
    list[idx].last_download_at = nowIso;
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

function installPairsForLanguage(code) {
  const lang = norm(code);
  if (!lang || lang === PIVOT) return [];
  return [`${lang}-${PIVOT}`, `${PIVOT}-${lang}`];
}

/* ---------------- INSTALL BASE ---------------- */
async function installBase() {
  const ownLang = norm(getUserLang());

  if (!ownLang || ownLang === PIVOT) {
    setStatus("İngilizce seçiliyse temel köprü kurulumu gerekmez.", "warn");
    toast("İngilizce için köprü kurulumu gerekmez");
    return;
  }

  const access = await waitForAccessState();

  if (!accessOk(access)) {
    setStatus("Offline kullanım için erişim gerekli.", "err");
    toast("Üyelik veya erişim gerekli");
    return;
  }

  if (!navigator.onLine) {
    setStatus("Kurulum için internet gerekir.", "err");
    toast("Kurulum için internet gerekir");
    return;
  }

  if (!nativeReady()) {
    setStatus("Offline bridge hazır değil.", "err");
    toast("Offline sistem hazır değil");
    return;
  }

  const ownName = langName(ownLang);
  const approved = confirm(
    `${ownName} kurulumu başlatılıyor.\n\n` +
    `Sistem arka planda şu köprüleri hazırlar:\n` +
    `• ${ownName} → İngilizce\n` +
    `• İngilizce → ${ownName}\n\n` +
    `Onaylıyor musunuz?`
  );

  if (!approved) {
    setStatus("Kurulum iptal edildi.", "warn");
    return;
  }

  installBaseBtn.disabled = true;
  installBaseBtn.textContent = "Kuruluyor...";

  try {
    const pairs = installPairsForLanguage(ownLang);

    for (const pair of pairs) {
      const url = publicUrl(pairPath(pair));
      if (!url) throw new Error(`base_url_missing_${pair}`);
      installNative(pair, url);
    }

    markLocalInstalled(ownLang);
    setBaseReady(ownLang);
    await saveOwnLanguageBase(ownLang);

    setStatus(`${ownName} temel köprü kurulumu tamamlandı. Şimdi diğer hedef dilleri indirebilirsiniz.`, "info");
    toast(`${ownName} kurulumu tamamlandı`);
  } catch (e) {
    console.error(e);
    setStatus("Temel kurulum başarısız.", "err");
    toast("Kurulum hatası");
  }

  installBaseBtn.disabled = false;
  installBaseBtn.textContent = "Kurulumu Başlat";
  render();
}

/* ---------------- INSTALL LANG ---------------- */
window.installLang = async function (lang) {
  const code = norm(lang);
  if (!code) return;

  const ownLang = norm(getUserLang());

  if (code === ownLang) {
    toast("Kendi konuşma diliniz burada tekrar gösterilmez");
    return;
  }

  if (code === PIVOT) {
    toast("İngilizce köprü dilidir ve ayrıca gösterilmez");
    return;
  }

  if (!nativeReady()) {
    toast("Offline sistem hazır değil");
    return;
  }

  if (!currentUserId) {
    toast("Önce giriş yapın.");
    return;
  }

  if (!isBaseReady(ownLang)) {
    setStatus("Önce kendi konuşma diliniz için temel kurulumu tamamlayın.", "warn");
    toast("Önce temel kurulumu tamamlayın");
    return;
  }

  const access = await waitForAccessState();

  if (!accessOk(access)) {
    setStatus("Offline kullanım için erişim gerekli.", "err");
    toast("Üyelik veya erişim gerekli");
    return;
  }

  if (!navigator.onLine) {
    setStatus("Dil paketi indirmek için internet gerekir.", "err");
    toast("İndirme için internet gerekir");
    return;
  }

  if (isLocallyInstalled(code)) {
    toast("Bu dil bu cihazda zaten kurulu");
    return;
  }

  const myToken = ++renderToken;
  const cost = nextDownloadCost(code);
  const title = langName(code);

  try {
    setStatus(
      cost > 0
        ? `${title} yeniden indiriliyor (${cost} jeton)`
        : `${title} ilk kez indiriliyor (ücretsiz)`,
      cost > 0 ? "warn" : "info"
    );

    if (cost > 0) {
      const approved = confirm(
        `${title} dili daha önce indirildi.\n` +
        `Bu yeniden indirme ${cost} jeton düşer.\n\nDevam edilsin mi?`
      );

      if (!approved) {
        setStatus("İşlem iptal edildi", "warn");
        return;
      }

      await chargeRedownload(code);
    }

    const pairs = installPairsForLanguage(code);

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
    setStatus(`${title} indirildi • indirme sayısı: ${afterCount}${chargedText}`, "info");
    toast(cost > 0 ? `${title} indirildi • ${cost} jeton düşüldü` : `${title} indirildi`);
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
function populateOwnLanguageSelect() {
  if (!sourceSelect) return;

  sourceSelect.innerHTML = LANGS
    .filter((l) => l.code !== PIVOT)
    .map((l) => `<option value="${escapeHtml(l.code)}">${escapeHtml(l.flag)} ${escapeHtml(l.name)}</option>`)
    .join("");

  const current = norm(getUserLang());
  if (LANGS.some((l) => l.code === current && l.code !== PIVOT)) {
    sourceSelect.value = current;
  }
}

function buildLangCard(l, query) {
  const ownLang = norm(getUserLang());
  if (l.code === ownLang) return "";
  if (l.code === PIVOT) return "";

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
  const ownLang = getUserLang();
  const localInstalled = getLocalInstalled().filter((x) => x !== PIVOT);

  populateOwnLanguageSelect();

  if (countPill) {
    countPill.textContent = String(localInstalled.filter((x) => x !== ownLang).length);
  }

  const html = LANGS
    .map((l) => buildLangCard(l, searchInput?.value || ""))
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

  const ownName = langName(ownLang);
  const baseText = isBaseReady(ownLang)
    ? `${ownName} temel köprü hazır`
    : `${ownName} temel köprü kurulumu bekleniyor`;

  const tokenInfo = Number(profileRow?.tokens || 0);
  if (statusBox && !statusBox.textContent.trim()) {
    setStatus(`${baseText} • Bakiye: ${tokenInfo} jeton`, "info");
  }

  updateTopStatus();
}

/* ---------------- INIT ---------------- */
async function boot() {
  try {
    LANGS = getLanguagePool();

    const ok = await ensureAuthAndCacheUser();
    if (!ok) {
      location.replace("/pages/login.html");
      return;
    }

    await loadProfile();
    await waitForAccessState();
    updateTopStatus();

    populateOwnLanguageSelect();

    try {
      setHeaderTokens(Number(profileRow?.tokens || 0));
    } catch {}

    setStatus("Önce kendi konuşma dilinizi seçin.", "info");
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
    setStatus(`${langName(sourceSelect.value)} seçildi. Kurulumu başlatabilirsiniz.`, "info");
    render();
  };
}

if (searchInput) {
  searchInput.oninput = () => {
    render();
  };
}

if (btnHome) {
  btnHome.onclick = () => {
    location.href = getHomeUrl();
  };
}

window.addEventListener("online", updateTopStatus);
window.addEventListener("offline", updateTopStatus);

boot();
