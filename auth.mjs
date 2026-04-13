import { initGoogleAuth, tryInitGoogleAuth } from "./google-auth.mjs";

window.addEventListener("load", function () {
  tryInitGoogleAuth(
    80,
    function () {
      initGoogleAuth({
        buttonMountId: "g_id_signin",
        errorElementId: "auth-error",
        setupWarningId: "client-setup-warning",
        buttonWrapId: "g-btn-wrap",
        onSignedIn: function () {
          window.location.href = "index.html";
        },
      });
    },
    "auth-error"
  );
});
