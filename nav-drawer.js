/**
 * Hamburger menu: open/close drawer, Escape, backdrop.
 */
(function () {
  var toggle = document.getElementById("nav-menu-toggle");
  var drawer = document.getElementById("nav-drawer");
  if (!toggle || !drawer) return;

  var backdrop = document.getElementById("nav-drawer-backdrop");
  var closeBtn = document.getElementById("nav-drawer-close");
  var panel = drawer.querySelector(".nav-drawer-panel");

  function open() {
    drawer.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-drawer-open");
  }

  function close() {
    drawer.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-drawer-open");
  }

  toggle.addEventListener("click", function () {
    if (drawer.hidden) open();
    else close();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      close();
      toggle.focus();
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", close);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !drawer.hidden) {
      close();
      toggle.focus();
    }
  });

  drawer.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest(".nav-drawer-list a")) close();
  });
})();

