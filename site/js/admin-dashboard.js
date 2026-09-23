// Wires the admin dashboard to the real GET /api/admin/dashboard endpoint.
// Shows exactly the four things it returns (users_by_role, active_listings,
// orders_by_status, commission_revenue) -- nothing invented beyond that.
//
// commission_revenue is rendered with its real "provisional" status
// carried into the UI (a badge plus the backend's own explanatory note),
// not presented as a finished number -- the backend computes it from
// order_items.commission_amount on 'paid' orders, but Optimise Payments is
// a local simulation, not a connected real processor, so no real payment
// has actually gone through the system yet.

document.addEventListener('DOMContentLoaded', async () => {
  const signinRequiredEl = document.getElementById('dashboard-signin-required');
  const forbiddenEl = document.getElementById('dashboard-forbidden');
  const contentEl = document.getElementById('dashboard-content');

  function showOnly(el) {
    for (const candidate of [signinRequiredEl, forbiddenEl, contentEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  const guard = await window.AdminGuard.check();
  if (!guard.ok) {
    showOnly(guard.reason === 'signin' ? signinRequiredEl : forbiddenEl);
    return;
  }

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/admin/dashboard');
  if (!res.ok) {
    showOnly(forbiddenEl);
    forbiddenEl.querySelector('p').textContent = 'Failed to load the dashboard.';
    return;
  }

  const body = await res.json();

  document.getElementById('stat-buyers').textContent = body.users_by_role.buyer;
  document.getElementById('stat-sellers').textContent = body.users_by_role.seller;
  document.getElementById('stat-admins').textContent = body.users_by_role.admin;
  document.getElementById('stat-active-listings').textContent = body.active_listings;

  const revenue = body.commission_revenue;
  document.getElementById('stat-revenue').textContent = `${revenue.amount.toFixed(2)} ${revenue.currency}`;
  document.getElementById('revenue-note').textContent = revenue.note;
  document.getElementById('revenue-status-badge').textContent =
    revenue.status.charAt(0).toUpperCase() + revenue.status.slice(1);

  const ordersEntries = Object.entries(body.orders_by_status || {});
  const ordersEmpty = document.getElementById('orders-empty');
  const ordersTableWrap = document.getElementById('orders-table-wrap');
  const ordersTbody = document.getElementById('orders-tbody');

  if (ordersEntries.length === 0) {
    ordersTableWrap.hidden = true;
    ordersEmpty.hidden = false;
  } else {
    ordersTableWrap.hidden = false;
    ordersEmpty.hidden = true;
    ordersTbody.innerHTML = '';
    for (const [status, count] of ordersEntries) {
      const tr = document.createElement('tr');
      const statusCell = document.createElement('td');
      statusCell.textContent = status;
      const countCell = document.createElement('td');
      countCell.textContent = count;
      tr.appendChild(statusCell);
      tr.appendChild(countCell);
      ordersTbody.appendChild(tr);
    }
  }

  showOnly(contentEl);
});
