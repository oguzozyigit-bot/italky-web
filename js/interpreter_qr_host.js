import { mountShell } from "/js/ui_shell.js";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);

const qrBox = $("qrBox");
const pairDot = $("pairDot");
const pairText = $("pairText");
const cancelBtn = $("cancelBtn");
const mockJoinBtn = $("mockJoinBtn");

function getParams() {
  const u = new URL(location.href);
  return {
    room: (u.searchParams.get("room") || "").trim(),
    my: (u.searchParams.get("my") || "tr").trim(),
    mode: (u.searchParams.get("mode") || "host").trim(),
  };
}

function paintQrPlaceholder() {
  const p = getParams();
  qrBox.textContent = `italkyAI\nInterpreter Join\n${p.room}`;
}

function goLive(peerLang = "en") {
  const p = getParams();
  const q = new URLSearchParams({
    room: p.room,
    my: p.my,
    peer: peerLang,
    mode: p.mode,
  });
  location.href = `/pages/interpreter_live.html?${q.toString()}`;
}

cancelBtn?.addEventListener("click", () => {
  location.href = "/pages/interpreter.html";
});

mockJoinBtn?.addEventListener("click", () => {
  pairDot.classList.add("ok");
  pairText.textContent = "Karşı taraf bağlandı. Canlı odaya geçiliyor...";
  setTimeout(() => goLive("en"), 700);
});

paintQrPlaceholder();
