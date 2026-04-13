/**
 * Home / campaigns view (app.html). Redirects to gate if not signed in and not browsing.
 */
(function () {
  var BROWSE_KEY = "crowdcare_browse_only";

  function populateMain() {
    var bar = document.getElementById("user-bar");
    var usr = window.CROWDCARE_SESSION.getUser();
    if (usr && usr.publicKey) {
      bar.hidden = false;
      bar.innerHTML = "";
      var inner = document.createElement("div");
      inner.className = "user-bar-inner";

      if (usr.avatarDataUrl) {
        var img = document.createElement("img");
        img.className = "user-bar-avatar";
        img.src = usr.avatarDataUrl;
        img.alt = "";
        img.width = 36;
        img.height = 36;
        inner.appendChild(img);
      }

      var textWrap = document.createElement("span");
      textWrap.className = "user-bar-text";

      var display =
        (usr.username && usr.username.trim()) || usr.email || "Google user";
      textWrap.appendChild(document.createTextNode("Signed in as "));
      var strong = document.createElement("strong");
      strong.textContent = display;
      textWrap.appendChild(strong);
      textWrap.appendChild(document.createTextNode(". Your demo Solana address: "));

      var mono = document.createElement("span");
      mono.className = "mono";
      mono.textContent = usr.publicKey;
      textWrap.appendChild(mono);
      textWrap.appendChild(document.createTextNode(" · "));

      var so = document.createElement("button");
      so.type = "button";
      so.className = "linkish";
      so.id = "sign-out";
      so.textContent = "Sign out";
      textWrap.appendChild(so);

      inner.appendChild(textWrap);
      bar.appendChild(inner);

      document.getElementById("sign-out").addEventListener("click", function () {
        window.CROWDCARE_SESSION.signOut();
        sessionStorage.removeItem(BROWSE_KEY);
        sessionStorage.removeItem("crowdcare_gate_started");
        window.location.href = "index.html";
      });
    } else {
      bar.hidden = true;
    }

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

  populateMain();
})();
