import { demoSecretKeyBase58 } from "./crowdcare-keypair.mjs";

(function () {
  var u = window.CROWDCARE_SESSION.getUser();
  if (!u || !u.sub) return;

  var revealBtn = document.getElementById("wallet-export-reveal");
  var copyBtn = document.getElementById("wallet-export-copy");
  var hideBtn = document.getElementById("wallet-export-hide");
  var out = document.getElementById("wallet-export-secret");
  var ack = document.getElementById("wallet-export-ack");
  var err = document.getElementById("wallet-export-error");
  var panel = document.getElementById("wallet-export-panel");

  if (!revealBtn || !out || !ack || !panel) return;

  function showErr(msg) {
    if (err) {
      err.textContent = msg || "";
      err.hidden = !msg;
    }
  }

  revealBtn.addEventListener("click", function () {
    showErr("");
    if (!ack.checked) {
      showErr("Confirm the box above first.");
      return;
    }
    revealBtn.disabled = true;
    revealBtn.textContent = "Loading…";
    demoSecretKeyBase58(u.sub)
      .then(function (b58) {
        out.value = b58;
        out.hidden = false;
        if (copyBtn) copyBtn.hidden = false;
        if (hideBtn) hideBtn.hidden = false;
        revealBtn.hidden = true;
      })
      .catch(function () {
        showErr("Could not derive key. Check the network and try again.");
        revealBtn.disabled = false;
        revealBtn.textContent = "Show private key";
      });
  });

  if (hideBtn) {
    hideBtn.addEventListener("click", function () {
      out.value = "";
      out.hidden = true;
      if (copyBtn) copyBtn.hidden = true;
      hideBtn.hidden = true;
      revealBtn.hidden = false;
      revealBtn.disabled = false;
      revealBtn.textContent = "Show private key";
      ack.checked = false;
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var t = out.value;
      if (!t) return;
      function done() {
        var prev = copyBtn.textContent;
        copyBtn.textContent = "Copied";
        setTimeout(function () {
          copyBtn.textContent = prev;
        }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done).catch(function () {
          window.prompt("Copy:", t);
        });
      } else {
        window.prompt("Copy:", t);
      }
    });
  }
})();
