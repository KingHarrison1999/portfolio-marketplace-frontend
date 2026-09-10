// Wires the "Addresses" section of account/settings.html to the real
// /api/addresses endpoints (list/add/edit/delete). The rest of that page
// (Profile, Change Password, Notification Preferences, Delete Account) is
// untouched -- out of scope here, still static/unwired.

document.addEventListener('DOMContentLoaded', async () => {
  const listEl = document.getElementById('address-list');
  const addBtn = document.getElementById('btn-add-address');
  const formEl = document.getElementById('address-form');
  const cancelBtn = document.getElementById('btn-cancel-address');
  const messageEl = document.getElementById('address-form-message');
  const idInput = document.getElementById('address-id');

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `form-message is-visible form-message-${type}`;
  }

  function clearMessage() {
    messageEl.className = 'form-message';
  }

  function openForm(address) {
    formEl.reset();
    idInput.value = address ? address.id : '';
    if (address) {
      document.getElementById('address-line1').value = address.line1 || '';
      document.getElementById('address-line2').value = address.line2 || '';
      document.getElementById('city').value = address.city || '';
      document.getElementById('postcode').value = address.postcode || '';
      document.getElementById('address-country').value = address.country || 'United Kingdom';
      document.getElementById('address-is-default').checked = !!address.is_default;
    }
    clearMessage();
    formEl.hidden = false;
    addBtn.hidden = true;
  }

  function closeForm() {
    formEl.hidden = true;
    addBtn.hidden = false;
    formEl.reset();
  }

  async function loadAddresses() {
    const { addresses, error } = await window.MarketplaceAddresses.fetchAddresses();
    if (error) {
      listEl.innerHTML = `<p class="address-empty-note">${error}</p>`;
      return;
    }

    if (addresses.length === 0) {
      listEl.innerHTML = '<p class="address-empty-note">You have no saved addresses yet.</p>';
      return;
    }

    listEl.innerHTML = '';
    for (const address of addresses) {
      const card = document.createElement('div');
      card.className = 'address-card-static';

      const lines = document.createElement('div');
      lines.className = 'address-card-lines';
      lines.textContent = window.MarketplaceAddresses.formatAddressLines(address).join(', ');
      if (address.is_default) {
        const badge = document.createElement('span');
        badge.className = 'address-card-default-badge';
        badge.textContent = 'Default';
        lines.appendChild(document.createTextNode(' '));
        lines.appendChild(badge);
      }

      const actions = document.createElement('div');
      actions.className = 'address-card-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'cart-item-action';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openForm(address));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'cart-item-action';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm('Delete this address?')) return;
        deleteBtn.disabled = true;
        const { error: deleteError } = await window.MarketplaceAddresses.deleteAddress(address.id);
        if (deleteError) {
          showMessage(deleteError, 'error');
          deleteBtn.disabled = false;
          return;
        }
        await loadAddresses();
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
    const submitBtn = document.getElementById('address-save-btn');
    submitBtn.disabled = true;

    const fields = {
      line1: document.getElementById('address-line1').value.trim(),
      line2: document.getElementById('address-line2').value.trim() || undefined,
      city: document.getElementById('city').value.trim(),
      postcode: document.getElementById('postcode').value.trim(),
      country: document.getElementById('address-country').value,
      is_default: document.getElementById('address-is-default').checked,
    };

    const existingId = idInput.value;
    const { error } = existingId
      ? await window.MarketplaceAddresses.updateAddress(existingId, fields)
      : await window.MarketplaceAddresses.createAddress(fields);

    submitBtn.disabled = false;

    if (error) {
      showMessage(error, 'error');
      return;
    }

    closeForm();
    await loadAddresses();
  });

  const session = await window.MarketplaceAuth.getSession();
  if (!session) {
    listEl.innerHTML = '<p class="address-empty-note">Log in to manage your addresses.</p>';
    addBtn.hidden = true;
    return;
  }

  await loadAddresses();
});
