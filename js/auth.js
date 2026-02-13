// js/auth.js
import { supabase } from "./supabase-client.js"; // Dosya adındaki alt tire (_) yerine tire (-) kontrol et!

// index.html'in beklediği fonksiyon: Oturum varsa yönlendir
export async function redirectIfLoggedIn() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
}

// index.html'in beklediği fonksiyon: Google butonunu oluştur
export function initAuth() {
    const container = document.getElementById("googleBtnContainer");
    if (!container) return;

    // Dinamik bir buton oluşturuyoruz
    container.innerHTML = `
        <button id="google-login-btn" style="
            width: 100%; max-width: 320px; height: 44px; border-radius: 10px; 
            border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.35);
            color: #fff; font-size: 15px; font-weight: 800; display:flex;
            align-items:center; justify-content:center; gap:10px; cursor:pointer;">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18">
            Google ile Devam Et
        </button>
    `;

    document.getElementById("google-login-btn").addEventListener("click", loginWithGoogle);
}

export async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { 
            redirectTo: window.location.origin + "/pages/home.html",
            queryParams: { prompt: 'select_account' } 
        }
    });
    if (error) console.error("Login hatası:", error.message);
}
