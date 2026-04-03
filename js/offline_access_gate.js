// FILE: /js/offline_access_gate.js

import { supabase } from "/js/supabase_client.js";

const FREE_LANGS = new Set(["tr", "en"]);
const PACK_PRICE = 5;
const PACK_YEARS_TEXT = "12 ay";

function $(id) {
  return document.getElementById(id);
}

function ensureOfflineGateStyles() {
  if (document.getElementById("offlineGateStyles")) return;

  const style = document.createElement("style");
  style.id = "offlineGateStyles";
  style.textContent = `
    .og-backdrop{
      position:fixed;
      inset:0;
      z-index:1000000;
      background:rgba(2,4,12,.72);
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
      display:none;
      align-items:center;
      justify-content:center;
      padding:18px;
    }

    .og-backdrop.show{
      display:flex;
    }

    .og-card{
      width:min(100%,430px);
      border-radius:30px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.12);
      background:linear-gradient(180deg, rgba(10,12,26,.98), rgba(6,8,20,.98));
      box-shadow:0 28px 90px rgba(0,0,0,.42);
      color:#fff;
      font-family:Outfit, system-ui, sans-serif;
    }

    .og-top{
      padding:20px 20px 16px;
      background:linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%);
    }

    .og-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:34px;
      padding:8px 14px;
      border-radius:999px;
      background:rgba(255,255,255,.16);
      border:1px solid rgba(255,255,255,.18);
      color:#fff;
      font-size:12px;
      font-weight:1000;
    }

    .og-title{
      margin:14px 0 6px;
      font-size:28px;
      line-height:1.08;
      font-weight:1000;
      color:#fff;
      letter-spacing:-.6px;
    }

    .og-sub{
      margin:0;
      font-size:14px;
      line-height:1.55;
      font-weight:800;
      color:rgba(255,255,255,.90);
    }

    .og-body{
      padding:18px;
      display:grid;
      gap:12px;
    }

    .og-info{
      border-radius:20px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      padding:14px;
    }

    .og-label{
      font-size:11px;
      font-weight:1000;
      color:rgba(255,255,255,.50);
      text-transform:uppercase;
      letter-spacing:.8px;
      margin-bottom:5px;
    }

    .og-value{
      font-size:20px;
      font-weight:1000;
      color:#fff;
      line-height:1.15;
    }

    .og-desc{
      margin:2px 0 0;
      font-size:12px;
      line-height:1.45;
      font-weight:800;
      color:rgba(255,255,255,.62);
    }

    .og-actions{
      display:grid;
      gap:10px;
      margin-top:2px;
    }

    .og-btn{
      min-height:54px;
      border:none;
      border-radius:18px;
      cursor:pointer;
      font-size:15px;
      font-weight:1000;
      transition:transform .16s ease;
    }

    .og-btn:active{
      transform:scale(.985);
    }

    .og-btn.primary{
      color:#fff;
      background:linear-gradient(135deg, rgba(255,140,40,.92), rgba(255,84,201,.88));
      box-shadow:0 14px 34px rgba(255,140,40,.24);
    }

    .og-btn.secondary{
      color:#fff;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.10);
    }
  `;
  document.head.appendChild(style);
}

function buildModalIfNeeded() {
  ensureOfflineGateStyles();
  if ($("offlineGateModal")) return;

  const wrap = document.createElement("div");
  wrap.className = "og-backdrop";
  wrap.id = "offlineGateModal";
  wrap.innerHTML = `
    <div class="og-card">
      <div class="og-top">
        <div class="og-chip">italkyAI • Offline Dil Paketi</div>
        <div class="og-title" id="ogTitle">Bu dil paketi için 5 jeton lazım</div>
        <p class="og-sub" id="ogSub">Seçilen dil için offline erişim 12 ay açılır.</p>
      </div>

      <div class="og-body">
        <div class="og-info">
          <div class="og-label">Erişim modeli</div>
          <div class="og-value">5 Jeton • 12 Ay</div>
          <p class="og-desc">Türkçe ve İngilizce ücretsizdir. Diğer diller tek tek uzun süreli açılır.</p>
        </div>

        <div class="og-info">
          <div class="og-label">Süre</div>
          <div class="og-value">12 Ay Aktif</div>
          <p class="og-desc">Bir kez açıldığında aynı dil için tekrar jeton istemez.</p>
        </div>

        <div class="og-actions">
          <button class="og-btn primary" id="ogGoMarketBtn">Jeton Market’e Git</button>
          <button class="og-btn secondary" id="ogCloseBtn">Şimdilik Kapat</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  $("ogGoMarketBtn")?.addEventListener("click", () => {
    location.href = "/pages/jetonbuy.html";
  });

  $("ogCloseBtn")?.addEventListener("click", closeOfflineGateModal);

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeOfflineGateModal();
  });
}

export function openOfflineGateModal(options = {}) {
  buildModalIfNeeded();

  const {
    title = "Bu dil paketi için 5 jeton lazım",
    message = "Seçilen dil için offline erişim 12 ay açılır."
  } = options;

  if ($("ogTitle")) $("ogTitle").textContent = title;
  if ($("ogSub")) $("ogSub").textContent = message;
  $("offlineGateModal")?.classList.add("show");
}

export function closeOfflineGateModal() {
  $("offlineGateModal")?.classList.remove("show");
}

export async function ensureOfflineLangAccess(lang = "") {
  const code = String(lang || "").trim().toLowerCase();

  if (!code) {
    return {
      ok: false,
      access_open: false,
      reason: "LANG_REQUIRED"
    };
  }

  if (FREE_LANGS.has(code)) {
    return {
      ok: true,
      access_open: true,
      reason: "free_lang"
    };
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const user = session?.user || null;
  if (!user?.id) {
    location.replace("/pages/login.html");
    return {
      ok: false,
      access_open: false,
      reason: "no_session"
    };
  }

  try {
    const { data, error } = await supabase.rpc("ensure_offline_lang_access", {
      p_user_id: user.id,
      p_lang: code
    });

    if (error) {
      console.error("[offline_access_gate] rpc error:", error);
      return {
        ok: false,
        access_open: false,
        reason: "rpc_error",
        error
      };
    }

    const json = data || null;

    if (!json) {
      return {
        ok: false,
        access_open: false,
        reason: "empty_response"
      };
    }

    if (!json.ok && json.reason === "INSUFFICIENT_TOKENS") {
      openOfflineGateModal({
        title: "Bu dil paketi için 5 jeton lazım",
        message: `Bu dili offline kullanmak için ${PACK_PRICE} jeton gerekir. Açılınca ${PACK_YEARS_TEXT} boyunca aktif kalır.`
      });
      return {
        ok: false,
        access_open: false,
        reason: "INSUFFICIENT_TOKENS",
        data: json
      };
    }

    if (!json.ok) {
      return {
        ok: false,
        access_open: false,
        reason: "unknown_denied",
        data: json
      };
    }

    if (typeof json.tokens_after === "number" && window.setHeaderTokens) {
      try {
        window.setHeaderTokens(json.tokens_after);
      } catch {}
    }

    return {
      ok: true,
      access_open: true,
      reason: json.used_token ? "offline_pack_opened" : "existing_offline_pack_active",
      data: json
    };
  } catch (e) {
    console.error("[offline_access_gate] exception:", e);
    return {
      ok: false,
      access_open: false,
      reason: "exception",
      error: e
    };
  }
}
