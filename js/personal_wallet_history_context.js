// italkyAI bireysel jeton hareketleri görünümü.
// Ana kaynak: iCany business_members.personal_token_balance + personal_* hareketleri.

const PERSONAL_WALLET_ENDPOINT = "https://icany.ai/api/bridge/personal-wallet";

function isWalletHistoryPage() {
  const path = String(location.pathname || "").toLowerCase();
  return path === "/pages/wallet_history.html" || path === "/wallet_history.html";
}

function formatInt(value) {
  try {
    return Number(value || 0).toLocaleString("tr-TR");
  } catch {
    return String(value || 0);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) return "Kayıt öncesi bakiye";
  try {
    return new Date(value).toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

async function getItalkySession() {
  try {
    const module = await import("/js/supabase_client.js");
    const { data } = await module.supabase.auth.getSession();
    return data?.session || null;
  } catch (error) {
    console.warn("[personal_wallet_history] session", error);
    return null;
  }
}

async function fetchPersonalHistory(session) {
  const userId = String(session?.user?.id || "").trim();
  const email = String(session?.user?.email || "").trim().toLowerCase();
  const accessToken = String(session?.access_token || "").trim();
  if (!userId || !email || !accessToken) return null;

  const response = await fetch(PERSONAL_WALLET_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    body: JSON.stringify({
      userId,
      email,
      includeHistory: true,
      historyLimit: 300,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok || payload?.wallet !== "personal") {
    throw new Error(payload?.error || `personal_wallet_${response.status}`);
  }
  return payload;
}

function buildRows(items, currentBalance) {
  const rows = (Array.isArray(items) ? items : [])
    .map((row, index) => ({
      id: String(row?.id || index),
      amount: Number(row?.amount || 0),
      title: String(row?.moduleName || row?.note || "Bireysel jeton işlemi"),
      createdAt: String(row?.createdAt || row?.created_at || ""),
      balanceAfter: 0,
      synthetic: false,
    }))
    .filter((row) => Number.isFinite(row.amount) && row.amount !== 0);

  let cursor = Math.max(0, Number(currentBalance) || 0);
  for (const row of rows) {
    row.balanceAfter = cursor;
    cursor -= row.amount;
  }

  const carriedBalance = Math.max(0, Math.floor(cursor));
  if (carriedBalance > 0) {
    rows.push({
      id: "personal-opening-balance",
      amount: carriedBalance,
      title: "Devreden kişisel bakiye",
      createdAt: "",
      balanceAfter: carriedBalance,
      synthetic: true,
    });
  }

  return rows;
}

function render(payload) {
  const balance = Math.max(
    0,
    Number(payload?.personalTokenBalance ?? payload?.tokenBalance ?? 0)
  );
  const rows = buildRows(payload?.items, balance);
  const loaded = rows.reduce((sum, row) => sum + (row.amount > 0 ? row.amount : 0), 0);
  const spent = rows.reduce((sum, row) => sum + (row.amount < 0 ? Math.abs(row.amount) : 0), 0);

  ["currentBalance", "summaryBalance", "headerTokens", "drawerTokens"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.dataset.walletSource = "icany-personal";
      el.textContent = formatInt(balance);
    }
  });

  const totalLoaded = document.getElementById("totalLoaded");
  const totalSpent = document.getElementById("totalSpent");
  const resultInfo = document.getElementById("resultInfo");
  const listWrap = document.getElementById("listWrap");
  if (totalLoaded) totalLoaded.textContent = formatInt(loaded);
  if (totalSpent) totalSpent.textContent = formatInt(spent);
  if (resultInfo) resultInfo.textContent = `${rows.length} hareket`;
  if (!listWrap) return;

  if (!rows.length) {
    listWrap.innerHTML = '<div class="empty">Henüz bireysel jeton hareketi yok.</div>';
    return;
  }

  listWrap.dataset.walletSource = "icany-personal";
  listWrap.innerHTML = rows
    .map((row) => {
      const positive = row.amount > 0;
      const group = positive ? "plus" : "minus";
      const icon = positive ? (row.synthetic ? "↻" : "+") : "−";
      const type = positive ? (row.synthetic ? "DEVİR" : "YÜKLENEN") : "KULLANILAN";
      const delta = `${positive ? "+" : ""}${formatInt(row.amount)}`;
      return `<div class="row" data-personal-history-row="1">
        <div class="icon ${group}">${icon}</div>
        <div class="mid">
          <div class="mid-top"><div class="type-pill">${type}</div></div>
          <div class="title">${escapeHtml(row.title)}</div>
          <div class="date">${escapeHtml(formatDate(row.createdAt))}</div>
        </div>
        <div class="right">
          <div class="delta ${group}">${escapeHtml(delta)}</div>
          <div class="after">Bakiye: ${escapeHtml(formatInt(row.balanceAfter))}</div>
        </div>
      </div>`;
    })
    .join("");
}

let loading = null;
async function loadAndRender() {
  if (!isWalletHistoryPage()) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      const session = await getItalkySession();
      if (!session?.user) return;
      const payload = await fetchPersonalHistory(session);
      if (payload) render(payload);
    } catch (error) {
      console.warn("[personal_wallet_history]", error);
    } finally {
      loading = null;
    }
  })();
  return loading;
}

function boot() {
  if (!isWalletHistoryPage()) return;
  [50, 500, 1400, 3000, 5000].forEach((delay) => window.setTimeout(loadAndRender, delay));
  window.addEventListener("focus", loadAndRender);
  window.addEventListener("pageshow", loadAndRender);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
