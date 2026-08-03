
// ==UserScript==
// @name           Scroll with context menu open
// @description    Keeps the content context menu open so the page can scroll
// ==/UserScript==

(function () {
  const MENU_IDS = ["contentAreaContextMenu"];
  const CLOSE_ON_SCROLL = false;   // true = native-ish: menu closes when you scroll
  const DEBUG = true;

  const patched = new Set();
  let badge = null;

  function log(msg) {
    if (!DEBUG) return;
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;bottom:8px;right:8px;z-index:2147483647;background:rgba(0,0,0,.85);" +
        "color:#0ff;font:12px monospace;padding:6px 8px;border-radius:6px;" +
        "pointer-events:none;white-space:pre";
      document.documentElement.appendChild(badge);
    }
    badge.textContent = `open: ${patched.size}\n${msg}`;
  }

  const isTarget = (p) => p?.tagName === "menupopup" && MENU_IDS.includes(p.id);
  const inMenu = (node) => !!node?.closest?.("menupopup");

  function hideAll() {
    for (const p of [...patched]) {
      try { p.hidePopup(); } catch (e) {}
    }
  }

  function onMouseDown(e) {
    if (inMenu(e.composedTarget || e.target)) return;
    log("dismiss: outside click");
    hideAll();
  }

  function onKeyDown(e) {
    if (e.key !== "Escape") return;
    log("dismiss: escape");
    hideAll();
  }

  function onWheel(e) {
    if (inMenu(e.composedTarget || e.target)) return;
    log(`wheel reached chrome (dy ${Math.round(e.deltaY)})`);
    if (CLOSE_ON_SCROLL) hideAll();
  }

  function addGuards() {
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
  }

  function removeGuards() {
    window.removeEventListener("mousedown", onMouseDown, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("wheel", onWheel, true);
  }

  function init() {
    // Must be set before the popup opens, so popupshowing (not popupshown).
    document.addEventListener("popupshowing", (e) => {
      if (!isTarget(e.target)) return;
      e.target.setAttribute("noautohide", "true");
      patched.add(e.target);
      if (patched.size === 1) addGuards();
      log("menu opened (noautohide)");
    }, true);

    document.addEventListener("popuphidden", (e) => {
      if (!patched.delete(e.target)) return;
      e.target.removeAttribute("noautohide");
      if (!patched.size) removeGuards();
      log("menu closed");
    }, true);

    log("ready");
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();