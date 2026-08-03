// ==UserScript==
// @name           Scroll with context menu open
// @description    Keeps the content context menu open and scrolls the page under it
// ==/UserScript==

(function () {
  const MENU_IDS = ["contentAreaContextMenu"];
  const FORWARD_WHEEL_OVER_MENU = true;
  const MENU_SCROLLS_ITSELF_WHEN_OVERFLOWING = false;
  const CLOSE_ON_SCROLL = false;
  const EDGE_INSET = 4;
  const DEBUG = true;

  const patched = new Set();
  let badge = null, synthesizing = false, lastLine = "-", under = "-";

  function log(msg) {
    if (!DEBUG) return;
    if (msg !== undefined) lastLine = msg;
    if (!badge) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;bottom:8px;right:8px;z-index:2147483647;background:rgba(0,0,0,.85);" +
        "color:#0ff;font:12px monospace;padding:6px 8px;border-radius:6px;" +
        "pointer-events:none;white-space:pre";
      document.documentElement.appendChild(badge);
    }
    badge.textContent = `open:      ${patched.size}\nunder aim: ${under}\n${lastLine}`;
  }

  const isTarget = (p) => p?.tagName === "menupopup" && MENU_IDS.includes(p.id);
  const inMenu = (node) => !!node?.closest?.("menupopup");
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Popups can be OS-level widgets, so derive client coords from screen coords.
  function popupRect(p) {
    const r = p.getBoundingClientRect();
    return {
      left: p.screenX - window.mozInnerScreenX,
      top: p.screenY - window.mozInnerScreenY,
      width: r.width,
      height: r.height,
      get right() { return this.left + this.width; },
      get bottom() { return this.top + this.height; },
    };
  }

  function blockers() {
    const list = [];
    const tb = document.getElementById("navigator-toolbox");
    if (tb) list.push(tb.getBoundingClientRect());
    for (const p of document.querySelectorAll("menupopup[panelopen='true'], menupopup[open='true']")) {
      try { list.push(popupRect(p)); } catch (e) {}
    }
    for (const p of patched) {
      try { list.push(popupRect(p)); } catch (e) {}
    }
    return list;
  }

  function aimPoint(e, browser) {
    const r = browser.getBoundingClientRect();
    let x = clamp(e.clientX, r.left + EDGE_INSET, r.right - EDGE_INSET);
    const y = clamp(e.clientY, r.top + EDGE_INSET, r.bottom - EDGE_INSET);

    // Push x clear of anything floating over the page at this y.
    for (let i = 0; i < 6; i++) {
      const hit = blockers().find(
        (b) => x >= b.left - EDGE_INSET && x <= b.right + EDGE_INSET &&
               y >= b.top && y <= b.bottom
      );
      if (!hit) break;
      const roomLeft = hit.left - r.left;
      const roomRight = r.right - hit.right;
      x = roomRight >= roomLeft ? hit.right + EDGE_INSET : hit.left - EDGE_INSET;
      x = clamp(x, r.left + EDGE_INSET, r.right - EDGE_INSET);
    }
    return { x, y };
  }

  function forward(e) {
    const browser = gBrowser?.selectedBrowser;
    if (!browser) return;

    e.preventDefault();
    e.stopPropagation();

    const { x, y } = aimPoint(e, browser);
    const el = document.elementFromPoint(x, y);
    under = el ? (el.id || el.localName || "?") : "null";

    synthesizing = true;
    try {
      window.windowUtils.sendWheelEvent(
        x, y, e.deltaX, e.deltaY, e.deltaZ, e.deltaMode, 0,
        Math.round(e.deltaX), Math.round(e.deltaY), 0
      );
      log(`forwarded -> ${Math.round(x)},${Math.round(y)}`);
    } catch (err) {
      log(`ERROR: ${err}`);
    } finally {
      synthesizing = false;
    }
  }

  function menuOverflows(node) {
    const sb = node?.closest?.("menupopup")?.scrollBox;
    return sb ? sb.scrollHeight > sb.clientHeight + 1 : false;
  }

  function onWheel(e) {
    if (synthesizing) return;
    if (!patched.size) return;

    const target = e.composedTarget || e.target;

    if (inMenu(target)) {
      if (!FORWARD_WHEEL_OVER_MENU) return;
      if (MENU_SCROLLS_ITSELF_WHEN_OVERFLOWING && menuOverflows(target)) {
        log("menu overflows (ignored)");
        return;
      }
      forward(e);
      return;
    }

    log(`native scroll (dy ${Math.round(e.deltaY)})`);
    if (CLOSE_ON_SCROLL) hideAll();
  }

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
    if (e.key === "Escape") { log("dismiss: escape"); hideAll(); }
  }

  function addGuards() {
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  }

  function removeGuards() {
    window.removeEventListener("mousedown", onMouseDown, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("wheel", onWheel, true);
  }

  function init() {
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