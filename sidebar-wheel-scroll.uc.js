// ==UserScript==
// @name           Sidebar wheel scrolls page
// @description    Wheel over the sidebar scrolls the page (+ menu-open probe)
// ==/UserScript==

(function () {
  const TAB_LIST_WINS_WHEN_OVERFLOWING = true;
  const EDGE_INSET = 2;
  const DEBUG = true;

  const openMenus = new Set();
  const hits = { wheel: 0, legacy: 0, onPopup: 0, onPopupLegacy: 0 };
  let badge = null, lastLine = "-";

  function log(extra) {
    if (!DEBUG) return;
    if (extra !== undefined) lastLine = extra;
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;bottom:8px;left:8px;z-index:2147483647;background:rgba(0,0,0,.8);" +
        "color:#0f0;font:12px monospace;padding:6px 8px;border-radius:6px;" +
        "pointer-events:none;white-space:pre";
      document.documentElement.appendChild(badge);
    }
    badge.textContent =
      `menus open:   ${openMenus.size}\n` +
      `win wheel:    ${hits.wheel}\n` +
      `win legacy:   ${hits.legacy}\n` +
      `popup wheel:  ${hits.onPopup}\n` +
      `popup legacy: ${hits.onPopupLegacy}\n` +
      `${lastLine}`;
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
      log(`${reason} -> ${Math.round(x)},${Math.round(y)}`);
    } catch (err) {
      log(`ERROR: ${err}`);
    }
  }

  // --- sidebar: listener lives ON the toolbox, so no closest() test needed ---
  function onToolboxWheel(e) {
    const target = e.composedTarget || e.target;
    if (TAB_LIST_WINS_WHEN_OVERFLOWING && scrollableAncestor(target)) {
      log("tab list scrollable (ignored)");
      return;
    }
    forward(e, "sidebar");
  }

  // --- probe: is anything dispatched anywhere while a menu is open? ---
  function probe(kind) {
    return () => { hits[kind]++; log(); };
  }

  function init() {
    const toolbox = document.getElementById("navigator-toolbox");
    if (toolbox) {
      toolbox.addEventListener("wheel", onToolboxWheel, { capture: true, passive: false });
    }

    window.addEventListener("wheel", probe("wheel"), { capture: true, passive: true });
    window.addEventListener("DOMMouseScroll", probe("legacy"), { capture: true, passive: true });

    document.addEventListener("popupshown", (e) => {
      if (e.target.tagName !== "menupopup") return;
      openMenus.add(e.target);
      e.target.addEventListener("wheel", probe("onPopup"), { capture: true, passive: true });
      e.target.addEventListener("DOMMouseScroll", probe("onPopupLegacy"), { capture: true, passive: true });
      log("menu opened");
    }, true);

    document.addEventListener("popuphidden", (e) => {
      if (openMenus.delete(e.target)) log("menu closed");
    }, true);

    log("ready");
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();