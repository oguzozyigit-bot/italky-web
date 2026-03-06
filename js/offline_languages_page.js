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

// ✅ Sadece gerçekten elinizde olan dil kodlarını burada tut
const LANGS = [
  { code:"tr", flag:"🇹🇷", name:"Türkçe", alt:["Turkish","Türkce"] },
  { code:"en", flag:"🇬🇧", name:"English", alt:["İngilizce","Ingilizce"] },
  { code:"de", flag:"🇩🇪", name:"Deutsch", alt:["Almanca","German"] },
  { code:"fr", flag:"🇫🇷", name:"Français", alt:["Fransızca","French"] },
  { code:"it", flag:"🇮🇹", name:"Italiano", alt:["İtalyanca","Italian"] },
  { code:"es", flag:"🇪🇸", name:"Español", alt:["İspanyolca","Spanish"] },
  { code:"pt", flag:"🇵🇹", name:"Português", alt:["Portekizce","Portuguese"] },
  { code:"ru", flag:"🇷🇺", name:"Русский", alt:["Rusça","Russian"] },
  { code:"uk", flag:"🇺🇦", name:"Українська", alt:["Ukraynaca","Ukrainian"] },
  { code:"pl", flag:"🇵🇱", name:"Polski", alt:["Lehçe","Polish"] },
  { code:"nl", flag:"🇳🇱", name:"Nederlands", alt:["Dutch","Flemenkçe"] },
  { code:"sv", flag:"🇸🇪", name:"Svenska", alt:["Swedish","İsveççe"] },
  { code:"no", flag:"🇳🇴", name:"Norsk", alt:["Norwegian","Norveççe"] },
  { code:"da", flag:"🇩🇰", name:"Dansk", alt:["Danish","Danca"] },
  { code:"fi", flag:"🇫🇮", name:"Suomi", alt:["Finnish","Fince"] },
  { code:"cs", flag:"🇨🇿", name:"Čeština", alt:["Czech","Çekçe"] },
  { code:"sk", flag:"🇸🇰", name:"Slovenčina", alt:["Slovak"] },
  { code:"hu", flag:"🇭🇺", name:"Magyar", alt:["Hungarian","Macarca"] },
  { code:"ro", flag:"🇷🇴", name:"Română", alt:["Romanian","Romence"] },
  { code:"bg", flag:"🇧🇬", name:"Български", alt:["Bulgarian","Bulgarca"] },
  { code:"el", flag:"🇬🇷", name:"Ελληνικά", alt:["Greek","Yunanca"] },
  { code:"sr", flag:"🇷🇸", name:"Srpski", alt:["Serbian","Sırpça"] },
  { code:"hr", flag:"🇭🇷", name:"Hrvatski", alt:["Croatian","Hırvatça"] },
  { code:"sl", flag:"🇸🇮", name:"Slovenščina", alt:["Slovenian"] },
  { code:"bs", flag:"🇧🇦", name:"Bosanski", alt:["Bosnian","Boşnakça"] },
  { code:"mk", flag:"🇲🇰", name:"Македонски", alt:["Macedonian"] },
  { code:"sq", flag:"🇦🇱", name:"Shqip", alt:["Albanian","Arnavutça"] },
  { code:"et", flag:"🇪🇪", name:"Eesti", alt:["Estonian","Estonca"] },
  { code:"lv", flag:"🇱🇻", name:"Latviešu", alt:["Latvian","Letonca"] },
  { code:"lt", flag:"🇱🇹", name:"Lietuvių", alt:["Lithuanian","Litvanca"] },
  { code:"ar", flag:"🇸🇦", name:"العربية", alt:["Arabic","Arapça"] },
  { code:"fa", flag:"🇮🇷", name:"فارسی", alt:["Persian","Farsça"] },
  { code:"he", flag:"🇮🇱", name:"עברית", alt:["Hebrew","İbranice"] },
  { code:"ur", flag:"🇵🇰", name:"اردو", alt:["Urdu"] },
  { code:"hi", flag:"🇮🇳", name:"हिन्दी", alt:["Hindi"] },
  { code:"bn", flag:"🇧🇩", name:"বাংলা", alt:["Bengali","Bangla"] },
  { code:"ta", flag:"🇮🇳", name:"தமிழ்", alt:["Tamil"] },
  { code:"te", flag:"🇮🇳", name:"తెలుగు", alt:["Telugu"] },
  { code:"mr", flag:"🇮🇳", name:"मराठी", alt:["Marathi"] },
  { code:"gu", flag:"🇮🇳", name:"ગુજરાતી", alt:["Gujarati"] },
  { code:"ne", flag:"🇳🇵", name:"नेपाली", alt:["Nepali"] },
  { code:"si", flag:"🇱🇰", name:"සිංහල", alt:["Sinhala"] },
  { code:"zh", flag:"🇨🇳", name:"中文", alt:["Chinese","Çince","Mandarin"] },
  { code:"ja", flag:"🇯🇵", name:"日本語", alt:["Japanese","Japonca"] },
  { code:"ko", flag:"🇰🇷", name:"한국어", alt:["Korean","Korece"] },
  { code:"th", flag:"🇹🇭", name:"ไทย", alt:["Thai","Tayca"] },
  { code:"vi", flag:"🇻🇳", name:"Tiếng Việt", alt:["Vietnamese","Vietnamca"] },
  { code:"id", flag:"🇮🇩", name:"Bahasa Indonesia", alt:["Indonesian","Endonezce"] },
  { code:"ms", flag:"🇲🇾", name:"Bahasa Melayu", alt:["Malay","Malayca"] },
  { code:"fil", flag:"🇵🇭", name:"Filipino", alt:["Tagalog"] },
  { code:"mn", flag:"🇲🇳", name:"Монгол", alt:["Mongolian","Moğolca"] },
  { code:"kk", flag:"🇰🇿", name:"Қазақша", alt:["Kazakh","Kazakça"] },
  { code:"ky", flag:"🇰🇬", name:"Кыргызча", alt:["Kyrgyz","Kırgızca"] },
  { code:"uz", flag:"🇺🇿", name:"Oʻzbek", alt:["Uzbek","Özbekçe"] },
  { code:"tk", flag:"🇹🇲", name:"Türkmen", alt:["Turkmen","Türkmence"] },
  { code:"tg", flag:"🇹🇯", name:"Тоҷикӣ", alt:["Tajik","Tacikçe"] },
  { code:"az", flag:"🇦🇿", name:"Azərbaycanca", alt:["Azerbaijani","Azerice"] },
  { code:"ka", flag:"🇬🇪", name:"ქართული", alt:["Georgian","Gürcüce"] },
  { code:"hy", flag:"🇦🇲", name:"Հայերեն", alt:["Armenian","Ermenice"] },
  { code:"sw", flag:"🇰🇪", name:"Kiswahili", alt:["Swahili"] },
  { code:"am", flag:"🇪🇹", name:"አማርኛ", alt:["Amharic"] },
  { code:"af", flag:"🇿🇦", name:"Afrikaans", alt:["Afrikanca"] },
  { code:"ca", flag:"🇪🇸", name:"Català", alt:["Catalan","Katalanca"] },
  { code:"eu", flag:"🇪🇸", name:"Euskara", alt:["Basque","Baskça"] },
  { code:"gl", flag:"🇪🇸", name:"Galego", alt:["Galician"] },
  { code:"is", flag:"🇮🇸", name:"Íslenska", alt:["Icelandic","İzlandaca"] },
  { code:"ga", flag:"🇮🇪", name:"Gaeilge", alt:["Irish","İrlandaca"] },
  { code:"cy", flag:"🇬🇧", name:"Cymraeg", alt:["Welsh","Galce"] }
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

// ✅ Gerçek paket mantığı
function packageSetForConversation(sourceCode, targetCode) {
  const source = norm(sourceCode);
  const target = norm(targetCode);

  if (!SUPPORTED_CODES.has(source) || !SUPPORTED_CODES.has(target)) return [];
  if (source === target) return [];

  // source veya target English ise paket sayısı azalır
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

function matchesInstalledSearch(group, q) {
  if (!q) return true;
  const source = langByCode(group.source);
  const target = langByCode(group.target);

  const hay = [
    group.source,
    group.target,
    source?.name || "",
    target?.name || "",
    ...(source?.alt || []),
    ...(target?.alt || [])
  ].join(" ").toLowerCase();

  return hay.includes(q.toLowerCase());
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
  const q = String(searchInput.value || "").trim();
  const items = loadInstalledCombos().filter(x => matchesInstalledSearch(x, q));

  countPill.textContent = `Kurulu: ${items.length}`;
  installedList.innerHTML = "";

  if (!items.length) {
    installedList.innerHTML = `<div class="empty">Henüz kurulu konuşma paketi yok.</div>`;
    return;
  }

  items.forEach(item => {
    const s = langByCode(item.source);
    const t = langByCode(item.target);

    const installed = item.packs.every(pair => isInstalledNative(pair));

    const card = document.createElement("div");
    card.className = "card";

    const left = document.createElement("div");
    left.className = "left";
    left.innerHTML = `
      <div class="flag">${s?.flag || "🌐"}</div>
      <div class="meta">
        <div class="name">${s?.name || item.source} → ${t?.name || item.target}</div>
        <div class="sub">${item.packs.join(" • ")}${installed ? " • Kurulu" : " • Eksik dosya var"}</div>
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
