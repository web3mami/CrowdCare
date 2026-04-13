/**
 * Home / campaigns view (app.html). Redirects to gate if not signed in and not browsing.
 */
(function () {
  var BROWSE_KEY = "crowdcare_browse_only";

  function populateCampaignList() {
    var list = document.getElementById("campaign-list");
    if (!list) return;
    list.innerHTML = "";
    var app = window.CROWDCARE_APP;
    var campaigns = app.getAllCampaigns();
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
      list.appendChild(li);
    });
  }

  function formatAmt(n, currency) {
    var s = Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
    return currency ? s + " " + currency : s;
  }

  var user = window.CROWDCARE_SESSION.getUser();
  var browse = sessionStorage.getItem(BROWSE_KEY) === "1";

  if (!user && !browse) {
    window.location.replace("index.html");
    return;
  }

  populateCampaignList();
})();
