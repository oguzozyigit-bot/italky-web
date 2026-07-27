// FILE: js/logo_hotfix.js
// Emergency logo stabilizer: never leave broken local logo assets on screen.
// Important: this must NOT touch profile/avatar images.

const SAFE_ITALKY_LOGO = "/assets/italkyai-logo-clear.png?v=20260727-vector";

function absoluteLogoUrl() {
  try {
    return new URL(SAFE_ITALKY_LOGO, location.origin).href;
  } catch {
    return SAFE_ITALKY_LOGO;
  }
}

function isAvatarImage(img) {
  if (!img || img.tagName !== "IMG") return false;
  const id = String(img.id || "");
  const cls = String(img.className || "");
  const alt = String(img.getAttribute("alt") || "");
  const parentText = String(img.closest?.(".profile,.profile-btn,.drawer-avatar,.menu-avatar,.italky-official-avatar,.drawer-user,.menu-user-card,[data-avatar]")?.className || "");
  return /avatar|profile|profil|pic|user/i.test(`${id} ${cls} ${alt} ${parentText}`);
}

function looksLikeItalkyLogo(img) {
  if (!img || img.tagName !== "IMG") return false;
  if (isAvatarImage(img)) return false;
  const src = String(img.getAttribute("src") || img.src || "");
  const cls = String(img.className || "");
  const alt = String(img.getAttribute("alt") || "");
  const logoClass = /\b(logo|brand-logo|drawer-logo|menu-official-logo|welcome-brand-logo|exe-brand-logo)\b/i.test(cls);
  const logoAlt = /italky|icanyai/i.test(alt);
  const logoSrc = /italkyai-logo|icanyai-logo|italky-logo-official/i.test(src);
  return logoClass || logoAlt || logoSrc;
}

function alreadySafe(img) {
  if (!img) return false;
  if (img.dataset.italkyLogoFixed === "1") return true;
  const current = String(img.getAttribute("src") || img.src || "");
  const safeAbs = absoluteLogoUrl();
  return current === SAFE_ITALKY_LOGO || current === safeAbs || current.endsWith("/assets/italkyai-logo-clear.png?v=20260727-vector");
}

function fixOne(img) {
  if (!looksLikeItalkyLogo(img)) return;
  if (alreadySafe(img)) {
    img.dataset.italkyLogoFixed = "1";
    return;
  }

  img.dataset.italkyLogoFixed = "1";
  img.setAttribute("src", SAFE_ITALKY_LOGO);
  if (img.getAttribute("alt") !== "italkyAI") img.alt = "italkyAI";
  img.style.objectFit = "contain";
  img.style.objectPosition = "left center";
  img.style.background = "transparent";
  img.style.border = "0";
  img.style.boxShadow = "none";
}

function fixAll(root = document) {
  root.querySelectorAll?.("img").forEach(fixOne);
}

function bootLogoHotfix() {
  if (window.__italkyLogoHotfixBooted) return;
  window.__italkyLogoHotfixBooted = true;

  fixAll();
  setTimeout(fixAll, 80);
  setTimeout(fixAll, 300);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target?.tagName === "IMG") {
        if (mutation.target.dataset.italkyLogoFixed === "1" && alreadySafe(mutation.target)) continue;
        fixOne(mutation.target);
      }
      mutation.addedNodes?.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === "IMG") fixOne(node);
        else fixAll(node);
      });
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootLogoHotfix, { once: true });
} else {
  bootLogoHotfix();
}
