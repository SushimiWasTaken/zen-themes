(function () {
  const PREF = "mod.ccs.pin_sidebar";
  const icons = {
    pinned: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="context-fill light-dark(black, white)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4a1 1 0 0 1 1 1z"/></svg>`,
    unpinned: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="context-fill light-dark(black, white)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 17v5m3-12.66V7a1 1 0 0 1 1-1a2 2 0 0 0 0-4H7.89M2 2l20 20M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"/></svg>`,
  };
  const svgToUrl = (svg) =>
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

  function init() {
    const toolbox = document.getElementById("navigator-toolbox");
    if (!toolbox) return;

    const isPinned = () => {
      try {
        return Services.prefs.getBoolPref(PREF, true);
      } catch (e) {
        return true;
      }
    };

    const keepShown = () => {
      if (!isPinned()) return;
      if (toolbox.getAttribute("zen-has-hover") !== "true") {
        toolbox.setAttribute("zen-has-hover", "true");
      }
      if (toolbox.getAttribute("zen-user-show") !== "true") {
        toolbox.setAttribute("zen-user-show", "true");
      }
    };

    let suppressHoverRemoval = false;

    const release = () => {
      toolbox.removeAttribute("zen-user-show");
      if (!suppressHoverRemoval) {
        toolbox.removeAttribute("zen-has-hover");
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
      button.addEventListener("click", () => {
        suppressHoverRemoval = true;
        toolbox.addEventListener(
          "mouseleave",
          () => {
            suppressHoverRemoval = false;
            if (!isPinned()) toolbox.removeAttribute("zen-has-hover");
          },
          { once: true }
        );
        Services.prefs.setBoolPref(PREF, !isPinned());
      });
      target.appendChild(button);
      updateIcon();
      return true;
    };

    if (!addButton()) {
      const retry = setInterval(() => {
        if (addButton()) clearInterval(retry);
      }, 300);
      setTimeout(() => clearInterval(retry), 15000);
    }

    keepShown();

    const observer = new MutationObserver(keepShown);
    observer.observe(toolbox, {
      attributes: true,
      attributeFilter: ["zen-has-hover", "zen-user-show"],
    });

    Services.prefs.addObserver(PREF, () => {
      updateIcon();
      if (isPinned()) keepShown();
      else release();
    });
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();