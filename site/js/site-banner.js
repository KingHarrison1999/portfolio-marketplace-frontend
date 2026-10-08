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
//
// Carousel: every active announcement becomes one slide (most recently
// created first, the order the endpoint returns them in). One slide shows
// at a time; the chevron buttons on either end step backwards/forwards,
// wrapping around at each end.

const SITE_ANNOUNCEMENT_API_URL =
  'https://portfolio-marketplace-backend-production.up.railway.app/api/ad-spaces?placement=site-announcement';

function buildAnnouncementSlide(adSpace) {
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

  return a;
}

function buildAnnouncementArrow(direction) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `site-announcement-arrow site-announcement-arrow-${direction}`;
  button.setAttribute('aria-label', direction === 'prev' ? 'Previous announcement' : 'Next announcement');
  button.innerHTML = `<i class="fa-solid fa-chevron-${direction === 'prev' ? 'left' : 'right'}" aria-hidden="true"></i>`;
  return button;
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('site-announcement-banner');
  if (!container) return;

  // A cold/unreachable backend makes fetch() reject outright; the banner
  // container starts hidden, so on any failure it just stays that way.
  let body;
  try {
    const res = await fetch(SITE_ANNOUNCEMENT_API_URL);
    if (!res.ok) return;
    body = await res.json();
  } catch (err) {
    console.warn('site-banner: failed to load announcements.', err);
    return;
  }

  const adSpaces = body.ad_spaces || [];
  if (adSpaces.length === 0) return;

  const track = document.createElement('div');
  track.className = 'site-announcement-track';
  track.setAttribute('aria-live', 'polite');

  const slides = adSpaces.map((adSpace, i) => {
    const slide = buildAnnouncementSlide(adSpace);
    slide.hidden = i !== 0;
    track.appendChild(slide);
    return slide;
  });

  const prev = buildAnnouncementArrow('prev');
  const next = buildAnnouncementArrow('next');

  let current = 0;
  function show(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((slide, si) => {
      slide.hidden = si !== current;
    });
  }
  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));

  container.setAttribute('role', 'region');
  container.setAttribute('aria-roledescription', 'carousel');
  container.setAttribute('aria-label', 'Announcements');
  container.innerHTML = '';
  container.append(prev, track, next);
  container.hidden = false;
});
