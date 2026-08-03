(function () {
  const PREF = "mod.ccs.pin_sidebar";
  const ATTR = "ccs-pinned";
  const SHORTCUT_KEY = "D";
  const SHORTCUT_MODIFIERS = "accel,shift";
  const icons = {
    pinned: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="context-fill light-dark(black, white)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4a1 1 0 0 1 1 1z"/></svg>`,
    unpinned: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="context-fill light-dark(black, white)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 17v5m3-12.66V7a1 1 0 0 1 1-1a2 2 0 0 0 0-4H7.89M2 2l20 20M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"/></svg>`,
  };
  const svgToUrl = (svg) =>
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  function init() {
    const toolbox = document.getElementById("navigator-toolbox");
    if (!toolbox) return;

    // Inject CSS that neutralizes Zen's compact-mode hiding while pinned.
    if (!document.getElementById("ccs-pin-style")) {
      const style = document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "style"
      );
      style.id = "ccs-pin-style";
      style.textContent = `
        #navigator-toolbox[${ATTR}] {
          margin-left: 0 !important;
          margin-right: 0 !important;
          transform: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
      `;
      document.documentElement.appendChild(style);
    }

    const isPinned = () => {
      try {
        return Services.prefs.getBoolPref(PREF, true);
      } catch (e) {
        return true;
      }
    };

    const toggle = () => Services.prefs.setBoolPref(PREF, !isPinned());

    const pin = () => toolbox.setAttribute(ATTR, "true");

    let leaveArmed = false;
    const unpin = () => {
      // If the cursor is over the sidebar, keep the override until the
      // mouse leaves, then let Zen collapse it once, normally.
      if (toolbox.matches(":hover")) {
        if (leaveArmed) return;
        leaveArmed = true;
        toolbox.addEventListener(
          "mouseleave",
          () => {
            leaveArmed = false;
            if (!isPinned()) toolbox.removeAttribute(ATTR);
          },
          { once: true }
        );
      } else {
        toolbox.removeAttribute(ATTR);
      }
    };

    let button = null;
    const updateIcon = () => {
      if (!button) return;
      const icon = isPinned() ? icons.pinned : icons.unpinned;
      button.setAttribute("image", svgToUrl(icon));
      button.setAttribute(
        "tooltiptext",
        isPinned() ? "Unpin sidebar" : "Pin sidebar"
      );
    };

    const addButton = () => {
      if (document.getElementById("ccs-pin-toggle")) return true;
      const target = document.getElementById("zen-sidebar-foot-buttons");
      if (!target) return false;
      button = document.createXULElement("toolbarbutton");
      button.id = "ccs-pin-toggle";
      button.className = "toolbarbutton-1 chromeclass-toolbar-additional";
      button.addEventListener("click", toggle);
      target.appendChild(button);
      updateIcon();
      return true;
    };

    const addShortcut = () => {
      if (document.getElementById("ccs-pin-key")) return;
      const keyset =
        document.getElementById("mainKeyset") ||
        document.querySelector("keyset");
      if (!keyset) return;
      const key = document.createXULElement("key");
      key.id = "ccs-pin-key";
      key.setAttribute("key", SHORTCUT_KEY);
      key.setAttribute("modifiers", SHORTCUT_MODIFIERS);
      key.addEventListener("command", toggle);
      keyset.appendChild(key);
      // Dynamically added keys aren't always registered until the keyset
      // is re-inserted; this forces the key map to rebuild.
      keyset.parentNode.appendChild(keyset);
    };

    if (!addButton()) {
      const retry = setInterval(() => {
        if (addButton()) clearInterval(retry);
      }, 300);
      setTimeout(() => clearInterval(retry), 15000);
    }

    addShortcut();

    if (isPinned()) pin();

    Services.prefs.addObserver(PREF, () => {
      updateIcon();
      if (isPinned()) pin();
      else unpin();
    });
  }
  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();