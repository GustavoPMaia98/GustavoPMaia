/* slide.js: the website and the Blog page sit side by side.
   - The Blog button (and the menu link) slides the website out to the left and the
     blog in from the right; going back slides the other way (cross-page View
     Transitions: Chrome, Edge, Safari 18.2+; other browsers simply open the page).
   - On the website, the blog also waits just past the right edge:
       * with a mouse, bringing the cursor to the far right shows a small "Blog" tab;
       * pressing on that tab, or on the edge itself, and dragging to the left pulls
         the blog over the page; let go past about a third of the screen and the
         blog opens, otherwise it slides back. A click on the tab opens it too.
       * on touch screens the tab stays visible as a thin handle (edge swipes there
         belong to the phone's own back gesture).
     It only starts from the edge or the tab, follows sideways moves only, and never
     opens on a small or vertical movement, so the page cannot change by accident.
   The look is in ui-extra.css (.blog-edge, .blog-tab, .blog-peek). */
(function () {
  "use strict";
  const isBlog = u => /\/blog\.html$/.test(new URL(u, location.href).pathname);
  let dragNav = false;                       // the drag already slid the blog in: no second animation

  // ---- page-to-page slide (View Transitions) ----
  addEventListener("pagereveal", e => {
    if (!e.viewTransition) return;
    let from = "";
    try { from = navigation.activation && navigation.activation.from ? navigation.activation.from.url : ""; } catch (x) {}
    if (!isBlog(location.href) && !(from && isBlog(from))) return;      // only between the website and the blog
    try { e.viewTransition.types.add(isBlog(location.href) ? "slide-forward" : "slide-back"); } catch (x) {}
  });
  addEventListener("pageswap", e => {
    if (!e.viewTransition || !e.activation) return;
    if (dragNav) { try { e.viewTransition.skipTransition(); } catch (x) {} return; }
    const to = e.activation.entry.url;
    if (!isBlog(to) && !isBlog(location.href)) return;
    try { e.viewTransition.types.add(isBlog(to) ? "slide-forward" : "slide-back"); } catch (x) {}
  });

  if (isBlog(location.href)) return;

  // ---- the blog waiting at the right edge (website only) ----
  const T = {
    en: { tab: "Blog", title: "Blog", soon: "The blog is being synthesized", hint: "Drag to open the blog" },
    pt: { tab: "Blog", title: "Blog", soon: "O blog está a ser sintetizado", hint: "Arraste para abrir o blog" },
    fr: { tab: "Blog", title: "Blog", soon: "Le blog est en cours de synthèse", hint: "Faites glisser pour ouvrir le blog" },
    ja: { tab: "ブログ", title: "ブログ", soon: "ブログは現在「合成中」です", hint: "ドラッグしてブログを開く" }
  };
  const lang = () => { const l = document.documentElement.getAttribute("lang"); return T[l] ? l : "en"; };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function build() {
    const href = () => "blog.html" + (lang() !== "en" ? "?lang=" + lang() : "");
    const edge = document.createElement("div");
    edge.className = "blog-edge"; edge.setAttribute("aria-hidden", "true");
    const tab = document.createElement("a");
    tab.className = "blog-tab" + (fine ? "" : " is-touch"); tab.href = href();
    tab.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.4 3.6a2 2 0 0 1 2.8 2.8L7 18.6 3 20l1.4-4z"/></svg>' +
      '<span class="blog-tab-t"></span><svg class="blog-tab-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
    const peek = document.createElement("div");
    peek.className = "blog-peek"; peek.setAttribute("aria-hidden", "true");
    peek.innerHTML = '<div class="blog-peek-in"><svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8h16M28 8v14L12 50a5 5 0 0 0 4.4 7.4h31.2A5 5 0 0 0 52 50L36 22V8"/><path d="M18 40h28"/></svg>' +
      '<p class="blog-peek-h"></p><p class="blog-peek-s"></p></div>';
    document.body.append(edge, tab, peek);
    const texts = () => {
      const t = T[lang()];
      tab.querySelector(".blog-tab-t").textContent = t.tab; tab.title = t.hint; tab.setAttribute("aria-label", t.tab + ": " + t.hint);
      peek.querySelector(".blog-peek-h").textContent = t.title; peek.querySelector(".blog-peek-s").textContent = t.soon;
      tab.href = href();
    };
    texts();
    new MutationObserver(texts).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    // the tab shows when the cursor reaches the right side of the window
    if (fine) {
      let raf = 0, x = 0, y = 0;
      addEventListener("mousemove", e => {
        x = e.clientX; y = e.clientY;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const near = innerWidth - x < 70 && y > innerHeight * 0.15 && y < innerHeight * 0.8;
          tab.classList.toggle("is-near", near || drag !== null);
        });
      }, { passive: true });
      document.addEventListener("mouseleave", () => { if (!drag) tab.classList.remove("is-near"); });
    }

    // dragging the blog in from the right
    let drag = null;
    const W = () => innerWidth;
    const setX = px => { peek.style.transform = "translateX(" + Math.max(0, px) + "px)"; };
    function settle(open) {
      peek.classList.add("is-settling");
      setX(open ? 0 : W());
      const done = () => {
        peek.classList.remove("is-settling");
        if (open) { dragNav = true; location.href = href(); }
        else { peek.classList.remove("is-on"); peek.style.transform = ""; document.documentElement.classList.remove("blog-dragging"); }
      };
      if (reduced) done(); else setTimeout(done, 320);
    }
    function start(e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, lastX: e.clientX, lastT: performance.now(), v: 0, el: e.currentTarget, id: e.pointerId };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {}
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = drag.x - e.clientX, dy = Math.abs(e.clientY - drag.y);
      if (!drag.moved) {
        if (dy > 12 && dy > Math.abs(dx)) { drag = null; return; }      // a vertical move: not a drag to the blog
        if (dx < 8) return;
        drag.moved = true;
        peek.classList.add("is-on"); document.documentElement.classList.add("blog-dragging");
      }
      e.preventDefault();
      const now = performance.now();
      drag.v = (drag.lastX - e.clientX) / Math.max(1, now - drag.lastT); drag.lastX = e.clientX; drag.lastT = now;
      setX(W() - Math.max(0, dx));
    }
    function end(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const d = drag; drag = null;
      if (!d.moved) return;                                              // a click: handled by the link
      const dx = d.x - (e ? e.clientX : d.lastX);
      d.el.__justDragged = true; setTimeout(() => { d.el.__justDragged = false; }, 50);
      settle(dx > W() * 0.33 || (d.v > 0.7 && dx > 80));
    }
    [edge, tab].forEach(el => {
      el.addEventListener("pointerdown", start);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", () => { if (drag && drag.moved) settle(false); drag = null; });
      el.addEventListener("dragstart", e => e.preventDefault());
    });
    // a plain click on the tab: slide the blog in, then open it
    tab.addEventListener("click", e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;          // new tab / window: let the browser do it
      e.preventDefault();
      if (tab.__justDragged) return;
      if (reduced) { location.href = href(); return; }
      peek.classList.add("is-on"); document.documentElement.classList.add("blog-dragging"); setX(W());
      requestAnimationFrame(() => requestAnimationFrame(() => settle(true)));
    });
    // coming back with the browser's back button (page restored from memory)
    addEventListener("pageshow", ev => {
      if (!ev.persisted) return;
      dragNav = false; peek.classList.remove("is-on", "is-settling"); peek.style.transform = "";
      document.documentElement.classList.remove("blog-dragging"); tab.classList.remove("is-near");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
