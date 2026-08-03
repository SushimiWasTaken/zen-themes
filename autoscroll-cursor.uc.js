// ==UserScript==
// @name           Autoscroll direction cursor
// @description    Changes the cursor to up/down arrows while autoscrolling
// @include        main
// ==/UserScript==

(function () {
  const DEAD_ZONE = 10; // px around the anchor where no scrolling happens

  const doc = document;
  let anchorY = 0;
  let panel = null;

  function setCursor(value) {
    const targets = [doc.documentElement, panel].filter(Boolean);
    for (const t of targets) {
      if (value) t.style.setProperty("cursor", value, "important");
      else t.style.removeProperty("cursor");
    }
  }

  function onMove(e) {
    const dy = e.screenY - anchorY;
    const c =
      dy < -DEAD_ZONE ? "n-resize" :
      dy >  DEAD_ZONE ? "s-resize" :
      "ns-resize";
    setCursor(c);
  }

  // #autoscroller is created lazily on the first middle-click,
  // so listen for its popup events at the document level
  doc.addEventListener("popupshown", (e) => {
    if (e.target.id !== "autoscroller") return;
    panel = e.target;
    anchorY = panel.screenY + panel.getBoundingClientRect().height / 2;
    setCursor("ns-resize");
    window.addEventListener("mousemove", onMove, true);
  });

  doc.addEventListener("popuphidden", (e) => {
    if (e.target.id !== "autoscroller") return;
    window.removeEventListener("mousemove", onMove, true);
    setCursor("");
  });
})();