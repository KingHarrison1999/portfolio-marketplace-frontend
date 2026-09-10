// Wires the admin "Manage Users" table to the real GET /api/admin/users/directory,
// POST /api/admin/users/:id/suspend, and POST /api/admin/users/:id/reactivate
// endpoints.
//
// FLAGGED GAP: the original mock table had "Pending" as a user status with
// an "Approve" action. There's no real backing for that anywhere in the
// schema -- a user becomes a seller the instant profiles.role is set to
// 'seller' (currently only doable directly against the database; there's
// no request/review/approval workflow at all to wire "Approve" to). Rather
// than invent a fake approval step, "Pending"/"Approve" are dropped
// entirely here. "Active"/"Suspended" and the Suspend/Reactivate action ARE
// real: suspension is a genuine Supabase Auth ban (auth.users.banned_until,
// set via the admin API's ban_duration), which actually blocks sign-in --
// not a cosmetic flag.
//
// Commission Tier column (sellers only): sellers self-declare their tier in
// account settings (js/settings-seller-status.js); here an admin can
// directly override the value (POST /api/admin/users/:id/commission-tier,
// implicitly verified) or, when a self-declared business/charity claim is
// still pending, Verify it as-is (POST .../verify-commission-tier) without
// changing the value. Until verified, checkout still charges the seller the
// standard flat rate -- see checkoutService.js.

document.addEventListener('DOMContentLoaded', async () => {
  const signinRequiredEl = document.getElementById('users-signin-required');
  const forbiddenEl = document.getElementById('users-forbidden');
  const contentEl = document.getElementById('users-content');
  const emptyEl = document.getElementById('users-empty');
  const tableWrap = document.getElementById('users-table-wrap');
  const tbody = document.getElementById('users-tbody');
  const tabsEl = document.getElementById('list-tabs');

  function showOnly(el) {
    for (const candidate of [signinRequiredEl, forbiddenEl, contentEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  const roleLabels = { buyer: 'Buyer', seller: 'Seller', admin: 'Admin' };
  const tierLabels = { individual: 'Individual', business: 'Business', charity: 'Charity' };

  let users = [];
  let activeStatus = '';
  let currentUserId = null;

  function statusOf(user) {
    return user.is_suspended ? 'suspended' : 'active';
  }

  function tierBadgeClass(user) {
    if (user.commission_tier === 'individual') return 'status-badge-archived';
    return user.commission_tier_verified ? 'status-badge-active' : 'status-badge-draft';
  }

  function tierCellHtml(user) {
    if (user.role !== 'seller') return '—';
    const label = tierLabels[user.commission_tier] || escapeHtml(user.commission_tier);
    const badgeText = user.commission_tier === 'individual' ? label : `${label}${user.commission_tier_verified ? ' (verified)' : ' (unverified)'}`;
    const showVerifyBtn = user.commission_tier !== 'individual' && !user.commission_tier_verified;

    return `
      <div class="commission-tier-cell">
        <span class="status-badge ${tierBadgeClass(user)}">${badgeText}</span>
        <select class="commission-tier-select" data-user-id="${user.id}">
          <option value="individual" ${user.commission_tier === 'individual' ? 'selected' : ''}>Individual</option>
          <option value="business" ${user.commission_tier === 'business' ? 'selected' : ''}>Business</option>
          <option value="charity" ${user.commission_tier === 'charity' ? 'selected' : ''}>Charity</option>
        </select>
        ${showVerifyBtn ? '<button type="button" class="cart-item-action" data-action="verify-tier">Verify</button>' : ''}
      </div>
    `;
  }

  function renderRows() {
    const filtered = activeStatus ? users.filter((u) => statusOf(u) === activeStatus) : users;

    if (filtered.length === 0) {
      tableWrap.hidden = true;
      emptyEl.hidden = false;
      emptyEl.textContent = users.length === 0 ? 'No users yet.' : 'No users with this status.';
      return;
    }

    tableWrap.hidden = false;
    emptyEl.hidden = true;
    tbody.innerHTML = '';

    for (const user of filtered) {
      const tr = document.createElement('tr');

      const suspended = user.is_suspended;
      const badgeClass = suspended ? 'status-badge-cancelled' : 'status-badge-active';
      const statusLabel = suspended ? 'Suspended' : 'Active';
      const dateText = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—';
      const isSelf = user.id === currentUserId;

      tr.innerHTML = `
        <td>${escapeHtml(user.display_name || '(no display name)')}</td>
        <td>${escapeHtml(user.email || '—')}</td>
        <td>${roleLabels[user.role] || escapeHtml(user.role)}</td>
        <td>${tierCellHtml(user)}</td>
        <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
        <td>${dateText}</td>
        <td class="list-table-actions">
          ${isSelf ? '' : `<button type="button" class="cart-item-action" data-action="toggle">${suspended ? 'Reactivate' : 'Suspend'}</button>`}
        </td>
      `;

      const toggleBtn = tr.querySelector('[data-action="toggle"]');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', async () => {
          const reactivating = user.is_suspended;
          const confirmText = reactivating
            ? `Reactivate ${user.display_name || user.email || 'this user'}? They will be able to sign in again.`
            : `Suspend ${user.display_name || user.email || 'this user'}? They will no longer be able to sign in.`;
          if (!window.confirm(confirmText)) return;

          toggleBtn.disabled = true;
          const res = await window.MarketplaceAuth.fetchWithAuth(
            `/api/admin/users/${user.id}/${reactivating ? 'reactivate' : 'suspend'}`,
            { method: 'POST' },
          );

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            window.alert(body.error || `Failed to ${reactivating ? 'reactivate' : 'suspend'} user.`);
            toggleBtn.disabled = false;
            return;
          }

          user.is_suspended = !reactivating;
          renderRows();
        });
      }

      const tierSelect = tr.querySelector('.commission-tier-select');
      if (tierSelect) {
        tierSelect.addEventListener('change', async () => {
          const newTier = tierSelect.value;
          if (!window.confirm(`Set ${user.display_name || user.email || 'this user'}'s commission tier to "${tierLabels[newTier]}"? This takes effect immediately and counts as admin-verified.`)) {
            tierSelect.value = user.commission_tier;
            return;
          }

          tierSelect.disabled = true;
          const res = await window.MarketplaceAuth.fetchWithAuth(`/api/admin/users/${user.id}/commission-tier`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commission_tier: newTier }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            window.alert(body.error || 'Failed to update commission tier.');
            tierSelect.value = user.commission_tier;
            tierSelect.disabled = false;
            return;
          }

          const body = await res.json();
          user.commission_tier = body.profile.commission_tier;
          user.commission_tier_verified = body.profile.commission_tier_verified;
          renderRows();
        });
      }

      const verifyBtn = tr.querySelector('[data-action="verify-tier"]');
      if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
          if (!window.confirm(`Verify ${user.display_name || user.email || 'this user'}'s "${tierLabels[user.commission_tier]}" claim? The discounted rate will apply from their next order.`)) return;

          verifyBtn.disabled = true;
          const res = await window.MarketplaceAuth.fetchWithAuth(`/api/admin/users/${user.id}/verify-commission-tier`, {
            method: 'POST',
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            window.alert(body.error || 'Failed to verify commission tier.');
            verifyBtn.disabled = false;
            return;
          }

          const body = await res.json();
          user.commission_tier_verified = body.profile.commission_tier_verified;
          renderRows();
        });
      }

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
  currentUserId = guard.profile.id;

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/admin/users/directory');
  if (!res.ok) {
    tableWrap.hidden = true;
    emptyEl.hidden = false;
    emptyEl.textContent = 'Failed to load users.';
    showOnly(contentEl);
    return;
  }

  const body = await res.json();
  users = body.users || [];
  renderRows();
  showOnly(contentEl);
});
