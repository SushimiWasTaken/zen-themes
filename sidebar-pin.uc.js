(function () {
  const PREF = "mod.ccs.pin_sidebar";

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

    const release = () => {
      toolbox.removeAttribute("zen-has-hover");
      toolbox.removeAttribute("zen-user-show");
    };

    keepShown();

    const observer = new MutationObserver(keepShown);
    observer.observe(toolbox, {
      attributes: true,
      attributeFilter: ["zen-has-hover", "zen-user-show"],
    });

    Services.prefs.addObserver(PREF, () => {
      if (isPinned()) keepShown();
      else release();
    });
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();