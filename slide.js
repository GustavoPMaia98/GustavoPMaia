/* slide.js: the website and the Blog page sit side by side on one sky.
   - The Blog button in the top bar slides the website out to the left and the blog in
     from the right (cross-page View Transitions where the browser has them); going
     back slides the other way.
   - The blog page continues the sky where the website left it (scenes3d.js, SiteSpace.keep).
   The slide itself is in ui-extra.css. */
(function () {
  "use strict";
  const isBlog = u => /\/blog\.html$/.test(new URL(u, location.href).pathname);

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
    const to = e.activation.entry.url;
    if (!isBlog(to) && !isBlog(location.href)) return;
    try { e.viewTransition.types.add(isBlog(to) ? "slide-forward" : "slide-back"); } catch (x) {}
  });
  // browsers without pageswap: keep the sky when following a link between the two pages
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (a && (isBlog(a.href) || (isBlog(location.href) && new URL(a.href, location.href).origin === location.origin)) && window.SiteSpace && SiteSpace.keep) SiteSpace.keep();
  });

})();
