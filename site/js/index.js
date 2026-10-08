// Wires the homepage's "Browse by Category", "Top Sellers", "Recently
// Added", and the larger "shop results" product grid to the real backend
// (GET /api/categories, GET /api/listings?sort=newest), plus the
// hero/toolbar search boxes (real navigation to browse.html?q=..., not a
// data fetch of their own). The header and its menu are js/masthead.js.
//
// NOT wired, and flagged rather than faked: "Your Recently Viewed Items"
// (would need per-visitor view-history tracking, which doesn't exist
// anywhere -- nothing currently records that a listing was viewed) and
// "Reputable Sellers" (the fabricated "1,500+ verified sales" / "4.9/5
// average rating" stats have no real backing data -- no reviews or sales-
// ranking concept exists in the schema). Those two sections still show
// their original placeholder markup untouched.
//
// "Top Sellers" below is DIFFERENT from "Reputable Sellers" -- it doesn't
// claim any rating or sales count, just a seller name, so it's wired to a
// real (if simple) signal: sellers with the most active listings right now.

const PLACEHOLDER_ICON_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' fill='#f3f4f6'/><circle cx='8' cy='8' r='2' fill='#d1d5db'/><path d='M3 18l5-6 4 4 3-4 6 6z' fill='#d1d5db'/></svg>",
  );

async function loadHomepageCategories() {
  const section = document.getElementById('browse-by-category-section');
  const grid = document.getElementById('homepage-category-grid');
  if (!section || !grid) return;

  // A cold/unreachable backend makes fetch() reject outright -- hide the
  // section rather than leave an empty grid and an uncaught error.
  let body;
  try {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/categories');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.json();
  } catch (err) {
    console.warn('index: failed to load Browse by Category.', err);
    section.hidden = true;
    return;
  }

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

// Whole-card link: the title is the card's one real <a>, and CSS stretches
// its ::after over the entire card (photo, title, price, button), so
// middle-click, keyboard focus and screen readers all see a single link.
// "Shop Now" is a styled <span> inside that clickable area, not a second link.
function buildCard({ href, title, priceText, imageUrl }) {
  const article = document.createElement('article');
  article.className = 'product';

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = title;
    article.appendChild(img);
  } else {
    const imagePlaceholder = document.createElement('div');
    imagePlaceholder.className = 'product-image-placeholder';
    imagePlaceholder.innerHTML = '<i class="fa-solid fa-image"></i>';
    article.appendChild(imagePlaceholder);
  }

  const h3 = document.createElement('h3');
  const link = document.createElement('a');
  link.href = href;
  link.className = 'card-link';
  link.textContent = title;
  h3.appendChild(link);
  article.appendChild(h3);

  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = priceText;
  article.appendChild(meta);

  const shopNow = document.createElement('span');
  shopNow.className = 'btn';
  shopNow.setAttribute('aria-hidden', 'true');
  shopNow.textContent = 'Shop Now';
  article.appendChild(shopNow);

  return article;
}

function buildProductCard(listing) {
  return buildCard({
    href: `listing.html?id=${encodeURIComponent(listing.id)}`,
    title: listing.title,
    priceText: `£${Number(listing.price).toFixed(2)}`,
    imageUrl: listing.primary_image_url,
  });
}

// Resolves to the ids it rendered, so loadShopGrid() can leave them out
// (empty array if nothing was shown).
async function loadRecentlyAdded() {
  const track = document.getElementById('recently-added-track');
  if (!track) return [];

  // A cold or unreachable backend makes fetch() reject outright rather than
  // return a non-2xx response. Hide the whole section in that case instead
  // of leaving it stuck on "Loading...".
  const recentSection = track.closest('.recently-added');
  let listings;
  try {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/listings?sort=newest&limit=8');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    listings = body.listings || [];
  } catch (err) {
    console.warn('index: failed to load recently added listings.', err);
    if (recentSection) recentSection.hidden = true;
    return [];
  }

  if (listings.length === 0) {
    track.innerHTML = '<p class="carousel-loading">No listings yet.</p>';
    return [];
  }

  track.innerHTML = '';
  for (const listing of listings) {
    track.appendChild(buildProductCard(listing));
  }
  return listings.map((listing) => listing.id);
}

// "Top Sellers" pill row -- previously 8 hardcoded fake old-catalog-era
// business names (e.g. "Modeller's Hub • Manchester"), separate from and
// stale relative to the real listing grid below it. Reuses the same
// public GET /api/listings the shop grid already fetches (each listing
// row carries its own seller_id), tallies which sellers currently have
// the most active listings, then looks up just those sellers' real names
// via the public profiles_public view (id, display_name only -- the same
// view and pattern js/listing.js already uses for a listing's seller
// name). No city/location field exists on profiles, so unlike the old
// markup this doesn't show one rather than inventing it.
async function loadTopSellers() {
  const section = document.getElementById('top-sellers-section');
  const track = document.getElementById('top-sellers-track');
  if (!section || !track) return;

  // Same reasoning as loadRecentlyAdded(): any failure -- a rejected fetch,
  // a non-2xx response, or the profiles_public lookup below -- hides the
  // section rather than leaving "Loading..." on screen.
  try {
    await renderTopSellers(track);
  } catch (err) {
    console.warn('index: failed to load top sellers.', err);
    section.hidden = true;
  }
}

async function renderTopSellers(track) {
  const res = await window.MarketplaceAuth.fetchWithAuth('/api/listings?sort=newest&limit=50');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const listings = body.listings || [];

  const countBySeller = new Map();
  for (const listing of listings) {
    countBySeller.set(listing.seller_id, (countBySeller.get(listing.seller_id) || 0) + 1);
  }

  const topSellerIds = [...countBySeller.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([sellerId]) => sellerId);

  if (topSellerIds.length === 0) throw new Error('no active listings');

  const { data: profiles, error } = await window.MarketplaceAuth.supabaseClient
    .from('profiles_public')
    .select('id, display_name')
    .in('id', topSellerIds);

  if (error) throw error;
  if (!profiles || profiles.length === 0) throw new Error('no seller profiles found');

  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]));

  track.innerHTML = '';
  for (const sellerId of topSellerIds) {
    const name = nameById.get(sellerId);
    if (!name) continue; // profiles_public had no row for this id -- skip rather than show a blank pill
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.textContent = name;
    track.appendChild(slide);
  }
}

// The larger "shop results" grid further down the homepage -- previously
// 16 hardcoded fake products whose "Shop Now" links had no ?id= and always
// 404'd. Real data, same card markup as Recently Added. The sort dropdown
// and filter overlay above this grid are still decorative only (see the
// HTML comment) -- out of scope for this fix.
//
// FALLBACK_LISTINGS below exists because the live backend is a Railway
// project that gets suspended between billing cycles -- when that happens
// this fetch fails and the homepage would otherwise show a dead "Failed to
// load listings" message instead of a real product grid. Unlike the old
// hardcoded set this removed, these fallback cards link to browse.html
// (not a fake ?id=) so they never 404.
// recentIdsPromise: what loadRecentlyAdded() resolves to. Those listings
// are left out here so the two sections never show the same card; the
// request asks for 8 extra so the grid can still fill its 16 slots.
async function loadShopGrid(recentIdsPromise = Promise.resolve([])) {
  const grid = document.getElementById('homepage-shop-grid');
  if (!grid) return;

  try {
    const [res, recentIds] = await Promise.all([
      window.MarketplaceAuth.fetchWithAuth('/api/listings?sort=newest&limit=24'),
      recentIdsPromise.catch(() => []),
    ]);
    if (!res.ok) throw new Error(`listings request failed: ${res.status}`);

    const body = await res.json();
    const all = body.listings || [];
    if (all.length === 0) throw new Error('no listings returned');

    const shownAbove = new Set(recentIds);
    const listings = all.filter((listing) => !shownAbove.has(listing.id)).slice(0, 16);
    if (listings.length === 0) {
      // Everything live is already in Recently Added -- say so rather than
      // repeat those cards or fall back to the static ones.
      grid.innerHTML = '<p class="results-empty">That\'s everything for now. <a href="browse.html">Browse all listings</a></p>';
      return;
    }

    grid.innerHTML = '';
    for (const listing of listings) {
      grid.appendChild(buildProductCard(listing));
    }
  } catch (err) {
    console.warn('loadShopGrid: live listings unavailable, showing static fallback cards.', err);
    grid.innerHTML = '';
    for (const item of FALLBACK_LISTINGS) {
      grid.appendChild(buildFallbackCard(item));
    }
  }
}

// Real product photos already in site/Images/, reused here so the fallback
// grid looks identical in quality to live data -- just not live.
const FALLBACK_LISTINGS = [
  { title: 'Wool Herringbone Overcoat', price: 68.0, image: 'Wool Herringbone Overcoat.jpg' },
  { title: 'Tan Leather Biker Jacket', price: 54.0, image: 'Tan Leather Biker Jacket.jpg' },
  { title: 'Emerald Velvet Evening Dress', price: 42.0, image: 'Emerald Velvet Evening Dress.jpg' },
  { title: 'Structured Leather Satchel Bag', price: 36.0, image: 'Structured Leather Satchel Bag.jpg' },
  { title: 'Striped Cotton Boat-Neck Top', price: 18.0, image: 'Striped Cotton Boat-Neck Top.jpg' },
  { title: 'Wide-Leg Corduroy Trousers', price: 28.0, image: 'Wide-Leg Corduroy Trousers.jpg' },
  { title: 'Silk Pussy-Bow Blouse', price: 24.0, image: 'Silk Pussy-Bow Blouse.jpg' },
  { title: 'Brown Leather Ankle Boots', price: 46.0, image: 'Brown Leather Ankle Boots.jpg' },
  { title: 'Polka Dot Shirt Dress', price: 22.0, image: 'Polka Dot Shirt Dress.jpg' },
  { title: 'Leather Chelsea Boots', price: 38.0, image: 'Leather Chelsea Boots.jpg' },
  { title: 'Pearl Drop Earrings', price: 12.0, image: 'Pearl Drop Earrings vintage.jpg' },
  { title: "Men's Wind-Up Wristwatch", price: 32.0, image: "Men's Wind-Up Wristwatch vintage.jpg" },
  { title: 'Floral Midi Tea Dress', price: 20.0, image: 'Floral Midi Tea Dress.jpg' },
  { title: 'Pleated Tartan Mini Skirt', price: 16.0, image: 'Pleated Tartan Mini Skirt.jpg' },
  { title: 'Lace Trim Camisole Top', price: 14.0, image: 'Lace Trim Camisole top.jpg' },
  { title: 'Silk Scarf, Paisley Print', price: 10.0, image: 'Silk Scarf Paisley Print.jpg' },
];

// No real listing id behind these, so the whole card goes to browse.html.
function buildFallbackCard(item) {
  return buildCard({
    href: 'browse.html',
    title: item.title,
    priceText: `£${item.price.toFixed(2)}`,
    imageUrl: `Images/${encodeURIComponent(item.image)}`,
  });
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

  // Same as above: any failure leaves the (already hidden) ad slot hidden.
  let body;
  try {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/ad-spaces?placement=homepage-hero');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.json();
  } catch (err) {
    console.warn('index: failed to load hero ads.', err);
    container.hidden = true;
    return;
  }

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
  loadTopSellers();
  loadShopGrid(loadRecentlyAdded());
  loadHeroAds();
  wireSearchForms();
});
