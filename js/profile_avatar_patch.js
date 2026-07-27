// FILE: js/profile_avatar_patch.js
// Keeps hamburger/profile avatar images as user photos, not brand logos.

const FALLBACK_AVATAR = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="24" fill="#0f766e"/><text x="40" y="50" text-anchor="middle" font-family="Arial" font-size="30" font-weight="800" fill="white">i</text></svg>'
);

function looksLikeBrandLogo(value) {
  return /italky|icanyai-logo|italkyai-logo|italky-logo-official/i.test(String(value || ""));
}

function avatarTargets() {
  return Array.from(document.querySelectorAll([
    "#avatar",
    "#drawerPic",
    "#menuUserPic",
    "#officialMenuAvatar",
    ".profile img",
    ".profile-btn img",
    ".drawer-avatar img",
    ".menu-avatar img",
    ".italky-official-avatar img"
  ].join(",")));
}

async function getUserPhoto() {
  try {
    const { supabase } = await import("/js/supabase_client.js");
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const meta = user?.user_metadata || {};
    const fromGoogle = meta.avatar_url || meta.picture || "";
    if (fromGoogle && !looksLikeBrandLogo(fromGoogle)) return fromGoogle;
    return FALLBACK_AVATAR;
  } catch {
    return FALLBACK_AVATAR;
  }
}

async function applyAvatarPatch() {
  const photo = await getUserPhoto();
  avatarTargets().forEach((img) => {
    const current = img.getAttribute("src") || "";
    if (!current || looksLikeBrandLogo(current)) {
      img.src = photo;
    }
    img.alt = img.alt || "Profil";
    img.style.objectFit = "cover";
    img.style.objectPosition = "center";
  });
}

function bootAvatarPatch() {
  applyAvatarPatch();
  setTimeout(applyAvatarPatch, 120);
  setTimeout(applyAvatarPatch, 500);
  setTimeout(applyAvatarPatch, 1200);

  const observer = new MutationObserver(() => applyAvatarPatch());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "class", "alt"],
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootAvatarPatch, { once: true });
} else {
  bootAvatarPatch();
}
