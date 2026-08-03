// ==UserScript==
// @name           Sidebar wheel scrolls page
// @description    Wheeling over the sidebar scrolls the active tab's page
// ==/UserScript==

(function () {
  const TAB_LIST_WINS_WHEN_OVERFLOWING = true;
  const EDGE_INSET = 2;   // px inside the content edge we clamp to
  const DEBUG = true;

  let badge = null;

  function log(msg) {
    if (!DEBUG) return;
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;bottom:8px;left:8px;z-index:2147483647;background:rgba(0,0,0,.8);" +
        "color:#0f0;font:12px monospace;padding:6px 8px;border-radius:6px;" +
        "pointer-events:none;white-space:pre";
      document.documentElement.appendChild(badge);
    }
    badge.textContent = msg;
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

  function onWheel(e) {
    const browser = gBrowser?.selectedBrowser;
    if (!browser) return;

    if (TAB_LIST_WINS_WHEN_OVERFLOWING) {
      const scrollable = scrollableAncestor(e.composedTarget || e.target);
      if (scrollable) {
        log(`forwarded: no\nreason:    tab list scrollable`);
        return;
      }
    }

    e.preventDefault();
    e.stopPropagation();

    // Project the real cursor position onto the nearest point inside the
    // content area — i.e. where the pointer would be if the sidebar
    // weren't occupying that space. Keeps the cursor's y exactly, and
    // works for a left- or right-hand sidebar without special-casing.
    const r = browser.getBoundingClientRect();
    const x = clamp(e.clientX, r.left + EDGE_INSET, r.right - EDGE_INSET);
    const y = clamp(e.clientY, r.top + EDGE_INSET, r.bottom - EDGE_INSET);

    try {
      window.windowUtils.sendWheelEvent(
        x, y,
        e.deltaX, e.deltaY, e.deltaZ,
        e.deltaMode,
        0,
        Math.round(e.deltaX),
        Math.round(e.deltaY),
        0
      );
      log(`forwarded: yes\ndeltaY:    ${Math.round(e.deltaY)}\ncursor:    ${Math.round(e.clientX)},${Math.round(e.clientY)}\naimed at:  ${Math.round(x)},${Math.round(y)}`);
    } catch (err) {
      log(`forwarded: FAILED\nerror:     ${err}`);
    }
  }

  function init() {
    const toolbox = document.getElementById("navigator-toolbox");
    if (!toolbox) return;
    toolbox.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("unload", () => {
      toolbox.removeEventListener("wheel", onWheel, { capture: true });
    }, { once: true });
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();