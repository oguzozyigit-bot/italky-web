import { mountShell } from "/js/ui_shell.js";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);

const cancelBtn = $("cancelBtn");
const mockScanBtn = $("mockScanBtn");

function getParams() {
  const u = new URL(location.href);
  return {
    my: (u.searchParams.get("my") || "tr").trim(),
    mode: (u.searchParams.get("mode") || "guest").trim(),
  };
}

function goLive() {
  const p = getParams();

  const q = new URLSearchParams({
    room: "REMOTEJOINEDROOM",
    my: p.my,
    peer: "en",
    mode: p.mode,
  });

  location.href = `/pages/interpreter_live.html?${q.toString()}`;
}

cancelBtn?.addEventListener("click", () => {
  location.href = "/pages/interpreter.html";
});

mockScanBtn?.addEventListener("click", goLive);
