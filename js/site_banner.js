// FILE: /js/site_banner.js
(function(){
  const wrap = document.getElementById("bannerRail");
  const img  = document.getElementById("heroBannerImg");
  const dots = document.getElementById("bannerDots");
  if(!wrap || !img || !dots) return;

  // 10 gerçek görsel (Unsplash) — konu: çeviri, toplantı, eğitim, seyahat
  const IMAGES = [
    { src:"https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1800&q=80", alt:"FaceToFace cafe" },
    { src:"https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1800&q=80", alt:"Online meeting" },
    { src:"https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1800&q=80", alt:"Academy learning" },
    { src:"https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1800&q=80", alt:"Photo translate" },
    { src:"https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1800&q=80", alt:"Document translate" },
    { src:"https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1800&q=80", alt:"Text translate" },
    { src:"https://images.unsplash.com/photo-1516589091380-5d8e87df6999?auto=format&fit=crop&w=1800&q=80", alt:"Chat AI" },
    { src:"https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1800&q=80", alt:"Speaking AI" },
    { src:"https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1800&q=80", alt:"Business translation" },
    { src:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80", alt:"Travel signs" }
  ];

  let idx = 0;
  let lock = false;
  let timer = null;

  function renderDots(){
    dots.innerHTML = IMAGES.map((_,i)=>`<span class="bdot ${i===idx?"on":""}" data-i="${i}"></span>`).join("");
    dots.querySelectorAll(".bdot").forEach(d=>{
      d.addEventListener("click", ()=>{
        const i = Number(d.getAttribute("data-i")||0);
        go(i, true);
      });
    });
  }

  function go(i, user=false){
    if(lock) return;
    lock = true;

    idx = (i + IMAGES.length) % IMAGES.length;
    img.style.opacity = "0";

    setTimeout(()=>{
      img.src = IMAGES[idx].src;
      img.alt = IMAGES[idx].alt;
      img.onload = ()=>{ img.style.opacity="1"; };
      renderDots();
      lock = false;
    }, 220);

    if(user) restart();
  }

  function next(){ go(idx+1); }
  function restart(){
    if(timer) clearInterval(timer);
    timer = setInterval(next, 5200);
  }

  // swipe
  let x0 = null;
  wrap.addEventListener("touchstart",(e)=>{ x0 = e.touches?.[0]?.clientX ?? null; }, {passive:true});
  wrap.addEventListener("touchend",(e)=>{
    if(x0==null) return;
    const x1 = e.changedTouches?.[0]?.clientX ?? x0;
    const dx = x1 - x0;
    x0 = null;
    if(Math.abs(dx) < 30) return;
    if(dx < 0) go(idx+1, true); else go(idx-1, true);
  }, {passive:true});

  // init
  img.style.transition = "opacity .25s";
  renderDots();
  restart();
})();
