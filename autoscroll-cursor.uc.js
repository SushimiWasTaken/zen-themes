// ==UserScript==
// @name           Autoscroll direction cursor
// @description    Up/down cursor while autoscrolling
// ==/UserScript==

(function () {
  const MODE = "panel";        // "panel" (A) or "overlay" (B)
  const DEAD_ZONE = 10;
  const DEBUG = true;

  const UP = "crosshair", DOWN = "wait", DEAD = "help";  // test glyphs

  let panel = null, anchorY = 0, lastDy = 0, badge = null, arrow = null;
  let saved = null;

  function log(msg) {
    if (!DEBUG) return;
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;top:8px;left:8px;z-index:2147483647;background:rgba(0,0,0,.8);" +
        "color:#0f0;font:12px monospace;padding:6px 8px;border-radius:6px;" +
        "pointer-events:none;white-space:pre";
      document.documentElement.appendChild(badge);
    }
    badge.textContent = msg;
  }

  function dirOf(dy) {
    return dy < -DEAD_ZONE ? "up" : dy > DEAD_ZONE ? "down" : "dead";
  }

  // ---------- Mode A: cover the window with the autoscroller panel ----------
  function expandPanel() {
    saved = {
      minWidth: panel.style.minWidth,
      minHeight: panel.style.minHeight,
      background: panel.style.background,
    };
    panel.style.setProperty("min-width", window.outerWidth + "px", "important");
    panel.style.setProperty("min-height", window.outerHeight + "px", "important");
    panel.style.setProperty("background", "transparent", "important");
    panel.style.setProperty("--autoscroll-background-image", "none", "important");
    try { panel.moveTo(window.screenX, window.screenY); } catch (e) { log("moveTo failed: " + e); }
  }

  function restorePanel() {
    if (!saved) return;
    panel.style.minWidth = saved.minWidth;
    panel.style.minHeight = saved.minHeight;
    panel.style.background = saved.background;
    panel.style.removeProperty("--autoscroll-background-image");
    saved = null;
  }

  // ---------- Mode B: our own arrow drawn over content ----------
  function stack() {
    return gBrowser?.selectedBrowser?.closest(".browserStack");
  }

  function makeArrow() {
    const host = stack();
    if (!host) return;
    arrow = document.createElement("div");
    arrow.style.cssText =
      "position:absolute;z-index:2147483647;pointer-events:none;font:20px monospace;" +
      "color:light-dark(black,white);text-shadow:0 0 3px light-dark(white,black);" +
      "transform:translate(-50%,-50%)";
    host.appendChild(arrow);
  }

  function moveArrow(e, dir) {
    if (!arrow) return;
    const r = stack()?.getBoundingClientRect();
    if (!r) return;
    arrow.style.left = e.clientX - r.left + "px";
    arrow.style.top = e.clientY - r.top + "px";
    arrow.textContent = dir === "up" ? "▲" : dir === "down" ? "▼" : "▲▼";
  }

  // ---------- shared ----------
  function onMove(e) {
    lastDy = e.screenY - anchorY;
    const dir = dirOf(lastDy);
    if (MODE === "panel") {
      const c = dir === "up" ? UP : dir === "down" ? DOWN : DEAD;
      panel?.style.setProperty("cursor", c, "important");
    } else {
      moveArrow(e, dir);
    }
    log(`mode: ${MODE}\ndy:   ${lastDy}\ndir:  ${dir}`);
  }

  function attach(p) {
    if (panel) return;
    panel = p;
    anchorY = p.screenY + p.getBoundingClientRect().height / 2;
    if (MODE === "panel") expandPanel();
    else makeArrow();
    window.addEventListener("mousemove", onMove, true);
  }

  function detach() {
    if (!panel) return;
    window.removeEventListener("mousemove", onMove, true);
    if (MODE === "panel") { panel.style.removeProperty("cursor"); restorePanel(); }
    else { arrow?.remove(); arrow = null; }
    panel = null;
  }

  function init() {
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