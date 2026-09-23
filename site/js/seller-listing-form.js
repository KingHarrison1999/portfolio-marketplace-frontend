// Wires the seller listing form (create + edit) to the real backend:
// POST /api/listings, PATCH /api/listings/:id, and
// POST /api/listings/:id/images (multipart, matching the real 5MB/10-file/
// image-only limits enforced server-side by multer).
//
// title/price/quantity deliberately have no `required` (or, for price,
// `min`/`type="number"`) constraint: this project's convention throughout
// is that the real backend is the source of truth for validation, not a
// guessed client-side approximation of it. Native constraint validation
// blocking submission meant blank titles, negative/non-numeric prices,
// and blank/negative stock never reached the backend at all -- the user
// saw a native browser tooltip instead of the backend's real, specific
// message, and this form's own .form-message error display never
// engaged. This is scoped to exactly those three fields (not a form-wide
// `novalidate`, which was tried first and then walked back): category and
// condition are real selects with no invalid state to begin with, and
// description has no validity rule at all, so removing constraint
// validation form-wide would have silently disabled native feedback for
// fields that never needed backend-driven validation in the first place
// -- and would silently do the same for any future field added to this
// form without whoever added it realizing why. quantity keeps
// type="number" (a non-numeric stock value literally can't be typed into
// it, so there's no coercion pitfall to route around the way price had),
// just without `required`/`min` so blank and negative values still reach
// the real "title, price, and stock are required" / stock CHECK-
// constraint errors.
//
// Existing (already-uploaded) photos can be removed individually via the
// real DELETE /api/listings/:id/images/:imageId, same as newly staged
// (not-yet-uploaded) ones can be unstaged before saving.
//
// KNOWN GAPS (flagged, not silently worked around):
// - This form only edits fields; it never changes a listing's status.
//   Create always ends with a real PATCH to 'active' (publishing), matching
//   the "Publish Listing" button's label -- there's no separate
//   save-as-draft action, and editing an existing listing never touches
//   its status either way.

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

document.addEventListener('DOMContentLoaded', async () => {
  const headingEl = document.getElementById('form-heading');
  const signinRequiredEl = document.getElementById('form-signin-required');
  const forbiddenEl = document.getElementById('form-forbidden');
  const notFoundEl = document.getElementById('form-not-found');
  const contentEl = document.getElementById('listing-form-content');

  const photoGrid = document.getElementById('photo-upload-grid');
  const photoAddBtn = document.getElementById('photo-upload-add-btn');
  const photoFileInput = document.getElementById('photo-file-input');
  const photoMessageEl = document.getElementById('photo-upload-message');

  const form = document.getElementById('listing-form');
  const titleInput = document.getElementById('title');
  const categorySelect = document.getElementById('category');
  const conditionSelect = document.getElementById('condition');
  const priceInput = document.getElementById('price');
  const quantityInput = document.getElementById('quantity');
  const descriptionInput = document.getElementById('description');
  const submitBtn = document.getElementById('listing-form-submit-btn');
  const formMessageEl = document.getElementById('listing-form-message');

  function showOnly(el) {
    for (const candidate of [signinRequiredEl, forbiddenEl, notFoundEl, contentEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = `form-message is-visible form-message-${type}`;
  }

  let listingId = new URLSearchParams(window.location.search).get('id');
  let existingImages = [];
  let stagedFiles = [];

  function renderPhotoGrid() {
    photoGrid.querySelectorAll('.photo-upload-slot').forEach((el) => el.remove());

    for (const image of existingImages) {
      const slot = document.createElement('div');
      slot.className = 'photo-upload-slot photo-upload-slot-filled';
      const img = document.createElement('img');
      img.src = image.url;
      img.alt = 'Uploaded photo';
      slot.appendChild(img);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'photo-remove-btn';
      removeBtn.setAttribute('aria-label', 'Delete photo');
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', async () => {
        if (!window.confirm('Delete this photo? This calls the real API right away, not just on save.')) return;

        removeBtn.disabled = true;
        const res = await window.MarketplaceAuth.fetchWithAuth(`/api/listings/${listingId}/images/${image.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          photoMessageEl.className = 'form-message';
          showMessage(photoMessageEl, body.error || 'Failed to delete photo.', 'error');
          removeBtn.disabled = false;
          return;
        }

        existingImages = existingImages.filter((img2) => img2.id !== image.id);
        renderPhotoGrid();
      });
      slot.appendChild(removeBtn);

      photoGrid.appendChild(slot);
    }

    stagedFiles.forEach((file, index) => {
      const slot = document.createElement('div');
      slot.className = 'photo-upload-slot photo-upload-slot-filled photo-upload-slot-staged';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      slot.appendChild(img);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'photo-remove-btn';
      removeBtn.setAttribute('aria-label', 'Remove photo');
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', () => {
        stagedFiles.splice(index, 1);
        renderPhotoGrid();
      });
      slot.appendChild(removeBtn);

      photoGrid.appendChild(slot);
    });
  }

  photoAddBtn.addEventListener('click', () => photoFileInput.click());

  photoFileInput.addEventListener('change', () => {
    const selected = Array.from(photoFileInput.files || []);
    photoFileInput.value = '';
    if (selected.length === 0) return;

    photoMessageEl.className = 'form-message';

    const accepted = [];
    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        showMessage(photoMessageEl, `"${file.name}" isn't an image file and was skipped.`, 'error');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        showMessage(photoMessageEl, `"${file.name}" is over 5MB and was skipped.`, 'error');
        continue;
      }
      accepted.push(file);
    }

    const room = MAX_FILES - stagedFiles.length;
    if (accepted.length > room) {
      showMessage(photoMessageEl, `Only ${MAX_FILES} photos can be uploaded at once -- extra photos were skipped.`, 'error');
    }

    stagedFiles = stagedFiles.concat(accepted.slice(0, Math.max(room, 0)));
    renderPhotoGrid();
  });

  async function loadCategories() {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/categories');
    if (!res.ok) return;
    const body = await res.json();
    for (const cat of body.categories || []) {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      categorySelect.appendChild(option);
    }
  }

  function readForm() {
    return {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim() || undefined,
      category_id: categorySelect.value || undefined,
      condition: conditionSelect.value || undefined,
      // Both sent as the raw trimmed string, not Number()-coerced: an
      // invalid value should surface the backend's real cast/CHECK error,
      // not silently become NaN -> JSON null (which e.g. "Number('abc')"
      // would produce) -- same fix as price's, applied for consistency
      // even though quantity's type="number" means a non-numeric string
      // can't actually reach this line in practice.
      price: priceInput.value.trim() === '' ? undefined : priceInput.value.trim(),
      stock: quantityInput.value.trim() === '' ? undefined : quantityInput.value.trim(),
    };
  }

  async function uploadStagedImages(id) {
    if (stagedFiles.length === 0) return { ok: true };

    const formData = new FormData();
    for (const file of stagedFiles) formData.append('images', file);

    const res = await window.MarketplaceAuth.fetchWithAuth(`/api/listings/${id}/images`, {
      method: 'POST',
      body: formData,
    });
    const body = await res.json();
    if (!res.ok) {
      return { ok: false, error: body.error || 'Failed to upload photos.' };
    }

    existingImages = existingImages.concat((body.images || []).map((img) => ({ id: img.id, url: img.image_url })));
    stagedFiles = [];
    renderPhotoGrid();
    return { ok: true };
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitBtn.disabled = true;
    formMessageEl.className = 'form-message';

    const fields = readForm();

    if (!listingId) {
      // --- Create ---
      const createRes = await window.MarketplaceAuth.fetchWithAuth('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const createBody = await createRes.json();
      if (!createRes.ok) {
        showMessage(formMessageEl, createBody.error || 'Failed to create listing.', 'error');
        submitBtn.disabled = false;
        return;
      }

      // From here on, retrying this form edits the real listing that was
      // just created instead of creating a duplicate.
      listingId = createBody.listing.id;
      window.history.replaceState({}, '', `listing-form.html?id=${listingId}`);
      switchToEditMode();

      const uploadResult = await uploadStagedImages(listingId);
      if (!uploadResult.ok) {
        showMessage(formMessageEl, `Listing created, but photo upload failed: ${uploadResult.error} Your listing is saved as a draft -- try uploading again, then save to publish.`, 'error');
        submitBtn.disabled = false;
        return;
      }

      const publishRes = await window.MarketplaceAuth.fetchWithAuth(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const publishBody = await publishRes.json();
      submitBtn.disabled = false;
      if (!publishRes.ok) {
        showMessage(formMessageEl, `Listing saved, but publishing failed: ${publishBody.error}`, 'error');
        return;
      }

      showMessage(formMessageEl, 'Listing published.', 'success');
      setTimeout(() => {
        window.location.href = 'listings.html';
      }, 1200);
      return;
    }

    // --- Edit ---
    const updateRes = await window.MarketplaceAuth.fetchWithAuth(`/api/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const updateBody = await updateRes.json();
    if (!updateRes.ok) {
      showMessage(formMessageEl, updateBody.error || 'Failed to save changes.', 'error');
      submitBtn.disabled = false;
      return;
    }

    const uploadResult = await uploadStagedImages(listingId);
    submitBtn.disabled = false;
    if (!uploadResult.ok) {
      showMessage(formMessageEl, `Changes saved, but photo upload failed: ${uploadResult.error}`, 'error');
      return;
    }

    showMessage(formMessageEl, 'Changes saved.', 'success');
  });

  function switchToEditMode() {
    headingEl.textContent = 'Edit listing';
    document.title = 'Shop Manager — Edit Listing';
    submitBtn.textContent = 'Save Changes';
  }

  function populateForm(listing) {
    titleInput.value = listing.title || '';
    descriptionInput.value = listing.description || '';
    categorySelect.value = listing.category_id || '';
    conditionSelect.value = listing.condition || '';
    priceInput.value = listing.price ?? '';
    quantityInput.value = listing.stock ?? 0;
    existingImages = listing.images || [];
    renderPhotoGrid();
  }

  const session = await window.MarketplaceAuth.getSession();
  if (!session) {
    showOnly(signinRequiredEl);
    return;
  }

  const profileRes = await window.MarketplaceAuth.fetchWithAuth('/api/profile');
  if (!profileRes.ok) {
    showOnly(signinRequiredEl);
    return;
  }
  const profileBody = await profileRes.json();
  if (profileBody.profile.role !== 'seller' && profileBody.profile.role !== 'admin') {
    showOnly(forbiddenEl);
    return;
  }

  await loadCategories();

  if (listingId) {
    const listingRes = await window.MarketplaceAuth.fetchWithAuth(`/api/listings/${listingId}`);
    if (!listingRes.ok) {
      showOnly(notFoundEl);
      return;
    }
    const listingBody = await listingRes.json();
    if (listingBody.listing.seller_id !== session.user.id && profileBody.profile.role !== 'admin') {
      showOnly(notFoundEl);
      return;
    }
    switchToEditMode();
    populateForm(listingBody.listing);
  }

  showOnly(contentEl);
});
