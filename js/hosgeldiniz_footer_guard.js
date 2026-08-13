// Keep the iCany footer inside the embedded app, but remove duplicate italky shell stamps.
(function () {
  function isHosgeldiniz() {
    try {
      return String(location.pathname || '').replace(/\/+$/, '') === '/hosgeldiniz';
    } catch {
      return false;
    }
  }

  if (!isHosgeldiniz()) return;

  function removeOuterFooter() {
    try {
      document.querySelectorAll(
        'body > .italky-global-footer, body > [data-italky-footer], body > .brand-seal, body > .prestige-signature, body > .drawer-footer-seal, body > .signature, body > .gokturk-signature'
      ).forEach((el) => el.remove());
    } catch {}
  }

  function installStyle() {
    if (document.getElementById('hosgeldinizOuterFooterGuard')) return;
    const style = document.createElement('style');
    style.id = 'hosgeldinizOuterFooterGuard';
    style.textContent = `
      body > .italky-global-footer,
      body > [data-italky-footer],
      body > .brand-seal,
      body > .prestige-signature,
      body > .drawer-footer-seal,
      body > .signature,
      body > .gokturk-signature {
        display:none !important;
        visibility:hidden !important;
        opacity:0 !important;
        pointer-events:none !important;
      }
    `;
    document.head.appendChild(style);
  }

  installStyle();
  removeOuterFooter();

  const observer = new MutationObserver(removeOuterFooter);
  const start = () => {
    try { observer.observe(document.body, { childList: true }); } catch {}
    removeOuterFooter();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('load', removeOuterFooter, { once: true });
  setTimeout(removeOuterFooter, 100);
  setTimeout(removeOuterFooter, 500);
  setTimeout(removeOuterFooter, 1500);
})();
