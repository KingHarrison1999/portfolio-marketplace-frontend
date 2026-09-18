// Site-wide announcement banner (e.g. a raffle promo the client asked for) --
// reuses the existing ad_spaces system with placement "site-announcement",
// rendered via the real public GET /api/ad-spaces?placement=X endpoint.
//
// Distinct from the homepage-only "homepage-hero" ad slot (js/index.js):
// this renders on every public storefront page that includes both this
// script and a #site-announcement-banner container, not just the homepage.
// Admin/account/seller dashboard pages deliberately don't include it --
// it's a visitor-facing promo, not something logged-in operators need to
// see while managing the platform.
//
// Plain fetch against the full backend URL, not MarketplaceAuth.fetchWithAuth
// -- the endpoint is public (same as js/contact.js and js/newsletter.js),
// and several pages that include this script (contact, terms, 404, etc.)
// don't load auth.js at all.
//
// business_name is optional on ad_spaces (a raffle/house promo has no real
// business behind it -- owned by no one, or by the platform itself), so the
// link text falls back to a generic label when it's not set.

const SITE_ANNOUNCEMENT_API_URL =
  'https://portfolio-marketplace-backend-production.up.railway.app/api/ad-spaces?placement=site-announcement';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('site-announcement-banner');
  if (!container) return;

  const res = await fetch(SITE_ANNOUNCEMENT_API_URL);
  if (!res.ok) return;

  const body = await res.json();
  const adSpaces = body.ad_spaces || [];
  if (adSpaces.length === 0) return;

  // Only one banner slot on the page -- show the most recently created active one.
  const adSpace = adSpaces[0];

  const a = document.createElement('a');
  a.className = 'site-announcement-link';
  a.href = adSpace.click_through_url || '#';
  if (adSpace.click_through_url) {
    a.target = '_blank';
    a.rel = 'noreferrer noopener';
  }

  if (adSpace.image_url) {
    const img = document.createElement('img');
    img.src = adSpace.image_url;
    img.alt = adSpace.business_name || 'Announcement';
    a.appendChild(img);
  } else {
    const text = document.createElement('span');
    text.textContent = adSpace.business_name || '📣 New announcement -- click to find out more';
    a.appendChild(text);
  }

  container.innerHTML = '';
  container.appendChild(a);
  container.hidden = false;
});
