/**
 * Merges built-in campaigns (campaigns.js) with extra ones saved in this browser.
 */
(function () {
  var STORAGE_KEY = "crowdcare_extra";

  function parseGoalFromLabel(goalLabel) {
    if (!goalLabel) return null;
    var m = String(goalLabel)
      .replace(/,/g, "")
      .match(/(\d+(?:\.\d+)?)/);
    if (!m) return null;
    var n = parseFloat(m[0]);
    return n > 0 ? n : null;
  }

  function isValidCampaign(c) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !c.id.trim() ||
      typeof c.title !== "string" ||
      !c.title.trim() ||
      !Array.isArray(c.body) ||
      !c.body.length ||
      typeof c.goalLabel !== "string" ||
      !c.goalLabel.trim() ||
      typeof c.wallet !== "string" ||
      !c.wallet.trim()
    ) {
      return false;
    }
    if (c.goalAmount != null) {
      if (typeof c.goalAmount !== "number" || !(c.goalAmount > 0)) return false;
    }
    if (c.raisedAmount != null) {
      if (typeof c.raisedAmount !== "number" || c.raisedAmount < 0) return false;
    }
    var b = c.transparencyBeneficiaryPct;
    var o = c.transparencyOtherPct;
    if (b != null || o != null) {
      if (typeof b !== "number" || typeof o !== "number") return false;
      if (b < 0 || o < 0 || Math.abs(b + o - 100) > 0.001) return false;
    }
    return true;
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

  function getCampaignsByCreatorSub(sub) {
    if (!sub) return [];
    return getAllCampaigns().filter(function (c) {
      return c.creatorSub === sub;
    });
  }

  function getCampaignsByShareSlug(slug) {
    if (!slug || typeof slug !== "string") return [];
    return getAllCampaigns().filter(function (c) {
      return c.creatorShareSlug === slug;
    });
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

  /**
   * @returns {{ goal: number|null, raised: number, pct: number|null, currency: string }}
   */
  function getCampaignFunding(c) {
    if (!c) {
      return { goal: null, raised: 0, pct: null, currency: "" };
    }
    var goal =
      typeof c.goalAmount === "number" && c.goalAmount > 0
        ? c.goalAmount
        : parseGoalFromLabel(c.goalLabel);
    var raised =
      typeof c.raisedAmount === "number" && c.raisedAmount >= 0
        ? c.raisedAmount
        : 0;
    var currency =
      typeof c.goalCurrency === "string" && c.goalCurrency.trim()
        ? c.goalCurrency.trim().toUpperCase()
        : "";
    var pct = null;
    if (goal && goal > 0) {
      pct = Math.min(100, Math.round((raised / goal) * 1000) / 10);
    }
    return { goal: goal || null, raised: raised, pct: pct, currency: currency };
  }

  function formatCampaignAmt(n, currency) {
    var s = Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
    return currency ? s + " " + currency : s;
  }

  function appendCampaignListCard(listEl, c) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = "campaign.html?id=" + encodeURIComponent(c.id);
    var title = document.createElement("p");
    title.className = "card-title";
    title.textContent = c.title;
    var meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = "Goal: " + c.goalLabel;

    var fund = getCampaignFunding(c);
    if (fund.pct != null && fund.goal) {
      var prog = document.createElement("div");
      prog.className = "campaign-card-funding";
      var row = document.createElement("div");
      row.className = "campaign-card-funding-row";
      var pctEl = document.createElement("span");
      pctEl.className = "campaign-card-pct";
      pctEl.textContent = fund.pct + "% funded";
      var amtEl = document.createElement("span");
      amtEl.className = "campaign-card-amt";
      var cur = fund.currency || "";
      amtEl.textContent =
        formatCampaignAmt(fund.raised, cur) + " / " + formatCampaignAmt(fund.goal, cur);
      row.appendChild(pctEl);
      row.appendChild(amtEl);
      var track = document.createElement("div");
      track.className = "ft-progress-track ft-progress-track--compact";
      track.setAttribute("role", "presentation");
      var fill = document.createElement("div");
      fill.className = "ft-progress-fill";
      fill.style.width = fund.pct + "%";
      track.appendChild(fill);
      prog.appendChild(row);
      prog.appendChild(track);
      a.appendChild(title);
      a.appendChild(prog);
      a.appendChild(meta);
    } else {
      a.appendChild(title);
      a.appendChild(meta);
    }
    li.appendChild(a);
    listEl.appendChild(li);
  }

  function populateCampaignListEl(listEl, campaigns) {
    if (!listEl) return;
    listEl.innerHTML = "";
    (campaigns || []).forEach(function (c) {
      appendCampaignListCard(listEl, c);
    });
  }

  window.CROWDCARE_APP = {
    getAllCampaigns: getAllCampaigns,
    getCampaignsByCreatorSub: getCampaignsByCreatorSub,
    getCampaignsByShareSlug: getCampaignsByShareSlug,
    findCampaignById: findCampaignById,
    isValidCampaign: isValidCampaign,
    idTaken: idTaken,
    addExtraCampaign: addExtraCampaign,
    getCampaignFunding: getCampaignFunding,
    parseGoalFromLabel: parseGoalFromLabel,
    populateCampaignListEl: populateCampaignListEl,
  };
})();
