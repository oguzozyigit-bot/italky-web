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

const loginView = $("loginView");
const panelView = $("panelView");
const loginStatus = $("loginStatus");
const meLine = $("meLine");

let __me = null;

function setLoginStatus(text, type = "") {
  loginStatus.className = `status-line ${type}`.trim();
  loginStatus.textContent = text || "";
}

function statusHtml(text, ok = true) {
  return `<div class="status-line ${ok ? "status-ok" : "status-err"}">${escapeHtml(text || "")}</div>`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showPanel() {
  loginView.classList.add("hidden");
  panelView.classList.remove("hidden");
}

function showLogin() {
  panelView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

function tab(name) {
  const names = ["users", "packages", "entitlements", "nfc", "deploy", "github"];
  names.forEach((t) => {
    document.querySelector(`.tab[data-tab="${t}"]`)?.classList.toggle("active", t === name);
    $(`panel${t.charAt(0).toUpperCase() + t.slice(1)}`)?.classList.toggle("hidden", t !== name);
  });
}

document.querySelectorAll(".tab").forEach((el) => {
  el.addEventListener("click", () => tab(el.dataset.tab));
});

$("homeBtn").onclick = () => location.href = "/pages/home.html";
$("logoutBtnTop").onclick = async () => { await safeLogout(); };
$("refreshBtn").onclick = async () => { await boot(); };

function showConfirm({
  title = "Onay",
  text = "Devam edilsin mi?",
  okText = "Tamam",
  cancelText = "Vazgeç"
} = {}) {
  return new Promise((resolve) => {
    $("confirmTitle").textContent = title;
    $("confirmText").textContent = text;
    $("confirmOk").textContent = okText;
    $("confirmCancel").textContent = cancelText;

    const modal = $("confirmModal");
    modal.classList.add("show");

    const close = (val) => {
      modal.classList.remove("show");
      $("confirmOk").onclick = null;
      $("confirmCancel").onclick = null;
      resolve(val);
    };

    $("confirmOk").onclick = () => close(true);
    $("confirmCancel").onclick = () => close(false);
  });
}

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

async function login() {
  try {
    setLoginStatus("Giriş yapılıyor...", "status-warn");
    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || !password) {
      setLoginStatus("E-posta ve şifre gerekli.", "status-err");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    await boot();
    showPanel();
    setLoginStatus("");
  } catch (e) {
    setLoginStatus(e?.message || "Giriş başarısız.", "status-err");
  }
}

$("loginBtn").addEventListener("click", login);

async function boot() {
  try {
    const me = await api("/admin/me");
    __me = me?.me || null;
    const role = String(__me?.role || "").toLowerCase();
    meLine.textContent = `Yetki: ${role || "-"} • UID: ${__me?.user_id || "-"} • ${__me?.email || ""}`;

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
    showPanel();
  } catch (e) {
    console.warn("admin boot:", e);
    meLine.textContent = "Admin değil / oturum yok";
    showLogin();
  }
}

function applyRoleVisibility() {
  const role = String(__me?.role || "").toLowerCase();
  const isSuper = role === "superadmin";
  const isAdmin = role === "admin";

  document.querySelector(`.tab[data-tab="packages"]`)?.classList.toggle("hidden", !isSuper);
  document.querySelector(`.tab[data-tab="deploy"]`)?.classList.toggle("hidden", !isSuper);
  document.querySelector(`.tab[data-tab="github"]`)?.classList.toggle("hidden", !isSuper);
  document.querySelector(`.tab[data-tab="users"]`)?.classList.toggle("hidden", false);
  document.querySelector(`.tab[data-tab="entitlements"]`)?.classList.toggle("hidden", !isSuper);

  if (isAdmin) {
    $("panelPackages")?.classList.add("hidden");
    $("panelDeploy")?.classList.add("hidden");
    $("panelGithub")?.classList.add("hidden");
    $("panelEntitlements")?.classList.add("hidden");
  }
}

async function renderUsers() {
  const box = $("panelUsers");
  const role = String(__me?.role || "").toLowerCase();
  const canEditRole = role === "superadmin";
  const canAssign = role === "superadmin";

  box.innerHTML = `
    <div class="card">
      <h3>Kullanıcılar</h3>
      <div class="desc">Kullanıcı bilgileri, aktif paket, erişim kaynağı ve rol yönetimi bu alandan yapılır.</div>
      <div class="table"><table>
        <thead>
          <tr>
            <th>E-Posta</th>
            <th>Ad Soyad</th>
            <th>Rol</th>
            <th>Jeton</th>
            <th>Aktif Paket</th>
            <th>Kaynak</th>
            <th>Paket Bitiş</th>
            <th>Kullanıcı ID</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody><tr><td colspan="9" class="empty">Yükleniyor...</td></tr></tbody>
      </table></div>
    </div>
  `;

  try {
    const r = await api("/admin/users");
    const items = Array.isArray(r?.items) ? r.items : [];

    box.innerHTML = `
      <div class="card">
        <h3>Kullanıcılar</h3>
        <div class="desc">${role === "admin" ? "Admin kullanıcı yalnızca görüntüleyebilir." : "Rol atama, üyelik kaynağı görüntüleme ve kullanıcı erişimini izleme ekranı."}</div>
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
                <th>Kullanıcı ID</th>
                <th>İşlem</th>
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
                  <td>${escapeHtml(u.id || "")}</td>
                  <td>
                    <div class="mini-actions">
                      ${canEditRole ? `
                        <select data-role-user="${escapeHtml(u.id || "")}">
                          <option value="user" ${u.role === "user" ? "selected" : ""}>user</option>
                          <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
                          <option value="superadmin" ${u.role === "superadmin" ? "selected" : ""}>superadmin</option>
                        </select>
                        <button class="btn-secondary" data-save-role="${escapeHtml(u.id || "")}" type="button">Rolü Kaydet</button>
                      ` : ``}
                    </div>
                  </td>
                </tr>
              `).join("") : `<tr><td colspan="9" class="empty">Kullanıcı bulunamadı.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (canEditRole) {
      box.querySelectorAll("[data-save-role]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const userId = btn.getAttribute("data-save-role");
          const sel = box.querySelector(`[data-role-user="${userId}"]`);
          const roleVal = sel?.value || "user";

          btn.textContent = "Kaydediliyor...";
          try {
            await api("/admin/users/role", {
              method: "POST",
              body: JSON.stringify({ user_id: userId, role: roleVal })
            });
            btn.textContent = "Kaydedildi";
            await renderUsers();
          } catch (e) {
            btn.textContent = "Rolü Kaydet";
            alert(e?.message || "Rol kaydedilemedi");
          }
        });
      });
    }

  } catch (e) {
    box.innerHTML = `<div class="card"><h3>Kullanıcılar</h3>${statusHtml(e?.message || "Liste alınamadı", false)}</div>`;
  }
}

async function renderPackages() {
  const box = $("panelPackages");
  const role = String(__me?.role || "").toLowerCase();
  const isSuper = role === "superadmin";

  if (!isSuper) {
    box.innerHTML = `<div class="card"><h3>Paketler</h3><div class="desc">Bu alan yalnızca superadmin içindir.</div></div>`;
    return;
  }

  box.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h3>Paket Oluştur</h3>
        <div class="desc">Yeni paketleri panelden oluştur.</div>

        <div class="split">
          <input id="pkgCode" placeholder="Kod (örn: PREMIUM_1YIL)" />
          <input id="pkgName" placeholder="Ad (örn: Premium 1 Yıl)" />
        </div>

        <div class="split">
          <input id="pkgDurationDays" type="number" min="1" placeholder="Süre (gün)" value="365" />
          <input id="pkgJetonAmount" type="number" min="0" placeholder="Jeton" value="200" />
        </div>

        <div class="split">
          <input id="pkgLangLimit" type="number" min="0" placeholder="Dil Limiti" value="0" />
          <select id="pkgSourceType">
            <option value="playstore">playstore</option>
            <option value="qr_code">qr_code</option>
            <option value="manual">manual</option>
          </select>
        </div>

        <div class="split">
          <select id="pkgText"><option value="true">TextToText Açık</option><option value="false">TextToText Kapalı</option></select>
          <select id="pkgF2F"><option value="true">FaceToFace Açık</option><option value="false" selected>FaceToFace Kapalı</option></select>
        </div>

        <div class="split">
          <select id="pkgS2S"><option value="true">SideToSide Açık</option><option value="false" selected>SideToSide Kapalı</option></select>
          <select id="pkgOffline"><option value="true">Offline Açık</option><option value="false" selected>Offline Kapalı</option></select>
        </div>

        <div class="split">
          <select id="pkgClone"><option value="true">Klon Ses Açık</option><option value="false" selected>Klon Ses Kapalı</option></select>
          <select id="pkgActive"><option value="true">Aktif</option><option value="false">Pasif</option></select>
        </div>

        <input id="pkgNote" placeholder="Not" />
        <button id="createPkgBtn" class="btn-primary" type="button">Paket Oluştur</button>
        <div id="pkgCreateStatus" class="status-line"></div>
      </div>

      <div class="card">
        <h3>Paket Listesi</h3>
        <div class="desc">Panelden açılan tüm paketler burada görünür.</div>
        <div class="table">
          <table>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad</th>
                <th>Kaynak</th>
                <th>Süre</th>
                <th>Jeton</th>
                <th>Dil</th>
                <th>Aktif</th>
              </tr>
            </thead>
            <tbody id="packagesBody">
              <tr><td colspan="7" class="empty">Yükleniyor...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    const r = await api("/admin/packages");
    const items = Array.isArray(r?.items) ? r.items : [];
    $("packagesBody").innerHTML = items.length ? items.map(p => `
      <tr>
        <td>${escapeHtml(p.code || "")}</td>
        <td>${escapeHtml(p.name || "")}</td>
        <td>${escapeHtml(p.source_type || "")}</td>
        <td>${Number(p.duration_days || 0)} gün</td>
        <td>${Number(p.jeton_amount || 0)}</td>
        <td>${Number(p.language_limit || 0)}</td>
        <td>${p.is_active ? "Aktif" : "Pasif"}</td>
      </tr>
    `).join("") : `<tr><td colspan="7" class="empty">Paket bulunamadı.</td></tr>`;

    $("createPkgBtn").onclick = async () => {
      const statusEl = $("pkgCreateStatus");
      statusEl.className = "status-line status-warn";
      statusEl.textContent = "Paket oluşturuluyor...";

      try {
        const payload = {
          code: $("pkgCode").value.trim(),
          name: $("pkgName").value.trim(),
          duration_days: Number($("pkgDurationDays").value || 0),
          language_limit: Number($("pkgLangLimit").value || 0),
          jeton_amount: Number($("pkgJetonAmount").value || 0),
          can_use_text_to_text: $("pkgText").value === "true",
          can_use_face_to_face: $("pkgF2F").value === "true",
          can_use_side_to_side: $("pkgS2S").value === "true",
          can_use_offline: $("pkgOffline").value === "true",
          can_use_clone_voice: $("pkgClone").value === "true",
          is_active: $("pkgActive").value === "true",
          source_type: $("pkgSourceType").value,
          note: $("pkgNote").value.trim() || null
        };

        if (!payload.code || !payload.name) throw new Error("Kod ve ad gerekli");

        await api("/admin/packages", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        statusEl.className = "status-line status-ok";
        statusEl.textContent = "Paket oluşturuldu.";
        await Promise.all([renderPackages(), renderUsers(), renderCodesQr()]);
      } catch (e) {
        statusEl.className = "status-line status-err";
        statusEl.textContent = e?.message || "Paket oluşturulamadı.";
      }
    };

  } catch (e) {
    box.innerHTML = `<div class="card"><h3>Paketler</h3>${statusHtml(e?.message || "Paketler yüklenemedi", false)}</div>`;
  }
}

async function renderEntitlements() {
  const box = $("panelEntitlements");
  const role = String(__me?.role || "").toLowerCase();

  if (role !== "superadmin") {
    box.innerHTML = `<div class="card"><h3>Erişimler</h3><div class="desc">Bu alan yalnızca superadmin içindir.</div></div>`;
    return;
  }

  box.innerHTML = `
    <div class="card">
      <h3>Erişim Kayıtları</h3>
      <div class="desc">Kullanıcılara atanmış gerçek erişimler burada listelenir.</div>
      <div class="table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Paket</th>
              <th>Kaynak</th>
              <th>Kod</th>
              <th>Başlangıç</th>
              <th>Bitiş</th>
              <th>Jeton</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody id="entsBody">
            <tr><td colspan="10" class="empty">Yükleniyor...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  try {
    const r = await api("/admin/entitlements");
    const items = Array.isArray(r?.items) ? r.items : [];

    $("entsBody").innerHTML = items.length ? items.map(ent => `
      <tr>
        <td>${ent.id}</td>
        <td>${escapeHtml(ent.user_id || "")}</td>
        <td>${escapeHtml(ent.package_code || "")}</td>
        <td>${escapeHtml(ent.source_type || "")}</td>
        <td>${escapeHtml(ent.card_uid || "-")}</td>
        <td>${escapeHtml(ent.started_at || "")}</td>
        <td>${escapeHtml(ent.expires_at || "")}</td>
        <td>${Number(ent.remaining_jeton || 0)}</td>
        <td>${escapeHtml(ent.status || "")}</td>
        <td>
          <div class="mini-actions">
            <select data-ent-status="${ent.id}">
              <option value="active" ${ent.status === "active" ? "selected" : ""}>active</option>
              <option value="expired" ${ent.status === "expired" ? "selected" : ""}>expired</option>
              <option value="cancelled" ${ent.status === "cancelled" ? "selected" : ""}>cancelled</option>
              <option value="passive" ${ent.status === "passive" ? "selected" : ""}>passive</option>
            </select>
            <button class="btn-secondary" data-save-ent="${ent.id}" type="button">Durumu Kaydet</button>
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="10" class="empty">Erişim kaydı bulunamadı.</td></tr>`;

    box.querySelectorAll("[data-save-ent]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const entId = Number(btn.getAttribute("data-save-ent"));
        const sel = box.querySelector(`[data-ent-status="${entId}"]`);
        const status = sel?.value || "active";

        const ok = await showConfirm({
          title: "Erişim Durumu",
          text: `Bu entitlement durumunu "${status}" olarak güncellemek istiyor musun?`,
          okText: "Kaydet"
        });
        if (!ok) return;

        btn.textContent = "Kaydediliyor...";
        try {
          await api("/admin/entitlements/status", {
            method: "POST",
            body: JSON.stringify({ entitlement_id: entId, status })
          });
          btn.textContent = "Kaydedildi";
          await Promise.all([renderEntitlements(), renderUsers(), renderCodesQr()]);
        } catch (e) {
          btn.textContent = "Durumu Kaydet";
          alert(e?.message || "Durum kaydedilemedi");
        }
      });
    });

  } catch (e) {
    box.innerHTML = `<div class="card"><h3>Erişimler</h3>${statusHtml(e?.message || "Erişimler yüklenemedi", false)}</div>`;
  }
}

function randomLetters(count = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < count; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function randomDigits(count = 4) {
  const chars = "0123456789";
  let out = "";
  for (let i = 0; i < count; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
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

function buildCodeQrLink(code) {
  const clean = String(code || "").trim().toUpperCase();
  return clean ? `https://italky.ai/open/nfc?code=${encodeURIComponent(clean)}` : "";
}

function drawCodeQrPreview(code) {
  const wrap = $("codeQrPreviewWrap");
  if (!wrap) return;

  const link = buildCodeQrLink(code);
  if (!link) {
    wrap.innerHTML = `<div style="color:#6b7280;font-size:13px;font-weight:800;">QR link bekleniyor</div>`;
    return;
  }

  const imgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
  wrap.innerHTML = `<img src="${imgSrc}" alt="QR" style="width:180px;height:180px;display:block;" />`;
}

function openCodePrintWindow(items) {
  const rows = (Array.isArray(items) ? items : []).filter(Boolean);
  if (!rows.length) return;

  const cardsHtml = rows.map((row) => {
    const code = String(row.code || "").trim().toUpperCase();
    const packageName = String(row.package_name || row.package_code || "").trim();
    const qrLink = buildCodeQrLink(code);
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(qrLink)}`;

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

async function markCodesPrinted(codes = []) {
  const list = (Array.isArray(codes) ? codes : []).map(c => String(c || "").trim().toUpperCase()).filter(Boolean);
  if (!list.length) return;

  for (const code of list) {
    try {
      await api("/admin/nfc/cards/upsert", {
        method: "POST",
        body: JSON.stringify({
          uid: code,
          status: "new",
          is_active: true,
          note: "__printed__"
        })
      });
    } catch {
      // sessiz geç
    }
  }
}

async function loadCodeRows() {
  const cards = await api("/admin/nfc/cards");
  const items = Array.isArray(cards?.items) ? cards.items : [];
  return items.map((c) => {
    const note = String(c.note || "");
    const printedCountMatch = note.match(/print_count:(\d+)/i);
    const lastPrintedMatch = note.match(/last_printed_at:([^\|]+)/i);
    const activatedMatch = note.match(/activated:true/i);

    const printCount = printedCountMatch ? Number(printedCountMatch[1] || 0) : (note.includes("__printed__") ? 1 : 0);
    const lastPrintedAt = lastPrintedMatch ? lastPrintedMatch[1] : null;
    const isPrinted = printCount > 0;
    const isActivated = activatedMatch ? true : String(c.status || "").toLowerCase() === "bound" || !!c.bound_user_id;

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
      activated_at: c.bound_user_id ? (c.expires_at || "") : "",
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
    .filter(s => !/^last_printed_at:/i.test(s))
    .filter(s => s !== "__printed__");

  cleanParts.push("__printed__");
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

async function renderCodesQr() {
  const box = $("panelNfc");
  const role = String(__me?.role || "").toLowerCase();

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
        <div id="singleCodeStatus" class="status-line"></div>
      </div>

      <div class="card">
        <h3>Toplu Kod Üret</h3>
        <div class="desc">İstediğin kadar lisans kodu üret. Toplu QR yazdırma için hazırlar.</div>

        <div class="split">
          <select id="bulkPackageSelect"></select>
          <input id="bulkCountInput" type="number" min="1" value="10" placeholder="Adet" />
        </div>

        <input id="bulkCodeNote" placeholder="Not" />
        <button id="bulkGenerateBtn" class="btn-primary" type="button">Toplu Kod Üret</button>
        <div id="bulkCodeStatus" class="status-line"></div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top:14px">
      <div class="card">
        <h3>QR Önizleme</h3>
        <div class="desc">Kod girildiğinde QR önizlemesi oluşur. Kod kartın altında büyük görünür.</div>

        <div class="kv">
          <input id="qrCodePreviewInput" placeholder="Lisans Kodu : 4A5KR8B1" />
          <input id="qrLinkPreviewOutput" readonly placeholder="QR link burada oluşur" />
        </div>

        <div style="margin-top:12px; padding:14px; border:1px solid var(--line-soft); border-radius:18px; background:#151c24;">
          <div style="font-size:12px; font-weight:900; color:var(--muted); margin-bottom:8px;">QR Önizleme</div>
          <div id="codeQrPreviewWrap" style="display:flex; justify-content:center; align-items:center; min-height:180px; border-radius:16px; background:#fff;"></div>
        </div>

        <div class="row" style="margin-top:12px">
          <button id="singlePrintBtn" class="btn-warn" type="button">Yazdır</button>
          <button id="singleReprintBtn" class="btn-secondary" type="button">Tekrar Yazdır</button>
        </div>
        <div id="singleQrStatus" class="status-line"></div>
      </div>

      <div class="card">
        <h3>Toplu Yazdırma</h3>
        <div class="desc">Yazdırılmayan kodları veya seçtiğin kodları toplu bastır.</div>

        <div class="split">
          <select id="filterPackageSelect">
            <option value="">Tüm Paketler</option>
          </select>
          <select id="filterPrintState">
            <option value="all">Tümü</option>
            <option value="not_printed">Yazdırılmadı</option>
            <option value="printed">Yazdırıldı</option>
            <option value="activated">Aktive Edildi</option>
          </select>
        </div>

        <input id="filterSearchInput" placeholder="Kod ara" />

        <div class="row" style="margin-top:12px">
          <button id="printSelectedBtn" class="btn-warn" type="button">Seçilileri Yazdır</button>
          <button id="printPendingBtn" class="btn-secondary" type="button">Yazdırılmayanları Yazdır</button>
        </div>

        <div id="bulkPrintStatus" class="status-line"></div>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <h3>Kodlar / QR Listesi</h3>
      <div class="desc">Yazdırıldıysa buton rengi değişir ve Tekrar Yazdır olur. Aktivasyon durumu ayrıca görünür.</div>
      <div class="table">
        <table>
          <thead>
            <tr>
              <th><input id="selectAllCodes" type="checkbox" /></th>
              <th>Lisans Kodu</th>
              <th>Paket</th>
              <th>Yazdırma</th>
              <th>Aktivasyon</th>
              <th>Kullanıcı</th>
              <th>QR</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody id="codesTableBody">
            <tr><td colspan="8" class="empty">Yükleniyor...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  try {
    await fillPackageSelect("singlePackageSelect");
    await fillPackageSelect("bulkPackageSelect");
    await fillPackageFilter("filterPackageSelect");

    const rows = await loadCodeRows();

    function applyPreviewCode(code) {
      const clean = String(code || "").trim().toUpperCase();
      if ($("qrCodePreviewInput")) $("qrCodePreviewInput").value = clean;
      if ($("qrLinkPreviewOutput")) $("qrLinkPreviewOutput").value = buildCodeQrLink(clean);
      drawCodeQrPreview(clean);
    }

    function filteredRows() {
      const pkg = $("filterPackageSelect").value;
      const printState = $("filterPrintState").value;
      const search = String($("filterSearchInput").value || "").trim().toUpperCase();

      return rows.filter((row) => {
        if (pkg && row.package_code !== pkg) return false;
        if (search && !row.code.includes(search)) return false;

        if (printState === "not_printed" && row.is_printed) return false;
        if (printState === "printed" && !row.is_printed) return false;
        if (printState === "activated" && !row.is_activated) return false;

        return true;
      });
    }

    function renderTable() {
      const body = $("codesTableBody");
      const data = filteredRows();

      body.innerHTML = data.length ? data.map((row) => {
        const printBtnClass = row.is_printed ? "btn-warn" : "btn-secondary";
        const printBtnText = row.is_printed ? "Tekrar Yazdır" : "Yazdır";
        const printLabel = row.is_printed
          ? `Yazdırıldı${row.print_count ? ` (${row.print_count})` : ""}${row.last_printed_at ? ` • ${escapeHtml(row.last_printed_at)}` : ""}`
          : "Yazdırılmadı";

        const activationLabel = row.is_activated ? "Aktive Edildi" : "Bekliyor";

        return `
          <tr>
            <td><input type="checkbox" data-select-code="${escapeHtml(row.code)}" /></td>
            <td style="font-weight:900;letter-spacing:1px">${escapeHtml(row.code)}</td>
            <td>${escapeHtml(row.package_code || "-")}</td>
            <td>${escapeHtml(printLabel)}</td>
            <td>${escapeHtml(activationLabel)}</td>
            <td>${escapeHtml(row.activated_by_user_id || "-")}</td>
            <td style="font-size:12px;line-height:1.4">${escapeHtml(buildCodeQrLink(row.code))}</td>
            <td>
              <div class="mini-actions">
                <button class="btn-secondary" data-preview-code="${escapeHtml(row.code)}" type="button">QR Gör</button>
                <button class="${printBtnClass}" data-print-code="${escapeHtml(row.code)}" type="button">${printBtnText}</button>
              </div>
            </td>
          </tr>
        `;
      }).join("") : `<tr><td colspan="8" class="empty">Kod bulunamadı.</td></tr>`;

      body.querySelectorAll("[data-preview-code]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const code = btn.getAttribute("data-preview-code") || "";
          applyPreviewCode(code);
          $("singleQrStatus").className = "status-line status-ok";
          $("singleQrStatus").textContent = buildCodeQrLink(code);
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
            $("bulkPrintStatus").className = "status-line status-ok";
            $("bulkPrintStatus").textContent = `${code} yazdırıldı.`;
            await renderCodesQr();
          } catch (e) {
            $("bulkPrintStatus").className = "status-line status-err";
            $("bulkPrintStatus").textContent = e?.message || "Yazdırma kaydı güncellenemedi.";
          }
        });
      });
    }

    renderTable();

    $("filterPackageSelect").addEventListener("change", renderTable);
    $("filterPrintState").addEventListener("change", renderTable);
    $("filterSearchInput").addEventListener("input", renderTable);

    $("selectAllCodes").addEventListener("change", (e) => {
      const checked = !!e.target.checked;
      box.querySelectorAll("[data-select-code]").forEach((cb) => {
        cb.checked = checked;
      });
    });

    $("generateSingleCodeBtn").onclick = () => {
      const code = generateLicenseCode();
      $("singleCodeInput").value = code;
      applyPreviewCode(code);
      $("singleCodeStatus").className = "status-line status-ok";
      $("singleCodeStatus").textContent = `Lisans Kodu : ${code}`;
    };

    $("saveSingleCodeBtn").onclick = async () => {
      const statusEl = $("singleCodeStatus");
      statusEl.className = "status-line status-warn";
      statusEl.textContent = "Kod kaydediliyor...";

      try {
        const code = String($("singleCodeInput").value || "").trim().toUpperCase();
        const packageCode = $("singlePackageSelect").value;
        const note = $("singleCodeNote").value.trim() || null;

        if (!code || code.length !== 8) throw new Error("Kod 8 karakter olmalı");
        if (!packageCode) throw new Error("Paket seçilmedi");

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

        applyPreviewCode(code);
        statusEl.className = "status-line status-ok";
        statusEl.textContent = `Kod kaydedildi: ${code}`;
        await renderCodesQr();
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
          let code = generateLicenseCode();
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

        statusEl.className = "status-line status-ok";
        statusEl.textContent = `${produced.length} kod üretildi.`;
        if (produced[0]) applyPreviewCode(produced[0]);
        await renderCodesQr();
      } catch (e) {
        statusEl.className = "status-line status-err";
        statusEl.textContent = e?.message || "Toplu üretim başarısız.";
      }
    };

    $("qrCodePreviewInput").addEventListener("input", () => {
      const code = String($("qrCodePreviewInput").value || "").trim().toUpperCase();
      $("qrCodePreviewInput").value = code;
      $("qrLinkPreviewOutput").value = buildCodeQrLink(code);
      drawCodeQrPreview(code);
    });

    $("singlePrintBtn").onclick = async () => {
      const code = String($("qrCodePreviewInput").value || "").trim().toUpperCase();
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
      const code = String($("qrCodePreviewInput").value || "").trim().toUpperCase();
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

    $("printSelectedBtn").onclick = async () => {
      const selected = [...box.querySelectorAll("[data-select-code]:checked")]
        .map(el => el.getAttribute("data-select-code"))
        .filter(Boolean);

      if (!selected.length) {
        $("bulkPrintStatus").className = "status-line status-err";
        $("bulkPrintStatus").textContent = "Önce kod seç.";
        return;
      }

      const selectedRows = rows.filter(r => selected.includes(r.code));
      openCodePrintWindow(selectedRows);

      try {
        for (const row of selectedRows) {
          await savePrintMeta(row, Number(row.print_count || 0) + 1);
        }
        $("bulkPrintStatus").className = "status-line status-ok";
        $("bulkPrintStatus").textContent = `${selectedRows.length} kod yazdırıldı.`;
        await renderCodesQr();
      } catch (e) {
        $("bulkPrintStatus").className = "status-line status-err";
        $("bulkPrintStatus").textContent = e?.message || "Toplu yazdırma kaydı başarısız.";
      }
    };

    $("printPendingBtn").onclick = async () => {
      const pendingRows = filteredRows().filter(r => !r.is_printed);
      if (!pendingRows.length) {
        $("bulkPrintStatus").className = "status-line status-err";
        $("bulkPrintStatus").textContent = "Yazdırılmamış kod yok.";
        return;
      }

      openCodePrintWindow(pendingRows);

      try {
        for (const row of pendingRows) {
          await savePrintMeta(row, Number(row.print_count || 0) + 1);
        }
        $("bulkPrintStatus").className = "status-line status-ok";
        $("bulkPrintStatus").textContent = `${pendingRows.length} yazdırılmamış kod basıldı.`;
        await renderCodesQr();
      } catch (e) {
        $("bulkPrintStatus").className = "status-line status-err";
        $("bulkPrintStatus").textContent = e?.message || "Toplu yazdırma kaydı başarısız.";
      }
    };

    const firstRow = rows[0];
    if (firstRow) {
      applyPreviewCode(firstRow.code);
      $("singleQrStatus").className = "status-line status-ok";
      $("singleQrStatus").textContent = buildCodeQrLink(firstRow.code);
    } else {
      drawCodeQrPreview("");
    }

  } catch (e) {
    box.innerHTML = `<div class="card"><h3>Kodlar / QR</h3>${statusHtml(e?.message || "Kod / QR alanı yüklenemedi", false)}</div>`;
  }
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

async function fillPackageFilter(selectId) {
  const sel = $(selectId);
  if (!sel) return;

  try {
    const r = await api("/admin/packages");
    const items = Array.isArray(r?.items) ? r.items : [];
    sel.innerHTML = `<option value="">Tüm Paketler</option>` + (
      items.length
        ? items.map(p => `<option value="${escapeHtml(p.code || "")}">${escapeHtml(p.name || p.code || "")}</option>`).join("")
        : ""
    );
  } catch {
    sel.innerHTML = `<option value="">Tüm Paketler</option>`;
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

async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await boot();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

init();
