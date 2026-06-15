// Keeps code-only access single-device by polling the activation session backend.
(function installActivationSessionGuard(){
  if (window.__italkyActivationSessionGuardInstalled) return;
  window.__italkyActivationSessionGuardInstalled = true;

  const API = "https://italky-api.onrender.com/api/promo/corporate";
  const CODE_KEY = "italky_activation_code";
  const SESSION_KEY = "italky_activation_session_key";
  const EXPIRES_KEY = "italky_activation_expires_at";
  const DEVICE_KEY = "italky_activation_device_id";
  const ACCESS_MODE_KEY = "italky_access_mode";
  const USER_CACHE_KEYS = [
    "italky_user_v1",
    "italky_user",
    "italky_cached_user",
    "italky_user_cache",
    "italky_profile",
    "italky_profile_cache",
    "italky_current_user",
    "italky_google_user",
    "italky_google_profile",
    "italky_auth_user",
    "italky_session_user",
    "italky_guest_mode_v1",
    "italky_ios_guest"
  ];
  const LEGACY_KEYS = ["italky_code_access_code_v1", "italky_code_active_session_key_v1", "italky_access_open_v1"];
  const SKIP_PATHS = ["/pages/login.html", "/pages/login_ios.html", "/pages/promo_gate.html", "/pages/membership.html", "/pages/membership_ios.html"];

  function currentPath(){
    try { return location.pathname || ""; } catch { return ""; }
  }

  function shouldSkip(){
    const path = currentPath();
    return SKIP_PATHS.some((item) => path.indexOf(item) >= 0);
  }

  function isCodeMode(){
    try {
      return localStorage.getItem(ACCESS_MODE_KEY) === "code" &&
        !!localStorage.getItem(CODE_KEY) &&
        !!localStorage.getItem(SESSION_KEY);
    } catch {
      return false;
    }
  }

  function uuid(){
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch {}
    return `device-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }

  function getDeviceId(){
    try {
      const existing = localStorage.getItem(DEVICE_KEY);
      if (existing && existing.length > 8) return existing;
      const id = uuid();
      localStorage.setItem(DEVICE_KEY, id);
      return id;
    } catch {
      return uuid();
    }
  }

  function clearAuthAndUserCaches(){
    try { USER_CACHE_KEYS.forEach((key) => localStorage.removeItem(key)); } catch {}
    try { USER_CACHE_KEYS.forEach((key) => sessionStorage.removeItem(key)); } catch {}
  }

  function clearActivation(){
    try {
      localStorage.removeItem(CODE_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(EXPIRES_KEY);
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
      if (localStorage.getItem(ACCESS_MODE_KEY) === "code") localStorage.removeItem(ACCESS_MODE_KEY);
    } catch {}
  }

  function clearAllLocalAccess(){
    clearActivation();
    clearAuthAndUserCaches();
  }

  function applyCodeShellIdentity(){
    if (!isCodeMode()) return;
    clearAuthAndUserCaches();
    try { localStorage.setItem(ACCESS_MODE_KEY, "code"); } catch {}

    const nameEl = document.getElementById("menuUserName");
    if (nameEl) nameEl.textContent = "Kodlu Üyelik";

    const loginDateEl = document.getElementById("menuLoginDate");
    if (loginDateEl) loginDateEl.textContent = "Aktif Kod Üyeliği";

    const picEl = document.getElementById("menuUserPic");
    if (picEl) {
      picEl.removeAttribute("src");
      picEl.alt = "Kodlu Üyelik";
    }

    ["adminPanelLink", "italkyAiTestLink"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add("hidden");
      el.style.display = "none";
    });
  }

  async function check(){
    if (shouldSkip()) return;
    let code = "";
    let activeSessionKey = "";
    try {
      code = localStorage.getItem(CODE_KEY) || "";
      activeSessionKey = localStorage.getItem(SESSION_KEY) || "";
    } catch {}
    if (!code || !activeSessionKey) return;

    applyCodeShellIdentity();

    const deviceId = getDeviceId();
    const url = `${API}/status?code=${encodeURIComponent(code)}&active_session_key=${encodeURIComponent(activeSessionKey)}&device_id=${encodeURIComponent(deviceId)}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json && json.active === false) {
        clearAllLocalAccess();
        try { sessionStorage.setItem("italky_code_session_message", "Bu kod başka bir cihazda aktif edildi."); } catch {}
        location.replace("/pages/login.html?code_session_replaced=1");
      }
    } catch {}
  }

  document.addEventListener("click", (event) => {
    const target = event.target && event.target.closest ? event.target.closest("#logoutBtn,#deleteAccountBtn,#menuLoginLink") : null;
    if (!target) return;
    clearAllLocalAccess();
  }, true);

  setInterval(applyCodeShellIdentity, 1500);
  setTimeout(check, 900);
  setInterval(check, 45000);
})();
