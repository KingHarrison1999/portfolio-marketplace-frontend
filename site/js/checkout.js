// Wires checkout to the real GET /api/cart, /api/addresses, and
// POST /api/checkout endpoints.
//
// KNOWN GAPS (flagged, not silently worked around):
// - Payment isn't wired here on purpose -- POST /api/checkout only creates
//   real pending_payment order(s); POST /api/checkout/pay (Optimise
//   Payments) is a separate, still-unfinished step. The payment section
//   below is an honest notice, not a card form that would collect details
//   nothing consumes.
// - No shipping/tax line items exist anywhere in the schema, so the
//   summary only ever shows Subtotal + a real "Free" shipping line (there
//   genuinely is no shipping charge) + Total equal to Subtotal.

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('checkout-loading');
  const signinRequiredEl = document.getElementById('checkout-signin-required');
  const emptyEl = document.getElementById('checkout-empty');
  const layoutEl = document.getElementById('checkout-layout');

  const addressListEl = document.getElementById('checkout-address-list');
  const addAddressBtn = document.getElementById('checkout-add-address-btn');
  const addressFormEl = document.getElementById('checkout-address-form');
  const cancelAddressBtn = document.getElementById('checkout-cancel-address-btn');
  const addressMessageEl = document.getElementById('checkout-address-message');

  const summaryItemsEl = document.getElementById('checkout-summary-items');
  const summaryRowsEl = document.getElementById('checkout-summary-rows');
  const placeOrderBtn = document.getElementById('checkout-place-order-btn');
  const formMessageEl = document.getElementById('checkout-form-message');

  function showOnly(el) {
    for (const candidate of [loadingEl, signinRequiredEl, emptyEl, layoutEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = `form-message is-visible form-message-${type}`;
  }

  function isAvailable(item) {
    return item.listing && item.listing.status === 'active' && item.quantity <= item.listing.stock;
  }

  // Listing titles are other users' free-text input -- escape before
  // interpolating into innerHTML so they can't inject markup.
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  let cartItems = [];
  let addresses = [];
  let selectedAddressId = null;

  function renderAddresses() {
    addressListEl.innerHTML = '';

    if (addresses.length === 0) {
      const note = document.createElement('p');
      note.className = 'address-empty-note';
      note.textContent = 'You have no saved addresses yet. Add one below.';
      addressListEl.appendChild(note);
      addressFormEl.hidden = false;
      addAddressBtn.hidden = true;
      return;
    }

    addAddressBtn.hidden = false;

    for (const address of addresses) {
      const label = document.createElement('label');
      label.className = 'address-card';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'checkout-address';
      radio.value = address.id;
      radio.checked = address.id === selectedAddressId;
      radio.addEventListener('change', () => {
        selectedAddressId = address.id;
      });

      const lines = document.createElement('div');
      lines.className = 'address-card-lines';
      const lineText = window.MarketplaceAddresses.formatAddressLines(address).join(', ');
      lines.textContent = lineText;
      if (address.is_default) {
        const badge = document.createElement('span');
        badge.className = 'address-card-default-badge';
        badge.textContent = 'Default';
        lines.appendChild(document.createTextNode(' '));
        lines.appendChild(badge);
      }

      label.appendChild(radio);
      label.appendChild(lines);
      addressListEl.appendChild(label);
    }
  }

  async function loadAddresses() {
    const { addresses: data, error } = await window.MarketplaceAddresses.fetchAddresses();
    if (error) {
      addressListEl.innerHTML = `<p class="address-empty-note">${error}</p>`;
      return;
    }
    addresses = data;
    if (!selectedAddressId) {
      const defaultAddress = addresses.find((a) => a.is_default);
      selectedAddressId = defaultAddress ? defaultAddress.id : addresses[0]?.id || null;
    }
    renderAddresses();
  }

  addAddressBtn.addEventListener('click', () => {
    addressFormEl.hidden = false;
    addAddressBtn.hidden = true;
  });

  cancelAddressBtn.addEventListener('click', () => {
    addressFormEl.hidden = true;
    addAddressBtn.hidden = false;
    addressFormEl.reset();
  });

  addressFormEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = addressFormEl.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const fields = {
      line1: document.getElementById('checkout-address-line1').value.trim(),
      line2: document.getElementById('checkout-address-line2').value.trim() || undefined,
      city: document.getElementById('checkout-address-city').value.trim(),
      postcode: document.getElementById('checkout-address-postcode').value.trim(),
      country: document.getElementById('checkout-address-country').value,
    };

    const { address, error } = await window.MarketplaceAddresses.createAddress(fields);
    submitBtn.disabled = false;

    if (error) {
      showMessage(addressMessageEl, error, 'error');
      return;
    }

    addressMessageEl.className = 'form-message';
    selectedAddressId = address.id;
    addressFormEl.hidden = true;
    addressFormEl.reset();
    await loadAddresses();
  });

  function renderSummary() {
    const available = cartItems.filter(isAvailable);

    summaryItemsEl.innerHTML = '';
    for (const item of available) {
      const row = document.createElement('div');
      row.className = 'order-summary-item';
      row.innerHTML = `
        <span class="order-summary-item-name">${escapeHtml(item.listing.title)} <span class="order-summary-item-qty">&times;${item.quantity}</span></span>
        <span class="order-summary-item-price">£${(Number(item.listing.price) * item.quantity).toFixed(2)}</span>
      `;
      summaryItemsEl.appendChild(row);
    }

    const subtotal = available.reduce((sum, i) => sum + Number(i.listing.price) * i.quantity, 0);
    summaryRowsEl.innerHTML = `
      <div class="order-summary-row"><span>Subtotal</span><span>£${subtotal.toFixed(2)}</span></div>
      <div class="order-summary-row"><span>Shipping</span><span>Free</span></div>
      <div class="order-summary-row order-summary-total"><span>Total</span><span>£${subtotal.toFixed(2)}</span></div>
    `;

    const hasUnavailable = cartItems.some((i) => !isAvailable(i));
    if (hasUnavailable) {
      showMessage(
        formMessageEl,
        'One or more items in your cart are no longer available in the requested quantity. Update your cart before placing this order.',
        'error',
      );
      placeOrderBtn.disabled = true;
    }
  }

  placeOrderBtn.addEventListener('click', async () => {
    if (!selectedAddressId) {
      showMessage(formMessageEl, 'Select or add a shipping address first.', 'error');
      return;
    }

    placeOrderBtn.disabled = true;
    formMessageEl.className = 'form-message';

    const res = await window.MarketplaceAuth.fetchWithAuth('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipping_address_id: selectedAddressId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showMessage(formMessageEl, body.error || 'Failed to place order.', 'error');
      placeOrderBtn.disabled = false;
      return;
    }

    const body = await res.json();
    window.location.href = `order-confirmation.html?checkout_group_id=${encodeURIComponent(body.checkout_group_id)}`;
  });

  const session = await window.MarketplaceAuth.getSession();
  if (!session) {
    showOnly(signinRequiredEl);
    return;
  }

  showOnly(loadingEl);

  const cartRes = await window.MarketplaceAuth.fetchWithAuth('/api/cart');
  if (!cartRes.ok) {
    showOnly(emptyEl);
    emptyEl.querySelector('p').textContent = 'Failed to load your cart. Please try again.';
    return;
  }
  const cartBody = await cartRes.json();
  cartItems = cartBody.items || [];

  if (cartItems.length === 0) {
    showOnly(emptyEl);
    return;
  }

  await loadAddresses();
  renderSummary();
  showOnly(layoutEl);
});
