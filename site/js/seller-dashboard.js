// Wires the seller dashboard to the real GET /api/listings/mine/dashboard
// endpoint.
//
// Recent orders render item title/price from order_items.title_at_purchase
// / price_at_purchase -- the real snapshot captured at checkout -- not a
// live listing lookup, same as order-confirmation.js. A seller editing a
// listing's title/price after a sale has no effect on what already shows
// here.
//
// KNOWN GAPS (flagged, not silently worked around):
// - No "Total Views" / "Visits" / "Revenue" stat cards -- there's no
//   analytics/view-tracking anywhere in the schema, and per-seller revenue
//   isn't computed anywhere either (the admin dashboard's revenue figure is
//   platform-wide commission, not a seller payout total, and is itself
//   marked provisional since payment isn't really connected). Only the
//   three real numbers the backend actually returns are shown.

document.addEventListener('DOMContentLoaded', async () => {
  const signinRequiredEl = document.getElementById('dashboard-signin-required');
  const forbiddenEl = document.getElementById('dashboard-forbidden');
  const contentEl = document.getElementById('dashboard-content');

  function showOnly(el) {
    for (const candidate of [signinRequiredEl, forbiddenEl, contentEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
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

  function renderRecentOrders(items) {
    const tableWrap = document.getElementById('recent-orders-table-wrap');
    const emptyEl = document.getElementById('recent-orders-empty');
    const tbody = document.getElementById('recent-orders-tbody');

    if (!items || items.length === 0) {
      tableWrap.hidden = true;
      emptyEl.hidden = false;
      return;
    }

    tableWrap.hidden = false;
    emptyEl.hidden = true;
    tbody.innerHTML = '';

    for (const item of items) {
      const order = item.orders || {};
      const title = item.title_at_purchase || 'Item no longer available';
      const badgeClass = statusBadgeClass[order.status] || 'status-badge-pending';
      const label = statusLabels[order.status] || order.status || 'Unknown';
      const date = order.created_at ? new Date(order.created_at).toLocaleDateString() : '—';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${order.id ? order.id.slice(0, 8).toUpperCase() : '—'}</td>
        <td>${escapeHtml(title)}</td>
        <td>${item.quantity}</td>
        <td>£${(Number(item.price_at_purchase) * item.quantity).toFixed(2)}</td>
        <td><span class="status-badge ${badgeClass}">${label}</span></td>
        <td>${date}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  const session = await window.MarketplaceAuth.getSession();
  if (!session) {
    showOnly(signinRequiredEl);
    return;
  }

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/listings/mine/dashboard');
  if (res.status === 403) {
    showOnly(forbiddenEl);
    return;
  }
  if (!res.ok) {
    showOnly(forbiddenEl);
    forbiddenEl.querySelector('p').textContent = 'Failed to load your dashboard.';
    return;
  }

  const body = await res.json();
  document.getElementById('stat-active-listings').textContent = body.total_active_listings;
  document.getElementById('stat-sold').textContent = body.total_sold;
  document.getElementById('stat-total-stock').textContent = body.total_stock;

  renderRecentOrders(body.recent_order_items);
  showOnly(contentEl);
});
