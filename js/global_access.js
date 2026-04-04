// FILE: /js/global_access.js

import { supabase } from "/js/supabase_client.js";

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function ensurePopupStyles() {
  if (document.getElementById("globalAccessPopupStyles")) return;

  const style = document.createElement("style");
  style.id = "globalAccessPopupStyles";
  style.textContent = `
    .ga-backdrop{
      position:fixed;
      inset:0;
      z-index:99998;
      background:rgba(2,6,23,.72);
      backdrop-filter:blur(10px);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:18px;
    }

    .ga-card{
      width:min(100%, 430px);
      border-radius:28px;
      background:linear-gradient(180deg, rgba(12,17,36,.98), rgba(7,11,24,.98));
      border:1px solid rgba(255,255,255,.12);
      box-shadow:0 24px 80px rgba(0,0,0,.45);
      color:#fff;
      overflow:hidden;
      font-family:Outfit, system-ui, sans-serif;
    }

    .ga-top{
      padding:20px 20px 14px;
      background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);
    }

    .ga-badge{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:8px 12px;
      border-radius:999px;
      font-size:12px;
      font-weight:800;
      background:rgba(255,255,255,.16);
      border:1px solid rgba(255,255,255,.18);
      letter-spacing:.2px;
    }

    .ga-title{
      margin:14px 0 6px;
      font-size:24px;
      font-weight:900;
      line-height:1.15;
    }

    .ga-sub{
      margin:0;
      font-size:14px;
      line-height:1.5;
      color:rgba(255,255,255,.9);
      white-space:pre-line;
    }

    .ga-body{
      padding:18px 20px 20px;
      display:grid;
      gap:14px;
    }

    .ga-info{
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      border-radius:18px;
      padding:14px;
    }

    .ga-label{
      font-size:12px;
      color:rgba(255,255,255,.62);
      margin-bottom:6px;
    }

    .ga-value{
      font-size:16px;
      font-weight:800;
      color:#fff;
    }

    .ga-note{
      margin:0;
      color:rgba(255,255,255,.74);
      font-size:13px;
      line-height:1.5;
    }

    .ga-actions{
      display:grid;
      gap:10px;
    }

    .ga-btn{
      appearance:none;
      border:none;
      width:100%;
      min-height:50px;
      border-radius:16px;
      cursor:pointer;
      font-weight:900;
      font-size:15px;
      letter-spacing:.2px;
      transition:transform .15s ease, opacity .15s ease;
    }

    .ga-btn:active{
      transform:scale(.985);
    }

    .ga-btn-primary{
      background:linear-gradient(135deg,#8b5cf6,#6366f1,#ec4899);
      color:#fff;
      box-shadow:0 10px 24px rgba(99,102,241,.28);
    }

    .ga-btn-secondary{
      background:rgba(255,255,255,.06);
      color:#fff;
      border:1px solid rgba(255,255,255,.1);
    }
  `;
  document.head.appendChild(style);
}

async function getAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

async function getCurrentTokens(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("tokens")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.tokens ?? 0);
}

function showTokenPopup({
  moduleName = "Modül",
  tokens = 0,
  neededTokens = 1,
  redirectTo = "/pages/jetonbuy.html"
}) {
  ensurePopupStyles();

  const existing = document.getElementById("gaBackdrop");
  if (existing) existing.remove();

  const backdrop = el("div", "ga-backdrop");
  backdrop.id = "gaBackdrop";

  const card = el("div", "ga-card");
  const top = el("div", "ga-top");
  const body = el("div", "ga-body");

  top.innerHTML = `
    <div class="ga-badge">italkyAI • Jeton Erişimi</div>
    <div class="ga-title">Jeton Gerekli</div>
    <p class="ga-sub">${moduleName} özelliğini kullanmak için yeterli jeton bulunmuyor.</p>
  `;

  const info = el("div", "ga-info", `
    <div class="ga-label">Mevcut Jeton</div>
    <div class="ga-value">${tokens}</div>
  `);

  const info2 = el("div", "ga-info", `
    <div class="ga-label">Gerekli Jeton</div>
    <div class="ga-value">${neededTokens}</div>
  `);

  const note = el(
    "p",
    "ga-note",
    "Bu sistem artık üyelik veya deneme süresi ile değil, sadece jeton ile çalışır. Devam etmek için jeton yükleyebilirsiniz."
  );

  const actions = el("div", "ga-actions");

  const primary = el("button", "ga-btn ga-btn-primary", "Jeton Yükle");
  primary.addEventListener("click", () => {
    backdrop.remove();
    window.location.href = redirectTo;
  });

  const secondary = el("button", "ga-btn ga-btn-secondary", "Ana Sayfaya Dön");
  secondary.addEventListener("click", () => {
    window.location.href = "/pages/home.html";
  });

  actions.appendChild(primary);
  actions.appendChild(secondary);

  body.appendChild(info);
  body.appendChild(info2);
  body.appendChild(note);
  body.appendChild(actions);

  card.appendChild(top);
  card.appendChild(body);
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  return false;
}

export async function initGlobalAccess(options = {}) {
  const {
    moduleName = "Modül",
    requireAccess = false,
    popup = true,
    redirectTo = "/pages/jetonbuy.html",
    requiredTokens = 0
  } = options;

  try {
    const user = await getAuthUser();

    if (!user) {
      if (requireAccess) {
        window.location.href = "/pages/login.html";
      }
      return {
        ok: false,
        reason: "no_user",
        tokens: 0
      };
    }

    const tokens = await getCurrentTokens(user.id);

    if (requiredTokens > 0 && tokens < requiredTokens) {
      if (popup) {
        showTokenPopup({
          moduleName,
          tokens,
          neededTokens: requiredTokens,
          redirectTo
        });
      }

      return {
        ok: false,
        reason: "insufficient_tokens",
        tokens
      };
    }

    return {
      ok: true,
      reason: "granted",
      tokens
    };
  } catch (err) {
    console.error("initGlobalAccess error:", err);
    return {
      ok: false,
      reason: "error",
      tokens: 0,
      error: err
    };
  }
}
