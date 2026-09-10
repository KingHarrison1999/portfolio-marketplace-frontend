// Shared helpers for the real /api/addresses endpoints, used by both the
// account settings page (full CRUD) and the checkout page (list + quick add).
// Requires js/auth.js to be loaded first.

async function fetchAddresses() {
  const res = await window.MarketplaceAuth.fetchWithAuth('/api/addresses');
  if (!res.ok) {
    return { addresses: null, error: 'Failed to load addresses.' };
  }
  const body = await res.json();
  return { addresses: body.addresses || [], error: null };
}

async function createAddress(fields) {
  const res = await window.MarketplaceAuth.fetchWithAuth('/api/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { address: null, error: body.error || 'Failed to save address.' };
  }
  const body = await res.json();
  return { address: body.address, error: null };
}

async function updateAddress(id, fields) {
  const res = await window.MarketplaceAuth.fetchWithAuth(`/api/addresses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { address: null, error: body.error || 'Failed to save address.' };
  }
  const body = await res.json();
  return { address: body.address, error: null };
}

async function deleteAddress(id) {
  const res = await window.MarketplaceAuth.fetchWithAuth(`/api/addresses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error || 'Failed to delete address.' };
  }
  return { error: null };
}

// Returns the address's lines as an array of display strings, e.g.
// ["1 Test Street", "Manchester", "M1 2AB", "United Kingdom"].
function formatAddressLines(address) {
  const lines = [address.line1];
  if (address.line2) lines.push(address.line2);
  lines.push(address.city);
  lines.push(address.postcode);
  lines.push(address.country);
  return lines;
}

window.MarketplaceAddresses = {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  formatAddressLines,
};
