/**
 * my-campaigns.html — list campaigns for the signed-in creator.
 */
(function () {
  var u = window.CROWDCARE_SESSION.getUser();
  if (!u || !u.publicKey) {
    window.location.replace("index.html?signin=1");
    return;
  }

  var app = window.CROWDCARE_APP;
  var mine = app.getCampaignsByCreatorSub(u.sub);
  var list = document.getElementById("my-campaigns-list");
  var empty = document.getElementById("my-campaigns-empty");

  app.populateCampaignListEl(list, mine);
  if (empty) empty.hidden = mine.length > 0;
})();
