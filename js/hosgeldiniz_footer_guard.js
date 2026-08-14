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

// Jeton Market resilience: keep unified auth and Android Play Billing alive even if
// the legacy page's own Supabase hydration is late or temporarily misses the session.
(function () {
  const path = String(location.pathname || '').toLowerCase().replace(/\/+$/, '');
  if (path !== '/pages/jetonbuy.html' && path !== '/jetonbuy.html') return;

  const SUPABASE_STORAGE_KEY = 'sb-rkbwcmeqdwuewqeokfas-auth-token';
  const SESSION_BACKUP_KEY = 'italky_supabase_session_backup';
  const PRODUCT_IDS = ['jeton_20', 'jeton_50', 'jeton_100', 'jeton_500'];

  function safeParse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  function sessionExpiry(value) {
    const n = Number(value?.expires_at || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function restoreSupabaseStorageFromBackup() {
    try {
      const current = safeParse(localStorage.getItem(SUPABASE_STORAGE_KEY));
      const backup = safeParse(localStorage.getItem(SESSION_BACKUP_KEY));
      if (!backup?.access_token || !backup?.refresh_token) return false;

      const currentValid = Boolean(current?.access_token && current?.refresh_token);
      const shouldRestore = !currentValid || sessionExpiry(backup) > sessionExpiry(current);
      if (!shouldRestore) return false;

      localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(backup));
      return true;
    } catch {
      return false;
    }
  }

  function readCookie(name) {
    try {
      const prefix = `${name}=`;
      const row = String(document.cookie || '')
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));
      return row ? decodeURIComponent(row.slice(prefix.length)) : '';
    } catch {
      return '';
    }
  }

  function decodeJwt(token) {
    try {
      const part = String(token || '').split('.')[1] || '';
      if (!part) return null;
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
      return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(padded), (c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join('')));
    } catch {
      return null;
    }
  }

  function explicitLogoutPending() {
    try {
      return localStorage.getItem('icany_explicit_logout') === '1' ||
        localStorage.getItem('italky_explicit_logout') === '1';
    } catch {
      return false;
    }
  }

  function nativeCookieAuth() {
    if (explicitLogoutPending()) return null;
    const accessToken = readCookie('access_token');
    if (!accessToken) return null;
    const payload = decodeJwt(accessToken);
    const userId = String(payload?.sub || payload?.user_id || '').trim();
    const email = String(payload?.email || '').trim();
    const exp = Number(payload?.exp || 0);
    if (!userId) return null;
    if (exp && exp * 1000 <= Date.now() + 30000) return null;
    return { accessToken, userId, email };
  }

  function primeNativeAuth() {
    const auth = nativeCookieAuth();
    if (!auth) return null;
    try {
      const bridge = window.AndroidBilling;
      if (typeof bridge?.setAuthContext === 'function') {
        bridge.setAuthContext(auth.userId, auth.accessToken);
      } else if (typeof bridge?.setUserId === 'function') {
        bridge.setUserId(auth.userId);
      }
      window.__ITALKY_ACCESS_TOKEN__ = auth.accessToken;
      window.__ITALKY_BILLING_AUTH_FALLBACK__ = auth;
    } catch {}
    return auth;
  }

  function requestNativePrices() {
    try {
      const bridge = window.AndroidBilling;
      if (!bridge) return false;
      const payload = JSON.stringify(PRODUCT_IDS);
      for (const method of ['requestProductDetails', 'getProductDetails', 'getProductPrices', 'queryProducts', 'getProducts', 'getProductsJson', 'getPrices']) {
        try {
          if (typeof bridge[method] !== 'function') continue;
          const result = bridge[method](payload);
          if (result && typeof window.italkySetGooglePlayPrices === 'function') {
            window.italkySetGooglePlayPrices(result);
          }
          return true;
        } catch {}
      }
    } catch {}
    return false;
  }

  function refreshVisibleAuth() {
    const auth = primeNativeAuth();
    if (!auth) return;
    try {
      document.body?.classList.add('signed');
      const mail = document.getElementById('drawerMail');
      const name = document.getElementById('drawerName');
      if (mail && auth.email) mail.textContent = auth.email;
      if (name && auth.email && (!name.textContent || name.textContent === 'Kullanıcı')) {
        name.textContent = auth.email.split('@')[0] || 'Kullanıcı';
      }
    } catch {}
  }

  // Runs before jetonbuy's inline module body creates its Supabase client.
  restoreSupabaseStorageFromBackup();

  function run() {
    restoreSupabaseStorageFromBackup();
    refreshVisibleAuth();
    requestNativePrices();
  }

  const start = () => {
    run();
    [300, 800, 1600, 3000, 5000, 8000, 12000].forEach((delay) => setTimeout(run, delay));

    // If the legacy page cannot see its own Supabase session but native unified auth
    // is current, start the purchase directly instead of bouncing the user to login.
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest?.('[data-buy]');
      if (!button) return;
      const productId = String(button.getAttribute('data-buy') || '').trim();
      if (!PRODUCT_IDS.includes(productId)) return;

      const auth = primeNativeAuth();
      const bridge = window.AndroidBilling;
      if (!auth || typeof bridge?.buy !== 'function') return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      try {
        if (typeof bridge.setAuthContext === 'function') {
          bridge.setAuthContext(auth.userId, auth.accessToken);
        }
        bridge.buy(productId);
      } catch (error) {
        console.warn('[jeton market guard] native buy failed', error);
      }
    }, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('focus', run);
  window.addEventListener('pageshow', run);
})();
