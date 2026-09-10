(function () {
  "use strict";

  var LANG_KEY = "portfolio-lang";
  var VISIT_KEY = "portfolio-visited";
  var lang = readStore(LANG_KEY) || "en";
  var dict = {};
  var typingTimer = null;
  var typingRun = 0;

  function readStore(key) {
    try { return localStorage.getItem(key); }
    catch (e) { return null; }
  }

  function writeStore(key, value) {
    try { localStorage.setItem(key, value); }
    catch (e) {}
  }

  function t(path) {
    var parts = path.split(".");
    var cur = dict;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || cur[parts[i]] === undefined) return null;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function msg(key, fallback) {
    return t(key) || fallback;
  }

  async function loadLang(next) {
    try {
      var res = await fetch("languages/" + next + ".json");
      if (!res.ok) throw new Error("missing lang: " + next);
      dict = await res.json();
      return;
    } catch (err) {
      console.warn("Could not load '" + next + "' translations, trying English.", err);
    }
    if (next !== "en") {
      try {
        var fb = await fetch("languages/en.json");
        if (fb.ok) dict = await fb.json();
      } catch (err2) {
        console.warn("Could not load fallback English translations.", err2);
      }
    }
  }

  function applyLang() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (v && typeof v === "string") el.textContent = v;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n-placeholder"));
      if (v) el.placeholder = v;
    });

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";

    document.querySelectorAll(".flag-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });

    if (dict.meta && dict.meta.title) document.title = dict.meta.title;

    updateMenuLabel(false);
    startTyping();
  }

  async function setLang(next) {
    if (!next || (next !== "en" && next !== "fa")) return;
    if (next === lang && Object.keys(dict).length) {
      writeStore(LANG_KEY, lang);
      writeStore(VISIT_KEY, "true");
      hideModal();
      return;
    }
    lang = next;
    writeStore(LANG_KEY, lang);
    writeStore(VISIT_KEY, "true");
    await loadLang(lang);
    applyLang();
    hideModal();
  }

  function startTyping() {
    var el = document.getElementById("typing");
    if (!el) return;

    var run = ++typingRun;
    clearTimeout(typingTimer);

    var words = t("hero.typing");
    if (!Array.isArray(words) || !words.length) {
      el.textContent = "";
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = words[0];
      return;
    }

    var wi = 0, ci = 0, deleting = false;

    (function type() {
      if (run !== typingRun) return;
      var word = words[wi];

      ci += deleting ? -1 : 1;
      el.textContent = word.slice(0, ci);

      var delay = deleting ? 40 : 80;
      if (!deleting && ci === word.length) {
        deleting = true;
        delay = 1500;
      } else if (deleting && ci === 0) {
        deleting = false;
        wi = (wi + 1) % words.length;
        delay = 500;
      }
      typingTimer = setTimeout(type, delay);
    })();
  }

  function watchAll(selector, onShow, threshold) {
    var items = document.querySelectorAll(selector);
    if (!("IntersectionObserver" in window)) {
      items.forEach(onShow);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          onShow(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: threshold || 0.15 });
    items.forEach(function (el) { io.observe(el); });
  }

  function showToast(text, ok) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.toggle("success", !!ok);
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toast.classList.remove("show");
    }, 4000);
  }

  function hideModal() {
    var modal = document.getElementById("langModal");
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }
  }

  function dismissModal() {
    writeStore(VISIT_KEY, "true");
    hideModal();
  }

  function showModal() {
    var modal = document.getElementById("langModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.removeAttribute("aria-hidden");
    }
  }

  function updateMenuLabel(open) {
    var burger = document.getElementById("hamburger");
    if (!burger) return;
    var label = open
      ? msg("nav.closeLabel", "Close menu")
      : msg("nav.menuLabel", "Open menu");
    burger.setAttribute("aria-label", label);
  }

  function closeMenu() {
    var burger = document.getElementById("hamburger");
    var links = document.getElementById("navLinks");
    if (!burger || !links || !links.classList.contains("open")) return;
    links.classList.remove("open");
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    updateMenuLabel(false);
  }

  function setupNav() {
    var burger = document.getElementById("hamburger");
    var links = document.getElementById("navLinks");
    var navbar = document.getElementById("navbar");
    if (!burger || !links || !navbar) return;

    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
      updateMenuLabel(open);
    });

    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeMenu();
        dismissModal();
      }
    });

    document.addEventListener("click", function (e) {
      if (!links.classList.contains("open")) return;
      if (navbar.contains(e.target)) return;
      closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 767) closeMenu();
    });

    var toTop = document.getElementById("toTop");
    function onScroll() {
      navbar.classList.toggle("scrolled", window.scrollY > 10);
      if (toTop) toTop.classList.toggle("show", window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var navLinks = document.querySelectorAll(".nav-link");
    if ("IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          navLinks.forEach(function (l) {
            l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id);
          });
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      document.querySelectorAll("section[id]").forEach(function (s) { spy.observe(s); });
    }
  }

  function setupEffects() {
    watchAll(".reveal", function (el) { el.classList.add("visible"); }, 0.1);

    watchAll("[data-count]", function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.textContent = target + "+";
        return;
      }
      var started = performance.now();
      (function tick(now) {
        var k = Math.min((now - started) / 1200, 1);
        el.textContent = Math.round(target * k) + (k === 1 ? "+" : "");
        if (k < 1) requestAnimationFrame(tick);
      })(started);
    }, 0.3);
  }

  function setupForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;

    var fields = ["name", "email", "message"];

    function fail(id, text) {
      document.getElementById(id).classList.add("invalid");
      document.getElementById(id + "Error").textContent = text;
    }

    function ok(id) {
      document.getElementById(id).classList.remove("invalid");
      document.getElementById(id + "Error").textContent = "";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("name").value.trim();
      var email = document.getElementById("email").value.trim();
      var message = document.getElementById("message").value.trim();
      var valid = true;

      if (!name) { fail("name", msg("contact.errorRequired", "Please fill out this field.")); valid = false; }
      else ok("name");

      if (!email) { fail("email", msg("contact.errorRequired", "Please fill out this field.")); valid = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail("email", msg("contact.errorEmail", "Please enter a valid email.")); valid = false; }
      else ok("email");

      if (!message) { fail("message", msg("contact.errorRequired", "Please fill out this field.")); valid = false; }
      else if (message.length < 10) { fail("message", msg("contact.errorMin", "Message must be at least 10 characters.")); valid = false; }
      else ok("message");

      if (!valid) return;

      var btn = document.getElementById("submitBtn");
      var original = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ' + msg("contact.sending", "Sending...");
      btn.disabled = true;

      setTimeout(function () {
        btn.innerHTML = original;
        btn.disabled = false;
        form.reset();
        showToast(msg("contact.success", "Message sent!"), true);
      }, 1000);
    });

    fields.forEach(function (id) {
      var input = document.getElementById(id);
      if (input) input.addEventListener("input", function () { ok(id); });
    });
  }

  function setupLangButtons() {
    document.querySelectorAll("[data-lang-choice]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        setLang(e.currentTarget.getAttribute("data-lang-choice"));
      });
    });

    document.querySelectorAll(".flag-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        setLang(e.currentTarget.getAttribute("data-lang"));
      });
    });

    var modal = document.getElementById("langModal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) dismissModal();
      });
    }
  }

  function setupMisc() {
    var toTop = document.getElementById("toTop");
    if (toTop) {
      toTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  }

  async function init() {
    setupNav();
    setupEffects();
    setupForm();
    setupLangButtons();
    setupMisc();

    if (lang !== "fa" && lang !== "en") lang = "en";

    await loadLang(lang);
    applyLang();

    if (readStore(VISIT_KEY)) hideModal();
    else showModal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
