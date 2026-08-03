// ==UserScript==
// @name           Autoscroll direction cursor (DEBUG 2)
// @description    Distinct test cursors + multiple apply targets
// ==/UserScript==

(function () {
  const DEAD_ZONE = 10;

  // Deliberately unmistakable while testing:
  const CURSOR_UP   = "crosshair";
  const CURSOR_DOWN = "wait";
  const CURSOR_DEAD = "help";

  let panel = null, anchorY = 0, moveCount = 0, lastDy = 0, applied = "-";
  let badge = null;

  function targets() {
    return [
      document.documentElement,
      panel,
      document.getElementById("tabbrowser-tabpanels"),
      document.getElementById("browser"),
      gBrowser?.selectedBrowser,
      gBrowser?.selectedBrowser?.closest(".browserStack"),
    ].filter(Boolean);
  }

  function makeBadge() {
    badge = document.createElement("div");
    badge.style.cssText = [
      "position:fixed","top:8px","left:8px","z-index:2147483647",
      "background:rgba(0,0,0,.8)","color:#0f0","font:12px monospace",
      "padding:6px 8px","border-radius:6px","pointer-events:none","white-space:pre",
    ].join(";");
    document.documentElement.appendChild(badge);
    render();
  }

  function render() {
    if (!badge) return;
    badge.textContent =
      `panel:   ${panel ? "OPEN" : "closed"}\n` +
      `moves:   ${moveCount}\n` +
      `dy:      ${lastDy}\n` +
      `applied: ${applied}\n` +
      `targets: ${targets().length}`;
  }

  function setCursor(value) {
    applied = value || "-";
    for (const t of targets()) {
      if (value) t.style.setProperty("cursor", value, "important");
      else t.style.removeProperty("cursor");
    }
  }

  function onMove(e) {
    moveCount++;
    lastDy = e.screenY - anchorY;
    setCursor(
      lastDy < -DEAD_ZONE ? CURSOR_UP :
      lastDy >  DEAD_ZONE ? CURSOR_DOWN : CURSOR_DEAD
    );
    render();
  }

  function attach(p) {
    if (panel) return;
    panel = p;
    moveCount = 0; lastDy = 0;
    anchorY = p.screenY + p.getBoundingClientRect().height / 2;
    setCursor(CURSOR_DEAD);
    window.addEventListener("mousemove", onMove, true);
    render();
  }

  function detach() {
    if (!panel) return;
    window.removeEventListener("mousemove", onMove, true);
    setCursor("");
    panel = null;
    render();
  }

  function init() {
    makeBadge();
    document.addEventListener("popupshown", (e) => {
      if (e.target.id === "autoscroller") attach(e.target);
    }, true);
    document.addEventListener("popuphidden", (e) => {
      if (e.target.id === "autoscroller") detach();
    }, true);
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();