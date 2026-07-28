const HOME_URL = "https://www.italky.ai/hosgeldiniz";

function isInteractive(target) {
  return target instanceof Element && Boolean(
    target.closest("button,a,input,textarea,select,[role='slider'],[data-no-page-swipe],audio,video")
  );
}

function installTranslatorSwipeReturn() {
  if (location.pathname !== "/facetoface.html") return;

  let startX = 0;
  let startY = 0;
  let tracking = false;

  window.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || isInteractive(event.target)) return;
    startX = event.clientX;
    startY = event.clientY;
    tracking = true;
  }, { passive: true });

  window.addEventListener("pointerup", (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const threshold = Math.max(110, innerWidth * 0.18);
    if (dx > -threshold || Math.abs(dx) < Math.abs(dy) * 1.35) return;

    document.body.animate([
      { transform: "translate3d(0,0,0)", opacity: 1 },
      { transform: "translate3d(-100vw,0,0)", opacity: .5 }
    ], {
      duration: 260,
      easing: "cubic-bezier(.22,.8,.22,1)",
      fill: "forwards"
    });
    setTimeout(() => location.assign(HOME_URL), 215);
  }, { passive: true });
}

installTranslatorSwipeReturn();
