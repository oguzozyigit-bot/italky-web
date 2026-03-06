// FILE: /js/offline_languages_page.js
import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

mountShell({ scroll: "auto" });

const BUCKET = "offline";
const PIVOT = "en";
const USER_LANG_KEY = "italky_user_lang_v1";

const PRIORITY_CODES = ["en", "de", "fr", "it", "es", "tr"];

const $ = (id) => document.getElementById(id);

const toastEl = $("toast");
const sourceSelect = $("sourceSelect");
const installedList = $("installedList");
const availableList = $("availableList");
const searchInput = $("searchInput");
const countPill = $("countPill");
const netPill = $("netPill");

function toast(msg) {
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1900);
}

function norm(v) {
  return String(v || "").trim().toLowerCase().replaceAll("_", "-");
}

function publicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

function pairPath(pair) {
  return `langpacks/${pair}/model.zip`;
}

function netPaint() {
  netPill.innerHTML = navigator.onLine ? `Ağ: <b>ONLINE</b>` : `Ağ: <b>OFFLINE</b>`;
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

// İsimler şimdilik Türkçe
const LANGS = [
  { code:"tr", flag:"🇹🇷", name:"Türkçe" },
  { code:"en", flag:"🇬🇧", name:"İngilizce" },
  { code:"de", flag:"🇩🇪", name:"Almanca" },
  { code:"fr", flag:"🇫🇷", name:"Fransızca" },
  { code:"it", flag:"🇮🇹", name:"İtalyanca" },
  { code:"es", flag:"🇪🇸", name:"İspanyolca" },
  { code:"pt", flag:"🇵🇹", name:"Portekizce" },
  { code:"ru", flag:"🇷🇺", name:"Rusça" },
  { code:"uk", flag:"🇺🇦", name:"Ukraynaca" },
  { code:"pl", flag:"🇵🇱", name:"Lehçe" },
  { code:"nl", flag:"🇳🇱", name:"Flemenkçe" },
  { code:"sv", flag:"🇸🇪", name:"İsveççe" },
  { code:"no", flag:"🇳🇴", name:"Norveççe" },
  { code:"da", flag:"🇩🇰", name:"Danca" },
  { code:"fi", flag:"🇫🇮", name:"Fince" },
  { code:"cs", flag:"🇨🇿", name:"Çekçe" },
  { code:"sk", flag:"🇸🇰", name:"Slovakça" },
  { code:"hu", flag:"🇭🇺", name:"Macarca" },
  { code:"ro", flag:"🇷🇴", name:"Romence" },
  { code:"bg", flag:"🇧🇬", name:"Bulgarca" },
  { code:"el", flag:"🇬🇷", name:"Yunanca" },
  { code:"sr", flag:"🇷🇸", name:"Sırpça" },
  { code:"hr", flag:"🇭🇷", name:"Hırvatça" },
  { code:"sl", flag:"🇸🇮", name:"Slovence" },
  { code:"bs", flag:"🇧🇦", name:"Boşnakça" },
  { code:"mk", flag:"🇲🇰", name:"Makedonca" },
  { code:"sq", flag:"🇦🇱", name:"Arnavutça" },
  { code:"et", flag:"🇪🇪", name:"Estonca" },
  { code:"lv", flag:"🇱🇻", name:"Letonca" },
  { code:"lt", flag:"🇱🇹", name:"Litvanca" },
  { code:"ar", flag:"🇸🇦", name:"Arapça" },
  { code:"fa", flag:"🇮🇷", name:"Farsça" },
  { code:"he", flag:"🇮🇱", name:"İbranice" },
  { code:"ur", flag:"🇵🇰", name:"Urduca" },
  { code:"hi", flag:"🇮🇳", name:"Hintçe" },
  { code:"bn", flag:"🇧🇩", name:"Bengalce" },
  { code:"ta", flag:"🇮🇳", name:"Tamilce" },
  { code:"te", flag:"🇮🇳", name:"Teluguca" },
  { code:"mr", flag:"🇮🇳", name:"Marathice" },
  { code:"gu", flag:"🇮🇳", name:"Guceratça" },
  { code:"ne", flag:"🇳🇵", name:"Nepalce" },
  { code:"si", flag:"🇱🇰", name:"Sinhalaca" },
  { code:"zh", flag:"🇨🇳", name:"Çince" },
  { code:"ja", flag:"🇯🇵", name:"Japonca" },
  { code:"ko", flag:"🇰🇷", name:"Korece" },
  { code:"th", flag:"🇹🇭", name:"Tayca" },
  { code:"vi", flag:"🇻🇳", name:"Vietnamca" },
  { code:"id", flag:"🇮🇩", name:"Endonezce" },
  { code:"ms", flag:"🇲🇾", name:"Malayca" },
  { code:"fil", flag:"🇵🇭", name:"Filipince" },
  { code:"mn", flag:"🇲🇳", name:"Moğolca" },
  { code:"kk", flag:"🇰🇿", name:"Kazakça" },
  { code:"ky", flag:"🇰🇬", name:"Kırgızca" },
  { code:"uz", flag:"🇺🇿", name:"Özbekçe" },
  { code:"tk", flag:"🇹🇲", name:"Türkmence" },
  { code:"tg", flag:"🇹🇯", name:"Tacikçe" },
  { code:"az", flag:"🇦🇿", name:"Azerice" },
  { code:"ka", flag:"🇬🇪", name:"Gürcüce" },
  { code:"hy", flag:"🇦🇲", name:"Ermenice" },
  { code:"sw", flag:"🇰🇪", name:"Svahili" },
  { code:"am", flag:"🇪🇹", name:"Amharca" },
  { code:"af", flag:"🇿🇦", name:"Afrikanca" },
  { code:"ca", flag:"🇪🇸", name:"Katalanca" },
  { code:"eu", flag:"🇪🇸", name:"Baskça" },
  { code:"gl", flag:"🇪🇸", name:"Galiçyaca" },
  { code:"is", flag:"🇮🇸", name:"İzlandaca" },
  { code:"ga", flag:"🇮🇪", name:"İrlandaca" },
  { code:"cy", flag:"🇬🇧", name:"Galce" }
];

const SUPPORTED_CODES = new Set(LANGS.map(x => norm(x.code)));

function langByCode(code) {
  return LANGS.find(x => norm(x.code) === norm(code));
}

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

function populateSourceSelect() {
  sourceSelect.innerHTML = SORTED_LANGS.map(lang => {
    return `<option value="${lang.code}">${lang.flag} ${lang.name}</option>`;
  }).join("");

  const current = getUserLang();
  if (SUPPORTED_CODES.has(current)) sourceSelect.value = current;
}

function ensureBaseInstalled(userLang) {
  // Kullanıcının dili EN değilse temel paketi sadece bir kez gerekir
  if (userLang === PIVOT) return [];
  return [`${userLang}-${PIVOT}`, `${PIVOT}-${userLang}`];
}

function targetPackages(targetLang) {
  if (targetLang === PIVOT) return [];
  return [`${targetLang}-${PIVOT}`, `${PIVOT}-${targetLang}`];
}

function isTargetInstalled(userLang, targetLang) {
  const basePairs = ensureBaseInstalled(userLang);
  const targetPairs = targetPackages(targetLang);

  const baseOk = basePairs.every(pair => isInstalledNative(pair));
  const targetOk = targetPairs.every(pair => isInstalledNative(pair));

  if (targetLang === PIVOT) return baseOk;
  return baseOk && targetOk;
}

function installTargetLanguage(userLang, targetLang) {
  const basePairs = ensureBaseInstalled(userLang);
  const targetPairs = targetPackages(targetLang);

  const needed = [];

  basePairs.forEach(pair => {
    if (!isInstalledNative(pair)) needed.push(pair);
  });

  targetPairs.forEach(pair => {
    if (!isInstalledNative(pair)) needed.push(pair);
  });

  return [...new Set(needed)];
}

function removablePairsForTarget(userLang, targetLang) {
  // Benim dilim asla silinmez
  // EN hedefse bir şey silmeyelim, temel dil paketi kalmalı
  if (targetLang === PIVOT) return [];
  return targetPackages(targetLang);
}

function loadInstalledTargets() {
  try {
    const raw = localStorage.getItem("italky_installed_targets_v1");
    const arr = JSON.parse(raw || "{}");
    return arr && typeof arr === "object" ? arr : {};
  } catch {
    return {};
  }
}

function saveInstalledTargets(map) {
  localStorage.setItem("italky_installed_targets_v1", JSON.stringify(map));
}

function markTargetInstalled(userLang, targetLang) {
  const all = loadInstalledTargets();
  const key = norm(userLang);
  const old = Array.isArray(all[key]) ? all[key] : [];
  if (!old.includes(norm(targetLang))) old.push(norm(targetLang));
  all[key] = old;
  saveInstalledTargets(all);
}

function unmarkTargetInstalled(userLang, targetLang) {
  const all = loadInstalledTargets();
  const key = norm(userLang);
  const old = Array.isArray(all[key]) ? all[key] : [];
  all[key] = old.filter(x => x !== norm(targetLang));
  saveInstalledTargets(all);
}

function installedTargetsForUser(userLang) {
  const all = loadInstalledTargets();
  return Array.isArray(all[norm(userLang)]) ? all[norm(userLang)] : [];
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
      <div class="sub">${installed ? "Kurulu" : "İndirilebilir"}</div>
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

    const neededPairs = installTargetLanguage(userLang, norm(lang.code));
    if (!neededPairs.length) {
      toast("Bu dil zaten hazır.");
      markTargetInstalled(userLang, norm(lang.code));
      renderAll();
      return;
    }

    const urls = neededPairs.map(pair => ({
      pair,
      url: publicUrl(pairPath(pair))
    }));

    const missing = urls.filter(x => !x.url);
    if (missing.length) {
      toast(`Eksik dosya: ${missing.map(x => x.pair).join(", ")}`);
      return;
    }

    installBtn.classList.add("disabled");
    installBtn.innerHTML = `<span>⏳</span><span>İndiriliyor…</span>`;

    urls.forEach((item, i) => {
      setTimeout(() => installNative(item.pair, item.url), i * 650);
    });

    const started = Date.now();
    const poll = setInterval(() => {
      const ok = neededPairs.every(pair => isInstalledNative(pair));

      if (ok) {
        clearInterval(poll);
        markTargetInstalled(userLang, norm(lang.code));
        toast(`${lang.name} kuruldu ✅`);
        renderAll();
        return;
      }

      if (Date.now() - started > 60000) {
        clearInterval(poll);
        toast("Kurulum sürüyor… dosya büyük olabilir.");
        renderAll();
      }
    }, 2200);
  };

  removeBtn.onclick = async () => {
    if (typeof window.Offline?.uninstall !== "function") {
      toast("Silme özelliği native tarafta henüz ekli değil.");
      return;
    }

    const pairs = removablePairsForTarget(userLang, norm(lang.code));
    if (!pairs.length) {
      toast("Bu dil silinemez.");
      return;
    }

    if (!confirm(`${lang.name} dilini silmek istiyor musun?`)) return;

    pairs.forEach((pair, i) => {
      setTimeout(() => uninstallNative(pair), i * 350);
    });

    unmarkTargetInstalled(userLang, norm(lang.code));
    toast("Silme başlatıldı ✅");
    setTimeout(renderAll, 1000);
  };

  actions.appendChild(installBtn);
  actions.appendChild(removeBtn);

  card.appendChild(left);
  card.appendChild(actions);

  return card;
}

function renderInstalledList(userLang, q) {
  installedList.innerHTML = "";

  const installedTargets = installedTargetsForUser(userLang)
    .filter(code => code !== norm(userLang))
    .map(code => langByCode(code))
    .filter(Boolean)
    .filter(lang => {
      if (!q) return true;
      const hay = `${lang.name} ${lang.code}`.toLowerCase();
      return hay.includes(q);
    })
    .sort(compareLangs);

  countPill.textContent = `Kurulu: ${installedTargets.length}`;

  if (!installedTargets.length) {
    installedList.innerHTML = `<div class="empty">Henüz kurulu hedef dil yok.</div>`;
    return;
  }

  installedTargets.forEach(lang => {
    installedList.appendChild(renderCard(lang, true, userLang));
  });
}

function renderAvailableList(userLang, q) {
  availableList.innerHTML = "";

  const installedSet = new Set(installedTargetsForUser(userLang).map(norm));

  const available = SORTED_LANGS
    .filter(lang => norm(lang.code) !== norm(userLang))
    .filter(lang => !installedSet.has(norm(lang.code)))
    .filter(lang => {
      if (!q) return true;
      const hay = `${lang.name} ${lang.code}`.toLowerCase();
      return hay.includes(q);
    });

  if (!available.length) {
    availableList.innerHTML = `<div class="empty">Başka dil bulunamadı.</div>`;
    return;
  }

  available.forEach(lang => {
    availableList.appendChild(renderCard(lang, false, userLang));
  });
}

function renderAll() {
  const userLang = norm(sourceSelect.value || getUserLang());
  const q = String(searchInput.value || "").trim().toLowerCase();

  renderInstalledList(userLang, q);
  renderAvailableList(userLang, q);
}

sourceSelect.addEventListener("change", () => {
  setUserLang(sourceSelect.value);
  renderAll();
});

searchInput.addEventListener("input", renderAll);

populateSourceSelect();
renderAll();
