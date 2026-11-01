/* slide.js: the website and the Blog page sit side by side. Going to the blog slides the
   website out to the left and the blog in from the right; going back slides the other
   way. Uses the browser's cross-page View Transitions (Chrome, Edge, Safari 18.2+;
   others simply open the page). The animation itself is in ui-extra.css. */
(function () {
  "use strict";
  const isBlog = u => /\/blog\.html$/.test(new URL(u, location.href).pathname);
  // on the page that opens: going to the blog = forward, coming back from it = back
  addEventListener("pagereveal", e => {
    if (!e.viewTransition) return;
    let from = "";
    try { from = navigation.activation && navigation.activation.from ? navigation.activation.from.url : ""; } catch (x) {}
    if (!isBlog(location.href) && !(from && isBlog(from))) return;      // only between the website and the blog
    const back = !isBlog(location.href);
    try { e.viewTransition.types.add(back ? "slide-back" : "slide-forward"); } catch (x) {}
  });
  addEventListener("pageswap", e => {
    if (!e.viewTransition || !e.activation) return;
    const to = e.activation.entry.url;
    if (!isBlog(to) && !isBlog(location.href)) return;
    try { e.viewTransition.types.add(isBlog(to) ? "slide-forward" : "slide-back"); } catch (x) {}
  });
})();
