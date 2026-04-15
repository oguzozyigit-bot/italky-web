const miniToast = document.getElementById("miniToast");

function showToast(msg = "") {
  if (!miniToast) return;
  miniToast.textContent = String(msg || "");
  miniToast.classList.add("show");
  clearTimeout(window.__facetofaceModeToast);
  window.__facetofaceModeToast = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1900);
}

function loadMainScript() {
  const script = document.createElement("script");
  script.type = "module";
  script.src = "/js/facetoface_page.js?v=F2F_PAGE_V1";
  document.body.appendChild(script);
}

function bindNetworkInfoToast() {
  window.addEventListener("offline", () => {
    showToast("Bağlantı kesildi. Online özellikler sınırlanabilir.");
  });

  window.addEventListener("online", () => {
    showToast("Bağlantı geri geldi.");
  });
}

(function boot() {
  bindNetworkInfoToast();
  loadMainScript();
})();
