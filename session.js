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

  window.CROWDCARE_SESSION = {
    getUser: getUser,
    setUser: setUser,
    signOut: signOut,
  };
})();
