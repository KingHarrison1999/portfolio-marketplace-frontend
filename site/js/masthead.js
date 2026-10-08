// Behaviour for the homepage-style masthead on pages other than index.html
// (listing.html so far). index.html wires the same markup with its own
// inline script + js/index.js; this is the standalone equivalent:
// - hamburger -> off-canvas menu (open, close button, backdrop click, Esc)
// - masthead search -> browse.html?q=...
// - off-canvas category list from GET /api/categories (top level only)

document.addEventListener('DOMContentLoaded', () => {
  const oc = document.getElementById('offcanvas');
  const closeBtn = oc ? oc.querySelector('.close') : null;
  const hamburger = document.getElementById('hamburger-1');

  function openMenu() {
    if (!oc) return;
    oc.classList.add('open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  }

  function closeMenu() {
    if (!oc || !oc.classList.contains('open')) return;
    oc.classList.remove('open');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.focus();
    }
    document.body.style.overflow = '';
  }

  if (hamburger) hamburger.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (oc) {
    oc.addEventListener('click', (e) => {
      if (e.target === oc) closeMenu();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  const form = document.getElementById('masthead-search-form');
  const input = document.getElementById('masthead-search-input');
  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      window.location.href = q ? `browse.html?q=${encodeURIComponent(q)}` : 'browse.html';
    });
  }

  loadMenuCategories();
});

async function loadMenuCategories() {
  const menu = document.getElementById('mobile-nav-menu');
  if (!menu) return;

  try {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/categories');
    if (!res.ok) return; // leave the menu empty rather than guessing
    const body = await res.json();
    const topLevel = (body.categories || []).filter((cat) => !cat.parent_id);

    menu.innerHTML = '';
    for (const cat of topLevel) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `browse.html?category_id=${encodeURIComponent(cat.id)}`;
      a.textContent = cat.name;
      li.appendChild(a);
      menu.appendChild(li);
    }
  } catch (err) {
    console.warn('masthead: failed to load menu categories.', err);
  }
}
