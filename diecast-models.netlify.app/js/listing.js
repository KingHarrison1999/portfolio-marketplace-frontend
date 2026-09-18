// Wires the listing detail page to GET /api/listings/:id.
//
// KNOWN GAPS (flagged, not silently worked around):
// - Seller display name is read directly from the public profiles_public
//   view via Supabase (not the Express API) -- that view was built
//   specifically for this purpose. There's no seller rating/review data
//   anywhere in the schema, so the old "100% positive · 250 sales" mock
//   stat has no real replacement and was removed rather than faked.
// - "Similar Items" has no dedicated backend endpoint -- this reuses
//   GET /api/listings?category_id=... (same category, excluding the
//   current listing) as a reasonable, honest stand-in for a real
//   recommendation feature, which doesn't exist.
// - Add to Cart calls the real POST /api/cart/items and stays on this page;
//   Buy It Now does the same then goes straight to checkout.html (skipping
//   the cart), rather than the old stubs that just linked to cart.html
//   without adding anything. Make Offer / Add to Wishlist are still
//   disabled -- no offers or wishlist concept exists anywhere in the
//   backend.

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('listing-loading');
  const notFoundEl = document.getElementById('listing-not-found');
  const detailEl = document.getElementById('product-detail');
  const similarSection = document.getElementById('similar-items-section');
  const similarCards = document.getElementById('similar-items-cards');

  function showNotFound() {
    loadingEl.hidden = true;
    detailEl.hidden = true;
    similarSection.hidden = true;
    notFoundEl.hidden = false;
  }

  function conditionLabel(condition) {
    const labels = { new: 'New', like_new: 'Like New', used: 'Used', for_parts: 'For Parts' };
    return labels[condition] || condition;
  }

  function renderGallery(images, title) {
    const mainEl = document.getElementById('listing-gallery-main');
    const thumbsEl = document.getElementById('listing-gallery-thumbs');

    function showImage(url) {
      mainEl.innerHTML = '';
      if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = title;
        mainEl.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'product-image-placeholder';
        placeholder.innerHTML = '<i class="fa-solid fa-image"></i>';
        mainEl.appendChild(placeholder);
      }
    }

    if (!images || images.length === 0) {
      thumbsEl.hidden = true;
      thumbsEl.innerHTML = '';
      showImage(null);
      return;
    }

    showImage(images[0].url);

    if (images.length === 1) {
      thumbsEl.hidden = true;
      thumbsEl.innerHTML = '';
      return;
    }

    thumbsEl.innerHTML = '';
    thumbsEl.hidden = false;
    images.forEach((image, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'product-gallery-thumb' + (index === 0 ? ' active' : '');
      const img = document.createElement('img');
      img.src = image.url;
      img.alt = `${title} — image ${index + 1}`;
      btn.appendChild(img);
      btn.addEventListener('click', () => {
        showImage(image.url);
        thumbsEl.querySelectorAll('.product-gallery-thumb').forEach((el) => el.classList.remove('active'));
        btn.classList.add('active');
      });
      thumbsEl.appendChild(btn);
    });
  }

  function renderListing(listing) {
    document.title = `${listing.title} — Marketplace`;

    renderGallery(listing.images, listing.title);
    document.getElementById('listing-title').textContent = listing.title;
    document.getElementById('listing-price').textContent = `£${Number(listing.price).toFixed(2)}`;
    document.getElementById('listing-description').textContent =
      listing.description || 'No description provided for this listing.';
    document.getElementById('listing-condition').textContent = listing.condition
      ? `Condition: ${conditionLabel(listing.condition)}`
      : '';
    document.getElementById('listing-stock').textContent =
      listing.stock > 0 ? `${listing.stock} available` : 'Out of stock';

    const quantityInput = document.getElementById('quantity');
    quantityInput.max = String(Math.max(listing.stock, 1));
    if (listing.stock <= 0) {
      quantityInput.disabled = true;
    }

    const buyNowLink = document.getElementById('buy-now-link');
    const addToCartLink = document.getElementById('add-to-cart-link');
    if (listing.stock <= 0) {
      for (const link of [buyNowLink, addToCartLink]) {
        link.classList.add('is-disabled');
        link.setAttribute('aria-disabled', 'true');
        link.addEventListener('click', (event) => event.preventDefault());
        link.textContent = 'Out of Stock';
      }
    }

    loadingEl.hidden = true;
    detailEl.hidden = false;
  }

  async function loadSellerName(sellerId) {
    const sellerNameEl = document.getElementById('listing-seller-name');
    const { data, error } = await window.MarketplaceAuth.supabaseClient
      .from('profiles_public')
      .select('display_name')
      .eq('id', sellerId)
      .maybeSingle();

    if (error || !data || !data.display_name) {
      sellerNameEl.textContent = 'Unknown Seller';
      return;
    }
    sellerNameEl.textContent = data.display_name;
  }

  function wireAddToCart(listing) {
    if (listing.stock <= 0) return; // already disabled by renderListing()

    const buyNowLink = document.getElementById('buy-now-link');
    const addToCartLink = document.getElementById('add-to-cart-link');
    const quantityInput = document.getElementById('quantity');
    const messageEl = document.getElementById('purchase-panel-message');

    function showMessage(text, type) {
      messageEl.textContent = text;
      messageEl.className = `form-message is-visible form-message-${type}`;
    }

    async function addToCart() {
      const session = await window.MarketplaceAuth.getSession();
      if (!session) {
        showMessage('Please log in to add items to your cart.', 'error');
        return { ok: false };
      }

      const quantity = Math.max(parseInt(quantityInput.value, 10) || 1, 1);
      const res = await window.MarketplaceAuth.fetchWithAuth('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id, quantity }),
      });
      const body = await res.json();

      if (!res.ok) {
        showMessage(body.error || 'Failed to add to cart.', 'error');
        return { ok: false };
      }

      return { ok: true };
    }

    addToCartLink.addEventListener('click', async (event) => {
      event.preventDefault();
      addToCartLink.classList.add('is-disabled');
      const { ok } = await addToCart();
      addToCartLink.classList.remove('is-disabled');
      if (ok) {
        showMessage('Added to your cart.', 'success');
      }
    });

    buyNowLink.addEventListener('click', async (event) => {
      event.preventDefault();
      buyNowLink.classList.add('is-disabled');
      const { ok } = await addToCart();
      buyNowLink.classList.remove('is-disabled');
      if (ok) {
        window.location.href = '../checkout.html';
      }
    });
  }

  function renderSimilarItems(listings) {
    if (listings.length === 0) {
      similarSection.hidden = true;
      return;
    }

    similarCards.innerHTML = '';
    for (const listing of listings) {
      const link = document.createElement('a');
      link.href = `listing.html?id=${encodeURIComponent(listing.id)}`;
      link.className = 'product-card';

      if (listing.primary_image_url) {
        const img = document.createElement('img');
        img.src = listing.primary_image_url;
        img.alt = listing.title;
        link.appendChild(img);
      } else {
        const imagePlaceholder = document.createElement('div');
        imagePlaceholder.className = 'product-image-placeholder';
        imagePlaceholder.innerHTML = '<i class="fa-solid fa-image"></i>';
        link.appendChild(imagePlaceholder);
      }

      const textWrap = document.createElement('div');
      const h3 = document.createElement('h3');
      h3.textContent = listing.title;
      const p = document.createElement('p');
      p.textContent = `£${Number(listing.price).toFixed(2)}`;
      textWrap.appendChild(h3);
      textWrap.appendChild(p);
      link.appendChild(textWrap);

      similarCards.appendChild(link);
    }

    similarSection.hidden = false;
  }

  async function loadSimilarItems(listing) {
    if (!listing.category_id) {
      similarSection.hidden = true;
      return;
    }

    const params = new URLSearchParams({ category_id: listing.category_id, limit: '5' });
    const res = await window.MarketplaceAuth.fetchWithAuth(`/api/listings?${params.toString()}`);
    if (!res.ok) {
      similarSection.hidden = true;
      return;
    }

    const body = await res.json();
    const others = (body.listings || []).filter((l) => l.id !== listing.id).slice(0, 4);
    renderSimilarItems(others);
  }

  const params = new URLSearchParams(window.location.search);
  const listingId = params.get('id');

  if (!listingId) {
    showNotFound();
    return;
  }

  const res = await window.MarketplaceAuth.fetchWithAuth(`/api/listings/${encodeURIComponent(listingId)}`);
  if (!res.ok) {
    showNotFound();
    return;
  }

  const { listing } = await res.json();
  renderListing(listing);
  loadSellerName(listing.seller_id);
  loadSimilarItems(listing);
  wireAddToCart(listing);
});
