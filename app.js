/**
 * Merges built-in campaigns (campaigns.js) with extra ones saved in this browser.
 */
(function () {
  var STORAGE_KEY = "crowdcare_extra";

  function isValidCampaign(c) {
    return (
      c &&
      typeof c.id === "string" &&
      c.id.trim() &&
      typeof c.title === "string" &&
      c.title.trim() &&
      Array.isArray(c.body) &&
      c.body.length &&
      typeof c.goalLabel === "string" &&
      c.goalLabel.trim() &&
      typeof c.wallet === "string" &&
      c.wallet.trim()
    );
  }

  function getExtraCampaigns() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var extra = JSON.parse(raw);
      if (!Array.isArray(extra)) return [];
      return extra.filter(isValidCampaign);
    } catch (e) {
      return [];
    }
  }

  function getAllCampaigns() {
    var base = (window.CROWDCARE_CAMPAIGNS || []).slice();
    return base.concat(getExtraCampaigns());
  }

  function findCampaignById(id) {
    if (!id) return null;
    var all = getAllCampaigns();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function idTaken(id) {
    return findCampaignById(id) !== null;
  }

  function addExtraCampaign(campaign) {
    if (!isValidCampaign(campaign)) return false;
    if (idTaken(campaign.id)) return false;
    var extra = getExtraCampaigns();
    extra.push(campaign);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(extra));
    return true;
  }

  window.CROWDCARE_APP = {
    getAllCampaigns: getAllCampaigns,
    findCampaignById: findCampaignById,
    isValidCampaign: isValidCampaign,
    idTaken: idTaken,
    addExtraCampaign: addExtraCampaign,
  };
})();
