// FILE: /js/offline_languages_page.js
import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

mountShell({ scroll: "auto" });

const BUCKET = "offline";
const PIVOT = "en";

const $ = (id) => document.getElementById(id);

const toastEl = $("toast");
const sourceSelect = $("sourceSelect");
const targetSelect = $("targetSelect");
const packsPreview = $("packsPreview");
const installBtn = $("installBtn");
const removeBtn = $("removeBtn");
const installedList = $("installedList");
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

// ✅ Şu an isimler Türkçe
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

function populateSelects() {
  const options = LANGS.map(lang => {
    const label = `${lang.flag} ${lang.name} (${lang.code})`;
    return `<option value="${lang.code}">${label}</option>`;
  }).join("");

  sourceSelect.innerHTML = options;
  targetSelect.innerHTML = options;

  sourceSelect.value = "tr";
  targetSelect.value = "en";
}

function unique(arr) {
  return [...new Set(arr)];
}

// ✅ Çift yön konuşma için gereken paket seti
function packageSetForConversation(sourceCode, targetCode) {
  const source = norm(sourceCode);
  const target = norm(targetCode);

  if (!SUPPORTED_CODES.has(source) || !SUPPORTED_CODES.has(target)) return [];
  if (source === target) return [];

  if (source === PIVOT) {
    return unique([
      `${PIVOT}-${target}`,
      `${target}-${PIVOT}`
    ]);
  }

  if (target === PIVOT) {
    return unique([
      `${source}-${PIVOT}`,
      `${PIVOT}-${source}`
    ]);
  }

  return unique([
    `${source}-${PIVOT}`,
    `${PIVOT}-${source}`,
    `${target}-${PIVOT}`,
    `${PIVOT}-${target}`
  ]);
}

function renderPacksPreview() {
  const packs = packageSetForConversation(sourceSelect.value, targetSelect.value);
  packsPreview.innerHTML = "";

  if (!packs.length) {
    packsPreview.innerHTML = `<div class="packChip">Geçerli iki farklı dil seç.</div>`;
    return packs;
  }

  packs.forEach(pack => {
    const chip = document.createElement("div");
    chip.className = "packChip";
    chip.textContent = pack;
    packsPreview.appendChild(chip);
  });

  return packs;
}

function allInstalled(packs) {
  return packs.every(pair => isInstalledNative(pair));
}

function loadInstalledCombos() {
  try {
    const raw = localStorage.getItem("italky_offline_conversations_v1");
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveInstalledCombos(items) {
  localStorage.setItem("italky_offline_conversations_v1", JSON.stringify(items));
}

function comboKey(source, target) {
  return `${norm(source)}__${norm(target)}`;
}

function upsertInstalledCombo(source, target, packs) {
  const items = loadInstalledCombos();
  const key = comboKey(source, target);

  const next = items.filter(x => x.key !== key);
  next.unshift({
    key,
    source: norm(source),
    target: norm(target),
    packs: unique(packs),
    updatedAt: Date.now()
  });

  saveInstalledCombos(next);
}

function removeInstalledCombo(source, target) {
  const items = loadInstalledCombos();
  const key = comboKey(source, target);
  saveInstalledCombos(items.filter(x => x.key !== key));
}

function renderInstalledList() {
  const q = String(searchInput.value || "").trim().toLowerCase();
  const items = loadInstalledCombos().filter(item => {
    if (!q) return true;
    const s = langByCode(item.source);
    const t = langByCode(item.target);
    const hay = `${s?.name || ""} ${t?.name || ""} ${item.source} ${item.target}`.toLowerCase();
    return hay.includes(q);
  });

  countPill.textContent = `Kurulu: ${items.length}`;
  installedList.innerHTML = "";

  if (!items.length) {
    installedList.innerHTML = `<div class="empty">Henüz kurulu konuşma paketi yok.</div>`;
    return;
  }

  items.forEach(item => {
    const s = langByCode(item.source);
    const t = langByCode(item.target);

    const card = document.createElement("div");
    card.className = "card";

    const left = document.createElement("div");
    left.className = "left";
    left.innerHTML = `
      <div class="flag">${s?.flag || "🌐"}</div>
      <div class="meta">
        <div class="name">${s?.name || item.source} → ${t?.name || item.target}</div>
        <div class="sub">${item.packs.join(" • ")}</div>
      </div>
    `;

    const remove = document.createElement("button");
    remove.className = "btn danger";
    remove.type = "button";
    remove.textContent = "Sil";

    remove.onclick = async () => {
      if (typeof window.Offline?.uninstall !== "function") {
        toast("Silme özelliği native tarafta henüz ekli değil.");
        return;
      }

      if (!confirm(`${s?.name || item.source} → ${t?.name || item.target} paketini silmek istiyor musun?`)) {
        return;
      }

      item.packs.forEach((pair, i) => {
        setTimeout(() => uninstallNative(pair), i * 350);
      });

      removeInstalledCombo(item.source, item.target);
      toast("Silme başlatıldı ✅");
      setTimeout(renderInstalledList, 1200);
    };

    card.appendChild(left);
    card.appendChild(remove);
    installedList.appendChild(card);
  });
}

function refreshButtons() {
  const packs = renderPacksPreview();
  const valid = packs.length > 0;
  const installed = valid && nativeReady() && allInstalled(packs);

  installBtn.disabled = !valid;
  removeBtn.disabled = !valid;

  installBtn.classList.remove("done", "disabled");
  removeBtn.classList.remove("disabled");

  if (!valid) {
    installBtn.classList.add("disabled");
    removeBtn.classList.add("disabled");
    installBtn.innerHTML = `<span>⬇️</span><span>Bu Paketi İndir</span>`;
    return;
  }

  if (installed) {
    installBtn.classList.add("done");
    installBtn.innerHTML = `<span>✅</span><span>Kuruldu</span>`;
  } else {
    installBtn.innerHTML = `<span>⬇️</span><span>Bu Paketi İndir</span>`;
  }
}

async function installCurrentSelection() {
  const source = norm(sourceSelect.value);
  const target = norm(targetSelect.value);
  const packs = packageSetForConversation(source, target);

  if (!packs.length) {
    toast("Geçerli iki farklı dil seç.");
    return;
  }

  if (!navigator.onLine) {
    toast("İndirmek için internet gerekir.");
    return;
  }

  if (!nativeReady()) {
    toast("Offline bridge hazır değil.");
    return;
  }

  const urls = packs.map(pair => ({
    pair,
    url: publicUrl(pairPath(pair))
  }));

  const missing = urls.filter(x => !x.url);
  if (missing.length) {
    toast(`Eksik dosya: ${missing.map(x => x.pair).join(", ")}`);
    return;
  }

  installBtn.classList.add("disabled");
  installBtn.innerHTML = `<span>⏳</span><span>Kurulum başlıyor…</span>`;

  urls.forEach((item, i) => {
    setTimeout(() => installNative(item.pair, item.url), i * 700);
  });

  toast("İndirme + kurulum başladı ✅");

  const started = Date.now();
  const poll = setInterval(() => {
    const ok = packs.every(pair => isInstalledNative(pair));

    if (ok) {
      clearInterval(poll);
      upsertInstalledCombo(source, target, packs);
      toast("Konuşma paketi kuruldu ✅");
      refreshButtons();
      renderInstalledList();
      return;
    }

    if (Date.now() - started > 60000) {
      clearInterval(poll);
      toast("Kurulum sürüyor… dosyalar büyük olabilir.");
      refreshButtons();
      renderInstalledList();
      return;
    }

    installBtn.innerHTML = `<span>⏳</span><span>İndiriliyor…</span>`;
  }, 2200);
}

function removeCurrentSelection() {
  const source = norm(sourceSelect.value);
  const target = norm(targetSelect.value);
  const packs = packageSetForConversation(source, target);

  if (!packs.length) {
    toast("Geçerli iki farklı dil seç.");
    return;
  }

  if (typeof window.Offline?.uninstall !== "function") {
    toast("Silme özelliği native tarafta henüz ekli değil.");
    return;
  }

  const s = langByCode(source);
  const t = langByCode(target);

  if (!confirm(`${s?.name || source} → ${t?.name || target} konuşma paketini silmek istiyor musun?`)) {
    return;
  }

  packs.forEach((pair, i) => {
    setTimeout(() => uninstallNative(pair), i * 350);
  });

  removeInstalledCombo(source, target);
  toast("Silme başlatıldı ✅");

  setTimeout(() => {
    refreshButtons();
    renderInstalledList();
  }, 1200);
}

sourceSelect.addEventListener("change", refreshButtons);
targetSelect.addEventListener("change", refreshButtons);
searchInput.addEventListener("input", renderInstalledList);
installBtn.addEventListener("click", installCurrentSelection);
removeBtn.addEventListener("click", removeCurrentSelection);

populateSelects();
refreshButtons();
renderInstalledList();
