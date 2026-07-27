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
    .italky-token-backdrop{
      position:fixed;
      inset:0;
      z-index:1000001;
      display:none;
      align-items:center;
      justify-content:center;
      padding:18px;
      background:rgba(2,6,23,.76);
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
    }

    .italky-token-backdrop.show{
      display:flex;
    }

    .italky-token-card{
      width:min(100%,430px);
      border-radius:30px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.12);
      background:linear-gradient(180deg, rgba(10,12,26,.98), rgba(6,8,20,.98));
      box-shadow:0 28px 90px rgba(0,0,0,.42);
      color:#fff;
      font-family:Outfit,system-ui,sans-serif;
    }

    .italky-token-top{
      padding:20px 20px 16px;
      background:linear-gradient(135deg,#dbeafe 0%,#93c5fd 50%,#fde68a 100%);
      color:#07111d;
    }

    .italky-token-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:34px;
      padding:8px 14px;
      border-radius:999px;
      background:rgba(255,255,255,.34);
      border:1px solid rgba(255,255,255,.38);
      color:#07111d;
      font-size:12px;
      font-weight:1000;
    }

    .italky-token-title{
      margin:14px 0 6px;
      font-size:28px;
      line-height:1.08;
      font-weight:1000;
      letter-spacing:-.6px;
      color:#07111d;
    }

    .italky-token-text{
      margin:0;
      font-size:14px;
      line-height:1.6;
      font-weight:900;
      color:rgba(7,17,29,.88);
      white-space:pre-line;
    }

    .italky-token-body{
      padding:18px;
      display:grid;
      gap:12px;
    }

    .italky-token-box{
      border-radius:20px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      padding:14px;
    }

    .italky-token-label{
      font-size:11px;
      font-weight:1000;
      color:rgba(255,255,255,.50);
      text-transform:uppercase;
      letter-spacing:.8px;
      margin-bottom:5px;
    }

    .italky-token-value{
      font-size:20px;
      line-height:1.15;
      font-weight:1000;
    }

    .italky-token-desc{
      margin:2px 0 0;
      font-size:12px;
      line-height:1.45;
      font-weight:800;
      color:rgba(255,255,255,.62);
    }

    .italky-token-actions{
      display:grid;
      gap:10px;
      margin-top:2px;
    }

    .italky-token-btn{
      min-height:54px;
      border:none;
      border-radius:18px;
      cursor:pointer;
      font-size:15px;
      font-weight:1000;
      transition:transform .16s ease;
    }

    .italky-token-btn:active{
      transform:scale(.985);
    }

    .italky-token-btn.primary{
      color:#07111d;
      background:linear-gradient(135deg,#dbeafe 0%,#93c5fd 50%,#fde68a 100%);
      box-shadow:0 14px 34px rgba(147,197,253,.20);
    }

    .italky-token-btn.secondary{
      color:#fff;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.10);
    }
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
        <div class="italky-token-chip" id="italkyTokenChip">italkyAI</div>
        <div class="italky-token-title" id="italkyTokenTitle">Jeton Gerekli</div>
        <p class="italky-token-text" id="italkyTokenText">Bu modülü kullanabilmek için jeton gereklidir. Lütfen önce jeton yükleyiniz.</p>
      </div>

      <div class="italky-token-body">
        <div class="italky-token-box">
          <div class="italky-token-label">Durum</div>
          <div class="italky-token-value" id="italkyTokenValue">Jeton Yetersiz</div>
          <p class="italky-token-desc" id="italkyTokenDesc">Devam etmek için jeton yükleyebilirsiniz.</p>
        </div>

        <div class="italky-token-actions">
          <button class="italky-token-btn primary" id="italkyTokenGo">Jeton Yükle</button>
          <button class="italky-token-btn secondary" id="italkyTokenClose">Kapat</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrap);

  $("italkyTokenGo")?.addEventListener("click", () => {
    const next = wrap.dataset.next || JETON_PAGE_URL;
    location.href = next;
  });

  $("italkyTokenClose")?.addEventListener("click", () => {
    const fallback = wrap.dataset.fallback || "";
    closeTokenGate();
    if (fallback) location.href = fallback;
  });

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) {
      const fallback = wrap.dataset.fallback || "";
      closeTokenGate();
      if (fallback) location.href = fallback;
    }
  });
}

export function openTokenGate(options = {}) {
  ensureModal();

  const {
    title = "Jeton Gerekli",
    text = "Bu modülü kullanabilmek için jeton gereklidir. Lütfen önce jeton yükleyiniz.",
    chip = "italkyAI",
    value = "Jeton Yetersiz",
    desc = "Devam etmek için jeton yükleyebilirsiniz.",
    goText = "Jeton Yükle",
    nextUrl = JETON_PAGE_URL,
    fallbackUrl = ""
  } = options;

  const wrap = $("italkyTokenGate");
  if (!wrap) return;

  wrap.dataset.next = nextUrl || JETON_PAGE_URL;
  wrap.dataset.fallback = fallbackUrl || "";

  if ($("italkyTokenChip")) $("italkyTokenChip").textContent = chip;
  if ($("italkyTokenTitle")) $("italkyTokenTitle").textContent = title;
  if ($("italkyTokenText")) $("italkyTokenText").textContent = text;
  if ($("italkyTokenValue")) $("italkyTokenValue").textContent = value;
  if ($("italkyTokenDesc")) $("italkyTokenDesc").textContent = desc;
  if ($("italkyTokenGo")) $("italkyTokenGo").textContent = goText;

  wrap.classList.add("show");
}

export function closeTokenGate() {
  $("italkyTokenGate")?.classList.remove("show");
}

export async function getCurrentTokens() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("tokens")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[token_gate] token read error:", error);
      return null;
    }

    return Number(data?.tokens ?? 0);
  } catch (e) {
    console.error("[token_gate] getCurrentTokens error:", e);
    return null;
  }
}

export async function ensureTokenAccess(options = {}) {
  const {
    redirectIfNoSession = "/pages/login.html",
    fallbackUrl = HOME_PAGE_URL,
    title = "Jeton Gerekli",
    text = "Bu modülü kullanabilmek için jeton gereklidir. Lütfen önce jeton yükleyiniz.",
    chip = "italkyAI",
    value = "Jeton Yetersiz",
    desc = "Devam etmek için jeton yükleyebilirsiniz.",
    goText = "Jeton Yükle",
    nextUrl = JETON_PAGE_URL
  } = options;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;

    if (!user?.id) {
      location.replace(redirectIfNoSession);
      return false;
    }

    const tokens = await getCurrentTokens();

    if (tokens === null) {
      openTokenGate({
        title,
        text,
        chip,
        value,
        desc,
        goText,
        nextUrl,
        fallbackUrl
      });
      return false;
    }

    if (tokens > 0) {
      return true;
    }

    openTokenGate({
      title,
      text,
      chip,
      value,
      desc,
      goText,
      nextUrl,
      fallbackUrl
    });

    return false;
  } catch (e) {
    console.error("[token_gate] ensureTokenAccess error:", e);
    openTokenGate({
      title,
      text,
      chip,
      value,
      desc,
      goText,
      nextUrl,
      fallbackUrl
    });
    return false;
  }
}
