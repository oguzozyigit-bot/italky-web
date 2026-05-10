import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com/api/admin/corporate-promos";
const PANEL_ID = "panelPromo";

let latestRows = [];

function $(id) { return document.getElementById(id); }

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fmt(value) {
  if (!value) return "-";
  try { return new Date(value).toLocaleString("tr-TR"); }
  catch { return "-"; }
}

function statusText(value) {
  const status = String(value || "").toLowerCase();
  if (status === "activated") return "Aktive";
  if (status === "expired") return "Süresi Doldu";
  if (status === "cancelled") return "İptal";
  return "Aktif";
}

async function token() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || "";
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await token()}`,
      ...(options.headers || {})
    }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.detail || `İstek başarısız: ${res.status}`);
  return json;
}

function setStatus(message = "", cls = "") {
  const el = $("corpPromoStatus");
  if (!el) return;
  el.className = `status-line ${cls}`.trim();
  el.textContent = message;
}

function renderShell() {
  const panel = $(PANEL_ID);
  if (!panel || panel.dataset.corporatePromoReady === "1") return;
  panel.dataset.corporatePromoReady = "1";
  panel.innerHTML = `
    <div class="grid grid-2">
      <section class="card">
        <h3>Kurumsal Promosyon Kodu Oluştur</h3>
        <div class="desc">Firma için toplu üyelik kodu üretir. Üyelik süresi kod kullanıcı tarafından aktive edilince başlar.</div>

        <div class="row">
          <input id="corpCompanyName" type="text" placeholder="Firma / Kampanya Adı (örn: ABC Turizm 2026)" />
          <input id="corpQuantity" type="number" min="1" step="1" value="100" placeholder="Kod Adedi" />
        </div>

        <div class="row" style="margin-top:10px">
          <select id="corpDurationMonths">
            <option value="1">1 ay</option>
            <option value="3">3 ay</option>
            <option value="6">6 ay</option>
            <option value="12" selected>12 ay</option>
          </select>
          <input id="corpValidUntil" type="date" />
        </div>

        <textarea id="corpNote" style="margin-top:10px" placeholder="Not (opsiyonel)"></textarea>
        <button id="corpGenerateBtn" class="btn-primary" type="button" style="margin-top:10px">Kodları Oluştur</button>
        <div id="corpPromoStatus" class="status-line"></div>
      </section>

      <section class="card">
        <h3>Rapor Özeti</h3>
        <div class="desc">Aktive edilen kod adedi kurumsal tahsilat için baz alınır.</div>
        <div id="corpStats" class="preview-box">Rapor yükleniyor...</div>
        <button id="corpExportBtn" class="btn-secondary" type="button" style="margin-top:12px">CSV Dışa Aktar</button>
      </section>
    </div>

    <section class="card" style="margin-top:14px">
      <h3>Kurumsal Kod Raporu</h3>
      <div class="row">
        <input id="corpFilterCompany" type="text" placeholder="Firma / kampanya ara" />
        <select id="corpFilterStatus">
          <option value="">Tüm durumlar</option>
          <option value="active">Aktif</option>
          <option value="activated">Aktive</option>
          <option value="expired">Süresi Doldu</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>
      <div class="row" style="margin-top:10px">
        <input id="corpFilterFrom" type="date" />
        <input id="corpFilterTo" type="date" />
        <button id="corpRefreshBtn" class="btn-secondary" type="button">Raporu Yenile</button>
      </div>

      <div class="table">
        <table>
          <thead>
            <tr>
              <th>Kod</th>
              <th>Firma</th>
              <th>Süre</th>
              <th>Giriş Son Tarihi</th>
              <th>Durum</th>
              <th>E-posta</th>
              <th>Telefon</th>
              <th>Aktivasyon</th>
              <th>Üyelik Bitişi</th>
            </tr>
          </thead>
          <tbody id="corpPromoTableBody">
            <tr><td colspan="9" class="empty">Yükleniyor...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  bindCorporatePromo();
  loadReport();
}

function renderStats(stats = {}) {
  const el = $("corpStats");
  if (!el) return;
  el.innerHTML = `
    <div><b>Toplam üretilen:</b> ${Number(stats.total || 0)}</div>
    <div><b>Aktive edilen:</b> ${Number(stats.activated || 0)}</div>
    <div><b>Kullanılmayan:</b> ${Number(stats.unused || 0)}</div>
    <div><b>Süresi dolan:</b> ${Number(stats.expired || 0)}</div>
    <div><b>Bu ay aktive edilen:</b> ${Number(stats.activated_this_month || 0)}</div>
    <div><b>Tahsil edilecek adet:</b> ${Number(stats.billable_count || 0)}</div>
  `;
}

function renderRows(rows = []) {
  latestRows = rows;
  const tbody = $("corpPromoTableBody");
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">Kayıt bulunamadı.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.code)}</td>
      <td>${escapeHtml(row.company_name || row.campaign_name || "-")}</td>
      <td>${Number(row.duration_months || 0)} ay</td>
      <td>${escapeHtml(fmt(row.valid_until))}</td>
      <td>${escapeHtml(statusText(row.status))}</td>
      <td>${escapeHtml(row.activated_email || "-")}</td>
      <td>${escapeHtml(row.activated_phone || "-")}</td>
      <td>${escapeHtml(fmt(row.activated_at))}</td>
      <td>${escapeHtml(fmt(row.membership_ends_at))}</td>
    </tr>
  `).join("");
}

async function loadReport() {
  try {
    const params = new URLSearchParams();
    const company = $("corpFilterCompany")?.value?.trim();
    const status = $("corpFilterStatus")?.value?.trim();
    const from = $("corpFilterFrom")?.value?.trim();
    const to = $("corpFilterTo")?.value?.trim();
    if (company) params.set("company", company);
    if (status) params.set("status", status);
    if (from) params.set("from_date", from);
    if (to) params.set("to_date", to);
    const json = await api(`/report?${params.toString()}`, { method: "GET" });
    renderStats(json.stats || {});
    renderRows(Array.isArray(json.items) ? json.items : []);
  } catch (e) {
    renderRows([]);
    setStatus(`Rapor yüklenemedi: ${e.message || e}`, "status-err");
  }
}

async function generateCodes() {
  const companyName = $("corpCompanyName")?.value?.trim();
  const quantity = Number($("corpQuantity")?.value || 0);
  const durationMonths = Number($("corpDurationMonths")?.value || 0);
  const validUntil = $("corpValidUntil")?.value?.trim();
  const note = $("corpNote")?.value?.trim();

  if (!companyName) throw new Error("Firma / kampanya adı gerekli");
  if (!quantity || quantity < 1) throw new Error("Kod adedi gerekli");
  if (![1, 3, 6, 12].includes(durationMonths)) throw new Error("Üyelik süresi geçersiz");
  if (!validUntil) throw new Error("Kod giriş son tarihi gerekli");

  const json = await api("/generate", {
    method: "POST",
    body: JSON.stringify({
      company_name: companyName,
      campaign_name: companyName,
      quantity,
      duration_months: durationMonths,
      valid_until: validUntil,
      note
    })
  });
  return json;
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv() {
  const headers = ["code", "company_name", "duration_months", "valid_until", "status", "activated_email", "activated_phone", "activated_at", "membership_ends_at", "sms_consent", "email_consent"];
  const lines = [headers.join(",")];
  latestRows.forEach((row) => {
    lines.push(headers.map((key) => csvValue(row[key])).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `italky-kurumsal-promo-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bindCorporatePromo() {
  $("corpGenerateBtn")?.addEventListener("click", async () => {
    try {
      setStatus("Kodlar oluşturuluyor...", "status-warn");
      const json = await generateCodes();
      setStatus(`${Number(json.inserted || 0)} adet kurumsal promosyon kodu oluşturuldu.`, "status-ok");
      await loadReport();
    } catch (e) {
      setStatus(`Kod oluşturulamadı: ${e.message || e}`, "status-err");
    }
  });
  $("corpRefreshBtn")?.addEventListener("click", loadReport);
  $("corpExportBtn")?.addEventListener("click", exportCsv);
  ["corpFilterCompany", "corpFilterStatus", "corpFilterFrom", "corpFilterTo"].forEach((id) => {
    $(id)?.addEventListener("change", loadReport);
  });
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
