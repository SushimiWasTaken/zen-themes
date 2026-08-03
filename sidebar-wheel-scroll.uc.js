// ==UserScript==
// @name           Sidebar wheel scrolls page
// @description    Wheel over the sidebar scrolls the page (+ menu probe)
// ==/UserScript==

(function () {
  const TAB_LIST_WINS_WHEN_OVERFLOWING = true;
  const EDGE_INSET = 4;
  const DEBUG = true;

  const openMenus = new Set();
  const hits = { toolbox: 0, sent: 0, winWheel: 0, winLegacy: 0, popup: 0, popupLegacy: 0 };
  let badge = null, lastLine = "-", under = "-";

  function log(extra) {
    if (!DEBUG) return;
    if (extra !== undefined) lastLine = extra;
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;bottom:8px;left:8px;z-index:2147483647;background:rgba(0,0,0,.85);" +
        "color:#0f0;font:12px monospace;padding:6px 8px;border-radius:6px;" +
        "pointer-events:none;white-space:pre";
      document.documentElement.appendChild(badge);
    }
    badge.textContent =
      `toolbox hit:  ${hits.toolbox}\n` +
      `sent:         ${hits.sent}\n` +
      `under aim:    ${under}\n` +
      `menus open:   ${openMenus.size}\n` +
      `win wheel:    ${hits.winWheel}   legacy: ${hits.winLegacy}\n` +
      `popup wheel:  ${hits.popup}   legacy: ${hits.popupLegacy}\n` +
      `${lastLine}`;
  }

  function scrollableAncestor(node) {
    for (let el = node; el && el.nodeType === 1; el = el.parentNode) {
      if (el.scrollHeight > el.clientHeight + 1) {
        const o = window.getComputedStyle(el).overflowY;
        if (o === "auto" || o === "scroll") return el;
      }
    }
    return null;
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Cursor position projected into the content area, then pushed clear of
  // the toolbox if the toolbox floats over that spot.
  function aimPoint(e, browser) {
    const r = browser.getBoundingClientRect();
    const t = document.getElementById("navigator-toolbox")?.getBoundingClientRect();

    let x = clamp(e.clientX, r.left + EDGE_INSET, r.right - EDGE_INSET);
    const y = clamp(e.clientY, r.top + EDGE_INSET, r.bottom - EDGE_INSET);

    if (t && x >= t.left && x <= t.right && y >= t.top && y <= t.bottom) {
      const sidebarOnLeft = t.left - r.left <= r.right - t.right;
      x = sidebarOnLeft ? t.right + EDGE_INSET : t.left - EDGE_INSET;
      x = clamp(x, r.left + EDGE_INSET, r.right - EDGE_INSET);
    }
    return { x, y };
  }

  function forward(e, reason) {
    const browser = gBrowser?.selectedBrowser;
    if (!browser) return;

    e.preventDefault();
    e.stopPropagation();

    const { x, y } = aimPoint(e, browser);

    const el = document.elementFromPoint(x, y);
    under = el ? (el.id || el.localName || "?") : "null";

    try {
      window.windowUtils.sendWheelEvent(
        x, y, e.deltaX, e.deltaY, e.deltaZ, e.deltaMode, 0,
        Math.round(e.deltaX), Math.round(e.deltaY), 0
      );
      hits.sent++;
      log(`${reason} -> ${Math.round(x)},${Math.round(y)}`);
    } catch (err) {
      log(`ERROR: ${err}`);
    }
  }

  function onToolboxWheel(e) {
    hits.toolbox++;
    const target = e.composedTarget || e.target;
    if (TAB_LIST_WINS_WHEN_OVERFLOWING && scrollableAncestor(target)) {
      log("tab list scrollable (ignored)");
      return;
    }
    forward(e, "sidebar");
  }

  const probe = (k) => () => { hits[k]++; log(); };

  function init() {
    document.getElementById("navigator-toolbox")
      ?.addEventListener("wheel", onToolboxWheel, { capture: true, passive: false });

    window.addEventListener("wheel", probe("winWheel"), { capture: true, passive: true });
    window.addEventListener("DOMMouseScroll", probe("winLegacy"), { capture: true, passive: true });

    document.addEventListener("popupshown", (e) => {
      if (e.target.tagName !== "menupopup") return;
      openMenus.add(e.target);
      e.target.addEventListener("wheel", probe("popup"), { capture: true, passive: true });
      e.target.addEventListener("DOMMouseScroll", probe("popupLegacy"), { capture: true, passive: true });
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