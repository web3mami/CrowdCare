/**
 * app.html: hub (?hub=), signed-in home (create-first), or browse placeholder.
 */
(function () {
  var BROWSE_KEY = "crowdcare_browse_only";

  var user = window.CROWDCARE_SESSION.getUser();
  var browse = sessionStorage.getItem(BROWSE_KEY) === "1";
  var app = window.CROWDCARE_APP;
  var params = new URLSearchParams(window.location.search);
  var hubSlug = params.get("hub");

  var hubView = document.getElementById("hub-view");
  var signedInHome = document.getElementById("signed-in-home");
  var browseHome = document.getElementById("browse-home");

  if (hubSlug) {
    hubView.hidden = false;
    signedInHome.hidden = true;
    browseHome.hidden = true;
    var hubList = document.getElementById("hub-campaign-list");
    var hubEmpty = document.getElementById("hub-empty");
    var hubCampaigns = app.getCampaignsByShareSlug(hubSlug.trim());
    app.populateCampaignListEl(hubList, hubCampaigns);
    hubEmpty.hidden = hubCampaigns.length > 0;
    document.getElementById("hub-title").textContent =
      hubCampaigns.length > 0 ? "Campaigns on this hub" : "This hub is empty";
    return;
  }

  if (!user && !browse) {
    window.location.replace("index.html");
    return;
  }

  hubView.hidden = true;

  if (user && user.publicKey) {
    window.CROWDCARE_SESSION.ensureShareSlug();
    user = window.CROWDCARE_SESSION.getUser();
    signedInHome.hidden = false;
    browseHome.hidden = true;

    var slug = user.shareSlug || window.CROWDCARE_SESSION.ensureShareSlug();
    /* Relative path keeps navigation in the same tab/window (some in-app browsers
       open a new browser tab when href is a full https:// URL). */
    var hubRel = "app.html?hub=" + encodeURIComponent(slug);
    var hint = document.getElementById("signed-in-hub-hint");
    if (hint) {
      hint.textContent = "";
      hint.appendChild(document.createTextNode("Hub "));
      var la = document.createElement("a");
      la.className = "mono-link mono-link--wrap";
      la.href = hubRel;
      la.textContent = hubRel;
      hint.appendChild(la);
    }
    return;
  }

  /* browse only */
  signedInHome.hidden = true;
  browseHome.hidden = false;
})();
