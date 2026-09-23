// Wires the admin categories page to the real category endpoints:
// GET /api/categories (public read), POST /api/categories,
// PATCH /api/categories/:id, DELETE /api/categories/:id (all admin-only).
//
// The backend blocks deleting a category that an active listing still
// references (409, "Cannot delete category: N active listing(s) still
// reference it") -- that real message is shown inline via the same
// #category-form-message area delete errors already use, not a generic
// "failed to delete" string.

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

document.addEventListener('DOMContentLoaded', async () => {
  const signinRequiredEl = document.getElementById('categories-signin-required');
  const forbiddenEl = document.getElementById('categories-forbidden');
  const contentEl = document.getElementById('categories-content');

  const listEl = document.getElementById('category-list');
  const addBtn = document.getElementById('btn-add-category');
  const formEl = document.getElementById('category-form');
  const cancelBtn = document.getElementById('btn-cancel-category');
  const messageEl = document.getElementById('category-form-message');
  const idInput = document.getElementById('category-id');
  const nameInput = document.getElementById('category-name');
  const slugInput = document.getElementById('category-slug');
  const parentSelect = document.getElementById('category-parent');

  function showOnly(el) {
    for (const candidate of [signinRequiredEl, forbiddenEl, contentEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `form-message is-visible form-message-${type}`;
  }

  let categories = [];
  let slugManuallyEdited = false;

  slugInput.addEventListener('input', () => {
    slugManuallyEdited = true;
  });
  nameInput.addEventListener('input', () => {
    if (!slugManuallyEdited) {
      slugInput.value = slugify(nameInput.value);
    }
  });

  function populateParentSelect(excludeId) {
    parentSelect.innerHTML = '<option value="">None -- top-level category</option>';
    for (const cat of categories) {
      if (cat.id === excludeId) continue;
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      parentSelect.appendChild(option);
    }
  }

  function openForm(category) {
    formEl.reset();
    slugManuallyEdited = !!category;
    idInput.value = category ? category.id : '';
    populateParentSelect(category ? category.id : null);

    if (category) {
      nameInput.value = category.name;
      slugInput.value = category.slug;
      parentSelect.value = category.parent_id || '';
    }

    messageEl.className = 'form-message';
    formEl.hidden = false;
    addBtn.hidden = true;
  }

  function closeForm() {
    formEl.hidden = true;
    addBtn.hidden = false;
    formEl.reset();
    slugManuallyEdited = false;
  }

  async function loadCategories() {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/categories');
    if (!res.ok) {
      listEl.innerHTML = '<p class="address-empty-note">Failed to load categories.</p>';
      return;
    }
    const body = await res.json();
    categories = body.categories || [];
    renderList();
  }

  function renderList() {
    if (categories.length === 0) {
      listEl.innerHTML = '<p class="address-empty-note">No categories yet.</p>';
      return;
    }

    const nameById = new Map(categories.map((c) => [c.id, c.name]));

    listEl.innerHTML = '';
    for (const category of categories) {
      const card = document.createElement('div');
      card.className = 'address-card-static';

      const lines = document.createElement('div');
      lines.className = 'address-card-lines';
      const parentText = category.parent_id ? ` (under ${nameById.get(category.parent_id) || 'unknown'})` : '';
      lines.textContent = `${category.name} — /${category.slug}${parentText}`;

      const actions = document.createElement('div');
      actions.className = 'address-card-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'cart-item-action';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openForm(category));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'cart-item-action';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm(`Delete category "${category.name}"?`)) return;

        deleteBtn.disabled = true;
        const res = await window.MarketplaceAuth.fetchWithAuth(`/api/categories/${category.id}`, { method: 'DELETE' });
        if (res.status === 204) {
          messageEl.className = 'form-message';
          await loadCategories();
          return;
        }

        const body = await res.json().catch(() => ({}));
        showMessage(body.error || 'Failed to delete category.', 'error');
        deleteBtn.disabled = false;
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(lines);
      card.appendChild(actions);
      listEl.appendChild(card);
    }
  }

  addBtn.addEventListener('click', () => openForm(null));
  cancelBtn.addEventListener('click', closeForm);

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = document.getElementById('category-save-btn');
    submitBtn.disabled = true;

    const fields = {
      name: nameInput.value.trim(),
      slug: slugInput.value.trim(),
      parent_id: parentSelect.value || null,
    };

    const existingId = idInput.value;
    const res = await window.MarketplaceAuth.fetchWithAuth(
      existingId ? `/api/categories/${existingId}` : '/api/categories',
      {
        method: existingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      },
    );
    const body = await res.json();
    submitBtn.disabled = false;

    if (!res.ok) {
      showMessage(body.error || 'Failed to save category.', 'error');
      return;
    }

    closeForm();
    await loadCategories();
  });

  const guard = await window.AdminGuard.check();
  if (!guard.ok) {
    showOnly(guard.reason === 'signin' ? signinRequiredEl : forbiddenEl);
    return;
  }

  await loadCategories();
  showOnly(contentEl);
});
