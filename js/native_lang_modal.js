// FILE: /js/native_lang_modal.js
// Ana konuşma dili seçim popup'ı — tüm sayfalarda ui_shell.js tarafından çağrılır

const NLM_LANGS = [
  { code: "tr", name: "Türkçe",     flag: "🇹🇷" },
  { code: "en", name: "English",    flag: "🇺🇸" },
  { code: "de", name: "Deutsch",    flag: "🇩🇪" },
  { code: "fr", name: "Français",   flag: "🇫🇷" },
  { code: "es", name: "Español",    flag: "🇪🇸" },
  { code: "ar", name: "العربية",    flag: "🇸🇦" },
  { code: "ru", name: "Русский",    flag: "🇷🇺" },
  { code: "ja", name: "日本語",      flag: "🇯🇵" },
  { code: "zh", name: "中文",        flag: "🇨🇳" },
  { code: "ko", name: "한국어",      flag: "🇰🇷" },
  { code: "pt", name: "Português",  flag: "🇵🇹" },
  { code: "it", name: "Italiano",   flag: "🇮🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski",     flag: "🇵🇱" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "az", name: "Azərbaycan", flag: "🇦🇿" },
  { code: "fa", name: "فارسی",      flag: "🇮🇷" },
  { code: "id", name: "Indonesia",  flag: "🇮🇩" },
  { code: "hi", name: "हिन्दी",     flag: "🇮🇳" },
  { code: "sv", name: "Svenska",    flag: "🇸🇪" },
];

const NLM_CSS = `
#italky-nlm{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(8,16,46,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:nlm-bg .3s ease}
#italky-nlm .nlm-card{background:#fff;border-radius:22px;box-shadow:0 32px 90px rgba(8,16,80,.45);width:92%;max-width:450px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;animation:nlm-up .32s cubic-bezier(.22,1,.36,1)}
#italky-nlm .nlm-head{background:linear-gradient(140deg,#0b1b52 0%,#1440a0 55%,#2563eb 100%);padding:26px 24px 20px;color:#fff;text-align:center;flex-shrink:0}
#italky-nlm .nlm-head .nlm-brand{font-size:11px;font-weight:700;letter-spacing:3px;opacity:.65;text-transform:uppercase;margin-bottom:10px}
#italky-nlm .nlm-head .nlm-brand span{color:#60a5fa}
#italky-nlm .nlm-head h2{font-size:19px;font-weight:700;margin:0 0 5px;letter-spacing:-.3px}
#italky-nlm .nlm-head p{font-size:12.5px;opacity:.72;margin:0}
#italky-nlm .nlm-list{overflow-y:auto;padding:14px;flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;-webkit-overflow-scrolling:touch}
#italky-nlm .nlm-list::-webkit-scrollbar{width:4px}
#italky-nlm .nlm-list::-webkit-scrollbar-track{background:transparent}
#italky-nlm .nlm-list::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px}
#italky-nlm .nlm-btn{display:flex;align-items:center;gap:9px;padding:10px 12px;border:2px solid #e5e7eb;border-radius:11px;background:#fff;cursor:pointer;transition:border-color .15s,background .15s,color .15s;font-size:13.5px;color:#1f2937;width:100%;text-align:left}
#italky-nlm .nlm-btn .nlm-flag{font-size:20px;line-height:1;flex-shrink:0}
#italky-nlm .nlm-btn .nlm-name{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#italky-nlm .nlm-btn:hover{border-color:#2563eb;background:#eff6ff}
#italky-nlm .nlm-btn.active{border-color:#0b1b52;background:#0b1b52;color:#fff}
#italky-nlm .nlm-btn.active .nlm-check{margin-left:auto;flex-shrink:0;color:#60a5fa;font-weight:700}
#italky-nlm .nlm-foot{padding:14px 20px 18px;border-top:1px solid #f3f4f6;flex-shrink:0}
#italky-nlm .nlm-confirm{width:100%;padding:14px;background:linear-gradient(135deg,#0b1b52,#1e40af,#2563eb);color:#fff;border:none;border-radius:13px;font-size:15.5px;font-weight:700;cursor:pointer;letter-spacing:.3px;transition:opacity .18s,transform .18s;display:flex;align-items:center;justify-content:center;gap:8px}
#italky-nlm .nlm-confirm:hover{opacity:.92;transform:translateY(-1px)}
#italky-nlm .nlm-confirm:active{transform:translateY(0)}
#italky-nlm .nlm-confirm:disabled{opacity:.6;cursor:default;transform:none}
#italky-nlm .nlm-hint{text-align:center;font-size:11.5px;color:#9ca3af;margin-top:9px}
@keyframes nlm-bg{from{opacity:0}to{opacity:1}}
@keyframes nlm-up{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}
`;

export function showNativeLangModal({ supabase, userId, onComplete } = {}) {
  if (document.getElementById("italky-nlm")) return;

  // CSS enjekte et
  if (!document.getElementById("italky-nlm-css")) {
    const s = document.createElement("style");
    s.id = "italky-nlm-css";
    s.textContent = NLM_CSS;
    document.head.appendChild(s);
  }

  let selected = "tr";

  function renderList() {
    return NLM_LANGS.map(l => `
      <button class="nlm-btn${selected === l.code ? " active" : ""}" data-code="${l.code}">
        <span class="nlm-flag">${l.flag}</span>
        <span class="nlm-name">${l.name}</span>
        ${selected === l.code ? '<span class="nlm-check">✓</span>' : ""}
      </button>
    `).join("");
  }

  const wrap = document.createElement("div");
  wrap.id = "italky-nlm";
  wrap.innerHTML = `
    <div class="nlm-card">
      <div class="nlm-head">
        <div class="nlm-brand">italky<span>AI</span></div>
        <h2>Ana Konuşma Dilinizi Seçin</h2>
        <p>Offline çeviri ve uygulama deneyimi için ana dilinizi belirleyin</p>
      </div>
      <div class="nlm-list" id="nlm-list-inner">${renderList()}</div>
      <div class="nlm-foot">
        <button class="nlm-confirm" id="nlm-confirm-btn">
          Devam Et &nbsp;→
        </button>
        <p class="nlm-hint">Seçilen dil arka planda otomatik olarak hazırlanır</p>
      </div>
    </div>
  `;

  document.body.appendChild(wrap);

  // Dil seçimi
  wrap.querySelector("#nlm-list-inner").addEventListener("click", e => {
    const btn = e.target.closest(".nlm-btn");
    if (!btn) return;
    selected = btn.dataset.code;
    wrap.querySelector("#nlm-list-inner").innerHTML = renderList();
  });

  // Devam Et
  wrap.querySelector("#nlm-confirm-btn").addEventListener("click", async () => {
    const btn = wrap.querySelector("#nlm-confirm-btn");
    btn.disabled = true;
    btn.innerHTML = "Kaydediliyor…";

    // 1. localStorage
    try {
      localStorage.setItem("italky_native_lang_v7", selected);
      localStorage.setItem("italky_native_lang_confirmed", "1");
    } catch {}

    // 2. Supabase profiles
    try {
      if (supabase && userId) {
        await supabase.from("profiles").update({ native_lang: selected }).eq("id", userId);
      }
    } catch (e) { console.warn("nlm supabase:", e); }

    // 3. Android bridge — dil tercihi + offline indirme tetikle
    try { window.OfflineTranslate?.setNativeOfflineLang?.(selected); } catch {}
    try {
      const pair = JSON.stringify({ source: selected, target: "en" });
      window.OfflineTranslate?.downloadBiDirectionalPair?.(pair);
    } catch {}

    // 4. Offline languages page için event
    try {
      window.dispatchEvent(new CustomEvent("italky-native-lang-selected", {
        detail: { lang: selected }
      }));
    } catch {}

    // 5. Callback
    if (typeof onComplete === "function") onComplete(selected);

    // Kapat
    wrap.style.animation = "nlm-bg .25s ease reverse forwards";
    setTimeout(() => wrap.remove(), 260);
  });
}
