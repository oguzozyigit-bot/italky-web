const PANEL_ID = "panelPromo";

function $(id) {
  return document.getElementById(id);
}

function renderShell() {
  const panel = $(PANEL_ID);
  if (!panel || panel.dataset.corporatePromoReady === "1") return;
  panel.dataset.corporatePromoReady = "1";
  panel.innerHTML = `
    <section class="card">
      <h3>Promosyon Kodları</h3>
      <div class="desc">Trendyol Android kodları sadece yeni promo_codes API akışıyla oluşturulur.</div>
      <button id="manualPromoPageBtn" class="btn-primary" type="button">Trendyol Promo Kodları</button>
      <div id="corpPromoStatus" class="status-line status-warn">Kurumsal promo üretimi bu ekranda devre dışı.</div>
    </section>
  `;
  $("manualPromoPageBtn")?.addEventListener("click", () => {
    location.href = "/pages/admin_promo_codes.html";
  });
}

function boot() {
  renderShell();
  setTimeout(renderShell, 500);
  setTimeout(renderShell, 1200);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
