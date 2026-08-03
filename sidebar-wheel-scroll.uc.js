// ==UserScript==
// @name           Sidebar wheel scrolls page
// @description    Wheeling over the sidebar scrolls the active tab's page
// ==/UserScript==

(function () {
  const TAB_LIST_WINS_WHEN_OVERFLOWING = true;
  const EDGE_INSET = 4;
  const DEBUG = false;

  let badge = null, lastLine = "-", under = "-";

  function log(msg) {
    if (!DEBUG) return;
    if (msg !== undefined) lastLine = msg;
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;bottom:8px;left:8px;z-index:2147483647;background:rgba(0,0,0,.85);" +
        "color:#0f0;font:12px monospace;padding:6px 8px;border-radius:6px;" +
        "pointer-events:none;white-space:pre";
      document.documentElement.appendChild(badge);
    }
    badge.textContent = `under aim: ${under}\n${lastLine}`;
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

  function aimPoint(e, browser) {
    const r = browser.getBoundingClientRect();
    const t = document.getElementById("navigator-toolbox")?.getBoundingClientRect();

    const y = clamp(e.clientY, r.top + EDGE_INSET, r.bottom - EDGE_INSET);
    let x = clamp(e.clientX, r.left + EDGE_INSET, r.right - EDGE_INSET);

    // The pointer is in the sidebar, so unconditionally move the aim point
    // past the sidebar's far edge — clamping alone leaves it inside the
    // sidebar when the cursor is near that edge.
    if (t) {
      const sidebarOnLeft = t.left - r.left <= r.right - t.right;
      x = sidebarOnLeft ? t.right + EDGE_INSET : t.left - EDGE_INSET;
      x = clamp(x, r.left + EDGE_INSET, r.right - EDGE_INSET);
    }
    return { x, y };
  }

  function onToolboxWheel(e) {
    const browser = gBrowser?.selectedBrowser;
    if (!browser) return;

    const target = e.composedTarget || e.target;
    if (TAB_LIST_WINS_WHEN_OVERFLOWING && scrollableAncestor(target)) {
      log("tab list scrollable (ignored)");
      return;
    }

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
      log(`sidebar -> ${Math.round(x)},${Math.round(y)}`);
    } catch (err) {
      log(`ERROR: ${err}`);
    }
  }

  function init() {
    document.getElementById("navigator-toolbox")
      ?.addEventListener("wheel", onToolboxWheel, { capture: true, passive: false });

    window.addEventListener("unload", () => {
      document.getElementById("navigator-toolbox")
        ?.removeEventListener("wheel", onToolboxWheel, true);
    }, { once: true });
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();