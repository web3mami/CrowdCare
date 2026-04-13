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

function needsClientSetup() {
  var id = window.CROWDCARE_CONFIG && window.CROWDCARE_CONFIG.googleClientId;
  return !id || id.indexOf("YOUR_CLIENT_ID") !== -1;
}

function show(el, hidden) {
  if (!el) return;
  el.hidden = hidden;
}

async function handleCredentialResponse(response) {
  var errEl = document.getElementById("auth-error");
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
    window.location.href = "index.html";
  } catch (e) {
    if (errEl) {
      errEl.textContent =
        "Could not finish sign-in. Try again or check the browser console.";
      show(errEl, false);
    }
  }
}

window.handleCredentialResponse = handleCredentialResponse;

function initGoogle() {
  var warn = document.getElementById("client-setup-warning");
  var btnWrap = document.getElementById("g-btn-wrap");
  if (needsClientSetup()) {
    show(warn, false);
    if (btnWrap) btnWrap.hidden = true;
    return;
  }
  show(warn, true);
  var clientId = window.CROWDCARE_CONFIG.googleClientId;
  var google = window.google;
  if (!google || !google.accounts || !google.accounts.id) {
    var errEl = document.getElementById("auth-error");
    if (errEl) {
      errEl.textContent =
        "Google script did not load. Check your network or ad blockers.";
      show(errEl, false);
    }
    return;
  }
  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  var el = document.getElementById("g_id_signin");
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

function tryInitGoogle(attemptsLeft) {
  if (window.google && window.google.accounts && window.google.accounts.id) {
    initGoogle();
    return;
  }
  if (attemptsLeft <= 0) {
    var errEl = document.getElementById("auth-error");
    if (errEl && !errEl.textContent) {
      errEl.textContent =
        "Google Sign-In is still loading. Refresh the page or check your network.";
      errEl.hidden = false;
    }
    return;
  }
  setTimeout(function () {
    tryInitGoogle(attemptsLeft - 1);
  }, 100);
}

window.addEventListener("load", function () {
  tryInitGoogle(80);
});
