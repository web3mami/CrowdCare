/**
 * Profile editor (profile.html). Requires Google sign-in with demo address.
 */
(function () {
  var u = window.CROWDCARE_SESSION.getUser();
  if (!u || !u.publicKey) {
    window.location.replace("index.html?signin=1");
    return;
  }

  window.CROWDCARE_SESSION.ensureShareSlug();
  u = window.CROWDCARE_SESSION.getUser();
  var slug = u.shareSlug;
  var hubRel = "app.html?hub=" + encodeURIComponent(slug);
  var hubUrl = hubRel;
  try {
    hubUrl = new URL(hubRel, window.location.href).href;
  } catch (e) {
    /* keep relative */
  }
  var hubCode = document.getElementById("profile-hub-url");
  /* Show relative link in the page; Copy still uses full URL for sharing. */
  if (hubCode) hubCode.textContent = hubRel;

  var profileList = document.getElementById("profile-campaign-list");
  var profileEmpty = document.getElementById("profile-campaigns-empty");
  var mine = window.CROWDCARE_APP.getCampaignsByCreatorSub(u.sub);
  if (profileList) window.CROWDCARE_APP.populateCampaignListEl(profileList, mine);
  if (profileEmpty) profileEmpty.hidden = mine.length > 0;

  document.getElementById("profile-copy-hub").addEventListener("click", function () {
    var t = hubUrl;
    function done() {
      var b = document.getElementById("profile-copy-hub");
      var prev = b.textContent;
      b.textContent = "Copied";
      setTimeout(function () {
        b.textContent = prev;
      }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done).catch(function () {
        window.prompt("Copy this link:", t);
      });
    } else {
      window.prompt("Copy this link:", t);
    }
  });

  var form = document.getElementById("profile-form");
  var errEl = document.getElementById("profile-error");
  var okEl = document.getElementById("profile-saved");
  var usernameInput = document.getElementById("profile-username");
  var fileInput = document.getElementById("profile-avatar");
  var preview = document.getElementById("profile-avatar-preview");
  var placeholder = document.getElementById("profile-avatar-placeholder");
  var removeBtn = document.getElementById("profile-remove-avatar");

  var pendingAvatarDataUrl = null;
  var avatarRemoved = false;

  document.getElementById("profile-email").textContent = u.email || "—";
  document.getElementById("profile-address").textContent = u.publicKey;
  usernameInput.value = (u.username || "").trim();

  function showAvatar(url) {
    if (url) {
      preview.src = url;
      preview.hidden = false;
      placeholder.hidden = true;
    } else {
      preview.removeAttribute("src");
      preview.hidden = true;
      placeholder.hidden = false;
    }
  }

  if (u.avatarDataUrl) showAvatar(u.avatarDataUrl);

  function showErr(msg) {
    errEl.textContent = msg || "";
    errEl.hidden = !msg;
    okEl.hidden = true;
  }

  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    if (f.size > 750 * 1024) {
      showErr("Image is too large. Try one under about 750 KB.");
      fileInput.value = "";
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var data = reader.result;
      if (typeof data !== "string" || data.length > 900000) {
        showErr("That image is too large after loading. Try a smaller file.");
        return;
      }
      pendingAvatarDataUrl = data;
      avatarRemoved = false;
      showAvatar(data);
      showErr("");
    };
    reader.onerror = function () {
      showErr("Could not read that file.");
    };
    reader.readAsDataURL(f);
  });

  removeBtn.addEventListener("click", function () {
    pendingAvatarDataUrl = null;
    avatarRemoved = true;
    fileInput.value = "";
    showAvatar(null);
    showErr("");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showErr("");
    okEl.hidden = true;

    var name = usernameInput.value.trim().slice(0, 40);
    var updates = { username: name };

    if (avatarRemoved) {
      updates.avatarDataUrl = "";
    } else if (pendingAvatarDataUrl) {
      updates.avatarDataUrl = pendingAvatarDataUrl;
    }

    window.CROWDCARE_SESSION.updateProfile(updates);
    okEl.hidden = false;
    pendingAvatarDataUrl = null;
    avatarRemoved = false;
  });
})();
