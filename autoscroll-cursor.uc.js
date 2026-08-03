// ==UserScript==
// @name           Autoscroll direction cursor (DEBUG)
// @description    Instrumented build - reports autoscroll event state on screen
// ==/UserScript==

(function () {
  const DEAD_ZONE = 10;

  let panel = null;
  let anchorY = 0;
  let moveCount = 0;
  let lastDy = 0;
  let detectedVia = "-";
  let badge = null;

  function makeBadge() {
    badge = document.createElement("div");
    badge.id = "ccs-autoscroll-debug";
    badge.style.cssText = [
      "position:fixed", "top:8px", "left:8px", "z-index:2147483647",
      "background:rgba(0,0,0,.8)", "color:#0f0", "font:12px monospace",
      "padding:6px 8px", "border-radius:6px", "pointer-events:none",
      "white-space:pre",
    ].join(";");
    document.documentElement.appendChild(badge);
    render();
  }

  function render() {
    if (!badge) return;
    badge.textContent =
      `script: LOADED\n` +
      `panel:  ${panel ? "OPEN" : "closed"}\n` +
      `via:    ${detectedVia}\n` +
      `moves:  ${moveCount}\n` +
      `dy:     ${lastDy}`;
  }

  function setCursor(value) {
    for (const t of [document.documentElement, panel].filter(Boolean)) {
      if (value) t.style.setProperty("cursor", value, "important");
      else t.style.removeProperty("cursor");
    }
  }

  function onMove(e) {
    moveCount++;
    lastDy = e.screenY - anchorY;
    setCursor(
      lastDy < -DEAD_ZONE ? "n-resize" :
      lastDy >  DEAD_ZONE ? "s-resize" : "ns-resize"
    );
    render();
  }

  function attach(p, via) {
    if (panel) return;
    panel = p;
    detectedVia = via;
    moveCount = 0;
    lastDy = 0;
    anchorY = p.screenY + p.getBoundingClientRect().height / 2;
    setCursor("ns-resize");
    window.addEventListener("mousemove", onMove, true);
    p.addEventListener("mousemove", onMove, true);
    render();
  }

  function detach() {
    if (!panel) return;
    window.removeEventListener("mousemove", onMove, true);
    panel.removeEventListener("mousemove", onMove, true);
    setCursor("");
    panel = null;
    render();
  }

  function isAutoscroller(el) {
    return el && (el.id === "autoscroller" || el.classList?.contains("autoscroller"));
  }

  function init() {
    makeBadge();

    document.addEventListener("popupshown", (e) => {
      if (isAutoscroller(e.target)) attach(e.target, "popupshown");
    }, true);

    document.addEventListener("popuphidden", (e) => {
      if (isAutoscroller(e.target)) detach();
    }, true);

    // Fallback: catch the panel being appended, in case popupshown never fires
    new MutationObserver((records) => {
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (isAutoscroller(n)) setTimeout(() => attach(n, "mutation"), 0);
        }
        for (const n of r.removedNodes) {
          if (isAutoscroller(n)) detach();
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();