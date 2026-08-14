const HOME_URL = "https://www.italky.ai/hosgeldiniz";
const F2F_SHORTS_URL = "https://icany.ai/hosgeldiniz";

function blocksPageSwipe(target) {
  return target instanceof Element && Boolean(
    target.closest("button,input,textarea,select,[contenteditable='true'],[role='slider'],[data-no-page-swipe],audio,.popover,.drawer,.modal")
  );
}

function installFaceToFaceShortsReturn() {
  const path = String(location.pathname || "").toLowerCase();
  if (path !== "/facetoface.html") return;

  let navigating = false;
  const goShorts = (event) => {
    const target = event?.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest("#homeBtn,#homeLink");
    if (!trigger) return;

    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    if (navigating) return;
    navigating = true;
    location.assign(F2F_SHORTS_URL);
  };

  // Capture before facetoface_page.js handlers so the old /pages/home.html?hub=1
  // route cannot win on Android touch/click events.
  document.addEventListener("touchend", goShorts, { capture: true, passive: false });
  document.addEventListener("click", goShorts, true);
}

function installTranslatorSwipeReturn() {
  const path = String(location.pathname || "").toLowerCase();
  if (path !== "/pages/home.html" && path !== "/home.html") return;

  const appScroll = document.querySelector(".app-scroll");
  document.documentElement.style.touchAction = "pan-y";
  document.body.style.touchAction = "pan-y";
  if (appScroll) appScroll.style.touchAction = "pan-y";

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let tracking = false;
  let dragging = false;
  let suppressNextClick = false;

  const setPosition = (move) => {
    document.body.style.transition = "none";
    document.body.style.transform = `translate3d(${move}px,0,0)`;
    document.body.style.opacity = String(1 - Math.min(.34, Math.abs(move) / innerWidth * .5));
  };

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

  const begin = (x, y, target) => {
    if (blocksPageSwipe(target)) return;
    startX = lastX = x;
    startY = lastY = y;
    tracking = true;
    dragging = false;
  };

  const move = (x, y, event) => {
    if (!tracking) return;
    lastX = x;
    lastY = y;
    const dx = lastX - startX;
    const dy = lastY - startY;

    if (!dragging && dx < -8 && Math.abs(dx) > Math.abs(dy) * 1.04) {
      dragging = true;
    }
    if (!dragging) return;

    event?.preventDefault?.();
    const pageMove = Math.max(-innerWidth * .52, Math.min(0, dx));
    setPosition(pageMove);
  };

  const finish = (x = lastX, y = lastY) => {
    if (!tracking) return;
    tracking = false;

    const dx = x - startX;
    const dy = y - startY;
    const threshold = Math.max(58, innerWidth * .10);
    const completed = dragging && dx <= -threshold && Math.abs(dx) > Math.abs(dy) * 1.04;

    if (dragging) {
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 500);
    }

    dragging = false;
    if (completed) {
      document.body.style.transition = "transform .25s cubic-bezier(.22,.8,.22,1), opacity .25s ease";
      document.body.style.transform = "translate3d(-105vw,0,0)";
      document.body.style.opacity = ".48";
      setTimeout(() => location.assign(HOME_URL), 215);
    } else {
      reset();
    }
  };

  window.addEventListener("click", (event) => {
    if (!suppressNextClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressNextClick = false;
  }, true);

  const hasTouch = "ontouchstart" in window || Number(navigator.maxTouchPoints || 0) > 0;

  if (hasTouch) {
    window.addEventListener("touchstart", (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      begin(touch.clientX, touch.clientY, event.target);
    }, { passive: true, capture: true });

    window.addEventListener("touchmove", (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      move(touch.clientX, touch.clientY, event);
    }, { passive: false, capture: true });

    window.addEventListener("touchend", (event) => {
      const touch = event.changedTouches?.[0];
      finish(touch?.clientX ?? lastX, touch?.clientY ?? lastY);
    }, { passive: true, capture: true });

    window.addEventListener("touchcancel", () => {
      tracking = false;
      dragging = false;
      reset();
    }, { passive: true, capture: true });
  } else {
    window.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      begin(event.clientX, event.clientY, event.target);
    }, { passive: true, capture: true });

    window.addEventListener("pointermove", (event) => {
      move(event.clientX, event.clientY, event);
    }, { passive: false, capture: true });

    window.addEventListener("pointerup", (event) => {
      finish(event.clientX, event.clientY);
    }, { passive: true, capture: true });

    window.addEventListener("pointercancel", () => {
      tracking = false;
      dragging = false;
      reset();
    }, { passive: true, capture: true });
  }
}

installFaceToFaceShortsReturn();
installTranslatorSwipeReturn();