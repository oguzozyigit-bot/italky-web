// /js/public_guest_ux.js
import "/js/site_language_boot.js";

const GUEST_MODE_KEY = "italky_guest_mode_v1";
const MEMBERSHIP_URL = "/pages/membership.html";
const GUEST_SUBSCRIBE_MODAL_ID = "italkyGuestSubscribePrompt";
const GUEST_AD_TIMER_KEY = "italky_guest_page_reward_timer_v1";
const GUEST_AD_FIRST_DELAY_MS = 90 * 1000;
const GUEST_AD_INTERVAL_MS = 2 * 60 * 1000;

function $(id) {
  return document.getElementById(id);
}

function isGuestMode() {
  try { return localStorage.getItem(GUEST_MODE_KEY) === "1"; }
  catch { return false; }
}

function hasCachedSupabaseSession() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = String(localStorage.key(i) || "");
      if (!key.startsWith("sb-")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
      if (token) return true;
    }
  } catch {}
  return false;
}

function isAccessOpen() {
  try {
    const access = window.__ITALKY_ACCESS__ || null;
    return !!(
      access?.access_open || access?.ads_disabled || access?.no_ads || access?.is_no_ads_member ||
      access?.subscription_active || access?.has_active_membership || access?.is_member ||
      access?.is_admin || access?.is_superadmin
    );
  } catch { return false; }
}

function shouldShowGuestCta() {
  return isGuestMode() && !hasCachedSupabaseSession() && !isAccessOpen();
}

function guestLog(label, data = {}) {
  try { console.warn(`[GuestPage] ${label} ${JSON.stringify(data || {})}`); }
  catch { console.warn(`[GuestPage] ${label}`); }
}

function toast(message) {
  const value = String(message || "").trim();
  if (!value) return;

  try {
    if (typeof window.showToast === "function") {
      window.showToast(value);
      return;
    }
  } catch {}

  const existing = $("italkyPublicGuestToast");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.id = "italkyPublicGuestToast";
  el.textContent = value;
  el.style.cssText = "position:fixed;left:50%;top:28px;transform:translateX(-50%) translateY(-120px);max-width:min(92vw,430px);min-height:44px;padding:11px 16px;border-radius:16px;background:rgba(12,16,28,.98);border:1px solid rgba(255,255,255,.15);color:#fff;font-family:Outfit,system-ui,sans-serif;font-size:12px;font-weight:1000;text-align:center;z-index:2147483647;box-shadow:0 18px 36px rgba(0,0,0,.45);transition:.22s ease;pointer-events:none";
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.transform = "translateX(-50%) translateY(0)"; });
  setTimeout(() => {
    el.style.transform = "translateX(-50%) translateY(-120px)";
    setTimeout(() => el.remove(), 260);
  }, 2400);
}

function injectStyles() {
  if ($("italkyPublicGuestUxStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyPublicGuestUxStyle";
  style.textContent = `
    #guideBtn,#publicMicLoginBtn{display:none!important;pointer-events:none!important;}
    .center-hub{justify-content:space-between!important;padding:0 40px!important;}
    .center-hub .orb-wrapper{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;z-index:3!important;}
    .center-hub .hub-btn{position:relative!important;z-index:8!important;}
    .center-hub .hub-btn:first-of-type{margin-right:auto!important;}
    .center-hub .hub-btn:last-of-type{margin-left:auto!important;}
    .drawer-links{gap:10px!important;}
    .italky-member-link{border-color:rgba(96,165,250,.36)!important;background:rgba(37,99,235,.18)!important;}
    .italky-member-link::before{background:radial-gradient(circle at left,rgba(96,165,250,.20),transparent 55%),linear-gradient(135deg,rgba(255,255,255,.045),rgba(37,99,235,.22))!important;}
    .guest-subscribe-backdrop{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(2,6,23,.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
    .guest-subscribe-backdrop.open{display:flex}
    .guest-subscribe-card{width:min(100%,420px);border-radius:24px;overflow:hidden;border:1px solid rgba(96,165,250,.24);background:linear-gradient(180deg,#0f1b33 0%,#071225 100%);box-shadow:0 26px 64px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.045);color:#fff;font-family:Outfit,system-ui,sans-serif}
    .guest-subscribe-body{padding:22px 20px 18px;background:radial-gradient(circle at top left,rgba(96,165,250,.18),transparent 44%),linear-gradient(180deg,rgba(15,27,51,.98),rgba(11,20,38,.98))}
    .guest-subscribe-title{margin:0 0 10px;color:#f8fbff;font-size:23px;line-height:1.12;font-weight:1000;letter-spacing:0}
    .guest-subscribe-text{margin:0;color:rgba(226,232,240,.86);font-size:14px;line-height:1.58;font-weight:760}
    .guest-subscribe-actions{display:grid;gap:10px;padding:16px;background:rgba(5,10,22,.76)}
    .guest-subscribe-btn{min-height:52px;border:none;border-radius:16px;cursor:pointer;font:inherit;font-size:14px;font-weight:1000;transition:transform .14s ease,opacity .14s ease}
    .guest-subscribe-btn:active{transform:scale(.985)}
    .guest-subscribe-btn.primary{color:#061227;background:linear-gradient(135deg,#dbeafe 0%,#60a5fa 100%);box-shadow:0 14px 28px rgba(37,99,235,.22)}
    .guest-subscribe-btn.secondary{color:#eaf2ff;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.11)}
    @media(max-width:390px){.center-hub{padding:0 34px!important}.center-hub .hub-btn{width:48px!important;height:48px!important}.center-hub .orb-wrapper{width:62px!important;height:62px!important}.center-hub .orb{width:62px!important;height:62px!important}}
  `;
  document.head.appendChild(style);
}

function createDrawerLink({ id, className = "", label, suffix = "›", onClick }) {
  const btn = document.createElement("button");
  btn.id = id;
  btn.type = "button";
  btn.className = `drawer-link ${className}`.trim();
  btn.innerHTML = `<span>${label}</span><small>${suffix}</small>`;
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  });
  return btn;
}

function installDrawerActions() {
  const drawer = document.querySelector(".drawer-links");
  if (!drawer) return;

  drawer.innerHTML = "";
  drawer.append(
    createDrawerLink({ id: "guestAboutBtn", label: "Hakkımızda", onClick: () => { location.href = "/pages/about.html"; } }),
    createDrawerLink({ id: "guestPrivacyBtn", label: "Gizlilik", onClick: () => { location.href = "/pages/privacy.html"; } }),
    createDrawerLink({ id: "guestMembershipBtn", className: "italky-member-link", label: "Üye Ol", onClick: () => { location.href = MEMBERSHIP_URL; } })
  );
}

function hideGuestGuideEntry() {
  const guideBtn = $("guideBtn");
  if (!guideBtn) return;
  guideBtn.style.display = "none";
  guideBtn.style.pointerEvents = "none";
  guideBtn.setAttribute("aria-hidden", "true");
}

function hideGuestMembershipCtaOnMain() {
  const micLogin = $("publicMicLoginBtn");
  if (micLogin) micLogin.remove();
  try {
    document.querySelectorAll(".italky-member-link").forEach((el) => {
      if (!el.closest(".drawer-links")) el.remove();
    });
  } catch {}
}

function getRewardedBridge() {
  const bridges = [window.AndroidAdBridge, window.NativeAds, window.AdMobBridge, window.Native, window.AndroidBridge];
  return bridges.find((bridge) => bridge && (
    typeof bridge.showRewardedAd === "function" || typeof bridge.showRewardedAdForLang === "function"
  )) || null;
}

function callRewardedBridge(referenceKey = "guest_mode", placement = "guest_page_timer") {
  const bridge = getRewardedBridge();
  if (!bridge) return false;
  try {
    if (typeof bridge.showRewardedAdForLang === "function") {
      bridge.showRewardedAdForLang("", placement || referenceKey || "guest_page_timer");
      return true;
    }
  } catch (error) {
    guestLog("reward bridge failed", { message: error?.message || String(error || "") });
  }
  try {
    if (typeof bridge.showRewardedAd === "function") {
      bridge.showRewardedAd(String(referenceKey || "guest_mode"), String(placement || "guest_page_timer"));
      return true;
    }
  } catch (error) {
    guestLog("reward bridge failed", { message: error?.message || String(error || "") });
  }
  try {
    if (typeof bridge.showRewardedAd === "function") {
      bridge.showRewardedAd(String(placement || referenceKey || "guest_page_timer"));
      return true;
    }
  } catch (error) {
    guestLog("reward bridge failed", { message: error?.message || String(error || "") });
  }
  return false;
}

function waitForRewardedResult(timeoutMs = 35000) {
  return new Promise((resolve) => {
    let done = false;
    let earned = false;
    const prevEarned = window.onNativeRewardEarned;
    const prevClosed = window.onNativeRewardClosed;
    const finish = (payload = {}) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.onNativeRewardEarned = prevEarned;
      window.onNativeRewardClosed = prevClosed;
      resolve({ shown: !!payload?.shown, earned, payload });
    };
    window.onNativeRewardEarned = function (payload) {
      try { if (typeof prevEarned === "function") prevEarned(payload); } catch {}
      earned = true;
    };
    window.onNativeRewardClosed = function (payload) {
      try { if (typeof prevClosed === "function") prevClosed(payload); } catch {}
      finish(payload || { shown: true });
    };
    const timer = setTimeout(() => finish({ shown: false, reason: "timeout" }), timeoutMs);
  });
}

async function showRewardedAdIfAvailable() {
  if (!getRewardedBridge()) {
    guestLog("reward bridge unavailable", { placement: "guest_page_timer" });
    return false;
  }
  const waitPromise = waitForRewardedResult();
  if (!callRewardedBridge("guest_mode", "guest_page_timer")) return false;
  const result = await waitPromise;
  guestLog("reward flow result", { shown: !!result?.shown, earned: !!result?.earned, reason: result?.payload?.reason || "" });
  return !!(result?.shown || result?.earned);
}

function ensureSubscribeModal() {
  let modal = $(GUEST_SUBSCRIBE_MODAL_ID);
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = GUEST_SUBSCRIBE_MODAL_ID;
  modal.className = "guest-subscribe-backdrop";
  modal.innerHTML = `
    <div class="guest-subscribe-card" role="dialog" aria-modal="true" aria-labelledby="guestSubscribeTitle">
      <div class="guest-subscribe-body">
        <h2 class="guest-subscribe-title" id="guestSubscribeTitle">Reklamsız kullanmak ister misiniz?</h2>
        <p class="guest-subscribe-text">Abone olarak reklamları kaldırabilir ve tüm özellikleri kesintisiz kullanabilirsiniz.</p>
      </div>
      <div class="guest-subscribe-actions">
        <button class="guest-subscribe-btn primary" id="guestSubscribeNowBtn" type="button">Abone Ol</button>
        <button class="guest-subscribe-btn secondary" id="guestSubscribeLaterBtn" type="button">Daha Sonra</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function isSubscribePromptOpen() {
  return $(GUEST_SUBSCRIBE_MODAL_ID)?.classList.contains("open") === true;
}

function showSubscribePrompt() {
  return new Promise((resolve) => {
    if (!shouldShowGuestCta()) { resolve("skip"); return; }
    if (isSubscribePromptOpen()) { resolve("open"); return; }
    const modal = ensureSubscribeModal();
    const subscribeBtn = modal.querySelector("#guestSubscribeNowBtn");
    const laterBtn = modal.querySelector("#guestSubscribeLaterBtn");
    const cleanup = (value) => {
      modal.classList.remove("open");
      subscribeBtn?.removeEventListener("click", onSubscribe);
      laterBtn?.removeEventListener("click", onLater);
      resolve(value);
    };
    const onSubscribe = () => cleanup("subscribe");
    const onLater = () => cleanup("later");
    subscribeBtn?.addEventListener("click", onSubscribe);
    laterBtn?.addEventListener("click", onLater);
    modal.classList.add("open");
  });
}

async function runGuestAdCycle() {
  if (!shouldShowGuestCta()) return;
  if (document.hidden || isSubscribePromptOpen()) return;
  try { await showRewardedAdIfAvailable(); }
  catch (error) { guestLog("reward flow failed", { message: error?.message || String(error || "") }); }
  const choice = await showSubscribePrompt();
  if (choice === "subscribe") location.href = MEMBERSHIP_URL;
}

function stopLegacyGuestRewardTimer() {
  try {
    const timers = window.__ITALKY_GUEST_REWARD_TIMERS__ || {};
    ["public_facetoface_guest", "guest_mode"].forEach((key) => {
      try { timers[key]?.stop?.(); } catch {}
    });
  } catch {}
}

function startGuestAdTimer() {
  if (!shouldShowGuestCta()) {
    stopGuestAdTimer();
    return;
  }
  stopLegacyGuestRewardTimer();
  if (window[GUEST_AD_TIMER_KEY]) return;

  let stopped = false;
  let timer = null;
  const schedule = (delay) => {
    clearTimeout(timer);
    if (stopped || !shouldShowGuestCta()) return;
    timer = setTimeout(async () => {
      if (stopped || !shouldShowGuestCta()) return;
      if (!document.hidden && !isSubscribePromptOpen()) await runGuestAdCycle();
      schedule(GUEST_AD_INTERVAL_MS);
    }, Math.max(1000, Number(delay) || GUEST_AD_INTERVAL_MS));
  };

  window[GUEST_AD_TIMER_KEY] = {
    stop() {
      stopped = true;
      clearTimeout(timer);
      window[GUEST_AD_TIMER_KEY] = null;
    }
  };
  schedule(GUEST_AD_FIRST_DELAY_MS);
}

function stopGuestAdTimer() {
  try { window[GUEST_AD_TIMER_KEY]?.stop?.(); }
  catch {}
  stopLegacyGuestRewardTimer();
}

function installVisibilityTimerGuards() {
  if (window.__ITALKY_GUEST_PAGE_VISIBILITY_GUARD__) return;
  window.__ITALKY_GUEST_PAGE_VISIBILITY_GUARD__ = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (shouldShowGuestCta()) startGuestAdTimer();
  });
  window.addEventListener("pagehide", stopGuestAdTimer);
}

function boot() {
  injectStyles();
  hideGuestGuideEntry();
  installDrawerActions();
  hideGuestMembershipCtaOnMain();
  installVisibilityTimerGuards();
  if (shouldShowGuestCta()) startGuestAdTimer();
  else stopGuestAdTimer();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

setTimeout(boot, 200);
setTimeout(boot, 900);
setTimeout(boot, 1600);
