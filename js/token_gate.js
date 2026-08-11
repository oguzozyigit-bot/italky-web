// FILE: /js/token_gate.js

import { supabase } from "/js/supabase_client.js";

const JETON_PAGE_URL = "/pages/jetonbuy.html";
const HOME_PAGE_URL = "/hosgeldiniz";

function $(id) {
  return document.getElementById(id);
}

function ensureStyles() {
  if ($("italkyTokenGateStyles")) return;
  const style = document.createElement("style");
  style.id = "italkyTokenGateStyles";
  style.textContent = `
    .italky-token-backdrop{position:fixed;inset:0;z-index:1000001;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.76);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
    .italky-token-backdrop.show{display:flex}
    .italky-token-card{width:min(100%,430px);border-radius:30px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:#080d16;box-shadow:0 28px 90px rgba(0,0,0,.42);color:#fff;font-family:Outfit,system-ui,sans-serif}
    .italky-token-top{padding:20px;background:linear-gradient(135deg,#dbeafe,#93c5fd,#fde68a);color:#07111d}
    .italky-token-title{font-size:26px;line-height:1.1;font-weight:1000}.italky-token-text{margin:8px 0 0;font-size:14px;line-height:1.55;font-weight:850}
    .italky-token-body{padding:18px}.italky-token-btn{width:100%;min-height:52px;border:0;border-radius:18px;font-size:15px;font-weight:1000;cursor:pointer;background:#fff;color:#07111d}
  `;
  document.head.appendChild(style);
}

function ensureModal() {
  ensureStyles();
  if ($("italkyTokenGate")) return;
  const wrap = document.createElement("div");
  wrap.className = "italky-token-backdrop";
  wrap.id = "italkyTokenGate";
  wrap.innerHTML = `
    <div class="italky-token-card">
      <div class="italky-token-top">
        <div class="italky-token-title">Giriş Gerekli</div>
        <p class="italky-token-text">italkyAI kullanımı giriş yaptıktan sonra ücretsizdir.</p>
      </div>
      <div class="italky-token-body"><button class="italky-token-btn" id="italkyTokenGo">Giriş Yap</button></div>
    </div>`;
  document.body.appendChild(wrap);
  $("italkyTokenGo")?.addEventListener("click", () => location.href = "/pages/login.html");
}

export function openTokenGate() {
  ensureModal();
  $("italkyTokenGate")?.classList.add("show");
}

export function closeTokenGate() {
  $("italkyTokenGate")?.classList.remove("show");
}

export async function getCurrentTokens() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    if (!user?.id) return null;
    const { data } = await supabase.from("profiles").select("tokens").eq("id", user.id).maybeSingle();
    return Number(data?.tokens ?? 0);
  } catch {
    return null;
  }
}

export async function ensureTokenAccess(options = {}) {
  const { redirectIfNoSession = "/pages/login.html" } = options;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      location.replace(redirectIfNoSession);
      return false;
    }
    // italkyAI: giriş yapan bireysel kullanıcı için jeton kapısı kaldırıldı.
    return true;
  } catch {
    location.replace(redirectIfNoSession || "/pages/login.html");
    return false;
  }
}

export { JETON_PAGE_URL, HOME_PAGE_URL };
