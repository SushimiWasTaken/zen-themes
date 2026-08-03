// ==UserScript==
// @name           Close popup on scroll
// @description    Wheeling while a popup is open dismisses it, like clicking away
// ==/UserScript==

(function () {
  // Which popups this applies to. Add ids, or set MATCH_ALL_MENUS to catch
  // every menupopup (tab context menu, bookmarks, etc).
  const MENU_IDS = ["contentAreaContextMenu"];
  const MATCH_ALL_MENUS = false;
  const IGNORE_OVER_MENU = true;   // wheeling on the menu itself scrolls it, doesn't close
  const DEBUG = true;

  const open = new Set();
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
    badge.textContent = `open: ${open.size}\n${msg}`;
  }

  const isTarget = (p) =>
    p?.tagName === "menupopup" && (MATCH_ALL_MENUS || MENU_IDS.includes(p.id));

  const inMenu = (node) => !!node?.closest?.("menupopup");

  function closeAll() {
    for (const p of [...open]) {
      try { p.hidePopup(); } catch (e) {}
    }
  }

  function onWheel(e) {
    if (!open.size) return;
    if (IGNORE_OVER_MENU && inMenu(e.composedTarget || e.target)) {
      log("over menu (left alone)");
      return;
    }
    log(`closing (dy ${Math.round(e.deltaY)})`);
    closeAll();
  }

  function addGuards() {
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
    window.addEventListener("DOMMouseScroll", onWheel, { capture: true, passive: true });
  }

  function removeGuards() {
    window.removeEventListener("wheel", onWheel, true);
    window.removeEventListener("DOMMouseScroll", onWheel, true);
  }

  function init() {
    document.addEventListener("popupshown", (e) => {
      if (!isTarget(e.target)) return;
      open.add(e.target);
      if (open.size === 1) addGuards();
      log("menu opened");
    }, true);

    document.addEventListener("popuphidden", (e) => {
      if (!open.delete(e.target)) return;
      if (!open.size) removeGuards();
      log("menu closed");
    }, true);

    log("ready");
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();