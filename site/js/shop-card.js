// The one product card used by the homepage (shop grid + Recently Added)
// and browse.html. Styles: Styles/shop.css (.shop-grid) and, for Recently
// Added, home.css.
//
// Whole-card link: the title is the card's one real <a>, and CSS stretches
// its ::after over the entire card (photo, title, price, button), so
// middle-click, keyboard focus and screen readers all see a single link.
// "Shop Now" is a styled <span> inside that clickable area, not a second link.
(function () {
  // Labels for listings.condition. The browse filters list these same labels.
  const CONDITION_LABELS = { new: 'New', like_new: 'Like New', used: 'Used', for_parts: 'For Parts' };

  const conditionLabel = (condition) => CONDITION_LABELS[condition] || condition;

  function build({ href, title, metaText, imageUrl }) {
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
    meta.textContent = metaText;
    article.appendChild(meta);

    const shopNow = document.createElement('span');
    shopNow.className = 'btn';
    shopNow.setAttribute('aria-hidden', 'true');
    shopNow.textContent = 'Shop Now';
    article.appendChild(shopNow);

    return article;
  }

  const price = (value) => `£${Number(value).toFixed(2)}`;

  // A card for one GET /api/listings row. showCondition: false leaves the
  // condition out of the price line (Recently Added).
  function render(listing, { root = '', showCondition = true } = {}) {
    const conditionPart = showCondition && listing.condition ? `${conditionLabel(listing.condition)} • ` : '';
    return build({
      href: `${root}listing.html?id=${encodeURIComponent(listing.id)}`,
      title: listing.title,
      metaText: `${conditionPart}${price(listing.price)}`,
      imageUrl: listing.primary_image_url,
    });
  }

  // A card with no real listing behind it (the homepage's offline fallback).
  function renderStatic({ href, title, price: value, imageUrl }) {
    return build({ href, title, metaText: price(value), imageUrl });
  }

  window.ShopCard = { render, renderStatic, conditionLabel, CONDITION_LABELS };
})();
