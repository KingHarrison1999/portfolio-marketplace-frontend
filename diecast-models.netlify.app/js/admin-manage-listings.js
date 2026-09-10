// Wires the admin "Manage Listings" table to the real GET /api/admin/listings
// endpoint (every listing, every status, every seller -- unlike the public
// browse endpoint, which only ever returns status='active').
//
// FLAGGED GAP: the original mock table had "Suspend" as an action distinct
// from "Remove", implying a moderation-only hidden state separate from a
// seller's own delete. The real schema has no such state -- listings.status
// only allows draft/active/sold/removed (see
// 20260825112147_listings_and_images.sql), so there's nothing for a
// separate "Suspend" to write to. Wired instead to the two real states that
// already exist and are already reachable through the existing (already
// admin-authorized) listing endpoints: "Remove" (DELETE /api/listings/:id,
// soft-delete to status='removed') and "Reactivate" (PATCH /api/listings/:id
// { status: 'active' }) for a removed listing. If the business wants a real
// admin-only suspended state distinct from seller-removed, that's a schema
// decision (a new status value) for someone to make, not something to
// invent silently here.

document.addEventListener('DOMContentLoaded', async () => {
  const signinRequiredEl = document.getElementById('listings-signin-required');
  const forbiddenEl = document.getElementById('listings-forbidden');
  const contentEl = document.getElementById('listings-content');
  const emptyEl = document.getElementById('listings-empty');
  const tableWrap = document.getElementById('listings-table-wrap');
  const tbody = document.getElementById('listings-tbody');
  const tabsEl = document.getElementById('list-tabs');

  function showOnly(el) {
    for (const candidate of [signinRequiredEl, forbiddenEl, contentEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  const statusBadgeClass = {
    active: 'status-badge-active',
    draft: 'status-badge-draft',
    sold: 'status-badge-sold',
    removed: 'status-badge-removed',
  };
  const statusLabels = { active: 'Active', draft: 'Draft', sold: 'Sold', removed: 'Removed' };

  let listings = [];
  let activeStatus = '';

  function renderRows() {
    const filtered = activeStatus ? listings.filter((l) => l.status === activeStatus) : listings;

    if (filtered.length === 0) {
      tableWrap.hidden = true;
      emptyEl.hidden = false;
      emptyEl.textContent = listings.length === 0 ? 'No listings yet.' : 'No listings with this status.';
      return;
    }

    tableWrap.hidden = false;
    emptyEl.hidden = true;
    tbody.innerHTML = '';

    for (const listing of filtered) {
      const tr = document.createElement('tr');

      const badgeClass = statusBadgeClass[listing.status] || 'status-badge-draft';
      const thumbHtml = listing.primary_image_url
        ? `<img class="list-table-thumb" src="${escapeHtml(listing.primary_image_url)}" alt="" />`
        : '<div class="list-table-thumb product-image-placeholder"><i class="fa-solid fa-image"></i></div>';
      const sellerName = listing.seller_display_name || '(no display name)';
      const dateText = listing.created_at ? new Date(listing.created_at).toLocaleDateString() : '—';
      const actionLabel = listing.status === 'removed' ? 'Reactivate' : 'Remove';

      tr.innerHTML = `
        <td>
          <div class="list-table-title">
            ${thumbHtml}
            <span>${escapeHtml(listing.title)}</span>
          </div>
        </td>
        <td>${escapeHtml(sellerName)}</td>
        <td>£${Number(listing.price).toFixed(2)}</td>
        <td><span class="status-badge ${badgeClass}">${statusLabels[listing.status] || escapeHtml(listing.status)}</span></td>
        <td>${dateText}</td>
        <td class="list-table-actions">
          <button type="button" class="cart-item-action" data-action="toggle">${actionLabel}</button>
        </td>
      `;

      const toggleBtn = tr.querySelector('[data-action="toggle"]');
      toggleBtn.addEventListener('click', async () => {
        const reactivating = listing.status === 'removed';
        const confirmText = reactivating
          ? `Reactivate "${listing.title}"? It will become active again.`
          : `Remove "${listing.title}"? It will no longer be visible to buyers.`;
        if (!window.confirm(confirmText)) return;

        toggleBtn.disabled = true;
        const res = reactivating
          ? await window.MarketplaceAuth.fetchWithAuth(`/api/listings/${listing.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'active' }),
            })
          : await window.MarketplaceAuth.fetchWithAuth(`/api/listings/${listing.id}`, { method: 'DELETE' });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          window.alert(body.error || `Failed to ${reactivating ? 'reactivate' : 'remove'} listing.`);
          toggleBtn.disabled = false;
          return;
        }

        const body = await res.json();
        listing.status = body.listing.status;
        renderRows();
      });

      tbody.appendChild(tr);
    }
  }

  tabsEl.addEventListener('click', (event) => {
    const btn = event.target.closest('.list-tab');
    if (!btn) return;
    tabsEl.querySelectorAll('.list-tab').forEach((el) => el.classList.remove('active'));
    btn.classList.add('active');
    activeStatus = btn.dataset.status;
    renderRows();
  });

  const guard = await window.AdminGuard.check();
  if (!guard.ok) {
    showOnly(guard.reason === 'signin' ? signinRequiredEl : forbiddenEl);
    return;
  }

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/admin/listings');
  if (!res.ok) {
    tableWrap.hidden = true;
    emptyEl.hidden = false;
    emptyEl.textContent = 'Failed to load listings.';
    showOnly(contentEl);
    return;
  }

  const body = await res.json();
  listings = body.listings || [];
  renderRows();
  showOnly(contentEl);
});
