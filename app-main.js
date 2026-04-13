/**
 * app.html: hub (?hub=), signed-in home (create-first), or browse placeholder.
 */
(function () {
  var BROWSE_KEY = "crowdcare_browse_only";

  function formatAmt(n, currency) {
    var s = Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
    return currency ? s + " " + currency : s;
  }

  function appendCampaignCard(listEl, c, app) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = "campaign.html?id=" + encodeURIComponent(c.id);
    var title = document.createElement("p");
    title.className = "card-title";
    title.textContent = c.title;
    var meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = "Goal: " + c.goalLabel;

    var fund = app.getCampaignFunding(c);
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
        formatAmt(fund.raised, cur) + " / " + formatAmt(fund.goal, cur);
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

  function populateList(listEl, campaigns, app) {
    if (!listEl) return;
    listEl.innerHTML = "";
    campaigns.forEach(function (c) {
      appendCampaignCard(listEl, c, app);
    });
  }

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
    populateList(hubList, hubCampaigns, app);
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

    var mine = app.getCampaignsByCreatorSub(user.sub);
    var section = document.getElementById("your-campaigns-section");
    var list = document.getElementById("campaign-list");
    if (mine.length > 0) {
      section.hidden = false;
      populateList(list, mine, app);
    } else {
      section.hidden = true;
    }

    var slug = user.shareSlug || window.CROWDCARE_SESSION.ensureShareSlug();
    var hubUrl = "app.html?hub=" + encodeURIComponent(slug);
    try {
      hubUrl = new URL(hubUrl, window.location.href).href;
    } catch (e) {
      /* relative */
    }
    var hint = document.getElementById("signed-in-hub-hint");
    if (hint) {
      hint.textContent = "";
      hint.appendChild(document.createTextNode("Your hub link: "));
      var la = document.createElement("a");
      la.className = "mono-link";
      la.href = hubUrl;
      la.textContent = hubUrl;
      hint.appendChild(la);
    }
    return;
  }

  /* browse only */
  signedInHome.hidden = true;
  browseHome.hidden = false;
})();
