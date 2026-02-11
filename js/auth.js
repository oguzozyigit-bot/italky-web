// italky-web/js/auth.js
// VERSION: italky-v1.4 (ZERO DEPENDENCY - WHITE SCREEN KILLER)

// ✅ Bağımlılıkları kaldırıp sabitleri buraya alıyoruz
const GOOGLE_CLIENT_ID = "SENIN_GOOGLE_CLIENT_ID_BURAYA"; // Burayı kendi ID'n ile doldur
const STORAGE_KEY = "italky_user_v1";
const BASE_DOMAIN = "https://italky.ai"; 

const API_TOKEN_KEY = "italky_api_token";
const STABLE_ID_KEY = "italky_stable_id_v1";
const TERMS_PENDING_KEY = "italky_terms_pending_v1";
const GOOGLE_BTN_ID = "googleBtnContainer";
const HOME_PATH = "/pages/home.html";

// ... (getAuthState, isWebView, termsKey fonksiyonları aynı kalsın) ...

function isWebView(){
  try { if (window.Android) return true; } catch(e){}
  const ua = String(navigator.userAgent || "");
  return /; wv\)|\bwv\b|Android.*Version\/\d+\.\d+.*Chrome/i.test(ua);
}

// ✅ KRİTİK: Zaten login ise bekleme yapmadan uçur
export function redirectIfLoggedIn(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) {
      const u = JSON.parse(raw);
      if(u?.email){
        console.log("Oturum aktif, yönlendiriliyor...");
        window.location.replace(HOME_PATH);
        return true;
      }
    }
  } catch(e) {}
  return false;
}

async function handleGoogleResponse(res){
  try {
    const idToken = (res?.credential || "").trim();
    if(!idToken) return;

    localStorage.setItem("google_id_token", idToken);
    const payload = parseJwt(idToken);
    
    if(!payload?.email) return;

    const email = payload.email.toLowerCase().trim();
    const stableId = getOrCreateStableId();

    // ✅ WEBVIEW FIX: Otomatik kabul
    let savedTermsAt = localStorage.getItem(termsKey(email)) || null;
    if(!savedTermsAt && isWebView()){
      savedTermsAt = new Date().toISOString();
      localStorage.setItem(termsKey(email), savedTermsAt);
    }

    const user = {
      id: stableId,
      email: email,
      name: payload.name || "",
      picture: payload.picture || "",
      provider: "google",
      terms_accepted_at: savedTermsAt
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    // ✅ YÖNLENDİRME: replace kullanarak geçmişi temizle
    window.location.replace(HOME_PATH);

  } catch(e) {
    console.error("Login hatası:", e);
    // Hata olsa bile beyaz ekranda kalmasın diye ana sayfayı tazele
    window.location.reload();
  }
}

// ... (initAuth ve diğer fonksiyonlar aynı kalsın) ...
