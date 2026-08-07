(function () {
  "use strict";

  // ============================================================
  //  CONFIG
  // ============================================================
  const ORCID_ID = "0000-0001-5314-8816";
  const ORCID_WORKS_URL = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
  const CROSSREF_URL = "https://api.crossref.org/works/";
  const CONTACT_MAILTO = "gustavopinho.maia@mnhn.fr"; // Crossref polite pool only

  // Peer-reviewed papers only — presentations, preprints, datasets, etc. excluded.
  // Add "review" / "book-chapter" here to include those too.
  const ORCID_ALLOWED_TYPES = ["journal-article"];
  const CROSSREF_ALLOWED_TYPES = ["journal-article"];

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
  let currentLang = (function(){ try { return localStorage.getItem("lang") || "en"; } catch(e){ return "en"; } })();

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
  //  SCROLL-TO-TOP BUTTON ("Slides up")
  // ============================================================
  function setupScrollTopButton() {
    if (document.getElementById("scrollTopBtn")) return;
    const btn = document.createElement("button");
    btn.id = "scrollTopBtn";
    btn.type = "button";
    btn.className = "scroll-top-btn";
    btn.setAttribute("aria-label", "Scroll back to top");
    btn.innerHTML = '<span>Slides up</span><span aria-hidden="true">&uarr;</span>';
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

    // Auto-activate on first visit (desktop pointer + mobile tilt); respect an explicit opt-out.
    {
      let saved = null;
      try { saved = localStorage.getItem(KEY); } catch (_) {}
      const firstVisit = (saved === null);
      const on = firstVisit ? true : (saved === "1");
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
        ? "Deslocação automática ativada — clique neste botão para a desativar."
        : "Hands-free scroll is on — click this button to turn it off.";

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
    const setStatus = (msg) => { if (status) status.textContent = msg; };
    const clearStatus = () => { if (status) status.remove(); };

    const seenDois = new Set();
    document.querySelectorAll('.timeline-item.publication a[href*="doi.org/"]').forEach(a => {
      const m = a.getAttribute("href").match(/doi\.org\/(.+)$/i);
      if (m) seenDois.add(decodeURIComponent(m[1]).trim().toLowerCase());
    });

    let works = [];
    try {
      works = await fetchOrcidWorks();
    } catch (err) {
      console.warn("ORCID fetch failed, trying Crossref fallback:", err);
      try { works = await fetchCrossrefByOrcid(); }
      catch (err2) {
        console.warn("Could not load publications automatically:", err2);
        setStatus("Live sync unavailable right now — the publications listed above are current.");
        buildPublicationFilter();
        decoratePublications();
        return;
      }
    }

    works.sort((a, b) => (b.year || 0) - (a.year || 0));

    let added = 0;
    for (const wk of works) {
      const key = wk.doi ? wk.doi.toLowerCase() : null;
      if (key && seenDois.has(key)) continue;

      const meta = wk.doi ? await fetchCrossref(wk.doi) : null;
      const pub = {
        title:    (meta && meta.title)    || wk.title    || "Untitled",
        authors:  (meta && meta.authors)  || wk.authors  || "",
        year:     (meta && meta.year)     || wk.year     || "",
        journal:  (meta && meta.journal)  || wk.journal  || "",
        abstract: (meta && meta.abstract) || "",
        doi:      wk.doi || (meta && meta.doi) || ""
      };
      if (key) seenDois.add(key);
      renderPublication(container, pub);
      added++;
    }

    clearStatus();
    observeReveals(container);
    wireAccordions();
    buildPublicationFilter();
    decoratePublications();
    updateMetrics();
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

  async function fetchOrcidWorks() {
    const res = await fetch(ORCID_WORKS_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("ORCID request failed: " + res.status);
    const data = await res.json();

    const works = [];
    (data.group || []).forEach(group => {
      const summaries = group["work-summary"] || [];
      if (!summaries.length) return;
      const s = summaries[0];

      const type = (s.type || "").toLowerCase();
      if (!ORCID_ALLOWED_TYPES.includes(type)) return; // peer-reviewed papers only

      const ids =
        (group["external-ids"] && group["external-ids"]["external-id"]) ||
        (s["external-ids"] && s["external-ids"]["external-id"]) || [];
      let doi = null;
      ids.forEach(id => {
        if (!doi && (id["external-id-type"] || "").toLowerCase() === "doi") {
          doi = (id["external-id-value"] || "").trim();
        }
      });

      const title = s.title && s.title.title && s.title.title.value;
      const journal = s["journal-title"] && s["journal-title"].value;
      const yearVal = s["publication-date"] && s["publication-date"].year && s["publication-date"].year.value;

      works.push({ doi, title, journal, authors: "", year: yearVal ? parseInt(yearVal, 10) : 0 });
    });
    return works;
  }

  async function fetchCrossrefByOrcid() {
    const url = `${CROSSREF_URL.replace(/\/$/, "")}?filter=orcid:${ORCID_ID}&rows=200&mailto=${encodeURIComponent(CONTACT_MAILTO)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Crossref ORCID request failed: " + res.status);
    const json = await res.json();
    const items = (json.message && json.message.items) || [];
    return items.map(parseCrossrefItem).filter(w => CROSSREF_ALLOWED_TYPES.includes(w.type));
  }

  async function fetchCrossref(doi) {
    if (!doi) return null;
    try {
      const url = CROSSREF_URL + encodeURIComponent(doi) + "?mailto=" + encodeURIComponent(CONTACT_MAILTO);
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      const json = await res.json();
      return parseCrossrefItem(json.message || {});
    } catch (e) { return null; }
  }

  function parseCrossrefItem(m) {
    const title = Array.isArray(m.title) ? m.title[0] : (m.title || "");
    const journal = Array.isArray(m["container-title"]) ? m["container-title"][0] : (m["container-title"] || "");
    const dateParts =
      (m.issued && m.issued["date-parts"] && m.issued["date-parts"][0]) ||
      (m["published-print"] && m["published-print"]["date-parts"] && m["published-print"]["date-parts"][0]) ||
      (m["published-online"] && m["published-online"]["date-parts"] && m["published-online"]["date-parts"][0]) || [];
    const year = dateParts[0] || "";
    const authors = (m.author || [])
      .map(a => [a.given, a.family].filter(Boolean).join(" "))
      .filter(Boolean).join(", ");
    const abstract = m.abstract ? stripJats(m.abstract) : "";
    return { title, journal, year, authors, abstract, doi: m.DOI || "", type: (m.type || "").toLowerCase() };
  }

  function stripJats(s) {
    return String(s)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^\s*abstract[:\s]*/i, "")
      .trim();
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
          : '<p><em>Abstract not available — open the paper via the DOI link below.</em></p>') +
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
    nav_tree:{en:"Tree",pt:"Árvore"}, nav_map:{en:"Map",pt:"Mapa"}, nav_tutoring:{en:"Tutoring",pt:"Explicações"}, nav_courses:{en:"Courses",pt:"Cursos"},
    role:{en:"PhD Researcher in Chemistry · Astrobiology",pt:"Investigador de Doutoramento em Química · Astrobiologia"},
    bio:{en:"My research explores the origins and evolution of life in the universe, using chemistry to uncover the processes that may have led to life's emergence. A key focus is mechanochemistry — chemical reactions driven by mechanical forces. I investigate how mechanical energy, from parent-body formation, asteroid gardening, or meteorite impacts, could have promoted the synthesis and transformation of organic molecules on the early Earth and other planetary bodies, revealing alternative pathways for prebiotic chemistry under extreme and extraterrestrial environments.",
         pt:"A minha investigação explora as origens e a evolução da vida no universo, usando a química para desvendar os processos que poderão ter conduzido ao surgimento da vida. Um foco central é a mecanoquímica — reações químicas impulsionadas por forças mecânicas. Investigo como a energia mecânica, da formação de corpos progenitores, do asteroid gardening ou de impactos de meteoritos, poderá ter promovido a síntese e a transformação de moléculas orgânicas na Terra primitiva e noutros corpos planetários, revelando vias alternativas para a química prebiótica em ambientes extremos e extraterrestres."},
    tag1:{en:"Mechanochemistry",pt:"Mecanoquímica"}, tag2:{en:"Prebiotic Chemistry",pt:"Química Prebiótica"},
    tag3:{en:"Astrobiology",pt:"Astrobiologia"}, tag4:{en:"Origin of Life",pt:"Origem da Vida"},
    m_pubs:{en:"Publications",pt:"Publicações"}, m_talks:{en:"Talks & posters",pt:"Comunicações"},
    m_areas:{en:"Research areas",pt:"Áreas de investigação"}, m_hindex:{en:"h-index",pt:"índice h"}, cv:{en:"Download CV",pt:"Descarregar CV"}
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
      awards:"award", tree:"git-fork", map:"map-pin", tutoring:"flask-conical" };
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
    document.querySelectorAll("[data-i18n-filter]").forEach(b => {
      const key = b.getAttribute("data-i18n-filter");
      const en = { all: "All", oral: "Oral", poster: "Poster" }[key];
      const pt = { all: "Todos", oral: "Oral", poster: "Póster" }[key];
      if (en) b.textContent = (lang === "pt") ? pt : trLookup(lang, en);
    });
    if (typeof mapLangUpdate === "function") mapLangUpdate(lang);
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

  function updateMetrics() {
    const el = document.querySelector('[data-metric="pubs"]');
    if (!el) return;
    let n = 0;
    document.querySelectorAll("#publications .timeline-item.publication").forEach(it => {
      if (!isPreprintItem(it)) n++;   // preprints shown in the list but not counted
    });
    if (n) el.textContent = n;
  }

  // Presentation map (Leaflet)
  function initPresoMap() {
    if (mapWired) return;
    const el = document.getElementById("presoMap");
    if (!el || !window.L) return;
    mapWired = true;

    const EDU  = "#34d399";  // studies / education
    const LAB  = "#22d3ee";  // laboratories / research
    const PRES = "#fbbf24";  // oral / poster presentations

    const education = [
      { n:"Instituto Superior Técnico, Lisbon", c:[38.7369,-9.1366], d:"MSc in Chemistry (2020–2022) · PhD in Chemistry / Astrobiology (2023–present)" },
      { n:"Universidade da Beira Interior, Covilhã", c:[40.2784,-7.5046], d:"BSc in Industrial Chemistry (2017–2020)" },
      { n:"Escola Profissional de Espinho (ESPE)", c:[41.0073,-8.6415], d:"Mechatronics Technician, Level IV (2013–2016)" }
    ];
    const labs = [
      { n:"CQE — Instituto Superior Técnico, Lisbon", c:[38.7369,-9.1366], d:"PhD researcher · Invited teaching assistant" },
      { n:"IMPMC — MNHN, Paris", c:[48.8443,2.3562], d:"Visiting Scientist (2025–present)" },
      { n:"NASA Goddard Space Flight Center, Greenbelt MD", c:[38.9961,-76.8483], d:"Visiting Scientist (2024)" },
      { n:"Universidade da Beira Interior, Covilhã", c:[40.2784,-7.5046], d:"Research intern (2020)" }
    ];
    const pres = [
      { n:"Lisbon, Portugal", c:[38.7369,-9.1366], d:"EANA 2025 (poster · award) · AbGradE’25 · NInTec 2024 · EuChemS ECC8 2022 · IST PhD Open Days 2024 · CQE Days 2022" },
      { n:"Paris, France", c:[48.8443,2.3562], d:"IPGP “Small Bodies Day” 2025 · IMPMC PhD Students’ Day 2025" },
      { n:"Reykjavik, Iceland", c:[64.1466,-21.9426], d:"BEACON 2025 (oral)" },
      { n:"Covilhã, Portugal", c:[40.2784,-7.5046], d:"XV CICS-UBI Symposium 2020 (poster)" }
    ];

    const map = L.map(el, { scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    const all = [];
    const tip = (n, label, color, d) =>
      '<strong>' + n + '</strong><br><span style="color:' + color + ';font-weight:600">' + label + '</span><br>' + d;
    const place = (arr, opts, label, color) => arr.forEach(p => {
      L.circleMarker(p.c, opts).addTo(map)
        .bindTooltip(tip(p.n, label, color, p.d), { direction:"top", offset:[0,-4], opacity:0.97 });
      all.push(p.c);
    });

    // Largest first (drawn underneath) so overlapping cities show as nested coloured rings
    place(education, { radius:15, color:EDU,  weight:3,   fillColor:EDU,  fillOpacity:.12 }, "Studies", EDU);
    place(pres,      { radius:11, color:PRES, weight:3,   fillColor:PRES, fillOpacity:.14 }, "Presentations", PRES);
    place(labs,      { radius:6.5,color:"#0b1020", weight:1.5, fillColor:LAB, fillOpacity:.96 }, "Laboratory / research", LAB);

    const defaultBounds = L.latLngBounds(all).pad(0.15);
    const fit = () => map.fitBounds(defaultBounds);
    fit();

    // Legend (text follows the current language; updated live on language toggle)
    const legendText = lang => {
      if (lang === "pt") return ['Estudos (ESPE · UBI · Técnico)', 'Laboratórios e investigação', 'Comunicações orais e painéis'];
      return ['Studies (ESPE · UBI · Técnico)', 'Laboratories &amp; research', 'Oral &amp; poster presentations']
        .map(s => trLookup(lang, s.replace(/&amp;/g, '&')));
    };
    const legendHTML = lang => {
      const t = legendText(lang);
      return '<span class="dot" style="background:' + EDU  + '"></span>' + t[0] + '<br>' +
             '<span class="dot" style="background:' + LAB  + '"></span>' + t[1] + '<br>' +
             '<span class="dot" style="background:' + PRES + '"></span>' + t[2];
    };
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "map-legend");
      div.innerHTML = legendHTML(currentLang);
      mapLangUpdate = lang => { div.innerHTML = legendHTML(lang); };
      return div;
    };
    legend.addTo(map);

    // Reset-to-default-view control
    const reset = L.control({ position: "topright" });
    reset.onAdd = function () {
      const b = L.DomUtil.create("button", "map-reset");
      b.type = "button"; b.title = "Reset view"; b.setAttribute("aria-label", "Reset view");
      b.innerHTML = "⌖";
      L.DomEvent.disableClickPropagation(b);
      L.DomEvent.on(b, "click", function (e) { L.DomEvent.preventDefault(e); fit(); });
      return b;
    };
    reset.addTo(map);

    setTimeout(() => map.invalidateSize(), 200);
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

  function setupHighlightModal() {
    const modal = document.getElementById("hlModal");
    const dataEl = document.getElementById("hl-detail-data");
    if (!modal || !dataEl || modal.__wired) return;
    modal.__wired = true;

    let DATA = {};
    try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }

    const lang = () => document.documentElement.getAttribute("lang") || "en";
    const pick = v => (v && typeof v === "object") ? (v[lang()] || trLookup(lang(), v.en)) : v;

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
      // when the highlight has paper results, drop the redundant key-points list
      elPoints.hidden = !!(d.papers && d.papers.length);
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
    const pick = v => (v && typeof v === "object") ? (v[lang()] || trLookup(lang(), v.en)) : v;

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

    document.querySelectorAll(".tech-card[data-tech]").forEach(card => {
      // inject the "Learn more" affordance chip
      const info = card.querySelector(".tech-info") || card;
      if (!card.querySelector(".tech-learn")) {
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
  window.SiteApp = { init: init, openItem: openTimelineItem };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
