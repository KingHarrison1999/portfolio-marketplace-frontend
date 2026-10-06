// Shared light/dark toggle wiring, used on every page that has a
// .mode-toggle button. Reading the stored preference back on load (to
// avoid a flash of the wrong theme) is a separate, tiny inline script at
// the top of each page's <body> -- this file only wires the click handler
// and keeps aria-pressed in sync, and persists the choice so it carries
// across page navigation.
(function () {
  function init() {
    const body = document.body;
    const toggle = document.querySelector('.mode-toggle');
    if (!toggle) return;

    function updateToggleState() {
      const isDark = body.classList.contains('theme-dark');
      toggle.setAttribute('aria-pressed', isDark);
    }

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      body.classList.toggle('theme-dark');
      const isDark = body.classList.contains('theme-dark');
      try {
        localStorage.setItem('marketplace-theme', isDark ? 'dark' : 'light');
      } catch (err) {
        // Storage unavailable (private browsing, disabled) -- the toggle
        // still works for this page load, it just won't carry over.
      }
      updateToggleState();
    });

    updateToggleState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
