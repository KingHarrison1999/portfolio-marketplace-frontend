// Wires the admin ad spaces page to the real endpoints:
// GET/POST /api/admin/ad-spaces, PATCH /api/admin/ad-spaces/:id, and
// DELETE /api/admin/ad-spaces/:id (which deactivates -- is_active: false --
// rather than removing the row; the "Delete" action here is labeled
// "Deactivate" to match what it actually does, and a deactivated ad space
// can be reactivated again via the same real PATCH endpoint).
//
// Owner field is a real search-as-you-type picker backed by
// GET /api/admin/users?search=X (matches display_name, or an exact id).

document.addEventListener('DOMContentLoaded', async () => {
  const signinRequiredEl = document.getElementById('ad-spaces-signin-required');
  const forbiddenEl = document.getElementById('ad-spaces-forbidden');
  const contentEl = document.getElementById('ad-spaces-content');

  const listEl = document.getElementById('ad-space-list');
  const addBtn = document.getElementById('btn-add-ad-space');
  const formEl = document.getElementById('ad-space-form');
  const cancelBtn = document.getElementById('btn-cancel-ad-space');
  const messageEl = document.getElementById('ad-space-form-message');

  const idInput = document.getElementById('ad-space-id');
  const businessNameInput = document.getElementById('ad-business-name');
  const placementInput = document.getElementById('ad-placement');
  const imageUrlInput = document.getElementById('ad-image-url');
  const clickUrlInput = document.getElementById('ad-click-url');
  const startDateInput = document.getElementById('ad-start-date');
  const endDateInput = document.getElementById('ad-end-date');
  const priceInput = document.getElementById('ad-price');
  const ownerIdInput = document.getElementById('ad-owner-id');
  const ownerSearchInput = document.getElementById('ad-owner-search');
  const ownerResultsEl = document.getElementById('ad-owner-results');
  const ownerSelectedEl = document.getElementById('ad-owner-selected');
  const ownerSelectedNameEl = document.getElementById('ad-owner-selected-name');
  const ownerClearBtn = document.getElementById('ad-owner-clear-btn');
  const activeField = document.getElementById('ad-active-field');
  const activeCheckbox = document.getElementById('ad-is-active');

  let ownerSearchDebounce = null;

  function selectOwner(user) {
    ownerIdInput.value = user.id;
    ownerSelectedNameEl.textContent = user.display_name || user.id;
    ownerSelectedEl.hidden = false;
    ownerSearchInput.value = '';
    ownerResultsEl.hidden = true;
    ownerResultsEl.innerHTML = '';
  }

  function clearOwner() {
    ownerIdInput.value = '';
    ownerSelectedEl.hidden = true;
    ownerSelectedNameEl.textContent = '';
  }

  async function runOwnerSearch(query) {
    if (!query) {
      ownerResultsEl.hidden = true;
      ownerResultsEl.innerHTML = '';
      return;
    }

    const res = await window.MarketplaceAuth.fetchWithAuth(`/api/admin/users?search=${encodeURIComponent(query)}`);
    if (!res.ok) {
      ownerResultsEl.hidden = true;
      return;
    }

    const body = await res.json();
    const users = body.users || [];

    ownerResultsEl.innerHTML = '';
    if (users.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'owner-search-empty';
      empty.textContent = 'No matching users.';
      ownerResultsEl.appendChild(empty);
    } else {
      for (const user of users) {
        const item = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = `${user.display_name || '(no display name)'} — ${user.role}`;
        btn.addEventListener('click', () => selectOwner(user));
        item.appendChild(btn);
        ownerResultsEl.appendChild(item);
      }
    }
    ownerResultsEl.hidden = false;
  }

  ownerSearchInput.addEventListener('input', () => {
    clearTimeout(ownerSearchDebounce);
    const query = ownerSearchInput.value.trim();
    ownerSearchDebounce = setTimeout(() => runOwnerSearch(query), 300);
  });

  ownerClearBtn.addEventListener('click', clearOwner);

  function showOnly(el) {
    for (const candidate of [signinRequiredEl, forbiddenEl, contentEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `form-message is-visible form-message-${type}`;
  }

  async function openForm(adSpace) {
    formEl.reset();
    idInput.value = adSpace ? adSpace.id : '';
    activeField.hidden = !adSpace;
    clearOwner();
    ownerResultsEl.hidden = true;
    ownerResultsEl.innerHTML = '';

    if (adSpace) {
      businessNameInput.value = adSpace.business_name || '';
      placementInput.value = adSpace.placement;
      imageUrlInput.value = adSpace.image_url || '';
      clickUrlInput.value = adSpace.click_through_url || '';
      startDateInput.value = adSpace.start_date || '';
      endDateInput.value = adSpace.end_date || '';
      priceInput.value = adSpace.price ?? '';
      activeCheckbox.checked = !!adSpace.is_active;

      if (adSpace.owner_id) {
        const res = await window.MarketplaceAuth.fetchWithAuth(`/api/admin/users?search=${encodeURIComponent(adSpace.owner_id)}`);
        const body = res.ok ? await res.json() : { users: [] };
        const owner = (body.users || [])[0];
        selectOwner(owner || { id: adSpace.owner_id, display_name: null });
      }
    }

    messageEl.className = 'form-message';
    formEl.hidden = false;
    addBtn.hidden = true;
  }

  function closeForm() {
    formEl.hidden = true;
    addBtn.hidden = false;
    formEl.reset();
    clearOwner();
    ownerResultsEl.hidden = true;
    ownerResultsEl.innerHTML = '';
  }

  async function loadAdSpaces() {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/admin/ad-spaces');
    if (!res.ok) {
      listEl.innerHTML = '<p class="address-empty-note">Failed to load ad spaces.</p>';
      return;
    }
    const body = await res.json();
    renderList(body.ad_spaces || []);
  }

  function renderList(adSpaces) {
    if (adSpaces.length === 0) {
      listEl.innerHTML = '<p class="address-empty-note">No ad spaces yet.</p>';
      return;
    }

    listEl.innerHTML = '';
    for (const adSpace of adSpaces) {
      const card = document.createElement('div');
      card.className = 'address-card-static';

      const lines = document.createElement('div');
      lines.className = 'address-card-lines';
      const dateRange = adSpace.end_date ? `${adSpace.start_date} to ${adSpace.end_date}` : `from ${adSpace.start_date}`;
      const displayName = adSpace.business_name || '(house promo, no business name)';
      lines.textContent = `${displayName} — ${adSpace.placement} — £${Number(adSpace.price).toFixed(2)} — ${dateRange}`;
      const badge = document.createElement('span');
      badge.className = `status-badge ${adSpace.is_active ? 'status-badge-active' : 'status-badge-removed'}`;
      badge.textContent = adSpace.is_active ? 'Active' : 'Inactive';
      lines.appendChild(document.createTextNode(' '));
      lines.appendChild(badge);

      const actions = document.createElement('div');
      actions.className = 'address-card-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'cart-item-action';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openForm(adSpace));

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'cart-item-action';
      toggleBtn.textContent = adSpace.is_active ? 'Deactivate' : 'Reactivate';
      toggleBtn.addEventListener('click', async () => {
        const action = adSpace.is_active ? 'deactivate' : 'reactivate';
        const displayName = adSpace.business_name || `this ${adSpace.placement} ad`;
        if (!window.confirm(`${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} "${displayName}"?`)) return;

        toggleBtn.disabled = true;
        const res =
          action === 'deactivate'
            ? await window.MarketplaceAuth.fetchWithAuth(`/api/admin/ad-spaces/${adSpace.id}`, { method: 'DELETE' })
            : await window.MarketplaceAuth.fetchWithAuth(`/api/admin/ad-spaces/${adSpace.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: true }),
              });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          showMessage(body.error || `Failed to ${action} ad space.`, 'error');
          toggleBtn.disabled = false;
          return;
        }

        messageEl.className = 'form-message';
        await loadAdSpaces();
      });

      actions.appendChild(editBtn);
      actions.appendChild(toggleBtn);
      card.appendChild(lines);
      card.appendChild(actions);
      listEl.appendChild(card);
    }
  }

  addBtn.addEventListener('click', () => openForm(null));
  cancelBtn.addEventListener('click', closeForm);

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = document.getElementById('ad-space-save-btn');
    submitBtn.disabled = true;

    const fields = {
      business_name: businessNameInput.value.trim() || undefined,
      placement: placementInput.value.trim(),
      image_url: imageUrlInput.value.trim() || undefined,
      click_through_url: clickUrlInput.value.trim() || undefined,
      start_date: startDateInput.value || undefined,
      end_date: endDateInput.value || undefined,
      price: priceInput.value.trim() === '' ? undefined : priceInput.value.trim(),
      owner_id: ownerIdInput.value.trim() || undefined,
    };

    const existingId = idInput.value;
    if (existingId) {
      fields.is_active = activeCheckbox.checked;
    }

    const res = await window.MarketplaceAuth.fetchWithAuth(
      existingId ? `/api/admin/ad-spaces/${existingId}` : '/api/admin/ad-spaces',
      {
        method: existingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      },
    );
    const body = await res.json();
    submitBtn.disabled = false;

    if (!res.ok) {
      showMessage(body.error || 'Failed to save ad space.', 'error');
      return;
    }

    closeForm();
    await loadAdSpaces();
  });

  const guard = await window.AdminGuard.check();
  if (!guard.ok) {
    showOnly(guard.reason === 'signin' ? signinRequiredEl : forbiddenEl);
    return;
  }

  await loadAdSpaces();
  showOnly(contentEl);
});
