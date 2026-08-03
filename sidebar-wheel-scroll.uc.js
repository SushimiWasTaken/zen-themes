// ==UserScript==
// @name           Sidebar wheel scrolls page
// @description    Wheeling over the sidebar scrolls the active tab's page
// ==/UserScript==

(function () {
  const TAB_LIST_WINS_WHEN_OVERFLOWING = true;
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

  // Walk up from the event target looking for a chrome element that can
  // actually scroll — if one exists we leave the event alone.
  function scrollableAncestor(node) {
    for (let el = node; el && el.nodeType === 1; el = el.parentNode) {
      if (el.scrollHeight > el.clientHeight + 1) {
        const overflow = window.getComputedStyle(el).overflowY;
        if (overflow === "auto" || overflow === "scroll") return el;
      }
    }
    return null;
  }

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

    const r = browser.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;

    try {
      window.windowUtils.sendWheelEvent(
        x, y,
        e.deltaX, e.deltaY, e.deltaZ,
        e.deltaMode,
        0,                              // modifiers
        Math.round(e.deltaX),           // lineOrPageDeltaX
        Math.round(e.deltaY),           // lineOrPageDeltaY
        0                               // options
      );
      log(`forwarded: yes\ndeltaY:    ${Math.round(e.deltaY)}\nmode:      ${e.deltaMode}\nat:        ${Math.round(x)},${Math.round(y)}`);
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