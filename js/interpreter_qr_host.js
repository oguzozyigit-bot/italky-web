import { mountShell } from "/js/ui_shell.js";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);

const qrBox = $("qrBox");
const pairDot = $("pairDot");
const pairText = $("pairText");
const cancelBtn = $("cancelBtn");

function getParams() {
  const p = new URLSearchParams(location.search);
  return {
    room: String(p.get("room") || "").trim(),
    my: String(p.get("my") || "tr").trim(),
    host: String(p.get("host") || "").trim(),
    joinUrl: String(p.get("join_url") || "").trim(),
  };
}

function buildJoinUrl({ room, my, host, joinUrl }) {
  if (joinUrl) return joinUrl;

  const url = new URL("/pages/interpreter_room.html", location.origin);
  if (room) url.searchParams.set("room", room);
  if (my) url.searchParams.set("host_lang", my);
  if (host) url.searchParams.set("host", host);
  return url.toString();
}

function setWaitingUI() {
  pairDot?.classList.remove("ok");
  if (pairText) pairText.textContent = "Karşı taraf bekleniyor...";
}

function setPairedUI() {
  pairDot?.classList.add("ok");
  if (pairText) pairText.textContent = "Bağlantı kuruldu. Odaya geçiliyor...";
}

async function loadQrLibrary() {
  if (window.QRCode) return window.QRCode;

  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  return window.QRCode;
}

async function renderQr(text) {
  if (!qrBox) return;
  qrBox.innerHTML = "";

  try {
    const QRCode = await loadQrLibrary();

    new QRCode(qrBox, {
      text,
      width: 220,
      height: 220,
      colorDark: "#111111",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (e) {
    console.error("[qr render]", e);
    qrBox.innerHTML = `
      <div style="
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:14px;
        text-align:center;
        color:#111;
        font: 700 12px Outfit, sans-serif;
        word-break:break-all;
      ">
        QR oluşturulamadı.<br><br>${text}
      </div>
    `;
  }
}

function watchPairing({ room, my, host, joinUrl }) {
  const roomUrl = buildJoinUrl({ room, my, host, joinUrl });

  // Geçici basit akış:
  // scan sayfası bağlandığında localStorage ile işaret bırakabilir
  const pairKey = `italky_interpreter_pair_${room || host || "default"}`;

  const check = () => {
    try {
      const paired = localStorage.getItem(pairKey) === "1";
      if (paired) {
        setPairedUI();
        setTimeout(() => {
          location.href = roomUrl;
        }, 700);
        return true;
      }
    } catch {}
    return false;
  };

  if (check()) return;

  const timer = setInterval(() => {
    if (check()) clearInterval(timer);
  }, 900);

  window.addEventListener("beforeunload", () => clearInterval(timer));
}

async function init() {
  const params = getParams();
  const finalJoinUrl = buildJoinUrl(params);

  if (!params.room && !params.host && !params.joinUrl) {
    qrBox.innerHTML = `
      <div style="
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        color:#111;
        font: 800 13px Outfit, sans-serif;
        padding:18px;
      ">
        Geçerli Interpreter bilgisi bulunamadı.
      </div>
    `;
    if (pairText) pairText.textContent = "QR hazırlanamadı.";
    return;
  }

  setWaitingUI();
  await renderQr(finalJoinUrl);
  watchPairing(params);

  cancelBtn?.addEventListener("click", () => {
    location.href = "/pages/interpreter.html";
  });
}

init();
