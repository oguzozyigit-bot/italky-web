const HOME_URL = "https://www.italky.ai/hosgeldiniz";

function isInteractive(target) {
  return target instanceof Element && Boolean(
    target.closest("button,a,input,textarea,select,[role='slider'],[data-no-page-swipe],audio,video,.popover,.drawer,.modal")
  );
}

function installTranslatorSwipeReturn() {
  if (location.pathname !== "/facetoface.html") return;

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let tracking = false;
  let dragging = false;

  const reset = () => {
    document.body.style.transition = "transform .24s cubic-bezier(.22,.8,.22,1), opacity .24s ease";
    document.body.style.transform = "translate3d(0,0,0)";
    document.body.style.opacity = "1";
    setTimeout(() => {
      document.body.style.transition = "";
      document.body.style.transform = "";
      document.body.style.opacity = "";
    }, 260);
  };

  window.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || isInteractive(event.target)) return;
    startX = lastX = event.clientX;
    startY = event.clientY;
    tracking = true;
    dragging = false;
  }, { passive: true });

  window.addEventListener("pointermove", (event) => {
    if (!tracking) return;
    lastX = event.clientX;
    const dx = lastX - startX;
    const dy = event.clientY - startY;
    if (!dragging && dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.25) dragging = true;
    if (!dragging) return;
    event.preventDefault();
    const move = Math.min(innerWidth * 0.44, Math.max(0, dx));
    document.body.style.transition = "none";
    document.body.style.transform = `translate3d(${move}px,0,0)`;
    document.body.style.opacity = String(1 - Math.min(.34, Math.abs(move) / innerWidth * .5));
  }, { passive: false });

  window.addEventListener("pointerup", (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const threshold = Math.max(92, innerWidth * .15);
    if (dragging && dx >= threshold && Math.abs(dx) > Math.abs(dy) * 1.25) {
      document.body.style.transition = "transform .25s cubic-bezier(.22,.8,.22,1), opacity .25s ease";
      document.body.style.transform = "translate3d(105vw,0,0)";
      document.body.style.opacity = ".48";
      setTimeout(() => location.assign(HOME_URL), 215);
    } else {
      reset();
    }
    dragging = false;
  }, { passive: true });

  window.addEventListener("pointercancel", () => {
    tracking = false;
    dragging = false;
    reset();
  }, { passive: true });
}

installTranslatorSwipeReturn();
