// Wires the homepage's "Browse by Category", "Recently Added", and the
// larger "shop results" product grid to the real backend
// (GET /api/categories, GET /api/listings?sort=newest), plus the hero/
// toolbar/mobile-drawer search boxes (real navigation to
// browse.html?q=..., not a data fetch of their own).
//
// NOT wired, and flagged rather than faked: "Your Recently Viewed Items"
// (would need per-visitor view-history tracking, which doesn't exist
// anywhere -- nothing currently records that a listing was viewed) and
// "Top Sellers" / "Reputable Sellers" (would need a seller ranking/
// reputation concept -- no reviews or sales-ranking data exists in the
// schema). Those two sections still show their original placeholder
// markup untouched.

const PLACEHOLDER_ICON_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' fill='#f3f4f6'/><circle cx='8' cy='8' r='2' fill='#d1d5db'/><path d='M3 18l5-6 4 4 3-4 6 6z' fill='#d1d5db'/></svg>",
  );

async function loadHomepageCategories() {
  const section = document.getElementById('browse-by-category-section');
  const grid = document.getElementById('homepage-category-grid');
  if (!section || !grid) return;

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/categories');
  if (!res.ok) {
    section.hidden = true;
    return;
  }

  const body = await res.json();
  // Homepage tile is top-level-only; subcategories only show grouped in the
  // browse-page filter (js/browse.js), not flattened in here.
  const categories = (body.categories || []).filter((cat) => !cat.parent_id);

  if (categories.length === 0) {
    section.hidden = true;
    return;
  }

  grid.innerHTML = '';
  for (const cat of categories) {
    const a = document.createElement('a');
    a.href = `browse.html?category_id=${encodeURIComponent(cat.id)}`;
    a.className = 'cat';
    a.textContent = cat.name;

    const img = document.createElement('img');
    img.src = PLACEHOLDER_ICON_SVG;
    img.alt = '';
    a.appendChild(img);

    grid.appendChild(a);
  }
}

function buildProductCard(listing) {
  const article = document.createElement('article');
  article.className = 'product';

  if (listing.primary_image_url) {
    const img = document.createElement('img');
    img.src = listing.primary_image_url;
    img.alt = listing.title;
    article.appendChild(img);
  } else {
    const imagePlaceholder = document.createElement('div');
    imagePlaceholder.className = 'product-image-placeholder';
    imagePlaceholder.innerHTML = '<i class="fa-solid fa-image"></i>';
    article.appendChild(imagePlaceholder);
  }

  const h3 = document.createElement('h3');
  h3.textContent = listing.title;
  article.appendChild(h3);

  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = `£${Number(listing.price).toFixed(2)}`;
  article.appendChild(meta);

  const link = document.createElement('a');
  link.href = `listing.html?id=${encodeURIComponent(listing.id)}`;
  link.className = 'btn';
  link.textContent = 'Shop Now';
  article.appendChild(link);

  return article;
}

async function loadRecentlyAdded() {
  const track = document.getElementById('recently-added-track');
  if (!track) return;

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/listings?sort=newest&limit=8');
  if (!res.ok) {
    track.innerHTML = '<p class="carousel-loading">Failed to load listings.</p>';
    return;
  }

  const body = await res.json();
  const listings = body.listings || [];

  if (listings.length === 0) {
    track.innerHTML = '<p class="carousel-loading">No listings yet.</p>';
    return;
  }

  track.innerHTML = '';
  for (const listing of listings) {
    track.appendChild(buildProductCard(listing));
  }
}

// The larger "shop results" grid further down the homepage -- previously
// 16 hardcoded fake products whose "Shop Now" links had no ?id= and always
// 404'd. Real data, same card markup as Recently Added. The sort dropdown
// and filter overlay above this grid are still decorative only (see the
// HTML comment) -- out of scope for this fix.
async function loadShopGrid() {
  const grid = document.getElementById('homepage-shop-grid');
  if (!grid) return;

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/listings?sort=newest&limit=16');
  if (!res.ok) {
    grid.innerHTML = '<p class="carousel-loading">Failed to load listings.</p>';
    return;
  }

  const body = await res.json();
  const listings = body.listings || [];

  if (listings.length === 0) {
    grid.innerHTML = '<p class="carousel-loading">No listings yet.</p>';
    return;
  }

  grid.innerHTML = '';
  for (const listing of listings) {
    grid.appendChild(buildProductCard(listing));
  }
}

// Hero, toolbar, and mobile-drawer search boxes previously had no submit
// handler at all -- submitting just reloaded the page and dropped the
// query. All three now send the visitor to the real browse page's search
// (browse.html?q=... -- see js/browse.js reading the same param).
function wireSearchForms() {
  const forms = [
    ['hero-search-form', 'hero-search-input'],
    ['toolbar-search-form', 'toolbar-search-input'],
    ['mobile-search-form', 'mobile-search-input'],
  ];

  for (const [formId, inputId] of forms) {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    if (!form || !input) continue;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const q = input.value.trim();
      window.location.href = q ? `browse.html?q=${encodeURIComponent(q)}` : 'browse.html';
    });
  }
}

async function loadHeroAds() {
  const container = document.getElementById('homepage-hero-ads');
  if (!container) return;

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/ad-spaces?placement=homepage-hero');
  if (!res.ok) {
    container.hidden = true;
    return;
  }

  const body = await res.json();
  const adSpaces = body.ad_spaces || [];

  if (adSpaces.length === 0) {
    container.hidden = true;
    return;
  }

  container.innerHTML = '';
  for (const adSpace of adSpaces) {
    const a = document.createElement('a');
    a.className = 'ad';
    a.href = adSpace.click_through_url || '#';
    if (adSpace.click_through_url) {
      a.target = '_blank';
      a.rel = 'noreferrer noopener';
    }

    if (adSpace.image_url) {
      const img = document.createElement('img');
      img.src = adSpace.image_url;
      img.alt = adSpace.business_name || 'Advertisement';
      a.appendChild(img);
    } else {
      a.textContent = adSpace.business_name ? `Ad — ${adSpace.business_name}` : 'Ad';
    }

    container.appendChild(a);
  }
  container.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  loadHomepageCategories();
  loadRecentlyAdded();
  loadShopGrid();
  loadHeroAds();
  wireSearchForms();
});
