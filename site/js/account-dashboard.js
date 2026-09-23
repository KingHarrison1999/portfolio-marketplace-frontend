// Wires account/dashboard.html's "Recent Orders" preview to the real
// GET /api/orders/mine endpoint (same source as account/orders.html, just
// the first few rows since this is a summary, not the full list).
//
// "Saved Items" is intentionally NOT wired here -- there's no wishlist
// concept anywhere in the schema, see the flagged note in the HTML.

const RECENT_ORDERS_LIMIT = 5;

document.addEventListener('DOMContentLoaded', async () => {
  const signinMessageEl = document.getElementById('dashboard-signin-message');
  const emptyEl = document.getElementById('recent-orders-empty');
  const tableWrap = document.getElementById('recent-orders-table-wrap');
  const tbody = document.getElementById('recent-orders-tbody');

  const STATUS_LABELS = {
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
  const STATUS_BADGE_CLASS = {
    pending: 'status-badge-pending',
    pending_payment: 'status-badge-pending',
    paid: 'status-badge-shipped',
    processing: 'status-badge-shipped',
    shipped: 'status-badge-shipped',
    completed: 'status-badge-delivered',
    payment_failed: 'status-badge-cancelled',
    cancelled: 'status-badge-cancelled',
    refunded: 'status-badge-cancelled',
  };

  function renderRecentOrders(orders) {
    const recent = orders.slice(0, RECENT_ORDERS_LIMIT);

    if (recent.length === 0) {
      tableWrap.hidden = true;
      emptyEl.hidden = false;
      return;
    }

    tableWrap.hidden = false;
    emptyEl.hidden = true;
    tbody.innerHTML = '';

    for (const order of recent) {
      const tr = document.createElement('tr');
      const dateText = order.created_at ? new Date(order.created_at).toLocaleDateString() : '—';
      const badgeClass = STATUS_BADGE_CLASS[order.status] || 'status-badge-pending';
      const statusLabel = STATUS_LABELS[order.status] || order.status;

      tr.innerHTML = `
        <td>#${order.id.slice(0, 8)}</td>
        <td>${dateText}</td>
        <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
        <td>£${Number(order.total).toFixed(2)}</td>
      `;

      tbody.appendChild(tr);
    }
  }

  const session = await window.MarketplaceAuth.getSession();
  if (!session) {
    signinMessageEl.className = 'form-message is-visible form-message-error';
    signinMessageEl.hidden = false;
    return;
  }

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/orders/mine');
  if (!res.ok) {
    signinMessageEl.textContent = 'Failed to load your recent orders.';
    signinMessageEl.className = 'form-message is-visible form-message-error';
    signinMessageEl.hidden = false;
    return;
  }

  const body = await res.json();
  renderRecentOrders(body.orders || []);
});
