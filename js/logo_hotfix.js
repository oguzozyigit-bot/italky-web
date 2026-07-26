// FILE: js/logo_hotfix.js
// Emergency logo stabilizer: never leave broken local logo assets on screen.

const SAFE_ITALKY_LOGO = "https://www.icany.ai/brand/italkyai-logo-clear.png?v=stable-italky-logo";

function looksLikeItalkyLogo(img) {
  if (!img || img.tagName !== "IMG") return false;
  const src = String(img.getAttribute("src") || img.src || "");
  const cls = String(img.className || "");
  const alt = String(img.getAttribute("alt") || "");
  return /italky|icanyai-logo|italkyai-logo|official/i.test(src + " " + cls + " " + alt);
}

function fixOne(img) {
  if (!looksLikeItalkyLogo(img)) return;
  if (img.src === SAFE_ITALKY_LOGO) return;
  img.src = SAFE_ITALKY_LOGO;
  img.alt = "italkyAI";
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
  fixAll();
  setTimeout(fixAll, 80);
  setTimeout(fixAll, 300);
  setTimeout(fixAll, 1000);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target?.tagName === "IMG") {
        fixOne(mutation.target);
      }
      mutation.addedNodes?.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === "IMG") fixOne(node);
        fixAll(node);
      });
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "class", "alt"],
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootLogoHotfix, { once: true });
} else {
  bootLogoHotfix();
}
