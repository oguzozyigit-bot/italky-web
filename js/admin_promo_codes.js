import { supabase } from "/js/supabase_client.js";

const ADMIN_EMAILS = [
  "oguzozyigit@gmail.com"
];

const QR_BASE_URL = "https://italky.ai/kampanya?kod=";
const TABLE_NAME = "web_promo_codes";

const el = (id) => document.getElementById(id);

const guardMessage = el("guardMessage");
const adminContent = el("adminContent");
const promoForm = el("promoForm");
const refreshBtn = el("refreshBtn");
const logoutBtn = el("logoutBtn");
const createBtn = el("createBtn");
const formStatus = el("formStatus");
const codesBody = el("codesBody");
const qrPanel = el("qrPanel");
const qrUrl = el("qrUrl");

const singleCodeInput = el("singleCodeInput");
const prefixInput = el("prefixInput");
const quantityInput = el("quantityInput");
const daysSelect = el("daysSelect");
const customDaysField = el("customDaysField");
const customDaysInput = el("customDaysInput");
const singleUseInput = el("singleUseInput");
const maxUsesField = el("maxUsesField");
const maxUsesInput = el("maxUsesInput");
const expiresInput = el("expiresInput");
const noteInput = el("noteInput");

const seriesFields = Array.from(document.querySelectorAll(".series-field"));
const singleFields = Array.from(document.querySelectorAll(".single-field"));
const codeModeInputs = Array.from(document.querySelectorAll("input[name='codeMode']"));

let currentSession = null;
let currentProfile = null;

function setStatus(message, type = "") {
  formStatus.textContent = message || "";
  formStatus.className = `status ${type}`.trim();
}

function setGuard(message) {
  guardMessage.textContent = message || "";
  guardMessage.classList.toggle("visible", Boolean(message));
}

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

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function defaultExpiryDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function expiryToDbValue(value) {
  const date = String(value || "").trim();
  if (!date) return null;
  return `${date}T23:59:59+03:00`;
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

function qrLinkForCode(code) {
  return `${QR_BASE_URL}${encodeURIComponent(code)}`;
}

function randomPart(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const cryptoObj = window.crypto || window.msCrypto;
  const bytes = new Uint32Array(length);
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

function selectedMode() {
  return document.querySelector("input[name='codeMode']:checked")?.value || "single";
}

function selectedDays() {
  if (daysSelect.value === "custom") {
    return clampNumber(customDaysInput.value, 1, 3650, 365);
  }
  return clampNumber(daysSelect.value, 1, 3650, 365);
}

function selectedMaxUses() {
  if (singleUseInput.checked) return 1;
  return clampNumber(maxUsesInput.value, 1, 100000, 1);
}

function isDuplicateError(error) {
  const text = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`;
  return text.includes("23505") || /duplicate|unique|already exists/i.test(text);
}

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role,is_admin,email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[admin promo] profile lookup failed", error);
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

async function loadCodes() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("code,days,status,max_uses,used_count,expires_at,note")
    .order("code", { ascending: true });

  if (error) throw error;
  renderCodes(Array.isArray(data) ? data : []);
}

function renderCodes(rows) {
  if (!rows.length) {
    codesBody.innerHTML = '<tr><td colspan="8" class="empty">Henüz kampanya kodu yok.</td></tr>';
    return;
  }

  codesBody.innerHTML = rows.map((row) => {
    const code = normalizeCode(row.code);
    const url = qrLinkForCode(code);
    const status = String(row.status || "-");
    const maxUses = Number(row.max_uses || 0);
    const usedCount = Number(row.used_count || 0);
    const isActive = status.toLowerCase() === "active";
    const toggleLabel = isActive ? "Pasifleştir" : "Aktif Et";
    const toggleClass = isActive ? "danger" : "ok";

    return `
      <tr>
        <td class="code-cell">${escapeHtml(code)}</td>
        <td>${escapeHtml(row.days)}</td>
        <td>${escapeHtml(status)}</td>
        <td>${escapeHtml(`${usedCount} / ${maxUses}`)}</td>
        <td>${escapeHtml(formatDate(row.expires_at))}</td>
        <td>${escapeHtml(row.note || "-")}</td>
        <td><span class="qr-link" title="${escapeHtml(url)}">${escapeHtml(url)}</span></td>
        <td>
          <div class="row-actions">
            <button class="small-btn" type="button" data-action="copy" data-code="${escapeHtml(code)}">Linki Kopyala</button>
            <button class="small-btn" type="button" data-action="show" data-code="${escapeHtml(code)}">QR Göster</button>
            <button class="small-btn" type="button" data-action="download-link" data-code="${escapeHtml(code)}">QR Link İndir</button>
            <button class="small-btn ${toggleClass}" type="button" data-action="toggle" data-code="${escapeHtml(code)}" data-next-status="${isActive ? "inactive" : "active"}">${toggleLabel}</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
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

async function createPayloads() {
  const mode = selectedMode();
  const days = selectedDays();
  const maxUses = selectedMaxUses();
  const expiresAt = expiryToDbValue(expiresInput.value || defaultExpiryDate());
  const note = noteInput.value.trim();
  const usedCount = 0;
  const status = "active";

  if (mode === "single") {
    const manualCode = normalizeCode(singleCodeInput.value);
    const code = manualCode || generatedSingleCode(days);
    if (!code) throw new Error("Kod oluşturulamadı.");
    return [{
      code,
      days,
      status,
      max_uses: maxUses,
      used_count: usedCount,
      expires_at: expiresAt,
      note
    }];
  }

  const quantity = clampNumber(quantityInput.value, 1, 500, 100);
  const prefix = prefixInput.value || "ITKY-GIFT";
  const seen = new Set();
  const rows = [];

  for (let i = 0; i < quantity; i += 1) {
    rows.push({
      code: generatedSeriesCode(prefix, seen),
      days,
      status,
      max_uses: maxUses,
      used_count: usedCount,
      expires_at: expiresAt,
      note
    });
  }

  return rows;
}

async function insertCodes(rows) {
  const created = [];

  for (const row of rows) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(row)
      .select("code,days,status,max_uses,used_count,expires_at,note")
      .single();

    if (error) {
      if (isDuplicateError(error)) {
        throw new Error(`Bu kod zaten var: ${row.code}`);
      }
      throw error;
    }

    created.push(data);
  }

  return created;
}

async function updateCodeStatus(code, status) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ status })
    .eq("code", code);

  if (error) throw error;
}

function syncFormVisibility() {
  const mode = selectedMode();
  const series = mode === "series";
  seriesFields.forEach((node) => { node.hidden = !series; });
  singleFields.forEach((node) => { node.hidden = series; });
  customDaysField.hidden = daysSelect.value !== "custom";
  maxUsesField.hidden = singleUseInput.checked;
}

async function refreshPage() {
  setStatus("Kodlar yükleniyor...");
  const auth = await requireAdmin();
  if (!auth.ok) {
    adminContent.hidden = true;
    setGuard(auth.message);
    setStatus("");
    return;
  }

  setGuard("");
  adminContent.hidden = false;
  await loadCodes();
  setStatus("Hazır.");
}

promoForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    createBtn.disabled = true;
    setStatus("Kodlar oluşturuluyor...");

    const auth = await requireAdmin();
    if (!auth.ok) {
      adminContent.hidden = true;
      setGuard(auth.message);
      setStatus("", "error");
      return;
    }

    const rows = await createPayloads();
    const created = await insertCodes(rows);
    renderCodes(created);
    setStatus(`${created.length} kod oluşturuldu. QR/NFC linkleri hazır.`);
    await loadCodes();
  } catch (error) {
    console.error("[admin promo] create failed", error);
    setStatus(error?.message || "Kod oluşturulamadı.", "error");
  } finally {
    createBtn.disabled = false;
  }
});

codesBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const code = normalizeCode(button.dataset.code);
  const action = button.dataset.action;
  const url = qrLinkForCode(code);

  try {
    if (action === "copy") {
      await copyText(url);
      setStatus(`Link kopyalandı: ${url}`);
      return;
    }

    if (action === "show") {
      qrUrl.textContent = url;
      qrPanel.classList.add("visible");
      setStatus("QR link gösterildi. Görsel QR üretimi ikinci mini adımda eklenecek.", "warn");
      return;
    }

    if (action === "download-link") {
      downloadTextFile(`${code}-qr-link.txt`, `${url}\n`);
      setStatus("QR link dosyası indirildi. Görsel QR çıktısı ikinci mini adımda eklenecek.", "warn");
      return;
    }

    if (action === "toggle") {
      await updateCodeStatus(code, button.dataset.nextStatus);
      await loadCodes();
      setStatus(`${code} durumu güncellendi.`);
    }
  } catch (error) {
    console.error("[admin promo] row action failed", error);
    setStatus(error?.message || "İşlem tamamlanamadı.", "error");
  }
});

refreshBtn.addEventListener("click", () => {
  refreshPage().catch((error) => {
    console.error("[admin promo] refresh failed", error);
    setStatus(error?.message || "Liste yenilenemedi.", "error");
  });
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  adminContent.hidden = true;
  setGuard("Oturum kapatıldı. Bu sayfaya erişmek için admin hesabıyla giriş yapmalısınız.");
});

codeModeInputs.forEach((input) => input.addEventListener("change", syncFormVisibility));
daysSelect.addEventListener("change", syncFormVisibility);
singleUseInput.addEventListener("change", syncFormVisibility);

expiresInput.value = defaultExpiryDate();
syncFormVisibility();

refreshPage().catch((error) => {
  console.error("[admin promo] init failed", error);
  adminContent.hidden = true;
  setGuard(error?.message || "Admin sayfası başlatılamadı.");
});
