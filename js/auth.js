// FILE: /js/auth.js
import { supabase } from "./supabase_client.js";

const HOME = "/pages/home.html";
const box = document.getElementById("googleBtnContainer");
const toastEl = document.getElementById("toast");

function toast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>toastEl.classList.remove("show"), 2200);
}

function showError(msg){
  if(!box) return;
  box.innerHTML = `<p style="color:#ff6b6b;font-size:12px;font-weight:900;margin:0;text-align:center;">${msg}</p>`;
}

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

async function boot(){
  try{
    renderBtn();

    // session varsa home
    const { data, error } = await supabase.auth.getSession();
    if(error) console.error("getSession:", error);
    if(data?.session){
      window.location.replace(HOME);
      return;
    }

    // click
    document.getElementById("googleBtn").onclick = async () => {
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

    // auth state
    supabase.auth.onAuthStateChange((_event, session)=>{
      if(session) window.location.replace(HOME);
    });

  }catch(e){
    console.error("boot crash:", e);
    showError("Sistem yüklenemedi: " + (e?.message || e));
  }
}

boot();
