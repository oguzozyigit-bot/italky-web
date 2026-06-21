import { supabase } from "/js/supabase_client.js";

const PANEL_ID = "panelPromo";
const LETTERS = "ABCDEFGHJKLMNPRSTUVYZ";
const DIGITS = "0123456789";
const BANNED_PAIRS = new Set(["AK", "FG", "FB", "GS"]);
const DURATION_OPTIONS = {
  30: { months: 1, label: "30 gün", suffix: "1AY" },
  90: { months: 3, label: "90 gün", suffix: "3AY" },
  180: { months: 6, label: "180 gün", suffix: "6AY" },
  365: { months: 12, label: "365 gün", suffix: "12AY" }
};

function $(id) { return document.getElementById(id); }

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function setStatus(message, isError = false) {
  const el = $("corpPromoStatus");
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("status-err", !!isError);
  el.classList.toggle("status-ok", !isError && !!message);
}

function pick(source) { return source[Math.floor(Math.random() * source.length)]; }

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
  const normalized = String(value || "GENEL").replace(/[ÇĞİIÖŞÜçğıiöşü]/g, (ch) => trMap[ch] || ch).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 28);
  return normalized || "GENEL";
}

function durationConfig(durationDays) {
  const cfg = DURATION_OPTIONS[Number(durationDays)];
  if (!cfg) throw new Error("Geçersiz süre seçimi");
  return cfg;
}

// ADMIN KONTROLÜ (SUPABASE)
async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Giriş yapmalısınız.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
    throw new Error("Yetkiniz yok.");
  }
}

// KAMPANYA İŞLEMLERİ (SUPABASE)
async function ensureCampaign({ name, durationDays, note }) {
  const cfg = durationConfig(durationDays);
  const code = `PROMO_${slugify(name)}_${cfg.suffix}`;
  
  // Önce mevcut mu bak
  const { data: existing } = await supabase.from("promo_campaigns").select("*").eq("code", code).maybeSingle();
  if (existing) return existing;

  // Yoksa oluştur
  const { data: created, error } = await supabase.from("promo_campaigns").insert([{
    code,
    name: `${String(name || "Genel").trim()} - ${cfg.label}`,
    description: note || `${name} promosyon`,
    is_active: true,
    grant_type: "membership",
    membership_months: cfg.months,
    token_amount: 0,
    package_code: "promo_code",
    stack_mode: "extend",
    per_user_limit: 1
  }]).select().single();

  if (error) throw error;
  return created;
}

async function createCode(campaignId) {
  const { data, error } = await supabase.from("web_promo_codes").insert([{
    campaign_id: campaignId,
    code_value: generatePromoCode(),
    delivery_type: "manual",
    is_active: true
  }]).select().single();
  
  if (error) throw error;
  return data;
}

async function loadLatestCodes() {
  const { data, error } = await supabase.from("web_promo_codes").select("*, promo_campaigns(*)").order("created_at", { ascending: false }).limit(25);
  if (error) throw error;
  renderRows(data || []);
}

function renderRows(rows) {
  const body = $("corpPromoResultBody");
  if (!body) return;
  body.innerHTML = rows.length ? rows.map(row => `
      <tr>
        <td><b>${escapeHtml(row.code_value)}</b></td>
        <td>${escapeHtml(row.promo_campaigns?.name || "-")}</td>
        <td>${escapeHtml(row.promo_campaigns?.code || "-")}</td>
        <td>${escapeHtml(row.promo_campaigns?.membership_months ? `${row.promo_campaigns.membership_months} ay` : "-")}</td>
        <td>${escapeHtml(row.delivery_type)}</td>
        <td>${row.is_used ? "Kullanıldı" : (row.is_active ? "Aktif" : "Pasif")}</td>
        <td>${row.created_at ? new Date(row.created_at).toLocaleString("tr-TR") : "-"}</td>
      </tr>
  `).join("") : '<tr><td colspan="7" class="empty">Henüz kod oluşturulmadı.</td></tr>';
}

async function generateCodes() {
  const btn = $("corpPromoGenerateBtn");
  try {
    if (btn) btn.disabled = true;
    setStatus("Kodlar oluşturuluyor...");
    await requireAdmin();

    const name = String($("corpPromoName")?.value || "").trim();
    if (name.length < 2) throw new Error("Kampanya adı yazmalısınız.");

    const count = Math.max(1, Math.min(500, Number($("corpPromoCount")?.value || 1)));
    const durationDays = Number($("corpPromoDuration")?.value || 365);
    const note = String($("corpPromoNote")?.value || "").trim();

    const campaign = await ensureCampaign({ name, durationDays, note });
    for (let i = 0; i < count; i++) {
        await createCode(campaign.id);
    }

    setStatus(`${count} adet kod oluşturuldu.`);
    await loadLatestCodes();
  } catch (e) {
    setStatus(e.message, true);
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
      <div class="grid grid-2">
        <label>Kampanya Adı <input id="corpPromoName" type="text" /></label>
        <label>Adet <input id="corpPromoCount" type="number" value="1" /></label>
        <label>Süre <select id="corpPromoDuration"><option value="30">30 gün</option><option value="365" selected>365 gün</option></select></label>
        <label>Not <input id="corpPromoNote" type="text" /></label>
      </div>
      <button id="corpPromoGenerateBtn" class="btn-primary">Kodları Oluştur</button>
      <button id="corpPromoRefreshBtn" class="btn-secondary">Yenile</button>
      <div id="corpPromoStatus" class="status-line"></div>
      <table>
        <thead><tr><th>Kod</th><th>Kampanya</th><th>Kodu</th><th>Süre</th><th>Teslim</th><th>Durum</th><th>Tarih</th></tr></thead>
        <tbody id="corpPromoResultBody"></tbody>
      </table>
    </section>
  `;
  $("corpPromoGenerateBtn").addEventListener("click", generateCodes);
  $("corpPromoRefreshBtn").addEventListener("click", loadLatestCodes);
  loadLatestCodes();
}

boot();
function boot() { renderShell(); }