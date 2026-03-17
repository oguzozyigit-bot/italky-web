import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

mountShell({ scroll: "auto" });

const API_BASE = "https://italky-api.onrender.com";
const BUCKET = "offline";
const PIVOT = "en";
const USER_LANG_KEY = "italky_user_lang_v1";
const PRIORITY_CODES = ["en", "de", "fr", "it", "es", "tr"];
const OFFLINE_PRICE = 5;
const OFFLINE_DURATION_LABEL = "12 Ay";
const BASE_READY_PREFIX = "offline_base_ready_";

const $ = (id) => document.getElementById(id);

const toastEl = $("toast");
const sourceSelect = $("sourceSelect");
const installedList = $("installedList");
const availableList = $("availableList");
const searchInput = $("searchInput");
const countPill = $("countPill");
const netPill = $("netPill");
const installBaseBtn = $("installBaseBtn");
const baseSetupPanel = $("baseSetupPanel");
const extraLanguagesPanel = $("extraLanguagesPanel");
const otherLanguagesPanel = $("otherLanguagesPanel");
const baseSuccessBox = $("baseSuccessBox");

function toast(msg) {
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2300);
}

function norm(v) {
  return String(v || "").trim().toLowerCase().replaceAll("_", "-");
}

function pairPath(pair) {
  return `langpacks/${pair}/model.zip`;
}

function publicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

async function fileExists(path) {
  try {
    const url = publicUrl(path);
    if (!url) return false;

    const res = await fetch(url, {
      method: "HEAD",
      cache: "no-store"
    });

    return res.ok;
  } catch {
    return false;
  }
}

async function getCheckedPublicUrl(pair) {
  const path = pairPath(pair);
  const ok = await fileExists(path);
  if (!ok) return "";
  return publicUrl(path);
}

function netPaint() {
  netPill.innerHTML = navigator.onLine
    ? `Ağ: <b>ONLINE</b>`
    : `Ağ: <b>OFFLINE</b>`;
}
window.addEventListener("online", netPaint);
window.addEventListener("offline", netPaint);
netPaint();

function nativeReady() {
  return !!(
    window.Offline &&
    typeof window.Offline.installFromUrl === "function" &&
    typeof window.Offline.isInstalled === "function"
  );
}

function isInstalledNative(pair) {
  try {
    return !!window.Offline.isInstalled(norm(pair));
  } catch {
    return false;
  }
}

function installNative(pair, url) {
  window.Offline.installFromUrl(norm(pair), String(url || "").trim());
}

function uninstallNative(pair) {
  if (typeof window.Offline?.uninstall !== "function") return false;
  window.Offline.uninstall(norm(pair));
  return true;
}

async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

async function getCurrentUserId() {
  const user = await getCurrentUser();
  return user?.id || "";
}

async function activateOfflineLicense(fileName) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Giriş yapmanız gerekiyor.");
  }

  const r = await fetch(`${API_BASE}/api/offline/files/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      file_name: String(fileName || "").trim()
    })
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok) {
    if (r.status === 402) {
      throw new Error("Bu dil için 5 jeton gerekir. Jetonunuz yetersiz.");
    }
    throw new Error(j?.detail || j?.error || "Offline lisans alınamadı.");
  }

  return j;
}

// İsimler şimdilik Türkçe
const LANGS = [
  { code: "tr", flag: "🇹🇷", name: "Türkçe" },
  { code: "en", flag: "🇬🇧", name: "İngilizce" },
  { code: "de", flag: "🇩🇪", name: "Almanca" },
  { code: "fr", flag: "🇫🇷", name: "Fransızca" },
  { code: "it", flag: "🇮🇹", name: "İtalyanca" },
  { code: "es", flag: "🇪🇸", name: "İspanyolca" },
  { code: "pt", flag: "🇵🇹", name: "Portekizce" },
  { code: "ru", flag: "🇷🇺", name: "Rusça" },
  { code: "uk", flag: "🇺🇦", name: "Ukraynaca" },
  { code: "pl", flag: "🇵🇱", name: "Lehçe" },
  { code: "nl", flag: "🇳🇱", name: "Flemenkçe" },
  { code: "sv", flag: "🇸🇪", name: "İsveççe" },
  { code: "no", flag: "🇳🇴", name: "Norveççe" },
  { code: "da", flag: "🇩🇰", name: "Danca" },
  { code: "fi", flag: "🇫🇮", name: "Fince" },
  { code: "cs", flag: "🇨🇿", name: "Çekçe" },
  { code: "sk", flag: "🇸🇰", name: "Slovakça" },
  { code: "hu", flag: "🇭🇺", name: "Macarca" },
  { code: "ro", flag: "🇷🇴", name: "Romence" },
  { code: "bg", flag: "🇧🇬", name: "Bulgarca" },
  { code: "el", flag: "🇬🇷", name: "Yunanca" },
  { code: "sr", flag: "🇷🇸", name: "Sırpça" },
  { code: "hr", flag: "🇭🇷", name: "Hırvatça" },
  { code: "sl", flag: "🇸🇮", name: "Slovence" },
  { code: "bs", flag: "🇧🇦", name: "Boşnakça" },
  { code: "mk", flag: "🇲🇰", name: "Makedonca" },
  { code: "sq", flag: "🇦🇱", name: "Arnavutça" },
  { code: "et", flag: "🇪🇪", name: "Estonca" },
  { code: "lv", flag: "🇱🇻", name: "Letonca" },
  { code: "lt", flag: "🇱🇹", name: "Litvanca" },
  { code: "ar", flag: "🇸🇦", name: "Arapça" },
  { code: "fa", flag: "🇮🇷", name: "Farsça" },
  { code: "he", flag: "🇮🇱", name: "İbranice" },
  { code: "ur", flag: "🇵🇰", name: "Urduca" },
  { code: "hi", flag: "🇮🇳", name: "Hintçe" },
  { code: "bn", flag: "🇧🇩", name: "Bengalce" },
  { code: "ta", flag: "🇮🇳", name: "Tamilce" },
  { code: "te", flag: "🇮🇳", name: "Teluguca" },
  { code: "mr", flag: "🇮🇳", name: "Marathice" },
  { code: "gu", flag: "🇮🇳", name: "Guceratça" },
  { code: "ne", flag: "🇳🇵", name: "Nepalce" },
  { code: "si", flag: "🇱🇰", name: "Sinhalaca" },
  { code: "zh", flag: "🇨🇳", name: "Çince" },
  { code: "ja", flag: "🇯🇵", name: "Japonca" },
  { code: "ko", flag: "🇰🇷", name: "Korece" },
  { code: "th", flag: "🇹🇭", name: "Tayca" },
  { code: "vi", flag: "🇻🇳", name: "Vietnamca" },
  { code: "id", flag: "🇮🇩", name: "Endonezce" },
  { code: "ms", flag: "🇲🇾", name: "Malayca" },
  { code: "fil", flag: "🇵🇭", name: "Filipince" },
  { code: "mn", flag: "🇲🇳", name: "Moğolca" },
  { code: "kk", flag: "🇰🇿", name: "Kazakça" },
  { code: "ky", flag: "🇰🇬", name: "Kırgızca" },
  { code: "uz", flag: "🇺🇿", name: "Özbekçe" },
  { code: "tk", flag: "🇹🇲", name: "Türkmence" },
  { code: "tg", flag: "🇹🇯", name: "Tacikçe" },
  { code: "az", flag: "🇦🇿", name: "Azerice" },
  { code: "ka", flag: "🇬🇪", name: "Gürcüce" },
  { code: "hy", flag: "🇦🇲", name: "Ermenice" },
  { code: "sw", flag: "🇰🇪", name: "Svahili" },
  { code: "am", flag: "🇪🇹", name: "Amharca" },
  { code: "af", flag: "🇿🇦", name: "Afrikanca" },
  { code: "ca", flag: "🇪🇸", name: "Katalanca" },
  { code: "eu", flag: "🇪🇸", name: "Baskça" },
  { code: "gl", flag: "🇪🇸", name: "Galiçyaca" },
  { code: "is", flag: "🇮🇸", name: "İzlandaca" },
  { code: "ga", flag: "🇮🇪", name: "İrlandaca" },
  { code: "cy", flag: "🇬🇧", name: "Galce" }
];

const SUPPORTED_CODES = new Set(LANGS.map((x) => norm(x.code)));

function compareLangs(a, b) {
  const ai = PRIORITY_CODES.indexOf(norm(a.code));
  const bi = PRIORITY_CODES.indexOf(norm(b.code));

  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;

  return a.name.localeCompare(b.name, "tr");
}

const SORTED_LANGS = [...LANGS].sort(compareLangs);

function getUserLang() {
  return norm(localStorage.getItem(USER_LANG_KEY) || "tr");
}

function setUserLang(code) {
  localStorage.setItem(USER_LANG_KEY, norm(code));
}

function baseReadyKey(userLang) {
  return `${BASE_READY_PREFIX}${norm(userLang)}`;
}

function isBaseReady(userLang) {
  try {
    return localStorage.getItem(baseReadyKey(userLang)) === "1";
  } catch {
    return false;
  }
}

function setBaseReady(userLang, ready = true) {
  try {
    localStorage.setItem(baseReadyKey(userLang), ready ? "1" : "0");
  } catch {}
}

function populateSourceSelect() {
  sourceSelect.innerHTML = SORTED_LANGS.map((lang) => {
    return `<option value="${lang.code}">${lang.flag} ${lang.name}</option>`;
  }).join("");

  const current = getUserLang();
  if (SUPPORTED_CODES.has(current)) {
    sourceSelect.value = current;
  }
}

function basePairs(userLang) {
  if (userLang === PIVOT) return [];
  return [`${userLang}-${PIVOT}`, `${PIVOT}-${userLang}`];
}

function targetPairs(targetLang) {
  if (targetLang === PIVOT) return [];
  return [`${targetLang}-${PIVOT}`, `${PIVOT}-${targetLang}`];
}

function installPairsForTarget(targetLang) {
  return [...new Set(targetPairs(targetLang))];
}

function isLanguageInstalledForUser(userLang, targetLang) {
  if (targetLang === userLang) return false;
  if (!isBaseReady(userLang)) return false;

  if (targetLang === PIVOT) {
    return basePairs(userLang).every((pair) => isInstalledNative(pair));
  }

  const targetOk = targetPairs(targetLang).every((pair) => isInstalledNative(pair));
  return targetOk;
}

function removablePairsForTarget(targetLang) {
  if (targetLang === PIVOT) return [];
  return targetPairs(targetLang);
}

async function installPairsWithPolling(pairs, label) {
  if (!pairs.length) return true;

  const urls = [];
  for (const pair of pairs) {
    const url = await getCheckedPublicUrl(pair);
    urls.push({ pair, url });
  }

  const missing = urls.filter((x) => !x.url);
  if (missing.length) {
    toast(`Eksik dosya: ${missing.map((x) => x.pair).join(", ")}`);
    return false;
  }

  urls.forEach((item, i) => {
    setTimeout(() => {
      installNative(item.pair, item.url);
    }, i * 700);
  });

  return await new Promise((resolve) => {
    const started = Date.now();
    const poll = setInterval(() => {
      const ok = pairs.every((pair) => isInstalledNative(pair));

      if (ok) {
        clearInterval(poll);
        toast(`${label} kuruldu ✅`);
        resolve(true);
        return;
      }

      if (Date.now() - started > 70000) {
        clearInterval(poll);
        toast(`Kurulum tamamlanamadı: ${label}`);
        resolve(false);
      }
    }, 2200);
  });
}

async function installBaseLanguage(userLang) {
  const pairs = basePairs(userLang);

  if (!pairs.length) {
    setBaseReady(userLang, true);
    return true;
  }

  const needed = pairs.filter((pair) => !isInstalledNative(pair));
  if (!needed.length) {
    setBaseReady(userLang, true);
    return true;
  }

  toast("Temel offline kurulum başlatıldı…");
  const ok = await installPairsWithPolling(needed, "Temel offline köprü");

  if (ok) {
    setBaseReady(userLang, true);
    return true;
  }

  return false;
}

function updatePanels() {
  const userLang = norm(sourceSelect.value || getUserLang());
  const ready = isBaseReady(userLang);

  if (ready) {
    baseSuccessBox?.classList.remove("hide");
    extraLanguagesPanel?.classList.remove("hide");
    otherLanguagesPanel?.classList.remove("hide");
    installBaseBtn.textContent = "Temel Kurulum Hazır";
    installBaseBtn.classList.add("done");
    installBaseBtn.disabled = true;
  } else {
    baseSuccessBox?.classList.add("hide");
    extraLanguagesPanel?.classList.add("hide");
    otherLanguagesPanel?.classList.add("hide");
    installBaseBtn.textContent = "Temel Kurulumu Başlat";
    installBaseBtn.classList.remove("done");
    installBaseBtn.disabled = false;
  }
}

function renderCard(lang, installed, userLang) {
  const card = document.createElement("div");
  card.className = "card";

  const left = document.createElement("div");
  left.className = "left";
  left.innerHTML = `
    <div class="flag">${lang.flag}</div>
    <div class="meta">
      <div class="name">${lang.name}</div>
      <div class="sub">${installed ? "Kurulu • Lisans aktif" : `5 Jeton • ${OFFLINE_DURATION_LABEL}`}</div>
    </div>
  `;

  const actions = document.createElement("div");
  actions.className = "actions";

  const installBtn = document.createElement("button");
  installBtn.className = "btn" + (installed ? " done" : "");
  installBtn.type = "button";
  installBtn.innerHTML = installed
    ? `<span>✅</span><span>Kuruldu</span>`
    : `<span>⬇️</span><span>İndir</span>`;

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn danger";
  removeBtn.type = "button";
  removeBtn.textContent = "Sil";

  if (installed) {
    installBtn.disabled = true;
    if (norm(lang.code) === PIVOT) {
      removeBtn.style.display = "none";
    }
  } else {
    removeBtn.style.display = "none";
  }

  installBtn.onclick = async () => {
    if (installed) return;

    if (!navigator.onLine) {
      toast("İndirmek için internet gerekir.");
      return;
    }

    if (!nativeReady()) {
      toast("Offline bridge hazır değil.");
      return;
    }

    if (!isBaseReady(userLang)) {
      toast("Önce temel offline kurulumu tamamlayın.");
      return;
    }

    installBtn.classList.add("disabled");
    installBtn.innerHTML = `<span>⏳</span><span>Lisans kontrol…</span>`;

    try {
      const license = await activateOfflineLicense(norm(lang.code));

      if (license?.already_active) {
        toast(`${lang.name} zaten aktif. İndirme hazırlanıyor…`);
      } else {
        toast(`${lang.name} için 5 jeton düşüldü • 12 ay aktif ✅`);
      }
    } catch (e) {
      installBtn.classList.remove("disabled");
      installBtn.innerHTML = `<span>⬇️</span><span>İndir</span>`;
      toast(e?.message || "Lisans alınamadı.");
      return;
    }

    const neededPairs = installPairsForTarget(norm(lang.code)).filter((pair) => !isInstalledNative(pair));

    if (!neededPairs.length) {
      toast("Bu dil zaten cihazda hazır.");
      renderAll();
      return;
    }

    installBtn.innerHTML = `<span>⏳</span><span>İndiriliyor…</span>`;
    const ok = await installPairsWithPolling(neededPairs, lang.name);

    if (!ok) {
      installBtn.classList.remove("disabled");
      installBtn.innerHTML = `<span>⬇️</span><span>İndir</span>`;
    }

    renderAll();
  };

  removeBtn.onclick = async () => {
    if (typeof window.Offline?.uninstall !== "function") {
      toast("Silme özelliği native tarafta henüz ekli değil.");
      return;
    }

    const pairs = removablePairsForTarget(norm(lang.code));
    if (!pairs.length) {
      toast("Bu dil silinemez.");
      return;
    }

    if (!confirm(`${lang.name} dilini silmek istiyor musun?`)) return;

    pairs.forEach((pair, i) => {
      setTimeout(() => {
        uninstallNative(pair);
      }, i * 350);
    });

    toast("Silme başlatıldı ✅");
    setTimeout(() => {
      renderAll();
    }, 1000);
  };

  actions.appendChild(installBtn);
  actions.appendChild(removeBtn);

  card.appendChild(left);
  card.appendChild(actions);

  return card;
}

function renderInstalledList(userLang, q) {
  installedList.innerHTML = "";

  const items = SORTED_LANGS
    .filter((lang) => norm(lang.code) !== norm(userLang))
    .filter((lang) => isLanguageInstalledForUser(userLang, norm(lang.code)))
    .filter((lang) => {
      if (!q) return true;
      const hay = `${lang.name} ${lang.code}`.toLowerCase();
      return hay.includes(q);
    });

  countPill.textContent = `Kurulu: ${items.length}`;

  if (!items.length) {
    installedList.innerHTML = `<div class="empty">Henüz kurulu hedef dil yok.</div>`;
    return;
  }

  items.forEach((lang) => {
    installedList.appendChild(renderCard(lang, true, userLang));
  });
}

function renderAvailableList(userLang, q) {
  availableList.innerHTML = "";

  const items = SORTED_LANGS
    .filter((lang) => norm(lang.code) !== norm(userLang))
    .filter((lang) => !isLanguageInstalledForUser(userLang, norm(lang.code)))
    .filter((lang) => {
      if (!q) return true;
      const hay = `${lang.name} ${lang.code}`.toLowerCase();
      return hay.includes(q);
    });

  if (!items.length) {
    availableList.innerHTML = `<div class="empty">Başka dil bulunamadı.</div>`;
    return;
  }

  items.forEach((lang) => {
    availableList.appendChild(renderCard(lang, false, userLang));
  });
}

function renderAll() {
  const userLang = norm(sourceSelect.value || getUserLang());
  const q = String(searchInput.value || "").trim().toLowerCase();

  updatePanels();

  if (!isBaseReady(userLang)) {
    installedList.innerHTML = `<div class="empty">Önce temel offline kurulum yapılmalı.</div>`;
    availableList.innerHTML = `<div class="empty">Temel kurulumdan sonra ek diller açılır.</div>`;
    countPill.textContent = `Kurulu: 0`;
    return;
  }

  renderInstalledList(userLang, q);
  renderAvailableList(userLang, q);
}

sourceSelect.addEventListener("change", () => {
  setUserLang(sourceSelect.value);
  updatePanels();
  renderAll();
});

searchInput.addEventListener("input", renderAll);

installBaseBtn?.addEventListener("click", async () => {
  const userLang = norm(sourceSelect.value || getUserLang());

  if (!navigator.onLine) {
    toast("Temel kurulum için internet gerekir.");
    return;
  }

  if (!nativeReady()) {
    toast("Offline bridge hazır değil.");
    return;
  }

  installBaseBtn.classList.add("disabled");
  installBaseBtn.textContent = "Kuruluyor…";

  const ok = await installBaseLanguage(userLang);

  if (ok) {
    baseSuccessBox?.classList.remove("hide");
    baseSuccessBox.textContent = "Offline İngilizce köprü çevirisi yüklendi. Diğer dilleri indirebilirsiniz.";
    toast("Temel offline kurulum tamamlandı ✅");
  } else {
    installBaseBtn.classList.remove("disabled");
    installBaseBtn.textContent = "Temel Kurulumu Başlat";
  }

  renderAll();
});

populateSourceSelect();
updatePanels();
renderAll();
