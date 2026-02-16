// FILE: /js/onboarding.js
// ✅ Safe stub: eski/yanlış referanslar bu dosyayı çağırsa bile hata üretmez.

(function () {
  try {
    // Eğer geçmişte dev-mode banner vardıysa, element yoksa sessizce çık.
    const btn =
      document.getElementById("devModeBtn") ||
      document.getElementById("devModeBannerBtn") ||
      document.querySelector("[data-devmode-btn]");

    if (!btn) return;

    // Buton varsa bile kırma: sadece pasif bırak.
    btn.onclick = (e) => {
      try { e.preventDefault(); e.stopPropagation(); } catch {}
      // no-op
    };
  } catch {
    // no-op
  }
})();
