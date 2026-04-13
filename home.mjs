import { initGoogleAuth, tryInitGoogleAuth } from "./google-auth.mjs";

var BROWSE_KEY = "crowdcare_browse_only";

var params = new URLSearchParams(window.location.search);
if (params.get("signin") === "1") {
  sessionStorage.removeItem(BROWSE_KEY);
  var u = new URL(window.location.href);
  u.search = "";
  history.replaceState({}, "", u.pathname + u.hash);
}

function populateMain() {
  var bar = document.getElementById("user-bar");
  var u = window.CROWDCARE_SESSION.getUser();
  if (u && u.publicKey) {
    bar.hidden = false;
    bar.innerHTML =
      "Signed in as <strong>" +
      (u.email || "Google user") +
      '</strong>. Your demo Solana address: <span class="mono">' +
      u.publicKey +
      '</span> · <button type="button" class="linkish" id="sign-out">Sign out</button>';
    document.getElementById("sign-out").addEventListener("click", function () {
      window.CROWDCARE_SESSION.signOut();
      sessionStorage.removeItem(BROWSE_KEY);
      window.location.reload();
    });
  } else {
    bar.hidden = true;
  }

  var list = document.getElementById("campaign-list");
  list.innerHTML = "";
  var campaigns = window.CROWDCARE_APP.getAllCampaigns();
  campaigns.forEach(function (c) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = "campaign.html?id=" + encodeURIComponent(c.id);
    var title = document.createElement("p");
    title.className = "card-title";
    title.textContent = c.title;
    var meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = "Goal: " + c.goalLabel;
    a.appendChild(title);
    a.appendChild(meta);
    li.appendChild(a);
    list.appendChild(li);
  });
}

var user = window.CROWDCARE_SESSION.getUser();
var browse = sessionStorage.getItem(BROWSE_KEY) === "1";
var gate = document.getElementById("gate");
var main = document.getElementById("main");
var browseSkip = document.getElementById("browse-skip");

if (user || browse) {
  gate.hidden = true;
  main.hidden = false;
  populateMain();
} else {
  gate.hidden = false;
  main.hidden = true;
  browseSkip.addEventListener("click", function () {
    sessionStorage.setItem(BROWSE_KEY, "1");
    window.location.reload();
  });
  window.addEventListener("load", function () {
    tryInitGoogleAuth(
      80,
      function () {
        initGoogleAuth({
          buttonMountId: "g_id_signin_gate",
          errorElementId: "gate-auth-error",
          setupWarningId: "gate-client-setup",
          buttonWrapId: "g-btn-wrap-gate",
          onSignedIn: function () {
            window.location.reload();
          },
        });
      },
      "gate-auth-error"
    );
  });
}
