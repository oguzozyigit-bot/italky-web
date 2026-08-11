// FILE: /js/facetoface_premium_gate.js

import { supabase } from "/js/supabase_client.js";

const JETON_PAGE_URL = "/pages/jetonbuy.html";
const SHORTS_URL = "https://italky.ai/hosgeldiniz";

function $(id) {
  return document.getElementById(id);
}

const FALLBACK_LANGS = [
  ["tr","🇹🇷","Türkçe"],["en","🇬🇧","İngilizce"],["de","🇩🇪","Almanca"],["fr","🇫🇷","Fransızca"],
  ["it","🇮🇹","İtalyanca"],["es","🇪🇸","İspanyolca"],["pt","🇵🇹","Portekizce"],["ru","🇷🇺","Rusça"],
  ["ar","🇸🇦","Arapça"],["zh","🇨🇳","Çince"],["ja","🇯🇵","Japonca"],["ko","🇰🇷","Korece"],
  ["mk","🇲🇰","Makedonca"],["sq","🇦🇱","Arnavutça"],["bs","🇧🇦","Boşnakça"],["sr","🇷🇸","Sırpça"]
];

function installFaceToFaceUiPatch() {
  const apply = () => {
    try {
      document.body?.classList.remove("drawer-open");

      const menuButton = $("f2fMenuBtn");
      const drawer = $("f2fDrawer");
      const drawerBg = $("drawerBg");
      if (menuButton) menuButton.style.setProperty("display", "none", "important");
      if (drawer) drawer.style.setProperty("display", "none", "important");
      if (drawerBg) drawerBg.style.setProperty("display", "none", "important");

      const homeLink = $("homeLink");
      const homeText = $("homeText");
      if (homeLink) {
        homeLink.setAttribute("href", SHORTS_URL);
        homeLink.setAttribute("aria-label", "Shorts");
        homeLink.setAttribute("title", "Shorts");
      }
      if (homeText) homeText.textContent = "SHORT";

      document.querySelectorAll("a,button").forEach((el) => {
        const text = String(el.textContent || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
        if (text === "kurumsal giriş" || text === "kurumsal giris") {
          el.style.setProperty("display", "none", "important");
        }
      });
    } catch {}
  };

  apply();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  }

  try {
    const observer = new MutationObserver(() => apply());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 30000);
  } catch {}

  [150, 500, 1200, 2500, 5000, 9000].forEach((ms) => window.setTimeout(apply, ms));
}

function installLanguageRecovery() {
  const setLabel = (id, code, flag, name) => {
    const el = $(id);
    if (!el) return;
    const current = String(el.textContent || "");
    if (/Dil seçiliyor|Dil seciliyor/i.test(current)) el.textContent = `${flag} ${name}`;
    try { localStorage.setItem(id === "topLangTxt" ? "f2f_top_lang" : "f2f_bot_lang", code); } catch {}
  };

  const hydrateList = (listId, side) => {
    const list = $(listId);
    if (!list || list.children.length) return;
    for (const [code, flag, name] of FALLBACK_LANGS) {
      const row = document.createElement("div");
      row.className = "pop-item";
      row.dataset.code = code;
      row.innerHTML = `<div class="pop-left"><span class="pop-flag">${flag}</span><span class="pop-name">${name}</span></div><span class="pop-code">${String(code).toUpperCase()}</span>`;
      row.addEventListener("click", () => {
        const txt = side === "top" ? $("topLangTxt") : $("botLangTxt");
        if (txt) txt.textContent = `${flag} ${name}`;
        try { localStorage.setItem(side === "top" ? "f2f_top_lang" : "f2f_bot_lang", code); } catch {}
        $(side === "top" ? "pop-top" : "pop-bot")?.classList.remove("show");
        window.location.reload();
      });
      list.appendChild(row);
    }
  };

  const recover = () => {
    setLabel("topLangTxt", "en", "🇬🇧", "İngilizce");
    setLabel("botLangTxt", "tr", "🇹🇷", "Türkçe");
    hydrateList("list-top", "top");
    hydrateList("list-bot", "bot");
  };

  [700, 1600, 3000].forEach((ms) => window.setTimeout(recover, ms));
}

installFaceToFaceUiPatch();
installLanguageRecovery();

function ensureStyles() {
  if ($("f2fPremiumGateStyles")) return;
  const style = document.createElement("style");
  style.id = "f2fPremiumGateStyles";
  style.textContent = `
    .f2f-gate-backdrop{position:fixed;inset:0;z-index:1000000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.76);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
    .f2f-gate-backdrop.show{display:flex}
    .f2f-gate-card{width:min(100%,430px);border-radius:30px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(10,12,26,.98),rgba(6,8,20,.98));box-shadow:0 28px 90px rgba(0,0,0,.42);color:#fff;font-family:Outfit,system-ui,sans-serif}
    .f2f-gate-top{padding:20px 20px 16px;background:linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%)}
    .f2f-gate-chip{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.18);font-size:12px;font-weight:1000}
    .f2f-gate-title{margin:14px 0 6px;font-size:28px;line-height:1.08;font-weight:1000}
    .f2f-gate-text{margin:0;font-size:14px;line-height:1.6;font-weight:800;color:rgba(255,255,255,.92);white-space:pre-line}
    .f2f-gate-body{padding:18px;display:grid;gap:12px}
    .f2f-gate-actions{display:grid;gap:10px}
    .f2f-gate-btn{min-height:54px;border:none;border-radius:18px;cursor:pointer;font-size:15px;font-weight:1000}
    .f2f-gate-btn.primary{color:#fff;background:linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%)}
    .f2f-gate-btn.secondary{color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10)}
  `;
  document.head.appendChild(style);
}

function ensureModal() {
  ensureStyles();
  if ($("f2fPremiumGate")) return;
  const wrap = document.createElement("div");
  wrap.className = "f2f-gate-backdrop";
  wrap.id = "f2fPremiumGate";
  wrap.innerHTML = `
    <div class="f2f-gate-card">
      <div class="f2f-gate-top">
        <div class="f2f-gate-chip">italkyAI • FaceToFace</div>
        <div class="f2f-gate-title">Giriş Gerekli</div>
        <p class="f2f-gate-text">FaceToFace kullanımı giriş yaptıktan sonra ücretsizdir.</p>
      </div>
      <div class="f2f-gate-body">
        <div class="f2f-gate-actions">
          <button class="f2f-gate-btn primary" id="f2fGatePrimary">Giriş Yap</button>
          <button class="f2f-gate-btn secondary" id="f2fGateClose">Kapat</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  $("f2fGatePrimary")?.addEventListener("click", () => location.href = "/pages/login.html");
  $("f2fGateClose")?.addEventListener("click", closeFaceToFacePremiumGate);
}

export function openFaceToFacePremiumGate() {
  ensureModal();
  $("f2fPremiumGate")?.classList.add("show");
}

export function closeFaceToFacePremiumGate() {
  $("f2fPremiumGate")?.classList.remove("show");
}

export async function getCurrentTokens() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    if (!user?.id) return null;
    const { data } = await supabase.from("profiles").select("tokens").eq("id", user.id).maybeSingle();
    return Number(data?.tokens ?? 0);
  } catch {
    return null;
  }
}

export async function ensureFaceToFacePremiumAccess() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null;
  if (!user?.id) {
    location.replace("/pages/login.html");
    return false;
  }
  return true;
}

export { JETON_PAGE_URL };
