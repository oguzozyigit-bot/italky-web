const API_BASE = "https://italky-api.onrender.com/api";
const LIVE_PAGE_BASE = "/pages/sidetoside.html";

function getPreferredGuestLang() {
  return String(
    localStorage.getItem("live_interpreter_lang") ||
    localStorage.getItem("italky_interpreter_my_lang") ||
    localStorage.getItem("italky_user_lang_v1") ||
    "en"
  ).trim().toLowerCase();
}

async function safeJson(response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(raw || "Geçersiz sunucu yanıtı");
  }
}

function buildGuestLiveUrl(roomId, myLang, peerLang, auto = "0") {
  const liveUrl = new URL(LIVE_PAGE_BASE, location.origin);
  liveUrl.searchParams.set("room", roomId);
  liveUrl.searchParams.set("role", "guest");
  liveUrl.searchParams.set("my", myLang);
  liveUrl.searchParams.set("peer", peerLang);
  if (String(auto || "0") === "1") {
    liveUrl.searchParams.set("auto", "1");
  }
  return liveUrl.toString();
}

async function joinProcess() {
  const params = new URLSearchParams(window.location.search);

  const roomId = String(params.get("room") || "").trim();
  const auto = String(params.get("auto") || "0").trim();

  const statusMsg = document.getElementById("status-msg");
  const backBtn = document.getElementById("back-btn");
  const statusDot = document.getElementById("status-dot");

  function setStatus(text, tone = "") {
    if (statusMsg) statusMsg.innerText = text;
    if (statusDot) {
      statusDot.classList.remove("ok", "err");
      if (tone) statusDot.classList.add(tone);
    }
  }

  if (!roomId) {
    setStatus("Room ID bulunamadı.", "err");
    if (backBtn) backBtn.classList.remove("hidden");
    return;
  }

  try {
    const myLang = getPreferredGuestLang();
    localStorage.setItem("live_interpreter_lang", myLang);

    setStatus("Odaya katılıyor...");

    const joinRes = await fetch(`${API_BASE}/interpreter/join-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        room_id: roomId,
        my_lang: myLang
      })
    });

    const joinData = await safeJson(joinRes);

    if (!joinRes.ok || !joinData?.ok) {
      throw new Error(joinData?.detail || joinData?.error || "Odaya katılamadı");
    }

    setStatus("Oda bilgisi alınıyor...");

    const roomRes = await fetch(`${API_BASE}/interpreter/room/${encodeURIComponent(roomId)}`);
    const roomData = await safeJson(roomRes);

    if (!roomRes.ok || !roomData?.ok) {
      throw new Error(roomData?.detail || roomData?.error || "Room bulunamadı");
    }

    const peerLang = String(roomData.host_lang || "tr").trim().toLowerCase();

    localStorage.setItem("live_interpreter_peer_lang", peerLang);
    localStorage.setItem("italky_active_interpreter_room_id", roomId);

    setStatus("Bağlantı kuruldu, yönlendiriliyor...", "ok");

    const targetUrl = buildGuestLiveUrl(roomId, myLang, peerLang, auto);

    setTimeout(() => {
      window.location.href = targetUrl;
    }, 600);

  } catch (error) {
    console.error("Interpreter join error:", error);

    setStatus(
      error?.message || "Bağlantı kurulamadı.",
      "err"
    );

    if (backBtn) backBtn.classList.remove("hidden");
  }
}

joinProcess();
