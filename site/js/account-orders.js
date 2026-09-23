// Wires account/orders.html to the real GET /api/orders/mine endpoint --
// every order the signed-in buyer has ever placed, across every checkout
// and every seller, newest first.

document.addEventListener('DOMContentLoaded', async () => {
  const signinMessageEl = document.getElementById('orders-signin-message');
  const emptyEl = document.getElementById('orders-empty');
  const tableWrap = document.getElementById('orders-table-wrap');
  const tbody = document.getElementById('orders-tbody');

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

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

  function renderOrders(orders) {
    if (orders.length === 0) {
      tableWrap.hidden = true;
      emptyEl.hidden = false;
      return;
    }

    tableWrap.hidden = false;
    emptyEl.hidden = true;
    tbody.innerHTML = '';

    for (const order of orders) {
      const tr = document.createElement('tr');
      const items = order.order_items || [];
      const itemsSummary = items
        .map((item) => `${escapeHtml(item.title_at_purchase || 'Item no longer available')} × ${item.quantity}`)
        .join(', ');
      const dateText = order.created_at ? new Date(order.created_at).toLocaleDateString() : '—';
      const badgeClass = STATUS_BADGE_CLASS[order.status] || 'status-badge-pending';
      const statusLabel = STATUS_LABELS[order.status] || order.status;
      const shortId = order.id.slice(0, 8);

      tr.innerHTML = `
        <td>#${escapeHtml(shortId)}</td>
        <td>${dateText}</td>
        <td>${itemsSummary || '—'}</td>
        <td><span class="status-badge ${badgeClass}">${escapeHtml(statusLabel)}</span></td>
        <td>£${Number(order.total).toFixed(2)}</td>
        <td class="list-table-actions">
          <a href="../order-confirmation.html?checkout_group_id=${encodeURIComponent(order.checkout_group_id)}" class="cart-item-action">View</a>
        </td>
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
    signinMessageEl.textContent = 'Failed to load your orders.';
    signinMessageEl.className = 'form-message is-visible form-message-error';
    signinMessageEl.hidden = false;
    return;
  }

  const body = await res.json();
  renderOrders(body.orders || []);
});
