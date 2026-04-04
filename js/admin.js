// FILE: /js/admin.js

import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import {
  createNfcTokenCard,
  listNfcTokenCards,
  updateNfcCardStatus,
  generateLongUid
} from "/js/admin_nfc_tokens.js";

const $ = (id) => document.getElementById(id);

const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = {
  users: $("panelUsers"),
  wallet: $("panelWallet"),
  nfc: $("panelNfc"),
  manual: $("panelManual")
};

const meLine = $("meLine");
const usersTableBody = $("usersTableBody");
const walletTableBody = $("walletTableBody");
const userSearch = $("userSearch");
const walletSearch = $("walletSearch");
const userRefreshBtn = $("userRefreshBtn");
const walletRefreshBtn = $("walletRefreshBtn");

const uidInput = $("uid");
const amountInput = $("amount");
const noteInput = $("note");
const saveBtn = $("saveBtn");
const genUidBtn = $("genUidBtn");
const nfcSearch = $("nfcSearch");
const nfcRefreshBtn = $("nfcRefreshBtn");
const nfcTableBody = $("nfcTableBody");
const nfcCreateStatus = $("nfcCreateStatus");
const nfcPreview = $("nfcPreview");
const writeNfcBtn = $("writeNfcBtn");
const printQrBtn = $("printQrBtn");

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
let latestCreatedCard = null;

function setStatus(el, text, cls = "") {
  if (!el) return;
  el.className = `status-line ${cls}`.trim();
  el.textContent = text || "";
}

function fmt(v) {
  if (!v) return "-";
  try { return new Date(v).toLocaleString("tr-TR"); } catch { return "-"; }
}

function statusText(v) {
  const s = String(v || "").toLowerCase();
  if (s === "active") return "Aktif";
  if (s === "used") return "Kullanıldı";
  if (s === "blocked") return "Engelli";
  return s || "-";
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

async function getCurrentUserAndProfile() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser?.id) {
    location.href = "/pages/login.html";
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, tokens")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;
  meLine.textContent = currentProfile
    ? `${currentProfile.full_name || "-"} • ${currentProfile.email || "-"} • Rol: ${currentProfile.role || "-"}`
    : `${currentUser.email || "-"} • Profil bulunamadı`;

  if ((currentProfile?.role || "").toLowerCase() !== "superadmin") {
    if (manualLoadBtn) manualLoadBtn.disabled = true;
    setStatus(manualStatus, "Manuel jeton yükleme sadece superadmin içindir.", "status-warn");
  }
}

async function loadUsers() {
  const q = String(userSearch?.value || "").trim().toLowerCase();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, tokens")
    .order("id", { ascending: false });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,id.ilike.%${q}%`);
  }

  const { data, error } = await query.limit(200);

  if (error) {
    usersTableBody.innerHTML = `<tr><td colspan="5" class="empty">Kullanıcılar yüklenemedi.</td></tr>`;
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) {
    usersTableBody.innerHTML = `<tr><td colspan="5" class="empty">Kullanıcı bulunamadı.</td></tr>`;
    return;
  }

  usersTableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.full_name || "-"}</td>
      <td>${row.email || "-"}</td>
      <td>${row.role || "-"}</td>
      <td>${row.tokens ?? 0}</td>
      <td>${row.id || "-"}</td>
    </tr>
  `).join("");
}

async function loadWallet() {
  const q = String(walletSearch?.value || "").trim().toLowerCase();

  let query = supabase
    .from("wallet_tx")
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = await query.limit(200);

  if (error) {
    walletTableBody.innerHTML = `<tr><td colspan="5" class="empty">Hareketler yüklenemedi.</td></tr>`;
    return;
  }

  let rows = Array.isArray(data) ? data : [];

  if (q) {
    rows = rows.filter((row) => {
      const blob = JSON.stringify(row).toLowerCase();
      return blob.includes(q);
    });
  }

  if (!rows.length) {
    walletTableBody.innerHTML = `<tr><td colspan="5" class="empty">Hareket bulunamadı.</td></tr>`;
    return;
  }

  walletTableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.user_id || "-"}</td>
      <td>${row.delta ?? row.amount ?? 0}</td>
      <td>${row.reason || "-"}</td>
      <td>${row.note || "-"}</td>
      <td>${fmt(row.created_at)}</td>
    </tr>
  `).join("");
}

function renderNfcPreview(row) {
  latestCreatedCard = row || null;

  if (!row) {
    nfcPreview.textContent = "Henüz kart oluşturulmadı.";
    return;
  }

  nfcPreview.innerHTML = `
    <div><b>UID:</b> ${row.uid || "-"}</div>
    <div style="margin-top:8px"><b>6 Haneli Kod:</b> ${row.manual_code || "-"}</div>
    <div style="margin-top:8px"><b>QR:</b><br>${row.qr_url || "-"}</div>
    <div style="margin-top:8px"><b>Jeton:</b> ${row.token_amount ?? 0}</div>
    <div style="margin-top:8px"><b>Kart Altı Yazı:</b><br>Kod: ${row.manual_code || "-"}</div>
  `;
}

async function loadNfcCards() {
  try {
    const rows = await listNfcTokenCards(nfcSearch?.value || "");

    if (!rows.length) {
      nfcTableBody.innerHTML = `<tr><td colspan="7" class="empty">Kart bulunamadı.</td></tr>`;
      return;
    }

    nfcTableBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${row.uid || "-"}</td>
        <td>${row.manual_code || "-"}</td>
        <td>${row.token_amount ?? 0}</td>
        <td>${statusText(row.status)}</td>
        <td>${row.redeemed_by_user_id || row.assigned_user_id || "-"}</td>
        <td style="max-width:220px;word-break:break-all">${row.qr_url || "-"}</td>
        <td>
          <div class="mini-actions">
            <button class="btn-secondary" type="button" data-action="active" data-uid="${row.uid}">Aktif</button>
            <button class="btn-danger" type="button" data-action="blocked" data-uid="${row.uid}">Blokla</button>
          </div>
        </td>
      </tr>
    `).join("");

    nfcTableBody.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await updateNfcCardStatus(btn.dataset.uid, btn.dataset.action);
          await loadNfcCards();
        } catch (e) {
          setStatus(nfcCreateStatus, "Kart durumu güncellenemedi: " + (e.message || e), "status-err");
        }
      });
    });
  } catch (e) {
    nfcTableBody.innerHTML = `<tr><td colspan="7" class="empty">Kartlar yüklenemedi.</td></tr>`;
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
    await Promise.allSettled([loadUsers(), loadWallet(), loadNfcCards()]);
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

function bindNativeAdminEvents() {
  window.onNativeNfcWriteResult = function(ok, message) {
    const cls = ok ? "status-ok" : "status-err";
    setStatus(
      nfcCreateStatus,
      String(message || (ok ? "NFC yazdırma işlemi tamamlandı." : "NFC yazdırma işlemi başarısız oldu.")),
      cls
    );
  };

  window.addEventListener("italky:nfc-write", (e) => {
    const detail = e?.detail || {};
    const uid = String(detail.uid || "").trim();
    const payload = String(detail.payload || "").trim();

    if (uid || payload) {
      setStatus(
        nfcCreateStatus,
        `NFC yazdırma tamamlandı • UID: ${uid || "-"} • Veri: ${payload || "-"}`,
        "status-ok"
      );
    }
  });

  window.addEventListener("italky:nfc-error", (e) => {
    const msg = String(e?.detail?.message || "NFC işlemi başarısız oldu.").trim();
    setStatus(nfcCreateStatus, msg, "status-err");
  });

  window.addEventListener("italky:nfc-status", (e) => {
    const msg = String(e?.detail?.message || "").trim();
    if (msg) setStatus(nfcCreateStatus, msg, "status-warn");
  });
}

function bindNfc() {
  genUidBtn?.addEventListener("click", () => {
    uidInput.value = generateLongUid();
  });

  document.querySelectorAll("[data-quick-amount]").forEach((el) => {
    el.addEventListener("click", () => {
      amountInput.value = el.getAttribute("data-quick-amount") || "";
      if (!uidInput.value.trim()) {
        uidInput.value = generateLongUid();
      }
    });
  });

  saveBtn?.addEventListener("click", async () => {
    try {
      setStatus(nfcCreateStatus, "Kart kaydediliyor...", "status-warn");

      const row = await createNfcTokenCard({
        uid: uidInput.value,
        tokenAmount: amountInput.value,
        note: noteInput.value
      });

      setStatus(
        nfcCreateStatus,
        `Kart oluşturuldu • UID: ${row.uid} • Kod: ${row.manual_code} • ${row.token_amount} jeton`,
        "status-ok"
      );

      renderNfcPreview(row);
      uidInput.value = "";
      amountInput.value = "";
      noteInput.value = "";

      await loadNfcCards();
    } catch (e) {
      setStatus(nfcCreateStatus, "Kart oluşturulamadı: " + (e.message || e), "status-err");
    }
  });

  writeNfcBtn?.addEventListener("click", async () => {
    try {
      if (!latestCreatedCard?.uid) {
        setStatus(nfcCreateStatus, "Önce kart oluştur.", "status-warn");
        return;
      }

      if (window.NativeAdmin && typeof window.NativeAdmin.writeNfcText === "function") {
        window.NativeAdmin.writeNfcText(String(latestCreatedCard.uid));
        setStatus(nfcCreateStatus, `Kartı telefona yaklaştırın • Yazılacak UID: ${latestCreatedCard.uid}`, "status-warn");
        return;
      }

      setStatus(nfcCreateStatus, "Bu cihazda NFC yazdırma köprüsü yok.", "status-err");
    } catch (e) {
      setStatus(nfcCreateStatus, "NFC yazdırma hatası: " + (e.message || e), "status-err");
    }
  });

  printQrBtn?.addEventListener("click", () => {
    try {
      if (!latestCreatedCard?.qr_url || !latestCreatedCard?.manual_code) {
        setStatus(nfcCreateStatus, "Önce kart oluştur.", "status-warn");
        return;
      }

      const qrText = latestCreatedCard.qr_url;
      const shortCode = latestCreatedCard.manual_code;
      const tokenAmount = latestCreatedCard.token_amount || 0;

      const w = window.open("", "_blank", "width=480,height=760");
      if (!w) {
        setStatus(nfcCreateStatus, "QR yazdırma penceresi açılamadı.", "status-err");
        return;
      }

      const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrText)}`;

      w.document.write(`
        <!doctype html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <title>Jeton Kartı Yazdır</title>
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
              width:340px;
              border:2px solid #111;
              border-radius:24px;
              padding:24px;
              text-align:center;
            }
            .brand{
              font-size:28px;
              font-weight:900;
              margin-bottom:10px;
            }
            .amount{
              font-size:26px;
              font-weight:900;
              margin-bottom:18px;
            }
            .qr{
              width:280px;
              height:280px;
              object-fit:contain;
              margin:0 auto 16px;
              display:block;
            }
            .code{
              font-size:34px;
              font-weight:900;
              letter-spacing:4px;
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
            <div class="amount">${tokenAmount} JETON</div>
            <img class="qr" src="${qrImg}" alt="QR">
            <div class="code">${shortCode}</div>
            <div class="sub">QR okutun veya uygulamada bu 6 haneli kodu girin.</div>
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
      setStatus(nfcCreateStatus, "QR yazdırma hatası: " + (e.message || e), "status-err");
    }
  });

  nfcRefreshBtn?.addEventListener("click", loadNfcCards);
  nfcSearch?.addEventListener("input", loadNfcCards);
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

  bindNativeAdminEvents();

  await getCurrentUserAndProfile();

  bindTabs();
  bindTopActions();
  bindUsers();
  bindWallet();
  bindNfc();
  bindManual();

  await Promise.allSettled([loadUsers(), loadWallet(), loadNfcCards()]);

  document.getElementById("pageContent")?.classList.add("ready");
}

init();
