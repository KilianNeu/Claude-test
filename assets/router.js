(function () {
  "use strict";
  const WB = (window.WB = window.WB || {});
  const pages = [...document.querySelectorAll(".page")];
  const links = [...document.querySelectorAll("#navlinks a")];
  const nav = document.querySelector(".topnav");
  const names = pages.map((p) => p.dataset.page);
  const DEFAULT = "aktuell";

  function pageFromHash(hash) {
    const h = (hash || "").replace(/^#/, "");
    if (names.includes(h)) return h;
    if (/^spieler-\d+$/.test(h)) return "aktuell"; // Direktlink auf einen Spieler
    return null;
  }

  function showPage(name, opts) {
    if (!names.includes(name)) name = DEFAULT;
    const cur = pages.find((p) => !p.hidden);
    const changed = !cur || cur.dataset.page !== name;
    pages.forEach((p) => { p.hidden = p.dataset.page !== name; });
    links.forEach((a) => {
      const on = a.getAttribute("href") === "#" + name;
      a.classList.toggle("active", on);
      if (on) {
        a.setAttribute("aria-current", "page");
        const box = a.parentElement;
        box.scrollTo({ left: a.offsetLeft - (box.clientWidth - a.offsetWidth) / 2, behavior: "smooth" });
      } else a.removeAttribute("aria-current");
    });
    if (changed) {
      // Diagramme messen ihre Breite beim Zeichnen, versteckte Seiten haben keine
      window.dispatchEvent(new Event("resize"));
      if (!(opts && opts.keepScroll) && nav && window.scrollY > nav.offsetTop) window.scrollTo({ top: nav.offsetTop, behavior: "auto" });
    }
  }
  WB.showPage = showPage;

  function go(name, push) {
    showPage(name);
    if (push) { try { history.pushState({ page: name }, "", "#" + name); } catch (e) { /* Rahmen erlaubt das nicht */ } }
  }

  links.forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    go(a.getAttribute("href").slice(1), true);
  }));
  const brand = document.querySelector(".brand");
  if (brand) brand.addEventListener("click", (e) => { e.preventDefault(); go(DEFAULT, true); window.scrollTo({ top: 0 }); });

  function fromHash(initial) {
    showPage(pageFromHash(location.hash) || DEFAULT, { keepScroll: true });
    // Link auf einen Spieler, während die Seite schon offen ist: Steckbrief öffnen
    const m = /^#spieler-(\d+)$/.exec(location.hash);
    if (m && initial !== true && WB.focusPlayer) WB.focusPlayer(+m[1], true);
  }
  window.addEventListener("popstate", () => fromHash());
  window.addEventListener("hashchange", () => fromHash());
  fromHash(true);
})();
