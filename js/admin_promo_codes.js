import { supabase } from "/js/supabase_client.js";

const ADMIN_EMAILS = [
  "oguzozyigit@gmail.com"
];

const TABLE_NAME = "web_promo_codes";
const QR_BASE_URL = "https://italky.ai/kampanya?kod=";
const BASE_SELECT_COLUMNS = "code,days,status,max_uses,used_count,expires_at,note";
const NFC_SELECT_COLUMNS = "nfc_written,nfc_written_at,nfc_written_by,nfc_write_locked,nfc_write_note";
const PROMO_SELECT_COLUMNS = `${BASE_SELECT_COLUMNS},${NFC_SELECT_COLUMNS}`;
const DEFAULT_FILTER = "available";
const FILTER_OPTIONS = [
  ["available", "Kullanılabilir Kodlar"],
  ["active", "Aktif Tüm Kodlar"],
  ["nfc_unwritten", "NFC/QR Yazılmamış Kodlar"],
  ["nfc_written", "NFC’ye Yazılan Kodlar"],
  ["used", "Kullanılmış Kodlar"],
  ["inactive", "Pasif / Bloklu Kodlar"],
  ["all", "Tüm Kodlar"]
];
const BLOCKED_STATUSES = new Set(["blocked", "expired", "paused", "inactive"]);

const el = (id) => document.getElementById(id);

let currentSession = null;
let currentProfile = null;
let currentRowsByCode = new Map();
let allPromoRows = [];
let currentFilter = DEFAULT_FILTER;
let currentSearch = "";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function defaultExpiryDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function expiryToDbValue(value) {
  const date = String(value || "").trim();
  return date ? `${date}T23:59:59+03:00` : null;
}

function formatDate(value) {
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

function statusOf(row) {
  return String(row?.status || "").trim().toLowerCase();
}

function maxUsesOf(row) {
  return Number(row?.max_uses || 0);
}

function usedCountOf(row) {
  return Number(row?.used_count || 0);
}

function isExpired(row) {
  if (!row?.expires_at) return false;
  const expires = new Date(row.expires_at);
  return Number.isFinite(expires.getTime()) && expires.getTime() < Date.now();
}

function hasUsesLeft(row) {
  const maxUses = maxUsesOf(row);
  if (maxUses <= 0) return true;
  return usedCountOf(row) < maxUses;
}

function isUsed(row) {
  const status = statusOf(row);
  const maxUses = maxUsesOf(row);
  return status === "used" || (maxUses > 0 && usedCountOf(row) >= maxUses);
}

function isBlockedOrInactive(row) {
  return BLOCKED_STATUSES.has(statusOf(row)) || isExpired(row);
}

function randomPart(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const cryptoObj = window.crypto || window.msCrypto;
  const bytes = new Uint32Array(length);
  let out = "";

  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) {
      out += chars[bytes[i] % chars.length];
    }
    return out;
  }

  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generatedSingleCode(days) {
  return `ITKY-${days}-GIFT-${randomPart(6)}`;
}

function generatedSeriesCode(prefix, existingCodes) {
  const cleanPrefix = normalizeCode(prefix || "ITKY-GIFT") || "ITKY-GIFT";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = `${cleanPrefix}-${randomPart(6)}`;
    if (!existingCodes.has(code)) {
      existingCodes.add(code);
      return code;
    }
  }
  throw new Error("Benzersiz seri kod üretilemedi.");
}

function qrLinkForCode(code) {
  return `${QR_BASE_URL}${encodeURIComponent(code)}`;
}

function currentUserLabel() {
  return (
    currentSession?.user?.email ||
    currentProfile?.email ||
    currentSession?.user?.id ||
    "admin"
  );
}

function canUnlockNfc() {
  return isAdminUser(currentSession, currentProfile);
}

function nfcStateForRow(row) {
  return {
    publicNote: String(row.note || "").trim(),
    locked: row.nfc_written === true || row.nfc_write_locked === true,
    writtenAt: row.nfc_written_at || "",
    writeNote: row.nfc_write_note || ""
  };
}

function filterLabel(value = currentFilter) {
  return FILTER_OPTIONS.find(([key]) => key === value)?.[1] || "Kullanılabilir Kodlar";
}

function rowMatchesFilter(row, filter = currentFilter) {
  const status = statusOf(row);
  const nfcLocked = nfcStateForRow(row).locked;

  switch (filter) {
    case "available":
      return status === "active" && hasUsesLeft(row) && !nfcLocked && !isExpired(row);
    case "active":
      return status === "active";
    case "nfc_unwritten":
      return status === "active" && !nfcLocked;
    case "nfc_written":
      return nfcLocked;
    case "used":
      return isUsed(row);
    case "inactive":
      return isBlockedOrInactive(row);
    case "all":
      return true;
    default:
      return status === "active" && hasUsesLeft(row) && !nfcLocked && !isExpired(row);
  }
}

function rowMatchesSearch(row) {
  const search = currentSearch.trim().toLowerCase();
  if (!search) return true;
  return (
    String(row.code || "").toLowerCase().includes(search) ||
    String(row.note || "").toLowerCase().includes(search)
  );
}

function filteredPromoRows() {
  return allPromoRows.filter((row) => rowMatchesFilter(row) && rowMatchesSearch(row));
}

function renderFilterOptions() {
  return FILTER_OPTIONS.map(([value, label]) => (
    `<option value="${escapeHtml(value)}"${value === DEFAULT_FILTER ? " selected" : ""}>${escapeHtml(label)}</option>`
  )).join("");
}

function renderRowBadges(row) {
  const status = statusOf(row);
  const nfcLocked = nfcStateForRow(row).locked;
  const badges = [];

  if (status === "active") badges.push("Aktif");
  if (isUsed(row)) badges.push("Kullanıldı");
  if (nfcLocked) badges.push("NFC yazıldı");
  if (!nfcLocked) badges.push("NFC yazılmadı");
  if (isBlockedOrInactive(row)) badges.push(isExpired(row) ? "Süresi doldu" : "Pasif / Bloklu");

  if (!badges.length) badges.push(status || "-");

  return badges.map((label) => `<span class="pill">${escapeHtml(label)}</span>`).join("");
}

function updateFilterSummary(visibleCount) {
  const summary = el("webPromoFilterSummary");
  if (!summary) return;
  const searchPart = currentSearch.trim() ? `, arama: “${currentSearch.trim()}”` : "";
  summary.textContent = `${filterLabel()} filtresi: ${visibleCount} / ${allPromoRows.length} kod gösteriliyor${searchPart}. NFC/QR için ayrılmış kodları “NFC’ye Yazılan Kodlar” filtresinde görebilirsiniz.`;
}

function renderFilteredCodes() {
  const rows = filteredPromoRows();
  renderCodes(rows);
  updateFilterSummary(rows.length);
  return rows;
}

function formatNfcDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

function ensureNfcWriteSupported() {
  if (!("NDEFReader" in window)) {
    throw new Error("NFC yazma sadece Android Chrome üzerinde desteklenir.");
  }

  if (!window.isSecureContext) {
    throw new Error("NFC yazma için admin paneli HTTPS üzerinden açılmalı.");
  }
}

async function writeNfcLink(url) {
  ensureNfcWriteSupported();
  const writer = new window.NDEFReader();
  try {
    await writer.write({
      records: [
        {
          recordType: "url",
          data: url
        }
      ]
    });
  } catch (error) {
    console.warn("[admin promo codes] url record write failed, falling back to text/url write", error);
    await writer.write(url);
  }
}

function setStatus(message, type = "") {
  const status = el("webPromoStatus");
  if (!status) return;
  status.textContent = message || "";
  status.className = `status-line ${type ? `status-${type}` : ""}`.trim();
}

function setGuard(message) {
  const guard = el("webPromoGuard");
  const content = el("webPromoContent");

  if (guard) {
    guard.textContent = message || "";
    guard.classList.toggle("hidden", !message);
  }

  if (content) {
    content.hidden = Boolean(message);
  }
}

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role,is_admin,email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[admin promo codes] profile lookup failed", error);
    return null;
  }

  return data || null;
}

function isAdminUser(session, profile) {
  const email = normalizeEmail(session?.user?.email || profile?.email);
  const role = String(profile?.role || "").toLowerCase();

  return (
    ADMIN_EMAILS.map(normalizeEmail).includes(email) ||
    profile?.is_admin === true ||
    role === "admin" ||
    role === "superadmin"
  );
}

async function requireAdmin() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  currentSession = data?.session || null;
  if (!currentSession) {
    return {
      ok: false,
      message: "Bu sayfaya erişmek için admin hesabıyla giriş yapmalısınız."
    };
  }

  currentProfile = await loadProfile(currentSession.user.id);
  if (!isAdminUser(currentSession, currentProfile)) {
    return {
      ok: false,
      message: "Bu sayfaya erişim yetkiniz yok."
    };
  }

  return { ok: true };
}

function selectedMode() {
  return el("webPromoMode")?.value || "single";
}

function selectedDays() {
  const select = el("webPromoDays");
  if (select?.value === "custom") {
    return clampNumber(el("webPromoCustomDays")?.value, 1, 3650, 365);
  }
  return clampNumber(select?.value, 1, 3650, 365);
}

function selectedMaxUses() {
  if ((el("webPromoUseMode")?.value || "single") === "single") return 1;
  return clampNumber(el("webPromoMaxUses")?.value, 1, 100000, 1);
}

function syncFormVisibility() {
  const isSeries = selectedMode() === "series";
  const isCustomDays = el("webPromoDays")?.value === "custom";
  const isMultiUse = el("webPromoUseMode")?.value === "multi";

  document.querySelectorAll("[data-web-promo-single]").forEach((node) => {
    node.hidden = isSeries;
  });
  document.querySelectorAll("[data-web-promo-series]").forEach((node) => {
    node.hidden = !isSeries;
  });

  const customDays = el("webPromoCustomDaysWrap");
  const maxUses = el("webPromoMaxUsesWrap");
  if (customDays) customDays.hidden = !isCustomDays;
  if (maxUses) maxUses.hidden = !isMultiUse;
}

function isDuplicateError(error) {
  const text = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`;
  return text.includes("23505") || /duplicate|unique|already exists/i.test(text);
}

function isMissingColumnError(error, columnName) {
  const text = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`;
  return text.includes(columnName) || /column/i.test(text);
}

async function createPayloads() {
  const mode = selectedMode();
  const days = selectedDays();
  const maxUses = selectedMaxUses();
  const expiresAt = expiryToDbValue(el("webPromoExpires")?.value || defaultExpiryDate());
  const note = String(el("webPromoNote")?.value || "").trim();
  const base = {
    days,
    status: "active",
    max_uses: maxUses,
    used_count: 0,
    expires_at: expiresAt,
    note
  };

  if (mode === "single") {
    const manualCode = normalizeCode(el("webPromoSingleCode")?.value);
    const code = manualCode || generatedSingleCode(days);
    if (!code) throw new Error("Kod oluşturulamadı.");
    return [{ ...base, code }];
  }

  const quantity = clampNumber(el("webPromoQuantity")?.value, 1, 500, 100);
  const prefix = el("webPromoPrefix")?.value || "ITKY-GIFT";
  const seen = new Set();
  const rows = [];

  for (let i = 0; i < quantity; i += 1) {
    rows.push({
      ...base,
      code: generatedSeriesCode(prefix, seen)
    });
  }

  return rows;
}

async function insertCodes(rows) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(rows)
    .select(PROMO_SELECT_COLUMNS);

  if (error) {
    if (isDuplicateError(error)) {
      throw new Error("Bu kodlardan biri zaten var. Lütfen farklı kod/prefix deneyin.");
    }
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function loadCodes() {
  let { data, error } = await supabase
    .from(TABLE_NAME)
    .select(PROMO_SELECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error && isMissingColumnError(error, "created_at")) {
    const fallback = await supabase
      .from(TABLE_NAME)
      .select(PROMO_SELECT_COLUMNS)
      .order("updated_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error && isMissingColumnError(error, "updated_at")) {
    const fallback = await supabase
      .from(TABLE_NAME)
      .select(PROMO_SELECT_COLUMNS)
      .order("code", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  allPromoRows = Array.isArray(data) ? data : [];
  renderFilteredCodes();
}

async function updateCodeStatus(code, status) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ status })
    .eq("code", code);

  if (error) throw error;
}

async function lockCodeNfcWrite(code) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      nfc_written: true,
      nfc_write_locked: true,
      nfc_written_at: new Date().toISOString(),
      nfc_written_by: currentUserLabel(),
      nfc_write_note: "NFC link yazıldı"
    })
    .eq("code", code);

  if (error) throw error;
}

async function unlockCodeNfcWrite(code) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      nfc_written: false,
      nfc_write_locked: false,
      nfc_written_at: null,
      nfc_written_by: null,
      nfc_write_note: null
    })
    .eq("code", code);

  if (error) throw error;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function downloadTextFile(fileName, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderCodes(rows) {
  const body = el("webPromoCodesBody");
  if (!body) return;
  currentRowsByCode = new Map(rows.map((row) => [normalizeCode(row.code), row]));

  if (!rows.length) {
    currentRowsByCode = new Map();
    const emptyMessage = allPromoRows.length
      ? "Bu filtrede gösterilecek kampanya kodu yok."
      : "Henüz kampanya kodu yok.";
    body.innerHTML = `<tr><td colspan="8" class="empty">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }

  body.innerHTML = rows.map((row) => {
    const code = normalizeCode(row.code);
    const url = qrLinkForCode(code);
    const status = String(row.status || "-");
    const maxUses = Number(row.max_uses || 0);
    const usedCount = Number(row.used_count || 0);
    const isActive = status.toLowerCase() === "active";
    const nfcState = nfcStateForRow(row);
    const nfcLocked = nfcState.locked;
    const nfcTitle = nfcLocked
      ? `NFC yazıldı: ${formatNfcDate(nfcState.writtenAt)}`
      : "Android Chrome ile NFC karta kampanya linkini yaz";
    const nfcActions = nfcLocked
      ? `
            <button class="btn-ok" type="button" disabled title="${escapeHtml(nfcTitle)}">NFC yazıldı</button>
            ${canUnlockNfc() ? `<button class="btn-warn" type="button" data-web-promo-action="nfc-unlock" data-code="${escapeHtml(code)}">NFC Kilidini Aç</button>` : ""}
        `
      : `<button class="btn-primary" type="button" data-web-promo-action="nfc-write" data-code="${escapeHtml(code)}" title="${escapeHtml(nfcTitle)}">NFC’ye Yaz</button>`;

    return `
      <tr>
        <td><b>${escapeHtml(code)}</b></td>
        <td>${escapeHtml(row.days)}</td>
        <td>${renderRowBadges(row)}</td>
        <td>${escapeHtml(`${usedCount} / ${maxUses}`)}</td>
        <td>${escapeHtml(formatDate(row.expires_at))}</td>
        <td>${escapeHtml(nfcState.publicNote || "-")}</td>
        <td><span title="${escapeHtml(url)}">${escapeHtml(url)}</span></td>
        <td>
          <div class="mini-actions">
            <button class="btn-secondary" type="button" data-web-promo-action="copy" data-code="${escapeHtml(code)}">Linki Kopyala</button>
            <button class="btn-secondary" type="button" data-web-promo-action="download" data-code="${escapeHtml(code)}">QR Link İndir</button>
            <button class="${isActive ? "btn-danger" : "btn-ok"}" type="button" data-web-promo-action="toggle" data-code="${escapeHtml(code)}" data-next-status="${isActive ? "inactive" : "active"}">${isActive ? "Pasifleştir" : "Aktif Et"}</button>
            ${nfcActions}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function refreshPromoPanel() {
  setStatus("Kodlar yükleniyor...", "warn");
  const auth = await requireAdmin();

  if (!auth.ok) {
    setGuard(auth.message);
    setStatus("");
    return;
  }

  setGuard("");
  await loadCodes();
  setStatus("Hazır.", "ok");
}

function renderPanel() {
  const panel = el("panelPromo");
  if (!panel || panel.dataset.webPromoReady === "1") return false;
  panel.dataset.webPromoReady = "1";

  panel.innerHTML = `
    <section class="card">
      <h3>Kampanya Kodları</h3>
      <div class="desc">Ücretsiz gün kodları oluştur, kampanya linklerini hazırla ve kullanım durumlarını takip et.</div>
      <div id="webPromoGuard" class="status-line status-err hidden"></div>

      <div id="webPromoContent">
        <form id="webPromoForm" autocomplete="off">
          <div class="grid grid-3">
            <label>
              Kod Tipi
              <select id="webPromoMode">
                <option value="single">Tek Kod</option>
                <option value="series">Benzersiz Seri Kod</option>
              </select>
            </label>

            <label data-web-promo-single>
              Kod
              <input id="webPromoSingleCode" type="text" placeholder="Boş bırakılırsa otomatik üretilir" />
            </label>

            <label data-web-promo-series hidden>
              Prefix
              <input id="webPromoPrefix" type="text" value="ITKY-GIFT" placeholder="ITKY-GIFT" />
            </label>

            <label data-web-promo-series hidden>
              Adet
              <input id="webPromoQuantity" type="number" min="1" max="500" value="100" />
            </label>

            <label>
              Gün Sayısı
              <select id="webPromoDays">
                <option value="1">1 gün</option>
                <option value="7">7 gün</option>
                <option value="30">30 gün</option>
                <option value="90">90 gün</option>
                <option value="180">180 gün</option>
                <option value="365" selected>365 gün</option>
                <option value="custom">Özel sayı</option>
              </select>
            </label>

            <label id="webPromoCustomDaysWrap" hidden>
              Özel Gün
              <input id="webPromoCustomDays" type="number" min="1" max="3650" value="365" />
            </label>

            <label>
              Kullanım Hakkı
              <select id="webPromoUseMode">
                <option value="single" selected>Tek kullanımlık</option>
                <option value="multi">Çok kullanımlı</option>
              </select>
            </label>

            <label id="webPromoMaxUsesWrap" hidden>
              Maksimum Kullanım
              <input id="webPromoMaxUses" type="number" min="1" max="100000" value="1" />
            </label>

            <label>
              Son Kullanma Tarihi
              <input id="webPromoExpires" type="date" />
            </label>
          </div>

          <div class="row" style="margin-top:10px">
            <input id="webPromoNote" type="text" placeholder="Not: Düzce fuar QR kodu" />
          </div>

          <div class="row" style="margin-top:12px">
            <button id="webPromoCreateBtn" class="btn-primary" type="submit">Kod Oluştur</button>
            <button id="webPromoRefreshBtn" class="btn-secondary" type="button">Listeyi Yenile</button>
          </div>
        </form>

        <div id="webPromoStatus" class="status-line"></div>

        <div class="grid grid-2" style="margin-top:14px">
          <label>
            Liste Filtresi
            <select id="webPromoFilter">
              ${renderFilterOptions()}
            </select>
          </label>

          <label>
            Kod / Not Ara
            <input id="webPromoSearch" type="search" placeholder="Kod veya not içinde ara" />
          </label>
        </div>
        <div id="webPromoFilterSummary" class="desc" style="margin-top:8px"></div>

        <div class="table">
          <table>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Gün</th>
                <th>Durum</th>
                <th>Kullanım</th>
                <th>Son Kullanma</th>
                <th>Not</th>
                <th>Tam Link</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody id="webPromoCodesBody">
              <tr><td colspan="8" class="empty">Kodlar yükleniyor...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  el("webPromoMode")?.addEventListener("change", syncFormVisibility);
  el("webPromoDays")?.addEventListener("change", syncFormVisibility);
  el("webPromoUseMode")?.addEventListener("change", syncFormVisibility);
  el("webPromoExpires").value = defaultExpiryDate();
  el("webPromoFilter").value = currentFilter;
  el("webPromoSearch").value = currentSearch;

  el("webPromoFilter")?.addEventListener("change", (event) => {
    currentFilter = event.target.value || DEFAULT_FILTER;
    const visibleRows = renderFilteredCodes();
    setStatus(`${filterLabel()} filtresi uygulandı. ${visibleRows.length} kod gösteriliyor.`, "ok");
  });

  el("webPromoSearch")?.addEventListener("input", (event) => {
    currentSearch = String(event.target.value || "").trim().toLowerCase();
    renderFilteredCodes();
  });

  el("webPromoForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const createBtn = el("webPromoCreateBtn");

    try {
      if (createBtn) createBtn.disabled = true;
      setStatus("Kodlar oluşturuluyor...", "warn");

      const auth = await requireAdmin();
      if (!auth.ok) {
        setGuard(auth.message);
        setStatus("");
        return;
      }

      const rows = await createPayloads();
      const created = await insertCodes(rows);
      const createdRows = created.length ? created : rows;
      const createdCodes = new Set(createdRows.map((row) => normalizeCode(row.code)));
      currentFilter = DEFAULT_FILTER;
      currentSearch = "";
      if (el("webPromoFilter")) el("webPromoFilter").value = currentFilter;
      if (el("webPromoSearch")) el("webPromoSearch").value = currentSearch;
      await loadCodes();
      const visibleCreatedCount = [...createdCodes].filter((code) => currentRowsByCode.has(code)).length;
      if (visibleCreatedCount > 0) {
        setStatus(`${createdRows.length} kod oluşturuldu. Yeni kodlar Kullanılabilir Kodlar listesinde görünüyor.`, "ok");
      } else {
        setStatus("Kod oluşturuldu ancak mevcut filtreye uymadığı için görünmüyor. Tüm Kodlar filtresinden görebilirsiniz.", "warn");
      }
    } catch (error) {
      console.error("[admin promo codes] create failed", error);
      setStatus(error?.message || "Kod oluşturulamadı.", "err");
    } finally {
      if (createBtn) createBtn.disabled = false;
    }
  });

  el("webPromoRefreshBtn")?.addEventListener("click", () => {
    refreshPromoPanel().catch((error) => {
      console.error("[admin promo codes] refresh failed", error);
      setStatus(error?.message || "Liste yenilenemedi.", "err");
    });
  });

  el("webPromoCodesBody")?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-web-promo-action]");
    if (!button) return;

    const code = normalizeCode(button.dataset.code);
    const action = button.dataset.webPromoAction;
    const url = qrLinkForCode(code);
    const shouldDisableButton = action === "nfc-write" || action === "nfc-unlock";

    try {
      if (shouldDisableButton) button.disabled = true;

      if (action === "copy") {
        await copyText(url);
        setStatus(`Link kopyalandı: ${url}`, "ok");
        return;
      }

      if (action === "download") {
        downloadTextFile(`${code}-qr-link.txt`, `${url}\n`);
        setStatus("QR link dosyası indirildi.", "ok");
        return;
      }

      if (action === "nfc-write") {
        const row = currentRowsByCode.get(code);
        if (!row) throw new Error("Kod satırı bulunamadı. Listeyi yenileyip tekrar deneyin.");

        if (nfcStateForRow(row).locked) {
          setStatus(`${code} zaten NFC'ye yazılmış. İkinci karta yazmak için önce kilidi açın.`, "warn");
          await loadCodes();
          return;
        }

        const approved = window.confirm(`Bu link NFC karta yazılacak: ${url}\n\nKartın eski içeriği değiştirilecek. Devam edilsin mi?`);
        if (!approved) {
          setStatus("NFC yazma iptal edildi.", "warn");
          return;
        }

        setStatus("Android Chrome NFC kartı isteyecek. Kartı telefona yaklaştırın.", "warn");
        await writeNfcLink(url);
        await lockCodeNfcWrite(code);
        await loadCodes();
        setStatus(`${code} NFC'ye yazıldı ve satır kilitlendi.`, "ok");
        return;
      }

      if (action === "nfc-unlock") {
        const row = currentRowsByCode.get(code);
        if (!row) throw new Error("Kod satırı bulunamadı. Listeyi yenileyip tekrar deneyin.");
        if (!canUnlockNfc()) throw new Error("NFC kilidini açma yetkiniz yok.");

        const approved = window.confirm("Bu kodun NFC yazıldı kilidi açılacak. Aynı kod yeniden başka karta yazılabilir. Emin misiniz?");
        if (!approved) {
          setStatus("NFC kilidi açma iptal edildi.", "warn");
          return;
        }

        await unlockCodeNfcWrite(code);
        await loadCodes();
        setStatus(`${code} için NFC kilidi açıldı.`, "ok");
        return;
      }

      if (action === "toggle") {
        await updateCodeStatus(code, button.dataset.nextStatus);
        await loadCodes();
        setStatus(`${code} durumu güncellendi.`, "ok");
      }
    } catch (error) {
      console.error("[admin promo codes] row action failed", error);
      setStatus(error?.message || "İşlem tamamlanamadı.", "err");
    } finally {
      if (shouldDisableButton && document.body.contains(button)) {
        button.disabled = false;
      }
    }
  });

  syncFormVisibility();
  refreshPromoPanel().catch((error) => {
    console.error("[admin promo codes] init failed", error);
    setGuard(error?.message || "Kampanya kodları paneli başlatılamadı.");
  });

  return true;
}

function boot() {
  if (renderPanel()) return;
  setTimeout(renderPanel, 300);
  setTimeout(renderPanel, 900);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
