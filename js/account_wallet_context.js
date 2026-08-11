// italky.ai ortak kişisel cüzdan önyükleyicisi.
// Tek gerçek bireysel cüzdan kaynağı: icany business_members.personal_token_balance.

async function bootSharedWallet() {
  // Eski sürümden DOM'da kalmış olabilecek Kurumsal Giriş öğelerini temizle.
  try {
    document.querySelectorAll('#italkyCorporateEntryFixed, .site-footer-corp').forEach((el) => el.remove());
    document.querySelectorAll('a,button,[role="button"]').forEach((el) => {
      const text = String(el.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase('tr-TR');
      if (text === 'kurumsal giriş' || text === 'kurumsal giris') el.remove();
    });
    document.getElementById('italkyCorporateEntryStyle')?.remove();
  } catch {}

  try {
    await import(`/js/wallet_force_fix.js?v=20260811-2209-${Date.now()}`);
  } catch (error) {
    console.warn('[account_wallet_context] shared wallet runtime failed', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSharedWallet, { once: true });
} else {
  void bootSharedWallet();
}

// Sonradan eklenen eski kurumsal giriş kalıntılarını da temiz tut.
const observer = new MutationObserver((mutations) => {
  if (!mutations.some((mutation) => mutation.addedNodes.length > 0)) return;
  try {
    document.querySelectorAll('#italkyCorporateEntryFixed, .site-footer-corp').forEach((el) => el.remove());
    document.querySelectorAll('a,button,[role="button"]').forEach((el) => {
      const text = String(el.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase('tr-TR');
      if (text === 'kurumsal giriş' || text === 'kurumsal giris') el.remove();
    });
  } catch {}
});
observer.observe(document.documentElement, { childList: true, subtree: true });
