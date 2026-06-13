import { supabase } from "/js/supabase_client.js";

const RPC_NAME = "redeem_promo_code_v1";

const campaignModal = document.getElementById("campaignModal");
const openCampaignModal = document.getElementById("openCampaignModal");
const closeCampaignModal = document.getElementById("closeCampaignModal");
const campaignModalTitle = document.getElementById("campaignModalTitle");
const campaignModalDesc = document.getElementById("campaignModalDesc");
const campaignStepAccount = document.getElementById("campaignStepAccount");
const campaignStepSuccess = document.getElementById("campaignStepSuccess");
const campaignForm = document.getElementById("campaignForm");
const campaignCode = document.getElementById("campaignCode");
const campaignSubmitBtn = document.getElementById("campaignSubmitBtn");
const campaignStatus = document.getElementById("campaignStatus");
const campaignSelectedAccount = document.getElementById("campaignSelectedAccount");
const campaignOAuthOptions = document.getElementById("campaignOAuthOptions");
const campaignSessionConfirm = document.getElementById("campaignSessionConfirm");
const campaignCurrentAccount = document.getElementById("campaignCurrentAccount");
const continueWithCurrentAccount = document.getElementById("continueWithCurrentAccount");
const changeCampaignAccount = document.getElementById("changeCampaignAccount");
const oauthButtons = document.querySelectorAll("[data-oauth-provider]");

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
  return normalizeCode(params.get("kod") || params.get("code") || "");
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

function showStep(stepName) {
  campaignStepAccount.hidden = stepName !== "account";
  campaignForm.hidden = stepName !== "verify";
  campaignStepSuccess.hidden = stepName !== "success";

  if (stepName === "verify") {
    requestAnimationFrame(() => campaignSubmitBtn.focus());
  }
}

function openCampaignDialog() {
  campaignModal.classList.add("active");
  campaignModal.setAttribute("aria-hidden", "false");
}

function closeCampaignDialog() {
  campaignModal.classList.remove("active");
  campaignModal.setAttribute("aria-hidden", "true");
}

function showCodeMissing() {
  setHeading("Kod", "Bulunamadı.", "Bu bağlantıda kampanya kodu yok. Lütfen QR/NFC bağlantısını kontrol edin.");
  showStep("none");
  setCampaignStatus("error", "Kod bulunamadı. Bu bağlantıda kampanya kodu yok. Lütfen QR/NFC bağlantısını kontrol edin.");
  openCampaignDialog();
}

function showAccountStep({ session = campaignSession } = {}) {
  resetCampaignStatus();
  campaignSession = session || null;

  if (campaignSession) {
    const account = userLabel(campaignSession);
    setHeading(
      "Hesabınızı",
      "Kontrol Edin",
      `Şu anda açık hesap: ${account}`
    );
    campaignCurrentAccount.textContent = `Şu anda açık hesap: ${account}`;
    campaignOAuthOptions.hidden = true;
    campaignSessionConfirm.hidden = false;
  } else {
    setHeading(
      "Hesabınızı",
      "Seçin",
      "Lütfen italkyAI uygulamasını kullanacağınız veya hâlihazırda kullandığınız Google ya da Apple hesabıyla giriş yapın. Kampanya hakkı seçtiğiniz hesaba tanımlanacaktır."
    );
    campaignOAuthOptions.hidden = false;
    campaignSessionConfirm.hidden = true;
  }

  showStep("account");
  openCampaignDialog();
}

function showVerifyStep() {
  resetCampaignStatus();

  if (!campaignSession) {
    showAccountStep({ session: null });
    return;
  }

  setHeading(
    "Kampanya Kodunu",
    "Doğrula",
    "Kampanya kodunuz hazır. Bu kodu seçtiğiniz hesaba tanımlamak için doğrulayın."
  );
  campaignCode.value = campaignCodeValue;
  campaignSelectedAccount.textContent = `Seçilen hesap: ${userLabel()}`;
  showStep("verify");
  openCampaignDialog();
}

function showSuccessStep() {
  resetCampaignStatus();
  setHeading(
    "Kodunuz",
    "Doğrulandı",
    "Kampanya hakkınız hesabınıza tanımlandı. Günlerin uygulamada görünmesi için lütfen uygulamayı tamamen kapatıp tekrar açın."
  );
  showStep("success");
  setCampaignStatus("success", "Kodunuz işlendi. Günlerin uygulamada görünmesi için uygulamayı kapatıp tekrar açın.");
  openCampaignDialog();
}

function showErrorScreen(title, message) {
  setHeading(title, "", message);
  showStep("verify");
  setCampaignStatus("error", `${title} ${message}`);
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

  const redirectTo = window.location.href.split("#")[0];
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo }
  });

  if (error) {
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
    showAccountStep({ session: null });
  } finally {
    changeCampaignAccount.disabled = false;
    changeCampaignAccount.textContent = "Hesap Değiştir";
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
        title: "Kod hatalı.",
        message: "Bu kampanya kodu bulunamadı. Lütfen kodu kontrol edin."
      };
    case "CODE_ALREADY_USED":
    case "USER_ALREADY_REDEEMED":
      return {
        title: "Bu kod kullanılmış.",
        message: "Bu kampanya kodu daha önce kullanılmış. Bu kod ile tekrar işlem yapılamaz."
      };
    case "CODE_EXPIRED":
      return {
        title: "Kodun süresi dolmuş.",
        message: "Bu kampanya kodunun kullanım süresi sona ermiş."
      };
    case "AUTH_REQUIRED":
      return {
        title: "Giriş gerekli.",
        message: "Kodun hesabınıza tanımlanması için önce Google veya Apple hesabınızla giriş yapmalısınız."
      };
    default:
      return {
        title: "İşlem tamamlanamadı.",
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

async function bootCampaignFlow({ forceOpen = false } = {}) {
  campaignCodeValue = getCodeFromUrl();

  if (!campaignCodeValue) {
    showCodeMissing();
    return;
  }

  campaignCode.value = campaignCodeValue;
  const { session, error } = await getActiveSession();
  if (error) {
    showErrorScreen("İşlem tamamlanamadı.", "Lütfen daha sonra tekrar deneyin.");
    return;
  }

  campaignSession = session;
  showAccountStep({ session: campaignSession });
}

openCampaignModal.addEventListener("click", () => {
  bootCampaignFlow({ forceOpen: true });
});

closeCampaignModal.addEventListener("click", closeCampaignDialog);

oauthButtons.forEach(button => {
  button.addEventListener("click", () => {
    signInWithProvider(button.dataset.oauthProvider);
  });
});

continueWithCurrentAccount.addEventListener("click", showVerifyStep);
changeCampaignAccount.addEventListener("click", signOutForAccountChange);

campaignModal.addEventListener("click", event => {
  if (event.target === campaignModal) {
    closeCampaignDialog();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && campaignModal.classList.contains("active")) {
    closeCampaignDialog();
  }
});

campaignForm.addEventListener("submit", async event => {
  event.preventDefault();
  resetCampaignStatus();

  const code = normalizeCode(campaignCodeValue || campaignCode.value);
  campaignCode.value = code;

  if (!code) {
    showCodeMissing();
    return;
  }

  campaignSubmitBtn.disabled = true;
  campaignSubmitBtn.textContent = "Kontrol ediliyor...";

  try {
    const result = await redeemPromoCode(code);
    if (!result.ok) {
      const copy = errorCopyFor(result.errorCode);
      if (result.errorCode === "AUTH_REQUIRED") {
        showAccountStep({ session: null });
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
    campaignSubmitBtn.textContent = "Kodu Doğrula";
  }
});

supabase.auth.onAuthStateChange((event, session) => {
  campaignSession = session;
  if (session && campaignCodeValue && event === "SIGNED_IN") {
    showAccountStep({ session });
  }
});

bootCampaignFlow();
