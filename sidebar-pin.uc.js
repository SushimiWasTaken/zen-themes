(function () {
  function init() {
    const toolbox = document.getElementById("navigator-toolbox");
    if (!toolbox) return;

    const keepShown = () => {
      toolbox.setAttribute("zen-has-hover", "true");
    };

    keepShown();
    setInterval(keepShown, 200);
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();