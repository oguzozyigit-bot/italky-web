// FILE: /js/global_access.js

import { supabase } from "/js/supabase_client.js";

let ACCESS_CACHE = null;

async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

async function fetchAccessState() {
  if (ACCESS_CACHE) return ACCESS_CACHE;

  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_access_state")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    console.error("ACCESS LOAD ERROR:", error);
    return null;
  }

  ACCESS_CACHE = data;
  return data;
}

function isAccessAllowed(state) {
  if (!state) return false;

  const now = new Date();

  // 1) açık erişim varsa
  if (state.access_open) return true;

  // 2) trial
  if (state.trial_ends_at && new Date(state.trial_ends_at) > now) {
    return true;
  }

  // 3) paket
  if (
    state.package_active &&
    state.package_ends_at &&
    new Date(state.package_ends_at) > now
  ) {
    return true;
  }

  return false;
}

function getRemainingDays(state) {
  if (!state?.trial_ends_at) return 0;

  const diff = new Date(state.trial_ends_at) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function replacePageWithLockScreen() {
  document.body.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      background:#05070a;
      color:#fff;
      font-family: Outfit, sans-serif;
      text-align:center;
    ">
      <div style="
        width:min(100%,420px);
        border-radius:24px;
        padding:20px;
        background:rgba(255,255,255,.05);
      ">
        <div style="font-size:32px;margin-bottom:10px;">🔒</div>
        <div style="font-size:22px;font-weight:900;margin-bottom:10px;">
          Üyelik Gerekli
        </div>
        <div style="font-size:14px;margin-bottom:16px;">
          Kullanıma devam etmek için paket seçmelisiniz.
        </div>

        <button onclick="location.href='/pages/upgrade_pack.html'" style="
          width:100%;
          height:48px;
          border:none;
          border-radius:12px;
          background:#f97316;
          color:#fff;
          font-weight:900;
        ">
          Paket Seç
        </button>
      </div>
    </div>
  `;
}

function showPopup(state) {
  if (!state) return;

  const remaining = getRemainingDays(state);

  if (remaining > 0 && remaining <= 3) {
    alert(`Deneme süren bitmek üzere (${remaining} gün kaldı)`);
  }

  if (remaining === 0 && !state.package_active) {
    alert("Deneme süren bitti. Üyelik alman gerekiyor.");
  }
}

export async function initGlobalAccess() {
  const state = await fetchAccessState();

  if (!state) {
    replacePageWithLockScreen();
    return;
  }

  const allowed = isAccessAllowed(state);

  if (!allowed) {
    replacePageWithLockScreen();
    return;
  }

  showPopup(state);
}

export async function enforcePackageBeforeTokens() {
  const state = await fetchAccessState();

  if (!state) return false;

  if (isAccessAllowed(state)) return true;

  alert("Jeton için önce paket almalısın.");
  location.href = "/pages/upgrade_pack.html";
  return false;
}

export async function getGlobalAccessState() {
  return await fetchAccessState();
}
