import { supabase } from "/js/supabase_client.js";

const RPC_NAME = "redeem_promo_code_v1";
const AUTH_PENDING_CODE_KEY = "italkyai_campaign_auth_pending_code";

const campaignModal = document.getElementById("campaignModal");
const closeCampaignModal = document.getElementById("closeCampaignModal");
const campaignModalTitle = document.getElementById("campaignModalTitle");
const campaignModalDesc = document.getElementById("campaignModalDesc");
const campaignStepAccount = document.getElementById("campaignStepAccount");
const campaignStepSuccess = document.getElementById("campaignStepSuccess");
const campaignForm = document.getElementById("campaignForm");
const campaignCodePreview = document.getElementById("campaignCodePreview");
const campaignSubmitBtn = document.getElementById("campaignSubmitBtn");
const campaignStatus = document.getElementById("campaignStatus");
const campaignSelectedAccount = document.getElementById("campaignSelectedAccount");
const campaignOAuthOptions = document.getElementById("campaignOAuthOptions");
const changeCampaignAccount = document.getElementById("changeCampaignAccount");
const authOptions = document.querySelector(".auth-options");
const oauthButtons = document.querySelectorAll("[data-oauth-provider]");
const successStoreContainer = document.querySelector(".success-store-buttons");
const pageContainer = document.querySelector(".page");
const pageFooter = document.querySelector("footer");

let campaignSession = null;
let campaignCodeValue = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function getCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const hasOAuthCode = params.has("code") && (params.has("state") || params.has("error") || params.has("error_description"));
  const code = params.get("kod") || (!hasOAuthCode ? params.get("code") : "") || storageGet(AUTH_PENDING_CODE_KEY) || "";
  return normalizeCode(code);
}

function storageGet(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function storageSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    // Session storage can be unavailable in strict in-app browsers.
  }
}

function storageRemove(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch (error) {
    // Nothing to clean when session storage is unavailable.
  }
}

function isReturningFromOAuth() {
  return Boolean(campaignCodeValue && storageGet(AUTH_PENDING_CODE_KEY) === campaignCodeValue);
}

function hasOAuthCallbackSignal() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  return hashParams.has("access_token")
    || hashParams.has("refresh_token")
    || hashParams.has("provider_token")
    || hashParams.has("error")
    || (params.has("kod") && params.has("code"));
}

function getCallbackParam(name) {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  return params.get(name) || hashParams.get(name) || "";
}

function getOAuthErrorFromUrl() {
  const error = getCallbackParam("error");
  const description = getCallbackParam("error_description");
  const code = getCallbackParam("error_code");

  if (!error && !description) return null;
  return { error, description, code };
}

function shortTechnicalDetail(oauthError) {
  const detail = oauthError.description || oauthError.code || oauthError.error || "";
  return detail.trim().slice(0, 180);
}

function getRedirectUrl() {
  return `https://italky.ai/kampanya?kod=${encodeURIComponent(campaignCodeValue)}`;
}

function shouldConfirmSession() {
  return Boolean(campaignSession);
}

function userLabel(session = campaignSession) {
  return session?.user?.email || session?.user?.user_metadata?.email || session?.user?.id || "-";
}

function setCampaignStatus(type, message) {
  campaignStatus.className = `form-status visible ${type}`;
  campaignStatus.textContent = message;
}

function resetCampaignStatus() {
  campaignStatus.className = "form-status";
  campaignStatus.textContent = "";
}

function setHeading(title, accent, description) {
  campaignModalTitle.innerHTML = `${escapeHtml(title)}${accent ? ` <span>${escapeHtml(accent)}</span>` : ""}`;
  campaignModalDesc.textContent = description || "";
}

function mountCampaignCard() {
  if (pageContainer && campaignModal && pageFooter && campaignModal.parentElement !== pageContainer) {
    pageContainer.insertBefore(campaignModal, pageFooter);
  }

  campaignModal.classList.add("active");
  campaignModal.setAttribute("aria-hidden", "false");
}

function setCampaignCodeFields() {
  if (campaignCodePreview) {
    campaignCodePreview.value = campaignCodeValue;
  }
}

function showStep(stepName) {
  campaignStepAccount.hidden = stepName !== "account";
  campaignForm.hidden = stepName !== "confirm";
  campaignStepSuccess.hidden = stepName !== "success";

  if (stepName === "confirm") {
    requestAnimationFrame(() => campaignSubmitBtn.focus());
  }
}

function openCampaignDialog() {
  mountCampaignCard();
  campaignModal.classList.add("active");
  campaignModal.setAttribute("aria-hidden", "false");
}

function closeCampaignDialog() {
  window.location.href = "https://italky.ai";
}

function showCodeMissing() {
  setHeading("Kod", "hatalı", "Bu kampanya kodu bulunamadı. Lütfen bağlantıyı kontrol edin.");
  showStep("none");
  setCampaignStatus("error", "Bu kampanya kodu bulunamadı. Lütfen bağlantıyı kontrol edin.");
  openCampaignDialog();
}

function showAccountStep() {
  resetCampaignStatus();
  setCampaignCodeFields();
  updateAuthButtons();
  setHeading(
    "Hesabınızı",
    "Seçin",
    "Kampanya kodu aşağıdaki hesaba tanımlanacaktır. Lütfen uygulamada kullanacağınız Google veya Apple hesabıyla giriş yapın."
  );
  campaignOAuthOptions.hidden = false;
  showStep("account");
  openCampaignDialog();
}

function showConfirmStep({ session = campaignSession } = {}) {
  resetCampaignStatus();
  campaignSession = session || null;

  if (!campaignSession) {
    showAccountStep();
    setCampaignStatus("error", "Giriş gerekli. Kampanya hakkının hesabınıza tanımlanması için önce Google veya Apple hesabınızla giriş yapmalısınız.");
    return;
  }

  const account = userLabel(campaignSession);
  setHeading(
    "Hesabı",
    "Onaylayın",
    "Kampanya kodu aşağıdaki hesaba tanımlanacaktır:"
  );
  campaignSelectedAccount.textContent = account;
  showStep("confirm");
  openCampaignDialog();
}

function detectDevicePlatform() {
  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  const uaDataPlatform = navigator.userAgentData?.platform || "";

  const isAndroid =
    /android/i.test(ua) ||
    /android/i.test(uaDataPlatform);

  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    /ios/i.test(uaDataPlatform) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isAndroid) return "android";
  if (isIOS) return "ios";
  return "unknown";
}

function updateSuccessStoreButtons() {
  const platform = detectDevicePlatform();
  const appleBtn = document.querySelector('[data-success-store="ios"]');
  const googleBtn = document.querySelector('[data-success-store="android"]');

  if (platform === "android") {
    if (appleBtn) {
      appleBtn.hidden = true;
      appleBtn.style.display = "none";
    }
    if (googleBtn) {
      googleBtn.hidden = false;
      googleBtn.style.display = "";
    }
    successStoreContainer?.classList.add("single-store");
  } else if (platform === "ios") {
    if (appleBtn) {
      appleBtn.hidden = false;
      appleBtn.style.display = "";
    }
    if (googleBtn) {
      googleBtn.hidden = true;
      googleBtn.style.display = "none";
    }
    successStoreContainer?.classList.add("single-store");
  } else {
    if (appleBtn) {
      appleBtn.hidden = false;
      appleBtn.style.display = "";
    }
    if (googleBtn) {
      googleBtn.hidden = false;
      googleBtn.style.display = "";
    }
    successStoreContainer?.classList.remove("single-store");
  }
}

function updateAuthButtons() {
  const platform = detectDevicePlatform();
  const singleAuth = platform === "ios" || platform === "android";

  authOptions?.classList.toggle("single-auth", singleAuth);

  oauthButtons.forEach(button => {
    const provider = button.dataset.oauthProvider;
    const shouldHide = platform === "ios"
      ? provider !== "apple"
      : platform === "android"
        ? provider !== "google"
        : false;

    button.hidden = shouldHide;
    button.style.display = shouldHide ? "none" : "";
  });
}

function showSuccessStep() {
  resetCampaignStatus();
  storageRemove(AUTH_PENDING_CODE_KEY);
  updateSuccessStoreButtons();
  setHeading(
    "Kodunuz",
    "Doğrulandı",
    "Kampanya hakkınız hesabınıza tanımlandı."
  );
  showStep("success");
  openCampaignDialog();
}

function showErrorScreen(title, message) {
  setHeading(title, "", message);
  showStep("none");
  setCampaignStatus("error", message);
  openCampaignDialog();
}

function showAppleOAuthError(oauthError) {
  resetCampaignStatus();
  setCampaignCodeFields();
  setHeading(
    "Apple ile giriş",
    "tamamlanamadı",
    "Apple hesabıyla giriş işlemi tamamlanamadı. Lütfen tekrar deneyin. Sorun devam ederse Apple web giriş ayarları kontrol edilmelidir."
  );
  showStep("none");

  const detail = shortTechnicalDetail(oauthError);
  setCampaignStatus(
    "error",
    detail
      ? `Apple hesabıyla giriş işlemi tamamlanamadı. Teknik detay: ${detail}`
      : "Apple hesabıyla giriş işlemi tamamlanamadı. Lütfen tekrar deneyin."
  );

  openCampaignDialog();
}

async function getActiveSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { session: null, error };
  }

  return { session: data?.session || null, error: null };
}

async function signInWithProvider(provider) {
  resetCampaignStatus();

  if (!campaignCodeValue) {
    showCodeMissing();
    return;
  }

  const redirectTo = getRedirectUrl();
  const options = { redirectTo };

  if (provider === "google") {
    options.queryParams = { prompt: "select_account" };
  }

  storageSet(AUTH_PENDING_CODE_KEY, campaignCodeValue);
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options
  });

  if (error) {
    storageRemove(AUTH_PENDING_CODE_KEY);
    setCampaignStatus("error", error.message || "Giriş başlatılamadı. Lütfen tekrar deneyin.");
  }
}

async function signOutForAccountChange() {
  resetCampaignStatus();
  changeCampaignAccount.disabled = true;
  changeCampaignAccount.textContent = "Hesap değiştiriliyor...";

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setCampaignStatus("error", error.message || "Hesap değiştirilemedi. Lütfen tekrar deneyin.");
      return;
    }

    campaignSession = null;
    storageRemove(AUTH_PENDING_CODE_KEY);
    showAccountStep();
  } finally {
    changeCampaignAccount.disabled = false;
    changeCampaignAccount.textContent = "Hesabı Değiştir";
  }
}

function rpcErrorCodeFrom(data, error) {
  const raw = data && typeof data === "object" ? data : {};
  const candidates = [
    raw.error,
    raw.code,
    raw.error_code,
    raw.reason,
    error?.code,
    error?.message,
    raw.message
  ];
  const text = candidates.filter(Boolean).join(" ").toUpperCase();

  if (text.includes("CODE_NOT_FOUND") || text.includes("NOT_FOUND")) return "CODE_NOT_FOUND";
  if (text.includes("CODE_ALREADY_USED") || text.includes("ALREADY_USED")) return "CODE_ALREADY_USED";
  if (text.includes("USER_ALREADY_REDEEMED")) return "USER_ALREADY_REDEEMED";
  if (text.includes("CODE_EXPIRED") || text.includes("EXPIRED")) return "CODE_EXPIRED";
  if (text.includes("AUTH_REQUIRED") || text.includes("JWT") || text.includes("AUTH")) return "AUTH_REQUIRED";
  return "UNKNOWN";
}

function errorCopyFor(code) {
  switch (code) {
    case "CODE_NOT_FOUND":
      return {
        title: "Kod hatalı",
        message: "Bu kampanya kodu bulunamadı. Lütfen bağlantıyı kontrol edin."
      };
    case "CODE_ALREADY_USED":
    case "USER_ALREADY_REDEEMED":
      return {
        title: "Bu kod kullanılmış",
        message: "Bu kampanya kodu daha önce kullanılmış. Bu kod ile tekrar işlem yapılamaz."
      };
    case "CODE_EXPIRED":
      return {
        title: "Kodun süresi dolmuş",
        message: "Bu kampanya kodunun kullanım süresi sona ermiş."
      };
    case "AUTH_REQUIRED":
      return {
        title: "Giriş gerekli",
        message: "Kampanya hakkının hesabınıza tanımlanması için önce Google veya Apple hesabınızla giriş yapmalısınız."
      };
    default:
      return {
        title: "İşlem tamamlanamadı",
        message: "Lütfen daha sonra tekrar deneyin."
      };
  }
}

async function redeemPromoCode(code) {
  const { session, error: sessionError } = await getActiveSession();
  if (sessionError) {
    return { ok: false, errorCode: "UNKNOWN" };
  }

  campaignSession = session;
  if (!campaignSession) {
    return { ok: false, errorCode: "AUTH_REQUIRED" };
  }

  const { data, error } = await supabase.rpc(RPC_NAME, {
    p_code: code
  });

  if (error) {
    return { ok: false, errorCode: rpcErrorCodeFrom(data, error) };
  }

  if (data && typeof data === "object" && (data.ok === false || data.success === false)) {
    return { ok: false, errorCode: rpcErrorCodeFrom(data, null) };
  }

  return { ok: true, data };
}

async function bootCampaignFlow() {
  mountCampaignCard();
  campaignCodeValue = getCodeFromUrl();
  setCampaignCodeFields();

  const oauthError = getOAuthErrorFromUrl();
  if (oauthError) {
    showAppleOAuthError(oauthError);
    return;
  }

  if (!campaignCodeValue) {
    showCodeMissing();
    return;
  }

  const { session, error } = await getActiveSession();
  if (error) {
    showErrorScreen("İşlem tamamlanamadı", "Lütfen daha sonra tekrar deneyin.");
    return;
  }

  campaignSession = session;
  if (shouldConfirmSession()) {
    showConfirmStep({ session: campaignSession });
    return;
  }

  showAccountStep();
}

closeCampaignModal.addEventListener("click", closeCampaignDialog);

oauthButtons.forEach(button => {
  button.addEventListener("click", () => {
    signInWithProvider(button.dataset.oauthProvider);
  });
});

changeCampaignAccount.addEventListener("click", signOutForAccountChange);

campaignForm.addEventListener("submit", async event => {
  event.preventDefault();
  resetCampaignStatus();

  const code = normalizeCode(campaignCodeValue);
  campaignCodeValue = code;
  setCampaignCodeFields();

  if (!code) {
    showCodeMissing();
    return;
  }

  campaignSubmitBtn.disabled = true;
  campaignSubmitBtn.textContent = "Onaylanıyor...";

  try {
    const result = await redeemPromoCode(code);
    if (!result.ok) {
      const copy = errorCopyFor(result.errorCode);
      if (result.errorCode === "AUTH_REQUIRED") {
        showAccountStep();
        setCampaignStatus("error", `${copy.title} ${copy.message}`);
      } else {
        showErrorScreen(copy.title, copy.message);
      }
      return;
    }

    showSuccessStep();
  } catch (error) {
    const copy = errorCopyFor("UNKNOWN");
    showErrorScreen(copy.title, copy.message);
  } finally {
    campaignSubmitBtn.disabled = false;
    campaignSubmitBtn.textContent = "Onaylıyorum";
  }
});

supabase.auth.onAuthStateChange((event, session) => {
  campaignSession = session;
  if (session && campaignCodeValue && event === "SIGNED_IN" && shouldConfirmSession()) {
    showConfirmStep({ session });
  }
});

bootCampaignFlow();
