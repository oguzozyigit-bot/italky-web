import "/js/facetoface_page.js";

window.addEventListener("load", () => {
  const topModeToggle = document.getElementById("topModeToggle");
  const botModeToggle = document.getElementById("botModeToggle");
  const topModeToggleLabel = document.getElementById("topModeToggleLabel");
  const botModeToggleLabel = document.getElementById("botModeToggleLabel");
  const offlineRequiredBackdrop = document.getElementById("offlineRequiredBackdrop");
  const offlineRequiredTitle = document.getElementById("offlineRequiredTitle");
  const offlineRequiredText = document.getElementById("offlineRequiredText");
  const offlineRequiredCloseBtn = document.getElementById("offlineRequiredCloseBtn");
  const miniToast = document.getElementById("miniToast");

  const MODE_KEY = "facetoface_runtime_mode";
  const INSTALLED_KEY = "italky_offline_installed_pairs_v7";

  const showToast = (msg = "") => {
    if (!miniToast) return;
    miniToast.textContent = String(msg || "");
    miniToast.classList.add("show");
    clearTimeout(window.__f2fToggleToast);
    window.__f2fToggleToast = setTimeout(() => {
      miniToast.classList.remove("show");
    }, 1800);
  };

  const canonical = (code) => String(code || "").toLowerCase().split("-")[0].trim();

  const getInstalledPairs = () => {
    try {
      return JSON.parse(localStorage.getItem(INSTALLED_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const hasInstalledOfflinePair = () => {
    const topLang = canonical(window.topLang || "en");
    const botLang = canonical(window.botLang || "tr");
    const pairs = getInstalledPairs();

    return pairs.some((p) => {
      const s = canonical(p?.source);
      const t = canonical(p?.target);
      return (s === topLang && t === botLang) || (s === botLang && t === topLang);
    });
  };

  const syncUi = (mode) => {
    const online = mode === "online";

    [topModeToggle, botModeToggle].forEach((el) => {
      if (!el) return;
      el.classList.remove("online", "offline");
      el.classList.add(online ? "online" : "offline");
    });

    if (topModeToggleLabel) topModeToggleLabel.textContent = online ? "ONLINE" : "OFFLINE";
    if (botModeToggleLabel) botModeToggleLabel.textContent = online ? "ONLINE" : "OFFLINE";

    localStorage.setItem(MODE_KEY, mode);
    window.__facetofaceForcedMode = mode;
  };

  const setModeOnline = () => {
    syncUi("online");
  };

  const setModeOffline = () => {
    syncUi("offline");
  };

  const openOfflineRequiredPopup = () => {
    if (offlineRequiredTitle) offlineRequiredTitle.textContent = "Dil yüklemeniz gerekli";
    if (offlineRequiredText) offlineRequiredText.textContent = "Önce dil yüklemeniz gereklidir.";
    offlineRequiredBackdrop?.classList.add("show");
  };

  const closeOfflineRequiredPopup = () => {
    offlineRequiredBackdrop?.classList.remove("show");
  };

  const tryEnableOfflineMode = () => {
    if (!hasInstalledOfflinePair()) {
      openOfflineRequiredPopup();
      setModeOnline();
      return false;
    }

    setModeOffline();
    showToast("Offline mod hazır");
    return true;
  };

  const onTogglePress = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const current = localStorage.getItem(MODE_KEY) === "offline" ? "offline" : "online";

    if (current === "online") {
      tryEnableOfflineMode();
    } else {
      closeOfflineRequiredPopup();
      setModeOnline();
      showToast("Online mod aktif");
    }
  };

  const hardBind = (el) => {
    if (!el) return;
    el.onclick = onTogglePress;
    el.ontouchend = onTogglePress;
    el.style.pointerEvents = "auto";
  };

  hardBind(topModeToggle);
  hardBind(botModeToggle);

  offlineRequiredCloseBtn && (offlineRequiredCloseBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeOfflineRequiredPopup();
    setModeOnline();
  });

  offlineRequiredBackdrop && (offlineRequiredBackdrop.onclick = (e) => {
    if (e.target === offlineRequiredBackdrop) {
      closeOfflineRequiredPopup();
      setModeOnline();
    }
  });

  setModeOnline();

  console.log("[facetoface toggle fix loaded]");
});
