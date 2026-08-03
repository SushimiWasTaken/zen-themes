(function () {
  function init() {
    const toolbox = document.getElementById("navigator-toolbox");
    if (!toolbox) return;

    const keepShown = () => {
      if (toolbox.getAttribute("zen-has-hover") !== "true") {
        toolbox.setAttribute("zen-has-hover", "true");
      }
      if (toolbox.getAttribute("zen-user-show") !== "true") {
        toolbox.setAttribute("zen-user-show", "true");
      }
    };

    keepShown();

    const observer = new MutationObserver(keepShown);
    observer.observe(toolbox, {
      attributes: true,
      attributeFilter: ["zen-has-hover", "zen-user-show"],
    });
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();