/**
 * Nav drawer: show signed-in-only links; Sign out vs Sign in on last item.
 */
(function () {
  var BROWSE_KEY = "crowdcare_browse_only";
  var GATE_KEY = "crowdcare_gate_started";

  var u = window.CROWDCARE_SESSION && window.CROWDCARE_SESSION.getUser();
  var signedIn = !!(u && u.publicKey);

  var profileWrap = document.getElementById("drawer-profile-wrap");
  var createWrap = document.getElementById("drawer-create-wrap");
  var mineWrap = document.getElementById("drawer-mine-wrap");
  var authEl = document.getElementById("drawer-auth");

  if (profileWrap) profileWrap.hidden = !signedIn;
  if (createWrap) createWrap.hidden = !signedIn;
  if (mineWrap) mineWrap.hidden = !signedIn;

  if (!authEl) return;

  if (signedIn) {
    authEl.textContent = "Sign out";
    authEl.setAttribute("href", "#");
    authEl.addEventListener("click", function (e) {
      e.preventDefault();
      window.CROWDCARE_SESSION.signOut();
      sessionStorage.removeItem(BROWSE_KEY);
      sessionStorage.removeItem(GATE_KEY);
      window.location.href = "index.html";
    });
  } else {
    authEl.textContent = "Sign in";
    authEl.setAttribute("href", "index.html?signin=1");
  }
})();
