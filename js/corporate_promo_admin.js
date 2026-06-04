import { supabase } from "/js/supabase_client.js";

const PANEL_ID = "panelPromo";
const API_BASE = "https://italky-api.onrender.com/api/admin";

const LETTERS = "ABCDEFGHJKLMNPRSTUVYZ";
const DIGITS = "0123456789";
const BANNED_PAIRS = new Set(["AK", "FG", "FB", "GS"]);
const DURATION_OPTIONS = {
  30: { months: 1, label: "30 gün", suffix: "1AY" },
  90: { months: 3, label: "90 gün", suffix: "3AY" },
  180: { months: 6, label: "180 gün", suffix: "6AY" },
  365: { months: 12, label: "365 gün", suffix: "12AY" }
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setStatus(message, isError = false) {
  const el = $("corpPromoStatus");
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("status-err", !!isError);
  el.classList.toggle("status-ok", !isError && !!message);
}

function pick(source) {
  return source[Math.floor(Math.random() * source.length)];
}

function generatePromoCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const letters = `${pick(LETTERS)}${pick(LETTERS)}`;
    if (BANNED_PAIRS.has(letters)) continue;
    const digits = Array.from({ length: 6 }, () => pick(DIGITS)).join("");
    return `${letters}${digits}`;
  }
  throw new Error("Kod üretilemedi");
}

function slugify(value) {
  const trMap = { Ç: "C", Ğ: "G", İ: "I", I: "I", Ö: "O", Ş: "S", Ü: "U", ç: "C", ğ: "G", ı: "I", i: "I", ö: "O", ş: "S", ü: "U" };
  const normalized = String(value || "GENEL")
    .replace(/[ÇĞİIÖŞÜçğıiöşü]/g, (ch) => trMap[ch] || ch)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28);
  return normalized || "GENEL";
}

function durationConfig(durationDays) {
  const cfg = DURATION_OPTIONS[Number(durationDays)];
  if (!cfg) throw new Error("Geçersiz süre seçimi");
  return cfg;
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || "";
  if (!token) throw new Error("Token yok. Lütfen tekrar giriş yapın.");
  return token;
}

async function apiJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getToken()}`,
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let json = {};
  if (text) {
    try { json = JSON.parse(text); }
    catch { json = { detail: text.slice(0, 500) }; }
  }

  if (!res.ok) {
    const detail = json?.detail || `HTTP ${res.status}`;
    if (res.status === 401) throw new Error(`Yetki yok: Token geçersiz veya eksik. (${detail})`);
    if (res.status === 403) throw new Error(`Yetki yok: profiles.role admin/superadmin olmalı. (${detail})`);
    throw new Error(String(detail));
  }
  return json;
}

async function requireAdmin() {
  await apiJson("/me", { method: "GET" });
}

async function listCampaigns() {
  const json = await apiJson("/promo/campaigns", { method: "GET" });
  return Array.isArray(json?.items) ? json.items : [];
}

function campaignCodeFor(name, durationDays) {
  const cfg = durationConfig(durationDays);
  return `PROMO_${slugify(name)}_${cfg.suffix}`;
}

function campaignNameFor(name, durationDays) {
  const cfg = durationConfig(durationDays);
  return `${String(name || "Genel Kampanya").trim() || "Genel Kampanya"} - ${cfg.label}`;
}

function getCampaignFromResponse(json) {
  const item = Array.isArray(json?.item) ? json.item[0] : json?.item;
  if (!item?.id) throw new Error("Kampanya id alınamadı");
  return item;
}

async function ensureCampaign({ name, durationDays, note }) {
  const cfg = durationConfig(durationDays);
  const code = campaignCodeFor(name, durationDays);
  const existing = (await listCampaigns()).find((row) => String(row?.code || "").toUpperCase() === code);
  if (existing?.id) return existing;

  try {
    const created = await apiJson("/promo/campaigns", {
      method: "POST",
      body: JSON.stringify({
        code,
        name: campaignNameFor(name, durationDays),
        description: note || `${name} promosyon kodları`,
        is_active: true,
        grant_type: "membership",
        membership_months: cfg.months,
        token_amount: 0,
        package_code: "promo_code",
        stack_mode: "extend",
        per_user_limit: 1
      })
    });
    return getCampaignFromResponse(created);
  } catch (e) {
    if (String(e?.message || "").includes("CAMPAIGN_CODE_ALREADY_EXISTS")) {
      const retry = (await listCampaigns()).find((row) => String(row?.code || "").toUpperCase() === code);
      if (retry?.id) return retry;
    }
    throw e;
  }
}

function extractCreatedCode(json, expectedCode) {
  const item = Array.isArray(json?.item) ? json.item[0] : json?.item;
  if (!item?.code_value) throw new Error(`Kod oluşturuldu yanıtı eksik: ${expectedCode}`);
  return item;
}

async function createCodeWithRetry(campaignId) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const codeValue = generatePromoCode();
    try {
      const json = await apiJson("/promo/codes", {
        method: "POST",
        body: JSON.stringify({
          campaign_id: campaignId,
          code_value: codeValue,
          delivery_type: "manual",
          nfc_uid: null,
          is_active: true
        })
      });
      return extractCreatedCode(json, codeValue);
    } catch (e) {
      if (String(e?.message || "").includes("PROMO_CODE_ALREADY_EXISTS")) continue;
      throw e;
    }
  }
  throw new Error("Benzersiz kod üretilemedi");
}

function normalizeRow(row) {
  const campaign = Array.isArray(row?.promo_campaigns) ? row.promo_campaigns[0] : row?.promo_campaigns;
  return {
    code_value: row?.code_value || "",
    delivery_type: row?.delivery_type || "manual",
    is_active: !!row?.is_active,
    is_used: !!row?.is_used,
    created_at: row?.created_at || "",
    campaign_code: campaign?.code || row?.campaign_code || "-",
    campaign_name: campaign?.name || row?.campaign_name || "-",
    membership_months: Number(campaign?.membership_months || row?.membership_months || 0)
  };
}

function renderRows(rows) {
  const body = $("corpPromoResultBody");
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty">Henüz kod oluşturulmadı.</td></tr>';
    return;
  }
  body.innerHTML = rows.map((raw) => {
    const row = normalizeRow(raw);
    const status = row.is_used ? "Kullanıldı" : (row.is_active ? "Aktif" : "Pasif");
    const createdAt = row.created_at ? new Date(row.created_at).toLocaleString("tr-TR") : "-";
    return `
      <tr>
        <td><b>${escapeHtml(row.code_value)}</b></td>
        <td>${escapeHtml(row.campaign_name)}</td>
        <td>${escapeHtml(row.campaign_code)}</td>
        <td>${escapeHtml(row.membership_months ? `${row.membership_months} ay` : "-")}</td>
        <td>${escapeHtml(row.delivery_type)}</td>
        <td>${escapeHtml(status)}</td>
        <td>${escapeHtml(createdAt)}</td>
      </tr>
    `;
  }).join("");
}

async function loadLatestCodes() {
  const json = await apiJson("/promo/codes", { method: "GET" });
  const rows = Array.isArray(json?.items) ? json.items : [];
  renderRows(rows.slice(0, 25));
}

async function generateCodes() {
  const btn = $("corpPromoGenerateBtn");
  try {
    if (btn) btn.disabled = true;
    setStatus("Kodlar oluşturuluyor...");

    await requireAdmin();

    const name = String($("corpPromoName")?.value || "").trim();
    if (name.length < 2) throw new Error("Kampanya / müşteri adı yazmalısınız. Örn: Samsung Kodları");

    const count = Math.max(1, Math.min(500, Number($("corpPromoCount")?.value || 1)));
    const durationDays = Number($("corpPromoDuration")?.value || 365);
    const note = String($("corpPromoNote")?.value || "").trim();

    const campaign = await ensureCampaign({ name, durationDays, note });
    const createdRows = [];

    for (let i = 0; i < count; i += 1) {
      setStatus(`Kodlar oluşturuluyor... (${i + 1}/${count})`);
      const created = await createCodeWithRetry(campaign.id);
      createdRows.push({
        ...created,
        campaign_code: campaign.code,
        campaign_name: campaign.name,
        membership_months: campaign.membership_months
      });
    }

    renderRows(createdRows);
    setStatus(`${createdRows.length} adet kod oluşturuldu. Kampanya: ${campaign.name}`);
    await loadLatestCodes();
  } catch (e) {
    console.error("promo generation failed:", e);
    setStatus(e?.message || "Kod oluşturulamadı", true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderShell() {
  const panel = $(PANEL_ID);
  if (!panel || panel.dataset.corporatePromoReady === "1") return;
  panel.dataset.corporatePromoReady = "1";
  panel.innerHTML = `
    <section class="card">
      <h3>Promosyon Kodu Oluştur</h3>
      <div class="desc">Samsung, bayi, Trendyol veya farklı kampanyalar için kod üret. Kodlar uygulamadaki Kod ile Gün Yükle ekranında çalışır.</div>
      <div class="grid grid-2">
        <label>Kampanya / Müşteri Adı
          <input id="corpPromoName" type="text" placeholder="Örn: Samsung Kodları" />
        </label>
        <label>Kod Sayısı
          <input id="corpPromoCount" type="number" min="1" max="500" value="1" />
        </label>
        <label>Süre
          <select id="corpPromoDuration">
            <option value="30">30 gün</option>
            <option value="90">90 gün</option>
            <option value="180">180 gün</option>
            <option value="365" selected>365 gün / 12 ay</option>
          </select>
        </label>
        <label>Not
          <input id="corpPromoNote" type="text" placeholder="Satış / bayi / açıklama notu" />
        </label>
      </div>
      <div class="row" style="margin-top:12px">
        <button id="corpPromoGenerateBtn" class="btn-primary" type="button">Kodları Oluştur</button>
        <button id="corpPromoRefreshBtn" class="btn-secondary" type="button">Son Kodları Yenile</button>
      </div>
      <div id="corpPromoStatus" class="status-line"></div>
      <div class="table">
        <table>
          <thead>
            <tr><th>Kod</th><th>Kampanya</th><th>Kampanya Kodu</th><th>Süre</th><th>Teslim</th><th>Durum</th><th>Tarih</th></tr>
          </thead>
          <tbody id="corpPromoResultBody"><tr><td colspan="7" class="empty">Henüz kod oluşturulmadı.</td></tr></tbody>
        </table>
      </div>
    </section>
  `;

  $("corpPromoGenerateBtn")?.addEventListener("click", generateCodes);
  $("corpPromoRefreshBtn")?.addEventListener("click", () => loadLatestCodes().catch((e) => setStatus(e?.message || "Kodlar alınamadı", true)));
  requireAdmin().then(loadLatestCodes).catch((e) => setStatus(e?.message || "Admin doğrulanamadı", true));
}

function boot() {
  renderShell();
  setTimeout(renderShell, 500);
  setTimeout(renderShell, 1200);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
