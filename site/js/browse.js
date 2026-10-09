// Wires the browse page to GET /api/listings. The URL is the state:
//   ?q=  &sort=  &category_id= (repeated)  &season= (repeated)  &min_price=  &max_price=
//   &condition= (repeated)
// The masthead's category links, the homepage and the floating search
// panel all link here with those params.
//
// - Filters: the shared sidebar from js/shop-filters.js (1024px and wider),
//   applied as they change. Below 1024px the same filters live in the
//   floating search panel (js/masthead.js), which reloads this page.
// - Cards: the homepage's shop grid card, from js/shop-card.js.
// - Heading and document.title say what the page is filtered by.
//
// KNOWN GAPS (flagged, not silently worked around):
// - "condition" has no server-side filter param, so it's applied
//   client-side against whatever page of results came back rather than
//   across the full result set (see ShopFilters.fetchListings). Fine for a
//   small catalog.
// - There's no pagination UI, so this fetches a single generous page
//   (limit=50).

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('listings-grid');
  const heading = document.getElementById('browse-title');
  const sortSelect = document.getElementById('sort1');
  const searchForm = document.getElementById('browse-search-form');
  const searchInput = document.getElementById('browse-search-input');
  const SORTS = ['newest', 'price_asc', 'price_desc'];

  function getState() {
    const params = new URLSearchParams(window.location.search);
    const sort = params.get('sort');
    return {
      filters: window.ShopFilters.fromParams(params),
      q: (params.get('q') || '').trim(),
      sort: SORTS.includes(sort) ? sort : 'newest',
    };
  }

  function setState({ filters, q, sort }) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (sort && sort !== 'newest') params.set('sort', sort);
    window.ShopFilters.toParams(filters, params);
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }

  // "Browse All" with no filters; otherwise what the page is filtered by.
  async function updateHeading(state) {
    const tree = await window.ShopFilters.categoryTree().catch(() => null);
    const text = window.ShopFilters.describe(state.filters, state.q, tree);
    heading.textContent = text;
    document.title = `${text} — Marketplace`;
  }

  function renderListings(listings, state) {
    grid.innerHTML = '';

    if (listings.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'results-empty';
      empty.textContent = 'Nothing here yet. New items are added all the time. ';
      const filtered = state.q || !window.ShopFilters.isEmpty(state.filters);
      if (filtered) {
        const link = document.createElement('a');
        link.href = 'browse.html';
        link.textContent = 'Browse All';
        empty.appendChild(link);
      }
      grid.appendChild(empty);
      return;
    }

    for (const listing of listings) grid.appendChild(window.ShopCard.render(listing));
  }

  let requestId = 0;

  async function loadListings() {
    const thisRequest = ++requestId;
    const state = getState();
    updateHeading(state);
    grid.innerHTML = '<p class="results-loading">Loading listings&hellip;</p>';

    // Any failure, HTTP or network-level (the Railway backend is suspended
    // between billing cycles), shows an explicit message instead of hanging
    // on "Loading listings...".
    try {
      const listings = await window.ShopFilters.fetchListings(state.filters, { q: state.q, sort: state.sort });
      if (thisRequest !== requestId) return; // a newer change won
      renderListings(listings, state);
    } catch (err) {
      if (thisRequest !== requestId) return;
      console.warn('loadListings: failed to load listings.', err);
      grid.innerHTML = '<p class="results-empty">Failed to load listings. Please try again.</p>';
    }
  }

  // --- Wiring ---

  const initial = getState();
  sortSelect.value = initial.sort;
  searchInput.value = initial.q;

  window.ShopFilters.mount(document.getElementById('browse-filters'), {
    idPrefix: 'browse-filters',
    state: initial.filters,
    onChange: (filters) => {
      setState({ ...getState(), filters });
      loadListings();
    },
  });

  sortSelect.addEventListener('change', () => {
    setState({ ...getState(), sort: sortSelect.value });
    loadListings();
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    setState({ ...getState(), q: searchInput.value.trim() });
    loadListings();
  });

  loadListings();
});
