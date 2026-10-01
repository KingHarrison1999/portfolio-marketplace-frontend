// Wires the order confirmation page to the real
// GET /api/orders/by-group/:id endpoint.
//
// Item names and prices are rendered from order_items.title_at_purchase /
// price_at_purchase -- a real snapshot taken at checkout time (see
// checkoutService.checkout) -- rather than live-fetched from the listing.
// A seller editing or removing the listing afterward has no effect on what
// an already-placed order shows, which is the whole point of the
// snapshot: this page used to live-fetch GET /api/listings/:id per item,
// so an edited title/price would silently show up here too. The "Item no
// longer available" fallback below now only fires for pre-migration
// order_items rows that have no snapshot at all (title_at_purchase is
// null) -- not for listings that are merely inactive or deleted, since the
// snapshot covers those cases fine on its own.
//
// The shipping address is the same story, fixed the same way: it used to
// live-fetch the buyer's CURRENT addresses and match by shipping_address_id,
// so editing or deleting that address afterward silently changed or blanked
// what an old confirmation showed. Now rendered from orders.shipping_line1/
// line2/city/postcode/country -- a real snapshot taken at checkout time
// (see checkoutService.checkout). Falls back to the static "Address on
// file." placeholder only for pre-migration orders with no snapshot.
//
// KNOWN GAPS (flagged, not silently worked around):
// - No "Estimated Delivery" section -- there's no shipping/logistics
//   concept anywhere in the schema, so showing a delivery window would be
//   fabricated. Removed entirely rather than faked.
// - The top banner now reflects real payment status (see
//   renderPaymentNotice below) rather than unconditionally saying payment
//   isn't connected -- a buyer can land here two ways: via the real Stripe
//   flow (checkout/success.html's "View Order" link, orders already
//   'paid') or via the multi-seller fallback in checkout.js (orders left
//   pending_payment). The banner must not imply a charge happened in the
//   second case.
//
// Multi-seller carts: checkout.js only starts the real Stripe flow when
// checkout produced exactly one order (see its own comment) -- a cart
// spanning multiple sellers lands here instead, with every order still
// pending_payment. Each pending_payment card below gets its own "Pay Now"
// button, using the exact same POST /api/checkout/pay + redirect mechanism
// checkout.js uses for the single-order case. The buyer can pay each
// order whenever they're ready, in any order, by revisiting this same
// page (its URL -- checkout_group_id -- doesn't change as orders get
// paid). Stripe's success_url/cancel_url are the same fixed
// checkout/success.html / checkout/cancel.html regardless of which page
// started the payment, so both already needed to -- and now do -- find
// their way back to the right order-confirmation.html via the same
// pendingCheckoutGroupId sessionStorage key checkout.js established.

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('confirmation-loading');
  const notFoundEl = document.getElementById('confirmation-not-found');
  const contentEl = document.getElementById('confirmation-content');
  const ordersEl = document.getElementById('confirmation-orders');
  const addressEl = document.getElementById('confirmation-address');

  function showNotFound() {
    loadingEl.hidden = true;
    contentEl.hidden = true;
    notFoundEl.hidden = false;
  }

  const statusLabels = {
    pending: 'Pending',
    pending_payment: 'Pending Payment',
    paid: 'Paid',
    payment_failed: 'Payment Failed',
    processing: 'Processing',
    shipped: 'Shipped',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  const statusBadgeClass = {
    pending: 'status-badge-pending',
    pending_payment: 'status-badge-pending',
    paid: 'status-badge-delivered',
    payment_failed: 'status-badge-cancelled',
    processing: 'status-badge-pending',
    shipped: 'status-badge-shipped',
    completed: 'status-badge-delivered',
    cancelled: 'status-badge-cancelled',
    refunded: 'status-badge-cancelled',
  };

  // Listing titles and address fields are other users' (or the buyer's own)
  // free-text input -- escape before interpolating into innerHTML so they
  // can't inject markup.
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  async function payOrder(orderId, button, messageEl) {
    button.disabled = true;
    messageEl.className = 'form-message';

    // Same stash checkout.js uses before its own Stripe redirect --
    // checkout/success.html and checkout/cancel.html read this back to
    // link to this exact order-confirmation.html page afterward.
    sessionStorage.setItem('pendingCheckoutGroupId', checkoutGroupId);

    const res = await window.MarketplaceAuth.fetchWithAuth('/api/checkout/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      messageEl.textContent = body.error || 'Failed to start payment. Please try again.';
      messageEl.className = 'form-message is-visible form-message-error';
      button.disabled = false;
      return;
    }

    const body = await res.json();
    window.location.href = body.url;
  }

  function renderOrders(orders) {
    ordersEl.innerHTML = '';
    for (const order of orders) {
      const card = document.createElement('aside');
      card.className = 'order-summary';

      const badgeClass = statusBadgeClass[order.status] || 'status-badge-pending';
      const label = statusLabels[order.status] || order.status;

      const heading = document.createElement('h2');
      heading.innerHTML = `Order <span class="order-confirmation-id">#${order.id.slice(0, 8).toUpperCase()}</span> <span class="status-badge ${badgeClass}">${label}</span>`;
      card.appendChild(heading);

      const itemsWrap = document.createElement('div');
      itemsWrap.className = 'order-summary-items';
      for (const item of order.order_items) {
        const title = item.title_at_purchase || 'Item no longer available';
        const row = document.createElement('div');
        row.className = 'order-summary-item';
        row.innerHTML = `
          <span class="order-summary-item-name">${escapeHtml(title)} <span class="order-summary-item-qty">&times;${item.quantity}</span></span>
          <span class="order-summary-item-price">£${(Number(item.price_at_purchase) * item.quantity).toFixed(2)}</span>
        `;
        itemsWrap.appendChild(row);
      }
      card.appendChild(itemsWrap);

      const rows = document.createElement('div');
      rows.className = 'order-summary-rows';
      rows.innerHTML = `
        <div class="order-summary-row"><span>Shipping</span><span>Free</span></div>
        <div class="order-summary-row order-summary-total"><span>Total</span><span>£${Number(order.total).toFixed(2)}</span></div>
      `;
      card.appendChild(rows);

      if (order.status === 'pending_payment') {
        const payBtn = document.createElement('button');
        payBtn.type = 'button';
        payBtn.className = 'btn-primary';
        payBtn.textContent = `Pay Now — £${Number(order.total).toFixed(2)}`;
        card.appendChild(payBtn);

        const payMessage = document.createElement('div');
        payMessage.className = 'form-message';
        payMessage.setAttribute('role', 'status');
        card.appendChild(payMessage);

        payBtn.addEventListener('click', () => payOrder(order.id, payBtn, payMessage));
      }

      ordersEl.appendChild(card);
    }
  }

  function renderPaymentNotice(orders) {
    const notice = document.getElementById('confirmation-payment-notice');
    const allPaid = orders.every((o) => o.status === 'paid');
    if (allPaid) {
      notice.innerHTML = 'Thank you — your payment was successful and your order is confirmed.';
    } else {
      notice.innerHTML =
        'Thank you — your order has been placed. One or more orders above are still ' +
        '<strong>Pending Payment</strong> — no charge has been made for those yet.';
    }
  }

  function renderAddress(order) {
    if (!order.shipping_line1) return; // pre-migration order, no snapshot -- leave the static placeholder

    const snapshot = {
      line1: order.shipping_line1,
      line2: order.shipping_line2,
      city: order.shipping_city,
      postcode: order.shipping_postcode,
      country: order.shipping_country,
    };
    addressEl.innerHTML = window.MarketplaceAddresses.formatAddressLines(snapshot).map(escapeHtml).join('<br />');
  }

  const params = new URLSearchParams(window.location.search);
  const checkoutGroupId = params.get('checkout_group_id');

  if (!checkoutGroupId) {
    showNotFound();
    return;
  }

  const session = await window.MarketplaceAuth.getSession();
  if (!session) {
    showNotFound();
    return;
  }

  const res = await window.MarketplaceAuth.fetchWithAuth(`/api/orders/by-group/${encodeURIComponent(checkoutGroupId)}`);
  if (!res.ok) {
    showNotFound();
    return;
  }

  const body = await res.json();
  const orders = body.orders || [];
  if (orders.length === 0) {
    showNotFound();
    return;
  }

  renderOrders(orders);
  renderPaymentNotice(orders);
  renderAddress(orders[0]);

  loadingEl.hidden = true;
  contentEl.hidden = false;
});
