import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

const $ = (id) => document.getElementById(id);

const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = {
  users: $("panelUsers"),
  wallet: $("panelWallet"),
  promo: $("panelPromo"),
  manual: $("panelManual")
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
const promoNfcUid = $("promoNfcUid");
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

const homeBtn = $("homeBtn");
const refreshBtn = $("refreshBtn");
const logoutBtnTop = $("logoutBtnTop");

let currentUser = null;
let currentProfile = null;
let latestCreatedPromo = null;

function setStatus(el, text, cls = "") {
  if (!el) return;
  el.className = `status-line ${cls}`.trim();
  el.textContent = text || "";
}

function fmt(v) {
  if (!v) return "-";
  try { return new Date(v).toLocaleString("tr-TR"); } catch { return "-"; }
}

function safe(v, fallback = "-") {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statusTextFromCode(row) {
  if (row.is_used) return "Kullanıldı";
  if (row.is_active) return "Aktif";
  return "Pasif";
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

function randomPart(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generateCampaignCode() {
  return `PROMO_${Date.now()}_${randomPart(4)}`;
}

function generatePromoCode() {
  return `ITK-${randomPart(4)}-${randomPart(4)}`;
}

function buildQrUrl(code) {
  return `${location.origin}/pages/promo_gate.html?code=${encodeURIComponent(code)}`;
}

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
  const q = String(userSearch?.value || "").trim().toLowerCase();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, tokens, promo_used_at, package_ends_at")
    .order("id", { ascending: false });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,id.ilike.%${q}%`);
  }

  const { data, error } = await query.limit(200);

  if (error) {
    usersTableBody.innerHTML = `<tr><td colspan="7" class="empty">Kullanıcılar yüklenemedi.</td></tr>`;
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) {
    usersTableBody.innerHTML = `<tr><td colspan="7" class="empty">Kullanıcı bulunamadı.</td></tr>`;
    return;
  }

  usersTableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.full_name || "-")}</td>
      <td>${escapeHtml(row.email || "-")}</td>
      <td>${escapeHtml(row.role || "-")}</td>
      <td>${row.tokens ?? 0}</td>
      <td>${row.promo_used_at ? "Kullanmış" : "Yok"}</td>
      <td>${escapeHtml(fmt(row.package_ends_at))}</td>
      <td>${escapeHtml(row.id || "-")}</td>
    </tr>
  `).join("");
}

async function loadWallet() {
  const q = String(walletSearch?.value || "").trim().toLowerCase();

  const { data, error } = await supabase
    .from("wallet_tx")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    walletTableBody.innerHTML = `<tr><td colspan="5" class="empty">Hareketler yüklenemedi.</td></tr>`;
    return;
  }

  let rows = Array.isArray(data) ? data : [];

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
}

function renderPromoPreview(row) {
  latestCreatedPromo = row || null;

  if (!row) {
    promoPreview.innerHTML = "Henüz promosyon oluşturulmadı.";
    return;
  }

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

async function createPromoRecord(payload) {
  const gType = String(payload.grant_type || "").trim();
  const dType = String(payload.delivery_type || "").trim();
  const cName = String(payload.campaign_name || "").trim();
  const cCode = String(payload.campaign_code || "").trim().toUpperCase() || generateCampaignCode();
  const desc = String(payload.description || "").trim();
  const months = Number(payload.membership_months || 0);
  const tokens = Number(payload.token_amount || 0);
  const pkg = String(payload.package_code || "").trim() || "member";
  const userLimit = Math.max(1, Number(payload.per_user_limit || 1));
  const codeVal = String(payload.code_value || "").trim().toUpperCase() || generatePromoCode();
  const nfcUid = String(payload.nfc_uid || "").trim() || null;

  if (!cName) throw new Error("Campaign adı gerekli");
  if (!["membership", "tokens", "bundle"].includes(gType)) throw new Error("Geçersiz tür");
  if (!["manual", "qr", "nfc"].includes(dType)) throw new Error("Geçersiz teslim tipi");
  if (gType === "membership" && months <= 0) throw new Error("Üyelik ayı gerekli");
  if (gType === "tokens" && tokens <= 0) throw new Error("Jeton miktarı gerekli");
  if (gType === "bundle" && months <= 0 && tokens <= 0) throw new Error("Bundle için üyelik veya jeton gerekli");

  const { data: campaignData, error: campaignErr } = await supabase
    .from("promo_campaigns")
    .insert({
      code: cCode,
      name: cName,
      description: desc || cName,
      is_active: true,
      grant_type: gType,
      membership_months: months,
      token_amount: tokens,
      package_code: pkg,
      stack_mode: "extend",
      per_user_limit: userLimit
    })
    .select("*")
    .single();

  if (campaignErr || !campaignData) {
    throw new Error(campaignErr?.message || "Campaign kaydedilemedi");
  }

  const { data: codeData, error: codeErr } = await supabase
    .from("promo_codes")
    .insert({
      campaign_id: campaignData.id,
      code_value: codeVal,
      delivery_type: dType,
      nfc_uid: dType === "nfc" ? nfcUid : null,
      is_active: true,
      is_used: false
    })
    .select("*")
    .single();

  if (codeErr || !codeData) {
    throw new Error(codeErr?.message || "Promosyon kodu kaydedilemedi");
  }

  return {
    ...codeData,
    campaign_name: campaignData.name,
    campaign_code: campaignData.code,
    grant_type: campaignData.grant_type,
    membership_months: campaignData.membership_months,
    token_amount: campaignData.token_amount,
    package_code: campaignData.package_code,
    qr_url: buildQrUrl(codeVal)
  };
}

async function listPromoRecords(searchTerm = "") {
  const q = String(searchTerm || "").trim().toLowerCase();

  const { data, error } = await supabase
    .from("promo_codes")
    .select(`
      id,
      campaign_id,
      code_value,
      delivery_type,
      nfc_uid,
      is_active,
      is_used,
      used_by,
      used_at,
      bound_user_id,
      promo_campaigns (
        id,
        code,
        name,
        grant_type,
        membership_months,
        token_amount,
        package_code,
        is_active
      )
    `)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) throw error;

  let rows = Array.isArray(data) ? data.map((row) => {
    const campaign = Array.isArray(row.promo_campaigns) ? row.promo_campaigns[0] : row.promo_campaigns;
    return {
      ...row,
      campaign_name: campaign?.name || "-",
      campaign_code: campaign?.code || "-",
      grant_type: campaign?.grant_type || "-",
      membership_months: campaign?.membership_months || 0,
      token_amount: campaign?.token_amount || 0,
      package_code: campaign?.package_code || "",
      qr_url: buildQrUrl(row.code_value)
    };
  }) : [];

  if (q) {
    rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }

  return rows;
}

async function updatePromoCodeStatus(codeValue, makeActive) {
  const { error } = await supabase
    .from("promo_codes")
    .update({
      is_active: !!makeActive
    })
    .eq("code_value", codeValue);

  if (error) throw error;
}

async function loadPromoRecords() {
  try {
    const rows = await listPromoRecords(promoSearch?.value || "");

    if (!rows.length) {
      promoTableBody.innerHTML = `<tr><td colspan="10" class="empty">Promosyon bulunamadı.</td></tr>`;
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
        <td>${escapeHtml(statusTextFromCode(row))}</td>
        <td>${escapeHtml(row.used_by || row.bound_user_id || "-")}</td>
        <td>${escapeHtml(row.nfc_uid || "-")}</td>
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
          await updatePromoCodeStatus(btn.dataset.code, btn.dataset.action === "on");
          setStatus(promoStatus, "Promosyon durumu güncellendi.", "status-ok");
          await loadPromoRecords();
        } catch (e) {
          setStatus(promoStatus, "Promosyon durumu güncellenemedi: " + (e.message || e), "status-err");
        }
      });
    });
  } catch (e) {
    promoTableBody.innerHTML = `<tr><td colspan="10" class="empty">Promosyonlar yüklenemedi.</td></tr>`;
  }
}

async function loadPromoLogs() {
  try {
    const search = String(promoLogSearch?.value || "").trim().toLowerCase();

    const { data, error } = await supabase
      .from("promo_redemptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) throw error;

    let rows = Array.isArray(data) ? data : [];

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
  const n = Number(amount || 0);
  if (!userId) throw new Error("Kullanıcı UID gerekli");
  if (!Number.isFinite(n) || n <= 0) throw new Error("Geçerli jeton miktarı gerekli");

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("tokens")
    .eq("id", userId)
    .maybeSingle();

  if (profErr || !prof) throw new Error("Kullanıcı bulunamadı");

  const currentTokens = Number(prof.tokens || 0);
  const nextTokens = currentTokens + n;

  const { error: updErr } = await supabase
    .from("profiles")
    .update({ tokens: nextTokens })
    .eq("id", userId);

  if (updErr) throw updErr;

  const { error: txErr } = await supabase
    .from("wallet_tx")
    .insert({
      user_id: userId,
      type: "credit",
      amount: n,
      delta: n,
      reason: "manual_admin_load",
      note: String(note || "").trim() || "Manual admin token load",
      created_at: new Date().toISOString()
    });

  if (txErr) throw txErr;

  return { tokens_after: nextTokens };
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

  savePromoBtn?.addEventListener("click", async () => {
    try {
      setStatus(promoStatus, "Promosyon kaydediliyor...", "status-warn");

      const row = await createPromoRecord({
        campaign_code: campaignCode.value.trim(),
        campaign_name: campaignName.value.trim(),
        description: campaignDescription.value.trim(),
        grant_type: grantType.value,
        delivery_type: deliveryType.value,
        membership_months: membershipMonths.value,
        token_amount: tokenAmount.value,
        package_code: packageCode.value.trim(),
        per_user_limit: perUserLimit.value,
        code_value: promoCodeValue.value.trim(),
        nfc_uid: promoNfcUid.value.trim()
      });

      setStatus(
        promoStatus,
        `Promosyon oluşturuldu • Kod: ${row.code_value} • Tür: ${row.grant_type} • ${row.membership_months || 0} ay • ${row.token_amount || 0} jeton`,
        "status-ok"
      );

      renderPromoPreview(row);

      campaignCode.value = "";
      campaignName.value = "";
      campaignDescription.value = "";
      membershipMonths.value = "";
      tokenAmount.value = "";
      packageCode.value = "";
      perUserLimit.value = "1";
      promoCodeValue.value = "";
      promoNfcUid.value = "";

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
            body{
              margin:0;
              font-family:Arial,sans-serif;
              background:#fff;
              color:#111;
              display:flex;
              justify-content:center;
              align-items:center;
              min-height:100vh;
            }
            .card{
              width:360px;
              border:2px solid #111;
              border-radius:24px;
              padding:24px;
              text-align:center;
            }
            .brand{
              font-size:28px;
              font-weight:900;
              margin-bottom:8px;
            }
            .campaign{
              font-size:20px;
              font-weight:900;
              margin-bottom:8px;
            }
            .benefit{
              font-size:18px;
              font-weight:800;
              margin-bottom:16px;
            }
            .qr{
              width:280px;
              height:280px;
              object-fit:contain;
              margin:0 auto 16px;
              display:block;
            }
            .code{
              font-size:26px;
              font-weight:900;
              letter-spacing:2px;
              margin-top:10px;
            }
            .sub{
              margin-top:10px;
              font-size:14px;
              line-height:1.5;
            }
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
            window.onload = () => {
              setTimeout(() => window.print(), 250);
            };
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

  await Promise.allSettled([loadUsers(), loadWallet(), loadPromoRecords(), loadPromoLogs()]);

  document.getElementById("pageContent")?.classList.add("ready");
}

init();
