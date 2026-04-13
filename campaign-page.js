/**
 * Campaign detail (campaign.html).
 */
(function () {
  var app = window.CROWDCARE_APP;
  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");
  var c = id ? app.findCampaignById(id) : null;
  if (!c) {
    document.body.innerHTML =
      '<div class="layout-backdrop" aria-hidden="true"></div><div class="layout-content">' +
      "<p>Campaign not found.</p>" +
      '<p><a href="app.html">← Home</a></p></div>';
    return;
  }

  var funding = app.getCampaignFunding(c);

  document.title = c.title + " — CrowdCare";
  document.getElementById("campaign-title").textContent = c.title;

  var story = document.getElementById("campaign-story");
  story.innerHTML = "";
  c.body.forEach(function (text) {
    var p = document.createElement("p");
    p.textContent = text;
    story.appendChild(p);
  });

  document.getElementById("campaign-goal").innerHTML =
    "<strong>Goal:</strong> " + c.goalLabel;

  var progressSection = document.getElementById("campaign-progress");
  if (progressSection && funding.pct != null && funding.goal) {
    progressSection.hidden = false;
    var cur =
      funding.currency ||
      (c.goalLabel.toUpperCase().indexOf("SOL") >= 0 ? "SOL" : "USDC");
    document.getElementById("progress-raised").textContent = formatMoney(
      funding.raised,
      cur
    );
    document.getElementById("progress-goal").textContent = formatMoney(
      funding.goal,
      cur
    );
    document.getElementById("progress-pct").textContent = String(funding.pct);
    var fill = document.getElementById("progress-fill");
    fill.style.width = funding.pct + "%";
    document.getElementById("progress-track")
      .setAttribute("aria-valuenow", String(funding.pct));
  } else if (progressSection) {
    progressSection.hidden = true;
  }

  var transSection = document.getElementById("campaign-transparency");
  if (transSection) {
    var ben = c.transparencyBeneficiaryPct;
    var oth = c.transparencyOtherPct;
    if (typeof ben === "number" && typeof oth === "number") {
      transSection.hidden = false;
      document.getElementById("trans-pct-primary").textContent = String(ben);
      document.getElementById("trans-pct-other").textContent = String(oth);
      document.getElementById("trans-label-other").textContent =
        c.transparencyOtherLabel || "Other (fees & reserves)";
      document.getElementById("trans-bar-primary").style.width = ben + "%";
      document.getElementById("trans-bar-other").style.width = oth + "%";
      var noteEl = document.getElementById("transparency-note");
      if (c.transparencyNote && c.transparencyNote.trim()) {
        noteEl.textContent = c.transparencyNote.trim();
        noteEl.hidden = false;
      } else {
        noteEl.hidden = true;
      }
    } else {
      transSection.hidden = true;
    }
  }

  document.getElementById("wallet-address").textContent = c.wallet;

  var addr = document.getElementById("wallet-address");
  var btn = document.getElementById("copy-btn");
  var label = btn.textContent;
  btn.addEventListener("click", function () {
    var text = addr.textContent.trim();
    function done() {
      btn.textContent = "Copied!";
      setTimeout(function () {
        btn.textContent = label;
      }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        window.prompt("Copy this address:", text);
      });
    } else {
      window.prompt("Copy this address:", text);
    }
  });

  function formatMoney(n, currency) {
    var s = Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
    return currency ? s + " " + currency : s;
  }
})();
