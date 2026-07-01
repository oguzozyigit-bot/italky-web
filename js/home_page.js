import { mountShell } from "/js/ui_shell.js";

try{
  mountShell({ scroll: "auto" });
}catch(e){
  console.warn("ui_shell home skip:", e);
}

const $ = (id) => document.getElementById(id);

const accessMode = String(localStorage.getItem("app_access_mode") || "basic").trim().toLowerCase();
const isPremium = accessMode === "premium" || accessMode === "nfc";

const LOCK_MESSAGE = `
  <div class="premium-lock-pop">
    <div class="premium-lock-title">Premium Üye Ol</div>
    <div class="premium-lock-text">129 offline dili ücretsiz indir.</div>
    <div class="premium-lock-text">Tüm modüllere eriş.</div>
    <button class="premium-lock-btn" type="button">Premium Üyelik Satın Al</button>
  </div>
`;

const PREMIUM_TARGET = "/pages/upgrade_pack.html";

const PREMIUM_MODULE_IDS = [
  "goFaceToFace",
  "goOffline",
  "goSideToSide",
  "funCard",
  "levelCard",
  "practiceCard"
];

function injectLockStyles(){
  if (document.getElementById("premiumLockStyles")) return;

  const style = document.createElement("style");
  style.id = "premiumLockStyles";
  style.textContent = `
    .premium-locked{
      position:relative;
      overflow:visible !important;
    }

    .premium-lock-badge{
      position:absolute;
      top:10px;
      right:10px;
      z-index:20;
      width:34px;
      height:34px;
      border-radius:12px;
      display:flex;
      align-items:center;
      justify-content:center;
      background:linear-gradient(135deg,#f59e0b 0%, #f97316 100%);
      color:#fff;
      border:1px solid rgba(255,255,255,.18);
      box-shadow:0 10px 22px rgba(249,115,22,.24);
      cursor:pointer;
      font-size:15px;
      font-weight:900;
    }

    .premium-lock-overlay{
      position:absolute;
      inset:0;
      z-index:15;
      border-radius:inherit;
      background:rgba(7,10,18,.18);
      cursor:pointer;
    }

    .premium-lock-pop{
      position:absolute;
      top:50px;
      right:0;
      z-index:30;
      width:220px;
      padding:14px 14px 12px;
      border-radius:18px;
      background:rgba(10,12,22,.96);
      border:1px solid rgba(255,255,255,.14);
      box-shadow:0 18px 40px rgba(0,0,0,.34);
      backdrop-filter:blur(12px);
      animation:premiumPopIn .18s ease;
    }

    .premium-lock-title{
      font-size:14px;
      font-weight:900;
      color:#fff;
      margin-bottom:8px;
    }

    .premium-lock-text{
      font-size:12px;
      line-height:1.45;
      color:rgba(255,255,255,.78);
      margin-bottom:4px;
    }

    .premium-lock-btn{
      width:100%;
      min-height:40px;
      margin-top:10px;
      border:none;
      border-radius:12px;
      background:linear-gradient(135deg,#6366f1 0%, #a855f7 100%);
      color:#fff;
      font-size:12px;
      font-weight:900;
      cursor:pointer;
    }

    .premium-lock-btn:active{
      transform:scale(.985);
    }

    @keyframes premiumPopIn{
      from{ opacity:0; transform:translateY(-6px) scale(.98); }
      to{ opacity:1; transform:translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

function closeAllPremiumPops(){
  document.querySelectorAll(".premium-lock-pop").forEach(el => el.remove());
}

function goPremiumPage(){
  location.href = PREMIUM_TARGET;
}

function attachLock(card){
  if (!card || card.dataset.locked === "1") return;

  card.dataset.locked = "1";
  card.classList.add("premium-locked");

  const overlay = document.createElement("div");
  overlay.className = "premium-lock-overlay";

  const badge = document.createElement("div");
  badge.className = "premium-lock-badge";
  badge.innerHTML = "🔒";
  badge.setAttribute("title", "Premium Üye Ol");
  badge.setAttribute("aria-label", "Premium Üye Ol");

  function openPop(e){
    e.preventDefault();
    e.stopPropagation();

    closeAllPremiumPops();

    const wrap = document.createElement("div");
    wrap.innerHTML = LOCK_MESSAGE.trim();
    const pop = wrap.firstElementChild;

    pop.querySelector(".premium-lock-btn")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      goPremiumPage();
    });

    badge.appendChild(pop);
  }

  overlay.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    goPremiumPage();
  });

  badge.addEventListener("click", openPop);
  badge.addEventListener("mouseenter", openPop);

  card.addEventListener("mouseleave", () => {
    setTimeout(() => {
      if (!card.matches(":hover")) closeAllPremiumPops();
    }, 120);
  });

  card.addEventListener("click", (e) => {
    if (!isPremium) {
      e.preventDefault();
      e.stopPropagation();
      goPremiumPage();
    }
  }, true);

  card.appendChild(overlay);
  card.appendChild(badge);
}

function setupPremiumLocks(){
  if (isPremium) return;

  injectLockStyles();

  PREMIUM_MODULE_IDS.forEach((id) => {
    attachLock($(id));
  });

  const jetonLinks = [
    document.querySelector('a[href="/pages/jetonbuy.html"]'),
    document.getElementById("goJetonBuy")
  ].filter(Boolean);

  jetonLinks.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      goPremiumPage();
    }, true);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".premium-lock-badge")) {
      closeAllPremiumPops();
    }
  });
}

setupPremiumLocks();
