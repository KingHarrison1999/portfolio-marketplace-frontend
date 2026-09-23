// Wires the seller listings table to the real GET /api/listings/mine and
// DELETE /api/listings/:id (soft-delete -- status becomes 'removed', the
// row stays) endpoints. Thumbnails render from the real primary_image_url
// GET /api/listings/mine now returns, falling back to a placeholder icon
// only for listings that genuinely have zero uploaded photos.

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
  let categoryNames = new Map();
  let activeStatus = '';

  async function loadCategoryNames() {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/categories');
    if (!res.ok) return;
    const body = await res.json();
    categoryNames = new Map((body.categories || []).map((c) => [c.id, c.name]));
  }

  function renderRows() {
    const filtered = activeStatus ? listings.filter((l) => l.status === activeStatus) : listings;

    if (filtered.length === 0) {
      tableWrap.hidden = true;
      emptyEl.hidden = false;
      emptyEl.textContent = listings.length === 0 ? "You don't have any listings yet." : 'No listings with this status.';
      return;
    }

    tableWrap.hidden = false;
    emptyEl.hidden = true;
    tbody.innerHTML = '';

    for (const listing of filtered) {
      const tr = document.createElement('tr');
      tr.dataset.listingId = listing.id;

      const categoryName = listing.category_id ? categoryNames.get(listing.category_id) || 'Uncategorized' : 'None';
      const badgeClass = statusBadgeClass[listing.status] || 'status-badge-draft';
      const thumbHtml = listing.primary_image_url
        ? `<img class="list-table-thumb" src="${escapeHtml(listing.primary_image_url)}" alt="" />`
        : '<div class="list-table-thumb product-image-placeholder"><i class="fa-solid fa-image"></i></div>';

      tr.innerHTML = `
        <td>
          <div class="list-table-title">
            ${thumbHtml}
            <span>${escapeHtml(listing.title)}</span>
          </div>
        </td>
        <td><span class="status-badge ${badgeClass}">${statusLabels[listing.status] || escapeHtml(listing.status)}</span></td>
        <td>${escapeHtml(categoryName)}</td>
        <td>£${Number(listing.price).toFixed(2)}</td>
        <td>${listing.stock}</td>
        <td class="list-table-actions">
          <a href="listing-form.html?id=${encodeURIComponent(listing.id)}" class="cart-item-action">Edit</a>
          <button type="button" class="cart-item-action" data-action="delete">Delete</button>
        </td>
      `;

      const deleteBtn = tr.querySelector('[data-action="delete"]');
      deleteBtn.addEventListener('click', async () => {
        if (listing.status === 'removed') return;
        if (!window.confirm(`Delete "${listing.title}"? This can't be undone from here.`)) return;

        deleteBtn.disabled = true;
        const res = await window.MarketplaceAuth.fetchWithAuth(`/api/listings/${listing.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          window.alert(body.error || 'Failed to delete listing.');
          deleteBtn.disabled = false;
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

  const session = await window.MarketplaceAuth.getSession();
  if (!session) {
    showOnly(signinRequiredEl);
    return;
  }

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/listings/mine');
  if (res.status === 403) {
    showOnly(forbiddenEl);
    return;
  }
  if (!res.ok) {
    showOnly(forbiddenEl);
    forbiddenEl.querySelector('p').textContent = 'Failed to load your listings.';
    return;
  }

  const body = await res.json();
  listings = body.listings || [];

  await loadCategoryNames();
  renderRows();
  showOnly(contentEl);
});
