// FILE: /js/game_access_gate.js

import { supabase } from "/js/supabase_client.js";

const FREE_GAME_CODES = new Set(["hangman"]);
const GAME_PRICE = 1;
const GAME_DAYS = 7;

function $(id) {
  return document.getElementById(id);
}

function ensureGameGateStyles() {
  if (document.getElementById("gameGateStyles")) return;

  const style = document.createElement("style");
  style.id = "gameGateStyles";
  style.textContent = `
    .gg-backdrop{
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

    .gg-backdrop.show{
      display:flex;
    }

    .gg-card{
      width:min(100%, 430px);
      border-radius:30px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,0.12);
      background:linear-gradient(180deg, rgba(10,12,26,.98), rgba(6,8,20,.98));
      box-shadow:0 28px 90px rgba(0,0,0,.42);
      color:#fff;
      font-family:Outfit, system-ui, sans-serif;
    }

    .gg-top{
      padding:20px 20px 16px;
      background:linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%);
    }

    .gg-chip{
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

    .gg-title{
      margin:14px 0 6px;
      font-size:28px;
      line-height:1.08;
      font-weight:1000;
      color:#fff;
      letter-spacing:-.6px;
    }

    .gg-sub{
      margin:0;
      font-size:14px;
      line-height:1.55;
      font-weight:800;
      color:rgba(255,255,255,.90);
      white-space:pre-line;
    }

    .gg-body{
      padding:18px;
      display:grid;
      gap:12px;
    }

    .gg-info{
      border-radius:20px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      padding:14px 14px;
    }

    .gg-label{
      font-size:11px;
      font-weight:1000;
      color:rgba(255,255,255,.50);
      text-transform:uppercase;
      letter-spacing:.8px;
      margin-bottom:5px;
    }

    .gg-value{
      font-size:20px;
      font-weight:1000;
      color:#fff;
      line-height:1.15;
    }

    .gg-desc{
      margin:2px 0 0;
      font-size:12px;
      line-height:1.45;
      font-weight:800;
      color:rgba(255,255,255,.62);
    }

    .gg-actions{
      display:grid;
      gap:10px;
      margin-top:2px;
    }

    .gg-btn{
      min-height:54px;
      border:none;
      border-radius:18px;
      cursor:pointer;
      font-size:15px;
      font-weight:1000;
      transition:transform .16s ease, opacity .16s ease;
    }

    .gg-btn:active{
      transform:scale(.985);
    }

    .gg-btn.primary{
      color:#fff;
      background:linear-gradient(135deg,#a5b4fc 0%,#6366f1 50%,#ec4899 100%);
      box-shadow:0 14px 34px rgba(99,102,241,.26);
    }

    .gg-btn.secondary{
      color:#fff;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.10);
    }
  `;
  document.head.appendChild(style);
}

function buildModalIfNeeded() {
  ensureGameGateStyles();
  if ($("gameGateModal")) return;

  const wrap = document.createElement("div");
  wrap.className = "gg-backdrop";
  wrap.id = "gameGateModal";
  wrap.innerHTML = `
    <div class="gg-card">
      <div class="gg-top">
        <div class="gg-chip">italkyAI • Oyun Erişimi</div>
        <div class="gg-title" id="ggTitle">Bu oyun için 1 jeton gerekiyor</div>
        <p class="gg-sub" id="ggSub">Bu oyunu açmak için 1 jeton kullanılır. Açıldıktan sonra 7 gün boyunca sınırsız oynayabilirsin.</p>
      </div>

      <div class="gg-body">
        <div class="gg-info">
          <div class="gg-label" id="ggInfo1Label">Erişim Tipi</div>
          <div class="gg-value" id="ggInfo1Value">1 Jeton • Tek Oyun</div>
          <p class="gg-desc" id="ggInfo1Desc">Jeton sadece seçtiğin oyun için geçerlidir.</p>
        </div>

        <div class="gg-info">
          <div class="gg-label" id="ggInfo2Label">Süre</div>
          <div class="gg-value" id="ggInfo2Value">7 Gün</div>
          <p class="gg-desc" id="ggInfo2Desc">Bu süre boyunca aynı oyuna tekrar girişte jeton düşmez.</p>
        </div>

        <div class="gg-actions">
          <button class="gg-btn primary" id="ggPrimaryBtn">Jeton Al</button>
          <button class="gg-btn secondary" id="ggCloseBtn">Kapat</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  $("ggPrimaryBtn")?.addEventListener("click", () => {
    const action = $("ggPrimaryBtn")?.dataset?.action || "market";

    if (action === "market") {
      location.href = "/pages/jetonbuy.html";
      return;
    }

    closeGamesGateModal();
  });

  $("ggCloseBtn")?.addEventListener("click", closeGamesGateModal);

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeGamesGateModal();
  });
}

export function closeGamesGateModal() {
  $("gameGateModal")?.classList.remove("show");
}

export function openGamesGateModal(options = {}) {
  buildModalIfNeeded();

  const {
    title = "Bu oyun için 1 jeton gerekiyor",
    message = "Bu oyunu açmak için 1 jeton kullanılır. Açıldıktan sonra 7 gün boyunca sınırsız oynayabilirsin.",
    info1Label = "Erişim Tipi",
    info1Value = "1 Jeton • Tek Oyun",
    info1Desc = "Jeton sadece seçtiğin oyun için geçerlidir.",
    info2Label = "Süre",
    info2Value = "7 Gün",
    info2Desc = "Bu süre boyunca aynı oyuna tekrar girişte jeton düşmez.",
    primaryText = "Jeton Al",
    primaryAction = "market",
    showPrimary = true,
    closeText = "Kapat"
  } = options;

  if ($("ggTitle")) $("ggTitle").textContent = title;
  if ($("ggSub")) $("ggSub").textContent = message;

  if ($("ggInfo1Label")) $("ggInfo1Label").textContent = info1Label;
  if ($("ggInfo1Value")) $("ggInfo1Value").textContent = info1Value;
  if ($("ggInfo1Desc")) $("ggInfo1Desc").textContent = info1Desc;

  if ($("ggInfo2Label")) $("ggInfo2Label").textContent = info2Label;
  if ($("ggInfo2Value")) $("ggInfo2Value").textContent = info2Value;
  if ($("ggInfo2Desc")) $("ggInfo2Desc").textContent = info2Desc;

  if ($("ggPrimaryBtn")) {
    $("ggPrimaryBtn").textContent = primaryText;
    $("ggPrimaryBtn").dataset.action = primaryAction;
    $("ggPrimaryBtn").style.display = showPrimary ? "" : "none";
  }

  if ($("ggCloseBtn")) {
    $("ggCloseBtn").textContent = closeText;
  }

  $("gameGateModal")?.classList.add("show");
}

function openInsufficientTokensModal() {
  openGamesGateModal({
    title: "Bu oyun için 1 jeton gerekiyor",
    message: `Bu oyunu açmak için ${GAME_PRICE} jeton kullanılır. Açıldıktan sonra ${GAME_DAYS} gün boyunca sınırsız oynayabilirsin.`,
    info1Label: "Erişim Tipi",
    info1Value: "1 Jeton • Tek Oyun",
    info1Desc: "Jeton sadece seçtiğin oyun için geçerlidir.",
    info2Label: "Süre",
    info2Value: "7 Gün",
    info2Desc: "Bu süre boyunca aynı oyuna tekrar girişte jeton düşmez.",
    primaryText: "Jeton Al",
    primaryAction: "market",
    showPrimary: true,
    closeText: "Kapat"
  });
}

function openSystemErrorModal() {
  openGamesGateModal({
    title: "Oyun şu an açılamadı",
    message: "Sistem erişim kontrolünü tamamlayamadı. Lütfen biraz sonra tekrar dene.",
    info1Label: "Durum",
    info1Value: "Geçici Sorun",
    info1Desc: "Bu hata jeton bakiyenden bağımsız olabilir.",
    info2Label: "Ne Yapabilirsin?",
    info2Value: "Tekrar Dene",
    info2Desc: "Sorun devam ederse teknik kontrol gerekebilir.",
    primaryText: "Tamam",
    primaryAction: "close",
    showPrimary: true,
    closeText: "Kapat"
  });
}

function looksLikeInsufficientTokens(payload) {
  const text = String(
    payload?.reason ||
    payload?.message ||
    payload?.detail ||
    payload?.error?.message ||
    payload?.error ||
    ""
  ).toLowerCase();

  return (
    text.includes("insufficient_tokens") ||
    text.includes("insufficient token") ||
    text.includes("yetersiz") ||
    text.includes("token") ||
    text.includes("jeton")
  );
}

export async function ensureGamesBundleAccess(gameCode = "") {
  const code = String(gameCode || "").trim().toLowerCase();

  if (!code) {
    openSystemErrorModal();
    return {
      ok: false,
      access_open: false,
      reason: "GAME_CODE_REQUIRED"
    };
  }

  if (FREE_GAME_CODES.has(code)) {
    return {
      ok: true,
      access_open: true,
      reason: "free_game"
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
    const { data, error } = await supabase.rpc("ensure_single_game_access", {
      p_user_id: user.id,
      p_game_code: code
    });

    if (error) {
      console.error("[game_access_gate] rpc error:", error);

      if (looksLikeInsufficientTokens(error)) {
        openInsufficientTokensModal();
        return {
          ok: false,
          access_open: false,
          reason: "INSUFFICIENT_TOKENS",
          error
        };
      }

      openSystemErrorModal();
      return {
        ok: false,
        access_open: false,
        reason: "rpc_error",
        error
      };
    }

    const json = data || null;

    if (!json) {
      openSystemErrorModal();
      return {
        ok: false,
        access_open: false,
        reason: "empty_response"
      };
    }

    if (!json.ok) {
      if (looksLikeInsufficientTokens(json)) {
        openInsufficientTokensModal();
        return {
          ok: false,
          access_open: false,
          reason: "INSUFFICIENT_TOKENS",
          data: json
        };
      }

      openSystemErrorModal();
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
      reason: json.used_token ? "token_spent_access_opened" : "existing_game_access_active",
      data: json
    };
  } catch (e) {
    console.error("[game_access_gate] exception:", e);

    if (looksLikeInsufficientTokens(e)) {
      openInsufficientTokensModal();
      return {
        ok: false,
        access_open: false,
        reason: "INSUFFICIENT_TOKENS",
        error: e
      };
    }

    openSystemErrorModal();
    return {
      ok: false,
      access_open: false,
      reason: "exception",
      error: e
    };
  }
}
