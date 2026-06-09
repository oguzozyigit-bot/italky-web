const API_BASE = "https://italky-api.onrender.com";
const CACHE_KEY = "italky_ui_translate_cache_v2";
const SUPPORTED = ["en", "de", "fr", "it", "es"];

(function installStableMenuPolicy() {
  if (typeof window === "undefined" || window.__ITALKY_STABLE_MEMBER_MENU_POLICY__) return;
  window.__ITALKY_STABLE_MEMBER_MENU_POLICY__ = true;
  window.__ITALKY_MEMBER_GUEST_MENU_POLICY__ = true;

  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.ozyigits.italkyai";

  function isIOSNativeAppShell() {
    const params = new URLSearchParams(window.location.search || "");
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";

    const queryIOS =
      params.get("ios") === "1" ||
      params.get("platform") === "ios" ||
      params.get("app") === "ios";

    const hasIOSBridge =
      !!window.webkit?.messageHandlers?.IOSStoreKit ||
      !!window.webkit?.messageHandlers?.italkyIOS ||
      !!window.webkit?.messageHandlers?.iosBridge;

    const looksLikeIOS =
      /iPhone|iPad|iPod/i.test(ua) ||
      (platform === "MacIntel" && navigator.maxTouchPoints > 1);

    return queryIOS || hasIOSBridge || looksLikeIOS;
  }

  function notify(message) {
    const text = String(message || "").trim();
    if (!text) return;
    try {
      if (typeof window.showToast === "function") {
        window.showToast(text);
        return;
      }
    } catch {}
    const existing = document.getElementById("italkyStableMenuToast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "italkyStableMenuToast";
    toast.textContent = text;
    toast.style.cssText = "position:fixed;left:50%;top:22px;transform:translateX(-50%);max-width:min(92vw,430px);padding:11px 14px;border-radius:16px;background:rgba(10,16,30,.96);border:1px solid rgba(255,255,255,.14);color:#fff;font-family:Outfit,system-ui,sans-serif;font-size:12px;font-weight:900;text-align:center;z-index:2147483647;box-shadow:0 18px 38px rgba(0,0,0,.38);";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  }

  function isGuest(nav) {
    const login = nav?.querySelector?.("#menuLoginLink");
    const profile = nav?.querySelector?.("#profileLink");
    const loginVisible = !!login && !login.hidden && getComputedStyle(login).display !== "none";
    const profileVisible = !!profile && !profile.hidden && getComputedStyle(profile).display !== "none";
    try {
      if (localStorage.getItem("italky_guest_mode_v1") === "1" && loginVisible) return true;
    } catch {}
    return loginVisible && !profileVisible;
  }

  function findNativeBridge() {
    return window.AndroidBilling || window.AndroidBridge || window.Native || window.AndroidAppBridge;
  }

  function openRate() {
    try {
      const bridge = findNativeBridge();
      if (bridge?.openAppReview) { bridge.openAppReview(); return; }
      if (bridge?.rateApp) { bridge.rateApp(); return; }
      if (bridge?.openPlayStore) { bridge.openPlayStore(); return; }
    } catch {}
    try {
      window.location.href = PLAY_STORE_URL;
    } catch {
      notify("Puanlama sayfası açılamadı. Lütfen daha sonra tekrar deneyin.");
    }
  }

  function requestWidget() {
    const bridge = findNativeBridge();
    const methods = ["requestPinWidget", "pinWidget", "pinAppWidget", "pinAppShortcut", "requestPinShortcut", "addHomeShortcut", "addShortcut"];
    for (const method of methods) {
      try {
        if (bridge && typeof bridge[method] === "function") {
          bridge[method]();
          return;
        }
      } catch {}
    }
    notify("Bu cihazda otomatik widget ekleme desteklenmiyor. Ana ekrandan widget ekleyebilirsiniz.");
  }

  function button(id, label, action) {
    const el = document.createElement("button");
    el.id = id;
    el.type = "button";
    el.className = "menu-action member-only-menu-action";
    el.textContent = label;
    el.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    });
    return el;
  }

  function apply() {
    const nav = document.querySelector(".menu-nav");
    if (!nav) return;

    nav.querySelectorAll("#logoutBtn,[data-menu-policy='logout']").forEach((el) => el.remove());
    Array.from(nav.querySelectorAll("button,a")).forEach((el) => {
      const text = (el.textContent || "").toLocaleLowerCase("tr-TR");
      if (text.includes("güvenli çıkış") || text.includes("çıkış yap") || text.trim() === "logout") {
        el.remove();
      }
    });

    const existingRate = nav.querySelector("#memberRateAppBtn");
    const existingWidget = nav.querySelector("#memberPinWidgetBtn");
    if (isIOSNativeAppShell()) {
      existingRate?.remove();
      existingWidget?.remove();
      return;
    }
    if (isGuest(nav)) {
      existingRate?.remove();
      existingWidget?.remove();
      return;
    }
    if (existingRate && existingWidget) return;

    existingRate?.remove();
    existingWidget?.remove();
    const anchor = nav.querySelector("a[href='/pages/privacy.html']") || nav.querySelector("#privacyLink") || nav.lastElementChild;
    const rate = button("memberRateAppBtn", "Bizi Puanla", openRate);
    const widget = button("memberPinWidgetBtn", "Kısayol / Widget Ekle", requestWidget);
    if (anchor?.parentNode) {
      anchor.insertAdjacentElement("afterend", widget);
      anchor.insertAdjacentElement("afterend", rate);
    } else {
      nav.append(rate, widget);
    }
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
  setTimeout(schedule, 200);
  setTimeout(schedule, 900);
  try {
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "style", "class"]
    });
  } catch {}
}());

function getCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function makeKey(text, lang) {
  return `${lang}:::${String(text || "").trim()}`;
}

export async function aiTranslateText(text, lang) {
  const clean = String(text || "").trim();
  const target = String(lang || "").toLowerCase().trim();

  if (!clean) return "";
  if (!SUPPORTED.includes(target)) return clean;

  const cache = getCache();
  const key = makeKey(clean, target);

  if (cache[key]) return cache[key];

  try {
    const res = await fetch(`${API_BASE}/api/ui-translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: clean,
        target_lang: target
      })
    });

    if (!res.ok) return clean;

    const data = await res.json().catch(() => ({}));
    const translated = String(data?.translated_text || clean).trim() || clean;

    cache[key] = translated;
    setCache(cache);

    return translated;
  } catch {
    return clean;
  }
}
