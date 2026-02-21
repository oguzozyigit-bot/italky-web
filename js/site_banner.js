// FILE: /js/site_banner.js
// Simple, fast banner carousel (auto + swipe) for home_v2

export function mountBannerCarousel({
  rootId = "bannerRail",
  dotsId = "bannerDots",
  intervalMs = 5200
} = {}) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const dots = document.getElementById(dotsId);

  const slides = Array.from(root.querySelectorAll(".banner-slide"));
  if (!slides.length) return;

  let i = 0;
  let timer = null;
  let isDown = false;
  let startX = 0;
  let dx = 0;

  function setActive(idx) {
    i = (idx + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("active", k === i));
    if (dots) {
      const all = Array.from(dots.querySelectorAll(".dot"));
      all.forEach((d, k) => d.classList.toggle("on", k === i));
    }
  }

  function next() { setActive(i + 1); }
  function start() {
    stop();
    timer = setInterval(next, intervalMs);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  // build dots
  if (dots) {
    dots.innerHTML = slides.map((_s, k)=>`<button class="dot ${k===0?"on":""}" data-i="${k}" aria-label="banner ${k+1}"></button>`).join("");
    dots.querySelectorAll(".dot").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const idx = Number(btn.getAttribute("data-i")||"0");
        setActive(idx);
        start();
      });
    });
  }

  // swipe (pointer)
  root.addEventListener("pointerdown", (e)=>{
    isDown = true;
    startX = e.clientX;
    dx = 0;
    stop();
    root.setPointerCapture(e.pointerId);
  });

  root.addEventListener("pointermove", (e)=>{
    if(!isDown) return;
    dx = e.clientX - startX;
  });

  root.addEventListener("pointerup", ()=>{
    if(!isDown) return;
    isDown = false;

    const threshold = 45; // px
    if(dx > threshold) setActive(i - 1);
    else if(dx < -threshold) setActive(i + 1);

    start();
  });

  root.addEventListener("pointercancel", ()=>{
    isDown = false;
    start();
  });

  // allow manual pause on hover (desktop)
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);

  // init
  setActive(0);
  start();
}
