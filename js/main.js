/* ===================== Kalliston site scripts ===================== */
(function () {
  "use strict";

  /* ---------- Year in footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.querySelector(".mobile-nav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("open");
      mobileNav.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        mobileNav.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Reveal on scroll (progressive enhancement) ----------
     Applied only to inner content blocks — never whole sections — so a
     section can never end up hidden. A failsafe timer and reduced-motion
     guard guarantee content always becomes visible. */
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealTargets = document.querySelectorAll(
    ".section-head, .about-text, .about-card, .stat, .card, " +
    ".why-item, .step, .apply-intro, .apply-form, .contact-item"
  );

  function revealAll() {
    revealTargets.forEach(function (el) { el.classList.add("visible"); });
  }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach(function (el) { el.classList.add("reveal", "visible"); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach(function (el) { io.observe(el); });
    // Failsafe: nothing stays invisible for more than 1.6s.
    setTimeout(revealAll, 1600);
  }

  /* ---------- File input UX ---------- */
  var MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  var ALLOWED = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
  var fileInput = document.getElementById("attachment");
  var fileDrop = document.getElementById("fileDrop");
  var fileText = document.getElementById("fileDropText");
  var statusEl = document.getElementById("formStatus");

  function extOk(name) {
    var lower = name.toLowerCase();
    return ALLOWED.some(function (ext) { return lower.endsWith(ext); });
  }

  function describeFile(file) {
    var kb = file.size / 1024;
    var size = kb > 1024 ? (kb / 1024).toFixed(1) + " MB" : Math.round(kb) + " KB";
    return file.name + " · " + size;
  }

  function setFile(file) {
    if (!file) return;
    if (!extOk(file.name)) {
      showStatus("Unsupported file type. Please upload PDF, DOC, DOCX, JPG or PNG.", "error");
      fileInput.value = "";
      resetDrop();
      return;
    }
    if (file.size > MAX_BYTES) {
      showStatus("File is too large. Maximum size is 5 MB.", "error");
      fileInput.value = "";
      resetDrop();
      return;
    }
    fileText.textContent = describeFile(file);
    fileDrop.classList.add("has-file");
    showStatus("", "");
  }

  function resetDrop() {
    fileText.textContent = "Click to choose a file or drag it here";
    fileDrop.classList.remove("has-file");
  }

  if (fileInput && fileDrop) {
    fileInput.addEventListener("change", function () {
      setFile(fileInput.files[0]);
    });
    ["dragenter", "dragover"].forEach(function (evt) {
      fileDrop.addEventListener(evt, function (e) {
        e.preventDefault();
        fileDrop.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      fileDrop.addEventListener(evt, function (e) {
        e.preventDefault();
        fileDrop.classList.remove("dragover");
      });
    });
    fileDrop.addEventListener("drop", function (e) {
      var dropped = e.dataTransfer && e.dataTransfer.files;
      if (dropped && dropped.length) {
        fileInput.files = dropped;
        setFile(dropped[0]);
      }
    });
  }

  /* ---------- Status helper ---------- */
  function showStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "form-status" + (type ? " " + type : "");
  }

  /* ---------- Form submission (Web3Forms) ---------- */
  var form = document.getElementById("applicationForm");
  var submitBtn = document.getElementById("submitBtn");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Native validation for required text fields.
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var file = fileInput && fileInput.files[0];
      if (!file) {
        showStatus("Please attach your CV or application form.", "error");
        return;
      }
      if (!extOk(file.name) || file.size > MAX_BYTES) {
        showStatus("Please attach a valid file (PDF/DOC/DOCX/JPG/PNG, max 5 MB).", "error");
        return;
      }

      var accessKey = form.querySelector('[name="access_key"]').value;
      if (!accessKey || accessKey.indexOf("YOUR_WEB3FORMS") !== -1) {
        showStatus(
          "The form is not configured yet. Add your Web3Forms access key to enable sending.",
          "error"
        );
        return;
      }

      var data = new FormData(form);

      submitBtn.classList.add("is-loading");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      showStatus("Sending your application…", "loading");

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: data
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (json.success) {
            form.reset();
            resetDrop();
            showStatus(
              "Thank you! Your application has been sent. We will be in touch soon.",
              "success"
            );
          } else {
            showStatus(
              (json.message || "Something went wrong.") + " Please try again or email us directly.",
              "error"
            );
          }
        })
        .catch(function () {
          showStatus(
            "Network error. Please check your connection and try again, or email us directly.",
            "error"
          );
        })
        .finally(function () {
          submitBtn.classList.remove("is-loading");
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Application";
        });
    });
  }
})();
