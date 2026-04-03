// FILE: /js/global_access.js

import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatDateTR(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  } catch {
    return "-";
  }
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
    }

    .ga-body{
      padding:18px 20px 20px;
    }

    .ga-grid{
      display:grid;
      gap:10px;
      margin-bottom:16px;
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
      margin:0 0 16px;
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

async function getAccessState(userId) {
  const { data, error } = await supabase
    .from("user_access_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

function buildPopupData(access, moduleName) {
  const trialDaysLeft = safeNum(access?.trial_days_left, 0);
  const packageCode = String(access?.selected_package_code || "-");
  const packageEndsAt = access?.package_ends_at || null;
  const accessOpen = !!access?.access_open;

  let headerTitle = `${moduleName} erişim bilgisi`;
  let headerSub = "Kullanım durumun burada görünüyor.";
  let statusText = accessOpen ? "Erişim açık" : "Erişim kilitli";

  if (!accessOpen) {
    headerTitle = `${moduleName} şu an kilitli`;
    headerSub = "Devam etmek için aktif deneme süresi veya uygun paket gerekiyor.";
  } else if (trialDaysLeft > 0) {
    headerTitle = `${moduleName} kullanıma açık`;
    headerSub = `Deneme süren devam ediyor. Kalan gününü burada görüyorsun.`;
    statusText = `${trialDaysLeft} gün kaldı`;
  } else if (packageCode && packageCode !== "-") {
    headerTitle = `${moduleName} kullanıma açık`;
    headerSub = "Paket erişimin aktif görünüyor.";
    statusText = "Paket aktif";
  }

  return {
    accessOpen,
    trialDaysLeft,
    packageCode,
    packageEndsAt,
    headerTitle,
    headerSub,
    statusText
  };
}

function showAccessPopup({
  moduleName = "Modül",
  access,
  redirectTo = "/pages/membership.html"
}) {
  ensurePopupStyles();

  const existing = document.getElementById("gaBackdrop");
  if (existing) existing.remove();

  const view = buildPopupData(access, moduleName);

  const backdrop = el("div", "ga-backdrop");
  backdrop.id = "gaBackdrop";

  const card = el("div", "ga-card");
  const top = el("div", "ga-top");
  const body = el("div", "ga-body");

  top.innerHTML = `
    <div class="ga-badge">italkyAI • Erişim</div>
    <div class="ga-title">${view.headerTitle}</div>
    <p class="ga-sub">${view.headerSub}</p>
  `;

  const grid = el("div", "ga-grid");
  grid.innerHTML = `
    <div class="ga-info">
      <div class="ga-label">Durum</div>
      <div class="ga-value">${view.statusText}</div>
    </div>

    <div class="ga-info">
      <div class="ga-label">Kalan deneme günü</div>
      <div class="ga-value">${view.trialDaysLeft > 0 ? `${view.trialDaysLeft} gün` : "Yok"}</div>
    </div>

    <div class="ga-info">
      <div class="ga-label">Paket</div>
      <div class="ga-value">${view.packageCode}</div>
    </div>

    <div class="ga-info">
      <div class="ga-label">Paket bitiş</div>
      <div class="ga-value">${view.packageEndsAt ? formatDateTR(view.packageEndsAt) : "-"}</div>
    </div>
  `;

  const note = el(
    "p",
    "ga-note",
    view.accessOpen
      ? `${moduleName} için erişimin açık. Bilgilendirme popup’ı olarak gösteriliyor.`
      : `${moduleName} için erişim şu an kapalı. Paket ekranından devam edebilirsin.`
  );

  const actions = el("div", "ga-actions");

  const primary = el(
    "button",
    "ga-btn ga-btn-primary",
    view.accessOpen ? "Devam et" : "Paketleri Gör"
  );

  primary.addEventListener("click", () => {
    backdrop.remove();
    if (!view.accessOpen) window.location.href = redirectTo;
  });

  actions.appendChild(primary);

  if (!view.accessOpen) {
    const secondary = el("button", "ga-btn ga-btn-secondary", "Ana Sayfaya Dön");
    secondary.addEventListener("click", () => {
      window.location.href = "/pages/home.html";
    });
    actions.appendChild(secondary);
  }

  body.appendChild(grid);
  body.appendChild(note);
  body.appendChild(actions);

  card.appendChild(top);
  card.appendChild(body);
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  return view.accessOpen;
}

export async function initGlobalAccess(options = {}) {
  const {
    moduleName = "Modül",
    requireAccess = false,
    popup = true,
    redirectTo = "/pages/membership.html"
  } = options;

  try {
    const user = await getAuthUser();

    if (!user) {
      if (requireAccess) {
        window.location.href = "/pages/login.html";
      }
      return { ok: false, reason: "no_user", accessOpen: false };
    }

    const access = await getAccessState(user.id);

    const accessOpen = !!access?.access_open;
    const trialDaysLeft = safeNum(access?.trial_days_left, 0);

    if (popup) {
      showAccessPopup({
        moduleName,
        access,
        redirectTo
      });
    }

    if (requireAccess && !accessOpen) {
      return {
        ok: false,
        reason: "locked",
        accessOpen: false,
        trialDaysLeft,
        access
      };
    }

    return {
      ok: true,
      reason: accessOpen ? "granted" : "info_only",
      accessOpen,
      trialDaysLeft,
      access
    };
  } catch (err) {
    console.error("initGlobalAccess error:", err);
    return {
      ok: false,
      reason: "error",
      accessOpen: false,
      error: err
    };
  }
}
