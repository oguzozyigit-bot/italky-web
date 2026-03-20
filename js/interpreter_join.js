const API_BASE = "https://italky-api.onrender.com/api";

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

    // 1) join-room
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

    // 2) room info
    const roomRes = await fetch(`${API_BASE}/interpreter/room/${encodeURIComponent(roomId)}`);
    const roomData = await safeJson(roomRes);

    if (!roomRes.ok || !roomData?.ok) {
      throw new Error(roomData?.detail || roomData?.error || "Room bulunamadı");
    }

    const peerLang = String(roomData.host_lang || "tr").trim().toLowerCase();

    localStorage.setItem("live_interpreter_peer_lang", peerLang);
    localStorage.setItem("italky_active_interpreter_room_id", roomId);

    setStatus("Bağlantı kuruldu, yönlendiriliyor...", "ok");

    const liveUrl = new URL("/pages/live_interpreter.html", location.origin);
    liveUrl.searchParams.set("room", roomId);
    liveUrl.searchParams.set("role", "guest");
    liveUrl.searchParams.set("my", myLang);
    liveUrl.searchParams.set("peer", peerLang);
    if (auto === "1") {
      liveUrl.searchParams.set("auto", "1");
    }

    setTimeout(() => {
      window.location.href = liveUrl.toString();
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
