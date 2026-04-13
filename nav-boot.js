/**
 * Shared top nav: show Profile when signed in; Sign out vs Sign in.
 */
(function () {
  var BROWSE_KEY = "crowdcare_browse_only";
  var GATE_KEY = "crowdcare_gate_started";

  var u = window.CROWDCARE_SESSION && window.CROWDCARE_SESSION.getUser();
  var profile = document.getElementById("nav-profile");
  var signEl = document.getElementById("nav-signin");
  if (!signEl) return;

  if (u && u.publicKey) {
    if (profile) profile.hidden = false;
    signEl.textContent = "Sign out";
    signEl.href = "#";
    signEl.addEventListener("click", function (e) {
      e.preventDefault();
      window.CROWDCARE_SESSION.signOut();
      sessionStorage.removeItem(BROWSE_KEY);
      sessionStorage.removeItem(GATE_KEY);
      window.location.href = "index.html";
    });
  } else {
    if (profile) profile.hidden = true;
    signEl.textContent = "Sign in";
    signEl.setAttribute("href", "index.html?signin=1");
  }
})();
