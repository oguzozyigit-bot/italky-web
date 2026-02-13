import { supabase } from "./supabase_client.js";

export async function redirectIfLoggedIn() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
}

export function initAuth() {
    const container = document.getElementById("googleBtnContainer");
    if (!container) return;
    container.innerHTML = `<button id="google-login-btn" type="button" style="width: 100%; max-width: 320px; height: 44px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.35); color: #fff; font-size: 15px; font-weight: 800; display:flex; align-items:center; justify-content:center; gap:10px; cursor:pointer;">Google ile Devam Et</button>`;
    document.getElementById("google-login-btn").onclick = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin + "/pages/home.html" }
        });
    };
}

export function startAuthState(onChange) {
    const emit = async (session, event) => {
        if (!session?.user) { onChange?.({ user: null }); return; }
        const user = session.user;
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            try {
                await supabase.rpc("ensure_profile_and_welcome", {
                    p_full_name: user.user_metadata?.full_name || "",
                    p_email: user.email || "",
                    p_avatar_url: user.user_metadata?.avatar_url || ""
                });
            } catch(e) { console.error(e); }
        }
        onChange?.({ user });
    };
    supabase.auth.getSession().then(({ data }) => emit(data?.session, "INITIAL_SESSION"));
    supabase.auth.onAuthStateChange((event, session) => emit(session, event));
}
