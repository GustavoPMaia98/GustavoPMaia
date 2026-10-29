/* Email links without the address in the page source.
   Spam bots harvest pages for "name@domain"; here each link carries the two
   halves separately (data-user, data-domain) and the real mailto: address is
   only put together when a person points at, focuses or clicks the link.
     <a href="#" data-user="name" data-domain="example.org" data-subject="Hello">Email</a>
   Readers who hover see the address written as "name (at) example.org". */
(function () {
  "use strict";
  function address(a) { return a.dataset.user + "@" + a.dataset.domain; }
  function arm(a) {
    if (a.__mail) return;
    a.__mail = true;
    let href = "mailto:" + address(a);
    const q = [];
    if (a.dataset.subject) q.push("subject=" + encodeURIComponent(a.dataset.subject));
    if (a.dataset.body) q.push("body=" + encodeURIComponent(a.dataset.body));
    if (q.length) href += "?" + q.join("&");
    a.href = href;
  }
  function find(e) { return e.target.closest && e.target.closest("a[data-user][data-domain]"); }
  ["pointerover", "focusin", "touchstart", "click"].forEach(type =>
    document.addEventListener(type, e => { const a = find(e); if (a) arm(a); }, { passive: true, capture: true }));
  // human-readable hint on hover, e.g. "gustavopinho.maia (at) mnhn.fr"
  function hints(root) {
    (root || document).querySelectorAll("a[data-user][data-domain]").forEach(a => {
      if (!a.title || a.title === "Email") a.title = a.dataset.user + " (at) " + a.dataset.domain;
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => hints());
  else hints();
  window.SiteMail = { hints: hints };
})();
