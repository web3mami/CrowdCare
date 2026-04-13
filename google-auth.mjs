import { Keypair } from "https://esm.sh/@solana/web3.js@1.95.8";

function decodeJwtPayload(jwt) {
  var part = jwt.split(".")[1];
  var b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  var json = atob(b64);
  return JSON.parse(json);
}

async function deriveDemoKeypair(googleSub) {
  var enc = new TextEncoder().encode("crowdcare-demo-v1|" + googleSub);
  var hash = await crypto.subtle.digest("SHA-256", enc);
  var seed = new Uint8Array(hash);
  return Keypair.fromSeed(seed);
}

export function needsGoogleClientSetup() {
  var id = window.CROWDCARE_CONFIG && window.CROWDCARE_CONFIG.googleClientId;
  return !id || id.indexOf("YOUR_CLIENT_ID") !== -1;
}

function show(el, hidden) {
  if (!el) return;
  el.hidden = hidden;
}

export async function completeGoogleSignIn(response, errEl, onSuccess) {
  show(errEl, true);
  try {
    var payload = decodeJwtPayload(response.credential);
    var sub = payload.sub;
    var email = payload.email || "";
    if (!sub) throw new Error("Missing Google account id.");
    var kp = await deriveDemoKeypair(sub);
    var publicKey = kp.publicKey.toBase58();
    window.CROWDCARE_SESSION.setUser({
      sub: sub,
      email: email,
      publicKey: publicKey,
      chain: "solana",
      at: Date.now(),
    });
    sessionStorage.removeItem("crowdcare_browse_only");
    if (onSuccess) onSuccess();
  } catch (e) {
    if (errEl) {
      errEl.textContent =
        "Could not finish sign-in. Try again or check the browser console.";
      show(errEl, false);
    }
  }
}

/**
 * @param {object} opts
 * @param {string} [opts.buttonMountId]
 * @param {string} [opts.errorElementId]
 * @param {string} [opts.setupWarningId]
 * @param {string} [opts.buttonWrapId]
 * @param {() => void} [opts.onSignedIn]
 */
export function initGoogleAuth(opts) {
  opts = opts || {};
  var buttonMountId = opts.buttonMountId || "g_id_signin";
  var errEl = document.getElementById(opts.errorElementId || "auth-error");
  var setupWarn = document.getElementById(
    opts.setupWarningId || "client-setup-warning"
  );
  var btnWrap = document.getElementById(opts.buttonWrapId || "g-btn-wrap");
  var onSignedIn =
    opts.onSignedIn ||
    function () {
      window.location.href = "index.html";
    };

  if (needsGoogleClientSetup()) {
    if (setupWarn) show(setupWarn, false);
    if (btnWrap) btnWrap.hidden = true;
    return;
  }
  if (setupWarn) show(setupWarn, true);

  var google = window.google;
  if (!google || !google.accounts || !google.accounts.id) {
    if (errEl) {
      errEl.textContent =
        "Google script did not load. Check your network or ad blockers.";
      show(errEl, false);
    }
    return;
  }

  google.accounts.id.initialize({
    client_id: window.CROWDCARE_CONFIG.googleClientId,
    callback: function (response) {
      completeGoogleSignIn(response, errEl, onSignedIn);
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  var el = document.getElementById(buttonMountId);
  if (el) {
    google.accounts.id.renderButton(el, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 320,
    });
  }
}

export function tryInitGoogleAuth(attemptsLeft, runInit, errorElementId) {
  if (window.google && window.google.accounts && window.google.accounts.id) {
    runInit();
    return;
  }
  if (attemptsLeft <= 0) {
    var errEl = document.getElementById(errorElementId || "auth-error");
    if (errEl && !errEl.textContent) {
      errEl.textContent =
        "Google Sign-In is still loading. Refresh the page or check your network.";
      show(errEl, false);
    }
    return;
  }
  setTimeout(function () {
    tryInitGoogleAuth(attemptsLeft - 1, runInit, errorElementId);
  }, 100);
}
