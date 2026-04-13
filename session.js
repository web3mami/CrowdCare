(function () {
  var STORAGE_KEY = "crowdcare_user";

  function getUser() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function updateProfile(updates) {
    var u = getUser();
    if (!u) return false;
    updates = updates || {};
    if (updates.username !== undefined) {
      u.username = updates.username;
    }
    if (updates.avatarDataUrl !== undefined) {
      if (updates.avatarDataUrl === "") {
        delete u.avatarDataUrl;
      } else {
        u.avatarDataUrl = updates.avatarDataUrl;
      }
    }
    setUser(u);
    return true;
  }

  window.CROWDCARE_SESSION = {
    getUser: getUser,
    setUser: setUser,
    signOut: signOut,
    updateProfile: updateProfile,
  };
})();
