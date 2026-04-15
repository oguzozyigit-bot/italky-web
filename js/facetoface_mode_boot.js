const MODE_KEY = "facetoface_mode_v4";
const TOAST_KEY = "facetoface_mode_toast_v4";

const topModeToggle = document.getElementById("topModeToggle");
const botModeToggle = document.getElementById("botModeToggle");
const topModeToggleLabel = document.getElementById("topModeToggleLabel");
const botModeToggleLabel = document.getElementById("botModeToggleLabel");
const miniToast = document.getElementById("miniToast");

function showToast(msg = "") {
  if (!miniToast) return;
  miniToast.textContent = String(msg || "");
  miniToast.classList.add("show");
  clearTimeout(window.__facetofaceModeToast);
  window.__facetofaceModeToast = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1900);
}

function getQueryMode() {
  try {
    const params = new URLSearchParams(location.search);
    const value = String(params.get("mode") || "").trim().toLowerCase();
    return value === "offline" || value === "online" ? value : "";
  } catch {
    return "";
  }
}

function getStoredMode() {
  const value = String(localStorage.getItem(MODE_KEY) || "").trim().toLowerCase();
  return value === "offline" || value === "online" ? value : "";
}

function resolveMode() {
  const queryMode = getQueryMode();
  if (queryMode) {
    localStorage.setItem(MODE_KEY, queryMode);
    return queryMode;
  }

  const stored = getStoredMode();
  if (stored === "offline") return "offline";
  if (stored === "online" && navigator.onLine) return "online";
  if (!navigator.onLine) return "offline";
  return "online";
}

function updateOneToggle(toggle, labelEl, mode) {
  if (!toggle || !labelEl) return;
  toggle.classList.remove("online", "offline");
  toggle.classList.add(mode === "offline" ? "offline" : "online");
  labelEl.textContent = mode === "offline" ? "OFFLINE" : "ONLINE";
}

function updateToggleUi(mode) {
  updateOneToggle(topModeToggle, topModeToggleLabel, mode);
  updateOneToggle(botModeToggle, botModeToggleLabel, mode);
}

function writeMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
  updateToggleUi(mode);
}

function buildUrlForMode(mode) {
  const url = new URL(location.href);
  url.searchParams.set("mode", mode);
  return url.toString();
}

function setPendingToast(text) {
  sessionStorage.setItem(TOAST_KEY, text);
}

function consumePendingToast() {
  const msg = sessionStorage.getItem(TOAST_KEY);
  if (!msg) return;
  sessionStorage.removeItem(TOAST_KEY);
  setTimeout(() => showToast(msg), 180);
}

function loadModeScript(mode) {
  const script = document.createElement("script");
  script.type = "module";
  script.src =
    mode === "offline"
      ? "/js/facetoface_offline.js?v=F2F_OFFLINE_V13"
      : "/js/facetoface_page.js?v=F2F_ONLINE_V13";
  document.body.appendChild(script);
}

let switching = false;

async function toggleMode() {
  if (switching) return;
  switching = true;

  const current = resolveMode();

  if (current === "online") {
    writeMode("offline");
    setPendingToast("Offline moda geçildi");
    location.href = buildUrlForMode("offline");
    return;
  }

  if (!navigator.onLine) {
    showToast("İnternet yok. Online moda geçilemiyor.");
    switching = false;
    return;
  }

  writeMode("online");
  setPendingToast("Online moda geçildi");
  location.href = buildUrlForMode("online");
}

function bindModeToggle(toggle) {
  if (!toggle) return;
  toggle.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleMode();
  });
}

function bindNetworkAutoFallback() {
  window.addEventListener("offline", () => {
    const current = resolveMode();
    if (current !== "online") return;

    writeMode("offline");
    setPendingToast("Bağlantı kesildi. Offline moda geçildi.");
    location.href = buildUrlForMode("offline");
  });
}

(function boot() {
  const mode = resolveMode();
  writeMode(mode);
  bindModeToggle(topModeToggle);
  bindModeToggle(botModeToggle);
  bindNetworkAutoFallback();
  consumePendingToast();
  loadModeScript(mode);
})();
