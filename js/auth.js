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
 * Sayfa Yüklendiğinde Çalışan Başlatıcı (Login Sayfası İçin)
 */
async function boot(){
  try{
    renderBtn();

    const { data, error } = await supabase.auth.getSession();
    if(error) console.error("getSession:", error);
    
    // Zaten oturum varsa ana sayfaya at
    if(data?.session){
      window.location.replace(HOME);
      return;
    }

    const btn = document.getElementById("googleBtn");
    if(btn) {
      btn.onclick = async () => {
        try{
          toast("Google yönlendiriliyor...");
          const redirectTo = window.location.origin + HOME;

          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo }
          });

          if(error){
            console.error("OAuth:", error);
            showError("Google giriş hatası: " + (error.message || error));
          }
        }catch(e){
          console.error("OAuth crash:", e);
          showError("Google giriş başlatılamadı: " + (e?.message || e));
        }
      };
    }

    supabase.auth.onAuthStateChange((_event, session)=>{
      if(session) window.location.replace(HOME);
    });

  }catch(e){
    console.error("boot crash:", e);
    showError("Sistem yüklenemedi: " + (e?.message || e));
  }
}

// Login sayfası elementleri varsa boot'u çalıştır
if(box) boot();

/**
 * 🚩 ui_guard.js'in beklediği KRİTİK köprü fonksiyonu
 * Bu "export" olmadığı için konsolda hata alıyordun.
 */
export async function startAuthState(callback) {
  const handleAuth = async (session) => {
    const user = session?.user || null;
    let wallet = 0;

    if (user) {
      // Cüzdan bakiyesini çek
      const { data } = await supabase
        .from("profiles")
        .select("tokens")
        .eq("id", user.id)
        .single();
      wallet = data?.tokens || 0;
    }

    // ui_guard.js'e verileri gönder
    callback({ user, wallet });
  };

  // Mevcut durumu hemen kontrol et
  const { data: { session } } = await supabase.auth.getSession();
  await handleAuth(session);

  // Değişimleri dinle
  supabase.auth.onAuthStateChange(async (_event, session) => {
    await handleAuth(session);
  });
}
