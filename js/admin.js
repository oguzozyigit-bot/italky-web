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

function normalizeUid(uid) {
  return String(uid || "")
    .toUpperCase()
    .replace(/:/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function makeQrLink(uid) {
  return uid ? `https://italky.ai/open/access?uid=${encodeURIComponent(uid)}` : "";
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
      renderNfc(),
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
    $("panelPackages").classList.add("hidden");
    $("panelDeploy").classList.add("hidden");
    $("panelGithub").classList.add("hidden");
    $("panelEntitlements").classList.add("hidden");
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
        <div class="desc">${role === "admin" ? "Admin kullanıcı yalnızca görüntüleyebilir ve NFC / QR için kullanıcı seçebilir." : "Rol atama, üyelik kaynağı görüntüleme ve kullanıcı erişimini izleme ekranı."}</div>
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
                      ` : ""}
                      ${canAssign ? `<button class="btn-secondary" data-open-assign="${escapeHtml(u.id || "")}" type="button">Paket Ata</button>` : ""}
                      ${!canEditRole && !canAssign ? `<button class="btn-secondary" data-open-nfc-bind="${escapeHtml(u.id || "")}" type="button">NFC İçin Seç</button>` : ""}
                    </div>
                  </td>
                </tr>
              `).join("") : `<tr><td colspan="9" class="empty">Kullanıcı bulunamadı.</td></tr>`}
            </tbody>
          </table>
        </div>

        ${canAssign ? `
        <div class="card" style="margin-top:14px;background:#161d25">
          <h3>Seçili Kullanıcıya Paket Ata</h3>
          <div class="desc">Superadmin manuel erişim açabilir.</div>

          <div class="grid grid-2">
            <div class="kv">
              <input id="assignUserId" placeholder="Kullanıcı ID" />
              <select id="assignPackageCode"></select>
              <select id="assignSourceType">
                <option value="manual">manual</option>
                <option value="playstore">playstore</option>
                <option value="nfc_qr">nfc_qr</option>
              </select>
              <input id="assignCardUid" placeholder="Card UID (yalnızca nfc_qr için)" />
            </div>

            <div class="kv">
              <input id="assignPurchaseToken" placeholder="Purchase Token (yalnızca Play Store için)" />
              <input id="assignStartedAt" placeholder="Başlangıç ISO (boş bırakılırsa şimdi)" />
              <input id="assignExpiresAt" placeholder="Bitiş ISO (boş bırakılırsa paket süresi)" />
              <input id="assignNote" placeholder="Not" />
            </div>
          </div>

          <div class="row" style="margin-top:10px">
            <button id="assignEntitlementBtn" class="btn-primary" type="button">Kullanıcıya Paket Ata</button>
          </div>
          <div id="assignStatus" class="status-line"></div>
        </div>` : ""}
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

    if (canAssign) {
      await fillPackageSelect("assignPackageCode");

      box.querySelectorAll("[data-open-assign]").forEach((btn) => {
        btn.addEventListener("click", () => {
          $("assignUserId").value = btn.getAttribute("data-open-assign") || "";
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        });
      });

      $("assignEntitlementBtn").onclick = async () => {
        const statusEl = $("assignStatus");
        statusEl.className = "status-line status-warn";
        statusEl.textContent = "Paket atanıyor...";

        try {
          const payload = {
            user_id: $("assignUserId").value.trim(),
            package_code: $("assignPackageCode").value,
            source_type: $("assignSourceType").value,
            card_uid: $("assignCardUid").value.trim() || null,
            purchase_token: $("assignPurchaseToken").value.trim() || null,
            started_at: $("assignStartedAt").value.trim() || null,
            expires_at: $("assignExpiresAt").value.trim() || null,
            note: $("assignNote").value.trim() || null
          };

          if (!payload.user_id) {
            throw new Error("Kullanıcı ID gerekli");
          }

          await api("/admin/entitlements/assign", {
            method: "POST",
            body: JSON.stringify(payload)
          });

          statusEl.className = "status-line status-ok";
          statusEl.textContent = "Paket başarıyla atandı.";
          await Promise.all([renderUsers(), renderEntitlements()]);
        } catch (e) {
          statusEl.className = "status-line status-err";
          statusEl.textContent = e?.message || "Paket atanamadı.";
        }
      };
    }

    if (!canEditRole && !canAssign) {
      box.querySelectorAll("[data-open-nfc-bind]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const uid = btn.getAttribute("data-open-nfc-bind") || "";
          tab("nfc");
          setTimeout(() => {
            const bindUserId = $("bindUserId");
            if (bindUserId) bindUserId.value = uid;
          }, 100);
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
        <div class="desc">Yeni paketleri SQL’e girmeden panelden oluştur.</div>

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
            <option value="nfc_qr">nfc_qr</option>
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

        if (!payload.code || !payload.name) {
          throw new Error("Kod ve ad gerekli");
        }

        await api("/admin/packages", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        statusEl.className = "status-line status-ok";
        statusEl.textContent = "Paket oluşturuldu.";
        await Promise.all([renderPackages(), renderUsers(), renderNfc()]);
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
              <th>Card UID</th>
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
          await Promise.all([renderEntitlements(), renderUsers()]);
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

async function renderNfc() {
  const box = $("panelNfc");

  box.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h3>NFC / QR Tanımlama</h3>
        <div class="desc">
          Kartı okut, UID otomatik dolsun. Paket seç, kartı kaydet. Kaydettikten sonra QR üret, yazdır veya karta tekrar yaz.
        </div>

        <div class="row" style="margin-bottom:10px">
          <button id="readCardBtn" class="btn-secondary" type="button">Kartı Oku</button>
          <button id="writeCardBtn" class="btn-secondary" type="button">Karta URL Yaz</button>
        </div>

        <div class="split">
          <input id="nfcUidInput" placeholder="UID (otomatik / manuel)" />
          <input id="nfcSerialInput" placeholder="Serial No (opsiyonel)" />
        </div>

        <div class="split">
          <select id="nfcPackageSelect"></select>
          <input id="nfcExpiresAt" placeholder="Kart bitiş ISO (opsiyonel)" />
        </div>

        <div class="split">
          <input id="nfcMaxDevices" type="number" min="1" value="1" placeholder="Maks cihaz" />
          <select id="nfcIsActive">
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
        </div>

        <div class="split">
          <select id="nfcStatusSelect">
            <option value="new">new</option>
            <option value="bound">bound</option>
            <option value="blocked">blocked</option>
            <option value="passive">passive</option>
          </select>
          <input id="nfcNote" placeholder="Not" />
        </div>

        <button id="saveNfcBtn" class="btn-primary" type="button">Kartı Kaydet / Güncelle</button>
        <div id="nfcStatus" class="status-line"></div>
      </div>

      <div class="card">
        <h3>QR Üretim ve Yazdırma</h3>
        <div class="desc">
          UID yazıldığında QR link otomatik oluşur. Aynı link üzerinden QR indirilebilir, yazdırılabilir ve tekrar yazdırılabilir.
        </div>

        <div class="kv">
          <input id="uidPreviewInput" placeholder="UID yaz / karttan gelsin" />
          <input id="uidPreviewOutput" readonly placeholder="Temiz UID" />
          <input id="qrLinkOutput" readonly placeholder="QR link burada oluşur" />
        </div>

        <div style="margin-top:12px; padding:14px; border:1px solid var(--line-soft); border-radius:18px; background:#151c24;">
          <div style="font-size:12px; font-weight:900; color:var(--muted); margin-bottom:8px;">QR Önizleme</div>
          <div id="qrPreviewWrap" style="display:flex; justify-content:center; align-items:center; min-height:180px; border-radius:16px; background:#fff;"></div>
        </div>

        <div class="row" style="margin-top:12px">
          <button id="generateQrBtn" class="btn-secondary" type="button">QR Oluştur</button>
          <button id="printQrBtn" class="btn-warn" type="button">QR Yazdır</button>
          <button id="reprintQrBtn" class="btn-secondary" type="button">Tekrar Yazdır</button>
        </div>

        <div class="row" style="margin-top:10px">
          <button id="downloadQrBtn" class="btn-secondary" type="button">QR İndir</button>
          <button id="rewriteCardBtn" class="btn-secondary" type="button">Karta Tekrar Yaz</button>
        </div>

        <div id="qrStatus" class="status-line"></div>

        <div class="card" style="margin-top:12px;background:#151c24">
          <h3 style="font-size:16px">Karta Kullanıcı Bağla</h3>
          <div class="desc">Admin yalnızca kartı kullanıcıya bağlayabilir.</div>
          <div class="split">
            <input id="bindUserId" placeholder="Kullanıcı ID" />
            <input id="bindCardUid" placeholder="Kart UID" />
          </div>
          <button id="bindCardBtn" class="btn-secondary" type="button">Kullanıcıya Bağla</button>
          <div id="bindStatus" class="status-line"></div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <h3>QR Tasarım Ayarları</h3>
      <div class="desc">Etiket çıktısı için hızlı görünüm ayarları.</div>

      <div class="split">
        <input id="qrTitleText" placeholder="Başlık" value="italkyAI Erişim Kartı" />
        <input id="qrSubText" placeholder="Alt başlık" value="Tarat / okut / başlat" />
      </div>

      <div class="split">
        <select id="qrShowPackage">
          <option value="true">Paket Adı Göster</option>
          <option value="false">Paket Adı Gizle</option>
        </select>
        <select id="qrShowUid">
          <option value="true">UID Göster</option>
          <option value="false">UID Gizle</option>
        </select>
      </div>

      <div class="split">
        <select id="qrShowExpiry">
          <option value="true">Bitiş Tarihi Göster</option>
          <option value="false">Bitiş Tarihi Gizle</option>
        </select>
        <select id="qrTheme">
          <option value="light">Açık Tema</option>
          <option value="dark">Koyu Tema</option>
          <option value="soft">Yumuşak Tema</option>
        </select>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <h3>Kayıtlı Kartlar</h3>
      <div class="desc">Renkler işlem durumunu gösterir. Tekrar yazdırma ve tekrar yazma aktif kalır.</div>
      <div class="table">
        <table>
          <thead>
            <tr>
              <th>UID</th>
              <th>Paket</th>
              <th>Durum</th>
              <th>Bağlı User</th>
              <th>Bitiş</th>
              <th>QR</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody id="nfcCardsBody">
            <tr><td colspan="7" class="empty">Yükleniyor...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  try {
    await fillPackageSelect("nfcPackageSelect");

    const cards = await api("/admin/nfc/cards");
    const items = Array.isArray(cards?.items) ? cards.items : [];

    const rowTone = (status) => {
      const s = String(status || "").toLowerCase();
      if (s === "bound") return "background:rgba(95,143,120,.12);";
      if (s === "blocked") return "background:rgba(183,100,100,.12);";
      if (s === "passive") return "background:rgba(181,138,82,.10);";
      return "background:rgba(143,165,188,.08);";
    };

    $("nfcCardsBody").innerHTML = items.length ? items.map(c => {
      const uid = escapeHtml(c.uid || "");
      const pkg = escapeHtml(c.package_code || "");
      const isActive = c.is_active ? "Aktif" : "Pasif";
      const boundUser = escapeHtml(c.bound_user_id || "-");
      const expires = escapeHtml(c.expires_at || "-");
      const qrLink = makeQrLink(c.uid || "");
      const status = escapeHtml(c.status || "new");

      return `
        <tr style="${rowTone(c.status)}">
          <td>${uid}</td>
          <td>${pkg}</td>
          <td>${status} / ${isActive}</td>
          <td>${boundUser}</td>
          <td>${expires}</td>
          <td>${escapeHtml(qrLink)}</td>
          <td>
            <div class="mini-actions">
              <button class="btn-secondary" data-load-card="${uid}" type="button">Yükle</button>
              <button class="btn-warn" data-print-card="${uid}" type="button">QR Yazdır</button>
              <button class="btn-secondary" data-rewrite-card="${uid}" type="button">Tekrar Yaz</button>
            </div>
          </td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="7" class="empty">Kart bulunamadı.</td></tr>`;

    function buildQrLinkFromInputs() {
      const clean = normalizeUid($("uidPreviewInput").value);
      $("uidPreviewOutput").value = clean;
      $("qrLinkOutput").value = makeQrLink(clean);

      $("nfcUidInput").value = $("uidPreviewInput").value;
      $("bindCardUid").value = $("uidPreviewInput").value;

      return clean;
    }

    function drawQrPreview() {
      const wrap = $("qrPreviewWrap");
      const link = $("qrLinkOutput").value.trim();

      if (!link) {
        wrap.innerHTML = `<div style="color:#6b7280;font-size:13px;font-weight:800;">QR link bekleniyor</div>`;
        return;
      }

      const imgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
      wrap.innerHTML = `<img src="${imgSrc}" alt="QR" style="width:180px;height:180px;display:block;" />`;
    }

    $("uidPreviewInput").addEventListener("input", () => {
      buildQrLinkFromInputs();
      drawQrPreview();
    });

    $("generateQrBtn").onclick = () => {
      const clean = buildQrLinkFromInputs();
      const qrStatus = $("qrStatus");

      if (!clean) {
        qrStatus.className = "status-line status-err";
        qrStatus.textContent = "Önce UID gerekli.";
        return;
      }

      drawQrPreview();
      qrStatus.className = "status-line status-ok";
      qrStatus.textContent = "QR hazır.";
    };

    $("downloadQrBtn").onclick = () => {
      const link = $("qrLinkOutput").value.trim();
      const qrStatus = $("qrStatus");
      if (!link) {
        qrStatus.className = "status-line status-err";
        qrStatus.textContent = "İndirilecek QR linki yok.";
        return;
      }
      const a = document.createElement("a");
      a.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(link)}`;
      a.download = `italky_qr_${normalizeUid($("uidPreviewInput").value) || "card"}.png`;
      a.click();
      qrStatus.className = "status-line status-ok";
      qrStatus.textContent = "QR indirme başlatıldı.";
    };

    function openPrintWindow() {
      const link = $("qrLinkOutput").value.trim();
      const uid = normalizeUid($("uidPreviewInput").value);
      const title = $("qrTitleText").value.trim() || "italkyAI Erişim Kartı";
      const sub = $("qrSubText").value.trim() || "Tarat / okut / başlat";
      const pkg = $("nfcPackageSelect").selectedOptions[0]?.textContent || "";
      const showPackage = $("qrShowPackage").value === "true";
      const showUid = $("qrShowUid").value === "true";
      const showExpiry = $("qrShowExpiry").value === "true";
      const expiry = $("nfcExpiresAt").value.trim();
      const theme = $("qrTheme").value;

      if (!link) {
        $("qrStatus").className = "status-line status-err";
        $("qrStatus").textContent = "Yazdırmak için önce QR oluştur.";
        return;
      }

      const bg = theme === "dark" ? "#111827" : theme === "soft" ? "#f2f4f7" : "#ffffff";
      const fg = theme === "dark" ? "#ffffff" : "#111827";
      const border = theme === "dark" ? "#374151" : "#d1d5db";

      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(link)}`;

      const html = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>QR Yazdır</title>
          <style>
            body{margin:0;padding:24px;background:${bg};color:${fg};font-family:Arial,sans-serif}
            .sheet{width:320px;border:1px solid ${border};border-radius:18px;padding:18px;margin:0 auto;background:${bg};text-align:center}
            .title{font-size:20px;font-weight:900;margin-bottom:6px}
            .sub{font-size:12px;opacity:.75;margin-bottom:12px}
            .qr{width:220px;height:220px;display:block;margin:0 auto 12px}
            .meta{font-size:12px;line-height:1.6}
          </style>
        </head>
        <body onload="window.print(); setTimeout(()=>window.close(),500);">
          <div class="sheet">
            <div class="title">${escapeHtml(title)}</div>
            <div class="sub">${escapeHtml(sub)}</div>
            <img class="qr" src="${qrSrc}" />
            <div class="meta">
              ${showPackage ? `<div><strong>Paket:</strong> ${escapeHtml(pkg)}</div>` : ``}
              ${showUid ? `<div><strong>UID:</strong> ${escapeHtml(uid)}</div>` : ``}
              ${showExpiry ? `<div><strong>Bitiş:</strong> ${escapeHtml(expiry || "-")}</div>` : ``}
            </div>
          </div>
        </body>
        </html>
      `;

      const w = window.open("", "_blank", "width=420,height=720");
      if (!w) {
        $("qrStatus").className = "status-line status-err";
        $("qrStatus").textContent = "Yazdırma penceresi açılamadı.";
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    }

    $("printQrBtn").onclick = () => {
      openPrintWindow();
      $("qrStatus").className = "status-line status-ok";
      $("qrStatus").textContent = "QR yazdırma açıldı.";
    };

    $("reprintQrBtn").onclick = () => {
      openPrintWindow();
      $("qrStatus").className = "status-line status-ok";
      $("qrStatus").textContent = "QR tekrar yazdırılıyor.";
    };

    $("readCardBtn").onclick = async () => {
      const statusEl = $("nfcStatus");
      statusEl.className = "status-line status-warn";
      statusEl.textContent = "Kart okutulması bekleniyor...";

      try {
        if (window.NativeAdmin && typeof window.NativeAdmin.readNfcUid === "function") {
          const uid = await window.NativeAdmin.readNfcUid();
          if (!uid) throw new Error("UID okunamadı");
          $("nfcUidInput").value = uid;
          $("uidPreviewInput").value = uid;
          $("bindCardUid").value = uid;
          buildQrLinkFromInputs();
          drawQrPreview();
          statusEl.className = "status-line status-ok";
          statusEl.textContent = "Kart UID okundu.";
        } else {
          statusEl.className = "status-line status-err";
          statusEl.textContent = "Bu cihazda NFC okuma köprüsü yok.";
        }
      } catch (e) {
        statusEl.className = "status-line status-err";
        statusEl.textContent = e?.message || "Kart okunamadı.";
      }
    };

    async function writeUrlToCard(reason = "Kart yazılıyor...") {
      const statusEl = $("nfcStatus");
      statusEl.className = "status-line status-warn";
      statusEl.textContent = reason;

      try {
        const uid = $("nfcUidInput").value.trim();
        const clean = normalizeUid(uid);
        const url = makeQrLink(clean);

        if (!clean) throw new Error("Önce UID gerekli");

        if (window.NativeAdmin && typeof window.NativeAdmin.writeNfcPayload === "function") {
          await window.NativeAdmin.writeNfcPayload(url);
          statusEl.className = "status-line status-ok";
          statusEl.textContent = "Kart içine URL yazıldı.";
        } else {
          statusEl.className = "status-line status-err";
          statusEl.textContent = "Bu cihazda kart yazma köprüsü yok.";
        }
      } catch (e) {
        statusEl.className = "status-line status-err";
        statusEl.textContent = e?.message || "Kart yazılamadı.";
      }
    }

    $("writeCardBtn").onclick = async () => {
      await writeUrlToCard("Kart içine URL yazılıyor...");
    };

    $("rewriteCardBtn").onclick = async () => {
      await writeUrlToCard("Kart yeniden yazılıyor...");
    };

    $("saveNfcBtn").onclick = async () => {
      const statusEl = $("nfcStatus");
      statusEl.className = "status-line status-warn";
      statusEl.textContent = "Kart kaydediliyor...";

      try {
        const payload = {
          uid: $("nfcUidInput").value.trim(),
          serial_no: $("nfcSerialInput").value.trim() || null,
          package_code: $("nfcPackageSelect").value,
          is_active: $("nfcIsActive").value === "true",
          expires_at: $("nfcExpiresAt").value.trim() || null,
          max_devices: Number($("nfcMaxDevices").value || 1),
          status: $("nfcStatusSelect").value,
          note: $("nfcNote").value.trim() || null
        };

        if (!payload.uid) throw new Error("UID gerekli");

        await api("/admin/nfc/cards/upsert", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        buildQrLinkFromInputs();
        drawQrPreview();

        statusEl.className = "status-line status-ok";
        statusEl.textContent = "Kart kaydedildi. QR ve kart yazma işlemleri hazır.";

        await renderNfc();
      } catch (e) {
        statusEl.className = "status-line status-err";
        statusEl.textContent = e?.message || "Kart kaydedilemedi.";
      }
    };

    $("bindCardBtn").onclick = async () => {
      const bindStatus = $("bindStatus");
      bindStatus.className = "status-line status-warn";
      bindStatus.textContent = "Kullanıcı bağlanıyor...";

      try {
        const userId = $("bindUserId").value.trim();
        const cardUid = $("bindCardUid").value.trim();
        const packageCode = $("nfcPackageSelect").value;

        if (!userId || !cardUid) {
          throw new Error("Kullanıcı ID ve Kart UID gerekli");
        }

        await api("/admin/entitlements/assign", {
          method: "POST",
          body: JSON.stringify({
            user_id: userId,
            package_code: packageCode,
            source_type: "nfc_qr",
            card_uid: cardUid,
            note: "Admin panelinden NFC/QR bağlandı"
          })
        });

        bindStatus.className = "status-line status-ok";
        bindStatus.textContent = "Kullanıcı karta bağlandı.";
        await Promise.all([renderNfc(), renderUsers()]);
      } catch (e) {
        bindStatus.className = "status-line status-err";
        bindStatus.textContent = e?.message || "Bağlama başarısız.";
      }
    };

    box.querySelectorAll("[data-load-card]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-load-card") || "";
        $("uidPreviewInput").value = uid;
        $("nfcUidInput").value = uid;
        $("bindCardUid").value = uid;
        buildQrLinkFromInputs();
        drawQrPreview();
      });
    });

    box.querySelectorAll("[data-print-card]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-print-card") || "";
        $("uidPreviewInput").value = uid;
        buildQrLinkFromInputs();
        drawQrPreview();
        openPrintWindow();
      });
    });

    box.querySelectorAll("[data-rewrite-card]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const uid = btn.getAttribute("data-rewrite-card") || "";
        $("nfcUidInput").value = uid;
        $("uidPreviewInput").value = uid;
        buildQrLinkFromInputs();
        await writeUrlToCard("Kart yeniden yazılıyor...");
      });
    });

    buildQrLinkFromInputs();
    drawQrPreview();

  } catch (e) {
    box.innerHTML = `<div class="card"><h3>NFC / QR</h3>${statusHtml(e?.message || "NFC alanı yüklenemedi", false)}</div>`;
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

      if (!payload.path || !payload.content) {
        throw new Error("Path ve içerik gerekli");
      }

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
