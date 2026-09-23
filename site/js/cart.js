// Wires the cart page to the real GET /api/cart, PATCH /api/cart/items/:id,
// and DELETE /api/cart/items/:id endpoints.
//
// KNOWN GAPS (flagged, not silently worked around):
// - GET /api/cart doesn't return listing image data (its query never joins
//   listing_images) -- every thumbnail is a placeholder.
// - "Save for later" has no backend concept anywhere (no saved-items table)
//   -- removed from the UI rather than left as a fake button.
// - Seller display name is read directly from the public profiles_public
//   view via Supabase, batched per unique seller_id in the cart -- there's
//   no seller rating/review data anywhere, so no "X% positive feedback"
//   line is shown.

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('cart-loading');
  const signinRequiredEl = document.getElementById('cart-signin-required');
  const emptyEl = document.getElementById('cart-empty');
  const layoutEl = document.getElementById('cart-layout');
  const itemsEl = document.getElementById('cart-items');
  const summaryRowsEl = document.getElementById('cart-summary-rows');
  const checkoutLink = document.getElementById('cart-checkout-link');
  const unavailableNoticeEl = document.getElementById('cart-unavailable-notice');

  function showOnly(el) {
    for (const candidate of [loadingEl, signinRequiredEl, emptyEl, layoutEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  function isAvailable(item) {
    return item.listing && item.listing.status === 'active' && item.quantity <= item.listing.stock;
  }

  // Listing titles and seller names are other users' free-text input --
  // escape before interpolating into innerHTML so they can't inject markup.
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  async function loadSellerNames(items) {
    const sellerIds = [...new Set(items.filter((i) => i.listing).map((i) => i.listing.seller_id))];
    if (sellerIds.length === 0) return new Map();

    const { data, error } = await window.MarketplaceAuth.supabaseClient
      .from('profiles_public')
      .select('id, display_name')
      .in('id', sellerIds);

    const map = new Map();
    if (!error && data) {
      for (const row of data) map.set(row.id, row.display_name || 'Unknown Seller');
    }
    return map;
  }

  function renderSummary(items) {
    const available = items.filter(isAvailable);
    const itemCount = available.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = available.reduce((sum, i) => sum + Number(i.listing.price) * i.quantity, 0);

    summaryRowsEl.innerHTML = '';

    const rows = [
      [`Item${itemCount === 1 ? '' : 's'} (${itemCount})`, `£${subtotal.toFixed(2)}`],
      ['Shipping', 'Free'],
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'order-summary-row';
      row.innerHTML = `<span>${label}</span><span>${value}</span>`;
      summaryRowsEl.appendChild(row);
    }
    const totalRow = document.createElement('div');
    totalRow.className = 'order-summary-row order-summary-total';
    totalRow.innerHTML = `<span>Subtotal</span><span>£${subtotal.toFixed(2)}</span>`;
    summaryRowsEl.appendChild(totalRow);

    const hasUnavailable = items.some((i) => !isAvailable(i));
    unavailableNoticeEl.hidden = !hasUnavailable;

    const hasAnyAvailable = available.length > 0;
    checkoutLink.classList.toggle('is-disabled', !hasAnyAvailable);
    if (!hasAnyAvailable) {
      checkoutLink.setAttribute('aria-disabled', 'true');
    } else {
      checkoutLink.removeAttribute('aria-disabled');
    }
  }

  async function refresh() {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/cart');
    if (!res.ok) {
      showOnly(emptyEl);
      emptyEl.querySelector('p').textContent = 'Failed to load your cart. Please try again.';
      return;
    }
    const body = await res.json();
    const items = body.items || [];

    if (items.length === 0) {
      showOnly(emptyEl);
      return;
    }

    const sellerNames = await loadSellerNames(items);
    renderItems(items, sellerNames);
    renderSummary(items);
    showOnly(layoutEl);
  }

  function renderItems(items, sellerNames) {
    itemsEl.innerHTML = '';

    for (const item of items) {
      const article = document.createElement('article');
      article.className = 'cart-item';
      article.dataset.itemId = item.id;

      if (!isAvailable(item)) {
        const reason = !item.listing || item.listing.status !== 'active'
          ? 'This item is no longer available.'
          : `Only ${item.listing.stock} left in stock.`;

        article.innerHTML = `
          <div class="cart-item-body">
            <div class="cart-item-thumb product-image-placeholder"><i class="fa-solid fa-image"></i></div>
            <div class="cart-item-details">
              <h3 class="cart-item-title">${item.listing ? escapeHtml(item.listing.title) : 'Listing unavailable'}</h3>
              <p class="cart-item-error is-visible">${reason}</p>
              <div class="cart-item-controls">
                <button type="button" class="cart-item-action" data-action="remove">Remove</button>
              </div>
            </div>
          </div>
        `;
        itemsEl.appendChild(article);
        wireItem(article, item);
        continue;
      }

      const sellerName = sellerNames.get(item.listing.seller_id) || 'Unknown Seller';

      article.innerHTML = `
        <div class="cart-item-seller">
          <div class="cart-item-seller-avatar"></div>
          <div>
            <div class="cart-item-seller-name">${escapeHtml(sellerName)}</div>
          </div>
        </div>
        <div class="cart-item-body">
          <div class="cart-item-thumb product-image-placeholder"><i class="fa-solid fa-image"></i></div>
          <div class="cart-item-details">
            <h3 class="cart-item-title"><a href="listing.html?id=${encodeURIComponent(item.listing.id)}">${escapeHtml(item.listing.title)}</a></h3>
            <p class="cart-item-price">£${Number(item.listing.price).toFixed(2)} each</p>
            <div class="cart-item-controls">
              <div class="cart-item-qty">
                <button type="button" class="cart-item-qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>
                <span class="cart-item-qty-value">${item.quantity}</span>
                <button type="button" class="cart-item-qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="cart-item-action" data-action="remove">Remove</button>
            </div>
            <p class="cart-item-error" hidden></p>
          </div>
        </div>
      `;
      itemsEl.appendChild(article);
      wireItem(article, item);
    }
  }

  function wireItem(article, item) {
    const errorEl = article.querySelector('.cart-item-error');
    const incBtn = article.querySelector('[data-action="inc"]');
    const decBtn = article.querySelector('[data-action="dec"]');
    const removeBtn = article.querySelector('[data-action="remove"]');

    function showError(text) {
      if (!errorEl) return;
      errorEl.textContent = text;
      errorEl.hidden = false;
      errorEl.classList.add('is-visible');
    }

    async function setQuantity(newQty) {
      const res = await window.MarketplaceAuth.fetchWithAuth(`/api/cart/items/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showError(body.error || 'Failed to update quantity.');
        return;
      }
      await refresh();
    }

    if (incBtn) {
      incBtn.addEventListener('click', () => {
        incBtn.disabled = true;
        setQuantity(item.quantity + 1).finally(() => {
          incBtn.disabled = false;
        });
      });
    }
    if (decBtn) {
      decBtn.addEventListener('click', () => {
        if (item.quantity <= 1) return;
        decBtn.disabled = true;
        setQuantity(item.quantity - 1).finally(() => {
          decBtn.disabled = false;
        });
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        removeBtn.disabled = true;
        const res = await window.MarketplaceAuth.fetchWithAuth(`/api/cart/items/${encodeURIComponent(item.id)}`, {
          method: 'DELETE',
        });
        if (!res.ok && res.status !== 204) {
          const body = await res.json().catch(() => ({}));
          showError(body.error || 'Failed to remove item.');
          removeBtn.disabled = false;
          return;
        }
        await refresh();
      });
    }
  }

  const session = await window.MarketplaceAuth.getSession();
  if (!session) {
    showOnly(signinRequiredEl);
    return;
  }

  showOnly(loadingEl);
  await refresh();
});
