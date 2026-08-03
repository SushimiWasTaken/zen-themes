// ==UserScript==
// @name           Sidebar wheel scrolls page
// @description    Wheel over the sidebar (or with a menu open) scrolls the page
// ==/UserScript==

(function () {
  const TAB_LIST_WINS_WHEN_OVERFLOWING = true;
  const SCROLL_WITH_MENU_OPEN = true;
  const CLOSE_MENU_ON_SCROLL = false;  // flip if the menu hanging around looks wrong
  const EDGE_INSET = 2;
  const DEBUG = true;

  const openMenus = new Set();
  let seen = 0, forwarded = 0, badge = null;

  function log(extra) {
    if (!DEBUG) return;
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;bottom:8px;left:8px;z-index:2147483647;background:rgba(0,0,0,.8);" +
        "color:#0f0;font:12px monospace;padding:6px 8px;border-radius:6px;" +
        "pointer-events:none;white-space:pre";
      document.documentElement.appendChild(badge);
    }
    badge.textContent =
      `menus open: ${openMenus.size}\n` +
      `wheel seen: ${seen}\n` +
      `forwarded:  ${forwarded}\n` + extra;
  }

  function scrollableAncestor(node) {
    for (let el = node; el && el.nodeType === 1; el = el.parentNode) {
      if (el.scrollHeight > el.clientHeight + 1) {
        const overflow = window.getComputedStyle(el).overflowY;
        if (overflow === "auto" || overflow === "scroll") return el;
      }
    }
    return null;
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function forward(e, reason) {
    const browser = gBrowser?.selectedBrowser;
    if (!browser) return;

    e.preventDefault();
    e.stopPropagation();

    const r = browser.getBoundingClientRect();
    const x = clamp(e.clientX, r.left + EDGE_INSET, r.right - EDGE_INSET);
    const y = clamp(e.clientY, r.top + EDGE_INSET, r.bottom - EDGE_INSET);

    try {
      window.windowUtils.sendWheelEvent(
        x, y, e.deltaX, e.deltaY, e.deltaZ, e.deltaMode, 0,
        Math.round(e.deltaX), Math.round(e.deltaY), 0
      );
      forwarded++;
      log(`reason:     ${reason}\naimed at:   ${Math.round(x)},${Math.round(y)}`);
    } catch (err) {
      log(`reason:     ${reason}\nERROR:      ${err}`);
    }
  }

  function onWheel(e) {
    seen++;
    const target = e.composedTarget || e.target;

    // Pointer over an open menu: let the menu scroll itself.
    if (target?.closest?.("menupopup, panel")) {
      log(`reason:     over menu (ignored)`);
      return;
    }

    if (SCROLL_WITH_MENU_OPEN && openMenus.size) {
      if (CLOSE_MENU_ON_SCROLL) {
        for (const m of [...openMenus]) m.hidePopup();
        log(`reason:     menu closed on scroll`);
        return;   // let the native scroll happen once the menu is gone
      }
      forward(e, "menu open");
      return;
    }

    // Pointer over the sidebar / toolbox.
    if (target?.closest?.("#navigator-toolbox")) {
      if (TAB_LIST_WINS_WHEN_OVERFLOWING && scrollableAncestor(target)) {
        log(`reason:     tab list scrollable (ignored)`);
        return;
      }
      forward(e, "sidebar");
    }
  }

  function init() {
    document.addEventListener("popupshown", (e) => {
      if (e.target.tagName === "menupopup") { openMenus.add(e.target); log("reason:     -"); }
    }, true);

    document.addEventListener("popuphidden", (e) => {
      if (openMenus.delete(e.target)) log("reason:     -");
    }, true);

    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("unload", () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
    }, { once: true });
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();