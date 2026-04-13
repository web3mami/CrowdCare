/**
 * Home page only: gate (sign-in first) or main app.
 * No top-level import from CDNs: if that request fails (CSP, network), the whole
 * module used to abort and the Google button never rendered. Web3 loads only
 * after the user completes Google sign-in.
 */
var WEB3_ESM = "https://esm.sh/@solana/web3.js@1.95.8";

function decodeJwtPayload(jwt) {
  var part = jwt.split(".")[1];
  var b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  var json = atob(b64);
  return JSON.parse(json);
}

async function deriveDemoKeypair(googleSub) {
  var { Keypair } = await import(WEB3_ESM);
  var enc = new TextEncoder().encode("crowdcare-demo-v1|" + googleSub);
  var hash = await crypto.subtle.digest("SHA-256", enc);
  var seed = new Uint8Array(hash);
  return Keypair.fromSeed(seed);
}

function needsGoogleClientSetup() {
  var id = window.CROWDCARE_CONFIG && window.CROWDCARE_CONFIG.googleClientId;
  return !id || id.indexOf("YOUR_CLIENT_ID") !== -1;
}

function show(el, hidden) {
  if (!el) return;
  el.hidden = hidden;
}

async function completeGoogleSignIn(response, errEl, onSuccess) {
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

function initGoogleAuth(opts) {
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

function tryInitGoogleAuth(attemptsLeft, runInit, errorElementId) {
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

var BROWSE_KEY = "crowdcare_browse_only";
var GATE_START_KEY = "crowdcare_gate_started";

var params = new URLSearchParams(window.location.search);
if (params.get("signin") === "1") {
  sessionStorage.removeItem(BROWSE_KEY);
  sessionStorage.removeItem(GATE_START_KEY);
  var u = new URL(window.location.href);
  u.search = "";
  history.replaceState({}, "", u.pathname + u.hash);
}

function populateMain() {
  var bar = document.getElementById("user-bar");
  var usr = window.CROWDCARE_SESSION.getUser();
  if (usr && usr.publicKey) {
    bar.hidden = false;
    bar.innerHTML =
      "Signed in as <strong>" +
      (usr.email || "Google user") +
      '</strong>. Your demo Solana address: <span class="mono">' +
      usr.publicKey +
      '</span> · <button type="button" class="linkish" id="sign-out">Sign out</button>';
    document.getElementById("sign-out").addEventListener("click", function () {
      window.CROWDCARE_SESSION.signOut();
      sessionStorage.removeItem(BROWSE_KEY);
      sessionStorage.removeItem(GATE_START_KEY);
      window.location.reload();
    });
  } else {
    bar.hidden = true;
  }

  var list = document.getElementById("campaign-list");
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
var gate = document.getElementById("gate");
var main = document.getElementById("main");
var browseSkip = document.getElementById("browse-skip");

if (user || browse) {
  gate.hidden = true;
  main.hidden = false;
  populateMain();
} else {
  gate.hidden = false;
  main.hidden = true;

  var welcome = document.getElementById("gate-welcome");
  var auth = document.getElementById("gate-auth");
  var startBtn = document.getElementById("gate-start-btn");

  function mountGoogleButton() {
    tryInitGoogleAuth(
      80,
      function () {
        initGoogleAuth({
          buttonMountId: "g_id_signin_gate",
          errorElementId: "gate-auth-error",
          setupWarningId: "gate-client-setup",
          buttonWrapId: "g-btn-wrap-gate",
          onSignedIn: function () {
            window.location.reload();
          },
        });
      },
      "gate-auth-error"
    );
  }

  function revealAuth() {
    sessionStorage.setItem(GATE_START_KEY, "1");
    if (welcome) welcome.hidden = true;
    if (auth) auth.hidden = false;
    if (document.readyState === "complete") mountGoogleButton();
    else window.addEventListener("load", mountGoogleButton);
  }

  if (welcome && auth && startBtn) {
    if (sessionStorage.getItem(GATE_START_KEY) === "1") {
      welcome.hidden = true;
      auth.hidden = false;
      if (document.readyState === "complete") mountGoogleButton();
      else window.addEventListener("load", mountGoogleButton);
    } else {
      startBtn.addEventListener("click", revealAuth);
    }
  }
}
