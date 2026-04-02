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

const confirmBackdrop = $("confirmBackdrop");
const confirmTitle = $("confirmTitle");
const confirmText = $("confirmText");
const confirmCancel = $("confirmCancel");
const confirmOk = $("confirmOk");

/* ---------------- STATE ---------------- */
let currentUserId = "";
let profileRow = null;
let renderToken = 0;
let LANGS = [];

let accessState = {
  loaded: false,
  tier: "free",      // free | trial | member
  trialActive: false,
  hasPackage: false,
  nfcActive: false
};

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

/* ---------------- MODALS ---------------- */
function askConfirm({ title, text }) {
  return new Promise((resolve) => {
    confirmTitle.textContent = title || "Onay";
    confirmText.textContent = text || "";
    confirmBackdrop.classList.add("show");

    const close = (result) => {
      confirmBackdrop.classList.remove("show");
      confirmCancel.removeEventListener("click", onCancel);
      confirmOk.removeEventListener("click", onOk);
      resolve(result);
    };

    const onCancel = () => close(false);
    const onOk = () => close(true);

    confirmCancel.addEventListener("click", onCancel);
    confirmOk.addEventListener("click", onOk);
  });
}

function ensureMemberModal() {
  let modal = document.getElementById("memberOnlyModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "memberOnlyModal";
  modal.innerHTML = `
    <div class="member-only-backdrop" style="
      position:fixed; inset:0; display:none; align-items:center; justify-content:center;
      background:rgba(0,0,0,.58); backdrop-filter:blur(6px); z-index:999999; padding:18px;
    ">
      <div style="
        width:min(100%,420px);
        border-radius:24px;
        padding:18px;
        background:linear-gradient(145deg, rgba(16,16,24,.96), rgba(10,10,18,.96));
        border:1px solid rgba(255,255,255,.10);
        box-shadow:0 24px 50px rgba(0,0,0,.30);
        color:#fff;
        font-family:Outfit,sans-serif;
      ">
        <h3 id="memberOnlyTitle" style="
          margin:0 0 8px;
          font-family:'Space Grotesk',sans-serif;
          font-size:20px;
          font-weight:900;
          color:#fff;
        ">Üyelik Gerekli</h3>

        <p id="memberOnlyText" style="
          margin:0;
          font-size:13px;
          line-height:1.6;
          color:rgba(255,255,255,.76);
        ">Bu özelliği kullanabilmek için üye olmanız gerekir.</p>

        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
          margin-top:16px;
        ">
          <button id="memberOnlyGo" type="button" style="
            min-height:46px;
            border:none;
            border-radius:16px;
            cursor:pointer;
            font-family:inherit;
            font-size:13px;
            font-weight:900;
            background:linear-gradient(135deg,#8bd3ff 0%,#7c5cff 45%,#ff66c4 100%);
            color:#05060d;
          ">Üyelik Paketlerini Gör</button>

          <button id="memberOnlySkip" type="button" style="
            min-height:46px;
            border:none;
            border-radius:16px;
            cursor:pointer;
            font-family:inherit;
            font-size:13px;
            font-weight:900;
            background:rgba(255,255,255,.06);
            border:1px solid rgba(255,255,255,.10);
            color:#fff;
          ">Atla</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const backdrop = modal.querySelector(".member-only-backdrop");
  const skip = modal.querySelector("#memberOnlySkip");
  const go = modal.querySelector("#memberOnlyGo");

  const close = () => {
    backdrop.style.display = "none";
  };

  skip.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  go.addEventListener("click", () => {
    location.href = "/pages/upgrade_pack.html";
  });

  return modal;
}

function showMemberOnlyModal(message, title = "Üyelik Gerekli") {
  const modal = ensureMemberModal();
  const backdrop = modal.querySelector(".member-only-backdrop");
  const titleEl = modal.querySelector("#memberOnlyTitle");
  const textEl = modal.querySelector("#memberOnlyText");

  titleEl.textContent = title;
  textEl.textContent = message || "Bu özelliği kullanabilmek için üye olmanız gerekir.";
  backdrop.style.display = "flex";
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

  const rawPackageCode = String(
    a.selected_package_code ||
    a.package_code ||
    a.plan ||
    ""
  ).trim().toLowerCase();

  const packageCode =
    rawPackageCode.startsWith("premium") ? "premium" :
    rawPackageCode.startsWith("translate") ? "translate" :
    rawPackageCode.startsWith("edu") || rawPackageCode.startsWith("education") ? "education" :
    rawPackageCode;

  const hasPackage =
    a.hasPackage === true ||
    a.has_package === true ||
    a.packageActive === true ||
    a.package_active === true ||
    a.isPremium === true ||
    a.premium === true ||
    !!packageCode;

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

  let tier = "free";
  if (hasPackage || nfcActive) tier = "member";
  else if (trialActive) tier = "trial";

  return {
    loaded,
    trialActive,
    hasPackage,
    nfcActive,
    packageCode,
    tier
  };
}

async function waitForAccessState(maxMs = 5000) {
  const started = Date.now();

  while (Date.now() - started < maxMs) {
    const access = getAccessState();
    if (access.loaded) {
      accessState = access;
      return access;
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  accessState = getAccessState();
  return accessState;
}

function canUseOfflineDownloads(access = accessState) {
  if (!access) return false;
  if (access.tier === "member") return true;
  if (access.hasPackage === true) return true;
  if (access.nfcActive === true) return true;
  return false;
}

function requireOfflineMembership() {
  showMemberOnlyModal("Offline dil paketlerini indirebilmek için üye olmanız gerekir.");
  return false;
}

function updateTopStatus() {
  if (networkTag) networkTag.textContent = navigator.onLine ? "ONLINE" : "OFFLINE";

  if (!trialTag) return;

  const access = accessState?.loaded ? accessState : getAccessState();

  if (!access.loaded) {
    trialTag.textContent = "KONTROL";
    return;
  }

  if (access.tier === "member") {
  trialTag.textContent = access.packageCode ? `ÜYE • ${access.packageCode.toUpperCase()}` : "ERİŞİM AÇIK";
  return;
}

  if (access.tier === "trial") {
    trialTag.textContent = "DENEME";
    return;
  }

  trialTag.textContent = "FREE";
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

function markLocalRemoved(code) {
  const next = getLocalInstalled().map(norm).filter((x) => x !== norm(code));
  setLocalInstalled(next);
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

function nativeCanDelete() {
  return !!(window.Offline && typeof window.Offline.uninstall === "function");
}

function installNative(pair, url) {
  if (!nativeReady()) throw new Error("native_offline_not_ready");
  window.Offline.installFromUrl(pair, url);
}

function uninstallNative(pair) {
  if (!nativeCanDelete()) return false;
  try {
    window.Offline.uninstall(pair);
    return true;
  } catch {
    return false;
  }
}

function nativeCheckDirectionInstalled(pair) {
  try {
    if (window.Offline && typeof window.Offline.isInstalled === "function") {
      return !!window.Offline.isInstalled(pair);
    }
  } catch {}
  return false;
}

async function waitUntilPairsInstalled(pairs, timeoutMs = 90000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const allReady = pairs.every((pair) => nativeCheckDirectionInstalled(pair));
    if (allReady) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }

  return false;
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

async function remotePairExists(pair) {
  try {
    const url = publicUrl(pairPath(pair));
    if (!url) return false;
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/* ---------------- INSTALL BASE ---------------- */
async function installBase() {
  const ownLang = norm(getUserLang());

  if (!ownLang || ownLang === PIVOT) {
    setStatus("İngilizce seçiliyse temel kurulum gerekmez.", "warn");
    toast("İngilizce için temel kurulum gerekmez");
    return;
  }

  const access = await waitForAccessState();
  if (!canUseOfflineDownloads(access)) {
    setStatus("Offline kurulum için üyelik gerekir.", "err");
    requireOfflineMembership();
    return;
  }

  if (!navigator.onLine) {
    setStatus("Kurulum için internet gerekir.", "err");
    toast("Kurulum için internet gerekir");
    return;
  }

  if (!nativeReady()) {
    setStatus("Offline sistem hazır değil.", "err");
    toast("Offline sistem hazır değil");
    return;
  }

  const ownName = langName(ownLang);

  const approved = await askConfirm({
    title: "Dil seçimini onaylayın",
    text:
      `Kendi diliniz olarak ${ownName} seçtiniz.\n` +
      `Kurulum bu dilde tamamlanacak.\n\n` +
      `Dil seçimini onaylıyor musunuz?`
  });

  if (!approved) {
    setStatus("Kurulum iptal edildi.", "warn");
    return;
  }

  installBaseBtn.disabled = true;
  installBaseBtn.textContent = "Kurulum Sürüyor...";

  try {
    const pairs = installPairsForLanguage(ownLang);

    for (const pair of pairs) {
      const exists = await remotePairExists(pair);
      if (!exists) {
        throw new Error(`remote_pack_missing_${pair}`);
      }
    }

    setStatus(`${ownName} indiriliyor ve kuruluyor. Kurulum doğrulanıyor...`, "warn");

    for (const pair of pairs) {
      const url = publicUrl(pairPath(pair));
      installNative(pair, url);
    }

    const ready = await waitUntilPairsInstalled(pairs, 90000);

    if (!ready) {
      setStatus(
        `${ownName} kurulumu henüz tamamlanmadı. Web tarafı kur komutu verdi ama cihaz kurulu olarak doğrulamadı. Android offline bridge kontrol edilmeli.`,
        "err"
      );
      toast("Kurulum doğrulanamadı");
      installBaseBtn.disabled = false;
      installBaseBtn.textContent = "Kurulumu Başlat";
      return;
    }

    markLocalInstalled(ownLang);
    setBaseReady(ownLang);
    await saveOwnLanguageBase(ownLang);

    setStatus(`${ownName} kurulumu tamamlandı. Şimdi diğer hedef dilleri indirebilirsiniz.`, "ok");
    toast(`${ownName} kurulumu tamamlandı`);

    installBaseBtn.disabled = true;
    installBaseBtn.textContent = "Kurulum Tamamlandı";
  } catch (e) {
    console.error(e);
    const msg = String(e?.message || "");

    if (msg.startsWith("remote_pack_missing_")) {
      setStatus("Sunucuda ilgili offline paket bulunamadı.", "err");
      toast("Paket bulunamadı");
    } else {
      setStatus("Temel kurulum başarısız.", "err");
      toast("Kurulum hatası");
    }

    installBaseBtn.disabled = false;
    installBaseBtn.textContent = "Kurulumu Başlat";
  }

  render();
}

/* ---------------- REMOVE LANG ---------------- */
window.removeLang = async function (lang) {
  const code = norm(lang);
  if (!code) return;

  const ownLang = norm(getUserLang());
  if (code === ownLang) {
    toast("Kendi konuşma diliniz buradan silinmez");
    return;
  }
  if (code === PIVOT) {
    toast("İngilizce köprü dili burada silinmez");
    return;
  }

  const access = await waitForAccessState();
  if (!canUseOfflineDownloads(access)) {
    setStatus("Offline dil yönetimi için üyelik gerekir.", "err");
    requireOfflineMembership();
    return;
  }

  const title = langName(code);

  const approved = await askConfirm({
    title: "Dili sil",
    text: `${title} bu cihazdan kaldırılacak.\n\nDevam etmek istiyor musunuz?`
  });

  if (!approved) return;

  const pairs = installPairsForLanguage(code);
  let ok = true;

  for (const pair of pairs) {
    const removed = uninstallNative(pair);
    if (!removed) ok = false;
  }

  if (!ok) {
    setStatus(`${title} silinemedi. Android bridge uninstall desteği eksik olabilir.`, "err");
    toast("Silme başarısız");
    return;
  }

  markLocalRemoved(code);
  setStatus(`${title} cihazdan kaldırıldı.`, "ok");
  toast(`${title} silindi`);
  render();
};

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

  const access = await waitForAccessState();
  if (!canUseOfflineDownloads(access)) {
    setStatus("Offline dil indirmek için üyelik gerekir.", "err");
    requireOfflineMembership();
    return;
  }

  if (!isBaseReady(ownLang)) {
    setStatus("Önce kendi konuşma diliniz için temel kurulumu tamamlayın.", "warn");
    toast("Önce temel kurulumu tamamlayın");
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
    if (cost > 0) {
      const approved = await askConfirm({
        title: "İndirmeyi onaylayın",
        text:
          `${title} dili daha önce indirildi.\n` +
          `Bu yeniden indirme ${cost} jeton düşer.\n\n` +
          `Devam etmek istiyor musunuz?`
      });

      if (!approved) {
        setStatus("İşlem iptal edildi", "warn");
        return;
      }

      await chargeRedownload(code);
    }

    const pairs = installPairsForLanguage(code);

    for (const pair of pairs) {
      const exists = await remotePairExists(pair);
      if (!exists) {
        throw new Error(`remote_pack_missing_${pair}`);
      }
    }

    setStatus(`${title} indiriliyor ve kuruluyor. Lütfen bekleyin...`, "warn");

    for (const pair of pairs) {
      const url = publicUrl(pairPath(pair));
      installNative(pair, url);
    }

    const ready = await waitUntilPairsInstalled(pairs, 90000);

    if (!ready) {
      setStatus(
        `${title} için kur komutu gönderildi ama cihaz paketi kurulu olarak doğrulamadı. Android offline bridge kontrol edilmeli.`,
        "err"
      );
      toast("Kurulum doğrulanamadı");
      return;
    }

    markLocalInstalled(code);
    await saveOfflineLangDownload(code);

    if (myToken !== renderToken) return;

    const afterCount = getDownloadCount(code);
    const chargedText = cost > 0 ? ` • ${cost} jeton düşüldü` : " • ilk indirme";
    setStatus(`${title} kuruldu • indirme sayısı: ${afterCount}${chargedText}`, "ok");
    toast(`${title} kuruldu`);
  } catch (e) {
    console.error(e);

    const msg = String(e?.message || "");
    if (msg.startsWith("remote_pack_missing_")) {
      setStatus(`${title} için sunucuda paket bulunamadı.`, "err");
      toast("Paket bulunamadı");
      return;
    }

    if (e?.code === "INSUFFICIENT_TOKENS" || msg.includes("insufficient_tokens")) {
      setStatus("Yetersiz jeton", "err");
      toast("Jeton yetersiz");
      setTimeout(() => {
        location.href = "/pages/jetonbuy.html";
      }, 350);
      return;
    }

    setStatus("Dil indirilemedi.", "err");
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
  const canUse = canUseOfflineDownloads(accessState);

  let sub = "";
  if (localInstalled) {
    sub = "Bu cihazda kurulu";
  } else if (!downloadedBefore) {
    sub = canUse ? "İlk indirme ücretsiz" : "İndirmek için üyelik gerekir";
  } else {
    sub = canUse
      ? `Tekrar indirme ${cost} jeton • Önceki indirme: ${downloadCount}`
      : `Tekrar indirme kapalı • Üyelik gerekir`;
  }

  if (localInstalled) {
    return `
      <div class="lang-card">
        <div class="lang-head">
          <div class="flag">${escapeHtml(l.flag)}</div>
          <div>
            <div class="lang-name">${escapeHtml(l.name)}</div>
            <div class="lang-sub">${escapeHtml(sub)}</div>
          </div>
        </div>

        <button class="lang-btn installed" type="button" disabled>✅ Kuruldu</button>
        <button class="lang-btn paid" style="margin-top:10px;" onclick="removeLang('${escapeHtml(l.code)}')">Sil</button>
      </div>
    `;
  }

  const btnText = !canUse
    ? "Üyelik Gerekli"
    : (!downloadedBefore ? "Ücretsiz İndir" : `${cost} Jetonla İndir`);

  const btnClass = !canUse
    ? "lang-btn paid"
    : (!downloadedBefore ? "lang-btn free" : "lang-btn paid");

  return `
    <div class="lang-card">
      <div class="lang-head">
        <div class="flag">${escapeHtml(l.flag)}</div>
        <div>
          <div class="lang-name">${escapeHtml(l.name)}</div>
          <div class="lang-sub">${escapeHtml(sub)}</div>
        </div>
      </div>

      <button class="${btnClass}" onclick="installLang('${escapeHtml(l.code)}')">
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

  if (isBaseReady(ownLang)) {
    installBaseBtn.disabled = true;
    installBaseBtn.textContent = "Kurulum Tamamlandı";
  } else {
    installBaseBtn.disabled = false;
    installBaseBtn.textContent = canUseOfflineDownloads(accessState)
      ? "Kurulumu Başlat"
      : "Üyelik Gerekli";
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

    if (canUseOfflineDownloads(accessState)) {
      setStatus("Önce kendi konuşma dilinizi seçin.", "info");
    } else {
      setStatus("Offline paket indirmek için üyelik gerekir.", "warn");
    }

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
    if (canUseOfflineDownloads(accessState)) {
      setStatus(`${langName(sourceSelect.value)} seçildi. Kurulumu başlatabilirsiniz.`, "info");
    } else {
      setStatus(`${langName(sourceSelect.value)} seçildi. Kurulum için üyelik gerekir.`, "warn");
    }
    render();
  };
}

if (searchInput) {
  searchInput.oninput = () => {
    render();
  };
}

window.addEventListener("online", updateTopStatus);
window.addEventListener("offline", updateTopStatus);

boot();
