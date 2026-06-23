import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

const $ = (id) => document.getElementById(id);

const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = {
  users: $("panelUsers"),
  wallet: $("panelWallet"),
  promo: $("panelPromo"),
  manual: $("panelManual"),
  push: $("panelPush")
};

const meLine = $("meLine");
const usersTableBody = $("usersTableBody");
const walletTableBody = $("walletTableBody");
const promoTableBody = $("promoTableBody");
const promoLogTableBody = $("promoLogTableBody");

const userSearch = $("userSearch");
const walletSearch = $("walletSearch");
const promoSearch = $("promoSearch");
const promoLogSearch = $("promoLogSearch");

const userRefreshBtn = $("userRefreshBtn");
const walletRefreshBtn = $("walletRefreshBtn");
const promoRefreshBtn = $("promoRefreshBtn");
const promoLogRefreshBtn = $("promoLogRefreshBtn");

const campaignCode = $("campaignCode");
const campaignName = $("campaignName");
const campaignDescription = $("campaignDescription");
const grantType = $("grantType");
const deliveryType = $("deliveryType");
const membershipMonths = $("membershipMonths");
const tokenAmount = $("tokenAmount");
const packageCode = $("packageCode");
const perUserLimit = $("perUserLimit");
const promoCodeValue = $("promoCodeValue");
const promoQuantity = $("promoQuantity");
const generatePromoBtn = $("generatePromoBtn");
const savePromoBtn = $("savePromoBtn");
const promoStatus = $("promoStatus");
const promoPreview = $("promoPreview");
const printQrBtn = $("printQrBtn");
const copyPromoBtn = $("copyPromoBtn");

const manualUserId = $("manualUserId");
const manualAmount = $("manualAmount");
const manualNote = $("manualNote");
const manualLoadBtn = $("manualLoadBtn");
const manualStatus = $("manualStatus");

const pushTargetMode = $("pushTargetMode");
const pushType = $("pushType");
const pushUserId = $("pushUserId");
const pushTargetUrl = $("pushTargetUrl");
const pushTitle = $("pushTitle");
const pushBody = $("pushBody");
const pushSendBtn = $("pushSendBtn");
const pushStatus = $("pushStatus");
const pushPreview = $("pushPreview");
const pushResultBox = $("pushResultBox");
const pushTestFillBtn = $("pushTestFillBtn");

const homeBtn = $("homeBtn");
const refreshBtn = $("refreshBtn");
const logoutBtnTop = $("logoutBtnTop");

let currentUser = null;
let currentProfile = null;
let latestCreatedPromo = null;
let latestCreatedPromoList = [];

function setStatus(el, text, cls = "") {
  if (!el) return;
  el.className = `status-line ${cls}`.trim();
  el.textContent = text || "";
}

function fmt(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString("tr-TR");
  } catch {
    return "-";
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setActiveTab(name) {
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
  });

  Object.entries(panels).forEach(([key, panel]) => {
    if (!panel) return;
    panel.classList.toggle("hidden", key !== name);
  });
}

function randomPart(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generateCampaignCode() {
  return `PROMO_${Date.now()}_${randomPart(4)}`;
}

function generatePromoCode() {
  const letters = "ABCDEFGHJKLMNPRSTUVYZ";
  const digits = "0123456789";
  const bannedPairs = new Set(["AK", "FG", "FB", "GS"]);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const pair = `${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}`;
    if (bannedPairs.has(pair)) continue;

    let numberPart = "";
    for (let i = 0; i < 6; i += 1) {
      numberPart += digits[Math.floor(Math.random() * digits.length)];
    }

    return `${pair}${numberPart}`;
  }

  throw new Error("Promosyon kodu üretilemedi");
}

const KAMPANYA_QR_BASE = "https://italky.ai/kampanya?kod=";
// Backend POST /api/promo/redeem reads web_promo_codes first, then promo_codes (code_value column).
const PROMO_CODES_TABLE = "promo_codes";
const PROMO_REDEMPTIONS_TABLE = "promo_redemptions";

function buildQrUrl(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return `${KAMPANYA_QR_BASE}${encodeURIComponent(normalized)}`;
}

function logPromoTable(action, table, extra = {}) {
  console.log(`[admin promo] ${action} → table: ${table}`, extra);
}

// ---------------------------------------------------------
// RENDER.COM BAĞIMLILIĞI KALDIRILDI - DOĞRUDAN SUPABASE
// ---------------------------------------------------------
async function apiGet(path) {
  try {
    if (path === "/users") {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return { items: data || [] };
    }
    if (path === "/promo/codes") {
      logPromoTable("SELECT", PROMO_CODES_TABLE, { path: "/promo/codes" });
      const { data, error } = await supabase.from(PROMO_CODES_TABLE).select("*, promo_campaigns(*)");
      if (error) throw error;
      return { items: data || [] };
    }
    if (path === "/promo/redemptions") {
      logPromoTable("SELECT", PROMO_REDEMPTIONS_TABLE, { path: "/promo/redemptions" });
      const { data, error } = await supabase.from(PROMO_REDEMPTIONS_TABLE).select("*");
      if (error) throw error;
      return { items: data || [] };
    }
    return { items: [] };
  } catch (e) {
    console.error("GET Hatası:", e);
    return { items: [] };
  }
}

async function apiPost(path, body) {
  try {
    if (path === "/promo/campaigns") {
      const { data, error } = await supabase.from("promo_campaigns").insert([body]).select();
      if (error) throw error;
      return { item: data };
    }
    if (path === "/promo/codes") {
      logPromoTable("INSERT", PROMO_CODES_TABLE, {
        path: "/promo/codes",
        code_value: body?.code_value || body?.code || null
      });
      const { data, error } = await supabase.from(PROMO_CODES_TABLE).insert([body]).select();
      if (error) throw error;
      return { item: data };
    }
    if (path === "/promo/codes/status") {
      logPromoTable("UPDATE", PROMO_CODES_TABLE, {
        path: "/promo/codes/status",
        code_value: body?.code_value || null,
        is_active: body?.is_active
      });
      const { error } = await supabase.from(PROMO_CODES_TABLE)
        .update({ is_active: body.is_active })
        .eq("code_value", body.code_value);
      if (error) throw error;
      return { ok: true };
    }
    if (path === "/wallet/manual-load") {
      // Supabase'deki add_tokens veya add_wallet_tx fonksiyonunu çağırıyoruz
      const { data, error } = await supabase.rpc("add_tokens", { 
        p_user_id: body.user_id, 
        p_amount: body.amount 
      });
      if (error) throw error;
      return data || { tokens_after: "Güncellendi" };
    }
    return { ok: true };
  } catch (e) {
    console.error("POST Hatası:", e);
    throw new Error(e.message || "İşlem başarısız");
  }
}

async function pushPost(path, body) {
  try {
    const { error } = await supabase.from("push_notifications").insert([body]);
    if (error) throw error;
    return { sent: 1, failed: 0 };
  } catch (e) {
    throw new Error(e.message || "Push bildirimi kaydedilemedi");
  }
}
// ---------------------------------------------------------

async function getCurrentUserAndProfile() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser?.id) {
    location.href = "/pages/login.html";
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, tokens, is_admin")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;

  meLine.textContent = currentProfile
    ? `${currentProfile.full_name || "-"} • ${currentProfile.email || "-"} • Rol: ${currentProfile.role || "-"}`
    : `${currentUser.email || "-"} • Profil bulunamadı`;

  const role = String(currentProfile?.role || "").toLowerCase();
  if (role !== "superadmin") {
    if (manualLoadBtn) manualLoadBtn.disabled = true;
    setStatus(manualStatus, "Manuel jeton yükleme sadece superadmin içindir.", "status-warn");
  }
}

async function loadUsers() {
  try {
    const json = await apiGet("/users");
    let rows = Array.isArray(json?.items) ? json.items : [];
    const q = String(userSearch?.value || "").trim().toLowerCase();

    if (q) {
      rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
    }

    if (!rows.length) {
      usersTableBody.innerHTML = `<tr><td colspan="7" class="empty">Kullanıcı bulunamadı.</td></tr>`;
      return;
    }

    usersTableBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.full_name || "-")}</td>
        <td>${escapeHtml(row.email || "-")}</td>
        <td>${escapeHtml(row.role || "-")}</td>
        <td>${Number(row.tokens || 0)}</td>
        <td>${row.promo_used_at ? "Kullanmış" : "Yok"}</td>
        <td>${escapeHtml(fmt(row.package_ends_at))}</td>
        <td>${escapeHtml(row.id || "-")}</td>
      </tr>
    `).join("");
  } catch (e) {
    usersTableBody.innerHTML = `<tr><td colspan="7" class="empty">Kullanıcılar yüklenemedi.</td></tr>`;
  }
}

async function loadWallet() {
  try {
    const { data, error } = await supabase
      .from("wallet_tx")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) throw error;

    let rows = Array.isArray(data) ? data : [];
    const q = String(walletSearch?.value || "").trim().toLowerCase();

    if (q) {
      rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
    }

    if (!rows.length) {
      walletTableBody.innerHTML = `<tr><td colspan="5" class="empty">Hareket bulunamadı.</td></tr>`;
      return;
    }

    walletTableBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.user_id || "-")}</td>
        <td>${row.delta ?? row.amount ?? 0}</td>
        <td>${escapeHtml(row.reason || "-")}</td>
        <td>${escapeHtml(row.note || "-")}</td>
        <td>${escapeHtml(fmt(row.created_at))}</td>
      </tr>
    `).join("");
  } catch (e) {
    walletTableBody.innerHTML = `<tr><td colspan="5" class="empty">Hareketler yüklenemedi.</td></tr>`;
  }
}

function renderPromoPreview(rowOrList) {
  if (!rowOrList) {
    latestCreatedPromo = null;
    latestCreatedPromoList = [];
    promoPreview.innerHTML = "Henüz promosyon oluşturulmadı.";
    return;
  }

  if (Array.isArray(rowOrList)) {
    latestCreatedPromoList = rowOrList.slice();
    latestCreatedPromo = rowOrList[0] || null;

    const first = rowOrList[0];
    promoPreview.innerHTML = `
      <div><b>Campaign:</b> ${escapeHtml(first?.campaign_name || "-")}</div>
      <div><b>Campaign Code:</b> ${escapeHtml(first?.campaign_code || "-")}</div>
      <div><b>Üretilen Kod Adedi:</b> ${rowOrList.length}</div>
      <div><b>İlk Kod:</b> ${escapeHtml(first?.code_value || "-")}</div>
      <div><b>Teslim:</b> ${escapeHtml(first?.delivery_type || "-")}</div>
      <div><b>Tür:</b> ${escapeHtml(first?.grant_type || "-")}</div>
      <div><b>Üyelik:</b> ${Number(first?.membership_months || 0)} ay</div>
      <div><b>Jeton:</b> ${Number(first?.token_amount || 0)}</div>
    `;
    return;
  }

  latestCreatedPromo = rowOrList;
  latestCreatedPromoList = [rowOrList];

  const row = rowOrList;
  promoPreview.innerHTML = `
    <div><b>Campaign:</b> ${escapeHtml(row.campaign_name || "-")}</div>
    <div><b>Campaign Code:</b> ${escapeHtml(row.campaign_code || "-")}</div>
    <div><b>Promosyon Kodu:</b> ${escapeHtml(row.code_value || "-")}</div>
    <div><b>Teslim:</b> ${escapeHtml(row.delivery_type || "-")}</div>
    <div><b>Tür:</b> ${escapeHtml(row.grant_type || "-")}</div>
    <div><b>Üyelik:</b> ${Number(row.membership_months || 0)} ay</div>
    <div><b>Jeton:</b> ${Number(row.token_amount || 0)}</div>
    <div><b>QR:</b><br>${escapeHtml(row.qr_url || "-")}</div>
  `;
}

async function createCampaign(payload) {
  return await apiPost("/promo/campaigns", payload);
}

async function createCode(payload) {
  return await apiPost("/promo/codes", payload);
}

function buildPromoPayload() {
  const gType = String(grantType?.value || "").trim();
  const dType = String(deliveryType?.value || "").trim();
  const cName = String(campaignName?.value || "").trim();
  const cCode = String(campaignCode?.value || "").trim().toUpperCase() || generateCampaignCode();
  const desc = String(campaignDescription?.value || "").trim();
  const months = Number(membershipMonths?.value || 0);
  const tokens = Number(tokenAmount?.value || 0);
  const pkg = String(packageCode?.value || "").trim() || "member";
  const userLimit = Math.max(1, Number(perUserLimit?.value || 1));

  if (!cName) throw new Error("Campaign adı gerekli");
  if (!["membership", "tokens", "bundle"].includes(gType)) throw new Error("Geçersiz tür");
  if (!["manual", "qr"].includes(dType)) throw new Error("Geçersiz teslim tipi");
  if (gType === "membership" && months <= 0) throw new Error("Üyelik ayı gerekli");
  if (gType === "tokens" && tokens <= 0) throw new Error("Jeton miktarı gerekli");
  if (gType === "bundle" && months <= 0 && tokens <= 0) throw new Error("Bundle için üyelik veya jeton gerekli");

  return {
    campaign_code: cCode,
    campaign_name: cName,
    description: desc || cName,
    grant_type: gType,
    delivery_type: dType,
    membership_months: months,
    token_amount: tokens,
    package_code: pkg,
    per_user_limit: userLimit
  };
}

async function createCampaignOnce(base) {
  const campaignRes = await createCampaign({
    code: base.campaign_code,
    name: base.campaign_name,
    description: base.description,
    is_active: true,
    grant_type: base.grant_type,
    membership_months: base.membership_months,
    token_amount: base.token_amount,
    package_code: base.package_code,
    stack_mode: "extend",
    per_user_limit: base.per_user_limit
  });

  const campaignRow = Array.isArray(campaignRes?.item) ? campaignRes.item[0] : campaignRes?.item;
  const campaignId = campaignRow?.id;
  if (!campaignId) throw new Error("Campaign id alınamadı");

  return { campaignId, campaignRow };
}

function mapCreatedCode(codeRow, base) {
  return {
    ...codeRow,
    campaign_name: base.campaign_name,
    campaign_code: base.campaign_code,
    grant_type: base.grant_type,
    membership_months: base.membership_months,
    token_amount: base.token_amount,
    package_code: base.package_code,
    qr_url: buildQrUrl(codeRow?.code_value || codeRow?.code || "")
  };
}

async function createSinglePromoRecord() {
  const base = buildPromoPayload();
  const singleCode = String(promoCodeValue?.value || "").trim().toUpperCase() || generatePromoCode();

  const { campaignId } = await createCampaignOnce(base);

  const codeRes = await createCode({
    campaign_id: campaignId,
    code_value: singleCode,
    delivery_type: base.delivery_type,
    is_active: true,
    is_used: false
  });

  const codeRow = Array.isArray(codeRes?.item) ? codeRes.item[0] : codeRes?.item;
  return mapCreatedCode(codeRow, base);
}

async function createBulkPromoRecords() {
  const base = buildPromoPayload();
  const qty = Math.max(1, Number(promoQuantity?.value || 1));

  const { campaignId } = await createCampaignOnce(base);
  const rows = [];

  for (let i = 0; i < qty; i++) {
    const codeVal = generatePromoCode();

    const codeRes = await createCode({
      campaign_id: campaignId,
      code_value: codeVal,
      delivery_type: base.delivery_type,
      is_active: true,
      is_used: false
    });

    const codeRow = Array.isArray(codeRes?.item) ? codeRes.item[0] : codeRes?.item;
    rows.push(mapCreatedCode(codeRow, base));
  }

  return rows;
}

async function loadPromoRecords() {
  if (!promoTableBody) return;

  try {
    const json = await apiGet("/promo/codes");
    let rows = Array.isArray(json?.items) ? json.items : [];
    const q = String(promoSearch?.value || "").trim().toLowerCase();

    rows = rows.map((row) => {
      const campaign = Array.isArray(row.promo_campaigns) ? row.promo_campaigns[0] : row.promo_campaigns;
      return {
        ...row,
        campaign_name: campaign?.name || "-",
        campaign_code: campaign?.code || "-",
        grant_type: campaign?.grant_type || "-",
        membership_months: campaign?.membership_months || 0,
        token_amount: campaign?.token_amount || 0,
        package_code: campaign?.package_code || "",
      };
    });

    if (q) {
      rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
    }

    if (!rows.length) {
      promoTableBody.innerHTML = `<tr><td colspan="9" class="empty">Promosyon bulunamadı.</td></tr>`;
      return;
    }

    promoTableBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.campaign_name)}</td>
        <td>${escapeHtml(row.code_value)}</td>
        <td>${escapeHtml(row.delivery_type)}</td>
        <td>${escapeHtml(row.grant_type)}</td>
        <td>${Number(row.membership_months || 0)} ay</td>
        <td>${Number(row.token_amount || 0)}</td>
        <td>${row.is_used ? "Kullanıldı" : (row.is_active ? "Aktif" : "Pasif")}</td>
        <td>${escapeHtml(row.used_by || row.bound_user_id || "-")}</td>
        <td>
          <div class="mini-actions">
            <button class="btn-ok" type="button" data-action="on" data-code="${escapeHtml(row.code_value)}">Aktif</button>
            <button class="btn-danger" type="button" data-action="off" data-code="${escapeHtml(row.code_value)}">Pasif</button>
          </div>
        </td>
      </tr>
    `).join("");

    promoTableBody.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await apiPost("/promo/codes/status", {
            code_value: btn.dataset.code,
            is_active: btn.dataset.action === "on"
          });
          setStatus(promoStatus, "Promosyon durumu güncellendi.", "status-ok");
          await loadPromoRecords();
        } catch (e) {
          setStatus(promoStatus, "Promosyon durumu güncellenemedi: " + (e.message || e), "status-err");
        }
      });
    });
  } catch (e) {
    promoTableBody.innerHTML = `<tr><td colspan="9" class="empty">Promosyonlar yüklenemedi.</td></tr>`;
  }
}

async function loadPromoLogs() {
  if (!promoLogTableBody) return;

  try {
    const json = await apiGet("/promo/redemptions");
    let rows = Array.isArray(json?.items) ? json.items : [];
    const search = String(promoLogSearch?.value || "").trim().toLowerCase();

    if (search) {
      rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search));
    }

    if (!rows.length) {
      promoLogTableBody.innerHTML = `<tr><td colspan="8" class="empty">Kayıt bulunamadı.</td></tr>`;
      return;
    }

    promoLogTableBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.user_id || "-")}</td>
        <td>${escapeHtml(row.campaign_id || "-")}</td>
        <td>${escapeHtml(row.grant_type || "-")}</td>
        <td>${Number(row.granted_membership_months || 0)} ay</td>
        <td>${Number(row.granted_tokens || 0)}</td>
        <td>${escapeHtml(row.before_package_code || "-")} / ${escapeHtml(row.before_membership_end || "-")}</td>
        <td>${escapeHtml(row.after_package_code || "-")} / ${escapeHtml(row.after_membership_end || "-")}</td>
        <td>${escapeHtml(fmt(row.created_at))}</td>
      </tr>
    `).join("");
  } catch (e) {
    promoLogTableBody.innerHTML = `<tr><td colspan="8" class="empty">Log kayıtları yüklenemedi.</td></tr>`;
  }
}

async function createManualTokenLoad(userId, amount, note) {
  return await apiPost("/wallet/manual-load", {
    user_id: userId,
    amount: Number(amount || 0),
    note: note || ""
  });
}

function renderPushPreview() {
  if (!pushPreview) return;
  pushPreview.innerHTML = `
    <div><b>Başlık:</b> ${escapeHtml(pushTitle?.value || "italkyAI")}</div>
    <div><b>Mesaj:</b> ${escapeHtml(pushBody?.value || "Yeni bildirimin var")}</div>
    <div><b>Tip:</b> ${escapeHtml(pushType?.value || "general")}</div>
    <div><b>Hedef:</b> ${escapeHtml(pushTargetUrl?.value || "/pages/home.html")}</div>
    <div><b>Mod:</b> ${escapeHtml(pushTargetMode?.value || "single")}</div>
    ${String(pushTargetMode?.value || "") === "single" ? `<div><b>Kullanıcı:</b> ${escapeHtml(pushUserId?.value || "-")}</div>` : ""}
  `;
}

async function sendPushNotification() {
  const payload = {
    target_mode: String(pushTargetMode?.value || "single"),
    user_id: String(pushUserId?.value || "").trim(),
    title: String(pushTitle?.value || "").trim(),
    body: String(pushBody?.value || "").trim(),
    push_type: String(pushType?.value || "general").trim(),
    target_url: String(pushTargetUrl?.value || "/pages/home.html").trim() || "/pages/home.html"
  };

  if (!payload.title) throw new Error("Başlık gerekli");
  if (!payload.body) throw new Error("Mesaj gerekli");
  if (payload.target_mode === "single" && !payload.user_id) throw new Error("Tek kullanıcı için kullanıcı UID gerekli");

  return await pushPost("/send", payload);
}

function bindTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveTab(tab.dataset.tab);
    });
  });
}

function bindTopActions() {
  homeBtn?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  refreshBtn?.addEventListener("click", async () => {
    await Promise.allSettled([loadUsers(), loadWallet(), loadPromoRecords(), loadPromoLogs()]);
  });

  logoutBtnTop?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "/pages/login.html";
  });
}

function bindUsers() {
  userRefreshBtn?.addEventListener("click", loadUsers);
  userSearch?.addEventListener("input", loadUsers);
}

function bindWallet() {
  walletRefreshBtn?.addEventListener("click", loadWallet);
  walletSearch?.addEventListener("input", loadWallet);
}

function resetPromoFormAfterCreate() {
  campaignCode.value = "";
  campaignName.value = "";
  campaignDescription.value = "";
  membershipMonths.value = "";
  tokenAmount.value = "";
  packageCode.value = "";
  perUserLimit.value = "1";
  promoCodeValue.value = "";
  promoQuantity.value = "1";
}

function bindPromo() {
  document.querySelectorAll("[data-month]").forEach((btn) => {
    btn.addEventListener("click", () => {
      membershipMonths.value = btn.dataset.month || "";
    });
  });

  document.querySelectorAll("[data-token]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tokenAmount.value = btn.dataset.token || "";
    });
  });

  campaignCode?.addEventListener("input", () => {
    campaignCode.value = campaignCode.value.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 60);
  });

  promoCodeValue?.addEventListener("input", () => {
    promoCodeValue.value = promoCodeValue.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
  });

  generatePromoBtn?.addEventListener("click", async () => {
    try {
      setStatus(promoStatus, "Kodlar üretiliyor...", "status-warn");
      const rows = await createBulkPromoRecords();
      renderPromoPreview(rows);
      setStatus(promoStatus, `${rows.length} adet promosyon kodu üretildi.`, "status-ok");
      resetPromoFormAfterCreate();
      await Promise.allSettled([loadPromoRecords(), loadPromoLogs()]);
    } catch (e) {
      setStatus(promoStatus, "Kod üretilemedi: " + (e.message || e), "status-err");
    }
  });

  savePromoBtn?.addEventListener("click", async () => {
    try {
      setStatus(promoStatus, "Tekli promosyon kaydediliyor...", "status-warn");
      const row = await createSinglePromoRecord();
      renderPromoPreview(row);
      setStatus(
        promoStatus,
        `Promosyon oluşturuldu • Kod: ${row.code_value} • Tür: ${row.grant_type} • ${row.membership_months || 0} ay • ${row.token_amount || 0} jeton`,
        "status-ok"
      );
      resetPromoFormAfterCreate();
      await Promise.allSettled([loadPromoRecords(), loadPromoLogs()]);
    } catch (e) {
      setStatus(promoStatus, "Promosyon oluşturulamadı: " + (e.message || e), "status-err");
    }
  });

  printQrBtn?.addEventListener("click", () => {
    try {
      if (!latestCreatedPromo?.qr_url || !latestCreatedPromo?.code_value) {
        setStatus(promoStatus, "Önce promosyon oluştur.", "status-warn");
        return;
      }

      const qrText = latestCreatedPromo.qr_url;
      const shortCode = latestCreatedPromo.code_value;
      const months = Number(latestCreatedPromo.membership_months || 0);
      const tokens = Number(latestCreatedPromo.token_amount || 0);
      const campaign = latestCreatedPromo.campaign_name || "Promosyon";

      const w = window.open("", "_blank", "width=520,height=780");
      if (!w) {
        setStatus(promoStatus, "QR yazdırma penceresi açılamadı.", "status-err");
        return;
      }

      const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrText)}`;

      w.document.write(`
        <!doctype html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <title>Promosyon Kartı Yazdır</title>
          <style>
            body{margin:0;font-family:Arial,sans-serif;background:#fff;color:#111;display:flex;justify-content:center;align-items:center;min-height:100vh}
            .card{width:360px;border:2px solid #111;border-radius:24px;padding:24px;text-align:center}
            .brand{font-size:28px;font-weight:900;margin-bottom:8px}
            .campaign{font-size:20px;font-weight:900;margin-bottom:8px}
            .benefit{font-size:18px;font-weight:800;margin-bottom:16px}
            .qr{width:280px;height:280px;object-fit:contain;margin:0 auto 16px;display:block}
            .code{font-size:26px;font-weight:900;letter-spacing:2px;margin-top:10px}
            .sub{margin-top:10px;font-size:14px;line-height:1.5}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">italkyAI</div>
            <div class="campaign">${campaign}</div>
            <div class="benefit">${months > 0 ? `${months} AY ÜYELİK` : ""}${months > 0 && tokens > 0 ? " + " : ""}${tokens > 0 ? `${tokens} JETON` : ""}</div>
            <img class="qr" src="${qrImg}" alt="QR">
            <div class="code">${shortCode}</div>
            <div class="sub">QR okutun veya promosyon kodunu giriş ekranında kullanın.</div>
          </div>
          <script>
            window.onload = () => { setTimeout(() => window.print(), 250); };
          <\/script>
        </body>
        </html>
      `);
      w.document.close();
    } catch (e) {
      setStatus(promoStatus, "QR yazdırma hatası: " + (e.message || e), "status-err");
    }
  });

  copyPromoBtn?.addEventListener("click", async () => {
    try {
      const code = latestCreatedPromo?.code_value || "";
      if (!code) {
        setStatus(promoStatus, "Kopyalanacak promosyon kodu yok.", "status-warn");
        return;
      }
      await navigator.clipboard.writeText(code);
      setStatus(promoStatus, "Promosyon kodu kopyalandı.", "status-ok");
    } catch (e) {
      setStatus(promoStatus, "Kod kopyalanamadı.", "status-err");
    }
  });

  promoRefreshBtn?.addEventListener("click", loadPromoRecords);
  promoSearch?.addEventListener("input", loadPromoRecords);

  promoLogRefreshBtn?.addEventListener("click", loadPromoLogs);
  promoLogSearch?.addEventListener("input", loadPromoLogs);
}

function bindManual() {
  manualLoadBtn?.addEventListener("click", async () => {
    try {
      if ((currentProfile?.role || "").toLowerCase() !== "superadmin") {
        throw new Error("Bu işlem sadece superadmin içindir");
      }

      setStatus(manualStatus, "Jeton yükleniyor...", "status-warn");

      const result = await createManualTokenLoad(
        manualUserId.value.trim(),
        manualAmount.value,
        manualNote.value
      );

      setStatus(manualStatus, `Jeton yüklendi. Yeni bakiye: ${result.tokens_after}`, "status-ok");

      manualUserId.value = "";
      manualAmount.value = "";
      manualNote.value = "";

      await Promise.allSettled([loadUsers(), loadWallet()]);
    } catch (e) {
      setStatus(manualStatus, "Jeton yüklenemedi: " + (e.message || e), "status-err");
    }
  });
}

function bindPush() {
  const rerender = () => renderPushPreview();

  pushTargetMode?.addEventListener("change", rerender);
  pushType?.addEventListener("change", rerender);
  pushUserId?.addEventListener("input", rerender);
  pushTargetUrl?.addEventListener("input", rerender);
  pushTitle?.addEventListener("input", rerender);
  pushBody?.addEventListener("input", rerender);

  pushTestFillBtn?.addEventListener("click", () => {
    pushTitle.value = "italkyAI güncellendi";
    pushBody.value = "Yeni sürüm yayında. Yeni özellikleri hemen keşfedin.";
    pushType.value = "app_update";
    pushTargetUrl.value = "/pages/home.html";
    renderPushPreview();
  });

  pushSendBtn?.addEventListener("click", async () => {
    try {
      setStatus(pushStatus, "Bildirim gönderiliyor...", "status-warn");
      pushSendBtn.disabled = true;
      pushResultBox.textContent = "Gönderiliyor...";

      const result = await sendPushNotification();
      pushResultBox.textContent = JSON.stringify(result, null, 2);
      setStatus(pushStatus, `Bildirim tamamlandı. Gönderilen: ${result.sent || 0}, Hata: ${result.failed || 0}`, "status-ok");
    } catch (e) {
      pushResultBox.textContent = String(e?.message || e);
      setStatus(pushStatus, "Bildirim gönderilemedi: " + (e.message || e), "status-err");
    } finally {
      pushSendBtn.disabled = false;
    }
  });

  renderPushPreview();
}

async function init() {
  try {
    mountShell({ scroll: "auto" });
  } catch {}

  try {
    const root = getComputedStyle(document.documentElement);
    const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
    document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 10}px` : "0px");
  } catch {}

  await getCurrentUserAndProfile();

  bindTabs();
  bindTopActions();
  bindUsers();
  bindWallet();
  bindPromo();
  bindManual();
  bindPush();

  await Promise.allSettled([loadUsers(), loadWallet(), loadPromoRecords(), loadPromoLogs()]);

  document.getElementById("pageContent")?.classList.add("ready");
}

init();
