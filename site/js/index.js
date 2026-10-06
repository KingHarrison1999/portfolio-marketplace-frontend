// Wires the homepage's global nav (desktop mega-menu + mobile drawer),
// "Browse by Category", "Top Sellers", "Recently Added", and the larger
// "shop results" product grid to the real backend (GET /api/categories,
// GET /api/listings?sort=newest), plus the hero/toolbar/mobile-drawer
// search boxes (real navigation to browse.html?q=..., not a data fetch of
// their own).
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

// Global nav -- desktop mega-menu, the .offcanvas mobile-nav, AND the
// .mobile-drawer's accordion menu (three separate copies of the same menu
// in this markup). All three previously had the same 9 hardcoded old-catalog
// category names with href="#" links that went nowhere. Wired to the same
// GET /api/categories the "Browse by Category" section above uses, via
// its own independent fetch (same one-section-one-fetch pattern as every
// other loader in this file). A top-level category only gets the
// dropdown/accordion treatment if it actually has children in the data --
// none of the current categories do, so all three menus render as flat
// link lists for now, but this will pick up real subcategories
// automatically if any get added later.
async function loadNavCategories() {
  const desktopMenu = document.getElementById('global-nav-menu');
  const mobileMenu = document.getElementById('mobile-nav-menu');
  const drawerMenu = document.getElementById('drawer-nav-menu');
  if (!desktopMenu && !mobileMenu && !drawerMenu) return;

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/categories');
  if (!res.ok) return; // leave both menus empty rather than guessing

  const body = await res.json();
  const categories = body.categories || [];
  const topLevel = categories.filter((cat) => !cat.parent_id);

  const childrenByParent = new Map();
  for (const cat of categories) {
    if (!cat.parent_id) continue;
    if (!childrenByParent.has(cat.parent_id)) childrenByParent.set(cat.parent_id, []);
    childrenByParent.get(cat.parent_id).push(cat);
  }

  function categoryLink(cat) {
    const a = document.createElement('a');
    a.href = `browse.html?category_id=${encodeURIComponent(cat.id)}`;
    a.textContent = cat.name;
    return a;
  }

  if (desktopMenu) {
    desktopMenu.innerHTML = '';
    for (const cat of topLevel) {
      const li = document.createElement('li');
      li.appendChild(categoryLink(cat));

      const children = childrenByParent.get(cat.id);
      if (children && children.length > 0) {
        li.className = 'has-dropdown';
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown';
        const ul = document.createElement('ul');
        for (const child of children) {
          const childLi = document.createElement('li');
          childLi.appendChild(categoryLink(child));
          ul.appendChild(childLi);
        }
        dropdown.appendChild(ul);
        li.appendChild(dropdown);
      }

      desktopMenu.appendChild(li);
    }
  }

  if (mobileMenu) {
    mobileMenu.innerHTML = '';
    for (const cat of topLevel) {
      const li = document.createElement('li');
      li.appendChild(categoryLink(cat));
      mobileMenu.appendChild(li);
    }
  }

  if (drawerMenu) {
    drawerMenu.innerHTML = '';
    for (const cat of topLevel) {
      const li = document.createElement('li');
      const children = childrenByParent.get(cat.id);

      if (children && children.length > 0) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = cat.name;
        details.appendChild(summary);

        const ul = document.createElement('ul');
        for (const child of children) {
          const childLi = document.createElement('li');
          childLi.appendChild(categoryLink(child));
          ul.appendChild(childLi);
        }
        details.appendChild(ul);
        li.appendChild(details);
      } else {
        li.appendChild(categoryLink(cat));
      }

      drawerMenu.appendChild(li);
    }
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

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/listings?sort=newest&limit=50');
  if (!res.ok) {
    section.hidden = true;
    return;
  }

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

  if (topSellerIds.length === 0) {
    section.hidden = true;
    return;
  }

  const { data: profiles, error } = await window.MarketplaceAuth.supabaseClient
    .from('profiles_public')
    .select('id, display_name')
    .in('id', topSellerIds);

  if (error || !profiles || profiles.length === 0) {
    section.hidden = true;
    return;
  }

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
async function loadShopGrid() {
  const grid = document.getElementById('homepage-shop-grid');
  if (!grid) return;

  try {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/listings?sort=newest&limit=16');
    if (!res.ok) throw new Error(`listings request failed: ${res.status}`);

    const body = await res.json();
    const listings = body.listings || [];
    if (listings.length === 0) throw new Error('no listings returned');

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

function buildFallbackCard(item) {
  const article = document.createElement('article');
  article.className = 'product';

  const img = document.createElement('img');
  img.src = `Images/${encodeURIComponent(item.image)}`;
  img.alt = item.title;
  article.appendChild(img);

  const h3 = document.createElement('h3');
  h3.textContent = item.title;
  article.appendChild(h3);

  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = `£${item.price.toFixed(2)}`;
  article.appendChild(meta);

  const link = document.createElement('a');
  link.href = 'browse.html';
  link.className = 'btn';
  link.textContent = 'Shop Now';
  article.appendChild(link);

  return article;
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
  loadNavCategories();
  loadHomepageCategories();
  loadTopSellers();
  loadRecentlyAdded();
  loadShopGrid();
  loadHeroAds();
  wireSearchForms();
});
