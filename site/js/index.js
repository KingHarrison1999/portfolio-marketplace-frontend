// Wires the homepage's "Top Sellers", "Recently Added" and "Popular This
// Week" to the real backend (GET /api/listings?sort=newest, GET
// /api/listings/popular-this-week), the "Shop by Category" cards to the
// category tree, plus the hero search box (real navigation to
// browse.html?q=..., not a data fetch of its own). The header and its menu
// are js/masthead.js. The Buy / Sell, Shop by Price and Shop by Season
// sections are plain links in index.html.
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

// Cards come from js/shop-card.js (window.ShopCard), shared with browse.html.

async function loadRecentlyAdded() {
  const track = document.getElementById('recently-added-track');
  if (!track) return;

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
    return;
  }

  if (listings.length === 0) {
    track.innerHTML = '<p class="carousel-loading">No listings yet.</p>';
    return;
  }

  track.innerHTML = '';
  for (const listing of listings) {
    track.appendChild(window.ShopCard.render(listing, { showCondition: false }));
  }
}

// "Popular This Week": 8 listings ranked by units sold in the last 7 days,
// topped up with a selection that changes weekly -- the ranking is done
// server-side (GET /api/listings/popular-this-week). Same failure handling
// as Recently Added: a cold or failing backend hides the section.
async function loadPopularThisWeek() {
  const section = document.getElementById('popular-week-section');
  const track = document.getElementById('popular-week-track');
  if (!section || !track) return;

  let listings;
  try {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/listings/popular-this-week');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    listings = (await res.json()).listings || [];
  } catch (err) {
    console.warn('index: failed to load popular listings.', err);
    section.hidden = true;
    return;
  }

  if (listings.length === 0) {
    track.innerHTML = '<p class="carousel-loading">No listings yet.</p>';
    return;
  }

  track.innerHTML = '';
  for (const listing of listings) {
    track.appendChild(window.ShopCard.render(listing, { showCondition: false }));
  }
}

// Arrows for a product carousel: scroll by one card (card width + the
// track's gap). Same behaviour as Recently Added's arrows in index.html.
function wireCarouselArrows(section) {
  const track = section.querySelector('.carousel-track');
  const prev = section.querySelector('.carousel-prev');
  const next = section.querySelector('.carousel-next');
  if (!track || !prev || !next) return;
  const step = () => {
    const card = track.querySelector('.product');
    return card ? card.offsetWidth + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
}

// "Shop by Category": a card's data-category-slugs names one or more
// categories; the link gets every id in each one's subtree (listings sit in
// leaf categories and the API matches category_id exactly), the same shape
// as the masthead's category links. Until the tree loads, or if it fails,
// the cards keep their plain browse.html href.
async function wireCategoryCards() {
  const cards = document.querySelectorAll('.shop-by-category [data-category-slugs]');
  if (cards.length === 0 || !window.MarketplaceCategories) return;

  let tree;
  try {
    tree = await window.MarketplaceCategories;
  } catch (err) {
    console.warn('index: categories unavailable for Shop by Category.', err);
    return;
  }

  const bySlug = new Map([...tree.byId.values()].map((cat) => [cat.slug, cat]));
  for (const card of cards) {
    const params = new URLSearchParams();
    for (const slug of card.dataset.categorySlugs.split(' ')) {
      const cat = bySlug.get(slug);
      if (!cat) continue;
      for (const id of tree.subtreeIds(cat)) params.append('category_id', id);
    }
    if (params.toString()) card.href = `browse.html?${params.toString()}`;
  }
}

// "Top Sellers" pill row -- previously 8 hardcoded fake old-catalog-era
// business names (e.g. "Modeller's Hub • Manchester"), separate from and
// stale relative to the real listings. Uses the public GET /api/listings
// (each listing row carries its own seller_id), tallies which sellers currently have
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
    return;
  }
  wireTopSellersCarousel(section, track);
}

// Top Sellers moves by itself: a slow continuous scroll that loops with no
// visible jump (the sellers are cloned once, and the scroll wraps by exactly
// one set's width). The first click or tap anywhere on it -- either arrow or
// a seller -- stops it for good (until the page reloads); hovering doesn't.
// After that, the arrows move one seller at a time and wrap at the ends.
// No auto-scroll at all with prefers-reduced-motion.
const TOP_SELLERS_SPEED = 28; // px per second

function wireTopSellersCarousel(section, track) {
  const shell = section.querySelector('.carousel-shell');
  const buttons = section.querySelectorAll('[data-carousel-btn="top-sellers"]');
  const originals = Array.from(track.children);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let running = false;
  let frame = 0;
  let pos = 0;
  let lastTime = 0;
  let clones = [];

  // Width of one full set of sellers, gap included: where the clones start.
  const loopWidth = () => (clones.length ? clones[0].offsetLeft - originals[0].offsetLeft : 0);

  function tick(time) {
    if (!running) return;
    const dt = lastTime ? Math.min(time - lastTime, 100) : 0;
    lastTime = time;
    // Someone scrolled it by other means (trackpad, wheel): carry on from there.
    if (Math.abs(track.scrollLeft - pos) > 2) pos = track.scrollLeft;
    pos += (TOP_SELLERS_SPEED * dt) / 1000;
    const width = loopWidth();
    if (width > 0 && pos >= width) pos -= width;
    track.scrollLeft = pos;
    frame = requestAnimationFrame(tick);
  }

  function start() {
    // Nothing to scroll if every seller already fits.
    if (track.scrollWidth <= track.clientWidth + 1) return;
    clones = originals.map((slide) => {
      const clone = slide.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.classList.add('is-clone');
      return clone;
    });
    clones.forEach((clone) => track.appendChild(clone));
    track.classList.add('is-auto-scrolling');
    pos = track.scrollLeft;
    running = true;
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frame);
    // Back into the original set at the same visual spot, then drop the clones.
    const width = loopWidth();
    let left = track.scrollLeft;
    if (width > 0 && left >= width) left -= width;
    clones.forEach((clone) => clone.remove());
    clones = [];
    track.classList.remove('is-auto-scrolling');
    track.scrollTo({ left, behavior: 'instant' });
  }

  // Slide offsets within the track, for one-step arrow moves.
  const slideLefts = () => originals.map((slide) => slide.offsetLeft - originals[0].offsetLeft);

  function step(direction) {
    const max = track.scrollWidth - track.clientWidth;
    const current = track.scrollLeft;
    const lefts = slideLefts().map((left) => Math.min(left, max));
    let target;
    if (direction > 0) {
      target = current >= max - 1 ? 0 : lefts.find((left) => left > current + 1);
      if (target === undefined) target = max;
    } else {
      target = current <= 1 ? max : [...lefts].reverse().find((left) => left < current - 1);
      if (target === undefined) target = 0;
    }
    track.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  shell.addEventListener('pointerdown', stop);
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      stop(); // keyboard activation has no pointerdown
      step(btn.dataset.dir === 'next' ? 1 : -1);
    });
  });

  if (!reduceMotion) start();
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

  // Up to 20, so every seller with an active listing shows (there are 10).
  const topSellerIds = [...countBySeller.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
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

// The hero search box sends the visitor to the real browse page's search
// (browse.html?q=... -- see js/browse.js reading the same param).
function wireSearchForms() {
  const form = document.getElementById('hero-search-form');
  const input = document.getElementById('hero-search-input');
  if (!form || !input) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = input.value.trim();
    window.location.href = q ? `browse.html?q=${encodeURIComponent(q)}` : 'browse.html';
  });
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
  loadTopSellers();
  loadRecentlyAdded();
  loadPopularThisWeek();
  const popular = document.getElementById('popular-week-section');
  if (popular) wireCarouselArrows(popular);
  wireCategoryCards();
  loadHeroAds();
  wireSearchForms();
});
