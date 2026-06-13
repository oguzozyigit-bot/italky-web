import { supabase } from "/js/supabase_client.js";

const RPC_NAME = "redeem_promo_code_v1";

const campaignModal = document.getElementById("campaignModal");
const openCampaignModal = document.getElementById("openCampaignModal");
const closeCampaignModal = document.getElementById("closeCampaignModal");
const campaignForm = document.getElementById("campaignForm");
const campaignCode = document.getElementById("campaignCode");
const campaignSubmitBtn = document.getElementById("campaignSubmitBtn");
const campaignStatus = document.getElementById("campaignStatus");
const oauthButtons = document.querySelectorAll("[data-oauth-provider]");

function getCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("kod") || params.get("code") || "").trim().toUpperCase();
}

function setCampaignStatus(type, message) {
  campaignStatus.className = `form-status visible ${type}`;
  campaignStatus.textContent = message;
}

function resetCampaignStatus() {
  campaignStatus.className = "form-status";
  campaignStatus.textContent = "";
}

function openCampaignDialog() {
  resetCampaignStatus();
  campaignModal.classList.add("active");
  campaignModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => campaignCode.focus());
}

function closeCampaignDialog() {
  campaignModal.classList.remove("active");
  campaignModal.setAttribute("aria-hidden", "true");
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

  const redirectTo = window.location.href.split("#")[0];
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo }
  });

  if (error) {
    setCampaignStatus("error", error.message || "Giriş başlatılamadı. Lütfen tekrar deneyin.");
  }
}

async function redeemPromoCode(code) {
  const { session, error: sessionError } = await getActiveSession();
  if (sessionError) {
    return { ok: false, message: sessionError.message };
  }

  if (!session) {
    return { ok: false, message: "Kod doğrulamak için önce Google veya Apple ile giriş yapın." };
  }

  const { data, error } = await supabase.rpc(RPC_NAME, {
    p_code: code
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (data && typeof data === "object") {
    if (data.ok === false || data.success === false) {
      return { ok: false, message: data.message || data.error || "Kod doğrulanamadı." };
    }
  }

  return { ok: true, data };
}

openCampaignModal.addEventListener("click", openCampaignDialog);
closeCampaignModal.addEventListener("click", closeCampaignDialog);

oauthButtons.forEach(button => {
  button.addEventListener("click", () => {
    signInWithProvider(button.dataset.oauthProvider);
  });
});

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

  const code = campaignCode.value.trim().toUpperCase();
  campaignCode.value = code;

  if (!code) {
    setCampaignStatus("error", "Lütfen kampanya kodunuzu girin.");
    return;
  }

  campaignSubmitBtn.disabled = true;
  campaignSubmitBtn.textContent = "Kontrol ediliyor...";

  try {
    const result = await redeemPromoCode(code);
    if (!result.ok) {
      setCampaignStatus("error", result.message || "Kod doğrulanamadı. Lütfen bilgileri kontrol edin.");
      return;
    }

    setCampaignStatus("success", "Kodunuz doğrulandı. Bu hesap için özel teklif hakkınız tanımlandı. Uygulamaya aynı hesapla giriş yaptığınızda uygun paketleri görebilirsiniz.");
  } catch (error) {
    setCampaignStatus("error", "Şu anda kod doğrulaması yapılamadı. Lütfen daha sonra tekrar deneyin.");
  } finally {
    campaignSubmitBtn.disabled = false;
    campaignSubmitBtn.textContent = "Kodu Doğrula";
  }
});

const initialCode = getCodeFromUrl();
if (initialCode) {
  campaignCode.value = initialCode;
  openCampaignDialog();
}
