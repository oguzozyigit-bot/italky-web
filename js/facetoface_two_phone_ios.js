// FILE: /js/facetoface_two_phone_ios.js
import { installTwoPhoneBluetoothMode } from "/js/facetoface_bluetooth_two_phone_guard.js";

const params = new URLSearchParams(location.search || "");
const mode = params.get("mode");
const isTwoPhoneMode = mode === "two-phone" || mode === "bluetooth";

function bootIosTwoPhone() {
  if (!isTwoPhoneMode) return;
  window.__italkyIosDebug?.("two_phone_ios_boot", { href: location.href, mode });

  document.body.classList.add("bt-premium-mode", "premium-bt-mode");

  installTwoPhoneBluetoothMode({
    homeHref: "/pages/home_ios.html?ios=1"
  });
  window.__italkyIosDebug?.("two_phone_engine_installed", { homeHref: "/pages/home_ios.html?ios=1" });

  document.documentElement.classList.remove("two-phone-booting");
  document.documentElement.classList.add("two-phone-ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootIosTwoPhone, { once: true });
} else {
  bootIosTwoPhone();
}
