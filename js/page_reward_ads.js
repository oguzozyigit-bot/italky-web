const PAGE_REWARD_STATE_KEY = "italky_page_reward_state_v1";
const PAGE_REWARD_COOLDOWN_MS = 180 * 60 * 1000;
const MODAL_ID = "italkyPageRewardAdModal";
const STYLE_ID = "italkyPageRewardAdStyle";

let activeFlow = null;

function nowTs() {
  return Date.now();
}

function normalizeKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_");
}

function readState() {
  try {
    const raw = localStorage.getItem(PAGE_REWARD_STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    localStorage.setItem(PAGE_REWARD_STATE_KEY, JSON.stringify(state || {}));
  } catch {}
}

export function getPageRewardState(pageKey = "") {
  const key = normalizeKey(pageKey);
  const state = readState();
  const nextAt = Number(state?.[key]?.nextAt || 0);
  return {
    pageKey: key,
    nextAt,
    eligible: !nextAt || nextAt <= nowTs(),
    remainingMs: Math.max(0, nextAt - nowTs()),
  };
}

function markRewardCompleted(pageKey = "") {
  const key = normalizeKey(pageKey);
  if (!key) return;
  const state = readState();
  const completedAt = nowTs();
  state[key] = {
    completedAt,
    nextAt: completedAt + PAGE_REWARD_COOLDOWN_MS,
  };
  writeState(state);
}

function getRewardedBridge() {
  const candidates = [
    window.AndroidAdBridge,
    window.NativeAds,
    window.AdMobBridge,
    window.Native,
    window.AndroidBridge,
  ];
  return (
    candidates.find(
      (bridge) =>
        bridge &&
        (typeof bridge.showRewardedAd === "function" ||
          typeof bridge.showRewardedAdForLang === "function")
    ) || null
  );
}

function callRewardedBridge(placement) {
  // Current Android app exposes AndroidAdBridge/NativeAds/AdMobBridge with
  // showRewardedAd(placement). Prefer these exact one-argument bridges first.
  const oneArgBridges = [
    window.AndroidAdBridge,
    window.NativeAds,
    window.AdMobBridge,
  ];
  for (const bridge of oneArgBridges) {
    try {
      if (bridge && typeof bridge.showRewardedAd === "function") {
        bridge.showRewardedAd(placement);
        return true;
      }
    } catch {}
  }

  // NativeBridge uses showRewardedAd(langCode, placement).
  try {
    if (window.Native && typeof window.Native.showRewardedAd === "function") {
      window.Native.showRewardedAd("", placement);
      return true;
    }
  } catch {}

  // Compatibility fallback for bridges exposing showRewardedAdForLang.
  const bridge = getRewardedBridge();
  if (!bridge) return false;
  try {
    if (typeof bridge.showRewardedAdForLang === "function") {
      bridge.showRewardedAdForLang("", placement);
      return true;
    }
  } catch {}

  return false;
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .italky-page-reward-backdrop{
      position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;
      padding:20px;background:rgba(2,6,23,.76);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)
    }
    .italky-page-reward-backdrop.open{display:flex}
    .italky-page-reward-card{
      width:min(100%,430px);overflow:hidden;border-radius:24px;border:1px solid rgba(88,205,255,.24);
      background:linear-gradient(180deg,#0d1c2c,#07111f);box-shadow:0 26px 70px rgba(0,0,0,.52);color:#fff;
      font-family:Outfit,Arial,sans-serif
    }
    .italky-page-reward-top{padding:22px 20px 18px;background:radial-gradient(circle at 12% 0%,rgba(54,200,255,.18),transparent 42%)}
    .italky-page-reward-badge{display:inline-flex;padding:7px 11px;border-radius:999px;border:1px solid rgba(88,205,255,.22);background:rgba(54,200,255,.09);font-size:11px;font-weight:900;color:#dff7ff}
    .italky-page-reward-title{margin:14px 0 9px;font-size:23px;line-height:1.12;font-weight:900;letter-spacing:-.25px}
    .italky-page-reward-text{margin:0;color:rgba(235,246,255,.86);font-size:14px;line-height:1.58;font-weight:700}
    .italky-page-reward-actions{display:grid;gap:10px;padding:16px;background:rgba(3,9,18,.62)}
    .italky-page-reward-btn{min-height:52px;border-radius:16px;cursor:pointer;font:inherit;font-size:14px;font-weight:900}
    .italky-page-reward-btn.primary{border:0;color:#04111d;background:linear-gradient(135deg,#b9f1ff,#36c8ff)}
    .italky-page-reward-btn.secondary{color:#eef8ff;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.12)}
    .italky-page-reward-btn:active{transform:scale(.985)}
  `;
  document.head.appendChild(style);
}

function ensureModal() {
  ensureStyle();
  let modal = document.getElementById(MODAL_ID);
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.className = "italky-page-reward-backdrop";
  modal.innerHTML = `
    <div class="italky-page-reward-card" role="dialog" aria-modal="true" aria-labelledby="italkyPageRewardTitle">
      <div class="italky-page-reward-top">
        <div class="italky-page-reward-badge">ÖDÜLLÜ REKLAM</div>
        <h2 class="italky-page-reward-title" id="italkyPageRewardTitle">Kısa bir reklam</h2>
        <p class="italky-page-reward-text" id="italkyPageRewardText"></p>
      </div>
      <div class="italky-page-reward-actions">
        <button class="italky-page-reward-btn primary" id="italkyPageRewardWatch" type="button">Reklamı İzle</button>
        <button class="italky-page-reward-btn secondary" id="italkyPageRewardSkip" type="button">Şimdi Değil</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function showIntro(label = "bu bölüm") {
  return new Promise((resolve) => {
    const modal = ensureModal();
    const text = modal.querySelector("#italkyPageRewardText");
    const watch = modal.querySelector("#italkyPageRewardWatch");
    const skip = modal.querySelector("#italkyPageRewardSkip");

    if (text) {
      text.textContent = `Bu bölümü ziyaret ettiğiniz için kısa bir ödüllü reklam gösterebiliriz. Reklamı tamamladığınızda ${label} bölümünde 180 dakika boyunca tekrar reklam gösterilmez. Anlayışınız için teşekkür ederiz.`;
    }

    const cleanup = (choice) => {
      modal.classList.remove("open");
      watch?.removeEventListener("click", onWatch);
      skip?.removeEventListener("click", onSkip);
      resolve(choice);
    };
    const onWatch = () => cleanup("watch");
    const onSkip = () => cleanup("skip");

    watch?.addEventListener("click", onWatch);
    skip?.addEventListener("click", onSkip);
    modal.classList.add("open");
  });
}

function waitForRewardedResult(placement, timeoutMs = 65000) {
  return new Promise((resolve) => {
    let done = false;
    let earned = false;
    const previousEarned = window.onNativeRewardEarned;
    const previousClosed = window.onNativeRewardClosed;

    const samePlacement = (payload) => {
      const incoming = String(payload?.placement || "").trim();
      return !incoming || incoming === placement;
    };

    const finish = (payload) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.onNativeRewardEarned = previousEarned;
      window.onNativeRewardClosed = previousClosed;
      resolve({ earned, payload: payload || {} });
    };

    window.onNativeRewardEarned = function (payload) {
      try {
        if (typeof previousEarned === "function") previousEarned(payload);
      } catch {}
      if (samePlacement(payload)) earned = true;
    };

    window.onNativeRewardClosed = function (payload) {
      try {
        if (typeof previousClosed === "function") previousClosed(payload);
      } catch {}
      if (samePlacement(payload)) finish(payload || {});
    };

    const timer = setTimeout(
      () => finish({ shown: false, reason: "timeout", placement }),
      timeoutMs
    );
  });
}

export async function ensurePageRewardAd(options = {}) {
  const pageKey = normalizeKey(options.pageKey || options.placement || "page");
  const label = String(options.label || "bu bölüm").trim() || "bu bölüm";
  const placement = normalizeKey(options.placement || `page_${pageKey}`) || `page_${pageKey}`;

  if (!pageKey) return { status: "invalid_page", earned: false };

  const current = getPageRewardState(pageKey);
  if (!current.eligible) {
    return { status: "cooldown", earned: true, ...current };
  }

  // Rewarded ads exist only in the native app. The normal web experience must continue.
  if (!getRewardedBridge()) {
    return { status: "no_native_bridge", earned: false };
  }

  if (activeFlow) return activeFlow;

  activeFlow = (async () => {
    const choice = await showIntro(label);
    if (choice !== "watch") {
      return { status: "skipped", earned: false };
    }

    const resultPromise = waitForRewardedResult(placement);
    const started = callRewardedBridge(placement);
    if (!started) {
      return { status: "not_started", earned: false };
    }

    const result = await resultPromise;
    if (result.earned) {
      markRewardCompleted(pageKey);
      return {
        status: "earned",
        earned: true,
        ...getPageRewardState(pageKey),
      };
    }

    return {
      status: String(result?.payload?.reason || "closed_without_reward"),
      earned: false,
    };
  })();

  try {
    return await activeFlow;
  } finally {
    activeFlow = null;
  }
}

export const PAGE_REWARD_COOLDOWN_MINUTES = 180;
