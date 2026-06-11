// FILE: /js/ios_two_phone_debug.js

(function () {
  if (window.__italkyIosDebugInstalled) return;
  window.__italkyIosDebugInstalled = true;

  const lines = [];
  const MAX_LINES = 18;

  function safeJson(value) {
    try {
      return JSON.stringify(value, function (_key, item) {
        if (item instanceof Error) {
          return { name: item.name, message: item.message, stack: item.stack };
        }
        return item;
      });
    } catch (error) {
      return String(value);
    }
  }

  function ensurePanel() {
    if (!document.body) return null;
    let panel = document.getElementById("italkyIosDebugPanel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "italkyIosDebugPanel";
    panel.style.cssText = [
      "position:fixed",
      "left:8px",
      "right:8px",
      "bottom:calc(8px + env(safe-area-inset-bottom,0px))",
      "z-index:2147483647",
      "max-height:44vh",
      "overflow:auto",
      "border-radius:14px",
      "background:rgba(2,6,23,.96)",
      "border:1px solid rgba(248,113,113,.65)",
      "box-shadow:0 18px 50px rgba(0,0,0,.45)",
      "color:#fff",
      "font:12px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
      "padding:10px",
      "white-space:pre-wrap",
      "text-align:left"
    ].join(";");
    panel.innerHTML = [
      "<div style=\"display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;\">",
      "<strong style=\"color:#fecaca;font-size:13px;\">iOS İki Telefon Debug</strong>",
      "<button id=\"italkyIosDebugClose\" type=\"button\" style=\"border:0;border-radius:9px;background:rgba(255,255,255,.12);color:#fff;padding:5px 8px;font-weight:800;\">Kapat</button>",
      "</div>",
      "<div id=\"italkyIosDebugLog\"></div>"
    ].join("");
    document.body.appendChild(panel);
    document.getElementById("italkyIosDebugClose")?.addEventListener("click", function () {
      panel.remove();
    });
    return panel;
  }

  function render() {
    const panel = ensurePanel();
    if (!panel) return;
    const log = document.getElementById("italkyIosDebugLog");
    if (log) log.textContent = lines.slice(-MAX_LINES).join("\n\n");
  }

  window.__italkyIosDebug = function italkyIosDebug(eventName, detail) {
    const stamp = new Date().toLocaleTimeString();
    lines.push("[" + stamp + "] " + eventName + "\n" + safeJson(detail || {}));
    render();
  };

  window.addEventListener("error", function (event) {
    window.__italkyIosDebug("window_error", {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      target: event.target && (event.target.src || event.target.href || event.target.tagName),
      error: event.error
    });
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    window.__italkyIosDebug("unhandled_rejection", {
      reason: event.reason
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    window.__italkyIosDebug("dom_ready", {
      href: location.href,
      pathname: location.pathname,
      search: location.search,
      userAgent: navigator.userAgent
    });
  });
})();
