/**
 * Home / campaigns view (app.html). Redirects to gate if not signed in and not browsing.
 */
(function () {
  var BROWSE_KEY = "crowdcare_browse_only";

  function populateCampaignList() {
    var list = document.getElementById("campaign-list");
    if (!list) return;
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

  if (!user && !browse) {
    window.location.replace("index.html");
    return;
  }

  populateCampaignList();
})();
