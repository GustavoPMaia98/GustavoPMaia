(function () {
  "use strict";

  // ============================================================
  //  CONFIG
  // ============================================================
  // Publications are found and verified every night by tools/update_publications.py
  // (ORCID + Crossref + OpenAlex, journal articles only) and read from data/publications.json.

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Guards so init() can be safely re-run after dynamic sections load.
  let starfieldWired = false;
  let navToggleWired = false;
  let scrollspyWired = false;
  let rippleWired = false;
  let lightboxWired = false;
  let progressWired = false;
  let shortcutsWired = false;
  let langWired = false;
  let mapWired = false;
  let mapLangUpdate = null;   // set once the map legend exists; called by applyLang
  let pathLangUpdate = null;  // career path summary panel; called by applyLang
  let showPathFor = () => false;  // opens the career-path step of an education entry (search)
  // Language: a ?lang=xx link wins for that visit (shareable, indexable URLs; not
  // saved, so following one link does not change the language for good), then a
  // choice made with the language button, then the browser's own language.
  const LANGS = ["en", "pt", "fr", "ja"];
  let currentLang = (function(){
    try {
      const q = new URLSearchParams(location.search).get("lang");
      if (q && LANGS.indexOf(q) !== -1) return q;
      const saved = localStorage.getItem("lang");
      if (saved && LANGS.indexOf(saved) !== -1) return saved;
    } catch(e){}
    const prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || "en"];
    for (const l of prefs) {
      const base = String(l).toLowerCase().slice(0, 2);
      if (LANGS.indexOf(base) !== -1) return base;
    }
    return "en";
  })();
  // French/Japanese dictionary (~180 KB) is only downloaded when it is needed.
  let trPromise = null;
  function ensureTR(lang) {
    if (lang !== "fr" && lang !== "ja") return Promise.resolve();
    if (window.TR && window.TR.fr && Object.keys(window.TR.fr).length) return Promise.resolve();
    if (!trPromise) trPromise = new Promise(res => {
      const s = document.createElement("script");
      s.src = "i18n/translations.js"; s.onload = res; s.onerror = res;
      document.head.appendChild(s);
    });
    return trPromise;
  }

  // ============================================================
  //  ANIMATED STARFIELD (canvas, GPU-light, drifts left -> right)
  // ============================================================
  function initStarfield() {
    if (starfieldWired) return;
    const canvas = document.getElementById("starfield");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    starfieldWired = true;

    let w = 0, h = 0, dpr = 1, stars = [], shooting = [], raf = null, last = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      // Density scaled to area, capped (lower on phones for performance).
      let count = Math.round((w * h) / 9000);
      count = Math.max(40, Math.min(count, w < 600 ? 90 : 220));
      const layers = [
        { speed: 3,  size: [0.4, 0.9], alpha: [0.25, 0.5] },
        { speed: 7,  size: [0.6, 1.3], alpha: [0.40, 0.75] },
        { speed: 13, size: [0.9, 1.8], alpha: [0.60, 1.0] }
      ];
      stars = [];
      for (let i = 0; i < count; i++) {
        const l = layers[i % layers.length];
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(l.size[0], l.size[1]),
          a: rand(l.alpha[0], l.alpha[1]),
          tw: Math.random() * Math.PI * 2,
          tws: rand(0.6, 1.8),
          sp: l.speed * rand(0.8, 1.2)
        });
      }
    }

    function palette() {
      const light = document.documentElement.getAttribute("data-theme") === "light";
      return light ? { star: "#475569", trail: "51,65,85" } : { star: "#dbeafe", trail: "255,255,255" };
    }

    function drawStars(animate, dt) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = palette().star;
      for (const s of stars) {
        if (animate) {
          s.x += s.sp * dt;
          if (s.x > w + 2) s.x = -2; // continuous left -> right drift
          s.tw += s.tws * dt;
        }
        const tw = animate ? (0.75 + 0.25 * Math.sin(s.tw)) : 1;
        ctx.globalAlpha = s.a * tw;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawShooting(dt) {
      if (Math.random() < 0.0016 && shooting.length < 2) {
        shooting.push({ x: rand(0, w * 0.5), y: rand(0, h * 0.4), len: rand(80, 160), sp: rand(420, 640), life: 0 });
      }
      for (let i = shooting.length - 1; i >= 0; i--) {
        const sh = shooting[i];
        sh.life += dt;
        sh.x += sh.sp * dt * 0.9;
        sh.y += sh.sp * dt * 0.5;
        const trail = palette().trail;
        const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.len, sh.y - sh.len * 0.55);
        grad.addColorStop(0, "rgba(" + trail + ",0.9)");
        grad.addColorStop(1, "rgba(" + trail + ",0)");
        ctx.globalAlpha = Math.max(0, 1 - sh.life / 1.1);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.len, sh.y - sh.len * 0.55);
        ctx.stroke();
        if (sh.life > 1.1 || sh.x > w + 200) shooting.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      // the 3D universe (scenes3d.js) replaces this star field in the dark theme
      if (document.documentElement.classList.contains("has-space3d")) { raf = null; return; }
      const dt = Math.min((t - last) / 1000, 0.05) || 0;
      last = t;
      drawStars(true, dt);
      drawShooting(dt);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!raf && !prefersReduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    function stop() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    }

    let resizeT;
    window.addEventListener("resize", () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => { size(); if (prefersReduced) drawStars(false, 0); }, 150);
    }, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else start();
    });
    // scenes3d.js hands the background back (light theme): run again
    window.addEventListener("site:starfield", () => { size(); start(); });

    size();
    if (prefersReduced) drawStars(false, 0); else start();
  }

  // ============================================================
  //  REVEAL ON SCROLL
  // ============================================================
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  function observeReveals(root) {
    (root || document).querySelectorAll(".timeline-item, .reveal").forEach(el => {
      if (!el.__revObserved) { el.__revObserved = true; revealObserver.observe(el); }
    });
  }

  // ============================================================
  //  NAV: mobile toggle + scrollspy
  // ============================================================
  function initNav() {
    const toggle = document.getElementById("navToggle");
    const links = document.getElementById("navLinks");

    // Smooth-slide to a #section, accounting for the fixed nav. Uses an explicit
    // "smooth" so it still slides while hands-free mode has CSS smooth disabled.
    const slideToHash = (hash) => {
      if (!hash || hash.charAt(0) !== "#") return;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      const navH = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue("--nav-h"), 10) || 60;
      const top = target.getBoundingClientRect().top + window.scrollY - navH - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: prefersReduced ? "auto" : "smooth" });
    };

    if (toggle && links && !navToggleWired) {
      navToggleWired = true;
      toggle.addEventListener("click", () => {
        const open = links.classList.toggle("open");
        toggle.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      });
      links.querySelectorAll("a").forEach(a => a.addEventListener("click", (e) => {
        const href = a.getAttribute("href") || "";
        if (href.charAt(0) === "#") { e.preventDefault(); slideToHash(href); }
        links.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }));
    }

    // Section button (desktop): hover (or click) opens an expanding header row
    // that pushes the page down — it never floats over the hero. It closes as
    // soon as the pointer leaves both the button and the row.
    const jump = document.getElementById("navJump");
    if (jump && !jump.dataset.wired) {
      jump.dataset.wired = "1";
      if (window.lucide && lucide.createIcons) try { lucide.createIcons(); } catch(e){}
      const jbtn = jump.querySelector(".nav-jump-btn");
      const strip = jump.querySelector(".nav-sec-strip");
      const setOpen = (open) => {
        jump.classList.toggle("is-open", open);
        if (jbtn) jbtn.setAttribute("aria-expanded", open ? "true" : "false");
      };
      // The section icons are always visible now; the button (if present)
      // simply toggles a highlight state for touch + the keyboard 'S' shortcut.
      if (jbtn) jbtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setOpen(!jump.classList.contains("is-open"));
      });
      if (strip) strip.querySelectorAll("a").forEach(a =>
        a.addEventListener("click", (e) => {
          const href = a.getAttribute("href") || "";
          if (href.charAt(0) === "#") { e.preventDefault(); slideToHash(href); }
          setOpen(false);
        }));
      document.addEventListener("click", (e) => {
        if (!jump.contains(e.target)) setOpen(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && jump.classList.contains("is-open")) setOpen(false);
      });
    }

    // "More" menu in the desktop toolbar (secondary sections)
    const more = document.getElementById("navMore");
    if (more && !more.dataset.wired) {
      more.dataset.wired = "1";
      const mbtn = document.getElementById("navMoreBtn");
      const menu = document.getElementById("navMoreMenu");
      const setMore = (open) => {
        menu.hidden = !open; more.classList.toggle("is-open", open);
        mbtn.setAttribute("aria-expanded", open ? "true" : "false");
      };
      mbtn.addEventListener("click", (e) => { e.stopPropagation(); setMore(menu.hidden); });
      if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
        let t = null;
        more.addEventListener("pointerenter", () => { clearTimeout(t); setMore(true); });
        more.addEventListener("pointerleave", () => { clearTimeout(t); t = setTimeout(() => setMore(false), 220); });
      }
      menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMore(false)));
      document.addEventListener("click", (e) => { if (!more.contains(e.target)) setMore(false); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMore(false); });
    }

    // Scrollspy: only set up once, and only when the target sections exist
    // (they are injected asynchronously, so this may run on a later call).
    if (scrollspyWired) return;
    const navMap = {};
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
      navMap[a.getAttribute("href").slice(1)] = a;
    });
    const sections = Object.keys(navMap).map(id => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;
    scrollspyWired = true;

    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          Object.values(navMap).forEach(a => a.classList.remove("active"));
          const a = navMap[e.target.id];
          if (a) a.classList.add("active");
          // desktop toolbar: highlight the matching section (or "More" for secondary ones)
          const id = e.target.id;
          document.querySelectorAll(".nav-sec-strip .nav-sec-main").forEach(x => x.classList.remove("active"));
          document.querySelectorAll(".sec-chips a").forEach(c => {
            const on = c.getAttribute("href") === "#" + id;
            c.classList.toggle("active", on);
            if (on && c.parentNode.scrollWidth > c.parentNode.clientWidth) {
              c.parentNode.scrollTo({ left: c.offsetLeft - 16, behavior: prefersReduced ? "auto" : "smooth" });
            }
          });
          const main = document.querySelector('.nav-sec-strip > a.nav-sec-main[href="#' + id + '"]');
          if (main) main.classList.add("active");
          else if (document.querySelector('#navMoreMenu a[href="#' + id + '"]')) {
            const mb = document.getElementById("navMoreBtn"); if (mb) mb.classList.add("active");
          }
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(s => spy.observe(s));
  }

  // ============================================================
  //  AUTO-CLOSE OPENED ACCORDIONS WHEN SCROLLED OUT OF VIEW
  //  In Education & Experience, once an item is opened, if its revealed
  //  panel scrolls fully out of the viewport it collapses automatically.
  // ============================================================
  const AUTO_CLOSE_SECTIONS = "#education, #experience, #publications, #courses";
  const exitObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting && e.target.classList.contains("open")) {
        const it = e.target.closest(".timeline-item");
        if (it) closeTimelineItem(it);
      }
    });
  }, { threshold: 0 });

  function openTimelineItem(item) {
    if (!item) return;
    const expand = item.querySelector(".timeline-expand");
    const card = item.querySelector(".timeline-card");
    if (!expand || !card) return;
    expand.classList.add("open");
    item.classList.add("open");
    card.setAttribute("aria-expanded", "true");
    // Once the panel has expanded, bring the whole entry into view: center it
    // when it fits, otherwise pin its top just below the nav so the text reads
    // from the start without the user having to scroll.
    const centerDelay = prefersReduced ? 30 : 480; // wait out the max-height transition
    setTimeout(() => {
      if (!item.classList.contains("open")) return;
      const navH = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue("--nav-h"), 10) || 60;
      const vh = window.innerHeight;
      const rect = item.getBoundingClientRect();
      const itemTop = rect.top + window.scrollY;
      const fits = rect.height <= vh - navH - 32;
      let target = fits
        ? itemTop - (vh - rect.height) / 2          // center vertically
        : itemTop - navH - 16;                       // pin near the top
      target = Math.max(0, target);
      window.scrollTo({ top: target, behavior: prefersReduced ? "auto" : "smooth" });
    }, centerDelay);
    // Begin watching only after the open transition, so the panel has real
    // height (observing a 0-height element would fire an immediate close).
    if (item.closest(AUTO_CLOSE_SECTIONS)) {
      setTimeout(() => {
        if (expand.classList.contains("open")) exitObserver.observe(expand);
      }, 420);
    }
  }

  function closeTimelineItem(item) {
    if (!item) return;
    const expand = item.querySelector(".timeline-expand");
    const card = item.querySelector(".timeline-card");
    if (expand) { expand.classList.remove("open"); exitObserver.unobserve(expand); }
    item.classList.remove("open");
    if (card) card.setAttribute("aria-expanded", "false");
  }

  // ============================================================
  //  ACCORDIONS (accessible: keyboard + ARIA + chevron)
  // ============================================================
  let expandCounter = 0;
  function wireAccordions() {
    document.querySelectorAll(".timeline-item").forEach(item => {
      if (item.__wired) return;
      if (item.closest(".is-maintenance")) return;   // leave maintenance posts inert
      item.__wired = true;

      const expand = item.querySelector(".timeline-expand");
      const card = item.querySelector(".timeline-card");
      if (!expand || !card) return;

      item.classList.add("has-expand");
      if (!expand.id) expand.id = "exp-" + (++expandCounter);
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-expanded", "false");
      card.setAttribute("aria-controls", expand.id);

      const toggle = () => {
        const isOpen = expand.classList.contains("open");
        // close any other open items (and stop watching them)
        document.querySelectorAll(".timeline-item.open").forEach(it => {
          if (it !== item) closeTimelineItem(it);
        });
        if (isOpen) closeTimelineItem(item);
        else openTimelineItem(item);
      };

      card.addEventListener("click", e => {
        const t = e.target.tagName.toLowerCase();
        if (["a", "button", "input", "textarea"].includes(t)) return;
        toggle();
      });
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
      expand.addEventListener("click", e => e.stopPropagation());
    });
  }

  // ============================================================
  //  SCROLL-TO-TOP BUTTON ("Back to top")
  // ============================================================
  function setupScrollTopButton() {
    if (document.getElementById("scrollTopBtn")) return;
    const btn = document.createElement("button");
    btn.id = "scrollTopBtn";
    btn.type = "button";
    btn.className = "scroll-top-btn";
    btn.setAttribute("aria-label", "Scroll back to top");
    btn.innerHTML = '<span data-pt="Voltar ao topo">Back to top</span><span aria-hidden="true">&uarr;</span>';
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" }));
    document.body.appendChild(btn);

    const toggle = () => {
      if (window.scrollY > 300) btn.classList.add("show");
      else btn.classList.remove("show");
    };
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
  }

  // ============================================================
  //  HANDS-FREE (NO-SCROLL) MODE
  //  Move the mouse to the top/bottom of the screen to glide the
  //  page up/down — no scroll wheel needed. Toggleable + persisted.
  // ============================================================
  function setupAutoScroll() {
    const btn = document.getElementById("autoScrollToggle");
    if (!btn || btn.dataset.wired) return;
    btn.dataset.wired = "1";

    const KEY = "gpm-autoscroll";
    const ZONE = 0.24;          // desktop: top/bottom 24% bands are active
    const FULL_TRAVERSE_S = 4; // seconds to glide the whole page at full intensity
    // Touch devices have no mouse — drive the scroll by tilting the phone instead.
    const isTouch = window.matchMedia("(hover: none)").matches ||
                    ("ontouchstart" in window && !window.matchMedia("(hover: hover)").matches);
    const mode = isTouch ? "tilt" : "pointer";

    let enabled = false, raf = 0;
    // pointer state
    let pointerInside = false, y = 0;
    // armed = false right after a click-to-section / slide-up: the page just
    // jumped, so we wait for the pointer to leave the active band and come back
    // before gliding again. overNav = pointer is over the top toolbar (no scroll).
    let armed = true, overNav = false;
    // tilt state
    let baseline = null, beta = 0;

    // edge hint bars (show which way the page will move)
    const top = document.createElement("div");
    const bottom = document.createElement("div");
    top.className = "autoscroll-edge autoscroll-edge--top";
    bottom.className = "autoscroll-edge autoscroll-edge--bottom";
    top.innerHTML = "";
    bottom.innerHTML = "";
    document.body.append(top, bottom);

    // describe the gesture appropriately per device
    btn.setAttribute("data-tip", mode === "tilt"
      ? "Tilt the phone forward to go down, back to go up"
      : "Glide the page by moving the mouse to a screen edge  ·  H");

    // testable speed: change live from the console, e.g. handsFreeSpeed(4)
    let traverse = FULL_TRAVERSE_S;
    window.handsFreeSpeed = (sec) => {
      const v = parseFloat(sec);
      if (v > 0) { traverse = v; console.log("[hands-free] full traverse =", v, "s"); }
      return traverse;
    };

    const onMove = (e) => {
      y = e.clientY; pointerInside = true;
      overNav = !!(e.target && e.target.closest && e.target.closest(".nav"));
    };
    const onLeave = () => { pointerInside = false; top.classList.remove("active"); bottom.classList.remove("active"); };
    const onOrient = (e) => {
      if (e.beta == null) return;
      beta = e.beta;
      if (baseline == null) baseline = e.beta; // first reading becomes the neutral hold
    };

    // Clicking a section link or the slide-up button jumps the page; disarm so
    // hands-free won't immediately scroll the pointer's current band.
    document.addEventListener("click", (e) => {
      if (!enabled || !e.target.closest) return;
      if (e.target.closest('a[href^="#"], #scrollTopBtn, .nav-jump-list a, .nav-links a')) armed = false;
    }, true);

    // Time-based scroll: move a constant px-per-SECOND so the speed is uniform
    // regardless of frame rate. A fractional accumulator avoids integer stutter.
    let lastT = 0, acc = 0;
    const curScroll = () => Math.max(document.documentElement.scrollTop, document.body.scrollTop);
    const setScroll = (px) => { document.documentElement.scrollTop = px; document.body.scrollTop = px; };

    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (!lastT) { lastT = t; acc = curScroll(); }
      let dt = (t - lastT) / 1000; lastT = t;
      if (dt > 0.1) dt = 0.1; // clamp hitches / tab switches so it never lurches

      let dir = 0, intensity = 0;
      if (mode === "pointer") {
        const vh = window.innerHeight, band = vh * ZONE;
        const inTop = pointerInside && y < band;
        const inBottom = pointerInside && y > vh - band;
        // Re-arm only once the pointer reaches the neutral middle zone.
        if (!inTop && !inBottom) armed = true;
        // Scroll only when armed and not hovering the top toolbar.
        if (armed && !overNav) {
          if (inTop)         { dir = -1; intensity = (band - y) / band; }
          else if (inBottom) { dir = 1;  intensity = (y - (vh - band)) / band; }
        }
      } else if (baseline != null) {
        // beta is front-to-back tilt. Tilting the top edge away (forward) lowers
        // beta → scroll down; leaning it toward you raises beta → scroll up.
        const d = beta - baseline, DEAD = 5, RANGE = 26;
        if (d < -DEAD)      { dir = 1;  intensity = (-d - DEAD) / (RANGE - DEAD); }
        else if (d > DEAD)  { dir = -1; intensity = (d - DEAD) / (RANGE - DEAD); }
      }
      top.classList.toggle("active", dir === -1);
      bottom.classList.toggle("active", dir === 1);

      // resync if the user scrolled manually (don't fight our own sub-pixel rounding)
      const cur = curScroll();
      if (Math.abs(cur - acc) > 2) acc = cur;

      if (dir !== 0) {
        const range = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        ) - window.innerHeight;
        const eased = Math.pow(Math.min(intensity, 1), 1.6);
        // Velocity gradient: glide faster the closer we get to the end of travel
        // in the current direction (bottom when going down, top when going up).
        // progress 0 at the start edge → 1 at the destination edge.
        const progress = range > 0
          ? (dir === 1 ? acc / range : 1 - acc / range)
          : 0;
        const GRADIENT_MAX = 2.6; // top speed near the end = 2.6× the start speed
        const gradient = 1 + Math.min(Math.max(progress, 0), 1) * (GRADIENT_MAX - 1);
        const speed = (range / Math.max(traverse, 0.2)) * eased * gradient * 0.3; // px per SECOND
        acc = Math.max(0, Math.min(acc + dir * speed * dt, range));
        setScroll(acc);
      }
    }

    function start() {
      if (mode === "pointer") {
        window.addEventListener("mousemove", onMove, { passive: true });
        document.addEventListener("mouseleave", onLeave);
        window.addEventListener("blur", onLeave);
      } else {
        baseline = null; // recalibrate neutral each time it's turned on
        window.addEventListener("deviceorientation", onOrient);
      }
      armed = false; // wait for the pointer to settle in the neutral zone first
      if (!raf) { lastT = 0; raf = requestAnimationFrame(loop); }
    }
    function stop() {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("deviceorientation", onOrient);
      cancelAnimationFrame(raf); raf = 0; lastT = 0;
      top.classList.remove("active"); bottom.classList.remove("active");
      pointerInside = false; baseline = null;
    }

    function apply(on, persist) {
      enabled = on;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      const state = btn.querySelector(".tool-pill-state");
      if (state) state.textContent = on ? "On" : "Off";
      document.body.classList.toggle("autoscroll-on", on);
      document.documentElement.classList.toggle("autoscroll-on", on);
      if (on) start(); else stop();
      if (persist) { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (_) {} }
    }

    // iOS 13+ needs explicit permission for motion, granted from a user gesture.
    async function ensureTiltPermission() {
      try {
        if (typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function") {
          const res = await DeviceOrientationEvent.requestPermission();
          return res === "granted";
        }
      } catch (_) { return false; }
      return true; // other platforms: no explicit permission needed
    }

    btn.addEventListener("click", async () => {
      if (enabled) { apply(false, true); return; }
      if (mode === "tilt") {
        const ok = await ensureTiltPermission();
        if (!ok) return; // permission denied — stay off
      }
      apply(true, true);
    });
    // Esc turns it off quickly (desktop)
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && enabled) apply(false, true); });

    // Off by default: the page never scrolls by itself unless the visitor
    // switches hands-free on (the choice is remembered).
    {
      let saved = null;
      try { saved = localStorage.getItem(KEY); } catch (_) {}
      const on = (saved === "1");
      apply(on, false);
      // Whenever hands-free is active, surface the balloon once per browsing
      // session (so it reliably appears each fresh visit, not only ever-once).
      if (on) showOffHint();
    }

    // Balloon pointing at the toggle: reminds the user they can turn it off.
    // Stays ~3s, or until the user clicks its × close button.
    function showOffHint() {
      try { if (sessionStorage.getItem(KEY + "-hint") === "1") return; } catch (_) {}
      try { sessionStorage.setItem(KEY + "-hint", "1"); } catch (_) {}
      const pt = (document.documentElement.getAttribute("lang") === "pt");
      const tip = document.createElement("div");
      tip.className = "hf-hint";
      tip.setAttribute("role", "status");
      tip.style.cssText =
        "position:fixed;z-index:1300;max-width:236px;padding:10px 12px 10px 14px;border-radius:12px;" +
        "display:flex;align-items:flex-start;gap:8px;" +
        "background:linear-gradient(135deg,var(--accent-strong,#60a5fa),var(--accent,#7dd3fc));" +
        "color:#04203a;font-family:var(--font-body,system-ui),sans-serif;font-size:.84rem;font-weight:600;" +
        "line-height:1.35;box-shadow:0 12px 30px rgba(0,0,0,.4);opacity:0;transform:translateY(-6px);" +
        "transition:opacity .3s ease,transform .3s ease;pointer-events:auto;";

      const msg = document.createElement("span");
      msg.textContent = pt
        ? "Deslocação automática ativada: clique neste botão para a desativar."
        : "Auto-scroll is on: click this button to turn it off.";

      const close = document.createElement("button");
      close.type = "button";
      close.setAttribute("aria-label", pt ? "Fechar" : "Dismiss");
      close.textContent = "×";
      close.style.cssText =
        "flex:0 0 auto;margin:-1px -2px 0 0;width:20px;height:20px;line-height:18px;text-align:center;" +
        "border:0;border-radius:50%;background:rgba(4,32,58,.16);color:#04203a;" +
        "font-size:15px;font-weight:700;cursor:pointer;padding:0;transition:background .2s ease;";
      close.addEventListener("mouseenter", () => { close.style.background = "rgba(4,32,58,.30)"; });
      close.addEventListener("mouseleave", () => { close.style.background = "rgba(4,32,58,.16)"; });

      const arrow = document.createElement("span");
      arrow.style.cssText =
        "position:absolute;bottom:100%;right:22px;border:7px solid transparent;border-bottom-color:var(--accent-strong,#60a5fa);";

      tip.append(arrow, msg, close);
      document.body.appendChild(tip);

      const place = () => {
        const r = btn.getBoundingClientRect();
        tip.style.top = (r.bottom + 10) + "px";
        tip.style.right = Math.max(10, window.innerWidth - r.right) + "px";
      };
      place();
      requestAnimationFrame(() => { tip.style.opacity = "1"; tip.style.transform = "translateY(0)"; place(); });
      // re-place after icons hydrate / layout settles so it stays under the button
      setTimeout(place, 250); setTimeout(place, 700);
      window.addEventListener("resize", place, { passive: true });

      let dismissed = false;
      const dismiss = () => {
        if (dismissed) return; dismissed = true;
        clearTimeout(autoT);
        tip.style.opacity = "0"; tip.style.transform = "translateY(-6px)";
        setTimeout(() => { window.removeEventListener("resize", place); tip.remove(); }, 350);
      };
      close.addEventListener("click", dismiss);
      const autoT = setTimeout(dismiss, 3000);
    }
  }

  // ============================================================
  //  PUBLICATIONS — auto-sync from ORCID (journal articles only)
  // ============================================================
  let publicationsLoaded = false;

  async function loadPublications() {
    if (publicationsLoaded) return;
    publicationsLoaded = true;

    const container = document.getElementById("pub-list");
    if (!container) return;
    const status = document.getElementById("pub-status");
    const setStatus = (msg, pt) => {
      if (!status) return;
      status.dataset.enHtml = msg;            // keep the language switcher in sync
      if (pt) status.setAttribute("data-pt", pt);
      status.innerHTML = currentLang === "pt" && pt ? pt : trLookup(currentLang, msg);
    };
    const clearStatus = () => { if (status) status.remove(); };

    const seenDois = new Set();
    document.querySelectorAll('.timeline-item.publication a[href*="doi.org/"]').forEach(a => {
      const m = a.getAttribute("href").match(/doi\.org\/(.+)$/i);
      if (m) seenDois.add(decodeURIComponent(m[1]).trim().toLowerCase());
    });

    // 1) data/publications.json is refreshed every night by a GitHub Action
    //    (tools/update_publications.py): every paper there has been verified
    //    (author Gustavo P. Maia + chemistry/astrobiology/meteoritics + ORCID/co-author).
    let db = null;
    try {
      const r = await fetch("data/publications.json", { cache: "no-cache" });
      if (r.ok) db = await r.json();
    } catch (e) { db = null; }
    if (db && Array.isArray(db.works)) {
      const normT = t => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const seenTitles = new Set(Array.from(document.querySelectorAll("#publications .timeline-item.publication .timeline-header strong")).map(x => normT(x.textContent)));
      // papers wrongly attributed to me by indexing services (keep in sync with tools/update_publications.py)
      const NOT_MINE = new Set(["10.55905/cuadv16n8-126"]);
      const PREPRINT_DOI = /^10\.(20944|26434|1101|21203|31223|22541|48550|2139|31219|1002\/essoar)\b/i;
      db.works.slice().sort((a, b) => (b.year || 0) - (a.year || 0)).forEach(w => {
        const key = (w.doi || "").toLowerCase();
        if (!key || seenDois.has(key) || w.hidden || NOT_MINE.has(key) || PREPRINT_DOI.test(key) || seenTitles.has(normT(w.title))) return;
        if (!Array.isArray(w.verified) || !w.verified.length) return;   // only papers that passed the nightly checks
        seenTitles.add(normT(w.title));
        seenDois.add(key);
        renderPublication(container, w);
      });
      clearStatus();
      observeReveals(container);
      wireAccordions();
      buildPublicationFilter();
      decoratePublications();
      enrichPublications(db);
      updateMetrics(db);
      applyLang();                       // translate the labels added above
      setupPubCarousel();
      return;
    }

    // 2) no verified list available: the hand-written list stays as it is.
    //    (The browser never adds papers on its own; only the nightly, verified
    //    tools/update_publications.py may add them.)
    clearStatus();
    buildPublicationFilter();
    decoratePublications();
    updateMetrics();
    setupPubCarousel();
  }

  // ============================================================
  //  PUBLICATIONS — a 3D carousel of floating front pages
  //  Each paper is drawn as the first page of an article (journal, title, authors,
  //  abstract), floating in 3D. The axis below is the timeline (newest on the
  //  left). Clicking the page in front shows its abstract, keywords and citation
  //  tools; the list of cards stays in the page, hidden, as the source.
  // ============================================================
  let pubCarousel = null;
  // real first pages (data/paper-covers.json, made by tools/make_cover.py), by DOI
  let pubCovers = {};
  const pubCoversP = fetch("data/paper-covers.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : {})
    .then(c => { pubCovers = c || {}; }).catch(() => {});
  const PUB_TXT = {
    en: { abs: "Abstract", art: "Research article", open: "Click a paper to read it", prev: "Newer paper", next: "Older paper", close: "Close" },
    pt: { abs: "Resumo", art: "Artigo científico", open: "Clique num artigo para o ler", prev: "Artigo mais recente", next: "Artigo anterior", close: "Fechar" },
    fr: { abs: "Résumé", art: "Article de recherche", open: "Cliquez sur un article pour le lire", prev: "Article plus récent", next: "Article plus ancien", close: "Fermer" },
    ja: { abs: "要旨", art: "研究論文", open: "論文をクリックして読む", prev: "新しい論文", next: "古い論文", close: "閉じる" }
  };
  function setupPubCarousel() {
    const sec = document.getElementById("publications");
    const list = sec && sec.querySelector(".timeline");
    if (!list) return;
    const items = Array.from(list.querySelectorAll(".timeline-item.publication"));   // newest first
    if (!items.length) return;
    let stage = sec.querySelector(".pub3d");
    if (!stage) {
      stage = document.createElement("div");
      stage.className = "pub3d";
      stage.innerHTML =
        '<button type="button" class="pub3d-arrow pub3d-arrow--prev" data-dir="-1"><i data-lucide="chevron-left"></i></button>' +
        '<div class="pub3d-stage" tabindex="0"><div class="pub3d-ring"></div></div>' +
        '<button type="button" class="pub3d-arrow pub3d-arrow--next" data-dir="1"><i data-lucide="chevron-right"></i></button>' +
        '<ol class="pub3d-axis"></ol><p class="pub3d-hint"></p>';
      list.parentNode.insertBefore(stage, list);
    }
    list.classList.add("pub-source");
    list.hidden = true;
    const filter = document.getElementById("pub-filter");
    if (filter) filter.hidden = true;                // the axis below replaces the year filter

    const ring = stage.querySelector(".pub3d-ring"), axis = stage.querySelector(".pub3d-axis");
    const hint = stage.querySelector(".pub3d-hint");
    // the zoomed view: the page large on one side, the whole abstract on the other,
    // keywords, citations and citation tools below
    let zoom = document.getElementById("pubZoom");
    if (!zoom) {
      zoom = document.createElement("div");
      zoom.id = "pubZoom"; zoom.className = "pub-zoom"; zoom.hidden = true;
      zoom.setAttribute("role", "dialog"); zoom.setAttribute("aria-modal", "true"); zoom.setAttribute("aria-labelledby", "pubZoomTitle");
      zoom.innerHTML = '<div class="pub-zoom-backdrop"></div><div class="pub-zoom-box">' +
        '<button type="button" class="pub-zoom-close"><i data-lucide="x"></i></button>' +
        '<div class="pub-zoom-grid"><div class="pub-zoom-page"></div><div class="pub-zoom-text"></div></div>' +
        '<div class="pub-zoom-more"></div></div>';
      document.body.appendChild(zoom);
    }
    const T = () => PUB_TXT[currentLang] || PUB_TXT.en;
    const txt = (it, sel) => { const e = it.querySelector(sel); return e ? e.textContent.replace(/\s+/g, " ").trim() : ""; };
    const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
    const info = it => {
      const meta = txt(it, ".timeline-header .meta").split(/\s+·\s+/);
      const absP = Array.from(it.querySelectorAll(".expand-body > p")).find(p => !p.querySelector('a[href*="doi.org/"]'));
      const a = it.querySelector('.expand-body a[href*="doi.org/"]');
      return { title: txt(it, ".timeline-header strong"), authors: meta[0] || "", year: it.dataset.year || meta[1] || "",
               journal: meta.slice(2).join(" · "), abs: absP ? absP.textContent.trim() : "",
               doi: a ? a.getAttribute("href").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") : "" };
    };
    let active = 0, openIdx = -1;
    function render() {
      const t = T();
      ring.innerHTML = items.map((it, i) => {
        const p = info(it);
        const authors = escapeHtml(p.authors).replace(/(Gustavo\s+(?:P\.|Pinho)\s+Maia)/, "<b>$1</b>");
        const cover = pubCovers[String(p.doi).toLowerCase()];
        const src = cover && /^images\/papers\/[\w.-]+\.(webp|png|jpe?g)$/.test(cover.src) ? cover.src : "";
        if (src) {                                   // the page as published (main text blurred)
          return '<button type="button" class="pub-page" data-i="' + i + '" style="--i:' + i + ";--hue:" + hue(p.journal) + '">' +
            '<span class="pub-float"><span class="pub-sheet pub-sheet--img" style="aspect-ratio:' + (+cover.width || 210) + "/" + (+cover.height || 297) + '">' +
            '<img src="' + src + '" alt="" decoding="async"></span></span>' +
            '<span class="pub-shadow" aria-hidden="true"></span></button>';
        }
        return '<button type="button" class="pub-page" data-i="' + i + '" style="--i:' + i + ";--hue:" + hue(p.journal) + '">' +
          '<span class="pub-float"><span class="pub-sheet">' +
            '<span class="pub-sheet-band"><span class="pub-sheet-journal">' + escapeHtml(p.journal) + '</span><span class="pub-sheet-year">' + escapeHtml(p.year) + "</span></span>" +
            '<span class="pub-sheet-kind">' + escapeHtml(t.art) + "</span>" +
            '<span class="pub-sheet-title">' + escapeHtml(p.title) + "</span>" +
            '<span class="pub-sheet-authors">' + authors + "</span>" +
            '<span class="pub-sheet-rule"></span>' +
            '<span class="pub-sheet-abs-h">' + escapeHtml(t.abs) + "</span>" +
            '<span class="pub-sheet-abs">' + escapeHtml(p.abs) + "</span>" +
            (p.doi ? '<span class="pub-sheet-doi">https://doi.org/' + escapeHtml(p.doi) + "</span>" : "") +
          "</span></span><span class=\"pub-shadow\" aria-hidden=\"true\"></span></button>";
      }).join("");
      axis.innerHTML = items.map((it, i) =>
        '<li><button type="button" class="pub3d-dot" data-i="' + i + '"><span class="pub3d-dot-mark"></span><span class="pub3d-dot-year">' +
        escapeHtml(info(it).year) + "</span></button></li>").join("");
      hint.textContent = t.open;
      stage.querySelector(".pub3d-arrow--prev").setAttribute("aria-label", t.prev);
      stage.querySelector(".pub3d-arrow--next").setAttribute("aria-label", t.next);
      ring.querySelectorAll(".pub-page").forEach((b, i) => b.setAttribute("aria-label", info(items[i]).title + " (" + info(items[i]).year + ")"));
      place();
      if (openIdx >= 0) showDetail(openIdx);
    }
    function place() {
      ring.querySelectorAll(".pub-page").forEach((b, i) => {
        const d = i - active, ad = Math.abs(d);
        b.style.setProperty("--d", d); b.style.setProperty("--ad", ad);
        b.classList.toggle("is-active", d === 0);
        b.classList.toggle("is-far", ad > 2);
        b.tabIndex = d === 0 ? 0 : -1;
        b.setAttribute("aria-current", String(d === 0));
      });
      axis.querySelectorAll(".pub3d-dot").forEach((b, i) => b.setAttribute("aria-current", String(i === active)));
      stage.querySelector(".pub3d-arrow--prev").disabled = active === 0;
      stage.querySelector(".pub3d-arrow--next").disabled = active === items.length - 1;
    }
    function go(i) {
      i = Math.max(0, Math.min(items.length - 1, i));
      if (i !== active) { active = i; place(); if (openIdx >= 0 && openIdx !== i) hideDetail(); }
    }
    let lastFocus = null;
    function showDetail(i) {
      const it = items[i], p = info(it), t = T();
      const wasOpen = !zoom.hidden;
      openIdx = i;
      const page = ring.querySelectorAll(".pub-page")[i];
      const sheet = page && page.querySelector(".pub-sheet");
      const box = zoom.querySelector(".pub-zoom-page");
      box.innerHTML = sheet ? sheet.outerHTML : "";
      box.firstElementChild && box.firstElementChild.style.setProperty("--hue", page.style.getPropertyValue("--hue"));
      const body = it.querySelector(".expand-body");
      const paras = body ? Array.from(body.querySelectorAll(":scope > p")).filter(x => !x.querySelector('a[href*="doi.org/"]')) : [];
      zoom.querySelector(".pub-zoom-text").innerHTML =
        '<h3 class="pub-zoom-title" id="pubZoomTitle"></h3><p class="pub-zoom-meta"></p>' +
        '<h4 class="pub-zoom-abs-h"></h4><div class="pub-zoom-abs">' + paras.map(x => "<p>" + x.innerHTML + "</p>").join("") + "</div>";
      zoom.querySelector(".pub-zoom-title").textContent = p.title;
      zoom.querySelector(".pub-zoom-meta").textContent = [p.authors, p.year, p.journal].filter(Boolean).join(" · ");
      zoom.querySelector(".pub-zoom-abs-h").textContent = t.abs;
      const kw = body && body.querySelector(".pub-keywords"), tools = body && body.querySelector(".pub-tools");
      const cites = it.querySelector(".pub-cites"), doi = body && body.querySelector('a[href*="doi.org/"]');
      zoom.querySelector(".pub-zoom-more").innerHTML =
        (kw ? kw.outerHTML : "") +
        '<div class="pub-zoom-cite">' + (cites ? '<span class="pub-zoom-cites">' + cites.innerHTML + "</span>" : "") +
        (doi ? '<a class="pub-zoom-doi" href="' + doi.getAttribute("href") + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(doi.textContent.trim()) + "</a>" : "") +
        "</div>" + (tools ? tools.outerHTML : "");
      zoom.querySelector(".pub-zoom-close").setAttribute("aria-label", t.close);
      if (window.lucide && lucide.createIcons) try { lucide.createIcons(); } catch (e) {}
      fitZoom();
      const im = box.querySelector("img");
      if (im && !im.complete) im.addEventListener("load", fitZoom, { once: true });
      if (wasOpen) return;
      lastFocus = document.activeElement;
      zoom.hidden = false;
      document.body.classList.add("pub-zoom-open");
      fitZoom();                                     // size first, then zoom into that size
      // zoom: the big page grows out of the small one in the carousel
      const big = box.firstElementChild;
      if (big && sheet && !prefersReduced) {
        const a = sheet.getBoundingClientRect(), b = big.getBoundingClientRect();
        big.style.transformOrigin = "0 0";
        big.style.transition = "none";
        big.style.transform = "translate(" + (a.left - b.left) + "px," + (a.top - b.top) + "px) scale(" + (a.width / b.width) + ")";
        zoom.classList.remove("is-in");
        requestAnimationFrame(() => requestAnimationFrame(() => {
          big.style.transition = "transform .55s cubic-bezier(.22,.61,.36,1)";
          big.style.transform = "none";
          zoom.classList.add("is-in");
        }));
      } else zoom.classList.add("is-in");
      zoom.querySelector(".pub-zoom-close").focus({ preventScroll: true });
    }
    // the page grows to the height of the abstract beside it when the abstract is
    // longer (never smaller than its usual size, never wider than about half the box)
    function fitZoom() {
      const grid = zoom.querySelector(".pub-zoom-grid"), page = zoom.querySelector(".pub-zoom-page"),
            text = zoom.querySelector(".pub-zoom-text"), sheet = page && page.firstElementChild;
      if (!grid || !sheet) return;
      grid.style.removeProperty("--zp");
      if (getComputedStyle(grid).gridTemplateColumns.split(" ").length < 2) return;   // one column (phones)
      if (zoom.hidden || !sheet.offsetWidth || !sheet.offsetHeight) return;
      const ratio = sheet.offsetHeight / sheet.offsetWidth, max = grid.clientWidth * 0.56;
      let w = page.offsetWidth;
      for (let k = 0; k < 4; k++) {                  // a wider page narrows the text: settle in a few steps
        const want = Math.min(max, Math.max(w, text.offsetHeight / ratio));
        if (!isFinite(want) || Math.abs(want - w) < 2) break;
        w = want; grid.style.setProperty("--zp", Math.round(w) + "px");
      }
    }
    addEventListener("resize", () => { if (!zoom.hidden) fitZoom(); }, { passive: true });
    function hideDetail() {
      if (zoom.hidden) { openIdx = -1; return; }
      openIdx = -1; zoom.hidden = true; zoom.classList.remove("is-in");
      document.body.classList.remove("pub-zoom-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    if (!stage.dataset.wired) {
      stage.dataset.wired = "1";
      ring.addEventListener("click", e => {
        const b = e.target.closest(".pub-page");
        if (!b) return;
        const i = +b.dataset.i;
        if (i !== active) { go(i); return; }               // a side page comes to the front first
        showDetail(i);
      });
      axis.addEventListener("click", e => { const b = e.target.closest(".pub3d-dot"); if (b) { go(+b.dataset.i); } });
      stage.querySelectorAll(".pub3d-arrow").forEach(a => a.addEventListener("click", () => go(active + +a.dataset.dir)));
      stage.querySelector(".pub3d-stage").addEventListener("keydown", e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault(); go(active + d);
        const f = ring.querySelector(".pub-page.is-active"); if (f) f.focus();
      });
      // swipe on touch screens
      let x0 = null;
      stage.addEventListener("pointerdown", e => { x0 = e.clientX; }, { passive: true });
      stage.addEventListener("pointerup", e => {
        if (x0 == null) return;
        const dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 45) go(active + (dx < 0 ? 1 : -1));
      }, { passive: true });
      // the zoomed view: close with the button, the backdrop or Esc; its citation
      // buttons use the paper's own (hidden) buttons
      zoom.addEventListener("click", e => {
        if (e.target.closest(".pub-zoom-close") || e.target.classList.contains("pub-zoom-backdrop")) { hideDetail(); return; }
        const b = e.target.closest("[data-cite]");
        if (!b || openIdx < 0) return;
        e.stopPropagation();
        const own = items[openIdx].querySelector('.pub-tools [data-cite="' + b.dataset.cite + '"]');
        if (!own) return;
        own.click();
        setTimeout(() => {
          const src = items[openIdx] && items[openIdx].querySelector(".pub-tool-done"), dst = zoom.querySelector(".pub-tool-done");
          if (src && dst) { dst.textContent = src.textContent; setTimeout(() => { dst.textContent = ""; }, 2000); }
        }, 120);
      });
      document.addEventListener("keydown", e => {
        if (zoom.hidden) return;
        if (e.key === "Escape") { e.preventDefault(); hideDetail(); return; }
        if (e.key === "Tab") {                       // keep the focus inside the zoomed view
          const f = Array.from(zoom.querySelectorAll("button, a[href]")).filter(x => x.offsetParent);
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      });
      pathLangUpdates.push(render);
      pathFinders.push({ wrap: stage, open: it => {
        const i = items.indexOf(it);
        if (i < 0) return false;
        stage.scrollIntoView({ behavior: "auto", block: "center" });
        go(i); showDetail(i);
        return true;
      } });
    }
    render();
    pubCoversP.then(() => { if (Object.keys(pubCovers).length) render(); });
    if (window.lucide && lucide.createIcons) try { lucide.createIcons(); } catch (e) {}
    pubCarousel = { open: it => pathFinders.some(f => f.wrap === stage && f.open(it)) };
  }

  // ---- Citation counts, free PDF links and a "Cite" button, from the nightly
  //      data in data/publications.json (OpenAlex + Crossref). Papers without an
  //      entry there are simply left as they are.
  function enrichPublications(db) {
    const byDoi = {};
    (db.works || []).forEach(w => { if (w.doi) byDoi[w.doi.toLowerCase()] = w; });
    document.querySelectorAll("#publications .timeline-item.publication").forEach(it => {
      const a = it.querySelector('a[href*="doi.org/"]');
      const m = a && a.getAttribute("href").match(/doi\.org\/(.+)$/i);
      const w = m && byDoi[decodeURIComponent(m[1]).trim().toLowerCase()];
      if (!w || it.querySelector(".pub-tools")) return;
      const n = +w.cited_by || 0;
      if (n > 0) {
        const c = document.createElement("span");
        c.className = "pub-cites";
        c.innerHTML = "<b>" + n + "</b> " + (n === 1 ? '<span data-pt="citação">citation</span>' : '<span data-pt="citações">citations</span>');
        const year = it.querySelector(".pub-year") || it.querySelector(".timeline-header strong");
        if (year) year.insertAdjacentElement("afterend", c);
      }
      const body = it.querySelector(".expand-body");
      if (!body) return;
      // keywords: the authors' own (publisher page) or OpenAlex's, refreshed nightly
      if (Array.isArray(w.keywords) && w.keywords.length) {
        const kw = document.createElement("div");
        kw.className = "pub-keywords";
        kw.innerHTML = '<span class="pub-kw-label" data-pt="Palavras-chave">Keywords</span>' +
          w.keywords.map(k => '<span class="pub-kw">' + escapeHtml(k) + "</span>").join("");
        body.insertBefore(kw, body.firstChild);
      }
      const tools = document.createElement("div");
      tools.className = "pub-tools";
      tools.innerHTML =
        (w.oa_url && /^https:\/\//.test(w.oa_url)
          ? '<a class="pub-tool" href="' + escapeHtml(w.oa_url) + '" target="_blank" rel="noopener noreferrer"><i data-lucide="file-down"></i><span data-pt="PDF gratuito">Free PDF</span></a>' : "") +
        '<button type="button" class="pub-tool" data-cite="apa"><i data-lucide="quote"></i><span data-pt="Copiar citação (APA)">Copy citation (APA)</span></button>' +
        '<button type="button" class="pub-tool" data-cite="bibtex"><i data-lucide="braces"></i><span>BibTeX</span></button>' +
        '<span class="pub-tool-done" role="status" aria-live="polite"></span>';
      tools.addEventListener("click", e => {
        const b = e.target.closest("[data-cite]");
        if (!b) return;
        e.stopPropagation();
        copyText(b.dataset.cite === "bibtex" ? bibtex(w) : apa(w)).then(ok => {
          const done = tools.querySelector(".pub-tool-done");
          done.textContent = ok ? ({ pt: "Copiado!", fr: "Copié !", ja: "コピーしました" }[currentLang] || "Copied!") : "";
          setTimeout(() => { done.textContent = ""; }, 2200);
        });
      });
      body.appendChild(tools);
    });
    if (window.lucide && lucide.createIcons) try { lucide.createIcons(); } catch (e) {}
  }

  function authorList(w) {
    if (Array.isArray(w.author_list) && w.author_list.length) return w.author_list;
    return String(w.authors || "").split(/,\s*|\s+and\s+/).filter(Boolean).map(full => {
      const p = full.trim().split(/\s+/);
      return { given: p.slice(0, -1).join(" "), family: p.slice(-1)[0] || "" };
    });
  }
  const initials = g => String(g || "").split(/[\s.]+/).filter(Boolean)
    .map(x => x.split("-").map(y => y[0].toUpperCase() + ".").join("-")).join(" ");
  function apa(w) {
    const au = authorList(w).map(a => a.family + (a.given ? ", " + initials(a.given) : ""));
    const names = au.length > 1 ? au.slice(0, -1).join(", ") + ", & " + au[au.length - 1] : (au[0] || "");
    const vol = w.volume ? ", " + w.volume + (w.issue ? "(" + w.issue + ")" : "") : "";
    return names + " (" + (w.year || "n.d.") + "). " + w.title + ". " + (w.journal || "") + vol +
      (w.pages ? ", " + w.pages : "") + ". https://doi.org/" + w.doi;
  }
  function bibtex(w) {
    const first = authorList(w)[0] || { family: "maia" };
    const ascii = s => String(s).normalize("NFD").replace(/[^\x00-\x7f]/g, "");
    const word = (ascii(w.title).toLowerCase().match(/[a-z]{4,}/) || ["paper"])[0];
    const key = ascii(first.family).toLowerCase().replace(/[^a-z]/g, "") + (w.year || "") + word;
    const f = (k, v) => v ? "  " + k + " = {" + v + "},\n" : "";
    return "@article{" + key + ",\n" +
      f("author", authorList(w).map(a => a.family + (a.given ? ", " + a.given : "")).join(" and ")) +
      f("title", w.title) + f("journal", w.journal) + f("year", w.year) + f("volume", w.volume) +
      f("number", w.issue) + f("pages", w.pages) + f("doi", w.doi) + "}";
  }
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(() => true, () => fallback());
    return Promise.resolve(fallback());
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove(); return ok;
    }
  }

  // Add a blue year badge to every publication and order the whole list
  // (static + ORCID-synced) newest-first, matching the site's accent pills.
  function decoratePublications() {
    const wrap = document.querySelector('#publications .timeline');
    if (!wrap) return;
    // Drop preprints entirely — journal versions only, even if a preprint has a DOI.
    wrap.querySelectorAll('.timeline-item.publication').forEach(it => {
      if (isPreprintItem(it)) it.remove();
    });
    const items = Array.from(wrap.querySelectorAll('.timeline-item.publication'));
    items.forEach(it => {
      const meta = it.querySelector('.meta');
      let year = '';
      if (meta) { const m = meta.textContent.match(/\b(?:19|20)\d{2}\b/); if (m) year = m[0]; }
      it.dataset.year = year || '0';
      const strong = it.querySelector('.timeline-header strong');
      if (strong && year && !it.querySelector('.pub-year')) {
        const badge = document.createElement('span');
        badge.className = 'pub-year';
        badge.textContent = year;
        strong.insertAdjacentElement('afterend', badge);
      }
    });
    const anchor = wrap.querySelector('#pub-status') || wrap.querySelector('#pub-list');
    items
      .sort((a, b) => (parseInt(b.dataset.year, 10) || 0) - (parseInt(a.dataset.year, 10) || 0))
      .forEach(it => wrap.insertBefore(it, anchor));
  }

  function renderPublication(container, pub) {
    const metaParts = [pub.authors, pub.year, pub.journal].filter(Boolean).join(" · ");
    const doiUrl = pub.doi ? "https://doi.org/" + encodeURI(pub.doi) : "";
    const item = document.createElement("div");
    item.className = "timeline-item publication";
    item.innerHTML =
      '<div class="timeline-card">' +
        '<div class="timeline-header"><div>' +
          '<strong>' + escapeHtml(pub.title) + '</strong>' +
          '<div class="meta">' + escapeHtml(metaParts) + '</div>' +
        '</div></div>' +
        '<p><em>Click to view abstract</em></p>' +
      '</div>' +
      '<div class="timeline-expand"><div class="expand-body">' +
        (pub.abstract
          ? '<p>' + escapeHtml(pub.abstract) + '</p>'
          : '<p><em>Abstract not available. Open the paper via the DOI link below.</em></p>') +
        (doiUrl
          ? '<p><a href="' + doiUrl + '" target="_blank" rel="noopener noreferrer"><strong>DOI: ' + escapeHtml(pub.doi) + '</strong></a></p>'
          : '') +
      '</div></div>';
    container.appendChild(item);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ============================================================
  //  BUTTON RIPPLE (progressive enhancement, pointer feedback)
  // ============================================================
  function setupButtonRipple() {
    if (rippleWired || prefersReduced) return;
    rippleWired = true;
    document.addEventListener("click", e => {
      const btn = e.target.closest(".btn, .cta-pill, .scroll-top-btn");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const dia = Math.max(rect.width, rect.height);
      const span = document.createElement("span");
      span.className = "btn-ripple";
      span.style.width = span.style.height = dia + "px";
      span.style.left = (e.clientX - rect.left - dia / 2) + "px";
      span.style.top = (e.clientY - rect.top - dia / 2) + "px";
      btn.appendChild(span);
      span.addEventListener("animationend", () => span.remove());
    });
  }

  // ============================================================
  //  LIGHTBOX — click any photo to view the full, uncropped image
  // ============================================================
  function setupLightbox() {
    if (lightboxWired) return;
    lightboxWired = true;

    let overlay, imgEl, capEl, closeBtn, lastFocus;

    function build() {
      overlay = document.createElement("div");
      overlay.className = "lightbox";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-hidden", "true");
      overlay.setAttribute("aria-label", "Image viewer");
      overlay.innerHTML =
        '<button type="button" class="lightbox-close" aria-label="Close image">&times;</button>' +
        '<figure class="lightbox-fig"><img alt=""><figcaption></figcaption></figure>';
      document.body.appendChild(overlay);
      imgEl = overlay.querySelector("img");
      capEl = overlay.querySelector("figcaption");
      closeBtn = overlay.querySelector(".lightbox-close");

      overlay.addEventListener("click", e => {
        if (e.target === overlay || e.target.closest(".lightbox-close")) close();
      });
    }

    function open(src, alt) {
      if (!overlay) build();
      lastFocus = document.activeElement;
      imgEl.src = src;
      imgEl.alt = alt || "";
      const caption = (alt || "").trim();
      capEl.textContent = caption;
      capEl.style.display = caption ? "" : "none";
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (!overlay) return;
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // Capture phase so it fires even though accordions stop click propagation.
    document.addEventListener("click", e => {
      const img = e.target.closest(".expand-gallery img, .avatar-img, .award-cert img");
      if (!img || !img.getAttribute("src")) return;
      e.preventDefault();
      e.stopPropagation();
      open(img.currentSrc || img.src, img.alt);
    }, true);

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && overlay && overlay.classList.contains("open")) close();
    });
  }

  // ============================================================
  //  INIT
  // ============================================================
  // ============================================================
  //  v2 FEATURES
  // ============================================================
  const I18N = {
    nav_news:{en:"News",pt:"Novidades"}, nav_education:{en:"Education",pt:"Educação"},
    nav_highlights:{en:"Highlights",pt:"Destaques"}, nav_awards:{en:"Awards",pt:"Prémios"},
    nav_experience:{en:"Experience",pt:"Experiência"}, nav_presentations:{en:"Presentations",pt:"Apresentações"},
    nav_funding:{en:"Funding",pt:"Financiamento"}, nav_publications:{en:"Publications",pt:"Publicações"},
    nav_tree:{en:"Tree",pt:"Árvore"}, nav_map:{en:"Map",pt:"Mapa"}, nav_blog:{en:"Blog",pt:"Blog"}, nav_tutoring:{en:"Tutoring",pt:"Explicações"}, nav_courses:{en:"Courses",pt:"Cursos"},
    nav_research:{en:"Research",pt:"Investigação"}, nav_skills:{en:"Skills",pt:"Competências"}, nav_more:{en:"More",pt:"Mais"},
    role:{en:"PhD Researcher in Chemistry · Astrobiology",pt:"Investigador de Doutoramento em Química · Astrobiologia"},
    bio:{en:"My research explores the origins and evolution of life in the universe, using chemistry to uncover the processes that may have led to life's emergence. A key focus is mechanochemistry: chemical reactions driven by mechanical forces. I investigate how mechanical energy, from parent-body formation, asteroid gardening, or meteorite impacts, could have promoted the synthesis and transformation of organic molecules on the early Earth and other planetary bodies, revealing alternative pathways for prebiotic chemistry under extreme and extraterrestrial environments.",
         pt:"A minha investigação explora as origens e a evolução da vida no universo, usando a química para desvendar os processos que poderão ter conduzido ao surgimento da vida. Um foco central é a mecanoquímica: reações químicas impulsionadas por forças mecânicas. Investigo como a energia mecânica, da formação de corpos progenitores, do asteroid gardening ou de impactos de meteoritos, poderá ter promovido a síntese e a transformação de moléculas orgânicas na Terra primitiva e noutros corpos planetários, revelando vias alternativas para a química prebiótica em ambientes extremos e extraterrestres."},
    tag1:{en:"Mechanochemistry",pt:"Mecanoquímica"}, tag2:{en:"Prebiotic Chemistry",pt:"Química Prebiótica"},
    tag3:{en:"Astrobiology",pt:"Astrobiologia"}, tag4:{en:"Origin of Life",pt:"Origem da Vida"},
    m_pubs:{en:"Publications",pt:"Publicações"}, m_talks:{en:"Talks & posters",pt:"Comunicações"},
    m_areas:{en:"Research areas",pt:"Áreas de investigação"}, m_hindex:{en:"h-index",pt:"índice h"}, cv:{en:"Download CV",pt:"Descarregar CV"},
    affiliated:{en:"Affiliated with",pt:"Afiliações"},
    opento:{en:"Open to postdoctoral positions from 2027",pt:"Disponível para posições de pós-doutoramento a partir de 2027"}
  };
  const HEADINGS = {
    "Education":"Educação", "Experience":"Experiência", "Presentations":"Apresentações",
    "Funding":"Financiamento", "Publications":"Publicações", "Academic Tree":"Árvore Académica",
    "News":"Novidades", "Where I have been":"Por onde andei",
    "Current Work Interests":"Interesses de Trabalho Atuais", "Awards":"Prémios", "Courses & Formations":"Cursos e Formações"
  };

  // Section heading icons (Lucide)
  function injectHeadingIcons() {
    const ICONS = { highlights:"sparkles", news:"newspaper", education:"graduation-cap", experience:"briefcase", courses:"book-marked",
      presentations:"presentation", funding:"banknote", publications:"book-open",
      awards:"award", tree:"git-fork", blog:"pen-line", map:"map-pin", tutoring:"flask-conical" };
    document.querySelectorAll(".section > h2").forEach(h => {
      if (h.querySelector(".h2-label")) return;
      const sec = h.closest("section"); const id = sec ? sec.id : "";
      const txt = h.textContent.trim();
      h.textContent = "";
      if (ICONS[id]) {
        const i = document.createElement("i");
        i.className = "h2-ico"; i.setAttribute("data-lucide", ICONS[id]);
        h.appendChild(i);
      }
      const span = document.createElement("span");
      span.className = "h2-label"; span.textContent = txt;
      h.appendChild(span);
    });
    if (window.lucide) try { lucide.createIcons(); } catch(e){}
  }

  // Language
  function trLookup(lang, enHtml) {
    if (lang === "en") return enHtml;
    var key = String(enHtml).replace(/\s+/g, " ").trim();
    var d = (window.TR && window.TR[lang]) || null;
    return (d && d[key] != null) ? d[key] : enHtml;
  }
  function applyLang() {
    const lang = currentLang;
    if ((lang === "fr" || lang === "ja") && !(window.TR && window.TR[lang] && Object.keys(window.TR[lang]).length)) {
      ensureTR(lang).then(() => { if (currentLang === lang) applyLang(); });
      return;
    }
    // Keep the address bar and canonical link in step with the language.
    try {
      const url = new URL(location.href);
      if (lang === "en") url.searchParams.delete("lang"); else url.searchParams.set("lang", lang);
      if (url.href !== location.href) history.replaceState(history.state, "", url.href);
      const canon = document.querySelector('link[rel="canonical"]');
      if (canon) canon.href = "https://gustavopmaia98.github.io/GustavoPMaia/" + (lang === "en" ? "" : "?lang=" + lang);
    } catch (e) {}
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const t = I18N[el.getAttribute("data-i18n")];
      if (t) el.textContent = (lang === "en") ? t.en : (t[lang] || trLookup(lang, t.en));
    });
    document.querySelectorAll(".h2-label").forEach(s => {
      if (!s.dataset.en) s.dataset.en = s.textContent.trim();
      const en = s.dataset.en;
      s.textContent = (lang === "pt" && HEADINGS[en]) ? HEADINGS[en] : trLookup(lang, en);
    });
    document.querySelectorAll("[data-pt]").forEach(el => {
      if (el.dataset.enHtml === undefined) el.dataset.enHtml = el.innerHTML;
      el.innerHTML = (lang === "pt") ? el.dataset.pt : trLookup(lang, el.dataset.enHtml);
    });
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("data-lang", lang);
    document.querySelectorAll("#langPop .lang-opt").forEach(b => {
      const on = b.dataset.lang === lang;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
    // icon tooltips / accessible names follow the visible (translated) labels
    document.querySelectorAll(".nav-sec-main").forEach(el => {
      const l = el.querySelector(".nav-sec-label");
      if (l) el.setAttribute("data-tip", l.textContent.trim());
    });
    document.querySelectorAll("[data-i18n-filter]").forEach(b => {
      const key = b.getAttribute("data-i18n-filter");
      const en = { all: "All", oral: "Oral", poster: "Poster" }[key];
      const pt = { all: "Todos", oral: "Oral", poster: "Póster" }[key];
      if (en) b.textContent = (lang === "pt") ? pt : trLookup(lang, en);
    });
    if (typeof mapLangUpdate === "function") mapLangUpdate(lang);
    if (typeof pathLangUpdate === "function") pathLangUpdate();
  }
  function setupLangToggle() {
    const btn = document.getElementById("langToggle");
    const pop = document.getElementById("langPop");
    if (btn && pop && !langWired) {
      langWired = true;
      const open = o => { pop.hidden = !o; btn.setAttribute("aria-expanded", o ? "true" : "false"); };
      btn.addEventListener("click", e => { e.stopPropagation(); open(pop.hidden); });
      // Open automatically on hover; close shortly after the pointer leaves.
      const menu = document.getElementById("langMenu");
      let hideT = null;
      if (menu && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
        const cancelHide = () => { if (hideT) { clearTimeout(hideT); hideT = null; } };
        menu.addEventListener("pointerenter", () => { cancelHide(); open(true); });
        menu.addEventListener("pointerleave", () => { cancelHide(); hideT = setTimeout(() => open(false), 260); });
      }
      pop.querySelectorAll(".lang-opt").forEach(b => {
        b.addEventListener("click", () => {
          currentLang = b.dataset.lang;
          try { localStorage.setItem("lang", currentLang); } catch (e) {}
          applyLang();
          open(false);
        });
      });
      document.addEventListener("click", e => { if (!e.target.closest("#langMenu")) open(false); });
      document.addEventListener("keydown", e => { if (e.key === "Escape") open(false); });
    }
    applyLang();
  }

  // Theme
  function setupThemeToggle() {
    const btn = document.getElementById("themeToggle");
    if (!btn || btn.__wired) return;
    btn.__wired = true;
    const setIcon = () => {
      const dark = document.documentElement.getAttribute("data-theme") !== "light";
      btn.innerHTML = '<i data-lucide="' + (dark ? "sun" : "moon") + '"></i>';
      if (window.lucide) try { lucide.createIcons(); } catch(e){}
    };
    setIcon();
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch(e){}
      setIcon();
    });
  }

  // Scroll progress
  function setupScrollProgress() {
    if (progressWired) return;
    const bar = document.getElementById("scrollProgress");
    if (!bar) return;
    progressWired = true;
    const upd = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = max > 0 ? (h.scrollTop / max * 100) + "%" : "0%";
    };
    window.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  }

  // Publication year filter + metrics
  function buildPublicationFilter() {
    const wrap = document.getElementById("pub-filter");
    if (!wrap) return;
    const pubs = Array.prototype.slice.call(document.querySelectorAll("#publications .timeline-item.publication"));
    if (!pubs.length) return;
    const years = new Set();
    pubs.forEach(p => {
      const meta = p.querySelector(".meta");
      const y = ((meta && meta.textContent) || "").match(/\b(?:19|20)\d{2}\b/);
      if (y) { p.dataset.year = y[0]; years.add(y[0]); }
    });
    const sorted = Array.prototype.slice.call(years).sort((a, b) => b - a);
    wrap.innerHTML = "";
    const mk = (label, val) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; b.dataset.val = val;
      b.addEventListener("click", () => {
        wrap.querySelectorAll("button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        pubs.forEach(p => p.classList.toggle("pub-hidden", val !== "all" && p.dataset.year !== val));
      });
      return b;
    };
    const all = mk(currentLang === "pt" ? "Todos" : (window.TR && (currentLang==="fr"||currentLang==="ja") ? (window.TR[currentLang]["All"]||"All") : "All"), "all");
    all.dataset.i18nFilter = "all";
    all.classList.add("active");
    wrap.appendChild(all);
    sorted.forEach(y => wrap.appendChild(mk(y, y)));
  }

  // Presentation type filter (All / Oral / Poster) — mirrors the publication filter,
  // reusing the .pub-filter styling and the .pub-hidden show/hide mechanism.
  function buildPresentationFilter() {
    const wrap = document.getElementById("preso-filter");
    if (!wrap) return;
    const items = Array.prototype.slice.call(
      document.querySelectorAll("#presentations .timeline-item[data-type]")
    );
    if (!items.length) return;

    const types = [];
    items.forEach(it => { const t = it.dataset.type; if (t && types.indexOf(t) === -1) types.push(t); });

    const LABELS = {
      all:    { en: "All",    pt: "Todos" },
      oral:   { en: "Oral",   pt: "Oral" },
      poster: { en: "Poster", pt: "Póster" }
    };
    const label = key => (LABELS[key] && (LABELS[key][currentLang] || LABELS[key].en)) || key;

    wrap.innerHTML = "";
    const mk = key => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label(key); b.dataset.val = key; b.dataset.i18nFilter = key;
      b.addEventListener("click", () => {
        wrap.querySelectorAll("button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        items.forEach(it => it.classList.toggle("pub-hidden", key !== "all" && it.dataset.type !== key));
      });
      return b;
    };
    const all = mk("all"); all.classList.add("active"); wrap.appendChild(all);
    types.forEach(t => wrap.appendChild(mk(t)));
  }

  // A publication entry counts as a PREPRINT — and is excluded from the headline
  // "Publications" number, though it still appears in the list — when it is
  // explicitly marked (class "preprint" or data-type="preprint") OR its venue /
  // DOI matches a known preprint server.
  function isPreprintItem(it) {
    if (it.classList.contains("preprint")) return true;
    if ((it.dataset.type || "").toLowerCase() === "preprint") return true;
    const meta = (it.querySelector(".meta") || {}).textContent || "";
    const title = (it.querySelector("strong") || {}).textContent || "";
    const doiA = it.querySelector('a[href*="doi.org/"]');
    const doi = doiA ? (doiA.getAttribute("href") || "") : "";
    const hay = (meta + " " + title + " " + doi).toLowerCase();
    if (/pre-?print|posted-content|arxiv|chemrxiv|biorxiv|medrxiv|ssrn|research\s*square|preprints?\.org|authorea|eartharxiv|essoar|\bosf\b/.test(hay)) return true;
    // Known preprint DOI registrant prefixes (ChemRxiv, Research Square, bioRxiv/
    // medRxiv, EarthArXiv, OSF, Authorea, Preprints.org)
    if (/10\.(26434|21203|1101|31223|31219|22541|20944)\//.test(doi)) return true;
    return false;
  }

  // The intro numbers count what is on the page, so they never go stale:
  // papers (preprints excluded), talks & posters, research areas (the tags).
  function updateMetrics(db) {
    const set = (key, n) => { const el = document.querySelector('[data-metric="' + key + '"]'); if (el && n) el.textContent = n; };
    let pubs = 0;
    document.querySelectorAll("#publications .timeline-item.publication").forEach(it => {
      if (!isPreprintItem(it)) pubs++;   // preprints shown in the list but not counted
    });
    set("pubs", pubs);
    set("talks", document.querySelectorAll("#presentations .timeline-item").length);
    set("areas", document.querySelectorAll(".hero-tags > span").length);
    // h-index refreshed every night from OpenAlex (data/publications.json)
    const m = db && db.metrics;
    if (m && m.h_index) {
      set("hindex", m.h_index);
      const link = document.querySelector('[data-metric="hindex"]').closest("a");
      if (link && m.profile) {
        link.href = m.profile;
        link.title = "h-index · " + m.citations + " citations (OpenAlex)";
      }
    }
  }

  // Presentation map (Leaflet)
  function initPresoMap() {
    if (mapWired) return;
    const el = document.getElementById("presoMap");
    if (!el) return;
    mapWired = true;

    const EDU  = "#34d399";  // studies / education
    const LAB  = "#22d3ee";  // laboratories / research
    const PRES = "#fbbf24";  // oral / poster presentations
    const COU  = "#a78bfa";  // courses / training schools

    const education = [
      { n:"Instituto Superior Técnico, Lisbon", c:[38.7369,-9.1366], d:"MSc in Chemistry (2020–2022) · PhD in Chemistry / Astrobiology (2023–present)",
        pt:{ n:"Instituto Superior Técnico, Lisboa", d:"Mestrado em Química (2020–2022) · Doutoramento em Química / Astrobiologia (2023–presente)" } },
      { n:"Universidade da Beira Interior, Covilhã", c:[40.2784,-7.5046], d:"BSc in Industrial Chemistry (2017–2020)",
        pt:{ d:"Licenciatura em Química Industrial (2017–2020)" } },
      { n:"Escola Profissional de Espinho (ESPE)", c:[41.0073,-8.6415], d:"Mechatronics Technician, Level IV (2013–2016)",
        pt:{ d:"Técnico de Mecatrónica, Nível IV (2013–2016)" } }
    ];
    const labs = [
      { n:"CQE · Instituto Superior Técnico, Lisbon", c:[38.7369,-9.1366], d:"PhD researcher · Invited teaching assistant",
        pt:{ n:"CQE · Instituto Superior Técnico, Lisboa", d:"Investigador de doutoramento · Assistente convidado" } },
      { n:"IMPMC · MNHN, Paris", c:[48.8443,2.3562], d:"Visiting Scientist (2025–present)",
        pt:{ d:"Cientista Visitante (2025–presente)" } },
      { n:"NASA Goddard Space Flight Center, Greenbelt MD", c:[38.9961,-76.8483], d:"Visiting Scientist (2024)",
        pt:{ d:"Cientista Visitante (2024)" } },
      { n:"Universidade da Beira Interior, Covilhã", c:[40.2784,-7.5046], d:"Research intern (2020)",
        pt:{ d:"Estagiário de investigação (2020)" } }
    ];
    const pres = [
      { n:"Lisbon, Portugal", c:[38.7369,-9.1366], d:"EANA 2025 (poster · award) · AbGradE’25 · NInTec 2024 · EuChemS ECC8 2022 · IST PhD Open Days 2024 · CQE Days 2022",
        pt:{ n:"Lisboa, Portugal", d:"EANA 2025 (póster · prémio) · AbGradE’25 · NInTec 2024 · EuChemS ECC8 2022 · IST PhD Open Days 2024 · CQE Days 2022" } },
      { n:"Paris, France", pt:{ n:"Paris, França" }, c:[48.8443,2.3562], d:"IPGP “Small Bodies Day” 2025 · IMPMC PhD Students’ Day 2025" },
      { n:"Reykjavik, Iceland", c:[64.1466,-21.9426], d:"BEACON 2025 (oral)",
        pt:{ n:"Reiquiavique, Islândia", d:"BEACON 2025 (comunicação oral)" } },
      { n:"Covilhã, Portugal", c:[40.2784,-7.5046], d:"XV CICS-UBI Symposium 2020 (poster)",
        pt:{ d:"Simpósio XV CICS-UBI 2020 (póster)" } }
    ];
    const courses = [
      { n:"Marseille, France", c:[43.2965,5.3698], d:"Origins Institute Summer School 2026: Building the Hard Rocky Planets (Institut Origines · IPGP)",
        pt:{ n:"Marselha, França", d:"Escola de Verão do Origins Institute 2026: Construir os Planetas Rochosos (Institut Origines · IPGP)" } },
      { n:"Le Teich, France", c:[44.6367,-1.0203], d:"RED Astrobiology Introductory Course 2025 (in person)",
        pt:{ n:"Le Teich, França", d:"Curso Introdutório de Astrobiologia RED 2025 (presencial)" } }
    ];

    // Shown on the 3D globe by scenes3d.js (window.SiteGlobeData), which also
    // draws arcs along the career path below.
    const tip = (n, label, color, d) =>
      '<strong>' + n + '</strong><br><span style="color:' + color + ';font-weight:600">' + label + '</span><br>' + d;
    // Tooltip text follows the language: PT from each entry's "pt" object,
    // FR/JA from the translations.js dictionary (English kept when no translation).
    const MAP_PT = { "Studies":"Estudos", "Presentations":"Apresentações",
                     "Courses / training":"Cursos / formação", "Laboratory / research":"Laboratório / investigação" };
    const loc = (lang, en, pt) => lang === "pt" ? (pt || en) : trLookup(lang, en);
    const tipFor = (p, label, color, lang) => tip(loc(lang, p.n, p.pt && p.pt.n), loc(lang, label, MAP_PT[label]), color, loc(lang, p.d, p.pt && p.pt.d));
    const places = [];
    const place = (arr, color, label) => arr.forEach(p => places.push({
      lat: p.c[0], lng: p.c[1], color: color, html: lang => tipFor(p, label, color, lang)
    }));
    place(labs,      LAB,  "Laboratory / research");
    place(education, EDU,  "Studies");
    place(pres,      PRES, "Presentations");
    place(courses,   COU,  "Courses / training");

    // Legend (text follows the current language)
    const legendText = lang => {
      if (lang === "pt") return ['Estudos (ESPE · UBI · Técnico)', 'Laboratórios e investigação', 'Comunicações orais e painéis', 'Cursos e escolas de formação'];
      return ['Studies (ESPE · UBI · Técnico)', 'Laboratories &amp; research', 'Oral &amp; poster presentations', 'Courses &amp; training schools']
        .map(s => trLookup(lang, s.replace(/&amp;/g, '&')));
    };
    const legendHTML = lang => {
      const t = legendText(lang);
      return '<span class="dot" style="background:' + EDU  + '"></span>' + t[0] + '<br>' +
             '<span class="dot" style="background:' + LAB  + '"></span>' + t[1] + '<br>' +
             '<span class="dot" style="background:' + PRES + '"></span>' + t[2] + '<br>' +
             '<span class="dot" style="background:' + COU  + '"></span>' + t[3];
    };
    // career path, in order: Espinho -> Covilhã -> Lisbon -> Greenbelt -> Paris
    const path = [
      { lat: 41.0073, lng: -8.6415 }, { lat: 40.2784, lng: -7.5046 }, { lat: 38.7369, lng: -9.1366 },
      { lat: 38.9961, lng: -76.8483 }, { lat: 48.8443, lng: 2.3562 }
    ];
    // buttons under the globe: each turns the globe to that place (career order first)
    const city = (en, pt, lat, lng, color) => ({ lat: lat, lng: lng, color: color, name: lang => loc(lang, en, pt) });
    const cities = [
      city("Espinho", null, 41.0073, -8.6415, EDU), city("Covilhã", null, 40.2784, -7.5046, EDU),
      city("Lisbon", "Lisboa", 38.7369, -9.1366, LAB), city("Greenbelt, USA", "Greenbelt, EUA", 38.9961, -76.8483, LAB),
      city("Paris", null, 48.8443, 2.3562, LAB), city("Reykjavik", "Reiquiavique", 64.1466, -21.9426, PRES),
      city("Marseille", "Marselha", 43.2965, 5.3698, COU), city("Le Teich", null, 44.6367, -1.0203, COU)
    ];
    window.SiteGlobeData = { places: places, legendHTML: legendHTML, path: path, cities: cities };
    window.dispatchEvent(new CustomEvent("site:globe-data", { detail: window.SiteGlobeData }));
    // safety net: if the 3D module never starts (old browser, blocked script), list the places
    setTimeout(() => {
      if (el.dataset.globe) return;
      el.classList.add("globe-fallback");
      el.innerHTML = '<ul class="globe-list">' + places.map(p =>
        '<li><span class="dot" style="background:' + p.color + '"></span>' + p.html(currentLang) + "</li>").join("") + "</ul>";
    }, 8000);
    mapLangUpdate = lang => window.dispatchEvent(new CustomEvent("site:lang", { detail: lang }));
  }

  // Performance: lazy-load below-the-fold images
  function setupLazyImages() {
    document.querySelectorAll("img:not([loading]):not(.avatar-img)").forEach(img => {
      img.loading = "lazy";
      img.decoding = "async";
    });
  }

  // ============================================================
  //  ACADEMIC TREE — click-and-drag to pan the wide canvas
  // ============================================================
  function setupTreePan() {
    const wrap = document.querySelector(".at-wrap");
    if (!wrap || wrap.__panWired) return;
    wrap.__panWired = true;

    // When the tree is wider than the screen (phones), start centred on me rather
    // than at its far-left edge, so the first thing seen is the focal card.
    const centreOnSelf = () => {
      const self = wrap.querySelector(".at-self");
      if (!self || wrap.scrollWidth <= wrap.clientWidth) return;
      const w = wrap.getBoundingClientRect(), s = self.getBoundingClientRect();
      wrap.scrollLeft += (s.left + s.width / 2) - (w.left + w.width / 2);
    };
    requestAnimationFrame(centreOnSelf);

    let down = false, moved = false, startX = 0, startLeft = 0;
    wrap.classList.add("at-grab");

    wrap.addEventListener("pointerdown", e => {
      // ignore drags that begin on a link/button so clicks still work
      if (e.target.closest("a, button")) return;
      down = true; moved = false;
      startX = e.clientX; startLeft = wrap.scrollLeft;
      wrap.classList.add("at-grabbing");
    });
    wrap.addEventListener("pointermove", e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      wrap.scrollLeft = startLeft - dx;
    });
    const end = () => { down = false; wrap.classList.remove("at-grabbing"); };
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointerleave", end);
    // swallow the click that follows a real drag so links don't fire
    wrap.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  }

  // ============================================================
  //  CAROUSEL — generic; clickable cards, arrows, dots, drag/swipe.
  //  Works for any [data-carousel] (news, highlights, …).
  // ============================================================
  function wireCarousel(root) {
    if (!root || root.__wired) return;
    const track = root.querySelector("[data-carousel-track]");
    if (!track) return;
    const slides = Array.from(track.children);
    if (!slides.length) return;
    const vp = root.querySelector("[data-carousel-viewport]");
    const prev = root.querySelector("[data-carousel-prev]");
    const next = root.querySelector("[data-carousel-next]");
    const pager = root.querySelector("[data-carousel-pager]") ||
      (root.parentElement && root.parentElement.querySelector("[data-carousel-pager]"));
    root.__wired = true;

    let i = 0;
    const n = slides.length;
    const clamp = x => (x + n) % n;

    // build dots
    let dots = [];
    if (pager) {
      pager.innerHTML = "";
      dots = slides.map((_, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Slide " + (idx + 1));
        b.addEventListener("click", () => go(idx));
        pager.appendChild(b);
        return b;
      });
    }

    function render(animate) {
      track.classList.toggle("no-anim", !animate);
      track.style.transform = "translateX(" + (-i * 100) + "%)";
      dots.forEach((d, idx) => d.classList.toggle("active", idx === i));
    }
    function go(idx, silent) {
      i = clamp(idx); render(true);
      if (!silent) root.dispatchEvent(new CustomEvent("carousel:go", { detail: { index: i } }));
    }
    root.__carouselGoTo = (idx) => go(idx, true);
    function step(d) { go(i + d); }

    if (prev) prev.addEventListener("click", () => step(-1));
    if (next) next.addEventListener("click", () => step(1));

    // keyboard when carousel has focus
    root.setAttribute("tabindex", "0");
    root.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    });

    // drag / swipe
    let down = false, moved = false, x0 = 0;
    vp.addEventListener("pointerdown", e => {
      down = true; moved = false; x0 = e.clientX;
      track.classList.add("no-anim");
    });
    vp.addEventListener("pointermove", e => {
      if (!down) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 4) moved = true;
      track.style.transform = "translateX(calc(" + (-i * 100) + "% + " + dx + "px))";
    });
    function release(e) {
      if (!down) return;
      down = false;
      const dx = (e.clientX || x0) - x0;
      const threshold = vp.clientWidth * 0.18;
      if (dx <= -threshold) step(1);
      else if (dx >= threshold) step(-1);
      else render(true);
    }
    vp.addEventListener("pointerup", release);
    vp.addEventListener("pointercancel", release);
    vp.addEventListener("pointerleave", release);
    // suppress the click after a real drag so cards don't open
    vp.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);

    // ---- autoplay: advance every few seconds, pause on interaction ----
    const DELAY = parseInt(root.getAttribute("data-autoplay") || "6000", 10);
    let timer = null;
    const canAuto = n > 1 && DELAY > 0 && !prefersReduced;
    function startAuto() {
      if (!canAuto || timer) return;
      timer = setInterval(() => step(1), DELAY);
    }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }
    function restartAuto() { stopAuto(); startAuto(); }
    if (canAuto) {
      // pause while the user is hovering, focused, or dragging; resume after
      root.addEventListener("pointerenter", stopAuto);
      root.addEventListener("pointerleave", startAuto);
      root.addEventListener("focusin", stopAuto);
      root.addEventListener("focusout", startAuto);
      vp.addEventListener("pointerdown", stopAuto);
      vp.addEventListener("pointerup", restartAuto);
      // any manual nav resets the timer so it doesn't jump right after a click
      [prev, next].forEach(b => b && b.addEventListener("click", restartAuto));
      dots.forEach(d => d.addEventListener("click", restartAuto));
      // pause when the carousel scrolls out of view, resume when back
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(es => es.forEach(en => en.isIntersecting ? startAuto() : stopAuto()),
          { threshold: 0.25 }).observe(root);
      } else {
        startAuto();
      }
    }

    render(false);
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  }

  function setupCarousels() {
    document.querySelectorAll("[data-carousel]").forEach(wireCarousel);
    // Coordinate paired carousels inside a .tech-duo so they move together.
    document.querySelectorAll(".tech-duo").forEach(duo => {
      const cars = Array.from(duo.querySelectorAll("[data-carousel]"));
      if (cars.length < 2) return;
      cars.forEach(src => src.addEventListener("carousel:go", e => {
        cars.forEach(other => {
          if (other !== src && other.__carouselGoTo) other.__carouselGoTo(e.detail.index);
        });
      }));
    });
  }

  // ============================================================
  //  HIGHLIGHT DETAIL MODAL — click a highlight → pop-up detail
  // ============================================================
  // Navigate to the Publications section and open the paper matching a DOI
  function openPublication(doi) {
    if (!doi) return;
    const norm = String(doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase();
    let target = null;
    document.querySelectorAll('.timeline-item.publication a[href*="doi.org/"]').forEach(a => {
      const m = a.getAttribute("href").match(/doi\.org\/(.+)$/i);
      if (m && decodeURIComponent(m[1]).trim().toLowerCase() === norm) target = a.closest(".timeline-item");
    });
    if (target && pubCarousel && pubCarousel.open(target)) return;   // shown in the 3D carousel
    const sec = document.getElementById("publications");
    if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
    if (target) {
      document.querySelectorAll(".timeline-item.open").forEach(it => { if (it !== target) closeTimelineItem(it); });
      setTimeout(() => {
        openTimelineItem(target);
        target.classList.add("pub-flash");
        setTimeout(() => target.classList.remove("pub-flash"), 1600);
      }, 520);
    }
  }

  // ============================================================
  //  3D MOLECULE VIEWER (3Dmol.js, loaded only when first needed)
  //  Ribonucleoside -> nucleobase + ribose, as in the mechanochemistry papers.
  //  Structures: RDKit-embedded, MMFF-optimised geometries (data/molecules).
  // ============================================================
  const MOL_TXT = {
    en: { h:"Explore the molecules in 3D", hint:"Drag to rotate · scroll or pinch to zoom", arrow:"mechanochemistry<br>(Ni²⁺ · CO₃²⁻)",
          G:"Guanosine", g:"Guanine + ribose", U:"Uridine", u:"Uracil + ribose", load:"Loading 3D viewer…", fail:"The 3D viewer could not be loaded." },
    pt: { h:"Explore as moléculas em 3D", hint:"Arraste para rodar · deslize ou aproxime os dedos para ampliar", arrow:"mecanoquímica<br>(Ni²⁺ · CO₃²⁻)",
          G:"Guanosina", g:"Guanina + ribose", U:"Uridina", u:"Uracilo + ribose", load:"A carregar o visualizador 3D…", fail:"Não foi possível carregar o visualizador 3D." },
    fr: { h:"Explorez les molécules en 3D", hint:"Faites glisser pour pivoter · défilez ou pincez pour zoomer", arrow:"mécanochimie<br>(Ni²⁺ · CO₃²⁻)",
          G:"Guanosine", g:"Guanine + ribose", U:"Uridine", u:"Uracile + ribose", load:"Chargement du visualiseur 3D…", fail:"Le visualiseur 3D n'a pas pu être chargé." },
    ja: { h:"分子を3Dで見る", hint:"ドラッグで回転 · スクロールまたはピンチで拡大", arrow:"メカノケミストリー<br>(Ni²⁺ · CO₃²⁻)",
          G:"グアノシン", g:"グアニン + リボース", U:"ウリジン", u:"ウラシル + リボース", load:"3Dビューアを読み込み中…", fail:"3Dビューアを読み込めませんでした。" }
  };
  let mol3dLib = null;
  function load3Dmol() {
    if (window.$3Dmol) return Promise.resolve(window.$3Dmol);
    if (!mol3dLib) mol3dLib = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "vendor/3Dmol-2.5.5-min.js";
      s.onload = () => window.$3Dmol ? res(window.$3Dmol) : rej(new Error("3Dmol missing"));
      s.onerror = rej;
      document.head.appendChild(s);
    });
    return mol3dLib;
  }
  function mountMol3D(afterEl) {
    let box = document.getElementById("hlMol3d");
    if (!afterEl) { if (box) box.remove(); return; }
    const T = MOL_TXT[currentLang] || MOL_TXT.en;
    if (box) box.remove();
    box = document.createElement("section");
    box.id = "hlMol3d"; box.className = "mol3d";
    box.innerHTML =
      '<div class="mol3d-head"><h4 class="hl-results-title">' + T.h + '</h4>' +
      '<div class="mol3d-pick" role="group">' +
        '<button type="button" data-pair="G" class="active" aria-pressed="true">' + T.G + ' → ' + T.g.split(" + ")[0] + '</button>' +
        '<button type="button" data-pair="U" aria-pressed="false">' + T.U + ' → ' + T.u.split(" + ")[0] + '</button>' +
      '</div></div>' +
      '<div class="mol3d-stage">' +
        '<figure class="mol3d-cell"><div class="mol3d-view" data-slot="a" role="img"></div><figcaption data-cap="a"></figcaption></figure>' +
        '<div class="mol3d-arrow" aria-hidden="true"><span>→</span><small>' + T.arrow + '</small></div>' +
        '<figure class="mol3d-cell"><div class="mol3d-view" data-slot="b" role="img"></div><figcaption data-cap="b"></figcaption></figure>' +
      '</div>' +
      '<p class="mol3d-hint">' + T.hint + '</p>';
    afterEl.insertAdjacentElement("afterend", box);
    const views = box.querySelectorAll(".mol3d-view");
    views.forEach(v => { v.textContent = T.load; });
    const PAIRS = { G: ["guanosine", "guanine-ribose", T.G, T.g], U: ["uridine", "uracil-ribose", T.U, T.u] };
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let viewers = [];
    const show = (key) => {
      const [fa, fb, ca, cb] = PAIRS[key];
      box.querySelector('[data-cap="a"]').textContent = ca;
      box.querySelector('[data-cap="b"]').textContent = cb;
      views[0].setAttribute("aria-label", ca); views[1].setAttribute("aria-label", cb);
      box.querySelectorAll(".mol3d-pick button").forEach(b => {
        const on = b.dataset.pair === key; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      load3Dmol().then(lib => Promise.all([fa, fb].map(f => fetch("data/molecules/" + f + ".sdf").then(r => r.text()))).then(sdfs => {
        viewers.forEach(v => { try { v.clear(); } catch (e) {} });
        views.forEach((el, i) => {
          if (!viewers[i]) { el.textContent = ""; viewers[i] = lib.createViewer(el, { backgroundAlpha: 0, antialias: true }); }
          const v = viewers[i];
          v.addModel(sdfs[i], "sdf");
          v.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.24 } });
          v.zoomTo(); v.zoom(0.95);
          if (!still) v.spin("y", 0.35);
          v.render();
        });
      })).catch(() => views.forEach(el => { el.textContent = T.fail; }));
    };
    box.querySelectorAll(".mol3d-pick button").forEach(b => b.addEventListener("click", () => show(b.dataset.pair)));
    show("G");
  }

  function setupHighlightModal() {
    const modal = document.getElementById("hlModal");
    const dataEl = document.getElementById("hl-detail-data");
    if (!modal || !dataEl || modal.__wired) return;
    modal.__wired = true;

    let DATA = {};
    try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }

    const lang = () => document.documentElement.getAttribute("lang") || "en";
    const pick = v => {
      if (!v || typeof v !== "object") return v;
      if (v[lang()]) return v[lang()];
      // body/points are lists: translate each paragraph/bullet on its own (FR/JA dictionary)
      return Array.isArray(v.en) ? v.en.map(s => trLookup(lang(), s)) : trLookup(lang(), v.en);
    };

    const elIcon = document.getElementById("hlModalIcon");
    const elEyebrow = document.getElementById("hlModalEyebrow");
    const elTitle = document.getElementById("hlModalTitle");
    const elTag = document.getElementById("hlModalTag");
    const elBody = document.getElementById("hlModalBody");
    const elPoints = document.getElementById("hlModalPoints");
    const elResults = document.getElementById("hlModalResults");
    let lastFocus = null;

    function fill(id) {
      const d = DATA[id];
      if (!d) return;
      // banner photo (kept visible when the highlight has one)
      const banner = document.getElementById("hlModalBanner");
      const img = document.getElementById("hlModalImg");
      if (banner && img) {
        if (d.image) {
          img.src = d.image;
          img.style.objectPosition = d.imagePos || "center center";
          banner.hidden = false;
        } else {
          banner.hidden = true;
        }
      }
      if (elIcon) elIcon.setAttribute("data-lucide", d.icon || "sparkles");
      elEyebrow.textContent = pick(d.eyebrow) || "";
      elTitle.textContent = pick(d.title) || "";
      elTag.textContent = pick(d.tag) || "";
      elBody.innerHTML = "";
      (pick(d.body) || []).forEach(p => {
        const para = document.createElement("p");
        para.textContent = p;
        elBody.appendChild(para);
      });
      elPoints.innerHTML = "";
      (pick(d.points) || []).forEach(pt => {
        const li = document.createElement("li");
        li.textContent = pt;
        elPoints.appendChild(li);
      });
      // show the key-points list only when the highlight has bullet points
      elPoints.hidden = !elPoints.children.length;
      // interactive 3D molecules for the ribonucleoside highlight
      mountMol3D(id === "ribonucleosides" ? elBody : null);
      // Key results from the papers (optional)
      if (elResults) {
        elResults.innerHTML = "";
        if (d.papers && d.papers.length) {
          const h = document.createElement("h4");
          h.className = "hl-results-title";
          h.textContent = pick(d.resultsTitle) || "Key results";
          elResults.appendChild(h);
          d.papers.forEach(p => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "hl-paper-link-btn";
            const t = document.createElement("span");
            t.className = "hl-paper-link-title";
            t.textContent = pick(p.title) || "";
            const arrow = document.createElement("span");
            arrow.className = "hl-paper-link-arrow";
            arrow.setAttribute("aria-hidden", "true");
            arrow.textContent = "\u2192";
            btn.appendChild(t); btn.appendChild(arrow);
            btn.addEventListener("click", () => { close(); openPublication(p.doi); });
            elResults.appendChild(btn);
          });
          elResults.hidden = false;
        } else {
          elResults.hidden = true;
        }
      }
      if (window.lucide && lucide.createIcons) lucide.createIcons();
    }

    function open(id) {
      lastFocus = document.activeElement;
      fill(id);
      modal.hidden = false;
      document.body.classList.add("hl-modal-open");
      const closeBtn = modal.querySelector(".hl-modal-close");
      if (closeBtn) setTimeout(() => closeBtn.focus(), 30);
    }
    function close() {
      modal.hidden = true;
      document.body.classList.remove("hl-modal-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.querySelectorAll(".hl-card[data-hl]").forEach(card => {
      card.addEventListener("click", e => {
        // a real drag on the carousel suppresses the click already; just open
        e.preventDefault();
        open(card.getAttribute("data-hl"));
      });
    });
    modal.querySelectorAll("[data-hl-close]").forEach(b => b.addEventListener("click", close));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !modal.hidden) { e.preventDefault(); close(); }
    });
  }

  // ============================================================
  //  TECHNIQUE DETAIL MODAL — click a technique card → pop-up detail
  // ============================================================
  function setupTechModal() {
    const modal = document.getElementById("techModal");
    const dataEl = document.getElementById("tech-detail-data");
    if (!modal || !dataEl || modal.__wired) return;
    modal.__wired = true;

    let DATA = {};
    try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }
    const lang = () => document.documentElement.getAttribute("data-lang") || "en";
    const pick = v => {
      if (!v || typeof v !== "object") return v;
      if (v[lang()]) return v[lang()];
      // body/points are lists: translate each paragraph/bullet on its own (FR/JA dictionary)
      return Array.isArray(v.en) ? v.en.map(s => trLookup(lang(), s)) : trLookup(lang(), v.en);
    };

    const elIcon = document.getElementById("techModalIcon");
    const elEyebrow = document.getElementById("techModalEyebrow");
    const elTitle = document.getElementById("techModalTitle");
    const elTag = document.getElementById("techModalTag");
    const elBody = document.getElementById("techModalBody");
    const elPoints = document.getElementById("techModalPoints");
    let lastFocus = null;

    function fill(id) {
      const d = DATA[id];
      if (!d) return;
      if (elIcon) elIcon.setAttribute("data-lucide", d.icon || "test-tubes");
      elEyebrow.textContent = pick(d.eyebrow) || "";
      elTitle.textContent = pick(d.title) || "";
      elTag.textContent = pick(d.tag) || "";
      elTag.hidden = !pick(d.tag);
      elBody.innerHTML = "";
      (pick(d.body) || []).forEach(p => {
        const para = document.createElement("p");
        para.innerHTML = p;
        elBody.appendChild(para);
      });
      elPoints.innerHTML = "";
      (pick(d.points) || []).forEach(pt => {
        const li = document.createElement("li");
        li.innerHTML = pt;
        elPoints.appendChild(li);
      });
      elPoints.hidden = !(pick(d.points) || []).length;
      if (window.lucide && lucide.createIcons) lucide.createIcons();
    }

    function open(id) {
      lastFocus = document.activeElement;
      fill(id);
      modal.hidden = false;
      document.body.classList.add("hl-modal-open");
      const closeBtn = modal.querySelector(".hl-modal-close");
      if (closeBtn) setTimeout(() => closeBtn.focus(), 30);
    }
    function close() {
      modal.hidden = true;
      document.body.classList.remove("hl-modal-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.querySelectorAll(".tech-card[data-tech], .tech-name[data-tech]").forEach(card => {
      // inject the "Learn more" affordance chip (carousel cards only, not the name lists)
      const info = card.querySelector(".tech-info");
      if (info && !card.querySelector(".tech-learn")) {
        const chip = document.createElement("span");
        chip.className = "tech-learn";
        chip.setAttribute("data-pt", 'Saber mais <i data-lucide="arrow-up-right"></i>');
        chip.innerHTML = 'Learn more <i data-lucide="arrow-up-right"></i>';
        info.appendChild(chip);
      }
      card.addEventListener("click", e => {
        // ignore the click synthesised at the end of a carousel drag
        if (card.closest("[data-carousel]")?.classList.contains("is-dragging")) return;
        e.preventDefault();
        open(card.getAttribute("data-tech"));
      });
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(card.getAttribute("data-tech")); }
      });
    });
    modal.querySelectorAll("[data-tech-close]").forEach(b => b.addEventListener("click", close));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !modal.hidden) { e.preventDefault(); close(); }
    });
  }

  // ============================================================
  //  KEYBOARD SHORTCUTS for the toolbar (single keys, no modifier).
  //  Search keeps its own "/" and ⌘K (wired in search.js).
  //    S — sections menu   T — theme   L — language   H — hands-free
  // ============================================================
  function setupShortcuts() {
    if (shortcutsWired) return;
    shortcutsWired = true;
    const map = {
      s: "navJump", t: "themeToggle", l: "langToggle", h: "autoScrollToggle"
    };
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;          // leave browser combos alone
      const t = e.target;
      if (/^(input|textarea|select)$/i.test(t.tagName || "") || t.isContentEditable) return;
      const id = map[(e.key || "").toLowerCase()];
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      if (id === "navJump") {
        // The section icons are always visible; 'S' focuses the first one.
        const ico = el.querySelector(".nav-sec-ico");
        if (ico && ico.focus) ico.focus();
      } else {
        el.click();
      }
    });
  }

  // News is a short list (latest three); the button reveals the rest.
  function setupNewsList() {
    const list = document.getElementById("newsList");
    const btn = document.getElementById("newsAll");
    if (!list || !btn || btn.dataset.wired) return;
    btn.dataset.wired = "1";
    if (list.children.length <= 3) { btn.hidden = true; return; }
    btn.addEventListener("click", () => { list.classList.add("is-all"); btn.hidden = true; });
  }

  // ============================================================
  //  PHONE HELPERS (≤ 760 px; all hidden by CSS on larger screens)
  //  1. a scrollable row of section shortcuts under the top bar
  //  2. long lists (talks, experience) show 4 items + "Show all"
  //  3. the intro bio folds to a few lines + "Read more"
  //  4. the auto-scroll switch moves from the top bar into the menu
  // ============================================================
  function setupPhoneHelpers() {
    const nav = document.querySelector("header.nav");
    if (nav && !nav.querySelector(".sec-chips")) {
      const bar = document.createElement("nav");
      bar.className = "sec-chips";
      bar.setAttribute("aria-label", "Sections");
      document.querySelectorAll('#navLinks a[href^="#"]').forEach(a => {
        const c = a.cloneNode(true);
        c.removeAttribute("class");
        bar.appendChild(c);
      });
      nav.appendChild(bar);
    }

    [["#presentations .timeline", 4]].forEach(([sel, n]) => {
      const tl = document.querySelector(sel);
      if (!tl || tl.dataset.collapse) return;
      const items = tl.querySelectorAll(":scope > .timeline-item");
      if (items.length <= n) return;
      tl.dataset.collapse = n;
      tl.classList.add("is-collapsible");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "news-all list-all";
      btn.innerHTML = '<span data-pt="Mostrar todos">Show all</span> (' + items.length + ")";
      btn.addEventListener("click", () => { tl.classList.add("is-all"); btn.hidden = true; });
      tl.insertAdjacentElement("afterend", btn);
    });
    // a filter (Oral / Poster) or a search hit needs the whole list
    document.addEventListener("click", e => {
      if (!e.target.closest("#preso-filter button")) return;
      const tl = document.querySelector("#presentations .timeline.is-collapsible");
      if (tl) { tl.classList.add("is-all"); const b = tl.nextElementSibling; if (b && b.classList.contains("list-all")) b.hidden = true; }
    });

    const bio = document.querySelector('.hero-intro p[data-i18n="bio"]');
    if (bio && !bio.dataset.fold) {
      bio.dataset.fold = "1";
      bio.classList.add("bio-fold");
      const more = document.createElement("button");
      more.type = "button";
      more.className = "bio-more";
      more.setAttribute("aria-expanded", "false");
      more.innerHTML = '<span data-pt="Ler mais">Read more</span>';
      more.addEventListener("click", () => {
        const open = bio.classList.toggle("is-open");
        more.setAttribute("aria-expanded", String(open));
        more.firstChild.setAttribute("data-pt", open ? "Ler menos" : "Ler mais");
        more.firstChild.dataset.enHtml = open ? "Read less" : "Read more";
        more.firstChild.innerHTML = currentLang === "pt" ? more.firstChild.getAttribute("data-pt") : trLookup(currentLang, more.firstChild.dataset.enHtml);
      });
      bio.insertAdjacentElement("afterend", more);
    }

    const pill = document.getElementById("autoScrollToggle");
    const links = document.getElementById("navLinks");
    if (pill && links && !links.querySelector(".nav-autoscroll")) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "nav-autoscroll";
      item.innerHTML = '<i data-lucide="smartphone"></i><span data-pt="Deslocação automática (inclinar o telemóvel)">Auto-scroll (tilt the phone)</span>' +
                       '<span class="tool-pill-state" aria-hidden="true"></span>';
      const sync = () => { item.querySelector(".tool-pill-state").textContent = pill.getAttribute("aria-pressed") === "true" ? "On" : "Off";
                           item.setAttribute("aria-pressed", pill.getAttribute("aria-pressed")); };
      item.addEventListener("click", () => { pill.click(); sync(); });
      new MutationObserver(sync).observe(pill, { attributes: true, attributeFilter: ["aria-pressed"] });
      sync();
      links.appendChild(item);
    }
  }

  // ============================================================
  //  CAREER PATH (Education): each step shows a summary of the matching
  //  Education / Experience entry, with a button that opens the full card.
  // ============================================================
  // Paint a logo's tile in the colour of the logo's own background (read from
  // its corner pixels), so no margin shows around it. Transparent logos keep the
  // default white tile.
  function matchLogoBackground(img, box) {
    try {
      const c = document.createElement("canvas");
      const w = c.width = Math.min(img.naturalWidth, 64), h = c.height = Math.min(img.naturalHeight, 64);
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const px = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => ctx.getImageData(x, y, 1, 1).data);
      if (px.some(p => p[3] < 200)) return;                     // transparent corners: keep the white tile
      const avg = k => Math.round(px.reduce((t, p) => t + p[k], 0) / px.length);
      const spread = Math.max(...[0, 1, 2].map(k => Math.max(...px.map(p => p[k])) - Math.min(...px.map(p => p[k]))));
      if (spread > 40) return;                                  // corners disagree: no single background
      const rgb = "rgb(" + avg(0) + "," + avg(1) + "," + avg(2) + ")";
      box.style.background = rgb;
      box.style.borderColor = rgb;
      box.classList.add("is-matched");
    } catch (e) { /* unreadable image: keep the default tile */ }
  }

  // Career paths (Education, Experience): each .path-wrap holds a row of steps and a
  // panel. A step opens the text of its entry (a card kept hidden in .path-source).
  const pathLangUpdates = [], pathFinders = [];
  function setupCareerPath() {
    document.querySelectorAll(".path-wrap").forEach(setupOnePath);
    pathLangUpdate = () => pathLangUpdates.forEach(f => f());
    // a search result opens its step, preferring the path of the entry's own section
    showPathFor = it => {
      const sec = it.closest("section");
      const order = pathFinders.slice().sort((a, b) => (b.wrap.closest("section") === sec) - (a.wrap.closest("section") === sec));
      return order.some(f => f.open(it));
    };
  }
  function setupOnePath(wrap) {
    const path = wrap.querySelector(".path");
    const panel = wrap.querySelector(".path-detail");
    if (!path || !panel || path.dataset.wired) return;
    path.dataset.wired = "1";
    const steps = Array.from(path.querySelectorAll(".path-btn"));
    const en = el => el ? (el.dataset.enHtml || el.innerHTML) : "";
    // find the timeline card whose (English) details line contains data-match
    function target(btn) {
      return Array.from(document.querySelectorAll("#" + btn.dataset.section + " .timeline-item"))
        .find(it => en(it.querySelector(".meta")).indexOf(btn.dataset.match) !== -1);
    }
    const LABEL = { education: { en: "Open in Education", pt: "Abrir em Educação", fr: "Ouvrir dans Formation", ja: "学歴で開く" },
                    experience: { en: "Open in Experience", pt: "Abrir em Experiência", fr: "Ouvrir dans Expérience", ja: "職歴で開く" } };
    let current = null;
    function show(btn) {
      current = btn;
      steps.forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
      const it = target(btn);
      if (!it) { panel.hidden = true; return; }
      const txt = sel => { const e = it.querySelector(sel); return e ? e.textContent.trim() : ""; };
      const sum = txt(".timeline-card > p em");
      // entries shown only through a path (hidden cards): the whole text and photos
      // here; any other entry: a summary and a link to its card
      const full = it.closest(".path-source") ? it.querySelector(".expand-body") : null;
      panel.innerHTML =
        '<span class="path-detail-text"><span class="path-detail-title"></span><span class="path-detail-meta"></span>' +
        (sum ? '<span class="path-detail-sum"></span>' : "") + "</span>" +
        (full ? '<div class="path-detail-body expand-body"></div>'
              : '<button type="button" class="path-detail-go"><i data-lucide="arrow-down-right"></i><span></span></button>');
      panel.querySelector(".path-detail-title").textContent = txt(".timeline-header strong");
      panel.querySelector(".path-detail-meta").textContent = txt(".timeline-header .meta");
      if (sum) panel.querySelector(".path-detail-sum").textContent = sum;
      panel.hidden = false;
      if (full) {
        panel.querySelector(".path-detail-body").innerHTML = full.innerHTML;   // already in the page language
        panel.querySelectorAll("img").forEach(i => { i.loading = "lazy"; i.decoding = "async"; });
        return;
      }
      const l = LABEL[btn.dataset.section] || LABEL.education;
      panel.querySelector(".path-detail-go span").textContent = l[currentLang] || l.en;
      panel.querySelector(".path-detail-go").addEventListener("click", () => {
        if (it.closest("details")) it.closest("details").open = true;
        const tl = it.closest(".timeline.is-collapsible");
        if (tl) { tl.classList.add("is-all"); const b = tl.nextElementSibling; if (b && b.classList.contains("list-all")) b.hidden = true; }
        // scroll first, then open: cards that are out of view close themselves
        it.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
        const io = new IntersectionObserver(es => {
          if (!es[0].isIntersecting) return;
          io.disconnect();
          setTimeout(() => { if (!it.classList.contains("open")) openTimelineItem(it); }, prefersReduced ? 0 : 250);
        }, { threshold: 0.6 });
        io.observe(it);
      });
      panel.hidden = false;
      if (window.lucide && lucide.createIcons) try { lucide.createIcons(); } catch (e) {}
    }
    // each step shows the institution logo of its entry (one source of truth)
    steps.forEach(b => {
      const it = target(b), img = it && it.querySelector(".timeline-header img");
      const box = b.querySelector(".path-logo");
      if (img && box) {
        const i = document.createElement("img");
        i.alt = "";
        i.addEventListener("load", () => matchLogoBackground(i, box));
        i.src = img.getAttribute("src");
        box.innerHTML = ""; box.appendChild(i);
      }
    });
    // a step tapped on a phone: bring its text into view (it sits below the list)
    const reveal = () => { if (innerWidth <= 760) panel.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" }); };
    steps.forEach((b, i) => {
      b.addEventListener("click", () => {        // a second click on the open step closes it
        if (current === b && !panel.hidden) { hide(); return; }
        show(b); reveal();
      });
      b.addEventListener("keydown", e => {         // arrow keys move along the path
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const n = steps[(i + d + steps.length) % steps.length];
        n.focus(); show(n);
      });
    });
    function hide() {
      current = null;
      steps.forEach(b => b.setAttribute("aria-pressed", "false"));
      panel.hidden = true; panel.innerHTML = "";
    }
    pathLangUpdates.push(() => { if (current) show(current); });
    pathFinders.push({ wrap, open: it => {
      const b = steps.find(x => target(x) === it);
      if (!b) return false;
      show(b); bringIntoTrack(b);
      wrap.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
      return true;
    } });
    // long paths (Experience) slide sideways: arrows move by most of a view and the
    // path opens on its newest end
    const track = wrap.querySelector(".path-scroll");
    const arrows = Array.from(wrap.querySelectorAll(".path-arrow"));
    function bringIntoTrack(b) {
      if (!track) return;
      const t = track.getBoundingClientRect(), r = b.getBoundingClientRect();
      if (r.left < t.left || r.right > t.right) track.scrollLeft += (r.left + r.width / 2) - (t.left + t.width / 2);
    }
    if (track) {
      const vertical = () => track.scrollWidth <= track.clientWidth + 1;
      const sync = () => {
        const max = track.scrollWidth - track.clientWidth;
        arrows.forEach(a => {
          const off = vertical() || (a.dataset.dir === "-1" ? track.scrollLeft <= 2 : track.scrollLeft >= max - 2);
          a.disabled = off; a.hidden = vertical();
        });
      };
      arrows.forEach(a => a.addEventListener("click", () => {
        track.scrollBy({ left: +a.dataset.dir * track.clientWidth * 0.8, behavior: prefersReduced ? "auto" : "smooth" });
      }));
      track.addEventListener("scroll", sync, { passive: true });
      addEventListener("resize", sync, { passive: true });
      track.scrollLeft = track.scrollWidth;          // newest first in view
      sync();
      steps.forEach(b => b.addEventListener("focus", () => bringIntoTrack(b)));
    }
    // nothing is open at first: a step's text appears when it is clicked
    // a click anywhere outside the path box hides the text again (the photo viewer
    // opened from that text does not count as outside)
    document.addEventListener("click", e => {
      if (current && !panel.hidden && !wrap.contains(e.target) && !e.target.closest(".lightbox")) hide();
    });
    // draw the line when the path scrolls into view
    if (prefersReduced || !("IntersectionObserver" in window)) { path.classList.add("is-drawn"); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { path.classList.add("is-drawn"); io.disconnect(); }
    }), { threshold: 0.3 });
    io.observe(path);
  }

  function init() {
    initStarfield();
    initNav();
    observeReveals(document);
    wireAccordions();
    setupScrollTopButton();
    setupAutoScroll();
    setupButtonRipple();
    setupLightbox();
    injectHeadingIcons();
    setupLazyImages();
    setupTreePan();
    setupCarousels();
    setupNewsList();
    setupPhoneHelpers();
    setupCareerPath();
    setupHighlightModal();
    setupTechModal();
    setupThemeToggle();
    setupLangToggle();
    setupShortcuts();
    setupScrollProgress();
    buildPublicationFilter();
    buildPresentationFilter();
    updateMetrics();
    initPresoMap();
    if (document.getElementById("pub-list")) loadPublications();
  }

  // Exposed so the section loader can re-run init() after injecting content.
  window.SiteApp = { init: init, openItem: openTimelineItem, showPathFor: it => showPathFor(it) };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
