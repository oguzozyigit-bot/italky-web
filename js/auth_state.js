import { supabase } from "./supabase_client.js";

// index.html'in beklediği fonksiyon: Oturum kontrolü
export async function redirectIfLoggedIn() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
}

// index.html'in beklediği fonksiyon: Google butonunu oluşturur
export function initAuth() {
    const container = document.getElementById("googleBtnContainer");
    if (!container) return;

    container.innerHTML = `
        <button id="google-login-btn" type="button" style="
            width: 100%; max-width: 320px; height: 44px; border-radius: 10px; 
            border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.35);
            color: #fff; font-size: 15px; font-weight: 800; display:flex;
            align-items:center; justify-content:center; gap:10px; cursor:pointer;">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18">
            Google ile Devam Et
        </button>
    `;

    document.getElementById("google-login-btn").addEventListener("click", async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin + "/pages/home.html" }
        });
    });
}

// Merkezi auth dinleyicisi
export function startAuthState(onChange) {
    const emit = async (session, event) => {
        if (!session?.user) {
            onChange?.({ user: null, wallet: null, event });
            return;
        }

        const user = session.user;

        // Hoşgeldin bonusu (10 token) ve profil kaydı
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            try {
                await supabase.rpc("ensure_profile_and_welcome", {
                    p_full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
                    p_email: user.email || "",
                    p_avatar_url: user.user_metadata?.avatar_url || ""
                });
            } catch (e) { console.error(e); }
        }

        const { data } = await supabase.from("wallets").select("balance").maybeSingle();
        onChange?.({ user, wallet: data?.balance || 0, event });
    };

    supabase.auth.getSession().then(({ data }) => emit(data?.session, "INITIAL_SESSION"));
    supabase.auth.onAuthStateChange((event, session) => emit(session, event));
}
