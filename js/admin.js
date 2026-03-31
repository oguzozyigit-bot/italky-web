import { supabase } from "/js/supabase_client.js";
import { safeLogout } from "/js/auth.js";
import { mountShell } from "/js/ui_shell.js";

try {
  mountShell({ scroll: "auto" });
} catch (e) {
  console.warn("ui_shell admin skip:", e);
}

try {
  const root = getComputedStyle(document.documentElement);
  const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
  document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 10}px` : "0px");
} catch {}

setTimeout(() => {
  document.getElementById("pageContent")?.classList.add("ready");
}, 120);

const API = "https://italky-api.onrender.com/api";
const $ = (id) => document.getElementById(id);

const meLine = $("meLine");
const systemNote = $("systemNote");

let __me = null;
let __currentPreviewCode = "";
let __singleCodeDraft = "";
let __singlePackageDraft = "";
let __singleNoteDraft = "";
let __nfcEventsBound = false;

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statusHtml(text, ok = true) {
  return `<div class="status-line ${ok ? "status-ok" : "status-err"}">${escapeHtml(text || "")}</div>`;
}

function tab(name) {
  const names = ["users", "packages", "entitlements", "nfc", "deploy", "github"];
  names.forEach((t) => {
    document.querySelector(`.tab[data-tab="${t}"]`)?.classList.toggle("active", t === name);
    $(`panel${t.charAt(0).toUpperCase() + t.slice(1)}`)?.classList.toggle("hidden", t !== name);
  });
}

function bindNativeAdminEvents() {
  if (__nfcEventsBound) return;
  __nfcEventsBound = true;

  window.addEventListener("italky:nfc-write", (e) => {
    const payload = String(e?.detail?.payload || "").trim().toUpperCase();

    if (payload) {
      __currentPreviewCode = payload;
      if ($("qrCodePreviewInput")) $("qrCodePreviewInput").value = payload;
    }

    const statusEl = $("singleQrStatus");
    if (statusEl) {
      statusEl.className = "status-line status-ok";
      statusEl.textContent = `NFC'ye yazıldı: ${payload || "Lisans kodu"}`;
    }
  });

  window.addEventListener("italky:nfc-status", (e) => {
    const msg = e?.detail?.message || "Kartı telefona yaklaştır.";
    const statusEl = $("singleQrStatus");
    if (statusEl) {
      statusEl.className = "status-line status-warn";
      statusEl.textContent = msg;
    }
  });

  window.addEventListener("italky:nfc-error", (e) => {
    const msg = e?.detail?.message || "NFC yazma başarısız.";
    const statusEl = $("singleQrStatus");
    if (statusEl) {
      statusEl.className = "status-line status-err";
      statusEl.textContent = msg;
    }
  });
}

document.querySelectorAll(".tab").forEach((el) => {
  el.addEventListener("click", () => tab(el.dataset.tab));
});

$("homeBtn")?.addEventListener("click", () => {
  location.href = "/pages/home.html";
});

$("logoutBtnTop")?.addEventListener("click", async () => {
  await safeLogout();
});

$("refreshBtn")?.addEventListener("click", async () => {
  await boot();
});

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || "";
}

async function api(path, opts = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("NO_SESSION");

  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(opts.headers || {})
    }
  });

  const txt = await r.text();
  let j = null;
  try {
    j = JSON.parse(txt);
  } catch {
    j = { raw: txt };
  }

  if (!r.ok) {
    throw new Error(j?.detail || txt || `HTTP_${r.status}`);
  }

  return j;
}

function showUnauthorized(message = "Bu panel yalnızca admin ve superadmin kullanıcılar içindir.") {
  if (meLine) meLine.textContent = "Yetki yok";
  if (systemNote) systemNote.textContent = message;

  $("panelUsers").innerHTML = `
    <div class="card">
      <h3>Yetki Gerekli</h3>
      <div class="desc">${escapeHtml(message)}</div>
      <div class="row" style="margin-top:12px">
        <button id="goHomeNoAuth" class="btn-primary" type="button">Ana Sayfaya Dön</button>
      </div>
    </div>
  `;

  $("panelPackages").innerHTML = "";
  $("panelEntitlements").innerHTML = "";
  $("panelNfc").innerHTML = "";
  $("panelDeploy").innerHTML = "";
  $("panelGithub").innerHTML = "";

  tab("users");

  $("goHomeNoAuth")?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });
}

function applyRoleVisibility() {
  const role = String(__me?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isSuper = role === "superadmin";

  document.querySelector(`.tab[data-tab="packages"]`)?.classList.toggle("hidden", !isSuper);
  document.querySelector(`.tab[data-tab="deploy"]`)?.classList.toggle("hidden", !isSuper);
  document.querySelector(`.tab[data-tab="github"]`)?.classList.toggle("hidden", !isSuper);
  document.querySelector(`.tab[data-tab="entitlements"]`)?.classList.toggle("hidden", !isSuper);

  if (isAdmin) {
    $("panelPackages")?.classList.add("hidden");
    $("panelDeploy")?.classList.add("hidden");
    $("panelGithub")?.classList.add("hidden");
    $("panelEntitlements")?.classList.add("hidden");
  } else {
    $("panelPackages")?.classList.remove("hidden");
    $("panelDeploy")?.classList.remove("hidden");
    $("panelGithub")?.classList.remove("hidden");
    $("panelEntitlements")?.classList.remove("hidden");
  }
}

async function renderUsers() {
  const box = $("panelUsers");
  box.innerHTML = `<div class="card"><h3>Kullanıcılar</h3><div class="desc">Yükleniyor...</div></div>`;

  try {
    const r = await api("/admin/users");
    const items = Array.isArray(r?.items) ? r.items : [];

    box.innerHTML = `
      <div class="card">
        <h3>Kullanıcılar</h3>
        <div class="desc">Toplam ${items.length} kullanıcı</div>
        <div class="table">
          <table>
            <thead>
              <tr>
                <th>E-Posta</th>
                <th>Ad Soyad</th>
                <th>Rol</th>
                <th>Jeton</th>
                <th>Aktif Paket</th>
                <th>Kaynak</th>
                <th>Paket Bitiş</th>
              </tr>
            </thead>
            <tbody>
              ${items.length ? items.map(u => `
                <tr>
                  <td>${escapeHtml(u.email || "")}</td>
                  <td>${escapeHtml(u.full_name || "")}</td>
                  <td>${escapeHtml(u.role || "user")}</td>
                  <td>${Number(u.tokens || 0)}</td>
                  <td>${escapeHtml(u.selected_package_code || "-")}</td>
                  <td>${escapeHtml(u.access_source_type || "-")}</td>
                  <td>${escapeHtml(u.package_ends_at || "-")}</td>
                </tr>
              `).join("") : `<tr><td colspan="7" class="empty">Kullanıcı bulunamadı.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    box.innerHTML = `<div class="card"><h3>Kullanıcılar</h3>${statusHtml(e?.message || "Liste alınamadı", false)}</div>`;
  }
}

async function renderPackages() {
  const box = $("panelPackages");
  const role = String(__me?.role || "").toLowerCase();

  if (role !== "superadmin") {
    box.innerHTML = `<div class="card"><h3>Paketler</h3><div class="desc">Bu alan yalnızca superadmin içindir.</div></div>`;
    return;
  }

  try {
    const r = await api("/admin/packages");
    const items = Array.isArray(r?.items) ? r.items : [];

    box.innerHTML = `
      <div class="card">
        <h3>Paketler</h3>
        <div class="table">
          <table>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad</th>
                <th>Kaynak</th>
                <th>Süre</th>
                <th>Jeton</th>
                <th>Aktif</th>
              </tr>
            </thead>
            <tbody>
              ${items.length ? items.map(p => `
                <tr>
                  <td>${escapeHtml(p.code || "")}</td>
                  <td>${escapeHtml(p.name || "")}</td>
                  <td>${escapeHtml(p.source_type || "")}</td>
                  <td>${Number(p.duration_days || 0)} gün</td>
                  <td>${Number(p.jeton_amount || 0)}</td>
                  <td>${p.is_active ? "Aktif" : "Pasif"}</td>
                </tr>
              `).join("") : `<tr><td colspan="6" class="empty">Paket yok.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    box.innerHTML = `<div class="card"><h3>Paketler</h3>${statusHtml(e?.message || "Paketler alınamadı", false)}</div>`;
  }
}

async function renderEntitlements() {
  const box = $("panelEntitlements");
  const role = String(__me?.role || "").toLowerCase();

  if (role !== "superadmin") {
    box.innerHTML = `<div class="card"><h3>Erişimler</h3><div class="desc">Bu alan yalnızca superadmin içindir.</div></div>`;
    return;
  }

  try {
    const r = await api("/admin/entitlements");
    const items = Array.isArray(r?.items) ? r.items : [];

    box.innerHTML = `
      <div class="card">
        <h3>Erişimler</h3>
        <div class="table">
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Paket</th>
                <th>Kaynak</th>
                <th>Kod</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              ${items.length ? items.map(ent => `
                <tr>
                  <td>${escapeHtml(ent.user_id || "")}</td>
                  <td>${escapeHtml(ent.package_code || "")}</td>
                  <td>${escapeHtml(ent.source_type || "")}</td>
                  <td>${escapeHtml(ent.card_uid || "-")}</td>
                  <td>${escapeHtml(ent.status || "")}</td>
                </tr>
              `).join("") : `<tr><td colspan="5" class="empty">Erişim yok.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    box.innerHTML = `<div class="card"><h3>Erişimler</h3>${statusHtml(e?.message || "Erişimler alınamadı", false)}</div>`;
  }
}

function randomLetters(count = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < count; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function randomDigits(count = 4) {
  const chars = "0123456789";
  let out = "";
  for (let i = 0; i < count; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function generateLicenseCode() {
  const chars = [...randomLetters(4), ...randomDigits(4)];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function buildInstallQrLink() {
  return "https://play.google.com/store/apps/details?id=com.ozyigits.italkyai";
}

function makeNfcPayload(code) {
  return String(code || "").trim().toUpperCase();
}

function drawCodeQrPreview() {
  const wrap = $("codeQrPreviewWrap");
  if (!wrap) return;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(buildInstallQrLink())}`;
  wrap.innerHTML = `<img src="${qrSrc}" alt="QR" style="width:180px;height:180px;display:block;" />`;
}

function openCodePrintWindow(items) {
  const rows = (Array.isArray(items) ? items : []).filter(Boolean);
  if (!rows.length) return;

  const cardsHtml = rows.map((row) => {
    const code = String(row.code || "").trim().toUpperCase();
    const packageName = String(row.package_name || row.package_code || "").trim();
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(buildInstallQrLink())}`;

    return `
      <div class="card">
        <div class="brand">italkyAI</div>
        <img class="qr" src="${qrSrc}" alt="QR">
        <div class="code-title">Lisans Kodu</div>
        <div class="code">${escapeHtml(code)}</div>
        <div class="package">${escapeHtml(packageName || "-")}</div>
      </div>
    `;
  }).join("");

  const html = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>QR Yazdır</title>
      <style>
        body{margin:0;padding:18px;background:#fff;color:#111;font-family:Arial,sans-serif}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
        .card{border:1px solid #cfd5dc;border-radius:16px;padding:14px;text-align:center;page-break-inside:avoid}
        .brand{font-size:18px;font-weight:900;margin-bottom:10px}
        .qr{width:180px;height:180px;display:block;margin:0 auto 10px}
        .code-title{font-size:12px;color:#555;margin-bottom:4px}
        .code{font-size:22px;font-weight:900;letter-spacing:2px;margin-bottom:6px}
        .package{font-size:12px;color:#444}
      </style>
    </head>
    <body onload="window.print(); setTimeout(()=>window.close(),600);">
      <div class="grid">${cardsHtml}</div>
    </body>
    </html>
  `;

  const w = window.open("", "_blank", "width=1000,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

async function loadCodeRows() {
  const cards = await api("/admin/nfc/cards");
  const items = Array.isArray(cards?.items) ? cards.items : [];
  return items.map((c) => {
    const note = String(c.note || "");
    const printedCountMatch = note.match(/print_count:(\d+)/i);
    const lastPrintedMatch = note.match(/last_printed_at:([^\|]+)/i);

    const printCount = printedCountMatch ? Number(printedCountMatch[1] || 0) : 0;
    const lastPrintedAt = lastPrintedMatch ? lastPrintedMatch[1] : null;
    const isPrinted = printCount > 0;
    const isActivated = String(c.status || "").toLowerCase() === "bound" || !!c.bound_user_id;

    return {
      raw: c,
      code: String(c.uid || "").trim().toUpperCase(),
      package_code: c.package_code || "",
      package_name: c.package_code || "",
      is_active: !!c.is_active,
      is_printed: isPrinted,
      print_count: printCount,
      last_printed_at: lastPrintedAt,
      is_activated: isActivated,
      activated_by_user_id: c.bound_user_id || "",
      status: c.status || "new"
    };
  });
}

async function savePrintMeta(row, nextCount) {
  const prevNote = String(row.raw?.note || "").trim();
  const cleanParts = prevNote
    .split("|")
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !/^print_count:/i.test(s))
    .filter(s => !/^last_printed_at:/i.test(s));

  cleanParts.push(`print_count:${nextCount}`);
  cleanParts.push(`last_printed_at:${new Date().toISOString()}`);

  await api("/admin/nfc/cards/upsert", {
    method: "POST",
    body: JSON.stringify({
      uid: row.code,
      package_code: row.package_code || null,
      is_active: row.is_active,
      status: row.status || "new",
      note: cleanParts.join(" | ")
    })
  });
}

async function fillPackageSelect(selectId) {
  const sel = $(selectId);
  if (!sel) return;

  try {
    const r = await api("/admin/packages");
    const items = Array.isArray(r?.items) ? r.items : [];
    sel.innerHTML = items.length
      ? items.map(p => `<option value="${escapeHtml(p.code || "")}">${escapeHtml((p.name || p.code || "") + " • " + (p.source_type || ""))}</option>`).join("")
      : `<option value="">Paket yok</option>`;
  } catch {
    sel.innerHTML = `<option value="">Paket alınamadı</option>`;
  }
}

async function writeCodeToNfc(reason = "Kartı telefona yaklaştır. Lisans kodu NFC'ye yazılacak.") {
  const statusEl = $("singleQrStatus");
  statusEl.className = "status-line status-warn";
  statusEl.textContent = reason;

  try {
    const inputCode = String($("qrCodePreviewInput")?.value || "").trim().toUpperCase();
    const code = inputCode || __currentPreviewCode;

    if (!code || code.length !== 8) {
      throw new Error("Önce geçerli lisans kodu seç.");
    }

    __currentPreviewCode = code;
    if ($("qrCodePreviewInput")) $("qrCodePreviewInput").value = code;

    if (window.NativeAdmin && typeof window.NativeAdmin.writeNfcPayload === "function") {
      window.NativeAdmin.writeNfcPayload(makeNfcPayload(code));
      statusEl.className = "status-line status-warn";
      statusEl.textContent = "Kartı tekrar telefona yaklaştır. Lisans kodu NFC'ye yazılacak.";
    } else {
      throw new Error("Bu cihazda NFC yazma köprüsü yok.");
    }
  } catch (e) {
    statusEl.className = "status-line status-err";
    statusEl.textContent = e?.message || "NFC'ye yazılamadı.";
  }
}

async function renderCodesQr() {
  const box = $("panelNfc");
  bindNativeAdminEvents();

  box.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h3>Tekli Kod Üret</h3>
        <div class="desc">Lisans kodu 8 karakter olur. 4 harf + 4 rakam, karışık dizilim.</div>

        <div class="split">
          <input id="singleCodeInput" placeholder="Lisans kodu" />
          <button id="generateSingleCodeBtn" class="btn-secondary" type="button">Kod Üret</button>
        </div>

        <div class="split">
          <select id="singlePackageSelect"></select>
          <input id="singleCodeNote" placeholder="Not" />
        </div>

        <button id="saveSingleCodeBtn" class="btn-primary" type="button">Kodu Kaydet</button>

        <div class="row" style="margin-top:12px">
          <button id="writeNfcBtn" class="btn-secondary" type="button">NFC'ye Yaz</button>
        </div>

        <div class="row" style="margin-top:10px">
          <button id="singlePrintBtn" class="btn-warn" type="button">QR Yazdır</button>
          <button id="singleReprintBtn" class="btn-secondary" type="button">Tekrar Yazdır</button>
        </div>

        <div id="singleCodeStatus" class="status-line"></div>
        <div id="singleQrStatus" class="status-line"></div>
      </div>

      <div class="card">
        <h3>QR Önizleme</h3>
        <div class="desc">QR uygulamayı indirir. Kart altında lisans kodu görünür. NFC'ye sadece lisans kodu yazılır.</div>

        <div class="kv">
          <input id="qrCodePreviewInput" placeholder="Lisans Kodu : 4A5KR8B1" />
          <input id="qrLinkPreviewOutput" readonly placeholder="QR link burada görünür" />
        </div>

        <div style="margin-top:12px; padding:14px; border:1px solid var(--line-soft); border-radius:18px; background:#151c24;">
          <div style="font-size:12px; font-weight:900; color:var(--muted); margin-bottom:8px;">QR Önizleme</div>
          <div id="codeQrPreviewWrap" style="display:flex; justify-content:center; align-items:center; min-height:180px; border-radius:16px; background:#fff;"></div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <h3>Toplu Kod Üret</h3>
      <div class="desc">İstediğin kadar lisans kodu üret. Üretilen kodlar tabloda listelenir.</div>

      <div class="split">
        <select id="bulkPackageSelect"></select>
        <input id="bulkCountInput" type="number" min="1" value="10" placeholder="Adet" />
      </div>

      <input id="bulkCodeNote" placeholder="Not" />
      <button id="bulkGenerateBtn" class="btn-primary" type="button">Toplu Kod Üret</button>
      <div id="bulkCodeStatus" class="status-line"></div>
    </div>

    <div class="card" style="margin-top:14px">
      <h3>Kodlar / QR Listesi</h3>
      <div class="desc">Kod seç, NFC'ye yaz veya QR yazdır. Yazdırıldıysa buton Tekrar Yazdır olur.</div>
      <div class="table">
        <table>
          <thead>
            <tr>
              <th>Lisans Kodu</th>
              <th>Paket</th>
              <th>Yazdırma</th>
              <th>Aktivasyon</th>
              <th>Kullanıcı</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody id="codesTableBody">
            <tr><td colspan="6" class="empty">Yükleniyor...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  try {
    await fillPackageSelect("singlePackageSelect");
    await fillPackageSelect("bulkPackageSelect");

    function restoreSingleForm() {
      if ($("singleCodeInput")) $("singleCodeInput").value = __singleCodeDraft || "";
      if ($("singleCodeNote")) $("singleCodeNote").value = __singleNoteDraft || "";
      if ($("singlePackageSelect") && __singlePackageDraft) {
        $("singlePackageSelect").value = __singlePackageDraft;
      }
    }

    function captureSingleForm() {
      __singleCodeDraft = String($("singleCodeInput")?.value || "").trim().toUpperCase();
      __singlePackageDraft = String($("singlePackageSelect")?.value || "").trim();
      __singleNoteDraft = String($("singleCodeNote")?.value || "").trim();
    }

    restoreSingleForm();

    const rows = await loadCodeRows();

    function applyPreviewCode(code) {
      const clean = String(code || "").trim().toUpperCase();
      __currentPreviewCode = clean;

      if ($("qrCodePreviewInput")) $("qrCodePreviewInput").value = clean;
      if ($("qrLinkPreviewOutput")) $("qrLinkPreviewOutput").value = buildInstallQrLink();
      drawCodeQrPreview();
    }

    function renderTable() {
      const body = $("codesTableBody");

      body.innerHTML = rows.length ? rows.map((row) => {
        const printBtnClass = row.is_printed ? "btn-warn" : "btn-secondary";
        const printBtnText = row.is_printed ? "Tekrar Yazdır" : "QR Yazdır";
        const printLabel = row.is_printed
          ? `Yazdırıldı${row.print_count ? ` (${row.print_count})` : ""}${row.last_printed_at ? ` • ${escapeHtml(row.last_printed_at)}` : ""}`
          : "Yazdırılmadı";

        const activationLabel = row.is_activated ? "Aktive Edildi" : "Bekliyor";

        return `
          <tr>
            <td style="font-weight:900;letter-spacing:1px">${escapeHtml(row.code)}</td>
            <td>${escapeHtml(row.package_code || "-")}</td>
            <td>${escapeHtml(printLabel)}</td>
            <td>${escapeHtml(activationLabel)}</td>
            <td>${escapeHtml(row.activated_by_user_id || "-")}</td>
            <td>
              <div class="mini-actions">
                <button class="btn-secondary" data-preview-code="${escapeHtml(row.code)}" type="button">Seç</button>
                <button class="${printBtnClass}" data-print-code="${escapeHtml(row.code)}" type="button">${printBtnText}</button>
                <button class="btn-secondary" data-nfc-code="${escapeHtml(row.code)}" type="button">NFC'ye Yaz</button>
              </div>
            </td>
          </tr>
        `;
      }).join("") : `<tr><td colspan="6" class="empty">Kod bulunamadı.</td></tr>`;

      body.querySelectorAll("[data-preview-code]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const code = btn.getAttribute("data-preview-code") || "";
          applyPreviewCode(code);
          $("singleQrStatus").className = "status-line status-ok";
          $("singleQrStatus").textContent = `Seçili Lisans Kodu: ${code}`;
        });
      });

      body.querySelectorAll("[data-print-code]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const code = btn.getAttribute("data-print-code") || "";
          const row = rows.find(r => r.code === code);
          if (!row) return;

          applyPreviewCode(code);
          openCodePrintWindow([row]);

          try {
            await savePrintMeta(row, Number(row.print_count || 0) + 1);
            $("singleQrStatus").className = "status-line status-ok";
            $("singleQrStatus").textContent = `${code} yazdırıldı.`;
            await renderCodesQr();
          } catch (e) {
            $("singleQrStatus").className = "status-line status-err";
            $("singleQrStatus").textContent = e?.message || "Yazdırma kaydı güncellenemedi.";
          }
        });
      });

      body.querySelectorAll("[data-nfc-code]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const code = btn.getAttribute("data-nfc-code") || "";
          applyPreviewCode(code);
          await writeCodeToNfc("Kartı telefona yaklaştır. Lisans kodu NFC'ye yazılacak.");
        });
      });
    }

    renderTable();

    $("generateSingleCodeBtn").onclick = () => {
      const code = generateLicenseCode();
      __singleCodeDraft = code;
      if ($("singleCodeInput")) $("singleCodeInput").value = code;

      captureSingleForm();
      applyPreviewCode(code);

      $("singleCodeStatus").className = "status-line status-ok";
      $("singleCodeStatus").textContent = `Lisans Kodu : ${code}`;
    };

    $("saveSingleCodeBtn").onclick = async () => {
      captureSingleForm();

      const statusEl = $("singleCodeStatus");
      statusEl.className = "status-line status-warn";
      statusEl.textContent = "Kod kaydediliyor...";

      try {
        const code = String($("singleCodeInput").value || "").trim().toUpperCase();
        const packageCode = $("singlePackageSelect").value;
        const note = $("singleCodeNote").value.trim() || null;

        if (!code || code.length !== 8) throw new Error("Kod 8 karakter olmalı");
        if (!packageCode) throw new Error("Paket seçilmedi");

        __currentPreviewCode = code;
        __singleCodeDraft = code;
        __singlePackageDraft = packageCode;
        __singleNoteDraft = note || "";

        await api("/admin/nfc/cards/upsert", {
          method: "POST",
          body: JSON.stringify({
            uid: code,
            package_code: packageCode,
            is_active: true,
            status: "new",
            note
          })
        });

        await renderCodesQr();

        if ($("singleCodeInput")) $("singleCodeInput").value = code;
        if ($("singleCodeNote")) $("singleCodeNote").value = __singleNoteDraft;
        if ($("singlePackageSelect")) $("singlePackageSelect").value = packageCode;

        applyPreviewCode(code);

        $("singleCodeStatus").className = "status-line status-ok";
        $("singleCodeStatus").textContent = `Kod kaydedildi: ${code}`;

        if ($("singleQrStatus")) {
          $("singleQrStatus").className = "status-line status-ok";
          $("singleQrStatus").textContent = `Lisans Kodu hazır: ${code}`;
        }
      } catch (e) {
        statusEl.className = "status-line status-err";
        statusEl.textContent = e?.message || "Kod kaydedilemedi.";
      }
    };

    $("bulkGenerateBtn").onclick = async () => {
      const statusEl = $("bulkCodeStatus");
      statusEl.className = "status-line status-warn";
      statusEl.textContent = "Kodlar üretiliyor...";

      try {
        const packageCode = $("bulkPackageSelect").value;
        const count = Number($("bulkCountInput").value || 0);
        const note = $("bulkCodeNote").value.trim() || null;

        if (!packageCode) throw new Error("Paket seçilmedi");
        if (!count || count < 1) throw new Error("Adet en az 1 olmalı");

        const produced = [];
        for (let i = 0; i < count; i++) {
          const code = generateLicenseCode();
          produced.push(code);

          await api("/admin/nfc/cards/upsert", {
            method: "POST",
            body: JSON.stringify({
              uid: code,
              package_code: packageCode,
              is_active: true,
              status: "new",
              note
            })
          });
        }

        const firstCode = produced[0] || "";
        __currentPreviewCode = firstCode;

        statusEl.className = "status-line status-ok";
        statusEl.textContent = `${produced.length} kod üretildi.`;

        await renderCodesQr();

        if (firstCode) {
          applyPreviewCode(firstCode);
          if ($("singleQrStatus")) {
            $("singleQrStatus").className = "status-line status-ok";
            $("singleQrStatus").textContent = `İlk kod hazır: ${firstCode}`;
          }
        }
      } catch (e) {
        statusEl.className = "status-line status-err";
        statusEl.textContent = e?.message || "Toplu üretim başarısız.";
      }
    };

    $("qrCodePreviewInput").addEventListener("input", () => {
      const code = String($("qrCodePreviewInput").value || "").trim().toUpperCase();
      $("qrCodePreviewInput").value = code;
      __currentPreviewCode = code;
      __singleCodeDraft = code;
      $("qrLinkPreviewOutput").value = buildInstallQrLink();
      drawCodeQrPreview();
    });

    $("singlePrintBtn").onclick = async () => {
      const code = String($("qrCodePreviewInput").value || "").trim().toUpperCase() || __currentPreviewCode;
      const row = rows.find(r => r.code === code);
      if (!row) {
        $("singleQrStatus").className = "status-line status-err";
        $("singleQrStatus").textContent = "Önce kayıtlı bir kod seç veya üret.";
        return;
      }

      openCodePrintWindow([row]);

      try {
        await savePrintMeta(row, Number(row.print_count || 0) + 1);
        $("singleQrStatus").className = "status-line status-ok";
        $("singleQrStatus").textContent = `${code} yazdırıldı.`;
        await renderCodesQr();
      } catch (e) {
        $("singleQrStatus").className = "status-line status-err";
        $("singleQrStatus").textContent = e?.message || "Yazdırma kaydı güncellenemedi.";
      }
    };

    $("singleReprintBtn").onclick = async () => {
      const code = String($("qrCodePreviewInput").value || "").trim().toUpperCase() || __currentPreviewCode;
      const row = rows.find(r => r.code === code);
      if (!row) {
        $("singleQrStatus").className = "status-line status-err";
        $("singleQrStatus").textContent = "Tekrar yazdırmak için kayıtlı bir kod seç.";
        return;
      }

      openCodePrintWindow([row]);

      try {
        await savePrintMeta(row, Number(row.print_count || 0) + 1);
        $("singleQrStatus").className = "status-line status-ok";
        $("singleQrStatus").textContent = `${code} tekrar yazdırıldı.`;
        await renderCodesQr();
      } catch (e) {
        $("singleQrStatus").className = "status-line status-err";
        $("singleQrStatus").textContent = e?.message || "Tekrar yazdırma kaydı güncellenemedi.";
      }
    };

    $("writeNfcBtn").onclick = async () => {
      await writeCodeToNfc("Kartı telefona yaklaştır. Lisans kodu NFC'ye yazılacak.");
    };

    const selectedRow = rows.find(r => r.code === __currentPreviewCode) || rows[0];
    if (selectedRow) {
      applyPreviewCode(selectedRow.code);
      $("singleQrStatus").className = "status-line status-ok";
      $("singleQrStatus").textContent = `Seçili Lisans Kodu: ${selectedRow.code}`;
    } else {
      __currentPreviewCode = "";
      drawCodeQrPreview();
    }
  } catch (e) {
    box.innerHTML = `<div class="card"><h3>Kodlar / QR</h3>${statusHtml(e?.message || "Kod / QR alanı yüklenemedi", false)}</div>`;
  }
}

async function renderDeploy() {
  const box = $("panelDeploy");
  const role = String(__me?.role || "").toLowerCase();

  if (role !== "superadmin") {
    box.innerHTML = `<div class="card"><h3>Deploy</h3><div class="desc">Bu alan yalnızca superadmin içindir.</div></div>`;
    return;
  }

  box.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h3>Vercel Deploy</h3>
        <div class="desc">Frontend yayınını tetikler.</div>
        <button id="vercelDeployBtn" class="btn-warn" type="button">Vercel Deploy Başlat</button>
        <div id="vercelStatus" class="status-line"></div>
      </div>

      <div class="card">
        <h3>Render Deploy</h3>
        <div class="desc">Backend servis deploy’unu tetikler.</div>
        <button id="renderDeployBtn" class="btn-warn" type="button">Render Deploy Başlat</button>
        <div id="renderStatus" class="status-line"></div>
      </div>
    </div>
  `;

  $("vercelDeployBtn").onclick = async () => {
    const el = $("vercelStatus");
    el.className = "status-line status-warn";
    el.textContent = "Vercel deploy tetikleniyor...";
    try {
      await api("/admin/deploy/vercel", { method: "POST" });
      el.className = "status-line status-ok";
      el.textContent = "Vercel deploy tetiklendi.";
    } catch (e) {
      el.className = "status-line status-err";
      el.textContent = e?.message || "Vercel deploy başarısız.";
    }
  };

  $("renderDeployBtn").onclick = async () => {
    const el = $("renderStatus");
    el.className = "status-line status-warn";
    el.textContent = "Render deploy tetikleniyor...";
    try {
      await api("/admin/deploy/render", { method: "POST" });
      el.className = "status-line status-ok";
      el.textContent = "Render deploy tetiklendi.";
    } catch (e) {
      el.className = "status-line status-err";
      el.textContent = e?.message || "Render deploy başarısız.";
    }
  };
}

async function renderGithub() {
  const box = $("panelGithub");
  const role = String(__me?.role || "").toLowerCase();

  if (role !== "superadmin") {
    box.innerHTML = `<div class="card"><h3>GitHub</h3><div class="desc">Bu alan yalnızca superadmin içindir.</div></div>`;
    return;
  }

  box.innerHTML = `
    <div class="card">
      <h3>GitHub Commit</h3>
      <div class="desc">Dosya yoluna içerik gönderip repo içine commit atar.</div>

      <div class="split">
        <input id="ghPath" placeholder="Path (örn: pages/test.html)" />
        <input id="ghMsg" placeholder="Commit mesajı" value="admin update" />
      </div>

      <input id="ghBranch" placeholder="Branch" value="main" />
      <textarea id="ghContent" placeholder="Dosya içeriği"></textarea>
      <button id="ghCommitBtn" class="btn-primary" type="button">Commit Gönder</button>
      <div id="ghStatus" class="status-line"></div>
    </div>
  `;

  $("ghCommitBtn").onclick = async () => {
    const el = $("ghStatus");
    el.className = "status-line status-warn";
    el.textContent = "Commit gönderiliyor...";

    try {
      const payload = {
        path: $("ghPath").value.trim(),
        message: $("ghMsg").value.trim() || "admin update",
        branch: $("ghBranch").value.trim() || "main",
        content: $("ghContent").value
      };

      if (!payload.path || !payload.content) throw new Error("Path ve içerik gerekli");

      await api("/admin/github/commit", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      el.className = "status-line status-ok";
      el.textContent = "Commit başarılı.";
    } catch (e) {
      el.className = "status-line status-err";
      el.textContent = e?.message || "Commit başarısız.";
    }
  };
}

async function boot() {
  try {
    const me = await api("/admin/me");
    __me = me?.me || null;

    const role = String(__me?.role || "").toLowerCase();
    if (role !== "admin" && role !== "superadmin") {
      showUnauthorized();
      return;
    }

    meLine.textContent = `Yetki: ${role} • UID: ${__me?.user_id || "-"} • ${__me?.email || ""}`;

    await Promise.all([
      renderUsers(),
      renderPackages(),
      renderEntitlements(),
      renderCodesQr(),
      renderDeploy(),
      renderGithub()
    ]);

    applyRoleVisibility();
    tab(role === "admin" ? "nfc" : "users");
  } catch (e) {
    showUnauthorized(e?.message || "Bu panel yalnızca admin ve superadmin kullanıcılar içindir.");
  }
}

boot();
