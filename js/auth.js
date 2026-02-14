// FILE: /js/auth.js
import { supabase } from "./supabase_client.js";

const HOME = "/pages/home.html";
const box = document.getElementById("googleBtnContainer");
const toastEl = document.getElementById("toast");

/**
 * Bildirim (Toast) Gösterimi
 */
function toast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>toastEl.classList.remove("show"), 2200);
}

/**
 * Hata Mesajı Gösterimi
 */
function showError(msg){
  if(!box) return;
  box.innerHTML = `<p style="color:#ff6b6b;font-size:12px;font-weight:900;margin:0;text-align:center;">${msg}</p>`;
}

/**
 * Login Butonunu Render Et
 */
function renderBtn(){
  if(!box) return;
  box.innerHTML = `
    <button id="googleBtn" type="button"
      style="width:100%;max-width:320px;height:44px;border-radius:10px;
             border:1px solid rgba(255,255,255,0.12);
             background:rgba(255,255,255,0.06);
             color:#fff;font-size:15px;font-weight:900;cursor:pointer;">
      Google ile Giriş Yap
    </button>
  `;
}

/**
 * Sayfa Yüklendiğinde Çalışan Başlatıcı
 */
async function boot(){
  try{
    renderBtn();
    const { data, error } = await supabase.auth.getSession();
    if(data?.session) {
       window.location.replace(HOME);
       return;
    }

    const btn = document.getElementById("googleBtn");
    if(btn) {
      btn.onclick = async () => {
        toast("Google yönlendiriliyor...");
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin + HOME }
        });
        if(error) showError("Giriş hatası: " + error.message);
      };
    }
  }catch(e){
    showError("Sistem yüklenemedi.");
  }
}

if(box) boot();

/**
 * ui_guard.js Köprüsü - 400 Hatası İçin İyileştirildi
 */
export async function startAuthState(callback) {
  const handleAuth = async (session) => {
    const user = session?.user || null;
    let wallet = 0;

    if (user) {
      try {
        // Cüzdan verisini çekmeyi dene
        const { data, error } = await supabase
          .from("profiles")
          .select("tokens")
          .eq("id", user.id)
          .maybeSingle(); // single() yerine maybeSingle() 400 hatasını azaltır

        if (error) {
          console.warn("Profil çekilemedi (Muhtemelen yeni kullanıcı):", error.message);
        }
        wallet = data?.tokens || 0;
      } catch (e) {
        console.error("Cüzdan hatası:", e);
      }
    }
    callback({ user, wallet });
  };

  const { data: { session } } = await supabase.auth.getSession();
  await handleAuth(session);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    await handleAuth(session);
  });
}
