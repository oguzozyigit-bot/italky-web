import { supabase } from "./supabase_client.js";

const HOME = "/pages/home.html";
const container = document.getElementById("googleBtnContainer");
const toastEl = document.getElementById("toast");

function toast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>toastEl.classList.remove("show"), 2000);
}

function showError(msg){
  if(container){
    container.innerHTML = `<p style="color:#ff6b6b; font-size:12px; font-weight:800; margin:0; text-align:center;">${msg}</p>`;
  }
}

async function redirectIfLoggedIn(){
  try{
    const { data, error } = await supabase.auth.getSession();
    if(error) throw error;
    if(data?.session){
      window.location.replace(HOME);
      return true;
    }
  }catch(e){
    console.error("getSession error:", e);
  }
  return false;
}

function renderGoogleButton(){
  if(!container) return;
  container.innerHTML = `
    <button id="googleBtn" style="width:100%; max-width:320px; height:44px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color:#fff; font-size:15px; font-weight:900; cursor:pointer;" type="button">
      Google ile Giriş Yap
    </button>
  `;

  const btn = document.getElementById("googleBtn");
  btn.addEventListener("click", async ()=>{
    btn.disabled = true;
    btn.style.opacity = "0.8";
    toast("Google yönlendiriliyor...");
    try{
      const redirectTo = `${window.location.origin}${HOME}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });
      if(error) throw error;
    }catch(e){
      console.error("OAuth error:", e);
      showError("Giriş başlatılamadı.");
      btn.disabled = false;
      btn.style.opacity = "1";
    }
  });
}

function startAuthState(){
  supabase.auth.onAuthStateChange((_event, session)=>{
    if(session){
      window.location.replace(HOME);
    }
  });
}

async function boot(){
  const already = await redirectIfLoggedIn();
  if(already) return;
  renderGoogleButton();
  startAuthState();
}

boot().catch(err => console.error("Boot failure:", err));
