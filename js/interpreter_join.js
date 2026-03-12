// FILE: /js/interpreter_join.js

const API_BASE = "https://italky-api.onrender.com/api";

async function joinProcess() {

    const params = new URLSearchParams(window.location.search);

    const roomId = params.get("room");

    const statusMsg = document.getElementById("status-msg");
    const backBtn = document.getElementById("back-btn");
    const statusDot = document.getElementById("status-dot");

    if (!roomId) {
        statusMsg.innerText = "Room ID bulunamadı.";
        if (statusDot) statusDot.classList.add("err");
        if (backBtn) backBtn.classList.remove("hidden");
        return;
    }

    try {

        // 🔹 Kullanıcı dili
        const myLang =
            localStorage.getItem("italky_interpreter_my_lang") ||
            localStorage.getItem("italky_user_lang_v1") ||
            "en";

        statusMsg.innerText = "Odaya katılıyor...";

        // 🔹 Join room
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

        const joinData = await joinRes.json();

        if (!joinRes.ok || !joinData.ok) {
            throw new Error("Odaya katılamadı");
        }

        statusMsg.innerText = "Oda bilgisi alınıyor...";

        // 🔹 Room bilgisi
        const roomRes = await fetch(`${API_BASE}/interpreter/room/${roomId}`);
        const roomData = await roomRes.json();

        if (!roomRes.ok || !roomData.ok) {
            throw new Error("Room bulunamadı");
        }

        if (statusDot) statusDot.classList.add("ok");

        statusMsg.innerText = "Bağlantı kuruldu, yönlendiriliyor...";

        const peerLang = roomData.host_lang || "tr";

        // 🔹 Live interpreter
        const liveUrl =
            `/pages/live_interpreter.html?room=${roomId}` +
            `&role=guest` +
            `&my=${myLang}` +
            `&peer=${peerLang}`;

        setTimeout(() => {
            window.location.href = liveUrl;
        }, 600);

    } catch (error) {

        console.error("Interpreter join error:", error);

        statusMsg.innerText = "Bağlantı kurulamadı.";

        if (statusDot) statusDot.classList.add("err");

        if (backBtn) backBtn.classList.remove("hidden");

    }
}

joinProcess();
