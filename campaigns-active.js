(function () {
  var app = window.CROWDCARE_APP;
  var list = document.getElementById("dir-campaign-list");
  var empty = document.getElementById("dir-empty");
  var camps = app.getActiveCampaignsDirectory();
  app.populateCampaignListEl(list, camps);
  if (empty) empty.hidden = camps.length > 0;
})();
