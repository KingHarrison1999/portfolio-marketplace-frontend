// Wires the browse page to GET /api/categories and GET /api/listings.
// Each card's "Add to Cart" button calls the real POST /api/cart/items
// (quantity 1) and shows the real backend response inline rather than
// navigating away, so browsing isn't interrupted.
//
// KNOWN GAPS (flagged, not silently worked around):
// - "condition" has no server-side filter param, so it's applied
//   client-side against whatever page of results came back rather than
//   across the full result set. Fine for a small catalog, wrong once
//   there's enough inventory that condition-filtered results could span
//   multiple pages.
// - There's no pagination UI in the existing markup to wire, so this
//   fetches a single generous page (limit=50) rather than inventing new
//   pagination controls that weren't asked for.

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('listings-grid');
  const categoryList = document.getElementById('category-filter-list');
  const conditionList = document.getElementById('condition-filter-list');
  const priceSlider = document.getElementById('price-slider');
  const priceDisplay = document.getElementById('price-display');
  const sortSelect = document.getElementById('sort1');
  const searchForm = document.getElementById('browse-search-form');
  const searchInput = document.getElementById('browse-search-input');
  const applyBtn = document.getElementById('btn-apply-filters');
  const resetBtn = document.getElementById('btn-reset-filters');

  const floatingFilterBtn = document.getElementById('floating-filter-btn');
  const filterOverlay = document.getElementById('filter-overlay');
  const filterCloseBtn = document.querySelector('.filter-close');

  function getState() {
    const params = new URLSearchParams(window.location.search);
    return {
      category_id: params.getAll('category_id'),
      max_price: params.get('max_price') || '',
      q: params.get('q') || '',
      sort: params.get('sort') || 'newest',
      condition: params.getAll('condition'),
    };
  }

  function setState(state) {
    const params = new URLSearchParams();
    for (const c of state.category_id || []) params.append('category_id', c);
    if (state.max_price) params.set('max_price', state.max_price);
    if (state.q) params.set('q', state.q);
    if (state.sort) params.set('sort', state.sort);
    for (const c of state.condition || []) params.append('condition', c);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }

  function applyStateToForm(state) {
    if (state.max_price) {
      priceSlider.value = state.max_price;
    }
    priceDisplay.textContent = `Up to £${priceSlider.value}`;
    sortSelect.value = state.sort;
    searchInput.value = state.q;

    for (const input of categoryList.querySelectorAll('input[type="checkbox"]')) {
      input.checked = state.category_id.includes(input.value);
      input.closest('label').classList.toggle('checked', input.checked);
    }
    for (const input of conditionList.querySelectorAll('input[type="checkbox"]')) {
      input.checked = state.condition.includes(input.value);
      input.closest('label').classList.toggle('checked', input.checked);
    }
  }

  function buildCategoryLabel(cat, state) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'category_id';
    input.value = cat.id;
    input.checked = state.category_id.includes(cat.id);
    label.classList.toggle('checked', input.checked);
    input.addEventListener('change', () => {
      label.classList.toggle('checked', input.checked);
    });
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${cat.name}`));
    return label;
  }

  async function loadCategories() {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/categories');
    const existingNote = categoryList.querySelector('.filter-empty-note');
    if (existingNote) existingNote.remove();
    categoryList.querySelectorAll('.category-group').forEach((el) => el.remove());

    if (!res.ok) return;
    const body = await res.json();
    const categories = body.categories || [];

    if (categories.length === 0) {
      const note = document.createElement('p');
      note.className = 'filter-empty-note';
      note.textContent = 'No categories yet.';
      categoryList.appendChild(note);
      return;
    }

    const state = getState();

    // Group subcategories under their parent rather than listing everything
    // flat -- the backend only returns two real levels (top-level + child),
    // so that's all this groups.
    const topLevel = categories.filter((cat) => !cat.parent_id);
    const childrenByParent = new Map();
    for (const cat of categories) {
      if (!cat.parent_id) continue;
      if (!childrenByParent.has(cat.parent_id)) childrenByParent.set(cat.parent_id, []);
      childrenByParent.get(cat.parent_id).push(cat);
    }

    for (const top of topLevel) {
      const group = document.createElement('div');
      group.className = 'category-group';
      group.appendChild(buildCategoryLabel(top, state));

      const children = childrenByParent.get(top.id) || [];
      if (children.length > 0) {
        const childWrap = document.createElement('div');
        childWrap.className = 'category-children';
        for (const child of children) {
          childWrap.appendChild(buildCategoryLabel(child, state));
        }
        group.appendChild(childWrap);
      }

      categoryList.appendChild(group);
    }
  }

  function conditionLabel(condition) {
    const labels = { new: 'New', like_new: 'Like New', used: 'Used', for_parts: 'For Parts' };
    return labels[condition] || condition;
  }

  function appendImage(container, imageUrl, alt) {
    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = alt;
      container.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'product-image-placeholder';
      placeholder.innerHTML = '<i class="fa-solid fa-image"></i>';
      container.appendChild(placeholder);
    }
  }

  function renderListings(listings) {
    grid.innerHTML = '';

    if (listings.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'results-empty';
      empty.textContent = 'No listings match your filters.';
      grid.appendChild(empty);
      return;
    }

    for (const listing of listings) {
      const article = document.createElement('article');
      article.className = 'product';

      appendImage(article, listing.primary_image_url, listing.title);

      const h3 = document.createElement('h3');
      h3.textContent = listing.title;
      article.appendChild(h3);

      const meta = document.createElement('p');
      meta.className = 'meta';
      const conditionPart = listing.condition ? `${conditionLabel(listing.condition)} • ` : '';
      meta.textContent = `${conditionPart}£${Number(listing.price).toFixed(2)}`;
      article.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'product-actions';

      const addToCartBtn = document.createElement('button');
      addToCartBtn.type = 'button';
      addToCartBtn.className = 'btn';
      addToCartBtn.textContent = 'Add to Cart';
      if (listing.stock <= 0) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'Out of Stock';
      }

      const link = document.createElement('a');
      link.href = `listing.html?id=${encodeURIComponent(listing.id)}`;
      link.className = 'btn btn-outline';
      link.textContent = 'Shop Now';

      actions.appendChild(addToCartBtn);
      actions.appendChild(link);
      article.appendChild(actions);

      const messageEl = document.createElement('p');
      messageEl.className = 'product-message';
      messageEl.hidden = true;
      article.appendChild(messageEl);

      addToCartBtn.addEventListener('click', async () => {
        const session = await window.MarketplaceAuth.getSession();
        if (!session) {
          messageEl.textContent = 'Log in to add items to your cart.';
          messageEl.className = 'product-message';
          messageEl.hidden = false;
          return;
        }

        addToCartBtn.disabled = true;
        const res = await window.MarketplaceAuth.fetchWithAuth('/api/cart/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listing_id: listing.id, quantity: 1 }),
        });
        const body = await res.json();
        addToCartBtn.disabled = listing.stock <= 0 ? true : false;

        messageEl.hidden = false;
        if (!res.ok) {
          messageEl.textContent = body.error || 'Failed to add to cart.';
          messageEl.className = 'product-message';
        } else {
          messageEl.textContent = 'Added to your cart.';
          messageEl.className = 'product-message is-success';
        }
      });

      grid.appendChild(article);
    }
  }

  async function loadListings() {
    grid.innerHTML = '<p class="results-loading">Loading listings&hellip;</p>';

    const state = getState();
    const params = new URLSearchParams();
    for (const c of state.category_id) params.append('category_id', c);
    if (state.max_price) params.set('max_price', state.max_price);
    if (state.q) params.set('q', state.q);
    params.set('sort', state.sort);
    params.set('limit', '50');

    const res = await window.MarketplaceAuth.fetchWithAuth(`/api/listings?${params.toString()}`);
    if (!res.ok) {
      grid.innerHTML = '<p class="results-empty">Failed to load listings. Please try again.</p>';
      return;
    }

    const body = await res.json();
    let listings = body.listings || [];

    if (state.condition.length > 0) {
      listings = listings.filter((l) => state.condition.includes(l.condition));
    }

    renderListings(listings);
  }

  function readFormIntoState() {
    const state = getState();

    state.category_id = Array.from(categoryList.querySelectorAll('input[type="checkbox"]:checked')).map(
      (el) => el.value,
    );

    state.max_price = priceSlider.value;
    state.sort = sortSelect.value;
    state.q = searchInput.value.trim();
    state.condition = Array.from(conditionList.querySelectorAll('input[type="checkbox"]:checked')).map(
      (el) => el.value,
    );

    return state;
  }

  // --- Wiring ---

  priceSlider.addEventListener('input', () => {
    priceDisplay.textContent = `Up to £${priceSlider.value}`;
  });

  for (const input of conditionList.querySelectorAll('input[type="checkbox"]')) {
    input.addEventListener('change', () => {
      input.closest('label').classList.toggle('checked', input.checked);
    });
  }

  applyBtn.addEventListener('click', () => {
    setState(readFormIntoState());
    loadListings();
    filterOverlay.classList.remove('open');
  });

  resetBtn.addEventListener('click', () => {
    priceSlider.value = priceSlider.max;
    priceDisplay.textContent = `Up to £${priceSlider.value}`;
    searchInput.value = '';
    sortSelect.value = 'newest';
    for (const input of categoryList.querySelectorAll('input[type="checkbox"]')) {
      input.checked = false;
      input.closest('label').classList.remove('checked');
    }
    for (const input of conditionList.querySelectorAll('input[type="checkbox"]')) {
      input.checked = false;
      input.closest('label').classList.remove('checked');
    }
    setState({ category_id: [], max_price: '', q: '', sort: 'newest', condition: [] });
    loadListings();
  });

  sortSelect.addEventListener('change', () => {
    setState(readFormIntoState());
    loadListings();
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    setState(readFormIntoState());
    loadListings();
  });

  if (floatingFilterBtn && filterOverlay) {
    floatingFilterBtn.addEventListener('click', () => filterOverlay.classList.add('open'));
  }
  if (filterCloseBtn && filterOverlay) {
    filterCloseBtn.addEventListener('click', () => filterOverlay.classList.remove('open'));
  }

  // --- Init ---

  (async () => {
    await loadCategories();
    applyStateToForm(getState());
    await loadListings();
  })();
});
