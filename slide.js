/* slide.js: the website and the Blog page sit side by side, like two pages on one sky.
   - Pull the website itself to the left to reach the blog: press on the empty space to
     the right of the website (or, on narrow screens, on the right edge) and drag left.
     The whole page follows the pointer like a sheet of paper while the starry sky stays
     behind it (turning slightly), and the blog arrives from the right on that same sky.
     Let go past about a third of the screen and the blog opens; otherwise the page
     settles back. It starts only from that empty space, never from text, links or
     controls, and only for a clear sideways pull, so the page cannot change by accident.
   - Bringing the cursor to that space shows a small hint ("‹ Blog").
   - The menu's Blog link slides the same way (cross-page View Transitions where the
     browser has them), and going back slides the other way.
   - The blog page continues the sky where the website left it (scenes3d.js, SiteSpace.keep).
   Styles: ui-extra.css (.blog-hint, .blog-peek, html.blog-pulling). */
(function () {
  "use strict";
  const isBlog = u => /\/blog\.html$/.test(new URL(u, location.href).pathname);
  let dragNav = false;                       // the pull already brought the blog in: no second animation

  // ---- page-to-page slide (View Transitions) ----
  addEventListener("pagereveal", e => {
    if (!e.viewTransition) return;
    let from = "";
    try { from = navigation.activation && navigation.activation.from ? navigation.activation.from.url : ""; } catch (x) {}
    if (!isBlog(location.href) && !(from && isBlog(from))) return;
    try { e.viewTransition.types.add(isBlog(location.href) ? "slide-forward" : "slide-back"); } catch (x) {}
  });
  addEventListener("pageswap", e => {
    if (window.SiteSpace && SiteSpace.keep && e.activation && (isBlog(e.activation.entry.url) || isBlog(location.href))) SiteSpace.keep();
    if (!e.viewTransition || !e.activation) return;
    if (dragNav) { try { e.viewTransition.skipTransition(); } catch (x) {} return; }
    const to = e.activation.entry.url;
    if (!isBlog(to) && !isBlog(location.href)) return;
    try { e.viewTransition.types.add(isBlog(to) ? "slide-forward" : "slide-back"); } catch (x) {}
  });
  // browsers without pageswap: keep the sky when following a link between the two pages
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (a && (isBlog(a.href) || (isBlog(location.href) && new URL(a.href, location.href).origin === location.origin)) && window.SiteSpace && SiteSpace.keep) SiteSpace.keep();
  });

  if (isBlog(location.href)) return;

  // ---- pulling the website to the left (website only) ----
  const T = {
    en: { hint: "Blog", sub: "drag the page", title: "Blog", soon: "The blog is being synthesized", text: "New writing on astrobiology, mechanochemistry and research life is in the flask. Come back soon." },
    pt: { hint: "Blog", sub: "arraste a página", title: "Blog", soon: "O blog está a ser sintetizado", text: "Novos textos sobre astrobiologia, mecanoquímica e a vida de investigação estão no balão. Volte em breve." },
    fr: { hint: "Blog", sub: "faites glisser la page", title: "Blog", soon: "Le blog est en cours de synthèse", text: "De nouveaux textes sur l’astrobiologie, la mécanochimie et la vie de chercheur sont dans le ballon. Revenez bientôt." },
    ja: { hint: "ブログ", sub: "ページをドラッグ", title: "ブログ", soon: "ブログは現在「合成中」です", text: "宇宙生物学、メカノケミストリー、研究生活についての新しい記事をフラスコの中で準備中です。また来てください。" }
  };
  const lang = () => { const l = document.documentElement.getAttribute("lang"); return T[l] ? l : "en"; };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const root = document.documentElement;
  const href = () => "blog.html" + (lang() !== "en" ? "?lang=" + lang() : "");

  function build() {
    const hint = document.createElement("a");
    hint.className = "blog-hint"; hint.href = href();
    hint.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>' +
      '<span class="blog-hint-t"></span><span class="blog-hint-s"></span>';
    // what arrives from the right: the blog page's own content, on the same sky
    const peek = document.createElement("div");
    peek.className = "blog-peek"; peek.setAttribute("aria-hidden", "true");
    peek.innerHTML = '<div class="nav blog-peek-nav"><div class="nav-inner"><span class="nav-logo">G<span>P</span>M</span></div></div><div class="blog-page"><span class="blog-back">&larr;</span><h1 class="blog-h1"></h1>' +
      '<div class="blog-soon"><span class="blog-soon-ico"><svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8h16M28 8v14L12 50a5 5 0 0 0 4.4 7.4h31.2A5 5 0 0 0 52 50L36 22V8"/><path d="M18 40h28"/></svg></span>' +
      '<h2 class="blog-soon-title"></h2><p class="blog-soon-text"></p></div></div>';
    document.body.append(hint, peek);
    const texts = () => {
      const t = T[lang()];
      hint.querySelector(".blog-hint-t").textContent = t.hint; hint.querySelector(".blog-hint-s").textContent = t.sub;
      hint.setAttribute("aria-label", t.title); hint.href = href();
      peek.querySelector(".blog-h1").textContent = t.title; peek.querySelector(".blog-soon-title").textContent = t.soon;
      peek.querySelector(".blog-soon-text").textContent = t.text;
    };
    texts();
    new MutationObserver(texts).observe(root, { attributes: true, attributeFilter: ["lang"] });

    // where a pull may start: the empty space right of the website's column (at least
    // the last 28 px of the window), below the menu bar, not on any control
    const NAV = () => { const n = document.querySelector(".nav"); return n ? n.getBoundingClientRect().bottom : 64; };
    let colRight = innerWidth;
    const measure = () => {
      const s = document.querySelector("#mainContent .section, main .section, main");
      colRight = s ? Math.min(innerWidth - 28, s.getBoundingClientRect().right + 16) : innerWidth - 28;
    };
    measure(); addEventListener("resize", measure, { passive: true }); setTimeout(measure, 1500);
    const CONTROLS = "a, button, input, textarea, select, label, summary, [role=button], [role=tab], [tabindex], canvas, video, iframe, .askc, .nav, .rail, .path-scroll, .tn-wrap, .ms-stage";
    const inZone = (x, y, target) => x >= colRight && x <= innerWidth && y > NAV() && y < innerHeight - 8 &&
      !(target && target.closest && target.closest(CONTROLS) && !target.closest(".blog-hint"));

    // the hint, and a grab cursor, when the mouse is in that space
    if (fine) {
      let raf = 0, mx = -1, my = -1, mt = null;
      addEventListener("mousemove", e => {
        mx = e.clientX; my = e.clientY; mt = e.target;
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = 0; const on = pull === null && inZone(mx, my, mt); root.classList.toggle("blog-zone", on); hint.classList.toggle("is-on", on || pull !== null); });
      }, { passive: true });
      document.addEventListener("mouseleave", () => { if (pull === null) { root.classList.remove("blog-zone"); hint.classList.remove("is-on"); } });
    }

    let pull = null, sx = 0, sy = 0, last = 0, lastT = 0, v = 0, id = null, started = false;
    const W = () => innerWidth;
    function set(px) {                                    // px <= 0: how far the website has moved left
      root.style.setProperty("--pull", px + "px");
      peek.style.transform = "translateX(" + (W() + px) + "px)";
      if (window.SiteSpace && SiteSpace.pan) SiteSpace.pan(-px / W() * 0.22);
    }
    function begin() {
      started = true; root.classList.add("blog-pulling"); root.classList.remove("blog-zone"); peek.classList.add("is-on");
    }
    function settle(open) {
      root.classList.add("blog-settling");
      set(open ? -W() : 0);
      const done = () => {
        root.classList.remove("blog-settling");
        if (open) { dragNav = true; if (window.SiteSpace && SiteSpace.keep) SiteSpace.keep(); location.href = href(); return; }
        root.classList.remove("blog-pulling"); peek.classList.remove("is-on"); root.style.removeProperty("--pull");
        if (window.SiteSpace && SiteSpace.pan) SiteSpace.pan(0);
        pull = null;
      };
      if (reduced) done(); else setTimeout(done, 420);
    }
    function down(x, y, target, pid) {
      if (pull !== null || !inZone(x, y, target)) return false;
      pull = 0; sx = x; sy = y; last = x; lastT = performance.now(); v = 0; id = pid; started = false;
      return true;
    }
    function moveTo(x, y) {
      if (pull === null) return false;
      const dx = x - sx, dy = y - sy;
      if (!started) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { pull = null; return false; }     // scrolling, not pulling
        if (dx > -12) return false;                                                               // only a clear pull to the left
        begin();
      }
      const now = performance.now(); v = (last - x) / Math.max(1, now - lastT); last = x; lastT = now;
      pull = Math.min(0, dx); set(pull);
      return true;
    }
    function up() {
      if (pull === null) return;
      if (!started) { pull = null; return; }
      settle(-pull > W() * 0.3 || (v > 0.8 && -pull > 90));
    }
    // mouse and pen
    addEventListener("pointerdown", e => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      if (down(e.clientX, e.clientY, e.target, e.pointerId)) { e.preventDefault(); }
    });
    addEventListener("pointermove", e => { if (e.pointerType !== "touch" && e.pointerId === id && moveTo(e.clientX, e.clientY)) e.preventDefault(); });
    addEventListener("pointerup", e => { if (e.pointerType !== "touch" && e.pointerId === id) up(); });
    addEventListener("pointercancel", e => { if (e.pointerType !== "touch" && e.pointerId === id && started) settle(false); else if (e.pointerId === id) pull = null; });
    // touch: sideways pulls are taken over, vertical moves keep scrolling the page
    addEventListener("touchstart", e => { if (e.touches.length === 1) down(e.touches[0].clientX, e.touches[0].clientY, e.target, "t"); else if (pull !== null && !started) pull = null; }, { passive: true });
    addEventListener("touchmove", e => { if (pull !== null && e.touches.length === 1 && moveTo(e.touches[0].clientX, e.touches[0].clientY) && e.cancelable) e.preventDefault(); }, { passive: false });
    addEventListener("touchend", () => up(), { passive: true });
    addEventListener("touchcancel", () => { if (started) settle(false); else pull = null; }, { passive: true });
    // the hint itself: a click slides the page away and opens the blog
    hint.addEventListener("click", e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      if (reduced) { location.href = href(); return; }
      pull = 0; begin(); set(0);
      requestAnimationFrame(() => requestAnimationFrame(() => settle(true)));
    });
    // coming back with the browser's Back button (page restored from memory)
    addEventListener("pageshow", ev => {
      if (!ev.persisted) return;
      dragNav = false; pull = null; started = false;
      root.classList.remove("blog-pulling", "blog-settling", "blog-zone"); root.style.removeProperty("--pull");
      peek.classList.remove("is-on"); hint.classList.remove("is-on");
      if (window.SiteSpace && SiteSpace.pan) SiteSpace.pan(0);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
